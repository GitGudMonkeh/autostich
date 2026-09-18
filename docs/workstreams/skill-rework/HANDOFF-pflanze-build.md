# Handoff — building the Pflanze faction on `exp`

For the next Claude session. The design is finished and signed off by the owner; what remains is the build.
Engineering English per `AGENTS.md`; the owner's words are quoted in German, and the start prompt at the end is
German because the owner pastes it verbatim.

## 1. Where things stand

- **Branch `exp`**, HEAD `0aa53a67`. Only `exp` is pushed — never `dev`, `test`, `main`; no pull requests, no
  force-push. The session works in the repository root checkout it was opened in.
- **Feuer and Blitz are done**: 14 skills each with four tiers, four legendaries each, texts passed, the KONSUMENT
  chip removed from the skill cards. Last rounds: §7.27 Brandschneise, §7.28 Lichtbogen and the crit rule (chance
  caps at 100 %, each point above gives +0.01× multiplier).
- **Pflanze is fully designed on paper and not built at all.** The contract is `docs/skill-rework.md` **§6.1 to
  §6.8**. Read those six sections before touching code; everything below assumes them.
- Gates were green at HEAD: `npm test` (149 files, 2319 tests), `npm run lint -- --max-warnings=0`,
  `npm run build`, `VITE_PREVIEW=1 npm run build`, `npm run gen:db`, `npm run loc:export`.

## 2. The owner's rules — binding, quoted

- „treffe niemals mehr solche Entscheidungen die spielentscheidend sind, du kannst es als Vorschlag bringen aber ich
  ersetze dich wenn du es nochmal ohne meine ausdrückliche Erlaubnis entscheidest"
- **„erst design, dann Startwert, dann messen wenn ich es sage."** Do not run sims unasked — the owner called out
  the cost. Starting values are proposed, not measured, until they say measure.
- „kein Freund von Deckel, lieber Werte niedriger" · „Raritäten dürfen nicht mit den genau gleichen Werten" ·
  Episch has a small extra or is very strong · one effect per normal skill · **no direct score** · **no `enabler`
  amplifiers** · not below 14 skills per faction · **no skill touches the draw order**.
- Reports in German, phone-screen length. Commit messages and code comments in English.
- Two corrections the owner had to make in the design phase, worth remembering as failure modes: I claimed the
  Wechsel dies in a fully green deck (**wrong** — `markWechsel` reads card values, not colour), and I used three
  different words for the same thing in skill texts. **One word for one thing; check claims in the code first.**

## 3. What to build — the contract in one page

