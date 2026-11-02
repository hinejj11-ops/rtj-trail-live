import {matchSummary} from './match-visual.js';
import {grossScoreHtml} from './score-symbol.js';
import {names,teams} from './data.js';
import {strokesOnHole} from './scoring-rules.js';
export function liveFormat(id,score,net,par,rank,esc,submissions=[],testMode=false){
 const progress=(players,through,total)=>!testMode&&players.every(p=>submissions.some(x=>x.round_id===id&&x.player===p))?'Final':'Thru '+through;
 const six=names.slice(0,6),seven=names,ts=teams[id];
 const gross=(p,h)=>score(p,h)?.gross??null;
 const label=t=>t.join(' + ');
 const grossCell=(p,h,netValue=null)=>{
  const entry=score(p,h);
  if(!entry||entry.gross==null)return '—';
  const applied=netValue===null?0:Math.max(0,entry.gross-netValue);
  const dots=applied?'<span class="match-stroke-dots" title="'+applied+' applied handicap stroke(s)" aria-label="'+applied+' applied handicap stroke(s)">'+Array.from({length:applied},()=>'<i class="match-stroke-dot"></i>').join('')+'</span>':'';
  return '<span class="match-net-value" title="'+esc(p)+' · Gross '+entry.gross+(netValue===null?'':' · Net '+netValue)+'">'+grossScoreHtml(entry.gross,par(h))+dots+'</span>';
 };
 const card=(title,players,value,n=18,highWins=false,mode='points',display=null)=>{
  const heads=[],pars=[],rows=players.map(()=>[]),totals=players.map(()=>0),wins=players.map(()=>0),segments=[];let thru=0,compared=0;
  for(let h=1;h<=n;h++){
   heads.push('<th>'+h+'</th>');pars.push('<td>'+par(h)+'</td>');
   const v=players.map((_,i)=>value(i,h)),valid=v.every(x=>x!==null);
   if(valid&&h===thru+1)thru++;
   const best=valid?(highWins?Math.max(...v):Math.min(...v)):null;
   if(mode==='holes'&&players.length===2)segments.push(!valid?0:v[0]===v[1]?3:v[0]<v[1]?1:2);
   if(valid){compared++;if(mode==='holes'){const winners=v.map((x,i)=>x===best?i:-1).filter(i=>i>=0);if(winners.length===1)wins[winners[0]]++;}}
   v.forEach((x,i)=>{if(x!==null)totals[i]+=x;const cls=valid&&x===best?(v.filter(y=>y===best).length===1?'match-hole-win'+(mode==='holes'&&players.length===2?(i===0?' match-hole-green':' match-hole-gold'):''):'match-hole-half'):'';rows[i].push('<td class="'+cls+'">'+(display?display(i,h,x):x??'—')+'</td>');});
  }
  const hasScores=rows.some(row=>row.some(cell=>!cell.includes('>—</td>')));
  const leader=mode==='holes'?(compared===0?'Not started':wins[0]===wins[1]?'All square':esc(players[wins[0]>wins[1]?0:1])+' '+Math.abs(wins[0]-wins[1])+' UP'):(!hasScores?'Not started':totals.every(x=>x===totals[0])?'Tied':esc(players[totals.indexOf(highWins?Math.max(...totals):Math.min(...totals))])+' leads · '+(highWins?Math.max(...totals):Math.min(...totals))+(mode==='credits'?' credits':mode==='skins'?' skins':' pts'));
  const playerThrough=rows.map((row,i)=>{let h=0;while(h<n&&row[h]&&!row[h].includes('>—</td>'))h++;return progress(players[i].split(' + '),h,n);});
  return '<details class="match-card'+(mode==='holes'&&players.length===2?' match-card-visual':'')+'"'+(mode==='holes'&&players.length===2?' style="--match-holes:'+n+';--match-extra:36px"':'')+'><summary>'+(mode==='holes'&&players.length===2?matchSummary(players[0].split(' + '),players[1].split(' + '),compared===0?'NOT STARTED':wins[0]===wins[1]?'ALL SQUARE':Math.abs(wins[0]-wins[1])+' UP',progress(players.flatMap(p=>p.split(' + ')),thru,n),segments,compared===0||wins[0]===wins[1]?-1:wins[0]>wins[1]?0:1):'<span>'+esc(title)+'</span><strong>'+leader+'</strong><small>'+(progress(players.flatMap(p=>p.split(' + ')),thru,n))+'</small>')+'</summary><div class="match-table-wrap"><table class="match-table match-horizontal"><thead><tr><th>Hole</th>'+heads.join('')+'<th>'+(mode==='holes'?'Won':'Total')+'</th></tr></thead><tbody><tr class="match-par-row"><th>Par</th>'+pars.join('')+'<td>—</td></tr>'+players.map((p,i)=>'<tr><th>'+esc(p)+(mode==='points'?' · '+playerThrough[i]:'')+'</th>'+rows[i].join('')+'<td>'+(mode==='holes'?wins[i]+' won':totals[i])+'</td></tr>').join('')+'</tbody></table></div></details>';
 };
 const stablefordCard=(title,players,netValue)=>{
  const heads=Array.from({length:18},(_,i)=>'<th>'+(i+1)+'</th>').join('');
  const pars=Array.from({length:18},(_,i)=>'<td>'+par(i+1)+'</td>').join('');
  const totals=players.map(p=>Array.from({length:18},(_,i)=>{const n=netValue(p,i+1);if(n===null)return null;const d=n-par(i+1);return d<=-1?3:d===0?2:d===1?1:0;}).reduce((a,b)=>a+(b??0),0));
  const through=players.map(p=>{let h=0;while(h<18&&gross(p,h+1)!==null)h++;return h;});
  const max=Math.max(...totals),leaders=players.filter((_,i)=>totals[i]===max);
  const rows=players.map((p,i)=>{
   const cells=Array.from({length:18},(_,j)=>{const h=j+1,g=gross(p,h),n=netValue(p,h);const dots=g===null||n===null?'':Array.from({length:Math.max(0,g-n)},()=>'<i class="match-stroke-dot"></i>').join('');const d=n===null?null:n-par(h),pts=d===null?null:d<=-1?3:d===0?2:d===1?1:0;return {g,n,pts,dots,h};});
   const grossRow='<tr class="stableford-player-start"><th rowspan="3" class="stableford-player-label">'+esc(p)+'</th><th>Gross</th>'+cells.map(x=>'<td>'+(x.g===null?'—':'<span class="match-net-value">'+grossScoreHtml(x.g,par(x.h))+(x.dots?'<span class="match-stroke-dots">'+x.dots+'</span>':'')+'</span>')+'</td>').join('')+'<td rowspan="3" class="stableford-player-total">'+totals[i]+' pts</td></tr>';
   const netRow='<tr><th>Net</th>'+cells.map(x=>'<td>'+(x.n??'—')+'</td>').join('')+'</tr>';
   const pointRow='<tr class="stableford-points-row"><th>Points</th>'+cells.map(x=>'<td>'+(x.pts??'—')+'</td>').join('')+'</tr>';
   return grossRow+netRow+pointRow;
  }).join('');
  const leader=through.every(x=>x===0)?'Not started':leaders.length>1?'Tied · '+max+' pts':esc(leaders[0])+' leads · '+max+' pts';
  return '<details class="match-card"><summary><span>'+esc(title)+'</span><strong>'+leader+'</strong><small>Thru '+Math.max(...through)+'</small></summary><div class="match-table-wrap"><table class="match-table match-horizontal stableford-scorecard"><thead><tr><th>Golfer</th><th>Score</th>'+heads+'<th>Total</th></tr></thead><tbody><tr class="match-par-row"><th>Par</th><th></th>'+pars+'<td>—</td></tr>'+rows+'</tbody></table></div></details>';
 };
 let html='';
 if(id==='valley'||id==='lake'){
  const best=(t,h)=>t.every(p=>net(p,h)!==null)?Math.min(...t.map(p=>net(p,h))):null;
  for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length;j++)html+=card(label(ts[i])+' vs '+label(ts[j]),[label(ts[i]),label(ts[j])],(k,h)=>best(ts[k===0?i:j],h),18,false,'holes',(k,h,v)=>{if(v===null)return '—';const team=ts[k===0?i:j];const player=team.find(p=>net(p,h)===v);return grossCell(player,h,v);});
  html+='<p class="small">Provisional team best net ball; each team\'s lowest available net score is shown. A hole is compared only after both teams have recorded a score; official points require complete, verified cards.</p>';
 }else if(id==='ross'){
  const trailNet=(p,h)=>net(p,h);
  const wildNet=(p,h)=>{const entry=score(p,h);return entry?.gross==null?null:entry.gross-strokesOnHole(id,p,h,rank(h),'stableford')+(p==='Richie'&&entry.lifeline?1:0);};
  html+=stablefordCard('Trail Stableford',six,trailNet);
  html+=stablefordCard('Wild Card Stableford',seven,wildNet);
 }else if(id==='backyard'){
  const contests=[['Team skins',ts],['Individual skins',seven.map(p=>[p])]];
  for(const [title,groups] of contests){
   const awarded=groups.map(()=>Array(9).fill(null));let carry=0;
   for(let h=1;h<=9;h++){
    const values=groups.map(t=>t.every(p=>gross(p,h)!==null)?Math.min(...t.map(p=>gross(p,h))):null);
    if(values.some(x=>x===null))continue;
    carry++;
    const low=Math.min(...values),winners=values.map((v,i)=>v===low?i:-1).filter(i=>i>=0);
    awarded.forEach(row=>row[h-1]=0);
    if(winners.length===1){awarded[winners[0]][h-1]=carry;carry=0;}
   }
   html+=card(title,groups.map(label),(i,h)=>awarded[i][h-1],9,true,'skins',(i,h)=>{const group=groups[i];if(awarded[i][h-1]===null)return '—';const p=group.reduce((best,p)=>best===null||gross(p,h)<gross(best,h)?p:best,null);return grossCell(p,h);});
  }
  html+='<p class="small">Gross scores shown (no handicap strokes); Total column counts skins. Unique low gross wins; ties carry forward.</p>';
 }else if(id==='short'){
  const credits=six.map(()=>Array(18).fill(null));
  for(let h=1;h<=18;h++){const v=six.map(p=>net(p,h));if(v.some(x=>x===null))continue;const low=Math.min(...v),n=v.filter(x=>x===low).length;v.forEach((x,i)=>credits[i][h-1]=x===low?1/n:0);}
  const front=six.map((_,i)=>credits[i].slice(0,9).reduce((a,b)=>a+(b??0),0));
  const back=six.map((_,i)=>credits[i].slice(9).reduce((a,b)=>a+(b??0),0));
  const place=(values,prizes)=>{const order=values.map((v,i)=>i).sort((a,b)=>values[b]-values[a]),out=values.map(()=>0);for(let i=0;i<order.length;){let j=i+1;while(j<order.length&&Math.abs(values[order[j]]-values[order[i]])<1e-8)j++;const pts=prizes.slice(i,j).reduce((a,b)=>a+b,0)/(j-i);for(let k=i;k<j;k++)out[order[k]]=pts;i=j;}return out;};
  const frontReady=credits.every(row=>row.slice(0,9).every(v=>v!==null)),backReady=credits.every(row=>row.slice(9).every(v=>v!==null));
  const fp=frontReady?place(front,[3,2,1.5,1,.5,0]):null,bp=backReady?place(back,[5,3.5,2.5,1.5,.5,0]):null;
  html+=card('GN Short finale credits',six,(i,h)=>credits[i][h-1],18,true,'credits',(i,h)=>grossCell(six[i],h,net(six[i],h)));
  html+='<div class="match-table-wrap"><table class="match-table"><thead><tr><th>Golfer</th><th>Front credits</th><th>Front Trail pts</th><th>Back credits</th><th>Back Trail pts</th><th>Total Trail pts</th></tr></thead><tbody>'+six.map((p,i)=>'<tr><th>'+esc(p)+'</th><td>'+front[i].toFixed(2)+'</td><td>'+(fp?fp[i]:'Pending')+'</td><td>'+back[i].toFixed(2)+'</td><td>'+(bp?bp[i]:'Pending')+'</td><td>'+(fp&&bp?fp[i]+bp[i]:'Pending')+'</td></tr>').join('')+'</tbody></table></div>';
  html+='<p class="small">Gross scores and applied handicap dots shown; the Total column counts credits. Each hole awards one credit to the lowest net score, shared on ties.</p>';
 }
 return html;
}

