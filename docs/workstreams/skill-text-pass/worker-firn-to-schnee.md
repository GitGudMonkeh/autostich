# Worker task — rename the ice resource *Firn* to *Schnee*

**Tier A.** One term, one meaning, mechanical. No behaviour, no balance, no layout.
Run this **before** `task/skill-text-pass` lands — that round already writes its ice texts with
*Schnee* and assumes this rename has happened.

Branch `task/firn-schnee` from `dev`, in the worktree `/create-task` creates.

---

## What changes

**German:** `Firn` → `Schnee`. **English:** `firn` → `snow`.

The rename is also the moment to collapse a duplication it exposes. Today there are three names
around one idea: *Firn* (the substance), *Firn-Boden* (a cell carrying it), *Firn-Reserve* AND
*Boden-Reserve* (the same store, named twice). Target:

| | German | English |
|---|---|---|
| the substance | **Schnee** | **snow** |
| the store on a cell | **Boden-Reserve** (everywhere; *Firn-Reserve* disappears) | **ground reserve** |

*Firn-Boden* as a separate term is dropped — the glossary entry becomes **Schnee** and explains
that it lies on the board cell. If you disagree after seeing the entry in place, keep a
*Schnee-Boden* label; that is the one open sub-decision and it is small.

## What does NOT change

- **Code identifiers**: `firnStack`, `firnMass`, `isFirn`, `FIRN_*`, `glacier-firn.test.js`. They
  are not player text; renaming them would multiply the diff for zero player-visible gain.
- **i18n key names**: `bar.ice.firnGround`, `bar.ice.firnReserve`, `arch.firn.title` keep their
  names — only their **values** change. This is what keeps the task out of `src/ui/**`: the
  components that read those keys never have to be touched.
- Comments, `docs/` other than the style guide, anything under `sim/`.

## The exact sites — 25 player-visible strings in 9 files

**Owned by `skill-text-pass`, do NOT touch here** (that round rewrites them and will already say
*Schnee*): `skills.js` SK_ICE_02 / SK_ICE_03 / SK_ICE_L01 and their `enSkills.js` mirrors.
If this task runs first, they still read *Firn* — rename them here and let the other round
overwrite; the two edits do not conflict, they touch the same three lines.

    src/game/glossary.js
      262  bersten.text ...................... "aus seiner Firn-Reserve" -> "aus seiner Boden-Reserve"
      271  freeze.label ...................... "Firn-Boden" -> "Schnee"
      272  freeze.text ....................... 3 occurrences ("Firn liegt als Reserve …", "Firn-Boden",
                                               "der angesammelte Firn")
      273  freeze.match ...................... ["Firn-Boden", "Firn"] -> ["Schnee"]
                                               NOTE: this array drives the glossary auto-bolding.
                                               test/i18n-guards.test.js:455 asserts the bolding is
                                               lossless across both languages — keep the arrays in step.

    src/i18n/enGlossary.js
      101  bersten ........................... "from its firn reserve" -> "from its ground reserve"
      104  freeze ............................ label "Firn ground" -> "Snow", 3 in the body,
                                               match list ["firn ground","firn","firn reserve"] -> ["snow"]

    src/i18n/de.js
      275  bar.ice.firnGround ................ "Firn-Boden lädt" -> "Schnee sammelt sich"
      276  bar.ice.firnReserve ............... "Firn-Reserve" -> "Boden-Reserve"
      508  skill.loss.ice .................... "Masse und Firn-Reserve gehen verloren"
                                               -> "Masse und Boden-Reserve gehen verloren"
      718  arch.firn.title ................... "Firn-Boden · Reserve {n} (…)" -> "Schnee · Reserve {n} (…)"

    src/i18n/en.js                             the four mirrored keys, same lines ±2
      273  bar.ice.firnGround ................ "Firn ground charging" -> "Snow gathering"
      274  bar.ice.firnReserve ............... "Firn reserve" -> "Ground reserve"
      494  skill.loss.ice .................... "mass and firn reserve are lost"
                                               -> "mass and ground reserve are lost"
      699  arch.firn.title ................... "Firn ground · reserve {n} (…)" -> "Snow · reserve {n} (…)"

    src/ui/guides.js .......................... 2 occurrences (German ice guide)
    src/i18n/enGuides.js
       10  terminology header line ........... "· firn ·" -> "· snow ·"
       95  guide.ice.pillars.1.text .......... "a **firn reserve**" -> "a **ground reserve**"
      109  guide.ice.loop.steps.4 ............ "**Firn** gathers on open cells" -> "**Snow** gathers …"

    src/i18n/enSkills.js
       14  terminology header line ........... "· firn ·" -> "· snow ·"

    src/ui/CardGrid.jsx  ...................... THE ONLY UI FILE, and a finding in its own right
      193  title={`Gletscher · Masse … · Reserve … (füllt zum Durchlauf-Beginn auf 12)`}
      200  title={`Firn-Boden · Reserve … (füllt einen Gletscher hier zum Durchlauf-Beginn)`}
           Both are hardcoded German in JSX, not i18n at all. The `12` is hardcoded too, against
           G_THRESHOLDS. Minimum: rename the term. Better, and probably its own follow-up: move
           both into the catalogue — test/i18n-guards.test.js:511 is the ratchet written against
           exactly this.

    docs/text-style-guide.md
      §1c table row ......................... "**Firn** / **Firn-Reserve** | — | Boden-Vorrat, der
                                               einen Gletscher nachfüllt"
                                               -> "**Schnee** | Firn | Boden-Vorrat, der einen
                                                   Gletscher nachfüllt"
                                               Put *Firn* in the "NICHT verwenden" column so the
                                               old word is actively banned, not merely absent.

## Why no `src/ui` tripwire fires

`skill-text-pass` forbids touching `src/ui/**` because the menu rework holds ~94 unintegrated
commits there. That constraint belongs to that task, not this one — but keep the spirit: the only
UI file here is `CardGrid.jsx`, and only two string literals in it. Do not reformat the file.

## Acceptance

```bash
npm test
npm run loc:export
node scripts/text-voice-check.mjs --baseline <branch point>
grep -rn "Firn\|firn" src/game/glossary.js src/i18n/ src/ui/CardGrid.jsx docs/text-style-guide.md
```

The last grep must come back empty **except** for the i18n key names
(`bar.ice.firnGround`, `bar.ice.firnReserve`, `arch.firn.title`), which stay by design.

`text-voice-check` will flag compound-count changes where `Firn-Boden` / `Firn-Reserve` disappear.
Those are real and expected — book each in `docs/localization/text-voice-keep.txt` with
"ice resource renamed Firn -> Schnee" as the reason. Numbers must not move at all; if check 3
fires, something other than a noun was edited.

## One thing to look at while you are in there

`glossary.js:272` and `enGlossary.js:104` both hardcode the refill target as "volle {BURST_AT}
Masse" via an interpolation, but `CardGrid.jsx:193` writes "auf 12" as a literal. Same number,
two sources. Out of scope to fix here; worth a line in the report.
