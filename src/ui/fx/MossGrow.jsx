import { useEffect, useRef } from "react";
import { dprCap } from "./mobileTier.js"; // #perf-mobile: Auflösungs-/Zeichenrate-Deckel (eine Wahrheit)
import { mixRGB, clampRGB, satBoost, mulberry32, roundRectPath, fbm, clamp, clamp01 } from "./fxMath.js"; // #fx-helfer: geteilte Mathe-/Canvas-Helfer
import { createStageBlend } from "./stageBlend.js"; // #382 akkretives Stufen-Blenden (eine Wahrheit mit dem Eis)

/* Archetyp-Karteneffekt „Pflanze" als Neon-Moos — realistisches Moos überwächst die eigene Karte mit dem Wachstum.
   Von OBEN & den beiden SEITEN wächst es nach innen/unten zu (Akkretion: bestehendes Moos bleibt, neues kommt dazu).
   Zwei gegenüberliegende Neon-Bühnenlichter (A↔B, Achse = NEON_ANGLE) strahlen das echte Grün an: Kanten-Säume,
   weiche Bloom-Aura, satter Punch. Renderer + TUNE 1:1 aus dem Kombi-Tuning-Board (docs/prototypes/moos-eis-combo.html,
   STYLE "moos"); die Werte sind vom User abgesegnet.

   #flip-fix (2026-08-12): Das Moos liegt jetzt als KIND der Kartenvorderseite (im Flip-Front-Face), NICHT mehr als
   flache Panel-Overlay-Canvas. Dadurch erbt es die CSS-Transforms der Karte — 3D-Flip (rotateY), Deal-in, Wegflug,
   Sieger-Ankippen, Deckkraft — VON SELBST: die bemooste Karte flippt als Ganzes, und `backface-visibility:hidden` des
   Front-Face blendet das Moos in der Rückseiten-Hälfte des Flips korrekt aus. Kein rAF, kein Positions-Tracking, kein
   Opacity-Spiegeln, kein Flip-Verstecken mehr nötig. Das Moos ist statisch (nur bei Stufen-Wechsel neu gezeichnet).

   BEWUSST Canvas-2D (kein Pixi-Custom-Shader): Pixis Mesh/Filter-Shader rendern auf dem Mobile-Setup NICHT (siehe
   Feld-Shader/NeonSilk). Nur weiche Fills/Strokes in ein gecachtes Offscreen-Bitmap → auf dem Handy tragbar.

   GRÖSSEN-UNABHÄNGIG: Das Moos-Bitmap wird in der REFERENZGRÖSSE (REF_W×REF_H = Prototyp @ zoom 1.3) gerendert und
   proportional auf die echte (kleinere) Kartenbox heruntergeblittet. Das Bitmap ist MODUL-WEIT je Reifestufe gecacht
   (renderMossBitmap läuft ≤ einmal pro Stufe pro Session) → das teure Zeichnen hängt nie mehr auf dem Flip-/Deal-Frame. */

// ── TUNE (abgesegnete Board-Werte aus moos-eis-combo.html, STYLE "moos") ────────
const TUNE = {
  MOSS_DARK: "#20331a", MOSS_MID: "#c251aa", MOSS_TIP: "#9bc255", SPORO_COLOR: "#9a6a34",

  NEON_A: "#ea34d1", NEON_B: "#66b450", NEON_ANGLE: -74, NEON_RIM: 0.72, NEON_TIP: 0.12, NEON_PUNCH: 0.04, NEON_BLOOM: 0.76, NEON_BASE: 1,

  REIF_COV: 0.48, EDGE_BAND: 0.26, TOP_BIAS: 0.52, DENSITY: 1, CLUMP: 1, RAGGED: 1, OVERHANG: 1,

  FILA_PER: 16, FILA_LEN: 3.5, FILA_THICK: 1.35, TILT: 12, SPREAD: 0.94, TIP_LIGHT: 1, SPECK: 0,

  SPOROPHYTE: 0, SHADOW: 0, DEW: 0,
};

