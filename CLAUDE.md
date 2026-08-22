# CLAUDE.md — Claude Code adapter

`AGENTS.md` is the canonical source of repository instructions. **Read `AGENTS.md` first.**
If anything in this file conflicts with `AGENTS.md`, follow `AGENTS.md`.

@AGENTS.md

This file holds only what is specific to the Claude Code harness. Project rules — branch model,
validation gates, the source-text ratchet hazard, house rules — live in `AGENTS.md` and are
deliberately not repeated here.

---

## Tool usage

- Prefer `Read`, `Grep`, and `Glob` over `cat`, `grep`, and `find` when the dedicated tool fits.
- Run independent read-only operations in parallel rather than one after another.
- Do not read broadly when the routing table in `AGENTS.md` names a narrower source. Read the one
  document the task actually needs.

## Platform note: Git Bash on Windows

CI runs on Linux. A Claude session may itself be running on Windows or on Linux.

**When running on Windows under Git Bash**, MSYS path conversion mangles arguments containing both
`:` and `/` — exactly the shape of `revision:path` syntax. Prefix those commands with
`MSYS_NO_PATHCONV=1`:

```bash
MSYS_NO_PATHCONV=1 git rev-parse "HEAD:docs/decisions/engineering-log-2026-08.md"
MSYS_NO_PATHCONV=1 git diff "origin/dev:CLAUDE.md" HEAD
```

**On Linux the workaround is not needed** — the same commands work unprefixed.

On either platform, where an equivalent takes no colon argument, prefer it — `git hash-object <path>`,
`git ls-files -s <path>`, `git show --raw <rev>`.

## Sessions and worktrees

- Take the branch and worktree from the starting prompt, `AGENTS.md` and the active task contract.
  Do not choose your own — `AGENTS.md` — *Session placement*.
- **Confirm the working directory before the first edit.** A session opened in the cockpit checkout
  is not thereby entitled to a task worktree: say which directory you are in and ask, rather than
  `cd`-ing into one that was not assigned to you.
- **One simultaneous writer per worktree.** Never write from two sessions into the same worktree.
- Sequential Claude sessions may continue the same task and worktree — implementation, then review
  fixes, then debugging.

### Project commands

`.claude/commands/` holds `/create-task`, `/cleanup-task` and `/prepare-review`. All three are
**owner-invoked** — a session cannot run them for itself. Where one of them covers the work at hand,
name it and let the owner run it, rather than hand-rolling the equivalent Git commands.

## Historical knowledge

Historical engineering records live in `docs/decisions/`. Start at `docs/decisions/README.md`.

- Read them **on demand only.** Do not preload the historical log.
- Treat them as context, not as standing instruction.
- Branch names, test counts, file lists, and "current state" claims inside them are **historical**.
  Never follow them as current instruction; verify against current code and current documentation.

## Language

- New engineering and code-side material: **English**.
- Player-visible UI text: **German and English** through the localization catalogs.
- Existing historical German records: **preserve as written.** Do not translate them.
