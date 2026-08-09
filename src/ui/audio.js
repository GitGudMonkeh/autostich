/* SFX-Manager (#110) — Web Audio, KEIN game/-Bezug (Audio ist ein UI-Seiteneffekt wie Math.random/Date).
   Alle SFX werden einmal in AudioBuffer vor-dekodiert → Null-Start-Latenz (wichtig für den taktkritischen
   Stich-Sound). Autoplay-Gate: der AudioContext startet suspended; die erste User-Geste (Klick) ruft unlock().
   Assets per import → subpfad-sicher unter /autostich/ bzw. /autostich/test/ (Lehre vom Schwert-Icon #42). */
import buttonUrl from "../assets/sounds/button_click.mp3";
import cardflipUrl from "../assets/sounds/cardflip.wav";
import buyUrl from "../assets/sounds/buy_cashout.mp3";
import deniedUrl from "../assets/sounds/muted_click.wav";
// #295/#296 Sieg-Finisher-SFX (aufbereitet, an den Bestand angeglichen). fx_laser deckt Laser-Schnitt UND Lasergitter
// ab (ein geteilter Sound); fx_blackhole läuft als persistentes Loop-Bett (siehe loop/stopLoop), nicht als One-Shot.
import bladeUrl from "../assets/sounds/fx_blade.mp3";
import laserUrl from "../assets/sounds/fx_laser.mp3";
import burnbeamUrl from "../assets/sounds/fx_burnbeam.mp3";
import blackholeUrl from "../assets/sounds/fx_blackhole.mp3";
// #300 Sieg-Finisher „Überladung" (Blitz) / „Zerstäubung" (Partikel) — eigene Sounds; fx_bass = tiefer Impact-Layer.
import lightningUrl from "../assets/sounds/fx_lightning.mp3";
import atomizeUrl from "../assets/sounds/fx_atomize.mp3";
import bassUrl from "../assets/sounds/fx_bass.mp3";

const SRC = { button: buttonUrl, cardflip: cardflipUrl, buy: buyUrl, denied: deniedUrl,
              fx_blade: bladeUrl, fx_laser: laserUrl, fx_burnbeam: burnbeamUrl, fx_blackhole: blackholeUrl,
              fx_lightning: lightningUrl, fx_atomize: atomizeUrl, fx_bass: bassUrl };

let ctx = null;
let masterComp = null; // #196: persistenter Master-Kompressor — ALLE SFX laufen durch, fängt Clipping/Turbo-Überlappung ab.
const buffers = {};
let buffersLoaded = false; // #264: SFX-Puffer erst bei „hörbarem" Bedarf holen/dekodieren (nicht im Stumm-Start).
const activeLoops = new Set(); // #296: laufende Loop-SFX (persistentes „Schwarzes Loch"-Bett) — Gain zieht bei Volume/Mute mit.
// #297 Turbo-Drossel gegen die „Klangwand" bei schnellen Stichen. Zwei Hebel, beide tunebar:
//  (1) globaler Stimmen-Deckel mit Voice-Stealing (älteste One-Shot-Stimme weicht) — verhindert Runaway/Kompressor-Pumpen;
//  (2) Mindestabstand je Sound-Name (Cooldown) — thint Finisher-Bursts. cardflip bewusst 0 → das gewollte „MG" bei
//  MAX-Turbo bleibt (dort sind die Finisher via flipMs-Gate ohnehin aus). Loops (activeLoops) zählen NICHT mit.
const SFX_MAX_VOICES = 6;                                                    // max. gleichzeitige One-Shot-Stimmen
const SFX_COOLDOWN = { fx_blade: 0.08, fx_laser: 0.08, fx_burnbeam: 0.08, fx_lightning: 0.08, fx_atomize: 0.08, fx_bass: 0.08 };  // s; nicht gelistet ⇒ 0 (kein Cooldown)
const voices = [];                                                           // aktive One-Shots: { src, g, name, t } (t = Start, für Voice-Stealing)
const lastPlayAt = {};                                                       // name → letzte Startzeit (für Cooldown)
let muted = false;
let volume = 0.6;
// Nicht-Stich-Sounds (Klick/Kauf/Verwehrt) etwas anheben → effektiv ~0,5 beim Default-Slider (0,4).
// Der Stich-Sound (cardflip) übergibt stets seinen eigenen Gain und bleibt davon unberührt.
const SFX_GAIN = 1.25;

