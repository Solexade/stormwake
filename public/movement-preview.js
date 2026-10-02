import {MOTION,locomotion} from './motion.js';
import {walkable} from './world.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class MovementPreview {
 constructor(){this.reset();}
 reset(){this.player=null;this.source=null;this.received=0;}
 sync(run,now){const p=run?.player;if(!p)return;const previous=this.player;this.source=run;this.received=now;
  this.player={...p};
  if(previous&&this.id===run.id&&run.status==='active'&&!run.paused&&!run.inSafehouse&&Math.hypot(previous.x-p.x,previous.y-p.y)<100){this.player.x=previous.x;this.player.y=previous.y;this.player.vx=previous.vx;this.player.vy=previous.vy;this.player.angle=previous.angle;}
  this.id=run.id;
 }
 step(input,dt,now){if(!this.player||!this.source)return null;const p=this.player,s=this.source,authority=s.player;dt=clamp(dt,0,.05);
  if(s.status!=='active'||s.paused||s.inSafehouse||now-this.received>700){Object.assign(p,authority,{vx:0,vy:0});return {...p};}
  // Only the local display is predicted. Damage, stamina, rewards and collisions remain authoritative.
  let dx=input.dx||0,dy=input.dy||0;const mag=Math.hypot(dx,dy);if(mag>1){dx/=mag;dy/=mag;}
  const combat=authority.action!=='idle';p.sprinting=!!input.sprint&&mag>.1&&!input.guard&&!combat&&authority.stamina>5;
  const speed=(p.sprinting?MOTION.sprint:s.relic==='raven'?MOTION.raven:MOTION.jog)*(input.guard?.43:combat?.4:1);
  Object.assign(p,locomotion(p.vx,p.vy,dx,dy,speed,dt));
  const age=Math.min(.25,(now-this.received)/1000),targetX=authority.x+(authority.vx||0)*age,targetY=authority.y+(authority.vy||0)*age;
  const error=Math.hypot(p.x-targetX,p.y-targetY),correction=error>12?1-Math.exp(-dt*(error>65?18:5)):0;
  let mx=p.vx*dt+(targetX-p.x)*correction,my=p.vy*dt+(targetY-p.y)*correction;
  if(authority.action==='roll'){mx=(targetX-p.x)*(1-Math.exp(-dt*22));my=(targetY-p.y)*(1-Math.exp(-dt*22));}
  // Substeps prevent prediction passing through a narrow obstacle during corrections.
  const steps=Math.max(1,Math.ceil(Math.hypot(mx,my)/5));for(let n=0;n<steps;n++){if(walkable(p.x+mx/steps,p.y,16))p.x+=mx/steps;else p.vx=0;if(walkable(p.x,p.y+my/steps,16))p.y+=my/steps;else p.vy=0;}
  if(Number.isFinite(input.angle)){const delta=Math.atan2(Math.sin(input.angle-p.angle),Math.cos(input.angle-p.angle));p.angle+=clamp(delta,-dt*MOTION.turn,dt*MOTION.turn);}
  if(Math.hypot(p.vx,p.vy)>10)p.moveAngle=Math.atan2(p.vy,p.vx);
  return {...p,preview:true};
 }
}
