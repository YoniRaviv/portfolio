import type { Rig, SectionRig } from '../types';

// Canvas is full-viewport. The mask sits in the right portion of the
// scene via stageGroup.position.x so the visible composition matches the
// original right-70% framing while particles span the full page width.
// At 16:9 a world-x of ~1.23 places the mask near viewport-65vw (the old
// canvas centre); pos.x of 0 places it at viewport-50vw.
export const HERO_RIG: Rig = {
  pos: { x: 1.23, y: 0.5, z: 0 },
  scale: 1,
  yawBias: 0,
  pitchBias: -0.5,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 9.0,
  accentBeamPos: { x: -3.5, y: -3, z: 2.5 },
  accentBeamTarget: { x: 1.5, y: 1.8, z: -0.5 },
  beamYawOffset: 0,
  particleAlpha: 0.8,
  pointerYaw: 0.6,
  pointerPitch: 0.4,
  parallaxStrength: 1,
  ambientIntensity: 0.8,
  hemiIntensity: 0.65,
  keyIntensity: 1.6,
};

// On mobile the camera aspect goes portrait (~0.5), shrinking the
// horizontal world-units in view to ~2.3 (vs ~7.4 on desktop 16:9). Every
// mobile pos.x is recentered toward 0 so the mask stays on-screen.
export const HERO_RIG_MOBILE: Rig = {
  pos: { x: 0, y: 0.8, z: 0 },
  scale: 0.6,
  yawBias: 0,
  pitchBias: -0.3,
  exposure: 1.2,
  fogDensity: 0,
  alpha: 1,
  accentBeamIntensity: 15,
  accentBeamPos: { x: -3.5, y: -3, z: 3.5 },
  accentBeamTarget: { x: 1.5, y: 1.8, z: -0.5 },
  beamYawOffset: 0,
  particleAlpha: 0.6,
  pointerYaw: 0.2,
  pointerPitch: -0.5,
  parallaxStrength: 0.3,
  ambientIntensity: 0.2,
  hemiIntensity: 0.45,
  keyIntensity: 1.6,
};
export const heroDesktop: SectionRig = { start: HERO_RIG };
export const heroMobile: SectionRig = { start: HERO_RIG_MOBILE };
