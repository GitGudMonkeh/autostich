# Baseline Report — Multi-Agent Workflow Setup

> Status: **durable record**, written 2026-08-20 from a read-only inspection of `dev` @ `0f17612a`.
> Scope: only findings that affect the new multi-agent workflow. Not a codebase tour — for game
> architecture and decision history see `README.md` and `CLAUDE.md`.
>
> Language note: this workstream is documented in **English** because it targets multiple agent
> vendors. The product itself keeps its convention — **German UI text and comments, English
> identifiers**. Agents writing application code follow the product convention, not this one.

---

## 1. Roles and source of truth

| Concern | Decision |
| --- | --- |
| Source of truth | **GitHub** (`GitGudMonkeh/autostich`, HTTPS remote) |
| Local cockpit | **Nimbalyst** |
| Implementation + integration | **Claude Code** |
| Independent review | **Codex** (review only, initially) |
| Writer concurrency | **One simultaneous writer per worktree** |

## 2. Branch model

Intended promotion chain, feature work branching from `dev`:

```
feature/*  ->  dev  ->  test  ->  main
              (preview) (acceptance) (production)
```

**Current inconsistency (open):** `test` is **not** an ancestor of `dev`. `test` carries one unique
commit, `b0ef9ed5 "chore: prepare test branch rename"`, that never reached `dev`. The merge-base of
`test` and `dev` is `main`. Until this is reconciled, `dev` -> `test` cannot be a fast-forward and
any automated promotion would fail or lose work.

Remedy is planned separately in `branch-reconciliation-plan.md`.
**Not yet executed.**

Compare branches by **tree hash**, not commit count — the project has a history of duplicated
commits with byte-identical trees:

```bash
git rev-parse <branch>^{tree}
```

### `Autostich/pixi` — live, not stale

`git ls-remote origin` proves `refs/heads/Autostich/pixi` **exists on the remote** @ `7c78dd38`.
It holds 5 commits of skill-emblem art not present in `dev`. Locally it exists only as the
remote-tracking ref `refs/remotes/origin/Autostich/pixi` — there is no local branch.

**Do not delete it** on the assumption it is local cruft. Its disposition is an open decision.

## 3. CI / deployment structure

Five GitHub Actions workflows, all `ubuntu-latest`, **Node 22**, npm cache.

| Workflow | Trigger | Result |
| --- | --- | --- |
| `ci.yml` | push on all branches **except** `main`/`test`/`dev`; all PRs; dispatch | gates only, no deploy |
| `deploy.yml` | push `main` | gh-pages root, `keep_files: true` + orphan-asset prune |
| `deploy-test.yml` | push `test` | `gh-pages/test/` |
| `deploy-pixi.yml` | push `dev` | `gh-pages/pixi/` (filename and slot still say "pixi") |
| `deploy-media.yml` | push `main`/`test`/`dev` touching `media/**` | `gh-pages/media/`, published once centrally |

Gate order is identical everywhere:

```
npm ci  ->  npm test  ->  npm run lint -- --max-warnings=0  ->  npm run build  ->  npm run gen:db
```

Consequences for agents:

- **Feature branches get full gating for free** via `ci.yml`.
- `ci.yml` uses `cancel-in-progress: true`. Rapid successive pushes cancel the agent's own earlier
  run. **"cancelled" is not "failed".**
- All four deploy workflows share `concurrency: gh-pages-publish` with `cancel-in-progress: false`,
  and GitHub queues only **one** pending run per group. A push touching both app and `media/` can
  silently drop one deploy. **Check the Actions tab after any merge that touches `media/`.**
- A push to `dev` triggers a full build + deploy to `/autostich/pixi/`. Pushing `dev` is not free.
- No repository secrets are needed — CI uses only the default `GITHUB_TOKEN`, so CI is locally
  reproducible.

## 4. Agent instructions: current state

- **`CLAUDE.md` is 2762 lines.** It is an engineering logbook of tagged decision records
  (measurements, rejected approaches, traps, guard-test rationale), not a config file. Very high
  value, but too large to load into every worker's context.
- **It is stale at the top.** Its "Aktive Branches (Stand 2026-08-11)" section still names
  `Autostich/pixi` as the working branch and `Autostich_Test` as the integration branch.
  **`Autostich_Test` no longer exists.** Its mandatory "ask which branch first" rule and its
  `pixi -> Autostich_Test -> main` promotion chain both contradict the current model and would
  actively misdirect an agent.
- **`README.md` (419 lines) is stale** in the same way ("1263 Vitest-Fälle (84 Dateien)"; actual:
  134 test files. "Entwickelt wird auf `Autostich_Test`").
- **No `AGENTS.md` exists.**
- **`.claude/` contains exactly one file: `launch.json`.** No `settings.json`, no `agents/`, no
  `commands/`, no `hooks/`. `.gitignore` already anticipates the workflow — it ignores
  `.claude/settings.local.json` **and `.claude/worktrees/`**.

**Target shape:** a vendor-neutral `AGENTS.md` (branch model, gate commands, hazards, conventions)
plus a thin `CLAUDE.md` adapter pointing at it, with the decision-log content moved under `docs/`
so it is read on demand rather than loaded every session. One reusable asset already exists: the
eleven-point *"Desktop-Umbau: die ENTSCHEIDUNGSREGELN"* block in `CLAUDE.md`, already written as
vendor-neutral engineering rules.

