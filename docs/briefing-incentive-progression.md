# Briefing: Incentive & Progression — Prompt für eine Design-Session

> **Zweck:** Ein selbsttragendes Briefing, das in einen Claude-Chat **ohne Repo-Zugriff** kopiert
> werden kann, um Designrichtungen für Anreiz und Progression zu planen.
> **Quelle der Zahlen:** `README.md`, `src/game/*`, `src/ui/music.js`, `test/sim-balance-guard.test.js`,
> `docs/sim-harness-plan.md`, `docs/pitch.md`, `docs/genre-und-hook-recherche.md`.
> **Pflege:** Wenn sich Konstanten ändern, ist dieses Briefing veraltet — es ist eine Momentaufnahme
> vom 2026-08-30, keine zweite Quelle der Wahrheit. Bei Widerspruch gilt der Code.

Alles ab der Trennlinie ist der Prompt.

---

Du hilfst mir, Designrichtungen für **Anreiz und Progression** in meinem Spiel zu entwickeln.
Du hast keinen Zugriff auf den Code — alles, was du brauchst, steht hier.

Lies erst alles, dann arbeite den Auftrag am Ende ab.

## Rahmen dieser Session — bitte zuerst lesen

Autostich ist ein **Prototyp**. Nichts an der heutigen Umsetzung ist in Stein gemeißelt — auch nicht
der Upgrade-Baum, die Reihenfolge, in der Mechaniken im Lauf angeboten werden, die Lauflänge, die
Reihenfolge, in der *wir* neue Mechaniken überhaupt erst bauen, oder das Versprechen im Pitch. Was
unten als „so funktioniert es heute" beschrieben ist, ist eine **Momentaufnahme, kein Lastenheft**.
§7 sagt, was davon wirklich fest ist — alles andere ist Verhandlungsmasse, und du darfst sie
verhandeln.

Zwei Präferenzen für die ganze Session:

- Ich bin offen für einen **echten Umbau**, wenn er dem Spiel ein weiteres **Alleinstellungsmerkmal**
  gibt — nicht nur für kleine Zusatzsysteme obendrauf. Wenn eine gute Idee bedeutet, eine bestehende
  Struktur anzufassen (Upgrade-Baum, Entscheidungsplan, sogar die Lauflänge), ist das erwünscht, kein
  Hindernis.
- Ich will lieber **vom Mainstream des Genres abweichen** als ihn zu kopieren — ohne dabei ein
  **breites Publikum** zu verlieren. Bewerte jede Richtung auch danach, wie eigenständig sie ist.

Und die wichtigste Regel für dich: **Verwirf keine Idee nur, weil sie gerade nicht sauber in die
bestehende Mechanik passt.** Nenne sie trotzdem. Sag, was heute dagegenspricht, und was sich ändern
müsste — an Autostich oder an der Idee — damit sie passt. Eine Idee mit Reibung ist mehr wert als
gar keine Idee.

## 1 · Was Autostich ist

Ein **Roguelite-Autobattler-Stechspiel** im Browser (Vite + React + Pixi, Deploy auf GitHub Pages).
Prototyp, Version 0.3. Ich entwickle allein, mit KI-Agenten als Umsetzer.

Der Pitch, den ich benutze:

> Ein Kartenspiel darüber, wer neben wem steht: Stell 50 Durchläufe lang die richtigen Karten
> nebeneinander, und deine Skills machen aus einer braven kleinen Reihe eine Engine, die hoch genug
> punktet, um **Tracks freizuschalten, die kaum jemand hört**.

Die Pointe: **es gibt keine Spielerentscheidung im Kampf.** Du entscheidest nicht, welche Karte du
spielst. Du baust *zwischen* den Durchläufen und schaust dann zu.

Merk dir den letzten Halbsatz des Pitches. §5 handelt davon, und er ist der Grund, warum ich diese
Session mache.

