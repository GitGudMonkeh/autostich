/* #telemetrie — anonyme Lauf-Telemetrie für den Beta-Playtest.

   ZWECK: Balancing-Daten aus echten Läufen (Perk-/Skill-Pickraten, Score-Herkunft, Upgrade-Baum, gekaufte
   Decks, Abbruchpunkte) — Gegenstück zum Sim, nur mit echten Spielern.

   ARCHITEKTUR (bewusst wie leaderboard.js: dependency-frei per fetch, self-contained für Pages/CSP):
     • EINE Zeile pro Lauf in einer EIGENEN Tabelle (`autostich_telemetry`) — getrennt vom Leaderboard, damit
       eine volllaufende/fehlerhafte Telemetrie die Bestenliste niemals beschädigt.
     • Kein PII: keine Namen, keine IPs, kein Login. Nur eine lokal gewürfelte, pseudonyme Install-ID.
     • Opt-out über die Optionen (Default AN). Aus = es verlässt nichts das Gerät, auch die Queue nicht.
     • Fire-and-forget: JEDER Fehler wird geschluckt. Telemetrie darf einen Lauf nie stören.
     • Retry-Queue in localStorage: fehlgeschlagene Uploads (offline, Handy im Tunnel) gehen beim nächsten
       Start raus. Ohne das verliert man in einer Mobile-Beta einen zweistelligen Prozentsatz.

   AUSWERTUNG: docs/telemetry.md (Schema, SQL-Views, Discord-Anbindung). */
import { nsKey } from "./storage.js";
// Build-Zuordnung über den BESTEHENDEN Versions-/Build-Stempel (#250) — dieselbe Quelle wie die Anzeige unten
// im Startbildschirm. Bewusst kein zweiter, eigener Stempel: zwei konkurrierende Build-Kennungen driften
// unweigerlich auseinander, und genau daran hängt die Zuordnung „welcher Lauf zu welchem Balancing-Stand".
import { VERSION_LABEL, BUILD_SHA, BUILD_ENV } from "../ui/version.js";

const BASE = import.meta.env.VITE_SUPABASE_URL;
const KEY  = import.meta.env.VITE_SUPABASE_KEY;
// Preview-/Testbranch-Build schreibt in eine EIGENE Tabelle. Sonst verseucht das eigene Testen (Dev-Runs,
// Voll-Katalog-Angebote, Balance-Experimente) genau den Datensatz, aus dem später Balancing-Schlüsse gezogen werden.
const PREVIEW = import.meta.env.VITE_PREVIEW === "1";
const TABLE = PREVIEW ? "autostich_telemetry_dev" : "autostich_telemetry";
export const telemetryConfigured = !!(BASE && KEY);
const REST = `${BASE}/rest/v1/${TABLE}`;

// „v0.4.007" (CI) bzw. „v0.4·dev" (lokal) · kurze SHA · Umgebung (main|test|pixi|balancing|dev).
// BUILD_ENV ist für die Auswertung wichtiger, als es aussieht: es trennt Beta-Läufe von unseren eigenen
// Test-Deploys, ohne dass man die Zeilen später mühsam über Zeitfenster auseinanderklauben muss.
const APP_VERSION = VERSION_LABEL;
const GIT_SHA     = BUILD_SHA;

const QUEUE_KEY = () => nsKey("as_telemetry_queue");
const INSTALL_KEY = () => nsKey("as_install_id");
// Queue-Deckel: mehr als das ist kein Nachreichen mehr, sondern ein Datenfriedhof (und sprengt die Quota,
// die sich den Platz mit Profil/Lauf-Historie/Resume-Snapshot teilt). Älteste fliegen zuerst.
const QUEUE_CAP = 12;

/* Pseudonyme Install-ID — würfelt beim ersten Aufruf und bleibt dann liegen. Damit lassen sich Läufe
   DESSELBEN Testers verketten (Lernkurve, „welcher Build wurde wie oft gespielt"), ohne zu wissen, WER das ist.
   crypto.randomUUID ist auf allen Zielbrowsern da; der Fallback hält Alt-/Nicht-Secure-Contexts am Leben. */
