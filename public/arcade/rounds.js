import {RULES} from './config.js';
import {fighter,event} from './state.js';
export function endRound(s){const [a,b]=s.fighters;const winner=a.hp===b.hp?null:a.hp>b.hp?0:1;s.roundWinner=winner;if(winner===null)s.draws++;else s.fighters[winner].wins++;
 event(s,a.hp===0||b.hp===0?'ko':'timeout',{winner});s.phase='roundEnd';s.phaseFrames=RULES.between;
 if(winner!==null&&s.fighters[winner].wins===2){s.winner=winner;s.phase='finished';event(s,'finished',{winner});}
 // Drawn rounds are replayed; three drawn rounds end the match as a draw.
 else if(s.draws>=3){s.phase='finished';s.winner=null;event(s,'finished',{winner:null});}
}
export function nextRound(s){s.round++;s.time=RULES.roundFrames;s.phase='countdown';s.phaseFrames=RULES.countdown;s.fighters=s.fighters.map((old,i)=>({...fighter(i),wins:old.wins,seq:old.seq}));event(s,'round',{round:s.round});}
