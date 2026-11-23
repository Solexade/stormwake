import * as THREE from '../vendor/three.module.js';
import {ASSETS} from '../asset-manifest.js';
import {worldCoastGLSL} from './coastal-water.js';

// World-space sampling keeps adjacent land polygons visually continuous.
export function createHarbourTerrain(renderer,source,coastMap,canvas){
 const material=source.clone();material.color.set('#ffffff');material.bumpMap=null;
 material.normalScale=new THREE.Vector2(.55,.55);
 const uniforms={coastMap:{value:coastMap},sandColour:{value:source.map},sandNormal:{value:null},sandRough:{value:null}};
 const surface=`varying vec3 terrainWorld;
 ${worldCoastGLSL}
 uniform sampler2D sandColour,sandNormal,sandRough;
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
 meadow*=mix(vec3(.53,.59,.49),vec3(.93,.96,.78),groundVariation);
 float terrainSand=sandWeight(terrainWorld.xz,masks);
 diffuseColor.rgb=mix(meadow,sand,terrainSand);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',THREE.ShaderChunk.normal_fragment_maps.replaceAll('texture2D( normalMap, vNormalMapUv ).xyz','mix(texture2D(normalMap,vNormalMapUv).xyz,texture2D(sandNormal,terrainWorld.xz*.42).xyz,terrainSand)'));
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',THREE.ShaderChunk.roughnessmap_fragment.replace('texelRoughness.g','mix(texelRoughness.g,texture2D(sandRough,terrainWorld.xz*.42).r,terrainSand)'));
 };
 material.customProgramCacheKey=()=> 'district-terrain-biomes-3';
 const loader=new THREE.TextureLoader();canvas.dataset.harbourTerrain='loading';
 const ready=Promise.all(['sparse_grass','coast_sand_01'].flatMap(id=>['diff','nor_gl','rough'].map(async kind=>{
  const t=await loader.loadAsync(ASSETS[`${id}_${kind}_1k.jpg`].url);t.colorSpace=kind==='diff'?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(.42,.42);t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return {id,kind,t};
 }))).then(textures=>{for(const {id,kind,t} of textures){if(id==='sparse_grass')material[{diff:'map',nor_gl:'normalMap',rough:'roughnessMap'}[kind]]=t;else uniforms[{diff:'sandColour',nor_gl:'sandNormal',rough:'sandRough'}[kind]].value=t;}material.needsUpdate=true;canvas.dataset.harbourTerrain='ready';}).catch(error=>{canvas.dataset.harbourTerrain='fallback';console.warn('Harbour terrain fallback:',error.message);});
 return {material,ready,sand:{get colour(){return uniforms.sandColour.value;},get normal(){return uniforms.sandNormal.value;},get rough(){return uniforms.sandRough.value;}}};
}
