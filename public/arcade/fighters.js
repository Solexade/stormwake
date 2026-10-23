import {inPlaceClip,heroMaterial} from '../heroes.js';
export {inPlaceClip} from '../heroes.js';
import * as T from '../vendor/three.module.js';
import {loadGLB} from '../scene/assets.js';
import {characterMount} from '../characters.js';
import {heroById} from './catalog.js';
import {MOVES} from './config.js';

// Presentation only: the server's coordinates, attack frames and hitboxes win.
export async function createFighter(scene,index,heroId) {
 const hero=heroById(heroId);let source,fallback=hero.asset==='knight.glb';
 try {source=await loadGLB(hero.asset);}
 catch(error){console.warn('Detailed fighter unavailable:',error.message);source=await loadGLB('knight.glb');fallback=true;}
 const model=source.scene,root=new T.Group(),mount=characterMount(model,1);
 root.add(mount);scene.add(root);
 model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;n.frustumCulled=false;
  const material=m=>heroMaterial(m,hero.id);
  n.material=Array.isArray(n.material)?n.material.map(material):material(n.material);
 }});
 // Solo's knight asset is intentionally equipment-free: fit carried gear to its sockets.
 if(fallback){
  model.updateMatrixWorld(true);
  const attach=(name)=>{const palm=model.getObjectByName(name);if(!palm)return null;const grip=new T.Group();grip.scale.setScalar(1/palm.getWorldScale(new T.Vector3()).x);palm.add(grip);return grip;};
  const steel=new T.MeshStandardMaterial({color:'#b8c6d2',metalness:.7,roughness:.4});
  const leather=new T.MeshStandardMaterial({color:'#493a2e',roughness:.9});
  const hand=attach('PalmR'),offhand=attach('PalmL');
  if(hand){const blade=new T.Mesh(new T.BoxGeometry(.075,.85,.035),steel);blade.position.y=.42;hand.add(blade);const cross=new T.Mesh(new T.BoxGeometry(.27,.045,.06),steel);hand.add(cross);const handle=new T.Mesh(new T.CylinderGeometry(.028,.028,.2,8),leather);handle.position.y=-.12;hand.add(handle);hand.rotation.z=Math.PI/2;}
  if(offhand){const shield=new T.Mesh(new T.CylinderGeometry(.28,.28,.065,20),leather);shield.rotation.x=Math.PI/2;offhand.add(shield);const boss=new T.Mesh(new T.SphereGeometry(.08,10,8),steel);boss.position.z=-.06;offhand.add(boss);}
 }
 const mixer=new T.AnimationMixer(model),actions={};
 for(const clip of source.animations){const name=clip.name.split('|').pop();actions[name]=mixer.clipAction(inPlaceClip(clip));}
 // Both detailed heroes use the same Mixamo bone naming contract.
 if(!actions.kick&&!fallback){const martial=await loadGLB('hooded_blade.glb');for(const clip of martial.animations){const name=clip.name.split('|').pop();if(['kick','punch_jab'].includes(name))actions[name]=mixer.clipAction(inPlaceClip(clip));}}
 if(!actions.hit_chest&&!fallback){try{const reactions=await loadGLB('azure_champion.glb');for(const clip of reactions.animations){const name=clip.name.split('|').pop();if(['hit_chest','death','jump_loop'].includes(name)&&!actions[name])actions[name]=mixer.clipAction(inPlaceClip(clip));}}catch(error){console.warn('Reaction clips unavailable; retaining joint fallback',error.message);}}
 const hips=model.getObjectByName(fallback?'Torso':'mixamorigHips')||model.getObjectByName('mixamorig:Hips');
 // Loader sanitizes ':' from bone names. Find by suffix so authored rigs remain compatible.
 const bone=suffix=>{let found;model.traverse(n=>{if(n.isBone&&n.name.endsWith(suffix))found=n;});return found;};
 const materials=[];model.traverse(n=>{if(n.isMesh)materials.push(...(Array.isArray(n.material)?n.material:[n.material]));});
 const bones={leftArm:bone('LeftArm'),rightArm:bone('RightArm'),leftHand:bone('LeftHand'),rightHand:bone('RightHand'),head:bone('Head'),leftForearm:bone('LeftForeArm'),rightForearm:bone('RightForeArm'),spine:bone('Spine'),left:bone('LeftUpLeg'),right:bone('RightUpLeg'),leftKnee:bone('LeftLeg'),rightKnee:bone('RightLeg')};
 return {heroId:hero.id,root,mount,model,mixer,actions,fallback,key:null,current:null,bones,hips,materials,lastFlash:null,sampleFrame:null,sampleAge:0,poseBases:new Map()};
}
export function animateFighter(a,f,dt,frame) {
 a.root.position.x+=(f.x-a.root.position.x)*(1-Math.exp(-dt*26));a.root.position.y=f.y;
 a.mount.rotation.y=f.facing>0?Math.PI/2:-Math.PI/2;
 const native=a.fallback?{idle:'Idle_swordRight',walk:'Walking',jump:'Jump',light:'Run_swordAttack',heavy:'swordAttackJump',special:'swordAttackJump',death:'Death'}:
  {idle:a.actions.sword_idle?'sword_idle':'idle',walk:'walk_loop',jump:'jump_loop',light:a.actions.sword_regular_a?'sword_regular_a':'punch_jab',heavy:a.actions.sword_regular_b?'sword_regular_b':'kick',special:a.actions.sword_regular_c?'sword_regular_c':'kick',death:'death'};
 const pose=f.hp<=0?'death':f.stun?'hurt':f.block||f.blockStun?'guard':f.move|| (f.pose==='walk'?'walk':f.pose==='jump'?'jump':'idle');
 native.punch=a.actions.punch_jab?'punch_jab':native.light;native.kick=a.actions.kick?'kick':native.heavy;
 native.backhand=native.heavy;native.sweep=a.fallback?'Run_swordAttack':a.actions.kick?'kick':native.heavy;native.aerial=native.special;
 native.hurt=a.actions.hit_chest?'hit_chest':native.idle;native.guard=native.idle;
 const name=native[pose],identity=pose+':'+(f.move?frame-f.moveFrame:pose==='hurt'?f.lastHitFrame:0);
 if(a.sampleFrame!==frame){a.sampleFrame=frame;a.sampleAge=0;}else a.sampleAge=Math.min(.05,a.sampleAge+dt);
 // Restore overlays even for bones not keyed by the animation.
 for(const [b,q] of a.poseBases)b.quaternion.copy(q);
 const changed=a.key!==identity;
 if(changed){a.attackTime=0;const next=a.actions[name]||a.actions[native.idle]||a.actions.Idle||Object.values(a.actions)[0];
  next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
  if(a.current&&next!==a.current)a.current.crossFadeTo(next,.08,false);
  a.current=next;a.key=identity;
 }
 const once=!!f.move||f.hp<=0||pose==='hurt';
 a.current.setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity);a.current.clampWhenFinished=true;
 if(f.move&&pose!=='hurt'&&pose!=='guard'){const m=MOVES[f.move];const t=Math.min(m.startup+m.active+m.recovery,f.moveFrame+a.sampleAge*60);const phase=t<m.startup?.35*t/m.startup:t<m.startup+m.active?.35+.2*(t-m.startup)/m.active:.55+.45*(t-m.startup-m.active)/m.recovery;a.attackTime=Math.max(a.attackTime||0,a.current.getClip().duration*phase);a.current.time=a.attackTime;a.current.timeScale=0;}
 else a.current.timeScale=pose==='walk'?(f.input?.axis*f.facing<0?-1.4:1.4):1;
 a.mixer.update(dt);
 for(const b of Object.values(a.bones))if(b){if(!a.poseBases.has(b))a.poseBases.set(b,b.quaternion.clone());else a.poseBases.get(b).copy(b.quaternion);}
 // Local joint recoil never changes server positions or hitboxes.
 const recoil=pose==='hurt'?Math.exp(-Math.max(0,frame-f.lastHitFrame+a.sampleAge*60)/9):0;
 a.brace=(a.brace||0)+((pose==='guard'?1:0)-(a.brace||0))*(1-Math.exp(-dt*24));
 const brace=a.brace;
 if(a.bones.spine){a.bones.spine.rotation.x+=brace*.13-recoil*.22;a.bones.spine.rotation.y+=recoil*.14;}
 if(a.bones.head)a.bones.head.rotation.x+=brace*.12-recoil*.12;
 applyGuard(a,brace);

 // Crouch bends joints instead of squashing anatomy. Local pose never changes hurtboxes.
 if(f.crouch&&!a.fallback){for(const b of [a.bones.left,a.bones.right])if(b)b.rotation.x-=.65;for(const b of [a.bones.leftKnee,a.bones.rightKnee])if(b)b.rotation.x+=1.1;}
 a.mount.position.y=f.crouch?-.36:f.move==='sweep'?-.16:0;
 if(f.move==='backhand')a.mount.rotation.y+=Math.sin(Math.min(1,f.moveFrame/29)*Math.PI)*.28;
 if(f.move==='aerial')a.mount.rotation.x=-Math.sin(Math.min(1,f.moveFrame/31)*Math.PI)*.15;else a.mount.rotation.x=0;
 a.mount.rotation.z=f.hp<=0&&!a.actions.death?-f.facing*1.3:0;
 const flashing=!!f.flash;if(a.lastFlash!==flashing){for(const m of a.materials){if(m.emissive){m.emissive.set(flashing?'#754123':'#000000');m.emissiveIntensity=flashing?.4:0;}}a.lastFlash=flashing;}
}

