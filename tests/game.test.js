import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,tick,chooseRelic,walkable,HOME,SHRINE,BOSS,setInput} from '../public/game.js';
const now=10000;
function step(s,n=1){for(let i=0;i<n;i++){s.lastInputAt=now;tick(s,1/30,now);}}
test('land routes connect all objectives without walking through water',()=>{
  const points=[HOME,SHRINE,BOSS,{x:580,y:720}];
  for(const p of points)assert.equal(walkable(p.x,p.y),true);
  assert.equal(walkable(30,30),false);
  // Flood-fill the walkable map at player-scale resolution.
  const grid=20,start=[Math.round(HOME.x/grid),Math.round(HOME.y/grid)];const seen=new Set([start.join(',')]),queue=[start];
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=`${a},${b}`;if(!seen.has(k)&&walkable(a*grid,b*grid)){seen.add(k);queue.push([a,b]);}}}
  for(const p of points)assert.ok(seen.has(`${Math.round(p.x/grid)},${Math.round(p.y/grid)}`),JSON.stringify(p));
});
test('movement normalizes diagonal speed and stale input stops movement',()=>{
  const s=createRun('a',now);s.input={dx:1,dy:-1};step(s);assert.ok(Math.hypot(s.player.x-HOME.x,s.player.y-HOME.y)<=7.001);const x=s.player.x;s.lastInputAt=0;tick(s,1/30,now);assert.equal(s.player.x,x);
});
test('attacks need range and facing and cannot bypass cooldown',()=>{
  for(const facing of [0,Math.PI]){const s=createRun('a',now);Object.assign(s.enemies[0],{x:HOME.x+65,y:HOME.y,homeX:HOME.x+65,homeY:HOME.y,hp:100,maxHp:100,cd:10});s.player.angle=facing;s.input={attack:true,angle:facing};step(s);assert.equal(s.enemies[0].hp,100,'Wind-up must precede damage');step(s,5);assert.equal(s.enemies[0].hp,facing===0?76:100);const hp=s.enemies[0].hp;step(s);assert.equal(s.enemies[0].hp,hp);}
});
test('relic choice requires guardians, proximity, and can only happen once',()=>{
  const s=createRun('a',now);assert.equal(chooseRelic(s,'raven'),false);s.enemies[3].hp=0;s.enemies[4].hp=0;step(s);assert.equal(chooseRelic(s,'raven'),false);Object.assign(s.player,SHRINE);assert.equal(chooseRelic(s,'raven'),true);assert.equal(s.player.maxHp,80);assert.equal(chooseRelic(s,'storm'),false);
});
test('storm damage and cooldown are server controlled',()=>{
  const s=createRun('a',now);Object.assign(s.player,{x:925,y:1140});s.input={storm:true};step(s);const hp=s.enemies[1].hp;assert.equal(hp,32);step(s);assert.equal(s.enemies[1].hp,hp);assert.ok(s.player.storm>7.9);
});
test('boss cannot awaken before relic recovery',()=>{
  const s=createRun('a',now);Object.assign(s.player,BOSS);step(s);assert.equal(s.boss.awake,false);s.relic='storm';step(s);assert.equal(s.boss.awake,true);
});
test('extraction requires boss defeat, proximity, and explicit interaction',()=>{
  const s=createRun('a',now);s.input={interact:true};step(s);assert.equal(s.status,'active');s.bossDead=true;Object.assign(s.player,SHRINE);step(s);assert.equal(s.status,'active');Object.assign(s.player,HOME);step(s);assert.equal(s.status,'won');const score=s.score;step(s,10);assert.equal(s.score,score);
});
test('dodge gives limited invulnerability and cannot repeat instantly',()=>{
  const s=createRun('a',now);s.input={dodge:true,dx:1};step(s);assert.ok(s.player.invulnerable>0);const cd=s.player.dodge;step(s);assert.ok(s.player.dodge<cd);assert.ok(s.player.dodge>1);
});
test('healing cache grants salvage once',()=>{
  const s=createRun('a',now);Object.assign(s.player,{x:580,y:720,hp:40});s.input={interact:true};step(s);assert.equal(s.player.hp,85);assert.equal(s.salvage,40);step(s,5);assert.equal(s.salvage,40);
});
test('expedition expires rather than running forever',()=>{
  const s=createRun('a',now);s.elapsed=719.99;step(s);assert.equal(s.status,'expired');
});
test('new players are safe in the harbour while learning the controls',()=>{
  const s=createRun('a',now);step(s,1800);assert.equal(s.player.hp,120);assert.equal(s.status,'active');
});
test('3D cottages have authoritative collision instead of pass-through walls',()=>{
  assert.equal(walkable(420,1240),false);assert.equal(walkable(660,1390),false);assert.equal(walkable(760,1580),false);assert.equal(walkable(HOME.x,HOME.y),true);
});
test('timed light-light-heavy inputs produce a damaging finisher',()=>{
 const s=createRun('combo',now);s.player.angle=0;Object.assign(s.enemies[0],{x:HOME.x+80,y:HOME.y,homeX:HOME.x+80,homeY:HOME.y,hp:500,maxHp:500,cd:100});
 setInput(s,{attack:true,attackId:1,angle:0},now);step(s,5);setInput(s,{attack:false},now);step(s);
 setInput(s,{attack:true,attackId:2,angle:0},now);step(s);setInput(s,{attack:false},now);for(let i=0;i<20&&s.player.action!=='light2';i++)step(s);assert.equal(s.player.action,'light2');step(s,5);
 setInput(s,{heavy:true,heavyId:3,angle:0},now);step(s);setInput(s,{heavy:false},now);for(let i=0;i<25&&s.player.action!=='finisher';i++)step(s);assert.equal(s.player.action,'finisher');step(s,12);assert.ok(s.enemies[0].hp<=372);assert.ok(s.events.some(e=>e.type==='finisher'));
});
test('replayed command IDs do not enqueue extra attacks',()=>{const s=createRun('id',now);setInput(s,{heavyId:10},now);step(s);assert.equal(s.player.action,'heavy');step(s,30);setInput(s,{heavyId:10},now);step(s);assert.equal(s.player.action,'idle');});
test('heavy attacks and rolls require stamina',()=>{const s=createRun('stamina',now);s.player.stamina=0;s.input={heavy:true,dodge:true};step(s);assert.equal(s.player.action,'idle');assert.equal(s.player.dashing,0);});
test('acceleration and braking avoid instant full-speed movement',()=>{const s=createRun('motion',now);s.input={dy:1};step(s);assert.ok(s.player.vy>0&&s.player.vy<140);step(s,15);assert.ok(s.player.vy>240);s.input={};step(s);assert.ok(s.player.vy>0&&s.player.vy<170);step(s,20);assert.ok(s.player.vy<1);});
test('a precisely timed frontal guard parries an enemy strike',()=>{const s=createRun('parry',now);Object.assign(s.player,{x:925,y:1140,angle:0});Object.assign(s.enemies[0],{x:980,y:1140,angle:Math.PI,wind:.01});s.input={guard:true,angle:0};step(s);assert.equal(s.player.hp,s.player.maxHp);assert.ok(s.events.some(e=>e.type==='parry'));assert.ok(s.enemies[0].stagger>1);});
test('safehouse pauses combat and expedition time',()=>{const s=createRun('rest',now);s.inSafehouse=true;s.input={dx:1,attack:true};step(s,60);assert.equal(s.elapsed,0);assert.equal(s.player.x,HOME.x);assert.equal(s.player.hp,120);});
test('healing draught consumption is bounded and tracked',()=>{const s=createRun('potion',now,{potions:1});s.player.hp=20;s.input={potion:true};step(s);assert.equal(s.player.hp,80);assert.equal(s.player.potions,0);assert.equal(s.usedPotions,1);step(s,5);assert.equal(s.usedPotions,1);});


