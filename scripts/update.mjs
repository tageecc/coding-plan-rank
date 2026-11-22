import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coreProviders, evidenceText, ReviewError, requireFact } from './parsers.mjs';
import { extraProviders, evidenceExtraText } from './parsers-extra.mjs';
import { domesticProviders, evidenceDomesticText } from './parsers-domestic.mjs';
import { loadGlmPricing } from './glm-pricing.mjs';
import { updateExchangeRate } from './exchange-rate.mjs';

export const OFFICIAL_HOSTS = new Set([
  'cursor.com', 'www.cursor.com', 'forum.cursor.com', 'claude.com', 'www.claude.com',
  'learn.chatgpt.com', 'help.openai.com', 'docs.github.com',
  'windsurf.com', 'www.windsurf.com', 'docs.windsurf.com',
  'zed.dev', 'www.zed.dev', 'docs.zed.dev',
  'augmentcode.com', 'www.augmentcode.com', 'docs.augmentcode.com',
  'trae.ai', 'www.trae.ai', 'docs.trae.ai',
  'kimi.com', 'www.kimi.com', 'kimi.moonshot.cn', 'moonshot.cn', 'platform.moonshot.cn',
  'minimax.io', 'www.minimax.io', 'platform.minimax.io', 'platform.minimaxi.com', 'www.minimaxi.com',
  'z.ai', 'www.z.ai', 'docs.z.ai', 'bigmodel.cn', 'www.bigmodel.cn', 'open.bigmodel.cn',
  'qoder.com', 'www.qoder.com', 'docs.qoder.com',
  'qwen.ai', 'www.qwen.ai', 'qwenlm.github.io',
  'gemini.google', 'antigravity.google', 'devin.ai', 'docs.devin.ai',
  'www.ecb.europa.eu', 'help.aliyun.com', 'docs.volcengine.com', 'docs.bigmodel.cn', 'static.bigmodel.cn', 'mimo.mi.com', 'cloud.tencent.com',
  'zcode.z.ai', 'platform.minimax.cn', 'kimi.ai', 'www.kimi.ai', 'kiro.dev',
]);
// A firsthand account observation is evidence of that sample, not a vendor policy.
export const OBSERVATION_HOSTS = new Set(['github.com']);
export const MAX_BYTES = 3 * 1024 * 1024;

export class FetchError extends Error {
  constructor(message) { super(message); this.name = 'FetchError'; }
}

export function officialUrl(value, allowedHosts = OFFICIAL_HOSTS) {
  let url;
  try { url = new URL(value); } catch { throw new ReviewError('Invalid official URL'); }
  requireFact(url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && allowedHosts.has(url.hostname), `URL outside official HTTPS allowlist: ${url.hostname}`);
  return url;
}

export async function fetchOfficial(source, {
  fetchImpl = fetch, timeoutMs = 15000, retries = 2, maxBytes = MAX_BYTES,
  allowedHosts = OFFICIAL_HOSTS, allowScriptText = false, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
} = {}) {
  const initial = officialUrl(source, allowedHosts);
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let url = initial;
      for (let redirects = 0; redirects <= 5; redirects++) {
        const response = await fetchImpl(url.href, {
          redirect: 'manual', signal: controller.signal,
          headers: { 'User-Agent': 'CodingPlanRank/1.0 (official pricing verification)', Accept: /\.md$/.test(url.pathname) || (url.hostname === 'docs.github.com' && url.pathname === '/api/article/body') ? 'text/markdown, text/plain;q=0.9' : 'text/html, text/plain;q=0.9' },
        });
        if (response.url) officialUrl(response.url, allowedHosts);
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          await response.body?.cancel();
          const location = response.headers.get('location');
          requireFact(location && redirects < 5, 'Missing redirect location or too many redirects');
          url = officialUrl(new URL(location, url).href, allowedHosts);
          continue;
        }
        if (!response.ok) {
          await response.body?.cancel();
          throw new FetchError(`Official source returned HTTP ${response.status}: ${url.hostname}`);
        }
        const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
        requireFact(!type || ['text/html', 'text/plain', 'text/markdown', 'text/x-markdown', 'application/xhtml+xml', 'text/xml', 'application/xml', ...(allowScriptText ? ['application/javascript', 'text/javascript'] : [])].includes(type), `Unsupported official response type: ${type}`);
        requireFact(Number(response.headers.get('content-length') || 0) <= maxBytes, 'Official response exceeds 3 MB');
        requireFact(response.body, 'Empty official response body');
        const chunks = [];
        let bytes = 0;
        try {
          for await (const chunk of response.body) {
            bytes += chunk.byteLength;
            requireFact(bytes <= maxBytes, 'Official response exceeds 3 MB');
            chunks.push(Buffer.from(chunk));
          }
        } catch (error) { controller.abort(); throw error; }
        requireFact(bytes > 0, 'Empty official response body');
        return Buffer.concat(chunks).toString('utf8');
      }
    } catch (error) {
      if (error instanceof ReviewError) { controller.abort(); throw error; }
      lastError = new FetchError(controller.signal.aborted ? `Official source timed out: ${initial.hostname}` : `Official source unavailable: ${initial.hostname} (${error.message})`);
    } finally { clearTimeout(timeout); }
    if (attempt < retries) await sleep(300 * 2 ** attempt);
  }
  throw lastError;
}

