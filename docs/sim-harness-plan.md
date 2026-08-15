# Autostich — Simulations-Harness (Balancing) · Empfehlung / Entwurf

**Status:** **S0–S4 + Balance-Guard umgesetzt** auf Branch `test/sim` (eigenes Worktree `../autostich-sim`, auf die aktuelle Balance `Autostich_Test`@3d00602 rebased). `npm run sim -- --mode baseline|explore|eval`. Offen: S5-Ressourcen-Metriken, Shop-Items in die UCB-Rangliste, CSV/HTML-Report. Ursprünglich vor dem Shop-System (#107) verfasst — durchgehend auf den aktuellen Build (44 Durchläufe, Shop-Phase, Münzökonomie) nachgezogen.
**Zweck:** Grundlage, aus der ein Issue auf `Autostich_Test` geschnitten wird; zugleich Referenz für den bereits laufenden S0-Harness.
**Autor-Hinweis:** Dies ist eine *opinionierte Empfehlung* (bewusste Vorentscheidungen), keine Optionssammlung. Offene Punkte stehen gesammelt am Ende (§11).

---

## 1. Ziel & Fragestellungen

Eine headless Simulation, die den aktuellen (und künftigen) Build tausendfach durchspielt, um Balancing-Daten zu erzeugen. Sie soll konkret beantworten:

- **Build-Balance:** Welche Build-Variationen sind zu stark / zu schwach?
- **Karten/Perk-Balance:** Welche Karten, Perks oder Skills brauchen Buffs/Nerfs?
- **Coverage:** Zu jeder Option genug Daten haben — auch für seltene/legendäre.
- **Regressionsschutz:** Versehentlichen Power-Creep bei Tuning-Änderungen früh erkennen.

**Nicht-Ziel:** ein perfekter „Bot". Die Sim liefert Signal + Ranking, das finale Balance-Urteil bleibt beim Dev.

---

## 2. Warum der aktuelle Build das hergibt

- **Reine, deterministische Logikschicht** (`src/game/`): kein React/DOM/`Math.random`/`Date`; Reducer und `resolveTrick` pure, Zufall als injizierter `rng`. → läuft headless in Node, tausende Runs/s.
- **Seedbarer PRNG** `makeRng(seed)` (mulberry32, `deck.js`) → gleicher Seed + gleiche Policy = exakt gleicher Score. Reproduzierbarkeit gratis.
- **Feste Run-Länge, kein Tod:** `MAX_CYCLES(44) × TRICKS_PER_CYCLE(40) = 1760` Stiche, dann `gameover` (mit Zeitsegment-Item ein Durchlauf 45 Stiche → bis 1804). Alle Runs direkt vergleichbar, Terminierung garantiert.
- **Neutraler Gegner** (gespiegeltes Deck, pro Durchlauf gemischt, keine KI) → einzige Variable ist der eigene Build. Analyse bleibt sauber.
- **Score** ist bereits die Zielgröße (Geist/Leaderboard basieren darauf).
- **Fester Entscheidungsplan** (`DECISION_SCHEDULE`, 44 Einträge): welche Entscheidung VOR welchem Durchlauf kommt (stat/perk/skill/shop/formation), ist deterministisch — nicht zufällig. Die Sim durchläuft denselben Plan wie das echte Spiel.

**Der Knackpunkt** ist nicht die Ausführung, sondern die **Entscheidungs-Policy**: Ein „Build" = die Wahl an den Entscheidungsphasen `levelup` (`PICK_STAT` · `PICK_PERK` · `PICK_SKILL`/`DECLINE_SKILL`), `target` (`CONFIRM_TARGET`), `formation` (`SWAP_CARDS`/`UNDO_SWAP`/`CONFIRM_FORMATION`) **und — seit Shop-System #107 — `shop` (`BUY_ITEM`/`LEAVE_SHOP`) samt `shop-target`-Unterfluss (`SHOP_TARGET_*`/`_CONFIRM`/`_CANCEL`)**. Die Münzökonomie (Einkommen, 8 Shops, 32 Items) ist damit eine eigene Build-Dimension. Die Policy-Qualität ist die Obergrenze der Aussagekraft.

---

## 3. Empfohlene Architektur

```
sim/
  run.js          # ✅ runOne(seed, policy, mem?) → telemetry  (headless Treiber + finalize)
  policies/
    random.js     # ✅ Baseline (navigiert ALLE Phasen inkl. shop)             (S0)
    ucb.js        # ✅ UCB1-Explore-Wähler (Archetyp-Bucket)                   (S2)
    fixed.js      # ✅ prioritätsgetriebener Build + {drop}-Ablation           (S3)
  memory.js       # ✅ Cross-Run-Bandit (arms n/sum, peek, log1p-Reward)       (S2)
  metrics.js      # ✅ Per-Karte-Ledger aus dem lastTrick-Strom                (S1)
  eval.js         # ✅ computeEval: Explore → Priority → gepaarte Ablation     (S3)
  formation.js    # ✅ greedy Formations-Solver (Reducer-Orakel, rng-frei)     (S4, opt-in)
  shop-policy.js  # ✅ Shop-Käufe inkl. Ziel-Items (canComplete-Guard)         (S4, opt-in)
  batch.js        # ✅ --mode baseline|explore|eval → Report + JSON
  out/            # generierte JSON-Reports (gitignored)
test/sim-*.test.js # ✅ Determinismus, Ledger-Invarianten, Explore/Eval, Solver/Shop, Balance-Guard
```

**Umgesetzt (S0):** `sim/`-Ordner im Repo, importiert direkt aus `src/game/` (keine Kopie), läuft über `npm run sim -- --runs N --seed S --out …`. `runOne` ist bewusst schlank: `reducer(null, {type:"START_RUN", rng})`, dann in `play` `RESOLVE_TRICK`, sonst `policy.act(...)` — und bricht hart ab, falls eine Policy-Action keinen Fortschritt bringt (`next === state`), statt endlos zu drehen. Ab S2 nimmt `runOne` ein optionales `mem` (Bandit) entgegen und bucht am Run-Ende den Score.

---

## 4. Treiber

Ein durchgehender, geseedeter `rng` für den ganzen Run (gleiche Referenz für alle Dispatches → Stream deterministisch):

```js
import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";

export function runOne(seed, policy, memory) {
  const rng = makeRng(seed);
  let s = reducer(null, { type: "START_RUN", rng });   // START_RUN ignoriert den State
  const tel = newTelemetry();
  let guard = 0;
  while (s.phase !== "gameover" && guard++ < 100_000) {
    if (s.phase === "play") {
      s = reducer(s, { type: "RESOLVE_TRICK", rng });
      observe(tel, s.lastTrick);                        // pCard.id, result, gained, isCrit, formations…
    } else {
      s = reducer(s, policy.act(s, rng, memory));       // eine Entscheidung pro Aufruf
    }
  }
  finalize(tel, s);                                     // score, wins, crits, build = [...s.perks, ...s.skills]
  return tel;
}
```

Kein Engine-Eingriff nötig, um zu starten: `state.lastTrick` trägt bereits alles fürs Per-Karte/-Effekt-Ledger; Karten haben stabile `id`s.

---

## 5. Policy-Interface + UCB-Wähler (Explore)

Die Policy schaut auf `phase` und welches Angebot gefüllt ist; der UCB-Wähler ist die Strategie in perk/stat/skill.

Phasen-Set (Stand jetzt): `menu` · `play` · `levelup` · `target` · `formation` · `shop` · `shop-target` · `gameover`. Der Treiber fährt `play` selbst (`RESOLVE_TRICK`); die Policy bedient alle übrigen außer `menu`/`gameover`.

```js
// policies/ucb.js
export const ucbPolicy = (opts = {}) => ({
  act(s, rng, mem) {
    switch (s.phase) {
      case "levelup":
        if (s.statOffer)  return { type: "PICK_STAT", statId: ucbPick("stat", s.statOffer, s, mem, opts) };
        if (s.skillOffer) return skillAction(s, rng, mem, opts);            // inkl. replaceId / DECLINE_SKILL
        if (s.offer)      return { type: "PICK_PERK", perkId: ucbPick("perk", s.offer, s, mem, opts), rng };
        return { type: "RESOLVE_TRICK", rng };
      case "target":      return { type: "CONFIRM_TARGET", cardIds: chooseTarget(s, rng) };
      case "formation":   return formationStep(s, rng, mem, opts);          // ein Swap ODER CONFIRM pro Aufruf
      case "shop":        return shopStep(s, rng, mem, opts);               // ein BUY_ITEM ODER LEAVE_SHOP pro Aufruf (#107)
      case "shop-target": return targetStep(s, rng, mem, opts);            // ein SHOP_TARGET_* ODER _CONFIRM/_CANCEL pro Aufruf
    }
  }
});

function ucbPick(kind, offer, s, mem, { c = 1.4, bucket } = {}) {
  const N = mem.totalPicks(kind) + 1;
  let best = null, bestU = -Infinity;
  for (const id of offer) {
    const key = armKey(kind, id, bucket && bucket(s));                 // optional Kontext-Bucket (Archetyp!)
    const a = mem.arm(key);                                            // { n, sum }
    const mean = a.n ? normalize(a.sum / a.n) : 0;
    const explore = a.n ? c * Math.sqrt(Math.log(N) / a.n) : Infinity; // ungesehen → sicher probieren
    const u = mean + explore;
    if (u > bestU) { bestU = u; best = { id, key }; }
  }
  mem.pulled(kind, best.key);   // merken; Reward (Run-Score) am Run-Ende zuweisen
  return best.id;
}
```

- `explore = Infinity` für ungesehene Arme ist **„noch nicht oft genug gewählt → wird gewählt"** — der Mittelwert-Term baut gleichzeitig die Stärke-Rangliste.
- `skillAction`: volle Slots → `replaceId` wählen bzw. Konsumenten-Ersatz; „ablehnen" (`DECLINE_SKILL`, braucht `rng`) ist selbst ein Arm. **S0-Baseline** nimmt nur in freie Slots auf (Archetyp-Cap `MAX_ARCHETYPES`, Konsumenten-Exklusivität geprüft) und lehnt sonst ab — Slot-Ersetzung ist S2/S5.
- `formationStep`: greedy `SWAP_CARDS {i,j}`, solange Energie da ist und `s.formations` besser wird, sonst `CONFIRM_FORMATION`. Mit Eis (#93) kommen kostenlose Frosttausche als zusätzliche Züge dazu — gleiche Schleife. **S0-Baseline** bestätigt sofort (kein Swap) — der Solver ist S4.
- `shopStep` (#107): pro Aufruf **ein** `BUY_ITEM {offerId, rng}` oder am Ende `LEAVE_SHOP`. Terminierung ist garantiert, weil jeder Kauf das Angebot (`purchasedOfferIds`) verkleinert und Münzen abzieht. **S0-Baseline** kauft gierig alle bezahlbaren Items OHNE Zielauswahl (`!SHOP_ITEM_DEFS[itemId].target`) und lässt die `shop-target`-Phase damit außen vor; eine echte Kaufpolitik (Ziel-Items, Priorisierung, Sparen) ist ein eigenes Arbeitsthema (S3+).
- `targetStep` (`shop-target`): die `shopTarget`-Auswahl gemäß `def.target`-Spec füllen (`cards`/`color`/`segment`/`position`/`colorPair`/`boundary`/`formationType`/`category`/`offer`), dann `SHOP_TARGET_CONFIRM`, sonst `SHOP_TARGET_CANCEL`. S0-Baseline betritt die Phase nicht (Sicherheitsnetz: `_CANCEL`).

---

## 6. Zwei Modi

**Explore** — adaptiv, geteiltes `memory`, Ziel: Coverage + Kandidaten + grobe Rangliste.
**Eval** — kein Gedächtnis, feste Policies + **paarweise Ablation** auf denselben Seeds → unverzerrte Verteilungen und echte Marginalwerte.

```js
// batch.js
// 1) EXPLORE
const mem = newMemory();
for (const seed of exploreSeeds) runOne(seed, ucbPolicy({ bucket: byArchetype }), mem);
report(mem);                                    // untergesampelte Arme, Mean-Ranking, Konfidenz

// 2) EVAL (paired → geringe Varianz)
for (const seed of evalSeeds) {
  const full = runOne(seed, fixedPolicy(buildX), null);
  const abl  = runOne(seed, fixedPolicy(buildX, { drop: "PERK_D5" }), null);
  record(buildX, "PERK_D5", full.score - abl.score);   // Marginalbeitrag
}
```

Explore findet Kandidaten (inkl. seltener, die die Gewichtung hochzieht); **Eval urteilt**. Das Gedächtnis bleibt strikt aus der Eval-Phase.

**Seltene/legendäre Optionen**, die kaum *angeboten* werden: primär mehr Explore-Seeds (billig). Nur für die reine Ceiling-Frage optional eine Sim-Variante von `buildOffer`, die eine Ziel-Option ins Angebot zwingt — **klar als „was wäre, wenn baubar" gelabelt**, nicht als reale Häufigkeit.

**Umgesetzt für den Legendär-Pool: `npm run impact`** (`sim/perk-impact.mjs`). Mehr Explore-Seeds allein reichen dort nicht — bei `PERK_LEGENDARY_BASE = 0,03` enthalten nur ~22 % der Läufe überhaupt einen legendären Perk, und die Hälfte des Pools erscheint in 40 Läufen kein einziges Mal. Das Skript hebt darum `SIM_PERK_LEGENDARY_BASE` an (Default 0,7) und ablatiert jeden Legendären gepaart gegen einen gemeinsamen Referenz-Arm. Das ist genau das oben gemeinte „was wäre, wenn baubar": es verzerrt die **Häufigkeit** (ein separater Knopf), nicht die **Stärke** des einzelnen Perks. Weil `MAX_LEGENDARIES_PER_OFFER = 1` gilt, liegt je Angebot höchstens ein Legendäres — der `full`-Arm ist dadurch für alle Perks derselbe und wird einmal gerechnet (Kosten `(1 + n) × runs` statt `2n × runs`).

```
npm run impact                              # 14 Legendäre, 80 Seeds, Explore-Referenzbuild
npm run impact -- --runs 200 --explore 400  # mehr Statistik
npm run impact -- --only L_HENK,L_PATT      # schneller Regressionscheck nach einer Tuning-Änderung
npm run impact -- --only L_VAB --frontload 1  # gegen den Eröffnungs-Missbrauchsfall messen
npm run impact -- --only L_VAB --pickfrom 30  # Einfluss des Pick-Zeitpunkts (erst ab Durchlauf 30 wählbar)
```

**`--frontload`** fährt statt des Formations-Solvers `frontLoadFormationStep` (sim/formation.js): die stärksten Karten
werden auf die ersten Positionen arrangiert. Das ist die OBERE SCHRANKE für Eröffnungs-Perks, kein realistischer
Spielstil — er maximiert die Eröffnungs-Winrate, nicht den Score, und kostet im heutigen Build ~34 % Gesamt-Score
(Sweeps 16→38/50, Median 38,2M→25,2M). Entsprechend interpretieren: Worst Case, nicht Erwartungswert.

**`--pickfrom N`** sperrt den gemessenen Perk bis Durchlauf N (in BEIDEN Armen, die Ablation bleibt gepaart). Damit
wird sichtbar, ob ein Perk früh oder spät erworben mehr wert ist. Ein *steigender* Wert mit späterem Pick ist ein
Warnsignal: er bedeutet meist einen Deckel oder ein Frühzeitfenster, das den Perk nach kurzer Zeit entwertet.

Urteilsspalte ist `typ.×` (typischer multiplikativer Effekt, bedingt auf „im Spiel"), verglichen gegen das Ziel-Band aus `constants.js`. `anwendb.`/`n` sind **Kontext-Häufigkeit, keine Stärke** — unter ~15 anwendbaren Läufen markiert das Skript die Zeile selbst als „dünn".

---

## 7. Interpretation — die eigentliche Schwierigkeit

Nicht das Gewichten ist schwer, sondern das Deuten der Zahlen:

- **Kontextabhängigkeit:** Perk-Wert ist kein Skalar (Blitz-Konsument ohne Generator = tot; Feuer-Verbrennung ohne Marge = nutzlos). → nach **Archetyp/Build-Kontext bucketen** und/oder **Marginalbeitrag per Ablation** statt Roh-Korrelation.
- **Feedback-Bias:** mit Score steuern *und* mit denselben Runs urteilen verzerrt. → Explore- und Eval-Runs trennen.
- **Korrelation ≠ Beitrag:** „Runs mit X scoren höher" kann Angebots-Artefakt sein. → Ablation.
- **Heavy Tails:** Score ungedeckelt, Crit/Serie multiplizieren. → in **Median/p90/Perzentilen** denken, `normalize()` (z. B. `log1p`) gegen die Tails, damit `c` sinnvoll ist.

**Merksatz:** UCB-Means = Coverage-Treiber + grobe Rangliste; **Ablation = Urteil.**

---

## 8. Zuerst instrumentieren (0 Engine-Änderungen)

Alles aus `lastTrick`/`state`: Score · wins/losses/ties · crits · bestStreak · bestTrickScore · **Per-Karte** (Auftritte, Winrate, Score-Anteil, Crits) · Formations-Aktivierungsrate · **Münz-/Shop-Kennzahlen** (Endmünzen, gekaufte Items, ungenutzte Münzen — #107) · **Build-Fingerprint** (`sorted(perks)+sorted(skills)+sorted(archetypes)+Stat-Vektor`) als Bucket-Key. Später 1–2 winzige Hooks für Ressourcen-Uptime (Hitze/Ladung, Konsumenten-Trigger) — kommen mit #93 ohnehin.

**S0 liefert** (aus dem Endzustand): `score` · `tricks` · `cycles` · wins/losses/ties · `crits`/`critBonusScore` · `bestStreak`/`bestTrickScore` · `coins` · `build{perks,skills,archetypes,stats}`.

**S1 ergänzt** (aus dem `lastTrick`-Strom, `sim/metrics.js`): **Per-Karte-Ledger** je `card.id` (Auftritte, Winrate, Crits/Sieg, Score-Anteil, Ø-Score/Sieg) · **Formations-Siegquote** (`formationWinRate`) · **Build-Fingerprint** (`P:…|S:…|A:…|St:…`) als Bucket-Key. `batch.js` zieht die Karten-Ledger über alle Runs zu `cardAgg` zusammen (nach Score-Anteil sortiert, Top-/Schwächste-Ausgabe) und lässt das schwere Per-Run-Ledger aus dem JSON (aggregiert in `cardAgg`). **Beobachtung sofort:** auf der Pre-#121-Balance zeigt der Mean gegenüber dem Median eine extreme Heavy-Tail-Spreizung (Feuer-Runaway) — genau der Fall, für den §7 Median/p90 statt Mean fordert.

---

## 9. Determinismus & Reproduzierbarkeit

- Spiel-Schicht bleibt **pure**; Adaptivität lebt **ausschließlich** im Harness/`memory`.
- Ein `rng = makeRng(seed)` pro Run, gleiche Referenz für alle Dispatches.
- Cross-Run-Gewichte machen den Harness zustandsabhängig (Run K hängt von 1..K-1 ab) → für reproduzierbare Batches die **Seed-Sequenz** mitseeden.
- **Balance-Guard (Vitest):** „Random-Policy, 200 fixe Seeds → Median-Score im Band X" fängt Power-Creep.

---

## 10. Empfohlener Umsetzungs-Fahrplan (→ Issue-Checkliste)

- [x] **S0 — Skelett:** `runOne` + Random-Policy (navigiert alle Phasen inkl. `shop`) + JSON-Output (`npm run sim`) gegen den aktuellen Build. Determinismus-Test grün (gleicher Seed → identische Telemetrie), Aggregat Median/p90. ✅ auf `test/sim`.
- [x] **S1 — Telemetrie:** Per-Karte-Ledger aus dem `lastTrick`-Strom (`sim/metrics.js`), Cross-Run-Aggregation (`cardAgg`), `formationWinRate`, Build-Fingerprint als Bucket-Key. Ledger-Invarianten getestet (Σ Auftritte = Stiche, Σ wins/score = Run-Aggregate). ✅ auf `test/sim`. Effekt-Ledger (Perk-/Skill-Trigger, Ressourcen-Uptime) noch dünn — vertieft sich mit S5.
- [x] **S2 — Explore:** UCB1-Policy (`sim/policies/ucb.js`) + `memory` (`sim/memory.js`) + Archetyp-Bucket → `--mode explore`: Coverage + Mean-Ranking je stat/perk/skill (untergesampelte Arme n<5 markiert). Determinismus getestet. ✅ auf `test/sim`.
- [x] **S3 — Eval:** `fixedPolicy` (`sim/policies/fixed.js`, prioritätsgetrieben + `{drop}`) + `computeEval` (`sim/eval.js`): Explore leitet Priority-Build ab, `--mode eval` urteilt per **gepaarter Ablation auf disjunkten Seeds** → Marginal ± 95%-CI. Getestet. ✅ Klarer Befund: `SK_FIRE_08` Δ ≈ +1 Mio (hochsignifikant), während der explore-Top-Arm `L2` marginal *n.s.* ist — Korrelation ≠ Beitrag, exakt wie §7.
- [x] **S4 — Formations-Solver + Shop-Kaufpolitik:** greedy `SWAP_CARDS`-Solver (`sim/formation.js`, Reducer-Orakel, rng-frei) + Shop-Käufe inkl. Ziel-Items (`sim/shop-policy.js`, `canComplete`-Guard gegen Kauf→Abbruch-Schleifen). **Opt-in** in `fixedPolicy` (`--formations`/`--shop`), Default AUS wegen O(n²)-Kosten. Getestet (strikt verbessernder Tausch je Phase; voller Run terminiert). ✅
- [~] **S5 — Mit #93 mitwachsen:** Feuer/Eis-Archetypen sind über die Archetyp-Buckets bereits abgedeckt (S2/S3 sehen sie); dedizierte Ressourcen-Metriken (Hitze/Ladungs-Uptime) + eigene Archetyp-Policies stehen noch aus.
- [x] **Balance-Guard** (`test/sim-balance-guard.test.js`): Random-Policy, 40 feste Seeds → **Median UND Mean** im Band (Median gegen Heavy Tails robust, Mean fängt Tail-Runaway). ✅

**Reihenfolge-Empfehlung:** S0–S4 + Guard stehen auf `test/sim` (Worktree `../autostich-sim`, auf aktuelle Balance rebased). Offen: S5-Ressourcen-Metriken, Shop-Items in die UCB-Rangliste aufnehmen (aktuell nur stat/perk/skill), CSV/HTML-Report.

---

## 11. Offene Entscheidungen (vor dem Issue zu klären)

1. ~~**Ort/Form:** eigener `sim/`-Ordner + `npm run sim`.~~ ✅ **entschieden & umgesetzt in S0.**
2. **Ausgabeformat:** S0 schreibt JSON. CSV / kleiner HTML-Markdown-Report noch offen — reicht JSON fürs erste?
3. ~~**Vitest-Balance-Guard:**~~ ✅ umgesetzt: Median- UND Mean-Band über 40 feste Seeds (`test/sim-balance-guard.test.js`). Bei absichtlicher Balance-Änderung neu zentrieren.
4. **`normalize()`:** `log1p` (Empfehlung) vs. laufende Skala. (Erst ab S2 relevant.)
5. **UCB-`c` & Explore-Seed-Zahl:** Startwerte (`c≈1.4`, z. B. 5–20k Seeds) — im Betrieb justieren.
6. **Sim-only Offer-Injection** (Ceiling-Modus): jetzt einbauen oder später? (Empfehlung: später, erst wenn Coverage über Volumen nicht reicht.)
7. **Shop-Kaufpolitik (#107):** wie weit soll die Sim den Shop „spielen" (nur bezahlbare Nicht-Ziel-Items wie in S0, oder Ziel-Items + Priorisierung + Sparen)? Eigenes Thema für S3.
8. **Timing vs. #93:** S1–S3 jetzt weiter oder bis F0/F1 warten? (Empfehlung: jetzt weiter.)

---

## 12. Bewusste Nicht-Ziele (Scope-Grenzen)

- Kein perfekter Bot / kein aufwändiges RL — UCB + Ablation reichen fürs Balancing-Signal.
- Kein Gegner-Strategie-Modell (Gegner bleibt neutral).
- Keine Änderung an Score-/Stich-/Formationsregeln durch die Sim (nur Beobachtung; Ausnahme klar gelabelte Ceiling-Offer-Injection).
- Determinismus-Invariante der `game/`-Schicht bleibt unangetastet.
