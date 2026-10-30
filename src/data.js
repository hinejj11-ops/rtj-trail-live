export const names=['Jimmy','Brittany','Kevin','Jeff','Nate','Richie','Mason'];
export const handicaps={Jimmy:6.8,Brittany:9,Kevin:11.2,Jeff:18,Nate:21.7,Richie:30,Mason:14};
export const rounds=[
{id:'silver-am',name:'Silver Lakes · Backbreaker / Mindbreaker',date:'Sat Nov 7',time:'7:00 AM',holes:18,rating:69.4,slope:131,par:72,format:'match',groups:[['Jimmy','Brittany','Kevin'],['Jeff','Nate','Richie']]},
{id:'silver-pm',name:'Silver Lakes · Heartbreaker / Short',date:'Sat Nov 7',time:'12:30 PM',holes:18,format:'vegas',groups:[['Brittany','Kevin','Richie'],['Jimmy','Nate','Jeff']]},
{id:'valley',name:'Oxmoor Valley · Valley',date:'Sun Nov 8',time:'7:40 AM',holes:18,rating:69.3,slope:130,par:72,format:'triple',groups:[['Jimmy','Kevin','Richie'],['Brittany','Jeff','Nate','Mason']]},
{id:'ridge',name:'Oxmoor Valley · Ridge',date:'Sun Nov 8',time:'1:00 PM',holes:18,rating:70.3,slope:133,par:72,format:'match',groups:[['Jimmy','Brittany','Jeff'],['Kevin','Nate','Richie','Mason']]},
{id:'ross',name:'Ross Bridge',date:'Mon Nov 9',time:'9:00 AM',holes:18,rating:69.6,slope:129,par:72,format:'stableford',groups:[['Jimmy','Brittany','Jeff'],['Kevin','Nate','Richie','Mason']]},
{id:'backyard',name:'Oxmoor Valley · Backyard',date:'Mon Nov 9',time:'3:22 PM',holes:9,format:'skins',groups:[names]},
{id:'links',name:'Grand National · Links',date:'Tue Nov 10',time:'12:30 PM',holes:18,rating:70.5,slope:128,par:72,format:'match',groups:[['Jimmy','Kevin','Nate'],['Brittany','Jeff','Richie']]},
{id:'lake',name:'Grand National · Lake',date:'Wed Nov 11',time:'7:40 AM',holes:18,rating:70.2,slope:131,par:72,format:'bestball',groups:[['Jimmy','Jeff','Richie'],['Brittany','Kevin','Nate']]},
{id:'short',name:'Grand National · Short',date:'Wed Nov 11',time:'1:30 PM',holes:18,rating:53.7,slope:89,par:54,format:'finale',groups:[names.slice(0,6)]}
];
export const teams={ 'silver-pm':[['Jimmy','Brittany'],['Kevin','Jeff'],['Nate','Richie']],valley:[['Jimmy','Kevin','Richie'],['Brittany','Jeff','Nate']],backyard:[['Jimmy','Jeff'],['Brittany','Richie'],['Kevin','Nate']],lake:[['Jimmy','Nate'],['Brittany','Kevin'],['Jeff','Richie']]};
export const roundPlayers=r=>['valley','ridge','ross','backyard'].includes(r.id)?names:names.slice(0,6);
export const courseHandicap=(r,n)=>r.rating==null?0:Math.floor(handicaps[n]*r.slope/113+r.rating-r.par+0.5);
export const heartbreakerStrokes={Jimmy:0,Brittany:1,Kevin:2,Jeff:6,Nate:8,Richie:13};

// Skills contest locations are maintained in the championship scoring module.

export const skillsHoles = {
 'silver-am':{ctp:11,ld:9},'silver-pm':{ctp:17,ld:3},
 valley:{ctp:16,ld:7},ridge:{ctp:8,ld:18},ross:{ctp:11,ld:7},
 backyard:{ctp:9},links:{ctp:16,ld:14},lake:{ctp:3,ld:12},short:{ctp:14}
};
export const wildCardSkillsRounds = ['valley','ridge','ross','backyard'];
