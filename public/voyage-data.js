// Shared authoritative locations. All distances are simulation units.
export const REGIONS=[
 {id:1,name:'The Sunken Coast',home:{x:465,y:1410},shrine:{x:1135,y:815},boss:{x:1910,y:560},bossName:'The Prime Directive'},
 {id:2,name:'Riverhold',home:{x:2900,y:1800},shrine:{x:3370,y:1250},boss:{x:3660,y:640},bossName:'The Iron Castellan'},
 {id:3,name:'The Emerald Reach',home:{x:4230,y:1800},shrine:{x:4610,y:1260},boss:{x:4700,y:650},bossName:'The Thorn Engine'}
];
export const EXTRA_LAND=[
 [[300,1640],[820,1600],[1110,1800],[1050,2130],[630,2290],[230,2120],[180,1840]],
 [[2700,1650],[2850,1450],[3070,1490],[3180,1750],[3120,2070],[2800,2160],[2650,1910]],
 [[2830,1350],[2780,900],[2920,410],[3270,260],[3750,360],[3890,800],[3750,1340],[3490,1570],[3190,1440]],
 [[4050,1630],[4210,1420],[4590,1440],[4900,1660],[4980,2070],[4670,2290],[4200,2190],[4010,1910]],
 [[4120,1320],[4010,830],[4170,350],[4570,220],[4940,460],[5050,1060],[4840,1390],[4560,1410]]
];
export const EXTRA_BRIDGES=[{x:2960,y:1300,w:150,h:310},{x:4360,y:1290,w:160,h:280}];
export const HOMES=[{x:580,y:1900,w:120,h:100,angle:.1},{x:860,y:1940,w:110,h:100,angle:-.2},
 {x:2800,y:1730,w:120,h:100,angle:0},{x:3060,y:1870,w:120,h:100,angle:.2},
 {x:2990,y:1140,w:130,h:110,angle:0},{x:3290,y:990,w:130,h:110,angle:.2},{x:3570,y:1070,w:120,h:100,angle:-.15},
 {x:4150,y:1740,w:120,h:100,angle:0},{x:4460,y:1890,w:120,h:100,angle:.1},{x:4530,y:920,w:120,h:100,angle:.2}];
export const CAMPS=[{id:'coast',x:750,y:2050,name:'Southwatch Hearth'}, {id:'river',x:2910,y:1930,name:'Riverhold Market'}, {id:'reach',x:4330,y:1990,name:'Wayfarer Rest'}];
export const FERRIES=[
 {id:'coast-river',x:1020,y:2070,to:{x:2900,y:1800},region:2,name:'Sail to Riverhold'},
 {id:'river-coast',x:2850,y:2040,to:{x:870,y:2070},region:1,name:'Sail to the Sunken Coast'},
 {id:'river-reach',x:3080,y:2010,to:{x:4230,y:1800},region:3,name:'Sail to the Emerald Reach'},
 {id:'reach-river',x:4190,y:2070,to:{x:2960,y:1800},region:2,name:'Sail to Riverhold'}
];
export const PEOPLE=[
 {id:'sigrid',x:715,y:2010,name:'Sigrid · shipwright',text:'The river ferry lies east of this hearth. Defeat the coastal commander and extract to open the Riverhold route.'},
 {id:'tor',x:2880,y:1890,name:'Tor · market keeper',text:'Rest and trade at the market. Cross the timber bridge north, recover the river relic, then find the Iron Castellan in the old citadel.'},
 {id:'liva',x:4370,y:1960,name:'Liva · pathfinder',text:'Follow the river crossing into the northern forest. The Thorn Engine guards the ruins. Return to the southern landing with the Heartbeat.'}
];
export const CACHES=[
 {id:'starter',x:505,y:1420,kind:'weapon'}, {id:'south-arms',x:770,y:1810,kind:'weapon'},
 {id:'south-med',x:420,y:2050,kind:'health'}, {id:'south-spoils',x:990,y:1920,kind:'salvage'},
 {id:'grove-arms',x:1180,y:1210,kind:'weapon'}, {id:'hollow-core',x:700,y:590,kind:'core'},
 {id:'river-arms',x:2950,y:1770,kind:'weapon'}, {id:'river-med',x:3040,y:1640,kind:'health'},
 {id:'river-spoils',x:3090,y:1190,kind:'salvage'}, {id:'river-core',x:3450,y:900,kind:'core'},
 {id:'river-vault',x:3710,y:480,kind:'weapon'},
 {id:'reach-arms',x:4280,y:1810,kind:'weapon'}, {id:'reach-med',x:4650,y:1970,kind:'health'},
 {id:'reach-spoils',x:4450,y:1120,kind:'salvage'}, {id:'reach-core',x:4780,y:970,kind:'core'},
 {id:'reach-vault',x:4830,y:700,kind:'weapon'}
];
export const regionFor=chapter=>REGIONS[Math.max(0,Math.min(2,(chapter||1)-1))];
export const regionName=p=>p.x>3950?'THE EMERALD REACH':p.x>2600?'RIVERHOLD':p.x>1100&&p.y>1300?'OLD CITY':p.y>1750?'SOUTHWATCH COAST':null;
export function foundWeapons(gear={}) {return [...new Set(['axe',...(gear.foundWeapons||[]),gear.weapon].filter(k=>['axe','sword','spear'].includes(k)))];}
export function voyageRank(gear={}){const a=gear.adventure||{},xp=(a.kills||0)*10+(a.bosses||0)*150;return {xp,name:xp>=1000?'Isles Champion':xp>=450?'Pathfinder':xp>=150?'Wayfarer':'Castaway',skins:xp>=1000?['tide','grove']:xp>=450?['tide']:[]};}
export function bankVoyage(gear,s){const a=gear.adventure||{};return {...gear,foundWeapons:[...new Set([...foundWeapons(gear),...(s.inventory||[])])],adventure:{kills:(a.kills||0)+(s.kills||0),bosses:(a.bosses||0)+(s.bossDead?1:0)}};}

// Connected survival districts: a broad mainland links the original coast to the river city.
EXTRA_LAND.push([[950,1250],[1400,1000],[2200,1050],[2500,1300],[2470,2150],[1050,2200]]);
EXTRA_BRIDGES.push({x:2390,y:1730,w:450,h:180},{x:3740,y:1040,w:420,h:160});
for(const [x,y] of [[1320,1580],[1530,1580],[1740,1580],[1950,1580],[2160,1580],[1320,1920],[1530,1920],[1740,1920],[1950,1920],[2160,1920],[1660,1240],[1960,1260]])HOMES.push({x,y,w:120,h:100,angle:0});
for(const [i,x,y,kind] of [[0,1400,1750,'weapon'],[1,1850,1760,'health'],[2,2250,1990,'core'],[3,2130,1240,'health'],[4,1600,2100,'salvage']])CACHES.push({id:'city-'+i,x,y,kind});
