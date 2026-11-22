export const REPO = process.env.GITHUB_REPOSITORY ?? 'tageecc/coding-plan-rank';
export const REPO_URL = `https://github.com/${REPO}`;
export const priceOf = p => p.currency === 'CNY' ? p.monthlyPrice : p.monthlyUsd;
export const currencyOf = p => p.currency ?? 'USD';
export const money = p => {
  const n = priceOf(p);
  return typeof n === 'number' ? `${currencyOf(p) === 'CNY' ? '¥' : '$'}${Number(n.toFixed(2))}` : '—';
};
export const md = value => String(value ?? '').replaceAll('|','\\|').replaceAll(/\r?\n/g,' ').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function quotaText(q, lang='zh') {
  if (!q || q.amount == null) return lang==='zh'?'动态额度；未公开定量':'Dynamic; quantity undisclosed';
  const n = new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(q.amount);
  const value = q.max == null ? n : `${n}–${new Intl.NumberFormat('en-US').format(q.max)}`;
  const units = {relative:lang==='zh'?'× 基础档':'× base',credits:' credits',messages:lang==='zh'?' 条消息':' messages',requests:lang==='zh'?' 次请求':' requests',unknown:''};
  const windows = lang==='zh'?{week:'周',month:'月','30d':'30天','5h':'5 小时',day:'天',dynamic:'动态'}:{week:'week',month:'month','30d':'30-day','5h':'5h',day:'day',dynamic:'dynamic'};
  return `${value}${units[q.unit]??''} / ${windows[q.window]??q.window}`;
}
