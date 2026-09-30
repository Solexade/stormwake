// End-to-end playtest: only public HTTP input, isolated database, no fake live scores.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {walkable,HOME,SHRINE,BOSS} from '../public/game.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const dir=await mkdtemp(path.join(tmpdir(),'isles-playtest-'));
let child;
async function boot(){child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'5195',DATA_DIR:dir},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(Error('Server exited '+code)));});}
async function stop(){if(!child||child.exitCode!==null)return;await new Promise(resolve=>{child.once('exit',resolve);child.kill();});}
const base='http://127.0.0.1:5195';let cookie;let command=0;
async function api(endpoint,data){const r=await fetch(base+'/api/'+endpoint,{method:data===undefined?'GET':'POST',headers:{Cookie:cookie||'','Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});if(!cookie)cookie=r.headers.get('set-cookie')?.split(';')[0];const value=await r.json();if(!r.ok)throw Error(value.error);return value;}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function route(p,target){const grid=25,start=[Math.round(p.x/grid),Math.round(p.y/grid)],goal=[Math.round(target.x/grid),Math.round(target.y/grid)],q=[start],seen=new Set([start.join(',')]),parent=new Map();let found;for(let i=0;i<q.length;i++){const [x,y]=q[i];if(Math.hypot(x-goal[0],y-goal[1])<1.5){found=[x,y];break;}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[-1,1],[1,-1]]){const a=x+dx,b=y+dy,k=`${a},${b}`;if(!seen.has(k)&&walkable(a*grid,b*grid,20)&&walkable((x+a)*grid/2,(y+b)*grid/2,20)){seen.add(k);parent.set(k,[x,y]);q.push([a,b]);}}}if(!found)return [];const out=[];while(found.join(',')!==start.join(',')){out.push({x:found[0]*grid,y:found[1]*grid});found=parent.get(found.join(','));if(!found)break;}return out.reverse();}
try{
 await boot();await api('state');await api('profile',{name:'Isolated Playtest'});if(process.env.TEST_WEAPON)await api('weapon/equip',{weapon:process.env.TEST_WEAPON});let s=(await api('start',{})).run,phase=0,waypoints=[],lastGoal='',lastPathTime=-1,logTime=-10;const started=Date.now();
 while(s.status==='active'&&Date.now()-started<180000){
  const p=s.player;let target=phase===0?SHRINE:phase===1?{x:580,y:720}:phase===2?BOSS:HOME;
  if(phase===0&&s.relicReady&&dist(p,SHRINE)<110){s=(await api('relic',{relic:'storm'})).run;phase=1;console.log('Relic selected.');}
  if(phase===1&&s.chest){phase=2;console.log('Healing cache recovered.');}if(s.bossDead)phase=3;
  const enemies=[...s.enemies,...(s.boss.awake&&s.boss.hp>0?[s.boss]:[])].filter(e=>e.hp>0).sort((a,b)=>dist(p,a)-dist(p,b));const e=enemies[0],fighting=e&&dist(e,p)<320&&phase!==3;if(fighting)target=e;let dx=0,dy=0,dodge=false;
  if(fighting&&e.type==='boss'&&e.wind>0){let a=Math.atan2(p.y-e.targetY,p.x-e.targetX);if(dist(p,{x:e.targetX,y:e.targetY})<10)a=Math.atan2(p.y-e.y,p.x-e.x);if(dist(p,{x:e.targetX,y:e.targetY})<e.radius+40){dx=Math.cos(a);dy=Math.sin(a);dodge=p.dodge<=0&&e.wind<.4;}}
  else if(!fighting||dist(e,p)>(e.type==='boss'?105:75)){const key=Math.round(target.x/50)+','+Math.round(target.y/50);if(key!==lastGoal||s.elapsed-lastPathTime>.5){waypoints=route(p,target);lastGoal=key;lastPathTime=s.elapsed;}while(waypoints.length&&dist(p,waypoints[0])<20)waypoints.shift();const point=waypoints[0]||target,a=Math.atan2(point.y-p.y,point.x-p.x);dx=Math.cos(a);dy=Math.sin(a);}
  if(fighting&&e.wind>0&&e.type!=='boss'&&e.type!=='archer'&&dist(p,e)<110&&p.dodge<=0){const a=Math.atan2(p.y-e.y,p.x-e.x);dx=Math.cos(a);dy=Math.sin(a);dodge=true;}
  s=(await api('input',{dx,dy,angle:fighting?Math.atan2(e.y-p.y,e.x-p.x):Math.atan2(dy,dx),attack:false,attackId:fighting&&!(e.type==='boss'&&e.wind>0)&&p.action==='idle'&&p.stamina>15?++command:undefined,heavyId:fighting&&!(e.type==='boss'&&e.wind>0)&&p.combo===2&&p.action==='idle'&&p.stamina>=22?++command:undefined,stormId:fighting&&dist(e,p)<180&&p.storm<=0&&p.stamina>55?++command:undefined,potionId:p.hp<p.maxHp-45&&p.potions>0&&p.potionCooldown<=0?++command:undefined,guard:!!fighting&&e.type==='boss'&&e.wind>0,dodge,interact:true})).run;
  if(s.elapsed-logTime>=10){logTime=s.elapsed;console.log(`Time ${Math.round(s.elapsed)}s · vitality ${s.player.hp} · kills ${s.kills} · boss ${s.boss.hp}`);}
  await new Promise(r=>setTimeout(r,80));
 }
 assert.equal(s.status,'won','Bot must finish through normal player inputs');let saved=await api('state');assert.equal(saved.player.wins,1);assert.equal(saved.player.best,s.score);assert.equal(saved.player.salvage,s.salvage);assert.equal(saved.leaderboard.length,1);
 for(let i=0;i<3;i++)await api('input',{interact:true,score:999999});saved=await api('state');assert.equal(saved.player.wins,1,'Extraction cannot be recorded twice');
 const donated=await api('contribute',{amount:50});assert.equal(donated.player.salvage,s.salvage-50);assert.equal(donated.world.salvage,50);
 await stop();await boot();const persisted=await api('state');assert.equal(persisted.player.best,s.score);assert.equal(persisted.player.salvage,s.salvage-50);assert.equal(persisted.world.salvage,50);assert.equal(persisted.run,null);
 console.log(`PASS: complete HTTP expedition, ${s.score} points, ${s.salvage} salvage, one-time reward, contribution and restart persistence.`);
}finally{await stop();const resolved=path.resolve(dir);assert.ok(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('isles-playtest-'));await rm(resolved,{recursive:true,force:true});}
