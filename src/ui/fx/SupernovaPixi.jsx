import { useEffect, useRef } from "react";
import { Application, Graphics, Sprite, Texture, Container, ParticleContainer, Particle } from "pixi.js";
import { gottAppOptions, gottMaxFPS, GOTT_RES_FULL, createPlacer } from "./pixiGott.js"; // #perf-gott geteilte Init + Geometrie-Cache
import { SUPERNOVA_LIFE, SUPERNOVA_CHARGE, SUPERNOVA_TAIL } from "./supernovaTiming.js";
import { lerp, mix, easeOut, clamp } from "./fxMath.js"; // #fx-helfer: geteilte Mathe-/Canvas-Helfer
import { makeRadial } from "./fxTextures.js"; // #fx-helfer: geteilte Radial-Textur

/* #326 Gottgleich-Prunk „Supernova" (Legendär) — PIXI, der Showstopper. Mehrphasig: Kollaps (Sterne + Ring in den Kern
   gesogen) → Detonation (Weiß-Flash mit chromatischer Spaltung, Zoom-Punch) → Boom-Schockwelle + chromatische Ringe +
   rotierender Strahlenkranz + Speed-Streaks → Sternenregen mit Schweifen → hinten offener Grid-Tunnel durch den Einschlag.

   Ebenen (Issue #326): der Grid-Tunnel liegt als EIGENE Pixi-Canvas HINTER der Gegnerkarte (z-9), die Explosion davor
   (z-11) → die DOM-Karte (z-10) sitzt DAZWISCHEN. Darum zwei Applications (eine je Canvas), gemeinsam getaktet: der
   Nova-Ticker treibt beide, der Tunnel wird manuell mitgerendert. Zoom-Punch = Container-Scale um den Kern (Karte/
   Effekt zoomen mit); SCREENSHAKE bewusst WEGGELASSEN. Sterne = ParticleContainer (Streak-Textur, rotiert). Reduced:
   Zoom/Flash gedämpft, Sternenzahl runter. Werte 1:1 aus #326. */

const TUNE = {
  // Zeitachse aus supernovaTiming.js — dieselben Werte rechnen den Sound-Vorlauf (Pixi-frei importierbar).
  LIFE: SUPERNOVA_LIFE, CHARGE: SUPERNOVA_CHARGE, FLASH: 2.7,
  ZOOM: 0.5, BOOM: 1.75, STREAK: 1.7,
  CORE_R: 0.6, CORE_GLOW: 2.8, POS_Y: 0.5,
  RINGS: 6, RING_R: 2, CHROMA: 12, RING_SEP: 0.05, RING_THICK: 0.5, RING_STAGGER: 0.06,
  RAYS: 48, RAY_LEN: 1.1, RAY_SPIN: 0.8,
  STARS: 240, STAR_SPEED: 1.55, STAR_SIZE: 2.6, STAR_TRAIL: 4, GRAVITY: 0,
  TUNNEL: 1.2, T_RINGS: 14, T_SPOKES: 24, T_SPEED: 3.4, T_GAMMA: 3.3, T_HOLE: 0.06, T_SPIN: -1,
  BRIGHT: 1.1, SCAN: 0,
  TAIL: SUPERNOVA_TAIL,
};
const STD_A = "#ffd24a", STD_B = "#ff2d9b";

const TAU = Math.PI * 2;
function rgb(hex) { let s = String(hex || "#fff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const intOf = (c) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);
function hsl2rgb(h, s, l) { const a = s * Math.min(l, 1 - l); const f = (n) => { const k = (n + h * 12) % 12; return (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))) * 255; }; return [f(0), f(8), f(4)]; }

