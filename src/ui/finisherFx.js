/* #293 Karten-Finisher — Canvas-Vorschau (Laser-Schnitt · Shatter · Schwarzes Loch).
   Rein für die große Shop-Vorschau: zeichnet den Effekt an einer Demo-Karte, skaliert auf den Container und im
   Loop — dieselbe „canvas-glatte" Anmutung wie die Gottgleich-Vorschau. In-game bleiben die Finisher DOM-basiert
   (SliceFx/ExplosionFx/BlackholeFx, feldweit skaliert); diese Vorschau ist eine kartennahe Nachstellung.

   startFinisher(canvas, { variant, color, cardSrc, loop }) → Cleanup-Funktion. Größe aus clientWidth/Height. */
const imgCache = {};
function loadImg(src) {
  if (imgCache[src]) return imgCache[src];
  const im = new Image(); im.src = src; imgCache[src] = im; return im;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function startFinisher(canvas, { variant, color = "#35e0ff", cardSrc, loop = true } = {}) {
  if (!canvas) return () => {};
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (W < 4 || H < 4) return () => {};
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  ctx.scale(dpr, dpr);

  const img = cardSrc ? loadImg(cardSrc) : null;
  const PI2 = Math.PI * 2;
  const cardH = H * 0.5, cardW = cardH * 0.72; // Kartenverhältnis ~104:144
  const cx = W / 2, cy = H * 0.54;
  const rx = cx - cardW / 2, ry = cy - cardH / 2;
  const TTL = variant === "blackhole" ? 2600 : 2500;
  const cardReady = () => img && img.complete && img.naturalWidth > 0;
  const drawCard = (dx, dy, dw, dh) => { if (cardReady()) ctx.drawImage(img, dx, dy, dw, dh); else { ctx.fillStyle = "#16202e"; ctx.fillRect(dx, dy, dw, dh); } };

  // Pro Zyklus neu gewürfelte Parameter (Laser-Winkel/Versatz, Shard-Streuung, Sterne) — bei loop je Runde neu.
  let A1, A2, ox, oy, shards, stars;
  function seed() {
    if (variant === "laser") {
      A1 = (52 + (Math.random() * 16 - 8)) * Math.PI / 180;
      A2 = (-52 + (Math.random() * 16 - 8)) * Math.PI / 180;
      ox = (Math.random() * 0.28 - 0.14) * cardW; oy = (Math.random() * 0.28 - 0.14) * cardH;
    } else if (variant === "shatter") {
      shards = [];
      const R = 5, C = 4;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const dirX = (c + 0.5) / C - 0.5, dirY = (r + 0.5) / R - 0.5, sp = 0.7 + Math.random() * 0.8;
        shards.push({ r, c, R, C, vx: dirX * sp, vy: dirY * sp + 0.15, rot: (Math.random() * 2 - 1) * 1.2 });
      }
    } else {
      stars = [];
      const N = 16;
      for (let i = 0; i < N; i++) stars.push({ a0: (i / N) * PI2 + Math.random() * 0.6,
        r0: cardH * (0.34 + Math.random() * 0.3), spin: 2 + Math.random() * 2, rEnd: 4 + Math.random() * 10,
        t0: Math.random() * 0.22, w: 1 + Math.random() * 1.6, white: i % 3 === 0 });
    }
  }
  seed();

  function drawLaser(k) {
    const cutK = clamp(k / 0.26, 0, 1);
    const splitP = k < 0.26 ? 0 : easeOut((k - 0.26) / 0.74);
    const px = cx + ox, py = cy + oy;
    if (splitP <= 0) { drawCard(rx, ry, cardW, cardH); }
    else {
      const dirs = [A1, A2, A1 + Math.PI, A2 + Math.PI].sort((a, b) => a - b);
      const BIG = Math.hypot(W, H);
      for (let s = 0; s < 4; s++) {
        const dA = dirs[s], dB = dirs[(s + 1) % 4] + (s === 3 ? PI2 : 0), mid = (dA + dB) / 2;
        const dist = splitP * cardH * 0.16; // Laser: geringe Drift (nah am Deck)
        ctx.save();
        ctx.beginPath(); ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(dA) * BIG, py + Math.sin(dA) * BIG);
        ctx.lineTo(px + Math.cos(dB) * BIG, py + Math.sin(dB) * BIG);
        ctx.closePath(); ctx.clip();
        ctx.globalAlpha = 1 - splitP;
        drawCard(rx + Math.cos(mid) * dist, ry + Math.sin(mid) * dist, cardW, cardH);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    // Zwei Neon-Strahlen (weißer Kern + farbiger Glow), wachsen aus dem Kreuzungspunkt.
    const beamA = k < 0.5 ? 1 : Math.max(0, 1 - (k - 0.5) / 0.5);
    ctx.globalCompositeOperation = "lighter";
    const len = Math.hypot(W, H) * cutK;
    for (const a of [A1, A2]) {
      const x1 = px - Math.cos(a) * len, y1 = py - Math.sin(a) * len, x2 = px + Math.cos(a) * len, y2 = py + Math.sin(a) * len;
      ctx.globalAlpha = beamA * 0.5; ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.shadowBlur = 16; ctx.shadowColor = color;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, "transparent"); grad.addColorStop(0.5, "#ffffff"); grad.addColorStop(1, "transparent");
      ctx.globalAlpha = beamA; ctx.strokeStyle = grad; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  function drawShatter(k) {
    const sh = k < 0.14 ? 0 : easeOut((k - 0.14) / 0.86);
    if (sh <= 0) { drawCard(rx, ry, cardW, cardH); return; }
    const iw = cardReady() ? img.naturalWidth : cardW, ih = cardReady() ? img.naturalHeight : cardH;
    const spread = Math.min(W, H) * 0.5;
    for (const s of shards) {
      const cw = cardW / s.C, ch = cardH / s.R;
      const ccx = rx + s.c * cw + cw / 2, ccy = ry + s.r * ch + ch / 2;
      const dx = s.vx * spread * sh, dy = s.vy * spread * sh + 40 * sh * sh;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - sh);
      ctx.translate(ccx + dx, ccy + dy); ctx.rotate(s.rot * sh);
      if (cardReady()) ctx.drawImage(img, (s.c / s.C) * iw, (s.r / s.R) * ih, iw / s.C, ih / s.R, -cw / 2, -ch / 2, cw, ch);
      else { ctx.fillStyle = color; ctx.fillRect(-cw / 2, -ch / 2, cw, ch); }
      ctx.restore();
    }
    ctx.globalCompositeOperation = "lighter";
    const PN = 22;
    for (let i = 0; i < PN; i++) {
      const ang = (i / PN) * PI2, rad = spread * sh * (0.5 + ((i * 7) % 10) / 10);
      ctx.globalAlpha = Math.max(0, 1 - sh); ctx.fillStyle = i % 3 ? color : "#ffffff"; ctx.shadowBlur = 8; ctx.shadowColor = color;
      ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, 2, 0, PI2); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  function drawBlackhole(k) {
    const impK = easeOut(clamp(k / 0.4, 0, 1));
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - impK);
    ctx.translate(cx, cy); ctx.rotate(impK * Math.PI * 3); const sc = 1 - 0.97 * impK; ctx.scale(sc, sc);
    drawCard(-cardW / 2, -cardH / 2, cardW, cardH);
    ctx.restore(); ctx.globalAlpha = 1;
    // Ereignishorizont
    const rr = 12 * (0.25 + impK) * (k > 0.42 ? Math.max(0, 1 - (k - 0.42) / 0.22) : 1);
    if (rr > 1) {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.shadowBlur = 14; ctx.shadowColor = color;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, PI2); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = "rgba(5,5,10,0.92)"; ctx.beginPath(); ctx.arc(cx, cy, rr * 0.7, 0, PI2); ctx.fill();
    }
    // Akkretions-Sterne: spiralen ein und bleiben als kleine funkelnde Sterne, faden dann aus.
    ctx.globalCompositeOperation = "lighter";
    for (const st of stars) {
      const t = k - st.t0;
      if (t < 0) continue;
      const tp = t / (1 - st.t0);
      const inP = clamp(tp / 0.46, 0, 1);
      const rad = st.r0 * (1 - easeOut(inP)) + st.rEnd * easeOut(inP);
      const ang = st.a0 + st.spin * PI2 * easeOut(inP) + (tp > 0.46 ? (tp - 0.46) * st.spin * 2 : 0);
      const twk = 0.55 + 0.45 * Math.sin(tp * 14 + st.a0);
      const a = (tp < 0.1 ? tp / 0.1 : 1) * Math.max(0, 1 - Math.max(0, (tp - 0.7) / 0.3)) * twk;
      ctx.globalAlpha = a; ctx.fillStyle = st.white ? "#ffffff" : color; ctx.shadowBlur = 6; ctx.shadowColor = st.white ? "#ffffff" : color;
      ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, st.w, 0, PI2); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  let raf = 0, start = 0;
  const step = (now) => {
    if (!start) start = now;
    let el = now - start;
    if (loop && el >= TTL) { start = now; el = 0; seed(); }
    const k = el / TTL;
    ctx.clearRect(0, 0, W, H);
    if (variant === "laser") drawLaser(k);
    else if (variant === "shatter") drawShatter(k);
    else drawBlackhole(k);
    if (loop || el < TTL) raf = requestAnimationFrame(step);
    else ctx.clearRect(0, 0, W, H);
  };
  raf = requestAnimationFrame(step);
  return () => { cancelAnimationFrame(raf); ctx.clearRect(0, 0, W, H); };
}
