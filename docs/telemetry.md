# Telemetrie — anonyme Lauf-Daten für den Beta-Playtest

Ziel: aus echten Spielerläufen dieselben Fragen beantworten, die wir bisher nur im Sim stellen konnten —
welche Perks/Skills werden genommen (und welche nur angeboten), wer trägt den Score, wie sieht der
Upgrade-Baum aus, welche Decks werden gekauft, und wo hören Leute auf.

## 1. Einrichtung (einmalig)

1. **Schema anlegen:** `docs/telemetry-schema.sql` im Supabase-SQL-Editor ausführen
   (Dashboard → SQL Editor → New query → einfügen → Run). Idempotent, mehrfaches Ausführen ist gefahrlos.
2. **Discord-Webhook eintragen:** im privaten Dev-Channel → Kanaleinstellungen → Integrationen → Webhook
   erstellen → URL kopieren. Dann in Supabase:

   ```sql
   update public.autostich_telemetry_config
      set value = 'https://discord.com/api/webhooks/…'
    where key = 'discord_webhook';
   ```

   Die URL liegt damit **serverseitig** — sie steht bewusst *nicht* im Spiel-Bundle, sonst könnte jeder
   den Channel zuspammen. Drossel anpassen (Default: max. 1 Meldung / 15 min):

   ```sql
   update public.autostich_telemetry_config set value = '300' where key = 'discord_min_interval_sec';
   ```

3. **Fertig.** Der Client nutzt dieselbe Supabase-URL und denselben publishable Key wie das Leaderboard
   (`VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY`) — keine neuen Env-Variablen, kein neues Projekt.

Der Testbranch-Build (`VITE_PREVIEW=1`) schreibt in `autostich_telemetry_dev`, damit unser eigenes Testen
den Beta-Datensatz nicht verseucht.

## 2. Was gesendet wird — und was nicht

Eine Zeile pro Lauf, beim Laufende (bzw. beim Schließen des Tabs mitten im Lauf). Enthalten sind:
Score/Runden/Dauer, die Ergebnis-Kennzahlen, die Score-Herkunft je Fraktion, der Build (Perks, Skills,
Familien-Stufen, Gebäude), die **Entscheidungs-Mitschrift** (Angebot ↔ Wahl je Auswahl), der
Upgrade-Baum, gekaufte/ausgerüstete Kosmetik, sowie grober Gerätekontext (gekappter User-Agent,
Viewport, CPU-/RAM-Klasse, Effekt-Stufe).

**Nicht enthalten:** Name/Nickname, E-Mail, Login, IP, irgendetwas außerhalb des Spiels. Die einzige
Kennung ist eine lokal gewürfelte `install_id` (UUID im localStorage) — sie verkettet Läufe desselben
Geräts, sagt aber nichts darüber, *wer* das ist.

**Opt-out:** Optionen → „Anonyme Spieldaten senden". Default an. Beim Abschalten wird auch die noch
nicht gesendete Warteschlange verworfen (`telemetry.purge()`), nicht nur pausiert.

## 3. Aufbau im Code

