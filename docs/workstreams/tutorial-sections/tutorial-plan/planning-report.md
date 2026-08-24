# Tutorial sections — planning report (`#tutorial-sections`)

**Tier C · planner + designer session · branch `task/tutorial-plan` under `feature/tutorial-sections`**

Every number below carries its provenance: **measured** (read out of the running production build),
**computed** (arithmetic over a stated assumption), **estimated** (judgement, no source).

---

## Decisions — answered by the owner, this session

| # | Question | Answer |
| --- | --- | --- |
| 1 | Is the lesson the right form? | **Yes — and shorter.** "Kurz und knackig." The form is re-cut to three beats and re-measured; §1.2 and §1.4 carry the new numbers, §1.4a the new budget. |
| 2 | Do the nine gaps go in? | **All nine.** §4 marks them **L**. |
| 3 | Does finishing the tutorial pay anything? | **No.** No reward, no gate, no wiring to the onboarding counter (§6, H1). |
| 4 | Tap target on the phone — 44 px, stricter than the house? | **No objection raised → the recommendation stands:** 44 px for anything carrying a decision, chips unchanged. Recorded in `design-sprache.md` §11 (§5). |

Rejected alternatives are recorded in §1.6 rather than re-offered.

---

## 0. Session placement — not yet correct

The three commands at the top of the brief have **not** been run. Measured, in the cockpit checkout:

```
git rev-parse --abbrev-ref HEAD        -> dev
git rev-parse --verify feature/tutorial-sections  -> fatal: Needed a single revision
git rev-parse --verify task/tutorial-plan         -> fatal: Needed a single revision
git worktree list  -> cockpit, art-normalize, menu-rework   (no tutorial-plan)
```

`/create-task` is **owner-invoked only** (`.claude/skills/create-task/SKILL.md`, first line), so this
session did not create the branch or the worktree. All work below is read-only research plus
measurement against a `vite preview` of the production build; nothing in the repository was changed.
The report and its evidence are staged and move into the worktree unchanged once it exists.

**Preview port for this task: 5189.** Lowest free from 5181 up — 5180 is pinned by
`viewport-proof.mjs`, and 5181–5188 are each recorded in an existing task contract
(`grep -rn "Preview port" docs/workstreams`).

**Harness trap, measured and worth recording:** `vite preview` does **not** apply the config's base.
`vite.config.js` sets `base: command === "build" ? "/autostich/" : "/"`, and for `preview` the
command is `"serve"`. Without `--base /autostich/` every asset request falls through to the SPA
fallback and returns `index.html` — 1391 bytes of HTML where 156 575 bytes of CSS belong. The page
then mounts nothing and *still screenshots as a plausible dark screen*. My first measurement pass
ran into exactly this and produced a full set of confident, worthless numbers. Two guards now sit in
the harness: assert the CSS response is large, and abort if `#root` has fewer than 50 nodes.
`scripts/phone-proof.mjs:162` already documents the trap; it deserves to be in the mobile design
document too, because the next person measuring a phone layout will hit it.

---

## 1. What the section is, and how it is built

### 1.1 Three levels, one shell

The overlay reuses the hub-modal shell verbatim — `overlayPortal`, `MODAL_CARD`, `TopHairline`,
`ActionButton`, the `92dvh` card in a `p-3` frame. This is the Glossary's shell and the Leitfaden's
shell. No new shell is invented, so the desktop pass (decision 5) inherits whatever that shell
becomes rather than needing a second design round.

| Level | What it is |
| --- | --- |
| **Themenliste** | resume row, overall progress, one row per section with its own progress rail |
| **Lektionsliste** | the lessons of one section, done ones marked |
| **Lektion** | the teaching screen — head, beats, fixed foot |

### 1.2 Three beats, four kinds

**A lesson is three beats. Not four, not six.** That is the owner's "kurz und knackig" turned into
a countable shape:

1. **one Satz** — the setup, one to two sentences, which is what `text-style-guide.md` §3 asks for
   anyway. My first draft said "two to four sentences" and was looser than the project's own rule.
2. **one Probierfeld or one Bild** — the beat that does the teaching.
3. **one Merksatz** — what you keep.

There are exactly four beat *kinds*, and a fifth may not be invented by a worker without an entry in
the design document:

