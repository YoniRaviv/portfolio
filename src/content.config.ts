import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const thoughts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/thoughts' }),
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
