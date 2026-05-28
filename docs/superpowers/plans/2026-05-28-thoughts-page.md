# Thoughts page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a `/thoughts` long-form section (Markdown content collection, editorial index, sticky-rail post page, RSS, per-post OG images, BlogPosting JSON-LD) with a custom blade-sweep page transition tied to the site's katana motif.

**Architecture:** Phase 0 is a transition spike — wires the nav, stubs `/thoughts`, builds the overlay end-to-end on a placeholder page so the user can commit-or-pivot on the visual before any content work. Phase 1 ships the content collection, real index page, post pages, RSS, OG generator, and JSON-LD.

**Tech Stack:** Astro 6 (static output, content collections, built-in Shiki), TypeScript strict, Lenis smooth-scroll (existing), `@astrojs/rss`, `satori` + `@resvg/resvg-js` (OG image generation). No new test runner — verification is `npm run typecheck` plus visual checks in `npm run dev` / `npm run build` (per `CLAUDE.md`).

**Spec:** `docs/superpowers/specs/2026-05-28-thoughts-page-design.md`

---

## Conventions used in this plan

- **Verification commands:**
  - `npm run typecheck` — runs `astro check`. Expected output: `0 errors`.
  - `npm run dev` — Astro dev server on `http://localhost:4321`. Use for visual checks.
  - `npm run build` — static build to `dist/`. Use after additions that create endpoints (RSS, OG).
- **Imports:** always use the `@/` alias (configured `@/* → ./src/*`). Do not write relative imports like `../../lib/foo`.
- **No new test framework.** Don't add jest/vitest. The codebase has none and adding one is out of scope.
- **Frequent commits.** Commit at the end of every task, even tiny ones. Commit subjects use a `feat(thoughts):` / `chore(thoughts):` / `docs(thoughts):` prefix.

---

## File map

### New files

| Path | Purpose | Created in |
| --- | --- | --- |
| `src/pages/thoughts/index.astro` | Editorial index page (Phase 0 stub → Phase 1 real). | Task 0.4 / 1.4 |
| `src/pages/thoughts/[...slug].astro` | Post detail page. | Task 1.7 |
| `src/components/ThoughtsTransition.astro` | Blade-sweep overlay DOM + scoped CSS. | Task 0.5 |
| `src/lib/thoughts-transition.ts` | Runtime: forward sweep, arrival sweep, reverse path. | Tasks 0.7 / 0.8 |
| `src/lib/thoughts.ts` | Helpers: `getPublishedThoughts()`, `readingTimeMinutes()`. | Task 1.3 |
| `src/lib/reading-progress.ts` | Updates rail progress fill on post pages. | Task 1.8 |
| `src/content/config.ts` | `thoughts` content collection schema. | Task 1.2 |
| `src/content/thoughts/heroscene-rig-system.md` | First real post; smoke-tests the whole pipeline. | Task 1.12 |
| `src/pages/rss.xml.ts` | RSS feed at `/rss.xml`. | Task 1.9 |
| `src/pages/og/thoughts/[slug].png.ts` | Per-post 1200×630 OG image. | Task 1.10 |

### Modified files

| Path | Changes | Tasks |
| --- | --- | --- |
| `src/content/nav.ts` | Blog → Thoughts; `href: '/thoughts'`; keep `external: true`. | 0.1 |
| `src/components/Nav.astro` | Add `data-thought-link` to the external/highlighted anchor. | 0.2 |
| `src/layouts/Base.astro` | Add `route?`/`ogImage?`/`ogType?`/`articlePublished?`/`articleModified?`/`jsonLd?` props; render `<ThoughtsTransition />`; inline FOUC-prevention script in `<head>`; mount `mountThoughtsTransition()` and conditionally `mountReadingProgress()`. | 0.5, 0.7, 1.5, 1.8 |
| `src/pages/index.astro` | Pass `route="home"` to `<Base>`. | 0.5 |
| `src/lib/active-nav.ts` | On non-`/` routes, statically mark the matching top-level link active and skip section-spy. | 0.9 |
| `src/components/SEO.astro` | New optional props for article OG / extra JSON-LD. | 1.5 |
| `src/content/seo.ts` | Add `blogPostingSchema()` and `blogIndexSchema()`. | 1.6 |
| `astro.config.mjs` | Set `markdown.shikiConfig.theme`. | 1.7 |
| `package.json` | Add `@astrojs/rss`, `satori`, `@resvg/resvg-js`. | 1.1 |

---

# Phase 0 — Transition spike (commit-or-pivot gate)

Goal: wire the nav, ship a stub `/thoughts` page, build the blade-sweep overlay end-to-end. At Task 0.10 you stop and decide whether the transition feels right. Do **not** continue to Phase 1 until you have committed to it.

> **Deliberate simplification vs spec §5.4.** This plan ships a single symmetric blade direction — the same sweep angle plays whether you're going `/ → /thoughts` or `/thoughts → /`. The spec called for a mirrored "reverse" direction on outbound trips. That polish is deferred: if Task 0.10's decision gate flags the symmetry as wrong, add the reverse animation as a follow-up before continuing to Phase 1. Implementation hint for that follow-up: persist a `direction: 'forward' | 'reverse'` flag in sessionStorage alongside `tx-arrive`, branch on it to add `data-tx-direction="reverse"` to the overlay, and add a mirrored set of `@keyframes` for that variant.

---

## Task 0.1: Rename Blog → Thoughts in the nav data

**Files:**
- Modify: `src/content/nav.ts`

- [ ] **Step 1: Update the nav entry**

Replace the `Blog` entry in `src/content/nav.ts`:

```ts
import type { NavLink } from './_types';

export const navLinks: NavLink[] = [
  { href: '#who',     label: 'Who',     anchor: 'who' },
  { href: '#what',    label: 'What',    anchor: 'what' },
  { href: '#where',   label: 'Where',   anchor: 'where' },
  { href: '#how',     label: 'How',     anchor: 'how' },
  { href: '#contact', label: 'Contact', anchor: 'contact' },
  { href: '/thoughts', label: 'Thoughts', external: true },
];
```

`external: true` is intentionally kept — it now means "leaves the home single-page flow" and triggers the orange + ↗ styling in `Nav.astro`.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/content/nav.ts
git commit -m "feat(thoughts): rename Blog nav link to Thoughts, point at /thoughts"
```

---

## Task 0.2: Add `data-thought-link` to the Thoughts anchor

**Files:**
- Modify: `src/components/Nav.astro` (the external-link branch in the top bar AND in the mobile overlay)

- [ ] **Step 1: Update the external-link branches**

In `src/components/Nav.astro`, the desktop top-bar maps `navLinks` to either an external or internal `<a>`. Add `data-thought-link` to the external one. Find this block (around lines 22–40):

```astro
        {
            navLinks.map((link) =>
                link.external ? (
                    <li>
                        <a href={link.href} class="blog">
                            {link.label}
                        </a>
                    </li>
                ) : (
                    <li>
                        <a href={link.href} data-anchor={link.anchor}>
                            {link.label}
                        </a>
                    </li>
                ),
            )
        }
```

Replace with:

```astro
        {
            navLinks.map((link) =>
                link.external ? (
                    <li>
                        <a href={link.href} class="blog" data-thought-link>
                            {link.label}
                        </a>
                    </li>
                ) : (
                    <li>
                        <a href={link.href} data-anchor={link.anchor}>
                            {link.label}
                        </a>
                    </li>
                ),
            )
        }
```

In the mobile overlay (`.ov-foot` block, around lines 79–86), find:

```astro
        {
            externalLinks.map((link) => (
                <a class="ov-link ov-blog" href={link.href}>
                    {link.label}
                </a>
            ))
        }
```

Replace with:

```astro
        {
            externalLinks.map((link) => (
                <a class="ov-link ov-blog" href={link.href} data-thought-link>
                    {link.label}
                </a>
            ))
        }
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 3: Visual sanity check**

```bash
npm run dev
```

Open `http://localhost:4321`. Confirm:
- The nav link still reads **Thoughts** (orange, with ↗ arrow).
- `<a class="blog" data-thought-link>` is present in DOM (DevTools → Elements).
- Clicking the link 404s for now — `/thoughts` doesn't exist yet. Expected.

Stop the dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add src/components/Nav.astro
git commit -m "feat(thoughts): tag Thoughts nav link with data-thought-link"
```

---

## Task 0.3: Add the `route` prop scaffold to `Base.astro` and `index.astro`

Why now: the transition mount logic in 0.7 reads `route` to short-circuit on hot reloads, and the post pages in Phase 1 use it too. Wire the prop now, no behaviour change.

**Files:**
- Modify: `src/layouts/Base.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Add `route` to `Base.astro`'s `Props`**

