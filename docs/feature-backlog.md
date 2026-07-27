# Autostich — Feature-Backlog (Sammelphase)

> **GitHub-Issues:** FB-1 … FB-6 → [#161](https://github.com/GitGudMonkeh/autostich/issues/161) · FB-7, FB-8 → [#169](https://github.com/GitGudMonkeh/autostich/issues/169) · FB-9 → [#170](https://github.com/GitGudMonkeh/autostich/issues/170) · FB-10 → [#172](https://github.com/GitGudMonkeh/autostich/issues/172) · FB-11 → [#174](https://github.com/GitGudMonkeh/autostich/issues/174) · FB-12 → [#177](https://github.com/GitGudMonkeh/autostich/issues/177).
>
> Nicht-FB-Issues aus diesen Sessions: Musik-Playlist → [#171](https://github.com/GitGudMonkeh/autostich/issues/171).
>
> **Zweck:** Sammelstelle für Features/Ideen, die wir auf `Autostich_Test` implementieren wollen.
> **Phase:** Reines **Sammeln** — hier wird noch **nichts gebaut**. Umsetzung erst, wenn die Sammlung steht.
> **Konvention:** UI-Text Deutsch, Code englisch. Wahrheit bleibt der Code (`src/game/`).
>
> Jeder Eintrag bekommt eine laufende ID (`FB-n`). Status: `gesammelt` → `geplant` → `in Arbeit` → `erledigt`.
> Felder außer Titel/Beschreibung sind optional und werden beim Sammeln nur gefüllt, wenn schon klar.

---

## Offene Features

<!-- Neue Einträge hier unten anhängen. Vorlage:

### FB-n — Kurztitel
- **Status:** gesammelt
- **Beschreibung:** Was soll passieren (aus Spielersicht + gewünschtes Verhalten).
- **Motivation / Warum:** (optional)
- **Betroffene Bereiche:** (optional — z.B. engine.js, ShopScreen.jsx, constants.js)
- **Offene Fragen:** (optional)
- **Notizen:** (optional)

-->

### FB-1 — Formations-Panel überall zeigen, wo Karten/Formationen beeinflusst werden
- **Status:** gesammelt
- **Beschreibung:** Alle Items, Perks und Skills, die die Formationen beeinflussen — sei es durch Kartenwert-Verstärkung, Umfärben oder Segment-/Anordnungsänderungen — sollen **immer das volle Panel mit allen aktiven Formationen** anzeigen. Man soll bei jeder solchen Wahl direkt sehen, welche Formationen aktiv sind bzw. wie sich die Wahl auf sie auswirkt (idealerweise live).
- **Motivation / Warum:** Aktuell ist die Formationsansicht nur in der Formationsphase (Aufstellung) und der Chronik-Übersicht sichtbar. Bei Shop-Käufen, Perk-Picks und Eis-Skills, die das Deck/Formationen verändern, sieht man den Effekt nicht — die einzelnen Auswahl-Dialoge zeigen jeweils nur ihre eigene, reduzierte Ansicht. Konsistenz + Transparenz.
- **Betroffene Bereiche (aktuell OHNE volles Formations-Panel):**
  - **Shop-Ziel-Auswahl** (`ShopTargetSelect.jsx`): Kartenitems K1–K10 (Wert +, Umfärben, Werttausch/Farbtausch), Anker A1–A6 (Positionswahl), `K-L1` Segmentveredelung, `A-L1` Zeitsegment, `F4` Farballianz, `F5` Offene Grenze — alles Eingriffe, die Formationen ändern.
  - **Perk-Ziel-Auswahl** (`TargetSelect.jsx`): C-Rollen (C8 Joker, C10 Bindeglied etc.), sowie A-Deck-Mods beim Pick (`PerkSelect.jsx`), die Kartenwerte dauerhaft ändern.
  - **Skill-Auswahl** (`SkillSelect.jsx`): Eis-Skills (Einfrieren verändert die Formationserkennung: Joker/Anker/Wildcards).
  - **Referenz-Panel** (bereits vorhanden, wiederverwenden): `FormationPhase.jsx` (Live-Formationsmarker über 8 Segmente) bzw. `ChronikOverview.jsx`. Kern-Logik: `computeFormations()` in `formations.js`.
- **Offene Fragen (für die Umsetzungsphase):**
  1. Welches konkrete Panel = „das Panel mit allen aktiven Formationen"? Die FormationPhase-Ansicht wiederverwenden oder eine kompakte, eingebettete Variante?
  2. Live-Vorschau *während* der Ziel-Auswahl (z.B. während man Karten antippt), oder erst nach Bestätigung?
  3. In jeden Dialog einbetten vs. ein gemeinsames, überall gleiches Panel-Component?
- **Notizen:** —

### FB-2 — Victory-/GameOver-Screen: mehr Infos + klickbare Perk-/Skill-Tooltips
- **Status:** gesammelt
- **Beschreibung:** Der End-/Victory-Screen (`GameOver.jsx`) soll mehr Informationen zeigen, u.a.:
  - **Anzahl an Formationen** (wie viele Formationen waren aktiv / haben ausgelöst).
  - **Score durch Formationen** (wie viel vom Gesamtscore kam aus Formations-Multiplikatoren).
  - **Klickbare Perks & Skills:** Klick auf einen Perk/Skill im End-Screen zeigt dessen Tooltip/Beschreibung (wie im BuildPanel/CardDetail).
- **Motivation / Warum:** Mehr Run-Rückblick/Transparenz; man will am Ende sehen, wo der Score herkam und was die Perks/Skills genau gemacht haben.
- **Betroffene Bereiche:** `GameOver.jsx` (Anzeige), evtl. Tooltip-/Detail-Component wiederverwenden (`CardDetail.jsx` / die Perk-Beschreibungslogik aus `BuildPanel.jsx`/`PerkSelect.jsx`), `SkillSelect.jsx`-Beschreibungen für Skills.
- **Offene Fragen (Umsetzung):**
  1. „Anzahl an Formationen" = aktive Formationen in der finalen Aufstellung (`summarizeFormations`) oder Zahl der formations-ausgelösten Siege über den ganzen Run?
  2. **„Score durch Formationen" wird aktuell nicht separat erfasst** → braucht neues Engine-Tracking (Akkumulator analog zu `critBonusScore`, gespeist aus `breakdown.formMult`/`scoreBeforeCrit` je Sieg). In `engine.js` + State ergänzen.
- **Notizen:** —

### FB-3 — Leaderboards: „Stiche" und „Runden" entfernen (global + lokal)
- **Status:** gesammelt
- **Beschreibung:** In der **globalen** Bestenliste die Spalten/Werte **Stiche** und **Runden (Durchläufe)** entfernen. Genauso in der **lokalen** Bestenliste.
- **Motivation / Warum:** Aufgeräumtere Leaderboards; im V2-Run sind Stiche/Durchläufe fix (immer 44×40) und damit als Vergleichsmetrik nutzlos — nur der Score zählt.
- **Betroffene Bereiche:** `GlobalLeaderboard.jsx` (global), `StartScreen.jsx` + `GameOver.jsx` (lokale Top-5-Anzeige). Datenmodell in `storage.js` (`{ score, level, tricks, cycles, ts }`) kann bleiben — nur die **Anzeige** entfernen (oder optional die Felder mit ausräumen).
- **Offene Fragen:** Soll „Level" bleiben? (aktuell zeigen die Listen Score/Level/Stiche/Runden — nur Stiche+Runden sollen weg.)
- **Notizen:** —

### FB-4 — Formationsphase: Aktions-Buttons nach oben ziehen
- **Status:** gesammelt
- **Beschreibung:** In der Formationsphase (Aufstellungs-Panel) die Buttons **Bestätigen**, **Zurücksetzen** und **Rückgängig** nach **oben** ins Panel verschieben, damit man nicht erst nach unten scrollen muss, um sie zu erreichen.
- **Motivation / Warum:** Bedienbarkeit — bei 40 Karten in 8 Segmenten muss man aktuell scrollen, um die Aktionen zu bedienen.
- **Betroffene Bereiche:** `FormationPhase.jsx` (Layout/Button-Positionierung). Actions unverändert (`CONFIRM_FORMATION` / `RESET_FORMATION` / `UNDO_SWAP`).
- **Offene Fragen:** Sticky-Leiste oben (bleibt beim Scrollen sichtbar) oder einfach die Reihenfolge oben-statt-unten? Buttons zusätzlich auch unten belassen?
- **Notizen:** Ggf. gleiche Überlegung für andere scrollbare Panels (Shop-Ziel-Auswahl) — hier aber explizit die Formationsphase gemeint.

### FB-5 — Formationen schwerer machen (Treppe Max-Schritt, Wechsel +1 Abstand) + Multiplikatoren leicht rauf
- **Status:** gesammelt
- **Beschreibung:** Formationen sind aktuell zu leicht. Zwei Verschärfungen, dafür etwas höhere Belohnung:
  - **Treppe:** darf **max. 3 Abstand** haben — der Schritt zwischen benachbarten Karten muss zusätzlich zur strengen Monotonie ≤ 3 sein (also 1–3). Bisher zählt jede streng steigende Folge (auch z.B. 1→9).
  - **Wechsel (Zick-Zack):** **+1 mehr Abstand** — Mindest-Nachbardifferenz 4 → **5**.
  - **Als Ausgleich:** Multiplikatoren von Treppe und Wechsel **leicht erhöhen**, weil sie schwerer zu erreichen sind als Farbe (Farbblock).
- **Motivation / Warum:** Treppe/Wechsel sollen echte Bau-Leistung sein, nicht quasi-automatisch entstehen; die Belohnung soll die höhere Schwierigkeit ggü. Farbblock widerspiegeln.
- **Betroffene Bereiche:** `formations.js`
  - **Treppe:** `markTreppe()` — neuer Max-Schritt ≤ 3 (steigend **und** fallend via F1 „Abstieg"). Wechselwirkung beachten mit: E3 (1× gleich), E4 (1× Rückschritt), E6 (Karte in zwei Treppen), C10 Bindeglied (±1), Eis Eisschritt/Kristallform (±1) — der Max-Schritt muss mit diesen Flex-Regeln zusammenpassen.
  - **Wechsel:** `WECHSEL_MIN_DIFF = 4` → 5. Wechselwirkung mit Shop `F2` „Enger Wechsel" (setzt aktuell `switchMinDifference` auf 3 — Beschreibung „von 4 auf 3" muss angepasst werden) und E5 „Pendelwerk" (Mindestlänge 2).
  - **Multiplikatoren:** aktuell `TREPPE_BASE = 1.25`, `WECHSEL_BASE = 1.25`, Eskalation `escalatingFactor` +0,20/Karte; Vergleich `FARBBLOCK_BASE = 1.35`. Ziel: Treppe/Wechsel leicht anheben (mind. auf/über Farbblock-Niveau, da schwerer).
- **Offene Fragen (Umsetzung — exakte Zahlen):**
  1. Genaue neuen Werte für `TREPPE_BASE`/`WECHSEL_BASE` (+ evtl. Eskalation)? Vorschlag folgt beim Bauen, ggf. sim-getunt.
  2. „Max 3 Abstand" = Schritt zwischen benachbarten Karten (angenommen) — bestätigen.
  3. `F2` „Enger Wechsel" neu definieren (z.B. min-Diff 5 → 4) und Beschreibung mitziehen (Desc-Check, #120).
- **Notizen:** Zieht Test-Updates nach sich (`test/formations.test.js`). Außerdem verschiebt sich das Formations-**Potential** der Startaufstellung → Startdeck-Band `FORMATION_START_MIN/MAX` (4,5–6,5) evtl. nachjustieren.

### FB-6 — Crit-Chance-Stat von +5 auf +7 pp buffen
- **Status:** gesammelt
- **Beschreibung:** In der Stat-Auswahl den **Crit-Chance**-Stat je Pick von **+5 auf +7 Prozentpunkte** erhöhen.
- **Motivation / Warum:** Crit-Chance soll stärker/attraktiver sein.
- **Betroffene Bereiche:** `constants.js` (`STAT_CRIT_CHANCE_STEP = 0.05` → `0.07`); Beschreibung/Blurb in `stats.js` (`blurb: "+5 pp"`, `desc: "+5 Prozentpunkte …"` → +7) mitziehen (Desc-Check, #120); UI-Anzeigen prüfen (`StatSelect.jsx`, ggf. `StatusRail.jsx`/`PerkSelect.jsx`-Readouts, die den Wert rendern).
- **Offene Fragen:** — (betrifft nur die **Crit-Chance**, nicht den Crit-Multiplikator-Stat.)
- **Notizen:** Test `test/*` prüfen, falls ein Test den Wert `0.05` hart annimmt.

### FB-7 — Groß-Score-Ansagen (STARK/BRUTAL/IRRE/GOTTGLEICH) visuell priorisieren
- **Status:** gesammelt
- **Beschreibung:** Die gestuften Groß-Score-Ansagen („BRUTAL", „IRRE" usw.) sollen:
  - **über allen anderen** floating Ansagen liegen (höchster z-index / vorderste Ebene),
  - **mittig** erscheinen,
  - **größer** werden.
- **Motivation / Warum:** Diese Peak-Momente sind das „Juice"-Highlight und sollen den Screen klar dominieren, nicht mit anderen Floats konkurrieren.
- **Betroffene Bereiche:** `src/ui/Battlefield.jsx`
  - Labels: `BIG_SCORE_TIERS` (STARK ≥10k · BRUTAL ≥50k · IRRE ≥150k · GOTTGLEICH ≥500k), `bigScoreLabel()`.
  - Render-Block `bigScore` (aktuell `left:50%, top:28%, fontSize:42, z-10`, Animation `as-krit`). z-10 ist **gleichauf** mit dem Formations-Float und über den normalen Score-Floats (die haben keinen expliziten z-index) → höheren z-index vergeben; Größe/Position (echte Bildschirmmitte) anheben.
  - Ggf. `src/index.css` (`as-krit`-Keyframes).
- **Offene Fragen:**
  1. ⚠️ **Satz war abgeschnitten** („…mittig, größer werden und ich weiß …") — es fehlt vermutlich noch ein weiterer Wunsch. **Beim Umsetzen/nächste Runde nachfragen**, was hier noch kommen sollte.
  2. Wie viel „größer" (Zielgröße) und exakte Mittigkeit (auch vertikal zentriert)?
- **Notizen:** Gebündelt in Issue [#169](https://github.com/GitGudMonkeh/autostich/issues/169).

### FB-8 — Leaderboard-Einträge anklickbar → Detail-Stats wie im eigenen Victory-Screen
- **Status:** gesammelt
- **Beschreibung:** Klick auf einen Highscore-Eintrag in den Bestenlisten (**lokal und global**) öffnet eine Detailansicht mit **denselben Stats wie im eigenen Victory-/GameOver-Screen** (Score, Level, Anzahl Formationen, Score aus Formationen, Perks & Skills mit Tooltip usw.).
- **Motivation / Warum:** Man will sehen, *womit* ein (eigener oder fremder) Rekordlauf gebaut wurde — nicht nur die nackte Punktzahl.
- **Abhängigkeit:** Baut auf **FB-2** auf (definiert, welche Stats der Victory-Screen zeigt). Am besten die GameOver-Statistik in eine **wiederverwendbare Komponente** ziehen (z.B. `RunStats`/`RunDetail`), die sowohl der eigene End-Screen als auch die Leaderboard-Detailansicht rendern.
- **⚠️ Datenmodell (der eigentliche Aufwand):** Die nötigen Stats werden aktuell **nicht** gespeichert und müssen pro Lauf persistiert werden:
  - **Lokal** (`storage.js`): Eintrags-Schema `{ score, level, tricks, cycles, ts }` erweitern (Formationen-Zahl, Score-aus-Formationen, Perk-IDs, Skill-IDs, beste Serie …). `rankHighscores`/`recordHighscore` mitziehen.
  - **Global** (`leaderboard.js` + Supabase-Tabelle `autostich_scores`): neue Spalten nötig → **DB-Migration**. Code hat bereits ein Graceful-Degradation-Muster (`COLS`/`COLS_BASE`-Fallback bei 400) — diesem Muster folgen, damit Deploy-Reihenfolge (Code vs. Schema) egal bleibt. Perks/Skills als kompakte ID-Liste (analog zur bestehenden `archetypes`-Spalte).
  - **Alt-Einträge** (ohne neue Felder) müssen in der Detailansicht **sauber degradieren** (nur zeigen, was da ist).
  - Quelle der Persistenz: `App.jsx` `saveRun` (sammelt, was gespeichert wird).
- **Betroffene Bereiche:** `src/ui/GameOver.jsx` (Stats-Layout → wiederverwendbare Komponente), `src/ui/GlobalLeaderboard.jsx` + `src/ui/StartScreen.jsx` (klickbare Zeilen + Detail-Modal), `src/game/storage.js`, `src/game/leaderboard.js`, Supabase-Schema, `src/App.jsx`.
- **Offene Fragen:**
  1. Exakter Stat-Satz = der finale FB-2-Satz (dort festlegen).
  2. Detailansicht als Modal/Overlay über der Liste?
  3. Wie viel Historie fremder (globaler) Einträge lohnt die Migration — nur ab jetzt neue Läufe voll, alte reduziert?
- **Notizen:** Passt zu **FB-3** (Liste bleibt schlank: Stiche/Runden raus) — die Detailansicht liefert die Tiefe on-demand. Gebündelt in Issue [#169](https://github.com/GitGudMonkeh/autostich/issues/169).

### FB-9 — Maskottchen auf Mobile größer (maximal möglich, ohne UI zu verschieben/brechen)
- **Status:** gesammelt
- **Beschreibung:** Das Maskottchen soll auf **Mobile** größer werden — aber **nur so weit, wie es das UI weder verschiebt noch bricht**. Ziel ist, das **Maximum** zu finden, das bei den kleinsten unterstützten Handy-Breiten noch sauber passt.
- **Motivation / Warum:** Der Charakter ist auf dem Handy aktuell nur ein kleiner runder Avatar (46 px) und dadurch kaum präsent.
- **Betroffene Bereiche:**
  - `src/ui/PanelMascot.jsx` — Mobile-Variante `variant="avatar"`, Default `avatarSize = 46`. Der Avatar sitzt **inline neben der Überschrift** (`sm:hidden`, `object-cover`, `shrink-0`) — genau diese Header-Zeile ist die Layout-Grenze (zu groß → Überschrift bricht um / Header wächst / drängt).
  - Alle **5 Nutzungsstellen** rendern den Mobile-Avatar mit der Default-Größe: `FormationPhase.jsx`, `PerkSelect.jsx`, `SkillSelect.jsx`, `ShopScreen.jsx`, `StatSelect.jsx`. → Bump der Default-Größe in `PanelMascot.jsx` wirkt auf alle fünf; ggf. je Panel feinjustieren.
- **Offene Fragen / Vorgehen:**
  1. „Was ist das Maximum?" = **Investigation** in der Browser-Preview (Mobile-Preset 375 px, ggf. schmaler) über alle 5 Panels: größten `avatarSize` finden, bei dem keine Header-Zeile umbricht/verschiebt. Dann diesen Wert (mit kleinem Sicherheitsabstand) setzen.
  2. Runder Avatar beibehalten oder auf Mobile eine andere, größere Darstellung (z.B. kleiner Peek) — solange nichts verschoben/gebrochen wird?
  3. Einheitliche Größe für alle Panels oder pro Panel (unterschiedliche Header-Längen)?
- **Notizen:** Reine Responsive-UI-Änderung; kein `game/`-Layer betroffen, keine Tests. Verifikation via Browser-Preview (mobile). Gebündelt in Issue [#170](https://github.com/GitGudMonkeh/autostich/issues/170).

### FB-10 — Hauptmenü: Statistik-Hub (Profil-Totals, Bestes Build, Lauf-Historie & Graphen)
- **Status:** gesammelt (mit Research)
- **Beschreibung:** Stats-Hub im Hauptmenü: gespielte Spiele, bestes Build, Übersicht der letzten ~10 Runs mit Details, Graphen über die letzten Läufe/Builds. Kuratiert (nicht überladen) + Drill-down.
- **Research-Kern:** Vorbild Slay the Spire (umfassend, nicht erschlagend); Spieler wollen Per-Run-Records mit **Build + Score-Herkunft**; Morgue-File-Prinzipien (Kategorien, Nullwerte weglassen); Fortschritts-Trend als Retention-Anker. Autostich-spezifisch am interessantesten: **Score-Herkunft** (Formationen/Crits/Serie/Flats/Ion/Hitze).
- **⚠️ Abhängigkeit:** braucht persistenten **Run-Record-Store** — dasselbe Datenmodell wie **FB-2** und **FB-8**; einmal definieren, dreifach nutzen. Aktuell nur Top-5 + Geist persistiert.
- **Betroffene Bereiche:** neu `StatsScreen.jsx` (+ geteilte `RunDetail`/`RunStats`), `Sparkline.jsx`, `StartScreen.jsx`, `storage.js`, `App.jsx` (`saveRun`), `engine.js` (Score-Herkunft-Akkumulator).
- **Analyse = Kernbestandteil (nicht optional):** Score-Herkunft, Pick-Raten, Archetyp-Nutzung **und** „Optimale Analyse" (Best-Works-Insights aus der eigenen Historie: bester Archetyp nach Ø-Score, Perk-/Skill-Score-Lift in Top-Läufen, Score-Herkunft der Rekordläufe; mit Kleinserien-Schutz).
- **Notizen:** Vollständiges Research + Design im Issue [#172](https://github.com/GitGudMonkeh/autostich/issues/172).

### FB-11 — Username-Profanity-Filter (Client + Supabase Server-Guard)
- **Status:** gesammelt
- **Beschreibung:** Robuster Profanity-Filter für Usernamen, weil der Name auf dem globalen Leaderboard erscheint. **Client-Validator** (pure `game/profanity.js`: Normalisierung + Leetspeak-Map + kuratierte DE/EN-Liste + Whitelist; Wiring in UsernameModal + vor `publishRun`; Tests, keine neue Dependency) **plus serverseitiger Guard** in Supabase (Postgres-Funktion + BEFORE-INSERT-Trigger auf `autostich_scores`), weil das Board via öffentlichem Anon-Key beschreibbar und ein reiner Client-Filter umgehbar ist.
- **⚠️ Anwendung:** Server-SQL muss **manuell im Supabase-SQL-Editor** eingespielt werden (nur öffentlicher Anon-Key im Repo, kein Service-Key). Fertiges SQL-Template im Issue.
- **Betroffene Bereiche:** neu `src/game/profanity.js` + `test/profanity.test.js`; `src/ui/UsernameModal.jsx`, `src/App.jsx` (Guard vor publishRun); Supabase-Tabelle `autostich_scores` (Trigger).
- **Notizen:** Nur Issue (kein Code jetzt — laufende Rarity-Shop-WIP auf `feat/rarity-shop`). Umsetzung später auf eigenem Branch von `Autostich_Test`. Issue [#174](https://github.com/GitGudMonkeh/autostich/issues/174).

### FB-12 — Sieg/Niederlage-Feedback „Klingenschnitt" (Battlefield)
- **Status:** gesammelt (Richtung gewählt)
- **Beschreibung:** Befriedigendes Stich-Feedback: die **Verliererkarte** wird von einem Schnitt in zwei Hälften geteilt, die auseinandergleiten + fallen; Funken in Suit-Farbe; Siegerkarte kippt an + Glow. Sieg = Grün/Gold, Niederlage = Rot, Gleichstand = kein Schnitt. Aus 3 Mockups gewählt (Richtung 03 „Klingenschnitt").
- **Betroffene Bereiche:** `src/ui/Battlefield.jsx`, `src/ui/Card.jsx` (Hälften/Klon), `src/index.css` (Keyframes) — **kein `game/`-Eingriff**. Dauern an Flip-Takt/Turbo gekoppelt; `prefers-reduced-motion`-Fallback.
- **Notizen:** Konkrete Effekt-Specs (Schnittlinie −24°, Hälften-Offsets, ~20 Funken, Timings) im Issue [#177](https://github.com/GitGudMonkeh/autostich/issues/177). Umsetzung auf eigenem Branch, nach der Rarity-Shop-Arbeit. Mockup-Bilder als Referenz.

---

## Erledigt

_(noch leer)_
