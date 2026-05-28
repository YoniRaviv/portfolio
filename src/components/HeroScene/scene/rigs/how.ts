import type { Rig, SectionRig } from '../types';
import { WHERE_RIG_MOBILE_END } from './where';

// How: the mask is hidden in this section (see HeroScene.ts swap logic);
// the katana takes its place. Rig drives stageGroup pose + the moving
// accent beam, which becomes a sweep light that catches glints off the
// spinning blade.
//
// Lighting is brighter than earlier mask sections so the new sword
// model — which has mostly dark/black materials on the hilt and tsuka —
// reads as a 3D object instead of a silhouette. The accent beam still
// dominates for the orange wash, but ambient/hemi/key are raised to
// fill in shadows on the dark hilt geometry.
export const HOW_RIG_START: Rig = {
  pos: { x: 0, y: -0.5, z: 0 },
  scale: 1,
  // 2π (not 0) so the held spin from What→Where doesn't unwind during
  // the WHERE→HOW transitionOut blend. Visually identical to 0; the
  // mask is hidden during the blend anyway (sword cross-fade has
  // completed by the time the rig starts morphing).
  yawBias: Math.PI * 2,
  pitchBias: 0,
  exposure: 0.7,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 20,
  accentBeamPos: { x: 3, y: 4, z: 5 },
  accentBeamTarget: { x: 0, y: 0, z: 0 },
  // -2π to match WHERE_END's beam orbit angle so the accent beam
  // doesn't visibly orbit backwards during the WHERE→HOW blend.
  beamYawOffset: -Math.PI * 2,
  particleAlpha: 0.5,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.1,
  hemiIntensity: 0.75,
  keyIntensity: 3.2,
};

export const HOW_RIG_END: Rig = {
  pos: { x: 0, y: -0.5, z: 0 },
  scale: 1,
  yawBias: 0,
  pitchBias: 0,
  exposure: 0.9,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 44,
  accentBeamPos: { x: 3, y: 4, z: 5 },
  accentBeamTarget: { x: 0, y: 0, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.5,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.1,
  hemiIntensity: 0.75,
  keyIntensity: 3.2,
};

// How (mobile): same sword setup as desktop, scaled down for the
// portrait viewport. Pose is centred; the beam sweep + spin do the
// motion.
export const HOW_RIG_MOBILE_START: Rig = {
  ...WHERE_RIG_MOBILE_END,
  pos: { x: 0, y: -0.2, z: 0 },
  scale: 0.75,
  // 2π (not 0) so the held spin from What→Where doesn't unwind across the
  // Where→How transition zone. Visually identical to 0 for the sword
  // (which uses its own swordGroup.rotation.y), but keeps the mask's
  // yawBias numerically continuous with WHERE_END through the lerp —
  // otherwise the few frames before the sword cross-fade hides the mask
  // would show it spinning backwards.
  yawBias: Math.PI * 2,
  pitchBias: 0,
  alpha: 1,
  exposure: 0.7,
  accentBeamIntensity: 26,
  accentBeamPos: { x: 2.5, y: 3.5, z: 4 },
  accentBeamTarget: { x: 0, y: 0, z: 0 },
  // Bright fill — the new sword model has dark hilt geometry that
  // disappears under low ambient/key. Combined with the per-material
  // emissive baked in at load (see HeroScene.ts sword loader), this
  // makes the geometry read clearly while the accent beam still
  // dominates for the orange blade wash.
  keyIntensity: 3.2,
  ambientIntensity: 0.1,
  hemiIntensity: 0.75,
};

export const HOW_RIG_MOBILE_END: Rig = {
  ...HOW_RIG_MOBILE_START,
  pos: { ...HOW_RIG_MOBILE_START.pos },
  accentBeamIntensity: 30,
  accentBeamPos: { x: 2.5, y: 3.5, z: 4 },
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
