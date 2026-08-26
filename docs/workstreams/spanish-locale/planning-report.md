# Planning report — Spanish as a third language (`#es-locale`)

Tier B. Measured against `dev` @ `d9763883bb5e1a2d5433d33f4de1121bb9da0cf9`, 2026-08-26.

The binding scope statement is `task-contract.md`. Where the two disagree, the contract wins. The
value of this document is the **rejected** options and the measurements behind the chosen ones.

---

## Decision block — answered

Put to the owner before implementation, settled in one pass on 2026-08-26.

**1. When a Spanish key is missing, what does the player see?**
Today `SOURCE_LOCALE = "de"` is the only fallback (`src/i18n/index.js:101`), so a missing Spanish
string shows a Spanish player **German**, not English.
Recommended a chain `es -> en -> de`, each locale declaring its own, so a fourth language costs one
line. **Answered: yes.**

**2. Does Spanish appear in the language picker before the catalog is complete?**
The parity guard forbids an incomplete catalog outright, so registering `es` today turns the suite
red unless registration and visibility are separated. Recommended separating them via a `ready`
flag, with a new ratchet that fails the moment a non-ready catalog *is* complete, so the flag cannot
quietly become permanent. **Answered: visible only when complete.**

**3. What is the game called in Spanish?**
On 2026-08-18 the title joined the frozen terminology table (`Autostich -> Autotrick`), on the
grounds that the German title carries its own mechanism (`Stich`) visibly and English should too.
Spanish for a trick is *baza*. Recommended **`Autobaza`**, because it applies the rule already taken
rather than reopening it. Rejected: `Autotrick` for Spanish as well (one non-German mark everywhere,
but an English word a Spanish player reads as English) and `Autostich` unchanged (industry-normal,
but it contradicts the 18.08. decision). **Answered: `Autobaza`.**

---

## What the check found

### Cheaper than expected

**The fonts need no work, and this is measured rather than assumed.** The declared `unicode-range`
(`src/index.css:799`) only tells the browser when to fetch a file; what matters is which glyphs are
actually inside the subset. Parsed out of the `cmap` table of each shipped `.woff2`:

| File | Glyphs | Missing for Spanish |
| --- | ---: | --- |
| `Geist.woff2` | 225 | none |
| `GeistMono.woff2` | 225 | none |
| `Orbitron.woff2` | 183 | `« » º ª` |

Geist and Geist Mono carry every accented letter, `ñ`, `¿` and `¡`. Orbitron, which renders card
numbers, the wordmark and floating scores, carries them too and lacks only the guillemets and the
ordinal indicators. Consequence: one rule in the translator package (`“ ”` never `« »`, no
`1.º / 3.ª` ordinals), no font work, not one byte more shipped.

**Spanish plural fits the existing mechanism.** `resolveKey` picks `_one` / `_other` on
`count === 1` (`index.js:85`). Measured with ICU: `es` has exactly the categories `one` and `other`,
with the same boundary as German and English. H4 is not a gap. The Spanish trap is a different one
and belongs in the package rather than the code: **gender agreement with an interpolated word**
(`{n} bloqueado` versus `bloqueada`) is what this interpolation cannot express, and the translator
has to phrase around it.

**The number formats are settled by the locale ID, not by us.** Measured with ICU:

| | `de` | `en` | `es` | `es-419` |
| --- | --- | --- | --- | --- |
| `1234567.25` | `1.234.567,25` | `1,234,567.25` | `1.234.567,25` | `1,234,567.25` |
| percent | `7 %` | `7%` | `7 %` | `7%` |
| day/month | `24.12.` | `12/24` | `24/12` | `24/12` |

Neutral `es` groups and decimalises like German. Had the ID been `es-419`, both would have flipped
to the English form, so the already-taken decision "neutral `es`" also settles the number format.
The date is the one value that is neither, exactly as the order predicted.

