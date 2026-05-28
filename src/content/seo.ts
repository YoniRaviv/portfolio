import type { CollectionEntry } from 'astro:content';
import { site } from './site';

export const defaultSEO = {
  title: `${site.name} — ${site.jobTitle}`,
  description:
    'Yonathan Raviv — fullstack and AI engineer in Tel Aviv. Six years shipping production systems; now treating AI as engineering: specs, evals, guardrails.',
  ogImage: '/og.png',
};

const sameAs = [
  site.github,
  site.linkedin,
  'https://x.com/yonathan_raviv',
];

export const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': `${site.url}/#person`,
  name: site.name,
  givenName: 'Yonathan',
  familyName: 'Raviv',
  jobTitle: site.jobTitle,
  email: `mailto:${site.email}`,
  url: site.url,
  image: `${site.url}/og.png`,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Tel Aviv',
    addressCountry: 'IL',
  },
  sameAs,
  knowsAbout: [
    'TypeScript',
    'Python',
    'React',
    'Next.js',
    'Node.js',
    'FastAPI',
    'Large Language Models',
    'Retrieval-Augmented Generation',
    'AI Agents',
    'Evaluation & Guardrails',
    'Anthropic SDK',
    'OpenAI SDK',
    'PostgreSQL',
  ],
};

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${site.url}/#website`,
  url: site.url,
  name: site.name,
  description: defaultSEO.description,
  inLanguage: 'en',
  author: { '@id': `${site.url}/#person` },
};

export function blogPostingSchema(
  post: CollectionEntry<'thoughts'>,
  readMin: number
) {
  const slug = post.id;
  const body = post.body ?? '';
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
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
      url: `${site.url}/thoughts/${p.id}`,
      datePublished: p.data.date.toISOString(),
    })),
  };
}
