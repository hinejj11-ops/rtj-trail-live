import {names,teams} from './data.js';
import {strokesOnHole} from './scoring-rules.js';
export function liveFormat(id,score,net,par,rank,esc){
 const six=names.slice(0,6),seven=names,ts=teams[id];
 const gross=(p,h)=>score(p,h)?.gross??null;
 const label=t=>t.join(' + ');
 const card=(title,players,value,n=18,highWins=false,mode='points')=>{
  const heads=[],pars=[],rows=players.map(()=>[]),totals=players.map(()=>0),wins=players.map(()=>0);let thru=0,compared=0;
  for(let h=1;h<=n;h++){
   heads.push('<th>'+h+'</th>');pars.push('<td>'+par(h)+'</td>');
   const v=players.map((_,i)=>value(i,h)),valid=v.every(x=>x!==null);
   if(valid&&h===thru+1)thru++;
   const best=valid?(highWins?Math.max(...v):Math.min(...v)):null;
   if(valid){compared++;if(mode==='holes'){const winners=v.map((x,i)=>x===best?i:-1).filter(i=>i>=0);if(winners.length===1)wins[winners[0]]++;}}
   v.forEach((x,i)=>{if(x!==null)totals[i]+=x;const cls=valid&&x===best?(v.filter(y=>y===best).length===1?'match-hole-win':'match-hole-half'):'';rows[i].push('<td class="'+cls+'">'+(x??'—')+'</td>');});
  }
  const hasScores=rows.some(row=>row.some(cell=>!cell.includes('>—</td>')));
  const leader=mode==='holes'?(compared===0?'Not started':wins[0]===wins[1]?'All square':esc(players[wins[0]>wins[1]?0:1])+' '+Math.abs(wins[0]-wins[1])+' UP'):(!hasScores?'Not started':totals.every(x=>x===totals[0])?'Tied':esc(players[totals.indexOf(highWins?Math.max(...totals):Math.min(...totals))])+' leads · '+(highWins?Math.max(...totals):Math.min(...totals))+(mode==='credits'?' credits':mode==='skins'?' skins':' pts'));
  return '<details class="match-card"><summary><span>'+esc(title)+'</span><strong>'+leader+'</strong><small>'+(thru===n?'F':thru?'Thru '+thru:'—')+'</small></summary><div class="match-table-wrap"><table class="match-table match-horizontal"><thead><tr><th>Hole</th>'+heads.join('')+'<th>'+(mode==='holes'?'Won':'Total')+'</th></tr></thead><tbody><tr class="match-par-row"><th>Par</th>'+pars.join('')+'<td>—</td></tr>'+players.map((p,i)=>'<tr><th>'+esc(p)+'</th>'+rows[i].join('')+'<td>'+(mode==='holes'?wins[i]+' won':totals[i])+'</td></tr>').join('')+'</tbody></table></div></details>';
 };
 let html='';
 if(id==='valley'||id==='lake'){
  const best=(t,h)=>t.every(p=>net(p,h)!==null)?Math.min(...t.map(p=>net(p,h))):null;
  for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length;j++)html+=card(label(ts[i])+' vs '+label(ts[j]),[label(ts[i]),label(ts[j])],(k,h)=>best(ts[k===0?i:j],h),18,false,'holes');
  html+='<p class="small">Provisional team best net ball; each team\'s lowest available net score is shown. A hole is compared only after both teams have recorded a score; official points require complete, verified cards.</p>';
 }else if(id==='ross'){
  const stable=(p,h,wild)=>{const s=score(p,h);if(!s)return null;const n=wild?s.gross-strokesOnHole(id,p,h,rank(h),'stableford')+(p==='Richie'&&s.lifeline?1:0):net(p,h),d=n-par(h);return d<=-1?3:d===0?2:d===1?1:0;};
  html+=card('Trail Stableford',six,(i,h)=>stable(six[i],h,false),18,true);
  html+=card('Wild Card Stableford',seven,(i,h)=>stable(seven[i],h,true),18,true);
  html+='<p class="small">Cells show Stableford points earned on each hole. Higher total leads.</p>';
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
   html+=card(title,groups.map(label),(i,h)=>awarded[i][h-1],9,true,'skins');
  }
  html+='<p class="small">Gross skins awarded after a unique low score; ties carry forward.</p>';
 }else if(id==='short'){
  const credits=six.map(()=>Array(18).fill(null));
  for(let h=1;h<=18;h++){const v=six.map(p=>net(p,h));if(v.some(x=>x===null))continue;const low=Math.min(...v),n=v.filter(x=>x===low).length;v.forEach((x,i)=>credits[i][h-1]=x===low?1/n:0);}
  const front=six.map((_,i)=>credits[i].slice(0,9).reduce((a,b)=>a+(b??0),0));
  const back=six.map((_,i)=>credits[i].slice(9).reduce((a,b)=>a+(b??0),0));
  const place=(values,prizes)=>{const order=values.map((v,i)=>i).sort((a,b)=>values[b]-values[a]),out=values.map(()=>0);for(let i=0;i<order.length;){let j=i+1;while(j<order.length&&Math.abs(values[order[j]]-values[order[i]])<1e-8)j++;const pts=prizes.slice(i,j).reduce((a,b)=>a+b,0)/(j-i);for(let k=i;k<j;k++)out[order[k]]=pts;i=j;}return out;};
  const frontReady=credits.every(row=>row.slice(0,9).every(v=>v!==null)),backReady=credits.every(row=>row.slice(9).every(v=>v!==null));
  const fp=frontReady?place(front,[3,2,1.5,1,.5,0]):null,bp=backReady?place(back,[5,3.5,2.5,1.5,.5,0]):null;
  html+=card('GN Short finale credits',six,(i,h)=>credits[i][h-1],18,true,'credits');
  html+='<div class="match-table-wrap"><table class="match-table"><thead><tr><th>Golfer</th><th>Front credits</th><th>Front Trail pts</th><th>Back credits</th><th>Back Trail pts</th><th>Total Trail pts</th></tr></thead><tbody>'+six.map((p,i)=>'<tr><th>'+esc(p)+'</th><td>'+front[i].toFixed(2)+'</td><td>'+(fp?fp[i]:'Pending')+'</td><td>'+back[i].toFixed(2)+'</td><td>'+(bp?bp[i]:'Pending')+'</td><td>'+(fp&&bp?fp[i]+bp[i]:'Pending')+'</td></tr>').join('')+'</tbody></table></div>';
  html+='<p class="small">Each hole awards one credit to the lowest net score, shared on ties.</p>';
 }
 return html;
}

