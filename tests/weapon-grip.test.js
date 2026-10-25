
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../public/vendor/three.module.js';
import {aimJoint} from '../public/characters.js';
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
