import test from 'node:test';
import assert from 'node:assert/strict';
import {AdventureAudio} from '../public/audio.js';
test('music toggle preserves footsteps and hidden tabs suspend playback',()=>{
 const a=new AdventureAudio(),notes=[],effects=[];a.enabled=true;
 a.ctx={currentTime:1,state:'running',suspend(){this.state='suspended';}};
 a.note=(...n)=>notes.push(n);a.noise=(...n)=>effects.push(n);
 a.update({vx:310,vy:0},true,false,false);
 assert.ok(notes.length>0);assert.equal(effects.length,1);
 a.music=false;a.ctx.currentTime=2;const count=notes.length;
 a.update({vx:310,vy:0},true,false,false);
 assert.equal(notes.length,count);assert.equal(effects.length,2);
 a.update(null,false,false,true);assert.equal(a.ctx.state,'suspended');
});
