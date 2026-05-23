import type { Role } from './_types';

export const where = {
  label: { num: '03 / ', text: "Where I've been" },
  heading: "Where <em>I've</em> been.",
  blurb: 'Six years across product, platform, and lately, intelligence.',
};

export const roles: Role[] = [
  {
    range: '2024 — Present',
    company: '[Company A]',
    title: 'Senior AI Engineer · [Placeholder]',
    city: 'Tel Aviv · IL',
    current: true,
  },
  {
    range: '2022 — 2024',
    company: '[Company B]',
    title: 'Fullstack · Platform',
    city: 'Remote · EU',
  },
  {
    range: '2020 — 2022',
    company: '[Company C]',
    title: 'Software Engineer',
    city: 'Tel Aviv · IL',
  },
  {
    range: '2019 — 2020',
    company: '[First gig]',
    title: 'Engineering Intern → Junior',
    city: 'Tel Aviv · IL',
  },
];