const enums = { unit: new Set(['relative', 'credits', 'messages', 'requests', 'unknown']), window: new Set(['week', 'month', '30d', '5h', 'day', 'dynamic']) };
const validBi = value => value && typeof value.zh === 'string' && value.zh.length > 0 && typeof value.en === 'string' && value.en.length > 0;
export function validatePlans(plans) {
  requireFact(Array.isArray(plans) && plans.length > 0, 'No supported plans extracted');
  const ids = new Set();
  for (const plan of plans) {
    requireFact(typeof plan.id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(plan.id) && !ids.has(plan.id), 'Invalid or duplicate plan ID');
    ids.add(plan.id);
    requireFact(typeof plan.name === 'string' && plan.name.length > 0 && validBi(plan.note), `Invalid plan name or note: ${plan.id}`);
    requireFact(plan.usageSummary === undefined || validBi(plan.usageSummary), `Invalid usage summary: ${plan.id}`);
    const currency = plan.currency ?? 'USD';
    requireFact(currency === 'USD' || currency === 'CNY', `Unsupported currency: ${currency}`);
    const price = currency === 'CNY' ? plan.monthlyPrice : plan.monthlyUsd;
    requireFact(typeof price === 'number' && Number.isFinite(price) && price >= 0 && (currency !== 'CNY' || plan.monthlyUsd === null), `Invalid monthly price: ${plan.id}`);
    const q = plan.quota;
    requireFact(q && enums.unit.has(q.unit) && enums.window.has(q.window), `Invalid quota dimensions: ${plan.id}`);
    requireFact(q.amount === null || (typeof q.amount === 'number' && Number.isFinite(q.amount) && q.amount > 0), `Invalid quota amount: ${plan.id}`);
    requireFact(q.group === null || (typeof q.group === 'string' && q.group.length > 0), `Invalid quota group: ${plan.id}`);
    requireFact((q.amount === null) === (q.unit === 'unknown') && (q.amount !== null || q.group === null), `Unknown quota must not imply a comparable allowance: ${plan.id}`);
    requireFact(q.max === undefined || (typeof q.max === 'number' && Number.isFinite(q.max) && q.amount !== null && q.max >= q.amount), `Invalid quota range: ${plan.id}`);
    const windows = new Set([q.window]);
    requireFact(plan.caps === undefined || Array.isArray(plan.caps), `Invalid additional caps: ${plan.id}`);
    for (const cap of plan.caps ?? []) {
      requireFact(enums.window.has(cap.window) && cap.window !== 'dynamic' && !windows.has(cap.window), `Duplicate or invalid cap window: ${plan.id}`);
      windows.add(cap.window);
      requireFact(['limited','none','possible','dynamic'].includes(cap.status) && enums.unit.has(cap.unit), `Invalid cap status or unit: ${plan.id}`);
      requireFact(cap.status!=='dynamic' || cap.window==='5h', `Dynamic policy is only supported for the five-hour comparison: ${plan.id}`);
      requireFact(cap.amount === null || (Number.isFinite(cap.amount) && cap.amount > 0), `Invalid cap amount: ${plan.id}`);
      requireFact((cap.amount === null) === (cap.unit === 'unknown') && (cap.status === 'limited' || cap.amount === null), `Invalid cap quantity: ${plan.id}`);
      requireFact(cap.condition === undefined || validBi(cap.condition), `Invalid cap condition: ${plan.id}`);
    }
  }
  return plans;
}

