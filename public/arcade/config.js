export const RULES=Object.freeze({hz:60,width:12,halfWidth:.34,speed:4.5,jump:7.8,gravity:22,hp:100,roundFrames:3600,countdown:120,between:150,staleFrames:24});
export const MOVES=Object.freeze({
 punch:{startup:5,active:3,recovery:13,range:1.05,damage:6,stun:20,blockStun:8,push:.12,cooldown:0,level:'high'},
 kick:{startup:11,active:5,recovery:22,range:1.65,damage:12,stun:27,blockStun:12,push:.35,cooldown:8,level:'mid'},
 backhand:{startup:7,active:4,recovery:18,range:1.25,damage:9,stun:23,blockStun:10,push:.26,cooldown:0,level:'mid'},
 sweep:{startup:12,active:4,recovery:23,range:1.3,damage:10,stun:24,blockStun:11,push:.3,cooldown:0,level:'low'},
 aerial:{startup:8,active:4,recovery:19,range:1.2,damage:10,stun:22,blockStun:10,push:.28,cooldown:0,level:'mid'},
 light:{startup:6,active:3,recovery:15,range:1.15,damage:8,stun:20,blockStun:9,push:.22,cooldown:0,level:'high'},
 heavy:{startup:17,active:5,recovery:27,range:1.5,damage:17,stun:30,blockStun:15,push:.48,cooldown:12,level:'mid'},
 special:{startup:23,active:7,recovery:32,range:2.4,damage:23,stun:36,blockStun:20,push:.70,cooldown:240,level:'mid'}
});
export const DIFFICULTY=Object.freeze({easy:{reaction:28,aggression:.40,guard:.22,special:.06},normal:{reaction:18,aggression:.65,guard:.45,special:.12},hard:{reaction:12,aggression:.80,guard:.65,special:.18}});
