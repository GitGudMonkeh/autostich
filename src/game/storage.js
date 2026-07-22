import { GHOST_STEP } from "./constants.js";

/* Persistenz — lokaler Rekord überlebt Reload via localStorage.

   GEIST (Rekord-Vergleich, getrennt von der Highscore-Liste):
   traj[k] = Score nach (k+1)·GHOST_STEP Stichen des Rekordlaufs. Damit lässt sich
   der aktuelle Lauf „an genau dieser Stelle" gegen den Rekord vergleichen. */
export function loadGhost() {
  try {
    const raw = localStorage.getItem("as_ghost");
    if (raw) {
      const g = JSON.parse(raw);
      // step-Wechsel invalidiert alte Trajektorien (nicht mehr vergleichbar).
      if (g && Array.isArray(g.traj) && g.step === GHOST_STEP)
        return { traj: g.traj, total: g.total || 0, step: g.step };
    }
  } catch (e) {}
  return { traj: [], total: 0, step: GHOST_STEP };
}
export function saveGhost(traj, total) {
  try { localStorage.setItem("as_ghost", JSON.stringify({ traj, total, step: GHOST_STEP })); } catch (e) {}
}

/* Lokale Highscore-Liste (Top 5) — getrennt vom Geist.
   Eintrag: { score, level, tricks, cycles, ts }. */
export function loadHighscores() {
  try {
    const raw = localStorage.getItem("as_highscores");
    if (raw) { const l = JSON.parse(raw); if (Array.isArray(l)) return l; }
  } catch (e) {}
  return [];
}
// Reine Rang-Logik (ohne localStorage → unit-testbar): Score↓, bei Gleichstand mehr
// Stiche, dann jünger. Top 5.
export function rankHighscores(list, entry) {
  return [...list, entry]
    .sort((a, b) => b.score - a.score || b.tricks - a.tricks || b.ts - a.ts)
    .slice(0, 5);
}
// Neuen Lauf einsortieren + persistieren. Gibt die neue Top-5-Liste zurück.
export function recordHighscore(entry) {
  const top = rankHighscores(loadHighscores(), entry);
  try { localStorage.setItem("as_highscores", JSON.stringify(top)); } catch (e) {}
  return top;
}

/* OPTIONEN (#41) — bewusst als erweiterbares Objekt (künftig Sound, Tempo-Default …).
   `skin`: "crt" (Retro-CRT-Skin, jetzt Default) | "off" (schlichter Look).
   Default = "crt": Erstbesuch zeigt den Skin; wer ihn explizit ausschaltet, behält
   das dank gespeichertem { skin: "off" } auch nach Reload (loadOptions merged über Default). */
const DEFAULT_OPTIONS = { skin: "crt" };
export function loadOptions() {
  try {
    const raw = localStorage.getItem("as_options");
    if (raw) { const o = JSON.parse(raw); if (o && typeof o === "object") return { ...DEFAULT_OPTIONS, ...o }; }
  } catch (e) {}
  return { ...DEFAULT_OPTIONS };
}
export function saveOptions(opts) {
  try { localStorage.setItem("as_options", JSON.stringify(opts)); } catch (e) {}
  return opts;
}
