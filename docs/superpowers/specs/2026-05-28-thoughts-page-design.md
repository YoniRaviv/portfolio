# Thoughts page — design spec

**Date:** 2026-05-28
**Status:** Approved for implementation planning
**Branch:** `feature/blog-page` (will be renamed in the final commit; route is `/thoughts`)
**Owner:** Yoni Raviv

## Goal

Add a small, low-volume long-form section to the portfolio (`/thoughts`) for workflow notes, project deep-dives, and the occasional opinion. Content-first and clean; cyberpunk styling stays subtle so reading is the priority. The route must be best-in-class for SEO. The Blog nav link is renamed to **Thoughts** and points at a real route (replacing the current `#blog` external placeholder). Clicking it fires a cinematic page transition that ties to the site's existing katana motif.

## Non-goals

- No pagination (target ≤ ~15 posts).
- No tags / categories / filters / search.
- No comments, no related-posts widget, no author bio block (we already are the author across the site).
- No HeroScene (Three.js canvas) on `/thoughts` routes — content-first.
- No SPA routing / `<ClientRouter />` (full-page navigation with a custom overlay).

## High-level architecture

New surface area:

| File | Purpose |
| --- | --- |
| `src/content/config.ts` | Defines the `thoughts` collection + Zod schema. |
| `src/content/thoughts/*.md` | Post sources. Slug = filename. |
| `src/lib/thoughts.ts` | Shared helpers: `getPublishedThoughts()`, `readingTimeMinutes(body)`. |
| `src/lib/thoughts-transition.ts` | Mounts blade-sweep overlay handlers (forward + arrival + reverse). |
| `src/lib/reading-progress.ts` | Updates the post-page rail progress fill. |
| `src/components/ThoughtsTransition.astro` | Renders the overlay DOM. Imported by `Base.astro` on all routes. |
| `src/pages/thoughts/index.astro` | Editorial list of posts. |
| `src/pages/thoughts/[...slug].astro` | Post detail page. |
| `src/pages/rss.xml.ts` | RSS feed generated from the collection. |
| `src/pages/og/thoughts/[slug].png.ts` | Per-post 1200×630 OG image generator. |

Modifications:

| File | Change |
| --- | --- |
| `src/content/nav.ts` | `Blog → Thoughts`, `href: '/thoughts'`. Keep `external: true` — it now means "leaves the home single-page flow" rather than "off-site", which is still correct intent for the ↗ glyph + accent treatment. |
| `src/components/Nav.astro` | The `.blog` class becomes `.thoughts` (CSS rename only); add `data-thought-link` to the Thoughts anchor. Existing `link.external` selector logic stays. |
| `src/components/SEO.astro` | New optional props: `ogType` (default `profile`, posts pass `article`), `articlePublished`, `articleModified`, `jsonLd` (extra schema arrays). |
| `src/content/seo.ts` | New helpers: `blogPostingSchema(post, slug)`, `blogIndexSchema(posts)`. |
| `src/layouts/Base.astro` | Accepts a `route?: 'home' \| 'thoughts'` prop. Renders `<ThoughtsTransition />`. Calls `mountThoughtsTransition()` and (on post pages only) `mountReadingProgress()`. |
| `src/pages/index.astro` | Pass `route="home"` to `<Base>`. |
| `src/lib/active-nav.ts` | On non-`/` routes, skip section-spy and statically mark the corresponding top-level link active (e.g. `/thoughts/*` → Thoughts active). |
| `package.json` | Add `@astrojs/rss`, `satori`, `@resvg/resvg-js` (OG pipeline; exact lib choice locked in implementation plan). |

## Content collection schema

```ts
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const thoughts = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title:       z.string().max(80),
    description: z.string().min(40).max(180),
    date:        z.coerce.date(),
    updated:     z.coerce.date().optional(),
    cover:       image().optional(),
    draft:       z.boolean().default(false),
  }),
});

export const collections = { thoughts };
```

Notes:

- **Reading time** is derived at render time (`words / 220 wpm`, floor 1 min). Not in frontmatter.
- **Drafts** are filtered out of the index, sitemap, RSS, and `getStaticPaths` **only in production builds**. In `astro dev` they are visible at their real URL so authoring is normal.
- **Slug** comes from the filename. Override via frontmatter `slug:` if needed.

