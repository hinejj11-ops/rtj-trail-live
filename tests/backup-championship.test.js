import test from 'node:test';
import assert from 'node:assert/strict';
import {backupChampionship,backupGroups,backupPrizes} from '../src/backup-championship.js';
import {stablefordStrokes,skillsHoles} from '../src/data.js';
import {defaultAllowance,strokesOnHole,netScore} from '../src/scoring-rules.js';

const five=['Jimmy','Kevin','Jeff','Nate','Richie'];
test('backup prize pools reconcile to $560 from six golfers',()=>{
 assert.equal(Object.values(backupPrizes).reduce((a,b)=>a+b,0),560);
 assert.equal(backupPrizes.threeDay,260);
 assert.equal(backupPrizes.grandNational,130);
});
test('all Grand National groups contain five golfers and exclude Brittany',()=>{
 for(const id of ['links','lake','short'])assert.deepEqual(backupGroups[id].flat().sort(),five.slice().sort());
});
test('empty backup scores do not award championship points',()=>{
 const result=backupChampionship([],[],[],true);
 assert.deepEqual(result.boards.map(b=>b.rounds),[0,0]);
 assert.deepEqual(result.boards.map(b=>b.expected),[6,3]);
});
test('GN 95 percent individual allowances use unrounded course handicap',()=>{
 assert.deepEqual(five.map(p=>stablefordStrokes.links[p]),[6,11,19,22,31]);
});
test('all three GN events count equally and exclude Brittany',()=>{
 const scores=[];
 for(const id of ['links','lake','short'])for(const player of [...five,'Brittany'])for(let hole=1;hole<=18;hole++)scores.push({round_id:id,player,hole,gross:id==='short'?3:4});
 const before=JSON.stringify(scores);
 const board=backupChampionship(scores,[],[],false).boards.find(b=>b.id==='grandNational');
 assert.equal(board.rounds,3);
 assert.deepEqual(board.eligible,five);
 assert.equal(Object.hasOwn(board.values,'Brittany'),false);
 assert.equal(Object.values(board.values).reduce((a,b)=>a+b,0),75);
 assert.equal(JSON.stringify(scores),before);
});
test('verified scorecards are required to award GN championship points',()=>{
 const scores=five.flatMap(player=>Array.from({length:18},(_,i)=>({round_id:'links',player,hole:i+1,gross:4})));
 const noSub=backupChampionship(scores,[],[],true).boards.find(b=>b.id==='grandNational');
 assert.equal(noSub.rounds,0);
 const submissions=five.map(player=>({round_id:'links',player}));
 const verified=backupChampionship(scores,[],submissions,true).boards.find(b=>b.id==='grandNational');
 assert.equal(verified.rounds,1);
});

test('Backup mode has no Wild Card leaderboard or prize pools',()=>{
 const result=backupChampionship([],[],[],true);
 assert.deepEqual(result.boards.map(b=>b.id),['threeDay','grandNational']);
 assert.equal(Object.hasOwn(backupPrizes,'wild'),false);
 assert.equal(Object.hasOwn(backupPrizes,'wildSkills'),false);
 assert.deepEqual(backupPrizes,{threeDay:260,grandNational:130,threeDaySkills:100,grandNationalSkills:70});
});

test('Ross Bridge earns 1.5x Backup championship points and Backyard stays half weight',()=>{
 const six=['Jimmy','Brittany','Kevin','Jeff','Nate','Richie'];
 const scores=six.flatMap(player=>Array.from({length:18},(_,i)=>({round_id:'ross',player,hole:i+1,gross:4})));
 const result=backupChampionship(scores,[],[],false);
 const event=result.details.threeDay.find(x=>x.id==='ross');
 assert.equal(event.multiplier,1.5);
 assert.equal(result.boards.find(b=>b.id==='threeDay').rounds,1);
 assert.equal(Object.values(event.award).reduce((a,b)=>a+b,0),30);
});

test('Backup Backyard awards one stroke to Richie on all nine holes only',()=>{
 assert.equal(defaultAllowance('backyard','Richie','backup-stableford'),9);
 for(let h=1;h<=9;h++){
  assert.equal(strokesOnHole('backyard','Richie',h,h,'backup-stableford'),1);
  assert.equal(netScore('backyard','Richie',h,{gross:3},h,'backup-stableford'),2);
  assert.equal(strokesOnHole('backyard','Brittany',h,h,'backup-stableford'),0);
  assert.equal(strokesOnHole('backyard','Richie',h,h,'primary'),0);
 }
});
test('Backup Backyard uses combined team Stableford with half-weight standings',()=>{
 const six=['Jimmy','Brittany','Kevin','Jeff','Nate','Richie'];
 const scores=six.flatMap(player=>Array.from({length:9},(_,i)=>({round_id:'backyard',player,hole:i+1,gross:3})));
 const before=JSON.stringify(scores);
 const result=backupChampionship(scores,[],[],false);
 const event=result.details.threeDay.find(x=>x.id==='backyard');
 assert.equal(event.multiplier,0.5);
 assert.equal(result.boards.find(b=>b.id==='threeDay').rounds,1);
 assert.equal(result.boards.find(b=>b.id==='threeDay').values.Richie,5);
 assert.equal(result.boards.find(b=>b.id==='threeDay').values.Brittany,5);
 assert.equal(result.boards.find(b=>b.id==='threeDay').values.Jimmy,1.25);
 assert.equal(result.boards.find(b=>b.id==='threeDay').values.Kevin,1.25);
 assert.equal(JSON.stringify(scores),before);
});

test('GN Short designates two independent skills slots on holes 6 and 14',()=>{
 assert.deepEqual(skillsHoles.short,{ctp:14,ld:6});
 assert.deepEqual(skillsHoles.backyard,{ctp:9});
});
