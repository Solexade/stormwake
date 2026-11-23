export const FIREARMS = Object.freeze({
 'pulse-carbine': {name:'Pulse carbine',description:'A long-range pulse weapon found in an armory cache.',range:470,damage:28,stamina:10,duration:.48,spread:0,colour:'#9eeaff'},
 'rift-scattergun': {name:'Rift scattergun',description:'A short-range spread weapon found in a siege cache.',range:240,damage:19,stamina:21,duration:.85,spread:.14,colour:'#ffcd9e'}
});

export function firearmFor(id){
 return Object.hasOwn(FIREARMS,id)?FIREARMS[id]:null;
}

export function firearmAttack(id,attack){
 const weapon=firearmFor(id);
 const heavy=attack==='heavy';
 return {
  name:heavy?'Charged pulse':weapon.name,
  hit:.1,duration:weapon.duration+(heavy?.23:0),lunge:0,
  cost:weapon.stamina+(heavy?8:0),range:weapon.range,
  damage:weapon.damage+(heavy?9:0),stagger:heavy?.28:.15,arc:.08
 };
}
