import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,step,acceptInput} from '../public/arcade/engine.js';
import {MOVES,RULES} from '../public/arcade/config.js';
import {aiDecision} from '../public/arcade/ai.js';
import {beginAttack} from '../public/arcade/combat.js';
import {endRound,nextRound} from '../public/arcade/rounds.js';
import {DatabaseSync} from 'node:sqlite';
import {arcadeRequest,sqliteRooms,advanceRoom,postgresRooms,roomSchema} from '../arcade/service.js';
import {newDb} from 'pg-mem';
const fight=()=>{const s=createMatch('test','room');s.phase='fight';return s;};
const frames=(s,n)=>{for(let i=0;i<n;i++)step(s);};
const input=(s,i,b)=>acceptInput(s,i,{seq:s.fighters[i].seq+1,...b});
test('Arcade movement clamps, faces opponent, and stale controls stop',()=>{const s=fight();s.fighters[0].x=.35;input(s,0,{axis:-1});frames(s,120);assert.equal(s.fighters[0].x,.34);assert.equal(s.fighters[0].facing,1);s.fighters[0].x=10;frames(s,1);assert.equal(s.fighters[0].facing,-1);input(s,0,{axis:1});frames(s,10);const x=s.fighters[0].x;frames(s,50);assert.ok(s.fighters[0].x>x);const stop=s.fighters[0].x;frames(s,20);assert.equal(s.fighters[0].x,stop);});
test('Arcade light startup, active hit and single damage per move',()=>{const s=fight();s.fighters[0].x=5;s.fighters[1].x=6;input(s,0,{attack:'light'});frames(s,MOVES.light.startup);assert.equal(s.fighters[1].hp,100);frames(s,1);assert.equal(s.fighters[1].hp,92);assert.ok(s.fighters[1].stun>0);frames(s,10);assert.equal(s.fighters[1].hp,92);assert.ok(s.fighters[1].x>6);});
test('block causes block stun, crouch evades high strikes, mid attacks land',()=>{for(const kind of ['block','crouch']){const s=fight();s.fighters[0].x=5;s.fighters[1].x=6;input(s,1,{[kind]:true});input(s,0,{attack:'light'});frames(s,8);assert.equal(s.fighters[1].hp,100);if(kind==='block')assert.ok(s.fighters[1].blockStun>0);}const s=fight();s.fighters[0].x=5;s.fighters[1].x=6;input(s,1,{crouch:true});input(s,0,{attack:'heavy'});frames(s,19);assert.equal(s.fighters[1].hp,83);});
test('jump returns to ground and special cooldown prevents spamming',()=>{const s=fight();input(s,0,{jump:true});frames(s,10);assert.ok(s.fighters[0].y>0);frames(s,80);assert.equal(s.fighters[0].y,0);assert.equal(beginAttack(s.fighters[0],'special'),true);frames(s,70);assert.equal(beginAttack(s.fighters[0],'special'),false);});
test('confirmed light can chain into heavy, but whiff cannot cancel',()=>{const s=fight();assert.equal(beginAttack(s.fighters[0],'light'),true);s.fighters[0].moveFrame=11;assert.equal(beginAttack(s.fighters[0],'heavy'),false);s.fighters[0].hit=true;assert.equal(beginAttack(s.fighters[0],'heavy'),true);});
test('60-second timeout, KO, two wins and three-draw cap are deterministic',()=>{const s=fight();frames(s,3600);assert.equal(s.phase,'roundEnd');assert.equal(s.roundWinner,null);assert.equal(s.time,0);frames(s,RULES.between);assert.equal(s.phase,'countdown');assert.equal(s.fighters[0].hp,100);s.fighters[1].hp=0;endRound(s);assert.equal(s.fighters[0].wins,1);nextRound(s);s.fighters[1].hp=0;endRound(s);assert.equal(s.winner,0);assert.equal(s.phase,'finished');const draw=fight();for(let i=0;i<3;i++){endRound(draw);if(i<2)nextRound(draw);}assert.equal(draw.phase,'finished');assert.equal(draw.winner,null);});
test('AI reads visible spacing, not hidden inputs; simulation replays exactly',()=>{const a=createMatch('same'),b=structuredClone(a);a.fighters[0].input={axis:1};a.fighters[0].pending={attack:'special'};assert.deepEqual(aiDecision(a),aiDecision(b));const c=createMatch('same'),d=structuredClone(c);frames(c,500);frames(d,500);assert.deepEqual(c,d);});
test('room ownership, capacity, outcome rejection, stale seq and persistent results',async()=>{const db=new DatabaseSync(':memory:'),store=sqliteRooms(db),a={id:'a',name:'A'},b={id:'b',name:'B'},c={id:'c',name:'C'};const r=await arcadeRequest(store,a,'create',{mode:'room'},'POST',1000);assert.equal(r.status,'waiting');assert.equal((await arcadeRequest(store,a,'create',{mode:'ai'},'POST',1001)).code,r.code);const joined=await arcadeRequest(store,b,'join',{code:r.code},'POST',1002);assert.equal(joined.seat,1);await assert.rejects(()=>arcadeRequest(store,c,'join',{code:r.code},'POST',1003),{status:409});await assert.rejects(()=>arcadeRequest(store,c,'sync',{code:r.code},'POST',1003),{status:403});await assert.rejects(()=>arcadeRequest(store,a,'sync',{code:r.code,winner:0},'POST',1003),/Only input intents/);await assert.rejects(()=>arcadeRequest(store,a,'result',{winner:0},'POST',1003),{status:404});await arcadeRequest(store,a,'sync',{code:r.code,seq:3,axis:1},'POST',1004);const stale=await arcadeRequest(store,a,'sync',{code:r.code,seq:2,axis:-1},'POST',1005);assert.equal(stale.match.fighters[0].input.axis,1);const ended=await arcadeRequest(store,b,'leave',{code:r.code},'POST',1006);assert.equal(ended.match.winner,0);const saved=JSON.parse(db.prepare('SELECT doc FROM arcade_rooms WHERE code=?').get(r.code).doc);assert.equal(saved.match.winner,0);db.close();});
test('disconnect forfeits, rooms expire and catch-up is bounded',()=>{const s={match:createMatch('x','room'),members:['a','b'],seen:[0,21000],updated:0,remainder:0,status:'playing'};advanceRoom(s,21000);assert.equal(s.match.winner,1);assert.equal(s.reason,'disconnect');const d={match:createMatch('x'),members:['a',null],seen:[1000,1000],updated:0,remainder:0,status:'playing'};advanceRoom(d,1000);assert.equal(d.match.frame,30);});
test('PostgreSQL room adapter persists two-player inputs and results separately',async()=>{const db=newDb(),{Pool}=db.adapters.createPg(),pool=new Pool();await pool.query(roomSchema);const store=postgresRooms(pool),a={id:'a',name:'Raider'},b={id:'b',name:'Rival'};const r=await arcadeRequest(store,a,'create',{mode:'room'},'POST',100);await arcadeRequest(store,b,'join',{code:r.code},'POST',101);const next=await arcadeRequest(store,b,'sync',{code:r.code,seq:1,axis:-1},'POST',200);assert.equal(next.seat,1);assert.equal(next.match.fighters[1].input.axis,-1);await arcadeRequest(store,a,'leave',{code:r.code},'POST',201);const saved=(await pool.query('SELECT doc FROM stormwake_arcade_rooms')).rows[0].doc;assert.equal(saved.match.winner,1);await pool.end();});
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
test('SQLite Arcade resumes durable match snapshots after reopening the database',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'arcade-durable-')),file=path.join(dir,'test.sqlite');let db=new DatabaseSync(file);
 try{const player={id:'saved',name:'Saved guest'},r=await arcadeRequest(sqliteRooms(db),player,'create',{mode:'ai'},'POST',1000);await arcadeRequest(sqliteRooms(db),player,'sync',{code:r.code,seq:7,axis:1},'POST',1100);db.close();db=new DatabaseSync(file);const resumed=await arcadeRequest(sqliteRooms(db),player,'resume',{},'POST',1200);assert.equal(resumed.code,r.code);assert.equal(resumed.match.id,r.match.id);assert.equal(resumed.match.fighters[0].seq,7);}finally{db.close();await rm(dir,{recursive:true,force:true});}
});

