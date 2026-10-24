import {heroById,storedHero,inPlaceClip,heroMaterial,soloAnimationAliases} from './heroes.js';
import {combatPose} from './combat-presentation.js';
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
  // The authored right palm drives the existing selectable weapons.
  const palm=model.getObjectByName(sockets[1]);
  if(palm){const grip=new THREE.Group();model.updateMatrixWorld(true);const inherited=palm.getWorldScale(new THREE.Vector3()).x;grip.scale.setScalar(actor.scale/inherited);palm.add(grip);grip.add(actor.weapon);if(actor.bow){grip.add(actor.bow);actor.bow.position.set(0,0,0);actor.bow.rotation.set(0,0,-Math.PI/2);}actor.weapon.position.set(0,0,0);actor.weapon.rotation.set(0,0,Math.PI/2);}
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
 const pose=combatPose(s),key=[pose.state||pose.name,pose.key??''].join(':');
 if(v.key!==key){
  const old=v.current;let action=v.actions[pose.name]||v.actions[pose.fallback]||v.actions.Idle;
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
 // Presentation-only carbine brace. Mixer establishes the base pose each frame.
 if(s.weapon==='gun'){
  const upper=v.model.getObjectByName('mixamorigRightArm');
  const fore=v.model.getObjectByName('mixamorigRightForeArm');
  const left=v.model.getObjectByName('mixamorigLeftArm');
  const firing=['light1','light2','heavy','finisher'].includes(s.action);
  const recoil=firing?Math.max(0,1-Math.abs((s.actionTime||0)-.08)/.12):0;
  if(upper)upper.rotateZ(-.9-recoil*.08);
  if(fore)fore.rotateY(-.65);
  if(left)left.rotateZ(.65);
  a.weapon.rotation.set(-.2,0,Math.PI/2);
  a.shield.visible=false;
 }else{a.weapon.rotation.set(0,0,Math.PI/2);a.shield.visible=true;}
 a.cape.rotation.copy(v.capeRotation);a.cape.rotation.x+=Math.sin(v.mixer.time*3)*.025;
 // Local pose accents leave the actor's world position and controls untouched.
 const accent=s.action==='light2'?.18:s.stagger>0?-.12:0;
 v.mount.rotation.z+=(accent-v.mount.rotation.z)*(1-Math.exp(-dt*20));
 if(v.heroId){const phase=s.actionDuration?Math.min(1,(s.actionTime||0)/s.actionDuration):0;v.mount.rotation.x=s.action==='roll'&&heroById(v.heroId).asset!=='azure_champion.glb'?-Math.PI*2*phase:0;if(s.hp<=0&&v.heroId==='hood')v.mount.rotation.z=1.35;}
 v.model.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material]){m.emissive.set(s.flash>0?'#c47132':'#000000');m.emissiveIntensity=s.flash>0?.65:0;}});
}
