import {AUDIO_FILES} from '../public/audio-manifest.js';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ASSETS} from '../public/asset-manifest.js';

export async function validateAssets() {
  for(const [name,asset] of Object.entries(ASSETS)) {
    if(asset.url !== '/assets/'+name || !asset.license || !asset.source) throw Error(`Invalid asset provenance: ${name}`);
    const bytes=await readFile(new URL('../public'+asset.url,import.meta.url));
    if(bytes.length!==asset.bytes || createHash('sha256').update(bytes).digest('hex')!==asset.sha256) throw Error(`Asset hash mismatch: ${name}`);
  }
  for (const asset of Object.values(AUDIO_FILES)) {
    const bytes=await readFile(new URL('../public'+asset.url,import.meta.url));
    if(asset.license!=='CC0-1.0'||!asset.source||bytes.length!==asset.bytes||createHash('sha256').update(bytes).digest('hex')!==asset.sha256) throw Error('Invalid audio asset: '+asset.url);
  }
  async function imports(directory) {
    for(const entry of await readdir(directory,{withFileTypes:true})) {
      const url=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
      if(entry.isDirectory()) { if(entry.name!=='assets') await imports(url); continue; }
      if(!entry.name.endsWith('.js')) continue;
      const text=await readFile(url,'utf8');
      for(const match of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) await readFile(new URL(match[1],url));
    }
  }
  await imports(new URL('../public/',import.meta.url));
  return Object.keys(ASSETS).length;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) console.log(`Verified ${await validateAssets()} local asset hashes and browser imports.`);
