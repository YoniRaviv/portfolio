# Mobile Mask Choreography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the persistent-mask choreography to mobile (≤720px) with a trimmed-parity rig set, auto-drift replacing cursor input, and matching perf tweaks.

**Architecture:** Parallel mobile rig constants selected at runtime via `matchMedia('(max-width: 720px)')`. A small mutable `state.isMobile` ref is consulted both in `computeTargetRig()` (rig set selection) and in the existing `animate()` loop (auto-drift override of `pointer.tx/ty`). Particle count and DPR gate on the same flag at init time only.

**Tech Stack:** TypeScript, Three.js (existing), Astro (existing). No new dependencies.

**Verification model:** This is 3D visual choreography with no unit-test surface. Each task uses dev-server + browser verification in place of TDD: apply edits → refresh DevTools at the relevant breakpoint → confirm against acceptance criteria → commit. The dev server should already be running; if not, `npm run dev` and open the printed URL.

**Reference spec:** `docs/superpowers/specs/2026-05-25-mobile-mask-choreography-design.md`

---

### Task 1: Remove the 50vh mobile canvas override

The existing mobile media query on `.stage` shrinks the canvas to a 50vh strip at the top — a pre-rig placeholder that fights every new mobile rig. Delete it so the canvas is full-viewport on every breakpoint.

**Files:**
- Modify: `src/components/HeroScene/index.astro`

- [ ] **Step 1: Edit `src/components/HeroScene/index.astro`** — delete the `@media (max-width: 720px)` block (lines ~32-37):

Remove this block entirely:
```css
@media (max-width: 720px) {
  /* Mobile: a more refined choreography lands in Step 8 of the plan.
     For now keep the canvas pinned to the upper half so hero content
     below remains readable, matching the prior mobile behaviour. */
  .stage { top: 0; right: 0; left: 0; bottom: auto; height: 50vh; min-height: 380px; }
}
```

- [ ] **Step 2: Verify in browser at 360×800 emulation**

Open DevTools, toggle device toolbar, set viewport to ~360×800. Refresh. Expected: canvas covers the full viewport behind the hero content (you should see the mask in roughly the upper-right with particles floating across the full page width — same visual as desktop at this point, just squeezed). The hero title may now overlap the mask awkwardly — that's fine, we fix it in Task 5 with the new Hero rig.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeroScene/index.astro
git commit -m "remove 50vh mobile canvas override — prep for mobile rig pass"
```

---

### Task 2: Add isMobile state and perf adjustments

Detect the breakpoint inside `init()` and use it to size the particle buffer and clamp DPR. No rig wiring yet — only the perf knobs flip.

**Files:**
- Modify: `src/components/HeroScene/HeroScene.ts`

- [ ] **Step 1: Replace the module-level `PARTICLES` constant with a function-local one**

In `src/components/HeroScene/HeroScene.ts`, find this near line 594:
```ts
  // Foreground particles
  const PARTICLES = 380;
