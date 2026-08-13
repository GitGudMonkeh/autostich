import { Container, Graphics, Sprite, Text, Texture, Rectangle, RenderTexture } from "pixi.js";

/* Karten-Effekt „Glitch" · Layer 3 aus #318 — Cyberpunk-Digital-Glitch über der ganzen Karte inkl. Zahl.
   Dauerhaft, mit Stotter-Timing (ruhige Grundlast + gelegentliche Bursts).

   Pixi kann die DOM-Karte nicht auslesen und Custom-Shader rendern auf dem Mobile-Setup nicht → das Karten-
   MOTIV (dunkle Basis + hohle Neon-Zahl in Suit-Farbe) wird in Pixi nachgebaut und EINMAL in eine RenderTexture
   gerendert (gecached je Zahl/Farbe/Größe). Der Glitch legt sich additiv über die weiter sichtbare DOM-Karte:
     • Chroma-Split : zwei getönte (ghostA/ghostB), additive Vollkarten-Kopien, horizontal um ±chroma versetzt.
     • Tear-Slices  : additive Sub-Frame-Kopien einzelner Zeilenbänder, horizontal versetzt (regen per tear.rate).
     • Scanlines    : dunkle, scrollende Zeilen (Normal-Blend → dunkelt die Karte), auf die Kartenform geclippt.
     • Bars         : dünne additive Farb-Linien (ghostA/ghostB/Suit), regen per bar.tempo.
   Bewusste Grenze: nur Basis + Zahl sind in der Textur (die glitchen mit) — Karten-MARKER (Ion-Pips, Badges)
   nicht. Das erfüllt „die Zahl glitcht mit" und hält die Textur billig.

   Skalierung: chroma.staerke, tear.amp/hoehe, scan.dichte sind px (Board HREF=360) → mit sc=h/360 skaliert.
   Raten (tear.rate, bar.tempo, burstRate) in /s. [TUNING] Werte 1:1 aus dem Glitch-Board (#318). */

export const GLITCH_TUNE = {
  // [TUNING] Das Board testet auf einer DUNKLEN Synthetik-Karte; die echten Decks (v. a. Feuer) sind hell → der additive
  // Chroma-Split/die Bars bleichten die Karte aus. Darum weniger additiv (chroma.alpha 0.71→0.45, bar 0.61→0.5), ruhigere
  // Grundlast (ruhe 0.35→0.24 → Karte bleibt im Ruhezustand farbig, Glitch flackert in Bursts) und etwas dunklere
  // Scanlines (0.14→0.18, Normal-Blend → wirkt dem Aufhellen entgegen).
  chroma: { staerke: 5.3, alpha: 0.58 },   // Split jetzt v. a. auf der Zahl (lokal) → darf wieder kräftiger sein, bleicht die Fläche nicht mehr
  tear:   { anzahl: 5, amp: 23, hoehe: 23, rate: 3 },
  scan:   { staerke: 0.18, tempo: 0.6, dichte: 6 },
  bar:    { anzahl: 4, staerke: 0.55, tempo: 3.6 },
  timing: { ruhe: 0.24, burstRate: 0.8, burstLen: 0.18, jitter: 0.46 },
  farbe:  { ghostA: "#ff2bd6", ghostB: "#20e5ff" },
};

const CARD_CORNER = 12;
const colNum = (hex, fb = 0xffffff) => {
  const h = String(hex || "").replace("#", "");
  if (!h) return fb;
  const v = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return Number.isFinite(v) ? v : fb;
};
const rnd = () => Math.random();

/* Glitch-Instanz für EINE Karte. `root` in den Karten-Container hängen; pro Frame `update()` (bzw. `clear()`),
   am Ende `destroy()`. Verwaltet RenderTexture-Cache, Sprite-Pool und Stotter-Timing selbst. */