Single source of truth lives in `src/lib/thoughts.ts`:

```ts
import { getCollection, type CollectionEntry } from 'astro:content';

export async function getPublishedThoughts(): Promise<CollectionEntry<'thoughts'>[]> {
  const all = await getCollection('thoughts');
  const filtered = import.meta.env.PROD ? all.filter(p => !p.data.draft) : all;
  return filtered.sort((a, b) => +b.data.date - +a.data.date);
}

export function readingTimeMinutes(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}
```

## Page: `/thoughts` (index)

Single-column editorial list. No HeroScene. All overlays from `Base.astro` (grain, scanlines, vignette, CRT pulse, custom cursor) still apply.

Structure:

```astro
---
import Base from '@/layouts/Base.astro';
import Nav from '@/components/Nav.astro';
import Footer from '@/components/Footer.astro';
import { getPublishedThoughts, readingTimeMinutes } from '@/lib/thoughts';

const posts = await getPublishedThoughts();
---
<Base route="thoughts"
  title="Thoughts — Yonathan Raviv"
  description="Workflow notes, project deep-dives, and the occasional opinion.">
  <Nav route="thoughts" />
  <main class="thoughts-index">
    <header class="thi-head">
      <p class="crumb">// THOUGHTS</p>
      <h1>Thoughts</h1>
      <p class="lede">Workflow notes, project deep-dives, and the occasional opinion. Updated when something is worth writing about.</p>
      <p class="meta">[ {String(posts.length).padStart(2,'0')} / POSTS ] · <a href="/rss.xml">RSS</a></p>
    </header>

    <ol class="thi-list">
      {posts.map((post, i) => (
        <li>
          <a href={`/thoughts/${post.slug}`} class="thi-row" data-thought-link data-cursor="reveal">
            <div class="meta-line">
              <span class="idx">{String(i+1).padStart(2,'0')}</span>
              <time datetime={post.data.date.toISOString()}>{fmtDate(post.data.date)}</time>
              <span class="read">{readingTimeMinutes(post.body)} MIN</span>
            </div>
            <h2>{post.data.title}</h2>
            <p class="excerpt">{post.data.description}</p>
          </a>
        </li>
      ))}
    </ol>
  </main>
  <Footer />
</Base>
```

Styling (scoped):

- Heading `h1` uses `var(--display)` at ~64px desktop / ~40px mobile.
- `.meta-line` is a flex row, mono 10–11px uppercase, letter-spacing 0.16em, `.idx` colored `var(--accent)`.
- Rows separated by `1px dashed rgba(191,178,155,0.16)`.
- Title `h2` is `var(--display)` ~28px desktop, `var(--text-bright)`.
- On `:hover` / `:focus-visible` of the `<a>`, the title shifts to `var(--accent)` and bracket marks `[ … ]` fade in (reserved at opacity 0 to prevent layout shift — same pattern as `Nav.astro`).
- Excerpt is `var(--sans)` 14px, `var(--text)`, `line-height: 1.55`, max-width 70ch, 2 lines visible (no clamp; the description is already ≤180 chars).
- Posts sorted desc by `date`.
- Each anchor gets `data-thought-link` (the transition reads this attribute) and `data-cursor="reveal"` (existing custom-cursor reveal-ring effect).

Empty state: when `posts.length === 0`, render `<p class="empty">&gt; NO_TRANSMISSIONS_YET_</p>` in mono, blinking caret.

## Page: `/thoughts/[...slug]` (post)

Single article rendered inside `Base.astro`. Sticky-rail layout (mockup B). Desktop ≥ 900px uses a 3-column grid (rail / gutter / content); below 900px the rail collapses into a single inline meta line.

Structure:

