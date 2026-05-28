import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { getPublishedThoughts, fmtDate } from '@/lib/thoughts';

export async function getStaticPaths() {
  const posts = await getPublishedThoughts();
  return posts.map((p) => ({
    params: { slug: p.id },
    props: { title: p.data.title, date: p.data.date.toISOString() },
  }));
}

// Resolve a font path under node_modules relative to the project root.
// dirname(fileURLToPath(import.meta.url)) gives the directory of THIS file;
// from src/pages/og/thoughts/  →  3 ups reaches the project root.
function fontPath(rel: string): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../../..', rel);
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

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
