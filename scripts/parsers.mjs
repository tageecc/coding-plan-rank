import { parseHTML } from 'linkedom';

export class ReviewError extends Error {
  constructor(message) { super(message); this.name = 'ReviewError'; }
}

export function requireFact(condition, message) {
  if (!condition) throw new ReviewError(message);
}

// linkedom parses inert DOM nodes. Never evaluate source scripts or MDX expressions.
export function normalizeText(raw) {
  requireFact(typeof raw === 'string' && raw.length > 0, 'Empty official source');
  // Inline line breaks inside Markdown table cells must not split one table row.
  const input = raw.replace(/^\|[^\n]*$/gm, line => line.replace(/<br\s*\/?>/gi, ' '));
  const { document } = parseHTML(`<html><body>${input}</body></html>`);
  document.querySelectorAll('script,style,noscript,template,svg,nav,footer,header').forEach(node => node.remove());
  const blocks = new Set(['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'SECTION', 'ARTICLE', 'MAIN', 'TABLE', 'TR', 'UL', 'OL', 'THEAD', 'TBODY', 'TFOOT']);
  const walk = node => {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return '';
    if (node.tagName === 'BR') return '\n';
    const content = [...node.childNodes].map(walk).join('');
    if (['TD', 'TH'].includes(node.tagName)) return `${content}\t`;
    return blocks.has(node.tagName) ? `\n${content}\n` : content;
  };
  return walk(document.body)
    .replace(/\r\n?/g, '\n').replace(/[\u00a0\u202f]/g, ' ')
    .split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n');
}

export const slug = value => value.toLowerCase().replace(/\+/g, '-plus').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const bi = (zh, en) => ({ zh, en });
const unknown = () => ({ amount: null, unit: 'unknown', window: 'dynamic', group: null });
const makePlan = (name, monthlyUsd, quota, note) => ({ id: slug(name), name, monthlyUsd, quota, note });

function uniquePlans(plans, required) {
  const result = new Map();
  for (const plan of plans) {
    if (result.has(plan.id)) requireFact(JSON.stringify(result.get(plan.id)) === JSON.stringify(plan), `Conflicting duplicate plan: ${plan.name}`);
    result.set(plan.id, plan);
  }
  for (const id of required) requireFact(result.has(id), `Missing known plan: ${id}`);
  return [...result.values()];
}

function between(text, start, end) {
  const a = text.indexOf(start) >= 0 ? text.indexOf(start) : start.startsWith('\n') && text.startsWith(start.slice(1)) ? 0 : -1;
  requireFact(a >= 0, `Missing section: ${start}`);
  const b = text.indexOf(end, a + start.length);
  requireFact(b > a, `Missing section boundary: ${end}`);
  return text.slice(a, b);
}

function oneNumber(matches, label) {
  const values = [...new Set(matches.map(match => Number(match[1].replace(/,/g, ''))))];
  requireFact(values.length === 1 && Number.isFinite(values[0]), `Missing or ambiguous ${label}`);
  return values[0];
}

export function parseCursor(raws) {
  const text = normalizeText(raws[0]);
  requireFact(/pool of AI usage shared across Cursor and Grok/i.test(text) && /allowance refreshes weekly/i.test(text), 'Cursor shared weekly usage wording changed');
  requireFact(/third-party models[^.]*do not include an allowance|do not include an allowance for third-party models/i.test(text) && /API list price/i.test(text), 'Cursor third-party billing wording changed');
  const section = between(text, '\nFree\n', 'Compare features across plans');
  const starts = [...section.matchAll(/^([^\n$]+)\n(?:Most popular\n)?\$([\d,.]+)\s*(?:\n)?\/month$/gm)];
  requireFact(starts.length >= 5, 'Cursor monthly price cards not found');
  const plans = starts.map((match, i) => {
    const name = match[1].trim();
    const body = section.slice(match.index, starts[i + 1]?.index ?? section.length);
    const price = Number(match[2].replace(/,/g, ''));
    if (name === 'Free') return makePlan(name, price, unknown(), bi('免费用量有限，未公布可比额度。', 'Limited free usage; no comparable allowance published.'));
    let amount;
    if (name === 'Plus') {
      requireFact(/Shared\nAI usage pool/.test(body) && /Only Grok models/.test(body), 'Cursor Plus baseline changed');
      amount = 1;
    } else amount = oneNumber([...body.matchAll(/(\d+(?:\.\d+)?)x\nmore usage compared to Plus/g)], `Cursor ${name} multiplier`);
    return makePlan(name, price, { amount, unit: 'relative', window: 'week', group: 'cursor-grok-plus' }, bi('以 Plus 为 1×；Cursor 与 Grok 共享周额度。第三方模型及 Grok API 另计费。', 'Plus = 1×; weekly allowance shared by Cursor and Grok. Third-party models and Grok API billed separately.'));
  });
  return uniquePlans(plans, ['free', 'plus', 'premium', 'super', 'ultra']);
}

export function parseClaude(raws) {
  const text = normalizeText(raws[0]);
  requireFact(/activity across Claude[^\n]*Claude Code all draws from the same pool/i.test(text), 'Claude shared usage wording changed');
  const section = between(text, '\nFree\n', 'Compare features across plans');
  // A card's price is bounded by its action, so annual prices cannot win over monthly prices.
  const starts = [...section.matchAll(/^([^\n$]+)\n([^\n]+)\n\$([\d,.]+)\n/gm)];
  requireFact(starts.length >= 4, 'Claude individual price cards not found');
  const plans = starts.map((match, i) => {
    const name = match[1].trim();
    const body = section.slice(match.index, starts[i + 1]?.index ?? section.length);
    if (name === 'Free') return makePlan(name, Number(match[3].replace(/,/g, '')), unknown(), bi('免费用量同时受五小时与每周限制，未公布固定消息数。', 'Free usage has five-hour and weekly limits; no fixed message count published.'));
    const priceText = body.split('Try Claude')[0];
    let price = Number(match[3].replace(/,/g, ''));
    if (/annual/i.test(priceText)) price = oneNumber([...priceText.matchAll(/\$([\d,.]+) if billed monthly/g)], `Claude ${name} monthly price`);
    else requireFact(/Per month|Free for everyone/i.test(priceText), `Claude ${name} billing interval missing`);
    let amount;
    if (name === 'Pro') {
      requireFact(/More usage than Free, every 5 hours and every week/.test(body), 'Claude Pro baseline changed');
      amount = 1;
    } else amount = oneNumber([...body.matchAll(/(\d+(?:\.\d+)?)x Pro usage every (?:5 hours and every )?week/g)], `Claude ${name} weekly multiplier`);
    return makePlan(name, price, { amount, unit: 'relative', window: 'week', group: 'claude-pro' }, bi(`以 Pro 为 1×；Claude 与 Claude Code 共享周额度。${/No 5-hour limit/.test(body) ? '已验证账户无五小时限制。' : '另有五小时限制。'}`, `Pro = 1×; weekly allowance shared by Claude and Claude Code. ${/No 5-hour limit/.test(body) ? 'Verified accounts have no five-hour limit.' : 'Five-hour limits also apply.'}`));
  });
  // Claude Free does not include Claude Code and is outside this coding-plan list.
  return uniquePlans(plans.filter(plan => plan.id !== 'free'), ['pro', 'max', 'ultra']);
}

function markdownTables(text) {
  const lines = text.split('\n');
  const tables = [];
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].startsWith('|') || !/^\|[\s:|\-]+\|$/.test(lines[i + 1])) continue;
    const split = line => line.slice(1, -1).split('|').map(cell => cell.trim());
    const headers = split(lines[i]);
    const rows = [];
    i += 2;
    while (lines[i]?.startsWith('|')) rows.push(split(lines[i++]));
    tables.push({ headers, rows });
  }
  return tables;
}

