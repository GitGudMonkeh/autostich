import { GHOST_STEP } from "./constants.js";
import { onboardingAfter, isSpRun, spCreditForRun, dpForRun, treeComplete, onboardingUnlocks, ONBOARDING_LINKS } from "./progression.js";

// #382 Abschluss-Bonus: jeder abgeschlossene NORMALE (Nicht-Ranked) Lauf gibt +N DP — Ausgleich für die entfernte
//   Challenge-DP-Quelle (#301). Ranked hat seinen eigenen Wochenbonus (rankedDpBonus).
export const RUN_COMPLETE_DP = 5;

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

// #229 T11: Schema-Version des Profil-Blobs — der schema-fragilste Persistenz-Teil (Baum-Knoten-Form,
// monoArchetypeRuns-Form). Bei einem breaking change hochzählen UND einen Migrations-Block in migrateProfile
// anhängen. Andere Keys (Ghost/Highscores/Optionen) degradieren weiter rein additiv über Merge-über-Default
// und brauchen keine Versionierung.
// v2 (Progression/Upgrades, docs §9): das Profil bekommt die SP-/Baum-/Onboarding-Felder. Rein additiv, aber
// als eigene Schema-Epoche markiert (Migrations-Anker für spätere Baum-Umformungen).
// v6 (#316): Onboarding-Phase entfernt — jedes Profil startet mit onboarding = ONBOARDING_LINKS (alle Archetypen,
// Raritäts-Cap, Legendär-Phase + Genesis-Pack frei). Fresh-Start: 0 SP / 50 DP.
// v7 (#369): Progression-Rework — der alte Baum (bau/auf/rar/mei) ist ersetzt (Deck- + Allgemein-Zweig, neue Knoten-IDs).
// Archetyp-/Rarität-/Legendär-Gating hängt jetzt am Baum. Migration leert Alt-Knoten + bucht die investierten SP zurück.
export const PROFILE_SCHEMA_VERSION = 7;
// #316 Start-Deckpunkte eines frischen Profils (früher 0). Onboarding ist weg → man startet direkt mit etwas DP.
const START_DECK_POINTS = 50;
const DEFAULT_PROFILE = { schemaVersion: PROFILE_SCHEMA_VERSION,
  games: 0, totalScore: 0, totalDurationMs: 0, bestScore: 0, bestStreak: 0, maxCrits: 0, archetypesEver: [], firstTs: 0,
  hadNoRerollRun: false, // #214: sticky Challenge-Flag (einmal true → bleibt); noReroll = Sparfuchs deck_c3. (#267: hadMonoStatRun entfernt — die Stat-Phase ist weg.)
  monoArchetypeRuns: {}, hadAllArchetypesRun: false, // #215: Mono-Archetyp-Läufe je Fraktion (Map) + Element-Bund (alle 4) → deck_c5..c9
  // #370 Ranked-Rework: „Archetyp X war in einem ABGESCHLOSSENEN Lauf dabei" (Map Archetyp→Anzahl) → Ranked-Freischaltung
  //   (alle vier Archetypen + je ≥1 completed). lastRankedWeekSeed = Wochen-Seed der zuletzt gewerteten Ranked-Runde
  //   (identifiziert die Woche eindeutig) → erste Ranked-Runde je Woche bekommt den Bonus genau einmal.
  archetypeRunsCompleted: {}, lastRankedWeekSeed: null,
  // #303 Challenge-Decks — sticky Freischalt-Flags (einmal true → bleibt): Gottgleich (erstmals GOTTGLEICH-Stich),
  // Sparfuchs (Meisterrang-Wochenlauf ohne Reroll), Meister (Platz 1 einer Wochen-Rangliste — Champion-Board, Trigger folgt).
  hadGottgleichRun: false, hadMeisterNoRerollRun: false, hadChampionWeek: false,
  // Progression/Upgrades (docs §1/§4/§6): SP-Guthaben + ausgegeben (Respec/Anzeige), gekaufte Baum-Knoten
  // ({[id]: level}), weiteste Onboarding-Stufe (0..6) und Zähler der SP-Läufe (Treue-Drip-Basis).
  // #316: onboarding startet direkt bei ONBOARDING_LINKS (6/6, „fertig") → keine Onboarding-Phase mehr, alle
  // Post-Onboarding-Unlocks (Archetypen/Rarität/Legendär/Genesis) sofort frei. stichPoints = 0 (SP werden im Spiel verdient).
  stichPoints: 0, stichSpent: 0, nodes: {}, onboarding: ONBOARDING_LINKS, spRuns: 0,
  // #299 Deckpunkte (DP): zweite Währung für die Werkstatt-Packs. #316: Fresh-Start mit START_DECK_POINTS (50).
  deckPoints: START_DECK_POINTS, deckSpent: 0,
  // Deck-Werkstatt (#deckshop): mit SP gekaufte Kosmetik-Elemente als Map "theme:element" → true
  // (z. B. "sunset:deck", "lofi:frameGlow"). Rein additiv, sticky (einmal gekauft → bleibt).
  ownedCosmetics: {} };

