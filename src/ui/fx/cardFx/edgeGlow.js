/* Karten-Effekt „Kantenglühen" (Edge-Glow) · Layer 2 aus #318 — reiner RAHMEN-Effekt, dauerhaft an, OHNE
   jede Stich-/Event-Abhängigkeit (bewusst `stich.peak:0`, kein `erupt`). Additiv gestapelte Rounded-Rect-
   Strokes um die Kartenkante (KEIN Blur): mehrere Lagen mit steigender Breite und fallender Alpha bilden den
   weichen Halo; dazu eine weiß-heiße Kern-Linie direkt auf der Kante. Der Deck-Verlauf färbt den Rand diagonal
   color→color2. „Atmen" moduliert die Helligkeit langsam.

   Wird in eine ADDITIVE Pixi-`Graphics` der geteilten CardFxStage gezeichnet, die zuvor auf die Kartenbox
   positioniert wurde (lokale Koordinaten 0..w / 0..h in CSS-px). Der Verlauf wird als wenige farbige Teil-
   Polylinien (Chunks) gezeichnet statt pro Segment — additiv verschmelzen die Nähte, spart aber viele Draws.

   Skalierung: Die *px-Maße im TUNE stammen aus dem Sign-off-Board (Kartenhöhe HREF=360). In der Engine werden
   sie mit `sc = H/360` skaliert (H = echte Kartenhöhe, in-game 144 → sc≈0.4). Der Eck-Radius ist ECHTE
   Kartengeometrie (rounded-xl = 12 CSS-px) und wird NICHT mit sc skaliert.

   [TUNING] Alle Werte 1:1 aus dem Edge-Glow-Board (#318) übernommen. */

// ── TUNE (Board-Raum HREF=360; mit *sc markierte Maße skaliert die Engine) ──
export const EDGE_TUNE = {
  rand:  { breite: 0.5, staerke: 0, kern: 0.28, inset: 0 },     // rand.breite *sc (Kern-Linien-Breite); staerke:0 → crispe Kante AUS; kern → Alpha der weiß-heißen Kern-Linie (etwas heller)
  halo:  { breite: 15, staerke: 0.68, lagen: 5, falloff: 1.5 }, // halo.breite *sc; alpha_i = staerke · I / (i+1)^falloff — [TUNING] kräftiger (breiter + heller) auf Wunsch
  atem:  { amp: 0.35, freq: 0.45, basis: 0.52 },                // I = max(basis, 1 − amp·(1 − (0.5+0.5·sin(2π·freq·t)))) — höherer Boden → dauerhaft heller
  stich: { peak: 0, attack: 0.08, dauer: 0.85, welle: 18 },     // INAKTIV — kein Stich-Puls (peak:0), bewusst verworfen
  farbe: { deckMix: 0, gradient: true },                        // gradient → Rand diagonal color→color2
};

const CARD_CORNER = 12;   // rounded-xl der Karte (echte Geometrie in CSS-px, NICHT sc-skaliert)
const GRAD_CHUNKS = 8;    // Farb-Stufen des diagonalen Verlaufs (Chunks statt Pro-Segment → additive Nähte, wenige Draws)

// 24-bit-Farb-Interpolation (a→b, t∈0..1).
const lerpCol = (a, b, t) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return ((Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t));
};

// Rounded-Rect-Perimeter (0,0)-(w,h) mit Eck-Radius cr in N Stützpunkte (im Uhrzeigersinn, offen — Schließen macht der Aufrufer).
function buildPerim(w, h, cr, N) {
  cr = Math.max(0, Math.min(cr, w / 2, h / 2));
  const HP = Math.PI / 2;
  const segs = [
    { t: "l", x0: cr, y0: 0, x1: w - cr, y1: 0 },
    { t: "a", cx: w - cr, cy: cr, a0: -HP, a1: 0 },
    { t: "l", x0: w, y0: cr, x1: w, y1: h - cr },
    { t: "a", cx: w - cr, cy: h - cr, a0: 0, a1: HP },
    { t: "l", x0: w - cr, y0: h, x1: cr, y1: h },
    { t: "a", cx: cr, cy: h - cr, a0: HP, a1: Math.PI },
    { t: "l", x0: 0, y0: h - cr, x1: 0, y1: cr },
    { t: "a", cx: cr, cy: cr, a0: Math.PI, a1: Math.PI * 1.5 },
  ];
  const lenOf = (g) => (g.t === "l" ? Math.hypot(g.x1 - g.x0, g.y1 - g.y0) : Math.abs(g.a1 - g.a0) * cr);
  const lens = segs.map(lenOf);
  const total = lens.reduce((s, v) => s + v, 0) || 1;
  const pts = [];
  for (let i = 0; i < N; i++) {
    let d = (i / N) * total, k = 0;
    while (k < segs.length - 1 && d > lens[k]) { d -= lens[k]; k++; }
    const g = segs[k], u = lens[k] ? d / lens[k] : 0;
    if (g.t === "l") pts.push({ x: g.x0 + (g.x1 - g.x0) * u, y: g.y0 + (g.y1 - g.y0) * u });
    else { const a = g.a0 + (g.a1 - g.a0) * u; pts.push({ x: g.cx + Math.cos(a) * cr, y: g.cy + Math.sin(a) * cr }); }
  }
  return pts;
}

