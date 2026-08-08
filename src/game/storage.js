import { GHOST_STEP } from "./constants.js";
import { advanceGrade } from "./mastery.js";
import { onboardingAfter, spForRun, isSpRun } from "./progression.js";

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

/* Lokale Highscore-Liste (Top 20) — getrennt vom Geist.
   Eintrag: { score, level, tricks, cycles, ts } + #169-FB-8-Run-Rückblick (bestStreak, perks[], skills[],
   maxFormations, formationScore, buildingScore, crits, wins, critBonusScore, bestTrickScore) für die Detailansicht.
   Additiv — Alt-Einträge ohne die Zusatzfelder degradieren sauber (RunStats zeigt „–" bzw. blendet aus). */
export const HIGHSCORE_CAP = 20; // #217 Bestenliste: „Meine Runs"/„Master" listen bis zu 20 → echte All-Time-Top-20 (vorher 5)
export function loadHighscores() {
  try {
    const raw = localStorage.getItem(k("as_highscores"));
    if (raw) { const l = JSON.parse(raw); if (Array.isArray(l)) return l; }
  } catch (e) {}
  return [];
}
// Reine Rang-Logik (ohne localStorage → unit-testbar): Score↓, bei Gleichstand mehr
// Stiche, dann jünger. Top HIGHSCORE_CAP (20).
export function rankHighscores(list, entry) {
  return [...list, entry]
    .sort((a, b) => b.score - a.score || b.tricks - a.tricks || b.ts - a.ts)
    .slice(0, HIGHSCORE_CAP);
}
// Neuen Lauf einsortieren + persistieren. Gibt die neue Top-Liste zurück.
export function recordHighscore(entry) {
  const top = rankHighscores(loadHighscores(), entry);
  try { localStorage.setItem(k("as_highscores"), JSON.stringify(top)); } catch (e) {}
  return top;
}

/* LAUF-HISTORIE + PROFIL (#172 FB-10) — Basis für den Statistik-Hub. Getrennt von der Top-5-Highscore-
   Liste: dort zählt nur der Score (Top 20), hier der VERLAUF (letzte N Läufe, chronologisch neueste zuerst)
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

// #229 T11: Schema-Version des Profil-Blobs — der schema-fragilste Persistenz-Teil (masteryGrade-Skala,
// monoArchetypeRuns-Form). Bei einem breaking change hochzählen UND einen Migrations-Block in migrateProfile
// anhängen. Andere Keys (Ghost/Highscores/Optionen) degradieren weiter rein additiv über Merge-über-Default
// und brauchen keine Versionierung.
// v2 (Progression/Upgrades, docs §9): das Profil bekommt die SP-/Baum-/Onboarding-Felder. Rein additiv, aber
// als eigene Schema-Epoche markiert (Migrations-Anker für spätere Baum-Umformungen).
export const PROFILE_SCHEMA_VERSION = 2;
const DEFAULT_PROFILE = { schemaVersion: PROFILE_SCHEMA_VERSION,
  games: 0, totalScore: 0, totalDurationMs: 0, bestScore: 0, bestStreak: 0, maxCrits: 0, archetypesEver: [], firstTs: 0,
  hadNoRerollRun: false, // #214: sticky Challenge-Flag (einmal true → bleibt); noReroll = Sparfuchs deck_c3. (#267: hadMonoStatRun entfernt — die Stat-Phase ist weg.)
  monoArchetypeRuns: {}, hadAllArchetypesRun: false, // #215: Mono-Archetyp-Läufe je Fraktion (Map) + Element-Bund (alle 4) → deck_c5..c9
  masteryGrade: 0, // #217: laufübergreifender Meistergrad (0..5), sequentiell freigeschaltet über Score-Schwellen
  // Progression/Upgrades (docs §1/§4/§6): SP-Guthaben + ausgegeben (Respec/Anzeige), gekaufte Baum-Knoten
  // ({[id]: level}), weiteste Onboarding-Stufe (0..6) und Zähler der SP-Läufe (Treue-Drip-Basis).
  stichPoints: 0, stichSpent: 0, nodes: {}, onboarding: 0, spRuns: 0 };

/* #229 T11: reiner, stufenweiser Migrations-Switch für den Profil-Blob (kein localStorage → unit-testbar).
   Migriert von der gespeicherten Version hoch bis zur aktuellen; jeder Block transformiert v → v+1 und ist
   idempotent (ein bereits aktuelles Profil bleibt unverändert). Ein unversioniertes Alt-Profil gilt als v0.
   Neue breaking changes: PROFILE_SCHEMA_VERSION erhöhen + hier einen `if (v < N)`-Block anhängen. */
