# UI and Design Engineering Conventions

Current, binding conventions for changing how Autostich looks and speaks: the decision rules for the
desktop pass, the icon policy, and the language/localization rules for player-visible text.

This document states **rules**. It contains no measurements, no dated implementation state, and no
migration status. Where you want to know *why* a rule exists, follow the provenance pointers at the
end into `docs/decisions/`.

| You want… | Read |
| --- | --- |
| Branching, worktrees, promotion | `docs/engineering/git-workflow.md` |
| Guards, ratchets, gates, counter-checks | `docs/engineering/testing.md` |
| Code layout, render paths, bundling, media | `docs/engineering/architecture.md` |
| Full localization mechanics and migration state | `docs/localization/i18n.md` |
| Why a past decision was taken | `docs/decisions/` |

---

## 1. The eleven decision rules

These eleven rules govern the screen-by-screen rework toward the quiet desktop tone. They were
proven on the workshop and the level-up cards and explicitly approved. **Anyone reworking the next
screen works through them — they replace guessing.**

The rules are stated here in English as current guidance. The original German wording is preserved
verbatim in the decision log; see §5.

### How a change is made

1. **A modifier, not a deletion.** A loud variant is not removed; it gets a switch —
   `as-ring-quiet` (a class), `phaseCard(…, { quiet })` (a parameter). One variant with a switch
   beats two variants that drift apart. Screens not yet reworked keep the loud variant until they
   are explicitly brought along — and then it is one word there, not a second framework.

2. **Change the EXISTING rule; never stand a second one next to it.** When a parallel session turned
   the workshop tabs into edge buttons, that exact rule was rewritten. Two rule sets for the same
   three buttons would be the duplicate maintenance this project warns about everywhere else.

3. **Inline beats stylesheet.** If an element sets its style inline (cards, tabs, sticky headers), a
   PARAMETER at the source is better than `!important` on three properties. Use `!important` only
   where the seam is otherwise unreachable — and then with the reason in the comment.

4. **The bracket technique for new structure.** A new wrapper is `display: contents` below 1280 px,
   so the mobile variant stays identical in DOM and in pixels (`cz-fxfoot`, `gd-cols`, `gl-body`,
   `lv-rig`).

### What always stays untouched

5. **Project-wide signals.** The coloured left edge of the edge cards, the animated gold frame
   `as-legendary`, the deck line in the header. Damping one of them in a single screen would drop
   that screen out of the system. Notice it, name it, offer the system-wide step — do not do it
   unasked.

6. **Meaning survives the quieting.** The halo of the offer cards could go BECAUSE the same
   information is carried by the tier/rarity badge and the colour edge. If the statement falls along
   with the look, it is not quieting — it is data loss.

7. **The mobile variant does not move** — and that is MEASURED, not asserted: element geometry at
   390 px before and after. The loud variant stays on mobile deliberately: small screen, thumb
   targets, the card needs to lift off the board.

### How a decision is made

8. **One signal per element.** Underline OR fill, edge OR frame — never both for the same state. The
   workshop tab therefore has only the rule, the selected list row only the fill.

9. **Exceptions need a reason, not a taste.** "Reroll" keeps its frame because it is the only action
   in the bar that COSTS something (a token). If the reason is in the comment, the exception
   survives the next cleanup pass.

10. **Do not invent what does not exist.** A mockup occasionally shows buttons or icons the game does
    not have. Those are NOT built on the side — and an icon that is not already in the system is
    never added without asking. See §2.

### Safeguarding

11. **Guards that COMPUTE rather than compare spellings**, plus the counter-check: sabotage each seam
    individually and prove that the guard falls. A guard that is merely green is not evidence. The
    full doctrine, including the known trap classes, is in `docs/engineering/testing.md`.

### Side rule, learned from a mistake

When investigating a position report, measure BOTH axes. The level-up jump was vertical; the first
measurement had checked only `left`/`width` and reported "stable".

---

## 2. Icons and glyphs

**Never introduce an icon or glyph that is not already part of the established system without asking
first.** This is rule 10 applied to a specific recurring temptation: mockups and redesign proposals
routinely show glyphs the game does not own.

The same applies to documentation in this repository — the engineering docs use plain text markers,
not decorative glyphs.

---

## 2b. Typography

Two layers, and they must not merge.

| Layer | Carries | Written as |
| --- | --- | --- |
| **Role** `.ty-*` | family, weight, letter-spacing, numeric variant | a class: `ty-num`, `ty-title` |
| **Size token** `--text-*` | size, and the line-height paired with it | a class: `text-body`, `text-meta` |

`.ty-num text-figure` is a number in Geist Mono at the figure size. Each half owns what it can own.

### The seven roles

Ratio 1.2, body anchored at 13 px. Desktop values; the phone keeps its own (see *Why the `-N`
variants exist*).

| Token | Size | For |
| --- | --- | --- |
| `text-micro` | 9 | rarity ticks, the smallest badge, footnotes |
| `text-meta` | 11 | labels, eyebrows, counters, chips, version stamp, seeds |
| `text-body` | 13 | running text: descriptions, list rows, button text |
| `text-body-lg` | 15.5 | emphasised body, primary list rows, CTA, card names |
| `text-title` | 18.5 | panel and section titles |
| `text-head` | 22.5 | screen headings |
| `text-figure` | 27 | the large readouts: score, credits, KPI values |

Above the ladder and deliberately outside it: `text-display-1/-2/-3` — announcement and hero sizes.

### The rule

> **A menu picks a role, or changes a role for everyone. A menu does not introduce a size.**

