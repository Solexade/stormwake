// Server-owned deployment choices. Coordinates are existing walkable districts.
export const ARENAS=[
 {id:'coast',name:'Sunken Coast',tag:'COAST / TIMBER HARBOUR',text:'Fight along the shoreline, scavenge the harbour caches and keep a route back to the open coast.',traits:'Shoreline paths · Harbour supplies · Open coast',x:465,y:1410,view:[140,900,1200,1400],color:'#66d2dc'},
 {id:'city',name:'Old City',tag:'SETTLEMENT / STREETS',text:'Survive between rows of timber houses. Use the streets to reposition and search the district for supplies.',traits:'Timber streets · Five city caches · Mainland crossings',x:1850,y:1760,view:[1150,1100,1400,1150],color:'#efbd76'},
 {id:'river',name:'Riverhold',tag:'RIVER / BRIDGE CROSSINGS',text:'Hold the market streets, cross the timber bridge and draw the machines away from the settlement.',traits:'Market streets · River crossing · Ferry routes',x:2900,y:1800,view:[2600,200,1350,2050],color:'#aba5f5'},
 {id:'reach',name:'Emerald Reach',tag:'FOREST / EASTERN RUINS',text:'Take the fight into the eastern woodland. Search for weapon caches and keep moving through the ruins.',traits:'Forest paths · Ancient ruins · Eastern landing',x:4300,y:1800,view:[3950,180,1200,2150],color:'#b4d78b'}
];
export const arenaFor=id=>ARENAS.find(a=>a.id===id)||ARENAS[0];