**The freeze is clean.** The committed export is byte-identical to a fresh one, verified twice: at
`e6c31813` during the check and again at the base SHA above after a parallel session moved `dev`.

**The catalog is smaller than the file count suggests.** 2639 keys, 111 236 characters of German and
104 771 of English. English is **5.8 % shorter** than German, which matters for H2.

### More expensive than expected

**There are four locale switches, not three.** The fourth is not in `index.js`:

| Site | Today | `es` needs |
| --- | --- | --- |
| `SEP` (`index.js:120`) | `de . / ,` · `en , / .` | like German |
| `fmtPct` (`:138`) | `loc === "de" ? "7 %" : "7%"` | like German |
| `fmtDayMonth` (`:149`) | `de "24.12."` · `en "12/24"` | **neither**: `24/12` |
| `buildingText.js:24` | `getLocale() === SOURCE_LOCALE ? s.replace(".", ",") : s` | like German |

The fourth is the dangerous one. It asks "am I the source language", so Spanish falls silently into
the English branch and every Architect building factor would read `×1.10` instead of `×1,10`. A
guard exists (`test/arch-eff.test.js:55`) but covers `de` and `en` only, and building effect texts
are generated rather than catalog entries, so no parity guard sees them either. This site is the
argument for the table in *Approved architecture* A: the pattern has already failed once by being
in a place nobody thought to look.

**The CSV `limit` column is empty. All 2800 rows.** The single place the export ever set it
(`export-strings.mjs:90`, suit names, `limit = "6"`) is deduplicated away again, because those texts
also live in the catalog. The model package promises the translator that 290 rows carry a limit and
that `limit = 1` is a hard constraint on the formation badges. Today that promise is worth nothing,
and a translator who believes it delivers correct text that gets clipped, which surfaces in the
layout pass, the most expensive place to find it.

**The model document describes a world that no longer exists.** `uebersetzerpaket_pixi_2026-08-15.md`
still says "there is no loc system, all strings are inline", lists export categories that no longer
exist (`ui`, `item`, `tutorial`, `ability`, `achievement`, `store` versus today's `i18n`,
`building`, `system`) and describes plurals as hand-coded ternaries. §1, §3, §8 and §9 carry over
almost unchanged; §2, §4, §5.5, §6 and §7 must be re-derived. The Spanish package is a derivation,
not a copy with the words swapped.

**The guards are 681 lines and about ten assertions are welded to two catalogs**, including
`expect(LOCALE_IDS).toEqual(["de", "en"])` (`i18n-guards.test.js:496`).

---

## Rejected options

### On the formatters

*Rejected: add an `es` branch to each ternary.* Three branches in three places today, four tomorrow,
and the fourth site above proves the pattern has already failed by hiding.

*Rejected: `Intl.NumberFormat` and `toLocaleDateString`.* `index.js:141` already records the reason
(the browser language is not the game language), and ICU output shifts between Node and browser
versions, which would drift ratchets for reasons unrelated to the code.

### On registering `es`

*Rejected: register `es` only when the catalog arrives.* The seam is the point of this task, and
deferring it means changing every guard in the same commit that adds 2639 strings, which is the
review nobody can read.

*Rejected: seed `es` from `de` or `en`.* Spanish players would see another language, and the
"translation forgotten" guard would have to be switched off to allow it, which is exactly the
weakening the second tripwire forbids.

### On the CSV

*Rejected: a third column in the existing CSV.* `status` and `note` are per-target by definition; a
wide file needs `status_en` and `status_es`, breaks the schema assertion in `test/loc-csv.test.js:56`
anyway, and hands every translator every other language's column.

*Rejected: a filename carrying the freeze SHA.* It would rename the file at every freeze.

*Rejected: the SHA inside the CSV.* `test/loc-csv.test.js` compares the CSV against the catalog on
every run, so a per-commit value would make it red on every commit.

*Rejected: renaming the English CSV to a generic scheme now.* A 520 KB rename that buys nothing this
round; the ratchet, `i18n.md` and the model package all point at the current path.