// Kantenlänge der geteilten Radial-Textur (fxTextures.js). 128 statt 64 wie bei den Partikel-Effekten:
// die Prunk-Sprites werden bildschirmfüllend skaliert, bei 64 würde der Halo sichtbar ausfransen.
const RTX = 128;
// Streak-Textur für die Sterne: heller Kopf links → transparenter Schweif rechts (weiß, getönt zur Laufzeit).
const SKX = 256, SKY = 32;
function makeStreak() {
  const c = document.createElement("canvas"); c.width = SKX; c.height = SKY; const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, SKX, 0);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,0.7)"); g.addColorStop(1, "rgba(255,255,255,0)");
  // weicher vertikaler Falloff über eine Ellipse
  const vg = x.createRadialGradient(SKX * 0.15, SKY / 2, 0, SKX * 0.15, SKY / 2, SKY / 2);
  x.fillStyle = g; x.fillRect(0, 0, SKX, SKY);
  x.globalCompositeOperation = "destination-in";
  vg.addColorStop(0, "rgba(255,255,255,1)"); vg.addColorStop(1, "rgba(255,255,255,0.15)");
  x.fillStyle = vg; x.fillRect(0, 0, SKX, SKY);
  return Texture.from(c);
}

  /* #perf-warm: `warm` = Bühne aufbauen, aber NICHT abspielen. Der Prunk wurde bisher erst beim ersten
     gottgleichen Sieg gemountet — und weil `startPlay()` direkt in der Init steht, fielen Chunk-Laden und
     `Application.init()` genau in den lautesten Moment des Laufs (gemessen: 362 ms blockierter Hauptthread,
     Supernova zieht dafür ZWEI Pixi-Apps auf). Mit `warm` passiert das, während ein Vollbild-Overlay liegt,
     wo ein Hitch unsichtbar ist. Kommt der Sieg vor dem Ende der (asynchronen) Init, merkt sich `startPlay()`
     das als `pending` und die Init holt das Abspielen nach — sonst würde der erste Gottgleich stumm bleiben. */