export function parseCopilot(raws) {
  const text = normalizeText(raws[0]);
  const section = between(text, '### GitHub AI Credits allowance by plan', '### Inline suggestions');
  const tables = markdownTables(section).filter(table => table.headers.includes('Total monthly AI credits'));
  requireFact(tables.length === 1, 'Copilot total monthly credit table missing or ambiguous');
  const { headers, rows } = tables[0];
  const columns = ['Plan', 'Price per month', 'Base credits', 'Flex allotment', 'Total monthly AI credits'].map(label => {
    requireFact(headers.filter(h => h === label).length === 1, `Copilot ambiguous column: ${label}`);
    return headers.indexOf(label);
  });
  const plans = rows.map(row => {
    requireFact(row.length === headers.length, 'Malformed Copilot credit row');
    const [name, price, base, flex, total] = columns.map(index => row[index]);
    requireFact(/^Copilot [\w +.-]+$/.test(name) && /^\$[\d,.]+ USD$/.test(price), 'Unsupported Copilot plan or price');
    requireFact([base, flex, total].every(cell => /^\d{1,3}(?:,\d{3})*$|^\d+$/.test(cell)), 'Unsupported Copilot credit amount');
    const number = value => Number(value.replace(/,/g, ''));
    requireFact(number(base) + number(flex) === number(total), `Copilot total does not equal base + flex: ${name}`);
    return makePlan(name.replace(/^Copilot /, ''), number(price.slice(1, -4)), { amount: number(total), unit: 'credits', window: 'month', group: 'github-ai-credits' }, bi('每月 GitHub AI Credits 总额，包含 Base 与 Flex；不同模型消耗不同。', 'Total monthly GitHub AI Credits, including Base and Flex; consumption varies by model.'));
  });
  const overview = between(text, '## Copilot plans overview', '## Individual plans');
  const overviewTables = markdownTables(overview);
  requireFact(overviewTables.length === 1, 'Copilot overview table missing');
  const individual = overviewTables[0].rows.filter(row => !/^Copilot (?:Business|Enterprise|access)$/.test(row[0]));
  const covered = new Set(plans.map(plan => `Copilot ${plan.name}`));
  for (const row of individual) {
    if (['Copilot Free', 'Copilot Student'].includes(row[0])) {
      requireFact(row[1] === 'Free', `Copilot free plan pricing changed: ${row[0]}`);
      plans.unshift(makePlan(row[0].slice(8), 0, unknown(), bi(row[0].endsWith('Student') ? '仅限已验证学生；积分额度未公布。' : '免费积分额度未公布。', row[0].endsWith('Student') ? 'Verified students only; credit allowance not published.' : 'Free credit allowance not published.')));
    } else requireFact(covered.has(row[0]), `Copilot individual plan lacks a supported total credit row: ${row[0]}`);
  }
  return uniquePlans(plans, ['free', 'student', 'pro', 'pro-plus', 'max']);
}

