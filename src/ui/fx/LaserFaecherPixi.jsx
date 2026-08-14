import { useEffect, useRef } from "react";
import { Application, Graphics, Sprite, Texture } from "pixi.js";

/* #323 Gottgleich-Prunk „Laser-Fächer" (Selten) — PIXI. Scharfe Neon-Laser fächern aus der Kartenmitte (hinter der
   Karte) auf: abwechselnd lange Haupt- und kurze Nebenstrahlen (Sonnenstrahl-Look), jeder ein Kegel (schmal an der
   Nabe → breit an der Spitze, hell → transparent) mit heller Kernlinie und aufleuchtender Nabe. Öffnen mit Pop-Über-
   Öffnen, DREHEN langsam, faden aus.

   Technik = mobil-sicheres Pixi (wie IonStorm/embersPixi): eigener Application-Overlay; jeder Strahl ist ein additives
   Sprite mit VORGEBACKENER Kegel-Textur (Verlauf hell→transparent), pro Strahl rotiert/skaliert/getönt; Kernlinien +
   Naben-Glow additiv. KEINE Shader. Einmal-Effekt (Ticker stoppt am Ende), loop für die Vorschau. Werte 1:1 aus #323. */

const TUNE = {
  LIFE: 1, RISE: 0.05, FADE: 0.37, POP: 2.15,
  // #tuning: RAY_W von 0.11 → 0.05 (Strahlen waren zu breit) + BEAM 1.4 → 1.0 (weniger overtuned/Blowout im Zentrum).
  SPOKES: 48, SPREAD: 1, RAY_W: 0.05, LEN: 1.6, ALT: 0.55, ORIGIN_Y: 0.59, SIZE_MIN: 0.65,
  SPIN: 0.1, OPEN: 1,
  CORE: 1.7, GLOW: 1, BEAM: 1.0, FLICKER: 0.8,
  BRIGHT: 1, SCAN: 0,
  TAIL: 0.2,
};
const STD_A = "#2ff0ff", STD_B = "#ff2d9b";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const intOf = (c) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);
const wrapPi = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };

function envelope(prog) {
  const rise = clamp(prog / TUNE.RISE, 0, 1);
  const fadeStart = 1 - TUNE.FADE;
  const fade = prog > fadeStart ? clamp((prog - fadeStart) / TUNE.FADE, 0, 1) : 0;
  const alpha = clamp(rise, 0, 1) * (1 - fade);
  const inv = rise - 1;
  const back = 1 + TUNE.POP * inv * inv * inv + TUNE.POP * 0.6 * inv * inv;
  const lenScale = TUNE.SIZE_MIN + (1 - TUNE.SIZE_MIN) * clamp(back, 0, 1.5);
  const ease = 1 - (1 - rise) * (1 - rise);
  const bundle = 1 - TUNE.OPEN * (1 - ease);
  return { alpha, lenScale, bundle };
}

