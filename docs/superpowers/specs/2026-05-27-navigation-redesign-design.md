# Navigation Redesign — Design Spec

**Date:** 2026-05-27
**Branch:** `feature/navigation`
**Status:** Approved (design), pending implementation plan

## Goal

Revisit the site navigation on desktop and mobile.

- **Desktop** already works and is liked — *evolve* the existing fixed top bar with restrained cyberpunk/HUD detailing rather than reinventing it.
- **Mobile** currently has no real menu: links are crammed into the top bar at tiny font sizes, the logo text is hidden, and below 420px the "Where" link is *hidden entirely*. Replace this with a cooler, more cyberpunk full-screen "terminal" menu that also improves UX.

## Decisions (from brainstorming)

- Desktop direction: **D1 · Refined** (evolve top bar; restrained, not full HUD).
- Mobile direction: **A · Terminal Boot** (full-screen overlay triggered by a glyph).
- Overlay engages at **≤720px**; the bracketed glyph morphs `[ ≡ ]` → `[ × ]`.

## Aesthetic context (existing, to reuse)

- Tokens (`src/styles/tokens.css`): `--main:#151515`, `--text:#BFB29B`, `--text-bright:#F4EEE2`, `--text-dim:#5a544a`, `--accent:#FF6F59`; fonts `--display` (Bebas Neue), `--mono` (JetBrains Mono).
- CRT overlays already mounted in `Base.astro` (grain, scanlines, vignette, crt-pulse) and a custom cursor.
- A glitch **scramble** text effect exists in `src/lib/reveal.ts` (`scrambleEl`, `bindHoverScramble`) but is currently module-private.
- Scroll-spy (`src/lib/active-nav.ts`) toggles `.active` on `nav.top ul a[data-anchor]` based on the section in view.
- Smooth scrolling + anchor interception via Lenis (`src/lib/smooth-scroll.ts`).
- `prefers-reduced-motion` is respected throughout the site (3D scene never loads, cursor off, reveals snap).

## 1. Desktop — Refined top bar (D1)

Keep the fixed, blurred top bar, the logo (YR monogram + "Raviv.io"), and the `Blog ↗` accent treatment unchanged. Add three things:

1. **Persistent active state.** The active section's link renders with a full coral bracket `[ Where ]` (today only a `[` prefix shows, and only on hover/active). Add a 2px coral underline that animates in via `transform: scaleX(0→1)` with `transform-origin: left`. This is a per-link underline (no single sliding/measuring bar) to keep it CSS-only and low-risk.
2. **Hover preview.** Non-active links brighten and show a dim underline on hover (today only `opacity` changes).
3. **Scramble-on-hover.** Nav link labels glitch-scramble on `mouseenter`, reusing `scrambleEl` from `reveal.ts`. Short duration (~500ms) so it stays snappy. Width is locked before scrambling (as `bindHoverScramble` already does) so the bar doesn't reflow.

No corner ticks and no section-index readout (those were the rejected D2 variant). Desktop stays visually clean.

## 2. Mobile — Terminal Boot overlay (A)

Engages at **≤720px**. The desktop `<ul>` of links is hidden; a trigger glyph appears at the right of the bar.

**Trigger**
- A real `<button class="nav-toggle">` showing a bracketed three-bar glyph `[ ≡ ]` that morphs to `[ × ]` when the overlay is open.
- Minimum 44×44px hit area.
- `aria-label` toggles between "Open menu" / "Close menu"; `aria-expanded` reflects state; `aria-controls` points to the overlay's `id`.

**Overlay**
- Full-screen, `background: rgba(12,12,12,.96)`, with the site's scanline texture (`repeating-linear-gradient`).
- Links stacked large in the display face (Bebas Neue), each prefixed with a mono index derived from array position: `01 Who`, `02 What`, `03 Where`, `04 How`, `05 Contact`.
- The active section (from scroll-spy) is shown as a coral `[ … ]`.
- Below a divider: `Blog ↗` — no index number, accent color (it is `external` in `navLinks`).
- Bottom status line: `> SELECT_DESTINATION_` with a blinking cursor (`--accent` prompt char).
- Touch targets ≥44px; comfortable vertical spacing.

