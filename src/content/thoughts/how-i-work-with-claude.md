---
title: "Building With Specs, Not Prompts: How I Turn Ideas Into Executable Projects"
description: "A spec-first workflow for AI-assisted development: an Obsidian vault owns the idea, the research and the PRD, a tracker owns execution, and a hook closes the loop at PR time."
date: 2026-05-29
updated: 2026-08-14
---

A lot of AI-assisted development still happens one prompt at a time. That approach is fast for small experiments, but it starts to break once a project needs planning, consistency, and a way to carry decisions across multiple cycles. Spec-driven development offers a better model: define the work through structured artifacts first, then use AI to execute against those artifacts instead of improvising from chat history.

That is the workflow I have been building around Claude, Obsidian, and an LLM wiki. The seed idea comes from Andrej Karpathy's LLM Wiki pattern, and the system I built around it is a personal development knowledge base where source material enters through `raw/`, gets distilled into `wiki/`, and becomes reusable project context over time.[^1] But the real point of the setup is not "memory" on its own. The point is to support a spec-first development process where each phase of a project produces a concrete artifact the next phase can build on.

In practice, that means I do not treat the prompt as the unit of work.

> The unit of work is the spec.

The first version of this system tried to hold the whole lifecycle in the vault — including what was in progress. That part failed, and fixing it is what gave the workflow its current shape.

## The invariant

Everything in the vault now follows from one rule:

> The vault stores tracker **identity** — a URL. Never tracker **state**: a phase, a percentage, "Blocked on", "Next up", "Working on".

A URL cannot go stale. A status always does.

That sounds like a small distinction and it is not. A knowledge base that also tries to track progress becomes a second, worse tracker. Every page turns into a snapshot that starts decaying the moment you write it, and within a few weeks you have learned to distrust all of them — which means you have learned to distrust the vault. So the vault refuses to hold status at all, and a pre-commit gate stops me from sneaking it back in.

What is left is a clean split of ownership. The vault owns everything *before* execution — the idea, the research, the PRD, the plan — and everything *durable after* it: the decisions, the patterns, the record of what shipped. An issue tracker owns execution itself. In my case that is Linear; substitute yours, the design does not care which.

## The loop

