import {isDeepStrictEqual} from 'node:util';
import {currencyOf,priceOf} from './model.mjs';

// Match the original plan policy; daily checks never advance the measurement date.
export const referencePolicy=plan=>({name:plan.name,currency:currencyOf(plan),price:priceOf(plan),quota:plan.quota,caps:plan.caps??[]});
export function usageReference(references,provider,plan,cap) {
  if(cap.status!=='limited'||cap.amount!=null)return null;
  return references.find(r=>r.provider===provider.id&&r.plan===plan.id&&r.window===cap.window
    &&isDeepStrictEqual(r.policy,referencePolicy(plan)))??null;
}
