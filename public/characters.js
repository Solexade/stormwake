import {firearmFor} from './arsenal.js';
import {soloHeroById,storedSoloHero,inPlaceClip,heroMaterial,soloAnimationAliases} from './heroes.js';
import {combatPose,heroGait,strideTime,runningPlayback,travelYaw,weaponMotion,meleeGrip,strikeMotion,enemyWindTime,enemySwingTime} from './combat-presentation.js';
import * as THREE from './vendor/three.module.js';
import {loadGLB} from './scene/assets.js';
const UP=new THREE.Vector3(0,1,0),RIGHT=new THREE.Vector3(1,0,0),FORWARD=new THREE.Vector3(0,0,-1);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const ENEMY_RIGS={
 raider:{asset:'silver_pathfinder.glb',id:'pathfinder',tint:'#86999b'},
 archer:{asset:'hooded_blade.glb',id:'ash',tint:'#a9a88b'},
 brute:{asset:'iron_sentinel.glb',id:'sentinel',tint:'#a18878'},
 boss:{asset:'iron_sentinel.glb',id:'sentinel',tint:'#9b8caf'},
 scout:{asset:'iron_sentinel.glb',id:'sentinel',tint:'#78cbb7'},
 bulwark:{asset:'azure_champion.glb',id:'azure',tint:'#dd9d66'}
};
const rigData=new WeakMap();
// Update cloned skin bind inverses before measuring: Box3 alone does not do this.
function characterBounds(model) {
 model.updateMatrixWorld(true);
 model.traverse(n=>{if(n.isSkinnedMesh){n.skeleton.update();n.computeBoundingBox();}});
 return new THREE.Box3().setFromObject(model,true);
}
export function characterMount(model, actorScale = 1, bounds=characterBounds(model)) {
 const height=bounds.max.y-bounds.min.y;
 if(!Number.isFinite(height)||height<=0)throw Error('Invalid character bounds');
 const mount=new THREE.Group();mount.scale.setScalar(1.95/height*actorScale);
 mount.rotation.y=Math.PI;mount.add(model);model.position.y-=bounds.min.y;
 return mount;
}
export function dressWarrior(actor,canvas,requestedHero){
 const previous=actor.avatar,revision=actor.skinRevision=(actor.skinRevision||0)+1;let mounted=null;
 const attachments=[actor.cape,actor.weapon,actor.shield,actor.bow].filter(Boolean).map(object=>({object,parent:object.parent,position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone()}));
 const hero=soloHeroById(requestedHero||storedSoloHero()),detailed=actor.type==='player';
 const enemy=ENEMY_RIGS[actor.variant]||ENEMY_RIGS[actor.type];
 loadGLB(detailed?hero.asset:enemy.asset).then(g=>{
  if(actor.skinRevision!==revision)return;
  // Validate before touching the visible fallback or moving its attachments.
  const sockets=['mixamorigSpine','mixamorigRightHand','mixamorigLeftHand'];
  for(const bone of sockets)if(!g.scene.getObjectByName(bone))throw Error('Missing character socket: '+bone);
  const model=g.scene;
  let data=rigData.get(g.animations);
  if(!data){
   const clips=g.animations.map(original=>{
    const clip=inPlaceClip(original),name=clip.name.split('|').pop();
    const alternate=new THREE.AnimationClip(clip.name+':alternate',clip.duration,clip.tracks,clip.blendMode);
    return {name,clip,alternate};
   });
   data={clips,bounds:characterBounds(model)};
   rigData.set(g.animations,data);
  }
  const mount=characterMount(model,actor.scale,data.bounds);mounted=mount;
  model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;n.frustumCulled=false;const convert=m=>{
   if(detailed)return heroMaterial(m,hero.id);
   const surface=m.clone();surface.color.multiply(new THREE.Color(enemy.tint));
   surface.roughness=.74;surface.metalness=.28;return surface;
  };n.material=Array.isArray(n.material)?n.material.map(convert):convert(n.material);}});
  actor.root.add(mount);actor.root.updateMatrixWorld(true);
  const torso=model.getObjectByName(sockets[0]);if(torso)torso.attach(actor.cape);
  actor.rig.visible=false;
  const mixer=new THREE.AnimationMixer(model),actions={};
  for(const {name,clip,alternate} of data.clips){
   actions[name]=mixer.clipAction(clip);
   actions[name+':alternate']=mixer.clipAction(alternate);
  }
  {
   const names=soloAnimationAliases(detailed?hero.id:enemy.id);
   for(const [alias,name] of Object.entries(names)){const real=actions[name]?name:alias==='Jog'||alias==='Run'?'walk_loop':names.Idle;actions[alias]=actions[real];actions[alias+':alternate']=actions[real+':alternate'];}
  }
  actor.avatar={heroId:detailed?hero.id:null,enemy:!detailed,mount,model,mixer,actions,current:null,key:null,capeRotation:actor.cape.rotation.clone()};
  actor.avatar.bones={};
  for(const side of ['Right','Left'])for(const part of ['Arm','ForeArm','Hand'])
   actor.avatar.bones[side+part]=model.getObjectByName('mixamorig'+side+part);
  actor.avatar.chest=model.getObjectByName('mixamorigSpine1');
  actor.avatar.hips=model.getObjectByName('mixamorigHips');
  actor.avatar.feet=['Left','Right'].map(side=>{
   const upper=model.getObjectByName('mixamorig'+side+'UpLeg');
   const lower=model.getObjectByName('mixamorig'+side+'Leg');
   const end=model.getObjectByName('mixamorig'+side+'Foot');
   if(!upper||!lower||!end)return null;
   return {upper,lower,end,floor:actor.root.worldToLocal(end.getWorldPosition(new THREE.Vector3())).y};
  });
  const materials=new Set();
  model.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])if(m.emissive)materials.add(m);});
  actor.avatar.materials=[...materials];
  // The authored right palm drives the existing selectable weapons.
  const palm=model.getObjectByName(sockets[1]);
  if(palm){const grip=new THREE.Group();model.updateMatrixWorld(true);const inherited=palm.getWorldScale(new THREE.Vector3()).x;grip.scale.setScalar(actor.scale/inherited);palm.add(grip);grip.add(actor.weapon);if(actor.bow){grip.add(actor.bow);actor.bow.position.set(0,0,0);}actor.weapon.position.set(0,0,0);actor.weapon.rotation.set(0,0,Math.PI/2);}
  const left=model.getObjectByName(sockets[2]);if(left){model.updateMatrixWorld(true);const grip=new THREE.Group();grip.scale.setScalar(actor.scale/left.getWorldScale(new THREE.Vector3()).x);left.add(grip);grip.add(actor.shield);actor.shield.position.set(0,0,0);actor.shield.rotation.set(0,Math.PI/2,0);}
  previous?.mount.removeFromParent();if(detailed){canvas.dataset.characters='rigged';canvas.dataset.hero=hero.id;}else canvas.dataset.enemyModels='rigged';
 }).catch(error=>{
  mounted?.removeFromParent();if(actor.skinRevision!==revision)return;actor.avatar=previous||null;actor.rig.visible=!previous;
  for(const a of attachments){a.parent.add(a.object);a.object.position.copy(a.position);a.object.quaternion.copy(a.quaternion);a.object.scale.copy(a.scale);}
  if(detailed)canvas.dataset.characters='fallback';else canvas.dataset.enemyModels='fallback';console.warn('Character fallback:',error.message);
 });
}
export function animateAvatar(a,s,dt){
 const v=a.avatar;if(!v)return;
 const visual=s.armedAnticipation?{...s,...s.armedAnticipation}:s;
 const visualTime=s.armedAnticipation?visual.actionTime:a.poseTime??s.actionTime??0;
 const motion=v.heroId?weaponMotion(visual,visualTime):enemyMotion(s);
 const weapon=v.enemy?a.loadout:(s.weapon||'axe');
 const attack=visual.action||(a.type==='brute'||a.type==='boss'?'heavy':'light1');
 const grip=!firearmFor(weapon)&&weapon!=='bow'?meleeGrip(weapon,attack,motion):null;
 const armed=s.hp>0&&s.action!=='roll';
 let pose=combatPose(s);
 // Drive the upper body independently so the feet keep stepping through a moving strike.
 if(armed&&motion&&(v.heroId||v.enemy&&s.stagger<=0)){
  pose=Math.hypot(s.vx||0,s.vy||0)>10?{name:'Walking',moving:true}:{name:'Idle_swordRight'};
 }
 if(pose.moving&&v.heroId)pose=heroGait(s,v.gait);
 const key=[pose.state||pose.name,pose.key??''].join(':');
 if(v.key!==key){
  const old=v.current;let action=v.actions[pose.name]||v.actions[pose.fallback]||v.actions.Idle;
  if(action===old)action=v.actions[pose.name+':alternate']||action;
  const phase=pose.moving&&v.wasMoving&&old?strideTime(old.time,old.getClip().duration,action.getClip().duration):0;
  action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
  if(pose.moving)action.time=phase;
  else if(v.heroId&&pose.once&&pose.duration)action.time=Math.min(1,visualTime/pose.duration)*action.getClip().duration;
  action.setLoop(pose.once?THREE.LoopOnce:THREE.LoopRepeat,pose.once?1:Infinity);action.clampWhenFinished=true;
  if(old&&old!==action)old.crossFadeTo(action,pose.once?.065:.14,false);
  v.current=action;v.key=key;
 }
 v.wasMoving=!!pose.moving;v.gait=pose.moving?pose.name:null;
 const action=v.current;
 const enemyStride=v.enemy?Math.min(1.75,Math.max(.18,a.speed/(a.scale*2.6))):1;
 action.timeScale=pose.hold!==undefined?0:pose.duration?action.getClip().duration/pose.duration:pose.moving?pose.rate??enemyStride:1;
 if(v.heroId&&pose.moving&&pose.name==='Run')action.timeScale=runningPlayback(Math.hypot(s.vx||0,s.vy||0),action.getClip().duration,s.sprinting);
 if(pose.hold!==undefined)action.time=action.getClip().duration*pose.hold;
 if(v.chestBase)v.chest.quaternion.copy(v.chestBase);
 if(v.hipBase){v.hips.position.copy(v.hipBase);v.hipBase=null;}
 for(const foot of v.feet)if(foot?.base){
  for(const [joint,base] of foot.base)joint.quaternion.copy(base);
  foot.base=null;
 }
 v.mixer.update(Math.min(dt,.1));
 // Locomotion faces travel, not a stale cursor/target bearing. Only the mesh
 // mount turns; authoritative heading and attack direction remain unchanged.
 if(v.heroId){
  const travel=pose.moving?travelYaw(s.vx||0,s.vy||0,a.root.rotation.y):0;
  const yaw=motion?clamp(travel*.32,-.5,.5):travel;
  const current=v.mount.rotation.y-Math.PI;
  const delta=Math.atan2(Math.sin(yaw-current),Math.cos(yaw-current));
  v.mount.rotation.y=Math.PI+current+delta*(1-Math.exp(-Math.min(dt,.1)*24));
 }
 const roll=s.action==='roll';
 const injured=s.stagger>0||s.visualHurt;
 const flinch=Math.min(1,(s.flash||0)/.16);
 const across=Number.isFinite(s.impactAngle)?flinch*Math.sin(s.impactAngle-s.angle):0;
 const weight=motion?motion.drive*(1-motion.recovery)-motion.wind*.44:0;
 const leanIn=grip?.lean??.15*weight;
 const standing=armed&&motion&&Math.hypot(s.vx||0,s.vy||0)<38;
 v.mount.rotation.x=roll&&v.heroId&&soloHeroById(v.heroId).asset!=='azure_champion.glb'
  ?-Math.PI*2*Math.min(1,visualTime/(s.actionDuration||1))
  :0;
 if(v.chest){
  (v.chestBase??=new THREE.Quaternion()).copy(v.chest.quaternion);
  const twist=grip?.twist??0;
  const bearing=v.heroId&&motion?v.mount.rotation.y-Math.PI:0;
  const strideLean=pose.moving?Math.min(.15,a.speed*.024):0;
  v.chest.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-leanIn*.68-strideLean+flinch*.24,-twist-bearing*.6+across*.30,injured?-.14+across*.20:-weight*.07,'YXZ')));
 }
 const fallbackDeath=s.hp<=0&&v.actions.Death.getClip().name.split(':')[0]===v.actions.Idle.getClip().name.split(':')[0];
 const lean=fallbackDeath?Math.min(1.38,(1.4-(s.death||0))*2):0;
 v.mount.rotation.z+=(lean-v.mount.rotation.z)*(1-Math.exp(-dt*20));
 if(standing)plantStrike(a,visual,grip,motion);
 else v.footPlant=null;
 a.cape.rotation.copy(v.capeRotation);a.cape.rotation.x+=Math.sin(v.mixer.time*3)*.025;
 a.weapon.visible=weapon!=='bow';
 a.shield.visible=v.enemy?a.type==='brute':!firearmFor(weapon)&&weapon!=='spear';
 a.gun.userData.flash.visible=false;
 if(armed&&!a.civilian)poseHeldWeapon(a,visual,weapon,motion,grip,visualTime);
 const flashing=s.flash>0;
 if(v.flashing!==flashing){for(const m of v.materials){m.emissive.set(flashing?'#c47132':'#000000');m.emissiveIntensity=flashing?.65:0;}v.flashing=flashing;}
}

