import * as THREE from '../vendor/three.module.js';
import {CACHES,CAMPS,FERRIES,REGIONS,EASTERN_LANDMARKS} from '../voyage-data.js';
import {LAND,landAt,walkable} from '../world.js';
const S=1/40;
// Original scenery assembled from existing meshes/materials. No external downloads.
export function createVoyageScenery(scene,kit){
 const {mats,box,ball,cylinder,mesh,batchStatic,boat,foliage,sceneryVisibility}=kit;
 createEasternScenery(scene,kit);
 const caches=CACHES.map(c=>{
  const group=new THREE.Group();group.position.set(c.x*S,0,c.y*S);scene.add(group);
  const armory=c.kind==='armory';
  box(armory?mats.metal:mats.darkwood,0,.28,0,.85,.56,.60,group);
  for(const x of [-.30,.30])box(mats.metal,x,.29,0,.07,.6,.64,group);
  const lid=box(armory?mats.steel:mats.wood,0,.59,0,.90,.10,.65,group);
  const seal=ball(armory?mats.glow:c.kind==='health'?mats.fire:c.kind==='weapon'?mats.gold:mats.glow,0,.38,.32,.09,.09,.03,group);
  return {c,group,lid,seal};
 });
 const ferries=FERRIES.map(f=>{
  let edge=null;for(const poly of LAND)for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),u=Math.max(0,Math.min(1,((f.x-a[0])*dx+(f.y-a[1])*dy)/(len*len))),x=a[0]+u*dx,y=a[1]+u*dy,d=Math.hypot(x-f.x,y-f.y);if(!edge||d<edge.d)edge={x,y,dx,dy,len,d};}
  let nx=edge.dy/edge.len,ny=-edge.dx/edge.len;if(landAt(edge.x+nx*20,edge.y+ny*20)){nx=-nx;ny=-ny;}
  const ship=boat.clone(true);ship.position.set((edge.x+nx*85)*S,-.45,(edge.y+ny*85)*S);ship.rotation.y=Math.atan2(edge.dx,edge.dy);scene.add(ship);
  const end={x:edge.x+nx*55,y:edge.y+ny*55},length=Math.hypot(end.x-f.x,end.y-f.y),steps=Math.ceil(length/10);
  for(let i=0;i<=steps;i++){const t=i/steps,x=f.x+(end.x-f.x)*t,y=f.y+(end.y-f.y)*t;const plank=box(mats.wood,x*S,.12,y*S,.24,.16,1.1);plank.rotation.y=-Math.atan2(end.y-f.y,end.x-f.x);if(i%5===0)for(const side of [-1,1])cylinder(mats.darkwood,x*S-ny*side*.45,.2,y*S+nx*side*.45,.08,.11,1.3);}
  return ship;
 });
 const camps=CAMPS.map(c=>{const group=new THREE.Group();group.position.set(c.x*S,0,c.y*S);scene.add(group);
  for(let i=0;i<10;i++){const a=i*Math.PI/5;ball(mats.stone,Math.cos(a)*.45,.12,Math.sin(a)*.45,.16,.12,.14,group);}
  const flame=mesh(new THREE.ConeGeometry(.21,.7,7),mats.fire,0,.4,0,group);
  box(mats.wood,1.4,.7,0,1.3,.12,.65,group);for(const x of [.9,1.9])box(mats.darkwood,x,.35,0,.10,.7,.5,group);
  return flame;
 });
 // Ruins mark the older settlements.
 for(const r of REGIONS.slice(1)){const g=new THREE.Group();g.position.set(r.shrine.x*S,0,r.shrine.y*S);scene.add(g);cylinder(mats.stone,0,.12,0,1.1,1.2,.24,g);for(const x of [-1,1]){box(mats.stone,x,1,0,.3,2,.35,g);}box(mats.stone,0,2,0,2.4,.3,.4,g);batchStatic(g);sceneryVisibility.add(g);}
 // Mid-distance silhouettes frame the river approaches.
 const source=foliage.find(f=>f.mesh.children.length>0)?.mesh;
 if(source){for(let region=1;region<3;region++)for(let i=0;i<20;i++){
  const r=REGIONS[region],x=r.home.x-140+(i*157%850),y=450+(i*233%1550);
  if(!walkable(x,y,80)||[r.home,r.shrine,r.boss,...CACHES,...CAMPS,...FERRIES].some(p=>Math.hypot(p.x-x,p.y-y)<140))continue;
  const tree=source.clone(true);tree.position.set(x*S,0,y*S);tree.scale.setScalar(.8+(i%4)*.12);scene.add(tree);sceneryVisibility.add(tree);
 }}
 return {update(run,t){for(const {c,group,lid,seal} of caches){const open=run?.openedCaches?.includes(c.id);group.visible=!run||Math.hypot(c.x-run.player.x,c.y-run.player.y)<1500;lid.rotation.x=open?-.9:0;seal.visible=!open;}ferries.forEach((b,i)=>{b.position.y=-.45+Math.sin(t*.7+i)*.035;b.rotation.z=Math.sin(t*.6+i)*.012;});camps.forEach((f,i)=>f.scale.y=1+Math.sin(t*7+i)*.12);}};
}

