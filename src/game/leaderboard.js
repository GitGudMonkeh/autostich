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

// Spalten des Boards, gestufte Fallback-Kaskade — je nachdem, wie weit die Tabelle migriert ist.
// Fehlt eine Spalte, antwortet PostgREST mit 400; dann fällt fetch/publish auf die nächste (kleinere) Stufe
// zurück, statt den ganzen Block lahmzulegen. So ist die Deploy-Reihenfolge (Code vs. Schema) egal.
//  - COLS_FULL: alles inkl. #169-FB-8-Detailspalten (Run-Rückblick).
//  - COLS_ARCH: nur bis `archetypes` (#139) — Zwischenstufe, damit die Icons NICHT ausfallen, solange nur die
//    FB-8-Spalten noch fehlen.
//  - COLS_BASE: ganz ohne Zusatzspalten (Ur-Tabelle).
const FB8_COLS = "best_streak,perks,skills,max_formations,formation_score,crits,wins,crit_bonus_score,best_trick_score";
// #217 Master-Board: mastery_grade (gespielter Rang; NULL = normaler Lauf) + deck_snapshot (finale Aufstellung, nur Meister-Läufe).
const MASTER_COLS = "mastery_grade,deck_snapshot";
// #229 N2: `id` mitselektieren → die Eigen-Zeile lässt sich im Board EINDEUTIG markieren (statt per name+score-Heuristik).
// #205: `seed` mitselektieren → Board-Einträge sind nachspielbar (Challenge) + Challenge-Board (Top-3 pro Seed).
const COLS_FULL = `id,name,score,level,tricks,cycles,archetypes,${FB8_COLS},${MASTER_COLS},seed,created_at`;
const COLS_ARCH = "id,name,score,level,tricks,cycles,archetypes,created_at";
const COLS_BASE = "id,name,score,level,tricks,cycles,created_at";
// Payload-Felder, die es in COLS_FULL, aber nicht in COLS_ARCH gibt (zum Stripen beim publish, falls die Spalten fehlen):
// #169 FB-8-Detailfelder + #217 Master-Felder (mastery_grade/deck_snapshot) + #205 seed.
const EXTRA_FIELDS = ["best_streak", "perks", "skills", "max_formations", "formation_score", "crits", "wins", "crit_bonus_score", "best_trick_score", "mastery_grade", "deck_snapshot", "seed"];
const omit = (obj, keys) => { const o = { ...obj }; for (const kk of keys) delete o[kk]; return o; };

// Top-N global (NORMALES Board): Score↓, bei Gleichstand mehr Stiche, dann jünger. Fallback-Kaskade bei fehlenden
// Spalten. #217: zeigt NUR normale Läufe (mastery_grade is null) — Meister-Läufe leben im Master-Board (fetchMasterTop).
export async function fetchGlobalTop(limit = 10) {
  const url = (cols) => `${REST}?select=${cols}&mastery_grade=is.null&order=score.desc,tricks.desc,created_at.desc&limit=${limit}`;
  let res;
  for (const cols of [COLS_FULL, COLS_ARCH, COLS_BASE]) {
    res = await fetch(url(cols), { headers });
    if (res.status !== 400) break; // 400 = Spalte fehlt (Migration steht aus) → nächste Stufe
  }
  if (!res.ok) throw new Error(`fetchGlobalTop ${res.status}`);
  return res.json();
}

// #217 Master-Board (getrennte Boards je Rang): Top-N der Meister-Läufe auf GENAU diesem Rang (mastery_grade = grade),
// Score↓. Nutzt COLS_FULL (inkl. deck_snapshot → die eigene finale Aufstellung; fremde bleiben per Anti-Copy verdeckt).
// Kein Kaskaden-Fallback: die Master-Spalten existieren erst nach der Migration (docs/supabase-schema.sql) — Aufrufer
// fängt den Fehler ab und zeigt „nicht verfügbar".
export async function fetchMasterTop(grade, limit = 10) {
  const g = Math.max(0, Math.floor(Number(grade) || 0));
  const res = await fetch(`${REST}?select=${COLS_FULL}&mastery_grade=eq.${g}&order=score.desc,tricks.desc,created_at.desc&limit=${limit}`, { headers });
  if (!res.ok) throw new Error(`fetchMasterTop ${res.status}`);
  return res.json();
}