function plantStrike(a,s,grip,motion){
 const {avatar:v,root,scale}=a;
 if(!v.hips||v.feet.some(foot=>!foot))return;
 const anchor=s.action==='light2'?1:0;
 const id=(s.actionId??'enemy')+':'+anchor;
 const planted=v.feet.map(foot=>foot.end.getWorldPosition(new THREE.Vector3()));
 if(v.footPlant?.id!==id)v.footPlant={id,position:planted[anchor].clone()};
 const support=v.footPlant.position;
 const drive=motion.stage===2?1:motion.stage===3?1-motion.recovery:motion.stage===1?motion.progress:0;
 const load=motion.wind;
 const rise=motion.stage===1?Math.sin(motion.progress*Math.PI)*.065:0;
 const forward=FORWARD.clone().applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()));
 const baseY=root.getWorldPosition(new THREE.Vector3()).y;
 const step=grip?.lean?drive*.22:drive*.10;
 // Transfer body weight over the step without changing the simulation root.
 const hip=v.hips;
 (v.hipBase??=new THREE.Vector3()).copy(hip.position);
 const body=hip.getWorldPosition(new THREE.Vector3()).addScaledVector(forward,(step*.44-load*.048)*scale);
 body.y-=(load*.045+drive*.068)*scale;
 hip.position.copy(hip.parent.worldToLocal(body));
 for(let index=0;index<v.feet.length;index++){
  const foot=v.feet[index];
  foot.base=[foot.upper,foot.lower,foot.end].map(joint=>[joint,joint.quaternion.clone()]);
  const target=planted[index];
  if(index===anchor&&target.distanceTo(support)<.48*scale){target.x=support.x;target.z=support.z;}
  if(index!==anchor)target.addScaledVector(forward,step*scale);
  target.y=baseY+foot.floor+(index===anchor?0:rise*scale);
  const ankleRotation=foot.end.getWorldQuaternion(new THREE.Quaternion());
  reachLimb(foot.upper,foot.lower,foot.end,target,forward);
  foot.end.quaternion.copy(foot.end.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(ankleRotation));
 }
}

