# Mobile Mask Choreography — Step 8 Spec

## Context

The persistent 3D mask choreography (steps 1–7) ships on desktop. The current mobile rule on `src/components/HeroScene/index.astro` is a placeholder that pins the canvas to a 50vh strip at the top — it pre-dates the rig system and breaks the persistent full-viewport composition.

This spec defines the mobile pass (viewport ≤ 720px). Tablet (721–1100px) gets the desktop choreography unchanged.

## Decisions

| Topic | Decision |
|---|---|
| Choreography scope | **Trimmed parity** — keep Hero, What spin, Where sink-flash, Contact landing. Who and How fade to alpha 0. |
| Cursor replacement | **Subtle auto-drift** — slow sine-wave-driven yaw/pitch on Hero and Contact only. No gyroscope, no touch-drag. |
| Hero composition | Mask **centered behind the title with bleed**, scrim keeps title readable. |
| Contact composition | Mask **centered behind the lead text with bleed**, mirrors Hero (visual bookend). Page anchor behavior retained so mask scrolls with text. |
| Perf | Halve particle count (380 → ~180) and clamp DPR to 1.5 on mobile. All lights retained. |
| Code shape | **Parallel mobile rigs** — second set of `*_RIG_MOBILE` constants, selected at init via `matchMedia('(max-width: 720px)')`. |

## Mobile rig set

All values are starting points; the implementation step is expected to fine-tune positions and scales against real-device rendering. Aspect-ratio reminder: at portrait ~0.5 aspect and camera FOV 42° at distance 6, the horizontal world-space extent visible is ~2.3 units (vs ~7.4 on a 16:9 desktop). Desktop `pos.x = 1.23` would push the mask off-screen on portrait — every mobile pos.x is recentered toward 0.

### `HERO_RIG_MOBILE` (single rig, no start/end)

- `pos: { x: 0, y: 1.2, z: 0 }` — center, vertically aligned with title block (padding-top 100px + ~half title height)
- `scale: 1.3` — slightly larger than desktop to read as a bleed behind the title
- `yawBias: 0`, `pitchBias: -0.3`
- `exposure: 0.85`, `fogDensity: 0.05` — quieter than desktop so title contrast holds
- `alpha: 1`
- `accentBeamIntensity: 9`, `accentBeamPos: { x: -2, y: -2, z: 2.5 }`, `accentBeamTarget: { x: 0, y: 1.2, z: 0 }`
- `particleAlpha: 0.4`
- `pointerYaw: 0.2`, `pointerPitch: 0.12`, `parallaxStrength: 0.3` — drives the auto-drift sway (drift values feed `pointer.x/y` — see auto-drift block below)
- Lights: ambient 0.8, hemi 0.65, key 1.6

### `WHO_RIG_MOBILE` — fade out

- `start`: same pose as `HERO_RIG_MOBILE` but `alpha: 0` and pointer values 0. The fade happens entirely during Hero's `transitionOut` zone, in-place.
- `end`: matches `WHAT_RIG_MOBILE_START` pose with `alpha: 0` so the cross-fade into What's spin reads as the mask appearing where it'll spin.

### `WHAT_RIG_MOBILE` — centered spin

- `start: { pos: { x: 0, y: 0.3, z: 0 }, scale: 0.6, yawBias: 0, pitchBias: 0.01, alpha: 1, ... }`
- `end`: identical except `yawBias: 2 * Math.PI` and `beamYawOffset: -2 * Math.PI` (preserves the desktop counter-orbit beam)
- `holdStart: 0.12`, `transitionOut: 0.15` — same as desktop
- `pointerYaw: 0`, `pointerPitch: 0`, `parallaxStrength: 0` — no drift during the spin

### `WHERE_RIG_MOBILE` — centered sink-flash

