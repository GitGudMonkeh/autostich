# Design-Dokument: Mathe-Lern-App für die 3. Klasse (Grundschule Bayern)

2026-09-21 · @Someone

## Überblick & Zielsetzung

**Kernidee:** Eine iPad-App, die das Kind (3. Klasse Grundschule Bayern) beim Mathematiklernen begleitet – abgestimmt auf den bayerischen LehrplanPLUS, sodass Übungsinhalte und Schulstoff zusammenpassen.

**Ziele der App:**

- Sicherheit im aktuellen Schulstoff aufbauen (Zahlenraum bis 1000, Grundrechenarten, Geometrie, Größen, Daten/Zufall)
- Eigenständiges, spielerisches Üben ermöglichen, ohne dass ständig ein Elternteil danebensitzen muss
- Lücken früh erkennen (z. B. beim kleinen Einmaleins) und gezielt schließen
- Vorbereitung auf Proben/Schulaufgaben unterstützen
- Freude an Mathematik erhalten statt Leistungsdruck aufzubauen

**Leitprinzipien:**

- Lehrplantreue statt generischem Mathe-Trainer
- Adaptiv: Schwierigkeit passt sich an das Kind an
- Kindgerecht und werbefrei, keine In-App-Käufe, kein Tracking
- Eltern behalten Überblick, ohne dass die App zur Überwachung wird
- Rein private Nutzung für das eigene Kind – keine Veröffentlichung, kein Store-Vertrieb, kein Teilen mit Dritten

## Zielgruppe & Nutzungskontext

**Primäre Nutzerin:** Ein Kind in der 3. Klasse einer bayerischen Grundschule, ca. 8–9 Jahre alt, mit erster Erfahrung im Umgang mit einem iPad.

**Nutzungssituation:**

- Übung zu Hause, freiwillig oder in festen kurzen Einheiten (z. B. 10–15 Minuten)
- Weitgehend eigenständige Bedienung, mit optionaler Sprachausgabe für schwächere Leser
- Gelegentliche gezielte Nutzung kurz vor einer Schulaufgabe zur Wiederholung

**Rahmenbedingungen:**

- Gerät: privates oder Familien-iPad, ggf. mit Bildschirmzeit-Begrenzung (Screen Time)
- Nutzung im eigenen Heim-WLAN vorgesehen (App als Web-App über GitHub Pages); Internet wird zumindest beim ersten Laden benötigt, spätere Offline-Fähigkeit ist als Ausbaustufe vorgesehen
- Ein Elternteil richtet die App ein und schaut gelegentlich in den Elternbereich

## Lehrplan-Grundlage: LehrplanPLUS Bayern, Mathematik 3./4. Jahrgangsstufe

Der bayerische LehrplanPLUS beschreibt die Mathematik-Kompetenzen für die Grundschule nicht separat für Klasse 3 und Klasse 4, sondern gemeinsam als „Fachlehrplan Mathematik 3/4" – die Ziele gelten für den zweijährigen Zeitraum. Für die App-Konzeption heißt das: Sie orientiert sich an der offiziellen Gliederung in vier Lernbereiche, legt den Schwerpunkt im ersten Ausbauschritt aber auf die Inhalte, die laut gängiger Unterrichtspraxis und offizieller bayerischer Lernstandserhebungen typischerweise in der 3. Klasse behandelt werden (u. a. Zahlenraum bis 1000). Eine Erweiterung Richtung Klasse 4 (Zahlenraum bis zur Million) ist als spätere Ausbaustufe vorgesehen (siehe Roadmap).

**Lernbereich 1: Zahlen und Operationen**

- Zahlenraum bis 1000: Aufbau, Stellenwerte (H/Z/E), Zahlenstrahl (inkl. Nachbarzahlen), Zahlen vergleichen, ordnen und runden
- Kopfrechnen: kleines Einmaleins und Einspluseins sicher automatisiert, auf größere Zahlen übertragen (z. B. 6·4=24 → 60·4=240)
- Teiler, Vielfache und Teilbarkeit: Beziehungen zwischen Zahlen erkennen und begründen
- Halbschriftliches Rechnen: Addition, Subtraktion, Multiplikation/Division mit Zehner- und Hunderterzahlen
- Schriftliche Rechenverfahren: Addition und Subtraktion mit und ohne Übertrag, Kontrolle per Rechenprobe/Umkehraufgabe (erste schriftliche Multiplikation meist gegen Ende der 3./Anfang der 4. Klasse)
- Überschlagsrechnen und Plausibilitätsprüfung
- Gängige Übungsformate und Rechenregeln: Rechenmauern, Kettenaufgaben, geschicktes Rechnen (Rechenvorteile, Punkt-vor-Strich)
- Sachaufgaben/Textaufgaben: relevante Informationen entnehmen, passende Rechnung finden, Ergebnis begründen