## 5. Source-text ratchet tests — the dominant hazard

There is **no component-test setup**. Roughly **40 of 134 test files** verify wiring by
`readFileSync`-ing `src/**` and regex-matching literal source text: class names, constants, JSX
structure, sometimes across newlines.

Implications every agent and reviewer must know:

- A purely cosmetic refactor — renaming a class, reflowing a JSX line, editing a comment — can turn
  tests red in a way that **looks like a behavioural regression and is not**.
- Several ratchets have historically matched **their own explanatory comments**; the established fix
  is to match against comment-stripped source.
- Reviewers (including Codex) must be briefed on this explicitly or they will misdiagnose failures.
- Conversely, a green suite does **not** prove UI correctness. The project's own convention is
  guards that *compute* rather than compare spellings, plus a sabotage counter-check ("break each
  seam, prove the guard falls").

## 6. Worktrees, `npm ci`, and parallel agents

- **`node_modules/` is per-worktree and is currently absent** in this checkout. `npm test` and
  `npm run lint` exit `1` until `npm ci` runs. **The first step in every new worktree is `npm ci`** —
  before any gate can be trusted.
- **Disk cost per worktree is about 269 MB** of working tree (of which `media/` alone is **152 MB**,
  54 audio files), plus its own `node_modules`. `.git` is **524 MB** but is shared across worktrees,
  so it is paid once. Four parallel agents means roughly 1 GB of trees plus four dependency installs.
  Consider whether workers need `media/` at all.
- Repo uses **no git-lfs** and no submodules; media is stored as ordinary Git objects.
- **Never pipe a gate command.** `npm test | tail -25` was observed returning exit `0` on a failing
  run; the bare command returns `1`. Use unpiped commands, or `set -o pipefail`.
- Lockfile is `package-lock.json` v3; **npm only** — no yarn/pnpm artifacts.
- `npm run loc:export` coupling: any change to a player-visible string must regenerate
  `docs/localization/*.csv`, or CI fails for a reason unrelated to the change.

## 7. Windows / Linux portability

Host is **Windows 11**; CI is **Linux**. This delta has already cost this project time, and the
mitigations are load-bearing.

- **`.gitattributes` is the defence and must not be weakened.** `* text=auto eol=lf` globally, plus
  `*.csv -text` (byte-exact generator comparison), `*.mjs text eol=lf` (shebang + `\r` breaks Vite's
  transform), `*.sql text eol=lf`. Rationale for each is written into the file.
- `core.autocrlf=true` is set globally on the host, **but `.gitattributes` overrides it.** Verified:
  `package.json`, `src/App.jsx`, `test/engine.test.js`, `scripts/gen-db.mjs`,
  `docs/username-profanity-guard.sql` are all **LF** in the working tree. New worktrees inherit this
  correctly.
- The failure mode to recognise: **green CI, red local run** (or the reverse). If a ratchet test
  fails locally but passes in CI, suspect line endings before suspecting the change.
- `core.ignorecase=true`, `core.symlinks=false`, `core.filemode=false` — a case-only rename or a
  symlink introduced on Linux behaves differently here.
- **Tooling itself is portable:** no absolute paths, no `/usr/bin`, no `process.platform` branches in
  `scripts/`, `sim/`, `maintenance/`, or `vite.config.js`. Node scripts use `node:path` +
  `fileURLToPath` throughout.
- **Shell asymmetry:** the host offers PowerShell *and* Git Bash; CI steps are `bash` with
  `set -euo pipefail`. Workflow docs must state which shell a command assumes. In Git Bash on
  Windows, `git` arguments containing `:` and `/` (for example `origin/test:path/to/file`) need
  `MSYS_NO_PATHCONV=1` or they are mangled into backslash paths.
- **No formatter.** ESLint carries no style rules and there is no Prettier. Parallel agents will
  produce divergent formatting and noisy diffs unless told to match surrounding style — a real
  merge-conflict risk in the large files (`src/index.css` 5534 lines,
  `src/ui/CustomizeScreen.jsx` 2128, `src/ui/Battlefield.jsx` 1904).

## 8. Environment / secrets

`.env.development` and `.env.production` are **committed on purpose** and are not a leak: they hold
only the Supabase **publishable** key plus project URL, protected by RLS (select + insert only). The
`service_role` key is explicitly banned from these files. `.gitignore` covers `.env`, `.env.local`,
`.env.*.local`, so per-agent local overrides have a defined, ignored home.

## 9. Open items (not decisions — things still to settle)

1. Reconcile `test` into `dev` so the ancestry chain is single again — plan written, **not executed**.
2. Decide the fate of `Autostich/pixi` and its 5 unmerged art commits.
3. Rename `deploy-pixi.yml` -> `deploy-dev.yml`; decide whether the published slot stays `/pixi/`.
4. Author `AGENTS.md`; reduce `CLAUDE.md` to an adapter; refresh both it and `README.md`.
5. Decide whether to adopt a formatter, given parallel writers.
