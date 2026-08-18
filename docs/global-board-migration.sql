-- #global — Globale Bestenliste: Baumstand-Spalte + Index für das Casual-Board.
--
-- Auf Supabase ausführen (Dashboard → SQL Editor → New query → einfügen → Run). Idempotent.
-- ADDITIV & NULLABLE → bestehende Inserts/Selects bleiben gültig, Alt-Einträge behalten NULL.
-- Der Client degradiert VOR dieser Migration sauber (Fallback-Kaskade in src/game/leaderboard.js:
-- COLS_TREE → COLS_FULL → COLS_ARCH → COLS_BASE), die Deploy-Reihenfolge Code↔Schema ist also egal.
-- Ohne die Migration zeigt die Baum-Pille überall „–/27"; sonst ändert sich nichts.

-- ---------------------------------------------------------------------------
-- 1) Baumstand: wie viele der TOTAL_NODES Upgrade-Knoten der Spieler beim Lauf besaß.
--
-- BEWUSST OHNE `default`. Ab PostgreSQL 11 füllt `add column ... default 0` auch alle BESTEHENDEN
-- Zeilen — jeder historische Lauf behauptete dann „0 Knoten". Das ist keine fehlende Angabe, das ist
-- eine falsche: die Läufe hatten einen Baum, wir wissen nur nicht welchen. NULL heißt „unbekannt",
-- und genau darauf verlässt sich die UI (gestrichelte „–/27"-Pille statt einer erfundenen Zahl).
-- ---------------------------------------------------------------------------
alter table public.autostich_scores
  add column if not exists tree_nodes integer;

-- ---------------------------------------------------------------------------
-- 2) Index für das Global-Board.
--
-- Die Abfrage lautet:  where board is null
--                      order by score desc, tricks desc, created_at desc  limit N
-- Der bestehende `autostich_scores_rank_idx` trägt zwar die Sortierung, aber nicht den Filter — mit
-- wachsender Tabelle liefe das auf Filtern-nach-dem-Lesen hinaus. Ein PARTIELLER Index über genau die
-- Casual-Zeilen bedient beides in einem Scan (schon sortiert → kein Sort-Schritt für das Limit) und
-- bleibt klein, weil er die Ranglisten-Zeilen gar nicht erst enthält. Gleiches Muster wie die
-- bestehenden Teil-Indizes für `board is not null` (§7) und `seed is not null` (#205).
-- ---------------------------------------------------------------------------
create index if not exists autostich_scores_global_idx
  on public.autostich_scores (score desc, tricks desc, created_at desc)
  where board is null;

-- ---------------------------------------------------------------------------
-- Was NICHT nötig ist (damit niemand danach sucht):
--
-- · RLS — die Policies sind `using (true)` / `with check (true)`, also OHNE Spalten-Whitelist. Eine neue
--   Spalte ist damit sofort les- und schreibbar; an den Policies ist nichts zu ändern.
-- · Schema-Cache — PostgREST muss seinen Cache kennen, bevor es `tree_nodes` akzeptiert. Supabase stößt
--   das nach einem DDL über einen Event-Trigger selbst an. Falls Inserts danach doch noch mit 400
--   („column ... does not exist") antworten, einmal nachhelfen:  notify pgrst, 'reload schema';
-- · Ein Backfill für Alt-Zeilen — es gibt nichts zu backfillen. Der Baumstand vergangener Läufe wurde nie
--   erhoben und lässt sich nicht rekonstruieren; NULL ist die richtige Antwort.
--
-- Fußnote: `autostich_scores_rank_idx` (ungefiltert) bedient nach dieser Migration nur noch den
-- Notfallpfad, den fetchGlobalTop fährt, wenn die `board`-Spalte fehlt. Er bleibt liegen — er kostet
-- wenig und ist die Rückfallebene, wenn das Schema mal hinter dem Code herhinkt.
