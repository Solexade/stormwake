// Offline only. npm meshoptimizer is installed outside the game dependency tree.
import fs from 'node:fs';
import {MeshoptSimplifier as M} from '../../survival-acquisition/optimizer/node_modules/meshoptimizer/index.js';
await M.ready;
const root='../survival-acquisition/pine/',src=JSON.parse(fs.readFileSync(root+'pine.gltf')),bin=fs.readFileSync(root+'pine_tree_01.bin');
function array(id){const a=src.accessors[id],v=src.bufferViews[a.bufferView],T={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array}[a.componentType],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];if(v.byteStride)throw Error('Unexpected stride');return new T(bin.buffer,bin.byteOffset+(v.byteOffset||0)+(a.byteOffset||0),a.count*n);}
for(const [level,budget] of [['high',90000],['medium',22000]]){
 const views=[],accessors=[],chunks=[];let offset=0,total=0;
 function append(b){const id=views.length;views.push({buffer:0,byteOffset:offset,byteLength:b.length});chunks.push(b,Buffer.alloc((4-b.length%4)%4));offset+=b.length+(4-b.length%4)%4;return id;}
 function attr(a,template){const id=accessors.length;const {bufferView,byteOffset,min,max,...rest}=template;const n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[rest.type];accessors.push({...rest,bufferView:append(Buffer.from(a.buffer,a.byteOffset,a.byteLength)),count:a.length/n});return id;}
 const primitives=[];
 for(const p of src.meshes[1].primitives){const pos=array(p.attributes.POSITION),input=Uint32Array.from(array(p.indices)),target=p.material===2?budget:Math.min(6000,input.length/3);
 const [indices,error]=M.simplifySloppy(input,pos,3,null,target*3,1);console.log(level,p.material,input.length/3,'->',indices.length/3,'error',error);if(!indices.length)throw Error('Empty simplification');
 const remap=new Map(),old=[];const compact=Uint32Array.from(indices,i=>{if(!remap.has(i)){remap.set(i,old.length);old.push(i);}return remap.get(i);});const attributes={};
 for(const key of ['POSITION','NORMAL','TEXCOORD_0']){const id=p.attributes[key];if(id===undefined)continue;const a=array(id),n=key==='TEXCOORD_0'?2:3,out=new Float32Array(old.length*n);old.forEach((j,i)=>out.set(a.subarray(j*n,j*n+n),i*n));attributes[key]=attr(out,src.accessors[id]);if(key==='POSITION'){accessors[attributes[key]].min=[0,1,2].map(k=>{let m=Infinity;for(let i=k;i<out.length;i+=3)m=Math.min(m,out[i]);return m;});accessors[attributes[key]].max=[0,1,2].map(k=>{let m=-Infinity;for(let i=k;i<out.length;i+=3)m=Math.max(m,out[i]);return m;});}}
 primitives.push({attributes,indices:attr(compact,{componentType:5125,type:'SCALAR'}),material:p.material});total+=compact.length/3;
 }
 const images=src.images.map(i=>({name:i.name,mimeType:'image/jpeg',bufferView:append(fs.readFileSync(root+i.uri))}));
 const materials=structuredClone(src.materials);for(const m of materials){const arm=m.pbrMetallicRoughness?.metallicRoughnessTexture;if(arm)m.occlusionTexture={...arm};m.doubleSided=true;}
 const doc={asset:{version:'2.0',generator:'Stormwake meshoptimizer offline LOD'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives}],materials,textures:src.textures,samplers:src.samplers,images,accessors,bufferViews:views,buffers:[{byteLength:offset}]};let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const data=Buffer.concat(chunks),head=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+json.length+data.length,8);jh.writeUInt32LE(json.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(data.length);bh.writeUInt32LE(0x004e4942,4);const out=Buffer.concat([head,jh,json,bh,data]);fs.writeFileSync('public/assets/pine_tree_01_'+level+'.glb',out);console.log('RESULT',level,total,out.length);
}
