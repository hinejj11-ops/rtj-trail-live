import test from 'node:test';
import assert from 'node:assert/strict';
import {backupChampionship,backupGroups,backupPrizes} from '../src/backup-championship.js';
import {stablefordStrokes} from '../src/data.js';

const five=['Jimmy','Kevin','Jeff','Nate','Richie'];
test('backup prize pools reconcile to $560 from six golfers',()=>{
 assert.equal(Object.values(backupPrizes).reduce((a,b)=>a+b,0),560);
 assert.equal(backupPrizes.threeDay,270);
 assert.equal(backupPrizes.grandNational,150);
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
 assert.deepEqual(backupPrizes,{threeDay:270,grandNational:150,threeDaySkills:100,grandNationalSkills:40});
});
