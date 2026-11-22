import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
test('each README shows every plan in exactly one five-column table without collapsed details',async()=>{
 const data=JSON.parse(await readFile('data/plans.json','utf8'));
 const expectedRows=data.providers.reduce((sum,p)=>sum+Math.max(p.plans.length,1),0);
 for(const file of ['README.md','README.en.md']) {
  const body=await readFile(file,'utf8');
  const rows=body.split('\n').filter(l=>l.startsWith('|'));
  assert.equal(rows.length,expectedRows+2,`${file}: every plan must be visible`);
  assert.equal(rows.filter(l=>l.startsWith('| :--')).length,1,`${file}: only one table`);
  assert.ok(!body.includes('<details>'),`${file}: no collapsed plans`);
  for(const line of rows) {
   assert.equal(line.replaceAll('\\|','').split('|').length-2,5,`${file}: five columns`);
  }
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
