/* #294 Gottgleich-Prunk — gemeinsame Canvas-2D-Engine (rAF-Physik).
   Genutzt in-game (Battlefield/PrunkFx, one-shot) UND in der Shop-Vorschau (loop) → identische Wucht.
   Feuerwerk = frameweise integrierte Partikel mit Wand-Reflexion (Flipper-Wumms wie der Krit-Schwarm),
   Weißgold-Regen = dichter Funken-/Konfetti-Schauer, Prisma-Welle = expandierende Regenbogen-Ringe.

   startPrunk(canvas, opts) richtet das Canvas ein und startet die Schleife; gibt eine Cleanup-Funktion zurück
   (rAF abbrechen + löschen). Größe wird aus canvas.clientWidth/Height gelesen (CSS-Pixel). origin{X,Y} als
   Bruchteil (0..1) der Fläche = Ursprung von Impuls/Prisma. loop=true spielt endlos (Vorschau), sonst einmalig. */
export function startPrunk(canvas, { fireworks, goldRain, prismaWave, color, originX = 0.5, originY = 0.5, loop = false } = {}) {
  if (!canvas) return () => {};
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (W < 4 || H < 4) return () => {};
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  ctx.scale(dpr, dpr);

  const deckC = color || "#5ab87a";
  const GOLD = ["#fff0b0", "#ffd873", "#ffffff", "#ffc978"];
  const PI2 = Math.PI * 2;
  const REST = 0.72, DRAG = 0.992, G = 0.15, TTL = 2250;
  const cx = W * originX, cy = H * originY;
  const maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 20;
  const flashC = goldRain && !fireworks ? "#ffe6a0" : deckC;

  let bursts, fparts, rain, waves;
  // (Neu-)Aufsetzen der Partikel — bei loop je Zyklus für Varianz neu gewürfelt.
  function seed() {
    bursts = []; fparts = []; rain = []; waves = [];
    if (fireworks) {
      const BURSTS = 9;
      for (let b = 0; b < BURSTS; b++) {
        const bx = W * (0.12 + Math.random() * 0.76), by = H * (0.12 + Math.random() * 0.5);
        const t0 = 90 + b * 115 + Math.random() * 70;
        bursts.push({ bx, by, t0 });
        const PN = 42;
        for (let i = 0; i < PN; i++) {
          const ang = (i / PN) * PI2 + Math.random() * 0.22;
          const spd = 3.4 + Math.random() * 7.6;
          fparts.push({ bx, by, t0, x: bx, y: by, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
            r: 1.9 + Math.random() * 3, c: i % 3 === 0 ? "#ffffff" : deckC, life: 780 + Math.random() * 380, born: false });
        }
      }
    }
    if (goldRain) {
      const RN = 150;
      for (let i = 0; i < RN; i++) {
        rain.push({ x: Math.random() * W, y: -Math.random() * H * 0.7 - 6,
          vy: 1.8 + Math.random() * 3.2, drift: 0.5 + Math.random() * 1.1, ph: Math.random() * PI2,
          r: 1.6 + Math.random() * 3, c: GOLD[i % GOLD.length], t0: Math.random() * 420, tw: 0.5 + Math.random(),
          conf: i % 5 === 0 });
      }
    }
    if (prismaWave) waves = [{ t0: 40 }, { t0: 240 }, { t0: 460 }];
  }
  seed();

  let raf = 0, start = 0;
  const step = (now) => {
    if (!start) start = now;
    let el = now - start;
    if (loop && el >= TTL) { start = now; el = 0; seed(); } // Vorschau: nahtlos neu starten
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    // Wumms-Impuls: heller Einschlag-Flash + Schockwelle am Ursprung (Anfangspunch für alle Varianten).
    if (el < 320) {
      const fk = el / 320;
      const rr = 10 + fk * Math.min(W, H) * 0.5;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
      g.addColorStop(0, `rgba(255,255,255,${(1 - fk) * 0.9})`);
      g.addColorStop(0.35, `${flashC}${Math.round((1 - fk) * 200).toString(16).padStart(2, "0")}`);
      g.addColorStop(1, "transparent");
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, PI2); ctx.fill();
    }
    // Feuerwerk: Zünd-Flash je Burst + frameweise Integration mit Wand-Reflexion.
    for (const b of bursts) {
      const lt = el - b.t0;
      if (lt < 0 || lt > 220) continue;
      const fk = lt / 220, rr = 6 + fk * 32;
      const g = ctx.createRadialGradient(b.bx, b.by, 0, b.bx, b.by, rr);
      g.addColorStop(0, `rgba(255,255,255,${(1 - fk) * 0.95})`); g.addColorStop(0.4, deckC); g.addColorStop(1, "transparent");
      ctx.globalAlpha = 1 - fk; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.bx, b.by, rr, 0, PI2); ctx.fill();
    }
    for (const p of fparts) {
      if (el < p.t0) continue;
      if (!p.born) { p.born = true; p.x = p.bx; p.y = p.by; }
      p.vy += G; p.vx *= DRAG; p.vy *= DRAG; p.x += p.vx; p.y += p.vy;
      if (p.x < p.r) { p.x = p.r; p.vx = -p.vx * REST; } else if (p.x > W - p.r) { p.x = W - p.r; p.vx = -p.vx * REST; }
      if (p.y < p.r) { p.y = p.r; p.vy = -p.vy * REST; } else if (p.y > H - p.r) { p.y = H - p.r; p.vy = -p.vy * REST; }
      const k = (el - p.t0) / p.life;
      if (k > 1) continue;
      ctx.globalAlpha = Math.max(0, 1 - k);
      ctx.fillStyle = p.c; ctx.shadowBlur = 14; ctx.shadowColor = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, PI2); ctx.fill();
    }
    // Weißgold-Regen
    for (const d of rain) {
      if (el < d.t0) continue;
      const lt = el - d.t0;
      const y = d.y + d.vy * lt * 0.15;
      const x = d.x + Math.sin(d.ph + lt * 0.006) * d.drift * 9;
      if (y > H + 6) continue;
      const fade = el > TTL - 500 ? Math.max(0, (TTL - el) / 500) : 1;
      ctx.globalAlpha = fade * (0.65 + 0.35 * Math.sin(d.ph + lt * 0.02 * d.tw)); // Twinkle
      ctx.fillStyle = d.c; ctx.shadowBlur = 9; ctx.shadowColor = d.c;
      if (d.conf) { ctx.fillRect(x - d.r, y - d.r * 0.6, d.r * 2, d.r * 1.2); }
      else { ctx.beginPath(); ctx.arc(x, y, d.r, 0, PI2); ctx.fill(); }
    }
    // Prisma-Wellen (dick, mit weißer Führungskante)
    ctx.shadowBlur = 0;
    for (const w of waves) {
      const lt = el - w.t0;
      if (lt < 0) continue;
      const k = lt / 1050;
      if (k > 1) continue;
      const rad = maxR * k;
      const a = Math.max(0, 1 - k);
      ctx.globalAlpha = a * 0.95;
      ctx.lineWidth = 5 + 9 * (1 - k);
      const SEG = 48;
      for (let s = 0; s < SEG; s++) {
        const a0 = (s / SEG) * PI2, a1 = ((s + 1) / SEG) * PI2;
        ctx.strokeStyle = `hsl(${(s / SEG * 360 + el * 0.5) % 360}, 100%, 62%)`;
        ctx.beginPath(); ctx.arc(cx, cy, rad, a0, a1 + 0.02); ctx.stroke();
      }
      ctx.globalAlpha = a * 0.8; ctx.lineWidth = 2.5; ctx.strokeStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(cx, cy, rad + ctx.lineWidth, 0, PI2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0;
    if (loop || el < TTL) raf = requestAnimationFrame(step);
    else ctx.clearRect(0, 0, W, H);
  };
  raf = requestAnimationFrame(step);
  return () => { cancelAnimationFrame(raf); ctx.clearRect(0, 0, W, H); };
}
