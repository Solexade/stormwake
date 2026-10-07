import test from 'node:test';
import assert from 'node:assert/strict';
import {MOTION,locomotion} from '../public/motion.js';

test('movement reaches useful speed in 50ms and reverses promptly',()=>{
 let v={vx:0,vy:0};for(let i=0;i<3;i++)v=locomotion(v.vx,v.vy,1,0,MOTION.jog,1/60);
 assert.ok(v.vx>MOTION.jog*.79);
 for(let i=0;i<4;i++)v=locomotion(v.vx,v.vy,-1,0,MOTION.jog,1/60);
 assert.ok(v.vx<-MOTION.jog*.8);
 for(let i=0;i<6;i++)v=locomotion(v.vx,v.vy,0,0,MOTION.jog,1/60);
 assert.ok(Math.abs(v.vx)<3,'releasing stops promptly instead of coasting');
});
test('movement remains frame-rate independent and diagonal speed is bounded',()=>{
 const simulate=(hz,dx,dy)=>{let v={vx:0,vy:0};for(let i=0;i<hz;i++)v=locomotion(v.vx,v.vy,dx,dy,MOTION.sprint,1/hz);return v;};
 const low=simulate(30,1,0),high=simulate(120,1,0),diagonal=simulate(60,1,1);
 assert.ok(Math.abs(low.vx-high.vx)<.001);
 assert.ok(Math.abs(Math.hypot(diagonal.vx,diagonal.vy)-high.vx)<.001);
});

import {MovementPreview} from '../public/movement-preview.js';
function previewAt(hz){
 const preview=new MovementPreview();
 preview.sync({id:'test',status:'active',player:{x:465,y:1410,vx:310,vy:0,angle:0,action:'idle',stamina:100}},0);
 for(let i=1;i<=hz/2;i++)preview.step({dx:1,dy:0,angle:0},1/hz,i*1000/hz);
 return preview;
}
test('preview covers the same distance at 10, 20 and 120 FPS',()=>{
 const reference=previewAt(120).player;
 for(const hz of [10,20,30,60])assert.ok(Math.abs(previewAt(hz).player.x-reference.x)<.01,`preview drift at ${hz} FPS`);
});
test('preview stops after stale server data and does not catch up a suspended tab',()=>{
 const preview=previewAt(60),pose=preview.step({dx:1},10,10000);
 assert.equal(pose.x,465);assert.equal(pose.vx,0);
});

test('stationary stale authority cannot brake fresh movement or pull a reversal backwards',()=>{
 const preview=new MovementPreview();
 const run={id:'latency',status:'active',player:{x:465,y:1410,vx:0,vy:0,angle:0,action:'idle',stamina:100}};
 preview.sync(run,0);
 for(let i=1;i<=24;i++)preview.step({dx:1,angle:0},1/60,i*1000/60);
 assert.ok(preview.player.x>570,'400ms without a reply must not tether the player to spawn');
 const before=preview.player.x;
 preview.sync(run,400,0);
 assert.equal(preview.player.x,before,'delayed response must not snap the current display back');
 for(let i=25;i<=31;i++)preview.step({dx:-1,angle:Math.PI},1/60,i*1000/60);
 assert.ok(preview.player.x<before-15,'reversal responds locally before server acknowledgement');
});

import {moveBody,walkable,STRUCTURES} from '../public/world.js';
test('large steps cannot tunnel through cottage walls, and diagonal input slides along them',()=>{
 const o=STRUCTURES[0],c=Math.cos(o.angle),s=Math.sin(o.angle);
 const world=(x,y)=>({x:o.x+c*x+s*y,y:o.y-s*x+c*y});
 const p=world(-o.w/2-25,0);
 assert.ok(walkable(p.x,p.y));
 moveBody(p,c*300,-s*300);
 assert.ok(walkable(p.x,p.y));
 assert.ok(c*(p.x-o.x)-s*(p.y-o.y)<-o.w/2,'must stop before the wall, not emerge on the far side');
 const q={...p};moveBody(q,30,60);assert.ok(walkable(q.x,q.y));assert.ok(Math.hypot(q.x-p.x,q.y-p.y)>0,'wall contact permits tangential movement');
});


test('released joystick stays planted through delayed idle replies and brief connection loss',()=>{
 const preview=previewAt(60);
 const snapshot={...preview.source,player:{...preview.source.player,x:preview.player.x-35,vx:0,vy:0}};
 preview.sync(snapshot,500,400);
 // Allow the existing braking curve to finish; it is deliberately unchanged.
 for(let i=1;i<=12;i++)preview.step({},1/60,500+i*1000/60);
 const stopped={x:preview.player.x,y:preview.player.y};
 for(let i=1;i<=120;i++){
  const now=700+i*1000/60;
  if(i%20===0)preview.sync(snapshot,now,now-350);
  const p=preview.step({},1/60,now);
  assert.equal(p.x,stopped.x);assert.equal(p.y,stopped.y);
 }
 const p=preview.step({},1/60,4000);
 assert.equal(p.x,stopped.x);assert.equal(p.y,stopped.y);
 // Corrections remain available on the next deliberate movement.
 preview.sync(snapshot,4100,4000);
 const moved=preview.step({dx:-1},1/60,4117);
 assert.ok(moved.x<stopped.x);
});
