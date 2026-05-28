---
title: The HeroScene rig system, demystified
description: How a single Three.js stage travels through every section of this site, with the math, the rigging, and the bits I'd do differently next time.
date: 2026-05-28
---

The HeroScene on this site is one persistent canvas. Six sections, six rigs, zero re-mounts.
That sounds like a small engineering choice, but it ends up driving most of the visual
identity of the home page. This is what's actually going on under the hood.

## The single-canvas idea

A full-viewport `<canvas id="stage">` is mounted once, near the top of the document. A single
Three.js scene lives on it for the entire scroll. Each section of the page defines a *rig* —
a snapshot of how the world looks at that moment: camera, lighting, fog, exposure, model
transform, and any per-section motion (rotation bias, mouse parallax, ambient drift).

```ts
type Rig = {
  cameraZ: number;
  exposure: number;
  fog: { color: THREE.Color; near: number; far: number };
  stage: { position: THREE.Vector3; scale: number; rotation: THREE.Euler };
  lights: { keyIntensity: number; rimIntensity: number };
};
```

Each frame, a scroll probe answers two questions: which section is currently active, and
how far through it the user has scrolled. The active section's rig is the *target*; the
previous section's rig (or the next, near boundaries) is the *blend partner*. We lerp the
current rig toward the target with a constant factor — fast enough to feel responsive, slow
enough to smooth out scroll jitter.

```ts
function animate() {
  const target = probe(scrollY);
  lerpRig(currentRig, target, RIG_LERP);
  applyRig(currentRig);
  renderer.render(scene, camera);
}
```

## Why not separate canvases per section

The obvious alternative is one canvas per section, mounted/unmounted as you scroll. I tried
it. Two problems:

1. **Compile pauses.** Each new Three.js renderer compiles shaders on first use, which
   causes a visible stutter the first time each section enters the viewport. Pre-warming
   helps but doesn't eliminate it.
2. **No cross-section choreography.** I wanted the mask to *travel* between sections, not
   pop in and out. With separate canvases you can only fade — you can't move the same
   physical object from "tilted in the hero" to "centered in the next section" continuously.

A single persistent canvas gives both for free.

## Section coupling

There's one piece of this design that is genuinely fragile: the section-to-rig mapping
relies on three things staying in sync:

- `SECTION_KEYS` in `scene/types.ts`
- The keys in `scene/rigs/index.ts`
- The DOM `id`s on each `<section>`

The scroll probe does `document.getElementById(key)` and walks the list. If any of the three
drift apart, the scene quietly stops following the page. I've considered moving to a
data-attribute-driven discovery scheme but haven't — the explicit map is honestly easier to
debug when something goes wrong.

## The katana swap

The most fun bit is at the bottom of the page. In the `How` section the mask swaps to a
katana. The blade descends, embeds in the floor of the Contact section, and then the canvas
stops following the viewport entirely — it scrolls with the page like any normal element.

There's no clever scroll-binding library here. It's just:

```ts
if (activeSection === 'contact') {
  stageWrap.style.position = 'absolute';
  stageWrap.style.top = `${contactSection.offsetTop}px`;
}
```

…plus a one-time rig swap. The blade has its own particle system for sparks on hover, which
is wired into the same `animate()` loop.

## What I'd change

A few things if I rebuilt it tomorrow:

- **Mobile rigs are duplicated.** Each section has separate `mobile` and `desktop` rig
  files. Most of the differences are scale and camera distance; the rest is identical. I'd
  collapse this to a single rig file with a `getMobileOverrides()` per section.
- **The probe runs every scroll event.** It's cheap, but it could be RAF-throttled like the
  rest of the loop. Negligible perf gain, slightly cleaner.
- **No timeline view.** Tuning rigs requires editing numbers, saving, and watching. A small
  visual debugger that lets me scrub scroll position and live-edit each rig would have paid
  for itself by week two.

None of these are urgent. The current code is short, focused, and easy to walk into cold.
For a small portfolio that's the right trade.
