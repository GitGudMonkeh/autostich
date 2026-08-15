/* Musik-Manager (#111, Sound Phase 2) — HTMLAudio (Streaming + Loop), KEIN game/-Bezug.
   Getrennt vom SFX-Web-Audio (audio.js): Menü & Victory = „Relay of Multipliers"; im Run ein zufälliger Track
   aus dem harmonisierten Pool (mp3_norm). Autoplay-Gate: die erste User-Geste ruft unlock().
   Eigene Lautstärke (Optionen · Default 0,2); globaler „Ton stumm" mutet auch die Musik. */
/* #F-01 Medien-Auslagerung: Die Musik liegt NICHT mehr im Vite-Graph (früher `import … from "../assets/music/*.m4a"`).
   Grund: jeder der vier Pages-Slots (main · test · pixi · balancing) baute die 55 Tracks als gehashte Assets erneut
   mit — 148 MB pro Build, ~440 MB Duplikate auf einer Seite mit 1 GB Limit. Die Dateien liegen jetzt unter `media/`
   im Repo, werden EINMAL zentral nach `<base>/media/` veröffentlicht (Workflow deploy-media.yml) und von allen Slots
   per URL referenziert. Der Ton verhält sich identisch — HTMLAudio streamte schon vorher von einer URL, nur trug die
   vorher einen Build-Hash.
   VITE_MEDIA_BASE: Dev = "/media/" (Middleware in vite.config.js serviert direkt aus dem Repo), Prod/Preview =
   "/autostich/media/" (absolut → für alle Slots derselbe Pfad, egal ob sie unter /, /test/, /pixi/ oder /balancing/ laufen).
   ACHTUNG: ohne Build-Hash gibt es kein automatisches Cache-Busting. Ein GEÄNDERTER Track braucht einen neuen
   Dateinamen, sonst behalten Clients die alte Fassung. Neue Tracks sind davon nicht betroffen. */
const MEDIA_BASE = import.meta.env.VITE_MEDIA_BASE || "/autostich/media/";
const track = (file) => `${MEDIA_BASE}music/${file}.m4a`;
const relay_of_multipliers = track("relay_of_multipliers");
// #171: neu normalisierte Tracks (EBU R128, −14 LUFS — wie der Bestand) im Run-Pool.
// Main-Screen/Victory spielt „Relay of Multipliers".
const formation_shuffle = track("formation_shuffle");
// v0.4-Batch (10 neue calm-Tracks, Suno) — aufbereitet auf −14 LUFS + AAC/.m4a 128k via maintenance/normalize-music.mjs.
const amber_standby = track("amber_standby");
const slow_circuit = track("slow_circuit");
const glass_horizon = track("glass_horizon");
const velvet_signal = track("velvet_signal");
const quiet_overpass = track("quiet_overpass");
const neon_idle = track("neon_idle");
const static_bloom = track("static_bloom");
const cobalt_drift = track("cobalt_drift");
const low_beam = track("low_beam");
const soft_reset = track("soft_reset");
const still_frame = track("still_frame");
const faded_neon = track("faded_neon");
// Neue Tracks (mid/hot/overdrive) — aufbereitet auf −14 LUFS + AAC/.m4a 128k via maintenance/normalize-music.mjs.
const neon_card_game = track("neon_card_game");
// v0.4-Batch (5 neue mid-Tracks, Suno) — aufbereitet auf −14 LUFS + AAC/.m4a 128k via maintenance/normalize-music.mjs.
const pulse_highway = track("pulse_highway");
const grid_runner = track("grid_runner");
const chrome_rally = track("chrome_rally");
const neon_circuit = track("neon_circuit");
const voltage_drive = track("voltage_drive");
const static_charge = track("static_charge");
const static_surge = track("static_surge");
const live_wire = track("live_wire");
const full_tilt = track("full_tilt");
const event_horizon = track("event_horizon");
const circuit_overload = track("circuit_overload");
const static_storm = track("static_storm");
const power_surge = track("power_surge");
const overdrive = track("overdrive");
const final_showdown = track("final_showdown");
const last_stand = track("last_stand");
const endgame = track("endgame");
const no_limits = track("no_limits");
// Phonk×Synthwave-Batch — Suno-Uploads, aufbereitet auf −14 LUFS + AAC/.m4a via maintenance/normalize-music.mjs.
const neon_pulse = track("neon_pulse");
const midnight_drive = track("midnight_drive");
const velvet_cruise = track("velvet_cruise");
const neon_drift = track("neon_drift");
const neon_cruise = track("neon_cruise");
const chrome_horizon = track("chrome_horizon");
const neon_night_drive = track("neon_night_drive");
const neon_overdrive = track("neon_overdrive");
const redline = track("redline");
const nitro_surge = track("nitro_surge");
const afterburner = track("afterburner");
const warp_speed = track("warp_speed");
const terminal_velocity = track("terminal_velocity");
const last_light = track("last_light");
const point_of_no_return = track("point_of_no_return");
const concrete_collapse = track("concrete_collapse");
const fault_line = track("fault_line");
const drift_king = track("drift_king");
const neon_thunder = track("neon_thunder");
const neon_apocalypse = track("neon_apocalypse");
const fast_lane = track("fast_lane");
const chrome_runner = track("chrome_runner");

