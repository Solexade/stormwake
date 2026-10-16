import {RULES} from './config.js';
import {acceptInput} from './input.js';
import {moveFighter,face,separate} from './movement.js';
import {beginAttack,resolveHits,timers} from './combat.js';
import {endRound,nextRound} from './rounds.js';
import {aiDecision,reaction} from './ai.js';
export {createMatch} from './state.js';
export {acceptInput} from './input.js';
export function step(s){
 if(s.phase==='finished')return;s.frame++;
 if(s.phase==='countdown'){if(--s.phaseFrames<=0)s.phase='fight';return;}
 if(s.phase==='roundEnd'){if(--s.phaseFrames<=0)nextRound(s);return;}
 if(s.mode==='ai'&&s.frame>=s.aiNext){acceptInput(s,1,aiDecision(s));s.aiNext=s.frame+reaction(s);}
 face(s.fighters);
 for(const f of s.fighters){const input=s.frame-f.inputFrame>RULES.staleFrames?{axis:0}:f.input;if(s.frame-f.inputFrame>RULES.staleFrames)f.pending=null;
 timers(f);moveFighter(f,input);if(f.pending?.attack)beginAttack(f,f.pending.attack);f.pending=null;}
 separate(s.fighters);resolveHits(s);for(const f of s.fighters)f.x=Math.max(RULES.halfWidth,Math.min(RULES.width-RULES.halfWidth,f.x));
 s.time--;if(s.time<=0||s.fighters.some(f=>f.hp<=0))endRound(s);
}
