import {RULES} from './config.js';
export function moveFighter(f,input){
 const grounded=f.y<=0;f.crouch=grounded&&input.crouch&&!f.move&&!f.stun&&!f.blockStun;
 f.block=grounded&&input.block&&!f.move&&!f.stun;
 if(f.pending?.jump&&grounded&&!f.move&&!f.stun&&!f.blockStun&&!f.crouch&&!f.block)f.vy=RULES.jump;
 const canMove=!f.move&&!f.stun&&!f.blockStun&&!f.crouch&&!f.block;
 if(canMove)f.x+=input.axis*RULES.speed/RULES.hz;
 if(f.vy||f.y>0){f.y=Math.max(0,f.y+f.vy/RULES.hz);f.vy-=RULES.gravity/RULES.hz;if(f.y===0)f.vy=0;}
 f.x=Math.max(RULES.halfWidth,Math.min(RULES.width-RULES.halfWidth,f.x));
 f.pose=f.stun?'hurt':f.blockStun||f.block?'block':f.move?'attack':f.y>0?'jump':f.crouch?'crouch':canMove&&input.axis?'walk':'idle';
}
export function separate(fighters){const [a,b]=fighters;if(Math.abs(a.x-b.x)<RULES.halfWidth*2&&Math.abs(a.y-b.y)<1.1){const sign=a.x<=b.x?1:-1,mid=(a.x+b.x)/2;a.x=mid-sign*RULES.halfWidth;b.x=mid+sign*RULES.halfWidth;for(const f of fighters)f.x=Math.max(RULES.halfWidth,Math.min(RULES.width-RULES.halfWidth,f.x));}}
export function face(fighters){for(let i=0;i<2;i++){const f=fighters[i];if(!f.move&&!f.stun)f.facing=fighters[1-i].x>=f.x?1:-1;}}
