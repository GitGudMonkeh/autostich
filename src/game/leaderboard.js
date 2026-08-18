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
//  - COLS_TREE: alles inkl. #global-Baumstand (`tree_nodes`) — die oberste Stufe.
//  - COLS_FULL: alles inkl. #169-FB-8-Detailspalten (Run-Rückblick).
//  - COLS_ARCH: nur bis `archetypes` (#139) — Zwischenstufe, damit die Icons NICHT ausfallen, solange nur die
//    FB-8-Spalten noch fehlen.
//  - COLS_BASE: ganz ohne Zusatzspalten (Ur-Tabelle).
const FB8_COLS = "best_streak,perks,skills,max_formations,formation_score,crits,wins,crit_bonus_score,best_trick_score";
// #229 N2: `id` mitselektieren → die Eigen-Zeile lässt sich im Board EINDEUTIG markieren (statt per name+score-Heuristik).
// #205: `seed` mitselektieren → Board-Einträge sind nachspielbar (Challenge) + Challenge-Board (Top-3 pro Seed).
const COLS_FULL = `id,name,score,level,tricks,cycles,archetypes,${FB8_COLS},seed,board,created_at`;
const COLS_ARCH = "id,name,score,level,tricks,cycles,archetypes,created_at";
const COLS_BASE = "id,name,score,level,tricks,cycles,created_at";
// #global: NEUE oberste Stufe — `tree_nodes` (wie viele der 27 Upgrade-Baum-Knoten der Lauf hatte). Sie steht ganz
// vorn statt in COLS_FULL, damit ein fehlendes `tree_nodes` NUR den Baumstand kostet und nicht die FB-8-Spalten
// mit sich reißt (COLS_FULL bleibt exakt die Stufe, die es vorher war).
const COLS_TREE = `${COLS_FULL},tree_nodes`;
// Die Spalten-Kaskade als EINE Liste — vorher stand dieselbe Aufzählung in jedem Abruf einzeln, und eine neue
// Stufe hätte an drei Stellen nachgetragen werden müssen.
// Exportiert, weil der Datenschutz-Wächter (test/privacy.test.js) die oberste Stufe als DIE Liste dessen
// liest, was das Board speichert — so erzwingt eine neue Spalte eine Entscheidung über den Hinweistext,
// statt still an ihm vorbeizulaufen.
export const COL_STAGES = [COLS_TREE, COLS_FULL, COLS_ARCH, COLS_BASE];
// #global: Das Global-Board zeigt NUR Casual-Läufe. Ranglisten-Läufe fahren auf fixer Baseline (der Upgrade-Baum
// ist dort wirkungslos) — mit einer Baum-Anzeige nebeneinander gestellt behaupteten sie einen Vorteil, den es
// in ihrer Zeile gar nicht gab. Sie stehen im Wochen-Board (fetchBoardTop) und nur dort.
const CASUAL_ONLY = "&board=is.null";
// Payload-Felder, die es in COLS_FULL, aber nicht in COLS_ARCH gibt (zum Stripen beim publish, falls die Spalten fehlen):
// #169 FB-8-Detailfelder + #205 seed + §7 board. Fehlt eine Spalte, wird das Feld beim publish still gestript (kein
// Datenverlust am ganzen Insert) — so ist die Deploy-Reihenfolge Code↔Schema egal (wichtig fürs Main-Merge).
const EXTRA_FIELDS = ["best_streak", "perks", "skills", "max_formations", "formation_score", "crits", "wins", "crit_bonus_score", "best_trick_score", "seed", "board"];
// #global: `tree_nodes` hat eine EIGENE Stufe und steckt bewusst NICHT in EXTRA_FIELDS — das ist eine Gruppe, die
// als Ganzes fällt. Läge der Baumstand darin, verlöre eine fehlende `tree_nodes`-Spalte auch alle FB-8-Detailfelder.
const TREE_FIELD = ["tree_nodes"];
const omit = (obj, keys) => { const o = { ...obj }; for (const kk of keys) delete o[kk]; return o; };