const RTX = 128;
function makeRadial(stops) {
  const c = document.createElement("canvas"); c.width = c.height = RTX; const x = c.getContext("2d");
  const g = x.createRadialGradient(RTX / 2, RTX / 2, 0, RTX / 2, RTX / 2, RTX / 2);
  for (const [o, a] of stops) g.addColorStop(o, `rgba(255,255,255,${a})`);
  x.fillStyle = g; x.fillRect(0, 0, RTX, RTX); return Texture.from(c);
}
// Kegel-Strahl-Textur (weiß, zur Laufzeit getönt): Apex links (Nabe, schmal) → breit rechts (Spitze), hell→transparent.
const BW = 256, BH = 64;
function makeBeamTexture() {
  const c = document.createElement("canvas"); c.width = BW; c.height = BH; const x = c.getContext("2d");
  x.save(); x.beginPath(); x.moveTo(0, BH / 2); x.lineTo(BW, 0); x.lineTo(BW, BH); x.closePath(); x.clip();
  const g = x.createLinearGradient(0, 0, BW, 0);
  g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(0.6, "rgba(255,255,255,0.28)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, BW, BH); x.restore(); return Texture.from(c);
}

export default function LaserFaecherPixi({ panelRef, cardRef = null, trigger = 0,
  deckColor = "#2ff0ff", deckColor2 = null, deckTint = false, reduced = false, lite = false, loop = false, speed = 1,
  onDone = null, onFire = null }) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const nodesRef = useRef(null);   // { beams: Sprite[], cores: Graphics, hub: Sprite }
  const playRef = useRef({ playing: false, bt: 0, rotBase: 0 });
  const startRef = useRef(null);
  const firstRef = useRef(true);
  const st = useRef({ deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone, onFire });
  st.current = { deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone, onFire };

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    let disposed = false;
    const canvas = document.createElement("canvas");
    const app = new Application();
    const beamTex = makeBeamTexture();
    const hubTex = makeRadial([[0, 1], [0.4, 0.55], [1, 0]]);

    function place() {
      const pr = panelRef?.current?.getBoundingClientRect(); if (!pr || pr.width < 2) return null;
      const cr = cardRef?.current?.getBoundingClientRect();
      const cx = cr && cr.width > 2 ? (cr.left - pr.left + cr.width / 2) : pr.width / 2;
      return { W: pr.width, H: pr.height, cx, cy: pr.height * TUNE.ORIGIN_Y, diag: Math.hypot(pr.width, pr.height) };
    }

    function tick(ticker) {
      const pl = playRef.current, nodes = nodesRef.current; if (!pl.playing || !nodes) return;
      pl.bt += (ticker.deltaMS / 1000) * st.current.speed;
      const geo = place(); if (!geo) return;
      const { cx, cy, diag } = geo;
      const s = st.current;
      const prog = clamp(pl.bt / TUNE.LIFE, 0, 1);
      const env = envelope(prog), A = env.alpha * TUNE.BRIGHT;
      const ca = s.deckTint ? rgb(s.deckColor) : rgb(STD_A), cb = s.deckTint ? rgb(s.deckColor2 || s.deckColor) : rgb(STD_B);
      const nSpokes = s.lite ? Math.round(TUNE.SPOKES * 0.42) : TUNE.SPOKES; // #perf: lite ~20 statt 48 große additive Beam-Sprites (Fill-Rate)
      const rot = pl.rotBase + performance.now() / 1000 * TUNE.SPIN * TAU;

      const cores = nodes.cores; cores.clear();
      for (let i = 0; i < nodes.beams.length; i++) {
        const beam = nodes.beams[i];
        if (i >= nSpokes || A <= 0.01) { beam.alpha = 0; continue; }
        const spread = TUNE.SPREAD * env.bundle;
        const ang = rot + wrapPi((i / nSpokes) * TAU) * spread;
        const flick = 1 - TUNE.FLICKER * 0.5 * (0.5 + 0.5 * Math.sin(pl.bt * 22 + i * 1.7));
        const len = diag * TUNE.LEN * env.lenScale * ((i % 2) ? TUNE.ALT : 1) * (0.5 + 0.5 * flick);
        const col = mix(ca, cb, nSpokes > 1 ? i / (nSpokes - 1) : 0);
        beam.position.set(cx, cy); beam.rotation = ang; beam.width = len; beam.height = Math.max(2, len * TUNE.RAY_W * 2);
        beam.tint = intOf(col); beam.alpha = clamp(0.9 * TUNE.BEAM * A * flick, 0, 1);
        // Helle Kernlinie mittig auf dem Strahl (Graphics additiv).
        const tx = cx + Math.cos(ang) * len, ty = cy + Math.sin(ang) * len;
        cores.moveTo(cx, cy); cores.lineTo(tx, ty);
        cores.stroke({ width: Math.max(1, diag * 0.0032), color: intOf(mix(col, [255, 255, 255], 0.7)), alpha: clamp(0.9 * TUNE.GLOW * A * flick, 0, 1), cap: "round" });
      }

      const hub = nodes.hub, hr = diag * 0.12 * (0.7 + 0.3 * env.lenScale);
      hub.position.set(cx, cy); hub.width = hub.height = hr; hub.tint = intOf(mix(ca, cb, 0.5)); hub.alpha = clamp(0.9 * TUNE.CORE * A, 0, 1);

      if (pl.bt > TUNE.LIFE + TUNE.TAIL) {
        if (s.loop) { pl.bt = 0; pl.rotBase = Math.random() * TAU; s.onFire && s.onFire(); }
        else { pl.playing = false; for (const b of nodes.beams) b.alpha = 0; cores.clear(); hub.alpha = 0; stopIdle(); s.onDone && s.onDone(); }
      }
    }

    function stopIdle() { const a = appRef.current; if (!a) return; try { a.renderer.render(a.stage); a.ticker.stop(); } catch { /* ignore */ } }
    function startPlay() { const a = appRef.current, pl = playRef.current; if (!a || disposed) return; pl.playing = true; pl.bt = 0; pl.rotBase = Math.random() * TAU; st.current.onFire && st.current.onFire(); if (document.visibilityState !== "hidden") a.ticker.start(); }
    startRef.current = startPlay;

    // #perf: lite → DPR-Deckel 1.25 + Ticker-Cap 45 fps (wie die anderen Effekte).
    app.init({ canvas, preference: "webgl", backgroundAlpha: 0, antialias: true, autoDensity: true,
      resolution: Math.min(st.current.lite ? 1.25 : 2, window.devicePixelRatio || 1), resizeTo: host, powerPreference: "high-performance" })
      .then(() => {
        if (disposed) { try { app.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } return; }
        appRef.current = app;
        canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block"; host.appendChild(canvas);
        const cores = new Graphics(); cores.blendMode = "add";
        const beams = [];
        for (let i = 0; i < TUNE.SPOKES; i++) { const b = new Sprite(beamTex); b.anchor.set(0, 0.5); b.blendMode = "add"; b.alpha = 0; app.stage.addChild(b); beams.push(b); }
        app.stage.addChild(cores);
        const hub = new Sprite(hubTex); hub.anchor.set(0.5); hub.blendMode = "add"; hub.alpha = 0; app.stage.addChild(hub);
        nodesRef.current = { beams, cores, hub };
        app.ticker.maxFPS = st.current.lite ? 30 : 0; // #perf-mobile: lite 45→30
        app.ticker.add(tick); startPlay();
      }).catch(() => { /* WebGL fehlt → leer */ });

    const onVis = () => { const a = appRef.current; if (a && playRef.current.playing && document.visibilityState !== "hidden") a.ticker.start(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true; document.removeEventListener("visibilitychange", onVis);
      const a = appRef.current; appRef.current = null; nodesRef.current = null;
      for (const t of [beamTex, hubTex]) { try { t.destroy(true); } catch { /* ignore */ } }
      if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
    };
     
  }, [panelRef, cardRef]);

  useEffect(() => { if (firstRef.current) { firstRef.current = false; return; } startRef.current?.(); }, [trigger]);

  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 9 }} />;
}
