import {walkable} from './world.js';
export function startSurvival(s){
 s.mode='survival';s.survivalVersion=1;s.wave=0;s.nextWave=2;s.enemies=[];
 s.boss.hp=0;s.boss.awake=false;s.bossDead=false;s.relicReady=false;
 return s;
}
export function survivalStep(s,dt,emit){
 if(s.mode!=='survival'||s.status!=='active')return;
 if(s.enemies.some(e=>e.hp>0))return;
 s.nextWave-=dt;if(s.nextWave>0)return;
 const wave=s.wave+1,count=Math.min(24,4+wave*2),enemies=[];
 for(let i=0;i<count;i++){
  let point=null;
  for(let j=0;j<96;j++){
   const a=(i/count+j*.618)*Math.PI*2,r=260+(j%5)*30,x=s.player.x+Math.cos(a)*r,y=s.player.y+Math.sin(a)*r;
   if(walkable(x,y,22)&&!enemies.some(e=>Math.hypot(e.x-x,e.y-y)<45)){point={x,y};break;}
  }
  if(!point)continue;
  // Stable slots bound renderer memory; each slot has a consistent bot type.
  const type=i%5===4?'brute':i%3===2?'archer':'raider',base=type==='brute'?130:type==='archer'?64:80,hp=Math.round(base*(1+Math.min(2,(wave-1)*.09)));
  enemies.push({id:i,type,...point,homeX:point.x,homeY:point.y,hp,maxHp:hp,cd:1.5+i*.08,wind:0,angle:0,flash:0,stagger:0,swing:0,death:0,vx:0,vy:0});
 }
 if(!enemies.length){s.nextWave=1;return;}
 s.wave=wave;s.enemies=enemies;s.nextWave=4;emit(s,'wave',{wave,count:enemies.length});
}
export function bankSurvival(gear,s){
 if(s.mode!=='survival'||s.status!=='dead')return gear;
 const previous=gear.survival||{};
 return {...gear,survival:{runs:(previous.runs||0)+1,bestKills:Math.max(previous.bestKills||0,s.kills),bestSeconds:Math.max(previous.bestSeconds||0,Math.floor(s.elapsed)),bestWave:Math.max(previous.bestWave||0,s.wave),bestScore:Math.max(previous.bestScore||0,s.score)}};
}
