// Drive the real Solo Survival API using an isolated SQLite database.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';

const root=fileURLToPath(new URL('../',import.meta.url));
const dir=await mkdtemp(path.join(tmpdir(),'isles-playtest-'));
const base='http://127.0.0.1:5195';
let child;
let cookie='';

async function boot(){
 child=spawn(process.execPath,['server.js'],{
  cwd:root,
  env:{...process.env,PORT:'5195',HOST:'127.0.0.1',DATA_DIR:dir},
  stdio:['ignore','pipe','inherit']
 });
 await new Promise((resolve,reject)=>{
  child.stdout.once('data',resolve);
  child.once('error',reject);
  child.once('exit',code=>reject(Error('Server exited '+code)));
 });
}

async function stop(){
 if(!child?.pid||child.exitCode!==null||child.signalCode!==null)return;
 await new Promise(resolve=>{child.once('exit',resolve);child.kill();});
}

async function api(endpoint,data,status=200){
 const response=await fetch(base+'/api/'+endpoint,{
  method:data===undefined?'GET':'POST',
  headers:{Cookie:cookie,'Content-Type':'application/json'},
  body:data===undefined?undefined:JSON.stringify(data),
  signal:AbortSignal.timeout(5000)
 });
 cookie=response.headers.get('set-cookie')?.split(';')[0]||cookie;
 const result=await response.json();
 assert.equal(response.status,status,endpoint+': '+(result.error||'unexpected status'));
 return result;
}

async function waitForRun(description,predicate,timeout=3500){
 const end=Date.now()+timeout;
 while(Date.now()<end){
  const {run}=await api('run');
  if(run&&predicate(run))return run;
  await delay(100);
 }
 assert.fail('Timed out waiting for '+description);
}

try{
 await boot();
 await api('state');
 const {player}=await api('profile',{name:'Isolated Review'});
 const {key}=await api('save/key',{});
 const {run}=await api('start',{arena:'coast'});
 assert.equal(run.mode,'survival');
 assert.equal(run.arenaId,'coast');
 assert.equal(run.wave,0);
 await api('weapon/equip',{weapon:'pulse-carbine'},400);

 await api('input',{interact:true});
 await waitForRun('the starting weapon cache',s=>s.openedCaches.includes('starter'));
 await api('input',{interact:false});
 await delay(120);
 await api('input',{interact:true});
 const armed=await waitForRun('the rare harbour cache',s=>s.player.weapon==='pulse-carbine');
 assert.ok(armed.openedCaches.includes('harbour-armory'));
 assert.ok(armed.inventory.includes('pulse-carbine'));

 await api('input',{attack:true,angle:0});
 const fired=await waitForRun('a server-authorized shot',s=>s.events.some(e=>e.type==='pulse-fired'));
 assert.ok(fired.events.some(e=>e.weapon==='pulse-carbine'));
 assert.ok(fired.player.stamina<fired.player.maxStamina);
 const firstWave=await waitForRun('the first wave',s=>s.wave===1);
 assert.equal(firstWave.enemies.filter(e=>e.hp>0).length,6);
 await waitForRun('bots to pursue the hero',s=>s.enemies.some(e=>Math.hypot(e.x-e.homeX,e.y-e.homeY)>30));

 const defeated=await waitForRun('a completed survival record',s=>s.status==='dead'&&s.recorded,60000);
 assert.equal(defeated.wave,1);
 const saved=await api('state');
 assert.equal(saved.player.wins,0);
 assert.equal(saved.player.gear.survival.runs,1);
 assert.equal(saved.player.gear.survival.bestSeconds,Math.floor(defeated.elapsed));
 assert.equal(saved.player.gear.survival.bestWave,1);
 assert.ok(saved.player.gear.foundWeapons.includes('pulse-carbine'));
 await api('input',{interact:true,score:999999});
 assert.deepEqual((await api('state')).player.gear.survival,saved.player.gear.survival);

 await stop();
 await boot();
 cookie='';
 const restored=await api('save/restore',{key});
 assert.equal(restored.player.id,player.id);
 assert.deepEqual(restored.player.gear,saved.player.gear);
 assert.equal(restored.run,null);
 console.log('PASS: Solo Survival pursuit, rare loot, server-authorized firing, one-time results and recovery after restart.');
}finally{
 await stop();
 const resolved=path.resolve(dir);
 assert.ok(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('isles-playtest-'));
 await rm(resolved,{recursive:true,force:true});
}
