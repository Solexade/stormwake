import {MOVES} from './config.js';
import {event} from './state.js';
import {hitbox,hurtbox,overlaps} from './hitboxes.js';
export function beginAttack(f,name){if(!MOVES[name]||f.stun||f.blockStun||f.block||f.crouch||f.cooldown||name==='special'&&f.specialCD)return false;
 // Confirmed light strikes can cancel late recovery into a heavier follow-up.
 if(f.move&&!(f.move==='light'&&f.hit&&f.moveFrame>=10&&(name==='heavy'||name==='special')))return false;
 f.move=name;f.moveFrame=0;f.hit=false;if(name==='special')f.specialCD=MOVES.special.cooldown;return true;
}
export function resolveHits(s){
 const hits=s.fighters.map((f,i)=>overlaps(hitbox(f),hurtbox(s.fighters[1-i])));
 for(let i=0;i<2;i++){if(!hits[i])continue;const a=s.fighters[i],d=s.fighters[1-i],m=MOVES[a.move];if(!m)continue;
 a.hit=true;const blocked=d.block&&d.y===0&&d.facing===(a.x>d.x?1:-1);
 if(blocked){d.blockStun=m.blockStun;event(s,'block',{target:1-i});}
 else{a.combo=s.frame<=a.comboUntil?a.combo+1:1;a.comboUntil=s.frame+m.stun+25;d.hp=Math.max(0,d.hp-Math.round(m.damage*Math.max(.60,1-(a.combo-1)*.1)));d.stun=m.stun;d.lastHitFrame=s.frame;d.flash=8;event(s,'hit',{target:1-i,combo:a.combo});}
 d.x+=a.facing*(blocked?m.push*.3:m.push);
 }
 // Resolve trades simultaneously, then interrupt both attacked fighters.
 hits.forEach((yes,i)=>{if(yes){const d=s.fighters[1-i];if(d.stun){d.move=null;d.moveFrame=0;}}});
}
export function timers(f){for(const k of ['stun','blockStun','specialCD','cooldown','flash'])f[k]=Math.max(0,f[k]-1);if(f.move){const m=MOVES[f.move];f.moveFrame++;if(f.moveFrame>=m.startup+m.active+m.recovery){f.move=null;f.cooldown=m.cooldown&&m!==MOVES.special?m.cooldown:0;}}}
