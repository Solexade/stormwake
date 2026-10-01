import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {createRun,tick,snapshot,setInput,chooseRelic,applyLoadout} from '../public/game.js';
import {SHOP_ITEMS,WEAPONS,SAFEHOUSE,FORGE,SUPPLIES,near,safeArea} from '../public/catalog.js';
import {CHAIN,loginChallenge,validSignature,arrivalChallenge,rpc,checkArrival} from '../chain.js';
export const digest=x=>createHash('sha256').update(x).digest('hex');
export const newProfile=()=>({id:randomUUID(),name:'Wanderer '+randomBytes(2).toString('hex').toUpperCase(),wallet:null,salvage:0,wins:0,best:0,contribution:0,gear:{},potions:1,checkin:null,created:Date.now(),run:null});
const publicProfile=p=>Object.fromEntries(['id','name','wallet','salvage','wins','best','contribution','gear','potions','checkin'].map(k=>[k,p[k]]));
const safe=p=>!p.run||p.run.status!=='active'||p.run.inSafehouse;
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export async function persist(c,p){await c.query('UPDATE stormwake_profiles SET wallet=$2,name=$3,best=$4,wins=$5,doc=$6 WHERE id=$1',[p.id,p.wallet,p.name,p.best,p.wins,JSON.stringify(p)]);}
async function insert(c,p){await c.query('INSERT INTO stormwake_profiles(id,wallet,name,best,wins,doc) VALUES($1,$2,$3,$4,$5,$6)',[p.id,p.wallet,p.name,p.best,p.wins,JSON.stringify(p)]);}
async function record(c,p,kind,payload,id=randomUUID()){await c.query('INSERT INTO stormwake_records(id,player,kind,payload,created) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING',[id,p.id,kind,JSON.stringify(payload),Date.now()]);}
async function issue(c,ctx){const token=randomBytes(32).toString('hex');await c.query('INSERT INTO stormwake_sessions(token,player,expires) VALUES($1,$2,$3)',[digest(token),ctx.p.id,Date.now()+31536000000]);ctx.cookie=token;ctx.token=digest(token);}
export async function advance(c,p,now=Date.now()){
 const s=p.run;if(!s)return;
 if(s.status==='active'){
  if(now-s.started>45*60*1000)s.status='expired';
  // Resume after outages without simulating minutes of unattended combat.
  const elapsed=Math.max(0,Math.min(1000,now-(s.updatedAt||now)));let left=elapsed,clock=now-elapsed;
  while(left>0&&s.status==='active'){const ms=Math.min(1000/30,left);clock+=ms;tick(s,ms/1000,clock);left-=ms;}
  s.updatedAt=now;
  if(s.usedPotions>s.potionsDebited){p.potions=Math.max(0,p.potions-(s.usedPotions-s.potionsDebited));s.potionsDebited=s.usedPotions;}
 }
 for(const e of s.events||[]){if(e.id>(s.savedEvent||0))await record(c,p,'combat',{runId:s.id,...e},s.id+':event:'+e.id);}s.savedEvent=s.eventId;
 if(s.status!=='active'&&!s.recorded){s.recorded=true;if(s.status==='won'){p.salvage+=s.salvage;p.wins++;p.best=Math.max(p.best,s.score);s.result={score:s.score,salvage:s.salvage,seconds:Math.round(s.elapsed)};}await record(c,p,'expedition',{runId:s.id,status:s.status,score:s.score,salvage:s.status==='won'?s.salvage:0,kills:s.kills,seconds:Math.round(s.elapsed),weapon:s.player.weapon,relic:s.relic,damageTaken:s.damageTaken},s.id+':result');}
}
export async function dispatch(c,ctx,route,b={},method='POST',origin='http://localhost',now=Date.now()){
 if(route.startsWith('arrival/'))fail('Onchain arrivals are currently disabled.',410);
 let p=ctx.p;await advance(c,p,now);
 const state=async()=>({player:publicProfile(ctx.p),chain:CHAIN,shop:SHOP_ITEMS,world:{salvage:Number((await c.query('SELECT salvage FROM stormwake_world WHERE id=1')).rows[0].salvage),target:1500},leaderboard:(await c.query('SELECT name,best,wins FROM stormwake_profiles WHERE wins>0 ORDER BY best DESC,wins DESC LIMIT 10')).rows,run:ctx.p.run?snapshot(ctx.p.run):null,storage:'postgres'});
 const needIdentity=()=>{if(!safe(p)&&!p.run?.paused)fail('Pause your expedition before connecting a wallet.');};
 const needSafe=()=>{if(!safe(p))fail('Return to the harbour safehouse first.');};
 if(method==='GET'&&route==='state')return state();
 if(method==='GET'&&route==='run')return {run:p.run?snapshot(p.run):null};
 if(method==='GET'&&route==='history')return {records:(await c.query('SELECT kind,payload,created FROM stormwake_records WHERE player=$1 AND kind<>$2 ORDER BY created DESC LIMIT 50',[p.id,'combat'])).rows};
 if(method!=='POST')fail('Route not found.',404);
 if(route==='save/key'){const key=randomBytes(32).toString('hex');await c.query('INSERT INTO stormwake_sessions(token,player,expires) VALUES($1,$2,$3)',[digest(key),p.id,now+31536000000]);return {key:'SW-'+key};}
 if(route==='save/restore'){
  const key=String(b.key||'').trim();if(!/^SW-[0-9a-f]{64}$/.test(key))fail('This recovery key is invalid or expired.',401);
  const row=(await c.query('SELECT player FROM stormwake_sessions WHERE token=$1 AND expires>$2',[digest(key.slice(3)),now])).rows[0];
  if(!row)fail('This recovery key is invalid or expired.',401);
  if(row.player!==p.id){if(p.run?.status==='active'){p.run.paused=true;p.run.input={};p.run.commands={};}await persist(c,p);const found=(await c.query('SELECT doc FROM stormwake_profiles WHERE id=$1 FOR UPDATE',[row.player])).rows[0];if(!found)fail('This recovery key is invalid or expired.',401);ctx.p=found.doc;}
  await issue(c,ctx);return state();
 }
 if(route==='profile'){const name=String(b.name||'').trim();if(!/^[\p{L}\p{N} _-]{3,18}$/u.test(name))fail('Use 3â€“18 letters, numbers, spaces, dashes or underscores.');p.name=name;return {player:publicProfile(p)};}
 if(route==='start'){if(!p.run||p.run.status!=='active'){p.run=createRun(randomUUID(),now,p);p.run.updatedAt=now;await record(c,p,'expedition-started',{runId:p.run.id,weapon:p.run.player.weapon});}p.run.inSafehouse=false;p.run.paused=false;return {run:snapshot(p.run)};}
 if(route==='pause'){if(p.run?.status==='active'){p.run.paused=b.paused===true;p.run.input={};p.run.commands={};p.run.held={};p.run.player.vx=p.run.player.vy=0;p.run.lastInputAt=now;p.run.updatedAt=now;}return {run:p.run?snapshot(p.run):null};}
 if(route==='input'){if(p.run?.status==='active')setInput(p.run,b,now);return {run:p.run?snapshot(p.run):null};}
 if(route==='leave'){if(p.run?.status==='active'){p.run.paused=true;p.run.input={};p.run.commands={};}await advance(c,p,now);return {ok:true};}
 if(route==='relic'){if(!p.run||!chooseRelic(p.run,b.relic))fail('Defeat the shrine guardians and stand beside the shrine.');return {run:snapshot(p.run)};}
 if(route==='safehouse/enter'){const s=p.run;if(s?.status==='active'){if(!safeArea(s.player)||![SAFEHOUSE,FORGE,SUPPLIES].some(q=>near(s.player,q,130)))fail('Reach Hearthhall or a harbour merchant first.');s.inSafehouse=true;s.input={};s.commands={};s.player.vx=s.player.vy=0;}return state();}
 if(route==='safehouse/exit'){if(p.run){p.run.inSafehouse=false;p.run.input={};p.run.commands={};p.run.lastInputAt=now;p.run.updatedAt=now;}return {run:p.run?snapshot(p.run):null};}
 if(route==='safehouse/rest'){needSafe();const s=p.run;if(s?.status==='active'){s.player.hp=s.player.maxHp;s.player.stamina=s.player.maxStamina;s.player.action='idle';s.player.attack=0;s.buffer=null;}return state();}
 if(route==='weapon/equip'){if(!Object.hasOwn(WEAPONS,b.weapon))fail('Choose an available weapon.');const s=p.run;if(s?.status==='active'&&s.player.action!=='idle')fail('Finish your move before switching weapons.');p.gear.weapon=b.weapon;if(s?.status==='active'){s.player.weapon=b.weapon;s.player.combo=s.player.comboWindow=0;s.buffer=null;}await record(c,p,'weapon-equipped',{weapon:b.weapon});return state();}
 if(route==='shop/buy'){needSafe();if(!Object.hasOwn(SHOP_ITEMS,b.item))fail('Unknown shop item.');const item=SHOP_ITEMS[b.item],rank=b.item==='potion'?p.potions:p.gear[b.item]||0;if(rank>=(b.item==='potion'?3:item.costs.length))fail('You already own the maximum amount.');const cost=item.costs[b.item==='potion'?0:rank];if(p.salvage<cost)fail(`You need ${cost} recovered salvage.`);p.salvage-=cost;if(b.item==='potion')p.potions++;else p.gear[b.item]=rank+1;if(p.run?.status==='active')applyLoadout(p.run,p);await record(c,p,'purchase',{item:b.item,cost,rank:rank+1});return state();}
 if(route==='contribute'){const amount=Number(b.amount);if(!Number.isSafeInteger(amount)||amount<1||amount>100000)fail('Choose a whole amount of salvage.');if(p.salvage<amount)fail('You need more recovered salvage.');p.salvage-=amount;p.contribution+=amount;await c.query('UPDATE stormwake_world SET salvage=salvage+$1 WHERE id=1',[amount]);await record(c,p,'contribution',{amount});return state();}
 if(route==='auth/challenge'){needIdentity();try{p.auth=loginChallenge(b.address,origin,now);}catch{fail('Choose a valid EVM wallet address.');}return p.auth;}
 if(route==='auth/verify'){
  needIdentity();const entry=p.auth;p.auth=null;if(!entry||entry.nonce!==b.nonce||!await validSignature(entry,b.signature))fail('Signature expired, already used, or does not match.',401);
  const found=(await c.query('SELECT doc FROM stormwake_profiles WHERE wallet=$1 FOR UPDATE',[entry.wallet])).rows[0];
  if(found&&found.doc.id!==p.id){if(p.run?.status==='active'){p.run.paused=true;p.run.input={};p.run.commands={};}await advance(c,p,now);await persist(c,p);ctx.p=found.doc;}
  else if(!p.wallet){p.wallet=entry.wallet;await c.query('DELETE FROM stormwake_sessions WHERE player=$1',[p.id]);}
  else if(p.wallet!==entry.wallet){await persist(c,p);ctx.p=newProfile();ctx.p.wallet=entry.wallet;await insert(c,ctx.p);}
  await c.query('DELETE FROM stormwake_sessions WHERE token=$1',[ctx.token]);await issue(c,ctx);await record(c,ctx.p,'wallet-signin',{wallet:ctx.p.wallet});return state();
 }
 if(route==='auth/logout'){needIdentity();await c.query('DELETE FROM stormwake_sessions WHERE token=$1',[ctx.token]);if(p.run?.status==='active'){p.run.paused=true;p.run.input={};p.run.commands={};}await advance(c,p,now);ctx.cookie='';return {ok:true};}
 if(route==='arrival/challenge'){needSafe();if(!p.wallet)fail('Sign in with your wallet first.',401);if(p.checkin)return {recorded:p.checkin};if(!p.arrival||p.arrival.expires<now)p.arrival=arrivalChallenge(p.wallet);return {nonce:p.arrival.nonce,from:p.wallet,to:p.wallet,value:'0x0',data:p.arrival.data,chainId:CHAIN.hex};}
 if(route==='arrival/verify'){needSafe();if(!p.wallet)fail('Sign in first.',401);const entry=p.arrival;if(!entry||entry.expires<now||entry.nonce!==b.nonce||!/^0x[0-9a-fA-F]{64}$/.test(b.hash||''))fail('Invalid or expired arrival request.');if(p.checkin)return {pending:false,hash:p.checkin,player:publicProfile(p)};const [chain,tx,receipt]=await Promise.all([rpc('eth_chainId'),rpc('eth_getTransactionByHash',[b.hash]),rpc('eth_getTransactionReceipt',[b.hash])]);let result;try{result=checkArrival(entry,tx,receipt,chain);}catch(e){fail(e.message);}if(!result.pending){p.checkin=result.hash;await record(c,p,'onchain-arrival',result);}return {...result,player:publicProfile(p)};}
 fail('Route not found.',404);
}
export async function openSession(c,rawToken){
 const token=digest(rawToken||''),row=(await c.query('SELECT player,expires FROM stormwake_sessions WHERE token=$1 AND expires>$2',[token,Date.now()])).rows[0];
 if(row){const p=(await c.query('SELECT doc FROM stormwake_profiles WHERE id=$1 FOR UPDATE',[row.player])).rows[0];if(p){const ctx={p:p.doc,token};if(Number(row.expires)-Date.now()<2592000000){await c.query('UPDATE stormwake_sessions SET expires=$2 WHERE token=$1',[token,Date.now()+31536000000]);ctx.cookie=rawToken;}return ctx;}}
 const ctx={p:newProfile(),token};await insert(c,ctx.p);await issue(c,ctx);return ctx;
}
