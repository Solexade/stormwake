import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../public/vendor/three.module.js';
import {inPlaceClip} from '../public/arcade/fighters.js';

test('detailed Arcade assets contain skins, textures and attacks within geometry budget',()=>{
 for(const file of ['azure_champion','hooded_blade']){
  const b=readFileSync(new URL('../public/assets/'+file+'.glb',import.meta.url)),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
  assert.ok(j.skins.length);assert.ok(j.images.every(i=>i.bufferView!==undefined&&!i.uri));
  assert.ok(j.animations.some(a=>a.name==='walk_loop'));assert.ok(j.animations.some(a=>/sword_regular|punch_jab/.test(a.name)));
  assert.ok(j.meshes.reduce((s,m)=>s+m.primitives.reduce((s,p)=>s+j.accessors[p.indices].count/3,0),0)<=23000);assert.ok(b.length<2100000);
 }
});
test('Arcade animation root motion cannot displace fighter horizontally',()=>{
 const clip=new T.AnimationClip('walk',1,[new T.VectorKeyframeTrack('mixamorigHips.position',[0,1],[0,1,0,3,2,4])]);
 const copy=inPlaceClip(clip);assert.deepEqual([...copy.tracks[0].values],[0,1,0,0,2,0]);assert.deepEqual([...clip.tracks[0].values],[0,1,0,3,2,4]);
});

import {HEROES,heroById,heroMaterial} from '../public/heroes.js';
test('shared hero contract provides Solo hand sockets and in-place locomotion sources',()=>{
 assert.deepEqual(HEROES.map(h=>h.id),['azure','frost','ash','hood']);assert.equal(heroById('old-save').id,'azure');
 for(const hero of HEROES){const b=readFileSync(new URL('../public/assets/'+hero.asset,import.meta.url));const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
 const names=gltf.nodes.map(n=>(n.name||'').replaceAll(':',''));
 for(const socket of ['mixamorigSpine','mixamorigRightHand','mixamorigLeftHand'])assert.ok(names.includes(socket),hero.id+' '+socket);
 assert.ok(gltf.animations.some(a=>a.name==='walk_loop'));
 }
 const original=new T.MeshStandardMaterial({color:'#ffffff'}),copy=heroMaterial(original,'hood');assert.notEqual(copy,original);assert.equal(original.color.getHex(),0xffffff);
 const shader={fragmentShader:'#include <color_fragment>'};copy.onBeforeCompile(shader);assert.match(shader.fragmentShader,/clothMask/);
});
