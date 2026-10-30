import {names,rounds,teams,skillsHoles,wildCardSkillsRounds} from './data.js';
import {netScore,vegasDigit} from './scoring-rules.js';
const six=names.slice(0,6),seven=names;
const byId=id=>rounds.find(r=>r.id===id);
export function championship(scores,skills,holes,submissions=[],requireVerification=true){
 const sm=new Map(scores.map(s=>[s.round_id+'|'+s.player+'|'+s.hole,s]));
 const hm=new Map(holes.map(h=>[h.round_id+'|'+h.hole,h]));
 const sub=new Set(submissions.map(s=>s.round_id+'|'+s.player));
 const par=(id,h)=>hm.get(id+'|'+h)?.par??(id==='backyard'||id==='short'||id==='silver-pm'&&h>9?3:4);
 const rank=(id,h)=>hm.get(id+'|'+h)?.stroke_index??h;
 const gross=(id,p,h)=>sm.get(id+'|'+p+'|'+h)?.gross??null;
 const net=(id,p,h,mode='primary')=>netScore(id,p,h,sm.get(id+'|'+p+'|'+h),rank(id,h),mode);
 const done=(id,p)=>Array.from({length:byId(id).holes},(_,i)=>gross(id,p,i+1)!==null).every(Boolean);
 const complete=(id,ps)=>ps.every(p=>done(id,p)&&(!requireVerification||sub.has(id+'|'+p)));
 const points=(ps)=>Object.fromEntries(ps.map(p=>[p,0]));
 const trail=points(six),cup=points(six),wild=points(seven),overall=points(six),wildSkills=points(seven);
 const details={trail:[],cup:[],wild:[],overall:[],wildSkills:[]};
 const add=(board,id,award)=>{for(const [p,v] of Object.entries(award))board[p]=(board[p]||0)+v;details[id].push(award);};
 const rankAwards=(values,prizes)=>{const ordered=Object.entries(values).sort((a,b)=>b[1]-a[1]),out=points(Object.keys(values));let i=0;while(i<ordered.length){let j=i+1;while(j<ordered.length&&Math.abs(ordered[j][1]-ordered[i][1])<1e-8)j++;const pts=ordered.slice(i,j).reduce((a,_,k)=>a+(prizes[i+k]||0),0)/(j-i);for(let k=i;k<j;k++)out[ordered[k][0]]=pts;i=j;}return out;};
 const stable=(id,p)=>Array.from({length:18},(_,i)=>{const h=i+1,n=net(id,p,h,'stableford');if(n===null)return 0;const d=n-par(id,h);return d<=-1?3:d===0?2:d===1?1:0;}).reduce((a,b)=>a+b,0);
 const match=(id,a,b)=>{let aw=0,bw=0,half=0;for(let h=1;h<=18;h++){const x=net(id,a,h),y=net(id,b,h);if(x<y)aw++;else if(y<x)bw++;else half++;}return {a:aw,b:bw,half};};
 for(const id of ['silver-am','ridge','links']){
  const r=byId(id);if(!complete(id,six))continue;
  const out=points(six);
  for(const group of r.groups){const ps=group.filter(p=>six.includes(p));for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
   const a=ps[i],b=ps[j],m=match(id,a,b);
   out[a]+=(m.a>m.b?1:m.a===m.b?.5:0)+(m.a+.5*m.half)/18;
   out[b]+=(m.b>m.a?1:m.a===m.b?.5:0)+(m.b+.5*m.half)/18;
  }}
  add(trail,'trail',out);
 }
 if(complete('ross',six))add(trail,'trail',rankAwards(Object.fromEntries(six.map(p=>[p,stable('ross',p)])),[6,4,3,2,1,0]));
 if(complete('short',six)){
  const credits=(start,end)=>{const c=points(six);for(let h=start;h<=end;h++){const min=Math.min(...six.map(p=>net('short',p,h))),w=six.filter(p=>net('short',p,h)===min);for(const p of w)c[p]+=1/w.length;}return c;};
  const a=rankAwards(credits(1,9),[3,2,1.5,1,.5,0]),b=rankAwards(credits(10,18),[5,3.5,2.5,1.5,.5,0]);
  add(trail,'trail',Object.fromEntries(six.map(p=>[p,a[p]+b[p]])));
 }
 // Each nine is a separate net Vegas contest. Gross caps precede strokes.
 if(complete('silver-pm',six)){
  const ts=teams['silver-pm'],out=points(six),tot=[0,0,0];
  for(const start of [1,10]){
   const sums=[0,0,0];
   for(let h=start;h<start+9;h++){
    ts.forEach((t,i)=>{
     const digits=t.map(p=>vegasDigit('silver-pm',p,h,sm.get('silver-pm|'+p+'|'+h),par('silver-pm',h),rank('silver-pm',h))).sort((a,b)=>a-b);
     sums[i]+=10*digits[0]+digits[1];
    });
   }
   const nine=rankAwards(Object.fromEntries(sums.map((v,i)=>[String(i),-v])),[3,2,1]);
   for(let i=0;i<3;i++)tot[i]+=nine[String(i)];
  }
  const awards=rankAwards(Object.fromEntries(ts.map((_,i)=>[String(i),tot[i]])),[4,2,0]);
  ts.forEach((t,i)=>t.forEach(p=>out[p]=awards[String(i)]));add(cup,'cup',out);
 }
 if(complete('valley',six)){
  const ts=teams.valley;let a=0,b=0;for(let h=1;h<=18;h++){const x=Math.min(...ts[0].map(p=>net('valley',p,h))),y=Math.min(...ts[1].map(p=>net('valley',p,h)));if(x<y)a++;else if(y<x)b++;}
  const out=points(six);ts[0].forEach(p=>out[p]=a>b?4:a===b?2:0);ts[1].forEach(p=>out[p]=b>a?4:a===b?2:0);add(cup,'cup',out);
 }
 const skins=(groups)=>{const wins=groups.map(()=>0);let carry=0;for(let h=1;h<=9;h++){carry++;const vals=groups.map(t=>Math.min(...t.map(p=>gross('backyard',p,h)))),m=Math.min(...vals),w=vals.map((v,i)=>v===m?i:-1).filter(i=>i>=0);if(w.length===1){wins[w[0]]+=carry;carry=0;}}return wins;}; // Final-hole carry expires.
 if(complete('backyard',six)){
  const ts=teams.backyard,counts=skins(ts),awards=rankAwards(Object.fromEntries(counts.map((v,i)=>[String(i),v])),[4,2,0]),out=points(six);
  ts.forEach((t,i)=>t.forEach(p=>out[p]=awards[String(i)]));add(cup,'cup',out);
 }
 if(complete('lake',six)){
  const ts=teams.lake,out=points(six);for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
   let a=0,b=0;for(let h=1;h<=18;h++){const x=Math.min(...ts[i].map(p=>net('lake',p,h))),y=Math.min(...ts[j].map(p=>net('lake',p,h)));if(x<y)a++;else if(y<x)b++;}
   ts[i].forEach(p=>out[p]+=a>b?2:a===b?1:0);ts[j].forEach(p=>out[p]+=b>a?2:a===b?1:0);
  }add(cup,'cup',out);
 }
 for(const id of ['valley','ridge','ross'])if(complete(id,seven))add(wild,'wild',rankAwards(Object.fromEntries(seven.map(p=>[p,stable(id,p)])),[3,2,1,0,0,0,0]));
 if(complete('backyard',seven)){
  const counts=skins(seven.map(p=>[p])),out=points(seven),max=Math.max(...counts);
  const leaders=seven.filter((p,i)=>counts[i]===max);for(const p of leaders)out[p]=2/leaders.length;add(wild,'wild',out);
 }
 const ctp={},ld={},wcCtp={},wcLd={};let overallRecorded=0,wildRecorded=0;
 for(const entry of skills){
  const allowed=skillsHoles[entry.round_id];
  if(!allowed||!Object.hasOwn(allowed,entry.kind)||!entry.winner)continue;
  const wcRound=wildCardSkillsRounds.includes(entry.round_id);
  if(entry.winner==='NO_WINNER'){overallRecorded++;if(wcRound)wildRecorded++;continue;}
  const eligible=six.includes(entry.winner),wc=wildCardSkillsRounds.includes(entry.round_id);
  if(eligible){
   overall[entry.winner]++;overallRecorded++;
   const counter=entry.kind==='ctp'?ctp:ld;counter[entry.winner]=(counter[entry.winner]||0)+1;
  }
  if(wc&&seven.includes(entry.winner)){
   wildSkills[entry.winner]++;wildRecorded++;
   const counter=entry.kind==='ctp'?wcCtp:wcLd;counter[entry.winner]=(counter[entry.winner]||0)+1;
  }
 }
 const boards=[
  {id:'trail',name:'Individual Trail Championship',prize:250,values:trail,eligible:six,rounds:details.trail.length,expected:5},
  {id:'cup',name:'RTJ Cup',prize:125,values:cup,eligible:six,rounds:details.cup.length,expected:4},
  {id:'wild',name:'Wild Card Challenge',prize:125,values:wild,eligible:seven,rounds:details.wild.length,expected:4},
  {id:'overall',name:'Overall Skills',prize:75,values:overall,eligible:six,rounds:overallRecorded,expected:16,ctp,ld},
  {id:'wildSkills',name:'Wild Card Skills',prize:50,values:wildSkills,eligible:seven,rounds:wildRecorded,expected:7,ctp:wcCtp,ld:wcLd}
 ];
 return {boards,done,stable,net,gross,details};
}