test('roster and arena persist, guests choose their hero but cannot override arena',async()=>{
 const db=new DatabaseSync(':memory:'),store=sqliteRooms(db),a={id:'host',name:'Host'},b={id:'guest',name:'Guest'};
 try{const r=await arcadeRequest(store,a,'create',{mode:'room',hero:'azure',arena:'frost'},'POST',1000);
 const joined=await arcadeRequest(store,b,'join',{code:r.code,hero:'hood',arena:'embers'},'POST',1001);
 assert.deepEqual(joined.match.heroes,['azure','hood']);assert.equal(joined.match.arena,'frost');
 const resumed=await arcadeRequest(store,a,'resume',{},'POST',1002);assert.deepEqual(resumed.match.heroes,joined.match.heroes);
 await assert.rejects(()=>arcadeRequest(store,b,'sync',{code:r.code,hero:'voyager'},'POST',1003),/Only input intents/);
 }finally{db.close();}
});
test('invalid cosmetic choices fall back safely without changing fighter stats',async()=>{
 const db=new DatabaseSync(':memory:');try{const r=await arcadeRequest(sqliteRooms(db),{id:'a',name:'A'},'create',{hero:'../secret',arena:'unknown'},'POST',1000);
 assert.equal(r.match.heroes[0],'azure');assert.equal(r.match.arena,'harbour');assert.equal(r.match.fighters[0].hp,100);
 }finally{db.close();}
});
test('early attack survives idle packets and starts on recovery, then expires',()=>{
 const s=fight(),f=s.fighters[0];f.cooldown=4;input(s,0,{attack:'heavy'});input(s,0,{axis:0});frames(s,4);assert.equal(f.move,'heavy');
 const t=fight();t.fighters[0].cooldown=20;input(t,0,{attack:'heavy'});frames(t,25);assert.equal(t.fighters[0].move,null);
});
test('AI rotates rivals across matches even after rate-limit window expires',async()=>{
 const db=new DatabaseSync(':memory:');try{const store=sqliteRooms(db),player={id:'rotation',name:'Rotation'};let now=100000;const rivals=[];
 for(let i=0;i<3;i++){const r=await arcadeRequest(store,player,'create',{mode:'ai',hero:'azure'},'POST',now);rivals.push(r.match.heroes[1]);await arcadeRequest(store,player,'leave',{code:r.code},'POST',now+1);now+=70000;}
 assert.equal(new Set(rivals).size,3);assert.ok(!rivals.includes('azure'));
 }finally{db.close();}
});
