import type { Rig, SectionRig } from '../types';
import { WHAT_RIG_MOBILE_START } from './what';

// Mask shrinks and centres horizontally (pos.x = 0 → viewport centre) so it
// sits behind the quote.
//
// As the user scrolls *through* Who, the accent beam sweeps from the lower
// left (continuing Hero's direction) over to the upper right and ramps in
// intensity, so the lighting feels dynamic instead of static. The mask is
// kept readable via a healthier exposure + lighter fog than the prior pass.
//
// Knobs you'll likely want to tinker with:
//   * exposure          — overall mask brightness (renderer.toneMappingExposure)
//   * fogDensity        — atmospheric falloff
//   * accentBeamPos     — light direction (the beam points at target 1.5,1.8,-0.5)
//   * accentBeamIntensity — how strongly the orange key light hits the mask
export const WHO_RIG_START: Rig = {
  pos: { x: 0, y: 0.5, z: 0 },
  scale: 0.6,
  yawBias: 0,
  pitchBias: -0.35,
  exposure: 0.6,
  fogDensity: 0.05,
  alpha: 1,
  accentBeamIntensity: 12,
  accentBeamPos: { x: -3, y: -2.5, z: 2.5 },
  accentBeamTarget: { x: 0, y: 0.8, z: -0.5 },
  beamYawOffset: 0,
  particleAlpha: 0.5,
  pointerYaw: 0.4,
  pointerPitch: 0.3,
  parallaxStrength: 1,
  ambientIntensity: 0.8,
  hemiIntensity: 0.65,
  keyIntensity: 1.6,
};

export const WHO_RIG_END: Rig = {
  pos: { x: 0, y: 0.5, z: 0 },
  scale: 0.6,
  yawBias: 0,
  pitchBias: -0.5,
  exposure: 0.85,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 26,
  accentBeamPos: { x: 4, y: -1, z: 2.5 },
  accentBeamTarget: { x: 0, y: 0.8, z: -0.5 },
  beamYawOffset: 0,
  particleAlpha: 0.5,
  pointerYaw: 0.4,
  pointerPitch: 0.3,
  parallaxStrength: 1,
  ambientIntensity: 0.8,
  hemiIntensity: 0.65,
  keyIntensity: 1.6,
};

// Who (mobile): visible smaller mask behind the quote, dim accent. Within the
// section the rig drifts from this pose toward WHAT_START so by the section
// boundary the mask is already on its spin mark. No pointer follow on mobile
// (auto-drift handles ambient motion elsewhere).
export const WHO_RIG_MOBILE_START: Rig = {
  pos: { x: 0, y: 0.5, z: 0 },
  scale: 0.4,
  yawBias: 0,
  pitchBias: -0.2,
  exposure: 0.7,
  fogDensity: 0.05,
  alpha: 1,
  accentBeamIntensity: 12,
  accentBeamPos: { x: -3, y: -2, z: 2.5 },
  accentBeamTarget: { x: 0, y: 0.5, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.8,
  hemiIntensity: 0.65,
  keyIntensity: 1.6,
};

// WHO_END spreads WHAT_START — within Who the rig lerps from WHO_START's
// "behind the quote" pose into WHAT_START's "spin-ready" pose, so the
// cross-fade into What is a no-op and the spin starts cleanly on the
// section boundary.
export const WHO_RIG_MOBILE_END: Rig = {
  ...WHAT_RIG_MOBILE_START,
  pos: { ...WHAT_RIG_MOBILE_START.pos },
  accentBeamPos: { ...WHAT_RIG_MOBILE_START.accentBeamPos },
  accentBeamTarget: { ...WHAT_RIG_MOBILE_START.accentBeamTarget },
};

export const whoDesktop: SectionRig = { start: WHO_RIG_START, end: WHO_RIG_END };
export const whoMobile: SectionRig = { start: WHO_RIG_MOBILE_START, end: WHO_RIG_MOBILE_END };
