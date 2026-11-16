import {initialQuality} from './quality.js';
import * as THREE from '../vendor/three.module.js';
import {LAND, landAt} from '../world.js';

// Presentation only: no colliders, interaction anchors or server state.
// Signed edge ribbons are below the playable surface and omitted where land
// overlaps. These are original procedural effects, not scanned geometry.
export function shorelineSegments(step = 20) {
  const points = [];
  const polygon = LAND[0];
  for (let i=0; i<polygon.length; i++) {
    const a=polygon[i], b=polygon[(i+1)%polygon.length];
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const nx=(b[1]-a[1])/length, ny=-(b[0]-a[0])/length;
    for(let d=0; d<length; d+=step) {
      const fraction=(d+Math.min(step,length-d)/2)/length;
      const x=a[0]+(b[0]-a[0])*fraction, y=a[1]+(b[1]-a[1])*fraction;
      const side=landAt(x+nx*12,y+ny*12)?-1:1;
      const ox=x+nx*12*side, oy=y+ny*12*side;
      if(!landAt(ox,oy)) points.push({x:ox/40,z:oy/40,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),length:Math.min(step,length-d)/40});
    }
  }
  return points;
}

export function weatherHarbourMaterial(material, kind) {
  // World-space macro variation avoids visible per-object texture boundaries.
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 harbourPosition;\n'+shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      vec4 harbourWorld = vec4(transformed,1.);
      #ifdef USE_INSTANCING
        harbourWorld = instanceMatrix * harbourWorld;
      #endif
      harbourPosition=(modelMatrix*harbourWorld).xyz;`);
    shader.fragmentShader = 'varying vec3 harbourPosition;\n'+shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float harbour = (1.-smoothstep(22.,26.,harbourPosition.x))*smoothstep(26.,30.,harbourPosition.z);
      float grain = sin(harbourPosition.x*1.7+sin(harbourPosition.z*2.1))*sin(harbourPosition.z*.73);
      float wet = (1.-smoothstep(-.6,.35,harbourPosition.y))*harbour;
      diffuseColor.rgb *= mix(vec3(1.),vec3(${kind==='ground'?'.88,.91,.82':'.91,.92,.91'})+grain*.055,harbour);
      diffuseColor.rgb *= 1.-wet*${kind==='stone'?'.28':'.12'};
    `);
  };
  material.customProgramCacheKey = () => `harbour-weather-${kind}-1`;
}

export function createHarbourShore(scene) {
  const material = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, side:THREE.DoubleSide,
    uniforms:{time:{value:0}},
    vertexShader:'varying vec2 shoreUv;void main(){shoreUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform float time;varying vec2 shoreUv;
      void main(){float edge=sin(shoreUv.y*3.14159);
      float fleck=.5+.5*sin(shoreUv.x*41.+sin(shoreUv.y*18.)+time*.7);
      float pulse=.65+.35*sin(time*.65+shoreUv.x*5.);
      gl_FragColor=vec4(vec3(.57,.68,.65),edge*fleck*pulse*.23);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const group=new THREE.Group();group.name='Harbour shoreline (visual only)';
  const geometry=new THREE.PlaneGeometry(1,.28);
  const segments=shorelineSegments();
  const mesh=new THREE.InstancedMesh(geometry,material,segments.length);
  const transform=new THREE.Object3D();
  segments.forEach((p,i)=>{
    transform.position.set(p.x,-.48,p.z);
    transform.rotation.set(-Math.PI/2,0,-p.angle);
    transform.scale.set(p.length,1,1);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);
  });
  group.add(mesh);scene.add(group);
  return {update(time,enabled,reducedMotion){group.visible=enabled;material.uniforms.time.value=reducedMotion?0:time;},dispose(){geometry.dispose();material.dispose();group.removeFromParent();}};
}

