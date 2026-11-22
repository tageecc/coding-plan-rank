import { normalizeText, requireFact, slug } from './parsers.mjs';

const bi = (zh, en) => ({ zh, en });
const number = value => Number(value.replace(/,/g, ''));
const unknown = window => ({ amount: null, unit: 'unknown', window, group: null });
const plan = (name, monthlyUsd, quota, note) => ({ id: slug(name), name, monthlyUsd, quota, note });
const source = (url, title) => ({ url, title });

function normalizeOfficial(raw) {
  return normalizeText(raw).split('\n').filter(line => !/^\|[\s:|\-]+\|$/.test(line)).map(line => {
    if (line.startsWith('|')) line = line.replace(/^\|\s*|\s*\|$/g, '').replace(/\s*\|\s*/g, ' ');
    return line.replace(/^#{1,6}\s+/, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/^(Google AI (?:Pro|Ultra))\d+$/, '$1');
  }).join('\n');
}

function text(raws, index, label) {
  requireFact(typeof raws?.[index] === 'string' && raws[index].trim(), `${label}: missing official source ${index + 1}`);
  return normalizeOfficial(raws[index]);
}

function matchOne(text, pattern, label) {
  const matches = [...text.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))];
  requireFact(matches.length === 1, `${label}: missing or ambiguous official evidence`);
  return matches[0];
}

function section(text, start, end, label) {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + start.length);
  requireFact(a >= 0 && b > a, `${label}: official section changed`);
  return text.slice(a, b);
}

export function parseAntigravity(raws) {
  const prices = text(raws, 0, 'Google');
  const limits = text(raws, 1, 'Google');
  const access = text(raws, 2, 'Google');
  requireFact(/For Individuals\n\$0\/month\nExperience Antigravity without a subscription plan/.test(access), 'Google: free individual price changed');
  requireFact(/refreshed every five hours/i.test(limits) && /weekly rate limit/i.test(limits) && /amount of work done by the agent/i.test(limits), 'Google: Antigravity quota semantics changed');
  const pro = matchOne(prices, /^Google AI Pro\n[^\n]+\n\$([\d,.]+)\s*\/\s*month\b/gm, 'Google AI Pro regular monthly price');
  const ultra = section(prices, '\nGoogle AI Ultra\n', '\nGet started\n', 'Google Ultra price card');
  const tiers = [...ultra.matchAll(/\$([\d,.]+)\s*\/\s*month:\s*(\d+)x higher usage limits vs\. AI Pro/g)];
  requireFact(tiers.length === 2 && new Set(tiers.map(m => m[2])).size === 2, 'Google: Ultra price tiers changed');
  const note = bi('每五小时刷新，另受周上限约束；固定额度未公开，按任务消耗。名称中的倍数不代表已验证的编码额度。', 'Refreshes every five hours with a weekly cap; fixed quantity undisclosed and consumption depends on work. Tier names do not establish coding-quota multiples.');
  requireFact(/Users not on Google AI Pro or Ultra plans/.test(limits) && /meaningful quota, refreshed weekly/.test(limits), 'Google: unpaid access changed');
  return [plan('Free', 0, unknown('week'), bi('免费基础额度按周刷新，固定数量未公开；无付费计划的优先额度。', 'Free baseline allowance refreshes weekly; fixed quantity undisclosed, without paid-plan priority.')), plan('Google AI Pro', number(pro[1]), unknown('5h'), note), ...tiers.map(m => plan(`Google AI Ultra ${m[2]}x`, number(m[1]), unknown('5h'), note))];
}

export function parseDevin(raws) {
  const prices = text(raws, 0, 'Devin');
  const limits = text(raws, 1, 'Devin');
  requireFact(/Pro has a daily and weekly allowance/.test(limits) && /Max has a weekly allowance only, with no daily cap/.test(limits) && /calendar basis/.test(limits), 'Devin: calendar quota rules changed');
  const result = ['Pro', 'Max'].map(name => {
    const price = matchOne(limits, new RegExp(`^${name} [^\\n$]+\\$([\\d,.]+)\\/month 1$`, 'gm'), `Devin ${name} monthly price`);
    const publicPrice = matchOne(prices, new RegExp(`^${name}(?:POPULAR|NEW)?\\n\\$([\\d,.]+)\\s*per month$`, 'gm'), `Devin ${name} public price`);
    requireFact(number(publicPrice[1]) === number(price[1]), `Devin ${name}: pricing and billing sources disagree`);
    return plan(name, number(price[1]), unknown('week'), bi(name === 'Pro' ? '按日历周及日历日刷新；数值与时区未公开。桌面、CLI、云端共享；超额另付费。' : '按日历周刷新，无每日上限；数值与时区未公开。桌面、CLI、云端共享；超额另付费。', name === 'Pro' ? 'Calendar-week and calendar-day allowances; quantities and timezone undisclosed. Shared across Desktop, CLI and cloud; overages cost extra.' : 'Calendar-week allowance, no daily cap; quantity and timezone undisclosed. Shared across Desktop, CLI and cloud; overages cost extra.'));
  });
  const freeCard = section(prices, '\nFree\n', '\nPro', 'Devin free card');
  const freePrice = matchOne(freeCard, /^\$([\d,.]+)$/gm, 'Devin Free price');
  requireFact(number(freePrice[1]) === 0 && /Light quota to code with agents/.test(freeCard) && /The Free plan lets you try Devin with limited usage/.test(limits), 'Devin free agent access changed');
  return [plan('Free', 0, unknown('dynamic'), bi('免费 Agent 用量有限，固定数量未公开；模型及云端访问受限。', 'Limited free agent usage, fixed quantity undisclosed; restricted models and cloud access.')), ...result];
}

