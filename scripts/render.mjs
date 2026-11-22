import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {REPO_URL,priceOf,money,md,quotaText} from './model.mjs';

const dataset=JSON.parse(await readFile('data/plans.json','utf8'));
import {cnyMoney} from './exchange-rate.mjs';

const providers=dataset.providers;
const html=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const toolNames={
  zh:{'aliyun-cn':'阿里云','volc-cn':'火山方舟','glm-cn':'智谱 中国',glm:'智谱 国际','kimi-cn':'Kimi 中国',kimi:'Kimi 国际','mimo-cn':'小米 MiMo','tencent-hy':'腾讯混元','tencent-cn':'腾讯通用',copilot:'Copilot',devin:'Devin',antigravity:'Antigravity',minimax:'MiniMax 国际','minimax-cn':'MiniMax 中国'},
  en:{'glm-cn':'GLM China',glm:'GLM Global','kimi-cn':'Kimi China',kimi:'Kimi Global','mimo-cn':'MiMo','tencent-cn':'Tencent',copilot:'Copilot',devin:'Devin',antigravity:'Antigravity',minimax:'MiniMax Global','minimax-cn':'MiniMax China'},
};
const toolName=(provider,lang)=>toolNames[lang][provider.id]??provider.product;
const day=value=>value?new Intl.DateTimeFormat('en-CA',{
  timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',
}).format(new Date(value)):'—';
const timestamp=value=>value?`${day(value)} ${new Intl.DateTimeFormat('en-GB',{
  timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23',
}).format(new Date(value))}`:'—';
function allowance(provider,plan,lang,q=plan.quota) {
  if(q.amount==null)return plan.usageSummary?.[lang]??(lang==='zh'?'未公开':'Undisclosed');
  const number=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:20}).format(n);
  const compact=n=>{
    const scales=lang==='zh'?[[1e8,'亿'],[1e4,'万']]:[[1e9,'B'],[1e6,'M'],[1e3,'k']];
    const scale=scales.find(([size])=>n>=size && Number.isInteger(n*100/size));
    return scale?`${number(n/scale[0])}${scale[1]}`:number(n);
  };
  const amount=q.max==null?compact(q.amount):`${compact(q.amount)}${lang==='zh'?'–':'-'}${compact(q.max)}`;
  if(q.unit==='relative') {
    const base=provider.plans.find(p=>p.quota.group===(q.group??plan.quota.group) && p.quota.amount===1);
    return `${amount}×${base?.name??(lang==='zh'?'基础档':'base')}`;
  }
  const unit=lang==='zh'?{credits:'积分',messages:'条',requests:'次'}:{credits:'cr',messages:'msg',requests:'req'};
  return `${q.max==null?'':lang==='zh'?'约':'~'}${amount}${provider.id==='volc-cn'?'AFP':unit[q.unit]??q.unit}`;
}

function usageDisplay(provider,plan,lang) {
  const zh=lang==='zh';
  const caps=[{...plan.quota,status:'limited'},...(plan.caps??[])];
  const hour=caps.find(q=>q.window==='5h');
  const status=!hour?'❓':hour.status==='none'?`❌${hour.condition?(zh?hour.condition.zh:'w/ID'):''}`:hour.status==='possible'?'❓':'✅';
  const statusTitle=!hour?(zh?'官方未说明是否有5小时限制':'Official docs do not state whether a five-hour cap applies')
    :hour.status==='none'?(zh?`${hour.condition?.zh??''}无5小时限制`:`No five-hour cap${hour.condition?' after verification':''}`)
    :hour.status==='possible'?(zh?'可能有5小时限制':'A five-hour cap may apply')
    :zh?'有5小时限制':'Five-hour cap applies';
  const periods=zh?{'5h':'5小时',week:'每周',month:'每月',day:'每天'}:{'5h':'5h',week:'Weekly',month:'Monthly',day:'Daily'};
  const rows=['5h','day','week','month'].flatMap(window=>caps.filter(q=>q.window===window&&q.status!=='none'&&(window!=='5h'||q.amount!==null))).map(q=>{
    const summary=q===caps[0]?plan.usageSummary?.[lang]:null;
    const amount=q.status==='possible'?(zh?'可能另限':'May apply')
      :q.amount!==null?allowance(provider,plan,lang,q)
      :summary?summary.replace('More than 100','>100').replace('Most; Ultrafast','Most').replace('最高；含超高速','最高').replace('Undisclosed','Not stated').replace('未公开','未公布')
      :zh?'未公布':'Not stated';
    return `${periods[q.window]} ${amount}`;
  });
  return {status,statusTitle,rows:rows.length?rows:[zh?'额度未公布':'Not stated']};
}