export default function SupernovaPixi({ panelRef, cardRef = null, trigger = 0,
  deckColor = "#ffd24a", deckColor2 = null, deckTint = false, reduced = false, lite = false, loop = false, speed = 1,
  onDone = null, onFire = null, warm = false }) {
  const tHostRef = useRef(null);
  const nHostRef = useRef(null);
  const refs = useRef({ tApp: null, nApp: null, tG: null, tSpokes: null, spokeKey: null, tDirty: true, tRoot: null, nRoot: null, novaG: null, core: null, flash: null, starsPC: null, stars: [] });
  const playRef = useRef({ playing: false, bt: 0 });
  const startRef = useRef(null);
  const firstRef = useRef(true);
  const st = useRef({ deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone, onFire });
  st.current = { deckColor, deckColor2, deckTint, reduced, lite, loop, speed, onDone, onFire, warm };

  useEffect(() => {
    const tHost = tHostRef.current, nHost = nHostRef.current; if (!tHost || !nHost) return undefined;
    let disposed = false;
    const tCanvas = document.createElement("canvas"), nCanvas = document.createElement("canvas");
    const tApp = new Application(), nApp = new Application();
    const coreTex = makeRadial([[0, 1], [0.4, 0.5], [1, 0]], RTX);
    const flashTex = makeRadial([[0, 1], [0.6, 0.3], [1, 0]], RTX);
    const streakTex = makeStreak();

    // #perf-gott: einmal je Abspielvorgang messen (createPlacer) statt zwei erzwungene Layouts pro Frame.
    const placer = createPlacer(() => {
      const pr = panelRef?.current?.getBoundingClientRect(); if (!pr || pr.width < 2) return null;
      const cr = cardRef?.current?.getBoundingClientRect();
      const cx = cr && cr.width > 2 ? (cr.left - pr.left + cr.width / 2) : pr.width / 2;
      const W = pr.width, H = pr.height;
      return { W, H, cx, cy: H * TUNE.POS_Y, diag: Math.hypot(W, H), halfDiag: Math.hypot(W, H) / 2 };
    });

    function seedStars() {
      const r = refs.current; const s = st.current;
      const n = Math.round(TUNE.STARS * (s.lite ? 0.3 : 1) * (s.reduced ? 0.4 : 1)); // #perf-mobile: lite-Sterne 0.45→0.3
      for (let i = 0; i < r.stars.length; i++) {
        const active = i < n; const p = r.stars[i].p; if (!active) { p.alpha = 0; r.stars[i].active = false; continue; }
        const seed = i * 2.3 + (trigger + 1) * 5;
        const rnd = (o) => { const x = Math.sin(seed * 12.9898 + o * 78.233) * 43758.5453; return x - Math.floor(x); };
        r.stars[i].active = true; r.stars[i].ang = rnd(1) * TAU; r.stars[i].spd = 0.5 + rnd(2) * 0.9; r.stars[i].sz = 0.6 + rnd(3) * 0.9; r.stars[i].startR = 0.6 + rnd(4) * 0.5; r.stars[i].hue = rnd(5);
      }
    }

    function applyZoom(root, cx, cy, zoom) { root.pivot.set(cx, cy); root.position.set(cx, cy); root.scale.set(zoom); }

    function tick(ticker) {
      const pl = playRef.current, r = refs.current; if (!pl.playing || !r.novaG) return;
      pl.bt += (ticker.deltaMS / 1000) * st.current.speed;
      const geo = placer.get(); if (!geo) return;
      const { W, H, cx, cy, diag, halfDiag } = geo;
      const s = st.current;
      const prog = clamp(pl.bt / TUNE.LIFE, 0, 1);
      const cp = clamp(prog / TUNE.CHARGE, 0, 1), det = prog >= TUNE.CHARGE, dp = det ? (prog - TUNE.CHARGE) / (1 - TUNE.CHARGE) : 0;
      const ca = s.deckTint ? rgb(s.deckColor) : rgb(STD_A), cb = s.deckTint ? rgb(s.deckColor2 || s.deckColor) : rgb(STD_B);
      const BR = TUNE.BRIGHT;
      const zoom = (!s.reduced && det) ? 1 + TUNE.ZOOM * Math.exp(-dp * 6) : 1;
      applyZoom(r.nRoot, cx, cy, zoom); applyZoom(r.tRoot, cx, cy, zoom);

      // ── Tunnel (eigene Canvas, hinter der Karte) ──
      const tG = r.tG;
      const fadeIn = clamp(prog / 0.12, 0, 1), fadeOut = 1 - clamp((prog - 0.75) / 0.25, 0, 1), tA = TUNE.TUNNEL * fadeIn * fadeOut * BR;
      const tVisible = tA > 0.003;
      if (tVisible) {
        tG.clear();
        const edge = halfDiag * 1.25, rIn = edge * TUNE.T_HOLE, spin = performance.now() / 1000 * TUNE.T_SPIN * 0.5, flow = (pl.bt * TUNE.T_SPEED * 0.12) % 1;
        // #perf: lite → weniger Tunnel-Ringe/Speichen (10/16 statt 14/24); die Perspektive/der Sog bleiben erhalten.
        const nTR = s.lite ? 8 : TUNE.T_RINGS, nTS = s.lite ? 16 : TUNE.T_SPOKES;
        for (let i = 0; i < nTR; i++) { const f = (i + flow) / nTR, rr = rIn + (edge - rIn) * Math.pow(f, TUNE.T_GAMMA); tG.circle(cx, cy, rr).stroke({ width: Math.max(1, diag * 0.0025), color: intOf(mix(ca, cb, f)), alpha: clamp(tA * (0.25 + 0.6 * f), 0, 1) }); }
        /* #perf-nova: Die Speichen sind das einzige Stück Tunnel, dessen FORM sich nie ändert — sie laufen immer vom
           selben Innen- zum selben Außenradius, in derselben Breite und Farbe; nur der Winkel und die Deckkraft
           wandern. Neu aufgezeichnet wurden sie trotzdem jeden Frame, und ein Strich neu aufzeichnen heißt in Pixi
           v8: neu tessellieren, neu packen, neu hochladen. Jetzt liegen sie EINMAL je Abspielvorgang als eigene
           Graphics und werden nur noch gedreht (`rotation`) und in der Deckkraft geführt. */
        const sk = r.tSpokes;
        if (r.spokeKey !== `${nTS}|${rIn.toFixed(1)}|${edge.toFixed(1)}`) {
          r.spokeKey = `${nTS}|${rIn.toFixed(1)}|${edge.toFixed(1)}`;
          sk.clear();
          for (let sp = 0; sp < nTS; sp++) { const a = (sp / nTS) * TAU, dx = Math.cos(a), dy = Math.sin(a); sk.moveTo(cx + dx * rIn, cy + dy * rIn); sk.lineTo(cx + dx * edge, cy + dy * edge); }
          sk.stroke({ width: Math.max(1, diag * 0.0022), color: intOf(mix(ca, cb, 0.8)), alpha: 1 });
        }
        sk.pivot.set(cx, cy); sk.position.set(cx, cy); sk.rotation = spin;
        sk.alpha = clamp(tA * 0.4, 0, 1);
        sk.visible = true;
      } else if (r.tDirty !== false) {
        // Unsichtbar (vor dem Einblenden, nach dem Ausblenden): einmal leeren, danach GAR NICHTS mehr tun. Vorher
        // wurde eine leere Vollbild-Canvas weiter jeden Frame geleert und gerendert — reine Arbeit ohne Bild.
        tG.clear(); r.tSpokes.visible = false;
      }
      if (tVisible || r.tDirty !== false) { try { r.tApp.renderer.render(r.tApp.stage); } catch { /* ignore */ } }
      r.tDirty = tVisible;

      // ── Sterne (ParticleContainer, Streak) ──
      for (const star of r.stars) {
        if (!star.active) continue; const p = star.p;
        const dx = Math.cos(star.ang), dy = Math.sin(star.ang);
        let rr, a;
        if (!det) { rr = star.startR * halfDiag * (1 - easeOut(cp)); a = 0.3 + 0.7 * cp; }
        else { rr = dp * halfDiag * TUNE.RING_R * star.spd * TUNE.STAR_SPEED * 0.5; a = (1 - dp) * (1 - dp); }
        if (a <= 0.02) { p.alpha = 0; continue; }
        const x = cx + dx * rr, y = cy + dy * rr + (det ? TUNE.GRAVITY * dp * dp * halfDiag : 0);
        const trailLen = (det ? TUNE.STAR_TRAIL : 1.5) * star.sz * (diag * 0.02);
        const col = s.deckTint ? mix(ca, cb, star.hue) : hsl2rgb(lerp(0.09, 0.92, star.hue), 0.7, 0.7);
        // Streak zeigt vom Kopf (x,y) nach INNEN (Schweif hinterher) → rotation = Winkel + PI (Textur-Kopf links).
        p.x = x; p.y = y; p.rotation = star.ang + Math.PI;
        p.scaleX = trailLen / SKX; p.scaleY = Math.max(1, TUNE.STAR_SIZE * star.sz) / SKY;
        p.tint = intOf(mix(col, [255, 255, 255], 0.35)); p.alpha = clamp(a, 0, 1);
      }

      // ── Explosion (Graphics + Kern) ──
      const g = r.novaG; g.clear();
      if (det) {
        // Strahlenkranz.
        const rayA = (1 - dp) * (1 - dp) * BR;
        if (rayA > 0.02) { const nRays = s.lite ? Math.round(TUNE.RAYS * 0.34) : TUNE.RAYS, rot = performance.now() / 1000 * TUNE.RAY_SPIN * TAU, len = halfDiag * TUNE.RAY_LEN * (0.4 + 0.6 * easeOut(dp));
          for (let i = 0; i < nRays; i++) { const a = rot + (i / nRays) * TAU; g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); }
          g.stroke({ width: Math.max(1, diag * 0.004), color: intOf(mix([255, 245, 220], mix(ca, cb, 0.5), 0.4)), alpha: clamp(0.4 * rayA, 0, 1) }); }
        // Speed-Streaks (kurz nach Detonation).
        if (dp < 0.35 && TUNE.STREAK > 0) { const sa = (1 - dp / 0.35) * TUNE.STREAK, nS = s.lite ? 20 : 60;
          for (let i = 0; i < nS; i++) { const a = (i / nS) * TAU + (trigger + 1), dx = Math.cos(a), dy = Math.sin(a), r0 = halfDiag * 0.3, r1 = halfDiag * (0.7 + 0.5 * dp); g.moveTo(cx + dx * r0, cy + dy * r0); g.lineTo(cx + dx * r1, cy + dy * r1); }
          g.stroke({ width: Math.max(1, diag * 0.002), color: 0xffffff, alpha: clamp(0.4 * sa, 0, 1) }); }
        /* Chromatische Ringe (gestaffelt).
           #perf-nova: `nBands` ist die ANZAHL der Farbbänder je Welle, `bandSpread` ihre GESAMTBREITE. Beides hing
           vorher an derselben Zahl — weniger Bänder hätten den Farbsaum also nicht nur gröber, sondern auch schmaler
           gemacht, und das ist eine andere Choreografie statt einer Sparmaßnahme. Auf lite laufen jetzt 4 statt 6
           Bänder über dieselbe Breite: gröbere Farbstufung, gleicher Saum. */
        const nBands = s.lite ? 4 : TUNE.CHROMA;
        const bandSpread = s.lite ? 6 : TUNE.CHROMA;
        const nRings = s.lite ? 4 : TUNE.RINGS; // #perf-mobile: lite 6→4 Ring-Wellen
        /* #fx-nova-cut: Die Ring-Wellen starten gestaffelt (je Welle +RING_STAGGER), ihre Laufzeit muss also in das
           verbleibende dp-Fenster passen. Vorher war das Fenster fest 0,9 — die letzte der 6 Wellen hätte damit bis
           dp = 0,9 + 5·0,06 = 1,20 gebraucht, dp endet aber bei 1,0. Ergebnis: bei voller Qualität wurden VIER der
           sechs Wellen mitten im Flug abgeschnitten (auf lite zwei von vier), der Effekt brach sichtbar ab.
           Jetzt wird das Fenster aus der Staffelung ABGELEITET → jede Welle läuft garantiert aus, egal wie viele.
           Bewusst so und nicht über eine längere LIFE: an LIFE/CHARGE hängt der Detonationszeitpunkt und damit die
           Ton-Synchronisation (supernovaTiming.js) — die bleibt unangetastet. */
        const ringWin = Math.max(0.2, 1 - TUNE.RING_STAGGER * (nRings - 1));
        for (let w = 0; w < nRings; w++) { const wt = dp - w * TUNE.RING_STAGGER; if (wt < 0 || wt > ringWin) continue; const wp = wt / ringWin, R = halfDiag * TUNE.RING_R * easeOut(wp), rA = (wp < 0.1 ? wp / 0.1 : Math.pow(1 - (wp - 0.1) / 0.9, 1.2)) * BR;
          for (let b = 0; b < nBands; b++) { const bu = nBands > 1 ? b / (nBands - 1) : 0.5, rb = R + (bu - 0.5) * TUNE.RING_SEP * bandSpread * H; if (rb <= 1) continue; const col = s.deckTint ? mix(ca, cb, bu) : hsl2rgb(lerp(0.06, 0.95, bu), 1, 0.6); g.circle(cx, cy, rb).stroke({ width: Math.max(1, TUNE.RING_THICK * H * 0.04), color: intOf(col), alpha: clamp(0.4 * rA, 0, 1) }); } }
        // Dicke weiße Boom-Front.
        if (TUNE.BOOM > 0) { const br = halfDiag * TUNE.RING_R * 0.9 * easeOut(dp), ba = (1 - dp) * (1 - dp) * TUNE.BOOM; g.circle(cx, cy, br).stroke({ width: Math.max(2, diag * 0.02 * (1 - dp)), color: 0xffffff, alpha: clamp(0.5 * ba, 0, 1) }); }
      }

      // Heißer Kern.
      const coreR = halfDiag * TUNE.CORE_R * (det ? (0.5 + 0.5 * (1 - dp)) : (0.15 + 0.55 * cp)), coreA = det ? (0.5 + 0.5 * (1 - dp)) : (0.4 + 0.6 * cp);
      const core = r.core; core.position.set(cx, cy); core.width = core.height = Math.max(4, coreR * 2); core.tint = intOf(mix([255, 255, 255], ca, 0.4)); core.alpha = clamp(coreA * TUNE.CORE_GLOW * 0.4, 0, 1);

      // Detonations-Flash (Vollbild, NICHT gezoomt) — Weiß + chromatische A/B-Spaltung. Reduced: stark reduziert.
      const flash = r.flash;
      if (det && dp < 0.3) { const fBase = 1 - dp / 0.3, fa = fBase * (s.reduced ? 0.22 : 1) * Math.min(1, TUNE.FLASH * 0.4);
        flash.clear();
        if (fa > 0.01) {
          if (!s.reduced && !s.lite) { const off = diag * 0.01 * fBase; flash.rect(-off, 0, W, H).fill({ color: intOf(ca), alpha: clamp(fa * 0.5, 0, 1) }); flash.rect(off, 0, W, H).fill({ color: intOf(cb), alpha: clamp(fa * 0.5, 0, 1) }); } // #perf-mobile: chromatische A/B-Spaltung (2 extra Vollbild-Rects) auf lite aus
          flash.rect(0, 0, W, H).fill({ color: 0xffffff, alpha: clamp(fa * 0.7, 0, 1) });
        }
      } else { r.flash.clear(); }

      if (pl.bt > TUNE.LIFE + TUNE.TAIL) {
        if (s.loop) { seedStars(); pl.bt = 0; s.onFire && s.onFire(); }
        else { pl.playing = false; g.clear(); tG.clear(); flash.clear(); core.alpha = 0; for (const star of r.stars) star.p.alpha = 0; stopIdle(); s.onDone && s.onDone(); }
      }
    }

    function stopIdle() { const r = refs.current; try { r.tApp.renderer.render(r.tApp.stage); r.nApp.renderer.render(r.nApp.stage); r.nApp.ticker.stop(); } catch { /* ignore */ } }
    function startPlay() { const r = refs.current, pl = playRef.current; if (disposed) return; if (!r.nApp) { pl.pending = true; return; } pl.pending = false; seedStars(); pl.playing = true; pl.bt = 0; placer.invalidate(); r.spokeKey = null; r.tDirty = true; st.current.onFire && st.current.onFire(); if (document.visibilityState !== "hidden") r.nApp.ticker.start(); }
    startRef.current = startPlay;

    // #perf: lite → DPR-Deckel 1.25 auf BEIDE Canvas (Tunnel + Nova) — der teuerste Posten (zwei Full-Screen-Apps + Flash).
    /* #perf-gott: Supernova zieht ZWEI Full-Panel-Canvas auf (Tunnel + Nova) → doppelte Fill-Rate. Deshalb bleibt
       die lite-Dichte bei 1.0 (statt 1.25 wie bei den Ein-Canvas-Prunks); voll teilt sich den Deckel mit dem Rest. */
    const initOpts = (canvas, host) => gottAppOptions({ canvas, host, lite: st.current.lite, resLite: 1.0, resFull: GOTT_RES_FULL });
    Promise.all([tApp.init(initOpts(tCanvas, tHost)), nApp.init(initOpts(nCanvas, nHost))]).then(() => {
      if (disposed) { for (const a of [tApp, nApp]) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } } return; }
      for (const [cv, hs] of [[tCanvas, tHost], [nCanvas, nHost]]) { cv.style.width = "100%"; cv.style.height = "100%"; cv.style.display = "block"; hs.appendChild(cv); }
      tApp.ticker.stop(); // Tunnel wird manuell aus dem Nova-Ticker gerendert (gemeinsame Zeitbasis)
      const tRoot = new Container(), tG = new Graphics(), tSpokes = new Graphics();
      tG.blendMode = "add"; tSpokes.blendMode = "add";
      tRoot.addChild(tG, tSpokes); tApp.stage.addChild(tRoot);
      const nRoot = new Container();
      const starsPC = new ParticleContainer({ dynamicProperties: { position: true, rotation: true, scale: true, color: true } }); starsPC.blendMode = "add";
      const stars = [];
      for (let i = 0; i < TUNE.STARS; i++) { const p = new Particle({ texture: streakTex, anchorX: 0, anchorY: 0.5, alpha: 0 }); starsPC.addParticle(p); stars.push({ p, active: false }); }
      const novaG = new Graphics(); novaG.blendMode = "add";
      const core = new Sprite(coreTex); core.anchor.set(0.5); core.blendMode = "add"; core.alpha = 0;
      nRoot.addChild(starsPC, novaG, core); nApp.stage.addChild(nRoot);
      const flash = new Graphics(); flash.blendMode = "add"; nApp.stage.addChild(flash); // Flash außerhalb des Zoom-Containers
      Object.assign(refs.current, { tApp, nApp, tG, tSpokes, tRoot, nRoot, novaG, core, flash, starsPC, stars });
      nApp.ticker.maxFPS = gottMaxFPS(st.current.lite); // treibt beide Apps (Tunnel wird aus dem Nova-Ticker gerendert)
      nApp.ticker.add(tick); if (!st.current.warm || playRef.current.pending) startPlay();
      // Nur vorgewärmt: Pixi startet seinen Ticker bei der Init von selbst — hier wieder anhalten, sonst
      // renderte die (leere) Bühne den ganzen Lauf über mit. stopIdle() ist derselbe Ruhezustand wie nach dem Abspielen.
      else stopIdle();
    }).catch(() => { /* WebGL fehlt → leer */ });

    const onVis = () => { const r = refs.current; if (r.nApp && playRef.current.playing && document.visibilityState !== "hidden") r.nApp.ticker.start(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true; document.removeEventListener("visibilitychange", onVis);
      const r = refs.current; const apps = [r.tApp, r.nApp]; refs.current = { tApp: null, nApp: null, stars: [] };
      for (const t of [coreTex, flashTex, streakTex]) { try { t.destroy(true); } catch { /* ignore */ } }
      for (const a of apps) { if (a) { try { a.destroy(true, { children: true, texture: true }); } catch { /* ignore */ } } }
    };
    // Bühne EINMAL bauen (nur an panelRef/cardRef gekeyt). Alle lebenden Werte — Farben, reduced/lite,
    // loop/speed, die Rückrufe — liest der Effekt über den Ref-Spiegel `st.current`, der bei JEDEM Render
    // frisch gesetzt wird. Stünden sie in den Deps, risse jede Farbumstellung die Pixi-App ab und baute sie neu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelRef, cardRef]);

  useEffect(() => { if (firstRef.current) { firstRef.current = false; return; } startRef.current?.(); }, [trigger]);

  return (
    <>
      <div ref={tHostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 9 }} />
      <div ref={nHostRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 11 }} />
    </>
  );
}
