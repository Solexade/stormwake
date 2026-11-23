import {arenaFor} from './arenas.js';
import {walkable} from './world.js';
import {connectedEnemySpawn} from './pursuit.js';

const MAX_ACTIVE=24;
const CLEAR_DELAY=4;
const REJOIN_DISTANCE=1050;
export const SURVIVAL_BOTS=Object.freeze({
 scout:{type:'raider',health:56,speed:165,reach:76,hitRange:92,wind:.34,cooldown:1.1,damage:9},
 bulwark:{type:'brute',health:165,speed:68,reach:103,hitRange:130,wind:1.04,cooldown:2.15,damage:29}
});
const LINEUP=['raider','scout','archer','raider','brute','bulwark','archer','scout'];

export function startSurvival(s,arenaId){
 const arena=arenaFor(arenaId);
 s.arenaId=arena.id;s.arenaName=arena.name;s.home={x:arena.x,y:arena.y};Object.assign(s.player,s.home);
 s.mode='survival';s.survivalVersion=3;s.wave=0;s.nextWave=2;s.enemies=[];
 s.boss.hp=0;s.boss.awake=false;s.bossDead=false;s.relicReady=false;
 return s;
}

function spawnPoint(s,slot){
 const p=s.player,offset=(slot*.618+s.wave*.173)*Math.PI*2;
 // Try a wide perimeter first, then shorter distances when the player is on a narrow route.
 for(const radius of [330,275,400,220,175,460]){
  for(let i=0;i<20;i++){
   const angle=offset+i*Math.PI*2/20;
   const point={x:p.x+Math.cos(angle)*radius,y:p.y+Math.sin(angle)*radius};
   if(!walkable(point.x,point.y,22))continue;
   if(s.enemies.some(e=>(e.hp>0||e.death>0)&&Math.hypot(e.x-point.x,e.y-point.y)<54))continue;
   if(connectedEnemySpawn(point,p))return point;
  }
 }
 return null;
}

function reposition(enemy,point){
 Object.assign(enemy,point,{homeX:point.x,homeY:point.y,cd:1.6,wind:0,swing:0,vx:0,vy:0,stalled:0,pursuitProbe:null,arrival:.9});
}

function rallyStragglers(s){
 if(s.elapsed<(s.rallyAt||0))return;
 const candidate=s.enemies.find(e=>e.hp>0&&(
  Math.hypot(e.x-s.player.x,e.y-s.player.y)>REJOIN_DISTANCE||(e.stalled||0)>=4
 ));
 if(!candidate)return;
 const point=spawnPoint(s,candidate.id);
 s.rallyAt=s.elapsed+(point ? .65 : 1.5);
 if(point)reposition(candidate,point);
}

export function survivalStep(s,dt,emit){
 if(s.mode!=='survival'||s.status!=='active')return;
 rallyStragglers(s);
 if(s.enemies.some(e=>e.hp>0))return;
 s.nextWave-=dt;
 if(s.nextWave>0)return;
 const wave=s.wave+1,count=Math.min(MAX_ACTIVE,4+wave*2);
 const spawns=[];
 s.enemies=s.enemies.filter(e=>e.hp>0||e.death>0);
 for(let id=0;id<MAX_ACTIVE&&spawns.length<count;id++){
  if(s.enemies.some(e=>e.id===id))continue;
  const point=spawnPoint(s,id);
  if(!point)continue;
  const role=LINEUP[id%LINEUP.length];
  const variant=SURVIVAL_BOTS[role];
  const type=variant?.type||role;
  const base=variant?.health??(type==='brute'?130:type==='archer'?64:80);
  const hp=Math.round(base*(1+Math.min(2,(wave-1)*.09)));
  const enemy={id,type,hp,maxHp:hp,angle:0,flash:0,stagger:0,death:0};
  if(variant)enemy.variant=role;
  reposition(enemy,point);s.enemies.push(enemy);spawns.push(enemy);
 }
 if(!spawns.length){
  s.nextWave=1;
  return;
 }
 s.wave=wave;s.nextWave=CLEAR_DELAY;
 emit(s,'wave',{wave,count:spawns.length});
}

export function bankSurvival(gear,s){
 if(s.mode!=='survival'||s.status!=='dead')return gear;
 const previous=gear.survival||{};
 return {...gear,survival:{runs:(previous.runs||0)+1,bestKills:Math.max(previous.bestKills||0,s.kills),bestSeconds:Math.max(previous.bestSeconds||0,Math.floor(s.elapsed)),bestWave:Math.max(previous.bestWave||0,s.wave),bestScore:Math.max(previous.bestScore||0,s.score)}};
}
