import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,setInput,tick,weaponAttack} from '../public/combat.js';
import {WEAPONS} from '../public/catalog.js';
import {snapshot} from '../public/combat.js';
test('retired gun maps to axe without losing an existing expedition',()=>{
 assert.equal(Object.hasOwn(WEAPONS,'gun'),false);
 assert.ok(WEAPONS.axe&&WEAPONS.spear&&WEAPONS.sword);
 const s=createRun('legacy',100,{gear:{weapon:'gun',armour:2}});
 assert.equal(s.player.weapon,'axe');
 Object.assign(s.player,{weapon:'gun',hp:64,action:'heavy',actionTime:.03});
 s.score=125;s.salvage=40;s.paused=true;
 const saved=snapshot(s);
 assert.equal(saved.player.weapon,'axe');assert.equal(saved.player.action,'idle');
 assert.equal(saved.player.hp,64);assert.equal(saved.score,125);assert.equal(saved.salvage,40);
 assert.equal(saved.paused,true);assert.equal(saved.player.maxHp,160);
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
