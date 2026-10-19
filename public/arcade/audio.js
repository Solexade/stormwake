// Original synthesized impacts; browser-local speech when available. No downloaded audio.
export class ArcadeAudio {
 constructor(host=globalThis) { this.host=host; this.enabled=false; this.voice=true; this.music=true; this.last=0; this.match=null; this.phase=null; }
 async enable() {
  try { const Context=this.host.AudioContext||this.host.webkitAudioContext;
   if(!Context)return false;
   this.ctx??=new Context(); await this.ctx.resume(); this.enabled=true; this.startMusic(); return true;
  } catch { this.enabled=false; return false; }
 }
 stop() { this.stopMusic(); this.host.speechSynthesis?.cancel(); this.ctx?.suspend(); }
 mute() { this.enabled=false; this.stop(); }
 // Original 112 BPM D-minor battle loop, rendered once into a local buffer.
 startMusic() {
  if(!this.music||!this.enabled||!this.ctx||this.musicSource||this.host.document?.hidden)return;
  const c=this.ctx;
  if(!this.musicBuffer){
   const beat=60/112,bars=8,duration=beat*4*bars;
   const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);
   const add=(start,length,freq,gain,kind)=>{
    const offset=Math.floor(start*c.sampleRate),count=Math.floor(length*c.sampleRate);
    for(let n=0;n<count&&offset+n<data.length;n++){
     const t=n/c.sampleRate,attack=Math.min(1,t/.012),env=attack*Math.exp(-t/(length*.25));
     const phase=2*Math.PI*freq*t;
     const wave=kind==='drum'?Math.sin(2*Math.PI*(55*t+75*.018*(1-Math.exp(-t/.018)))):Math.sin(phase)+.25*Math.sin(phase*2);
     data[offset+n]+=wave*env*gain;
    }
   };
   const roots=[146.83,146.83,130.81,130.81,116.54,116.54,130.81,110];
   const melody=[2,3,2,1.5,2,2.25,3,2.25];
   for(let bar=0;bar<bars;bar++)for(let step=0;step<8;step++){
    const t=(bar*4+step*.5)*beat,root=roots[bar];
    add(t,beat*.42,root*melody[step],.10,'pluck');
    if(step%2===0){add(t,beat*.8,root/2,.16,'bass');add(t,.24,55,.24,'drum');}
    if(step===2||step===6)add(t,.09,880,.035,'chime');
   }
   this.musicBuffer=buffer;
  }
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.musicBuffer;source.loop=true;
  gain.gain.value=.24;source.connect(gain);gain.connect(c.destination);source.start();this.musicSource=source;this.musicGain=gain;
 }
 stopMusic(){if(this.musicSource){this.musicSource.stop();this.musicSource.disconnect();this.musicGain.disconnect();this.musicSource=null;this.musicGain=null;}}
 setMusic(value){this.music=value;if(value)this.startMusic();else this.stopMusic();}
 say(text) {
  if(!this.enabled||!this.voice||this.host.document?.hidden)return;
  const synth=this.host.speechSynthesis, Utterance=this.host.SpeechSynthesisUtterance;
  if(!synth||!Utterance)return;
  // Use an installed voice only; never request network speech services.
  const voice=synth.getVoices().find(v=>v.localService&&/^en/i.test(v.lang));
  if(!voice)return;
  synth.cancel();const line=new Utterance(text);line.voice=voice;line.rate=.95;line.pitch=.8;line.volume=.65;synth.speak(line);
 }
 tone(freq,end,duration,volume,type='sine') {
  if(!this.enabled||!this.ctx||this.ctx.state!=='running'||this.host.document?.hidden)return;
  const c=this.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(end,t+duration);
  g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(volume,t+.005);g.gain.exponentialRampToValueAtTime(.001,t+duration);
  o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
 }
 impact(block=false,combo=1) {
  this.tone(block?1100:130,block?480:38,block?.13:.19,block?.07:.24,block?'triangle':'sine');
  this.tone(block?2100:420,block?900:65,.075,.045,'sawtooth');
  if(combo>=3)this.say('Unbroken!');
 }
 update(s,seat) {
  if(this.match!==s.id){this.match=s.id;this.last=s.eventId||0;this.phase=s.phase;if(s.phase==='countdown')this.say('Round '+s.round+'. Prepare.');return;}
  const fresh=(s.events||[]).filter(e=>e.id>this.last);this.last=Math.max(this.last,s.eventId||0);
  if(this.enabled&&!this.host.document?.hidden){
   // Collapse delayed packets to one impact, avoiding a burst of old sounds.
   const hit=fresh.filter(e=>e.type==='hit'||e.type==='block').at(-1);
   if(hit)this.impact(hit.type==='block',hit.combo||1);
   const finish=fresh.find(e=>e.type==='finished');
   if(finish){this.tone(220,440,.5,.12,'triangle');this.say(finish.winner===null?'A worthy draw.':finish.winner===seat?'Victory! Your oath holds.':'Defeat. Rise with the next tide.');}
   else if(fresh.some(e=>e.type==='ko'))this.say('Knockout!');
   else if(fresh.some(e=>e.type==='timeout'))this.say('Time!');
   else if(this.phase!==s.phase&&s.phase==='fight'){this.tone(180,360,.2,.12,'triangle');this.say('Fight!');}
   else if(fresh.some(e=>e.type==='round'))this.say('Round '+s.round+'. Prepare.');
  }
  this.phase=s.phase;
 }
}