const MENU_TRACK = { title: "Midnight Drive", url: midnight_drive }; // Main-Screen + Victory (Relay bleibt reiner mid-Run-Track)

// Intensitäts-Stufen: jeder Run-Track trägt ein `tier`. Der aktuelle SCORE (state.score) wählt die aktive Stufe
// (von Runden ENTKOPPELT — die Musik folgt jetzt der erspielten Punktzahl); innerhalb einer Stufe werden Tracks
// zufällig gereiht (ein Track endet → nächster gleicher Stufe). Beim Stufen-Sprung schaltet die Musik hoch.
//   calm = ruhig · mid = treibend · hot = schnell/fetzig · overdrive = maximal · overdrive+ = darüber (Impact & Speed)
// TUNING: Die Zuordnung unten ist nach GEHÖR anpassbar — einfach das `tier` eines Tracks umtragen. Eine leere
// Stufe fällt automatisch auf die nächstniedrigere Stufe mit Tracks zurück (z. B. overdrive+ → overdrive).
const TIER_ORDER = ["calm", "mid", "hot", "overdrive", "overdrive_plus"]; // aufsteigende Intensität (= Fallback-Kette)
// Score-Grenzen (state.score) — UNTERgrenzen je Stufe (ab welchem Score die Stufe greift). Die höchste erreichte Stufe
// gewinnt. Plan: calm bis 3 Mio · mid 3–30 Mio · hot 30–70 Mio · overdrive 70–90 Mio · overdrive+ 90 Mio+.
const TIER_MIN = { mid: 3000000, hot: 30000000, overdrive: 70000000, overdrive_plus: 90000000 };
// #: Stufenwechsel-Politur — ein laufender Song wird NIE innerhalb seiner ersten SWITCH_MIN_PLAY Sekunden abgelöst
// (er läuft aus → onEnded reiht den neuen-Stufen-Track). Lief er schon länger, wird weich (kurzer Fade) gewechselt.
// Verhindert das „nur 5 s anspielen, dann Schnitt".
const SWITCH_MIN_PLAY = 40; // s [TUNING]
const TIER_FADE_MS = 600;   // #334: ms je Fade-Halbwelle (aus/ein) — satter (war 320) für Sofort-Wechsel UND Songende-Ein-Fade [TUNING]
// Run-Zufallspool (harmonisiert auf −14 LUFS). Titel = Anzeige im Musik-Panel.
const POOL = [
  // calm
  { title: "Formation Shuffle", url: formation_shuffle, tier: "calm" },          // #171
  // „Midnight Drive" ist jetzt Menü-/Victory-Theme (MENU_TRACK) → NICHT mehr im calm-Run-Pool (Runs starten calm →
  //   sonst liefe der Menü-Song direkt in der ersten Run-Stufe nochmal). Import bleibt (von MENU_TRACK genutzt).
  { title: "Velvet Cruise", url: velvet_cruise, tier: "calm" },
  { title: "Neon Drift", url: neon_drift, tier: "calm" },
  // v0.4-Batch (10 neue calm-Tracks)
  { title: "Amber Standby", url: amber_standby, tier: "calm" },
  { title: "Slow Circuit", url: slow_circuit, tier: "calm" },
  { title: "Glass Horizon", url: glass_horizon, tier: "calm" },
  { title: "Velvet Signal", url: velvet_signal, tier: "calm" },
  { title: "Quiet Overpass", url: quiet_overpass, tier: "calm" },
  { title: "Neon Idle", url: neon_idle, tier: "calm" },
  { title: "Static Bloom", url: static_bloom, tier: "calm" },
  { title: "Cobalt Drift", url: cobalt_drift, tier: "calm" },
  { title: "Low Beam", url: low_beam, tier: "calm" },
  { title: "Soft Reset", url: soft_reset, tier: "calm" },
  { title: "Faded Neon", url: faded_neon, tier: "calm" },
  // mid
  { title: "Neon Pulse", url: neon_pulse, tier: "mid" },                         // #: von calm → mid verschoben
  { title: "Relay of Multipliers", url: relay_of_multipliers, tier: "mid" },
  { title: "Neon Card Game", url: neon_card_game, tier: "mid" },
  { title: "Neon Cruise", url: neon_cruise, tier: "mid" },
  { title: "Chrome Horizon", url: chrome_horizon, tier: "mid" },
  // v0.4-Batch (5 neue mid-Tracks)
  { title: "Pulse Highway", url: pulse_highway, tier: "mid" },
  { title: "Grid Runner", url: grid_runner, tier: "mid" },
  { title: "Chrome Rally", url: chrome_rally, tier: "mid" },
  { title: "Neon Circuit", url: neon_circuit, tier: "mid" },
  { title: "Voltage Drive", url: voltage_drive, tier: "mid" },
  { title: "Still Frame", url: still_frame, tier: "mid" },                        // #: von calm → mid verschoben
  // hot
  { title: "Static Charge", url: static_charge, tier: "hot" },
  { title: "Static Surge", url: static_surge, tier: "hot" },
  { title: "Live Wire", url: live_wire, tier: "hot" },
  { title: "Full Tilt", url: full_tilt, tier: "hot" },
  { title: "Neon Night Drive", url: neon_night_drive, tier: "hot" },
  { title: "Neon Overdrive", url: neon_overdrive, tier: "hot" },
  { title: "Fast Lane", url: fast_lane, tier: "hot" },
  { title: "Chrome Runner", url: chrome_runner, tier: "hot" },
  // overdrive
  { title: "Event Horizon", url: event_horizon, tier: "overdrive" },
  { title: "Circuit Overload", url: circuit_overload, tier: "overdrive" },
  { title: "Static Storm", url: static_storm, tier: "overdrive" },
  { title: "Power Surge", url: power_surge, tier: "overdrive" },
  { title: "Overdrive", url: overdrive, tier: "overdrive" },
  { title: "Final Showdown", url: final_showdown, tier: "overdrive" },
  { title: "Last Stand", url: last_stand, tier: "overdrive" },
  { title: "Endgame", url: endgame, tier: "overdrive" },
  { title: "No Limits", url: no_limits, tier: "overdrive" },
  // overdrive+ (Score 60 Mio+): Phonk×Synthwave-Endstufe (mehr Impact & Speed als overdrive).
  { title: "Redline", url: redline, tier: "overdrive_plus" },
  { title: "Nitro Surge", url: nitro_surge, tier: "overdrive_plus" },
  { title: "Afterburner", url: afterburner, tier: "overdrive_plus" },
  { title: "Warp Speed", url: warp_speed, tier: "overdrive_plus" },
  { title: "Terminal Velocity", url: terminal_velocity, tier: "overdrive_plus" },
  { title: "Last Light", url: last_light, tier: "overdrive_plus" },
  { title: "Point of No Return", url: point_of_no_return, tier: "overdrive_plus" },
  { title: "Concrete Collapse", url: concrete_collapse, tier: "overdrive_plus" },
  { title: "Fault Line", url: fault_line, tier: "overdrive_plus" },
  { title: "Drift King", url: drift_king, tier: "overdrive_plus" },
  { title: "Neon Thunder", url: neon_thunder, tier: "overdrive_plus" },
  { title: "Neon Apocalypse", url: neon_apocalypse, tier: "overdrive_plus" },
];

