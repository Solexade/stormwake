import * as THREE from '../vendor/three.module.js';
import {LAND,WORLD,inside} from '../world.js';
import {WORLD_TRAILS} from '../voyage-data.js';

const SCALE=1/40;
const WIDTH=WORLD.width*SCALE, DEPTH=WORLD.height*SCALE, RANGE=5;
const isLand=(x,z)=>LAND.some(poly=>inside(x,z,poly));
let cachedSegments;

// Split long edges before checking for overlap with neighbouring land polygons.
export function exposedCoast(){
 if(cachedSegments)return cachedSegments;
 const segments=[];
 for(const polygon of LAND)for(let edge=0;edge<polygon.length;edge++){
  const a=polygon[edge],b=polygon[(edge+1)%polygon.length];
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  const pieces=Math.ceil(length/19);
  for(let i=0;i<pieces;i++){
   const fraction=(i+.5)/pieces,x=a[0]+dx*fraction,z=a[1]+dz*fraction;
   let nx=dz/length,nz=-dx/length;
   if(inside(x+nx*2,z+nz*2,polygon)){nx=-nx;nz=-nz;}
   if(isLand(x+nx*3,z+nz*3))continue;
   segments.push({
    x:(a[0]+dx*i/pieces)*SCALE,z:(a[1]+dz*i/pieces)*SCALE,
    dx:dx/pieces*SCALE,dz:dz/pieces*SCALE,nx,nz
   });
  }
 }
 cachedSegments=segments;
 return segments;
}

export function worldCoastTexture(){
 const cols=512,rows=256, data=new Uint8Array(cols*rows*4);
 for(let i=0;i<data.length;i+=4){data[i]=255;data[i+1]=255;data[i+3]=255;}
 const sx=(cols-1)/WIDTH,sz=(rows-1)/DEPTH;
 function stamp(edge,channel,range){
  const {x,z,dx,dz}=edge,length2=dx*dx+dz*dz;
  const minX=Math.max(0,Math.floor((Math.min(x,x+dx)-range)*sx));
  const maxX=Math.min(cols-1,Math.ceil((Math.max(x,x+dx)+range)*sx));
  const minZ=Math.max(0,Math.floor((Math.min(z,z+dz)-range)*sz));
  const maxZ=Math.min(rows-1,Math.ceil((Math.max(z,z+dz)+range)*sz));
  for(let iz=minZ;iz<=maxZ;iz++)for(let ix=minX;ix<=maxX;ix++){
   const ox=ix/sx-x,oz=iz/sz-z,t=THREE.MathUtils.clamp((ox*dx+oz*dz)/length2,0,1);
   const distance=Math.hypot(ox-t*dx,oz-t*dz),index=(iz*cols+ix)*4+channel;
   data[index]=Math.min(data[index],Math.round(distance/range*255));
  }
 }
 for(const edge of exposedCoast())stamp(edge,0,RANGE);
 for(const trail of WORLD_TRAILS)for(let i=1;i<trail.length;i++){
  const [x,z]=trail[i-1],[endX,endZ]=trail[i];
  stamp({x:x*SCALE,z:z*SCALE,dx:(endX-x)*SCALE,dz:(endZ-z)*SCALE},1,2);
 }
 const texture=new THREE.DataTexture(data,cols,rows);
 texture.minFilter=texture.magFilter=THREE.LinearFilter;
 texture.needsUpdate=true;
 return texture;
}

export const worldCoastGLSL=`uniform sampler2D coastMap;
vec2 coastalMasks(vec2 p){
 vec2 uv=p/vec2(${WIDTH.toFixed(3)},${DEPTH.toFixed(3)});
 if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))return vec2(5.,2.);
 return texture2D(coastMap,uv).rg*vec2(5.,2.);
}
float shoreDistance(vec2 p){return coastalMasks(p).r;}`;

