import * as THREE from '../vendor/three.module.js';
import {LAND,BRIDGES,HOME,SHRINE,BOSS,OBSTACLES,landAt} from '../game.js';
import {walkable} from '../world.js';
import {SAFEHOUSE,FORGE,SUPPLIES} from '../catalog.js';
const S=1/40,UP=new THREE.Vector3(0,1,0);
const randomFactory=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
import {dressWarrior,animateAvatar} from '../characters.js';
const mixAngle=(a,b,k)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;
export function createActorFactory({scene,mats,box,ball,cylinder,beam,mesh,form,batchStatic,contactMaterial,canvas}){
 // Reusable articulated adventurer. Individual joints are animated from server state.
 function warrior(type){
  const root=new THREE.Group(),rig=new THREE.Group();root.add(rig);scene.add(root);const contact=new THREE.Mesh(new THREE.PlaneGeometry(1.0,.72),contactMaterial);contact.rotation.x=-Math.PI/2;contact.position.y=.03;root.add(contact);const enemy=type!=='player',boss=type==='boss',archer=type==='archer';
  const skin=enemy?new THREE.MeshStandardMaterial({color:boss?'#7b8d88':'#929488',roughness:1}):mats.skin;
  const cloth=enemy?new THREE.MeshStandardMaterial({color:boss?'#293f42':archer?'#4a4e38':'#454b49',roughness:1,side:THREE.DoubleSide}):mats.cloth;
  const scale=boss?1.85:type==='brute'?1.3:1;rig.scale.setScalar(scale);
  // Hips and fitted leather tunic, a tapered anatomical torso.
  ball(mats.leather,0,.98,0,.25,.24,.17,rig);const torso=mesh(new THREE.LatheGeometry([new THREE.Vector2(.22,0),new THREE.Vector2(.25,.18),new THREE.Vector2(.31,.41),new THREE.Vector2(.28,.52)],18),mats.leather,0,1.01,0,rig);torso.scale.z=.65;
  form(mats.leather,[[.21,0],[.255,.13],[.27,.33],[.24,.40]],0,1.12,0,rig,.62);form(mats.leather,[[.245,0],[.25,.09]],0,1.05,0,rig,.7);box(mats.gold,0,1.08,-.2,.12,.1,.04,rig);
  // Cross-body strap and engraved belt rivets.
  const strap=box(mats.leather,0,1.37,-.153,.08,.57,.045,rig);strap.rotation.z=-.48;for(let i=0;i<5;i++)ball(mats.gold,(i-2)*.085,1.085,-.197,.017,.017,.013,rig);
  const legs=[];for(const side of [-1,1]){const hip=new THREE.Group();hip.position.set(side*.13,.95,0);rig.add(hip);form(cloth,[[.071,-.44],[.083,-.34],[.105,-.17],[.10,0]],0,0,0,hip,1.12);const knee=new THREE.Group();knee.position.y=-.44;hip.add(knee);form(mats.leather,[[.055,-.41],[.067,-.29],[.084,-.12],[.072,0]],0,0,0,knee,1.05);box(mats.metal,0,.015,-.087,.14,.15,.06,knee);const ankle=new THREE.Group();ankle.position.y=-.41;knee.add(ankle);ball(mats.leather,0,-.01,-.045,.085,.069,.15,ankle);for(let j=0;j<2;j++)box(mats.gold,0,-.13-j*.13,-.107,.13,.025,.025,knee);legs.push({hip,knee,ankle});}
  const arms=[];for(const side of [-1,1]){const shoulder=new THREE.Group();shoulder.position.set(side*.275,1.47,0);rig.add(shoulder);ball(mats.leather,0,-.04,0,.105,.12,.12,shoulder);ball(mats.leather,side*.025,-.01,-.015,.115,.045,.13,shoulder);form(cloth,[[.061,-.39],[.077,-.22],[.082,-.1]],0,0,0,shoulder);const elbow=new THREE.Group();elbow.position.y=-.39;shoulder.add(elbow);form(mats.leather,[[.048,-.29],[.073,-.12],[.064,0]],0,0,0,elbow);box(mats.metal,0,-.14,-.081,.12,.23,.045,elbow);ball(skin,0,-.31,0,.071,.093,.065,elbow);arms.push({shoulder,elbow});}
  // Sculpted head: nose, ears, brows, cheekbones, hair and layered beard.
  const head=new THREE.Group();head.position.y=1.76;head.scale.set(.78,.84,.8);rig.add(head);cylinder(skin,0,-.11,0,.085,.1,.16,head);
  ball(skin,0,.06,-.015,.145,.19,.145,head);ball(skin,0,.045,-.155,.031,.055,.051,head);for(const side of [-1,1]){ball(skin,side*.146,.04,.005,.034,.055,.024,head);ball(skin,side*.085,-.003,-.111,.052,.042,.028,head);box(mats.beard,side*.065,.104,-.132,.092,.027,.025,head);ball(mats.darkstone,side*.06,.077,-.147,.022,.012,.009,head);}
  ball(mats.beard,0,.16,.038,.149,.13,.126,head);box(mats.beard,0,.208,-.016,.07,.065,.22,head);ball(mats.beard,0,-.065,-.085,.113,.115,.085,head);for(let i=0;i<13;i++){const bx=(i-6)*.015;const beard=mesh(new THREE.ConeGeometry(.014,.17+(.10-Math.abs(bx)),6),mats.beard,bx,-.16,-.126+Math.abs(bx)*.2,head);beard.rotation.z=Math.PI;}
  for(let i=0;i<5;i++){const braid=ball(mats.beard,0,-.09-i*.065,.145,.055-i*.004,.044,.043,head);}
  cylinder(mats.gold,0,-.23,-.12,.035,.035,.035,head,10);
  if(enemy){const helmet=mesh(new THREE.SphereGeometry(.158,14,8,0,Math.PI*2,0,Math.PI/2),mats.metal,0,.10,0,head);box(mats.metal,0,.071,-.155,.035,.20,.045,head);}
  // Fur collar, deliberately irregular instead of a flat cartoon cape.
  const tuftCount=enemy?45:90;const tufts=new THREE.InstancedMesh(new THREE.ConeGeometry(.016,.075,5),mats.fur,tuftCount);const tuftTransform=new THREE.Object3D(),furRandom=randomFactory(911);
  for(let i=0;i<tuftCount;i++){const a=furRandom()*Math.PI*2,r=.17+furRandom()*.11;tuftTransform.position.set(Math.sin(a)*r,1.5+furRandom()*.04,Math.cos(a)*r*.70);tuftTransform.rotation.set(Math.cos(a)*.8,0,-Math.sin(a)*.8);tuftTransform.scale.setScalar(.65+furRandom()*.65);tuftTransform.updateMatrix();tufts.setMatrixAt(i,tuftTransform.matrix);}tufts.castShadow=true;rig.add(tufts);
  const capeGeo=new THREE.PlaneGeometry(.58,.81,7,10);const pos=capeGeo.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);pos.setZ(i,.08+Math.sin(x*25)*.035+(.4-y)*.1);if(y<-.30)pos.setY(i,y+Math.sin(x*31)*.055);}capeGeo.computeVertexNormals();const cape=mesh(capeGeo,cloth,0,1.03,.21,rig);cape.rotation.y=Math.PI;
  // Axe and round shield are carried by animated joints.
  const weapon=new THREE.Group();weapon.position.set(0,-.3,0);weapon.rotation.x=-.15;arms[1].elbow.add(weapon);cylinder(mats.wood,0,.23,0,.024,.027,1.0,weapon);
  const axeShape=new THREE.Shape();axeShape.moveTo(.025,.45);axeShape.lineTo(.25,.60);axeShape.quadraticCurveTo(.39,.33,.24,.17);axeShape.lineTo(.025,.28);axeShape.closePath();const axe=mesh(new THREE.ExtrudeGeometry(axeShape,{depth:.045,bevelEnabled:true,bevelThickness:.015,bevelSize:.008,bevelSegments:1}),mats.steel,0,0,-.023,weapon);box(mats.gold,0,.35,0,.08,.13,.075,weapon);
  const axeParts=[...weapon.children];const gun=new THREE.Group();weapon.add(gun);box(mats.darkstone,0,.12,0,.15,.55,.17,gun);box(mats.steel,0,.47,0,.07,.38,.07,gun);box(mats.glow,0,.26,-.09,.08,.18,.02,gun);gun.rotation.z=-Math.PI/2;gun.visible=false;const sword=new THREE.Group();weapon.add(sword);box(mats.steel,0,.38,0,.075,.95,.04,sword);box(mats.gold,0,-.04,0,.33,.06,.08,sword);cylinder(mats.leather,0,-.18,0,.035,.035,.25,sword);const spear=new THREE.Group();weapon.add(spear);cylinder(mats.wood,0,.35,0,.025,.025,1.9,spear);mesh(new THREE.ConeGeometry(.09,.36,4),mats.steel,0,1.46,0,spear);sword.visible=spear.visible=false;
  const shield=new THREE.Group();shield.position.set(-.10,-.15,-.04);arms[0].elbow.add(shield);const shieldFace=cylinder(mats.wood,0,0,0,.33,.33,.08,shield,24);shieldFace.rotation.x=Math.PI/2;const edge=mesh(new THREE.TorusGeometry(.33,.026,7,32),mats.metal,0,0,-.05,shield);ball(mats.metal,0,0,-.074,.08,.08,.04,shield);for(let i=0;i<12;i++){const a=i*Math.PI/6;ball(mats.gold,Math.sin(a)*.27,Math.cos(a)*.27,-.048,.013,.013,.016,shield);}
  let bow=null;if(archer){weapon.visible=false;bow=mesh(new THREE.TorusGeometry(.35,.021,5,20,Math.PI),mats.wood,0,-.1,0,arms[1].elbow);bow.rotation.z=-Math.PI/2;}
  if(boss){weapon.scale.set(1.7,1.4,1.7);shield.visible=false;for(const side of [-1,1]){beam(new THREE.Vector3(side*.12,1.97,0),new THREE.Vector3(side*.26,2.25,.015),.035,mats.gold,rig);}}
  // Health bar floats only above injured enemies.
  const health=new THREE.Group();health.position.y=2.35*scale;root.add(health);const bg=box(new THREE.MeshBasicMaterial({color:'#172428'}),0,0,0,.65,.05,.035,health);const fill=box(new THREE.MeshBasicMaterial({color:'#d7ac75'}),0,0,-.025,.62,.035,.012,health);health.visible=false;
  batchStatic(head);for(const part of legs){batchStatic(part.ankle);batchStatic(part.knee,new Set([part.ankle]));batchStatic(part.hip,new Set([part.knee]));}for(const part of arms){batchStatic(part.elbow,new Set([weapon,shield]));batchStatic(part.shoulder,new Set([part.elbow]));}batchStatic(shield);batchStatic(rig,new Set([head,cape,...legs.map(l=>l.hip),...arms.map(a=>a.shoulder)]));
  const actor={root,rig,contact,legs,arms,head,cape,weapon,axeParts,sword,spear,gun,shield,health,fill,scale,lastX:0,lastZ:0,stride:0,speed:0,type,bow};if(!enemy)dressWarrior(actor,canvas);else{
   const old=[];rig.traverse(n=>{if(n.isMesh)old.push(n);});old.forEach(n=>n.removeFromParent());
   const palette=type==='boss'?['#7c43a1','#9bffff']:type==='brute'?['#b74030','#ffe091']:type==='archer'?['#b7c5cd','#ff9e36']:['#80543b','#97ffbd'];
   const shell=new THREE.MeshStandardMaterial({color:palette[0],roughness:.62,metalness:.35}),eye=new THREE.MeshStandardMaterial({color:palette[1],emissive:palette[1],emissiveIntensity:1.3});
   box(shell,0,1.12,0,.6,.65,.4,rig);box(mats.darkstone,0,1.13,-.22,.35,.3,.04,rig);box(eye,0,1.13,-.25,.22,.06,.02,rig);
   box(shell,0,.05,0,.62,.48,.44,head);box(mats.darkstone,0,.04,-.24,.53,.22,.04,head);
   for(const side of [-1,1]){box(eye,side*.15,.04,-.27,.12,.1,.03,head);box(shell,side*.2,.39,0,.07,.25,.07,head);box(eye,side*.2,.54,0,.09,.07,.09,head);}
   legs.forEach(l=>{box(shell,0,-.2,0,.18,.4,.22,l.hip);box(mats.darkstone,0,-.2,0,.13,.4,.16,l.knee);box(shell,0,0,-.06,.25,.17,.38,l.ankle);});
   arms.forEach(a=>{box(shell,0,-.18,0,.2,.38,.22,a.shoulder);box(mats.darkstone,0,-.17,0,.15,.34,.18,a.elbow);box(shell,0,-.34,0,.22,.15,.23,a.elbow);});
  }return actor;
 }
