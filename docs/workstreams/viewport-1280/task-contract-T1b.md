# Task Contract — T1b: the flip to 1280, and the survey (`#viewport-1280`)

**Status:** proposed, **not started.**
**Continues** `task-contract-T1.md`, which covers commits 1 and 2 and is **complete**. Where the two
disagree, this contract wins. Evidence for what is already done: `evidence-T1.md`.

---

## 1. Identity

| Field | Value |
| --- | --- |
| **Task** | `#viewport-1280` T1b — commit 3 (value flip) and commit 4 (measurement pass) |
| **Branch** | `feature/viewport-1280` — **exists**, do not create it again |
| **Base for this part** | `062538e4` on that branch |
| **Worktree** | `C:\Code\Autostich-worktrees\viewport-1280` — exists, `npm ci` already run |
| **Owner** | Claude worker, single writer |
| **Reviewer** | Codex, independently, per §6 |
| **Concurrency** | One writer. Sequential sessions may continue in this worktree. Never two at once. |

**Starting state, to be re-verified before the first edit:**

```bash
git -C <worktree> log --oneline -1        # 062538e4
git -C <worktree> status --short          # empty
grep -n "breakpoint-dt" src/index.css     # 1400px
```

The threshold is **still 1400**. Everything so far was groundwork so that moving it becomes provable.

---

## 2. The ordering constraint that breaks if ignored

**The 390 px phone capture must be taken BEFORE the value changes, from the state named above.**

The phone counter-proof compares the phone layout across the flip. Once the threshold is 1280 there is
no "before" left to capture, and the only way back is `git stash` gymnastics against a moving tree.
This is the one step in T1b whose order cannot be recovered by redoing work.

So commit 4's capture tooling — or at least the part of it that renders a screen at a fixed viewport
and records geometry and pixels — has to exist **before** commit 3 lands. That inverts the numbering
in the original contract, and the numbering loses.

Practical sequence:

| # | Step | Threshold |
| --- | --- | --- |
| 1 | Build the capture tool. Take the 390 px baseline, DE and EN, five screens. Commit tool + baseline. | 1400 |
| 2 | Flip the value, carry the prose, add the completeness guard, re-capture 390 px, compare. | **1280** |
| 3 | Extend the tool to the full survey and run it. | 1280 |

---

## 3. The capture tool

Built on `scripts/cdp.mjs`. **Not Playwright** — the project rejected it on record, for a reason that
still holds (a browser download per worktree and per CI run).

- **Production build**, served by `vite preview --port 5181 --strictPort`. `--strictPort` is mandatory:
  a server that silently moved would make every measurement be about an unknown build.
- Real viewport via `Emulation.setDeviceMetricsOverride`. **Not** the in-app harness — it is
  `VITE_PREVIEW`-gated and absent from a production build.
- Determinism controls, reproducing what `viewport-proof.mjs` already establishes:
  `prefers-reduced-motion: reduce`, seeded `Math.random` before any application script, muted audio,
  telemetry off, minimal effect tier, a seeded username so the hub renders instead of the welcome
  dialog, and `beforeinstallprompt` suppressed.
- **No `--hide-scrollbars`.** A scrollbar is part of the layout under test.

### 3.1 Phone proof output

At 390 px, DE **and** EN, across hub · shop · upgrade tree · level-up · stats:

- **Geometry fingerprint** — tag plus rounded bounding box per element, in document order. Class names
  are **excluded** from the comparison key: commit 2 already renamed them by design, and a later
  commit may again.
- **Pixel comparison** — the existing text-mask / noise-threshold method.

**Expectation: 0 structural differences, 0.0000 % of pixels beyond the noise threshold.** Any deviation
is a defect, not a tolerance to be widened. Stop and report.

---

## 4. Commit 3 — the flip

- `--breakpoint-dt: 1400px` → `1280px`.
- The counter-edge `@media (max-width: 1399.98px)` → `1279.98px`, and every remaining
  `(min-width: 1400px…)` media query in `index.css`.
- **Prose carried forward** where it is now false: `src/index.css`, `src/App.jsx`, `src/i18n/de.js`,
  `src/i18n/en.js`, test headers and assertion messages. The log under `docs/decisions/` stays
  **unchanged** — historical record, not current text.
- **The rationale block replaced.** `src/index.css` still argues for 1400 over 1280 on the grounds that
  the hub column pair measures 1520 px. Replace it with the current reasoning — the itch.io embed at
  1280×720 — and a pointer to this workstream. German, in place.