<svg viewBox="0 0 720 580" width="100%" id="diag-loop" role="img" aria-label="The dev loop: the vault supplies context to planning and receives the PRD and plan back; planning sends issues to Linear; Linear hands the next task back for execution in a worktree; execution moves to verification against a definition of done, then to opening a pull request; two automatic hooks then write decisions and patterns back to the vault and move the issue status in Linear.">
  <style>
    #diag-loop .box     { fill: rgba(255, 111, 89, 0.04); stroke: var(--accent); stroke-width: 1; }
    #diag-loop .side    { fill: rgba(191, 178, 155, 0.04); stroke: rgba(191, 178, 155, 0.25); stroke-width: 1; }
    #diag-loop .zone    { fill: none; stroke: rgba(191, 178, 155, 0.16); stroke-width: 1; stroke-dasharray: 2 4; }
    #diag-loop .knock   { fill: var(--main); }
    #diag-loop .tag     { font-family: var(--mono); font-size: 10px; fill: var(--accent); letter-spacing: 0.16em; }
    #diag-loop .tag-d   { font-family: var(--mono); font-size: 10px; fill: var(--text-dim); letter-spacing: 0.16em; }
    #diag-loop .name    { font-family: var(--display); font-size: 19px; fill: var(--text-bright); letter-spacing: 0.04em; }
    #diag-loop .sub     { font-family: var(--mono); font-size: 11px; fill: var(--text-dim); letter-spacing: 0.02em; }
    #diag-loop .sub-s   { font-family: var(--mono); font-size: 10px; fill: var(--text-dim); letter-spacing: 0.01em; }
    #diag-loop .arrow   { stroke: rgba(191, 178, 155, 0.5); stroke-width: 1.3; fill: none; }
    #diag-loop .hook    { stroke: var(--accent); stroke-width: 1.3; fill: none; stroke-dasharray: 4 4; }
    #diag-loop .arrlbl  { font-family: var(--mono); font-size: 10px; fill: var(--text-dim); letter-spacing: 0.16em; }
    #diag-loop .hooklbl { font-family: var(--mono); font-size: 10px; fill: var(--accent); letter-spacing: 0.16em; }
  </style>
  <defs>
    <marker id="loop-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(191, 178, 155, 0.5)"/>
    </marker>
    <marker id="loop-hook" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)"/>
    </marker>
  </defs>

  <!-- the repo zone that holds the four working steps -->
  <rect class="zone" x="220" y="24" width="280" height="524" rx="2"/>
  <rect class="knock" x="256" y="18" width="208" height="12"/>
  <text class="tag-d" x="360" y="27" text-anchor="middle">PROJECT REPO · CLAUDE CODE</text>

  <!-- arrows first, so the boxes sit on top of them -->
  <path class="arrow" d="M 160 74 L 238 74" marker-end="url(#loop-arrow)"/>
  <text class="arrlbl" x="201" y="66" text-anchor="middle">CONTEXT</text>
  <path class="arrow" d="M 242 110 L 164 110" marker-end="url(#loop-arrow)"/>
  <text class="arrlbl" x="201" y="126" text-anchor="middle">PRD · PLAN</text>

  <path class="arrow" d="M 478 74 L 556 74" marker-end="url(#loop-arrow)"/>
  <text class="arrlbl" x="519" y="66" text-anchor="middle">ISSUES</text>

  <path class="arrow" d="M 600 136 V 232 Q 600 240 592 240 L 482 240" marker-end="url(#loop-arrow)"/>
  <text class="arrlbl" x="584" y="196" text-anchor="end">NEXT TASK</text>

  <path class="arrow" d="M 360 284 L 360 312" marker-end="url(#loop-arrow)"/>
  <path class="arrow" d="M 360 404 L 360 432" marker-end="url(#loop-arrow)"/>

  <path class="hook" d="M 242 480 L 98 480 Q 90 480 90 472 L 90 144" marker-end="url(#loop-hook)"/>
  <text class="hooklbl" x="100" y="300">HOOK · DECISIONS</text>
  <path class="hook" d="M 478 480 L 652 480 Q 660 480 660 472 L 660 144" marker-end="url(#loop-hook)"/>
  <text class="hooklbl" x="650" y="300" text-anchor="end">HOOK · STATUS</text>

  <!-- vault -->
  <rect class="side" x="8" y="48" width="152" height="88" rx="2"/>
  <text class="tag-d" x="24" y="72">// VAULT</text>
  <text class="name"  x="24" y="98">WIKI</text>
  <text class="sub-s" x="24" y="118">patterns · decisions</text>

  <!-- tracker -->
  <rect class="side" x="560" y="48" width="152" height="88" rx="2"/>
  <text class="tag-d" x="576" y="72">// TRACKER</text>
  <text class="name"  x="576" y="98">LINEAR</text>
  <text class="sub-s" x="576" y="118">issues · how &amp; when</text>

  <!-- 01 planning -->
  <rect class="box" x="242" y="48" width="236" height="88" rx="2"/>
  <text class="tag" x="258" y="72">// 01</text>
  <text class="name" x="258" y="98">PLANNING</text>
  <text class="sub"  x="258" y="118">idea · research · prd</text>

  <!-- 02 executing -->
  <rect class="box" x="242" y="196" width="236" height="88" rx="2"/>
  <text class="tag" x="258" y="220">// 02</text>
  <text class="name" x="258" y="246">EXECUTING</text>
  <text class="sub"  x="258" y="266">worktree · code · commits</text>

  <!-- 03 verifying -->
  <rect class="box" x="242" y="316" width="236" height="88" rx="2"/>
  <text class="tag" x="258" y="340">// 03</text>
  <text class="name" x="258" y="366">VERIFYING</text>
  <text class="sub"  x="258" y="386">tests · definition of done</text>

  <!-- 04 open pr -->
  <rect class="box" x="242" y="436" width="236" height="88" rx="2"/>
  <text class="tag" x="258" y="460">// 04</text>
  <text class="name" x="258" y="486">OPEN PR</text>
  <text class="sub"  x="258" y="506">review · merge</text>

  <line x1="8" y1="562" x2="712" y2="562" stroke="rgba(191, 178, 155, 0.12)" stroke-width="1"/>
  <path class="hook" d="M 8 574 L 34 574"/>
  <text class="hooklbl" x="44" y="577">AUTOMATIC · CLAUDE CODE HOOK</text>
</svg>

Read it as three owners rather than three folders. The vault feeds context into planning and receives the PRD and the plan back. Planning hands issues to Linear, and Linear hands back one task at a time. The middle column is the only place code exists. And once a pull request opens, two hooks fire without being asked: one offers to write what was decided back into the vault, the other moves the issue in Linear.[^7]

Every arrow crossing a boundary is a place the old version of this system leaked. Status used to flow left into the vault; now only knowledge does.

## Three zones

Inside the vault, a file's zone tells you who writes it.

