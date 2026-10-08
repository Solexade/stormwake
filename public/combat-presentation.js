// Presentation only: never changes simulation timing, input, or damage.
export function combatPose(s){
 if(s.hp<=0)return {name:'Death',once:true};
 if(s.action==='roll')return {name:'Roll_sword',once:true,duration:s.actionDuration,key:s.actionId};
 if(['light1','light2','heavy','finisher'].includes(s.action))return {name:s.action==='light1'?'Run_swordAttack':s.action==='light2'?'Run_swordAttack':'swordAttackJump',once:true,duration:s.actionDuration,key:s.actionId};
 if(s.stagger>0)return {name:'Idle_swordLeft',hold:.3,state:'stagger'};
 if(s.wind>0)return {name:'swordAttackJump',hold:.2,state:'windup'};
 if(s.swing>0)return {name:'swordAttackJump',once:true,duration:s.type==='boss'?.5:.3,state:'swing'};
 if(s.guard)return {name:'Idle_swordLeft',hold:.15,state:'guard'};
 if(Math.hypot(s.vx||0,s.vy||0)>8)return {name:s.sprinting?'Run':'Walking',moving:true};
 return {name:'Idle_swordRight'};
}
export function warningFor(e){
 if(e.hp<=0||!(e.wind>0))return null;
 const total=e.type==='boss'?(e.phase===2?.85:1.15):e.type==='brute'?.85:e.type==='archer'?.62:.48;
 return {progress:Math.max(0,Math.min(1,1-e.wind/total)),label:e.type==='archer'?'ARROW · SIDESTEP':e.type==='boss'?'SLAM · LEAVE THE RING':e.type==='brute'?'CLEAVE · DODGE':'STRIKE · GUARD'};
}
