import {firearmFor} from './arsenal.js';
import {createArenaPicker} from './arena-picker.js';
const arenaPicker=createArenaPicker();
import {REGIONS,regionName,foundWeapons,voyageRank} from './voyage-data.js';
import {explorationPrompt} from './exploration.js';
import {gunTarget,strikeAnticipation} from './combat-presentation.js';
import {soloStrike,meleeAim} from './mobile-controls.js';
import {mixerMarkup,bindMixer} from './audio-controls.js';
import {AdventureAudio} from './audio.js';
const soundtrack=new AdventureAudio();
import {MovementPreview} from './movement-preview.js';
const movementPreview=new MovementPreview();
import {WORLD,LAND,BRIDGES,HOME,SHRINE,BOSS,OBSTACLES,RELICS,landAt} from './game.js';
import {initialQuality} from './scene/quality.js';
import {createAdventureUI} from './adventure.js';
import {WEAPONS} from './catalog.js';
import {ATTACKS,COMBO_HITS,POWERUPS,interactionFor,weaponAttack} from './combat.js';
let autoGunAim=true;
let adventure=null,lockedTarget=null,actionIds={},commandCounter=Date.now()*10,strikeCue=null;
const weaponShortcuts=['axe','sword','spear','pulse-carbine','rift-scattergun'];
function pressAction(action){
 pulses[action]=true;
 actionIds[action+'Id']=++commandCounter;
 if(playing&&run?.status==='active'&&!run.paused&&!run.travel&&run.player.action==='idle'&&['attack','heavy','combo'].includes(action)){
  strikeCue={kind:action,time:performance.now(),actionId:run.player.actionId};
 }
}
const $=id=>document.getElementById(id), canvas=$('world');
let world3d=null,preparingWorld=null,startingRun=false,launchAt=null;
let profile=null,community={salvage:0,target:1500},leaders=[],run=null,playing=false,lastEvent=0,lastStatus='',lastTime=0,viewW=900,viewH=650,dpr=1;
let camera={x:1150,y:1070},zoom=.67,networkBusy=false,networkErrors=0,mouse={x:0,y:0,active:false},keys=new Set(),touch={dx:0,dy:0,attack:false,dodge:false,storm:false,interact:false};
let aim=-Math.PI/2,playerVisual={...HOME},enemyVisual=new Map(),audio=null,sound=false,toastTimer,messageTimer,ravenTimer,dialogKind='',lastFrame=performance.now();
let pulses={attack:false,dodge:false,storm:false,interact:false};
const isTouch=(matchMedia('(any-pointer:coarse)').matches||navigator.maxTouchPoints>0);let touchEnabled=isTouch,orbit=0,bloodFX=true;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4200);}
function message(text){$('worldMessage').textContent=text;$('worldMessage').classList.remove('hidden');clearTimeout(messageTimer);messageTimer=setTimeout(()=>$('worldMessage').classList.add('hidden'),3400);}
function raven(text){$('ravenLine').textContent='“'+text+'”';clearTimeout(ravenTimer);}
async function api(route,data){const response=await fetch('/api/'+route,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(8000)});let value;try{value=await response.json();}catch{throw Error('The game server is unavailable. Your saved progress is safe.');}if(!response.ok)throw Error(value.error||'The request failed.');return value;}
function resetInput(){keys.clear();strikeCue=null;pulses={attack:false,dodge:false,storm:false,interact:false};touch={dx:0,dy:0,attack:false,dodge:false,storm:false,interact:false};$('joystickThumb').style.transform='';document.querySelectorAll('.touch-actions .held').forEach(b=>b.classList.remove('held'));}
function modal(html,kind='info'){resetInput();dialogKind=kind;$('modalContent').innerHTML=html;if(!$('modal').open)$('modal').showModal();}
function closeModal(){$('modal').close();dialogKind='';resetInput();canvas.focus({preventScroll:true});}
$('closeModal').onclick=closeModal;$('modal').addEventListener('close',()=>{dialogKind='';resetInput();adventure?.closed();});
function syncWeapons(){const list=run?.status==='active'?(run.inventory||foundWeapons(profile?.gear)):foundWeapons(profile?.gear);for(const o of $('weaponSelect').options){o.disabled=!list.includes(o.value);o.textContent=(WEAPONS[o.value]?.name||o.value)+(o.disabled?' · find in a cache':'');}$('weaponSelect').value=run?.status==='active'?run.player.weapon:profile?.gear?.weapon||'axe';}
function applyState(data){profile=data.player;document.dispatchEvent(new CustomEvent('stormwake:profile',{detail:profile}));chapterBoard();$('weaponSelect').value=profile.gear?.weapon||'axe';syncWeapons();community=data.world;leaders=data.leaderboard;$('playerName').textContent=profile.name;$('bankValue').textContent=profile.salvage;$('communityValue').textContent=community.salvage.toLocaleString();$('communityFill').style.width=Math.min(100,community.salvage/community.target*100)+'%';$('contributeBtn').disabled=profile.salvage<50;$('communityNote').textContent=community.salvage>=community.target?'The beacon is restored. Your harbour now shines.':'Shared progress on this game server.';}
async function refresh(){const data=await api('state');applyState(data);return data;}
function setPlaying(value){playing=value;document.body.classList.toggle('expedition-mode',value);$('hero').classList.toggle('hidden',value);$('hud').classList.toggle('hidden',!value);$('touchControls').classList.toggle('hidden',!value||!touchEnabled);$('bossBar').classList.add('hidden');$('interaction').classList.add('hidden');$('comboBtn').classList.add('hidden');$('harbourNav').textContent=value?'Return to harbour':'The harbour';if(value){actionIds={};lockedTarget=null;playerVisual={x:run.player.x,y:run.player.y};camera={x:run.player.x,y:run.player.y};lastEvent=run.eventId;lastStatus='active';enemyVisual.clear();canvas.focus({preventScroll:true});}else{camera={x:1150,y:1070};$('areaLabel').textContent='THE LAST HARBOUR';$('areaSub').textContent='A light in the storm';$('startBtn').innerHTML='Begin survival <span>↗</span>';updateObjectives();}}
async function begin(){
 if(networkBusy||startingRun)return;
 if(!profile){toast('Connecting to the game server. Please try again.');return;}
 if(!profile.usernameCreated){showUsername(true);return;}
 startingRun=true;
 launchAt=performance.now();
 const buttons=[$('startBtn'),$('chapterDeploy')];
 const labels=buttons.map(button=>button.innerHTML);
 const arena=arenaPicker.selected;
 buttons.forEach(button=>{button.disabled=true;button.textContent='Loading arena…';});
 if(!sound)enableSound();
 try{
  await prepareWorld();
  // The server starts the wave after the renderer is ready for input.
  const data=await api('start',{arena});
  run=data.run;syncWeapons();movementPreview.sync(run,performance.now());setPlaying(true);
  raven('Land three hits to charge Stormbreaker, then tap Combo. Tap nearby prompts to open caches and shops.');
  message(run.mode==='survival'?'SURVIVAL · HOLD THE LINE':'CHAPTER '+(run.chapter||1)+' · '+chapterNames[(run.chapter||1)-1]);
 }catch(error){launchAt=null;toast(error.message);}
 finally{buttons.forEach((button,i)=>{button.disabled=false;button.innerHTML=labels[i];});startingRun=false;}
}
const chapterNames=REGIONS.map(r=>r.name);
let introSeen=false;
function chapterBoard(){document.querySelectorAll('[data-chapter]').forEach(card=>{card.classList.remove('chapter-current');card.querySelector('small').textContent='OPEN DISTRICT · WALK OR SAIL';});const best=profile?.gear?.survival;if(best)$('ravenLine').textContent='Personal best: '+best.bestKills+' bots · wave '+best.bestWave+' · '+best.bestSeconds+' seconds.';}