export function createGlitch(app) {
  const T = GLITCH_TUNE;
  const root = new Container();
  const mask = new Graphics();
  const chromaA = new Sprite(); chromaA.blendMode = "add"; chromaA.tint = colNum(T.farbe.ghostA); chromaA.visible = false;
  const chromaB = new Sprite(); chromaB.blendMode = "add"; chromaB.tint = colNum(T.farbe.ghostB); chromaB.visible = false;
  const tears = [];
  for (let i = 0; i < T.tear.anzahl; i++) { const s = new Sprite(); s.blendMode = "add"; s.visible = false; tears.push(s); }
  const scan = new Graphics();                 // Normal-Blend (dunkelt)
  const bars = new Graphics(); bars.blendMode = "add";
  root.addChild(mask, chromaA, chromaB, ...tears, scan, bars);
  root.mask = mask;

  const suitCol = colNum; // Alias
  let rt = null, motifKey = "";
  const cl = { t: -1, level: 0, nextBurst: 0, burstUntil: 0, nextTear: 0, tearSpec: [], nextBar: 0, barSpec: [] };

  function buildTexture(w, h, motif) {
    if (rt) { try { rt.destroy(true); } catch { /* ignore */ } rt = null; }
    rt = RenderTexture.create({ width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)), resolution: app.renderer.resolution, antialias: true });
    const col = suitCol(motif.color, 0x5a8ade);
    const tmp = new Container();
    const base = new Graphics();
    // #ausgeblichen-fix: KEIN opaker Dunkel-Grund mehr. Der volle Karten-Grund wurde von den beiden Chroma-Kopien
    // (Magenta + Cyan, nur ~2 px versetzt) additiv über die GANZE Karte gelegt → Magenta+Cyan summieren Richtung
    // Weiß/Blau = ausgeblichene Fläche. Nur noch ein SEHR fainter Suit-Körper (für zarte Tear-Bänder), die Zahl trägt
    // den Chroma-Split; die flächigen Kartenbereiche bleiben so sauber (kein Vollkarten-Schleier).
    base.roundRect(0, 0, w, h, CARD_CORNER).fill({ color: col, alpha: 0.05 });        // fainter Suit-Körper (statt Dunkel-Grund + 0.10)
    tmp.addChild(base);
    const fs = Math.round(h * 0.27);                                                  // ~2.4rem auf 144px-Karte
    const num = new Text({
      text: String(motif.num != null ? motif.num : ""),
      style: { fontFamily: "Helvetica Neue, Arial, sans-serif", fontSize: fs, fontWeight: "900",
        fill: { color: col, alpha: 0 }, stroke: { color: col, width: Math.max(1.5, 2 * (h / 144)) } }, // hohle Neon-Zahl
    });
    num.anchor.set(0.5); num.position.set(w / 2, h / 2);
    tmp.addChild(num);
    app.renderer.render({ container: tmp, target: rt });
    try { tmp.destroy({ children: true }); } catch { /* ignore */ }
    chromaA.texture = rt; chromaB.texture = rt;
    chromaA.width = chromaB.width = w; chromaA.height = chromaB.height = h;
    // Tear-Sprites: EIN Sub-Frame-Texture je Sprite auf die neue Source binden (Frame wird beim Regen aktualisiert,
    // NICHT pro Frame neu erzeugt → kein Texture-Leak). Alte Textur vorher freigeben (Source bleibt, destroyBase=false).
    cl.sliceH = Math.max(2, T.tear.hoehe * (h / 360));
    for (const s of tears) {
      if (s.texture) { try { s.texture.destroy(false); } catch { /* ignore */ } }
      s.texture = new Texture({ source: rt.source, frame: new Rectangle(0, 0, Math.round(w), Math.round(cl.sliceH)) });
      s.width = w; s.height = cl.sliceH;
    }
  }

  function hideAll() {
    chromaA.visible = chromaB.visible = false;
    for (const s of tears) s.visible = false;
    scan.clear(); bars.clear();
  }

  function clear() { mask.clear(); hideAll(); }

  function update(w, h, sc, p, t, motif) {
    const key = `${motif.num}|${motif.color}|${Math.round(w)}x${Math.round(h)}`;
    if (key !== motifKey || !rt) { buildTexture(w, h, motif); motifKey = key; }
    mask.clear(); mask.roundRect(0, 0, w, h, CARD_CORNER).fill(0xffffff);

    const dt = cl.t < 0 ? 0.016 : Math.min(0.05, Math.max(0, t - cl.t));
    cl.t = t;
    const tierMul = p.tierMul != null ? p.tierMul : 1;

    // ── Stotter-Timing: level glättet gegen (Burst ? 1 : ruhe); Bursts nach burstRate/burstLen ──
    if (p.reduced) { cl.level = T.timing.ruhe; }
    else {
      if (t >= cl.nextBurst) { cl.burstUntil = t + T.timing.burstLen; cl.nextBurst = t + (1 / Math.max(0.01, T.timing.burstRate)) * (0.6 + rnd() * 0.8); }
      const target = t < cl.burstUntil ? 1 : T.timing.ruhe;
      cl.level += (target - cl.level) * Math.min(1, dt * 14);
    }
    const level = cl.level * tierMul;
    const jit = p.reduced ? 1 : 1 + (rnd() - 0.5) * 2 * T.timing.jitter;

    // ── Chroma-Split (zwei getönte, additive Vollkarten-Kopien) ──
    const ox = T.chroma.staerke * sc * level * jit;
    const oy = (rnd() - 0.5) * T.chroma.staerke * sc * level * 0.4;
    chromaA.visible = chromaB.visible = level > 0.02;
    chromaA.position.set(ox, oy); chromaB.position.set(-ox, -oy);
    chromaA.alpha = chromaB.alpha = T.chroma.alpha * level;

    // ── Tear-Slices (Sub-Frame-Kopien einzelner Bänder, horizontal versetzt) ──
    const sliceH = cl.sliceH || Math.max(2, T.tear.hoehe * sc);
    if (!p.reduced && t >= cl.nextTear) {
      cl.nextTear = t + 1 / Math.max(0.01, T.tear.rate);
      cl.tearSpec = tears.map(() => ({ y: rnd() * Math.max(0, h - sliceH), dir: rnd() < 0.5 ? -1 : 1, mag: 0.4 + rnd() * 0.6 }));
      // Frame (Zeilenband) je Sprite NUR beim Regen setzen.
      for (let i = 0; i < tears.length; i++) {
        const tx = tears[i].texture;
        if (tx) { tx.frame.y = Math.min(cl.tearSpec[i].y, Math.max(0, h - sliceH)); tx.frame.height = sliceH; tx.updateUvs(); }
      }
    }
    for (let i = 0; i < tears.length; i++) {
      const spec = cl.tearSpec[i];
      const on = !!spec && level > 0.03 && !!tears[i].texture && !(p.lite && i >= 2); // #perf-mobile: max. 2 Tear-Slices auf lite (statt 5)
      const s = tears[i];
      s.visible = on;
      if (!on) continue;
      s.position.set(spec.dir * T.tear.amp * sc * level * spec.mag, spec.y);
      s.alpha = Math.min(1, 0.85 * level);
    }

    // ── Scanlines (dunkle, scrollende Zeilen; Normal-Blend dunkelt die Karte) ──
    scan.clear();
    if (T.scan.staerke > 0.001 && !p.lite) { // #perf-mobile: Scanlines (h/step rect-Schleife = teuerster Posten) auf lite aus
      const step = Math.max(2, T.scan.dichte * sc);
      const scroll = p.reduced ? 0 : ((t * T.scan.tempo * step) % step + step) % step; // reduced → Standbild (kein Scroll)
      const a = T.scan.staerke * (0.6 + 0.4 * level);
      for (let y = -scroll; y < h; y += step) { scan.rect(0, y, w, Math.max(1, step * 0.5)).fill({ color: 0x000000, alpha: a }); }
    }

    // ── Bars (dünne additive Farb-Linien in ghostA/ghostB/Suit, regen per bar.tempo) ──
    if (!p.reduced && t >= cl.nextBar) {
      cl.nextBar = t + 1 / Math.max(0.01, T.bar.tempo);
      const cols = [colNum(T.farbe.ghostA), colNum(T.farbe.ghostB), suitCol(motif.color, 0xffffff)];
      cl.barSpec = Array.from({ length: p.lite ? 2 : T.bar.anzahl }, () => ({ y: rnd() * h, hgt: 1 + rnd() * 2, col: cols[(rnd() * cols.length) | 0] })); // #perf-mobile: 2 statt 4 Bars auf lite
    }
    bars.clear();
    if (cl.barSpec.length && level > 0.03) {
      for (const b of cl.barSpec) bars.rect(0, b.y, w, b.hgt * sc + 1).fill({ color: b.col, alpha: Math.min(1, T.bar.staerke * level) });
    }
  }

  function destroy() {
    for (const s of tears) { if (s.texture) { try { s.texture.destroy(false); } catch { /* ignore */ } } }
    try { root.destroy({ children: true }); } catch { /* ignore */ }
    if (rt) { try { rt.destroy(true); } catch { /* ignore */ } rt = null; }
  }

  return { root, update, clear, destroy };
}
