import { ParticleContainer, Particle, Texture } from "pixi.js";

/* Glutfunken als GPU-Partikel (Pixi-Umbau, Phase 2) — der ERSTE Effekt, der von DOM auf Pixi umzieht.
   Vorher: FieldFxLayer effect="embers" rendert die Per-Stich-Fontänen als bis zu 72 DOM-Nodes/Stich (der teure
   Schwarm), dazu ein ruhiges Ambiente. Hier reproduzieren wir dieselbe Optik/Bewegung 1:1 auf einem einzigen
   ParticleContainer — ein Draw-Call statt Dutzender DOM-Knoten pro Stich.

   Bewusst DUPLIZIERTE Helfer (fjitter/emberStufe/emberFountainXs): identische Zahlen wie in Battlefield.jsx, damit
   der Look exakt matcht — aber ohne die Render-Schicht-Helfer zu importieren, sonst wanderte dieses Modul (bzw. sein
   Import-Graph) evtl. in den Prod-Bundle. Es lebt NUR im lazy Pixi-Chunk und wird auf main nie geladen. */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fjitter = (seed, amp) => { const s = Math.sin(seed * 127.1 + 311.7) * 43758.5; return +(((s - Math.floor(s)) * 2 - 1) * amp).toFixed(1); };
const EMBER_FOUNTAINS_N = 3, EMBER_MAX_SCORE = 500000, EMBER_MAX_STUFE = 3;
const emberStufe = (score) => clamp(Math.floor(clamp((score || 0) / EMBER_MAX_SCORE, 0, 1) * (EMBER_MAX_STUFE + 1)), 0, EMBER_MAX_STUFE);
function emberFountainXs(seed) {
  const xs = [];
  for (let f = 0; f < EMBER_FOUNTAINS_N; f++) xs.push(clamp(8 + Math.abs(fjitter(seed + f * 53, 84)), 6, 94));
  return xs;
}

const TX = 64;                          // Textur-Kantenlänge (weicher Glut-Punkt)
const DOT_MAX = EMBER_FOUNTAINS_N * 10; // Ambiente: max 10 Funken/Fontäne (Stufe 3)
const JET_MAX = 300;                    // Ring-Puffer: 3 überlappende Snapshots × bis 72 Jets passen locker rein
const easeOut = (p) => 1 - Math.pow(1 - p, 1.7); // ≈ CSS ease-out (schnell → langsam)

function hexToInt(hex) {
  const h = (hex || "#ffffff").replace("#", "");
  const full = h.length === 3 ? h.replace(/(.)/g, "$1$1") : h;
  const n = parseInt(full, 16);
  return Number.isFinite(n) ? n : 0xffffff;
}

// Weicher Glut-Punkt: kompakter heller Kern (≈ solide DOM-Kugel) + weicher Rand (≈ boxShadow-Glow). Einmal gebaut,
// per Partikel getönt (weiß / Deckfarbe). Ein gemeinsames Texture → alle Partikel batchen im selben Draw-Call.
function makeGlowTexture() {
  const cvs = document.createElement("canvas");
  cvs.width = cvs.height = TX;
  const ctx = cvs.getContext("2d");
  const g = ctx.createRadialGradient(TX / 2, TX / 2, 0, TX / 2, TX / 2, TX / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.28, "rgba(255,255,255,1)");
  g.addColorStop(0.55, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TX, TX);
  return Texture.from(cvs);
}

/* Baut den Glutfunken-Emitter auf `app.stage`, hängt sich in den Ticker und liefert einen kleinen Controller.
   PixiStage besitzt den Lebenszyklus (Init/Destroy, Ticker-Start/Stop bei aktiv+sichtbar) und ruft:
     setParams({ effect, color, score, reduced, lite })  — laufende Parameter (Deckfarbe/Score/Modus)
     erupt({ sweepId, sweepDur, win, score })            — eine Per-Stich-Eruption auslösen
     destroy()                                            — alles freigeben */
