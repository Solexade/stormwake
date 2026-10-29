import {weaponAttack} from './combat.js';
import {heroById,storedHero,inPlaceClip,heroMaterial,soloAnimationAliases} from './heroes.js';
import {combatPose,heroGait,strideTime,runningPlayback,travelYaw} from './combat-presentation.js';
const aColor=(type,color)=>type==='player'?color:new THREE.Color(type==='boss'?'#9f717e':type==='archer'?'#789e89':'#ba8980').multiply(color);
import * as THREE from './vendor/three.module.js';
import {loadGLB} from './scene/assets.js';
// Update cloned skin bind inverses before measuring: Box3 alone does not do this.
export function characterMount(model, actorScale = 1) {
 model.updateMatrixWorld(true);
 model.traverse(n=>{if(n.isSkinnedMesh){n.skeleton.update();n.computeBoundingBox();}});
 const bounds=new THREE.Box3().setFromObject(model,true),height=bounds.max.y-bounds.min.y;
 if(!Number.isFinite(height)||height<=0)throw Error('Invalid character bounds');
 const mount=new THREE.Group();mount.scale.setScalar(1.95/height*actorScale);
 mount.rotation.y=Math.PI;mount.add(model);model.position.y-=bounds.min.y;
 return mount;
}
export function dressWarrior(actor,canvas,requestedHero){
 const previous=actor.avatar,revision=actor.skinRevision=(actor.skinRevision||0)+1;let mounted=null;
 const attachments=[actor.cape,actor.weapon,actor.shield,actor.bow].filter(Boolean).map(object=>({object,parent:object.parent,position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone()}));
 const hero=heroById(requestedHero||storedHero()),detailed=actor.type==='player';
 loadGLB(detailed?hero.asset:'knight.glb').then(g=>{
  if(actor.skinRevision!==revision)return;
  // Validate before touching the visible fallback or moving its attachments.
  const sockets=detailed?['mixamorigSpine','mixamorigRightHand','mixamorigLeftHand']:['Torso','PalmR','PalmL'];
  for(const bone of sockets)if(!g.scene.getObjectByName(bone))throw Error('Missing character socket: '+bone);
  if(!detailed&&!g.animations.some(clip=>clip.name.split('|').pop()==='Idle'))throw Error('Missing fallback idle clip');
  const model=g.scene,mount=characterMount(model,actor.scale);mounted=mount;
  model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;n.frustumCulled=false;const convert=m=>detailed?heroMaterial(m,hero.id):new THREE.MeshStandardMaterial({color:aColor(actor.type,m.color),vertexColors:true,roughness:.72,metalness:.12});n.material=Array.isArray(n.material)?n.material.map(convert):convert(n.material);}});
  actor.root.add(mount);actor.root.updateMatrixWorld(true);
  const torso=model.getObjectByName(sockets[0]);if(torso)torso.attach(actor.cape);
  actor.rig.visible=false;
  const mixer=new THREE.AnimationMixer(model),actions={};
  for(const original of g.animations){const clip=detailed?inPlaceClip(original):original,name=clip.name.split('|').pop();actions[name]=mixer.clipAction(clip);const alternate=clip.clone();alternate.name+=':alternate';actions[name+':alternate']=mixer.clipAction(alternate);}
  if(detailed){
   const names=soloAnimationAliases(hero.id);
   for(const [alias,name] of Object.entries(names)){const real=actions[name]?name:names.Idle;actions[alias]=actions[real];actions[alias+':alternate']=actions[real+':alternate'];}
  }
  actor.avatar={heroId:detailed?hero.id:null,mount,model,mixer,actions,current:null,key:null,capeRotation:actor.cape.rotation.clone()};
  actor.avatar.bones={};
  for(const side of ['Right','Left'])for(const part of ['Arm','ForeArm','Hand'])
   actor.avatar.bones[side+part]=model.getObjectByName('mixamorig'+side+part);
  const materials=new Set();
  model.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])if(m.emissive)materials.add(m);});
  actor.avatar.materials=[...materials];
  // The authored right palm drives the existing selectable weapons.
  const palm=model.getObjectByName(sockets[1]);
  if(palm){const grip=new THREE.Group();model.updateMatrixWorld(true);const inherited=palm.getWorldScale(new THREE.Vector3()).x;grip.scale.setScalar(actor.scale/inherited);palm.add(grip);grip.add(actor.weapon);if(actor.bow){grip.add(actor.bow);actor.bow.position.set(0,0,0);actor.bow.rotation.set(0,0,-Math.PI/2);}actor.weapon.position.set(0,0,0);actor.weapon.rotation.set(0,0,Math.PI/2);}
  actor.avatar.weaponGrip=actor.weapon.parent;
  const left=model.getObjectByName(sockets[2]);if(left){model.updateMatrixWorld(true);const grip=new THREE.Group();grip.scale.setScalar(actor.scale/left.getWorldScale(new THREE.Vector3()).x);left.add(grip);grip.add(actor.shield);actor.shield.position.set(0,0,0);actor.shield.rotation.set(0,Math.PI/2,0);}
  previous?.mount.removeFromParent();canvas.dataset.characters='rigged';if(detailed)canvas.dataset.hero=hero.id;
 }).catch(error=>{
  mounted?.removeFromParent();if(actor.skinRevision!==revision)return;actor.avatar=previous||null;actor.rig.visible=!previous;
  for(const a of attachments){a.parent.add(a.object);a.object.position.copy(a.position);a.object.quaternion.copy(a.quaternion);a.object.scale.copy(a.scale);}
  canvas.dataset.characters='fallback';console.warn('Character fallback:',error.message);
 });
}
export function animateAvatar(a,s,dt){
 const v=a.avatar;if(!v)return;
 let pose=combatPose(s);
 if(v.heroId&&s.weapon==='spear'&&['light1','light2','heavy','finisher','riposte'].includes(s.action))pose={name:'Idle_swordRight',state:'spear-thrust',key:s.actionId};
 if(v.heroId&&heroById(v.heroId).asset==='hooded_blade.glb'&&s.weapon==='sword'&&['light1','light2','heavy','finisher','riposte'].includes(s.action))pose={name:'Idle_swordRight',state:'sword-cut',key:s.actionId};
 if(pose.moving&&v.heroId)pose=heroGait(s,v.gait);
 const key=[pose.state||pose.name,pose.key??''].join(':');
 if(v.key!==key){
  const old=v.current;let action=v.actions[pose.name]||v.actions[pose.fallback]||v.actions.Idle;
  if(action===old)action=v.actions[pose.name+':alternate']||action;
  const phase=pose.moving&&v.wasMoving&&old?strideTime(old.time,old.getClip().duration,action.getClip().duration):0;
  action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
  if(pose.moving)action.time=phase;
  action.setLoop(pose.once?THREE.LoopOnce:THREE.LoopRepeat,pose.once?1:Infinity);action.clampWhenFinished=true;
  if(old&&old!==action)old.crossFadeTo(action,pose.once?.065:.14,false);
  v.current=action;v.key=key;
 }
 v.wasMoving=!!pose.moving;v.gait=pose.moving?pose.name:null;
 const action=v.current;
 action.timeScale=pose.hold!==undefined?0:pose.duration?action.getClip().duration/pose.duration:pose.moving?pose.rate??Math.max(.65,Math.min(1.65,Math.hypot(s.vx||0,s.vy||0)/(s.sprinting?440:310))):1;
 if(v.heroId&&pose.moving&&pose.name==='Run')action.timeScale=runningPlayback(Math.hypot(s.vx||0,s.vy||0),action.getClip().duration,s.sprinting);
 if(pose.hold!==undefined)action.time=action.getClip().duration*pose.hold;
 v.mixer.update(Math.min(dt,.1));
 // Locomotion faces travel, not a stale cursor/target bearing. Only the mesh
 // mount turns; authoritative heading and attack direction remain unchanged.
 if(v.heroId){
  const yaw=pose.moving?travelYaw(s.vx||0,s.vy||0,a.root.rotation.y):0;
  const current=v.mount.rotation.y-Math.PI;
  const delta=Math.atan2(Math.sin(yaw-current),Math.cos(yaw-current));
  v.mount.rotation.y=Math.PI+current+delta*(1-Math.exp(-Math.min(dt,.1)*24));
 }
 // Weapon-specific presentation; simulation remains the only hit authority.
 const armedPose=v.heroId&&s.hp>0&&s.action!=='roll';
 const firing=['light1','light2','heavy','finisher'].includes(s.action);
 const visualTime=a.poseTime??s.actionTime??0;
 const shotAge=visualTime-.08;
 const recoil=firing&&shotAge>=0?Math.max(0,1-shotAge/.14):0;
 if(s.weapon==='gun'&&armedPose){
  if(a.weapon.parent!==a.root)a.root.add(a.weapon);
  a.weapon.position.set(.22,1.45,-.22+recoil*.045);
  const aimYaw=-s.angle-Math.PI/2-a.root.rotation.y;
  a.weapon.rotation.set(recoil*.045,aimYaw,0);
  aimArm(v,'Right',a.weapon.localToWorld(new THREE.Vector3(0,-.09,.015)),a.root,1);
  aimArm(v,'Left',a.weapon.localToWorld(new THREE.Vector3(0,-.03,-.38)),a.root,-1);
  a.shield.visible=false;
 }else{
  if(a.weapon.parent!==v.weaponGrip)v.weaponGrip.add(a.weapon);
  a.weapon.position.set(0,0,0);a.weapon.rotation.set(0,0,Math.PI/2);
  a.shield.visible=s.weapon!=='spear';
  if(s.weapon==='sword'&&armedPose&&firing&&heroById(v.heroId).asset==='hooded_blade.glb'){
   const phase=Math.min(1,visualTime/(s.actionDuration||1));
   const cut=Math.sin(Math.PI*phase);
   const reverse=s.action==='light2'?-1:1;
   const heavy=s.action==='heavy'||s.action==='finisher';
   aimArm(v,'Right',a.root.localToWorld(new THREE.Vector3(reverse*(.38-.76*phase),heavy?1.72-.62*cut:1.28+.12*Math.cos(phase*Math.PI),-.22-.45*cut)),a.root,1);
  }
  if(s.weapon==='spear'&&armedPose){
   const phase=s.actionDuration?Math.min(1,visualTime/s.actionDuration):0;
   const attack=weaponAttack(s,s.action);
   const hit=attack?.hit||.2,duration=s.actionDuration||.6;
   const raw=visualTime<hit?visualTime/hit:1-(visualTime-hit)/Math.max(.05,duration-hit);
   const t=Math.max(0,Math.min(1,raw));
   const thrust=firing?t*t*(3-2*t):0;
   const right=a.root.localToWorld(new THREE.Vector3(.23,1.12,-.12-thrust*.48));
   aimArm(v,'Right',right,a.root,1);
   // Aim the shaft forward from its hand socket, with a slight upward tip.
   a.weapon.updateWorldMatrix(true,false);
   const forward=a.root.getWorldQuaternion(new THREE.Quaternion());
   const shaft=forward.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2+.10));
   a.weapon.quaternion.copy(a.weapon.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(shaft));
   aimArm(v,'Left',a.weapon.localToWorld(new THREE.Vector3(0,.42,0)),a.root,-1);
  }
 }
 a.weapon.visible=!(s.weapon==='gun'&&!armedPose);
 if(a.gun?.userData.flash)a.gun.userData.flash.visible=s.weapon==='gun'&&armedPose&&firing&&shotAge>=0&&shotAge<.055;
 a.cape.rotation.copy(v.capeRotation);a.cape.rotation.x+=Math.sin(v.mixer.time*3)*.025;
 // Local pose accents leave the actor's world position and controls untouched.
 const accent=s.action==='light2'?.18:s.stagger>0?-.12:0;
 v.mount.rotation.z+=(accent-v.mount.rotation.z)*(1-Math.exp(-dt*20));
 if(v.heroId){const phase=s.actionDuration?Math.min(1,visualTime/s.actionDuration):0;v.mount.rotation.x=s.action==='roll'&&heroById(v.heroId).asset!=='azure_champion.glb'?-Math.PI*2*phase:0;if(s.hp<=0&&v.heroId==='hood')v.mount.rotation.z=1.35;}
 const flashing=s.flash>0;
 if(v.flashing!==flashing){for(const m of v.materials){m.emissive.set(flashing?'#c47132':'#000000');m.emissiveIntensity=flashing?.65:0;}v.flashing=flashing;}
}


