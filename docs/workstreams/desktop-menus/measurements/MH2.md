# MH2 — harness, second pass

**Task** `MH2` · Tier A · branch `task/menu-mh2-harness` · base `486e60c0` (tip of
`feature/desktop-menus`) · worktree `C:/Code/Autostich-worktrees/menu-rework` · ports preview 5189 ·
survey 5181.

**This task moves no pixels.** It repairs the instrument the remaining screens are measured with. No
`src/**` file, no screen markup and no `.xx-*` rule is in the diff; `test/typo-tokens.test.js` is
unmodified.

| commit | what |
| --- | --- |
| `d42e2447` | the three fixes and their guards |

---

## Part 0 — the number the owner asked for, first, because it is the owner's decision

**`autostich_scores` holds 260 rows. 250 of them are `SURVEY`.**

```
all rows      260
name=SURVEY   250     (2026-08-22: 13 · 2026-08-23: 95 · 2026-08-24: 142)
name=M8         0
```

Read-only, through the project's own publishable key, with `Prefer: count=exact`. **Nothing was
deleted, and nothing should be deleted on my say-so** — the ten remaining rows are real players and
telling them apart from the harness rows is a judgement about the owner's data.

Two things in that table are worth stating plainly:

- **Ten real player rows are outnumbered 25:1 by the harness.** The score never reaches the top
  twenty, so no gate and no screen ever showed it. This is what "invisible" meant in the contract.
- **`name=eq.M8` returns zero.** M8's own harness ran the same screens against the same build and
  posted nothing, because it installed the stub. The defect was never in the stub; it was that the
  stub was task-local.

---

## Part 1 — the live write, and what promoting M8's stub ends

**The defect.** `publishRun` (`leaderboard.js:106`) returns early on `VITE_PREVIEW` and on nothing
else. The survey measures the **production** build on purpose — a baseline taken through a preview
build is a baseline of something nobody plays — so the gate was open on every run. The survey seeds
`as_username = "SURVEY"`, and its `victory` cell ends a real run in each of the ten
language × size groups. Ten rows per full matrix.

**The fix is M8's, moved rather than invented.** `fetchStubSource()` and `freezeClockSource()` now
live in `scripts/survey-stub.mjs` and are installed by `viewport-survey.mjs` as **init scripts**,
before the module graph runs. `evidence/M8/seed.mjs` re-exports them, so there is one copy: two
copies of a write barrier are one copy and one liability. `measure.mjs` imports the same four names
from the same place and did not change.

**Why the stub rather than the one-line seed fix.** Seeding an empty username stops the write too —
and `as_username` renders, so it would have moved the baseline for every remaining task. The stub
changes nothing the application can see: `leaderboardConfigured` stays true, `PREVIEW` stays false,
every code path is the one that ships. Only the answer's origin moves.

**The barrier is on the table name, not on the method.** `publishRun` POSTs to the same REST path the
board GETs, so the insert is caught by the line that catches the read. There is no
`if (method === "GET")` to fall through, and the guard asserts a POST specifically so that nobody can
add one as an optimisation.

### The proof: a full run posts zero rows

**Not asserted — counted, on the live table, either side of a full 160-cell run.**

```
                        all rows    name=SURVEY
before run A              260          250
node scripts/viewport-survey.mjs --out .../evidence/MH2/after-1
  -> 160 cells · 0 not reached
after  run A              260          250
```

**Zero rows.** The same run would have posted ten. Two further confirmations from the same query:

- The newest row in the whole table is still `2026-08-24T21:47:47Z` — **yesterday**, from the last
  unprotected run. This run happened on 2026-08-25 and left no trace at all.
- The run's own log says it before it starts, so the operator does not have to infer it:
  `autostich_scores answered locally (this run writes NOTHING to the live board)`.

Run B, taken for the noise floor below, is a second full run under the same barrier.

---

## Part 2 — what the pinned clock retires

**`freezeClockSource()` pins `Date.now()` and `new Date()` to 2026-08-24 12:00 UTC on every survey
run.** It deliberately leaves `performance.now()` alone: React's scheduler reads it, and a frozen
monotonic clock is a hung scheduler, not a still screen. That distinction is asserted, not trusted.

**So this instruction leaves the contracts:**

> *Both halves of a comparison must be taken on the same side of a week boundary.*

It has been in every contract since M2a, it is MENU-30's answer, and it is now a rule against a hazard
that no longer exists. Both halves carry the same frozen instant whatever days they are actually
taken on — the week label, the week seed and the countdown are the same string by construction.