export function migrateProfile(p) {
  if (!p || typeof p !== "object") return p;
  let v = typeof p.schemaVersion === "number" ? p.schemaVersion : 0;
  const out = { ...p };
  if (v < 1) {
    // v0 (unversioniert) → v1 (aktuelle Baseline): Alt-Profile sind strukturell bereits v1-kompatibel — fehlende
    // Felder füllt loadProfile über DEFAULT_PROFILE. Hier ist nur die Versions-Markierung nötig, keine Transformation.
    v = 1;
  }
  if (v < 2) {
    // v1 → v2 (Progression/Upgrades): SP-/Baum-/Onboarding-Felder ergänzen. Rein additiv — loadProfile füllt sie
    // ohnehin über DEFAULT_PROFILE; hier explizit zu seeden macht ein frisch migriertes Profil selbst-konsistent.
    if (typeof out.stichPoints !== "number") out.stichPoints = 0;
    if (typeof out.stichSpent !== "number") out.stichSpent = 0;
    if (!out.nodes || typeof out.nodes !== "object") out.nodes = {};
    if (typeof out.onboarding !== "number") out.onboarding = 0;
    if (typeof out.spRuns !== "number") out.spRuns = 0;
    v = 2;
  }
  out.schemaVersion = v;
  return out;
}
export function loadProfile() {
  try {
    const raw = localStorage.getItem(k("as_profile"));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const p = migrateProfile(parsed); // erst hochmigrieren, dann über Default mergen (füllt fehlende Felder)
        return { ...DEFAULT_PROFILE, ...p,
          archetypesEver: Array.isArray(p.archetypesEver) ? p.archetypesEver : [],
          monoArchetypeRuns: (p.monoArchetypeRuns && typeof p.monoArchetypeRuns === "object") ? p.monoArchetypeRuns : {},
          nodes: (p.nodes && typeof p.nodes === "object") ? p.nodes : {} };
      }
    }
  } catch (e) {}
  // #195: frisches archetypesEver-Array + #215 frische monoArchetypeRuns-Map + Baum-nodes, damit der Leer-/Korrupt-Pfad
  // NICHT die mutablen Referenzen aus DEFAULT_PROFILE teilt (ein späterer push/Zuweisung würde sonst den Modul-Default vergiften).
  return { ...DEFAULT_PROFILE, archetypesEver: [], monoArchetypeRuns: {}, nodes: {} };
}

// Profil-Blob persistieren (mit aktueller Schema-Version gestempelt). Für die Baum-Kauf-/Respec-Flows
// (progression.buyNode/respec liefern ein neues Profil → hier speichern). recordRun schreibt separat.
export function saveProfile(profile) {
  const out = { ...profile, schemaVersion: PROFILE_SCHEMA_VERSION };
  try { localStorage.setItem(k("as_profile"), JSON.stringify(out)); } catch (e) {}
  return out;
}

// Test-/Dev-Reset (geheimer Seed-Code `reset`): löscht Profil + Lauf-Fortschritt → Erstbesuch-Zustand,
// Onboarding startet neu. Betroffen: Profil (Progression/Stats/Freischalt-Flags), Highscores, Geist-Rekord,
// Lauf-Verlauf, aktiver Lauf und „Anleitung gesehen". Präferenzen (Optionen/Lautstärke/Skin-Wahl, Name)
// bleiben bewusst erhalten — nicht-freigeschaltete Skins fallen in der UI ohnehin auf „default" zurück.
// Nur im Preview-Build von der UI aufrufbar.
export const RESET_KEYS = ["as_profile", "as_highscores", "as_ghost", "as_runhistory", "as_activerun", "as_seen_guide"];
export function wipeProfileStorage() {
  for (const key of RESET_KEYS) {
    try { localStorage.removeItem(k(key)); } catch (e) {}
  }
}

