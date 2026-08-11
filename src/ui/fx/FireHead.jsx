import { useEffect, useRef } from "react";
import { Application, ParticleContainer, Particle, Sprite, Texture, Container } from "pixi.js";

/* Archetyp-Karteneffekt „Feuer" — Brennender Kartenkopf (docs/archetyp-karteneffekte.md §5.2, Redesign).
   Der KOPF der eigenen Karte brennt: eine verankerte, realistische Flammenlinie lodert oben ÜBER dem Rahmen
   nach oben; dezentes warmes Kanten-Glühen leuchtet auf die Karte; optional Rauch. Die HITZE (0..1) blendet
   zwischen vier abgestimmten Phasen (20/50/80/100 %) über — unter 20 % aus 0 eingeblendet. Kein Scorch.

   Eigener Pixi-`Application`-Layer ÜBER den Karten (z > 10) → koexistiert mit Blitz/Eis/Pflanze. Positioniert auf
   die eigene Kartenbox (cardRef) relativ zu panelRef. Ticker läuft nur bei Hitze > 0 & sichtbarem Tab; DPR ≤ 2. */

// ── Abgesegnete Phasen (Feuer-Phasen-Tuning-Board) — Hitze-% → Look, dazwischen linear interpoliert ──
const FIRE_PHASES = {
  20:  { COLOR:"#ff3d14", CORE:"#ffd9b0", EMBER:"#ff6a1e", FLAME_RATE:260, FLAME_RISE:98,  FLAME_H:0.55, FLAME_SPREAD:0.9,  FLAME_SWAY:0, FLAME_SIZE:5.5, FLAME_LIFE:980,  FLAME_LEAN:0.06, GLOW_DOWN:0.17, GLOW_ALPHA:0.29, SMOKE:0.08 },
  50:  { COLOR:"#ff3d14", CORE:"#ffd9b0", EMBER:"#ff6a1e", FLAME_RATE:240, FLAME_RISE:88,  FLAME_H:0.65, FLAME_SPREAD:0.9,  FLAME_SWAY:6, FLAME_SIZE:10,  FLAME_LIFE:860,  FLAME_LEAN:0.22, GLOW_DOWN:0.26, GLOW_ALPHA:0.6,  SMOKE:0.2  },
  80:  { COLOR:"#ff3d14", CORE:"#ffd9b0", EMBER:"#ff6a1e", FLAME_RATE:242, FLAME_RISE:134, FLAME_H:1.15, FLAME_SPREAD:0.9,  FLAME_SWAY:6, FLAME_SIZE:12.5,FLAME_LIFE:840,  FLAME_LEAN:0.22, GLOW_DOWN:0.34, GLOW_ALPHA:0.7,  SMOKE:0.32 },
  100: { COLOR:"#ff3d14", CORE:"#ffd9b0", EMBER:"#ff6a1e", FLAME_RATE:238, FLAME_RISE:132, FLAME_H:1.5,  FLAME_SPREAD:0.84, FLAME_SWAY:6, FLAME_SIZE:13,  FLAME_LIFE:1500, FLAME_LEAN:0.22, GLOW_DOWN:0.39, GLOW_ALPHA:0.76, SMOKE:0.4  },
};

const TX = 64, MAX = 700, BASE_N = 28, SMOKE_N = 48;
const NUMKEYS = ["FLAME_RATE","FLAME_RISE","FLAME_H","FLAME_SPREAD","FLAME_SWAY","FLAME_SIZE","FLAME_LIFE","FLAME_LEAN","GLOW_DOWN","GLOW_ALPHA","SMOKE"];

