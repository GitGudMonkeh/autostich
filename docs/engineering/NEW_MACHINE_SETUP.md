# New Machine Setup

How to get from a fresh machine to a checkout whose test results can be trusted. Machine-level facts
only — prerequisites, per-worktree setup, and the host conditions that otherwise get rediscovered as
bugs.

`AGENTS.md` holds the project rules and the gate commands. `docs/engineering/git-workflow.md` holds
branch and worktree mechanics. This document does not repeat either.

---

## 1. Prerequisites

| | |
| --- | --- |
| Node | `^20 \|\| ^22 \|\| >=24` — authoritative source is `engines` in `package.json` |
| npm | **npm only.** `package-lock.json` is the lockfile. No yarn, no pnpm. |
| Git | any current version |
| Chrome / Edge / Chromium | only for the CDP screenshot tooling (§6) |

CI runs `ubuntu-latest` with **Node 22**. Where a local host and CI disagree, CI decides.

---

## 2. Clone

```bash
git clone https://github.com/GitGudMonkeh/autostich.git
cd autostich
npm ci
```

The repository carries binary media — skill and corner art, music, captured evidence — so a clone is
considerably larger than the source alone. Measure with `du -sh .git` rather than assuming a figure.

**Prefer `git worktree` over a second clone.** Worktrees share one object store; a second clone
duplicates all of it.

---

## 3. Per-worktree setup

`node_modules/` is **per-worktree and is not shared.**

```bash
npm ci
```

Until `npm ci` has completed in the worktree you are actually standing in, a red test or lint run may
mean nothing more than missing dependencies. Do not diagnose anything before this.

Worktree creation is `git-workflow.md` §6. The path convention is:

```text
<repo-parent>/Autostich-worktrees/<task-name>
```

---

## 4. Verify the setup

Run the gates from `AGENTS.md`, in order:

```bash
npm test
npm run lint -- --max-warnings=0
npm run build
npm run gen:db
```

A fresh machine that passes all four is set up correctly. **Read §5 before concluding that a failure
means anything.**

---

## 5. Known host conditions

### Windows: full-suite timeouts are a load artifact

On the Windows development host, `npm test` can report failures that are **timeouts, never
assertions**, in timing-sensitive files that pass in isolation. This has been measured on an
unmodified `dev` checkout with no local changes at all, so it is a property of the host under full
parallel load rather than of any branch.

Procedure, from `testing.md` §12.2:

```bash
npx vitest run test/<file>.test.js
```

Report **both** results. A timeout that reproduces in isolation is a real failure; one that does not
is a load artifact — and that label does not extend to any *other* failure in the same file.

### Windows: Git Bash path conversion

MSYS mangles arguments containing both `:` and `/` — exactly the shape of `revision:path` — and
arguments that look like absolute POSIX paths, such as `--base /autostich/`:

```bash
MSYS_NO_PATHCONV=1 git rev-parse "HEAD:docs/decisions/engineering-log-2026-08.md"
```

On Linux the prefix is unnecessary. Where an equivalent takes no colon argument, prefer it:
`git hash-object <path>`, `git ls-files -s <path>`, `git show --raw <rev>`.

### Windows: Git behaves differently from Linux

`core.ignorecase=true`, `core.symlinks=false` and `core.filemode=false` are usual on Windows.
Case-only renames and symlinks therefore do not behave the way they do in CI.

### Line endings

`.gitattributes` is **load-bearing** and forces LF in the working tree, because source-text ratchets
match patterns that span newlines. Do not set `core.autocrlf=true`, and do not "fix" line endings.
The reasoning, with the incidents that produced each exception, is written out in `.gitattributes`
itself.

When local and CI results disagree unexpectedly, check line endings, path case and generated files
before suspecting logic.

---

## 6. Preview server and ports

Start the dev server with an explicit port and `--strictPort`:

```bash
npm run dev -- --port <port> --strictPort
```

`--strictPort` is **mandatory**. Without it Vite silently moves to the next free port, and every
screenshot and every "I checked it at 1280×720" claim is then about an unknown server. If the port is
occupied the run must fail loudly.

**One port per worktree**, recorded in the task contract.

| Port | Reserved for |
| --- | --- |
| 5173 | Vite default — ad-hoc use in the main checkout |
| 5180 | pinned in `scripts/viewport-proof.mjs`; do not occupy it while that script may run |

Preview-only features are gated on `import.meta.env.VITE_PREVIEW === "1"`:

```bash
VITE_PREVIEW=1 npm run dev -- --port <port> --strictPort
```

---

## 7. Screenshot and CDP tooling

`scripts/cdp.mjs` discovers Chrome, Edge or Chromium automatically and honours `CHROME_PATH`:

```bash
CHROME_PATH=/path/to/chrome node scripts/viewport-proof.mjs
```

`viewport-proof.mjs` starts and stops its own dev server on the pinned port; nothing needs to be
running first.

### Trap: `vite preview` serves the wrong base

`vite.config.js` derives `base` from the Vite command, and only `build` gets the project path — for
`preview` the base is `/`. Every asset request under `/autostich/` then falls through to the SPA
fallback and answers **200 with `index.html`**, so a status-code check reports success while nothing
is actually served, the app never boots, and the service worker never registers.

```bash
MSYS_NO_PATHCONV=1 npx vite preview --base /autostich/ --host 127.0.0.1 --port <port> --strictPort
```

Verify by **size, not status**: `assets/index-*.js` must be hundreds of kB of `text/javascript`, not
a small `text/html` document.

---

## 8. What CI does that the local gates do not

`.github/workflows/ci.yml` builds a **second, preview-slot variant** after the normal build:

```text
DEPLOY_BASE=/autostich/ci/   VITE_PREVIEW=1   npm run build
```

A change that only breaks under `VITE_PREVIEW=1` passes the local gates and fails CI. If you touch
anything behind the preview gate, build it both ways locally before pushing.

---

## 9. Provenance

The host conditions in §5 and the traps in §6–§7 were measured during the Desktop Viewport Harness
workstream; the method and the numbers are in
`docs/workstreams/viewport-harness/T2-measurement-report.md`. The line-ending rationale, including
the incidents behind each exception, is in `.gitattributes`.

Those are historical records. Where they and this document disagree about what is true now, verify
against the current repository.
