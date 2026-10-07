import {MOTION,locomotion} from './motion.js';
import {walkable,moveBody} from './world.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class MovementPreview {
 constructor(){this.reset();}
 reset(){this.player=null;this.source=null;this.received=0;this.history=[];this.correction={x:0,y:0};}
 sync(run,now,sentAt=now){
  const p=run?.player;if(!p)return;
  const previous=this.player,same=this.id===run.id;
  this.source=run;this.received=now;this.id=run.id;
  this.player={...p};
  if(previous&&same&&run.status==='active'&&!run.paused&&!run.inSafehouse){
   // Compare the response with the display at request time, not with today's
   // position. Otherwise ordinary network latency continually brakes movement.
   const past=this.history.reduce((best,h)=>Math.abs(h.time-sentAt)<Math.abs(best.time-sentAt)?h:best,{time:now,x:previous.x,y:previous.y});
   const ex=p.x-past.x,ey=p.y-past.y,error=Math.hypot(ex,ey);
   if(error<250){
    Object.assign(this.player,{x:previous.x,y:previous.y,vx:previous.vx,vy:previous.vy,angle:previous.angle});
    this.correction=error>12?{x:ex,y:ey}:{x:0,y:0};
   }else{this.history=[];this.correction={x:0,y:0};}
  }else{this.history=[];this.correction={x:0,y:0};}
 }
 step(input,dt,now){
  // Consume slow frames without dropping elapsed time; cap long tab suspensions.
  const elapsed=clamp(Number.isFinite(dt)?dt:0,0,.15),steps=Math.max(1,Math.ceil(elapsed/(1/120)));
  let pose=null;for(let i=0;i<steps;i++)pose=this.advance(input,elapsed/steps,now-elapsed*1000+(i+1)*elapsed/steps*1000);
  if(pose){this.history.push({time:now,x:pose.x,y:pose.y});this.history=this.history.filter(h=>now-h.time<1500);}
  return pose;
 }
 advance(input,dt,now){if(!this.player||!this.source)return null;const p=this.player,s=this.source,authority=s.player;dt=clamp(dt,0,.05);
  if(s.status!=='active'||s.paused||s.inSafehouse){Object.assign(p,authority,{vx:0,vy:0});return {...p};}
  if(now-this.received>700){if(Math.hypot(input.dx||0,input.dy||0)>.05)Object.assign(p,authority);p.vx=p.vy=0;return {...p,preview:true};}
  // Only the local display is predicted. Damage, stamina, rewards and collisions remain authoritative.
  let dx=input.dx||0,dy=input.dy||0;const mag=Math.hypot(dx,dy);if(mag>1){dx/=mag;dy/=mag;}
  const combat=authority.action!=='idle';p.sprinting=!!input.sprint&&mag>.1&&!input.guard&&!combat&&authority.stamina>5;
  const speed=(p.sprinting?MOTION.sprint:s.relic==='raven'?MOTION.raven:MOTION.jog)*(input.guard?.43:combat?.4:1);
  Object.assign(p,locomotion(p.vx,p.vy,dx,dy,speed,dt));
  // Reconcile only new snapshots, with a bounded adjustment. Never chase a
  // continuously extrapolated stale position through a direction change.
  // While resting, defer ordinary position corrections until movement resumes.
  // Otherwise delayed replies visibly drag a stopped character across the ground.
  const remaining=Math.hypot(this.correction.x,this.correction.y);
  const fraction=remaining&&(mag>.05||combat)?Math.min(1,40*dt/remaining):0;
  const cx=this.correction.x*fraction,cy=this.correction.y*fraction;
  this.correction.x-=cx;this.correction.y-=cy;
  let mx=p.vx*dt+cx,my=p.vy*dt+cy;
  if(authority.action==='roll'){mx=(authority.vx||0)*dt;my=(authority.vy||0)*dt;}
  // Substeps prevent prediction passing through a narrow obstacle during corrections.
  const oldX=p.x,oldY=p.y;moveBody(p,mx,my);
  // Animate actual displacement, so pushing against a wall cannot look like running.
  if(Math.abs(p.x-oldX)<.001)p.vx=0;if(Math.abs(p.y-oldY)<.001)p.vy=0;

  if(Number.isFinite(input.angle)){const delta=Math.atan2(Math.sin(input.angle-p.angle),Math.cos(input.angle-p.angle));p.angle+=clamp(delta,-dt*MOTION.turn,dt*MOTION.turn);}
  if(Math.hypot(p.vx,p.vy)>10)p.moveAngle=Math.atan2(p.vy,p.vx);
  return {...p,preview:true};
 }
}
