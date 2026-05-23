import type { Project } from './_types';

export const what = {
  label: { num: '02 / ', text: "What I've built" },
};

export const projects: Project[] = [
  {
    idx: '01 — 2025',
    year: '2025',
    name: 'Relay',
    slug: 'relay',
    tags: ['Active', 'AI'],
    desc: 'Specs-driven development app. A bridge between intent and implementation — write what, ship how.',
    href: '#',
  },
  {
    idx: '02 — 2024',
    year: '2024',
    name: 'Shi-Shi',
    slug: 'shishi',
    tags: ['Web', 'Brand'],
    desc: 'A restaurant identity rendered in code. Type, motion, and a menu that breathes.',
    href: '#',
  },
  {
    idx: '03 — ____',
    year: 'next',
    name: '[ next ]',
    slug: 'placeholder',
    tags: ['Soon'],
    desc: "Reserved for the project I haven't shipped yet. Watch this space.",
    href: '#',
  },
];
