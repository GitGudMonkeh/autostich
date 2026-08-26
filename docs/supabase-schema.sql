-- ============================================================================
-- Autostich — Supabase-Schema für das globale Leaderboard (dediziertes Projekt).
--
-- Für ein FRISCHES, eigenes Supabase-Projekt gedacht (getrennt von Prototyp 1/
-- TrickLadder). Weil die Tabelle hier von Grund auf mit den RICHTIGEN Spaltentypen
-- gebaut wird, entsteht das #197-Problem (Spalten lehnen echte Werte ab → 400 →
-- FB-8-Detaildaten gehen still verloren) gar nicht erst.
--
-- Ausführen im Supabase-SQL-Editor (Dashboard → SQL Editor → New query → einfügen → Run).
-- Idempotent: mehrfaches Ausführen ist gefahrlos.
--
-- Der Client (src/game/leaderboard.js) erwartet genau diese Spalten:
--   COLS_TREE = <COLS_FULL>,tree_nodes                      (#global, oberste Kaskadenstufe)
--   COLS_FULL = name,score,level,tricks,cycles,archetypes,<FB-8>,seed,board,created_at
--   FB-8      = best_streak,perks,skills,max_formations,formation_score,crits,wins,crit_bonus_score,best_trick_score
-- perks/skills werden als kompakte, komma-getrennte ID-Liste gespeichert (wie archetypes),
-- deshalb text (KEIN varchar(N) — genau das war der #197-Übeltäter).
-- ============================================================================

create table if not exists public.autostich_scores (
  id                bigint generated always as identity primary key,
  created_at        timestamptz not null default now(),
  name              text        not null,
  score             bigint      not null,   -- Scores erreichen zweistellige Millionen → bigint (nicht integer)
  level             integer,                -- = Rundenzahl (Kompatibilität mit der Ur-Tabelle)
  tricks            integer,
  cycles            integer,
  archetypes        text,                   -- #139: komma-getrennte Skill-Archetypen ("fire,fire,ice")
  -- #169 FB-8 — Detailspalten für den Run-Rückblick (alle NULLABLE → Alt-/Teil-Einträge degradieren sauber):
  best_streak       integer,
  perks             text,                   -- komma-getrennte Perk-IDs
  skills            text,                   -- komma-getrennte Skill-IDs
  max_formations    integer,
  formation_score   bigint,
  crits             integer,
  wins              integer,
  crit_bonus_score  bigint,
  best_trick_score  bigint,
  -- #205 Challenger: Lauf-Seed (uint32 → bigint, NULL bei Alt-/seedlosen Läufen). Challenge-Board = dieselbe Tabelle,
  -- Top-3-pro-Seed via `seed = eq.<n> order by score desc`. Erstklassig + indiziert (kein Bolt-on).
  seed              bigint,
  -- §7 (Schritt 6) Getrennte Ranglisten-Boards: 'standard' (feste Baseline) | 'meister' (voller Baum) | NULL (Casual-
  -- Lauf, kein Wettbewerbs-Board). Trennt die Boards: Standard = `board = 'standard'`, Meister = `board = 'meister'`;
  -- Global = `board is null` (#global: NUR Casual-Läufe — Ranked fährt auf fixer Baseline, dort ist der Upgrade-Baum
  -- wirkungslos). (Das alte #217 mastery_grade/deck_snapshot-Master-Board ist entfernt.)
  board             text,
  -- #global: Baumstand, mit dem der Lauf gespielt wurde (wie viele der TOTAL_NODES Upgrade-Knoten der
  -- Spieler besaß). NULLABLE ohne Default — NULL heißt „unbekannt" (Alt-Lauf), nicht „null Knoten".
  tree_nodes        integer
);

-- Falls die Tabelle schon existiert (frühere Version ohne diese Spalten): additiv nachziehen (idempotent).
alter table public.autostich_scores add column if not exists seed bigint;
alter table public.autostich_scores add column if not exists board text;
alter table public.autostich_scores add column if not exists tree_nodes integer;  -- #global (s. docs/global-board-migration.sql)
-- Hinweis: die früheren #217-Spalten mastery_grade (smallint) + deck_snapshot (jsonb) werden nicht mehr genutzt.
-- Auf bestehenden Tabellen bleiben sie (nullable) einfach liegen — kein destruktives DROP nötig. Wer aufräumen will:
--   alter table public.autostich_scores drop column if exists mastery_grade;
--   alter table public.autostich_scores drop column if exists deck_snapshot;

-- Row Level Security: offenes Board → die anon-Rolle (publishable key) darf LESEN und EINFÜGEN,
-- aber NICHT ändern oder löschen (kein update/delete-Policy → per Default verweigert).
alter table public.autostich_scores enable row level security;

drop policy if exists "anon can read scores"   on public.autostich_scores;
create policy "anon can read scores"
  on public.autostich_scores for select
  to anon using (true);

drop policy if exists "anon can insert scores" on public.autostich_scores;
create policy "anon can insert scores"
  on public.autostich_scores for insert
  to anon with check (true);

-- Index für die Bestenlisten-Abfrage: order by score desc, tricks desc, created_at desc + limit N.
create index if not exists autostich_scores_rank_idx
  on public.autostich_scores (score desc, tricks desc, created_at desc);

-- §7 Getrennte Boards: Index für die per-Board-Abfrage (nur getaggte Ranglisten-Läufe; board + score desc).
create index if not exists autostich_scores_board_idx
  on public.autostich_scores (board, score desc)
  where board is not null;

-- #205 Challenger: Index für die Top-3-pro-Seed-Abfrage (seed + score desc).
create index if not exists autostich_scores_seed_idx
  on public.autostich_scores (seed, score desc)
  where seed is not null;

-- #global: Das Global-Board zeigt NUR Casual-Läufe (`board is null`), sortiert wie oben. Partieller Index
-- über genau diese Zeilen → ein Scan bedient Filter UND Sortierung, und er enthält die Ranglisten-Zeilen
-- gar nicht erst. Gleiches Muster wie die beiden Teil-Indizes darüber.
create index if not exists autostich_scores_global_idx
  on public.autostich_scores (score desc, tricks desc, created_at desc)
  where board is null;

-- ============================================================================
-- #health-check S1 (2026-08-27): Missbrauchs-Stopp für die Score-Spalte.
-- KEIN varchar(N)-Muster (#197) — dies ist ein Wertebereichs-Check, 4–5 Größenordnungen über echten
-- Läufen (zweistellige Millionen, s. Spaltenkommentar oben). Ein legitimer Client erreicht ihn nie;
-- ein direkter POST mit 2^63−1 prallt ab, statt jedes Board dauerhaft zu toppen. Vorbild ist der
-- Größen-Check der Telemetrie-Tabelle. Idempotent; im Supabase-SQL-Editor ausführen.
alter table public.autostich_scores drop constraint if exists autostich_scores_score_range;
alter table public.autostich_scores add constraint autostich_scores_score_range
  check (score >= 0 and score <= 1000000000000);
