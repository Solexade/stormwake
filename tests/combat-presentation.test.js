import test from 'node:test';
import assert from 'node:assert/strict';
import {combatPose,warningFor} from '../public/combat-presentation.js';
test('combat poses prioritize death, dodge and attacks without mutating simulation',()=>{
 const s={hp:100,action:'light2',actionId:2,actionDuration:.48,vx:310,vy:0};const before={...s};
 assert.equal(combatPose(s).key,2);assert.equal(combatPose(s).duration,.48);assert.deepEqual(s,before);
 assert.equal(combatPose({...s,hp:0}).name,'Death');assert.equal(combatPose({...s,action:'roll'}).name,'Roll_sword');
 assert.equal(combatPose({...s,action:'idle',guard:true}).state,'guard');
 assert.equal(combatPose({...s,action:'idle',wind:.3}).state,'windup');
 assert.equal(combatPose({...s,action:'idle',swing:.2}).state,'swing');
 assert.equal(combatPose({...s,action:'idle',vx:0}).name,'Idle_swordRight');
});
test('enemy warning countdown includes archers and ends on release',()=>{
 assert.equal(warningFor({hp:80,type:'archer',wind:.62}).progress,0);
 assert.equal(warningFor({hp:80,type:'archer',wind:.31}).progress,.5);
 assert.match(warningFor({hp:80,type:'archer',wind:.1}).label,/SIDESTEP/);
 assert.equal(warningFor({hp:80,wind:0}),null);assert.equal(warningFor({hp:0,wind:.2}),null);
 assert.equal(warningFor({hp:100,type:'boss',phase:2,wind:.85}).progress,0);
});

import {soloAnimationAliases} from '../public/heroes.js';
test('Solo variants use their own rig and steel chains select distinct authored clips',()=>{
 assert.deepEqual(soloAnimationAliases('frost'),soloAnimationAliases('azure'));
 assert.deepEqual(soloAnimationAliases('ash'),soloAnimationAliases('hood'));
 const map=soloAnimationAliases('azure');assert.equal(new Set(['light1','light2','heavy'].map(action=>map[combatPose({hp:100,action}).name])).size,3);
 assert.equal(map.Roll_sword,'roll');assert.equal(map.Run,'sprint_loop');
});

import {heroGait,strideTime} from '../public/combat-presentation.js';
test('hero gaits match speed without changing simulation or combat priorities',()=>{
 const s={hp:100,vx:310,vy:0,sprinting:false},before={...s};
 assert.deepEqual(heroGait(s),{name:'Run',moving:true,rate:310/440});
 assert.equal(heroGait({...s,vx:90}).name,'Walking');
 assert.equal(heroGait({...s,vx:440,sprinting:true}).name,'Run');
 assert.equal(heroGait({...s,vx:160},'Jog').name,'Jog');
 assert.equal(heroGait({...s,vx:160},'Walking').name,'Walking');
 assert.equal(heroGait({...s,vx:0,vy:310}).rate,310/440);
 assert.deepEqual(s,before);
 for(const id of ['azure','frost','ash','hood'])assert.equal(soloAnimationAliases(id).Jog,'jog_fwd_loop');
 assert.equal(combatPose({...s,guard:true}).state,'guard');
 assert.equal(combatPose({...s,vx:0}).name,'Idle_swordRight');
});
test('gait transition preserves stride phase across different clip durations',()=>{
 assert.ok(Math.abs(strideTime(.3,.6,1)-.5)<1e-10);
 assert.ok(Math.abs(strideTime(.9,.6,1)-.5)<1e-10);
 assert.equal(strideTime(1,0,1),0);
});

import {runningPlayback,travelYaw} from '../public/combat-presentation.js';
test('running cadence follows scene distance and facing follows travel',()=>{
 const rate=runningPlayback(310,.708333,false);
 assert.ok(rate>1.5&&rate<1.7);
 assert.ok(Math.abs(3.4*rate/.708333-310/40)<1e-9);
 assert.ok(Math.abs(travelYaw(310,0,-Math.PI/2))<1e-9);
 assert.ok(Math.abs(travelYaw(0,310,-Math.PI/2)+Math.PI/2)<1e-9);
 assert.ok(Number.isFinite(runningPlayback(0,0)));
});
