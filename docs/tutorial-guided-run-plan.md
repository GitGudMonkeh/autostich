# Autostich — Tutorial / Guided Run (Durchplanung)

> **Status:** GEBAUT (Wellen W0–W4, 2026-08-15). Die Durchplanung unten steht weiter; was beim Bauen
> anders entschieden wurde, steht in §13.9 mit Begründung.
> **Stand:** 2026-08-15 — auf den aktuellen Mechanikstand gezogen (Branch `Autostich/pixi`).
> **Idee (Nutzer):** Ein **Tutorial-Button** startet einen **geführten Lauf**, der einem alles erklärt.
> **Vor jeder Phase** erscheint ein Erklär-Pop-up, das sagt, was man in der Phase macht, und kurz die Panels erklärt.

> **Revision gegenüber der Erstfassung:** Die Erstfassung beschrieb ein Spiel, das es so nicht mehr gibt —
> Stat-Phase, Shop mit Münzen, 44 Durchläufe, `AnleitungModal`, drei Archetypen, vier Skill-Slots,
> vier Formationstypen. Alles davon ist ersetzt oder entfernt. Die **Architektur** der Erstfassung
> (UI-only, fester Seed, Skript-Modul + Overlay + Hook, `data-tut`-Anker, Wellen W0–W4) trägt weiter
> und ist unverändert übernommen. Neu ist §14: das Tutorial ist der erste **zweisprachige** Inhalt.

---

## 1. Ziel & Abgrenzung

- **Ziel:** Neue Spieler lernen den Loop nicht aus einem Textblock, sondern **im echten Lauf**,
  Schritt für Schritt, mit kurzen Erklär-Pop-ups als „Lehrern".
