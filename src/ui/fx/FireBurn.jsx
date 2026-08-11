import { useEffect, useRef } from "react";
import { Application, ParticleContainer, Particle, Sprite, Texture } from "pixi.js";

/* Archetyp-Karteneffekt „Feuer" — Brand-Hitze (docs/archetyp-karteneffekte.md §5.2).
   Mit steigender HITZE (0..1) lodert Feuer AUSSEN an den Seiten des DECK-Stapels nach oben bis über
   den Kopf — INNEN bleibt frei. Realistische additive Partikel-Flammen (heißer Kern → rot → aus),
   vertikal gestreckt, mit Flackern und Neigung nach innen/oben; dazu ein dezentes Glühen.

   WICHTIG (Platzierung): der Effekt gehört auf das DECK (den liegenden Stapel, aus dem die Karte
   umgedreht wird), NICHT auf die gespielte Karte. Der Layer liegt ZWISCHEN Feld und Karten (z < 10)
   → die opake Karte/der Deck-Rücken verdeckt das Innere, das Feuer zeigt sich nur außen/über dem Kopf
   (kein Pixi-Masking nötig). Eigener Pixi-`Application`-Layer → koexistiert mit Blitz/Eis/Pflanze.

   Ticker läuft nur bei Hitze > 0 & sichtbarem Tab; DPR ≤ 2. reduced → nur dezentes statisches Glühen. */

// ── TUNE (abgesegnet 2026-08-11, Feuer-Tuning-Board) ─────────────────────────
const TUNE = {
  COLOR: "#ff3a1e", CORE: "#ffcf7a",

  REACH_MAX: 1, HEAT_START: 0.04, EDGE_OFFSET: 0, FLAME_LEAN: 0.36,

  GLOW_ALPHA: 0.24, GLOW_W: 10,

  FLAME_RATE: 140, FLAME_RISE: 134, FLAME_SWAY: 1, FLAME_SIZE: 9, FLAME_LIFE_MS: 900, SPREAD: 8,
};

const TX = 64;                       // Textur-Kantenlänge
const CARD_W = 104, CARD_H = 144;    // Deck-/Kartenbox (fallback, falls Messung 0)
const MAX = 520;                     // Partikel-Pool