```text
raw/          YOU write, the agent only reads
              articles · tweets · repos · books · videos · ideas

wiki/         THE AGENT writes
              sources/ · patterns/ · decisions/ · technologies/
              domains/ · ideas/ · journal/ · index.md · topics.md

projects/     BOTH write, per slot — and the slots are whitelisted
              <slug>.md          the project page: what it is · tracker · URL
              <slug>/
                00-idea.md       YOU     the spark
                01-research.md   AGENT   landscape + an honest verdict
                02-prd.md        BOTH    what + why, never how/when
                03-plan.md       BOTH  ⟨only while tracker: none⟩
                features/        BOTH  ⟨only while tracker: none⟩
                spine.md         AGENT ⟨only once a tracker is set⟩
                shipped/         AGENT   records of built work
                notes/ assets/
```

Nothing else may exist in a project folder. No status file, no kanban, no nested projects — the gate rejects them.

The flow is one-way at the knowledge level. Material comes in through `raw/`, gets distilled into `wiki/`, and future questions get answered by reading the maintained knowledge base instead of re-researching the same topic from scratch. `wiki/index.md` is the entry point: one line per page, so an agent reads the index, decides which pages matter, and opens only those. Nothing ever scans the whole vault.

Notice the two conditional slots. `03-plan.md` and `features/` are legal only while a project has no tracker, and `spine.md` is legal only once it does. That pair is the hinge the whole workflow turns on, and it has a name.

## CRAFTED

To make the process repeatable, I use a workflow I call CRAFTED: Conceive, Research, Architect, Frame, Try, Evaluate, Deliver — with a promotion step sitting between Frame and Try where the project changes hands.

<svg viewBox="0 0 720 580" width="100%" id="diag-crafted" role="img" aria-label="CRAFTED workflow: eight rows, each with an artifact and a surface. Conceive, Research, Architect and Frame live in the vault. Promote moves the plan out to the tracker. Try and Evaluate live in the repo. Deliver returns the work to the vault.">
  <style>
    #diag-crafted .spine    { stroke: var(--accent); stroke-width: 1.3; fill: none; opacity: 0.55; }
    #diag-crafted .ring     { fill: var(--main); stroke: var(--accent); stroke-width: 1.4; }
    #diag-crafted .ring-t   { fill: rgba(255, 111, 89, 0.10); stroke: var(--accent); stroke-width: 1.4; }
    #diag-crafted .letter   { font-family: var(--display); font-size: 24px; fill: var(--accent); letter-spacing: 0.04em; }
    #diag-crafted .name     { font-family: var(--display); font-size: 22px; fill: var(--text-bright); letter-spacing: 0.04em; }
    #diag-crafted .file     { font-family: var(--mono); font-size: 12px; fill: var(--text); letter-spacing: 0.02em; }
    #diag-crafted .tag      { font-family: var(--mono); font-size: 10px; fill: var(--text-dim); letter-spacing: 0.16em; }
    #diag-crafted .tag-t    { font-family: var(--mono); font-size: 10px; fill: var(--accent); letter-spacing: 0.16em; }
    #diag-crafted .hairline { stroke: rgba(191, 178, 155, 0.16); stroke-dasharray: 2 4; stroke-width: 1; }
  </style>

  <!-- continuous spine behind all the rings -->
  <line class="spine" x1="60" y1="38" x2="60" y2="558"/>

  <!-- column hairline separator between name+artifact and tag -->
  <line class="hairline" x1="556" y1="24" x2="556" y2="572"/>

  <!-- Row 1: CONCEIVE · y=60 · vault -->
  <circle class="ring" cx="60" cy="60" r="22"/>
  <text class="letter" x="60" y="68" text-anchor="middle">C</text>
  <text class="name" x="106" y="67">CONCEIVE</text>
  <text class="file" x="264" y="67">projects/&lt;slug&gt;/00-idea.md</text>
  <text class="tag"  x="700" y="67" text-anchor="end">VAULT</text>

  <!-- Row 2: RESEARCH · y=128 · vault -->
  <circle class="ring" cx="60" cy="128" r="22"/>
  <text class="letter" x="60" y="136" text-anchor="middle">R</text>
  <text class="name" x="106" y="135">RESEARCH</text>
  <text class="file" x="264" y="135">01-research.md</text>
  <text class="tag"  x="700" y="135" text-anchor="end">VAULT</text>

  <!-- Row 3: ARCHITECT · y=196 · vault -->
  <circle class="ring" cx="60" cy="196" r="22"/>
  <text class="letter" x="60" y="204" text-anchor="middle">A</text>
  <text class="name" x="106" y="203">ARCHITECT</text>
  <text class="file" x="264" y="203">02-prd.md</text>
  <text class="tag"  x="700" y="203" text-anchor="end">VAULT</text>

  <!-- Row 4: FRAME · y=264 · vault -->
  <circle class="ring" cx="60" cy="264" r="22"/>
  <text class="letter" x="60" y="272" text-anchor="middle">F</text>
  <text class="name" x="106" y="271">FRAME</text>
  <text class="file" x="264" y="271">03-plan.md · features/</text>
  <text class="tag"  x="700" y="271" text-anchor="end">VAULT</text>

  <!-- Row 5: PROMOTE · y=332 · vault → tracker (transition) -->
  <circle class="ring-t" cx="60" cy="332" r="22"/>
  <!-- PROMOTE is the one row that isn't a letter of CRAFTED — a dot, not a gap -->
  <circle cx="60" cy="332" r="3.5" fill="var(--accent)"/>
  <text class="name" x="106" y="339">PROMOTE</text>
  <text class="file" x="264" y="339">plan → issues · spine.md</text>
  <text class="tag-t" x="700" y="339" text-anchor="end">VAULT → TRACKER</text>

  <!-- Row 6: TRY · y=400 · tracker → repo (transition) -->
  <circle class="ring-t" cx="60" cy="400" r="22"/>
  <text class="letter" x="60" y="408" text-anchor="middle">T</text>
  <text class="name" x="106" y="407">TRY</text>
  <text class="file" x="264" y="407">one ticket · one fresh session</text>
  <text class="tag-t" x="700" y="407" text-anchor="end">TRACKER → REPO</text>

  <!-- Row 7: EVALUATE · y=468 · repo -->
  <circle class="ring" cx="60" cy="468" r="22"/>
  <text class="letter" x="60" y="476" text-anchor="middle">E</text>
  <text class="name" x="106" y="475">EVALUATE</text>
  <text class="file" x="264" y="475">tests · definition of done</text>
  <text class="tag"  x="700" y="475" text-anchor="end">REPO</text>

  <!-- Row 8: DELIVER · y=536 · repo → vault (transition) -->
  <circle class="ring-t" cx="60" cy="536" r="22"/>
  <text class="letter" x="60" y="544" text-anchor="middle">D</text>
  <text class="name" x="106" y="543">DELIVER</text>
  <text class="file" x="264" y="543">wiki/decisions · shipped/</text>
  <text class="tag-t" x="700" y="543" text-anchor="end">REPO → VAULT</text>
