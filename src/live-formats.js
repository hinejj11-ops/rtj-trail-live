import {names,teams} from './data.js';
import {strokesOnHole} from './scoring-rules.js';
export function liveFormat(id,score,net,par,rank,esc){
 const six=names.slice(0,6),seven=names,ts=teams[id];
 const gross=(p,h)=>score(p,h)?.gross??null;
 const label=t=>t.join(' + ');
 const card=(title,players,value,n=18)=>{
  const heads=[],pars=[],rows=players.map(()=>[]),totals=players.map(()=>0);let thru=0;
  for(let h=1;h<=n;h++){
   heads.push('<th>'+h+'</th>');pars.push('<td>'+par(h)+'</td>');
   const v=players.map((_,i)=>value(i,h)),valid=v.every(x=>x!==null);
   if(valid&&h===thru+1)thru++;
   const best=valid?Math.min(...v):null;
   v.forEach((x,i)=>{if(x!==null)totals[i]+=x;const cls=valid&&x===best?(v.filter(y=>y===best).length===1?'match-hole-win':'match-hole-half'):'';rows[i].push('<td class="'+cls+'">'+(x??'—')+'</td>');});
  }
  return '<details class="match-card"><summary><span>'+esc(title)+'</span><strong>Live</strong><small>'+(thru===n?'F':thru?'Thru '+thru:'—')+'</small></summary><div class="match-table-wrap"><table class="match-table match-horizontal"><thead><tr><th>Hole</th>'+heads.join('')+'<th>Total</th></tr></thead><tbody><tr class="match-par-row"><th>Par</th>'+pars.join('')+'<td>—</td></tr>'+players.map((p,i)=>'<tr><th>'+esc(p)+'</th>'+rows[i].join('')+'<td>'+totals[i]+'</td></tr>').join('')+'</tbody></table></div></details>';
 };
 let html='';
 if(id==='valley'||id==='lake'){
  const best=(t,h)=>t.every(p=>net(p,h)!==null)?Math.min(...t.map(p=>net(p,h))):null;
  for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length;j++)html+=card(label(ts[i])+' vs '+label(ts[j]),[label(ts[i]),label(ts[j])],(k,h)=>best(ts[k===0?i:j],h));
  html+='<p class="small">Team best net ball. Lowest net score wins the hole.</p>';
 }else if(id==='ross'){
  const stable=(p,h,wild)=>{const s=score(p,h);if(!s)return null;const n=wild?s.gross-strokesOnHole(id,p,h,rank(h),'stableford')+(p==='Richie'&&s.lifeline?1:0):net(p,h),d=n-par(h);return d<=-1?3:d===0?2:d===1?1:0;};
  html+=card('Trail Stableford',six,(i,h)=>stable(six[i],h,false));
  html+=card('Wild Card Stableford',seven,(i,h)=>stable(seven[i],h,true));
  html+='<p class="small">Cells show Stableford points earned on each hole. Higher total leads.</p>';
 }else if(id==='short'){
  const credits=six.map(()=>Array(18).fill(null));
  for(let h=1;h<=18;h++){const v=six.map(p=>net(p,h));if(v.some(x=>x===null))continue;const low=Math.min(...v),n=v.filter(x=>x===low).length;v.forEach((x,i)=>credits[i][h-1]=x===low?1/n:0);}
  html+=card('GN Short finale credits',six,(i,h)=>credits[i][h-1]);
  html+='<p class="small">Each hole awards one credit to the lowest net score, shared on ties.</p>';
 }
 return html;
}
