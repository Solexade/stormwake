export {HEROES,heroById} from '../heroes.js';
export const ARENAS = Object.freeze([
 {id:'harbour',name:'Harbour Watch',tag:'Cold coast / daylight',sky:'#233b50',sea:'#274b50',key:'#e4e3d5',rim:'#a3bdc6',floor:'#b2b6a8'},
 {id:'embers',name:'Ember Keep',tag:'Volcanic shore / dusk',sky:'#261b29',sea:'#302b30',key:'#eab282',rim:'#bb7760',floor:'#a9a193'},
 {id:'frost',name:'Frostbound Reach',tag:'Northern sea / moonlight',sky:'#142b40',sea:'#253d4d',key:'#c8dde5',rim:'#8cabc8',floor:'#bdcbd1'}
]);
export const arenaById = id => ARENAS.find(x=>x.id===id)||ARENAS[0];
