# Planning report — text-voice-pass (`#text-voice`)

Tier **B**. Branch `task/text-voice-pass`, base `origin/dev` @ `47020403`.

The decision block was settled before implementation; it is recorded below for the record, not
for an answer. What follows it is mostly **rejected** options, which is the part of a report worth
keeping.

---

## Decision block — settled

1. **Does the dash rule apply to English at the same strength?** — *Yes, same strength.*
   The English strings are not English prose that grew a habit; they are a one-to-one mirror of
   the German, carrying the same 219 appended clauses in the same places. The em-dash is regular
   punctuation in English, but a translated tic is still a tic.
2. **`Skill-Slot` — a real §1 contradiction.** — *"Slot" stays for skills; §1a gains an exception.*
   §1a forbade "Slot" and pointed at "Position"; §1e reserves "Position" for the fixed card
   position 1–40. "Skill-Position" would have been exactly the double-loading §1e exists to
   prevent. Rejected alternative: "Skill-Platz" — cleaner German, but it renames an established
   term, and renaming is a non-goal.
3. **One task or two, given the scope correction?** — *One, with batch 7 in its own commit.*

---

## The finding that changed the shape of the work

**The order's scope was wrong, and the CSV is why.** It scoped the pass to `src/i18n/de.js` and
`en.js`, reading the inventory's `category` column, which reports `i18n` for all 221 rows. That
column records the **export path**, not the source file: `de.js` imports from `src/game/*` and
passes register text through.

Located by matching every em-dash string literally against the tree, the German side spans eleven
places — including four data registers the order states contain "keinen einzigen":

| Area | German | n | English | n |
| --- | --- | --- | --- | --- |
| UI catalogue | `src/i18n/de.js` | 100 | `src/i18n/en.js` | 100 |
| Guides | `src/ui/guides.js` | 42 | `enGuides.js` | 42 |
| Glossary | **`src/game/glossary.js`** | 35 | `enGlossary.js` | 36 |
| Skills | **`src/game/skills.js`** | 11 | `enSkills.js` | 10 |
| Cosmetics | **`src/game/themes.js`** | 9 | `enCosmetics.js` | 9 |
| Families | **`src/game/families.js`** | 4 | `enFamilies.js` | 4 |
| Singles | `engine.js`, `weekMods.js`, `perks.js`, `App.jsx`, `modalStyle.jsx` | 1 each | `enMeta.js`, `enPerks.js` | 1–2 |
| Composed at runtime | template literals | 18 | same | 19 |

German is the source locale and lives with the registers; English is fully extracted and mirrors
it. That symmetry is what made the batching obvious, and it is enforced by the key-parity guard.

---

## Rejected options

**A global search-and-replace of `" — "` with one fixed character.**
Rejected. It would have produced a uniform substitute tic in place of the current one — the same
failure with different punctuation. The corpus needed six different resolutions (full stop, colon,
semicolon, comma, parentheses, rebuild), and which one applies is a property of the sentence.

**Measuring the tripwire as a multiset of hyphenated words.**
Written first, then rejected after it ran. On batch 1 it reported seven hits, six of them false:
`Battlefield-Bild` → `Spielfeld-Bild` keeps its hyphen and is a §3 fix, not compound damage. The
count of word-internal hyphens **per key** reports exactly the one real case. This matters beyond
this pass: a word-list comparison cannot distinguish a deliberate word swap from a broken compound,
and a tripwire that cries wolf six times out of seven gets switched off.

**Making the compound tripwire absolute.**
Rejected as impossible, not as undesirable. §3 bans anglicisms that are themselves hyphenated —
`tilt-reaktiv`, `self-feeding` — so "enforce §3" and "never touch a hyphen" cannot both hold. The
tripwire was kept absolute and the **exception booked** instead: `text-voice-keep.txt` carries one
line per exception with a reason, and the check refuses anything not written there. Nothing passes
silently, §3 stays enforceable.

**Marking a kept dash in the source (`/* keep-dash */`).**
Rejected. It reads as new text to the source-text ratchets, and it does not travel when a key moves
between files. A ledger beside the inventory does both.

**Writing the check as a vitest case.**
Rejected. The criterion is a diff against a git revision. Making `npm test` shell out to git would
make the suite depend on repository state rather than on the working tree.