return warrior;
}
export function animateActor(a,s,dt,t,camera,first){if(a.type==='player'){const equipped=s.weapon||'axe';a.axeParts.forEach(part=>part.visible=equipped==='axe');a.sword.visible=equipped==='sword';a.spear.visible=equipped==='spear';a.gun.visible=equipped==='gun';}
  const rolling=s.action==='roll',dead=s.hp<=0;
  // Bounded visual extrapolation fills gaps between authoritative snapshots.
  if(a.sample!==s){a.sample=s;a.sampleAt=t;}
  const horizon=s.preview?0:Math.min(.15,Math.max(0,t-a.sampleAt)+.025);
  let px=s.x,py=s.y;
  for(let elapsed=0;elapsed<horizon;elapsed+=.02){const step=Math.min(.02,horizon-elapsed),dx=(s.vx||0)*step,dy=(s.vy||0)*step;if(walkable(px+dx,py,16))px+=dx;if(walkable(px,py+dy,16))py+=dy;}
  const tx=px*S,tz=py*S,oldX=a.root.position.x,oldZ=a.root.position.z;
  if(s.preview||Math.hypot(tx-oldX,tz-oldZ)>12||first)a.root.position.set(tx,.01,tz);else{a.root.position.x+=(tx-oldX)*Math.min(1,dt*23);a.root.position.z+=(tz-oldZ)*Math.min(1,dt*23);a.root.position.y=.01;}
  const travel=Math.min(.4,Math.hypot(a.root.position.x-oldX,a.root.position.z-oldZ));
  const measured=Math.hypot(s.vx||0,s.vy||0)*S;a.speed+=(measured-a.speed)*Math.min(1,dt*22);
  const walking=a.speed>.18&&!rolling&&!dead;a.gaitBlend=(a.gaitBlend||0)+((walking?1:0)-(a.gaitBlend||0))*(1-Math.exp(-dt*12));const strideLength=s.sprinting?3.4:2.8;
  if(walking)a.stride+=travel/(strideLength*a.scale)*Math.PI*2;
  const bearing=rolling?s.dashAngle:s.angle,rotation=-bearing-Math.PI/2;
  const turn=Math.atan2(Math.sin(rotation-a.root.rotation.y),Math.cos(rotation-a.root.rotation.y));
  a.turnLean=(a.turnLean||0)+(Math.max(-.20,Math.min(.20,turn*.22))-(a.turnLean||0))*(1-Math.exp(-dt*10));
  a.root.rotation.y=mixAngle(a.root.rotation.y,rotation,1-Math.exp(-dt*19));
  const relative=(s.moveAngle??s.angle)-s.angle,forward=Math.cos(relative),side=Math.sin(relative);
  const gaitAmplitude=a.gaitBlend*Math.min(1,a.speed/3);
  a.rig.position.y=walking?Math.cos(a.stride*2)*(s.sprinting?.045:.025)*gaitAmplitude:Math.sin(t*1.7)*.008;
  a.rig.rotation.set(walking?(s.sprinting?.19:.085)*forward:0,walking?Math.sin(a.stride)*.065*gaitAmplitude:0,walking?-.05*side+a.turnLean:0);
  a.rig.scale.setScalar(a.scale);
  a.legs.forEach((leg,i)=>{
   const phase=a.stride+i*Math.PI,wave=Math.sin(phase),lift=Math.max(0,wave)*(s.sprinting?.22:.16)*gaitAmplitude;
   const targetZ=Math.cos(phase)*(s.sprinting?.46:.37)*gaitAmplitude*forward,targetX=Math.cos(phase)*.16*gaitAmplitude*side;
   const down=.83-lift,L1=.44,L2=.41,d=Math.min(.849,Math.max(.45,Math.hypot(targetZ,down)));
   const hip=Math.atan2(-targetZ,down)+Math.acos(Math.max(-1,Math.min(1,(L1*L1+d*d-L2*L2)/(2*L1*d))));
   const knee=-(Math.PI-Math.acos(Math.max(-1,Math.min(1,(L1*L1+L2*L2-d*d)/(2*L1*L2)))));
   leg.hip.rotation.set(hip,0,-Math.atan2(targetX,down));leg.knee.rotation.x=knee;
   leg.ankle.rotation.x=-hip-knee+Math.max(0,-wave)*.10*gaitAmplitude;
  });
  a.arms.forEach((arm,i)=>{arm.shoulder.rotation.set(.18+(walking?Math.sin(a.stride+(1-i)*Math.PI)*(s.sprinting?.55:.36)*forward:0),0,i?-.12:.12);arm.elbow.rotation.x=s.sprinting?.9:.35;});
  if(a.actionId!==s.actionId||a.actionName!==s.action){a.actionId=s.actionId;a.actionName=s.action;a.poseTime=s.actionTime||0;}else a.poseTime=Math.max(s.actionTime||0,Math.min(s.actionDuration||0,(a.poseTime||0)+dt));const attack=s.action,phase=s.actionDuration?Math.min(1,a.poseTime/s.actionDuration):0;
  if(['light1','light2','heavy','finisher'].includes(attack)){
   const heavy=attack==='heavy'||attack==='finisher',hit=heavy?.41:.33;
   const anticipation=Math.min(1,phase/hit),release=Math.min(1,Math.max(0,(phase-hit)/.30));
   const recover=Math.min(1,Math.max(0,(phase-.76)/.24));
   a.arms[1].shoulder.rotation.x=((heavy?2.65:1.35)*anticipation-(heavy?1.9:.45)*release)*(1-recover);
   a.arms[1].shoulder.rotation.z=(attack==='light2'?1:-1)*(.2+anticipation*1.15-release*1.9)*(1-recover);
   a.arms[1].elbow.rotation.x=(.8-.55*release)*(1-recover);
   a.arms[0].shoulder.rotation.x=.55;a.arms[0].elbow.rotation.x=.9;
   a.rig.rotation.y=attack==='finisher'?-Math.PI*2*(phase*phase*(3-2*phase)):(attack==='light2'?-1:1)*(.32*anticipation-.6*release)*(1-recover);
   a.rig.rotation.x=heavy?-.12*anticipation+.24*release*(1-recover):.04;
  }
  if(s.guard){a.arms[0].shoulder.rotation.x=.72;a.arms[0].elbow.rotation.x=1.0;a.arms[0].shoulder.rotation.z=-.15;a.arms[1].shoulder.rotation.x=.9;a.rig.rotation.x=-.05;}
  if(s.wind>0){a.arms[1].shoulder.rotation.x=2.4;a.arms[1].elbow.rotation.x=.5;a.rig.rotation.x=-.1;}
  if(s.swing>0){a.arms[1].shoulder.rotation.x=.7+s.swing*3;a.arms[1].elbow.rotation.x=.1;a.rig.rotation.x=.15;}
  if(s.stagger>0){a.rig.rotation.z=Math.sin(t*18)*.06;a.rig.rotation.x=-.2;}
  if(rolling){const r=Math.min(1,phase);a.rig.rotation.x=-Math.PI*2*r;a.rig.rotation.y=0;a.rig.position.y=Math.sin(Math.PI*r)*1.56;a.rig.scale.y=a.scale*.8;a.legs.forEach(l=>{l.hip.rotation.x=1.3;l.knee.rotation.x=-2;l.ankle.rotation.x=.7;});a.arms.forEach(x=>{x.shoulder.rotation.x=1.5;x.elbow.rotation.x=1.4;});}
  a.cape.rotation.x=Math.sin(t*3)*.025+(walking?.10+a.speed*.014:0);a.head.rotation.z=Math.sin(t*.7)*.012;a.head.rotation.y=-a.rig.rotation.y*.35;const breath=1+Math.sin(t*1.8)*.004;a.rig.scale.y*=breath;a.contact.scale.setScalar(rolling?.65:1);
  a.root.visible=!dead||(s.death||0)>0;
  if(dead){a.rig.rotation.z=Math.min(1,(1.4-s.death)*2)*1.48;a.rig.rotation.x=.15;}
  animateAvatar(a,s,dt);
  a.health.visible=a.type!=='player'&&s.hp>0&&s.hp<s.maxHp;a.health.quaternion.copy(camera.quaternion);a.fill.scale.x=Math.max(.001,s.hp/s.maxHp||1);a.fill.position.x=-(1-a.fill.scale.x)*.31;
 }
