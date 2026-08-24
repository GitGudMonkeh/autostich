# Handoff — M8 · The leaderboard · `#menu-rework`

**Done.** The approved redesign is built and both entries are on the vocabulary, in four commits on
`task/menu-m8-leaderboard` (base `0b534168`): the contract's two — structure · vocabulary — plus one
correction the measurement forced and the record. Four gates green, `typo-tokens.test.js` unmodified,
`@theme` byte-identical (28 473 bytes, proven), no shipped token's value changed. Full record and
every number: `measurements/M8.md`.

**Did the vocabulary hold?** Mostly. **24 declarations plus three inline fills** read a step now;
value-identical for the glass, all radii, two of three insets and the three inline surfaces
(`--sf-ground`, `--sf-base`, `--sf-raised` were those literals character for character). **Six gaps
counted, none coined** — M8-G1 the countdown's bright edge (the ladder is three rungs and all dark),
G2 the row ground `rgba(15,15,21,.72)` at four sites, G3 the white haze in five alphas (M3-G2's
family, third sighting), G4 the pill radius (a shape, not a step), G5 `#26262e` at 4/4/6 from
`--ed-quiet` and phone-visible, G6 `py-[1px]` — MENU-51 one rung smaller. All six neutral translucent
edges are on `--ed-quiet`: **the edge ratchet is 0 in all four M8 units**, and that zero is achieved.

**Every surface but `leaderboard` at zero deltas: YES**, printed in `evidence/M8/delta.txt` — 160
cells, 0 unreached, 25 129 matched nodes, fifteen of sixteen surfaces untouched. **The row count is
20 in both halves**, in all ten machine-half cells and all 60 harness cells: 20 by construction on my
side (the board is stubbed at `fetch` before the module graph runs) and 20 by the cap on the
survey's. **The 20 unmatched nodes are not the network** — they are the close button, whose sibling
index moved from 1 to 3 when the eyebrow and subline went in. **The phone is unmoved, measured at
390 px: zero geometry and zero style differences.**

**Tripwires.** Neither tripped. No panel of my own; no new value at a call site — the six that had no
step are ratcheted with counter-checks, not invented.

**Guards.** Measured which broke rather than assumed: **exactly one** structural failure in 143
files, and it was a spelling — `.lb-head > button { grid-column: 3 }`. Rewritten to the invariant
(§2: close is the last element, nothing right of it): it now counts the head grid's tracks, demands
close sit in the last, demands nothing sit in or beyond it, and demands both screens share **one**
rule. `panel-tokens` was extended, not broken. **Twelve sabotages put back, twelve fell** — including
the two nobody writes: an exemption renamed into thin air, and a ratchet cap raised by hand.

**Findings.** F01 **the survey WRITES to the live board** — `publishRun` is gated by `VITE_PREVIEW`
alone, and each full run posts up to ten "SURVEY" rows; the remedy is one seeded empty username ·
F02 a seeded profile dies in `migrateProfile` v6→v7 unless `schemaVersion` is stamped (M7-F02's class,
one layer down) · F03 port 5189 was held by a preview of the **main checkout**, caught only because
the harness refuses instead of reusing · F04 „an allen drei Größen gleich" holds for 300 and 22, not
for the card and the panel · F05 the active nav row had **two** glows; I removed both, measured
`#up-ruhe`, put the inner one back · F06 the glyph census is 25–27, not 22 · F07–F12 in the record.

**Owner: one stop, four questions, all answered „passt alles" (2026-08-24)** — the five drawn signs,
the empty Challenger tab, both sublines in both languages, and the seed box keeping its frame inside
a tinted panel. **Two planner questions stand:** M3-G1 has reached its third independent sighting, so
§2c's threshold rule and the freeze ruling now point in opposite directions; and `--sf-deck` tints
9/5 % where the canon says 5/1 %, now on a third screen (M7-F09).

**M9 inherits** both entries fully migrated (edge ratchet 0/0/0/0 — achieved; ink 1/3/0/10), a head
canon that is now **one** rule set for two screens, and three harnesses that outlive this task:
`evidence/M8/seed.mjs` + `measure.mjs` hold a network-backed surface still at the `fetch` layer,
`states.mjs` drives the twelve states the gate prints its blindness to, and `pixels.mjs` reads a
rendered colour in Node so a translucent value can be measured rather than argued.

**No merge, no push, no PR; worktree left in place. No visual result here is approved by me — the
captures in `evidence/M8/owner/` are the owner's to look at, and one of them was opened and confirmed
to be an image.**
