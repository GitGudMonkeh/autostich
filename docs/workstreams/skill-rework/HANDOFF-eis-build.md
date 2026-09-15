# Handoff — bringing Eis into the exp skill rework on `exp`

For the next Claude session. Fire, Lightning and Plant are done; Eis is the last faction. Engineering English per
`AGENTS.md`; the owner's words are quoted in German, and the start prompt at the end is German because the owner
pastes it verbatim.

## 1. Where things stand

- **Branch `exp`**, HEAD `82aed67f`. Only `exp` is pushed — never `dev`, `test`, `main`; no pull requests, no
  force-push. The session works in the repository root checkout it was opened in.
- Gates were green at HEAD: `npm test` (149 files, 2320 tests), `npm run lint -- --max-warnings=0`,
  `npm run build`, `VITE_PREVIEW=1 npm run build`, `npm run gen:db`, `npm run loc:export`.
- **Three factions are finished and tariff-balanced.** Duel without legendaries, 200 runs, doors from all three:

  | Build | Median | Siegquote |
  | --- | --- | --- |
  | Feuer mono | 7,75M | 65,3 % |
  | Blitz mono | 7,43M | 59,4 % |
  | Pflanze mono | 8,36M | 53,3 % |
  | Split über alle drei | 7,81M | 57,8 % |

  **That table is the parity target for Eis.** It is reproduced with
  `SIM_SKILL_LEGENDARY_PER_SLOT=0 npm run sim -- --mode duel --arch fire,lightning,plant --runs 200`.
- **Nine legendaries, three per faction, banded** (§6.12–§6.15): eight sit at +101 … +160 % typical paired effect,
  Hochspannung at +59 % because its dial is arithmetically exhausted (the owner accepted that). Eis's three should
  land in the same band.
- **The offer pool** is `SKILL_OFFER_ARCHETYPES = ["fire", "lightning", "plant"]` (constants.js). Eis is the one
  faction still outside it.
- **Balance guard** currently centred on Median 3,29M / Mean 5,30M (`test/sim-balance-guard.test.js`). **It must be
  re-centred the moment Eis enters the offer** — that happened for Plant in §6.16 and moved the median by a third.

## 2. What Eis actually is today — read this before planning

Eis is **not** an untouched legacy faction. It carries a full, recent redesign that never went through the exp
structure:

- `docs/eis-rework.md` — „Gletscher, Brechen & Kaskade" (v1, 200 lines). Vision, foundation, roles, legendaries.
  Its own status line says: *„Zahlen ganz zuletzt (Sim + Playtest)"* and it names `balancing` as its target branch.
  **Treat it as design input, not as current instruction** — it predates the exp rework and the branch it names is
  not this one. Verify every claim against the code.
- `src/game/glacier.js` (390 lines) — the whole mechanic: mass on the board, breaking into neighbours, roles.
  Every ice skill carries a `role: G_…` and the module reads it. This is a different shape from Fire/Lightning/Plant,
  which have a faction module plus tier tables.
- **21 skills: 17 normal + 4 legendary, and NOT ONE has tiers.** `descTiers` is undefined for all of them — Eis
  never got the four-tier model that §1 of `docs/skill-rework.md` defines and the other three factions use.
- 21 test files (`test/glacier-*.test.js`, `test/glacier.test.js`) guard the current behaviour. They are the reason
  a rebuild is expensive: any mechanic change has to answer to them, and they are the record of what was verified.
- `docs/skill-rework.md` **§5 Eis says exactly one word: „Offen."** Nothing about Eis has been decided inside the
  exp rework.

**So the honest framing for the owner: Eis has a designed and implemented mechanic, and no exp structure.** The
open questions are structural (tiers, 15 + 3, offer, parity), not „what is this faction about".

## 3. The owner's rules — binding, quoted

- **„immer erst Planung und erst messen auf mein Go."** Set after §6.19, where the previous session treated „Route 1
  macht Sinn" as permission to build *and* measure. Approval of a design is not approval to measure. Ask separately.
- „keine spielentscheidenden Entscheidungen ohne mein Ja — Werte, Texte, Mechaniken sind Vorschlag."
- „erst Design, dann Startwert, gemessen wird nur auf meine Ansage; keine Sim-Läufe nebenbei."
- Kein Direkt-Score · keine Deckel · kein `enabler`-Verstärker · kein Eingriff in die Aufstellungsordnung ·
  ein Begriff je Sache · ein Effekt je normalem Skill, Episch darf ein kleines Extra haben.
