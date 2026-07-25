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

const MENU_TRACK = { title: "Morning Deck", url: morning_deck };
// Run-Zufallspool (11 harmonisierte Tracks). Titel = Anzeige im Musik-Panel.
const POOL = [
  { title: "Card Momentum", url: card_momentum },
  { title: "Deck Alignment", url: deck_alignment },
  { title: "Glass Sequence", url: glass_sequence },
  { title: "Neon Card Rush", url: neon_card_rush },
  { title: "Neon Card Rush 2", url: neon_card_rush_2 },
  { title: "Pulsing Cards", url: pulsing_cards },
  { title: "Relay of Multipliers", url: relay_of_multipliers },
  { title: "Shuffle Pulse", url: shuffle_pulse },
  { title: "Stacked Multipliers", url: stacked_multipliers },
  { title: "Table Dust", url: table_dust },
  { title: "Table Dust 2", url: table_dust_2 },
];

let el = null;
let volume = 0.2;
let muted = false;
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
  if (current && current.url === track.url) { if (a.paused) a.play().catch(() => {}); return; } // läuft schon
  current = track;
  a.src = track.url;
  applyVol();
  a.play().catch(() => {}); // Autoplay-Gate → startet erst nach der ersten User-Geste (unlock)
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
  unlock() { const a = ensureEl(); if (a && a.paused && current) a.play().catch(() => {}); }, // erste Geste
  subscribe(fn) { listeners.push(fn); fn(current ? current.title : null); return () => { listeners = listeners.filter((x) => x !== fn); }; },
};
