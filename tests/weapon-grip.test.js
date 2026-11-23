
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three.module.js';
import {aimJoint,orientHeld} from '../public/characters.js';
import {meleeGrip,strikeAnticipation,weaponMotion} from '../public/combat-presentation.js';
import {weaponAttack} from '../public/combat.js';
import {createHeldEffects} from '../public/scene/held-effects.js';
test('weapon grip aims a joint under rotated parents without stretching or moving root',()=>{
 const root=new THREE.Group();root.position.set(4,0,3);root.rotation.y=.7;
 const bone=new THREE.Bone(),child=new THREE.Bone();
 root.add(bone);bone.add(child);child.position.y=.5;
 const target=new THREE.Vector3(5,1,2),before=root.position.clone();
 aimJoint(bone,child,target);
 const origin=bone.getWorldPosition(new THREE.Vector3());
 const actual=child.getWorldPosition(new THREE.Vector3()).sub(origin);
 assert.ok(actual.clone().normalize().dot(target.clone().sub(origin).normalize())>.99999);
 assert.ok(Math.abs(actual.length()-.5)<1e-8);
 assert.ok(root.position.equals(before));
});

test('held blades and muzzles turn with a rotated actor and stay inside the hand socket',()=>{
 const root=new THREE.Group();
 const hand=new THREE.Group();hand.position.set(.32,1.22,-.24);
 const item=new THREE.Group();hand.add(item);root.add(hand);
 const localAim=new THREE.Vector3(0,0,-1);
 const axis=new THREE.Vector3(0,1,0);
 for(const yaw of [-Math.PI/2,0,Math.PI/2,Math.PI]){
  root.rotation.y=yaw;root.position.set(yaw,0,3);hand.rotation.set(.5,-.4,.62);
  orientHeld(item,axis,localAim,root);
  const origin=item.getWorldPosition(new THREE.Vector3());
  const tip=item.localToWorld(axis.clone());
  assert.ok(origin.distanceTo(hand.getWorldPosition(new THREE.Vector3()))<1e-6);
  assert.ok(tip.sub(origin).dot(localAim.clone().applyAxisAngle(axis,yaw))>.99999);
 }
});

test('axe and sword change sweep direction and spear reaches forward at contact',()=>{
 for(const weapon of ['axe','sword','spear']){
  const state={weapon,action:'light1'};
  const attack=weaponAttack(state,state.action);
  const idle=meleeGrip(weapon,state.action);
  const windup=meleeGrip(weapon,state.action,weaponMotion(state,attack.hit*.48));
  const hit=weaponMotion(state,attack.hit);
  assert.ok(windup.right[2]>idle.right[2]);
  assert.equal(hit.contact,true);
  assert.ok(meleeGrip(weapon,state.action,hit).right[2]<idle.right[2]);
  const follow=meleeGrip(weapon,state.action,weaponMotion(state,attack.hit+.10));
  const backhand={weapon,action:'light2'};
  const reversed=meleeGrip(weapon,backhand.action,weaponMotion(backhand,weaponAttack(backhand,backhand.action).hit+.10));
  if(weapon!=='spear')assert.ok(follow.shaft[0]<0&&reversed.shaft[0]>0);
  const recovered=meleeGrip(weapon,state.action,weaponMotion(state,attack.duration));
  for(let i=0;i<3;i++)assert.ok(Math.abs(recovered.right[i]-idle.right[i])<1e-8);
 }
});

test('a pulse stays at its original muzzle when the actor turns after firing',()=>{
 const scene=new THREE.Scene(),gun=new THREE.Group(),muzzle=new THREE.Object3D();
 gun.add(muzzle);scene.add(gun);muzzle.position.set(0,0,-.8);gun.userData.muzzle=muzzle;
 const view=createHeldEffects(scene);
 const state={weapon:'pulse-carbine',actionId:4};
 const effect={x:200,y:200,actionId:4};
 gun.position.set(5,1.4,5);
 const origin=view.pulseOrigin({gun},state,effect,'run');
 gun.rotation.y=Math.PI/2;gun.position.x++;
 assert.ok(view.pulseOrigin({gun},state,effect,'run').equals(origin));
 assert.ok(!view.pulseOrigin({gun},{...state,actionId:5},{...effect,actionId:5},'run').equals(origin));
});

test('the immediate strike cue never reaches a gameplay hit and expires on acknowledgement',()=>{
 const p={weapon:'axe',action:'idle',actionId:10,hp:120,stamina:100};
 const cue={kind:'heavy',actionId:10,time:1000};
 const state=strikeAnticipation(p,cue,1060);
 assert.equal(state.action,'heavy');
 assert.ok(state.actionTime>0);
 assert.equal(weaponMotion({...p,...state},state.actionTime).contact,false);
 assert.equal(strikeAnticipation({...p,actionId:11},cue,1060),null);
 assert.equal(strikeAnticipation({...p,stamina:2},cue,1060),null);
 assert.equal(strikeAnticipation(p,cue,1160),null);
});

test('heavy axe and spear poses lead with different shaft angles at windup and meet the aim at contact',()=>{
 const axe={weapon:'axe',action:'heavy'},spear={weapon:'spear',action:'heavy'};
 const pose=(state,time)=>meleeGrip(state.weapon,state.action,weaponMotion(state,time));
 for(const state of [axe,spear]){
  const hit=weaponAttack(state,state.action).hit;
  assert.ok(pose(state,hit).shaft[2]<-.96);
 }
 assert.ok(pose(axe,.18).shaft[1]>.75);
 assert.ok(pose(spear,.18).shaft[2]<-.9);
});