### On the Spanish catalog

*Rejected: nine empty `es*` modules today.* The split is documented in the header of `es.js` and the
files are created when there is text for them. Nine empty modules are noise that reads as progress.

*Rejected: a single `es.js` forever.* English split for a reason (size, and each block has its own
consumers); Spanish is the same size and the same shape, and a reader who knows one should know the
other.

### On `SAME_OK`

*Rejected: one shared list across languages.* `Deck` is the same word in German and English and is
`mazo` in Spanish. A shared list would hide exactly the forgotten translation the guard exists to
catch.

---

## The one decision that is expensive to correct

**The frozen source state and the CSV that goes out.** Every technical choice above can be rewritten
in an afternoon. A translator who has worked for weeks against the wrong cut cannot be re-cut
cheaply. That is why the SHA is a named deliverable and not a footnote, and why *Approved
architecture* D spends four paragraphs on where it is allowed to live.

---

## Named successors

| Task | Trigger | Why not now |
| --- | --- | --- |
| `es-layout` (H2) | the translation returns | There is no Spanish text to measure. Tools exist: `TestViewportHarness`, `mobile-tile-design/tile-width-probe.mjs`, `mobile-tile-build/phone-capture.mjs`. First screens: the two language pickers, the HUD cells, the rarity and category chips, the score banners. |
| `profanity-es` (H5) | independent | Needs native judgement plus an `ALLOW` counter-list (`puta` inside `disputa` and `reputación`, `coño` folding to `cono`). Independent of shipping Spanish UI: names are global regardless of the player's language. |
| `de-comma-leak` | independent | About ten sites hard-code the German decimal comma outside the i18n layer. The English build already shows German commas there. A third language does **not** make it worse, because Spanish uses the comma too. |
| `loc-import` | the translation returns | Turning the returned CSV into catalog files, including re-introducing the ~164 template interpolations the CSV delivers as resolved numbers. |
| `loc-drift` helper | optional | A ten-line `npm run loc:drift -- <sha>`. Nice, not required: the plain `git diff` against the freeze SHA does the job. |

---

## What was not checked

- No validation gate was run during the planning session. They run in this worktree during
  implementation.
- The language picker was not measured. Encouraging but unverified: all three labels are exactly
  seven characters (`Deutsch`, `English`, `Español`), so a three-column grid is symmetric.
  `UsernameModal.jsx:124` hard-codes `grid-cols-2` and must become locale-count driven; the desktop
  form is already a segmented control and grows on its own. No ratchet points at `un-lang`.
- Spanish text length is unmeasurable until Spanish text exists. The order's "20 to 25 % longer" is
  a claim relative to **English**; against German, which is the longer of the two here, the expected
  excess is smaller and still unmeasured.

## Setup record

`/create-task spanish-locale B` was run by this session on the owner's explicit instruction, not on
its own initiative. Three things worth recording:

1. **`--pixels` is not an argument the command accepts.** Its parser knows `<slug>`, `<tier>`,
   `--base` and `--feature`. The intent behind it (the language picker goes from two entries to
   three) is carried in the contract's *Definition of done* instead.
2. **The branch prefix was decided against the skill's table**, for the reason already recorded in
   `docs/workstreams/text-voice-pass/task-contract.md:20`. Second occurrence; the table is probably
   inverted and worth fixing at the source.
3. **The base moved during planning.** `dev` went `e6c31813` -> `d9763883` from a parallel
   `#eis-arch` session. Both baseline measurements were re-taken against the new base and are
   unchanged, because that commit did not touch the catalogs.

The cleanup audit the command runs first is informational and did not gate setup. Its one durable
finding: **18 `task/menu-*` branches carry unmerged commits and no task contract names them**, so
their base cannot be resolved and no deletion command may be printed for any of them. That is a
documentation gap rather than a cleanup backlog, and it belongs to whoever owns the menu workstream.
