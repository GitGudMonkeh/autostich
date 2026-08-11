import { ParticleContainer, Particle, Sprite, Texture, Container } from "pixi.js";

/* Glutfunken als GPU-Vulkan-Lava-Fontäne (Pixi-Umbau, Phase 2) — der erste Effekt, der von DOM auf Pixi umzieht.
   Statt der alten, braven DOM-Punkte (bis 72 Nodes/Stich) eine echte Synthwave-Lava-Fontäne: pro Stich brechen an
   ZUFALLSPOSITIONEN Vents auf (glühender Krater + flackernder molten Pool + Flammen), aus denen eine gebündelte
   Lava-Säule schießt — dicker Sockel unten, dünner heißer Kopf oben, Vulkanrot (weiß→gold→orange→rot) mit dunklen
   Krusten-Brocken ("Schwarz drin"). Alles GPU-gebatcht: additive Glut-Partikel + eine zweite, dunkle Krusten-Schicht
   + Krater/Pool als getönte Sprites. Kein Filter-Bloom, kein Full-Screen-Puffer → billig auf der GPU.

   Bewusst DUPLIZIERTE Helfer (fjitter/emberStufe/emberFountainXs): identische Zahlen wie in Battlefield.jsx (die
   Fontänen-Positionen werden pro Stich aus sweepId gewürfelt), aber ohne Import der Render-Schicht — dieses Modul
   lebt nur im lazy Pixi-Chunk und wird auf main nie geladen. Die Spiel-Logik bleibt komplett unberührt.

   Tuning: die Konstanten im TUNE-Block sind bewusst gebündelt. Der Look wurde in einem Canvas-Prototyp abgestimmt;
   auf der echten Pixi-Page kann eine Feinjustage nötig sein (Dichte/Größe/Wucht) — dafür sind sie hier oben. */

// ── deterministische Helfer (Duplikat der Render-Schicht) ────────────────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fjitter = (seed, amp) => { const s = Math.sin(seed * 127.1 + 311.7) * 43758.5; return +(((s - Math.floor(s)) * 2 - 1) * amp).toFixed(1); };
const EMBER_FOUNTAINS_N = 3, EMBER_MAX_SCORE = 500000, EMBER_MAX_STUFE = 3;
const emberStufe = (score) => clamp(Math.floor(clamp((score || 0) / EMBER_MAX_SCORE, 0, 1) * (EMBER_MAX_STUFE + 1)), 0, EMBER_MAX_STUFE);
function emberFountainXs(seed) {   // 3 x-Positionen (0..1), pro Stich neu (sweedId-Seed) → Fontänen wandern
  const xs = [];
  for (let f = 0; f < EMBER_FOUNTAINS_N; f++) xs.push(clamp(8 + Math.abs(fjitter(seed + f * 53, 84)), 6, 94) / 100);
  return xs;
}

// ── TUNE ─────────────────────────────────────────────────────────────────────
const TUNE = {
  EMIT: 363,        // Basis-Ausstoßrate (Tröpfchen/s je Vent), skaliert mit Stufe (Dichte 2.20)
  FLAME: 0.4,       // Flammen-Anteil relativ zu EMIT
  G_REF: 1750,      // Schwerkraft px/s² bei Referenzhöhe HREF
  HREF: 360,        // Referenz-Panelhöhe (Geschwindigkeiten/Höhe skalieren mit H/HREF)
  GLOW: 0.65,       // Partikel-Footprint (= Showcase „Partikelgröße" 0.65; On-Screen-Größe mappt 1:1). Klein = knackig, wenig Wash.
  GLOW_A: 1.2,      // Glüh-Boost der farbigen Glut-Partikel (Faktor auf die additive Alpha, final auf 1 gedeckelt)
  CRUST_P: 0.12,    // Anteil dunkler Krusten-Brocken
  MAXGLOW: 2200, MAXCRUST: 560, MAXVENT: 10,   // Pools groß genug für die große Gottgleich-Fontäne. MAXVENT = Obergrenze gleichzeitiger Vents.
};

