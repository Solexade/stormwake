import {GLTFLoader} from '../vendor/GLTFLoader.js';
import {clone} from '../vendor/SkeletonUtils.js';
import {ASSETS} from '../asset-manifest.js';
import {createAssetCache} from './asset-cache.js';

const loader = new GLTFLoader();
const load = createAssetCache(id => {
  const asset = ASSETS[id];
  if (!asset || asset.type !== 'glb') throw Error(`Unknown GLB asset: ${id}`);
  return loader.loadAsync(asset.url).then(g=>{
    if(asset.pbr)g.scene.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material]){
      if(!m.map||!m.normalMap||!m.roughnessMap||!m.aoMap)throw Error('Incomplete PBR textures: '+id);
    }});
    return g;
  });
});

// Geometry/textures are shared; skeletons are independent. Callers clone any
// materials they mutate and keep their existing visible fallback until resolved.
export async function loadGLB(id) {
  const source = await load(id);
  return {...source, scene: clone(source.scene)};
}
