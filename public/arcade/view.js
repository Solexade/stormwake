import * as T from '../vendor/three.module.js';
import {loadGLB} from '../scene/assets.js';
import {characterMount} from '../characters.js';
import {MOVES} from './config.js';
export async function createArena(canvas){
 const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 const scene=new T.Scene();scene.background=new T.Color('#142936');scene.fog=new T.FogExp2('#142936',.035);
 const camera=new T.PerspectiveCamera(44,1,.1,80);camera.position.set(6,3.4,13);camera.lookAt(6,1.1,0);
 scene.add(new T.HemisphereLight('#b7dae5','#25333c',2));
 const key=new T.DirectionalLight('#ffe1b1',3);key.position.set(2,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-10;key.shadow.camera.right=10;key.shadow.camera.top=8;key.shadow.camera.bottom=-8;key.shadow.normalBias=.02;scene.add(key);
 const rim=new T.DirectionalLight('#79cdda',2);rim.position.set(8,4,-5);scene.add(rim);
 const stone=new T.MeshStandardMaterial({color:'#394c54',roughness:.94}),iron=new T.MeshStandardMaterial({color:'#43505b',roughness:.5,metalness:.6});
 const add=(g,m,x,y,z)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;};
 add(new T.BoxGeometry(15,.5,6),stone,6,-.3,0);
 for(let i=0;i<16;i++)add(new T.BoxGeometry(.035,.02,5.5),iron,i,0,0);
 for(const x of [-.8,12.8]){add(new T.CylinderGeometry(.35,.55,3,8),stone,x,1,-2);add(new T.TorusGeometry(.6,.06,8,32),iron,x,2.4,-2);const light=new T.PointLight(x<0?'#ffd393':'#6fe0eb',10,8,2);light.position.set(x,2,0);scene.add(light);add(new T.OctahedronGeometry(.23),new T.MeshStandardMaterial({color:x<0?'#ffbb70':'#6fe0eb',emissive:x<0?'#ff9a35':'#39bccc',emissiveIntensity:2}),x,2.2,-2);}
 for(let i=0;i<12;i++)add(new T.BoxGeometry(.2,1.1,.2),iron,i*1.2,-.05,-2.6);
 add(new T.BoxGeometry(15,.12,.14),iron,6,.5,-2.6);
 const sea=add(new T.PlaneGeometry(90,90),new T.MeshStandardMaterial({color:'#173e4c',roughness:.3,metalness:.25}),6,-.7,-12);sea.rotation.x=-Math.PI/2;
 const ring=add(new T.TorusGeometry(2,.025,6,64),new T.MeshBasicMaterial({color:'#7ba2a0'}),6,.015,0);ring.rotation.x=-Math.PI/2;
 const actors=[];
 for(let i=0;i<2;i++){
  const source=await loadGLB('knight.glb'),model=source.scene,root=new T.Group(),mount=characterMount(model,1);root.add(mount);scene.add(root);root.position.set(i?8:4,0,0);
  model.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;n.frustumCulled=false;const convert=m=>{const c=m.clone();c.color.multiply(new T.Color(i?'#87bfc7':'#e7be83'));c.roughness=.7;c.metalness=.2;return c;};n.material=Array.isArray(n.material)?n.material.map(convert):convert(n.material);}});
  root.updateMatrixWorld(true);const palm=model.getObjectByName('PalmR');if(palm){const grip=new T.Group();grip.scale.setScalar(1/palm.getWorldScale(new T.Vector3()).x);palm.add(grip);const blade=new T.Mesh(new T.BoxGeometry(.09,.95,.045),iron);blade.position.y=.38;grip.add(blade);const guard=new T.Mesh(new T.BoxGeometry(.3,.06,.08),iron);grip.add(guard);grip.rotation.z=-Math.PI/2;}
  const mixer=new T.AnimationMixer(model),actions={};for(const clip of source.animations)actions[clip.name.split('|').pop()]=mixer.clipAction(clip);
  actors.push({root,mount,model,mixer,actions,key:null,current:null});
 }
 const sparks=[];for(let i=0;i<14;i++){const mesh=add(new T.SphereGeometry(.035,4,3),new T.MeshBasicMaterial({color:'#ffe2a6'}),0,0,0);mesh.visible=false;sparks.push(mesh);}
 let matchId=null,lastEvent=0,burst=0,hitX=6,shake=0,last=performance.now(),frame=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.position.z=Math.max(12,8.5/Math.max(.4,camera.aspect));camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(canvas);resize();
 return {quality(low){renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=!low;resize();},draw(s){const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;if(!s)return;if(matchId!==s.id){matchId=s.id;lastEvent=0;actors.forEach((a,i)=>{a.root.position.x=s.fighters[i].x;a.key=null;});}
  for(const e of s.events)if(e.id>lastEvent){lastEvent=e.id;if(e.type==='hit'||e.type==='block'){hitX=s.fighters[e.target].x;burst=.22;shake=reduced?0:.12;}}
  actors.forEach((a,i)=>{const f=s.fighters[i];a.root.position.x+=(f.x-a.root.position.x)*(1-Math.exp(-dt*26));a.root.position.y=f.y;a.mount.rotation.y=f.facing>0?Math.PI/2:-Math.PI/2;
   const name=f.hp<=0?'Death':f.move==='heavy'||f.move==='special'?'swordAttackJump':f.move?'Run_swordAttack':f.pose==='walk'?'Walking':f.pose==='jump'?'Jump':f.pose==='block'?'Idle_swordLeft':'Idle_swordRight';
   const identity=name+':'+(f.move?s.frame-f.moveFrame:0);if(a.key!==identity){const next=a.actions[name]||a.actions.Idle;if(next!==a.current){next.reset().play();if(a.current)a.current.crossFadeTo(next,.09,false);a.current=next;}else if(f.move)next.reset();a.key=identity;}
   const once=!!f.move||f.hp<=0||f.pose==='jump';a.current.setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity);a.current.clampWhenFinished=true;
   if(f.move){a.current.time=a.current.getClip().duration*f.moveFrame/(MOVES[f.move].startup+MOVES[f.move].active+MOVES[f.move].recovery);a.current.timeScale=0;}else a.current.timeScale=f.pose==='block'?0:1;
   a.mixer.update(dt);a.mount.scale.y=a.mount.scale.x*(f.crouch?.55:1);a.mount.position.y=0;
   a.model.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material]){m.emissive.set(f.flash?'#954a22':'#000000');}});
  });
  burst=Math.max(0,burst-dt);shake=Math.max(0,shake-dt);sparks.forEach((m,i)=>{m.visible=burst>0;const age=.22-burst;m.position.set(hitX+Math.cos(i*2.4)*age*4,1.3+Math.sin(i*2.4)*age*3,.25);});
  const centre=(s.fighters[0].x+s.fighters[1].x)/2;
  const visibleWidth=Math.max(6,Math.abs(s.fighters[0].x-s.fighters[1].x)+3.2);
  const desiredZ=Math.max(7.7,visibleWidth/(2*Math.tan(22*Math.PI/180)*camera.aspect));
  camera.position.z+=(desiredZ-camera.position.z)*(1-Math.exp(-dt*5));
  camera.position.x=centre+(shake?Math.sin(now*.2)*shake:0);camera.lookAt(centre,1.2,0);renderer.render(scene,camera);if(++frame%60===0){canvas.dataset.triangles=String(renderer.info.render.triangles);canvas.dataset.drawCalls=String(renderer.info.render.calls);}canvas.dataset.fighters='2';
 }};
}
