import {WORLD,walkable,moveBody} from './world.js';

const STEP=36, RADIUS=18;
const COLS=Math.ceil(WORLD.width/STEP)+1;
const ROWS=Math.ceil(WORLD.height/STEP)+1;
const SIZE=COLS*ROWS;
const fields=new Map();
const DIRECTIONS=[[1,1],[2,-1],[4,COLS],[8,-COLS]];
let links;

export function clearEnemyRoute(from,to,radius=RADIUS){
 const dx=to.x-from.x,dy=to.y-from.y;
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/12));
 for(let i=1;i<=steps;i++){
  if(!walkable(from.x+dx*i/steps,from.y+dy*i/steps,radius))return false;
 }
 return true;
}

const point=id=>({x:id%COLS*STEP,y:Math.floor(id/COLS)*STEP});

function grid(){
 if(links)return links;
 const valid=new Uint8Array(SIZE);
 links=new Uint8Array(SIZE);
 for(let id=0;id<SIZE;id++){
  const {x,y}=point(id);
  valid[id]=walkable(x,y,RADIUS)?1:0;
 }
 for(let id=0;id<SIZE;id++){
  if(!valid[id])continue;
  const {x,y}=point(id);
  if(id%COLS<COLS-1&&valid[id+1]&&walkable(x+STEP/2,y,RADIUS)){
   links[id]|=1;links[id+1]|=2;
  }
  if(id+COLS<SIZE&&valid[id+COLS]&&walkable(x,y+STEP/2,RADIUS)){
   links[id]|=4;links[id+COLS]|=8;
  }
 }
 return links;
}

function nearbyCell(position,accept){
 const col=Math.round(position.x/STEP),row=Math.round(position.y/STEP);
 let best=-1, distance=Infinity;
 for(let y=Math.max(0,row-1);y<=Math.min(ROWS-1,row+1);y++){
  for(let x=Math.max(0,col-1);x<=Math.min(COLS-1,col+1);x++){
   const id=y*COLS+x,d=Math.hypot(position.x-x*STEP,position.y-y*STEP);
   if(d<distance&&accept(id)){best=id;distance=d;}
  }
 }
 return best;
}

function pursuitField(target){
 const edges=grid();
 // A hero can hug a wall more tightly than an enemy. Route to the nearest clear approach.
 const goal=nearbyCell(target,id=>edges[id]&&clearEnemyRoute(target,point(id),12));
 if(goal<0)return null;
 if(fields.has(goal))return fields.get(goal);
 const next=new Int32Array(SIZE).fill(-1),queue=new Int32Array(SIZE);
 let head=0,tail=1;
 queue[0]=goal;next[goal]=goal;
 while(head<tail){
  const id=queue[head++],mask=edges[id];
  for(const [bit,delta] of DIRECTIONS){
   if(!(mask&bit))continue;
   const neighbour=id+delta;
   if(next[neighbour]>=0)continue;
   next[neighbour]=id;queue[tail++]=neighbour;
  }
 }
 if(fields.size>=12)fields.delete(fields.keys().next().value);
 fields.set(goal,next);
 return next;
}

export function connectedEnemySpawn(position,target){
 if(clearEnemyRoute(position,target,16))return true;
 const field=pursuitField(target);
 return !!field&&nearbyCell(position,id=>field[id]>=0&&clearEnemyRoute(position,point(id)))>=0;
}

export function pursueEnemy(enemy,target,speed,dt,direct){
 let destination=target;
 if(!direct){
  const field=pursuitField(target);
  if(!field)return 0;
  const start=nearbyCell(enemy,id=>field[id]>=0&&clearEnemyRoute(enemy,point(id)));
  if(start<0)return 0;
  let cursor=start;
  // Skip grid corners only when the swept path is clear.
  for(let i=0;i<5&&cursor!==field[cursor];i++){
   const next=field[cursor];
   if(!clearEnemyRoute(enemy,point(next)))break;
   cursor=next;
  }
  destination=point(cursor);
 }
 const dx=destination.x-enemy.x,dy=destination.y-enemy.y;
 const distance=Math.hypot(dx,dy);
 if(distance<.05)return 0;
 const step=Math.min(distance,speed*dt);
 return moveBody(enemy,dx/distance*step,dy/distance*step,RADIUS);
}