- Re-capture the 390 px proof and compare against the baseline from §3.

### 4.1 The completeness guard

A new test that **computes** rather than compares spellings:

1. No `1400` remains anywhere in `src/**` except a **named** exception list, each entry justified in
   the test itself.
2. Every `min-width: N px` with N > 1000 in `index.css` is either the `@theme` token's value or on the
   exception list — currently `{1750}`, the guide's large step.
3. Exactly one counter-edge exists and it equals *(token value − 0.02)*.
4. No arbitrary `min-[Npx]:` variant exists in `src/**`. The named variant is the only route.
5. The `@theme` block contains exactly one `--breakpoint-*` token, and `DESKTOP_MIN` equals its value.
   (`test/desktopBreakpoint.js` already enforces 4 and 5 by throwing; the guard states them as
   assertions so a reader sees the rule rather than a stack trace.)

**Sabotage check, shown in the record:** reinstate one site at 1400, run the guard, show it fails,
revert. A guard nobody has seen fail is not evidence — that is how the i18n guard stayed vacuous.

---

## 5. Commit 4 — the survey

### 5.1 Matrix

| Axis | Values |
| --- | --- |
| Sizes | **1280×720** (anchor) · 1400×700 · 1536×791 · 1600×900 · 1920×1080 |
| Languages | DE and EN. The longest strings differ per language; one language is an incomplete finding. |
| Build | Production, real CDP viewport, port 5181. |

### 5.2 Surfaces

Hub · shop (packs / challenges / effects) · upgrade tree (general + faction) · guide · glossary ·
stats · leaderboard (global + ranked) · run details · victory screen · options · perk choice · skill
choice · **formation phase with buildings / architect contour** · architect · run dialogs.

**Board state: the buildings / architect-contour state only** — the owner's decision. It renders board,
bars, bank and perk column, so the run-screen chrome is covered, and it carries the SVG contour that is
the known `zoom` hazard.

**Named measurement gap, to be repeated verbatim in the findings:** the *running trick* state is not
measured, and it shows the trick-breakdown row that the buildings state does not — so it places more
content in the same height. The empty formation-phase state is not measured either; it is strictly less
dense and is the lower risk of the two omissions.

### 5.3 Per surface × size × language, record

1. Page scrolling: yes/no and by how many pixels, **both axes**.
2. Overflow beyond the panel edge, in pixels, with the offending element.
3. Truncated text — `scrollWidth > clientWidth` under `text-overflow: ellipsis`, or `line-clamp` in
   effect — with source location.
4. Elements outside their panel. **Panel** is the nearest ancestor carrying `overflow: hidden`, an
   `as-panel*` class, or its own background. Fixed here so every later round measures the same thing.
5. **Text shrinkage:** every text node whose computed size at this width is smaller than the same
   node's size at 1920. This is the only text criterion T1b enforces.
6. **Typography inventory** — per text node: computed size, weight, opacity, nearest panel ancestor,
   screen, language. Input for S2 (§7), *not* a criterion here.

### 5.4 Reporting

Raw matrix as JSON under `docs/workstreams/viewport-1280/evidence/`.

The prose findings table is **aggregated**: one row per surface with the **worst** value and the
language and size at which it occurred. ~170 raw cells is not a readable finding. Sorted by damage,
largest overflow first, with a common-cause hypothesis wherever several surfaces show the same shape.

**The hypothesis to confirm or refute** is already on record in `planning-report.md` §1.5. State for
each row whether the prediction held. A survey that only reports what it found, without checking what
was predicted, teaches nothing for the next round.

---

## 6. Push and review

| When | What |
| --- | --- |
| After commit 3's gates pass | **Push the branch to `origin`.** `AGENTS.md`: important work must not live only in a local worktree. First push sets upstream for this branch only. |
| After commit 4 | **Hand to Codex for independent review**, before any integration into `dev`. Codex reviews; Codex does not implement. |
| Integration into `dev` | Only after review, and only on explicit instruction. |
| Pull request | **Not opened** unless explicitly requested. |
| `test` and `main` | Untouched. Promotion is a separate, fast-forward-only step. |

A push is not an integration. Nothing merges without the review and a decision.

---

## 7. When S2 (typography) starts

**Not in T1b, and not in T2 either — S2 starts after T2 lands.**

