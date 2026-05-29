# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Astro dev server (HMR)
- `npm run build` — static production build to `dist/`
- `npm run preview` — serve the built site locally
- `npm run typecheck` — `astro check` (TS + `.astro` type checking; run this to validate, there is no separate test suite)

There is no linter, test runner, or CI config in the repo. `npm run typecheck` is the only verification gate.

## Stack & conventions

- **Astro 6**, static output (`output: 'static'`), TypeScript `strict` (extends `astro/tsconfigs/strict`).
- Import alias: **`@/*` → `./src/*`** (e.g. `import { who } from '@/content'`). Use it everywhere instead of relative paths.
- CSS is minified with **lightningcss**, images via **sharp**; `@astrojs/sitemap` generates the sitemap. `site` is `https://yonathan-raviv.dev`.
- The whole site is a **single page** (`src/pages/index.astro`) — there is no router. A blog is planned (see `TASKS.md`) but not built.

## Architecture

### Content / presentation split
All copy and structured data live in `src/content/*.ts` and are re-exported from `src/content/index.ts`; shared shapes are in `src/content/_types.ts`. Section components (`src/components/*.astro`) import their data from `@/content` and contain **only markup + scoped styles** — never hardcode copy in a component. To change text, projects, roles, skills, socials, or SEO, edit the content file, not the component.

### The HeroScene rig system (the core of this project)
A single persistent full-viewport Three.js canvas (`#stage`) travels through every section as the user scrolls — the same 3D "mask" model repositions, rescales, relights, and rotates per section, then swaps to a katana in `How` that descends and embeds in `Contact`.

- `src/components/HeroScene/index.astro` — mounts `#stage` and **lazy-loads** the scene: it only dynamic-imports `HeroScene.ts` when the stage scrolls into view, and **not at all** under `prefers-reduced-motion`. Three.js code-splits into its own chunk this way.
- `src/components/HeroScene/HeroScene.ts` — owns all Three.js setup (lights, GLB loading via tree-shaken `GLTFLoader` + `MeshoptDecoder`, particles) and the single per-frame `animate()` loop. It does **not** define poses.
- `src/components/HeroScene/scene/rigs/<section>.ts` — each section's poses as `SectionRig` (`start`, optional `end`, `transitionOut`, `holdStart`), with **separate desktop and mobile variants**. These files are heavily commented with the knobs to tune (lighting intensities, beam position, scale, pitch/yaw bias). Tune visuals here.
- `src/components/HeroScene/scene/rigs/index.ts` — assembles `SECTION_RIGS_DESKTOP` / `SECTION_RIGS_MOBILE` keyed by `SectionKey`.
- `src/components/HeroScene/scene/section-probe.ts` — reads scroll position, finds the active section, computes within-section progress (`start`→`end`) and the cross-section blend, and returns the **target** `Rig`.
- `src/components/HeroScene/scene/rig-math.ts` — `lerpRig` / `cloneRig`.
- `src/components/HeroScene/scene/types.ts` — `Rig` / `SectionRig` interfaces, model URLs, and `SECTION_KEYS`.

Each frame, `HeroScene.ts` lerps `currentRig` toward the probe's target rig (`RIG_LERP`) for smooth transitions, then applies position/scale to `stageGroup`, lighting/fog/exposure to the scene, and cursor-relative rotation to the mask. The sword swap, landing choreography, mobile ambient motion, and the Contact "anchor" (canvas stops following the viewport and scrolls with the page) all live in `animate()` and are driven by a scroll probe (`window.scrollY + innerHeight/2`) against section `offsetTop`s.

> **Critical coupling:** `SECTION_KEYS` in `types.ts`, the keys in `rigs/index.ts`, and the DOM `id`s on each `<section>` (and the order in `index.astro`) must all stay in sync — the probe does `document.getElementById(key)`. Adding/renaming/reordering a section means updating all of these plus adding desktop+mobile rig files.

### Client-side behavior
`src/layouts/Base.astro` wraps the page and mounts four vanilla-TS modules from `src/lib/` on every load:
- `smooth-scroll.ts` — Lenis smooth scrolling + anchor interception (no section snapping).
- `reveal.ts` — word-splitting, scramble-on-hover text, IntersectionObserver scroll reveals, and the Who-section cursor "spotlight" (`data-quote-reveal` exposes `--qx`/`--qy`).
- `cursor.ts` — custom dot + trailing ring cursor; the ring grows on hover targets and switches to a large "reveal" ring over `[data-cursor="reveal"]`. **Only active under `(hover: hover) and (pointer: fine)`** and disabled for reduced motion.
- `active-nav.ts` — scroll-spy highlighting the current section's nav link.

`prefers-reduced-motion` is respected throughout: the 3D scene never loads, cursor effects are off, and reveal animations snap straight to their visible state.

### Styles & assets
- `src/styles/tokens.css` — design tokens / CSS custom properties (e.g. `--accent`, read by `HeroScene.ts` to color lights). `fonts.css` and `global.css` hold the rest.
- 3D models live in `public/models/` (`hero.compressed.glb`, `cyberpunk_katana.glb`); referenced by the `*_URL` constants in `types.ts`.
