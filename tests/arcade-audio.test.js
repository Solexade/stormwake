import test from 'node:test';
import assert from 'node:assert/strict';
import {ArcadeAudio} from '../public/arcade/audio.js';
test('Arcade audio deduplicates authoritative hits, skips history and muted events',()=>{
 const a=new ArcadeAudio({document:{hidden:false}}),heard=[];a.enabled=true;a.impact=(...v)=>heard.push(v);a.say=()=>{};a.tone=()=>{};
 const s={id:'a',eventId:1,phase:'fight',events:[{id:1,type:'hit'}]};a.update(s,0);assert.equal(heard.length,0);
 s.eventId=2;s.events.push({id:2,type:'hit',combo:2});a.update(s,0);a.update(s,0);assert.deepEqual(heard,[[false,2]]);
 a.enabled=false;s.eventId=3;s.events.push({id:3,type:'block'});a.update(s,0);a.enabled=true;a.update(s,0);assert.equal(heard.length,1);
 a.host.document.hidden=true;s.eventId=4;s.events.push({id:4,type:'hit'});a.update(s,0);a.host.document.hidden=false;a.update(s,0);assert.equal(heard.length,1);
});
