import {rounds,roundPlayers,courseHandicap,heartbreakerStrokes,silverShortStrokes,gnShortStrokes,tripleStrokes,stablefordStrokes,lifelineLimits} from './data.js';
const byId=id=>rounds.find(r=>r.id===id);
export const holeStrokes=(total,rank,holes=18)=>Math.floor(total/holes)+(rank<=total%holes?1:0);
export function allowance(id,player,mode='primary',hole=1){
 const r=byId(id);
 if(id==='backyard')return 0;
 if(mode==='stableford'||id==='ross')return stablefordStrokes[id]?.[player]??0;
 if(id==='silver-pm')return hole<=9?(heartbreakerStrokes[player]||0):(silverShortStrokes[player]||0);
 if(id==='short')return gnShortStrokes[player]||0;
 if(id==='valley')return tripleStrokes[player]||0;
 const ps=r.format==='match'?(r.groups.find(g=>g.includes(player))||[]).filter(p=>p!=='Mason'):roundPlayers(r).filter(p=>p!=='Mason');
 const base=Math.min(...ps.map(p=>courseHandicap(r,p)));
 return Math.max(0,courseHandicap(r,player)-base);
}
export function strokesOnHole(id,player,hole,rank,mode='primary'){
 const n=allowance(id,player,mode,hole);
 if(id==='backyard')return 0;
 if(id==='silver-pm'){
  const nineRank=hole>9&&rank>9?rank-9:rank;
  return holeStrokes(n,nineRank,9);
 }
 return holeStrokes(n,rank,18);
}
export function lifelineEligible(id,hole,rank){
 if(!lifelineLimits[id])return false;
 const modes=id==='valley'||id==='ridge'||id==='ross'?['primary','stableford']:['primary'];
 return modes.every(mode=>strokesOnHole(id,'Richie',hole,rank,mode)>0);
}
export function netScore(id,player,hole,score,rank,mode='primary'){
 if(!score)return null;
 return score.gross-strokesOnHole(id,player,hole,rank,mode)+(player==='Richie'&&score.lifeline&&lifelineEligible(id,hole,rank)?1:0);
}
export function vegasDigit(id,player,hole,score,par,rank){
 if(!score)return null;
 const cappedGross=Math.min(score.gross,par*2,par===5?9:Infinity);
 return Math.max(0,cappedGross-strokesOnHole(id,player,hole,rank));
}
