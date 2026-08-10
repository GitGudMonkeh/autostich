import { ParticleContainer, Particle, Sprite, Container, Texture } from "pixi.js";

/* Sternenfeld als GPU-Effekt (Pixi-Umbau, Phase 3) — TREUER Port der DOM-Fassung (FieldFxLayer effect="starfield"):
   zwei sanft driftende Stern-Ebenen (Ambiente) + pro Stich eine Sternschnuppe mit 14er-Kometenschweif entlang einer
   von sechs Flugbahnen. Keine Optik-Änderung, nur DOM → GPU.

   Wie bei embers: kleine Helfer bewusst dupliziert (Modul lebt nur im lazy Pixi-Chunk, nie auf main). */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hexToInt = (hex) => { const h = (hex || "#35e0ff").replace("#", ""); const f = h.length === 3 ? h.replace(/(.)/g, "$1$1") : h; const n = parseInt(f, 16); return Number.isFinite(n) ? n : 0x35e0ff; };
const TX = 64;

function makeStarTex() {   // weicher runder Stern-/Glut-Punkt (weiß, wird pro Sprite getönt)
  const c = document.createElement("canvas"); c.width = c.height = TX;
  const cx = c.getContext("2d");
  const g = cx.createRadialGradient(TX / 2, TX / 2, 0, TX / 2, TX / 2, TX / 2);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,0.85)");
  g.addColorStop(0.7, "rgba(255,255,255,0.25)"); g.addColorStop(1, "rgba(255,255,255,0)");
  cx.fillStyle = g; cx.fillRect(0, 0, TX, TX);
  return Texture.from(c);
}

// Ambiente-Sterne (x%, y%, px, Alpha-Faktor) — Positionen wie die radial-gradients der DOM-Ebenen.
const STARS_A = [[15, 20, 1.3, 1.0], [70, 38, 1.0, 0.8], [40, 72, 1.5, 1.0], [86, 80, 1.0, 0.67], [55, 12, 1.0, 1.0], [25, 90, 1.2, 0.73]];
const STARS_B = [[32, 55, 1.0, 0.67], [90, 22, 1.6, 1.0], [62, 88, 1.0, 0.8], [8, 45, 1.0, 0.6]];
// Sternschnuppen-Bahnen: Start (top/left %), Flugwinkel (°), Strecke (px). Je Stich eine (sweepId % 6) — wie im DOM.
const SHOOT_PATHS = [
  { top: 6, left: -8, ang: 26, dist: 620 },
  { top: -6, left: 62, ang: 124, dist: 620 },
  { top: 24, left: -10, ang: 9, dist: 680 },
  { top: -8, left: 34, ang: 68, dist: 460 },
  { top: 14, left: 72, ang: 152, dist: 600 },
  { top: -6, left: 12, ang: 48, dist: 560 },
];
const TRAIL_N = 14;   // Kometenschweif-Partikel
const COMET_SPR = TRAIL_N + 1;
const MAXCOMET = 4;   // gleichzeitige Sternschnuppen (überlappende Stiche)
const GLOW = 2.4;     // Halo-Faktor (Sprite größer als Kern → weicher Schein statt Filter-Bloom)

// as-field-shoot Opacity-Keyframe: 0→0, 12%→1, 82%→1, 100%→0
function shootAlpha(p) { return p < 0.12 ? p / 0.12 : p > 0.82 ? Math.max(0, (1 - p) / 0.18) : 1; }

