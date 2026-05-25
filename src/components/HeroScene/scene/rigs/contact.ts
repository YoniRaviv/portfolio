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

// Contact (mobile): the mask is anchored *behind the email line*, not above
// it — pos.y drops to 0.5 (was 0.8) so the silhouette is centred on the
// email's vertical band once the anchor freeze engages. The mask gazes
// toward the email by combining a small +yaw (face turns to screen-left
// toward where the email text begins) with a more pronounced -pitch
// (eyes drop down toward the email line). accentBeamTarget aims at the
// email anchor so the warm wash lands on the type, not the forehead.
// START and END are identical — the only within-Contact motion comes
// from the live beam orbit block in animate().
export const CONTACT_RIG_MOBILE_START: Rig = {
  pos: { x: 0, y: 0.5, z: 0 },
  scale: 0.85,
  // 2π carries through from What's spin (Where/How chain) so the fade-in
  // doesn't pop. +0.18 layers a small CCW yaw on top so the gaze drifts
  // toward screen-left where the email begins.
  yawBias: Math.PI * 2 + 0.18,
  // -0.45 sinks the gaze toward the email line below the mask centre.
  pitchBias: -0.45,
  exposure: 1,
  fogDensity: 0.04,
  alpha: 1,
  accentBeamIntensity: 12,
  accentBeamPos: { x: -3, y: 3, z: 3 },
  // Aim at the email anchor (down + left of mask centre).
  accentBeamTarget: { x: -0.5, y: -0.2, z: 0 },
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