// Top-N global (ALLE Läufe, ungefiltert): Score↓, bei Gleichstand mehr Stiche, dann jünger. Fallback-Kaskade bei fehlenden Spalten.
export async function fetchGlobalTop(limit = 10) {
  const url = (cols, filter) => `${REST}?select=${cols}${filter}&order=score.desc,tricks.desc,created_at.desc&limit=${limit}`;
  let res;
  /* ZWEI unabhängige Degradationen, deshalb zwei Schleifen:
       innen  — fehlende SPALTEN (die gewohnte Kaskade),
       außen  — eine fehlende `board`-SPALTE, die den Casual-Filter unmöglich macht.
     Ohne den zweiten Anlauf stünde das Global-Board auf einem nicht-migrierten Schema komplett LEER da (jede
     innere Stufe 400t am Filter, nicht an den Spalten), statt einfach ungefiltert zu zeigen. */
  for (const filter of [CASUAL_ONLY, ""]) {
    for (const cols of COL_STAGES) {
      res = await fetch(url(cols, filter), { headers });
      if (res.status !== 400) break; // 400 = Spalte fehlt (Migration steht aus) → nächste Stufe
    }
    if (res.status !== 400) break;   // Spalten durch → der Filter war nicht das Problem
  }
  if (!res.ok) throw new Error(`fetchGlobalTop ${res.status}`);
  return res.json();
}

// §7 (Schritt 6) Getrennte Ranglisten-Boards: Top-N der Läufe GENAU eines Boards (board = eq.<board>), Score↓.
//   board = 'standard' (tree-unabhängige Baseline) | 'meister' (voller Baum). Casual-Läufe (board is null) tauchen
//   hier NIE auf (§7 „kein Leaderboard-Zwang"). Robust fürs Main-Merge: fehlt die `board`-Spalte noch (Schema nicht
//   migriert), antworten ALLE Kaskadenstufen mit 400 (der board=eq-Filter braucht die Spalte) → [] statt Fehler, das
//   Board zeigt schlicht „noch keine Einträge", bis die Spalte existiert + getaggte Läufe eintreffen.
// `seed` (optional) grenzt zusätzlich auf GENAU diesen Lauf-Seed ein → das Meister-Wochen-Board
// (board=meister + seed=<Wochen-Seed>). Ohne seed = das ganze Board (Standard = Allzeit über alle Seeds).
export async function fetchBoardTop(board, limit = 10, seed = null) {
  const b = encodeURIComponent(String(board));
  const seedFilter = (seed != null && Number.isFinite(Number(seed))) ? `&seed=eq.${Number(seed) >>> 0}` : "";
  const url = (cols) => `${REST}?select=${cols}&board=eq.${b}${seedFilter}&order=score.desc,tricks.desc,created_at.desc&limit=${limit}`;
  let res;
  for (const cols of COL_STAGES) {
    res = await fetch(url(cols), { headers });
    if (res.status !== 400) break;
  }
  if (res.status === 400) return []; // `board`-Spalte fehlt noch → leeres Board (graceful, kein Crash)
  if (!res.ok) throw new Error(`fetchBoardTop ${res.status}`);
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
// Fallback-Kaskade beim Insert: volles Schema → ohne `tree_nodes` → ohne FB-8-Spalten → ohne `archetypes` (Basis).
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
  // #global: Erste Rückfallstufe ist NUR der Baumstand — eine fehlende `tree_nodes`-Spalte darf nicht die
  // FB-8-Detailfelder mitnehmen (dieselbe Trennung wie bei COLS_TREE/COLS_FULL im Abruf).
  const noTree = entry.tree_nodes !== undefined ? omit(entry, TREE_FIELD) : entry;
  const hasExtra = EXTRA_FIELDS.some((f) => noTree[f] !== undefined);
  const noExtra = hasExtra ? omit(noTree, EXTRA_FIELDS) : noTree;
  const attempts = [entry];
  if (noTree !== entry) attempts.push(noTree);
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
