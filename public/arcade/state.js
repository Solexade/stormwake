import {RULES} from './config.js';
export function fighter(index){return {x:index?8:4,y:0,vy:0,facing:index?-1:1,hp:RULES.hp,wins:0,stun:0,blockStun:0,crouch:false,block:false,move:null,moveFrame:0,hit:false,specialCD:0,cooldown:0,combo:0,comboUntil:0,lastHitFrame:-100,pose:'idle',flash:0,input:{axis:0},inputFrame:-100,seq:-1,pending:null};}
export function createMatch(id,mode='ai',difficulty='normal'){return {id,mode,difficulty,phase:'countdown',phaseFrames:RULES.countdown,frame:0,round:1,time:RULES.roundFrames,fighters:[fighter(0),fighter(1)],winner:null,roundWinner:null,draws:0,events:[],eventId:0,rng:1234567,aiNext:0};}
export function event(s,type,data={}){s.events.push({id:++s.eventId,frame:s.frame,type,...data});s.events=s.events.slice(-12);}
