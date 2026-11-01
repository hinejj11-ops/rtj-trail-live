// Golf score symbols are always based on gross strokes relative to hole par.
export function scoreSymbol(gross,par){
 if(gross===null||gross===undefined||!Number.isFinite(Number(gross))||!Number.isFinite(Number(par)))return 'score-symbol';
 const difference=Number(gross)-Number(par);
 return difference<=-2?'score-symbol score-eagle':difference===-1?'score-symbol score-birdie':difference===1?'score-symbol score-bogey':difference>=2?'score-symbol score-double-bogey':'score-symbol';
}
export function grossScoreHtml(gross,par){
 return '<span class="'+scoreSymbol(gross,par)+'">'+(gross??'—')+'</span>';
}
