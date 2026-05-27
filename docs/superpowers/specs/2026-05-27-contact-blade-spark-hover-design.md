# Contact Blade Spark Hover — Design Spec

**Date:** 2026-05-27
**Branch:** TBD (cut from `master`)
**Status:** Approved (design), pending implementation plan

## Goal

In the Contact section, the katana is embedded at its final landing pose (the
diagonal blade line). When a desktop visitor **brushes the cursor along the
blade**, it should throw a stream of orange grinding sparks — as if the blade
were being drawn across a sharpening stone — plus a warm hot-spot glow at the
point of contact.

## Decisions (from brainstorming)

- **Trigger:** motion-driven. Sparks emit only while the cursor *moves* along
  the blade; emission rate scales with brush speed; **zero emission when the
  cursor is still**. Like a real whetstone/grinder.
- **Look:** realistic grinding — a tight fan of small embers that arc downward
  under gravity, white-hot core cooling orange→red, fast flicker, short life.
- **Extra:** a blade hot-spot flare — a warm light at the contact point that
  rises with brush activity and decays when you stop.
- **Detection approach:** **A — screen-space blade-segment proximity**
  (chosen over raycasting and a 2D overlay; see Approaches below).
- **Budget:** ~300 sparks max on desktop; feature **disabled on mobile**.
- **Out of scope (YAGNI for v1):** sound, secondary "crackle"/pop bursts,
  any mobile/touch tap interaction.

## Architecture context (existing, to reuse)

- `src/components/HeroScene/HeroScene.ts` owns all Three.js setup and the
  single per-frame `animate()` loop. The sword lives in
  `swordGroup → swordPivot → sword(GLB)`; in Contact it is embedded at a fixed
  landing pose with `landingProgress → 1` and `swordGroup.visible === true`.
- A `window` `pointermove` handler (`onPointer`) already exists; it currently
  stores only normalized `-1..1` pointer coords (`pointer.tx/ty`).
- An existing foreground particle field (`THREE.Points` + `PointsMaterial`,
  `toneMapped:false`, additive-friendly) is the style reference for the new
  emitter.
- Sword-only lights use **render layer `SWORD_LIGHT_LAYER = 2`**; meshes opt in
  via `mesh.layers.enable(2)`. Every sword light is scoped to this layer so it
  never touches the mask, particles, or page backdrop.
- The `#stage` canvas is `position: fixed; pointer-events: none` — pointer
  events are captured at the `window`, and hover detection runs in screen space.
- Once the Contact anchor engages, the canvas is CSS-translated up by
  `overscroll` px via `--anchor-y`. `animate()` already computes `overscroll`
  and already corrects the cursor-rotation math for it
  (`overscrollNdc = 2 * overscroll / innerHeight`). The spark projection must
  apply the same correction.
- The scene **never loads** under `prefers-reduced-motion: reduce`
  (`HeroScene/index.astro`), so the feature inherits that gate for free.
- `cursor.ts` gates its effects on `(hover: hover) and (pointer: fine)`; the
  spark feature matches that gate.

## Approaches considered (detection)

- **A. Screen-space blade-segment proximity (chosen).** Project the blade's two
  world endpoints to screen each frame (overscroll-corrected) and do a
  point-to-segment distance test against the cursor. Cheap, robust for a thin
  diagonal blade, and yields the contact point + brush speed for free.
- **B. Raycasting the sword mesh.** Pixel-accurate with a true surface point,
  but more expensive and finicky on a thin blade (a strict hit feels bad; you'd
  add tolerance and converge back toward A).
- **C. 2D overlay sparks.** Simplest physics, but sparks wouldn't live in the 3D
  scene (no shared depth/occlusion by the blade) — reads as pasted-on.

## 1. Spark particle system — `scene/sparks.ts` (new, isolated)

A pure module (no DOM) exporting a factory:

```ts
createSparkSystem(opts: { isMobile: boolean }): {
  points: THREE.Points;                 // caller adds to scene
  emit(origin: THREE.Vector3, dir: THREE.Vector3, count: number): void;
  update(dt: number): void;
  dispose(): void;
}
```

- **Pool:** fixed pre-allocated capacity (`MAX_SPARKS ≈ 300` desktop; mobile
  smaller but feature is disabled there anyway). Buffers: `position`
  (Float32 attribute ×3), CPU-side `velocity` (×3), `life` + `maxLife` (×1).
  Dead particles (`life <= 0`) are reused on the next `emit` — **zero per-frame
  allocation**.
- **Material:** a small additive `ShaderMaterial` (`blending: AdditiveBlending`,
  `depthWrite: false`, `depthTest: true` so the opaque blade occludes sparks
  behind it, `transparent: true`, `toneMapped: false`).
  - Vertex: `gl_PointSize` scales with remaining life (embers shrink as they
    cool), with `sizeAttenuation`-style distance falloff.
  - Fragment: soft round point (radial alpha), color ramp by normalized age
    **white-hot `(1,1,0.9)` → orange `(1,0.5,0.1)` → deep red `(0.6,0.05,0)`**,
    alpha fades to 0 at end of life.
- **`emit(origin, dir, count)`:** spawn `count` sparks at `origin` with velocity
  = `dir` (the brush axis) jittered within a tight cone (half-angle ~20–30°),
  randomized speed — most short, a few fast "streakers." Assign randomized
  `maxLife` in ~0.3–0.7s.
