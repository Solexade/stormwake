// One linear-light pipeline: HDR/PBR -> subtle grade -> ACES -> sRGB.
// Performance mode retains ACES/sRGB and lighting, bypassing bloom/grade.
export const PALETTE = Object.freeze({
  exposure: .98, fog: '#607b83', fogDensity: .024,
  skyLight: '#b6c8d1', groundLight: '#293c32', ambient: .7,
  sun: '#dce3e5', sunIntensity: 1.1,
  rim: '#becbd2', rimIntensity: .20,
  bloomStrength: .06, bloomThreshold: 1.1, saturation: .96,
});
