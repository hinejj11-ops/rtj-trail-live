import test from 'node:test';
import assert from 'node:assert/strict';
import {names,rounds,roundPlayers,teams} from '../src/data.js';
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
