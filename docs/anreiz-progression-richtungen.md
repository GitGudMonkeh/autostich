# Anreiz & Progression — Designrichtungen

**Status: Vorschlag, keine Entscheidung.** Stand 2026-08-30, Zweig `claude/incentive-progression-design-p0igfh`.
Grundlage ist das Briefing „Incentive & Progression"; dieses Dokument prüft es, korrigiert es an drei Stellen
und entwickelt daraus fünf Richtungen.

Belegstatus je Aussage ist markiert: **gemessen** (im heutigen Build ausgeführt), **beobachtet** (im Code
nachgelesen), **recherchiert** (Fremdquelle), **abgeleitet**, **vorgeschlagen**.

---

## 1 · Prüfung des Briefings gegen den Code

### Was stimmt

**Beobachtet** — alle Zahlen des Briefings decken sich mit dem Build:

| Briefing-Angabe | Fundstelle | Ergebnis |
| --- | --- | --- |
| `MAX_CYCLES = 50`, 2000 Stiche | `src/game/constants.js:18` | stimmt |
| 1,75 s je Stich | `BASE_FLIP_MS = 1750`, `constants.js:707` | stimmt |
| Entscheidungsplan 13 Perk · 13 Aufstellung · 13 Architekt · 10 Skill · 1 Legendär | `DECISION_SCHEDULE` ausgewertet | stimmt exakt |
| Legendär in Durchlauf 29 | Index 28 im Plan | stimmt |
| 53 Run-Tracks: 13 calm · 10 mid · 9 hot · 9 overdrive · 12 overdrive+ | `src/ui/music.js` ausgezählt | stimmt exakt |
| Schwellen 3 / 30 / 70 / 90 Mio | `TIER_MIN`, `music.js:89` | stimmt |
| Ruhiger Modus kappt bei `mid` | `CALM_CAP`, `music.js:170` | stimmt |
| 19 Wochen-Modifikatoren | `src/game/weekMods.js` | stimmt |
| Zufalls-Policy Median ≈ 3,5 Mio | `test/sim-balance-guard.test.js` | stimmt (gemessen 3,49 Mio) |

### Korrektur 1 — die „38,2 Mio Solver-Referenz" ist keine

**Beobachtet.** Die Zahl stammt aus `docs/sim-harness-plan.md` §6 und beschreibt dort eine Messung aus
`npm run impact`. Dieses Skript hebt `SIM_PERK_LEGENDARY_BASE` von der Live-Chance **0,03 auf 0,7** an
(`sim/perk-impact.mjs:42`) — legendäre Perks erscheinen dort rund 23× häufiger als im echten Spiel. Der
Wert ist eine Messvorrichtung für Perk-Ablation, **keine Referenz für kompetentes Spiel**.

Das Briefing liest ihn als „Solver-Policy, kompetent" und baut §5 darauf auf. Diese Grundlage trägt nicht.

### Korrektur 2 — die Stufen sind viel weiter weg als angenommen

**Gemessen**, heutiger Build, je 40 Seeds, Verweildauer über den `onTrick`-Hook des Harness:

| Referenz | Median | Bester Lauf | Anteil aller Stiche in `calm` | höchste erreichte Stufe |
| --- | --- | --- | --- | --- |
| Zufalls-Policy (Boden) | 3,49 Mio | — | **91,3 %** | `mid` in 25/40 Läufen |
| UCB + Cross-Run-Gedächtnis + Formations-Solver | 5,19 Mio | — | **83,0 %** | `mid` in 37/40 Läufen |
| Explore-Build + `fixedPolicy` + Formations-Solver | 6,78 Mio | 19,60 Mio | **80,0 %** | `mid` in 37/40 Läufen |

**Keiner** von 120 gemessenen Läufen hat `hot` (30 Mio) erreicht. Der beste Einzellauf lag bei 19,6 Mio,
also bei zwei Dritteln der `hot`-Schwelle.

Daraus folgt eine schärfere Fassung des Problems, als das Briefing es stellt:

