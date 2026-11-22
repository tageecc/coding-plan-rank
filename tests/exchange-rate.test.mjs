import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseExchangeRate,updateExchangeRate,cnyMoney,cnyPrice} from '../scripts/exchange-rate.mjs';
const xml=await readFile(new URL('./fixtures/ecb-rates.xml',import.meta.url),'utf8');
const now='2026-11-22T08:45:00.000Z';
const fx=parseExchangeRate(xml,now);
test('ECB cross-rate converts EUR reference rates into USD/CNY using the latest trading day',()=>{
 assert.equal(fx.rate,6.677707);assert.equal(fx.rateDate,'2026-11-20');assert.equal(fx.status,'ok');
 assert.equal(cnyPrice({monthlyUsd:20},fx),133.55);
 assert.equal(cnyMoney({monthlyUsd:20},fx),'≈133.55元');
 assert.equal(cnyMoney({currency:'CNY',monthlyPrice:39,monthlyUsd:null},fx),'39元');
 assert.equal(cnyMoney({monthlyUsd:0},fx),'0元');
});
test('FX rejects future, stale, duplicate and invalid reference values',()=>{
 for(const raw of [xml.replace('2026-11-20','2026-11-23'),xml.replace('2026-11-20','2026-11-01'),xml.replace("rate='1.0990'","rate='0'"),xml.replace("currency='USD'","currency='EUR'"),xml.replace("<Cube currency='USD' rate='1.0990'/>","<Cube currency='USD' rate='1.0990'/><Cube currency='USD' rate='1.5'/>"),xml.replace("rate='7.3388'","rate='garbage'")])assert.throws(()=>parseExchangeRate(raw,now));
});
test('failed FX preserves the old verification timestamp but suspends dollar conversion',async()=>{
 const result=await updateExchangeRate(async()=>{throw new Error('timeout');},fx,'2026-11-23T10:00:00Z');
 assert.equal(result.checkedAt,now);assert.equal(result.status,'unavailable');
 assert.equal(cnyPrice({monthlyUsd:20},result),null);
 assert.equal(cnyMoney({monthlyUsd:20},result),'汇率待核验');
 assert.equal(cnyMoney({currency:'CNY',monthlyPrice:99},result),'99元');
});
