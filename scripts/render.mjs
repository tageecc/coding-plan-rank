import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {REPO_URL,priceOf,money,comparableGroups,md,quotaText} from './model.mjs';

const dataset=JSON.parse(await readFile('data/plans.json','utf8'));
import {cnyMoney} from './exchange-rate.mjs';

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
  if(q.amount==null){
    const period=lang==='zh'?{'5h':'5小时',week:'周',day:'日',month:'月',dynamic:'动态'}:{'5h':'5h',week:'Weekly',day:'Daily',month:'Monthly',dynamic:'Dynamic'};
    return lang==='zh'?`${period[q.window]??''}·未公开`:`${period[q.window]??''} · N/A`;
  }
  const number=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);
  const compact=n=>n>=1e8?(lang==='zh'?`${number(n/1e8)}亿`:`${number(n/1e9)}B`):number(n);
  const amount=q.max==null?compact(q.amount):`${compact(q.amount)}–${compact(q.max)}`;
  const period=lang==='zh'?{week:'周',month:'月',day:'天','5h':'5小时',dynamic:'动态'}:{week:'wk',month:'mo',day:'day','5h':'5h',dynamic:'dynamic'};
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
    `<thead><tr>${(zh?['工具 / 套餐','月费（元）','额度','额度效率']:['Tool / plan','CNY / month','Allowance','Quota value']).map((title,i)=>`<th width="1000" nowrap${i===1||i===3?' align="right"':''}>${title}</th>`).join('')}</tr></thead>`,
    '<tbody>',
  ];
  for(const p of [...providers].sort((a,b)=>a.product.localeCompare(b.product,'en'))) {
    const plans=[...p.plans].sort((a,b)=>priceOf(a)-priceOf(b)||a.name.localeCompare(b.name));
    if(!plans.length)plans.push({id:'unverified',name:zh?'待核验':'Unverified',monthlyUsd:null,quota:{amount:null}});
    plans.forEach(plan=> {
      const tool=zh&&domesticNames[p.id]?domesticNames[p.id]:zh&&p.id==='minimax'?'MiniMax 国际':zh&&p.id==='minimax-cn'?'MiniMax 中国':toolNames[p.id]??p.product;
      let name=p.id==='antigravity'?plan.name.replace(/^Google AI /,''):p.id==='codex'?plan.name.replace(/ \$\d+$/,''):zh&&plan.name==='Free'?'免费':plan.name;
      if(zh && name==='Free')name='免费';
      if(zh && p.id==='copilot' && plan.id==='student')name='学生';
      const access=p.id==='codex' && ['free','go'].includes(plan.id)?(zh?'（桌面）':' (desktop)'):p.id==='copilot' && plan.id==='student'?(zh?'（需认证）':''):'';
      const label=`${html(tool)} · ${html(name)}${access}${p.status==='ok'?'':zh?'（待核验）':' (unverified)'}`;
      const value=values.get(`${p.id}:${plan.id}`);
      let ratio=value?`${value.ratio.toFixed(2)}×`:'—';
      if(value?.best)ratio=`<strong>${ratio}</strong>`;
      lines.push(`<tr><td nowrap>${label}</td><td nowrap align="right">${html(cnyMoney(plan,dataset.exchangeRate))}</td><td nowrap title="${html(plan.note?.[lang])}">${html(allowance(p,plan,lang))}</td><td nowrap align="right">${ratio}</td></tr>`);
    });
  }
  lines.push('</tbody>','</table>','',
    zh?`人民币参考月费；1 美元 ≈ ${dataset.exchangeRate?.rate?.toFixed(4)??'待核验'} 元（${dataset.exchangeRate?.rateDate??'未核验'}）。额度效率仅限同工具比较，粗体最优。`:`Monthly reference prices in CNY; USD 1 ≈ CNY ${dataset.exchangeRate?.rate?.toFixed(4)??'unverified'} (${dataset.exchangeRate?.rateDate??'unverified'}). Quota value compares tiers within one tool; bold = best.`,
    '',
    zh?'Codex 免费/Go 限桌面灰度，不含 Cloud；Plus 为 GPT-6.1 Sol 消息预估。悬停额度查看限制。':'Codex Free/Go: desktop rollout, no Cloud. Plus: GPT-6.1 Sol estimates at Standard speed. Hover over allowances for restrictions.',
    '',
    `[中文](README.md) · [English](README.en.md) · [${zh?'比较规则':'Methodology'}](docs/methodology.md) · [${zh?'纠错':'Corrections'}](${REPO_URL}/issues/new?template=data-correction.yml)`,
    '',
  );
  return lines.join('\n');
}
const outputs=new Map([['README.md',render('zh')],['README.en.md',render('en')]]);
const historyLines=['# 更新记录 / Changes','','[返回排行 / Back](../README.md)','','只记录已核验的事实变化；例行核验日期和汇率不计入。完整历史见 [Git 提交记录](https://github.com/tageecc/coding-plan-rank/commits/main/)。 / Verified factual changes only; routine checks and exchange-rate changes are excluded.',''];
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
