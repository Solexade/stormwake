import * as THREE from '../vendor/three.module.js';
import {LAND,landAt,HOME} from '../world.js';

// Original visual geometry, not photogrammetry. All shelf vertices lie outside
// traversable land and below its surface. Gaps at overlapping islands stay open.
export function coastalShelfGeometry(){
 const vertices=[],uv=[],polygon=LAND[0];
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),steps=Math.ceil(length/12);
  const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],sign=landAt(mid[0]+dz/length*12,mid[1]-dx/length*12)?-1:1,nx=dz/length*sign,nz=-dx/length*sign;
  for(let j=0;j<steps;j++){
   const points=[];
   for(const f of [j/steps,(j+1)/steps])for(const band of [0,1,2]){
    const distance=[1,19,55+9*Math.sin((i+f)*4)][band],x=a[0]+dx*f+nx*distance,z=a[1]+dz*f+nz*distance;
    points.push([x/40,[-.035,-.42,-1.4][band],z/40]);
   }
   if(points.some(p=>landAt(p[0]*40,p[2]*40)))continue;
   for(const ids of [[0,3,1],[1,3,4],[1,4,2],[2,4,5]])for(const k of ids){vertices.push(...points[k]);uv.push(points[k][0]*.42,points[k][2]*.42);}
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
export function harbourPlantPositions(){
 const result=[];let seed=27491;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 // Deliberately bounded beds at rear walls / coast, no tall trees on routes.
 const beds=[[330,1200,48,35],[530,1135,85,30],[845,1250,40,58],[900,1480,22,70],[540,1630,110,20],[360,1555,38,45]];
 for(const [cx,cz,rx,rz] of beds)for(let i=0;i<100;i++){
  const angle=random()*Math.PI*2,r=Math.sqrt(random()),x=cx+Math.cos(angle)*rx*r,z=cz+Math.sin(angle)*rz*r;
  if(!landAt(x,z)||Math.hypot(x-HOME.x,z-HOME.y)<120)continue;
  result.push({x:x/40,z:z/40,angle:random()*6.28,size:.65+random()*.75});
 }
 return result;
}
export function createHarbourPlanting(scene){
 const positions=[],indices=[];
 // Bent tapered leaves in each tuft: solid geometry avoids alpha overdraw.
 for(let blade=0;blade<7;blade++){
  const a=blade*2.399,h=.20+(blade%4)*.055,base=positions.length/3;
  for(let row=0;row<4;row++){const t=row/3,bend=t*t*.17,w=(1-t)*.027;for(const side of [-1,1])positions.push(Math.cos(a)*bend+Math.sin(a)*w*side,h*t,Math.sin(a)*bend-Math.cos(a)*w*side);}
  for(let row=0;row<3;row++){const n=base+row*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:'#7c8b43',roughness:.96,side:THREE.DoubleSide});
 const placements=harbourPlantPositions(),plants=new THREE.InstancedMesh(g,material,placements.length),dummy=new THREE.Object3D(),colour=new THREE.Color();
 placements.forEach((p,i)=>{dummy.position.set(p.x,.015,p.z);dummy.rotation.y=p.angle;dummy.scale.setScalar(p.size);dummy.updateMatrix();plants.setMatrixAt(i,dummy.matrix);colour.setHSL(.19+(i%5)*.009,.25,.28+(i%7)*.018);plants.setColorAt(i,colour);});
 plants.name='Harbour coastal planting';plants.receiveShadow=true;plants.castShadow=false;scene.add(plants);return plants;
}
export function finishTimberHouse(group,{box,mats,variant=0}){
 const shape=new THREE.Shape();shape.moveTo(-1.34,1.75);shape.lineTo(1.34,1.75);shape.lineTo(0,2.67);shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false});
 for(const z of [-1.08,1.05]){const m=new THREE.Mesh(g,mats.wood);m.position.z=z;m.castShadow=m.receiveShadow=true;group.add(m);}
 // Recessed plank door, lintel, iron straps and structural framing.
 for(let i=0;i<5;i++)box(mats.darkwood,(i-2)*.102,.76,1.215,.095,1.23,.035,group);
 box(mats.wood,0,1.43,1.22,.75,.14,.11,group);
 for(const y of [.39,1.08])box(mats.metal,0,y,1.244,.47,.045,.02,group);
 for(const side of [-1,1]){
  for(let row=0;row<8;row++)box(mats.wood,side*1.37,.37+row*.19,0,.06,.16,2.12,group);
  const brace=box(mats.darkwood,side*.79,1.04,-1.13,.105,1.9,.09,group);brace.rotation.z=side*.56;
  box(mats.darkwood,side*1.13,1.02,0,.11,1.72,2.2,group);
 }
 // One roof uses aged timber, another retains dark shingles; no footprint growth.
 if(variant===1)for(const side of [-1,1])for(let row=0;row<5;row++){
  const strip=box(mats.wood,side*(.16+row*.29),2.71-row*.19,0,.28,.045,2.63,group);strip.rotation.z=side*-.58;
 }
}

// Low coastal rock clusters; all bounds remain beyond the playable polygon.
export const HARBOUR_ROCKS=Object.freeze([
 {x:4.8,z:30.3,radius:.8,height:1.1,y:-.65,angle:.4},
 {x:4.3,z:33.5,radius:.85,height:1.2,y:-.65,angle:1.7},
 {x:4.3,z:36.5,radius:.8,height:1,y:-.68,angle:2.6},
 {x:3.4,z:43,radius:.7,height:1,y:-.7,angle:.7},
 {x:12,z:59,radius:.85,height:1.2,y:-.65,angle:2.1},
 {x:17.5,z:59,radius:.8,height:1.05,y:-.65,angle:3.4},
]);
export function dressHarbourDock({box,beam,mats,scene}){
 const group=new THREE.Group();group.name='Harbour jetty structural details';scene.add(group);
 // Bracing sits below the existing deck; no rail crosses its walking surface.
 for(const x of [8.25,10.75,13]){
  box(mats.darkwood,x,-.14,36.125,.18,.25,1.4,group);
  for(const side of [-1,1]){
   const z=36.125+side*.55;
   beam(new THREE.Vector3(x,-.75,z),new THREE.Vector3(x+.6,.03,z),.045,mats.wood,group);
   for(const y of [.24,.31]){const rope=new THREE.Mesh(new THREE.TorusGeometry(.12,.018,4,10),mats.leather);rope.rotation.x=Math.PI/2;rope.position.set(x,y,z);group.add(rope);}
  }
 }
 // Mooring line and timber fenders are off the water-facing side of the dock.
 for(const x of [8.4,9.7,11]){
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,.15,36.77),new THREE.Vector3(x+.04,-.2,36.9),new THREE.Vector3(x+.05,-.55,36.87)]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,8,.018,4,false),mats.leather));
  const fender=box(mats.darkwood,x+.05,-.46,36.87,.12,.5,.12,group);fender.rotation.z=.08;
 }
 return group;
}
