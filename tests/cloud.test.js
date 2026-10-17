import test from 'node:test';
import assert from 'node:assert/strict';
import {newDb} from 'pg-mem';
import {schema} from '../cloud/store.js';
import {dispatch,openSession,persist,advance} from '../cloud/game-service.js';
test('cloud storage restores runs, records purchases and awards extraction only once',async()=>{
 const db=newDb(),{Pool}=db.adapters.createPg(),pool=new Pool();await pool.query(schema);const c=await pool.connect();
 const ctx=await openSession(c);const cookie=ctx.cookie;await persist(c,ctx.p);
 await dispatch(c,ctx,'profile',{name:'Arcade voyager'});await dispatch(c,ctx,'start');await dispatch(c,ctx,'input',{dx:1,score:999999,hp:9999});assert.equal(ctx.p.run.score,0);assert.equal(ctx.p.run.player.hp,120);await persist(c,ctx.p);
 const recovered=await openSession(c,cookie);assert.equal(recovered.p.run.id,ctx.p.run.id);assert.equal(recovered.p.id,ctx.p.id);
 await dispatch(c,recovered,'safehouse/enter');recovered.p.salvage=200;
 await dispatch(c,recovered,'shop/buy',{item:'axe',cost:0});assert.equal(recovered.p.salvage,140);assert.equal(recovered.p.gear.axe,1);
 await dispatch(c,recovered,'weapon/equip',{weapon:'sword'});assert.equal(recovered.p.run.player.weapon,'sword');
 recovered.p.run.status='won';recovered.p.run.score=123;recovered.p.run.salvage=80;await advance(c,recovered.p);await advance(c,recovered.p);assert.equal(recovered.p.wins,1);assert.equal(recovered.p.salvage,220);
 const history=await dispatch(c,recovered,'history',{},'GET');assert.ok(history.records.some(r=>r.kind==='purchase'));assert.equal(history.records.filter(r=>r.kind==='expedition').length,1);
 await persist(c,recovered.p);c.release();await pool.end();
});

test('guest recovery restores server progress without wallet access or merging profiles',async()=>{
 const db=newDb(),{Pool}=db.adapters.createPg(),pool=new Pool();await pool.query(schema);const c=await pool.connect();
 const original=await openSession(c);await dispatch(c,original,'profile',{name:'Saved voyager'});original.p.salvage=140;original.p.gear={weapon:'spear',axe:2};await dispatch(c,original,'start');await persist(c,original.p);
 const {key}=await dispatch(c,original,'save/key');assert.match(key,/^SW-[0-9a-f]{64}$/);
 const guest=await openSession(c);const otherId=guest.p.id;
 await assert.rejects(()=>dispatch(c,guest,'save/restore',{key:'SW-'+'0'.repeat(64)}),{status:401});assert.equal(guest.p.id,otherId);
 const restored=await dispatch(c,guest,'save/restore',{key});assert.equal(restored.player.id,original.p.id);assert.equal(restored.player.salvage,140);assert.equal(restored.player.gear.axe,2);assert.equal(restored.run.id,original.p.run.id);
 await persist(c,guest.p);const again=await openSession(c,guest.cookie);assert.equal(again.p.id,original.p.id);
 const rows=(await c.query('SELECT token,expires FROM stormwake_sessions')).rows;assert.ok(rows.every(r=>!key.includes(r.token)));assert.ok(rows.every(r=>Number(r.expires)>Date.now()+300*86400000));
 for(const route of ['arrival/challenge','arrival/verify'])await assert.rejects(()=>dispatch(c,guest,route,{}),{status:410});
 assert.equal(guest.p.salvage,140);c.release();await pool.end();
});

test('username entry creates a free profile without granting access by name',async()=>{
 const db=newDb(),{Pool}=db.adapters.createPg(),pool=new Pool();await pool.query(schema);const c=await pool.connect();
 try{
  const ctx=await openSession(c);assert.equal(ctx.p.usernameCreated,false);
  await assert.rejects(()=>dispatch(c,ctx,'start'),{status:400});
  for(const name of ['ab','<script>','x'.repeat(19),'   '])await assert.rejects(()=>dispatch(c,ctx,'profile',{name}),{status:400});
  const named=await dispatch(c,ctx,'profile',{name:'  Free Hero  '});assert.equal(named.player.name,'Free Hero');assert.equal(named.player.usernameCreated,true);assert.equal('wallet' in named.player,false);
  const started=await dispatch(c,ctx,'start');assert.equal(started.run.status,'active');ctx.p.salvage=170;ctx.p.gear={axe:2};await persist(c,ctx.p);
  const returning=await openSession(c,ctx.cookie);assert.equal(returning.p.id,ctx.p.id);assert.equal(returning.p.usernameCreated,true);assert.equal(returning.p.salvage,170);
  const stranger=await openSession(c);await dispatch(c,stranger,'profile',{name:'Free Hero'});assert.notEqual(stranger.p.id,ctx.p.id);assert.equal(stranger.p.salvage,0);
  for(const route of ['auth/challenge','auth/verify','arrival/challenge','arrival/verify'])await assert.rejects(()=>dispatch(c,ctx,route,{}),{status:410});
  assert.equal(ctx.p.salvage,170);assert.equal(ctx.p.gear.axe,2);
  // Legacy wallet-backed saves still work through their cookie or recovery key.
  ctx.p.wallet='0x'+'1'.repeat(40);delete ctx.p.usernameCreated;await persist(c,ctx.p);
  const legacy=await openSession(c,ctx.cookie);await dispatch(c,legacy,'profile',{name:'Free Hero'});await persist(c,legacy.p);
  const {key}=await dispatch(c,legacy,'save/key');const restored=await dispatch(c,stranger,'save/restore',{key});assert.equal(restored.player.id,ctx.p.id);assert.equal(restored.player.usernameCreated,true);assert.equal(restored.player.salvage,170);assert.equal(restored.player.gear.axe,2);
 }finally{c.release();await pool.end();}
});
