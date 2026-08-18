import { useEffect, useRef } from "react";
import { Application, Graphics, Sprite, Texture } from "pixi.js";
import { gottAppOptions, gottMaxFPS, createPlacer } from "./pixiGott.js"; // #perf-gott geteilte Init + Geometrie-Cache
import { mix, clamp } from "./fxMath.js"; // #fx-helfer: geteilte Mathe-/Canvas-Helfer
import { makeRadial } from "./fxTextures.js"; // #fx-helfer: geteilte Radial-Textur

/* #322 Gottgleich-Prunk „Sonnen-Puls" (Standard, freier Default) — PIXI-Fassung. Die Outrun-Sonne bloomt EINMALIG
   hinter der Gegnerkarte auf: Scheibe mit vertikalem Sunset-Verlauf + horizontalen Scanline-Lücken (nach unten dicker),
   heißer Kern, weiche Korona, langsam drehende Strahlen. Pop beim Aufblühen, kurzes Halten, Ausfaden.

   Technik = mobil-sicheres Pixi (wie IonStorm/embersPixi): eigener `Application`-Layer als transparentes Panel-Overlay,
   `Graphics` additiv (Strahlen), `Sprite` mit VORGEBACKENEN Canvas-Texturen für die weichen Teile (Sonnen-Scheibe mit
   Verlauf+Streifen, Korona, Kern). KEINE Custom-Shader, kein Filter-Bloom. Einmal-Effekt: der Ticker läuft nur während
   des Effekts, dann Stop. loop=true (Shop-Vorschau) startet stattdessen neu. Werte 1:1 aus Issue #322. */

// ── TUNE (finale Werte, Issue #322) ────────────────────────────────────────────
const TUNE = {
  LIFE: 0.9, RISE: 0.4, FADE: 0.42, POP: 2.95,
  SIZE: 0.39, POS_Y: 0.5, SIZE_MIN: 0.55,
  STRIPE_START: 0.12, STRIPE_GAP: 0.15, STRIPE_SOLID: 0.13, STRIPE_GROW: 1.24,
  GLOW: 1.95, GLOWR: 1.7, CORE: 0.8, RAYS: 0.35,
  BRIGHT: 1, SCAN: 0.45,
  TAIL: 0.25,
};
const STD_TOP = "#ff3d81", STD_BOT = "#ffb43d";

const TAU = Math.PI * 2;
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const rgbStr = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const intOf = (c) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);

// Puls-Envelope: Aufblühen (RISE) mit Überschwingen (POP, easeOutBack-artig), Halten, Ausfaden (FADE).
function envelope(prog) {
  const rise = clamp(prog / TUNE.RISE, 0, 1);
  const fadeStart = 1 - TUNE.FADE;
  const fade = prog > fadeStart ? clamp((prog - fadeStart) / TUNE.FADE, 0, 1) : 0;
  const alpha = clamp(rise, 0, 1) * (1 - fade * fade);
  const inv = rise - 1;
  const back = 1 + TUNE.POP * inv * inv * inv + TUNE.POP * 0.6 * inv * inv;
  const scale = TUNE.SIZE_MIN + (1 - TUNE.SIZE_MIN) * clamp(back, 0, 1.6);
  return { alpha, scale };
}

// Kantenlänge der geteilten Radial-Textur (fxTextures.js). 128 statt 64 wie bei den Partikel-Effekten:
// die Prunk-Sprites werden bildschirmfüllend skaliert, bei 64 würde der Halo sichtbar ausfransen.
const RTX = 128;
// Sonnen-Scheibe: vertikaler Verlauf (top→bottom) + Scanline-Lücken (per destination-out gestanzt, nach unten dicker).
const STX = 256;
function makeSunTexture(top, bot) {
  const c = document.createElement("canvas"); c.width = c.height = STX; const x = c.getContext("2d");
  const cxp = STX / 2, cyp = STX / 2, R = STX / 2 - 1;
  x.save(); x.beginPath(); x.arc(cxp, cyp, R, 0, TAU); x.clip();
  const g = x.createLinearGradient(0, cyp - R, 0, cyp + R);
  g.addColorStop(0, rgbStr(top)); g.addColorStop(0.5, rgbStr(mix(top, bot, 0.5))); g.addColorStop(1, rgbStr(bot));
  x.fillStyle = g; x.fillRect(0, 0, STX, STX);
  x.globalCompositeOperation = "destination-out"; x.fillStyle = "#000";
  let yy = cyp + R * TUNE.STRIPE_START, gap = R * TUNE.STRIPE_GAP * 0.5; const solid = R * TUNE.STRIPE_SOLID; let guard = 0;
  while (yy < cyp + R && guard++ < 64) { yy += solid; x.fillRect(cxp - R, yy, R * 2, gap); yy += gap; gap *= TUNE.STRIPE_GROW; }
  x.restore(); return Texture.from(c);
}

  /* #perf-warm: `warm` = Bühne aufbauen, aber NICHT abspielen. Der Prunk wurde bisher erst beim ersten
     gottgleichen Sieg gemountet — und weil `startPlay()` direkt in der Init steht, fielen Chunk-Laden und
     `Application.init()` genau in den lautesten Moment des Laufs (gemessen: 362 ms blockierter Hauptthread,
     Supernova zieht dafür ZWEI Pixi-Apps auf). Mit `warm` passiert das, während ein Vollbild-Overlay liegt,
     wo ein Hitch unsichtbar ist. Kommt der Sieg vor dem Ende der (asynchronen) Init, merkt sich `startPlay()`
     das als `pending` und die Init holt das Abspielen nach — sonst würde der erste Gottgleich stumm bleiben. */
