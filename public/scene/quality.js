export function initialQuality(coarse=false) { return coarse ? "low" : "high"; }
// Mobile starts with the lighter preset; players can still select High.
export const QUALITY = Object.freeze({
  high: Object.freeze({pixelRatio: 1.6, shadows: true, bloom: true, foliage: true, shore: true}),
  low: Object.freeze({pixelRatio: 1, shadows: false, bloom: false, foliage: false, shore: false}),
});
export function qualityPreset(name) { return QUALITY[name] || QUALITY.high; }

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
