import type { MetaCell } from './_types';

export const who = {
  label: { num: '01 / ', text: 'Who' },
  quote: 'I write code with intent. <em>Six years</em> at the bench, a CS degree in the drawer, and a recent focus on the <em>thinking</em> half of the machine.',
  quoteAlt: 'I argue with stubborn machines. <em>Six years</em> of mostly small wins, my CS degree gathering dust on a shelf, teaching them to <em>think</em> for me, all day.',
  cells: <MetaCell[]>[
    { k: 'Years',      v: '06',         vs: 'Shipping production code since 2018.' },
    { k: 'Education',  v: 'B.Sc.',      vs: 'Computer Science — graduated 2020.' },
    { k: 'Discipline', v: 'Full-stack', vs: 'From cursor blink to inference latency.' },
    { k: 'Now',        v: 'AI',         vs: 'Agents, RAG, eval. Specs over guesses.' },
  ],
};
