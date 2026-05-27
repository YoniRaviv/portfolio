# Contact Blade Spark Hover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a desktop visitor brushes the cursor along the embedded katana blade in the Contact section, throw motion-driven orange grinding sparks plus a hot-spot flare at the contact point.

**Architecture:** A new isolated `scene/sparks.ts` provides a recycled `THREE.Points` ember system (additive `ShaderMaterial`, gravity-arced physics). `HeroScene.ts` orchestrates: it captures the blade's world-space endpoints at GLB load, runs a per-frame screen-space point-to-segment proximity test against the cursor (overscroll-corrected), and emits sparks scaled by brush speed while driving a sword-layer flare `PointLight`. All gated to embedded-Contact, desktop, fine-pointer devices.

**Tech Stack:** Astro 6 (static), TypeScript strict, Three.js (tree-shaken). No test runner exists in this repo — `npm run typecheck` is the only static gate; behavior is verified with the Playwright MCP browser per the repo's "browser-verified" convention.

---

## Conventions for every task

- Import alias `@/*` is for `src/*`; inside `src/components/HeroScene/**` the existing code uses **relative** imports (e.g. `./scene/types`) — follow that.
- `verbatimModuleSyntax` is on: import types with `import type` (or inline `type` modifier). The spark module is imported for its value (`createSparkSystem`), so a normal `import` is correct.
- Three.js is imported as `import * as THREE from 'three';` (matches `HeroScene.ts`).
- Commit messages end with the repo's trailer:
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

## File structure

- **Create:** `src/components/HeroScene/scene/sparks.ts` — the ember particle system. One responsibility: own a recycled `THREE.Points` pool + its shader + `emit`/`update`/`dispose`. No DOM, no scene/camera knowledge beyond the `Points` it returns.
- **Modify:** `src/components/HeroScene/HeroScene.ts` — orchestration only: create the system + flare light, capture blade endpoints at load, extend the pointer handler, run the gate + proximity + emission in `animate()`, dispose on `destroy()`. Two small pure module-scope helpers (`projectBladePoint`, `pointSegDistance`) are added here.

No rig files, content files, or `.astro` components change.

---

### Task 1: Create the spark particle system (`scene/sparks.ts`)

**Files:**
- Create: `src/components/HeroScene/scene/sparks.ts`

- [ ] **Step 1: Write the module**

Create `src/components/HeroScene/scene/sparks.ts` with exactly this content:

