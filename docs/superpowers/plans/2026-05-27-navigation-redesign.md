# Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the desktop top bar with restrained cyberpunk detailing (D1) and replace the broken mobile nav with a full-screen "terminal boot" overlay menu (A).

**Architecture:** All nav markup + scoped styles live in `Nav.astro`. A new vanilla-TS module `nav-menu.ts` owns the mobile overlay's open/close, focus trap, scroll lock, Esc, and the glitch-scramble reveal; it reuses the existing `scrambleEl`/`bindHoverScramble` from `reveal.ts` and a new `lockScroll`/`unlockScroll` exposed from `smooth-scroll.ts`. `active-nav.ts` is widened so the existing scroll-spy also highlights the overlay's links.

**Tech Stack:** Astro 6 (static), TypeScript strict, vanilla TS modules, Lenis smooth scroll, scoped `<style>` in `.astro`. No test runner — verification is `npm run typecheck` (the only gate) plus a manual browser matrix.

**Spec:** `docs/superpowers/specs/2026-05-27-navigation-redesign-design.md`

---

## Conventions for every task

- This repo has **no unit-test framework**. "Verify" = run `npm run typecheck` and confirm it passes, plus manual browser checks where noted. Do **not** add a test runner.
- Use the `@/*` import alias, never relative paths.
- Commit after each task with the message shown.
- Intermediate state note: after Task 3 the overlay exists in the DOM but the trigger does nothing until Task 5–6 wire up `nav-menu.ts`. Desktop is unaffected throughout. This is expected on a feature branch.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/lib/reveal.ts` | Word reveal + scramble effects | Modify — export `scrambleEl`, `bindHoverScramble` |
| `src/lib/smooth-scroll.ts` | Lenis setup | Modify — module-level instance + export `lockScroll`/`unlockScroll` |
| `src/components/Nav.astro` | Nav markup + scoped styles (desktop bar, trigger, overlay) | Rewrite |
| `src/lib/active-nav.ts` | Scroll-spy active highlighting | Modify — query all `[data-anchor]` links |
| `src/lib/nav-menu.ts` | Overlay open/close, focus trap, scroll lock, scramble reveal, desktop hover scramble | Create |
| `src/layouts/Base.astro` | Mounts client modules | Modify — mount `mountNavMenu()` |
| `src/content/nav.ts` | Nav link data | Unchanged |

---

## Task 1: Export scramble helpers from `reveal.ts`

**Files:**
- Modify: `src/lib/reveal.ts:37` and `src/lib/reveal.ts:66`

- [ ] **Step 1: Add `export` to `scrambleEl`**

Change the declaration at line 37 from:

```ts
function scrambleEl(el: HTMLElement, finalText: string, duration = 1400): void {
```

to:

```ts
export function scrambleEl(el: HTMLElement, finalText: string, duration = 1400): void {
```

- [ ] **Step 2: Add `export` to `bindHoverScramble`**

Change the declaration at line 66 from:

```ts
function bindHoverScramble(trigger: Element | null, target: HTMLElement | null, duration = 1400): void {
```

to:

```ts
export function bindHoverScramble(trigger: Element | null, target: HTMLElement | null, duration = 1400): void {
```

(No other changes — both functions are still used internally by `mountScrambles`.)

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: passes with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/reveal.ts
git commit -m "refactor: export scrambleEl and bindHoverScramble for reuse"
```

---

## Task 2: Expose scroll lock/unlock from `smooth-scroll.ts`

**Files:**
- Modify: `src/lib/smooth-scroll.ts`

Lenis's `.stop()` adds the `lenis-stopped` class which (via `lenis/dist/lenis.css`) sets `overflow: clip` on the root — a real scroll lock that also covers native touch scroll. We hoist the instance to module scope so the nav overlay can lock/unlock it.

- [ ] **Step 1: Replace the file contents**

Replace the entire body of `src/lib/smooth-scroll.ts` (keep the header comment) so the `lenis` instance is module-scoped and lock/unlock are exported:

```ts
// Smooth scrolling powered by Lenis (lenis.dev).
//   - Buttery smooth wheel/touch scrolling with lerp-based easing.
//   - anchors: true intercepts <a href="#id"> clicks (nav + logo)
//     and animates the scroll to the target section.
//
// Section snapping is intentionally NOT enabled here — the page reads as a
// normal smooth-scrolling site. Revisit lenis/snap once final content is in
// place and section heights are settled.

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

let lenis: Lenis | null = null;

export function mountSmoothScroll(): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  lenis = new Lenis({
    autoRaf: true,
    anchors: { offset: 0, duration: 1.0 },
    smoothWheel: !reduced,
    syncTouch: !reduced,
    syncTouchLerp: 0.1,
    touchInertiaExponent: 1.7,
    lerp: 0.12,
    wheelMultiplier: 1.1,
    touchMultiplier: 1.2,
    autoToggle: true,
    allowNestedScroll: true,
  });

  // Initial hash deep-link: Lenis's `anchors` intercepts clicks, but not the
  // browser's own first-paint scroll. Wait two frames so the hero canvas and
  // fonts settle, then jump.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const hash = location.hash.replace('#', '');
      if (!hash) return;
      const target = document.getElementById(hash);
      if (target) lenis!.scrollTo(target, { immediate: true });
    });
  });
}

// Lock/unlock used by the mobile nav overlay. `.stop()` adds the
// `lenis-stopped` class (overflow: clip), which blocks both smooth and native
// scrolling behind the full-screen menu.
export function lockScroll(): void {
  lenis?.stop();
}

export function unlockScroll(): void {
  lenis?.start();
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/smooth-scroll.ts
git commit -m "feat: expose lockScroll/unlockScroll from smooth-scroll"
```

---

## Task 3: Rewrite `Nav.astro` (markup + desktop D1 + mobile overlay styles)

**Files:**
- Rewrite: `src/components/Nav.astro`

This is the visual core. It adds the trigger `<button>` (mobile only), the full-screen overlay (sibling of `<nav>`), index numbers derived from array position, the D1 desktop active bracket + animated underline + hover-underline, and removes the old cramped `≤720px` link rules and the `≤420px` "Where"-hiding rule.

- [ ] **Step 1: Replace the entire file**

Write `src/components/Nav.astro` with exactly this content:

```astro
---
import { Image } from 'astro:assets';
import logo from '@/assets/logo-yr-orange.png';
import { navLinks } from '@/content';

const internalLinks = navLinks.filter((l) => !l.external);
const externalLinks = navLinks.filter((l) => l.external);
---
<nav class="top">
  <a href="#hero" class="logo" aria-label="Home">
    <Image src={logo} alt="YR monogram" class="logo-img" width={112} height={112} loading="eager" />
    <span class="logo-text">Raviv.io</span>
  </a>
  <ul>
    {navLinks.map((link) =>
      link.external ? (
        <li><a href={link.href} class="blog">{link.label}</a></li>
      ) : (
        <li><a href={link.href} data-anchor={link.anchor}>{link.label}</a></li>
      )
    )}
  </ul>
  <button
    class="nav-toggle"
    type="button"
    aria-label="Open menu"
    aria-expanded="false"
    aria-controls="nav-overlay"
  >
    <span class="nt-glyph" aria-hidden="true"><i></i><i></i><i></i></span>
  </button>
</nav>

<div class="nav-overlay" id="nav-overlay" role="dialog" aria-modal="true" aria-label="Site navigation" tabindex="-1">
  <ul class="ov-list">
    {internalLinks.map((link, i) => (
      <li style={`--i:${i}`}>
        <a class="ov-link" href={link.href} data-anchor={link.anchor}>
          <span class="ov-num">{String(i + 1).padStart(2, '0')}</span>
          <span class="ov-label">{link.label}</span>
        </a>
      </li>
    ))}
  </ul>
  <div class="ov-foot" style={`--i:${internalLinks.length}`}>
    {externalLinks.map((link) => (
      <a class="ov-link ov-blog" href={link.href}>{link.label}</a>
    ))}
    <div class="ov-status"><span class="cur">&gt;</span> SELECT_DESTINATION_</div>
  </div>
</div>

<style>
  nav.top {
    position: fixed; top: 0; left: 0; right: 0; z-index: 50;
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px var(--pad-x);
    font-family: var(--mono); font-size: 14px; letter-spacing: .14em; text-transform: uppercase;
    background: rgba(21, 21, 21, .55);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
            backdrop-filter: blur(14px) saturate(140%);
    border-bottom: 1px solid rgba(191, 178, 155, .08);
    animation: navIn 1.2s cubic-bezier(.2,.7,.2,1) both;
    animation-delay: .1s;
  }
  @keyframes navIn {
    from { transform: translateY(-100%); opacity: 0; }
    to   { transform: translateY(0);     opacity: 1; }
  }
  nav.top .logo {
    color: var(--text-bright); display: flex; align-items: center; gap: 12px;
    font-weight: 500; white-space: nowrap; text-decoration: none;
  }
  nav.top .logo :global(.logo-img) {
    height: 48px; width: auto; display: block;
    filter: drop-shadow(0 0 6px rgba(0,0,0,.4));
  }
  nav.top .logo .logo-text {
    font-family: var(--mono); font-size: 13px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--text-bright); opacity: .85;
  }

  /* ── desktop links (D1: animated underline + active brackets + hover) ── */
  nav.top ul { list-style: none; display: flex; gap: 36px; align-items: center; }
  nav.top ul a {
    color: var(--text-bright); text-decoration: none; opacity: .7; position: relative; padding: 6px 0;
    background-image: linear-gradient(var(--accent), var(--accent));
    background-repeat: no-repeat; background-position: 0 100%; background-size: 0 2px;
    transition: opacity .25s, background-size .3s cubic-bezier(.2,.7,.2,1);
  }
  nav.top ul a:hover { opacity: 1; background-size: 100% 2px; }
  nav.top ul a.active { opacity: 1; color: var(--accent); background-size: 100% 2px; }
  /* brackets reserve space at opacity 0 so activating doesn't shift neighbours */
  nav.top ul a::before {
    content: "["; opacity: 0; margin-right: 4px; color: var(--accent); transition: opacity .25s;
  }
  nav.top ul a:not(.blog)::after {
    content: "]"; opacity: 0; margin-left: 4px; color: var(--accent); transition: opacity .25s;
  }
  nav.top ul a.active::before,
  nav.top ul a.active:not(.blog)::after { opacity: 1; }
  nav.top ul a.blog { color: var(--accent); opacity: 1; }
  nav.top ul a.blog::after { content: "↗"; margin-left: 4px; display: inline-block; }

  /* ── mobile trigger glyph (hidden on desktop) ── */
  .nav-toggle {
    display: none;
    position: relative; width: 44px; height: 44px; padding: 0; margin-right: -8px;
    align-items: center; justify-content: center;
    background: none; border: none; cursor: pointer;
  }
  .nav-toggle::before, .nav-toggle::after {
    content: "["; color: var(--accent); font-family: var(--mono); font-size: 18px; line-height: 1;
  }
  .nav-toggle::after { content: "]"; }
  .nt-glyph { position: relative; width: 18px; height: 14px; margin: 0 5px; }
  .nt-glyph i {
    position: absolute; left: 0; height: 2px; background: var(--text-bright);
    transition: transform .3s ease, opacity .2s ease, width .3s ease;
  }
  .nt-glyph i:nth-child(1) { top: 0;  width: 100%; }
  .nt-glyph i:nth-child(2) { top: 6px; width: 65%; }
  .nt-glyph i:nth-child(3) { top: 12px; width: 85%; }
  .nav-toggle[aria-expanded="true"] .nt-glyph i:nth-child(1) { top: 6px; width: 100%; transform: rotate(45deg); }
  .nav-toggle[aria-expanded="true"] .nt-glyph i:nth-child(2) { opacity: 0; }
  .nav-toggle[aria-expanded="true"] .nt-glyph i:nth-child(3) { top: 6px; width: 100%; transform: rotate(-45deg); }

  /* ── full-screen terminal overlay (mobile only) ── */
  .nav-overlay {
    position: fixed; inset: 0; z-index: 40;
    display: none;
    flex-direction: column; justify-content: center;
    padding: 0 var(--pad-x);
    background: rgba(12, 12, 12, .96);
    -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
    opacity: 0; visibility: hidden; pointer-events: none;
    transition: opacity .35s ease, visibility .35s;
  }
  .nav-overlay::after {
    content: ""; position: absolute; inset: 0; pointer-events: none;
    background: repeating-linear-gradient(to bottom, rgba(255,255,255,.05) 0 1px, transparent 1px 3px);
    mix-blend-mode: overlay;
  }
  .nav-overlay.is-open { opacity: 1; visibility: visible; pointer-events: auto; }
  .nav-overlay:focus { outline: none; }

  .ov-list { list-style: none; display: flex; flex-direction: column; gap: clamp(4px, 1.6vh, 14px); }
  .ov-link {
    display: flex; align-items: baseline; gap: 16px; text-decoration: none;
    font-family: var(--display); font-size: clamp(40px, 12vw, 76px); line-height: 1.05;
    letter-spacing: .02em; text-transform: uppercase; color: var(--text-bright);
    padding: 4px 0; min-height: 44px;
  }
  .ov-num { font-family: var(--mono); font-size: clamp(12px, 3vw, 15px); color: var(--accent); opacity: .8; }
  .ov-label { display: inline-block; }
  .ov-link.active .ov-label { color: var(--accent); }
  .ov-link.active .ov-label::before { content: "[ "; color: var(--accent); }
  .ov-link.active .ov-label::after  { content: " ]"; color: var(--accent); }

  .ov-foot { margin-top: clamp(22px, 6vh, 48px); display: flex; flex-direction: column; gap: 16px; }
  .ov-blog {
    font-family: var(--mono); font-size: 13px; letter-spacing: .16em; text-transform: uppercase;
    color: var(--accent); text-decoration: none; min-height: 44px; display: inline-flex; align-items: center;
  }
  .ov-blog::after { content: " ↗"; }
  .ov-status { font-family: var(--mono); font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--text-dim); }
  .ov-status .cur { color: var(--accent); animation: navBlink 1.1s steps(1) infinite; }
  @keyframes navBlink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }

  /* staggered entrance — each item delayed by its --i; reduced-motion makes
     the global transition ~0ms so items just appear */
  .ov-list li, .ov-foot {
    opacity: 0; transform: translateY(16px);
    transition: opacity .4s ease, transform .5s cubic-bezier(.2,.7,.2,1);
    transition-delay: calc(var(--i, 0) * 45ms);
  }
  .nav-overlay.is-open .ov-list li,
  .nav-overlay.is-open .ov-foot { opacity: 1; transform: none; }

  @media (max-width: 1100px) { nav.top ul { gap: 24px; } }
  @media (max-width: 720px) {
    nav.top { padding: 10px var(--pad-x); }
    nav.top .logo :global(.logo-img) { height: 40px; }
    nav.top .logo .logo-text { display: none; }
    nav.top ul { display: none; }
    .nav-toggle { display: flex; }
    .nav-overlay { display: flex; }
  }
</style>
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: passes with no errors.

- [ ] **Step 3: Verify in browser (desktop + mobile)**

Run: `npm run dev`, open the served URL.
- Desktop ≥721px: links show; scrolling moves the active `[ … ]` bracket + underline between sections; hovering a non-active link shows the underline. Trigger button is hidden.
- Resize to ≤720px: links disappear, the bracketed glyph appears at the right. The overlay is **not** visible (it's hidden until JS opens it — that's Task 5).

- [ ] **Step 4: Commit**

```bash
git add src/components/Nav.astro
git commit -m "feat: refined desktop bar + mobile terminal overlay markup/styles"
```

---

## Task 4: Widen `active-nav.ts` to highlight overlay links

**Files:**
- Modify: `src/lib/active-nav.ts`

The scroll-spy currently queries only `nav.top ul a[data-anchor]`. Both the desktop links and the overlay links carry `data-anchor`, so query all of them and dedupe the section list. `data-anchor` exists only on nav links, so a bare `[data-anchor]` selector is safe.

- [ ] **Step 1: Replace the file contents**

Replace the entire body of `src/lib/active-nav.ts`:

```ts
// Scroll-spy: highlights the nav link(s) matching the section currently in
// view. Targets both the desktop bar and the mobile overlay — every nav link
// carries a data-anchor, so a single query covers both.

export function mountActiveNav(): void {
  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[data-anchor]')];
  if (navLinks.length === 0) return;

  const sectionIds = [...new Set(navLinks.map((a) => a.dataset.anchor!))];
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter((s): s is HTMLElement => s !== null);

  function updateActive(): void {
    const y = window.scrollY + window.innerHeight * 0.35;
    let activeId: string | undefined = sections[0]?.id;
    sections.forEach((s) => {
      if (s.offsetTop <= y) activeId = s.id;
    });
    navLinks.forEach((a) => a.classList.toggle('active', a.dataset.anchor === activeId));
  }

  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/active-nav.ts
git commit -m "feat: scroll-spy highlights overlay links too"
```

---

## Task 5: Create `nav-menu.ts` (overlay behavior + desktop hover scramble)

**Files:**
- Create: `src/lib/nav-menu.ts`

Owns: open/close, ARIA state, focus trap, Esc, scroll lock (via `lockScroll`/`unlockScroll`), the staggered scramble reveal of overlay labels, and the desktop nav-link hover scramble. All glitch/scramble effects are gated behind `prefers-reduced-motion`. Selecting an overlay link closes the menu (unlocking scroll); Lenis's anchor handler — registered on the document and therefore firing later in the bubble phase — then performs the smooth scroll.

- [ ] **Step 1: Create the file**

Write `src/lib/nav-menu.ts` with exactly this content:

```ts
// Mobile "terminal boot" overlay menu + desktop nav-link hover scramble.
// Mounted once from Base.astro. The overlay markup lives in Nav.astro.

import { scrambleEl, bindHoverScramble } from '@/lib/reveal';
import { lockScroll, unlockScroll } from '@/lib/smooth-scroll';

export function mountNavMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.nav-toggle');
  const overlay = document.getElementById('nav-overlay');
  if (!toggle || !overlay) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Desktop: glitch-scramble the bar's labels on hover (skip under reduced motion).
  if (!reduced) {
    document
      .querySelectorAll<HTMLAnchorElement>('nav.top ul a:not(.blog)')
      .forEach((a) => bindHoverScramble(a, a, 500));
  }

  const overlayLinks = [...overlay.querySelectorAll<HTMLAnchorElement>('.ov-link')];
  const overlayLabels = [...overlay.querySelectorAll<HTMLElement>('.ov-link .ov-label')];

  const focusables = (): HTMLElement[] =>
    [...overlay.querySelectorAll<HTMLElement>('a[href]')];

  let open = false;
  let lastFocus: HTMLElement | null = null;

  function openMenu(): void {
    if (open) return;
    open = true;
    lastFocus = document.activeElement as HTMLElement | null;
    overlay!.classList.add('is-open');
    overlay!.removeAttribute('aria-hidden');
    toggle!.setAttribute('aria-expanded', 'true');
    toggle!.setAttribute('aria-label', 'Close menu');
    lockScroll();
    (focusables()[0] ?? overlay!).focus();
    if (!reduced) {
      overlayLabels.forEach((label, i) => {
        const text = label.textContent ?? '';
        window.setTimeout(() => scrambleEl(label, text, 600), i * 45);
      });
    }
  }

  function closeMenu(returnFocus = true): void {
    if (!open) return;
    open = false;
    overlay!.classList.remove('is-open');
    overlay!.setAttribute('aria-hidden', 'true');
    toggle!.setAttribute('aria-expanded', 'false');
    toggle!.setAttribute('aria-label', 'Open menu');
    unlockScroll();
    if (returnFocus) (lastFocus ?? toggle!).focus();
  }

  toggle.addEventListener('click', () => (open ? closeMenu() : openMenu()));

  // Close on selection (unlocks scroll); Lenis's document-level anchor handler
  // fires afterwards in the bubble phase and performs the scroll.
  overlayLinks.forEach((a) => a.addEventListener('click', () => closeMenu(false)));

  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key === 'Tab') {
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Close if the viewport grows back to desktop while the menu is open.
  window.matchMedia('(min-width: 721px)').addEventListener('change', (e) => {
    if (e.matches && open) closeMenu(false);
  });

  // Start closed: hide from the accessibility tree until opened.
  overlay.setAttribute('aria-hidden', 'true');
}
```

> Note on `!`: after the `if (!toggle || !overlay) return;` guard, `toggle` and `overlay` are non-null `const`s. The `!` assertions inside the nested functions are belt-and-suspenders for TS strict and are harmless.

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/nav-menu.ts
git commit -m "feat: mobile overlay menu behavior + desktop hover scramble"
```

---

## Task 6: Mount `mountNavMenu()` in `Base.astro`

**Files:**
- Modify: `src/layouts/Base.astro:29-38`

- [ ] **Step 1: Add the import and call**

In the client `<script>` block, replace:

```ts
      import { mountReveal }       from '@/lib/reveal';
      import { mountCursor }       from '@/lib/cursor';
      import { mountActiveNav }    from '@/lib/active-nav';
      import { mountSmoothScroll } from '@/lib/smooth-scroll';
      mountSmoothScroll();
      mountReveal();
      mountCursor();
      mountActiveNav();
```

with:

```ts
      import { mountReveal }       from '@/lib/reveal';
      import { mountCursor }       from '@/lib/cursor';
      import { mountActiveNav }    from '@/lib/active-nav';
      import { mountSmoothScroll } from '@/lib/smooth-scroll';
      import { mountNavMenu }      from '@/lib/nav-menu';
      mountSmoothScroll();
      mountReveal();
      mountCursor();
      mountActiveNav();
      mountNavMenu();
```

(`mountNavMenu` runs after `mountSmoothScroll` so the Lenis instance exists when the overlay locks/unlocks it.)

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: passes with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Base.astro
git commit -m "feat: mount nav-menu module"
```

---

## Task 7: Full verification matrix

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: passes with no errors.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build completes; no errors.

- [ ] **Step 3: Manual browser matrix**

Run: `npm run dev` (or `npm run preview` against the build) and verify:

**Desktop (≥1100px and ~768–1100px):**
- Active section shows `[ Label ]` in coral + underline; updates while scrolling.
- Hover a non-active link → underline previews + label glitch-scrambles, no layout shift in the bar.
- Trigger button and overlay are not present/visible.

**Mobile (375px):**
- Bracketed glyph visible at top-right; tapping it morphs to an `×` and opens the full-screen overlay.
- Overlay shows `01 Who … 05 Contact` (all five — confirm **"Where" is present**, fixing the old ≤420px bug), `Blog ↗` below, and the blinking `> SELECT_DESTINATION_` line.
- Labels scramble-reveal with a stagger; the current section shows `[ … ]`.
- Tapping a link closes the overlay and smooth-scrolls to that section.
- Esc closes it; focus returns to the trigger; page behind does not scroll while open (scroll lock).

**Reduced motion (enable OS "Reduce motion"):**
- Overlay appears instantly with no scramble/stagger; desktop hover does not scramble; active state still tracks correctly.

- [ ] **Step 4: Final commit (only if Step 3 surfaced fixes)**

If any tweak was needed, commit it:

```bash
git add -A
git commit -m "fix: nav redesign verification adjustments"
```

Otherwise no commit is needed — the feature is complete.

---

## Self-Review (completed during planning)

- **Spec coverage:** D1 desktop (active bracket + animated underline + hover + scramble) → Task 3 + Task 5. Mobile overlay (trigger glyph, index numbers, active bracket, status line, stagger+scramble) → Task 3 + Task 5. A11y (dialog, focus trap, Esc, scroll lock, reduced-motion) → Task 5. Scroll-lock cooperation with Lenis → Task 2 + Task 5. Scroll-spy sync → Task 4. Mount → Task 6. Removal of ≤420px hide + cramped ≤720px rules → Task 3. Verification → Task 7. No gaps.
- **Placeholder scan:** none — all code blocks are complete.
- **Type/name consistency:** `scrambleEl`/`bindHoverScramble` (exported in T1, used in T5); `lockScroll`/`unlockScroll` (exported in T2, used in T5); class/id names (`.nav-toggle`, `#nav-overlay`, `.ov-link`, `.ov-label`, `.is-open`, `aria-expanded`) consistent between Nav.astro (T3) and nav-menu.ts (T5); `[data-anchor]` consistent between Nav.astro and active-nav.ts (T4).
```