export function dressCottage(group,{box,mats}) {
  // All additions remain within the existing foundation footprint. Reuse the
  // cottage's occlusion material clones and batching later in construction.
  for(const side of [-1,1]) {
    for(let row=0;row<4;row++) for(let column=0;column<5;column++) {
      box(mats.stone,(column-2)*.54,.12+row*.08,side*1.17,.50,.065,.055,group);
    }
    for(let j=0;j<5;j++) box(mats.darkwood,side*1.36,1.0,(j-2)*.42,.055,1.65,.065,group);
  }
  for(const x of [-1.29,1.29]) box(mats.darkwood,x,1.02,-1.08,.13,1.85,.1,group);
  box(mats.darkwood,0,.22,1.13,.72,.09,.12,group);
}

// Real locally hosted assets. Keep the old visual until the replacement is ready.
// Radius fitting is conservative: imported geometry never enlarges a collider.
export function fitHarbourAsset(model, {x,z,radius,height,y=0,angle=0}) {
 model.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
 if(![x,z,y,angle,...size.toArray()].every(Number.isFinite)||size.y<=0||size.x<=0||size.z<=0)throw Error('Invalid prop bounds');
 if(!(radius>0||height>0))throw Error('Missing prop size');
 const scale=Math.min(radius>0?radius/Math.hypot(size.x/2,size.z/2):Infinity,height>0?height/size.y:Infinity);
 const group=new THREE.Group();group.add(model);model.position.sub(bounds.getCenter(new THREE.Vector3()));model.position.y-=bounds.min.y-bounds.getCenter(new THREE.Vector3()).y;
 group.scale.setScalar(scale);group.position.set(x,y,z);group.rotation.y=angle;
 model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;}});
 return group;
}
export function createHarbourAssets(scene,canvas,load,onReady=()=>{}) {
 const entries=[];let quality=initialQuality(!!globalThis.matchMedia?.('(any-pointer:coarse)').matches);
 const assetId=e=>typeof e.id==='string'?e.id:e.id[quality]||e.id.medium;
 const sync=()=>{
  for(const e of entries){const selected=quality==='low'?null:e.models.get(assetId(e));e.fallback.visible=!selected;for(const [id,model]of e.models)model.visible=model===selected;}
  canvas.dataset.harbourAssets=String(entries.filter(e=>e.models.size).length);
  canvas.dataset.harbourPending=String(entries.reduce((n,e)=>n+e.pending.size,0));
  canvas.dataset.harbourFailures=String(entries.filter(e=>e.errors.size).length);
  canvas.dataset.harbourLoadMs=String(Math.round(Math.max(0,...entries.map(e=>e.duration||0))));
 };
 const start=e=>{
  const id=assetId(e);if(e.models.has(id))return Promise.resolve();if(e.pending.has(id))return e.pending.get(id);
  e.errors.delete(id);const began=performance.now();
  const pending=Promise.resolve().then(()=>load(id)).then(g=>{
   const model=fitHarbourAsset(g.scene,e.placement);onReady(model);e.models.set(id,model);scene.add(model);
  }).catch(error=>{e.errors.set(id,String(error?.message||error));console.warn('Harbour asset fallback:',id,error);})
  .finally(()=>{e.duration=performance.now()-began;e.pending.delete(id);sync();});
  e.pending.set(id,pending);sync();return pending;
 };
 return {
  add(id,fallback,placement){
   if(entries.some(e=>e.fallback===fallback))throw Error('Fallback already registered');
   const entry={id,placement,fallback,models:new Map(),pending:new Map(),errors:new Map()};entries.push(entry);sync();return quality!=='low'?start(entry):Promise.resolve();
  },
  setQuality(value){quality=['high','medium','low'].includes(value)?value:'high';const pending=quality!=='low'?entries.map(start):[];sync();return Promise.all(pending);},
  retry(){return quality!=='low'?Promise.all(entries.filter(e=>e.errors.has(assetId(e))).map(start)):Promise.resolve();}
 };
}
