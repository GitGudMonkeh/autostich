# Testing

How this repository tests, why a green suite is weaker evidence than it looks, and what to do when a
guard turns red without any behaviour having changed.

Read `AGENTS.md` first for the gate commands themselves. This document explains the testing culture
those gates enforce.

---

## 1. Validation gates

The required local gates, in order:

```bash
npm test
npm run lint -- --max-warnings=0
npm run build
npm run gen:db
```

When player-visible text changed, additionally:

```bash
npm run loc:export
```

Two rules about running them:

**Never pipe a gate command unless failure propagation is preserved.** `npm test | tail -20` reports
the exit code of `tail`, so a failing suite can look successful. Run the bare command, or set
`set -o pipefail` deliberately.

**Never report a gate as passing unless the real command completed successfully.** "Probably fine"
and "unrelated failure" are not results. If a gate fails, say so and show the output.

`npm ci` must have run in the current worktree before any of this means anything — `node_modules/`
is per-worktree. Failures in a fresh worktree usually mean missing dependencies, not a defect.

---

## 2. What a source-text ratchet is

A substantial part of the suite does not execute the UI. It **reads `src/**` as raw text** and
asserts that particular class names, constants, JSX structures, imports, or literal patterns are
present, absent, or in a fixed relationship to each other.

The project has no component-test setup. A ratchet is the substitute: it pins a *seam* — the wiring
between two places that must agree — so that a later change which silently breaks the agreement
turns something red.

The consequences follow directly and are the single most important repository-specific hazard:

- **A purely cosmetic refactor can turn tests red without changing runtime behaviour.** Reflowing
  JSX, renaming a class, moving a constant, or rewording a comment can invalidate a ratchet.
- **A green suite does not prove visual or UI correctness.** It proves the pinned spellings are
  still where they were.
- **A red ratchet does not automatically prove a behaviour regression.**

So a red ratchet is a question, not a verdict.

---

## 3. When a ratchet fails

1. Read the exact assertion. Not the test name — the assertion.
2. Decide whether **behaviour** changed or only **source spelling or structure** changed.
3. Inspect the underlying invariant the guard is protecting.
4. Update the guard only if the guard is genuinely wrong.

**Never weaken or delete a guard merely to make CI green.** If a guard is in the way and you cannot
show it is wrong, the change is what needs rethinking.

---

## 4. Guards should compute, not compare spellings

The strongest guards in this repository verify a *relationship* that no single edit can satisfy by
accident:

- one variant's computed values checked against another variant's, rather than both transcribed into
  the test;
- a derived value recomputed from its inputs and compared against what the code produces;
- a count on one side of a seam required to equal a count on the other side.

A guard that transcribes a magic number only proves someone typed the same number twice. A guard
that recomputes it proves the relationship still holds. Prefer the second wherever the code makes it
possible — that usually means extracting the calculation into a pure module the test can import,
which is worth doing for its own sake.

Where a relationship genuinely cannot be computed — wiring, imports, the presence of a switch — a
source-text ratchet is the honest fallback. Say so in the guard's comment.

---

## 5. The counter-check

**A guard that is merely green is not evidence.**

Before trusting a new guard, sabotage each seam it claims to protect, one at a time, and prove the
guard falls. Then revert the sabotage. A guard that stays green under deliberate breakage is worse
than no guard, because it is read as proof.

This is not optional ceremony. The repository's history contains a guard that asked "does this file
import the tier module?" while the actual regression was a literal two lines below the import — the
guard was green throughout and the bug shipped. The guard now asserts that every assignment of the
value reads the shared constant, and the counter-check was performed.

Record that the counter-check was done. Future readers cannot tell a checked guard from an unchecked
one by looking at it.

---

## 6. Trap: raw-text guards versus comment-stripped guards

Guards fall into two families, and the difference decides whether your comment can break the build.

**Comment-stripped guards** remove `/* … */` and `// …` before matching. This is the established
idiom wherever a guard asserts that a rejected value is *absent* from the code — because the
rationale comments in this codebase deliberately name the rejected value:

```js
const bare = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
```

**Raw-text guards** do not strip. They match against the file exactly as written, comments included.

Both are legitimate. The hazard is that you cannot tell which kind you are dealing with without
reading the guard, and the two behave oppositely when you edit a comment.

**Rule: before editing any comment in a file covered by guards, check whether the guards strip
comments.** If they do not, the comment is part of the tested surface.

---

## 7. Trap: a guard that reads its own comment

A guard whose comment explains the regression by quoting the old, forbidden value — and which then
matches against the whole file — matches its own explanation. It goes red when someone documents the
fix, not when someone reintroduces the bug.