**Animation**
- Open: backdrop clips/fades in, then links **stagger-reveal with scramble**, ~40ms apart.
- Close: fades faster (~60–70% of open duration), per motion best-practice (exit faster than enter).

**Bug fixes folded in**
- Remove the `@media (max-width: 420px) { ... nth-child(3) { display:none } }` rule that hides "Where".
- Remove the cramped `@media (max-width: 720px)` link styling (font shrink to 10px, gap reduction) — the overlay replaces it.

## 3. Behavior & accessibility (required, not optional)

- **Dialog semantics:** overlay is `role="dialog" aria-modal="true"` with an `id` referenced by the trigger.
- **Focus management:** on open, move focus into the overlay and trap it (Tab/Shift+Tab cycle within); **Esc** closes; on close, return focus to the trigger button.
- **Scroll lock:** lock body scroll while the overlay is open; unlock on close. Must cooperate with Lenis.
- **Link select:** tapping/activating a link closes the overlay and unlocks scroll *first*, then lets the existing `smooth-scroll.ts` anchor interception perform the smooth scroll (close-before-scroll ordering, so Lenis can move the page).
- **Reduced motion:** under `prefers-reduced-motion: reduce`, no scramble and no stagger anywhere (desktop hover scramble and overlay reveal both disabled); the overlay appears instantly and the active state is static. Matches the site's existing gating.
- **Contrast:** coral `#FF6F59` on near-black and cream `#F4EEE2` on dark both clear WCAG AA 4.5:1.
- **Keyboard:** all links are anchors and tabbable; the trigger is a button.

## 4. Architecture / files

### `src/components/Nav.astro` (modify)
- Add the trigger `<button>` and the overlay markup (the overlay lives inside `Nav.astro`).
- Overlay links derive their index number from the `navLinks` map index (`String(i + 1).padStart(2, '0')`); the `external` Blog link is rendered separately without a number.
- Add scoped styles for: the D1 desktop active bracket + animated underline + hover preview, and the full mobile overlay + trigger glyph.
- Remove the old `≤420px` hide rule and the cramped `≤720px` link styles.

### `src/lib/nav-menu.ts` (new)
- Owns overlay open/close state, the trigger glyph toggle, `aria-expanded`/`aria-label` updates.
- Focus trap, Esc-to-close, body scroll lock/unlock.
- Scramble + stagger reveal of overlay links on open (skipped under reduced motion).
- Imports `scrambleEl` from `reveal.ts` (no duplicated effect).
- Also wires desktop nav-link hover scramble (keeps all nav-related JS in one module).
- Mounted from `Base.astro` alongside the existing four modules.

### `src/lib/reveal.ts` (modify)
- `export` the existing `scrambleEl` function so `nav-menu.ts` can reuse it. No behavior change to current scrambles.

### `src/lib/active-nav.ts` (modify)
- Extend the link query so it also toggles `.active` on the overlay's links (same `data-anchor` mechanism), keeping the desktop bar and the overlay in sync. No second scroll listener — reuse the existing one.

### `src/content/nav.ts` (unchanged)
- Index numbers come from array position; no content change needed.

### `src/layouts/Base.astro` (modify)
- Import and call `mountNavMenu()` from `@/lib/nav-menu` in the existing client `<script>` block.

## Out of scope (YAGNI)

- No change to the link set or routes (Blog stays a planned external anchor as today).
- No new content fields.
- No changes to the 3D HeroScene or the desktop top-bar paradigm.
- No D2 HUD readout / corner ticks.

## Verification

- `npm run typecheck` — the project's only verification gate (TS + `.astro`).
- Manual check at 1440px / 768px / 375px, and with `prefers-reduced-motion` enabled:
  - Desktop: active bracket + underline track the scrolled section; hover scramble fires; no layout reflow.
  - Mobile: glyph opens/closes the overlay; all five sections + Blog reachable; "Where" is present below 420px; Esc + focus return work; body scroll locks; selecting a link closes then smooth-scrolls.
  - Reduced motion: overlay is instant, no scramble.
