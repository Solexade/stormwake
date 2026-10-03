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
