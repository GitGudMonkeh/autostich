import { GHOST_STEP } from "./constants.js";
import { onboardingAfter, isSpRun, spCreditForRun, dpForRun, treeComplete, onboardingUnlocks, ONBOARDING_LINKS, WELCOME_DP } from "./progression.js";

// #382 Abschluss-Bonus: jeder abgeschlossene NORMALE (Nicht-Ranked) Lauf gibt +N DP — Ausgleich für die entfernte
//   Challenge-DP-Quelle (#301). Ranked hat seinen eigenen Wochenbonus (rankedDpBonus).
export const RUN_COMPLETE_DP = 5;

/* #370 Ranked-Wochenbonus, exportiert statt inline: der Hub NENNT ihn („+5 SP · +5 DP Bonus noch offen"),
   und ein Balancing-Schritt hier ließe die Anzeige sonst still falsch werden. Bei vollem Baum sind SP
   nutzlos → der SP-Anteil wird zu DP (s. Rechnung in `recordRun`). */
export const RANKED_WEEK_SP = 5;
export const RANKED_WEEK_DP = 5;
export const RANKED_WEEK_DP_FULL = 10;

/* Preview-Build (Testbranch auf /autostich/test/) teilt sich die Origin mit der echten
   Seite → derselbe localStorage. Ein Präfix trennt die Namespaces, damit Test-Runs den
   echten Geist/Highscore nicht überschreiben. Produktions-/Dev-Build: kein Präfix (P="").
   VITE_STORAGE_NS names a slot explicitly (the `exp` playground sets "exp" -> "exp_"): /test/ and
   /pixi/ share `preview_`, and a run saved there under other rules must not resume here. */
