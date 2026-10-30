export const names=['Jimmy','Brittany','Kevin','Jeff','Nate','Richie','Mason'];
export const handicaps={Jimmy:6.8,Brittany:10,Kevin:11.2,Jeff:18,Nate:21.7,Richie:30,Mason:14};
export const rounds=[
{id:'silver-am',name:'Silver Lakes · Backbreaker / Mindbreaker',date:'Sat Nov 7',time:'7:00 AM',holes:18,rating:69.4,slope:131,par:72,format:'match',groups:[['Jeff','Nate','Richie'],['Jimmy','Brittany','Kevin']]},
{id:'silver-pm',name:'Silver Lakes · Heartbreaker / Short',date:'Sat Nov 7',time:'12:30 PM',holes:18,format:'vegas',groups:[['Jimmy','Nate','Brittany'],['Jeff','Kevin','Richie']]},
{id:'valley',name:'Oxmoor Valley · Valley',date:'Sun Nov 8',time:'7:40 AM',holes:18,rating:69.3,slope:130,par:72,format:'triple',groups:[['Jimmy','Brittany','Richie','Mason'],['Kevin','Jeff','Nate']]},
{id:'ridge',name:'Oxmoor Valley · Ridge',date:'Sun Nov 8',time:'1:00 PM',holes:18,rating:70.3,slope:133,par:72,format:'match',groups:[['Kevin','Nate','Richie','Mason'],['Jimmy','Brittany','Jeff']]},
{id:'ross',name:'Ross Bridge',date:'Mon Nov 9',time:'9:00 AM',holes:18,rating:69.6,slope:129,par:72,format:'stableford',groups:[['Brittany','Kevin','Nate'],['Jimmy','Jeff','Richie','Mason']]},
{id:'backyard',name:'Oxmoor Valley · Backyard',date:'Mon Nov 9',time:'3:22 PM',holes:9,format:'skins',groups:[['Jimmy','Kevin','Jeff'],['Brittany','Nate','Richie','Mason']]},
{id:'links',name:'Grand National · Links',date:'Tue Nov 10',time:'12:30 PM',holes:18,rating:70.5,slope:128,par:72,format:'match',groups:[['Brittany','Jeff','Richie'],['Jimmy','Kevin','Nate']]},
{id:'lake',name:'Grand National · Lake',date:'Wed Nov 11',time:'7:40 AM',holes:18,rating:70.2,slope:131,par:72,format:'bestball',groups:[['Jimmy','Jeff','Nate'],['Brittany','Kevin','Richie']]},
{id:'short',name:'Grand National · Short',date:'Wed Nov 11',time:'1:30 PM',holes:18,rating:53.7,slope:89,par:54,format:'finale',groups:[['Kevin','Brittany','Jeff'],['Jimmy','Nate','Richie']]}
];
export const teams={ 'silver-pm':[['Jimmy','Brittany'],['Kevin','Jeff'],['Nate','Richie']],valley:[['Jimmy','Kevin','Richie'],['Brittany','Jeff','Nate']],backyard:[['Jimmy','Jeff'],['Brittany','Richie'],['Kevin','Nate']],lake:[['Jimmy','Nate'],['Brittany','Kevin'],['Jeff','Richie']]};
export const roundPlayers=r=>['valley','ridge','ross','backyard'].includes(r.id)?names:names.slice(0,6);
export const courseHandicap=(r,n)=>r.rating==null?0:Math.floor(handicaps[n]*r.slope/113+r.rating-r.par+0.5);
export const heartbreakerStrokes={Jimmy:0,Brittany:1,Kevin:2,Jeff:6,Nate:8,Richie:13};
export const silverShortStrokes={Jimmy:0,Brittany:1,Kevin:2,Jeff:5,Nate:5,Richie:12};
export const gnShortStrokes={Jimmy:0,Brittany:2,Kevin:2,Jeff:6,Nate:8,Richie:18};
export const tripleStrokes={Jimmy:0,Brittany:3,Kevin:5,Jeff:12,Nate:15,Richie:24};
export const stablefordStrokes={valley:{Jimmy:5,Brittany:8,Kevin:10,Mason:13,Jeff:17,Nate:21,Richie:30},ridge:{Jimmy:6,Brittany:10,Kevin:11,Mason:14,Jeff:19,Nate:23,Richie:32},ross:{Jimmy:5,Brittany:9,Kevin:10,Mason:13,Jeff:17,Nate:21,Richie:30}};
export const lifelineLimits={'silver-am':2,'silver-pm':1,valley:2,ridge:3,ross:3,links:2,lake:2};

// Skills contest locations are maintained in the championship scoring module.

export const skillsHoles = {
 'silver-am':{ctp:11,ld:9},'silver-pm':{ctp:17,ld:3},
 valley:{ctp:16,ld:7},ridge:{ctp:8,ld:18},ross:{ctp:11,ld:7},
 backyard:{ctp:9},links:{ctp:16,ld:14},lake:{ctp:3,ld:12},short:{ctp:14}
};
export const wildCardSkillsRounds = ['valley','ridge','ross','backyard'];
