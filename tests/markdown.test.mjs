import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {parseHTML} from 'linkedom';
test('each README shows every plan in one four-column table with single-line cells',async()=>{
 const data=JSON.parse(await readFile('data/plans.json','utf8'));
 const expectedRows=data.providers.reduce((sum,p)=>sum+Math.max(p.plans.length,1),0);
 for(const file of ['README.md','README.en.md']) {
  const body=await readFile(file,'utf8');
  const intro=body.split('<table')[0].replace(/<a id="plans"><\/a>/,'').trim();
  assert.match(intro,/^(更新时间：|Updated: )\d{4}-\d{2}-\d{2} \d{2}:\d{2}[^\n]*$/,`${file}: only the update timestamp above the table`);
  const footer=body.split('</table>')[1].trim().split(/\n\s*\n/);
  assert.equal(footer.length,2,`${file}: footer contains only exchange rate and navigation`);
  assert.match(footer[0],file==='README.md'?/^汇率：1 美元 ≈ /:/^USD 1 ≈ CNY /);
  assert.match(footer[1],/^\[中文\]/);
  const {document}=parseHTML(body);
  const tables=document.querySelectorAll('table');
  assert.equal(tables.length,1,`${file}: only one table`);
  const table=tables[0];
  assert.equal(table.querySelectorAll('tbody tr').length,expectedRows,`${file}: every plan must be visible`);
  assert.ok(!body.includes('<details>'),`${file}: no collapsed plans`);
  assert.equal(table.querySelectorAll('br').length,0,`${file}: no forced line breaks`);
  for(const row of table.querySelectorAll('tr')) {
   assert.equal(row.children.length,4,`${file}: four columns`);
   for(const cell of row.children)assert.ok(cell.hasAttribute('nowrap'),`${file}: cells must not wrap`);
  }
  assert.deepEqual([...table.querySelectorAll('th')].map(cell=>cell.textContent),file==='README.md'?['工具 / 套餐','月费（元）','5小时限额','周／月限额']:['Tool / plan','CNY/mo','5h cap','Week / month']);
  assert.ok(!/额度效率|Quota value|刷新/.test(body),`${file}: plain usage and reset wording`);
  const rows=[...table.querySelectorAll('tbody tr')];
  const labels=rows.map(row=>row.children[0].textContent);
  for(const row of rows.filter(row=>row.children[0].textContent.endsWith(' ⚠'))) {
   assert.match(row.children[0].getAttribute('title'),/本次核验失败|Verification failed/);
  }
  assert.equal(new Set(labels).size,labels.length,`${file}: no ambiguous duplicate plan labels`);
  assert.ok(labels.every(label=>!/国内|\bCN\b|\bintl\b/.test(label)),`${file}: consistent region names`);
  for(const brand of file==='README.md'?['Kimi','智谱','MiniMax']:['Kimi','GLM','MiniMax']) {
   const regions=file==='README.md'?['中国','国际']:['China','Global'];
   const indices=labels.map((label,i)=>label.startsWith(`${brand} `)?i:-1).filter(i=>i>=0);
   assert.ok(regions.every(region=>indices.some(i=>labels[i].startsWith(`${brand} ${region}·`))),`${file}: both markets explicitly labeled for ${brand}`);
   assert.equal(indices.at(-1)-indices[0]+1,indices.length,`${file}: regional plans grouped by brand`);
  }
  const proRows=rows.filter(row=>/^Codex·Pro /.test(row.children[0].textContent));
  assert.deepEqual(proRows.map(row=>row.children[0].textContent),['Codex·Pro 100','Codex·Pro 200','Codex·Pro 500']);
  const rowFor=prefix=>rows.find(row=>row.children[0].textContent.startsWith(prefix));
  const volc=rowFor(file==='README.md'?'火山方舟·Small':'Volcengine·Small');
  assert.match(volc.children[2].textContent,/2(?:,000|K)AFP/);
  assert.match(volc.children[3].textContent,file==='README.md'?/7,000\/周.*2万\/月/:/7K\/w.*20K\/m/);
  const plus=rowFor('Codex·Plus');
  assert.match(plus.children[2].textContent,/15–160/);
  assert.match(plus.children[3].textContent,file==='README.md'?/可能限额\/周/:/May apply\/w/);
  assert.equal(rowFor('Codex·Pro 100').children[2].textContent,file==='README.md'?'不限':'No cap');
  assert.equal(rowFor(file==='README.md'?'阿里云·Lite':'Aliyun·Lite').children[2].textContent,file==='README.md'?'未公开':'Unpub.');
  const glm=rowFor(file==='README.md'?'智谱 国际·Lite':'GLM Global·Lite');
  assert.match(glm.children[2].textContent,/2(?:,000|K)/);
  assert.match(glm.children[3].textContent,file==='README.md'?/1万积分\/周/:/10Kcr\/w/);
  const tencent=rowFor(file==='README.md'?'腾讯通用·Max':'Tencent·Max');
  assert.match(tencent.children[3].textContent,file==='README.md'?/11,980积分\/月/:/11.98Kcr\/m/);
  const kimi=rowFor(file==='README.md'?'Kimi 中国·Plus':'Kimi China·Plus');
  assert.equal(kimi.children[2].textContent,file==='README.md'?'有，未公开':'Set; unpub.');
  assert.match(kimi.children[3].textContent,file==='README.md'?/未公开\/月/:/Unpub.\/m/);
  assert.ok(!/👍|支持<|Support<|community-vote|issue-body-viewer/.test(body),`${file}: no voting UI`);
  const priceCells=[...table.querySelectorAll('tbody tr')].map(row=>row.children[1].textContent);
  assert.ok(priceCells.every(value=>/^(?:(?:≈)?[\d,.]+|汇率待核验)$/.test(value)),`${file}: every price in CNY`);
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
