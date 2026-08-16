-- ============================================================================
-- Autostich — #174 Usernamen-Guard für das globale Leaderboard.
--
-- ERZEUGT von scripts/gen-profanity-sql.mjs aus src/game/profanityWords.js.
-- NICHT von Hand ändern — Wörter gehören in die JS-Liste, danach `npm run gen:profanity-sql`.
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
  select translate(replace(replace(replace(replace(replace(lower(coalesce(raw, '')), 'ß', 'ss'), 'æ', 'ae'), 'œ', 'oe'), 'þ', 'th'), 'ĳ', 'ij'), '01345789àáâãäåāăąèéêëēĕėęěìíîïĩīĭįıòóôõöōŏőøùúûüũūŭůűýÿŷñńňçćčšśşžźżďđðłĺŕřťğģавеіјкморстухѕԁнαβγεηικμνορστυχ@$!|¡+(€£', 'oieastbgaaaaaaaaaeeeeeeeeeiiiiiiiiiooooooooouuuuuuuuuyyynnncccssszzzdddllrrtggabeijkmopctyxsdhabyenikuvopstuxasiiitcel');
$$;

-- 2) Dichte Form: zusätzlich alles Nicht-Alphanumerische entfernt.
--    „S h 1 t !" → „shit" — dagegen läuft die Substring-Suche.
create or replace function public.norm_username(raw text)
returns text language sql immutable
set search_path = public, pg_temp as $$
  select regexp_replace(public.fold_username(raw), '[^a-z0-9]', '', 'g');
$$;

-- 3) Die eigentliche Prüfung.
--    Die Suchmuster sind wiederholungstolerant (`s+h+i+t+`) — „fuuuck" wird gefangen,
--    während „nigger" weiterhin zwei g verlangt und „Nigeria" damit durchlässt.
--    Die Whitelist wird dagegen WÖRTLICH gesucht: ein tolerantes „niger" würde sonst auf
--    „nigger" passen und den Treffer wegmaskieren.
create or replace function public.username_is_clean(raw text)
returns boolean language plpgsql immutable
set search_path = public, pg_temp as $$
declare
  -- Harmlose Wörter, die einen gesperrten Begriff enthalten (Scunthorpe-Problem).
  allow_words text[] := array[
    'marschieren',
    'scunthorpe',
    'mongolisch',
    'marschall',
    'warschau',
    'mongolei',
    'mongolia',
    'shiitake',
    'mongole',
    'shitake',
    'marsch',
    'barsch',
    'harsch'
  ];
  -- Gesperrt an jeder Stelle des Namens (deutsche Komposita).
  sub_patterns text[] := array[
    'a+r+s+c+h+',
    'a+r+s+c+h+l+o+c+h+',
    'w+i+c+h+s+e+r+',
    'w+i+c+h+s+e+n+',
    'h+u+r+e+n+s+o+h+n+',
    'h+u+r+e+n+t+o+c+h+t+e+r+',
    'f+o+t+z+e+',
    'v+o+t+z+e+',
    'f+i+c+k+',
    'f+i+c+k+e+n+',
    'f+i+c+k+e+r+',
    'f+i+c+k+t+',
    'g+e+f+i+c+k+t+',
    'v+e+r+f+i+c+k+t+',
    's+c+h+l+a+m+p+e+',
    's+c+h+e+i+s+s+',
    'k+a+c+k+e+',
    'k+a+c+k+e+n+',
    'm+i+s+t+s+t+u+c+k+',
    'm+i+s+t+g+e+b+u+r+t+',
    'd+r+e+c+k+s+a+u+',
    'd+r+e+c+k+s+c+h+w+e+i+n+',
    'h+o+d+e+n+s+a+c+k+',
    's+c+h+w+a+n+z+l+u+t+s+c+h+e+r+',
    'm+u+s+c+h+i+',
    'p+i+m+m+e+l+',
    't+i+t+t+e+n+',
    's+p+e+r+m+a+',
    's+c+h+w+u+c+h+t+e+l+',
    'k+a+n+a+k+e+',
    'n+e+g+e+r+',
    's+p+a+s+t+',
    's+p+a+s+t+i+',
    'm+o+n+g+o+',
    'p+i+s+s+e+r+',
    'n+u+t+t+e+n+',
    'f+u+c+k+',
    'f+u+c+k+e+r+',
    'f+u+c+k+i+n+g+',
    'm+o+t+h+e+r+f+u+c+k+e+r+',
    's+h+i+t+',
    'b+u+l+l+s+h+i+t+',
    'b+i+t+c+h+',
    'a+s+s+h+o+l+e+',
    'a+r+s+e+h+o+l+e+',
    'c+u+n+t+',
    'p+u+s+s+y+',
    'w+h+o+r+e+',
    's+l+u+t+',
    'f+a+g+g+o+t+',
    'r+e+t+a+r+d+',
    'n+i+g+g+e+r+',
    'n+i+g+g+a+',
    'w+a+n+k+e+r+',
    'b+l+o+w+j+o+b+',
    'h+a+n+d+j+o+b+',
    'c+u+m+s+h+o+t+',
    'd+i+l+d+o+',
    'p+o+r+n+o+',
    'p+e+n+i+s+',
    'v+a+g+i+n+a+',
    'o+r+g+a+s+m+',
    'h+i+t+l+e+r+',
    's+i+e+g+h+e+i+l+',
    'h+a+k+e+n+k+r+e+u+z+',
    'n+a+z+i+'
  ];
  -- Gesperrt nur als vollständiges Token („Hure", nicht „Schuhregal").
  word_patterns text[] := array[
    'h+u+r+e+',
    'h+u+r+e+n+',
    'n+u+t+t+e+',
    's+c+h+w+a+n+z+',
    's+a+u+',
    'p+i+s+s+e+',
    'p+i+s+s+',
    'a+r+s+e+',
    'c+o+c+k+',
    'f+a+g+',
    't+i+t+',
    't+i+t+s+',
    't+w+a+t+',
    'w+a+n+k+',
    'r+a+p+e+',
    'c+u+m+'
  ];
  norm text;
  w text;
  tok text;
begin
  -- Länge zählt auf der ROHFORM und in Zeichen, genau wie im Client (MAX_USERNAME).
  if raw is null or btrim(raw) = '' then return false; end if;
  if char_length(btrim(raw)) > 20 then return false; end if;

  norm := public.norm_username(raw);
  if norm = '' then return true; end if;   -- nur Sonderzeichen: nichts zu prüfen

  -- Whitelist ausmaskieren. Der Platzhalter ist nicht alphanumerisch und unterbricht
  -- damit jedes Suchmuster zuverlässig.
  foreach w in array allow_words loop
    norm := replace(norm, w, '-');
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
