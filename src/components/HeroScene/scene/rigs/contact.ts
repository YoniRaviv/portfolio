import type { Rig, SectionRig } from '../types';

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
// yawBias is 2π - 1.2 (a 68° CCW turn from forward toward -X). 2π keeps
// the lerp path from How_END (3π/2) clean — the mask rotates +π/2 CCW
// out of profile and stops a little before forward, gaze pointed at the
// email link instead of straight at camera.
export const CONTACT_RIG_START: Rig = {
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

// Identical to CONTACT_RIG_START. The mask doesn't change pose at all over
// Contact's scroll length — instead, animate() drives a live, time-based
// beam orbit inside Contact (see the "live lighting" block in animate()),
// so the lighting feels alive even when the visitor isn't scrolling.
// Keeping start ≡ end means the rig system contributes zero motion in
// Contact and the orbit is the only thing animating.
export const CONTACT_RIG_END: Rig = {
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

// Contact (mobile): mask sits behind the lead text + email line, with
// pos.y high enough that the mask's bottom doesn't extend below the email
// — anything that leaks below shows through the 12% bone grid background
// of the social cards. START and END are identical (no within-Contact
// scale/position animation); the only motion comes from the live beam
// orbit block in animate(). Pair with the overscroll cap in the anchor
// block so the mask stops following the scroll once the email line has
// carried up past its frozen viewport position.
export const CONTACT_RIG_MOBILE_START: Rig = {
  pos: { x: 0, y: 0.8, z: 0 },
  scale: 0.8,
  // Carry the 2π yaw through from What's spin (via Where/How rigs that
  // all spread from this chain) so the fade-in at Contact doesn't pop
  // back to 0 — same visual rotation as 0, but no reverse-spin lerp.
  yawBias: Math.PI * 2,
  pitchBias: -0.2,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 12,
  accentBeamPos: { x: -3, y: 3, z: 3 },
  accentBeamTarget: { x: 0, y: 0.3, z: 0 },
  beamYawOffset: 0,
  particleAlpha: 0.4,
  pointerYaw: 0.15,
  pointerPitch: 0.1,
  parallaxStrength: 0.3,
  ambientIntensity: 0.7,
  hemiIntensity: 0.55,
  keyIntensity: 1.3,
};

// CONTACT_END is intentionally identical to CONTACT_START — within Contact
// the rig contributes zero motion. The live beam orbit in animate() handles
// ambient lighting movement on top.
export const CONTACT_RIG_MOBILE_END: Rig = {
  ...CONTACT_RIG_MOBILE_START,
  pos: { ...CONTACT_RIG_MOBILE_START.pos },
  accentBeamPos: { ...CONTACT_RIG_MOBILE_START.accentBeamPos },
  accentBeamTarget: { ...CONTACT_RIG_MOBILE_START.accentBeamTarget },
};

// Contact runs a slow accent-beam sweep across its full scroll length
// (upper-left at the top of the section, lower-right at the bottom). The
// mask pose itself is identical in start/end — only lighting changes — so
// the visitor reads the same gaze while the illumination quietly walks
// around the head.
export const contactDesktop: SectionRig = {
  start: CONTACT_RIG_START,
  end: CONTACT_RIG_END,
};

export const contactMobile: SectionRig = {
  start: CONTACT_RIG_MOBILE_START,
  end: CONTACT_RIG_MOBILE_END,
};
