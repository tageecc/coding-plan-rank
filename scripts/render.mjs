import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {REPO_URL,priceOf,money,comparableGroups,rankedVotes,md,quotaText} from './model.mjs';

const dataset=JSON.parse(await readFile('data/plans.json','utf8'));
let voting;
try {voting=JSON.parse(await readFile('data/votes.json','utf8'));}
catch {voting={providers:{}};}
const providers=dataset.providers;
const html=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const domesticNames={'aliyun-cn':'阿里云','volc-cn':'火山方舟','glm-cn':'智谱','kimi-cn':'Kimi 国内','mimo-cn':'小米 MiMo','tencent-hy':'腾讯混元','tencent-cn':'腾讯通用'};
const toolNames={'tencent-cn':'Tencent',copilot:'Copilot',antigravity:'Antigravity',glm:'GLM',kimi:'Kimi',minimax:'MiniMax intl','minimax-cn':'MiniMax CN'};
const day=value=>value?new Intl.DateTimeFormat('en-CA',{
  timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',
}).format(new Date(value)):'—';
const timestamp=value=>value?`${day(value)} ${new Intl.DateTimeFormat('en-GB',{
  timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23',
}).format(new Date(value))}`:'—';
const values=new Map();
for(const group of comparableGroups(providers)) {
  for(const row of group.ranked) {
    values.set(`${group.provider.id}:${row.plan.id}`,{
      ratio:row.ratio,
      best:group.winners.length<group.ranked.length && group.winners.includes(row),
    });
  }
}

function allowance(provider,plan,lang) {
  const q=plan.quota;
  if(q.amount==null)return lang==='zh'?'未公开':'Undisclosed';
  const number=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);
  const compact=n=>n>=1e8?(lang==='zh'?`${number(n/1e8)}亿`:`${number(n/1e9)}B`):number(n);
  const amount=q.max==null?compact(q.amount):`${compact(q.amount)}–${compact(q.max)}`;
  const period=lang==='zh'?{week:'周',month:'月',day:'天','5h':'5h',dynamic:'动态'}:{week:'wk',month:'mo',day:'day','5h':'5h',dynamic:'dynamic'};
  const window=period[q.window]??q.window;
  if(q.unit==='relative') {
    const base=provider.plans.find(p=>p.quota.group===q.group && p.quota.amount===1);
    return `${amount}× ${base?.name??(lang==='zh'?'基础档':'base')}/${window}`;
  }
  const unit=lang==='zh'?{credits:'积分',messages:'条',requests:'次'}:{credits:'cr',messages:'msg',requests:'req'};
  return `${q.max==null?'':lang==='zh'?'约':'~'}${amount}${unit[q.unit]??q.unit}/${window}`;
}

