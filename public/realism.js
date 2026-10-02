import * as THREE from './vendor/three.module.js';
import {HDRLoader} from './vendor/HDRLoader.js';

// Photo-based materials are local CC0 assets. Geometry stays playable while
// they stream; failed downloads leave the original material intact.
export function applyPhotographicMaterials(renderer,scene,mats,canvas){
 const loader=new THREE.TextureLoader();let pending=0,failed=0;
 const report=()=>{canvas.dataset.materials=pending?'loading':failed?'fallback':'ready';};
 function map(material,asset,kind,slot,repeat){
  pending++;report();loader.load(`./assets/${asset}_${kind}_1k.jpg`,texture=>{
   texture.colorSpace=slot==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace;
   texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(...repeat);
   texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   material[slot]=texture;if(slot==='map')material.color.set(material===mats.ground?'#a7ada0':material===mats.wood||material===mats.darkwood?'#aaa398':'#afb6b1');
   material.needsUpdate=true;pending--;report();
  },undefined,()=>{failed++;pending--;report();});
 }
 for(const [name,asset,repeat,strength] of [
  ['ground','forest_floor',[.32,.32],.75],
  ['stone','aerial_rocks_02',[1,1],.8],
  ['darkstone','aerial_rocks_02',[1,1],.8],
  ['wood','weathered_brown_planks',[1,1],.65],
  ['darkwood','weathered_brown_planks',[1,1],.65]
 ]){
  const material=mats[name];material.bumpMap=null;material.normalScale=new THREE.Vector2(strength,strength);
  map(material,asset,'diff','map',repeat);map(material,asset,'nor_gl','normalMap',repeat);map(material,asset,'rough','roughnessMap',repeat);
 }
 pending++;report();new HDRLoader().load('./assets/furry_clouds_1k.hdr',texture=>{
  texture.mapping=THREE.EquirectangularReflectionMapping;
  const generator=new THREE.PMREMGenerator(renderer),environment=generator.fromEquirectangular(texture);
  scene.environment=environment.texture;scene.environmentIntensity=.65;
  // Only lighting/reflections use the photograph; the world keeps its original sky.
  generator.dispose();texture.dispose();pending--;report();
 },undefined,()=>{failed++;pending--;report();});
}

export function needleMaterial(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d');let seed=77;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 ctx.lineCap='round';ctx.strokeStyle='#5d6040';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(128,252);ctx.lineTo(128,12);ctx.stroke();
 for(let i=0;i<105;i++){const y=20+i*2.1,reach=(1-y/300)*85;
  for(const side of [-1,1]){const x=128+side*(reach*(.65+random()*.35)),endY=y-12-random()*20;
   ctx.strokeStyle=i%3?'#334f39':'#627552';ctx.lineWidth=1.2+random();ctx.beginPath();ctx.moveTo(128,y);ctx.lineTo(x,endY);ctx.stroke();
   for(let j=1;j<5;j++){const f=j/5,bx=128+(x-128)*f,by=y+(endY-y)*f;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+side*9,by-9);ctx.stroke();}
  }
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshStandardMaterial({map:texture,alphaTest:.35,side:THREE.DoubleSide,roughness:1});
}
