import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {REPO} from './model.mjs';
let cachedToken;
export function countVotes(reactions) {
  return new Set(reactions.filter(r=>r.content==='+1' && r.user?.type==='User' && typeof r.user.login==='string').map(r=>r.user.login.toLowerCase())).size;
}
export async function github(path,options={}) {
  let token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN||cachedToken;
  if (!token) token=execFileSync('gh',['auth','token'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
  cachedToken=token;
  const res=await fetch(`https://api.github.com/repos/${REPO}${path}`,{...options,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:`Bearer ${token}`,...options.headers},signal:AbortSignal.timeout(30000)});
  if(!res.ok) throw new Error(`GitHub API returned ${res.status} for ${path.split('?')[0]}`);
  return res.status===204?null:res.json();
}
async function pages(path) {
  const all=[];
  for(let page=1;;page++) {
    const result=await github(`${path}${path.includes('?')?'&':'?'}per_page=100&page=${page}`);
    all.push(...result);
    if(result.length<100) return all;
  }
}
async function main() {
  const dataset=JSON.parse(await readFile('data/plans.json','utf8'));
  let voting;
  try{voting=JSON.parse(await readFile('data/votes.json','utf8'));}catch{voting={providers:{}};}
  const now=new Date().toISOString();
  let failure=false;
  let issues;
  try {issues=await pages('/issues?state=all&labels=community-vote');}
  catch(error) {
    for(const p of dataset.providers)voting.providers[p.id]={...voting.providers[p.id],status:'unavailable',error:error.message};
    voting.updatedAt=now;
    await writeFile('data/votes.json',JSON.stringify(voting,null,2)+'\n');
    console.error(error.message);process.exitCode=1;return;
  }
  for(const p of dataset.providers) {
    const old=voting.providers[p.id];
    try{
      const marker=`<!-- coding-plan-vote:${p.id} -->`;
      let issue=old?.issueNumber ? await github(`/issues/${old.issueNumber}`) : issues.find(x=>x.body?.includes(marker) && !x.pull_request);
      if(issue && (!issue.body?.includes(marker) || issue.pull_request || !issue.labels.some(l=>l.name==='community-vote')))throw new Error('Voting issue identity or label changed; review required');
      if(!issue) {
        if(!process.argv.includes('--init'))throw new Error('Voting issue missing; run npm run votes -- --init');
        issue=await github('/issues',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:`[投票 / Vote] ${p.product}`,labels:['community-vote'],body:`${marker}\n\n支持 **${p.product}**，请点击本帖正文下方的 👍（+1）反应。\n\nVote for **${p.product}** with a **👍 (+1) reaction on this issue body**.\n\n- 每个 GitHub 真人账号对本工具计一票，可以支持多个工具。\n- One vote per human account per tool; you may support multiple tools.\n- 评论的点赞、其他表情和机器人账号不计票；撤回 👍 会在下次更新时减票。\n- Only issue-body +1 reactions count; comments, other reactions and bot accounts are excluded.\n- 票数每日同步到 [README](https://github.com/${REPO}#社区票选)。这是社区偏好，不代表客观性能或价格性价比。\n- Daily sync. This is community preference, not a benchmark or a price-value score.`})});
      }
      if(old?.issueNumber && issue.number!==old.issueNumber)throw new Error('Voting issue mapping changed; review required');
      if(issue.state!=='open')throw new Error('Voting issue is closed');
      const reactions=await pages(`/issues/${issue.number}/reactions`);
      voting.providers[p.id]={issueNumber:issue.number,url:issue.html_url,count:countVotes(reactions),checkedAt:now,status:'ok'};
    }catch(error){failure=true;voting.providers[p.id]={...old,status:'unavailable',error:error.message};console.error(`${p.id}: ${error.message}`);}
  }
  voting.updatedAt=now;
  await writeFile('data/votes.json',JSON.stringify(voting,null,2)+'\n');
  if(failure)process.exitCode=1;
}
if(process.argv[1] && import.meta.url===new URL(process.argv[1],'file://').href)await main();
