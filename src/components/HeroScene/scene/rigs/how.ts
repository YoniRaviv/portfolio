import type { Rig, SectionRig } from '../types';
import { WHERE_RIG_MOBILE_END } from './where';

// How: a side profile peeking in from the right edge. yawBias 3π/2 turns
// the face toward -X (looking left, into the section content). pos.x is
// far enough right that the back of the head and ears sit off-screen and
// only the front of the profile (jaw → nose) slips into view.
//
// Through the section the mask holds still — only the accent beam moves,
// sweeping top → bottom as the user scrolls. accentBeamPos.y goes from
// +5 (above the mask) at the section start down to -4 (below) at the end.
//
// keyIntensity is zeroed here so there's no static white directional
// light fighting the moving accent — you only see ONE light source.
export const HOW_RIG_START: Rig = {
  pos: { x: 4.2, y: 0.5, z: -0.2 },
  scale: 1.2,
  yawBias: (2.9 * Math.PI) / 2,
  pitchBias: 0.1,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
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

export const HOW_RIG_END: Rig = {
  pos: { x: 4.2, y: 0.5, z: -0.2 },
  scale: 1.2,
  yawBias: (2.9 * Math.PI) / 2,
  pitchBias: -0.45,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 14,
  accentBeamPos: { x: -5, y: -4, z: 3 },
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

// How (mobile): mirrors the desktop gesture inside a portrait frame —
// side profile peeking in from the right edge (pos.x positive, yawBias
// 2.9π/2 turning the face toward -X / screen-left). Through the section
// the gaze sweeps UP — pitchBias 0.1 (looking slightly down) at START,
// -0.55 (looking up) at END — while the accent beam walks top → bottom,
// just like the desktop side-profile chiaroscuro. The mask itself
// doesn't translate; pose + light position do the work.
//
// alpha is 1 throughout the section so the gesture is readable from
// start to end. The Where→How transition lerps across Where's last 20%
// from sunk-centre (alpha 0) to this side-profile pose — the mask
// reappears from the sink directly into the How profile, which reads
// as a deliberate emerge rather than a separate fade-in.
export const HOW_RIG_MOBILE_START: Rig = {
  ...WHERE_RIG_MOBILE_END,
  pos: { x: 1.0, y: 0.4, z: -0.2 },
  scale: 0.8,
  // Mirror desktop: 2.9π/2 turns the face toward -X — profile peeks in
  // from the right edge of the canvas with eyes pointed screen-left
  // into the chip grid.
  yawBias: (2.9 * Math.PI) / 2,
  // Slight downward gaze at section top — sweeps up to -0.55 at END.
  pitchBias: 0.1,
  alpha: 1,
  accentBeamIntensity: 16,
  // Beam high + behind-mask at START (creates a rim from above-back).
  accentBeamPos: { x: -2, y: 5, z: 3 },
  // Beam aim slightly past the mask centre toward +x so the light wraps
  // around the back of the head — mirrors desktop's accentBeamTarget.x
  // sitting slightly outside pos.x.
  accentBeamTarget: { x: 1.3, y: 0.3, z: 0 },
  // Zero the key directional light like desktop's How, so the moving
  // accent beam is the only thing illuminating the profile.
  keyIntensity: 0,
};

export const HOW_RIG_MOBILE_END: Rig = {
  ...HOW_RIG_MOBILE_START,
  pos: { ...HOW_RIG_MOBILE_START.pos },
  // Gaze tilted up — this is the "moves up while we scroll" effect.
  pitchBias: -0.55,
  // Beam walked down to under-mask: top → bottom sweep across the section.
  accentBeamPos: { x: -2, y: -3.5, z: 3 },
  accentBeamTarget: { ...HOW_RIG_MOBILE_START.accentBeamTarget },
};

// How holds the profile still — only the light position lerps from top
// (rigStart) to bottom (rigEnd) as you scroll. transitionOut: 0.3 gives the
// full Contact landing (90°-ish rotation out of profile, scale-down from
// 1.2 → 0.8, slide from x=4 → x=2, position drop, and light hand-off) a
// generous third of the How section to play out, so the mask doesn't snap
// into its Contact pose at the boundary.
export const howDesktop: SectionRig = {
  start: HOW_RIG_START,
  end: HOW_RIG_END,
  transitionOut: 0.3,
};

export const howMobile: SectionRig = {
  start: HOW_RIG_MOBILE_START,
  end: HOW_RIG_MOBILE_END,
  // Shorter transitionOut than desktop (0.3 → 0.12) so the side-profile
  // pose + upward gaze sweep get the full body of the section to
  // breathe. The morph into Contact's centred pose only kicks in the
  // last 12% of How — until then the user holds the side profile
  // (with its lit arc + light walk) instead of seeing the mask drift
  // toward centre well before the section is over.
  transitionOut: 0.12,
};
