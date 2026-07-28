-- #169 FB-8 — Leaderboard-Detailansicht: Zusatzspalten für den Run-Rückblick.
--
-- Auf Supabase ausführen (SQL Editor). ADDITIV & NULLABLE → bestehende Inserts/Selects bleiben gültig,
-- Alt-Einträge behalten NULL. Der Client-Code degradiert VOR dieser Migration sauber über die
-- Fallback-Kaskade in src/game/leaderboard.js (COLS_FULL → COLS_ARCH → COLS_BASE), d. h. die
-- Deploy-Reihenfolge (Code vs. Schema) ist egal — die Migration kann jederzeit nachgezogen werden.
--
-- perks/skills werden als kompakte ID-Liste gespeichert (Komma-getrennt, wie die bestehende
-- `archetypes`-Spalte), z. B. "L4,B_COUNTER" bzw. "SK_FIRE_01,SK_ICE_02".

alter table public.autostich_scores
  add column if not exists best_streak       integer,
  add column if not exists perks             text,
  add column if not exists skills            text,
  add column if not exists max_formations    integer,
  add column if not exists formation_score   bigint,
  add column if not exists crits             integer,
  add column if not exists wins              integer,
  add column if not exists crit_bonus_score  bigint,
  add column if not exists best_trick_score  bigint;

-- Hinweis RLS: Die bestehende anon-INSERT-Policy muss die neuen Spalten mit abdecken. Ist sie als
-- `with check (true)` (ohne Spalten-Whitelist) definiert — der übliche Fall für ein offenes Board —
-- funktionieren die Inserts inkl. der neuen Spalten sofort. Falls Inserts nach der Migration mit 400/403
-- brechen, die INSERT-Policy prüfen. (Der Client fängt Fehler ohnehin ab: publishRun strippt bei 400
-- zuerst die FB-8-Spalten, dann `archetypes`.)
