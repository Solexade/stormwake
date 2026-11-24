import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from '../public/vendor/three.module.js';
import {createHarbourAssets,fitHarbourAsset} from '../public/scene/harbour.js';
import {coastDistance,coastTexture,CLIFF_PLACEMENTS,createSceneryVisibility} from '../public/scene/sunken-isles.js';
import {LAND,HOME,SHRINE,BOSS,walkable,landAt} from '../public/world.js';
const prop=()=>({scene:new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial())});

test('harbour retries transient failures, deduplicates pending calls and publishes once',async()=>{
 let calls=0,release;const scene=new THREE.Scene(),canvas={dataset:{}},fallback=new THREE.Group();scene.add(fallback);
 const assets=createHarbourAssets(scene,canvas,async()=>{calls++;if(calls===1)throw Error('offline test');await new Promise(r=>release=r);return prop();});
 await assets.add('prop',fallback,{x:0,z:0,height:1});assert.equal(canvas.dataset.harbourFailures,'1');assert.equal(fallback.visible,true);
 const a=assets.setQuality('high'),b=assets.retry();await Promise.resolve();assert.equal(calls,2);assets.setQuality('low');release();await Promise.all([a,b]);
 assert.equal(scene.children.length,2);assert.equal(fallback.visible,true);assert.equal(scene.children[1].visible,false);
 await assets.setQuality('high');await assets.retry();assert.equal(calls,2);assert.equal(fallback.visible,false);assert.equal(canvas.dataset.harbourPending,'0');assert.equal(canvas.dataset.harbourFailures,'0');
 assert.throws(()=>assets.add('duplicate',fallback,{x:0,z:0,height:1}),/already registered/);
});

test('synchronous loader failures retain fallback and can recover',async()=>{
 let fail=true;const canvas={dataset:{}},scene=new THREE.Scene(),fallback=new THREE.Group();scene.add(fallback);
 const assets=createHarbourAssets(scene,canvas,()=>{if(fail)throw Error('sync test');return prop();});await assets.add('prop',fallback,{x:0,z:0,height:1});assert.equal(fallback.visible,true);fail=false;await assets.retry();assert.equal(canvas.dataset.harbourAssets,'1');
});

test('fitting respects both maximum radius and height, nonzero pivot, and offset',()=>{
 const model=new THREE.Group();const mesh=prop().scene;mesh.scale.set(8,3,2);mesh.position.set(2,4,-3);model.add(mesh);
 const fitted=fitHarbourAsset(model,{x:5,z:8,radius:2,height:1,y:-1.4,angle:.3});fitted.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(fitted);assert.ok(b.max.y<=-.39999);assert.ok(Math.abs(b.min.y+1.4)<1e-6);
 assert.throws(()=>fitHarbourAsset(new THREE.Group(),{x:0,z:0,height:1}),/bounds/);
 assert.throws(()=>fitHarbourAsset(prop().scene,{x:0,z:0}),/size/);
});

test('camera obstruction fades only registered material clones and restores them',()=>{
 const visibility=createSceneryVisibility(),root=new THREE.Group(),m=prop().scene;root.add(m);m.position.set(0,1,2);root.updateMatrixWorld(true);const original=m.material;visibility.add(root);visibility.add(root);
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,1,5);const hero=new THREE.Vector3(0,1,0);
 assert.equal(visibility.update(camera,hero,.1,true),1);assert.ok(m.material.opacity<.4);assert.equal(original.opacity,1);assert.notEqual(original,m.material);
 camera.position.x=5;for(let i=0;i<10;i++)visibility.update(camera,hero,.1,true);assert.ok(m.material.opacity>.99);assert.equal(m.material.depthWrite,true);
});

test('coastal depth field and cliff placements cannot change traversal',()=>{
 const before=JSON.stringify(LAND);assert.ok(coastDistance(245/40,1210/40)<1e-6);assert.ok(coastDistance(-10,30)>5);
 const t=coastTexture();assert.equal(t.image.width,128);assert.equal(t.image.data.length,128*128*4);t.dispose();
 for(const p of CLIFF_PLACEMENTS)for(let x=-p.radius;x<=p.radius;x+=.15)for(let z=-p.radius;z<=p.radius;z+=.15)if(Math.hypot(x,z)<=p.radius)assert.equal(landAt((p.x+x)*40,(p.z+z)*40),false,'raised cliffs stay outside playable land');
 for(const p of [HOME,SHRINE,BOSS])assert.ok(walkable(p.x,p.y));assert.equal(JSON.stringify(LAND),before);
});

