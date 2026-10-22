import {SampleMixer} from '../sample-mixer.js';
// Licensed local recordings; synthesized impact fallback and installed announcer voice.
export class ArcadeAudio {
 constructor(host=globalThis) { this.host=host; this.mixer=new SampleMixer(host); this.enabled=false; this.voice=true; this.music=true; this.last=0; this.match=null; this.phase=null; }
 async enable() {const ok=await this.mixer.enable();this.ctx=this.mixer.ctx;this.enabled=ok;if(ok)this.startMusic();return ok;}
 stop(){this.mixer.setScene('combat',false);this.host.speechSynthesis?.cancel();}
 mute(){this.enabled=false;this.mixer.mute();this.host.speechSynthesis?.cancel();}
 startMusic(){this.mixer.setMusic(this.music);this.mixer.setScene('combat',true);}
 stopMusic(){this.mixer.setMusic(false);}
 setMusic(value){this.music=value;this.mixer.setMusic(value);}
 say(text) {
  if(!this.enabled||!this.voice||this.host.document?.hidden)return;
  const synth=this.host.speechSynthesis, Utterance=this.host.SpeechSynthesisUtterance;
  if(!synth||!Utterance)return;
  // Use an installed voice only; never request network speech services.
  const voice=synth.getVoices().find(v=>v.localService&&/^en/i.test(v.lang));
  if(!voice)return;
  synth.cancel();const line=new Utterance(text);line.voice=voice;line.rate=.95;line.pitch=.8;line.volume=.65*this.mixer.levels.sfx;synth.speak(line);
 }
 tone(freq,end,duration,volume,type='sine') {
  if(!this.enabled||!this.ctx||this.ctx.state!=='running'||this.host.document?.hidden)return;
  const c=this.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(end,t+duration);
  g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(volume,t+.005);g.gain.exponentialRampToValueAtTime(.001,t+duration);
  o.connect(g);g.connect(this.mixer.buses?.sfx||c.destination);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
 }
 burst(block=false) {
  if(!this.enabled||!this.ctx||this.ctx.state!=='running'||this.host.document?.hidden)return;
  const c=this.ctx,length=block?.16:.12,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*length),c.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++){const t=i/c.sampleRate;data[i]=(Math.random()*2-1)*Math.exp(-t/(block?.035:.022));}
  const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
  source.buffer=buffer;filter.type='bandpass';filter.frequency.value=block?2600:950;filter.Q.value=block?2:.7;gain.gain.value=block?.13:.18;
  source.connect(filter);filter.connect(gain);gain.connect(this.mixer.buses?.sfx||c.destination);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 impact(block=false,combo=1) {
  if(this.mixer.play(block?'metal':'hit1',{volume:.65})){if(!block)this.mixer.play('bass',{volume:.3});this.mixer.duck();if(combo>=3)this.say('Unbroken!');return;}
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
