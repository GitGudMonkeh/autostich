# Task contract — tut-proberunden

Tier C. Die Proberunden aus dem freigegebenen Entwurf in `#tutorial-sections` bauen.

## Identity

| Field | Value |
| --- | --- |
| **Branch** | `task/tut-proberunden` |
| **Base** | `origin/feature/tutorial-sections` @ `47020403041c97f70022b1a11c7770970e83821c` |
| **Concurrency** | one writer; sequential sessions may continue the task in the same worktree |
| **Worktree** | `C:/Code/Autostich-worktrees/tut-proberunden` |
| **Branch checked out there** | `task/tut-proberunden` |
| **Upstream** | none — the branch deliberately does not track its base |
| **Owner** | TODO — see `AGENTS.md`, *Roles and source of truth* |
| **Integrator** | TODO — see `AGENTS.md`, *Roles and source of truth* |

## Preview

| Field | Value |
| --- | --- |
| **Preview port** | `5198` |
| **Preview URL** | `http://localhost:5198/` |
| **Server invocation** | `npm run dev -- --port 5198 --strictPort` |

Ports 5180–5197 sind belegt. **5186 ist von `icon-position-review` gepinnt, dessen Contract auf
jenem Branch liegt und für einen Cockpit-Grep unsichtbar ist** — siehe
`docs/workstreams/mobile-icons/mobile-tile-design/findings.md`.

## Scope

Die zehn Sektionen mit **42 Lektionen** aus dem freigegebenen Entwurf ersetzen die heutigen sechs
Sektionen mit 34 Textlektionen. (41 bei Freigabe; „Zwei Builds“ wurde auf Owner-Entscheid geteilt,
siehe *Definition of done*.) Betroffen sind:

- `src/ui/tutorial-sections/catalog.js` — die Sektions- und Lektionsliste
- `src/ui/tutorial-sections/beats.jsx` — die interaktiven Bausteine
- `src/ui/tutorial-sections/TutorialSections.jsx` — die Schale
- `src/i18n/de.js` und `src/i18n/en.js` — die Texte, in beiden Sprachen
- `test/tutorial-sections.test.js` — die Wächter, siehe **Bekannte Gefahren**

Der Entwurf liegt als Artefakt und als Spezifikation vor (siehe **Task-spezifische Eingaben**).
Jede Zahl darin ist gegen das echte Modul geprüft.

## Non-goals

- **Kein Eingriff in `src/game/**`.** Alle Zahlen kommen aus den bestehenden Modulen; der Entwurf
  hat sie gelesen, nie geändert. Siehe **Tripwire**.
- **Keine neue Mechanik.** Die Lektionen erklären, was das Spiel tut; sie ändern nichts daran.
- **Keine Textpflege außerhalb des Tutorials.** Die 18 Sprachbefunde im übrigen Katalog gehören in
  einen eigenen Task (`text-sprachpass`), nicht hierher.
- **Kein Desktop-Pass.** Die Schale erbt ihn, wenn er kommt.

## Tripwire

**Berührt ein Diff `src/game/**`, außer um zu lesen — anhalten.** Der ganze Entwurf ist darauf
gebaut, dass die Spiellogik unverändert bleibt.

**Zweiter Tripwire:** definiert eine Lektion einen Begriff neu, den das Glossar bereits führt —
anhalten. Verlinken oder das Glossar ändern, nie danebenschreiben.

## Approved architecture

**Entschieden — Owner wählte Auflösung C, zwei Lektionsarten mit zwei Budgets.** Gebaut in
`ff087c16`, korrigiert in `da842d51`. Vollständig in `docs/design-sprache.md` §11.

| Art | Budget | Was sie ist |
| --- | --- | --- |
| `kurz` (Vorgabe) | 400 px | eine Sache, ein Blick, kein Scrollen |
| `voll` | 960 px | die ganze Lektion, scrollt einmal |

960 px sind eineinhalb Schalenhöhen (638 × 1,5 = 957, aufgerundet) — hergeleitet, nicht an den
Bestand angepasst. *Gemessen* reißen zwei der 41 Lektionen diese Grenze.