async function launchStory(){if(!profile)await initialState;if(!profile){toast('The game server is unavailable. Try again when it reconnects.');return;}if(!profile.usernameCreated){showUsername(true);return;}if(introSeen||run?.status==='active'){begin();return;}if($('storyIntro').open)return;import('./scene3d.js').catch(()=>{});await prologue();introSeen=true;begin();}
function prologue(){return new Promise(resolve=>{
 const frames=[['Before the fracture','The Heartbeat held the Shattered Isles together. Our heroes guarded a world of timber, iron and tides.'],['Something crossed the storm','Rogue machines arrived from an age that had not happened yet. They came to steal the Heartbeat before their own future could be written.'],['The harbour fell first','Scouts marked the shore. Siege machines followed. The survivors called for the Awakened.'],['We hold the line','The machines will not stop coming. Explore the city, find supplies and survive as many waves as you can.']];
 const supported='speechSynthesis' in window&&'SpeechSynthesisUtterance' in window;
 let i=0,voiced=false;
 try{voiced=supported&&localStorage.getItem('stormwake-narration')==='on';}catch{}
 const stop=()=>{if(supported)window.speechSynthesis.cancel();};
 const speak=()=>{stop();if(!voiced||document.hidden)return;const utterance=new SpeechSynthesisUtterance(frames[i].join('. '));utterance.lang='en-US';utterance.rate=.9;utterance.pitch=.85;utterance.volume=.85;const voices=window.speechSynthesis.getVoices();const voice=voices.find(v=>v.localService&&/^en/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang));if(voice)utterance.voice=voice;utterance.onerror=e=>{if(!['canceled','interrupted'].includes(e.error))$('storyVoiceStatus').textContent='Voice unavailable on this device. Read the captions and continue.';};window.speechSynthesis.speak(utterance);};
 const voiceLabel=()=>{$('storyVoice').textContent=supported?(voiced?'Narration: on':'Enable narration'):'Narration unavailable';$('storyVoice').disabled=!supported;$('storyVoice').setAttribute('aria-pressed',String(voiced));};
 const show=()=>{const f=frames[i];$('storyCount').textContent='PROLOGUE / '+(i+1)+' OF 4';$('storyTitle').textContent=f[0];$('storyText').textContent=f[1];$('storyIntro').dataset.frame=i;$('storyNext').textContent=i===3?'Finish prologue →':'Continue →';$('storyVoiceStatus').textContent='Device voice · captions stay visible · advance when ready';speak();};
 const visibility=()=>{if(document.hidden)stop();};
 const finish=()=>{stop();document.removeEventListener('visibilitychange',visibility);$('storyIntro').close();resolve();};
 $('storyVoice').onclick=()=>{voiced=!voiced;try{localStorage.setItem('stormwake-narration',voiced?'on':'off');}catch{}voiceLabel();speak();};
 $('storyNext').onclick=()=>{if(i===3)finish();else{i++;show();}};
 $('storySkip').onclick=finish;$('storyIntro').oncancel=e=>{e.preventDefault();finish();};
 document.addEventListener('visibilitychange',visibility);$('storyIntro').showModal();voiceLabel();show();
});}

$('startBtn').onclick=launchStory;
$('watchPrologue').onclick=()=>prologue();
$('chapterDeploy').onclick=launchStory;

