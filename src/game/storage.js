import { GHOST_STEP } from "./constants.js";

/* Preview-Build (Testbranch auf /autostich/test/) teilt sich die Origin mit der echten
   Seite → derselbe localStorage. Ein Präfix trennt die Namespaces, damit Test-Runs den
   echten Geist/Highscore nicht überschreiben. Produktions-/Dev-Build: kein Präfix (P=""). */
const P = import.meta.env.VITE_PREVIEW === "1" ? "preview_" : "";
const k = (key) => P + key;

/* Persistenz — lokaler Rekord überlebt Reload via localStorage.

   GEIST (Rekord-Vergleich, getrennt von der Highscore-Liste):
   traj[k] = Score nach (k+1)·GHOST_STEP Stichen des Rekordlaufs. Damit lässt sich
   der aktuelle Lauf „an genau dieser Stelle" gegen den Rekord vergleichen. */
export function loadGhost() {
  try {
    const raw = localStorage.getItem(k("as_ghost"));
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
  try { localStorage.setItem(k("as_ghost"), JSON.stringify({ traj, total, step: GHOST_STEP })); } catch (e) {}
}

/* Lokaler Nickname (#14) — hängt an globalen Highscore-Einträgen. Leer ⇒ „erster Start". */
export function loadUsername() {
  try { return localStorage.getItem(k("as_username")) || ""; } catch (e) { return ""; }
}
export function saveUsername(name) {
  try { localStorage.setItem(k("as_username"), name); } catch (e) {}
}

/* Lokale Highscore-Liste (Top 5) — getrennt vom Geist.
   Eintrag: { score, level, tricks, cycles, ts } + #169-FB-8-Run-Rückblick (bestStreak, perks[], skills[],
   maxFormations, formationScore, crits, wins, critBonusScore, bestTrickScore) für die Detailansicht.
   Additiv — Alt-Einträge ohne die Zusatzfelder degradieren sauber (RunStats zeigt „–" bzw. blendet aus). */
export function loadHighscores() {
  try {
    const raw = localStorage.getItem(k("as_highscores"));
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
  try { localStorage.setItem(k("as_highscores"), JSON.stringify(top)); } catch (e) {}
  return top;
}

/* LAUF-HISTORIE + PROFIL (#172 FB-10) — Basis für den Statistik-Hub. Getrennt von der Top-5-Highscore-
   Liste: dort zählt nur der Score (Top 5), hier der VERLAUF (letzte N Läufe, chronologisch neueste zuerst)
   plus kumulierte All-Time-Totals, die auch dann stimmen, wenn Läufe aus dem gedeckelten Verlauf fallen.
   Rein lokal (kein Supabase). Ein Lauf-Record = derselbe Statblock wie ein Highscore-Eintrag (#169 FB-8)
   + `durationMs` (Lauf-Dauer) + `archetypes[]` (im Lauf genutzte Skill-Archetypen, unique).
   Alle Zusatzfelder sind optional → Alt-Daten/Teil-Records degradieren sauber in der Aggregation. */
export const RUN_HISTORY_CAP = 30;

export function loadRunHistory() {
  try {
    const raw = localStorage.getItem(k("as_runhistory"));
    if (raw) { const l = JSON.parse(raw); if (Array.isArray(l)) return l; }
  } catch (e) {}
  return [];
}

const DEFAULT_PROFILE = { games: 0, totalScore: 0, totalDurationMs: 0, bestScore: 0, bestStreak: 0, maxCrits: 0, archetypesEver: [], firstTs: 0,
  hadNoBuyRun: false, hadMonoStatRun: false }; // #190: sticky Challenge-Flags (einmal true → bleiben) für deck_c3/deck_c4
export function loadProfile() {
  try {
    const raw = localStorage.getItem(k("as_profile"));
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === "object")
        return { ...DEFAULT_PROFILE, ...p, archetypesEver: Array.isArray(p.archetypesEver) ? p.archetypesEver : [] };
    }
  } catch (e) {}
  return { ...DEFAULT_PROFILE };
}

const n0 = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);

/* #190 Challenge-Erkennung — reine Funktionen, arbeiten NUR auf dem Run-Record (kein localStorage), unit-testbar.
   `completed` (in App.saveRun gesetzt) = nur ein NATÜRLICH abgeschlossener Lauf (cycle === MAX_CYCLES); ein
   freiwilliges Beenden zählt NICHT.
   - noBuyRun:    kompletter Lauf ohne einen einzigen Shop-Kauf (record.shopPurchases === 0).
   - monoStatRun: kompletter Lauf, in dem IMMER derselbe Stat gewählt wurde (alle record.statPicks identisch). */
