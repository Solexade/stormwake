import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,tick,setInput} from '../public/combat.js';
import {walkable} from '../public/world.js';
import {bankSurvival} from '../public/survival.js';
import {explorationPrompt} from '../public/exploration.js';
import {FERRIES} from '../public/voyage-data.js';
const step=(s,n=100)=>{for(let i=0;i<n;i++)tick(s,.03,s.started+i*30);};
test('survival spawns successive bounded waves without chapter or relic gates',()=>{
 const s=createRun('survival',1000,{mode:'survival'});assert.equal(s.mode,'survival');step(s);assert.equal(s.wave,1);assert.equal(s.enemies.length,6);assert.ok(s.enemies.every(e=>walkable(e.x,e.y,18)));assert.equal(s.boss.awake,false);
 for(let wave=2;wave<=15;wave++){s.enemies.forEach(e=>e.hp=0);step(s,140);assert.equal(s.wave,wave);assert.ok(s.enemies.length<=24);assert.equal(new Set(s.enemies.map(e=>e.id)).size,s.enemies.length);}
 assert.equal(s.status,'active');assert.equal(s.relicReady,false);
});
test('survival pause stops waves and timer; death stops further spawns',()=>{
 const s=createRun('paused',1000,{mode:'survival'});s.paused=true;step(s);assert.equal(s.elapsed,0);assert.equal(s.wave,0);s.paused=false;step(s);s.status='dead';const time=s.elapsed;step(s);assert.equal(s.elapsed,time);assert.equal(s.wave,1);
});
test('survival has no immortal harbour or extraction victory',()=>{
 const s=createRun('danger',1000,{mode:'survival'});s.nextWave=100;s.enemies=[{id:0,type:'raider',x:s.player.x+30,y:s.player.y,hp:80,maxHp:80,cd:0,wind:.01,angle:Math.PI,flash:0,stagger:0,swing:0,death:0,homeX:s.player.x,homeY:s.player.y}];tick(s,.03,1000);assert.ok(s.player.hp<120);s.bossDead=true;setInput(s,{interact:true},1000);tick(s,.03,1000);assert.equal(s.status,'active');
});
test('survival ferries are all open and personal records preserve old gear',()=>{
 const s=createRun('bank',1000,{mode:'survival'});Object.assign(s.player,FERRIES[2]);assert.equal(explorationPrompt(s).ready,true);s.status='dead';s.kills=12;s.wave=3;s.score=720;s.elapsed=99;const gear=bankSurvival({axe:2,adventure:{kills:5},survival:{runs:2,bestKills:20}},s);assert.equal(gear.axe,2);assert.equal(gear.adventure.kills,5);assert.equal(gear.survival.bestKills,20);assert.equal(gear.survival.runs,3);
});

test('live enemies reinforce on schedule without losing health or issuing defeat credit',()=>{
 const s=createRun('pressure',1000,{mode:'survival'});step(s);
 const veteran=s.enemies[0];veteran.hp=37;
 s.reinforceAt=s.elapsed;
 tick(s,.03,4000);
 assert.equal(s.wave,2);
 assert.ok(s.enemies.length>6);
 assert.equal(s.enemies.find(e=>e.id===veteran.id).hp,37);
 assert.equal(s.kills,0);assert.equal(s.score,0);
 assert.ok(s.enemies.some(e=>e.arrival>0));
});

test('survival bots route around houses and distant bots rally after a ferry',()=>{
 const s=createRun('routing',1000,{mode:'survival'});step(s);
 const enemy=s.enemies[0];s.enemies=[enemy];s.reinforceAt=100;
 Object.assign(enemy,{x:540,y:1390,arrival:0,cd:0});
 Object.assign(s.player,{x:790,y:1390});
 const startDistance=Math.hypot(enemy.x-s.player.x,enemy.y-s.player.y);
 step(s,145);
 assert.ok(Math.hypot(enemy.x-s.player.x,enemy.y-s.player.y)<startDistance/2);
 assert.ok(walkable(enemy.x,enemy.y,18));
 assert.equal(enemy.arrival,0,'The bot walked around the house');
 const hp=enemy.hp;
 s.travel={to:{x:4300,y:1800},remaining:.01,name:'Eastern ferry'};
 step(s,3);
 assert.ok(Math.hypot(enemy.x-s.player.x,enemy.y-s.player.y)<500);
 assert.ok(enemy.arrival>0);
 assert.equal(enemy.hp,hp);
});