const n0 = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);

/* #190 Challenge-Erkennung — reine Funktionen, arbeiten NUR auf dem Run-Record (kein localStorage), unit-testbar.
   `completed` (in App.saveRun gesetzt) = nur ein NATÜRLICH abgeschlossener Lauf (cycle === MAX_CYCLES); ein
   freiwilliges Beenden zählt NICHT. (#267: monoStatRun entfernt — die Stat-Phase ist weg.) */
// #229 T12: isNoBuyRun/hadNoBuyRun entfernt — Shop ist seit #202 (Architekt) dormant, kein Deck nutzt noBuyRun mehr.
// #214 Sparfuchs (deck_c3): natürlicher Abschluss OHNE einen benutzten Reroll (record.rerollsUsed === 0).
export function isNoRerollRun(record) {
  return !!record && record.completed === true && n0(record.rerollsUsed) === 0;
}
/* #215 Archetyp-Decks — auf record.archetypes (Set der im Lauf gehaltenen Skill-Archetypen, App.jsx:196), nur bei
   natürlichem Abschluss (completed).
   - monoArchetypeOf: genau EIN Archetyp gehalten → dessen id ("fire"|"lightning"|"ice"|"plant"), sonst null.
   - isAllArchetypesRun: alle vier Archetypen im selben Lauf gehalten (Element-Bund). */
export function monoArchetypeOf(record) {
  if (!record || record.completed !== true) return null;
  const a = Array.isArray(record.archetypes) ? [...new Set(record.archetypes)] : [];
  return a.length === 1 ? a[0] : null;
}
export function isAllArchetypesRun(record) {
  if (!record || record.completed !== true) return false;
  const a = Array.isArray(record.archetypes) ? record.archetypes : [];
  return new Set(a).size === 4;
}

