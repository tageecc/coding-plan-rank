import test from 'node:test';
import assert from 'node:assert/strict';
import {comparableGroups,rankedVotes,quotaText,md} from '../scripts/model.mjs';
import {countVotes} from '../scripts/votes.mjs';
const p=(id,price,amount,group='a',window='month')=>({id,name:id,monthlyUsd:price,quota:{amount,group,unit:'credits',window}});
const provider=(id,plans,status='ok')=>({id,name:id,product:id,status,plans});
test('value ranking never compares providers, windows, currencies or uncertain ranges',()=>{
 const a=p('base',10,100); const b=p('high',20,300);const c={...p('cn',10,900),monthlyUsd:null,monthlyPrice:10,currency:'CNY'};
 const groups=comparableGroups([provider('a',[a,b,c,p('daily',10,100,'a','day'),{...p('range',10,900),quota:{...a.quota,max:1000}}]),provider('b',[p('base',10,10000)]),provider('bad',[a,b],'needs-review')]);
 assert.equal(groups.length,1);assert.equal(groups[0].winners[0].plan.id,'high');assert.equal(groups[0].ratio,1.5);
});
test('ties remain ties and zero votes produce no fake ranks',()=>{
 const ps=['a','b','c','d'].map(id=>provider(id,[]));
 assert.deepEqual(rankedVotes(ps,{providers:{}}).map(x=>x.rank),[null,null,null,null]);
 const result=rankedVotes(ps,{providers:{a:{count:4,status:'ok'},b:{count:4,status:'ok'},c:{count:2,status:'ok'},d:{count:0,status:'ok'}}});
 assert.deepEqual(result.map(x=>x.rank),[1,1,3,null]);
});
test('counts unique human body thumbs-up only',()=>{
 assert.equal(countVotes([{content:'+1',user:{type:'User',login:'Alice'}},{content:'+1',user:{type:'User',login:'alice'}},{content:'+1',user:{type:'Bot',login:'bot'}},{content:'heart',user:{type:'User',login:'Bob'}},{content:'+1',user:null}]),1);
});
test('unknown quota and Markdown delimiters stay honest',()=>{
 assert.equal(quotaText({amount:null},'zh'),'动态额度；未公开定量');assert.equal(md('a|b\n<script>'),'a\\|b &lt;script&gt;');
});
