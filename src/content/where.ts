import type { Role } from './_types';

export const where = {
  label: { num: '03 / ', text: "Where I've been" },
  heading: "Where <em>I've</em> been.",
  blurb: 'One freelance year, then five at Tenengroup. Frontend → fullstack → AI — by design, not drift.',
};

export const roles: Role[] = [
  {
    range: '2026 — Present',
    company: 'Tenengroup',
    title: 'AI Engineer',
    city: 'Tel Aviv · IL',
    current: true,
  },
  {
    range: '2021 — 2026',
    company: 'Tenengroup',
    title: 'Frontend → Fullstack Engineer',
    city: 'Tel Aviv · IL',
  },
  {
    range: '2018 — 2019',
    company: 'Dodi-hosting',
    title: 'Freelance Developer',
    city: 'Remote',
  },
];