export default function SonnenPulsPixi({ panelRef, cardRef = null, trigger = 0,
  deckColor = "#35e0ff", deckColor2 = null, deckTint = false, reduced = false, lite = false, loop = false, speed = 1,
  onDone = null, onFire = null, warm = false }) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const nodesRef = useRef(null);          // { sun, corona, core, rays }
  const playRef = useRef({ playing: false, bt: 0 });
  const sunKeyRef = useRef("");
  const startRef = useRef(null);
  const firstRef = useRef(true);
  const st = useRef({ deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone, onFire });
  st.current = { deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone, onFire, warm };

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    let disposed = false;
    const canvas = document.createElement("canvas");
    const app = new Application();
    const coronaTex = makeRadial([[0, 1], [0.5, 0.5], [1, 0]], RTX);
    const coreTex = makeRadial([[0, 1], [0.4, 0.6], [1, 0]], RTX);

    // #perf-gott: einmal je Abspielvorgang messen (createPlacer) statt zwei erzwungene Layouts pro Frame.
    const placer = createPlacer(() => {
      const pr = panelRef?.current?.getBoundingClientRect();
      if (!pr || pr.width < 2) return null;
      const cr = cardRef?.current?.getBoundingClientRect();
      const cx = cr && cr.width > 2 ? (cr.left - pr.left + cr.width / 2) : pr.width / 2;
      const cy = pr.height * TUNE.POS_Y;
      return { W: pr.width, H: pr.height, cx, cy };
    });

    // Sonnen-Textur (Verlauf hängt am Farbmodus) nur bei Bedarf neu backen.
    function ensureSun(nodes) {
      const s = st.current, key = (s.deckTint ? "d" : "s") + s.deckColor + (s.deckColor2 || "");
      if (sunKeyRef.current === key && nodes.sun.texture) return;
      const top = s.deckTint ? rgb(s.deckColor) : rgb(STD_TOP), bot = s.deckTint ? rgb(s.deckColor2 || s.deckColor) : rgb(STD_BOT);
      const old = nodes.sun.texture; nodes.sun.texture = makeSunTexture(top, bot); sunKeyRef.current = key;
      if (old && old !== Texture.EMPTY) { try { old.destroy(true); } catch { /* ignore */ } }
    }

    function tick(ticker) {
      const pl = playRef.current, nodes = nodesRef.current; if (!pl.playing || !nodes) return;
      pl.bt += (ticker.deltaMS / 1000) * st.current.speed;
      const geo = placer.get(); if (!geo) return;
      const { H, cx, cy } = geo;
      const prog = clamp(pl.bt / TUNE.LIFE, 0, 1);
      const env = envelope(prog), A = env.alpha * TUNE.BRIGHT;
      const s = st.current, dr = rgb(s.deckColor), dr2 = rgb(s.deckColor2 || s.deckColor);
      const top = s.deckTint ? dr : rgb(STD_TOP), bot = s.deckTint ? dr2 : rgb(STD_BOT), midC = mix(top, bot, 0.5);
      const R = Math.max(4, H * TUNE.SIZE * env.scale);
      const glowScale = s.lite ? 0.85 : 1;
      ensureSun(nodes);

      // Sonnen-Scheibe (gebackene Textur, additiv).
      const sun = nodes.sun; sun.position.set(cx, cy); sun.width = sun.height = R * 2; sun.alpha = clamp(A, 0, 1);
      // Korona.
      const corona = nodes.corona; corona.position.set(cx, cy); corona.width = corona.height = R * TUNE.GLOWR * 2;
      corona.tint = intOf(midC); corona.alpha = clamp(0.55 * TUNE.GLOW * glowScale * A, 0, 1);
      // Heißer Kern (oben-mittig auf der Scheibe).
      const core = nodes.core; core.position.set(cx, cy - R * 0.12); core.width = core.height = R;
      core.tint = intOf(mix([255, 250, 240], top, 0.25)); core.alpha = clamp(0.9 * TUNE.CORE * A, 0, 1);

      // Drehende Lichtstrahlen (Graphics additiv).
      const g = nodes.rays; g.clear();
      if (TUNE.RAYS > 0 && !s.reduced && A > 0.01) {
        const n = s.lite ? 10 : 16, rot = (pl.bt) * 0.25 + performance.now() / 4000;
        for (let i = 0; i < n; i++) {
          const a = rot + (i / n) * TAU, len = R * (1.35 + 0.25 * Math.sin(pl.bt * 1.3 + i));
          g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
          g.stroke({ width: Math.max(1, R * 0.05), color: intOf(mix(top, bot, 0.4)), alpha: clamp(0.4 * TUNE.RAYS * A, 0, 1), cap: "round" });
        }
      }

      if (pl.bt > TUNE.LIFE + TUNE.TAIL) {
        if (s.loop) { pl.bt = 0; s.onFire && s.onFire(); }   // #showcase: Loop-Neustart → Ansage synchron neu poppen
        else { pl.playing = false; sun.alpha = corona.alpha = core.alpha = 0; g.clear(); stopIdle(); s.onDone && s.onDone(); }
      }
    }

    function stopIdle() { const a = appRef.current; if (!a) return; try { a.renderer.render(a.stage); a.ticker.stop(); } catch { /* ignore */ } }
    function startPlay() {
      const a = appRef.current, pl = playRef.current; if (disposed) return; if (!a) { pl.pending = true; return; } pl.pending = false;
      pl.playing = true; pl.bt = 0; placer.invalidate(); st.current.onFire && st.current.onFire();
      if (document.visibilityState !== "hidden") a.ticker.start();
    }
    startRef.current = startPlay;

    // #perf-gott: DPR-Deckel, antialias und Ticker-Cap kommen aus pixiGott.js (eine Wahrheit für alle fünf Prunks).
    app.init(gottAppOptions({ canvas, host, lite: st.current.lite }))
      .then(() => {
        if (disposed) { try { app.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } return; }
        appRef.current = app;
        canvas.style.width = "100%"; canvas.style.height = "100%"; canvas.style.display = "block"; host.appendChild(canvas);
        const sun = new Sprite(Texture.EMPTY); sun.anchor.set(0.5); sun.blendMode = "add";
        const corona = new Sprite(coronaTex); corona.anchor.set(0.5); corona.blendMode = "add"; corona.alpha = 0;
        const core = new Sprite(coreTex); core.anchor.set(0.5); core.blendMode = "add"; core.alpha = 0;
        const rays = new Graphics(); rays.blendMode = "add";
        app.stage.addChild(corona, rays, sun, core);
        nodesRef.current = { sun, corona, core, rays };
        app.ticker.maxFPS = gottMaxFPS(st.current.lite);
        app.ticker.add(tick);
        // Mount = spielen (Battlefield mountet nur beim Gott-Sieg; die Vorschau will den Loop). Trigger-Wechsel danach → Replay.
        if (!st.current.warm || playRef.current.pending) startPlay();
      // Nur vorgewärmt: Pixi startet seinen Ticker bei der Init von selbst — hier wieder anhalten, sonst
      // renderte die (leere) Bühne den ganzen Lauf über mit. stopIdle() ist derselbe Ruhezustand wie nach dem Abspielen.
      else stopIdle();
      }).catch(() => { /* WebGL fehlt → Overlay bleibt leer */ });

    const onVis = () => { const a = appRef.current; if (a && playRef.current.playing && document.visibilityState !== "hidden") a.ticker.start(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true; document.removeEventListener("visibilitychange", onVis);
      const a = appRef.current; appRef.current = null; nodesRef.current = null;
      for (const t of [coronaTex, coreTex]) { try { t.destroy(true); } catch { /* ignore */ } }
      if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } }
    };
     
  }, [panelRef, cardRef]);

  // Trigger-Wechsel → Einmal-Effekt neu starten. Der erste Lauf (Mount) wird übersprungen (init spielt selbst).
  useEffect(() => {
    if (firstRef.current) { firstRef.current = false; return; }
    startRef.current?.();
  }, [trigger]);

  return <div ref={hostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 9 }} />;
}