/* #229 T11: reiner, stufenweiser Migrations-Switch für den Profil-Blob (kein localStorage → unit-testbar).
   Migriert von der gespeicherten Version hoch bis zur aktuellen; jeder Block transformiert v → v+1 und ist
   idempotent (ein bereits aktuelles Profil bleibt unverändert). Ein unversioniertes Alt-Profil gilt als v0.
   Neue breaking changes: PROFILE_SCHEMA_VERSION erhöhen + hier einen `if (v < N)`-Block anhängen. */
export function migrateProfile(p) {
  if (!p || typeof p !== "object") return p;
  let v = typeof p.schemaVersion === "number" ? p.schemaVersion : 0;
  // #349 C: Profil aus einem NEUEREN Build (Rollback/Preview-Mix, v > aktuelle Schema-Version) NICHT anfassen oder
  //   herunterstufen — unverändert zurückgeben. So bleiben neuere Felder erhalten und es läuft keine falsche Rück-Migration.
  if (v > PROFILE_SCHEMA_VERSION) return { ...p };
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
  if (v < 3) {
    // v2 → v3 (Deck-Werkstatt): kaufbare Kosmetik-Elemente. Rein additiv — leere Besitz-Map ergänzen
    // (loadProfile füllt sie ohnehin über DEFAULT_PROFILE; hier explizit für Selbst-Konsistenz).
    if (!out.ownedCosmetics || typeof out.ownedCosmetics !== "object") out.ownedCosmetics = {};
    v = 3;
  }
  if (v < 4) {
    // v3 → v4 (#299 DP-Ökonomie): Deckpunkte-Felder ergänzen. Rein additiv — Guthaben startet bei 0
    // (kein Umzug aus SP; die Werkstatt stellt gleichzeitig von SP auf DP um).
    if (typeof out.deckPoints !== "number") out.deckPoints = 0;
    if (typeof out.deckSpent !== "number") out.deckSpent = 0;
    v = 4;
  }
  if (v < 5) {
    // v4 → v5 (#303 Challenge-Decks): sticky Freischalt-Flags ergänzen. Rein additiv (loadProfile füllt sie ohnehin
    // über DEFAULT_PROFILE; hier explizit für Selbst-Konsistenz). Bestehende Fortschritte bleiben unberührt.
    if (typeof out.hadGottgleichRun !== "boolean") out.hadGottgleichRun = false;
    if (typeof out.hadMeisterNoRerollRun !== "boolean") out.hadMeisterNoRerollRun = false;
    if (typeof out.hadChampionWeek !== "boolean") out.hadChampionWeek = false;
    v = 5;
  }
  if (v < 6) {
    // v5 → v6 (#316 Onboarding entfernt): bestehende Profile werden auf „Onboarding fertig" (ONBOARDING_LINKS) gehoben →
    // alle Post-Onboarding-Unlocks frei, keine Onboarding-Phase mehr. NUR vorwärts (kein Rückschritt) und KEIN Währungs-
    // Grant: Deckpunkte/SP bleiben unberührt (der 50-DP-Startbonus gilt nur für frische Profile über DEFAULT_PROFILE).
    if ((Number(out.onboarding) || 0) < ONBOARDING_LINKS) out.onboarding = ONBOARDING_LINKS;
    v = 6;
  }
  if (v < 7) {
    // v6 → v7 (#369 Progression-Rework): der alte Baum (bau/auf/rar/mei) ist ersetzt. Alt-Knoten (B1/M5/…) referenzieren
    // tote IDs → leeren; die dafür investierten SP (stichSpent) wandern zurück aufs Guthaben (gratis Respec beim Umstieg,
    // KEIN SP-Verlust). „Kompletter Neustart für alle" (Rollout separat); Währungen/Stats/Cosmetics bleiben unberührt.
    const spent = Math.max(0, Math.floor(Number(out.stichSpent) || 0));
    const hasOldNodes = out.nodes && typeof out.nodes === "object" && Object.keys(out.nodes).length > 0;
    if (spent > 0 || hasOldNodes) {
      out.stichPoints = Math.max(0, Math.floor(Number(out.stichPoints) || 0)) + spent;
      out.stichSpent = 0;
      out.nodes = {};
    }
    v = 7;
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
          // Gleiche Map-Form wie die Geschwister oben — fehlte hier, obwohl recordRun sie spreadet und die
          // Ranked-Freischaltung (progression.rankedUnlocked) daran hängt.
          archetypeRunsCompleted: (p.archetypeRunsCompleted && typeof p.archetypeRunsCompleted === "object") ? p.archetypeRunsCompleted : {},
          ownedCosmetics: (p.ownedCosmetics && typeof p.ownedCosmetics === "object") ? p.ownedCosmetics : {},
          nodes: (p.nodes && typeof p.nodes === "object") ? p.nodes : {} };
      }
    }
  } catch (e) {}
  // #195: frisches archetypesEver-Array + #215 frische monoArchetypeRuns-Map + Baum-nodes, damit der Leer-/Korrupt-Pfad
  // NICHT die mutablen Referenzen aus DEFAULT_PROFILE teilt (ein späterer push/Zuweisung würde sonst den Modul-Default vergiften).
  return { ...DEFAULT_PROFILE, archetypesEver: [], monoArchetypeRuns: {}, archetypeRunsCompleted: {}, nodes: {} };
}