function updateObjectives(){if(run?.mode==='survival'){
 $('objectives').innerHTML='<li>Survive the machine assault · wave '+run.wave+'</li><li>Defeat bots: '+run.kills+' · score '+run.score+'</li><li>Explore Old City, Riverhold and the forest</li><li>Find weapons and healing in caches</li>';
 $('relicSlot').innerHTML='<span>ϟ</span><div><strong>Survival series</strong><small>Waves continue until you fall.</small></div>';return;
 }const conditions=playing&&run?[run.player.y<1300,!!run.relic,run.bossDead,run.status==='won']:[false,false,false,false];document.querySelectorAll('.objectives li').forEach((el,i)=>el.classList.toggle('done',conditions[i]));if(playing&&run?.relic){const r=RELICS[run.relic];$('relicSlot').innerHTML=`<span style="color:${r.color}">ϟ</span><div><strong>${r.name}</strong><small>${run.relic==='storm'?'Chain lightning · reduced strike damage':'Faster dodges · reduced vitality'}</small></div>`;}else $('relicSlot').innerHTML='<span>◇</span><div><strong>A relic awaits</strong><small>Power always comes with a price.</small></div>';
}
function handleEvents(){for(const e of run.events||[]){if(e.id<=lastEvent)continue;lastEvent=e.id;if(e.type==='wave')message('WAVE '+e.wave+' · '+e.count+' MACHINES');if(e.type==='discovery'){toast(e.text);syncWeapons();}if(e.type==='dialogue'){modal('<span class="modal-eyebrow">SETTLEMENT GUIDE</span><h2 id="npcName"></h2><p id="npcWords"></p><button class="primary" id="npcShop">Visit the market</button>','talk');$('npcName').textContent=e.name;$('npcWords').textContent=e.text;$('npcShop').onclick=()=>adventure.open('forge');}if(e.type==='voyage'){resetInput();message(e.text);}if(e.type==='arrived'){resetInput();message(e.text);}if(e.type==='powerup')message(POWERUPS[e.key].name.toUpperCase()+' · '+POWERUPS[e.key].description);soundtrack.effect(e.type,e);if(e.type==='pulse-fired')tone(e.weapon==='rift-scattergun'?120:250,.12,'triangle',.10);if(e.type==='finisher'&&e.hit)message('STORMBREAKER');if(e.type==='combo-ready'){tone(550,.13,'sine',.035);setTimeout(()=>tone(820,.16,'sine',.035),90);}if(e.type==='parry'){message('PERFECT PARRY');tone(750,.2,'triangle',.05);}if(e.type==='potion')toast('Healing draught used · +60 vitality');if(e.type==='kill')tone(370,.11,'sine',.045);if(e.type==='storm'){tone(95,.35,'sawtooth',.03);setTimeout(()=>tone(520,.25,'sine',.035),80);}if(e.type==='dodge')tone(260,.07,'triangle',.016);if(e.type==='relic'){message('RELIC AWAKENED');raven('A fine choice. The island always takes something in return.');tone(660,.4,'sine',.05);}if(e.type==='chest'){message('+40 SALVAGE · VITALITY RESTORED');raven('The old cache. Even a raven can appreciate a little hoarding.');}if(e.type==='boss-awake'){message(run.bossName||'THE PRIME DIRECTIVE');raven('That anchor isn’t for sailing. Keep moving when the ground turns red.');}if(e.type==='boss-defeated'){message('THE HEARTBEAT IS YOURS');raven('You did it. Now take the southern path home. Don’t lose the pulse.');tone(440,.7,'sine',.06);}}}
function acceptRun(s,sentAt=performance.now()){if(!s)return;if(!!run?.travel!==!!s.travel)movementPreview.reset();run=s;syncWeapons();movementPreview.sync(s,performance.now(),sentAt);handleEvents();updateHUD();if(s.status!=='active'&&lastStatus==='active'){lastStatus=s.status;resetInput();showResult();}}
function survivalPressure(run){
 if(run.travel)return run.travel.name+'…';
 const alive=run.enemies.filter(e=>e.hp>0).length;
 if(alive)return alive+(alive===1?' bot left':' bots left');
 return 'Next wave in '+Math.ceil(Math.max(0,run.nextWave))+'s';
}
function updateHUD(){if(!run||!playing)return;const p=run.player;$('powerStatus').textContent=p.powerup&&p.powerTime>0?POWERUPS[p.powerup].name+' · '+Math.ceil(p.powerTime)+'s · '+POWERUPS[p.powerup].description:'CORE CHARGE · '+(run.kills%3)+' / 3 bots';$('counterStatus').textContent=p.riposteWindow>0?'COUNTER READY · Strike now':'Guard just before impact to counter';$('comboBtn').firstChild.textContent=weaponAttack(p,'finisher').name+' ';$('soloStrike').textContent=soloStrike(p).label;$('touchHeal').classList.toggle('hidden',p.hp>=p.maxHp||!p.potions);$('hpText').textContent=`${p.hp} / ${p.maxHp}`;$('hpFill').style.width=(p.hp/p.maxHp*100)+'%';$('salvageText').textContent=run.salvage;const secs=Math.floor(run.elapsed);$('timeText').textContent=Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0');const bossActive=run.boss.awake&&!run.bossDead;$('bossBar').classList.toggle('hidden',!bossActive);$('bossFill').style.width=(run.boss.hp/run.boss.maxHp*100)+'%';$('bossPhase').textContent=run.boss.phase===2?'The tide rises · enraged':'Guardian of the broken pulse';const area=regionName(p)||(p.x>1500?'THE DROWNED TEMPLE':p.y<1060&&p.x<900?'RAVEN’S HOLLOW':p.y<1300?'THE WHISPERING GROVE':'THE LAST HARBOUR');$('areaLabel').textContent=(run.mode==='survival'?'WAVE '+run.wave:'CH '+(run.chapter||1))+' · '+area;$('areaSub').textContent=run.mode==='survival'?(run.kills+' bots defeated · '+run.score+' points · '+survivalPressure(run)):run.travel?run.travel.name+'…':run.bossDead?'Bring the heartbeat home':run.relic?'Find the guardian in the northeast':'Recover a relic from the shrine';const prompt=interactionFor(run);$('interaction').classList.toggle('hidden',!prompt);$('interaction').disabled=!prompt?.ready;$('interactionText').textContent=prompt?.label||'';const charged=(p.comboCharge||0)>=COMBO_HITS;$('comboBtn').classList.toggle('hidden',!charged||run.status!=='active'||touchEnabled);$('comboBtn').disabled=p.stamina<weaponAttack(p,'finisher').cost||p.action==='roll';$('staminaText').textContent=Math.ceil(p.stamina)+' / '+p.maxStamina;$('staminaFill').style.width=(p.stamina/p.maxStamina*100)+'%';$('comboText').textContent=(firearmFor(p.weapon)?weaponAttack(p,p.action)?.name:null)||ATTACKS[p.action]?.name||(p.guard?(p.guardAge<.2?'PARRY WINDOW':'GUARDING'):p.sprinting?'SPRINTING':p.comboWindow>0?'CHAIN OPEN · '+(p.combo===1?'J → BACKHAND':'K → STORMBREAKER'):'COMBO · '+(p.comboCharge||0)+' / '+COMBO_HITS+' HITS');$('potionText').textContent=p.potions;$('lockText').textContent=firearmFor(p.weapon)?(autoGunAim?(lockedTarget!==null?'AUTO · LOCKED':'AUTO · SEARCHING'):'MANUAL AIM'):lockedTarget!==null?'TARGET LOCKED':'T · LOCK TARGET';updateObjectives();}
function input(consume=true){let dx=touch.dx+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),dy=touch.dy+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);const worldDx=dx*Math.cos(orbit)+dy*Math.sin(orbit),worldDy=-dx*Math.sin(orbit)+dy*Math.cos(orbit);dx=worldDx;dy=worldDy;let lockedAngle=null;if(lockedTarget!==null){const target=[...run.enemies,run.boss].find(e=>e.id===lockedTarget&&e.hp>0);if(target&&distance(target,run.player)<550)lockedAngle=Math.atan2(target.y-run.player.y,target.x-run.player.x);else lockedTarget=null;}
 const pointerAttack=mouse.active&&(keys.has('Mouse')||keys.has('MouseHeavy'));
 aim=meleeAim({dx,dy,angle:aim,pointerAngle:pointerAttack&&world3d?world3d.aimAt(mouse,run.player):null,lockedAngle,assist:!!(pulses.combo||(touchEnabled&&(touch.attack||touch.heavy||pulses.attack||pulses.heavy))),player:run.player,enemies:[...run.enemies,...(run.boss.awake?[run.boss]:[])]});
 if(firearmFor(run.player.weapon)&&autoGunAim){
  const target=gunTarget(run.player,run.enemies,run.boss,lockedTarget);
  lockedTarget=target?.id??null;
  if(target)aim=Math.atan2(target.y-run.player.y,target.x-run.player.x);
 }
 const value={dx,dy,angle:aim,attack:pulses.attack||keys.has('KeyJ')||keys.has('Mouse')||touch.attack,combo:pulses.combo||keys.has('KeyC'),heavy:pulses.heavy||keys.has('KeyK')||keys.has('MouseHeavy')||touch.heavy,dodge:pulses.dodge||keys.has('Space')||touch.dodge,storm:pulses.storm||keys.has('KeyQ')||touch.storm,potion:pulses.potion||keys.has('KeyR')||touch.potion,guard:keys.has('KeyF')||touch.guard,sprint:keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.sprint||(touchEnabled&&Math.hypot(touch.dx,touch.dy)>.92),interact:pulses.interact||keys.has('KeyE')||touch.interact,...actionIds};if(consume)pulses={};return value;}

