# Sprachprüfung Autostich — Vollständiger Befundbericht

**Branch:** `Autostich/pixi` · Commit `500b24f` · Stand 2026-08-15
**Umfang:** alle spieler-sichtbaren Texte — **2 164 Strings** (Datentexte + UI)
**Maßstab:** `docs/text-style-guide.md`, `docs/desc-check.md` und **der Code** (bei Widerspruch gilt der Code)

---

## 0. Vorgehen

1. **Mechanik erarbeitet** aus `src/game/*` (Engine, Formationen, Skills, Familien, Perks, Gletscher,
   Architekt, Progression, Wochen-Modifikatoren) — nicht aus der README; die ist an mehreren Stellen veraltet
   (siehe A14).
2. **Texte driftfrei extrahiert** über einen neuen Generator `scripts/export-strings.mjs`:
   Die Datentexte werden aus den echten Registern **importiert** und als *resolvete* Endtexte
   ausgeschrieben (keine abgetippten Zahlen). Die UI-Texte kommen byte-treu aus `src/App.jsx` +
   `src/ui/*.jsx`. Ergebnis: `docs/localization/strings_de_pixi_2026-08-15.csv`.
3. **Jeder Text gegen den Code gelesen** — Zahl für Zahl, Begriff für Begriff.

| Kategorie | Zeilen | Inhalt |
|---|---:|---|
| `item` | 687 | Perk-Familien (4 Stufen), legendäre Perks, Architekt-Gebäude, Kosmetik, Wochen-Mods |
| `ui` | 552 | Oberfläche: Buttons, Labels, HUD-Leisten, Phasen, Formations-/Farbnamen |
| `tutorial` | 477 | Glossar + die vier Archetyp-Leitfäden |
| `achievement` | 196 | Endbildschirm, Bestenlisten, Statistik-Hub, Upgrade-Baum |
| `ability` | 168 | Archetyp-Skills (Blitz/Feuer/Eis/Pflanze), Name + Beschreibung |
| `store` | 73 | Der Architekt (Bauphase) |
| `system` | 11 | Seed, Name, Laden, Installation |

**Gesamturteil:** Die Textbasis ist überdurchschnittlich gut — die Muster-Templates in `families.js`,
die konstanten-interpolierten Zahlen und das zentrale Glossar verhindern den Großteil der üblichen
Drift. Die Probleme liegen an drei Stellen: **(a)** das Glossar ist an den Systemwechseln der letzten
Iterationen (Meisterränge → Upgrade-Baum, Feuer-Schmiede, Trimmen) nicht überall mitgezogen worden,
**(b)** zentrale Begriffe haben je nach Bildschirm unterschiedliche Namen, **(c)** der Architekt-Screen
formatiert Zahlen anders als der Rest des Spiels.

---

## A · Falsche oder tote Aussagen (Text ↔ Code)

> Das sind Aussagen, die einen Spieler aktiv in die Irre führen. Höchste Priorität — und sie müssen
> **vor** der Übersetzung raus, sonst frieren wir die Fehler in einer zweiten Sprache ein.

### A1 — Glossar „Asche" beschreibt Damaststahl falsch
`src/game/glossary.js:208` — „…**Damaststahl lässt Asche nie verfallen.**"
Damaststahl (`skills.js:157`, `SK_FIRE_L04`) tut etwas ganz anderes: *„Schmiedet **ohne Asche** jeden
Durchlauf deine niedrigste Karte … **Kein Ascheverbrauch**."* Der Skill hat mit dem Verfall von Asche
nichts zu tun. Der Satz stammt aus einem früheren Entwurf.
**→ Satz streichen** (oder ersetzen durch den tatsächlichen Verfallspfad: Restasche verglüht als
Weißglut-Überlauf, siehe B1).

