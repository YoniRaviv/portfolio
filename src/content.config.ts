import { defineCollection, z } from 'astro:content';

const thoughts = defineCollection({
  loader: async () => {
    const files = import.meta.glob('./**/*.md', { eager: true });
    const entries = Object.entries(files).map(([key, mod]) => ({
      id: key.replace(/^\.\//, '').replace(/\.md$/, ''),
      data: (mod as any).data || {},
    }));
    return entries;
  },
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
