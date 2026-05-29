import type { MetaCell } from './_types';

export const who = {
  label: { num: '01 / ', text: 'Who' },
  quote: 'I write code with intent. <em>Six years</em> of engineering experience, a computer science foundation, and a growing focus on <em>intelligent</em> systems.',
  quoteAlt: 'I write code that mostly does what I meant. <em>Six years</em> of finding out what I actually meant, a CS degree that pointed the way, and a growing trust in machines that can <em>think</em> back.',
  cells: <MetaCell[]>[
    { k: 'Years',      v: '06',         vs: 'Shipping production code since 2018.' },
    { k: 'Education',  v: 'B.Sc.',      vs: 'Computer Science — graduated 2020.' },
    { k: 'Discipline', v: 'Full-stack', vs: 'From cursor blink to inference latency.' },
    { k: 'Now',        v: 'AI',         vs: 'Agents, RAG, eval. Specs over guesses.' },
  ],
};
