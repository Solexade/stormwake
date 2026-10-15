import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssetCache} from '../public/scene/asset-cache.js';
import {qualityPreset,createFrameMeter,frameStatistics} from '../public/scene/quality.js';
import {shorelineSegments} from '../public/scene/harbour.js';
import {LAND,landAt,HOME,SHRINE,BOSS,walkable} from '../public/world.js';
import {validateAssets} from '../scripts/check-assets.mjs';

test('GLB source cache deduplicates concurrent loads and permits retry after failure',async()=>{
  let calls=0;
  const cache=createAssetCache(async()=>{calls++;if(calls===1)throw Error('offline');return {ok:true};});
  const first=cache('hero');assert.equal(first,cache('hero'));
  await assert.rejects(first,/offline/);
  assert.deepEqual(await cache('hero'),{ok:true});assert.equal(calls,2);
  await cache('hero');assert.equal(calls,2);
});

test('shore ribbon samples stay outside land and never mutate gameplay coordinates',()=>{
  const before=JSON.stringify(LAND),segments=shorelineSegments();
  assert.ok(segments.length>30);
  for(const p of segments){assert.equal(landAt(p.x*40,p.z*40),false);assert.ok(p.length>0&&p.length<=.5);}
  assert.equal(JSON.stringify(LAND),before);
  for(const p of [HOME,SHRINE,BOSS])assert.equal(walkable(p.x,p.y),true);
});

test('Performance preset removes optional shore/shadow/post cost without changing simulation',()=>{
  const low=qualityPreset('low');assert.equal(low.pixelRatio,1);assert.equal(low.shadows,false);assert.equal(low.bloom,false);assert.equal(low.shore,false);
  assert.equal(qualityPreset('unknown'),qualityPreset('high'));
});

test('frame statistics include slow frames, bound history and exclude suspended-tab gaps',()=>{
  assert.equal(frameStatistics([10,10,10,40]).p95Ms,40);
  const meter=createFrameMeter(3);for(const t of [0,10,20,60,70,2070]){meter.begin(t);meter.end(4);}
  assert.equal(meter.read().frame.samples,3);assert.equal(meter.read().frame.p95Ms,40);
  meter.reset();assert.equal(meter.read().frame.samples,0);
});

test('every shipped asset has matching provenance/hash and every browser import resolves',async()=>{
  assert.equal(await validateAssets(),11);
});