export function guardChanges(previous, next) {
  for (const old of previous ?? []) {
    const current = next.find(plan => plan.id === old.id);
    requireFact(current, `Known plan disappeared: ${old.name}`);
    requireFact((old.currency ?? 'USD') === (current.currency ?? 'USD'), `Plan currency changed: ${old.name}`);
    if (old.quota.amount !== null) {
      const a = old.quota, b = current.quota;
      requireFact(b.amount !== null && a.unit === b.unit && a.window === b.window && a.group === b.group, `Quota scope changed: ${old.name}`);
      requireFact(b.amount >= a.amount && (a.max === undefined || (b.max !== undefined && b.max >= a.max)), `Quota decreased: ${old.name}; review required`);
    }
    for (const a of old.caps ?? []) {
      const b = current.caps?.find(cap => cap.window === a.window);
      requireFact(b && b.status === a.status && JSON.stringify(a.condition) === JSON.stringify(b.condition), `Cap scope changed: ${old.name}; review required`);
      if (a.amount !== null) requireFact(b.amount !== null && b.unit === a.unit && b.amount >= a.amount, `Cap decreased: ${old.name}; review required`);
    }
  }
}

export const sha256 = text => createHash('sha256').update(text).digest('hex');
const stablePlans = plans => [...plans].sort((a, b) => a.id.localeCompare(b.id)).map(p => ({ id: p.id, name: p.name, currency: p.currency ?? 'USD', price: p.currency === 'CNY' ? p.monthlyPrice : p.monthlyUsd, quota: { amount: p.quota.amount, unit: p.quota.unit, window: p.quota.window, group: p.quota.group, ...(p.quota.max === undefined ? {} : { max: p.quota.max }) }, note: p.note, caps:[...(p.caps??[])].sort((a,b)=>a.window.localeCompare(b.window)), ...(p.usageSummary ? {usageSummary:p.usageSummary} : {}) }));

export async function updateData({ providers, previous = { providers: [] }, load, now = new Date().toISOString(), evidence = evidenceText }) {
  requireFact(new Set(providers.map(p => p.id)).size === providers.length, 'Duplicate provider ID in registry');
  const writes = new Map();
  const changes = [];
  const statuses = [];
  const results = await Promise.all(providers.map(async definition => {
    const { parse, ...metadata } = definition;
    requireFact(/^[a-z0-9][a-z0-9-]*$/.test(metadata.id) && validBi(metadata.description), 'Invalid provider metadata');
    const prior = previous.providers.find(p => p.id === metadata.id);
    try {
      const raws = await Promise.all(metadata.sources.map((source, i) => load(source.url, metadata.id, i)));
      const plans = validatePlans(parse(raws));
      guardChanges(prior?.plans, plans);
      const extractedEvidence = evidence(metadata.id, raws);
      requireFact(typeof extractedEvidence === 'string' && extractedEvidence.trim().length > 0 && Buffer.byteLength(extractedEvidence) <= 24000, 'Evidence excerpt must be nonempty and compact');
      const excerpt = `${extractedEvidence.trimEnd()}\n`;
      const sourceHash = sha256(excerpt);
      writes.set(`evidence/${metadata.id}.txt`, excerpt);
      if (JSON.stringify(stablePlans(prior?.plans ?? [])) !== JSON.stringify(stablePlans(plans))) changes.push({ id: metadata.id, before: prior?.plans ?? [], after: plans });
      statuses.push({ id: metadata.id, status: 'ok', checkedAt: now, changed: changes.some(change => change.id === metadata.id) });
      return { ...metadata, checkedAt: now, status: 'ok', sourceHash, plans };
    } catch (error) {
      const status = error instanceof FetchError ? 'unavailable' : 'needs-review';
      // No raw remote text is placed in status/errors or Actions script source.
      const message = `${error.name}: ${error.message}`.slice(0, 500);
      statuses.push({ id: metadata.id, status, checkedAt: prior?.checkedAt ?? '', error: message, changed: false });
      return { ...(prior ?? { ...metadata, checkedAt: '', sourceHash: '', plans: [] }), status, error: message };
    }
  }));
  // Removed registry entries are visible and retained until an explicit migration reviews them.
  for (const prior of previous.providers) if (!results.some(p => p.id === prior.id)) {
    const error = 'Provider no longer has a registered parser; review required';
    results.push({ ...prior, status: 'needs-review', error });
    statuses.push({ id: prior.id, status: 'needs-review', checkedAt: prior.checkedAt, error, changed: false });
  }
  changes.sort((a, b) => a.id.localeCompare(b.id));
  statuses.sort((a, b) => a.id.localeCompare(b.id));
  const snapshot = changes.length ? { changedAt: now, changes } : null;
  return { data: { updatedAt: now, providers: results }, status: { attemptedAt: now, providers: statuses }, writes, snapshot };
}

