export function initialQuality(coarse=false) {
 try { const saved=globalThis.localStorage?.getItem('stormwake.graphics');if(['low','medium','high'].includes(saved))return saved; } catch {}
 return coarse ? 'low' : 'medium';
}
// Mobile starts with the lighter preset; players can still select High.
export const QUALITY = Object.freeze({
  high: Object.freeze({pixelRatio: 1.5, shadows: true, sceneryRange:38, bloom: true, foliage: true, shore: true}),
  medium: Object.freeze({pixelRatio: 1, shadows: false, sceneryRange:20, bloom: false, foliage: true, shore: true}),
  low: Object.freeze({pixelRatio: .85, shadows: false, sceneryRange:0, bloom: false, foliage: false, shore: false}),
});
export function qualityPreset(name) { return QUALITY[name] || QUALITY.high; }

export function adjustedPixelRatio(quality,ratio,{samples,medianMs}){
  if(quality==='high'||samples<40||medianMs<35||ratio<=.65)return ratio;
  return Math.max(.65,Math.round(ratio*.82*100)/100);
}

export function frameStatistics(samples) {
  const sorted = samples.filter(n => Number.isFinite(n) && n > 0).sort((a,b) => a-b);
  if (!sorted.length) return {samples: 0, medianMs: 0, p95Ms: 0};
  return {samples: sorted.length, medianMs: sorted[Math.floor((sorted.length-1)*.5)], p95Ms: sorted[Math.ceil(sorted.length*.95)-1]};
}

export function createFrameMeter(limit = 180) {
  let frames = [], work = [], previous = null;
  return {
    begin(now) {
      // Exclude suspended tabs; do not turn a resume into a fictitious slow frame.
      if (previous !== null && now-previous < 1000) frames.push(now-previous);
      previous = now;
      if (frames.length > limit) frames.shift();
    },
    end(ms) { work.push(ms); if (work.length > limit) work.shift(); },
    reset() { frames=[]; work=[]; previous=null; },
    read() { return {frame: frameStatistics(frames), cpu: frameStatistics(work)}; },
  };
}