**The next contract should drop it.** Carrying a retired rule forward costs a reader's attention every
time, and it teaches the next worker to schedule around something that cannot happen.

**TYPO-08 goes with it.** The leaderboard's row count followed whatever the live table held at the
moment of the run; against a fixed twenty-row table it is equal by construction. It no longer needs
pre-registering as not-comparable.

---

## Part 3 — the survey proves it measured the bundle it built (M3-F09)

**The defect.** `ensureServer()` asked whether *something* answered on 5181 and reused it. A preview
server left by an earlier session on this shared worktree serves an abandoned `dist/` and is
indistinguishable from a fresh one by that test. M3 lost its gate to exactly that; the planner cleared
the port by hand afterwards.

**The fix.** `scripts/survey-bundle.mjs` compares two documents byte for byte against `dist/`:

| document | the failure it catches that the other cannot |
| --- | --- |
| `index.html` | a server built from a **different** `dist/` names a different entry chunk here |
| the entry chunk | a **half-replaced** `dist/` under a server still holding the old index — and the SPA fallback, which answers a missing asset with `200 text/html`, the exact shape a `--base` mistake produces |

An inherited server that does not match is **refused**, not reused, and the refusal is a throw rather
than a fallback: the port is held with `--strictPort`, so there is nothing to fall back to, and
whether the process holding it may be killed is not the script's decision. The message names which
document mismatched and by how much.

**Checked twice per run — before the first cell and after the last.** A startup check cannot see an
`npm run build` landing mid-survey, which is the contamination M3's record spends a paragraph on:
early cells measure the old bundle, late cells the new one, and the matrix is a blend of two states
that never existed together. Green, plausible, and meaningless. The second check sits at the end of
the `try` and not in the `finally`, because a throw from a `finally` replaces the exception already
travelling — a browser that died mid-run would otherwise be reported as a bundle mismatch.

**Own servers are checked too, and that is not belt-and-braces.** Without `--base`, every asset comes
back as the SPA fallback with status 200: `serverAlive()` is satisfied and the page merely looks slow.
One assertion catches both cases.

Confirmed in passing: rebuilding this tree produces the identical entry chunk
(`index-DCpqlujg.js`, sha `a2c36558cae923e6`, index `56ad223296b9734f`) — which is why M3's
mid-run rebuild turned out harmless *after the fact*. That is an argument, not a guarantee, and it is
why the check exists rather than the observation.

---

## Part 4 — the accumulated run count, per cell (§8.12)

**The cells are not independent.** Every `victory` cell ends a run, `recordRun` (`storage.js:410`)
prepends it to `as_runhistory`, and nothing clears it between cells. The first cell of a browser
session sees 0 completed runs and the tenth sees 9. It is deterministic and it cancels between two
halves of a comparison — but a reader looking at **one** matrix cannot tell a known accumulation from
a regression, and four surfaces read the number.

**Every cell now carries it**, read from the same key the application writes, at two moments:

```json
"runs": { "entry": 3, "capture": 3 }
```

`entry` is read before the navigation, `capture` at the probe. They differ by one on exactly the
cells that write a run — `victory` enters at N and is captured at N+1 — and `capture` is the number
the surface on screen was actually reading. `-1` means the history was unreadable, and is deliberately
not `0`: a missing number must not read as an empty one.

**Reported, not corrected.** Clearing the history between cells would change what is measured, which
is not this task's business.

`surface-delta.mjs` reads `cell.surface` and `cell.tokens` only, so the new field is inert for the
comparator — it cannot manufacture a delta of its own.

**Measured, run A — the §8.12 description is confirmed exactly.** All 160 cells carry the field.

```
first size group   de/1920x1080/hub   entry 0  capture 0
...
last  size group   en/1280x720/hub    entry 9  capture 9

the ONLY ten cells where entry != capture:
   de/1920x1080/victory  0 -> 1      en/1920x1080/victory  5 -> 6
   de/1600x900/victory   1 -> 2      en/1600x900/victory   6 -> 7
   de/1536x791/victory   2 -> 3      en/1536x791/victory   7 -> 8
   de/1400x700/victory   3 -> 4      en/1400x700/victory   8 -> 9
   de/1280x720/victory   4 -> 5      en/1280x720/victory   9 -> 10
```

0 in the first group and 9 in the last, exactly as the contract stated it; `victory` is the only
surface that writes one, and the two-moment reading is what makes that visible rather than a jump
between neighbouring cells that a reader has to explain.

---

## Part 5 — the comparison: did the stub move anything that is captured?

