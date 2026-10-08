import * as THREE from './vendor/three.module.js';
// One fullscreen pass, nine bright-neighbour samples; low quality bypasses it.
export function cinematicPass(renderer){
 const supported=renderer.extensions.has('EXT_color_buffer_float');renderer.info.autoReset=false;
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true});
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:target.texture},pixel:{value:new THREE.Vector2(1,1)}},vertexShader:`varying vec2 uvScreen;void main(){uvScreen=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
 uniform sampler2D source;uniform vec2 pixel;varying vec2 uvScreen;
 void main(){vec3 c=texture2D(source,uvScreen).rgb;vec3 glow=vec3(0.);
 for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec3 n=texture2D(source,uvScreen+vec2(float(x),float(y))*pixel*3.).rgb;glow+=max(n-vec3(1.1),vec3(0.))/9.;}
 c+=glow*.12;float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,.96);
 c*=mix(vec3(.97,1.,1.025),vec3(1.025,1.005,.975),smoothstep(.1,1.5,l));
 gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const scene=new THREE.Scene(),camera=new THREE.Camera();scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
 const size=new THREE.Vector2();
 return {render(world,view,enabled){renderer.info.reset();if(!enabled||!supported){renderer.render(world,view);return;}renderer.getDrawingBufferSize(size);if(target.width!==size.x||target.height!==size.y){target.setSize(size.x,size.y);material.uniforms.pixel.value.set(1/size.x,1/size.y);}renderer.setRenderTarget(target);renderer.render(world,view);renderer.setRenderTarget(null);renderer.render(scene,camera);}};
}
