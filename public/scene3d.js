import {cinematicPass} from './cinematic.js';
import {warningFor} from './combat-presentation.js';
import {createActorFactory,animateActor} from './scene/actors.js';
import {createEnvironment} from './scene/environment.js';
import {createLighting} from './scene/lighting.js';
import {createHarbourShore} from './scene/harbour.js';
import {qualityPreset,createFrameMeter} from './scene/quality.js';
import {PALETTE} from './scene/palette.js';
import * as THREE from './vendor/three.module.js';
import {LAND,BRIDGES,HOME,SHRINE,BOSS,OBSTACLES,landAt} from './game.js';
import {walkable} from './world.js';
import {SAFEHOUSE,FORGE,SUPPLIES} from './catalog.js';

// Local, original geometry and procedural surfaces. Coordinates match the server.
const S=1/40,UP=new THREE.Vector3(0,1,0);
export function createWorld(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=PALETTE.exposure;
 const cinema=cinematicPass(renderer);
 const scene=new THREE.Scene();scene.background=new THREE.Color(PALETTE.fog);scene.fog=new THREE.FogExp2(PALETTE.fog,PALETTE.fogDensity);
 const camera=new THREE.PerspectiveCamera(48,1,.08,190);const look=new THREE.Vector3(HOME.x*S,1,HOME.y*S);let first=true,mode='follow',quality='high';
 const {sun,sky,skyMaterial,environment}=createLighting(renderer,scene);
 const {harbourAssets,mats,box,ball,cylinder,beam,mesh,form,batchStatic,boat,chest,crystal,shrineLight,beaconFlame,beaconLight,flames,waterMaterial,foliage,pennants,motes,buildings,grass,contactMaterial,materials}=createEnvironment(renderer,scene,canvas,sky);
 const shore=createHarbourShore(scene),meter=createFrameMeter();
 materials.ready.then(()=>{if(scene.environment!==environment.texture)environment.dispose();});
 const warrior=createActorFactory({scene,mats,box,ball,cylinder,beam,mesh,form,batchStatic,contactMaterial,canvas});
 let orbit=0;
 const player=warrior('player');const actors=new Map();let actorRun='';
 const merchants=[{place:FORGE,title:'ASTRID · FORGE',actor:warrior('player')},{place:SUPPLIES,title:'EDDA · SUPPLIES',actor:warrior('player')}];
 for(const npc of merchants){npc.actor.weapon.visible=false;npc.actor.shield.visible=false;}
 const anvilGroup=new THREE.Group();anvilGroup.position.set((FORGE.x+33)*S,0,FORGE.y*S);scene.add(anvilGroup);cylinder(mats.darkwood,0,.30,0,.28,.35,.6,anvilGroup);box(mats.metal,0,.68,0,.82,.19,.38,anvilGroup);box(mats.metal,0,.51,0,.30,.2,.24,anvilGroup);const horn=mesh(new THREE.ConeGeometry(.13,.36,8),mats.steel,.55,.7,0,anvilGroup);horn.rotation.z=-Math.PI/2;
 const supplyFallback=box(mats.wood,(SUPPLIES.x+33)*S,.37,SUPPLIES.y*S,.7,.74,.7);harbourAssets.add('wooden_barrels_01.glb',supplyFallback,{x:(SUPPLIES.x+33)*S,z:SUPPLIES.y*S,height:.74});for(let i=0;i<3;i++)cylinder(mats.glow,(SUPPLIES.x+23+i*10)*S,.89,SUPPLIES.y*S,.04,.065,.28);
 // Skaal has flapping wings and follows the shoulder rather than a flat icon.
 const raven=new THREE.Group();scene.add(raven);ball(mats.darkstone,0,0,0,.12,.09,.24,raven);ball(mats.darkstone,0,.08,-.19,.08,.085,.10,raven);const beak=mesh(new THREE.ConeGeometry(.035,.15,6),mats.gold,0,.06,-.32,raven);beak.rotation.x=-Math.PI/2;
 const wings=[];for(const side of [-1,1]){const pivot=new THREE.Group();raven.add(pivot);const wing=box(mats.darkstone,side*.27,0,.02,.5,.025,.22,pivot);wing.rotation.y=side*.25;wings.push(pivot);}
 const redMat=new THREE.MeshBasicMaterial({color:'#ef7453',transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false});const tellGeo=new THREE.RingGeometry(.87,1,48);const tells=[];for(let i=0;i<12;i++){const m=mesh(tellGeo,redMat.clone());m.rotation.x=-Math.PI/2;m.castShadow=false;m.receiveShadow=false;m.visible=false;tells.push(m);}
 const stormRing=mesh(new THREE.TorusGeometry(1,.025,5,64),mats.glow);stormRing.rotation.x=Math.PI/2;stormRing.visible=false;
 const trail=mesh(new THREE.TorusGeometry(.9,.035,5,28,Math.PI*1.25),new THREE.MeshBasicMaterial({color:'#ffdf9a',transparent:true,opacity:.65}));trail.rotation.x=-Math.PI/2;trail.visible=false;
 const targetRune=mesh(new THREE.TorusGeometry(1.1,.017,5,48),mats.glow);targetRune.rotation.x=Math.PI/2;
 const arrows=[];for(let i=0;i<24;i++){const a=new THREE.Group();const shaft=mesh(new THREE.CylinderGeometry(.019,.019,.60,5),mats.wood,0,0,0,a);const tip=mesh(new THREE.ConeGeometry(.046,.14,5),mats.steel,0,.36,0,a);a.visible=false;scene.add(a);arrows.push(a);}
 // Minimal tactical overlay stays crisp without changing the 3D camera.
 const overlay=document.createElement('canvas');overlay.className='tactical-overlay';overlay.setAttribute('aria-hidden','true');canvas.parentElement.appendChild(overlay);const hud=overlay.getContext('2d');let w=900,h=650;
 function resize(){const r=canvas.getBoundingClientRect();w=r.width;h=r.height;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();overlay.width=w;overlay.height=h;}
 new ResizeObserver(resize).observe(canvas);resize();
 const occlusionRay=new THREE.Raycaster();
 const raycaster=new THREE.Raycaster(),ground=new THREE.Plane(UP,0),intersection=new THREE.Vector3();
 function aimAt(mouse,p){raycaster.setFromCamera(new THREE.Vector2(mouse.x/w*2-1,-mouse.y/h*2+1),camera);if(raycaster.ray.intersectPlane(ground,intersection))return Math.atan2(intersection.z-p.y*S,intersection.x-p.x*S);return p.angle;}
 function minimap(run){const mw=106,mh=79,x=w-mw-17,y=h-mh-80;if(w<600)return;hud.fillStyle='#0a1829bb';hud.fillRect(x,y,mw,mh);hud.strokeStyle='#97b1b244';hud.strokeRect(x,y,mw,mh);hud.save();hud.translate(x,y);hud.scale(mw/2500,mh/1850);hud.fillStyle='#96ada27a';for(const p of LAND){hud.beginPath();p.forEach(([x,z],i)=>i?hud.lineTo(x,z):hud.moveTo(x,z));hud.closePath();hud.fill();}hud.fillStyle='#f4cc8a';hud.beginPath();hud.arc(run.player.x,run.player.y,50,0,7);hud.fill();hud.restore();}
 function draw(t,dt,run,playing,community,options={}){
  const frameStart=performance.now();meter.begin(frameStart);
  shore.update(t,qualityPreset(quality).shore,options.reducedMotion);
  for(const npc of merchants)animateActor(npc.actor,{x:npc.place.x+20,y:npc.place.y,angle:Math.PI/2,hp:1,maxHp:1,vx:0,vy:0},dt,t,camera,first);
  const windTime=options.reducedMotion?0:t;
  skyMaterial.uniforms.time.value=windTime;
  foliage.forEach(f=>{f.mesh.rotation.z=Math.sin(windTime*.8+f.phase)*f.strength;f.mesh.position.x=f.x+Math.sin(windTime*.8+f.phase)*f.strength*.7;});
  pennants.forEach((flag,j)=>{const v=flag.geometry.attributes.position;for(let i=0;i<v.count;i++){const x=v.getX(i),y=v.getY(i);v.setZ(i,Math.sin(windTime*2.3+x*5+y*2+j)*.09*(x+.425)/.85);}v.needsUpdate=true;});
  motes.visible=quality!=='low'&&!options.reducedMotion;motes.position.set(player.root.position.x+Math.sin(windTime*.1),0,player.root.position.z);motes.rotation.y=windTime*.012;
  waterMaterial.uniforms.time.value=options.reducedMotion?0:t;boat.rotation.z=options.reducedMotion?0:Math.sin(t*.7)*.015;boat.position.y=-.45+(options.reducedMotion?0:Math.sin(t*.6)*.045);
  crystal.rotation.y=windTime*.5;crystal.position.y=1.2+Math.sin(windTime*1.8)*.10;crystal.visible=!playing||!run?.relic;shrineLight.intensity=crystal.visible?4:0;chest.visible=!playing||!run?.chest;
  beaconFlame.visible=community.salvage>=community.target;beaconLight.intensity=beaconFlame.visible?14:0;beaconFlame.scale.y=1.5+Math.sin(t*8)*.2;flames.forEach((f,i)=>f.scale.setScalar(1+Math.sin(t*9+i)*.13));
  const p=playing&&run?run.player:{...HOME,angle:1.05,hp:120,maxHp:120};animateActor(player,p,dt,t,camera,first);
  if(run&&run.id!==actorRun){actorRun=run.id;for(const e of [...run.enemies,run.boss]){if(!actors.has(e.id))actors.set(e.id,warrior(e.type));actors.get(e.id).root.position.set(e.x*S,0,e.y*S);}}
  for(const a of actors.values())a.root.visible=playing;
  if(playing&&run)for(const e of [...run.enemies,run.boss])animateActor(actors.get(e.id),e,dt,t,camera,first);
  const px=player.root.position.x,pz=player.root.position.z;
  const target=new THREE.Vector3(),desired=new THREE.Vector3();
  if(playing){const lead=options.reducedMotion?0:.0025;target.set(px+(p.vx||0)*lead,1.0,pz+(p.vy||0)*lead-.35);desired.set(px+Math.sin(orbit)*(mode==='tactical'?13:8.2),mode==='tactical'?15:5.6,pz+Math.cos(orbit)*(mode==='tactical'?13:8.2));camera.fov+=((p.sprinting&&!options.reducedMotion?51:50)-camera.fov)*(1-Math.exp(-dt*3));}else{target.set(px-.9,1.0,pz-.15);desired.set(px+2.3,3.3,pz+6.1);camera.fov=w<600?54:47;}
  if(first){camera.position.copy(desired);look.copy(target);}else{camera.position.lerp(desired,1-Math.exp(-dt*7));look.lerp(target,1-Math.exp(-dt*9));}camera.lookAt(look);camera.updateProjectionMatrix();
  sky.position.copy(camera.position);
  sun.position.set(px-8,22,pz+10);sun.target.position.set(px,0,pz-5);
  raven.position.set(px+Math.cos(t*.75)*1.15,2.5+Math.sin(t*1.3)*.13,pz-.45+Math.sin(t*.75)*.6);raven.rotation.y=-t*.75;wings.forEach((p,i)=>p.rotation.z=Math.sin(t*11)*.45*(i?1:-1));
  tells.forEach(m=>m.visible=false);arrows.forEach(a=>a.visible=false);stormRing.visible=false;trail.visible=false;targetRune.visible=playing;
  if(playing&&run){let j=0;for(const e of run.enemies){if(e.hp>0&&e.wind>0&&e.type!=='archer'&&j<tells.length){const m=tells[j++];m.visible=true;m.position.set(e.x*S,.24,e.y*S);m.scale.setScalar((e.type==='brute'?120:76)*S);m.material.opacity=.3+warningFor(e).progress*.4;}}
   const b=run.boss;if(b.hp>0&&b.wind>0){const m=tells[11];m.visible=true;m.position.set(b.targetX*S,.26,b.targetY*S);m.scale.setScalar(b.radius*S);m.material.opacity=.45;}
   for(const f of run.effects){if(f.type==='storm'||f.type==='slam'){stormRing.visible=true;stormRing.position.set(f.x*S,.3,f.y*S);stormRing.scale.setScalar(Math.max(.05,(f.type==='storm'?225:f.radius)*S*(1-f.life/f.maxLife)));}}
   if(p.slash>0){trail.visible=true;trail.position.set(px,1.10,pz);trail.rotation.z=-p.angle;trail.scale.setScalar(p.action==='finisher'?1.7:p.action==='heavy'?1.3:1);}
   run.shots.slice(0,arrows.length).forEach((shot,i)=>{const a=arrows[i];a.visible=true;a.position.set(shot.x*S,1,shot.y*S);a.quaternion.setFromUnitVectors(UP,new THREE.Vector3(shot.vx,0,shot.vy).normalize());});
   const goal=run.bossDead?HOME:run.relic?BOSS:SHRINE;targetRune.position.set(goal.x*S,.28,goal.y*S);targetRune.scale.setScalar(1+Math.sin(t*2)*.06);
  }
  const heroPoint=new THREE.Vector3(px,1.25,pz),sight=heroPoint.clone().sub(camera.position),sightDistance=sight.length();occlusionRay.set(camera.position,sight.normalize());occlusionRay.far=Math.max(0,sightDistance-.4);
  for(const building of buildings){const obstructs=playing&&occlusionRay.intersectObject(building.group,true).length>0;building.opacity+=((obstructs?.18:1)-building.opacity)*(1-Math.exp(-dt*14));for(const [source,material] of building.materials){for(const slot of ['map','normalMap','roughnessMap','bumpMap'])if(material[slot]!==source[slot]){material[slot]=source[slot];material.needsUpdate=true;}material.color.copy(source.color);if(material.normalScale&&source.normalScale)material.normalScale.copy(source.normalScale);material.transparent=true;material.opacity=building.opacity;material.depthWrite=building.opacity>.95;}building.group.traverse(n=>{if(n.isMesh)n.castShadow=building.opacity>.95;});}
  cinema.render(scene,camera,qualityPreset(quality).bloom);hud.clearRect(0,0,w,h);
  if(playing&&run){
   for(const e of [...run.enemies,run.boss]){
    const warning=warningFor(e);if(!warning)continue;
    const v=new THREE.Vector3(e.x*S,3.05,e.y*S).project(camera);if(v.z>1||Math.abs(v.x)>.94||Math.abs(v.y)>.85)continue;
    const x=(v.x+1)*w/2,y=(1-v.y)*h/2;
    hud.font='bold 10px Segoe UI';hud.textAlign='center';const width=hud.measureText(warning.label).width+18;
    hud.fillStyle='#171a20ee';hud.fillRect(x-width/2,y-14,width,24);
    hud.fillStyle='#ffbd78';hud.fillText(warning.label,x,y);
    hud.fillStyle='#f17450';hud.fillRect(x-width/2,y+7,width*warning.progress,3);
    if(e.type==='archer'){const end=new THREE.Vector3((e.x+Math.cos(e.angle)*290)*S,.3,(e.y+Math.sin(e.angle)*290)*S).project(camera);const start=new THREE.Vector3(e.x*S,.3,e.y*S).project(camera);if(end.z<1){hud.save();hud.setLineDash([6,5]);hud.strokeStyle='#ffb971aa';hud.lineWidth=2;hud.beginPath();hud.moveTo((start.x+1)*w/2,(1-start.y)*h/2);hud.lineTo((end.x+1)*w/2,(1-end.y)*h/2);hud.stroke();hud.restore();}}
   }
   for(const f of run.effects){if(!['hit','parry','block'].includes(f.type))continue;const age=1-f.life/f.maxLife;if(age>.8)continue;
    const v=new THREE.Vector3(f.x*S,1.2,f.y*S).project(camera);if(v.z>1)continue;
    const x=(v.x+1)*w/2,y=(1-v.y)*h/2;hud.save();hud.globalAlpha=1-age;hud.strokeStyle=f.type==='parry'?'#b8efff':'#ffe4a8';hud.lineWidth=2;
    for(let i=0;i<8;i++){const a=i*Math.PI/4+f.x;const spread=options.reducedMotion?8:8+age*42;hud.beginPath();hud.moveTo(x+Math.cos(a)*spread,y+Math.sin(a)*spread*.65);hud.lineTo(x+Math.cos(a)*(spread+6),y+Math.sin(a)*(spread+6)*.65);hud.stroke();}hud.restore();
   }
  }
  if(playing&&run){minimap(run);const cd=run.player.storm;hud.fillStyle='#102532c9';hud.fillRect(w-112,145,92,29);hud.fillStyle=cd>0?'#a8bac0':'#f2d59c';hud.font='10px Segoe UI';hud.textAlign='center';hud.fillText(cd>0?`ϟ STORM ${cd.toFixed(1)}s`:'ϟ Q · STORM READY',w-66,164);
   for(const effect of run.effects){if(effect.type==='blood'&&options.bloodFX!==false){const v=new THREE.Vector3(effect.x*S,.025,effect.y*S).project(camera);if(v.z<1){hud.fillStyle='rgba(100,15,20,'+Math.min(.55,effect.life*.4)+')';hud.beginPath();hud.ellipse((v.x+1)*w/2,(1-v.y)*h/2,12,4,-.2,0,Math.PI*2);hud.fill();}}if(effect.type==='hit'&&options.bloodFX!==false){const age=1-effect.life/effect.maxLife;for(let i=0;i<9;i++){const a=i*2.4+effect.x,spread=age*(.5+(i%3)*.22);const v=new THREE.Vector3(effect.x*S+Math.cos(a)*spread,Math.max(.05,1+age*.9-age*age*2.3),effect.y*S+Math.sin(a)*spread).project(camera);if(v.z<1){hud.fillStyle='rgba(155,24,29,'+(1-age*.8)+')';hud.beginPath();hud.ellipse((v.x+1)*w/2,(1-v.y)*h/2,2+(i%3),1.5+(i%2),a,0,Math.PI*2);hud.fill();}}}if(effect.type==='hit'){const v=new THREE.Vector3(effect.x*S,2+(1-effect.life/effect.maxLife)*.7,effect.y*S).project(camera);hud.fillStyle='#ffe0a4';hud.font='bold 16px Segoe UI';hud.fillText(effect.amount,(v.x+1)*w/2,(1-v.y)*h/2);}if(effect.type==='finisher'||effect.type==='parry'){const v=new THREE.Vector3(effect.x*S,1,effect.y*S).project(camera);hud.strokeStyle=effect.type==='parry'?'#b8edff':'#ffd590';hud.lineWidth=3;hud.beginPath();hud.arc((v.x+1)*w/2,(1-v.y)*h/2,30*(1-effect.life/effect.maxLife),0,Math.PI*2);hud.stroke();}if(effect.type==='hurt'){hud.fillStyle=`rgba(150,43,23,${effect.life*.22})`;hud.fillRect(0,0,w,h);}}
   const goal=run.bossDead?HOME:run.relic?BOSS:SHRINE;if(Math.hypot(goal.x-p.x,goal.y-p.y)>190){const v=new THREE.Vector3(goal.x*S,.5,goal.y*S).project(camera);const sx=(v.x+1)*w/2,sy=(1-v.y)*h/2,tx=Math.max(32,Math.min(w-32,sx)),ty=Math.max(180,Math.min(h-115,sy));hud.fillStyle='#f3d398';hud.font='18px Georgia';hud.fillText('◇',tx,ty);hud.font='8px Segoe UI';hud.fillText(run.bossDead?'HARBOUR':run.relic?'WARDEN':'SHRINE',tx,ty+17);}
  }
  if(playing&&run){for(const spot of [{place:SAFEHOUSE,title:'HEARTHHALL'},...merchants]){if(Math.hypot(spot.place.x-p.x,spot.place.y-p.y)>420)continue;const v=new THREE.Vector3(spot.place.x*S,2.7,spot.place.y*S).project(camera);if(v.z<1&&Math.abs(v.x)<.94&&Math.abs(v.y)<.85){hud.font='bold 9px Segoe UI';hud.textAlign='center';hud.fillStyle='#fae0a6';hud.fillText(spot.title,(v.x+1)*w/2,(1-v.y)*h/2);}}if(options.lockedTarget!==null&&options.lockedTarget!==undefined){const locked=[...run.enemies,run.boss].find(e=>e.id===options.lockedTarget&&e.hp>0);if(locked){const v=new THREE.Vector3(locked.x*S,2.6,locked.y*S).project(camera);hud.fillStyle='#ffe3a4';hud.font='21px Georgia';hud.fillText('◇',(v.x+1)*w/2,(1-v.y)*h/2);}}}
  first=false;
  meter.end(performance.now()-frameStart);
  if(!canvas.dataset.metricsAt||performance.now()-Number(canvas.dataset.metricsAt)>1000){
    const measured=meter.read();canvas.dataset.frameP95Ms=measured.frame.p95Ms.toFixed(2);canvas.dataset.cpuP95Ms=measured.cpu.p95Ms.toFixed(2);canvas.dataset.frameSamples=String(measured.frame.samples);canvas.dataset.metricsAt=String(performance.now());canvas.dataset.graphicsQuality=quality;
  }
 }
 return {draw,aimAt,setOrbit(value){orbit=value;},setMode(value){mode=value;},setQuality(value){quality=value==='low'?'low':'high';harbourAssets.setQuality(quality);const preset=qualityPreset(quality);renderer.setPixelRatio(Math.min(devicePixelRatio,preset.pixelRatio));renderer.shadowMap.enabled=preset.shadows;grass.visible=preset.foliage;meter.reset();resize();},getInfo(){return {engine:'Three.js',revision:THREE.REVISION,quality,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,...meter.read()};}};
}