**This is the half the contract insists on: a clean table bought with a moved baseline is not a pass.**
`src/**` is byte-identical to the baseline's tree (`git diff 098d6e24..HEAD -- src/` is empty) and the
entry chunk rebuilds to the same hash, so anything that moves here is the stub and nothing else.

```
node scripts/surface-delta.mjs docs/workstreams/desktop-menus/evidence/M8/survey-after \
                               docs/workstreams/desktop-menus/evidence/MH2/after-1
```

**160 cells, 25029 matched nodes, 710 deltas, 230 unmatched — every one of them on `leaderboard`.**

| surface | deltas | unmatched |
| --- | --- | --- |
| `leaderboard` | 710 (71 in each of the 10 cells) | 230 |
| **the other fifteen** | **0** | **0** |

```
by lang:     de=355  en=355            by size:  1280x720=142 … 1920x1080=142   (identical everywhere)
by surface:  leaderboard=710
by property: box[w]=360  box[x]=310  bg=20  bs=20
```

**One surface moved, and it is the one the stub exists to hold still.** The baseline read the live
table; run A reads the fixed twenty rows. Different names give different text widths — which is the
whole of `box[w]` and `box[x]`, 670 of the 710 — and row 4's deliberate `tree_nodes: null` renders the
**dashed** `TreePill`, which is the 20 `bs: dashed→solid` and 20 `bg` deltas and the one extra node per
cell (160 → 161) that produces the unmatched count. **71 deltas in every single cell**, identically:
that is what one changed data set looks like, and not what noise looks like.

**The trade, stated plainly.** This moves `leaderboard`'s baseline once. It is the surface TYPO-08
already pre-registered as **not comparable**, because its row count followed the network — so what
moved was never a baseline anyone could compare against. From this run on it is reproducible. **The
other fifteen surfaces did not move at all**, which is the property the empty-username fix could not
have offered: `as_username` renders, and it renders on more than one screen.

**The pinned clock moved nothing here, and that is not evidence that it does nothing.** The baseline
run happened to be taken on 2026-08-24, which is the frozen instant's own date and inside ISO week 35,
so the week label was already equal. Its value is for the runs that come *after* — MENU-30's 72 box
deltas came from a comparison whose halves straddled midnight, and that can no longer happen.

---

## Part 6 — the noise floor

**Same tree, captured twice, under the new arrangement.** Run B is a second full run from the same
commit, the same `dist/` and the same barrier — the acceptance gate's first half.

```
node scripts/viewport-survey.mjs --out docs/workstreams/desktop-menus/evidence/MH2/after-2
node scripts/surface-delta.mjs docs/workstreams/desktop-menus/evidence/MH2/after-1 \
                               docs/workstreams/desktop-menus/evidence/MH2/after-2

  compared 160 cells, 25149 matched nodes
  unmatched nodes: 0 pre-registered (H-c: leaderboard, victory), 0 elsewhere
  ZERO computed deltas on the four surface axes.                              exit 0
```

**Zero, and zero unmatched with it.** Not adjusted to zero — this is the first comparison run.

**The unmatched line is the part worth reading twice.** `leaderboard` and `victory` are
*pre-registered* as allowed to differ (H-c), because their node sets used to follow the network and
the clock. They now return **0**. The pre-registration is no longer paying for anything, which is the
same retirement Part 2 describes, one level down: the exception exists against a hazard the barrier
has removed.

**A cheaper cross-check that agrees.** The 160 stdout lines of the two runs — scroll, overflow,
outside, truncated, text-node count, run count and surface-node count per cell — are **byte-identical**,
compared with `diff`. That is an independent read of the same property through a different path.

### And run B posted nothing either

```
                        all rows    name=SURVEY
after run A               260          250
after run B               260          250
newest row in the table   2026-08-24T21:47:47Z   (yesterday, from the last unprotected run)
```

**Both halves of the acceptance gate hold, and neither was bought with the other:** two full runs
wrote nothing, and the baseline moved on exactly one surface — named, explained and reproducible from
here on.

---

## Part 7 — the guards, and the seams broken to prove them

Three guards, in `test/harness-honesty.test.js`, extending MH1's two. **All three are behavioural.**
The write barrier is executed in a `node:vm` realm with a recording `fetch` underneath it and asked to
let a POST through; the bundle check runs against two real `node:http` servers, one honest and one
holding an abandoned build; the run counter runs against a fake storage. `node:vm`, `node:http` and
`node:crypto` ship with the runtime — the survey's tooling is dependency-free on purpose and stays so.