- **Abgrenzung zum vorhandenen Lehrmaterial:** Es gibt bereits zwei **statische** Nachschlage-Ebenen:
  - **Glossar** (`src/game/glossary.js` + `Glossary.jsx`) — 109 Begriffe, durchsuchbar, kategorisiert,
    erreichbar über das ⓘ auf jedem Auswahlpanel und im Hub.
  - **Leitfaden** (`src/ui/guides.js` + `GuideOverlay.jsx`) — vier Archetyp-Leitfäden („wie spiele ich
    Feuer"), Reiter zum Durchklicken.

  Das Tutorial ist die dritte, **interaktive** Ebene. Arbeitsteilung: **Glossar = nachschlagen ·
  Leitfaden = Strategie lesen · Tutorial = einmal machen.** Die frühere `AnleitungModal` (#12)
  existiert **nicht mehr** — es gibt also keinen Konflikt mehr aufzulösen (alte §12.4 entfällt).
- **Keine `game/`-Änderung nötig:** Das Tutorial ist reine UI-/Overlay-Logik. Der geführte Lauf ist
  ein normaler Lauf mit festem Seed plus Erklär-Overlay. Der pure, deterministische `game/`-Layer
  bleibt unangetastet — auch die Sim- und Determinismus-Tests bleiben dadurch byte-identisch.

---

## 2. Kernkonzept

Zwei Erklär-Ebenen:

1. **Phasen-Intro-Pop-up (blockierend):** Beim **ersten** Betreten jeder Phasenart erscheint ein
   Pop-up mit kurzer Erklärung „was mache ich hier". Bestätigen mit „Verstanden".
2. **Panel-Coach-Marks (kurz):** Direkt danach werden die relevanten Panels der Phase erklärt —
   Spotlight auf ein Panel + ein Satz. Steppbar.

**Ablauf-Prinzip:** Die Pop-ups feuern beim **ersten Auftreten** jeder Phasenart, nicht in jedem
Durchlauf. Sind alle erklärt, verschwindet das Overlay und der Lauf läuft normal weiter.

**Warum der Bogen von selbst kurz ist:** `DECISION_SCHEDULE` ist ein fester 50-Einträge-Plan, dessen
Grundmuster ein Viererblock ist — **Skill → Perk → Aufstellen → Architekt**. Die Runden 1–4 zeigen
also **alle vier Hauptphasen** genau einmal. Zusammen mit dem Stichspiel selbst ist der Kern nach
**vier Durchläufen** erklärt (die Erstfassung rechnete mit sechs, weil damals fünf Phasenarten
existierten).

Die einzige Phasenart außerhalb des Blocks ist die **Legendär-Phase in Durchlauf 29**
(`LEG_PHASE_CYCLE`, aus dem Plan abgeleitet — nie abtippen). Die liegt weit hinter dem
Tutorial-Bogen. Siehe Entscheidung §13.5.

---

## 3. Der geführte Lauf: fester Seed

- Der Tutorial-Button dispatcht `START_RUN` mit **festem Seed** statt `Math.random`. Der `game/`-Layer
  nimmt `rng`/`seed` bereits als Action-Payload — **keine Änderung nötig**. Der Pfad existiert
  produktiv: der Seed-Chip im Hub startet Läufe genauso.
- **Wirkung:** Kartenreihenfolge, Angebote und Crits sind deterministisch → das Skript kann garantieren,
  dass **überhaupt** etwas Sehenswertes auftaucht (ein Crit im ersten Durchlauf, eine echte Formation
  in der ersten Aufstellungsphase, ein platzierbares Gebäude in der ersten Architekt-Phase).
- **Robustheit:** Die Erklärtexte bleiben **phasen-allgemein** („So funktioniert der Architekt"), nicht
  angebots-spezifisch („bau Gebäude X"). Sonst driftet das Tutorial bei jeder Balance-Änderung.
- **Seed-Auswahl:** `TUTORIAL_SEED = 952`, vom Nutzer freigegeben (2026-08-15). Die Wahl ist bewusst
  frei — beide Kriterien, die §3 ursprünglich an den Seed knüpfte, sind gemessen seed-unabhängig
  (§13.9 b/c). Der feste Seed trägt deshalb nur noch Reproduzierbarkeit: alle Spieler sehen denselben
  geführten Lauf, und Support-Fragen haben eine gemeinsame Grundlage.
- **Achtung Wochen-Mods:** Der Tutorial-Lauf ist ein **normaler** Lauf (`mode` ≠ `"ranked"`), also ohne
  `weekMods`. Das ist richtig so — die Wochen-Modifikatoren würden die erklärten Regeln verbiegen.

---

## 4. Phasen-Abdeckung (aktueller Stand)

Zustandsnamen wie im Reducer. `levelup` ist ein Sammelzustand, die Auswahlart hängt am gesetzten
Angebots-Feld — das muss der Tutorial-Hook mitlesen.

| # | Phase (State) | Erkennung | „Was mache ich hier" (Kern) |
|---|---|---|---|
| 0 | Lauf-Start | — | Ziel: **maximaler Score** über **50 Durchläufe**. Kein Leben/Tod, kein Verlieren — nur Punkte. Der Autobattler spielt von selbst. |
| 1 | Stichspiel | `play` | Je 40 Karten, Stich für Stich. Höhere Karte gewinnt, Gleichstand zählt nicht. Sieg = **400 Basispunkte** (`SCORE_PER_WIN`), mal Serie, Crit und Formationen. |
| 2 | Skill | `levelup` + `skillOffer` | **12 Skills im Angebot** (3 je Archetyp), **6 Slots**. Vier Archetypen: ⚡ Blitz · 🔥 Feuer · ❄️ Eis · 🌿 Pflanze. Der erste Skill eines Archetyps macht ihn aktiv. |
| 3 | Perk | `levelup` + `offer` | **3 Perks im Angebot**, Kategorien A–E, vier Raritätsstufen. Ablehnen ist erlaubt. |
| 4 | Aufstellen | `formation` | Die 40 Karten der Ziehreihenfolge umsortieren. **4 Formations-Energie** je Phase (`FORMATION_ENERGY`), jeder Tausch kostet. Formationen multiplizieren den Score. |
| 5 | Architekt | `architect` | **Ersetzt den früheren Shop** (#229). Polyomino-Gebäude auf ein Baufeld legen, aufwerten, versetzen, abreißen. Keine Münzen mehr. |
| 6 | Gletscher-Wahl | `glacier-target` | **Pflichtschritt nach jedem Eis-Skill:** genau eine Karte für den Gletscher wählen. Kommt nur, wenn Eis gespielt wird. |
| 7 | Ziel-Auswahl | `target` | Wenn ein Perk Karten braucht: N Karten antippen. |
| 8 | Familien-Ziel | `family-target` | Wenn eine Perk-Familie eine Farbe / Karte / einen Formationstyp als Ziel braucht. |
| 9 | Legendär | `levelup` + `legendaryOffer` | **Durchlauf 29** (`LEG_PHASE_CYCLE`): 2 Legendäre aus den aktiven Archetypen, fixer 7. Slot, kein Tausch. |
| 10 | Ende | `gameover` | Score, Aufschlüsselung, Build lesen. |

**Entfallen gegenüber der Erstfassung:** `stat`/`statOffer` (die Stat-Phase gibt es nicht mehr, #267) ·
`shop`/`shop-target` (Münz-Shop ersetzt durch den Architekten, #229).

**Verteilung im 50er-Plan** (aus `BASE_SCHEDULE`): 9 Skill · 13 Perk · 13 Aufstellen · 14 Architekt ·
1 Legendär. Skills sind front-loaded (Runden 1, 5, 9, 13, 17, 22 füllen die 6 Slots) und laufen dann
als Tausch-Fenster aus (31, 39, 43).

---

## 5. Panel-Erklärungen (Coach-Marks) je Phase

- **Stichspiel:** `Battlefield` (beide Decks, aufgedeckte Karten, Ergebnis-Banner, Groß-Ansagen) ·
  `StatusBar` (schwebende Kompaktleiste: Score, Serie, Durchlauf, Pause/Tempo) · `StatusRail`
  (Seitenpanels: Score-Quelle, Trend, Build) · die **Archetyp-Ressourcenleisten**, sobald eine aktiv ist:
  `ChargeBar` (Ladung) · `HeatBar` (Hitze) · `GlacierBar` (Masse) · `PlantBar` (Wachstum) ·
  `ScoreMilestoneBar`.
- **Skill:** `SkillSelect` — Archetyp-Gruppen, belegte/freie Slots, Verstärker-Hinweis
  („braucht Skill X"), das ⓘ zum Glossar, der 📖 zum Leitfaden.
- **Perk:** `PerkSelect` (3 Karten, Kategorie-Farben, Raritätschip, Ablehnen) · `BuildPanel`
  (wachsender Build + Deck-Histogramm) · `LayoutPerks`.
- **Aufstellen:** `FormationPhase` (40 Positionen in 8 Segmenten à 5, Energieanzeige, Live-Marker) ·
  `FormationPanel` / `ArchPanels` (Formationslegende). Hier gehören **alle acht Formationstypen** kurz
  erklärt: Wiederholung · Farbblock · Treppe · Wechsel · Anker · Nachhall · Kern · Grenzbonus.
  (Die Erstfassung nannte nur W/F/T/Z — N/K/G fehlten.)
- **Architekt:** `ArchitectScreen` — Baufeld, Bauplan-Angebot, Polyomino-Formen und Drehen, Kategorien
  (Tragwerk · Handelsbau · Sakralbau), Aufwerten/Versetzen/Abriss, Strukturen (Zeile/Spalte/Diagonale)
  und Distrikte.
- **Gletscher-Wahl:** `GlacierPick` (genau eine Karte, Pflicht).
- **Ziel-Auswahl:** `TargetSelect` · `FamilyTargetSelect`.
- **Legendär:** `LegendarySelect` (2 Angebote, fixer 7. Slot, kein Tausch).
- **Ende:** `GameOver` (Score groß, Faktorenkette, Build-Liste, freigeschaltete Skins).

---

## 6. Content-Skript (datengetrieben)

Der gesamte Text lebt in **einem** Modul (`src/ui/tutorial/tutorialScript.js`) — analog zur
Registry-Idee von `perks.js`. **Aber:** die Texte selbst stehen dort **nicht** als Literale, sondern
als i18n-Schlüssel (§14).

```js
// Schema (Vorschlag, i18n-fest)
{
  id: "phase-architect",
  trigger: { phase: "architect", firstOnly: true },
  titleKey: "tutorial.architect.title",
  bodyKey:  "tutorial.architect.body",
  coachmarks: [
    { anchor: "arch-board",  key: "tutorial.architect.board" },
    { anchor: "arch-offers", key: "tutorial.architect.offers" },
    { anchor: "arch-done",   key: "tutorial.architect.done" },
  ],
  placement: "auto",
}
```

- **Anker:** Panels bekommen `data-tut="arch-board"`; die Coach-Marks referenzieren diese IDs →
  der Spotlight findet das Element responsiv. Rein additiv, keine Logikänderung.
- **Trigger-Arten:** `run-start`, `phase` (mit `firstOnly` und optionaler Unterscheidung nach
  `offer`/`skillOffer`/`legendaryOffer`), `result` (z. B. „erster Crit gefallen").

---

## 7. Architektur / Code-Integration

Alles UI-Layer, kein `game/`-Eingriff:

**Neu**
- `src/ui/tutorial/tutorialScript.js` — Schritte (Daten, i18n-Schlüssel).
- `src/ui/tutorial/TutorialOverlay.jsx` — Pop-up + Coach-Mark-Spotlight + Fortschritt/Skip.
- `src/ui/tutorial/useTutorial.js` — Zustandsmaschine: beobachtet `state.phase` **und** die
  Angebots-Felder (weil `levelup` drei Auswahlarten trägt), zeigt jeden Schritt beim ersten
  Auftreten, merkt sich Gezeigtes.
- `TUTORIAL_SEED` (Konstante) + `as_tutorial_done` (Persistenz, `storage.js`).

**Geändert (minimal)**
- `App.jsx`: `onStartTutorial` → geseedeter `START_RUN` + `tutorialActive`-Flag; rendert
  `TutorialOverlay`, wenn aktiv.
- `StartScreen.jsx`: neuer Tutorial-Einstieg. **Achtung:** der Hub ist ein bewusst ruhiges
  2×2-Kachel-Grid mit genau zwei lauten CTAs. Ein dritter lauter Knopf bricht die Hierarchie —
  siehe Entscheidung §13.4.
- Panels bekommen `data-tut`-Anker (heute existiert **kein einziger** im Code, das ist Neuarbeit
  in W2): `Battlefield`, `StatusBar`, `StatusRail`, `SkillSelect`, `PerkSelect`, `BuildPanel`,
  `FormationPhase`, `ArchPanels`, `ArchitectScreen`, `GlacierPick`, `TargetSelect`,
  `FamilyTargetSelect`, `LegendarySelect`, `GameOver`.

**Progression:** Pop-up wegklicken → Phase normal spielen. Keine harte Blockade; die vorhandene Regel
„ohne Auswahl geht's nicht weiter" reicht als Führung.

---

## 8. Determinismus

- Seed-Zug **einmal** bei Lauf-Start (wie regulär). Kein `Math.random` im Tutorial-Kernfluss —
  das ist keine Stilfrage, sondern die Architekturgrenze von `src/game/`.
- `DECISION_SCHEDULE` ist fix, die **Phasenreihenfolge** also ohnehin deterministisch; der Seed pinnt
  nur den **Inhalt** (Karten, Angebote, Crits).

---

## 9. Persistenz & Wiederholbarkeit

- `as_tutorial_done` (localStorage über `storage.js`). Die Reset-Liste `RESET_KEYS` muss den Schlüssel
  mit aufnehmen, sonst überlebt „Tutorial gesehen" den Profil-Wipe.
- **Wiederholbar:** der Einstieg bleibt sichtbar, das Tutorial ist erneut startbar.
- **Erststart:** Seit dem Onboarding-Rückbau (#316) startet **jedes Profil voll freigeschaltet**
  (`onboarding = ONBOARDING_LINKS`, 0 SP / 50 DP). Es gibt also keine Freischalt-Treppe mehr, die den
  Erstkontakt strukturiert — das Tutorial ist damit die **einzige** Führung für neue Spieler. Das
  erhöht seine Priorität gegenüber der Erstfassung deutlich.
- **Alt-Schlüssel:** `as_seen_guide` liegt noch in `storage.js` und in `RESET_KEYS`, wird aber von
  keinem Code mehr gelesen (die `AnleitungModal` ist weg). Beim Tutorial-Bau mit aufräumen oder
  bewusst als Alt-Last stehen lassen.

---

## 10. UX-Details

- **Skip:** pro Schritt „Überspringen" + global „Tutorial beenden" (setzt `as_tutorial_done`).
- **Fortschritt:** kleine Anzeige „Schritt 3/8" — die Zahl **aus der Skriptlänge ableiten**, nicht
  in den Text schreiben (sonst driftet sie beim ersten neuen Schritt).
- **Mobil:** Pop-up als Bottom-Sheet; Coach-Mark-Marker repositionieren. Anker müssen im
  Scroll-Container gefunden werden.
- **Effekt-Stufen:** Das Spiel hat drei (`useFxLevel`: `full` / `balanced` / `minimal`, gesteuert über
  die Option „Effekte reduziert" **und** `prefers-reduced-motion`). Der Spotlight muss sich daran
  halten, nicht nur an `prefers-reduced-motion` — sonst animiert das Tutorial fröhlich weiter,
  während der Spieler alles andere abgeschaltet hat.
- **Pause-Kopplung:** Ein offenes Tutorial-Pop-up muss den Lauf einfrieren wie jedes andere Overlay
  (`showOptions`/`glossaryOpen`-Muster in `App.jsx`) — sonst laufen im Stichspiel Stiche weiter,
  während der Spieler liest, und die Musik/Loop-Gatung stimmt nicht.
- **Nicht nerven:** nur beim ersten Auftreten, kurze Texte, jederzeit wegklickbar.

---

## 11. Implementierungs-Wellen

Jede Welle lauffähig, das Spiel bleibt spielbar:

- **W0 — Gerüst:** `tutorialActive`-Flag, geseedeter `START_RUN`, Overlay-Skelett, Schritt-Engine an
  `state.phase` + Angebots-Feldern, Persistenz, Hub-Einstieg.
- **W1 — Phasen-Pop-up:** Erklär-Bubble je Phase, Weiter/Skip, Fortschritt, Pause-Kopplung.
- **W2 — Coach-Marks:** Spotlight-System + `data-tut`-Anker auf allen Panels.
- **W3 — Inhalte:** alle Phasentexte final **in beiden Sprachen**; Seed per Sim wählen.
- **W4 — Politur:** Bottom-Sheet/Mobil, Effekt-Stufen, Wiederholung, Textfeinschliff.

---

## 12. Was das Tutorial NICHT erklären sollte

Der Bogen soll kurz bleiben. Bewusst außerhalb:

- **Meta-Ebene:** Upgrade-Baum, Stichpunkte/Deckpunkte, Deck-Werkstatt, Kosmetik. Das sind
  Hub-Themen nach dem ersten Lauf, nicht Lauf-Themen.
- **Wochen-Rangliste und Wochen-Modifikatoren:** eigener Modus mit eigener Baseline; im Tutorial
  nicht aktiv (§3) und deshalb dort auch nicht zu erklären.
- **Archetyp-Strategie:** dafür gibt es die vier Leitfäden. Das Tutorial erklärt, **dass** es
  Archetypen gibt und wie man einen aktiviert — nicht, wie man Feuer optimal spielt.
- **Einzelne Perks/Skills/Gebäude:** dafür gibt es Glossar und Detailkarten.

---

## 13. Offene Entscheidungen (vor dem Bauen klären)

Mit Empfehlung. Die alte Frage „Tutorial vs. `AnleitungModal`" ist durch deren Wegfall erledigt.

1. **Geführter Lauf: fester Seed?**
   → **Ja, fester Seed.** Ohne ihn kann das Skript nicht garantieren, dass in der ersten
   Aufstellungsphase überhaupt eine Formation sichtbar ist. Kosten: eine Konstante.

2. **Führung: nur erklären oder den empfohlenen Zug hervorheben?**
   → **Nur erklären.** Autostich hat keine Verlierbedingung — eine „falsche" Wahl kostet nichts und
   ist die ehrlichere Lernerfahrung. Eine Soft-Empfehlung würde außerdem bei jeder Balance-Änderung
   falsch werden, also genau den Drift einführen, den §3 vermeidet.

3. **Tutorial-Ende: normal weiterlaufen oder „Du bist bereit!"-Screen?**
   → **Normal weiterlaufen**, plus ein einmaliger Abschluss-Hinweis nach der letzten erklärten Phase
   (Runde 4), der auf Glossar und Leitfaden zeigt. Den Lauf abzuschneiden wäre unnötig: er ist ab
   da ein ganz normaler Lauf und zählt für Statistik und Bestenliste.

4. **Wo sitzt der Einstieg im Hub?**
   → **Als ruhiger Chip neben „Optionen"**, nicht als dritter CTA und nicht als fünfte Kachel.
   Zusätzlich: **beim allerersten Start automatisch anbieten** (Profil ohne beendeten Lauf und ohne
   `as_tutorial_done`) — dort darf es laut sein. Danach nur noch der Chip.

5. **Tiefe: welche Phasen bekommen Coach-Marks?**
   → **Die vier Hauptphasen + Stichspiel bekommen volle Coach-Marks.** Gletscher-Wahl, Ziel-Auswahl
   und Familien-Ziel bekommen **nur ein Ein-Satz-Pop-up beim ersten Auftreten** (sie erscheinen
   bedingt und würden den Bogen sonst zerfasern). Die **Legendär-Phase** liegt in Durchlauf 29 —
   ein eigener Ein-Satz-Hinweis dort, unabhängig davon, ob das Tutorial „fertig" ist.

6. **Tonfall und wer schreibt die Copy?**
   → **Zweiter Person, Präsens, Bedingung → Wirkung**, wie in `docs/text-style-guide.md`; maximal
   drei Sätze pro Pop-up, ein Satz pro Coach-Mark. Copy schreibe ich, Freigabe beim Nutzer.

7. **NEU — zählt der Tutorial-Lauf für Statistik, Bestenliste und Freischaltungen?**
   → **Ja, ganz normal.** Er ist mechanisch ein regulärer Lauf mit festem Seed; ihn auszuklammern
   hieße, `recordRun`/`publishRun` einen Sonderfall beizubringen — Komplexität ohne Gegenwert.
   Bewusste Nebenwirkung: alle Tutorial-Läufe teilen einen Seed. Für die globale Bestenliste ist das
   unkritisch (nur der Wochen-Ranked-Modus hat eine faire Baseline), sollte aber bekannt sein.

8. **NEU — was passiert beim Abbruch mitten im Tutorial?**
   → **`as_tutorial_done` NICHT setzen.** Wer abbricht, hat es nicht gesehen; der nächste Start bietet
   es erneut an. Nur „Tutorial beenden" und das Durchlaufen bis zum Abschluss-Hinweis setzen die Flagge.

9. **NEU (beim Bauen) — Abweichungen von dieser Planung.** Jede hier, mit Grund:

   a) **Die Legendär-Phase ist eine eigene Reducer-Phase.** §4 führte sie als `levelup` +
      `legendaryOffer`. Im Code ist sie `phase === "legendary"` mit eigenem Angebots-Feld. Der
      Tutorial-Schritt matcht deshalb auf die Phase, nicht auf ein Feld. Nur `levelup` trägt zwei
      Auswahlarten (Skill über `skillOffer`, Perk über `offer`) — dort ist die Feld-Unterscheidung
      nötig und gebaut.

   b) **Der feste Seed garantiert keinen frühen Crit** (§3 nahm das an). Gemessen über 2000 Seeds:
      Die Crit-Chance hängt an der Skill-/Perk-Wahl, und die Entscheidung für Durchlauf 1 fällt VOR
      dessen Stichen. Über acht verschiedene Spielweisen geprüft, liegt der Crit-Boden bei JEDEM
      Kandidaten-Seed bei 0. Ein Tutorial-Text, der einen Crit ankündigt, würde also regelmäßig
      lügen — die Texte bleiben deshalb bei „Crits vervielfachen den Score", ohne einen zu versprechen.

   c) **Die Formations-Sorge aus §3 ist gegenstandslos.** „Ohne festen Seed kann das Skript nicht
      garantieren, dass in der ersten Aufstellungsphase überhaupt eine Formation sichtbar ist" —
      gemessen zeigen **2000 von 2000** Seeds mindestens eine, im Schnitt rund ein Dutzend. Der feste
      Seed bleibt trotzdem (Reproduzierbarkeit, gleiche Erfahrung für alle, gleiche Grundlage für
      Support-Fragen), aber er trägt diese Begründung nicht mehr.

   d) **Der Fortschritt zählt nur den erklärten Bogen.** §10 wollte „Schritt 3/8" aus der
      Skriptlänge. Die bedingten Phasen (Gletscher, Ziel, Familien-Ziel, Legendär) kommen aber
      unregelmäßig und teils VOR dem Bogen — eine Familien-Ziel-Wahl kann schon in Durchlauf 2
      auftauchen. Sie tragen deshalb gar keine Nummer, statt den Nenner unehrlich zu machen.

   e) **Der Build-Coach-Mark zeigt in das Perk-Overlay**, nicht auf das `BuildPanel` unter dem Brett
      (§5 nannte `BuildPanel`). Das Auswahl-Overlay ist Vollbild — das Panel darunter wäre verdeckt.

   f) **`as_seen_guide` wurde ersetzt statt stehengelassen** (§9 ließ beides offen). Nichts las den
      Schlüssel mehr; `as_tutorial_done` nimmt seinen Platz in `RESET_KEYS` ein.

---

## 14. Zweisprachigkeit — das Tutorial ist der erste bilinguale Inhalt

Seit dem i18n-Fundament (`docs/localization/i18n.md`) gilt: **jeder neue Anzeigetext gehört in
`src/i18n/de.js` und `src/i18n/en.js`.** Das Tutorial ist der erste Inhalt, der von der ersten Zeile
an unter dieser Regel entsteht — und damit der beste Praxistest für die Schicht.

Konkret:

- `tutorialScript.js` enthält **Schlüssel, keine Texte** (Schema in §6). Das Skript beschreibt Ablauf
  und Anker; die Sprache liegt im Katalog.
- Namensraum `tutorial.<phase>.<sache>`, z. B. `tutorial.architect.title`,
  `tutorial.architect.board`.
- `test/i18n-guards.test.js` erzwingt dann automatisch Schlüssel-Parität, Platzhalter-Parität,
  Zahlformat und Terminologie. Ein einsprachiger Tutorial-Schritt macht die Suite rot.
- `TutorialOverlay.jsx` gehört nach Fertigstellung in die `MIGRATED`-Ratsche des Guard-Tests.
- Zahlen im Text (50 Durchläufe, 400 Punkte, 6 Slots, 4 Energie) kommen als Interpolation aus
  `constants.js`, nicht abgetippt — sonst driftet das Tutorial beim nächsten Balancing genauso, wie
  es die Handtexte vor der Sprachprüfung getan haben.

**Reihenfolge-Empfehlung:** Erst die **Registermigration** (Skills, Perks, Familien, Gebäude, Glossar,
Rarität) — oder zumindest Rarität und Formationstypen —, dann die Tutorial-Inhalte. Sonst erklärt ein
englisches Tutorial die „Rarity: Sehr selten". Für W0–W2 (Gerüst, Pop-up, Anker) spielt das keine
Rolle; erst W3 (Inhalte) hängt daran.

---

## 15. Aufwand & Risiko

- **Umfang:** mittel-groß, vier Wellen. **Kein Spiellogik-Risiko** (UI-only, `game/` unangetastet,
  Sim- und Determinismustests unberührt).
- **Hauptrisiken:**
  1. **Responsives Ankern** der Coach-Marks (Scroll, Mobil, Bottom-Sheet) — der teuerste Teil.
  2. **`data-tut`-Anker über 14 Panels** — heute existiert keiner; das ist breite, aber flache Arbeit.
  3. **Textdrift** — abgefangen durch Konstanten-Interpolation und die i18n-Guards (§14).
  4. **Pause-/Overlay-Kopplung** im Stichspiel (§10) — leicht zu übersehen, führt sonst zu Stichen,
     die hinter dem Pop-up weiterlaufen.
- **Synergien:** Glossar (109 Begriffe) und die vier Leitfäden liefern den Wortlaut; die Coach-Marks
  können auf sie verweisen, statt Erklärungen zu duplizieren.
