-- ============================================================
-- AUTOSTICH — FEEDBACK-MELDER, STUFE 3: DISCORD-PING (#396)
--
-- Jeder neue Report postet eine Zeile in einen Discord-Kanal. Der Client weiß von Discord NICHTS —
-- diese Datei ist die komplette Stufe 3. Kein neuer Build, kein neues Secret im Repo.
--
-- Voraussetzung: docs/autostich-reports-schema.sql ist bereits gelaufen (Tabelle + RLS).
--
-- Idempotent: mehrfaches Ausführen ist unschädlich.
-- Im Dashboard unter SQL Editor einfügen und ausführen — ABER vorher §1 lesen.
--
-- ------------------------------------------------------------
-- WARUM pg_net + Vault UND NICHT eine Edge Function?
--   Eine Edge Function bräuchte den Supabase-CLI, einen Deploy-Schritt und ein zweites Secret-Depot
--   (Function Secrets). Sie kann dafür mehr — Rate Limiting, Formatierung, Weiterleitung an mehrere
--   Ziele. Für „eine Zeile in einen Kanal" ist das reine Betriebslast: eine Sache mehr, die beim
--   nächsten Supabase-Upgrade kaputtgehen und die niemand mehr deployen kann, weil der CLI-Token weg
--   ist. Diese Datei kommt ohne Werkzeuge aus: einfügen, ausführen, fertig.
--   Wird die Formatierung später komplexer (mehrere Kanäle, Bündelung, Antwort-Knöpfe), ist der
--   Umstieg klein: der Trigger postet dann auf die Function-URL statt direkt auf den Webhook.
-- ============================================================


-- ------------------------------------------------------------
-- §1 — WEBHOOK-URL IN DEN VAULT (EINMALIG, VON HAND)
--
-- In Discord: Kanal → Bearbeiten → Integrationen → Webhooks → Neuer Webhook → URL kopieren.
--
-- Die URL gehört NICHT ins Repo und NICHT in diese Datei: wer sie hat, kann in den Kanal posten.
-- Deshalb der Vault. Diese eine Zeile im SQL-Editor ausführen, mit der echten URL:
--
--   select vault.create_secret(
--     'https://discord.com/api/webhooks/DEINE/URL',
--     'discord_report_webhook',
--     'Autostich #396 — Ziel des Report-Pings');
--
-- Später ändern (nicht noch einmal create_secret, das legt einen zweiten Eintrag an):
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'discord_report_webhook'),
--     'https://discord.com/api/webhooks/NEUE/URL');
--
-- Ping wieder abschalten, ohne irgendetwas zu löschen:
--   delete from vault.secrets where name = 'discord_report_webhook';
-- Der Trigger findet dann kein Ziel und lässt den Report einfach in Ruhe (§3).
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- §2 — pg_net: HTTP aus der Datenbank heraus
--
-- pg_net stellt die Anfrage in eine Warteschlange und kehrt SOFORT zurück. Das ist der Grund für
-- diese Extension statt eines synchronen http-Calls: der Insert des Spielers wartet nicht darauf,
-- dass Discord antwortet. Ein langsamer oder toter Webhook verzögert den Melder um nichts.
-- ------------------------------------------------------------
create extension if not exists pg_net;


-- ------------------------------------------------------------
-- §3 — DIE TRIGGER-FUNKTION
--
-- SECURITY DEFINER, weil der Aufrufer `anon` ist: der darf den Vault nicht lesen (und soll es auch
-- nie dürfen — sonst stünde die Webhook-URL faktisch im Bundle). Die Funktion läuft deshalb unter
-- ihrem Eigentümer. Bei SECURITY DEFINER ist ein gepinnter `search_path` Pflicht, sonst könnte ein
-- untergeschobenes Schema die aufgerufenen Funktionen ersetzen.
--
-- Der EXCEPTION-Block ist der wichtigste Teil der Datei: eine Ausnahme im After-Insert-Trigger
-- würde den INSERT mit zurückrollen. Ein kaputter Webhook, ein abgelaufener Vault-Eintrag oder ein
-- Discord-Ausfall dürfen NIE einen Report verschlucken — der Ping ist Bequemlichkeit, die Tabelle
-- ist die Wahrheit.
-- ------------------------------------------------------------
create or replace function public.autostich_report_ping()
returns trigger
language plpgsql
security definer
set search_path = public, net, vault, pg_temp
as $$
declare
  hook   text;
  kopf   text;
  bezug  text;
  fehler text;
  text_  text;
