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
import card_momentum_remastered from "../assets/music/card_momentum_remastered.m4a";
import formation_shuffle from "../assets/music/formation_shuffle.m4a";
import mutation_funk_drive from "../assets/music/mutation_funk_drive.m4a";
import neon_static from "../assets/music/neon_static.m4a";
import neon_static_remaster from "../assets/music/neon_static_remaster.m4a";
// Neue Tracks (mid/hot/overdrive) — aufbereitet auf −14 LUFS + AAC/.m4a 128k via maintenance/normalize-music.mjs.
import neon_card_game from "../assets/music/neon_card_game.m4a";
import neon_arcade_loop from "../assets/music/neon_arcade_loop.m4a";
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

const MENU_TRACK = { title: "Relay of Multipliers", url: relay_of_multipliers }; // Main-Screen + Victory

// Intensitäts-Stufen: jeder Run-Track trägt ein `tier`. Der aktuelle SCORE (state.score) wählt die aktive Stufe
// (von Runden ENTKOPPELT — die Musik folgt jetzt der erspielten Punktzahl); innerhalb einer Stufe werden Tracks
// zufällig gereiht (ein Track endet → nächster gleicher Stufe). Beim Stufen-Sprung schaltet die Musik hoch.
//   calm = ruhig · mid = treibend · hot = schnell/fetzig · overdrive = maximal · overdrive+ = darüber (Impact & Speed)
// TUNING: Die Zuordnung unten ist nach GEHÖR anpassbar — einfach das `tier` eines Tracks umtragen. Eine leere
// Stufe fällt automatisch auf die nächstniedrigere Stufe mit Tracks zurück (z. B. overdrive+ → overdrive).
const TIER_ORDER = ["calm", "mid", "hot", "overdrive", "overdrive_plus"]; // aufsteigende Intensität (= Fallback-Kette)
// Score-Grenzen (state.score): < calm → calm · < mid → mid · < hot → hot · < overdrive → overdrive · sonst overdrive+.
// Plan: <1 Mio calm · 1–5 Mio mid · 5–30 Mio hot · 30–60 Mio overdrive · 60 Mio+ overdrive+.
const TIER_SCORES = { calm: 1000000, mid: 5000000, hot: 30000000, overdrive: 60000000 };
// #: Stufenwechsel-Politur — ein laufender Song wird NIE innerhalb seiner ersten SWITCH_MIN_PLAY Sekunden abgelöst
// (er läuft aus → onEnded reiht den neuen-Stufen-Track). Lief er schon länger, wird weich (kurzer Fade) gewechselt.
// Verhindert das „nur 5 s anspielen, dann Schnitt".
const SWITCH_MIN_PLAY = 40; // s [TUNING]
const TIER_FADE_MS = 320;   // ms je Fade-Halbwelle (aus/ein) beim weichen Stufenwechsel [TUNING]
// Run-Zufallspool (35 Tracks, harmonisiert auf −14 LUFS). Titel = Anzeige im Musik-Panel.
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
  // mid
  { title: "Deck Alignment", url: deck_alignment, tier: "mid" },
  { title: "Asymmetric Loop", url: asymmetric_loop, tier: "mid" },               // #171
  { title: "Relay of Multipliers", url: relay_of_multipliers, tier: "mid" },
  { title: "Neon Card Rush", url: neon_card_rush, tier: "mid" },                 // ungetaggt → wie „Neon Card Rush 2" auf mid (anpassbar)
  { title: "Neon Card Rush 2", url: neon_card_rush_2, tier: "mid" },
  { title: "Pulsing Cards", url: pulsing_cards, tier: "mid" },
  { title: "Neon Card Game", url: neon_card_game, tier: "mid" },
  { title: "Neon Arcade Loop", url: neon_arcade_loop, tier: "mid" },
  // hot
  { title: "Mutation Funk Drive", url: mutation_funk_drive, tier: "hot" },       // #171
  { title: "Card Momentum", url: card_momentum, tier: "hot" },
  { title: "Card Momentum (Remastered)", url: card_momentum_remastered, tier: "hot" }, // #171
  { title: "Static Charge", url: static_charge, tier: "hot" },
  { title: "Static Surge", url: static_surge, tier: "hot" },
  { title: "Circuit Rush", url: circuit_rush, tier: "hot" },
  { title: "Circuit Breaker", url: circuit_breaker, tier: "hot" },
  { title: "Live Wire", url: live_wire, tier: "hot" },
  { title: "Full Tilt", url: full_tilt, tier: "hot" },
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
  // overdrive+ (Score 60 Mio+): noch keine Tracks — 10 in Produktion (mehr Impact & Speed als overdrive).
  // Bis dahin fällt die Stufe automatisch auf „overdrive" zurück. Neue Tracks hier mit tier: "overdrive_plus" ergänzen.
];

function tierForScore(score) {
  const s = Math.max(0, Number(score) || 0);
  if (s < TIER_SCORES.calm) return "calm";
  if (s < TIER_SCORES.mid) return "mid";
  if (s < TIER_SCORES.hot) return "hot";
  if (s < TIER_SCORES.overdrive) return "overdrive";
  return "overdrive_plus";
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
  el.addEventListener("ended", () => {
    if (mode !== "run" || userPaused) return;
    playTrack(randomPoolTrack(tier)); // lädt/spielt via syncPlayback nur, wenn hörbar
  });
  return el;
}
// #264: „hörbar" = nicht stumm, Lautstärke > 0, nicht (spiel-)pausiert. Nur dann darf ein Track laden/streamen.
function audible() { return !muted && volume > 0 && !userPaused; }
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
function fadeSwitchTo(track) {
  const a = ensureEl();
  if (!a || !track || !audible()) { playTrack(track); return; } // nicht hörbar → einfach (lazy) umschalten
  rampVol(volume, 0.0001, TIER_FADE_MS, () => {                  // ausblenden …
    current = track; loadedUrl = track.url; a.src = track.url; a.loop = false; notify(); // … Quelle tauschen …
    a.play().catch(() => {});
    rampVol(0.0001, volume, TIER_FADE_MS);                       // … neuen Track einblenden
  });
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
  subscribe(fn) { listeners.push(fn); fn(current ? current.title : null); return () => { listeners = listeners.filter((x) => x !== fn); }; },
};