```ts
// Grinding-spark ember system for the Contact blade hover. A fixed,
// recycled THREE.Points pool with an additive ShaderMaterial: embers shrink
// and cool (white-hot -> orange -> deep red) over a short life while gravity
// arcs them downward. Pure module — the caller adds `points` to the scene and
// drives emit()/update(). No DOM, no camera knowledge.

import * as THREE from 'three';

export interface SparkSystem {
  /** Add this to the scene once. */
  points: THREE.Points;
  /** Spawn `count` embers at `origin`, sprayed around the `dir` axis. */
  emit(origin: THREE.Vector3, dir: THREE.Vector3, count: number): void;
  /** Integrate physics; safe to call every frame even when not emitting. */
  update(dt: number): void;
  /** Free GPU resources. */
  dispose(): void;
}

export function createSparkSystem(opts: { isMobile: boolean }): SparkSystem {
  const MAX = opts.isMobile ? 120 : 300;

  // GPU attributes
  const positions = new Float32Array(MAX * 3);
  const lifeNorm = new Float32Array(MAX); // remaining life 0..1 (shader reads)
  const seeds = new Float32Array(MAX); // per-ember random for flicker

  // CPU-only state
  const velocities = new Float32Array(MAX * 3);
  const life = new Float32Array(MAX); // seconds remaining
  const maxLife = new Float32Array(MAX); // seconds total

  const posAttr = new THREE.BufferAttribute(positions, 3);
  const lifeAttr = new THREE.BufferAttribute(lifeNorm, 1);
  const seedAttr = new THREE.BufferAttribute(seeds, 1);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', posAttr);
  geo.setAttribute('aLife', lifeAttr);
  geo.setAttribute('aSeed', seedAttr);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uSize: { value: opts.isMobile ? 40 : 60 },
      uTime: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true, // let the opaque blade occlude embers flying behind it
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    vertexShader: /* glsl */ `
      attribute float aLife;
      attribute float aSeed;
      uniform float uSize;
      uniform float uTime;
      varying float vLife;
      void main() {
        vLife = aLife;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float flick = 0.7 + 0.3 * sin(uTime * 55.0 + aSeed * 6.2831);
        float sz = uSize * aLife * flick;
        gl_PointSize = sz * (1.0 / max(0.001, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vLife;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float soft = smoothstep(0.5, 0.0, d);
        vec3 hot = vec3(1.0, 0.95, 0.85);
        vec3 mid = vec3(1.0, 0.5, 0.12);
        vec3 cold = vec3(0.6, 0.06, 0.0);
        vec3 col = mix(cold, mix(mid, hot, smoothstep(0.5, 1.0, vLife)), vLife);
        float alpha = soft * vLife;
        gl_FragColor = vec4(col * (0.6 + 0.4 * vLife), alpha);
      }
    `,
  });

  const points = new THREE.Points(geo, material);
  // Positions start at the origin with life 0 (invisible); the pool's bounding
  // sphere never reflects live embers, so disable culling.
  points.frustumCulled = false;

  let writeHead = 0;
  const GRAVITY = 6.5; // scene units / s^2, pulls embers down into the arc
  const DRAG = 0.985; // per-frame velocity damping

  function emit(origin: THREE.Vector3, dir: THREE.Vector3, count: number): void {
    for (let n = 0; n < count; n++) {
      const i = writeHead;
      writeHead = (writeHead + 1) % MAX;

      positions[i * 3] = origin.x;
      positions[i * 3 + 1] = origin.y;
      positions[i * 3 + 2] = origin.z;

      // Tight cone around `dir`. speed = random^2 so most embers are slow and
      // a few are fast "streakers" — the signature grinding spread.
      const spread = 0.5;
      const speed = 1.2 + Math.random() * Math.random() * 4.5;
      velocities[i * 3] = (dir.x + (Math.random() - 0.5) * spread) * speed;
      velocities[i * 3 + 1] = (dir.y + (Math.random() - 0.5) * spread) * speed + 0.5;
      velocities[i * 3 + 2] = (dir.z + (Math.random() - 0.5) * spread) * speed;

      const ml = 0.3 + Math.random() * 0.4;
      maxLife[i] = ml;
      life[i] = ml;
      seeds[i] = Math.random();
      lifeNorm[i] = 1;
    }
    seedAttr.needsUpdate = true;
  }

  function update(dt: number): void {
    material.uniforms.uTime.value += dt;
    for (let i = 0; i < MAX; i++) {
      if (life[i] <= 0) {
        if (lifeNorm[i] !== 0) lifeNorm[i] = 0;
        continue;
      }
      life[i] -= dt;
      if (life[i] <= 0) {
        lifeNorm[i] = 0;
        continue;
      }
      velocities[i * 3] *= DRAG;
      velocities[i * 3 + 1] = velocities[i * 3 + 1] * DRAG - GRAVITY * dt;
      velocities[i * 3 + 2] *= DRAG;
      positions[i * 3] += velocities[i * 3] * dt;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
      lifeNorm[i] = life[i] / maxLife[i];
    }
    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
  }

  function dispose(): void {
    geo.dispose();
    material.dispose();
  }

  return { points, emit, update, dispose };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: `0 errors` (the new file compiles; it is not yet imported anywhere, which is fine).

- [ ] **Step 3: Commit**

```bash
git add src/components/HeroScene/scene/sparks.ts
git commit -m "feat(hero): add recycled spark ember particle system

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Mount the system + capture blade endpoints (no emission yet)

This wires the emitter into the scene and captures the blade geometry, but does
not emit. After this task the app looks identical — sparks exist but are never
spawned, so they stay invisible. This isolates the plumbing from the behavior.

**Files:**
- Modify: `src/components/HeroScene/HeroScene.ts`

- [ ] **Step 1: Import the spark factory**

In `src/components/HeroScene/HeroScene.ts`, add to the import block (after the
`createTargetRigComputer` import near the top):

```ts
import { createSparkSystem } from './scene/sparks';
```

- [ ] **Step 2: Declare blade-endpoint state**

Find the line that creates the sword pivot:

```ts
  const swordPivot = new THREE.Group();
  swordGroup.add(swordPivot);
```

Immediately after it, add:

```ts
  // Blade long-axis endpoints in swordPivot-local space, captured once the
  // sword GLB loads. animate() transforms these to world space each frame for
  // the Contact hover proximity test. null until the sword finishes loading.
  let bladeLocalA: THREE.Vector3 | null = null;
  let bladeLocalB: THREE.Vector3 | null = null;
```

- [ ] **Step 3: Capture endpoints in the sword loader**

In the sword `loader.load(SWORD_URL, (gltf) => { ... })` success callback, find:

```ts
      sword.position.sub(center).multiplyScalar(s);
      sword.scale.setScalar(s);
      sword.rotation.set(0, 0, 0);
```

Immediately after `sword.rotation.set(0, 0, 0);` add:

```ts
      // After centring + scaling (the sword has no local rotation of its own),
      // the geometry's longest box axis maps to +-half along that same axis
      // from the swordPivot origin. swordPivot.quaternion + parent transforms
      // then orient this into the blade's world pose. We restrict the active
      // hover range later (T_MAX) so sparks come off the cutting blade, not
      // the hilt end.
      {
        const dims = [size.x, size.y, size.z];
        const axisIndex =
          dims[0] >= dims[1] && dims[0] >= dims[2] ? 0 : dims[1] >= dims[2] ? 1 : 2;
        const half = (dims[axisIndex] * s) / 2;
        bladeLocalA = new THREE.Vector3();
        bladeLocalA.setComponent(axisIndex, half);
        bladeLocalB = new THREE.Vector3();
        bladeLocalB.setComponent(axisIndex, -half);
      }
```

(`size` and `s` are already defined just above in this callback.)

- [ ] **Step 4: Create the spark system**

Find the foreground particles block and its end:

```ts
  const particles = new THREE.Points(pGeo, particlesMat);
  scene.add(particles);
```

Immediately after `scene.add(particles);` add:

```ts
  // Contact blade-hover sparks (see scene/sparks.ts). Added to the scene now;
  // emission is driven from animate() only inside embedded Contact.
  const sparkSystem = createSparkSystem({ isMobile: state.isMobile });
  scene.add(sparkSystem.points);
```

- [ ] **Step 5: Drive the system every frame**

In `animate()`, find the final render line near the bottom:

```ts
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
```

Insert `sparkSystem.update(dt)` immediately before `renderer.render`:

```ts
    sparkSystem.update(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
```

- [ ] **Step 6: Dispose on teardown**

In the returned `destroy()` method, find:

```ts
      resizeObserver.disconnect();
      renderer.dispose();
```

Insert `sparkSystem.dispose();` between them:

```ts
      resizeObserver.disconnect();
      sparkSystem.dispose();
      renderer.dispose();
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: `0 errors`. (`bladeLocalA`/`bladeLocalB` are assigned but not yet read — allowed: this tsconfig does not enable `noUnusedLocals`.)

- [ ] **Step 8: Commit**

```bash
git add src/components/HeroScene/HeroScene.ts
git commit -m "feat(hero): mount spark system + capture blade endpoints

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Hover detection, motion-driven emission, and the flare

**Files:**
- Modify: `src/components/HeroScene/HeroScene.ts`

- [ ] **Step 1: Add the pure screen-space helpers (module scope)**

In `src/components/HeroScene/HeroScene.ts`, after the imports and before
`export interface HeroSceneHandle {`, add:

```ts
// Reused scratch for projecting blade endpoints — avoids per-frame allocation.
const projScratch = new THREE.Vector3();

// Project a world point to viewport pixels. The #stage canvas is fixed and
// full-viewport, so canvas pixels equal client pixels — except once the
// Contact anchor engages the canvas is CSS-translated up by `overscroll` px
// (--anchor-y), so the on-screen Y is the canvas Y minus that translation.
// This mirrors the overscrollNdc correction used for cursor rotation.
function projectBladePoint(
  v: THREE.Vector3,
  camera: THREE.Camera,
  width: number,
  height: number,
  overscroll: number
): { x: number; y: number } {
  const p = projScratch.copy(v).project(camera);
  return {
    x: (p.x * 0.5 + 0.5) * width,
    y: (-p.y * 0.5 + 0.5) * height - overscroll,
  };
}

// Closest point on segment AB to point P (all in screen px). Returns the
// clamped parameter t along AB and the distance from P to that point.
function pointSegDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): { t: number; dist: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return { t, dist: Math.hypot(px - cx, py - cy) };
}
```

- [ ] **Step 2: Track raw cursor pixels on the pointer**

Find the pointer state + handler:

```ts
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointer = (e: PointerEvent): void => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
```

Replace it with:

```ts
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: -1, py: -1 };
  const onPointer = (e: PointerEvent): void => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    pointer.px = e.clientX;
    pointer.py = e.clientY;
  };
```

- [ ] **Step 3: Add hover capability flag, scratch vectors, and the flare light**

Find (added in Task 2):

```ts
  const sparkSystem = createSparkSystem({ isMobile: state.isMobile });
  scene.add(sparkSystem.points);
```

Immediately after it, add:

```ts
  // Sparks are a hover affordance — only meaningful on devices with a real
  // pointer (matches cursor.ts). Touch/coarse devices and mobile skip it.
  const supportsHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Per-frame scratch + hover state (no allocation in animate()).
  const bladeWorldA = new THREE.Vector3();
  const bladeWorldB = new THREE.Vector3();
  const contactWorld = new THREE.Vector3();
  const sparkDir = new THREE.Vector3();
  let prevCursorX = -1;
  let prevCursorY = -1;
  let sparkActivity = 0; // smoothed 0..1, drives the flare intensity

  // Hot-spot flare at the contact point. Scoped to SWORD_LIGHT_LAYER so it
  // only lights the sword (consistent with every other sword light). Starts
  // dark; intensity rises with brush activity and decays when the cursor stops.
  const sparkFlare = new THREE.PointLight(ACCENT, 0, 4, 1.6);
  sparkFlare.layers.set(SWORD_LIGHT_LAYER);
  scene.add(sparkFlare);
```

- [ ] **Step 4: Add the detection + emission block in `animate()`**

In `animate()`, find the end of the sword animation block — the closing of the
`if (swordLoaded && swordGroup.visible) { ... } else { ... }` pair. It ends with:

```ts
      impactGlow.intensity = 0;
      swordOrbiter.intensity = 0;
      coolPulse.intensity = 0;
      swordStage.intensity = 0;
      swordFloor.intensity = 0;
    }
```

Immediately after that closing `}` (and before the `// Pointer parallax on root`
comment), insert:

```ts
    // ===== Contact: grinding sparks when the cursor brushes the blade =====
    // Project the blade segment to screen (overscroll-corrected), point-to-
    // segment test against the cursor, emit embers scaled by brush speed.
    // Motion-driven: a still cursor emits nothing. Gated to embedded Contact,
    // desktop, fine-pointer devices.
    let emittingNow = false;
    const sparkActive =
      swordLoaded &&
      !state.isMobile &&
      supportsHover &&
      swordGroup.visible &&
      landingProgress > 0.9 &&
      bladeLocalA !== null &&
      bladeLocalB !== null;
    if (sparkActive && bladeLocalA && bladeLocalB) {
      swordPivot.updateWorldMatrix(true, false);
      bladeWorldA.copy(bladeLocalA);
      swordPivot.localToWorld(bladeWorldA);
      bladeWorldB.copy(bladeLocalB);
      swordPivot.localToWorld(bladeWorldB);

      const w = mount.clientWidth;
      const h = mount.clientHeight;
      const a = projectBladePoint(bladeWorldA, camera, w, h, overscroll);
      const b = projectBladePoint(bladeWorldB, camera, w, h, overscroll);
      const seg = pointSegDistance(pointer.px, pointer.py, a.x, a.y, b.x, b.y);

      const BAND_PX = 28; // hover tolerance around the thin blade line
      const T_MAX = 0.78; // exclude the hilt end; sparks off the cutting blade
      const onBlade =
        pointer.px >= 0 && seg.dist < BAND_PX && seg.t >= 0 && seg.t <= T_MAX;

      if (onBlade) {
        contactWorld.lerpVectors(bladeWorldA, bladeWorldB, seg.t);
        sparkFlare.position.copy(contactWorld);

        const moveX = prevCursorX < 0 ? 0 : pointer.px - prevCursorX;
        const moveY = prevCursorY < 0 ? 0 : pointer.py - prevCursorY;
        const speed = Math.hypot(moveX, moveY); // px moved this frame
        if (speed > 0.5) {
          // Spray axis: follow the horizontal brush direction, bias up and
          // toward the camera (+Z). sparks.update()'s gravity arcs them down.
          const inv = 1 / speed;
          sparkDir.set(moveX * inv * 0.7, 0.6, 1.0).normalize();
          const K = 0.3; // sparks per px of brush speed
          const MAX_PER_FRAME = 12;
          const count = Math.min(MAX_PER_FRAME, Math.round(speed * K));
          if (count > 0) {
            sparkSystem.emit(contactWorld, sparkDir, count);
            emittingNow = true;
          }
        }
      }
    }
    // Flare follows brush activity: snaps up while emitting, eases out when idle.
    const FLARE_MAX = 18;
    sparkActivity += ((emittingNow ? 1 : 0) - sparkActivity) * (emittingNow ? 0.5 : 0.08);
    sparkFlare.intensity = sparkActivity * FLARE_MAX;
    prevCursorX = pointer.px;
    prevCursorY = pointer.py;
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: `0 errors`.

- [ ] **Step 6: Commit**

```bash
git add src/components/HeroScene/HeroScene.ts
git commit -m "feat(hero): motion-driven blade sparks + hot-spot flare in Contact

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Browser verification and tuning

No automated behavioral test exists for the WebGL scene; verify in-browser with
the Playwright MCP (the repo's established practice), then tune constants
against the live render.

**Files:**
- Modify (only if tuning is needed): `src/components/HeroScene/HeroScene.ts`,
  `src/components/HeroScene/scene/sparks.ts`

- [ ] **Step 1: Start the dev server**

Run (background): `npm run dev`
Note the URL from the output (Astro default is `http://localhost:4321`).

- [ ] **Step 2: Open a desktop viewport**

- `browser_resize` to `1440 x 900`.
- `browser_navigate` to the dev URL.
- Wait until the hero is ready: `browser_wait_for` /
  `browser_evaluate("document.documentElement.getAttribute('data-hero-loaded')")`
  returns `"true"`.

- [ ] **Step 3: Scroll the embedded sword into view**

`browser_evaluate` to land deep enough into Contact that the sword is embedded
(`landingProgress > 0.9`):

```js
() => {
  const c = document.getElementById('contact');
  window.scrollTo(0, c.offsetTop + 200);
  return c.offsetTop;
}
```

Wait ~1s for the rig lerp + Lenis to settle, then `browser_take_screenshot`.
Expected: the diagonal blade is visible; no sparks yet (cursor not on it).

- [ ] **Step 4: Brush the cursor along the blade and capture sparks**

Dispatch a sweep of `pointermove` events tracing the blade diagonal, then
screenshot immediately (embers live ~0.3–0.7s). The blade runs roughly
upper-right → lower-left; identify two on-blade points from the Step 3
screenshot (call them `x1,y1` near the hilt and `x2,y2` near the tip) and run:

```js
([x1, y1, x2, y2]) => {
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    window.dispatchEvent(new PointerEvent('pointermove', {
      clientX: x1 + (x2 - x1) * f,
      clientY: y1 + (y2 - y1) * f,
    }));
  }
}
```

Then `browser_take_screenshot` right away.
Expected: a fan of orange embers arcing down from where the cursor crosses the
blade, and a warm glow on the blade at the contact point.

- [ ] **Step 5: Confirm motion-driven behavior**

- Dispatch a single `pointermove` onto the blade, wait ~0.8s, screenshot.
  Expected: no live embers (still cursor → no emission; any prior embers have
  died). The flare should have decayed toward dark.
- Dispatch a `pointermove` well off the blade (e.g. far left of the viewport),
  brush there, screenshot. Expected: no sparks.

- [ ] **Step 6: Confirm no errors and correct gating**

- `browser_console_messages` — expected: no errors/warnings from the spark code.
- `browser_resize` to `390 x 844` (mobile), reload, scroll to Contact, brush the
  blade region. Expected: no sparks (mobile gate / no fine pointer); no errors.

- [ ] **Step 7: Tune (if needed) and commit**

If the hover band feels off, the spray direction looks wrong, or the hilt end
sparks, adjust the constants against the live render:
- `BAND_PX` — hover tolerance (HeroScene.ts).
- `T_MAX` — blade/hilt cutoff (HeroScene.ts). If sparks come off the *hilt*
  rather than the tip, the endpoints are reversed: change the active range to
  `seg.t >= 1 - T_MAX` instead of `seg.t <= T_MAX`.
- `K` / `MAX_PER_FRAME` — emission density (HeroScene.ts).
- `sparkDir` components / `GRAVITY` / `spread` / lifetimes / `uSize` — arc and
  look (HeroScene.ts + sparks.ts).
- `FLARE_MAX` / decay rates — flare strength (HeroScene.ts).

Re-run `npm run typecheck`, re-verify in browser, then:

```bash
git add src/components/HeroScene/HeroScene.ts src/components/HeroScene/scene/sparks.ts
git commit -m "fix(hero): tune blade spark hover (browser-verified)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Notes / risks

- **Overscroll correction** is the likeliest source of a misaligned hover band.
  Verify by scrolling *deep* into Contact (Step 3 scrolls past the anchor), not
  just at its top edge — at the top `overscroll` is 0 and a bug would hide.
- **Tip vs. hilt** orientation isn't known from the GLB without inspection; Step
  7 documents the one-line flip if the active range is reversed.
- **Straight-line approximation** of the slightly-curved katana is intentional
  and imperceptible for spark origin; the segment can later become a short
  polyline without changing any interface.
```