**Verworfen:** die Arten an der Beweglichkeit aufzuhängen (`karte`/`runde`, höheres Budget nur mit
Probierfeld). *Gemessen* sind Beweglichkeit und Höhe unkorreliert — die längste Lektion des
Entwurfs ist ein reiner Lesetext, und rund zehn stille Erklärschirme zwischen 539 und 774 px wären
ins 400er Budget gezwungen worden. Details im Commit `da842d51`.

**Was `voll` begrenzt:** die 960er Decke plus die **Umkehrregel** — eine als `voll` geführte
Lektion, die auch in 400 px passt, wird vom Wächter zurückgewiesen.

Vier Takt-Arten kamen hinzu (`merk`, `regeln`, `tabelle`, `liste`), kalibriert am Entwurf und
aufgerundet. Der Entwurf ist nicht der Produktionsbuild; der Nachweis bleibt die V1–V4-Messung.

## Task-specific inputs

| Was | Wo |
| --- | --- |
| Mockup, 41 Lektionen zum Anfassen | https://claude.ai/code/artifact/c942260a-a988-4f94-a39b-20a0416622e0 |
| Spezifikation, 18 Abschnitte | https://claude.ai/code/artifact/9fa0def7-339f-4d0f-95ef-aa2af2d81209 |
| Sprachprüfung | https://claude.ai/code/artifact/6a2322a1-6b71-47e4-8ae8-f1b223638147 |
| Quelldateien | `C:/Users/Monkeh/AppData/Local/Temp/claude/C--Code/820bd3a2-14c3-4b71-8e51-a3c309a6778c/scratchpad/` |

Die Spezifikation nennt zu jeder Lektion die Codestelle, aus der ihre Zahlen stammen. Sie ist die
Vorlage; das Mockup zeigt, wie es sich anfühlt.

Die Prüfskripte des Entwurfs (`check25.mjs` bis `check28.mjs`) rechnen die angezeigten Werte live
gegen `architect.js`, `formations.js`, `glacier.js` und `progression.js` nach. Sie sind die Vorlage
für die Wächter dieses Tasks.

## Acceptance gate

- `npm test` grün, einschließlich der umgebauten Wächter in `test/tutorial-sections.test.js`
- `npm run lint` grün
- **Sprachgate:** `node scripts/text-voice-check.mjs` grün, und die neuen Texte verstoßen gegen
  keine Regel aus `docs/text-style-guide.md`. Der Entwurf ist dagegen geprüft und meldet null.
- **Zahlengate:** jede angezeigte Zahl stammt aus einer Konstante, nicht aus dem Text. Der
  bestehende Wächter „kein Lektionstext nennt eine Zahl direkt" bleibt in Kraft.
- **Visuelles Gate:** V1–V4 bei 390 × 844 nach `docs/engineering/task-lifecycle.md`.

## Expected file surface

```
src/ui/tutorial-sections/catalog.js
src/ui/tutorial-sections/beats.jsx
src/ui/tutorial-sections/TutorialSections.jsx
src/i18n/de.js
src/i18n/en.js
test/tutorial-sections.test.js
docs/workstreams/tutorial-sections/tut-proberunden/**
```

Alles darüber hinaus ist im Review zu begründen. `src/game/**` erscheint hier nicht.

## Known hazards

**1. Das Höhenbudget — GELÖST, siehe *Approved architecture*.** Der Befund bleibt als Beleg stehen.
`catalog.js` setzt `LESSON_BUDGET_PX = 400` mit dem Vermerk *„die Entscheidung kurz und knackig
(Owner)"*, und `test/tutorial-sections.test.js` erzwingt es. Gemessen am Entwurf, 390 × 844:

| | Wert |
| --- | --- |
| Median der 41 Lektionen | **645 px** |
| über dem Budget von 400 px | **31 von 41** |
| über der Schalen-Decke von 638 px | **21 von 41** |
| Maximum | **1.360 px** |

Der Wächter darf **nicht abgeschwächt** werden, um grün zu werden (`AGENTS.md`). Aufgelöst durch
zwei bewusst gesetzte Budgets; eine Lektion bleibt zu kürzen (*Definition of done*).