// Farb-Modus der Glut: „Standard" = warmes Feuer, unabhängig von der Deckfarbe · „Deckfarbe" = deck-getönt.
// Vorerst per Dev-Schalter testbar (?fx=pixi&ember=deck bzw. ?ember=std, oder localStorage as_ember_deck="1");
// die spätere Shop-Auswahl setzt denselben Modus über setParams({ deckTint }). Default = Standard (das ursprüngliche Feuer).
const FIRE = [255, 106, 48];   // Standard-Glut: warmes Feuer als Basis der Lava-Rampe
function readEmberDeckDefault() {
  try {
    const u = new URLSearchParams(window.location.search).get("ember");
    if (u === "deck") return true;
    if (u === "std" || u === "standard") return false;
    return window.localStorage.getItem("as_ember_deck") === "1";
  } catch { return false; }
}

const TX = 64;   // Glut-Textur-Kantenlänge

// Hit-Tier-Eskalation (0 Schwach · 1 Stark · 2 Brutal · 3 Irre · 4 Gottgleich). Ab „Stark" bündelt sich die Fontäne
// zu EINER großen, mittigen (mehr Ausstoß=mult, höher=vscale, länger=burst), eskalierend mit dem Tier.
const TIER_MULT   = [1, 3.0, 3.9, 5.0, 6.8];
const TIER_VSCALE = [1, 1.16, 1.32, 1.52, 1.78];
const TIER_BURST  = [0.6, 0.64, 0.72, 0.84, 1.0];

function hexToRGB(hex) {
  const h = (hex || "#ff6a30").replace("#", "");
  const full = h.length === 3 ? h.replace(/(.)/g, "$1$1") : h;
  const n = parseInt(full, 16);
  return Number.isFinite(n) ? [n >> 16 & 255, n >> 8 & 255, n & 255] : [255, 106, 48];
}
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Deck-getönte Lava-Rampe 0..1 → 0xRRGGBB. Durchgängig Deck-Hue: zum Rand dunkel/kühl, zum Kern hell (leicht warm),
// aber NICHT rein weiß im Kern → behält die Deckfarbe UND vermeidet das ausgewaschene Weiß-Blowout.
function rampInt(h, deck) {
  const warm = [255, 236, 205];
  const stops = [
    [0.00, mix(deck, [16, 5, 5], 0.5)],        // dunkler, kühler Rand
    [0.32, deck],                              // Deckfarbe
    [0.60, mix(deck, warm, 0.42)],             // heller, leicht warm
    [0.85, mix(deck, warm, 0.72)],
    [1.00, mix(deck, [255, 255, 255], 0.68)],  // heißer Kern: hell, aber Deck-Ton bleibt
  ];
  let c = stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (h <= stops[i + 1][0]) { const t = (h - stops[i][0]) / (stops[i + 1][0] - stops[i][0]); c = mix(stops[i][1], stops[i + 1][1], t); break; }
  }
  return ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255);
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

