import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,weaponAttack} from '../public/combat.js';
test('weapons have server-controlled speed, reach, stamina and damage tradeoffs',()=>{
 const axe=weaponAttack({weapon:'axe'},'light1'),sword=weaponAttack({weapon:'sword'},'light1'),spear=weaponAttack({weapon:'spear'},'light1');
 assert.ok(sword.duration<axe.duration&&sword.damage<axe.damage&&sword.cost<axe.cost);
 assert.ok(spear.range>axe.range&&spear.duration>axe.duration&&spear.arc<axe.arc);
 assert.deepEqual(weaponAttack({weapon:'invalid'},'light1'),axe);
 const s=createRun('weapon-test',Date.now(),{gear:{weapon:'spear',axe:2}});assert.equal(s.player.weapon,'spear');assert.equal(s.player.damageBonus,8);
});
import {tick,setInput} from '../public/combat.js';
test('movement accelerates promptly, sprints faster and stops on stale input',()=>{
 const pace=sprint=>{const s=createRun('pace',0);for(let n=1;n<=10;n++){setInput(s,{dx:1,dy:0,sprint},n*20);tick(s,.02,n*20);}return s;};
 const jog=pace(false),sprint=pace(true);
 assert.ok(jog.player.vx>245,'jog reaches cruise speed promptly');
 assert.ok(sprint.player.vx>350&&sprint.player.x>jog.player.x,'sprint covers more ground');
 const before=jog.player.x;tick(jog,.02,1000);assert.equal(jog.player.x,before);assert.equal(jog.player.vx,0);
 const stop=pace(false);for(let n=1;n<=10;n++){setInput(stop,{dx:0,dy:0},200+n*20);tick(stop,.02,200+n*20);}assert.ok(Math.abs(stop.player.vx)<3,'releasing input brakes without prolonged sliding');
});

test('pausing freezes combat and time without turning the wilderness into a safehouse',()=>{const s=createRun('pause',0);s.paused=true;s.input={dx:1,attack:true};const x=s.player.x;tick(s,.03,30);assert.equal(s.player.x,x);assert.equal(s.elapsed,0);assert.equal(s.inSafehouse,false);s.paused=false;setInput(s,{dx:1},40);tick(s,.03,40);assert.ok(s.player.x>x);});
import {MovementPreview} from '../public/movement-preview.js';
test('local movement responds before a server reply, normalizes diagonals and stops on connection loss',()=>{
 const run=createRun('preview',0),original=JSON.stringify(run);const direct=new MovementPreview(),diagonal=new MovementPreview();direct.sync(run,0);diagonal.sync(run,0);
 const a=direct.step({dx:1,dy:0,angle:0},1/60,16),b=diagonal.step({dx:1,dy:1,angle:.78},1/60,16);
 assert.ok(a.x>run.player.x,'movement begins on the first rendered frame');assert.ok(Math.abs(Math.hypot(a.x-run.player.x,a.y-run.player.y)-Math.hypot(b.x-run.player.x,b.y-run.player.y))<.001);
 assert.equal(JSON.stringify(run),original,'visual prediction never changes authoritative state');
 const stopped=direct.step({dx:1,dy:0},1/60,800);assert.equal(stopped.vx,0);assert.equal(stopped.x,run.player.x);
 run.paused=true;direct.sync(run,900);assert.equal(direct.step({dx:1},.02,920).x,run.player.x);
});

import {interactionFor,COMBO_HITS} from '../public/combat.js';
import {SHRINE,HOME} from '../public/world.js';
test('context actions appear only near valid objects and disappear after opening',()=>{
 const s=createRun('context',0);Object.assign(s.player,{x:580,y:720});assert.equal(interactionFor(s).kind,'chest');
 setInput(s,{interact:true},1);tick(s,.02,1);assert.equal(s.chest,true);assert.equal(s.salvage,40);assert.notEqual(interactionFor(s)?.kind,'chest');
 setInput(s,{interact:true},2);tick(s,.02,2);assert.equal(s.salvage,40);
 Object.assign(s.player,SHRINE);assert.equal(interactionFor(s).ready,false);s.relicReady=true;assert.equal(interactionFor(s).ready,true);
 Object.assign(s.player,HOME);s.bossDead=true;assert.equal(interactionFor(s).kind,'extract');s.paused=true;assert.equal(interactionFor(s),null);
});
test('three landed melee strikes unlock one combo; misses and forged charge do not',()=>{
 const s=createRun('charge',0);let clock=0;const advance=n=>{for(let i=0;i<n;i++){clock+=20;s.lastInputAt=clock;tick(s,.02,clock);}};
 const strike=hit=>{Object.assign(s.player,{...HOME,angle:0,stamina:100,action:'idle',comboWindow:0,combo:0});Object.assign(s.enemies[0],{x:HOME.x+(hit?65:600),y:HOME.y,homeX:HOME.x+(hit?65:600),homeY:HOME.y,hp:1000,cd:99});setInput(s,{attack:true,attackId:clock+1,angle:0},clock);advance(1);setInput(s,{angle:0},clock);advance(24);};
 strike(false);assert.equal(s.player.comboCharge,0);assert.equal(s.events.some(e=>e.type==='strike'),false,'a miss makes no impact sound');setInput(s,{combo:true,comboId:1,comboCharge:3},clock);advance(1);assert.notEqual(s.player.action,'finisher');
 for(let i=0;i<COMBO_HITS;i++)strike(true);assert.equal(s.player.comboCharge,COMBO_HITS);assert.equal(s.events.filter(e=>e.type==='strike').length,3,'landed swings each produce one impact event');
 s.player.stamina=0;setInput(s,{combo:true,comboId:2},clock);advance(1);assert.equal(s.player.comboCharge,COMBO_HITS,'insufficient stamina retains earned combo');
 s.player.stamina=100;setInput(s,{combo:true,comboId:3},clock);advance(1);assert.equal(s.player.action,'finisher');assert.equal(s.player.comboCharge,0);
 setInput(s,{},clock);advance(50);setInput(s,{combo:true,comboId:3},clock);advance(1);assert.notEqual(s.player.action,'finisher','replay cannot fire a second combo');
});
