import type { Role } from './_types';

export const where = {
  label: { num: '03 / ', text: "Where I've been" },
  heading: "Where <em>I've</em> been.",
  blurb: 'Two years shipping client sites, then six at Tenengroup: frontend → senior → AI. By design, not drift.',
};

export const roles: Role[] = [
  {
    range: '2026 — Present',
    company: '[Tenengroup]',
    title: 'AI Engineer',
    city: 'Tel Aviv · IL',
    current: true,
  },
  {
    range: '2024 — 2026',
    company: '[Tenengroup]',
    title: 'Senior Frontend Developer',
    city: 'Tel Aviv · IL',
  },
  {
    range: '2021 — 2024',
    company: '[Tenengroup]',
    title: 'Frontend Developer',
    city: 'Tel Aviv · IL',
  },
  {
    range: '2018 — 2019',
    company: '[Dodi-net]',
    title: 'Frontend Developer',
    city: 'Holon · IL',
  },
];