/* #F-01: Track-Liste nach außen (Menü + Run-Pool). Genutzt vom Test, der prüft, dass jede referenzierte Datei
   in media/music/ wirklich existiert — seit die Dateien nicht mehr über `import` laufen, würde ein Tippfehler im
   Namen sonst erst als stummer 404 im Browser auffallen (der Bundler kann ihn nicht mehr fangen). */
export const MUSIC_TRACKS = [MENU_TRACK, ...POOL];

function tierForScore(score) {
  const s = Math.max(0, Number(score) || 0);
  if (s >= TIER_MIN.overdrive_plus) return "overdrive_plus";
  if (s >= TIER_MIN.overdrive) return "overdrive";
  if (s >= TIER_MIN.hot) return "hot";
  if (s >= TIER_MIN.mid) return "mid";
  return "calm";
}

let el = null;
let volume = 0.2;
// #333: Duck-Faktor (getrennt von der Nutzer-Lautstärke) — in den Auswahlphasen (Perk/Skill/Gebäude/Aufstell…) läuft die
// Musik leiser. effVol() = volume × duck; audible() bleibt auf der BASIS-volume (Duck ist KEIN Mute).
let duck = 1;
let muted = false;
let userPaused = false; // Pause-Knopf (#…) hält die Musik an — getrennt von „Ton stumm"
let current = null;   // aktueller Track { title, url }
let loadedUrl = null; // #264: URL, die aktuell auf dem <audio>-Element liegt (null = nichts geladen → 0 Bytes)
let mode = null;      // "menu" | "run"
let listeners = [];   // Titel-Abonnenten (UI)
let tier = "calm";    // aktive Intensitäts-Stufe im Run (aus dem Lauf-Fortschritt)
let fadeTimer = null; // aktiv während eines weichen Stufenwechsels (Fade-Übergang)

