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