// Aim each limb in world space: rig-local Euler axes differ between imported clips.
export function aimGuardBone(bone,child,target,weight){
 if(!bone||!child||weight<=.001)return;
 bone.updateWorldMatrix(true,true);
 const origin=bone.getWorldPosition(new T.Vector3());
 const from=child.getWorldPosition(new T.Vector3()).sub(origin).normalize();
 const to=target.clone().sub(origin).normalize();
 const world=bone.getWorldQuaternion(new T.Quaternion());
 const desired=new T.Quaternion().setFromUnitVectors(from,to).multiply(world);
 const parent=bone.parent.getWorldQuaternion(new T.Quaternion()).invert();
 bone.quaternion.slerp(parent.multiply(desired),weight);bone.updateWorldMatrix(false,true);
}
function applyGuard(a,weight){
 if(weight<.001||!a.bones.head)return;
 a.mount.updateWorldMatrix(true,true);
 const head=a.bones.head.getWorldPosition(new T.Vector3());
 const forward=new T.Vector3(0,0,1).applyQuaternion(a.mount.getWorldQuaternion(new T.Quaternion()));
 const side=new T.Vector3().crossVectors(new T.Vector3(0,1,0),forward).normalize();
 for(const [arm,forearm,hand,sign] of [[a.bones.leftArm,a.bones.leftForearm,a.bones.leftHand,-1],[a.bones.rightArm,a.bones.rightForearm,a.bones.rightHand,1]]){
  if(!arm||!forearm||!hand)continue;
  const shoulder=arm.getWorldPosition(new T.Vector3());
  const reach=shoulder.distanceTo(forearm.getWorldPosition(new T.Vector3()))+forearm.getWorldPosition(new T.Vector3()).distanceTo(hand.getWorldPosition(new T.Vector3()));
  const elbow=shoulder.clone().addScaledVector(forward,reach*.35).addScaledVector(side,sign*reach*.12);elbow.y-=reach*.25;
  aimGuardBone(arm,forearm,elbow,weight);
  const fist=head.clone().addScaledVector(forward,reach*.48).addScaledVector(side,sign*reach*.2);fist.y-=reach*.15;
  aimGuardBone(forearm,hand,fist,weight);
 }
}
