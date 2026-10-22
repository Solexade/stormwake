import test from 'node:test';
import assert from 'node:assert/strict';
import {ArcadeAudio,renderBattleChant} from '../public/arcade/audio.js';
test('Arcade audio deduplicates authoritative hits, skips history and muted events',()=>{
 const a=new ArcadeAudio({document:{hidden:false}}),heard=[];a.enabled=true;a.impact=(...v)=>heard.push(v);a.say=()=>{};a.tone=()=>{};
 const s={id:'a',eventId:1,phase:'fight',events:[{id:1,type:'hit'}]};a.update(s,0);assert.equal(heard.length,0);
 s.eventId=2;s.events.push({id:2,type:'hit',combo:2});a.update(s,0);a.update(s,0);assert.deepEqual(heard,[[false,2]]);
 a.enabled=false;s.eventId=3;s.events.push({id:3,type:'block'});a.update(s,0);a.enabled=true;a.update(s,0);assert.equal(heard.length,1);
 a.host.document.hidden=true;s.eventId=4;s.events.push({id:4,type:'hit'});a.update(s,0);a.host.document.hidden=false;a.update(s,0);assert.equal(heard.length,1);
});

test('music toggle leaves SFX enabled and stop suspends sampled audio',()=>{
 const a=new ArcadeAudio({}),calls=[];a.enabled=true;
 a.mixer.setMusic=v=>calls.push(['music',v]);a.mixer.setScene=(...v)=>calls.push(v);
 a.setMusic(false);assert.equal(a.enabled,true);a.stop();assert.deepEqual(calls,[['music',false],['combat',false]]);
});

test('battle chant loop is deterministic, bounded, non-silent and seamless at edges',()=>{
 const a=renderBattleChant(8000),b=renderBattleChant(8000);assert.equal(a.length,120000);assert.deepEqual(a,b);
 let peak=0,energy=0;for(const x of a){assert.ok(Number.isFinite(x));peak=Math.max(peak,Math.abs(x));energy+=x*x;}
 assert.ok(peak>.2&&peak<1);assert.ok(energy/a.length>.001);assert.equal(Math.abs(a[0]),0);assert.equal(Math.abs(a.at(-1)),0);
});

