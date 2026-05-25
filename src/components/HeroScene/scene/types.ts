// Shared types + constants for the hero scene's rig system.

export const SECTION_KEYS = ['hero', 'who', 'what', 'where', 'how', 'contact'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const MODEL_URL = '/models/hero.compressed.glb';
// World units along the largest bounding-box axis the loaded GLB is scaled to.
export const TARGET_SIZE = 3.5;
// Katana shown in How section instead of the mask. Slightly larger than the
// mask because the blade is long and thin — bounding-box-normalising to 4
// gives the visible blade a similar overall presence to the mask.
// export const SWORD_URL = '/models/cyberpunk_katana.glb';
export const SWORD_URL = '/models/thermal_katana.glb';
export const SWORD_TARGET_SIZE = 5;
// Default last-N portion of a section over which the rig blends to the next.
// Overridable per-section via SectionRig.transitionOut.
export const TRANSITION_ZONE = 0.4;

export interface Rig {
  pos: { x: number; y: number; z: number };
  scale: number;
  yawBias: number;
  pitchBias: number;
  exposure: number;
  fogDensity: number;
  alpha: number;
  accentBeamIntensity: number;
  accentBeamPos: { x: number; y: number; z: number };
  accentBeamTarget: { x: number; y: number; z: number };
  // Extra yaw applied to the accent beam, rotating its position around the
  // mask's vertical axis (i.e. orbiting the mask). 0 = no orbit. Used in What
  // to spin the beam opposite to the mask's yawBias spin.
  beamYawOffset: number;
  particleAlpha: number;
  // Cursor-driven rotation range on the mask (radians). 0 = mask doesn't react
  // to the cursor at all.
  pointerYaw: number;
  pointerPitch: number;
  // Cursor-driven translation of root (0 = no parallax sway). Hero/Who use 1,
  // later sections set to 0 once the cursor becomes an interaction tool
  // (Who quote reveal) rather than ambient parallax.
  parallaxStrength: number;
  // Fill-light intensities. Lowering these in What raises contrast so the
  // accent uplight reads as dramatic chiaroscuro instead of a flat wash.
  ambientIntensity: number;
  hemiIntensity: number;
  keyIntensity: number;
}

export interface SectionRig {
  start: Rig;
  // If omitted, end = start (steady within section).
  end?: Rig;
  // Fraction of section (0–1) over which the rig blends toward the NEXT
  // section's start. Defaults to TRANSITION_ZONE. Lower values keep this
  // section's pose until closer to the boundary (e.g. What → Where should
  // hold the small mask until you actually enter Where).
  transitionOut?: number;
  // Fraction of section (0–1) to hold rigStart before beginning the lerp to
  // rigEnd. Used in What to delay the mask rotation until ~the title divider
  // is reached. 0 = lerp begins immediately.
  holdStart?: number;
}
