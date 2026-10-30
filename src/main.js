import {createClient} from '@supabase/supabase-js';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
import {names,rounds,roundPlayers,courseHandicap,heartbreakerStrokes,teams,skillsHoles,wildCardSkillsRounds,lifelineLimits} from './data.js';
import {championship} from './championship.js';
import {roundSnapshot} from './round-snapshot.js';
import {liveFormat, wildCardStableford} from './live-formats.js';
import {strokesOnHole,netScore,lifelineEligible,vegasDigit} from './scoring-rules.js';
import './style.css';
const db=SUPABASE_URL&&SUPABASE_ANON_KEY?createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
let me=null,roundId='silver-am',tab='scores',scores=[],skills=[],skillsLocks=[],holes=[],submissions=[],ready=false,testMode=false,notice='',target=null,channel=null,timer=null;
const $=s=>document.querySelector(s),r=()=>rounds.find(x=>x.id===roundId);
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const group=()=>r().groups.find(g=>g.includes(me))||[];
const hole=(h)=>holes.find(x=>x.round_id===roundId&&x.hole===h);
const par=h=>hole(h)?.par??(r().id==='backyard'||r().id==='short'||(r().id==='silver-pm'&&h>9)?3:4);
const rank=h=>hole(h)?.stroke_index??h;
const strokes=(player,h)=>strokesOnHole(roundId,player,h,rank(h));
const score=(p,h)=>scores.find(s=>s.round_id===roundId&&s.player===p&&s.hole===h);
const net=(p,h)=>netScore(roundId,p,h,score(p,h),rank(h));
const through=(p,id=roundId)=>{const total=rounds.find(x=>x.id===id)?.holes||18;let h=0;while(h<total&&scores.some(x=>x.round_id===id&&x.player===p&&x.hole===h+1&&x.gross!=null))h++;return h;};
const throughLabel=(h,total)=>h===0?'—':h>=total?'F':'Thru '+h;
const sf=(p)=>{let n=0;for(let h=1;h<=r().holes;h++){let x=net(p,h);if(x===null)continue;let d=x-par(h);n+=d<=-1?3:d===0?2:d===1?1:0;}return n;};
function render(){
 let body='';
 if(!me){body='<section class="panel"><h2>Who’s on the tee?</h2><p>Choose your name. Only one active device can claim each player.</p>'+names.map(n=>'<button class="player" data-login="'+n+'">'+n+' <span>→</span></button>').join('')+'</section>';}
 else{
 const tabs=[['scores','Scorecard'],['matches','Live matches'],['boards','Leaderboards'],['skills','CTP & LD'],['settings','Course setup']];
 body='<nav class="tabs">'+tabs.map(([id,label])=>'<button data-tab="'+id+'" class="'+(tab===id?'chosen':'')+'">'+label+'</button>').join('')+'</nav>';
 body+='<label>Round <select id="round">'+rounds.map(x=>'<option value="'+x.id+'" '+(x.id===roundId?'selected':'')+'>'+x.date+' · '+x.name+'</option>').join('')+'</select></label>';
 if(tab==='scores'){
 let players=me==='Jimmy'?roundPlayers(r()):group();if(!target||!players.includes(target))target=players.includes(me)?me:players[0];
 body+='<section class="panel"><h2>'+esc(r().name)+'</h2><p>'+r().date+' · '+r().time+' CST · '+r().format.toUpperCase()+'</p><p><strong>'+(me==='Jimmy'?'Round golfers:':'Playing group:')+'</strong> '+players.join(' · ')+'</p>';
 if(testMode)body+='<div class="warning"><strong>TEST MODE ACTIVE</strong> — scores are saved separately from official tournament scores.</div>';else if(!ready)body+='<div class="warning">Official scoring is locked until the organizer verifies hole pars and stroke indexes in Course setup.</div>';
 let locked=false,completed=0;if(players.length){body+='<label>'+'Enter scores for '+'<select id="target">'+players.map(p=>'<option '+(target===p?'selected':'')+'>'+p+'</option>').join('')+'</select></label>';
 if(target==='Richie'&&lifelineLimits[roundId]){const used=scores.filter(x=>x.round_id===roundId&&x.player==='Richie'&&x.lifeline).length;body+='<p class="small"><strong>Richie’s Lifelines:</strong> '+used+'/'+lifelineLimits[roundId]+' used this round. Each selection adds one stroke to applicable net results.</p>';}
 body+='<div class="score-head"><span>Hole</span><span>Par</span><span>Strokes</span><span>Gross</span><span>Net</span></div>';
 locked=!testMode&&submissions.some(x=>x.round_id===roundId&&x.player===target);completed=scores.filter(x=>x.round_id===roundId&&x.player===target).length;body+='<p><strong>'+esc(target)+'</strong> · '+throughLabel(through(target),r().holes)+' · '+completed+' entered '+(locked?'· 🔒 VERIFIED':testMode?'· TEST SCORECARD':'· DRAFT')+'</p>';for(let h=1;h<=r().holes;h++){let s=score(target,h),st=strokes(target,h);const lifelinesUsed=scores.filter(x=>x.round_id===roundId&&x.player==='Richie'&&x.lifeline).length;const limitReached=lifelinesUsed>=lifelineLimits[roundId]&&!s?.lifeline;body+='<div class="score-row"><b>'+h+'</b><span>'+par(h)+'</span><span class="stroke">'+(st?'●'.repeat(st):'—')+'</span><span class="hole-input"><button data-step="-1" data-hole="'+h+'" '+(!(ready||testMode)||locked?'disabled':'')+'>−</button><strong>'+(s?.gross??'—')+'</strong><button data-step="1" data-hole="'+h+'" '+(!(ready||testMode)||locked?'disabled':'')+'>+</button></span><b>'+(net(target,h)??'—')+'</b>'+(target==='Richie'&&lifelineEligible(roundId,h,rank(h))?'<label class="small" style="grid-column:1/-1"><input type="checkbox" data-lifeline="'+h+'" '+(s?.lifeline?'checked':'')+' '+(!(ready||testMode)||locked||!s||limitReached?'disabled':'')+'> Richie used Lifeline</label>':'')+'</div>';}}
 body+='<div class="panel"><h3>End-of-round verification</h3><p class="small">Applies only to '+esc(target)+' on '+esc(r().name)+'.</p>'+(locked?'<p>🔒 Verified against physical scorecard and locked by Jimmy.</p>':!testMode&&ready?(me==='Jimmy'?'<button id="submit-card" class="primary" '+(completed!==r().holes?'disabled':'')+'>Verify & finalize '+esc(target)+' scorecard</button><p class="small">Compare all '+r().holes+' holes with the physical scorecard before finalizing.</p>':'<p class="small">Awaiting Jimmy’s physical-scorecard verification. Scores remain editable until finalized.</p>'):'<p>Official submission is available only when official scoring is enabled and Test Mode is off.</p>')+'<div style="margin-top:12px">'+(me==='Jimmy'?'<button id="reset-player">Reset '+esc(target)+' '+(testMode?'TEST':'OFFICIAL')+' scores for this round</button>':'<p class="small">Only Jimmy can clear scorecards.</p>')+'</div>'+(locked&&me==='Jimmy'?'<button id="unlock-card">Unlock '+esc(target)+' scorecard (organizer)</button>':'')+'</div>';body+='<p class="small">Everyone may enter scores for their playing group. Jimmy checks physical scorecards and alone finalizes, unlocks, or clears any golfer’s scorecard. ● indicates a handicap stroke. Net values are provisional until hole stroke indexes are verified.</p></section>';
 }else if(tab==='matches'){
 body+='<section class="panel"><h2>Live match center</h2>';
 if(r().format==='match'){for(const g of r().groups){for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){
  if(g[i]==='Mason'||g[j]==='Mason')continue;
  const p1=g[i],p2=g[j];let a=0,b=0,halves=0,played=0,through=0;
  const row1=[],row2=[],parRow=[],holeRow=[];
  for(let h=1;h<=r().holes;h++){
   const x=net(p1,h),y=net(p2,h),ready=x!==null&&y!==null;
   const par=holes.find(v=>v.round_id===roundId&&v.hole===h)?.par??'—';
   if(ready){played++;if(x<y)a++;else if(y<x)b++;else halves++;}
   if(ready&&h===through+1)through=h;
   holeRow.push('<th scope="col">'+h+'</th>');
   parRow.push('<td>'+par+'</td>');
   const dots=p=>{const strokesReceived=strokes(p,h);return strokesReceived>0?'<span class="match-stroke-dots" aria-label="'+strokesReceived+' handicap stroke'+(strokesReceived===1?'':'s')+'" title="'+strokesReceived+' handicap stroke'+(strokesReceived===1?'':'s')+'">'+Array.from({length:strokesReceived},()=>'<i class="match-stroke-dot"></i>').join('')+'</span>':'';};
   row1.push('<td class="'+(ready&&x<y?'match-hole-win':ready&&x===y?'match-hole-half':'')+'"><span class="match-net-value">'+(x??'—')+dots(p1)+'</span></td>');
   row2.push('<td class="'+(ready&&y<x?'match-hole-win':ready&&x===y?'match-hole-half':'')+'"><span class="match-net-value">'+(y??'—')+dots(p2)+'</span></td>');
  }
  const lead=a-b;
  const status=played===0?'Not started':lead===0?'All square':(lead>0?p1:p2)+' '+Math.abs(lead)+' UP';
  const thru=through===0?'—':through===r().holes?'F':'Thru '+through;
  body+='<details class="match-card"><summary><span>'+esc(p1)+' vs '+esc(p2)+'</span><strong>'+esc(status)+'</strong><small>'+thru+'</small></summary><div class="match-table-wrap"><table class="match-table match-horizontal"><thead><tr><th scope="col">Hole</th>'+holeRow.join('')+'</tr></thead><tbody><tr class="match-par-row"><th scope="row">Par</th>'+parRow.join('')+'</tr><tr><th scope="row">'+esc(p1)+'</th>'+row1.join('')+'</tr><tr><th scope="row">'+esc(p2)+'</th>'+row2.join('')+'</tr></tbody></table></div><p class="small">Net scores only. Small circles show handicap strokes received on each hole. Green marks the hole winner; gray indicates a halved hole. '+a+'–'+b+' holes won · '+halves+' halved.</p></details>';
 }}}
 else if(roundId==='silver-pm'){
  for(const [start,title] of [[1,'Heartbreaker'],[10,'Short Course']]){
   body+='<h3>'+title+' · Vegas</h3>';
   const pairs=teams[roundId];
   for(let i=0;i<pairs.length;i++)for(let j=i+1;j<pairs.length;j++){
    const first=pairs[i],second=pairs[j],rows=[[],[]],pars=[],head=[];
    let totals=[0,0],played=0,through=0;
    for(let h=start;h<start+9;h++){
     const values=[first,second].map(t=>t.every(p=>score(p,h)?.gross!=null)?t.map(p=>vegasDigit(roundId,p,h,score(p,h),par(h),rank(h))).sort((a,b)=>a-b):null).map(d=>d?10*d[0]+d[1]:null);
     const complete=values.every(v=>v!==null);
     if(complete){played++;totals[0]+=values[0];totals[1]+=values[1];if(h===start+through)through++;}
     head.push('<th>'+(h-start+1)+'</th>');pars.push('<td>'+par(h)+'</td>');
     for(let k=0;k<2;k++)rows[k].push('<td class="'+(complete&&values[k]<values[1-k]?'match-hole-win':complete&&values[k]===values[1-k]?'match-hole-half':'')+'">'+(values[k]??'—')+'</td>');
    }
    const label=t=>t.join(' + ');
    const status=played===0?'Not started':totals[0]===totals[1]?'Tied':label(totals[0]<totals[1]?first:second)+' leads by '+Math.abs(totals[0]-totals[1]);
    body+='<details class="match-card"><summary><span>'+esc(label(first))+' vs '+esc(label(second))+'</span><strong>'+esc(status)+'</strong><small>'+(through===9?'F':through?'Thru '+through:'—')+'</small></summary><div class="match-table-wrap"><table class="match-table match-horizontal"><thead><tr><th>Hole</th>'+head.join('')+'<th>Total</th></tr></thead><tbody><tr class="match-par-row"><th>Par</th>'+pars.join('')+'<td>—</td></tr><tr><th>'+esc(label(first))+'</th>'+rows[0].join('')+'<td>'+totals[0]+'</td></tr><tr><th>'+esc(label(second))+'</th>'+rows[1].join('')+'<td>'+totals[1]+'</td></tr></tbody></table></div><p class="small">Lower Vegas number wins each hole comparison. Totals include only holes completed by both teams ('+played+'/9).</p></details>';
   }
  }
 }
 else if(['valley','lake','ross','short','backyard'].includes(roundId))body+=liveFormat(roundId,score,net,par,rank,esc);
 else body+='<p>Round format: '+r().format+'. See score snapshots and team pairings below.</p>';
 if(teams[roundId])body+='<p><strong>Teams:</strong> '+teams[roundId].map(t=>t.join(' + ')).join(' · ')+'</p>';
 body+='</section>';
 }else if(tab==='boards'){
 const engine=championship(scores,skills,holes,submissions,!testMode);
 body+='<section class="panel"><h2>Championship standings</h2><p class="small">'+(testMode?'🧪 TEST MODE — standings use test scores.':'Official scores · Championship points post after Jimmy verifies every eligible physical scorecard.')+'</p><p class="small">Five separate titles · $625 total prizes. A tied position splits the points for occupied places.</p></section>';
 for(const b of engine.boards){
  const sorted=[...b.eligible].sort((a,c)=>engine.compare(b,a,c));
  body+='<section class="panel"><h3>'+esc(b.name)+' <span class="prize">$'+b.prize+'</span></h3><p class="small">'+b.rounds+'/'+b.expected+' '+(b.id==='overall'||b.id==='wildSkills'?'skills contests recorded':'events completed')+' · '+(b.rounds===b.expected?'All events scored':'Provisional standings')+'</p>';
  sorted.forEach((p,i)=>{const tied=(i>0&&engine.compare(b,p,sorted[i-1])===0)||(i<sorted.length-1&&engine.compare(b,p,sorted[i+1])===0);const first=sorted.findIndex(q=>engine.compare(b,p,q)===0)+1;const place=tied?'T'+first:(i+1)+'.';body+='<div class="row"><b>'+place+' '+esc(p)+'</b><strong>'+Number(b.values[p].toFixed(3))+' pts</strong></div>';});
  if(engine.details[b.id]?.length){const eventNames={trail:['Silver Lakes AM · Match','Oxmoor Ridge · Match','Grand National Links · Match','Ross Bridge · Stableford','GN Short · Finale'],cup:['Silver Lakes PM · Vegas','Oxmoor Valley · Triple Threat','Backyard · Team skins','GN Lake · Best ball'],wild:['Valley · Stableford','Ridge · Stableford','Ross Bridge · Stableford','Backyard · Individual skins']};
   body+='<details><summary>Event point breakdown</summary>';
   engine.details[b.id].forEach((ev,i)=>{body+='<div class="small"><strong>Completed event '+(i+1)+'</strong></div>'+b.eligible.map(p=>'<div class="row"><span>'+esc(p)+'</span><span>'+Number((ev[p]||0).toFixed(3))+' pts</span></div>').join('');});
   body+='</details>';
  }
  body+='</section>';
 }
 const snapshot=roundSnapshot(roundId,scores,engine,holes);
 body+='<section class="panel"><h3>'+esc(r().name)+' · Live round leaderboard</h3><p class="small">'+esc(snapshot.format)+' · Updates with the selected round, not the date. Results are provisional until the round is complete.</p>';
 body+=snapshot.rows.length?snapshot.rows.map(x=>'<div class="row"><span><strong>'+esc(x.title)+'</strong><br><small>'+esc(x.detail)+'</small></span><span class="small">'+throughLabel(x.through,x.required)+'</span></div>').join(''):'<p>No scores yet.</p>';
 if(snapshot.wildStableford.length){
  body+='<h4>Wild Card · Live Net Stableford</h4><p class="small">All seven golfers · 3 net birdie or better / 2 net par / 1 net bogey / 0 net double or worse. These are running hole points; Wild Card championship points (3 / 2 / 1) are awarded when all seven scorecards are complete.</p>';
  snapshot.wildStableford.forEach((x,i,all)=>{const tied=(i>0&&x.points===all[i-1].points)||(i<all.length-1&&x.points===all[i+1].points);const first=all.findIndex(y=>y.points===x.points)+1;body+='<div class="row"><b>'+(tied?'T'+first:(i+1)+'.')+' '+esc(x.player)+'</b><span class="small">'+throughLabel(x.through,18)+'</span><strong>'+x.points+' SF</strong></div>';});
 }
 body+='<details><summary>Golfer hole progress</summary>'+snapshot.players.map(p=>'<div class="row"><span>'+esc(p)+'</span><strong>'+throughLabel(snapshot.through[p],snapshot.holes)+'</strong></div>').join('')+'</details></section>';
 }else if(tab==='skills'){
 const designated=skillsHoles[roundId]||{};
 const locked=skillsLocks.some(x=>x.round_id===roundId);
 const valid=skills.filter(x=>skillsHoles[x.round_id]&&Object.hasOwn(skillsHoles[x.round_id],x.kind)&&x.winner&&names.includes(x.winner));
 const overallValid=valid.filter(x=>names.slice(0,6).includes(x.winner));
 const wildValid=valid.filter(x=>wildCardSkillsRounds.includes(x.round_id));
 const overallResolved=skills.filter(x=>skillsHoles[x.round_id]&&Object.hasOwn(skillsHoles[x.round_id],x.kind)&&x.winner).length;
 const wildResolved=skills.filter(x=>wildCardSkillsRounds.includes(x.round_id)&&skillsHoles[x.round_id]&&Object.hasOwn(skillsHoles[x.round_id],x.kind)&&x.winner).length;
 const eligible=wildCardSkillsRounds.includes(roundId)?names:names.slice(0,6);
 const recorded=Object.keys(designated).filter(kind=>skills.some(x=>x.round_id===roundId&&x.kind===kind&&x.winner)).length;
 body+='<section class="panel"><h2>CTP & Long Drive</h2><p class="small">All golfers can view results. Only Jimmy can select or change winners.</p><p><strong>'+esc(r().name)+'</strong> · '+(locked?'🔒 Locked results':'Provisional · '+recorded+'/'+Object.keys(designated).length+' selected')+'</p>';
 for(const kind of ['ctp','ld']){
  if(!Object.hasOwn(designated,kind))continue;
  const existing=skills.find(x=>x.round_id===roundId&&x.kind===kind);
  const label=(kind==='ctp'?'Closest to Pin':'Long Drive')+' — Hole '+designated[kind];
  if(me==='Jimmy'&&!locked){
   body+='<label>'+label+'<select data-skill="'+kind+'"><option value="">No winner yet</option><option value="NO_WINNER" '+(existing?.winner==='NO_WINNER'?'selected':'')+'>No qualifying shot</option>'+eligible.map(n=>'<option value="'+esc(n)+'" '+(existing?.winner===n?'selected':'')+'>'+esc(n)+'</option>').join('')+'</select></label>';
  }else{
   body+='<div class="row"><span>'+label+'</span><strong>'+esc(existing?.winner==='NO_WINNER'?'No qualifying shot':existing?.winner||'No winner yet')+'</strong></div>';
  }
 }
 if(me==='Jimmy'){
  body+='<button id="skills-lock" data-locked="'+(locked?'1':'0')+'" '+(!locked&&recorded!==Object.keys(designated).length?'disabled':'')+'>'+(locked?'Unlock Results':'Lock In Results')+'</button>';
  body+='<p class="small">'+(locked?'Unlock to correct a winner. Changes are visible to all golfers.':'Record a winner or No qualifying shot for each contest before locking this round. Selections are visible to everyone immediately.')+'</p>';
 }
 body+='<p class="small">'+(wildCardSkillsRounds.includes(roundId)?'These contests count toward both championships for eligible golfers; Mason earns Wild Card Skills points only.':'These contests count toward Overall Skills only.')+'</p></section>';
 const skillsLeaderboard=(players,entries)=>{const ranked=players.map(player=>({player,points:entries.filter(x=>x.winner===player).length})).sort((a,b)=>b.points-a.points||players.indexOf(a.player)-players.indexOf(b.player));return ranked.map((x,i)=>{const first=ranked.findIndex(y=>y.points===x.points)+1;const tied=ranked.some((y,j)=>j!==i&&y.points===x.points);return '<div class="row"><b>'+(tied?'T'+first:first+'.')+' '+esc(x.player)+'</b><strong>'+x.points+' pts</strong></div>';}).join('');};
 body+='<section class="panel"><h3>Overall Skills · '+overallResolved+'/16 resolved</h3>'+skillsLeaderboard(names.slice(0,6),overallValid)+'</section>';
 body+='<section class="panel"><h3>Wild Card Skills · '+wildResolved+'/7 resolved</h3>'+skillsLeaderboard(names,wildValid)+'</section>';
 }else if(tab==='settings'){
 body+='<section class="panel"><h2>Hole information</h2><p class="warning">Default hole pars and stroke indexes are placeholders. Verify every hole against the actual scorecards before enabling official scoring.</p>';
 if(me==='Jimmy'){body+='<div class="warning"><strong>Test controls</strong><label><input type="checkbox" id="test-mode" '+(testMode?'checked':'')+'> Enable test mode (separate test scores)</label><button id="reset-test" class="primary">Clear ALL test scores</button><p class="small">Reset deletes test scores for every round and player, but never official scores.</p></div><div class="par-grid">'+Array.from({length:r().holes},(_,i)=>{let h=i+1;return '<label>Hole '+h+'<input type="number" min="3" max="6" data-par="'+h+'" value="'+par(h)+'"><input type="number" min="1" max="18" data-rank="'+h+'" value="'+rank(h)+'"></label>';}).join('')+'</div><label><input type="checkbox" id="ready" '+(ready?'checked':'')+'> I have verified ALL rounds’ pars and stroke indexes.</label>';}
 else body+='<p>Only the organizer (Jimmy) can edit the course setup.</p>';
 body+='</section>';
 }
 }
 $('#app').innerHTML='<header><div class="eyebrow gold">ROBERT TRENT JONES GOLF TRAIL</div><h1>TRAIL CHAMPIONSHIP</h1><div class="session"><span>6–11 NOV 2026</span>'+(me?'<strong>'+me+'</strong><button data-logout>Sign out</button>':'')+'</div></header><main>'+(notice?'<div class="notice">'+esc(notice)+'</div>':'')+body+'</main><div class="footer">THE EXPEDITION EDITION · LIVE SCORING</div>';
}
async function refresh(){if(!db||!me)return;let results=await Promise.all([db.from('scores').select('*'),db.from('skills').select('*'),db.from('course_pars').select('*'),db.from('app_settings').select('*'),db.from('test_scores').select('*'),db.from('scorecard_submissions').select('*'),db.from('skills_round_locks').select('*')]);if(results.some(x=>x.error)){notice='Database error: '+results.find(x=>x.error).error.message;render();return;}[scores,skills,holes]=results.slice(0,3).map(x=>x.data);ready=results[3].data.find(x=>x.key==='scoring_ready')?.value==='true';testMode=results[3].data.find(x=>x.key==='test_mode')?.value==='true';scores=testMode?results[4].data:results[0].data;submissions=results[5].data;skillsLocks=results[6].data;notice='';render();}
const withTimeout=(promise,label,ms=12000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+' timed out after '+Math.round(ms/1000)+' seconds')),ms))]);
async function login(name){
 const status=message=>{notice=message;render();};
 status('Connecting as '+name+' — checking session…');
 try{
  if(!db)throw Error('Supabase environment variables are not configured');
  const sessionResult=await withTimeout(db.auth.getSession(),'Session check');
  if(sessionResult.error)throw sessionResult.error;
  if(!sessionResult.data?.session){
   status('Connecting as '+name+' — signing in…');
   const authResult=await withTimeout(db.auth.signInAnonymously(),'Anonymous sign-in');
   if(authResult.error)throw authResult.error;
  }
  status('Connecting as '+name+' — claiming player…');
  const claim=await withTimeout(Promise.resolve(db.rpc('claim_player',{p_player:name})),'Player claim');
  if(claim.error)throw claim.error;
  if(!claim.data)throw Error(name+' is already active on another device. Sign out there or wait about 100 seconds.');
  me=name;
  sessionStorage.setItem('rtj-player',name);
  notice='Signed in as '+name+'. Loading scores…';
  render();
  try{await withTimeout(refresh(),'Scorecard loading',15000);}catch(loadError){notice='Signed in, but score loading failed: '+loadError.message;render();}
  if(channel)db.removeChannel(channel);
  channel=db.channel('live').on('postgres_changes',{event:'*',schema:'public',table:'scores'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'skills'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'course_pars'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'test_scores'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'scorecard_submissions'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'skills_round_locks'},refresh).subscribe();
  clearInterval(timer);
  timer=setInterval(async()=>{
   try{let x=await withTimeout(db.rpc('heartbeat',{p_player:me}),'Heartbeat',12000);
    if(x.error||!x.data){me=null;sessionStorage.removeItem('rtj-player');notice='Session expired. Please select your name again.';render();}
   }catch(e){console.warn('RTJ heartbeat failed',e);}
  },25000);
 }catch(e){
  console.error('RTJ sign-in error',e);
  notice='Sign-in failed: '+(e?.message||String(e));
  render();
 }
}
async function save(h,d){if(!(me==='Jimmy'||group().includes(target))||!(ready||testMode)||(!testMode&&submissions.some(x=>x.round_id===roundId&&x.player===target)))return;let old=score(target,h),gross=old?Math.max(1,Math.min(20,old.gross+d)):par(h);let a=await db.from(testMode?'test_scores':'scores').upsert({round_id:roundId,player:target,hole:h,gross,lifeline:old?.lifeline||false,updated_by:(await db.auth.getUser()).data.user.id,updated_at:new Date().toISOString()});if(a.error)notice=a.error.message;await refresh();}
$('#app').addEventListener('click',async e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.login){b.disabled=true;await login(b.dataset.login);return;}if(b.hasAttribute('data-logout')){await db.rpc('release_player',{p_player:me});me=null;sessionStorage.removeItem('rtj-player');clearInterval(timer);if(channel)db.removeChannel(channel);render();return;}if(b.dataset.tab){tab=b.dataset.tab;render();return;}if(b.id==='reset-player'){if(me!=='Jimmy')return;const label=(testMode?'TEST':'OFFICIAL');if(!confirm('Delete '+target+'\'s '+label+' scores for '+r().name+'? This cannot be undone.'))return;let a=await db.rpc('reset_player_scorecard',{p_round:roundId,p_player:target,p_test:testMode});if(a.error)alert(a.error.message);else{await refresh();alert('Deleted '+a.data+' scores for '+target+'.');}return;}if(b.id==='submit-card'){if(me!=='Jimmy')return;if(!confirm('I have compared '+target+'\'s app scores against the physical card. Finalize and LOCK this scorecard?'))return;let a=await db.rpc('submit_scorecard',{p_round:roundId,p_player:target,p_holes:r().holes});if(a.error)alert(a.error.message);else{await refresh();alert('Scorecard verified and finalized.');}return;}if(b.id==='unlock-card'){if(me!=='Jimmy')return;if(!confirm('Unlock '+target+'\'s submitted scorecard?'))return;let a=await db.rpc('unlock_scorecard',{p_round:roundId,p_player:target});if(a.error)alert(a.error.message);else await refresh();return;}if(b.id==='reset-test'){if(!confirm('Delete ALL test scores for every round and golfer? Official scores will not be touched.'))return;let a=await db.rpc('clear_test_scores');if(a.error){alert(a.error.message);}else{await refresh();alert('Cleared '+a.data+' test scores.');}return;}if(b.id==='skills-lock'){if(me!=='Jimmy')return;const locked=b.dataset.locked==='1';if(!confirm(locked?'Unlock skills results for this round so you can edit them?':'Lock in all CTP and Long Drive winners for this round?'))return;const a=await db.rpc('set_skills_round_lock',{p_round:roundId,p_locked:!locked});if(a.error){alert(a.error.message);notice=a.error.message;}await refresh();return;}if(b.dataset.step){await save(+b.dataset.hole,+b.dataset.step);}});
$('#app').addEventListener('change',async e=>{let t=e.target;if(t.id==='test-mode'){let a=await db.rpc('set_test_mode',{p_enabled:t.checked});if(a.error)alert(a.error.message);await refresh();}else if(t.id==='round'){roundId=t.value;target=null;render();}else if(t.id==='target'){target=t.value;render();}else if(t.dataset.lifeline){
 const h=Number(t.dataset.lifeline);
 if(target!=='Richie'||!lifelineEligible(roundId,h,rank(h))||!score('Richie',h)){alert('Lifeline is not eligible on this hole.');await refresh();return;}
 const a=await db.rpc('set_richie_lifeline',{p_round:roundId,p_hole:h,p_enabled:t.checked,p_test:testMode});
 if(a.error)alert(a.error.message);
 await refresh();
 }else if(t.dataset.skill){
 const kind=t.dataset.skill,eligible=[...(wildCardSkillsRounds.includes(roundId)?names:names.slice(0,6)),'NO_WINNER'];
 if(me!=='Jimmy'||skillsLocks.some(x=>x.round_id===roundId)||!Object.hasOwn(skillsHoles[roundId]||{},kind)||(t.value&&!eligible.includes(t.value))){notice='Not authorized or invalid contest';render();return;}
 const a=await db.rpc('set_skill_winner',{p_round:roundId,p_kind:kind,p_winner:t.value});
 if(a.error){alert('Unable to save skills result: '+a.error.message);notice=a.error.message;}
 await refresh();
 }else if(t.dataset.par||t.dataset.rank){let h=+(t.dataset.par||t.dataset.rank),v=+t.value;let old=hole(h);let a=await db.from('course_pars').upsert({round_id:roundId,hole:h,par:t.dataset.par?v:(old?.par??par(h)),stroke_index:t.dataset.rank?v:(old?.stroke_index??rank(h))});if(a.error)notice=a.error.message;await refresh();}else if(t.id==='ready'){let a=await db.rpc('set_scoring_ready',{p_ready:t.checked});if(a.error)notice=a.error.message;await refresh();}});
(async()=>{render();if(!db)return;let p=sessionStorage.getItem('rtj-player');if(p)await login(p);})();