function uuid() {
  try { if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  // RFC-4122-förmiger Fallback (Version/Variant-Bits gesetzt) — nur Anzeige-/Gruppierungszweck, keine Krypto.
  const h = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 36; i++) s += (i === 8 || i === 13 || i === 18 || i === 23) ? "-"
    : i === 14 ? "4"
    : i === 19 ? h[(Math.floor(Math.random() * 4) + 8)]
    : h[Math.floor(Math.random() * 16)];
  return s;
}
export function installId() {
  try {
    const cur = localStorage.getItem(INSTALL_KEY());
    if (cur) return cur;
    const id = uuid();
    localStorage.setItem(INSTALL_KEY(), id);
    return id;
  } catch (e) { return "anon"; }
}
// Session = ein Seitenaufruf. Trennt „5 Läufe am Stück" von „5 Läufe über die Woche".
const SESSION_ID = uuid();

/* Gerätekontext — grob und zweckgebunden: erklärt Perf-Beschwerden und zeigt den Mobile-Anteil.
   Der User-Agent wird gekappt; er dient der Bug-Zuordnung, nicht dem Fingerprinting.

   #datenschutz: UA_MAX ist exportiert, weil der Datenschutz-Hinweis die Zahl NENNT. Stünde sie dort als
   Text, liefe sie beim nächsten Anfassen dieser Zeile still weg — und ein Datenschutz-Hinweis, der etwas
   anderes behauptet als der Code tut, ist schlimmer als keiner. Der i18n-Wächter „beide Sprachen nennen
   dieselben Zahlen" prüft nur DE↔EN, nicht Text↔Code; diese Naht muss der Export halten. */
export const UA_MAX = 180;
function clientInfo(options) {
  const info = { fx: (options && options.reducedFx) || null };
  try {
    if (typeof navigator !== "undefined") {
      info.ua = String(navigator.userAgent || "").slice(0, UA_MAX);
      if (navigator.hardwareConcurrency) info.cpu = navigator.hardwareConcurrency;
      if (navigator.deviceMemory) info.mem = navigator.deviceMemory;
      if (navigator.language) info.lang = String(navigator.language).slice(0, 10);
    }
    if (typeof window !== "undefined") {
      info.w = window.innerWidth; info.h = window.innerHeight;
      info.dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100;
      info.touch = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    }
  } catch (e) {}
  return info;
}

// bigint-Spalten dulden nur ganze Zahlen — die Engine-Scores sind Floats aus multiplizierten Werten.
// Derselbe Fallstrick wie #241 im Leaderboard (Float-Insert → 400 → stiller Datenverlust): hier gleich runden.
const int = (v) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);

/* REINER Payload-Bau (kein localStorage/navigator/Date außer dem übergebenen Kontext) → unit-testbar.
   `outcome`: "completed" (Lauf natürlich zu Ende) | "ended" (bewusst beendet/verlassen) | "abandoned"
   (Tab geschlossen / Seite entladen — der Lauf lief noch). */