export function createEmberField(app) {
  const glowTex   = makeRadial([[0, 1], [0.42, 1], [0.6, 0.16], [1, 0]]);    // Glut: größerer solider Kern + knapper Halo → knackig, wenig Wash
  const crustTex  = makeRadial([[0, 1], [0.55, 0.9], [0.85, 0.35], [1, 0]]); // Brocken: kompakter, dunkel getönt
  const craterTex = makeRadial([[0, 0], [0.45, 0.85], [1, 0]]);              // Krater-Rand: dunkler Ring (Mitte offen)

  // Schichten (Reihenfolge = Zeichenreihenfolge): dunkler Krater → additive Lava-Pools → additive Glut → dunkle Krusten.
  // blendMode wirkt pro gerendertem Objekt: ParticleContainer rendert selbst (Blend greift dort), die Krater/Pool sind
  // aber einfache Container-Gruppen → der additive Blend sitzt auf den SPRITES.
  const craterC = new Container();
  const poolC   = new Container();
  const glowPC  = new ParticleContainer({ dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false } }); glowPC.blendMode = "add";
  const crustPC = new ParticleContainer({ dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false } }); crustPC.blendMode = "normal";
  app.stage.addChild(craterC, poolC, glowPC, crustPC);

  // Krater/Pool-Sprites je Vent (fester Satz, ungenutzte auf alpha 0)
  const craterSpr = [], poolOut = [], poolIn = [];
  for (let i = 0; i < TUNE.MAXVENT; i++) {
    const cr = new Sprite(craterTex); cr.anchor.set(0.5); cr.tint = 0x090302; cr.alpha = 0; craterC.addChild(cr); craterSpr.push(cr);
    const po = new Sprite(glowTex);   po.anchor.set(0.5); po.tint = 0xe83512;  po.alpha = 0; po.blendMode = "add"; poolC.addChild(po); poolOut.push(po);
    const pi = new Sprite(glowTex);   pi.anchor.set(0.5); pi.tint = 0xffe6be;  pi.alpha = 0; pi.blendMode = "add"; poolC.addChild(pi); poolIn.push(pi);
  }

  // Partikel-Pools
  const glow = [], crust = [];
  for (let i = 0; i < TUNE.MAXGLOW; i++) { const p = new Particle({ texture: glowTex, anchorX: 0.5, anchorY: 0.5, alpha: 0 }); glowPC.addParticle(p); glow.push({ p, alive: false }); }
  for (let i = 0; i < TUNE.MAXCRUST; i++) { const p = new Particle({ texture: crustTex, anchorX: 0.5, anchorY: 0.5, alpha: 0, tint: 0x140604 }); crustPC.addParticle(p); crust.push({ p, alive: false }); }
  let gHead = 0, cHead = 0;

  let params = { effect: null, deck: [255, 106, 48], score: 0, reduced: false, lite: false, deckTint: readEmberDeckDefault() };
  const vents = [];

  function reset() {
    vents.length = 0;
    for (const s of glow) { s.alive = false; s.p.alpha = 0; }
    for (const s of crust) { s.alive = false; s.p.alpha = 0; }
    for (let i = 0; i < TUNE.MAXVENT; i++) { craterSpr[i].alpha = 0; poolOut[i].alpha = 0; poolIn[i].alpha = 0; }
  }

  function setParams(next) {
    params = { ...params, ...next,
      deck: next.color != null ? hexToRGB(next.color) : params.deck,
      deckTint: next.deckTint != null ? next.deckTint : params.deckTint };
    if (params.effect !== "embers") reset();
  }

  // ── Spawn ──────────────────────────────────────────────────────────────────
  function grabGlow() { const s = glow[gHead]; gHead = (gHead + 1) % TUNE.MAXGLOW; s.alive = true; return s; }
  function grabCrust() { const s = crust[cHead]; cHead = (cHead + 1) % TUNE.MAXCRUST; s.alive = true; return s; }

  function spawnDroplet(v, env, sc, W, fy) {
    const r = Math.random();
    const x = v.x * W, y0 = fy - Math.random() * 3, vsc = v.vscale || 1, sp = v.spread || 1;
    if (r < TUNE.CRUST_P) {  // dunkler Krusten-Brocken
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.42 + v.side * 0.14;
      const v0 = (320 + Math.pow(Math.random(), 1.7) * 430) * (1 + v.stufe * 0.1) * (0.72 + 0.28 * env) * sc * vsc;
      const s = grabCrust(); s.x = x + (Math.random() - 0.5) * W * 0.05 * sp; s.y = y0;
      s.vx = Math.cos(ang) * v0; s.vy = Math.sin(ang) * v0; s.age = 0; s.life = 1.25 + Math.random() * 0.7;
      s.sz = 1.7 + Math.random() * 2.0; s.drag = 0.6; s.seed = Math.random() * 6.28; s.grav = 1.12;
      return;
    }
    const core = r < TUNE.CRUST_P + 0.44 ? false : true;  // ~44% body, ~38% core
    const s = grabGlow(); s.seed = Math.random() * 6.28;
    if (core) {  // schmale, schnelle Kernsäule → dünner heißer Kopf oben
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.12 + v.side * 0.10;
      const v0 = (860 + Math.random() * 330) * (1 + v.stufe * 0.13) * (0.72 + 0.28 * env) * sc * vsc;
      s.x = x + (Math.random() - 0.5) * W * 0.014 * sp; s.y = y0;
      s.vx = Math.cos(ang) * v0 + (Math.random() - 0.5) * 30 * sc; s.vy = Math.sin(ang) * v0;
      s.age = 0; s.life = 0.9 + Math.random() * 0.75; s.sz = 0.85 + Math.random() * 1.25; s.drag = 0.26; s.hot = 1.05; s.grav = 1;
    } else {     // viele, langsam (v0 nach unten gebogen), breit → fetter Sockel
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.36 + v.side * 0.14;
      const v0 = (360 + Math.pow(Math.random(), 1.8) * 470) * (1 + v.stufe * 0.11) * (0.72 + 0.28 * env) * sc * vsc;
      s.x = x + (Math.random() - 0.5) * W * 0.055 * sp; s.y = y0;
      s.vx = Math.cos(ang) * v0; s.vy = Math.sin(ang) * v0;
      s.age = 0; s.life = 1.15 + Math.random() * 0.8; s.sz = 1.0 + Math.random() * 1.55; s.drag = 0.5; s.hot = 0.94; s.grav = 1;
    }
  }
  function spawnFlame(v, sc, W, fy) {  // Flammen-Zunge am Austritt: niedrig, weich, orange, kurzlebig
    const s = grabGlow();
    s.x = v.x * W + (Math.random() - 0.5) * W * 0.045 * (v.spread || 1); s.y = fy - Math.random() * 2;
    s.vx = (Math.random() - 0.5) * 60 * sc; s.vy = -(120 + Math.random() * 180) * sc;
    s.age = 0; s.life = 0.4 + Math.random() * 0.45; s.sz = 2.3 + Math.random() * 2.5; s.drag = 0.82; s.seed = Math.random() * 6.28; s.hot = 0.84; s.grav = 1;
  }

  function erupt({ sweepId, sweepDur, win, score, tier = 0 }) {
    // NUR bei gewonnenen Stichen feuern (nicht bei jedem Stich). Auch aus in „ausgewogen"/„minimal".
    if (params.effect !== "embers" || params.lite || params.reduced || !(sweepId > 0) || !win) return;
    const stufe = emberStufe(score);
    const t = clamp(tier | 0, 0, 4);
    if (t >= 1) {
      // ab „Stark": EINE große, mittige, gebündelte Fontäne (eskalierend mit dem Hit-Tier)
      vents.push({ x: 0.5, side: 0, jetT: TIER_BURST[t], burst: TIER_BURST[t], stufe, mult: TIER_MULT[t], vscale: TIER_VSCALE[t], spread: 1.8, acc: 0, flAcc: 0, glow: 1, win: true });
    } else {
      // Schwach (normaler Sieg): EINE Fontäne an Zufallsposition
      const burst = clamp((sweepDur || 900) * 0.0009, 0.42, 0.9);
      const x = emberFountainXs(sweepId * 7 + 1)[0];
      vents.push({ x, side: x - 0.5, jetT: burst, burst, stufe, mult: 1, vscale: 1, spread: 1, acc: 0, flAcc: 0, glow: 1, win: true });
    }
    if (vents.length > TUNE.MAXVENT) vents.splice(0, vents.length - TUNE.MAXVENT);
  }

  // ── Ticker ─────────────────────────────────────────────────────────────────
  let clock = 0;
  function update(ticker) {
    const dt = Math.min(0.05, ticker.deltaMS / 1000);
    clock += dt;
    if (params.effect !== "embers") return;
    // Farb-Basis der Rampe: „Deckfarbe" → Deck-Hauptfarbe, „Standard" → warmes Feuer (deck-unabhängig).
    const W = app.screen.width, H = app.screen.height, sc = Math.max(0.4, H / TUNE.HREF), deck = params.deckTint ? params.deck : FIRE;
    const deckInt = ((deck[0] & 255) << 16) | ((deck[1] & 255) << 8) | (deck[2] & 255);   // Krater/Pool in Deckfarbe
    const hotInt = rampInt(0.88, deck);
    const fy = H - Math.min(22, H * 0.04);   // Emissionslinie leicht über dem Rand (näher am Boden) → steht auf dem Boden, nicht am Rahmen

    // Vents: Ausstoß über den Burst + Flammen; danach Nachglühen bis der Pool erlischt.
    for (let vi = vents.length - 1; vi >= 0; vi--) {
      const v = vents[vi];
      if (v.jetT > 0) {
        v.jetT -= dt; v.glow = 1;
        const env = clamp((v.jetT / v.burst) * 1.25, 0, 1);
        const wf = v.win ? 1.12 : 1;
        v.acc += TUNE.EMIT * (v.mult || 1) * (1 + v.stufe * 0.85) * env * wf * dt;   // mult = gebündelte Zentral-Fontäne (ab „Stark")
        while (v.acc >= 1) { v.acc--; spawnDroplet(v, env, sc, W, fy); }
        v.flAcc += TUNE.EMIT * TUNE.FLAME * Math.sqrt(v.mult || 1) * (1 + v.stufe * 0.5) * env * dt;
        while (v.flAcc >= 1) { v.flAcc--; spawnFlame(v, sc, W, fy); }
      } else {
        v.glow -= dt * 2.9;   // molten Pool kühlt schnell ab → kein großer Afterglow bei überlappenden Stichen
        if (v.glow <= 0) { vents.splice(vi, 1); }
      }
    }

    // Krater + molten Pool je Vent (getönte Sprites; ungenutzte ausblenden). Pool-Helligkeit durch die Zahl
    // aktiver Vents normalisiert → überlappende Böden summieren sich NICHT zu einem Riesen-Glow.
    const pf = 1 / Math.sqrt(Math.max(1, vents.length));
    for (let i = 0; i < TUNE.MAXVENT; i++) {
      const v = vents[i], cr = craterSpr[i], po = poolOut[i], pi = poolIn[i];
      if (!v) { cr.alpha = 0; po.alpha = 0; pi.alpha = 0; continue; }
      const bx = v.x * W, act = v.jetT > 0 ? 1 : v.glow;
      const fl = 0.72 + 0.28 * Math.sin(clock * 11 + bx * 0.06);
      const baseK = 0.55 + 0.45 * (v.spread || 1);   // größere Basis für die gebündelte Zentral-Fontäne
      const pr = (28 + v.stufe * 12) * act * fl * sc * baseK;
      po.tint = deckInt; pi.tint = hotInt;   // Vent glüht in Deckfarbe (heißer Kern deck-getönt hell)
      // Boden kompakter/knackiger: kleinere Pools, geringere Alpha, dunklerer Krater-Rand (mehr Kontrast, weniger Wash).
      cr.x = bx; cr.y = fy; cr.width = (44 + v.stufe * 14) * 2.6 * sc * baseK; cr.height = (44 + v.stufe * 14) * 0.9 * sc; cr.alpha = 0.23 * act;  // „Ring am Boden" 0.25
      po.x = bx; po.y = fy; po.width = pr * 3.3; po.height = pr * 1.3; po.alpha = 0.28 * act * pf;
      pi.x = bx; pi.y = fy; pi.width = pr * 1.9; pi.height = pr * 0.82; pi.alpha = 0.42 * act * pf;
    }

    // Glut-Partikel (core/body/flame) — additiv, pro Partikel getönt
    for (let i = 0; i < TUNE.MAXGLOW; i++) {
      const s = glow[i]; if (!s.alive) continue;
      s.age += dt;
      if (s.age >= s.life || s.y > H + 30) { s.alive = false; s.p.alpha = 0; continue; }
      s.vy += TUNE.G_REF * sc * dt * s.grav; s.vx -= s.vx * s.drag * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const lifeF = 1 - s.age / s.life;
      const heat = clamp(lifeF * s.hot, 0, 1);
      const flick = 0.85 + 0.15 * Math.sin(clock * 30 + s.seed);
      const a = Math.min(1, TUNE.GLOW_A * (heat < 0.1 ? heat / 0.1 : 1) * (0.4 + 0.6 * lifeF)) * flick;
      const foot = s.sz * 2 * (0.5 + 0.5 * heat) * TUNE.GLOW;   // px-Durchmesser inkl. Halo
      const p = s.p; p.x = s.x; p.y = s.y; p.scaleX = p.scaleY = foot / TX; p.tint = rampInt(heat, deck); p.alpha = a;
    }

    // Krusten-Brocken — normal geblendet ÜBER die Glut → gesprenkeltes Magma-Schwarz
    for (let i = 0; i < TUNE.MAXCRUST; i++) {
      const s = crust[i]; if (!s.alive) continue;
      s.age += dt;
      if (s.age >= s.life || s.y > H + 30) { s.alive = false; s.p.alpha = 0; continue; }
      s.vy += TUNE.G_REF * sc * dt * s.grav; s.vx -= s.vx * s.drag * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const lifeF = 1 - s.age / s.life;
      const flick = 0.85 + 0.15 * Math.sin(clock * 24 + s.seed);
      const foot = s.sz * 2 * (0.9 + 0.35 * lifeF) * 1.4;
      const p = s.p; p.x = s.x; p.y = s.y; p.scaleX = p.scaleY = foot / TX; p.alpha = 0.62 * (0.4 + 0.6 * lifeF) * flick;
    }
  }

  app.ticker.add(update);

  return {
    setParams,
    erupt,
    destroy() {
      try { app.ticker.remove(update); } catch { /* ignore */ }
      for (const c of [craterC, poolC, glowPC, crustPC]) { try { c.destroy({ children: true }); } catch { /* ignore */ } }
      for (const t of [glowTex, crustTex, craterTex]) { try { t.destroy(true); } catch { /* ignore */ } }
    },
  };
}