function ensureCtx() {
  if (ctx || typeof window === "undefined") return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  // #196: Master-Kompressor am Ende der Kette (persistent). Macht den Mix „fetter/lauter" und hält den Pegel bei
  // Turbo-Überlappung (kein hartes Clipping). Werte tunebar.
  masterComp = ctx.createDynamicsCompressor();
  masterComp.threshold.value = -10; masterComp.knee.value = 24; masterComp.ratio.value = 3;
  masterComp.attack.value = 0.003; masterComp.release.value = 0.12;
  masterComp.connect(ctx.destination);
  return ctx; // #264: KEINE Puffer hier — erst bei hörbarem Bedarf (loadBuffers)
}

// #264: SFX-Puffer erst holen/dekodieren, wenn Ton hörbar ist. Idempotent (nur ein Ladelauf).
function audibleSfx() { return !muted && volume > 0; }
function loadBuffers() {
  const c = ensureCtx();
  if (!c || buffersLoaded) return;
  buffersLoaded = true;
  for (const [name, url] of Object.entries(SRC)) {
    fetch(url).then((r) => r.arrayBuffer()).then((ab) => c.decodeAudioData(ab))
      .then((buf) => { buffers[name] = buf; }).catch(() => {});
  }
}

// #296: Loop-Gain = (stumm ? 0 : volume) × Basis-Gain. Live-Anpassung bei Volume/Mute (setTargetAtTime, sanft).
function loopGain(h) { return (muted ? 0 : volume) * h.base; }
function refreshLoops() { if (!ctx) return; const now = ctx.currentTime; for (const h of activeLoops) { try { h.g.gain.setTargetAtTime(loopGain(h), now, 0.05); } catch (e) {} } }

