// Cosmetic selections only. All fighters share authoritative frame data and hitboxes.
export const HEROES = Object.freeze([
 {id:'voyager',name:'The Voyager',asset:'knight.glb',color:'#ffffff',tag:'Solo Quest hero',description:'The same rigged adventurer seen in Solo Quest.'},
 {id:'warden',name:'Drowned Warden',asset:'knight.glb',color:'#9f717e',tag:'Solo Quest rival',description:'The Solo guardian palette, scaled for a fair duel.'},
 {id:'scout',name:'Coastal Scout',asset:'knight.glb',color:'#789e89',tag:'Solo Quest rival',description:'The coastal archer palette. Shared competitive moves.'},
 {id:'azure',name:'Azure Champion',asset:'azure_champion.glb',color:'#ffffff',tag:'Guest fighter',description:'An armoured swordsman with native blade animations.'},
 {id:'hood',name:'Hooded Blade',asset:'hooded_blade.glb',color:'#ffffff',tag:'Guest fighter',description:'A hooded challenger with close-range striking animations.'}
]);
export const ARENAS = Object.freeze([
 {id:'harbour',name:'Harbour Watch',tag:'Cold coast / daylight',sky:'#233b50',sea:'#31566a',key:'#ffe4c0',rim:'#a4d8ef',floor:'#a6afc0'},
 {id:'embers',name:'Ember Keep',tag:'Volcanic shore / dusk',sky:'#261b29',sea:'#251d29',key:'#ffb277',rim:'#e16c56',floor:'#b99c84'},
 {id:'frost',name:'Frostbound Reach',tag:'Northern sea / moonlight',sky:'#142b40',sea:'#193b55',key:'#c8e6ff',rim:'#67bcec',floor:'#d4e6eb'}
]);
export const heroById = id => HEROES.find(x=>x.id===id)||HEROES[0];
export const arenaById = id => ARENAS.find(x=>x.id===id)||ARENAS[0];