export function parseGlm(raws) {
  const prices = text(raws, 0, 'GLM');
  const limits = text(raws, 1, 'GLM');
  requireFact(/Plan Type 5-Hour Credits Weekly Credits/.test(limits) && /resets every 7 days/.test(limits) && /5 hours after consumption/.test(limits), 'GLM: credit units or reset rules changed');
  return ['Lite', 'Pro', 'Max'].map((name, index, names) => {
    // The first value is discounted; the second is the displayed regular list price.
    const body = section(prices, `GLM Coding\n${name}\n`, names[index + 1] ? `GLM Coding\n${names[index + 1]}\n` : 'Prices and plan benefits may change.', `GLM ${name} price card`);
    const card = matchOne(body, /\$([\d,.]+)\s*\/\s*month\s*\$([\d,.]+)(?=\s|$)/g, `GLM ${name} regular monthly price`);
    const quota = matchOne(limits, new RegExp(`^${name} ([\\d,]+) ([\\d,]+)$`, 'gm'), `GLM ${name} credit allowances`);
    const fiveHour = number(quota[1]);
    return plan(name, number(card[2]), { amount: number(quota[2]), unit: 'credits', window: 'week', group: 'glm-coding-credits' }, bi(`常规标价；另有每五小时 ${fiveHour.toLocaleString('en-US')} 积分上限。周额度自订阅起每七天刷新；按模型及缓存计费，非请求数，非高峰优惠不计入额度。`, `Regular list price; also capped at ${fiveHour.toLocaleString('en-US')} credits per five hours. Weekly credits reset every seven days from subscription; model/cache-dependent, not requests. Off-peak discounts excluded from allowance.`));
  });
}

function parseMinimax(raws, domestic) {
  const label = domestic ? 'MiniMax China' : 'MiniMax International';
  const prices = text(raws, 0, label);
  const limits = text(raws, 1, label);
  requireFact(domestic ? /原价/.test(prices) : /Regular price/.test(prices), `${label}: regular-price column missing`);
  requireFact(domestic ? /5\s*小时/.test(limits) && /7\s*天/.test(limits) : /5-hour/.test(limits) && /7 days/.test(limits), `${label}: usage windows changed`);
  return ['Go', 'Explore', 'Build'].map(name => {
    const pricePattern = domestic
      ? new RegExp(`^${name} \\d+(?:\\.\\d+)? 折 [¥￥]([\\d,.]+)\\/月$`, 'gm')
      : new RegExp(`^${name} \\d+(?:\\.\\d+)?% off \\$([\\d,.]+)\\/month$`, 'gm');
    const price = number(matchOne(prices, pricePattern, `${label} ${name} regular price`)[1]);
    const quota = matchOne(limits, new RegExp(`^${name} [^\\n]+? ([\\d.]+)${domestic ? ' 倍(?:（基准）)?' : '×'}$`, 'gm'), `${label} ${name} relative quota`);
    const result = plan(name, domestic ? null : price, { amount: number(quota[1]), unit: 'relative', window: 'week', group: domestic ? 'minimax-cn-go' : 'minimax-intl-go' }, bi('官网列明的常规月价；首月活动已结束。以本区 Go 为 1×，所有模型及工具共享周额度；另有五小时窗口。窗口从首次使用起算，到期后下次使用开启新窗口。', 'Published regular monthly price; first-month offer ended. Regional Go = 1×; shared weekly allowance across models/tools with a five-hour window too. Windows start on first use; next use after expiry starts a new window.'));
    if (domestic) Object.assign(result, { currency: 'CNY', monthlyPrice: price });
    return result;
  });
}