| Beat | What it is | Measured height at 390 × 844 (German, incl. margins) |
| --- | --- | --- |
| **Satz** | one to three sentences, per `text-style-guide.md` §3 | 56 px (58 chars) · 77 px (99–130) · 98 px (140) |
| **Bild** | a strip of real UI at real size, plus a caption | 121–123 px |
| **Probierfeld** | the interactive beat — see §1.3 | 204–215 px |
| **Merksatz** | the takeaway, on a hairline, never in a box (`design-sprache.md` §1) | 90 px |

The Merksatz uses a **line above** rather than its own framed surface, because `design-sprache.md`
§1 — *Kein Panel im Panel* — puts a closing section on a hairline at the foot of the panel. The
Probierfeld uses the §1 **Zeile** recipe exactly (`rgba(15,15,21,.72)`, `1px solid
rgba(150,150,170,.12)`, radius 8) — a neutral row inside a tinted panel, which §1 permits, not a
second tinted panel, which it forbids.

### 1.3 The Probierfeld — how "interactive" happens without touching `game/`

The Probierfeld is a small board the reader manipulates, and a readout computed by **the real
function from `src/game/`**, imported and called read-only. No re-implementation, no second truth,
no `game/` diff:

| Lesson | Board | Function called (all pure, all already exported) |
| --- | --- | --- |
| The four formations | one segment, 5 positions | `computeFormations(order, deck, …)` — `formations.js:205` |
| Overlap, anchor, core | one segment | same, reading `activeFormationCount` / `positionHasFormation` |
| Structure & district | the 8 × 5 board | `boardFactorMap`, `structureFactorMap`, `districtFactorMap`, `neighborCounts` — `architect.js:399–457` |
| Placing, rotating | the 8 × 5 board | `enumeratePlacements`, `isValidFootprint`, `nextRotationFootprint` |
| Streak, crit, score | no board — a slider | `SCORE_PER_WIN`, `STREAK_BASE_STEP/CAP`, `CRIT_BASE_MULT` from `constants.js` |

This is the answer to H4 at the mechanical level rather than the editorial one. A Probierfeld cannot
drift from the game, because it *is* the game's arithmetic. When balance moves, the lesson moves
with it and nobody has to remember.

**One segment, not forty.** Measured: five cells across the 364 px content width come out at
54.8 × 78.3 px each — readable and tappable. Ten would be 27 px wide. That the readable width
happens to be exactly `SEGMENT_SIZE` is the reason the formation lessons teach the segment and the
formation in the same picture instead of in two.

### 1.4 The Kontrakt: a lesson is one card, and the card is small

**Measured, 390 × 844:** card 366 × 776.5 at the `92dvh` cap · head 70 · foot 66 · therefore the
scroller can show at most **638 px** of beats. A lesson under that budget does not scroll at all.

| Variant | Content | Overhang | Hidden by the foot |
| --- | --- | --- | --- |
| four beats (Satz · Probierfeld · Satz · Merksatz) | 484 px | **0** | nothing |
| five beats (+ Bild) | 586 px | **0** | nothing |
| six beats (Satz · Bild · Satz · Probierfeld · Satz · Merksatz) | 694 px | 56 px | **the Merksatz** |

The six-beat variant is the design defect this session was told to hunt for — *measure what a panel
hides that does not itself scroll*. The word "MERKSATZ" is visible; its sentence is not; and the
gold, glowing "Weiter" sits 40 px below it. The reader is invited to leave exactly as the conclusion
goes out of sight.

**638 px is the ceiling of the shell. It is not the budget** — see §1.4a.

### 1.4a The budget after "kurz und knackig"

The three-beat lesson, measured at 390 × 844 in German:

| | |
| --- | --- |
| Beats | Satz 77 px (110 chars) · Probierfeld 204 px · Merksatz 90 px |
| Content | **386 px** |
| Card | 366 × 524.2 — **62 % of the screen** |
| Overhang · clipped · sideways scroll | **0 · nothing · none** |
| Tap targets under 44 px | **0** |

**The rule for workers: a lesson's beats total ≤ 400 px at 390 × 844 in German, or it is two
lessons.** German is the budget language because it is the longer of the two. This is the H5 lever:
it takes roughly two sentences per lesson out compared with my first draft, and a worker cannot
quietly write twice as much.

**The card is centred, not top-aligned.** Measured, the short card leaves 319.8 px of air either
way; the question is only where it goes. Top-aligned puts 12 px above and **307.8 px below** — the
screen reads as a page that ran out. Centred splits it **159.9 / 159.9** and the card reads as a
card. This is a deliberate deviation from the Glossary, which is `items-start` on the phone, and the
reason is that the Glossary always fills to the cap and a lesson never does. `design-sprache.md`
§1's "Restluft an den Fuß" is a rule for a panel that fills its screen; it does not decide this one,
which is why §11 has to (§5).

