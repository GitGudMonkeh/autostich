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
--   COLS_FULL = name,score,level,tricks,cycles,archetypes,<FB-8>,created_at
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
  best_trick_score  bigint
);

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
