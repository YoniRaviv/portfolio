import type { Rig, SectionRig } from '../types';
import { WHERE_RIG_MOBILE_END } from './where';
import { CONTACT_RIG_MOBILE_START } from './contact';

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

// How (mobile): fade out. Start matches WHERE_MOBILE_END (sunk centre,
// invisible) so the cross-fade from Where is in-place; end matches
// CONTACT_MOBILE_START pose with alpha 0 so the fade-in to Contact's bleed
// reads as the mask appearing exactly where it'll sit.
export const HOW_RIG_MOBILE_START: Rig = {
  ...WHERE_RIG_MOBILE_END,
  pos: { ...WHERE_RIG_MOBILE_END.pos },
  accentBeamPos: { ...WHERE_RIG_MOBILE_END.accentBeamPos },
  accentBeamTarget: { ...WHERE_RIG_MOBILE_END.accentBeamTarget },
  alpha: 0,
};

export const HOW_RIG_MOBILE_END: Rig = {
  ...CONTACT_RIG_MOBILE_START,
  pos: { ...CONTACT_RIG_MOBILE_START.pos },
  accentBeamPos: { ...CONTACT_RIG_MOBILE_START.accentBeamPos },
  accentBeamTarget: { ...CONTACT_RIG_MOBILE_START.accentBeamTarget },
  alpha: 0,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
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
  transitionOut: 0.3,
};
