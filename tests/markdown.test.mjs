import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {parseHTML} from 'linkedom';
test('each README groups plans under merged tool cells in one single-line table',async()=>{
 const data=JSON.parse(await readFile('data/plans.json','utf8'));
 const expectedRows=data.providers.reduce((sum,p)=>sum+Math.max(p.plans.length,1),0);
 for(const file of ['README.md','README.en.md']) {
  const zh=file==='README.md';
  const body=await readFile(file,'utf8');
  const intro=body.split('<table')[0].replace(/<a id="plans"><\/a>/,'').trim();
  assert.match(intro,/^(更新时间：|Updated: )\d{4}-\d{2}-\d{2} \d{2}:\d{2}[^\n]*$/,`${file}: only the update timestamp above the table`);
  const footer=body.split('</table>')[1].trim().split(/\n\s*\n/);
  assert.equal(footer.length,2,`${file}: footer contains only exchange rate and navigation`);
  assert.match(footer[0],zh?/^汇率：1 美元 ≈ /:/^USD 1 ≈ CNY /);
  assert.match(footer[1],/^\[中文\]/);
  const {document}=parseHTML(body);
  const tables=document.querySelectorAll('table');
  assert.equal(tables.length,1,`${file}: only one table`);
  const table=tables[0];
  assert.ok(table.querySelectorAll('tbody tr').length>=expectedRows,`${file}: every plan must be visible`);
  assert.ok(!body.includes('<details>'),`${file}: no collapsed plans`);
  assert.equal(table.querySelectorAll('br').length,0,`${file}: no forced line breaks`);
  for(const cell of table.querySelectorAll('th,td'))assert.ok(cell.hasAttribute('nowrap'),`${file}: cells must not wrap`);
  assert.deepEqual([...table.querySelectorAll('thead th')].map(cell=>cell.textContent),zh?['工具','套餐','月费/元','5小时限制','用量']:['Tool','Plan','CNY/mo','5h cap','Allowance']);
  assert.ok(!/额度效率|Quota value|刷新/.test(body),`${file}: plain usage and reset wording`);
  let tool,toolRemaining=0,planRemaining=0,current;
  const toolCells=[];
  const rows=[];
  const physicalRows=[...table.querySelectorAll('tbody tr')];
  for(const row of physicalRows) {
   const cells=[...row.children];
   if(toolRemaining===0) {
    assert.equal(planRemaining,0,`${file}: plan stays within its tool`);
    tool=cells.shift();
    toolCells.push(tool);
    toolRemaining=Number(tool.getAttribute('rowspan'));
    assert.ok(Number.isInteger(toolRemaining)&&toolRemaining>0,`${file}: valid tool rowspan`);
    if(tool.textContent.endsWith(' ⚠'))assert.match(tool.getAttribute('title'),/本次核验失败|Verification failed/);
   }
   if(planRemaining===0) {
    assert.equal(cells.length,4,`${file}: each plan has price, status and allowance`);
    const [plan,price,status]=cells.splice(0,3);
    planRemaining=Number(plan.getAttribute('rowspan'));
    assert.ok(Number.isInteger(planRemaining)&&planRemaining>0,`${file}: valid plan rowspan`);
    for(const cell of [price,status])assert.equal(Number(cell.getAttribute('rowspan')),planRemaining,`${file}: plan fields span identical period rows`);
    current={tool:tool.textContent.replaceAll('\u2009',' ').replace(/ ⚠$/,''),plan:plan.textContent,price:price.textContent,status:status.textContent,statusTitle:status.getAttribute('title'),allowances:[],physicalRows:planRemaining};
    rows.push(current);
   }
   assert.equal(cells.length,1,`${file}: each physical row contains exactly one period's allowance`);
   current.allowances.push(cells[0].textContent);
   toolRemaining--;planRemaining--;
   assert.ok(toolRemaining>=0&&planRemaining>=0,`${file}: no rowspan overlaps`);
  }
  assert.equal(toolRemaining,0,`${file}: tool rowspan ends at final row`);
  assert.equal(planRemaining,0,`${file}: plan rowspan ends at final row`);
  assert.equal(rows.length,expectedRows,`${file}: every plan appears exactly once`);
  assert.equal(toolCells.length,data.providers.length,`${file}: each provider has one merged tool cell`);
  const labels=rows.map(row=>`${row.tool}·${row.plan}`);
  assert.equal(new Set(labels).size,labels.length,`${file}: no duplicate plans in a tool`);
  assert.ok(labels.every(label=>!/国内|\bCN\b|\bintl\b/.test(label)),`${file}: consistent region names`);
  for(const brand of zh?['Kimi','智谱','MiniMax']:['Kimi','GLM','MiniMax']) {
   const regions=zh?['中国','国际']:['China','Global'];
   const indices=rows.map((row,i)=>row.tool.startsWith(`${brand} `)?i:-1).filter(i=>i>=0);
   assert.ok(regions.every(region=>indices.some(i=>rows[i].tool===`${brand} ${region}`)),`${file}: both markets explicitly labeled for ${brand}`);
   assert.equal(indices.at(-1)-indices[0]+1,indices.length,`${file}: regional plans grouped by brand`);
  }
  for(const tool of new Set(rows.map(row=>row.tool))) {
   const count=rows.filter(row=>row.tool===tool).reduce((sum,row)=>sum+row.physicalRows,0);
   const cell=[...table.querySelectorAll('td[rowspan]')].find(cell=>cell.textContent.replaceAll('\u2009',' ').replace(/ ⚠$/,'')===tool);
   assert.equal(Number(cell.getAttribute('rowspan')),count,`${file}: ${tool} spans exactly its own plans`);
  }
  assert.deepEqual(rows.filter(row=>row.tool==='Claude Code').map(row=>row.plan),['Pro','Max','Ultra']);
  assert.deepEqual(rows.filter(row=>row.tool==='Codex'&&row.plan.startsWith('Pro ')).map(row=>row.plan),['Pro 100','Pro 200','Pro 500']);
  const rowFor=(tool,plan)=>rows.find(row=>row.tool===tool&&row.plan===plan);
  const volc=rowFor(zh?'火山方舟':'Volcengine','Small');
  assert.equal(volc.status,'✅');
  assert.deepEqual(volc.allowances,zh?['5小时 2,000AFP','每周 7,000AFP','每月 2万AFP']:['5h 2kAFP','Weekly 7kAFP','Monthly 20kAFP']);
  const plus=rowFor('Codex','Plus');
  assert.equal(plus.status,'✅');
  assert.match(plus.allowances[0],/15[–-]160/);
  assert.equal(plus.allowances[1],zh?'每周 未公布':'Weekly Not stated');
  assert.equal(rowFor('Codex','Pro 100').status,'❌');
  for(const tool of ['Cursor','Kiro',zh?'阿里云':'Aliyun',zh?'小米 MiMo':'MiMo',zh?'腾讯通用':'Tencent',zh?'腾讯混元':'Tencent Hy','Antigravity','Devin'])assert.ok(rows.filter(row=>row.tool===tool).filter(row=>tool!=='Antigravity'||[zh?'免费':'Free'].includes(row.plan)).every(row=>row.status==='❌'),`${file}: researched hourly policy for ${tool}`);
  assert.equal(rowFor('Codex','Go'+(zh?'·桌面':'·PC')).status,'❌');
  const free=rowFor('Codex',zh?'免费·桌面':'Free·PC');
  assert.equal(free.status,zh?'❌实测':'❌obs.');
  assert.deepEqual(free.allowances,zh?['30天 未公布']:['30-day Not stated']);
  assert.ok(rows.filter(row=>row.tool==='Copilot').every(row=>row.status===(zh?'动态':'Dynamic')));
  assert.equal(rowFor('Claude Code','Ultra').status,zh?'❌认证后':'❌w/ID');
  assert.match(rowFor('Claude Code','Ultra').statusTitle,/认证后无|after verification/);
  const glm=rowFor(zh?'智谱 国际':'GLM Global','Lite');
  assert.equal(glm.status,'✅');
  assert.deepEqual(glm.allowances,zh?['5小时 2,000积分','每周 1万积分']:['5h 2kcr','Weekly 10kcr']);
  const tencent=rowFor(zh?'腾讯通用':'Tencent','Max');
  assert.equal(tencent.allowances[0],zh?'每月 11,980积分':'Monthly 11.98kcr');
  const kimi=rowFor(zh?'Kimi 中国':'Kimi China','Plus');
  assert.equal(kimi.status,'✅');
  assert.equal(kimi.allowances[0],zh?'每月 未公布':'Monthly Not stated');
  assert.equal(rowFor('Devin','Max').status,'❌');
  const devin=rowFor('Devin','Pro');
  assert.deepEqual(devin.allowances,zh?['每天 未公布','每周 未公布']:['Daily Not stated','Weekly Not stated']);
  for(const row of rows) {
   assert.match(row.status,/^(?:[✅❌]|动态$|Dynamic$)/,`${file}: five-hour column shows a researched policy`);
   assert.ok(!row.allowances.some(value=>/[·／/]/.test(value)),`${file}: periods are separate rows, not slash-separated codes`);
  }
  assert.ok(!body.includes('❓')&&!body.includes('未说明'),`${file}: no unexplored-policy placeholders`);
  assert.match(rowFor('Codex',zh?'免费·桌面':'Free·PC').plan,zh?/桌面/:/PC/);
  assert.ok(!/👍|支持<|Support<|community-vote|issue-body-viewer/.test(body),`${file}: no voting UI`);
  assert.ok(rows.every(row=>/^(?:[\d.]+|汇率待核验)$/.test(row.price)),`${file}: every price in CNY`);
  assert.equal(document.querySelectorAll('sup, [id^="source-"]').length,0,`${file}: no source footnotes`);
  assert.ok(!/\*\*(来源|Sources)\*\*/.test(body),`${file}: no sources section`);
 }
});
test('generated Markdown links resolve to existing local files and provider anchors',async()=>{
 const files=['README.md','README.en.md','CONTRIBUTING.md',...(await readdir('docs',{recursive:true})).filter(n=>n.endsWith('.md')).map(n=>`docs/${n}`)];
 for(const file of files) {
  const body=await readFile(file,'utf8');
  for(const [,target] of body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
   if(/^https?:\/\//.test(target))continue;
   const [path,fragment]=target.split('#');
   const local=path?resolve(dirname(file),decodeURIComponent(path)):resolve(file);
   await assert.doesNotReject(access(local),`${file}: missing ${target}`);
   if(fragment && /^[a-z0-9-]+$/.test(fragment)) {
    const content=await readFile(local,'utf8');
    assert.ok(content.includes(`id="${fragment}"`) || content.toLowerCase().includes(`# ${fragment.replaceAll('-',' ')}`),`${file}: missing #${fragment}`);
   }
  }
 }
});