const hexRGB = (h) => { const s = String(h || "#ff3a1e").replace("#", ""); const f = s.length === 3 ? s.replace(/(.)/g, "$1$1") : s; const n = parseInt(f, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lerp = (a, b, t) => a + (b - a) * t;
const rgbInt = (c) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);

// Weiche weiße Radial-Textur (Kern + Halo) — pro Partikel getönt (wie embersPixi).
function makeRadial(stops) {
  const c = document.createElement("canvas"); c.width = c.height = TX;
  const cx = c.getContext("2d");
  const g = cx.createRadialGradient(TX / 2, TX / 2, 0, TX / 2, TX / 2, TX / 2);
  for (const [o, a] of stops) g.addColorStop(o, `rgba(255,255,255,${a})`);
  cx.fillStyle = g; cx.fillRect(0, 0, TX, TX);
  return Texture.from(c);
}

export function FireBurn({ heat = 0, panelRef, deckRef, reduced = false }) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const applyRunRef = useRef(null);
  const stateRef = useRef({ heat, reduced });
  stateRef.current = { heat, reduced };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let disposed = false;
    const canvas = document.createElement("canvas");
    const app = new Application();

    const COLR = hexRGB(TUNE.COLOR), CORER = hexRGB(TUNE.CORE), COL_INT = rgbInt(COLR);

    // Layer: Glüh-Sprites (add) + Partikel-Flammen (add).
    let flameTex, glowTex, glowPC, glowL, glowR, glowT;
    const pool = [];         // { p, x0, y0, side, age, life, spd, sz, seed, alive }
    let head = 0, acc = 0;

    const grab = () => { const s = pool[head]; head = (head + 1) % MAX; s.alive = true; return s; };

    const update = (ticker) => {
      const st = stateRef.current;
      const card = deckRef?.current, panel = panelRef?.current;
      const H = Math.max(0, Math.min(1, st.heat || 0));
      if (!card || !panel || H <= 0.0005) { hideAll(); return; }
      const cr = card.getBoundingClientRect(), pr = panel.getBoundingClientRect();
      const CW = cr.width || CARD_W, CH = cr.height || CARD_H;
      const ox = cr.left - pr.left, oy = cr.top - pr.top;
      const dt = ticker.deltaMS;
      const e = Math.max(0, (H - TUNE.HEAT_START) / Math.max(0.001, 1 - TUNE.HEAT_START));
      const reachH = e * TUNE.REACH_MAX * CH;

      // ── Glühen (statisch, dezent) — auch im reduced-Modus die einzige Sichtbarkeit ──
      const gy = oy + CH - reachH * 0.45, gr = Math.max(TUNE.GLOW_W, reachH * 0.55) + TUNE.GLOW_W * 0.6;
      const gA = TUNE.GLOW_ALPHA * e;
      placeGlow(glowL, ox, gy, gr, gA);
      placeGlow(glowR, ox + CW, gy, gr, gA);
      if (e > 0.55) placeGlow(glowT, ox + CW / 2, oy, CW * 0.7, gA * (e - 0.4)); else glowT.alpha = 0;

      if (st.reduced) { for (const s of pool) if (s.alive) { s.alive = false; s.p.alpha = 0; } return; }

      // ── Partikel spawnen (beide Seiten) ──
      acc += (2 * TUNE.FLAME_RATE * e) * (dt / 1000);
      while (acc >= 1) {
        acc -= 1;
        const side = Math.random() < 0.5 ? -1 : 1, ex = side < 0 ? ox : ox + CW;
        const s = grab();
        s.side = side;
        s.x0 = ex + side * (TUNE.EDGE_OFFSET + Math.random() * TUNE.SPREAD);
        s.y0 = (oy + CH) - Math.random() * reachH;
        s.age = 0; s.life = TUNE.FLAME_LIFE_MS * (0.6 + 0.7 * Math.random());
        s.spd = TUNE.FLAME_RISE * (0.7 + 0.6 * Math.random());
        s.sz = TUNE.FLAME_SIZE * (0.55 + 0.7 * Math.random());
        s.seed = Math.random() * 6.283;
      }

      // ── Partikel updaten ──
      for (let i = 0; i < MAX; i++) {
        const s = pool[i]; if (!s.alive) continue;
        s.age += dt;
        if (s.age >= s.life) { s.alive = false; s.p.alpha = 0; continue; }
        const k = 1 - s.age / s.life;                         // 1 jung → 0 alt
        const rise = s.spd * (s.age / 1000);
        const sway = Math.sin(s.age * 0.007 + s.seed) * TUNE.FLAME_SWAY * (0.4 + 0.9 * (1 - k));
        const lean = -s.side * TUNE.FLAME_LEAN * rise * 0.5;  // nach innen/oben (Richtung Kopf)
        const gsz = s.sz * (0.35 + 0.85 * k);
        const tHot = Math.max(0, Math.min(1, (k - 0.35) / 0.5)); // jung = heißer Kern
        const p = s.p;
        p.x = s.x0 + sway + lean;   // s.x0 ist bereits panel-lokal (aus ox berechnet)
        p.y = s.y0 - rise;
        const foot = gsz * 2.2;
        p.scaleX = foot / TX; p.scaleY = (foot / TX) * 1.75;   // vertikal gestreckt = Flammenform
        p.tint = rgbInt([lerp(COLR[0], CORER[0], tHot), lerp(COLR[1], CORER[1], tHot), lerp(COLR[2], CORER[2], tHot)]);
        p.alpha = k * k;
      }
    };

    function placeGlow(spr, x, y, r, a) { spr.x = x; spr.y = y; spr.width = r * 2; spr.height = r * 2; spr.alpha = Math.max(0, Math.min(1, a)); }
    function hideAll() { if (glowL) { glowL.alpha = glowR.alpha = glowT.alpha = 0; } for (const s of pool) if (s && s.alive) { s.alive = false; s.p.alpha = 0; } }

    app.init({
      canvas, preference: "webgl", backgroundAlpha: 0, antialias: true, autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1), resizeTo: host, powerPreference: "high-performance",
    }).then(() => {
      if (disposed) { try { app.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } return; }
      appRef.current = app;
      canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block";
      host.appendChild(canvas);

      flameTex = makeRadial([[0, 1], [0.35, 0.9], [0.7, 0.22], [1, 0]]);
      glowTex = makeRadial([[0, 0.9], [0.5, 0.28], [1, 0]]);
      glowL = new Sprite(glowTex); glowR = new Sprite(glowTex); glowT = new Sprite(glowTex);
      for (const s of [glowL, glowR, glowT]) { s.anchor.set(0.5); s.tint = COL_INT; s.alpha = 0; s.blendMode = "add"; app.stage.addChild(s); }

      glowPC = new ParticleContainer({ dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false } });
      glowPC.blendMode = "add"; app.stage.addChild(glowPC);
      for (let i = 0; i < MAX; i++) { const p = new Particle({ texture: flameTex, anchorX: 0.5, anchorY: 0.5, alpha: 0 }); glowPC.addParticle(p); pool.push({ p, alive: false, x0: 0, y0: 0, side: -1, age: 0, life: 1, spd: 0, sz: 1, seed: 0 }); }

      app.ticker.add(update);
      applyRun();
    }).catch(() => { /* WebGL fehlt → Overlay bleibt leer, Spiel läuft normal weiter */ });

    function applyRun() {
      const a = appRef.current;
      if (!a) return;
      const run = (stateRef.current.heat || 0) > 0.0005 && document.visibilityState !== "hidden";
      if (run) a.ticker.start(); else { a.ticker.stop(); hideAll(); }
    }
    applyRunRef.current = applyRun;
    const onVis = () => applyRun();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVis);
      const a = appRef.current; appRef.current = null;
      if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
      for (const t of [flameTex, glowTex]) { try { t?.destroy(true); } catch { /* ignore */ } }
    };
    // App EINMAL bauen; heat/reduced/Position kommen über Refs bzw. den Prop-Effekt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // heat-Wechsel (an/aus) → Ticker starten/stoppen (ohne App-Neubau).
  useEffect(() => { applyRunRef.current?.(); }, [heat]);

  return (
    <div ref={hostRef} aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 9 }} />
  );
}