```astro
---
import Base from '@/layouts/Base.astro';
import Nav from '@/components/Nav.astro';
import Footer from '@/components/Footer.astro';
import { Image } from 'astro:assets';
import { getCollection } from 'astro:content';
import { getPublishedThoughts, readingTimeMinutes } from '@/lib/thoughts';
import { blogPostingSchema } from '@/content/seo';

export async function getStaticPaths() {
  const posts = await getPublishedThoughts();
  return posts.map(p => ({ params: { slug: p.slug }, props: { post: p } }));
}

const { post } = Astro.props;
const { Content } = await post.render();
const readMin = readingTimeMinutes(post.body);
const jsonLd  = blogPostingSchema(post, readMin);
---
<Base route="thoughts"
  title={`${post.data.title} — Yonathan Raviv`}
  description={post.data.description}
  ogImage={`/og/thoughts/${post.slug}.png`}
  ogType="article"
  articlePublished={post.data.date.toISOString()}
  articleModified={(post.data.updated ?? post.data.date).toISOString()}
  jsonLd={[jsonLd]}>
  <Nav route="thoughts" />
  <article class="thought">
    <header class="thought-head">
      <p class="crumb"><a href="/thoughts" data-thought-link>← THOUGHTS</a></p>
      <h1>{post.data.title}</h1>
      <p class="lede">{post.data.description}</p>
    </header>

    {post.data.cover && (
      <figure class="thought-cover">
        <Image src={post.data.cover} alt="" widths={[720, 1080, 1440]} sizes="(min-width: 900px) 720px, 100vw" />
      </figure>
    )}

    <div class="thought-body">
      <aside class="rail">
        <span class="label">// READ</span><span class="val">{readMin} min</span>
        <span class="label">// PUBLISHED</span>
        <time class="val" datetime={post.data.date.toISOString()}>{fmtDate(post.data.date)}</time>
        {post.data.updated && (<>
          <span class="label">// UPDATED</span>
          <time class="val" datetime={post.data.updated.toISOString()}>{fmtDate(post.data.updated)}</time>
        </>)}
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
```

### Prose styles

Scoped to `.prose`:

- Body: `var(--sans)` 16px desktop / 15px mobile, `line-height: 1.65`, color `var(--text)`, max-width 64ch.
- `h2`: `var(--display)` 28px, prefixed with `// ` in mono `var(--accent)`. Matches the section-title pattern used in `Who.astro` / `How.astro`.
- `h3`: `var(--display)` 20px.
- `a` (inline): `var(--text-bright)`, animated underline (`background-image` gradient + `background-size` transition — same trick as `Nav.astro`); on `:hover` color shifts to `var(--accent)`. External (`[href^="http"]:not([href*="yonathanraviv.dev"])`) gets a trailing `↗` via `::after`.
- `blockquote`: 2px solid `var(--accent)` left border, `padding-left: 16px`, italic, `var(--text-bright)`.
- `img`: full content-width, `border-radius: 4px`, 1px `rgba(191,178,155,0.08)` border. `<em>` directly under an image (markdown convention `*caption*`) renders as a small mono caption.
- `pre`/`code` block: `var(--mono)` 13px, background `rgba(244,238,226,0.03)`, 2px solid `var(--accent)` left border, padding 12/14px, `overflow-x: auto`. Syntax highlighting via Astro's built-in **Shiki** with theme to be locked in implementation plan (candidates: `night-owl`, `material-theme-palenight`); the only CSS override is to retint comments toward `var(--text-dim)` for readability against the dark `#151515` base.
- `code` (inline): same mono, `background: rgba(255,111,89,0.08)`, padding `2px 5px`, color `var(--accent)`.
- `hr`: 1px dashed `rgba(191,178,155,0.16)`, margin 32px 0.

### Rail behaviour

Desktop grid: `[rail 140px] [gutter 32px] [content 1fr]`, page max-width 960px centered.

- Rail `position: sticky; top: 96px`.
- Labels in mono `var(--accent)`, values in `var(--text)`.
- Vertical progress: 2px-wide track ~120px tall; inner fill updated by `mountReadingProgress()` (RAF-throttled `scroll / (article.scrollHeight - innerHeight)` clamped 0–1).
- Under `prefers-reduced-motion`, the fill snaps to current value without `transition`.

Mobile (< 900px): rail collapses into a single horizontal mono line under the lede — `READ · PUBLISHED · [progress dot]` — and the article body fills the full content width. No vertical progress track on mobile.

## Page transition: scanline wipe + terminal boot

