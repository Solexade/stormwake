import * as T from '../vendor/three.module.js';
import {createFighter,animateFighter} from './fighters.js';
import {heroById} from './catalog.js';

// A view of the actual playable asset, rather than promotional character art.
export function createHeroPreview(canvas) {
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.1,30);
 camera.position.set(0,1.25,4.4);camera.lookAt(0,1.05,0);
 scene.add(new T.HemisphereLight('#bddfff','#37304b',2.5));
 const sun=new T.DirectionalLight('#ffe3c3',3);sun.position.set(-3,5,4);scene.add(sun);
 const rim=new T.DirectionalLight('#64dbe9',2);rim.position.set(3,2,-2);scene.add(rim);
 let actor=null,version=0,last=performance.now();
 const resize=()=>{const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();};
 new ResizeObserver(resize).observe(canvas);resize();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function frame(){requestAnimationFrame(frame);const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
  if(document.hidden||document.body.classList.contains('fighting'))return;
  if(actor){animateFighter(actor,{x:0,y:0,facing:1,hp:100,pose:'idle'},reduced?0:dt,0);actor.mount.rotation.y=.25;}
  renderer.render(scene,camera);
 }
 requestAnimationFrame(frame);
 return {async select(id){const request=++version;canvas.setAttribute('aria-label','Loading '+heroById(id).name);const next=await createFighter(scene,0,id);
  if(request!==version){next.root.removeFromParent();return;}
  if(actor)actor.root.removeFromParent();actor=next;canvas.setAttribute('aria-label',heroById(id).name+' playable character preview');canvas.dataset.hero=id;
 }};
}