Replace the existing frontmatter block in `src/layouts/Base.astro` (lines 1–9):

```astro
---
import SEO from '@/components/SEO.astro';
import '@/styles/global.css';

interface Props {
  title?: string;
  description?: string;
  route?: 'home' | 'thoughts';
}
const { title, description, route = 'home' } = Astro.props;
---
```

Then add `data-route={route}` to the opening `<body>` tag (currently line 19):

```astro
  <body data-route={route}>
```

- [ ] **Step 2: Pass `route="home"` from the home page**

In `src/pages/index.astro`, change `<Base>` to `<Base route="home">`:

```astro
<Base route="home">
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Base.astro src/pages/index.astro
git commit -m "feat(thoughts): thread route prop through Base.astro"
```

---

## Task 0.4: Stub `/thoughts` page

**Files:**
- Create: `src/pages/thoughts/index.astro`

- [ ] **Step 1: Create the stub**

`src/pages/thoughts/index.astro`:

```astro
---
import Base from '@/layouts/Base.astro';
import Nav from '@/components/Nav.astro';
import Footer from '@/components/Footer.astro';
---
<Base
  route="thoughts"
  title="Thoughts — Yonathan Raviv"
  description="Workflow notes, project deep-dives, and the occasional opinion."
>
  <Nav />
  <main class="thoughts-stub">
    <p class="crumb">// THOUGHTS</p>
    <h1>Thoughts</h1>
    <p class="lede">Placeholder for the transition spike. The real index lands in Phase 1.</p>
    <p class="back"><a href="/" data-thought-link>← back home</a></p>
  </main>
  <Footer />
</Base>

<style>
  main.thoughts-stub {
    position: relative;
    z-index: 10;
    padding: 160px var(--pad-x) 160px;
    max-width: 960px;
    margin: 0 auto;
  }
  .crumb {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
  }
  h1 {
    font-family: var(--display);
    font-size: clamp(40px, 8vw, 64px);
    color: var(--text-bright);
    letter-spacing: 0.04em;
    margin: 12px 0 14px;
  }
  .lede {
    color: var(--text);
    font-size: 16px;
    line-height: 1.6;
    max-width: 60ch;
  }
  .back {
    margin-top: 32px;
  }
  .back a {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent);
    text-decoration: none;
  }
  .back a:hover {
    color: var(--text-bright);
  }
  @media (max-width: 720px) {
    main.thoughts-stub { padding: 96px var(--pad-x) 96px; }
  }
</style>
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 3: Visual sanity check**

```bash
npm run dev
```

Visit `http://localhost:4321/thoughts`. Expected:
- Page renders with grain / scanlines / vignette / CRT pulse overlays (inherited from `Base.astro`).
- Title "Thoughts", lede paragraph, "← back home" link.
- Nav at top shows **Thoughts** highlighted (orange + ↗ — though active state isn't wired yet, that's Task 0.9).
- Clicking "← back home" jumps to `/` with a normal full-page navigation (no transition yet). Expected.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/pages/thoughts/index.astro
git commit -m "feat(thoughts): stub /thoughts placeholder page"
```

---

## Task 0.5: Create the transition overlay component

**Files:**
- Create: `src/components/ThoughtsTransition.astro`
- Modify: `src/layouts/Base.astro`

- [ ] **Step 1: Create the overlay component**

`src/components/ThoughtsTransition.astro`:

```astro
---
// Blade-sweep page transition overlay. Inert by default; styled responses
// are driven by data-tx-state on this element and a `tx-arriving` class on
// <html> set by an inline head script when arriving via the transition.
---
<div class="tx" id="tx" aria-hidden="true" data-tx-state="idle">
  <div class="tx-panel"></div>
  <div class="tx-edge"></div>
  <div class="tx-scan"></div>
</div>

<style is:global>
  /* z-index: above everything — nav is 50, cursor 9998, hero stage ~6.
     We sit at 9999. pointer-events:none so we never block clicks. */
  .tx {
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: none;
    overflow: hidden;
    /* idle state is invisible */
    opacity: 1;
  }
  .tx[data-tx-state="idle"] .tx-panel,
  .tx[data-tx-state="idle"] .tx-edge,
  .tx[data-tx-state="idle"] .tx-scan {
    opacity: 0;
  }

  /* Panel: the dark wedge that follows the blade. */
  .tx-panel {
    position: absolute;
    inset: 0;
    background: #0a0a0a;
    /* default off-screen wedge */
    clip-path: polygon(-30% -30%, -30% -30%, -30% -30%, -30% -30%);
    will-change: clip-path, opacity;
  }

  /* Scan texture layered on the panel — quiet, on-brand. */
  .tx-scan {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      rgba(255, 111, 89, 0.06) 0 2px,
      transparent 2px 5px
    );
    /* same clip as panel during animation — controlled via JS sibling state */
    clip-path: polygon(-30% -30%, -30% -30%, -30% -30%, -30% -30%);
    will-change: clip-path, opacity;
    mix-blend-mode: overlay;
  }

  /* Edge: the glowing blade line. 220% wide so it always overshoots. */
  .tx-edge {
    position: absolute;
    top: 0;
    left: 0;
    width: 220%;
    height: 6px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--accent) 30%,
      #fff 50%,
      var(--accent) 70%,
      transparent
    );
    box-shadow:
      0 0 20px var(--accent),
      0 0 40px var(--accent);
    transform: rotate(-22deg) translate(-80%, -20%);
    opacity: 0;
    will-change: transform, opacity;
  }

  /* ─── ENTER (forward sweep, top-left → bottom-right) ─── */
  .tx[data-tx-state="enter"] .tx-panel,
  .tx[data-tx-state="enter"] .tx-scan {
    animation: tx-panel-enter 620ms cubic-bezier(0.7, 0, 0.2, 1) forwards;
  }
  .tx[data-tx-state="enter"] .tx-edge {
    animation: tx-edge-enter 620ms cubic-bezier(0.7, 0, 0.2, 1) forwards;
  }
  @keyframes tx-panel-enter {
    0%   { clip-path: polygon(-30% -30%, -30% -30%, -30% -30%, -30% -30%); opacity: 1; }
    100% { clip-path: polygon(-30% -30%, 130% -30%, 130% 130%, -30% 130%); opacity: 1; }
  }
  @keyframes tx-edge-enter {
    0%   { transform: rotate(-22deg) translate(-80%, -20%); opacity: 0; }
    15%  { opacity: 1; }
    100% { transform: rotate(-22deg) translate(20%, 90%); opacity: 1; }
  }

  /* ─── HOLD (panel fully covers) ─── */
  .tx[data-tx-state="hold"] .tx-panel,
  .tx[data-tx-state="hold"] .tx-scan {
    clip-path: polygon(-30% -30%, 130% -30%, 130% 130%, -30% 130%);
    opacity: 1;
  }
  .tx[data-tx-state="hold"] .tx-edge {
    transform: rotate(-22deg) translate(20%, 90%);
    opacity: 1;
  }

  /* ─── EXIT (arrival sweep, top-right → bottom-left) ─── */
  .tx[data-tx-state="exit"] .tx-panel,
  .tx[data-tx-state="exit"] .tx-scan {
    animation: tx-panel-exit 700ms cubic-bezier(0.7, 0, 0.2, 1) forwards;
  }
  .tx[data-tx-state="exit"] .tx-edge {
    animation: tx-edge-exit 700ms cubic-bezier(0.7, 0, 0.2, 1) forwards;
  }
  @keyframes tx-panel-exit {
    0%   { clip-path: polygon(-30% -30%, 130% -30%, 130% 130%, -30% 130%); opacity: 1; }
    100% { clip-path: polygon(130% 130%, 130% 130%, 130% 130%, 130% 130%); opacity: 1; }
  }
  @keyframes tx-edge-exit {
    0%   { transform: rotate(22deg) translate(80%, -20%); opacity: 0; }
    15%  { opacity: 1; }
    100% { transform: rotate(22deg) translate(-20%, 90%); opacity: 1; }
  }

  /* FOUC-prevention: when arriving via transition, the overlay
     covers the page from the very first paint. This is the state that
     the exit animation animates *away from*. */
  html.tx-arriving .tx {
    pointer-events: auto; /* block stray clicks during exit */
  }
  html.tx-arriving .tx .tx-panel,
  html.tx-arriving .tx .tx-scan {
    clip-path: polygon(-30% -30%, 130% -30%, 130% 130%, -30% 130%);
    opacity: 1;
  }
  html.tx-arriving .tx .tx-edge {
    /* mirror of the enter end-state, ready to start the exit sweep */
    transform: rotate(22deg) translate(80%, -20%);
    opacity: 0;
  }

  /* Reduced motion: no overlay animations at all. global.css already
     reduces all transition/animation durations to 0.001ms under reduce. */
  @media (prefers-reduced-motion: reduce) {
    .tx { display: none !important; }
  }