export function wildCardStableford(id,score,par,rank,esc){
 const players=names,rows=players.map(()=>[]),totals=players.map(()=>0),played=players.map(()=>0),through=players.map(()=>0),heads=[],pars=[];
 for(let h=1;h<=18;h++){
  heads.push('<th>'+h+'</th>');pars.push('<td>'+par(h)+'</td>');
  players.forEach((p,i)=>{
   const entry=score(p,h);
   if(!entry||entry.gross==null){rows[i].push('<td>—</td>');return;}
   const n=entry.gross-strokesOnHole(id,p,h,rank(h),'stableford')+(p==='Richie'&&entry.lifeline?1:0);
   const d=n-par(h),pts=d<=-1?3:d===0?2:d===1?1:0;
   totals[i]+=pts;played[i]++;if(through[i]===h-1)through[i]=h;
   rows[i].push('<td>'+pts+'</td>');
  });
 }
 const order=players.map((p,i)=>i).sort((a,b)=>totals[b]-totals[a]||played[b]-played[a]);
 const leader=played.every(x=>x===0)?'Not started':players[order[0]]+' leads · '+totals[order[0]]+' pts';
 const body=order.map(i=>'<tr><th>'+esc(players[i])+' · '+(through[i]===18?'F':through[i]?'Thru '+through[i]:'—')+'</th>'+rows[i].join('')+'<td><strong>'+totals[i]+'</strong></td></tr>').join('');
 return '<details class="match-card"><summary><span>Wild Card · Net Stableford</span><strong>'+esc(leader)+'</strong><small>7 players</small></summary><div class="match-table-wrap"><table class="match-table match-horizontal"><thead><tr><th>Hole</th>'+heads.join('')+'<th>Total</th></tr></thead><tbody><tr class="match-par-row"><th>Par</th>'+pars.join('')+'<td>—</td></tr>'+body+'</tbody></table></div><p class="small">Live points for all seven golfers, including Mason. Highest Stableford total leads. Each golfer shows consecutive holes completed (Thru); points can reflect different holes completed.</p></details>';
}
