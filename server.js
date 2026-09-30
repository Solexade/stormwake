import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createRun,tick,chooseRelic,snapshot,setInput,applyLoadout} from './public/game.js';
import {SHOP_ITEMS,WEAPONS,SAFEHOUSE,FORGE,SUPPLIES,near,safeArea} from './public/catalog.js';
import {CHAIN,loginChallenge,validSignature,arrivalChallenge,rpc,checkArrival} from './chain.js';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const DATA=process.env.DATA_DIR||path.join(ROOT,'data');mkdirSync(DATA,{recursive:true});
const db=new DatabaseSync(path.join(DATA,'isles.sqlite'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY, token TEXT UNIQUE, name TEXT, salvage INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, best INTEGER DEFAULT 0, contribution INTEGER DEFAULT 0, created INTEGER);
CREATE TABLE IF NOT EXISTS results(id TEXT PRIMARY KEY,player TEXT,score INTEGER,salvage INTEGER,seconds REAL,relic TEXT,created INTEGER);
CREATE TABLE IF NOT EXISTS world(id INTEGER PRIMARY KEY, salvage INTEGER DEFAULT 0);
INSERT OR IGNORE INTO world(id,salvage) VALUES(1,0);`);
const columns=db.prepare('PRAGMA table_info(players)').all().map(c=>c.name);
for(const [name,type] of [['wallet','TEXT'],['gear',"TEXT DEFAULT '{}'"],['potions','INTEGER DEFAULT 1'],['checkin','TEXT']])if(!columns.includes(name))db.exec(`ALTER TABLE players ADD COLUMN ${name} ${type}`);
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS wallet_unique ON players(wallet) WHERE wallet IS NOT NULL;
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,player TEXT,expires INTEGER);
CREATE TABLE IF NOT EXISTS auth_nonces(nonce TEXT PRIMARY KEY,player TEXT,wallet TEXT,message TEXT,expires INTEGER,used INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS arrivals(nonce TEXT PRIMARY KEY,player TEXT,wallet TEXT,data TEXT,expires INTEGER,tx TEXT UNIQUE,block INTEGER);
CREATE TABLE IF NOT EXISTS purchases(id TEXT PRIMARY KEY,player TEXT,item TEXT,cost INTEGER,created INTEGER);`);
const runs=new Map();const rates=new Map();
const digest=x=>createHash('sha256').update(x).digest('hex');
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
function profile(p){return {id:p.id,name:p.name,salvage:p.salvage,wins:p.wins,best:p.best,contribution:p.contribution,wallet:p.wallet,gear:JSON.parse(p.gear||'{}'),potions:p.potions,checkin:p.checkin};}
function state(p){return {player:profile(p),chain:CHAIN,shop:SHOP_ITEMS,world:{salvage:db.prepare('SELECT salvage FROM world WHERE id=1').get().salvage,target:1500},leaderboard:db.prepare('SELECT name,best,wins,contribution FROM players WHERE wins>0 ORDER BY best DESC,wins DESC LIMIT 10').all(),run:runs.has(p.id)?snapshot(runs.get(p.id)):null};}
const fresh=id=>db.prepare('SELECT * FROM players WHERE id=?').get(id);
function safeSession(p){const s=runs.get(p.id);return !s||s.status!=='active'||s.inSafehouse;}
function cookie(res,token){res.setHeader('Set-Cookie',`isles=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.NODE_ENV==='production'?'; Secure':''}`);}
function issueSession(res,id){const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),id,Date.now()+604800000);cookie(res,token);}
function saveResult(pId,s){
  if(s.recorded||s.status==='active')return;s.recorded=true;
  if(s.status!=='won')return;
  db.exec('BEGIN IMMEDIATE');
  try{db.prepare('INSERT INTO results VALUES(?,?,?,?,?,?,?)').run(s.id,pId,s.score,s.salvage,s.elapsed,s.relic,Date.now());db.prepare('UPDATE players SET salvage=salvage+?,wins=wins+1,best=MAX(best,?) WHERE id=?').run(s.salvage,s.score,pId);db.exec('COMMIT');s.result={score:s.score,salvage:s.salvage,seconds:Math.round(s.elapsed)};}
  catch(e){db.exec('ROLLBACK');s.recorded=false;console.error('Could not save result:',e.message);}
}
setInterval(()=>{const now=Date.now();for(const [id,s] of runs){try{tick(s,1/30,now);if(s.usedPotions>s.potionsDebited){const n=s.usedPotions-s.potionsDebited;db.prepare('UPDATE players SET potions=MAX(0,potions-?) WHERE id=?').run(n,id);s.potionsDebited=s.usedPotions;}saveResult(id,s);}catch(e){console.error(e);s.status='error';}if(now-s.started>45*60*1000)runs.delete(id);}for(const [k,v] of rates)if(now-v.start>60000)rates.delete(k);},1000/30).unref();
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>4096)throw Error('Request too large');}return s?JSON.parse(s):{};}
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/')){
      if(req.method!=='GET'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return json(res,403,{error:'Please use this game’s own tab.'});
      let token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('isles='))?.slice(6);
      let p=token?(db.prepare('SELECT p.* FROM players p JOIN sessions s ON p.id=s.player WHERE s.token=? AND s.expires>?').get(digest(token),Date.now())||db.prepare('SELECT * FROM players WHERE token=? AND wallet IS NULL').get(digest(token))):null;
      if(!p){token=randomBytes(32).toString('hex');const id=randomUUID();db.prepare('INSERT INTO players(id,token,name,created) VALUES(?,?,?,?)').run(id,digest(token),'Wanderer '+id.slice(0,4).toUpperCase(),Date.now());p=db.prepare('SELECT * FROM players WHERE id=?').get(id);res.setHeader('Set-Cookie',`isles=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${process.env.NODE_ENV==='production'?'; Secure':''}`);}
      const rate=rates.get(p.id)||{start:Date.now(),count:0};if(Date.now()-rate.start>10000){rate.start=Date.now();rate.count=0;}rate.count++;rates.set(p.id,rate);if(rate.count>260)return json(res,429,{error:'Slow down for a moment.'});
      if(req.method==='GET'&&url.pathname==='/api/state')return json(res,200,state(p));
      if(req.method==='GET'&&url.pathname==='/api/history'){const records=[...db.prepare('SELECT * FROM results WHERE player=?').all(p.id).map(r=>({kind:'expedition',created:r.created,payload:{score:r.score,salvage:r.salvage,seconds:r.seconds}})),...db.prepare('SELECT * FROM purchases WHERE player=?').all(p.id).map(r=>({kind:'purchase',created:r.created,payload:{item:r.item,cost:r.cost}}))].sort((a,b)=>b.created-a.created).slice(0,50);return json(res,200,{records});}
      if(req.method==='GET'&&url.pathname==='/api/run')return json(res,200,{run:runs.has(p.id)?snapshot(runs.get(p.id)):null});
      const b=req.method==='POST'?await body(req):{};
      if(req.method==='POST'&&url.pathname==='/api/safehouse/enter'){
        const s=runs.get(p.id);if(s?.status==='active'){if(!safeArea(s.player)||![SAFEHOUSE,FORGE,SUPPLIES].some(q=>near(s.player,q,130)))return json(res,400,{error:'Reach the Hearthhall door or a harbour merchant first.'});s.inSafehouse=true;s.input={};s.commands={};s.player.vx=s.player.vy=0;}
        return json(res,200,state(fresh(p.id)));
      }
      if(req.method==='POST'&&url.pathname==='/api/safehouse/exit'){const s=runs.get(p.id);if(s){s.inSafehouse=false;s.input={};s.commands={};s.lastInputAt=Date.now();}return json(res,200,{run:s?snapshot(s):null});}
      if(req.method==='POST'&&url.pathname==='/api/safehouse/rest'){
        if(!safeSession(p))return json(res,400,{error:'Rest inside Hearthhall first.'});const s=runs.get(p.id);if(s?.status==='active'){s.player.hp=s.player.maxHp;s.player.stamina=s.player.maxStamina;s.player.action='idle';s.player.attack=0;s.buffer=null;}return json(res,200,state(fresh(p.id)));
      }
      if(req.method==='POST'&&url.pathname==='/api/weapon/equip'){
        if(!Object.hasOwn(WEAPONS,b.weapon))return json(res,400,{error:'Choose an available weapon.'});
        const s=runs.get(p.id);if(s?.status==='active'&&s.player.action!=='idle')return json(res,400,{error:'Finish your current move before switching weapons.'});
        const gear=JSON.parse(fresh(p.id).gear||'{}');gear.weapon=b.weapon;db.prepare('UPDATE players SET gear=? WHERE id=?').run(JSON.stringify(gear),p.id);
        if(s?.status==='active'){s.player.weapon=b.weapon;s.player.combo=0;s.player.comboWindow=0;s.buffer=null;}
        return json(res,200,state(fresh(p.id)));
      }
      if(req.method==='POST'&&url.pathname==='/api/shop/buy'){
        if(!safeSession(p))return json(res,400,{error:'Visit the harbour merchants before purchasing.'});
          const item=Object.hasOwn(SHOP_ITEMS,b.item)?SHOP_ITEMS[b.item]:null;if(!item)return json(res,400,{error:'Unknown shop item.'});
        db.exec('BEGIN IMMEDIATE');try{const current=fresh(p.id),gear=JSON.parse(current.gear||'{}'),rank=gear[b.item]||0;
          if(b.item==='potion'?current.potions>=3:rank>=item.costs.length){db.exec('ROLLBACK');return json(res,400,{error:'You already own the maximum amount.'});}
          const cost=item.costs[b.item==='potion'?0:rank];if(current.salvage<cost){db.exec('ROLLBACK');return json(res,400,{error:`You need ${cost} recovered salvage.`});}
          if(b.item==='potion')db.prepare('UPDATE players SET salvage=salvage-?,potions=potions+1 WHERE id=?').run(cost,p.id);
          else {gear[b.item]=rank+1;db.prepare('UPDATE players SET salvage=salvage-?,gear=? WHERE id=?').run(cost,JSON.stringify(gear),p.id);}
          db.prepare('INSERT INTO purchases VALUES(?,?,?,?,?)').run(randomUUID(),p.id,b.item,cost,Date.now());db.exec('COMMIT');
        }catch(e){db.exec('ROLLBACK');throw e;}
        const updated=fresh(p.id),s=runs.get(p.id);if(s?.status==='active')applyLoadout(s,profile(updated));return json(res,200,state(updated));
      }
      if(req.method==='POST'&&url.pathname==='/api/auth/challenge'){
        if(!safeSession(p))return json(res,400,{error:'Enter Hearthhall before signing in.'});
        const origin=process.env.PUBLIC_ORIGIN||`${process.env.NODE_ENV==='production'?'https':'http'}://${req.headers.host}`;
        let challenge;try{challenge=loginChallenge(b.address,origin);}catch{return json(res,400,{error:'Choose a valid EVM wallet address.'});}
        db.prepare('DELETE FROM auth_nonces WHERE player=? OR expires<?').run(p.id,Date.now());
        db.prepare('INSERT INTO auth_nonces(nonce,player,wallet,message,expires) VALUES(?,?,?,?,?)').run(challenge.nonce,p.id,challenge.wallet,challenge.message,challenge.expires);return json(res,200,challenge);
      }
      if(req.method==='POST'&&url.pathname==='/api/auth/verify'){
        if(!safeSession(p))return json(res,400,{error:'Enter Hearthhall before signing in.'});
        const entry=db.prepare('SELECT * FROM auth_nonces WHERE nonce=? AND player=? AND used=0').get(String(b.nonce||''),p.id);
        if(!entry)return json(res,401,{error:'Sign-in expired or already used. Request a new signature.'});
        db.prepare('UPDATE auth_nonces SET used=1 WHERE nonce=?').run(entry.nonce);
        if(!await validSignature(entry,b.signature))return json(res,401,{error:'The wallet signature did not match or expired.'});
        let target=db.prepare('SELECT * FROM players WHERE wallet=?').get(entry.wallet);
        if(!target){if(!p.wallet){db.prepare('UPDATE players SET wallet=?,token=? WHERE id=?').run(entry.wallet,digest(randomBytes(32)),p.id);target=fresh(p.id);}else{const id=randomUUID();db.prepare('INSERT INTO players(id,token,name,created,wallet) VALUES(?,?,?,?,?)').run(id,digest(randomBytes(32)),'Voyager '+entry.wallet.slice(-4).toUpperCase(),Date.now(),entry.wallet);target=fresh(id);}}
        if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));
        // Switching to an existing wallet loads its own inventory; balances never merge.
        if(target.id!==p.id){const old=runs.get(p.id);if(old?.status==='active')old.status='abandoned';}
        issueSession(res,target.id);return json(res,200,state(target));
      }
      if(req.method==='POST'&&url.pathname==='/api/auth/logout'){
        if(!safeSession(p))return json(res,400,{error:'Return to Hearthhall before disconnecting.'});if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));const old=runs.get(p.id);if(old?.status==='active')old.status='abandoned';cookie(res,'');return json(res,200,{ok:true});
      }
      if(req.method==='POST'&&url.pathname==='/api/arrival/challenge'){
        if(!p.wallet||!safeSession(p))return json(res,401,{error:'Sign in with your wallet in Hearthhall first.'});
        if(p.checkin)return json(res,200,{recorded:p.checkin});
        let entry=db.prepare('SELECT * FROM arrivals WHERE player=? AND expires>? AND tx IS NULL ORDER BY expires DESC LIMIT 1').get(p.id,Date.now());
        if(!entry){entry=arrivalChallenge(p.wallet);db.prepare('INSERT INTO arrivals(nonce,player,wallet,data,expires) VALUES(?,?,?,?,?)').run(entry.nonce,p.id,entry.wallet,entry.data,entry.expires);}
        return json(res,200,{nonce:entry.nonce,from:p.wallet,to:p.wallet,value:'0x0',data:entry.data,chainId:CHAIN.hex});
      }
      if(req.method==='POST'&&url.pathname==='/api/arrival/verify'){
        if(!p.wallet||!safeSession(p))return json(res,401,{error:'Return to your signed-in safehouse profile.'});
        if(!/^0x[0-9a-fA-F]{64}$/.test(b.hash||''))return json(res,400,{error:'Enter a valid transaction hash.'});
        const entry=db.prepare('SELECT * FROM arrivals WHERE nonce=? AND player=?').get(String(b.nonce||''),p.id);if(!entry||entry.expires<Date.now())return json(res,400,{error:'This check-in request expired.'});
        if(entry.tx)return json(res,200,{pending:false,hash:entry.tx,player:profile(fresh(p.id))});
        const [chain,tx,receipt]=await Promise.all([rpc('eth_chainId'),rpc('eth_getTransactionByHash',[b.hash]),rpc('eth_getTransactionReceipt',[b.hash])]);
        let result;try{result=checkArrival(entry,tx,receipt,chain);}catch(e){return json(res,400,{error:e.message});}
        if(result.pending)return json(res,200,result);
        db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE arrivals SET tx=?,block=? WHERE nonce=? AND tx IS NULL').run(result.hash,result.block,entry.nonce);db.prepare('UPDATE players SET checkin=? WHERE id=?').run(result.hash,p.id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
        return json(res,200,{...result,player:profile(fresh(p.id))});
      }
      if(req.method==='POST'&&url.pathname==='/api/profile'){
        const name=String(b.name||'').trim();if(!/^[\p{L}\p{N} _-]{3,18}$/u.test(name))return json(res,400,{error:'Use 3–18 letters, numbers, spaces, dashes or underscores.'});
        db.prepare('UPDATE players SET name=? WHERE id=?').run(name,p.id);return json(res,200,{player:profile({...p,name})});
      }
      if(req.method==='POST'&&url.pathname==='/api/start'){
        let s=runs.get(p.id);if(!s||s.status!=='active'){s=createRun(randomUUID(),Date.now(),profile(p));runs.set(p.id,s);}s.inSafehouse=false;return json(res,200,{run:snapshot(s)});
      }
      if(req.method==='POST'&&url.pathname==='/api/input'){
        const s=runs.get(p.id);if(!s||s.status!=='active')return json(res,200,{run:s?snapshot(s):null});
        setInput(s,b);return json(res,200,{run:snapshot(s)});
      }
      if(req.method==='POST'&&url.pathname==='/api/relic'){
        const s=runs.get(p.id);if(!s||!chooseRelic(s,b.relic))return json(res,400,{error:'Defeat the shrine guardians and stand beside the shrine first.'});return json(res,200,{run:snapshot(s)});
      }
      if(req.method==='POST'&&url.pathname==='/api/leave'){const s=runs.get(p.id);if(s?.status==='active')s.status='abandoned';return json(res,200,{ok:true});}
      if(req.method==='POST'&&url.pathname==='/api/contribute'){
        const amount=Number(b.amount);if(!Number.isSafeInteger(amount)||amount<1||amount>100000)return json(res,400,{error:'Choose a whole amount of salvage.'});
        db.exec('BEGIN IMMEDIATE');
        try {
          const updated=db.prepare('UPDATE players SET salvage=salvage-?,contribution=contribution+? WHERE id=? AND salvage>=?').run(amount,amount,p.id,amount);
          if(!updated.changes){db.exec('ROLLBACK');return json(res,400,{error:'You need more recovered salvage.'});}
          db.prepare('UPDATE world SET salvage=salvage+? WHERE id=1').run(amount);db.exec('COMMIT');
        } catch(e){db.exec('ROLLBACK');throw e;}
        return json(res,200,state(db.prepare('SELECT * FROM players WHERE id=?').get(p.id)));
      }
      return json(res,404,{error:'That route does not exist.'});
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'});
    const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/game.js':'game.js','/world.js':'world.js','/combat.js':'combat.js','/catalog.js':'catalog.js','/wallet.js':'wallet.js','/scene3d.js':'scene3d.js','/icon.svg':'icon.svg','/vendor/three.module.js':'vendor/three.module.js','/vendor/three.core.min.js':'vendor/three.core.min.js','/vendor/THREE-LICENSE.txt':'vendor/THREE-LICENSE.txt'};
    files['/adventure.js']='adventure.js';
    const file=files[url.pathname];if(!file){res.writeHead(404);return res.end('Not found');}
    const bytes=await readFile(path.join(ROOT,'public',file));const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'};
    res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:bytes);
  }catch(e){console.error(e.message);if(!res.headersSent)json(res,400,{error:'The request could not be completed. Please try again.'});else res.end();}
});
server.listen(Number(process.env.PORT)||5180,process.env.HOST||'127.0.0.1',()=>console.log(`Stormwake ready at http://${process.env.HOST||'127.0.0.1'}:${process.env.PORT||5180}`));
