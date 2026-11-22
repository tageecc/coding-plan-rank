import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {domesticProviders, evidenceDomesticText} from '../scripts/parsers-domestic.mjs';
import {extractGlmMonthly, loadGlmPricing} from '../scripts/glm-pricing.mjs';
import {validatePlans, officialUrl, guardChanges} from '../scripts/update.mjs';

const fixture=JSON.parse(await readFile(new URL('./fixtures/domestic-official.json',import.meta.url),'utf8'));
const bundle=await readFile(new URL('./fixtures/glm-price-config.txt',import.meta.url),'utf8');
const definition=id=>domesticProviders.find(p=>p.id===id);
const input=id=>[...fixture.providers[id].raws];
const prices={'aliyun-cn':[39,79,139,312],'volc-cn':[40,200,500,1000],'glm-cn':[118,538,1078],'kimi-cn':[99,199,699,1399],'mimo-cn':[39,99,329,659],'tencent-hy':[28,78,238,468],'tencent-cn':[39,99,299,599]};
const quotas={'aliyun-cn':[20000,45000,80000,200000],'volc-cn':[20000,100000,250000,500000],'glm-cn':[10000,60000,140000],'kimi-cn':[null,null,null,null],'mimo-cn':[4.1e9,11e9,38e9,82e9],'tencent-hy':[560,1560,4760,9360],'tencent-cn':[780,1980,5980,11980]};
for(const p of domesticProviders) {
 test(`${p.id}: captured official facts yield regular CNY monthly plans`,()=>{
  assert.deepEqual(p.sources,fixture.providers[p.id].sources);
  p.sources.forEach(s=>assert.equal(officialUrl(s.url).protocol,'https:'));
  const plans=validatePlans(p.parse(input(p.id)));
  assert.deepEqual(plans.map(p=>p.monthlyPrice),prices[p.id]);
  assert.deepEqual(plans.map(p=>p.quota.amount),quotas[p.id]);
  assert.ok(plans.every(p=>p.currency==='CNY' && p.monthlyUsd===null));
  assert.ok(Buffer.byteLength(evidenceDomesticText(p.id,input(p.id)))<24000);
  assert.throws(()=>p.parse(['']),/Missing domestic official source/);
 });
}
test('Alibaba ignores introductory prices and follows changed regular prices',()=>{
 const raws=input('aliyun-cn');raws[0]=raws[0].replace('39 元/月\n','49 元/月\n').replace('新用户限时价 19.5 元/月','新用户限时价 1 元/月');
 assert.equal(definition('aliyun-cn').parse(raws)[0].monthlyPrice,49);
 raws[0]=raws[0].replace('49 元/月','价格待定');
 assert.throws(()=>definition('aliyun-cn').parse(raws),/monthly prices/);
});
test('Kimi keeps undocumented quantities unranked and excludes annual and legacy tiers',()=>{
 const plans=definition('kimi-cn').parse(input('kimi-cn'));
 assert.deepEqual(plans.map(p=>p.name),['Plus','Pro','Max','Ultra']);
 assert.ok(plans.every(p=>p.quota.group===null && p.quota.window==='5h'));
});
test('MiMo uses monthly individual CNY prices and billion credits, excluding team/annual prices',()=>{
 const raws=input('mimo-cn');raws[0]=raws[0].replace('$6/month, ¥39/month','$6/month, ¥42/month').replace('4.1 billion Credits','4.2 billion Credits');
 const plan=definition('mimo-cn').parse(raws)[0];
 assert.equal(plan.monthlyPrice,42);assert.equal(plan.quota.amount,4.2e9);
});
test('Tencent Hy and general allowances never get mixed',()=>{
 const raws=input('tencent-cn');raws[0]=raws[0].replace('780积分','800积分');
 assert.equal(definition('tencent-cn').parse(raws)[0].quota.amount,800);
 assert.equal(definition('tencent-hy').parse(raws)[0].quota.amount,560);
 assert.notEqual(definition('tencent-cn').parse(raws)[0].quota.group,definition('tencent-hy').parse(raws)[0].quota.group);
});
test('Volc requires the secondary caps and known monthly reset rule',()=>{
 const raws=input('volc-cn');raws[0]=raws[0].replace('每周一 00:00:00 重置周限额','每月重置周限额');
 assert.throws(()=>definition('volc-cn').parse(raws),/resets changed/);
 const plans=definition('volc-cn').parse(input('volc-cn'));
 assert.match(plans[0].note.zh,/7,000.*2,000/);
 assert.deepEqual(plans[0].caps.map(c=>[c.window,c.amount]),[['5h',2000],['week',7000]]);
 const changed=input('volc-cn');changed[0]=changed[0].replace(/(5小时额度（AFP）[\s\u200b]*)2,000/,(all,prefix)=>prefix+'1,500');
 assert.equal(definition('volc-cn').parse(changed)[0].caps[0].amount,1500);
 assert.throws(()=>guardChanges(plans,definition('volc-cn').parse(changed)),/Cap decreased/);
});
test('GLM extracts active V3 regular monthly data without evaluating remote code',()=>{
 assert.equal(extractGlmMonthly(bundle),'Lite CNY 118 month\nPro CNY 538 month\nMax CNY 1078 month');
 assert.match(extractGlmMonthly(bundle.replace('originalPrice:118','originalPrice:128')),/^Lite CNY 128 month/);
 assert.throws(()=>extractGlmMonthly(bundle.replace('const p="V3"','const p="V4"')),/configuration missing/);
 assert.throws(()=>extractGlmMonthly(bundle.replace('C=p,_=','C=r,_=')),/version changed/);
 assert.throws(()=>extractGlmMonthly(bundle.replace('unitKey:"month"','unitKey:"year"')),/missing/);
});
test('GLM discovers current asset hashes and bounds the public dependency list',async()=>{
 const base='https://static.bigmodel.cn/wd-paas-front/js/';
 const pages=new Map([
  ['https://bigmodel.cn/glm-coding',`<script src="${base}app.12345678.js"></script><script src="${base}runtime.87654321.js"></script>`],
  [base+'app.12345678.js','{path:"/glm-coding",component:()=>Promise.all([n.e(42),n.e(43)]).then(n.bind(n,21718)),meta:{showFixedBar:!0}}'],
  [base+'runtime.87654321.js','n.u=function(e){return"js/"+({43:"ClaudeCode"}[e]||e)+"."+{42:"aaaaaaaa",43:"bbbbbbbb"}[e]+".js"},n.miniCssF=0'],
  [base+'42.aaaaaaaa.js',bundle],[base+'ClaudeCode.bbbbbbbb.js','/* component */'],
 ]);
 const loaded=[];
 const load=async(url,options)=>{loaded.push({url,options});assert.ok(pages.has(url),url);return pages.get(url);};
 assert.match(await loadGlmPricing(load),/^Lite CNY 118 month/);
 assert.ok(loaded.slice(1).every(r=>r.options.allowScriptText));
 pages.set('https://bigmodel.cn/glm-coding','<script src="https://evil.test/app.12345678.js"></script>');
 await assert.rejects(loadGlmPricing(load),/manifest missing/);
});
