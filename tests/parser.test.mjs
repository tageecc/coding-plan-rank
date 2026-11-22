import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { coreProviders, normalizeText, parseCursor, parseClaude, parseCodex, parseCopilot, evidenceText } from '../scripts/parsers.mjs';
import { fetchOfficial, FetchError, officialUrl, validatePlans, guardChanges, sha256, updateData } from '../scripts/update.mjs';

const fixtures = Object.fromEntries(await Promise.all(['cursor.txt', 'claude.txt', 'codex.md', 'copilot.md'].map(async name => [name.split('.')[0], await readFile(new URL(`fixtures/${name}`, import.meta.url), 'utf8')])));
const proDetails = await readFile(new URL('fixtures/codex-pro.txt', import.meta.url), 'utf8');
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const html = s => `<main>${s.split('\n').map(line => `<p>${escape(line)}</p>`).join('')}</main>`;

test('Cursor parses current prices and weekly shared Grok multipliers from text or HTML', () => {
  const plans = parseCursor([fixtures.cursor]);
  assert.deepEqual(plans.map(p => [p.name, p.monthlyUsd, p.quota.amount]), [['Free', 0, null], ['Plus', 8, 1], ['Premium', 30, 4], ['Super', 100, 15], ['Ultra', 200, 50]]);
  assert.deepEqual(parseCursor([html(fixtures.cursor)]), plans);
  for (const p of plans.filter(p => p.monthlyUsd)) {
    assert.equal(p.quota.window, 'week');
    assert.match(p.note.en, /Third-party models and Grok API billed separately/);
  }
});

test('Cursor accepts structurally supported price and plan additions, rejects ambiguous and missing plans', () => {
  assert.equal(parseCursor([fixtures.cursor.replace('$30/month', '$35/month')]).find(p => p.id === 'premium').monthlyUsd, 35);
  const extra = '\nTitan\n$400/month\nGet Titan\n100x\nmore usage compared to Plus\n';
  assert.equal(parseCursor([fixtures.cursor.replace('Prices shown', `${extra}Prices shown`)]).find(p => p.id === 'titan').quota.amount, 100);
  assert.throws(() => parseCursor([fixtures.cursor.replace('4x\n', '4x\nmore usage compared to Plus\n5x\n')]), /ambiguous/);
  assert.throws(() => parseCursor([fixtures.cursor.replace('Premium\nMost popular\n', 'Renamed\n')]), /Missing known plan/);
  assert.throws(() => parseCursor([fixtures.cursor.replace('refreshes weekly', 'refreshes monthly')]), /weekly usage/);
});

test('Claude chooses monthly rather than annual price, omits Free without Claude Code', () => {
  const plans = parseClaude([fixtures.claude]);
  assert.deepEqual(plans.map(p => [p.name, p.monthlyUsd, p.quota.amount]), [['Pro', 20, 1], ['Max', 100, 5], ['Ultra', 200, 10]]);
  assert.deepEqual(parseClaude([html(fixtures.claude)]), plans);
  assert.ok(plans.every(p => p.quota.window === 'week' && p.quota.group === 'claude-pro'));
  assert.match(plans[2].note.en, /Verified accounts/);
  assert.throws(() => parseClaude([fixtures.claude.replace('$20 if billed monthly', 'contact sales if billed monthly')]), /monthly price/);
  assert.throws(() => parseClaude([fixtures.claude.replace('10x Pro usage every week', 'more Pro usage every week')]), /multiplier/);
});

test('Copilot uses total monthly credits including Flex, never the overview base column', () => {
  const plans = parseCopilot([fixtures.copilot]);
  assert.deepEqual(plans.filter(p => p.monthlyUsd).map(p => [p.name, p.monthlyUsd, p.quota.amount]), [['Pro', 10, 1500], ['Pro+', 39, 7000], ['Max', 100, 20000]]);
  assert.throws(() => parseCopilot([fixtures.copilot.replace('Total monthly AI credits', 'Monthly usage')]), /table/);
  assert.throws(() => parseCopilot([fixtures.copilot.replace('| 7,000', '| 8,000')]), /total does not equal/);
  assert.throws(() => parseCopilot([fixtures.copilot.replace('Copilot Max', 'Copilot Ultra')]), /lacks a supported|Missing known/);
});

test('Copilot rejects a newly advertised individual plan without a total-credit row', () => {
  const changed = fixtures.copilot.replace('| Copilot Free', '| Copilot New | $50 USD per month | Base: 500 | Agent | Models |\n| Copilot Free');
  assert.throws(() => parseCopilot([changed]), /lacks a supported total credit row/);
});

