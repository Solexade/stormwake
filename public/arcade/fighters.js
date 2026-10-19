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
 const hips=model.getObjectByName(fallback?'Torso':'mixamorigHips')||model.getObjectByName('mixamorig:Hips');
 // Loader sanitizes ':' from bone names. Find by suffix so authored rigs remain compatible.
 const bone=suffix=>{let found;model.traverse(n=>{if(n.isBone&&n.name.endsWith(suffix))found=n;});return found;};
 const bones={spine:bone('Spine'),left:bone('LeftUpLeg'),right:bone('RightUpLeg'),leftKnee:bone('LeftLeg'),rightKnee:bone('RightLeg')};
 return {heroId:hero.id,root,mount,model,mixer,actions,fallback,key:null,current:null,bones,hips};
}
export function animateFighter(a,f,dt,frame) {
 a.root.position.x+=(f.x-a.root.position.x)*(1-Math.exp(-dt*26));a.root.position.y=f.y;
 a.mount.rotation.y=f.facing>0?Math.PI/2:-Math.PI/2;
 const native=a.fallback?{idle:'Idle_swordRight',walk:'Walking',jump:'Jump',light:'Run_swordAttack',heavy:'swordAttackJump',special:'swordAttackJump',death:'Death'}:
  {idle:a.actions.sword_idle?'sword_idle':'idle',walk:'walk_loop',jump:'jump_loop',light:a.actions.sword_regular_a?'sword_regular_a':'punch_jab',heavy:a.actions.sword_regular_b?'sword_regular_b':'kick',special:a.actions.sword_regular_c?'sword_regular_c':'kick',death:'death'};
 const pose=f.hp<=0?'death':f.move|| (f.pose==='walk'?'walk':f.pose==='jump'?'jump':'idle');
 const name=native[pose],identity=pose+':'+(f.move?frame-f.moveFrame:0);
 if(a.key!==identity){const next=a.actions[name]||a.actions[native.idle]||a.actions.Idle||Object.values(a.actions)[0];
  next.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play();
  if(a.current&&next!==a.current)a.current.crossFadeTo(next,.08,false);
  a.current=next;a.key=identity;
 }
 const once=!!f.move||f.hp<=0;
 a.current.setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity);a.current.clampWhenFinished=true;
 if(f.move){const m=MOVES[f.move];a.current.time=a.current.getClip().duration*f.moveFrame/(m.startup+m.active+m.recovery);a.current.timeScale=0;}
 else a.current.timeScale=f.pose==='block'?0:1;
 a.mixer.update(dt);
 // Crouch bends joints instead of squashing anatomy. Local pose never changes hurtboxes.
 if(f.crouch&&!a.fallback){for(const b of [a.bones.left,a.bones.right])if(b)b.rotation.x-=.65;for(const b of [a.bones.leftKnee,a.bones.rightKnee])if(b)b.rotation.x+=1.1;}
 a.mount.position.y=f.crouch?-.36:0;
 a.mount.rotation.z=f.hp<=0&&!a.actions.death?-f.facing*1.3:0;
 a.model.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material]){m.emissive.set(f.flash?'#754123':'#000000');m.emissiveIntensity=f.flash?.4:0;}});
}