// Einen abgeschlossenen Lauf in die Historie voranstellen (auf CAP gedeckelt) UND die kumulierten
// Profil-Totals fortschreiben. Gibt { history, profile } für ein sofortiges UI-Update zurück.
export function recordRun(record) {
  const history = [record, ...loadRunHistory()].slice(0, RUN_HISTORY_CAP);
  try { localStorage.setItem(k("as_runhistory"), JSON.stringify(history)); } catch (e) {}
  const p = loadProfile();
  const arch = new Set(p.archetypesEver);
  for (const a of (record.archetypes || [])) arch.add(a);
  // #215: Mono-Archetyp-Läufe je Fraktion in einer sticky-Map sammeln (einmal erfüllt → bleibt).
  const monoArchetypeRuns = { ...(p.monoArchetypeRuns || {}) };
  const monoArch = monoArchetypeOf(record);
  if (monoArch) monoArchetypeRuns[monoArch] = true;
  // Progression/Upgrades (docs §4–§6): Onboarding rückt bei natürlichem Abschluss ein Glied vor; SP werden erst
  // NACH vollendetem Onboarding geerntet (Grundstock + Score-Meilensteine + Treue-Drip). spRuns zählt nur SP-Läufe.
  // Reine Regeln aus progression.js (Sim läuft profil-los → Baseline unberührt). stichSpent/nodes bleiben unangetastet
  // (nur Kauf/Respec im Baum ändern sie).
  const onboardingBefore = n0(p.onboarding);
  const gainedSp = spForRun(record, onboardingBefore, n0(p.spRuns));
  const profile = {
    schemaVersion: PROFILE_SCHEMA_VERSION, // #229 T11: gespeicherte Profile tragen die Version (Migrations-Anker)
    games: p.games + 1,
    totalScore: p.totalScore + n0(record.score),
    totalDurationMs: p.totalDurationMs + n0(record.durationMs),
    bestScore: Math.max(p.bestScore, n0(record.score)),
    bestStreak: Math.max(p.bestStreak, n0(record.bestStreak)),
    maxCrits: Math.max(p.maxCrits, n0(record.crits)),
    archetypesEver: [...arch],
    firstTs: p.firstTs || n0(record.ts),
    // #214: sticky Challenge-Flag — einmal erfüllt, bleibt es true. noReroll schaltet deck_c3 „Sparfuchs" frei.
    hadNoRerollRun: !!p.hadNoRerollRun || isNoRerollRun(record),
    // #215: Archetyp-Decks — Mono-Läufe je Fraktion (deck_c5..c8) + Element-Bund (alle vier, deck_c9).
    monoArchetypeRuns,
    hadAllArchetypesRun: !!p.hadAllArchetypesRun || isAllArchetypesRun(record),
    // #217: Rang-Leiter — NUR Meister-Läufe (record.masterRun) schalten den nächsten Rang frei (eigener Modus). Ein
    // Meister-Lauf schaltet höchstens den NÄCHSTEN Rang frei (advanceGrade prüft gegen die Rang+1-Schwelle; kein
    // Multi-Sprung; Score zählt, kein completed-Zwang). Normale Läufe lassen den Rang unverändert.
    // #226 Großmeister: der gespielte Rang (record.masteryGrade) gatet den Aufstieg — ab Meister V zählt nur ein Lauf
    // AUF dem aktuellen Max-Rang (sonst ließe sich die 50-M-Schwelle auf leichterem Ramp farmen).
    masteryGrade: record.masterRun ? advanceGrade(p.masteryGrade, n0(record.score), record.masteryGrade) : (p.masteryGrade || 0),
    // Progression/Upgrades: Guthaben wächst um den Lauf-Ertrag; ausgegebene SP + gekaufte Knoten bleiben unverändert.
    stichPoints: n0(p.stichPoints) + gainedSp,
    stichSpent: n0(p.stichSpent),
    nodes: (p.nodes && typeof p.nodes === "object") ? p.nodes : {},
    onboarding: onboardingAfter(onboardingBefore, record),
    spRuns: n0(p.spRuns) + (isSpRun(record, onboardingBefore) ? 1 : 0),
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
const DEFAULT_OPTIONS = { skin: "crt", muted: false, sfxVol: 0.4, musicVol: 0.2, deckId: "default", battlefieldId: "default", reducedFx: "aus", haptics: true, archShowCombos: true, archShowForms: true, collapseScoreSource: true, collapseScoreTrend: true }; // #110/#111 Sound + #190 Kosmetik + #200 Effekte-reduziert (auto|an|aus) + #207 Haptik (nur Mobile) + #243 Baumodus-Toggles (Kombi-/Formations-Sicht) merken + #252 StatusRail-Panels (Score-Quellen/Score-Verlauf) default eingeklappt, über Runs gemerkt
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

/* AKTIVER LAUF (Resume) — Snapshot des laufenden Reducer-States, damit ein Run das Wegtabben/Schließen
   des Browsers überlebt (Mobile verwirft Background-Tabs; der State liegt sonst nur im Arbeitsspeicher).
   Der State ist voll serialisierbar (~6 KB, keine Funktionen). `meta` trägt UI-seitige Ephemera aus App.jsx
   (Lauf-Timer, runId, Geist-Linie), die nicht im Reducer-State stehen.
   Schema-Stempel: nach einem Deploy mit inkompatiblem State-Shape wird ein Alt-Snapshot verworfen (nie ein
   kaputter Run geladen). Menü-/Gameover-Snapshots gelten nicht als „fortsetzbar". */
export const ACTIVE_RUN_SCHEMA = 1; // bei breaking change am Reducer-State-Shape hochzählen → Alt-Snapshots werden verworfen
export function saveActiveRun(state, meta = {}) {
  try {
    if (!state || !state.deck || state.phase === "menu" || state.phase === "gameover") return;
    localStorage.setItem(k("as_activerun"), JSON.stringify({ schema: ACTIVE_RUN_SCHEMA, state, meta }));
  } catch (e) {}
}
export function loadActiveRun() {
  try {
    const raw = localStorage.getItem(k("as_activerun"));
    if (raw) {
      const b = JSON.parse(raw);
      if (b && b.schema === ACTIVE_RUN_SCHEMA && b.state && b.state.deck &&
          b.state.phase !== "menu" && b.state.phase !== "gameover")
        return { state: b.state, meta: b.meta || {} };
    }
  } catch (e) {}
  return null;
}
export function clearActiveRun() {
  try { localStorage.removeItem(k("as_activerun")); } catch (e) {}
}