**2. Die Drei-Takt-Regel — GELÖST.** Ersetzt durch vier artbewusste Wächter: bekannte Art, genau
ein Tipp am Ende (beide Arten), höchstens ein beweglicher Teil je *kurzer* Lektion, Umkehrregel.

**3. Die Zahlen im Text.** Der Wächter verbietet Ziffern im Lektionstext. Der Entwurf nennt viele
Zahlen; sie stammen alle aus Konstanten und müssen als Platzhalter durchgereicht werden, so wie
`VARS` es heute für sechs Werte tut. Das ist Arbeit, kein Hindernis.

**4. Englisch.** Jeder Schlüssel muss in beiden Katalogen stehen. Der Entwurf ist nur auf Deutsch
geschrieben.

**5. `BoardProbe` zeigt heute Lagen, die es im Spiel nicht gibt** (`beats.jsx:222`): einzellige
Gebäude, während keine Familie `form: "single"` trägt. Der Entwurf ersetzt das durch feste Lagen
aus echten Familien.

**6. `completedStructures(...).length`** in `beats.jsx:233` ist immer `undefined`, weil die Funktion
eine Zahl zurückgibt. Heute folgenlos, aber tot.

## Definition of done

- alle zehn Sektionen mit 42 Lektionen im Katalog, jede mit ihrer `art`
- beide Sprachkataloge vollständig, `npm run loc:export` gelaufen
- alle Wächter grün, einschließlich der beiden Budgets und der Umkehrregel
- ~~die eine Lektion über Budget gekürzt~~ **ERLEDIGT im Entwurf.** „Zwei Builds, die sich selbst
  verstärken“ (Fortgeschritten 3) maß 1.360 px gegen 960. Zur Wahl standen Kürzen auf einen der
  beiden Builds oder Teilen; der Owner hat **geteilt**, weil beide Builds gewollt waren. Aus der
  Lektion wurden „Glut auf Geometrie“ und „Glühende Klinge und Blitz“, *gemessen* **696 px** und
  **784 px**. Fortgeschritten hat damit vier Lektionen, der Entwurf 42.
- V1–V4 bei 390 × 844 gemessen, Belege im Workstream-Ordner

## Open questions

**1. Das Höhenbudget — ENTSCHIEDEN (C).** Steht unter *Approved architecture*. Die drei
Auflösungen, die zur Wahl standen:

- **A — Das Budget fällt.** Die Schale scrollt ohnehin (`tut-scroll`, `overflow-y-auto`). Der
  ursprüngliche Grund war ein Tipp, der hinter dem Fuß verschwand; das war ein Layoutfehler, kein
  Argument gegen Länge. Der Wächter würde stattdessen prüfen, dass der letzte Takt erreichbar ist.
- **B — Der Entwurf wird zerlegt.** 41 Lektionen à 400 px werden rund 90. Das widerspricht dem, was
  in dieser Runde Sektion für Sektion freigegeben wurde.
- **C — Zwei Klassen.** Kurze Textlektionen behalten das Budget; **Proberunden**, auf denen man
  etwas tut, bekommen ein eigenes, höheres. Das trägt den Namen des Entwurfs und die Entscheidung
  *„man spielt statt zu blättern"*, verlangt aber ein zweites, begründetes Budget im Wächter.

**2. Der Erstkontakt.** `StartScreen.jsx:191` zeigt das laute Angebot, solange
`!hadCompletedRun && !tutorialDone`, wobei `tutorialDone` heute „Overlay war offen" heißt. Gewünscht
ist „bis eine Lektion abgeschlossen ist". Die Schale kennt keinen Abschluss, sie zählt
*gemacht = geöffnet*. Vorschlag: `seen.size > 0`. Zu bestätigen.

**3. Die Archetyp-Panels** sollen später wie die Skill-Auswahl je Archetyp eingefärbt werden
(`phaseCard(accent)`, `SkillSelect.jsx:162`). In diesem Task oder im nächsten?

**4. Der Sprachprüfer** (`sprachpruefer.mjs`, `klang.mjs`) liegt im Scratchpad. Gehört er nach
`scripts/`, neben `text-voice-check.mjs`?