**Passive „Wachstum" (§6.2).** Growth per card, only upwards. A win gives the winning card **+1 growth, plus +1 per
active formation at its position**. Losses give nothing. **Green at 30**, **blooming at 75** (starting values).
Green is a **colour** (`card.green`, suit „G") — the owner chose that deliberately; a fully green deck is the goal
of a committed build. Blooming carries the base score per green card in its formation.

**The 15 skills (§6.7 for the list, §6.8 for the four tiers each).** Categories: growth 5, levers 4, score 5,
combination 1. The four levers change **what counts as a formation** and use hooks that already exist:

| Lever | Hook in `src/game/formations.js` |
| --- | --- |
| Spalier — open segment borders next to green cards | `canExtendSeg` / `segInfo.isOpen` |
| Wildwuchs — blooming cards count as jokers | `isJoker` (per position, passed into every mark* function) |
| Lücke — a green run may skip a foreign card | `gap.run` / `gap.seg` in `markRuns` |
| Überwucherung — green formations need one card less | `minMembers` (runs) / `minLen` (Wechsel) |

**Four legendaries (§6.5):** Baumreihe (blooming cards form a position-free Wiederholung — trigger swapped from
value 11), Weltenbaum, Mutterbaum, Ewiger Frühling (full green ⇒ all cards blooming). None pays direct score.

## 4. What has to go — the old plant economy

All of this is in the code today and contradicts §6.1:

| What | Where |
| --- | --- |
| Value from growth, auto-win at value 11 | `WURZELSCHLAG_PER_GROWTH`, `PLANT_VALUE_CAP`, `PLANT_ANCHOR_VALUE`, the passive text `skill.passive.plant` |
| **Direct score** (post-stack, capped, commitment-scaled) | `plantDirect` in `engine.js` — Wurzeltiefe's depth term, Blüte's field term, Weltenbaum, Mutterbaum, Ewiger Frühling |
| Own multipliers | `plantFormMult` (Photosynthese, Baumreihe) |
| Trimmen | `TRIM_STEP`, `TRIM_CAP`, `trimMult`, the `TRIMMEN` clause on six skills, `trimCount` in the reducer |
| Commitment scaling | `plantCommit` / `commitScale` in the plant branch |
| Opponent deck | Ausläufer, Rhizom, Erntedank and `colonized` |
| `enabler` amplifiers | six skill definitions carry `enabler` |
| 17 skill defs + their flags | `SK_PLANT_02` … `SK_PLANT_18` in `skills.js`, each with a boolean flag read in `engine.js` |

The plant block in `engine.js` sits around lines 496–640 (`plantFlat`, `plantFormMult`, `plantDirect`, growth,
ripening, colonies) — that is the piece to replace with a module. Follow the Feuer/Blitz pattern:
`src/game/factions/plant.js`, pure logic, tier tables in `skills.js` (`PFLANZE`), read via a `plantParam` helper,
all transitions immutable.

## 5. Suggested stages (agent's call, owner may reorder)

1. **Passive and state.** `plant.js` with growth, the three states and the constants; old economy out; engine and
   reducer wired; `PlantBar.jsx` (219 lines, still shows the old currencies) reduced to growth and the two
   thresholds. Gates green, nothing else changed.
2. **The 15 skills** with tier tables, texts (§6.8 wording is final — „je grüner Karte darin", „blühende Karten
   zählen doppelt"), glossary entries, `de.js`, `loc:export`.
3. **The four levers into `formations.js`.** The risky stage: the formation engine is read by many tests and by
   Eis. Do not change existing behaviour when no plant skill is held — prove it with a counter-check.
4. **The four legendaries.**
5. **Offer pool and sim.** `"plant"` into `SKILL_OFFER_ARCHETYPES`, door policies and sim modes extended, then —
   **only on the owner's word** — the measuring round.

Emblems: all 21 files exist under `src/assets/skills/plant/` named by the old skills. Ten slots get new names;
rename with `git mv` (the ID prefix is what `skillArt.js` reads, the lowercase part is a reading aid).

## 6. The measuring list (for later, not now)

Written down in §6.8 so nobody re-derives it: how many blooming cards a run actually has (Wildwuchs epic and the
four epic extras hang on it), how long green colour blocks really get (Blätterdach's rate, and the **open cap
question** from §6.2 — the owner deferred it until data), how often Spalier epic turns the deck into one row, then
parity against Feuer and Blitz in `--mode duel` and the balance band re-centering.

## 7. Traps

- **Source-text ratchets** read `src/**` as text; a cosmetic change can turn tests red (`AGENTS.md`, *Hazard*).
- `ecke.test.js` times out under CPU load — re-run it idle before calling it red.
- Formations are recomputed only at position 0; a test at position ≥ 1 must inject `state.formations`.
- Any player-visible text change needs `npm run loc:export`; the inactive catalogues (`en`, `es`, `zh`) stay
  untouched and keep their old entries.
- The balance guard (`test/sim-balance-guard.test.js`) will fail once plant enters the offer pool — re-centre it
  **after** the measuring round, with the numbers in the spec, never to make a red test green.
- A crit-**chance** change cannot be judged by the duel median (§7.28 F); the paired greedy ablation is the arbiter.

## 8. Start prompt for the next session (German, paste as is)

```text
Branch exp, Repository-Checkout dieser Session. Lies zuerst AGENTS.md, dann
docs/workstreams/skill-rework/HANDOFF-pflanze-build.md, dann docs/skill-rework.md §6.1 bis §6.8 — das ist der
fertige Entwurf der Pflanze, von mir abgenommen. Feuer und Blitz sind fertig, Pflanze ist noch gar nicht gebaut.

Aufgabe: Pflanze bauen, in Etappen, jede Etappe mit grünen Gates und Push auf exp. Etappe 1 ist das Passiv
(Wachstum je Karte: +1 je Sieg und +1 je aktiver Formation; grün ab 30, blühend ab 75) in einem eigenen Modul
src/game/factions/plant.js, dazu die alte Ökonomie raus: Wertableitung und Auto-Sieg bei 11, Direkt-Score,
Trimmen, Bekenntnis-Skalierung, Kolonisierung des Gegnerdecks, die enabler-Verstärker. Danach die 15 Skills mit
ihren vier Stufen, dann die vier Formationshebel, dann die Legendären, dann Angebot und Sim.

Regeln: keine spielentscheidenden Entscheidungen ohne mein Ja — Werte, Texte, Mechaniken sind Vorschlag. Erst
Design, dann Startwert, gemessen wird nur auf meine Ansage; keine Sim-Läufe nebenbei. Kein Direkt-Score, keine
Deckel, kein enabler, kein Eingriff in die Aufstellungsordnung, ein Begriff je Sache. Nur exp pushen, keine PRs,
kein Force-Push, keine neuen Glyphen oder Dependencies ohne Frage. Gates vor jedem Push: npm test,
npm run lint -- --max-warnings=0, npm run build, VITE_PREVIEW=1 npm run build, npm run gen:db, bei Textänderungen
npm run loc:export. Doku in docs/skill-rework.md §6.x plus Protokollzeile. Berichte auf Deutsch, so lang wie ein
Handybildschirm.
```
