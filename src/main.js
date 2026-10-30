import {createClient} from '@supabase/supabase-js';
import {SUPABASE_URL,SUPABASE_ANON_KEY} from './config.js';
import {names,rounds,roundPlayers,courseHandicap,heartbreakerStrokes,teams,skillsHoles,wildCardSkillsRounds} from './data.js';
import {championship} from './championship.js';
import {roundSnapshot} from './round-snapshot.js';
import './style.css';
const db=SUPABASE_URL&&SUPABASE_ANON_KEY?createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
let me=null,roundId='silver-am',tab='scores',scores=[],skills=[],skillsLocks=[],holes=[],submissions=[],ready=false,testMode=false,notice='',target=null,channel=null,timer=null;
const $=s=>document.querySelector(s),r=()=>rounds.find(x=>x.id===roundId);
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const group=()=>r().groups.find(g=>g.includes(me))||[];
const hole=(h)=>holes.find(x=>x.round_id===roundId&&x.hole===h);
const par=h=>hole(h)?.par??(r().id==='backyard'||r().id==='short'||(r().id==='silver-pm'&&h>9)?3:4);
const rank=h=>hole(h)?.stroke_index??h;
const strokes=(player,h)=>{
 if(r().id==='backyard'||(r().id==='silver-pm'&&h>9))return 0;
 if(r().id==='silver-pm'){let n=heartbreakerStrokes[player]||0;return h<=9?Math.floor(n/9)+(rank(h)<=n%9?1:0):0;}
 const eligible=r().format==='match'?(r().groups.find(g=>g.includes(player))||[]):roundPlayers(r());
 const base=Math.min(...eligible.map(n=>courseHandicap(r(),n)));
 const n=Math.max(0,courseHandicap(r(),player)-base);
 return Math.floor(n/18)+(rank(h)<=n%18?1:0);
};
const score=(p,h)=>scores.find(s=>s.round_id===roundId&&s.player===p&&s.hole===h);
const net=(p,h)=>{let s=score(p,h);return s?s.gross-strokes(p,h)+(s.lifeline?1:0):null;};
const sf=(p)=>{let n=0;for(let h=1;h<=r().holes;h++){let x=net(p,h);if(x===null)continue;let d=x-par(h);n+=d<=-1?3:d===0?2:d===1?1:0;}return n;};
function render(){
 let body='';
 if(!me){body='<section class="panel"><h2>Who’s on the tee?</h2><p>Choose your name. Only one active device can claim each player.</p>'+names.map(n=>'<button class="player" data-login="'+n+'">'+n+' <span>→</span></button>').join('')+'</section>';}
 else{
 const tabs=[['scores','Scorecard'],['matches','Live matches'],['boards','Leaderboards'],['skills','CTP & LD'],['settings','Course setup']];
 body='<nav class="tabs">'+tabs.map(([id,label])=>'<button data-tab="'+id+'" class="'+(tab===id?'chosen':'')+'">'+label+'</button>').join('')+'</nav>';
 body+='<label>Round <select id="round">'+rounds.map(x=>'<option value="'+x.id+'" '+(x.id===roundId?'selected':'')+'>'+x.date+' · '+x.name+'</option>').join('')+'</select></label>';
 if(tab==='scores'){
 let players=roundPlayers(r());if(!target||!players.includes(target))target=me==='Jimmy'?'Jimmy':me;
 body+='<section class="panel"><h2>'+esc(r().name)+'</h2><p>'+r().date+' · '+r().time+' CST · '+r().format.toUpperCase()+'</p><p><strong>Round golfers:</strong> '+players.join(' · ')+'</p>';
 if(testMode)body+='<div class="warning"><strong>TEST MODE ACTIVE</strong> — scores are saved separately from official tournament scores.</div>';else if(!ready)body+='<div class="warning">Official scoring is locked until the organizer verifies hole pars and stroke indexes in Course setup.</div>';
 let locked=false,completed=0;if(players.length){body+='<label>'+(me==='Jimmy'?'Edit or view scores for ':'View scores for ')+'<select id="target">'+players.map(p=>'<option '+(target===p?'selected':'')+'>'+p+'</option>').join('')+'</select></label>';
 body+='<div class="score-head"><span>Hole</span><span>Par</span><span>Strokes</span><span>Gross</span><span>Net</span></div>';
 locked=!testMode&&submissions.some(x=>x.round_id===roundId&&x.player===target);completed=scores.filter(x=>x.round_id===roundId&&x.player===target).length;body+='<p><strong>'+esc(target)+'</strong> · '+completed+'/'+r().holes+' holes '+(locked?'· 🔒 SUBMITTED':testMode?'· TEST SCORECARD':'· DRAFT')+'</p>';for(let h=1;h<=r().holes;h++){let s=score(target,h),st=strokes(target,h);body+='<div class="score-row"><b>'+h+'</b><span>'+par(h)+'</span><span class="stroke">'+(st?'●'.repeat(st):'—')+'</span><span class="hole-input"><button data-step="-1" data-hole="'+h+'" '+(!(ready||testMode)||locked||me!=='Jimmy'?'disabled':'')+'>−</button><strong>'+(s?.gross??'—')+'</strong><button data-step="1" data-hole="'+h+'" '+(!(ready||testMode)||locked?'disabled':'')+'>+</button></span><b>'+(net(target,h)??'—')+'</b></div>';}}
 if(me==='Jimmy')body+='<div class="panel"><h3>End-of-round scorecard controls</h3><p class="small">Applies only to '+esc(target)+' on '+esc(r().name)+'.</p>'+(locked?'<p>🔒 Scorecard submitted and locked.</p>':!testMode&&ready?'<button id="submit-card" class="primary" '+(completed!==r().holes?'disabled':'')+'>Submit & lock '+esc(target)+' scorecard</button><p class="small">All '+r().holes+' holes must be recorded before submission.</p>':'<p>Official submission is available only when official scoring is enabled and Test Mode is off.</p>')+'<div style="margin-top:12px">'+(testMode||me==='Jimmy'?'<button id="reset-player">Reset '+esc(target)+' '+(testMode?'TEST':'OFFICIAL')+' scores for this round</button>':'<p class="small">Only Jimmy can reset official scorecards.</p>')+'</div>'+(locked&&me==='Jimmy'?'<button id="unlock-card">Unlock '+esc(target)+' scorecard (organizer)</button>':'')+'</div>';body+='<p class="small">Only Jimmy may edit, clear, submit or unlock scorecards for any golfer. Everyone can view scores. ● indicates a handicap stroke. Net values are provisional until hole stroke indexes are verified.</p></section>';
 }else if(tab==='matches'){
 body+='<section class="panel"><h2>Live match center</h2>';
 if(r().format==='match'){for(const g of r().groups){for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){if(g[i]==='Mason'||g[j]==='Mason')continue;let a=0,b=0,halves=0,played=0;for(let h=1;h<=r().holes;h++){let x=net(g[i],h),y=net(g[j],h);if(x===null||y===null)continue;played++;if(x<y)a++;else if(y<x)b++;else halves++;}let lead=a-b;body+='<div class="row"><span>'+g[i]+' vs '+g[j]+'</span><strong>'+(played===0?'Not started':lead===0?'All square':(lead>0?g[i]:g[j])+' '+Math.abs(lead)+' UP')+'</strong><small>'+played+'/'+r().holes+'</small></div>';}}}
 else body+='<p>Round format: '+r().format+'. See score snapshots and team pairings below.</p>';
 if(teams[roundId])body+='<p><strong>Teams:</strong> '+teams[roundId].map(t=>t.join(' + ')).join(' · ')+'</p>';
 body+='</section>';
 }else if(tab==='boards'){
 const engine=championship(scores,skills,holes,submissions);
 body+='<section class="panel"><h2>Championship standings</h2><p class="small">'+(testMode?'🧪 TEST MODE — standings use test scores.':'Official scores · Points post after every eligible scorecard is complete.')+'</p><p class="small">Five separate titles · $625 total prizes. A tied position splits the points for occupied places.</p></section>';
 for(const b of engine.boards){
  const sorted=[...b.eligible].sort((a,c)=>b.values[c]-b.values[a]||((b.ctp?.[c]||0)-(b.ctp?.[a]||0))||((b.ld?.[c]||0)-(b.ld?.[a]||0)));
  body+='<section class="panel"><h3>'+esc(b.name)+' <span class="prize">$'+b.prize+'</span></h3><p class="small">'+b.rounds+'/'+b.expected+' '+(b.id==='overall'||b.id==='wildSkills'?'skills contests recorded':'events completed')+' · '+(b.rounds===b.expected?'All events scored':'Provisional standings')+'</p>';
  sorted.forEach((p,i)=>{const tied=(i>0&&Math.abs(b.values[p]-b.values[sorted[i-1]])<1e-8)||(i<sorted.length-1&&Math.abs(b.values[p]-b.values[sorted[i+1]])<1e-8);const first=sorted.findIndex(q=>Math.abs(b.values[q]-b.values[p])<1e-8)+1;const place=tied?'T'+first:(i+1)+'.';body+='<div class="row"><b>'+place+' '+esc(p)+'</b><strong>'+Number(b.values[p].toFixed(3))+' pts</strong></div>';});
  if(engine.details[b.id]?.length){const eventNames={trail:['Silver Lakes AM · Match','Oxmoor Ridge · Match','Grand National Links · Match','Ross Bridge · Stableford','GN Short · Finale'],cup:['Silver Lakes PM · Vegas','Oxmoor Valley · Triple Threat','Backyard · Team skins','GN Lake · Best ball'],wild:['Valley · Stableford','Ridge · Stableford','Ross Bridge · Stableford','Backyard · Individual skins']};
   body+='<details><summary>Event point breakdown</summary>';
   engine.details[b.id].forEach((ev,i)=>{body+='<div class="small"><strong>Completed event '+(i+1)+'</strong></div>'+b.eligible.map(p=>'<div class="row"><span>'+esc(p)+'</span><span>'+Number((ev[p]||0).toFixed(3))+' pts</span></div>').join('');});
   body+='</details>';
  }
  body+='</section>';
 }
 const snapshot=roundSnapshot(roundId,scores,engine,holes);
 body+='<section class="panel"><h3>'+esc(r().name)+' · Live round leaderboard</h3><p class="small">'+esc(snapshot.format)+' · Updates with the selected round, not the date. Results are provisional until the round is complete.</p>';
 body+=snapshot.rows.length?snapshot.rows.map(x=>'<div class="row"><span><strong>'+esc(x.title)+'</strong><br><small>'+esc(x.detail)+'</small></span><span class="small">'+x.played+'/'+x.required+' holes</span></div>').join(''):'<p>No scores yet.</p>';
 if(snapshot.wildStableford.length){
  body+='<h4>Wild Card · Live Net Stableford</h4><p class="small">All seven golfers · 3 net birdie or better / 2 net par / 1 net bogey / 0 net double or worse. These are running hole points; Wild Card championship points (3 / 2 / 1) are awarded when all seven scorecards are complete.</p>';
  snapshot.wildStableford.forEach((x,i,all)=>{const tied=(i>0&&x.points===all[i-1].points)||(i<all.length-1&&x.points===all[i+1].points);const first=all.findIndex(y=>y.points===x.points)+1;body+='<div class="row"><b>'+(tied?'T'+first:(i+1)+'.')+' '+esc(x.player)+'</b><span class="small">'+x.played+'/18 holes</span><strong>'+x.points+' SF</strong></div>';});
 }
 body+='<details><summary>Golfer hole progress</summary>'+snapshot.players.map(p=>'<div class="row"><span>'+esc(p)+'</span><strong>'+snapshot.progress[p]+'/'+snapshot.holes+' holes</strong></div>').join('')+'</details></section>';
 }else if(tab==='skills'){
 const designated=skillsHoles[roundId]||{};
 const locked=skillsLocks.some(x=>x.round_id===roundId);
 const valid=skills.filter(x=>skillsHoles[x.round_id]&&Object.hasOwn(skillsHoles[x.round_id],x.kind)&&x.winner&&names.includes(x.winner));
 const overallValid=valid.filter(x=>names.slice(0,6).includes(x.winner));
 const wildValid=valid.filter(x=>wildCardSkillsRounds.includes(x.round_id));
 const eligible=wildCardSkillsRounds.includes(roundId)?names:names.slice(0,6);
 const recorded=Object.keys(designated).filter(kind=>valid.some(x=>x.round_id===roundId&&x.kind===kind)).length;
 body+='<section class="panel"><h2>CTP & Long Drive</h2><p class="small">All golfers can view results. Only Jimmy can select or change winners.</p><p><strong>'+esc(r().name)+'</strong> · '+(locked?'🔒 Locked results':'Provisional · '+recorded+'/'+Object.keys(designated).length+' selected')+'</p>';
 for(const kind of ['ctp','ld']){
  if(!Object.hasOwn(designated,kind))continue;
  const existing=skills.find(x=>x.round_id===roundId&&x.kind===kind);
  const label=(kind==='ctp'?'Closest to Pin':'Long Drive')+' — Hole '+designated[kind];
  if(me==='Jimmy'&&!locked){
   body+='<label>'+label+'<select data-skill="'+kind+'"><option value="">No winner yet</option>'+eligible.map(n=>'<option value="'+esc(n)+'" '+(existing?.winner===n?'selected':'')+'>'+esc(n)+'</option>').join('')+'</select></label>';
  }else{
   body+='<div class="row"><span>'+label+'</span><strong>'+esc(existing?.winner||'No winner yet')+'</strong></div>';
  }
 }
 if(me==='Jimmy'){
  body+='<button id="skills-lock" data-locked="'+(locked?'1':'0')+'" '+(!locked&&recorded!==Object.keys(designated).length?'disabled':'')+'>'+(locked?'Unlock Results':'Lock In Results')+'</button>';
  body+='<p class="small">'+(locked?'Unlock to correct a winner. Changes are visible to all golfers.':'Choose all designated winners before locking this round. Selections are visible to everyone immediately.')+'</p>';
 }
 body+='<p class="small">'+(wildCardSkillsRounds.includes(roundId)?'These contests count toward both championships for eligible golfers; Mason earns Wild Card Skills points only.':'These contests count toward Overall Skills only.')+'</p></section>';
 body+='<section class="panel"><h3>Overall Skills · '+overallValid.length+'/16 selected</h3>'+names.slice(0,6).map(n=>'<div class="row"><span>'+esc(n)+'</span><strong>'+overallValid.filter(x=>x.winner===n).length+' pts</strong></div>').join('')+'</section>';
 body+='<section class="panel"><h3>Wild Card Skills · '+wildValid.length+'/7 selected</h3>'+names.map(n=>'<div class="row"><span>'+esc(n)+'</span><strong>'+wildValid.filter(x=>x.winner===n).length+' pts</strong></div>').join('')+'</section>';
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
  channel=db.channel('live').on('postgres_changes',{event:'*',schema:'public',table:'scores'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'skills'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'course_pars'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'test_scores'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'scorecard_submissions'},refresh).subscribe();
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
async function save(h,d){if(me!=='Jimmy'||!(ready||testMode)||(!testMode&&submissions.some(x=>x.round_id===roundId&&x.player===target)))return;let old=score(target,h),gross=old?Math.max(1,Math.min(20,old.gross+d)):par(h);let a=await db.from(testMode?'test_scores':'scores').upsert({round_id:roundId,player:target,hole:h,gross,updated_by:(await db.auth.getUser()).data.user.id,updated_at:new Date().toISOString()});if(a.error)notice=a.error.message;await refresh();}
$('#app').addEventListener('click',async e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.login){b.disabled=true;await login(b.dataset.login);return;}if(b.hasAttribute('data-logout')){await db.rpc('release_player',{p_player:me});me=null;sessionStorage.removeItem('rtj-player');clearInterval(timer);if(channel)db.removeChannel(channel);render();return;}if(b.dataset.tab){tab=b.dataset.tab;render();return;}if(b.id==='reset-player'){if(me!=='Jimmy')return;const label=(testMode?'TEST':'OFFICIAL');if(!confirm('Delete '+target+'\'s '+label+' scores for '+r().name+'? This cannot be undone.'))return;let a=await db.rpc('reset_player_scorecard',{p_round:roundId,p_player:target,p_test:testMode});if(a.error)alert(a.error.message);else{await refresh();alert('Deleted '+a.data+' scores for '+target+'.');}return;}if(b.id==='submit-card'){if(me!=='Jimmy')return;if(!confirm('Submit and LOCK '+target+'\'s scorecard for '+r().name+'?'))return;let a=await db.rpc('submit_scorecard',{p_round:roundId,p_player:target,p_holes:r().holes});if(a.error)alert(a.error.message);else{await refresh();alert('Scorecard submitted and locked.');}return;}if(b.id==='unlock-card'){if(me!=='Jimmy')return;if(!confirm('Unlock '+target+'\'s submitted scorecard?'))return;let a=await db.rpc('unlock_scorecard',{p_round:roundId,p_player:target});if(a.error)alert(a.error.message);else await refresh();return;}if(b.id==='reset-test'){if(!confirm('Delete ALL test scores for every round and golfer? Official scores will not be touched.'))return;let a=await db.rpc('clear_test_scores');if(a.error){alert(a.error.message);}else{await refresh();alert('Cleared '+a.data+' test scores.');}return;}if(b.id==='skills-lock'){if(me!=='Jimmy')return;const locked=b.dataset.locked==='1';if(!confirm(locked?'Unlock skills results for this round so you can edit them?':'Lock in all CTP and Long Drive winners for this round?'))return;const a=await db.rpc('set_skills_round_lock',{p_round:roundId,p_locked:!locked});if(a.error){alert(a.error.message);notice=a.error.message;}await refresh();return;}if(b.dataset.step){await save(+b.dataset.hole,+b.dataset.step);}});
$('#app').addEventListener('change',async e=>{let t=e.target;if(t.id==='test-mode'){let a=await db.rpc('set_test_mode',{p_enabled:t.checked});if(a.error)alert(a.error.message);await refresh();}else if(t.id==='round'){roundId=t.value;target=null;render();}else if(t.id==='target'){target=t.value;render();}else if(t.dataset.skill){
 const kind=t.dataset.skill,eligible=wildCardSkillsRounds.includes(roundId)?names:names.slice(0,6);
 if(me!=='Jimmy'||skillsLocks.some(x=>x.round_id===roundId)||!Object.hasOwn(skillsHoles[roundId]||{},kind)||(t.value&&!eligible.includes(t.value))){notice='Not authorized or invalid contest';render();return;}
 const a=await db.rpc('set_skill_winner',{p_round:roundId,p_kind:kind,p_winner:t.value});
 if(a.error){alert('Unable to save skills result: '+a.error.message);notice=a.error.message;}
 await refresh();
 }else if(t.dataset.par||t.dataset.rank){let h=+(t.dataset.par||t.dataset.rank),v=+t.value;let old=hole(h);let a=await db.from('course_pars').upsert({round_id:roundId,hole:h,par:t.dataset.par?v:(old?.par??par(h)),stroke_index:t.dataset.rank?v:(old?.stroke_index??rank(h))});if(a.error)notice=a.error.message;await refresh();}else if(t.id==='ready'){let a=await db.rpc('set_scoring_ready',{p_ready:t.checked});if(a.error)notice=a.error.message;await refresh();}});
(async()=>{render();if(!db)return;let p=sessionStorage.getItem('rtj-player');if(p)await login(p);})();
