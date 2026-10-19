import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const out='../asset-acquisition';await fs.mkdir(out,{recursive:true});
for(const id of ['boulder_01','wooden_barrels_01']){
 const res=await fetch('https://api.polyhaven.com/files/'+id);if(!res.ok)throw Error(res.status);const metadata=await res.json(),entry=metadata.gltf['1k'].gltf;
 await fs.writeFile(out+'/'+id+'-source.json',JSON.stringify(entry,null,2));
 const dir=out+'/'+id;await fs.mkdir(dir+'/textures',{recursive:true});
 const downloads=[['source.gltf',entry],...Object.entries(entry.include)];
 await Promise.all(downloads.map(async([name,file])=>{const target=dir+'/'+name;let data;try{data=await fs.readFile(target)}catch{}if(!data||crypto.createHash('md5').update(data).digest('hex')!==file.md5){const r=await fetch(file.url);if(!r.ok)throw Error(file.url+': '+r.status);data=Buffer.from(await r.arrayBuffer());if(crypto.createHash('md5').update(data).digest('hex')!==file.md5)throw Error('Checksum '+name);await fs.writeFile(target,data);} }));
 const gltf=JSON.parse(await fs.readFile(dir+'/source.gltf','utf8'));console.log(id,JSON.stringify({nodes:gltf.nodes,meshes:gltf.meshes.map(m=>({name:m.name,primitives:m.primitives.map(p=>({material:p.material,indices:p.indices}))})),materials:gltf.materials.map(m=>m.name)}));
}