export function createStarfield(app) {
  const tex = makeStarTex();
  const ambC = new Container();                 // Ambiente-Sterne (Drift)
  const cometC = new ParticleContainer({ dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false } });
  cometC.blendMode = "add";
  ambC.blendMode = "add";
  app.stage.addChild(ambC, cometC);

  // Ambiente-Stern-Sprites (fester Satz)
  const ambStars = [];
  for (const [x, y, px, af] of [...STARS_A.map((s) => [...s, "a"]), ...STARS_B.map((s) => [...s, "b"])]) {
    const sp = new Sprite(tex); sp.anchor.set(0.5); sp.alpha = 0;
    ambStars.push({ sp, x: x / 100, y: y / 100, px, af, layer: y }); // layer via 5. Feld ("a"/"b")
    ambC.addChild(sp);
  }
  // Layer korrekt setzen (5. Feld ging beim Spread verloren) → aus Herkunft ableiten:
  ambStars.forEach((s, i) => { s.layer = i < STARS_A.length ? "a" : "b"; });

  // Kometen-Sprite-Pool: MAXCOMET × (Kopf + Schweif), ungenutzte auf alpha 0
  const comets = [];
  for (let c = 0; c < MAXCOMET; c++) {
    const sprs = [];
    for (let j = 0; j < COMET_SPR; j++) { const p = new Particle({ texture: tex, anchorX: 0.5, anchorY: 0.5, alpha: 0 }); cometC.addParticle(p); sprs.push(p); }
    comets.push({ sprs, active: false, t: 0, dur: 1, sx: 0, sy: 0, cos: 1, sin: 0, dist: 0, headInt: 0xffffff, deckInt: 0x35e0ff });
  }
  let cHead = 0;

  let params = { effect: null, deckInt: 0x35e0ff, reduced: false };
  let clock = 0;

  function reset() {
    for (const s of ambStars) s.sp.alpha = 0;
    for (const c of comets) { c.active = false; for (const p of c.sprs) p.alpha = 0; }
  }
  function setParams(next) {
    params = { ...params, ...next, deckInt: next.color != null ? hexToInt(next.color) : params.deckInt };
    if (params.effect !== "starfield") reset();
  }

  function erupt({ sweepId, sweepDur, win }) {
    if (params.effect !== "starfield" || params.reduced || !(sweepId > 0)) return; // react = !reduced && sweepId>0
    const W = app.screen.width, H = app.screen.height;
    const path = SHOOT_PATHS[sweepId % SHOOT_PATHS.length];
    const c = comets[cHead]; cHead = (cHead + 1) % MAXCOMET;
    c.active = true; c.t = 0; c.dur = clamp((sweepDur || 900) / 1000, 0.15, 1.8);
    c.sx = (path.left / 100) * W; c.sy = (path.top / 100) * H;
    const a = path.ang * Math.PI / 180; c.cos = Math.cos(a); c.sin = Math.sin(a);
    c.dist = path.dist * clamp(W / 380, 0.7, 1.5);   // etwas an Panelbreite anpassen
    c.headInt = win ? 0xffffff : params.deckInt; c.deckInt = params.deckInt;
  }

  function update(ticker) {
    const dt = Math.min(0.05, ticker.deltaMS / 1000);
    clock += dt;
    if (params.effect !== "starfield") return;
    const W = app.screen.width, H = app.screen.height, deck = params.deckInt;

    // Ambiente: zwei Ebenen driften sanft vertikal (in „minimal" statisch). Opazität wie DOM (0.55 / 0.4).
    const driftA = params.reduced ? 0 : Math.sin(clock * (2 * Math.PI / 52)) * 0.06 * H;
    const driftB = params.reduced ? 0 : Math.sin(clock * (2 * Math.PI / 76) + Math.PI) * 0.05 * H;
    for (const s of ambStars) {
      const op = s.layer === "a" ? 0.55 : 0.4;
      s.sp.x = s.x * W; s.sp.y = s.y * H + (s.layer === "a" ? driftA : driftB);
      s.sp.tint = deck; s.sp.alpha = op * s.af;
      const foot = s.px * 2 * GLOW; s.sp.width = s.sp.height = foot;
    }

    // Sternschnuppen
    for (const c of comets) {
      if (!c.active) continue;
      c.t += dt;
      const p = c.t / c.dur;
      if (p >= 1) { c.active = false; for (const s of c.sprs) s.alpha = 0; continue; }
      const oa = shootAlpha(p), base = c.dist * p, cos = c.cos, sin = c.sin;
      for (let j = 0; j < COMET_SPR; j++) {
        const spr = c.sprs[j];
        let u, v, size, a, col;
        if (j === 0) { u = base; v = 0; size = 4; a = 1; col = c.headInt; }
        else {
          const i = j - 1, tt = i / (TRAIL_N - 1);
          u = base - (3 + i * 4.6);
          v = (i % 2 ? 1 : -1) * (0.5 + tt * 2.4);
          size = 3 - tt * 2.1;
          a = 0.85 - tt * 0.72;
          col = i < 3 ? c.headInt : c.deckInt;
        }
        const flick = 0.72 + 0.33 * (0.5 + 0.5 * Math.sin(clock * 13.6 + j)); // as-comet-p (~460ms)
        spr.x = c.sx + u * cos - v * sin;
        spr.y = c.sy + u * sin + v * cos;
        spr.tint = col; spr.alpha = a * oa;
        const foot = size * 2 * GLOW * (j === 0 ? 1.25 : flick);
        spr.scaleX = spr.scaleY = foot / TX;
      }
    }
  }

  app.ticker.add(update);

  return {
    setParams,
    erupt,
    destroy() {
      try { app.ticker.remove(update); } catch { /* ignore */ }
      for (const c of [ambC, cometC]) { try { c.destroy({ children: true }); } catch { /* ignore */ } }
      try { tex.destroy(true); } catch { /* ignore */ }
    },
  };
}
