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
// pitchBias is POSITIVE here (mask tilts its face down) so that as the visitor
// scrolls out of Hero (which looks up, -0.5) into Who, the mask drops its gaze
// to "watch" the section sliding up into view. START dips a touch deeper — the
// arrival beat — then eases back to a gentler downward hold at END.
export const WHO_RIG_START: Rig = {
  pos: { x: 0, y: 0.5, z: 0 },
  scale: 0.6,
  yawBias: 0,
  pitchBias: -0.12,
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
  pitchBias: -1,
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

// Who (mobile): mask sits centred behind the quote. Lighting (exposure,
// fog, ambient/hemi/key, accent beam pos+target+intensity, particle
// alpha) mirrors WHO_RIG_START exactly so the arrival pose reads the
// same on phone and desktop. Mobile-only retained knobs: pos (centred),
// scale (0.4 fits the portrait viewport), pitchBias (-0.6 — steeper
// downward gaze tuned to the mobile camera), and the pointer/parallax
// block (zeroed; touch viewers don't drive cursor reactivity).
// The section's life on mobile still comes from the time-based accent-
// beam arc driven in HeroScene.ts's animate() block; that overrides
// accentBeam.position once the visitor enters Who.
export const WHO_RIG_MOBILE_START: Rig = {
  pos: { x: 0, y: 0.5, z: 0 },
  scale: 0.4,
  yawBias: 0,
  pitchBias: -0.6,
  exposure: 0.6,
  fogDensity: 0.05,
  alpha: 1,
  accentBeamIntensity: 12,
  accentBeamPos: { x: -3, y: -2.5, z: 2.5 },
  accentBeamTarget: { x: 0, y: 0.8, z: -0.5 },
  beamYawOffset: 0,
  particleAlpha: 0.5,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.8,
  hemiIntensity: 0.65,
  keyIntensity: 1.6,
};

// WHO_END spreads WHAT_START so the cross-fade into the spin section is a
// no-op (same pose either side of the boundary, the spin starts cleanly).
// The visible "ambient drift" inside Who is contributed by the mobile
// breathing block in animate(), not by START≠END here — keeping the rig
// continuous at the boundary while still feeling alive.
export const WHO_RIG_MOBILE_END: Rig = {
  ...WHAT_RIG_MOBILE_START,
  pos: { ...WHAT_RIG_MOBILE_START.pos },
  accentBeamPos: { ...WHAT_RIG_MOBILE_START.accentBeamPos },
  accentBeamTarget: { ...WHAT_RIG_MOBILE_START.accentBeamTarget },
};

export const whoDesktop: SectionRig = { start: WHO_RIG_START, end: WHO_RIG_END };
export const whoMobile: SectionRig = { start: WHO_RIG_MOBILE_START, end: WHO_RIG_MOBILE_END };
