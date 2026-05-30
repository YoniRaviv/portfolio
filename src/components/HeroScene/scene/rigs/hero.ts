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
// Cinematic chiaroscuro: fills are pulled WAY down (ambient 0.18 / hemi 0.22
// / key 0.55) and the accent uplight is pushed correspondingly UP (22) so the
// mask reads as a poster — one warm beam raking across the face from
// below-left, deep shadow on the camera-right side. Exposure +15% so the
// bright lit side still pops on dark monitors, fog density bumped to 0.06 so
// the body of the mask sits in air rather than against a flat black void.
// pitchBias eased from -0.5 to -0.35 so the head reads as "facing" the viewer
// instead of looking past them.
//
// To dial drama up: raise accentBeamIntensity (24–28), drop ambient further
// (0.10), bump fogDensity (0.08). To soften: raise ambient/hemi back up.
// Always-on global fills (accentFill / cool / rim in HeroScene.ts) still
// contribute a baseline so the dark side never goes pure black.
export const HERO_RIG: Rig = {
  pos: { x: 1.55, y: 0.5, z: 0 },
  scale: 1,
  yawBias: 0,
  pitchBias: -0.5,
  exposure: 1.15,
  fogDensity: 0.06,
  alpha: 1,
  accentBeamIntensity: 28,
  accentBeamPos: { x: -3.5, y: -3, z: 2.5 },
  accentBeamTarget: { x: 1.5, y: 1.8, z: -0.5 },
  beamYawOffset: 0,
  particleAlpha: 0.8,
  pointerYaw: 0.6,
  pointerPitch: 0.4,
  parallaxStrength: 1,
  ambientIntensity: 0.9,
  hemiIntensity: 0.22,
  keyIntensity: 0.55,
};

// On mobile the camera aspect goes portrait (~0.5), shrinking the
// horizontal world-units in view to ~2.3 (vs ~7.4 on desktop 16:9). Every
// mobile pos.x is recentered toward 0 so the mask stays on-screen.
// Lighting (ambient/hemi/key/accent/exposure/fog, beam pos+target, particle
// alpha) mirrors HERO_RIG exactly so the mask reads identically on phone
// and desktop. Mobile-only retained knobs: pos (centred), scale (0.6,
// fits the portrait viewport), pitchBias (-0.30 vs desktop -0.5 — the
// mobile camera lands the -0.5 intent at a different apparent tilt, so
// the gentler value preserves the desktop look), and the
// pointer/parallax block (touch viewers don't drive a cursor, so the
// values are reduced to keep ambient device-tilt sway subtle).
export const HERO_RIG_MOBILE: Rig = {
  pos: { x: 0, y: 0.8, z: 0 },
  scale: 0.6,
  yawBias: 0,
  pitchBias: -0.30,
  exposure: 1.15,
  fogDensity: 0.06,
  alpha: 1,
  accentBeamIntensity: 28,
  accentBeamPos: { x: -3.5, y: -3, z: 2.5 },
  accentBeamTarget: { x: 1.5, y: 1.8, z: -0.5 },
  beamYawOffset: 0,
  particleAlpha: 0.8,
  pointerYaw: 0.2,
  pointerPitch: -0.5,
  parallaxStrength: 0.3,
  ambientIntensity: 0.9,
  hemiIntensity: 0.22,
  keyIntensity: 0.55,
};
export const heroDesktop: SectionRig = { start: HERO_RIG };
export const heroMobile: SectionRig = { start: HERO_RIG_MOBILE };