> **2026-05-28 pivot.** Originally specced as a blade-sweep tied to the existing katana motif. After implementing Phase 0 we tested live and decided the blade-sweep was visually too loud for routine page changes. Pivoted to a quieter "scanline wipe + terminal boot" — dark panel wipes top→bottom with stepped accent scanlines, a centred mono `> TRANSMITTING_` line with a blinking cursor during the hold, panel wipes off the bottom on arrival. The runtime, state machine (`idle | enter | hold | exit`), FOUC-prevention head script, and sessionStorage flag (`tx-arrive`) all remained unchanged from the blade-sweep design — only `src/components/ThoughtsTransition.astro` (DOM + CSS) was rewritten. The remainder of this section is preserved as it accurately describes the *mechanism*; only the visual choreography differs.

The transition is a custom JS overlay; **not** using `<ClientRouter />` / Astro View Transitions API. Reasoning: we need a precise hold phase mid-transition while async prefetch finishes, which doesn't express cleanly in VT.

### Overlay component

`src/components/ThoughtsTransition.astro` (rendered once by `Base.astro` on every route):

```html
<div class="tx" id="tx" aria-hidden="true" data-tx-state="idle">
  <div class="tx-panel"></div>
  <div class="tx-edge"></div>
  <div class="tx-scan"></div>
</div>
```

- `.tx`: `position: fixed; inset: 0; z-index: 9999; pointer-events: none`. Higher than nav (z:50), grain/scanlines, 3D stage.
- `.tx-panel`: dark wedge driven by `clip-path: polygon(...)` interpolation.
- `.tx-edge`: 220% width × 6px tall, rotated −22°, gradient `transparent → var(--accent) 30% → #fff 50% → var(--accent) 70% → transparent`, with `box-shadow: 0 0 20px var(--accent), 0 0 40px var(--accent)`.
- `.tx-scan`: faint repeating scanline texture overlaid on the panel.
- `data-tx-state ∈ { idle, enter, hold, exit }`. All animations are CSS, switched by the JS module via the data attribute.

### Runtime

`src/lib/thoughts-transition.ts` exports `mountThoughtsTransition(): void`. Mounted in `Base.astro` alongside `mountReveal()` etc.

On outgoing click:
1. Intercept `click` on `[data-thought-link]` anchors.
2. If `prefers-reduced-motion: reduce`, the click had a modifier (cmd/ctrl/shift/alt) or middle-click — let the browser navigate normally, no transition.
3. Else `e.preventDefault()`; inject `<link rel="prefetch" href={href}>` to start the destination fetch; set `document.documentElement.style.overflow = 'hidden'` to suppress scroll jolt.
4. `data-tx-state = 'enter'` — blade slides from top-left across, dragging the panel via expanding `clip-path` (~620ms, `cubic-bezier(0.7,0,0.2,1)`).
5. At enter completion: `data-tx-state = 'hold'`. Await prefetch with a floor of 200ms (so the hold never flickers).
6. Set `sessionStorage.setItem('tx-arrive', '1')` and `window.location.href = href`.

On arrival (any page; only meaningful when sessionStorage flag is set):

7. An **inline, blocking `<script>` in `<head>`** (placed in `Base.astro` before any stylesheet that could cause a flash) reads `sessionStorage.getItem('tx-arrive')`; if `"1"`, it adds the class `tx-arriving` to `<html>` *before first paint*. CSS rules tied to `html.tx-arriving .tx` render the overlay panel fully covering the page from the very first paint, so there is no FOUC of the destination content.
8. `mountThoughtsTransition()`, running after `DOMContentLoaded`, then:
   - On the next `requestAnimationFrame`: set `data-tx-state = 'exit'`. Blade re-enters from top-right (+22° opposite diagonal) and exits bottom-left, dragging the panel off; the new page is revealed (~700ms).
   - On animation end: set `data-tx-state = 'idle'`, remove `html.tx-arriving`, re-enable scroll, and clear the `sessionStorage` flag.

Reverse path (from `/thoughts/*` back to `/`): same `data-thought-link` attribute on the back link. The transition reads `href`; if it points outside `/thoughts`, the blade sweeps in the **opposite default direction** (top-right→bottom-left forward, then top-left→bottom-right arrival) so leaving feels like an unsheathing.

### Choreography summary