That single sentence is what keeps the system. Without it the next pass re-creates the 39 values this
one collapsed.

**The escape hatch, and its price.** Where a screen genuinely needs a size no role provides, it
proposes a **new role** — reviewed once, then available everywhere. Not a number at the call site.

**Where a size is changed:** one edit, in the `@theme` block of `src/index.css`. Every desktop call
site follows, because the provisional variants resolve through the role token. Changing a size
anywhere else is a bug.

### What is exempt, permanently

These are not migration debt — a reading scale is the wrong instrument for them, and they will still
be outside the roles in a year.

- **Fit-to-box text** — the `clamp(… cqw …)` rules and the `--gs` family. Sized against a container,
  not against reading distance.
- **Game-piece text** — card marks and board counters in `CardGrid.jsx` and `Battlefield.jsx`. Sized
  against artwork.
- **Runtime sizes** — inline `fontSize` computed from game state.
- **The wordmark** — reads `--wm-size`.

Do not "fix" any of these into ladder steps.

### Why the `-N` variants exist

You will see `text-meta-1`, `text-body-5` and so on at existing call sites. They are the **phone's**
value carriers, and on desktop each one resolves through its role token.

The reason is arithmetic, not indecision: a class renders one size. `text-meta-1` (10 px) and
`text-meta-3` (11 px) differ on the phone too, so collapsing both onto `text-meta` would move the
phone — which the typography workstream was explicitly scoped not to do. A later mobile strand
deletes the desktop override and the variants together.

**New code writes the role name.** Never a `-N` variant, never a number.

### Weights

Three rungs: **400 · 500 · 600**. `font-bold` and `font-extrabold` both resolve to 600 through
`@theme`.

Two exceptions, both from the font rather than from taste: the glossary's serif quote stays at 700
because **Georgia is not a variable face** and has nothing between 400 and 700, and the large
in-game announcement stays at 800 because 600 reads thin at 40–100 px.

Anything else at 700 or above is a defect. `test/typo-tokens.test.js` guards the layer split; the
weight ladder is enforced by review.

---

## 3. Language layers

Three layers, one rule each.

| Layer | Language |
| --- | --- |
| Engineering material and new code comments | **English** |
| Player-visible text | **German and English**, through the localization catalogs |
| Existing historical records and existing German comments | **Preserved as written** |

Code identifiers are English and always were.

**Mixed files are expected.** A source file may legitimately hold new English comments next to
existing German ones. That is not a defect to clean up. A sweep rewriting existing German comments
would produce a large diff across files guarded by source-text ratchet tests, for no functional
gain — see `docs/engineering/testing.md`.

---

## 4. Localization rules for player-visible text

`docs/localization/i18n.md` is canonical for the full mechanics and the current migration state.
This section states the rules that must hold for every change; it does not restate the catalog.

### The base rule

Every new player-visible string belongs in **both** `src/i18n/de.js` and `src/i18n/en.js`. No new
inline string in JSX. This includes `title`, `aria-label`, `placeholder`, and `alt`.

### Keys, numbers, plurals

- Key shape: `<area>.<block>.<thing>`.
- Runtime values are `{placeholders}`.
- Numbers go through `fmtNum` / `fmtPct` — never `toLocaleString`.
- Plurals use `…_one` / `…_other` with `count`.
- Tuning numbers are interpolated from the constants, never typed into the catalog.

### Terminology

The DE↔EN terminology table in `docs/localization/uebersetzerpaket_pixi_2026-08-15.md` §3 is
**frozen**: one German term maps to exactly one English term. Do not invent synonyms and do not
change the table without asking. The reasoning per term is in
`docs/localization/genre-terminologie.md`; tone and phrasing guidance is in
`docs/text-style-guide.md`.

### Registers translate structure, not output

When a data register is localized, the German register stays the source, `de.js` *generates* its
entries from it, `en.js` translates, and resolution happens at display time through
`src/i18n/labels.js`. Never retype generated text. A register must not `import { t }` — that is a
cycle through `de.js`.

Carry the **structure** across, not the rendered output: if the German side generates many strings
from a few templates plus indexed constants, the English side mirrors both saving mechanisms, or the
English side acquires many maintenance points where the German side has few.

Numbers inside translated register text use the same constant expressions as the German side, never
transcribed literals.

### Generated artifacts

`docs/localization/*.csv` is **generated** by `npm run loc:export` and is never edited by hand. Run
the export whenever player-visible text changes; the generated exports are validated by tests.

### What the localization guard can and cannot see

`test/i18n-guards.test.js` enforces key and placeholder parity, number formatting, terminology, and a
ratchet: files listed as migrated must contain no hard-wired display text. When you migrate a file,
add it to that list.

The guard has **known blind spots** — display text collected in a constant table, and any candidate
containing brackets or semicolons. Do not treat a green localization suite as proof that a screen is
fully localized. The blind spots are described in `docs/engineering/testing.md`.

---

## 5. Provenance

These rules were extracted from the project's historical engineering records. The original German
text, together with the measurements and the rejected alternatives that produced each rule, remains
unchanged in:

- `docs/decisions/engineering-log-2026-08.md` — *"Desktop-Umbau: die ENTSCHEIDUNGSREGELN"* for the
  eleven rules, and *"Sprache / i18n (#sprache)"* for the localization rules.

Those records are **historical context, not standing instruction**. Where they and this document
disagree about what the rule is, this document wins; where you need to know why the rule exists, the
log wins. Start at `docs/decisions/README.md`.
