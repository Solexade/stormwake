import * as THREE from '../vendor/three.module.js';
import {CACHES,CAMPS,FERRIES,REGIONS,EXTRA_LAND} from '../voyage-data.js';
import {LAND,landAt,walkable} from '../world.js';
const S=1/40;
// Original scenery assembled from existing meshes/materials. No external downloads.
export function createVoyageScenery(scene,kit){
 const {mats,box,ball,cylinder,mesh,batchStatic,boat,foliage,sceneryVisibility}=kit;
 const caches=CACHES.map(c=>{
  const group=new THREE.Group();group.position.set(c.x*S,0,c.y*S);scene.add(group);
  box(mats.darkwood,0,.28,0,.85,.56,.60,group);
  for(const x of [-.30,.30])box(mats.metal,x,.29,0,.07,.6,.64,group);
  const lid=box(mats.wood,0,.59,0,.90,.10,.65,group);
  const seal=ball(c.kind==='health'?mats.fire:c.kind==='weapon'?mats.gold:mats.glow,0,.38,.32,.09,.09,.03,group);
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
 // New regional shrines are visible independent of the current chapter.
 for(const r of REGIONS.slice(1)){const g=new THREE.Group();g.position.set(r.shrine.x*S,0,r.shrine.y*S);scene.add(g);cylinder(mats.stone,0,.12,0,1.1,1.2,.24,g);for(const x of [-1,1]){box(mats.stone,x,1,0,.3,2,.35,g);}box(mats.stone,0,2,0,2.4,.3,.4,g);batchStatic(g);sceneryVisibility.add(g);}
 // Reuse one bounded foliage silhouette; copies share geometry/textures.
 const source=foliage.find(f=>f.mesh.children.length>0)?.mesh;
 if(source){for(let region=1;region<3;region++)for(let i=0;i<20;i++){
  const r=REGIONS[region],x=r.home.x-140+(i*157%850),y=450+(i*233%1550);
  if(!walkable(x,y,80)||[r.home,r.shrine,r.boss,...CACHES,...CAMPS,...FERRIES].some(p=>Math.hypot(p.x-x,p.y-y)<140))continue;
  const tree=source.clone(true);tree.position.set(x*S,0,y*S);tree.scale.setScalar(.8+(i%4)*.12);scene.add(tree);sceneryVisibility.add(tree);
 }}
 // Submerged ledges join water to the new islands without altering traversal.
 const sand=new THREE.MeshStandardMaterial({color:'#9d9b76',roughness:1});
 for(const poly of EXTRA_LAND){const points=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy),nx=dy/d*35,ny=-dx/d*35;const A=[a[0]*S,-.12,a[1]*S],B=[b[0]*S,-.12,b[1]*S],C=[(a[0]+nx)*S,-.65,(a[1]+ny)*S],D=[(b[0]+nx)*S,-.65,(b[1]+ny)*S];points.push(...A,...C,...B,...B,...C,...D);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.computeVertexNormals();const ledge=new THREE.Mesh(geo,sand);ledge.receiveShadow=true;scene.add(ledge);}
 return {update(run,t){for(const {c,group,lid,seal} of caches){const open=run?.openedCaches?.includes(c.id);group.visible=!run||Math.hypot(c.x-run.player.x,c.y-run.player.y)<1500;lid.rotation.x=open?-.9:0;seal.visible=!open;}ferries.forEach((b,i)=>{b.position.y=-.45+Math.sin(t*.7+i)*.035;b.rotation.z=Math.sin(t*.6+i)*.012;});camps.forEach((f,i)=>f.scale.y=1+Math.sin(t*7+i)*.12);}};
}
