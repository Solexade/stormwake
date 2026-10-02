import {MOTION,locomotion} from './motion.js';
import {HOME,SHRINE,BOSS,RELICS,walkable} from './world.js';
import {loadoutStats,safeArea,WEAPONS,SAFEHOUSE,FORGE,SUPPLIES} from './catalog.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export const COMBO_HITS=3;
export function interactionFor(s){
 if(!s||s.status!=='active'||s.inSafehouse||s.paused)return null;const p=s.player;
 if(s.bossDead&&distance(p,HOME)<115)return {kind:'extract',label:'Return with salvage',ready:true};
 if(!s.chest&&distance(p,{x:580,y:720})<95)return {kind:'chest',label:'Open cache · heal + salvage',ready:true};
 if(!s.relic&&distance(p,SHRINE)<130)return {kind:'relic',label:s.relicReady?'Choose relic':'Defeat both shrine guardians',ready:!!s.relicReady};
 if([FORGE,SUPPLIES].some(q=>distance(p,q)<115))return {kind:'forge',label:'Open shop',ready:true};
 if(distance(p,SAFEHOUSE)<115)return {kind:'hearth',label:'Enter Hearthhall',ready:true};
 return null;
}
export const ATTACKS={
 light1:{name:'Crosscut',duration:.43,hit:.13,damage:24,cost:8,range:105,arc:1.25,lunge:18,stagger:.13},
 light2:{name:'Backhand',duration:.48,hit:.17,damage:32,cost:10,range:116,arc:1.65,lunge:23,stagger:.23},
 finisher:{name:'Stormbreaker',duration:.78,hit:.32,damage:72,cost:22,range:155,arc:2.8,lunge:37,stagger:.72},
 heavy:{name:'Cleave',duration:.82,hit:.34,damage:51,cost:23,range:135,arc:1.9,lunge:25,stagger:.48}
};
function move(a,dx,dy,r=16){const x=a.x,y=a.y;if(walkable(a.x+dx,a.y,r))a.x+=dx;if(walkable(a.x,a.y+dy,r))a.y+=dy;return Math.hypot(a.x-x,a.y-y);}
function chase(e,p,speed,dt){const angle=Math.atan2(p.y-e.y,p.x-e.x);if(move(e,Math.cos(angle)*speed*dt,Math.sin(angle)*speed*dt,18)<speed*dt*.25){for(const side of [1,-1])if(move(e,Math.cos(angle+side*.95)*speed*dt,Math.sin(angle+side*.95)*speed*dt,18)>0)break;}}
export function weaponAttack(p,key){const a=ATTACKS[key];if(!a)return null;const w=WEAPONS[p.weapon]||WEAPONS.axe;return {...a,damage:Math.round(a.damage*w.damage),duration:a.duration*w.speed,hit:a.hit*w.speed,range:a.range*w.reach,cost:Math.ceil(a.cost*w.cost),arc:p.weapon==='spear'?a.arc*.6:a.arc};}
export function createRun(id,now=Date.now(),options={}){
 const stats=loadoutStats(options.gear,options.wins);
 const definitions=[['raider',730,1160],['raider',925,1140],['archer',1305,1115],['brute',1380,920],['raider',935,850],['archer',730,705],['brute',590,810],['raider',1650,825],['archer',1800,885],['raider',2090,580]];
 return {id,started:now,elapsed:0,status:'active',inSafehouse:false,player:{...HOME,...stats,weapon:Object.hasOwn(WEAPONS,options.gear?.weapon)?options.gear.weapon:'axe',hp:stats.maxHp,stamina:stats.maxStamina,angle:-Math.PI/2,vx:0,vy:0,moveAngle:-Math.PI/2,sprinting:false,attack:0,dodge:0,storm:0,potionCooldown:0,invulnerable:0,dashing:0,slash:0,action:'idle',actionTime:0,actionDuration:0,actionId:0,combo:0,comboWindow:0,comboCharge:0,hitDone:false,guard:false,guardAge:0,staminaDelay:0,potions:clamp(options.potions??1,0,3)},
 enemies:definitions.map(([type,x,y],i)=>({id:i,type,x,y,homeX:x,homeY:y,hp:type==='brute'?130:type==='archer'?64:80,maxHp:type==='brute'?130:type==='archer'?64:80,cd:1+i*.08,wind:0,angle:0,flash:0,stagger:0,swing:0,death:0,vx:0,vy:0})),
 boss:{id:99,type:'boss',...BOSS,hp:600,maxHp:600,cd:2,wind:0,angle:0,flash:0,stagger:0,swing:0,death:0,vx:0,vy:0,awake:false,phase:1},
 input:{dx:0,dy:0,angle:-Math.PI/2},held:{},commands:{},commandIds:{},buffer:null,kills:0,salvage:0,score:0,relic:null,relicReady:false,bossDead:false,chest:false,usedPotions:0,potionsDebited:0,
 shots:[],effects:[],events:[],eventId:0,damageTaken:0,sequence:0,lastInputAt:now,result:null};
}
function event(s,type,data={}){s.events.push({id:++s.eventId,type,...data});if(s.events.length>24)s.events.shift();}
function effect(s,type,x,y,life=.45,extra={}){s.effects.push({type,x,y,life,maxLife:life,...extra});}
function spend(p,n){if(p.stamina<n)return false;p.stamina-=n;p.staminaDelay=.48;return true;}
function hitEnemy(s,e,damage,stagger=0,knock=0){if(e.hp<=0)return;e.hp=Math.max(0,e.hp-damage);e.flash=.16;effect(s,'hit',e.x,e.y,.42,{amount:damage});effect(s,'blood',e.x,e.y,2.4);
 if(stagger){e.stagger=Math.max(e.stagger,e.type==='boss'?stagger*.28:stagger);if(e.type!=='boss')e.wind=0;}if(knock){const a=Math.atan2(e.y-s.player.y,e.x-s.player.x);move(e,Math.cos(a)*knock,Math.sin(a)*knock,18);}
 if(!e.hp){s.kills++;s.score+=e.type==='boss'?500:e.type==='brute'?90:60;s.salvage+=e.type==='boss'?80:12;e.death=1.4;effect(s,'death',e.x,e.y,.8);event(s,'kill',{enemy:e.type});if(e.type==='boss'){s.bossDead=true;event(s,'boss-defeated');}}
}
function hurt(s,damage,x,y,source){const p=s.player;if(p.invulnerable>0||s.status!=='active'||safeArea(p)||s.inSafehouse)return;
 const facing=Math.abs(angleDifference(Math.atan2(y-p.y,x-p.x),p.angle))<1.5;
 if(p.guard&&facing&&p.stamina>damage*.7){spend(p,damage*.7);if(p.guardAge<.2){if(source){source.stagger=1.2;source.wind=0;}p.stamina=Math.min(p.maxStamina,p.stamina+10);effect(s,'parry',p.x,p.y,.5);event(s,'parry');return;}damage=Math.ceil(damage*.2);effect(s,'block',p.x,p.y,.3);event(s,'block');}
 p.hp=Math.max(0,p.hp-damage);s.damageTaken+=damage;p.invulnerable=.62;effect(s,'hurt',p.x,p.y,.3);event(s,'hurt');const a=Math.atan2(p.y-y,p.x-x);move(p,Math.cos(a)*13,Math.sin(a)*13);if(!p.hp){s.status='dead';event(s,'defeated');}
}
export function setInput(s,b,now=Date.now()){
 const input={dx:clamp(Number(b.dx)||0,-1,1),dy:clamp(Number(b.dy)||0,-1,1),angle:Number.isFinite(b.angle)?b.angle:s.player.angle};
 for(const action of ['attack','heavy','combo','dodge','storm','potion','guard','sprint','interact'])input[action]=b[action]===true;
 for(const action of ['attack','heavy','combo','dodge','storm','potion']){const id=b[`${action}Id`];if(Number.isSafeInteger(id)&&id>0&&id>(s.commandIds[action]||0)){s.commandIds[action]=id;s.commands[action]=true;}}
 s.input=input;s.lastInputAt=now;
}
export function applyLoadout(s,options){const stats=loadoutStats(options.gear,options.wins),p=s.player;const oldMax=p.maxHp;Object.assign(p,stats);if(s.relic==='raven')p.maxHp-=40;p.hp=Math.min(p.maxHp,p.hp+Math.max(0,p.maxHp-oldMax));p.stamina=Math.min(p.maxStamina,p.stamina);p.potions=clamp(options.potions,0,3);}
export function chooseRelic(s,key){if(s.status!=='active'||s.relic||!s.relicReady||!RELICS[key]||distance(s.player,SHRINE)>130)return false;s.relic=key;s.score+=100;if(key==='raven'){s.player.maxHp-=40;s.player.hp=Math.min(s.player.maxHp,s.player.hp);}else s.player.hp=Math.min(s.player.maxHp,s.player.hp+30);event(s,'relic',{key});return true;}
function beginStrike(s,kind,deliberate){const p=s.player;if(p.dashing>0)return false;const follow=deliberate&&p.comboWindow>0;
 if(kind==='combo'&&(p.comboCharge||0)<COMBO_HITS)return false;
 const key=kind==='combo'?'finisher':kind==='heavy'?(follow&&p.combo===2?'finisher':'heavy'):follow&&p.combo===1?'light2':follow&&p.combo===2?'finisher':'light1';const a=weaponAttack(p,key);if(!spend(p,a.cost))return false;
 if(key==='finisher')p.comboCharge=0;
 p.action=key;p.actionTime=0;p.actionDuration=a.duration;p.actionId++;p.hitDone=false;p.attack=a.duration;p.slash=0;p.combo=key==='light1'?1:key==='light2'?2:key==='finisher'?3:0;p.comboWindow=0;p.guard=false;event(s,'swing',{attack:key});return true;
}
function resolveStrike(s){const p=s.player,a=weaponAttack(p,p.action);if(!a)return;move(p,Math.cos(p.angle)*a.lunge,Math.sin(p.angle)*a.lunge);p.slash=.18;const living=[...s.enemies,...(s.boss.awake?[s.boss]:[])].filter(e=>e.hp>0);let first;
 for(const e of living){if(distance(p,e)<a.range+(e.type==='boss'?30:0)&&Math.abs(angleDifference(Math.atan2(e.y-p.y,e.x-p.x),p.angle))<a.arc){hitEnemy(s,e,a.damage+p.damageBonus-(s.relic==='storm'?5:0),a.stagger,p.action==='finisher'?36:7);first??=e;}}
 if(first)event(s,'strike',{attack:p.action});
 if(first&&p.action!=='finisher'){p.comboCharge=Math.min(COMBO_HITS,(p.comboCharge||0)+1);if(p.comboCharge===COMBO_HITS)event(s,'combo-ready');}
 if(first&&s.relic==='storm'){const other=living.find(e=>e!==first&&e.hp>0&&distance(e,first)<185);if(other){hitEnemy(s,other,18);effect(s,'arc',first.x,first.y,.3,{tx:other.x,ty:other.y});}}
 if(p.action==='finisher'){effect(s,'finisher',p.x,p.y,.55,{angle:p.angle});event(s,'finisher',{hit:!!first});}
}
export function tick(s,dt,now=Date.now()){
 if(s.status!=='active')return;dt=clamp(dt,0,.06);const p=s.player;
 if(s.inSafehouse||s.paused){p.vx=p.vy=0;s.input={};s.commands={};s.held={};return;}
 s.elapsed+=dt;s.sequence++;const stale=now-s.lastInputAt>700,input=stale?{}:s.input;
 const pressed={};for(const k of ['attack','heavy','combo','dodge','storm','potion'])pressed[k]=!!s.commands[k]||!!input[k]&&!s.held[k];s.commands={};s.held={...input};
 for(const k of ['dodge','storm','potionCooldown','invulnerable','dashing','slash','comboWindow','staminaDelay'])p[k]=Math.max(0,p[k]-dt);
 if(Number.isFinite(input.angle))p.angle+=clamp(angleDifference(input.angle,p.angle),-dt*MOTION.turn,dt*MOTION.turn);
 if(p.action!=='idle'){p.actionTime+=dt;p.attack=Math.max(0,p.actionDuration-p.actionTime);const a=weaponAttack(p,p.action);if(a&&!p.hitDone&&p.actionTime>=a.hit){p.hitDone=true;resolveStrike(s);}if(p.actionTime>=p.actionDuration){p.action='idle';p.actionTime=0;p.attack=0;p.comboWindow=p.combo===1||p.combo===2?.72:0;}}
 if(pressed.combo&&(p.comboCharge||0)>=COMBO_HITS)s.buffer={kind:'combo',until:s.elapsed+1.2};
 else if((pressed.attack||pressed.heavy)&&s.buffer?.kind!=='combo')s.buffer={kind:pressed.heavy?'heavy':'attack',until:s.elapsed+.56};
 if(s.buffer&&s.buffer.until<s.elapsed)s.buffer=null;
 if(s.buffer&&p.action==='idle'){beginStrike(s,s.buffer.kind,true);s.buffer=null;}else if(input.attack&&p.action==='idle'&&!pressed.attack)beginStrike(s,'attack',false);
 if(!p.comboWindow&&p.action==='idle')p.combo=0;
 p.guard=!!input.guard&&p.action==='idle'&&p.stamina>3;p.guardAge=p.guard?p.guardAge+dt:0;
 let dx=Number(input.dx)||0,dy=Number(input.dy)||0;const mag=Math.hypot(dx,dy);if(mag>1){dx/=mag;dy/=mag;}
 if(pressed.dodge&&p.dodge<=0&&spend(p,20)){p.dodge=s.relic==='raven'?.7:1.05;p.dashing=.34;p.invulnerable=.29;p.dashAngle=mag>.1?Math.atan2(dy,dx):p.angle;p.action='roll';p.actionTime=0;p.actionDuration=.38;p.actionId++;p.comboWindow=0;p.combo=0;s.buffer=null;effect(s,'dash',p.x,p.y,.4);event(s,'dodge');}
 p.sprinting=!!input.sprint&&mag>.1&&!p.guard&&p.action==='idle'&&p.stamina>5;
 if(p.sprinting){p.stamina=Math.max(0,p.stamina-16*dt);p.staminaDelay=.3;}
 if(p.guard){p.stamina=Math.max(0,p.stamina-5*dt);p.staminaDelay=.3;}
 const speed=(p.sprinting?MOTION.sprint:s.relic==='raven'?MOTION.raven:MOTION.jog)*(p.guard?.43:ATTACKS[p.action]?.4:1);
 Object.assign(p,locomotion(p.vx,p.vy,dx,dy,speed,dt));if(stale){p.vx=0;p.vy=0;}
 if(p.dashing>0){const power=380+Math.sin(p.dashing/.34*Math.PI)*130;move(p,Math.cos(p.dashAngle)*power*dt,Math.sin(p.dashAngle)*power*dt);p.vx=Math.cos(p.dashAngle)*power;p.vy=Math.sin(p.dashAngle)*power;}
 else{const oldX=p.x,oldY=p.y;move(p,p.vx*dt,p.vy*dt);if(p.x===oldX)p.vx=0;if(p.y===oldY)p.vy=0;}
 if(Math.hypot(p.vx,p.vy)>10)p.moveAngle=Math.atan2(p.vy,p.vx);
 if(p.staminaDelay<=0&&!p.guard&&!p.sprinting)p.stamina=Math.min(p.maxStamina,p.stamina+26*dt);
 if(pressed.storm&&p.storm<=0&&spend(p,30)){p.storm=8;effect(s,'storm',p.x,p.y,.65);[...s.enemies,...(s.boss.awake?[s.boss]:[])].filter(e=>e.hp>0&&distance(p,e)<225).forEach(e=>hitEnemy(s,e,48,.25,12));event(s,'storm');}
 if(pressed.potion&&p.potions>0&&p.hp<p.maxHp&&p.potionCooldown<=0){p.potions--;s.usedPotions++;p.hp=Math.min(p.maxHp,p.hp+60);p.potionCooldown=3;effect(s,'heal',p.x,p.y,.8);event(s,'potion');}
 s.relicReady=s.enemies[3].hp<=0&&s.enemies[4].hp<=0;
 if(input.interact&&!s.chest&&distance(p,{x:580,y:720})<95){s.chest=true;s.salvage+=40;p.hp=Math.min(p.maxHp,p.hp+45);effect(s,'heal',p.x,p.y,.8);event(s,'chest');}
 if(s.relic&&distance(p,s.boss)<410&&!s.boss.awake){s.boss.awake=true;event(s,'boss-awake');}
 for(const e of [...s.enemies,s.boss]){e.flash=Math.max(0,e.flash-dt);e.stagger=Math.max(0,e.stagger-dt);e.swing=Math.max(0,e.swing-dt);e.death=Math.max(0,e.death-dt);e.vx=e.vy=0;}
 for(const e of s.enemies){if(e.hp<=0||e.stagger>0)continue;e.cd-=dt;const oldX=e.x,oldY=e.y;
  if(safeArea(p)){e.wind=0;if(Math.hypot(e.homeX-e.x,e.homeY-e.y)>8)chase(e,{x:e.homeX,y:e.homeY},95,dt);continue;}
  const d=distance(p,e);
  if(e.wind>0){e.wind-=dt;if(e.wind<=0){e.swing=.3;if(e.type==='archer')s.shots.push({x:e.x,y:e.y,vx:Math.cos(e.angle)*335,vy:Math.sin(e.angle)*335,life:2.6});else {if(e.type==='raider')move(e,Math.cos(e.angle)*24,Math.sin(e.angle)*24,18);if(distance(p,e)<(e.type==='brute'?120:78))hurt(s,e.type==='brute'?24:12,e.x,e.y,e);}e.cd=e.type==='brute'?1.8:e.type==='archer'?1.4:1.05;}}
  else if(d<410){e.angle+=clamp(angleDifference(Math.atan2(p.y-e.y,p.x-e.x),e.angle),-dt*9,dt*9);const reach=e.type==='archer'?290:e.type==='brute'?92:61;if(e.type==='archer'&&d<150)move(e,-Math.cos(e.angle)*95*dt,-Math.sin(e.angle)*95*dt,18);else if(d>reach)chase(e,p,e.type==='brute'?80:125,dt);else if(e.cd<=0)e.wind=e.type==='brute'?.85:e.type==='archer'?.62:.48;}
  e.vx=(e.x-oldX)/dt;e.vy=(e.y-oldY)/dt;
 }
 // Keep hostile bodies separated instead of stacking in a single point.
 const alive=s.enemies.filter(e=>e.hp>0);for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++){const a=alive[i],b=alive[j],d=distance(a,b);if(d>0&&d<36){const push=(36-d)*.35,angle=Math.atan2(a.y-b.y,a.x-b.x);move(a,Math.cos(angle)*push,Math.sin(angle)*push,18);move(b,-Math.cos(angle)*push,-Math.sin(angle)*push,18);}}
 const b=s.boss;
 if(b.awake&&b.hp>0&&b.stagger<=0){b.phase=b.hp<b.maxHp*.45?2:1;b.cd-=dt;const oldX=b.x,oldY=b.y;
  if(b.wind>0){b.wind-=dt;if(b.wind<=0){b.swing=.5;effect(s,'slam',b.targetX,b.targetY,.65,{radius:b.radius});if(distance(p,{x:b.targetX,y:b.targetY})<b.radius+12)hurt(s,b.phase===2?35:28,b.x,b.y,b);b.cd=b.phase===2?1.05:1.85;if(b.phase===2){const a=Math.atan2(p.y-b.y,p.x-b.x);for(const offset of [-.35,0,.35])s.shots.push({x:b.x,y:b.y,vx:Math.cos(a+offset)*250,vy:Math.sin(a+offset)*250,life:2.5});}}}
  else{const d=distance(p,b);b.angle=Math.atan2(p.y-b.y,p.x-b.x);if(d>128)chase(b,p,88,dt);if(b.cd<=0&&d<420){b.wind=b.phase===2?.85:1.15;b.targetX=p.x;b.targetY=p.y;b.radius=b.phase===2?150:120;event(s,'boss-slam');}}b.vx=(b.x-oldX)/dt;b.vy=(b.y-oldY)/dt;
 }
 s.shots=s.shots.filter(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;if(distance(q,p)<23){hurt(s,13,q.x,q.y);return false;}return q.life>0;});s.effects=s.effects.filter(f=>(f.life-=dt)>0);
 if(s.status==='active'&&input.interact&&s.bossDead&&distance(p,HOME)<115){s.status='won';s.score+=Math.max(0,Math.round(300-s.elapsed*.45));event(s,'extracted');}
 if(s.status==='active'&&s.elapsed>=720){s.status='expired';event(s,'expired');}
}
export function snapshot(s){const {input,lastInputAt,started,held,commands,commandIds,buffer,...out}=s;return out;}
