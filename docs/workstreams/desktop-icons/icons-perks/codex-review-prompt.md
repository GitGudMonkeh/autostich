# Codex-Review-Prompt — icons-perks

Der Text unter der Linie geht **unverändert** in eine frische Codex-Session. Er ist bewusst
selbsttragend: er nennt Worktree, Branch und Einstiegsdokumente, damit die Session nichts raten muss.

Vorbedingung: der Worker hat abgeschlossen, die Arbeit liegt im Worktree. **Ein Schreiber pro
Worktree** — es darf keine Claude-Session mehr in `C:/Code/Autostich-worktrees/icons-perks` schreiben,
solange Codex dort liest.

---

Du reviewst den Tier-C-Task „icons-perks" im Workstream „Desktop-Icons" (Autostich).
Du bist **unabhängiger Reviewer** — du liest, prüfst und schreibst Befunde. Du implementierst nicht,
du reparierst nicht, du committest nicht (`AGENTS.md` — *Roles and source of truth*).

Worktree: `C:/Code/Autostich-worktrees/icons-perks`, Branch `task/icons-perks`.
Basis: `origin/feature/desktop-icons` @ `3013881f723080753b8829feea4b051356f0cae0`.
Die Arbeit ist **nicht committet** — der Diff ist der Arbeitsbaum gegen `HEAD` plus die untracked
Dateien. `git status --short` zeigt beides.

Lies zuerst `AGENTS.md`, dann in dieser Reihenfolge:

1. `docs/workstreams/desktop-icons/icons-perks/task-contract.md` — die bindende Scope-Vorgabe
2. `docs/workstreams/desktop-icons/icons-perks/review-handoff.md` — Einstieg, Lesereihenfolge, offene Fragen
3. `docs/workstreams/desktop-icons/icons-perks/evidence-package.md` — was gelaufen ist und was nicht
4. `docs/workstreams/desktop-icons/icons-perks/visual-review.md` — V1–V4, Befund-IDs

Der Worker hat drei Dinge selbst als prüfungsbedürftig markiert. Nimm sie als Startpunkt, nicht als
Grenze:

- **Die Zonenbreite 265 px.** Der Task hat sie zuerst als 270 gemessen (die Kachel statt des Bildes
  darin) und beide Lose falsch gebacken, bevor es auffiel. Prüfe die korrigierte Zahl selbst gegen
  die laufende Anwendung, nicht gegen das Dokument.
- **Der abweichende Anker der legendären Embleme** (`.pk-strip-mid`, `object-position: center
  center`). Begründet als „dieselbe Regel auf ein Los, für das ihre Prämisse nicht gilt". Beurteile,
  ob das die Regel anwendet oder sie überschreibt.
- **Die geänderte Angleich-Statistik** für das Legendär-Los (Gesamtlicht statt Leuchtfläche).
  Konsequenz: die zwei Perk-Lose sind jetzt nach zwei verschiedenen Statistiken angeglichen.

Worauf ich besonders Wert lege:

- **Der Tripwire des Kontrakts.** Er verbietet eine vom Skill-Los ABGESCHRIEBENE Zonenbreite. Der
  Task ist einmal aus einer anderen Richtung hineingelaufen — gemessen, aber an der falschen Box.
  Suche weitere Zahlen dieser Sorte im Diff.
- **Die Wächter.** `test/perk-art.test.js` hat 32 Aussagen; elf Nähte sind laut Evidence-Package
  gegengeprüft. Prüfe stichprobenartig nach, indem du selbst eine Naht brichst — und prüfe, ob
  Wächter fehlen, die es geben müsste.
- **Kein bestehender Test wurde geschwächt.** Verifiziere das gegen `HEAD`.
- **Die Nicht-Ziele.** `SkillSelect.jsx`, `LegendarySelect.jsx`, `skillArt.js`, `docs/art/skills/**`,
  `src/assets/skills/**`, `docs/art/corners/**` dürfen unberührt sein. Ebenso `AGENTS.md`,
  `CLAUDE.md`, `docs/engineering/**`, `docs/decisions/**`.
- **Die Skill-Lose müssen byte-identisch sein.** Der Task behauptet das; rechne es nach
  (`python3 scripts/skill-art-build.py`, dann `git status src/assets/skills`).
- **Die Handoff-Geometrie für `icons-corners`.** Sie ist der Zweck der Reihenfolge der beiden Tasks.
  Prüfe sie gegen `visual/V2-measurements.json`, nicht gegen die Prosa.

Bekannter Zustand, den du treffen wirst und der **nicht** von diesem Task kommt:
`test/i18n-guards.test.js` › „jeder Katalog-Schlüssel wird auch irgendwo benutzt" läuft im
Voll-Suite-Lauf in einen 5000-ms-**Timeout** (keine fehlgeschlagene Zusage). Bei `HEAD` fällt er
ebenfalls um, allein gelaufen braucht er 2050 ms. Evidence-Package §5 hat die Messreihe. Wenn du
diese Einordnung für falsch hältst, sag es — sie ist eine Behauptung des Workers.

Was dieser Task NICHT abdeckt und wo du nicht Fehlendes suchen musst: V3 (das menschliche Sicht-Gate)
ist offen und gehört dem Eigentümer; Linux wurde nicht gefahren; 25 der 28 Embleme wurden nie in der
laufenden Anwendung gesehen, nur als Datei, Bindung und in der echten Streifen-Geometrie. Alles drei
steht als Grenze im Evidence-Package, nicht als Versehen.

Liefere Befunde mit Schweregrad und Fundstelle. Wo du etwas nicht entscheiden kannst, schreib das
hin, statt es zu glätten. Ein Review ohne Befunde ist ein Review, das nicht genau genug hingesehen
hat — aber erfinde auch keine.