let lastNetworkSend=-100,pendingInput=false,sendTimer=null;
async function network(){if(!playing||!run||run.status!=='active'||run.inSafehouse||run.paused||networkBusy||performance.now()-lastNetworkSend<80)return;lastNetworkSend=performance.now();pendingInput=false;networkBusy=true;try{const i=$('modal').open?{dx:0,dy:0}:input();if(i.interact&&!$('modal').open&&adventure.nearby()&&!explorationPrompt(run)&&!(run.bossDead&&distance(run.player,run.home||HOME)<115)){await adventure.open(adventure.nearby());return;}if(i.interact&&run.relicReady&&!run.relic&&distance(run.player,run.shrine||SHRINE)<130&&!$('modal').open)showRelics();const data=await api('input',i);canvas.dataset.networkMs=String(Math.round(performance.now()-lastNetworkSend));delete canvas.dataset.networkError;acceptRun(data.run,lastNetworkSend);networkErrors=0;$('connection').textContent='Server connected';}catch(e){networkErrors++;canvas.dataset.networkError=e.message;$('connection').textContent='Reconnecting…';resetInput();if(networkErrors===2)toast('Connection interrupted. Movement stops until the server reconnects.');}finally{networkBusy=false;if(pendingInput)sendInputSoon();}}
setInterval(network,80);
const sendInputSoon=()=>{pendingInput=true;if(networkBusy)return;clearTimeout(sendTimer);sendTimer=setTimeout(network,Math.max(0,80-(performance.now()-lastNetworkSend)));};
function showRelics(){modal(`<span class="modal-eyebrow">THE ISLAND OFFERS A BARGAIN</span><h2>Choose your relic.</h2><p>Take one power into the temple. The choice lasts for this expedition.</p>${Object.entries(RELICS).map(([key,r])=>`<button class="choice" data-relic="${key}"><strong>${r.name}</strong><span>${r.text}</span></button>`).join('')}`,'relic');document.querySelectorAll('[data-relic]').forEach(b=>b.onclick=async()=>{try{const data=await api('relic',{relic:b.dataset.relic});acceptRun(data.run);closeModal();}catch(e){toast(e.message);}});}
async function showResult(){if(run.mode==='survival'){
 modal('<span class="modal-eyebrow">SURVIVAL SERIES</span><h2>'+ (run.status==='dead'?'The last stand.':'Run ended.')+'</h2><p>'+ (run.status==='dead'?'Your server-verified survival record is saved.':'This interrupted run does not award a survival record.')+'</p><div class="stat-grid"><div><strong>'+run.kills+'</strong><small>BOTS DEFEATED</small></div><div><strong>'+run.wave+'</strong><small>WAVE REACHED</small></div><div><strong>'+Math.floor(run.elapsed)+'s</strong><small>TIME SURVIVED</small></div></div><p>Score: '+run.score+'</p><button id="again" class="primary">Try another run ↗</button>','result');$('again').onclick=async()=>{closeModal();await refresh();begin();};await refresh();return;
 }await new Promise(r=>setTimeout(r,450));const won=run.status==='won';modal(`<span class="modal-eyebrow">${won?'A HEARTBEAT RETURNS':'THE ISLAND REMEMBERS'}</span><h2>${won?'Chapter secured.':run.status==='expired'?'The tide caught you.':'Not the end of your story.'}</h2><p>${won?'Your extraction is recorded. Return to the campaign to continue the next deployment, or replay the final front after completing all three chapters.':'Your carried salvage was lost. Your previously saved progress is safe. Try the side path for a healing cache, and dodge the guardian’s marked attacks.'}</p><div class="stat-grid"><div><strong>${won?run.score:run.kills}</strong><small>${won?'VERIFIED SCORE':'FOES DEFEATED'}</small></div><div><strong>${won?run.salvage:0}</strong><small>SALVAGE RECOVERED</small></div><div><strong>${Math.floor(run.elapsed/60)}:${String(Math.floor(run.elapsed%60)).padStart(2,'0')}</strong><small>EXPEDITION TIME</small></div></div><button class="primary" id="resultHome">Return to the harbour <span>↗</span></button><button class="secondary" id="again">Continue campaign</button>`,'result');$('resultHome').onclick=()=>{closeModal();setPlaying(false);raven(won?'A light in the harbour. Not bad for someone who arrived unconscious.':'Even the greatest legends had an unfortunate first chapter.');};$('again').onclick=async()=>{closeModal();await refresh();begin();};try{await refresh();}catch(e){toast(e.message);}}
