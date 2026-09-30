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
test('cloud wallet binding rotates sessions and refuses replay',async()=>{
 const db=newDb(),{Pool}=db.adapters.createPg(),pool=new Pool();await pool.query(schema);const c=await pool.connect(),ctx=await openSession(c);const old=ctx.cookie,account=privateKeyToAccount(generatePrivateKey());
 const challenge=await dispatch(c,ctx,'auth/challenge',{address:account.address},'POST','https://stormwake.example');
 const signature=await account.signMessage({message:challenge.message});await dispatch(c,ctx,'auth/verify',{nonce:challenge.nonce,signature});await persist(c,ctx.p);
 assert.equal(ctx.p.wallet,account.address.toLowerCase());await assert.rejects(()=>dispatch(c,ctx,'auth/verify',{nonce:challenge.nonce,signature}));assert.notEqual((await openSession(c,old)).p.id,ctx.p.id);
 c.release();await pool.end();
});
