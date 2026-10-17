import {arenaById} from './catalog.js';
import * as T from '../vendor/three.module.js';
import {createFighter,animateFighter} from './fighters.js';
import {dressArena} from './environment.js';
export async function createArena(canvas){
 const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 const scene=new T.Scene();scene.background=new T.Color('#10172e');scene.fog=new T.FogExp2('#10172e',.035);
 const camera=new T.PerspectiveCamera(44,1,.1,80);camera.position.set(6,1.9,13);camera.lookAt(6,1.1,0);
 scene.add(new T.HemisphereLight('#b7dae5','#25333c',2));
 const key=new T.DirectionalLight('#ffe1b1',3);key.position.set(2,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-10;key.shadow.camera.right=10;key.shadow.camera.top=8;key.shadow.camera.bottom=-8;key.shadow.normalBias=.02;scene.add(key);
 const rim=new T.DirectionalLight('#b092f2',2);rim.position.set(8,4,-5);scene.add(rim);
 const stone=new T.MeshStandardMaterial({color:'#394c54',roughness:.94}),iron=new T.MeshStandardMaterial({color:'#43505b',roughness:.5,metalness:.6});
 const add=(g,m,x,y,z)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;};
 add(new T.BoxGeometry(15,.5,6),stone,6,-.3,0);

 for(const x of [-.8,12.8]){add(new T.CylinderGeometry(.35,.55,3,8),stone,x,1,-2);add(new T.TorusGeometry(.6,.06,8,32),iron,x,2.4,-2);const light=new T.PointLight(x<0?'#ffd393':'#be85ed',10,8,2);light.position.set(x,2,0);scene.add(light);add(new T.OctahedronGeometry(.23),new T.MeshStandardMaterial({color:x<0?'#ffbb70':'#be85ed',emissive:x<0?'#ff9a35':'#9559d6',emissiveIntensity:2}),x,2.2,-2);}
 for(let i=0;i<12;i++)add(new T.BoxGeometry(.2,1.1,.2),iron,i*1.2,-.05,-2.6);
 add(new T.BoxGeometry(15,.12,.14),iron,6,.5,-2.6);
 const sea=add(new T.PlaneGeometry(90,90),new T.MeshStandardMaterial({color:'#173e4c',roughness:.3,metalness:.25}),6,-.7,-12);sea.rotation.x=-Math.PI/2;
 const ring=add(new T.TorusGeometry(2,.025,6,64),new T.MeshBasicMaterial({color:'#7ba2a0'}),6,.015,0);ring.rotation.x=-Math.PI/2;
 const scenery=dressArena(renderer,scene,stone,canvas);
 let actors=await Promise.all([createFighter(scene,0,'voyager'),createFighter(scene,1,'warden')]);
 let selectionVersion=0;
 async function configure(s){
  const version=++selectionVersion,theme=arenaById(s.arena);
  scenery.select(theme.id);scene.background.set(theme.sky);scene.fog.color.set(theme.sky);sea.material.color.set(theme.sea);key.color.set(theme.key);rim.color.set(theme.rim);stone.color.set(theme.floor);
  const ids=s.heroes||['voyager','warden'];
  const replacements=await Promise.all(ids.map(async(id,i)=>{if(actors[i].heroId===id)return actors[i];const a=await createFighter(scene,i,id);a.root.visible=false;return a;}));
  if(version!==selectionVersion){replacements.forEach(a=>{if(!actors.includes(a))a.root.removeFromParent();});return;}
  actors.forEach(a=>{if(!replacements.includes(a))a.root.removeFromParent();});actors=replacements;actors.forEach((a,i)=>{a.root.visible=true;a.root.position.x=s.fighters[i].x;});canvas.dataset.characterAssets=ids.join(',');
 }
 canvas.dataset.characterAssets='voyager,warden';
 const sparks=[];for(let i=0;i<14;i++){const mesh=add(new T.SphereGeometry(.035,4,3),new T.MeshBasicMaterial({color:'#ffe2a6'}),0,0,0);mesh.visible=false;sparks.push(mesh);}
 let matchId=null,lastEvent=0,burst=0,hitX=6,shake=0,last=performance.now(),frame=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.position.z=Math.max(12,8.5/Math.max(.4,camera.aspect));camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(canvas);resize();
 return {quality(low){scenery.quality(low);renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=!low;resize();},draw(s){const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;if(!s)return;if(matchId!==s.id){matchId=s.id;lastEvent=0;configure(s).catch(e=>console.warn('Selection fallback',e.message));actors.forEach((a,i)=>{a.root.position.x=s.fighters[i].x;a.key=null;});}
  for(const e of s.events)if(e.id>lastEvent){lastEvent=e.id;if(e.type==='hit'||e.type==='block'){hitX=s.fighters[e.target].x;burst=.22;shake=reduced?0:.12;}}
  actors.forEach((a,i)=>animateFighter(a,s.fighters[i],dt,s.frame));
  burst=Math.max(0,burst-dt);shake=Math.max(0,shake-dt);sparks.forEach((m,i)=>{m.visible=burst>0;const age=.22-burst;m.position.set(hitX+Math.cos(i*2.4)*age*4,1.3+Math.sin(i*2.4)*age*3,.25);});
  const centre=(s.fighters[0].x+s.fighters[1].x)/2;
  const visibleWidth=Math.max(6,Math.abs(s.fighters[0].x-s.fighters[1].x)+3.2);
  const desiredZ=Math.max(5.6,visibleWidth/(2*Math.tan(22*Math.PI/180)*camera.aspect));
  camera.position.z+=(desiredZ-camera.position.z)*(1-Math.exp(-dt*5));
  camera.position.x=centre+(shake?Math.sin(now*.2)*shake:0);camera.lookAt(centre,1.2,0);renderer.render(scene,camera);if(++frame%60===0){canvas.dataset.triangles=String(renderer.info.render.triangles);canvas.dataset.drawCalls=String(renderer.info.render.calls);}canvas.dataset.fighters='2';
 }};
}