export function parseCodex(raws) {
  const raw = raws[0];
  const pricing = between(raw, '## Pricing options', '## Included usage');
  const cards = [...pricing.matchAll(/<PricingCard\b([^>]*)>([\s\S]*?)<\/PricingCard>/g)].map(match => {
    const attributes = Object.fromEntries([...match[1].matchAll(/([\w]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
    return { ...attributes, body: normalizeText(match[2]) };
  });
  const business = cards.findIndex(card => card.name === 'Business');
  requireFact(business > 0, 'Codex individual/business card boundary missing');
  const individual = cards.slice(0, business).filter(card => card.name !== 'API Key');
  const usageRaw = between(raw, '## Included usage', '## Speed multipliers');
  const usage = normalizeText(usageRaw);
  requireFact(/local messages per five-hour period for Plus/i.test(usage) && /Pro plans currently have no five-hour limit/i.test(usage) && /Local messages and cloud chats share your plan's usage allowance/i.test(usage), 'Codex usage scope or five-hour semantics changed');
  const { document } = parseHTML(usageRaw);
  const rows = [...document.querySelectorAll('tr')].map(row => [...row.querySelectorAll('th,td')].map(cell => normalizeText(cell.innerHTML)));
  const header = rows.find(row => row[0] === 'Model');
  requireFact(header?.filter(cell => cell === 'Plus').length === 1, 'Codex Plus usage column missing');
  const baselineModel = 'GPT-6.1 Sol';
  const ranges = rows.filter(row => row[0] === baselineModel).map(row => row[header.indexOf('Plus')]);
  requireFact(ranges.length === 1 && /^\d[\d,]*\s*[-–]\s*\d[\d,]*$/.test(ranges[0]), 'Codex reference model range missing or ambiguous');
  const [amount, max] = ranges[0].split(/[-–]/).map(value => Number(value.replace(/,/g, '').trim()));
  requireFact(amount > 0 && max >= amount, 'Codex invalid message range');
  const plans = individual.flatMap(card => {
    requireFact(/^\$[\d,.]+$/.test(card.price ?? '') && card.interval === '/month', `Unsupported Codex monthly card: ${card.name}`);
    if (card.name === 'Pro') {
      const matches = [...card.body.matchAll(/Plans at ([^.]+?) USD per month/g)];
      requireFact(matches.length === 1 && /^\$\d[\d,]*(?:(?:, |,? or )\$\d[\d,]*)*$/.test(matches[0][1]), 'Codex Pro tier list missing or unsupported');
      const prices = [...matches[0][1].matchAll(/\$([\d,]+)/g)].map(match => Number(match[1].replace(/,/g, '')));
      requireFact(prices.length === new Set(prices).size && Math.min(...prices) === Number(card.price.slice(1)), 'Codex Pro starting price conflicts with tiers');
      return prices.map(price => makePlan(`Pro $${price}`, price, unknown(), bi('无五小时限制；官方此页未公布各档固定周额度，不能按价格推算倍数。与 ChatGPT Work 共享用量。', 'No five-hour limit; this page publishes no fixed weekly allowance per tier. Do not infer multipliers from price. Usage is shared with ChatGPT Work.')));
    }
    if (card.name === 'Plus') return [makePlan('Plus', Number(card.price.slice(1)), { amount, max, unit: 'messages', window: '5h', group: 'codex-gpt-6.1-sol' }, bi(`${baselineModel} 本地消息参考范围，非保证上限；云端任务共享用量且消耗可能更高，另可能有周限制。`, `${baselineModel} estimated local message range, not a guaranteed limit; cloud tasks share usage and may consume more. Weekly limits may apply.`))];
    requireFact(['Free', 'Go'].includes(card.name), `New Codex card requires usage mapping: ${card.name}`);
    requireFact(/GPT-6 Luna at Standard speed in the desktop app, subject to rollout/.test(card.body), `Codex ${card.name} limited access wording changed`);
    return [makePlan(card.name, Number(card.price.slice(1)), unknown(), bi('仅桌面应用中的 GPT-6 Luna Standard，分批开放；未公布固定额度，并非 Plus 的完整访问权限。', 'Limited to GPT-6 Luna at Standard speed in the desktop app, subject to rollout; no fixed allowance published. Does not include full Plus access.'))];
  });
  return uniquePlans(plans, ['free', 'go', 'plus', 'pro-100', 'pro-200', 'pro-500']);
}

export const coreProviders = [
  { id: 'cursor', name: 'Cursor', product: 'Cursor', description: bi('集成 AI 智能体的代码编辑器，订阅额度与 Grok 共享。', 'Code editor with AI agents and a subscription allowance shared with Grok.'), sources: [{ url: 'https://cursor.com/pricing', title: 'Cursor pricing' }], parse: parseCursor },
  { id: 'claude', name: 'Anthropic', product: 'Claude Code', description: bi('终端与开发工具中的编码智能体，与 Claude 订阅共享用量。', 'Coding agent for terminals and development tools, sharing usage with Claude subscriptions.'), sources: [{ url: 'https://claude.com/pricing', title: 'Claude plans and pricing' }], parse: parseClaude },
  { id: 'codex', name: 'OpenAI', product: 'Codex', description: bi('覆盖桌面、命令行和云端的编码智能体，使用 ChatGPT 订阅额度。', 'Coding agent across desktop, CLI, and cloud, using ChatGPT subscription allowances.'), sources: [{ url: 'https://learn.chatgpt.com/docs/pricing.md', title: 'ChatGPT Work and Codex pricing' }], parse: parseCodex },
  { id: 'copilot', name: 'GitHub', product: 'GitHub Copilot', description: bi('面向编辑器、终端与 GitHub 的编码助手，付费计划按 AI 积分计量。', 'Coding assistant for editors, terminals, and GitHub, with AI credits on paid plans.'), sources: [{ url: 'https://docs.github.com/api/article/body?pathname=/en/copilot/get-started/plans', title: 'Plans for GitHub Copilot' }], parse: parseCopilot },
];

// Evidence contains only bounded official excerpts; site navigation and model catalogs are omitted.
export function evidenceText(id, raws) {
  const text = normalizeText(raws.join('\n\n'));
  if (id === 'cursor' || id === 'claude') {
    const cards = between(text, '\nFree\n', 'Compare features across plans');
    const details = text.split('\n').filter(line => id === 'cursor'
      ? /Every tier includes|Plus includes Grok|API usage is billed separately/.test(line)
      : /Your activity across Claude|Claude Code is included in all paid plans/.test(line));
    return `${cards}\n${[...new Set(details)].join('\n')}\n`;
  }
  if (id === 'copilot') return `${between(text, '### GitHub AI Credits allowance by plan', '### Inline suggestions')}\n`;
  if (id === 'codex') {
    const excerpt = between(raws[0], '## Pricing options', '## Speed multipliers')
      .replace(/<PricingCard\b([^>]*)>/g, (_, attrs) => {
        const a = Object.fromEntries([...attrs.matchAll(/([\w]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
        return `\n${a.name ?? ''} ${a.price ?? ''} ${a.interval ?? ''}\n`;
      });
    return `${normalizeText(excerpt)}\n`;
  }
  requireFact(text.length <= 16000, `${id}: official evidence needs a bounded excerpt adapter`);
  return `${text}\n`;
}
