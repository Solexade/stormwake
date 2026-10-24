import * as T from '../vendor/three.module.js';
import {HDRLoader} from '../vendor/HDRLoader.js';
import {loadGLB} from '../scene/assets.js';

export function dressArena(renderer,scene,stone,canvas) {
 const decor=new T.Group(),props=new T.Group();scene.add(decor,props);let arena='harbour',low=false;
 const moods={harbour:{sky:.48,env:.65,fog:.025},frost:{sky:.22,env:.4,fog:.04},embers:{sky:.12,env:.28,fog:.035}};
 function lighting(){const m=moods[arena]||moods.harbour;scene.backgroundIntensity=m.sky;scene.environmentIntensity=m.env;scene.fog.density=m.fog;props.visible=!low&&arena==='harbour';}
 function theme(){lighting();decor.children.forEach((rock,i)=>{rock.scale.y=rock.userData.baseScale*(arena==='frost'?1.8:arena==='embers'?1.3:1);rock.rotation.z=arena==='frost'?(i%2?-.12:.12):0;rock.updateMatrixWorld(true);const b=new T.Box3().setFromObject(rock);rock.position.y+=-.7-b.min.y-(b.max.y-b.min.y)*.55;});}
 const loader=new T.TextureLoader();
 Promise.all(['diff','nor_gl','rough'].map(kind=>loader.loadAsync('/assets/aerial_rocks_02_'+kind+'_1k.jpg'))).then(([map,normal,rough])=>{
  map.colorSpace=T.SRGBColorSpace;
  for(const texture of [map,normal,rough]){texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(3,2);texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}
  stone.map=map;stone.normalMap=normal;stone.roughnessMap=rough;stone.normalScale.set(.28,.28);stone.needsUpdate=true;
 }).catch(()=>{canvas.dataset.arenaMaterials='fallback';});
 new HDRLoader().loadAsync('/assets/furry_clouds_1k.hdr').then(texture=>{
  const generator=new T.PMREMGenerator(renderer),env=generator.fromEquirectangular(texture);
  // Use the HDR for illumination only: its urban skyline conflicts with the isles.
  scene.environment=env.texture;texture.dispose();generator.dispose();lighting();
 }).catch(()=>{});
 // Existing licensed rock scans dress the ring; collision coordinates stay unchanged.
 loadGLB('boulder_01.glb').then(source=>{
  const bounds=new T.Box3().setFromObject(source.scene),size=bounds.getSize(new T.Vector3());
  for(const [x,z,scale] of [[-3,-4,3],[15,-5,4],[0,-8,5],[12,-10,6],[7,-16,8]]){
   const rock=source.scene.clone(true);rock.scale.setScalar(scale/Math.max(size.x,size.y,size.z));rock.position.set(x,-.7-bounds.min.y*rock.scale.x,z);rock.rotation.y=x;rock.updateMatrixWorld(true);const placed=new T.Box3().setFromObject(rock);rock.position.y+=-.7-placed.min.y-(placed.max.y-placed.min.y)*.55;rock.traverse(n=>{if(n.isMesh){n.receiveShadow=true;n.castShadow=false;}});rock.userData.baseScale=rock.scale.y;decor.add(rock);theme();
  }
 }).catch(()=>{});
 // Existing licensed harbour props sit outside the playable lane.
 loadGLB('wooden_barrels_01.glb').then(source=>{
  const bounds=new T.Box3().setFromObject(source.scene),size=bounds.getSize(new T.Vector3());
  for(const [x,z,turn] of [[-.8,-1.8,.2],[12.8,-1.8,-.4]]){const prop=source.scene.clone(true);prop.scale.setScalar(.85/Math.max(size.x,size.y,size.z));prop.position.set(x,-.04-bounds.min.y*prop.scale.x,z);prop.rotation.y=turn;prop.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});props.add(prop);}lighting();
 }).catch(()=>{canvas.dataset.harbourProps='fallback';});
 return {select(id){arena=id;theme();},quality(value){low=value;decor.visible=!low;lighting();}};
}
