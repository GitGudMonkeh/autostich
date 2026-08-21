# New Machine Setup

How to get from a fresh machine to a checkout whose test results can be trusted. Machine-level facts
only — prerequisites, per-worktree setup, and the host conditions that otherwise get rediscovered as
bugs.

`AGENTS.md` holds the project rules and decides **which** gates apply and when.
`docs/engineering/git-workflow.md` holds branch and worktree mechanics. This document repeats
neither — it covers only how to execute things on a given machine.

## 1. Prerequisites

| | |
| --- | --- |
| Node | `^20 \|\| ^22 \|\| >=24` — authoritative source is `engines` in `package.json` |
| npm | **npm only.** `package-lock.json` is the lockfile. No yarn, no pnpm. |
| Git | any current version |
| Chrome / Edge / Chromium | only for the CDP screenshot tooling (§7) |

CI runs `ubuntu-latest` with **Node 22**. Where a local host and CI disagree, CI decides.

### Shell convention in this document

Windows development may use **PowerShell** or **Git Bash**; CI is **Linux/bash**. Plain commands
behave the same in all three. Anything that differs is labelled, and two things always differ:

| | Git Bash / Linux | PowerShell |
| --- | --- | --- |
| Set a variable for one command | `NAME=value cmd` | `$env:NAME = "value"; cmd` — persists for the session |
| Absolute-path arguments | may need `MSYS_NO_PATHCONV=1` (`git-workflow.md` §18) | passed through unchanged |

PowerShell has no inline per-command variable prefix. Where a command below sets a variable, the
PowerShell form sets it for the whole session, so **unset it afterwards** if the session continues:
`Remove-Item Env:\NAME`.

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

Run the validation gates in the order `AGENTS.md` gives them. That list is authoritative and is
deliberately not copied here.

A fresh machine that passes them all is set up correctly. **Read §5 before concluding that a failure
means anything.**

---

## 5. Known host conditions

### Windows: full-suite timeouts are a load artifact

On the Windows development host, `npm test` can report failures that are **timeouts, never
assertions**, in timing-sensitive files that pass in isolation. This has been measured on an
unmodified `dev` checkout with no local changes at all, so it is a property of the host under full
parallel load rather than of any branch.

Procedure, from `testing.md` §12, item 2:

```text
npx vitest run test/<file>.test.js
```

Report **both** results. A timeout that reproduces in isolation is a real failure; one that does not
is a load artifact — and that label does not extend to any *other* failure in the same file.

### Windows and Linux Git differences

Git Bash path conversion, the `core.*` settings that differ on Windows, and the line-ending rules
enforced by `.gitattributes` are **`git-workflow.md` §18**. They are Git behaviour, not machine
setup, and are deliberately not restated here.

Two consequences worth knowing while a machine is still being set up:

- Do not set `core.autocrlf=true`. `.gitattributes` is load-bearing and forces LF in the working
  tree; source-text ratchets match patterns that span newlines.
- When local and CI results disagree unexpectedly, check line endings, path case and generated files
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

Preview-only features are gated on `import.meta.env.VITE_PREVIEW === "1"`. To run the dev server with
the gate open:

```bash
# Git Bash / Linux
VITE_PREVIEW=1 npm run dev -- --port <port> --strictPort
```

```powershell
# PowerShell — sets the variable for the session, not just this command
$env:VITE_PREVIEW = "1"; npm run dev -- --port <port> --strictPort
```

---

## 7. Screenshot and CDP tooling

`scripts/cdp.mjs` discovers Chrome, Edge or Chromium automatically. Set `CHROME_PATH` only if
discovery fails:

```bash
# Git Bash / Linux
CHROME_PATH=/path/to/chrome node scripts/viewport-proof.mjs
```

```powershell
# PowerShell
$env:CHROME_PATH = "C:\path\to\chrome.exe"; node scripts/viewport-proof.mjs
```

`viewport-proof.mjs` starts and stops its own dev server on the pinned port; nothing needs to be
running first.

### Trap: `vite preview` serves the wrong base

`vite.config.js` derives `base` from the Vite command, and only `build` gets the project path — for
`preview` the base is `/`. Every asset request under `/autostich/` then falls through to the SPA
fallback and answers **200 with `index.html`**, so a status-code check reports success while nothing
is actually served, the app never boots, and the service worker never registers.

```bash
# Git Bash — the prefix stops MSYS rewriting /autostich/ into a filesystem path
MSYS_NO_PATHCONV=1 npx vite preview --base /autostich/ --host 127.0.0.1 --port <port> --strictPort
```

```powershell
# PowerShell — no path rewriting, so no prefix
npx vite preview --base /autostich/ --host 127.0.0.1 --port <port> --strictPort
```

On Linux the Git Bash form works without the prefix. Why MSYS rewrites the argument at all is
`git-workflow.md` §18.

Verify by **size, not status**: `assets/index-*.js` must be hundreds of kB of `text/javascript`, not
a small `text/html` document.

---

## 8. Running the preview build locally

**When** the preview build is required is a gate rule and lives in `AGENTS.md` (Validation gates).
This section is only how to run it.

CI builds the preview variant with `DEPLOY_BASE` and `VITE_PREVIEW` set together; locally
`DEPLOY_BASE` only changes the asset base path and can be left out unless you are reproducing a
deployment path problem.

```bash
# Git Bash / Linux
npm run build
VITE_PREVIEW=1 npm run build
```

```powershell
# PowerShell — the variable persists, so clear it before the next ordinary build
npm run build
$env:VITE_PREVIEW = "1"; npm run build
Remove-Item Env:\VITE_PREVIEW
```

The PowerShell caveat is the one that bites: leaving `VITE_PREVIEW` set turns every later build in
that session into a preview build, silently.

---

## 9. Provenance

The host conditions in §5 and the traps in §6–§7 were measured during the Desktop Viewport Harness
workstream; the method and the numbers are in
`docs/workstreams/viewport-harness/T2-measurement-report.md`.

Those are historical records. Where they and this document disagree about what is true now, verify
against the current repository.
