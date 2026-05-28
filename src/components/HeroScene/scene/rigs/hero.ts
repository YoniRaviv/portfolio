import type { Rig, SectionRig } from '../types';

// Where the mask centre should land in the viewport, in vw. The HUD
// container is `left:30%; right:0` (70vw wide) with internal margins of
// 18%/6%, so the HUD bracket centre sits at 30vw + ((18+94)/2)% × 70vw
// = 69.2vw — independent of aspect (it's all percentages). World units
// are NOT independent of aspect: a wider viewport fits more world units
// horizontally, so a single hardcoded `pos.x` in world units can only
// land the mask at the right vw on ONE screen aspect (this is why 1.23
// looked centred on a 1700-wide laptop but felt off on a 1900-wide one).
//
// HeroScene.ts resize() recomputes `HERO_RIG.pos.x` from this target vw
// and the live camera aspect on every layout — so the mask sits on the
// HUD bracket on every laptop. Tune the placement by editing this
// constant: lower = mask further LEFT in the viewport, higher = further
// RIGHT. 69.2 = exact bracket centre; 72 nudges it slightly right of
// centre.
export const HERO_MASK_TARGET_VW = 69.2;

// `pos.x` below is the fallback value used only before the first resize
// fires (effectively never — resize() runs synchronously at scene init,
// before currentRig is cloned). HeroScene.ts overwrites it from
// HERO_MASK_TARGET_VW each layout. Do not tune the desktop horizontal
// position by editing pos.x; edit HERO_MASK_TARGET_VW above.
export const HERO_RIG: Rig = {
  pos: { x: 1.55, y: 0.5, z: 0 },
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
