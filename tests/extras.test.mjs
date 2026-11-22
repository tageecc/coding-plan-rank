import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extraProviders, evidenceExtraText, extraEvidenceText } from '../scripts/parsers-extra.mjs';
import { validatePlans, officialUrl } from '../scripts/update.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/extras-official.json', import.meta.url), 'utf8'));
const provider = id => extraProviders.find(p => p.id === id);
const raws = id => [...fixture.providers[id].raws];
const parse = id => provider(id).parse(raws(id));

const expectedPrices = {
  antigravity: [0, 19.99, 99.99, 199.99],
  devin: [0, 20, 200],
  glm: [18, 80, 168],
  minimax: [22, 55, 132],
  'minimax-cn': [49, 119, 469],
  kimi: [19, 39, 99, 199],
  kiro: [0, 20, 40, 100, 200],
};

for (const definition of extraProviders) {
  test(`${definition.id}: captured fetchOfficial response satisfies the pipeline schema`, () => {
    assert.deepEqual(definition.sources, fixture.providers[definition.id].sources);
    definition.sources.forEach(s => assert.equal(officialUrl(s.url).protocol, 'https:'));
    const plans = validatePlans(parse(definition.id));
    assert.deepEqual(plans.map(p => p.monthlyPrice ?? p.monthlyUsd), expectedPrices[definition.id]);
    assert.ok(plans.every(p => !/teams?|enterprise|business/i.test(p.name)));
    const evidence = evidenceExtraText(definition.id, raws(definition.id));
    assert.ok(Buffer.byteLength(evidence) > 0 && Buffer.byteLength(evidence) <= 24000);
    assert.equal(evidence, extraEvidenceText(definition.id, raws(definition.id)));
    assert.ok(!/<script|docsConfig|Skip to main content|Documentation Index/.test(evidence));
  });
}

test('Google footnote numbers do not become plan names or coding-quota multipliers', () => {
  const plans = parse('antigravity');
  assert.deepEqual(plans.map(p => p.name), ['Free', 'Google AI Pro', 'Google AI Ultra 5x', 'Google AI Ultra 20x']);
  assert.ok(plans.every(p => p.quota.amount === null && p.quota.group === null && ['week','5h'].includes(p.quota.window)));
  const input = raws('antigravity');
  input[0] = input[0].replace(/^Google AI Pro\d*$/gm, 'Google AI Pro27').replace('$19.99/ month', '$29.99/ month');
  assert.equal(provider('antigravity').parse(input).find(p=>p.name==='Google AI Pro').monthlyUsd, 29.99);
});

test('Devin prices must agree across independent official pricing and billing pages', () => {
  assert.deepEqual(parse('devin').find(p=>p.name==='Max').caps,[{window:'5h',amount:null,unit:'unknown',status:'none'}]);
  const changed=raws('devin');
  changed[1]=changed[1].replace('Max has a weekly allowance only, with no daily cap.','Max may have additional windows.');
  assert.throws(()=>provider('devin').parse(changed),/calendar quota rules changed/);
  const input = raws('devin');
  input[0] = input[0].replace('$20per month', '$25per month');
  assert.throws(() => provider('devin').parse(input), /pricing and billing sources disagree/);
});

test('GLM uses regular list price, credits and the seven-day allowance', () => {
  assert.deepEqual(parse('glm').map(p => p.quota.amount), [10000, 60000, 140000]);
  assert.ok(parse('glm').every(p => p.quota.unit === 'credits' && p.quota.window === 'week'));
  const input = raws('glm');
  input[0] = input[0].replace('$12.6/ month$18', '$1/ month$21');
  assert.equal(provider('glm').parse(input)[0].monthlyUsd, 21);
  input[0] = input[0].replace('$1/ month$21', 'Pricing unavailable');
  assert.throws(() => provider('glm').parse(input), /Lite regular monthly price/);
});

test('MiniMax China and international prices and relative quotas remain separate', () => {
  const international = parse('minimax');
  const china = parse('minimax-cn');
  assert.deepEqual(international.map(p => p.quota.amount), [1, 3, 7.5]);
  assert.deepEqual(china.map(p => p.quota.amount), [1, 3, 12]);
  assert.ok(china.every(p => p.currency === 'CNY' && p.monthlyUsd === null));
  assert.notEqual(international[0].quota.group, china[0].quota.group);
  assert.ok([...international, ...china].every(p => p.quota.window === 'week'));
});

test('Kimi excludes annual equivalents and legacy weekly caps', () => {
  const plans = parse('kimi');
  assert.ok(plans.every(p => p.quota.amount === null && p.quota.window === '5h' && p.quota.group === null));
  assert.ok(plans.every(p => /no weekly cap for new subscribers/.test(p.note.en)));
  assert.ok(!plans.some(p => /Go|Andante|Allegretto/.test(p.name)));
});

test('Kiro counts monthly credits, excludes trial gifts and includes the current Power tier', () => {
  const plans = parse('kiro');
  assert.deepEqual(plans.map(p => p.quota.amount), [50, 1000, 2000, 5000, 10000]);
  assert.ok(plans.every(p => p.quota.unit === 'credits' && p.quota.window === 'month'));
  const input = raws('kiro');
  input[0] = input[0].replace('1,000 credits', '1,250 credits');
  assert.equal(provider('kiro').parse(input).find(p => p.name === 'Pro').quota.amount, 1250);
});

test('official Markdown tables preserve column semantics for GLM and MiniMax', () => {
  const glm = raws('glm');
  glm[1] = glm[1].replace('Plan Type 5-Hour Credits Weekly Credits\nLite 2,000 10,000\nPro 12,000 60,000\nMax 28,000 140,000', '| Plan Type | 5-Hour Credits | Weekly Credits |\n| --- | --- | --- |\n| Lite | 2,000 | 10,000 |\n| Pro | 12,000 | 60,000 |\n| Max | 28,000 | 140,000 |');
  assert.deepEqual(provider('glm').parse(glm), parse('glm'));
  const mini = raws('minimax');
  mini[0] = mini[0].replace('Tier First-month discount Regular price\nGo 50% off $22/month\nExplore 50% off $55/month\nBuild 50% off $132/month', '| Tier | First-month discount | Regular price |\n| --- | --- | --- |\n| Go | 50% off | $22/month |\n| Explore | 50% off | $55/month |\n| Build | 50% off | $132/month |');
  assert.deepEqual(provider('minimax').parse(mini), parse('minimax'));
});

test('missing sources or changed reset semantics fail instead of returning cached numbers', () => {
  for (const p of extraProviders) assert.throws(() => p.parse(['', '']), /missing official source/);
  const glm = raws('glm');
  glm[1] = glm[1].replace('resets every 7 days', 'resets every 30 days');
  assert.throws(() => provider('glm').parse(glm), /reset rules changed/);
  const devin = raws('devin');
  devin[1] = devin[1].replace('Max has a weekly allowance only, with no daily cap', 'Max now has a daily cap');
  assert.throws(() => provider('devin').parse(devin), /calendar quota rules changed/);
});

test('Devin free-card extraction survives official layouts that move the download button',()=>{
 const input=raws('devin');input[0]=fixture.providers.devin.alternatePricing;
 assert.deepEqual(provider('devin').parse(input).map(p=>p.monthlyUsd),[0,20,200]);
 assert.ok(Buffer.byteLength(evidenceExtraText('devin',input))<24000);
 input[0]=input[0].replace('$0','$5');
 assert.throws(()=>provider('devin').parse(input),/free agent access changed/);
});