</svg>

The phases are not just labels. They map to a chain of artifacts and to a clear split of ownership: the first four happen in the vault because they define what should be built, the middle ones happen in the repo because they are about building and validating it, and the last one returns the result to the vault so the finished work becomes reusable context instead of disappearing into a commit history.

The idea behind CRAFTED is simple: every project should move from ambiguity to execution through a series of progressively sharper specs.

### Conceive

Every project starts with a rough idea, not a roadmap.

A scaffolding script creates the folder, and I write the first version of the idea into `projects/<slug>/00-idea.md`. That file is deliberately mine — the agent reads that slot, it does not fill it. It exists to pin down the original shape of the problem before implementation details flatten it. What is the idea. Why does it matter. Who might it be for. What makes it interesting enough to continue.

This stage is intentionally light, because early project thinking is usually fragile. The goal is not to force clarity too early. It is to make sure the project enters the system in a structured way so the later stages have something concrete to refine.

```text
$ .scripts/new-project.sh repolens
  → projects/repolens.md         tracker: none
  → projects/repolens/00-idea.md yours to write

> Stub 00-idea.md: problem, hypothesis, non-goals, why it's
  interesting. Don't polish it — I just want the shape pinned down.
```

If the idea has a soft edge worth pressing on, `/grill-me` is an optional next pass before research. It interviews me on the assumptions I didn't realise I was making, so research starts from sharper questions.

### Research

Once the idea exists, I test it against reality.

This phase produces `01-research.md`, usually with the help of `/idea-deep-research`[^5] — a skill that performs multi-round web search and writes out a landscape review with an honest verdict. That is an important detail: I do not want research that merely collects links. I want research that helps decide whether the idea is still worth building after seeing the market, the adjacent tools, the likely gaps, and the parts of the idea that are weaker than they first looked.

Good research changes the spec. It narrows scope, exposes false novelty, and forces better questions. The slot template ends with a **Verdict** heading for exactly that reason — a research file that reaches the bottom without answering "is this worth building, and what would have to be true?" has not done its job.

```text
> /idea-deep-research projects/repolens/00-idea.md
> Produce 01-research.md: market landscape, adjacent tools, likely
  gaps, and a verdict on whether to continue. Cite every claim.
```

### Architect

After research, I turn the project into a product definition.

This is where `02-prd.md` gets written: the problem, the target user, the core workflow, the scope of the first version, the non-goals, and the constraints that should shape the build. What it must not contain is *how* and *when* — no sequence, no tasks, no phases, no progress. That boundary is enforced rather than suggested. The gate rejects a checkbox, a `## Phase` heading, or a bare date anywhere in this file.

