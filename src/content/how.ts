import type { SkillGroup } from './_types';

export const how = {
    label: { num: '04 / ', text: 'How I build' },
    heading: 'Small <em>sharp</em> stack.',
};

export const skillGroups: SkillGroup[] = [
    {
        idx: 'i.',
        label: 'Languages',
        blurb: 'The grammar layer. Strong typing and fast feedback.',
        chips: [
            { name: 'TypeScript', level: 'daily', hero: true },
            { name: 'Python', level: 'daily', hero: true },
            { name: 'CSS', level: 'fluent' },
            { name: 'Bash', level: 'occasional' },
        ],
    },
    {
        idx: 'ii.',
        label: 'Frontend',
        blurb: 'Pixels, motion, state. The half users actually touch.',
        chips: [
            { name: 'React', level: '5 yr', hero: true },
            { name: 'Next.js', level: '4 yr', hero: true },
            { name: 'Tailwind', level: '2 yr' },
            { name: 'Three.js', level: '1 yr' },
            { name: 'Framer Motion', level: '1 yr' },
            { name: 'Zustand', level: '4 yr' },
            { name: 'Redux', level: '2 yr' },
        ],
    },
    {
        idx: 'iii.',
        label: 'Backend & Data',
        blurb: 'APIs, stores, queues. Where the work actually happens.',
        chips: [
            { name: 'Node.js', level: 'core', hero: true },
            { name: 'FastAPI', level: 'core', hero: true },
            { name: 'PostgreSQL', level: 'core' },
            { name: 'Redis', level: 'core' },
            { name: 'GraphQL', level: 'fluent' },
        ],
    },
    {
        idx: 'iv.',
        label: 'AI & ML',
        blurb: 'Agents, retrieval, eval. Specs over guesses.',
        chips: [
            { name: 'LLM agents', level: '1 yr', hero: true },
            { name: 'RAG', level: 'shipped', hero: true },
            { name: 'Langfuse', level: 'daily', hero: true },
            { name: 'Anthropic SDK', level: 'shipped', hero: true },
            { name: 'OpenAI SDK', level: 'shipped' },
            { name: 'Embeddings', level: 'shipped' },
            { name: 'Eval & guardrails', level: 'shipped' },
            { name: 'LangChain', level: 'working' },
            { name: 'CrewAI', level: 'working' },
        ],
    },
    {
        idx: 'v.',
        label: 'Infra',
        blurb: 'Ship it, watch it, scale it, page on it.',
        chips: [
            { name: 'Docker', level: 'daily', hero: true },
            { name: 'AWS', level: 'shipped' },
            { name: 'GitHub Actions', level: 'daily' },
            { name: 'Terraform', level: 'working' },
        ],
    },
];