// #205 Challenge-Board: Top-N der Läufe auf GENAU diesem Seed (seed = eq.<seed>), Score↓ — dieselbe Tabelle wie das
// globale Board (ein sauberes Schema, seed erstklassig + indiziert). Für den „Top-3 pro Seed"-Vergleich im
// Challenges-Reiter. Ungültiger Seed → []; kein Kaskaden-Fallback (seed-Spalte existiert erst nach der Migration).
export async function fetchSeedTop(seed, limit = 3) {
  const s = Number(seed);
  if (!Number.isFinite(s)) return [];
  const res = await fetch(`${REST}?select=${COLS_FULL}&seed=eq.${s >>> 0}&order=score.desc,tricks.desc,created_at.desc&limit=${limit}`, { headers });
  if (!res.ok) throw new Error(`fetchSeedTop ${res.status}`);
  return res.json();
}

// Lauf veröffentlichen. entry: { name, score, level, tricks, cycles, archetypes?, + FB-8-Detailfelder? }.
// Hinweis: `level` = Rundenzahl (= cycles); die Spalte bleibt aus Kompatibilität mit der bestehenden Tabelle befüllt.
// Fallback-Kaskade beim Insert: volles Schema → ohne FB-8-Spalten → ohne `archetypes` (Basis).
export async function publishRun(entry) {
  if (PREVIEW) return; // Preview-Build: kein Schreiben ins echte Leaderboard.
  // #241 Wurzelfix: die bigint-Spalten (score/formation_score/crit_bonus_score/best_trick_score/seed) dulden nur GANZE
  // Zahlen — die Engine-Scores sind aber Floats (aus multiplizierten Werten). Ein Float-Insert antwortet mit 400, die
  // Fallback-Kaskade degradiert dann auf `noExtra` und ALLE Detailfelder (auch die ganzzahligen wie best_streak/seed)
  // gehen still verloren (= der #197-Datenverlust). Darum vor dem Posten runden.
  const BIGINT_INT = ["score", "formation_score", "crit_bonus_score", "best_trick_score", "seed"];
  entry = { ...entry };
  for (const f of BIGINT_INT) if (typeof entry[f] === "number" && Number.isFinite(entry[f])) entry[f] = Math.round(entry[f]);
  const post = (body) => fetch(REST, {
    method: "POST",
    // #229 N2: return=representation → die eingefügte Zeile (inkl. server-seitiger id/created_at) kommt zurück.
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  const hasExtra = EXTRA_FIELDS.some((f) => entry[f] !== undefined);
  const noExtra = hasExtra ? omit(entry, EXTRA_FIELDS) : entry;
  const attempts = [entry];
  if (hasExtra) attempts.push(noExtra);
  if (noExtra.archetypes !== undefined) attempts.push(omit(noExtra, ["archetypes"]));
  let res;
  for (let i = 0; i < attempts.length; i++) {
    res = await post(attempts[i]);
    if (res.status !== 400) break; // 400 = Spalte fehlt → nächste (kleinere) Stufe versuchen
    // #197: 400 nicht still schlucken — sonst gehen die FB-8-Detaildaten dauerhaft verloren, ohne
    // dass ein Schema-Drift (z. B. varchar-Längenlimit statt text) je auffällt. Response-Body loggen,
    // solange es noch eine kleinere Stufe gibt, auf die wir degradieren. Best-effort: das Logging darf
    // die Fallback-Kaskade niemals brechen (fehlendes res.text im Test-Mock/Nicht-Response ignorieren).
    if (i < attempts.length - 1) {
      const detail = typeof res.text === "function" ? await res.text().catch(() => "") : "";
      console.warn(`publishRun: Insert → 400, degradiere zur nächsten Spalten-Stufe (möglicher Schema-Drift, siehe #197).${detail ? ` Response: ${detail}` : ""}`);
    }
  }
  if (!res.ok) throw new Error(`publishRun ${res.status}`);
  // #229 N2: die eingefügte Zeile (mit id) zurückgeben, damit der Aufrufer den eigenen Lauf im Board eindeutig
  // markieren kann. Defensiv: fehlendes/leeres json (Test-Mock, oder Server ohne representation) → null.
  try {
    const saved = typeof res.json === "function" ? await res.json() : null;
    return Array.isArray(saved) ? saved[0] : saved;
  } catch (e) { return null; }
}
