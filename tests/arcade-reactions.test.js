import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/vendor/three.module.js';
import {animateFighter} from '../public/arcade/fighters.js';
import {fighter} from '../public/arcade/state.js';
test('reaction overlays do not accumulate or modify authoritative fighters',()=>{
 const model=new T.Group(),spine=new T.Bone();model.add(spine);
 const mixer=new T.AnimationMixer(model),actions={};
 for(const name of ['idle','hit_chest','walk_loop'])actions[name]=mixer.clipAction(new T.AnimationClip(name,1,[]));
 const a={root:new T.Group(),mount:new T.Group(),mixer,actions,bones:{spine},poseBases:new Map(),materials:[],fallback:false};
 const f={...fighter(0),block:true};const snapshot=JSON.stringify(f);
 for(let i=0;i<100;i++)animateFighter(a,f,1/60,1);const first=spine.rotation.x;
 for(let i=0;i<100;i++)animateFighter(a,f,1/60,1);
 assert.ok(Math.abs(spine.rotation.x-first)<1e-8);assert.equal(JSON.stringify(f),snapshot);
 f.block=false;f.stun=20;f.lastHitFrame=2;animateFighter(a,f,1/60,2);
 assert.equal(a.current,actions.hit_chest);
 f.stun=0;for(let i=0;i<100;i++)animateFighter(a,f,1/60,40);assert.ok(Math.abs(spine.rotation.x)<1e-8);
});
import {aimGuardBone} from '../public/arcade/fighters.js';
test('guard aims a limb toward its target under a rotated parent',()=>{
 const root=new T.Group();root.rotation.y=Math.PI/2;const arm=new T.Bone(),hand=new T.Bone();root.add(arm);arm.add(hand);hand.position.x=1;root.updateMatrixWorld(true);
 const target=new T.Vector3(0,1,0);aimGuardBone(arm,hand,target,1);
 assert.ok(hand.getWorldPosition(new T.Vector3()).distanceTo(target)<1e-6);
});
