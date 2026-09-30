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
