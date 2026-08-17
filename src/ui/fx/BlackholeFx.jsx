import { useEffect, useRef } from "react";
import { frameMinMs } from "./mobileTier.js"; // #perf-mobile: Auflösungs-/Zeichenrate-Deckel (eine Wahrheit)

/* Sieg-Finisher „Schwarzes Loch" (#320 Rework) — serien-getriebenes, persistentes Panel-Loch mit Akkretionsscheibe
   (außen deck → innen deck2 um einen soliden schwarzen Kern). Architektur wie der alte BlackholeFieldFx: eine
   persistente Canvas auf Panel-Ebene, rAF-Schleife, Steuerwerte über ctrlRef (kein Reset je Stich); Sim in simRef.

   Mechanik (Serie → Zustand):
   - Sieg → Loch baut sich auf & wächst (level+1), saugt die Gegnerkarte spiralig ein.
   - Niederlage → verkleinert schrittweise (heat-artig: level -= max(LOSS_MIN, level*LOSS_PCT)), KEIN Sofort-Kollaps.
   - level<=0 → Voll-Implosion; Puls-Nova NUR wenn der Peak-Radius vorher >= NOVA_THRESH lag; danach dormant + Neuaufbau.
   - KEIN Pulsieren. Kern durchgängig solide opak-schwarz (globalAlpha=1 vor dem Kern → kein Rest-Alpha-Bug).

   Rendering-Reihenfolge (Interstellar-Wrap): BG-Sterne → Akkretion HINTEN → Karten-Flyer → Surround-Halo → OPAKER Kern
   → Photonenring+Kante → Akkretion VORN (über den Kern) → FG-Sterne → Nova. Canvas-2D (mobiltauglich). */

// ── Schwarzes Loch — TUNE (Größen = Anteil von D = min(W,H)) ──
const TUNE = {
  // Start UNVERÄNDERT (BASE_R/STEP_R), aber MAX_R verdoppelt (0.28 → 0.56) → sehr lange Serien wachsen bis aufs
  //   Doppelte an (gleiche Wachstumsrate pro Sieg, nur höherer Deckel). maxLevel folgt automatisch aus MAX_R.
  BASE_R: 0.050, STEP_R: 0.022, MAX_R: 0.56, SMOOTH: 0.080,
  LOSS_MIN: 1.00, LOSS_PCT: 0.30,
  // Karten-Einflug: Karte schrumpft SEHR schnell auf Orbit-Größe (SHRINK_IN-Anteil), umkreist dann das Loch ENG
  //   (ORBIT_R, mehrere Umläufe SPIRAL_TURNS — dabei auch HINTER dem Kern durch, Tiefen-Occlusion via ORBIT_TILT),
  //   erst ab ORBIT_END wird sie spiralig in den Kern gesogen. ORBIT_SC = kleine Orbit-Größe der Karte.
  FLYIN_DUR: 2.10, SPIRAL_TURNS: 2.6, ORBIT_R: 0.12, ORBIT_SC: 0.26, SHRINK_IN: 0.16, ORBIT_END: 0.80, ORBIT_TILT: 0.5, SPARKS: 0, // #: keine Funken beim Einsaugen (SPARKS 2→0)
  // #338-4: Bahn enger an R (war 1.45 → bei großem Loch zu weit) + Deckel gleichzeitiger Flyer → smooth bei Max.
  ORBIT_TIGHT: 1.15, MAX_FLYERS: 6,
  NOVA_THRESH: 0.18, NOVA_R: 0.58, NOVA_DUR: 1.20, IMPLODE_SPD: 0.07,
  // #: Der (kleine) Implosions-Sound spielt nur, wenn das Loch VOR dem Kollaps mind. so viele Level erreicht hatte —
  //   nicht bei jedem Level-1/2-Rückfall nach nur einem Sieg. [TUNING]
  IMPLODE_SND_MIN_LEVEL: 3,
  // #338-1: Kollaps-Puls, wenn das Loch MAX_HOLD_S Sekunden (Echtzeit) auf Maximum stand → Implosionsbombe (big-Nova).
  MAX_HOLD_S: 120,
  // #kollaps: die letzten SHUDDER_S Sekunden am Max fängt das Loch an zu ZUCKEN (subtil, zunehmend). Beim Kollaps zieht
  //   es sich SCHNELL in sich zusammen (FAST_COLLAPSE_SPD) → dann Flash/Nova. COLLAPSE_ARM_MS = komprimiertes Vorbeben
  //   für die Shop-Vorschau (gescripteter „collapse"-Puls; in-game kommt das Zucken aus dem echten 30-s-Fenster).
  SHUDDER_S: 30, FAST_COLLAPSE_SPD: 0.34, COLLAPSE_ARM_MS: 1500,
  DISK_ARMS: 3, DISK_DENSITY: 250, DISK_TURNS: 3.0, DISK_THICK: 1.0, ROT_SPEED: 0.20,
  // Bloom fast auf 0: RING_GLOW 0 (Photonenring nur minimaler Schein), BRIGHT ~1 (Akkretion nicht mehr überbelichtet).
  // #338-3: Photonenring DÜNNER (RING_W · coreR, war 0.13).
  TILT: 0.30, CORE_SIZE: 0.20, RING_GLOW: 0.0, BRIGHT: 0.80, RING_W: 0.07, // #: Akkretion deutlich dunkler (1.05→0.80) — die „Sterne" ums Loch waren zu hell
};

