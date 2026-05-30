---
title: "Building With Specs, Not Prompts: How I Turn Ideas Into Executable Projects"
description: "A spec-first workflow for AI-assisted development — using Claude, Obsidian, and an LLM wiki to turn rough ideas into executable plans and preserve the outcome of each cycle."
date: 2026-05-29
---

A lot of AI-assisted development still happens one prompt at a time. That approach is fast for small experiments, but it starts to break once a project needs planning, consistency, and a way to carry decisions across multiple cycles. Spec-driven development offers a better model: define the work through structured artifacts first, then use AI to execute against those artifacts instead of improvising from chat history.

That is the workflow I have been building around Claude, Obsidian, and an LLM wiki. The seed idea comes from Andrej Karpathy's LLM Wiki pattern, and the system I built around it is a personal development knowledge base where source material enters through `raw/`, gets distilled into `wiki/`, and becomes reusable project context over time.[^1] But the real point of the setup is not "memory" on its own. The point is to support a spec-first development process where each phase of a project produces a concrete artifact the next phase can build on.

In practice, that means I do not treat the prompt as the unit of work.

> The unit of work is the spec.

## The operating model

The system has three working surfaces.

The first is `raw/`, where I capture the material that defines or informs the project: idea notes, research, PRDs, feature plans, article clippings, repo notes, and ad hoc project context. The second is `wiki/`, where the LLM maintains a more durable layer of distilled knowledge: source summaries, project pages, decision pages, patterns, technologies, and journals. The third is the actual project repository, where implementation, testing, commits, and pull requests happen.

<svg viewBox="0 0 720 470" width="100%" id="diag-surfaces" role="img" aria-label="Three working surfaces: I write into raw, Claude distils into wiki, the project repo reads from wiki on demand">
  <style>
    #diag-surfaces .box     { fill: rgba(255, 111, 89, 0.04); stroke: var(--accent); stroke-width: 1; }
    #diag-surfaces .rule    { stroke: rgba(191, 178, 155, 0.18); stroke-dasharray: 3 4; stroke-width: 1; }
    #diag-surfaces .tag     { font-family: var(--mono); font-size: 11px; fill: var(--accent); letter-spacing: 0.18em; }
    #diag-surfaces .sub     { font-family: var(--mono); font-size: 11px; fill: var(--text-dim); letter-spacing: 0.04em; }
    #diag-surfaces .item    { font-family: var(--mono); font-size: 13px; fill: var(--text); }
    #diag-surfaces .arrow   { stroke: var(--accent); stroke-width: 1.4; fill: none; }
    #diag-surfaces .arrlbl  { font-family: var(--mono); font-size: 10px; fill: var(--accent); letter-spacing: 0.16em; }
  </style>
  <defs>
    <marker id="surf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)"/>
    </marker>
  </defs>

  <rect class="box" x="40"  y="40" width="280" height="170" rx="2"/>
  <text class="tag"  x="56" y="70">// RAW</text>
  <text class="sub"  x="56" y="88">I write / drop</text>
  <line class="rule" x1="56" y1="100" x2="304" y2="100"/>
  <text class="item" x="56" y="126">· idea notes</text>
  <text class="item" x="56" y="148">· research</text>
  <text class="item" x="56" y="170">· PRDs</text>
  <text class="item" x="56" y="192">· feature plans</text>

  <rect class="box" x="400" y="40" width="280" height="170" rx="2"/>
  <text class="tag"  x="416" y="70">// WIKI</text>
  <text class="sub"  x="416" y="88">Claude writes</text>
  <line class="rule" x1="416" y1="100" x2="664" y2="100"/>
  <text class="item" x="416" y="126">· summaries</text>
  <text class="item" x="416" y="148">· patterns</text>
  <text class="item" x="416" y="170">· decisions</text>
  <text class="item" x="416" y="192">· cross-links</text>

  <path class="arrow" d="M 320 125 L 396 125" marker-end="url(#surf-arrow)"/>
  <text class="arrlbl" x="358" y="118" text-anchor="middle">DISTIL</text>

  <path class="arrow" d="M 540 210 C 540 250, 420 250, 380 290" marker-end="url(#surf-arrow)"/>
  <text class="arrlbl" x="556" y="252">READ ON DEMAND</text>

  <rect class="box" x="180" y="290" width="360" height="150" rx="2"/>
  <text class="tag"  x="196" y="320">// PROJECT REPO</text>
  <text class="sub"  x="196" y="338">where the software gets built</text>
  <line class="rule" x1="196" y1="350" x2="524" y2="350"/>
  <text class="item" x="196" y="376">· features</text>
  <text class="item" x="196" y="398">· tests</text>
  <text class="item" x="196" y="420">· commits / PRs</text>