function render(lang) {
  const zh=lang==='zh';
  const lines=[
    `<a id="plans"></a>${zh?`更新时间：${timestamp(dataset.updatedAt)}（北京时间）`:`Updated: ${timestamp(dataset.updatedAt)} (UTC+8)`}`,
    '',
    '<table width="100%">',
    // GitHub's width:max-content ignores table width="100%". Preferred cell widths
    // fill the available space while allowing the columns to shrink on desktop.
    `<thead><tr>${(zh?['工具 / 套餐','月费','额度','性价比','支持']:['Tool / plan','/ month','Allowance','Value','Support']).map((title,i)=>`<th width="1000" nowrap${i===1||i===3?' align="right"':''}>${title}</th>`).join('')}</tr></thead>`,
    '<tbody>',
  ];
  for(const {provider:p,vote:v} of rankedVotes(providers,voting)) {
    const plans=[...p.plans].sort((a,b)=>priceOf(a)-priceOf(b)||a.name.localeCompare(b.name));
    if(!plans.length)plans.push({id:'unverified',name:zh?'待核验':'Unverified',monthlyUsd:null,quota:{amount:null}});
    plans.forEach((plan,index)=> {
      const tool=zh&&domesticNames[p.id]?domesticNames[p.id]:zh&&p.id==='minimax'?'MiniMax 国际':zh&&p.id==='minimax-cn'?'MiniMax 中国':toolNames[p.id]??p.product;
      const name=p.id==='antigravity'?plan.name.replace(/^Google AI /,''):p.id==='codex'?plan.name.replace(/ \$\d+$/,''):plan.name;
      const label=`${html(tool)} · ${html(name)}${p.status==='ok'?'':zh?'（待核验）':' (unverified)'}`;
      const value=values.get(`${p.id}:${plan.id}`);
      let ratio=value?`${value.ratio.toFixed(2)}×`:'—';
      if(value?.best)ratio=`<strong>${ratio}</strong>`;
      const count=v?.status==='ok'?v.count:(zh?'待同步':'pending');
      const support=index===0?(v?.url?`<a href="${html(v.url)}#issue-body-viewer">👍 ${html(count)}</a>`:html(count)):'';
      lines.push(`<tr><td nowrap>${label}</td><td nowrap align="right">${html(money(plan))}</td><td nowrap>${html(allowance(p,plan,lang))}</td><td nowrap align="right">${ratio}</td><td nowrap>${support}</td></tr>`);
    });
  }
  lines.push('</tbody>','</table>','',
    zh?'月付原价；$ 美元，¥ 人民币。性价比仅比较同工具的额度/价格，粗体最优；— 表示不可比。':'Standard monthly prices; $ USD, ¥ CNY. Value compares allowance/price within one tool; bold = best, — = unavailable.',
    '',
    `[中文](README.md) · [English](README.en.md) · [${zh?'比较规则':'Methodology'}](docs/methodology.md) · [${zh?'纠错':'Corrections'}](${REPO_URL}/issues/new?template=data-correction.yml)`,
    '',
  );
  return lines.join('\n');
}
const outputs=new Map([['README.md',render('zh')],['README.en.md',render('en')]]);
const historyLines=['# 更新记录 / Changes','','[返回排行 / Back](../README.md)','','只记录已核验的事实变化；例行核验日期和票数不计入。完整历史见 [Git 提交记录](https://github.com/tageecc/coding-plan-rank/commits/main/)。 / Verified factual changes only; routine checks and vote changes are excluded.',''];
let histories=[];
try {histories=(await readdir('data/history')).filter(f=>f.endsWith('.json')).sort().reverse().slice(0,14);}catch(error){if(error.code!=='ENOENT')throw error;}
for(const filename of histories) {
  const snapshot=JSON.parse(await readFile(`data/history/${filename}`,'utf8'));
  historyLines.push(`## ${day(snapshot.changedAt)}`,'');
  for(const change of snapshot.changes) {
    const provider=providers.find(p=>p.id===change.id);
    const name=provider?.product??change.id;
    if(!change.before.length){historyLines.push(`- **${md(name)}**：首次收录 / First listed (${change.after.length} plans).`);continue;}
    for(const plan of change.after) {
      const old=change.before.find(p=>p.id===plan.id);
      const details=[];
      if(!old)details.push('新增 / New');
      else {
        if(money(old)!==money(plan))details.push(`${money(old)} → ${money(plan)}`);
        if(JSON.stringify(old.quota)!==JSON.stringify(plan.quota))details.push(`${quotaText(old.quota)} → ${quotaText(plan.quota)}`);
        if(JSON.stringify(old.note)!==JSON.stringify(plan.note))details.push('说明更新 / Notes updated');
      }
      if(details.length)historyLines.push(`- **${md(name)} · ${md(plan.name)}**：${md(details.join('; '))}`);
    }
  }
  historyLines.push('',`[核验快照 / Snapshot](../data/history/${filename})`,'');
}
if(!histories.length)historyLines.push('暂无事实变化。 / No factual changes yet.','');
outputs.set('docs/changes.md',historyLines.join('\n'));
let failed=false;
for(const [path,content] of outputs) {
  if(process.argv.includes('--check')) {
    let current='';try{current=await readFile(path,'utf8');}catch{}
    if(current!==content){console.error(`Out of date: ${path}`);failed=true;}
  } else {await mkdir(dirname(path),{recursive:true});await writeFile(path,content);}
}
if(failed)process.exitCode=1;
console.log(`${process.argv.includes('--check')?'Checked':'Generated'} ${outputs.size} Markdown files.`);