That restriction is more useful than it sounds. Left alone, a PRD quietly grows a plan inside it, and then there are two plans that disagree. Keeping the file pure means it stays *living* — when scope changes I update the PRD, re-sync whatever copy the tracker holds, and bump a `prd_synced` date. On disagreement, the vault wins on what and why; the tracker wins on how and when.

For larger projects I run `/grill-me` first — it interviews me on the assumptions I'd otherwise miss — then draft the PRD from the answers. For smaller, well-defined features I open Claude Code's plan mode (Shift+Tab) and let the PRD settle there.

```text
> /grill-me   (press on the open questions before committing)
> Then, from 00-idea.md and 01-research.md, draft 02-prd.md. Be
  explicit about v1 non-goals — I'd rather cut scope than carry it.
```

### Frame

Frame is where the project stops describing itself and becomes executable.

The task here is converting the PRD into an implementation plan: a high-level `03-plan.md` plus individual feature files that break the project into bounded units of work. The PRD answers what and why. The plan answers how. Once a feature has dependencies, acceptance criteria, and scope boundaries, Claude is no longer guessing what success looks like — it is working against a defined artifact.[^2]

These two slots are the only place in the vault where how-and-when is allowed to live, and only while the project has no tracker. The reasoning is narrow: with no tracker, the vault holds the *only* copy of the plan, so deleting it would delete the plan. That is not a hole in the invariant. The ban is on duplicating tracker state, and a project without a tracker has no tracker state to duplicate.

Which tool I reach for depends on how much of the path I already know:

- **A small, well-defined feature** — Claude Code's plan mode (Shift+Tab). The *what* and the rough *how* are already clear, so plan mode just sequences the steps before any file is touched.
- **Work inside an existing repo where I know more or less what I want** — `/grill-with-docs`. It stress-tests the plan against the repo's existing domain model and documented decisions, so the plan speaks the system's language instead of quietly reinventing it.
- **A known end result but an unknown path** — `/superpowers:brainstorming`. It forces the question-by-question exploration a plan needs when the approach itself is still open.

```text
> /superpowers:brainstorming
> Topic: feature shape for repolens v1, derived from 02-prd.md.
  Output: one features/<slug>.md per bounded unit, with scope,
  dependencies, acceptance criteria, and a phased build order.
```

Once `03-plan.md` exists, `/visualize-plan`[^5] renders it as a self-contained HTML artifact — the plan shown landing in the repo it targets — which makes the shape easier to review before any code is written.

### Promote

Promotion is the moment the project changes hands, and the one step in the whole workflow that nothing automates. That is deliberate: it is a decision, not a transformation. A project gets promoted when it has a ready PRD and I have decided to actually execute it. Until then `tracker: none` is a complete state, not a waiting room — a tracker full of empty projects is just noise.

The plan becomes issues. Usually `/to-tickets`[^6] does the breakdown: it slices the work into tracer bullets — narrow but *complete* paths through every layer, each one demoable on its own — and gives each ticket the explicit blocking edges that say what must land first. The sizing rule is the interesting part, because it is not about effort:

> Each slice is sized to fit in a single fresh context window.

That single constraint is what makes the execution phase work at all, and it is why the tickets have to be cut before any of them starts.

Then the whole handover happens in one commit: set `tracker`, `tracker_url` and `prd_synced` on the project page; delete `03-plan.md` and `features/`; write `spine.md`; run the gate. Nothing is lost — the tracker holds it now, which is the entire point of promoting.

That last file deserves a note, because it exists to recover something trackers are bad at. A tracker holds an unordered *set* of issues and dates them; it does not hold the product's build order. `spine.md` restores it — the stages in pipeline order, whether each one works end to end, and the ticket ID owning each gap. It stays inside the invariant because of one rule:

> Every cell must be answerable by reading or running the code — never by remembering the plan.

"Seven of eight detectors have a rule" is a grep. "Rejects every brief in production" is something you run. Those are facts about the artifact, derivable and re-derivable — not a copied status that starts rotting the moment it is written. And the reading rule falls straight out of it: no stage starts while a lower-numbered stage still reads NO.

```text
> /to-tickets projects/repolens/03-plan.md
  → tracer-bullet slices with blocking edges, filed into Linear
> Now promote: set tracker/tracker_url/prd_synced, delete the plan
  slots, write spine.md, run vault-check. One commit.
```

### Try

Try is the implementation phase, and its rhythm is one ticket, one worktree, one fresh Claude session.

