import test from 'node:test';
import assert from 'node:assert/strict';
import {gunTarget} from '../public/combat-presentation.js';
test('rifle auto-aim acquires targets in every direction and preserves input state',()=>{
 const p={x:1135,y:815};const before={...p};
 for(const [x,y] of [[30,0],[-30,0],[0,30],[0,-30]]){
 const e={id:1,hp:100,x:p.x+x,y:p.y+y};
 assert.equal(gunTarget(p,[e],null)?.id,1);
 }
 assert.deepEqual(p,before);
});
test('rifle lock stays sticky, releases dead targets and rejects walls/range/sleeping boss',()=>{
 const p={x:1135,y:815},near={id:1,hp:100,x:1155,y:815},far={id:2,hp:100,x:1175,y:815};
 assert.equal(gunTarget(p,[near,far],null,2)?.id,2);
 assert.equal(gunTarget(p,[near,{...far,hp:0}],null,2)?.id,1);
 assert.equal(gunTarget(p,[{...far,x:2000}],null),null);
 assert.equal(gunTarget(p,[],{...near,awake:false}),null);
 assert.equal(gunTarget({x:1130,y:1040},[{id:3,hp:100,x:1290,y:1040}],null),null);
});