Two structural assertions do exist, and both are about **where** a source is installed — a
relationship a sandbox cannot see, and the whole of M8's warning: an init script installed after the
module graph runs has already missed the first fetch.

**Eleven seams broken deliberately, one at a time, each confirmed red before restoring:**

| # | seam broken | guard that went red |
| --- | --- | --- |
| 1a | the stub lets a POST through (`if (method === "POST") return real(...)`) | *a POST — the insert `publishRun` makes — never reaches the network* |
| 1b | the survey stops installing `freezeClockSource` | *the survey installs BOTH before the module graph runs* |
| 1c | the clock stub also pins `performance.now()` | *the clock is pinned — and `performance.now()` deliberately is not* |
| 1d | the survey stops installing `fetchStubSource` | *the survey installs BOTH before the module graph runs* |
| 2a | `verdict()` stops comparing `index.html` | *A STALE SERVER IS REFUSED* |
| 2b | the SPA fallback is no longer named for what it is | *and so is the SPA fallback answering 200 for an asset that is not there* |
| 2c | `ensureServer()` trusts an inherited server again | *the survey checks it before the first cell AND after the last* |
| 2d | the bundle is no longer re-checked after the last cell | *the survey checks it before the first cell AND after the last* |
| 3a | the run counter reads a key of its own invention (`as_runs`) | *it reports what the history actually holds* · *…is -1 and NOT 0* · *it reads the key the application writes* |
| 3b | an unreadable history is reported as `0` | *an unreadable history is -1 and NOT 0* |
| 3c | the survey stops writing the count into the cell | *and the survey records it per cell* |

**One of these was a false red first time round and is worth recording**, because it is the same class
of mistake the whole contract is about. The install-ordering assertion first compared the position of
the init call against the first `await goto(` in the file — which is inside `measure()`, **defined**
above `main` and **called** from inside it. It compared source order to execution order and failed on
a correct file. It is now anchored on the navigation loop, which is the relationship that actually
carries the guarantee. A guard that asks the wrong question fails the same way a check that asks
whether something is *present* fails: convincingly.

---

## Part 8 — file surface, and one deviation from the contract's expectation

| file | what |
| --- | --- |
| `scripts/survey-stub.mjs` | **new** — promoted from `evidence/M8/seed.mjs`; the three page-side sources |
| `scripts/survey-bundle.mjs` | **new, not in the contract's expected surface** — see below |
| `scripts/viewport-survey.mjs` | installs both init scripts, verifies the bundle twice, records the run count |
| `docs/.../evidence/M8/seed.mjs` | re-exports the promoted four names; its own halves (profile, epoch, schema stamp) unchanged |
| `test/harness-honesty.test.js` | three guards added to MH1's two |
| `docs/.../measurements/MH2.md` | this record |

**The deviation.** The contract expected the bundle check inside `viewport-survey.mjs`. It is a
separate module because **that file launches a browser at module scope** — importing it into a test
starts Chrome and runs a survey. (Confirmed the expensive way during this task: a syntax check written
as `import()` started a full run.) A guard that cannot import the thing it guards ends up matching
source text instead of behaviour, which is the failure mode `testing.md` names. Everything in
`survey-bundle.mjs` takes its input as arguments, so the guard runs it for real.

---

## Findings

| id | finding | consequence |
| --- | --- | --- |
| **MH2-F01** | `autostich_scores` holds 260 rows, 250 of them `SURVEY` (96 %). Ten player rows remain | **owner decision.** Nothing deleted. The write is stopped at the source; the existing rows are data, not debris this task may clear |
| **MH2-F02** | The week-boundary instruction is retired by the pinned clock, and TYPO-08's row-count pre-registration with it | the next contract drops both rather than carrying rules against hazards that no longer exist |
| **MH2-F03** | `publishRun`'s gate is still `VITE_PREVIEW` alone. The barrier promoted here is the *survey's*, not the application's — any other harness driving the production build writes real rows | out of scope (`src/**` is read-only for MH2), and named so a later task can decide whether the application should ask "is this a real player?" itself |

| **MH2-F04** | Promoting the stub moves `leaderboard`'s baseline once — 710 deltas and 230 unmatched nodes, all on that one surface, 0 on the other fifteen. It is the surface TYPO-08 had already pre-registered as not comparable | **the new baseline is `evidence/MH2/after-1`,** and `leaderboard` is comparable for the first time. A task comparing against `M8/survey-after` or earlier must expect this one-time step on this one surface |
| **MH2-F05** | With the board and the clock fixed, `leaderboard` and `victory` return **0 unmatched nodes** between two runs. H-c pre-registers them as allowed to differ | H-c is no longer paying for anything. The next contract can drop it with the week-boundary rule — same reason, one level down |

