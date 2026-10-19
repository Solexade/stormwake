import {DIFFICULTY} from './config.js';
function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
export function aiDecision(s){const settings=DIFFICULTY[s.difficulty]||DIFFICULTY.normal,a=s.fighters[1],p=s.fighters[0],distance=Math.abs(p.x-a.x),toward=p.x>a.x?1:-1;
 // Only public positions/actions are read, never the opponent's input or pending command.
 const threatened=!!p.move&&distance<2.5,block=threatened&&random(s)<settings.guard;
 const attack=!block&&distance<2.3&&random(s)<settings.aggression?(random(s)<settings.special?'special':distance<1.45?'light':'heavy'):null;
 return {seq:a.seq+1,axis:block?0:distance>1.25?toward:distance<.8?-toward:0,block,crouch:false,attack,jump:false};
}
export function reaction(s){return (DIFFICULTY[s.difficulty]||DIFFICULTY.normal).reaction;}
