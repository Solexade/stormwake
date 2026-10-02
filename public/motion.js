// Shared by authoritative simulation and local visual prediction.
export const MOTION=Object.freeze({jog:310,sprint:440,raven:350,acceleration:32,braking:48,reversal:46,turn:20});
export function locomotion(vx,vy,dx,dy,speed,dt){
 const magnitude=Math.hypot(dx,dy);if(magnitude>1){dx/=magnitude;dy/=magnitude;}
 const rate=magnitude<.05?MOTION.braking:vx*dx+vy*dy<0?MOTION.reversal:MOTION.acceleration;
 const blend=1-Math.exp(-rate*dt);
 vx+=(dx*speed-vx)*blend;vy+=(dy*speed-vy)*blend;
 if(magnitude<.05&&Math.hypot(vx,vy)<2)vx=vy=0;
 return {vx,vy};
}
