# Task Note — the slashed zero on `.ty-num` (Tier A)

**Status: CLOSED, 2026-08-23 — no change made. The font does not expose an unslashed zero.**
The measurement the note required was run; it came back negative. That is one of the two outcomes
this note allowed for, so the task is complete, not abandoned. **S0 is unblocked and may capture V1
immediately** — there is no pending change for the baseline to wait on.

**Written:** 2026-08-23. **Closed:** 2026-08-23, branch `task/typo-slashed-zero`.

---

## Result

**Geist Mono's zero is slashed, and nothing switches it off.** Swept in the real DOM against the
production font file, rendered and compared visually:

| Path tried | Range | Result |
| --- | --- | --- |
| `font-feature-settings`, feature **on** | `ss01`–`ss20`, `cv01`–`cv20`, `zero`, `salt`, `onum`, `lnum`, `pnum`, `tnum` | **no change** — 24 candidates rendered side by side, all identical |
| `font-feature-settings`, feature **off** | `zero`, `salt`, `calt`, `liga`, `ss01`, `ss02` | no change |
| `font-variation-settings` axes | `SLSH`, `ZERO`, `slnt`, `ital`, `opsz`, `wdth`, `GRAD`, `YTAS` | **no change.** The face exposes weight only (`100 900`), `variationSettings: normal` |
| Advance width | all of the above | **37.766 px throughout** — the metric question is moot |

Evidence: `evidence/slashed-zero/features-sweep.png`, `evidence/slashed-zero/variation-axes.png`.

**A method note worth keeping, because it nearly produced the wrong answer.** An intermediate probe
compared screenshot **PNG bytes** per candidate and reported 23 features as "changing" the zero.
Rendering those 23 side by side showed them to be pixel-identical: the byte differences were PNG
encoding noise. Two earlier probes had the opposite failure and reported false negatives — canvas2d
accepts `fontFeatureSettings` and may ignore it, and an SVG `foreignObject` rasterised as an image
cannot see the page's `@font-face` at all. **Only direct visual comparison of DOM-rendered glyphs
gave a stable answer**, and the two automated paths disagreed with each other and with the truth.
Anyone re-opening this question should render and look, not hash.

## What this leaves

The slashed zero stays. The two ways out are both outside this workstream:

- **Swap the mono face.** A new font is a new dependency and an owner decision (planning report §5
  non-goal 3). Not proposed here.
- **Accept it.** Which is the current state, and now a recorded decision rather than an open item.

The `#typo` log's open item is answered and can be marked resolved: it assumed the alternate existed
and only needed wiring. It does not exist.

---

## Original note follows, for the record

**Status:** ready. **Must land before S0 captures V1.**
**Tier:** A. One sentence for why, per `task-lifecycle.md` §2: this carries out a decision already
taken (`#typo` log, open items; planning report §6.6), touches one declaration, and makes no design
choice that outlives it.

**Branch:** `task/typo-slashed-zero`, off `feature/typo-system`. Merges up before S0 runs.

---

## What

Geist Mono renders its zero **slashed**. In the score HUD, where zeros are common and large, it
reads as noise. It is switchable centrally — one `font-feature-settings` declaration on `.ty-num` in
`src/index.css`, which every number in the game already carries.

Carried from the `#typo` pass (`docs/decisions/engineering-log-2026-08.md`): *"Geist Mono setzt die
Null geschlitzt; im Score-HUD fällt das auf, abschaltbar wäre es zentral über `font-feature-settings`
an `.ty-num`."*

## Why it is its own change, before the baseline

Not tidiness — evidence hygiene. Changed **between V1 and V2**, it puts a pixel difference on every
screen containing a digit, and the human reviewer at V3 has to filter that out of every single
comparison. V3 is the gate the whole typography workstream's central claim rests on; it gets one
variable, not two.

Committed **before** V1, the baseline already contains it and the typography comparison stays clean.

## The one thing that is unverified

**Which OpenType feature toggles it is not known**, and must not be guessed. The `.woff2` is
compressed, so the feature list cannot be read from the file. Candidates: `zero`, `ss01`–`ss03`,
`cv01`.

Resolve by measurement, not by documentation:

1. Render a `0` in Geist Mono in the browser.
2. Apply each candidate in turn via `font-feature-settings`.
3. Keep the one that removes the slash.
4. **Measure the advance width before and after.** In a monospace face it must be identical — if it
   is not, the change moves metrics and this note is wrong about being safe. Stop and report.

Ten minutes. If no candidate works, the font simply does not expose the alternate: record that and
close the note. That is a legitimate outcome, not a failure.

## Scope

- `src/index.css`, the `.ty-num` rule: add `font-feature-settings` with the verified tag.
- `.ty-num-sm` gets the same treatment — it is the same role one step quieter, and a project where
  the big numbers are unslashed and the small ones are not would be worse than either consistent
  state.

## Non-goals

- No other `font-feature-settings` anywhere. `tabular-nums` stays as it is.
- No change to Orbitron (card numbers, wordmark, floats) — different family, different role,
  explicitly outside the `#typo` system.
- No token work. This note is not part of S1.

## Acceptance

- [ ] Feature tag determined **by measurement**, and the measurement recorded in the commit message
- [ ] Advance width identical before and after, measured, not assumed
- [ ] `.ty-num` and `.ty-num-sm` both updated
- [ ] `npm test`, `npm run lint -- --max-warnings=0`, `npm run build` green, unpiped
- [ ] A before/after screenshot of one number-heavy panel, attached to the commit
- [ ] Merged into `feature/typo-system` **before** S0 begins its capture
