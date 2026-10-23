import test from 'node:test';
import assert from 'node:assert/strict';
import {stickIntent,arcadeStrike,soloStrike,bindMovementPad} from '../public/mobile-controls.js';
import {createMatch,step,acceptInput} from '../public/arcade/engine.js';
import {beginAttack} from '../public/arcade/combat.js';
import {MOVES} from '../public/arcade/config.js';
test('pad deadzone, cardinal directions and diagonal clamp',()=>{
 assert.equal(stickIntent(2,2).axis,0);assert.equal(stickIntent(-40,0).axis,-1);assert.equal(stickIntent(40,0).axis,1);assert.ok(stickIntent(0,-40).jump);assert.ok(stickIntent(0,40).crouch);const v=stickIntent(200,200);assert.ok(Math.hypot(v.x,v.y)<=44.001);
});
test('movement pad owns one pointer, jumps once per upward gesture, cancels to neutral',()=>{
 const calls=[],thumb={style:{}},el={querySelector:()=>thumb,getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),setPointerCapture(){}};
 const reset=bindMovementPad(el,v=>calls.push(v)),e=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,preventDefault(){}});
 el.onpointerdown(e(1,90,50));assert.equal(calls.at(-1).axis,1);el.onpointerdown(e(2,10,50));assert.equal(calls.length,1);el.onpointermove(e(1,50,10));assert.equal(calls.at(-1).jump,true);el.onpointermove(e(1,50,9));assert.equal(calls.at(-1).jump,false);el.onpointercancel(e(2,0,0));assert.equal(calls.at(-1).jump,false);el.onpointercancel(e(1,0,0));assert.deepEqual(calls.at(-1),{axis:0,crouch:false,jump:false});assert.equal(thumb.style.transform,'');reset();
});
test('context controls select intents without granting hits or changing scores',()=>{
 assert.equal(arcadeStrike({move:'light',hit:true}).label,'Backhand');assert.equal(arcadeStrike({move:'backhand',hit:true}).key,'k');assert.equal(arcadeStrike({move:'heavy',hit:true,specialCD:4}).key,'i');assert.equal(soloStrike({comboCharge:3}).action,'combo');assert.equal(soloStrike({combo:2,comboWindow:1}).action,'heavy');
});
test('confirmed chains require recovery and cannot loop or bypass cooldown',()=>{
 const f=createMatch('combo').fighters[0];beginAttack(f,'light');f.hit=true;f.moveFrame=5;assert.equal(beginAttack(f,'light'),false);f.moveFrame=10;assert.equal(beginAttack(f,'light'),true);assert.equal(f.move,'backhand');f.hit=true;f.moveFrame=12;assert.equal(beginAttack(f,'light'),false);assert.equal(beginAttack(f,'heavy'),true);f.hit=true;f.moveFrame=23;assert.equal(beginAttack(f,'special'),true);assert.equal(f.specialCD,MOVES.special.cooldown);assert.equal(beginAttack(f,'special'),false);
});
test('server chooses sweep and airborne variants, rejects forged move names',()=>{
 const f=createMatch('variants').fighters[0];f.crouch=true;assert.equal(beginAttack(f,'light'),true);assert.equal(f.move,'sweep');f.move=null;f.y=1;assert.equal(beginAttack(f,'light'),true);assert.equal(f.move,'aerial');f.move=null;assert.equal(beginAttack(f,'backhand'),false);
});
test('full light/backhand/heavy/storm chain deals authoritative scaled damage',()=>{
 const s=createMatch('route','room');s.phase='fight';s.fighters[0].x=5;s.fighters[1].x=6;
 const press=a=>acceptInput(s,0,{seq:s.fighters[0].seq+1,attack:a});const frames=n=>{for(let i=0;i<n;i++)step(s);};
 press('light');frames(11);press('light');frames(13);press('heavy');frames(24);press('special');frames(25);
 assert.ok(s.fighters[0].combo>=4);assert.ok(s.fighters[1].hp<60);const hp=s.fighters[1].hp;frames(5);assert.equal(s.fighters[1].hp,hp);
});

test('jab and kick chain only on confirmed recovery, with no repeat loop',()=>{
 const f=createMatch('martial').fighters[0];assert.equal(beginAttack(f,'punch'),true);
 f.moveFrame=8;assert.equal(beginAttack(f,'kick'),false);f.hit=true;assert.equal(beginAttack(f,'kick'),true);
 f.moveFrame=16;f.hit=true;assert.equal(beginAttack(f,'kick'),false);assert.equal(beginAttack(f,'heavy'),true);
 assert.equal(arcadeStrike({move:'punch',hit:true}).key,'o');assert.equal(arcadeStrike({move:'kick',hit:true}).key,'k');
});
import {moveFighter} from '../public/arcade/movement.js';
import {ArcadeAudio} from '../public/arcade/audio.js';
test('attacks preserve direction, release stops, and stun and walls remain authoritative',()=>{
 const f=createMatch('steer').fighters[0];f.move='punch';const x=f.x;moveFighter(f,{axis:1});assert.ok(f.x>x);const moved=f.x;moveFighter(f,{axis:0});assert.equal(f.x,moved);moveFighter(f,{axis:-1});assert.ok(f.x<moved);f.stun=4;const stunned=f.x;moveFighter(f,{axis:1});assert.equal(f.x,stunned);f.stun=0;f.x=11.65;for(let i=0;i<50;i++)moveFighter(f,{axis:1});assert.ok(f.x<=11.66);
});
test('body impacts use punch recordings and avoid metallic layering',()=>{
 const audio=new ArcadeAudio({}),played=[];audio.mixer={play:(key,options)=>{played.push(key);return true;},duck:()=>{}};
 audio.impact(false,3,'punch');assert.deepEqual(played,['bass']);played.length=0;audio.impact(true,1,'light');assert.deepEqual(played,['metal']);
});
