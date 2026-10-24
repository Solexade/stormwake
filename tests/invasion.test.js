import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,setInput,tick,weaponAttack} from '../public/combat.js';
test('carbine is ranged and never lunges; one shot cannot hit every bot',()=>{
 const s=createRun('gun');Object.assign(s.player,{x:930,y:1100,weapon:'gun',angle:0});s.enemies.forEach(e=>e.hp=0);Object.assign(s.enemies[0],{x:1040,y:1100,hp:80});Object.assign(s.enemies[1],{x:1090,y:1100,hp:80});
 const a=weaponAttack(s.player,'light1');assert.equal(a.lunge,0);assert.equal(a.range,480);
 setInput(s,{attack:true,angle:0},100);tick(s,.05,100);tick(s,.05,150);tick(s,.05,200);
 assert.ok(s.enemies[0].hp<80);assert.equal(s.enemies[1].hp,80);assert.ok(s.effects.some(e=>e.type==='pulse'));assert.ok(s.player.stamina<100);
});
import {walkable} from '../public/world.js';
test('campaign deploys from saved victories with walkable chapter starts',()=>{
 for(const [wins,chapter] of [[0,1],[1,2],[2,3],[99,3],[-4,1]]){
  const s=createRun('chapter',100,{wins});assert.equal(s.chapter,chapter);assert.ok(walkable(s.player.x,s.player.y,18));assert.equal(s.boss.maxHp,600+(chapter-1)*120);
 }
});
test('earned cores expire, pause safely and cannot be supplied through input',()=>{
 const s=createRun('cores',100);Object.assign(s.player,{x:930,y:1100});s.enemies.forEach(e=>e.hp=0);
 for(let i=0;i<3;i++)Object.assign(s.enemies[i],{x:950+i*20,y:1100,hp:1});
 setInput(s,{storm:true,powerup:'aegis',powerTime:999},100);tick(s,.05,100);
 assert.equal(s.kills,3);assert.equal(s.player.powerup,'overdrive');assert.equal(s.player.powerTime,14);
 s.paused=true;tick(s,.05,150);assert.equal(s.player.powerTime,14);s.paused=false;
 s.player.powerTime=.01;tick(s,.05,200);assert.equal(s.player.powerup,null);
});
test('parry window enables a single counterstrike and finishers differ by weapon',()=>{
 const s=createRun('counter',100);s.player.riposteWindow=1;setInput(s,{attack:true},100);tick(s,.05,100);
 assert.equal(s.player.action,'riposte');assert.equal(s.player.riposteWindow,0);
 const axe=weaponAttack({weapon:'axe'},'finisher'),spear=weaponAttack({weapon:'spear'},'finisher');
 assert.ok(axe.arc>spear.arc);assert.ok(spear.range>axe.range);assert.notEqual(axe.name,spear.name);
});