export function buildRunPayload({ state, localEntry, profile, options, outcome, durationMs, runId, client }) {
  const s = state || {};
  const e = localEntry || {};
  const p = profile || {};
  return {
    install_id: null, session_id: null, // von sendRun() gefüllt (Transport-Belang, nicht Payload-Belang)
    run_id: int(runId),
    app_version: APP_VERSION,
    git_sha: GIT_SHA,
    build_env: BUILD_ENV,
    outcome: outcome || "ended",
    // --- Lauf-Rahmen -------------------------------------------------------------------------------
    seed: s.seed != null ? int(s.seed >>> 0) : null,
    ranked: s.ranked || null,
    week_mods: Array.isArray(s.weekMods) ? s.weekMods : null,
    cycles: int(e.cycles ?? s.cycle),
    tricks: int(e.tricks ?? s.trickNo),
    score: int(e.score ?? s.score),
    duration_ms: int(durationMs),
    // --- Ergebnis-Kennzahlen (identisch zu denen, die lokal ohnehin gespeichert werden) --------------
    best_streak: int(e.bestStreak ?? s.bestStreak),
    crits: int(e.crits ?? s.crits),
    wins: int(e.wins ?? s.wins),
    max_formations: int(e.maxFormations ?? s.maxFormations),
    formation_score: int(e.formationScore ?? s.formationScore),
    crit_bonus_score: int(e.critBonusScore ?? s.critBonusScore),
    best_trick_score: int(e.bestTrickScore ?? s.bestTrickScore),
    rerolls_used: int(s.rerollsUsed || 0),
    // --- Score-Herkunft je Fraktion (die eigentliche Balance-Frage: WER trägt den Score) ------------
    channels: {
      glacier: int(s.glacierYield || 0), streak: int(s.streakScore || 0), light: int(s.lightYield || 0),
      plantRoot: int(s.plantRoot || 0), plantBloom: int(s.plantBloom || 0), plantHarvest: int(s.plantHarvest || 0),
      fireBase: int(s.fireBase || 0), fireWhite: int(s.fireWhite || 0),
      formation: int(s.formationScore || 0), building: int(s.buildingScore || 0),
      ion: int(s.ionTotal || 0), growth: int(s.growthTotal || 0), ashBurned: int(s.ashBurned || 0), brand: int(s.brandTotal || 0),
    },
    // --- Build ------------------------------------------------------------------------------------
    perks: Array.isArray(s.perks) ? s.perks : [],
    skills: Array.isArray(s.skills) ? s.skills : [],
    archetypes: Array.isArray(e.archetypes) ? e.archetypes : [],
    family_tiers: s.familyTiers || {},
    buildings: (((s.architectEnabled && s.architect && s.architect.buildings) || []))
      .map((b) => ({ f: b.familyId, t: b.tier, n: (b.footprint || []).length })),
    // --- Entscheidungen (Angebot ↔ Wahl, siehe decisionLog.js) — das Herzstück fürs Balancing -------
    decisions: Array.isArray(s.decisionLog) ? s.decisionLog : [],
    // --- Meta-Fortschritt: Upgrade-Baum + gekaufte Kosmetik ---------------------------------------
    tree: {
      nodes: p.nodes || {}, sp: int(p.stichPoints || 0), spSpent: int(p.stichSpent || 0),
      dp: int(p.deckPoints || 0), dpSpent: int(p.deckSpent || 0),
      games: int(p.games || 0), bestScore: int(p.bestScore || 0),
    },
    cosmetics: {
      owned: Object.keys(p.ownedCosmetics || {}),
      deck: (options && options.deckId) || null,
      battlefield: (options && options.battlefieldId) || null,
      finisher: (options && options.finisher) || null,
    },
    client: client || null,
  };
}

/* ---------------------------------------------------------------------------------------------------
   TRANSPORT — Queue + Versand. Alles best-effort, alles gekapselt in try/catch. */

const readQueue = () => {
  try { const raw = localStorage.getItem(QUEUE_KEY()); const q = raw ? JSON.parse(raw) : []; return Array.isArray(q) ? q : []; }
  catch (e) { return []; }
};
const writeQueue = (q) => {
  // Bei Quota-Not lieber die Telemetrie opfern als den Spielstand: einmal halbieren, sonst Queue leeren.
  try { localStorage.setItem(QUEUE_KEY(), JSON.stringify(q)); return; } catch (e) {}
  try { localStorage.setItem(QUEUE_KEY(), JSON.stringify(q.slice(-Math.ceil(q.length / 2)))); return; } catch (e) {}
  try { localStorage.removeItem(QUEUE_KEY()); } catch (e) {}
};

// Ein Batch rausschicken. `keepalive` hält den Request beim Entladen der Seite am Leben (das kann
// sendBeacon auch, aber ohne die apikey-Header, die PostgREST braucht — deshalb fetch+keepalive).
async function post(rows, keepalive = false) {
  const res = await fetch(REST, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(rows),
    keepalive,
  });
  if (!res.ok) throw new Error(`telemetry ${res.status}`);
  return true;
}

/* Opt-out heißt WIRKLICH aus: die noch nicht gesendete Warteschlange wird verworfen, nicht nur pausiert.
   Sonst würde ein Abschalten die zuletzt gespielten Läufe trotzdem noch rausschicken — genau das, was der
   Schalter verhindern soll. */
