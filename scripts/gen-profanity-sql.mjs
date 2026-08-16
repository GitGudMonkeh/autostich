#!/usr/bin/env node
/* #174: Supabase-Guard für Usernamen — GENERATOR.

   Warum generiert und nicht handgeschrieben? Weil die Issue-Abnahme verlangt, dass Client- und
   Server-Wortliste konsistent sind. Zwei handgepflegte Listen driften garantiert auseinander —
   die eine wird erweitert, die andere vergessen, und ab da behauptet der Client etwas, das die
   Datenbank nicht durchsetzt. Hier ist src/game/profanityWords.js die einzige Quelle; diese
   Datei übersetzt sie in SQL. `test/profanity-sql.test.js` prüft, dass die eingecheckte
   .sql-Datei zum aktuellen Stand passt, und wird rot, sobald jemand nur eine Seite anfasst.

   Ausführen: `npm run gen:profanity-sql` → docs/username-profanity-guard.sql
   Das Ergebnis wird von Hand im Supabase-SQL-Editor eingespielt: im Repo liegt nur der
   öffentliche Anon-Key (bewusst kein Service-Key), also kann kein Code das deployen.
*/
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { FOLD, FOLD_MULTI, LEET, MAX_USERNAME, PATTERNS } from "../src/game/profanity.js";

const __dir = dirname(fileURLToPath(import.meta.url));
export const OUT_FILE = resolve(__dir, "../docs/username-profanity-guard.sql");

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;                 // SQL-Stringliteral
const arr = (list) => list.length ? `array[\n    ${list.map(q).join(",\n    ")}\n  ]` : `'{}'::text[]`;

/* translate() bildet Zeichen 1:1 ab — genau das können FOLD und LEET gemeinsam, weil kein
   FOLD-Ergebnis (a–z) zugleich ein LEET-Schlüssel (Ziffern/Symbole) ist. Die Reihenfolge
   im Client (erst falten, dann leeten) bleibt dadurch bedeutungsgleich. */
function translatePair() {
  const map = { ...FOLD, ...LEET };
  const from = Object.keys(map);
  const to = from.map((k) => map[k]);
  // Beide Seiten müssen zeichenweise deckungsgleich sein, sonst verschiebt translate() stillschweigend.
  for (const [k, v] of Object.entries(map)) {
    if ([...k].length !== 1) throw new Error(`translate: Schlüssel „${k}" ist nicht genau ein Zeichen`);
    if ([...v].length !== 1) throw new Error(`translate: Wert „${v}" ist nicht genau ein Zeichen — gehört in FOLD_MULTI`);
  }
  const dupes = from.filter((k, i) => from.indexOf(k) !== i);
  if (dupes.length) throw new Error(`translate: doppelte Schlüssel ${dupes.join(", ")}`);
  return [from.join(""), to.join("")];
}

/* FOLD_MULTI bildet ein Zeichen auf mehrere ab (ß → ss) — das kann translate() nicht,
   dafür geschachtelte replace()-Aufrufe. Innerstes zuerst, damit die Reihenfolge stimmt. */
function multiReplaces(inner) {
  return Object.entries(FOLD_MULTI).reduce((sql, [k, v]) => `replace(${sql}, ${q(k)}, ${q(v)})`, inner);
}