function ensureEl() {
  if (el || typeof Audio === "undefined") return el;
  el = new Audio();
  el.loop = true;     // Default; im Run wird pro Track auf false gesetzt (syncPlayback) → onEnded reiht den nächsten
  el.preload = "none";
  el.volume = effVol();
  // Track zu Ende → im Run den nächsten Zufallstitel der aktuellen Stufe (Menü loopt via a.loop, feuert kein „ended").
  // #334: Der Nachfolger wird EINGEBLENDET statt hart auf Vollpegel gestartet → kein „Pop" am Songende (deckt auch den
  //   aufgeschobenen Schwellenwechsel ab: frischer Song lief aus, neuer Stufen-Track blendet ein).
  el.addEventListener("ended", () => {
    if (mode !== "run" || userPaused) return;
    startTrack(randomPoolTrack(tier), { fade: true }); // Ein-Fade statt Hart-Start
  });
  return el;
}
// #264: „hörbar" = nicht stumm, Lautstärke > 0, nicht (spiel-)pausiert. Nur dann darf ein Track laden/streamen.
function audible() { return !muted && volume > 0 && !userPaused; }
// #334/#333: effektiver Zielpegel — EINZIGE Quelle für a.volume/Fade-Ziele. Nutzer-Lautstärke × Auswahlphasen-Duck,
// damit sich setVolume (Basis), setDuck und die Stufen-Fades nicht gegenseitig überschreiben.
function effVol() { return volume * duck; }
// #264 Lazy-Gating: Wiedergabe an „hörbar" koppeln. Hörbar → den aktuellen Track ERST HIER laden (.src setzen) und
// spielen; nicht hörbar → pausieren (stoppt den Netzwerk-Stream, nicht nur Volume 0). Der Puffer bleibt für schnellen
// Resume erhalten; der Titel bleibt gesetzt, damit Unmute denselben Track fortsetzt. Stumm gestartet = 0 Musik-Bytes.
function syncPlayback() {
  const a = el;
  if (!a) return;
  a.loop = mode === "menu"; // Menü/Victory lückenlos loopen; im Run reiht onEnded den nächsten Track der Stufe
  if (audible() && current) {
    if (loadedUrl !== current.url) { a.src = current.url; loadedUrl = current.url; } // erster Ladevorgang genau jetzt
    a.volume = effVol();
    if (a.paused) a.play().catch(() => {}); // Autoplay-Gate: rejectet vor der ersten User-Geste (unschädlich)
  } else if (!a.paused) {
    a.pause(); // stumm/pausiert → Stream anhalten
  }
}
function notify() { const t = current ? current.title : null; listeners.forEach((fn) => { try { fn(t); } catch (e) {} }); }