That is not ceremony. The tickets were cut to fit a context window, so a session that takes exactly one of them never has to be compacted halfway through — the model still has the spec, the code and its own reasoning in view when it finishes. Sessions that sprawl across three tickets are the ones that end up rewriting something they already got right. Working in a worktree per ticket is what makes running several at once possible without them stepping on each other.

The vault stays out of the way here. It gets consulted, not written to. Whatever state the work is in lives in Linear, where it belongs.

```text
> Implement ENG-142 (repository ingestion), phase 1 only. Stop
  before phase 2 so I can review.
```

### Evaluate

Evaluation happens in the repo, because that is where the software has to prove itself: tests, debugging, and validation against an explicit definition of done rather than a vague sense that it seems to work.

In a prompt-first workflow, evaluation is a loose conversation after the code already exists. In a spec-first workflow it is much tighter, and it asks two questions rather than one. Did the feature do what the plan said it should do — and where did the spec itself turn out to be weak?

That second question is the one that pays. Good evaluation does not just catch bugs. If the implementation drifted, maybe the code was wrong. But often the more interesting answer is that the plan was incomplete, overconfident, or blind to a constraint the build exposed. This is also the natural moment to query the wiki, because a failure you have hit before is usually already written down somewhere.

```text
> Consult the brain on "symbol resolution drift in monorepos".
  → if it's been hit before, cite the prior pages. If not, this is
  a new decision — write it to wiki/decisions/.
```

### Deliver

Deliver is where shipped work becomes reusable knowledge, and it is the phase I automated first because it is the one I reliably skipped.

Opening the pull request fires a hook. It does not edit anything; it offers. Capture the non-obvious choices from this work as `wiki/decisions/<slug>.md`, capture anything reusable as `wiki/patterns/<slug>.md`, and move the Linear issue the branch name points at. If the work produced neither a decision nor a pattern, the honest answer is to write nothing, and the hook says so.

Merging is deliberately *not* hooked, because merges happen in the GitHub UI and no local command marks them. Instead an end-of-day routine mines the day's Claude sessions and writes the record — `projects/<slug>/shipped/<feature>.md`, with a `status: shipped` that is the only legal status in that folder, because a record is written after the fact and never as a placeholder for work in flight.

At that point the project has completed a full cycle. An idea became research, then a PRD, then a plan, then a set of tickets, then an implementation, then a validated result, and finally a durable reference. That is the loop I care about: not one perfect prompt, but a system where each cycle leaves the next one in a stronger position.

## The gate

A contract that only prose enforces is a contract that erodes. I know this because the first version of the vault had all of these rules written down, in a file the agent loads on every session, and status crept back in anyway — a "Current Status" block here, a `Last touched` line there, each one individually reasonable.

So every structural rule now has a check behind it. A single dependency-free Python script runs as a pre-commit hook and hard-fails:

| Check | Fails when |
|---|---|
| `whitelist` | a file under `projects/<slug>/` isn't a legal slot |
| `plan-gate` | plan slots exist after the project reached a tracker |
| `spine-gate` | `spine.md` exists while `tracker: none` |
| `prd-purity` | `02-prd.md` has a checkbox, a `## Phase` heading, or a bare date |
| `tracker-state` | `Blocked on:` / `Next up:` / `Working on:` / `Phase:` leaked into `projects/` |
| `shipped-status` | a file in `shipped/` lacks `status: shipped` |
| `broken-links` · `orphans` | a wikilink resolves to nothing, or a page has no inbound link |

`git commit --no-verify` is the deliberate escape hatch. Editing the script to stop noticing is not — if a check is genuinely wrong, the rule it encodes is what needs fixing.

## Setting it up

The vault is a template you clone.[^1] Four commands, and the third one is the one people skip:

```sh
git clone https://github.com/YoniRaviv/dev-llm-wiki.git my-wiki && cd my-wiki
.scripts/install-hooks.sh            # the pre-commit gate
.scripts/install-global-skills.sh    # skills → ~/.claude/skills, vault path baked in
python3 .scripts/vault-check.py      # expect: vault-check: ✓ clean
```

Skills install *globally* rather than living in the vault, and that is a rule rather than a convenience — the same skill copied into two vaults drifts, and the copies stay invisible until one of them misbehaves. A `.claude/skills/` directory inside the vault is itself a gate violation.

Then open the folder twice: as a vault in Obsidian, and in Claude Code. Both read and write the same plain markdown, so there is no integration to configure. Say *"set up this wiki for me"* and a one-time skill walks through identity, stack, which tracker owns execution, date format, and starter topics. The rest of the slash commands come from a marketplace:

```sh
/plugin marketplace add YoniRaviv/claude-skills
/plugin install yoni-skills@yoni-marketplace     # idea-deep-research, standup, meeting-prep
/plugin install superpowers@yoni-marketplace     # brainstorming, writing-plans, TDD
```

The last piece is the PR hook — the orange arrows in the first diagram. It is a `PostToolUse` hook on `Bash`, wired in `~/.claude/settings.json`:[^7]

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "~/.claude/hooks/vault-sync-reminder.sh" }
        ]
      }
    ]
  }
}
```

And the script itself. It fires on real PR creation only, refuses to run when the PR is in the vault repo (syncing the vault to itself is circular), pulls the Linear issue ID out of the branch name, and returns context rather than performing any write:

```bash
#!/usr/bin/env bash
# PostToolUse(Bash): after `gh pr create`, offer to capture the work's durable
# knowledge in the vault and move the Linear issue. Reminds only — never auto-edits.
set -euo pipefail

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')

# Fire only on real PR creation (not `gh pr view`, `list`, etc.)
if ! printf '%s' "$cmd" | grep -qE '\bgh[[:space:]]+pr[[:space:]]+create\b'; then
  exit 0
fi

VAULT="/path/to/your/vault"

cwd=$(printf '%s' "$input" | jq -r '.cwd // ""')
repo_root=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null || true)
repo=$(basename "${repo_root:-$cwd}")

# Syncing the vault to itself is circular — only project PRs trigger this.
[ "${repo_root:-$cwd}" = "$VAULT" ] && exit 0