test('Codex preserves model-specific five-hour range, Pro tiers and limited Go access', () => {
  const plans = parseCodex([fixtures.codex, proDetails]);
  assert.deepEqual(plans.map(p => p.monthlyUsd), [0, 8, 20, 100, 200, 500]);
  assert.deepEqual(plans.find(p => p.id === 'plus').quota, { amount: 15, max: 160, unit: 'messages', window: '5h', group: 'codex-gpt-6.1-sol' });
  for (const p of plans.filter(p => p.id.startsWith('pro-'))) {
    assert.equal(p.quota.amount, null);
    assert.equal(p.quota.group, null);
    assert.match(p.note.en, /No five-hour limit/);
  }
  assert.deepEqual(plans.filter(p=>p.id.startsWith('pro-')).map(p=>p.name), ['Pro 100','Pro 200','Pro 500']);
  assert.match(plans.find(p=>p.id==='pro-200').usageSummary.en, /More than 100/);
  assert.match(plans.find(p=>p.id==='pro-500').usageSummary.en, /Ultrafast/);
  assert.throws(()=>parseCodex([fixtures.codex, proDetails.replace('Pro 500 $500 Included','Pro 500 $500 Not included')]), /Ultrafast/);
  assert.match(plans.find(p => p.id === 'go').note.en, /Limited to GPT-6 Luna/);
  assert.throws(() => parseCodex([fixtures.codex.replace('$100, $200, or $500 USD', '$100, $200, $500, or $1000 USD'), proDetails]), /disagree/);
  assert.throws(() => parseCodex([fixtures.codex.replace('Pro plans currently have no five-hour limit', 'Pro plans have a five-hour limit'), proDetails]), /semantics/);
  assert.throws(() => parseCodex([fixtures.codex.replace('15-160', 'unknown'), proDetails]), /range missing/);
  assert.throws(() => parseCodex([fixtures.codex.replace('name="Go"', 'name="New"'), proDetails]), /New Codex card/);
});

test('normalization strips executable, hidden-template and navigation text without executing remote content', () => {
  delete globalThis.__remoteExecuted;
  const poison = '<script>globalThis.__remoteExecuted = true; Plus $1/month</script><style>Ultra $1</style><template>Ultra $1</template><noscript>Ultra $1</noscript><nav>Ultra $1</nav>';
  assert.equal(normalizeText(`${poison}<main><h2>Safe</h2><p>A&nbsp;B<br>C</p></main>`), 'Safe\nA B\nC');
  assert.deepEqual(parseCursor([poison + html(fixtures.cursor)]), parseCursor([fixtures.cursor]));
  assert.equal(globalThis.__remoteExecuted, undefined);
  assert.throws(() => parseCodex(['<script>return [{monthlyUsd:1}]</script>', proDetails]), /Missing section/);
});

test('current fixtures produce compact evidence and valid schema', () => {
  for (const provider of coreProviders) {
    const raw = fixtures[provider.id];
    const raws=provider.id==='codex'?[raw,proDetails]:[raw];
    validatePlans(provider.parse(raws));
    const evidence = evidenceText(provider.id, raws);
    assert.ok(evidence.length > 100 && Buffer.byteLength(evidence) < 24000);
    assert.match(sha256(evidence), /^[a-f0-9]{64}$/);
  }
});

const canned = () => ({ id: 'pro', name: 'Pro', monthlyUsd: 20, quota: { amount: 100, unit: 'credits', window: 'month', group: 'test-credits' }, note: { zh: '说明', en: 'Note' } });
const definition = { id: 'example', name: 'Example', product: 'Example agent', description: { zh: '说明', en: 'Description' }, sources: [{ url: 'https://cursor.com/pricing', title: 'Official' }], parse: () => [canned()] };
const previousProvider = { ...Object.fromEntries(Object.entries(definition).filter(([key]) => key !== 'parse')), status: 'ok', checkedAt: '2026-11-20T00:00:00.000Z', sourceHash: sha256('old evidence\n'), plans: [canned()] };
const previous = { updatedAt: previousProvider.checkedAt, providers: [previousProvider] };
const now = '2026-11-22T01:23:00.000Z';
const update = options => updateData({ providers: [definition], previous, now, load: async () => 'official', evidence: () => 'new official evidence\n', ...options });

test('successful checks advance checkedAt without factual history churn', async () => {
  const result = await update({});
  assert.equal(result.data.updatedAt, now);
  assert.equal(result.data.providers[0].checkedAt, now);
  assert.notEqual(result.data.providers[0].sourceHash, previousProvider.sourceHash);
  assert.equal(result.data.providers[0].sourceHash, sha256(result.writes.get('evidence/example.txt')));
  assert.equal(result.snapshot, null);
});

test('price changes create factual before/after history; plan ordering does not', async () => {
  const changed = await update({ providers: [{ ...definition, parse: () => [{ ...canned(), monthlyUsd: 25 }] }] });
  assert.equal(changed.snapshot.changes[0].before[0].monthlyUsd, 20);
  assert.equal(changed.snapshot.changes[0].after[0].monthlyUsd, 25);
  assert.equal(changed.snapshot.changedAt, now);
  const p = { ...canned(), id: 'max', name: 'Max' };
  const reordered = await update({ previous: { providers: [{ ...previousProvider, plans: [canned(), p] }] }, providers: [{ ...definition, parse: () => [p, canned()] }] });
  assert.equal(reordered.snapshot, null);
});