$('harbourNav').onclick=()=>{if(!playing)return; if(run?.status!=='active'){setPlaying(false);return;}modal('<span class="modal-eyebrow">LEAVE THIS RUN?</span><h2>The sea can wait.</h2><p>Returning now abandons this run and its carried salvage. Previously recovered salvage stays safe. Your run remains paused until you close this menu.</p><button class="primary" id="keepGoing">Keep exploring <span>↗</span></button><button class="secondary" id="abandon">Abandon run</button>');$('keepGoing').onclick=closeModal;$('abandon').onclick=async()=>{try{await api('leave',{});closeModal();setPlaying(false);}catch(e){toast(e.message);}};};
$('journalBtn').onclick=()=>modal('<span class="modal-eyebrow">SURVIVAL FIELD GUIDE</span><h2>One world. Your last stand.</h2><p>Survive successive machine waves. Defeat every bot, then prepare for the next wave. Bots pursue you across districts, and distant stragglers can regroup nearby. Death ends the run and saves your personal best kills, wave, score and survival time.</p><h3>Explore to survive</h3><p>Walk from the harbour through the Old City, Riverhold and Emerald Reach, or use the ferries. Search marked caches for weapons, health and combat perks. Hearthhall pauses your run while you rest. Leaving a run does not count as a completed survival record.</p><h3>Fight with intention</h3><p>Use the movement stick and action buttons on touch screens. On desktop: WASD moves, Shift sprints, Space rolls, J attacks, K performs a heavy strike and F guards. Land three melee strikes to charge Combo, then tap the combo button or press C. T locks a nearby target. Watch stamina and enemy attack warnings.</p><h3>Keep your progress</h3><p>Your existing saved gear and recovery key remain intact. Survival records are personal in this prototype; the Hall of Voyagers still shows legacy expedition results.</p>');
$('boardBtn').onclick=async()=>{try{await refresh();modal(`<span class="modal-eyebrow">THE HALL OF VOYAGERS</span><h2>Leave a story behind.</h2><p>Best successful expedition per voyager profile. Scores come from combat, relic recovery, defeating the Prime Directive and a time bonus on extraction.</p>${leaders.length?`<table class="board-table"><thead><tr><th>RANK</th><th>VOYAGER</th><th>WINS</th><th>BEST</th></tr></thead><tbody>${leaders.map((p,i)=>`<tr><td>${i+1}</td><td>${escape(p.name)}</td><td>${p.wins}</td><td>${p.best}</td></tr>`).join('')}</tbody></table>`:'<div class="choice"><strong>No legends yet.</strong><span>Complete an expedition and return to the harbour to become the first.</span></div>'}<p>Arcade scores are saved per player profile. Keep your recovery key to bring your progress to another device.</p>`);}catch(e){toast(e.message);}};
function showUsername(playAfter=false){
 if(!profile)return;
 modal(`<span class="modal-eyebrow">FREE SURVIVAL SERIES</span><h2>${profile.usernameCreated?'Your arcade profile':'Choose a username. Play free.'}</h2><p>No email or password needed. Your progress saves automatically in this browser. Keep a private recovery key in Save & restore to continue on another device.</p><form id="profileForm"><label for="nameInput">Username · 3–18 characters</label><input id="nameInput" name="name" minlength="3" maxlength="18" value="${profile.usernameCreated?escape(profile.name):''}" required autocomplete="nickname" placeholder="Your username" aria-describedby="usernameHint"><p id="usernameHint">Use letters, numbers, spaces, dashes or underscores. Your username is a display name; use a recovery key to restore a save.</p><p id="usernameError" role="alert"></p><button class="primary" type="submit">${playAfter?'Play free':'Save username'} <span>↗</span></button></form>${!profile.usernameCreated?'<button class="secondary" id="usernameRestore">I have a recovery key</button>':''}`,'username');
 if($('usernameRestore'))$('usernameRestore').onclick=showSave;
 $('nameInput').focus();
 $('profileForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{const data=await api('profile',{name:$('nameInput').value});profile=data.player;$('playerName').textContent=profile.name;closeModal();if(playAfter)await launchStory();else toast('Username saved.');}catch(e){$('usernameError').textContent=e.message;}finally{button.disabled=false;}};
}
$('profileBtn').onclick=()=>showUsername();
$('contributeBtn').onclick=async()=>{try{$('contributeBtn').disabled=true;applyState(await api('contribute',{amount:50}));toast('50 salvage contributed. The harbour remembers.');tone(550,.4,'sine',.04);}catch(e){toast(e.message);$('contributeBtn').disabled=!profile||profile.salvage<50;}};
$('fullscreenBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('viewport').requestFullscreen();}catch{toast('Fullscreen is unavailable in this browser.');}};
function enableSound(){soundtrack.enable().then(ok=>{sound=ok;$('soundLabel').textContent=ok?'ON':'OFF';$('soundBtn').setAttribute('aria-label',ok?'Mute sound':'Enable sound');if(!ok)toast('Tap Sound again to enable audio.');});}
// Confirmed events now drive the sampled mixer; legacy UI tones stay silent.
function tone(){}
$('soundBtn').onclick=()=>{if(sound){sound=false;soundtrack.enabled=false;$('soundLabel').textContent='OFF';$('soundBtn').setAttribute('aria-label','Enable sound');}else enableSound();};
window.addEventListener('keydown',e=>{
 if(!playing||$('modal').open||e.target.matches?.('input,select,textarea'))return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 keys.add(e.code);
 if(/^Digit[1-5]$/.test(e.code)&&!e.repeat){
  const weapon=weaponShortcuts[Number(e.code.at(-1))-1];
  const select=$('weaponSelect'),option=[...select.options].find(o=>o.value===weapon);
  if(option&&!option.disabled&&select.value!==weapon){select.value=weapon;select.onchange();}
 }
 const action={KeyC:'combo',KeyJ:'attack',KeyK:'heavy',Space:'dodge',KeyQ:'storm',KeyR:'potion',KeyE:'interact'}[e.code];
 if(action&&!e.repeat)pressAction(action);
 if(e.code==='KeyT'&&!e.repeat)$('lockText').click();
 if(e.code==='Escape'){e.preventDefault();openPause();}
});
window.addEventListener('keyup',e=>{keys.delete(e.code);sendInputSoon();});
window.addEventListener('keydown',e=>{if(!e.repeat)sendInputSoon();});window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',()=>{if(document.hidden){soundtrack.mixer.suspend();resetInput();if(playing&&!$('modal').open)openPause();}});
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const box=canvas.getBoundingClientRect();mouse={x:e.clientX-box.left,y:e.clientY-box.top,active:true};});
canvas.addEventListener('pointerdown',e=>{if(playing&&e.pointerType!=='touch'){const bounds=canvas.getBoundingClientRect();mouse={x:e.clientX-bounds.left,y:e.clientY-bounds.top,active:true};if(e.button===0){keys.add('Mouse');pressAction('attack');}if(e.button===2){keys.add('MouseHeavy');pressAction('heavy');}canvas.setPointerCapture(e.pointerId);sendInputSoon();}});
canvas.addEventListener('pointerup',()=>{keys.delete('Mouse');keys.delete('MouseHeavy');sendInputSoon();});canvas.addEventListener('pointercancel',resetInput);canvas.addEventListener('contextmenu',e=>e.preventDefault());
const stick=$('joystick');let stickPointer=null;function stickMove(e){const box=stick.getBoundingClientRect();let x=e.clientX-box.left-box.width/2,y=e.clientY-box.top-box.height/2;const m=Math.hypot(x,y);if(m>35){x*=35/m;y*=35/m;}const radial=Math.hypot(x,y),amount=radial<4?0:Math.pow(Math.min(1,(radial-4)/31),.55);touch.dx=radial?x/radial*amount:0;touch.dy=radial?y/radial*amount:0;mouse.active=false;$('joystickThumb').style.transform=`translate(${x}px,${y}px)`;}
stick.onpointerdown=e=>{if(stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);stickMove(e);sendInputSoon();};stick.onpointermove=e=>{if(e.pointerId===stickPointer&&stick.hasPointerCapture(e.pointerId)){stickMove(e);sendInputSoon();}};stick.onpointerup=stick.onpointercancel=stick.onlostpointercapture=e=>{if(e.pointerId!==stickPointer)return;stickPointer=null;touch.dx=touch.dy=0;$('joystickThumb').style.transform='';sendInputSoon();};document.querySelectorAll('[data-action]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch[b.dataset.action]=true;pressAction(b.dataset.action);b.classList.add('held');sendInputSoon();};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>{touch[b.dataset.action]=false;b.classList.remove('held');sendInputSoon();};});

adventure=createAdventureUI({api,modal,toast,applyState,acceptRun,getProfile:()=>profile,getRun:()=>playing?run:null,escape,sessionChanged:data=>{applyState(data);setPlaying(false);run=data.run||null;if(run?.status==='active')$('startBtn').innerHTML='Resume survival <span>↗</span>';}});
$('safehouseBtn').onclick=()=>adventure.open();
$('saveBtn').onclick=showSave;$('usernameBtn').onclick=()=> $('profileBtn').click();
$('weaponSelect').onchange=async()=>{try{const data=await api('weapon/equip',{weapon:$('weaponSelect').value});applyState(data);if(data.run)acceptRun(data.run);toast(WEAPONS[$('weaponSelect').value]?.description||'Weapon equipped');}catch(e){$('weaponSelect').value=run?.player.weapon||profile.gear?.weapon||'axe';toast(e.message);}canvas.focus({preventScroll:true});};
$('orbitLeft').onclick=()=>{orbit-=Math.PI/4;world3d?.setOrbit(orbit);};$('orbitRight').onclick=()=>{orbit+=Math.PI/4;world3d?.setOrbit(orbit);};
$('touchToggle').onclick=()=>{touchEnabled=!touchEnabled;$('touchControls').classList.toggle('hidden',!playing||!touchEnabled);$('touchToggle').setAttribute('aria-pressed',String(touchEnabled));resetInput();};
$('bloodToggle').onclick=()=>{bloodFX=!bloodFX;$('bloodToggle').textContent='Blood FX: '+(bloodFX?'on':'off');$('bloodToggle').setAttribute('aria-pressed',String(bloodFX));};
// The arena picker and saved profile don't depend on WebGL or 3D assets.
let cameraMode='follow',detail=initialQuality(isTouch);
$('qualityBtn').textContent=detail[0].toUpperCase()+detail.slice(1)+' detail';
function prepareWorld(){
 if(world3d)return Promise.resolve();
 if(preparingWorld)return preparingWorld;
 const status=$('sceneStatus');
 status.textContent='Loading arena…';status.classList.remove('hidden');
 preparingWorld=import('./scene3d.js').then(({createWorld})=>{
  world3d=createWorld(canvas,detail);
  world3d.setMode(cameraMode);world3d.setOrbit(orbit);
  status.classList.add('hidden');
 }).catch(error=>{
  console.error('3D initialization:',error);
  status.textContent='3D could not start. Try a WebGL 2 browser with hardware acceleration.';
  throw Error(status.textContent);
 }).finally(()=>{preparingWorld=null;});
 return preparingWorld;
}
$('cameraBtn').onclick=()=>{cameraMode=({follow:'tactical',tactical:'scenic',scenic:'follow'})[cameraMode];world3d?.setMode(cameraMode);$('cameraBtn').textContent=({follow:'Tactical view',tactical:'Scenic view',scenic:'Follow view'})[cameraMode];};
$('qualityBtn').onclick=()=>{detail=({high:'medium',medium:'low',low:'high'})[detail]||'low';try{localStorage.setItem('stormwake.graphics',detail);}catch{};world3d?.setQuality(detail);$('qualityBtn').textContent=detail[0].toUpperCase()+detail.slice(1)+' detail';};
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();resetInput();$('sceneStatus').textContent='Graphics paused. Reload this page to restore the 3D scene.';$('sceneStatus').classList.remove('hidden');});
let performanceStart=performance.now(),performanceFrames=0;
function render(now){
 const dt=Math.max(0,Math.min(.15,(now-lastFrame)/1000));lastFrame=now;
 let displayRun=run;
 if(playing&&run){
  const pose=movementPreview.step($('modal').open||run.travel?{}:input(false),dt,now);
  if(pose){pose.armedAnticipation=strikeAnticipation(pose,strikeCue,now);displayRun={...run,player:pose};}
 }
 soundtrack.update(displayRun?.player,playing&&!run?.paused&&!$('modal').open,run?.boss?.awake&&!run?.bossDead,document.hidden,run);
 if(world3d&&playing&&!document.hidden){
  world3d.draw(now/1000,dt,displayRun,playing,community,{lockedTarget,bloodFX,reducedMotion});
  if(launchAt!==null){canvas.dataset.launchMs=String(Math.round(performance.now()-launchAt));launchAt=null;}
  performanceFrames++;
  if(now-performanceStart>=1000){
   const info=world3d.getInfo();
   canvas.dataset.fps=String(Math.round(performanceFrames*1000/(now-performanceStart)));
   canvas.dataset.renderer='three-webgl2';
   canvas.dataset.drawCalls=String(info.drawCalls);
   canvas.dataset.triangles=String(info.triangles);
   performanceStart=now;performanceFrames=0;
  }
 }else{performanceStart=now;performanceFrames=0;}
 requestAnimationFrame(render);
}
requestAnimationFrame(render);
async function init(){try{const data=await refresh();$('connection').textContent='Server connected';if(data.run?.status==='active'){run=data.run;$('startBtn').innerHTML='Resume run <span>↗</span>';raven('You left a story unfinished. Your saved run is still waiting.');}if(!profile.usernameCreated)showUsername(true);}catch(e){$('connection').textContent='Server unavailable';toast(e.message);}}
const initialState=init();
setInterval(()=>{if(!playing&&!startingRun&&!document.hidden)refresh().catch(()=>{});},15000);

