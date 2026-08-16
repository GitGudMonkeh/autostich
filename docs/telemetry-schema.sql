-- ============================================================================
-- Autostich — Supabase-Schema für die anonyme Lauf-Telemetrie (Beta-Playtest).
--
-- Ausführen im Supabase-SQL-Editor (Dashboard → SQL Editor → New query → einfügen → Run).
-- Idempotent: mehrfaches Ausführen ist gefahrlos.
--
-- BEWUSST GETRENNT vom Leaderboard (autostich_scores): eine volllaufende oder fehlerhafte Telemetrie
-- darf die Bestenliste niemals beschädigen. Anderes RLS-Profil (siehe unten), anderer Lebenszyklus
-- (Telemetrie ist nach der Beta wegwerfbar, das Board nicht).
--
-- Der Client (src/game/telemetry.js) schreibt genau die Spalten aus buildRunPayload().
-- Einrichtung + Auswertung: docs/telemetry.md
-- ============================================================================

create table if not exists public.autostich_telemetry (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),

  -- Pseudonyme Identität. install_id ist eine lokal gewürfelte UUID (localStorage) — sie verkettet Läufe
  -- DESSELBEN Geräts, sagt aber nichts darüber, WER das ist. Bewusst `text` und nicht `uuid`: der Client
  -- hat einen "anon"-Fallback für Browser ohne crypto.randomUUID, der sonst am Typ scheitern würde.
  install_id    text not null,
  session_id    text,                   -- ein Seitenaufruf → trennt „5 Läufe am Stück" von „5 über die Woche"
  run_id        bigint,                 -- lokale Lauf-ID (Startzeitstempel) → Abbruch- und Abschlusszeile desselben Laufs verknüpfbar

  -- Build-Zuordnung aus dem bestehenden Versions-/Build-Stempel (#250, src/ui/version.js). OHNE DIESE FELDER
  -- IST DER DATENSATZ NACH DEM ERSTEN HOTFIX WERTLOS, weil nicht mehr trennbar ist, welcher Lauf zu welchem
  -- Balancing-Stand gehört. build_env (main|test|pixi|balancing|dev) trennt Beta-Läufe von eigenen Test-Deploys.
  app_version   text not null,          -- "v0.4.007" (CI) bzw. "v0.4·dev" (lokal)
  git_sha       text,
  build_env     text,

  -- 'completed' = Lauf natürlich zu Ende | 'ended' = bewusst beendet/verlassen | 'abandoned' = Tab zu, Lauf lief noch.
  outcome       text not null,

  -- Lauf-Rahmen
  seed          bigint,
  ranked        text,                   -- Ranglisten-Modus (NULL = Casual)
  week_mods     jsonb,                  -- aktive Wochen-Modifikatoren
  cycles        integer,
  tricks        integer,
  score         bigint,                 -- Scores erreichen zweistellige Millionen → bigint
  duration_ms   integer,

  -- Ergebnis-Kennzahlen
  best_streak      integer,
  crits            integer,
  wins             integer,
  max_formations   integer,
  formation_score  bigint,
  crit_bonus_score bigint,
  best_trick_score bigint,
  rerolls_used     integer,

  -- Score-Herkunft je Fraktion/Kanal (Gletscher, Serie, Blitz, Pflanze, Feuer, Formation, Gebäude …)
  channels      jsonb,

  -- Build am Laufende
  perks         jsonb,                  -- ["P_…", …]
  skills        jsonb,                  -- ["SK_…", …]
  archetypes    jsonb,                  -- ["fire","ice", …] (unique)
  family_tiers  jsonb,                  -- { familyId: tier }
  buildings     jsonb,                  -- [{ f: familyId, t: tier, n: Felder }]

  -- HERZSTÜCK: Angebot ↔ Wahl je Entscheidung (siehe src/game/decisionLog.js).
  -- [{ c: Runde, s: Score, k: "perk"|"skill"|"leg"|"arch"|"archUp"|"glacier"|"reroll",
  --    o: [angeboten], p: gewählt|null, r: Reroll-Index, x: ersetzt }]
  -- Erst hierdurch wird „40× angeboten, 3× genommen" sichtbar — die eigentliche Balancing-Währung.
  decisions     jsonb,

  -- Meta-Fortschritt NACH dem Lauf: Upgrade-Baum + Währungen, gekaufte/ausgerüstete Kosmetik.
  tree          jsonb,
  cosmetics     jsonb,

  -- Grober Gerätekontext (UA gekappt, Viewport, CPU/RAM-Klasse, Effekt-Stufe) → erklärt Perf-Meldungen.
  client        jsonb,

  -- Größenbremse: eine einzelne Zeile kann nicht die Tabelle sprengen (Bug, Endlos-Log, manipulierter Client).
  constraint autostich_telemetry_size check (
    coalesce(length(decisions::text), 0) < 200000 and coalesce(length(client::text), 0) < 4000
  )
);