function playTrack(track) {
  stopFade(); // laufenden Fade-Übergang abbrechen — ein expliziter Track-Wechsel gewinnt
  const a = ensureEl();
  if (!a || !track) return;
  if (current && current.url === track.url) { syncPlayback(); return; } // schon gewählt → ggf. fortsetzen
  current = track;
  notify();       // Titel immer anzeigen (Kontinuität — auch wenn gerade stumm)
  syncPlayback(); // lädt/spielt nur, wenn hörbar — sonst wird nichts geladen
}

// #: Weicher Stufenwechsel — kurzer Fade-Übergang (Dip) auf DEMSELBEN <audio>-Element: aktuellen Track ausblenden,
// Quelle tauschen, neuen einblenden. Nur bei einem Stufenwechsel eines schon länger laufenden Songs (setProgress).
// Bricht ab, sobald nicht mehr hörbar (Mute/Pause) — dann übernimmt syncPlayback den Pegel.
function stopFade() { if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; } }
function rampVol(from, to, ms, done) {
  const a = el;
  if (!a) { if (done) done(); return; }
  stopFade();
  const steps = Math.max(1, Math.round(ms / 25));
  let k = 0;
  try { a.volume = from; } catch (e) {}
  fadeTimer = setInterval(() => {
    if (!audible()) { stopFade(); return; } // Mute/Pause während des Fades → abbrechen (syncPlayback regelt den Pegel)
    k += 1;
    try { a.volume = from + (to - from) * (k / steps); } catch (e) {}
    if (k >= steps) { stopFade(); if (done) done(); }
  }, 25);
}
// #334: Quelle setzen und starten — optional als Ein-Fade (Volume rampt von ~0 auf effVol) statt hart auf Vollpegel.
// Genutzt vom Songende-Reihen (fade) und als Einblend-Hälfte des Sofort-Stufenwechsels. Nicht hörbar → lazy (kein Fade).
function startTrack(track, { fade = false } = {}) {
  stopFade(); // ein neuer Start gewinnt gegen einen laufenden Fade
  const a = ensureEl();
  if (!a || !track) return;
  if (!audible()) { playTrack(track); return; } // stumm/leise/pausiert → nur Titel setzen, lazy laden (kein Fade)
  current = track; loadedUrl = track.url; a.src = track.url; a.loop = false; notify();
  a.play().catch(() => {});
  if (fade) rampVol(0.0001, effVol(), TIER_FADE_MS); else a.volume = effVol();
}
function fadeSwitchTo(track) {
  const a = ensureEl();
  if (!a || !track || !audible()) { playTrack(track); return; }         // nicht hörbar → einfach (lazy) umschalten
  rampVol(effVol(), 0.0001, TIER_FADE_MS, () => startTrack(track, { fade: true })); // ausblenden → tauschen & einblenden
}

function tracksForTier(wantTier) {
  // Gewünschte Stufe; ist sie leer, entlang TIER_ORDER absteigend zur nächsten gefüllten Stufe (overdrive→hot→…).
  let hit = POOL.filter((t) => t.tier === wantTier);
  if (hit.length) return hit;
  for (let i = TIER_ORDER.indexOf(wantTier) - 1; i >= 0; i--) {
    hit = POOL.filter((t) => t.tier === TIER_ORDER[i]);
    if (hit.length) return hit;
  }
  return POOL; // nie Stille
}

