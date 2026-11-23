import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,tick,setInput} from '../public/combat.js';
import {walkable} from '../public/world.js';
import {bankSurvival,SURVIVAL_BOTS} from '../public/survival.js';
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
test('the opening wave includes the original bots plus scout and bulwark combat roles',()=>{
 const s=createRun('roster',1000,{mode:'survival'});
 step(s);
 const byRole=new Map(s.enemies.map(enemy=>[enemy.variant||enemy.type,enemy]));
 assert.deepEqual([...byRole.keys()].sort(),['archer','brute','bulwark','raider','scout']);
 const scout=byRole.get('scout'),bulwark=byRole.get('bulwark');
 assert.equal(scout.hp,SURVIVAL_BOTS.scout.health);
 assert.equal(bulwark.hp,SURVIVAL_BOTS.bulwark.health);
 for(const enemy of [scout,bulwark]){
  const bot=SURVIVAL_BOTS[enemy.variant],p=s.player;
  s.enemies=[enemy];p.invulnerable=0;
  Object.assign(enemy,{x:p.x+45,y:p.y,arrival:0,cd:0,angle:Math.PI});
  tick(s,.03,1000);
  assert.equal(enemy.wind,bot.wind);
  const hp=p.hp;
  enemy.angle=0;enemy.wind=.01;
  tick(s,.03,1000);
  assert.equal(p.hp,hp,'Sidestepping out of the locked bearing avoids the strike');
  enemy.angle=Math.PI;enemy.wind=.01;
  tick(s,.03,1000);
  assert.equal(p.hp,hp-bot.damage);
 }
});
test('survival has no immortal harbour or extraction victory',()=>{
 const s=createRun('danger',1000,{mode:'survival'});s.nextWave=100;s.enemies=[{id:0,type:'raider',x:s.player.x+30,y:s.player.y,hp:80,maxHp:80,cd:0,wind:.01,angle:Math.PI,flash:0,stagger:0,swing:0,death:0,homeX:s.player.x,homeY:s.player.y}];tick(s,.03,1000);assert.ok(s.player.hp<120);s.bossDead=true;setInput(s,{interact:true},1000);tick(s,.03,1000);assert.equal(s.status,'active');
});
test('survival ferries are all open and personal records preserve old gear',()=>{
 const s=createRun('bank',1000,{mode:'survival'});Object.assign(s.player,FERRIES[2]);assert.equal(explorationPrompt(s).ready,true);s.status='dead';s.kills=12;s.wave=3;s.score=720;s.elapsed=99;const gear=bankSurvival({axe:2,adventure:{kills:5},survival:{runs:2,bestKills:20}},s);assert.equal(gear.axe,2);assert.equal(gear.adventure.kills,5);assert.equal(gear.survival.bestKills,20);assert.equal(gear.survival.runs,3);
});

test('the last active bot gates the next wave even after the old timer would have elapsed',()=>{
 const s=createRun('pressure',1000,{mode:'survival'});step(s);
 const veteran=s.enemies[0];veteran.hp=37;
 s.enemies.slice(1).forEach(e=>e.hp=0);s.reinforceAt=s.elapsed;s.elapsed=60;
 step(s,160);
 assert.equal(s.wave,1);assert.equal(veteran.hp,37);assert.equal(s.nextWave,4);
 veteran.hp=0;step(s,100);assert.equal(s.wave,1);
 step(s,36);assert.equal(s.wave,2);assert.ok(s.enemies.every(e=>e.hp>0));
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

test('pulse weapons fire along the accepted angle and stop at buildings',()=>{
 function fire(x,y,tx,ty,weapon){
  const s=createRun('fire',1000,{mode:'survival'});s.nextWave=100;s.player.weapon=weapon;
  const angle=Math.atan2(ty-y,tx-x);Object.assign(s.player,{x,y,angle});
  const enemy={id:0,type:'raider',x:tx,y:ty,hp:120,maxHp:120,arrival:10,wind:0,cd:99,flash:0,stagger:0,swing:0,death:0};
  s.enemies.push(enemy);
  setInput(s,{angle,attack:true},1000);step(s,6);
  return {hp:enemy.hp,pulses:s.effects.filter(e=>e.type==='pulse'),combo:s.player.comboCharge};
 }
 const clear=fire(1500,1750,1700,1750,'pulse-carbine');assert.equal(clear.hp,92);assert.equal(clear.pulses.length,1);assert.equal(clear.combo,0);
 const blocked=fire(540,1390,790,1390,'pulse-carbine');assert.equal(blocked.hp,120);assert.ok(blocked.pulses[0].tx<700);
 const spread=fire(1500,1750,1560,1750,'rift-scattergun');assert.equal(spread.pulses.length,3);assert.ok(spread.hp<clear.hp);
});
