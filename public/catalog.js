export const SAFEHOUSE={x:445,y:1315,name:'Hearthhall'};
export const FORGE={x:647,y:1460,name:'Astrid’s forge'};
export const SUPPLIES={x:795,y:1625,name:'Edda’s supplies'};
export const SHOP_ITEMS={
 axe:{name:'Weapon forging',description:'+4 damage to every weapon per rank. Permanent.',costs:[60,120,200],icon:'⚒'},
 armour:{name:'Reinforced leathers',description:'+20 maximum vitality per rank. Permanent.',costs:[70,140],icon:'◈'},
 boots:{name:'Wayfarer boots',description:'+15 maximum stamina per rank. Permanent.',costs:[50,100],icon:'↠'},
 potion:{name:'Healing draught',description:'Restore 60 vitality with R. Carry up to three.',costs:[35],icon:'✚'}
};
export function loadoutStats(gear={},wins=0){const axe=Math.max(0,Math.min(3,Number(gear.axe)||0)),armour=Math.max(0,Math.min(2,Number(gear.armour)||0)),boots=Math.max(0,Math.min(2,Number(gear.boots)||0));return {damageBonus:axe*4,maxHp:120+armour*20+(wins>0?10:0),maxStamina:100+boots*15};}
export const safeArea=p=>p.y>1300&&p.x<900;
export const near=(p,q,r=115)=>Math.hypot(p.x-q.x,p.y-q.y)<r;

export const WEAPONS={axe:{name:'Raider axe',description:'Balanced strikes and a broad finisher.',damage:1,speed:1,reach:1,cost:1},sword:{name:'Storm sword',description:'Fast cuts with lower stamina cost and damage.',damage:.9,speed:.76,reach:1.05,cost:.8},spear:{name:'Harbour spear',description:'Long reach, slower recovery and a narrow strike.',damage:1.1,speed:1.2,reach:1.45,cost:1.15}};
