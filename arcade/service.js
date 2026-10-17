import {heroById,arenaById} from '../public/arcade/catalog.js';
import {randomBytes,randomUUID} from 'node:crypto';
import {createMatch,step,acceptInput} from '../public/arcade/engine.js';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const code=()=>randomBytes(5).toString('hex').toUpperCase();
export const roomSchema=`CREATE TABLE IF NOT EXISTS stormwake_arcade_rooms(code TEXT PRIMARY KEY,p1 TEXT NOT NULL,p2 TEXT,expires BIGINT NOT NULL,doc JSONB NOT NULL);CREATE INDEX IF NOT EXISTS stormwake_arcade_expiry ON stormwake_arcade_rooms(expires);CREATE INDEX IF NOT EXISTS stormwake_arcade_owner ON stormwake_arcade_rooms(p1);CREATE INDEX IF NOT EXISTS stormwake_arcade_guest ON stormwake_arcade_rooms(p2);`;
export function advanceRoom(room,now){
 if(room.match.phase==='finished'||room.status==='waiting'){room.updated=now;return;}
 const disconnected=room.members.map((p,i)=>p&&now-room.seen[i]>20000);
 if(disconnected.some(Boolean)){room.match.phase='finished';room.match.winner=disconnected[0]&&disconnected[1]?null:disconnected[0]?1:0;room.reason='disconnect';return;}
 const elapsed=Math.max(0,Math.min(500,now-room.updated))+room.remainder;const count=Math.floor(elapsed*60/1000);room.remainder=elapsed-count*1000/60;room.updated=now;
 for(let i=0;i<count;i++)step(room.match);
}
function view(room,player){const seat=room.members.indexOf(player);if(seat<0)fail('This room belongs to other voyagers.',403);return {code:room.code,seat,status:room.status,labels:room.labels,reason:room.reason||null,match:room.match,expires:room.expires};}
export async function arcadeRequest(store,player,route,b={},method='POST',now=Date.now()){
 if(method!=='POST')fail('Use POST for Arcade requests.',405);
 if(!['create','join','sync','leave','resume'].includes(route))fail('Arcade route not found.',404);
 if(route==='resume'){const found=await store.find(player.id,now);return found?view(found,player.id):{code:null};}
 if(route==='create'){
  if(b.mode!==undefined&&!['ai','room'].includes(b.mode))fail('Choose AI or room mode.');
  const existing=await store.find(player.id,now);if(existing)return view(existing,player.id);
  if(await store.recentCount(player.id,now)>=5)fail('Please wait a minute before creating another match.',429);
  const mode=b.mode==='room'?'room':'ai',id=code(),difficulty=['easy','normal','hard'].includes(b.difficulty)?b.difficulty:'normal';
  const room={code:id,members:[player.id,null],labels:[player.name,mode==='ai'?'The Oathbreaker':'Waiting for challenger'],status:mode==='ai'?'playing':'waiting',seen:[now,now],updated:now,remainder:0,expires:now+3600000,match:createMatch(randomUUID(),mode,difficulty)};
  room.match.arena=arenaById(b.arena).id;room.match.heroes=[heroById(b.hero).id,heroById(b.opponent||'hood').id];
  await store.insert(room);return view(room,player.id);
 }
 const id=String(b.code||'').trim().toUpperCase();if(!/^[A-F0-9]{10}$/.test(id))fail('Enter the 10-character room code.');
 if(route==='join'){const active=await store.find(player.id,now);if(active&&active.code!==id)fail('Leave your current match before joining another room.',409);}
 return store.lock(id,async room=>{
  if(!room||room.expires<=now)fail('Room expired or was not found.',404);
  if(route==='join'){
   if(room.members.includes(player.id))return view(room,player.id);
   if(room.status!=='waiting'||room.members[1]||room.match.mode!=='room')fail('This room is full or already started.',409);
   room.match.heroes ||= ['azure','hood'];room.match.heroes[1]=heroById(b.hero).id;
   room.members[1]=player.id;room.labels[1]=player.name;room.seen=[now,now];room.status='playing';room.updated=now;
   return view(room,player.id);
  }
  const seat=room.members.indexOf(player.id);if(seat<0)fail('Join the room before playing.',403);
  advanceRoom(room,now);
  if(route==='leave'){room.match.phase='finished';room.match.winner=room.status==='waiting'?null:1-seat;room.reason='forfeit';room.status='closed';}
  if(route==='sync'){
   const allowed=new Set(['code','seq','axis','crouch','block','jump','attack']);for(const key of Object.keys(b))if(!allowed.has(key))fail('Only input intents are accepted. Results are calculated by the server.');
   room.seen[seat]=now;if(room.status==='playing'&&room.match.phase!=='finished')acceptInput(room.match,seat,b);
  }
  return view(room,player.id);
 });
}
export function postgresRooms(c){return {
 async recentCount(player,now){return Number((await c.query('SELECT COUNT(*) AS n FROM stormwake_arcade_rooms WHERE p1=$1 AND expires>$2',[player,now+3540000])).rows[0].n);},
 async find(player,now){const r=await c.query('SELECT doc FROM stormwake_arcade_rooms WHERE (p1=$1 OR p2=$1) AND expires>$2 ORDER BY expires DESC LIMIT 20',[player,now]);return r.rows.map(x=>x.doc).find(x=>x.match.phase!=='finished')||null;},
 async insert(r){await c.query('INSERT INTO stormwake_arcade_rooms(code,p1,p2,expires,doc) VALUES($1,$2,$3,$4,$5)',[r.code,r.members[0],r.members[1],r.expires,JSON.stringify(r)]);},
 async lock(code,fn){const found=await c.query('SELECT doc FROM stormwake_arcade_rooms WHERE code=$1 FOR UPDATE',[code]);const room=found.rows[0]?.doc;const result=await fn(room);if(room)await c.query('UPDATE stormwake_arcade_rooms SET p2=$2,doc=$3 WHERE code=$1',[code,room.members[1],JSON.stringify(room)]);return result;}
};}
export function sqliteRooms(db){
 db.exec('CREATE TABLE IF NOT EXISTS arcade_rooms(code TEXT PRIMARY KEY,p1 TEXT NOT NULL,p2 TEXT,expires INTEGER NOT NULL,doc TEXT NOT NULL)');
 return {
 async recentCount(player,now){return db.prepare('SELECT COUNT(*) AS n FROM arcade_rooms WHERE p1=? AND expires>?').get(player,now+3540000).n;},
 async find(player,now){return db.prepare('SELECT doc FROM arcade_rooms WHERE (p1=? OR p2=?) AND expires>? ORDER BY expires DESC LIMIT 20').all(player,player,now).map(x=>JSON.parse(x.doc)).find(x=>x.match.phase!=='finished')||null;},
 async insert(r){db.prepare('INSERT INTO arcade_rooms VALUES(?,?,?,?,?)').run(r.code,r.members[0],r.members[1],r.expires,JSON.stringify(r));},
 async lock(code,fn){const row=db.prepare('SELECT doc FROM arcade_rooms WHERE code=?').get(code),room=row?JSON.parse(row.doc):null;const result=await fn(room);if(room)db.prepare('UPDATE arcade_rooms SET p2=?,doc=? WHERE code=?').run(room.members[1],JSON.stringify(room),code);return result;}
 };
}
// Local requests share SQLite's connection: serialize only Arcade work, not Solo.
export function serialized(handler){let tail=Promise.resolve();return (...args)=>{const next=tail.then(()=>handler(...args));tail=next.catch(()=>{});return next;};}