**Lernbereich 2: Raum und Form**

- Orientierung im Raum, einfache Pläne/Skizzen zeichnen und lesen
- Freihandzeichnen sowie Zeichnen mit Lineal/Geodreieck
- Geometrische Figuren (Rechteck, Quadrat, Dreieck, Kreis), rechter Winkel
- Würfel und Quader: Kanten, Flächen, Netze, Baupläne, Ansichten (Vorderansicht, Seitenansicht, Draufsicht)
- Achsensymmetrie: Symmetrieachsen erkennen und zeichnen, Spiegelbilder
- Geometrische Muster (Parkettierung, Bandornamente)
- Flächen vergrößern und verkleinern, Flächeninhalte einfacher Figuren vergleichen (Auszählen von Einheiten)

**Lernbereich 3: Größen und Messen**

- Längen: mm, cm, m, km – messen, schätzen, umrechnen, auch in Kommaschreibweise (z. B. 2,143 km)
- Gewichte: g, kg
- Hohlmaße: ml, l
- Zeit: Sekunde, Minute, Stunde; Zeitspannen und Uhrzeiten berechnen
- Geld: Euro/Cent in Kommaschreibweise, alle vier Grundrechenarten mit Geldbeträgen (auch schriftlich)
- Größen schätzen anhand von Alltagsbezug; einfache Bruchzahlen im Größenkontext (½, ¼, ¾)

**Lernbereich 4: Daten und Zufall**

- Daten sammeln und in Tabellen und Diagrammen (v. a. Balkendiagramm) darstellen
- Diagramme und Tabellen lesen, Fragen dazu beantworten
- Einfache Zufallsexperimente (Würfel, Glücksrad), Gewinnchancen einschätzen
- Einfache Kombinatorik (z. B. Kombinationsmöglichkeiten von Kleidungsstücken)

**Quelle:** ISB – Staatsinstitut für Schulqualität und Bildungsforschung, LehrplanPLUS Bayern, Fachlehrplan Grundschule Mathematik 3/4 (lehrplanplus.bayern.de); ergänzt um Angaben zur typischen Klasse-3-Progression aus bayerischen Lernstandserhebungen sowie abgeglichen mit dem Inhaltsverzeichnis eines gängigen Übungshefts zur 3. Klasse.

## App-Struktur & Lerninhalte

Die App gliedert sich in fünf Kapitel, die sich eng an der Struktur des tatsächlichen Übungshefts zur 3. Klasse und am LehrplanPLUS orientieren. Für den MVP wird zunächst nur das erste Kapitel (Addieren & Subtrahieren) umgesetzt, um mit überschaubarem Aufwand zu testen, ob Konzept und Gamification ankommen.

### Kapitel 1: Addieren & Subtrahieren (Zahlenraum 1000) — MVP

**Zahlen verstehen**

- Wiederholung: Zahlenraum bis 100
- Zahlen bis 1000 (Stellenwerte H/Z/E)
- Zahlenstrahl
- Nachbarzahlen (Vorgänger/Nachfolger)
- Rechnen rund um Zehner und Hunderter

**Im Kopf rechnen**

- Addieren bis 1000
- Subtrahieren bis 1000
- Addieren von großen Zahlen
- Subtrahieren von großen Zahlen

**Rechenwege zeigen**

- Rechenmauern
- Halbschriftlich addieren
- Halbschriftlich subtrahieren

**Schriftliche Verfahren**

- Schriftlich addieren (inkl. Überschlagen)
- Schriftlich subtrahieren (inkl. Überschlagen und Rechenprobe)

### Kapitel 2: Multiplizieren & Dividieren

**Grundlagen auffrischen**

- Wiederholung: Multiplizieren
- Wiederholung: Dividieren
- Punkt-vor-Strich-Regel

**Mit größeren Zahlen rechnen**

- Multiplizieren mit Zehnerzahlen
- Dividieren durch Zehner- und Einerzahlen
- Kettenaufgaben

**Rechenwege & Strategien**

- Halbschriftlich multiplizieren
- Geschickt rechnen (Rechenvorteile)
- Vielfache, Teiler, Teilbarkeit
- Halbschriftlich dividieren (ohne und mit Rest)

### Kapitel 3: Raum & Form

**Formen & Zeichnen**

