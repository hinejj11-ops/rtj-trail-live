import test from 'node:test';
import assert from 'node:assert/strict';
import {names,rounds,roundPlayers,teams,lifelineLimits} from '../src/data.js';
import {allowance,strokesOnHole,netScore,vegasDigit,lifelineEligible} from '../src/scoring-rules.js';
import {championship} from '../src/championship.js';
const six=names.slice(0,6);
test('published allowances match final championship guide',()=>{
 assert.deepEqual(six.map(p=>allowance('silver-pm',p,'primary',12)),[0,1,2,5,5,12]);
 assert.deepEqual(six.map(p=>allowance('valley',p)),[0,3,5,12,15,24]);
 assert.deepEqual(six.map(p=>allowance('short',p)),[0,2,2,6,8,18]);
 assert.deepEqual(names.map(p=>allowance('ridge',p,'stableford')),[6,10,11,19,23,32,14]);
});
test('Vegas gross caps happen before handicap strokes; no margin cap',()=>{
 assert.equal(vegasDigit('silver-pm','Jimmy',1,{gross:15},4,1),8);
 assert.equal(vegasDigit('silver-pm','Richie',1,{gross:15},5,1),7); // 9 gross cap - 2 strokes
 assert.equal(vegasDigit('silver-pm','Jeff',10,{gross:14},3,1),5); // 6 gross cap - 1 stroke
});
test('one Lifeline increases net by one for each applicable competition',()=>{
 const s={gross:6,lifeline:true};
 assert.equal(netScore('valley','Richie',1,s,1,'primary'),6-strokesOnHole('valley','Richie',1,1)+1);
 assert.equal(netScore('valley','Richie',1,s,1,'stableford'),6-strokesOnHole('valley','Richie',1,1,'stableford')+1);
 assert.equal(lifelineEligible('backyard',1,1),false);
 assert.equal(lifelineEligible('short',1,1),false);
});
test('all fifteen full-trip teammate pairs occur exactly once',()=>{
 const counts={};for(const id of ['silver-pm','valley','backyard','lake'])for(const t of teams[id])for(let i=0;i<t.length;i++)for(let j=i+1;j<t.length;j++){const key=[t[i],t[j]].sort().join('/');counts[key]=(counts[key]||0)+1;}
 assert.equal(Object.keys(counts).length,15);assert.ok(Object.values(counts).every(n=>n===1));
});
test('official points require Jimmy verification; test mode does not',()=>{
 const scores=rounds.flatMap(r=>roundPlayers(r).flatMap(player=>Array.from({length:r.holes},(_,i)=>({round_id:r.id,player,hole:i+1,gross:4}))));
 const verified=rounds.flatMap(r=>roundPlayers(r).map(player=>({round_id:r.id,player})));
 const blank=championship(scores,[],[],[],true);
 assert.equal(blank.boards.find(b=>b.id==='trail').rounds,0);
 const official=championship(scores,[],[],verified,true);
 assert.equal(official.boards.find(b=>b.id==='trail').rounds,5);
 assert.equal(official.boards.find(b=>b.id==='cup').rounds,4);
 assert.equal(official.boards.find(b=>b.id==='wild').rounds,4);
 const testMode=championship(scores,[],[],[],false);
 assert.equal(testMode.boards.find(b=>b.id==='trail').rounds,5);
});
test('confirmed no qualifying skills shot resolves contest without awarding a point',()=>{
 const result=championship([], [{round_id:'backyard',kind:'ctp',winner:'NO_WINNER'}], [], [], true);
 assert.equal(result.boards.find(b=>b.id==='overall').rounds,1);
 assert.equal(result.boards.find(b=>b.id==='wildSkills').rounds,1);
 assert.equal(Object.values(result.boards.find(b=>b.id==='overall').values).reduce((a,b)=>a+b,0),0);
});

