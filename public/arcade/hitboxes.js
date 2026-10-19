import {MOVES} from './config.js';
export function hurtbox(f){return {left:f.x-.34,right:f.x+.34,bottom:f.y,top:f.y+(f.crouch?1.0:1.9)};}
export function hitbox(f){const m=MOVES[f.move];if(!m||f.moveFrame<m.startup||f.moveFrame>=m.startup+m.active||f.hit)return null;return {left:f.facing>0?f.x:f.x-m.range,right:f.facing>0?f.x+m.range:f.x,bottom:f.y+(m.level==='high'?1.15:.35),top:f.y+1.65};}
export function overlaps(a,b){return !!a&&a.left<b.right&&a.right>b.left&&a.bottom<b.top&&a.top>b.bottom;}
