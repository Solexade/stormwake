export {HEROES,heroById} from '../heroes.js';
export const ARENAS = Object.freeze([
 {id:'harbour',name:'Harbour Watch',tag:'Cold coast / daylight',sky:'#233b50',sea:'#31566a',key:'#ffe4c0',rim:'#a4d8ef',floor:'#a6afc0'},
 {id:'embers',name:'Ember Keep',tag:'Volcanic shore / dusk',sky:'#261b29',sea:'#251d29',key:'#ffb277',rim:'#e16c56',floor:'#b99c84'},
 {id:'frost',name:'Frostbound Reach',tag:'Northern sea / moonlight',sky:'#142b40',sea:'#193b55',key:'#c8e6ff',rim:'#67bcec',floor:'#d4e6eb'}
]);
export const arenaById = id => ARENAS.find(x=>x.id===id)||ARENAS[0];
