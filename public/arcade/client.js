import {createArena} from './view.js';
const $=id=>document.getElementById(id),keyboard=new Set(),pointers=new Map(),commands=[];
let room=null,view=null,viewPromise=null,busy=false,seq=0,lastSend=0,lastReply=0,low=false,lastMode='ai',lastDifficulty='normal';
const held=k=>keyboard.has(k)||[...pointers.values()].includes(k);
async function api(route,b={}){const r=await fetch('/api/arcade/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to reach the ring.');return data;}
function clear(){keyboard.clear();pointers.clear();commands.length=0;document.querySelectorAll('.held').forEach(el=>el.classList.remove('held'));}
function paint(){if(!room)return;const s=room.match;for(let i=0;i<2;i++){$('name'+i).textContent=room.labels[i]+(room.seat===i?' · YOU':'');$('hp'+i).style.width=Math.max(0,s.fighters[i].hp)+'%';$('hp'+i).parentElement.setAttribute('aria-label',room.labels[i]+' health '+s.fighters[i].hp);$('wins'+i).textContent='●'.repeat(s.fighters[i].wins)+'○'.repeat(2-s.fighters[i].wins);$('special'+i).textContent=s.fighters[i].specialCD?'Storm '+(s.fighters[i].specialCD/60).toFixed(1)+'s':'Storm ready';}
 $('timer').textContent=Math.ceil(s.time/60);$('round').textContent='ROUND '+s.round;$('roomLabel').textContent=room.match.mode==='room'?'PRIVATE ROOM · '+room.code:'OATHRING · '+lastDifficulty.toUpperCase();
 $('waiting').hidden=room.status!=='waiting';$('shareCode').textContent=room.code;
 $('announcement').textContent=room.status==='waiting'?'':s.phase==='countdown'?Math.ceil(s.phaseFrames/60)+' · READY':s.phase==='roundEnd'?(s.roundWinner===null?'DRAW · REPLAY ROUND':(s.fighters.some(f=>f.hp===0)?'KO · ':'TIME · ')+(s.roundWinner===room.seat?'ROUND WON':'ROUND LOST')):'';
 $('result').hidden=s.phase!=='finished';if(s.phase==='finished'){$('network').textContent='MATCH RECORDED';$('outcome').textContent=s.winner===null?'An unbroken stalemate.':s.winner===room.seat?'Your oath holds.':'Rise with the next tide.';$('summary').textContent=(s.winner===null?'DRAW':s.winner===room.seat?'VICTORY':'DEFEAT')+' · '+s.fighters[0].wins+' — '+s.fighters[1].wins+(room.reason?' · '+room.reason:'');clear();}
 const f=s.fighters[room.seat];$('combo').textContent=f.combo>1&&s.frame<f.comboUntil?f.combo+' HIT CHAIN':'';
 $('fight').dataset.phase=s.phase;$('fight').dataset.round=String(s.round);$('fight').dataset.playerX=f.x.toFixed(3);$('fight').dataset.opponentHp=String(s.fighters[1-room.seat].hp);
}
async function enter(data){room=data;seq=Math.max(seq,room.match.fighters[room.seat].seq+1);lastMode=room.match.mode;lastDifficulty=room.match.difficulty;clear();$('lobby').hidden=true;$('arena').hidden=false;document.body.classList.add('fighting');$('error').textContent='';
 if(!viewPromise)viewPromise=createArena($('fight')).then(v=>view=v).catch(e=>{viewPromise=null;throw e;});
 try{await viewPromise;$('fight').focus({preventScroll:true});}catch(e){$('error').textContent='The 3D fighters could not load. Reload to retry. '+e.message;}paint();lastReply=performance.now();
}
async function start(mode){if(busy)return;busy=true;try{lastDifficulty=$('difficulty').value;await enter(await api('create',{mode,difficulty:lastDifficulty}));}catch(e){$('error').textContent=e.message;}finally{busy=false;}}
$('ai').onclick=()=>start('ai');$('create').onclick=()=>start('room');
$('joinForm').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;try{await enter(await api('join',{code:$('code').value}));}catch(e){$('error').textContent=e.message;}finally{busy=false;}};
$('resume').onclick=async()=>{try{const data=await api('resume');if(data.code)await enter(data);else $('resume').hidden=true;}catch(e){$('error').textContent=e.message;}};
function menu(){clear();room=null;$('arena').hidden=true;$('lobby').hidden=false;$('resume').hidden=true;document.body.classList.remove('fighting');}
$('leave').onclick=async()=>{if(!room||busy)return;busy=true;try{await api('leave',{code:room.code});menu();}catch(e){$('error').textContent=e.message;}finally{busy=false;}};
$('menu').onclick=menu;$('replay').onclick=()=>{const mode=lastMode;menu();start(mode);};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(room.code);$('copy').textContent='Copied';}catch{$('error').textContent='Copy this room code: '+room.code;}};
$('quality').onclick=()=>{low=!low;view?.quality(low);$('quality').textContent=low?'Performance':'High detail';};
function down(k){if(!room||room.match.phase==='finished')return;if(['j','k','u','w'].includes(k))commands.push({at:performance.now(),...(k==='w'?{jump:true}:{attack:{j:'light',k:'heavy',u:'special'}[k]})});if(commands.length>4)commands.shift();}
const keys=new Set(['a','d','w','s','j','k','l','u']);
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(!room||!keys.has(k))return;e.preventDefault();if(!keyboard.has(k)){keyboard.add(k);down(k);sync();}});
window.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(room&&keys.has(k)){e.preventDefault();keyboard.delete(k);sync();}});
for(const button of document.querySelectorAll('[data-key]')){
 button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);pointers.set(e.pointerId,button.dataset.key);button.classList.add('held');down(button.dataset.key);sync();});
 const release=e=>{pointers.delete(e.pointerId);button.classList.remove('held');sync();};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
window.addEventListener('blur',()=>{clear();sync();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();sync();}});
async function sync(){if(!room||busy||room.match.phase==='finished'||performance.now()-lastSend<100)return;busy=true;lastSend=performance.now();
 while(commands[0]&&lastSend-commands[0].at>400)commands.shift();const command=commands.shift()||{};
 try{const data=await api('sync',{code:room.code,seq:++seq,axis:document.hidden?0:(held('d')?1:0)-(held('a')?1:0),crouch:held('s'),block:held('l'),jump:!!command.jump,attack:command.attack||null});room=data;lastReply=performance.now();$('network').textContent='SERVER · '+Math.round(lastReply-lastSend)+' ms';$('error').textContent='';paint();}
 catch(e){clear();$('network').textContent='RECONNECTING';$('error').textContent=e.message+' Inputs stop during interruption. A 20-second disconnect forfeits the duel.';}
 finally{busy=false;}
}
setInterval(sync,100);
function frame(){if(view&&room&&!document.hidden)view.draw(room.match);if(room&&room.match.phase!=='finished'&&lastReply&&performance.now()-lastReply>1200)$('network').textContent='CONNECTION DELAY';requestAnimationFrame(frame);}requestAnimationFrame(frame);
api('resume').then(data=>{$('resume').hidden=!data.code;}).catch(e=>{$('error').textContent=e.message;});
