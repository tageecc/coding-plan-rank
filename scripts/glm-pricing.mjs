import {requireFact} from './parsers.mjs';

export function extractGlmMonthly(bundle) {
  const version=/const ([\w$]+)="V3",/.exec(bundle);
  requireFact(version, 'GLM current personal price configuration missing');
  const current=bundle.slice(version.index);
  requireFact(new RegExp(`,[\\w$]+=${version[1]},[\\w$]+=\\(`).test(current), 'GLM current pricing version changed');
  const start=current.indexOf('[{type:"lite",unitKey:"month"');
  const end=current.indexOf(']',start);
  requireFact(start>=0 && end>start, 'GLM monthly price array missing');
  const cards=current.slice(start,end);
  return ['Lite','Pro','Max'].map(name=> {
    const rows=[...cards.matchAll(new RegExp(`\\{type:"${name.toLowerCase()}",unitKey:"month",[^{}]*\\}`,'g'))];
    requireFact(rows.length===1, `GLM ${name} monthly card missing or ambiguous`);
    const price=/\boriginalPrice:([\d.]+)(?=,|})/.exec(rows[0][0]);
    requireFact(price && Number(price[1])>0, `GLM ${name} monthly list price missing`);
    return `${name} CNY ${price[1]} month`;
  }).join('\n');
}

// Follow the public site's current build manifest instead of pinning an expiring
// bundle hash. All downloads use the same HTTPS/size/timeout guards. No JS runs.
export async function loadGlmPricing(load) {
  const html=await load('https://bigmodel.cn/glm-coding');
  const script=name=> {
    const matches=[...html.matchAll(new RegExp(`src="(https://static\\.bigmodel\\.cn/wd-paas-front/js/${name}\\.[a-f0-9]+\\.js)"`,'g'))];
    requireFact(matches.length===1, `GLM ${name} manifest missing or ambiguous`);
    return matches[0][1];
  };
  const [app,runtime]=await Promise.all([load(script('app'),{allowScriptText:true}),load(script('runtime'),{allowScriptText:true})]);
  const route=/path:"\/glm-coding",[^}]+/.exec(app)?.[0];
  requireFact(route, 'GLM public pricing route changed');
  const ids=[...route.matchAll(/\.e\((\d+)\)/g)].map(m=>m[1]);
  requireFact(ids.length>0 && ids.length<=10, 'GLM pricing dependency list changed');
  const manifest=/\.u=function\([^)]*\)\{return"js\/"\+([\s\S]+?)\},/.exec(runtime)?.[1];
  requireFact(manifest, 'GLM asset manifest changed');
  const entries=[...manifest.matchAll(/(\d+):"([^"/]+)"/g)];
  const urls=ids.map(id=> {
    const values=entries.filter(m=>m[1]===id).map(m=>m[2]);
    requireFact(values.length>=1 && values.length<=2 && /^[a-f0-9]{8}$/.test(values.at(-1)), 'GLM asset hash missing');
    const name=values.length===2?values[0]:id;
    requireFact(/^[\w-]+$/.test(name), 'GLM invalid pricing asset name');
    return `https://static.bigmodel.cn/wd-paas-front/js/${name}.${values.at(-1)}.js`;
  });
  const bundles=await Promise.all(urls.map(url=>load(url,{allowScriptText:true})));
  const candidates=bundles.filter(s=>s.includes('stepUnit:"月"') && s.includes('unitKey:"month"') && /const [\w$]+="V3",/.test(s));
  requireFact(candidates.length===1, 'GLM personal pricing bundle missing or ambiguous');
  return extractGlmMonthly(candidates[0]);
}
