---
title: "How I Think About Solo Projects in the Age of Coding Agents"
description: "How I run my solo projects with Claude Code: an Obsidian vault for the thinking, Linear for the doing, and a pre-commit gate that keeps them apart."
date: 2026-05-29
updated: 2026-08-14
---

On my solo projects I use Claude for almost everything: the research, the specs, the architecture, the code and the tests. So what I spend my time on is how it gets the right context at every step, and how that context stays correct as the project grows.

I see engineers, very technical ones, fighting with Claude Code because it doesn't do what they asked. Most of the time they're just prompting it and not giving it enough context: not about the project, and not about what they actually want. The moment they hand it a spec, break it into tasks and run each task in a fresh context window, the results change. They save a lot of tokens too.

This is the setup I built for my own projects to work that way all the time.

## Two owners

A project has two kinds of information.

The first is what and why: the idea, the research, the product definition, and the decisions made along the way. That stays true for a long time.

The second is how and when: tasks, status, what's next, what's blocked. That changes every day.

So they live in different places. An Obsidian vault owns everything before the work starts and everything worth keeping after it ships. A tracker owns the work itself. For my own projects that's Linear, but any tracker works. The design doesn't care which.

The rule between them is one line:

> The vault stores the tracker's link, never its status.

A link can't go stale. A status always does.

The same thinking goes one level down. Every project gets its own folder with a fixed set of files, so the planning of one project never leaks into the next one.

The vault itself started from Andrej Karpathy's LLM Wiki idea[^1]: you drop raw material in, the model keeps a wiki on top of it, and later you ask the wiki instead of researching the same thing again.

## The loop

My setup has three touchpoints. The project repo is in the center, with its `AGENTS.md` and project skills. The vault holds how I work: every decision on every project, plus the repos, articles and videos I liked. Linear holds the tasks and their state.

Claude Code sits in the middle. It takes a task from Linear, works on it in the repo, saves decisions and useful notes in the vault, updates Linear when it's done, and then the loop continues.

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

This way, when someone asks me why I did X on a project two months ago, I can query the wiki and answer that question.

## Who writes what

Inside the vault, the folder tells you who is allowed to write a file:

```
raw/          I write, the agent only reads
              articles · tweets · repos · books · videos · ideas

wiki/         the agent writes
              sources/ · patterns/ · decisions/ · technologies/
              domains/ · ideas/ · journal/ · index.md · topics.md · log.md

projects/     both write, but only into allowed files
              <slug>.md          the project page: what it is + tracker URL
              <slug>/
                00-idea.md       ME      the spark
                01-research.md   AGENT   landscape + an honest verdict
                02-prd.md        BOTH    what + why, never how/when
                03-plan.md       BOTH    only while there's no tracker
                features/        BOTH    only while there's no tracker
                spine.md         AGENT   only once a tracker is set
                shipped/         AGENT   records of built work
                notes/ assets/
```

I write `raw/`. The agent writes `wiki/`. The agent and I both write `projects/`, but only into the files that are allowed to exist there. Nothing else goes in a project folder: no status file, no kanban, no project inside a project.

`wiki/index.md` is the entry point, one line per page. An agent reads the index, picks the pages that matter, and opens only those. Nothing reads the whole vault.

## The steps, named by what they produce

I don't have a fancy name for the process. Each step produces a file, and the next step builds on that file:

| Step | What it produces | Who writes it | What I use |
|---|---|---|---|
| Idea | `00-idea.md` | me | `/grill-me` if the idea needs pushing on |
| Research | `01-research.md` | agent | `/idea-deep-research` |
| PRD | `02-prd.md` | both | `/grill-me`, or plan mode (Shift+Tab) for small features |
| Plan | `03-plan.md` + `features/` | both | plan mode, `/grill-with-docs`, or superpowers brainstorming |
| Tickets | Linear issues + `spine.md` | agent | `/to-tickets` |
| Build | code in the repo | agent | one ticket, one fresh session, mostly in a worktree |
| Verdict | tests against acceptance criteria | both | the spec |
| Shipped | `shipped/<feature>.md` + decisions, patterns | agent | the PR hook and an end-of-day task |

Three of these steps need more than one line.

**The PRD holds what and why, never how or when.** The gate (more on it below) rejects a checkbox, a `## Phase` heading or a date anywhere in `02-prd.md`. Left alone, a PRD slowly grows a plan inside it, and then I have two plans that disagree.

**Tickets are sized to fit one fresh context window.** That's the sizing rule. Effort has nothing to do with it. `/to-tickets`[^2] slices the plan into thin end-to-end pieces, each one demoable on its own, with the blocking order between them. Because every ticket fits in one session, the build step stays simple: one ticket, one fresh Claude Code session, mostly in its own git worktree. The session doesn't have to compact halfway, so the model still has the spec and its own reasoning in view when it finishes.

When the plan turns into tickets, the plan files leave the vault in the same commit. Linear has them now. The one thing a tracker loses is the build order, so `spine.md` keeps it: the stages in order, whether each one works end to end, and which ticket owns each gap. Every line in it has to be checkable by reading or running the code. "7 of 8 detectors have a rule" is a grep. "Mostly done, I think" doesn't get in.

**The verdict asks two questions.** Did the feature do what the plan said? And where was the spec weak? The second one is where I learn something. A lot of the time the code is fine and the spec was missing a line. There's an example of exactly that further down.

## The gate

A rule written in a file the agent reads is a suggestion. A check that fails the commit is a rule.

Every structural rule has a check behind it. One dependency-free Python script, `vault-check.py`, runs as a pre-commit hook and fails the commit when:

| Check | Fails when |
|---|---|
| `whitelist` | a file under `projects/<slug>/` isn't one of the allowed files |
| `plan-gate` | plan files still exist after the project got a tracker |
| `spine-gate` | `spine.md` exists while there's no tracker |
| `prd-purity` | `02-prd.md` has a checkbox, a `## Phase` heading or a bare date |
| `tracker-state` | `Blocked on:`, `Next up:`, `Working on:` or `Phase:` shows up in `projects/` |
| `shipped-status` | a file in `shipped/` is missing `status: shipped` |
| `broken-links` · `orphans` | a wikilink points at nothing, or a page has no links into it |

`git commit --no-verify` is the escape hatch, on purpose. If a check is wrong, I fix the rule it encodes.

Yes, I wrote a linter for my own notes. My notes have never been this well behaved.

## The PR hook

The best moment to write down a decision is right after the work, while it's all still in the model's context. Ten minutes later that context is gone, and so is the cheap version of the note.

Opening a pull request fires a Claude Code hook. It's a `PostToolUse` hook on `Bash`[^3], set in `~/.claude/settings.json`:

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

The script only reacts to `gh pr create`, pulls the Linear issue ID out of the branch name, and hands Claude an offer instead of doing anything itself:

```bash
# trimmed: the full version also skips PRs opened in the vault repo itself
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')
printf '%s' "$cmd" | grep -qE '\bgh[[:space:]]+pr[[:space:]]+create\b' || exit 0

cwd=$(printf '%s' "$input" | jq -r '.cwd // ""')
branch=$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
issue=$(printf '%s' "$branch" | grep -oE '[A-Z][A-Z0-9]+-[0-9]+' | head -1 || true)

ctx="A PR was just opened. OFFER (do not auto-edit) to capture decisions in
wiki/decisions/ and reusable patterns in wiki/patterns/. If there are neither,
write nothing. Offer to move ${issue:-the issue} in Linear."

jq -cn --arg ctx "$ctx" \
  '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$ctx}}'
```

It writes nothing. If the work produced neither a decision nor a pattern, the right answer is to write nothing, and the offer says so.

The template also ships an end-of-day task that goes over the day's Claude sessions and writes what was learned into the journal, patterns, decisions and shipped records. It never writes status.

## An example: one feature through the loop

RepoLens is an example project I use to show the flow. It turns a codebase into onboarding docs: architecture notes, feature summaries, and explanations grounded in the source.

The PRD sketch:

```
Users            : eng teams onboarding new developers
Core workflow    : ingest repo → detect structure → generate → review
Scope            : single-repo TypeScript / Python projects
Non-goals        : monorepos, real-time updates, auto-PRs to docs
Constraints      : local-first; no source leaves the machine
Success criteria : a new hire answers "where does X live?" unaided
```

No dates, no phases, no checkboxes. The gate would reject the file otherwise.

The plan for the first feature, the architecture summarizer, becomes four tickets. Each one is demoable alone and sized for one session:

```
1  Repo tree walk + entry-point detection     blocks: -
2  LLM pass: draft sections with citations    blocks: 1
3  Verdict file + reviewer marks              blocks: 2
4  Diff-aware re-run                          blocks: 3
```

Then the verdict against the acceptance criteria:

```
AC1 (runs offline)          : pass
AC2 (real file paths)       : pass
AC3 (reviewer marks)        : pass
AC4 (diff-aware re-run)     : FAIL on rename - a file move resets
                              every verdict attached to it
```

The rename failure is a missing line in the spec. Nobody said what should happen to a reviewer's verdict when a file moves. So the fix starts in the spec: AC5, rename detection carries old verdicts forward. The choice behind it, keying verdicts by symbol instead of line range, goes into `wiki/decisions/`.

The next project starts with that decision page already there.

## Setting it up

The vault is a template you clone[^4]:

```bash
git clone https://github.com/YoniRaviv/dev-llm-wiki.git my-wiki && cd my-wiki
.scripts/install-hooks.sh            # the pre-commit gate
.scripts/install-global-skills.sh    # skills → ~/.claude/skills
python3 .scripts/vault-check.py      # expect: vault-check: ✓ clean
```

Then open the folder twice: once as a vault in Obsidian, once in Claude Code. Both read and write the same markdown, so there's nothing to integrate.

The slash commands come from my plugin marketplace[^5]:

```
/plugin marketplace add YoniRaviv/claude-skills
/plugin install yoni-skills@yoni-marketplace     # idea-deep-research, standup, meeting-prep
/plugin install superpowers@yoni-marketplace     # Jesse Vincent's superpowers
```

`/grill-me`, `/grill-with-docs` and `/to-tickets` are Matt Pocock's skills[^2]. Superpowers is Jesse Vincent's[^6]; my marketplace just points to it.

Skills install globally, not inside the vault. The same skill copied into two vaults drifts, so the gate fails if it finds a `.claude/skills/` folder in the vault.

So the files are what I really work on. Claude works from them, and so do I.

[^1]: Andrej Karpathy, *LLM Wiki* (gist). <https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f>
[^2]: Matt Pocock, *skills*: `to-tickets`, `grill-me`, `grill-with-docs`. <https://github.com/mattpocock/skills>
[^3]: Claude Code, *Hooks reference.* <https://code.claude.com/docs/en/hooks>
[^4]: `dev-llm-wiki`, the vault template this runs on. <https://github.com/YoniRaviv/dev-llm-wiki>
[^5]: `claude-skills`, my slash commands and plugin marketplace. <https://github.com/YoniRaviv/claude-skills>
[^6]: Jesse Vincent, *superpowers.* <https://github.com/obra/superpowers>