## 2 · Wie ein Lauf funktioniert

**Karten.** 40 Karten = 4 Farben (Rot/Blau/Grün/Gelb) × Werte 1–10. Beide Seiten haben je ein eigenes
40er-Deck.

**Der Stich.** Beide Seiten decken automatisch die nächste Karte auf. **Die höhere Zahl gewinnt.**
Gleichstand gibt nichts. Nur ein Sieg gibt Score. Farbe ist im reinen Wertvergleich kosmetisch — sie
wird erst über Formationen und Archetypen mechanisch relevant.

**Der Durchlauf.** 40 Stiche = 1 Durchlauf. Ein Lauf hat **fest 50 Durchläufe** — also **2000 Stiche**.
Danach Game Over. **Es gibt kein Leben, keinen Tod, kein Scheitern.** Der Lauf endet, weil er zu Ende
ist, nicht weil man verloren hat.

**Die persistente Reihenfolge.** Deine Kartenreihenfolge bleibt über den ganzen Lauf bestehen — sie
ist das Objekt, das du baust. Nur das *Gegnerdeck* wird pro Durchlauf neu gemischt.

**Die Entscheidungen.** Nach jedem Durchlauf steht genau **eine** Entscheidung an, nach festem Plan
über die 50 Durchläufe verteilt:

- **13 × Perk** — aus 3 Angeboten wählen. Perks sind Familien in 4 Stufen (Normal · Selten · Sehr
  selten · Rar), dazu flache legendäre Perks.
- **13 × Aufstellung** — Karten in der Reihenfolge tauschen. 3–5 Energie pro Phase, ein Tausch kostet 1.
- **13 × Architekt** — Gebäude auf einem 8×5-Baufeld platzieren und drehen. Keine Münzen, keine
  Preise; die Begrenzung ist der Platz (20–24 nutzbare Zellen).
- **10 × Skill** — aus 12 Angeboten (3 je Archetyp) wählen, bis zu 6 gleichzeitig halten.
- **1 × Legendär** — in Durchlauf 29, belegt einen fixen 7. Slot.

**Wie Score entsteht.** Nur bei Sieg, multiplikativ:

```
Score = 400
      × Siegesserien-Multiplikator      (+2 % je Serienpunkt, gedeckelt bei +150 %)
      × Perk-Multiplikatoren
      × Formations-Multiplikator         (der Kern des Spiels, siehe unten)
      × Architekt-Faktoren               (volle Zeile/Spalte/Diagonale stapeln multiplikativ)
      + Flats (Anker, Feuer-Score, Ionisierung, Gebäude-Flats)
      × Crit                             (Basis-Crit ist 0; kommt aus Präzision-Perks und Blitz)
```

**Formationen — das ist das eigentliche Spiel.** Aus der Nachbarschaft in Segmenten à 5 Karten
entsteht je Position ein Multiplikator:

- **Wiederholung** (≥2 gleiche Werte): ×1,25 → ×1,50 → ×1,80, dann je +0,40, kein Cap
- **Farbblock** (≥3 gleiche Farbe): ab der 3. ×1,35, je weitere +0,20
- **Treppe** (≥3 streng steigend): ab der 3. ×1,35, je weitere +0,20
- **Wechsel** (≥3 Zick-Zack): ab der 3. ×1,40, je weitere +0,20
- **Anker**: eine einzelne Position zählt als Formation
- **Überlappung**: steckt eine Karte in mehreren Formationen, multipliziert das zusätzlich —
  2 Formationen ×1,5 · 3 ×2 · 4 ×3

**Die vier Archetypen** (Skills, frei mischbar):

- **⚡ Blitz** — Ladung sammeln, Karten ionisieren, der verlässliche Crit-Archetyp
- **🔥 Feuer** — Hitzeleiste, belohnt totale Überlegenheit; Konsumenten tauschen Hitze gegen Boni
- **❄ Eis** — friert Karten als „Gletscher" fest; die sammeln Masse und **bersten** über ihre Nachbarn
- **🌿 Pflanze** — Siege lassen Karten wachsen, ab einer Schwelle werden sie dauerhaft grün und
  bilden einen gemeinsamen Farbblock