- Wahrnehmung
- Freihandzeichnen
- Flächenformen zeichnen (mit Lineal/Geodreieck)
- Muster erkennen und fortsetzen
- Flächen vergrößern und verkleinern

**Körper**

- Körperformen
- Würfelnetze
- Würfelgebäude und Baupläne
- Ansichten (Vorder-, Seiten-, Draufsicht)

**Orientierung & Symmetrie**

- Orientieren auf Plänen
- Skizzen zur Orientierung zeichnen
- Achsensymmetrie

### Kapitel 4: Größen & Messen

**Sachsituationen**

- Frage, Lösung und Antwort
- Angaben prüfen

**Geld**

- Euro und Cent
- Kommaschreibweise
- Rechnen mit Kommazahlen
- Multiplizieren mit Kommazahlen
- Schriftlich addieren mit Kommazahlen
- Schriftlich subtrahieren mit Kommazahlen

**Zeit**

- Minuten und Sekunden
- Zeitspannen
- Üben in Sachsituationen

**Längen & Gewicht**

- Längen – Kommaschreibweise
- Längen – Millimeter
- Gewicht – Kilogramm und Gramm
- Sachsituationen mit Größen

### Kapitel 5: Daten & Zufall

- Daten (Tabellen, Diagramme)
- Zufall und Wahrscheinlichkeit
- Kombinieren

Jedes Kapitel enthält: einen kurzen Diagnose-Einstieg, mehrere Übungsstufen mit steigendem Schwierigkeitsgrad je Unterkapitel, und eine abschließende „Kannst-du-das?"-Kontrolle im Stil einer kleinen Probe. Sachsituationen/Textaufgaben sind nicht isoliert, sondern in die passenden Unterkapitel integriert (zusätzlich zum eigenen Block in Kapitel 4).

## Aufgaben-Design: Kapitel 1 (MVP)

Fast alle Aufgabentypen in Kapitel 1 lassen sich als Generator umsetzen: Die App erzeugt bei jedem Durchgang neue Zahlen nach denselben Regeln (Zahlenraum, Übertrag-Wahrscheinlichkeit, Schwierigkeitsstufe), statt einen festen Aufgabenpool von Hand zu pflegen. Das macht beliebig wiederholbares Üben möglich, ohne dass hunderte Einzelaufgaben vorbereitet werden müssen. Nur wenige Formate (Zahlenstrahl, Rechenmauern) brauchen etwas mehr Logik als reine Zahlengeneratoren, sind aber genauso gut proceduralisierbar.

**Aufbau pro Unterkapitel:**

- Diagnose-Einstieg: 5 Aufgaben (prüft Vorwissen, bestimmt die Startschwierigkeit)
- Übungsrunde: 8 Aufgaben pro Durchgang, beliebig oft wiederholbar – jedes Mal neu generiert
- Abschlusskontrolle „Kannst du das?": 10 Aufgaben im Stil einer Mini-Probe

**Generatoren je Unterkapitel:**

| Unterkapitel | Aufgabentyp | Generator-Parameter | Beispiel |
| --- | --- | --- | --- |
| Wiederholung: ZR 100 | Kopfrechnen +/− | Zahlenraum 0–100, Zehnerübergang zufällig ein/aus | 47 + 8 = ? |
| Zahlen bis 1000 | Zerlegen / Stellenwert benennen / Ziffern↔Wort | Zufallszahl 100–999 | 734 = ? H ? Z ? E |
| Zahlenstrahl | Punkt einordnen oder ablesen | Zufallsintervall (0–100 / 0–1000), Zielzahl zufällig | Wo liegt 650 auf dem Strahl 0–1000? |
| Nachbarzahlen | Vorgänger/Nachfolger, Zehner-/Hundertnachbar | Zufallszahl 1–999 | Nachbarzahlen von 480: ? / ? |
| Rechnen rund um Zehner/Hunderter | Ergänzen zum nächsten Zehner/Hunderter | Zufallszahl, Zielrundung 10 oder 100 | 386 + ? = 400 |
| Addieren bis 1000 | Kopfrechnen + | Summe ≤ 1000, Übertrag steuerbar | 320 + 450 = ? |
| Subtrahieren bis 1000 | Kopfrechnen − | Minuend ≤ 1000 | 780 − 340 = ? |
| Addieren großer Zahlen | Kopfrechnen + (Erweiterung) | Zahlenraum bis 9999 | 2300 + 1500 = ? |
| Subtrahieren großer Zahlen | Kopfrechnen − (Erweiterung) | Zahlenraum bis 9999 | 5600 − 2400 = ? |
| Rechenmauern | Zahlenmauer lösen | 3–4 Grundsteine zufällig, 1–2 Lücken | Grundsteine 120, 85, 60 → Lücken oben |
| Halbschriftlich addieren | Rechenweg + Ergebnis eingeben | Summe ≤ 1000 | 246 + 137 = ? |
| Halbschriftlich subtrahieren | Rechenweg + Ergebnis eingeben | Minuend ≤ 1000 | 512 − 278 = ? |
| Schriftlich addieren | Untereinander rechnen + Überschlag | 2–3 Summanden, 2–4-stellig, Übertrag steuerbar | 456 + 278 = ? (Überschlag: ca. 500+300) |
| Schriftlich subtrahieren | Untereinander rechnen + Rechenprobe | 2–4-stellig | 623 − 347 = ? (Probe: 276+347) |