$('recordsBtn').onclick=async()=>{try{const data=await api('history');modal('<span class="modal-eyebrow">YOUR SAVED ADVENTURE</span><h2>Voyager records</h2><p>Expeditions, purchases, equipment changes, contributions are saved to your profile.</p>'+ (data.records.length?data.records.map(r=>'<article class="choice"><strong>'+escape(r.kind.replaceAll('-',' '))+'</strong><span>'+escape(new Date(Number(r.created)).toLocaleString())+'</span><span>'+escape(Object.entries(r.payload).filter(([k])=>k!=='runId').map(([k,v])=>k+': '+v).join(' · '))+'</span></article>').join(''):'<p>No recorded activity yet. Begin an expedition to start your story.</p>'));}catch(e){toast(e.message);}};

$('exitFullscreen').onclick=()=>document.exitFullscreen?.();

let reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let pauseBusy=false;
async function openPause(tasks=false){
 if(pauseBusy||!playing||run?.status!=='active')return;
 pauseBusy=true;resetInput();
 try{const data=await api('pause',{paused:true});acceptRun(data.run);
 modal('<span class="modal-eyebrow">SURVIVAL PAUSED</span><h2>'+ (tasks?'Your next chapter':'Catch your breath.')+'</h2><p>'+escape($('areaSub').textContent)+'</p>'+(tasks?'<ol class="pause-objectives">'+$('objectives').innerHTML+'</ol>':'<p>WASD / arrows move · Shift sprints · J, J, K combos · Space rolls · F guards · E interacts · 1–5 change weapon.</p><p>On touch screens, drag the left stick; the outer edge sprints. Strike follows your chain and becomes Finisher when charged. Hold Guard to parry; Roll evades. The arrows above the stick rotate the camera.</p>')+'<button class="primary" id="resumePlay">Resume run ↗</button><button class="secondary" id="pauseHarbour">Return to harbour</button><div id="audioMixMount"></div><div class="pause-settings"><button id="pauseSound">Sound: '+(sound?'on':'off')+'</button><button id="motionSetting">Motion: '+(reducedMotion?'reduced':'full')+'</button><button id="pauseQuality">Graphics: '+detail+'</button><button id="musicSetting">Music: '+(soundtrack.music?'on':'off')+'</button><button id="pauseBlood">Blood FX: '+(bloodFX?'on':'off')+'</button></div><p>Closing this menu resumes play. Your profile saves automatically. My save provides recovery and restore options.</p>','pause');
 $('resumePlay').onclick=closeModal;$('pauseHarbour').onclick=()=>$('harbourNav').click();
 $('audioMixMount').innerHTML=mixerMarkup();bindMixer(soundtrack.mixer);
 $('musicSetting').onclick=()=>{soundtrack.music=!soundtrack.music;$('musicSetting').textContent='Music: '+(soundtrack.music?'on':'off');};
 $('pauseSound').onclick=()=>{$('soundBtn').click();$('pauseSound').textContent='Sound: '+(sound?'on':'off');};
 $('motionSetting').onclick=()=>{reducedMotion=!reducedMotion;document.body.classList.toggle('reduced-motion',reducedMotion);$('motionSetting').textContent='Motion: '+(reducedMotion?'reduced':'full');};
 $('pauseQuality').onclick=()=>{$('qualityBtn').click();$('pauseQuality').textContent='Graphics: '+detail;};
 $('pauseBlood').onclick=()=>{$('bloodToggle').click();$('pauseBlood').textContent='Blood FX: '+(bloodFX?'on':'off');};
 }catch(e){toast(e.message);}finally{pauseBusy=false;}
}
$('pauseBtn').onclick=()=>openPause();$('tasksBtn').onclick=()=>openPause(true);
$('playSave').onclick=showSave;
$('modal').addEventListener('close',async()=>{if(!playing||!run?.paused)return;try{const data=await api('pause',{paused:false});acceptRun(data.run);}catch(e){toast('Still paused. Open Pause and retry Resume.');}});


