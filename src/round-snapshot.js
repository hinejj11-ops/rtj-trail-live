import {names,rounds,teams,roundPlayers} from './data.js';
import {strokesOnHole,vegasDigit} from './scoring-rules.js';
const six=names.slice(0,6);
export function roundSnapshot(id,scores,engine,holes=[]){
 const r=rounds.find(x=>x.id===id),players=roundPlayers(r);
 const gross=(p,h)=>engine.gross(id,p,h),net=(p,h)=>engine.net(id,p,h);
 const par=h=>holes.find(x=>x.round_id===id&&x.hole===h)?.par??(id==='backyard'||id==='short'||(id==='silver-pm'&&h>9)?3:4);
 const progress=Object.fromEntries(players.map(p=>[p,Array.from({length:r.holes},(_,i)=>gross(p,i+1)).filter(v=>v!==null).length]));
 const through=Object.fromEntries(players.map(p=>{let h=0;while(h<r.holes&&gross(p,h+1)!==null)h++;return [p,h];}));
 const ready=(ps,h)=>ps.every(p=>gross(p,h)!==null);
 const group=(ps,fn)=>{let holes=0;for(let h=1;h<=r.holes;h++)if(ready(ps,h)){holes++;fn(h);}return holes;};
 const result=(title,detail,played,required=r.holes,participants=[])=>({title,detail,played,required,through:participants.length?Math.min(...participants.map(p=>through[p]??0)):played});
 const compare=(a,b)=>a>b?'WIN':a<b?'LOSS':'TIED';
 const rows=[];
 if(r.format==='match'){
  for(const g of r.groups){const ps=g.filter(p=>six.includes(p));for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
   const a=ps[i],b=ps[j];let aw=0,bw=0;const played=group([a,b],h=>{const x=net(a,h),y=net(b,h);if(x<y)aw++;else if(y<x)bw++;});
   const lead=aw-bw;const state=played===0?'Not started':lead===0?'All square':(lead>0?a:b)+' '+Math.abs(lead)+' UP';
   rows.push(result(a+' vs '+b,state+' · '+aw+'–'+bw+' holes won',played,r.holes,[a,b]));
  }}
 }else if(id==='silver-pm'){
  const ts=teams[id],tot=[0,0,0],counts=[0,0],ninePts=[null,null];
  for(const [k,start] of [1,10].entries()){
   const sums=[0,0,0];
   for(let h=start;h<start+9;h++)if(ready(six,h)){
    counts[k]++;
    ts.forEach((t,i)=>{const digits=t.map(p=>{
     const entry=scores.find(s=>s.round_id===id&&s.player===p&&s.hole===h);
     const rank=holes.find(x=>x.round_id===id&&x.hole===h)?.stroke_index??h;
     return vegasDigit(id,p,h,entry,par(h),rank);
    }).sort((a,b)=>a-b);sums[i]+=10*digits[0]+digits[1];});
   }
   if(counts[k]===9){
    const order=[0,1,2].sort((a,b)=>sums[a]-sums[b]);
    const award=[0,0,0];
    for(let i=0;i<3;){let j=i+1;while(j<3&&sums[order[i]]===sums[order[j]])j++;const pts=Array.from({length:j-i},(_,v)=>3-(i+v)).reduce((x,y)=>x+y,0)/(j-i);for(let q=i;q<j;q++)award[order[q]]=pts;i=j;}
    ninePts[k]=award;award.forEach((v,i)=>tot[i]+=v);
   }
  }
  ts.forEach((t,i)=>rows.push(result(t.join(' + '),'HB '+(ninePts[0]?.[i]??'pending')+' pts · Short '+(ninePts[1]?.[i]??'pending')+' pts · Combined '+tot[i]+' pts',counts[0]+counts[1],r.holes,t)));
 }else if(id==='valley'||id==='lake'){
  const ts=teams[id],best=(t,h)=>Math.min(...t.map(p=>net(p,h)));
  for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length;j++){
   let a=0,b=0;const played=group([...ts[i],...ts[j]],h=>{const x=best(ts[i],h),y=best(ts[j],h);if(x<y)a++;else if(y<x)b++;});
   rows.push(result(ts[i].join(' + ')+' vs '+ts[j].join(' + '),(a===b?'All square':(a>b?ts[i]:ts[j]).join(' + ')+' '+Math.abs(a-b)+' UP')+' · '+a+'–'+b+' holes won',played,r.holes,[...ts[i],...ts[j]]));
  }
 }else if(id==='ross'){
  players.forEach(p=>rows.push(result(p,progress[p]?'Net Stableford '+engine.stable(id,p)+' pts':'Not started',progress[p],r.holes,[p])));
  rows.sort((a,b)=>Number((b.detail.match(/\d+(?= pts)/)||[0])[0])-Number((a.detail.match(/\d+(?= pts)/)||[0])[0]));
 }else if(id==='backyard'){
  const contests=[{label:'Team skins',groups:teams.backyard},{label:'Individual skins',groups:players.map(p=>[p])}];
  for(const contest of contests){const wins=contests[0]===contest?teams.backyard.map(()=>0):players.map(()=>0);let carry=0,played=0;
   for(let h=1;h<=9;h++){if(!ready(players,h))break;played++;carry++;const vals=contest.groups.map(t=>Math.min(...t.map(p=>gross(p,h)))),low=Math.min(...vals),w=vals.map((v,i)=>v===low?i:-1).filter(i=>i>=0);if(w.length===1){wins[w[0]]+=carry;carry=0;}}
   contest.groups.forEach((t,i)=>rows.push(result(contest.label+' · '+t.join(' + '),wins[i]+' skins'+(carry?' · '+carry+' pending carry':''),played,9,players)));
  }
 }else if(id==='short'){
  const credits=Object.fromEntries(six.map(p=>[p,0]));
  let played=0;for(let h=1;h<=18;h++)if(ready(six,h)){played++;const low=Math.min(...six.map(p=>net(p,h))),w=six.filter(p=>net(p,h)===low);w.forEach(p=>credits[p]+=1/w.length);}
  six.forEach(p=>rows.push(result(p,credits[p].toFixed(2)+' finale credits',progress[p])));
  rows.sort((a,b)=>parseFloat(b.detail)-parseFloat(a.detail));
 }
 const wildStableford=['valley','ridge','ross'].includes(id)?names.map(p=>{
  let pts=0,played=0;
  for(let h=1;h<=18;h++){
   const g=gross(p,h);if(g===null)continue;
   played++;
   const index=holes.find(x=>x.round_id===id&&x.hole===h)?.stroke_index??h;
   const strokes=strokesOnHole(id,p,h,index,'stableford');
   const entry=scores.find(x=>x.round_id===id&&x.player===p&&x.hole===h);
   const d=g-strokes+(p==='Richie'&&entry?.lifeline?1:0)-par(h);
   pts+=d<=-1?3:d===0?2:d===1?1:0;
  }
  return {player:p,points:pts,played,through:through[p]};
 }).sort((a,b)=>b.points-a.points||b.played-a.played):[];
 return {wildStableford,rows,progress,through,players,holes:r.holes,format:{match:'3-way net match play',vegas:'Net / gross Vegas',triple:'Triple Threat · team best ball',stableford:'Net Stableford',skins:'Gross team + individual skins',bestball:'Team best ball',finale:'Individual finale'}[r.format]};
}
