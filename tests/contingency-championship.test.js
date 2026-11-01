import test from 'node:test';
import assert from 'node:assert/strict';
import {awardRanks,contingencyGroups,contingencyPrizes,contingencyChampionship} from '../src/contingency-championship.js';
test('individual six-person scale and tied places',()=>{
 assert.deepEqual(awardRanks({A:6,B:5,C:4,D:3,E:2,F:1},[10,8,6,4,2,0]),{A:10,B:8,C:6,D:4,E:2,F:0});
 assert.deepEqual(awardRanks({A:3,B:2,C:2,D:1},[10,8,6,4]),{A:10,B:7,C:7,D:4});
});
test('team scales and tied teams',()=>{
 assert.deepEqual(awardRanks({A:3,B:2,C:1},[10,5,0]),{A:10,B:5,C:0});
 assert.deepEqual(awardRanks({A:4,B:4},[5,0]),{A:2.5,B:2.5});
});
test('contingency pairings exclude Brittany and preserve all five',()=>{
 const five=['Jimmy','Kevin','Jeff','Nate','Richie'];
 for(const groups of Object.values(contingencyGroups))assert.deepEqual(groups.flat().sort(),five.slice().sort());
 assert.deepEqual(contingencyGroups.lake,[['Jimmy','Jeff','Kevin'],['Nate','Richie']]);
});
test('payout reconciliation',()=>{
 assert.equal(Object.values(contingencyPrizes).reduce((a,b)=>a+b,0),620);
 assert.equal(contingencyPrizes.fourDay+contingencyPrizes.wild+contingencyPrizes.finalDay,465);
});
test('empty results do not award points',()=>{
 const result=contingencyChampionship([],[],[],true);
 assert.deepEqual(result.boards.map(b=>b.rounds),[0,0,0]);
 assert.equal(result.boards[0].eligible.length,6);
 assert.equal(result.boards[1].eligible.length,7);
 assert.equal(result.boards[2].eligible.length,5);
});
