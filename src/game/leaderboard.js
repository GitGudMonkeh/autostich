// Globaler Highscore via Supabase Data API (PostgREST) — dependency-frei per fetch,
// self-contained für Pages/CSP. Publishable Key + URL sind öffentlich; RLS erlaubt
// nur select + insert. Alle Aufrufer fangen Fehler ab (graceful degradation). (#14)
const BASE = import.meta.env.VITE_SUPABASE_URL;
const KEY  = import.meta.env.VITE_SUPABASE_KEY;
export const leaderboardConfigured = !!(BASE && KEY);

const REST = `${BASE}/rest/v1/autostich_scores`;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// Top-N global: Score↓, bei Gleichstand mehr Stiche, dann jünger.
export async function fetchGlobalTop(limit = 10) {
  const url = `${REST}?select=name,score,level,tricks,cycles,created_at&order=score.desc,tricks.desc,created_at.desc&limit=${limit}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`fetchGlobalTop ${res.status}`);
  return res.json();
}

// Lauf veröffentlichen. entry: { name, score, level, tricks, cycles }.
export async function publishRun(entry) {
  const res = await fetch(REST, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(`publishRun ${res.status}`);
}