function randomPoolTrack(wantTier = null) {
  if (!POOL.length) return null;
  const pool = wantTier ? tracksForTier(wantTier) : POOL;
  let i = Math.floor(Math.random() * pool.length); // UI-Layer: Math.random erlaubt (Audio ist Seiteneffekt)
  if (current && pool.length > 1) { let guard = 0; while (pool[i].url === current.url && guard++ < 8) i = Math.floor(Math.random() * pool.length); }
  return pool[i];
}

export const music = {
  menu() { mode = "menu"; tier = "calm"; playTrack(MENU_TRACK); },                 // Menü + Victory
  // #339: Run-/Resume-Start score-abhängig initialisieren — ein fortgesetzter High-Score-Lauf startet SOFORT mit der zur
  //   gespeicherten Score-Schwelle passenden Stufe (frischer Lauf: Score 0 → weiterhin calm). setProgress übernimmt danach
  //   nur die laufenden Stufenwechsel; ohne das lief ein ganzer Calm-Song aus, bevor die Musik hochschaltete.
  enterRun(score = 0) { mode = "run"; tier = tierForScore(score); playTrack(randomPoolTrack(tier)); },
  next() { if (mode === "run") playTrack(randomPoolTrack(tier)); },                // „Nächster Track" (aus aktueller Stufe)
  // Aktueller Score (state.score): bestimmt die Intensitäts-Stufe. Ein FRISCHER Song (< SWITCH_MIN_PLAY s) wird nie
  // angeschnitten — er läuft aus, dann reiht onEnded den neuen-Stufen-Track. Lief er schon länger, wird JETZT weich
  // (Fade) auf einen Track der neuen Stufe gewechselt.
  setProgress(score) {
    if (mode !== "run") return;
    const next = tierForScore(score);
    if (next === tier) return;
    tier = next; // Stufe merken — onEnded reiht am Songende ohnehin aus dieser Stufe
    const played = el ? (el.currentTime || 0) : 0;
    if (!audible() || played < SWITCH_MIN_PLAY) return; // frischer/leiser Song → ausspielen lassen (kein Anschneiden)
    fadeSwitchTo(randomPoolTrack(tier));                // schon länger gelaufen → weich hochschalten
  },
  setVolume(v) { volume = Math.max(0, Math.min(1, Number(v) || 0)); stopFade(); syncPlayback(); }, // #264: 0 → Stream stoppt, wieder >0 → lazy laden
  // #333: Auswahlphasen-Ducking (getrennt von der Nutzer-Lautstärke). factor 0,6 = ~40 % leiser; 1 = voll. Sanft auf den
  // neuen effektiven Pegel ziehen (kein Sprung); läuft gerade ein Stufen-Fade, hat der ohnehin schon das effVol()-Ziel.
  setDuck(factor) {
    const d = Math.max(0, Math.min(1, Number(factor) || 0));
    if (d === duck) return;
    duck = d;
    if (audible() && el && !fadeTimer) rampVol(el.volume, effVol(), 300); else syncPlayback();
  },
  setMuted(m) { muted = !!m; stopFade(); syncPlayback(); },                                       // #264: stumm → pause, hörbar → (lazy) starten
  setPaused(p) { userPaused = !!p; stopFade(); syncPlayback(); },                                 // Spiel-Pause spiegeln
  unlock() { ensureEl(); syncPlayback(); }, // erste User-Geste: startet den Track nur, wenn hörbar (sonst bleibt es stumm & ungeladen)
  // #317: das <audio>-Element herausreichen, damit der Cube-Matrix-Analyser es EINMAL anzapfen kann
  // (createMediaElementSource → AnalyserNode). Erzeugt das Element bei Bedarf.
  element() { return ensureEl(); },
  subscribe(fn) { listeners.push(fn); fn(current ? current.title : null); return () => { listeners = listeners.filter((x) => x !== fn); }; },
};
