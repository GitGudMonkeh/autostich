import { ParticleContainer, Particle, Sprite, Texture, Container } from "pixi.js";

/* Sternenfeld als GPU-Emitter (Pixi) — #311-Umbau des alten, braven DOM-Ports. Statt 10 festen Ambiente-Sternen +
   einer Zickzack-Sternschnuppe liefert dieser Emitter:
     1) ein DICHTES Parallax-Ambiente über 3 Tiefen-Ebenen (fern klein/dunkel/viele → nah groß/hell/wenige) mit
        eigenem Drift + Twinkle je Ebene und einem dezenten, additiven Nebel-Backdrop,
     2) eine Sternschnuppe je Stich, deren Größe stufenweise mit dem Hit-Tier eskaliert (TIER_SIZE),
     3) einen Impact (Blitz + Funken-Burst) am Kopf — NUR ab Tier ≥ 1 (TIER_IMP[0] = 0 → „Schwach" bleibt impact-frei),
     4) einen Deck-Dual: Standard (Weiß-Blau-Sternenlicht) vs. Deck (getönter Kopf + Deck→deck2-Schweif).

   Muster & Constraints exakt wie embersPixi.js: gepoolte `Particle` in additiven `ParticleContainer`n, pro Partikel
   getönt, Radial-Textur aus Canvas-Gradient, `dt = min(0.05, deltaMS/1000)`, Screen-Skalierung `sc = H / HREF`
   (HREF = 360). Das Modul lebt nur im lazy Pixi-Chunk (Produktion = DOM lädt es nie). Emitter-Contract wie die
   Registry erwartet: { setParams, erupt, destroy }.

   Die Werte im TUNE-Block + TIER-Arrays sind am interaktiven Tuning-Board abgestimmt; die Darstellung (gerader,
   glatt verjüngender Streak — KEIN Zickzack) ist 1:1 mit der Tuning-Konsole. Die K_*-Konstanten mappen die abstrakten
   Board-Größen auf On-Screen-Pixel; für Feinjustage bewusst gebündelt. */

// ── deterministische Helfer ──────────────────────────────────────────────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ── TUNE (aus der Tuning-Konsole abgestimmt) ─────────────────────────────────
const TUNE = {
  // Ambiente
  AMB_COUNT: 33,
  AMB_SIZE: 0.14,
  NEAR_BOOST: 1.4,
  AMB_GLOW: 3.9,
  AMB_TWINKLE: 0.28,
  AMB_TWK_SPD: 0.18,
  AMB_DRIFT: 0.035,
  AMB_DRIFT_SPD: 0.12,
  NEBULA: 1.95,
  // Schnuppe
  SHOOT_DUR: 1,
  HEAD_SIZE: 2.5,
  HEAD_TINT: 0.61,
  HEAD_BOOST: 1.35,
  TRAIL_LEN: 206,
  TRAIL_SAMPLES: 96,
  TAIL_WIDTH: 1.05,
  TAPER: 0.56,
  TAIL_FADE: 1,
  TRAIL_ALPHA: 0.83,
  TRAIL_FLICK: 0,
  COL_MID: 0.23,
  SHOOT_GLOW: 1.7,
  PATH_JITTER: 2.5,
  // Impact
  IMP_AT: 0.9,
  IMP_FLASH_SZ: 110,
  IMP_FLASH_DUR: 0.4,
  IMP_SPARKS: 66,
  IMP_SPARK_SPD: 305,
  IMP_SPARK_LIFE: 0.9,
  IMP_SPARK_SZ: 1.4,
  IMP_GRAV: 0,
};
const TIER_SIZE = [0.5, 1.2, 1.5, 2, 3]; // Schnuppen-Größen-× je Hit-Tier
const TIER_IMP  = [0, 1, 1.5, 2.1, 5];   // Impact-Stärke je Tier (0 = aus → „Schwach" impact-frei)

