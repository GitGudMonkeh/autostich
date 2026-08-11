import { Container, ParticleContainer, Particle, Texture } from "pixi.js";

/* Karten-Effekt „Materialize" · Layer 4 aus #318 — Nano-Partikel-Aufbau statt Karten-Flip (Reveal-Transition).
   Anders als die Dauer-Layer (Edge-Glow/Holo/Glitch) ist Materialize GETRIGGERT: beim Aufdecken bauen sich
   `anzahl` additive Nano-Teilchen aus einer gestreuten Wolke ums Kartenrechteck zur vollen Kartenform zusammen
   (`build` 0→1); ist die Karte solide, übernimmt die DOM-Karte und die Dauer-Layer tragen normal weiter.
   Rückwärts (`build` 1→0) = Auflösen bei Niederlage/Entfernen (Dematerialize).

   Andockung: eine Instanz JE Karte, `root` in den Karten-Container der geteilten CardFxStage gehängt (über den
   Dauer-Layern — die Partikel fliegen von außen ein und liegen obenauf). Die Stage triggert `start(dir, …)` bei
   Reveal/Auflösen und ruft pro Frame `update(…)`; `isBuilding()` sagt der Stage, dass die Dauer-Layer solange
   pausieren (erst wenn solide, laufen sie weiter).

   Blitzrahmen-Sync (#318): wird NICHT hier verdrahtet — der Ionensturm-Rahmen (IonStorm) liest pro Frame die
   DOM-Opacity der Karte und fadet damit. Battlefield fährt den Materialize-Reveal über eine Opacity-Rampe am
   Karten-Wrapper (as-materialize-in/-out) → der Blitzrahmen erscheint/verschwindet ZEITGLEICH mit dem Aufbau.

   KEIN Custom-Shader, additive `ParticleContainer` (wie FireBurn) — auf dem Mobile-Setup verlässlich. Partikel
   werden EINMAL vor-alloziert (Pool) und je Aufbau neu bestückt; unter `lite` gedeckelt, per Tier reduziert.

   Skalierung: `partikel.groesse`, `start.streuung` sind px (Board-Raum HREF=360) → mit sc=h/360 skaliert. `dauer`
   kommt von außen (an den Flip-Takt gekoppelt), NICHT die feste 0.65 s — damit der Aufbau im Turbo synchron bleibt.

   [TUNING] Werte 1:1 aus dem Materialize-Board (#318). */

export const MATERIALIZE_TUNE = {
  partikel: { anzahl: 1500, groesse: 1.3, glow: 0, trail: 1 },   // anzahl = Pool-Obergrenze; groesse *sc
  aufbau:   { dauer: 0.65, stagger: 0.04, easing: 2.3, wirbel: 1 }, // dauer nur Fallback (Battlefield gibt flipDur)
  start:    { streuung: 45, quelle: "feld" },                    // streuung *sc; quelle: feld|zentrum|rand
  farbe:    { kartenfarbe: 1, funkeln: 1, nanoFarbe: "#8fe9ff" }, // kartenfarbe mischt Nano↔Deckfarbe
  reveal:   { solidAt: 1 },                                      // 1 = Partikel bilden die volle Karte (kein Bild-Fade)
};

const CARD_CORNER = 12;     // rounded-xl der Karte (echte Geometrie, px)
const DOT_TX = 24;          // Kantenlänge der weichen Dot-Textur
const LITE_CAP = 320;       // Partikel-Deckel unter `lite`

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a || 1)); return t * t * (3 - 2 * t); };
// Spitze nahe der Ankunft (e≈0.9) für den „Funkeln"-Blitz beim Andocken.
const arriveBump = (e) => { const d = (e - 0.9) / 0.12; return Math.exp(-d * d); };

const colNum = (hex, fb = 0x8fe9ff) => {
  const h = String(hex || "").replace("#", "");
  if (!h) return fb;
  const v = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return Number.isFinite(v) ? v : fb;
};
const lerpCol = (a, b, t) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return ((Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t));
};

// Punkt im Rounded-Rect (0,0)-(w,h)?  (nur Ecken-Radius prüfen)
function insideRounded(x, y, w, h, cr) {
  if (x < 0 || y < 0 || x > w || y > h) return false;
  const rx = x < cr ? cr - x : x > w - cr ? x - (w - cr) : 0;
  const ry = y < cr ? cr - y : y > h - cr ? y - (h - cr) : 0;
  return rx * rx + ry * ry <= cr * cr;
}
// Zielposition per Rejection-Sampling in der Kartenform (Fallback = Mitte).
function sampleTarget(w, h, cr) {
  for (let k = 0; k < 8; k++) {
    const x = Math.random() * w, y = Math.random() * h;
    if (insideRounded(x, y, w, h, cr)) return [x, y];
  }
  return [w / 2, h / 2];
}