function render(lang) {
  const zh=lang==='zh';
  const lines=[
    `<a id="plans"></a>${zh?`更新时间：${timestamp(dataset.updatedAt)}（北京时间）`:`Updated: ${timestamp(dataset.updatedAt)} (UTC+8)`}`,
    '',
    '<table width="100%">',
    // GitHub's width:max-content ignores table width="100%". Preferred cell widths
    // fill the available space while allowing the columns to shrink on desktop.
    `<thead><tr>${(zh?['工具','套餐','月费/元','5小时限制','用量']:['Tool','Plan','CNY/mo','5h cap','Allowance']).map((title,i)=>`<th width="1000" nowrap${i===2?' align="right"':''}>${title}</th>`).join('')}</tr></thead>`,
    '<tbody>',
  ];
  for(const p of [...providers].sort((a,b)=>toolName(a,'en').localeCompare(toolName(b,'en'),'en'))) {
    const plans=[...p.plans].sort((a,b)=>priceOf(a)-priceOf(b)||a.name.localeCompare(b.name));
    if(!plans.length)plans.push({id:'unverified',name:zh?'待核验':'Unverified',monthlyUsd:null,quota:{amount:null}});
    const entries=plans.map(plan=>({plan,usage:usageDisplay(p,plan,lang)}));
    const groupRows=entries.reduce((sum,{usage})=>sum+usage.rows.length,0);
    entries.forEach(({plan,usage},index)=> {
      const tool=toolName(p,lang);
      const displayTool=zh?tool:tool.replace(/ (China|Global)$/,'\u2009$1');
      let name=p.id==='antigravity'?plan.name.replace(/^Google AI /,''):zh&&plan.name==='Free'?'免费':plan.name;
      if(zh && p.id==='copilot' && plan.id==='student')name='学生';
      const access=p.id==='codex' && ['free','go'].includes(plan.id)?(zh?'·桌面':'·PC'):p.id==='copilot' && plan.id==='student'?(zh?'·认证':''):'';
      const label=`${html(name)}${access}`;
      const verification=html(`${p.product}${p.status==='ok'?'':zh?'；本次核验失败，保留上次数据':'; Verification failed; showing last verified data'}`);
      const brand=index===0?`<td rowspan="${groupRows}" nowrap valign="middle" title="${verification}">${html(displayTool)}${p.status==='ok'?'':' ⚠'}</td>`:'';
      const note=html(plan.note?.[lang]);
      const span=usage.rows.length;
      const price=html(cnyMoney(plan,dataset.exchangeRate).replace(/元$/,'').replace(/^≈/,'').replaceAll(',',''));
      const fixed=`${brand}<td rowspan="${span}" nowrap valign="middle" title="${note}">${label}</td><td rowspan="${span}" nowrap valign="middle" align="right">${price}</td><td rowspan="${span}" nowrap valign="middle" align="center" title="${html(usage.statusTitle)}; ${note}">${html(usage.status)}</td>`;
      usage.rows.forEach((row,i)=>lines.push(`<tr>${i===0?fixed:''}<td nowrap title="${note}">${html(row)}</td></tr>`));
    });
  }
  lines.push('</tbody>','</table>','',
    zh?`汇率：1 美元 ≈ ${dataset.exchangeRate?.rate?.toFixed(4)??'待核验'} 元（${dataset.exchangeRate?.rateDate??'未核验'}）`:`USD 1 ≈ CNY ${dataset.exchangeRate?.rate?.toFixed(4)??'unverified'} (${dataset.exchangeRate?.rateDate??'unverified'})`,
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
        if(JSON.stringify(old.caps??[])!==JSON.stringify(plan.caps??[]))details.push('周期限额更新 / Window caps updated');
        if(old.name!==plan.name)details.push(`${old.name} → ${plan.name}`);
        if(JSON.stringify(old.usageSummary)!==JSON.stringify(plan.usageSummary))details.push('用量说明更新 / Usage summary updated');
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