**Splitting batches 4 and 5 into separate commits, as originally planned.**
Rejected during execution. The two batches share the same two files; splitting them would have
split a file, not a surface, and produced a commit that neither builds a coherent story nor rolls
back independently. Batch 7 kept its own commit, which was the point of the split.

**Widening the pass to the 47 arrow-notation strings.**
Rejected. §3 forbids "Pfeil-/Balancing-Notation", but its own example
(`Wechsel ab 3 → 2 Karten`) is the compressed balancing shorthand, not the directional arrow on a
button (`Fortfahren →`). Only the 3 that shared a line with a dash were touched. The remaining 47
are a separate question, recorded below.

**Renaming "Global-Board" under §3.**
Rejected. §3 lists "Board" as an anglicism to avoid, but a whole key namespace (`board.*`) is built
on the name. That is the renaming the non-goals rule out.

**Germanising the effect jargon in `fx.glitch.desc`.**
Rejected. "Chroma-Split", "Tear-Slices", "Scanlines", "Farb-Bars" have no established German
equivalent and §3 does not name them. "Bursts" in the same chain is named, but replacing only that
one would leave a half-germanised list, which reads worse than a consistently English one. The
whole chain was left, deliberately.

---

## Per-batch notes (Definition of Done)

| # | Batch | Keys | §1 / §3 applied | Deliberately not |
| --- | --- | --- | --- | --- |
| 1 | Cosmetics + families | 30 | §1a Siegesserie → Serie (2×); §3 Battlefield → Spielfeld, Hues → Töne, arrow notation in `fx.supernova.short` | effect jargon in `fx.glitch.desc` |
| 2 | Glossary | 45 | §1a Fraktion → Archetyp (de), faction → archetype (en) | `glossary.raritaet.text` tier names — see findings |
| 3 | Guides | 44 | §3 Payoff → Ertrag (de); §1a Siegesserie → Serie, Runde → Durchlauf | `payoff` in the English column, which is the right word there |
| 4+5 | UI catalogue | 85 | §1a Run → Lauf in `stats.empty` | "Global-Board" keeps its name |
| 6+7 | Skills, literal and interpolated | 39 | — | — |

`*.match` keys were excluded from the §1 pass categorically — see H10.

---

## Findings for elsewhere

**The terminology guard is blind to a violation both languages share.**
Fixing German `Runde` → `Durchlauf` turned `i18n-guards.test.js` red, because the guard requires
`Durchlauf` to map to `cycle` and the English still said `round`. It had been silent until then
because **both halves were consistently wrong**. A mapping check finds drift *between* languages,
never error *within* one. Any §1 sweep must therefore be driven from the rules, not from the guard.

**§1a and `TIER_META` disagree on the rarity names.**
`glossary.raritaet.text` renders "Normal · Selten · Sehr selten · **Episch**"; §1a of the style
guide names them "… · **Rar**". §1a itself says the names come from `TIER_META`, so the code is the
source and the guide is what drifted. Not touched here — renaming is a non-goal — but the guide
line should be corrected.

**47 player strings carry arrow notation without a dash.** Listed above under rejected options.
Worth its own small pass if §3 is to hold literally, or a §3 clarification distinguishing balancing
shorthand from a directional affordance.

**The inventory filename is a fixed literal.**
`scripts/export-strings.mjs:153` hard-codes `strings_de_pixi_2026-08-15.csv`. The file is
regenerated in place, so the date in the name is not the date of the contents — it read as five
months stale while being current. Worth either dropping the date or stamping it.

---

## Evidence

| Claim | How | Value |
| --- | --- | --- |
| Em-dash removed | `node scripts/text-voice-check.mjs` | measured — 221 → 0 (de), 222 → 0 (en) of 2797 |
| Compounds untouched | same, assertion 2 | measured — zero unbooked count changes |
| No number drift | same, assertion 3 | measured — zero |
| Text length | CSV diff against `origin/dev` | measured — **−367 characters** net; 405 shorter, 26 longer, largest +14 |
| Layout, 1280×720 | real build, CDP | measured — 0 overflowing elements, no horizontal scroll |
| Layout, 390×844 | real build, CDP | measured — 0 overflowing elements, no horizontal scroll |
| Worst-case label | `fx.supernova.short` selected at 390 px | measured — 316 px wide, one line, no overflow |
| Gates | `npm test`, lint, build, `gen:db`, `loc:export` | measured — all green |