export const audio = {
  init() { ensureCtx(); if (audibleSfx()) loadBuffers(); },
  // Beim ersten User-Klick aufrufen: entsperrt den (browserseitig blockierten) AudioContext.
  unlock() { const c = ensureCtx(); if (c && c.state === "suspended") c.resume().catch(() => {}); if (audibleSfx()) loadBuffers(); },
  setMuted(m) { muted = !!m; if (audibleSfx()) loadBuffers(); refreshLoops(); }, // #264: Unmute → Puffer jetzt (lazy) laden; #296: laufende Loops mitziehen
  setVolume(v) { volume = Math.max(0, Math.min(1, Number(v) || 0)); if (audibleSfx()) loadBuffers(); refreshLoops(); },
  /* Einen SFX abspielen. `rate` = playbackRate (Turbo-Kopplung Stich-Sound), `gain` = zusätzlicher Faktor,
     `bass` = Lowshelf-Anhebung in dB (#196, 0 = aus). Je Aufruf eine neue BufferSource → Überlappen erlaubt
     (dezenter „Maschinengewehr"-Effekt bei hohem Turbo). Kette: src → [lowshelf?] → gain → masterComp → destination. */
  play(name, { rate = 1, gain = SFX_GAIN, bass = 0, soft = 0, attack = 0, release = 0 } = {}) {
    if (muted || volume <= 0) return;
    loadBuffers(); // #264: hörbarer Bedarf → sicherstellen, dass die Puffer (lazy) geladen sind
    const c = ctx;
    if (!c || !buffers[name]) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    const now = c.currentTime;
    // #297 Cooldown: denselben Sound nicht dichter als SFX_COOLDOWN[name] auslösen (thint Finisher-Bursts; cardflip = 0).
    const cd = SFX_COOLDOWN[name] || 0;
    if (cd && lastPlayAt[name] != null && (now - lastPlayAt[name]) < cd) return;
    try {
      const src = c.createBufferSource();
      src.buffer = buffers[name];
      src.playbackRate.value = rate;
      const peak = volume * gain;
      const g = c.createGain();
      let node = src;
      if (bass > 0) { // #196: Bass-Anhebung (lowshelf ~200 Hz) — mehr Wucht bei Sieg/Crit/großer Effekt-Stufe.
        const shelf = c.createBiquadFilter();
        shelf.type = "lowshelf"; shelf.frequency.value = 200; shelf.gain.value = bass;
        node.connect(shelf); node = shelf;
      }
      if (soft > 0) { // #: Lowpass rundet die harte/scharfe Höhen-Attacke ab (weicherer, weniger „harter" Sound).
        const lp = c.createBiquadFilter();
        lp.type = "lowpass"; lp.frequency.value = soft; lp.Q.value = 0.7;
        node.connect(lp); node = lp;
      }
      // #: Hüllkurve — kurzer Attack (weiche Transiente statt harter Einsatz) + Release (sanftes Ausklingen statt hartem
      // Abriss, z. B. im Turbo). Ohne attack/release identisch zum bisherigen Verhalten (Sofort-Pegel).
      const dur = (buffers[name].duration || 0) / Math.max(0.01, rate);
      if (attack > 0) { g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(peak, now + Math.min(attack, dur * 0.5)); }
      else g.gain.setValueAtTime(peak, now);
      // #: Release-Ausklang auf höchstens ~65 % der (raten-abhängigen) Dauer begrenzen — sonst würde bei hoher playbackRate
      // (kurze dur im Turbo) die ganze Stimme von Beginn an wegfaden (zu leise) statt nur am Ende sanft auszuklingen.
      if (release > 0 && dur > 0) { const rel = Math.min(release, dur * 0.65); const rs = Math.max(now + attack, now + dur - rel); g.gain.setValueAtTime(peak, rs); g.gain.linearRampToValueAtTime(0.0001, now + dur); }
      node.connect(g).connect(masterComp || c.destination);
      // #297 Voice-Tracking + Deckel: neue Stimme registrieren, älteste weicht bei Überlauf (sanfter 50-ms-Ausklang → kein Klick).
      const v = { src, g, name, t: now };
      voices.push(v);
      lastPlayAt[name] = now;
      src.onended = () => { const i = voices.indexOf(v); if (i >= 0) voices.splice(i, 1); };
      while (voices.length > SFX_MAX_VOICES) {
        const old = voices.shift();
        if (old === v) break; // nie die gerade gestartete Stimme stehlen
        try { old.g.gain.cancelScheduledValues(now); old.g.gain.setTargetAtTime(0.0001, now, 0.01); old.src.stop(now + 0.05); } catch (e) {}
      }
      src.start();
    } catch (e) { /* Audio nie den Spielfluss stören */ }
  },
  /* #296 Persistenter Loop-SFX (Bett für persistente Finisher wie „Schwarzes Loch"). Gibt ein Handle zurück; via
     stopLoop beenden. `loopStart`/`loopEnd` loopen nur die gleichförmige Mitte (unter Umgehung der Fades) → nahtlos.
     Kette wie play(): src(loop) → [lowshelf?] → gain → masterComp → destination. Robust: bei Stumm/kein Puffer null. */
  loop(name, { gain = SFX_GAIN, bass = 0, rate = 1, loopStart = null, loopEnd = null } = {}) {
    if (muted || volume <= 0) return null;
    loadBuffers();
    const c = ctx;
    if (!c || !buffers[name]) return null;
    if (c.state === "suspended") c.resume().catch(() => {});
    try {
      const src = c.createBufferSource();
      src.buffer = buffers[name];
      src.loop = true;
      if (loopStart != null) src.loopStart = loopStart;
      if (loopEnd != null) src.loopEnd = loopEnd;
      src.playbackRate.value = rate;
      const g = c.createGain();
      const h = { src, g, base: gain };
      g.gain.value = loopGain(h);
      let node = src;
      if (bass > 0) { const shelf = c.createBiquadFilter(); shelf.type = "lowshelf"; shelf.frequency.value = 200; shelf.gain.value = bass; node.connect(shelf); node = shelf; }
      node.connect(g).connect(masterComp || c.destination);
      src.start();
      activeLoops.add(h);
      return h;
    } catch (e) { return null; }
  },
  /* Einen Loop beenden: sanfter Gain-Ausklang (fade s), dann Quelle stoppen. Idempotent/robust gegen null. */
  stopLoop(h, { fade = 0.2 } = {}) {
    if (h) activeLoops.delete(h);
    if (!h || !ctx) return;
    try {
      const now = ctx.currentTime;
      h.g.gain.cancelScheduledValues(now);
      h.g.gain.setValueAtTime(h.g.gain.value, now);
      h.g.gain.linearRampToValueAtTime(0.0001, now + fade);
      h.src.stop(now + fade + 0.03);
    } catch (e) { /* schon gestoppt o. Ä. — ignorieren */ }
  },
  /* #298 Basis-Gain eines laufenden Loops sanft ändern (setTargetAtTime) — z. B. das „Schwarzes Loch"-Bett mit dem
     Wachstum lauter ziehen. `ramp` = Zeitkonstante in s. Zieht via loopGain auch Volume/Mute korrekt mit. */
  setLoopGain(h, base, { ramp = 0.4 } = {}) {
    if (!h || !ctx) return;
    h.base = Math.max(0, base);
    try { h.g.gain.setTargetAtTime(loopGain(h), ctx.currentTime, ramp); } catch (e) { /* egal */ }
  },
  /* #: playbackRate eines laufenden Loops sanft ändern (z. B. Brennstrahl mit der Serie leicht schneller ziehen). */
  setLoopRate(h, rate, { ramp = 0.4 } = {}) {
    if (!h || !ctx) return;
    try { h.src.playbackRate.setTargetAtTime(Math.max(0.25, rate), ctx.currentTime, ramp); } catch (e) { /* egal */ }
  },
};
