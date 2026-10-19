// Original synthesized impacts; browser-local speech when available. No downloaded audio.
export class ArcadeAudio {
 constructor(host=globalThis) { this.host=host; this.enabled=false; this.voice=true; this.last=0; this.match=null; this.phase=null; }
 async enable() {
  try { const Context=this.host.AudioContext||this.host.webkitAudioContext;
   if(!Context)return false;
   this.ctx??=new Context(); await this.ctx.resume(); this.enabled=true; return true;
  } catch { this.enabled=false; return false; }
 }
 stop() { this.host.speechSynthesis?.cancel(); this.ctx?.suspend(); }
 mute() { this.enabled=false; this.stop(); }
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