</style>
```

- [ ] **Step 2: Render the overlay from `Base.astro`**

In `src/layouts/Base.astro`, add the import and render the component just inside `<body>`:

```astro
---
import SEO from '@/components/SEO.astro';
import ThoughtsTransition from '@/components/ThoughtsTransition.astro';
import '@/styles/global.css';

interface Props {
  title?: string;
  description?: string;
  route?: 'home' | 'thoughts';
}
const { title, description, route = 'home' } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <SEO {title} {description} />
    <script is:inline>
      // FOUC-prevention for the blade-sweep arrival: applied BEFORE first paint
      // so the overlay covers the destination page from frame 0.
      try {
        if (sessionStorage.getItem('tx-arrive') === '1') {
          document.documentElement.classList.add('tx-arriving');
        }
      } catch (e) { /* sessionStorage may throw in private mode */ }
    </script>
  </head>
  <body data-route={route}>
    <div class="grain" aria-hidden="true"></div>
    <div class="scanlines" aria-hidden="true"></div>
    <div class="vignette" aria-hidden="true"></div>
    <div class="crt-pulse" aria-hidden="true"></div>
    <div class="cur-ring" id="curRing" aria-hidden="true"></div>
    <div class="cur-dot" id="curDot" aria-hidden="true"></div>
    <ThoughtsTransition />

    <slot />

    <script>
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
    </script>
  </body>
</html>
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 4: Visual sanity check (overlay is invisible while idle)**

```bash
npm run dev
```

Visit `http://localhost:4321/`. Expected:
- Page looks identical to before — no orange flash, no visible overlay.
- DevTools → Elements: `<div class="tx" id="tx" data-tx-state="idle">` exists in the DOM.
- DevTools → Console: no errors.

Manual test the FOUC class works:
1. In DevTools console run `sessionStorage.setItem('tx-arrive', '1'); location.reload();`
2. Expected: page loads with the page **fully black** (the panel is covering everything). No content is visible.
3. Clear it: `sessionStorage.removeItem('tx-arrive'); document.documentElement.classList.remove('tx-arriving'); location.reload();`
4. Page should look normal again.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/ThoughtsTransition.astro src/layouts/Base.astro
git commit -m "feat(thoughts): add blade-sweep overlay component + FOUC head script"
```

---

## Task 0.6: Implement the transition runtime — forward sweep

**Files:**
- Create: `src/lib/thoughts-transition.ts`
- Modify: `src/layouts/Base.astro` (mount the module)

- [ ] **Step 1: Create the runtime module**

`src/lib/thoughts-transition.ts`:

```ts
// Blade-sweep page transition. Intercepts clicks on [data-thought-link],
// plays the forward sweep, prefetches the destination, then navigates.
//
// On the destination page, the overlay is already covering the viewport
// (set by the inline FOUC script in Base.astro), and we play the exit
// sweep to reveal the page.
//
// Falls back to normal navigation under prefers-reduced-motion or when
// the click had a modifier / used the middle button.

const ENTER_MS = 620;
const HOLD_FLOOR_MS = 200;
const NAV_MAX_WAIT_MS = 2000;
const EXIT_MS = 700;
const ARRIVE_FLAG = 'tx-arrive';

function isReducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function shouldBypass(e: MouseEvent): boolean {
  if (e.button !== 0) return true;                 // middle / right
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return true;
  if (isReducedMotion()) return true;
  return false;
}

function lockScroll(): void {
  document.documentElement.style.overflow = 'hidden';
}
function unlockScroll(): void {
  document.documentElement.style.overflow = '';
}

function prefetch(url: string): Promise<void> {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    link.as = 'document';
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
    // Hard cap so we never hang on a flaky network.
    setTimeout(() => resolve(), NAV_MAX_WAIT_MS);
  });
}

function setState(tx: HTMLElement, state: 'idle' | 'enter' | 'hold' | 'exit'): void {
  tx.dataset.txState = state;
}

async function playForward(href: string): Promise<void> {
  const tx = document.getElementById('tx');
  if (!tx) {
    window.location.href = href;
    return;
  }
  lockScroll();
  setState(tx, 'enter');

  const prefetchPromise = prefetch(href);
  await new Promise((r) => setTimeout(r, ENTER_MS));
  setState(tx, 'hold');

  const holdStart = performance.now();
  await prefetchPromise;
  const heldFor = performance.now() - holdStart;
  if (heldFor < HOLD_FLOOR_MS) {
    await new Promise((r) => setTimeout(r, HOLD_FLOOR_MS - heldFor));
  }

  // Flag the next page to play the exit sweep.
  try { sessionStorage.setItem(ARRIVE_FLAG, '1'); } catch (e) { /* ignore */ }
  window.location.href = href;
}

function playArrival(): void {
  const tx = document.getElementById('tx');
  if (!tx) {
    document.documentElement.classList.remove('tx-arriving');
    try { sessionStorage.removeItem(ARRIVE_FLAG); } catch (e) { /* ignore */ }
    return;
  }
  // The overlay is currently covering the page (via html.tx-arriving CSS).
  // Switch into the explicit `exit` animated state on the next frame, then
  // clean up after the animation finishes.
  requestAnimationFrame(() => {
    setState(tx, 'exit');
    setTimeout(() => {
      setState(tx, 'idle');
      document.documentElement.classList.remove('tx-arriving');
      unlockScroll();
      try { sessionStorage.removeItem(ARRIVE_FLAG); } catch (e) { /* ignore */ }
    }, EXIT_MS);
  });
}

function onClick(e: MouseEvent): void {
  const target = e.target as Element | null;
  if (!target) return;
  const link = target.closest('a[data-thought-link]') as HTMLAnchorElement | null;
  if (!link) return;
  if (shouldBypass(e)) return;

  const href = link.getAttribute('href');
  if (!href) return;
  // Only intercept same-origin navigations.
  try {
    const u = new URL(href, window.location.href);
    if (u.origin !== window.location.origin) return;
  } catch (err) {
    return;
  }

  e.preventDefault();
  playForward(href).catch(() => {
    // If anything blows up, fall back to direct nav.
    window.location.href = href;
  });
}

export function mountThoughtsTransition(): void {
  // Replay arrival animation if we got here via a transition click.
  let shouldArrive = false;
  try { shouldArrive = sessionStorage.getItem(ARRIVE_FLAG) === '1'; } catch (e) { /* ignore */ }
  if (shouldArrive) playArrival();

  document.addEventListener('click', onClick, { capture: true });
}
```

- [ ] **Step 2: Mount the module from `Base.astro`**

In `src/layouts/Base.astro`'s `<script>` block, add the import and the call:

```astro
    <script>
      import { mountReveal }              from '@/lib/reveal';
      import { mountCursor }              from '@/lib/cursor';
      import { mountActiveNav }           from '@/lib/active-nav';
      import { mountSmoothScroll }        from '@/lib/smooth-scroll';
      import { mountNavMenu }             from '@/lib/nav-menu';
      import { mountThoughtsTransition } from '@/lib/thoughts-transition';
      mountSmoothScroll();
      mountReveal();
      mountCursor();
      mountActiveNav();
      mountNavMenu();
      mountThoughtsTransition();
    </script>
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 4: Visual sanity check — forward sweep only**

```bash
npm run dev
```

Visit `http://localhost:4321/`. Click the **Thoughts** nav link. Expected:
- Blade-edge enters from off-canvas top-left, sweeps diagonally across the viewport.
- Panel turns the viewport fully black behind it.
- A brief hold, then the page navigates to `/thoughts`.
- On `/thoughts`, the overlay is **still covering the page** (the arrival sweep is added in Task 0.7).
- Open DevTools console, run `sessionStorage.removeItem('tx-arrive'); document.documentElement.classList.remove('tx-arriving');` to escape and verify `/thoughts` content rendered correctly underneath.

Don't commit yet — we're mid-feature.

- [ ] **Step 5: Commit**

