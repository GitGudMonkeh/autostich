# PLAN.md – Prototyp „Rechenfuchs"

Stand: 2026-09-21. „Rechenfuchs" ist ein Arbeitstitel (Ordner-/Repo-Name, App-Titel) und frei
änderbar. Grundlage ist `DESIGN.md`; dieser Plan beschreibt nur den ersten, bewusst kleinen Prototyp.

## Ziel dieses Schritts

Zwei Unterkapitel aus Kapitel 1 – „Addieren bis 1000" und „Subtrahieren bis 1000" – mit dem
kompletten Übungs-Loop: Startseite → Runde mit 8 generierten Aufgaben → Ergebnis-Screen, dazu
Wohlfühl-Punkte und ein Platzhalter-Fuchs, der bei 10 Punkten ein Accessoire bekommt.

Reines HTML/CSS/JavaScript (ES-Module), kein Build, kein Framework, keine Abhängigkeiten. GitHub
Pages kann den Ordner direkt ausliefern.

## Vorgehen

1. `PLAN.md` und `DESIGN.md` ablegen (erster Commit).
2. Aufgaben-Schicht: Zufall, Generatoren, Kapitelbaum – reine Logik ohne DOM, in Node testbar.
3. Fortschritt: localStorage-Schema v1 (unten), Laden/Speichern mit Fallback, Belohnungsregeln.
4. Oberfläche: `index.html`, `style.css`, `app.js` mit drei Screens, Ziffernblock, Feedback.
5. Tests mit dem eingebauten `node --test` (keine Abhängigkeit) plus ein Browser-Durchlauf im
   iPad-Format (Quer- und Hochformat) als Screenshot-Nachweis.
6. `README.md`: lokal starten, auf GitHub Pages veröffentlichen, neues Unterkapitel ergänzen.

## Ordnerstruktur

```text
index.html                  Einstieg, drei Screens als <section>
style.css                   Querformat-first, große Touch-Ziele (≥ 44 pt, Ziffern 64 pt)
app.js                      UI-Logik: Screens, Rundenablauf, Ereignisse
regeln.js                   Alle Stellschrauben an einem Ort (Rundenlänge, Stufen-Mix, Punkte, Schwellen)
aufgaben/
  zufall.js                 Zufallsquelle, optional mit Seed (reproduzierbare Tests)
  kopfrechnen.js            Gemeinsame Bausteine für +/−: Zahlformen, Übertrag, Rechenweg, Hinweise
  generatoren.js            Registry der Generatoren, erzeugeAufgabe / erzeugeRunde
  kapitel.js                Lehrplan-Baum: Kapitel → Abschnitt → Unterkapitel → Generator-ID
  kapitel-1/
    addieren-bis-1000.js    Stufen-Parameter für Addition
    subtrahieren-bis-1000.js
fortschritt/
  speicher.js               localStorage-Schema, Laden/Speichern/Migration, Verbuchen
  belohnung.js              Punkte → Accessoires
ui/
  texte.js                  Alle UI-Texte (deutsch, ermutigend) an einem Ort
  fuchs.js                  SVG-Fuchs mit zuschaltbaren Accessoires
  ziffernblock.js           Ziffernblock-Komponente
icon/                       Favicon und Home-Bildschirm-Icon (aus dem Fuchs-SVG erzeugt)
scripts/                    Kleine Helfer ohne Abhängigkeiten (lokaler Server, Icon-Export)
test/                       node --test
```

Ein neues Unterkapitel braucht: eine Datei unter `aufgaben/kapitel-N/`, einen Eintrag in der
Registry (`generatoren.js`) und einen Knoten in `kapitel.js`. Die UI liest nur den Baum.

## Fachliche Vorschläge (änderbar – Owner-Entscheidungen, siehe offene Fragen)

- **Aufgabenform:** Die Generatoren arbeiten mit „Zahlformen" (`HZ0` = Hunderter + Zehner,
  `HZE` = beliebig dreistellig, `Z0`, `E`, …), so wie Übungshefte Aufgabentypen staffeln
  (320 + 450, 356 + 40, 356 + 8, 356 + 237).