**What it costs in lesson count.** *Estimated:* the drop from 484 px to 386 px of content per lesson
splits a handful of the denser topics — reckon on **34 planned, up to ~38 built**. One that does
*not* split is "Die vier Formationen": rather than four Sätze naming four patterns, the Probierfeld
names the pattern it detects as the reader rearranges, so all four are met by playing. Shorter text
and better teaching in the same move. Section-level counts in §2 are guidance for the worker cut,
not contract.

### 1.5 What I fixed silently, and what I did not

Found by measuring my own sheet, corrected before showing it:

- **Tap targets were 42 px**, under the 44 px `design-sprache.md` §4 asks of an overlay. Now 44.
- **Two progress readouts on one screen** — the eyebrow said "Aufstellung · Lektion 3 von 7" and the
  foot said "3 / 7". `design-sprache.md` §7 strikes an element that repeats its container. The
  eyebrow now carries the section name only.
- **The Probierfeld's radius had drifted to 10 px**; the §1 Zeile is 8.
- **The Themenliste left 228.5 px of dead air** under five bare rows — 27 % of the screen. Adding a
  resume row and an overall progress line brought it to **104.2 px**, measured, and the added
  content is the most useful control on the screen rather than padding.

Not fixed, because it needs a decision (**and it is a genuine H2 finding, not a defect of mine**):
**the house does not hit 44 px on the phone.** Measured in the real Glossary at 390 × 844: its Close
button is **42 px**, its category chips are **26.5 px**, ten of its controls are under 44. My
prototype is therefore *stricter than the app it will sit next to*. `design-sprache.md` is scoped to
≥ 1280 px and its §8 explicitly lets the run screen go smaller, so there is no rule to appeal to —
that is precisely the hole H2 names. §5 proposes the fix.

### 1.6 Rejected, recorded rather than offered

- **A scrolling long-read per section.** Measured above: it hides its own conclusion.
- **A carousel of cards, one beat per swipe.** Would make the Probierfeld a full screen and the
  Merksatz a screen you can swipe past without reading — the same defect with better manners.
- **Coach-marks over the live UI, outside a run.** Needs the run screen mounted with fake state;
  that is either a `game/` change or a mock of it. Both are worse than a Probierfeld that calls the
  real function.
- **A new overlay shell.** Would need designing twice, once now and once after the menu rebuild.

---

## 2. The sections

Ordered as a new player meets them. **34 lessons.** Titles are working titles; the text tasks own
the wording.

### S1 · Grundlagen — 8 lessons
1. Was ist Autostich — maximaler Score über 50 Durchläufe, kein Verlieren, der Lauf spielt sich selbst
2. Der Stich — Karte gegen Karte, der höhere Kampfwert gewinnt, Gleichstand zählt nicht ***(gap: Gleichstand)***
3. Kartenwert · Stichwert · Kampfwert
4. Durchlauf und Lauf — 40 Karten, 8 Segmente, 50 Durchläufe
5. Serie, Serienpunkt und der Serien-Multiplikator
6. Crit — was er ist, woher er kommt
7. Woraus dein Score entsteht — Basispunkte × Serie × Crit × Formation × Gebäude; und Direkt-Score ***(gap: Direkt-Score)***
8. Die Panels des Laufs — Kopfleiste, Seitenpanels, Meilensteinbalken, Fraktionsleisten
9. *(also here, one paragraph, not a lesson: welche Phasen es gibt und in welcher Reihenfolge)*

### S2 · Aufstellung — 6 lessons
1. Die Aufstellungsphase und die Formations-Energie
2. Karten tauschen — was ein Tausch kostet
3. Position, Segment, Segmentgrenze
4. Was auf einer Karte steht — Multiplikator und Formationskürzel
5. Die vier Formationen — **Probierfeld**
6. Übereinanderliegende Formationen: Überlappung, Anker, Kern, Grenzbonus, Nachhall — und: der Multiplikator zählt nur bei gewonnenem Stich

### S3 · Perks & Skills — 6 lessons
1. Perks — 3 im Angebot, Kategorien A–E, Ablehnen ist erlaubt ***(gap: Kategorien A–E)***
2. Rarität und Legendäre ***(gap: Rarität)***
3. Neuwurf — drei getrennte Vorräte, kein Nachschub ***(gap: Neuwurf)***
4. Skills — 12 im Angebot, 6 Slots, der erste Skill macht einen Archetyp aktiv
5. Was die Passives sind · Konsument und Verstärker · Bekenntnis
6. Legendäre Skills und die Legendär-Phase ***(gap: Legendär-Phase)***

