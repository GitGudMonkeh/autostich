# Design-Doc: Stein-Fraktion — „Der Fels in der Brandung" (v0 · Konzept)

> **Status: KONZEPT.** Nur Vision, Fundament und Abgrenzung. **Noch keine Skills, noch keine Zahlen.**
> Reihenfolge wie bei Eis/Pflanze: (1) Vision → (2) Fundament → (3) Linien/Rollen → (4) Skills → (5) Zahlen zuletzt (Sim + Playtest).
>
> Stand: 2026-08-18 · Basis: `Autostich/pixi` (`537474b`) · Lebendes Dokument — überlebt Context-Clears, vor jedem
> Arbeitsbeginn zuerst hier lesen.
>
> **Terminologie-Vorschlag (noch nicht eingefroren):** **Gewicht** (eigene Karte) · **Abrieb** (Zähler auf der
> Gegnerkarte) · **Splitter** (der permanente −1-Wert-Schritt) · **Geröll** (Score-Kanal). Bewusst KEIN „Masse"
> (Eis), kein „Wachstum" (Pflanze), kein „Schicht" (Eis-Kanal). Vor der Skill-Runde mit `docs/localization/` §3
> gegenprüfen — jede Vokabel braucht genau eine englische Entsprechung.

---

## 1 · Vision

**Stein ist die erste Fraktion, die nicht dich stärker macht, sondern den Gegner schwächer.**

Alle vier bestehenden Fraktionen arbeiten am eigenen Feld: Feuer heizt und schmiedet, Blitz lädt und ionisiert,
Eis türmt Masse, Pflanze wächst. Das Gegnerdeck ist überall nur Kulisse — es wird angekratzt (Brandmal), markiert
(Ausläufer) oder übersprungen (Einfrieren), aber es bleibt, was es ist: 40 Karten, Werte 1–10, jeden Durchlauf neu
gemischt, über 50 Durchläufe unverändert.

**Stein trägt es ab.** Die Brandung schlägt 2.000 Mal gegen denselben Fels, und am Ende ist nicht der Fels weg,
sondern das Meer flach. Der Kern ist eine **Übertragung**, keine Erzeugung: was der Gegner verliert, setzt sich
bei dir als Geröll ab.

Daraus folgt die zweite, ungewöhnlichere Hälfte der Identität:

> **Stein ist die einzige Fraktion, für die eine Niederlage ein Rohstoff ist.**

Überall sonst ist der verlorene Stich reiner Verlust (Serie bricht, kein Score). Bei Stein ist der verlorene Stich
mit der richtigen Karte der *Arbeitsschritt*: die Welle bricht sich am Fels und geht geschwächt zurück. Je höher
die Welle, desto mehr Abrieb — deine **1 gegen ihre 10** ist der beste Abtrag, den du kriegen kannst.

Das ist auch die Antwort auf „etwas um niedrige Karten": Stein macht die niedrigen Karten nicht stark, es macht sie
**nützlich, während sie schwach sind** — und flacht das Gegnerdeck so weit ab, dass sie am Ende von allein gewinnen.

---

## 2 · Abgrenzung — warum das keine fünfte Variante von etwas Bestehendem ist

| | Achse | Richtung | Braucht Siege? | Zeitprofil |
|---|---|---|---|---|
| **Feuer** | Hitze (Marge) | eigene Karten (+Wert schmieden) | ja, mit Vorsprung | sofort, volatil |
| **Blitz** | Crit/Ladung | eigene Karten (Ionisierung) | ja | schubweise |
| **Eis** | Masse auf dem Brettfeld | eigenes Feld (Cluster → Bruch) | teilweise (Bruch ist sieg-unabhängig) | Aufstauen → Explosion |
| **Pflanze** | Wachstum je Karte | eigene Karten (Wert bis 11) | ja, grün | langsam, stetig |
| **Stein** | **Abrieb am Gegnerdeck** | **fremde Karten (−Wert, permanent)** | **nein — Niederlagen tragen ab** | **Zinseszins über den ganzen Lauf** |

**Die drei Kollisionen, die wir bewusst vermeiden:**