| t       | state      | what's on screen                                          |
| ------- | ---------- | --------------------------------------------------------- |
| 0       | enter      | blade-edge enters from off-canvas top-left                |
| 0–620   | enter      | blade sweeps diagonal; panel wedge expands behind it      |
| 620     | hold       | panel covers 100% viewport; scan texture visible          |
| 620+    | hold       | awaiting prefetch (min 200ms) → `window.location.href = href` |
| nav     | —          | hard navigation, new page parses & paints                 |
| 0'      | exit-prep  | panel pre-rendered covering page (no FOUC)                |
| 0'–700' | exit       | blade re-enters opposite diagonal; panel drags off        |
| 700'    | idle       | overlay invisible, scroll re-enabled                      |

Total perceived: ~1.3–1.5 s.

### Failure modes

- **Slow network:** force navigation after the floor + max 2s wait; user sees the dark panel until paint.
- **JS disabled / errors:** `data-thought-link` is on real anchors with real `href`s; the browser navigates normally. No SPA dependency.
- **`prefers-reduced-motion`:** transition no-ops at every step. Normal navigation.
- **Browser back / forward / bfcache:** sessionStorage flag isn't set on bfcache restore, so the exit animation is correctly skipped.

## SEO

### Per-post `<head>` (via updated `SEO.astro`)

- `<title>`: `{post.title} — Yonathan Raviv`
- `<meta name="description">`: `post.description`
- `<link rel="canonical">`: `https://yonathanraviv.dev/thoughts/{slug}`
- `<meta property="og:type" content="article">` (override default `profile`)
- `<meta property="og:image">`: `https://yonathanraviv.dev/og/thoughts/{slug}.png`
- `<meta property="article:published_time" content={isoDate}>`
- `<meta property="article:modified_time" content={isoUpdated}>` (only if `updated` set)
- `<meta property="article:author" content={site.name}>`
- Twitter `summary_large_image` with the same OG image.

### Site-wide `<head>` additions

- `<link rel="alternate" type="application/rss+xml" title="Thoughts — Yonathan Raviv" href="/rss.xml">` on every page so feed readers can discover it from anywhere.

### JSON-LD

New helpers in `src/content/seo.ts`:

```ts
export function blogPostingSchema(post: CollectionEntry<'thoughts'>, readMin: number) {
  const slug = post.slug;
  const wordCount = post.body.trim().split(/\s+/).length;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${site.url}/thoughts/${slug}#post`,
    mainEntityOfPage: `${site.url}/thoughts/${slug}`,
    headline: post.data.title,
    description: post.data.description,
    datePublished: post.data.date.toISOString(),
    dateModified: (post.data.updated ?? post.data.date).toISOString(),
    author:    { '@id': `${site.url}/#person` },
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
    blogPost: posts.map(p => ({
      '@type': 'BlogPosting',
      headline: p.data.title,
      url: `${site.url}/thoughts/${p.slug}`,
      datePublished: p.data.date.toISOString(),
    })),
  };
}
```

The existing `personSchema` / `websiteSchema` continue to ship on every page. `BlogPosting` is added only on post routes; `Blog` only on `/thoughts`.

### RSS

`src/pages/rss.xml.ts` uses `@astrojs/rss`:

```ts
import rss from '@astrojs/rss';
import { getPublishedThoughts } from '@/lib/thoughts';