// Semantic buttons support touch, mouse, and keyboard activation equally.
$('interaction').onclick=()=>{if(!interactionFor(run)?.ready)return;pressAction('interact');sendInputSoon();};
$('comboBtn').onclick=()=>{if((run?.player.comboCharge||0)<COMBO_HITS)return;mouse.active=false;pressAction('combo');sendInputSoon();};
async function showSave(){
 if(!profile)return;
 try{if(playing&&run?.status==='active'){const data=await api('pause',{paused:true});acceptRun(data.run);}
 modal('<span class="modal-eyebrow">YOUR ARCADE PROFILE</span><h2>Your adventure, saved.</h2><p>Your progress saves automatically to this browser’s profile. Banked salvage, gear and records stay on the game server. Active expeditions expire after 45 minutes.</p><p>Keep a private recovery key before changing devices or clearing cookies. Anyone with the key can access your profile. Keys last one year; create a new one before yours expires.</p><button class="primary" id="createKey">Create recovery key</button><div id="keyResult"></div><h3>Restore an existing save</h3><p>Restoring switches profiles; it does not merge them. Keep this profile’s recovery key first if you want to return.</p><form id="restoreForm"><label for="restoreKey">Private recovery key</label><input type="password" id="restoreKey" required autocomplete="off" spellcheck="false"><button class="secondary" type="submit">Restore my progress</button></form>','save');
 $('createKey').onclick=async()=>{const b=$('createKey');b.disabled=true;try{const data=await api('save/key',{});$('keyResult').innerHTML='<label for="saveKey">Store this somewhere private</label><input id="saveKey" readonly spellcheck="false" value="'+escape(data.key)+'"><button class="secondary" id="copyKey">Copy recovery key</button>';$('copyKey').onclick=async()=>{try{await navigator.clipboard.writeText(data.key);toast('Recovery key copied. Keep it private.');}catch{$('saveKey').select();toast('Select and copy your key.');}};}catch(e){toast(e.message);b.disabled=false;}};
 $('restoreForm').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{const data=await api('save/restore',{key:$('restoreKey').value.trim()});run=null;setPlaying(false);applyState(data);closeModal();if(data.run?.status==='active'){run=data.run;$('startBtn').innerHTML='Resume run <span>↗</span>';}toast('Your saved voyager has been restored.');}catch(e){toast(e.message);b.disabled=false;}};
 }catch(e){toast(e.message);}
}