// px-Mapping der abstrakten Board-Größen (aus der Tuning-Konsole; leicht justierbar)
const K_AMB = 6.0;     // Ambiente-Stern-Basisdurchmesser (× AMB_SIZE × Ebenen-Faktor × sc)
const K_HEAD = 4.2;    // Schnuppen-Kopf-Durchmesser (× HEAD_SIZE × TIER_SIZE × sc)
const K_TAIL = 6.8;    // Schweif-Sample-Durchmesser (× TAIL_WIDTH × TIER_SIZE × sc)
const K_SPARK = 2.8;   // Funken-Durchmesser (× IMP_SPARK_SZ × sc)

const HREF = 360;      // Referenz-Panelhöhe (Geschwindigkeiten/Größen skalieren mit H/HREF)
const TX = 64;         // Kantenlänge der Radial-Textur

// Pools: Ambiente = AMB_COUNT; Schnuppen (überlappende Stiche) MAXCOMET × (TRAIL_SAMPLES+1); Funken für die große
// Gottgleich-Explosion (IMP_SPARKS × max(TIER_IMP) ≈ 66 × 5) + Reserve.
const MAXCOMET = 4;
const TRAIL_POOL = MAXCOMET * (TUNE.TRAIL_SAMPLES + 1); // ~388
const SPARK_POOL = 384;
const NEB_BLOBS = 4;

// ── Standard-Palette (deck-unabhängig) ───────────────────────────────────────
const WHITE    = [255, 255, 255]; // Kopf
const KERN     = [219, 238, 255]; // #dbeeff Kern
const MITTE    = [127, 180, 255]; // #7fb4ff Mitte
const AUSKLANG = [63, 107, 208];  // #3f6bd0 Ausklang
const AMB_COL  = [207, 227, 255]; // #cfe3ff Ambiente

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgbInt = (c) => ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);
function hexToRGB(hex) {
  const h = (hex || "#7fb4ff").replace("#", "");
  const full = h.length === 3 ? h.replace(/(.)/g, "$1$1") : h;
  const n = parseInt(full, 16);
  return Number.isFinite(n) ? [n >> 16 & 255, n >> 8 & 255, n & 255] : [...MITTE];
}
// Farbe entlang gestufter Stops interpolieren (0..1) → [r,g,b].
function interpStops(stops, f) {
  if (f <= stops[0][0]) return stops[0][1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (f <= stops[i + 1][0]) { const t = (f - stops[i][0]) / (stops[i + 1][0] - stops[i][0]); return mix(stops[i][1], stops[i + 1][1], t); }
  }
  return stops[stops.length - 1][1];
}

// Modus per Dev-Schalter testbar (?starfield=deck|std bzw. localStorage as_starfield_deck="1"); die Shop-Auswahl
// setzt denselben Modus über setParams({ deckTint }). Default = Standard (Weiß-Blau, deck-unabhängig).
function readDeckDefault() {
  try {
    const u = new URLSearchParams(window.location.search).get("starfield");
    if (u === "deck") return true;
    if (u === "std" || u === "standard") return false;
    return window.localStorage.getItem("as_starfield_deck") === "1";
  } catch { return false; }
}

// Weiche, weiße Radial-Textur (Kern + Halo) — zur Laufzeit pro Partikel getönt.
function makeRadial(stops) {
  const c = document.createElement("canvas"); c.width = c.height = TX;
  const cx = c.getContext("2d");
  const g = cx.createRadialGradient(TX / 2, TX / 2, 0, TX / 2, TX / 2, TX / 2);
  for (const [o, a] of stops) g.addColorStop(o, `rgba(255,255,255,${a})`);
  cx.fillStyle = g; cx.fillRect(0, 0, TX, TX);
  return Texture.from(c);
}

