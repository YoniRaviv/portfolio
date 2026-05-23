import { site } from './site';

export const defaultSEO = {
  title: `${site.name} — ${site.jobTitle}`,
  description:
    'Yonathan Raviv — fullstack and AI engineer based in Tel Aviv. Six years shipping production systems; currently building with LLM agents, RAG, and evals.',
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
