// Server-owned deployment choices. Coordinates are existing walkable districts.
export const ARENAS=[
 {id:'coast',name:'Sunken Coast',tag:'COAST / TIMBER HARBOUR',text:'Fight along the shoreline, scavenge the harbour caches and keep a route back to the open coast.',traits:'Harbour supplies · Southwatch inlet · Coastal trails',x:465,y:1410,view:[0,990,1140,1860],color:'#66d2dc'},
 {id:'city',name:'Old City',tag:'SETTLEMENT / STREETS',text:'Survive between rows of timber houses. Use the streets to reposition and search the district for supplies.',traits:'Timber streets · Southern yards · Mainland crossings',x:1850,y:1760,view:[975,1020,1700,1880],color:'#efbd76'},
 {id:'river',name:'Riverhold',tag:'RIVER / BRIDGE CROSSINGS',text:'Hold the market streets, cross the timber bridge and draw the machines away from the settlement.',traits:'Market streets · Southern riverbank · Bridge crossings',x:2900,y:1800,view:[2580,200,1450,2630],color:'#aba5f5'},
 {id:'reach',name:'Emerald Reach',tag:'FOREST / EASTERN RUINS',text:'Take the fight into the eastern woodland. Search for weapon caches and keep moving through the ruins.',traits:'Forest paths · Ancient ruins · Eastern headland',x:4300,y:1800,view:[3930,160,1940,2630],color:'#b4d78b'},
 {id:'pinewatch',name:'Pinewatch Bluff',tag:'HEADLAND / WOODLAND TRAILS',text:'Fight around the ruined stone gate, then take the pine trails or turn south for Glasswater Basin.',traits:'Stone gate · Forest loop · Southern causeway',x:5920,y:800,view:[5280,180,1830,1280],color:'#a8d28b'},
 {id:'glasswater',name:'Glasswater Basin',tag:'ESTUARY / TWO BANKS',text:'Choose a bank, use the bridge to break pursuit and search the far shore for the armory cache.',traits:'Tidal channel · Timber bridge · Far-bank beacon',x:6100,y:2430,view:[5340,1730,2600,1930],color:'#7fd9d1'}
];
export const arenaFor=id=>ARENAS.find(a=>a.id===id)||ARENAS[0];