</svg>

That split matters because each surface has a different job. `raw/` is where I write or collect inputs. `wiki/` is where the LLM turns those inputs into connected knowledge I can query later. The project repo is where the software gets built. When those boundaries are clear, Claude has a much better environment to work inside because it is not trying to infer the whole project from one conversation.[^2]

The flow is intentionally one-way at the knowledge level. Material comes in through `raw/`, gets distilled into `wiki/`, and future questions are answered by reading the maintained knowledge base instead of re-researching the same topic from scratch. That gives me a stable place to preserve the outcome of each development cycle, but the central mechanism is still specification: ideas become documents, documents become plans, and plans drive execution.

## CRAFTED

To make that process repeatable, I use a workflow I call CRAFTED: Conceive, Research, Architect, Frame, Try, Evaluate, Deliver.

Those phases are not just labels. They map directly to a chain of project artifacts and to a clear split between the vault and the codebase. Early phases happen in the vault because they define what should be built. Middle phases happen in the repo because they are about building and validating it. Final output returns to the vault so the finished work becomes reusable context instead of disappearing into a commit history.

The idea behind CRAFTED is simple: every project should move from ambiguity to execution through a series of progressively sharper specs.

<svg viewBox="0 0 720 580" width="100%" id="diag-crafted" role="img" aria-label="CRAFTED workflow: seven phases, each with an artifact and a surface (vault or repo). Conceive, Research and Architect live in the vault. Frame translates vault to repo. Try and Evaluate live in the repo. Deliver returns work to the vault.">
  <style>
    #diag-crafted .spine    { stroke: var(--accent); stroke-width: 1.3; fill: none; opacity: 0.55; }
    #diag-crafted .ring     { fill: #151515; stroke: var(--accent); stroke-width: 1.4; }
    #diag-crafted .ring-t   { fill: rgba(255, 111, 89, 0.10); stroke: var(--accent); stroke-width: 1.4; }
    #diag-crafted .letter   { font-family: var(--display); font-size: 26px; fill: var(--accent); letter-spacing: 0.04em; }
    #diag-crafted .name     { font-family: var(--display); font-size: 24px; fill: var(--text-bright); letter-spacing: 0.06em; }
    #diag-crafted .file     { font-family: var(--mono); font-size: 12px; fill: var(--text); letter-spacing: 0.02em; }
    #diag-crafted .tag      { font-family: var(--mono); font-size: 10px; fill: var(--text-dim); letter-spacing: 0.18em; }
    #diag-crafted .tag-t    { font-family: var(--mono); font-size: 10px; fill: var(--accent); letter-spacing: 0.18em; }
    #diag-crafted .hairline { stroke: rgba(191, 178, 155, 0.10); stroke-dasharray: 2 4; stroke-width: 1; }
  </style>

  <!-- continuous spine behind all the rings -->
  <line class="spine" x1="60" y1="50" x2="60" y2="530"/>

  <!-- column hairline separator between name+artifact and tag -->
  <line class="hairline" x1="600" y1="30" x2="600" y2="550"/>

  <!-- Row 1: CONCEIVE · y=70 · vault -->
  <circle class="ring" cx="60" cy="70" r="24"/>
  <text class="letter" x="60" y="79" text-anchor="middle">C</text>
  <text class="name" x="110" y="78">CONCEIVE</text>
  <text class="file" x="270" y="78">00-idea.md</text>
  <text class="tag"  x="700" y="78" text-anchor="end">VAULT</text>

  <!-- Row 2: RESEARCH · y=145 · vault -->
  <circle class="ring" cx="60" cy="145" r="24"/>
  <text class="letter" x="60" y="154" text-anchor="middle">R</text>
  <text class="name" x="110" y="153">RESEARCH</text>
  <text class="file" x="270" y="153">01-research.md</text>
  <text class="tag"  x="700" y="153" text-anchor="end">VAULT</text>

  <!-- Row 3: ARCHITECT · y=220 · vault -->
  <circle class="ring" cx="60" cy="220" r="24"/>
  <text class="letter" x="60" y="229" text-anchor="middle">A</text>
  <text class="name" x="110" y="228">ARCHITECT</text>
  <text class="file" x="270" y="228">02-prd.md</text>
  <text class="tag"  x="700" y="228" text-anchor="end">VAULT</text>

  <!-- Row 4: FRAME · y=295 · vault → repo (transition) -->
  <circle class="ring-t" cx="60" cy="295" r="24"/>
  <text class="letter" x="60" y="304" text-anchor="middle">F</text>
  <text class="name" x="110" y="303">FRAME</text>
  <text class="file" x="270" y="303">03-plan.md + features/*.md</text>
  <text class="tag-t" x="700" y="303" text-anchor="end">VAULT → REPO</text>

  <!-- Row 5: TRY · y=370 · repo -->
  <circle class="ring" cx="60" cy="370" r="24"/>
  <text class="letter" x="60" y="379" text-anchor="middle">T</text>
  <text class="name" x="110" y="378">TRY</text>
  <text class="file" x="270" y="378">implementation + history-ingest</text>
  <text class="tag"  x="700" y="378" text-anchor="end">REPO</text>

  <!-- Row 6: EVALUATE · y=445 · repo -->
  <circle class="ring" cx="60" cy="445" r="24"/>
  <text class="letter" x="60" y="454" text-anchor="middle">E</text>
  <text class="name" x="110" y="453">EVALUATE</text>
  <text class="file" x="270" y="453">tests, validation vs. plan</text>
  <text class="tag"  x="700" y="453" text-anchor="end">REPO</text>

  <!-- Row 7: DELIVER · y=520 · repo → vault (transition) -->
  <circle class="ring-t" cx="60" cy="520" r="24"/>
  <text class="letter" x="60" y="529" text-anchor="middle">D</text>
  <text class="name" x="110" y="528">DELIVER</text>
  <text class="file" x="270" y="528">wiki/projects/&lt;slug&gt;/* + decisions</text>
  <text class="tag-t" x="700" y="528" text-anchor="end">REPO → VAULT</text>
</svg>

### Conceive

Every project starts with a rough idea, not a roadmap.

I create a project folder and capture the first version of the idea in `raw/projects/<slug>/00-idea.md`. That file is not meant to be polished. It exists to pin down the original shape of the problem before it gets flattened by implementation details. What is the idea. Why does it matter. Who might it be for. What makes it interesting enough to continue.

This stage is intentionally light, because early project thinking is usually fragile. The goal is not to force clarity too early. It is to make sure the project enters the system in a structured way so the later stages have something concrete to refine.

Typical Claude invocation:

```text
> Stub raw/projects/repolens/00-idea.md from the idea template:
  problem, hypothesis, non-goals, why it's interesting. Don't
  polish it — I just want the shape pinned down.
```

If the idea has a soft edge worth pressing on, `/grill-me` is an optional next pass before research. It interviews me on the assumptions I didn't realise I was making, so research starts from sharper questions.

```text
> /grill-me   (optional — press on the idea note before research)
```

### Research

Once the idea exists, I test it against reality.

This phase produces `01-research.md`, usually with the help of a research skill that can perform multi-round web search and write out a landscape review with an honest verdict. That is an important detail: I do not want research that merely collects links. I want research that helps decide whether the idea is still worth building after seeing the market, the adjacent tools, the likely gaps, and the parts of the idea that are weaker than they first looked.

Good research changes the spec. It narrows scope, exposes false novelty, and forces better questions. By the end of this phase, the project should feel more grounded and less aspirational.

```text
> /wiki-research raw/projects/repolens/00-idea.md
> Produce 01-research.md: market landscape, adjacent tools, likely
  gaps, and a verdict on whether to continue. Cite every claim.
```

### Architect

After research, I turn the project into a product definition.

This is where `02-prd.md` gets written. The PRD defines the problem, the target user, the core workflow, the scope of the first version, the non-goals, and the constraints that should shape the build. In a traditional workflow this might live in a doc tool or ticketing system; in mine, it lives alongside the rest of the lifecycle so it can feed directly into the later steps.

This phase is where speculation becomes commitment. Once the PRD is written, I can stop asking "what are we even building?" and start asking "what is the cleanest path to the first correct version?"

Which tool I reach for depends on size. For larger projects I lean on `/to-prd`, which walks a structured PRD template and asks the questions I'd otherwise miss. For smaller, well-defined features I open Claude Code's plan mode (Shift+Tab) and let the PRD settle there.

```text
> /to-prd
> From 00-idea.md and 01-research.md, draft 02-prd.md. Be explicit
  about v1 non-goals — I'd rather cut scope than carry it.
```

### Frame

Frame is where the project leaves the vault and becomes executable.

At this point the work moves into the actual code repo, and the main task is to convert the PRD into an implementation plan. Claude Code's workflow supports planning before editing, which fits this phase well because the model can propose steps before touching files.[^2] The result is a high-level `03-plan.md` plus individual feature plans that break the project into bounded units of execution.

This is the most important transition in the workflow. The PRD answers what and why. The plan answers how. Once a feature has its own plan, dependencies, acceptance criteria, and scope boundaries, Claude is no longer guessing what success looks like. It is working against a defined artifact.

Same size call as Architect. For substantial features I run `/superpowers:brainstorming` — it forces the question-by-question shape a plan needs before any code is touched. For smaller, more obvious features, plan mode is enough.

```text
> /superpowers:brainstorming
> Topic: feature shape for repolens v1, derived from 02-prd.md.
  Output: one features/<slug>.md per bounded unit, with scope,
  dependencies, acceptance criteria, and a phased build order.
```

### Try

Try is the implementation phase.

This is where the code gets written in the project repo: features are built, branches move, commits accumulate, and the project starts to take real shape. But in a spec-driven workflow, implementation is never supposed to drift too far from the feature document that led to it. The point is not just to write code. The point is to execute against the planned shape of the work.

This is also where I want the system to preserve context from the development cycle itself. My repo includes a history-ingest skill designed to mine Claude sessions, update project state, advance feature statuses, and surface blockers or decisions back into the vault. That means the implementation trail can become part of the project record instead of staying trapped in ephemeral terminal sessions.

```text
> Implement features/repository-ingestion.md, phase 1 only. Stop
  before moving to phase 2 so I can review.
> /claude-history-ingest
  → log this session, advance the feature status, surface decisions.
```

### Evaluate

Evaluation happens in the code repo as well, because that is where the software has to prove itself.

This includes tests, debugging, validation against acceptance criteria, and the more qualitative question of whether the implementation still matches the intent of the spec. In a prompt-first workflow, evaluation often happens as a loose conversation after code already exists. In a spec-first workflow, evaluation is much tighter: did the feature do what the plan said it should do, and where did the spec itself turn out to be weak.

That second question matters a lot. Good evaluation does not just catch bugs. It improves the next version of the spec. If the implementation drifted, maybe the code was wrong. But sometimes the more interesting answer is that the plan was incomplete, overconfident, or blind to some constraint the build exposed.

```text
> /wiki-query "symbol resolution drift in monorepos"
  → if it's been hit before, link the prior notes. If not, write
  today's investigation into raw/decisions/.
```

### Deliver

Deliver is the phase where shipped work becomes reusable knowledge.

Once a feature is done, it gets promoted from the working feature doc in `raw/projects/<slug>/features/` into a schema-compliant page under `wiki/projects/<slug>/features/`. The deliver step can also surface decision pages and reusable patterns worth preserving beyond the current project. This is what keeps the system from becoming just another planning layer with no long-term payoff.

At this point the project has completed a full development cycle. An idea became a research artifact, then a PRD, then a plan, then an implementation, then a validated result, and finally a durable reference. That is the loop I care about: not one perfect prompt, but a system where each cycle leaves the next one in a stronger position.

```text
> /wiki-promote-feature repository-ingestion
  → carry through the decision about chunking strategy. If the
  shape is reusable, add a pattern page for "codebase-to-knowledge
  transformation".
```

## Example project: RepoLens

A concrete example makes the workflow easier to see. **RepoLens** is a tool for turning a codebase into onboarding documentation: architecture notes, feature summaries, and source-grounded explanations of how a system is organized. It is a useful example because it has enough surface area to require research, a product definition, a multi-step implementation plan, and feature-level delivery.

Each CRAFTED phase produces a file. Below is what each one looks like in practice.

**Conceive — `raw/projects/repolens/00-idea.md`**

```md
# RepoLens — idea note

## Problem
Teams move fast, repo context decays fast. Onboarding is rebuilt
from tribal knowledge instead of a maintained source of truth.

## Hypothesis
A tool that ingests a codebase and produces architecture notes,
feature summaries, and source-grounded explanations — kept fresh
as the repo evolves.

## Not (v0)
- Real-time indexing
- Auto-remediation / "fix it for me"
- Code review

## Why interesting
The artifact is a *living* doc, not a static export. The repo is
the source of truth; the doc is a derived view.
```

**Research — `raw/projects/repolens/01-research.md` (excerpt)**

```md
## Landscape verdict
Crowded at the edges (devportals, code-summary tools), thinner in
the middle — "always-fresh, source-grounded onboarding docs" is
where the real angle sits. Continue.

## Closest neighbours
- Backstage — devportal, not source-grounded
- Sourcegraph Cody — source-grounded, not onboarding-shaped
- Mintlify — docs-as-code, no codebase ingestion

## Risks to spec
- "Always-fresh" is a much bigger commitment than v0 should make
- Onboarding doc quality is hard to evaluate automatically
```

**Architect — `raw/projects/repolens/02-prd.md` (sketch)**

```md
# RepoLens PRD

Target user      : eng teams onboarding new developers
Core workflow    : ingest repo → detect structure → generate docs → human review
v1 scope         : single-repo TypeScript / Python projects
v1 non-goals     : monorepos, real-time updates, auto-PRs to docs
Hard constraints : local-first; no upload of source to external services
Success signal   : a new hire can answer "where does X live?" without asking
```

**Frame — `features/architecture-summarizer.md` (excerpt)**

```md
# Feature: Architecture summarizer

## Scope
Take a repo tree + entry points → produce architecture.md with:
module map, data flow, key boundaries.

## Acceptance criteria
- Runs offline against the local repo
- Generated doc references real file paths
- A human reviewer can mark sections "looks right / looks wrong"
- Re-run keeps the human verdicts unless the code changed

## Phased build
1. Tree walk + entry-point detection
2. LLM pass to draft sections with citations
3. Verdict file + diff-aware re-run
```

**Try — implementation in the repo**

The work happens against `features/architecture-summarizer.md`, not against a free-form conversation. Phase 1 lands, gets reviewed, then phase 2 starts. `claude-history-ingest` runs in the background and writes session summaries back into `wiki/projects/repolens/sessions/`.

**Evaluate — testing against the spec**

```md
## Verdict for architecture-summarizer v1
- AC1 (offline)              : pass
- AC2 (real file paths)       : pass
- AC3 (human verdict UI)      : pass
- AC4 (diff-aware re-run)     : FAIL on rename — file move resets verdict

→ Spec was incomplete. Add: AC5 — rename detection feeds prior verdicts forward.
```

The failure isn't just a bug. It's a missing line in the spec. That's the kind of insight a spec-first loop is supposed to surface.

**Deliver — `wiki/projects/repolens/features/architecture-summarizer.md`**

```md
# Architecture Summarizer (delivered)

Status     : shipped, v1
Plan       : [[features/architecture-summarizer]]
Decisions  : [[decisions/diff-aware-rerun]]
Pattern    : [[patterns/codebase-to-knowledge-transformation]]

## What changed about the spec
v1 shipped with AC5 (rename detection) added mid-build, after a
failure mode the original plan didn't see. The pattern page
captures the general shape ("derive a doc from a repo and keep
human verdicts attached to evolving code") so the next project
doesn't relearn it.
```

That trail — `00-idea` → `01-research` → `02-prd` → `features/*` → verdict → promoted wiki entry — is the project's permanent record. The next project starts with the pattern page already on hand, and the decision page is one `wiki-query` away.

## Why this works better

The main advantage of this workflow is not that it makes AI look smarter. It is that it reduces drift.

> Spec-first development creates stable checkpoints. The model works across them because the project has a structure it can keep returning to.

Prompt-first development tends to distribute important reasoning across temporary conversations. That makes it easy to move fast at the beginning and surprisingly hard to stay coherent later. Spec-first development gives Claude (and me) anchors: the idea file, the research artifact, the PRD, the plan, the feature spec, the evaluation trail, and the final promoted result.[^4]

This is also why Obsidian and the LLM wiki are useful here. They are not there to romanticize note-taking. They are there to give the project lifecycle a durable file-based interface, one where the artifacts can be read, linked, reviewed, and updated over time. The wiki preserves what each cycle produced, but the center of gravity is still execution through specs.[^3]

That matters more as projects become real. It is easy to vibe-code a toy project. It is much harder to build something that can survive research, planning, implementation, validation, and iteration without losing its shape. A spec-first workflow gives the model better instructions, but more importantly, it gives the project better boundaries.

## Closing

The way I think about AI-assisted development has changed pretty sharply.

I no longer see the prompt as the main interface for building software. The prompt is only useful if the project already has a structure behind it. The real interface is the chain of artifacts that define the work: idea notes, research, PRDs, plans, feature files, tests, decisions, and promoted results. Claude helps me move through that chain, but the chain itself is what makes the work coherent.

That is what this workflow is trying to do. It turns rough ideas into executable projects by making specs the center of the process and by preserving the result of each development cycle in a form that future work can build on. Not prompts first. Specs first.

---

[^1]: `dev-llm-wiki` — the repo this workflow lives in. <https://github.com/YoniRaviv/dev-llm-wiki>
[^2]: Claude Code — *Common workflows.* <https://code.claude.com/docs/en/common-workflows>
[^3]: Agentpedia — *Karpathy's LLM wiki "idea file" pattern.* <https://agentpedia.codes/blog/karpathy-llm-wiki-idea-file>
[^4]: Martin Fowler — *Exploring Gen AI: spec-driven development tools.* <https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html>