### A2 — Glossar „Trimmen" und PlantBar nennen 4 von 6 trimmbaren Skills
`src/game/glossary.js:269` und `src/ui/PlantBar.jsx:106` listen *„(Aussaat, Flugsamen, Setzlingsbeet,
Zäher Halm)"*. `isTrimmableSkill` (`skills.js:269`, Flag `trimGrowth`) liefert **sechs**: Aussaat,
Flugsamen, Setzlingsbeet, Zäher Halm, **Ausläufer, Rhizom**.
Für den Pflanze-Spieler ist das eine echte Fehlinformation: Wer Ausläufer oder Rhizom ersetzt, löst
ebenfalls eine Trimmung aus — und weiß es nicht.
**→ Liste aus dem Register generieren**, nicht im Text pflegen (`SKILL_LIST.filter(s => s.trimGrowth)`).

### A3 — Glossar „Rarität" nennt eine Stufe, die es nicht gibt
`src/game/glossary.js:312` — „Normal · **Ungewöhnlich** · Selten · Rar".
`rarity.js:24–27` (`TIER_META`) heißen sie: **Normal · Selten · Sehr selten · Rar**.
Der Upgrade-Baum (`progression.js`, Knoten `tier3`/`tier4`) sagt korrekt „Sehr selten"/„Rar".
Das Glossar ist der einzige Ort mit „Ungewöhnlich" — und `match: ["Rarität", "Ungewöhnlich"]`
(Zeile 313) fettet ein Wort, das im Spiel nirgends vorkommt.
**→ Glossar an `TIER_META` angleichen**, am besten interpoliert.

### A4 — Glossar „Neuwurf" nennt die falsche Reroll-Zahl für den Normalfall
`src/game/glossary.js:98` — „…Perks · Gebäude · Skills, **je 2**…" (interpoliert `C.BASE_REROLLS`).
`C.BASE_REROLLS = 2` gilt aber nur **ohne Profil** (Sim/Standard) und im **Ranglisten-Lauf**
(`reducer.js:210` `effProfile = ranked ? null : action.profile`). Im normalen Lauf mit Profil greift
`rerollBase()` → `REROLL_BASE = 1` (`progression.js:31,206`; `reducer.js:225`).
Der Spieler liest also „je 2" und hat 1.
**→ Formulierung entkoppeln:** „Ein Vorrat je Kategorie und Lauf; der Upgrade-Baum hebt ihn."
(Die Ranglisten-Regel steht ohnehin im Regeln-Reiter.)