| Datei | Rolle |
|---|---|
| `src/game/decisionLog.js` | Reiner Higher-Order-Reducer: verbindet Angebot (vorheriger State) mit Wahl (Action) zu kompakten Log-Einträgen. **`reducer.js` bleibt unangetastet** → Determinismus-Invariante und alle Reducer-Tests sind per Konstruktion nicht betroffen; der Sim läuft ohne Log weiter. |
| `src/game/telemetry.js` | Payload-Bau (rein, testbar) + Transport: Install-ID, Retry-Queue in localStorage, `fetch` mit `keepalive`, Opt-out, Preview-Guard. |
| `src/App.jsx` | Nutzt den Wrapper-Reducer; sendet in `saveRun()` und per `pagehide` bei Abbruch. |
| `src/ui/version.js` | **Bestehender** Build-Stempel (#250, aus dem CI: `VITE_BUILD_NUM`/`VITE_BUILD_SHA`/`VITE_ENV`). Die Telemetrie hängt sich dort an, statt einen zweiten Stempel zu führen — zwei Build-Kennungen driften unweigerlich auseinander. |

Alles ist fire-and-forget: jeder Fehler wird geschluckt, Telemetrie darf einen Lauf nie stören.
Fehlgeschlagene Uploads (offline, Handy im Tunnel) gehen beim nächsten Start raus.

### `outcome` — wichtig für jede Auswertung

| Wert | Bedeutung |
|---|---|
| `completed` | Lauf natürlich zu Ende gespielt |
| `ended` | bewusst beendet / Lauf verlassen |
| `abandoned` | Tab geschlossen oder harter Reload, während der Lauf noch lief |

Ein Lauf, der abgebrochen, später fortgesetzt und dann beendet wird, erzeugt **zwei** Zeilen mit
derselben `run_id` (eine `abandoned`, eine Abschlusszeile). Für Laufstatistiken deshalb immer
`where outcome <> 'abandoned'` filtern — oder je `(install_id, run_id)` die jüngste Zeile nehmen.
Für die Abbruch-Analyse ist genau umgekehrt `outcome = 'abandoned'` die interessante Menge.

## 4. Auswertung

Alle Beispiele laufen im Supabase-SQL-Editor. Bei mehreren Builds immer auf `app_version` (und je nach Frage
`build_env`) einschränken — sonst mischen sich Läufe von vor und nach einem Balance-Patch, oder unsere eigenen
Test-Deploys mit echten Beta-Läufen (`where build_env = 'main'`).

**Pickrate je Perk (angeboten vs. genommen)** — die wichtigste Abfrage überhaupt:

```sql
with d as (
  select jsonb_array_elements(decisions) as e
    from autostich_telemetry
   where outcome <> 'abandoned'
), perk as (
  select e from d where e->>'k' = 'perk'
), off as (
  select jsonb_array_elements_text(e->'o') as id from perk
), pick as (
  select e->>'p' as id from perk where e->>'p' is not null
)
select o.id,
       count(*)                                                as angeboten,
       (select count(*) from pick p where p.id = o.id)         as genommen,
       round(100.0 * (select count(*) from pick p where p.id = o.id) / count(*), 1) as pickrate_pct
  from off o
 group by o.id
 order by pickrate_pct asc;   -- unten stehen die toten Perks
```

Für Skills dasselbe mit `e->>'k' = 'skill'`, für Gebäude mit `'arch'`.

**Ablehnquote je Phase** (wie oft wird ein ganzes Angebot ausgeschlagen):

```sql
select e->>'k' as art,
       count(*) filter (where e->>'p' is null) as abgelehnt,
       count(*)                                as angebote,
       round(100.0 * count(*) filter (where e->>'p' is null) / count(*), 1) as ablehnquote_pct
  from autostich_telemetry, jsonb_array_elements(decisions) e
 where outcome <> 'abandoned' and e->>'k' in ('perk','skill','leg')
 group by 1;
```

**Abbruchkurve** — wo hören Leute auf:

```sql
select cycles as runde, count(*) as abbrueche
  from autostich_telemetry
 where outcome = 'abandoned'
 group by 1 order by 1;
```

**Score-Herkunft je Fraktion** (trägt eine Fraktion den Lauf, oder alle gleich):

```sql
select round(avg((channels->>'glacier')::numeric))     as eis,
       round(avg((channels->>'light')::numeric))       as blitz,
       round(avg((channels->>'fireBase')::numeric))    as feuer,
       round(avg((channels->>'plantBloom')::numeric))  as pflanze,
       round(avg((channels->>'formation')::numeric))   as formation,
       round(avg((channels->>'building')::numeric))    as gebaeude,
       count(*)                                        as laeufe
  from autostich_telemetry
 where outcome = 'completed';
```

**Archetyp-Balance** (Median-Score je gespielter Fraktions-Kombination):

```sql
select archetypes,
       count(*)                                                          as laeufe,
       percentile_cont(0.5) within group (order by score)                as median_score,
       max(score)                                                        as best
  from autostich_telemetry
 where outcome = 'completed'
 group by archetypes
having count(*) >= 5
 order by median_score desc;
```

**Upgrade-Baum — welche Knoten werden gekauft:**

```sql
select node, count(*) as gekauft
  from autostich_telemetry, jsonb_object_keys(tree->'nodes') as node
 where outcome <> 'abandoned'
 group by 1 order by 2 desc;
```

**Gekaufte Kosmetik / Decks:**

```sql
select element, count(distinct install_id) as spieler
  from autostich_telemetry, jsonb_array_elements_text(cosmetics->'owned') as element
 group by 1 order by 2 desc;
```

**Reichweite des Playtests** (wie viele Leute, wie viele Läufe, welche Builds):

```sql
select app_version, build_env,
       count(distinct install_id) as spieler,
       count(*)                   as laeufe,
       round(avg(duration_ms)/60000.0, 1) as schnitt_min
  from autostich_telemetry
 group by 1,2 order by 1 desc;
```

### Export in die Sim-Pipeline

Für den Abgleich echter Läufe gegen die Sim-Baselines: Ergebnis im SQL-Editor als CSV herunterladen und
in `sim/` einlesen. Die `decisions`-Struktur ist absichtlich dieselbe Denkweise wie die Sim-Policies —
`seed` + `decisions` machen einen Spielerlauf reproduzierbar (Determinismus-Invariante, #205).

## 5. Was beim Merge nach main passiert

Am Code ändert sich nichts (nichts ist branch-abhängig), aber **zwei Dinge schalten sich automatisch um** —
beides gewollt, beides sieht ohne Vorwissen wie ein Defekt aus:

1. **Die Zieltabelle wechselt.** `deploy-pixi.yml`/`deploy-test.yml`/`deploy-balancing.yml` setzen
   `VITE_PREVIEW=1` → Läufe landen in `autostich_telemetry_dev`. `deploy.yml` (main) setzt es nicht → ab dem
   Merge schreibt das Spiel in `autostich_telemetry`. Der Discord-Trigger hängt **nur an der Haupttabelle**;
   Läufe vom pixi-Deploy lösen also bewusst keine Meldung aus. Zum Testen der Kette vor dem Merge lässt sich
   der Trigger vorübergehend zusätzlich auf `autostich_telemetry_dev` legen (danach wieder löschen, sonst
   pingt das eigene Testen dauerhaft mit).
2. **Die `install_id` wird neu gewürfelt.** Sie liegt im localStorage-Namespace, und Preview-Builds präfixen
   alle Keys mit `preview_`. Jedes Testgerät sieht nach dem Umzug wie ein neuer Spieler aus; Läufe von vor
   und nach dem Merge lassen sich nicht demselben Gerät zuordnen. Für einen bei null startenden Beta-Test
   ist das richtig — nur nicht überraschen lassen.

Was sich **nicht** unterscheidet: der Wochen-Seed. Er wird allein aus ISO-Jahr + ISO-Woche in UTC gehasht
(`weeklySeed.js`) — kein Branch, keine Umgebung fließt ein. Alle Deploys spielen denselben Wochen-Seed.

## 6. Grenzen, die man kennen sollte

- Der publishable Key steht im Bundle, also kann grundsätzlich jeder in die Tabelle schreiben. Abgesichert
  ist das durch **insert-only RLS** (niemand kann fremde Läufe lesen), Größen-Constraints und die
  Trennung vom Leaderboard. Für eine geschlossene Beta ist das angemessen; für ein öffentliches Release
  bräuchte es eine Edge Function mit Rate-Limit.
- Werte sind **Client-Angaben**. Ein manipulierter Client kann Unsinn schreiben. Für Balancing-Statistik
  irrelevant, für „Rekorde" nicht belastbar — dafür ist das Leaderboard zuständig.
- Läufe von Spielern mit Opt-out fehlen vollständig. Wenn die Opt-out-Quote je nennenswert wird, ist die
  Stichprobe verzerrt (wer abschaltet, spielt vermutlich anders).
