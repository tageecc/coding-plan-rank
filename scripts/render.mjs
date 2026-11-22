import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {REPO_URL,priceOf,money,comparableGroups,rankedVotes,md,quotaText} from './model.mjs';

const dataset=JSON.parse(await readFile('data/plans.json','utf8'));
let voting;
try {voting=JSON.parse(await readFile('data/votes.json','utf8'));}
catch {voting={providers:{}};}
const providers=dataset.providers;
const day=value=>value?new Intl.DateTimeFormat('en-CA',{
  timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',
}).format(new Date(value)):'—';
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
  if(q.unit==='relative') {
    const base=provider.plans.find(p=>p.quota.group===q.group && p.quota.amount===1);
    const period={week:lang==='zh'?'周':'week',month:lang==='zh'?'月':'month'};
    return `${q.amount}× ${base?.name??(lang==='zh'?'基础档':'base')} / ${period[q.window]??q.window}`;
  }
  return `${q.max==null?'':lang==='zh'?'约 ':'Est. '}${quotaText(q,lang)}`;
}

function render(lang) {
  const zh=lang==='zh';
  const lines=[
    zh?'# AI 编程 Agent 套餐对比':'# AI Coding Agent Plan Comparison',
    '',
    zh?'价格、额度、性价比，一张表看完。每日核对官方资料。':'Prices, quotas and value in one table. Official sources checked daily.',
    '',
    `[中文](README.md) · [English](README.en.md)`,
    '',
    zh?`更新：**${day(dataset.updatedAt)}** · 每日北京时间 **09:23** 自动检查。`:`Updated **${day(dataset.updatedAt)}** · Daily checks at **01:23 UTC**.`,
    '',
    zh?'**怎么读：** 工具按票数排序，同工具内按月费排列。$ 为美元，¥ 为人民币；均为常规月付，不含税费、首月优惠或年付折算。':'**How to read:** Tools are ordered by votes, then plans by monthly price. $ = USD; ¥ = CNY. Standard monthly rates exclude taxes, introductory offers and annual discounts.',
    '',
    zh?'**性价比：** 同工具最低价的可比付费档为 1×；数字越高，每元买到的公开额度越多。只在同工具内比较，— 表示无法计算，粗体为同组最优。':'**Value:** Cheapest comparable paid tier = 1×; higher buys more published quota per dollar. Compare within a tool only. — means not comparable; bold marks the best tier in its group.',
    '',
    zh?'**支持：** 票数按工具统计，各档共用；点击 👍 直达投票正文，再点原生 👍。GitHub Markdown 无法在本文内直接提交投票。':'**Support:** Votes are per tool, shared across its tiers. Click 👍 to reach the vote body, then use GitHub’s native 👍 reaction. GitHub Markdown cannot submit votes inside this file.',
    '',
    '<a id="plans"></a>',
    '',
    zh?'| 工具 / 套餐 | 月费 | 额度 | 性价比 | 支持 |':'| Tool / plan | / month | Allowance | Value | Support |',
    '| :-- | --: | :-- | --: | :-- |',
  ];
  for(const {provider:p,vote:v} of rankedVotes(providers,voting)) {
    const plans=[...p.plans].sort((a,b)=>priceOf(a)-priceOf(b)||a.name.localeCompare(b.name));
    if(!plans.length)plans.push({id:'unverified',name:zh?'待核验':'Unverified',monthlyUsd:null,quota:{amount:null}});
    plans.forEach((plan,index)=> {
      const label=`${md(p.product)}<br>${md(plan.name)}${index===0?`[^${p.id}]`:''}${p.status==='ok'?'':zh?'（待核验）':' (unverified)'}`;
      const value=values.get(`${p.id}:${plan.id}`);
      let ratio=value?`${value.ratio.toFixed(2)}×`:'—';
      if(value?.best)ratio=`**${ratio}**`;
      const count=v?.status==='ok'?v.count:(zh?'待同步':'pending');
      const support=index===0?(v?.url?`[👍 ${count}](${v.url}#issue-body-viewer)`:String(count)):'';
      lines.push(`| ${label} | ${money(plan)} | ${md(allowance(p,plan,lang))} | ${ratio} | ${support} |`);
    });
  }
  lines.push('',
    zh?`票数同步：${day(voting.updatedAt)}。同票并列；零票时顺序不代表推荐。每账号对同一工具计一票，可支持多个工具，撤回即减票。`:`Votes checked ${day(voting.updatedAt)}. Ties share a rank; zero-vote order is not a recommendation. One vote per account per tool; multiple tools allowed. Removing a reaction removes the vote.`,
    '',
    zh?'**来源与必要说明**（都在本页；工具名链接到官方资料）：':'**Sources and essential notes** (all below; tool names link to official sources):',
    '',
  );
  for(const p of providers) {
    const grouped=new Map();
    for(const plan of p.plans) {
      const note=plan.note[lang];
      if(!grouped.has(note))grouped.set(note,[]);
      grouped.get(note).push(plan.name);
    }
    const notes=[...grouped].map(([note,names])=>`${names.length===p.plans.length?'':`**${md(names.join(' / '))}:** `}${md(note)}`).join(' ');
    const sources=p.sources.map((s,i)=>`[${i===0?md(p.product):zh?'补充来源':'Usage rules'}](${s.url})`).join(' · ');
    const status=p.status==='ok'?'':p.checkedAt?(zh?' **待核验；以下为历史值。**':' **Unverified; historical values.**'):(zh?' **尚无已核验数据。**':' **No verified data yet.**');
    lines.push(`[^${p.id}]: ${sources} · ${zh?'核验':'Verified'} ${day(p.checkedAt)}.${status} ${notes}`,'');
  }
  lines.push(
    zh?'每日机器人抓取官方资料、验证并更新本文。解析失败保留原核验日期并标记待核验，不参与性价比计算；积分、请求和各工具的倍数不互相换算。':'The daily bot verifies official sources and updates this file. Failed verification preserves the original date and marks historical values unverified; they are excluded from value calculations. Credits, requests and tool-specific multiples are not interchangeable.',
    '',
    `[${zh?'纠错':'Corrections'}](${REPO_URL}/issues/new?template=data-correction.yml) · [${zh?'更新状态':'Automation'}](${REPO_URL}/actions/workflows/update.yml) · [MIT](LICENSE)`,
    '',
    zh?'比较需求参考 [awesome-coding-plan](https://github.com/mahonzhan/awesome-coding-plan)，数据独立核实，不复用其实测推算。':'Inspired by [awesome-coding-plan](https://github.com/mahonzhan/awesome-coding-plan); data is independently verified, without reusing its inferred benchmark measurements.',
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