export function createStarfield(app) {
  const starTex = makeRadial([[0, 1], [0.38, 1], [0.6, 0.2], [1, 0]]);  // Stern/Kopf/Schweif/Funken: solider Kern + Halo
  const nebTex  = makeRadial([[0, 0.5], [0.5, 0.22], [1, 0]]);          // Nebel: sehr weich, mittenschwach

  // Schichten (Zeichenreihenfolge): Nebel (hinten) → Ambiente-Sterne → Schweif+Kopf → Funken → Blitz (vorn).
  const nebulaC = new Container();
  const ambPC   = new ParticleContainer({ dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false } }); ambPC.blendMode = "add";
  const trailPC = new ParticleContainer({ dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false } }); trailPC.blendMode = "add";
  const sparkPC = new ParticleContainer({ dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false } }); sparkPC.blendMode = "add";
  const flashC  = new Container();
  app.stage.addChild(nebulaC, ambPC, trailPC, sparkPC, flashC);

  // Nebel-Blobs (feste normierte Positionen, sehr niedrige Alpha, langsames Twinkle).
  const nebSpr = [];
  for (let i = 0; i < NEB_BLOBS; i++) {
    const s = new Sprite(nebTex); s.anchor.set(0.5); s.alpha = 0; s.blendMode = "add"; nebulaC.addChild(s);
    nebSpr.push({ spr: s, nx: 0.12 + Math.random() * 0.76, ny: 0.10 + Math.random() * 0.55, r: 0.34 + Math.random() * 0.30, ph: Math.random() * 6.28 });
  }

  // Ambiente-Sterne über 3 Tiefen-Ebenen (einmal prozedural gestreut; Positionen normiert, driften/twinkeln je Ebene).
  const amb = [];
  for (let i = 0; i < TUNE.AMB_COUNT; i++) {
    const r = Math.random();
    const layer = r < 0.5 ? 0 : r < 0.83 ? 1 : 2;                 // fern (viel) · mittel · nah (wenig)
    const p = new Particle({ texture: starTex, anchorX: 0.5, anchorY: 0.5, alpha: 0 });
    ambPC.addParticle(p);
    amb.push({ p, layer, nx: Math.random(), ny: Math.random(), ph: Math.random() * 6.28 });
  }

  // Schweif-/Kopf-Partikel-Pool (jede Frame frisch belegt — Schweif wird analytisch aus der Kometenbahn gezeichnet).
  const trail = [];
  for (let i = 0; i < TRAIL_POOL; i++) { const p = new Particle({ texture: starTex, anchorX: 0.5, anchorY: 0.5, alpha: 0 }); trailPC.addParticle(p); trail.push(p); }

  // Funken-Pool (physikalisch simuliert, wie embers' Glut).
  const sparks = [];
  for (let i = 0; i < SPARK_POOL; i++) { const p = new Particle({ texture: starTex, anchorX: 0.5, anchorY: 0.5, alpha: 0 }); sparkPC.addParticle(p); sparks.push({ p, alive: false }); }
  let spHead = 0;

  // Blitz-Sprites (wenige gleichzeitig, expandieren + faden).
  const flashes = [];
  for (let i = 0; i < MAXCOMET + 2; i++) { const s = new Sprite(starTex); s.anchor.set(0.5); s.alpha = 0; s.blendMode = "add"; flashC.addChild(s); flashes.push({ spr: s, alive: false, age: 0, life: 0, x: 0, y: 0, sz0: 0, tint: 0xffffff }); }

  let params = { effect: null, deck: [...MITTE], deck2: [...AUSKLANG], reduced: false, lite: false, deckTint: readDeckDefault() };
  const comets = [];

  function reset() {
    comets.length = 0;
    for (const s of sparks) { s.alive = false; s.p.alpha = 0; }
    for (const t of trail) t.alpha = 0;
    for (const f of flashes) { f.alive = false; f.spr.alpha = 0; }
  }

  function setParams(next) {
    params = { ...params, ...next,
      deck:  next.color  != null ? hexToRGB(next.color)  : params.deck,
      deck2: next.color2 != null ? hexToRGB(next.color2) : params.deck2,
      deckTint: next.deckTint != null ? next.deckTint : params.deckTint };
    if (params.effect !== "starfield") reset();
  }

  // Aktuelle Schweif-Farbrampe je Modus (0 = Kopf … 1 = Ausklang).
  function trailStops(deckTint, deck, deck2) {
    if (!deckTint) return [[0, WHITE], [0.14, KERN], [TUNE.COL_MID, MITTE], [1, AUSKLANG]];
    const head = mix(WHITE, deck, TUNE.HEAD_TINT); // getönter Kopf: hell mit Deck-Anflug
    return [[0, head], [TUNE.COL_MID, deck], [1, deck2]];
  }

  function grabSpark() { const s = sparks[spHead]; spHead = (spHead + 1) % SPARK_POOL; s.alive = true; return s; }
  function grabFlash() { for (const f of flashes) if (!f.alive) return f; return flashes[0]; }

  // ── Impact (Blitz + Funken) — nur ab Tier ≥ 1 ──────────────────────────────
  function impact(x, y, sc, imp, headInt) {
    if (imp <= 0) return;
    const f = grabFlash();
    f.alive = true; f.age = 0; f.life = TUNE.IMP_FLASH_DUR; f.x = x; f.y = y;
    f.sz0 = TUNE.IMP_FLASH_SZ * sc * (0.7 + 0.3 * imp); f.tint = headInt;
    const n = Math.round(TUNE.IMP_SPARKS * imp);
    for (let i = 0; i < n; i++) {
      const s = grabSpark();
      const ang = Math.random() * 6.283, sp = TUNE.IMP_SPARK_SPD * sc * (0.5 + Math.random() * 0.8) * (0.8 + 0.4 * imp);
      s.x = x; s.y = y; s.vx = Math.cos(ang) * sp; s.vy = Math.sin(ang) * sp;
      s.age = 0; s.life = TUNE.IMP_SPARK_LIFE * (0.6 + Math.random() * 0.5);
      s.sz = TUNE.IMP_SPARK_SZ * (0.7 + Math.random() * 0.7); s.seed = Math.random() * 6.28; s.tint = headInt;
    }
  }

  // ── Schnuppe je Stich ──────────────────────────────────────────────────────
  function erupt({ sweepId, win, tier = 0 }) {
    // Feuert je Stich (Sieg UND Niederlage) — bei Niederlage tier = 0 → kleine Basis-Schnuppe ohne Impact.
    if (params.effect !== "starfield" || params.reduced || !(sweepId > 0)) return;
    void win;
    const t = clamp(tier | 0, 0, 4);
    const size = TIER_SIZE[t];
    // Bahn: Start oben (leicht streuend), diagonal nach unten (zufällig links/rechts), voller Feld-Durchlauf.
    const dir = Math.random() < 0.5 ? 1 : -1;
    const ang = (24 + Math.random() * 22) * Math.PI / 180;                 // 24..46° unter der Waagerechten
    comets.push({
      nx0: dir > 0 ? 0.02 + Math.random() * 0.28 : 0.70 + Math.random() * 0.28, // Startpunkt (normiert)
      ny0: 0.04 + Math.random() * 0.30,
      dx: Math.cos(ang) * dir, dy: Math.sin(ang),
      age: 0, life: TUNE.SHOOT_DUR, tier: t, size,
      imp: TIER_IMP[t], impacted: false, seed: Math.random() * 1000, jit: Math.random() * 2 - 1,
    });
    if (comets.length > MAXCOMET) comets.splice(0, comets.length - MAXCOMET);
  }

  // ── Ticker ─────────────────────────────────────────────────────────────────
  let clock = 0;
  function update(ticker) {
    const dt = Math.min(0.05, ticker.deltaMS / 1000);
    clock += dt;
    if (params.effect !== "starfield") return;
    const W = app.screen.width, H = app.screen.height, sc = Math.max(0.4, H / HREF);
    const deckTint = params.deckTint, deck = params.deck, deck2 = params.deck2;
    const stops = trailStops(deckTint, deck, deck2);
    const headInt = rgbInt(stops[0][1]);
    const ambInt = rgbInt(deckTint ? mix(AMB_COL, deck, 0.35) : AMB_COL);
    const nebInt = rgbInt(deckTint ? deck : MITTE);

    // Nebel-Backdrop (sehr niedrige Alpha, langsames Twinkle).
    for (const nb of nebSpr) {
      const tw = 0.5 + 0.5 * Math.sin(clock * 0.35 + nb.ph);
      const d = Math.min(W, H) * nb.r * 2;
      nb.spr.x = nb.nx * W; nb.spr.y = nb.ny * H; nb.spr.width = d; nb.spr.height = d;
      nb.spr.tint = nebInt;
      nb.spr.alpha = 0.11 * TUNE.NEBULA * (params.reduced ? 1 : 0.7 + 0.3 * tw);
    }

    // Ambiente-Sterne (3 Ebenen): Drift (nur !reduced) + Twinkle (nur !reduced), nah größer/heller.
    for (const a of amb) {
      const sizeF = a.layer === 0 ? 0.62 : a.layer === 1 ? 1.0 : 1.5 * TUNE.NEAR_BOOST;
      const baseA = a.layer === 0 ? 0.36 : a.layer === 1 ? 0.6 : 0.9;
      const drift = TUNE.AMB_DRIFT * TUNE.AMB_DRIFT_SPD * (0.5 + a.layer * 0.55);
      if (!params.reduced) { a.ny += drift * dt; if (a.ny > 1) a.ny -= 1; }
      const tw = params.reduced ? 1 : (0.5 + 0.5 * Math.sin(clock * (1 + TUNE.AMB_TWK_SPD * 4) + a.ph));
      const alpha = baseA * (1 - TUNE.AMB_TWINKLE * (1 - tw));
      const foot = TUNE.AMB_SIZE * sizeF * sc * K_AMB * (0.7 + 0.3 * TUNE.AMB_GLOW);
      const p = a.p; p.x = a.nx * W; p.y = a.ny * H; p.scaleX = p.scaleY = foot / TX; p.tint = ambInt; p.alpha = clamp(alpha, 0, 1);
    }

    // Schnuppen: Kopf entlang der Bahn, Schweif als glatter, getaperter Sample-Streak dahinter (GERADE, kein Zickzack);
    // Impact am Bahnende (ab Tier ≥ 1).
    let ti = 0; // laufender Index in den Schweif-Pool
    const pathLen = Math.hypot(W, H) * 0.95;
    const glow = 0.7 + 0.3 * TUNE.SHOOT_GLOW; // Halo-Verbreiterung des Streaks
    for (let ci = comets.length - 1; ci >= 0; ci--) {
      const c = comets[ci];
      c.age += dt;
      if (c.age >= c.life) { comets.splice(ci, 1); continue; }
      const prog = c.age / c.life;                                   // 0..1 entlang der Bahn
      const env = Math.min(1, prog / 0.08) * Math.min(1, (1 - prog) / 0.12); // sanftes Ein-/Ausblenden
      const hx = (c.nx0 * W) + c.dx * pathLen * prog;
      const hy = (c.ny0 * H) + c.dy * pathLen * prog;
      if (!c.impacted && prog >= TUNE.IMP_AT) { c.impacted = true; impact(hx, hy, sc, c.imp, headInt); }
      const trailLen = TUNE.TRAIL_LEN * c.size * sc;
      const headFoot = TUNE.HEAD_SIZE * c.size * sc * K_HEAD;
      const flick = TUNE.TRAIL_FLICK > 0 ? (1 - TUNE.TRAIL_FLICK + TUNE.TRAIL_FLICK * (0.5 + 0.5 * Math.sin(clock * 40 + c.seed))) : 1;
      // PATH_JITTER = Bahn-Streuung: KONSTANTER seitlicher Versatz je Komet (kein Wackeln) → Streak bleibt gerade.
      const off = TUNE.PATH_JITTER * c.jit * sc, oxH = -c.dy * off, oyH = c.dx * off;
      const N = Math.round(TUNE.TRAIL_SAMPLES);
      // Schweif-Samples N..1: hinter dem Kopf, Breite verjüngt (TAPER), Alpha fällt (TAIL_FADE), Farbe Kopf→Ausklang.
      for (let i = N; i >= 1; i--) {
        if (ti >= TRAIL_POOL) break;
        const f = i / N;
        const sx = hx - c.dx * trailLen * f + oxH, sy = hy - c.dy * trailLen * f + oyH;
        const w = TUNE.TAIL_WIDTH * c.size * sc * K_TAIL * (1 - TUNE.TAPER * f) * glow;
        const a = TUNE.TRAIL_ALPHA * (1 - TUNE.TAIL_FADE * f) * env * flick;
        const p = trail[ti++]; p.x = sx; p.y = sy; p.scaleX = p.scaleY = Math.max(0, w) / TX;
        p.tint = rgbInt(interpStops(stops, f)); p.alpha = clamp(a, 0, 1);
      }
      // Kopf (oben): hell, HEAD_BOOST.
      if (ti < TRAIL_POOL) {
        const p = trail[ti++]; p.x = hx + oxH; p.y = hy + oyH; p.scaleX = p.scaleY = headFoot / TX;
        p.tint = headInt; p.alpha = clamp(TUNE.TRAIL_ALPHA * TUNE.HEAD_BOOST * env * flick, 0, 1);
      }
    }
    // ungenutzte Schweif-Slots ausblenden
    for (; ti < TRAIL_POOL; ti++) trail[ti].alpha = 0;

    // Funken (Impact): additiv, ballistisch, faden über die Lebenszeit.
    for (let i = 0; i < SPARK_POOL; i++) {
      const s = sparks[i]; if (!s.alive) continue;
      s.age += dt;
      if (s.age >= s.life) { s.alive = false; s.p.alpha = 0; continue; }
      s.vy += TUNE.IMP_GRAV * sc * dt; s.vx -= s.vx * 0.9 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const lifeF = 1 - s.age / s.life;
      const foot = s.sz * sc * K_SPARK * (0.6 + 0.4 * lifeF);
      const flick = 0.8 + 0.2 * Math.sin(clock * 34 + s.seed);
      const p = s.p; p.x = s.x; p.y = s.y; p.scaleX = p.scaleY = foot / TX; p.tint = s.tint; p.alpha = clamp(lifeF * flick, 0, 1);
    }

    // Blitz (Impact): expandiert + fadet.
    for (const f of flashes) {
      if (!f.alive) { f.spr.alpha = 0; continue; }
      f.age += dt;
      if (f.age >= f.life) { f.alive = false; f.spr.alpha = 0; continue; }
      const lf = f.age / f.life, d = f.sz0 * (0.6 + 1.0 * lf);
      f.spr.x = f.x; f.spr.y = f.y; f.spr.width = d; f.spr.height = d; f.spr.tint = f.tint; f.spr.alpha = (1 - lf) * 0.9;
    }
  }

  app.ticker.add(update);

  return {
    setParams,
    erupt,
    destroy() {
      try { app.ticker.remove(update); } catch { /* ignore */ }
      for (const c of [nebulaC, ambPC, trailPC, sparkPC, flashC]) { try { c.destroy({ children: true }); } catch { /* ignore */ } }
      for (const t of [starTex, nebTex]) { try { t.destroy(true); } catch { /* ignore */ } }
    },
  };
}
