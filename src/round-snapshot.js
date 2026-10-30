import {names,rounds,teams,roundPlayers,courseHandicap} from './data.js';
const six=names.slice(0,6);
export function roundSnapshot(id,scores,engine,holes=[]){
 const r=rounds.find(x=>x.id===id),players=roundPlayers(r);
 const gross=(p,h)=>engine.gross(id,p,h),net=(p,h)=>engine.net(id,p,h);
 const par=h=>holes.find(x=>x.round_id===id&&x.hole===h)?.par??(h>9?3:4);
 const progress=Object.fromEntries(players.map(p=>[p,Array.from({length:r.holes},(_,i)=>gross(p,i+1)).filter(v=>v!==null).length]));
 const ready=(ps,h)=>ps.every(p=>gross(p,h)!==null);
 const group=(ps,fn)=>{let holes=0;for(let h=1;h<=r.holes;h++)if(ready(ps,h)){holes++;fn(h);}return holes;};
 const result=(title,detail,played,required=r.holes)=>({title,detail,played,required});
 const compare=(a,b)=>a>b?'WIN':a<b?'LOSS':'TIED';
 const rows=[];
 if(r.format==='match'){
  for(const g of r.groups){const ps=g.filter(p=>six.includes(p));for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
   const a=ps[i],b=ps[j];let aw=0,bw=0;const played=group([a,b],h=>{const x=net(a,h),y=net(b,h);if(x<y)aw++;else if(y<x)bw++;});
   const lead=aw-bw;const state=played===0?'Not started':lead===0?'All square':(lead>0?a:b)+' '+Math.abs(lead)+' UP';
   rows.push(result(a+' vs '+b,state+' · '+aw+'–'+bw+' holes won',played));
  }}
 }else if(id==='silver-pm'){
  const ts=teams[id],margins=[0,0,0],counts=[0,0];
  for(const [k,start] of [1,10].entries()){
   for(let h=start;h<start+9;h++)if(ready(six,h)){
    counts[k]++;const vals=ts.map(t=>{const v=t.map(p=>Math.max(0,Math.min(9,Math.min(par(h)+2,h<=9?net(p,h):gross(p,h))))).sort((a,b)=>a-b);return 10*v[0]+v[1];});
    for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const d=Math.max(-15,Math.min(15,vals[j]-vals[i]));margins[i]+=d;margins[j]-=d;}
   }
  }
  ts.forEach((t,i)=>rows.push(result(t.join(' + '),margins[i]+' net Vegas margin · HB '+counts[0]+'/9 · Short '+counts[1]+'/9',counts[0]+counts[1])));
 }else if(id==='valley'||id==='lake'){
  const ts=teams[id],best=(t,h)=>Math.min(...t.map(p=>net(p,h)));
  for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length;j++){
   let a=0,b=0;const played=group([...ts[i],...ts[j]],h=>{const x=best(ts[i],h),y=best(ts[j],h);if(x<y)a++;else if(y<x)b++;});
   rows.push(result(ts[i].join(' + ')+' vs '+ts[j].join(' + '),(a===b?'All square':(a>b?ts[i]:ts[j]).join(' + ')+' '+Math.abs(a-b)+' UP')+' · '+a+'–'+b+' holes won',played));
  }
 }else if(id==='ross'){
  players.forEach(p=>rows.push(result(p,progress[p]?'Net Stableford '+engine.stable(id,p)+' pts':'Not started',progress[p])));
  rows.sort((a,b)=>Number((b.detail.match(/\d+(?= pts)/)||[0])[0])-Number((a.detail.match(/\d+(?= pts)/)||[0])[0]));
 }else if(id==='backyard'){
  const contests=[{label:'Team skins',groups:teams.backyard},{label:'Individual skins',groups:players.map(p=>[p])}];
  for(const contest of contests){const wins=contests[0]===contest?teams.backyard.map(()=>0):players.map(()=>0);let carry=0,played=0;
   for(let h=1;h<=9;h++){if(!ready(players,h))break;played++;carry++;const vals=contest.groups.map(t=>Math.min(...t.map(p=>gross(p,h)))),low=Math.min(...vals),w=vals.map((v,i)=>v===low?i:-1).filter(i=>i>=0);if(w.length===1){wins[w[0]]+=carry;carry=0;}}
   contest.groups.forEach((t,i)=>rows.push(result(contest.label+' · '+t.join(' + '),wins[i]+' skins'+(carry?' · '+carry+' pending carry':''),played,9)));
  }
 }else if(id==='short'){
  const credits=Object.fromEntries(six.map(p=>[p,0]));
  let played=0;for(let h=1;h<=18;h++)if(ready(six,h)){played++;const low=Math.min(...six.map(p=>net(p,h))),w=six.filter(p=>net(p,h)===low);w.forEach(p=>credits[p]+=1/w.length);}
  six.forEach(p=>rows.push(result(p,credits[p].toFixed(2)+' finale credits',progress[p])));
  rows.sort((a,b)=>parseFloat(b.detail)-parseFloat(a.detail));
 }
 const wildStableford=['valley','ridge','ross'].includes(id)?names.map(p=>{
  const base=courseHandicap(r,'Jimmy');
  const allowance=Math.max(0,courseHandicap(r,p)-base);
  let pts=0,played=0;
  for(let h=1;h<=18;h++){
   const g=gross(p,h);if(g===null)continue;
   played++;
   const index=holes.find(x=>x.round_id===id&&x.hole===h)?.stroke_index??h;
   const strokes=Math.floor(allowance/18)+(index<=allowance%18?1:0);
   const entry=scores.find(x=>x.round_id===id&&x.player===p&&x.hole===h);
   const d=g-strokes+(entry?.lifeline?1:0)-par(h);
   pts+=d<=-1?3:d===0?2:d===1?1:0;
  }
  return {player:p,points:pts,played};
 }).sort((a,b)=>b.points-a.points||b.played-a.played):[];
 return {wildStableford,rows,progress,players,holes:r.holes,format:{match:'3-way net match play',vegas:'Net / gross Vegas',triple:'Triple Threat · team best ball',stableford:'Net Stableford',skins:'Gross team + individual skins',bestball:'Team best ball',finale:'Individual finale'}[r.format]};
}