function enemyMotion(s){
 const hit=enemyWindTime(s),follow=enemySwingTime(s);
 if(s.wind>0)return strikeMotion(hit-s.wind,hit,hit+follow);
 if(s.swing>0)return strikeMotion(hit+follow-s.swing,hit,hit+follow);
 return null;
}

function poseHeldWeapon(a,s,weapon,motion,grip,time){
 const v=a.avatar,root=a.root,scale=a.scale;
 const firearm=firearmFor(weapon),rightGoal=new THREE.Vector3(),direction=new THREE.Vector3();
 const walking=v.wasMoving?Math.sin(a.stride)*Math.min(.10,a.speed*.018):0;
 let item=a.weapon,axis=UP;
 if(firearm){
  const shotAge=motion?time-.1:-1;
  const rise=Math.min(1,time/.078);
  const recoil=shotAge>=0?Math.max(0,1-shotAge/.18)**2:0;
  let raised=.58;
  if(motion)raised=motion.stage===3?1-.42*motion.recovery:.58+.42*rise;
  const kick=weapon==='rift-scattergun'?1.38:1;
  rightGoal.set(.27,1.04+.31*raised+walking*.34,-.20-.13*raised+recoil*.17*kick);
  const yaw=motion?-s.angle-Math.PI/2-root.rotation.y:v.mount.rotation.y-Math.PI;
  direction.set(0,-.48*(1-raised)+recoil*.19*kick,-1).applyAxisAngle(UP,yaw);
  axis=FORWARD;
  a.gun.userData.flash.visible=shotAge>=0&&shotAge<.055;
 }else if(weapon==='bow'){
  const draw=s.wind>0?Math.min(1,1-s.wind/enemyWindTime(s)):0;
  item=a.bow;
  rightGoal.set(.27-.08*draw,1.12+.20*draw,-.20-.39*draw);
  direction.set(0,1,.14*(1-draw));
 }else{
  rightGoal.fromArray(grip.right);
  direction.fromArray(grip.shaft);
  if(motion&&v.heroId){
   const yaw=-s.angle-Math.PI/2-root.rotation.y;
   rightGoal.applyAxisAngle(UP,yaw);
   direction.applyAxisAngle(UP,yaw);
  }else if(!motion){
   rightGoal.y+=walking*.42;
   rightGoal.z+=walking;
   direction.y+=walking*.8;
   const travel=v.mount.rotation.y-Math.PI;
   rightGoal.applyAxisAngle(UP,travel);
   direction.applyAxisAngle(UP,travel);
  }
 }
 if(!item)return;
 const rightPalm=v.bones.RightHand;
 aimArm(v,'Right',root.localToWorld(rightGoal.multiplyScalar(scale)),root,1);
 const roll=grip?.roll||0;
 const world=heldRotation(axis,direction,root,roll);
 // The hand turns with the grip. Clamp wrist flex so the arm remains anatomical.
 if(rightPalm){
  const fingers=UP.clone().applyQuaternion(rightPalm.getWorldQuaternion(new THREE.Quaternion()));
  const desired=FORWARD.clone().applyQuaternion(world);
  const delta=new THREE.Quaternion().setFromUnitVectors(fingers,desired);
  delta.rotateTowards(new THREE.Quaternion(),Math.max(0,delta.angleTo(new THREE.Quaternion())-.54));
  rightPalm.quaternion.premultiply(rightPalm.parent.getWorldQuaternion(new THREE.Quaternion()).invert()
   .multiply(delta).multiply(rightPalm.parent.getWorldQuaternion(new THREE.Quaternion())));
 }
 item.position.y=.045;
 orientHeld(item,axis,direction,root,roll);
 if(firearm||weapon==='spear'){
  const support=firearm?new THREE.Vector3(0,.04,-.40):new THREE.Vector3(0,.32,0);
  aimArm(v,'Left',item.localToWorld(support),root,-1);
 }else if(weapon==='bow'){
  const draw=s.wind>0?1-s.wind/enemyWindTime(s):0;
  const string=item.userData.string.geometry.attributes.position;
  string.setZ(1,.32+.24*draw);string.needsUpdate=true;
  if(s.wind>0||s.swing>0)aimArm(v,'Left',item.localToWorld(new THREE.Vector3(0,0,string.getZ(1))),root,-1);
 }else if(s.guard||a.variant==='bulwark'&&!motion){
  aimArm(v,'Left',root.localToWorld(new THREE.Vector3(-.24,1.38,-.48).multiplyScalar(scale)),root,-1);
 }else if(motion){
  const prepare=motion.wind,follow=motion.drive*(1-motion.recovery);
  aimArm(v,'Left',root.localToWorld(new THREE.Vector3(-.32-.11*follow,1.18+.14*prepare,-.24+.15*follow).multiplyScalar(scale)),root,-1);
 }
}