-- Spiegel-Tabelle für den Preview-/Testbranch-Build (VITE_PREVIEW=1). Eigene Tabelle, damit das eigene
-- Testen (Dev-Runs, Voll-Katalog-Angebote, Balance-Experimente) den echten Datensatz nicht verseucht.
create table if not exists public.autostich_telemetry_dev
  (like public.autostich_telemetry including defaults including constraints including identity);

-- ----------------------------------------------------------------------------
-- Row Level Security — bewusst ANDERS als beim Leaderboard:
--   Board:     anon darf lesen + schreiben (die Bestenliste ist ja öffentlich).
--   Telemetrie: anon darf NUR EINFÜGEN. Kein select/update/delete.
-- Damit kann niemand fremde Läufe auslesen, obwohl der publishable Key im Bundle steht. Ausgewertet
-- wird im Dashboard bzw. mit dem service_role-Key (der RLS ohnehin umgeht).
-- ----------------------------------------------------------------------------
alter table public.autostich_telemetry     enable row level security;
alter table public.autostich_telemetry_dev enable row level security;

drop policy if exists "anon can insert telemetry" on public.autostich_telemetry;
create policy "anon can insert telemetry"
  on public.autostich_telemetry for insert
  to anon with check (true);

drop policy if exists "anon can insert telemetry dev" on public.autostich_telemetry_dev;
create policy "anon can insert telemetry dev"
  on public.autostich_telemetry_dev for insert
  to anon with check (true);

-- Indizes für die üblichen Auswertungs-Achsen.
create index if not exists autostich_telemetry_created_idx on public.autostich_telemetry (created_at desc);
create index if not exists autostich_telemetry_build_idx   on public.autostich_telemetry (app_version, build_env);
create index if not exists autostich_telemetry_install_idx on public.autostich_telemetry (install_id, created_at desc);
create index if not exists autostich_telemetry_outcome_idx on public.autostich_telemetry (outcome);


-- ============================================================================
-- DISCORD-BENACHRICHTIGUNG (Supabase → privater Dev-Kanal)
--
-- Der Spiel-Client redet NIE direkt mit Discord — sonst stünde die Webhook-URL im JS-Bundle und jeder
-- könnte den Kanal zuspammen. Stattdessen: Trigger in der Datenbank.
--
-- BEWUSST DIESELBE BAUART WIE docs/autostich-reports-discord.sql (#396): pg_net + Vault, SECURITY
-- DEFINER mit gepinntem search_path, alles in einem EXCEPTION-Block. Zwei Muster für dieselbe Aufgabe
-- driften auseinander; eines reicht. INHALTLICH bleiben die beiden getrennt — der Feedback-Melder
-- transportiert, was Spieler uns melden, hier fließen Balancing-Daten für uns. Eigene Tabelle, eigener
-- Trigger, eigenes Vault-Secret (also auch ein eigener Kanal, wenn gewünscht).
--
-- UNTERSCHIED zum Melder: hier wird GEDROSSELT. Ein Report kommt selten und ist einzeln interessant;
-- Läufe kommen im Dutzend und sind es nicht. Höchstens eine Nachricht je `discord_min_interval_sec`,
-- die dann meldet, wie viele Läufe seit der letzten Meldung eingegangen sind. 0 = jede Zeile meldet.
-- ============================================================================

-- §1 — WEBHOOK-URL IN DEN VAULT (einmalig, von Hand)
--
-- In Discord: Kanal → Bearbeiten → Integrationen → Webhooks → Neuer Webhook → URL kopieren.
-- Die URL gehört NICHT ins Repo und NICHT in eine Klartext-Tabelle: wer sie hat, kann in den Kanal posten.
--
--   select vault.create_secret(
--     'https://discord.com/api/webhooks/DEINE/URL',
--     'discord_telemetry_webhook',
--     'Autostich Telemetrie — Ziel des Lauf-Pings');
--
-- Später ändern (NICHT noch einmal create_secret — das legt einen zweiten Eintrag an):
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'discord_telemetry_webhook'),
--     'https://discord.com/api/webhooks/NEUE/URL');
--
-- Ping abschalten, ohne etwas anderes zu löschen:
--   delete from vault.secrets where name = 'discord_telemetry_webhook';
-- Der Trigger findet dann kein Ziel und lässt die Zeile einfach in Ruhe.

