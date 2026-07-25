// Globaler Highscore via Supabase Data API (PostgREST) — dependency-frei per fetch,
// self-contained für Pages/CSP. Publishable Key + URL sind öffentlich; RLS erlaubt
// nur select + insert. Alle Aufrufer fangen Fehler ab (graceful degradation). (#14)
const BASE = import.meta.env.VITE_SUPABASE_URL;
const KEY  = import.meta.env.VITE_SUPABASE_KEY;
// Preview-Build (Testbranch): globale Bestenliste NUR lesen, nie schreiben — Test-Runs
// sollen die echte Tabelle `autostich_scores` nicht verunreinigen.
const PREVIEW = import.meta.env.VITE_PREVIEW === "1";
export const leaderboardConfigured = !!(BASE && KEY);

const REST = `${BASE}/rest/v1/autostich_scores`;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// Spalten des Boards. `archetypes` (#139) ist optional: existiert die Spalte in der Tabelle
// noch nicht (Migration steht aus), fällt fetch/publish unten auf die Alt-Spalten zurück, statt
// mit 400 den ganzen Block lahmzulegen. So ist die Deploy-Reihenfolge (Code vs. Schema) egal.
const COLS      = "name,score,level,tricks,cycles,archetypes,created_at";
const COLS_BASE = "name,score,level,tricks,cycles,created_at";

// Top-N global: Score↓, bei Gleichstand mehr Stiche, dann jünger.
export async function fetchGlobalTop(limit = 10) {
  const url = (cols) => `${REST}?select=${cols}&order=score.desc,tricks.desc,created_at.desc&limit=${limit}`;
  let res = await fetch(url(COLS), { headers });
  if (res.status === 400) res = await fetch(url(COLS_BASE), { headers }); // Spalte `archetypes` noch nicht migriert
  if (!res.ok) throw new Error(`fetchGlobalTop ${res.status}`);
  return res.json();
}

// Lauf veröffentlichen. entry: { name, score, level, tricks, cycles, archetypes? }.
// Hinweis: `level` = Rundenzahl (= cycles); die Spalte bleibt aus Kompatibilität mit der bestehenden Tabelle befüllt.
export async function publishRun(entry) {
  if (PREVIEW) return; // Preview-Build: kein Schreiben ins echte Leaderboard.
  const post = (body) => fetch(REST, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
  let res = await post(entry);
  if (res.status === 400 && entry.archetypes !== undefined) {
    const { archetypes, ...base } = entry; // Spalte `archetypes` noch nicht migriert → ohne sie erneut posten
    res = await post(base);
  }
  if (!res.ok) throw new Error(`publishRun ${res.status}`);
}