export async function GET(ctx) {
  const posts = await getPublishedThoughts();
  return rss({
    title: 'Thoughts — Yonathan Raviv',
    description: 'Workflow notes, project deep-dives, and the occasional opinion.',
    site: ctx.site!,
    items: posts.map(p => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/thoughts/${p.slug}/`,
    })),
    customData: `<language>en</language>`,
  });
}
```

### OG image generation

`src/pages/og/thoughts/[slug].png.ts`:

- Endpoint with `getStaticPaths()` returning one entry per published post.
- Renders 1200×630 via `satori` (HTML/CSS → SVG) → `@resvg/resvg-js` (SVG → PNG). Exact lib + version locked in the implementation plan; sharp may be an acceptable fallback for the SVG step.
- Layout: dark `#151515` background; faint scanline overlay; `// THOUGHTS` mono accent label top-left; post title in Bebas Neue (~96px, wrapping); date in mono bottom-left; `yonathanraviv.dev` mono bottom-right; faint orange accent edge along the right side mimicking the blade.
- Output: static PNG at `dist/og/thoughts/{slug}.png` after `astro build`. The site default `/og.png` remains the fallback for non-post routes.

### Sitemap

`@astrojs/sitemap` already runs on all built pages. New `/thoughts` and `/thoughts/{slug}` URLs will be picked up automatically. Drafts are excluded because `getStaticPaths` does not emit them in production.

## Reduced-motion behavior

- Blade-sweep transition: skipped entirely.
- Reading-progress fill: snaps without `transition`.
- Title-hover underline / bracket reveals: instant transitions (`transition-duration: 0`).
- Cursor effects: already disabled site-wide under reduced-motion (`src/lib/cursor.ts`).

## Accessibility

- All interactive anchors have visible `:focus-visible` outlines using `var(--accent)`.
- The overlay element is `aria-hidden="true"` and `pointer-events: none`, so it never traps focus or blocks SR users.
- Article uses semantic `<article>` / `<header>` / `<aside>` / `<footer>`.
- All `<time>` elements have a machine-readable `datetime` attribute.
- Images in posts require alt text (frontmatter `cover` ignores alt — it's a presentational cover; body `<img>`s come from markdown which must provide alt).

## Critical couplings

These have to stay aligned, similar to the existing `SECTION_KEYS` coupling in HeroScene:

1. `src/content/nav.ts`'s "Thoughts" entry must use `href: '/thoughts'`. The data-attribute `data-thought-link` flows from `Nav.astro` markup, not the data, but they must agree.
2. `Base.astro`'s `route` prop must be set on every page (`'home' | 'thoughts'`). `active-nav.ts` reads it to decide between scroll-spy and static highlight.
3. Slug folder (`src/content/thoughts/`) and OG generator path (`src/pages/og/thoughts/[slug].png.ts`) and post route (`src/pages/thoughts/[...slug].astro`) all share the same `thoughts` literal — changing it is a 4-place edit.
4. RSS, sitemap, and JSON-LD all consume `getPublishedThoughts()` — the draft-filter rule lives in **one** place.

## Implementation phasing (de-risk the transition first)

Because the blade-sweep is the riskiest visual piece and could need to pivot to mockup A (CRT) or B (scanline boot), Phase 0 is a hard gate.

### Phase 0 — Transition spike (commit-or-pivot)

1. Rename `Blog → Thoughts` in `src/content/nav.ts`; route → `/thoughts`.
2. Stub `src/pages/thoughts/index.astro` as a minimal placeholder (just `<h1>Thoughts</h1>` and a back link, wrapped in `<Base route="thoughts">`).
3. Implement `src/components/ThoughtsTransition.astro` + `src/lib/thoughts-transition.ts` end-to-end: forward sweep, hold + prefetch, arrival sweep, reverse path.
4. Mount in `Base.astro`. Verify on real running site: click between `/`, `/thoughts`, and back. Test reduced-motion, modifier-click, mobile, slow network.
5. **Decision gate.** If the blade-sweep feels right → commit. If not → pivot to A (CRT) or B (scanline boot); the rest of the architecture remains identical because the transition module is the only thing that needs to change.

### Phase 1 — Everything else (only after Phase 0 commits)

6. `src/content/config.ts` (collection schema) + `src/lib/thoughts.ts` (helpers).
7. Flesh out `src/pages/thoughts/index.astro` (editorial list from §3).
8. `src/pages/thoughts/[...slug].astro` (sticky-rail post page from §4), including prose styles + Shiki theme override.
9. `src/lib/reading-progress.ts` (rail fill).
10. `src/pages/rss.xml.ts` + per-post OG generator.
11. JSON-LD helpers in `src/content/seo.ts`; wire into `SEO.astro` props.
12. Write the first real post (likely the HeroScene rig deep-dive) to validate the whole pipeline.

## Open questions deferred to implementation plan

- Exact Shiki theme + colour overrides.
- OG-image library choice (satori + resvg vs sharp-only SVG pipeline).
- Whether to add a small remark plugin for image captions or rely on the markdown `<em>` convention v1.
- Whether the prefetch link should be auto-injected by Astro's prefetch integration (cheap upgrade once Phase 0 ships).
