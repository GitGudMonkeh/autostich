-- ============================================================
-- AUTOSTICH — FEEDBACK-MELDER (#396)
--
-- Eine Tabelle für Bug-/Ideen-Meldungen aus dem Spiel. Der Client fügt EIN (per PostgREST,
-- wie das Leaderboard seit #14); gelesen wird ausschließlich im Supabase-Dashboard.
--
-- Idempotent: mehrfaches Ausführen ist unschädlich (create if not exists / drop policy if exists).
-- Im Dashboard unter SQL Editor einfügen und ausführen.
--
-- ⚠ ALLE Textspalten sind `text`, NIE `varchar(N)`. Genau das war der #197-Übeltäter: eine
--   Längenbegrenzung beantwortet PostgREST mit 400, und der Client degradiert dann still auf eine
--   kleinere Spaltenmenge — der Datenverlust fällt erst Wochen später auf.
-- ============================================================

create table if not exists public.autostich_reports (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text not null,        -- bug | idea | balance | other
  message     text not null,
  name        text,
  version     text,                 -- „v0.4.412 · pixi · a1b2c3d"
  build_env   text,                 -- pixi | test | balancing | main | dev
  seed        bigint,
  cycle       integer,
  score       bigint,
  deck        text,
  battlefield text,
  ua          text,
  viewport    text,                 -- „1920x1080"
  errors      text,                 -- letzte JS-Fehler aus dem Ring-Puffer, eine Zeile je Fehler
  status      text default 'neu'    -- neu | gesehen | erledigt | müll (Handpflege im Dashboard)
);

-- Nach Eingang sortiert durchsehen ist der einzige Lesezugriff, den es gibt (im Dashboard).
create index if not exists autostich_reports_created_idx on public.autostich_reports (created_at desc);

alter table public.autostich_reports enable row level security;

-- anon darf NUR einfügen. Bewusst KEINE select-Policy: ohne sie liefert ein select mit dem
-- öffentlichen Schlüssel nichts zurück — niemand kann fremde Reports lesen. Der Publishable Key
-- steht im Bundle, jeder kann also Zeilen einfügen; der Schaden wäre Müll in einer Tabelle, den ein
-- `delete` wegräumt. Genau das ist der Unterschied zu einem offenen Discord-Webhook, aus dem man
-- nicht nur posten, sondern auch @everyone auslösen könnte.
drop policy if exists "anon can insert reports" on public.autostich_reports;
create policy "anon can insert reports" on public.autostich_reports
  for insert to anon with check (true);

-- ------------------------------------------------------------
-- Stufe 3 (Discord-Ping) steht in `docs/autostich-reports-discord.sql` — als ZWEITE Datei, damit
-- diese hier ohne Discord auskommt: die Tabelle ist der Transportweg, der Ping nur Bequemlichkeit.
-- Sie braucht KEINEN neuen Client-Build (der Client weiß von Discord nichts) und fällt der Ping aus,
-- steht der Report trotzdem in der Tabelle.
-- ------------------------------------------------------------