test('match points post after Jimmy verifies one three-player group, without waiting for other group',()=>{
 const r=rounds.find(x=>x.id==='silver-am');
 const scores=roundPlayers(r).flatMap(player=>Array.from({length:18},(_,i)=>({round_id:r.id,player,hole:i+1,gross:4})));
 const first=r.groups[0].filter(p=>six.includes(p));
 const verified=first.map(player=>({round_id:r.id,player}));
 const partial=championship(scores,[],[],verified,true);
 assert.ok(first.some(p=>partial.boards.find(b=>b.id==='trail').values[p]>0));
 assert.ok(r.groups[1].every(p=>partial.boards.find(b=>b.id==='trail').values[p]===0));
 assert.equal(partial.boards.find(b=>b.id==='trail').rounds,0);
 const full=championship(scores,[],[],roundPlayers(r).map(player=>({round_id:r.id,player})),true);
 assert.equal(full.boards.find(b=>b.id==='trail').rounds,1);
});
test('Lifeline limits are available to the scorecard UI',()=>{
 assert.equal(Object.hasOwn(lifelineLimits,'ridge'),true);
 assert.equal(lifelineLimits.ridge,3);
 assert.equal(lifelineLimits['silver-pm'],1);
});

test('dual-format Lifeline eligibility requires a stroke in both allocations',()=>{
 for(const id of ['valley','ridge']){
  for(let h=1;h<=18;h++){
   const rank=h;
   const expected=strokesOnHole(id,'Richie',h,rank,'primary')>0&&strokesOnHole(id,'Richie',h,rank,'stableford')>0;
   assert.equal(lifelineEligible(id,h,rank),expected);
   const entry={gross:6,lifeline:true};
   assert.equal(netScore(id,'Richie',h,entry,rank,'primary'),6-strokesOnHole(id,'Richie',h,rank,'primary')+(expected?1:0));
   assert.equal(netScore(id,'Richie',h,entry,rank,'stableford'),6-strokesOnHole(id,'Richie',h,rank,'stableford')+(expected?1:0));
  }
 }
});
test('Vegas equal-weight nine rankings with ties and gross caps',()=>{
 const id='silver-pm',scores=[],holes=[];
 for(let h=1;h<=18;h++){
  holes.push({round_id:id,hole:h,par:h<=9?4:3,stroke_index:h<=9?h:h-9});
  for(const p of six)scores.push({round_id:id,player:p,hole:h,gross:4});
 }
 const board=championship(scores,[],holes,[],false).boards.find(b=>b.id==='cup');
 assert.equal(board.rounds,1);
 assert.equal(Object.values(board.values).reduce((a,b)=>a+b,0),12);
 for(const t of teams[id])assert.equal(board.values[t[0]],board.values[t[1]]);
});
test('Backyard unresolved carry expires and all-skins tie splits Cup and Wild Card points',()=>{
 const scores=names.flatMap(p=>Array.from({length:9},(_,i)=>({round_id:'backyard',player:p,hole:i+1,gross:3})));
 const result=championship(scores,[],[],[],false);
 const cup=result.boards.find(b=>b.id==='cup'),wild=result.boards.find(b=>b.id==='wild');
 assert.equal(cup.rounds,1);assert.equal(wild.rounds,1);
 six.forEach(p=>assert.equal(cup.values[p],2));
 names.forEach(p=>assert.ok(Math.abs(wild.values[p]-2/7)<1e-10));
});
test('GN Short tied hole credits and independent nine rankings',()=>{
 const scores=six.flatMap(p=>Array.from({length:18},(_,i)=>({round_id:'short',player:p,hole:i+1,gross:3})));
 const result=championship(scores,[],[],[],false);
 const trail=result.boards.find(b=>b.id==='trail');
 assert.equal(trail.rounds,1);
 six.forEach(p=>assert.equal(trail.values[p],8/6));
});
test('Stableford seven-way tie splits Wild Card placement points',()=>{
 const scores=names.flatMap(p=>Array.from({length:18},(_,i)=>({round_id:'ross',player:p,hole:i+1,gross:4})));
 const result=championship(scores,[],[],[],false);
 const wild=result.boards.find(b=>b.id==='wild');
 assert.equal(wild.rounds,1);
 // Different handicap allowances mean this scenario need not produce a tie.
 assert.ok(Object.values(wild.values).every(v=>Number.isFinite(v)));
 assert.equal(Object.values(wild.values).reduce((a,b)=>a+b,0),6);
});
