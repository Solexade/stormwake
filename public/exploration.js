import {CACHES,FERRIES,PEOPLE,foundWeapons} from './voyage-data.js';
const near=(p,q,r)=>Math.hypot(p.x-q.x,p.y-q.y)<r;
export function explorationPrompt(s){
 const p=s.player;
 const crate=CACHES.find(c=>(s.mode==='survival'||c.kind!=='armory')&&!s.openedCaches?.includes(c.id)&&near(p,c,75));
 if(crate)return {kind:'loot',label:'Open '+(crate.kind==='armory'?'rare armory cache':crate.kind==='weapon'?'weapon cache':crate.kind==='health'?'healing cache':crate.kind==='core'?'combat core':'salvage chest'),ready:true,id:crate.id};
 const ferry=FERRIES.find(f=>near(p,f,75));
 if(ferry)return {kind:'ferry',label:s.mode!=='survival'&&ferry.region>s.chapter?'Clear chapter '+(ferry.region-1)+' to unlock this route':ferry.name,ready:s.mode==='survival'||ferry.region<=s.chapter,id:ferry.id};
 const person=PEOPLE.find(n=>near(p,n,60));
 if(person)return {kind:'talk',label:'Speak to '+person.name,ready:true,id:person.id};
 return null;
}
function seed(text){let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function explore(s,prompt,emit){
 if(!prompt?.ready||s.player.action!=='idle')return false;
 const p=s.player;
 if(prompt.kind==='loot'){
  const c=CACHES.find(c=>c.id===prompt.id);if(!c||(c.kind==='armory'&&s.mode!=='survival')||!near(p,c,75)||s.openedCaches?.includes(c.id))return false;
  s.openedCaches??=[];s.openedCaches.push(c.id);s.inventory??=foundWeapons({weapon:p.weapon});
  let text='';if(c.kind==='weapon'){const missing=['sword','spear'].filter(k=>!s.inventory.includes(k));const pool=missing.length?missing:['axe','sword','spear'];const weapon=pool[seed(s.id+':'+c.id)%pool.length];if(!s.inventory.includes(weapon))s.inventory.push(weapon);else s.salvage+=15;p.weapon=weapon;p.combo=p.comboWindow=p.comboCharge=0;s.buffer=null;text=weapon.toUpperCase()+' found and equipped';}
  if(c.kind==='armory'){
   if(!s.inventory.includes(c.weapon))s.inventory.push(c.weapon);
   p.weapon=c.weapon;p.combo=p.comboWindow=p.comboCharge=0;s.buffer=null;
   text=c.weapon==='pulse-carbine'?'Rare · Pulse carbine equipped':'Rare · Rift scattergun equipped';
  }
  if(c.kind==='health'){p.hp=Math.min(p.maxHp,p.hp+55);p.stamina=p.maxStamina;text='Vitality +55 · stamina restored';}
  if(c.kind==='salvage'){s.salvage+=35;text='+35 carried salvage';}
  if(c.kind==='core'){p.powerup=['overdrive','aegis','surge'][seed(s.id+c.id)%3];p.powerTime=25;text=p.powerup.toUpperCase()+' · 25 seconds';}
  emit(s,'discovery',{text,cache:c.id});return true;
 }
 if(prompt.kind==='talk'){const n=PEOPLE.find(n=>n.id===prompt.id);if(!n||!near(p,n,60))return false;emit(s,'dialogue',{text:n.text,name:n.name});return true;}
 if(prompt.kind==='ferry'){const f=FERRIES.find(f=>f.id===prompt.id);if(!f||!near(p,f,75)||(s.mode!=='survival'&&f.region>s.chapter))return false;
  s.travel={from:{x:p.x,y:p.y},to:{...f.to},remaining:3,duration:3,name:f.name};p.vx=p.vy=0;s.input={};s.commands={};s.buffer=null;s.shots=[];emit(s,'voyage',{text:f.name});return true;}
 return false;
}
