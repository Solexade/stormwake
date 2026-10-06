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
  model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;n.frustumCulled=false;const convert=m=>new THREE.MeshStandardMaterial({color:aColor(actor.type,m.color),vertexColors:true,roughness:.65,metalness:.25});n.material=Array.isArray(n.material)?n.material.map(convert):convert(n.material);}});
  actor.root.add(mount);actor.rig.visible=false;
  const mixer=new THREE.AnimationMixer(model),actions={};
  for(const clip of g.animations)actions[clip.name.split('|').pop()]=mixer.clipAction(clip);
  actor.avatar={mount,model,mixer,actions,current:null,key:null};
  // The authored right palm drives the existing selectable weapons.
  const palm=model.getObjectByName('PalmR');
  if(palm){const grip=new THREE.Group();model.updateMatrixWorld(true);const inherited=palm.getWorldScale(new THREE.Vector3()).x;grip.scale.setScalar(actor.scale/inherited);palm.add(grip);grip.add(actor.weapon);actor.weapon.position.set(0,0,0);actor.weapon.rotation.set(0,0,Math.PI/2);}
  const left=model.getObjectByName('PalmL');if(left){model.updateMatrixWorld(true);const grip=new THREE.Group();grip.scale.setScalar(actor.scale/left.getWorldScale(new THREE.Vector3()).x);left.add(grip);grip.add(actor.shield);actor.shield.position.set(0,0,0);actor.shield.rotation.set(0,Math.PI/2,0);}
  canvas.dataset.characters='rigged';
 }).catch(()=>{canvas.dataset.characters='fallback';});
}
export function animateAvatar(a,s,dt){
 const v=a.avatar;if(!v)return;
 const moving=Math.hypot(s.vx||0,s.vy||0)>8;
 const attacking=['light1','light2','heavy','finisher'].includes(s.action)||s.swing>0;
 const name=s.hp<=0?'Death':s.action==='roll'?'Roll':attacking?'swordAttackJump':moving?(s.sprinting?'Run':'Walking'):'Idle';
 const action=v.actions[name]||v.actions.Idle,key=attacking?name+':'+s.actionId:name;
 if(v.key!==key){const old=v.current;action.reset().setEffectiveWeight(1).play();action.setLoop(['Death','Roll','swordAttackJump'].includes(name)?THREE.LoopOnce:THREE.LoopRepeat,Infinity);action.clampWhenFinished=true;if(old&&old!==action)old.crossFadeTo(action,.10,false);v.current=action;v.key=key;}
 action.timeScale=attacking&&s.actionDuration?action.getClip().duration/s.actionDuration:name==='Roll'&&s.actionDuration?action.getClip().duration/s.actionDuration:moving?Math.max(.65,Math.min(1.65,Math.hypot(s.vx||0,s.vy||0)/(s.sprinting?440:310))):1;
 v.mixer.update(Math.min(dt,.1));
}
