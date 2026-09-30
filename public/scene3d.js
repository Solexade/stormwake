import * as THREE from './vendor/three.module.js';
import {LAND,BRIDGES,HOME,SHRINE,BOSS,OBSTACLES,landAt} from './game.js';
import {walkable} from './world.js';
import {SAFEHOUSE,FORGE,SUPPLIES} from './catalog.js';

// Local, original geometry and procedural surfaces. Coordinates match the server.
const S=1/40,UP=new THREE.Vector3(0,1,0);
const randomFactory=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const mixAngle=(a,b,k)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;
export function createWorld(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#849a9f');scene.fog=new THREE.FogExp2('#849a9f',.020);
 const camera=new THREE.PerspectiveCamera(48,1,.08,190);const look=new THREE.Vector3(HOME.x*S,1,HOME.y*S);let first=true,mode='follow',quality='high';
 const hemi=new THREE.HemisphereLight('#c4e0ed','#454332',2.25);scene.add(hemi);
 const sun=new THREE.DirectionalLight('#ffe0b0',3.3);sun.position.set(10,23,13);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-19;sun.shadow.camera.right=19;sun.shadow.camera.top=19;sun.shadow.camera.bottom=-19;sun.shadow.camera.far=70;sun.shadow.normalBias=.035;sun.shadow.bias=-.0003;scene.add(sun,sun.target);
 const rim=new THREE.DirectionalLight('#b0dbe8',1.3);rim.position.set(-30,15,-35);scene.add(rim);
 // A softly lit studio sky supplies reflections for steel and worn brass.
 const environmentScene=new THREE.Scene();environmentScene.background=new THREE.Color('#b7c6cd');
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(20,12),new THREE.MeshBasicMaterial({color:'#fff0cf',side:THREE.DoubleSide}));panel.position.set(0,7,-10);environmentScene.add(panel);
 const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(environmentScene,.025);scene.environment=environment.texture;scene.environmentIntensity=.6;pmrem.dispose();panel.geometry.dispose();panel.material.dispose();
 const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vDir;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}void main(){vec3 d=normalize(vDir);float up=max(d.y,0.);vec3 c=mix(vec3(.52,.61,.63),vec3(.18,.31,.38),pow(up,.55));vec2 p=d.xz/(up+.22)*2.5;float cloud=noise(p)*.55+noise(p*2.1)*.27+noise(p*4.2)*.13;c=mix(c,vec3(.75,.76,.70),smoothstep(.48,.75,cloud)*smoothstep(.02,.2,up)*.75);gl_FragColor=vec4(c,1.);}`});
 const sky=new THREE.Mesh(new THREE.SphereGeometry(140,24,16),skyMaterial);sky.renderOrder=-1;scene.add(sky);
 const random=randomFactory(24681);let count=0;
 function texture(kind){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),data=g.createImageData(256,256),r=randomFactory(kind==='grass'?18:kind==='wood'?73:91);const base=kind==='grass'?[92,104,69]:kind==='wood'?[106,80,50]:kind==='leather'?[89,62,42]:[114,116,110];
   for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;let n=(r()-.5)*38;if(kind==='wood')n+=Math.sin(x*.8+Math.sin(y*.02)*2)*11;if(kind==='leather')n+=Math.sin(x*2)*Math.cos(y*2)*5;for(let k=0;k<3;k++)data.data[i+k]=base[k]+n;data.data[i+3]=255;}g.putImageData(data,0,0);
   if(kind==='stone'){g.strokeStyle='#202b2533';for(let i=0;i<25;i++){g.beginPath();g.moveTo(r()*256,r()*256);g.lineTo(r()*256,r()*256);g.stroke();}}
   const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
 }
 const grassTex=texture('grass'),stoneTex=texture('stone'),woodTex=texture('wood'),leatherTex=texture('leather');grassTex.repeat.set(.7,.7);
 const mats={
  ground:new THREE.MeshStandardMaterial({map:grassTex,bumpMap:grassTex,bumpScale:.025,roughness:1}),
  stone:new THREE.MeshStandardMaterial({map:stoneTex,bumpMap:stoneTex,bumpScale:.13,roughness:.94,color:'#aaa99e'}),
  darkstone:new THREE.MeshStandardMaterial({map:stoneTex,roughness:1,color:'#536260'}),
  wood:new THREE.MeshStandardMaterial({map:woodTex,bumpMap:woodTex,bumpScale:.045,roughness:.85}),
  darkwood:new THREE.MeshStandardMaterial({map:woodTex,color:'#68625c',roughness:.9}),
  leather:new THREE.MeshStandardMaterial({map:leatherTex,bumpMap:leatherTex,bumpScale:.025,roughness:.84}),
  metal:new THREE.MeshStandardMaterial({color:'#7e8d96',metalness:.83,roughness:.36}),
  steel:new THREE.MeshStandardMaterial({color:'#bdc9c9',metalness:.85,roughness:.25}),
  gold:new THREE.MeshStandardMaterial({color:'#ac8950',metalness:.73,roughness:.42}),
  skin:new THREE.MeshStandardMaterial({color:'#bd9477',roughness:.92}),
  beard:new THREE.MeshStandardMaterial({color:'#503a2a',roughness:1}),
  fur:new THREE.MeshStandardMaterial({color:'#807c70',roughness:1}),
  cloth:new THREE.MeshStandardMaterial({color:'#354e5b',roughness:1,side:THREE.DoubleSide}),
  pine:new THREE.MeshStandardMaterial({color:'#2e5148',roughness:1}),
  pineLight:new THREE.MeshStandardMaterial({color:'#436456',roughness:1}),
  moss:new THREE.MeshStandardMaterial({color:'#637558',roughness:1}),
  glow:new THREE.MeshStandardMaterial({color:'#b9e9df',emissive:'#7bcec6',emissiveIntensity:2,roughness:.2,metalness:.3}),
  fire:new THREE.MeshBasicMaterial({color:'#ffcf80'}),
 };
 const boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.SphereGeometry(1,14,10),rockGeo=new THREE.DodecahedronGeometry(1,1),cylinderGeo=new THREE.CylinderGeometry(1,1,1,12);
 function mesh(geo,mat,x=0,y=0,z=0,parent=scene){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);count++;return m;}
 const box=(mat,x,y,z,sx,sy,sz,parent=scene)=>{const m=mesh(boxGeo,mat,x,y,z,parent);m.scale.set(sx,sy,sz);return m;};
 const ball=(mat,x,y,z,sx,sy,sz,parent=scene)=>{const m=mesh(sphereGeo,mat,x,y,z,parent);m.scale.set(sx,sy,sz);return m;};
 function cylinder(mat,x,y,z,rt,rb,h,parent=scene,n=12){return mesh(new THREE.CylinderGeometry(rt,rb,h,n),mat,x,y,z,parent);}
 function beam(a,b,r,mat,parent=scene){const d=new THREE.Vector3().subVectors(b,a);const m=mesh(cylinderGeo,mat,0,0,0,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(r,d.length(),r);m.quaternion.setFromUnitVectors(UP,d.normalize());return m;}
 function rock(x,z,size,mat=mats.stone){const m=mesh(rockGeo,mat,x,size*.27-.15,z);m.scale.set(size,size*.74,size*.85);m.rotation.set(random()*.4,random()*7,random()*.4);return m;}
 // Solid land masses, with visible coastal cliffs rather than flat map cut-outs.
 for(const p of LAND){const sh=new THREE.Shape(p.map(([x,z])=>new THREE.Vector2(x*S,-z*S)));const g=new THREE.ExtrudeGeometry(sh,{depth:1.25,bevelEnabled:true,bevelThickness:.18,bevelSize:.17,bevelSegments:2,steps:1});g.rotateX(-Math.PI/2);const m=mesh(g,[mats.ground,mats.darkstone]);m.position.y=-1.25;}
 // Hand-laid trail stones: the same route as the authoritative game map.
 const paths=[[[465,1410],[655,1360],[750,1180],[930,1100],[1135,815],[1420,820],[1650,795],[1840,680],[1910,560]],[[930,850],[780,810],[660,710]]];
 const cobbles=[];for(const p of paths)for(let j=1;j<p.length;j++){const [a,b]=[p[j-1],p[j]],length=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d<length;d+=22){const f=d/length;for(let k=0;k<2;k++){const x=a[0]+(b[0]-a[0])*f+(random()-.5)*36,z=a[1]+(b[1]-a[1])*f+(random()-.5)*36;if(landAt(x,z))cobbles.push([x*S,z*S,.17+random()*.15]);}}}
 const dummy=new THREE.Object3D();const stones=new THREE.InstancedMesh(rockGeo,mats.stone,cobbles.length);cobbles.forEach(([x,z,r],i)=>{dummy.position.set(x,.06,z);dummy.scale.set(r,.06,r*.75);dummy.rotation.set(0,random()*6,0);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);});stones.receiveShadow=true;scene.add(stones);
 // Weathered bridges: decking, posts and sagging rope rails.
 for(const b of BRIDGES){const vertical=b.h>b.w,steps=Math.floor((vertical?b.h:b.w)/11);for(let i=0;i<steps;i++){const x=(b.x+(vertical?b.w/2:i*11+5))*S,z=(b.y+(vertical?i*11+5:b.h/2))*S;box(i%3?mats.wood:mats.darkwood,x,.18,z,(vertical?b.w:10)*S,.16,(vertical?10:b.h)*S);}
  const corners=[[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]];corners.forEach(([x,z])=>cylinder(mats.darkwood,x*S,.6,z*S,.085,.11,1.5));const rails=vertical?[[corners[0],corners[2]],[corners[1],corners[3]]]:[[corners[0],corners[1]],[corners[2],corners[3]]];for(const [a,b] of rails){const points=[];for(let i=0;i<9;i++){const f=i/8;points.push(new THREE.Vector3((a[0]+(b[0]-a[0])*f)*S,1-.22*Math.sin(Math.PI*f),(a[1]+(b[1]-a[1])*f)*S));}mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,.033,5,false),mats.leather);}}
 function cottage(x,z,scale=1,angle=0){const group=new THREE.Group();group.position.set(x*S,0,z*S);group.rotation.y=angle;group.scale.setScalar(scale);scene.add(group);box(mats.stone,0,.2,0,3,.4,2.4,group);box(mats.darkwood,0,1,0,2.7,1.8,2.1,group);
  for(let j=0;j<8;j++)box(mats.wood,0,.36+j*.21,1.08,2.8,.14,.09,group);
  for(const side of [-1,1]){const roof=box(mats.darkwood,side*.77,2.18,0,1.85,.16,2.85,group);roof.rotation.z=side*-.58;for(let j=0;j<11;j++){const tile=box(mats.wood,side*.78,2.21,(j-5)*.25,1.87,.035,.21,group);tile.rotation.z=side*-.58;}box(mats.wood,side*1.29,1,1.16,.12,2,.14,group);}
  beam(new THREE.Vector3(-1.5,1.79,1.5),new THREE.Vector3(0,2.75,1.5),.06,mats.gold,group);beam(new THREE.Vector3(0,2.75,1.5),new THREE.Vector3(1.5,1.79,1.5),.06,mats.gold,group);
  box(mats.leather,0,.67,1.15,.55,1.32,.1,group);for(const side of [-1,1]){box(mats.gold,side*.84,1.12,1.15,.43,.58,.05,group);box(mats.fire,side*.84,1.12,1.19,.31,.43,.02,group);box(mats.darkwood,side*.84,1.12,1.22,.035,.48,.04,group);}box(mats.stone,.84,2.4,-.5,.45,1.2,.5,group);
 }
 cottage(420,1240,1.05,-.15);cottage(660,1390,.95,.1);cottage(760,1580,.75,.35);
 // Harbour jetty.
 for(let i=0;i<22;i++)box(mats.wood,(315+i*10)*S,.13,1445*S,.23,.14,1.25);
 for(const x of [330,430,520])for(const z of [1423,1467])cylinder(mats.darkwood,x*S,-.18,z*S,.11,.14,1.8);
 function longboat(){const g=new THREE.Group();g.position.set(265*S,-.45,1555*S);g.rotation.y=-.22;scene.add(g);const curve=new THREE.Shape();curve.moveTo(0,-2.8);curve.bezierCurveTo(1.35,-1.9,1.2,1.8,0,2.8);curve.bezierCurveTo(-1.2,1.8,-1.35,-1.9,0,-2.8);const geo=new THREE.ExtrudeGeometry(curve,{depth:.65,bevelEnabled:true,bevelThickness:.13,bevelSize:.1,bevelSegments:2});geo.rotateX(-Math.PI/2);mesh(geo,mats.darkwood,0,0,0,g);for(let i=0;i<8;i++)box(mats.wood,0,.73,(i-3.5)*.48,1.6,.12,.16,g);cylinder(mats.wood,0,2.4,0,.07,.1,4.3,g);box(mats.wood,0,3.9,0,3.1,.1,.1,g);
  const sailgeo=new THREE.PlaneGeometry(2.8,2.8,14,14);const a=sailgeo.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i);a.setZ(i,Math.sin((x/2.8+.5)*Math.PI)*.4+Math.sin(y*1.8)*.08);}sailgeo.computeVertexNormals();const sailmat=new THREE.MeshStandardMaterial({color:'#c9baa0',roughness:1,side:THREE.DoubleSide});const sail=mesh(sailgeo,sailmat,0,2.5,.1,g);for(const x of [-.7,.7]){const stripe=box(mats.cloth,x,2.5,.47,.25,2.7,.02,g);stripe.castShadow=false;}beam(new THREE.Vector3(0,4.3,0),new THREE.Vector3(0,.8,2.4),.024,mats.leather,g);beam(new THREE.Vector3(0,4.3,0),new THREE.Vector3(0,.8,-2.4),.024,mats.leather,g);return g;
 }
 const boat=longboat();
 // Spruce silhouettes are layered, irregular and shaded with real lighting.
 for(let i=0;i<120;i++){const x=250+random()*1990,z=300+random()*1330;if(!landAt(x-35,z)||!landAt(x+35,z)||!landAt(x,z-40))continue;if([HOME,SHRINE,BOSS,{x:580,y:720}].some(p=>Math.hypot(p.x-x,p.y-z)<190))continue;if(z>1120&&x<870)continue;if(paths.some(p=>p.some(([a,b])=>Math.hypot(a-x,b-z)<95)))continue;if(x>1600&&z<890)continue;const h=2.5+random()*2.5;cylinder(mats.darkwood,x*S,h*.43,z*S,.07,.14,h*.86,scene,7);for(let j=0;j<4;j++){const c=mesh(new THREE.ConeGeometry(h*(.24-j*.035),h*.48,9),j%2?mats.pine:mats.pineLight,x*S,h*(.35+j*.18),z*S);c.rotation.y=random()*6;}}
 OBSTACLES.forEach(o=>rock(o.x*S,o.y*S,o.r*S));
 // Coastal boulders and distant mountain silhouettes.
 for(const p of LAND)for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],d=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let j=0;j<d;j+=45){const f=j/d;const x=(a[0]+(b[0]-a[0])*f)*S,z=(a[1]+(b[1]-a[1])*f)*S;rock(x,z,.25+random()*.45,mats.darkstone);}}
 const mountains=new THREE.MeshStandardMaterial({color:'#5b777b',roughness:1});for(let i=0;i<14;i++){const m=mesh(new THREE.ConeGeometry(4+random()*8,6+random()*10,6),mountains,-35+i*10,-1,-34-random()*12);m.rotation.y=random()*6;}
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
 const waterMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`uniform float time; varying vec3 vP; varying vec3 vN; void main(){vec3 p=position;float w=sin(p.x*.65+time*.7)*.10+sin(p.y*.95-time*.8)*.075+sin((p.x+p.y)*1.8+time)*.025;p.z+=w;vec4 world=modelMatrix*vec4(p,1.);vP=world.xyz;vN=normalize(vec3(-cos(p.x*.65+time*.7)*.065,1.,-cos(p.y*.95-time*.8)*.071));gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`uniform float time; varying vec3 vP; varying vec3 vN; void main(){vec3 eye=normalize(cameraPosition-vP);float fres=pow(1.-max(dot(eye,normalize(vN)),0.),3.);float streak=pow(max(dot(reflect(normalize(vec3(-.5,-1.,-.3)),normalize(vN)),eye),0.),80.);vec3 c=mix(vec3(.055,.20,.23),vec3(.38,.53,.55),fres*.75)+vec3(.75,.62,.39)*streak*.7;float foam=sin(vP.x*4.+time)*sin(vP.z*3.-time*.5);c+=max(foam-.87,0.)*.16;gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,side:THREE.DoubleSide});
 const water=mesh(new THREE.PlaneGeometry(270,270,120,120),waterMaterial,25,-.66,23);water.rotation.x=-Math.PI/2;water.castShadow=false;water.receiveShadow=false;
 // Reusable articulated adventurer. Individual joints are animated from server state.
 function warrior(type){
  const root=new THREE.Group(),rig=new THREE.Group();root.add(rig);scene.add(root);const enemy=type!=='player',boss=type==='boss',archer=type==='archer';
  const skin=enemy?new THREE.MeshStandardMaterial({color:boss?'#7b8d88':'#929488',roughness:1}):mats.skin;
  const cloth=enemy?new THREE.MeshStandardMaterial({color:boss?'#293f42':archer?'#4a4e38':'#454b49',roughness:1,side:THREE.DoubleSide}):mats.cloth;
  const scale=boss?1.85:type==='brute'?1.3:1;rig.scale.setScalar(scale);
  // Hips and fitted leather tunic, a tapered anatomical torso.
  ball(mats.leather,0,.98,0,.25,.24,.17,rig);const torso=mesh(new THREE.LatheGeometry([new THREE.Vector2(.22,0),new THREE.Vector2(.25,.18),new THREE.Vector2(.31,.41),new THREE.Vector2(.28,.52)],18),mats.leather,0,1.01,0,rig);torso.scale.z=.65;
  ball(mats.metal,0,1.36,.025,.29,.23,.16,rig);box(mats.leather,0,1.08,.01,.55,.11,.38,rig);box(mats.gold,0,1.08,-.2,.12,.1,.04,rig);
  // Cross-body strap and engraved belt rivets.
  const strap=box(mats.leather,0,1.37,-.153,.08,.57,.045,rig);strap.rotation.z=-.48;for(let i=0;i<5;i++)ball(mats.gold,(i-2)*.085,1.085,-.197,.017,.017,.013,rig);
  const legs=[];for(const side of [-1,1]){const hip=new THREE.Group();hip.position.set(side*.13,.95,0);rig.add(hip);ball(cloth,0,-.2,0,.115,.26,.13,hip);const knee=new THREE.Group();knee.position.y=-.44;hip.add(knee);ball(mats.leather,0,-.17,0,.095,.2,.105,knee);box(mats.metal,0,.015,-.087,.14,.15,.06,knee);const ankle=new THREE.Group();ankle.position.y=-.41;knee.add(ankle);ball(mats.leather,0,0,-.055,.11,.085,.18,ankle);for(let j=0;j<2;j++)box(mats.gold,0,-.13-j*.13,-.107,.13,.025,.025,knee);legs.push({hip,knee,ankle});}
  const arms=[];for(const side of [-1,1]){const shoulder=new THREE.Group();shoulder.position.set(side*.31,1.47,0);rig.add(shoulder);ball(mats.leather,0,-.035,0,.14,.14,.155,shoulder);ball(mats.metal,side*.045,.01,-.015,.135,.065,.16,shoulder);ball(skin,0,-.22,0,.084,.19,.092,shoulder);const elbow=new THREE.Group();elbow.position.y=-.39;shoulder.add(elbow);ball(mats.leather,0,-.13,0,.083,.17,.092,elbow);box(mats.metal,0,-.14,-.081,.12,.23,.045,elbow);ball(skin,0,-.31,0,.071,.093,.065,elbow);arms.push({shoulder,elbow});}
  // Sculpted head: nose, ears, brows, cheekbones, hair and layered beard.
  const head=new THREE.Group();head.position.y=1.7;rig.add(head);cylinder(skin,0,-.11,0,.085,.1,.16,head);
  ball(skin,0,.06,-.015,.145,.19,.145,head);ball(skin,0,.045,-.155,.031,.055,.051,head);for(const side of [-1,1]){ball(skin,side*.146,.04,.005,.034,.055,.024,head);ball(skin,side*.085,-.003,-.111,.052,.042,.028,head);box(mats.beard,side*.065,.104,-.132,.092,.027,.025,head);ball(mats.darkstone,side*.06,.077,-.147,.022,.012,.009,head);}
  ball(mats.beard,0,.16,.038,.149,.13,.126,head);box(mats.beard,0,.208,-.016,.07,.065,.22,head);ball(mats.beard,0,-.065,-.085,.113,.115,.085,head);for(let i=0;i<13;i++){const bx=(i-6)*.015;const beard=mesh(new THREE.ConeGeometry(.014,.17+(.10-Math.abs(bx)),6),mats.beard,bx,-.16,-.126+Math.abs(bx)*.2,head);beard.rotation.z=Math.PI;}
  for(let i=0;i<5;i++){const braid=ball(mats.beard,0,-.09-i*.065,.145,.055-i*.004,.044,.043,head);}
  cylinder(mats.gold,0,-.23,-.12,.035,.035,.035,head,10);
  if(enemy){const helmet=mesh(new THREE.SphereGeometry(.158,14,8,0,Math.PI*2,0,Math.PI/2),mats.metal,0,.10,0,head);box(mats.metal,0,.071,-.155,.035,.20,.045,head);}
  // Fur collar, deliberately irregular instead of a flat cartoon cape.
  const tuftCount=enemy?60:180;const tufts=new THREE.InstancedMesh(new THREE.ConeGeometry(.025,.13,5),mats.fur,tuftCount);const tuftTransform=new THREE.Object3D(),furRandom=randomFactory(911);
  for(let i=0;i<tuftCount;i++){const a=furRandom()*Math.PI*2,r=.20+furRandom()*.16;tuftTransform.position.set(Math.sin(a)*r,1.5+furRandom()*.04,Math.cos(a)*r*.70);tuftTransform.rotation.set(Math.cos(a)*.8,0,-Math.sin(a)*.8);tuftTransform.scale.setScalar(.65+furRandom()*.65);tuftTransform.updateMatrix();tufts.setMatrixAt(i,tuftTransform.matrix);}tufts.castShadow=true;rig.add(tufts);
  const capeGeo=new THREE.PlaneGeometry(.58,.81,7,10);const pos=capeGeo.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);pos.setZ(i,.08+Math.sin(x*25)*.02+( .4-y)*.1);}capeGeo.computeVertexNormals();const cape=mesh(capeGeo,cloth,0,1.03,.21,rig);cape.rotation.y=Math.PI;
  // Axe and round shield are carried by animated joints.
  const weapon=new THREE.Group();weapon.position.set(0,-.3,0);weapon.rotation.x=-.15;arms[1].elbow.add(weapon);cylinder(mats.wood,0,.23,0,.024,.027,1.0,weapon);
  const axeShape=new THREE.Shape();axeShape.moveTo(.025,.45);axeShape.lineTo(.25,.60);axeShape.quadraticCurveTo(.39,.33,.24,.17);axeShape.lineTo(.025,.28);axeShape.closePath();const axe=mesh(new THREE.ExtrudeGeometry(axeShape,{depth:.045,bevelEnabled:true,bevelThickness:.015,bevelSize:.008,bevelSegments:1}),mats.steel,0,0,-.023,weapon);box(mats.gold,0,.35,0,.08,.13,.075,weapon);
  const axeParts=[...weapon.children];const sword=new THREE.Group();weapon.add(sword);box(mats.steel,0,.38,0,.075,.95,.04,sword);box(mats.gold,0,-.04,0,.33,.06,.08,sword);cylinder(mats.leather,0,-.18,0,.035,.035,.25,sword);const spear=new THREE.Group();weapon.add(spear);cylinder(mats.wood,0,.35,0,.025,.025,1.9,spear);mesh(new THREE.ConeGeometry(.09,.36,4),mats.steel,0,1.46,0,spear);sword.visible=spear.visible=false;
  const shield=new THREE.Group();shield.position.set(-.10,-.15,-.04);arms[0].elbow.add(shield);const shieldFace=cylinder(mats.wood,0,0,0,.33,.33,.08,shield,24);shieldFace.rotation.x=Math.PI/2;const edge=mesh(new THREE.TorusGeometry(.33,.026,7,32),mats.metal,0,0,-.05,shield);ball(mats.metal,0,0,-.074,.08,.08,.04,shield);for(let i=0;i<12;i++){const a=i*Math.PI/6;ball(mats.gold,Math.sin(a)*.27,Math.cos(a)*.27,-.048,.013,.013,.016,shield);}
  if(archer){weapon.visible=false;const bow=mesh(new THREE.TorusGeometry(.35,.021,5,20,Math.PI),mats.wood,0,-.1,0,arms[1].elbow);bow.rotation.z=-Math.PI/2;}
  if(boss){weapon.scale.set(1.7,1.4,1.7);shield.visible=false;for(const side of [-1,1]){beam(new THREE.Vector3(side*.12,1.97,0),new THREE.Vector3(side*.26,2.25,.015),.035,mats.gold,rig);}}
  // Health bar floats only above injured enemies.
  const health=new THREE.Group();health.position.y=2.35*scale;root.add(health);const bg=box(new THREE.MeshBasicMaterial({color:'#172428'}),0,0,0,.65,.05,.035,health);const fill=box(new THREE.MeshBasicMaterial({color:'#d7ac75'}),0,0,-.025,.62,.035,.012,health);health.visible=false;
  return {root,rig,legs,arms,head,cape,weapon,axeParts,sword,spear,shield,health,fill,scale,lastX:0,lastZ:0,stride:0,speed:0,type};
 }
 let orbit=0;
 const player=warrior('player');const actors=new Map();let actorRun='';
 const merchants=[{place:FORGE,title:'ASTRID · FORGE',actor:warrior('player')},{place:SUPPLIES,title:'EDDA · SUPPLIES',actor:warrior('player')}];
 for(const npc of merchants){npc.actor.weapon.visible=false;npc.actor.shield.visible=false;}
 const anvilGroup=new THREE.Group();anvilGroup.position.set((FORGE.x+33)*S,0,FORGE.y*S);scene.add(anvilGroup);cylinder(mats.darkwood,0,.30,0,.28,.35,.6,anvilGroup);box(mats.metal,0,.68,0,.82,.19,.38,anvilGroup);box(mats.metal,0,.51,0,.30,.2,.24,anvilGroup);const horn=mesh(new THREE.ConeGeometry(.13,.36,8),mats.steel,.55,.7,0,anvilGroup);horn.rotation.z=-Math.PI/2;
 box(mats.wood,(SUPPLIES.x+33)*S,.37,SUPPLIES.y*S,.7,.74,.7);for(let i=0;i<3;i++)cylinder(mats.glow,(SUPPLIES.x+23+i*10)*S,.89,SUPPLIES.y*S,.04,.065,.28);
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
 const raycaster=new THREE.Raycaster(),ground=new THREE.Plane(UP,0),intersection=new THREE.Vector3();
 function aimAt(mouse,p){raycaster.setFromCamera(new THREE.Vector2(mouse.x/w*2-1,-mouse.y/h*2+1),camera);if(raycaster.ray.intersectPlane(ground,intersection))return Math.atan2(intersection.z-p.y*S,intersection.x-p.x*S);return p.angle;}
 function animateActor(a,s,dt,t){if(a.type==='player'){const equipped=s.weapon||'axe';a.axeParts.forEach(part=>part.visible=equipped==='axe');a.sword.visible=equipped==='sword';a.spear.visible=equipped==='spear';}
  const rolling=s.action==='roll',dead=s.hp<=0;
  // Bounded visual extrapolation fills gaps between authoritative snapshots.
  if(a.sample!==s){a.sample=s;a.sampleAt=t;}
  const horizon=Math.min(.22,Math.max(0,t-a.sampleAt)+.035);
  let px=s.x,py=s.y;
  for(let elapsed=0;elapsed<horizon;elapsed+=.02){const step=Math.min(.02,horizon-elapsed),dx=(s.vx||0)*step,dy=(s.vy||0)*step;if(walkable(px+dx,py,16))px+=dx;if(walkable(px,py+dy,16))py+=dy;}
  const tx=px*S,tz=py*S,oldX=a.root.position.x,oldZ=a.root.position.z;
  if(Math.hypot(tx-oldX,tz-oldZ)>12||first)a.root.position.set(tx,.14,tz);else{a.root.position.x+=(tx-oldX)*Math.min(1,dt*23);a.root.position.z+=(tz-oldZ)*Math.min(1,dt*23);a.root.position.y=.14;}
  const travel=Math.min(.4,Math.hypot(a.root.position.x-oldX,a.root.position.z-oldZ));
  const measured=Math.hypot(s.vx||0,s.vy||0)*S;a.speed+=(measured-a.speed)*Math.min(1,dt*12);
  const walking=a.speed>.18&&!rolling&&!dead;const strideLength=s.sprinting?3.4:2.6;
  if(walking)a.stride+=travel/(strideLength*a.scale)*Math.PI*2;
  const bearing=rolling?s.dashAngle:s.angle,rotation=-bearing-Math.PI/2;
  const turn=Math.atan2(Math.sin(rotation-a.root.rotation.y),Math.cos(rotation-a.root.rotation.y));
  a.turnLean=(a.turnLean||0)+(Math.max(-.20,Math.min(.20,turn*.22))-(a.turnLean||0))*(1-Math.exp(-dt*10));
  a.root.rotation.y=mixAngle(a.root.rotation.y,rotation,1-Math.exp(-dt*19));
  const relative=(s.moveAngle??s.angle)-s.angle,forward=Math.cos(relative),side=Math.sin(relative);
  const gaitAmplitude=walking?Math.min(1,a.speed/3):0;
  a.rig.position.y=walking?Math.cos(a.stride*2)*(s.sprinting?.045:.025)*gaitAmplitude:Math.sin(t*1.7)*.006;
  a.rig.rotation.set(walking?(s.sprinting?.19:.085)*forward:0,walking?Math.sin(a.stride)*.065*gaitAmplitude:0,walking?-.05*side+a.turnLean:0);
  a.rig.scale.setScalar(a.scale);
  a.legs.forEach((leg,i)=>{
   const phase=a.stride+i*Math.PI,wave=Math.sin(phase),lift=Math.max(0,wave)*(s.sprinting?.22:.16)*gaitAmplitude;
   const targetZ=Math.cos(phase)*(s.sprinting?.42:.32)*gaitAmplitude*forward,targetX=Math.cos(phase)*.16*gaitAmplitude*side;
   const down=.83-lift,L1=.44,L2=.41,d=Math.min(.849,Math.max(.45,Math.hypot(targetZ,down)));
   const hip=Math.atan2(-targetZ,down)+Math.acos(Math.max(-1,Math.min(1,(L1*L1+d*d-L2*L2)/(2*L1*d))));
   const knee=-(Math.PI-Math.acos(Math.max(-1,Math.min(1,(L1*L1+L2*L2-d*d)/(2*L1*L2)))));
   leg.hip.rotation.set(hip,0,-Math.atan2(targetX,down));leg.knee.rotation.x=knee;
   leg.ankle.rotation.x=-hip-knee+Math.max(0,-wave)*.10*gaitAmplitude;
  });
  a.arms.forEach((arm,i)=>{arm.shoulder.rotation.set(.18+(walking?Math.sin(a.stride+(1-i)*Math.PI)*(s.sprinting?.55:.36)*forward:0),0,i?-.12:.12);arm.elbow.rotation.x=s.sprinting?.9:.35;});
  const attack=s.action,phase=s.actionDuration?Math.min(1,s.actionTime/s.actionDuration):0;
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
  a.cape.rotation.x=Math.sin(t*4)*.025+(walking?.10+a.speed*.018:0);a.head.rotation.z=Math.sin(t*.7)*.015;
  a.root.visible=!dead||(s.death||0)>0;
  if(dead){a.rig.rotation.z=Math.min(1,(1.4-s.death)*2)*1.48;a.rig.rotation.x=.15;}
  a.health.visible=a.type!=='player'&&s.hp>0&&s.hp<s.maxHp;a.health.quaternion.copy(camera.quaternion);a.fill.scale.x=Math.max(.001,s.hp/s.maxHp||1);a.fill.position.x=-(1-a.fill.scale.x)*.31;
 }
 function minimap(run){const mw=106,mh=79,x=w-mw-17,y=h-mh-80;if(w<600)return;hud.fillStyle='#0a1829bb';hud.fillRect(x,y,mw,mh);hud.strokeStyle='#97b1b244';hud.strokeRect(x,y,mw,mh);hud.save();hud.translate(x,y);hud.scale(mw/2500,mh/1850);hud.fillStyle='#96ada27a';for(const p of LAND){hud.beginPath();p.forEach(([x,z],i)=>i?hud.lineTo(x,z):hud.moveTo(x,z));hud.closePath();hud.fill();}hud.fillStyle='#f4cc8a';hud.beginPath();hud.arc(run.player.x,run.player.y,50,0,7);hud.fill();hud.restore();}
 function draw(t,dt,run,playing,community,options={}){
  for(const npc of merchants)animateActor(npc.actor,{x:npc.place.x+20,y:npc.place.y,angle:Math.PI/2,hp:1,maxHp:1,vx:0,vy:0},dt,t);
  waterMaterial.uniforms.time.value=t;boat.rotation.z=Math.sin(t*.7)*.015;boat.position.y=-.45+Math.sin(t*.6)*.045;
  crystal.rotation.y=t*.5;crystal.position.y=1.2+Math.sin(t*1.8)*.10;crystal.visible=!playing||!run?.relic;shrineLight.intensity=crystal.visible?4:0;chest.visible=!playing||!run?.chest;
  beaconFlame.visible=community.salvage>=community.target;beaconLight.intensity=beaconFlame.visible?14:0;beaconFlame.scale.y=1.5+Math.sin(t*8)*.2;flames.forEach((f,i)=>f.scale.setScalar(1+Math.sin(t*9+i)*.13));
  const p=playing&&run?run.player:{...HOME,angle:1.05,hp:120,maxHp:120};animateActor(player,p,dt,t);
  if(run&&run.id!==actorRun){actorRun=run.id;for(const e of [...run.enemies,run.boss]){if(!actors.has(e.id))actors.set(e.id,warrior(e.type));actors.get(e.id).root.position.set(e.x*S,0,e.y*S);}}
  for(const a of actors.values())a.root.visible=playing;
  if(playing&&run)for(const e of [...run.enemies,run.boss])animateActor(actors.get(e.id),e,dt,t);
  const px=player.root.position.x,pz=player.root.position.z;
  const target=new THREE.Vector3(),desired=new THREE.Vector3();
  if(playing){target.set(px,.85,pz-.65);desired.set(px+Math.sin(orbit)*(mode==='tactical'?12:9),mode==='tactical'?14.5:7.4,pz+Math.cos(orbit)*(mode==='tactical'?12:9));camera.fov=48;}else{target.set(px-1.4,1.12,pz-.15);desired.set(px+2.4,3.1,pz+5.4);camera.fov=w<600?54:47;}
  if(first){camera.position.copy(desired);look.copy(target);}else{camera.position.lerp(desired,Math.min(1,dt*4));look.lerp(target,Math.min(1,dt*5));}camera.lookAt(look);camera.updateProjectionMatrix();
  sky.position.copy(camera.position);
  sun.position.set(px-8,22,pz+10);sun.target.position.set(px,0,pz-5);
  raven.position.set(px+Math.cos(t*.75)*1.15,2.5+Math.sin(t*1.3)*.13,pz-.45+Math.sin(t*.75)*.6);raven.rotation.y=-t*.75;wings.forEach((p,i)=>p.rotation.z=Math.sin(t*11)*.45*(i?1:-1));
  tells.forEach(m=>m.visible=false);arrows.forEach(a=>a.visible=false);stormRing.visible=false;trail.visible=false;targetRune.visible=playing;
  if(playing&&run){let j=0;for(const e of run.enemies){if(e.hp>0&&e.wind>0&&e.type!=='archer'&&j<tells.length){const m=tells[j++];m.visible=true;m.position.set(e.x*S,.24,e.y*S);m.scale.setScalar((e.type==='brute'?120:76)*S);m.material.opacity=.22+Math.sin(t*12)*.08;}}
   const b=run.boss;if(b.hp>0&&b.wind>0){const m=tells[11];m.visible=true;m.position.set(b.targetX*S,.26,b.targetY*S);m.scale.setScalar(b.radius*S);m.material.opacity=.45;}
   for(const f of run.effects){if(f.type==='storm'||f.type==='slam'){stormRing.visible=true;stormRing.position.set(f.x*S,.3,f.y*S);stormRing.scale.setScalar(Math.max(.05,(f.type==='storm'?225:f.radius)*S*(1-f.life/f.maxLife)));}}
   if(p.slash>0){trail.visible=true;trail.position.set(px,1.10,pz);trail.rotation.z=-p.angle;trail.scale.setScalar(p.action==='finisher'?1.7:p.action==='heavy'?1.3:1);}
   run.shots.slice(0,arrows.length).forEach((shot,i)=>{const a=arrows[i];a.visible=true;a.position.set(shot.x*S,1,shot.y*S);a.quaternion.setFromUnitVectors(UP,new THREE.Vector3(shot.vx,0,shot.vy).normalize());});
   const goal=run.bossDead?HOME:run.relic?BOSS:SHRINE;targetRune.position.set(goal.x*S,.28,goal.y*S);targetRune.scale.setScalar(1+Math.sin(t*2)*.06);
  }
  renderer.render(scene,camera);hud.clearRect(0,0,w,h);
  if(playing&&run){minimap(run);const cd=run.player.storm;hud.fillStyle='#102532c9';hud.fillRect(w-112,86,92,29);hud.fillStyle=cd>0?'#a8bac0':'#f2d59c';hud.font='10px Segoe UI';hud.textAlign='center';hud.fillText(cd>0?`ϟ STORM ${cd.toFixed(1)}s`:'ϟ Q · STORM READY',w-66,105);
   for(const effect of run.effects){if(effect.type==='blood'&&options.bloodFX!==false){const v=new THREE.Vector3(effect.x*S,.025,effect.y*S).project(camera);if(v.z<1){hud.fillStyle='rgba(100,15,20,'+Math.min(.55,effect.life*.4)+')';hud.beginPath();hud.ellipse((v.x+1)*w/2,(1-v.y)*h/2,12,4,-.2,0,Math.PI*2);hud.fill();}}if(effect.type==='hit'&&options.bloodFX!==false){const age=1-effect.life/effect.maxLife;for(let i=0;i<9;i++){const a=i*2.4+effect.x,spread=age*(.5+(i%3)*.22);const v=new THREE.Vector3(effect.x*S+Math.cos(a)*spread,Math.max(.05,1+age*.9-age*age*2.3),effect.y*S+Math.sin(a)*spread).project(camera);if(v.z<1){hud.fillStyle='rgba(155,24,29,'+(1-age*.8)+')';hud.beginPath();hud.ellipse((v.x+1)*w/2,(1-v.y)*h/2,2+(i%3),1.5+(i%2),a,0,Math.PI*2);hud.fill();}}}if(effect.type==='hit'){const v=new THREE.Vector3(effect.x*S,2+(1-effect.life/effect.maxLife)*.7,effect.y*S).project(camera);hud.fillStyle='#ffe0a4';hud.font='bold 16px Segoe UI';hud.fillText(effect.amount,(v.x+1)*w/2,(1-v.y)*h/2);}if(effect.type==='finisher'||effect.type==='parry'){const v=new THREE.Vector3(effect.x*S,1,effect.y*S).project(camera);hud.strokeStyle=effect.type==='parry'?'#b8edff':'#ffd590';hud.lineWidth=3;hud.beginPath();hud.arc((v.x+1)*w/2,(1-v.y)*h/2,30*(1-effect.life/effect.maxLife),0,Math.PI*2);hud.stroke();}if(effect.type==='hurt'){hud.fillStyle=`rgba(150,43,23,${effect.life*.22})`;hud.fillRect(0,0,w,h);}}
   const goal=run.bossDead?HOME:run.relic?BOSS:SHRINE;if(Math.hypot(goal.x-p.x,goal.y-p.y)>190){const v=new THREE.Vector3(goal.x*S,.5,goal.y*S).project(camera);const sx=(v.x+1)*w/2,sy=(1-v.y)*h/2,tx=Math.max(32,Math.min(w-32,sx)),ty=Math.max(180,Math.min(h-115,sy));hud.fillStyle='#f3d398';hud.font='18px Georgia';hud.fillText('◇',tx,ty);hud.font='8px Segoe UI';hud.fillText(run.bossDead?'HARBOUR':run.relic?'WARDEN':'SHRINE',tx,ty+17);}
  }
  if(playing&&run){for(const spot of [{place:SAFEHOUSE,title:'E · HEARTHHALL'},...merchants]){if(Math.hypot(spot.place.x-p.x,spot.place.y-p.y)>420)continue;const v=new THREE.Vector3(spot.place.x*S,2.7,spot.place.y*S).project(camera);if(v.z<1&&Math.abs(v.x)<.94&&Math.abs(v.y)<.85){hud.font='bold 9px Segoe UI';hud.textAlign='center';hud.fillStyle='#fae0a6';hud.fillText(spot.title,(v.x+1)*w/2,(1-v.y)*h/2);}}if(options.lockedTarget!==null&&options.lockedTarget!==undefined){const locked=[...run.enemies,run.boss].find(e=>e.id===options.lockedTarget&&e.hp>0);if(locked){const v=new THREE.Vector3(locked.x*S,2.6,locked.y*S).project(camera);hud.fillStyle='#ffe3a4';hud.font='21px Georgia';hud.fillText('◇',(v.x+1)*w/2,(1-v.y)*h/2);}}}
  first=false;
 }
 return {draw,aimAt,setOrbit(value){orbit=value;},setMode(value){mode=value;},setQuality(value){quality=value;renderer.setPixelRatio(value==='low'?1:Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=value!=='low';grass.visible=value!=='low';resize();},getInfo(){return {engine:'Three.js',revision:THREE.REVISION,quality,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}};
}
