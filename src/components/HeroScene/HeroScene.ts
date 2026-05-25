// Hero scene: loads a custom GLB model lazily and animates it in code.
// Now a persistent canvas that travels through every section via a Rig system.
// Tree-shaken Three.js + GLTFLoader + MeshoptDecoder. Exports init(mount) so
// the island can hydrate lazily and call us once the canvas mount exists.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export interface HeroSceneHandle {
  destroy: () => void;
}

const MODEL_URL = '/models/hero.compressed.glb';
const TARGET_SIZE = 3.5; // world units along the largest bounding-box axis
const TRANSITION_ZONE = 0.4; // default last-N portion of a section that blends to the next

const SECTION_KEYS = ['hero', 'who', 'what', 'where', 'how', 'contact'] as const;
type SectionKey = (typeof SECTION_KEYS)[number];

interface Rig {
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

interface SectionRig {
  start: Rig;
  end?: Rig; // if omitted, end = start (steady within section)
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

// Canvas is now full-viewport. The mask sits in the right portion of the
// scene via stageGroup.position.x so the visible composition matches the
// original right-70% framing while particles span the full page width.
// At 16:9 a world-x of ~1.23 places the mask near viewport-65vw (the old
// canvas centre); pos.x of 0 places it at viewport-50vw.
const HERO_RIG: Rig = {
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
const WHO_RIG_START: Rig = {
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

const WHO_RIG_END: Rig = {
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

// In What: small mask, centred, with a subtle downward gaze. Lit much like
// Hero (so it's properly visible, not a red silhouette) but with a slight
// uplight from below + a low-key accent beam orbiting opposite to the mask's
// 360° spin. Rotation starts at holdStart on the section so it kicks in after
// the title divider rolls past.
//
// Knobs to tinker with:
//   * accentBeamIntensity — push higher for more orange wash, lower for none
//   * accentBeamPos.y     — push more negative to exaggerate the uplight
//   * ambientIntensity    — overall fill; lower for darker / contrastier mask
//   * pitchBias           — positive = look down, negative = look up
const WHAT_RIG_START: Rig = {
  pos: { x: 0, y: 0.4, z: 0 },
  scale: 0.5,
  yawBias: 0,
  pitchBias: 0.01,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 10,
  accentBeamPos: { x: 2.2, y: -3, z: 1.5 },
  accentBeamTarget: { x: 0, y: 0.4, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

const WHAT_RIG_END: Rig = {
  pos: { x: 0, y: 0.4, z: 0 },
  scale: 0.5,
  yawBias: Math.PI * 2,
  pitchBias: 0.01,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 10,
  accentBeamPos: { x: 2.2, y: -3, z: 1.5 },
  accentBeamTarget: { x: 0, y: 0.4, z: 0 },
  beamYawOffset: -Math.PI * 2,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

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
const HOW_RIG_START: Rig = {
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

const HOW_RIG_END: Rig = {
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

// Contact: mask is anchored beside the title and gazes down-and-left
// toward the email link (the section's CTA). Cursor reactivity is off
// here — the offset mask + bbox-centred pivot + camera's downward look
// made corner cursor poses read as a head tilt no matter how we
// corrected. Instead, the only thing that moves over the scroll length
// of Contact is the accent beam: rigStart lights the mask from
// upper-left at the top of the section, rigEnd from lower-right at the
// bottom — a slow chiaroscuro sweep that gives the section life without
// asking the mask to follow the cursor.
//
// yawBias is 2π - 0.45 (a 26° CCW turn from forward toward -X). 2π keeps
// the lerp path from How_END (3π/2) clean — the mask rotates +π/2 CCW
// out of profile and stops a little before forward, gaze pointed at the
// email link instead of straight at camera.
const CONTACT_RIG_START: Rig = {
  pos: { x: 1.5, y: 0.2, z: 0 },
  scale: 0.9,
  yawBias: Math.PI * 2 - 1.2,
  pitchBias: -0.65,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 12,
  accentBeamPos: { x: -3, y: 3, z: 3 },
  accentBeamTarget: { x: 2, y: 0.3, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

// Identical to CONTACT_RIG_START. The mask doesn't change pose at all
// over Contact's scroll length — instead, animate() drives a live,
// time-based beam orbit inside Contact (see the "live lighting" block
// in animate()), so the lighting feels alive even when the visitor
// isn't scrolling. Keeping start ≡ end means the rig system contributes
// zero motion in Contact and the orbit is the only thing animating.
const CONTACT_RIG_END: Rig = {
  pos: { x: 1.5, y: 0.2, z: 0 },
  scale: 0.9,
  yawBias: Math.PI * 2 - 1.2,
  pitchBias: -0.65,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 12,
  accentBeamPos: { x: -3, y: 3, z: 3 },
  accentBeamTarget: { x: 2, y: 0.3, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

// Where, part 1: the SINK. As What scrolls into Where, the spinning
// centred mask sinks straight back along -Z, shrinking and fading out,
// while a bright front-lit accent beam flares up. The visitor sees the
// mask drop behind the background lit by a flash — no horizontal slide.
// alpha lands at 0 at Where p=0, so the rest of Where is dark and empty
// (the flash has nothing to illuminate by then, which is the point —
// the afterglow lingers via exposure/particle alpha before everything
// settles for the slide-in).
const WHERE_RIG_START: Rig = {
  pos: { x: 0, y: 0.4, z: -3 },
  scale: 0.4,
  // Stay axis-aligned with WHAT_END (yawBias 2π ≡ 0) so the sink reads
  // as a straight back-away motion, not a rotation.
  yawBias: 0,
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
const WHERE_RIG_END: Rig = {
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

// =============================================================================
// MOBILE RIGS (viewport ≤ 720px)
// =============================================================================
// Trimmed parity with desktop:
//   Hero          → centered behind title with bleed (large scale)
//   Who           → fade to alpha 0 (text gets its own breathing room)
//   What          → centered 360° spin (smaller scale, no off-axis pos)
//   Where         → centered sink-flash; end pose holds invisible
//   How           → fade to alpha 0
//   Contact       → centered behind lead text with bleed (bookends Hero)
//
// On mobile the camera aspect goes portrait (~0.5), shrinking the
// horizontal world-units in view to ~2.3 (vs ~7.4 on desktop 16:9).
// Every mobile pos.x is recentered toward 0 so the mask stays on-screen.

const HERO_RIG_MOBILE: Rig = {
  pos: { x: 0, y: 1.2, z: 0 },
  scale: 1.3,
  yawBias: 0,
  pitchBias: -0.3,
  exposure: 0.85,
  fogDensity: 0.05,
  alpha: 1,
  accentBeamIntensity: 9,
  accentBeamPos: { x: -2, y: -2, z: 2.5 },
  accentBeamTarget: { x: 0, y: 1.2, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0.2,
  pointerPitch: 0.12,
  parallaxStrength: 0.3,
  ambientIntensity: 0.8,
  hemiIntensity: 0.65,
  keyIntensity: 1.6,
};

// Who: fade out. Start matches HERO_MOBILE pose (fade-out is in-place),
// end matches WHAT_MOBILE_START pose (fade-in to What's spin reads as
// the mask appearing already on its mark).
const WHO_RIG_MOBILE_START: Rig = {
  ...HERO_RIG_MOBILE,
  pos: { ...HERO_RIG_MOBILE.pos },
  accentBeamPos: { ...HERO_RIG_MOBILE.accentBeamPos },
  accentBeamTarget: { ...HERO_RIG_MOBILE.accentBeamTarget },
  alpha: 0,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
};

const WHAT_RIG_MOBILE_START: Rig = {
  pos: { x: 0, y: 0.3, z: 0 },
  scale: 0.6,
  yawBias: 0,
  pitchBias: 0.01,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 10,
  accentBeamPos: { x: 2.2, y: -3, z: 1.5 },
  accentBeamTarget: { x: 0, y: 0.3, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

const WHAT_RIG_MOBILE_END: Rig = {
  ...WHAT_RIG_MOBILE_START,
  pos: { ...WHAT_RIG_MOBILE_START.pos },
  accentBeamPos: { ...WHAT_RIG_MOBILE_START.accentBeamPos },
  accentBeamTarget: { ...WHAT_RIG_MOBILE_START.accentBeamTarget },
  yawBias: Math.PI * 2,
  beamYawOffset: -Math.PI * 2,
};

const WHO_RIG_MOBILE_END: Rig = {
  ...WHAT_RIG_MOBILE_START,
  pos: { ...WHAT_RIG_MOBILE_START.pos },
  accentBeamPos: { ...WHAT_RIG_MOBILE_START.accentBeamPos },
  accentBeamTarget: { ...WHAT_RIG_MOBILE_START.accentBeamTarget },
  alpha: 0,
};

// Where: centered sink-flash. start = sunk-centre bright flash (same
// concept as desktop WHERE_START, but recentered). end is identical to
// start — on mobile there's no off-screen-right drift to prep for (How
// fades out), so the rig just holds the invisible sunk pose across the
// section.
const WHERE_RIG_MOBILE_START: Rig = {
  pos: { x: 0, y: 0.3, z: -3 },
  scale: 0.3,
  yawBias: 0,
  pitchBias: 0.01,
  exposure: 1.4,
  fogDensity: 0.04,
  alpha: 0,
  accentBeamIntensity: 45,
  accentBeamPos: { x: 0, y: 0, z: 4 },
  accentBeamTarget: { x: 0, y: 0.3, z: -3 },
  beamYawOffset: 0,
  particleAlpha: 0.5,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.2,
};

const WHERE_RIG_MOBILE_END: Rig = {
  ...WHERE_RIG_MOBILE_START,
  pos: { ...WHERE_RIG_MOBILE_START.pos },
  accentBeamPos: { ...WHERE_RIG_MOBILE_START.accentBeamPos },
  accentBeamTarget: { ...WHERE_RIG_MOBILE_START.accentBeamTarget },
  // Decay the flash back toward neutral so the cross-fade into How (alpha 0)
  // isn't lit by a static 45-intensity beam.
  exposure: 1,
  accentBeamIntensity: 12,
};

const CONTACT_RIG_MOBILE_START: Rig = {
  pos: { x: 0, y: 0.5, z: 0 },
  scale: 1.2,
  yawBias: 0,
  pitchBias: -0.2,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 12,
  accentBeamPos: { x: -3, y: 3, z: 3 },
  accentBeamTarget: { x: 0, y: 0.5, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0.15,
  pointerPitch: 0.1,
  parallaxStrength: 0.3,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

const CONTACT_RIG_MOBILE_END: Rig = {
  ...CONTACT_RIG_MOBILE_START,
  pos: { ...CONTACT_RIG_MOBILE_START.pos },
  accentBeamPos: { ...CONTACT_RIG_MOBILE_START.accentBeamPos },
  accentBeamTarget: { ...CONTACT_RIG_MOBILE_START.accentBeamTarget },
};

// How: fade out. Start matches WHERE_MOBILE_END (sunk centre, invisible)
// so the cross-fade from Where is in-place; end matches CONTACT_MOBILE_START
// pose with alpha 0 so the fade-in to Contact's bleed reads as the mask
// appearing exactly where it'll sit.
const HOW_RIG_MOBILE_START: Rig = {
  ...WHERE_RIG_MOBILE_END,
  pos: { ...WHERE_RIG_MOBILE_END.pos },
  accentBeamPos: { ...WHERE_RIG_MOBILE_END.accentBeamPos },
  accentBeamTarget: { ...WHERE_RIG_MOBILE_END.accentBeamTarget },
  alpha: 0,
};

const HOW_RIG_MOBILE_END: Rig = {
  ...CONTACT_RIG_MOBILE_START,
  pos: { ...CONTACT_RIG_MOBILE_START.pos },
  accentBeamPos: { ...CONTACT_RIG_MOBILE_START.accentBeamPos },
  accentBeamTarget: { ...CONTACT_RIG_MOBILE_START.accentBeamTarget },
  alpha: 0,
  pointerYaw: 0,
  pointerPitch: 0,
  parallaxStrength: 0,
};

const SECTION_RIGS_MOBILE: Record<SectionKey, SectionRig> = {
  hero: { start: HERO_RIG_MOBILE },
  who: { start: WHO_RIG_MOBILE_START, end: WHO_RIG_MOBILE_END },
  what: {
    start: WHAT_RIG_MOBILE_START,
    end: WHAT_RIG_MOBILE_END,
    transitionOut: 0.15,
    holdStart: 0.12,
  },
  where: {
    start: WHERE_RIG_MOBILE_START,
    end: WHERE_RIG_MOBILE_END,
    transitionOut: 0.2,
  },
  how: { start: HOW_RIG_MOBILE_START, end: HOW_RIG_MOBILE_END, transitionOut: 0.3 },
  contact: { start: CONTACT_RIG_MOBILE_START, end: CONTACT_RIG_MOBILE_END },
};

const SECTION_RIGS_DESKTOP: Record<SectionKey, SectionRig> = {
  hero: { start: HERO_RIG },
  who: { start: WHO_RIG_START, end: WHO_RIG_END },
  // What holds its small mask + uplight through the project list, then
  // hands off to Where via a longer (15%) transitionOut so the sink
  // animation is visible — the mask shrinks and slides back along -Z
  // while the accent beam flares up. holdStart delays the spin until ~
  // the title divider is past.
  what: {
    start: WHAT_RIG_START,
    end: WHAT_RIG_END,
    transitionOut: 0.15,
    holdStart: 0.12,
  },
  // Where: invisible-mask section. rigStart is the sunk-centre flash
  // pose, rigEnd is off-screen right ready to emerge. Both have alpha 0,
  // so the internal drift from centre to right is invisible — the user
  // only sees the sink (from What's transitionOut) at the top of Where
  // and the slide-in (from Where's transitionOut into How) at the
  // bottom. transitionOut: 0.2 gives the slide-in enough scroll length
  // to read as a deliberate emerge.
  where: { start: WHERE_RIG_START, end: WHERE_RIG_END, transitionOut: 0.2 },
  // How holds the profile still — only the light position lerps from top
  // (rigStart) to bottom (rigEnd) as you scroll. transitionOut: 0.3
  // gives the full Contact landing (90°-ish rotation out of profile,
  // scale-down from 1.2 → 0.8, slide from x=4 → x=2, position drop, and
  // light hand-off) a generous third of the How section to play out, so
  // the mask doesn't snap into its Contact pose at the boundary.
  how: { start: HOW_RIG_START, end: HOW_RIG_END, transitionOut: 0.3 },
  // Contact runs a slow accent-beam sweep across its full scroll length
  // (upper-left at the top of the section, lower-right at the bottom).
  // The mask pose itself is identical in start/end — only lighting
  // changes — so the visitor reads the same gaze while the
  // illumination quietly walks around the head.
  contact: { start: CONTACT_RIG_START, end: CONTACT_RIG_END },
};

function cloneRig(r: Rig): Rig {
  return {
    pos: { ...r.pos },
    scale: r.scale,
    yawBias: r.yawBias,
    pitchBias: r.pitchBias,
    exposure: r.exposure,
    fogDensity: r.fogDensity,
    alpha: r.alpha,
    accentBeamIntensity: r.accentBeamIntensity,
    accentBeamPos: { ...r.accentBeamPos },
    accentBeamTarget: { ...r.accentBeamTarget },
    beamYawOffset: r.beamYawOffset,
    particleAlpha: r.particleAlpha,
    pointerYaw: r.pointerYaw,
    pointerPitch: r.pointerPitch,
    parallaxStrength: r.parallaxStrength,
    ambientIntensity: r.ambientIntensity,
    hemiIntensity: r.hemiIntensity,
    keyIntensity: r.keyIntensity,
  };
}

function lerpRig(a: Rig, b: Rig, t: number): Rig {
  const m = (x: number, y: number): number => x + (y - x) * t;
  return {
    pos: { x: m(a.pos.x, b.pos.x), y: m(a.pos.y, b.pos.y), z: m(a.pos.z, b.pos.z) },
    scale: m(a.scale, b.scale),
    yawBias: m(a.yawBias, b.yawBias),
    pitchBias: m(a.pitchBias, b.pitchBias),
    exposure: m(a.exposure, b.exposure),
    fogDensity: m(a.fogDensity, b.fogDensity),
    alpha: m(a.alpha, b.alpha),
    accentBeamIntensity: m(a.accentBeamIntensity, b.accentBeamIntensity),
    accentBeamPos: {
      x: m(a.accentBeamPos.x, b.accentBeamPos.x),
      y: m(a.accentBeamPos.y, b.accentBeamPos.y),
      z: m(a.accentBeamPos.z, b.accentBeamPos.z),
    },
    accentBeamTarget: {
      x: m(a.accentBeamTarget.x, b.accentBeamTarget.x),
      y: m(a.accentBeamTarget.y, b.accentBeamTarget.y),
      z: m(a.accentBeamTarget.z, b.accentBeamTarget.z),
    },
    beamYawOffset: m(a.beamYawOffset, b.beamYawOffset),
    particleAlpha: m(a.particleAlpha, b.particleAlpha),
    pointerYaw: m(a.pointerYaw, b.pointerYaw),
    pointerPitch: m(a.pointerPitch, b.pointerPitch),
    parallaxStrength: m(a.parallaxStrength, b.parallaxStrength),
    ambientIntensity: m(a.ambientIntensity, b.ambientIntensity),
    hemiIntensity: m(a.hemiIntensity, b.hemiIntensity),
    keyIntensity: m(a.keyIntensity, b.keyIntensity),
  };
}

function resolveSectionRig(key: SectionKey, p: number): Rig {
  const r = SECTION_RIGS_DESKTOP[key];
  if (!r.end) return r.start;
  const hold = r.holdStart ?? 0;
  // Hold rigStart for the first `hold` fraction, then remap (hold..1) → (0..1).
  const adjustedP = hold > 0 && p < hold ? 0 : (p - hold) / Math.max(0.0001, 1 - hold);
  return lerpRig(r.start, r.end, Math.max(0, Math.min(1, adjustedP)));
}

export function init(mount: HTMLElement): HeroSceneHandle {
  const mql = matchMedia('(max-width: 720px)');
  const state = { isMobile: mql.matches };

  const scene = new THREE.Scene();
  scene.background = null;
  const fog = new THREE.FogExp2(0x0a0a0a, HERO_RIG.fogDensity);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 2.8, 6);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, state.isMobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = HERO_RIG.exposure;
  renderer.domElement.style.opacity = '0';
  renderer.domElement.style.transition = 'opacity 0.8s cubic-bezier(.2,.7,.2,1)';
  mount.appendChild(renderer.domElement);

  const accentHex = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent')
    .trim() || '#FF6F59';
  const ACCENT = new THREE.Color(accentHex);

  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xfff0e0, 0x1a0e10, 0.65);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 4);
  scene.add(key);
  const accentBeam = new THREE.SpotLight(ACCENT, HERO_RIG.accentBeamIntensity, 16, Math.PI / 4.5, 0.55, 1.2);
  accentBeam.position.set(HERO_RIG.accentBeamPos.x, HERO_RIG.accentBeamPos.y, HERO_RIG.accentBeamPos.z);
  accentBeam.target.position.set(
    HERO_RIG.accentBeamTarget.x,
    HERO_RIG.accentBeamTarget.y,
    HERO_RIG.accentBeamTarget.z
  );
  scene.add(accentBeam);
  scene.add(accentBeam.target);

  const accentFill = new THREE.PointLight(ACCENT, 1.6, 12, 1.2);
  accentFill.position.set(0, 0.5, 3);
  scene.add(accentFill);

  const cool = new THREE.PointLight(0x4dd2ff, 1.4, 14, 2);
  cool.position.set(2.5, 1.5, 2);
  scene.add(cool);

  const rim = new THREE.PointLight(ACCENT, 4, 12, 0.6);
  rim.position.set(0, 3.5, -2.5);
  scene.add(rim);

  // Scene graph: scene > stageGroup > root > modelGroup
  // - stageGroup holds rig-driven position/scale (per-section transforms)
  // - root holds pointer parallax (unchanged)
  // - modelGroup holds the loaded GLB mask + rotation
  const stageGroup = new THREE.Group();
  scene.add(stageGroup);

  const root = new THREE.Group();
  stageGroup.add(root);

  const modelGroup = new THREE.Group();
  // Use YXZ Euler order so yaw is applied first, then pitch around the mask's
  // *new* local right-axis. With the default XYZ, a non-zero yaw turns the
  // world X axis into the mask's forward/backward direction, and then any
  // pitchBias on rotation.x rolls the head like a clock face instead of
  // nodding it up/down. YXZ keeps pitch as a proper head-nod regardless of
  // how far the head is yawed.
  modelGroup.rotation.order = 'YXZ';
  root.add(modelGroup);

  // Load the GLB
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  let modelLoaded = false;
  loader.load(
    MODEL_URL,
    (gltf) => {
      const model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const maxAxis = Math.max(size.x, size.y, size.z) || 1;
      const s = TARGET_SIZE / maxAxis;
      model.position.sub(center).multiplyScalar(s);
      model.scale.setScalar(s);
      // Defensive: a GLB authored with a slight root rotation would read
      // as a permanent head tilt that no rig bias can cancel. We control
      // all rotation through modelGroup, so neutralise the scene root.
      model.rotation.set(0, 0, 0);

      modelGroup.add(model);
      modelLoaded = true;

      renderer.domElement.style.opacity = '1';
      mount.setAttribute('data-loaded', 'true');
      // Once the initial CSS fade-in completes, clear the transition so
      // per-frame rig-driven opacity writes are instant (no lag/smear).
      setTimeout(() => {
        renderer.domElement.style.transition = '';
      }, 900);
    },
    undefined,
    (err) => {
      console.error('Failed to load hero model', err);
      mount.setAttribute('data-load-error', 'true');
    }
  );

  // Foreground particles
  const PARTICLES = state.isMobile ? 180 : 380;
  const pPositions = new Float32Array(PARTICLES * 3);
  for (let i = 0; i < PARTICLES; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 14;
    pPositions[i * 3 + 1] = (Math.random() - 0.5) * 7;
    pPositions[i * 3 + 2] = Math.random() * 4 + 1.5;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pPositions, 3));
  const particlesMat = new THREE.PointsMaterial({
    color: ACCENT,
    size: 0.04,
    transparent: true,
    opacity: HERO_RIG.particleAlpha,
    sizeAttenuation: true,
    toneMapped: false,
  });
  const particles = new THREE.Points(pGeo, particlesMat);
  scene.add(particles);

  // resize handling
  function resize(): void {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);

  // pointer parallax
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent): void => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  // Section element refs (resolved lazily — they may not exist when this script
  // first runs on a fresh page; getElementById is cheap to call each frame and
  // returns null gracefully).
  function getSectionEls(): (HTMLElement | null)[] {
    return SECTION_KEYS.map((k) => document.getElementById(k));
  }

  function computeTargetRig(): Rig {
    const sections = getSectionEls();
    const probeY = window.scrollY + window.innerHeight * 0.5;

    // Find the section the probe falls into (last section whose top is <= probe).
    let i = 0;
    for (let j = sections.length - 1; j >= 0; j--) {
      const el = sections[j];
      if (el && probeY >= el.offsetTop) {
        i = j;
        break;
      }
    }
    const ni = Math.min(i + 1, sections.length - 1);
    const curEl = sections[i];
    const nextEl = sections[ni];
    if (!curEl) return HERO_RIG;

    const top = curEl.offsetTop;
    const bottom =
      ni === i || !nextEl ? top + curEl.clientHeight : nextEl.offsetTop;
    const rawP = (probeY - top) / Math.max(1, bottom - top);
    const p = Math.max(0, Math.min(1, rawP));

    // Within-section progress (drives rigStart → rigEnd if both defined).
    const rigA = resolveSectionRig(SECTION_KEYS[i], p);

    // Between-section blend: hold the current rig steady through most of the
    // section, then ease toward the next section's rig in its final portion.
    // Without this, even at the top of the page (probe = mid-hero) we'd be
    // 50% blended into Who, pulling the hero pose visibly off.
    const tz = SECTION_RIGS_DESKTOP[SECTION_KEYS[i]].transitionOut ?? TRANSITION_ZONE;
    const blendStart = 1 - tz;
    const rawBlend = p < blendStart ? 0 : (p - blendStart) / tz;
    const eased = rawBlend * rawBlend * (3 - 2 * rawBlend);

    const rigB = resolveSectionRig(SECTION_KEYS[ni], 0);
    return lerpRig(rigA, rigB, eased);
  }

  // Rig state — currentRig lerps toward target each frame for buttery transitions.
  let currentRig = cloneRig(HERO_RIG);
  const RIG_LERP = 0.12;

  // Reused scratch vector for projecting the mask's world position to NDC
  // each frame (used for cursor-relative rotation). Hoisted so we don't
  // allocate a Vector3 every animate() tick.
  const maskNdc = new THREE.Vector3();

  // animate
  const clock = new THREE.Clock();
  let raf = 0;
  function animate(): void {
    const dt = clock.getDelta();

    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;

    // Compute the Contact anchor's canvas translation BEFORE the rotation
    // block so cursor-relative tracking can correct for it (see the cursor
    // calc below). The actual CSS write happens at the bottom of animate().
    // Activation is offset past Contact's top by ANCHOR_DELAY so the mask
    // "lands" beside the title text rather than above it; once anchored,
    // the mask scrolls up as a unit with the page through the rest of
    // Contact.
    let overscroll = 0;
    const contactElForAnchor = document.getElementById('contact');
    if (contactElForAnchor) {
      const ANCHOR_DELAY = window.innerHeight * 0.5;
      const anchor = contactElForAnchor.offsetTop - window.innerHeight / 2 + ANCHOR_DELAY;
      overscroll = Math.max(0, window.scrollY - anchor);
    }

    // Drive target rig from scroll position and smoothly lerp current toward it.
    const target = computeTargetRig();
    currentRig = lerpRig(currentRig, target, RIG_LERP);

    // Apply rig position + scale (stageGroup).
    stageGroup.position.set(currentRig.pos.x, currentRig.pos.y, currentRig.pos.z);
    stageGroup.scale.setScalar(currentRig.scale);

    // Pointer parallax on root — gated by rig.parallaxStrength so we can fully
    // disable cursor sway in sections (What onwards) where it'd fight the
    // intentional rig animations / hover interactions.
    root.position.x = pointer.x * 0.12 * currentRig.parallaxStrength;
    root.position.y = -pointer.y * 0.08 * currentRig.parallaxStrength;

    if (modelLoaded) {
      // Cursor-driven rotation is computed relative to the mask's projected
      // screen position, not viewport centre. Without this, a mask parked
      // at the right edge (Hero, Contact) tracks the cursor as if the mask
      // were dead centre — so a cursor on the left of the screen barely
      // turns the head because pointer.x is only ~-0.3. Subtracting the
      // mask's NDC makes the rotation respond to actual angular offset
      // from the mask, so it reads as "looking at" the cursor.
      // NDC y is +1 at top, -1 at bottom; pointer.y is the opposite, so we
      // ADD maskNdc.y to invert it into pointer space.
      // Once the Contact anchor activates the canvas is CSS-translated up
      // by `overscroll` pixels — the camera still projects the mask to the
      // SAME canvas NDC, but the mask's *viewport* y is higher by that
      // many pixels. Without the overscrollNdc adjustment the cursor calc
      // would think the mask is still mid-canvas while it actually sits
      // near the top of the viewport, throwing pitch off by tens of
      // degrees once you've scrolled into Contact.
      maskNdc.set(currentRig.pos.x, currentRig.pos.y, currentRig.pos.z).project(camera);
      const overscrollNdc = 2 * overscroll / window.innerHeight;
      const cursorX = pointer.x - maskNdc.x;
      const cursorY = pointer.y + maskNdc.y + overscrollNdc;
      const yaw = cursorX * currentRig.pointerYaw + currentRig.yawBias;
      // Clamp pitch to a reasonable head-nod range. The model is centered on
      // its bounding-box midpoint (which sits *above* the face because the
      // hair spikes extend up), so a very negative pitch swings the face
      // back-and-down around that high pivot while the spikes swing
      // forward-and-up — the eye reads that as a head roll the Z
      // correction can't cancel. Capping pitch keeps the pose inside the
      // range where the pivot asymmetry is invisible. Top-left was the
      // only corner pushing past this limit because it's the only one
      // combining cursor-far-left (max negative yaw delta) with cursor-
      // near-top (max negative pitch delta).
      const PITCH_LIMIT_UP = -5.6;
      const PITCH_LIMIT_DOWN = 0.6;
      const pitch = Math.max(PITCH_LIMIT_UP, Math.min(PITCH_LIMIT_DOWN,
        cursorY * currentRig.pointerPitch + currentRig.pitchBias));
      modelGroup.rotation.y = yaw;
      modelGroup.rotation.x = pitch;
      // YXZ Euler with combined non-zero yaw + pitch makes the mask's up
      // vector pick up a world-X component, which the camera reads as
      // ~5–10° of apparent roll (head tilted to one side). Counter it
      // with a Z rotation that satisfies tan(roll) = sin(pitch)*tan(yaw),
      // keeping the up vector in the world YZ plane. Faded smoothly out
      // for non-forward yaws (cos ≤ 0.3) because the formula blows up
      // near profile poses (yaw ≈ ±π/2); without the fade, the correction
      // snaps on/off as the lerp into Contact crosses the gate threshold,
      // which reads as a visible flicker at the How→Contact boundary.
      const cosYaw = Math.cos(yaw);
      const FADE_LO = 0.3;
      const FADE_HI = 0.5;
      const correctionFactor = Math.max(0, Math.min(1, (cosYaw - FADE_LO) / (FADE_HI - FADE_LO)));
      modelGroup.rotation.z = correctionFactor > 0
        ? correctionFactor * Math.atan2(Math.sin(pitch) * Math.sin(yaw), Math.max(0.001, cosYaw))
        : 0;
    }

    // Lights, fog, exposure from rig.
    renderer.toneMappingExposure = currentRig.exposure;
    fog.density = currentRig.fogDensity;
    ambient.intensity = currentRig.ambientIntensity;
    hemi.intensity = currentRig.hemiIntensity;
    key.intensity = currentRig.keyIntensity;
    accentBeam.intensity = currentRig.accentBeamIntensity;
    // Beam position = mask centre + (beam-offset rotated by beamYawOffset
    // around the mask's vertical axis). beamYawOffset = 0 leaves the beam
    // exactly at accentBeamPos; setting it to a non-zero angle orbits the
    // beam around the mask while keeping radius constant.
    {
      const dx = currentRig.accentBeamPos.x - currentRig.pos.x;
      const dz = currentRig.accentBeamPos.z - currentRig.pos.z;
      const cy = Math.cos(currentRig.beamYawOffset);
      const sy = Math.sin(currentRig.beamYawOffset);
      const rx = dx * cy - dz * sy;
      const rz = dx * sy + dz * cy;
      accentBeam.position.set(
        currentRig.pos.x + rx,
        currentRig.accentBeamPos.y,
        currentRig.pos.z + rz
      );
    }
    accentBeam.target.position.set(
      currentRig.accentBeamTarget.x,
      currentRig.accentBeamTarget.y,
      currentRig.accentBeamTarget.z
    );

    // Live (time-based) beam orbit in Contact. The rig contributes a static
    // beam position inside Contact (start ≡ end), and this block overlays a
    // continuous slow orbit on top so the lighting feels alive even when
    // the visitor isn't scrolling. liveLightFactor smoothly ramps from 0
    // (outside Contact / through the How→Contact lerp) to 1 (well inside
    // Contact), blending from rig position to orbit so there's no pop at
    // the boundary. Multiple sinusoidal axes at different periods keep the
    // motion from feeling like a clean circle — the visitor reads it as
    // chiaroscuro shifting around the mask.
    let liveLightFactor = 0;
    if (contactElForAnchor) {
      const probe = window.scrollY + window.innerHeight / 2;
      const fadeStart = contactElForAnchor.offsetTop;
      const fadeEnd = contactElForAnchor.offsetTop + window.innerHeight * 0.4;
      const raw = Math.max(0, Math.min(1, (probe - fadeStart) / (fadeEnd - fadeStart)));
      liveLightFactor = raw * raw * (3 - 2 * raw); // smoothstep
    }
    if (liveLightFactor > 0) {
      const t = clock.elapsedTime;
      const orbitX = currentRig.pos.x + 4.5 * Math.cos(t * 0.35);
      const orbitY = currentRig.pos.y + 2.5 + 2.5 * Math.sin(t * 0.27);
      const orbitZ = currentRig.pos.z + 3 + 1.2 * Math.sin(t * 0.22);
      accentBeam.position.x = accentBeam.position.x * (1 - liveLightFactor) + orbitX * liveLightFactor;
      accentBeam.position.y = accentBeam.position.y * (1 - liveLightFactor) + orbitY * liveLightFactor;
      accentBeam.position.z = accentBeam.position.z * (1 - liveLightFactor) + orbitZ * liveLightFactor;
      // Subtle intensity pulse with a third period so the brightness shifts
      // independently of the orbit position.
      const liveIntensity = 14 + 4 * Math.sin(t * 0.31);
      accentBeam.intensity = accentBeam.intensity * (1 - liveLightFactor) + liveIntensity * liveLightFactor;
    }

    accentBeam.target.updateMatrixWorld();
    particlesMat.opacity = currentRig.particleAlpha;

    // Particles tick.
    const ppos = pGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < PARTICLES; i++) {
      ppos[i * 3 + 1] += dt * 0.12 * (((i * 17) % 5) * 0.2 + 0.3);
      if (ppos[i * 3 + 1] > 5) ppos[i * 3 + 1] = -5;
    }
    pGeo.attributes.position.needsUpdate = true;

    // Canvas opacity from rig (only after model has loaded so the initial
    // fade-in isn't clobbered).
    if (modelLoaded) {
      renderer.domElement.style.opacity = String(currentRig.alpha);
    }

    // Apply the Contact anchor translation (overscroll was already computed
    // at the top of animate() so the rotation block could correct for it).
    // Drives a CSS variable rather than inline transform — the stage
    // element's entry animation uses `both` fill, which would otherwise
    // hold `transform: none` over our inline write. See index.astro
    // keyframes.
    mount.style.setProperty('--anchor-y', `${-overscroll}px`);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }
  raf = requestAnimationFrame(animate);

  return {
    destroy(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      resizeObserver.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    },
  };
}
