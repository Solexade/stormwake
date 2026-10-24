// Input intents only. The simulation decides whether a move can execute.
export function stickIntent(x,y,radius=44){const length=Math.hypot(x,y),scale=length>radius?radius/length:1;return {x:x*scale,y:y*scale,axis:Math.abs(x)>radius*.25?(x<0?-1:1):0,jump:y<-radius*.55,crouch:y>radius*.55};}
export function arcadeStrike(f){
 if(f?.move==='punch'&&f.hit)return {key:'o',label:'Kick follow-up'};
 if(f?.move==='kick'&&f.hit)return {key:'k',label:'Breaker'};
 if(f?.move==='light'&&f.hit)return {key:'j',label:'Backhand'};
 if(f?.move==='backhand'&&f.hit||f?.move==='sweep'&&f.hit)return {key:'k',label:'Breaker'};
 if(f?.move==='heavy'&&f.hit&&!f.specialCD)return {key:'u',label:'Storm ender'};
 if(f?.crouch)return {key:'j',label:'Low sweep'};
 if(f?.y>0)return {key:'j',label:'Air strike'};
 return {key:'i',label:'Jab'};
}
export function soloStrike(p){if(p?.riposteWindow>0&&p.weapon!=='gun')return {action:'attack',label:'Counter!'};return (p?.comboCharge||0)>=3?{action:'combo',label:'Finisher'}:p?.combo>=2&&p.comboWindow>0?{action:'heavy',label:'Breaker'}:{action:'attack',label:p?.comboWindow>0?'Backhand':'Strike'};}
export function bindMovementPad(element,onIntent){
 let pointer=null,lastJump=false;const thumb=element.querySelector('span');
 const reset=()=>{pointer=null;lastJump=false;thumb.style.transform='';onIntent({axis:0,crouch:false,jump:false});};
 const move=e=>{const r=element.getBoundingClientRect(),v=stickIntent(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,r.width*.35);thumb.style.transform=`translate(${v.x}px,${v.y}px)`;onIntent({...v,jump:v.jump&&!lastJump});lastJump=v.jump;};
 element.onpointerdown=e=>{if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;element.setPointerCapture(pointer);move(e);};
 element.onpointermove=e=>{if(e.pointerId===pointer)move(e);};
 element.onpointerup=element.onpointercancel=element.onlostpointercapture=e=>{if(e.pointerId===pointer)reset();};
 return reset;
}
