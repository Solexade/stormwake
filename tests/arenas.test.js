import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENAS} from '../public/arenas.js';
import {createRun,tick} from '../public/combat.js';
import {walkable} from '../public/world.js';
import {newDb} from 'pg-mem';
import {schema} from '../cloud/store.js';
import {dispatch,openSession,persist} from '../cloud/game-service.js';
test('each arena has a distinct safe spawn and spawns survival enemies',()=>{
 assert.equal(new Set(ARENAS.map(a=>a.x+','+a.y)).size,4);
 for(const arena of ARENAS){const s=createRun(arena.id,1000,{mode:'survival',arena:arena.id});assert.equal(s.arenaId,arena.id);assert.equal(s.player.x,arena.x);assert.equal(s.player.y,arena.y);assert.ok(walkable(s.player.x,s.player.y,22));for(let i=0;i<80;i++)tick(s,.03,1000+i*30);assert.equal(s.wave,1);assert.ok(s.enemies.length>0);assert.ok(s.enemies.every(e=>walkable(e.x,e.y,18)));}
 const fallback=createRun('forged',1000,{mode:'survival',arena:'__proto__',x:99999});assert.equal(fallback.arenaId,'coast');assert.equal(fallback.player.x,465);
});
test('cloud validates arena selection, preserves active run and persists its location',async()=>{
 const db=newDb(),{Pool}=db.adapters.createPg(),pool=new Pool();await pool.query(schema);const c=await pool.connect();
 try{const ctx=await openSession(c);await dispatch(c,ctx,'profile',{name:'Arena QA'});let r=await dispatch(c,ctx,'start',{arena:'reach'});assert.equal(r.run.arenaId,'reach');assert.equal(r.run.player.x,4300);const id=r.run.id;r=await dispatch(c,ctx,'start',{arena:'city'});assert.equal(r.run.id,id);assert.equal(r.run.arenaId,'reach');await persist(c,ctx.p);const restored=await openSession(c,ctx.cookie);assert.equal(restored.p.run.arenaId,'reach');ctx.p.run.status='dead';r=await dispatch(c,ctx,'start',{arena:'city'});assert.equal(r.run.arenaId,'city');assert.equal(r.run.player.x,1850);}finally{c.release();await pool.end();}
});
