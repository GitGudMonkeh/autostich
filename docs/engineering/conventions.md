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

## 2c. Panels — surface, edge, elevation, radius, inset

Five axes, nineteen steps, defined in the `@theme` block of `src/index.css`. This is §2b applied to
surfaces: the same shape, the same rule with one noun changed, the same escape hatch and its price.

Two layers, and they must not merge.

| Layer | Carries | Written as |
| --- | --- | --- |
| **Step** `--sf-*` `--ed-*` `--el-*` `--rd-*` `--in-*` | one value on one axis | a custom property: `var(--sf-base)` |
| **Role** `.as-panel`, `.as-shell`, … | all five at once, for one kind of box | a class: `as-panel-sunken` |

A role is four steps that belong together. Pick the role when a box *is* one of these things; pick a
step when you are dressing something that is not.

### Why custom properties and not utility classes

Three consumers have to reach the same value: a Tailwind utility, a stylesheet rule, and an **inline
style** emitted from `src/ui/modalStyle.jsx`. A class cannot reach the third, and half the menu
surfaces in this tree are set inline.

The indirection also removes the reason `!important` kept appearing. An inline **literal** beats every
stylesheet rule; an inline `var(--sf-head)` does not, because a rule can redefine `--sf-head` **on the
element** and the inline declaration picks up the new value with the cascade intact. Measured, three
cases, `#menu-rework` planning report §2.1.

### The steps

| Axis | Token | Value | For |
| --- | --- | --- | --- |
| **Surface** | `--sf-sunken` | `#141320` | an **inset panel** inside another surface: readouts, list rows, tiles |
| | `--sf-base` | `#17171c` | the neutral panel fill |
| | `--sf-head` | `#1b1a24` | a sticky head |
| | `--sf-raised` | `#1b1a24 → #141019` | the card or overlay shell above a panel |
| **Edge** | `--ed-quiet` | `#2a2a34` | a divider inside a panel |
| | `--ed-base` | `#2c2a3a` | the standard frame |
| | `--ed-strong` | `#302d40` | the crisp frame that carries the framed look |
| | `--ed-deck` | `var(--deck-border)` | deck-tinted, **neutral structure panels only** |
| **Elevation** | `--el-flat` | `none` | on the board — and the desktop's `#ruhe` choice |
| | `--el-rest` | `0 0 14px` deck 22 % | a panel at rest |
| | `--el-float` | `0 14px 44px rgba(0,0,0,.42)` | a card off the board |
| | `--el-modal` | `0 18px 48px rgba(0,0,0,.5)` | an overlay over it all |
| | `--el-glow-blur` · `--el-glow-spread` | `16px` · `-8px` | **the primary CTA, and nothing else.** Two scalars, not one composite — see below |
| **Radius** | `--rd-sm` | `6px` | tiles, buttons, rows, chips |
| | `--rd-md` | `0.5rem` | a control that is not a tile |
| | `--rd-lg` | `14px` | a panel |
| **Inset** | `--in-tight` | `11px` | a row or a chip |
| | `--in-snug` | `13px` | an inner box |
| | `--in-base` | `18px` | a panel |

The values are **derived by counting call sites**, not chosen. `--sf-base` is `#17171c` because that
is what all 30 `.as-panel` sites carry *and* the dark half of `--deck-border`'s colour mix — the tree
had written its panel ground down twice, in two unrelated places, with the same value.

`--sf-head` is **defined as** `--sf-raised`'s opening stop. That is what makes the head/card seam
invisible, and it is now true by construction rather than by two numbers someone keeps in step.

**Mixed units are deliberate**, exactly as in §2b: `--rd-md` replaces Tailwind's `rounded-lg`, which
emits `0.5rem`. Writing it as `8px` would compute identically today and differently for a reader who
has changed their browser's base size. Value-preserving means preserving the value, not its current
evaluation.

### Outside the ladder, deliberately

The same distinction §2b draws between its seven roles and `text-display-*`. These are not steps and
not choices: composites built from steps, or values a ladder cannot rank.

