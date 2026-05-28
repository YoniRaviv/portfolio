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