function heldRotation(axis,direction,root,roll){
 const local=new THREE.Quaternion();
 if(axis.y===1){
  const yaw=Math.atan2(direction.x,-direction.z),pitch=Math.atan2(direction.y,Math.hypot(direction.x,direction.z));
  local.setFromAxisAngle(UP,-yaw).multiply(new THREE.Quaternion().setFromAxisAngle(RIGHT,pitch-Math.PI/2));
 }else local.setFromUnitVectors(axis,direction.clone().normalize());
 local.multiply(new THREE.Quaternion().setFromAxisAngle(axis,roll));
 return root.getWorldQuaternion(new THREE.Quaternion()).multiply(local);
}
export function orientHeld(item,axis,direction,root,roll=0){
 const worldRotation=heldRotation(axis,direction,root,roll);
 item.quaternion.copy(item.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldRotation));
 item.updateWorldMatrix(false,true);
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
 const pole=new THREE.Vector3(sign*.5,-1,.15).applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion()));
 reachLimb(upper,fore,hand,target,pole);
}

function reachLimb(upper,fore,hand,target,pole){
 upper.updateWorldMatrix(true,true);
 const shoulder=upper.getWorldPosition(new THREE.Vector3());
 const elbow=fore.getWorldPosition(new THREE.Vector3());
 const palm=hand.getWorldPosition(new THREE.Vector3());
 const l1=shoulder.distanceTo(elbow),l2=elbow.distanceTo(palm);
 const direction=target.clone().sub(shoulder);
 if(direction.lengthSq()<1e-8)return;
 const distance=Math.max(Math.abs(l1-l2)+.001,Math.min(l1+l2-.001,direction.length()));
 direction.normalize();
 const bendDirection=pole.clone().addScaledVector(direction,-pole.dot(direction)).normalize();
 const along=(l1*l1-l2*l2+distance*distance)/(2*distance);
 const bend=Math.sqrt(Math.max(0,l1*l1-along*along));
 const goal=shoulder.clone().addScaledVector(direction,along).addScaledVector(bendDirection,bend);
 aimJoint(upper,fore,goal);
 aimJoint(fore,hand,shoulder.clone().addScaledVector(direction,distance));
}