# The branch carries the issue ID because the ticket was cut from the plan,
# e.g. yoni/ENG-142-ingest-pipeline. No ID means say so, never guess at one.
branch=$(git -C "${repo_root:-$cwd}" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
issue=$(printf '%s' "$branch" | grep -oE '[A-Z][A-Z0-9]+-[0-9]+' | head -1 || true)

if [ -n "$issue" ]; then
  tracker="Also OFFER to move Linear issue ${issue} to In Review and attach the PR
URL, via the Linear MCP. Status belongs in Linear and only in Linear — never write
it into the vault."
else
  tracker="Branch \"${branch}\" carries no issue ID, so there is nothing to move."
fi

ctx="A pull request was just opened in \"${repo}\". OFFER (do not auto-edit) to
capture the durable knowledge: wiki/decisions/<slug>.md for any non-obvious choice,
wiki/patterns/<slug>.md for anything reusable. If the work produced neither, say so
and write nothing. Do NOT write a shipped/ record — nothing has shipped until the PR
merges. ${tracker} Keep it to one short offer — do not derail the current work."

jq -cn --arg ctx "$ctx" \
  '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$ctx}}'
```

The shape worth copying, whatever your tracker is: the hook writes nothing. It injects an offer at the exact moment the knowledge is still in the model's context, which is the last moment it is cheap to capture. Ten minutes later that context is gone.

## Example project: RepoLens

A concrete example makes the workflow easier to see. **RepoLens** turns a codebase into onboarding documentation: architecture notes, feature summaries, and source-grounded explanations of how a system is organized. It has enough surface area to need research, a product definition, a real breakdown, and feature-level delivery.

**Conceive — `projects/repolens/00-idea.md`**

```md
## Problem
Teams move fast, repo context decays fast. Onboarding is rebuilt
from tribal knowledge instead of a maintained source of truth.

## The Idea
Ingest a codebase, produce architecture notes, feature summaries
and source-grounded explanations — kept fresh as the repo evolves.
Not (v0): real-time indexing, auto-remediation, code review.

## Why Now
The artifact is a *living* doc, not a static export. The repo is
the source of truth; the doc is a derived view.
```

**Research — `01-research.md` (excerpt)**

```md
## Verdict
Crowded at the edges (devportals, code-summary tools), thinner in
the middle. "Always-fresh, source-grounded onboarding docs" is
where the angle sits. Continue — but "always-fresh" is a much
bigger commitment than v0 should make. Cut it to on-demand.

## What Already Exists
- Backstage — devportal, not source-grounded
- Sourcegraph Cody — source-grounded, not onboarding-shaped
- Mintlify — docs-as-code, no codebase ingestion
```

**Architect — `02-prd.md` (sketch)**

```md
Users            : eng teams onboarding new developers
Core workflow    : ingest repo → detect structure → generate → review
Scope            : single-repo TypeScript / Python projects
Non-goals        : monorepos, real-time updates, auto-PRs to docs
Constraints      : local-first; no source leaves the machine
Success criteria : a new hire answers "where does X live?" unaided
```

No dates, no phases, no checkboxes — the gate would reject the file.

**Frame — `features/architecture-summarizer.md` (excerpt)**

```md
## Scope
Repo tree + entry points → architecture.md with module map,
data flow, key boundaries.

## Acceptance criteria
- Runs offline against the local repo
- Generated doc references real file paths
- A reviewer can mark sections "looks right / looks wrong"
- Re-run keeps the human verdicts unless the code changed
```

**Promote — the plan becomes tickets**

```text
ENG-140  Repo tree walk + entry-point detection      blocks: —
ENG-141  LLM pass: draft sections with citations     blocks: ENG-140
ENG-142  Verdict file + reviewer marks               blocks: ENG-141
ENG-143  Diff-aware re-run                           blocks: ENG-142
```

Four vertical slices, each demoable alone and each sized for one session. `03-plan.md` and `features/` are deleted in the same commit; `spine.md` takes their place.

**Try, then Evaluate — testing against the spec**

Each ticket gets its own worktree and its own fresh session. Then the verdict:

```md
## architecture-summarizer v1
- AC1 (offline)            : pass
- AC2 (real file paths)    : pass
- AC3 (reviewer marks)     : pass
- AC4 (diff-aware re-run)  : FAIL on rename — a file move resets
                             every verdict attached to it

→ The spec was incomplete. AC5: rename detection carries prior
  verdicts forward. Filed as ENG-147, blocking the milestone.
```

The failure isn't just a bug. It's a missing line in the spec — the kind of insight a spec-first loop exists to surface.

**Deliver — `projects/repolens/shipped/architecture-summarizer.md`**

```md
---
project: repolens
status: shipped
started: 02-06-2026
shipped: 19-06-2026
summary: "Generates a source-grounded architecture doc that survives a re-run"
shipped_in: "#31"
---

## Decisions Made
- **Verdicts keyed by symbol, not line range** — renames and
  reformats stop invalidating human review. → [[decisions/
  verdict-identity-by-symbol]]

## Implementation Notes
AC5 was added mid-build after the rename failure. The general
shape — derive a doc from a repo, keep human verdicts attached to
evolving code — is now [[patterns/derived-doc-with-verdicts]].
```

That trail — idea, research, PRD, tickets, verdict, shipped record — is the project's permanent record. The next project starts with the pattern page already on hand, and the decision page one question away.

## Why this works better

The main advantage of this workflow is not that it makes AI look smarter. It is that it reduces drift, in two different directions.

> Spec-first development creates stable checkpoints. The model works across them because the project has a structure it can keep returning to.

The first kind is the one everyone notices: prompt-first development scatters important reasoning across temporary conversations, which is fast at the start and surprisingly hard to stay coherent in later. Specs give Claude and me the same anchors — the idea file, the research, the PRD, the tickets, the verdict, the shipped record.[^4]

The second kind is quieter and took me longer to see. Knowledge drifts too, and it drifts fastest when a system stores things that decay. Splitting the vault from the tracker means everything in the vault is either a decision, a distillation, or a fact about an artifact you can re-derive by running the code — and none of those go stale on their own. The tracker holds the only thing that does.[^3]

That matters more as projects become real. It is easy to vibe-code a toy. It is much harder to build something that survives research, planning, implementation, validation and iteration without losing its shape. A spec-first workflow gives the model better instructions, but more importantly, it gives the project better boundaries.

## Closing

The way I think about AI-assisted development has changed pretty sharply.

I no longer see the prompt as the main interface for building software. The prompt is only useful if the project already has a structure behind it. The real interface is the chain of artifacts that define the work — idea notes, research, PRDs, plans, tickets, tests, decisions, shipped records — plus a clear answer to who owns each one. Claude moves through that chain; the chain is what makes the work coherent.

That is what this workflow is trying to do. It turns rough ideas into executable projects by making specs the center of the process, keeping execution somewhere it can't rot the knowledge, and preserving the result of each cycle in a form future work can build on. Not prompts first. Specs first.

---

[^1]: `dev-llm-wiki` — the vault template this workflow runs on. <https://github.com/YoniRaviv/dev-llm-wiki>
[^2]: Claude Code — *Common workflows.* <https://code.claude.com/docs/en/common-workflows>
[^3]: Agentpedia — *Karpathy's LLM wiki "idea file" pattern.* <https://agentpedia.codes/blog/karpathy-llm-wiki-idea-file>
[^4]: Martin Fowler — *Exploring Gen AI: spec-driven development tools.* <https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html>
[^5]: `claude-skills` — my custom slash commands, including `/idea-deep-research` and `/visualize-plan`. <https://github.com/YoniRaviv/claude-skills>
[^6]: Matt Pocock — *to-tickets*, the tracer-bullet breakdown skill. <https://github.com/mattpocock/skills>
[^7]: Claude Code — *Hooks reference.* <https://code.claude.com/docs/en/hooks>