const TAU = Math.PI * 2;
const STAGE_MAX = 8;          // PLANT_GREEN_THRESHOLD (constants.js) — Wachstum bis „reif" (grün)
// #382: Blenddauer/Kurve wohnen in stageBlend.js (geteilt mit dem Eis) — hier gibt es keinen zweiten Wert mehr.
const REF_W = 282, REF_H = 390;  // Referenz-Kartenbox (Prototyp box() @ zoom 1.3: 300*1.3=390, 390*104/144≈282)
const CARD_R = 12;            // Karten-Eckenradius (rounded-xl) — für den Composite-Clip
const M = 20;                 // Rand ums Moos-Bitmap (Überwuchs), in Referenz-px
const LDX = -0.55, LDY = -0.83; // Lichtrichtung (oben-links)
// Wachstum → Reifestufe → Deckung. Modul-weit, weil auch das Vorwärmen genau diese Stufen trifft (eine Wahrheit).
const stageOf = (g) => clamp(Math.round(g || 0), 0, STAGE_MAX);
const covOf = (stage) => (stage / STAGE_MAX) * TUNE.REIF_COV;

// #352: Reduzierte Bewegung? Globales data-reduced-fx (App: alles ≠ „full", inkl. Mobile) ODER prefers-reduced-motion.
// → dann Stufen-Wechsel OHNE Fade (Sofort-Draw wie bisher); Mobile-Perf/Barrierefreiheit bleiben unangetastet.
function prefersReducedFx() {
  try {
    if (typeof document !== "undefined" && document.documentElement.hasAttribute("data-reduced-fx")) return true;
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch { return false; }
}
function hexRGB(h) { let s = String(h || "#4f78c8").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
const rgba = (c, a) => "rgba(" + (c.r | 0) + "," + (c.g | 0) + "," + (c.b | 0) + "," + a + ")";

// ── Moos-Feld (fixe Referenzgröße, deterministisch seeded → einmal je Session gebaut, RDPR-unabhängig) ──
let _field = null;
function getField() {
  if (_field) return _field;
  const field = [];
  const step = 5 + (1 - TUNE.DENSITY) * 7;
  const maxInward = REF_W * (0.30 + 0.55 * TUNE.EDGE_BAND);
  const maxDown = REF_H * (0.80 + 0.80 * (1 - TUNE.TOP_BIAS));
  const rng = mulberry32(1337); let id = 0;
  for (let gy = step * 0.5; gy < REF_H; gy += step) for (let gx = step * 0.5; gx < REF_W; gx += step) {
    const x = gx + (rng() - 0.5) * step * 0.9, y = gy + (rng() - 0.5) * step * 0.9;
    if (x < 0 || x > REF_W || y < 0 || y > REF_H) continue;
    const dTop = y, dL = x, dR = REF_W - x, fromEdge = Math.min(dTop, dL, dR);
    let bi = Math.max(fromEdge / maxInward, dTop / maxDown);
    bi += TUNE.RAGGED * (fbm(x, y) - 0.5) * 0.7;                 // fransiger Rand
    const birthG = clamp01(bi); if (birthG > 1) continue;
    const wL = 1 / (dL + 6), wR = 1 / (dR + 6), leanX = Math.max(-1, Math.min(1, (wL - wR) * 6));
    const ang = Math.atan2(-1, leanX * 0.9 + (rng() - 0.5) * 0.2);
    const size = 0.6 + rng() * 0.8 + TUNE.CLUMP * (rng() * rng()) * 1.6, hue = rng();
    const wT = 1 / (dTop + 4), wLo = 1 / (dL + 4), wRo = 1 / (dR + 4), outAng = Math.atan2(-wT, wRo - wLo);
    const edgeOut = clamp01(1 - fromEdge / (step * 1.6)), tuftJit = (rng() - 0.5);
    field.push({ x, y, birthG, ang, size, hue, outAng, edgeOut, tuftJit, seed: (id++ * 2654435761) >>> 0 });
  }
  _field = field; return field;
}

// ── Moos-Bitmap je Reifestufe: MODUL-WEIT gecacht (renderMossBitmap ≤ einmal pro Stufe pro Session) ──
const _bmpCache = new Map();  // key `${RDPR}:${covKey}:${nA}:${nB}` → { moss, glow }
function getMossBitmap(cov, nA, nB) {
  const RDPR = dprCap();
  const key = RDPR + ":" + Math.round(cov * 1000) + ":" + nA + ":" + nB;   // Farbmodus (Standard/Deckfarbe) im Key
  let e = _bmpCache.get(key);
  if (e) return e;
  e = renderMossBitmap(cov, getField(), RDPR, nA, nB);
  _bmpCache.set(key, e);
  return e;
}

/* #372 Prewarm — Moos-Feld + Reif-Stufen-Bitmap im LEERLAUF aufbauen, BEVOR die erste reife Karte kommt → das teure
   Erst-Zeichnen hängt dann nicht mehr synchron auf dem Deal-/Flip-Frame (der gemeldete einmalige Ruckler). Wärmt den
   modul-weiten Cache (getField + getMossBitmap für die Reif-Stufe: covOf(STAGE_MAX) === REIF_COV). Standard-Palette
   immer; die Deckfarben zusätzlich, falls der Deckfarbe-Modus aktiv ist. Kein DOM-Mount nötig, rein Cache-füllend. */
export function prewarmMoss({ deckTint = false, deckColor = null, deckColor2 = null } = {}) {
  try {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    getField();
    const cov = TUNE.REIF_COV; // Reif-Stufe (Stufe STAGE_MAX → grün)
    getMossBitmap(cov, TUNE.NEON_A, TUNE.NEON_B);                                   // Standard-Palette
    if (deckTint && deckColor) getMossBitmap(cov, deckColor, deckColor2 || deckColor); // Deckfarbe-Modus
  } catch { /* Prewarm ist nie kritisch */ }
}

/* #382 ALLE Stufen vorwärmen — als Liste einzelner Aufgaben, nicht als ein Block.
   Die Deck-Werkstatt spielt in der Skill-Effekt-Bühne binnen Sekunden das ganze Wachstum durch; ohne Vorwärmen fällt
   der (teure) Erst-Aufbau jedes Stufen-Bitmaps mitten in eine Blende — also genau in die Frames, die flüssig sein
   sollen. Der Aufrufer verteilt die Aufgaben auf Idle-Slots (eine je Slot), damit nie zwei Renderings in einem Frame
   liegen. Bereits gecachte Stufen sind ein Map-Treffer und kosten nichts. */
export function mossPrewarmTasks({ deckTint = false, deckColor = null, deckColor2 = null } = {}) {
  // Genau EINE Palette — die gezeigte. Jedes Bitmap belegt Speicher; der andere Farbmodus wird erst beim Umschalten gebraucht.
  const [a, b] = deckTint && deckColor ? [deckColor, deckColor2 || deckColor] : [TUNE.NEON_A, TUNE.NEON_B];
  const tasks = [() => getField()];
  for (let s = 1; s <= STAGE_MAX; s++) tasks.push(() => getMossBitmap(covOf(s), a, b));
  return tasks;
}

// nA/nB = Neon-Bühnenlicht-Farben: Standard-Palette (TUNE.NEON_A/B) ODER die Deckfarben (Deckfarbe-Modus).
function renderMossBitmap(g, field, RDPR, nA, nB) {
  const moss = document.createElement("canvas"), mctx = moss.getContext("2d");
  const glow = document.createElement("canvas"), gctx = glow.getContext("2d");
  moss.width = Math.round((REF_W + 2 * M) * RDPR); moss.height = Math.round((REF_H + 2 * M) * RDPR);
  glow.width = moss.width; glow.height = moss.height;

  const nang = TUNE.NEON_ANGLE * Math.PI / 180, axc = Math.cos(nang), axs = Math.sin(nang);
  const cNA = hexRGB(nA), cNB = hexRGB(nB);
  const cDark = hexRGB(TUNE.MOSS_DARK), cMid = hexRGB(TUNE.MOSS_MID), cTip = hexRGB(TUNE.MOSS_TIP), cSpo = hexRGB(TUNE.SPORO_COLOR);
  const cTipHi = clampRGB(mixRGB(cTip, { r: 255, g: 255, b: 230 }, 0.55));
  const cDark0 = { r: 0, g: 0, b: 0 };
  const neonTips = [];

  function drawTuftShadow(mx, t, mat) {
    let cd = cDark;
    if (TUNE.NEON_BASE >= 0.5 && TUNE.NEON_RIM > 0) {                                   // Base-Toggle: Schatten-Matte neon tönen
      const tA = clamp01(0.5 + ((t.x - REF_W / 2) * axc + (t.y - REF_H / 2) * axs) / (Math.max(REF_W, REF_H) * 0.62));
      cd = clampRGB(mixRGB(cDark, clampRGB(mixRGB(cNA, cNB, tA)), 0.4 * TUNE.NEON_RIM));
    }
    mx.fillStyle = rgba(cd, (0.30 + 0.35 * TUNE.SHADOW) * mat);
    mx.beginPath(); mx.ellipse(t.x, t.y + 1, t.size * 2.0 * mat, t.size * 1.5 * mat, 0, 0, TAU); mx.fill();
  }
  function drawTuftHairs(mx, t, mat) {
    const rng = mulberry32(t.seed), k = (t.hue - 0.5);
    const midT = clampRGB({ r: cMid.r + k * 34, g: cMid.g + k * 12 - Math.abs(k) * 10, b: cMid.b - k * 22 });
    const tipT = clampRGB({ r: cTip.r + k * 30, g: cTip.g + k * 8, b: cTip.b - k * 18 });
    const tiltRad = TUNE.TILT * Math.PI / 180, spreadRad = 0.2 + TUNE.SPREAD * 2.1, eo = t.edgeOut * TUNE.OVERHANG;
    const bx = t.x + Math.cos(t.outAng) * eo * 3.5 * mat, by = t.y + Math.sin(t.outAng) * eo * 3.5 * mat;
    const n = Math.max(2, Math.round(TUNE.FILA_PER * (0.45 + 0.55 * mat) * (0.6 + 0.7 * t.size)));
    const tAxis = clamp01(0.5 + ((t.x - REF_W / 2) * axc + (t.y - REF_H / 2) * axs) / (Math.max(REF_W, REF_H) * 0.62));
    const neon = clampRGB(mixRGB(cNA, cNB, tAxis)), neonP = satBoost(neon, 0.45 + 0.9 * TUNE.NEON_PUNCH);
    const neonHot = clampRGB(mixRGB(neonP, { r: 255, g: 255, b: 255 }, 0.35 + 0.25 * clamp01(TUNE.NEON_PUNCH)));
    for (let i = 0; i < n; i++) {
      const rr = rng();
      const len = TUNE.FILA_LEN * (0.45 + rr * 0.95) * (0.35 + 0.85 * mat) * (0.7 + 0.5 * t.size) * (1 + eo * 0.7);
      const am = t.ang + tiltRad + t.tuftJit * spreadRad * 0.6 + (rng() - 0.5) * spreadRad;
      const dirx = Math.cos(am), diry = Math.sin(am), x2 = bx + dirx * len, y2 = by + diry * len;
      const mpx = (bx + x2) / 2 + (rng() - 0.5) * len * 0.35, mpy = (by + y2) / 2 + (rng() - 0.5) * len * 0.25;
      const lightK = 0.66 + 0.5 * Math.max(0, dirx * LDX + diry * LDY), up = clamp01(Math.hypot(x2 - bx, y2 - by) / 10);
      let col = clampRGB(mixRGB(midT, tipT, (0.25 + 0.7 * rng()) * (0.4 + 0.6 * mat)));
      col = clampRGB({ r: col.r * lightK * (0.85 + 0.3 * up), g: col.g * lightK * (0.85 + 0.3 * up), b: col.b * lightK * (0.85 + 0.3 * up) });
      const washU = TUNE.NEON_BASE >= 0.5 ? (0.70 + 0.20 * up) : (0.26 + 0.36 * up);   // Base-Toggle: Wash zieht auch nach unten
      if (TUNE.NEON_RIM > 0) { col = clampRGB(mixRGB(col, neonP, TUNE.NEON_RIM * washU)); }  // Neon-Wash über den Halm
      mx.strokeStyle = rgba(col, 0.92); mx.lineWidth = TUNE.FILA_THICK * (0.6 + 0.7 * rng()); mx.lineCap = "round";
      mx.beginPath(); mx.moveTo(bx, by); mx.quadraticCurveTo(mpx, mpy, x2, y2); mx.stroke();
      if (TUNE.NEON_TIP > 0) {                                                          // additiver Neon-Saum an Spitze/Rand
        const rimI = clamp01(TUNE.NEON_TIP * (0.18 + 0.82 * up) * (0.5 + 0.7 * eo) * (0.55 + 0.45 * mat));
        if (rimI > 0.03) {
          mx.globalCompositeOperation = "lighter";
          mx.strokeStyle = rgba(neonP, rimI * (0.5 + 0.4 * TUNE.NEON_PUNCH)); mx.lineWidth = TUNE.FILA_THICK * (0.5 + 0.5 * rng());
          mx.beginPath(); mx.moveTo((bx + x2) * 0.5, (by + y2) * 0.5); mx.lineTo(x2, y2); mx.stroke();
          const pr = TUNE.FILA_THICK * (1.4 + 2.8 * TUNE.NEON_PUNCH) * (0.6 + 0.6 * rr);
          mx.fillStyle = rgba(neonP, rimI * 0.30 * (0.4 + TUNE.NEON_PUNCH)); mx.beginPath(); mx.arc(x2, y2, pr, 0, TAU); mx.fill();
          mx.fillStyle = rgba(neonP, rimI * 0.55); mx.beginPath(); mx.arc(x2, y2, pr * 0.5, 0, TAU); mx.fill();
          mx.fillStyle = rgba(neonHot, rimI * (0.7 + 0.3 * TUNE.NEON_PUNCH)); mx.beginPath(); mx.arc(x2, y2, TUNE.FILA_THICK * 0.6, 0, TAU); mx.fill();
          mx.globalCompositeOperation = "source-over";
          if (neonTips.length < 420 && rng() < 0.6) neonTips.push({ x: x2, y: y2, c: neonP, i: rimI });
        }
      }
      if (rng() < TUNE.TIP_LIGHT * 0.55) {
        mx.fillStyle = rgba(cTipHi, 0.6 * TUNE.TIP_LIGHT); mx.beginPath(); mx.arc(x2, y2, TUNE.FILA_THICK * 0.55, 0, TAU); mx.fill();
      }
    }
    if (TUNE.SPECK > 0) {                                                               // Samt-Körnung nahe Basis
      const sp = Math.round(TUNE.SPECK * 3);
      for (let s = 0; s < sp; s++) { const rx = t.x + (rng() - 0.5) * t.size * 3, ry = t.y + (rng() - 0.5) * t.size * 3;
        mx.fillStyle = rgba(clampRGB(mixRGB(midT, cDark0, 0.4)), 0.5 * TUNE.SPECK * mat); mx.fillRect(rx, ry, 1, 1); }
    }
  }
  function drawSporophyte(mx, t, mat) {
    const rng = mulberry32(t.seed ^ 0x9e3779b9); if (rng() >= TUNE.SPOROPHYTE * 0.05 * mat) return;
    const h = TUNE.FILA_LEN * (2.2 + rng() * 1.8) * mat, lean = (rng() - 0.5) * 0.5, tx = t.x + lean * h * 0.5, ty = t.y - h;
    mx.strokeStyle = rgba(clampRGB(mixRGB(cSpo, { r: 210, g: 190, b: 120 }, 0.15)), 0.9); mx.lineWidth = Math.max(0.8, TUNE.FILA_THICK * 0.8); mx.lineCap = "round";
    mx.beginPath(); mx.moveTo(t.x, t.y); mx.quadraticCurveTo(t.x + lean * h * 0.3, t.y - h * 0.5, tx, ty); mx.stroke();
    mx.fillStyle = rgba(clampRGB(mixRGB(cSpo, { r: 120, g: 70, b: 30 }, 0.2)), 0.95); mx.beginPath(); mx.ellipse(tx, ty, TUNE.FILA_THICK * 1.1, TUNE.FILA_THICK * 1.7, lean, 0, TAU); mx.fill();
    mx.fillStyle = rgba({ r: 240, g: 225, b: 170 }, 0.5); mx.beginPath(); mx.arc(tx - 0.6, ty - 0.8, TUNE.FILA_THICK * 0.5, 0, TAU); mx.fill();
  }

  mctx.setTransform(RDPR, 0, 0, RDPR, M * RDPR, M * RDPR);
  mctx.clearRect(-M, -M, REF_W + 2 * M, REF_H + 2 * M);
  let i, t, mat;
  for (i = 0; i < field.length; i++) { t = field[i]; mat = clamp01((g - t.birthG) / 0.22); if (mat <= 0) continue; drawTuftShadow(mctx, t, mat); }
  for (i = 0; i < field.length; i++) { t = field[i]; mat = clamp01((g - t.birthG) / 0.22); if (mat <= 0) continue; drawTuftHairs(mctx, t, mat); }
  if (TUNE.SPOROPHYTE > 0) for (i = 0; i < field.length; i++) { t = field[i]; mat = clamp01((g - t.birthG) / 0.22); if (mat < 0.4) continue; drawSporophyte(mctx, t, mat); }

  // Bloom-Aura: weiche Neon-Puffs an den gesammelten Spitzen (gecacht, per drawImage geblittet)
  gctx.setTransform(RDPR, 0, 0, RDPR, M * RDPR, M * RDPR); gctx.clearRect(-M, -M, REF_W + 2 * M, REF_H + 2 * M);
  if (TUNE.NEON_BLOOM > 0 && neonTips.length) {
    gctx.globalCompositeOperation = "lighter"; const gr = Math.max(6, TUNE.FILA_LEN * 2.4);
    for (i = 0; i < neonTips.length; i++) { const np = neonTips[i], rad = gr * (0.6 + 0.9 * np.i);
      const rgd = gctx.createRadialGradient(np.x, np.y, 0, np.x, np.y, rad);
      rgd.addColorStop(0, rgba(np.c, 0.55 * np.i)); rgd.addColorStop(0.5, rgba(np.c, 0.18 * np.i)); rgd.addColorStop(1, rgba(np.c, 0));
      gctx.fillStyle = rgd; gctx.beginPath(); gctx.arc(np.x, np.y, rad, 0, TAU); gctx.fill();
    }
    gctx.globalCompositeOperation = "source-over";
  }
  return { moss, glow };
}

/* MossGrow — KIND der Kartenvorderseite. Füllt seinen Container (die Karte); zeichnet das (gecachte) Moos-Bitmap
   proportional auf die Kartenbox inkl. Überwuchs-Rand. Statisch → neu gezeichnet nur bei Wachstums-/Größen-Wechsel.
   Alle Karten-Bewegungen (Flip/Deal/Wegflug/Ankippen/Deckkraft) erledigt CSS, weil das Moos IN der Karte hängt. */
export function MossGrow({ growth = 0, deckTint = false, deckColor = null, deckColor2 = null }) {
  const hostRef = useRef(null);
  // Farbmodus: Standard = feste Neon-Palette; Deckfarbe = deckColor→deckColor2 als Bühnenlicht.
  const nA = deckTint && deckColor ? deckColor : TUNE.NEON_A;
  const nB = deckTint && deckColor ? (deckColor2 || deckColor) : TUNE.NEON_B;
  // #352: Über Re-Renders/Effekt-Läufe STABILER Zustand — die Canvas bleibt bestehen (kein Neuaufbau je Stufe), damit
  // der Cross-Fade von der zuletzt gezeigten Stufe auf die neue laufen kann (statt gegen eine frische, leere Canvas).
  const S = useRef({ growth, nA, nB, drawStatic: null, fadeTo: null });
  S.current.growth = growth; S.current.nA = nA; S.current.nB = nB;

  // Setup: Canvas + Zeichen-Funktionen EINMAL aufbauen (Deps []). growth/Farbe kommen über S.current rein → das teure
  // Kartenerzeugen entfällt (Bitmaps sind ohnehin modul-weit gecacht); je Wechsel nur noch Fade bzw. statischer Draw.
  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;pointer-events:none;display:block";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const st = S.current;
    let disposed = false, raf = 0;
    const blend = createStageBlend();   // #382 Stufen-Blende (Reifestufen als Schlüssel), siehe stageBlend.js

    // Canvas an die Kartenbox (inkl. Überwuchs-Rand) anpassen; liefert Geometrie oder null (zu klein).
    function computeGeo() {
      const cw = host.clientWidth, ch = host.clientHeight;
      if (cw < 4 || ch < 4) return null;
      const DPR = dprCap();
      const sx = cw / REF_W, sy = ch / REF_H, mLeft = M * sx, mTop = M * sy;
      const cwF = cw + 2 * mLeft, chF = ch + 2 * mTop;           // Canvas mit Überwuchs-Rand (ragt über die Karte hinaus)
      canvas.style.display = "block";
      canvas.style.left = (-mLeft) + "px"; canvas.style.top = (-mTop) + "px";
      canvas.style.width = cwF + "px"; canvas.style.height = chF + "px";
      canvas.width = Math.max(1, Math.round(cwF * DPR)); canvas.height = Math.max(1, Math.round(chF * DPR));
      return { cw, ch, cwF, chF, sx, sy, mLeft, mTop, DPR };
    }

    /* Ein Stufen-Bitmap (Moos + additiver Bloom) mit Gewicht in die geclippte Kartenbox blitten.
       #382: BEIDE Ebenen additiv (`lighter`). Die Fläche ist frisch gelöscht und die Gewichte addieren sich zu 1
       → das Ergebnis ist die exakte Interpolation der Stufen; das schon gewachsene Moos bleibt beim Stufen-Wechsel
       konstant, nur der Zuwachs blendet auf (mit `source-over` sackte der Bewuchs mitten in der Blende weg).
       Einzelne Ebene mit w=1 auf leerer Fläche = pixelgleich zu vorher. */
    function paintStage(cov, w, geo) {
      if (cov <= 0 || w <= 0.002) return;
      const { moss, glow } = getMossBitmap(cov, st.nA, st.nB);
      const { cw, ch, cwF, chF, sx, sy, mLeft, mTop } = geo;
      const growX = M * TUNE.OVERHANG * sx, growY = M * TUNE.OVERHANG * sy, grow = Math.min(growX, growY);
      ctx.save();
      roundRectPath(ctx, mLeft - growX, mTop - growY, cw + 2 * growX, ch + 2 * growY, CARD_R + grow); ctx.clip();
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = w;
      ctx.drawImage(moss, 0, 0, moss.width, moss.height, 0, 0, cwF, chF);
      if (TUNE.NEON_BLOOM > 0) {
        ctx.globalAlpha = w * clamp01(TUNE.NEON_BLOOM);
        ctx.drawImage(glow, 0, 0, glow.width, glow.height, 0, 0, cwF, chF);
      }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Alle gerade sichtbaren Ebenen zeichnen (unterste zuerst). Rückgabe: läuft noch eine Blende?
    function paintNow(geo, now) {
      ctx.setTransform(geo.DPR, 0, 0, geo.DPR, 0, 0);
      ctx.clearRect(0, 0, geo.cwF, geo.chF);
      const layers = blend.weights(now);
      for (let i = 0; i < layers.length; i++) paintStage(covOf(layers[i].stage), layers[i].w, geo);
      return blend.active;
    }

    // Statischer Sofort-Draw einer Stufe (kein Fade) — Erststart, Resize, reduzierte Bewegung, Farbwechsel.
    st.drawStatic = (g) => {
      if (disposed) return;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      blend.set(stageOf(g));
      const geo = computeGeo();
      if (!geo) { canvas.style.display = "none"; return; }
      paintNow(geo, performance.now());
    };

    /* #382 Weich auf die neue Stufe blenden. Beide Bitmaps sind gecacht → während der Blende nur ein paar drawImage
       pro Frame, danach wieder komplett statisch (kein Dauer-rAF). Wächst das Moos WÄHREND einer laufenden Blende
       weiter (im Spiel gut möglich), setzt sich die neue Stufe als weitere Ebene obendrauf, statt die laufende
       abzuschneiden — der Zuwachs bleibt dadurch auch bei schnellen Serien lückenlos. */
    st.fadeTo = (g) => {
      if (disposed) return;
      const toStage = stageOf(g);
      if (toStage === blend.target) return;    // gleiche Stufe (z. B. growth 3.2→3.4) → nichts zu tun
      blend.to(toStage, performance.now());
      if (raf) return;                          // Blende läuft bereits → die neue Ebene fährt einfach mit
      const geo = computeGeo();
      if (!geo) { canvas.style.display = "none"; return; }
      const tick = (now) => {
        if (disposed) return;
        raf = paintNow(geo, now) ? requestAnimationFrame(tick) : 0;
      };
      raf = requestAnimationFrame(tick);
    };

    st.drawStatic(st.growth);   // Erststart: aktuelle Stufe sofort statisch (setzt die Basis der Blende)
    let ro = null;
    try { ro = new ResizeObserver(() => st.drawStatic(st.growth)); ro.observe(host); } catch { /* ignore */ }
    return () => {
      disposed = true; if (raf) cancelAnimationFrame(raf); if (ro) ro.disconnect();
      try { host.removeChild(canvas); } catch { /* ignore */ }
      st.drawStatic = null; st.fadeTo = null;
    };
  }, []);

  // #352 Stufen-/Wachstums-Wechsel: weich überblenden — bzw. bei reduzierter Bewegung sofort statisch (Barrierefreiheit/Mobile).
  useEffect(() => {
    const st = S.current;
    if (!st.fadeTo) return;                          // Setup noch nicht gelaufen
    if (prefersReducedFx()) st.drawStatic(growth);
    else st.fadeTo(growth);
  }, [growth]);

  // Farbmodus-Wechsel (Standard ↔ Deckfarbe): Sofort-Redraw der aktuellen Stufe, kein Fade.
  useEffect(() => {
    if (S.current.drawStatic) S.current.drawStatic(S.current.growth);
  }, [nA, nB]);

  // Füllt die Kartenvorderseite; overflow:visible lässt den Überwuchs-Rand über die Karte hinausragen. z-2 = über dem
  // Karten-Skin, unter der großen Wert-Zahl (die die Karte im Card-Overlay trägt) — Moos „überwächst" die Kartenfläche.
  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible", zIndex: 2 }} />;
}

export default MossGrow;