1. **Nicht wie der Gletscher (ausdrückliche Vorgabe).** Der Gletscher *pinnt eine Karte auf eine Brett-Zelle* und
   macht sie **starr** — die Kern-Entscheidung dort ist *Position gegen Freiheit*. Stein fasst die Aufstellung
   **nicht** an: der Stein sitzt **auf der Karte**, nicht auf dem Feld, und wandert mit ihr. Keine gepinnten Zellen,
   keine Nachbarschafts-Cluster, kein Bersten. Wer Stein spielt, behält seine Aufstellungsfreiheit vollständig.
2. **Nicht wie die Schmiede (Feuer).** Feuer nimmt sich deine **niedrigste Karte und hebt ihren Wert** — das ist
   „niedrige Karten reparieren". Stein hebt **nie** einen eigenen Kartenwert. Gewicht ist keine Kampfkraft.
   Regel für alle künftigen Stein-Skills: **Stein erzeugt keinen Kartenwert.**
3. **Nicht wie Brandmal (Feuer) / Ausläufer (Pflanze).** Brandmal ist ein **temporärer** −Wert für den nächsten
   Durchlauf, gekoppelt an Hitze; Ausläufer ist eine **Markierung**, die beim Besiegen Wachstum abwirft — die
   Gegnerkarte selbst bleibt unangetastet. Stein ist der einzige **permanente, kumulative** Eingriff: einmal
   abgesplittert, bleibt die Gegnerkarte für den Rest des Laufs kleiner.

---

## 3 · Das Fundament (Baseline-Stein, immer an)

Was Stein **ohne jeden Skill** tut. Die späteren Skill-Linien sind nur Modifikatoren darauf — gleiche Bauweise wie
`docs/eis-rework.md` §2.

### 3.1 · Versteinerung — welche Karten sind Fels?
**Vorschlag (Empfehlung): automatisch über den Kartenwert.** Versteinert ist jede eigene Karte mit Wert **≤ Schwelle**
(Start z. B. 3 → 12 von 40 Karten). Skills heben die Schwelle bzw. versteinern gezielt einzelne Karten.

Begründung: kein neuer Klick, keine neue Phase, keine neue UI-Naht — und der Pfeiler „niedrige Karten" ist ab dem
ersten Skill mechanisch real, ohne dass wir ihn extra erklären müssen. Der Gegenentwurf (Pick wie beim Gletscher)
ist in §7 als offene Frage notiert.

Wichtig: **Versteinerung verändert die Karte im Kampf nicht.** Sie kämpft mit ihrem Wert weiter, sie ist weiter
frei aufstellbar, sie zählt normal in Formationen. Sie bekommt nur eine zweite, unsichtbare Achse: **Gewicht**.

### 3.2 · Gewicht — die eigene Achse (nur steigend)
Eine versteinerte Karte sammelt **Gewicht**. Quelle (Baseline): **jede Niederlage** dieser Karte, skaliert an der
**Wucht** der Welle — also am Wertabstand `Gegnerwert − eigener Wert`. Je deutlicher du mit dem Fels verlierst,
desto mehr Gewicht.

- Nur steigend, nie fallend (wie Pflanze-Wachstum, damit ein schlechter Durchlauf nichts kaputt macht).
- Gewicht ist **kein Kartenwert** und wird nie einer (§2, Regel 2). Es ist die Zahl, die den Abtrag treibt.
- Der Fels wird also genau dadurch schwer, dass er nichts erreicht — das ist die Fantasie in einer Zeile.

### 3.3 · Abrieb & Splitter — die Manipulation des Gegnerdecks
Verliert eine versteinerte Karte ihren Stich, bekommt **die Gegnerkarte, die sie geschlagen hat**, **Abrieb** in
Höhe ihres Gewichts. Abrieb liegt **auf der Gegnerkarte** (je `oppCard.id`, wie die Brand-Marker) und ist
**laufweit persistent**.

Erreicht der Abrieb einer Gegnerkarte eine **Schwelle**, **splittert** sie: **−1 Kartenwert, dauerhaft für den
Rest des Laufs**, Abrieb-Zähler auf 0. Boden: **Wert 1** (nie 0 — sonst kippt das Spiel in Auto-Siege, siehe §6).

Zwei-Stufen-Ressource genau wie überall sonst im Spiel: *Wachstum → grün*, *Masse → Schwelle → Bruch*,
*Ladung → voll → Ionisierung*, **Abrieb → Schwelle → Splitter**.

### 3.4 · „Fels in der Brandung" — die Serie hält
**Die Niederlage einer versteinerten Karte bricht deine Siegesserie nicht.** Sie erhöht sie auch nicht — die Serie
**hält** einfach.

