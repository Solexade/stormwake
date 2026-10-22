import {AUDIO_FILES} from './audio-manifest.js';
export const DEFAULT_LEVELS=Object.freeze({music:.34,sfx:.75,ambience:.28});
export function cleanLevels(value={}) {return Object.fromEntries(Object.entries(DEFAULT_LEVELS).map(([k,v])=>[k,typeof value[k]==='number'&&Number.isFinite(value[k])?Math.max(0,Math.min(1,value[k])):v]));}
const KEY='stormwake.audio.levels.v1';
export class SampleMixer {
 constructor(host=globalThis){this.host=host;this.enabled=false;this.active=false;this.mode='explore';this.music=true;this.buffers=new Map();this.loops=new Map();this.shots=new Set();this.loading=new Map();this.failed=new Set();this.variant=0;this.duckUntil=0;try{this.levels=cleanLevels(JSON.parse(host.localStorage?.getItem(KEY)||'{}'));}catch{this.levels=cleanLevels();}}
 async enable(){try{const Context=this.host.AudioContext||this.host.webkitAudioContext;if(!Context)return false;
  if(!this.ctx){this.ctx=new Context();this.buses={};this.ducker=this.ctx.createGain();this.ducker.connect(this.ctx.destination);for(const k of Object.keys(DEFAULT_LEVELS)){const g=this.ctx.createGain();g.gain.value=this.levels[k];g.connect(k==='music'?this.ducker:this.ctx.destination);this.buses[k]=g;}}
  await this.ctx.resume();this.enabled=true;void this.loadAll();return true;
 }catch{return false;}}
 async loadAll(){await Promise.allSettled(Object.keys(AUDIO_FILES).map(k=>this.load(k)));this.syncLoops();}
 load(key){if(this.buffers.has(key))return Promise.resolve(this.buffers.get(key));if(this.loading.has(key))return this.loading.get(key);if(this.failed.has(key))return Promise.resolve(null);
  const promise=(async()=>{try{const r=await this.host.fetch(AUDIO_FILES[key].url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(r.status);const b=await this.ctx.decodeAudioData(await r.arrayBuffer());this.buffers.set(key,b);this.syncLoops();return b;}catch{this.failed.add(key);return null;}})();this.loading.set(key,promise);return promise;
 }
 setLevel(key,value){if(!(key in DEFAULT_LEVELS))return;this.levels=cleanLevels({...this.levels,[key]:value});try{this.host.localStorage?.setItem(KEY,JSON.stringify(this.levels));}catch{}if(this.buses)this.buses[key].gain.setTargetAtTime(this.levels[key],this.ctx.currentTime,.04);}
 setMusic(value){this.music=!!value;this.syncLoops();}
 setScene(mode,active=true){const changed=this.mode!==mode||this.active!==active;this.mode=mode;this.active=active;if(!this.ctx)return;
  if(!this.enabled||!active||this.host.document?.hidden){this.suspend();return;}
  if(this.ctx.state==='suspended'&&!this.resuming){this.resuming=true;this.ctx.resume().catch(()=>{}).finally(()=>{this.resuming=false;});}
  if(changed||this.loops.size<3)this.syncLoops();
 }
 syncLoops(){if(!this.ctx||!this.enabled||!this.active||this.host.document?.hidden)return;
  for(const key of ['explore','combat','ocean']){if(!this.loops.has(key)&&this.buffers.has(key)){const s=this.ctx.createBufferSource(),g=this.ctx.createGain();s.buffer=this.buffers.get(key);s.loop=true;g.gain.value=0;s.connect(g);g.connect(this.buses[key==='ocean'?'ambience':'music']);s.start();this.loops.set(key,{s,g,target:-1});}
   const loop=this.loops.get(key);if(!loop)continue;const target=key==='ocean'?.45:this.music&&key===this.mode?.65:0;if(loop.target!==target){loop.g.gain.setTargetAtTime(target,this.ctx.currentTime,.7);loop.target=target;}}
 }
 duck(){if(!this.ctx)return;const t=this.ctx.currentTime;this.duckUntil=t+.4;const g=this.ducker.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(.30,t+.025);g.setTargetAtTime(1,t+.35,.28);}
 play(key,{volume=.55,rate=1,bus='sfx',vary=true}={}){if(!this.enabled||!this.active||!this.ctx||this.ctx.state!=='running'||this.host.document?.hidden||!this.buffers.has(key))return false;
  if(this.shots.size>=16)return true;const c=this.ctx,s=c.createBufferSource(),g=c.createGain();s.buffer=this.buffers.get(key);s.playbackRate.value=rate*(vary?.96+(this.variant++%5)*.02:1);g.gain.value=volume;s.connect(g);g.connect(this.buses[bus]);this.shots.add(s);s.onended=()=>{this.shots.delete(s);s.disconnect();g.disconnect();};s.start();return true;
 }
 suspend(){if(!this.ctx)return;for(const s of this.shots){try{s.stop();}catch{}}this.shots.clear();if(this.ctx.state==='running')void this.ctx.suspend().catch(()=>{});}
 mute(){this.enabled=false;this.suspend();}
}
