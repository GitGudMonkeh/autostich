/* Musik-Manager (#111, Sound Phase 2) — HTMLAudio (Streaming + Loop), KEIN game/-Bezug.
   Getrennt vom SFX-Web-Audio (audio.js): Menü & Victory = „Relay of Multipliers"; im Run ein zufälliger Track
   aus dem harmonisierten Pool (mp3_norm). Autoplay-Gate: die erste User-Geste ruft unlock().
   Eigene Lautstärke (Optionen · Default 0,2); globaler „Ton stumm" mutet auch die Musik. */
import morning_deck from "../assets/music/morning_deck.m4a";
import card_momentum from "../assets/music/card_momentum.m4a";
import deck_alignment from "../assets/music/deck_alignment.m4a";
import glass_sequence from "../assets/music/glass_sequence.m4a";
import neon_card_rush from "../assets/music/neon_card_rush.m4a";
import neon_card_rush_2 from "../assets/music/neon_card_rush_2.m4a";
import pulsing_cards from "../assets/music/pulsing_cards.m4a";
import relay_of_multipliers from "../assets/music/relay_of_multipliers.m4a";
import shuffle_pulse from "../assets/music/shuffle_pulse.m4a";
import stacked_multipliers from "../assets/music/stacked_multipliers.m4a";
import table_dust from "../assets/music/table_dust.m4a";
import table_dust_2 from "../assets/music/table_dust_2.m4a";
// #171: sechs neu normalisierte Tracks (EBU R128, −14 LUFS — wie der Bestand) zusätzlich in den Run-Pool.
// Morning Deck ist seit #: ein Run-Track (calm); Main-Screen/Victory spielt jetzt „Relay of Multipliers".
import asymmetric_loop from "../assets/music/asymmetric_loop.m4a";
import formation_shuffle from "../assets/music/formation_shuffle.m4a";
import mutation_funk_drive from "../assets/music/mutation_funk_drive.m4a";
import neon_static from "../assets/music/neon_static.m4a";
import neon_static_remaster from "../assets/music/neon_static_remaster.m4a";
// Neue Tracks (mid/hot/overdrive) — aufbereitet auf −14 LUFS + AAC/.m4a 128k via maintenance/normalize-music.mjs.
import neon_card_game from "../assets/music/neon_card_game.m4a";
import static_charge from "../assets/music/static_charge.m4a";
import static_surge from "../assets/music/static_surge.m4a";
import circuit_rush from "../assets/music/circuit_rush.m4a";
import circuit_breaker from "../assets/music/circuit_breaker.m4a";
import live_wire from "../assets/music/live_wire.m4a";
import full_tilt from "../assets/music/full_tilt.m4a";
import event_horizon from "../assets/music/event_horizon.m4a";
import circuit_overload from "../assets/music/circuit_overload.m4a";
import static_storm from "../assets/music/static_storm.m4a";
import power_surge from "../assets/music/power_surge.m4a";
import overdrive from "../assets/music/overdrive.m4a";
import final_showdown from "../assets/music/final_showdown.m4a";
import last_stand from "../assets/music/last_stand.m4a";
import endgame from "../assets/music/endgame.m4a";
import no_limits from "../assets/music/no_limits.m4a";
// Phonk×Synthwave-Batch — Suno-Uploads, aufbereitet auf −14 LUFS + AAC/.m4a via maintenance/normalize-music.mjs.
import neon_pulse from "../assets/music/neon_pulse.m4a";
import midnight_drive from "../assets/music/midnight_drive.m4a";
import velvet_cruise from "../assets/music/velvet_cruise.m4a";
import neon_drift from "../assets/music/neon_drift.m4a";
import neon_cruise from "../assets/music/neon_cruise.m4a";
import chrome_horizon from "../assets/music/chrome_horizon.m4a";
import neon_night_drive from "../assets/music/neon_night_drive.m4a";
import neon_overdrive from "../assets/music/neon_overdrive.m4a";
import redline from "../assets/music/redline.m4a";
import nitro_surge from "../assets/music/nitro_surge.m4a";
import afterburner from "../assets/music/afterburner.m4a";
import warp_speed from "../assets/music/warp_speed.m4a";
import terminal_velocity from "../assets/music/terminal_velocity.m4a";
import last_light from "../assets/music/last_light.m4a";
import point_of_no_return from "../assets/music/point_of_no_return.m4a";
import concrete_collapse from "../assets/music/concrete_collapse.m4a";
import fault_line from "../assets/music/fault_line.m4a";
import drift_king from "../assets/music/drift_king.m4a";
import neon_thunder from "../assets/music/neon_thunder.m4a";
import neon_apocalypse from "../assets/music/neon_apocalypse.m4a";
import fast_lane from "../assets/music/fast_lane.m4a";
import chrome_runner from "../assets/music/chrome_runner.m4a";