// Explicit mode transition pauses an active Solo run; Arcade has its own page/input loop.
if($('arcadeLink'))$('arcadeLink').onclick=async event=>{event.preventDefault();try{await api('pause',{paused:true});location.assign('/');}catch(e){toast('Could not pause Solo safely. '+e.message);}};

document.addEventListener('click',e=>{if(e.target.closest('button')&&!e.target.closest('#touchControls'))soundtrack.mixer.play('click',{volume:.18});});

document.addEventListener('stormwake-upgrade',()=>soundtrack.effect('upgrade'));

$('touchOrbitLeft').onclick=()=>{$('orbitLeft').click();};$('touchOrbitRight').onclick=()=>{$('orbitRight').click();};
$('soloStrike').onpointerdown=e=>{e.preventDefault();if(!playing||!run)return;mouse.active=false;pressAction(soloStrike(run.player).action);sendInputSoon();};
$('soloStrike').onclick=e=>{if(e.detail===0&&playing&&run){pressAction(soloStrike(run.player).action);sendInputSoon();}};

$('lockText').onclick=()=>{if(!run||!playing)return;if(firearmFor(run.player.weapon)){autoGunAim=!autoGunAim;lockedTarget=null;toast(autoGunAim?'Auto-aim enabled.':'Manual aim. T enables auto-aim.');return;}const closest=[...run.enemies,...(run.boss.awake?[run.boss]:[])].filter(x=>x.hp>0&&distance(x,run.player)<550).sort((a,b)=>distance(a,run.player)-distance(b,run.player))[0];lockedTarget=lockedTarget!==null?null:closest?.id??null;toast(lockedTarget!==null?'Target locked. T releases the target.':'Target lock released.');};