const hexRGB = (h) => { const s = String(h || "#ff3d14").replace("#", ""); const f = s.length === 3 ? s.replace(/(.)/g, "$1$1") : s; const n = parseInt(f, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lerp = (a, b, t) => a + (b - a) * t;
const lerpRGB = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgbInt = (c) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);

// Phasen mit vorberechneten RGB-Farben.
const PH = {};
for (const k of [20, 50, 80, 100]) { const p = FIRE_PHASES[k]; PH[k] = { ...p, cCOLOR: hexRGB(p.COLOR), cCORE: hexRGB(p.CORE), cEMBER: hexRGB(p.EMBER) }; }
const zeroPhase = () => ({ ...PH[20], FLAME_RATE: 0, GLOW_ALPHA: 0, SMOKE: 0 });

// Interpolierte Parameter bei Hitze h (0..1).
function paramsAt(h) {
  h = Math.max(0, Math.min(1, h));
  const KF = [{ h: 0, p: zeroPhase() }, { h: 0.2, p: PH[20] }, { h: 0.5, p: PH[50] }, { h: 0.8, p: PH[80] }, { h: 1, p: PH[100] }];
  let i = 0; while (i < KF.length - 2 && h > KF[i + 1].h) i++;
  const A = KF[i], B = KF[i + 1], t = (B.h - A.h) > 0 ? Math.max(0, Math.min(1, (h - A.h) / (B.h - A.h))) : 0;
  const out = {};
  for (const key of NUMKEYS) out[key] = lerp(A.p[key], B.p[key], t);
  out.cCOLOR = lerpRGB(A.p.cCOLOR, B.p.cCOLOR, t);
  out.cCORE = lerpRGB(A.p.cCORE, B.p.cCORE, t);
  out.cEMBER = lerpRGB(A.p.cEMBER, B.p.cEMBER, t);
  return out;
}

// Weiche weiße Radial-Textur (Kern + Halo) — pro Sprite/Partikel getönt.
function makeRadial(stops) {
  const c = document.createElement("canvas"); c.width = c.height = TX;
  const cx = c.getContext("2d");
  const g = cx.createRadialGradient(TX / 2, TX / 2, 0, TX / 2, TX / 2, TX / 2);
  for (const [o, a] of stops) g.addColorStop(o, `rgba(255,255,255,${a})`);
  cx.fillStyle = g; cx.fillRect(0, 0, TX, TX);
  return Texture.from(c);
}
// Vertikaler Verlauf (oben deckend → unten transparent) für das Kanten-Glühen.
function makeVGrad() {
  const c = document.createElement("canvas"); c.width = 8; c.height = 64;
  const cx = c.getContext("2d");
  const g = cx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(0.5, "rgba(255,255,255,0.32)"); g.addColorStop(1, "rgba(255,255,255,0)");
  cx.fillStyle = g; cx.fillRect(0, 0, 8, 64);
  return Texture.from(c);
}

export function FireHead({ heat = 0, panelRef, cardRef }) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const applyRunRef = useRef(null);
  const stateRef = useRef({ heat });
  stateRef.current = { heat };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let disposed = false;
    const canvas = document.createElement("canvas");
    const app = new Application();

    let flameTex, glowTex, gradTex, glow, baseC, flamePC, smokeC;
    const flames = [];       // { p, x0, y0, born, life, spd, sz, sway, lean, seed, alive }
    const smoke = [];        // { s, x0, y0, born, life, spd, sz, drift, seed, alive }
    const baseSpr = [];      // Sprites der Brennlinie
    let fHead = 0, sHead = 0, acc = 0, sAcc = 0, clock = 0;

    const grabFlame = () => { const s = flames[fHead]; fHead = (fHead + 1) % MAX; s.alive = true; return s; };
    const grabSmoke = () => { const s = smoke[sHead]; sHead = (sHead + 1) % SMOKE_N; s.alive = true; return s; };

    const hideAll = () => {
      if (glow) glow.alpha = 0;
      for (const s of baseSpr) s.alpha = 0;
      for (const f of flames) if (f && f.alive) { f.alive = false; f.p.alpha = 0; }
      for (const sm of smoke) if (sm && sm.alive) { sm.alive = false; sm.s.alpha = 0; }
    };

    const update = (ticker) => {
      const H = Math.max(0, Math.min(1, stateRef.current.heat || 0));
      const card = cardRef?.current, panel = panelRef?.current;
      if (H <= 0.0005 || !card || !panel || !card.isConnected) { hideAll(); return; }
      const cr = card.getBoundingClientRect(), pr = panel.getBoundingClientRect();
      const CW = cr.width, CH = cr.height;
      if (CW < 8 || CH < 8) { hideAll(); return; }
      const ox = cr.left - pr.left, oy = cr.top - pr.top;
      // Karte abgeworfen/weggeflogen → Box außerhalb des Panels → Feuer nicht hängen lassen.
      const ccx = ox + CW / 2, ccy = oy + CH / 2;
      if (ccx < -CW || ccx > pr.width + CW || ccy < -CH || ccy > pr.height + CH) { hideAll(); return; }

      const dt = ticker.deltaMS, C = paramsAt(H);
      const colInt = rgbInt(C.cCOLOR), coreInt = rgbInt(C.cCORE), embInt = rgbInt(C.cEMBER);
      const cx = ox + CW / 2, margin = (1 - C.FLAME_SPREAD) * CW / 2, width = CW - 2 * margin;
      clock += dt;

      // ── Kanten-Glühen (nach unten auf die Karte) ──
      const gd = C.GLOW_DOWN * CH;
      glow.x = ox + CW / 2; glow.y = oy; glow.width = CW; glow.height = gd;
      glow.tint = rgbInt(lerpRGB(C.cEMBER, C.cCORE, 0.4)); glow.alpha = Math.min(1, 0.66 * C.GLOW_ALPHA);

      // ── Brennlinie am oberen Rand (verankert das Feuer) ──
      const baseF = Math.min(1.2, C.FLAME_RATE / 210), bucket = Math.floor(clock / 60);
      const baseTint = rgbInt(lerpRGB(C.cEMBER, C.cCORE, 0.55));
      for (let i = 0; i < BASE_N; i++) {
        const s = baseSpr[i];
        if (baseF <= 0.02) { s.alpha = 0; continue; }
        const x = ox + margin + (i / (BASE_N - 1)) * width;
        const flick = 0.55 + 0.45 * frnd(i, bucket);
        const r = 9 * flick * baseF * (C.FLAME_SIZE / 8.5);
        s.x = x; s.y = oy - r * 0.25; s.width = s.height = r * 3.0;
        s.tint = baseTint; s.alpha = Math.min(1, 0.24 * baseF * flick);
      }

      // ── Flammen spawnen + updaten (nach oben lodernd, über dem Rahmen) ──
      acc += C.FLAME_RATE * (dt / 1000);
      while (acc >= 1) {
        acc -= 1; const s = grabFlame();
        s.x0 = ox + margin + Math.random() * width; s.y0 = oy + 3; s.born = clock;
        s.life = Math.max(120, C.FLAME_LIFE * (0.6 + 0.7 * Math.random()));
        s.spd = C.FLAME_RISE * (0.7 + 0.6 * Math.random()) * C.FLAME_H;
        s.sz = C.FLAME_SIZE * (0.55 + 0.7 * Math.random()); s.sway = C.FLAME_SWAY; s.lean = C.FLAME_LEAN; s.seed = Math.random() * 6.283;
      }
      for (let i = 0; i < MAX; i++) {
        const s = flames[i]; if (!s.alive) continue;
        const age = clock - s.born;
        if (age >= s.life) { s.alive = false; s.p.alpha = 0; continue; }
        const k = 1 - age / s.life, rise = s.spd * (age / 1000);
        const sway = Math.sin(age * 0.008 + s.seed) * s.sway * (0.4 + 0.9 * (1 - k));
        const lean = (cx - s.x0) / CW * s.lean * rise;
        const gsz = s.sz * (0.35 + 0.85 * k), tHot = Math.max(0, Math.min(1, (k - 0.32) / 0.5));
        const p = s.p;
        p.x = s.x0 + sway + lean; p.y = s.y0 - rise;
        const foot = gsz * 2.2; p.scaleX = foot / TX; p.scaleY = (foot / TX) * 1.85;
        // #feuer-fix: dunkler getönt (Kern-Weiß nur gedämpft) + Alpha gesenkt → additiv nicht zu Weiß aufblähen (matcht Artifact).
        p.tint = rgbInt(lerpRGB(C.cCOLOR, C.cCORE, tHot * 0.7)); p.alpha = k * k * 0.5;
      }

      // ── Rauch (über den Flammen) ──
      if (C.SMOKE > 0.01) {
        sAcc += 11 * C.SMOKE * (dt / 1000);
        while (sAcc >= 1) {
          sAcc -= 1; const s = grabSmoke();
          s.x0 = ox + CW * (0.2 + 0.6 * Math.random()); s.y0 = oy - 6; s.born = clock;
          s.life = 1400 * (0.7 + 0.6 * Math.random()); s.spd = 40 + Math.random() * 30; s.sz = 10 + Math.random() * 14;
          s.drift = (Math.random() - 0.5) * 20; s.seed = Math.random() * 6.28;
        }
      }
      for (let i = 0; i < SMOKE_N; i++) {
        const s = smoke[i]; if (!s.alive) continue;
        const age = clock - s.born;
        if (age >= s.life) { s.alive = false; s.s.alpha = 0; continue; }
        const k = age / s.life;
        const sp = s.s;
        sp.x = s.x0 + Math.sin(age * 0.002 + s.seed) * 10 + s.drift * (age / 1000);
        sp.y = s.y0 - s.spd * (age / 1000);
        const r = s.sz * (0.7 + 1.6 * k); sp.width = sp.height = r * 2;
        sp.alpha = Math.sin(Math.PI * k) * 0.22 * C.SMOKE;
      }
    };

    app.init({
      canvas, preference: "webgl", backgroundAlpha: 0, antialias: true, autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1), resizeTo: host, powerPreference: "high-performance",
    }).then(() => {
      if (disposed) { try { app.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } return; }
      appRef.current = app;
      canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block";
      host.appendChild(canvas);

      flameTex = makeRadial([[0, 0.7], [0.2, 0.36], [0.55, 0.11], [1, 0]]);   // weich → additiv kein Weiß-Blowout
      glowTex = makeRadial([[0, 0.9], [0.5, 0.28], [1, 0]]);
      gradTex = makeVGrad();

      glow = new Sprite(gradTex); glow.anchor.set(0.5, 0); glow.alpha = 0; glow.blendMode = "add"; app.stage.addChild(glow);
      baseC = new Container(); app.stage.addChild(baseC);
      for (let i = 0; i < BASE_N; i++) { const s = new Sprite(glowTex); s.anchor.set(0.5); s.alpha = 0; s.blendMode = "add"; baseC.addChild(s); baseSpr.push(s); }
      flamePC = new ParticleContainer({ dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false } });
      flamePC.blendMode = "add"; app.stage.addChild(flamePC);
      for (let i = 0; i < MAX; i++) { const p = new Particle({ texture: flameTex, anchorX: 0.5, anchorY: 0.5, alpha: 0 }); flamePC.addParticle(p); flames.push({ p, alive: false }); }
      smokeC = new Container(); app.stage.addChild(smokeC);
      for (let i = 0; i < SMOKE_N; i++) { const s = new Sprite(glowTex); s.anchor.set(0.5); s.alpha = 0; s.tint = 0x282220; smokeC.addChild(s); smoke.push({ s, alive: false }); }

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
      for (const t of [flameTex, glowTex, gradTex]) { try { t?.destroy(true); } catch { /* ignore */ } }
    };
    // App EINMAL bauen; heat/Position kommen über Refs bzw. den Prop-Effekt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { applyRunRef.current?.(); }, [heat]);

  return (
    <div ref={hostRef} aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 12 }} />
  );
}

// Deterministischer 0..1-Hash (Brennlinien-Flackern).
function frnd(a, b) { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }
