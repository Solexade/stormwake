// Original procedural score and effects: no external recordings or paid assets.
export class AdventureAudio {
 constructor(){this.enabled=false;this.music=true;this.beat=0;this.next=0;this.foot=0;}
 async enable(){this.ctx??=new AudioContext();await this.ctx.resume();this.enabled=true;this.next=this.ctx.currentTime;}
 note(freq,time,duration,volume=.03,type='sine',bus){const c=this.ctx;if(!c)return;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(volume,time+.025);g.gain.exponentialRampToValueAtTime(.0001,time+duration);o.connect(g);g.connect(bus||c.destination);o.start(time);o.stop(time+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};}
 noise(duration=.12,volume=.03,cutoff=700){if(!this.enabled||!this.ctx)return;const c=this.ctx,b=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length)**2;const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;f.type='lowpass';f.frequency.value=cutoff;g.gain.value=volume;s.connect(f);f.connect(g);g.connect(c.destination);s.start();s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};}
 effect(kind){if(!this.enabled)return;const now=this.ctx.currentTime;if(['swing','dodge'].includes(kind))this.noise(.18,.035,2200);if(['strike','hurt','parry'].includes(kind)){this.noise(.12,.065,kind==='parry'?5500:900);this.note(kind==='parry'?1100:75,now,.18,.045,'triangle');}if(['chest','relic','boss-defeated'].includes(kind))[293.66,369.99,440,587.33].forEach((f,i)=>this.note(f,now+i*.1,.65,.035,'triangle'));if(kind==='storm'){this.noise(.6,.08,500);this.note(49,now,.7,.05);}}
 update(p,active,boss,hidden){if(!this.ctx)return;if(!this.enabled||hidden){if(this.ctx.state==='running')this.ctx.suspend();return;}if(this.ctx.state!=='running'){this.ctx.resume().catch(()=>{});this.next=this.ctx.currentTime;}
 const now=this.ctx.currentTime; if(p&&active){const speed=Math.hypot(p.vx||0,p.vy||0);if(speed>20&&now>this.foot){this.noise(.065,.023,450);this.foot=now+(p.sprinting?.24:.34);}}
 if(!this.music||!active){this.next=now;return;}
 // D minor / Bb / F / C: sparse plucked melody, bass drone and battle pulse.
 const roots=[146.83,116.54,174.61,130.81],melody=[0,7,12,3,7,15,12,7,0,3,7,10,7,3,2,7];
 if(this.next<now-.2)this.next=now;
 while(this.next<now+.12){const root=roots[Math.floor(this.beat/8)%4],step=melody[this.beat%16];this.note(root*2**(step/12),this.next,.65,.018,'triangle');if(this.beat%4===0)this.note(root/2,this.next,2,.026);if(boss&&this.beat%2===0)this.note(55,this.next,.2,.04,'triangle');this.beat++;this.next+=boss?.24:.36;}

 }
}