**Wichtige mechanische Eigenheit:** Kartenwerte dürfen **über 10 hinaus** wachsen (kein Cap), das
Gegnermaximum ist 10. **Ab Kartenwert 11 gewinnt eine Karte jeden Stich sicher.**

## 3 · Wie lange ein Lauf dauert

Basis-Takt 1,75 s je Stich, mit Anzeige-Geschwindigkeit 1× bis 4× (rein kosmetisch, score-neutral).

- 2000 Stiche × 1,75 s ≈ **58 Minuten** bei 1×
- bei 4× ≈ **15 Minuten**, plus 50 Entscheidungen

**Realistisch also 20–70 Minuten pro Lauf.** Das ist wichtig: „noch ein Lauf" ist hier eine deutlich
größere Bitte an den Spieler als bei einem 25-Minuten-Roguelite. Jede Anreiz-Idee muss zu dieser
Sitzungslänge passen.

## 4 · Was es an Meta-Progression schon gibt

Nichts davon muss erfunden werden — das läuft bereits:

| System | Zustand |
| --- | --- |
| **SP-Upgrade-Baum**, laufübergreifend | Zwei Zweige: *Decks* (Eis/Pflanze freischalten, je Archetyp zwei Legendär-Stufen) und *Allgemein* (Baufeld 20→24, Formations-Energie 3→5, Rarität-Deckel, Drop-Raten, zweite Perk-Phase). Vollständig. |
| **DP-Werkstatt**, rein kosmetisch | Deck- und Battlefield-Skins. Zehn Freischaltarten existieren bereits: *n Läufe beendet, Serie, Bestscore, Lauf ohne Reroll, n Mono-Fraktions-Läufe, alle vier Mono-Decks, ein Lauf mit allen vier Fraktionen, erster GOTTGLEICH-Stich, n× Platz 1 einer Wochenrangliste, Onboarding beendet.* |
| **Wochen-Rangliste** | Eigener Modus. 19 Modifikatoren, davon 3–5 pro Woche gewürfelt (mind. 2 positive, mind. 1 negativer), aus dem Wochen-Seed für alle Spieler identisch. Beispiele: „Gegnerkarten +2 Wert", „Nur 12 Baufeld-Zellen", „Kein Reroll", „Doppel-Legendär", „Energie-Flut", „Formations-Boni ×2". Voll wirksam. |
| **Challenger-Seeds** | Vorhanden. |
| **Globale Bestenliste** | Supabase, Top-N lesen und veröffentlichen. Kein Account-System, nur ein Benutzername. |
| **Lokale Bestenliste** | Top 5. |
| **Geist des Rekordlaufs** | Speichert die Score-Trajektorie des besten Laufs (Stützstelle alle 13 Stiche) — man sieht während des Laufs, ob man vor oder hinter dem eigenen Rekord liegt. |
| **Soundtrack-Eskalation** | Der interessanteste Posten. Eigener Abschnitt — siehe §5. |

## 5 · Die Musik-Eskalation — der Schwerpunkt dieser Session

Ich glaube, hier liegt der stärkste ungenutzte Hook des Spiels, und ich will, dass du ihn ernst
nimmst statt ihn als Politur zu behandeln.

### Was gebaut ist

