import {firearmFor} from './arsenal.js';
import {walkable} from './world.js';
import {strikeChoice,weaponAttack} from './combat.js';
import {SURVIVAL_BOTS} from './survival.js';

const clamp01=t=>Math.max(0,Math.min(1,t));
const ease=t=>{const n=clamp01(t);return n*n*(3-2*n);};
const blend=(a,b,t)=>a+(b-a)*t;
// A brief local chambering pose begins at button-down. It never reaches contact.
export function strikeAnticipation(player,cue,now){
 if(!cue||player.action!=='idle'||player.hp<=0||player.dashing>0||cue.actionId!==player.actionId)return null;
 const elapsed=(now-cue.time)/1000;
 if(elapsed<0||elapsed>=.15)return null;
 const action=strikeChoice(player,cue.kind),attack=weaponAttack(player,action);
 if(!attack||player.stamina<attack.cost)return null;
 const time=Math.min(elapsed,attack.hit*.25)*(1-ease((elapsed-.10)/.05));
 return {action,actionDuration:attack.duration,actionTime:time};
}
export function weaponMotion(s,time){
 const attack=weaponAttack(s,s.action);
 const duration=s.actionDuration||attack?.duration;
 const hit=attack?.hit;
 return attack&&duration>0&&hit>0?strikeMotion(time,hit,duration):null;
}

export function strikeMotion(time,hit,duration){
 const release=Math.min(.13,hit*.52);
 const follow=Math.min(.15,(duration-hit)*.58);
 const windup=hit-release;
 const loaded=time<windup;
 const contact=time>=windup&&time<hit+follow;
 const stage=loaded?0:time<hit?1:contact?2:3;
 const progress=stage===0?time/Math.max(.01,windup):
  stage===1?(time-windup)/release:
  stage===2?(time-hit)/follow:(time-hit-follow)/Math.max(.01,duration-hit-follow);
 return {
  wind:ease(time/Math.max(.01,windup))*(1-ease((time-windup)/release)),
  drive:ease((time-hit+release)/(release+follow)),
  recovery:ease((time-hit-follow)/Math.max(.01,duration-hit-follow)),
  contact,stage,progress:clamp01(progress)
 };
}

// Columns: grip x/y/z, shaft yaw/elevation/roll, torso turn and forward lean.
const READY=[.37,1.05,-.27,.62,.48,.1,0,0];
const SPEAR_READY=[.33,1.08,.03,.13,.22,0,0,0];
const AXE_CUT=[
 [ .53,1.48,.02,1.67,.78,-.36,.43,-.10],
 [ .27,1.21,-.48,.05,.18,.16,-.10,.11],
 [-.14,1.01,-.46,-1.21,-.14,.52,-.46,.17]
];
const AXE_OVERHEAD=[
 [ .40,1.68,.02,1.95,1.23,-.26,.40,-.14],
 [ .24,1.26,-.52,.08,.14,.08,-.10,.16],
 [-.08,.83,-.55,-.81,-.59,.30,-.38,.28]
];
const SWORD_CUT=[
 [ .50,1.34,-.03,1.63,.61,-.48,.40,-.07],
 [ .27,1.23,-.52,.02,.02,.02,-.11,.09],
 [-.17,1.14,-.50,-1.62,.04,.53,-.49,.12]
];
const SPEAR_THRUST=[
 [.43,1.16,.25,.26,.15,0,.41,-.08],
 [.22,1.23,-.55,0,.04,0,-.15,.17],
 [.18,1.18,-.58,-.08,-.06,0,-.27,.18]
];
const SWEEP=[
 [ .54,1.36,.06,2.30,.31,-.38,.68,-.12],
 [ .22,1.22,-.53,0,0,.20,-.09,.14],
 [-.19,1.03,-.38,-2.08,-.21,.75,-.67,.22]
];

export function meleeGrip(weapon,action,motion){
 const thrust=weapon==='spear';
 const heavy=action==='heavy'||action==='finisher';
 const ready=thrust?SPEAR_READY:READY;
 const paths=thrust?SPEAR_THRUST:action==='finisher'?SWEEP:heavy?AXE_OVERHEAD:weapon==='sword'?SWORD_CUT:AXE_CUT;
 const mirror=action==='light2'&&!thrust;
 const frame=key=>{
  if(key===0||key===4)return ready;
  const p=paths[key-1];
  if(!mirror)return p;
  return [.30-p[0],p[1]-.14,Math.min(-.23,p[2]),-p[3],p[4]-.20,-p[5],-p[6],p[7]];
 };
 const {stage,progress}=motion||{stage:0,progress:0};
 // Join both sides of contact with high velocity, then decelerate on the follow-through.
 const t=stage===1?progress*progress:stage===2?1-(1-progress)**2:ease(progress);
 const start=frame(stage),end=frame(stage+1);
 const [x,y,z,yaw,pitch,roll,twist,lean]=start.map((value,i)=>blend(value,end[i],t));
 const horizontal=Math.cos(pitch);
 return {right:[x,y,z],shaft:[Math.sin(yaw)*horizontal,Math.sin(pitch),-Math.cos(yaw)*horizontal],roll,twist,lean};
}

export function enemySwingTime(e){return e.type==='boss'?.5:.3;}
export function enemyWindTime(e){
 if(e.type==='boss')return e.phase===2?.85:1.15;
 return SURVIVAL_BOTS[e.variant]?.wind??(e.type==='brute'?.85:e.type==='archer'?.62:.48);
}
// Presentation only: never changes simulation timing, input, or damage.
export function combatPose(s){
 if(s.hp<=0)return {name:'Death',once:true};
 if(firearmFor(s.weapon)&&['light1','light2','heavy','finisher'].includes(s.action))return {name:'Idle_swordLeft',hold:.15,state:'gun',key:s.actionId};
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
 const total=enemyWindTime(e);
 const label=e.type==='archer'?'ARROW · SIDESTEP':e.type==='boss'?'SLAM · LEAVE THE RING':e.variant==='scout'?'THRUST · SIDESTEP':e.variant==='bulwark'?'MAUL · DODGE':e.type==='brute'?'CLEAVE · DODGE':'STRIKE · GUARD';
 return {progress:Math.max(0,Math.min(1,1-e.wind/total)),label};
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
  if(e.hp<=0||d>=(firearmFor(player.weapon)?.range??480))return false;
  for(let n=8;n<d;n+=8)
   if(!walkable(player.x+(e.x-player.x)*n/d,player.y+(e.y-player.y)*n/d,2))return false;
  return true;
 };
 const candidates=[...enemies,...(boss?.awake?[boss]:[])].filter(visible);
 return candidates.find(e=>e.id===previous)||candidates.sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0]||null;
}