### S4 · Die vier Archetypen — 4 lessons
One per archetype: the resource bar, what the passive does without any skill, the speciality, and a
**link to the Leitfaden** (decision 3 — the Leitfaden is not rewritten and not paraphrased). The ice
lesson also carries the mandatory glacier pick ***(gap: Gletscher-Wahl)***.

### S5 · Der Architekt — 6 lessons
1. Was die Bauphase ist — kein Geld, keine Münzen
2. Das Brett (8 × 5) und das Baufeld
3. Bauen — Bauplan, Polyomino, Drehen — **Probierfeld**
4. Die drei Bau-Kategorien — Tragwerk · Handelsbau · Sakralbau
5. **Struktur-** und **Distrikt-Boni** — **Probierfeld** — und: nur bei gewonnenem Stich
6. Aufwerten und Versetzen ***(gap: Versetzen)***

> **Terminology, and it is a tripwire hit.** Your list says *"Formations- und Distrikt-Boni"*. In
> the game these are **Struktur**- and **Distrikt**-Boni; `text-style-guide.md` §1e reserves the
> word *Formation* for card formations and forbids using it for the building geometry. The glossary
> entries are `struktur` and `distrikt`. Keeping your wording would create the second truth H4 is
> about, so the lesson is titled with the game's word.

### S6 · Nach dem Lauf — 4 lessons
1. Der Endscreen — Score-Herkunft, dein Build, der Geist ***(gap: Geist)***
2. Meilensteine, **SP** und **DP** — und wie du sie einsetzt
3. Upgrade-Baum und Deck-Werkstatt
4. Ranglisten-Lauf, Wochen-Modifikator, Bestenliste, Chronik

> **A second terminology note — I got this wrong first time and it is worth the correction.** Your
> list says *"Meilensteine, DP und TP"*, and I reported that no **TP** exists. It does: **TP is the
> English name of SP.** `common.cur.sp` resolves to `"SP"` in `de.js:461` and `"TP"` in `en.js:448`;
> Stichpunkte are Trick Points, per the one-German-word-one-English-word rule in
> `docs/localization/i18n.md` §4. The hub shows "Bonus TP" in English right now — that is where it
> is visible.
>
> **The consequence is a rule for the S6.2 worker:** the currency is written `t("common.cur.sp")`,
> never a literal "SP" or "TP" in a sentence. A hard-wired "SP" would read as a typo in the English
> build, and the `MIGRATED` ratchet would not catch it — it is a plausible-looking code token, not a
> German word.

