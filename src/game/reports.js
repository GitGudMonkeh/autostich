/* FEEDBACK-MELDER — Transport (#396).

   Gebaut wie src/game/leaderboard.js: PostgREST per nacktem `fetch`, öffentlicher Publishable Key,
   RLS als Schutz. Kein neuer Baustein, keine Dependency, kein zweiter Account.

   ⚠ UNTERSCHIED zum Leaderboard: dort schreibt der Preview-Build BEWUSST NICHT (Test-Läufe sollen
   die echte Rangliste nicht verunreinigen). Hier ist es genau umgekehrt — die Preview-Builds SIND
   die Playtest-Builds, aus denen die Reports kommen. Der Melder schreibt in JEDER Umgebung;
   unterschieden wird über die Spalte `build_env`.

   Reine Transport-Schicht: kein React, kein localStorage. Das Parken eines fehlgeschlagenen
   Entwurfs macht der Aufrufer (storage.js) — so bleibt diese Datei testbar ohne Browser. */
const BASE = import.meta.env.VITE_SUPABASE_URL;
const KEY  = import.meta.env.VITE_SUPABASE_KEY;

export const reportsConfigured = !!(BASE && KEY);

const REST = `${BASE}/rest/v1/autostich_reports`;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// Die Spalten der Tabelle (docs/autostich-reports-schema.sql). Alles andere wird vor dem Senden
// verworfen — ein unbekanntes Feld beantwortet PostgREST mit 400 und der ganze Report wäre weg.
const COLUMNS = ["kind", "message", "name", "version", "build_env", "seed", "cycle", "score",
  "deck", "battlefield", "ua", "viewport", "errors"];

// Ganzzahl-Spalten (bigint/integer). Ein Float-Insert antwortet mit 400 — derselbe Fallstrick wie
// #241 beim Leaderboard, deshalb hier vorbeugend runden statt darauf zu vertrauen, dass der
// Aufrufer saubere Zahlen liefert.
const INT_COLUMNS = ["seed", "cycle", "score"];

/* Auf die Tabellenform bringen: nur bekannte Spalten, Zahlen ganzzahlig, leere Strings zu null
   (eine leere Zelle im Dashboard liest sich besser als ""). Rein → unit-testbar. */
export function toRow(entry) {
  const row = {};
  for (const c of COLUMNS) {
    let v = entry ? entry[c] : undefined;
    if (v === undefined || v === null) continue;
    if (INT_COLUMNS.includes(c)) {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      v = Math.round(n);
    } else {
      v = String(v).trim();
      if (!v) continue;
      // #health-check S2: Gürtel zur Hose — das Textfeld deckelt bei 1000 Zeichen, ein direkter
      // Aufrufer nicht. 4000 ist grosszügig und hält Multi-MB-Zeilen aus der Tabelle.
      if (c === "message") v = [...v].slice(0, 4000).join("");
    }
    row[c] = v;
  }
  return row;
}

/* Einen Report absenden. Wirft bei Fehlschlag — der Aufrufer parkt den Entwurf dann und versucht
   es beim nächsten Menü-Besuch erneut. Bewusst KEINE Fallback-Kaskade wie beim Leaderboard: die
   Tabelle ist neu und hat von Anfang an alle Spalten; eine Kaskade würde einen Schema-Fehler nur
   verstecken, statt ihn beim ersten Test sichtbar zu machen. */
export async function submitReport(entry) {
  if (!reportsConfigured) throw new Error("reports: nicht konfiguriert");
  const res = await fetch(REST, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(toRow(entry)),
  });
  if (!res.ok) {
    // Den Body mitnehmen: bei 400 steht dort, WELCHE Spalte fehlt oder zu kurz ist — ohne ihn
    // sucht man denselben Schema-Drift wie bei #197 wieder blind.
    let detail = "";
    try { detail = (await res.text()).slice(0, 300); } catch (e) { /* Body egal, Status zählt */ }
    throw new Error(`submitReport ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return true;
}
