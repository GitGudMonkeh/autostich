# M1 handoff — Options, the pilot

1. **Done.** Five commits on `task/menu-m1-options` (base `fd79afb6`): mechanism · 2a structure · 2b
   vocabulary · glow fix · `conventions.md` §2c. Nothing pushed, nothing merged, no PR.
2. **Did the vocabulary hold? YES.** 19 steps across five capped axes carried the whole pilot screen.
   Nothing was missing; two things were **named as not claimed** rather than smuggled in — text colour
   (7 ink values) and padding that is not a box inset. Both are yours (MENU-26/27).
3. **Tripwire 1 — not fired.** Every value landed in the token table; none at a call site.
4. **Tripwire 2 — not fired.** No worker built its own panel. Extensions I proposed rather than took:
   the deck tint (derived from `.as-hub-tile`) and the control group.
5. **Guards.** 4 `*-ruhe`-family rewritten to the invariant (`go`, `st`, `lv`, plus `fx-panel`, which
   the hazard list did not name) — **7 counter-checks**. `options-sections` and `test-viewport`
   rewritten, not renumbered. New: `panel-tokens.test.js` (**12 counter-checks**, all four spellings)
   and `optionen-redesign.test.js` (**5**). `up`, `rd`, `cz` were **measured and left alone**: their
   `!important` guards a utility, not a `modalStyle` inline — H-a names six, only two applied.
6. **Findings MENU-01…30**, in `measurements/M1.md`. Defects in this task: 01, 10, 15, 16, 19, 20, 28,
   29 — all fixed and re-measured. Owner questions: 08/09 (columns, answered), 12 (reset confirm,
   answered), 22 (Auflösung not built), **25 (the 9/5 % deck tint on a bright deck — open, at the End
   stop)**. Yours: 26, 27, and the H-c amendment below.
7. **M2a inherits:** tree clean, worktree in place, port 5189, branch tip `ef6db435`. §2c is frozen and
   answers the reader test. `panel-tokens.test.js` has an allowlist that grows by one entry per worker.
   **H-c is two classes short:** `stats` and `feedback` read run history, and the hub reads the CLOCK —
   a comparison straddling a week boundary lights up 10 surfaces at once from one span.
