import type { Rig, SectionRig } from '../types';

// In What: small mask, centred, with a subtle downward gaze. Lit much like
// Hero (so it's properly visible, not a red silhouette) but with a slight
// uplight from below + a low-key accent beam orbiting opposite to the mask's
// 360° spin. Rotation starts at holdStart on the section so it kicks in after
// the title divider rolls past.
//
// Knobs to tinker with:
//   * accentBeamIntensity — push higher for more orange wash, lower for none
//   * accentBeamPos.y     — push more negative to exaggerate the uplight
//   * ambientIntensity    — overall fill; lower for darker / contrastier mask
//   * pitchBias           — positive = look down, negative = look up
export const WHAT_RIG_START: Rig = {
  pos: { x: 0, y: 0.4, z: 0 },
  scale: 0.5,
  yawBias: 0,
  pitchBias: 0.01,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 10,
  accentBeamPos: { x: 2.2, y: -3, z: 1.5 },
  accentBeamTarget: { x: 0, y: 0.4, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

export const WHAT_RIG_END: Rig = {
  pos: { x: 0, y: 0.4, z: 0 },
  scale: 0.5,
  yawBias: Math.PI * 2,
  pitchBias: 0.01,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 10,
  accentBeamPos: { x: 2.2, y: -3, z: 1.5 },
  accentBeamTarget: { x: 0, y: 0.4, z: 0 },
  beamYawOffset: -Math.PI * 2,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

// What (mobile): the mask drops to roughly the canvas mid-line (pos.y ≈ 0)
// so as project rows scroll past, the names visually pass *across* the
// mask rather than entirely below it — what was an above-the-fold token
// now reads as the visual anchor *between* project entries. The 2π spin
// remains the section's signature gesture.
export const WHAT_RIG_MOBILE_START: Rig = {
  pos: { x: 0, y: 0, z: 0 },
  scale: 0.42,
  yawBias: 0,
  pitchBias: 0.01,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 10,
  accentBeamPos: { x: 2.2, y: -3, z: 1.5 },
  accentBeamTarget: { x: 0, y: 0, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

export const WHAT_RIG_MOBILE_END: Rig = {
  ...WHAT_RIG_MOBILE_START,
  pos: { ...WHAT_RIG_MOBILE_START.pos },
  accentBeamPos: { ...WHAT_RIG_MOBILE_START.accentBeamPos },
  accentBeamTarget: { ...WHAT_RIG_MOBILE_START.accentBeamTarget },
  yawBias: Math.PI * 2,
  beamYawOffset: -Math.PI * 2,
};

// What holds its small mask + uplight through the project list, then hands
// off to Where via a longer (15%) transitionOut so the sink animation is
// visible — the mask shrinks and slides back along -Z while the accent
// beam flares up. holdStart delays the spin until ~the title divider is past.
export const whatDesktop: SectionRig = {
  start: WHAT_RIG_START,
  end: WHAT_RIG_END,
  transitionOut: 0.15,
  holdStart: 0.12,
};

export const whatMobile: SectionRig = {
  start: WHAT_RIG_MOBILE_START,
  end: WHAT_RIG_MOBILE_END,
  // Tighter than desktop: keep the mask at full alpha through the entire
  // project list and only fade/sink in the final ~6% of the section so the
  // mask is still solid behind the last project (NEXT) instead of half-gone
  // mid-card.
  transitionOut: -0.06,
  holdStart: 0.52,
};
