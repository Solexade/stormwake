import * as THREE from '../vendor/three.module.js';
import {PALETTE} from './palette.js';
export function createLighting(renderer,scene){
 const hemi=new THREE.HemisphereLight(PALETTE.skyLight,PALETTE.groundLight,PALETTE.ambient);scene.add(hemi);
 const sun=new THREE.DirectionalLight(PALETTE.sun,PALETTE.sunIntensity);sun.position.set(10,23,13);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-19;sun.shadow.camera.right=19;sun.shadow.camera.top=19;sun.shadow.camera.bottom=-19;sun.shadow.camera.far=70;sun.shadow.radius=3;sun.shadow.normalBias=.018;sun.shadow.bias=-.0003;scene.add(sun,sun.target);
 const rim=new THREE.DirectionalLight(PALETTE.rim,PALETTE.rimIntensity);rim.position.set(-30,15,-35);scene.add(rim);
 // A softly lit studio sky supplies reflections for steel and worn brass.
 const environmentScene=new THREE.Scene();environmentScene.background=new THREE.Color('#b7c6cd');
 const panel=new THREE.Mesh(new THREE.PlaneGeometry(20,12),new THREE.MeshBasicMaterial({color:'#fff0cf',side:THREE.DoubleSide}));panel.position.set(0,7,-10);environmentScene.add(panel);
 const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(environmentScene,.025);scene.environment=environment.texture;scene.environmentIntensity=.4;pmrem.dispose();panel.geometry.dispose();panel.material.dispose();
 const skyMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0}},side:THREE.BackSide,depthWrite:false,vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float time;varying vec3 vDir;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}void main(){vec3 d=normalize(vDir);float up=max(d.y,0.);vec3 c=mix(vec3(.52,.61,.63),vec3(.18,.31,.38),pow(up,.55));vec2 p=d.xz/(up+.22)*2.5+vec2(time*.004,time*.001);float cloud=noise(p)*.55+noise(p*2.1)*.27+noise(p*4.2)*.13;c=mix(c,vec3(.75,.76,.70),smoothstep(.48,.75,cloud)*smoothstep(.02,.2,up)*.75);gl_FragColor=vec4(c,1.);}`});
 const sky=new THREE.Mesh(new THREE.SphereGeometry(140,24,16),skyMaterial);sky.renderOrder=-1;scene.add(sky);
 return {sun,sky,skyMaterial,environment};
}
