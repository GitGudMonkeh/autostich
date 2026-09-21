# Rechenfuchs

Private Mathe-Übungs-App für die 3. Klasse (Bayern, LehrplanPLUS). Statische Web-App aus
HTML, CSS und JavaScript – kein Build, kein Framework, keine Abhängigkeiten, kein Backend,
kein Login, keine Werbung, kein Tracking. Gedacht für Safari auf dem iPad im Heim-WLAN.

- `DESIGN.md` – das Design-Dokument (Ziele, Lehrplan, Kapitel, Roadmap)
- `PLAN.md` – Vorgehen, Ordnerstruktur, localStorage-Schema, offene Fragen

Stand: Prototyp mit zwei Unterkapiteln (Addieren und Subtrahieren bis 1000), Runden mit
8 generierten Aufgaben, erklärendem Feedback, Wohlfühl-Punkten und einem Fuchs, der alle
10 Punkte ein Accessoire bekommt.

## Lokal starten

Node 20 oder neuer reicht, installiert werden muss nichts:

```bash
npm start
```

Dann <http://localhost:8000/> öffnen. Alternativ jeder andere statische Server im
Projektordner, zum Beispiel `python3 -m http.server 8000`. Ein Doppelklick auf `index.html`
genügt nicht, weil ES-Module nicht über `file://` laufen.

## Tests

```bash
npm test
```

Nutzt den eingebauten Test-Runner von Node (`node --test`). Geprüft werden Generatoren
(Lösung, Zahlenraum, Übertrag-Steuerung, Rundenaufbau), Speicher-Schema, Belohnungsregeln,
UI-Texte und dass alle Dateiverweise stimmen.

## Auf GitHub Pages veröffentlichen

1. Repository auf GitHub anlegen und diesen Ordner als Inhalt pushen (Branch `main`).
2. Auf GitHub: **Settings → Pages → Build and deployment → Source: „Deploy from a branch"**,
   Branch `main`, Ordner `/ (root)`, speichern.
3. Nach ein bis zwei Minuten läuft die App unter `https://<benutzername>.github.io/<repo>/`.

Hinweise:

- GitHub Pages aus einem **privaten** Repository gibt es nur mit einem bezahlten Plan. Mit dem
  kostenlosen Plan muss das Repository öffentlich sein. Die Seite ist dann erreichbar, aber
  nirgends verlinkt – ein unauffälliger Repo-Name hilft (siehe `DESIGN.md`, Zugriff & Privatsphäre).
- Die Datei `.nojekyll` sorgt dafür, dass GitHub Pages die Dateien unverändert ausliefert.
- Alle Pfade sind relativ; die App läuft unter jedem Unterpfad.

## Auf dem iPad

Seite in Safari öffnen → Teilen-Symbol → **„Zum Home-Bildschirm"**. Die App startet dann
ohne Browserleiste im Vollbild; das Icon liegt in `icon/`. Der Fortschritt bleibt lokal im
Browser des iPads (localStorage) und verlässt das Gerät nicht.

Fortschritt zurücksetzen: in Safari die Website-Daten der Seite löschen, oder in der
Browser-Konsole `localStorage.removeItem('rechenfuchs.fortschritt')`.

## Ein neues Unterkapitel ergänzen

1. Generator unter `aufgaben/kapitel-N/` anlegen (Vorlage: `aufgaben/kapitel-1/addieren-bis-1000.js`).
   Er exportiert `{ id, op, stufen, erzeuge(rng, stufe) }` und liefert Aufgaben mit
   `anzeige`, `loesung`, `rechenweg`.
2. In `aufgaben/generatoren.js` importieren und in die Liste aufnehmen.
3. In `aufgaben/kapitel.js` einen Knoten mit `id`, `titel`, `beispiel`, `generator` eintragen.
4. `npm test` – der Kapitelbaum-Test prüft, dass alles zusammenpasst.

Stellschrauben (Rundenlänge, Punkte, Schwellen, Stufen-Mix) stehen in `regeln.js`, alle
Texte in `ui/texte.js`.