export function buildSql() {
  const [from, to] = translatePair();
  const folded = `translate(${multiReplaces("lower(coalesce(raw, ''))")}, ${q(from)}, ${q(to)})`;

  return `-- ============================================================================
-- Autostich — #174 Usernamen-Guard für das globale Leaderboard.
--
-- ERZEUGT von scripts/gen-profanity-sql.mjs aus src/game/profanityWords.js.
-- NICHT von Hand ändern — Wörter gehören in die JS-Liste, danach \`npm run gen:profanity-sql\`.
-- test/profanity-sql.test.js schlägt fehl, sobald diese Datei vom Code abweicht.
--
-- Ausführen im Supabase-SQL-Editor (Dashboard → SQL Editor → New query → einfügen → Run).
-- Idempotent: mehrfaches Ausführen ist gefahrlos.
--
-- ---------------------------------------------------------------------------
-- WARUM ÜBERHAUPT SERVERSEITIG?
-- Das Board schreibt mit dem ÖFFENTLICHEN Anon-Key, RLS erlaubt insert. Wer will, POSTet
-- direkt gegen die REST-API und umgeht jeden Client-Check. Der Filter im Spiel ist die
-- Höflichkeitsschicht (sofortiges Feedback); durchgesetzt wird er erst hier.
--
-- ABWEICHUNG ZUM CLIENT (bewusst, dokumentiert):
-- Der Client normalisiert zusätzlich per Unicode-NFKD und fängt damit auch Akzentzeichen,
-- die unten in der Faltungstabelle fehlen. Der Server ist an dieser einen Stelle also
-- etwas nachsichtiger. Alles andere — Wortlisten, Whitelist, Suchmuster, Längengrenze —
-- ist zeichengleich aus derselben Quelle erzeugt.
-- ---------------------------------------------------------------------------

-- 1) Faltung: Kleinschreibung, Diakritika/Homoglyphen, Leetspeak. Trennzeichen bleiben
--    erhalten, weil die Wortgrenzen-Prüfung sie noch braucht.
create or replace function public.fold_username(raw text)
returns text language sql immutable
set search_path = public, pg_temp as $$
  select ${folded};
$$;

-- 2) Dichte Form: zusätzlich alles Nicht-Alphanumerische entfernt.
--    „S h 1 t !" → „shit" — dagegen läuft die Substring-Suche.
create or replace function public.norm_username(raw text)
returns text language sql immutable
set search_path = public, pg_temp as $$
  select regexp_replace(public.fold_username(raw), '[^a-z0-9]', '', 'g');
$$;

-- 3) Die eigentliche Prüfung.
--    Die Suchmuster sind wiederholungstolerant (\`s+h+i+t+\`) — „fuuuck" wird gefangen,
--    während „nigger" weiterhin zwei g verlangt und „Nigeria" damit durchlässt.
--    Die Whitelist wird dagegen WÖRTLICH gesucht: ein tolerantes „niger" würde sonst auf
--    „nigger" passen und den Treffer wegmaskieren.
create or replace function public.username_is_clean(raw text)
returns boolean language plpgsql immutable
set search_path = public, pg_temp as $$
declare
  -- Harmlose Wörter, die einen gesperrten Begriff enthalten (Scunthorpe-Problem).
  allow_words text[] := ${arr(PATTERNS.allow)};
  -- Gesperrt an jeder Stelle des Namens (deutsche Komposita).
  sub_patterns text[] := ${arr(PATTERNS.substring)};
  -- Gesperrt nur als vollständiges Token („Hure", nicht „Schuhregal").
  word_patterns text[] := ${arr(PATTERNS.word)};
  norm text;
  w text;
  tok text;
begin
  -- Länge zählt auf der ROHFORM und in Zeichen, genau wie im Client (MAX_USERNAME).
  if raw is null or btrim(raw) = '' then return false; end if;
  if char_length(btrim(raw)) > ${MAX_USERNAME} then return false; end if;

  norm := public.norm_username(raw);
  if norm = '' then return true; end if;   -- nur Sonderzeichen: nichts zu prüfen

  -- Whitelist ausmaskieren. Der Platzhalter ist nicht alphanumerisch und unterbricht
  -- damit jedes Suchmuster zuverlässig.
  foreach w in array allow_words loop
    norm := replace(norm, w, ${q(PATTERNS.mask)});
  end loop;

  foreach w in array sub_patterns loop
    if norm ~ w then return false; end if;
  end loop;

  -- Wortgrenzen-Durchgang: Token sind zusammenhängende Buchstaben- oder Ziffernfolgen,
  -- damit „arsch2000" das Token „arsch" hergibt.
  for tok in select m[1] from regexp_matches(public.fold_username(raw), '[a-z]+|[0-9]+', 'g') m loop
    if tok = any (allow_words) then continue; end if;
    foreach w in array word_patterns loop
      if tok ~ ('^' || w || '$') then return false; end if;
    end loop;
  end loop;

  return true;
end;
$$;

-- 4) Trigger: unsaubere Inserts werden abgelehnt, nicht stillschweigend bereinigt.
--    Ein stiller Rewrite würde dem Absender vorgaukeln, sein Name stünde so im Board.
create or replace function public.check_username_clean()
returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if not public.username_is_clean(new.name) then
    raise exception 'username rejected: profanity or invalid length'
      using errcode = '23514';   -- check_violation → PostgREST antwortet mit 400
  end if;
  return new;
end;
$$;

drop trigger if exists trg_username_clean on public.autostich_scores;
create trigger trg_username_clean
  before insert on public.autostich_scores
  for each row execute function public.check_username_clean();

-- ---------------------------------------------------------------------------
-- Nach dem Einspielen prüfen (beide Zeilen sollten so antworten):
--   select public.username_is_clean('Dani');        -- t
--   select public.username_is_clean('4rschl0ch');   -- f
--   select public.username_is_clean('Scunthorpe');  -- t  (Whitelist greift)
--   select public.username_is_clean('Nigeria');     -- t  (kein Fehltreffer)
-- Bypass-Test — muss mit 400 und „username rejected" scheitern:
--   insert into public.autostich_scores (name, score) values ('4rschl0ch', 1);
-- ---------------------------------------------------------------------------
`;
}

// Direkter Aufruf (npm run gen:profanity-sql) schreibt die Datei; als Import bleibt es rein.
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  writeFileSync(OUT_FILE, buildSql(), "utf8");
  console.log(`geschrieben: ${OUT_FILE}`);
}