### A5 — Drei Glossar-Einträge verweisen auf entfernte „Meisterränge"
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
`src/game/glossary.js:378–386`: `meisterrang` („Meister I–V … 5/10/15/25/50 Mio."), `meisterlauf`
(„Nur Meister-Läufe zählen für die Rang-Leiter"), `grossmeister` („Fünf Stufen über Meister V").
Keine dieser Mechaniken existiert im pixi-Branch — es gibt kein `MasterRunSelect`, keine `MasteryBar`,
keine `masteryGrade*`-Funktionen mehr. Ein Spieler, der das Glossar öffnet, sucht danach vergeblich.
**→ Drei Einträge löschen und durch die aktuellen ersetzen:** *Stichpunkte (SP)*, *Deckpunkte (DP)*,
*Upgrade-Baum*, *Onboarding*, *Ranglisten-Lauf*, *Wochen-Modifikatoren* — davon ist derzeit **keiner**
im Glossar, obwohl alle im UI vorkommen.

### A7 — Glossar „Bindeglied" ≠ Familie „Bindeglied" Stufe IV
`glossary.js:168`: „Spannweite je Stufe: I/II ±1, **III/IV ±2**".
`families.js` (C_BRIDGE) Stufe IV: *„dürfen für eine Treppe **jeden Wert zwischen ihren Nachbarn**
annehmen"* — das ist keine ±2-Spannweite, sondern unbegrenzt innerhalb der Nachbarn.
(Das Architekt-Gebäude *Kreuzgang* nutzt wiederum `bindSpanFor(t)` = ±1/±2 — dort stimmt es.)
**→ Glossar auf „I/II ±1 · III ±2 · IV frei zwischen den Nachbarn" präzisieren.**

### A8 — Glossar „Skill-Slot" ignoriert den 7. Slot
`glossary.js:179`: „Du hältst höchstens **6** Skills gleichzeitig."
Die Legendär-Phase vergibt einen **fixen 7. Slot** (`LegendarySelect.jsx:26` „7. Slot", kein Tausch).
Zusätzlich hebt der Wochen-Modifikator *Skill-Fülle* die Slots um bis zu +3 (`reducer.js`, `effSkillSlots`).
**→ „…6 Skills; der legendäre Skill aus Runde 29 belegt einen zusätzlichen, festen Slot."**

### A9 — Freischalt-Text nennt die falsche Währung *und* den falschen Preis
`src/game/cosmetics.js:200`: „**In der Deck-Werkstatt kaufen (1 SP)**".
Packs werden mit **DP (Deckpunkten)** gekauft (`themes.js` `buyPack` → `profile.deckPoints`), und der
Preis ist **je Pack verschieden**: 5 / 10 / 15 DP (`THEME_DEFS[*].price`). Die Werkstatt selbst zeigt
korrekt „(zu wenig **DP**)" (`CustomizeScreen.jsx:1151`) — der Sperrtext daneben sagt SP.
**→ „In der Deck-Werkstatt für {n} DP kaufen" (Preis interpolieren).**

### A10 — Freischalt-Text „Sparfuchs" nennt den alten Modus
`src/game/cosmetics.js:192`: „Schließe einen **Meisterrang-Wochenlauf** ohne einen einzigen Reroll ab."
Der Modus heißt jetzt **Ranglisten-Lauf** (`storage.js:271` — „ranked" ist der neue Wochen-Ranglisten-Modus,
ersetzt „meister"). Der Code hält den alten Key nur noch aus Kompatibilität.
**→ „Ranglisten-Wochenlauf".**

### A11 — Formations-Legende behauptet einen festen Ankerfaktor
`src/ui/ArchPanels.jsx:53`: „**A** Anker — Einzelposition **×1,25**".
`ANCHOR_FORM_FACTOR = 1,25` ist nur der Default. Real vorkommende Ankerfaktoren:
E-Familien **1,25 … 1,35** (Kontrollverlust/Schnellschuss IV), Architekt *Grundstein*
**1,10 / 1,23 / 1,36 / 1,49** (`architect.js`, `tierFactor`), Eisanker eigener Wert.
Das Glossar (`glossary.js:144`) sagt es richtig: „Faktor je Quelle".
**→ Legende auf „Einzelposition zählt als Formation (Faktor je Quelle)" ändern.**

### A12 — Formations-Legende ist unvollständig
Dieselbe Legende (`ArchPanels.jsx:49–56`) erklärt **W F T Z A**. Die Karten-Badges rendern aber acht
Kürzel (`ui/formationLabels.js`): zusätzlich **N** Nachhall, **K** Kern, **G** Grenzbonus.
Ein Spieler mit Segmentarbeit IV oder Formationskern sieht Buchstaben, die nirgends erklärt sind.
**→ Legende aus `FORMATION_TYPES` generieren statt sie zu hardcoden.**

### A13 — Ein Gebäude, drei verschiedene Beschreibungen
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
`glossary.js:227` definiert Kaskade rein für Blitz („Ein Crit auf oder neben einer ionisierten Karte
erzeugt zusätzliche Ladung"). Eis benutzt dasselbe Wort für die Bruchkette: `GlacierBar.jsx:161`
(HUD-Zeile „Kaskade"), `guides.js:97,100,105` („kann eine **Kaskade** durchs ganze Cluster auslösen"),
`glossary.js:239` selbst („verstärkt um +25 % je angrenzendem Gletscher").
**→ Entweder Eis umbenennen (z. B. „Bruchkette") oder den Glossar-Eintrag zweiteilig fassen.**

### B4 — „Ladung" ist die Blitz-Ressource, wird aber auch für Fehlzündung benutzt
Familie *Fehlzündung* Stufe IV: „nach einem Crit bleiben **25 % der Ladung**." Gemeint ist der
aufgestaute Score, nicht die Blitz-Ladung — aber das Glossar fettet „Ladung" und erklärt den Blitz-Akku.
**→ „25 % des aufgestauten Scores".**

### B5 — „Punkte" meint mal Score, mal Prozentpunkte
- *Zinseszins*: „der Zinssatz steigt um **4 Punkte**" → Prozentpunkte.
- *Überschusskrit* IV: „plus 5 je Prozentpunkt über 100 % (höchstens **100 Punkte** gezählt)" →
  Prozentpunkte, direkt neben „+500 **Score**".
- *Architekt/Core-DB*: „höchste Karte +160 **Punkte**" → Score (siehe A13).
- Style-Guide erlaubt „Punkte" ausdrücklich nur als Kategoriename und im Idiom „zahlt Punkte".

**→ In Zahlenkontexten immer „Score" bzw. „Prozentpunkte" ausschreiben.**

### B6 — Der Buchstabe „G" auf der Karte bedeutet zwei Dinge
`CardGrid.jsx:83` rendert die Formations-Kürzel inkl. **G = Grenzbonus** (`formationLabels.js:15`).
`CardGrid.jsx:135` rendert daneben ein blaues **G = „Teil einer aktiven Gletscher-Formation"**.
Beide sitzen im selben Badge-Bereich derselben Karte. Nur die Farbe unterscheidet sie.
**→ Für die Gletscher-Formation ein Symbol statt eines Buchstabens (❄/◈).**

### B7 — „Formation" ohne Zusatz meint mal Karten-, mal Eis-Formation
Sauber getrennt im Glossar (`formation` vs. `eisformation`), aber nicht in den Skills:
*Anfrieren* — „siegt der Gletscher **in einer Formation**" (= Karten-Formation);
*Eiswall* — „die **Linien-Formation**" (= Eis-Formation). `RunStats.jsx:83` „Maximal gleichzeitig aktive
Formationen" zählt nur Karten-Formationen.
**→ In Eis-Texten konsequent „Eis-Formation" ausschreiben.**

---

## C · Mehrere Wörter für dieselbe Sache

### C1 — Rarität: vier Vokabulare, zwei Farbnamen für Lila
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
„**Formations-Energie**" (Glossar `formenergie`, `constants.js`, Familie *Feinjustierung*) ·
„**Tausch-Energie**" (`FormationPhase.jsx:179`) · „**Aufstell-Energie**" (`weekMods.js` — *Energie-Ebbe*
„Start mit 0 Aufstell-Energie", *Energie-Flut* „Doppelte Aufstell-Energie") · schlicht „**Energie**"
(`UpgradeScreen.jsx:26`, Knoten *Energie I/II*, Familie *Feinjustierung*).
**→ Kanonisch „Formations-Energie", kurz „Energie" nur wo der Kontext eindeutig ist.**

### C3 — Die Phase selbst hat vier Namen
„**Aufstellungsphase**" (Glossar `aufstellung`) · „**Formationsphase**" (Familie *Feinjustierung*:
„Jede zweite Formationsphase") · „**Aufstellphase**" (`weekMods.js` *Deck-Shuffle*: „vor jeder
Aufstellphase") · „**Deck aufstellen**" (`FormationPhase.jsx:144`, Überschrift des Bildschirms).
Dazu `DevRunSetup.jsx:16` „Aufstellung" als Entscheidungstyp.
**→ Kanonisch „Aufstellungsphase"; die Bildschirm-Überschrift darf „Deck aufstellen" bleiben (Aktion).**

### C4 — „Durchlauf" vs. „Runde"
Das Glossar definiert **Durchlauf** (40 Stiche) und benutzt es durchgängig; `RoundScoreBadge`
zeigt „Durchlauf-Score". Das HUD zeigt daneben „**Runde** 12/50" (`StatusBar.jsx:81` — der Code-Kommentar
gibt selbst zu: *„Runde (nur der Durchlauf …)"*). Dazu `DevRunSetup.jsx:96` „Runden",
`LeaderboardScreen.jsx:48` und `StartScreen.jsx:28` „**R29**".
**→ Eins von beiden.** Empfehlung: **„Runde"** im HUD (kurz, passt in die Zelle) und „Durchlauf"
überall sonst ist *nicht* haltbar — es sind zwei Wörter für denselben Zähler. Entweder das Glossar
nimmt „Runde" als Synonym auf, oder das HUD sagt „Durchl.".

### C5 — „Archetyp" vs. „Fraktion"
Kanonisch ist **Archetyp** (Glossar `archetyp`, `ARCHETYPE_META`). „Fraktion" steht noch in
`weekMods.js` (*Skill-Verknappung*: „Nur 1 Skill je **Fraktion**"), in `CustomizeScreen`-Kommentaren
und als `match`-Wortform im Glossar. `App.jsx:471` benutzt „Archetyp".
**→ „Fraktion" aus dem Spielertext entfernen (als `match`-Wortform darf es bleiben).**

### C6 — Die Brettzellen des Architekten haben fünf Namen
„**Baufeld**" (Glossar, HUD „Baufeld belegt", Upgrade-Knoten „Baufeld I–III") ·
„**Bauplätze**" (`weekMods.js` *Enge Aufstellung*: „Nur 12 Bauplätze") ·
„**Bau-Felder**" (`weekMods.js` *Gesperrte Bau-Felder*) ·
„**abgedeckte Zelle**" (Glossar, Familie *Dichte Bebauung*) ·
„**Brettzellen**" (Glossar `baufeld`).
**→ Kanonisch: „Baufeld" = das Kontingent, „Zelle" = die einzelne Position, „belegt/abgedeckt" für
den Zustand. „Bauplatz"/„Bau-Feld" streichen.**

### C7 — „Direkt-Score" / „Flat" / „Flat-Score"
Glossar und Skills sagen **Direkt-Score** (`glossary.js:103`), der Style-Guide sagt **Flat-Score**,
`gen-db` sagt „**Flat**" (A13), der Architekt-Screen „Direkt-Score".
**→ Kanonisch „Direkt-Score", Style-Guide nachziehen.**

### C8 — „Dauerwert" statt „Kartenwert"
Familie *Überzahl* Stufen I–III: „**Dauerwert** ≥2 höher als der Vorgänger" — Stufe IV lässt es weg
(„Höher als der Vorgänger"). Das Glossar führt „Dauerwert" nur noch als Alt-`match` von *Kartenwert*.
**→ Auf „Kartenwert" vereinheitlichen.**

### C9 — „Gebäude-Boost" / „Struktur-Bonus" / „Struktur-Kombi"
`ArchitectScreen.jsx:592` HUD-Kachel „**Gebäude-Boost**", `:1168` „**Struktur-Bonus**", `:840`
„**Struktur & Distrikt**", `:591` Tooltip „**Struktur-Kombis**", Glossar `struktur` „**Struktur-Boni**".
Der erste ist die Summe, die anderen ein Teil davon — der Unterschied wird nicht erklärt.
**→ „Gebäude-Boost" = Gesamtwert, „Struktur-Faktor"/„Distrikt-Faktor" = die Bestandteile.**

---

## D · Zahlen- und Format-Konventionen (Style-Guide §2)

### D1 — „pp" vs. „Prozentpunkte" vs. „%" · **10 + 19 Stellen**
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
- `perks.js:97` **Vabanque**: „gibt es **+400000** Score" → muss `+400.000` heißen.
- `skills.js` **Flächenbrand**: „(voll ≈ **+1200**)" → `+1.200`.
Beide Register haben den Helfer `grp()` bereits — er wird an diesen zwei Stellen nur nicht benutzt.
Zum Vergleich, korrekt: „+2.000 Score je 20 Asche", „max +1.200", „+1.000 Score".

### D4 — Tempo-Buttons: „X2" statt „×2"
`StatusBar.jsx:66–67`: Beschriftung **`X2` / `X4`**, Tooltip derselben Buttons **„Tempo ×2" / „×4"**.
Style-Guide §2: „Multiplikator: ×1,25 (Malzeichen ×, kein `x`/`*`)."
**→ `×2` / `×4`.** (Die Breite ändert sich nicht.)

### D5 — Fehlende Einheit
Familie *Volles Haus* Stufe IV: „+**1.000** auf den dritten; der fünfte Sieg zusätzlich +**1.000**."
Die Stufen I–III sagen alle „+500 **Score**".
**→ „Score" ergänzen.**

### D6/D7 — Umgangssprachliche Kürzel im UI
`ArchPanels.jsx:55,57`: „mehr Formationen = mehr **Multi**", „mehr Rahmen = mehr **Multi**" (statt
Multiplikator) · `ArchPanels.jsx:52`: „**Diff** ≥4" (Glossar: „Nachbardifferenz ≥4").

---

## E · Rohe Bezeichner und Entwickler-Sprache im Spielertext

### E1 — Formationstypen als Enum-Keys, kleingeschrieben · **6 Strings**
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
`ui/archEffects.js:43`: „Treppen-Bindeglied **(±Span)**" — im Kartendetail sichtbar. „Span" ist der
Variablenname (`bindSpanFor`). Der Architekt-Screen schreibt an derselben Stelle korrekt
„Karte darf im Wert um ±1 abweichen".

### E3 — „R29"
`StartScreen.jsx:28` („Legendär ⭐ (R29)") und `LeaderboardScreen.jsx:48` („Legendär ab R29").
„R" = Runde ist nirgends eingeführt. Für Neuspieler beim Onboarding-Chip besonders unglücklich:
Es ist die *Belohnung* des letzten Onboarding-Glieds — und sie wird in einer Chiffre benannt.
**→ „Legendär-Phase (Runde 29)".**

### E4 — „Burst" im Eintrag, der „Bersten" definiert
`glossary.js:239`: „…bricht er: **Burst-Score** aus Masse × Stufen-Wucht…" — im selben Satz, in dem
das deutsche Wort „bricht" steht. `guides.js:96` („großer **Score-Burst**"), `glacier.js` durchgehend.
Style-Guide §1 legt „**Bersten** (Subst.) / **bricht, brechen** (Verb)" fest.
**→ „Berst-Score".**

### E5 — Weitere Anglizismen / Dev-Sprache im Spielertext
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
`PlantBar.jsx:106`: `title="Trimmen (#288): jeder ersetzte Wachstums-Skill …"` — die Ticket-Nummer
steht im spieler-sichtbaren `title`-Attribut.

### E7/E8 — Unerklärte Fachbegriffe
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
`CardGrid.jsx:137`: `title="Grün (reif) — zählt **fürs** Farbblock"` → *der* Farbblock, also
„für den Farbblock". `Card.jsx:125` macht es an derselben Stelle richtig: „Teil des Farbblocks".

### F2 — Doppelte Verneinung
Familie *Farbduell* III: „eine andere Farbe **verliert zufällig −1** Kartenwert."
„verliert −1" liest sich als *gewinnt 1*. Stufen I/II formulieren es richtig („eine andere **−1**
Kartenwert").
**→ „…eine zufällige andere Farbe verliert 1 Kartenwert."**

### F3 — „stärker", aber die Zahlen sind identisch
Skill *Schmelzofen*: „Ab 50 % Hitze brennen Brände **stärker (−1 Wert, +1 Asche)**…"
`SCHMELZOFEN_BRAND_BONUS` ist ein **Zusatz** — Basis ist bereits −1/+1 (Brandmal). Der Text nennt den
Zusatz so, dass er wie der Gesamtwert aussieht.
**→ „…brennen Brände **zusätzlich** −1 Wert und geben +1 Asche extra."**

### F4 — Redundanz im selben Text
Legendär *Richtfest*: „**Am Ende jedes Durchlaufs**: je vollendeter Struktur … +250 dauerhafter Score.
Der aufgestapelte Bonus wird **am Ende jedes Durchlaufs** ausgezahlt (flach, kein Multiplikator)."

### F5 — Formulierung ergibt keinen Sinn
Legendär *Raserei*: „…hebt der Überschuss zusätzlich den Crit-Multiplikator — **je 100 Prozentpunkte
+1,00×, höchstens +1,00×**." Schritt = Deckel; die Regel reduziert sich auf „ab 100 pp Überschuss +1,00×".
**→ „…ab 100 Prozentpunkten Überschuss zusätzlich +1,00× Crit-Multiplikator (Maximum)."**

### F6 — Pfeilnotation statt Sätzen
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
Familie *Nachhall* Stufe I beginnt mit „**Nachhall:** der Formations-Faktor…", die Stufen II–IV
ebenfalls („Nachhall bei allen Formationen", „Nachhall übernimmt…"). Keine andere der 60 Familien
wiederholt ihren Namen — der steht bereits als Überschrift über dem Text.

### F8 — Zahl nur auf zwei von vier Stufen
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
`GlobalLeaderboard.jsx:87`: „Noch keine Einträge — sei **die/der** Erste."
Das ganze Spiel duzt und kommt sonst ohne Schrägstrich-Doppelform aus.
**→ „Noch keine Einträge — mach den Anfang."**

---

## G · Vorlagen- und Namens-Inkonsistenzen

### G1 — „Zehnter Sieg" / „Zehnter Schlag": verwechselbar und beide falsch benannt
- *Zehnter Sieg* (Score): „Jeder **12.** / **10.** / **8.** / **5.** gewonnene Stich: +X Score."
  Nur Stufe II passt zum Namen.
- *Zehnter Schlag* (Stichwert): „Karten auf **Position 20 und 40**" → mit „zehnter" hat das nichts zu tun.
**→ Umbenennen, z. B. „Beutezug" (Score alle N Siege) und „Marksteine" (Positionen).**

### G2 — Zwei Familien mit identischem Satzbau
*Zehnter Sieg*: „Jeder 12. gewonnene Stich: +600 Score."
*Perfekter Rhythmus*: „Jeder 7. gewonnene Stich: +250 Score."
Aus dem Text allein ist nicht erkennbar, dass es zwei verschiedene Familien sind (beide zählen
gewonnene Stiche, nur mit anderem Intervall/Betrag). Wenn beide im selben Angebot liegen, wirkt es
wie ein Anzeigefehler.
**→ Mechanischen Unterschied herausarbeiten oder eine der beiden streichen.**

### G3–G6 — Stufen-Templates brechen auf der letzten Stufe
| Familie | Bruch |
|---|---|
| *Kleine ganz groß* | I–III „je +3/+4/+5 Kartenwert", IV „**+3 Kartenwert**" ohne „je" — liest sich wie eine Verschlechterung |
| *Perfekte Folge* | I „ab der dritten +1, danach +2", II–IV „+1/+2/+3, danach +4" — anderer Satzbau |
| *Verstärkte Wiederholung* | III „je **+0,10 Faktor**" (additiv, ohne Bezugsgröße), IV „zusätzlich **×1,20**" (multiplikativ) |
| *Gerade/Ungerade Stärke* | IV „**zusätzlich** +1 Kartenwert" — worauf bezogen, sagt der Text nicht |

---

## H · Kleinere Beobachtungen

- **`SkillSelect` Archetyp-Verlustwarnungen** (`SkillSelect.jsx:22–27`) sind gut gemacht, aber
  unvollständig gegenüber `reducer.js:616–630`:
  *Feuer* nennt „Hitze & Asche", verschweigt, dass auch die **Schmiede-Zähler** (`forged`) fallen —
  damit verliert *Glutstahl* („+12 Score je geschmiedetem Wert") seine Bemessungsgrundlage, obwohl der
  Hinweis „Bereits aufgewerteter Kartenwert bleibt." (Zeile 283) das Gegenteil nahelegt.
  *Eis* nennt Gletscher und Masse, verschweigt die **Firn-Reserve** (`firnStack`).
- **`FORMATION_TYPE_LABELS`** existiert doppelt: `game/formations.js:45` (4 Typen) und
  `ui/formationLabels.js:7` (8 Typen + Kürzel). Zwei Quellen, eine Wahrheit — die Spieleranzeige nutzt
  die zweite.
- **Deck-/Pack-Namen sind gemischt DE/EN** (Sunset Rider, Kitsune, Malibu Wave, Biolumen,
  Kosmospanther, Moonwhale, Ascension, Flamingo, Peacock — daneben Königspfau, Sparfuchs,
  Schwarzes Loch, Roter Oni, Feuer/Eis/Blitz/Pflanze). Das ist als Marken-Set vertretbar, muss dem
  Übersetzer aber als „Eigennamen, nicht übersetzen" markiert werden (ist in der CSV geschehen) —
  außer den vier deutschen, die im EN sonst als Fremdkörper stehen bleiben.
- **`glossary.js` `match`-Listen sind deutsche Flexionen.** Sie steuern die Auto-Fettung in allen
  Beschreibungen und stehen **nicht** in der Übersetzungs-CSV als Anzeigetext — sie sind für EN neu zu
  pflegen. Die CSV führt sie als eigene Zeilen mit `note = wortformen`.

---

## I · Empfohlene Reihenfolge

**Vor der Übersetzung zwingend** (sonst frieren wir Fehler in EN ein):

1. **A1–A10** — falsche/tote Aussagen korrigieren. Aufwand gering, Wirkung hoch.
2. **A13** — `famEff` nach `src/game/architect.js` ziehen, `gen-db.mjs`, `ArchitectScreen.jsx` und
   `archEffects.js` importieren lassen. Räumt gleichzeitig **D2** und **E1/E2** ab und spart dem
   Übersetzer ~70 doppelte Strings.
3. **B1, B2, B4, B5** — Begriffs-Kollisionen auflösen. Solange „Weißglut" zwei Dinge heißt, ist keine
   saubere EN-Terminologie möglich.
4. **C1–C9** — Begriffs-Splitter zusammenführen. Ein Begriff = ein Wort = ein Glossareintrag.
5. **D1** — pp/Prozentpunkte entscheiden und im Style-Guide festschreiben.
6. **D3, D4, D5, F1, F2, F3** — Einzelkorrekturen, jeweils eine Zeile.

**Danach / parallel:**

7. **A11, A12** — Legende aus `FORMATION_TYPES` generieren.
8. **E3–E8** — Dev-Sprache raus, fehlende Begriffe ins Glossar (Stichpunkte, Deckpunkte, Upgrade-Baum,
   Onboarding, Ranglisten-Lauf, Wochen-Modifikator, Serienpunkt, Direkt-Score).
9. **F4–F9, G1–G6** — Formulierungen und Stufen-Templates glattziehen.
10. **A14** — README nachziehen.

**Style-Guide-Ergänzungen, die sich aus dem Durchgang ergeben** (`docs/text-style-guide.md` §1):
neu aufzunehmen sind *Firn*, *Masse*, *Bersten/Berst-Score*, *Cluster*, *Bekenntnis*, *Direkt-Score*,
*Serienpunkt*, *Struktur*, *Distrikt*, *Baufeld/Zelle*, *Stichpunkt (SP)*, *Deckpunkt (DP)*,
*Prozentpunkte (pp)*, *Runde/Durchlauf*, *Rarität* — plus die Regel „ein Wort = eine Bedeutung"
mit der Kollisionsliste aus Abschnitt B.

---

## J · Werkzeug

`scripts/export-strings.mjs` erzeugt die Inventar-CSV neu:

```bash
node scripts/export-strings.mjs                    # → docs/localization/strings_de_pixi_*.csv
node scripts/export-strings.mjs --ui-candidates    # zusätzlich die UI-Rohliste zum Nachprüfen
```

Die Datentexte werden dabei **importiert und resolvet** — jede Balance-Änderung an `constants.js` oder
`glacier.js` wandert automatisch in den nächsten Export. Die UI-Texte kommen aus einer Heuristik über
`src/App.jsx` + `src/ui/*.jsx` mit kuratierten Filterlisten; wird eine Komponente umbenannt oder neu
angelegt, ist die Dateiliste in `uiRows()` zu ergänzen.