- `start: { pos: { x: 0, y: 0.3, z: -3 }, scale: 0.3, yawBias: 0, alpha: 0, exposure: 1.4, accentBeamIntensity: 45, accentBeamPos: { x: 0, y: 0, z: 4 }, accentBeamTarget: { x: 0, y: 0.3, z: -3 }, ... }` — sunk-center flash, same as desktop's `WHERE_RIG_START` but recentered to x=0.
- `end`: identical to `start` (no off-screen drift on mobile — How is faded out, so there's no slide-in to prepare for). Lighting decays back toward neutral so the cross-fade into How (alpha 0) doesn't keep flashing.
- `transitionOut: 0.2` — same as desktop, gives Where→How fade a half-section to play out.

### `HOW_RIG_MOBILE` — fade out

- `start`: matches `WHERE_RIG_MOBILE_END` pose with `alpha: 0`.
- `end`: matches `CONTACT_RIG_MOBILE` pose with `alpha: 0` so the fade-in to Contact's bleed pose reads in-place.

### `CONTACT_RIG_MOBILE` — centered behind lead with bleed

- `start: { pos: { x: 0, y: 0.5, z: 0 }, scale: 1.2, yawBias: 0, pitchBias: -0.2, alpha: 1, accentBeamIntensity: 12, accentBeamPos: { x: -3, y: 3, z: 3 }, accentBeamTarget: { x: 0, y: 0.5, z: 0 }, ambient/hemi/key: 0.7/0.55/1.3, ... }`
- `end`: identical pose; the live beam orbit block in `animate()` already drives the orbit on top of the rig, no rig motion needed (matches desktop pattern).
- `pointerYaw: 0.15`, `pointerPitch: 0.1`, `parallaxStrength: 0.3` — auto-drift sway, slightly subtler than Hero.

## Auto-drift implementation

Replace the cursor-driven `pointer.tx/ty` writes with a time-driven sine when on mobile. The existing per-frame `pointer.x/y` lerp keeps the motion smooth and the rest of the pipeline (parallax, cursor-relative rotation calc) needs no other changes.

```ts
const mql = matchMedia('(max-width: 720px)');
const state = { isMobile: mql.matches };
mql.addEventListener('change', (e) => { state.isMobile = e.matches; });

// In animate(), before the existing pointer.x/y lerp:
if (state.isMobile) {
  const t = clock.elapsedTime;
  pointer.tx = 0.35 * Math.sin(t * 0.4);
  pointer.ty = 0.22 * Math.sin(t * 0.31 + 1.5);
}
```

The `pointermove` listener stays attached so a hybrid device (iPad with mouse) still gets cursor reactivity at desktop widths. On mobile widths the listener's writes get overwritten each frame.

`pointer.tx/ty` ranges roughly mimic desktop cursor extremes (-1 to +1), so the rig's `pointerYaw/pointerPitch` multipliers behave the same as on desktop.

The same `state.isMobile` is read by `computeTargetRig()` to pick `SECTION_RIGS_MOBILE` vs `SECTION_RIGS_DESKTOP` each frame — so a rotation across the breakpoint swaps rigs immediately and the per-frame rig lerp smooths the pose transition over ~10 frames.

## Performance changes

```ts
// Same matchMedia call as above; reusing state.isMobile.
const PARTICLES = state.isMobile ? 180 : 380;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, state.isMobile ? 1.5 : 2));
```

`PARTICLES` is already a top-level constant used to size the buffer geometry; moving it inside `init()` and gating on `isMobile` is local. No other lights, materials, or render passes change.

## Rig set selection and breakpoint handling

`computeTargetRig()` reads `state.isMobile` (defined in the auto-drift block above) each frame and indexes into `SECTION_RIGS_MOBILE` or `SECTION_RIGS_DESKTOP` accordingly. The `matchMedia` change listener flips `state.isMobile` on viewport rotation, and the existing per-frame rig lerp smooths the pose transition over ~10 frames.

Particle count and DPR are init-time only — they are NOT live-swapped on breakpoint change. A rotation that crosses 720px keeps the original perf settings until next page load. Acceptable trade-off; live re-allocation of the particle buffer would add complexity for an uncommon path.

## CSS changes

`src/components/HeroScene/index.astro` — delete the `@media (max-width: 720px)` block that overrides `.stage` to a 50vh strip. The canvas stays full-viewport on every breakpoint now.

`src/components/Hero.astro` — strengthen the hero scrim on mobile so the title reads cleanly against the centered mask. Replace the current mobile scrim rule with a darker mid-band:
```css
.hero .scrim {
  background: linear-gradient(to bottom,
    rgba(21,21,21,.55) 0%,
    rgba(21,21,21,.2) 35%,
    rgba(21,21,21,.95) 95%);
}
```

`src/components/Contact.astro` — add a matching scrim under the contact section's mobile rule (currently the section has a solid `#0e0e0e` background; switch to transparent + a scrim gradient like Hero's so the mask reads through).

No other section CSS changes — Who and How fade the mask away, so the existing transparent backgrounds are fine.

## Files touched

- `src/components/HeroScene/HeroScene.ts` — add 6 `*_RIG_MOBILE` rig constants, `SECTION_RIGS_MOBILE` map, breakpoint detection at init, matchMedia change listener, auto-drift block in `animate()`, mobile-aware `PARTICLES` and `setPixelRatio`.
- `src/components/HeroScene/index.astro` — remove the 50vh mobile override.
- `src/components/Hero.astro` — tune mobile scrim for readability against bleed mask.
- `src/components/Contact.astro` — transparent background + scrim on mobile.

No new files. No new dependencies.

## Verification

After implementation:
1. DevTools device emulation at 360×800 (iPhone SE-ish) — full scroll, confirm: Hero mask reads through scrim, Who section text has no mask, What spin centered and visible, Where flash reads, How clean, Contact mirrors Hero.
2. Real device check on iPhone Safari and one mid-range Android (Chrome). 60fps target through scroll; check thermal after 30s of scrolling back and forth.
3. Rotate device portrait → landscape mid-scroll: rig set swaps without crash, mask repositions over ~10 frames.
4. `prefers-reduced-motion: reduce` still skips canvas init entirely (existing behavior).
5. Tablet at 768px width gets the desktop choreography (above breakpoint).
6. Hybrid device (iPad + mouse) at desktop width: cursor still drives the mask. Same device at portrait < 720: auto-drift takes over.

## Open tuning items (expected during implementation)

- Hero `pos.y` and `scale`: visual tuning against actual title rendering. Title height varies a lot between 360px and 720px wide.
- Contact `pos.y`: similar — depends on where the lead text actually lands after the section's top padding.
- Scrim opacity in Hero/Contact: dial against the mask brightness for legibility without killing the bleed effect.
- Auto-drift amplitudes (0.35 / 0.22 above): may need lowering if the motion reads as a head shake instead of breathing.
