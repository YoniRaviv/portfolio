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
      link: `/thoughts/${p.id}/`,
    })),
    customData: `<language>en</language>`,
  });
}