const NS = import.meta.env.VITE_STORAGE_NS;
const P = NS ? `${NS}_` : (import.meta.env.VITE_PREVIEW === "1" ? "preview_" : "");
const k = (key) => P + key;
// #telemetrie: derselbe Namespace-Präfix auch für Nicht-Storage-Module (telemetry.js hält seine eigene
// Install-ID) — EIN Ort, an dem die Preview-Trennung definiert ist, statt einer stillen Kopie.
export const nsKey = k;

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
  try { localStorage.setItem(k("as_ghost"), JSON.stringify({ traj, total, step: GHOST_STEP })); } catch (e) { if (isQuotaError(e)) signalQuota("Ghost"); }
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
    // Formvalidierung (#health-check S8): ein von Hand editierter/teilkorrumpierter Eintrag mit
    // nicht-numerischem score sortiert als NaN instabil und kann einen Top-Platz dauerhaft besetzen.
    if (raw) { const l = JSON.parse(raw); if (Array.isArray(l)) return l.filter((e) => e && Number.isFinite(e.score)); }
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
// Raritäts-Cap, Legendär-Phase + Genesis-Pack frei). Fresh-Start: 0 SP / 0 DP (R22).
// v7 (#369): Progression-Rework — der alte Baum (bau/auf/rar/mei) ist ersetzt (Deck- + Allgemein-Zweig, neue Knoten-IDs).
// Archetyp-/Rarität-/Legendär-Gating hängt jetzt am Baum. Migration leert Alt-Knoten + bucht die investierten SP zurück.
export const PROFILE_SCHEMA_VERSION = 11;
// #316 gab einem frischen Profil 50 Start-DP. Runde 2, R22 (Owner): zurück auf 0 — die erste
// Währung kommt über den Willkommensbonus nach dem ersten ABGESCHLOSSENEN Lauf (WELCOME_DP).
const START_DECK_POINTS = 0;
const DEFAULT_PROFILE = { schemaVersion: PROFILE_SCHEMA_VERSION,
  games: 0, totalScore: 0, totalDurationMs: 0, bestScore: 0, bestStreak: 0, maxCrits: 0, archetypesEver: [], firstTs: 0,
  // #go-ruhe: bester EINZELSTICH als All-Time-Rekord. Er stand bisher nur je Lauf in der Highscore-Liste —
  // das Bestleistungs-Panel des Endscreens braucht ihn aber profilweit, sonst vergleicht es gegen die Top-20
  // statt gegen die eigene Bestmarke. Additiv: loadProfile mergt über DEFAULT_PROFILE, kein Schema-Sprung nötig.
  bestTrickScore: 0,
  hadNoRerollRun: false, // #214: sticky Challenge-Flag (einmal true → bleibt); noReroll = Sparfuchs deck_c3. (#267: hadMonoStatRun entfernt — die Stat-Phase ist weg.)
  monoArchetypeRuns: {}, hadAllArchetypesRun: false, // #215: Mono-Archetyp-Läufe je Fraktion (Map) + Element-Bund (alle 4) → deck_c5..c9
  // #370 Ranked-Rework: „Archetyp X war in einem ABGESCHLOSSENEN Lauf dabei" (Map Archetyp→Anzahl) → Ranked-Freischaltung
  //   (alle vier Archetypen + je ≥1 completed). lastRankedWeekSeed = Wochen-Seed der zuletzt gewerteten Ranked-Runde
  //   (identifiziert die Woche eindeutig) → erste Ranked-Runde je Woche bekommt den Bonus genau einmal.
  archetypeRunsCompleted: {}, lastRankedWeekSeed: null,
  // #303 Challenge-Decks — sticky Freischalt-Flags (einmal true → bleibt): Gottgleich (erstmals GOTTGLEICH-Stich),
  // Sparfuchs (Meisterrang-Wochenlauf ohne Reroll), Meister (Platz 1 einer Wochen-Rangliste — Champion-Board, Trigger folgt).
  hadGottgleichRun: false, hadMeisterNoRerollRun: false, hadChampionWeek: false,
  // Gewonnene Wochen-Ranglisten (Platz 1 im Meister-Wochen-Board), als ZÄHLER — die Ranglisten-Decks sind
  // gestuft (1./2./3. Wochensieg). `hadChampionWeek` bleibt als Alt-Flag erhalten und wird mitgeführt.
  championWeeks: 0,
  // Progression/Upgrades (docs §1/§4/§6): SP-Guthaben + ausgegeben (Respec/Anzeige), gekaufte Baum-Knoten
  // ({[id]: level}), weiteste Onboarding-Stufe (0..6) und Zähler der SP-Läufe (Treue-Drip-Basis).
  // #316: onboarding startet direkt bei ONBOARDING_LINKS (6/6, „fertig") → keine Onboarding-Phase mehr, alle
  // Post-Onboarding-Unlocks (Archetypen/Rarität/Legendär/Genesis) sofort frei. stichPoints = 0 (SP werden im Spiel verdient).
  stichPoints: 0, stichSpent: 0, nodes: {}, onboarding: ONBOARDING_LINKS, spRuns: 0,
  // Willkommensbonus (WELCOME_DP): sticky, damit er genau einmal fällt — nach dem ersten
  // abgeschlossenen Lauf. Frisches Profil = noch nicht ausgezahlt.
  welcomeBonusPaid: false,
  /* „Mindestens ein Lauf ist ABGESCHLOSSEN" — sticky. Steuert, ob das Tutorial noch angeboten wird:
     wer einen Lauf durchgespielt hat, kennt die Schleife und braucht den Einstieg nicht mehr im Menü
     stehen zu haben. Bewusst NICHT `games > 0`: das zählt auch Abbrüche, und wer nach zwei Stichen
     rausgeht, hat nichts gesehen. Ebenso bewusst NICHT an den Tutorial-Lauf gebunden — jeder
     abgeschlossene Lauf zählt. */
  hadCompletedRun: false,
  /* Runde 5, W1 (Owner): „Tutorial überspringen" auf der Willkommenskarte hebt auch die
     Blitz-only-Erstlauf-Sperre — sticky, damit KÜNFTIGE Läufe ebenfalls offen sind, ohne dass
     erst ein ganzer Lauf abgeschlossen werden muss. Kein Migrations-Glied nötig: false ist für
     jedes Alt-Profil die richtige Antwort, und loadProfile füllt fehlende Felder aus dem Default. */
  tutorialSkipped: false,
  /* #hirsch-abgeschlossen: Zähler der ABGESCHLOSSENEN Läufe. `games` daneben zählt jeden BEGONNENEN
     (Abbrüche eingeschlossen) und bleibt, was er ist — die Statistik zeigt ihn so an. Freischaltungen
     über eine Laufzahl lesen ab jetzt diesen hier; ein abgebrochener Lauf soll keine Belohnung tragen. */
  runsCompleted: 0,
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
    // Zähler der Wochensiege aus dem Alt-Flag seeden: ein Profil, das den Champion-Week-Flag trägt, hat
    // mindestens einen Sieg — sonst verlöre es beim Umstieg auf die gestuften Ranglisten-Decks die 1. Stufe.
    if (!Number.isFinite(Number(out.championWeeks))) out.championWeeks = out.hadChampionWeek ? 1 : 0;
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
  if (v < 8) {
    // v7 → v8 (Willkommensbonus): das Flag ist neu. Wer schon gespielt hat, ist am Willkommens-Moment
    // vorbei → als ausgezahlt markieren, OHNE den Bonus nachzureichen. Das folgt der Linie von v5→v6:
    // Migrationen schenken keine Währung, sonst bekämen alle Bestandsspieler rückwirkend ein Guthaben,
    // das die Ökonomie nie eingeplant hat. Frische Profile (games 0) bleiben auf `false` und holen den
    // Bonus regulär mit ihrem ersten abgeschlossenen Lauf.
    // (In v10 heißt das Flag `welcomeBonusPaid`; hier steht bewusst noch der alte Name, damit ein
    //  Profil, das von v7 kommt, dieselbe Kette durchläuft wie eines, das schon auf v8 lag.)
    if (typeof out.welcomeSpPaid !== "boolean") out.welcomeSpPaid = (Number(out.games) || 0) > 0;
    v = 8;
  }
  if (v < 9) {
    // v8 → v9: `hadCompletedRun` ist neu. Für Alt-Profile aus `games` ableiten — genauer geht es
    // rückwirkend nicht (ob die Läufe abgeschlossen waren, steht nirgends), und die Richtung stimmt:
    // wer schon gespielt hat, braucht das Tutorial-Angebot nicht mehr im Menü.
    if (typeof out.hadCompletedRun !== "boolean") out.hadCompletedRun = (Number(out.games) || 0) > 0;
    /* #hirsch-abgeschlossen: derselbe Fall eine Zeile tiefer. Für Alt-Profile ist `games` das einzige
       Signal, das es gibt — es zählt zu großzügig (Abbrüche sind mit drin), aber die Gegenrichtung wäre
       schlimmer: ein kleinerer Startwert könnte ein bereits freigeschaltetes Hirsch-Deck wieder ZUSPERREN.
       Etwas geschenkt zu haben ist verzeihlich, etwas wegzunehmen nicht. Ab dem nächsten Lauf zählt der
       Zähler exakt. */
    if (typeof out.runsCompleted !== "number") out.runsCompleted = Number(out.games) || 0;
    v = 9;
  }
  if (v < 10) {
    /* v9 → v10: Der Willkommensbonus wird in DECKPUNKTEN ausgezahlt statt in Stichpunkten, das Flag
       heißt deshalb `welcomeBonusPaid` statt `welcomeSpPaid` (der alte Name hätte gelogen).
       Der Wert wird ÜBERNOMMEN, nicht neu abgeleitet: Wer den Bonus in SP schon bekommen hat, bekommt
       ihn nicht ein zweites Mal in DP — und die SP von damals werden auch nicht zurückgeholt. Beides
       wäre schlechter als die kleine Ungleichheit zwischen früher und später gestarteten Profilen. */
    if (typeof out.welcomeBonusPaid !== "boolean") {
      out.welcomeBonusPaid = typeof out.welcomeSpPaid === "boolean"
        ? out.welcomeSpPaid
        : (Number(out.games) || 0) > 0;
    }
    delete out.welcomeSpPaid;
    v = 10;
  }
  if (v < 11) {
    /* v10 → v11 (#deckglow-raus): „Leuchten" (fx:deckglow) ist ersatzlos entfernt. Der Besitz-Eintrag zeigt auf
       einen Effekt, den es nicht mehr gibt → löschen, damit er nicht als toter Schlüssel durch jede weitere
       Migration wandert und ein späterer Effekt gleichen Namens ihn nicht stillschweigend erbt.
       BEWUSST OHNE DP-Erstattung (Entscheidung des Users): die Linie der Migrationen ist „keine Währung
       verschenken" (v8/v10); der Gegenpol wäre v7 gewesen, wo für entfallene Baum-Knoten SP zurückflossen. */
    if (out.ownedCosmetics && typeof out.ownedCosmetics === "object" && "fx:deckglow" in out.ownedCosmetics) {
      out.ownedCosmetics = { ...out.ownedCosmetics };
      delete out.ownedCosmetics["fx:deckglow"];
    }
    v = 11;
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
  try { localStorage.setItem(k("as_profile"), JSON.stringify(out)); } catch (e) { if (isQuotaError(e)) signalQuota("Profil"); }
  return out;
}

// Test-/Dev-Reset (geheimer Seed-Code `reset`): löscht Profil + Lauf-Fortschritt → Erstbesuch-Zustand,
// Onboarding startet neu. Betroffen: Profil (Progression/Stats/Freischalt-Flags), Highscores, Geist-Rekord,
// Lauf-Verlauf, aktiver Lauf und „Anleitung gesehen" — PLUS die Kosmetik-AUSWAHL (Deck/Battlefield/Effekte) wird
// deselektiert (auf Default). Übrige Präferenzen (Ton/Lautstärke/UI/Name) bleiben. Nur im Preview-Build aufrufbar.
/* Was der Test-Code `reset` löscht. `as_username` gehört bewusst DAZU: „reset" soll den Erstbesuch
   herstellen, und der beginnt mit der Namenseingabe (die zeigt sich genau dann, wenn kein Name
   gespeichert ist). Ohne den Schlüssel landete man nach dem Wipe im Hub — mit fremdem Fortschritt,
   aber altem Namen. Die übrigen Präferenzen (Lautstärke, Haptik, SPRACHE) überleben den Reset
   weiterhin: sie hängen nicht am Fortschritt, und die Sprache lässt sich im Namens-Dialog ohnehin
   direkt wieder wählen. */
export const RESET_KEYS = ["as_profile", "as_highscores", "as_ghost", "as_runhistory", "as_activerun", "as_tutorial_done", "as_tut_progress", "as_hints", "as_username", "as_feedback_draft", "as_feedback_sent"];
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

/* #reset: EINMALIGER Voll-Reset je Rollout. Solange der gespeicherte Stempel (`as_reset_epoch`) nicht RESET_EPOCH
   entspricht, wird GENAU EINMAL wipeProfileStorage() ausgeführt (Fortschritt · Highscores · Geist · Lauf-Historie ·
   angefangener Lauf · Username · Tutorial-Status zurück auf Null, gesperrte Kosmetik-Auswahl auf Default). Optionen
   wie Sprache/Lautstärke/Effekt-Stufe bleiben erhalten. `gate` grenzt den Reset ein (Aufrufer: alle deployten Builds,
   nicht der Dev-Server). Der Stempel wird PRO NAMENSRAUM geführt (k()-Präfix) → main und preview_ setzen unabhängig
   je genau EINMAL zurück. RESET_EPOCH ändern = erneuter Einmal-Reset bei allen Spielern JEDES Namensraums. Gibt true
   zurück, wenn tatsächlich zurückgesetzt wurde. */
// Name historisch („test") — der Stempel gilt inzwischen für ALLE Namensräume; NICHT ändern, sonst re-triggert er
// bereits zurückgesetzte Test-/Pixi-Spieler. Für einen KÜNFTIGEN Reset einen NEUEN Wert setzen.
export const RESET_EPOCH = "2026-08-16-test-neustart";
export function maybeResetForEpoch(gate) {
  if (!gate) return false;
  try {
    if (localStorage.getItem(k("as_reset_epoch")) === RESET_EPOCH) return false;
    wipeProfileStorage();
    localStorage.setItem(k("as_reset_epoch"), RESET_EPOCH);
    return true;
  } catch (e) { return false; }
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
/* Die schweren Felder eines Lauf-Eintrags. `deckSnapshot` ist mit Abstand der größte Posten; `trickLog` und `traj`
   (#rd-verlauf) sind klein, gehören aber in dieselbe Klasse — reine Detailansicht-Daten, ohne die der Eintrag
   seine Kennzahlen behält. Fallen sie weg, blendet RunDetail den jeweiligen Block aus. */
const stripSnapshot = (r) => {
  if (!r || (!r.deckSnapshot && !r.trickLog && !r.traj)) return r;
  const { deckSnapshot, trickLog, traj, ...rest } = r;
  return rest;
};
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
  const rankedSpBonus = firstRankedThisWeek && !treeDone ? RANKED_WEEK_SP : 0;
  const rankedDpBonus = firstRankedThisWeek ? (treeDone ? RANKED_WEEK_DP_FULL : RANKED_WEEK_DP) : 0;
  // Willkommensbonus: einmalig nach dem ERSTEN abgeschlossenen Lauf, in DECKPUNKTEN (s. progression.js).
  // Er hängt deshalb NICHT am SP-Guthaben und wird vom spSweep unten nicht angefasst.
  const welcomeDp = record.completed === true && !p.welcomeBonusPaid ? WELCOME_DP : 0;
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
    bestTrickScore: Math.max(n0(p.bestTrickScore), n0(record.bestTrickScore)),
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
    // die Wochensiege NICHT: ob eine Woche gewonnen ist, steht erst nach ihrem Ablauf fest und kommt aus dem
    // Board (recordChampionWeeks, aufgerufen aus dem Champions-Archiv). Hier nur unverändert weitertragen.
    hadGottgleichRun: !!p.hadGottgleichRun || isGottgleichRun(record),
    hadMeisterNoRerollRun: !!p.hadMeisterNoRerollRun || isMeisterNoRerollRun(record),
    hadChampionWeek: !!p.hadChampionWeek,
    championWeeks: n0(p.championWeeks),
    // Progression/Upgrades: Guthaben wächst um den Lauf-Ertrag; ausgegebene SP + gekaufte Knoten bleiben unverändert.
    // Bei komplettem Baum wird das SP-Guthaben zu DP gefegt (spSweep) → stichPoints 0.
    stichPoints: spBalance - spSweep,
    // Sticky: einmal ausgezahlt, nie wieder (auch wenn der Spieler später Punkte ausgibt).
    welcomeBonusPaid: !!p.welcomeBonusPaid || welcomeDp > 0,
    hadCompletedRun: !!p.hadCompletedRun || record.completed === true,
    runsCompleted: n0(p.runsCompleted) + (record.completed === true ? 1 : 0), // #hirsch-abgeschlossen
    stichSpent: n0(p.stichSpent),
    nodes: (p.nodes && typeof p.nodes === "object") ? p.nodes : {},
    // #299 DP: Guthaben wächst um den DP-Ertrag + das gefegte SP-Guthaben (bei vollem Baum); ausgegebene DP bleiben.
    // #382: + Abschluss-Bonus (completionDp) für abgeschlossene Nicht-Ranked-Läufe.
    deckPoints: n0(p.deckPoints) + runDp + completionDp + spSweep + rankedDpBonus + welcomeDp,
    deckSpent: n0(p.deckSpent),
    onboarding: onbAfter,
    spRuns: n0(p.spRuns) + (isSpRun(record, onboardingBefore) ? 1 : 0),
    // #deckshop: gekaufte Kosmetik bleibt über Läufe erhalten (recordRun baut das Profil neu → mittragen);
    // #299: Onboarding-Abschluss (6/6) hat oben ggf. das Genesis-Pack ergänzt.
    ownedCosmetics,
  };
  try { localStorage.setItem(k("as_profile"), JSON.stringify(profile)); } catch (e) { if (isQuotaError(e)) signalQuota("Profil (recordRun)"); }
  // #304 Verdienst-Rollup (Victory-Screen): die Lauf-Erträge + Onboarding-Fortschritt fürs Count-up/Balken/Countdown.
  /* Runde 4, V4 (Owner-Fund): die ANGEZEIGTE DP-Zahl muss alles tragen, was wirklich aufs Konto
     geht — vorher zählte sie nur die Meilenstein-DP (gainedDp), und ein abgeschlossener Lauf ohne
     Meilenstein zeigte „+0", obwohl der Abschluss-Bonus (+RUN_COMPLETE_DP) gutgeschrieben wurde.
     Deshalb hier dieselbe Summe wie in `deckPoints` oben, NUR OHNE welcomeDp: der Willkommensbonus
     hat auf dem Endscreen seine eigene Zeile und würde sonst doppelt erscheinen. Gross = Netto,
     seit der Challenge-Abzug weg ist (#382) — der Countdown-Zweig des Rollups bleibt schlafend. */
  const dpShown = runDp + completionDp + spSweep + rankedDpBonus;
  const earn = { sp: gainedSp, dpGross: dpShown, dpNet: dpShown, dpComplete: completionDp, spSweep, welcomeDp };
  const onboarding = { before: onboardingBefore, after: onbAfter, links: ONBOARDING_LINKS };
  return { history, profile, unlocks, earn, onboarding };
}

