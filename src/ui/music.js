/* Musik-Manager (#111, Sound Phase 2) — HTMLAudio (Streaming + Loop), KEIN game/-Bezug.
   Getrennt vom SFX-Web-Audio (audio.js): Menü & Victory = „Morning Deck"; im Run ein zufälliger Track
   aus dem harmonisierten Pool (mp3_norm). Autoplay-Gate: die erste User-Geste ruft unlock().
   Eigene Lautstärke (Optionen · Default 0,2); globaler „Ton stumm" mutet auch die Musik. */
import morning_deck from "../assets/music/morning_deck.mp3";
import card_momentum from "../assets/music/card_momentum.mp3";
import deck_alignment from "../assets/music/deck_alignment.mp3";
import glass_sequence from "../assets/music/glass_sequence.mp3";
import neon_card_rush from "../assets/music/neon_card_rush.mp3";
import neon_card_rush_2 from "../assets/music/neon_card_rush_2.mp3";
import pulsing_cards from "../assets/music/pulsing_cards.mp3";
import relay_of_multipliers from "../assets/music/relay_of_multipliers.mp3";
import shuffle_pulse from "../assets/music/shuffle_pulse.mp3";
import stacked_multipliers from "../assets/music/stacked_multipliers.mp3";
import table_dust from "../assets/music/table_dust.mp3";
import table_dust_2 from "../assets/music/table_dust_2.mp3";
// #171: sechs neu normalisierte Tracks (EBU R128, −14 LUFS — wie der Bestand) zusätzlich in den Run-Pool.
// Morning Deck (Menü/Victory) wurde nur als Asset durch die normalisierte Version ersetzt, bleibt aus dem Pool.
import asymmetric_loop from "../assets/music/asymmetric_loop.mp3";
import card_momentum_remastered from "../assets/music/card_momentum_remastered.mp3";
import formation_shuffle from "../assets/music/formation_shuffle.mp3";
import mutation_funk_drive from "../assets/music/mutation_funk_drive.mp3";
import neon_static from "../assets/music/neon_static.mp3";
import neon_static_remaster from "../assets/music/neon_static_remaster.mp3";

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
let mode = null;      // "menu" | "run"
let listeners = [];   // Titel-Abonnenten (UI)

function ensureEl() {
  if (el || typeof Audio === "undefined") return el;
  el = new Audio();
  el.loop = true;
  el.preload = "none";
  el.volume = muted ? 0 : volume;
  return el;
}
function applyVol() { if (el) el.volume = muted ? 0 : volume; }
function notify() { const t = current ? current.title : null; listeners.forEach((fn) => { try { fn(t); } catch (e) {} }); }

function playTrack(track) {
  const a = ensureEl();
  if (!a || !track) return;
  if (current && current.url === track.url) { if (a.paused && !userPaused) a.play().catch(() => {}); return; } // läuft schon
  current = track;
  a.src = track.url;
  applyVol();
  if (!userPaused) a.play().catch(() => {}); // Autoplay-Gate → startet erst nach der ersten User-Geste (unlock); nicht während Pause
  notify();
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
  setVolume(v) { volume = Math.max(0, Math.min(1, Number(v) || 0)); applyVol(); },
  setMuted(m) { muted = !!m; applyVol(); },
  setPaused(p) { // Spiel-Pause spiegeln: anhalten bzw. fortsetzen
    userPaused = !!p;
    if (!el) return;
    if (userPaused) el.pause();
    else if (current) el.play().catch(() => {});
  },
  unlock() { const a = ensureEl(); if (a && a.paused && current && !userPaused) a.play().catch(() => {}); }, // erste Geste (nicht während Pause)
  subscribe(fn) { listeners.push(fn); fn(current ? current.title : null); return () => { listeners = listeners.filter((x) => x !== fn); }; },
};