Das ist die mechanische Übersetzung des Namens und zugleich die **Existenzbedingung** der Fraktion: der Serien-
Multiplikator ist der größte Hebel im Spiel, und eine Fraktion, deren Motor Niederlagen sind, wäre ohne diesen
Schutz unspielbar. Deshalb steht er im **Fundament**, nicht in einem Skill.

> ⚠ Das ist zugleich das **größte Balance-Risiko des ganzen Entwurfs** — siehe §6.1.

### 3.5 · Geröll — der Score-Kanal
Jede Fraktion hat ihren eigenen Ertrags-Kanal (`fireBase/fireWhite`, `lightYield`, `plantRoot/Bloom/Harvest`,
`glacierYield`). Stein bekommt **Geröll**, gespeist aus zwei Quellen:

- **Abtrag:** jeder **Splitter** (permanenter −1) zahlt Score — der sichtbare Meilenstein des Grindens.
- **Der Fels überdauert:** **gewinnt** eine versteinerte Karte einen Stich, zahlt sie Score **nach ihrem Gewicht**.
  Das ist die Pointe des Laufs: dieselbe 1, die 30 Durchläufe lang nur verloren hat, gewinnt am flachgeschliffenen
  Gegnerdeck plötzlich regelmäßig — und jeder dieser Siege ist ein Vermögen.

---

## 4 · Der Kreislauf (eine Seite, ohne Zahlen)

```
   niedrige Karte verliert  ──►  Gewicht  ──►  Abrieb auf der Gegnerkarte
            ▲                                          │
            │                                          ▼
     Serie hält (§3.4)                           Splitter: −1 Wert, permanent
            │                                          │
            │                                          ▼
            └────────  Gegnerdeck wird flacher  ◄── Geröll-Score
                                 │
                                 ▼
              deine niedrigen Karten gewinnen  ──►  Score nach Gewicht
```

**Der Lauf hat dadurch zwei klar getrennte Hälften** — und genau das hat sonst keine Fraktion:

- **Frühe Durchläufe (Abtrag):** du verlierst viel, dein Score ist mager, die Serie hält gerade so. Was du aufbaust,
  ist unsichtbar (Gewicht) und liegt beim Gegner (Abrieb).
- **Späte Durchläufe (Ernte):** das Gegnerdeck ist um bis zu 180 Wertpunkte leichter, deine Winrate steigt von
  allein, und deine schwersten Karten sind zugleich deine bestbezahlten.

Das Zeitprofil ist damit **Zinseszins** (Feuer = sofort, Eis = Aufstauen/Explosion, Blitz = schubweise,
Pflanze = linear langsam) — ein Profil, das noch frei ist.

---

## 5 · Die drei Vorgaben, abgeglichen

| Vorgabe | Wo sie eingelöst ist |
|---|---|
| **Manipulation des Gegnerdecks** | §3.3 — der **einzige permanente** Eingriff ins Gegnerdeck im ganzen Spiel; kumulativ über 50 Durchläufe, mit dem Deck-Gesamtwert (220 → min. 40) als natürlicher Skala. |
| **Manifestieren der eigenen Karten, aber nicht wie Gletscher** | §3.1/§3.2 — der Stein sitzt **auf der Karte statt auf dem Brettfeld** und **kostet keine Aufstellungsfreiheit**. Genau die Umkehrung des Gletscher-Handels (Position gegen Wert). Kein Pinnen, kein Cluster, kein Bersten. |
| **Etwas um niedrige Karten** | §3.1 (Versteinerung nach Wert), §3.2 (Gewicht wächst mit dem Wertabstand → je niedriger die Karte, desto schneller), §3.5 (der späte Sieg der niedrigen Karte ist der Haupt-Payoff). |
| **Fels in der Brandung** | §3.4 wörtlich — die Serie hält, während alles auf dich einschlägt. |

---

## 6 · Risiken — was diesen Entwurf kaputt machen kann

### 6.1 · Der Serien-Schutz ist zu stark (Hauptrisiko)
Die Serie ist der größte Multiplikator im Spiel. „Niederlagen brechen die Serie nicht" ist deshalb potenziell
stärker als der ganze Rest der Fraktion — und zwar **für jede Beimischung**, nicht nur für Mono-Stein: wer Feuer
oder Blitz spielt und drei Stein-Skills mitnimmt, kauft sich Serien-Immunität für seine schlechten Karten.

