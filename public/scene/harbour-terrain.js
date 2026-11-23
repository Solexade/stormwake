import * as THREE from '../vendor/three.module.js';
import {ASSETS} from '../asset-manifest.js';
import {worldCoastGLSL} from './coastal-water.js';

// World-space sampling keeps adjacent land polygons visually continuous.
export function createHarbourTerrain(renderer,source,coastMap,canvas){
 const material=source.clone();material.color.set('#ffffff');material.bumpMap=null;
 material.normalScale=new THREE.Vector2(.55,.55);
 const uniforms={coastMap:{value:coastMap},sandColour:{value:source.map},sandNormal:{value:null},sandRough:{value:null},forestColour:{value:source.map},forestNormal:{value:source.map},forestRough:{value:source.map}};
 const surface=`varying vec3 terrainWorld;
 ${worldCoastGLSL}
 uniform sampler2D sandColour,sandNormal,sandRough,forestColour,forestNormal,forestRough;
 float sandWeight(vec2 p,vec2 masks){
  float variation=sin(p.x*3.1)*sin(p.y*2.7)*.17;
  float shore=1.-smoothstep(.35,1.9,masks.x+variation);
  float trail=1.-smoothstep(.32,.98,masks.y+variation);
  return max(shore,trail*.78);
 }`;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying vec3 terrainWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nterrainWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader=surface+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 vec2 sandUv=terrainWorld.xz*.42;
 vec3 sand=texture2D(sandColour,sandUv).rgb;
 vec2 masks=coastalMasks(terrainWorld.xz);
 float damp=1.-smoothstep(.1,.8,masks.x);
 sand*=mix(.95,.64,damp);
 vec3 meadow=texture2D(map,sandUv).rgb;
 float groundVariation=.5+.5*sin(terrainWorld.x*.32+sin(terrainWorld.z*.33))*cos(terrainWorld.z*.44);
 float woodland=max(smoothstep(95.,117.,terrainWorld.x),smoothstep(44.,55.,terrainWorld.z)*(1.-smoothstep(31.,41.,terrainWorld.x)));
 float estuary=smoothstep(139.,151.,terrainWorld.x)*smoothstep(44.,52.,terrainWorld.z);
 woodland*=1.-estuary*.76;
 woodland*=smoothstep(.85,3.2,masks.x);
 float forestWeight=woodland*(.62+groundVariation*.32);
 meadow=mix(meadow,texture2D(forestColour,terrainWorld.xz*.55).rgb,forestWeight);
 meadow*=mix(vec3(.62,.69,.55),vec3(1.02,1.04,.92),groundVariation);
 meadow*=mix(vec3(1.),vec3(.94,1.055,1.06),estuary);
 float terrainSand=sandWeight(terrainWorld.xz,masks);
 diffuseColor.rgb=mix(meadow,sand,terrainSand);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',THREE.ShaderChunk.normal_fragment_maps.replaceAll('texture2D( normalMap, vNormalMapUv ).xyz','mix(mix(texture2D(normalMap,vNormalMapUv).xyz,texture2D(forestNormal,terrainWorld.xz*.55).xyz,forestWeight),texture2D(sandNormal,terrainWorld.xz*.42).xyz,terrainSand)'));
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',THREE.ShaderChunk.roughnessmap_fragment.replace('texelRoughness.g','mix(mix(texelRoughness.g,texture2D(forestRough,terrainWorld.xz*.55).r,forestWeight),texture2D(sandRough,terrainWorld.xz*.42).r,terrainSand)'));
 };
 material.customProgramCacheKey=()=> 'district-terrain-biomes-4';
 const loader=new THREE.TextureLoader();
 const sources=['sparse_grass','coast_sand_01','forrest_ground_01'];
 const stages=new Set(),surfaceDetail={};let pending=0,failures=0,quality='low',onReady=()=>{};
 const updateDetail=()=>{
  const normal=quality==='high'?surfaceDetail.normalMap||null:null,rough=quality==='high'?surfaceDetail.roughnessMap||null:null;
  if(material.normalMap===normal&&material.roughnessMap===rough)return;
  material.normalMap=normal;material.roughnessMap=rough;material.needsUpdate=true;
 };
 function stage(name,kinds){
  if(stages.has(name))return;
  stages.add(name);pending++;canvas.dataset.harbourTerrain='loading';
  Promise.all(sources.flatMap(id=>kinds.map(async kind=>{
   const texture=await loader.loadAsync(ASSETS[`${id}_${kind}_1k.jpg`].url);
   texture.colorSpace=kind==='diff'?THREE.SRGBColorSpace:THREE.NoColorSpace;
   texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
   texture.repeat.set(.42,.42);texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
   return {id,kind,texture};
  }))).then(textures=>{
   for(const {id,kind,texture} of textures){
    if(id==='sparse_grass'){
     if(kind==='diff')material.map=texture;else surfaceDetail[kind==='nor_gl'?'normalMap':'roughnessMap']=texture;
    }
    else uniforms[(id==='coast_sand_01'?'sand':'forest')+{diff:'Colour',nor_gl:'Normal',rough:'Rough'}[kind]].value=texture;
   }
   updateDetail();
   onReady();
  }).catch(error=>{failures++;console.warn('Harbour terrain fallback:',error.message);})
   .finally(()=>{pending--;canvas.dataset.harbourTerrain=pending?'loading':failures?'fallback':'ready';});
 }
 return {material,onReady(callback){onReady=callback;},setQuality(value){quality=value;stage('colour',['diff']);if(quality==='high')stage('detail',['nor_gl','rough']);updateDetail();onReady();},sand:{get colour(){return uniforms.sandColour.value;},get normal(){return quality==='high'?uniforms.sandNormal.value:null;},get rough(){return quality==='high'?uniforms.sandRough.value:null;}}};
}
