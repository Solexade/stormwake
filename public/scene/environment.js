import * as THREE from '../vendor/three.module.js';
import {LAND,BRIDGES,HOME,SHRINE,BOSS,OBSTACLES,landAt} from '../game.js';
import {walkable} from '../world.js';
import {SAFEHOUSE,FORGE,SUPPLIES} from '../catalog.js';
const S=1/40,UP=new THREE.Vector3(0,1,0);
const randomFactory=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
import {applyPhotographicMaterials,needleMaterial} from '../realism.js';
import {dressCottage,weatherHarbourMaterial,createHarbourAssets} from './harbour.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {loadGLB} from './assets.js';
export function createEnvironment(renderer,scene,canvas,sky){
 const harbourAssets=createHarbourAssets(scene,canvas,loadGLB),replacementFallbacks=[];
 const random=randomFactory(24681);let count=0;
 function texture(kind){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),data=g.createImageData(256,256),r=randomFactory(kind==='grass'?18:kind==='wood'?73:91);const base=kind==='grass'?[67,79,56]:kind==='wood'?[87,65,44]:kind==='leather'?[89,62,42]:[114,116,110];
   for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;let n=(r()-.5)*38;if(kind==='wood')n+=Math.sin(x*.8+Math.sin(y*.02)*2)*11;if(kind==='leather')n+=Math.sin(x*2)*Math.cos(y*2)*5;for(let k=0;k<3;k++)data.data[i+k]=base[k]+n;data.data[i+3]=255;}g.putImageData(data,0,0);
   if(kind==='stone'){g.strokeStyle='#202b2533';for(let i=0;i<25;i++){g.beginPath();g.moveTo(r()*256,r()*256);g.lineTo(r()*256,r()*256);g.stroke();}}
   const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
 }
 const grassTex=texture('stone'),stoneTex=texture('stone'),woodTex=texture('wood'),leatherTex=texture('leather');grassTex.repeat.set(.7,.7);
 const mats={
  ground:new THREE.MeshStandardMaterial({map:grassTex,bumpMap:grassTex,bumpScale:.025,roughness:1}),
  stone:new THREE.MeshStandardMaterial({map:stoneTex,bumpMap:stoneTex,bumpScale:.13,roughness:.94,color:'#aaa99e'}),
  darkstone:new THREE.MeshStandardMaterial({map:stoneTex,roughness:1,color:'#536260'}),
  wood:new THREE.MeshStandardMaterial({map:woodTex,bumpMap:woodTex,bumpScale:.045,roughness:.85}),
  darkwood:new THREE.MeshStandardMaterial({map:woodTex,color:'#68625c',roughness:.9}),
  leather:new THREE.MeshStandardMaterial({map:leatherTex,bumpMap:leatherTex,bumpScale:.025,roughness:.84}),
  metal:new THREE.MeshStandardMaterial({color:'#7e8d96',metalness:.48,roughness:.66}),
  steel:new THREE.MeshStandardMaterial({color:'#bdc9c9',metalness:.68,roughness:.52}),
  gold:new THREE.MeshStandardMaterial({color:'#ac8950',metalness:.73,roughness:.42}),
  skin:new THREE.MeshStandardMaterial({color:'#b7957c',roughness:.92}),
  beard:new THREE.MeshStandardMaterial({color:'#503a2a',roughness:1}),
  fur:new THREE.MeshStandardMaterial({color:'#807c70',roughness:1}),
  cloth:new THREE.MeshStandardMaterial({color:'#263f49',roughness:1,side:THREE.DoubleSide}),
  pine:new THREE.MeshStandardMaterial({color:'#2e5148',roughness:1}),
  pineLight:new THREE.MeshStandardMaterial({color:'#436456',roughness:1}),
  moss:new THREE.MeshStandardMaterial({color:'#496449',roughness:1}),
  glow:new THREE.MeshStandardMaterial({color:'#b9e9df',emissive:'#7bcec6',emissiveIntensity:2,roughness:.2,metalness:.3}),
  fire:new THREE.MeshBasicMaterial({color:'#ffcf80'}),
 };
 for(const name of ['ground','stone','darkstone','wood','darkwood'])weatherHarbourMaterial(mats[name],name==='ground'?'ground':name.includes('wood')?'wood':'stone');
 const materials=applyPhotographicMaterials(renderer,scene,mats,canvas);
 const boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.SphereGeometry(1,18,12),rockGeo=new THREE.IcosahedronGeometry(1,3),cylinderGeo=new THREE.CylinderGeometry(1,1,1,12);
 function mesh(geo,mat,x=0,y=0,z=0,parent=scene){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);count++;return m;}
 const box=(mat,x,y,z,sx,sy,sz,parent=scene)=>{const m=mesh(boxGeo,mat,x,y,z,parent);m.scale.set(sx,sy,sz);return m;};
 const ball=(mat,x,y,z,sx,sy,sz,parent=scene)=>{const m=mesh(sphereGeo,mat,x,y,z,parent);m.scale.set(sx,sy,sz);return m;};
 function cylinder(mat,x,y,z,rt,rb,h,parent=scene,n=12){return mesh(new THREE.CylinderGeometry(rt,rb,h,n),mat,x,y,z,parent);}
 function beam(a,b,r,mat,parent=scene){const d=new THREE.Vector3().subVectors(b,a);const m=mesh(cylinderGeo,mat,0,0,0,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(r,d.length(),r);m.quaternion.setFromUnitVectors(UP,d.normalize());return m;}
 const rp=rockGeo.attributes.position;for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i),f=1+.11*Math.sin(x*8+z*5)*Math.cos(y*9)+.045*Math.sin(z*19+x*11);rp.setXYZ(i,x*f,y*f,z*f);}rockGeo.computeVertexNormals();
 function rock(x,z,size,mat=mats.stone){const m=mesh(rockGeo,mat,x,size*.27-.15,z);m.scale.set(size,size*.74,size*.85);m.rotation.set(random()*.4,random()*7,random()*.4);return m;}

 // Smooth tapered forms replace the separated bead-like limbs.
 function form(mat,points,x,y,z,parent,depth=1){const g=new THREE.LatheGeometry(points.map(([r,h])=>new THREE.Vector2(r,h)),14);const m=mesh(g,mat,x,y,z,parent);m.scale.z=depth;return m;}
 function batchStatic(root,excluded=new Set(),spatial=false){
  root.updateMatrixWorld(true);const groups=new Map();
  root.traverse(n=>{if(!n.isMesh||n.isInstancedMesh||Array.isArray(n.material)||excluded.has(n)||!n.visible)return;let q=n;while(q&&q!==root){if(excluded.has(q))return;q=q.parent;}
   const wp=new THREE.Vector3().setFromMatrixPosition(n.matrixWorld),cell=spatial?Math.floor(wp.x/12)+':'+Math.floor(wp.z/12):'';
   const signature=Object.entries(n.geometry.attributes).map(([name,a])=>name+':'+a.itemSize+':'+a.normalized).sort().join(',');const key=n.material.uuid+':'+cell+':'+!!n.geometry.index+':'+signature; if(!groups.has(key))groups.set(key,[]);groups.get(key).push(n);
  });
  for(const nodes of groups.values()){if(nodes.length<2)continue;const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert();const geometries=nodes.map(n=>n.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,n.matrixWorld)));const merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!merged)continue;const m=new THREE.Mesh(merged,nodes[0].material);m.castShadow=nodes.some(n=>n.castShadow);m.receiveShadow=true;root.add(m);nodes.forEach(n=>n.removeFromParent());}
 }
 // Solid land masses, with visible coastal cliffs rather than flat map cut-outs.
 for(const p of LAND){const sh=new THREE.Shape(p.map(([x,z])=>new THREE.Vector2(x*S,-z*S)));const g=new THREE.ExtrudeGeometry(sh,{depth:1.25,bevelEnabled:true,bevelThickness:.18,bevelSize:.17,bevelSegments:2,steps:1});g.rotateX(-Math.PI/2);const m=mesh(g,[mats.ground,mats.darkstone]);m.position.y=-1.25;}
 // Hand-laid trail stones: the same route as the authoritative game map.
 const paths=[[[465,1410],[655,1360],[750,1180],[930,1100],[1135,815],[1420,820],[1650,795],[1840,680],[1910,560]],[[930,850],[780,810],[660,710]]];
 const pathMat=new THREE.MeshStandardMaterial({map:stoneTex,color:'#665e4b',roughness:1});
 for(const route of paths)for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d<length;d+=20){const f=d/length,x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f;if(!landAt(x,z)||BRIDGES.some(q=>x>q.x&&x<q.x+q.w&&z>q.y&&z<q.y+q.h))continue;const patch=mesh(new THREE.CircleGeometry(.5+random()*.18,9),pathMat,x*S,.015,z*S);patch.rotation.x=-Math.PI/2;}}
 const cobbles=[];for(const p of paths)for(let j=1;j<p.length;j++){const [a,b]=[p[j-1],p[j]],length=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d<length;d+=22){const f=d/length;for(let k=0;k<2;k++){const x=a[0]+(b[0]-a[0])*f+(random()-.5)*36,z=a[1]+(b[1]-a[1])*f+(random()-.5)*36;if(landAt(x,z))cobbles.push([x*S,z*S,.17+random()*.15]);}}}
 const dummy=new THREE.Object3D();const stones=new THREE.InstancedMesh(rockGeo,mats.stone,cobbles.length);cobbles.forEach(([x,z,r],i)=>{dummy.position.set(x,.06,z);dummy.scale.set(r,.06,r*.75);dummy.rotation.set(0,random()*6,0);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);});stones.receiveShadow=true;scene.add(stones);
 // Weathered bridges: decking, posts and sagging rope rails.
 for(const b of BRIDGES){const vertical=b.h>b.w,steps=Math.floor((vertical?b.h:b.w)/11);for(let i=0;i<steps;i++){const x=(b.x+(vertical?b.w/2:i*11+5))*S,z=(b.y+(vertical?i*11+5:b.h/2))*S;box(i%3?mats.wood:mats.darkwood,x,.18,z,(vertical?b.w:10)*S,.16,(vertical?10:b.h)*S);}
  const corners=[[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]];corners.forEach(([x,z])=>cylinder(mats.darkwood,x*S,.6,z*S,.085,.11,1.5));const rails=vertical?[[corners[0],corners[2]],[corners[1],corners[3]]]:[[corners[0],corners[1]],[corners[2],corners[3]]];for(const [a,b] of rails){const points=[];for(let i=0;i<9;i++){const f=i/8;points.push(new THREE.Vector3((a[0]+(b[0]-a[0])*f)*S,1-.22*Math.sin(Math.PI*f),(a[1]+(b[1]-a[1])*f)*S));}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,.033,5,false),mats.leather);}}
 const cityWall=new THREE.MeshStandardMaterial({color:0x526572,roughness:.88,metalness:.08});
 const buildings=[];
 function cottage(x,z,scale=1,angle=0){const group=new THREE.Group();group.position.set(x*S,0,z*S);group.rotation.y=angle;group.scale.setScalar(scale);scene.add(group);box(cityWall,0,2.1,0,2.7,4.2,2.1,group);box(mats.metal,0,4.25,0,2.9,.14,2.3,group);for(let row=0;row<4;row++)for(const side of [-1,1])box(mats.glow,side*.75,.65+row*.85,1.06,.5,.42,.025,group);box(mats.metal,0,.65,1.09,.6,1.3,.05,group);batchStatic(group);buildings.push({group,materials:[],opacity:1});}

 function timberHouse(x,z,scale=1,angle=0){const group=new THREE.Group();group.position.set(x*S,0,z*S);group.rotation.y=angle;group.scale.setScalar(scale);scene.add(group);box(mats.stone,0,.2,0,3,.4,2.4,group);box(mats.darkwood,0,1,0,2.7,1.8,2.1,group);
  for(let j=0;j<8;j++)box(mats.wood,0,.36+j*.21,1.08,2.8,.14,.09,group);
  for(const side of [-1,1]){const roof=box(mats.darkwood,side*.77,2.18,0,1.85,.16,2.85,group);roof.rotation.z=side*-.58;for(let j=0;j<11;j++){const tile=box(mats.wood,side*.78,2.21,(j-5)*.25,1.87,.035,.21,group);tile.rotation.z=side*-.58;}box(mats.wood,side*1.29,1,1.16,.12,2,.14,group);}
  beam(new THREE.Vector3(-1.5,1.79,1.5),new THREE.Vector3(0,2.75,1.5),.06,mats.gold,group);beam(new THREE.Vector3(0,2.75,1.5),new THREE.Vector3(1.5,1.79,1.5),.06,mats.gold,group);
  box(mats.leather,0,.67,1.15,.55,1.32,.1,group);for(const side of [-1,1]){box(mats.gold,side*.84,1.12,1.15,.43,.58,.05,group);box(mats.fire,side*.84,1.12,1.19,.31,.43,.02,group);box(mats.darkwood,side*.84,1.12,1.22,.035,.48,.04,group);}box(mats.stone,.84,2.4,-.5,.45,1.2,.5,group);
  dressCottage(group,{box,mats});
  const copies=new Map();group.traverse(n=>{if(n.isMesh){if(!copies.has(n.material)){const copy=n.material.clone();copy.onBeforeCompile=n.material.onBeforeCompile;copy.customProgramCacheKey=n.material.customProgramCacheKey;copies.set(n.material,copy);}n.material=copies.get(n.material);}});batchStatic(group);buildings.push({group,materials:[...copies.entries()],opacity:1});
 }
 timberHouse(420,1240,1.05,-.15);cottage(660,1390,.95,.1);timberHouse(760,1580,.75,.35);
 // Harbour jetty.
 for(let i=0;i<22;i++)box(mats.wood,(315+i*10)*S,.13,1445*S,.23,.14,1.25);
 for(const x of [330,430,520])for(const z of [1423,1467])cylinder(mats.darkwood,x*S,-.18,z*S,.11,.14,1.8);
 function longboat(){const g=new THREE.Group();g.position.set(265*S,-.45,1555*S);g.rotation.y=-.22;scene.add(g);const curve=new THREE.Shape();curve.moveTo(0,-2.8);curve.bezierCurveTo(1.35,-1.9,1.2,1.8,0,2.8);curve.bezierCurveTo(-1.2,1.8,-1.35,-1.9,0,-2.8);const geo=new THREE.ExtrudeGeometry(curve,{depth:.65,bevelEnabled:true,bevelThickness:.13,bevelSize:.1,bevelSegments:2});geo.rotateX(-Math.PI/2);mesh(geo,mats.darkwood,0,0,0,g);for(let i=0;i<8;i++)box(mats.wood,0,.73,(i-3.5)*.48,1.6,.12,.16,g);cylinder(mats.wood,0,2.4,0,.07,.1,4.3,g);box(mats.wood,0,3.9,0,3.1,.1,.1,g);
  const sailgeo=new THREE.PlaneGeometry(2.8,2.8,14,14);const a=sailgeo.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i);a.setZ(i,Math.sin((x/2.8+.5)*Math.PI)*.4+Math.sin(y*1.8)*.08);}sailgeo.computeVertexNormals();const sailmat=new THREE.MeshStandardMaterial({color:'#c9baa0',roughness:1,side:THREE.DoubleSide});const sail=mesh(sailgeo,sailmat,0,2.5,.1,g);for(const x of [-.7,.7]){const stripe=box(mats.cloth,x,2.5,.47,.25,2.7,.02,g);stripe.castShadow=false;}beam(new THREE.Vector3(0,4.3,0),new THREE.Vector3(0,.8,2.4),.024,mats.leather,g);beam(new THREE.Vector3(0,4.3,0),new THREE.Vector3(0,.8,-2.4),.024,mats.leather,g);return g;
 }
 const boat=longboat();
 for(let i=0;i<16;i++){const x=-18+i*5.5,z=-18,h=7+(i*7%13);box(cityWall,x,h/2,z,3,h,3);for(let y=1;y<h;y+=1.4)box(mats.glow,x,y,z+1.51,1.7,.12,.02);}

 // Fishing moorings on the water side of the jetty; no collision or rewards.
 for(const x of [340,410,490]){const z=1490; cylinder(mats.darkwood,x*S,-.05,z*S,.07,.09,1.15);const buoy=ball(mats.wood,x*S+.22,-.35,z*S+.3,.13,.18,.13);buoy.castShadow=false;
 const rope=mesh(new THREE.TorusGeometry(.18,.025,4,12),mats.leather,x*S,.34,z*S);rope.rotation.x=-Math.PI/2;rope.castShadow=false;}

 const foliage=[];
 // Spruce silhouettes are layered, irregular and shaded with real lighting.
 const needles=needleMaterial(),branchCard=new THREE.PlaneGeometry(1,1);
 for(let i=0;i<105;i++){const x=i===0?700:i===1?1210:250+random()*1990,z=i===0?1520:i===1?1040:300+random()*1330;if(!landAt(x-35,z)||!landAt(x+35,z)||!landAt(x,z-40))continue;if([HOME,SHRINE,BOSS,{x:580,y:720}].some(p=>Math.hypot(p.x-x,p.y-z)<190))continue;if(i>1&&z>1120&&x<870)continue;if(paths.some(p=>p.some(([a,b])=>Math.hypot(a-x,b-z)<95)))continue;if(x>1600&&z<890)continue;
  const h=3.8+random()*2.5;cylinder(mats.darkwood,x*S,h*.48,z*S,.025,.14,h*.96,scene,9);
  const crown=new THREE.Group();crown.position.set(x*S,0,z*S);scene.add(crown);
  for(let j=0;j<9;j++){const y=h*(.22+j*.081),length=h*.25*(1-j/10);for(let k=0;k<5;k++){
   const angle=k*Math.PI*2/5+j*1.3,tip=new THREE.Vector3(Math.cos(angle)*length,y-.16,Math.sin(angle)*length);
   beam(new THREE.Vector3(0,y,0),tip,.014,mats.darkwood,crown);
   for(let n=0;n<3;n++){const card=mesh(branchCard,needles,tip.x*(.35+n*.23),y-.05,tip.z*(.35+n*.23),crown);card.scale.set(length*.8,length*1.15,1);card.rotation.set(-Math.PI*.36,angle+n*.55,0);card.castShadow=false;}
  }}batchStatic(crown);foliage.push({mesh:crown,x:crown.position.x,z:crown.position.z,phase:random()*6,strength:.005});
 }

 OBSTACLES.forEach(o=>{
  const fallback=rock(o.x*S,o.y*S,o.r*S);
  if(o.x===700&&o.y===1520){replacementFallbacks.push(fallback);harbourAssets.add('boulder_01.glb',fallback,{x:o.x*S,z:o.y*S,radius:o.r*S});}
 });
 // Coastal boulders and distant mountain silhouettes.
 for(const p of LAND)for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],d=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let j=0;j<d;j+=45){const f=j/d;const x=(a[0]+(b[0]-a[0])*f)*S,z=(a[1]+(b[1]-a[1])*f)*S;rock(x,z,.25+random()*.45,mats.darkstone);}}
 const mountains=new THREE.MeshStandardMaterial({color:'#5b777b',roughness:1});for(let i=0;i<14;i++){const m=mesh(new THREE.DodecahedronGeometry(6+random()*5,0),mountains,-35+i*10,-1,-34-random()*12);m.rotation.y=random()*6;}
 // Grass clumps use instancing to keep the scene affordable on laptops.
 const blades=[];for(let i=0;i<3500;i++){const x=random()*2400,z=random()*1750;if(landAt(x,z)&&!BRIDGES.some(b=>x>b.x-20&&x<b.x+b.w+20&&z>b.y-20&&z<b.y+b.h+20))blades.push([x*S,z*S]);}
 const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.065,.32,3),mats.moss,blades.length);blades.forEach(([x,z],i)=>{dummy.position.set(x,.13,z);dummy.scale.set(1+random(),.6+random(),1);dummy.rotation.set(0,random()*6,random()*.25);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);});grass.receiveShadow=true;scene.add(grass);
 // Temple: layered stone dais, broken columns, inscriptions and doorway.
 const temple=new THREE.Group();temple.position.set(BOSS.x*S,0,BOSS.y*S);scene.add(temple);
 cylinder(mats.darkstone,0,.06,0,5.1,5.3,.26,temple,48);cylinder(mats.stone,0,.17,0,4.8,5,.16,temple,48);
 const ring=mesh(new THREE.TorusGeometry(4.1,.027,5,80),mats.gold,0,.27,0,temple);ring.rotation.x=Math.PI/2;
 for(let i=0;i<12;i++){const a=i*Math.PI/6;box(mats.gold,Math.sin(a)*4.1,.27,Math.cos(a)*4.1,.07,.02,.25,temple).rotation.y=a;}
 for(const [x,z,h] of [[-4,-2,3.2],[3.5,-3,3.9],[4.6,1,2.7],[-4,3,1.8],[2.8,4,2.4]]){cylinder(mats.darkstone,x,h/2,z,.36,.44,h,temple,10);cylinder(mats.stone,x,h,z,.54,.54,.22,temple,10);for(let j=0;j<3;j++)cylinder(mats.stone,x,.2+j*.85,z,.44,.44,.11,temple,10);}
 box(mats.stone,-1.9,2,-4.8,.8,4,.85,temple);box(mats.stone,1.9,2,-4.8,.8,4,.85,temple);box(mats.darkstone,0,4.05,-4.8,5,.7,1,temple);for(let j=0;j<5;j++)box(mats.gold,(j-2)*.45,4.05,-4.26,.12,.22,.02,temple);
 const shrineGroup=new THREE.Group();shrineGroup.position.set(SHRINE.x*S,0,SHRINE.y*S);scene.add(shrineGroup);cylinder(mats.darkstone,0,.2,0,1.15,1.4,.4,shrineGroup,8);cylinder(mats.stone,0,.5,0,.78,1,.26,shrineGroup,8);const crystal=mesh(new THREE.OctahedronGeometry(.35),mats.glow,0,1.2,0,shrineGroup);const shrineLight=new THREE.PointLight('#a8e8d5',5,6,2);shrineLight.position.set(0,1.4,0);shrineGroup.add(shrineLight);
 const chest=new THREE.Group();chest.position.set(580*S,0,720*S);scene.add(chest);box(mats.wood,0,.35,0,1.15,.7,.65,chest);for(const x of [-.4,.4])box(mats.gold,x,.36,0,.085,.74,.69,chest);box(mats.gold,0,.4,.35,.15,.23,.05,chest);
 const beacon=new THREE.Group();beacon.position.set(850*S,0,1450*S);scene.add(beacon);cylinder(mats.stone,0,1,0,.35,.65,2,beacon);cylinder(mats.metal,0,2.1,0,.5,.3,.25,beacon);const beaconFlame=mesh(new THREE.OctahedronGeometry(.32),mats.fire,0,2.5,0,beacon);const beaconLight=new THREE.PointLight('#ffbe63',0,12,2);beaconLight.position.set(0,2.7,0);beacon.add(beaconLight);
 const flames=[];for(const [x,z] of [[480,1320],[710,1250],[845,1110],[1000,950],[1310,825],[1560,850],[1690,735]]){cylinder(mats.darkwood,x*S,.6,z*S,.055,.09,1.2);const f=mesh(new THREE.OctahedronGeometry(.1),mats.fire,x*S,1.25,z*S);flames.push(f);}
 // Ocean surface: animated vertex waves and physically suggestive Fresnel highlights.
 const waterMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`uniform float time; varying vec3 vP;void main(){vec3 p=position;p.z+=sin(p.x*.19+time*.65)*.13+sin(p.y*.27-time*.53)*.085;vec4 world=modelMatrix*vec4(p,1.);vP=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`uniform float time;varying vec3 vP;void main(){
 vec2 q=vP.xz;float dx=.0247*cos((q.x-25.)*.19+time*.65),dz=.02295*cos((23.-q.y)*.27-time*.53);
 dx+=.045*cos(q.x*2.4+q.y*.8+time*1.2)+.025*cos(q.x*4.1-q.y*2.3-time*1.5);
 dz+=.035*cos(q.y*2.8-q.x*.6-time*.9);
 vec3 n=normalize(vec3(-dx,1.,dz)),eye=normalize(cameraPosition-vP);float fres=.025+.975*pow(1.-max(dot(eye,n),0.),5.);
 vec3 reflected=reflect(-eye,n);vec3 sky=mix(vec3(.28,.38,.42),vec3(.57,.66,.69),smoothstep(-.1,.7,reflected.y));
 float bands=.5+.5*sin(q.x*.08+sin(q.y*.13));vec3 deep=mix(vec3(.035,.13,.16),vec3(.075,.23,.24),bands);
 vec3 c=mix(deep,sky,fres);float glint=pow(max(dot(reflect(normalize(vec3(-.5,-1.,-.3)),n),eye),0.),110.);c+=vec3(.8,.82,.75)*glint*.4;
 float haze=1.-exp(-length(cameraPosition-vP)*.008);c=mix(c,vec3(.34,.43,.46),haze*.65);gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,side:THREE.FrontSide});
 const water=mesh(new THREE.PlaneGeometry(270,270,120,120),waterMaterial,25,-.66,23);water.rotation.x=-Math.PI/2;water.castShadow=false;water.receiveShadow=false;
 // Harbour pennants and a sparse drifting sea-mist layer.
 const pennants=[];
 for(const [x,z] of [[470,1280],[715,1460]]){cylinder(mats.darkwood,x*S,1.8,z*S,.04,.06,3.6);const geo=new THREE.PlaneGeometry(.85,1.25,8,10),flag=mesh(geo,mats.cloth,x*S+.45,2.72,z*S);pennants.push(flag);}
 const mistGeo=new THREE.BufferGeometry(),mistPositions=new Float32Array(72*3);for(let i=0;i<72;i++){mistPositions[i*3]=(random()-.5)*28;mistPositions[i*3+1]=.4+random()*4;mistPositions[i*3+2]=(random()-.5)*24;}
 mistGeo.setAttribute('position',new THREE.BufferAttribute(mistPositions,3));const motes=new THREE.Points(mistGeo,new THREE.PointsMaterial({color:'#e8dec7',size:.035,transparent:true,opacity:.35,depthWrite:false}));scene.add(motes);
 batchStatic(scene,new Set([...replacementFallbacks,boat,chest,crystal,beaconFlame,water,sky,...buildings.map(b=>b.group),...flames,...pennants,...foliage.map(f=>f.mesh)]),true);
 const warmPool=new THREE.PointLight('#ffb46c',4.5,7,2);warmPool.position.set(470*S,1.7,1280*S);scene.add(warmPool);
 const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=64;const contactCtx=contactCanvas.getContext('2d'),contactGradient=contactCtx.createRadialGradient(32,32,2,32,32,32);contactGradient.addColorStop(0,'rgba(0,0,0,.45)');contactGradient.addColorStop(1,'rgba(0,0,0,0)');contactCtx.fillStyle=contactGradient;contactCtx.fillRect(0,0,64,64);const contactMaterial=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(contactCanvas),transparent:true,depthWrite:false,opacity:.65});
 return {harbourAssets,mats,box,ball,cylinder,beam,mesh,form,batchStatic,boat,chest,crystal,shrineLight,beaconFlame,beaconLight,flames,waterMaterial,foliage,pennants,motes,buildings,grass,contactMaterial,materials};
}
