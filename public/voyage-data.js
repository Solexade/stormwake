import {firearmFor} from './arsenal.js';
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
export const regionName=p=>p.x>=5540&&p.y<1800?'PINEWATCH BLUFF':p.x>=5570&&p.y>=1800?'GLASSWATER BASIN':p.x>3950?'THE EMERALD REACH':p.x>2600?'RIVERHOLD':p.x>1100&&p.y>1300?'OLD CITY':p.y>1750?'SOUTHWATCH COAST':null;
export function foundWeapons(gear={}) {return [...new Set(['axe',...(gear.foundWeapons||[]),gear.weapon].filter(k=>['axe','sword','spear'].includes(k)||firearmFor(k)))];}
export function voyageRank(gear={}){const a=gear.adventure||{},xp=(a.kills||0)*10+(a.bosses||0)*150;return {xp,name:xp>=1000?'Isles Champion':xp>=450?'Pathfinder':xp>=150?'Wayfarer':'Castaway',skins:xp>=1000?['tide','grove']:xp>=450?['tide']:[]};}
export function bankVoyage(gear,s){const a=gear.adventure||{};return {...gear,foundWeapons:[...new Set([...foundWeapons(gear),...(s.inventory||[])])],adventure:{kills:(a.kills||0)+(s.kills||0),bosses:(a.bosses||0)+(s.bossDead?1:0)}};}

// Connected survival districts: a broad mainland links the original coast to the river city.
EXTRA_LAND.push([[950,1250],[1400,1000],[2200,1050],[2500,1300],[2470,2150],[1050,2200]]);
EXTRA_BRIDGES.push({x:2390,y:1730,w:450,h:180},{x:3740,y:1040,w:420,h:160});
for(const [x,y] of [[1320,1580],[1530,1580],[1740,1580],[1950,1580],[2160,1580],[1320,1920],[1530,1920],[1740,1920],[1950,1920],[2160,1920],[1660,1240],[1960,1260]])HOMES.push({x,y,w:120,h:100,angle:0});
for(const [i,x,y,kind] of [[0,1400,1750,'weapon'],[1,1850,1760,'health'],[2,2250,1990,'core'],[3,2130,1240,'health'],[4,1600,2100,'salvage']])CACHES.push({id:'city-'+i,x,y,kind});

 // New shoreline loops are contiguous with their districts. These are authoritative
 // land polygons, so movement, navigation, previews and rendering share the routes.
 EXTRA_LAND.push(
  [[65,1770],[300,1650],[570,1870],[930,2110],[1000,2470],[793,2680],[400,2760],[115,2550],[45,2200]],
  [[1070,2050],[1750,2080],[2390,1990],[2600,2160],[2630,2550],[2300,2780],[1710,2840],[1230,2680],[1090,2440]],
  [[2660,1930],[3050,1970],[3230,1770],[3520,1690],[3750,1840],[3810,2260],[3630,2600],[3140,2750],[2760,2630],[2680,2360]],
  [[4690,1680],[5000,1530],[5340,1530],[5680,1790],[5810,2120],[5690,2520],[5380,2700],[4900,2660],[4660,2370],[4590,2080]],
  [[4730,495],[4930,380],[5280,385],[5510,575],[5570,870],[5400,1215],[5080,1300],[4800,1110]]
 );
 EXTRA_BRIDGES.push({x:3750,y:2060,w:400,h:135});
 for(const [x,y,w,h,angle] of [
  [380,2350,120,100,.14],[645,2430,104,95,-.22],
  [1430,2430,150,110,.09],[1700,2570,100,100,.15],[2180,2430,135,99,-.18],
  [3030,2290,110,95,.2],[3330,2440,138,112,-.16],[3560,2060,110,90,.35],
  [5090,2170,120,100,.26],[5330,2330,105,93,-.22],[5230,813,120,104,.33]
 ])HOMES.push({x,y,w,h,angle});
 for(const [id,x,y,kind] of [
  ['south-inlet-tonic',490,2530,'health'],['south-inlet-weapons',770,2290,'weapon'],
  ['city-yard-tonic',1570,2325,'health'],['city-yard-core',2280,2520,'core'],
  ['riverbank-core',3205,2350,'core'],['riverbank-tonic',3530,2315,'health'],
  ['reach-east-weapons',5380,1970,'weapon'],['reach-east-tonic',5540,2260,'health'],
  ['reach-north-core',5310,675,'core']
 ])CACHES.push({id,x,y,kind});

 export const DISTRICT_TRAILS=[
  [[465,1410],[510,1640],[460,1950],[490,2290],[490,2530],[734,2480],[770,2290]],
  [[1180,1760],[1850,1760],[2280,1760],[2520,1820],[2640,1795],[2900,1800]],
  [[1850,1760],[1850,2190],[2050,2290],[2280,2520]],
  [[2900,1800],[2920,2060],[3170,2240],[3470,2260],[3650,2140],[3970,2130],[4190,2110]],
  [[4300,1800],[4550,1930],[4850,1970],[5150,1970],[5380,1970],[5540,2260]],
  [[4610,1260],[4780,1110],[4990,980],[5100,720],[5310,675]]
 ];

