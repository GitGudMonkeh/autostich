# `evidence/M8` — the leaderboard

What is here, and which of it outlives the task.

| Path | What |
| --- | --- |
| `seed.mjs` | the still board (20 generated rows), the frozen clock, and the profile — no `Date.now()`, no `Math.random()`, byte-identical on every run |
| `measure.mjs` | the geometry harness: production build, port **5189**, six views per size and language |
| `states.mjs` | the twelve control states the survey cannot see, driven by hand |
| `pixels.mjs` | decodes a capture in Node so a colour delta can be **read** instead of reasoned about |
| `before/`, `after/` | 60 cells each — five sizes × two languages × six views |
| `before-emptychamps/`, `after-emptychamps/` | the same, with an **empty** champion archive (the design's open question 1) |
| `before-shots/`, `after-shots/` | 1536 × 791, German, with PNGs — what the colour deltas were sampled from |
| `owner/` | the owner-facing set: four views, two sizes, both languages |
| `states/` | one PNG and one reading per control state |
| `survey-after/` | this task's survey matrix |
| `delta.txt` | the zero-delta gate, printed |

## The three that outlive this task

**`seed.mjs` + `measure.mjs`** are the answer to hazard H-a, and they are reusable by anyone who has
to measure a network-backed surface: the board is stubbed at `fetch`, before the module graph runs,
so `leaderboardConfigured` stays true and every code path is the real one. Whoever migrates
`.as-edge-*` will want them, because the board's rows are 143 of its call sites.

**`states.mjs`** is the printed blind spot, driven. It is written against the leaderboard, but the
shape — dispatch a real pointer through CDP, read the computed value, capture, assert — carries.

**`pixels.mjs`** decodes an 8-bit truecolour PNG with `node:zlib` and nothing else. It exists because
`scripts/pixel-diff.mjs` decodes **in the browser**, which is right for whole-image comparison and
wrong for sampling one pixel — and because a translucent colour has no value until something is
behind it.

## Two things this harness asserts rather than hopes

Both are the same lesson in two costumes: *a run that measured a different screen looks exactly like
a run that measured this one.*

- **the board must have rows** — if the `fetch` stub did not take, the list renders the "unavailable"
  line and every number below it belongs to a different screen;
- **the ranked cockpit must have its play button** — if the seeded profile did not survive
  `migrateProfile`, `rankedUnlocked()` is false and the whole cockpit column is a different screen.

Both throw instead of writing a file. Both were earned; see M8-F02 in `measurements/M8.md`.
