import {walkable} from './world.js';
// Presentation only: never changes simulation timing, input, or damage.
export function combatPose(s){
 if(s.hp<=0)return {name:'Death',once:true};
 if(s.weapon==='gun'&&['light1','light2','heavy','finisher'].includes(s.action))return {name:'Idle_swordLeft',hold:.15,state:'gun',key:s.actionId};
 if(s.action==='riposte')return {name:'ComboFollowup',fallback:'Run_swordAttack',once:true,duration:s.actionDuration,key:s.actionId};
 if(s.action==='roll')return {name:'Roll_sword',once:true,duration:s.actionDuration,key:s.actionId};
 if(['light1','light2','heavy','finisher'].includes(s.action))return {name:{light1:'Run_swordAttack',light2:'ComboFollowup',heavy:'HeavyStrike',finisher:'FinisherStrike'}[s.action],fallback:s.action==='light1'||s.action==='light2'?'Run_swordAttack':'swordAttackJump',once:true,duration:s.actionDuration,key:s.actionId};
 if(s.stagger>0)return {name:'HitReaction',fallback:'Idle_swordLeft',hold:.3,state:'stagger'};
 if(s.wind>0)return {name:'swordAttackJump',hold:.2,state:'windup'};
 if(s.swing>0)return {name:'swordAttackJump',once:true,duration:s.type==='boss'?.5:.3,state:'swing'};
 if(s.guard)return {name:'Idle_swordLeft',hold:.15,state:'guard'};
 if(Math.hypot(s.vx||0,s.vy||0)>8)return {name:s.sprinting?'Run':'Walking',moving:true};
 return {name:'Idle_swordRight'};
}
export function warningFor(e){
 if(e.hp<=0||!(e.wind>0))return null;
 const total=e.type==='boss'?(e.phase===2?.85:1.15):e.type==='brute'?.85:e.type==='archer'?.62:.48;
 return {progress:Math.max(0,Math.min(1,1-e.wind/total)),label:e.type==='archer'?'ARROW Â· SIDESTEP':e.type==='boss'?'SLAM Â· LEAVE THE RING':e.type==='brute'?'CLEAVE Â· DODGE':'STRIKE Â· GUARD'};
}

// Visual gait only. Hysteresis prevents analog jitter from restarting a stride.
export function heroGait(s, previous) {
 const speed=Math.hypot(s.vx||0,s.vy||0);
 const jogging=speed>(previous==='Jog'||previous==='Run'?145:175);
 const running=speed>(previous==='Run'?230:265);
 const name=running?'Run':jogging?'Jog':'Walking';
 const reference=name==='Run'?440:name==='Jog'?310:155;
 return {name,moving:true,rate:Math.max(.15,Math.min(1.4,speed/reference))};
}
export function strideTime(time, oldDuration, newDuration) {
 return oldDuration>0 && newDuration>0
  ? ((time%oldDuration+oldDuration)%oldDuration)/oldDuration*newDuration : 0;
}

// Scene uses 40 simulation units/metre. One authored loop is two footfalls.
// These stride lengths bound visual cadence; they never scale the player root.
export function runningPlayback(speed, duration, sprinting=false) {
 const stride=sprinting?4.1:3.4;
 return Math.max(.15,Math.min(2.8,(speed/40)/stride*duration));
}
export function travelYaw(vx,vy,rootYaw) {
 const delta=-Math.atan2(vy,vx)-Math.PI/2-rootYaw;
 return Math.atan2(Math.sin(delta),Math.cos(delta));
}

// Aim assistance proposes an input angle only; damage remains server validated.
export function gunTarget(player,enemies,boss,previous=null){
 const visible=e=>{
  const d=Math.hypot(e.x-player.x,e.y-player.y);
  if(e.hp<=0||d>=480)return false;
  for(let n=8;n<d;n+=8)
   if(!walkable(player.x+(e.x-player.x)*n/d,player.y+(e.y-player.y)*n/d,2))return false;
  return true;
 };
 const candidates=[...enemies,...(boss?.awake?[boss]:[])].filter(visible);
 return candidates.find(e=>e.id===previous)||candidates.sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]||null;
}
