import * as THREE from '../vendor/three.module.js';
import {LAND,landAt} from '../world.js';

// Visual bathymetry only. Neither this texture nor scenery is collision input.
export function coastDistance(x,z) {
 let best=Infinity;const p=LAND[0];
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],dx=(b[0]-a[0])/40,dz=(b[1]-a[1])/40,px=x-a[0]/40,pz=z-a[1]/40,t=Math.max(0,Math.min(1,(px*dx+pz*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(px-t*dx,pz-t*dz));}
 return best;
}
export function coastTexture() {
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const wx=x/(size-1)*32,wz=24+y/(size-1)*24,i=(y*size+x)*4;data[i]=Math.round(Math.min(1,coastDistance(wx,wz)/5)*255);data[i+1]=landAt(wx*40,wz*40)?255:0;data[i+3]=255;}
 const t=new THREE.DataTexture(data,size,size);t.minFilter=t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;
}
export const coastGLSL=`uniform sampler2D coastMap;
 float shoreDistance(vec2 p){vec2 uv=(p-vec2(0.,24.))/vec2(32.,24.);if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))return 5.;return texture2D(coastMap,uv).r*5.;}`;

// Raised scenery is wholly outside land; it introduces no new walkable elevation.
export const CLIFF_PLACEMENTS=Object.freeze([
 {x:2.1,z:31.1,radius:3,height:2,y:-.85,angle:1.0},
 {x:1.7,z:38,radius:3.6,height:2,y:-.85,angle:1.4},
 {x:3,z:70,radius:3.8,height:2,y:-.9,angle:.1},
 {x:25,z:68,radius:3.5,height:2,y:-.9,angle:-.25},
]);

// Material clones isolate fading: shared source GLBs/textures remain unchanged.
export function createSceneryVisibility() {
 const entries=[],ray=new THREE.Raycaster(),direction=new THREE.Vector3(),hit=new THREE.Vector3(),lastCamera=new THREE.Vector3(Infinity,0,0),lastHero=new THREE.Vector3(Infinity,0,0);let elapsed=0,lastEnabled=null;
 return {
  add(root){if(entries.some(e=>e.root===root))return;const materials=new Map(),meshes=[];root.traverse(n=>{if(!n.isMesh)return;const clone=m=>{if(!materials.has(m))materials.set(m,{material:m.clone(),opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite});return materials.get(m).material;};n.material=Array.isArray(n.material)?n.material.map(clone):clone(n.material);meshes.push({mesh:n,shadow:n.castShadow});});root.updateMatrixWorld(true);entries.push({root,bounds:new THREE.Box3().setFromObject(root).expandByScalar(.08),materials:[...materials.values()],meshes,opacity:1,blocked:false,wasVisible:false});},
  update(camera,hero,dt,enabled){
   elapsed+=Math.min(dt,.1);const refresh=elapsed>=.1||lastEnabled!==enabled||lastCamera.distanceToSquared(camera.position)>.000225||lastHero.distanceToSquared(hero)>.000225;
   if(refresh){elapsed=0;lastCamera.copy(camera.position);lastHero.copy(hero);lastEnabled=enabled;}
   direction.copy(hero).sub(camera.position);ray.set(camera.position,direction.normalize());ray.far=Math.max(0,camera.position.distanceTo(hero)-.3);
   let count=0;
   for(const e of entries){if(!e.root.visible){e.wasVisible=false;continue;}
    // Broad phase avoids triangle raycasts through every scanned prop each frame.
    if(refresh||!e.wasVisible){const near=ray.ray.intersectBox(e.bounds,hit);e.blocked=!!(enabled&&near&&(e.bounds.containsPoint(camera.position)||camera.position.distanceTo(hit)<=ray.far)&&ray.intersectObject(e.root,true).length);}
    e.wasVisible=true;const blocked=e.blocked;const target=blocked?.16:1;if(blocked)count++;
    if(e.opacity===target)continue;
    e.opacity+=(target-e.opacity)*(1-Math.exp(-Math.min(dt,.1)*18));if(Math.abs(target-e.opacity)<.003)e.opacity=target;
    for(const m of e.materials){m.material.opacity=m.opacity*e.opacity;m.material.transparent=e.opacity<.995||m.transparent;m.material.depthWrite=e.opacity>.95&&m.depthWrite;}
    for(const n of e.meshes)n.mesh.castShadow=n.shadow&&e.opacity>.95;
   }return count;
  }
 };
}