create extension if not exists pg_net;

-- §2 — DROSSEL-ZUSTAND
--
-- Hier steht KEIN Geheimnis mehr (die URL liegt im Vault), nur Betriebszustand: Mindestabstand und
-- Zeitpunkt der letzten Meldung. RLS an und bewusst OHNE Policy → `anon` kommt nicht heran; die
-- SECURITY-DEFINER-Funktion unten und der service_role-Key lesen trotzdem.
create table if not exists public.autostich_telemetry_config (
  key   text primary key,
  value text
);
alter table public.autostich_telemetry_config enable row level security;

insert into public.autostich_telemetry_config (key, value)
values ('discord_min_interval_sec', '900')          -- max. 1 Meldung / 15 min
on conflict (key) do nothing;

-- Migration von der früheren Fassung: die Webhook-URL lag hier im Klartext. Sie gehört in den Vault
-- (§1) — diese Zeile entfernt den Klartext-Rest. Vorher §1 ausführen, sonst ist der Ping stumm.
delete from public.autostich_telemetry_config where key = 'discord_webhook';

-- §3 — TRIGGER-FUNKTION
--
-- SECURITY DEFINER, weil der Aufrufer `anon` ist: der darf den Vault nicht lesen (und soll es nie
-- dürfen). Gepinnter search_path ist bei SECURITY DEFINER Pflicht. Der EXCEPTION-Block ist der
-- wichtigste Teil: eine Ausnahme im After-Insert-Trigger würde den INSERT mitrollen — ein kaputter
-- Webhook oder ein Discord-Ausfall darf NIE einen Lauf verschlucken. Der Ping ist Bequemlichkeit,
-- die Tabelle ist die Wahrheit.
create or replace function public.autostich_telemetry_ping()
returns trigger
language plpgsql
security definer
set search_path = public, net, vault, pg_temp
as $$
declare
  hook     text;
  min_gap  integer;
  last_at  timestamptz;
  backlog  bigint;
  msg      text;
begin
  select decrypted_secret into hook
    from vault.decrypted_secrets
   where name = 'discord_telemetry_webhook'
   limit 1;
  if hook is null or btrim(hook) = '' then return null; end if;   -- kein Ziel → Ping ist schlicht aus

  select coalesce(value::integer, 900) into min_gap
    from autostich_telemetry_config where key = 'discord_min_interval_sec';
  min_gap := coalesce(min_gap, 900);

  select coalesce(value::timestamptz, 'epoch'::timestamptz) into last_at
    from autostich_telemetry_config where key = 'discord_last_notify';
  last_at := coalesce(last_at, 'epoch'::timestamptz);

  if now() - last_at < make_interval(secs => min_gap) then return null; end if;

  select count(*) into backlog from autostich_telemetry where created_at > last_at;

  msg := format(
    '📊 **%s neue Läufe** (Build `%s` · `%s`)%s— zuletzt: Score **%s**, Runde %s, %s, Fraktionen: %s',
    backlog,
    coalesce(new.app_version, '?'), coalesce(new.build_env, '?'),
    chr(10),
    coalesce(new.score::text, '–'),
    coalesce(new.cycles::text, '–'),
    case new.outcome when 'completed' then 'durchgespielt'
                     when 'abandoned' then 'abgebrochen (Tab zu)'
                     else 'vorzeitig beendet' end,
    coalesce(nullif(array_to_string(array(select jsonb_array_elements_text(new.archetypes)), ', '), ''), '–')
  );

  perform net.http_post(
    url     := hook,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object('content', msg)
  );

  insert into autostich_telemetry_config (key, value) values ('discord_last_notify', now()::text)
    on conflict (key) do update set value = excluded.value;
  return null;
exception when others then
  return null;
end;
$$;

drop trigger if exists autostich_telemetry_discord on public.autostich_telemetry;
create trigger autostich_telemetry_discord
  after insert on public.autostich_telemetry
  for each row execute function public.autostich_telemetry_ping();

-- Aufräumen der früheren Fassung (hieß anders und las die URL aus der Klartext-Tabelle).
drop function if exists public.autostich_notify_discord() cascade;