export const parseMinimaxInternational = raws => parseMinimax(raws, false);
export const parseMinimaxChina = raws => parseMinimax(raws, true);

export function parseKimi(raws) {
  const prices = text(raws, 0, 'Kimi');
  const limits = text(raws, 1, 'Kimi');
  requireFact(/weekly quota limit is removed/.test(limits) && /rolling 5-hour/.test(limits) && /membership monthly total quota/.test(limits), 'Kimi: new-member quota semantics changed');
  const row = matchOne(prices, /^Monthly billing ((?:\$[\d,.]+\/month\s*)+)$/gm, 'Kimi regular monthly billing row');
  const names = matchOne(prices, /^Item (Plus Pro Max Ultra)$/gm, 'Kimi monthly-price columns')[1].split(' ');
  const values = [...row[1].matchAll(/\$([\d,.]+)\/month/g)].map(m => number(m[1]));
  requireFact(values.length === names.length, 'Kimi: monthly price columns do not align');
  return names.map((name, i) => plan(name, values[i], unknown('5h'), bi('国际区新计划；滚动五小时限制，另有共享月额度，数值未公开；新订阅无周上限。旧计划规则不同，年付折算价及额外付费不计入。', 'International new plan: rolling five-hour limit plus shared monthly pool, quantities undisclosed; no weekly cap for new subscribers. Legacy rules differ; annual equivalents and paid Extra Usage excluded.')));
}

export function parseKiro(raws) {
  const prices = text(raws, 0, 'Kiro');
  const limits = text(raws, 1, 'Kiro');
  requireFact(/plan credits renew at the beginning of the next billing cycle/.test(limits) && /Credits are consumed fractionally/.test(limits), 'Kiro: monthly credit reset or unit changed');
  const cards = [...prices.matchAll(/^KIRO (FREE|PRO\+|PRO MAX|PRO|POWER)\n\$([\d,.]+)\nper (?:user \/ )?month\n([\d,]+) credits$/gm)];
  requireFact(cards.length === 5 && new Set(cards.map(m => m[1])).size === 5, 'Kiro: individual price/credit cards changed');
  return cards.map(m => {
    const name = m[1] === 'PRO+' ? 'Pro+' : m[1].toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    return plan(name, number(m[2]), { amount: number(m[3]), unit: 'credits', window: 'month', group: 'kiro-credits' }, bi('订阅积分于下一账期开始时刷新；按任务消耗小数积分，不等于请求数。试用赠送及另购积分未计入。', 'Plan credits renew at the next billing cycle; tasks consume fractional credits, not a one-credit-per-request allowance. Trial and purchased credits excluded.'));
  });
}

export const extraProviders = [
  { id: 'antigravity', name: 'Google', product: 'Google Antigravity', description: bi('Google AI 订阅包含的编码智能体；不沿用已停止销售的 Code Assist 套餐。', 'Coding agent included with Google AI subscriptions; excludes discontinued Code Assist plans.'), sources: [source('https://gemini.google/us/subscriptions/', 'Google AI US monthly subscriptions'), source('https://antigravity.google/docs/plans', 'Antigravity plans and usage limits'), source('https://antigravity.google/pricing', 'Antigravity free individual access')], parse: parseAntigravity },
  { id: 'devin', name: 'Cognition', product: 'Devin / Windsurf', description: bi('Windsurf 官网现指向 Devin；涵盖桌面、CLI 与云端。', 'Windsurf pricing now redirects to Devin, covering Desktop, CLI and cloud.'), sources: [source('https://devin.ai/pricing', 'Devin plans and pricing'), source('https://docs.devin.ai/admin/billing/self-serve', 'Devin self-serve billing and quotas')], parse: parseDevin },
  { id: 'glm', name: 'Z.ai', product: 'GLM Coding Plan', description: bi('GLM 编码订阅国际版，支持多种智能体工具。', 'International GLM coding subscription for multiple agent tools.'), sources: [source('https://zcode.z.ai/en', 'ZCode GLM regular and discounted plan prices'), source('https://docs.z.ai/devpack/overview', 'GLM Coding Plan credit allowances and reset rules')], parse: parseGlm },
  { id: 'minimax', name: 'MiniMax', product: 'MiniMax M Plan', description: bi('MiniMax 国际版编码与多模态共享订阅。', 'MiniMax international subscription shared by coding and multimodal tools.'), sources: [source('https://platform.minimax.io/docs/m-plan/monthly-offer', 'M Plan regular renewal prices; launch offer ended'), source('https://platform.minimax.io/docs/m-plan/faq', 'M Plan international tiers and usage windows')], parse: parseMinimaxInternational },
  { id: 'minimax-cn', name: 'MiniMax 中国', product: 'MiniMax M Plan 中国版', description: bi('人民币计价的 MiniMax 中国版；价格和档位倍数与国际版不同。', 'CNY-billed MiniMax China plans; prices and tier multipliers differ from international plans.'), sources: [source('https://platform.minimax.cn/docs/m-plan/monthly-offer', 'M Plan 中国版常规续费价；首月活动已结束'), source('https://platform.minimax.cn/docs/m-plan/faq', 'M Plan 中国版档位与用量规则')], parse: parseMinimaxChina },
  { id: 'kimi', name: 'Moonshot AI', product: 'Kimi Code', description: bi('Kimi 国际版会员中的编码权益，与其他会员服务共享额度。', 'Coding benefits in international Kimi membership, sharing allowance with other member services.'), sources: [source('https://www.kimi.ai/resources/coding-plan', 'Kimi international monthly plan prices'), source('https://www.kimi.com/en/help/kimi-code/benefits', 'Kimi Code new and legacy membership limits')], parse: parseKimi },
  { id: 'kiro', name: 'AWS', product: 'Kiro', description: bi('AWS 编码智能体，按月提供可按小数消耗的积分。', 'AWS coding agent with monthly, fractionally consumed credits.'), sources: [source('https://kiro.dev/pricing/', 'Kiro individual monthly prices and credits'), source('https://kiro.dev/docs/billing/', 'Kiro billing-cycle reset rules')], parse: parseKiro },
];

