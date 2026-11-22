export const REPO = process.env.GITHUB_REPOSITORY ?? 'tageecc/coding-plan-rank';
export const REPO_URL = `https://github.com/${REPO}`;
export const priceOf = p => p.currency === 'CNY' ? p.monthlyPrice : p.monthlyUsd;
export const currencyOf = p => p.currency ?? 'USD';
export const money = p => {
  const n = priceOf(p);
  return typeof n === 'number' ? `${currencyOf(p) === 'CNY' ? '¥' : '$'}${Number(n.toFixed(2))}` : '—';
};
export function comparableGroups(providers) {
  const groups = [];
  for (const provider of providers) {
    if (provider.status !== 'ok') continue;
    const map = new Map();
    for (const p of provider.plans) {
      const q = p.quota;
      if (!q?.group || !Number.isFinite(q.amount) || q.amount <= 0 || !(priceOf(p) > 0) || q.max != null || q.unit === 'unknown') continue;
      const key = JSON.stringify([q.group, q.unit, q.window, currencyOf(p)]);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    for (const plans of map.values()) {
      if (plans.length < 2) continue;
      const baseline = [...plans].sort((a,b) => priceOf(a)-priceOf(b))[0];
      const baseValue = baseline.quota.amount / priceOf(baseline);
      const ranked = plans.map(plan => ({plan, ratio:(plan.quota.amount / priceOf(plan)) / baseValue})).sort((a,b)=>b.ratio-a.ratio || priceOf(a.plan)-priceOf(b.plan));
      const top = ranked[0].ratio;
      const winners = ranked.filter(x=>Math.abs(x.ratio-top)<0.000001);
      groups.push({provider,baseline,ranked,winners,ratio:top});
    }
  }
  return groups;
}
export const md = value => String(value ?? '').replaceAll('|','\\|').replaceAll(/\r?\n/g,' ').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function quotaText(q, lang='zh') {
  if (!q || q.amount == null) return lang==='zh'?'动态额度；未公开定量':'Dynamic; quantity undisclosed';
  const n = new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(q.amount);
  const value = q.max == null ? n : `${n}–${new Intl.NumberFormat('en-US').format(q.max)}`;
  const units = {relative:lang==='zh'?'× 基础档':'× base',credits:' credits',messages:lang==='zh'?' 条消息':' messages',requests:lang==='zh'?' 次请求':' requests',unknown:''};
  const windows = lang==='zh'?{week:'周',month:'月','5h':'5 小时',day:'天',dynamic:'动态'}:{week:'week',month:'month','5h':'5h',day:'day',dynamic:'dynamic'};
  return `${value}${units[q.unit]??''} / ${windows[q.window]??q.window}`;
}