The fix is to narrow the search window to the code:

```js
const fn = src.slice(src.indexOf("function frame(now)"));
expect(fn).not.toMatch(/<the old literal>/);
```

The guard now sees the function, not the paragraph above it. When you write a guard that forbids a
spelling, ask where else in the file that spelling legitimately appears.

---

## 8. Trap: counting guards count comments

Several guards assert that two counts match — for example, that every occurrence of a wrapper class
in a file is paired with exactly one occurrence of its child class. These count raw matches over the
whole file.

Writing either class name in a **comment** changes the count and turns the guard red, with an error
message that describes a structural fault that does not exist.

**Rule: never write a guarded class name, CSS value, or magic literal into a comment in a file
covered by a counting guard.** Describe it instead, or narrow the guard.

---

## 9. Trap: the localization grabber's blind spots

The localization ratchet finds hard-wired display text by fishing JSX text nodes (`>…<`) and text
props. That mechanism has three known failure modes, and all three have shipped bugs:

- **String tables are invisible.** Display text collected in a constant table — legends, column
  headings, enumerations — is not a JSX text node. The guard offers no protection there. Player text
  that lives in a table must be localized by discipline, not by the guard.
- **Candidates containing brackets or semicolons are discarded.** The heuristic that filters out
  code-like matches also discards genuine display strings. A single parenthesis in a `title` was
  enough for a German string to survive on an otherwise English page.
- **It can fish the wrong line.** A table of JSX fragments makes the `>…<` grabber pick up the *next
  line's key name* as hard-wired display text — a false positive that pushes authors toward writing
  the data as data, which is the right outcome for a different reason.

Corollary for anyone adding shapes, legends, or tables: keep them as data, and localize them
explicitly.

---

## 10. Green does not prove correctness

Collecting the previous sections into one statement, because it is the thing most likely to be
forgotten under time pressure:

- The suite does not render the UI. It cannot see a visual regression.
- Ratchets prove spellings, not behaviour.
- The localization guard has documented blind spots.
- An unverified guard may be structurally incapable of failing.
- Timing-sensitive tests can pass or fail for reasons unrelated to the change under test.

Green means "no pinned invariant was disturbed". It does not mean "this works". Where a change is
visual, look at it. Where a change is device-dependent, measure on the device and say which of
*measured*, *observed*, *inferred*, or *proposed* your claim is.

---

## 11. Do not document volatile counts

**Never state a test count, file count, or case count in durable documentation.** Every such number
in this repository's history has rotted, and multiple mutually contradictory counts once coexisted in
the same file.

Write "run `npm test` for the current result" instead. The same applies to counts of screens,
migrated files, and anything else a normal change alters.

---

## 12. Diagnosing a confusing red suite

Work through this before concluding there is a logic regression.

1. **Did `npm ci` run in this worktree?** Per-worktree `node_modules/` is the most common cause of
   inexplicable failures in a fresh worktree.
2. **Is the failure a timeout rather than an assertion?** Timing-sensitive tests can exceed the
   default per-test timeout under full-suite parallel load on a slower or busier host while passing
   comfortably in isolation. Re-run the single file before drawing any conclusion:
   ```bash
   npx vitest run test/<file>.test.js
   ```
   Report both results. A timeout that reproduces in isolation is a real failure; one that does not
   is a load artifact — and it is still not licence to treat *any* failure in that file as a flake.
3. **Line endings and case.** CI is Linux, development may be Windows. `.gitattributes` is
   load-bearing; source-text guards expect LF. Check line endings and path case before logic.
4. **Generated files.** If a generator's output is checked in, a stale artifact fails the guard that
   compares it. Re-run the generator (`npm run gen:db`, `npm run gen:profanity-sql`,
   `npm run loc:export`) and see whether the diff disappears.
5. **Only then** read the failure as a behaviour regression.

---

## 13. Tests that read files at runtime

Two documentation files are read by tests and must never be moved or renamed:

- `docs/localization/strings_de_pixi_2026-08-15.csv`
- `docs/username-profanity-guard.sql`

No test reads `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/engineering/**`, or `docs/decisions/**`.
Documentation changes in those paths cannot break CI — which is exactly why they must be kept correct
by review rather than by hope.

---

## 14. Provenance

The trap classes above are distilled from the project's historical records. The individual incidents,
with their measurements and the reasoning at the time, remain in
`docs/decisions/engineering-log-2026-08.md`. Search `Wächter`, `Ratsche`, or `Gegenprobe` to find
the threads; start at `docs/decisions/README.md`.

Those records are historical context, not standing instruction. This document states the current
rules.
