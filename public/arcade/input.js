export function acceptInput(s,index,b){
 const f=s.fighters[index];if(!Number.isSafeInteger(b.seq)||b.seq<=f.seq||b.seq>Number.MAX_SAFE_INTEGER-1)return false;
 f.seq=b.seq;f.inputFrame=s.frame;
 f.input={axis:b.axis===-1?-1:b.axis===1?1:0,crouch:b.crouch===true,block:b.block===true};
 f.pending={jump:b.jump===true,attack:['light','heavy','special'].includes(b.attack)?b.attack:null};return true;
}