### Also read differently than written
*"Was ist die Bauphase [gelesen als „Bauphase"]"* and *"Formations- und Distrikt-**Boni** [gelesen
aus „bobi"]"* — both readings are confirmed by the code: `bauphase` and `distrikt` are the glossary
ids, and `gebaeude` names the *Gebäude-Boost* as the sum of structure and district factors.

---

## 3. Where the content lives

`src/ui/tutorial-sections/catalog.js` — pure data, **no display text**, exactly like
`tutorialScript.js` is today. Sections → lessons → beats; each beat carries an i18n key and, where a
number appears, the constant it interpolates. The sentences live in `src/i18n/de.js` and
`src/i18n/en.js`. Two properties fall out of that and both are already enforced by tests that exist:

- a German sentence in the catalogue is a one-language tutorial → caught by the `MIGRATED` ratchet
  once the new files are added to it;
- a number typed into a sentence instead of interpolated → the existing tutorial test already
  asserts *"kein Tutorial-Text nennt eine Zahl direkt"* (`test/tutorial.test.js:105`). That
  assertion is worth carrying over to the new catalogue rather than deleting with the old one.

Key namespace: `tut.<section>.<lesson>.<beat>`. **Not** `tutorial.*` — that prefix belongs to the
guided run being removed, and reusing it would make the two indistinguishable in a diff.

---

## 4. The gap report — 109 terms, checkable

`✓` = covered · **L** = gap, now added · `–` = deliberately left out, reason at the foot.

### Grundbegriffe (13)
| | Term | Where |
|---|---|---|
| ✓ | Stich | S1.2 |
| ✓ | Durchlauf | S1.4 |
| ✓ | Aufstellungsphase | S2.1 |
| ✓ | Siegesserie (Serie) | S1.5 |
| ✓ | Kampfwert-Vorsprung | S4 (Feuer) |
| ✓ | Kampfwert | S1.3 |
| ✓ | Crit | S1.6 |
| **L** | **Gleichstand** | S1.2 — one sentence |
| **L** | **Geist / Rekord** | S6.1 |
| **L** | **Neuwurf (Reroll)** | S3.3 |
| ✓ | Serienpunkt | S1.5 |
| **L** | **Farbserie** | S3.1 (as a perk example) |
| **L** | **Direkt-Score** | S1.7 |

### Deck & Karten (7)
| | Term | Where |
|---|---|---|
| – | Deck | assumed known — a card game's deck needs no lesson |
| ✓ | Farbe | S2.5 (Farbblock) |
| ✓ | Kartenwert · Stichwert | S1.3 |
| ✓ | Ziehreihenfolge | S2.2 |
| ✓ | Position | S2.3 |
| ✓ | Segment | S2.3 |

### Formationen (15)
| | Term | Where |
|---|---|---|
| ✓ | Formation · Wiederholung · Farbblock · Treppe · Wechsel | S2.5 — Probierfeld |
| ✓ | Anker · Überlappung · Nachhall · Formationskern · Grenzbonus | S2.6 |
| ✓ | Formations-Energie | S2.1 |
| – | Farballianz · Farbblock-Transparenz · Joker · Bindeglied | perk-/building-specific modifiers of the four base patterns. A player meets them **on the card that grants them**, where the glossary bolds them. Teaching them before they own one is teaching a rule with no referent. |

### Archetypen (33)
| | Term | Where |
|---|---|---|
| ✓ | Archetyp · Skill-Slot · Skill-Durchlauf | S3.4 |
| ✓ | Konsument · Überlauf · Bekenntnis | S3.5 |
| ✓ | Legendärer Skill | S3.6 |
| ✓ | Kaskade | S4 (Blitz + Eis) |
| ✓ | Hitze · Glutdividende · Weißglut | S4 Feuer |
| ✓ | Ladung · Ionisierung · Stapel | S4 Blitz |
| ✓ | Gletscher · Masse · Bersten | S4 Eis |
| ✓ | Wachstum · Setzling · Grün (reif) | S4 Pflanze |
| – | Brandmal · Asche · Ascheglut · Schmieden · Cluster · Gletscher-Formationen · Firn-Boden · Wurzeln · Blüte · Trimmen · Kolonisieren · Überwucherung · Ewiger Frühling (13) | **the second layer of each archetype.** Every one of them is gated behind holding a specific skill. The tutorial teaches the resource and the payoff; the *strategy* of an archetype is what the Leitfaden is for (decision 3), and the exact rule is what the glossary is for. Teaching all 13 here would be writing a fifth Leitfaden in the tutorial's voice — the H4 failure exactly. |

### Präzision · Crit (6)
| | Term | Where |
|---|---|---|
| ✓ | Präzision | S1.6 — one sentence: crit-chance comes from the Präzision families and from Blitz |
| – | Schärfe · Wucht · Zielsicherheit · Brennglas · Farbfokus | five named perk families. They are read on the perk card, where the glossary bolds them. |

### Perks & Rarität (8)
| | Term | Where |
|---|---|---|
| ✓ | Perk | S3.1 |
| ✓ | Familie · Stufe I–IV | S3.1 |
| **L** | **Rarität** | S3.2 |
| ✓ | Legendär | S3.2 |
| **L** | **Kategorien A–E** | S3.1 |
| – | Aufwertungs-Typen | Regelersetzung/Kumulativ/Rolle is a rules-lawyer distinction; it is on the card and in the glossary |
| – | Opfergabe | one perk's drawback |

### Der Architekt (16)
| | Term | Where |
|---|---|---|
| ✓ | Bauphase | S5.1 |
| ✓ | Brett (8×5) · Baufeld | S5.2 |
| ✓ | Polyomino · Bauplan · Gebäude | S5.3 |
| ✓ | Bau-Kategorien | S5.4 |
| ✓ | Struktur · Nachbargebäude / Distrikt | S5.5 — Probierfeld |
| ✓ | Aufwerten | S5.6 |
| **L** | **Versetzen** | S5.6 — its own phase, easy to miss |
| – | Staffel · Lage · Crit-Wette · Stufen-Kicker · Abgedeckte Zelle | five building-specific behaviours, each named on the building that has it |

### Fortschritt & Meta (11)
| | Term | Where |
|---|---|---|
| ✓ | Stichpunkte (SP) · Deckpunkte (DP) | S6.2 |
| ✓ | Upgrade-Baum | S6.3 |
| ✓ | Kosmetik / Deck | S6.3 |
| ✓ | Ranglisten-Lauf · Wochen-Modifikator · Bestenliste · Chronik | S6.4 |
| ✓ | Score-Herkunft | S6.1 |
| – | Challenger / Seed | for players who already share runs |
| – | Statistik-Hub | a screen, not a mechanic; it explains itself |

### Not in the glossary, and still a gap
The glossary lists mechanics. Three **phases** a first run can hit have no glossary entry at all and
were on nobody's list:

| | | Where |
|---|---|---|
| **L** | **Gletscher-Wahl** — mandatory after every ice skill, `phase: "glacier-target"` | S4 Eis |
| **L** | **Ziel-Auswahl** — a perk asks you to tap N cards, `phase: "target"` | S3.1 |
| **L** | **Familien-Ziel** — a family asks for a colour, card or formation type, `phase: "family-target"` | S3.1 |

A first run stops dead on each of these and today the only explanation is a single sentence from the
guided run, which is being removed.

### Tally
**109 terms · 78 covered · 9 gaps added · 31 deliberately omitted · plus 3 phase gaps outside the
glossary.** Every omission is named above with its reason. The shape of the reasons is one rule:
**the tutorial teaches what a first run forces you to decide; the glossary answers what a card
says; the Leitfaden argues how to play an archetype.**

---

## 5. H2 — the mobile design document

**Decision: extend `docs/design-sprache.md` with a new §11 *Die Handy-Fassung*. No sibling
document.**

The document provides for this itself. §8 excludes "Die Fassung unter 1280 px, **solange sie nicht
ausdrücklich beauftragt ist**" — the exclusion is conditional and this session is that commission. A
sibling file would split one design language into two that must be kept in step by hand, which is
the H4 failure applied to documentation. `AGENTS.md` — *Appending to an existing German document* —
makes the entry German, and this is the documented exception rather than a break of the language
rule. The title line loses "(Desktop, ab 1280 px)".

What §11 must settle, from what this session measured:

1. **The phone card.** `92dvh` in a `p-3` frame, top-aligned, leftover air at the foot. Measured on
   the real Glossary at 390 × 844: card 366 × 776.5, 55.5 px of air. That is house behaviour, not a
   defect — §1's "Restluft an den Fuß" already covers it.
2. **How much air is too much.** Measured: five bare rows leave 228.5 px (27 % of the screen); with
   a resume row and a progress line, 104.2 px. Proposal: over ~180 px, the screen is thin on content,
   not badly laid out — add content, do not add padding.
3. **The tap target on the phone — settled, question 4 drew no objection.** §4 says 44 px for overlays. Measured, the
   phone does not obey it: the Glossary's Close is 42 px and its category chips are 26.5 px, and
   `ActionButton`'s `py-2.5` yields 42 px everywhere. Either §4 does not apply below 1280 px (then
   say so, as §8 does for the run screen), or `ActionButton` is 2 px short across the whole app.
   **Recorded: 44 px for anything that carries a decision (buttons, rows, cells); chips and filters
   stay as they are.** The prototype is built to 44 and measures 0 controls under it. Note the
   consequence for whoever writes §11: `ActionButton`'s `py-2.5` yields 42 px, so honouring this on
   the phone is a change to a shared component, not to the tutorial.
