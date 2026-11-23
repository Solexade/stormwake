import * as THREE from '../vendor/three.module.js';
import {firearmFor} from '../arsenal.js';
import {weaponMotion} from '../combat-presentation.js';

const TIPS={axe:.61,sword:1.15,spear:1.64};
const SAMPLES=7,LIFETIME=.115,S=1/40;

export function createHeldEffects(scene){
 const samples=[],position=new THREE.Float32BufferAttribute(new Float32Array(SAMPLES*6),3);
 position.setUsage(THREE.DynamicDrawUsage);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',position);
 const indices=[];
 for(let i=0;i<SAMPLES-1;i++){
  const j=i*2;
  indices.push(j,j+1,j+2,j+1,j+3,j+2);
 }
 geometry.setIndex(indices);
 const material=new THREE.MeshBasicMaterial({
  color:'#ffdda0',transparent:true,side:THREE.DoubleSide,depthWrite:false,opacity:0
 });
 const ribbon=new THREE.Mesh(geometry,material);
 ribbon.frustumCulled=false;
 ribbon.visible=false;
 scene.add(ribbon);
 let lastAction,shotId,muzzle;

 function update(actor,state,time,enabled){
  if(lastAction!==state?.actionId||!enabled){
   lastAction=state?.actionId;
   samples.length=0;
  }
  while(samples.length&&time-samples[0].time>LIFETIME)samples.shift();
  const tip=TIPS[state?.weapon];
  if(enabled&&tip&&state.hp>0&&weaponMotion(state,actor.poseTime)?.contact){
   const outer=actor.weapon.localToWorld(new THREE.Vector3(state.weapon==='axe'?.28:0,tip,0));
   const last=samples.at(-1);
   if(last&&last.outer.distanceToSquared(outer)>5)samples.length=0;
   if(!last||last.outer.distanceToSquared(outer)>.008){
    if(samples.length===SAMPLES)samples.shift();
    const inner=actor.weapon.localToWorld(new THREE.Vector3(0,tip*.55,0));
    samples.push({outer,inner,time});
   }
  }
  ribbon.visible=samples.length>1;
  if(!ribbon.visible)return;
  for(let i=0;i<samples.length;i++){
   const {outer,inner}=samples[i];
   // Taper the oldest section rather than drawing a solid full-width swipe.
   const taper=.37+.63*i/(samples.length-1);
   position.setXYZ(i*2,outer.x,outer.y,outer.z);
   position.setXYZ(i*2+1,outer.x+(inner.x-outer.x)*taper,outer.y+(inner.y-outer.y)*taper,outer.z+(inner.z-outer.z)*taper);
  }
  position.needsUpdate=true;
  geometry.setDrawRange(0,(samples.length-1)*6);
  material.opacity=.46*Math.max(0,1-(time-samples.at(-1).time)/LIFETIME);
 }

 function pulseOrigin(actor,state,effect,runId){
  const id=runId+':'+(effect.actionId??effect.x+':'+effect.y);
  if(shotId!==id){
   shotId=id;
   muzzle=firearmFor(state.weapon)&&state.actionId===effect.actionId
    ?actor.gun.userData.muzzle.getWorldPosition(new THREE.Vector3())
    :new THREE.Vector3(effect.x*S,1.35,effect.y*S);
  }
  return muzzle.clone();
 }
 return {update,pulseOrigin};
}
