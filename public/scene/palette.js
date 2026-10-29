// One linear-light pipeline: HDR/PBR -> subtle grade -> ACES -> sRGB.
// Performance mode retains ACES/sRGB and lighting, bypassing bloom/grade.
export const PALETTE = Object.freeze({
  exposure: 1.08, fog: '#b0c2c9', fogDensity: .0085,
  skyLight: '#d5e4ec', groundLight: '#777d61', ambient: .85,
  sun: '#fff0d5', sunIntensity: 1.8,
  rim: '#becbd2', rimIntensity: .28,
  bloomStrength: .035, bloomThreshold: 1.1, saturation: 1.0,
});
