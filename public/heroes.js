// One cosmetic identity contract for Solo, Arcade and private rooms.
export const HEROES=Object.freeze([
 {id:'azure',name:'Ember Knight',asset:'azure_champion.glb',color:'#ffffff',tag:'Ember / steel',description:'Armoured swordsman. Shared playable model across every mode.'},
 {id:'hood',name:'Violet Wraith',asset:'hooded_blade.glb',color:'#ffffff',tag:'Violet / shadow',description:'Hooded rival. Shared playable model across every mode.'}
]);
export const heroById=id=>HEROES.find(h=>h.id===id)||HEROES[0];
export function storedHero(){try{return heroById(localStorage.getItem('stormwake.hero')).id;}catch{return HEROES[0].id;}}
export function chooseHero(id){const hero=heroById(id);try{localStorage.setItem('stormwake.hero',hero.id);}catch{}return hero;}
// Strip horizontal root motion without mutating cached source animations.
export function inPlaceClip(clip){const copy=clip.clone();for(const track of copy.tracks)if(/Hips\.position$/.test(track.name)){for(let k=0;k<track.values.length;k+=3){track.values[k]=track.values[0];track.values[k+2]=track.values[2];}}return copy;}
export function heroMaterial(source,id){const m=source.clone();m.roughness=.76;m.metalness=.12;
 if(id==='hood'){m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float clothMask = smoothstep(0.003, 0.035, diffuseColor.g - max(diffuseColor.r,diffuseColor.b));
 float clothLight = dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));
 diffuseColor.rgb = mix(diffuseColor.rgb,vec3(0.60,0.24,0.88)*clothLight*1.5,clothMask);`);};m.customProgramCacheKey=()=> 'stormwake-violet-cloth-v1';}
 return m;
}
