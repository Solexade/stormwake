import {combatPose} from './combat-presentation.js';
const aColor=(type,color)=>type==='player'?color:new THREE.Color(type==='boss'?'#9f717e':type==='archer'?'#789e89':'#ba8980').multiply(color);
import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {clone} from './vendor/SkeletonUtils.js';
let asset;
const ready=new GLTFLoader().loadAsync('/assets/knight.glb').then(g=>{asset=g;return g;});
export function dressWarrior(actor,canvas){
 ready.then(g=>{
  const model=clone(g.scene),bounds=new THREE.Box3().setFromObject(g.scene),size=bounds.getSize(new THREE.Vector3()),scale=1.95/size.y;
  const mount=new THREE.Group();mount.scale.setScalar(scale*actor.scale);mount.rotation.y=Math.PI;mount.add(model);model.position.y-=bounds.min.y;
  model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;n.frustumCulled=false;const convert=m=>new THREE.MeshStandardMaterial({color:aColor(actor.type,m.color),vertexColors:true,roughness:actor.type==='player'?.43:.61,metalness:.48});n.material=Array.isArray(n.material)?n.material.map(convert):convert(n.material);}});
  actor.root.add(mount);actor.root.updateMatrixWorld(true);
  const torso=model.getObjectByName('Torso');if(torso)torso.attach(actor.cape);
  actor.rig.visible=false;
  const mixer=new THREE.AnimationMixer(model),actions={};
  for(const clip of g.animations){const name=clip.name.split('|').pop();actions[name]=mixer.clipAction(clip);const alternate=clip.clone();alternate.name+=':alternate';actions[name+':alternate']=mixer.clipAction(alternate);}
  actor.avatar={mount,model,mixer,actions,current:null,key:null,capeRotation:actor.cape.rotation.clone()};
  // The authored right palm drives the existing selectable weapons.
  const palm=model.getObjectByName('PalmR');
  if(palm){const grip=new THREE.Group();model.updateMatrixWorld(true);const inherited=palm.getWorldScale(new THREE.Vector3()).x;grip.scale.setScalar(actor.scale/inherited);palm.add(grip);grip.add(actor.weapon);if(actor.bow){grip.add(actor.bow);actor.bow.position.set(0,0,0);actor.bow.rotation.set(0,0,-Math.PI/2);}actor.weapon.position.set(0,0,0);actor.weapon.rotation.set(0,0,Math.PI/2);}
  const left=model.getObjectByName('PalmL');if(left){model.updateMatrixWorld(true);const grip=new THREE.Group();grip.scale.setScalar(actor.scale/left.getWorldScale(new THREE.Vector3()).x);left.add(grip);grip.add(actor.shield);actor.shield.position.set(0,0,0);actor.shield.rotation.set(0,Math.PI/2,0);}
  canvas.dataset.characters='rigged';
 }).catch(()=>{canvas.dataset.characters='fallback';});
}
export function animateAvatar(a,s,dt){
 const v=a.avatar;if(!v)return;
 const pose=combatPose(s),key=[pose.state||pose.name,pose.key??''].join(':');
 if(v.key!==key){
  const old=v.current;let action=v.actions[pose.name]||v.actions.Idle;
  if(action===old)action=v.actions[pose.name+':alternate']||action;
  action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
  action.setLoop(pose.once?THREE.LoopOnce:THREE.LoopRepeat,pose.once?1:Infinity);action.clampWhenFinished=true;
  if(old&&old!==action)old.crossFadeTo(action,pose.once?.065:.14,false);
  v.current=action;v.key=key;
 }
 const action=v.current;
 action.timeScale=pose.hold!==undefined?0:pose.duration?action.getClip().duration/pose.duration:pose.moving?Math.max(.65,Math.min(1.65,Math.hypot(s.vx||0,s.vy||0)/(s.sprinting?440:310))):1;
 if(pose.hold!==undefined)action.time=action.getClip().duration*pose.hold;
 v.mixer.update(Math.min(dt,.1));
 a.cape.rotation.copy(v.capeRotation);a.cape.rotation.x+=Math.sin(v.mixer.time*3)*.025;
 // Local pose accents leave the actor's world position and controls untouched.
 const accent=s.action==='light2'?.18:s.stagger>0?-.12:0;
 v.mount.rotation.z+=(accent-v.mount.rotation.z)*(1-Math.exp(-dt*20));
 v.model.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material]){m.emissive.set(s.flash>0?'#c47132':'#000000');m.emissiveIntensity=s.flash>0?.65:0;}});
}
