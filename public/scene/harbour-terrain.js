import * as THREE from '../vendor/three.module.js';
import {ASSETS} from '../asset-manifest.js';
import {coastGLSL} from './sunken-isles.js';

// A separate material for LAND[0]; other islands keep their original surfaces.
export function createHarbourTerrain(renderer,source,coastMap,canvas){
 const material=source.clone();material.color.set('#ffffff');material.bumpMap=null;
 material.normalScale=new THREE.Vector2(.55,.55);
 const uniforms={coastMap:{value:coastMap},sandColour:{value:source.map},sandNormal:{value:null},sandRough:{value:null}};
 const surface=`varying vec3 terrainWorld;
 ${coastGLSL}
 uniform sampler2D sandColour,sandNormal,sandRough;
 float lineDistance(vec2 p,vec2 a,vec2 b){vec2 ab=b-a;return length(p-a-ab*clamp(dot(p-a,ab)/dot(ab,ab),0.,1.));}
 float pathDistance(vec2 p){return min(min(lineDistance(p,vec2(11.625,35.25),vec2(16.375,34.)),lineDistance(p,vec2(16.375,34.),vec2(18.75,29.5))),min(lineDistance(p,vec2(18.75,29.5),vec2(23.25,27.5)),lineDistance(p,vec2(16.375,34.),vec2(19.875,40.625))));}
 float sandWeight(){float shore=1.-smoothstep(.3,2.1,shoreDistance(terrainWorld.xz));float trail=1.-smoothstep(.3,.8,pathDistance(terrainWorld.xz));return max(shore,trail*.9);}`;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying vec3 terrainWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nterrainWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader=surface+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 vec2 sandUv=terrainWorld.xz*.42;
 vec3 sand=texture2D(sandColour,sandUv).rgb;
 float damp=1.-smoothstep(.1,.8,shoreDistance(terrainWorld.xz));
 sand*=mix(.95,.64,damp);
 diffuseColor.rgb=mix(diffuseColor.rgb,sand,sandWeight());`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',THREE.ShaderChunk.normal_fragment_maps.replaceAll('texture2D( normalMap, vNormalMapUv ).xyz','mix(texture2D(normalMap,vNormalMapUv).xyz,texture2D(sandNormal,terrainWorld.xz*.42).xyz,sandWeight())'));
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',THREE.ShaderChunk.roughnessmap_fragment.replace('texelRoughness.g','mix(texelRoughness.g,texture2D(sandRough,terrainWorld.xz*.42).r,sandWeight())'));
 };
 material.customProgramCacheKey=()=> 'sunken-terrain-biomes-1';
 const loader=new THREE.TextureLoader();canvas.dataset.harbourTerrain='loading';
 const ready=Promise.all(['sparse_grass','coast_sand_01'].flatMap(id=>['diff','nor_gl','rough'].map(async kind=>{
  const t=await loader.loadAsync(ASSETS[`${id}_${kind}_1k.jpg`].url);t.colorSpace=kind==='diff'?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(.42,.42);t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return {id,kind,t};
 }))).then(textures=>{for(const {id,kind,t} of textures){if(id==='sparse_grass')material[{diff:'map',nor_gl:'normalMap',rough:'roughnessMap'}[kind]]=t;else uniforms[{diff:'sandColour',nor_gl:'sandNormal',rough:'sandRough'}[kind]].value=t;}material.needsUpdate=true;canvas.dataset.harbourTerrain='ready';}).catch(error=>{canvas.dataset.harbourTerrain='fallback';console.warn('Harbour terrain fallback:',error.message);});
 return {material,ready,sand:{get colour(){return uniforms.sandColour.value;},get normal(){return uniforms.sandNormal.value;},get rough(){return uniforms.sandRough.value;}}};
}