begin
  select decrypted_secret into hook
    from vault.decrypted_secrets
   where name = 'discord_report_webhook'
   limit 1;
  -- Kein Ziel hinterlegt → Ping ist schlicht aus. Kein Fehler, kein Logeintrag, kein Rauschen.
  if hook is null or btrim(hook) = '' then
    return new;
  end if;

  -- Kopfzeile: Art · Melder · Umgebung · Version. Genau die vier Dinge, nach denen man im Kanal
  -- sortiert, bevor man überhaupt ins Dashboard schaut.
  kopf := format('**%s** · %s · `%s` · %s',
                 upper(coalesce(nullif(btrim(new.kind), ''), '?')),
                 coalesce(nullif(btrim(new.name), ''), 'anonym'),
                 coalesce(nullif(btrim(new.build_env), ''), '?'),
                 coalesce(nullif(btrim(new.version), ''), '?'));

  -- Lauf-Bezug nur, wenn er wirklich dranhängt — „Seed: null" wäre eine Zeile Müll je Report.
  bezug := case when new.seed is null then ''
                else format(E'\nSeed `%s` · Durchlauf %s · Score %s',
                            new.seed, coalesce(new.cycle::text, '?'), coalesce(new.score::text, '?'))
           end;

  -- Nur die ERSTE Fehlerzeile aus dem Ring-Puffer: sie sagt, ob es überhaupt gekracht hat. Der Rest
  -- steht im Dashboard und würde den Kanal zumüllen.
  fehler := case when coalesce(btrim(new.errors), '') = '' then ''
                 else format(E'\n⚠ `%s`', left(split_part(new.errors, E'\n', 1), 180))
            end;

  -- Backticks entschärfen: ein Report mit ``` würde sonst aus dem Zitat ausbrechen und den Rest der
  -- Nachricht als Code formatieren. Ersetzt, nicht entfernt — der Text bleibt lesbar.
  text_ := replace(left(new.message, 1200), '`', '´');

  perform net.http_post(
    url     := hook,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'content', kopf || bezug || fehler || E'\n> ' || replace(text_, E'\n', E'\n> '),
      -- Der Kern der Absicherung: der Reporttext kommt von einem beliebigen Spieler. Ohne diese
      -- Zeile könnte ein „@everyone" im Meldetext den ganzen Server anpingen — genau der Grund,
      -- warum die Webhook-URL nicht offen im Client stehen darf (schema.sql §RLS).
      'allowed_mentions', jsonb_build_object('parse', jsonb_build_array())
    )
  );

  return new;
exception when others then
  return new;   -- s. o.: der Report zählt, der Ping nicht.
end;
$$;


-- ------------------------------------------------------------
-- §4 — DER TRIGGER
--
-- AFTER INSERT, damit die Zeile bereits sicher in der Tabelle steht, bevor überhaupt jemand
-- benachrichtigt wird. Ein BEFORE-Trigger könnte pingen und der Insert danach doch scheitern.
-- ------------------------------------------------------------
drop trigger if exists autostich_report_ping on public.autostich_reports;
create trigger autostich_report_ping
  after insert on public.autostich_reports
  for each row execute function public.autostich_report_ping();


-- ------------------------------------------------------------
-- §5 — PROBE
--
-- Einmal ausführen; im Discord-Kanal muss binnen weniger Sekunden eine Zeile stehen. Danach räumt
-- die zweite Anweisung die Testzeile wieder weg (der Ping ist da schon raus — das ist Absicht,
-- genau das soll ja geprüft werden).
--
--   insert into public.autostich_reports (kind, message, name, build_env, version, seed, cycle, score)
--   values ('other', 'Probe: Discord-Ping steht.', 'Setup', 'dev', 'v0.4·dev', 12345, 3, 900000);
--
--   delete from public.autostich_reports where name = 'Setup' and kind = 'other';
--
-- Kommt nichts an, ist der Grund fast immer einer von dreien — in dieser Reihenfolge prüfen:
--   1. select name from vault.secrets where name = 'discord_report_webhook';   -- Eintrag da?
--   2. select * from net._http_response order by created desc limit 5;         -- was sagt Discord?
--      (204 = angekommen · 401/404 = Webhook falsch oder gelöscht · 429 = zu viele Pings)
--   3. select tgname, tgenabled from pg_trigger where tgrelid = 'public.autostich_reports'::regclass;
--
-- Die Fehlersuche muss über net._http_response laufen, weil der EXCEPTION-Block in §3 bewusst
-- SCHWEIGT: er darf den Report nicht gefährden, also meldet er auch nichts.
-- ------------------------------------------------------------
