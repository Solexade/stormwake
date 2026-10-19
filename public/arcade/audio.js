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
 // Original 128 BPM hybrid percussion and synthesized vowel-chant ensemble.
 startMusic() {
  if(!this.music||!this.enabled||!this.ctx||this.musicSource||this.host.document?.hidden)return;
  const c=this.ctx;
  if(!this.musicBuffer){
   const samples=renderBattleChant(c.sampleRate);
   const buffer=c.createBuffer(1,samples.length,c.sampleRate);buffer.getChannelData(0).set(samples);
   this.musicBuffer=buffer;
  }
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=this.musicBuffer;source.loop=true;
  gain.gain.value=.30;source.connect(gain);gain.connect(c.destination);source.start();this.musicSource=source;this.musicGain=gain;
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
 burst(block=false) {
  if(!this.enabled||!this.ctx||this.ctx.state!=='running'||this.host.document?.hidden)return;
  const c=this.ctx,length=block?.16:.12,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*length),c.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++){const t=i/c.sampleRate;data[i]=(Math.random()*2-1)*Math.exp(-t/(block?.035:.022));}
  const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
  source.buffer=buffer;filter.type='bandpass';filter.frequency.value=block?2600:950;filter.Q.value=block?2:.7;gain.gain.value=block?.13:.18;
  source.connect(filter);filter.connect(gain);gain.connect(c.destination);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 impact(block=false,combo=1) {
  this.burst(block);
  if(block){this.tone(1450,980,.16,.07,'triangle');this.tone(2317,1700,.10,.035,'sine');}
  else {this.tone(170,42,.19,.26,'sine');this.tone(320,80,.06,.04,'triangle');}
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

// Wordless, original synthetic "ah/oh" call-and-response; no sampled performers.
export function renderBattleChant(rate) {
 const beat=60/128,duration=32*beat,out=new Float32Array(Math.ceil(rate*duration));let seed=173;
 const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 const add=(at,len,fn,volume)=>{const start=Math.floor(at*rate),count=Math.floor(len*rate);for(let i=0;i<count&&start+i<out.length;i++){const t=i/rate;out[start+i]+=fn(t,i/count)*volume;}};
 const roots=[73.416,73.416,65.406,65.406,58.27,58.27,65.406,55];
 for(let bar=0;bar<8;bar++){
  const root=roots[bar];
  for(let step=0;step<8;step++){
   const at=(bar*4+step*.5)*beat;
   if(step%2===0||step===7)add(at,.25,t=>Math.sin(2*Math.PI*(46*t+85*.02*(1-Math.exp(-t/.02))))*Math.exp(-t*20),.6);
   if(step===2||step===6){add(at,.18,t=>noise()*Math.exp(-t*28),.18);add(at,.12,t=>Math.sin(2*Math.PI*180*t)*Math.exp(-t*30),.12);}
   add(at,.045,t=>noise()*Math.exp(-t*95),step%2?.035:.025);
   add(at,beat*.42,t=>Math.tanh(2*Math.sin(2*Math.PI*root*t))*Math.exp(-t*12),.12);
  }
  for(const [offset,pitch,vowel] of [[0,root*2,0],[1.5,root*2,0],[2.5,root*3,1]]){
   add((bar*4+offset)*beat,beat*.85,(t,u)=>{
    const env=Math.min(1,t/.04)*Math.pow(Math.sin(Math.PI*u),1.2);let sum=0;
    // Harmonic formant weighting creates choir-like vowels, with two detuned singers.
    for(let h=1;h<=14;h++){
     const hz=h*pitch,formant=Math.exp(-Math.pow((hz-(vowel?450:750))/230,2))+.45*Math.exp(-Math.pow((hz-(vowel?900:1200))/300,2));
     sum+=(Math.sin(2*Math.PI*hz*t)+Math.sin(2*Math.PI*hz*1.006*t+.3))*formant/h;
    }
    return sum*env;
   },.75);
  }
 }
 // Short room tail, soft clipping and a tiny edge fade prevent loop clicks.
 const delay=Math.floor(rate*.085);for(let i=out.length-1;i>=delay;i--)out[i]+=out[i-delay]*.16;
 for(let i=0;i<out.length;i++)out[i]=Math.tanh(out[i])*Math.min(1,i/(rate*.006),(out.length-1-i)/(rate*.006))*.85;
 return out;
}