```bash
git add src/lib/thoughts-transition.ts src/layouts/Base.astro
git commit -m "feat(thoughts): forward blade-sweep + navigation interception"
```

---

## Task 0.7: Visual sanity for arrival sweep

The arrival sweep is already implemented in `playArrival()` above. This task just verifies it works end-to-end.

- [ ] **Step 1: Run the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test forward + arrival**

Visit `/`. Click **Thoughts**. Expected, end to end:
1. Blade enters from top-left, panel goes black behind it (~620ms).
2. Brief hold (~200ms+).
3. Navigation to `/thoughts`.
4. Page loads with the panel still covering.
5. Blade re-enters from the **top-right** (mirror angle), sweeps diagonally, drags the panel off the bottom-left (~700ms).
6. `/thoughts` content is revealed.

- [ ] **Step 3: Test reverse path**

On `/thoughts`, click the **← back home** link. Expected:
- Forward sweep again (the click is intercepted because the link has `data-thought-link`).
- Lands on `/`, arrival sweep replays.
- Page is fully visible after arrival.

- [ ] **Step 4: Test bypasses**

- Hold ⌘ (or Ctrl on Linux) and click **Thoughts** — should open in a new tab without any transition.
- Middle-click the link — should open in a new tab without any transition.
- In DevTools, Rendering panel, enable "Emulate CSS media feature prefers-reduced-motion: reduce". Click **Thoughts** — should navigate instantly with no transition.
- Disable the emulation when done.

Stop the dev server.

- [ ] **Step 5: Commit** (cosmetic — captures the verified state in history)

```bash
git commit --allow-empty -m "test(thoughts): verify blade-sweep forward+arrival on stub page"
```

---

## Task 0.8: Active-nav highlight on non-home routes

Currently `active-nav.ts` runs scroll-spy against `data-anchor` sections; on `/thoughts/*` there are no anchors so nothing highlights. We want **Thoughts** to look active when the URL is under `/thoughts`.

**Files:**
- Modify: `src/lib/active-nav.ts`

- [ ] **Step 1: Replace `active-nav.ts`**

```ts
// Scroll-spy on the home page; static highlight on non-home routes.
//
// On `/`, walks `data-anchor` links + matching sections to highlight the
// section currently in view. On any non-home route, marks the link whose
// href matches `location.pathname` as `.active` and skips the scroll spy.

export function mountActiveNav(): void {
  const isHome =
    window.location.pathname === '/' || window.location.pathname === '/index.html';

  if (!isHome) {
    // Static highlight for top-level routes (e.g. /thoughts/*).
    const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')];
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    links.forEach((a) => {
      const href = a.getAttribute('href') ?? '';
      // Only consider absolute-path links to top-level routes.
      if (!href.startsWith('/')) return;
      const trimmed = href.replace(/\/+$/, '') || '/';
      if (path === trimmed || path.startsWith(trimmed + '/')) {
        a.classList.add('active');
      }
    });
    return;
  }

  // Home-page scroll spy.
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

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 3: Visual sanity check**

```bash
npm run dev
```

- Visit `/`. Scroll: existing brackets-on-active-link behaviour still works for Who/What/Where/How/Contact. (The Thoughts link is `.blog`-styled and doesn't show brackets; that's expected.)
- Visit `/thoughts`. The Thoughts link should now have the `.active` class (DevTools → Elements → inspect the `<a>` in nav). It's already orange because of `.blog`; the `.active` class is mainly a hook in case future styling wants it.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/lib/active-nav.ts
git commit -m "feat(thoughts): static active-nav highlight on non-home routes"
```

---

## Task 0.9: Full transition smoke test

Manual checklist. No code changes.

- [ ] **Step 1: Build and preview**

```bash
npm run build
```

Expected: build succeeds with no errors. `dist/thoughts/index.html` exists.

```bash
npm run preview
```

Open `http://localhost:4321/` (or whatever port `astro preview` reports).

- [ ] **Step 2: Run the smoke list**

Click through each:

1. `/` → click **Thoughts** in desktop nav → arrives at `/thoughts` with full transition.
2. `/thoughts` → click **← back home** → arrives at `/` with full transition.
3. `/` → resize browser to mobile width → open hamburger menu → tap **Thoughts** → transition plays, arrives at `/thoughts`.
4. ⌘/Ctrl-click **Thoughts** → opens in a new tab, no transition in original tab.
5. DevTools → Rendering → emulate reduced motion → click **Thoughts** → instant navigation, no overlay flash.
6. DevTools → Network → throttle to "Slow 3G" → click **Thoughts** → forward sweep plays, panel holds black until destination is ready, then arrival sweep plays.
7. Browser back button from `/thoughts` → returns to `/` with **no** overlay flash (sessionStorage flag isn't set on history navigation).

Stop the preview server (Ctrl+C).

- [ ] **Step 3: Commit (no-op marker)**

```bash
git commit --allow-empty -m "test(thoughts): end-to-end transition smoke pass"
```

---

## Task 0.10: 🚦 DECISION GATE — commit or pivot

This is a **manual, subjective** checkpoint. Do not proceed to Phase 1 until you have made the call.

- [ ] **Step 1: Look at the transition with fresh eyes**

Run `npm run preview` and use the site for a couple of minutes. Click around. Show it to a friend if you can. Ask yourself:
- Does the blade sweep feel cinematic without feeling slow?
- Does it match the site's existing katana motif convincingly?
- Is the dark panel hold too long? Too short?
- Does anything jank? (Look for jumps, FOUC, mistimed exits.)

- [ ] **Step 2: Make the call**

**If you commit:** proceed to Phase 1.

**If you pivot:** the architecture is intentionally isolated to two files (`ThoughtsTransition.astro` + `thoughts-transition.ts`). To switch to mockup A (CRT power-off) or B (scanline boot), only those two files need to change. Open a new branch and re-spec the transition before changing code:

```bash
git checkout -b feature/thoughts-transition-pivot
```

Then update the spec at `docs/superpowers/specs/2026-05-28-thoughts-page-design.md` (§5) and rewrite Tasks 0.5–0.7 of this plan. The rest of Phase 0 (nav rename, stub, active-nav) stays.

- [ ] **Step 3: If committing, mark the gate passed**

```bash
git commit --allow-empty -m "chore(thoughts): commit to blade-sweep transition; proceeding to Phase 1"
```

---

# Phase 1 — Everything else

Only start once Task 0.10 has been resolved with "commit".

---

## Task 1.1: Add Phase 1 dependencies

**Files:**
- Modify: `package.json` (via `npm install`)

- [ ] **Step 1: Install runtime deps**

```bash
npm install @astrojs/rss satori @resvg/resvg-js
```

Expected: `package.json` now lists these in `dependencies`; `package-lock.json` updates; no errors.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(thoughts): add @astrojs/rss, satori, @resvg/resvg-js"
```

---

## Task 1.2: Create the `thoughts` content collection schema

**Files:**
- Create: `src/content/config.ts`

- [ ] **Step 1: Define the collection**

`src/content/config.ts`:

```ts
import { defineCollection, z } from 'astro:content';

const thoughts = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string().max(80),
      description: z.string().min(40).max(180),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      cover: image().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { thoughts };
```

- [ ] **Step 2: Add an empty seed file so Astro's content type-generation has something to work with**

Create `src/content/thoughts/.gitkeep` (empty file). Astro will warn if the collection dir is missing.

```bash
mkdir -p src/content/thoughts
touch src/content/thoughts/.gitkeep
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`. Astro will regenerate `.astro/content-modules.mjs` and `src/env.d.ts`-equivalent types — this happens automatically.

- [ ] **Step 4: Commit**

```bash
git add src/content/config.ts src/content/thoughts/.gitkeep
git commit -m "feat(thoughts): define thoughts content collection schema"
```

---

## Task 1.3: Create the helpers module

**Files:**
- Create: `src/lib/thoughts.ts`

- [ ] **Step 1: Write the helpers**

`src/lib/thoughts.ts`:

```ts
// Shared helpers for the thoughts collection. Centralizes:
//   - the production draft-filter (so RSS / sitemap / pages don't disagree)
//   - reading-time computation (used by index, post, JSON-LD, OG)

import { getCollection, type CollectionEntry } from 'astro:content';

export async function getPublishedThoughts(): Promise<CollectionEntry<'thoughts'>[]> {
  const all = await getCollection('thoughts');
  const filtered = import.meta.env.PROD ? all.filter((p) => !p.data.draft) : all;
  return filtered.sort((a, b) => +b.data.date - +a.data.date);
}

export function readingTimeMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function fmtDate(d: Date): string {
  // 2026.05.28 — matches the mono date style used across the site.
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/thoughts.ts
git commit -m "feat(thoughts): add getPublishedThoughts/readingTime/fmtDate helpers"
```

---

## Task 1.4: Flesh out the `/thoughts` index page

**Files:**
- Modify: `src/pages/thoughts/index.astro` (replace the stub entirely)

- [ ] **Step 1: Replace the stub**

`src/pages/thoughts/index.astro`:

```astro
---
import Base from '@/layouts/Base.astro';
import Nav from '@/components/Nav.astro';
import Footer from '@/components/Footer.astro';
import { getPublishedThoughts, readingTimeMinutes, fmtDate } from '@/lib/thoughts';

const posts = await getPublishedThoughts();
---
<Base
  route="thoughts"
  title="Thoughts — Yonathan Raviv"
  description="Workflow notes, project deep-dives, and the occasional opinion."
>
  <Nav />
  <main class="thoughts-index">
    <header class="thi-head">
      <p class="crumb">// THOUGHTS</p>
      <h1>Thoughts</h1>
      <p class="lede">
        Workflow notes, project deep-dives, and the occasional opinion. Updated when something
        is worth writing about.
      </p>
      <p class="hdr-meta">
        [ {String(posts.length).padStart(2, '0')} / POSTS ]
        <span aria-hidden="true">·</span>
        <a href="/rss.xml">RSS</a>
      </p>
    </header>

    {posts.length === 0 ? (
      <p class="empty">&gt; NO_TRANSMISSIONS_YET_<span class="cur" aria-hidden="true">_</span></p>
    ) : (
      <ol class="thi-list">
        {posts.map((post, i) => (
          <li>
            <a
              href={`/thoughts/${post.slug}`}
              class="thi-row"
              data-thought-link
              data-cursor="reveal"
            >
              <div class="meta-line">
                <span class="idx">{String(i + 1).padStart(2, '0')}</span>
                <time datetime={post.data.date.toISOString()}>{fmtDate(post.data.date)}</time>
                <span class="read">{readingTimeMinutes(post.body)} MIN</span>
              </div>
              <h2>{post.data.title}</h2>
              <p class="excerpt">{post.data.description}</p>
            </a>
          </li>
        ))}
      </ol>
    )}
  </main>
  <Footer />
</Base>

<style>
  main.thoughts-index {
    position: relative;
    z-index: 10;
    padding: 160px var(--pad-x) 160px;
    max-width: 960px;
    margin: 0 auto;
  }
  @media (max-width: 720px) {
    main.thoughts-index { padding: 96px var(--pad-x) 96px; }
  }

  .thi-head { margin-bottom: 56px; }
  .crumb {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
  }
  h1 {
    font-family: var(--display);
    font-size: clamp(40px, 8vw, 64px);
    line-height: 1.02;
    letter-spacing: 0.04em;
    color: var(--text-bright);
    margin: 12px 0 14px;
  }
  .lede {
    color: var(--text);
    font-size: 16px;
    line-height: 1.6;
    max-width: 60ch;
  }
  .hdr-meta {
    margin-top: 18px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .hdr-meta a {
    color: var(--accent);
    text-decoration: none;
  }
  .hdr-meta a:hover { color: var(--text-bright); }

  .thi-list {
    list-style: none;
    padding: 0;
    margin: 0;
    border-top: 1px dashed rgba(191, 178, 155, 0.16);
  }
  .thi-row {
    display: block;
    padding: 22px 0;
    border-bottom: 1px dashed rgba(191, 178, 155, 0.16);
    text-decoration: none;
    color: inherit;
  }
  .meta-line {
    display: flex;
    gap: 16px;
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 8px;
  }
  .meta-line .idx { color: var(--accent); }
  .meta-line time { font-variant-numeric: tabular-nums; }

  .thi-row h2 {
    font-family: var(--display);
    font-size: clamp(22px, 3.4vw, 30px);
    line-height: 1.05;
    letter-spacing: 0.04em;
    color: var(--text-bright);
    margin: 0 0 6px;
    /* bracket reveal on hover (reserve space at opacity 0) */
    position: relative;
    transition: color 0.25s;
  }
  .thi-row h2::before,
  .thi-row h2::after {
    color: var(--accent);
    opacity: 0;
    transition: opacity 0.25s;
  }
  .thi-row h2::before { content: "[ "; margin-right: 2px; }
  .thi-row h2::after  { content: " ]"; margin-left: 2px; }
  .thi-row:hover h2,
  .thi-row:focus-visible h2 { color: var(--accent); }
  .thi-row:hover h2::before,
  .thi-row:hover h2::after,
  .thi-row:focus-visible h2::before,
  .thi-row:focus-visible h2::after { opacity: 1; }
  .thi-row:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 6px;
    border-radius: 2px;
  }

  .excerpt {
    color: var(--text);
    font-size: 14px;
    line-height: 1.55;
    max-width: 70ch;
  }

  .empty {
    font-family: var(--mono);
    font-size: 13px;
    letter-spacing: 0.16em;
    color: var(--text-dim);
  }
  .empty .cur { color: var(--accent); animation: pulse 1.1s steps(1) infinite; }
</style>
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 3: Visual sanity check (empty state)**

```bash
npm run dev
```

Visit `http://localhost:4321/thoughts`. With no posts yet (Task 1.12 adds the first), expected:
- Header renders: title, lede, `[ 00 / POSTS ] · RSS`.
- Empty state line `> NO_TRANSMISSIONS_YET_` with a blinking cursor.
- Nav still highlights Thoughts.
- Clicking Thoughts from `/` still plays the transition.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/pages/thoughts/index.astro
git commit -m "feat(thoughts): editorial /thoughts index page"
```

---

## Task 1.5: Extend SEO props on `Base.astro` and `SEO.astro`

We need to pass `ogImage`, `ogType`, `articlePublished`, `articleModified`, and an extra `jsonLd` array into `SEO.astro`.

**Files:**
- Modify: `src/components/SEO.astro`
- Modify: `src/layouts/Base.astro`

- [ ] **Step 1: Extend `SEO.astro`**

Replace `src/components/SEO.astro` entirely:

```astro
---
import { site, defaultSEO, personSchema, websiteSchema } from "@/content";

interface Props {
    title?: string;
    description?: string;
    ogImage?: string;
    ogType?: 'profile' | 'article' | 'website';
    articlePublished?: string;  // ISO datetime
    articleModified?: string;   // ISO datetime
    jsonLd?: object[];          // extra JSON-LD blocks to emit
}

const {
    title = defaultSEO.title,
    description = defaultSEO.description,
    ogImage = defaultSEO.ogImage,
    ogType = 'profile',
    articlePublished,
    articleModified,
    jsonLd = [],
} = Astro.props;

const canonical = new URL(Astro.url.pathname, site.url).href;
const absoluteOgImage = new URL(ogImage, site.url).href;
---

<title>{title}</title>
<meta name="description" content={description} />
<meta name="author" content={site.name} />
<link rel="canonical" href={canonical} />
<link rel="alternate" type="application/rss+xml" title="Thoughts — Yonathan Raviv" href="/rss.xml" />

<meta property="og:type" content={ogType} />
<meta property="og:site_name" content={site.name} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:image" content={absoluteOgImage} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="en_US" />
{ogType === 'profile' && (
  <>
    <meta property="profile:first_name" content="Yonathan" />
    <meta property="profile:last_name" content="Raviv" />
  </>
)}
{ogType === 'article' && articlePublished && (
  <meta property="article:published_time" content={articlePublished} />
)}
{ogType === 'article' && articleModified && (
  <meta property="article:modified_time" content={articleModified} />
)}
{ogType === 'article' && (
  <meta property="article:author" content={site.name} />
)}

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={absoluteOgImage} />
<meta name="twitter:creator" content={site.twitter} />

<meta name="theme-color" content="#151515" />
<meta name="color-scheme" content="dark" />

<script
    is:inline
    type="application/ld+json"
    set:html={JSON.stringify(personSchema)}
/>
<script
    is:inline
    type="application/ld+json"
    set:html={JSON.stringify(websiteSchema)}
/>
{jsonLd.map((block) => (
  <script is:inline type="application/ld+json" set:html={JSON.stringify(block)} />
))}
```

- [ ] **Step 2: Thread new props through `Base.astro`**

In `src/layouts/Base.astro`, expand the `Props` interface and pass everything to `<SEO>`:

```astro
---
import SEO from '@/components/SEO.astro';
import ThoughtsTransition from '@/components/ThoughtsTransition.astro';
import '@/styles/global.css';

interface Props {
  title?: string;
  description?: string;
  route?: 'home' | 'thoughts';
  ogImage?: string;
  ogType?: 'profile' | 'article' | 'website';
  articlePublished?: string;
  articleModified?: string;
  jsonLd?: object[];
}
const {
  title,
  description,
  route = 'home',
  ogImage,
  ogType,
  articlePublished,
  articleModified,
  jsonLd,
} = Astro.props;
---
```

…and replace the `<SEO ... />` call:

```astro
    <SEO
      {title}
      {description}
      {ogImage}
      {ogType}
      {articlePublished}
      {articleModified}
      {jsonLd}
    />
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 4: Visual sanity check**

```bash
npm run dev
```

Visit `/` and `/thoughts`. In DevTools → Elements → `<head>`:
- `<link rel="alternate" type="application/rss+xml" ...>` is present on both pages.
- `og:type` is `profile` (default).
- Two `<script type="application/ld+json">` blocks (Person + WebSite) on both pages.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/SEO.astro src/layouts/Base.astro
git commit -m "feat(thoughts): extend SEO with ogType/article/json-ld + RSS alternate link"
```

---

## Task 1.6: Add JSON-LD helpers for posts and the blog index

**Files:**
- Modify: `src/content/seo.ts`
- Modify: `src/content/index.ts` (re-export the new helpers)

- [ ] **Step 1: Append helpers to `src/content/seo.ts`**

Append to the end of the existing file:

```ts
import type { CollectionEntry } from 'astro:content';

export function blogPostingSchema(
  post: CollectionEntry<'thoughts'>,
  readMin: number
) {
  const slug = post.slug;
  const wordCount = post.body.trim().split(/\s+/).filter(Boolean).length;
  const published = post.data.date.toISOString();
  const modified = (post.data.updated ?? post.data.date).toISOString();
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${site.url}/thoughts/${slug}#post`,
    mainEntityOfPage: `${site.url}/thoughts/${slug}`,
    headline: post.data.title,
    description: post.data.description,
    datePublished: published,
    dateModified: modified,
    author: { '@id': `${site.url}/#person` },
    publisher: { '@id': `${site.url}/#person` },
    image: `${site.url}/og/thoughts/${slug}.png`,
    inLanguage: 'en',
    timeRequired: `PT${readMin}M`,
    wordCount,
  };
}

export function blogIndexSchema(posts: CollectionEntry<'thoughts'>[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${site.url}/thoughts/#blog`,
    url: `${site.url}/thoughts/`,
    name: 'Thoughts — Yonathan Raviv',
    author: { '@id': `${site.url}/#person` },
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.data.title,
      url: `${site.url}/thoughts/${p.slug}`,
      datePublished: p.data.date.toISOString(),
    })),
  };
}
```

- [ ] **Step 2: Re-export from `src/content/index.ts`**

Replace `src/content/index.ts`:

```ts
export { site } from './site';
export { navLinks } from './nav';
export { hero } from './hero';
export { who } from './who';
export { what, projects } from './what';
export { where, roles } from './where';
export { how, skillGroups } from './how';
export { contact, socials } from './contact';
export {
  defaultSEO,
  personSchema,
  websiteSchema,
  blogPostingSchema,
  blogIndexSchema,
} from './seo';
export type * from './_types';
```

- [ ] **Step 3: Add the `Blog` JSON-LD to the index page**

In `src/pages/thoughts/index.astro`, update the frontmatter:

```astro
---
import Base from '@/layouts/Base.astro';
import Nav from '@/components/Nav.astro';
import Footer from '@/components/Footer.astro';
import { getPublishedThoughts, readingTimeMinutes, fmtDate } from '@/lib/thoughts';
import { blogIndexSchema } from '@/content';