**Evidence**

| path | what |
| --- | --- |
| `evidence/MH2/after-1/matrix.json` | run A — 160 cells, 0 unreached. **The new baseline.** |
| `evidence/MH2/after-2/matrix.json` | run B — the second half of the noise floor |
| `evidence/MH2/noise-floor.txt` | A vs B — zero deltas, zero unmatched, exit 0 |
| `evidence/MH2/baseline-shift.txt` | `M8/survey-after` vs A — the 710 leaderboard deltas, in full |

---

## MH3 — the flush, appended 2026-08-25

*Recorded here rather than in a new document, as instructed: MH1 and MH2 already own the harness's
record and a third file would split it.*

### The defect

`scripts/surface-delta.mjs` ended with

```js
process.exit(deltas.length || realUnmatched.length ? 1 : 0);
```

**On POSIX a piped stdout is asynchronous.** `process.exit()` terminates at once and discards
whatever is still queued, and this script writes 34 098 bytes against the MH1 fixture. On Windows
pipes are synchronous, so nothing is ever lost.

**Windows-dev / Linux-CI — the same hazard class as `.gitattributes`** (`AGENTS.md` — *Platform*).

CI kept **167 of 288 deltas**, first loss `en/1280x720/options body>div:nth-child(12)` at byte
19 346. The census block prints *after* the delta list, so it went with the tail — hence two failed
assertions rather than one.

**What survived was a contiguous slice of the sort order**, which reads as *"deltas only in German, a
hole at 1920×1080"* — literally the false finding MENU-55 nearly produced, arriving this time through
a lost flush instead of a coded cap. **The guard was right; only the mechanism changed.**

### The fix

```js
process.exitCode = deltas.length || realUnmatched.length ? 1 : 0;
```

Node then exits on its own, after the buffer drains. Exit codes preserved — 1 with a delta, 0
without, which the MH1 assertions depend on.

### The guard, and why it is a source assertion

**Reproduction was not possible on this machine, and that is stated rather than glossed.** The
defect requires asynchronous pipes; Windows has synchronous ones. The measurements in the brief
(0/40 idle, 33/40 under twelve spinners, shortest survivor 19 346 bytes) come from a Linux box and
are quoted, not reproduced here. **CI is the verification.**

That same asymmetry decided the guard's shape. A behavioural test — slow reader, demand the whole
output — fails on Linux and passes on Windows **whether or not the defect is present**. On the
machine where the mistake gets written it would be green either way: the exact flaky-green property
that let this reach CI twice.

**The invariant is not "never call `process.exit`".** Two early exits sit above any output, on a
usage error and a missing file, writing about sixty bytes of stderr. Forbidding them would be a rule
against a shape rather than against a failure. What must hold is:

> **Once the report has begun, the process ends by letting Node drain.**

Three assertions: nothing terminates after the first `process.stdout`; the status is set as a code;
and the reason stands at the line, naming both platforms.

**The first draft of this guard matched its own explanatory comment** — `process.exit()` appears
twice in the comment that explains why it must not be called. `AGENTS.md` warns about exactly that
under the ratchet hazard, and it took one run to reproduce it. Comments are stripped before matching.

### Counter-checks

| Break | Result |
| --- | --- |
| `process.exitCode` → `process.exit()` | **red**, 4 assertions |
| the explanation removed from above the line | **red** |
| restored | green |

### Gates

`npm test` 143 files / **2292 tests** · `lint --max-warnings=0` · `build` · `gen:db` — all exit 0,
run bare without pipes.

### Noted, not widened

`viewport-proof.mjs`, `phone-proof.mjs`, `viewport-survey.mjs`, `mobile-tile-sheet.mjs` and
`check-preview-exclusion.mjs` carry the same exit-after-stdout shape and write far too little to be
at risk. **Left alone deliberately** — a fix that widens past its evidence is a fix nobody measured.

### The planner's own failure, recorded because it is the reusable part

**CI was red on two pushes and the planner reported "four gates green" after each.** The gates were
green — *locally, on Windows*. `gh` was available throughout and was never consulted.

> **A gate is green when the machine that will run it says so.** A local run on the developer's
> platform is evidence, not the verdict — and on a Windows-dev / Linux-CI project it is evidence
> about the wrong platform.

**From here: CI state is checked after every push to `feature/desktop-menus`, before the next task is
opened.**
