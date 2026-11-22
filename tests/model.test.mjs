import test from 'node:test';
import assert from 'node:assert/strict';
import {quotaText,md} from '../scripts/model.mjs';
test('unknown quota and Markdown delimiters stay honest',()=>{
 assert.equal(quotaText({amount:null},'zh'),'动态额度；未公开定量');assert.equal(md('a|b\n<script>'),'a\\|b &lt;script&gt;');
});