const posts = await getPublishedThoughts();
const jsonLd = [blogIndexSchema(posts)];
---
```

…and pass `jsonLd` to `<Base>`:

```astro
<Base
  route="thoughts"
  title="Thoughts — Yonathan Raviv"
  description="Workflow notes, project deep-dives, and the occasional opinion."
  {jsonLd}
>
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 5: Visual sanity check**

```bash
npm run dev
```

Visit `/thoughts`. DevTools → Elements → `<head>`: should now have **three** JSON-LD blocks (Person, WebSite, Blog). Validate manually that the Blog block's `blogPost` array is empty (no posts yet) and `name` reads `Thoughts — Yonathan Raviv`.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/content/seo.ts src/content/index.ts src/pages/thoughts/index.astro
git commit -m "feat(thoughts): JSON-LD helpers + Blog schema on /thoughts"
```

---

## Task 1.7: Implement the post page + Shiki theme

**Files:**
- Create: `src/pages/thoughts/[...slug].astro`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Set Shiki theme in `astro.config.mjs`**

Replace `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://yonathanraviv.dev',
  output: 'static',
  compressHTML: true,
  integrations: [sitemap()],
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  build: {
    inlineStylesheets: 'auto',
  },
  markdown: {
    shikiConfig: {
      theme: 'material-theme-palenight',
      wrap: false,
    },
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
```

- [ ] **Step 2: Create the post page**

`src/pages/thoughts/[...slug].astro`:

```astro
---
import Base from '@/layouts/Base.astro';
import Nav from '@/components/Nav.astro';
import Footer from '@/components/Footer.astro';
import { Image } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';
import { getPublishedThoughts, readingTimeMinutes, fmtDate } from '@/lib/thoughts';
import { blogPostingSchema } from '@/content';

export async function getStaticPaths() {
  const posts = await getPublishedThoughts();
  return posts.map((post) => ({ params: { slug: post.slug }, props: { post } }));
}

interface Props { post: CollectionEntry<'thoughts'>; }
const { post } = Astro.props as Props;
const { Content } = await post.render();
const readMin = readingTimeMinutes(post.body);
const jsonLd = [blogPostingSchema(post, readMin)];
const isoDate = post.data.date.toISOString();
const isoUpdated = (post.data.updated ?? post.data.date).toISOString();
---
<Base
  route="thoughts"
  title={`${post.data.title} — Yonathan Raviv`}
  description={post.data.description}
  ogImage={`/og/thoughts/${post.slug}.png`}
  ogType="article"
  articlePublished={isoDate}
  articleModified={isoUpdated}
  {jsonLd}
>
  <Nav />
  <article class="thought">
    <header class="thought-head">
      <p class="crumb"><a href="/thoughts" data-thought-link>← THOUGHTS</a></p>
      <h1>{post.data.title}</h1>
      <p class="lede">{post.data.description}</p>
    </header>

    {post.data.cover && (
      <figure class="thought-cover">
        <Image
          src={post.data.cover}
          alt=""
          widths={[720, 1080, 1440]}
          sizes="(min-width: 900px) 720px, 100vw"
        />
      </figure>
    )}

    <div class="thought-body">
      <aside class="rail">
        <span class="label">// READ</span>
        <span class="val">{readMin} min</span>
        <span class="label">// PUBLISHED</span>
        <time class="val" datetime={isoDate}>{fmtDate(post.data.date)}</time>
        {post.data.updated && (
          <>
            <span class="label">// UPDATED</span>
            <time class="val" datetime={post.data.updated.toISOString()}>{fmtDate(post.data.updated)}</time>
          </>
        )}
        <span class="label">// PROGRESS</span>
        <div class="progress-track"><div class="progress-fill" data-thought-progress></div></div>
      </aside>

      <div class="prose">
        <Content />
      </div>
    </div>

    <footer class="thought-foot">
      <a href="/thoughts" class="back" data-thought-link>← MORE THOUGHTS</a>
    </footer>
  </article>
  <Footer />
</Base>

<style>
  /* ── article shell ─────────────────────────────────────────────── */
  article.thought {
    position: relative;
    z-index: 10;
    padding: 160px var(--pad-x) 96px;
    max-width: 960px;
    margin: 0 auto;
  }
  @media (max-width: 900px) {
    article.thought { padding: 96px var(--pad-x) 64px; }
  }

  /* ── header ────────────────────────────────────────────────────── */
  .thought-head { margin-bottom: 28px; }
  .crumb {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  .crumb a {
    color: var(--accent);
    text-decoration: none;
  }
  .crumb a:hover { color: var(--text-bright); }
  h1 {
    font-family: var(--display);
    font-size: clamp(36px, 6.5vw, 56px);
    line-height: 1.02;
    letter-spacing: 0.03em;
    color: var(--text-bright);
    margin: 14px 0 12px;
    max-width: 22ch;
  }
  .lede {
    color: var(--text);
    font-size: 16px;
    line-height: 1.55;
    max-width: 64ch;
  }

  /* ── cover image ───────────────────────────────────────────────── */
  .thought-cover {
    margin: 32px 0;
  }
  .thought-cover :global(img) {
    width: 100%;
    height: auto;
    max-height: 440px;
    object-fit: cover;
    border-radius: 4px;
    border: 1px solid rgba(191, 178, 155, 0.08);
    display: block;
  }

  /* ── 2-col body (rail + content) on desktop ────────────────────── */
  .thought-body {
    display: grid;
    grid-template-columns: 140px 32px 1fr;
    margin-top: 24px;
  }
  @media (max-width: 900px) {
    .thought-body { grid-template-columns: 1fr; }
  }

  .rail {
    grid-column: 1 / 2;
    position: sticky;
    top: 96px;
    align-self: start;
    padding-right: 0;
    border-right: 1px dashed rgba(191, 178, 155, 0.16);
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .rail .label { color: var(--accent); margin-top: 14px; }
  .rail .label:first-child { margin-top: 0; }
  .rail .val {
    color: var(--text);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: none;
    font-variant-numeric: tabular-nums;
  }
  .rail .progress-track {
    margin-top: 8px;
    width: 2px;
    height: 120px;
    background: rgba(191, 178, 155, 0.1);
    position: relative;
  }
  .rail .progress-fill {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 0%;
    background: var(--accent);
    transition: height 0.15s linear;
  }
  @media (prefers-reduced-motion: reduce) {
    .rail .progress-fill { transition: none; }
  }

  @media (max-width: 900px) {
    .rail {
      position: static;
      border-right: 0;
      border-bottom: 1px dashed rgba(191, 178, 155, 0.16);
      padding-bottom: 16px;
      margin-bottom: 24px;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 14px;
      align-items: baseline;
    }
    .rail .label { margin-top: 0; }
    .rail .progress-track { display: none; }
  }

  .prose {
    grid-column: 3 / 4;
    max-width: 64ch;
  }
  @media (max-width: 900px) {
    .prose { grid-column: 1 / 2; }
  }

  /* ── prose (markdown-rendered content) ─────────────────────────── */
  .prose :global(p) {
    color: var(--text);
    font-size: 16px;
    line-height: 1.65;
    margin: 12px 0;
  }
  @media (max-width: 720px) {
    .prose :global(p) { font-size: 15px; }
  }
  .prose :global(h2) {
    font-family: var(--display);
    font-size: 28px;
    letter-spacing: 0.04em;
    color: var(--text-bright);
    margin: 36px 0 8px;
  }
  .prose :global(h2)::before {
    content: "// ";
    font-family: var(--mono);
    font-size: 18px;
    letter-spacing: 0;
    color: var(--accent);
  }
  .prose :global(h3) {
    font-family: var(--display);
    font-size: 20px;
    letter-spacing: 0.04em;
    color: var(--text-bright);
    margin: 24px 0 6px;
  }
  .prose :global(ul),
  .prose :global(ol) {
    margin: 12px 0;
    padding-left: 24px;
    color: var(--text);
  }
  .prose :global(li) {
    margin: 6px 0;
    line-height: 1.6;
  }
  .prose :global(li::marker) { color: var(--accent); }

  .prose :global(a) {
    color: var(--text-bright);
    text-decoration: none;
    background-image: linear-gradient(var(--accent), var(--accent));
    background-repeat: no-repeat;
    background-position: 0 100%;
    background-size: 100% 1px;
    transition: color 0.25s, background-size 0.3s cubic-bezier(0.2, 0.7, 0.2, 1);
    padding-bottom: 1px;
  }
  .prose :global(a:hover) {
    color: var(--accent);
    background-size: 100% 2px;
  }
  .prose :global(a[href^="http"]:not([href*="yonathanraviv.dev"]))::after {
    content: " ↗";
    color: var(--accent);
  }

  .prose :global(blockquote) {
    border-left: 2px solid var(--accent);
    padding-left: 16px;
    margin: 18px 0;
    color: var(--text-bright);
    font-style: italic;
  }
  .prose :global(blockquote p) {
    color: var(--text-bright);
  }

  .prose :global(img) {
    width: 100%;
    height: auto;
    border-radius: 4px;
    border: 1px solid rgba(191, 178, 155, 0.08);
    margin: 18px 0 6px;
    display: block;
  }
  .prose :global(img + em) {
    display: block;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
    font-style: normal;
    margin: 0 0 18px;
  }

  .prose :global(hr) {
    border: 0;
    border-top: 1px dashed rgba(191, 178, 155, 0.16);
    margin: 32px 0;
  }

  /* inline code */
  .prose :global(:not(pre) > code) {
    font-family: var(--mono);
    font-size: 0.92em;
    background: rgba(255, 111, 89, 0.08);
    color: var(--accent);
    padding: 2px 5px;
    border-radius: 2px;
  }

  /* code blocks (Astro emits <pre class="astro-code" ...>) */
  .prose :global(pre.astro-code) {
    background: rgba(244, 238, 226, 0.03) !important;
    border-left: 2px solid var(--accent);
    border-radius: 0;
    padding: 14px 16px;
    margin: 18px 0;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.55;
  }
  .prose :global(pre.astro-code code) {
    font-family: var(--mono);
  }
  /* retint Shiki comments toward the muted text colour for readability */
  .prose :global(pre.astro-code .line .comment),
  .prose :global(pre.astro-code .line .punctuation.definition.comment) {
    color: var(--text-dim) !important;
    font-style: italic;
  }

  /* ── footer link ───────────────────────────────────────────────── */
  .thought-foot {
    margin-top: 64px;
    padding-top: 24px;
    border-top: 1px dashed rgba(191, 178, 155, 0.16);
  }
  .thought-foot .back {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent);
    text-decoration: none;
  }
  .thought-foot .back:hover { color: var(--text-bright); }
</style>
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`. (No real post yet, so the route just doesn't emit any pages — that's fine.)

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs src/pages/thoughts/[...slug].astro
git commit -m "feat(thoughts): post page layout + Shiki theme"
```

---

## Task 1.8: Reading-progress fill

**Files:**
- Create: `src/lib/reading-progress.ts`
- Modify: `src/layouts/Base.astro`

- [ ] **Step 1: Create the module**

`src/lib/reading-progress.ts`:

```ts
// Updates the vertical progress fill on post pages. No-op on pages without
// the `[data-thought-progress]` element. RAF-throttled. Quiet under
// prefers-reduced-motion (snaps without animating).

export function mountReadingProgress(): void {
  const fill = document.querySelector<HTMLElement>('[data-thought-progress]');
  if (!fill) return;
  const article = document.querySelector<HTMLElement>('article.thought');
  if (!article) return;

  let raf = 0;
  function tick(): void {
    raf = 0;
    const articleTop = article!.offsetTop;
    const scrollable = Math.max(1, article!.scrollHeight - window.innerHeight);
    const progressed = Math.min(
      1,
      Math.max(0, (window.scrollY - articleTop + window.innerHeight * 0.2) / scrollable)
    );
    fill!.style.height = `${progressed * 100}%`;
  }

  window.addEventListener(
    'scroll',
    () => {
      if (raf) return;
      raf = requestAnimationFrame(tick);
    },
    { passive: true }
  );
  tick();
}
```

- [ ] **Step 2: Mount conditionally in `Base.astro`**

In `src/layouts/Base.astro`'s `<script>` block:

```astro
    <script>
      import { mountReveal }              from '@/lib/reveal';
      import { mountCursor }              from '@/lib/cursor';
      import { mountActiveNav }           from '@/lib/active-nav';
      import { mountSmoothScroll }        from '@/lib/smooth-scroll';
      import { mountNavMenu }             from '@/lib/nav-menu';
      import { mountThoughtsTransition } from '@/lib/thoughts-transition';
      import { mountReadingProgress }    from '@/lib/reading-progress';
      mountSmoothScroll();
      mountReveal();
      mountCursor();
      mountActiveNav();
      mountNavMenu();
      mountThoughtsTransition();
      mountReadingProgress();
    </script>
```

(`mountReadingProgress()` no-ops when its element isn't on the page, so we always call it — simpler than route-conditional mounting.)

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/reading-progress.ts src/layouts/Base.astro
git commit -m "feat(thoughts): reading-progress rail fill"
```

---

## Task 1.9: RSS feed

**Files:**
- Create: `src/pages/rss.xml.ts`

- [ ] **Step 1: Create the endpoint**

`src/pages/rss.xml.ts`:

```ts
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublishedThoughts } from '@/lib/thoughts';

export async function GET(context: APIContext) {
  const posts = await getPublishedThoughts();
  return rss({
    title: 'Thoughts — Yonathan Raviv',
    description: 'Workflow notes, project deep-dives, and the occasional opinion.',
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/thoughts/${p.slug}/`,
    })),
    customData: `<language>en</language>`,
  });
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 3: Build verify**

```bash
npm run build
```

Expected:
- Build succeeds.
- `dist/rss.xml` exists. Open it: should be a valid RSS 2.0 envelope with `<title>Thoughts — Yonathan Raviv</title>` and an empty `<channel>` items list (no posts yet).

- [ ] **Step 4: Commit**

```bash
git add src/pages/rss.xml.ts
git commit -m "feat(thoughts): RSS feed at /rss.xml"
```

---

## Task 1.10: Per-post OG image generator

**Files:**
- Create: `src/pages/og/thoughts/[slug].png.ts`

- [ ] **Step 1: Create the endpoint**

`src/pages/og/thoughts/[slug].png.ts`:

```ts
import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { getPublishedThoughts, fmtDate } from '@/lib/thoughts';

export async function getStaticPaths() {
  const posts = await getPublishedThoughts();
  return posts.map((p) => ({
    params: { slug: p.slug },
    props: { title: p.data.title, date: p.data.date.toISOString() },
  }));
}

// Resolve a font path under node_modules relative to the project root.
function fontPath(rel: string): string {
  // import.meta.url points at this file; project root is 4 levels up:
  //   src/pages/og/thoughts/[slug].png.ts  →  ../../../..  →  project root
  const here = fileURLToPath(import.meta.url);
  return resolve(here, '../../../..', rel);
}

const ACCENT = '#FF6F59';
const BG = '#151515';
const TEXT_BRIGHT = '#F4EEE2';
const TEXT_DIM = '#5a544a';

export const GET: APIRoute = async ({ props }) => {
  const { title, date } = props as { title: string; date: string };

  const bebas = readFileSync(
    fontPath('node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff')
  );
  const mono = readFileSync(
    fontPath('node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff')
  );

  const dateLabel = fmtDate(new Date(date));

  const tree = {
    type: 'div',
    props: {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        background: BG,
        color: TEXT_BRIGHT,
        padding: '64px',
        position: 'relative',
        fontFamily: 'JetBrains Mono',
      },
      children: [
        // accent blade-edge on the right
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              right: 0,
              width: 6,
              height: 630,
              background: ACCENT,
              boxShadow: `0 0 40px ${ACCENT}`,
            },
          },
        },
        // top label
        {
          type: 'div',
          props: {
            style: {
              fontFamily: 'JetBrains Mono',
              fontSize: 22,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: ACCENT,
              marginBottom: 24,
            },
            children: '// THOUGHTS',
          },
        },
        // title
        {
          type: 'div',
          props: {
            style: {
              fontFamily: 'Bebas Neue',
              fontSize: 96,
              lineHeight: 1.02,
              letterSpacing: '0.03em',
              color: TEXT_BRIGHT,
              maxWidth: 1000,
              flexGrow: 1,
              display: 'flex',
              alignItems: 'flex-start',
            },
            children: title,
          },
        },
        // bottom row
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: 'JetBrains Mono',
              fontSize: 22,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: TEXT_DIM,
            },
            children: [
              { type: 'span', props: { children: dateLabel } },
              { type: 'span', props: { children: 'YONATHANRAVIV.DEV' } },
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(tree as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Bebas Neue', data: bebas, weight: 400, style: 'normal' },
      { name: 'JetBrains Mono', data: mono, weight: 500, style: 'normal' },
    ],
  });

  const png = new Resvg(svg, { background: BG }).render().asPng();

  return new Response(png, {
    headers: { 'Content-Type': 'image/png' },
  });
};
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`.

- [ ] **Step 3: Build verify**

```bash
npm run build
```

Expected: build succeeds even with no posts (no OG PNGs are emitted because `getStaticPaths` is empty).

- [ ] **Step 4: Commit**

```bash
git add src/pages/og/thoughts/[slug].png.ts
git commit -m "feat(thoughts): per-post OG image generator"
```

---

## Task 1.11: Write the first real post + cover image

**Files:**
- Create: `src/content/thoughts/heroscene-rig-system.md`
- (Optional) place a cover image under `src/assets/thoughts/heroscene-rig-system-cover.png`

This is the smoke test for the entire pipeline. Write enough body content (~600–900 words) that reading-time, OG generation, JSON-LD wordCount, and the rail progress all have something to chew on.

- [ ] **Step 1: Create the post**

`src/content/thoughts/heroscene-rig-system.md`:

```md
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
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: `0 errors`. Astro regenerates the content types and `[...slug]` now has one path.

- [ ] **Step 3: Dev sanity check (full pipeline)**

```bash
npm run dev
```

- Visit `/thoughts`. The post appears in the list with `01`, date `2026.05.28`, computed reading time.
- Click the row. Blade-sweep plays.
- Land on `/thoughts/heroscene-rig-system`. Cover image absent (we didn't add one). Lede, sticky rail, reading-time, published date, code blocks rendered with Shiki, links underlined.
- Scroll the article. The progress fill in the rail grows.
- Resize browser to ~700px. Rail collapses to inline meta; progress track disappears (mobile).
- Click **← MORE THOUGHTS**. Transition plays in reverse.

- [ ] **Step 4: Build verify (OG + RSS + sitemap)**

```bash
npm run build
```

Expected files in `dist/`:
- `dist/thoughts/index.html`
- `dist/thoughts/heroscene-rig-system/index.html`
- `dist/og/thoughts/heroscene-rig-system.png` — open it: dark background, `// THOUGHTS` accent label, title in Bebas Neue, date and `YONATHANRAVIV.DEV` along the bottom, orange edge on the right.
- `dist/rss.xml` — now contains one `<item>` with the post.
- `dist/sitemap-0.xml` (or `dist/sitemap-index.xml`) — includes `/thoughts/` and `/thoughts/heroscene-rig-system/`.

- [ ] **Step 5: Validate JSON-LD**

Run `npm run preview`, then in DevTools on `/thoughts/heroscene-rig-system`:
- View Source. There should be **three** `<script type="application/ld+json">` blocks: Person, WebSite, BlogPosting.
- The BlogPosting block has `headline`, `datePublished`, `wordCount`, `timeRequired: "PT4M"` (or similar), `image: https://yonathanraviv.dev/og/thoughts/heroscene-rig-system.png`.
- Optionally, paste the BlogPosting JSON into [Schema.org Validator](https://validator.schema.org/) — expected: no errors.

Stop the preview server.

- [ ] **Step 6: Commit**

```bash
git add src/content/thoughts/heroscene-rig-system.md
git commit -m "feat(thoughts): first real post — HeroScene rig deep dive"
```

---

## Self-review

After all tasks are done, walk through the spec one more time and confirm:

- [ ] Every section of the spec has at least one task that delivers it.
- [ ] `npm run build && npm run preview` works end-to-end without errors.
- [ ] On a desktop browser at `https://yonathanraviv.dev` (or local preview), with reduced-motion **off**, the transition fires both directions and looks right.
- [ ] With reduced-motion **on**, transitions are skipped silently and navigation is instant.
- [ ] On mobile width, rail collapses, hamburger menu still works, transition still fires.
- [ ] Schema.org validator accepts both the index `Blog` block and the post `BlogPosting` block.
- [ ] `dist/og/thoughts/<slug>.png` exists for every published post.
- [ ] `dist/rss.xml` contains every published post.
- [ ] No `draft: true` posts appear anywhere in `dist/`.

If anything is off, find the corresponding task, fix the code, re-run the build, and commit a `fix(thoughts):` follow-up.

---

# Notes on scope and follow-ups

These are explicitly **not** in this plan; capture as separate tasks if needed later:

- Pagination on `/thoughts` (deferred until > ~25 posts).
- A real "related posts" / "tags" / "search" feature.
- An image-caption remark plugin (current v1 uses the `<em>` directly under image convention).
- Astro's prefetch integration (the manual `<link rel="prefetch">` in the transition runtime is sufficient for v1).
- A visual rig-debugger for HeroScene (called out as a follow-up in the first post itself).
