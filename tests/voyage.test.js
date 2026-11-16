import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,tick,setInput,chooseRelic,interactionFor} from '../public/combat.js';
import {walkable} from '../public/world.js';
import {REGIONS,CACHES,CAMPS,FERRIES,PEOPLE,foundWeapons,voyageRank} from '../public/voyage-data.js';
import {explore,explorationPrompt} from '../public/exploration.js';
import {MovementPreview} from '../public/movement-preview.js';
const emit=(s,type,data)=>s.events.push({type,...data});
function reachable(start,target){const step=20,queue=[[Math.round(start.x/step),Math.round(start.y/step)]],seen=new Set([queue[0].join(',')]);for(let i=0;i<queue.length;i++){const [x,y]=queue[i];if(Math.hypot(x*step-target.x,y*step-target.y)<35)return true;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,key=a+','+b;if(!seen.has(key)&&walkable(a*step,b*step,18)){seen.add(key);queue.push([a,b]);}}}return false;}
test('all voyage interactions stand on traversable land and region routes connect',()=>{
 for(const p of [...CACHES,...CAMPS,...FERRIES,...PEOPLE,...REGIONS.flatMap(r=>[r.home,r.shrine,r.boss])])assert.ok(walkable(p.x,p.y),JSON.stringify(p));
 for(const r of REGIONS){assert.ok(reachable(r.home,r.shrine),r.name+' shrine');assert.ok(reachable(r.shrine,r.boss),r.name+' boss');}
 for(const p of [...CACHES,...CAMPS,...FERRIES,...PEOPLE]){const r=REGIONS[p.x>3950?2:p.x>2600?1:0];assert.ok(reachable(r.home,p),p.id);}
});
test('weapon caches grant a missing weapon once and legacy equipped weapons remain available',()=>{
 const s=createRun('loot');assert.deepEqual(s.inventory,['axe']);Object.assign(s.player,CACHES[0]);const prompt=explorationPrompt(s);assert.ok(explore(s,prompt,emit));assert.equal(s.inventory.length,2);assert.ok(['sword','spear'].includes(s.player.weapon));const bank=s.salvage;assert.equal(explore(s,prompt,emit),false);assert.equal(s.salvage,bank);assert.deepEqual(foundWeapons({weapon:'spear'}),['axe','spear']);
});
test('healing and combat caches are bounded, not repeatable',()=>{for(const kind of ['health','core','salvage']){const s=createRun(kind),c=CACHES.find(c=>c.kind===kind);Object.assign(s.player,{x:c.x,y:c.y,hp:20});assert.ok(explore(s,explorationPrompt(s),emit));assert.ok(s.player.hp<=s.player.maxHp);if(kind==='health')assert.equal(s.player.hp,75);if(kind==='core')assert.equal(s.player.powerTime,25);if(kind==='salvage')assert.equal(s.salvage,35);assert.equal(explore(s,{kind:'loot',id:c.id,ready:true},emit),false);}});
test('ferries gate future chapters, stop input, pause safely and land at valid destinations',()=>{
 const s=createRun('boat',1000,{wins:1}),f=FERRIES.find(f=>f.id==='river-coast');Object.assign(s.player,{x:f.x,y:f.y});assert.ok(explore(s,explorationPrompt(s),emit));const from={x:s.player.x,y:s.player.y};s.paused=true;tick(s,.05,1000);assert.equal(s.travel.remaining,3);s.paused=false;
 const preview=new MovementPreview();preview.sync(s,1000);const pose=preview.step({dx:1},.1,1050);assert.equal(pose.x,from.x);
 for(let i=0;i<61;i++){setInput(s,{dx:1,attack:true},1000+i*50);tick(s,.05,1000+i*50);}assert.equal(s.travel,null);assert.equal(s.player.x,f.to.x);assert.equal(s.player.y,f.to.y);assert.equal(s.player.vx,0);
 const locked=createRun('locked');Object.assign(locked.player,{x:FERRIES[0].x,y:FERRIES[0].y});assert.equal(interactionFor(locked).ready,false);assert.equal(explore(locked,{kind:'ferry',id:FERRIES[0].id,ready:true},emit),false);
});
test('regional relic and extraction rules use their chapter landmarks',()=>{for(const wins of [0,1,2]){const s=createRun('chapter'+wins,1000,{wins});s.relicReady=true;Object.assign(s.player,s.shrine);assert.equal(chooseRelic(s,'storm'),true);s.bossDead=true;Object.assign(s.player,s.home);setInput(s,{interact:true},1000);tick(s,.03,1000);assert.equal(s.status,'won');}});
test('rank thresholds unlock two cosmetic finishes without changing combat stats',()=>{assert.deepEqual(voyageRank({}).skins,[]);assert.deepEqual(voyageRank({adventure:{kills:30,bosses:1}}).skins,['tide']);assert.deepEqual(voyageRank({adventure:{kills:70,bosses:2}}).skins,['tide','grove']);});


test('survival mainland joins harbour, city, Riverhold and Emerald Reach on foot',()=>{
 for(const target of [{x:1850,y:1760},...REGIONS.slice(1).map(r=>r.home)])assert.ok(reachable(REGIONS[0].home,target),JSON.stringify(target));
});