// Profil-Blob persistieren (mit aktueller Schema-Version gestempelt). Für die Baum-Kauf-/Respec-Flows
// (progression.buyNode/respec liefern ein neues Profil → hier speichern). recordRun schreibt separat.
export function saveProfile(profile) {
  // #349 C: einen bereits höheren (neueren Build) Versions-Stempel nicht herunterstufen.
  const out = { ...profile, schemaVersion: Math.max(PROFILE_SCHEMA_VERSION, Number(profile?.schemaVersion) || 0) };
  try { localStorage.setItem(k("as_profile"), JSON.stringify(out)); } catch (e) {}
  return out;
}

// Test-/Dev-Reset (geheimer Seed-Code `reset`): löscht Profil + Lauf-Fortschritt → Erstbesuch-Zustand,
// Onboarding startet neu. Betroffen: Profil (Progression/Stats/Freischalt-Flags), Highscores, Geist-Rekord,
// Lauf-Verlauf, aktiver Lauf und „Anleitung gesehen" — PLUS die Kosmetik-AUSWAHL (Deck/Battlefield/Effekte) wird
// deselektiert (auf Default). Übrige Präferenzen (Ton/Lautstärke/UI/Name) bleiben. Nur im Preview-Build aufrufbar.
export const RESET_KEYS = ["as_profile", "as_highscores", "as_ghost", "as_runhistory", "as_activerun", "as_seen_guide"];
export function wipeProfileStorage() {
  for (const key of RESET_KEYS) {
    try { localStorage.removeItem(k(key)); } catch (e) {}
  }
  // #: Auch die Kosmetik-AUSWAHL (gewähltes Deck/Battlefield + alle Effekt-Toggles) auf Default — nach dem Wipe ist
  // nichts mehr freigeschaltet; ohne Reset bliebe das (nun gesperrte) Deck „ausgewählt" und erschiene als kaufbar.
  try {
    const o = loadOptions();
    for (const key of COSMETIC_OPTION_KEYS) o[key] = DEFAULT_OPTIONS[key];
    saveOptions(o);
  } catch (e) {}
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
/* #303 Challenge-Decks — Freischalt-Erkennung (reine Funktionen auf dem Run-Record).
   - GOTTGLEICH-Stich = fxIntensity-Stufe 4 (bester Einzelstich record.bestTrickScore ≥ GOTTGLEICH_TRICK_MIN).
     Bewusst OHNE `completed`-Gate: „das erste Mal Gottgleich getriggert" gilt auch in einem abgebrochenen Lauf
     (wie die Serien-Meilensteine über bestStreak, die ebenfalls unabhängig vom Abschluss buchen).
   - Sparfuchs = ABGESCHLOSSENER Meisterrang-Wochenlauf (record.ranked === "meister" ⇒ Wochen-Seed) OHNE einen
     einzigen benutzten Reroll (record.rerollsUsed === 0). */
export const GOTTGLEICH_TRICK_MIN = 500000; // = FX_TIER_MINS[3] (Battlefield.jsx): Stufe-4-Schwelle „Gottgleich"
export function isGottgleichRun(record) {
  return !!record && n0(record.bestTrickScore) >= GOTTGLEICH_TRICK_MIN;
}
// #370: „ranked" ist der neue Wochen-Ranglisten-Modus (ersetzt „meister"); Alt-Records mit „meister" bleiben gültig.
export const isRankedMode = (r) => !!r && (r.ranked === "ranked" || r.ranked === "meister");
export function isMeisterNoRerollRun(record) {
  return !!record && record.completed === true && isRankedMode(record) && n0(record.rerollsUsed) === 0;
}

// #349 C: Quota-Fehler nicht mehr komplett stumm schlucken. Einmal signalisieren (nicht spammen) + die Lauf-Historie
//   progressiv beschneiden, damit der Fortschritt weiter persistiert (der schwere deckSnapshot ist der größte Posten).
let _quotaWarned = false;
const isQuotaError = (e) => !!e && (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014);
function signalQuota(where) {
  if (_quotaWarned) return; _quotaWarned = true;
  try { console.warn(`[storage] Speicher voll (QuotaExceeded) bei ${where} — Lauf-Historie wird beschnitten; Fortschritt kann eingeschränkt persistiert werden.`); } catch (e) {}
}
const stripSnapshot = (r) => { if (!r || !r.deckSnapshot) return r; const { deckSnapshot, ...rest } = r; return rest; };
// Historie speichern; bei Quota-Fehler zunehmend beschneiden: erst deckSnapshots der ÄLTEREN Läufe fallenlassen (die
// jüngsten behalten die volle Detailansicht), dann nur die jüngsten Läufe ganz ohne Snapshot. Nicht-Quota-Fehler still.
const HISTORY_FULL_SNAPSHOTS = 6;
function saveRunHistory(history) {
  const key = k("as_runhistory");
  try { localStorage.setItem(key, JSON.stringify(history)); return; } catch (e) { if (!isQuotaError(e)) return; }
  signalQuota("Lauf-Historie");
  const pruned = history.map((r, i) => (i < HISTORY_FULL_SNAPSHOTS ? r : stripSnapshot(r))); // ältere ohne Snapshot
  try { localStorage.setItem(key, JSON.stringify(pruned)); return; } catch (e) { if (!isQuotaError(e)) return; }
  const minimal = history.slice(0, HISTORY_FULL_SNAPSHOTS).map(stripSnapshot);                // nur die jüngsten, snapshotlos
  try { localStorage.setItem(key, JSON.stringify(minimal)); } catch (e) { /* aufgegeben — bereits signalisiert */ }
}

// Einen abgeschlossenen Lauf in die Historie voranstellen (auf CAP gedeckelt) UND die kumulierten
// Profil-Totals fortschreiben. Gibt { history, profile } für ein sofortiges UI-Update zurück.
export function recordRun(record) {
  const history = [record, ...loadRunHistory()].slice(0, RUN_HISTORY_CAP);
  saveRunHistory(history);
  const p = loadProfile();
  const arch = new Set(p.archetypesEver);
  for (const a of (record.archetypes || [])) arch.add(a);
  // #215/#310: Mono-Archetyp-Läufe je Fraktion in einer sticky-Map ZÄHLEN (Element-Challenge braucht N Läufe;
  // Alt-Werte Boolean true werden als 0 gelesen → zählen ab dem nächsten Mono-Lauf sauber hoch).
  const monoArchetypeRuns = { ...(p.monoArchetypeRuns || {}) };
  const monoArch = monoArchetypeOf(record);
  if (monoArch) monoArchetypeRuns[monoArch] = n0(monoArchetypeRuns[monoArch]) + 1;
  // #370 Ranked-Freischaltung: je Archetyp zählen, in wie vielen ABGESCHLOSSENEN Läufen er dabei war (Misch- wie Mono-Läufe).
  const archetypeRunsCompleted = { ...(p.archetypeRunsCompleted || {}) };
  if (record.completed === true) for (const a of new Set(record.archetypes || [])) archetypeRunsCompleted[a] = n0(archetypeRunsCompleted[a]) + 1;
  // Progression/Upgrades (docs §4–§6): Onboarding rückt bei natürlichem Abschluss ein Glied vor; SP werden erst
  // NACH vollendetem Onboarding geerntet (Grundstock + Score-Meilensteine + Treue-Drip). spRuns zählt nur SP-Läufe.
  // Reine Regeln aus progression.js (Sim läuft profil-los → Baseline unberührt). stichSpent/nodes bleiben unangetastet
  // (nur Kauf/Respec im Baum ändern sie).
  const onboardingBefore = n0(p.onboarding);
  // #299: SP werden gutgeschrieben, bis der Baum komplett ist (danach 0 → die SP-Ökonomie fließt als DP). DP kommen
  // aus den SP-Meilensteinen (gleiche Anzahl wie die Meilenstein-SP) plus dem flachen Abschluss-Bonus (RUN_COMPLETE_DP)
  // und — bei vollem Baum — zusätzlich aus der restlichen SP-Ökonomie.
  const treeDone = treeComplete(p);
  const gainedSp = spCreditForRun(record, onboardingBefore, treeDone, n0(p.spRuns));
  const gainedDp = dpForRun(record, onboardingBefore, treeDone, n0(p.spRuns));
  // #382 Challenge-Modus entfernt → keine ±DP-Abrechnung mehr; die native DP-Formel bleibt.
  const runDp = gainedDp;
  // Abschluss-Bonus: +RUN_COMPLETE_DP für jeden abgeschlossenen Nicht-Ranked-Lauf (Ranked hat den Wochenbonus unten).
  const completionDp = record.completed === true && !isRankedMode(record) ? RUN_COMPLETE_DP : 0;
  // #370 Ranked-Wochenbonus: die ERSTE abgeschlossene Ranked-Runde je Woche gibt +5 SP & +5 DP (bei vollem Baum
  //   stattdessen +10 DP, da SP dann nutzlos). Woche = Wochen-Seed des Records (eindeutig je Woche); lastRankedWeekSeed
  //   verhindert Mehrfach-Bonus. Seed-basiert → deterministisch/testbar (kein new Date() in recordRun).
  const rankedSeed = isRankedMode(record) && record.completed === true && record.seed != null ? (record.seed >>> 0) : null;
  const firstRankedThisWeek = rankedSeed != null && rankedSeed !== (p.lastRankedWeekSeed ?? null);
  const rankedSpBonus = firstRankedThisWeek && !treeDone ? 5 : 0;
  const rankedDpBonus = firstRankedThisWeek ? (treeDone ? 10 : 5) : 0;
  // #299: bei komplettem Baum sind SP nutzlos → das übrige SP-Guthaben wird zu DP „gefegt" (idempotent: danach 0).
  const spBalance = n0(p.stichPoints) + gainedSp + rankedSpBonus;
  const spSweep = treeDone ? spBalance : 0;
  // #299 Onboarding-Fortschritt + Freischaltungs-Diff fürs Victory-Banner. Genesis wird NICHT mehr als Pack
  // geschenkt — es ist ein Onboarding-Freischalt-Deck (kind "cond"/onboardingDone), frei sobald onboarding 6/6.
  const onbAfter = onboardingAfter(onboardingBefore, record);
  const unlocks = onboardingUnlocks(onboardingBefore, onbAfter);
  const ownedCosmetics = (p.ownedCosmetics && typeof p.ownedCosmetics === "object") ? p.ownedCosmetics : {};
  const profile = {
    // #349 A: Basis via Spread übernehmen → ein künftig zu DEFAULT_PROFILE ergänztes Feld geht NICHT mehr still verloren,
    //   wenn es hier vergessen wird. Die berechneten Felder unten überschreiben die Spread-Werte gezielt.
    ...p,
    schemaVersion: Math.max(PROFILE_SCHEMA_VERSION, Number(p.schemaVersion) || 0), // #229 T11 Migrations-Anker · #349 C: neueren Stempel nicht herunterstufen
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
    // #370 Ranked-Freischalt-Tracker + „diese Woche schon gewertet"-Marke (Wochen-Seed).
    archetypeRunsCompleted,
    lastRankedWeekSeed: firstRankedThisWeek ? rankedSeed : (p.lastRankedWeekSeed ?? null),
    hadAllArchetypesRun: !!p.hadAllArchetypesRun || isAllArchetypesRun(record),
    // #303 Challenge-Decks — sticky (einmal true → bleibt). Gottgleich- & Sparfuchs-Flags werden hier gesetzt;
    // hadChampionWeek bleibt vorerst nur erhalten (der Trigger folgt mit dem Champion-Board, s. #299/#303).
    hadGottgleichRun: !!p.hadGottgleichRun || isGottgleichRun(record),
    hadMeisterNoRerollRun: !!p.hadMeisterNoRerollRun || isMeisterNoRerollRun(record),
    hadChampionWeek: !!p.hadChampionWeek,
    // Progression/Upgrades: Guthaben wächst um den Lauf-Ertrag; ausgegebene SP + gekaufte Knoten bleiben unverändert.
    // Bei komplettem Baum wird das SP-Guthaben zu DP gefegt (spSweep) → stichPoints 0.
    stichPoints: spBalance - spSweep,
    stichSpent: n0(p.stichSpent),
    nodes: (p.nodes && typeof p.nodes === "object") ? p.nodes : {},
    // #299 DP: Guthaben wächst um den DP-Ertrag + das gefegte SP-Guthaben (bei vollem Baum); ausgegebene DP bleiben.
    // #382: + Abschluss-Bonus (completionDp) für abgeschlossene Nicht-Ranked-Läufe.
    deckPoints: n0(p.deckPoints) + runDp + completionDp + spSweep + rankedDpBonus,
    deckSpent: n0(p.deckSpent),
    onboarding: onbAfter,
    spRuns: n0(p.spRuns) + (isSpRun(record, onboardingBefore) ? 1 : 0),
    // #deckshop: gekaufte Kosmetik bleibt über Läufe erhalten (recordRun baut das Profil neu → mittragen);
    // #299: Onboarding-Abschluss (6/6) hat oben ggf. das Genesis-Pack ergänzt.
    ownedCosmetics,
  };
  try { localStorage.setItem(k("as_profile"), JSON.stringify(profile)); } catch (e) {}
  // #304 Verdienst-Rollup (Victory-Screen): die Lauf-Erträge + Onboarding-Fortschritt fürs Count-up/Balken/Countdown.
  const earn = { sp: gainedSp, dpGross: gainedDp, dpNet: runDp, dpComplete: completionDp, spSweep };
  const onboarding = { before: onboardingBefore, after: onbAfter, links: ONBOARDING_LINKS };
  return { history, profile, unlocks, earn, onboarding };
}

/* OPTIONEN (#41) — bewusst als erweiterbares Objekt (künftig Sound, Tempo-Default …).
   `skin`: "crt" (Retro-CRT-Skin, jetzt Default) | "off" (schlichter Look).
   Default = "crt": Erstbesuch zeigt den Skin; wer ihn explizit ausschaltet, behält
   das dank gespeichertem { skin: "off" } auch nach Reload (loadOptions merged über Default).
   `deckId`/`battlefieldId` (#190): gewähltes kosmetisches Deck-/Battlefield-Skin (Default = aktueller
   Look). Merge über Default degradiert Alt-Daten sauber; die UI fällt zusätzlich defensiv auf "default"
   zurück, falls ein gespeicherter Skin (noch) nicht existiert oder nicht mehr freigeschaltet ist. */
// #110/#111 Sound + #190 Kosmetik + #200/#363 Effekte-reduziert (aus|mobile|an; Gerätedefault via loadOptions) + #207 Haptik (nur Mobile) + #243 Baumodus-Toggles
// + #252 StatusRail-Panels default eingeklappt · #finisher: gewählter Sieg-Finisher (standard=Wegflug|klinge) · #322
// Sonnen-Puls = freier Default (aktiv, kein Kauf). #347: ALLE Effekt-Toggles + Farbmodus-Flags explizit gelistet (Default
// aus, außer fxSonnenPuls/fxCubeMatrixSun) — vorher liefen die fehlenden über undefined-als-falsy (inkonsistent/fragil).
const DEFAULT_OPTIONS = {
  skin: "crt", muted: false, sfxVol: 0.4, musicVol: 0.2, deckId: "deck_onboarding", battlefieldId: "bf_onboarding",
  reducedFx: "aus", haptics: true, archShowCombos: true, archShowForms: true,
  collapseScoreSource: true, collapseScoreTrend: true, finisher: "standard", archColor: "standard",
  // #389 Floating-Text ausblenden (Default sichtbar = false). Reine UI-Prefs → NICHT in COSMETIC_OPTION_KEYS (überleben Reset).
  hideFloatScore: false, hideFloatMult: false, hideFloatWinLose: false,
  // Effekt-Toggles (Ein/Aus). fxSonnenPuls = freier Default an; alles andere aus.
  fxAurora: false, fxNeonsurf: false, fxStarfield: false, fxCubeMatrix: false, fxDeckGlow: false,
  fxEdgeGlow: false, fxHolo: false, fxGlitch: false,
  fxSonnenPuls: true, fxLaserFaecher: false, fxPrismaKaskade: false, fxHoloCube: false, fxSupernova: false,
  // Cube-Matrix-Optik (Sonne default an; Wire aus).
  fxCubeMatrixSun: true, fxCubeMatrixWire: false,
  // Farbmodus-Flags Standard ↔ Deckfarbe (Default Standard = false). Karten-Anims (Edge/Holo/Glitch) + Deck-Glow sind
  // IMMER Deckfarbe → kein eigenes Flag.
  fxAuroraDeck: false, fxNeonsurfDeck: false, fxStarfieldDeck: false, fxCubeMatrixDeck: false,
  fxScorchDeck: false, fxBlackholeDeck: false, fxKlingeDeck: false, fxHologridDeck: false,
  fxSonnenPulsDeck: false, fxLaserFaecherDeck: false, fxPrismaKaskadeDeck: false, fxHoloCubeDeck: false, fxSupernovaDeck: false,
};
// #: Kosmetik-AUSWAHL-Felder in den Optionen (equipped Deck/Battlefield + alle Effekt-Toggles) — beim Dev-Reset
// auf Default zurückgesetzt (deselektiert). Restliche Options-Prefs (Ton/UI/Name) bleiben unberührt.
// #322 Gottgleich-Prunk-Toggles: Dev-Reset stellt Sonnen-Puls (Default true) wieder her und wählt die kaufbaren ab.
// #347: alle Kosmetik-Auswahlfelder (equipped Deck/Battlefield + ALLE Effekt-Toggles + Farbmodus-Flags + Cube-Optik) →
//   der Profil-Wipe setzt sie sauber auf DEFAULT_OPTIONS zurück. Nicht-Kosmetik-Prefs (Ton/Lautstärke/UI/Haptik) bleiben.
export const COSMETIC_OPTION_KEYS = [
  "deckId", "battlefieldId", "finisher", "archColor",
  "fxAurora", "fxNeonsurf", "fxStarfield", "fxCubeMatrix", "fxDeckGlow", "fxEdgeGlow", "fxHolo", "fxGlitch",
  "fxSonnenPuls", "fxLaserFaecher", "fxPrismaKaskade", "fxHoloCube", "fxSupernova",
  "fxCubeMatrixSun", "fxCubeMatrixWire",
  "fxAuroraDeck", "fxNeonsurfDeck", "fxStarfieldDeck", "fxCubeMatrixDeck", "fxScorchDeck", "fxBlackholeDeck",
  "fxKlingeDeck", "fxHologridDeck", "fxSonnenPulsDeck", "fxLaserFaecherDeck", "fxPrismaKaskadeDeck", "fxHoloCubeDeck", "fxSupernovaDeck",
];
/* #331 Einfachauswahl erzwingen (Migration/Normalisierung beim Laden): Hintergrund-Effekte (Aurora/Würfel-Matrix/
   Glutfunken/Komet) und Karten-Animationen (Neonrahmen/Holo-Sweep/Glitch) sind jetzt einfach-exklusiv. Alt-Stände, in
   denen mehrere gleichzeitig an waren (z. B. Aurora + Glutfunken), werden auf GENAU EINEN reduziert (feste Priorität =
   Reihenfolge), Rest aus. „Leuchten" (fxDeckGlow) ist frei kombinierbar → unberührt. Besitz (ownedCosmetics) unberührt. */
// Exportiert, damit ein Test sie gegen themes.BG_FX_KEYS + BG_FIN_KEYS binden kann: die Kategorien stehen dort,
// die Exklusivität wird hier durchgesetzt — wer einen Effekt ergänzt und diesen Eintrag vergisst, bräche sie still.
export const BG_EXCL_OPTS = ["fxAurora", "fxCubeMatrix", "fxNeonsurf", "fxStarfield"]; // Priorität: Aurora zuerst — #glutfunken-raus: fxEmbers entfernt · #345 neonsurf
const CARD_ANIM_OPTS = ["fxEdgeGlow", "fxHolo", "fxGlitch"];                    // Priorität: Neonrahmen zuerst
function reduceExclusive(o, keys) {
  let kept = false;
  for (const key of keys) {
    if (o[key]) { if (kept) o[key] = false; else kept = true; }
  }
}
export function normalizeFxOptions(o) {
  if (!o || typeof o !== "object") return o;
  reduceExclusive(o, BG_EXCL_OPTS);
  reduceExclusive(o, CARD_ANIM_OPTS);
  return o;
}
/* #363 „Effekte reduziert" hat jetzt genau 3 Zustände: „aus" (full) · „mobile" (balanced/lite) · „an" (minimal).
   Der frühere „auto"-Knopf entfällt — die Geräteabhängigkeit steckt jetzt im DEFAULT (Handy → „mobile", Desktop → „aus").
   `prefers-reduced-motion` erzwingt weiterhin immer „minimal" (in useFxLevel, nicht hier). */
export function deviceDefaultReducedFx() {
  try {
    return (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ? "mobile" : "aus";
  } catch (e) { return "aus"; }
}
const REDUCED_FX_VALUES = ["aus", "mobile", "an"];
// Migration der Alt-Werte auf die 3 Zustände: „ausgewogen" → „mobile"; „auto"/fehlend/ungültig → Gerätedefault
// (Handy „mobile", Desktop „aus"). So verbleibt kein „auto"/„ausgewogen" mehr im gespeicherten Profil.
export function migrateReducedFx(raw) {
  if (raw === "ausgewogen") return "mobile";
  if (REDUCED_FX_VALUES.includes(raw)) return raw;
  return deviceDefaultReducedFx();
}
export function loadOptions() {
  try {
    const raw = localStorage.getItem(k("as_options"));
    if (raw) {
      const o = JSON.parse(raw);
      if (o && typeof o === "object") {
        const before = o.reducedFx;
        const merged = normalizeFxOptions({ ...DEFAULT_OPTIONS, ...o });
        merged.reducedFx = migrateReducedFx(before);
        // #363 einmalig zurückschreiben, damit kein „auto"/„ausgewogen" (oder fehlender Schlüssel) im Profil verbleibt.
        if (merged.reducedFx !== before) { try { saveOptions(merged); } catch (e) {} }
        return merged;
      }
    }
  } catch (e) {}
  return { ...DEFAULT_OPTIONS, reducedFx: deviceDefaultReducedFx() };
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
// #349 B: KONVENTION — ACTIVE_RUN_SCHEMA bei JEDER breaking change am Reducer-State-Shape (umbenanntes/entferntes
//   Pflichtfeld, geänderte Semantik) hochzählen → Alt-Snapshots werden verworfen. Als zweite Absicherung gegen ein
//   vergessenes Bump prüft isResumableRunState() zusätzlich die Kern-Pflichtfelder tief: fehlt/verrutscht eines, wird
//   der Snapshot sauber verworfen (null) statt in den neuen Reducer geladen zu werden (Mid-Run-Crash/Korruption).
// v2 (#369/#370/#382): Der State hat seit v1 mehrere Pflichtfelder dazubekommen (weekMods, rareFloor, skillSlots,
//   legPicksMade, challengeBlockArch/Form) bzw. umgewidmet — der Stempel blieb dabei versehentlich auf 1, sodass
//   Alt-Snapshots über einen Deploy hinweg weitergeladen wurden. Bump verwirft sie einmalig (gewollt).
export const ACTIVE_RUN_SCHEMA = 2;
function isResumableRunState(s) {
  if (!s || typeof s !== "object") return false;
  if (typeof s.phase !== "string" || s.phase === "menu" || s.phase === "gameover") return false;
  // Pflicht-Arrays: Kernstruktur eines laufenden Reducer-States (Spieler-/Gegner-Deck, Perks, Skills).
  for (const key of ["deck", "oppDeck", "perks", "skills"]) {
    if (!Array.isArray(s[key])) return false;
  }
  // Pflicht-Zahlen: Positions-/Score-Zähler, die Reducer & Battlefield sofort lesen.
  for (const key of ["pos", "cycle", "trickNo", "score"]) {
    if (typeof s[key] !== "number" || !Number.isFinite(s[key])) return false;
  }
  // #370: Ein RANKED-Snapshot ohne `weekMods` ist nicht fortsetzbar — hasWeekMod läse überall false, alle
  //   Wochen-Modifikatoren wären still aus, und der Lauf ginge trotzdem mit board/Wochen-Seed auf die Rangliste
  //   (Eintrag unter anderen Regeln als der Rest der Woche). Lieber sauber verwerfen. Zweite Absicherung gegen
  //   ein vergessenes ACTIVE_RUN_SCHEMA-Bump — genau der Fall, der v1→v2 nötig gemacht hat.
  if (s.ranked && !Array.isArray(s.weekMods)) return false;
  return true;
}
export function saveActiveRun(state, meta = {}) {
  try {
    if (!isResumableRunState(state)) return; // nur fortsetzbare (nicht-Menü/Gameover) Kern-States sichern
    localStorage.setItem(k("as_activerun"), JSON.stringify({ schema: ACTIVE_RUN_SCHEMA, state, meta }));
  } catch (e) {}
}
export function loadActiveRun() {
  try {
    const raw = localStorage.getItem(k("as_activerun"));
    if (raw) {
      const b = JSON.parse(raw);
      if (b && b.schema === ACTIVE_RUN_SCHEMA && isResumableRunState(b.state))
        return { state: b.state, meta: b.meta || {} };
    }
  } catch (e) {}
  return null;
}
export function clearActiveRun() {
  try { localStorage.removeItem(k("as_activerun")); } catch (e) {}
}