export function wildCardStableford(id,score,par,rank,esc,submissions=[],testMode=false){
 const players=names,rows=players.map(()=>[]),totals=players.map(()=>0),played=players.map(()=>0),through=players.map(()=>0),heads=[],pars=[];
 for(let h=1;h<=18;h++){
  heads.push('<th>'+h+'</th>');pars.push('<td>'+par(h)+'</td>');
  players.forEach((p,i)=>{
   const entry=score(p,h);
   if(!entry||entry.gross==null){rows[i].push('<td>—</td>');return;}
   const n=entry.gross-strokesOnHole(id,p,h,rank(h),'stableford')+(p==='Richie'&&entry.lifeline?1:0);
   const d=n-par(h),pts=d<=-1?3:d===0?2:d===1?1:0;
   totals[i]+=pts;played[i]++;if(through[i]===h-1)through[i]=h;
   const applied=Math.max(0,entry.gross-n);rows[i].push('<td title="'+esc(p)+' · '+pts+' Stableford points"><span class="match-net-value">'+grossScoreHtml(entry.gross,par(h))+(applied?'<span class="match-stroke-dots" title="'+applied+' applied handicap strokes">'+Array.from({length:applied},()=>'<i class="match-stroke-dot"></i>').join('')+'</span>':'')+'</span></td>');
  });
 }
 const order=players.map((p,i)=>i).sort((a,b)=>totals[b]-totals[a]||played[b]-played[a]);
 const leader=played.every(x=>x===0)?'Not started':players[order[0]]+' leads · '+totals[order[0]]+' pts';
 const body=order.map(i=>'<tr><th>'+esc(players[i])+' · '+(!testMode&&submissions.some(x=>x.round_id===id&&x.player===players[i])?'Final':'Thru '+through[i])+'</th>'+rows[i].join('')+'<td><strong>'+totals[i]+'</strong></td></tr>').join('');
 return '<details class="match-card"><summary><span>Wild Card · Net Stableford</span><strong>'+esc(leader)+'</strong><small>7 players</small></summary><div class="match-table-wrap"><table class="match-table match-horizontal"><thead><tr><th>Hole</th>'+heads.join('')+'<th>Total</th></tr></thead><tbody><tr class="match-par-row"><th>Par</th>'+pars.join('')+'<td>—</td></tr>'+body+'</tbody></table></div><p class="small">Gross scores with applied handicap dots for all seven golfers, including Mason. Total shows Stableford points; highest total leads. Each golfer shows consecutive holes completed (Thru); points can reflect different holes completed.</p></details>';
}