- **`update(dt)`:** integrate position; apply **gravity** (`vel.y -= G*dt`, the
  signature parabolic arc) and light air-drag (`vel *= ~0.98`); decrement life;
  flag the position attribute `needsUpdate`. Always safe to call even when not
  emitting (lets in-flight sparks finish after the cursor leaves).

## 2. Blade endpoint capture (at GLB load)

In the existing sword `loader.load` success callback (where the bounding box is
already computed), capture the blade's **long axis** in the sword's local frame:
the longest box dimension gives the axis and half-length, yielding two local
endpoints `bladeLocalA`/`bladeLocalB`. Each frame these transform to world via
`sword.localToWorld(v.clone())`. Store a ref to the loaded `sword` object for
this. Tip-vs-hilt orientation and the active sub-range (e.g. restrict to the
cutting portion, `t ∈ [0, ~0.75]`, so sparks come off the blade not the hilt)
are tuning constants confirmed during browser verification.

## 3. Hover detection + emission (in `HeroScene.ts` `animate()`)

- Extend `onPointer` to also store **raw pixel** cursor coords
  (`pointer.px`, `pointer.py`) alongside the existing normalized values.
- Each frame, compute the gate (see §5). When active:
  1. Project `bladeWorldA`/`bladeWorldB` to screen pixels, subtracting the
     `overscroll` translation in Y (same correction as cursor rotation).
  2. Point-to-segment distance from `(pointer.px, pointer.py)` to the projected
     blade segment; `hovering = dist < BAND_PX` (~20–28px). Clamp to the active
     sub-range; the closest-point parameter `t` gives the contact point.
  3. **Contact origin (3D):** `lerp(bladeWorldA, bladeWorldB, t)`.
  4. **Brush speed:** screen-space cursor displacement since last frame while
     hovering. `count = clamp(round(brushSpeed * K), 0, MAX_PER_FRAME)`.
     Still cursor → `count === 0` → no sparks (motion-driven).
  5. **Brush direction:** perpendicular to the blade in screen space, pushed
     toward camera (+Z) and slightly up (pre-gravity), biased by the cursor's
     motion direction. Converted to a world-space `dir` for `emit`.
  6. `sparkSystem.emit(contactOrigin, dir, count)`.
- `sparkSystem.update(dt)` runs **every frame** regardless of gate, so sparks
  finish their arc after the cursor leaves the blade or scrolls out of Contact.

## 4. Blade hot-spot flare

A dedicated `THREE.PointLight` (warm/white-hot), `layers.set(SWORD_LIGHT_LAYER)`
so it only lights the sword (consistent with every other sword light). Each
frame: position at the contact 3D point; intensity tracks a smoothed "brush
activity" value that rises with emission and **decays with a time constant when
the cursor stops** — a friction glow that follows the stone's kiss-point and
fades out when idle. Muted to 0 when the feature gate is inactive.

## 5. Gating (all reuse existing signals)

The feature is active only when **all** hold:

1. **Embedded Contact:** `landingProgress > ~0.9` && `swordGroup.visible`.
2. **Fine-pointer/hover device:** `matchMedia('(hover: hover) and (pointer: fine)').matches`;
   additionally skip when `state.isMobile`.
3. **Reduced motion:** free — the scene never loads under
   `prefers-reduced-motion`.

When inactive: no emission, flare intensity → 0; `update(dt)` still runs to
drain in-flight sparks.

## 6. File / responsibility split

- **`src/components/HeroScene/scene/sparks.ts`** (new) — particle pool, physics,
  shader, `emit`/`update`/`dispose`. Pure, no DOM, no scene knowledge beyond the
  `THREE.Points` it returns.
- **`src/components/HeroScene/HeroScene.ts`** (orchestrator) — creates the spark
  system and the flare light; captures blade endpoints at load; extends
  `onPointer` with raw px; runs the gate + proximity + speed test and calls
  `emit`/`update`; calls `dispose()` in `destroy()`. This matches the file's
  existing "owns setup + per-frame loop; reusable pieces live in `scene/*`"
  pattern. No content/copy and no rig files change.

## 7. Verification

- `npm run typecheck` (the project's only static gate) passes clean.
- **Playwright browser verification in Contact:**
  - Scroll into Contact so the sword is embedded; drag the cursor along the
    blade → sparks emit, originate at the contact point, and arc downward;
    flare glow tracks the contact point.
  - Hold the cursor still on the blade → emission stops (motion-driven).
  - Move the cursor off the blade, and scroll out of Contact → no new sparks;
    in-flight sparks finish and fade.
  - Confirm desktop-gated (no errors / no emission path on mobile breakpoint).
  - Tune `BAND_PX`, emission constant `K`, cone angle, gravity, lifetimes, and
    the blade active sub-range against the live render.

## Risks / notes

- **Straight-line approximation** of a slightly-curved katana: imperceptible for
  spark origin along the visible blade; if needed, the segment can later be a
  2–3 point polyline at no change to the interface.
- **Overscroll correction** is the most error-prone bit — getting the blade's
  screen position wrong after the Contact anchor engages would offset the hover
  band. Mirror the existing `overscrollNdc` handling exactly and verify by
  scrolling deep into Contact, not just at its top edge.
