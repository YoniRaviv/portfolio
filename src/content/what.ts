import type { Project } from './_types';

export const what = {
  label: { num: '02 / ', text: "What I've built" },
};

export const projects: Project[] = [
  {
    idx:  '01 — 2026',
    year: '2026',
    name: 'Relay',
    slug: 'relay',
    tags: ['Active', 'AI'],
    desc: "Specs-first autonomous development. Describe a feature, review the plan, watch agents ship it task by task — with the review gates and evals they won't add themselves.",
    href: 'https://github.com/YoniRaviv/Relay',
  },
  {
    idx:  '02 — 2022',
    year: '2022',
    name: 'Shi-Shi',
    slug: 'shishi',
    tags: ['Web', 'Brand'],
    desc: "Asian-fusion brand and site for a Tel Aviv kitchen. Bilingual, motion-led, ordering wired in — the kind of marketing surface that has to behave on a Friday night rush.",
    href: 'https://www.shi-shi.co.il',
  },
  // 03 — reserved for next project. Uncomment and fill when ready.
  // {
  //   idx:  '03 — YYYY',
  //   year: 'YYYY',
  //   name: '...',
  //   slug: '...',
  //   tags: [],
  //   desc: '',
  //   href: '#',
  // },
];