test('optimized coastal models have bounded triangles and embedded PBR textures',async()=>{
 for(const [name,budget] of [['boulder_01_lod',6000],['coastal_cliff_02_lod',22000],['island_tree_01_lod',27000]]){
  const b=await fs.readFile(new URL('../public/assets/'+name+'.glb',import.meta.url)),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
  const n=j.meshes.reduce((sum,m)=>sum+m.primitives.reduce((s,p)=>s+j.accessors[p.indices].count/3,0),0);assert.ok(n<=budget);assert.ok(n>0);assert.ok(b.length<3200000);
  assert.ok(j.images.every(i=>i.bufferView!==undefined&&!i.uri));const m=j.materials[0];assert.ok(m.normalTexture&&m.occlusionTexture&&m.pbrMetallicRoughness.baseColorTexture);assert.equal(m.pbrMetallicRoughness.metallicFactor,0);
 }
});

import {coastalShelfGeometry,harbourPlantPositions,createHarbourPlanting} from '../public/scene/harbour-refurbish.js';
test('coastal shelf is bounded, submerged, outside all playable land, and finite',()=>{
 const g=coastalShelfGeometry(),p=g.attributes.position;assert.ok(p.count>0&&p.count<5000);
 for(let i=0;i<p.count;i++){assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));assert.ok(p.getY(i)<0);assert.equal(landAt(p.getX(i)*40,p.getZ(i)*40),false);}
 g.dispose();
});
test('harbour planting is deterministic, low, instanced and keeps spawn clear',()=>{
 assert.deepEqual(harbourPlantPositions(),harbourPlantPositions());const scene=new THREE.Scene(),plants=createHarbourPlanting(scene);
 assert.ok(plants.isInstancedMesh&&plants.count<=600);plants.geometry.computeBoundingBox();assert.ok(plants.geometry.boundingBox.max.y<.4);
 for(const p of harbourPlantPositions()){assert.ok(landAt(p.x*40,p.z*40));assert.ok(Math.hypot(p.x*40-HOME.x,p.z*40-HOME.y)>=120);}
 plants.geometry.dispose();plants.material.dispose();
});

test('scenery broad phase skips distant meshes and refreshes after camera movement',()=>{
 const visibility=createSceneryVisibility(),mesh=prop().scene;mesh.position.set(30,1,2);mesh.updateMatrixWorld(true);let calls=0;const original=mesh.raycast.bind(mesh);mesh.raycast=(...args)=>{calls++;return original(...args);};visibility.add(mesh);
 const camera=new THREE.PerspectiveCamera();camera.position.set(0,1,5);const hero=new THREE.Vector3(0,1,0);
 visibility.update(camera,hero,.016,true);assert.equal(calls,0);
 camera.position.x=30;hero.x=30;visibility.update(camera,hero,.016,true);assert.ok(calls>0);const previous=calls;
 visibility.update(camera,hero,.016,true);assert.equal(calls,previous);
 visibility.update(camera,hero,.016,false);assert.ok(mesh.material.opacity>.16);
});

import {HARBOUR_ROCKS} from '../public/scene/harbour-refurbish.js';
test('harbour rock clusters keep conservative bounds outside traversal',()=>{
 for(const p of HARBOUR_ROCKS)for(let x=-p.radius;x<=p.radius;x+=.1)for(let z=-p.radius;z<=p.radius;z+=.1)if(Math.hypot(x,z)<=p.radius)assert.equal(landAt((p.x+x)*40,(p.z+z)*40),false,JSON.stringify(p));
});

test('quality-specific assets survive a late high load and reuse cached variants',async()=>{
 const scene=new THREE.Scene(),canvas={dataset:{}},fallback=new THREE.Group();scene.add(fallback);let resolveHigh,calls=[];
 const assets=createHarbourAssets(scene,canvas,async id=>{calls.push(id);if(id==='high')await new Promise(r=>resolveHigh=r);return prop();});
 const high=assets.add({high:'high',medium:'medium'},fallback,{x:0,z:0,height:2});await Promise.resolve();
 await assets.setQuality('medium');resolveHigh();await high;
 assert.equal(scene.children.filter(n=>n.visible).length,1);assert.equal(fallback.visible,false);
 await assets.setQuality('low');assert.equal(fallback.visible,true);assert.equal(scene.children.filter(n=>n.visible).length,1);
 await assets.setQuality('high');await assets.setQuality('medium');assert.deepEqual(calls,['high','medium']);
});