// Two-bone grip solver in world space. It respects each imported rig's limb
// lengths and joint axes instead of applying guessed Euler rotations.
export function aimJoint(bone,child,target){
 if(!bone||!child)return;
 bone.updateWorldMatrix(true,true);
 const origin=bone.getWorldPosition(new THREE.Vector3());
 const from=child.getWorldPosition(new THREE.Vector3()).sub(origin).normalize();
 const to=target.clone().sub(origin).normalize();
 if(to.lengthSq()<.001)return;
 const desired=new THREE.Quaternion().setFromUnitVectors(from,to).multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
 bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired));
 bone.updateWorldMatrix(false,true);
}
function aimArm(v,side,target,root,sign){
 const upper=v.bones[side+'Arm'];
 const fore=v.bones[side+'ForeArm'];
 const hand=v.bones[side+'Hand'];
 if(!upper||!fore||!hand)return;
 v.model.updateWorldMatrix(true,true);
 const shoulder=upper.getWorldPosition(new THREE.Vector3());
 const elbow=fore.getWorldPosition(new THREE.Vector3());
 const palm=hand.getWorldPosition(new THREE.Vector3());
 const l1=shoulder.distanceTo(elbow),l2=elbow.distanceTo(palm);
 const direction=target.clone().sub(shoulder);
 const distance=Math.max(Math.abs(l1-l2)+.001,Math.min(l1+l2-.001,direction.length()));
 direction.normalize();
 const pole=new THREE.Vector3(sign*.5,-1,.15).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()));
 pole.addScaledVector(direction,-pole.dot(direction)).normalize();
 const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
 const bend=Math.sqrt(Math.max(0,l1*l1-along*along));
 const goal=shoulder.clone().addScaledVector(direction,along).addScaledVector(pole,bend);
 aimJoint(upper,fore,goal);
 aimJoint(fore,hand,shoulder.clone().addScaledVector(direction,distance));
}