function createEasternScenery(scene,{mats,box,cylinder,mesh,batchStatic,sceneryVisibility,harbourAssets,boat}){
 const {gate,beacon}=EASTERN_LANDMARKS;
 const arch=new THREE.Group();
 arch.position.set(gate.x*S,0,gate.y*S);
 scene.add(arch);
 const radius=gate.pillarOffset*S;
 for(const side of [-1,1]){
  const x=side*radius;
  box(mats.darkstone,x,.16,0,1.15,.32,1.18,arch);
  for(let i=0;i<5;i++){
   const block=box(i%2?mats.stone:mats.darkstone,x,.51+i*.39,0,.79-i*.042,.397,.90,arch);
   block.rotation.y=Math.sin(1.7*i+side)*.075;
  }
  box(mats.stone,x,2.30,0,.79,.27,.90,arch);
 }
 for(let i=0;i<=8;i++){
  const a=i*Math.PI/8;
  const block=box(i%3?mats.stone:mats.darkstone,Math.cos(a)*radius,2.48+Math.sin(a)*radius,0,.55,.69,.86,arch);
  block.rotation.z=a-Math.PI/2;
 }
 batchStatic(arch);sceneryVisibility.add(arch);
 const tower=new THREE.Group();
 tower.position.set(beacon.x*S,0,beacon.y*S);
 scene.add(tower);
 cylinder(mats.darkstone,0,.27,0,.76,.92,.54,tower,12);
 for(let i=0;i<12;i++){
  const y=.72+i*.35;
  const r=.77-i*.026;
  cylinder(i%3?mats.stone:mats.darkstone,0,y,0,r,r+.026,.36,tower,12);
 }
 cylinder(mats.darkwood,0,4.58,0,.81,.57,.38,tower,12);
 for(const x of [-.48,.48])for(const z of [-.48,.48])box(mats.darkwood,x,5.10,z,.11,1.14,.11,tower);
 mesh(new THREE.SphereGeometry(.22,12,8),mats.fire,0,5.04,0,tower);
 mesh(new THREE.ConeGeometry(.98,.72,4),mats.darkwood,0,5.93,0,tower).rotation.y=Math.PI/4;
 batchStatic(tower);sceneryVisibility.add(tower);
 const skiff=boat.clone(true);
 skiff.position.set(6690*S,-.47,2250*S);skiff.scale.setScalar(.73);skiff.rotation.y=.18;
 scene.add(skiff);
 for(const [x,z,height,radius,id] of [
  [5580,539,3.7,2.45,'coastal_cliff_02_lod.glb'],[5765,490,4.2,3.2,'coastal_cliff_02_lod.glb'],
  [6115,336,3.9,2.8,'coastal_cliff_02_lod.glb'],[6610,539,5.7,3.5,'coastal_cliff_02_lod.glb'],
  [6860,858,4.5,3.8,'coastal_cliff_02_lod.glb'],[6695,2250,1.2,2.1,'mossy_rocks.glb'],
  [5950,900,.65,1.1,'fern_grove.glb'],[6080,750,.78,1.15,'fern_grove.glb'],
  [6351,630,.72,1.1,'fern_grove.glb'],[6140,2580,.73,1.16,'fern_grove.glb'],
  [6210,2350,.74,1.05,'fern_grove.glb'],[7002,2348,.76,1.12,'fern_grove.glb'],
  [7165,2350,.72,1.10,'fern_grove.glb'],[7020,2630,.73,1.07,'fern_grove.glb'],
  [6320,2390,1.22,1.8,'mossy_rocks.glb'],[6870,2340,1.48,2.1,'mossy_rocks.glb'],
  [7110,2670,1.22,1.76,'mossy_rocks.glb'],[7530,2920,3.9,3.0,'coastal_cliff_02_lod.glb']
 ]){
  const fallback=new THREE.Group();
  scene.add(fallback);
  harbourAssets.add(id,fallback,{x:x*S,z:z*S,y:-.26,height,radius,angle:(x%17)*.4});
 }
}