Denkbare Bremsen (eine reicht vermutlich, entscheiden wir mit Sim):
- **Budget je Durchlauf** („Standfestigkeit": die ersten *n* Fels-Niederlagen halten, danach bricht sie doch).
- **Nur unter der Schwelle** — greift ohnehin nur für ≤3er-Karten, also ~12 von 40; das ist schon eine Bremse.
- **Bekenntnis-Skalierung** wie bei den anderen Fraktionen (`commitScale`, `steinSkillCount/SKILL_SLOTS`) —
  der Schutz greift erst ab *n* Stein-Skills voll.
- **Preis:** ein gehaltener Fels-Stich zahlt **keinen** Score (die Serie hält, aber der Stich ist tot).

Vergleichspunkt im Bestand: `SK_ICE_17 Eispanzer` (Niederlage neben einem Gletscher bricht die Serie nicht) und
`SK_LIGHTNING_17 Serienschutz` (kostet dafür halbe Ladung). Es gibt also Präzedenz — beide sind aber **bedingt**
(Position bzw. Ressourcenpreis). Stein braucht seinen eigenen Preis.

### 6.2 · Permanente Erosion trifft ALLE Fraktionen (Cross-Skalierung)
Ein flacheres Gegnerdeck hilft Feuer (Marge → Hitze), Blitz (mehr Siege → mehr Ladung), Pflanze (mehr grüne Siege)
und Eis (mehr Gletscher-Siege) **genauso**. Stein ist damit kein Selbstzweck-Motor, sondern ein **Winrate-Verstärker
für den ganzen Build** — die gefährlichste Sorte Effekt in diesem Spiel.
Gegenmittel: harter **Boden bei Wert 1**, ein **Lauf-Deckel auf den Gesamtabtrag**, und Splitter-Score, der über
`commitScale` an das Stein-Bekenntnis gekoppelt ist.

### 6.3 · Stapelnde −Wert-Quellen
`oValue = max(0, oCard.value + oppValueMod − brandActive)` (engine.js:376). Kommt Abrieb dazu, können Brandmal
(Feuer) + Splitter (Stein) dieselbe Karte auf 0 drücken → garantierte Siege, und zwar *strukturell*, nicht als
Ausnahme. **Der Boden muss auf dem Endwert liegen, nicht je Quelle.**

### 6.4 · Die Fraktion fühlt sich 20 Durchläufe lang nach nichts an
Ein Motor, dessen Payoff im letzten Drittel liegt, ist in einem Roguelike ein Feedback-Problem. Gegenmittel liegen
in der Anzeige, nicht in der Mechanik: sichtbarer Abrieb an der Gegnerkarte (Riss-Overlay, wie Frost/Brand als
Kartenkind), ein Fraktions-Panel „Gegnerdeck: 220 → 173" und Splitter als hörbares/sichtbares Ereignis.
Zusätzlich braucht die Baseline **einen kleinen Sofort-Ertrag** je Splitter, damit der Zähler nicht stumm läuft.

### 6.5 · Vokabel-Kollisionen
„Masse" (Eis), „Wachstum" (Pflanze), „Schicht" (Eis-Kanal), „Kern" (Formations-Kern, Pflanze-Kernholz), „Sockel"
(Architekt-Gebäude `A_SOCKEL`) sind vergeben. Vorschlag steht im Kopf dieses Docs; Freigabe vor der Skill-Runde.

---

## 7 · Offene Fragen (brauchen eine Entscheidung, bevor Skills entworfen werden)

1. **Versteinerung: automatisch nach Wert (Empfehlung, §3.1) oder gewählt wie der Gletscher-Pick?**
   Automatisch = null UI, liefert den Niedrig-Karten-Pfeiler geschenkt. Gewählt = mehr Entscheidung, aber sehr nah
   an der Gletscher-Geste, die wir laut Vorgabe gerade meiden wollen.
2. **Trägt nur die *Niederlage* ab, oder auch der Sieg?** Reine Niederlage ist die schärfere, eigenständigere
   Identität („nur der Fels, gegen den die Welle läuft"). Sieg-Abtrag wäre zugänglicher, verwischt aber die
   Abgrenzung zu Brandmal.
3. **Wie permanent ist permanent?** Laufweit (Empfehlung, das ist der ganze Reiz) oder pro Durchlauf regenerierend
   (deutlich zahmer, aber dann ist es nur ein zweites Brandmal).
4. **Ist der Serien-Halt Fundament oder Skill?** (§6.1) Fundament = die Fraktion funktioniert ab Skill 1;
   Skill = leichter zu balancieren, aber die ersten Stein-Picks fühlen sich schlecht an.
5. **Reihenfolge des Gegnerdecks anfassen?** `oppOrder` wird jeden Durchlauf frisch gemischt und ist bis heute
   **völlig unangetastet** — die letzte freie große Stellschraube im Spiel. Wäre ein zweiter, sehr eigener
   Stein-Hebel („der Fels lenkt die Strömung": schwere Gegnerkarten wandern ans Ende des Durchlaufs). Bewusst
   **nicht** im Fundament — Kandidat für eine Legendäre. Wollen wir das überhaupt?
6. **Fünfte Fraktion oder Ersatz?** `MAX_ARCHETYPES = 4` — bleibt der Deckel bei 4 (dann: 5 Fraktionen, aber nur
   4 gleichzeitig, was die Wahl schärft, Empfehlung) oder steigt er auf 5 (dann verwässern Angebote und
   `commitScale` je Fraktion)?

---

## 8 · Systemnähte (Vorab-Inventar — noch nichts davon angefasst)

Damit bei der Umsetzung nichts übersehen wird; Aufwand liegt zu einem guten Teil **außerhalb** der Engine.

- **Engine:** neuer Zustand analog zum Bestand — `weight{cardId}` (wie `growth`), `abrasion{oppCardId}` +
  `splinter{oppCardId}` (wie `brandPending/brandActive`, aber ohne Durchlauf-Reset), `steinYield` als Kanal.
  Der Abzug gehört in dieselbe Zeile wie Brand (`engine.js:376`) — **ein** gemeinsamer Boden (§6.3).
- **Serien-Naht:** der Niederlage-Zweig in `resolveTrick` (`winStreak = 0`) bekommt die Fels-Ausnahme.
- **`skills.js`:** 17 + 4 legendäre Skills auf 5–6 Linien (Bestandsformat), Helfer `steinSkillCount` für
  `commitScale`.
- **`reducer.js`:** `activeArchetypes` um `"stone"` erweitern, `PICK_SKILL`-Gates.
- **`progression.js`:** neuer `deckUnlock`-Knoten (`stoneDeck`, Kosten wie `iceDeck`/`plantDeck` = 4 SP).
  ⚠ **Migrationsfalle:** `RANKED_ARCHETYPES` leitet sich automatisch aus den `deckUnlock`-Knoten ab
  (`progression.js:135`) und `rankedUnlocked` verlangt **je Archetyp ≥1 abgeschlossenen Lauf**. Ein neuer Knoten
  **entzieht bestehenden Spielern den Ranked-Zugang**, bis sie einen Stein-Lauf beendet haben. Das ist eine
  Produktentscheidung (bewusst so? oder Stein aus `RANKED_ARCHETYPES` ausnehmen?), keine Nebensache.
- **Kosmetik/UI:** `deck_stein` + `bf_stein` (Mono-Challenge-Freischaltung wie `deck_feuer` & Co.),
  Fraktions-Icon + `FACTION_GLOW` (`src/ui/FactionIcon.jsx`), Fraktions-Panel, Karten-Overlay für Abrieb.
- **i18n:** **jeder** Anzeigetext nach `de.js` + `en.js`, Skills zusätzlich nach `src/i18n/enSkills.js`;
  Terminologie §3 des Übersetzerpakets ist eingefroren → neue Vokabeln brauchen dort einen Eintrag mit
  genau einer englischen Entsprechung.
- **Sim/Tests:** eigene Test-Datei nach Vorbild `test/starfield-budget.test.js`/`test/engine.test.js`;
  Sim-Sweep über den Abtrag-Deckel, bevor Zahlen festgezurrt werden.
- **Glossar:** `glossary.js` — Gewicht/Abrieb/Splitter/Geröll als Einträge.

---

## 9 · Nächster Schritt

§7 beantworten (vor allem 1, 2, 4 und 6). Danach: Linien-Struktur (5–6 Linien × 3 Skills + 4 Legendäre) im selben
Format wie `docs/eis-rework.md` §3, **Zahlen weiterhin zuletzt**.