- Keine neuen Glyphen oder Dependencies ohne Frage.
- Texts: the owner corrects wording and it is worth pre-empting. From the Plant round: no em-dashes in player text,
  no elided clauses, „wiegt" is not German for this („zahlt fünffach" is), and an explanation the player does not
  need („und gilt als eigene Farbe für jede Formation, die Farbe liest") belongs in the glossary, not the passive.
- Reports in German, phone-screen length. Commit messages, code comments and docs in English per `AGENTS.md`.

## 4. What the exp structure means concretely

The three finished factions share a shape. Match it:

- **15 normal skills with four tiers + 3 legendaries = 18.** `test/skill-art.test.js` requires ≥17 registered skills
  per faction and one emblem per registered skill, so cutting from 21 to 18 works, but every cut skill's emblem has
  to go and every kept one must still have its file.
- **Tier tables** live in `skills.js` (`BLITZ`, `FEUER`, `PFLANZE`) and are rendered by `tiered(rows, fn)` into
  `descTiers`. Ladders rise, no two tiers are byte-identical (guarded in the faction test).
- **Legendaries have no tier**, at most two effects, and every one of them has a numeric dial. §6.12 is the record
  of why: four legendaries had no dial at all and could not be banded until one was introduced.
- **Faction module** under `src/game/factions/` for the passive and the skill maths — `fire.js`, `lightning.js`,
  `plant.js`. Eis has `glacier.js` instead, one level up. Whether it moves is a technical decision, not the owner's.
- **Passive text** in `src/i18n/de.js` under `skill.passive.<arch>`, filled from constants in `SkillSelect.jsx`.
  Numerals as words come from `numWord` in `skills.js` — one source, so texts do not drift when a constant changes.

## 5. The measurement harness — and one trap that cost a round

- `SIM_SKILL_LEGENDARY_PER_SLOT=0 npm run sim -- --mode duel --arch fire,lightning,plant,ice --runs 200`
  — mono per faction, the split, the random baseline. **This is the parity measurement.** Fixed policies, fixed
  seeds, comparable across runs.
- `npm run sim -- --mode skills --arch <list> --explore 900 --runs 120` — paired ablation per skill, the way dead
  skills were found. Run it twice: once mono, once mixed. A skill can be dead in a mixed build and carry a mono one
  (that is a Bekenntnis-Skill, not a defect — the Plant growth skills are exactly that, decided in §6.22).
- `npm run sim -- --mode legendaries --arch <list> --table sim/out/legtable.json` — **always pass `--table`.**
  Without it every run rolls its own greedy value table and untouched legendaries swing by a factor of two; §6.12
  documents the control run that proved it. With a shared table the residual wobble is ±10 percentage points.
- `SIM_SKILL_LEGENDARY_PER_SLOT=0 N=100 node sim/probes/plant-overlap.mjs` — model for a diagnostic probe. Use it
  as a template if Eis needs one; it answers „where does the score actually come from" per win.
- **Greedy medians wobble; duel rows do not.** Quote duel numbers when comparing across sessions.

## 6. Known, unfinished, honest

- **The Plant's overlap concentration** (§6.22 C): 8 % of wins carry 45 % of the score, because the same overlap
  that creates the per-formation flats also multiplies them (`OVERLAP_BONUS[4] = ×3`). It is independent of the
  bloom weight. Nobody asked for it to be fixed; it is on record. If Eis builds clusters, the same coupling may
  appear there — worth checking early rather than discovering it after tuning.
- **Three of the Plant's four growth skills are deliberately Mono-Skills** (§6.22). Do not „fix" them.
- The en/es/zh catalogues are dormant and carry stale keys for cut skills. Only `de` is maintained.

## 7. Start prompt (German, for the owner to paste)

```
Branch exp, Repository-Checkout dieser Session. Wir machen mit Eis weiter — die letzte Fraktion.

Lies zuerst AGENTS.md, dann docs/workstreams/skill-rework/HANDOFF-eis-build.md, dann docs/skill-rework.md §1
(Stufenmodell und Angebot) und §6.1/§6.2 (wie die Pflanze aufgebaut wurde — als Muster, nicht als Vorlage).
Danach docs/eis-rework.md: das ist das Design des Gletscher-Umbaus, aber aus einem anderen Workstream und mit
einem anderen Ziel-Branch. Prüfe jede Aussage daraus gegen den Code, bevor du sie benutzt.

Aufgabe, in dieser Reihenfolge:
1. Bestandsaufnahme. Was macht Eis heute wirklich — glacier.js, die 21 Skills, die 21 Testdateien. Was davon ist
   tragfähig, was ist tot, was widerspricht dem exp-Rework. Als Befund, ohne etwas zu ändern.
2. Vorschlag für die Struktur: 15 Skills mit vier Stufen plus 3 Legendäre, und was aus den heutigen 21 wird.
   Je Skill eine Zeile: bleibt / umgebaut / gestrichen, mit Begründung.
3. Erst wenn ich das abgenommen habe: bauen, in Etappen, jede Etappe mit grünen Gates und Push auf exp.
4. Danach Angebot (SKILL_OFFER_ARCHETYPES) und Parität gegen Feuer 7,75M / Blitz 7,43M / Pflanze 8,36M.

Regeln: keine spielentscheidenden Entscheidungen ohne mein Ja — Werte, Texte, Mechaniken sind Vorschlag.
Immer erst Planung, gemessen wird nur auf mein ausdrückliches Go; keine Sim-Läufe nebenbei. Kein Direkt-Score,
keine Deckel, kein enabler, kein Eingriff in die Aufstellungsordnung, ein Begriff je Sache. Nur exp pushen, keine
PRs, kein Force-Push, keine neuen Glyphen oder Dependencies ohne Frage.

Gates vor jedem Push: npm test, npm run lint -- --max-warnings=0, npm run build, VITE_PREVIEW=1 npm run build,
npm run gen:db, bei Textänderungen npm run loc:export. Kommt Eis ins Angebot, muss der Balance-Guard neu
zentriert werden.

Doku in docs/skill-rework.md §5.x plus Protokollzeile. Berichte auf Deutsch, so lang wie ein Handybildschirm.
```