export function createEmberField(app) {
  const tex = makeGlowTexture();
  const pc = new ParticleContainer({
    // dynamisch je Frame: Position (x/y), Vertex (Scale/Schrumpfen), Color (Tint + Alpha). Rotation/UVs statisch.
    dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false },
  });
  app.stage.addChild(pc);

  // Fester Partikel-Pool — kein add/remove je Frame (das wäre ein struktureller Container-Update). Tote Partikel
  // bekommen einfach alpha 0. ~330 Partikel sind für die GPU nichts; die dynamischen Buffer laden ohnehin jeden Frame.
  const pool = [];
  for (let i = 0; i < DOT_MAX + JET_MAX; i++) {
    const p = new Particle({ texture: tex, anchorX: 0.5, anchorY: 0.5, alpha: 0, tint: 0xffffff });
    pool.push(p);
    pc.addParticle(p);
  }
  const dotP = pool.slice(0, DOT_MAX);
  const jetP = pool.slice(DOT_MAX);

  let params = { effect: null, colorInt: 0xffffff, score: 0, reduced: false, lite: false };
  let clock = 0;

  // Ambiente-Deskriptoren (wie emberFountainDots): Positionen STABIL, Anzahl mit der Stufe wachsend. Neu bei Score-Wechsel.
  let dots = [];
  function rebuildDots() {
    const per = 4 + emberStufe(params.score) * 2; // 4..10 je Fontäne
    const xs = emberFountainXs(7);
    const out = [];
    for (let f = 0; f < xs.length && out.length < DOT_MAX; f++) {
      for (let s = 0; s < per && out.length < DOT_MAX; s++) {
        const seed = f * 97 + s * 31;
        out.push({
          l: clamp(xs[f] + fjitter(seed, 3.4), 3, 97),
          size: 1.3 + Math.abs(fjitter(seed + 5, 1.5)),
          rise: 150 + s * 20, rdx: 5 + fjitter(seed + 9, 12),
          t: 8 + Math.abs(fjitter(seed + 3, 4)), d: (s / per) * 8 + Math.abs(fjitter(seed + 7, 1.5)),
        });
      }
    }
    dots = out;
  }
  rebuildDots();

  // Jet-Ring — jetP[i] wird von jets[i] gesteuert (1:1); neue Eruptionen überschreiben ab jetHead fortlaufend.
  const jets = new Array(JET_MAX).fill(null);
  let jetHead = 0;

  function reset() { for (const p of pool) p.alpha = 0; }

  function setParams(next) {
    const scoreChanged = next.score !== undefined && next.score !== params.score;
    params = {
      ...params, ...next,
      colorInt: next.color != null ? hexToInt(next.color) : params.colorInt,
    };
    if (scoreChanged) rebuildDots();
    if (params.effect !== "embers") reset();
  }

  // Per-Stich-Eruption („Vulkan"): dieselben Zahlen wie emberFountainJets — Fontänen an zufälligen Positionen (aus
  // sweepId), Partikelzahl/Fontäne = 3·2^Stufe·turbo. Jets nur in „voll" (in „ausgewogen"/„minimal" wie im DOM aus).
  function erupt({ sweepId, sweepDur, win, score }) {
    if (params.effect !== "embers" || params.lite || params.reduced || !(sweepId > 0)) return;
    const turbo = clamp((sweepDur || 900) / 875, 0.45, 1);
    const per = Math.max(2, Math.round(3 * Math.pow(2, emberStufe(score)) * turbo)); // 3/6/12/24 je Fontäne
    const jetDur = Math.max(560, Math.round((sweepDur || 900) * 0.9));
    const xs = emberFountainXs(sweepId * 7 + 1);
    for (let f = 0; f < xs.length; f++) {
      for (let s = 0; s < per; s++) {
        const seed = sweepId * 131 + f * 61 + s * 19;
        const jy = 118 + Math.abs(fjitter(seed + 3, 64));
        jets[jetHead] = {
          t: 0, dur: jetDur, delay: Math.abs(fjitter(seed + 5, 150)),
          l: clamp(xs[f] + fjitter(seed, 5), 3, 97), dx: fjitter(seed + 9, 16),
          sy: jy * (win ? 1.15 : 1), white: s % 3 === 0, base: win ? 3.2 : 2.6,
        };
        jetHead = (jetHead + 1) % JET_MAX;
      }
    }
  }

  function update(ticker) {
    const dtMS = ticker.deltaMS;
    clock += dtMS;
    if (params.effect !== "embers") return;
    const W = app.screen.width, H = app.screen.height, cInt = params.colorInt;

    // Ambiente-Punkte — Endlos-Loop (CSS as-field-rise). In „minimal" statisch (mid-panel, bottom = 12 + rise/8 %),
    // sonst am unteren Rand: bottom:-4% + winziger Rise (translateY ist %-Anteil der Elementhöhe) → wie im DOM meist
    // knapp unter der Kante (geclippt), das Feld bleibt ruhig.
    for (let i = 0; i < dotP.length; i++) {
      const p = dotP[i], d = dots[i];
      if (!d) { p.alpha = 0; continue; }
      p.scaleX = p.scaleY = (d.size * 6) / TX; // Kern + weicher Glow (≈ boxShadow size*2.5)
      p.tint = cInt;
      if (params.reduced) {
        p.x = (d.l / 100) * W;
        p.y = H - ((12 + d.rise / 8) / 100) * H;
        p.alpha = 0.7 * 0.65;
        continue;
      }
      const local = (clock / 1000) - d.d;
      if (local < 0) { p.alpha = 0; continue; }
      const prog = (local % d.t) / d.t;
      p.x = (d.l / 100) * W + d.rdx * prog;
      p.y = (H + 0.04 * H) - d.size * (d.rise / 100) * prog; // bottom:-4% → translateY(-rise% der Elementhöhe)
      // opacity-Keyframe 0 → .8(@12%) → .55(@80%) → 0, mal Style-Opacity 0.7
      let kf;
      if (prog < 0.12) kf = (prog / 0.12) * 0.8;
      else if (prog < 0.8) kf = 0.8 - ((prog - 0.12) / 0.68) * 0.25;
      else kf = 0.55 * (1 - (prog - 0.8) / 0.2);
      p.alpha = 0.7 * Math.max(0, kf);
    }

    // Per-Stich-Jets — translate(dx, -sy)·ease-out, scale 1 → 0.35, opacity 1 → 0. Überlappen sich natürlich, weil
    // ältere Jets noch laufen, wenn ein neuer Stich feuert (ersetzt die 3-Snapshot-Buchhaltung des DOM).
    for (let i = 0; i < jetP.length; i++) {
      const p = jetP[i], j = jets[i];
      if (!j) { p.alpha = 0; continue; }
      j.t += dtMS;
      const tt = j.t - j.delay;
      if (tt < 0) { p.alpha = 0; continue; }
      const prog = tt / j.dur;
      if (prog >= 1) { jets[i] = null; p.alpha = 0; continue; }
      const e = easeOut(prog);
      p.x = (j.l / 100) * W + j.dx * e;
      p.y = H - j.sy * e;
      p.scaleX = p.scaleY = ((j.base + 12) / TX) * (1 - 0.65 * prog); // Kern + ~6px Glow, schrumpfend
      p.tint = j.white ? 0xffffff : cInt;
      p.alpha = prog < 0.12 ? 1 : Math.max(0, (1 - prog) / 0.88);
    }
  }

  app.ticker.add(update);

  return {
    setParams,
    erupt,
    destroy() {
      try { app.ticker.remove(update); } catch { /* ignore */ }
      try { pc.destroy({ children: true }); } catch { /* ignore */ }
      try { tex.destroy(true); } catch { /* ignore */ }
    },
  };
}