// The updater can use this instead of retaining navigation-heavy whole pages.
export function evidenceExtraText(id, raws) {
  const combined = raws.map(normalizeOfficial);
  switch (id) {
    case 'antigravity': return `${section(combined[2], 'For Individuals', 'For Builders', 'Google free access')}\n${section(combined[0], '\nGoogle AI Pro\n', '\nGet started\n', 'Google Pro evidence')}\n${section(combined[0], '\nGoogle AI Ultra\n', '\nGet started\n', 'Google Ultra evidence')}\n${section(combined[1], 'Baseline quota', 'Overages', 'Google quota evidence')}\n`;
    case 'devin': return `${section(combined[0], '\nFree\n', '\nPro', 'Devin Free evidence')}\n${combined[1].split('\n').filter(line => /^(Pro Individual users|Max Power users)/.test(line)).join('\n')}\n${section(combined[1], 'How quotas work', 'On-demand credits', 'Devin quota evidence').split('\n').filter(line => !line.startsWith('Teams ')).join('\n')}\n`;
    case 'glm': return `${section(combined[0], 'GLM Coding\nLite\n', '\nCapabilities\n', 'GLM evidence')}\n${section(combined[1], 'Usage Credit Allowance', 'Estimated Token Allowance', 'GLM quota evidence')}\n`;
    case 'minimax': return `Regular renewal prices; first-month launch offer ended.\n${section(combined[0], 'Tier First-month discount Regular price', 'New purchases:', 'MiniMax prices')}\n${section(combined[1], 'Tier Intended usage', 'Which models does M Plan include?', 'MiniMax relative allowance')}\n${section(combined[1], 'Do text, speech, video, and image models', 'Do different models', 'MiniMax shared scope')}\n${section(combined[1], 'How is usage reset?', 'Does unused quota carry over?', 'MiniMax resets')}\n`;
    case 'minimax-cn': return `常规续费价；首月活动已结束。\n${section(combined[0], '档位 首月活动折扣 原价', '新购：', 'MiniMax 中国版价格')}\n${section(combined[1], '档位 使用定位', 'M Plan 包含哪些模型', 'MiniMax 中国版相对额度')}\n${section(combined[1], '文本、声音、视频和图片的额度是分开的吗？', '不同模型的额度消耗', 'MiniMax 中国版共享范围')}\n${section(combined[1], '用量是如何重置的？', '没用完的额度会累积或结转吗？', 'MiniMax 中国版刷新')}\n`;
    case 'kimi': return `${section(combined[0], 'Item Plus Pro Max Ultra', 'Get coding plan', 'Kimi evidence')}\n${section(combined[1], 'Quota and Limits', 'Extra Usage', 'Kimi quota evidence')}\n`;
    case 'kiro': return `${section(combined[0], '\nKIRO FREE\n', '\nTeams and enterprises\n', 'Kiro evidence')}\n${combined[1].split('\n').filter(line => /^Credits are consumed fractionally/.test(line)).join('\n')}\n${section(combined[1], 'Credit reset', 'Page updated:', 'Kiro reset evidence')}\n`;
    default: throw new Error(`Unknown extra provider: ${id}`);
  }
}

export { evidenceExtraText as extraEvidenceText };
