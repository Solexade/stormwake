import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from '../public/vendor/three.module.js';
import {GLTFLoader} from '../public/vendor/GLTFLoader.js';
import {clone} from '../public/vendor/SkeletonUtils.js';
import {characterMount} from '../public/characters.js';
import {fitHarbourAsset,createHarbourAssets} from '../public/scene/harbour.js';

test('cloned character stays full-height and grounded after animation (bind-inverse regression)',async()=>{
 const data=await fs.readFile(new URL('../public/assets/knight.glb',import.meta.url));
 const source=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
 for(const scale of [1,1.3,1.85]){
  const model=clone(source.scene),mount=characterMount(model,scale),root=new THREE.Group();root.add(mount);root.position.set(11,0,35);
  const mixer=new THREE.AnimationMixer(model);mixer.clipAction(source.animations.find(c=>c.name.endsWith('|Idle'))).play();mixer.update(.1);root.updateMatrixWorld(true);
  model.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});
  const bounds=new THREE.Box3().setFromObject(root,true),height=bounds.max.y-bounds.min.y;
  assert.ok(height>1.8*scale&&height<2.1*scale,`visible body height ${height}`);
  assert.ok(Math.abs(bounds.min.y)<.03);assert.deepEqual(root.position.toArray(),[11,0,35]);
 }
});

test('harbour model fits inside existing circular collider and stays on ground',()=>{
 const model=new THREE.Mesh(new THREE.BoxGeometry(2,3,4),new THREE.MeshStandardMaterial());
 const group=fitHarbourAsset(model,{x:17.5,z:38,radius:1.3});group.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3());
 assert.ok(Math.hypot(size.x/2,size.z/2)<=1.300001);assert.equal(bounds.min.y,0);
 assert.deepEqual(group.position.toArray(),[17.5,0,38]);
});

test('failed asset retains fallback; loaded assets respect Performance preset',async()=>{
 const scene=new THREE.Scene(),canvas={dataset:{}},fallback=new THREE.Group();scene.add(fallback);
 const failed=createHarbourAssets(scene,canvas,async()=>{throw Error('test missing asset');});
 await failed.add('missing',fallback,{x:0,z:0,height:1});assert.equal(fallback.visible,true);
 const loaded=createHarbourAssets(scene,canvas,async()=>({scene:new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial())}));
 loaded.setQuality('low');await loaded.add('valid',fallback,{x:0,z:0,height:1});assert.equal(fallback.visible,true);
 loaded.setQuality('high');assert.equal(fallback.visible,false);assert.equal(canvas.dataset.harbourAssets,'1');
 loaded.setQuality('low');assert.equal(fallback.visible,true);
});

test('imported GLBs contain embedded PBR maps and no remote resource URIs',async()=>{
 for(const id of ['boulder_01','wooden_barrels_01']){
  const data=await fs.readFile(new URL('../public/assets/'+id+'.glb',import.meta.url));
  assert.equal(data.readUInt32LE(0),0x46546c67);assert.equal(data.readUInt32LE(8),data.length);
  const doc=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
  assert.equal(doc.meshes.length,1);assert.equal(doc.images.length,3);
  for(const image of doc.images){assert.equal(image.uri,undefined);assert.equal(typeof image.bufferView,'number');}
  const m=doc.materials[0];assert.ok(m.normalTexture&&m.occlusionTexture&&m.pbrMetallicRoughness.baseColorTexture&&m.pbrMetallicRoughness.metallicRoughnessTexture);
 }
});
