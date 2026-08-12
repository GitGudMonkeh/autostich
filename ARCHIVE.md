# Autostich — Archiv: Erste spielbare Version

Dieser Branch (`first-version`) konserviert die **früheste in Git erhaltene, spielbare
Version von Autostich** — als Erinnerung, wie das Spiel am Anfang mal aussah.

## Stand

- **Commit:** `7a464d0` (25.07.2026) — der gemeinsame Ursprung aller Branches
  (main, Autostich_Test, Autostich/pixi, balancing zweigen erst danach ab).
- **Version:** `0.1.0` — „Roguelite-Autobattler-Stechspiel (Prototyp, Vite + React)".

> Hinweis: Die echte *allererste* Prototyp-Fassung (aus der Zeit vor Issue #133)
> liegt **nicht** in diesem Repo — die Git-Historie beginnt erst am 25.07.2026.
> Dies hier ist der früheste Stand, den Git bewahrt.

## Deployment

Ein eigener Workflow (`.github/workflows/deploy-first.yml`) baut diesen Branch als
Archiv-Seite unter **`/autostich/first-version/`** — getrennt von der Hauptseite
(`/autostich/`) und der Testseite (`/autostich/test/`).

Als **Preview/Archiv-Build** (`VITE_PREVIEW=1`):
- schreibt **nichts** in die echte globale Bestenliste (Supabase),
- nutzt einen eigenen `preview_`-localStorage-Namespace,
- zeigt oben links den Marker **„ERSTE VERSION"**.

## Einzige Abweichung vom Original-Snapshot

Bis auf den Marker-Text (früher `TESTBRANCH` → jetzt `ERSTE VERSION`, damit die
Archiv-Seite nicht mit der Testseite verwechselt wird) und diese Datei plus den
Deploy-Workflow ist der Spiel-Code exakt der Stand von `7a464d0`.
