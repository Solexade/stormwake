// Repack the first static model from Poly Haven's verified 1K glTF exports.
// Does not generate geometry or recompress textures. Source files live outside repo.
import fs from 'node:fs';
import crypto from 'node:crypto';
const manifestFile='public/asset-manifest.js';
const {ASSETS}=await import('../public/asset-manifest.js');const manifest={...ASSETS};
for(const [id,author] of [['boulder_01','Rico Cilliers'],['wooden_barrels_01','James Ray Cock']]){
 const dir='../asset-acquisition/'+id,source=JSON.parse(fs.readFileSync(dir+'/source.gltf'));
 const binary=fs.readFileSync(dir+'/'+source.buffers[0].uri),chunks=[],views=[];let offset=0;
 const append=(data,extra={})=>{const index=views.length;views.push({buffer:0,byteOffset:offset,byteLength:data.length,...extra});const pad=Buffer.alloc((4-data.length%4)%4);chunks.push(data,pad);offset+=data.length+pad.length;return index;};
 for(const view of source.bufferViews.slice(0,4))append(binary.subarray(view.byteOffset,view.byteOffset+view.byteLength),view.target?{target:view.target}:{});
 const images=source.images.slice(0,3).map(image=>({name:image.name,mimeType:'image/jpeg',bufferView:append(fs.readFileSync(dir+'/'+image.uri))}));
 const material=source.materials[0];material.occlusionTexture={index:2,strength:1};material.doubleSided=false;
 const doc={asset:{version:'2.0',generator:'Stormwake lossless glTF container repack; source '+source.asset.generator},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,name:id}],meshes:[source.meshes[0]],materials:[material],textures:source.textures.slice(0,3),samplers:source.samplers,images,accessors:source.accessors.slice(0,4),bufferViews:views,buffers:[{byteLength:offset}]};
 let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const bin=Buffer.concat(chunks),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);jh.writeUInt32LE(json.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
 const output=Buffer.concat([header,jh,json,bh,bin]),name=id+'.glb';fs.writeFileSync('public/assets/'+name,output);
 const item={url:'/assets/'+name,type:'glb',pbr:true,bytes:output.length,sha256:crypto.createHash('sha256').update(output).digest('hex'),license:'CC0-1.0',creator:author,source:'https://polyhaven.com/a/'+id,provenance:'Downloaded 2026-10-16; every source file verified against Poly Haven API MD5',conversion:'First mesh only; original vertices and 1K JPEG textures; packed self-contained GLB; ARM red channel used for AO; removed unused assets and source layout translation'};
 manifest[name]=item;
 console.log(name,output.length,'triangles',doc.accessors[3].count/3);
}
fs.writeFileSync(manifestFile,'// Local licensed assets; checked by the build.\nexport const ASSETS=Object.freeze('+JSON.stringify(manifest,null,2)+');\n');
fs.mkdirSync('docs/asset-provenance',{recursive:true});for(const id of ['boulder_01','wooden_barrels_01'])fs.copyFileSync('../asset-acquisition/'+id+'-source.json','docs/asset-provenance/'+id+'.json');