4. **Top-aligned or centred.** Measured: a card that fills to the `92dvh` cap is top-aligned with
   55.5 px of air (the Glossary); a short card top-aligned leaves 307.8 px below it. Proposal, and
   what the tutorial does: **fills the cap → top; well under it → centred.**
5. **The measurement trap** from §0 — `vite preview` needs `--base`, and a page with no CSS still
   screenshots plausibly. Anyone measuring a phone layout needs to know this before they trust a
   number.

---

## 6. Hazards

**H1 — the onboarding counter. Owner-confirmed (question 3, answered "nein"): it stays inert, the
tutorial pays nothing, and nothing is wired to it.**

Verified, not quoted: `ONBOARDING_LINKS = 6` (`progression.js:279`), profiles start at 6/6
(`storage.js:128`), and `isSpRun` gates on `onboardingBefore >= ONBOARDING_LINKS`
(`progression.js:355`). **Sharper than the brief states: `dpForRun` calls `isSpRun` too.** Reviving
the chain would cut the first six runs' **SP and DP**, not SP alone. Against that, the chain buys
the tutorial nothing it cannot have for free — lesson progress is UI state and belongs in the same
place `loadTutorialDone()` already keeps its flag. Nothing in `src/game/` is touched, so the
tripwire holds by construction.