// Weiche weiße Radial-Textur (Kern + Halo), pro Partikel getönt.
function makeDot() {
  const c = document.createElement("canvas"); c.width = c.height = DOT_TX;
  const cx = c.getContext("2d");
  const g = cx.createRadialGradient(DOT_TX / 2, DOT_TX / 2, 0, DOT_TX / 2, DOT_TX / 2, DOT_TX / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.8)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  cx.fillStyle = g; cx.fillRect(0, 0, DOT_TX, DOT_TX);
  return Texture.from(c);
}

/* Materialize-Instanz für EINE Karte. `root` in den Karten-Container hängen; `start()` beim Reveal/Auflösen,
   `update()` je Frame, `isBuilding()` zum Pausieren der Dauer-Layer, am Ende `destroy()`. */
export function createMaterialize() {
  const T = MATERIALIZE_TUNE;
  const root = new Container();
  const tex = makeDot();
  const pc = new ParticleContainer({ dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false } });
  pc.blendMode = "add";
  root.addChild(pc);

  const MAXP = T.partikel.anzahl;
  const pool = [];
  for (let i = 0; i < MAXP; i++) {
    const p = new Particle({ texture: tex, anchorX: 0.5, anchorY: 0.5, alpha: 0 });
    pc.addParticle(p);
    // u,v = Ziel (normiert 0..1 in der Kartenbox) · su,sv = Start (normiert) · delay/size/spin/tint je Partikel
    pool.push({ p, u: 0, v: 0, su: 0, sv: 0, delay: 0, size: 1, spin: 1, tint: 0x8fe9ff });
  }

  // phase: idle | building | solid | dissolving | gone · dir: +1 Aufbau / −1 Auflösen · build: 0..1
  const st = { phase: "idle", dir: 0, build: 0, dur: T.aufbau.dauer, count: 0 };

  const hidePool = () => { for (let i = 0; i < MAXP; i++) pool[i].p.alpha = 0; };

  // Tönung: Nano-Farbe ↔ Deckfarbe (kartenfarbe), plus Ergebnis-Ton (win = grün-warm, Auflösen/Loss = rot).
  function tintFor(u, p, dir, win) {
    const nano = colNum(T.farbe.nanoFarbe);
    const deck = p.color2 != null ? lerpCol(p.color, p.color2, u) : (p.color != null ? p.color : nano);
    let col = lerpCol(nano, deck, clamp01(T.farbe.kartenfarbe) * 0.7); // nicht ganz auf die (dunkle) Deckfarbe → additiv sichtbar
    if (dir < 0) col = lerpCol(col, 0xe0605a, 0.4);          // Auflösen: rötlicher Ton
    else if (win) col = lerpCol(col, 0xbfffd0, 0.18);         // Sieg: leichter grün-warmer Andock-Ton
    return col;
  }

  // Pool für einen Aufbau bestücken (count Partikel; Rest bleibt versteckt).
  function regen(w, h, sc, p, count, dir, win) {
    const streu = T.start.streuung * sc;
    const cx = w / 2, cy = h / 2;
    const diag = Math.hypot(w, h) || 1;
    for (let i = 0; i < count; i++) {
      const [tx, ty] = sampleTarget(w, h, CARD_CORNER);
      let sx, sy;
      if (T.start.quelle === "zentrum") {
        sx = cx + (Math.random() - 0.5) * streu; sy = cy + (Math.random() - 0.5) * streu;
      } else if (T.start.quelle === "rand") {
        const a = Math.random() * Math.PI * 2;
        sx = tx + Math.cos(a) * (streu + diag * 0.15); sy = ty + Math.sin(a) * (streu + diag * 0.15);
      } else { // "feld" — aus einer gestreuten Wolke rund um das Ziel
        const a = Math.random() * Math.PI * 2, r = streu * (0.6 + Math.random());
        sx = tx + Math.cos(a) * r; sy = ty + Math.sin(a) * r;
      }
      const o = pool[i];
      o.u = tx / w; o.v = ty / h; o.su = sx / w; o.sv = sy / h;
      // Staffelung: kleiner Zufalls-Offset (issue-treu) + distanzabhängig (außen später) → sichtbarer Aufbau-Sweep.
      const dNorm = Math.min(1, Math.hypot(tx - cx, ty - cy) / (diag * 0.5));
      o.delay = Math.random() * T.aufbau.stagger + dNorm * 0.14;
      o.size = Math.max(1.5, T.partikel.groesse * sc * 2.4) * (0.7 + Math.random() * 0.9);
      o.spin = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.8);
      o.tint = tintFor(o.u, p, dir, win);
    }
    for (let i = count; i < MAXP; i++) pool[i].p.alpha = 0;
    st.count = count;
  }

  // Reveal (dir +1) bzw. Auflösen (dir −1) starten. dur in Sekunden (von außen, an den Flip-Takt gekoppelt).
  function start(dir, dur, win, w, h, sc, p) {
    st.dir = dir >= 0 ? 1 : -1;
    st.dur = Math.max(0.05, dur || T.aufbau.dauer);
    st.build = st.dir > 0 ? 0 : 1;
    st.phase = st.dir > 0 ? "building" : "dissolving";
    // Count: Board-Anzahl, unter lite gedeckelt, per Tier reduziert.
    let count = T.partikel.anzahl;
    if (p.lite) count = Math.min(count, LITE_CAP);
    const tierMul = p.tierMul != null ? p.tierMul : 1;
    count = Math.round(count * (0.55 + 0.45 * tierMul));
    count = Math.max(60, Math.min(MAXP, count));
    if (p.reduced) { st.phase = st.dir > 0 ? "solid" : "gone"; hidePool(); return; } // reduced → sofort solide/weg
    regen(w, h, sc, p, count, st.dir, win);
  }

  function update(w, h, sc, p, dtMs) {
    if (st.phase === "idle" || st.phase === "solid" || st.phase === "gone") return;
    if (p.reduced) { hidePool(); st.phase = st.dir > 0 ? "solid" : "gone"; return; }
    st.build = clamp01(st.build + st.dir * (Math.max(0, dtMs) / 1000) / st.dur);

    const stag = T.aufbau.stagger, easing = T.aufbau.easing, wirbel = T.aufbau.wirbel;
    const tierMul = p.tierMul != null ? p.tierMul : 1;
    for (let i = 0; i < st.count; i++) {
      const o = pool[i], P = o.p;
      const local = clamp01((st.build - o.delay) / (1 - stag));
      const e = Math.pow(local, easing);
      const tx = o.u * w, ty = o.v * h, sxp = o.su * w, syp = o.sv * h;
      const dxt = tx - sxp, dyt = ty - syp, len = Math.hypot(dxt, dyt) || 1;
      // Position: lerp(start→ziel, e) + Wirbel (senkrecht, peakt in der Flugmitte).
      const px = -dyt / len, py = dxt / len;
      const sw = wirbel * Math.sin(e * Math.PI) * len * 0.15 * o.spin;
      P.x = sxp + dxt * e + px * sw;
      P.y = syp + dyt * e + py * sw;
      // Alpha: sanft ein, zur Ankunft ausblenden (Partikel „werden" die Karte → sauber 0 bei e=1), + Funkeln-Blitz.
      // settle multipliziert AUCH den Funkeln-Blitz → am Andockpunkt (e=1) fällt alles auf 0 (kein Ein-Frame-Pop).
      const appear = smooth(0, 0.12, e);
      const settle = 1 - smooth(0.85, 1, e);
      const flash = T.farbe.funkeln * arriveBump(e);
      P.alpha = clamp01(settle * (appear + flash) * (0.6 + 0.4 * tierMul));
      const drawPx = o.size * (1 + 0.8 * arriveBump(e));   // Funkeln poppt die Größe
      P.scaleX = P.scaleY = drawPx / DOT_TX;
      P.tint = o.tint;
    }

    if (st.dir > 0 && st.build >= 1) { st.phase = "solid"; hidePool(); }
    if (st.dir < 0 && st.build <= 0) { st.phase = "gone"; hidePool(); }
  }

  const isBuilding = () => st.phase === "building" || st.phase === "dissolving";
  const clear = () => { st.phase = "idle"; st.dir = 0; hidePool(); };
  function destroy() {
    try { root.destroy({ children: true }); } catch { /* ignore */ }
    try { tex.destroy(true); } catch { /* ignore */ }
  }

  return { root, start, update, isBuilding, clear, destroy };
}