- Nicht 40 % des Soundtracks liegen über dem kompetenten Median, sondern **30 von 53 Run-Tracks (57 %)
  wurden in keinem gemessenen Lauf ein einziges Mal angespielt**.
- Die Verteilung ist zusätzlich **umgekehrt proportional zur Verweildauer**: 13 calm-Tracks bespielen
  ~47–53 der ~58 Minuten eines Laufs bei 1×, die 30 Tracks der oberen drei Stufen bespielen null.
- `overdrive+` hat mit 12 Tracks den **größten** Pool und die geringste Erreichbarkeit.

**Wichtige Einschränkung.** Der Harness fährt ohne SP-Baum (`effProfile null` → `treeEff null`,
`reducer.js:225`). Er misst also einen Lauf ohne jede Meta-Progression — näher am ersten Lauf eines neuen
Spielers als an einem Spieler mit vollem Baum. Echte Spieler liegen höher, um wie viel ist **unbekannt**.

**Das ist heute beantwortbar, ohne etwas zu bauen.** Die Telemetrie-Tabelle enthält bereits `score` je
abgeschlossenem Lauf (`docs/telemetry.md`). Eine Perzentil-Abfrage über `outcome = 'completed'` liefert die
echte Spielerverteilung. **Das sollte vor jeder Schwellen-Entscheidung passieren** — siehe Schritt 0 in §5.

### Korrektur 3 — die Übergänge sind nicht „ungefeiert", sie sind aktiv versteckt

**Beobachtet.** Das Briefing sagt, der Stufenwechsel werde „null gefeiert". Der Code geht weiter: er ist
gezielt darauf gebaut, **nicht bemerkt zu werden**.

- Ein Song unter 40 s wird nie angeschnitten — der Wechsel wartet auf das Songende.
- 1,1 s Fade je Halbwelle mit quadratischer Kurve — die weichste Blende, die noch als Wechsel durchgeht.
- Vorladen vor der Blende, damit keine Lücke hörbar wird.