**H3 — the video calculation.** Infrastructure today: **zero.** Measured — no `<video>`, no
`.vtt`, no `<track>`, no captions anywhere in `src/` or `index.html`. File types present: webp, jpg,
png, m4a, mp3, wav, woff2. Nothing to build on.

*Measured:* `src/assets` 32 MB (cards 16 · battlefields 12 · sounds 3); built `dist` **28 MB**;
`media/` 149 MB but deployed separately and not part of `dist`.

*Computed*, from one stated assumption — H.264, portrait 720 × 1560, 30 fps. Bytes per minute =
bitrate × 60 ÷ 8:

| Bitrate | Video / min | 34 lessons × 45 s = 25.5 min |
| --- | --- | --- |
| 0.8 Mbit/s | 6.0 MB | 153 MB |
| **1.5 Mbit/s** (UI content, flat colours) | **11.3 MB** | **287 MB** |
| 3.0 Mbit/s | 22.5 MB | 574 MB |

Voice, AAC mono 64 kbit/s: 0.48 MB/min → 12 MB per language, **24 MB for both**.
Subtitles, WebVTT: ~2 KB per lesson per language → **0.14 MB total. Subtitles are free.**

**The fork that decides the cost: does the picture contain UI text?** It does, unavoidably — the
whole point is showing the interface. So the *picture* must be produced twice as well:

- at 1.5 Mbit/s: 2 × 287 + 24 = **598 MB**, against a `dist` of 28 MB today → **the deploy grows
  21×**.
- at 0.8 Mbit/s: 2 × 153 + 24 = **330 MB** → 12×.

*Stated from published GitHub limits, not measured here:* Pages sites are capped at 1 GB published
and 100 GB/month bandwidth (soft). 598 MB fits the 1 GB cap with 40 % to spare — **disk is not the
binding constraint.** *Computed:* if an average new player watches half the set (299 MB), the
monthly soft cap is reached at **~334 players**; at a quarter watched, ~669. That is the number to
decide against.

*Estimated* production effort: 51 finished minutes across two languages, at roughly an hour of
capture, VO, edit and subtitle timing per finished minute → **~50 hours**, plus a voice actor per
language or synthesis with the licensing question that carries.

**The argument that outweighs all of the above, and it comes from the repository's own rule.**
`text-style-guide.md` §4 and `docs/localization/i18n.md` §2 exist because hand-maintained numbers
drift: *"Zahlen, die eine Konstante spiegeln, werden interpoliert, nicht doppelt gepflegt."* The
catalogue can obey that — a template literal pulls `SCORE_PER_WIN` and the sentence is never wrong.
**A video cannot.** Every number it speaks is frozen at record time, in two languages, and the next
balance pass makes it lie silently. The interactive lesson has the opposite property: the
Probierfeld calls the live function, so it cannot go stale at all. Video would be the first
player-facing text in this project that is structurally incapable of following its own style guide.

**Recommendation, for the later decision: no video.** If it is wanted anyway, the cheap version is
**subtitles-only, no voice** — 0.14 MB, one language pair, no re-recording — over silent captures of
the Probierfeld, which are the only part of a lesson a still picture cannot carry.

**H4 — two truths.** The division of labour from `tutorial-guided-run-plan.md` §1 carries forward
and is now enforced by construction rather than discipline:

| Layer | Answers | Enforced by |
| --- | --- | --- |
| **Glossar** | "what does this word mean" | 109 entries, fed from `constants.js` |
| **Leitfaden** | "how do I play Feuer" | 4 archetype guides, deliberately number-free |
| **Tutorial** | "do it once" | the Probierfeld calls the real function |

Two consequences for workers, both blocking: a lesson **links** the glossary term, never restates
it; and an archetype lesson **links** the Leitfaden, never paraphrases it. A worker who finds a term
the glossary explains badly files that as a glossary change, not as a lesson paragraph.

**H5 — text volume, counted rather than feared.** *Measured:* `de.js` holds **1197 keys / 94 173
bytes** today; the guided run being removed accounts for **42** of them. *Computed:* 34 lessons × ~7
keys + 6 section headers ≈ **250 keys per language**, ≈ 27 KB German + 24 KB English. That is
**+21 % keys and +29 % German catalogue volume** — the largest single text addition the project has
made, and ~6× what the guided run carried. Per §1.4 the per-lesson budget is fixed at 638 px, which
caps it: a worker cannot quietly write twice as much. Distribution across tasks is §7.