| Token | What it is |
| --- | --- |
| `--sf-glass` · `--sf-head-fade` | the **desktop translucencies**: what `--sf-base` and `--sf-head` look like above 1280 px. Outside the ladder because a translucency depends on what is behind it. Neither is invented — 13 rules already carried the glass gradient verbatim and 7 carried the fade |
| `--sf-deck` · `--ed-deck-panel` | a panel tinted with the active deck colour, 9/5 % over the glass with a 26 % border. The `.as-hub-tile` recipe at a lower strength. **Rows inside a tinted panel stay neutral** |
| `--sf-scrim` · `--sf-scrim-desk` | the full-screen overlay wash, phone and desktop |
| `--sf-ground` | what a panel *sits on*: the application's own background |
| `--sf-deep` | internal — `--sf-raised`'s closing stop. No call site names it |
| `--sf-cone-*` | the light cone at the head of a card, as scalars — see *A token only sees what is present where it is declared* for why it is not one composite |
| `--ed-accent-a` · `--ed-accent-a-quiet` | the two accent-edge opacities |
| `--el-halo-blur` · `--el-halo-a` | the coloured halo of a **loud** phase card — the value `#ruhe` removes |
| `--rd-shell` | the overlay shell's outer corner. Not chosen, **matched**: the hairline clips against it |
| `--btn-pad-y` · `--btn-pad-x` | a button pads against its **label**, not against a panel edge |
| `--ctl-*` | switches, segments, dropdowns, sliders. A control is not a panel |
| `--ac-*` | the six phase identity colours. Not a ladder — each says which phase you are in |

### The rule

> **A menu picks a token, or changes a token for everyone. A menu does not introduce a value.**

**The escape hatch, and its price.** Where a screen genuinely needs a surface no token provides, it
proposes a **new token** — reviewed once by the planner, then available everywhere. Never a value at
the call site. A worker that builds its own panel stops and reports; extensions go through the
planner, not around the pilot.

**Where a value is changed:** one edit, in the `@theme` block of `src/index.css`. Changing it anywhere
else is a bug.

**A screen may re-point a step on its own root**, inside the desktop block — but only **to another
named token**, never to a fresh literal:

```css
.op-head { --sf-head: var(--sf-head-fade); background: var(--sf-head); }
```

That is the sanctioned form, and it is how the desktop's translucent variants reach a screen.

`test/panel-tokens.test.js` guards all of it, in migrated files only. Its allowlist grows by one entry
per worker, so it tightens as the round proceeds and never blocks work that has not happened yet.

### A token only sees what is present where it is *declared*

**The single most expensive thing to learn twice.** A custom property that references another custom
property is substituted **on the element that declares it**, and the resolved string then inherits.

```css
:root { --cone: rgba(var(--ac-rgb, 155,130,240), .14); }   /* --ac-rgb resolved HERE, at :root */
```

An element further down that sets `--ac-rgb` on itself arrives far too late: `:root` already baked in
the fallback. This cost `#menu-rework` M1 a full capture run — 120 nodes went violet.

Two shapes that **do** work:

- redefine a **flat** property on the element (`.op-head { --sf-head: … }`) — this is the mechanism the
  whole vocabulary rests on;
- declare the composite **on a class the element carries**, so both live on the same element.

Anything parameterised at runtime — an accent colour from game data — therefore **decomposes**: every
length and every alpha is a token, and only the colour is assembled at the call site.

### The geometry hook — `--ui-scale`

Every **length** in every token is defined through `calc(N * var(--ui-scale, 1))`, so a later
UI-scaling feature is one variable instead of a sweep over nineteen values.

**The rule is about values, not families.** A length scales wherever it sits, including the gradient
axes of the light cone. A colour, an opacity or a percentage does not — a percentage is already
relative.

**One deliberate exception: `--text-*` stays out.** Those are lengths, and typography is frozen with
its own ladder and its own workstream. Without this sentence the value-shaped rule above would sweep
it in.

`--ui-scale` is a **reserved hook, not a control**. No screen and no worker sets it. A per-screen
`--ui-scale` is the tripwire in a new costume.