Das ist **lehrbuchgerechtes adaptives Audio-Handwerk** ([Game Developer: Design With Music In
Mind](https://www.gamedeveloper.com/audio/design-with-music-in-mind-a-guide-to-adaptive-audio-for-game-designers)):
Übergänge sollen kitten, nicht auffallen. Genau das ist hier das Problem. Für Immersion ist Unauffälligkeit
richtig; für eine **Belohnung** ist sie der Defekt. Die Politur arbeitet gegen den Zweck.

Praktische Folge: die Feier braucht kein Umschreiben der Blende. Sie braucht ein **zweites, separates
Ereignis** obendrauf (Ansage, Einblendung, Track-Name, Stille davor) — die Blende selbst darf bleiben.

---

## 2 · Recherche

### Musik, die an Leistung koppelt statt an Ort oder Story

**Metal: Hellsinger (2022)** ist der stärkste Vertreter und der lehrreichste
([Game Developer](https://www.gamedeveloper.com/design/shredding-for-satan-how-i-metal-hellsinger-i-designed-fps-harmonies-in-hell),
[Xbox Wire](https://news.xbox.com/en-us/2022/09/07/fuel-the-music-in-metal-hellsinger/)). Fünf
Instrumentierungs-Stufen hängen am Fury-Multiplikator 1→2→4→8→16; erst auf der höchsten Stufe setzt der
**Gesang** ein. Spieler halten den Multiplikator laut Presse ausdrücklich deshalb oben, weil sie den Song
vollständig hören wollen.

Drei Details daran widersprechen der Modellannahme in §5 des Briefings:

1. **Die Stufe ist verlierbar.** Fury fällt, wenn man Fehler macht. Autostichs Score ist monoton — eine
   erreichte Stufe kann nie wieder verloren gehen. Eine Ratsche erzeugt keine Spannung, nur ein einmaliges
   Ereignis. *Das ist der wichtigste strukturelle Unterschied und er ist im Briefing nicht adressiert.*
2. **Die Kopplung ist sichtbar und numerisch.** Der Fury-Zähler steht groß auf dem Bildschirm. Der Spieler
   hört nicht nur, er *liest* die Stufe. Autostich zeigt nichts.
3. **Das Ereignis ist kategorial, nicht graduell.** „Gesang setzt ein" ist ein Zustandswechsel, den man
   nicht überhören kann — kein weicher Übergang.

**Rhythmusspiele gaten Songs hinter *Clear*, nicht hinter Spitzenleistung.** Muse Dash, Cytus II und
verwandte Titel schalten Tracks über Level-Aufstieg, Song-Packs und versteckte Bedingungen frei
([Muse Dash Wiki](https://musedash.fandom.com/wiki/Songs)) — die Freischaltkurve ist breit und früh. Nach
dieser Norm ist Autostichs Verteilung eine Fehlallokation: die teuerste Produktionsmenge liegt hinter der
höchsten Hürde.

**RuneScape trägt das Briefing-Argument nicht so weit wie behauptet.** ~1.400 Tracks sind ein tragendes
Sammelsystem — aber die Freischaltung ist *trivial* (Ort betreten). Die Sammlung trägt, **weil** sie leicht
und sichtbar ist, nicht weil sie schwer ist. Als Argument für leistungsgekoppelte Musik zieht sie nicht;
als Argument für **Sichtbarkeit** zieht sie sehr wohl.

**Sound Shapes (2012)** koppelt Soundtrack-Intensität an Sammelfortschritt — Musik als Belohnungsanzeige
([Wikipedia: Adaptive music](https://en.wikipedia.org/wiki/Adaptive_music)).

**Super Hexagon** schaltet Hyper-Modi (und damit deren Musik) nach 60 s Überleben frei
([Super Hexagon Wiki](https://superhexagon.fandom.com/wiki/Hyper_Mode)) — leistungsgekoppelt, aber die
Schwelle ist *eine*, und sie liegt niedrig genug, dass viele sie nehmen.

**Wo eine Musikstufe erklärtes Ziel ist statt bloßer Effekt:** in Metal: Hellsinger (16× Fury) und in
Tetris Effect (Zone). In beiden Fällen ist das Ziel **kurzfristig und wiederholbar** — mehrmals pro Sitzung
erreichbar, nicht einmal pro Stunde. Ein Spiel, in dem eine Musikstufe ein *Lauf*-Ziel ist, habe ich nicht
gefunden. Das ist eine Chance (eigenständig) und ein Warnsignal (unerprobt) zugleich.

### Wie der Übergang gefeiert wird, wenn er gefeiert wird

Die Handwerksliteratur zielt einheitlich auf **unauffällige** Übergänge (Stinger zum Maskieren,
Layer-Ein-/Ausblenden, „smart transitions"). Wo ein Übergang *gefeiert* wird, passiert das über drei Mittel,
die alle **nicht** in der Musik selbst liegen:

- ein **Bruch** statt einer Blende (Stille, Filter-Sweep, ein einzelner Stinger),
- eine **gleichzeitige visuelle Zustandsänderung** (Tetris Effect: das ganze Bild wechselt),
- ein **auslösender Moment des Spielers** (Tetris Effect Zone: der Spieler drückt den Knopf).

Der dritte Punkt ist der interessanteste für Autostich: **es gibt heute keinen einzigen „jetzt!"-Knopf im
Spiel.** Alles passiert passiv.

### Genre-Stand seit Mitte 2026

**Slay the Spire II** (Early Access seit 5. März 2026, >5,3 Mio Einheiten im ersten Monat) hat das
Freischaltsystem des Vorgängers ersetzt durch die **Timeline**: eine einzige Meta-Progressionsleiste aus
**Epochs**, die über Meilensteine wie *angesammelten Score* oder *Anzahl besiegter Bosse* freigeschaltet
werden und jeweils **einen kleinen Story-Abschnitt plus Artwork plus eine Freischaltung** liefern
([Slay the Spire 2 Wiki: Timeline](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Timeline),
[Wikipedia](https://en.wikipedia.org/wiki/Slay_the_Spire_II)).

**Das widerspricht der Zeile „Narrativer Tropfen — Kosten sehr hoch — zu teuer für Solo" in §6 des
Briefings.** StS2 zeigt die billige Bauform: der Tropfen hängt nicht an Begegnungen oder Figuren, sondern an
**kumulativen Meilensteinen**, und besteht aus einem Absatz Text plus einem Bild. Das ist für einen
Solo-Entwickler mit KI-Bildgenerierung erreichbar. Für Autostich besonders relevant: **kumulativer Score
über alle Läufe** ist eine Metrik, die auch schwache Läufe belohnt — genau die Balatro-Lehre aus §6.

Weitere 2026er-Bewegungen, die die Tabelle nicht kennt: **Monster Train 2** mit *Pyre Hearts*
(Lauf-Vorkonfiguration vor dem Start — verwandt mit Richtung A und B unten), sowie eine Welle von
Genre-Kreuzungen (Deckbuilder × Survivors-like, Poker-Bluff-Deckbuilder *Velato*). Der Befund für Autostich:
**Genre-Kreuzung ist 2026 der Normalfall, nicht das Risiko.** Das stützt die Präferenz „lieber abweichen als
kopieren" ausdrücklich.

---

## 3 · Die Diagnose, geschärft

Die vier Fragen aus §6 des Briefings halte ich für richtig gestellt. Ich ergänze zwei Befunde:

**Fünftens: eine Ratsche erzeugt keine Spannung.** Score ist monoton steigend. Jede Schwelle wird genau
einmal überschritten und nie wieder. Alles, was an den Score gekoppelt wird — Musikstufen eingeschlossen —
erbt diese Eigenschaft: ein Ereignis, danach ein Dauerzustand. Metal: Hellsinger funktioniert, **weil** die
Stufe verlierbar ist. Jede Richtung unten muss beantworten, ob sie die Ratsche akzeptiert oder bricht.

**Sechstens: die Schwellen wurden für ein Spiel gesetzt, das ungefähr fünfmal höher punktet als das heutige.**
Das ist keine Design-, sondern eine Kalibrierfrage — und die billigste Verbesserung im ganzen Dokument.

---

## 4 · Fünf Richtungen

Fünf verschiedene Wetten, nicht eine Empfehlung mit Varianten. Vier davon arbeiten mit dem Soundtrack,
zwei davon machen ihn zum Ziel.

---

### A · „Der Headliner" — der Track wird zum gewählten Laufziel

**Die Wette:** Ein Score ist kein Ziel, ein Songtitel schon. Der Spieler wählt sein Ziel **vor** dem Lauf und
das Ziel hat einen Namen, kein Komma und keine sechs Nullen.

**Mechanik.** Vor dem Lauf wählt man aus der Track-Sammlung einen **Headliner**. Der Headliner bestimmt das
Soll des Laufs: seine Stufenschwelle wird zur Zielmarke. Erreicht man sie, spielt **genau dieser Track**, mit
Ansage, und der Lauf gilt als bestanden. Erreicht man sie nicht, hat man ihn nicht gehört — der Lauf endet
trotzdem, aber ohne Urteil.

Die Endabrechnung sagt dann nicht „14.203.887 Punkte", sondern „*Event Horizon* — nicht erreicht, 19,6 von
30 Mio" oder „*Event Horizon* — erreicht, 4 Durchläufe früher als beim letzten Mal".

**Was es löst.** Beantwortet „Was will ich erreichen?" (benannte Schwelle) und „Wo will ich hin?"
(gezeichnetes Ziel) mit demselben Objekt. Gibt dem Lauf ein Urteil, ohne ihm einen Tod zu geben — das ist
Richtung 1 des Briefings, aber mit einem Ziel, das man **hören** kann statt es zu lesen.

**Eigenständigkeit: hoch.** Ich habe kein Spiel gefunden, in dem man einen Song als Laufziel *auswählt*.
Monster Train 2s *Pyre Hearts* sind die nächste Verwandtschaft, aber die konfigurieren Regeln, kein Ziel.

**Kosten: niedrig bis mittel.** Sammlungszustand („gehört"), Vorlauf-Auswahl, Endabrechnung, ein Ansage-
Ereignis. Keine neue Musik, keine neue Kunst.

**Reibung — was heute dagegenspricht.** Bei den gemessenen Schwellen wäre für die meisten Spieler jeder
Headliner oberhalb `mid` eine garantierte Niederlage. **A funktioniert erst nach Schritt 0.** Zweitens:
50 Durchläufe für ein Ziel, das man schon nach 20 verfehlt hat, sind eine lange Enttäuschung — deshalb
gehört zu A ein sichtbarer Zwischenstand (der Rekord-Geist kann das schon) und die Möglichkeit, den
Headliner **mitten im Lauf herunterzustufen** statt aufzugeben.

**Ruhiger Modus & Stummschaltung.** Sauber lösbar, weil A **Erreichen von Hören trennt**: der Headliner
wird erreicht und freigeschaltet, auch wenn er im ruhigen Modus nicht abgespielt wird. Progression kostet
dann keine Barrierefreiheit. Die Endabrechnung ist Text und Bild — sie funktioniert stumm.

---

### B · „Der Pakt" — Härte als Währung für Musik

**Die Wette:** Die 30 unerreichbaren Tracks werden nicht durch Balancing erreichbar, sondern durch
**selbstgewählte Härte**. Wer sich das Leben schwer macht, hört mehr.

**Mechanik.** Vor dem Lauf stellt man Härte-Modifikatoren ein — **aus dem bereits gebauten Pool der 19
Wochen-Modifikatoren** (`src/game/weekMods.js`). Jeder gewählte Negativ-Modifikator gibt Härtepunkte, und
Härtepunkte **senken die Musikschwellen**. Wer mit „Gegnerkarten +2 Wert" und „nur 12 Baufeld-Zellen"
antritt, hört `overdrive` bei 40 statt bei 70 Mio.

**Was es löst.** Die direkteste Antwort auf das 30-Tracks-Problem, ohne die Balance anzufassen. Macht
gleichzeitig aus der Schwierigkeits-Leiter das, was sie bei Hades ist: **gewählt statt gewürfelt** — das
Briefing nennt das selbst als Lehre, hat es aber nur im Wochenmodus, wo die Modifikatoren zugelost werden.

**Eigenständigkeit: mittel.** Der Pakt-Mechanismus ist Hades. Die Kopplung *Härte → Musik* ist neu.

**Kosten: niedrig.** Der Modifikator-Pool, seine Wirkung und die Seed-Infrastruktur existieren vollständig.
Es fehlt eine Vorlauf-Auswahl und eine Härte→Schwellen-Kurve.

**Reibung.** Härtepunkte und Score sind zwei Achsen, und eine Bestenliste verträgt nur eine. Entweder
bekommt der Pakt eine eigene Wertung (dann ist es ein dritter Modus neben Normal und Woche), oder die
Härtepunkte gehen als Multiplikator in den Score (dann ist die „gesenkte Schwelle" doppelt gezahlt und muss
gegengerechnet werden). **Das ist eine Produktentscheidung, keine technische** — sie gehört dir.

**Ruhiger Modus & Stummschaltung.** B belohnt Härte mit Musik. Für stumme Spieler muss der Pakt zusätzlich
etwas Sichtbares ausschütten (Skin-Fortschritt, DP), sonst ist er für sie leer.

---

### C · „Der Rivale" — die Eskalation wird verlierbar

**Die Wette:** Der eigentliche Defekt ist nicht die Unsichtbarkeit der Stufen, sondern ihre Monotonie
(§3, Fünftens). Ein Gegner, der mitläuft, macht die Ratsche zu einem Rennen.

**Mechanik.** Aus dem anonymen Rekord-Geist wird eine Riege benannter Rivalen mit je eigener
Score-Trajektorie und eigenem Charakter. Der entscheidende Kniff: **die Musikstufe zeigt den Rennstand, nicht
den Score.** Liegst du vorn, eskaliert die Musik. Zieht der Rivale vorbei, **fällt sie zurück** — dieselbe
Blende, andere Richtung. Der Gesang geht aus.

Damit erbt Autostich das Metal-Hellsinger-Prinzip, ohne eine einzige Kampfmechanik zu ändern: die Stufe wird
verlierbar, also spannend, und ein Stufenwechsel wird zu einem Ereignis, das mehrmals pro Lauf passiert
statt einmal.

**Was es löst.** Beantwortet „Wen will ich besiegen?" — die einzige der vier Fragen, auf die es heute gar
keine Antwort gibt. Repariert zusätzlich die spannungslose zweite Laufhälfte: ab Kartenwert 11 ist der
*Stich* determiniert, das *Rennen* aber nicht.

**Eigenständigkeit: hoch.** Musik als Anzeige des Rennstands habe ich in der Recherche nirgends gefunden.

**Kosten: mittel.** Rivalen-Trajektorien lassen sich **aus dem Sim-Harness erzeugen** — er fährt bereits
vollständige Läufe und kann Score-Kurven je Stützstelle ausgeben, genau im Format des Rekord-Geistes. Namen
und Charakter kosten Text (×4 Lokalisierung). Kein neues Artwork nötig, wenn Rivalen über Farbe, Klangprofil
und Kurve auftreten statt über Portraits.

**Reibung.** Eine zurückfallende Musik ist eine **Bestrafung durch Wegnahme** und kann sich mies anfühlen —
das ist der Grund, warum viele Spiele darauf verzichten. Milderung: der Rückfall geht nur eine Stufe tief und
nur, solange man zurückliegt; ein einmal *erstmals* gehörter Track bleibt in der Sammlung freigeschaltet.
Zweitens: der Rivale darf den Lauf nicht entwerten, wenn man weit vorn liegt — dafür braucht es eine
aufsteigende Riege, in der man den nächsten Rivalen wählt (was C an A andockt).

**Kippt das Pitch-Versprechen?** Nein. Man kann weiterhin nicht verlieren — man kann ein *Rennen* verlieren.
Das ist ein hinzugefügtes Urteil, kein hinzugefügter Tod.

---

### D · „Fünf Sätze" — der Umbau

**Die Wette:** 50 Durchläufe am Stück sind die Ursache und nicht das Symptom. Ein Lauf braucht nicht ein
Urteil am Ende, sondern fünf unterwegs.

**Mechanik.** Der Lauf zerfällt in **fünf Sätze à 10 Durchläufe**. Jeder Satz hat eine eigene Score-Schwelle,
und diese Schwellen **sind** die Musikstufen. Satz geschafft: Ansage, Stufenwechsel als Ereignis, ein
Zusatz-Vorteil für den nächsten Satz. Satz verfehlt: kein Tod, aber du bleibst musikalisch, wo du bist, und
der Bonus fällt aus.

Das ändert vier Dinge auf einmal:

- **Urteil.** Fünf Bestanden/Nicht-bestanden statt keinem.
- **Spannung in der zweiten Hälfte.** Die Schwellen wachsen mit; Satz 4 und 5 sind nicht determiniert, auch
  wenn die Stiche es sind.
- **Sitzungslänge.** Ein Satz ist ~3–12 Minuten je Tempo — eine **natürliche Abbruch- und Speicherstelle**.
  Das ist für Browser und Mobil der wichtigste Punkt des ganzen Dokuments: „noch ein Satz" ist eine viel
  kleinere Bitte als „noch ein Lauf".
- **Der Soundtrack bekommt eine Dramaturgie**, statt eine Nebenwirkung zu sein: fünf Stufen, fünf Sätze.
  Das ist kein Zufall, sondern die eigentliche Pointe — die Stufenzahl stimmt bereits.

**Eigenständigkeit: hoch.** „Ein Autobattler in fünf Sätzen, dessen Soundtrack die Aktstruktur ist" ist ein
Satz, den man in einen Store-Text schreiben kann.

**Kosten: hoch.** Der Entscheidungsplan, die Score-Kurve und der Balance-Stand hängen alle an der heutigen
50-Durchlauf-Struktur; die Sim-Guards müssten neu zentriert werden. Das ist der einzige Vorschlag hier, der
echtes Umbauen bedeutet.

**Reibung.** Satz-Schwellen müssen auf eine **superlineare** Score-Kurve gelegt werden — die heutigen
Stufenschwellen sind dafür nicht brauchbar (siehe §1, Korrektur 2). Ohne Schritt 0 ist D nicht kalibrierbar.

**Kippt das Pitch-Versprechen?** **Teilweise, und absichtlich.** Man kann den Lauf weiterhin nicht verlieren,
aber man kann einen Satz verlieren. Das ist ein bewusster Bruch mit „ein Kartenspiel, das man nicht verlieren
kann" — er lohnt sich, weil das Versprechen heute den Preis hat, dass 50 Durchläufe folgenlos sind. Ein
folgenloses Spiel ist entspannt und vergesslich. Fünf kleine Urteile kaufen Erinnerbarkeit für sehr wenig
Härte. **Diese Abwägung ist deine, nicht meine** — ich lege sie ausdrücklich als Produktentscheidung vor.

---

### E · „Die Platte" — nur Anzeige, sonst nichts

**Die Wette:** Es fehlt kein System, es fehlt eine Vitrine. Die billigste Richtung im Dokument.

**Mechanik.** Ein Raster über alle 54 Tracks: Titel, Stufe, gehört/nicht gehört, wann zuerst gehört, in
welchem Lauf. Nicht gehörte Plätze **sichtbar und ausgegraut**, mit ihrer Bedingung im Klartext („ab
30 Mio"). Daneben dasselbe für die Skins: alle Plätze sichtbar, verschlossene mit Klartext-Bedingung —
Richtung 4 des Briefings.

**Was es löst.** Beantwortet „Warum will ich besser werden?" — die leeren Plätze werden sichtbar. Und es
sagt dem Spieler zum ersten Mal überhaupt, **dass die Musik auf ihn reagiert**. Heute erfährt er das nie.

**Eigenständigkeit: niedrig** (Balatro-Joker-Album, Isaac). Aber E ist **Voraussetzung für A** — der
Sammlungszustand „gehört" muss existieren und persistiert werden, bevor man einen Headliner wählen kann.

**Kosten: sehr niedrig.** Ein Schreibvorgang je Track-Start, ein Raster, ein Ort in der Werkstatt.

**Reibung.** E sättigt (das Briefing sagt das selbst richtig): einmal voll, ist es fertig. Allein trägt es
keine Progression — es ist Fundament, nicht Gebäude.

**Ruhiger Modus & Stummschaltung.** E ist die Antwort für stumme Spieler: die Sammlung ist rein visuell und
füllt sich auch, wenn niemand zuhört. Der ruhige Modus deckelt die *Wiedergabe*, nicht die *Freischaltung*
— dieselbe Trennung wie in A.

---

## 5 · Reihenfolge und Abhängigkeiten

**Schritt 0 — messen, bevor irgendetwas gebaut wird.** Perzentil-Abfrage auf `autostich_telemetry`
(`outcome = 'completed'`) für die echte Score-Verteilung, dann die vier Stufenschwellen auf diese Verteilung
neu legen — sinnvollerweise so, dass jede Stufe von einem definierten Anteil der Läufe erreicht wird
(Vorschlag zur Diskussion: `mid` ~70 %, `hot` ~35 %, `overdrive` ~10 %, `overdrive+` ~3 %). **Kosten: eine
Abfrage und vier Zahlen.** Wirkung: 30 stumme Tracks werden hörbar, und alle Richtungen unten werden
überhaupt erst kalibrierbar. Ohne diesen Schritt bauen A, B und D auf Schwellen, die nachweislich falsch
liegen.

Danach:

| Reihenfolge | Was | Warum an dieser Stelle |
| --- | --- | --- |
| 1 | **E · Die Platte** | Sehr billig, sofort spürbar, und liefert den Sammlungszustand, den A braucht. |
| 2 | **A · Der Headliner** | Macht aus der Sammlung ein Ziel. Baut auf E auf. Größter Zugewinn je Aufwand. |
| 3 | **B · Der Pakt** | Nutzt vorhandene Modifikatoren, löst die Erreichbarkeit dauerhaft und dockt an A an (Headliner + Härtegrad = ein Vertrag). |
| 4 | **C · Der Rivale** | Braucht A/B als Kontext, sonst ist der Rivale ein weiterer nackter Zahlenvergleich. |
| 5 | **D · Fünf Sätze** | Der Umbau. Entweder als Nachfolger von 1–4, oder — wenn du nur *eine* große Wette willst — **statt** ihnen, direkt nach Schritt 0. |

**Wenn nur eine Sache gebaut wird:** Schritt 0 plus E. Das kostet am wenigsten und beseitigt den
absurdesten Zustand — 30 fertige, bezahlte Tracks, von denen niemand weiß, dass es sie gibt.

**Wenn eine große Wette gesucht ist:** D, weil es Lauflänge, Urteil, Mobil-Unterbrechbarkeit und die
Verwendung des Soundtracks in einem Zug löst und dem Spiel einen Satz gibt, den kein anderer Autobattler
sagen kann.

---

## 6 · Anhang — Ideen mit Reibung, die ich nicht zu Richtungen ausgebaut habe

Aufgeschrieben, weil eine Idee mit Reibung mehr wert ist als keine.

**Die Karten spielen die Musik (Tetris-Effect-Prinzip).** Jede ausgelöste Formation legt einen Klangbaustein
auf den laufenden Track — die Reihe komponiert mit. *Dagegen:* der Soundtrack liegt als fertig gemischte
`.m4a` vor, nicht als Stems; das bräuchte eine andere Produktion. Und 2000 Stiche sind viele Bausteine —
Ermüdungsrisiko. *Damit es ginge:* nicht je Stich, sondern je **Durchlauf-Abschluss** ein Baustein, und nur
für die Formations-Höhepunkte.

**Der Track als Modifikator.** Der laufende Song verändert die Regeln, solange er läuft („während *Static
Storm* zählen Wechsel-Formationen doppelt"). Sehr eigenständig. *Dagegen:* macht Musik balance-relevant,
kollidiert mit Skip-Knopf, ruhigem Modus und Stummschaltung, und ein stummer Spieler spielt dann ein anderes
Spiel. *Damit es ginge:* die Modifikatoren müssten primär visuell angezeigt werden, mit Musik als Zugabe.

**Das Publikum.** Die Bestenlisten-Namen erscheinen als Publikum, das mit dem Score lauter wird. Löst „Wen
will ich besiegen?" sozial statt kompetitiv, nutzt die vorhandene Supabase-Tabelle. *Dagegen:* Publikums-Audio
ist neue Produktion, und ohne Account-System sind die Namen dünn.

**Der Satz-Knopf (aus D abgeleitet).** Ein einziger Moment im Lauf, in dem der Spieler selbst entscheidet,
*wann* er kassiert — der fehlende „jetzt!"-Knopf aus der Recherche. Er könnte einen Satz vorzeitig
abschließen: früher = weniger Score, aber die nächste Stufe fängt früher an. *Dagegen:* das ist die erste
echte Entscheidung *während* des Kampfes und rührt damit an die Pointe des Pitches („du baust und schaust
dann zu"). *Genau deshalb aufgeschrieben.*

---

## 7 · Was ich nicht entschieden habe

Drei Fragen sind ausdrücklich deine, nicht meine:

1. **Wertung bei B.** Eigener Modus mit eigener Bestenliste, oder Härte als Score-Multiplikator?
2. **Das Pitch-Versprechen bei D.** Fünf kleine Urteile gegen „ein Kartenspiel, das man nicht verlieren kann".
3. **Die Zielquoten in Schritt 0.** Wie viel Prozent der Läufe *sollen* `overdrive+` hören? Das ist eine
   Frage danach, wie sich das Spiel anfühlen soll, und keine, die aus den Daten folgt.

Alles Übrige in diesem Dokument ist Analyse und Vorschlag und bindet nichts.
