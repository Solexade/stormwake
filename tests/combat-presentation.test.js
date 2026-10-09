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