// Geschlossene Perimeter-Polylinie in EINER Farbe additiv strichen (Kern-Linie / kein Verlauf).
function strokePerimSolid(g, pts, width, alpha, color) {
  const N = pts.length;
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < N; i++) g.lineTo(pts[i].x, pts[i].y);
  g.lineTo(pts[0].x, pts[0].y);
  g.stroke({ width, color, alpha, cap: "round", join: "round" });
}

// Perimeter als GRAD_CHUNKS farbige Teil-Polylinien (diagonaler Verlauf c1→c2 über (x+y)/(w+h)); je Chunk ein Stroke.
function strokePerimGradient(g, pts, width, alpha, c1, c2, span) {
  const N = pts.length, per = Math.ceil(N / GRAD_CHUNKS);
  for (let c = 0; c < GRAD_CHUNKS; c++) {
    const a0 = c * per, a1 = Math.min(N, (c + 1) * per);
    if (a1 - a0 < 1) continue;
    const mid = pts[Math.min(N - 1, (a0 + a1) >> 1)];
    const uu = Math.min(1, Math.max(0, (mid.x + mid.y) / span));
    g.moveTo(pts[a0].x, pts[a0].y);
    for (let i = a0 + 1; i <= a1; i++) { const q = pts[i % N]; g.lineTo(q.x, q.y); } // +1 überlappt → deckt die Naht
    g.stroke({ width, color: lerpCol(c1, c2, uu), alpha, cap: "round", join: "round" });
  }
}

/* Edge-Glow für EINE Karte in die (bereits positionierte, additive) Graphics `g` zeichnen.
   w,h = Kartenbox in CSS-px · sc = h/360 · t = Zeit in Sekunden.
   p = { color, color2, tierMul, reduced, lite } (Farben als 0xRRGGBB-Ints; color2 optional). */
export function drawEdgeGlow(g, w, h, sc, p, t) {
  const T = EDGE_TUNE;
  const tierMul = p.tierMul != null ? p.tierMul : 1;
  // Atmen: langsame Helligkeits-Modulation. reduced → Standbild auf mittlerer Helligkeit (kein Flackern).
  const osc = 0.5 + 0.5 * Math.sin(2 * Math.PI * T.atem.freq * t);
  const I = p.reduced
    ? Math.max(T.atem.basis, 1 - T.atem.amp * 0.5)
    : Math.max(T.atem.basis, 1 - T.atem.amp * tierMul * (1 - osc));
  const N = p.lite ? 40 : 56;
  const pts = buildPerim(w, h, CARD_CORNER, N);
  const gradient = T.farbe.gradient && p.color2 != null;
  const c1 = p.color, c2 = gradient ? p.color2 : p.color;
  const span = (w + h) || 1;
  const lagen = p.lite ? Math.max(3, T.halo.lagen - 2) : T.halo.lagen;
  // Halo: breiteste/dunkelste Lage zuerst → additiv nach innen aufhellen (weicher Falloff ohne Blur).
  for (let i = lagen - 1; i >= 0; i--) {
    const width = (T.halo.breite * sc * (i + 1)) / lagen;
    const alpha = Math.min(1, (T.halo.staerke * I * tierMul) / Math.pow(i + 1, T.halo.falloff));
    if (alpha < 0.004 || width < 0.05) continue;
    if (gradient) strokePerimGradient(g, pts, width, alpha, c1, c2, span);
    else strokePerimSolid(g, pts, width, alpha, c1);
  }
  // Optionale crispe Rand-Kante (rand.staerke) — im Sign-off AUS (0). Bei Bedarf hier wieder andocken.
  // Weiß-heiße Kern-Linie direkt auf der Kante (rand.kern).
  if (T.rand.kern > 0) {
    strokePerimSolid(g, pts, Math.max(0.75, T.rand.breite * sc), Math.min(1, T.rand.kern * I), 0xffffff);
  }
}