// #338-4: Kartenmaße modulweit (auch für den Offscreen-Rückseiten-Cache außerhalb der Zeichenschleife).
const CARD_W = 104, CARD_H = 144;

const PI2 = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function hexRGB(h) { let s = String(h || "#4aa0ff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
const mixRGB = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
const rgba = (c, a) => "rgba(" + (c.r | 0) + "," + (c.g | 0) + "," + (c.b | 0) + "," + a + ")";
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// Pfad eines abgerundeten Rechtecks in den gegebenen 2D-Context (modulweit → auch für den Offscreen-Rücken-Cache).
function roundRectPath(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

/* #perf-overlay-2: `boardVisible` NICHT `active` — `active` ist hier schon vergeben (= Schwarzes Loch als Finisher
   gewählt). Der Loop läuft sonst auch im Leerlauf weiter (`if (!busy) { raf = …; return; }`), also auch hinter
   Architekt-/Perk-/Skill-Overlays. */
export function BlackholeFx({ active, pulse = null, color = "#4aa0ff", color2 = "#ff3ea8", scale = 1, panelRef, oppRef, backSrc = null, reduced = false, boardVisible = true, onImplode = null, onSize = null, onNova = null, onShudder = null }) {
  const canvasRef = useRef(null);
  const simRef = useRef(null);
  const ctrlRef = useRef({ pulse: null, scale: 1, color, color2, boardVisible: true });
  // #338-4: Offscreen-Cache der eingesogenen Karte = Deck-RÜCKSEITE (pro Auswahl-Phase konstant). Einmal pro backSrc-
  //   Wechsel in Kartengröße vorrendern → pro Flyer nur noch drawImage (kein Neuzeichnen je Wert/Frame, kein num mehr).
  const backRef = useRef({ src: null, canvas: null, ready: false });
  useEffect(() => { ctrlRef.current.scale = scale; }, [scale]);
  useEffect(() => { ctrlRef.current.boardVisible = boardVisible; }, [boardVisible]);
  useEffect(() => { ctrlRef.current.color = color; ctrlRef.current.color2 = color2; }, [color, color2]);
  useEffect(() => { if (pulse) ctrlRef.current.pulse = pulse; }, [pulse]);
  // #375/#380 SFX-Callbacks im ctrlRef (Sim liest sie im Ticker): onImplode(big, spd) beim Kollaps-START (Zusammenzieh-
  //   Sound), onSize(level, maxLevel) bei Größenänderung, onNova(big) am FLASH-Moment (nach dem Zusammenziehen → fx_supernova),
  //   onShudder(0..1) während des Vorbebens (Bett steigt mit dem Zucken).
  useEffect(() => { ctrlRef.current.onImplode = onImplode; ctrlRef.current.onSize = onSize; ctrlRef.current.onNova = onNova; ctrlRef.current.onShudder = onShudder; }, [onImplode, onSize, onNova, onShudder]);
  useEffect(() => {
    const st = backRef.current;
    if (!backSrc) { st.src = null; st.ready = false; st.canvas = null; return undefined; }
    if (st.src === backSrc && st.ready) return undefined;
    st.src = backSrc; st.ready = false;
    const img = new Image(); let dead = false;
    img.onload = () => {
      if (dead || backRef.current.src !== backSrc) return;                    // veralteter Load → verwerfen
      const R2 = 2, cv = document.createElement("canvas"); cv.width = CARD_W * R2; cv.height = CARD_H * R2;
      const c = cv.getContext("2d"); if (!c) return;
      roundRectPath(c, 0, 0, cv.width, cv.height, Math.max(6, cv.width * 0.06)); c.clip();
      // „cover": Bild formatfüllend in die Kartenbox.
      const ir = img.width / img.height, br = cv.width / cv.height;
      let dw = cv.width, dh = cv.height, dx = 0, dy = 0;
      if (ir > br) { dw = cv.height * ir; dx = (cv.width - dw) / 2; } else { dh = cv.width / ir; dy = (cv.height - dh) / 2; }
      c.drawImage(img, dx, dy, dw, dh);
      backRef.current.canvas = cv; backRef.current.ready = true;
    };
    img.src = backSrc;
    return () => { dead = true; };
  }, [backSrc]);

  useEffect(() => {
    if (!active || !panelRef?.current || !canvasRef.current) return undefined;
    const panel = panelRef.current, canvas = canvasRef.current;
    const ctx = canvas.getContext("2d"); if (!ctx) return undefined;

    let W = 0, H = 0, D = 1, dpr = 1, cx = 0, cy = 0, ox = 0, oy = 0;
    // Sterne: zwei Tiefen-Ebenen (Vordergrund über dem Loch, Hintergrund verdeckt), sanfter Parallaxe-Drift, KEIN Twinkle.
    let bgStars = [], fgStars = [];
    const buildStars = () => {
      const rng = mulberry32(90210), n = Math.round((W * H) / 26000);
      bgStars = []; fgStars = [];
      for (let i = 0; i < n; i++) bgStars.push({ x: rng() * W, y: rng() * H, s: 0.35 + rng() * 0.5, dx: (rng() - 0.5) * 0.004, dy: (rng() - 0.5) * 0.004 });
      for (let i = 0; i < Math.round(n * 0.5); i++) fgStars.push({ x: rng() * W, y: rng() * H, s: 0.45 + rng() * 0.75, dx: (rng() - 0.5) * 0.010, dy: (rng() - 0.5) * 0.010 });
    };
    // #perf: auf Mobile (pointer:coarse) die Canvas-Auflösung auf DPR 1.5 deckeln → ~40 % weniger Füllkosten für die
    //   additive Akkretion (Pixelanzahl ∝ dpr²); bei bereits gedrosseltem Bloom praktisch unsichtbar. Desktop bleibt 2.
    const coarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
    const measure = () => {
      const pr = panel.getBoundingClientRect(); W = pr.width; H = pr.height; if (W < 4 || H < 4) return false;
      D = Math.min(W, H); dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W * 0.5;
      const orr = oppRef?.current?.getBoundingClientRect();
      if (orr && orr.width) { ox = orr.left - pr.left + orr.width / 2; oy = orr.top - pr.top + orr.height / 2; }
      else { ox = W * 0.72; oy = H * 0.5; }
      cy = oy; buildStars(); return true;
    };
    if (!measure()) return undefined;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    const maxLevel = () => (TUNE.MAX_R - TUNE.BASE_R) / TUNE.STEP_R;
    // Akkretions-Partikel (arm + log-verteilte Bahnposition tt), einmal gebaut → je Frame nur ang/pos neu.
    const disk = (() => {
      const rng = mulberry32(1234), out = [], per = Math.ceil(TUNE.DISK_DENSITY / TUNE.DISK_ARMS);
      for (let i = 0; i < TUNE.DISK_DENSITY; i++) {
        const arm = i % TUNE.DISK_ARMS, frac = (Math.floor(i / TUNE.DISK_ARMS) + rng()) / per;
        out.push({ arm, tt: Math.pow(clamp(frac, 0, 1), 1.3), sz: 0.6 + rng() * 1.0, aj: 0.45 + rng() * 0.55 });
      }
      return out;
    })();

    const sim = (simRef.current = { dormant: true, R: 0, level: 0, peakR: 0, peakLevel: 0, flyers: [], sparks: [], nova: null, pulseId: null, clock: 0, maxSince: 0, collapseArm: 0, fastCollapse: false, novaArm: false });
    // #perf: Halo-Gradient cachen — createRadialGradient ist pro Frame teuer (+ GC). Nur neu bauen, wenn sich R spürbar
    //   (>1px), die Position (Resize) oder die Farbe (Standard↔Deckfarbe-Toggle) ändert; sonst settled → Cache-Treffer.
    let haloCache = { grad: null, r: -1, cx: -1, cy: -1, col: "" };
    const spawnFlyer = (p) => {
      // #338-4: Flyer-Deckel → bei Max stapeln sich sonst viele Karten (Ruckeln); ältesten sofort einsaugen.
      if (sim.flyers.length >= TUNE.MAX_FLYERS) sim.flyers.shift();
      sim.flyers.push({ a0: Math.atan2(oy - cy, ox - cx), d0: Math.hypot(ox - cx, oy - cy) || W * 0.2,
        t: 0, col: p.col || ctrlRef.current.color, spin: (p.id % 2 ? 1 : -1) });
    };
    // #338-1: big = Implosionsbombe (2-Min-am-Max-Kollaps) → intensivere Nova; sonst normale Niederlagen-Implosion.
    //   #kollaps: big zieht sich SCHNELL zusammen (fastCollapse) bevor der Flash kommt.
    const implode = (big) => {
      // #380 Choreografie: der GROSSE Kollaps zieht sich erst schnell zusammen (fastCollapse); der weiße Flash/Nova +
      //   fx_supernova kommen DANACH (novaArm → beim Erreichen von R≈0). Der kleine/normale Kollaps blitzt sofort (nur
      //   bei ausreichend großem Peak) — ohne Supernova.
      // #: „grew" = das Loch war vor dem Kollaps ausreichend gewachsen (Peak-Level ≥ Schwelle) → nur dann spielt der
      //   kleine Implosions-Sound (Battlefield gated). Vor dem Reset lesen. Der große Kollaps (big) ist immer „grew".
      const grew = sim.peakLevel >= TUNE.IMPLODE_SND_MIN_LEVEL;
      if (big) { sim.fastCollapse = true; sim.novaArm = true; }
      else { if (sim.peakR >= TUNE.NOVA_THRESH * D) sim.nova = { t: 0, big: false }; sim.fastCollapse = false; }
      sim.level = 0; sim.peakR = 0; sim.peakLevel = 0; sim.dormant = true; sim.maxSince = 0; sim.collapseArm = 0;
      // #375 Zusammenzieh-Sound (Impact) am Kollaps-START — Turbo-Faktor (1/scale) mitgeben, damit er bei schnellen Kollapsen mitzieht.
      const c = ctrlRef.current; c.onImplode && c.onImplode(!!big, 1 / clamp(c.scale || 1, 0.45, 1), grew);
    };

    const roundRect = (x, y, w, h, r) => roundRectPath(ctx, x, y, w, h, r);
    // #338-4: eingesogene Karte = Deck-RÜCKSEITE aus dem Offscreen-Cache (drawImage), KEIN Wert mehr. Fallback (Cache
    //   noch nicht geladen / keine backSrc): schlichte dunkle Rückseite mit dezentem Innenrahmen (ebenfalls ohne Zahl).
    const drawCard = (x, y, sc, rot, col, alpha) => {
      const w = CARD_W * sc, h = CARD_H * sc, rad = Math.max(3, w * 0.06);
      ctx.save(); ctx.globalCompositeOperation = "source-over"; ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = Math.max(0, alpha);
      const bk = backRef.current;
      if (bk.ready && bk.canvas) {
        ctx.save(); roundRect(-w / 2, -h / 2, w, h, rad); ctx.clip(); ctx.drawImage(bk.canvas, -w / 2, -h / 2, w, h); ctx.restore();
        ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(hexRGB(col), 0.5); roundRect(-w / 2, -h / 2, w, h, rad); ctx.stroke();
      } else {
        ctx.fillStyle = "#12121a"; ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.shadowBlur = 3; ctx.shadowColor = col;
        roundRect(-w / 2, -h / 2, w, h, rad); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.lineWidth = 1; ctx.strokeStyle = rgba(hexRGB(col), 0.4); roundRect(-w * 0.34, -h * 0.34, w * 0.68, h * 0.68, Math.max(2, w * 0.05)); ctx.stroke();
      }
      ctx.restore();
    };

    let raf = 0, last = 0;
    const MIN_MS = frameMinMs(); let lastDraw = -1e9;
    const step = (now) => {
      // #perf-overlay-2: Brett verdeckt → nichts simulieren und nichts zeichnen. Der rAF-Takt läuft weiter (leere
      //   Callback ≈ gratis) und `last` wird zurückgesetzt, damit beim Zurückkehren kein Riesen-dt die Sim durchreißt.
      if (ctrlRef.current.boardVisible === false) { last = 0; raf = requestAnimationFrame(step); return; }
      // #perf-mobile: ~30 Zeichnungen/s. Anders als bei den Feld-Effekten läuft hier eine SIMULATION mit — die darf
      //   nicht ausgesetzt werden, sonst zuckt das Loch. Deshalb wird der Frame komplett übersprungen (dt sammelt
      //   sich im nächsten an, `last` bleibt stehen) statt nur das Zeichnen zu überspringen.
      if (now - lastDraw < MIN_MS) { raf = requestAnimationFrame(step); return; }
      lastDraw = now;
      if (!last) last = now;
      const dt = Math.min(50, now - last); last = now;
      const ctrl = ctrlRef.current;
      // #375 Lochgröße ans Loop-Bett melden — nur bei Änderung (level ist piecewise-konstant → kein Frame-Spam).
      if (sim.level !== sim._emitLevel) { sim._emitLevel = sim.level; ctrl.onSize && ctrl.onSize(sim.level, maxLevel()); }
      const speed = 1 / clamp(ctrl.scale || 1, 0.45, 1);   // Turbo: kleiner scale → schneller
      const sdt = dt * speed;
      sim.clock += sdt;
      const cDeck = hexRGB(ctrl.color || "#4aa0ff"), cDeck2 = hexRGB(ctrl.color2 || ctrl.color || "#ff3ea8"), WHITE = { r: 255, g: 255, b: 255 };

      // Puls verarbeiten: Sieg → wachsen + Karte einsaugen; Niederlage → schrumpfen (heat-artig), bei level<=0 Implosion.
      if (ctrl.pulse && ctrl.pulse.id !== sim.pulseId) {
        sim.pulseId = ctrl.pulse.id; const p = ctrl.pulse;
        if (p.kind === "loss") {
          if (!sim.dormant) { sim.level -= Math.max(TUNE.LOSS_MIN, sim.level * TUNE.LOSS_PCT); if (sim.level <= 0) implode(false); }
        } else if (p.kind === "collapse") {
          // #kollaps: gescripteter Kollaps (Shop-Vorschau) → ARMIERT das (komprimierte) Vorbeben; nach COLLAPSE_ARM_MS
          //   zieht es sich zusammen + Nova. In-game kommt der big-Kollaps aus dem 2-Min-am-Max-Timer (mit echtem 30-s-Zucken).
          if (!sim.dormant && sim.collapseArm <= 0) sim.collapseArm = TUNE.COLLAPSE_ARM_MS;
        } else { // Sieg
          if (sim.dormant) { sim.dormant = false; sim.level = 0; sim.peakR = 0; sim.peakLevel = 0; }
          sim.level = Math.min(maxLevel(), sim.level + 1);
          sim.peakLevel = Math.max(sim.peakLevel, sim.level); // #: Peak-Level für den Implosions-Sound-Gate (grew)
          // #: Auf hohem Turbo (schneller Takt) würden zu viele Karten gleichzeitig fliegen → unruhig/unlesbar. Trick:
          //   den gleichzeitigen Flyer-Deckel dynamisch senken; überzählige Siege spawnen dann KEINE Karte (übersprungen).
          //   Das Loch wächst trotzdem regulär (level bereits erhöht) — nur die Einflug-Karte entfällt.
          const cap = speed > 1.6 ? 2 : speed > 1.25 ? 3 : TUNE.MAX_FLYERS;
          if (sim.flyers.length < cap) spawnFlyer(p);
        }
      }

      // Größe smooth ans Level annähern; dormant → in sich zusammen. #kollaps: big-Kollaps zieht SCHNELL zusammen
      //   (FAST_COLLAPSE_SPD) → dann Flash; die normale Niederlagen-Implosion bleibt gemächlich (IMPLODE_SPD).
      const targetR = (sim.dormant || sim.level <= 0) ? 0 : clamp(TUNE.BASE_R * D + (sim.level - 1) * TUNE.STEP_R * D, 0, TUNE.MAX_R * D);
      const collapseSpd = sim.dormant ? (sim.fastCollapse ? TUNE.FAST_COLLAPSE_SPD : TUNE.IMPLODE_SPD) : TUNE.SMOOTH;
      sim.R += (targetR - sim.R) * Math.min(1, collapseSpd * speed);
      if (sim.fastCollapse && sim.R < 0.5) {
        sim.fastCollapse = false;
        // #380 Zusammenziehen fertig → jetzt bricht der weiße Flash aus: Nova spawnen + onNova (fx_supernova, nur big).
        if (sim.novaArm) { sim.novaArm = false; sim.nova = { t: 0, big: true }; const c = ctrlRef.current; c.onNova && c.onNova(true); }
      }
      sim.peakR = Math.max(sim.peakR, sim.R);
      const fill = clamp(sim.level / maxLevel(), 0, 1);

      // #338-1: 2-Min-am-Max → Implosionsbombe (big-Nova); Timer über ECHTZEIT (unskaliertes dt).
      if (!sim.dormant && sim.level >= maxLevel() - 1e-6) {
        sim.maxSince += dt;
        if (sim.maxSince >= TUNE.MAX_HOLD_S * 1000) implode(true);
      } else sim.maxSince = 0;
      // #kollaps: Shudder 0..1 — in-game aus den letzten SHUDDER_S s am Max; Vorschau aus dem komprimierten
      //   collapseArm-Countdown (der am Ende implodiert). Beides ramp't das „Zucken" hoch.
      let shudder = (!sim.dormant && sim.maxSince > 0)
        ? clamp((sim.maxSince - (TUNE.MAX_HOLD_S - TUNE.SHUDDER_S) * 1000) / (TUNE.SHUDDER_S * 1000), 0, 1) : 0;
      if (sim.collapseArm > 0) {
        sim.collapseArm -= dt;
        shudder = Math.max(shudder, clamp(1 - sim.collapseArm / TUNE.COLLAPSE_ARM_MS, 0, 1));
        if (sim.collapseArm <= 0) { sim.collapseArm = 0; implode(true); }
      }
      /* Vorbeben hörbar machen: gestuft gemeldet (0,05er-Schritte), sonst feuerte der Callback in JEDEM
         Frame. Der Aufrufer hebt Pegel und Tonhöhe des Loop-Betts damit leicht an — dieselbe Rampe, die
         man gleichzeitig sieht. */
      const shStep = Math.round(shudder * 20) / 20;
      if (shStep !== sim._emitShudder) { sim._emitShudder = shStep; ctrl.onShudder && ctrl.onShudder(shStep); }

      // Vorbeben: das Loch zuckt subtil (Render-Radius), zunehmend schneller — „nicht zu krass" (max ~6 %).
      let R = sim.R;
      if (shudder > 0) {
        const amp = shudder * shudder * 0.06;                         // ease-in
        const f = 0.010 + shudder * 0.045;                            // Frequenz ramping (langsam → schnell)
        const wob = Math.sin(sim.clock * f) * 0.6 + Math.sin(sim.clock * f * 2.7 + 1.3) * 0.4;
        R = Math.max(0, sim.R * (1 + amp * wob));
      }
      const coreR = TUNE.CORE_SIZE * R;

      ctx.clearRect(0, 0, W, H);
      const busy = R > 0.5 || sim.flyers.length || sim.sparks.length || sim.nova;
      if (!busy) { raf = requestAnimationFrame(step); return; }

      // 1) Hintergrund-Sterne (werden vom opaken Kern verdeckt). Bewusst „source-over" (NICHT additiv) + gedämpfte Alpha
      //    + weich blau-weiße Farbe → knackige, kleine Sternpunkte statt überbelichteter weißer Bloom-Blobs.
      const STAR = { r: 202, g: 220, b: 255 };
      const drawStars = (arr, aMul) => { ctx.globalCompositeOperation = "source-over";
        for (const s of arr) { s.x += s.dx * sdt; s.y += s.dy * sdt; if (s.x < 0) s.x += W; else if (s.x > W) s.x -= W; if (s.y < 0) s.y += H; else if (s.y > H) s.y -= H;
          ctx.fillStyle = rgba(STAR, aMul); ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, PI2); ctx.fill(); } };
      if (!reduced) drawStars(bgStars, 0.20);

      // Akkretions-Partikel: Position + Vorder/Hinterseite je Frame berechnen.
      const drawDisk = (frontWanted) => {
        if (R <= 0.5) return;
        ctx.globalCompositeOperation = "lighter";
        const nDraw = Math.max(0, Math.round(TUNE.DISK_DENSITY * (0.25 + 0.75 * fill)));
        const rotBase = sim.clock * 0.001 * TUNE.ROT_SPEED;
        // #partikel-weniger-weiss: bei kleinem Loch sammeln sich alle Partikel eng → additives Stapeln blies zu Weiß aus.
        //   sizeMul (0..1, voll ab R≈16% von D) dämpft sowohl den Kern-Weißanteil als auch die Grund-Helligkeit klein.
        const sizeMul = clamp(R / (0.16 * D), 0, 1);
        // #338-2: bigK 0..1 (klein..groß) — bei großem Loch Sättigung/Definition anheben (weniger Weiß, vollere Alpha)
        //   → Scheibe wirkt definiert statt ausgewaschen; bei kleinem Loch bleibt das additive Weiß stärker gedämpft.
        const bigK = clamp((R - 0.24 * D) / (0.30 * D), 0, 1);
        for (let i = 0; i < nDraw; i++) {
          const p = disk[i];
          const rad = lerp(coreR * 1.03, R, p.tt);
          const ang = p.arm * (PI2 / TUNE.DISK_ARMS) + p.tt * TUNE.DISK_TURNS * PI2 + rotBase * (0.5 + (1 - p.tt) * 1.7);
          const s = Math.sin(ang); const front = s > 0;
          if (front !== frontWanted) continue;
          const x = cx + Math.cos(ang) * rad, y = cy + s * rad * TUNE.TILT;
          // Farbe: außen deck → innen deck2, heißer Kern nur DEZENT weiß, erst bei größerem Loch (sizeMul) UND bei großem
          //   Loch NOCH weniger Weiß (·(1−0.55·bigK)) → satte, definierte Farbe statt Wäsche.
          let col = mixRGB(cDeck, cDeck2, 1 - p.tt);
          if (p.tt < 0.18) col = mixRGB(col, WHITE, (0.18 - p.tt) / 0.18 * 0.20 * sizeMul * (1 - 0.55 * bigK));
          // klein: Grund-Alpha stärker gedämpft (0.40 statt 0.55 → weniger Weiß-Clip) · groß: +0.45·bigK → vollere,
          //   definierte Partikel (Clamp macht mehr davon voll deckend = knackiger).
          const a = clamp(p.aj * TUNE.BRIGHT * (0.30 + 0.55 * (1 - p.tt)) * (reduced ? 0.5 : 1) * (0.24 + 0.62 * sizeMul) * (1 + 0.45 * bigK), 0, 1); // #: klein noch stärker gedämpft (0.40→0.24) → kein greller Blob am kleinen Loch
          const sz = p.sz * TUNE.DISK_THICK * (0.7 + 0.9 * (1 - p.tt));
          ctx.fillStyle = rgba(col, a); ctx.beginPath(); ctx.arc(x, y, sz, 0, PI2); ctx.fill();
        }
      };
      // 2) Akkretion HINTER dem Loch (obere Umlauf-Hälfte, sin<0).
      drawDisk(false);

      // 3) Karten-Flyer: schneller Einflug + SEHR schnelles Schrumpfen auf Orbit-Größe, dann mehrere ENGE Umläufe ums
      //    Loch — dabei läuft die Karte auch HINTER dem Kern durch (Tiefen-Occlusion): sin(Winkel)<0 → hinten (vor dem
      //    opaken Kern gezeichnet → verdeckt), sin>0 → vorne (über dem Kern). Erst ab ORBIT_END spiralig in den Kern.
      const flyDurMs = TUNE.FLYIN_DUR * 1000;
      const orbitR = Math.max(TUNE.ORBIT_R * D, R * TUNE.ORBIT_TIGHT);   // #338-4: Bahn enger an R → skaliert stimmig mit der Loch-Größe
      const easeOut = (t) => t * (2 - t);
      const backFlyers = [], frontFlyers = [];
      for (let i = sim.flyers.length - 1; i >= 0; i--) {
        const f = sim.flyers[i]; f.t += sdt / flyDurMs;
        if (f.t >= 1) { sim.flyers.splice(i, 1); for (let s2 = 0; s2 < TUNE.SPARKS; s2++) sim.sparks.push({ a: Math.random() * PI2, sp: 0.6 + Math.random() * 1.2, t: 0, c: f.col }); continue; }
        const tt = f.t;
        const ang = f.a0 + f.spin * tt * TUNE.SPIRAL_TURNS * PI2;   // Umlauf-Winkel (mehrere enge Runden ums Loch)
        let rr, sc, alpha;
        if (tt < TUNE.SHRINK_IN) {              // schneller Einflug + schnelles Schrumpfen auf Orbit-Größe
          const e = easeOut(tt / TUNE.SHRINK_IN);
          rr = lerp(f.d0, orbitR, e); sc = lerp(1.0, TUNE.ORBIT_SC, e); alpha = lerp(0.6, 0.95, e);
        } else if (tt < TUNE.ORBIT_END) {       // enge Umlaufbahn ums Loch (konstant klein)
          rr = orbitR; sc = TUNE.ORBIT_SC; alpha = 0.95;
        } else {                                // spiralig in den Kern gesogen (schrumpft auf 0, blendet aus)
          const k = (tt - TUNE.ORBIT_END) / (1 - TUNE.ORBIT_END);
          rr = orbitR * (1 - Math.pow(k, 1.6)); sc = TUNE.ORBIT_SC * (1 - k); alpha = 0.95 * (1 - k);
        }
        const sd = Math.sin(ang);                       // Tiefe: sd<0 → hinter dem Kern, sd>0 → davor
        const depthCue = 0.82 + 0.18 * sd;              // vorne etwas größer, hinten etwas kleiner
        const x = cx + Math.cos(ang) * rr, y = cy + sd * rr * TUNE.ORBIT_TILT;
        const rot = Math.sin(ang) * 0.35 * f.spin;      // sanftes Kippen statt wildem Durchdrehen
        (sd < 0 ? backFlyers : frontFlyers).push({ x, y, sc: sc * depthCue, rot, col: f.col, alpha });
      }
      const drawFlyerList = (list) => { for (const fr of list) drawCard(fr.x, fr.y, fr.sc, fr.rot, fr.col, fr.alpha); };
      // Karten HINTEN (untere/hintere Umlauf-Hälfte) — jetzt zeichnen, gleich verdeckt sie der opake Kern.
      drawFlyerList(backFlyers);

      if (R > 0.5) {
        // 4) Surround-Halo (deck2-getönt) → silhouettiert das Loch nur noch dezent gegen den dunklen BG.
        //    #bloom-runter²: Halo enger (1.55→1.35·R) + noch dunkler (0.07/0.028) → weniger Schein-Dicke.
        ctx.globalCompositeOperation = "lighter";
        // #perf: Gradient nur neu bauen, wenn R (>1px), Position oder Farbe wechselt — sonst gecachten weiterverwenden.
        const haloCol = ctrl.color2 || ctrl.color || "#ff3ea8";
        if (!haloCache.grad || Math.abs(haloCache.r - R) > 1 || haloCache.cx !== cx || haloCache.cy !== cy || haloCache.col !== haloCol) {
          const g = ctx.createRadialGradient(cx, cy, coreR * 0.6, cx, cy, R * 1.35);
          g.addColorStop(0, rgba(cDeck2, 0.07)); g.addColorStop(0.5, rgba(cDeck2, 0.028)); g.addColorStop(1, "transparent");
          haloCache = { grad: g, r: R, cx, cy, col: haloCol };
        }
        ctx.fillStyle = haloCache.grad; ctx.beginPath(); ctx.arc(cx, cy, R * 1.35, 0, PI2); ctx.fill();

        // 5) Solider, OPAKER schwarzer Kern — globalAlpha VOR dem Kern auf 1 (sonst erbt er das Rest-Alpha der Schleife).
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, PI2); ctx.fill();

        // #338-3: Reflexion → der Kern liest als 3D-KUGEL statt flacher Scheibe. Auf den Kern GECLIPPT: (a) weiches
        //   spekulares Highlight oben-links (Lichtquelle), (b) Rim-Light am oberen/linken Rand. Dezent deck-weiß getönt,
        //   additiv über dem opak-schwarzen Kern; reduced → schwächer (Photosensitivität).
        if (!reduced && coreR > 3) {
          const hglow = mixRGB(cDeck, WHITE, 0.65);
          ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, PI2); ctx.clip(); ctx.globalCompositeOperation = "lighter";
          const hx = cx - coreR * 0.36, hy = cy - coreR * 0.42, hr = coreR * 0.72;
          const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
          hg.addColorStop(0, rgba(hglow, 0.22)); hg.addColorStop(0.6, rgba(hglow, 0.05)); hg.addColorStop(1, "transparent");
          ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(hx, hy, hr, 0, PI2); ctx.fill();
          ctx.lineWidth = Math.max(1, coreR * 0.09); ctx.strokeStyle = rgba(hglow, 0.5);
          ctx.beginPath(); ctx.arc(cx, cy, coreR * 0.93, Math.PI * 0.95, Math.PI * 1.55); ctx.stroke();
          ctx.restore();
        }

        // 6) Photonenring (additiv, DÜNN #338-3: RING_W) + schwache Definitions-Kante am Kernrand.
        ctx.globalCompositeOperation = "lighter";
        ctx.lineWidth = Math.max(1.0, coreR * TUNE.RING_W); ctx.strokeStyle = rgba(mixRGB(cDeck, WHITE, 0.30), 0.85);
        ctx.shadowBlur = 2 + TUNE.RING_GLOW * 60; ctx.shadowColor = ctrl.color || "#4aa0ff";
        ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, PI2); ctx.stroke();
        ctx.shadowBlur = 0; ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.0; ctx.strokeStyle = rgba(WHITE, 0.7); ctx.beginPath(); ctx.arc(cx, cy, coreR * 0.98, 0, PI2); ctx.stroke(); ctx.globalAlpha = 1;

        // 7) Akkretion VOR dem Loch (untere Umlauf-Hälfte, sin>0) → zieht über den Kern (Wrap).
        drawDisk(true);
      }

      // 7b) Karten VORNE (vordere Umlauf-Hälfte, sin>0) → über dem Kern, damit die Umlaufbahn wirklich UM das Loch führt.
      drawFlyerList(frontFlyers);
      // Funken beim Verschlucken (über dem Kern). #bloom-runter: Funken-Schein 6→2.
      ctx.globalCompositeOperation = "lighter";
      for (let i = sim.sparks.length - 1; i >= 0; i--) { const sp = sim.sparks[i]; sp.t += sdt / 500; if (sp.t >= 1) { sim.sparks.splice(i, 1); continue; }
        const rr = 28 * sp.t * sp.sp, c = hexRGB(sp.c); ctx.globalAlpha = 1 - sp.t; ctx.fillStyle = rgba(c, 1); ctx.shadowBlur = 2; ctx.shadowColor = sp.c;
        ctx.beginPath(); ctx.arc(cx + Math.cos(sp.a) * rr, cy + Math.sin(sp.a) * rr, 2, 0, PI2); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;

      // 8) Vordergrund-Sterne (über dem Loch sichtbar).
      if (!reduced) drawStars(fgStars, 0.30);

      // Nova: heller Flash + elliptische Schockwelle(n) IN DER SCHEIBEN-EBENE (Neigung = TUNE.TILT, #338-1). `big` =
      //   2-Min-am-Max-Kollaps → Implosionsbombe: greller Flash, mehrere schnelle/dicke Ringe. reduced dämpft (Photosensitivität).
      if (sim.nova) {
        const nv = sim.nova; nv.t += sdt / (TUNE.NOVA_DUR * 1000);
        if (nv.t >= 1) { sim.nova = null; }
        else {
          const big = !!nv.big, dim = reduced ? 0.4 : 1, fade = 1 - nv.t;
          ctx.globalCompositeOperation = "lighter";
          // #kollaps: greller, kurzer WEISS-Flash (big front-geladen: pow(fade,2)) — der Blitz zur Implosion.
          const flashK = big ? Math.pow(fade, 2.0) : fade;
          const fr = TUNE.NOVA_R * D * (0.2 + 0.5 * nv.t) * (big ? 1.95 : 1);
          const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, fr);
          fg.addColorStop(0, rgba(WHITE, (big ? 0.98 : 0.5) * flashK * dim));
          fg.addColorStop(0.32, rgba(mixRGB(cDeck, WHITE, big ? 0.55 : 0), (big ? 0.55 : 0.28) * fade * dim));
          fg.addColorStop(1, "transparent");
          ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, fr, 0, PI2); ctx.fill();
          // #kollaps: wuchtige Schockwelle(n) in der Scheiben-Ebene (TILT). big = mehrere gestaffelte Ringe, DICK &
          //   SCHNELL, der FÜHRENDE Ring hell-weiß → beeindruckende Puls-Welle. reduced dämpft (Photosensitivität).
          const rings = big ? [1, 0.66, 0.40] : [1];
          for (let ri = 0; ri < rings.length; ri++) {
            const rk = rings[ri];
            const sw = TUNE.NOVA_R * D * nv.t * (big ? 2.1 : 1) * rk;
            ctx.globalAlpha = fade * dim * (0.6 + 0.4 * rk);
            ctx.lineWidth = Math.max(1.5, (big ? 15 : 5) * fade * (ri === 0 ? 1 : 0.65));
            ctx.strokeStyle = (big && ri === 0) ? rgba(mixRGB(cDeck2, WHITE, 0.6), 1) : rgba(cDeck2, 1);
            ctx.shadowBlur = (big && !reduced) ? 26 : 10; ctx.shadowColor = ctrl.color2 || "#ff3ea8";
            ctx.beginPath(); ctx.ellipse(cx, cy, sw, sw * TUNE.TILT, 0, 0, PI2); ctx.stroke();
          }
          ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        }
      }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); ctx.clearRect(0, 0, W, H); simRef.current = null; };
    // Deps bewusst nur [active, panelRef, oppRef, reduced]: laufende Steuerwerte (pulse/scale/color) über ctrlRef.
     
  }, [active, panelRef, oppRef, reduced]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none rounded-xl" style={{ zIndex: 22 }} aria-hidden="true" />;
}

export default BlackholeFx;