const MENU_TRACK = { title: "Relay of Multipliers", url: relay_of_multipliers }; // Main-Screen + Victory

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
  { title: "Table Dust", url: table_dust, tier: "calm" },
  { title: "Table Dust 2", url: table_dust_2, tier: "calm" },
  { title: "Glass Sequence", url: glass_sequence, tier: "calm" },
  { title: "Formation Shuffle", url: formation_shuffle, tier: "calm" },          // #171
  { title: "Neon Static", url: neon_static, tier: "calm" },                      // #171
  { title: "Neon Static (Remaster)", url: neon_static_remaster, tier: "calm" },  // #171
  { title: "Shuffle Pulse", url: shuffle_pulse, tier: "calm" },
  { title: "Stacked Multipliers", url: stacked_multipliers, tier: "calm" },
  { title: "Morning Deck", url: morning_deck, tier: "calm" },                    // war Menü-Theme → jetzt Run-Track
  { title: "Midnight Drive", url: midnight_drive, tier: "calm" },
  { title: "Velvet Cruise", url: velvet_cruise, tier: "calm" },
  { title: "Neon Drift", url: neon_drift, tier: "calm" },
  // mid
  { title: "Neon Pulse", url: neon_pulse, tier: "mid" },                         // #: von calm → mid verschoben
  { title: "Deck Alignment", url: deck_alignment, tier: "mid" },
  { title: "Asymmetric Loop", url: asymmetric_loop, tier: "mid" },               // #171
  { title: "Relay of Multipliers", url: relay_of_multipliers, tier: "mid" },
  { title: "Neon Card Rush", url: neon_card_rush, tier: "mid" },                 // ungetaggt → wie „Neon Card Rush 2" auf mid (anpassbar)
  { title: "Neon Card Rush 2", url: neon_card_rush_2, tier: "mid" },
  { title: "Pulsing Cards", url: pulsing_cards, tier: "mid" },
  { title: "Neon Card Game", url: neon_card_game, tier: "mid" },
  { title: "Neon Cruise", url: neon_cruise, tier: "mid" },
  { title: "Chrome Horizon", url: chrome_horizon, tier: "mid" },
  // hot
  { title: "Mutation Funk Drive", url: mutation_funk_drive, tier: "hot" },       // #171
  { title: "Card Momentum", url: card_momentum, tier: "hot" },
  { title: "Static Charge", url: static_charge, tier: "hot" },
  { title: "Static Surge", url: static_surge, tier: "hot" },
  { title: "Circuit Rush", url: circuit_rush, tier: "hot" },
  { title: "Circuit Breaker", url: circuit_breaker, tier: "hot" },
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
  el.volume = volume;
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
// #334: effektiver Zielpegel für Fades — zentraler Seam. Aktuell = Nutzer-Lautstärke; ein späteres Auswahlphasen-
// Ducking multipliziert hier hinein, damit ALLE Ein-/Aus-Fades automatisch verträglich bleiben.
function effVol() { return volume; }
// #264 Lazy-Gating: Wiedergabe an „hörbar" koppeln. Hörbar → den aktuellen Track ERST HIER laden (.src setzen) und
// spielen; nicht hörbar → pausieren (stoppt den Netzwerk-Stream, nicht nur Volume 0). Der Puffer bleibt für schnellen
// Resume erhalten; der Titel bleibt gesetzt, damit Unmute denselben Track fortsetzt. Stumm gestartet = 0 Musik-Bytes.
function syncPlayback() {
  const a = el;
  if (!a) return;
  a.loop = mode === "menu"; // Menü/Victory lückenlos loopen; im Run reiht onEnded den nächsten Track der Stufe
  if (audible() && current) {
    if (loadedUrl !== current.url) { a.src = current.url; loadedUrl = current.url; } // erster Ladevorgang genau jetzt
    a.volume = volume;
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
  enterRun() { mode = "run"; tier = "calm"; playTrack(randomPoolTrack(tier)); },   // Run-Start → ruhige Stufe
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
  setMuted(m) { muted = !!m; stopFade(); syncPlayback(); },                                       // #264: stumm → pause, hörbar → (lazy) starten
  setPaused(p) { userPaused = !!p; stopFade(); syncPlayback(); },                                 // Spiel-Pause spiegeln
  unlock() { ensureEl(); syncPlayback(); }, // erste User-Geste: startet den Track nur, wenn hörbar (sonst bleibt es stumm & ungeladen)
  // #317: das <audio>-Element herausreichen, damit der Cube-Matrix-Analyser es EINMAL anzapfen kann
  // (createMediaElementSource → AnalyserNode). Erzeugt das Element bei Bedarf.
  element() { return ensureEl(); },
  subscribe(fn) { listeners.push(fn); fn(current ? current.title : null); return () => { listeners = listeners.filter((x) => x !== fn); }; },
};