Jeder Generator nimmt einen Schwierigkeits-Parameter (leicht/mittel/schwer), der Zahlengrenzen bzw. Übertrag-Wahrscheinlichkeit steuert – das ist zugleich die Grundlage für die spätere adaptive Schwierigkeit.

## Funktionsumfang

**Aufgabentypen:**

- Zahleneingabe (kindgerechter Ziffernblock)
- Multiple Choice / Auswahl
- Drag & Drop (Zuordnen, Sortieren, Stellenwerte einsetzen)
- Zeichnen/Antippen (z. B. Symmetrieachse einzeichnen, Punkte auf dem Zahlenstrahl setzen)
- Rechenweg-Notation für halbschriftliches Rechnen (Zwischenschritte statt nur Endergebnis)

**Adaptivität:**

- Schwierigkeit passt sich an Erfolgsquote und Bearbeitungszeit an
- Diagnose-Check zu Beginn jedes Kapitels, um Vorwissen/Lücken zu erkennen
- Wiederholung nach dem Prinzip von Spaced Repetition, vor allem fürs Einmaleins

**Motivation & Feedback:**

- Direktes, erklärendes Feedback bei Fehlern (nicht nur „falsch", sondern warum)
- Fortschrittssystem über ein süßes, animiertes Tier-Maskottchen: abgeschlossene Übungen/Module schalten neue Outfits, Gadgets und Hintergründe für das Tier frei
- Zusätzliche Fortschrittsanzeige pro Modul
- Kein Vergleich mit anderen Kindern, kein künstlicher Zeitdruck

**Prüfungsvorbereitung:**

- Optionaler „Probe-Modus": simuliert eine Schulaufgabe mit Zeitlimit und gemischten Aufgaben

## UX/UI-Konzept

**Gestaltung:**

- Große Touch-Ziele, klare serifenlose Schrift, wenig Fließtext, viel Visualisierung (Stellenwerttafeln, Rechenstrich, Zahlenstrahl als wiederkehrende visuelle Anker)
- Süßes, animiertes Tier als zentrale Identifikationsfigur; eigener „Mein Tier"-Bereich zum Ankleiden und Anschauen der freigeschalteten Outfits, Gadgets und Hintergründe
- Ton: ermutigend, nie bloßstellend; Fehler werden als normaler Teil des Lernens behandelt

**Bedienung:**

- Querformat als Hauptausrichtung (typisch für iPad-Lern-Apps)
- Optionale Sprachausgabe für Aufgabenstellungen (das Kind muss nicht alles fehlerfrei lesen können)
- Apple-Pencil-Unterstützung für handschriftliches Rechnen wäre ein großer Mehrwert (siehe Roadmap), damit Rechenwege wie im Schulheft notiert werden können

**Barrierefreiheit:**

- Ausreichender Kontrast, skalierbare Schrift
- Keine reine Farbkodierung als einziges Signal

**Bewusst weggelassen:**

- Keine Werbung, keine In-App-Käufe, keine Social-Media- oder Chat-Funktionen

## Technische Umsetzung

**Plattform:** Statische Web-App (HTML/CSS/JavaScript), gehostet auf GitHub Pages und im Safari-Browser auf dem iPad genutzt – am einfachsten per „Zum Home-Bildschirm hinzufügen" als App-Icon, sodass sie sich wie eine eigene App anfühlt, ohne über den App Store verteilt werden zu müssen.

**Architektur:**

- Trennung von App-Logik und Lerninhalten: Aufgaben werden größtenteils über parametrisierte Generatoren erzeugt (Regeln als JSON), ergänzt um einzelne handkuratierte Aufgaben (z. B. Sachsituationen); beides unabhängig von der App-Logik erweiterbar
- Fortschritt (inkl. freigeschalteter Tier-Outfits, Gadgets und Hintergründe) wird lokal im Browser gespeichert (localStorage) – kein Backend/Server nötig
- Nutzung im Heim-WLAN vorgesehen; mit einem Service Worker ließe sich die App zusätzlich offline-fähig machen, sodass Internet nur beim ersten Laden nötig ist

**Datenschutz (Kind als Nutzerin):**

- Keine Werbe- oder Tracking-Skripte, keine Analytics
- Kein Login/Account – Fortschritt bleibt ausschließlich lokal auf dem Gerät
- Keine Datenübertragung an Dritte, da rein statisches Hosting ohne Backend

**Zugriff & Privatsphäre:**

- GitHub Pages ist standardmäßig öffentlich erreichbar – auch bei privatem Repository, sofern kein kostenpflichtiger GitHub-Plan mit privaten Pages genutzt wird; die URL ist also technisch von außen aufrufbar, wenn auch nicht auffindbar oder verlinkt
- Für echten Schutz vor Fremdzugriff: eine unauffällige, nicht erratbare URL wählen und/oder einen einfachen Zugangscode auf der Startseite ergänzen

**Entfällt durch den Web-Ansatz:**

- Kein App-Store-Review, kein Apple-Developer-Programm nötig
- Kein natives Screen-Time-/Family-Sharing-Hook – Bildschirmzeit weiterhin über die iPad-Systemeinstellungen regeln
- Apple-Pencil-Eingabe im Browser über Pointer Events grundsätzlich möglich, aber weniger ausgereift als bei einer nativen App

## Fortschritt & Elternbereich

**Elternbereich (PIN-geschützt):**

- Übersicht über bearbeitete Kapitel, Erfolgsquote und investierte Zeit
- Anzeige typischer Fehlerquellen (z. B. „Übertrag bei der schriftlichen Subtraktion" oder „7er-Reihe unsicher")
- Möglichkeit, gezielt Fokus-Themen vor einer Schulaufgabe zu setzen

**Für das Kind selbst:**

- Eigene, einfache Fortschrittsansicht (z. B. Sterne pro Modul), ohne Leistungsdruck oder Vergleich mit anderen

**Bewusst nicht enthalten:**

- Kein Ranking oder Vergleich mit anderen Kindern/Klassen
- Keine automatische Weitergabe von Daten an Dritte oder die Schule

## Content-Erstellung & Qualitätssicherung

**Aufgabenerstellung:**

- Aufgabenpool je Kapitel, mit mehreren Schwierigkeitsstufen pro Kompetenzerwartung aus dem LehrplanPLUS
- Kombination aus manuell erstellten und KI-unterstützt generierten Aufgaben, jeweils mit fachlicher Prüfung vor Aufnahme in die App

**Qualitätssicherung:**

- Abgleich der Aufgabenformate mit echten bayerischen Schulaufgaben/Proben und gängigen Übungsheften zur 3. Klasse
- Testphase mit dem eigenen Kind: beobachten, wo Aufgaben zu leicht, zu schwer oder missverständlich formuliert sind
- Laufende Erweiterung/Korrektur des Aufgabenpools unabhängig von App-Updates (dank Trennung von Inhalt und Logik, siehe technische Umsetzung)

## Roadmap

**Phase 1 – MVP:**

- Kapitel 1 „Addieren & Subtrahieren" vollständig (alle Unterkapitel)
- Feste Schwierigkeitsstufen (noch nicht adaptiv)
- Tier-Maskottchen mit einer ersten kleinen Auswahl an Outfits/Hintergründen als Belohnung, einfacher Elternbereich mit Fortschrittsübersicht
- Als Web-App über GitHub Pages, nutzbar im Heim-WLAN

**Phase 2 – Ausbau:**

- Kapitel 2 „Multiplizieren & Dividieren", Kapitel 3 „Raum & Form", Kapitel 4 „Größen & Messen", Kapitel 5 „Daten & Zufall"
- Adaptive Schwierigkeit und Spaced-Repetition-Wiederholung
- Deutlich mehr Outfits, Gadgets und Hintergründe im Tier-Sammelsystem

**Phase 3 – Vertiefung:**

- Apple-Pencil-Eingabe im Browser (Pointer Events) für handschriftliches Rechnen
- Probe-Modus zur Prüfungssimulation
- Offline-Fähigkeit per Service Worker
- Erweiterung Richtung 4. Klasse (Zahlenraum bis zur Million, vollständige schriftliche Multiplikation/Division)
