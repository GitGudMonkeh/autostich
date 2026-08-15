# Sprachprüfung Autostich — Befundbericht & Umsetzungsstand

**Branch:** `Autostich/pixi` · Prüfstand `500b24f` · Bericht 2026-08-15
**Umfang:** alle spieler-sichtbaren Texte — **2 238 Strings** (Datentexte + UI)
**Maßstab:** `docs/text-style-guide.md`, `docs/desc-check.md` und **der Code** (bei Widerspruch gilt der Code)

> **Status: alle Befunde umgesetzt.** Jeder Abschnitt trägt eine Status-Zeile. Zwei Punkte sind bewusst
> *nicht* wie vorgeschlagen umgesetzt und als **↷ abweichend** markiert — mit Begründung.
> Die Umsetzung liegt in drei Commits; `npm test` (1015) und Build sind grün.

---

## 0. Vorgehen

1. **Mechanik erarbeitet** aus `src/game/*` (Engine, Formationen, Skills, Familien, Perks, Gletscher,
   Architekt, Progression, Wochen-Modifikatoren) — nicht aus der README; die war an mehreren Stellen
   veraltet (A14, inzwischen nachgezogen).
2. **Texte driftfrei extrahiert** über `scripts/export-strings.mjs`: Die Datentexte werden aus den echten
   Registern **importiert** und als *resolvete* Endtexte ausgeschrieben (keine abgetippten Zahlen). Die
   UI-Texte kommen aus `src/App.jsx` + `src/ui/*.jsx`.
   Ergebnis: `docs/localization/strings_de_pixi_2026-08-15.csv`.
3. **Jeder Text gegen den Code gelesen** — Zahl für Zahl, Begriff für Begriff.

| Kategorie | Zeilen | Inhalt |
|---|---:|---|
| `item` | 687 | Perk-Familien (4 Stufen), legendäre Perks, Architekt-Gebäude, Kosmetik, Wochen-Mods |
| `ui` | 593 | Oberfläche: Buttons, Labels, HUD-Leisten, Phasen, Formations-/Farbnamen |
| `tutorial` | 494 | Glossar + die vier Archetyp-Leitfäden |
| `achievement` | 208 | Endbildschirm, Bestenlisten, Statistik-Hub, Upgrade-Baum |
| `ability` | 168 | Archetyp-Skills (Blitz/Feuer/Eis/Pflanze), Name + Beschreibung |
| `store` | 77 | Der Architekt (Bauphase) |
| `system` | 11 | Seed, Name, Laden, Installation |

**Gesamturteil (Prüfstand):** Die Textbasis war überdurchschnittlich gut — die Muster-Templates in
`families.js`, die konstanten-interpolierten Zahlen und das zentrale Glossar verhinderten den Großteil
der üblichen Drift. Die Probleme lagen an vier Stellen: **(a)** das Glossar war an den Systemwechseln
(Meisterränge → Upgrade-Baum, Feuer-Schmiede, Trimmen) nicht überall mitgezogen, **(b)** zentrale Begriffe
hießen je nach Bildschirm anders, **(c)** der Architekt-Screen formatierte Zahlen anders als der Rest,
**(d)** die Leitfäden beschrieben skill-gebundene Effekte als Grundeigenschaften des Archetyps.

---

## Kurzübersicht

| Block | Thema | Befunde | Stand |
|---|---|---:|---|
| **A** | Falsche oder tote Aussagen | 14 | ✔ erledigt |
| **B** | Ein Wort, mehrere Bedeutungen | 7 | ✔ erledigt |
| **C** | Mehrere Wörter, eine Sache | 9 | ✔ erledigt |
| **D** | Zahlen- und Format-Konventionen | 7 | ✔ erledigt (1 ↷ abweichend) |
| **E** | Rohe Bezeichner / Dev-Sprache | 8 | ✔ erledigt |
| **F** | Formulierung und Grammatik | 9 | ✔ erledigt |
| **G** | Vorlagen- und Namens-Inkonsistenzen | 6 | ✔ erledigt |
| **H** | Kleinere Beobachtungen | 4 | ✔ erledigt |
| **L** | Leitfäden, Deck-Ansicht, Skill-Katalog (Nachprüfung) | 9 | ✔ erledigt |
| **M** | Zustand des Glossars (Messung) | 5 | ✔ erledigt |

