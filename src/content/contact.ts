import type { Social } from './_types';
import { site } from './site';

export const contact = {
  label: { num: '05 / ', text: 'Contact' },
  lead: "Let's <em>ship</em> something.",
  email: site.email,
};

export const socials: Social[] = [
  { kind: 'GitHub',      handle: '@YoniRaviv',          href: site.github,   kicker: '// Code' },
  { kind: 'LinkedIn',    handle: '/in/yonathan-raviv',  href: site.linkedin, kicker: '// Professional' },
  { kind: 'X / Twitter', handle: '@yonathan_raviv',     href: 'https://x.com/yonathan_raviv', kicker: '// Thoughts' },
];
