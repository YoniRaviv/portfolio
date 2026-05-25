import type { Rig, SectionRig } from '../types';

// Where, part 1: the SINK. As What scrolls into Where, the spinning
// centred mask sinks straight back along -Z, shrinking and fading out,
// while a bright front-lit accent beam flares up. The visitor sees the
// mask drop behind the background lit by a flash — no horizontal slide.
// alpha lands at 0 at Where p=0, so the rest of Where is dark and empty
// (the flash has nothing to illuminate by then, which is the point —
// the afterglow lingers via exposure/particle alpha before everything
// settles for the slide-in).
export const WHERE_RIG_START: Rig = {
  pos: { x: 0, y: 0.4, z: -3 },
  scale: 0.4,
  // Match WHAT_END's 2π exactly (NOT 0, even though they're visually
  // equivalent) so the cross-fade from What's spin doesn't numerically
  // lerp 2π → 0 — which would render as a fast reverse spin across the
  // transitionOut zone. Keeping the same number means the spin reads
  // as decelerating to a stop instead of unwinding.
  yawBias: Math.PI * 2,
  pitchBias: 0.01,
  exposure: 1.4,
  fogDensity: 0.04,
  alpha: 0,
  // Big front-lit flash — the "cool light effect" as the mask sinks. As
  // alpha lerps 1→0 during What→Where, intensity lerps 10→45, so the
  // mid-transition shows the half-transparent mask brightly lit before
  // it fully disappears.
  accentBeamIntensity: 45,
  accentBeamPos: { x: 0, y: 0, z: 4 },
  accentBeamTarget: { x: 0, y: 0.4, z: -3 },
  beamYawOffset: 0,
  particleAlpha: 0.7,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.2,
};

// Where, part 2: ready to emerge from the right. The internal lerp from
// WHERE_RIG_START → WHERE_RIG_END happens entirely with alpha 0, so the
// drift from sunken-centre to off-screen-right is invisible. Lighting
// decays from the flash to How's resting setup. The mask only becomes
// visible during the transitionOut zone (last 20% of Where), where the
// rig blends from this off-screen position into HOW_RIG_START — that's
// the slide-in from the right.
export const WHERE_RIG_END: Rig = {
  pos: { x: 8, y: 0.5, z: -0.2 },
  scale: 1.2,
  yawBias: (2.9 * Math.PI) / 2,
  pitchBias: 0.1,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 0,
  accentBeamIntensity: 14,
  accentBeamPos: { x: -5, y: 5, z: 3 },
  accentBeamTarget: { x: 4.5, y: 0.3, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.55,
  hemiIntensity: 0.45,
  keyIntensity: 0,
};

// Where (mobile): clean alpha fade — NO flash. The desktop flash (exposure
// 1.4, beam 45) reads as the mask "bouncing back brighter" on mobile
// because the rig-lerp lag (~0.5s) overlaps the alpha drop with the
// brightness rise — the user sees a partly-visible mask flaring up just
// before it disappears. Matching exposure/beam/particle to WHAT_END turns
// the cross-fade into a pure opacity fade, so the mask just dissolves.
// On mobile there's no off-screen-right drift to prep for (How fades out
// instead of slides in), so the rig holds an invisible calm pose.
export const WHERE_RIG_MOBILE_START: Rig = {
  pos: { x: 0, y: 0.3, z: -3 },
  scale: 0.3,
  // Match WHAT_END's 2π (NOT 0) so the cross-fade from What's spin
  // doesn't unwind 2π → 0 as a fast reverse spin. Visually identical
  // to 0; numerically continuous with WHAT_END so the spin reads as
  // decelerating rather than reversing.
  yawBias: Math.PI * 2,
  pitchBias: 0.01,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 0,
  accentBeamIntensity: 10,
  accentBeamPos: { x: 0, y: 0, z: 4 },
  accentBeamTarget: { x: 0, y: 0.3, z: -3 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.2,
};

export const WHERE_RIG_MOBILE_END: Rig = {
  ...WHERE_RIG_MOBILE_START,
  pos: { ...WHERE_RIG_MOBILE_START.pos },
  accentBeamPos: { ...WHERE_RIG_MOBILE_START.accentBeamPos },
  accentBeamTarget: { ...WHERE_RIG_MOBILE_START.accentBeamTarget },
  // Decay the flash back toward neutral so the cross-fade into How (alpha 0)
  // isn't lit by a static 45-intensity beam.
  exposure: 1,
  accentBeamIntensity: 12,
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
