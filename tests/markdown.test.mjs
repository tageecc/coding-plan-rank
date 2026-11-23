import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {parseHTML} from 'linkedom';
import {usageReference} from '../scripts/usage-references.mjs';
test('each README groups plans under merged tool cells in one single-line table',async()=>{
 const data=JSON.parse(await readFile('data/plans.json','utf8'));
 const references=JSON.parse(await readFile('data/usage-references.json','utf8'));
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
  const normalize=value=>value.replaceAll('\u2009',' ').replace(/ 🇨🇳$/,' China').replace(/ 🌐$/,' Global');
  const {document}=parseHTML(body);
  const tables=document.querySelectorAll('table');
  assert.equal(tables.length,1,`${file}: only one table`);
  const table=tables[0];
  assert.ok(table.querySelectorAll('tbody tr').length>=expectedRows,`${file}: every plan must be visible`);
  assert.ok(!body.includes('<details>'),`${file}: no collapsed plans`);
  assert.equal(table.querySelectorAll('br').length,0,`${file}: no forced line breaks`);
  for(const cell of table.querySelectorAll('th,td'))assert.ok(cell.hasAttribute('nowrap'),`${file}: cells must not wrap`);
  assert.deepEqual([...table.querySelectorAll('thead th')].map(cell=>cell.textContent),zh?['工具','套餐','月费/元','5小时限额','其他额度']:['Tool','Plan','CNY/mo','5h cap','Other caps']);
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
    current={tool:normalize(tool.textContent.replace(/ ⚠$/,'')),plan:plan.textContent,price:price.textContent,status:status.textContent,statusTitle:status.getAttribute('title'),planTitle:plan.getAttribute('title'),allowances:[],physicalRows:planRemaining};
    rows.push(current);
   }
   assert.equal(cells.length,1,`${file}: each physical row contains exactly one period's allowance`);
   current.allowances.push(normalize(cells[0].textContent));
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
   const cell=[...table.querySelectorAll('td[rowspan]')].find(cell=>normalize(cell.textContent.replace(/ ⚠$/,''))===tool);
   assert.equal(Number(cell.getAttribute('rowspan')),count,`${file}: ${tool} spans exactly its own plans`);
  }
  assert.deepEqual(rows.filter(row=>row.tool==='Claude Code').map(row=>row.plan),['Pro','Max','Ultra']);
  assert.deepEqual(rows.filter(row=>row.tool==='Codex'&&row.plan.startsWith('Pro ')).map(row=>row.plan),['Pro 100','Pro 200','Pro 500']);
  const rowFor=(tool,plan)=>rows.find(row=>row.tool===tool&&row.plan===plan);
  const volc=rowFor(zh?'火山方舟':'Volcengine','Small');
  assert.equal(volc.status,zh?'❌2000AFP':'❌2kAFP');
  assert.deepEqual(volc.allowances,zh?['每周7000AFP','每月2万AFP']:['Wk 7kAFP','Mo 20kAFP']);
  const plus=rowFor('Codex','Plus');
  assert.equal(plus.status,zh?'❌~15–160条':'❌~15-160💬');
  assert.deepEqual(plus.allowances,zh?['每周未公布']:['Wk Unstated']);
  assert.equal(rowFor('Codex','Pro 100').status,zh?'✅无':'✅None');
  for(const tool of ['Cursor','Kiro',zh?'阿里云':'Aliyun',zh?'小米 MiMo':'MiMo',zh?'腾讯通用':'Tencent',zh?'腾讯混元':'Tencent Hy','Antigravity','Devin'])assert.ok(rows.filter(row=>row.tool===tool).filter(row=>tool!=='Antigravity'||[zh?'免费':'Free'].includes(row.plan)).every(row=>row.status===(zh?'✅无':'✅None')),`${file}: researched hourly policy for ${tool}`);
  assert.equal(rowFor('Codex','Go·🖥️').status,zh?'✅无':'✅None');
  const free=rowFor('Codex',zh?'免费·🖥️':'Free·🖥️');
  assert.equal(free.status,zh?'✅实测无':'✅obs.·None');
  assert.deepEqual(free.allowances,zh?['30天未公布']:['30d Unstated']);
  assert.ok(rows.filter(row=>row.tool==='Copilot').every(row=>row.status===(zh?'⚠️动态':'⚠️Dyn.')));
  assert.equal(rowFor('Claude Code','Ultra').status,zh?'✅认证后无':'✅ID·None');
  assert.match(rowFor('Claude Code','Ultra').statusTitle,/认证后无|after verification/);
  const glm=rowFor(zh?'智谱 国际':'GLM Global','Lite');
  assert.equal(glm.status,zh?'❌2000积分':'❌2kcr');
  assert.deepEqual(glm.allowances,zh?['每周1万积分']:['Wk 10kcr']);
  const tencent=rowFor(zh?'腾讯通用':'Tencent','Max');
  assert.equal(tencent.allowances[0],zh?'每月11980积分':'Mo 11.98kcr');
  const kimi=rowFor(zh?'Kimi 中国':'Kimi China','Plus');
  assert.equal(kimi.status,zh?'❌未公布':'❌Unstated');
  assert.equal(kimi.allowances[0],zh?'每月未公布':'Mo Unstated');
  for(const [id,tool,amount] of [['minimax-cn',zh?'MiniMax 中国':'MiniMax China',zh?'1919万T':'19.19MT'],['minimax',zh?'MiniMax 国际':'MiniMax Global',zh?'6294万T':'62.94MT']]) {
   const go=rowFor(tool,'Go');
   const provider=data.providers.find(p=>p.id===id),plan=provider.plans.find(p=>p.id==='go');
   if(usageReference(references,provider,plan,plan.caps.find(q=>q.window==='5h'))) {
    assert.equal(go.status,`❌${zh?'测':'obs.'}${amount}`);
    assert.match(go.statusTitle,/2026-10-24/);
    assert.match(go.statusTitle,/MiniMax-M3\.1-Flash/);
    assert.match(go.statusTitle,/witchery\.cc/);
   } else assert.doesNotMatch(go.status,/测|obs\./);
   for(const plan of ['Explore','Build'])assert.doesNotMatch(rowFor(tool,plan).status,/测|obs\./);
  }
  assert.equal(rowFor('Devin','Max').status,zh?'✅无':'✅None');
  const devin=rowFor('Devin','Pro');
  assert.deepEqual(devin.allowances,zh?['每天未公布','每周未公布']:['Day Unstated','Wk Unstated']);
  for(const row of rows) {
   if(row.status.startsWith('✅'))assert.match(row.statusTitle,/无5小时限额|No five-hour cap/);
   if(row.status.startsWith('❌'))assert.match(row.statusTitle,/有5小时限额|Five-hour cap applies/);
   assert.match(row.status,/^(?:[✅❌].+|⚠️(?:动态|Dyn\.))$/,`${file}: five-hour column includes an allowance or explicit policy, not a bare icon`);
   assert.ok(!row.allowances.some(value=>/5小时|5h/.test(value)),`${file}: five-hour quantities appear only in the five-hour column`);
   assert.ok(!row.allowances.some(value=>/[·／/]/.test(value)),`${file}: periods are separate rows, not slash-separated codes`);
  }
  assert.ok(!body.includes('❓')&&!body.includes('未说明'),`${file}: no unexplored-policy placeholders`);
  assert.match(rowFor('Codex',zh?'免费·🖥️':'Free·🖥️').plan,/🖥️/);
  assert.match(rowFor('Codex',zh?'免费·🖥️':'Free·🖥️').planTitle,/桌面|desktop/i);
  assert.match(rowFor('Copilot','🎓').planTitle,/验证|学生|verifi|student/i);
  assert.ok(rowFor('Antigravity',zh?'免费':'Free'),`${file}: consistent localized free plan labels`);
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
