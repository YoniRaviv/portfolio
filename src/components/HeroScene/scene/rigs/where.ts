import type { Rig, SectionRig } from '../types';

// Where (desktop): NO flash, NO sink, NO slide-in. The old behaviour
// dropped alpha 1 → 0 with a 45-intensity flash, drifted the invisible
// mask off-screen right, then slid it back in for How — a long, showy
// transition. We replace that with a quiet invisible swap: Where holds
// What_END's exact pose through the section while HeroScene.ts cross-
// fades the sword in over the mask mid-section (see swordOpacity ramp).
// By the time the probe crosses into How, the model is already the
// sword. The rig then morphs from this held pose into HOW_RIG_START
// during the transitionOut zone (last 20%), but the mask is already
// hidden by then so the morph is only visible on the sword.
export const WHERE_RIG_START: Rig = {
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

// Where_END matches HOW_RIG_START's pos and scale so the sword's apparent
// angle (which depends on perspective at a given scale/position) is
// identical at the Where→How boundary. Without this, the same Y-rotation
// looks different at scale 0.5 vs 1, causing a visible angle jump when
// the sword fades in during Where but How starts at scale 1.
// The mask is hidden by swordOpacity by the time this end-pose is reached,
// so the scale/pos change doesn't affect any visible mask geometry.
export const WHERE_RIG_END: Rig = {
  pos: { x: 0, y: 0, z: 0 },
  scale: 0.5,
  yawBias: Math.PI * 2,
  pitchBias: 0.01,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 10,
  accentBeamPos: { x: 2.2, y: -3, z: 1.5 },
  accentBeamTarget: { x: 0, y: 0, z: 0 },
  beamYawOffset: -Math.PI * 2,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

// Where (mobile): NO alpha fade at the What→Where boundary. The old
// behaviour dropped alpha 1 → 0 across the boundary so the mask dissolved
// before Where began — visually redundant with the sword cross-fade that
// already handles the mask→sword swap at the start of How. Instead, Where
// inherits What_END's exact pose (centre, scale, 2π spin, lights) and
// holds it through the section. The mask just stays where it was; the
// sword cross-fade in How (HeroScene.ts: swordOpacity ramp over the first
// 6% of How) does the actual handoff. Pose drifts toward HOW_RIG_MOBILE_START
// over the section's transitionOut zone so the swap happens at the same
// scale/lighting as the sword's entry pose — no flying-back jolt.
export const WHERE_RIG_MOBILE_START: Rig = {
  pos: { x: 0, y: 0, z: 0 },
  scale: 0.42,
  // Match WHAT_END's 2π (NOT 0) so the spin doesn't unwind across the
  // boundary. The transitionOut zone interpolates this toward HOW_START's
  // yaw (also set to 2π below) so the held angle stays continuous.
  yawBias: Math.PI * 2,
  pitchBias: 0.01,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 10,
  accentBeamPos: { x: 2.2, y: -3, z: 1.5 },
  accentBeamTarget: { x: 0, y: 0, z: 0 },
  // Match WHAT_END's counter-orbit so the beam stays parked where What
  // left it instead of unwinding back to 0 inside Where.
  beamYawOffset: -Math.PI * 2,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

// Where_END holds What_END's pose so the mask doesn't grow visibly during
// the section. The transitionOut zone (last 20%) lerps this pose into
// HOW_RIG_MOBILE_START — but by then HeroScene.ts has already cross-faded
// the sword in (the swap window finishes BEFORE transitionOut starts), so
// the user only sees the sword grow into How's pose, not the mask.
export const WHERE_RIG_MOBILE_END: Rig = {
  ...WHERE_RIG_MOBILE_START,
  pos: { ...WHERE_RIG_MOBILE_START.pos },
  accentBeamPos: { ...WHERE_RIG_MOBILE_START.accentBeamPos },
  accentBeamTarget: { ...WHERE_RIG_MOBILE_START.accentBeamTarget },
};

// Invisible-mask section. rigStart is the sunk-centre flash pose, rigEnd is
// off-screen right ready to emerge. Both have alpha 0, so the internal drift
// from centre to right is invisible — the user only sees the sink (from
// What's transitionOut) at the top of Where and the slide-in (from Where's
// transitionOut into How) at the bottom. transitionOut: 0.2 gives the
// slide-in enough scroll length to read as a deliberate emerge.
export const whereDesktop: SectionRig = {
  start: WHERE_RIG_START,
  end: WHERE_RIG_END,
  transitionOut: 0.2,
};

export const whereMobile: SectionRig = {
  start: WHERE_RIG_MOBILE_START,
  end: WHERE_RIG_MOBILE_END,
  transitionOut: 0.2,
};