export function purge() {
  try { localStorage.removeItem(QUEUE_KEY()); } catch (e) {}
}

let inflight = null;
let again = false;
/* Queue leeren. Läuft beim Start und nach jedem neuen Eintrag. Erfolg → Queue weg; Fehler → Queue bleibt
   für den nächsten Versuch liegen (aber gedeckelt). Ein 4xx (Schema-Drift, zu groß) darf NICHT ewig
   wiederholt werden — sonst blockiert eine kaputte Zeile alle nachfolgenden. Deshalb: 4xx verwirft.

   Nebenläufigkeit: läuft schon ein Versand, wird DESSEN Promise zurückgegeben — aber gemerkt, dass in der
   Zwischenzeit noch etwas dazukam (`again`). Der laufende Versand hängt dann eine weitere Runde an. Ohne das
   bliebe ein Lauf liegen, der genau während eines noch offenen Uploads fertig wird (Läufe hintereinander weg
   sind im Playtest der Normalfall) — und ein `await flush()` käme auf einem halben Zustand zurück. */
export function flush({ keepalive = false } = {}) {
  if (!telemetryConfigured) return Promise.resolve();
  if (inflight) { again = true; return inflight; }
  if (!readQueue().length) return Promise.resolve();
  inflight = (async () => {
    await doFlush(keepalive);
    // `again` VOR dem Versuch zurücksetzen → nur ein während DIESER Runde eintreffender Wunsch verlängert erneut.
    while (again) { again = false; if (readQueue().length) await doFlush(keepalive); }
  })().finally(() => { inflight = null; again = false; });
  return inflight;
}
async function doFlush(keepalive) {
  const q = readQueue();
  if (!q.length) return;
  try {
    await post(q, keepalive);
    writeQueue([]);
  } catch (err) {
    const status = Number(String(err && err.message).replace(/\D+/g, "")) || 0;
    if (status >= 400 && status < 500) {
      // Dauerhaft unzustellbar (falsche Spalte, RLS, zu groß) → verwerfen und einmal sichtbar machen.
      try { console.warn(`[telemetry] Batch verworfen (HTTP ${status}) — Schema/RLS prüfen (docs/telemetry.md).`); } catch (e) {}
      writeQueue([]);
    }
    // 5xx / Netzfehler → liegen lassen, nächster Versuch beim nächsten Start.
  }
}

/* Einen Lauf erfassen. `enabled` kommt aus den Optionen (Opt-out) — ist es aus, passiert GAR NICHTS,
   auch kein Queue-Schreiben. Rückgabe: true, wenn der Lauf in die Queue ging. */
export function recordRun(args) {
  if (!telemetryConfigured || args?.enabled === false) return false;
  try {
    const payload = buildRunPayload(args);
    payload.install_id = installId();
    payload.session_id = SESSION_ID;
    if (!payload.client) payload.client = clientInfo(args.options);
    const q = readQueue();
    q.push(payload);
    writeQueue(q.slice(-QUEUE_CAP));
    // Nicht awaiten: der Aufrufer steht im Victory-Screen-Pfad und darf nicht auf das Netz warten.
    flush({ keepalive: !!args.keepalive });
    return true;
  } catch (e) { return false; }
}

/* Abgebrochene Läufe (Tab zu / Reload mitten im Lauf). Ohne das fehlt in den Daten genau die Gruppe,
   die das Pacing am deutlichsten bewertet: die, die aufgehört haben. Genau EINMAL pro Lauf — ein Lauf,
   der später fortgesetzt und beendet wird, erzeugt zusätzlich seine reguläre Abschlusszeile (in der
   Auswertung nach `outcome` filtern, siehe docs/telemetry.md). */
const abandoned = new Set();
export function recordAbandoned(args) {
  const id = args && args.runId;
  if (id == null || abandoned.has(id)) return false;
  if (!args.state || !(args.state.trickNo > 0)) return false; // nie gestarteter Lauf → nichts zu erzählen
  abandoned.add(id);
  return recordRun({ ...args, outcome: "abandoned", keepalive: true });
}

