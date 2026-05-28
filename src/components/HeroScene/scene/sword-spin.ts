// Sword yaw spin, as a PURE function of scroll position.
//
// The katana spins around its own (vertical) long axis as you scroll through
// How, then settles as it descends and embeds in Contact. The crucial property
// here — and the reason this lives in its own module instead of inline in
// animate() — is that the angle depends ONLY on scroll progress, never on time
// or a frame delta. That guarantees two things the previous time-based version
// got wrong:
//   1. A halted scroll FREEZES the blade. (The old code kept advancing the yaw
//      by `dt` during the landing, so the blade would spin on its own in the
//      background whenever the visitor stopped scrolling near the How→Contact
//      boundary.)
//   2. The embed always lands at the SAME orientation. (The old code's final
//      yaw was however far the time accumulation happened to drift, so the
//      planted sword's rotation was non-deterministic.)

// Rest yaw at How start (howProgress = 0).
export const SWORD_REST_ANGLE = 0;
// Turns across the How section. 1.5 → the blade does one and a half spins as
// the visitor scrolls How top→bottom.
export const SWORD_REVOLUTIONS = 1.5;

// Extra yaw layered on during the landing so the embedded blade settles at a
// clean rest orientation (a whole number of turns) rather than howProgress=1's
// half-turn, which would face the blade away from camera. We round the total
// turns UP to the next integer so the settle is always FORWARD — it adds spin,
// never unwinds. For SWORD_REVOLUTIONS = 1.5 this is exactly +π (rounding 1.5
// turns up to 2.0).
export const SWORD_LANDING_SETTLE =
  (Math.ceil(SWORD_REVOLUTIONS) - SWORD_REVOLUTIONS) * Math.PI * 2;

// The settle finishes EARLY — by this fraction of landingProgress — rather
// than at the embed. Together with the howProgress term (which saturates at
// the Contact boundary), this guarantees the spin is fully frozen before the
// blade is swung off-vertical into the planted pose. Spinning around the
// (vertical) Y axis while the blade is tilted diagonal reads as an off-axis
// roll/twist, so the spin must stop first. Keep this < the landingProgress at
// which howProgress hits 1 (always > 0.5 for a How section taller than half a
// viewport, which it always is).
export const SWORD_SPIN_SETTLE_BY = 0.5;

/**
 * Yaw (radians) of the sword about its long axis for a given scroll state.
 *
 * @param howProgress      0 at How's top, 1 at How's bottom (= Contact's top).
 * @param landingProgress  0 while still spinning in How, ramping to 1 once the
 *                         sword is fully embedded just past the Contact boundary.
 *
 * In How the yaw tracks `howProgress` linearly. The landing settle is layered
 * on via smoothstep that completes by SWORD_SPIN_SETTLE_BY, so the spin eases
 * to a stop EARLY in the descent (zero slope at the start keeps the How handoff
 * smooth; zero slope at the end keeps the stop gentle). The result is monotonic
 * in both inputs — the blade never visibly unwinds — and the final yaw is a
 * fixed whole number of turns.
 */
export function swordSpinAngle(howProgress: number, landingProgress: number): number {
  const u = Math.max(0, Math.min(1, landingProgress / SWORD_SPIN_SETTLE_BY));
  const settle = u * u * (3 - 2 * u); // smoothstep, complete by SWORD_SPIN_SETTLE_BY
  return (
    SWORD_REST_ANGLE +
    howProgress * Math.PI * 2 * SWORD_REVOLUTIONS +
    SWORD_LANDING_SETTLE * settle
  );
}
