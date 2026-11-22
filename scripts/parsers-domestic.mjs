import {normalizeText, requireFact, slug, usageCap} from './parsers.mjs';

const number = value => Number(value.replaceAll(',', ''));
const bi = (zh, en) => ({zh, en});
const source = url => ({url, title: 'Official plan documentation'});
const quota = (amount, group, window='month') => ({amount, unit: 'credits', window, group});
const plan = (name, monthlyPrice, q, note, caps=[]) => ({id: slug(name), name, currency: 'CNY', monthlyPrice, monthlyUsd: null, quota: q, note, caps});
const text = (raws, index=0) => {
  requireFact(typeof raws?.[index] === 'string' && raws[index].trim(), 'Missing domestic official source');
  return normalizeText(raws[index]).replaceAll('\u200b','').split('\n').map(line => line.replace(/^#{1,6}\s+/,'').replaceAll('**','')).filter(line => line.trim()).join('\n');
};
const section = (s, start, end) => {
  const a=s.indexOf(start), b=s.indexOf(end,a+start.length);
  requireFact(a>=0 && b>a, `Official section changed: ${start}`);
  return s.slice(a,b);
};
const four = (s, pattern, label) => {
  const matches=[...s.matchAll(pattern)];
  requireFact(matches.length===4, `Missing or ambiguous ${label}`);
  return matches;
};
const one = (s, pattern, label) => {
  const matches=[...s.matchAll(pattern)];
  requireFact(matches.length===1, `Missing or ambiguous ${label}`);
  return matches[0];
};

export function parseAliyun(raws) {
  const s=text(raws), block=section(s,'套餐档位与定价','并发 Agent');
  const usage=text(raws,1), faq=text(raws,2);
  requireFact(/额度按订阅月自动重置/.test(usage) && /限流阈值（TPM\/RPM）是多少/.test(faq) && /限流阈值会根据整体负载动态调整/.test(faq) && /等待约 1 分钟后重试/.test(faq) && !/(?:5|五)\s*小时/.test(usage+faq),'Aliyun monthly quota or throughput rules changed');
  requireFact(/Lite 套餐\nEssential 套餐\nStandard 套餐\nPro 套餐/.test(block) && /额度按订阅月计算/.test(s), 'Aliyun tiers or reset rules changed');
  const prices=four(section(block,'定价','每月限额'),/^([\d.]+) 元\/月$/gm,'Aliyun standard monthly prices');
  const amounts=four(block,/^([\d,]+) Credits$/gm,'Aliyun monthly credits');
  return ['Lite','Essential','Standard','Pro'].map((name,i)=>plan(name,number(prices[i][1]),quota(number(amounts[i][1]),'aliyun-personal'),bi('依据官方完整用量与限流规则整理：额度按订阅月计量，无固定五小时额度；仍有动态 TPM/RPM 及并发限制。模型、缓存与工具按不同系数抵扣，非 Token 数；不含限时折扣及加油包。','Derived from the complete official usage/FAQ rules: subscription-month credits, without a fixed five-hour allowance; dynamic TPM/RPM and concurrency limits still apply. Model/cache/tool-based deductions, not tokens. Promotions and add-ons excluded.'),[usageCap('5h',null,'unknown','none')]));
}

export function parseKimiChina(raws) {
  const s=text(raws), limits=text(raws,1);
  requireFact(/项目 Plus Pro Max Ultra/.test(s) && /每\s*5\s*小时/.test(limits) && /月总额度/.test(limits) && /新会员：取消每周额度限制/.test(limits), 'Kimi China plan or quota rules changed');
  const row=one(s,/^连续包月 ¥([\d,]+)\/月 ¥([\d,]+)\/月 ¥([\d,]+)\/月 ¥([\d,]+)\/月$/gm,'Kimi China monthly prices');
  return ['Plus','Pro','Max','Ultra'].map((name,i)=>plan(name,number(row[i+1]),{amount:null,unit:'unknown',window:'5h',group:null},bi('滚动五小时与共享月总额度；固定数量未公开。新订阅无周限制。','Rolling five-hour limit and shared monthly allowance; fixed quantities undisclosed. No weekly cap for new subscribers.'), [usageCap('month')]));
}

export function parseMimo(raws) {
  const s=section(text(raws),'Pricing and Quotas for Individual Edition','Annual Package');
  requireFact(/无\s*5\s*小时\s*token\s*使用限额/.test(text(raws,1)),'MiMo explicit no-five-hour rule changed');
  requireFact(/Monthly Plan\nLite\nStandard\nPro\nMax/.test(s),'MiMo individual monthly tiers changed');
  const prices=four(s,/^\$[\d.]+\/month, ¥([\d,]+)\/month$/gm,'MiMo CNY monthly prices');
  const amounts=four(s,/^([\d.]+) billion Credits$/gm,'MiMo monthly credits');
  return ['Lite','Standard','Pro','Max'].map((name,i)=>plan(name,number(prices[i][1]),quota(Math.round(number(amounts[i][1])*1e9),'mimo-cn'),bi('官方发布公告明确无五小时 Token 限额；按订阅月积分计量，各模型按输入、输出及缓存分别抵扣，积分不等于 Token；不含年付及首购折扣。','Official release explicitly removes the five-hour token cap; subscription-month credits with model/input/output/cache-dependent deductions, not tokens. Annual and first-purchase discounts excluded.'),[usageCap('5h',null,'unknown','none')]));
}

export function parseTencent(raws, hy=false) {
  const s=text(raws), prefix=hy?'混元':'通用';
  const overview=text(raws,1),faq=text(raws,2);
  requireFact(/每订阅月/.test(overview) && /Token Plan 并发速率与您的套餐等级相关/.test(faq) && /等待下个订阅月用量刷新/.test(faq) && !/(?:5|五)\s*小时/.test(overview+faq),'Tencent monthly quota or concurrency rules changed');
  const block=hy?section(s,'混元-基础套餐 Lite','通用-基础套餐 Lite'):section(s,'通用-基础套餐 Lite','企业-轻享套餐');
  const names=['Lite','Standard','Pro','Max'];
  const labels=['基础','标准','进阶','超级'];
  return names.map((name,i)=> {
    const card=i<3?section(block,`${prefix}-${labels[i]}套餐 ${name}`,`${prefix}-${labels[i+1]}套餐 ${names[i+1]}`):block.slice(block.indexOf(`${prefix}-${labels[i]}套餐 ${name}`));
    const price=one(card,/^([\d.]+)元\/月$/gm,'Tencent monthly price');
    const amount=one(card,/^([\d,]+)\s*积分$/gm,'Tencent credits');
    return plan(name,number(price[1]),quota(number(amount[1]),hy?'tencent-hy':'tencent-general'),bi('依据现行 Token Plan 完整额度与 FAQ 整理：按订阅月积分计量，无固定五小时额度；另有按套餐动态调整的并发速率限制。不能沿用旧 Coding Plan 请求窗口。模型抵扣规则不同，预估 Token 数不作为固定额度。','Derived from current Token Plan quota/FAQ rules: subscription-month credits, without a fixed five-hour allowance; tier-dependent dynamic concurrency rate limits still apply. Legacy Coding Plan request windows do not apply. Model-dependent deductions; token estimates are not fixed allowances.'),[usageCap('5h',null,'unknown','none')]);
  });
}

export function parseVolc(raws) {
  const s=text(raws), block=section(s,'用量说明','有效期');
  requireFact(/Small\nMedium\nLarge\nMax/.test(block) && /每周一 00:00:00 重置周限额/.test(s) && /每订阅月第 1 日/.test(s),'Volc Agent tiers or resets changed');
  const prices=four(section(block,'价格','月额度（AFP）'),/^([\d,]+) 元\/月$/gm,'Volc Agent monthly prices');
  const amounts=four(section(block,'月额度（AFP）','周额度（AFP）'),/^([\d,]+)$/gm,'Volc monthly AFP');
  const weeks=four(section(block,'周额度（AFP）','5小时额度（AFP）'),/^([\d,]+)$/gm,'Volc weekly AFP');
  const hours=four(section(block,'5小时额度（AFP）','日额度（AFP）'),/^([\d,]+)$/gm,'Volc five-hour AFP');
  return ['Small','Medium','Large','Max'].map((name,i)=>plan(name,number(prices[i][1]),quota(number(amounts[i][1]),'volc-agent-afp'),bi(`Agent Plan 月度 AFP；文本另受每周 ${weeks[i][1]}、每五小时 ${hours[i][1]} AFP 上限约束，非 Token 数。`,`Agent Plan monthly AFP; text also capped at ${weeks[i][1]} AFP/week and ${hours[i][1]} AFP/five hours, not tokens.`), [usageCap('5h',number(hours[i][1]),'credits'),usageCap('week',number(weeks[i][1]),'credits')]));
}

export function parseGlmChina(raws) {
  // Prices are public frontend data, extracted as text without executing the bundle.
  const prices=text(raws), limits=text(raws,1);
  requireFact(/周积分：自套餐下单时起，以 7 天为一个周期刷新/.test(limits),'GLM China weekly reset changed');
  return ['Lite','Pro','Max'].map(name=> {
    const row=one(prices,new RegExp(`^${name} CNY ([\\d.]+) month$`,'gm'),'GLM China monthly price');
    const amount=one(limits,new RegExp(`^${name} 套餐 ([\\d,]+) ([\\d,]+)$`,'gm'),'GLM China credits');
    return plan(name,number(row[1]),quota(number(amount[2]),'glm-cn','week'),bi(`每七天重置；另受每五小时 ${amount[1]} 积分上限约束；按模型和缓存抵扣。`,`Resets every seven days; also capped at ${amount[1]} credits per five hours, with model/cache-dependent deductions.`), [usageCap('5h',number(amount[1]),'credits')]);
  });
}

export const domesticProviders = [
  {id:'aliyun-cn',product:'Aliyun',parse:parseAliyun,sources:[source('https://help.aliyun.com/zh/model-studio/token-plan-personal-overview'),source('https://help.aliyun.com/zh/model-studio/token-plan-usage-quota'),source('https://help.aliyun.com/zh/model-studio/token-plan-faq')]},
  {id:'volc-cn',product:'Volcengine',parse:parseVolc,sources:[source('https://docs.volcengine.com/docs/ark/agent-plan-personal-plan-overview?lang=zh')]},
  {id:'glm-cn',product:'GLM CN',parse:parseGlmChina,sources:[source('https://bigmodel.cn/glm-coding'),source('https://docs.bigmodel.cn/cn/coding-plan/overview')]},
  {id:'kimi-cn',product:'Kimi CN',parse:parseKimiChina,sources:[source('https://www.kimi.com/resources/coding-plan'),source('https://www.kimi.com/help/kimi-code/benefits')]},
  {id:'mimo-cn',product:'MiMo CN',parse:parseMimo,sources:[source('https://mimo.mi.com/static/docs/price/token-plan.md'),source('https://mimo.mi.com/docs/zh-CN/news/latest/token-plan-release')]},
  ...['tencent-hy','tencent-cn'].map(id=>({id,product:id==='tencent-hy'?'Tencent Hy':'Tencent General',parse:raws=>parseTencent(raws,id==='tencent-hy'),sources:[source('https://cloud.tencent.com/product/tokenhub'),source('https://cloud.tencent.com/document/product/1823/130060'),source('https://cloud.tencent.com/document/product/1823/130076')]})),
].map(p=>({...p,description:bi('中国大陆个人编程与 Agent 订阅。','Mainland China individual coding and agent subscription.')}));

export function evidenceDomesticText(id, raws) {
  const s=text(raws);
  switch(id) {
    case 'aliyun-cn': return section(s,'套餐档位与定价','支持的模型')+'\n'+section(text(raws,1),'抵扣顺序','升级额度计算')+'\n'+section(text(raws,2),'限流阈值（TPM/RPM）是多少','团队版有并发限制吗')+'\n';
    case 'volc-cn': return section(s,'用量说明','TPM 限制')+'\n';
    case 'glm-cn': return s+'\n'+section(text(raws,1),'积分额度','积分抵扣计算方式')+'\n';
    case 'kimi-cn': return section(s,'项目 Plus Pro Max Ultra','获取 Coding Plan')+'\n'+text(raws,1).slice(0,10000)+'\n';
    case 'mimo-cn': return section(s,'Pricing and Quotas for Individual Edition','Pricing and Quotas for Team Edition')+'\n'+text(raws,1).split('\n').filter(line=>/无\s*5\s*小时/.test(line)).join('\n')+'\n';
    case 'tencent-hy':
    case 'tencent-cn': return (id==='tencent-hy'?section(s,'混元-基础套餐 Lite','通用-基础套餐 Lite'):section(s,'通用-基础套餐 Lite','企业-轻享套餐'))+'\n'+text(raws,1).split('\n').filter(line=>/^每订阅月$|^3\. 速率限制/.test(line)).join('\n')+'\n'+text(raws,2).split('\n').filter(line=>/等待下个订阅月用量刷新|Token Plan 并发速率|Token Plan 额度耗尽后/.test(line)).join('\n')+'\n';
    default: throw new Error(`Unknown domestic provider: ${id}`);
  }
}
