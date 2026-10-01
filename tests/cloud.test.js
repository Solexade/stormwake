import test from 'node:test';
import assert from 'node:assert/strict';
import {newDb} from 'pg-mem';
import {schema} from '../cloud/store.js';
import {dispatch,openSession,persist,advance} from '../cloud/game-service.js';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
test('cloud storage restores runs, records purchases and awards extraction only once',async()=>{
 const db=newDb(),{Pool}=db.adapters.createPg(),pool=new Pool();await pool.query(schema);const c=await pool.connect();
 const ctx=await openSession(c);const cookie=ctx.cookie;await persist(c,ctx.p);
 await dispatch(c,ctx,'start');await dispatch(c,ctx,'input',{dx:1,score:999999,hp:9999});assert.equal(ctx.p.run.score,0);assert.equal(ctx.p.run.player.hp,120);await persist(c,ctx.p);
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
 const original=await openSession(c);original.p.name='Saved voyager';original.p.salvage=140;original.p.gear={weapon:'spear',axe:2};await dispatch(c,original,'start');await persist(c,original.p);
 const {key}=await dispatch(c,original,'save/key');assert.match(key,/^SW-[0-9a-f]{64}$/);
 const guest=await openSession(c);const otherId=guest.p.id;
 await assert.rejects(()=>dispatch(c,guest,'save/restore',{key:'SW-'+'0'.repeat(64)}),{status:401});assert.equal(guest.p.id,otherId);
 const restored=await dispatch(c,guest,'save/restore',{key});assert.equal(restored.player.id,original.p.id);assert.equal(restored.player.salvage,140);assert.equal(restored.player.gear.axe,2);assert.equal(restored.run.id,original.p.run.id);
 await persist(c,guest.p);const again=await openSession(c,guest.cookie);assert.equal(again.p.id,original.p.id);
 const rows=(await c.query('SELECT token,expires FROM stormwake_sessions')).rows;assert.ok(rows.every(r=>!key.includes(r.token)));assert.ok(rows.every(r=>Number(r.expires)>Date.now()+300*86400000));
 for(const route of ['arrival/challenge','arrival/verify'])await assert.rejects(()=>dispatch(c,guest,route,{}),{status:410});
 assert.equal(guest.p.salvage,140);c.release();await pool.end();
});

test('optional wallet sign-in keeps inventory, revokes old guest access and restores after logout',async()=>{
 const db=newDb(),{Pool}=db.adapters.createPg(),pool=new Pool();await pool.query(schema);const c=await pool.connect();
 const ctx=await openSession(c),oldCookie=ctx.cookie;ctx.p.salvage=170;ctx.p.gear={axe:2};await dispatch(c,ctx,'start');await dispatch(c,ctx,'pause',{paused:true});await persist(c,ctx.p);
 const oldKey=(await dispatch(c,ctx,'save/key')).key,account=privateKeyToAccount(generatePrivateKey()),id=ctx.p.id,runId=ctx.p.run.id;
 const challenge=await dispatch(c,ctx,'auth/challenge',{address:account.address},'POST','https://stormwake.example');
 const signature=await account.signMessage({message:challenge.message});await dispatch(c,ctx,'auth/verify',{nonce:challenge.nonce,signature});await persist(c,ctx.p);
 assert.equal(ctx.p.id,id);assert.equal(ctx.p.salvage,170);assert.equal(ctx.p.gear.axe,2);assert.equal(ctx.p.wallet,account.address.toLowerCase());
 await assert.rejects(()=>dispatch(c,ctx,'auth/verify',{nonce:challenge.nonce,signature}),{status:401});
 const other=await openSession(c,oldCookie);assert.notEqual(other.p.id,id);await assert.rejects(()=>dispatch(c,other,'save/restore',{key:oldKey}),{status:401});
 const newKey=(await dispatch(c,ctx,'save/key')).key;const recovered=await dispatch(c,other,'save/restore',{key:newKey});assert.equal(recovered.player.id,id);
 await dispatch(c,ctx,'auth/logout');await persist(c,ctx.p);assert.equal(ctx.p.run.status,'active');assert.equal(ctx.p.run.paused,true);
 const guest=await openSession(c);guest.p.salvage=500;
 const next=await dispatch(c,guest,'auth/challenge',{address:account.address},'POST','https://stormwake.example');const sig=await account.signMessage({message:next.message});
 const restored=await dispatch(c,guest,'auth/verify',{nonce:next.nonce,signature:sig});assert.equal(restored.player.id,id);assert.equal(restored.player.salvage,170,'profiles never merge');assert.equal(restored.run.id,runId);
 c.release();await pool.end();
});