export const MONO_STAT_MIN = 5; // Mindestzahl Stat-Picks, damit „immer derselbe" zählt (ein voller Lauf hat 11)
export function isNoBuyRun(record) {
  return !!record && record.completed === true && n0(record.shopPurchases) === 0;
}
export function isMonoStatRun(record) {
  if (!record || record.completed !== true) return false;
  const picks = Array.isArray(record.statPicks) ? record.statPicks : [];
  return picks.length >= MONO_STAT_MIN && picks.every((s) => s === picks[0]);
}

// Einen abgeschlossenen Lauf in die Historie voranstellen (auf CAP gedeckelt) UND die kumulierten
// Profil-Totals fortschreiben. Gibt { history, profile } für ein sofortiges UI-Update zurück.
export function recordRun(record) {
  const history = [record, ...loadRunHistory()].slice(0, RUN_HISTORY_CAP);
  try { localStorage.setItem(k("as_runhistory"), JSON.stringify(history)); } catch (e) {}
  const p = loadProfile();
  const arch = new Set(p.archetypesEver);
  for (const a of (record.archetypes || [])) arch.add(a);
  const profile = {
    games: p.games + 1,
    totalScore: p.totalScore + n0(record.score),
    totalDurationMs: p.totalDurationMs + n0(record.durationMs),
    bestScore: Math.max(p.bestScore, n0(record.score)),
    bestStreak: Math.max(p.bestStreak, n0(record.bestStreak)),
    maxCrits: Math.max(p.maxCrits, n0(record.crits)),
    archetypesEver: [...arch],
    firstTs: p.firstTs || n0(record.ts),
    // #190: sticky Challenge-Flags — einmal erfüllt, bleiben sie true (schalten deck_c3/deck_c4 frei).
    hadNoBuyRun: !!p.hadNoBuyRun || isNoBuyRun(record),
    hadMonoStatRun: !!p.hadMonoStatRun || isMonoStatRun(record),
  };
  try { localStorage.setItem(k("as_profile"), JSON.stringify(profile)); } catch (e) {}
  return { history, profile };
}

/* OPTIONEN (#41) — bewusst als erweiterbares Objekt (künftig Sound, Tempo-Default …).
   `skin`: "crt" (Retro-CRT-Skin, jetzt Default) | "off" (schlichter Look).
   Default = "crt": Erstbesuch zeigt den Skin; wer ihn explizit ausschaltet, behält
   das dank gespeichertem { skin: "off" } auch nach Reload (loadOptions merged über Default).
   `deckId`/`battlefieldId` (#190): gewähltes kosmetisches Deck-/Battlefield-Skin (Default = aktueller
   Look). Merge über Default degradiert Alt-Daten sauber; die UI fällt zusätzlich defensiv auf "default"
   zurück, falls ein gespeicherter Skin (noch) nicht existiert oder nicht mehr freigeschaltet ist. */
const DEFAULT_OPTIONS = { skin: "crt", muted: false, sfxVol: 0.4, musicVol: 0.2, deckId: "default", battlefieldId: "default" }; // #110/#111 Sound + #190 Kosmetik
export function loadOptions() {
  try {
    const raw = localStorage.getItem(k("as_options"));
    if (raw) { const o = JSON.parse(raw); if (o && typeof o === "object") return { ...DEFAULT_OPTIONS, ...o }; }
  } catch (e) {}
  return { ...DEFAULT_OPTIONS };
}
export function saveOptions(opts) {
  try { localStorage.setItem(k("as_options"), JSON.stringify(opts)); } catch (e) {}
  return opts;
}

/* Anleitung-einmal-gesehen (#12) — hier zentral, damit der Preview-Namespace (P) auch
   diesen Key trennt und der Test-Build den Erstbesuch-Zustand der echten Seite nicht setzt. */
export function loadSeenGuide() {
  try { return !!localStorage.getItem(k("as_seen_guide")); } catch (e) { return false; }
}
export function saveSeenGuide() {
  try { localStorage.setItem(k("as_seen_guide"), "1"); } catch (e) {}
}
