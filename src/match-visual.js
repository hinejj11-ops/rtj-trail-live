// Compact, expandable live match presentation. Segments: 0 unplayed, 1 left, 2 right, 3 tied.
export function matchSummary(left,right,status,thru,segments,winner=-1,subtitle=''){
 const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const side=(names,i)=>'<span class="match-side '+(winner===i?'match-side-leading-'+(i===0?'green':'gold'):'')+'">'+names.map(n=>'<span>'+esc(n)+'</span>').join('')+'</span>';
 const timeline='<span class="match-progress-scroll"><span class="match-progress" aria-label="Hole results: green left side, gold right side, gray halved, pale unplayed">'+segments.map((v,i)=>'<span title="Hole '+(i+1)+': '+(['Not played','Left side','Right side','Halved'][v]||'Not played')+'" class="match-progress-hole match-progress-'+v+'"></span>').join('')+'</span></span>';
 return '<span class="match-visual match-visual-'+(winner===0?'green':winner===1?'gold':'tied')+'"><span class="match-versus">'+side(left,0)+'<span class="match-center"><strong>'+esc(status)+'</strong><small>'+esc(thru)+'</small></span>'+side(right,1)+'</span>'+timeline+(subtitle?'<span class="match-visual-note">'+esc(subtitle)+'</span>':'')+'</span>';
}
