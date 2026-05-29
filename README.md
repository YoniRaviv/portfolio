# portfolio2026

Personal portfolio for [yonathan-raviv.dev](https://yonathan-raviv.dev) — a single-page, scroll-driven site with a persistent Three.js scene that travels through every section.

## Stack

- [Astro 6](https://astro.build) — static output
- [Three.js](https://threejs.org) — hero 3D scene (lazy-loaded, code-split)
- [Lenis](https://lenis.dev) — smooth scrolling
- TypeScript (strict), lightningcss, sharp

## Develop

```bash
npm install
npm run dev        # dev server with HMR
```

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Build the static site to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check with `astro check` |

## Structure

```
src/
├── pages/index.astro       Single page composing all sections
├── components/             Section components (markup + scoped styles)
│   └── HeroScene/          Persistent Three.js canvas + per-section "rig" system
├── content/                All copy and structured data (edit here, not in components)
├── lib/                    Client modules: cursor, scroll-reveal, smooth-scroll, nav
├── layouts/Base.astro      HTML shell; mounts the client modules
└── styles/                 Design tokens, fonts, global CSS
public/models/              GLB 3D assets
```

The 3D scene repositions, relights, and rotates a single model per section as you scroll, swapping to a katana near the end. See [`CLAUDE.md`](./CLAUDE.md) for the architecture details.

Honors `prefers-reduced-motion` throughout — the 3D scene and cursor effects are skipped, and reveal animations snap to their final state.
