import test from 'node:test';
import assert from 'node:assert/strict';
import {meleeAim} from '../public/mobile-controls.js';
test('melee follows movement through all eight directions despite assisted targets behind',()=>{
 for(let i=0;i<8;i++){const a=i*Math.PI/4;assert.ok(Math.abs(meleeAim({dx:Math.cos(a),dy:Math.sin(a),angle:0,assist:true,player:{x:0,y:0},enemies:[{x:-100,y:0,hp:10}]})-Math.atan2(Math.sin(a),Math.cos(a)))<1e-10);}
});
test('idle assistance cannot reverse facing; explicit pointer and lock still work',()=>{
 const base={angle:0,assist:true,player:{x:0,y:0},enemies:[{x:-10,y:0,hp:10}]};assert.equal(meleeAim(base),0);
 assert.equal(meleeAim({...base,enemies:[{x:50,y:50,hp:10}]}),Math.PI/4);
 assert.equal(meleeAim({...base,dx:1,pointerAngle:Math.PI}),Math.PI);
 assert.equal(meleeAim({...base,dx:1,pointerAngle:Math.PI,lockedAngle:-1}),-1);
 assert.equal(meleeAim({angle:1.2}),1.2);
});