The reason is ordering, not priority: tuning text sizes against fixed-pixel lanes means tuning twice.
Every raised line creates a fresh overflow in a rigid lane, which then gets trimmed away, and once
T2 has made the lanes elastic the trade is wrong again.

T1b's obligation to S2 is exactly one thing: **produce the inventory** (§5.3 item 6) and nothing else.
It does not raise a single size, does not name a floor, and does not delete a catalogue entry.

The one text rule that *is* enforced now is the regression rule — nothing at 1280 smaller than at 1920.
By current knowledge it binds in exactly one place, the guide's `--gs` step, and even that is repaired
in T2, not here.

---

## 8. Acceptance gate

1. The 390 px phone proof: 0 structural differences on geometry, 0.0000 % of pixels beyond the noise
   threshold, DE **and** EN, comparing across the flip.
2. The completeness guard fails on a reinstated 1400 site — **demonstrated, not asserted.**
3. The survey script runs reproducibly from the repository and writes machine-readable evidence,
   including the typography inventory.
4. Findings cover every listed surface × 5 sizes × 2 languages. **What was not measured is named**,
   including the two board states of §5.2.
5. Every §1.5 prediction from the planning report is marked held or refuted.
6. Gates green, unpiped, in this order:

   ```bash
   npm test
   npm run lint -- --max-warnings=0
   npm run build
   npm run gen:db
   ```

   Plus the `VITE_PREVIEW=1` build. Commit 3 changes `src/`, so unlike commits 1 and 2 this is the
   point where both build variants actually matter.

**Never pipe a gate command.** `npm test | tail -20` reports the exit code of `tail`.

---

## 9. Non-goals

- **Any layout repair.** What overflows is measured and written down. This holds even when the fix
  would be one line. Repairs are T2.
- R2 and R3 — elastic lanes, declared scrollers, removal of `--gs`. T2.
- Absolute text sizes and the named type scale. S2, per §7.
- The level-up wings: document the value at 1280 and leave them standing. T3 decides.
- The height media queries 950 / 900 / 820.
- Any change to the phone layout.
- `gameover.best.hint` — reported and listed as a named exception; the product decision is the owner's.
- A third layout tier, `xl:`, or a global `zoom`.
- Unrelated cleanup in touched files.

---

## 10. Known hazards

1. **The order in §2.** Capture the phone baseline first. It is the one step that cannot be recovered.
2. **Source-text ratchets.** Commit 3 changes a number in ~11 media queries and ~250 comments. Read
   each failing assertion and decide whether *behaviour* changed or only *spelling*. **Never weaken a
   guard to reach green.**
3. **Prose that guards match.** One anchor already keyed on a German comment heading containing
   "ab 1400 px" (fixed in commit 1). Assume there are more of that shape and check before assuming a
   real failure.
4. **`i18n` comment prose.** `de.js` and `en.js` carry comments claiming "ab 1400 px". They are
   comments, not strings, so `loc:export` is not triggered — but leaving them stale makes the
   localisation files lie.
5. **Scrollbar cascade.** At 1280 a vertical scrollbar leaves 1272 px of client width, so a surface
   that overflows slightly in height can also overflow in width. Record both axes; address height
   before width when reporting causes.
6. **Windows / Git Bash.** `MSYS_NO_PATHCONV=1` for `revision:path` arguments; prefer
   `git hash-object <path>` and `git show --raw <rev>` where they avoid the colon.
7. **Escaping in built CSS.** Inside a bracketed Tailwind value the dot is escaped in the selector too
   (`tracking-\[\.2em\]`). An unescaped search needle finds nothing and looks exactly like a
   regression. This already cost one false alarm.
8. **`.gitattributes` is load-bearing.** When CI and local disagree, check line endings, case
   sensitivity and generated files before assuming a logic regression.

---

## 11. Definition of done

- Capture tool committed and re-runnable; 390 px baseline captured **before** the flip.
- Threshold at 1280 at all four sites, with the completeness guard seen to fail under sabotage.
- Prose carried forward; the 1400-over-1280 rationale replaced.
- Phone counter-proof recorded, DE and EN.
- Survey script committed; findings written as an aggregated table sorted by damage, with named gaps
  and every prediction marked held or refuted.
- All gates green including the preview build.
- Branch pushed. Handed to Codex. **No pull request**, no integration.

**Not done** if any acceptance item is asserted rather than shown, or if a layout repair was made
along the way because it "was only one line".
