import {SampleMixer} from './sample-mixer.js';
export class AdventureAudio {
 constructor(host=globalThis){this.mixer=new SampleMixer(host);this.foot=0;this.winds=new Map();this.nextThunder=25;this.weapon='axe';}
 get enabled(){return this.mixer.enabled;}set enabled(v){if(!v)this.mixer.mute();else this.mixer.enabled=true;}
 get music(){return this.mixer.music;}set music(v){this.mixer.setMusic(v);}
 get ctx(){return this.mixer.ctx;}
 async enable(){return this.mixer.enable();}
 effect(kind,event={}){const m=this.mixer,w=this.weapon,heavy=event.attack==='heavy'||event.attack==='finisher';
  if(kind==='swing'||kind==='dodge')m.play(w==='spear'?'swing2':'swing1',{rate:w==='sword'?1.13:w==='axe'?.83:1,volume:.45});
  if(['strike','hurt','finisher'].includes(kind)){m.play(w==='axe'?'chop':w==='spear'?'hit2':'hit1',{volume:heavy?.85:.58,rate:heavy?.78:1});m.play('bass',{volume:heavy?.48:.22,rate:.8});m.duck();}
  if(kind==='block'||kind==='parry'){m.play('metal',{volume:.7,rate:kind==='parry'?1.15:.9});m.duck();}
  if(['chest','relic','boss-defeated','upgrade','combo-ready'].includes(kind))m.play('reward',{volume:.7});
  if(kind==='kill')m.play('defeat',{rate:event.enemy==='boss'?.75:1,volume:.45});
  if(['boss-awake','boss-slam'].includes(kind)){m.play('warning',{volume:.7,rate:.85});m.duck();}
  if(kind==='storm')m.play('thunder',{volume:.65});
 }
 update(p,active,boss,hidden,run){const m=this.mixer;this.weapon=p?.weapon||'axe';const threats=(run?.enemies||[]).concat(run?.boss?.awake?[run.boss]:[]);const nearby=threats.some(e=>e.hp>0&&p&&Math.hypot(e.x-p.x,e.y-p.y)<360);m.setScene(boss||nearby?'combat':'explore',active&&!hidden);
  const now=m.ctx?.currentTime||0;if(active&&!hidden&&m.enabled){if(p&&Math.hypot(p.vx||0,p.vy||0)>20&&now>this.foot){m.play(now%2<1?'foot1':'foot2',{volume:.20});this.foot=now+(p.sprinting?.24:.34);}
   if(now>this.nextThunder){m.play('thunder',{bus:'ambience',volume:.18,rate:.85});this.nextThunder=now+35;}
   for(const e of threats){const prev=this.winds.get(e.id);if(e.type!=='boss'&&prev!==undefined&&e.wind>prev+.1&&e.hp>0&&p&&Math.hypot(e.x-p.x,e.y-p.y)<450){m.play('warning',{rate:e.type==='brute'?.8:e.type==='archer'?1.2:1,volume:.45});m.duck();}}
  }
  this.winds=new Map(threats.map(e=>[e.id,e.wind]));
 }
}