Zusätzlich nachgezogen: `docs/text-style-guide.md` (neu strukturiert, §1 Begriffstabelle erweitert,
§1e „Wörter, die nicht mehrfach belegt werden dürfen") und `README.md` (A14).

---

## A · Falsche oder tote Aussagen (Text ↔ Code)

> Das sind Aussagen, die einen Spieler aktiv in die Irre führen. Höchste Priorität — und sie müssen
> **vor** der Übersetzung raus, sonst frieren wir die Fehler in einer zweiten Sprache ein.

### A1 — Glossar „Asche" beschreibt Damaststahl falsch

**Stand:** ✔ Satz gestrichen (`glossary.js` `ash`).
`src/game/glossary.js:208` — „…**Damaststahl lässt Asche nie verfallen.**"
Damaststahl (`skills.js:157`, `SK_FIRE_L04`) tut etwas ganz anderes: *„Schmiedet **ohne Asche** jeden
Durchlauf deine niedrigste Karte … **Kein Ascheverbrauch**."* Der Skill hat mit dem Verfall von Asche
nichts zu tun. Der Satz stammt aus einem früheren Entwurf.
**→ Satz streichen** (oder ersetzen durch den tatsächlichen Verfallspfad: Restasche verglüht als
Weißglut-Überlauf, siehe B1).

### A2 — Glossar „Trimmen" und PlantBar nennen 4 von 6 trimmbaren Skills

**Stand:** ✔ Liste kommt jetzt aus dem Register: `trimmableSkillNames()` in `skills.js`, benutzt von Glossar und PlantBar.
`src/game/glossary.js:269` und `src/ui/PlantBar.jsx:106` listen *„(Aussaat, Flugsamen, Setzlingsbeet,
Zäher Halm)"*. `isTrimmableSkill` (`skills.js:269`, Flag `trimGrowth`) liefert **sechs**: Aussaat,
Flugsamen, Setzlingsbeet, Zäher Halm, **Ausläufer, Rhizom**.
Für den Pflanze-Spieler ist das eine echte Fehlinformation: Wer Ausläufer oder Rhizom ersetzt, löst
ebenfalls eine Trimmung aus — und weiß es nicht.
**→ Liste aus dem Register generieren**, nicht im Text pflegen (`SKILL_LIST.filter(s => s.trimGrowth)`).

### A3 — Glossar „Rarität" nennt eine Stufe, die es nicht gibt

**Stand:** ✔ Glossar interpoliert `TIER_META`; die `match`-Wortform „Ungewöhnlich“ ist durch „Raritäten“ ersetzt.
`src/game/glossary.js:312` — „Normal · **Ungewöhnlich** · Selten · Rar".
`rarity.js:24–27` (`TIER_META`) heißen sie: **Normal · Selten · Sehr selten · Rar**.
Der Upgrade-Baum (`progression.js`, Knoten `tier3`/`tier4`) sagt korrekt „Sehr selten"/„Rar".
Das Glossar ist der einzige Ort mit „Ungewöhnlich" — und `match: ["Rarität", "Ungewöhnlich"]`
(Zeile 313) fettet ein Wort, das im Spiel nirgends vorkommt.
**→ Glossar an `TIER_META` angleichen**, am besten interpoliert.

### A4 — Glossar „Neuwurf" nennt die falsche Reroll-Zahl für den Normalfall

**Stand:** ✔ Formulierung entkoppelt: Vorrat ohne feste Zahl, der Ranglisten-Wert separat genannt.
`src/game/glossary.js:98` — „…Perks · Gebäude · Skills, **je 2**…" (interpoliert `C.BASE_REROLLS`).
`C.BASE_REROLLS = 2` gilt aber nur **ohne Profil** (Sim/Standard) und im **Ranglisten-Lauf**
(`reducer.js:210` `effProfile = ranked ? null : action.profile`). Im normalen Lauf mit Profil greift
`rerollBase()` → `REROLL_BASE = 1` (`progression.js:31,206`; `reducer.js:225`).
Der Spieler liest also „je 2" und hat 1.
**→ Formulierung entkoppeln:** „Ein Vorrat je Kategorie und Lauf; der Upgrade-Baum hebt ihn."
(Die Ranglisten-Regel steht ohnehin im Regeln-Reiter.)

### A5 — Drei Glossar-Einträge verweisen auf entfernte „Meisterränge"

**Stand:** ✔ Alle drei Sätze auf Upgrade-Baum bzw. Legendär-Phase umgeschrieben; neue Konstante `LEG_PHASE_CYCLE` (aus dem Entscheidungsplan abgeleitet, kein hartkodiertes „29“).
| Ort | Text |
|---|---|
| `glossary.js:98` | „**Meisterränge** geben (pro Kategorie) mehr." |
| `glossary.js:188` | „Ab **Meisterrang V** gibt es einen garantierten Legendär." |
| `glossary.js:344` | „(**Meisterränge** und der Perk Bauhütte heben den Deckel)." |

Der Meisterrang ist ersetzt durch **Upgrade-Baum (SP/DP)** + **Ranglisten-Wochenmodus**
(`progression.js`, `reducer.js` `ranked`). Es gibt weder eine Rang-Leiter noch einen Rang-Reroll-Bonus
noch einen garantierten Legendär ab Rang V — legendäre Skills kommen jetzt **ausschließlich** aus der
Legendär-Phase in Runde 29 (`constants.js:63`, `LegendarySelect.jsx`).
**→ Alle drei Sätze auf den Upgrade-Baum umschreiben.**

### A6 — Die halbe Glossar-Kategorie „Fortschritt & Meta" beschreibt ein entferntes System

**Stand:** ✔ Die drei Einträge gelöscht; **sechs** neue dafür: Stichpunkte (SP), Deckpunkte (DP), Upgrade-Baum, Ranglisten-Lauf, Wochen-Modifikator, Position.
`src/game/glossary.js:378–386`: `meisterrang` („Meister I–V … 5/10/15/25/50 Mio."), `meisterlauf`
(„Nur Meister-Läufe zählen für die Rang-Leiter"), `grossmeister` („Fünf Stufen über Meister V").
Keine dieser Mechaniken existiert im pixi-Branch — es gibt kein `MasterRunSelect`, keine `MasteryBar`,
keine `masteryGrade*`-Funktionen mehr. Ein Spieler, der das Glossar öffnet, sucht danach vergeblich.
**→ Drei Einträge löschen und durch die aktuellen ersetzen:** *Stichpunkte (SP)*, *Deckpunkte (DP)*,
*Upgrade-Baum*, *Onboarding*, *Ranglisten-Lauf*, *Wochen-Modifikatoren* — davon ist derzeit **keiner**
im Glossar, obwohl alle im UI vorkommen.

### A7 — Glossar „Bindeglied" ≠ Familie „Bindeglied" Stufe IV

**Stand:** ✔ Präzisiert und um den abweichenden Gebäude-Fall (Kreuzgang) ergänzt.
`glossary.js:168`: „Spannweite je Stufe: I/II ±1, **III/IV ±2**".
`families.js` (C_BRIDGE) Stufe IV: *„dürfen für eine Treppe **jeden Wert zwischen ihren Nachbarn**
annehmen"* — das ist keine ±2-Spannweite, sondern unbegrenzt innerhalb der Nachbarn.
(Das Architekt-Gebäude *Kreuzgang* nutzt wiederum `bindSpanFor(t)` = ±1/±2 — dort stimmt es.)
**→ Glossar auf „I/II ±1 · III ±2 · IV frei zwischen den Nachbarn" präzisieren.**

### A8 — Glossar „Skill-Slot" ignoriert den 7. Slot

**Stand:** ✔ Satz um den zusätzlichen, festen Legendär-Slot ergänzt.
`glossary.js:179`: „Du hältst höchstens **6** Skills gleichzeitig."
Die Legendär-Phase vergibt einen **fixen 7. Slot** (`LegendarySelect.jsx:26` „7. Slot", kein Tausch).
Zusätzlich hebt der Wochen-Modifikator *Skill-Fülle* die Slots um bis zu +3 (`reducer.js`, `effSkillSlots`).
**→ „…6 Skills; der legendäre Skill aus Runde 29 belegt einen zusätzlichen, festen Slot."**

### A9 — Freischalt-Text nennt die falsche Währung *und* den falschen Preis

**Stand:** ↷ **abweichend:** Währung korrigiert („In der Deck-Werkstatt mit Deckpunkten (DP) kaufen“), Preis **nicht** interpoliert — `themes.js` → `cosmetics.js` wäre ein Import-Zyklus. Der Preis steht ohnehin auf der Pack-Kachel.
`src/game/cosmetics.js:200`: „**In der Deck-Werkstatt kaufen (1 SP)**".
Packs werden mit **DP (Deckpunkten)** gekauft (`themes.js` `buyPack` → `profile.deckPoints`), und der
Preis ist **je Pack verschieden**: 5 / 10 / 15 DP (`THEME_DEFS[*].price`). Die Werkstatt selbst zeigt
korrekt „(zu wenig **DP**)" (`CustomizeScreen.jsx:1151`) — der Sperrtext daneben sagt SP.
**→ „In der Deck-Werkstatt für {n} DP kaufen" (Preis interpolieren).**

### A10 — Freischalt-Text „Sparfuchs" nennt den alten Modus

**Stand:** ✔ „Ranglisten-Wochenlauf“; der Test in `cosmetics.test.js` wurde mitgezogen.
`src/game/cosmetics.js:192`: „Schließe einen **Meisterrang-Wochenlauf** ohne einen einzigen Reroll ab."
Der Modus heißt jetzt **Ranglisten-Lauf** (`storage.js:271` — „ranked" ist der neue Wochen-Ranglisten-Modus,
ersetzt „meister"). Der Code hält den alten Key nur noch aus Kompatibilität.
**→ „Ranglisten-Wochenlauf".**

### A11 — Formations-Legende behauptet einen festen Ankerfaktor

**Stand:** ✔ Legende sagt „Faktor je Quelle“.
`src/ui/ArchPanels.jsx:53`: „**A** Anker — Einzelposition **×1,25**".
`ANCHOR_FORM_FACTOR = 1,25` ist nur der Default. Real vorkommende Ankerfaktoren:
E-Familien **1,25 … 1,35** (Kontrollverlust/Schnellschuss IV), Architekt *Grundstein*
**1,10 / 1,23 / 1,36 / 1,49** (`architect.js`, `tierFactor`), Eisanker eigener Wert.
Das Glossar (`glossary.js:144`) sagt es richtig: „Faktor je Quelle".
**→ Legende auf „Einzelposition zählt als Formation (Faktor je Quelle)" ändern.**

### A12 — Formations-Legende ist unvollständig

**Stand:** ✔ Legende wird aus `FORMATION_TYPES` generiert — Nachhall/Kern/Grenzbonus erscheinen automatisch.
Dieselbe Legende (`ArchPanels.jsx:49–56`) erklärt **W F T Z A**. Die Karten-Badges rendern aber acht
Kürzel (`ui/formationLabels.js`): zusätzlich **N** Nachhall, **K** Kern, **G** Grenzbonus.
Ein Spieler mit Segmentarbeit IV oder Formationskern sieht Buchstaben, die nirgends erklärt sind.
**→ Legende aus `FORMATION_TYPES` generieren statt sie zu hardcoden.**

### A13 — Ein Gebäude, drei verschiedene Beschreibungen

**Stand:** ✔ `familyEffectText` in `src/game/architect.js`; ArchitectScreen, `ui/archEffects.js`, `scripts/gen-db.mjs` und der Loc-Export lesen dieselbe Quelle. Die Formations-Anzeigenamen liegen jetzt in `constants.js` (`FORMATION_LABELS`), `ui/formationLabels.js` hält nur noch die Badge-Kürzel.
Der Effekttext eines Architekt-Gebäudes wird an **drei** Stellen unabhängig gebaut:

| Quelle | Sichtbar in | Beispiel *Giebel* / *Losbude* / *Kreuzgang* |
|---|---|---|
| `ArchitectScreen.jsx:1201` `famEff` | Bauphase, Tooltips, Ersetzen-Menü | „höchste Karte +160 **Score**" · „… −15 **Score**" · „Treppen-Bindeglied: **Karte darf im Wert** um ±1 abweichen" |
| `scripts/gen-db.mjs:39` `archEff` | öffentliche Core-DB-Seite `/db/` | „höchste Karte +160 **Punkte**" · „… **−15**" · „Treppen-Bindeglied: **Wert darf** um ±1 abweichen" |
| `ui/archEffects.js:14` | Kartendetail (Karte antippen) | „**+160 Score**" · „**+90 Score bei Crit, sonst −15**" · „Treppen-Bindeglied **(±Span)**" |

Weitere Divergenzen: `milestone` („jeder 5. Sieg **auf diesem Gebäude**" vs. „jeder 5. Sieg"),
tierKick („bei Crit ×2 **Direkt-Score**" vs. „×2 **Flat**"), („**zweiter Joker-Typ:** wiederholung" vs.
„**+Joker** wiederholung"), („je **Ankerzelle**" vs. „je **Zelle**").
**→ `famEff` nach `src/game/architect.js` ziehen und von allen dreien importieren.** Solange das nicht
passiert, muss der Übersetzer dieselbe Aussage dreimal übersetzen — mit drei Fehlerquellen.
*(Die CSV bildet den In-Game-Wortlaut ab, nicht den der DB-Seite.)*

### A14 — README als Referenz unbrauchbar geworden (nicht spielersichtbar, aber riskant)

**Stand:** ✔ README nachgezogen: Kopf, §1, §3 (50-Einträge-Plan, Legendär-Phase, `glacier-target`), §4 (Score-Formel ohne Stats, Basis-Crit 0, `CRIT_BASE_MULT` 2,25, `SCORE_PER_WIN` 400), §5, §6 (Stat-Phase → Präzision-Familien), §7, §9 (12 Skills / 6 Slots / 4 Archetypen, eigene Absätze für Eis und Pflanze), §10, §11, §15 (Dateiliste), §16 (Konstantentabelle), §17 (1015 Tests).
`README.md` beschreibt: `MAX_CYCLES = 60` (real **50**), Treppe „Schritt ≤3" (real **≤4**), Wechsel
„Nachbardiff ≥5" (real **≥4**), `SKILLS_OFFERED = 6` (real **12**), `SKILL_SLOTS = 4` (real **6**),
`MAX_ARCHETYPES = 3` (real **4**), eine Stat-Phase mit 5 Stats (entfernt, #267), Münz-Einkommen,
`src/game/stats.js` und `shopFamilies.js` (existieren nicht mehr).
Das ist deshalb ein Sprach-Thema, weil die README bislang die erste Anlaufstelle für „was heißt
dieser Begriff" war — und damit falsche Begriffe verbreitet.
**→ README-Abschnitte 5–9 und 16 nachziehen.**

---

## B · Ein Wort, mehrere Bedeutungen

> Das ist die teuerste Klasse von Problemen: Das Glossar fettet solche Wörter automatisch
> (`tokenizeGlossary`) und zeigt **eine** Erklärung — bei kollidierenden Begriffen also die falsche.

### B1 — „Weißglut" bezeichnet zwei verschiedene Mechaniken

**Stand:** ✔ Zwei Namen: **Weißglut** = Hitze-Überlauf (Skill), **Ascheglut** = Asche-Überlauf. Eigener Glossareintrag je Pfad; der HUD-Kanal, der beide summiert, heißt neutral „Überlauf“ mit erklärendem Tooltip.
| Bedeutung | Regel | Quelle |
|---|---|---|
| **Skill „Weißglut"** (`SK_FIRE_07`) | Hitze-Überlauf: **+10 Score je überlaufendem Hitzepunkt** | `skills.js:126`, `constants.js:349` |
| **„Weißglut-Überlauf"** der Schmiede | Asche-Überlauf: **+2 000 Score je 20 Asche** | `skills.js:145`, `constants.js:376` |

Der Glossar-Eintrag heißt „Weißglut-Überlauf", erklärt **nur die Asche-Variante** und hat
`match: ["Weißglut"]` (`glossary.js:210–212`). Ergebnis: Im Skill-Text „Weißglut" (Hitze) poppt die
Asche-Erklärung auf. Die HeatBar zeigt umgekehrt eine Zeile „Weißglut" (`HeatBar.jsx:93`), die im
Engine-Kanal `fireWhite` **beide** Quellen summiert (`engine.js:459` und `:1242`) — der Tooltip daneben
(`HeatBar.jsx:125`) erklärt aber nur die Hitze-Hälfte.
**→ Zwei Namen vergeben.** Vorschlag: Skill bleibt **Weißglut** (Hitze), der Schmiede-Pfad wird
**Ascheglut** (oder „Verglühen"). Der HUD-Kanal heißt dann „Überlauf-Score".

### B2 — „Stufe" bezeichnet fünf verschiedene Dinge

**Stand:** ✔ „Stufe“ ist nur noch die Familien-/Gebäude-Stufe. Gletscher: **Schwelle**/**Wucht** (Glossar `bersten`, Abbruchkante, Ewiges Schild, Leitfaden-Skala). Zinseszins und Farbserie sind ausformuliert.
1. **Familien-/Gebäude-Stufe I–IV** (Glossar `stufe`, Rarität) — der einzige erklärte Sinn.
2. **Gletscher-Masse-Stufe**: „Burst-Score aus Masse × **Stufen-Wucht** (Schwellen 4/8/12)"
   (`glossary.js:239`), „×1,8 / ×3 auf **Stufe 2 / 3**" (Abbruchkante, `skills.js`),
   „jeder auf **höchster Stufe**" (Ewiges Schild).
3. **Zinseszins-Zinsstufe**: „der Zinssatz fällt **eine Stufe**" (`perks.js`, L_ZINS).
4. **Farbrausch-Stufe**: „ein Farbwechsel **halbiert die Stufe**" (D_SUIT_STREAK IV).
5. **Rarität-„Seltenheitsstufe"** (`App.jsx:469`).

**→ Für die Gletscher-Achse ein eigenes Wort:** „Berst-Schwelle" / „Wuchtstufe" existiert schon als
`match` in `glossary.js:240` („Berst-Schwelle", „Berst-Faktor") — nur benutzt es kein Text.

### B3 — „Kaskade" ist im Glossar Blitz, im Spiel auch Eis

**Stand:** ✔ Der Glossareintrag deckt jetzt beide Ausprägungen ab (Blitz und Eis) und liegt in der Gruppe „Allgemein“.
`glossary.js:227` definiert Kaskade rein für Blitz („Ein Crit auf oder neben einer ionisierten Karte
erzeugt zusätzliche Ladung"). Eis benutzt dasselbe Wort für die Bruchkette: `GlacierBar.jsx:161`
(HUD-Zeile „Kaskade"), `guides.js:97,100,105` („kann eine **Kaskade** durchs ganze Cluster auslösen"),
`glossary.js:239` selbst („verstärkt um +25 % je angrenzendem Gletscher").
**→ Entweder Eis umbenennen (z. B. „Bruchkette") oder den Glossar-Eintrag zweiteilig fassen.**

### B4 — „Ladung" ist die Blitz-Ressource, wird aber auch für Fehlzündung benutzt

**Stand:** ✔ „25 % der Ladung“ → „25 % des aufgestauten Scores“ (Familie Fehlzündung IV).
Familie *Fehlzündung* Stufe IV: „nach einem Crit bleiben **25 % der Ladung**." Gemeint ist der
aufgestaute Score, nicht die Blitz-Ladung — aber das Glossar fettet „Ladung" und erklärt den Blitz-Akku.
**→ „25 % des aufgestauten Scores".**

### B5 — „Punkte" meint mal Score, mal Prozentpunkte

**Stand:** ✔ Zinseszins und Überschusskrit sagen „Prozentpunkte“; die Architekt-Texte sagen durchgängig „Score“.
- *Zinseszins*: „der Zinssatz steigt um **4 Punkte**" → Prozentpunkte.
- *Überschusskrit* IV: „plus 5 je Prozentpunkt über 100 % (höchstens **100 Punkte** gezählt)" →
  Prozentpunkte, direkt neben „+500 **Score**".
- *Architekt/Core-DB*: „höchste Karte +160 **Punkte**" → Score (siehe A13).
- Style-Guide erlaubt „Punkte" ausdrücklich nur als Kategoriename und im Idiom „zahlt Punkte".

**→ In Zahlenkontexten immer „Score" bzw. „Prozentpunkte" ausschreiben.**

### B6 — Der Buchstabe „G" auf der Karte bedeutet zwei Dinge

**Stand:** ✔ Das Gletscher-Formations-Badge ist jetzt ❄ statt „G“ — „G“ gehört dem Grenzbonus.
`CardGrid.jsx:83` rendert die Formations-Kürzel inkl. **G = Grenzbonus** (`formationLabels.js:15`).
`CardGrid.jsx:135` rendert daneben ein blaues **G = „Teil einer aktiven Gletscher-Formation"**.
Beide sitzen im selben Badge-Bereich derselben Karte. Nur die Farbe unterscheidet sie.
**→ Für die Gletscher-Formation ein Symbol statt eines Buchstabens (❄/◈).**

### B7 — „Formation" ohne Zusatz meint mal Karten-, mal Eis-Formation

**Stand:** ✔ Glossar `formation` grenzt gegen die Eis-Formationen ab.
Sauber getrennt im Glossar (`formation` vs. `eisformation`), aber nicht in den Skills:
*Anfrieren* — „siegt der Gletscher **in einer Formation**" (= Karten-Formation);
*Eiswall* — „die **Linien-Formation**" (= Eis-Formation). `RunStats.jsx:83` „Maximal gleichzeitig aktive
Formationen" zählt nur Karten-Formationen.
**→ In Eis-Texten konsequent „Eis-Formation" ausschreiben.**

---

## C · Mehrere Wörter für dieselbe Sache

### C1 — Rarität: vier Vokabulare, zwei Farbnamen für Lila

**Stand:** ✔ Ein Vokabular: „Rarität“ plus die vier Namen aus `TIER_META`, keine Farbwörter mehr (App.jsx, StartScreen, Glossar).
| Ort | Wortlaut |
|---|---|
| `rarity.js:24–27` | Normal · Selten · **Sehr selten** · **Rar** |
| `progression.js` (`tier3`/`tier4`) | „Sehr selten" / „Rar", Detail „Rarität Sehr selten (**blau**)" / „(**lila**)" |
| `App.jsx:465` | „**Seltenheit** III (**Blau**)" / „**Seltenheit** IV (**Lila**)" |
| `App.jsx:469,473` | „Neue **Seltenheitsstufe**" |
| `StartScreen.jsx:28` | „**Rarität**: Blau" / „**Rarität**: **Violett**" |
| `glossary.js:312` | „Normal · **Ungewöhnlich** · Selten · Rar" (A3) |

Derselbe Freischalt-Schritt heißt im Onboarding-Chip „Rarität: Violett", im Endbildschirm
„Seltenheit IV (Lila)" und im Upgrade-Baum „Rar".
**→ Kanonisch: „Rarität" als Oberbegriff, die vier Namen aus `TIER_META`, Farbwort weglassen
(die Farbe ist sichtbar).**

### C2 — Die Tausch-Ressource der Aufstellungsphase hat vier Namen

**Stand:** ✔ Überall **Formations-Energie** (weekMods, FormationPhase).
„**Formations-Energie**" (Glossar `formenergie`, `constants.js`, Familie *Feinjustierung*) ·
„**Tausch-Energie**" (`FormationPhase.jsx:179`) · „**Aufstell-Energie**" (`weekMods.js` — *Energie-Ebbe*
„Start mit 0 Aufstell-Energie", *Energie-Flut* „Doppelte Aufstell-Energie") · schlicht „**Energie**"
(`UpgradeScreen.jsx:26`, Knoten *Energie I/II*, Familie *Feinjustierung*).
**→ Kanonisch „Formations-Energie", kurz „Energie" nur wo der Kontext eindeutig ist.**

### C3 — Die Phase selbst hat vier Namen

**Stand:** ✔ Überall **Aufstellungsphase** (weekMods); die Bildschirm-Überschrift bleibt „Deck aufstellen“ (Aktion).
„**Aufstellungsphase**" (Glossar `aufstellung`) · „**Formationsphase**" (Familie *Feinjustierung*:
„Jede zweite Formationsphase") · „**Aufstellphase**" (`weekMods.js` *Deck-Shuffle*: „vor jeder
Aufstellphase") · „**Deck aufstellen**" (`FormationPhase.jsx:144`, Überschrift des Bildschirms).
Dazu `DevRunSetup.jsx:16` „Aufstellung" als Entscheidungstyp.
**→ Kanonisch „Aufstellungsphase"; die Bildschirm-Überschrift darf „Deck aufstellen" bleiben (Aktion).**

### C4 — „Durchlauf" vs. „Runde"

**Stand:** ✔ Durchgängig **Durchlauf**; HUD-Zelle „Durchl.“ (Platz), Eis-Texte „jeden Durchlauf“, Spielfeld-Zähler „Stich 23 / 40“ statt „Deck:“.
Das Glossar definiert **Durchlauf** (40 Stiche) und benutzt es durchgängig; `RoundScoreBadge`
zeigt „Durchlauf-Score". Das HUD zeigt daneben „**Runde** 12/50" (`StatusBar.jsx:81` — der Code-Kommentar
gibt selbst zu: *„Runde (nur der Durchlauf …)"*). Dazu `DevRunSetup.jsx:96` „Runden",
`LeaderboardScreen.jsx:48` und `StartScreen.jsx:28` „**R29**".
**→ Eins von beiden.** Empfehlung: **„Runde"** im HUD (kurz, passt in die Zelle) und „Durchlauf"
überall sonst ist *nicht* haltbar — es sind zwei Wörter für denselben Zähler. Entweder das Glossar
nimmt „Runde" als Synonym auf, oder das HUD sagt „Durchl.".

### C5 — „Archetyp" vs. „Fraktion"

**Stand:** ✔ „Fraktion“ aus dem Spielertext entfernt (bleibt nur als `match`-Wortform im Glossar).
Kanonisch ist **Archetyp** (Glossar `archetyp`, `ARCHETYPE_META`). „Fraktion" steht noch in
`weekMods.js` (*Skill-Verknappung*: „Nur 1 Skill je **Fraktion**"), in `CustomizeScreen`-Kommentaren
und als `match`-Wortform im Glossar. `App.jsx:471` benutzt „Archetyp".
**→ „Fraktion" aus dem Spielertext entfernen (als `match`-Wortform darf es bleiben).**

### C6 — Die Brettzellen des Architekten haben fünf Namen

**Stand:** ✔ **Baufeld** = Kontingent, **Zelle** = Position; „Bauplätze“/„Bau-Felder“ ersetzt.
„**Baufeld**" (Glossar, HUD „Baufeld belegt", Upgrade-Knoten „Baufeld I–III") ·
„**Bauplätze**" (`weekMods.js` *Enge Aufstellung*: „Nur 12 Bauplätze") ·
„**Bau-Felder**" (`weekMods.js` *Gesperrte Bau-Felder*) ·
„**abgedeckte Zelle**" (Glossar, Familie *Dichte Bebauung*) ·
„**Brettzellen**" (Glossar `baufeld`).
**→ Kanonisch: „Baufeld" = das Kontingent, „Zelle" = die einzelne Position, „belegt/abgedeckt" für
den Zustand. „Bauplatz"/„Bau-Feld" streichen.**

### C7 — „Direkt-Score" / „Flat" / „Flat-Score"

**Stand:** ✔ Kanonisch **Direkt-Score**; der Style-Guide ist nachgezogen.
Glossar und Skills sagen **Direkt-Score** (`glossary.js:103`), der Style-Guide sagt **Flat-Score**,
`gen-db` sagt „**Flat**" (A13), der Architekt-Screen „Direkt-Score".
**→ Kanonisch „Direkt-Score", Style-Guide nachziehen.**

### C8 — „Dauerwert" statt „Kartenwert"

**Stand:** ✔ „Dauerwert“ ersetzt (Familie Überzahl, HeatBar) — bleibt nur als `match`-Wortform.
Familie *Überzahl* Stufen I–III: „**Dauerwert** ≥2 höher als der Vorgänger" — Stufe IV lässt es weg
(„Höher als der Vorgänger"). Das Glossar führt „Dauerwert" nur noch als Alt-`match` von *Kartenwert*.
**→ Auf „Kartenwert" vereinheitlichen.**

### C9 — „Gebäude-Boost" / „Struktur-Bonus" / „Struktur-Kombi"

**Stand:** ✔ Glossar `struktur` erklärt jetzt das Verhältnis: Struktur- plus Distrikt-Faktoren ergeben den angezeigten **Gebäude-Boost**.
`ArchitectScreen.jsx:592` HUD-Kachel „**Gebäude-Boost**", `:1168` „**Struktur-Bonus**", `:840`
„**Struktur & Distrikt**", `:591` Tooltip „**Struktur-Kombis**", Glossar `struktur` „**Struktur-Boni**".
Der erste ist die Summe, die anderen ein Teil davon — der Unterschied wird nicht erklärt.
**→ „Gebäude-Boost" = Gesamtwert, „Struktur-Faktor"/„Distrikt-Faktor" = die Bestandteile.**

---

## D · Zahlen- und Format-Konventionen (Style-Guide §2)

### D1 — „pp" vs. „Prozentpunkte" vs. „%" · **10 + 19 Stellen**

**Stand:** ✔ Additive Crit-Angaben stehen in **%**. ↷ **abweichend:** an den drei Stellen, die gegen die 100-%-Schwelle rechnen (Überschlag, Überschusskrit, Raserei), bleibt „Prozentpunkte“ ausgeschrieben — „je 10 % über 100 %“ wäre unlesbar. Im Style-Guide §2 als Ausnahme festgehalten.
Die Präzision-**Familien** schreiben aus: „Alle Karten: **+6 Prozentpunkte** Crit-Chance."
Die Glossar-Einträge zu **denselben Familien** kürzen ab: „(6/9/12/15 **pp** je Stufe)."
Die Blitz-Skills kürzen ab („+2 **pp** Crit-Chance"), der Leitfaden schreibt aus („je 10
**Prozentpunkte** über 100 %"). Der legendäre Perk **Raserei** benutzt **beides in einem Text**:
> „Jeder Sieg in Folge gibt +5 **pp** Crit-Chance. … je 100 **Prozentpunkte** +1,00×…"

„pp" ist nirgends erklärt und steht **nicht** im Style-Guide (der kennt nur „+8 % Crit-Chance" und
„+40 Prozentpunkte").
**→ Eine Form festlegen.** Empfehlung: **„Prozentpunkte"** in Fließtext-Beschreibungen,
**„pp"** nur in Chips/HUD mit Platznot — und dann ins Glossar aufnehmen.

### D2 — Der Architekt-Screen benutzt den Dezimal**punkt**

**Stand:** ✔ `fmtFactor` (Komma) in der geteilten Quelle; alle Gebäude-Faktoren erscheinen als ×1,10 / ×1,15 / ×1,30 / ×1,40.
`ArchitectScreen.jsx` `famEff`:
```
:1214  case "mult":     `Siege hier ×${base.factor}`          → „Siege hier ×1.3"
:1227  case "anker":    `… ×${tierFactor(...).toFixed(2)}`    → „jede Zelle = Anker ×1.10"
:1228  case "formMult": `Formationen hier ×${base.factor}`     → „Formationen hier ×1.4"
:1235  tierKick mult:   `zusätzlich ×${k.mult} Score`          → „zusätzlich ×1.15 Score"
```
Dieselbe Datei hat oben `const fmt = (x) => x.toFixed(2).replace(".", ",")` (Zeile 42) und benutzt ihn
im **selben Tooltip** (Zeile 715: `· Formation ×${fmt(pf.mult)}` → „×1,25").
Ein Grundstein-Tooltip liest sich damit real so:
> „Grundstein (II) — jede Zelle = Anker **×1.23** · Formation **×1,25** · Struktur **×1,50**"

Betroffen: Grundstein (4 Stufen), Zollhaus (4), Schatzkammer, Kathedrale. **11 Strings.**
**→ `fmt()` in `famEff` durchziehen** (und beim Herausziehen nach `architect.js`, A13, gleich mit).

### D3 — Fehlende Tausendertrennung

**Stand:** ✔ `grp()` bei Vabanque und Flächenbrand; `grp()` in `perks.js` ergänzt.
- `perks.js:97` **Vabanque**: „gibt es **+400000** Score" → muss `+400.000` heißen.
- `skills.js` **Flächenbrand**: „(voll ≈ **+1200**)" → `+1.200`.
Beide Register haben den Helfer `grp()` bereits — er wird an diesen zwei Stellen nur nicht benutzt.
Zum Vergleich, korrekt: „+2.000 Score je 20 Asche", „max +1.200", „+1.000 Score".

### D4 — Tempo-Buttons: „X2" statt „×2"

**Stand:** ✔ Die Tempo-Buttons zeigen ×2 / ×4.
`StatusBar.jsx:66–67`: Beschriftung **`X2` / `X4`**, Tooltip derselben Buttons **„Tempo ×2" / „×4"**.
Style-Guide §2: „Multiplikator: ×1,25 (Malzeichen ×, kein `x`/`*`)."
**→ `×2` / `×4`.** (Die Breite ändert sich nicht.)

### D5 — Fehlende Einheit

**Stand:** ✔ „+1.000 Score“ auf beiden Satzhälften.
Familie *Volles Haus* Stufe IV: „+**1.000** auf den dritten; der fünfte Sieg zusätzlich +**1.000**."
Die Stufen I–III sagen alle „+500 **Score**".
**→ „Score" ergänzen.**

### D6/D7 — Umgangssprachliche Kürzel im UI

**Stand:** ✔ „Multiplikator“ statt „Multi“. · ✔ „Nachbardifferenz“ statt „Diff“.
`ArchPanels.jsx:55,57`: „mehr Formationen = mehr **Multi**", „mehr Rahmen = mehr **Multi**" (statt
Multiplikator) · `ArchPanels.jsx:52`: „**Diff** ≥4" (Glossar: „Nachbardifferenz ≥4").

---

## E · Rohe Bezeichner und Entwickler-Sprache im Spielertext

### E1 — Formationstypen als Enum-Keys, kleingeschrieben · **6 Strings**

**Stand:** ✔ Joker-Typen als ausgeschriebene Namen über `formationLabel()` — auch der per tierKick dazukommende Typ.
```
Formations-Joker (wiederholung/farbblock/treppe/wechsel)     ← Basilika, Prisma
Formations-Joker (wiederholung)                              ← Fries
Formations-Joker (wiederholung/treppe)                       ← Gewölbe
Formations-Joker (farbblock) (Stufe 3: +Joker wiederholung)  ← Klammer
```
Ursache: `base.types.join("/")` (`ArchitectScreen.jsx:1223`, ebenso `gen-db.mjs` und `archEffects.js`)
gibt die internen Schlüssel aus statt `formationLabel(type)`.
Es ist der einzige Ort im Spiel, an dem „Wiederholung" klein und ohne Umlautprüfung erscheint —
und für die Übersetzung ist es ein untranslatierbarer Rohwert.
**→ `formationLabel()` benutzen: „Formations-Joker (Wiederholung/Farbblock/Treppe/Wechsel)".**

### E2 — „(±Span)"

**Stand:** ✔ „(±Span)“ entfernt; `archEffects.js` nutzt den Wortlaut der geteilten Quelle.
`ui/archEffects.js:43`: „Treppen-Bindeglied **(±Span)**" — im Kartendetail sichtbar. „Span" ist der
Variablenname (`bindSpanFor`). Der Architekt-Screen schreibt an derselben Stelle korrekt
„Karte darf im Wert um ±1 abweichen".

### E3 — „R29"

**Stand:** ✔ „R29“ ersetzt durch „Durchlauf 29“ bzw. „Legendär-Phase“ — die Zahl kommt aus `LEG_PHASE_CYCLE`.
`StartScreen.jsx:28` („Legendär ⭐ (R29)") und `LeaderboardScreen.jsx:48` („Legendär ab R29").
„R" = Runde ist nirgends eingeführt. Für Neuspieler beim Onboarding-Chip besonders unglücklich:
Es ist die *Belohnung* des letzten Onboarding-Glieds — und sie wird in einer Chiffre benannt.
**→ „Legendär-Phase (Runde 29)".**

### E4 — „Burst" im Eintrag, der „Bersten" definiert

**Stand:** ✔ „Berst-Score“ (Glossar und Leitfaden).
`glossary.js:239`: „…bricht er: **Burst-Score** aus Masse × Stufen-Wucht…" — im selben Satz, in dem
das deutsche Wort „bricht" steht. `guides.js:96` („großer **Score-Burst**"), `glacier.js` durchgehend.
Style-Guide §1 legt „**Bersten** (Subst.) / **bricht, brechen** (Verb)" fest.
**→ „Berst-Score".**

### E5 — Weitere Anglizismen / Dev-Sprache im Spielertext

**Stand:** ✔ „Wendepunkt zur Ernte“, „Ernte“, „Challenger-Archiv“, „Löse … aus“, „nährt sich selbst“.
| Ort | Text |
|---|---|
| `glossary.js:269` | „Der **Grow→Ernte-Pivot**" · „veredeln die **Payoff-Phase**" |
| `guides.js:156` | „Trimmen ist der **Ernte-Pivot**" |
| `cosmetics.js:196` | „Beende eine Wochen-Rangliste auf Platz 1 (**Champion-Board**)" |
| `cosmetics.js:188` | „**Triggere** zum ersten Mal einen „Gottgleich"-Stich" |
| `guides.js` (Blitz) | Kreislauf-Mitte „STURM / **self-feeding**" |

**→ „Wendepunkt zur Ernte", „Auszahlungsphase", „Wochensieger-Tafel", „Löse zum ersten Mal … aus",
„nährt sich selbst".**

### E6 — Issue-Nummer im Tooltip

**Stand:** ✔ Ticket-Nummer raus; der PlantBar-Tooltip erzeugt die Skill-Liste aus dem Register.
`PlantBar.jsx:106`: `title="Trimmen (#288): jeder ersetzte Wachstums-Skill …"` — die Ticket-Nummer
steht im spieler-sichtbaren `title`-Attribut.

### E7/E8 — Unerklärte Fachbegriffe

**Stand:** ✔ „Feldtiefe“ → „Feld-Bonus“ (Skill Pfahlwurzel). · ✔ Neuer Glossareintrag **Serienpunkt**.
- „**Feldtiefe**" — Skill *Pfahlwurzel*: „(Jahresringe/**Feldtiefe** bleiben unberührt)". Der Begriff
  kommt in keinem anderen Text und in keinem Skill-Namen vor; gemeint ist offenbar der
  wachstumsabhängige Anteil aus *Wurzeltiefe*.
- „**Serienpunkt**" — 6 Familien-/Skill-Texte („+15 Score je **Serienpunkt**", „+1 Ladung je 3
  **Serienpunkte**"). Das Glossar erklärt „Serie", aber nicht die Zähleinheit.
- „**Bekenntnis**" ist erklärt (Glossar), taucht im Spielertext aber nur in zwei Legendär-Skills auf —
  gut, nur die Schreibweise schwankt („Blitz-Bekenntnis" vs. „dem Blitz-Bekenntnis").

---

## F · Formulierung und Grammatik

### F1 — Grammatikfehler

**Stand:** ✔ „für den Farbblock“.
`CardGrid.jsx:137`: `title="Grün (reif) — zählt **fürs** Farbblock"` → *der* Farbblock, also
„für den Farbblock". `Card.jsx:125` macht es an derselben Stelle richtig: „Teil des Farbblocks".

### F2 — Doppelte Verneinung

**Stand:** ✔ „eine zufällige andere Farbe verliert 1 Kartenwert“.
Familie *Farbduell* III: „eine andere Farbe **verliert zufällig −1** Kartenwert."
„verliert −1" liest sich als *gewinnt 1*. Stufen I/II formulieren es richtig („eine andere **−1**
Kartenwert").
**→ „…eine zufällige andere Farbe verliert 1 Kartenwert."**

### F3 — „stärker", aber die Zahlen sind identisch

**Stand:** ✔ „brennen Brände **zusätzlich** −1 Wert und geben +1 Asche extra“.
Skill *Schmelzofen*: „Ab 50 % Hitze brennen Brände **stärker (−1 Wert, +1 Asche)**…"
`SCHMELZOFEN_BRAND_BONUS` ist ein **Zusatz** — Basis ist bereits −1/+1 (Brandmal). Der Text nennt den
Zusatz so, dass er wie der Gesamtwert aussieht.
**→ „…brennen Brände **zusätzlich** −1 Wert und geben +1 Asche extra."**

### F4 — Redundanz im selben Text

**Stand:** ✔ Dopplung entfernt (Richtfest).
Legendär *Richtfest*: „**Am Ende jedes Durchlaufs**: je vollendeter Struktur … +250 dauerhafter Score.
Der aufgestapelte Bonus wird **am Ende jedes Durchlaufs** ausgezahlt (flach, kein Multiplikator)."

### F5 — Formulierung ergibt keinen Sinn

**Stand:** ✔ „+0,01× je Prozentpunkt darüber, höchstens +1,00×“ — entspricht exakt `critMultBonus`.
Legendär *Raserei*: „…hebt der Überschuss zusätzlich den Crit-Multiplikator — **je 100 Prozentpunkte
+1,00×, höchstens +1,00×**." Schritt = Deckel; die Regel reduziert sich auf „ab 100 pp Überschuss +1,00×".
**→ „…ab 100 Prozentpunkten Überschuss zusätzlich +1,00× Crit-Multiplikator (Maximum)."**

### F6 — Pfeilnotation statt Sätzen

**Stand:** ✔ Alle vier Pendelwerk-Stufen als Sätze.
Familie *Pendelwerk*, alle vier Stufen:
```
I   Wechsel-Differenz ≥4 → ≥3 (weiterhin ab 3 Karten).
II  Wechsel ab 3 → 2 Karten (Differenz ≥4).
III Wechsel ab 3 → 2 Karten · Differenz ≥4 → ≥3.
IV  Wechsel ab 3 → 2 Karten · Differenz ≥4 → ≥2; 2er-Wechsel ab ×1,35.
```
Das ist Balancing-Notation, keine Spielersprache — und die einzige Familie im ganzen Register, die so
geschrieben ist. Verstößt gegen Style-Guide §3 („Kurz & aktiv … Bedingung → Wirkung").
**→ „Ein Wechsel braucht nur noch 2 Karten; die Nachbardifferenz darf auf 2 sinken. Zweier-Wechsel
zählen ab ×1,35."**

### F7 — Familienname im eigenen Beschreibungstext

**Stand:** ✔ Nachhall (vier Stufen) und Blitzfänger nennen sich nicht mehr selbst.
Familie *Nachhall* Stufe I beginnt mit „**Nachhall:** der Formations-Faktor…", die Stufen II–IV
ebenfalls („Nachhall bei allen Formationen", „Nachhall übernimmt…"). Keine andere der 60 Familien
wiederholt ihren Namen — der steht bereits als Überschrift über dem Text.

### F8 — Zahl nur auf zwei von vier Stufen

**Stand:** ✔ Ankerfaktor auf allen vier Stufen genannt; „siegreicher Anker“ ersetzt.
Familien *Kontrollverlust* / *Schnellschuss*:
```
I   Positionen 20 und 40 sind Anker (siegreicher Anker ×1,25).
II  Positionen 10, 20, 30 und 40 sind Anker.          ← Faktor?
III Jede Segment-Endposition ist ein Anker.            ← Faktor?
IV  Jede Segment-Endposition ist ein ×1,35-Anker.
```
Dass II und III bei ×1,25 bleiben, muss der Spieler raten. Zusätzlich ist „**siegreicher** Anker"
eine sonst nirgends benutzte Wendung (gemeint: der Faktor greift beim Sieg auf dieser Position).

### F9 — Abweichende Anredeform

**Stand:** ✔ „Noch keine Einträge — mach den Anfang.“
`GlobalLeaderboard.jsx:87`: „Noch keine Einträge — sei **die/der** Erste."
Das ganze Spiel duzt und kommt sonst ohne Schrägstrich-Doppelform aus.
**→ „Noch keine Einträge — mach den Anfang."**

---

## G · Vorlagen- und Namens-Inkonsistenzen

### G1 — „Zehnter Sieg" / „Zehnter Schlag": verwechselbar und beide falsch benannt

**Stand:** ✔ Umbenannt: *Zehnter Sieg* → **Beutezug**, *Zehnter Schlag* → **Markstein** (die ids bleiben).
- *Zehnter Sieg* (Score): „Jeder **12.** / **10.** / **8.** / **5.** gewonnene Stich: +X Score."
  Nur Stufe II passt zum Namen.
- *Zehnter Schlag* (Stichwert): „Karten auf **Position 20 und 40**" → mit „zehnter" hat das nichts zu tun.
**→ Umbenennen, z. B. „Beutezug" (Score alle N Siege) und „Marksteine" (Positionen).**

### G2 — Zwei Familien mit identischem Satzbau

**Stand:** ✔ Unterschiedliche Satzmuster: „Jeder 12. Sieg des Laufs: …“ vs. „Im Takt: jeder 7. Sieg gibt …“.
*Zehnter Sieg*: „Jeder 12. gewonnene Stich: +600 Score."
*Perfekter Rhythmus*: „Jeder 7. gewonnene Stich: +250 Score."
Aus dem Text allein ist nicht erkennbar, dass es zwei verschiedene Familien sind (beide zählen
gewonnene Stiche, nur mit anderem Intervall/Betrag). Wenn beide im selben Angebot liegen, wirkt es
wie ein Anzeigefehler.
**→ Mechanischen Unterschied herausarbeiten oder eine der beiden streichen.**

### G3–G6 — Stufen-Templates brechen auf der letzten Stufe

**Stand:** - **G3** ✔ „je“ auf Stufe IV ergänzt (Kleine ganz groß).
- **G4** ✔ Perfekte Folge I folgt dem Stufen-Muster („+0/+0/+1, danach +2“).
- **G5** ✔ Bezugsgröße genannt („+0,10 auf ihren Formations-Faktor“).
- **G6** ✔ Gerade/Ungerade Stärke IV nennen den Bezug („zusätzlich zu den Stufen davor“).
| Familie | Bruch |
|---|---|
| *Kleine ganz groß* | I–III „je +3/+4/+5 Kartenwert", IV „**+3 Kartenwert**" ohne „je" — liest sich wie eine Verschlechterung |
| *Perfekte Folge* | I „ab der dritten +1, danach +2", II–IV „+1/+2/+3, danach +4" — anderer Satzbau |
| *Verstärkte Wiederholung* | III „je **+0,10 Faktor**" (additiv, ohne Bezugsgröße), IV „zusätzlich **×1,20**" (multiplikativ) |
| *Gerade/Ungerade Stärke* | IV „**zusätzlich** +1 Kartenwert" — worauf bezogen, sagt der Text nicht |

---

## H · Kleinere Beobachtungen

**Stand:** ✔ alle vier erledigt.

- **`SkillSelect` Archetyp-Verlustwarnungen** waren unvollständig gegenüber `reducer.js:616–630`.
  → Feuer nennt jetzt auch den **Schmiede-Zähler** (Basis von Glutstahl), Eis die **Firn-Reserve**,
  Pflanze die **Kolonisierungen**.
- **`FORMATION_TYPE_LABELS` existierte doppelt** (`game/formations.js` mit 4 Typen, `ui/formationLabels.js`
  mit 8). → Namen liegen jetzt in `constants.js` (`FORMATION_LABELS`), beide Module leiten daraus ab.
- **Deck-/Pack-Namen sind gemischt DE/EN.** Bleibt als Marken-Set so; in der CSV sind sie als
  „Eigenname — nicht übersetzen" markiert, die vier deutschen mit EN-Vorschlag im Übersetzerpaket §8.
- **`glossary.js` `match`-Listen sind deutsche Flexionen** und steuern die Auto-Fettung. Sie stehen in
  der CSV mit `note = wortformen` und sind für EN **neu zu erstellen**, nicht zu übersetzen
  (Übersetzerpaket §7).

---

## L · Nachprüfung: Leitfäden, Deck-Ansicht, Skill-Katalog

Nachgereichte Prüfung der drei Flächen, auf denen ein Spieler „lernt, wie der Archetyp funktioniert".
Hier lag der schwerste inhaltliche Befund des ganzen Durchgangs.

### L1 — Die Leitfäden beschreiben skill-gebundene Effekte als Grundeigenschaften
**Stand:** ✔ alle Stellen benannt.

Systematisch durch alle vier Leitfäden (`src/ui/guides.js`):

| Archetyp | Aussage | Tatsächlich |
|---|---|---|
| Feuer | „Hohe Hitze **macht deine Karten stärker**" (Säule, Kreislauf-Schritt, Prinzip — **3 Stellen**) | nur mit dem Skill *Glühende Klinge* (`glowingValueFor` ist an `glowingBlade` gegated) |
| Feuer | „Ist die Leiste voll, **geht kein Hitzegewinn verloren**" | nur mit dem Skill *Weißglut*; sonst verfällt der Überschuss |
| Blitz | „Ist sie voll, **feuert dein Konsument**" · „Jeder Verbrauch gibt **dauerhaftes Momentum**" | setzt einen Konsumenten (Ionisierung) bzw. Gewitterfront/Entladung/Dauerstrom voraus |
| Pflanze | „Am **Wert-Deckel** … zahlt direkt Score" | nur mit Weltenbaum/Mutterbaum |
| Pflanze | „ein **voll grünes Feld** schaltet Überwucherung frei" | *Überwucherung* ist ein Skill, kein Automatismus |

Ein Spieler baut danach auf Hitze und wundert sich, warum seine Karten nicht stärker werden.
**Regel dazu in `docs/text-style-guide.md` §3 aufgenommen.**

### L2 — Feuers einziger automatischer Payoff fehlte im Leitfaden
**Stand:** ✔ als eigener Kreislauf-Schritt und in der Hitze-Säule ergänzt.

Die **Glutdividende** (`engine.js:763 ff.` — direkter Score je Feuer-Sieg, proportional zur gehaltenen
Hitze, skaliert mit dem Feuer-Bekenntnis) ist Feuers „Immer-an-Engine". Der Leitfaden benutzte das Wort
„Dividende" im Prinzipien-Block, führte die Mechanik aber nie ein.

### L3 — Der Firn-Boden fehlte im Eis-Leitfaden komplett
**Stand:** ✔ als Kreislauf-Schritt ergänzt, dazu in der Bruch-Säule erwähnt.

Drei Skills (Dauerfrost, Schneetreiben, Eiszeit) füttern ihn, und er bestimmt, wie schnell ein
gebrochener Gletscher wieder hochkommt — im Leitfaden kam er nicht vor.

### L4 — Terminologie in den Leitfäden
**Stand:** ✔ nachgezogen.

„jede Runde" → „jeden Durchlauf" · „Fraktion" → „Archetyp" · „Score-Burst" → „Berst-Score" ·
„self-feeding" → „nährt sich selbst" · „Ernte-Pivot"/„Payoff" eingedeutscht · die Massen-Skala heißt
nicht mehr „Stufe I–III" (kollidierte mit den Familien-Stufen, siehe B2).

### L5 — Der Reiter „Passives" zeigt Skills
**Stand:** ✔ heißt jetzt „Skills".

`DeckDetail.jsx` listet dort `SKILL_LIST` gefiltert nach Archetyp — die Gruppenüberschriften darin
hießen bereits „Skills" und „Legendäre". „Passives" war der einzige Ort im Spiel mit diesem Wort.

### L6 — Die Deck-Beschreibung war unlesbar
**Stand:** ✔ dreizeilig statt einzeilig abgeschnitten.

Der Leitfaden-Untertitel (112–181 Zeichen) stand in einem `truncate`-Element mit `maxWidth: 30ch`.
Sichtbar war „Der einzige Archetyp, der sein…" — der Rest nie.

### L7 — Verstärker-Skills waren im Katalog nicht als solche erkennbar
**Stand:** ✔ Voraussetzungs-Marke am Skill („braucht Ascheschmiede"), dazu Marken für **Konsument**
und **trimmbar**.

Neun Skills tragen ein `enabler`-Feld und tun ohne ihren Basis-Skill nichts. Im **Angebot** sind sie
dadurch gegatet (`buildSkillOffer`), im **Katalog** stand die Abhängigkeit nirgends.

### L8 — Die „Verstärker:"-Konvention galt nur für Pflanze
**Stand:** ✔ Kettenblitz, Lauffeuer und Glutstahl beginnen jetzt ebenfalls mit „Verstärker: …".

Sechs Pflanzen-Skills schrieben es, die drei aus Blitz und Feuer nicht.

### L9 — Blitzfänger nannte sich im eigenen Beschreibungstext
**Stand:** ✔ umformuliert (gleiche Klasse wie F7).

---

## M · Zustand des Glossars (Messung nach der Bereinigung)

Das Glossar (`src/game/glossary.js`) ist die einzige Quelle der Begriffs-Erklärungen und steuert
zusätzlich die **Auto-Fettung**: `tokenizeGlossary` markiert in jeder Beschreibung die Wortformen aus
`match` und macht sie antippbar. Es ist damit doppelt kritisch — als Nachschlagewerk und als Renderer.

### Kennzahlen

| Maß | Wert |
|---|---|
| Einträge | **109** in 8 Kategorien |
| Verteilung | Archetypen 33 · Architekt 16 · Formationen 15 · Grundbegriffe 14 · Meta 11 · Perks 8 · Deck 7 · Präzision 6 |
| **Match-Kollisionen** (eine Wortform in zwei Einträgen) | **0** |
| Tokenizer-Roundtrip (Text bleibt unverändert) | verlustfrei über alle 2 265 Strings |
| Erklärtext-Länge | Ø 154 Zeichen · Median 129 · längster 429 (Firn-Boden) |
| Texte über 300 Zeichen | 6 (Firn-Boden, Bersten, Struktur, Trimmen, Stapel, Gletscher-Formationen) |
| Skill-/Perk-/Gebäude-Texte **ohne** einen erklärten Begriff | 135 von 611 (**22 %**) |

### Gefundene und behobene Mängel

1. **Toter Eintrag `breakdown` („Score-Aufschlüsselung").** Beschrieb die Faktorenkette
   „Basis × Serie × Perk-Mult × Formation × Crit — jeder Faktor wird einzeln ausgewiesen".
   Dieses UI ist entfernt (`Battlefield.jsx:964`: *„Die Ergebnis-Aufschlüsselung … wurde ENTFERNT"*).
   → gelöscht, gleiche Klasse wie die Meisterrang-Einträge (A6).
2. **Fehlender Kernbegriff „Wertvorsprung".** Steht in **10** Regeltexten und ist Feuers Währung,
   war aber nur inline im Hitze-Eintrag erklärt. → eigener Eintrag.
3. **Match-Lücke bei „Bersten".** Die Liste kannte `bricht`/`brechen`, aber **nicht `Bruch`/`Brüche`** —
   ausgerechnet die häufigste Form (17 Anzeigetexte, u. a. Zermalmen, Rissbildung, Kettenbruch,
   Große Lawine, der ganze Eis-Leitfaden). → ergänzt.
4. **Benennungs-Split „Eis-Formation" vs. „Gletscher-Formation".** Die UI sagt an zwei Stellen
   Gletscher-Formation (`GlacierFormLegend`, Karten-Badge), das Glossar sagte Eis-Formation.
   → Eintrag auf **Gletscher-Formationen** umbenannt, beide Formen in `match`.
5. **Sieben fehlende Flexionen**, bei denen die Fettung heute nicht greift: `Durchlaufs`,
   `Durchläufen`, `Segments`, `Farbblocks`, `Wiederholungen`, `Archetyps`, `Legendärer`/`legendären`,
   `Rerolls`. → ergänzt.

### Bewertung

**Strukturell gesund.** Keine Kollisionen, keine rohen Templates, keine `undefined` (der Bestandstest
`glossary.test.js` prüft beides), verlustfreier Tokenizer, konsistente Kategorien.

**Inhaltlich vollständig für die Regelbegriffe.** Die 12 Einträge, deren Wortform im übrigen
Spielertext nie vorkommt (Kampfwert, Ziehreihenfolge, Überlappung, Skill-Durchlauf, Aufwertungs-Typen,
Kategorien A–E, Polyomino, Bau-Kategorien, Lage, Stufen-Kicker, Versetzen, Kosmetik), sind **kein
Mangel**: Das sind Dinge, die man *sieht* und dann nachschlägt, nicht Wörter, die im Text stehen.
Sie gehören ins Glossar, gerade weil sie sonst nirgends erklärt werden.

**Die 22 % Beschreibungen ohne erklärten Begriff** sind ebenfalls unauffällig — es sind die rein
generischen Muster-Sätze („Sieg mit Kartenwert ≥9: +100 Score"), die keinen Sonderbegriff enthalten.

**Bewusst nicht aufgenommen** bleiben die generischen Wörter mit den höchsten Frequenzen
(Score 211×, Sieg 163×, Karte/Karten 280×, Wert 34×). Sie zu fetten würde die Beschreibungen
unlesbar machen — das ist die dokumentierte Linie des Glossars („Generische Tokens haben bewusst
keinen Eintrag").

### Offen

- **„Battlefield" (29 Anzeigetexte)** steht englisch neben dem deutschen „Spielfeld" — überwiegend als
  Suffix in Skin-Namen („Beryll · Battlefield"), aber auch als UI-Wort („Kein Battlefield", „Konturen
  des Battlefields"). Das ist eine **Produkt-/Marken-Entscheidung**, keine Glossar-Frage: entweder das
  Wort wird als Eigenname geführt (dann Glossareintrag + `note` in der CSV) oder es wird zu „Spielfeld".
- Eine Handvoll UI-Texte fällt weiterhin durch das Heuristik-Raster des Exports, wenn sie ein
  Gleichheitszeichen als Prosa enthalten (z. B. die Überlappungs-Zeile der Formations-Legende:
  „mehr Formationen = mehr Multiplikator"). Betrifft die CSV, nicht das Spiel.

---

## I · Umsetzung

Alle Befunde sind umgesetzt. Die Arbeit liegt in drei Commits auf `claude/game-text-clarity-review-t79b1p`:

1. **Bestandsaufnahme** — Generator `scripts/export-strings.mjs`, CSV, dieser Bericht, Übersetzerpaket.
2. **Runde 1** — Blöcke A/B/C/D/E/F/G: Wahrheits-Fixes, `familyEffectText` als geteilte Quelle,
   Begriffs-Vereinheitlichung.
3. **Runde 2** — Block L: Leitfäden, Deck-Ansicht, Skill-Katalog.
4. **Runde 3** — Rest: G1/G2-Umbenennungen, B2/B3/B6/B7, C9, E4–E8, F4/F9, H sowie
   `docs/text-style-guide.md` und `README.md`.

**Zwei bewusste Abweichungen** vom ursprünglichen Vorschlag: **A9** (Preis nicht interpoliert, Import-Zyklus)
und **D1** (drei 100-%-Schwellenstellen behalten „Prozentpunkte").

**Regressionsschutz:** `npm test` 1015 Fälle grün, `npm run build` grün. Angepasst wurden zwei
Test-Erwartungen, die den alten Wortlaut festhielten (`cosmetics.test.js` „Meisterrang",
`architect-overlay.test.js` rohe Joker-Schlüssel) — beide mit Begründung im Test kommentiert.

---

## J · Werkzeug

`scripts/export-strings.mjs` erzeugt die Inventar-CSV neu:

```bash
node scripts/export-strings.mjs                    # → docs/localization/strings_de_pixi_*.csv
node scripts/export-strings.mjs --ui-candidates    # zusätzlich die UI-Rohliste zum Nachprüfen
```

Die Datentexte werden **importiert und resolvet** — jede Balance-Änderung an `constants.js`,
`glacier.js` oder `rarity.js` wandert automatisch in den nächsten Export; der Gebäude-Effekttext kommt
aus derselben `familyEffectText`, die auch das Spiel rendert. Die UI-Texte kommen aus einer Heuristik
über `src/App.jsx` + `src/ui/*.jsx` (inklusive der Label-Fragmente, die an einer Interpolation kleben —
das fehlte in der ersten Fassung und kostete ~50 Zeilen). Wird eine Komponente umbenannt oder neu
angelegt, ist die Dateiliste in `uiRows()` zu ergänzen.

**Ein Diff der CSV ist der schnellste Weg zu sehen, was sich am sichtbaren Text geändert hat.**