- **Stufen** leicht/mittel/schwer je Generator: leicht = Zehnerzahlen ohne Übertrag, mittel =
  gemischte Formen mit Übertrag in etwa jeder zweiten Aufgabe, schwer = beliebige dreistellige
  Zahlen, Übertrag überwiegend. Der Übertrag wird über eine Wahrscheinlichkeit gesteuert
  (`uebertrag: 0 … 1`).
- **Stufe pro Unterkapitel:** startet bei 1. Runde auf Stufe 1 = nur leicht, Stufe 2 = leicht +
  mittel gemischt, Stufe 3 = mittel + schwer gemischt. Aufstieg nach einer Runde mit mindestens
  7 von 8. Kein Abstieg (Fortschritt ist nur positiv). Noch nicht adaptiv im Sinne von DESIGN.md.
- **Feedback:** Richtig → kurzes Lob, nach gut einer Sekunde geht es automatisch weiter. Nicht
  richtig → Lösung, Rechenweg in Schritten (320 + 400 = 720, 720 + 50 = 770) und, wo erkennbar,
  ein Hinweis (Plus/Minus verwechselt, nur eine Stelle daneben, bei einem Zwischenschritt
  stehengeblieben). Weiter per Tipp, kein Zeitdruck. Kein Zweitversuch in diesem Prototyp.
- **Punkte:** 1 Wohlfühl-Punkt pro richtiger Antwort, sofort gespeichert. Alle 10 Punkte ein
  Accessoire (Halstuch, Mütze, Brille, Blume). Gefeiert wird auf dem Ergebnis-Screen; ab dann
  trägt der Fuchs es überall. Nichts verfällt, nichts wird abgezogen.
- **Eingabe:** eigener Ziffernblock statt iPad-Tastatur (die nimmt im Querformat den halben
  Bildschirm). Hardware-Tastatur funktioniert zusätzlich (Ziffern, Rücktaste, Enter).

## localStorage-Schema (Version 1)

Ein Schlüssel, ein JSON-Objekt: `rechenfuchs.fortschritt`

```json
{
  "version": 1,
  "erstellt": "2026-09-21T10:00:00.000Z",
  "aktualisiert": "2026-09-21T10:12:34.000Z",
  "punkte": 23,
  "freigeschaltet": ["halstuch", "muetze"],
  "unterkapitel": {
    "k1-addieren-bis-1000": {
      "stufe": 2,
      "runden": 3,
      "aufgaben": 24,
      "richtig": 20,
      "letzteRunde": { "richtig": 7, "von": 8, "am": "2026-09-21T10:12:34.000Z" }
    }
  }
}
```

- `version` erlaubt spätere Migrationen (`fortschritt/speicher.js`, Funktion `migriere`).
- `freigeschaltet` wird explizit gespeichert, nicht nur aus `punkte` abgeleitet: Wenn sich die
  Schwellen später ändern, verliert das Kind nichts.
- Unbekannte oder kaputte Daten führen zu einem frischen Stand, nie zu einem Absturz. Ist
  localStorage nicht verfügbar (privater Modus), läuft die App im Arbeitsspeicher weiter.
- Kein Login, keine Übertragung: alles bleibt im Browser des iPads.

## Nicht Teil dieses Prototyps

Diagnose-Einstieg, „Kannst du das?", Elternbereich/PIN, Sprachausgabe, Service Worker/Offline,
Zugangscode auf der Startseite, weitere Unterkapitel, Probe-Modus.

## Offene Fragen an den Owner

1. Repo-Name und Sichtbarkeit. GitHub Pages veröffentlicht aus einem privaten Repo nur mit
   einem bezahlten Plan; sonst muss das Repo öffentlich sein (URL ist dann erreichbar, aber nicht
   verlinkt – siehe DESIGN.md, Zugriff & Privatsphäre).
2. Ist „automatisch weiter" nach einer richtigen Antwort gewünscht, oder lieber immer ein Tipp?
3. Zweitversuch bei falscher Antwort (ohne Punkt) – ja oder nein?
4. Reicht der Aufstieg der Stufe nach 7 von 8, oder soll das Kind die Stufe selbst wählen können?
