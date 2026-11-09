// Backup mode standings: Brittany departs after Backyard. Standard and Appendix A are unchanged.
import {names,rounds,teams} from './data.js';
import {netScore,vegasDigit} from './scoring-rules.js';
export const backupGroups={
 links:[['Jimmy','Kevin','Jeff'],['Nate','Richie']],
 lake:[['Jimmy','Jeff','Kevin'],['Nate','Richie']],
 short:[['Kevin','Jeff','Nate'],['Jimmy','Richie']]
};
export const backupPrizes={threeDay:270,grandNational:150,threeDaySkills:100,grandNationalSkills:40};
const six=names.slice(0,6),five=six.filter(n=>n!=='Brittany');
const scales={six:[10,8,6,4,2,0],seven:[12,10,8,6,4,2,0],five:[10,7.5,5,2.5,0],threeTeams:[10,5,0],twoTeams:[5,0]};
export function awardRanks(values,scale,descending=true){
 const entries=Object.entries(values).sort((a,b)=>descending?b[1]-a[1]:a[1]-b[1]);
 const out={};let i=0;
 while(i<entries.length){let j=i+1;while(j<entries.length&&Math.abs(entries[j][1]-entries[i][1])<1e-9)j++;
  const avg=entries.slice(i,j).reduce((s,_,k)=>s+(scale[i+k]||0),0)/(j-i);
  for(let k=i;k<j;k++)out[entries[k][0]]=avg;i=j;
 }return out;
}
export function backupChampionship(scores,holes,submissions=[],requireVerification=true){
 const sm=new Map(scores.map(s=>[s.round_id+'|'+s.player+'|'+s.hole,s]));
 const hm=new Map(holes.map(h=>[h.round_id+'|'+h.hole,h]));
 const verified=new Set(submissions.map(s=>s.round_id+'|'+s.player));
 const par=(id,h)=>hm.get(id+'|'+h)?.par??(id==='backyard'||id==='short'||id==='silver-pm'&&h>9?3:4);
 const idx=(id,h)=>hm.get(id+'|'+h)?.stroke_index??h;
 const gross=(id,p,h)=>sm.get(id+'|'+p+'|'+h)?.gross??null;
 const net=(id,p,h,mode='primary')=>netScore(id,p,h,sm.get(id+'|'+p+'|'+h),idx(id,h),mode);
 const shortNet=(p,h)=>net('short',p,h);
 const complete=(id,ps)=>ps.every(p=>Array.from({length:rounds.find(r=>r.id===id).holes},(_,i)=>gross(id,p,i+1)!==null).every(Boolean)&&(!requireVerification||verified.has(id+'|'+p)));
 const values=ps=>Object.fromEntries(ps.map(p=>[p,0]));
 const threeDay=values(six),grandNational=values(five),details={threeDay:[],grandNational:[]};
 const add=(key,id,award,multiplier=1)=>{const board={threeDay,grandNational}[key];for(const p of Object.keys(board))board[p]+=(award[p]||0)*multiplier;details[key].push({id,award,multiplier});};
 const stable=(id,p)=>Array.from({length:18},(_,i)=>{const h=i+1,d=net(id,p,h,['links','lake'].includes(id)?'stableford':'stableford')-par(id,h);return d<=-1?3:d===0?2:d===1?1:0;}).reduce((a,b)=>a+b,0);
 const matchRanks=id=>{
  const records=Object.fromEntries(six.map(p=>[p,{points:0,wins:0,diff:0}]));
  for(const group of rounds.find(r=>r.id===id).groups){const ps=group.filter(p=>six.includes(p));
   for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
    const a=ps[i],b=ps[j];let aw=0,bw=0;
    for(let h=1;h<=18;h++){const x=net(id,a,h),y=net(id,b,h);if(x!==null&&y!==null){if(x<y)aw++;else if(y<x)bw++;}}
    records[a].points+=aw>bw?2:aw===bw?1:0;records[b].points+=bw>aw?2:aw===bw?1:0;
    records[a].wins+=aw;records[b].wins+=bw;records[a].diff+=aw-bw;records[b].diff+=bw-aw;
   }
  }
  const ordered=[...six].sort((a,b)=>records[b].points-records[a].points||records[b].wins-records[a].wins||records[b].diff-records[a].diff);
  const out={};let i=0;while(i<ordered.length){let j=i+1;const eq=(a,b)=>a.points===b.points&&a.wins===b.wins&&a.diff===b.diff;
   while(j<ordered.length&&eq(records[ordered[i]],records[ordered[j]]))j++;
   const pts=scales.six.slice(i,j).reduce((a,b)=>a+b,0)/(j-i);for(let k=i;k<j;k++)out[ordered[k]]=pts;i=j;
  }return out;
 };
 for(const id of ['silver-am','ridge'])if(complete(id,six))add('threeDay',id,matchRanks(id));
 if(complete('ross',six))add('threeDay','ross',awardRanks(Object.fromEntries(six.map(p=>[p,stable('ross',p)])),scales.six));
 if(complete('valley',six)){
  const ts=teams.valley;let a=0,b=0;for(let h=1;h<=18;h++){const x=Math.min(...ts[0].map(p=>net('valley',p,h))),y=Math.min(...ts[1].map(p=>net('valley',p,h)));if(x<y)a++;else if(y<x)b++;}
  const awards=a===b?[2.5,2.5]:a>b?[5,0]:[0,5],out=values(six);
  ts.forEach((t,i)=>t.forEach(p=>out[p]=awards[i]));add('threeDay','valley',out);
 }
 const skins=(id,groups,count)=>{const wins=groups.map(()=>0);let carry=0;for(let h=1;h<=count;h++){carry++;const vals=groups.map(t=>Math.min(...t.map(p=>gross(id,p,h)))),m=Math.min(...vals),w=vals.map((v,i)=>v===m?i:-1).filter(i=>i>=0);if(w.length===1){wins[w[0]]+=carry;carry=0;}}return wins;};
 if(complete('backyard',six)){
  const ts=teams.backyard,counts=skins('backyard',ts,9),awards=awardRanks(Object.fromEntries(counts.map((v,i)=>[i,v])),scales.threeTeams),out=values(six);
  ts.forEach((t,i)=>t.forEach(p=>out[p]=awards[i]));add('threeDay','backyard',out,.5);
 }
 if(complete('silver-pm',six)){
  const ts=teams['silver-pm'],out=values(six),nineAwards=[];
  for(const start of [1,10]){
   const sums=ts.map(t=>{let total=0;for(let h=start;h<start+9;h++){const digits=t.map(p=>vegasDigit('silver-pm',p,h,sm.get('silver-pm|'+p+'|'+h),par('silver-pm',h),idx('silver-pm',h))).sort((a,b)=>a-b);total+=10*digits[0]+digits[1];}return total;});
   nineAwards.push(awardRanks(Object.fromEntries(sums.map((v,i)=>[i,v])),scales.threeTeams,false));
  }
  ts.forEach((t,i)=>t.forEach(p=>out[p]=(nineAwards[0][i]+nineAwards[1][i])/2));add('threeDay','silver-pm',out);
 }
 for(const id of ['links','lake'])if(complete(id,five))add('grandNational',id,awardRanks(Object.fromEntries(five.map(p=>[p,stable(id,p)])),scales.five));
 if(complete('short',five)){
  const credits=Object.fromEntries(five.map(p=>[p,0]));
  for(let h=1;h<=18;h++){const m=Math.min(...five.map(p=>shortNet(p,h)));const winners=five.filter(p=>shortNet(p,h)===m);for(const p of winners)credits[p]+=1/winners.length;}
  add('grandNational','short',awardRanks(credits,scales.five));
 }
 return {boards:[{id:'threeDay',name:'Three-Day Champion',values:threeDay,eligible:six,prize:270,rounds:details.threeDay.length,expected:6},{id:'grandNational',name:'Grand National Champion',values:grandNational,eligible:five,prize:150,rounds:details.grandNational.length,expected:3}],details,groups:backupGroups};
}