**H6 / H7 — the teardown, and the ratchet it walks into.** *Measured:* `data-tut` appears in **9**
files — the eight named in the brief plus `TutorialOverlay.jsx` itself. Guards that fire:

| Guard | What happens | Right resolution |
| --- | --- | --- |
| `test/tutorial.test.js` (7 `data-tut` assertions, incl. a **bidirectional** anchor↔coach-mark check) | goes away with the feature | delete the file **with** the feature, in one commit, never separately |
| `test/levelup-wings.test.js:255` — `data-tut="skill-offer"` must appear exactly once | a foreign test, on a foreign feature | drop that one expectation; the surrounding assertion about the wings stays |
| `i18n-guards` — dead keys | 42 `tutorial.*` keys become unused | remove them from both catalogues in the same commit |
| `i18n-guards` — *"die Ratschen-Liste zeigt nur auf existierende Dateien"* (`:577`) | `readFileSync` **throws** on the deleted `TutorialOverlay.jsx` | remove that one line from `MIGRATED` |

That last one deserves a sentence, because `MIGRATED` carries the comment *"wächst und schrumpft
nie"* and removing an entry looks exactly like weakening a guard. It is not. The guard's own name is
*"zeigt nur auf existierende Dateien"* — deleting the entry for a deleted file is what the guard
asks for. The invariant it protects is "no hard-wired text in a migrated file", and a file that no
longer exists cannot hold any. **No other entry may be touched.**

`docs/tutorial-guided-run-plan.md` gets a status banner marking it superseded in part — the
architecture (§3 seed path, §6/§14 data-vs-text split) is what the new catalogue copies and must
stay readable.

**H8 — `npm run loc:export` runs in every task here.** Every one of them changes player-visible
text. Non-negotiable.

---

## 7. The worker cut

Nine tasks. Each is a Tier B or C task with its own contract, its own worktree, and the full V1–V4
visual gate at 390 × 844 **in both languages**.

| # | Task | Depends on | Text load |
| --- | --- | --- | --- |
| **T1** | **Shell & Katalog** — overlay, three levels, the four beat components, the catalogue schema, the key namespace, the 638 px budget as a test. **Zero lessons.** | — | 6 section headers |
| **T2** | **Rückbau des geführten Laufs** — `src/ui/tutorial/`, 8 foreign components, the four guards in H6, 42 keys, the doc banner | — (runs parallel to T1) | −42 keys |
| **T3** | S1 · Grundlagen (8 lessons, 1 Probierfeld: streak/crit slider) | T1 | ~56 keys |
| **T4** | S2 · Aufstellung (6, 2 Probierfelder on `computeFormations`) | T1 | ~42 keys |
| **T5** | S3 · Perks & Skills (6) | T1 | ~42 keys |
| **T6** | S4 · Die vier Archetypen (4, links the Leitfaden) | T1 | ~28 keys |
| **T7** | S5 · Der Architekt (6, 2 Probierfelder on `architect.js`) | T1 | ~42 keys |
| **T8** | S6 · Nach dem Lauf (4) | T1 | ~28 keys |
| **T9** | Hub entry, section completion state, `design-sprache.md` §11 | T1 + one content task | — |

T3–T8 are independent of one another and can run in parallel once T1 lands. **T1 is the only
serialising task**, which is why it deliberately ships with no lessons: its job is to make the shape
unarguable before six workers write into it.

**T2 first or last?** First. Leaving the guided run alive while the sections are built means two
tutorials in the hub and two sets of `tutorial.*` keys, and the H6 guards fire either way. Doing it
early also means T1 can claim the `tutorial` key namespace cleanly rather than working around it.

---

## 8. What this session measured, and how to reproduce it

```bash
npm run build
npx vite preview --port 5189 --strictPort --base /autostich/
node measure.mjs        # scratchpad/proto — CDP via scripts/cdp.mjs, 390 x 844, dpr 2
```

Evidence staged alongside this report: `knackig-mitte-390x844.png` (**the approved form**),
`knackig-top-390x844.png` (the same card top-aligned, for the centring decision),
`list-390x844.png`, `long-390x844.png` (the Merksatz behind the foot — the rejected long form),
`glossary-390x844.png` (the house shell for comparison), and `measurements.json` per variant.

Not measured, and therefore not claimed: the English lesson (German is the longer language and the
one budgeted), any viewport other than 390 × 844, and any behaviour of the Probierfeld beyond its
size — it is a static prototype, and the live function call is a design commitment, not something
this session ran.