test('quota decreases, changed scope, lost upper range and missing plans require review', async () => {
  for (const plans of [[], [{ ...canned(), quota: { ...canned().quota, amount: 90 } }], [{ ...canned(), quota: { ...canned().quota, window: 'week' } }], [{ ...canned(), quota: { amount: null, unit: 'unknown', window: 'dynamic', group: null } }]]) {
    const result = await update({ providers: [{ ...definition, parse: () => plans }] });
    const p = result.data.providers[0];
    assert.equal(p.status, 'needs-review');
    assert.equal(p.checkedAt, previousProvider.checkedAt);
    assert.equal(p.sourceHash, previousProvider.sourceHash);
    assert.deepEqual(p.plans, previousProvider.plans);
    assert.equal(result.writes.size, 0);
    assert.equal(result.snapshot, null);
  }
  assert.throws(() => guardChanges([{ ...canned(), quota: { ...canned().quota, max: 200 } }], [canned()]), /Quota decreased/);
});

test('unavailable provider retains last success while independent provider succeeds', async () => {
  const other = { ...definition, id: 'other' };
  const result = await update({ providers: [definition, other], load: async (url, id) => { if (id === 'example') throw new FetchError('HTTP 503'); return 'official'; } });
  assert.equal(result.data.providers[0].status, 'unavailable');
  assert.equal(result.data.providers[0].checkedAt, previousProvider.checkedAt);
  assert.equal(result.data.providers[1].status, 'ok');
  assert.equal(result.status.attemptedAt, now);
  assert.equal(result.writes.has('evidence/example.txt'), false);
});

test('never-verified providers and removed registry entries remain visibly unverified', async () => {
  const first = await update({ previous: undefined, load: async () => { throw new FetchError('Timeout'); } });
  assert.equal(first.data.providers[0].checkedAt, '');
  assert.equal(first.data.providers[0].status, 'unavailable');
  const removed = await update({ providers: [] });
  assert.equal(removed.data.providers[0].status, 'needs-review');
  assert.equal(removed.data.providers[0].checkedAt, previousProvider.checkedAt);
});

test('CNY prices stay explicit without fabricated USD conversion', () => {
  const cny = { ...canned(), currency: 'CNY', monthlyPrice: 99, monthlyUsd: null };
  assert.equal(validatePlans([cny])[0].monthlyUsd, null);
  assert.throws(() => validatePlans([{ ...cny, monthlyUsd: 14 }]), /monthly price/);
  assert.throws(() => guardChanges([canned()], [cny]), /currency changed/);
  assert.throws(() => validatePlans([{ ...canned(), monthlyUsd: Infinity }]), /monthly price/);
  assert.throws(() => validatePlans([canned(), canned()]), /duplicate/);
});

test('URL allowlist rejects deceptive hosts, credentials, protocols and ports', () => {
  for (const url of ['http://cursor.com/pricing', 'https://cursor.com.evil.test/', 'https://cursor.com@evil.test/', 'https://user:pass@cursor.com/', 'https://cursor.com:444/', 'https://127.0.0.1/', 'file:///etc/passwd']) assert.throws(() => officialUrl(url));
  assert.equal(officialUrl('https://cursor.com/pricing').hostname, 'cursor.com');
});

const ok = (text = 'official', headers = {}) => new Response(text, { headers: { 'content-type': 'text/html', ...headers } });
test('fetch validates every redirect before following it', async () => {
  const visited = [];
  await assert.rejects(fetchOfficial('https://cursor.com/pricing', { fetchImpl: async url => { visited.push(url); return new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/private' } }); } }), /allowlist/);
  assert.equal(visited.length, 1);
  let calls = 0;
  const text = await fetchOfficial('https://cursor.com/pricing', { fetchImpl: async () => ++calls === 1 ? new Response(null, { status: 301, headers: { location: '/new-pricing' } }) : ok() });
  assert.equal(text, 'official');
  assert.equal(calls, 2);
});

test('fetch retries twice, rejects oversized declared and streamed bodies and executable MIME', async () => {
  let calls = 0;
  await assert.rejects(fetchOfficial('https://cursor.com/pricing', { fetchImpl: async () => { calls++; return new Response('offline', { status: 503 }); }, sleep: async () => {} }), FetchError);
  assert.equal(calls, 3);
  for (const response of [ok('x', { 'content-length': '4000000' }), ok('x'.repeat(17)), ok('alert(1)', { 'content-type': 'application/javascript' })]) {
    await assert.rejects(fetchOfficial('https://cursor.com/pricing', { maxBytes: 16, fetchImpl: async () => response }), /exceeds|response type/);
  }
});

test('fetch times out and sends format-specific Accept headers', async () => {
  await assert.rejects(fetchOfficial('https://cursor.com/pricing', { retries: 0, timeoutMs: 5, fetchImpl: async (url, options) => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))) }), /timed out/);
  for (const [url, expected] of [['https://cursor.com/pricing', 'text/html'], ['https://learn.chatgpt.com/docs/pricing.md', 'text/markdown'], ['https://docs.github.com/api/article/body?pathname=/en/copilot/get-started/plans', 'text/markdown']]) {
    await fetchOfficial(url, { fetchImpl: async (value, options) => { assert.ok(options.headers.Accept.startsWith(expected)); assert.equal(options.redirect, 'manual'); return ok(); } });
  }
});
