import { useEffect, useRef } from "react";

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
  FLYIN_DUR: 2.10, SPIRAL_TURNS: 2.6, ORBIT_R: 0.12, ORBIT_SC: 0.26, SHRINK_IN: 0.16, ORBIT_END: 0.80, ORBIT_TILT: 0.5, SPARKS: 2,
  NOVA_THRESH: 0.18, NOVA_R: 0.58, NOVA_DUR: 1.20, IMPLODE_SPD: 0.07,
  DISK_ARMS: 3, DISK_DENSITY: 250, DISK_TURNS: 3.0, DISK_THICK: 1.0, ROT_SPEED: 0.20,
  // Bloom fast auf 0: RING_GLOW 0 (Photonenring nur minimaler Schein), BRIGHT ~1 (Akkretion nicht mehr überbelichtet).
  TILT: 0.30, CORE_SIZE: 0.20, RING_GLOW: 0.0, BRIGHT: 1.05,
};

const PI2 = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function hexRGB(h) { let s = String(h || "#4aa0ff").replace("#", ""); if (s.length === 3) s = s.replace(/(.)/g, "$1$1"); const n = parseInt(s, 16) || 0; return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
const mixRGB = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
const rgba = (c, a) => "rgba(" + (c.r | 0) + "," + (c.g | 0) + "," + (c.b | 0) + "," + a + ")";
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function BlackholeFx({ active, pulse = null, color = "#4aa0ff", color2 = "#ff3ea8", scale = 1, panelRef, oppRef, reduced = false }) {
  const canvasRef = useRef(null);
  const simRef = useRef(null);
  const ctrlRef = useRef({ pulse: null, scale: 1, color, color2 });
  useEffect(() => { ctrlRef.current.scale = scale; }, [scale]);
  useEffect(() => { ctrlRef.current.color = color; ctrlRef.current.color2 = color2; }, [color, color2]);
  useEffect(() => { if (pulse) ctrlRef.current.pulse = pulse; }, [pulse]);

  useEffect(() => {
    if (!active || !panelRef?.current || !canvasRef.current) return undefined;
    const panel = panelRef.current, canvas = canvasRef.current;
    const ctx = canvas.getContext("2d"); if (!ctx) return undefined;

    let W = 0, H = 0, D = 1, dpr = 1, cx = 0, cy = 0, ox = 0, oy = 0;
    const cardW = 104, cardH = 144;
    // Sterne: zwei Tiefen-Ebenen (Vordergrund über dem Loch, Hintergrund verdeckt), sanfter Parallaxe-Drift, KEIN Twinkle.
    let bgStars = [], fgStars = [];
    const buildStars = () => {
      const rng = mulberry32(90210), n = Math.round((W * H) / 26000);
      bgStars = []; fgStars = [];
      for (let i = 0; i < n; i++) bgStars.push({ x: rng() * W, y: rng() * H, s: 0.35 + rng() * 0.5, dx: (rng() - 0.5) * 0.004, dy: (rng() - 0.5) * 0.004 });
      for (let i = 0; i < Math.round(n * 0.5); i++) fgStars.push({ x: rng() * W, y: rng() * H, s: 0.45 + rng() * 0.75, dx: (rng() - 0.5) * 0.010, dy: (rng() - 0.5) * 0.010 });
    };
    const measure = () => {
      const pr = panel.getBoundingClientRect(); W = pr.width; H = pr.height; if (W < 4 || H < 4) return false;
      D = Math.min(W, H); dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    const sim = (simRef.current = { dormant: true, R: 0, level: 0, peakR: 0, flyers: [], sparks: [], nova: null, pulseId: null, clock: 0 });
    const spawnFlyer = (p) => {
      sim.flyers.push({ a0: Math.atan2(oy - cy, ox - cx), d0: Math.hypot(ox - cx, oy - cy) || W * 0.2,
        t: 0, num: p.num, col: p.col || ctrlRef.current.color, spin: (p.id % 2 ? 1 : -1) });
    };
    const implode = () => {
      if (sim.peakR >= TUNE.NOVA_THRESH * D) sim.nova = { t: 0 };
      sim.level = 0; sim.peakR = 0; sim.dormant = true;
    };

    const roundRect = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    const drawCard = (x, y, sc, rot, num, col, alpha) => {
      const w = cardW * sc, h = cardH * sc;
      ctx.save(); ctx.globalCompositeOperation = "source-over"; ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = "#12121a"; ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.shadowBlur = 3; ctx.shadowColor = col; // #bloom-runter: Karten-Glow 10→3
      roundRect(-w / 2, -h / 2, w, h, Math.max(3, w * 0.06)); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = col; ctx.font = `700 ${Math.round(h * 0.42)}px system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(num), 0, 1); ctx.restore();
    };

    let raf = 0, last = 0;
    const step = (now) => {
      if (!last) last = now;
      const dt = Math.min(50, now - last); last = now;
      const ctrl = ctrlRef.current;
      const speed = 1 / clamp(ctrl.scale || 1, 0.45, 1);   // Turbo: kleiner scale → schneller
      const sdt = dt * speed;
      sim.clock += sdt;
      const cDeck = hexRGB(ctrl.color || "#4aa0ff"), cDeck2 = hexRGB(ctrl.color2 || ctrl.color || "#ff3ea8"), WHITE = { r: 255, g: 255, b: 255 };

      // Puls verarbeiten: Sieg → wachsen + Karte einsaugen; Niederlage → schrumpfen (heat-artig), bei level<=0 Implosion.
      if (ctrl.pulse && ctrl.pulse.id !== sim.pulseId) {
        sim.pulseId = ctrl.pulse.id; const p = ctrl.pulse;
        if (p.kind === "loss") {
          if (!sim.dormant) { sim.level -= Math.max(TUNE.LOSS_MIN, sim.level * TUNE.LOSS_PCT); if (sim.level <= 0) implode(); }
        } else { // Sieg
          if (sim.dormant) { sim.dormant = false; sim.level = 0; sim.peakR = 0; }
          sim.level = Math.min(maxLevel(), sim.level + 1); spawnFlyer(p);
        }
      }

      // Größe smooth ans Level annähern; dormant → langsam in sich zusammen (IMPLODE_SPD).
      const targetR = (sim.dormant || sim.level <= 0) ? 0 : clamp(TUNE.BASE_R * D + (sim.level - 1) * TUNE.STEP_R * D, 0, TUNE.MAX_R * D);
      sim.R += (targetR - sim.R) * Math.min(1, (sim.dormant ? TUNE.IMPLODE_SPD : TUNE.SMOOTH) * speed);
      sim.peakR = Math.max(sim.peakR, sim.R);
      const R = sim.R, coreR = TUNE.CORE_SIZE * R;
      const fill = clamp(sim.level / maxLevel(), 0, 1);

      ctx.clearRect(0, 0, W, H);
      const busy = R > 0.5 || sim.flyers.length || sim.sparks.length || sim.nova;
      if (!busy) { raf = requestAnimationFrame(step); return; }

      // 1) Hintergrund-Sterne (werden vom opaken Kern verdeckt). Bewusst „source-over" (NICHT additiv) + gedämpfte Alpha
      //    + weich blau-weiße Farbe → knackige, kleine Sternpunkte statt überbelichteter weißer Bloom-Blobs.
      const STAR = { r: 202, g: 220, b: 255 };
      const drawStars = (arr, aMul) => { ctx.globalCompositeOperation = "source-over";
        for (const s of arr) { s.x += s.dx * sdt; s.y += s.dy * sdt; if (s.x < 0) s.x += W; else if (s.x > W) s.x -= W; if (s.y < 0) s.y += H; else if (s.y > H) s.y -= H;
          ctx.fillStyle = rgba(STAR, aMul); ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, PI2); ctx.fill(); } };
      if (!reduced) drawStars(bgStars, 0.30);

      // Akkretions-Partikel: Position + Vorder/Hinterseite je Frame berechnen.
      const drawDisk = (frontWanted) => {
        if (R <= 0.5) return;
        ctx.globalCompositeOperation = "lighter";
        const nDraw = Math.max(0, Math.round(TUNE.DISK_DENSITY * (0.25 + 0.75 * fill)));
        const rotBase = sim.clock * 0.001 * TUNE.ROT_SPEED;
        for (let i = 0; i < nDraw; i++) {
          const p = disk[i];
          const rad = lerp(coreR * 1.03, R, p.tt);
          const ang = p.arm * (PI2 / TUNE.DISK_ARMS) + p.tt * TUNE.DISK_TURNS * PI2 + rotBase * (0.5 + (1 - p.tt) * 1.7);
          const s = Math.sin(ang); const front = s > 0;
          if (front !== frontWanted) continue;
          const x = cx + Math.cos(ang) * rad, y = cy + s * rad * TUNE.TILT;
          // Farbe: außen deck → innen deck2, heißer Kern leicht weiß.
          let col = mixRGB(cDeck, cDeck2, 1 - p.tt);
          if (p.tt < 0.22) col = mixRGB(col, WHITE, (0.22 - p.tt) / 0.22 * 0.6);
          const a = clamp(p.aj * TUNE.BRIGHT * (0.35 + 0.65 * (1 - p.tt)) * (reduced ? 0.5 : 1), 0, 1);
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
      const orbitR = Math.max(TUNE.ORBIT_R * D, R * 1.45);   // enge Umlaufbahn dicht ums Loch
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
        (sd < 0 ? backFlyers : frontFlyers).push({ x, y, sc: sc * depthCue, rot, num: f.num, col: f.col, alpha });
      }
      const drawFlyerList = (list) => { for (const fr of list) drawCard(fr.x, fr.y, fr.sc, fr.rot, fr.num, fr.col, fr.alpha); };
      // Karten HINTEN (untere/hintere Umlauf-Hälfte) — jetzt zeichnen, gleich verdeckt sie der opake Kern.
      drawFlyerList(backFlyers);

      if (R > 0.5) {
        // 4) Surround-Halo (deck2-getönt) → silhouettiert das Loch nur noch dezent gegen den dunklen BG.
        //    #bloom-runter: Alpha 0.22/0.10 → 0.09/0.035 (fast kein Glühen mehr, nur eine feine Silhouette).
        ctx.globalCompositeOperation = "lighter";
        const halo = ctx.createRadialGradient(cx, cy, coreR * 0.6, cx, cy, R * 1.55);
        halo.addColorStop(0, rgba(cDeck2, 0.09)); halo.addColorStop(0.5, rgba(cDeck2, 0.035)); halo.addColorStop(1, "transparent");
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.55, 0, PI2); ctx.fill();

        // 5) Solider, OPAKER schwarzer Kern — globalAlpha VOR dem Kern auf 1 (sonst erbt er das Rest-Alpha der Schleife).
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, PI2); ctx.fill();

        // 6) Photonenring (additiv) + definierende Kante am Kernrand.
        ctx.globalCompositeOperation = "lighter";
        ctx.lineWidth = Math.max(1.5, coreR * 0.22); ctx.strokeStyle = rgba(mixRGB(cDeck, WHITE, 0.35), 0.9);
        ctx.shadowBlur = 3 + TUNE.RING_GLOW * 60; ctx.shadowColor = ctrl.color || "#4aa0ff"; // #bloom-runter: Ring-Schein-Basis 14→3
        ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, PI2); ctx.stroke();
        ctx.shadowBlur = 0; ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1.2; ctx.strokeStyle = rgba(WHITE, 0.85); ctx.beginPath(); ctx.arc(cx, cy, coreR * 0.98, 0, PI2); ctx.stroke(); ctx.globalAlpha = 1;

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
      if (!reduced) drawStars(fgStars, 0.46);

      // Nova (bedingte Implosion): heller Flash + eine elliptische Schockwelle nach außen (über NOVA_DUR).
      if (sim.nova) {
        const nv = sim.nova; nv.t += sdt / (TUNE.NOVA_DUR * 1000);
        if (nv.t >= 1) { sim.nova = null; }
        else {
          const fade = 1 - nv.t; ctx.globalCompositeOperation = "lighter";
          const fr = TUNE.NOVA_R * D * (0.2 + 0.5 * nv.t);
          const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, fr);
          fg.addColorStop(0, rgba(WHITE, 0.5 * fade)); fg.addColorStop(0.4, rgba(cDeck, 0.28 * fade)); fg.addColorStop(1, "transparent");
          ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, fr, 0, PI2); ctx.fill();
          const sw = TUNE.NOVA_R * D * nv.t;
          ctx.globalAlpha = fade; ctx.lineWidth = Math.max(1.5, 5 * fade); ctx.strokeStyle = rgba(cDeck2, 1); ctx.shadowBlur = 10; ctx.shadowColor = ctrl.color2 || "#ff3ea8"; // #bloom-runter: Nova-Schockwelle 22→10
          ctx.beginPath(); ctx.ellipse(cx, cy, sw, sw * (0.55 + 0.45 * TUNE.TILT), 0, 0, PI2); ctx.stroke();
          ctx.globalAlpha = 1; ctx.shadowBlur = 0;
        }
      }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); ctx.clearRect(0, 0, W, H); simRef.current = null; };
    // Deps bewusst nur [active, panelRef, oppRef, reduced]: laufende Steuerwerte (pulse/scale/color) über ctrlRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, panelRef, oppRef, reduced]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none rounded-xl" style={{ zIndex: 22 }} aria-hidden="true" />;
}

export default BlackholeFx;
