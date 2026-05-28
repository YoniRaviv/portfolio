import type { NavLink } from './_types';

export const navLinks: NavLink[] = [
  { href: '#who',     label: 'Who',     anchor: 'who' },
  { href: '#what',    label: 'What',    anchor: 'what' },
  { href: '#where',   label: 'Where',   anchor: 'where' },
  { href: '#how',     label: 'How',     anchor: 'how' },
  { href: '#contact', label: 'Contact', anchor: 'contact' },
  { href: '/thoughts', label: 'Thoughts', external: true },
];