export const WORLD_TRAILS=[...DISTRICT_TRAILS,[[500,1600],[750,1780],[750,2050],[920,2070]],[[2900,1800],[3035,1600],[3035,1350],[3370,1250],[3550,900],[3660,640]],[[4230,1800],[4440,1500],[4440,1320],[4610,1260],[4700,650]],[[465,1410],[655,1360],[750,1180],[930,1100],[1135,815],[1420,820],[1650,795],[1840,680],[1910,560]],[[930,850],[780,810],[660,710]]];

 // These are surveyed supply sites in the existing survival districts.
 CACHES.push(
  {id:'harbour-armory',x:517,y:1454,kind:'armory',weapon:'pulse-carbine'},
  {id:'city-siege-cache',x:2070,y:1770,kind:'armory',weapon:'rift-scattergun'},
  {id:'river-armory',x:3150,y:2220,kind:'armory',weapon:'pulse-carbine'},
  {id:'reach-siege-cache',x:5150,y:1970,kind:'armory',weapon:'rift-scattergun'}
 );

// Windward bluffs and two banks of a real estuary. Polygons overlap the old
// eastern headlands so the approaches work on foot and for the pursuit grid.
EXTRA_LAND.push(
 [[5330,620],[5600,440],[5940,305],[6430,320],[6830,560],[7030,890],[6830,1230],[6440,1360],[6080,1260],[5710,1400],[5410,1190]],
 [[5970,1310],[6220,1250],[6410,1450],[6380,1680],[6280,1880],[6020,1940],[5900,1710]],
 [[5520,2110],[5800,1840],[6150,1790],[6460,1930],[6650,2260],[6460,2510],[6490,2830],[6240,3180],[5890,3280],[5560,3070],[5410,2710]],
 [[6860,1800],[7210,1900],[7520,2150],[7750,2590],[7610,3100],[7290,3510],[6850,3540],[6570,3300],[6750,2930],[6820,2500],[6870,2220]]
);
EXTRA_BRIDGES.push({x:6070,y:1215,w:160,h:250},{x:6360,y:2420,w:620,h:150});
WORLD_TRAILS.push(
 [[5310,675],[5530,850],[5680,930],[5920,800],[5920,690],[5920,550],[6240,490],[6470,610],[6480,900],[6200,1100],[5920,800]],
 [[6200,1100],[6150,1320],[6140,1620],[6130,1880],[6090,2260],[6100,2430]],
 [[5540,2260],[5770,2250],[6090,2260],[6100,2430],[6300,2495],[6730,2495],[7120,2495]],
 [[6100,2430],[6030,2650],[5950,2970],[6190,3070],[6320,2760],[6300,2495]],
 [[7120,2495],[7320,2600],[7370,2940],[7190,3210],[6900,3260],[6950,2790],[7120,2495]]
);
HOMES.push(
 {x:5770,y:1140,w:116,h:92,angle:.19},{x:6380,y:770,w:104,h:98,angle:-.23},
 {x:5940,y:2070,w:130,h:112,angle:.18},{x:6300,y:2240,w:118,h:94,angle:-.13},
 {x:7280,y:2390,w:120,h:94,angle:.28},{x:7100,y:3120,w:112,h:96,angle:.12}
);
export const EASTERN_LANDMARKS={
 gate:{x:5920,y:690,pillarOffset:57},
 beacon:{x:7450,y:2730}
};
CACHES.push(
 {id:'pinewatch-weapons',x:5958,y:800,kind:'weapon'},
 {id:'pinewatch-tonic',x:6200,y:560,kind:'health'},
 {id:'pinewatch-core',x:6460,y:930,kind:'core'},
 {id:'glasswater-arms',x:6140,y:2450,kind:'weapon'},
 {id:'glasswater-tonic',x:6010,y:2870,kind:'health'},
 {id:'glasswater-armory',x:7070,y:2525,kind:'armory',weapon:'rift-scattergun'},
 {id:'glasswater-core',x:7220,y:3200,kind:'core'}
);