### `#ruhe`, stated beside `--el-glow`

> **Only the primary CTA glows.**

`--el-glow-*` exists so that rule stays expressible, and a step named for a rule is harder to spread
than a shadow value copied. A desktop panel at rest is `--el-flat`, which is exactly what
`as-ring-quiet` already sets — so the rule is a step you *pick*, not an absence you have to remember.

**It is two scalars rather than one composite**, and that is the substitution rule above, not
untidiness: the glow's *colour* is `--c`, which the call site sets on the button itself, because the
colour is the signal — it says which CTA this is. A composite declared at `:root` would resolve
`var(--c)` there and freeze the grey fallback. It did exactly that on a victory-screen button, in the
same task that wrote the rule down, until the zero-delta gate said so. The shape lives in the
vocabulary; the colour belongs to the call site.

`--el-halo-*` is the other half of the same decision: the loud phase card's coloured halo, kept so the
phone branch stays value-preserving, and it is what `quiet` takes away. Nothing new takes it.

### The role classes

| Class | Composition | For |
| --- | --- | --- |
| `.as-panel` | `--sf-base` + the animated deck frame | the neutral content panel |
| `.as-panel-sunken` | `--sf-sunken` `--ed-quiet` `--rd-sm` `--el-flat` | **an inset panel** — a readout, a list row, a tile sunk into the surface it sits on, wherever that surface is |
| `.as-shell` | `--sf-raised` `--ed-base` `--rd-shell` `--el-modal` | the overlay card itself |
| `.as-head` | `--sf-head` + bottom `--ed-quiet` | sticky heads |
| `.as-ring` | `--el-rest`; `.as-ring-quiet` stills it to `--el-flat` | the running deck ring |
| `.as-edge-*` | "Kante statt Fläche" — one colour signal as a left edge; `--el-glow` on the strong one | buttons and choice cards |

**`.as-shell`, not `.as-card`.** `.as-card` was already taken by the **game card** in
`src/ui/Card.jsx` and by a CRT rule that gives it a neon glow. A bare class selector cannot avoid
either.

### What the vocabulary does not claim

Both are real gaps, named rather than hidden, and both belong to the planner:

- **Text colour.** Seven ink values remain literal on the pilot screen alone. The five axes are
  surface, edge, elevation, radius and inset; the tripwire names background, border, radius and
  shadow. Ink is the nearest extension and has not been taken.
- **Padding that is not a box inset.** Three steps cannot cover every padding on a screen and were
  never meant to. A control pads against its **label** (which is why `--btn-pad-*` sits outside the
  ladder), screen margins are layout, heading spacing belongs to the type system.

### What is permanently exempt

- **`PHASE_ACCENTS` in `modalStyle.jsx`** keeps its six colours as literal strings. `.c` is handed to
  `LevelupWings.jsx`, which builds an 8-digit hex by concatenation (`${accent}4d`) — `var(--ac-red)4d`
  is not a colour — and two more screens build the same shape from game data at runtime. The colours
  are mirrored as `--ac-*` for the CSS side.
- **Everything below 1280 px.** The phone keeps its own values *and its own Tailwind padding
  utilities*, exactly as §2b's `-N` size variants do. A token that a phone-visible call site reads
  therefore carries the **phone's** value, and the desktop block re-points it. Where the tree has two
  values for one role below 1280, the vocabulary keeps both until a mobile strand collapses them —
  that is what `--ctl-off` and `--ctl-off-alt` are.
- **Meaning-coded borders** — rarity, faction, ice, state. They encode information, not depth.
- **`--deck-border`** keeps its name; `--ed-deck` is its vocabulary alias.

### A token you do not use does not ship

Tailwind 4 prunes `@theme` variables that nothing references. A step defined here but never written as
`var(--step)` in `index.html` or `src/**` is **absent from the built stylesheet** — correct (it is
dead-code elimination) and occasionally surprising. Writing `var(--in-base)` anywhere Tailwind scans
brings it back. Nothing else is needed.

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
