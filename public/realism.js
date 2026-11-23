import * as THREE from './vendor/three.module.js';
import {HDRLoader} from './vendor/HDRLoader.js';
import {ASSETS} from './asset-manifest.js';
import {createAssetCache} from './scene/asset-cache.js';

// Photo-based materials are local CC0 assets. Geometry stays playable while
// they stream; failed downloads leave the original material intact.
export function applyPhotographicMaterials(renderer,scene,mats,canvas){
 const loader=new THREE.TextureLoader();let pending=0,failed=0;
 const textures=new Set(),scheduled=new Set(),detailMaps=new Map();
 let environmentTarget=null,hdrStarted=false,quality='low';
 const load=createAssetCache(id=>loader.loadAsync(ASSETS[id].url));
 const report=()=>{canvas.dataset.materials=pending?'loading':failed?'fallback':'ready';};
 function map(material,asset,kind,slot,repeat){
  const key=material.uuid+':'+slot;
  if(scheduled.has(key))return;
  scheduled.add(key);
  pending++;report();load(`${asset}_${kind}_1k.jpg`).then(texture=>{
   texture.colorSpace=slot==='map'?THREE.SRGBColorSpace:THREE.NoColorSpace;
   texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(...repeat);
   texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   textures.add(texture);
   if(slot==='map'){
    material.map=texture;material.color.set(material===mats.ground?'#a7ada0':material===mats.wood||material===mats.darkwood?'#aaa398':'#afb6b1');
   }else{
    detailMaps.set(key,texture);
    if(quality==='high')material[slot]=texture;
   }
   material.needsUpdate=true;pending--;report();
  }).catch(()=>{failed++;pending--;report();});
 }
 const materialSources=[
  ['ground','forest_floor',[.32,.32],.75],
  ['stone','aerial_rocks_02',[1,1],.8],
  ['darkstone','aerial_rocks_02',[1,1],.8],
  ['wood','weathered_brown_planks',[1,1],.65],
  ['darkwood','weathered_brown_planks',[1,1],.65]
 ];
 function setQuality(value){
  quality=value;
  for(const [name,asset,repeat,strength] of materialSources){
   const material=mats[name];
   map(material,asset,'diff','map',repeat);
   for(const slot of ['normalMap','roughnessMap']){
    const next=quality==='high'?detailMaps.get(material.uuid+':'+slot)||null:null;
    if(material[slot]!==next){material[slot]=next;material.needsUpdate=true;}
   }
   if(quality==='high'){
    material.bumpMap=null;material.normalScale.set(strength,strength);
    map(material,asset,'nor_gl','normalMap',repeat);map(material,asset,'rough','roughnessMap',repeat);
   }
  }
  scene.environment=quality==='high'?environmentTarget?.texture||null:null;
  if(quality!=='high'||hdrStarted)return;
  hdrStarted=true;
  pending++;report();
  new HDRLoader().loadAsync(ASSETS['furry_clouds_1k.hdr'].url).then(texture=>{
  texture.mapping=THREE.EquirectangularReflectionMapping;
  const generator=new THREE.PMREMGenerator(renderer),environment=generator.fromEquirectangular(texture);
  environmentTarget=environment;
  if(quality==='high')scene.environment=environment.texture;
  // Only lighting/reflections use the photograph; the world keeps its original sky.
  generator.dispose();texture.dispose();pending--;report();
  }).catch(()=>{failed++;pending--;report();});
 }
 return {setQuality,dispose(){textures.forEach(t=>t.dispose());environmentTarget?.dispose();}};
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