export function coastApronGeometry(){
 const vertices=[],uv=[];
 const put=([x,y,z])=>{vertices.push(x,y,z);uv.push(x*.42,z*.42);};
 for(const e of exposedCoast()){
  const width=1.65+.32*Math.sin(e.x*.9+e.z*.5);
  const near=(x,z)=>[x,-.035,z];
  const far=(x,z)=>{
   for(const span of [width,width*.45,.1]){
    const sx=x+e.nx*span,sz=z+e.nz*span;
    if(!isLand(sx/SCALE,sz/SCALE))return [sx,-1.02,sz];
   }
   return [x,-1.02,z];
  };
  const a=near(e.x,e.z),b=near(e.x+e.dx,e.z+e.dz);
  const c=far(e.x,e.z),d=far(e.x+e.dx,e.z+e.dz);
  [a,b,c,b,d,c].forEach(put);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.computeVertexNormals();
 return geometry;
}

export function createCoastalWater(coastMap){
 const uniforms={time:{value:0},coastMap:{value:coastMap},detail:{value:1}};
 return new THREE.ShaderMaterial({
  uniforms,transparent:true,depthWrite:false,
  vertexShader:`
   ${worldCoastGLSL}
   uniform float time;
   varying vec3 surface;
   void main(){
    vec4 world=modelMatrix*vec4(position,1.);
    vec2 q=world.xz;
    float shore=shoreDistance(q);
    float swell=sin(dot(q,vec2(.36,.19))-time*1.15)*.12
              +sin(dot(q,vec2(-.24,.47))-time*.94)*.07;
    world.y+=swell*mix(.22,1.,smoothstep(.3,4.,shore));
    surface=world.xyz;
    gl_Position=projectionMatrix*viewMatrix*world;
   }`,
  fragmentShader:`
   ${worldCoastGLSL}
   uniform float time,detail;
   varying vec3 surface;
   void main(){
    vec2 q=surface.xz, a=vec2(.36,.19),b=vec2(-.24,.47);
    float shore=shoreDistance(q);
    float fade=1.-smoothstep(24.,78.,length(cameraPosition-surface));
    vec2 slope=.12*a*cos(dot(q,a)-time*1.15)+.07*b*cos(dot(q,b)-time*.94);
    vec2 ripple=q+vec2(sin(q.y*.41+time*.25),cos(q.x*.31-time*.18))*.72;
    slope+=vec2(.031,.018)*cos(dot(ripple,vec2(1.9,1.08))+time*1.55);
    slope+=vec2(-.011,.024)*cos(dot(ripple,vec2(-1.45,2.05))-time*1.22);
    slope+=fade*detail*(vec2(-.036,.043)*cos(dot(ripple,vec2(-2.4,2.8))-time*2.4)
            +vec2(.021,.018)*cos(dot(ripple,vec2(6.,5.1))+time*3.2));
    vec3 n=normalize(vec3(-slope.x,1.,-slope.y)),v=normalize(cameraPosition-surface);
    vec3 reflection=reflect(-v,n);
    float fresnel=.027+.973*pow(1.-max(dot(n,v),0.),5.);
    vec3 sky=mix(vec3(.32,.44,.49),vec3(.16,.32,.48),smoothstep(.0,.75,reflection.y));
    float cloud=sin(reflection.x*6.+reflection.z*3.+sin(reflection.y*6.))*sin(reflection.z*7.-reflection.x*2.);
    sky+=smoothstep(.25,.85,cloud)*vec3(.09,.087,.074);
    float shoal=1.-smoothstep(.18,4.8,shore);
    float caustic=pow(1.-abs(sin(dot(q,vec2(3.8,-5.2))+sin(q.y*2.+time*.5))),10.);
    caustic*=.45+.55*sin(dot(q,vec2(4.2,3.3))-time*.6)*sin(dot(q,vec2(4.2,3.3))-time*.6);
    vec3 sea=mix(vec3(.018,.085,.126),vec3(.087,.25,.205),shoal);
    sea+=caustic*shoal*fade*detail*vec3(.045,.062,.049);
    vec3 colour=mix(sea,sky,fresnel);
    float runup=.29+.19*sin(time*1.65+q.x*.62-q.y*.53);
    float broken=smoothstep(-.25,.66,sin(q.x*7.+q.y*5.+time*.7)*sin(q.x*4.-q.y*8.));
    float edge=(1.-smoothstep(.04,.24,abs(shore-runup)))*(.34+.66*broken);
    float backwash=(1.-smoothstep(.06,.34,abs(shore-runup-.51)))*broken*.28;
    colour=mix(colour,vec3(.67,.77,.71),clamp((edge+backwash)*.69,0.,.65));
    vec3 light=normalize(vec3(-.44,.73,.49));
    float specular=pow(max(dot(n,normalize(v+light)),0.),88.);
    colour+=specular*vec3(.47,.42,.30);
    float haze=1.-exp(-length(cameraPosition-surface)*.009);
    colour=mix(colour,vec3(.32,.43,.48),haze*.48);
    float alpha=mix(1.,.65,shoal*shoal*(1.-fresnel));
    gl_FragColor=vec4(colour,max(alpha,edge*.8));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }
   `
 });
}