async function atomicWrite(filename, value) {
  await mkdir(path.dirname(filename), { recursive: true });
  const temp = `${filename}.${process.pid}.tmp`;
  await writeFile(temp, value, 'utf8');
  await rename(temp, filename);
}

export async function run({ root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), fromDir } = {}) {
  const providers = [...coreProviders, ...extraProviders, ...domesticProviders];
  const sourceHosts = source => source.kind==='observation'?OBSERVATION_HOSTS:OFFICIAL_HOSTS;
  for (const provider of providers) for (const source of provider.sources) officialUrl(source.url,sourceHosts(source));
  let previous;
  try { previous = JSON.parse(await readFile(path.join(root, 'data/plans.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const load = fromDir ? async (url, id, index) => {
    // An explicit bootstrap flag is the only offline path; never silently substitute fixtures for live data.
    for (const name of [`${id}${index ? `-${index + 1}` : ''}.txt`, `${id}${index ? `-${index + 1}` : ''}.md`]) {
      try { return await readFile(path.resolve(root, fromDir, name), 'utf8'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    throw new FetchError(`No captured official source for ${id} (${url})`);
  } : (url,id,index) => url === 'https://bigmodel.cn/glm-coding' ? loadGlmPricing(fetchOfficial) : fetchOfficial(url,{allowedHosts:sourceHosts(providers.find(p=>p.id===id).sources[index])});
  const domesticIds = new Set(domesticProviders.map(provider => provider.id));
  const extraIds = new Set(extraProviders.map(provider => provider.id));
  const now = new Date().toISOString();
  const result = await updateData({ providers, previous, load, now, evidence: (id, raws) => domesticIds.has(id) ? evidenceDomesticText(id, raws) : extraIds.has(id) ? evidenceExtraText(id, raws) : evidenceText(id, raws) });
  result.data.exchangeRate = await updateExchangeRate(fromDir ? async () => readFile(path.resolve(root, fromDir, 'exchange-rate.xml'), 'utf8') : fetchOfficial, previous?.exchangeRate, now);
  result.status.exchangeRate = result.data.exchangeRate;
  for (const [name, value] of result.writes) await atomicWrite(path.join(root, 'data', name), value);
  if (result.snapshot) {
    const content = `${JSON.stringify(result.snapshot, null, 2)}\n`;
    const name = `${result.data.updatedAt.replace(/[:.]/g, '-')}-${sha256(content).slice(0, 10)}.json`;
    await atomicWrite(path.join(root, 'data/history', name), content);
  }
  await atomicWrite(path.join(root, 'data/plans.json'), `${JSON.stringify(result.data, null, 2)}\n`);
  await atomicWrite(path.join(root, 'data/update-status.json'), `${JSON.stringify(result.status, null, 2)}\n`);
  for (const item of result.status.providers) console.log(`${item.id}: ${item.status}${item.error ? ` — ${item.error}` : ''}`);
  console.log(`USD/CNY: ${result.data.exchangeRate.status} (${result.data.exchangeRate.rateDate || 'unverified'})`);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 2 && args[0] === '--from-dir')) throw new Error('Usage: node scripts/update.mjs [--from-dir directory]');
  await run({ fromDir: args[1] });
}
