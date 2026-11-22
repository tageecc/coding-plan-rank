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
  assert.equal(table.querySelectorAll('tbody tr').length,expectedRows,`${file}: every plan must be visible`);
  assert.ok(!body.includes('<details>'),`${file}: no collapsed plans`);
  assert.equal(table.querySelectorAll('br').length,0,`${file}: no forced line breaks`);
  for(const cell of table.querySelectorAll('th,td'))assert.ok(cell.hasAttribute('nowrap'),`${file}: cells must not wrap`);
  assert.deepEqual([...table.querySelectorAll('thead th')].map(cell=>cell.textContent),zh?['工具','套餐','月费/元','5小时限额','周／月限额']:['Tool','Plan','CNY/mo','5h cap','Week/month']);
  assert.ok(!/额度效率|Quota value|刷新/.test(body),`${file}: plain usage and reset wording`);
  let tool,remaining=0;
  const rows=[...table.querySelectorAll('tbody tr')].map(row=>{
   const cells=[...row.children];
   if(remaining===0) {
    assert.equal(cells.length,5,`${file}: each tool starts a five-column group`);
    tool=cells.shift();
    remaining=Number(tool.getAttribute('rowspan'));
    assert.ok(Number.isInteger(remaining)&&remaining>0,`${file}: tool spans its plan rows`);
    if(tool.textContent.endsWith(' ⚠'))assert.match(tool.getAttribute('title'),/本次核验失败|Verification failed/);
   } else assert.equal(cells.length,4,`${file}: following rows inherit the merged tool cell`);
   remaining--;
   const [plan,price,short,total]=cells;
   return {tool:tool.textContent.replaceAll('\u2009',' ').replace(/ ⚠$/,''),plan:plan.textContent,price:price.textContent,short:short.textContent,total:total.textContent};
  });
  assert.equal(remaining,0,`${file}: rowspan ends at the final plan`);
  assert.equal(table.querySelectorAll('td[rowspan]').length,data.providers.length,`${file}: one merged tool cell per provider`);
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
   const count=rows.filter(row=>row.tool===tool).length;
   const cell=[...table.querySelectorAll('td[rowspan]')].find(cell=>cell.textContent.replaceAll('\u2009',' ').replace(/ ⚠$/,'')===tool);
   assert.equal(Number(cell.getAttribute('rowspan')),count,`${file}: ${tool} spans exactly its own plans`);
  }
  assert.deepEqual(rows.filter(row=>row.tool==='Claude Code').map(row=>row.plan),['Pro','Max','Ultra']);
  assert.deepEqual(rows.filter(row=>row.tool==='Codex'&&row.plan.startsWith('Pro ')).map(row=>row.plan),['Pro 100','Pro 200','Pro 500']);
  const rowFor=(tool,plan)=>rows.find(row=>row.tool===tool&&row.plan===plan);
  const volc=rowFor(zh?'火山方舟':'Volcengine','Small');
  assert.match(volc.short,/2(?:,000|k)AFP/);
  assert.match(volc.total,zh?/周7,000.*月2万/:/w7k.*m20k/);
  const plus=rowFor('Codex','Plus');
  assert.match(plus.short,/15[–-]160/);
  assert.match(plus.total,zh?/可能限额\/周/:/May apply\/w/);
  assert.equal(rowFor('Codex','Pro 100').short,zh?'不限':'No cap');
  assert.equal(rowFor(zh?'阿里云':'Aliyun','Lite').short,zh?'未公开':'Unpub.');
  const glm=rowFor(zh?'智谱 国际':'GLM Global','Lite');
  assert.match(glm.short,/2(?:,000|k)/);
  assert.match(glm.total,zh?/1万积分\/周/:/10kcr\/w/);
  const tencent=rowFor(zh?'腾讯通用':'Tencent','Max');
  assert.match(tencent.total,zh?/11,980积分\/月/:/11.98kcr\/m/);
  const kimi=rowFor(zh?'Kimi 中国':'Kimi China','Plus');
  assert.equal(kimi.short,zh?'有，未公开':'Set; unpub.');
  assert.match(kimi.total,zh?/未公开\/月/:/Unpub.\/m/);
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