**54 Tracks**, alle produziert, normalisiert (−14 LUFS, AAC/.m4a) und ausgeliefert. Genre:
Synthwave/Outrun, eskalierend in Darksynth und Phonk. Ein Menü-/Victory-Theme („Midnight Drive")
plus **53 Run-Tracks** in fünf Intensitätsstufen:

| Stufe | Tracks | Greift ab Score |
| --- | --- | --- |
| `calm` — ruhig | 13 | 0 |
| `mid` — treibend | 10 | 3.000.000 |
| `hot` — schnell | 9 | 30.000.000 |
| `overdrive` — maximal | 9 | 70.000.000 |
| `overdrive+` — darüber | 12 | 90.000.000 |

**Die Eskalation folgt dem Score, nicht der Runde.** Das ist im Code ausdrücklich so entschieden und
von den Durchläufen entkoppelt: nicht „Durchlauf 40 klingt härter", sondern „drei Millionen Punkte
klingen härter".

Die Übergänge sind bereits sorgfältig gebaut — das ist keine Rohfassung:

- Ein Song, der noch keine 40 Sekunden läuft, wird **nie angeschnitten**; er läuft aus, dann reiht
  der nächste aus der neuen Stufe.
- Lief er länger, wird weich geblendet (1,1 s je Halbwelle, quadratische Kurve statt linear, weil
  Lautheit nicht der Amplitude folgt).
- Der nächste Track wird **vorgeladen**, bevor die Blende beginnt — sonst läge der Netzweg genau in
  der Stille zwischen den Halbwellen, hörbar auf dem Handy im Mobilnetz.
- Ein fortgesetzter Lauf startet sofort auf der score-richtigen Stufe.
- Eine leere Stufe fällt automatisch auf die nächstniedrigere zurück.
- Das Menü spielt nur `calm` und `mid` — „im Menü eskaliert nichts", bewusst so.
- In den Auswahlphasen wird die Musik abgesenkt (Ducking).
- Ein AnalyserNode hängt bereits am Audio-Element und speist eine audio-reaktive Grafik.

Außerdem existiert eine **generierte Download-Liste** des kompletten Soundtracks mit Direktlinks und
einer Sparse-Clone-Anleitung, sowie ein Werkzeug, das Laufzeiten je Track und Stufe ausgibt.

### Was der Spieler davon sieht

Eine Leiste am unteren Rand mit **dem Titel des laufenden Tracks** und einem Skip-Knopf.

Das ist alles. Kein Stufen-Indikator. Keine Ankündigung, dass es Stufen *gibt*. Kein Hinweis, wie
weit die nächste entfernt ist. Keine Sammlung, keine Liste, kein „gehört/nicht gehört". Nichts im
Spiel sagt dem Spieler, dass die Musik überhaupt auf ihn reagiert.

### Wie weit die Stufen wirklich weg sind

Ich habe eine Simulations-Harness, die komplette Läufe fährt. Zwei gemessene Referenzpunkte:

| Referenz | Median-Score | Erreichte Stufe |
| --- | --- | --- |
| **Zufalls-Policy** (wählt blind — der Boden, kein Spieler) | ≈ 3,5 Mio | kratzt gerade an `mid` |
| **Solver-Policy** (kompetent, aus meinen Balance-Messläufen) | ≈ 38,2 Mio | erreicht `hot` |
| `overdrive` (70 Mio) | — | ≈ 1,8× über dem Solver-Median |
| `overdrive+` (90 Mio) | — | ≈ 2,4× über dem Solver-Median |

Daraus folgt: **21 der 53 Run-Tracks — 40 % des Soundtracks — liegen oberhalb dessen, was ein
kompetenter simulierter Lauf im Median erreicht.**

*Belegstatus: Das sind Sim-Policies, keine Menschen. Die Zufalls-Policy ist der Boden, die
Solver-Policy eine starke, aber nicht optimale Referenz. Wie sich echte Spieler verteilen, weiß ich
nicht — das ist eine offene Frage, keine Behauptung.*

Der Pitch verspricht „Tracks, die kaum jemand hört". Das ist buchstäblich wahr. Es ist gleichzeitig
das Problem: **die größte fertige Belohnungsmenge im Spiel ist unsichtbar und für die meisten
Läufe unerreichbar, und niemand erfährt je, dass sie existiert.**

### Warum ich glaube, dass hier der Hook liegt

1. **Es ist bezahlt und fertig.** 53 Tracks sind das größte bereits produzierte Belohnungsinventar,
   das ich habe. Jede Idee, die sie nutzt, kostet Anzeige — nicht Produktion.
2. **Die Kopplung an den Score existiert schon.** Meine Diagnose in §6 ist, dass dem Score ein
   Gegenüber fehlt. Bei der Musik ist dieses Gegenüber bereits verdrahtet — es ist nur stumm.
3. **Es ist die einzige Belohnung, die *während* des Laufs eintritt und *fühlbar* ist.** Alles andere
   im Spiel ist eine Zahl. Ein Stufenwechsel ist ein Zustandswechsel, den man körperlich merkt.
4. **Es hat schon eine Sammel-Dimension** (Titel, Stufen) und sogar eine Außenwirkung (die
   Download-Liste).
5. **Der Pitch verkauft es bereits** — das Versprechen steht, das Spiel löst es nur nicht ein.

### Die Spannung, die dabei aufzulösen ist

Es gibt eine Option **„Ruhiger Modus"**, die die Eskalation bei `mid` deckelt — für Spieler, denen
die harten Stufen zu viel sind. Sobald Musik zu Progression wird, kostet eine Komfort- und
Barrierefreiheits-Option plötzlich Fortschritt. Das muss eine Antwort bekommen.

Zweitens: Musik ist die einzige Belohnung, die man **abschalten** kann. Ein stummgeschalteter Spieler
verliert den gesamten Hook. Auch das braucht eine Antwort — vermutlich eine sichtbare Entsprechung
zur hörbaren Eskalation.

### Was ich aus fremden Spielen dazu weiß

- **RuneScape** behandelt Musik als vollwertiges Sammelsystem: rund 1.400 einzeln freischaltbare
  Tracks mit eigenem Player, und das Freischalten von 500 Stück gibt eine eigene Belohnung. Beweis,
  dass eine Musik-Sammlung ein tragendes Meta-System sein kann — allerdings über Orte und Quests
  freigeschaltet, nicht über Leistung.
- **Tetris Effect** (von den Machern von Rez und Lumines): die Musik baut sich aus dem Spielerhandeln
  auf, jede Bewegung fügt Klangbausteine hinzu, der Spieler „komponiert" mit. Der Zone-Modus ist der
  Payoff-Moment — statt Einzelnoten kommen Akkorde, der Filter öffnet sich.
- **Peggle 2**: das Audio-Design ist als bewusster emotionaler Bogen gebaut, der genau im richtigen
  Moment drückt.

Meine Lesart daraus: **der stärkste Musik-Hook ist nicht die Liste, sondern der Moment des
Umschaltens.** Tetris Effect und Peggle investieren in den Übergang, RuneScape in die Sammlung.
Ich habe den Übergang bereits technisch sehr gut gebaut — und feiere ihn null.

## 6 · Meine Diagnose (aus einer Recherche, die ich schon gemacht habe)

**Es fehlt kein Meta-System.** Ich habe mehr davon als die meisten Wettbewerber. Der Hook fehlt aus
einem strukturellen Grund:

> **Ein Lauf fällt kein Urteil.**
> 50 Durchläufe ohne Tod enden immer gleich: sie enden. Es gibt kein Bestanden und kein Gescheitert,
> nur eine Zahl. Und ab Kartenwert 11 ist der Stich-Ausgang deterministisch — die zweite Laufhälfte
> baut strukturell keine Spannung mehr auf.

Ein Score *ist* kein Ziel. Ein Score wird erst zum Ziel, wenn ihm etwas gegenübersteht: eine
Schwelle, ein Gegner oder ein anderer Mensch. Balatro hat alle drei. Ich habe den Score nackt.

Die vier Fragen, die ich beantworten will, und was das Spiel heute liefert:

| Frage | Was sie verlangt | Ist-Zustand |
| --- | --- | --- |
| Warum will ich besser werden? | Etwas Vorenthaltenes, das **sichtbar** ist | Freischaltungen existieren, aber die leeren Plätze sieht niemand |
| Was will ich erreichen? | Eine **benannte Schwelle** | nichts — Score hat keine Schwelle |
| Wo will ich hin? | Ein **gezeichnetes** Ziel | die Musikstufen sind genau das, aber unsichtbar (§5) |
| Wen will ich besiegen? | Ein **Gesicht mit Namen** | nichts — die Gegenseite ist ein anonymer Wert ≤10 |

**Die Hook-Archetypen des Genres**, nach Kosten-Wirkung sortiert, mit meiner Einschätzung:

| Archetyp | Vertreter | Zugkraft | Kosten | Sättigt | Bei mir |
| --- | --- | --- | --- | --- | --- |
| Narrativer Tropfen | Hades, Inscryption, Griftlands | sehr hoch | sehr hoch | ja | zu teuer für Solo |
| **Benannter Gegner** | Hades, StS (das Herz) | hoch | niedrig | nein | **fehlt vollständig** |
| **Sammel-Raster** | Balatro (Joker-Album), Isaac | hoch | niedrig | ja | **Daten da, Anzeige fehlt** |
| Schwierigkeits-Leiter | StS Ascension, Balatro Stakes, Hades Pact | mittelhoch | mittel | stark | teils — aber *gewürfelt*, nicht *gewählt* |
| Wachsende Basis | Wildfrost, Loop Hero, Cult of the Lamb | hoch | hoch | langsam | nicht vorhanden |
| Kombinatorische Neugier | Monster Train Fraktionspaare | mittel | sehr niedrig | nein | vorhanden, aber unbenannt |
| Score / Rangliste | Balatro Endlos, Daily Seeds | niedrig **allein**, hoch **mit Gegenüber** | niedrig | nein | Ist-Zustand, ohne Gegenüber |
| Asynchrones PvP | Super Auto Pets, The Bazaar | sehr hoch | hoch | **nie** | Wochenmodus als Vorstufe |

Zwei Lehren, die ich mitnehme: Hades' *Pact of Punishment* ist die reifste Form der
Schwierigkeits-Leiter, weil der Spieler die Härte **selbst zusammenstellt** und dafür **bezahlt
wird**. Und Balatro zahlt auch aus **verlorenen** Läufen noch Fortschritt aus — deshalb funktioniert
dort „noch ein Lauf".

**Vier Richtungen, die ich mir selbst schon notiert habe** (Ausgangspunkt, nicht Beschluss):

1. **„Das Soll"** — jeder Lauf bekommt vor dem Start eine Zielpunktzahl. Am Ende steht *bestanden*
   oder *nicht bestanden*. Gibt dem Lauf ein Urteil, ohne ihm einen Tod zu geben.
2. **„Die Rivalen"** — aus dem anonymen Rekord-Geist wird eine Riege benannter Gegner mit je eigener
   Trajektorie und eigenem Soll, aufsteigend.
3. **„Die Route"** — die Score-Skala als sichtbare Strecke mit den Musikstufen als Stationen,
   inklusive der noch nicht erreichten.
4. **„Die Vitrine"** — das Skin-Raster zeigt alle Plätze, verschlossene ausgegraut mit ihrer
   Bedingung im Klartext.

Richtung 3 ist der Berührungspunkt zu §5, und sie ist die am wenigsten durchdachte der vier.

Diese vier sind bewusst klein und wiederverwertend gedacht — reine Umdeutung bestehender Daten,
keine neue Struktur. Nach dem Rahmen oben: das ist der Boden, nicht die Decke. Wenn ein größerer
Umbau ein eigenständigeres Spiel daraus macht, will ich den sehen.

## 7 · Randbedingungen

### Was wirklich fest ist

- **Solo-Entwickler** mit KI-Agenten. Kein Team, kein Budget für Vertonung oder viel neues Artwork.
  **Neue Musik ist dagegen billig** — der Soundtrack ist KI-generiert und über ein Skript
  normalisiert; eine weitere Stufe wäre kein Kostenproblem.
- **Jeder Spielertext kostet ×4** — die UI läuft in Deutsch, Englisch, Spanisch und vereinfachtem
  Chinesisch über Lokalisierungs-Kataloge. **Track-Titel sind davon ausgenommen**, die bleiben
  englische Eigennamen.
- **Kein Account-System**, kein echtes PvP-Matchmaking. Was es gibt: `localStorage` und eine
  Supabase-Tabelle mit Benutzernamen.
- **Läuft im Browser**, auch mobil. Sitzungen können unterbrochen werden. Audio startet erst nach
  der ersten Nutzergeste (Autoplay-Sperre der Browser), und manche Spieler spielen stumm.

### Was offen ist — hier nicht selbst zensieren

- **Score als einzige Ziel-Metrik.** Heutiger Stand, keine Vorgabe für morgen.
- **Die Lauflänge.** Heute `MAX_CYCLES = 50`, also 2000 Stiche — ≈58 Minuten bei 1×, ≈15 Minuten bei
  4×, realistisch 15–60 Minuten je nach Tempo-Mix (§3). Eine Zahl, mit der du rechnen sollst, aber
  keine, die du respektieren musst: wenn ein Umbau eine andere Lauflänge braucht, um zu
  funktionieren, sag das offen, statt die Idee deswegen zu verwerfen.
- **Der Upgrade-Baum.** Struktur, Äste, was er überhaupt freischaltet — alles offen. (§4 beschreibt
  den heutigen Stand, zwei Zweige *Decks* und *Allgemein* — das ist Bestandsaufnahme, keine Vorgabe.)
- **Die Reihenfolge der Entscheidungstypen im Lauf.** Heute ein fester 50-Einträge-Plan (13 Perk ·
  13 Aufstellung · 13 Architekt · 10 Skill · 1 Legendär, Skill zuerst, Legendär in Durchlauf 29) —
  auch das ist änderbar, wenn eine Richtung davon profitiert.
- **Die Reihenfolge, in der *wir* neue Mechaniken bauen.** Unentschieden. Schlägst du mehrere
  Richtungen vor, sag auch, was zuerst drankäme und was worauf aufbaut.
- **Das Pitch-Versprechen „ein Kartenspiel, das man nicht verlieren kann".** Aktueller Stand, keine
  heilige Kuh. Soll eine Richtung das kippen, sag es ausdrücklich und sag, warum es sich lohnt — nicht
  beiläufig als Nebeneffekt einer anderen Idee.

## 8 · Dein Auftrag

### Erst recherchieren

**Verlass dich nicht auf meine Zusammenfassung.** Meine Recherche ist vom 30.08.2026, sie kann
unvollständig oder überholt sein, und ich habe sie selbst aufgestellt — ich brauche keine
Bestätigung, ich brauche eine Prüfung. Recherchiere selbst, mindestens zu:

- **Musik als Progression und Belohnung** in Spielen: Wer koppelt Musik an Leistung statt an Ort
  oder Story? Was ist dabei gescheitert und warum? Gibt es Spiele, in denen eine Musikstufe ein
  *erklärtes Ziel* ist und nicht nur ein Effekt?
- **Score-getriebene adaptive Musik** — wie wird der Übergang gefeiert, wenn er gefeiert wird?
- **Was seit Mitte 2026 im Roguelike-Deckbuilder-Genre dazugekommen ist**, das meine Tabelle in §6
  nicht kennt.

Sag mir, was du gefunden hast, und **wo es meiner Darstellung widerspricht**.

### Dann entwerfen

Entwickle **3 bis 5 klar unterscheidbare Designrichtungen** für Anreiz und Progression. Nicht eine
Empfehlung mit Varianten — echte Alternativen, die verschiedene Wetten eingehen.

**Mindestens zwei davon müssen die Musik-Eskalation aus §5 zum tragenden Element machen**, nicht zur
Dekoration am Rand. Die übrigen dürfen sie ignorieren — ich will auch sehen, wie eine Lösung
aussieht, die ohne sie auskommt.

Je Richtung:

- **Ein Satz**, der sie beschreibt, und ein Name, den ich benutzen kann.
- **Welchen Hook-Archetyp** aus der Tabelle in §6 sie bedient — und welche der vier Fragen sie
  beantwortet und welche nicht. Eine Richtung, die alle vier beantwortet, ist verdächtig.
- **Was der Spieler konkret tut**, das er heute nicht tut.
- **Was sie an System braucht** — und was sie aus §4 und §5 wiederverwenden kann. Fasst sie eine der
  in §7 als „offen" markierten Strukturen an (Upgrade-Baum, Entscheidungsplan, Lauflänge), sag das
  ausdrücklich statt es zu verstecken.
- **Aufwand** grob (klein / mittel / groß) und **wo das Risiko liegt.**
- **Wie mainstream oder eigenständig sie ist**, und ob sie trotzdem ein breites Publikum erreichen
  kann. Eine Richtung, die ein bekanntes Genre-Muster übernimmt, ist willkommen — sag es dann aber
  dazu. Eine Richtung ohne echtes Vorbild im Genre ist ausdrücklich erwünscht, keine Notlösung.
- **Wie sie mit der Lauflänge umgeht** (§7) — und ob sie diese absichtlich verändert.
- **Wie sie zum „man kann nicht verlieren"-Versprechen steht** — eingeschlossen die Option, es bewusst
  zu kippen, wenn du das für richtig hältst.
- Bei den Musik-Richtungen zusätzlich: **wie sie mit stummen Spielern und mit dem „Ruhigen Modus"
  umgeht**, und ob sie auf den *Moment des Umschaltens* oder auf die *Sammlung* setzt.

Wenn mehrere Richtungen zusammen mehr ergeben als einzeln, sag auch, **in welcher Reihenfolge** ich
sie bauen sollte und was wovon abhängt — die Umsetzungsreihenfolge ist bei mir komplett offen.

### Dann entscheiden

- **Sag mir, welche du empfiehlst und warum**, mit einer klaren Begründung statt einer Abwägung.
- **Widersprich meiner Diagnose in §6, wenn du sie für falsch hältst.** Besonders die These „ein
  Lauf ohne Urteil hat keinen Hook" — wenn es Gegenbeispiele gibt, also Spiele, die ohne
  Scheiterzustand binden, nenne sie.
- **Sag mir auch, wenn du meine Musik-These für überschätzt hältst.** Ich bin darin verliebt, und
  das ist genau der Zustand, in dem man Unsinn baut. Wenn 40 % unerreichbarer Soundtrack schlicht
  bedeutet, dass die Schwellen falsch stehen und nicht, dass dort ein Hook liegt, sag das.
- Wenn dir eine Angabe fehlt, die deine Antwort verändern würde, **frag zuerst**, statt zu raten.

Was früher hier als Verbot stand, ist jetzt nur noch **Skepsis, kein Veto**: eine dritte Währung,
eine höhere Score-Decke, ein Theme-Wechsel als reine Anreiz-Reparatur ohne echte strukturelle
Änderung dahinter. Wenn du eine davon für richtig hältst, sag kurz, wogegen sie bisher stand und
warum sie es trotzdem wert ist — mehr Hürde ist das nicht. Die Verlängerung des Upgrade-Baums nehme
ich ganz zurück: die ist so offen wie alles andere in §7.