/* Wochensiege ins Profil schreiben (Trigger der gestuften Ranglisten-Decks, #303).
   Bewusst NICHT in recordRun: ob eine Woche gewonnen ist, steht erst fest, wenn sie ABGELAUFEN ist —
   die Zahl kommt darum aus dem Champions-Archiv (Platz 1 je vergangener Woche, LeaderboardScreen) und
   wird hier nur gespeichert. MONOTON (Math.max): ein kürzeres Archiv-Fenster oder ein fehlgeschlagener
   Board-Abruf darf einen bereits verdienten Sieg nie wieder wegnehmen.
   Gibt das (ggf. unveränderte) Profil zurück; schreibt nur, wenn sich etwas erhöht hat. */
export function recordChampionWeeks(count) {
  const p = loadProfile();
  const next = Math.max(n0(p.championWeeks), n0(count));
  if (next <= n0(p.championWeeks) && (!next || p.hadChampionWeek)) return p; // nichts Neues
  return saveProfile({ ...p, championWeeks: next, hadChampionWeek: !!next || !!p.hadChampionWeek });
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
// #sprache `lang`: gewählte Anzeigesprache ("de"|"en"). Default `null` = „noch nicht gewählt" → loadOptions
// setzt beim ersten Start die Browsersprache ein. Sobald der Spieler in den Optionen wählt, steht hier ein
// fester Wert und die Browsersprache wird nie wieder befragt.
const DEFAULT_OPTIONS = {
  lang: null,
  skin: "crt", muted: false, sfxVol: 0.4, musicVol: 0.2, deckId: "deck_onboarding", battlefieldId: "bf_onboarding",
  /* #arch-default: Combos AN, Formationen AUS. Der Architekt ist der Bau-Bildschirm — Struktur- und
     Distrikt-Boni entscheiden dort, wohin ein Gebäude gehört; die Formationsrahmen gehören der
     Aufstellung und liegen hier als zweite Rahmenlage über demselben Brett. Beide Schalter bleiben,
     und eine spätere Wahl gewinnt weiterhin (s. `liftArchFormsDefault`). */
  reducedFx: "aus", haptics: true, archShowCombos: true, archShowForms: false,
  // Ruhiger Modus (Default aus): kappt die score-abhängige Musik-Eskalation bei „mid" — nur calm/mid-Tracks. Reine UI-Pref (überlebt Reset).
  calmMusic: false,
  // #telemetrie: anonyme Lauf-Daten senden (Default AN, in den Optionen abschaltbar). Reine Pref → NICHT in
  // COSMETIC_OPTION_KEYS (überlebt den Dev-Reset, wie Ton/Haptik).
  telemetry: true,
  collapseScoreSource: true, collapseScoreTrend: true, finisher: "standard", archColor: "standard",
  // #lv-fluegel: die zwei Seitenleisten der Level-up-Karte (Deck links, Kennzahlen rechts) — nur ab 1280 px
  // sichtbar, Zustand über Läufe gemerkt. Default AN: sie sind der Grund für die breite Desktop-Fassung.
  // Reine UI-Prefs → NICHT in COSMETIC_OPTION_KEYS (überleben den Reset, wie Ton/Haptik).
  lvWingDeck: true, lvWingStats: true,
  // #lv-fluegel: Passiv-Beschreibung der Skill-Wahl aufgeklappt? Default ZU. Liegt hier statt im
  // Komponenten-State, weil die Skill-Wahl je Phase neu gemountet wird — sonst müsste man sie jedes Mal neu zuklappen.
  lvPassive: false,
  // #held-merken: „Deine Skills" in Perk- UND Skill-Wahl aufgeklappt? Default AUF (die Liste begründet die
  // Wahl). Steht aus demselben Grund hier wie `lvPassive`: die Karte wird je Phase neu gemountet.
  lvHeld: true,
  // #lv-gebaeude: Gebäude-Liste im linken Flügel aufgeklappt? Default ZU — die Liste ist Nachschlagewerk,
  // nicht Entscheidungsgrundlage, und der Flügel trägt darüber schon Brett und Deck-Stärke.
  lvWingBuildings: false,
  // #389 Floating-Text ausblenden (Default sichtbar = false). Reine UI-Prefs → NICHT in COSMETIC_OPTION_KEYS (überleben Reset).
  hideFloatScore: false, hideFloatMult: false, hideFloatWinLose: false,
  // Stich-Aufschlüsselung (§17) unter dem Feld — Default SICHTBAR (false), wie die Floating-Text-Schalter.
  // Reine UI-Pref → NICHT in COSMETIC_OPTION_KEYS (überlebt den Reset).
  hideBreakdown: false,
  // Zahlengröße (Kartenzahlen + Score-Floats): Skalierungsfaktor 0,75–1,25. Default = KLEINSTE Stufe (0,75),
  // die Zahlen sind sonst vielen zu groß. Reine UI-Pref (überlebt Reset).
  numScale: 0.75,
  // #393 Zufalls-Deck je Lauf: jeder neue Lauf startet mit einem zufälligen besessenen (farbigen) Deck-Pack + alle aktiven
  //   Effekte in Deckfarbe. Reine UI-Pref (überlebt Reset, wie haptics) → NICHT in COSMETIC_OPTION_KEYS.
  randomDeckEachRun: false,
  // #tiered zuletzt gewählte Stufe je Stufen-Deck: { <packId>: <deckId> } — merkt sich die I/II/III-Wahl, damit
  //   der Zufalls-Modus dieselbe Stufe zieht. Kosmetik-Auswahl → in COSMETIC_OPTION_KEYS (Reset setzt zurück).
  tierSel: {},
  // Effekt-Toggles (Ein/Aus). fxSonnenPuls = freier Default an; alles andere aus.
  fxAurora: false, fxNeonsurf: false, fxStarfield: false, fxCubeMatrix: false,
  fxEdgeGlow: false, fxHolo: false, fxGlitch: false,
  fxSonnenPuls: true, fxLaserFaecher: false, fxPrismaKaskade: false, fxHoloCube: false, fxSupernova: false,
  // Cube-Matrix-Optik (Sonne default an; Wire aus).
  fxCubeMatrixSun: true, fxCubeMatrixWire: false,
  /* Farbmodus-Flags Standard ↔ Deckfarbe. **Default ist seit 19.08.2026 die DECKFARBE** (war Standard).
     Begründung: die Karten-Animationen (Edge/Holo/Glitch) laufen ohnehin IMMER in der Deckfarbe und haben
     deshalb gar kein Flag — ein frisch gekaufter Hintergrund- oder Prunk-Effekt fiel daneben als einziger
     auf einen deckfremden Standardton zurück, und zwar genau im Moment des Kaufs, in dem man ihn zum ersten
     Mal sieht. Der Standardton bleibt als Wahl erhalten, er ist nur nicht mehr die Vorauswahl.
     Weil die Flags GLOBAL sind (nicht je gekauftem Stück), deckt der Default den Fall „direkt nach Kauf"
     mit ab: ein neu freigeschalteter Effekt liest beim ersten Rendern schon `true`. */
  fxAuroraDeck: true, fxNeonsurfDeck: true, fxStarfieldDeck: true, fxCubeMatrixDeck: true,
  fxScorchDeck: true, fxBlackholeDeck: true, fxKlingeDeck: true, fxHologridDeck: true,
  fxSonnenPulsDeck: true, fxLaserFaecherDeck: true, fxPrismaKaskadeDeck: true, fxHoloCubeDeck: true, fxSupernovaDeck: true,
  // #vorschau-deck: „Gottgleich · Standard" (kein Prunk gekauft) hatte als einziger Gottgleich-Eintrag KEINEN
  // Farbmodus — der Chrome-Schriftzug stand dort fest auf dem Synthwave-Zweiton, während jeder Prunk daneben
  // umfärben konnte. Der Schlüssel passt auf die `/^fx.+Deck$/`-Regex und hängt sich damit von selbst in
  // FX_DECK_KEYS (Anhebung + Dev-Reset) ein — nichts weiter einzutragen.
  fxGottStandardDeck: true,
  /* #arch-default: Marker der EINMALIGEN Absenkung bestehender Stände (s. `liftArchFormsDefault`).
     Aus demselben Grund `false` wie der Marker darunter. */
  archFormsDefaultLift: false,
  /* Marker der EINMALIGEN Anhebung bestehender Stände (s. `liftFxDeckDefaults`). Muss `false` sein: der
     Merge in `loadOptions` legt DEFAULT_OPTIONS UNTER den gespeicherten Stand — stünde hier `true`, käme
     der Marker für Alt-Profile aus den Defaults und die Anhebung liefe nie. */
  fxDeckDefaultLift: false,
};
/* Die 13 Farbmodus-Flags als Liste — EINE Wahrheit für Anhebung und Wächter. Ohne sie stünden dieselben
   dreizehn Namen ein drittes Mal da (Defaults · COSMETIC_OPTION_KEYS · Migration), und die Liste, die man
   beim nächsten neuen Effekt vergisst, ist immer die, die niemand liest. */
export const FX_DECK_KEYS = Object.keys(DEFAULT_OPTIONS).filter((key) => /^fx.+Deck$/.test(key));
// #: Kosmetik-AUSWAHL-Felder in den Optionen (equipped Deck/Battlefield + alle Effekt-Toggles) — beim Dev-Reset
// auf Default zurückgesetzt (deselektiert). Restliche Options-Prefs (Ton/UI/Name) bleiben unberührt.
// #322 Gottgleich-Prunk-Toggles: Dev-Reset stellt Sonnen-Puls (Default true) wieder her und wählt die kaufbaren ab.
// #347: alle Kosmetik-Auswahlfelder (equipped Deck/Battlefield + ALLE Effekt-Toggles + Farbmodus-Flags + Cube-Optik) →
//   der Profil-Wipe setzt sie sauber auf DEFAULT_OPTIONS zurück. Nicht-Kosmetik-Prefs (Ton/Lautstärke/UI/Haptik) bleiben.
export const COSMETIC_OPTION_KEYS = [
  "deckId", "battlefieldId", "finisher", "archColor", "tierSel",
  "fxAurora", "fxNeonsurf", "fxStarfield", "fxCubeMatrix", "fxEdgeGlow", "fxHolo", "fxGlitch",
  "fxSonnenPuls", "fxLaserFaecher", "fxPrismaKaskade", "fxHoloCube", "fxSupernova",
  "fxCubeMatrixSun", "fxCubeMatrixWire",
  // #fx-deckdefault: aus FX_DECK_KEYS statt dreizehn Namen ein zweites Mal — ein neuer Effekt mit Farbmodus
  // wird damit automatisch mit zurückgesetzt, statt hier vergessen zu werden.
  ...FX_DECK_KEYS,
];
/* #331 Einfachauswahl erzwingen (Migration/Normalisierung beim Laden): Hintergrund-Effekte (Aurora/Würfel-Matrix/
   Glutfunken/Komet) und Karten-Animationen (Neonrahmen/Holo-Sweep/Glitch) sind jetzt einfach-exklusiv. Alt-Stände, in
   denen mehrere gleichzeitig an waren (z. B. Aurora + Glutfunken), werden auf GENAU EINEN reduziert (feste Priorität =
   Reihenfolge), Rest aus. Besitz (ownedCosmetics) unberührt. */
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
/* #ansage-deck / #fx-deckdefault — bestehende Stände EINMALIG auf den neuen Default heben.
   Ein geänderter Default allein erreicht sie nicht: `loadOptions` merged `{...DEFAULT_OPTIONS, ...o}`,
   der gespeicherte Wert gewinnt also immer — dieselbe Naht, an der schon `fxDeckGlow` hängen blieb.
   Vertretbar ist die Anhebung, weil `false` bis hierher der DEFAULT war: ein gespeichertes `false` lässt
   sich nicht von „nie angefasst" unterscheiden, es gibt also keine bewusste Wahl zu überschreiben.
   Der Marker sorgt dafür, dass es bei genau einem Mal bleibt — wer danach „Standard" wählt, behält das. */
export function liftFxDeckDefaults(o) {
  if (o.fxDeckDefaultLift) return false;
  for (const key of FX_DECK_KEYS) o[key] = true;
  o.fxDeckDefaultLift = true;
  return true;
}
/* #arch-default — bestehende Stände EINMALIG auf den neuen Vorgabewert bringen (Formationen AUS).

   Dieselbe Naht wie bei `liftFxDeckDefaults` darüber, nur in die andere Richtung: `loadOptions` merged
   `{...DEFAULT_OPTIONS, ...o}`, der gespeicherte Wert gewinnt also immer. Und gespeichert ist der Wert
   bei JEDEM Profil, das je eine Option angefasst hat — `saveOptions` schreibt das ganze Objekt. Ein
   geänderter Vorgabewert allein wäre damit für niemanden sichtbar, auch nicht für ein frisch wirkendes
   Profil.

   EHRLICH DAZU: Hier lässt sich ein gespeichertes `true` NICHT von einer bewussten Wahl unterscheiden —
   anders als bei der Anhebung darüber, wo der alte Default `false` war. Übergangen wird trotzdem fast
   niemand: `true` war bis hierher der Default, eine bewusste Wahl „an" setzt also voraus, dass jemand
   den Schalter erst aus- und dann wieder eingeschaltet hat. Wen es doch trifft, dem kostet es EINEN
   Klick — und ab da gewinnt seine Wahl wieder, dafür sorgt der Marker.

   `archShowCombos` bleibt unangetastet: dessen Default war schon `true` und ist es weiterhin. */
export function liftArchFormsDefault(o) {
  if (o.archFormsDefaultLift) return false;
  o.archShowForms = false;
  o.archFormsDefaultLift = true;
  return true;
}
export function normalizeFxOptions(o) {
  if (!o || typeof o !== "object") return o;
  liftFxDeckDefaults(o);
  reduceExclusive(o, BG_EXCL_OPTS);
  reduceExclusive(o, CARD_ANIM_OPTS);
  // #deckglow-raus: „Leuchten" gibt es nicht mehr. Der Schlüssel würde sonst über den `{...DEFAULT_OPTIONS, ...o}`-
  // Merge in loadOptions ewig weitergeschrieben — ein toter Wert, den ein späterer Effekt mit gleichem Namen still erbt.
  delete o.fxDeckGlow;
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
/* #optionen-redesign: EXACTLY the keys the options screen owns, at their defaults.

   The reset button in that screen's footer writes these and nothing else. DEFAULT_OPTIONS also holds
   the chosen deck, the battlefield, the finisher, the archetype colour and a dozen collapse states —
   a "reset settings" button that discarded a player's cosmetic choices would be a different button
   than its label promises. Note the direction: the COSMETIC_OPTION_KEYS reset above clears exactly
   the set this one leaves alone, and vice versa. Two resets, disjoint, and neither is the other.

   `lang` is deliberately absent. The player just used it to read the button.

   `reducedFx` resolves through deviceDefaultReducedFx() rather than the raw literal, because the
   effective default is device-dependent (phone "mobile", desktop "aus") and a reset that ignored
   that would hand a phone the desktop's effect budget.

   `numScale` is 0.75 and that is not a typo: the smallest step is the deliberate default (see the
   comment at the key itself). */
export function defaultScreenOptions() {
  return {
    muted: DEFAULT_OPTIONS.muted,
    sfxVol: DEFAULT_OPTIONS.sfxVol,
    musicVol: DEFAULT_OPTIONS.musicVol,
    haptics: DEFAULT_OPTIONS.haptics,
    calmMusic: DEFAULT_OPTIONS.calmMusic,
    telemetry: DEFAULT_OPTIONS.telemetry,
    reducedFx: deviceDefaultReducedFx(),
    hideFloatScore: DEFAULT_OPTIONS.hideFloatScore,
    hideFloatMult: DEFAULT_OPTIONS.hideFloatMult,
    hideFloatWinLose: DEFAULT_OPTIONS.hideFloatWinLose,
    hideBreakdown: DEFAULT_OPTIONS.hideBreakdown,
    numScale: DEFAULT_OPTIONS.numScale,
  };
}

export function loadOptions() {
  try {
    const raw = localStorage.getItem(k("as_options"));
    if (raw) {
      const o = JSON.parse(raw);
      if (o && typeof o === "object") {
        const before = o.reducedFx, hatteLift = !!o.fxDeckDefaultLift;
        const hatteArchLift = !!o.archFormsDefaultLift;   // #arch-default: eigener Marker, eigene Einmaligkeit
        const merged = normalizeFxOptions({ ...DEFAULT_OPTIONS, ...o });
        liftArchFormsDefault(merged);
        merged.reducedFx = migrateReducedFx(before);
        /* #363 einmalig zurückschreiben, damit kein „auto"/„ausgewogen" (oder fehlender Schlüssel) im Profil
           verbleibt. #fx-deckdefault: die Anhebung MUSS mit zurückgeschrieben werden — sonst fehlt der Marker
           beim nächsten Laden wieder und sie überschriebe ein bewusstes „Standard" bei jedem Start erneut. */
        if (merged.reducedFx !== before || !hatteLift || !hatteArchLift) { try { saveOptions(merged); } catch (e) {} }
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

/* TUTORIAL-FORTSCHRITT — hier zentral, damit der Preview-Namespace (P) auch diese Keys trennt und der
   Test-Build den Erstbesuch-Zustand der echten Seite nicht setzt.

   Der geführte Lauf kannte nur einen Boolean („gesehen, ja/nein"). Die Sektionen brauchen mehr: WELCHE
   Lektionen gelesen sind und WO man weitermachen kann. Das ist eine andere Form, also ein anderer
   Schlüssel — `as_tutorial_done` wird NICHT umgedeutet.

   Der alte Schlüssel wird aber weiter GELESEN (nie geschrieben): wer den geführten Lauf seinerzeit
   durchlaufen hat, soll das laute Erstkontakt-Angebot im Hub nicht ein zweites Mal bekommen. Das ist
   eine Zeile statt einer Migration, und ein verwaister Boolean im localStorage kostet nichts. */
const TUT_PROGRESS = "as_tut_progress";
const TUT_LEGACY   = "as_tutorial_done";   // geführter Lauf, zurückgebaut — nur noch gelesen

// { seen: ["sektion/lektion", …], last: "sektion/lektion" | null }
export function loadTutorialProgress() {
  try {
    const raw = localStorage.getItem(k(TUT_PROGRESS));
    const p = raw ? JSON.parse(raw) : null;
    if (!p || typeof p !== "object") return { seen: [], last: null };
    return { seen: Array.isArray(p.seen) ? p.seen.filter((x) => typeof x === "string") : [],
             last: typeof p.last === "string" ? p.last : null };
  } catch (e) { return { seen: [], last: null }; }
}
export function saveTutorialProgress(p) {
  try {
    localStorage.setItem(k(TUT_PROGRESS), JSON.stringify({
      seen: [...new Set((p && p.seen) || [])], last: (p && p.last) || null,
    }));
  } catch (e) {}
}

/* Hat der Spieler das Tutorial je GEÖFFNET? Steuert allein, ob das laute Erstkontakt-Angebot über
   „Lauf beginnen" noch erscheint — der ruhige Chip unten bleibt ohnehin immer.

   Bewusst „geöffnet", nicht „abgeschlossen": es gibt keinen Abschluss mehr, den man erreichen könnte
   (kein Lohn, kein Tor — Owner-Entscheidung). Wer eine Lektion gelesen hat, hat den Einstieg gefunden;
   ihn weiter anzuwerben wäre lästig, ihm „fertig" zu sagen wäre gelogen. */
export function tutorialOpened() {
  try { if (localStorage.getItem(k(TUT_LEGACY))) return true; } catch (e) { /* kein localStorage */ }
  return loadTutorialProgress().seen.length > 0;
}

/* ONBOARDING-HINTS (docs/tutorial-onboarding-design.md §5) — the in-run hint layer's memory.
   `seen`   hint ids already shown (or skipped for good) — first occurrence means first in the
            profile's life, no hint ever repeats (§5.4 rule 4).
   `visits` 1-based phase-visit counters ({ formation, architect, perk, skill }) — the suggestion
            sequences and H3b/H5 key off these.
   `last`   per screen, the context key ("screen:seed:cycle") of the visit already counted, so a
            reload mid-phase does not double-count.
   Its own key, not part of the tutorial-sections progress: the Probierfeld is pull material with
   its own lifecycle; wiping one must not wipe the other except through the full reset. */
const HINTS_KEY = "as_hints";
export function loadHintProgress() {
  try {
    const raw = localStorage.getItem(k(HINTS_KEY));
    const p = raw ? JSON.parse(raw) : null;
    if (!p || typeof p !== "object") return { seen: [], visits: {}, last: {}, seenAt: {} };
    return { seen: Array.isArray(p.seen) ? p.seen.filter((x) => typeof x === "string") : [],
             visits: (p.visits && typeof p.visits === "object") ? p.visits : {},
             last: (p.last && typeof p.last === "object") ? p.last : {},
             // Runde 2, R19: je Hint der Phasen-Kontext, in dem er gesehen wurde — C6 („Phase danach")
             // braucht die Unterscheidung „C5 in DIESER Phase ✕" vs. „in einer früheren".
             seenAt: (p.seenAt && typeof p.seenAt === "object") ? p.seenAt : {} };
  } catch (e) { return { seen: [], visits: {}, last: {}, seenAt: {} }; }
}
export function saveHintProgress(p) {
  try {
    localStorage.setItem(k(HINTS_KEY), JSON.stringify({
      seen: [...new Set((p && p.seen) || [])], visits: (p && p.visits) || {}, last: (p && p.last) || {},
      seenAt: (p && p.seenAt) || {},
    }));
  } catch (e) {}
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

/* ============================================================
   FEEDBACK-MELDER (#396) — Entwurf parken + Bremse

   Zwei kleine Schlüssel, beide in RESET_KEYS:
     as_feedback_draft — ein Report, dessen Versand fehlschlug. Geht beim nächsten Menü-Besuch
                         still noch einmal raus. Ohne das wäre ein Report bei Funkloch verloren,
                         und genau dann tippt jemand am ausführlichsten.
     as_feedback_sent  — Zeitstempel der letzten Sendungen für die clientseitige Bremse.
   ============================================================ */
const FEEDBACK_MIN_GAP_MS = 30_000;   // frühestens 30 s nach dem letzten Report
const FEEDBACK_MAX_PER_DAY = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export function loadFeedbackDraft() {
  try {
    const raw = localStorage.getItem(k("as_feedback_draft"));
    if (raw) { const d = JSON.parse(raw); if (d && typeof d === "object") return d; }
  } catch (e) {}
  return null;
}
export function saveFeedbackDraft(entry) {
  try { localStorage.setItem(k("as_feedback_draft"), JSON.stringify(entry)); } catch (e) {}
}
export function clearFeedbackDraft() {
  try { localStorage.removeItem(k("as_feedback_draft")); } catch (e) {}
}

const loadSentStamps = () => {
  try {
    const raw = localStorage.getItem(k("as_feedback_sent"));
    if (raw) { const l = JSON.parse(raw); if (Array.isArray(l)) return l.filter((n) => typeof n === "number"); }
  } catch (e) {}
  return [];
};

/* Darf JETZT gesendet werden? Gibt `{ ok }` bzw. `{ ok:false, reason, waitMs }` zurück — der
   Aufrufer zeigt daraus einen sichtbaren Hinweis. Bewusst KEIN stilles Verweigern: wer nicht
   erfährt, warum nichts passiert, meldet kein zweites Mal.
   `now` ist Parameter (nicht `Date.now()` innen), damit der Test die Uhr stellen kann. */
export function feedbackRateCheck(now = Date.now()) {
  const stamps = loadSentStamps().filter((t) => now - t < DAY_MS);
  const last = stamps.length ? Math.max(...stamps) : 0;
  if (last && now - last < FEEDBACK_MIN_GAP_MS) {
    return { ok: false, reason: "tooSoon", waitMs: FEEDBACK_MIN_GAP_MS - (now - last) };
  }
  if (stamps.length >= FEEDBACK_MAX_PER_DAY) return { ok: false, reason: "dailyCap", waitMs: 0 };
  return { ok: true };
}

// Eine erfolgreiche Sendung vermerken (hält nur das Tagesfenster vor).
export function noteFeedbackSent(now = Date.now()) {
  const stamps = loadSentStamps().filter((t) => now - t < DAY_MS);
  stamps.push(now);
  try { localStorage.setItem(k("as_feedback_sent"), JSON.stringify(stamps)); } catch (e) {}
}

export { FEEDBACK_MIN_GAP_MS, FEEDBACK_MAX_PER_DAY };
