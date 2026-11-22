import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {REPO_URL,priceOf,currencyOf,money,comparableGroups,rankedVotes,md,quotaText} from './model.mjs';
const dataset=JSON.parse(await readFile('data/plans.json','utf8'));
let voting;
try {voting=JSON.parse(await readFile('data/votes.json','utf8'));} catch {voting={providers:{}};}
const day = value => value ? new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)) : '—';
const providers=dataset.providers;
const summaryQuota=(q,lang)=>q?.amount==null?(lang==='zh'?'未公开定量':'Undisclosed'):`${q.max==null?'':(lang==='zh'?'约 ':'Est. ')}${quotaText(q,lang)}`;
const groupLink=p=>`[${md(p.product)}](#${p.id})`;
const warnings=providers.filter(p=>p.status!=='ok');
function render(lang) {
  const zh=lang==='zh';
  const lines=[zh?'# AI 编程 Agent 套餐排行':'# AI Coding Agent Plan Rankings','',zh?'每天核对官方价格与额度，分开看月费、性价比和社区票选。':'Official prices and quotas, checked daily. Separate rankings for price, quota value and community preference.','',zh?'Claude Code · Codex · Cursor · Copilot · Antigravity · GLM · MiniMax · Kimi':'Compare Claude Code, Codex, Cursor, GitHub Copilot, Google Antigravity, GLM, MiniMax and Kimi.','',`[中文](README.md) · [English](README.en.md) · [${zh?'比较规则':'Methodology'}](docs/methodology.md) · [${zh?'更新记录':'Changes'}](docs/changes.md) · [${zh?'数据':'Data'}](data/plans.json)`,'',zh?`每日 09:23（北京时间）尝试更新；上次运行：**${day(dataset.updatedAt)}**。各厂商核验日期见详情。`:`Refresh scheduled daily at 01:23 UTC; last run: **${day(dataset.updatedAt)}** (Asia/Shanghai). Each provider has its own verification date.`,'',zh?'只列个人套餐的标准月付价格；美元与人民币分开，不混入首月优惠、年付折算或实测推算额度。':'Individual plans at standard monthly prices. USD and CNY stay separate. No first-month deals, annualized rates or inferred quotas.',''];
  if(warnings.length)lines.push(zh?`> 待核验：${warnings.map(p=>p.product).join('、')}。暂不参与价格和性价比排行；已有旧值会标注原核验日期。`:`> Needs verification: ${warnings.map(p=>p.product).join(', ')}. Excluded from price and value rankings; historical values retain their original verification date.`,'');
  lines.push(zh?'## 入门月费':'## Starting monthly price','',zh?'按各工具已核验的最低付费档排序；免费档见套餐详情。':'Sorted by each tool’s cheapest verified paid tier; free tiers appear in plan details.','');
  for(const currency of ['USD','CNY']) {
    const rows=providers.filter(p=>p.status==='ok').map(provider=>({provider,plan:provider.plans.filter(p=>currencyOf(p)===currency && priceOf(p)>0).sort((a,b)=>priceOf(a)-priceOf(b))[0]})).filter(r=>r.plan).sort((a,b)=>priceOf(a.plan)-priceOf(b.plan)||a.provider.product.localeCompare(b.provider.product));
    if(!rows.length)continue;
    lines.push(`### ${currency==='USD'?(zh?'美元 · USD':'USD'):(zh?'人民币 · CNY':'CNY')}`,'',zh?'| 工具 | 月费起 | 套餐 |':'| Tool | From / mo | Plans |','| :-- | --: | :-- |');
    for(const {provider,plan} of rows)lines.push(`| ${md(provider.product)} | ${money(plan)} | [${md(plan.name)}](#${provider.id}) |`);
    lines.push('');
  }
  lines.push(zh?'## 性价比':'## Quota value','',zh?'只比较同厂商、同单位、同周期、同币种的套餐。以该组最低价档为 1×，按「公开额度 ÷ 月费」计算。没有可比额度的工具不硬排。':'Compare only within a provider, quota unit, reset window and currency. The cheapest tier is 1×; efficiency is published quota divided by monthly price. Unknown allowances stay unranked.','',zh?'| 工具 | 最划算的档位 | 相对性价比 |':'| Tool | Best quota value | Relative value |','| :-- | :-- | --: |');
  const groups=comparableGroups(providers);
  for(const g of groups)lines.push(`| ${groupLink(g.provider,lang)} | ${g.winners.length===g.ranked.length?(zh?'各档相同':'All tiers tie'):g.winners.map(x=>md(x.plan.name)).join(' / ')} | ${g.ratio.toFixed(2)}× |`);
  if(!groups.length)lines.push(`| — | ${zh?'暂无可比数据':'No comparable data yet'} | — |`);
  lines.push('',zh?'行与行之间不比较；倍率不代表模型能力。额度共享、其他限额与额外收费见厂商详情。':'Do not compare ratios across rows. Ratios do not measure model quality. See provider details for shared pools, additional caps and extra charges.','',zh?'## 社区票选':'## Community votes','',zh?'点工具名进入投票帖，给**正文**点 👍。每人对同一工具计一票，可以支持多个工具；撤回即减票。每日同步，只统计真人账号的正文 +1。':'Open a tool’s issue and react to the **issue body** with 👍. One vote per human account per tool; multiple tools allowed. Removing the reaction removes the vote on the next daily sync.','',zh?'| 排名 | 工具 / 去投票 | 票数 |':'| Rank | Tool / vote | Votes |','| --: | :-- | --: |');
  for(const r of rankedVotes(providers,voting)) {
    const v=r.vote;
    lines.push(`| ${r.rank??'—'} | ${v?.url?`[${md(r.provider.product)}](${v.url})`:md(r.provider.product)} | ${v?.status==='ok'?v.count:(zh?'待同步':'Pending')} |`);
  }
  const noVotes=!Object.values(voting.providers??{}).some(v=>v.status==='ok' && v.count>0);
  lines.push('',noVotes?(zh?'尚无有效投票，暂不产生名次。':'No valid votes yet; no winners are assigned.'):(zh?'同票并列；这是社区偏好，不是性能测试，也不参与上面的性价比计算。':'Equal votes share a rank. This measures community preference, not benchmark performance or quota value.'),zh?`票数上次同步：${day(voting.updatedAt)}。机器人账号、评论点赞和其他表情不计票；公开投票不能完全防刷。`:`Last vote sync: ${day(voting.updatedAt)}. Bot accounts, comment reactions and other emoji do not count. Public voting cannot fully prevent manipulation.`,'',zh?'## 套餐详情':'## Plan details','',zh?'展开一个工具即可查看；每张表最多三列。额度单位沿用官方定义。':'Expand one tool at a time. Each table has three columns; quota units retain their official meaning.','');
  for(const p of providers) {
    lines.push(`<a id="${p.id}"></a>`,`<details>`,`<summary><strong>${md(p.product)}</strong></summary>`,'',zh?`核验：${day(p.checkedAt)} · ${p.status==='ok'?'已核验':p.checkedAt?'待核验，以下为历史数据':'尚无已核验数据'}`:`Verified: ${day(p.checkedAt)} · ${p.status==='ok'?'Verified':p.checkedAt?'Needs review; historical data below':'No verified data yet'}`,'',zh?'| 套餐 | 月费 | 额度 |':'| Plan | / month | Allowance |','| :-- | --: | :-- |');
    for(const plan of p.plans)lines.push(`| ${md(plan.name)} | ${money(plan)} | ${md(summaryQuota(plan.quota,lang))} |`);
    const firstPaid=p.plans.find(plan=>priceOf(plan)>0);
    if(firstPaid)lines.push('',`**${md(firstPaid.name)}${zh?'：':':'}** ${md(firstPaid.note[lang])}`);
    lines.push('',`[${zh?'官方来源':'Official source'}](${p.sources[0].url}) · [${zh?'限额与收费说明':'Limits & billing notes'}](docs/providers/${p.id}.md)`,'','</details>','');
  }
  lines.push(zh?'## 更新与纠错':'## Updates & corrections','',zh?'GitHub Actions 每天抓取官方资料、验证价格和额度、统计投票，再生成本文。解析失败会标记待核验并保留旧值；数据变化可在提交记录中追溯。':'GitHub Actions fetches official sources, validates prices and quotas, counts votes, then generates these documents daily. Failed parsing keeps prior values marked for review. Changes are traceable in Git history.','',`[${zh?'提交纠错':'Report an error'}](${REPO_URL}/issues/new?template=data-correction.yml) · [${zh?'自动更新状态':'Automation status'}](${REPO_URL}/actions/workflows/update.yml) · [${zh?'如何贡献':'Contribute'}](CONTRIBUTING.md)`,'',zh?'结构参考 [awesome-coding-plan](https://github.com/mahonzhan/awesome-coding-plan) 的比较需求；本项目独立核对官方资料，不复用其测试结果。代码与原创整理采用 [MIT](LICENSE)。':'Inspired by the comparison use case in [awesome-coding-plan](https://github.com/mahonzhan/awesome-coding-plan). Official data is independently verified; its benchmark measurements are not reused. Code and original compilation: [MIT](LICENSE).','');
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
for(const p of providers) {
  if(!/^[a-z0-9-]+$/.test(p.id))throw new Error('Unsafe provider id');
  const l=[`# ${p.product}`,'','[返回排行 / Back](../../README.md)','',`${p.description?.zh??''}`,`${p.description?.en??''}`,'',`最近成功核验 / Last verified: **${p.checkedAt??'—'}**`,'',`状态 / Status: **${p.status}**`,''];
  if(p.status!=='ok')l.push(p.checkedAt?'> 当前官方资料未能成功解析；以下为最近成功数据，不参加价格与性价比排行。 / Current source could not be verified. Historical values are excluded from price and value rankings.':'> 尚无已核验数据，不参与排行。 / No verified data yet; excluded from rankings.','');
  for(const plan of p.plans) {
    l.push(`## ${plan.name}`,'',`**${money(plan)} / 月 (month)** · ${quotaText(plan.quota,'zh')} · ${quotaText(plan.quota,'en')}`,'',plan.note?.zh??'',plan.note?.en??'','');
  }
  const groups=comparableGroups([p]);
  if(groups.length) {
    l.push('## 同组性价比 / Within-group quota value','','以最低价档为 1×，只比较同组；不衡量模型质量。 / Cheapest tier = 1×; this is quota efficiency, not model quality.','');
    for(const g of groups) {
      l.push(`基础档 / Baseline: ${g.baseline.name} · ${quotaText(g.baseline.quota)}`,'','| 套餐 / Plan | 相对性价比 / Relative value |','| :-- | --: |');
      for(const r of g.ranked)l.push(`| ${md(r.plan.name)} | ${r.ratio.toFixed(2)}× |`);
      l.push('');
    }
  }
  l.push('## 官方来源 / Official sources','');
  for(const s of p.sources)l.push(`- [${md(s.title)}](${s.url})`);
  l.push('',`${p.sourceHash?`[核验摘录 / Evidence](../../data/evidence/${p.id}.txt) · `:''}[机器可读数据 / JSON](../../data/plans.json)`,'','价格为标准月付，不含可能的税费。地区、账户资格、模型与任务会影响实际可用量。 / Standard monthly prices; applicable taxes excluded. Region, account eligibility, model and task affect actual usage.','');
  outputs.set(`docs/providers/${p.id}.md`,l.join('\n'));
}
let failed=false;
for(const [path,content] of outputs) {
  if(process.argv.includes('--check')) {
    let current='';try{current=await readFile(path,'utf8');}catch{}
    if(current!==content){console.error(`Out of date: ${path}`);failed=true;}
  } else {await mkdir(dirname(path),{recursive:true});await writeFile(path,content);}
}
if(failed)process.exitCode=1;
console.log(`${process.argv.includes('--check')?'Checked':'Generated'} ${outputs.size} Markdown files.`);
