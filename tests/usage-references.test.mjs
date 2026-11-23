import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {usageReference} from '../scripts/usage-references.mjs';

const references=JSON.parse(await readFile('data/usage-references.json','utf8'));
const samplePlan=reference=>({id:reference.plan,name:reference.policy.name,currency:reference.policy.currency,
  monthlyPrice:reference.policy.price,monthlyUsd:reference.policy.price,
  quota:structuredClone(reference.policy.quota),caps:structuredClone(reference.policy.caps)});

test('observed Go quantities preserve region, date, model and official unknowns',()=>{
  for(const [id,amount] of [['minimax-cn',19190000],['minimax',62940000]]) {
    const provider={id},plan=samplePlan(references.find(r=>r.provider===id));
    const cap=plan.caps.find(q=>q.window==='5h');
    const before=JSON.stringify(plan),reference=usageReference(references,provider,plan,cap);
    assert.equal(reference.amount,amount);
    assert.equal(reference.unit,'tokens');
    assert.equal(reference.kind,'observation');
    assert.equal(reference.observedAt,'2026-10-24');
    assert.match(reference.model,/MiniMax-M3\.1-Flash.*max/);
    assert.match(reference.source,/^https:\/\/witchery\.cc\//);
    assert.match(reference.note.zh,/非官方固定额度/);
    assert.match(reference.note.en,/not a fixed official quota/);
    assert.equal(cap.amount,null);
    assert.equal(cap.unit,'unknown');
    assert.equal(JSON.stringify(plan),before);
    for(const id of ['explore','build'])assert.equal(usageReference(references,provider,{...plan,id},cap),null);
  }
});

test('official quantities take precedence and changed plan policies stop using old samples',()=>{
  const provider={id:'minimax'},plan=samplePlan(references.find(r=>r.provider===provider.id)),cap=plan.caps[0];
  assert.equal(usageReference(references,provider,plan,{...cap,amount:100}),null);
  assert.equal(usageReference(references,provider,plan,{...cap,status:'none'}),null);
  for(const mutate of [p=>p.monthlyUsd++,p=>p.quota.amount++,p=>p.caps[0].window='day',p=>p.name='Go 2']) {
    const changed=structuredClone(plan);mutate(changed);
    assert.equal(usageReference(references,provider,changed,cap),null);
  }
  // A daily verification timestamp is not a new measurement or policy change.
  assert.equal(usageReference(references,{...provider,checkedAt:'2026-11-24T00:00:00Z'},plan,cap)?.observedAt,'2026-10-24');
});
