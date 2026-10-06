// The same world definitions are used by the renderer and authoritative server.
export const WORLD = { width: 2500, height: 1850 };
export const LAND = [
  [[245,1210],[380,1080],[685,1070],[890,1170],[985,1420],[860,1650],[370,1700],[220,1510]],
  [[650,890],[790,630],[1080,520],[1440,610],[1610,850],[1530,1160],[1300,1360],[960,1320],[740,1170]],
  [[415,650],[580,445],[820,440],[965,635],[860,920],[610,1050],[435,890]],
  [[1450,530],[1590,260],[1900,175],[2210,310],[2310,620],[2150,920],[1840,1075],[1590,960],[1470,790]],
];
export const BRIDGES = [{x:670,y:1070,w:160,h:200},{x:800,y:755,w:260,h:100},{x:1430,y:740,w:200,h:110}];
export const HOME = {x:465,y:1410};
export const SHRINE = {x:1135,y:815};
export const BOSS = {x:1910,y:560};
export const OBSTACLES = [{x:1210,y:1040,r:56},{x:1015,y:640,r:45},{x:1710,y:385,r:42},{x:2110,y:740,r:55},{x:600,y:565,r:42},{x:700,y:1520,r:52}];
export const STRUCTURES = [{x:420,y:1240,w:126,h:101,angle:-.15},{x:660,y:1390,w:114,h:96,angle:.1},{x:760,y:1580,w:90,h:78,angle:.35}];
export const RELICS = {
  storm: {name:'Stormglass axe',text:'Your strikes arc to a nearby foe. Base damage drops to 19.',color:'#8addfa'},
  raven: {name:'Raven feather',text:'Dodge more often and move faster. Maximum health drops to 80.',color:'#cbacff'}
};
export function inside(x,y,poly) {
  let result=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const [xi,yi]=poly[i],[xj,yj]=poly[j];
    if(((yi>y)!=(yj>y)) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) result=!result;
  }
  return result;
}
export function landAt(x,y) {
  return LAND.some(p=>inside(x,y,p)) || BRIDGES.some(b=>x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h);
}
export function walkable(x,y,r=16) {
  return [[x+r,y],[x-r,y],[x,y+r],[x,y-r]].every(([a,b])=>landAt(a,b)) && !OBSTACLES.some(o=>Math.hypot(x-o.x,y-o.y)<r+o.r) && !STRUCTURES.some(o=>{const dx=x-o.x,dy=y-o.y,c=Math.cos(o.angle),s=Math.sin(o.angle);return Math.abs(c*dx-s*dy)<o.w/2+r&&Math.abs(s*dx+c*dy)<o.h/2+r;});
}

// Shared swept movement keeps rolls, lunges and prediction outside solid geometry.
export function moveBody(body,dx,dy,r=16){
 const x=body.x,y=body.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4)),sx=dx/steps,sy=dy/steps;
 for(let i=0;i<steps;i++){
  if(walkable(body.x+sx,body.y+sy,r)){body.x+=sx;body.y+=sy;continue;}
  const beforeX=body.x,beforeY=body.y;
  if(walkable(body.x+sx,body.y,r))body.x+=sx;
  if(walkable(body.x,body.y+sy,r))body.y+=sy;
  if(body.x===beforeX&&body.y===beforeY){
   // Project onto rotated wall tangents; axis-only sliding sticks on angled walls.
   for(const o of STRUCTURES){
    const c=Math.cos(o.angle),s=Math.sin(o.angle),lx=c*(body.x-o.x)-s*(body.y-o.y),ly=s*(body.x-o.x)+c*(body.y-o.y);
    if(Math.abs(lx)>o.w/2+r+8||Math.abs(ly)>o.h/2+r+8)continue;
    const side=Math.abs(lx)/(o.w/2+r)>Math.abs(ly)/(o.h/2+r),tx=side?s:c,ty=side?c:-s,dot=sx*tx+sy*ty;
    if(walkable(body.x+tx*dot,body.y+ty*dot,r)){body.x+=tx*dot;body.y+=ty*dot;break;}
   }
  }
 }
 return Math.hypot(body.x-x,body.y-y);
}
