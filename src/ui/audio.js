/* SFX-Manager (#110) — Web Audio, KEIN game/-Bezug (Audio ist ein UI-Seiteneffekt wie Math.random/Date).
   Alle SFX werden einmal in AudioBuffer vor-dekodiert → Null-Start-Latenz (wichtig für den taktkritischen
   Stich-Sound). Autoplay-Gate: der AudioContext startet suspended; die erste User-Geste (Klick) ruft unlock().
   Assets per import → subpfad-sicher unter /autostich/ bzw. /autostich/test/ (Lehre vom Schwert-Icon #42). */
import buttonUrl from "../assets/sounds/button_click.mp3";
import cardflipUrl from "../assets/sounds/cardflip.wav";
import buyUrl from "../assets/sounds/buy_cashout.mp3";
import deniedUrl from "../assets/sounds/muted_click.wav";

const SRC = { button: buttonUrl, cardflip: cardflipUrl, buy: buyUrl, denied: deniedUrl };

let ctx = null;
const buffers = {};
let muted = false;
let volume = 0.6;

function ensureCtx() {
  if (ctx || typeof window === "undefined") return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  for (const [name, url] of Object.entries(SRC)) {
    fetch(url).then((r) => r.arrayBuffer()).then((ab) => ctx.decodeAudioData(ab))
      .then((buf) => { buffers[name] = buf; }).catch(() => {});
  }
  return ctx;
}

export const audio = {
  init() { ensureCtx(); },
  // Beim ersten User-Klick aufrufen: entsperrt den (browserseitig blockierten) AudioContext.
  unlock() { const c = ensureCtx(); if (c && c.state === "suspended") c.resume().catch(() => {}); },
  setMuted(m) { muted = !!m; },
  setVolume(v) { volume = Math.max(0, Math.min(1, Number(v) || 0)); },
  /* Einen SFX abspielen. `rate` = playbackRate (Turbo-Kopplung Stich-Sound), `gain` = zusätzlicher Faktor.
     Je Aufruf eine neue BufferSource → Überlappen erlaubt (dezenter „Maschinengewehr"-Effekt bei hohem Turbo). */
  play(name, { rate = 1, gain = 1 } = {}) {
    if (muted || volume <= 0) return;
    const c = ctx;
    if (!c || !buffers[name]) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    try {
      const src = c.createBufferSource();
      src.buffer = buffers[name];
      src.playbackRate.value = rate;
      const g = c.createGain();
      g.gain.value = volume * gain;
      src.connect(g).connect(c.destination);
      src.start();
    } catch (e) { /* Audio nie den Spielfluss stören */ }
  },
};
