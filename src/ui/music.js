/* Musik-Manager (#111, Sound Phase 2) — HTMLAudio (Streaming + Loop), KEIN game/-Bezug.
   Getrennt vom SFX-Web-Audio (audio.js): Menü & Victory = „Morning Deck"; im Run ein zufälliger Track
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
// Morning Deck (Menü/Victory) wurde nur als Asset durch die normalisierte Version ersetzt, bleibt aus dem Pool.
import asymmetric_loop from "../assets/music/asymmetric_loop.m4a";
import card_momentum_remastered from "../assets/music/card_momentum_remastered.m4a";
import formation_shuffle from "../assets/music/formation_shuffle.m4a";
import mutation_funk_drive from "../assets/music/mutation_funk_drive.m4a";
import neon_static from "../assets/music/neon_static.m4a";
import neon_static_remaster from "../assets/music/neon_static_remaster.m4a";

const MENU_TRACK = { title: "Morning Deck", url: morning_deck };
// Run-Zufallspool (17 harmonisierte Tracks). Titel = Anzeige im Musik-Panel.
const POOL = [
  { title: "Card Momentum", url: card_momentum },
  { title: "Card Momentum (Remastered)", url: card_momentum_remastered }, // #171
  { title: "Deck Alignment", url: deck_alignment },
  { title: "Glass Sequence", url: glass_sequence },
  { title: "Neon Card Rush", url: neon_card_rush },
  { title: "Neon Card Rush 2", url: neon_card_rush_2 },
  { title: "Neon Static", url: neon_static },                             // #171
  { title: "Neon Static (Remaster)", url: neon_static_remaster },         // #171
  { title: "Pulsing Cards", url: pulsing_cards },
  { title: "Relay of Multipliers", url: relay_of_multipliers },
  { title: "Shuffle Pulse", url: shuffle_pulse },
  { title: "Stacked Multipliers", url: stacked_multipliers },
  { title: "Table Dust", url: table_dust },
  { title: "Table Dust 2", url: table_dust_2 },
  { title: "Asymmetric Loop", url: asymmetric_loop },                     // #171
  { title: "Formation Shuffle", url: formation_shuffle },                 // #171
  { title: "Mutation Funk Drive", url: mutation_funk_drive },             // #171
];

let el = null;
let volume = 0.2;
let muted = false;
let userPaused = false; // Pause-Knopf (#…) hält die Musik an — getrennt von „Ton stumm"
let current = null;   // aktueller Track { title, url }
let loadedUrl = null; // #264: URL, die aktuell auf dem <audio>-Element liegt (null = nichts geladen → 0 Bytes)
let mode = null;      // "menu" | "run"
let listeners = [];   // Titel-Abonnenten (UI)

function ensureEl() {
  if (el || typeof Audio === "undefined") return el;
  el = new Audio();
  el.loop = true;
  el.preload = "none";
  el.volume = volume;
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
  const a = ensureEl();
  if (!a || !track) return;
  if (current && current.url === track.url) { syncPlayback(); return; } // schon gewählt → ggf. fortsetzen
  current = track;
  notify();       // Titel immer anzeigen (Kontinuität — auch wenn gerade stumm)
  syncPlayback(); // lädt/spielt nur, wenn hörbar — sonst wird nichts geladen
}

function randomPoolTrack() {
  if (!POOL.length) return null;
  let i = Math.floor(Math.random() * POOL.length); // UI-Layer: Math.random erlaubt (Audio ist Seiteneffekt)
  if (current && POOL.length > 1) { let guard = 0; while (POOL[i].url === current.url && guard++ < 8) i = Math.floor(Math.random() * POOL.length); }
  return POOL[i];
}

export const music = {
  menu() { mode = "menu"; playTrack(MENU_TRACK); },            // Menü + Victory
  enterRun() { mode = "run"; playTrack(randomPoolTrack()); },  // Run-Start → zufälliger Pool-Track
  next() { if (mode === "run") playTrack(randomPoolTrack()); }, // „Nächster Track"
  setVolume(v) { volume = Math.max(0, Math.min(1, Number(v) || 0)); syncPlayback(); }, // #264: 0 → Stream stoppt, wieder >0 → lazy laden
  setMuted(m) { muted = !!m; syncPlayback(); },                                       // #264: stumm → pause, hörbar → (lazy) starten
  setPaused(p) { userPaused = !!p; syncPlayback(); },                                 // Spiel-Pause spiegeln
  unlock() { ensureEl(); syncPlayback(); }, // erste User-Geste: startet den Track nur, wenn hörbar (sonst bleibt es stumm & ungeladen)
  subscribe(fn) { listeners.push(fn); fn(current ? current.title : null); return () => { listeners = listeners.filter((x) => x !== fn); }; },
};