```
That's already inside `init()`. Leave the `const PARTICLES = 380` line for now — we'll change it in Step 3.

- [ ] **Step 2: Add `state.isMobile` near the top of `init()`**

Find the line `export function init(mount: HTMLElement): HeroSceneHandle {` (line 479). Insert immediately after the opening brace, before `const scene = new THREE.Scene();`:

```ts
  const mql = matchMedia('(max-width: 720px)');
  const state = { isMobile: mql.matches };
```

- [ ] **Step 3: Update `PARTICLES` and `setPixelRatio` to gate on `state.isMobile`**

Change line 594:
```ts
  const PARTICLES = 380;
```
to:
```ts
  const PARTICLES = state.isMobile ? 180 : 380;
```

Change line 490:
```ts
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```
to:
```ts
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, state.isMobile ? 1.5 : 2));
```

- [ ] **Step 4: Verify in browser**

Refresh at desktop width — no visual change (same particle density). Refresh at 360×800 — particles are visibly sparser (roughly half the prior count), canvas pixel density is lower. Open Performance panel and confirm a brief scroll runs ≥50fps on mobile emulation. (Emulator perf isn't real-device but a regression here is a red flag.)

- [ ] **Step 5: Commit**

```bash
git add src/components/HeroScene/HeroScene.ts
git commit -m "add mobile breakpoint state + halve particles + clamp DPR on mobile"
```

---

### Task 3: Rename `SECTION_RIGS` to `SECTION_RIGS_DESKTOP`

Pure rename to make room for `SECTION_RIGS_MOBILE` in the next task. No behavior change.

**Files:**
- Modify: `src/components/HeroScene/HeroScene.ts`

- [ ] **Step 1: Rename the constant declaration**

Find line 378:
```ts
const SECTION_RIGS: Record<SectionKey, SectionRig> = {
```
Change to:
```ts
const SECTION_RIGS_DESKTOP: Record<SectionKey, SectionRig> = {
```

- [ ] **Step 2: Update both references**

In `resolveSectionRig` (line 471):
```ts
  const r = SECTION_RIGS[key];
```
Change to:
```ts
  const r = SECTION_RIGS_DESKTOP[key];
```

In `computeTargetRig` (line 672):
```ts
    const tz = SECTION_RIGS[SECTION_KEYS[i]].transitionOut ?? TRANSITION_ZONE;
```
Change to:
```ts
    const tz = SECTION_RIGS_DESKTOP[SECTION_KEYS[i]].transitionOut ?? TRANSITION_ZONE;
```

- [ ] **Step 3: Verify**

Refresh desktop browser — visuals identical to before. TypeScript should report no errors (if you have a TS checker running). The rename is the entire change.

- [ ] **Step 4: Commit**

```bash
git add src/components/HeroScene/HeroScene.ts
git commit -m "rename SECTION_RIGS to SECTION_RIGS_DESKTOP — prep for mobile map"
```

---

### Task 4: Add the mobile rig constants and `SECTION_RIGS_MOBILE` map

Add the 6 mobile rigs as module-level constants. Not wired up yet — no visual change.

**Files:**
- Modify: `src/components/HeroScene/HeroScene.ts`

- [ ] **Step 1: Insert the mobile rig constants immediately above `SECTION_RIGS_DESKTOP`**

Find the `SECTION_RIGS_DESKTOP` block (now around line 378 after the previous rename). Insert the following BEFORE it:

```ts
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
```

- [ ] **Step 2: Verify**

Refresh desktop browser — no visual change (mobile rigs are defined but unused). TypeScript should compile clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeroScene/HeroScene.ts
git commit -m "add mobile rig constants and SECTION_RIGS_MOBILE map"
```

---

### Task 5: Wire rig selection to `state.isMobile`

Move `resolveSectionRig` inside `init()` so it can close over `state`, and have both it and `computeTargetRig` pick the rig map at lookup time.

**Files:**
- Modify: `src/components/HeroScene/HeroScene.ts`

- [ ] **Step 1: Delete the module-level `resolveSectionRig`**

Find this block (around lines 470-477):
```ts
function resolveSectionRig(key: SectionKey, p: number): Rig {
  const r = SECTION_RIGS_DESKTOP[key];
  if (!r.end) return r.start;
  const hold = r.holdStart ?? 0;
  // Hold rigStart for the first `hold` fraction, then remap (hold..1) → (0..1).
  const adjustedP = hold > 0 && p < hold ? 0 : (p - hold) / Math.max(0.0001, 1 - hold);
  return lerpRig(r.start, r.end, Math.max(0, Math.min(1, adjustedP)));
}
```

Delete it entirely (we re-add it inside `init()` in the next step).

- [ ] **Step 2: Insert `resolveSectionRig` inside `init()`, just above `computeTargetRig`**

Find the line `function computeTargetRig(): Rig {` (was around line 641, may have shifted slightly). Insert this immediately ABOVE it:

```ts
  function resolveSectionRig(key: SectionKey, p: number): Rig {
    const rigs = state.isMobile ? SECTION_RIGS_MOBILE : SECTION_RIGS_DESKTOP;
    const r = rigs[key];
    if (!r.end) return r.start;
    const hold = r.holdStart ?? 0;
    // Hold rigStart for the first `hold` fraction, then remap (hold..1) → (0..1).
    const adjustedP = hold > 0 && p < hold ? 0 : (p - hold) / Math.max(0.0001, 1 - hold);
    return lerpRig(r.start, r.end, Math.max(0, Math.min(1, adjustedP)));
  }
```

- [ ] **Step 3: Update the `transitionOut` lookup in `computeTargetRig`**

Find this line inside `computeTargetRig` (currently around line 672):
```ts
    const tz = SECTION_RIGS_DESKTOP[SECTION_KEYS[i]].transitionOut ?? TRANSITION_ZONE;
```
Change to:
```ts
    const rigs = state.isMobile ? SECTION_RIGS_MOBILE : SECTION_RIGS_DESKTOP;
    const tz = rigs[SECTION_KEYS[i]].transitionOut ?? TRANSITION_ZONE;
```

- [ ] **Step 4: Verify on desktop**

Refresh at desktop width. Walk through full scroll: Hero → Who → What → Where → How → Contact. Every section should look IDENTICAL to before — desktop rig set hasn't changed.

- [ ] **Step 5: Verify on mobile emulator**

Set DevTools viewport to 360×800. Refresh and walk through:
- **Hero:** mask sits roughly centered behind the title with a noticeable bleed (mask larger than viewport allows, hair spikes extending past edges)
- **Who:** mask fades out — section text stands alone
- **What:** small centered mask appears, spins 360° as you scroll through, then fades out before Where
- **Where:** centered flash visible briefly during the What→Where transition, then nothing
- **How:** empty section, no mask
- **Contact:** mask reappears centered behind the lead text

Don't worry about title legibility yet (scrim tweak is in Task 8). The point of this step is confirming rig SELECTION works.

- [ ] **Step 6: Commit**

```bash
git add src/components/HeroScene/HeroScene.ts
git commit -m "wire rig selection to isMobile — mobile uses SECTION_RIGS_MOBILE"
```

---

### Task 6: Add matchMedia change listener

Live-swap rigs when the viewport crosses 720px (e.g. tablet rotation).

**Files:**
- Modify: `src/components/HeroScene/HeroScene.ts`

- [ ] **Step 1: Add the listener inside `init()`**

Find the lines added in Task 2:
```ts
  const mql = matchMedia('(max-width: 720px)');
  const state = { isMobile: mql.matches };
```

Add immediately after:
```ts
  const onBreakpointChange = (e: MediaQueryListEvent): void => {
    state.isMobile = e.matches;
  };
  mql.addEventListener('change', onBreakpointChange);
```

- [ ] **Step 2: Detach the listener in the `destroy` handle**

Find the `destroy()` block at the bottom of `init()` (around line 875):
```ts
  return {
    destroy(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      resizeObserver.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    },
  };
```
Change to:
```ts
  return {
    destroy(): void {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      mql.removeEventListener('change', onBreakpointChange);
      resizeObserver.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    },
  };
```

- [ ] **Step 3: Verify**

DevTools emulator: start at 360×800 (mobile rigs visible). Switch device to a tablet/desktop profile or drag viewport above 720px wide. Watch the mask smoothly transition (over ~10 frames via the rig lerp) from mobile pose to desktop pose. Cross back below 720px — smooth return. No errors in console.

- [ ] **Step 4: Commit**

```bash
git add src/components/HeroScene/HeroScene.ts
git commit -m "live-swap rigs on viewport breakpoint via matchMedia change"
```

---

### Task 7: Add auto-drift in `animate()`

Override `pointer.tx/ty` with sine-driven values on mobile so the mask gently sways without input.

**Files:**
- Modify: `src/components/HeroScene/HeroScene.ts`

- [ ] **Step 1: Insert the auto-drift block at the top of `animate()`**

Find the start of the `animate` function:
```ts
  function animate(): void {
    const dt = clock.getDelta();

    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
```

Insert between `const dt = clock.getDelta();` and the `pointer.x += ...` line:
```ts
    if (state.isMobile) {
      const t = clock.elapsedTime;
      pointer.tx = 0.35 * Math.sin(t * 0.4);
      pointer.ty = 0.22 * Math.sin(t * 0.31 + 1.5);
    }
```

- [ ] **Step 2: Verify on mobile emulator**

DevTools at 360×800. In Hero: the mask should gently sway — slow yaw and pitch oscillation, no input needed. The motion should feel like breathing, not a head shake. In Contact: same effect, slightly subtler. In What/Where/Who/How: no visible drift effect (those rigs have `pointerYaw: 0` and `pointerPitch: 0`).

If the drift feels too aggressive, lower the amplitudes (e.g., 0.25 / 0.15). If too subtle, raise to 0.45 / 0.28. Adjust and re-verify; commit the final values.

- [ ] **Step 3: Verify auto-drift doesn't affect desktop**

Switch DevTools to desktop width. Hover the page — cursor still drives the mask. Stop moving the cursor: mask holds steady (no auto-drift). The `state.isMobile` gate keeps desktop unaffected.

- [ ] **Step 4: Commit**

```bash
git add src/components/HeroScene/HeroScene.ts
git commit -m "auto-drift mask on mobile via sine-driven pointer.tx/ty override"
```

---

### Task 8: Tune Hero mobile scrim for title legibility

The Hero mobile scrim was tuned for an empty upper area (50vh canvas above). With the mask now bleeding behind the title, the title can lose contrast in the bright areas of the mask. Strengthen the scrim.

**Files:**
- Modify: `src/components/Hero.astro`

- [ ] **Step 1: Update the mobile scrim rule**

Find the mobile media block in `src/components/Hero.astro` (around line 140):
```css
@media (max-width: 720px) {
  .hero { min-height: auto; height: auto; padding-bottom: 60px; padding-top: 100px; }
  .hero .scrim { background: linear-gradient(to bottom, transparent 30%, rgba(21,21,21,.9) 95%); }
  /* ... rest of mobile rules unchanged ... */
```

Change the `.hero .scrim` line to:
```css
  .hero .scrim { background: linear-gradient(to bottom, rgba(21,21,21,.55) 0%, rgba(21,21,21,.2) 35%, rgba(21,21,21,.95) 95%); }
```

- [ ] **Step 2: Verify**

DevTools at 360×800. Hero title text should read cleanly against the mask — no spots where the title disappears into mask highlights. The mask should still bleed visibly behind the title (you can see hair spikes and silhouette edges). Bottom of section still dark.

If the scrim feels too heavy and kills the mask bleed, lower the top stop (`.55` → `.4`) and re-verify.

- [ ] **Step 3: Commit**

```bash
git add src/components/Hero.astro
git commit -m "strengthen hero mobile scrim for title legibility against bleed mask"
```

---

### Task 9: Add a scrim to Contact mobile for legibility

`.contact` has no explicit background — `.sec` (global.css) gives it `position: relative; z-index: 10;` so the canvas (z-index 6) already shows through. We just need a darkening scrim under the lead text so the mask bleed doesn't kill legibility.

**Files:**
- Modify: `src/components/Contact.astro`

- [ ] **Step 1: Extend the mobile media block**

Find the mobile block (line 81):
```css
@media (max-width: 720px) {
  .contact .lead { font-size: clamp(56px, 16vw, 96px); }
  .contact .mail { font-size: clamp(28px, 7vw, 44px); margin-top: 32px; }
  .contact .socials a .v { font-size: 32px; }
}
```

Change to:
```css
@media (max-width: 720px) {
  .contact::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, rgba(21,21,21,.55) 0%, rgba(21,21,21,.2) 35%, rgba(21,21,21,.95) 95%);
    z-index: -1;
    pointer-events: none;
  }
  .contact .lead { font-size: clamp(56px, 16vw, 96px); }
  .contact .mail { font-size: clamp(28px, 7vw, 44px); margin-top: 32px; }
  .contact .socials a .v { font-size: 32px; }
}
```

The `::before` sits inside `.contact`'s stacking context (z-index: 10 from `.sec`) at z-index -1, so it renders ABOVE the canvas but BELOW the section's content. `pointer-events: none` keeps the mail link and social card hovers working through it.

- [ ] **Step 2: Verify**

DevTools at 360×800. Scroll to Contact. Expected: mask reads behind the "Open to senior product opportunities" lead text with bleed; lead text remains legible; the email link and social grid below are readable against the darker bottom of the scrim. Visual rhymes with Hero — same bleed treatment.

If the scrim feels too heavy and kills the mask bleed, lower the top stop (`.55` → `.4`) and re-verify.

- [ ] **Step 3: Commit**

```bash
git add src/components/Contact.astro
git commit -m "contact: scrim under lead text on mobile to match hero bleed treatment"
```

---

### Task 10: Full mobile walkthrough verification

No code changes. Full-page verification on DevTools emulator and a real device.

**Files:** none

- [ ] **Step 1: DevTools walkthrough at 360×800**

Reload, scroll from top to bottom slowly. Check each section against the spec:
- Hero: large mask behind title, gentle auto-drift, particles sparse but visible, title legible
- Hero → Who: mask fades to 0 during transitionOut of Hero
- Who: empty (mask invisible), section text breathes
- Who → What: mask fades back in at small centered scale, ready to spin
- What: 360° centered spin as you scroll through, counter-orbit accent beam visible
- What → Where: mask sinks back along -Z with the bright flash flare
- Where: mostly dark, no visible mask, flash afterglow at top
- Where → How: invisible
- How: empty (mask invisible)
- How → Contact: mask fades in centered behind the lead text
- Contact: bleed-behind-text mirror of Hero, gentle auto-drift, slow live beam orbit on the lighting

Note any issues; fix and re-verify before committing.

- [ ] **Step 2: DevTools walkthrough at 414×896 (iPhone 11 Pro Max-ish)**

Same scroll. Larger phone — confirm mask scale still feels right and doesn't get too cramped or too dominant.

- [ ] **Step 3: Tablet portrait check at 768×1024**

Expected: this is ABOVE 720px breakpoint, so desktop choreography applies. Confirm desktop rigs render correctly at this aspect (mask in upper-right, etc.) — this validates the breakpoint cutoff.

- [ ] **Step 4: Tablet at 720×1024 (right at the boundary)**

Confirm at exactly 720px: mobile rigs are active (`max-width: 720px` includes 720). Drag to 721 — desktop rigs.

- [ ] **Step 5: Rotation test**

Start at 360×800 portrait. Rotate to 800×360 landscape. Confirm the mask smoothly transitions from mobile rig to desktop rig (no pop, no crash). Rotate back. Smooth return.

- [ ] **Step 6: Real-device check**

If you have an iPhone or Android phone available, open the dev server URL on the device (find your local IP, e.g. `http://192.168.1.x:4321`). Walk through the full scroll. Watch for:
- jank during scroll-driven transitions (target 60fps; 50+ acceptable on older devices)
- thermal: scroll back-and-forth aggressively for 30s, then feel the back of the device. Warm is fine; hot is a problem
- visual fidelity: does the mask read as well on a real screen as in the emulator?

If you don't have a phone available, skip this step and document it as deferred verification.

- [ ] **Step 7: Reduced-motion check**

In DevTools, open the Rendering panel, set "Emulate CSS media feature prefers-reduced-motion" to `reduce`. Refresh. Expected: the canvas never initializes (existing IntersectionObserver behavior gated by `matchMedia('(prefers-reduced-motion: reduce)')`). You should see the static fallback (no 3D mask, no particles).

- [ ] **Step 8: Final commit if any tuning was applied**

If steps 1-7 found tuning issues you fixed (rig values, scrim opacities, drift amplitudes), commit them now:
```bash
git add -A
git commit -m "mobile choreography: real-device tuning pass"
```

If no changes, no commit needed.

---

## Files Touched Summary

- `src/components/HeroScene/HeroScene.ts` — biggest change: 6 mobile rig constants, mobile rig map, breakpoint state + listener, rig selection in `resolveSectionRig` and `computeTargetRig`, auto-drift in `animate()`, particle count + DPR gating
- `src/components/HeroScene/index.astro` — remove the 50vh mobile override
- `src/components/Hero.astro` — strengthen mobile scrim
- `src/components/Contact.astro` — transparent bg + scrim on mobile

No new files. No new dependencies.
