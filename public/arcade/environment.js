import * as T from '../vendor/three.module.js';
import {HDRLoader} from '../vendor/HDRLoader.js';
import {loadGLB} from '../scene/assets.js';

export function dressArena(renderer,scene,stone,canvas) {
 const decor=new T.Group();scene.add(decor);
 const loader=new T.TextureLoader();
 Promise.all(['diff','nor_gl','rough'].map(kind=>loader.loadAsync('/assets/aerial_rocks_02_'+kind+'_1k.jpg'))).then(([map,normal,rough])=>{
  map.colorSpace=T.SRGBColorSpace;
  for(const texture of [map,normal,rough]){texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(3,2);texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}
  stone.map=map;stone.normalMap=normal;stone.roughnessMap=rough;stone.color.set('#a6afc0');stone.normalScale.set(.45,.45);stone.needsUpdate=true;
 }).catch(()=>{canvas.dataset.arenaMaterials='fallback';});
 new HDRLoader().loadAsync('/assets/furry_clouds_1k.hdr').then(texture=>{
  const generator=new T.PMREMGenerator(renderer),env=generator.fromEquirectangular(texture);
  scene.environment=env.texture;scene.environmentIntensity=.45;generator.dispose();texture.dispose();
 }).catch(()=>{});
 // Existing licensed rock scans dress the ring; collision coordinates stay unchanged.
 loadGLB('boulder_01.glb').then(source=>{
  const bounds=new T.Box3().setFromObject(source.scene),size=bounds.getSize(new T.Vector3());
  for(const [x,z,scale] of [[-3,-4,3],[15,-5,4],[0,-8,5],[12,-10,6],[7,-16,8]]){
   const rock=source.scene.clone(true);rock.scale.setScalar(scale/Math.max(size.x,size.y,size.z));rock.position.set(x,-.7-bounds.min.y*rock.scale.x,z);rock.rotation.y=x;rock.updateMatrixWorld(true);const placed=new T.Box3().setFromObject(rock);rock.position.y+=-.7-placed.min.y-(placed.max.y-placed.min.y)*.55;rock.traverse(n=>{if(n.isMesh){n.receiveShadow=true;n.castShadow=false;}});decor.add(rock);
  }
 }).catch(()=>{});
 return {quality(low){decor.visible=!low;}};
}
