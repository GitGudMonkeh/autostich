/* ============================================================
   DER ARCHITEKT (Shop-Ersatz, v0 — nur Spiel-Logik, KEINE UI) — reine, deterministische Funktionen.
   Kein Math.random/Date: Zufall NUR über den injizierten rng (Angebots-Ziehung). Effekt-Anwendung ist rein.

   Statt Münzen legt der Spieler geometrische Gebäude (Polyominoes) als Overlay aufs Kartenbrett. Das Brett sind
   die 40 Deckpositionen (playerOrder) als 8×5-Sicht: position = row*5 + col, row 0–7 = Segment, col 0–4. Ein
   Gebäude deckt Zellen (Positionen) ab und bufft die Karte, die dort im Stich steht. Formationen laufen weiter
   auf der 1D-Sequenz — 8×5 ist nur Layout.

   Effekt-Kategorien:
   - value:     +temp Wert VOR dem Vergleich (Tragwerk).
   - score:     +Flat/×Mult NACH dem Sieg (Handelsbauten).
   - formation: biegt computeFormations für abgedeckte Positionen (Sakralbau).
   Legendäre kommen fertig (keine Stufen). Alle Zahlen sind Platzhalter → per Sim tunen (TUNING-Block unten).
   ============================================================ */
import { SUIT_ORDER } from "./constants.js";
import { tierWeightsForShift } from "./rarity.js";

// Brett-Geometrie (fix; NICHT aus formations.js importiert, um den Import-Zyklus formations↔architect zu vermeiden).
export const COLS = 5;                    // Spalten je Segment (= SEGMENT_SIZE)
export const ROWS = 8;                    // Segmente (Zeilen)
export const N_POS = ROWS * COLS;         // 40 Positionen
export const rowOf = (p) => Math.floor(p / COLS);
export const colOf = (p) => p % COLS;
export const posOf = (r, c) => r * COLS + c;

/* ---- TUNING-Block (zentral, leicht editierbar) — Balance-Pass 1 (Ziel: Eigenbeitrag ~25–35 %, weniger spät-lastig).
       Vorher: TIER_FACTOR [1,1.6,2.4,3.5], HAEUSERZEILE 1,25 → Eigenbeitrag 42–51 %, 66–75 % Spät. Gedämpft:
       Stufen-Tail komprimiert + die breiten Multiplikatoren (Häuserzeile/Schatzkammer/Kathedrale/Grundstein) runter. ---- */
export const TIER_FACTOR   = [0, 1, 1.4, 1.9, 2.5];      // numerischer Effekt = base × TIER_FACTOR[tier] (Index 1..4) [Pass1: Tail 2,4/3,5→1,9/2,5]
export const FORM_TIER_BONUS = 0.1;                       // Formations-/Faktor-Effekte: je Stufe +0,1 auf den Faktor
// SIM-Rare-Buff-Hook (Rang-Reward-Messung): SIM_RARE_SHIFT=1/2 → seltene Baupläne häufiger. Default 0. Tabellen aus
// rarity.js (Single Source, kein Drift). #217: der Grad-Reward reicht seinen rareShift zur Laufzeit an buildArchitectOffer.
const _archRareShift = (typeof process !== "undefined" && process.env && Number(process.env.SIM_RARE_SHIFT)) || 0;
export const TIER_WEIGHTS  = tierWeightsForShift(_archRareShift); // Angebots-Stufengewichte (Env-Default; Laufzeit-Shift via Param)
// Kategorie-Gewicht im Angebot (Pass2): formation hebelt das bestehende Formations-Multiplikator-System (Overlap/
// Eskalation) und explodiert besonders mit Eis (Schichten/Eisdruck) → seltener anbieten = weniger formation-Gebäude
// auf dem Brett (Sim: formation-only +58–71 % vs value +21–25 %). value/score liegen bereits im Zielband.
export const ARCHITECT_CAT_WEIGHT = { value: 1, score: 1, formation: 0.5 };
export const ARCHITECT_LEGENDARY_CHANCE = 0.03;          // Chance je Angebot auf EIN legendäres Angebot
export const ARCHITECT_OFFER = 3;                        // Baupläne je Angebot
export const MAX_TIER = 4;                               // höchste Stufe (Legendäre haben keine)
// Baufeld-Deckel (Pass3 „Knappheit ohne Phasen-Kürzung"): max. abgedeckte Zellen. Vorher sättigte das Brett bei
// ~87,5 % (35/40) → Platzierung egal (Skill-Expression nur +1–16 %). Deckel macht die Fläche knapp → WOHIN wird
// zur Entscheidung; die freien Phasen fließen in Versetzen/Ausbau/Umbau. Env-overridable zum Sweepen.
export const MAX_COVER = Math.max(4, Math.min(N_POS, Number((typeof process !== "undefined" && process.env && process.env.ARCH_MAX_COVER) || 24)));
// Struktur-Boni (kompoundieren: greifen AB Komplettierung jeden Durchlauf → früh schließen zahlt über die Restlaufzeit).
// Zeile (5) mittel, Spalte (8 über alle Segmente) teuer→stark, 2×2-Viertel (4) billig→klein. Stapeln multiplikativ.
export const HAEUSERZEILE_FACTOR = 1.20;                 // volle Segment-Zeile (5 Zellen), KONZENTRIERT (1 Segment) → Formations-Fraktionen [Pass3d: 1,24→1,20, Eis/Pflanze-Zuwachs auf ~30 %]
export const SPALTE_FACTOR       = 1.40;                 // volle Spalte über alle 8 Segmente (8 Zellen), GESTREUT → Flach-Score-Fraktionen [Pass3c: 1,60→1,40]
export const DIAGONALE_FACTOR    = 1.34;                 // volle Diagonale (5 Zellen, je 1 pro Segment UND Spalte) — maximal GESTREUT, quasi nie zufällig → Feuer/Blitz

// Stufen-Skalierung: numerischer Effekt (Wert/Score) gerundet; Faktor-Effekte additiv über FORM_TIER_BONUS.
export const tierNum    = (base, tier) => (tier === "legendary" ? base : Math.round(base * (TIER_FACTOR[tier] || 1)));
export const tierFactor = (base, tier) => (tier === "legendary" ? base : base + FORM_TIER_BONUS * ((tier || 1) - 1));
// Aufwert-Status eines Gebäudes: joker/transparentFarb/crossSeg lesen `tier` NICHT → dort ist Aufrüsten ein No-op.
// „Nicht aufwertbar" = legendär | inert (No-op-Effektart) | max (Stufe IV). `reason` speist Label/Meldung in der UI.
const TIER_INERT_KINDS = new Set(["joker", "transparentFarb", "crossSeg"]);
export function upgradeInfo(fam, tier) {
  if (!fam) return { can: false, reason: null };
  if (fam.legendary) return { can: false, reason: "legendary" };
  if (TIER_INERT_KINDS.has(fam.base && fam.base.kind)) return { can: false, reason: "inert" };
  if (!(typeof tier === "number" && tier < MAX_TIER)) return { can: false, reason: "max" };
  return { can: true, reason: null };
}
// Kreuzgang-Bindeglied-Span (Bedingung minimal weiten): I/II ±1, III/IV ±2.
const bindSpanFor = (tier) => (tier === "legendary" || tier >= 3 ? 2 : 1);
// Rampe-Schwelle (Bedingung minimal weiten): Wert ≤ 5 + (Stufe−1).
const rampThresholdFor = (tier) => 5 + (tier === "legendary" ? 0 : (tier || 1) - 1);

/* ============================================================
   FORMEN (Polyominoes) — Zellenmengen [dr,dc] relativ zu einem Anker (0,0). Rotation in 4 Lagen (außer `zeile`,
   die immer eine ganze Segment-Zeile ist). `line4` (Tetromino I) deckt rotiert auch die vertikale Linie ab
   (Pfeiler „über Segmente"). `block_2x3` und `zeile` sind die großen Legendär-Formen.
   ============================================================ */
const SHAPES = {
  single:    [[0, 0]],
  domino:    [[0, 0], [0, 1]],
  tromino_i: [[0, 0], [0, 1], [0, 2]],
  tromino_l: [[0, 0], [1, 0], [1, 1]],
  line4:     [[0, 0], [0, 1], [0, 2], [0, 3]],          // Tetromino I (rotiert = vertikale Linie)
  tetro_l:   [[0, 0], [1, 0], [2, 0], [2, 1]],
  tetro_t:   [[0, 0], [0, 1], [0, 2], [1, 1]],
  tetro_s:   [[0, 1], [0, 2], [1, 0], [1, 1]],
  block2x2:  [[0, 0], [0, 1], [1, 0], [1, 1]],
  block2x3:  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]],
  zeile:     [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],  // ganze Segment-Zeile (keine Rotation)
};
const NO_ROTATE = new Set(["zeile", "single", "block2x2"]); // symmetrisch/zeilengebunden → eine Lage genügt

const normalize = (cells) => {
  const minR = Math.min(...cells.map((x) => x[0])), minC = Math.min(...cells.map((x) => x[1]));
  return cells.map(([r, c]) => [r - minR, c - minC]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
const rot90 = (cells) => cells.map(([r, c]) => [c, -r]);
// Distinkte Rotationslagen einer Form (bis zu 4).
export function shapeRotations(form) {
  const base = SHAPES[form];
  if (!base) return [];
  if (NO_ROTATE.has(form)) return [normalize(base)];
  const out = [], seen = new Set();
  let cur = normalize(base);
  for (let i = 0; i < 4; i++) { const k = JSON.stringify(cur); if (!seen.has(k)) { seen.add(k); out.push(cur); } cur = normalize(rot90(cur)); }
  return out;
}

// Belegte Zellen (Positionen) aller Gebäude.
export const occupiedCells = (buildings) => new Set((buildings || []).flatMap((b) => b.footprint));
const sameSet = (a, b) => a.length === b.length && (() => { const s = new Set(a); return b.every((x) => s.has(x)); })();

// Alle gültigen Platzierungen einer Form (in-Gitter UND kein Overlap mit `buildings`). Dedupliziert nach Footprint.
export function enumeratePlacements(form, buildings = []) {
  const occ = occupiedCells(buildings);
  const out = [], seenFp = new Set();
  for (const cells of shapeRotations(form)) {
    for (let anchor = 0; anchor < N_POS; anchor++) {
      const ar = rowOf(anchor), ac = colOf(anchor);
      let ok = true; const fp = [];
      for (const [dr, dc] of cells) {
        const r = ar + dr, cc = ac + dc;
        if (r < 0 || r >= ROWS || cc < 0 || cc >= COLS) { ok = false; break; }
        const p = posOf(r, cc);
        if (occ.has(p)) { ok = false; break; }
        fp.push(p);
      }
      if (!ok) continue;
      const sorted = fp.slice().sort((x, y) => x - y);
      const key = sorted.join(",");
      if (!seenFp.has(key)) { seenFp.add(key); out.push(sorted); }
    }
  }
  return out;
}
// Ist `footprint` eine gültige Platzierung von `form` (Form korrekt, in-Gitter, kein Overlap mit `buildings`)?
export function isValidFootprint(form, footprint, buildings = []) {
  if (!Array.isArray(footprint) || !footprint.length) return false;
  return enumeratePlacements(form, buildings).some((fp) => sameSet(fp, footprint));
}

/* ============================================================
   KATALOG — 22 Stufen-Familien (7 value · 7 score · 8 formation) + 6 legendäre (2 je Kategorie).
   `base` trägt Effekt-Art (kind) + Basiswert (Stufe I). Alle Basiswerte = Platzhalter.
   ============================================================ */
export const ARCHITECT_FAMILIES = {
  /* ---- value · Tragwerk (I–IV) ---- */
  A_STUETZE:  { id: "A_STUETZE",  name: "Stützbalken",  category: "value", form: "domino",    base: { kind: "flat", value: 1 } },
  A_RIEGEL:   { id: "A_RIEGEL",   name: "Riegel",       category: "value", form: "tromino_i", base: { kind: "flat", value: 1 } },
  A_QUADER:   { id: "A_QUADER",   name: "Quader",       category: "value", form: "block2x2",  base: { kind: "flat", value: 2 } },
  A_RAMPE:    { id: "A_RAMPE",    name: "Rampe",        category: "value", form: "tetro_s",   base: { kind: "lowValue", value: 2 } },
  A_BUNTGLAS: { id: "A_BUNTGLAS", name: "Buntglas",     category: "value", form: "tetro_t",   base: { kind: "color", value: 3 }, colorLocked: true },
  A_FIRST:    { id: "A_FIRST",    name: "Firstträger",  category: "value", form: "line4",     base: { kind: "target", value: 3 }, target: "highest" },
  A_SOCKEL:   { id: "A_SOCKEL",   name: "Sockel",       category: "value", form: "tetro_l",   base: { kind: "target", value: 3 }, target: "lowest" },

  /* ---- score · Handelsbauten (I–IV) ---- */
  A_ZOLLHAUS:    { id: "A_ZOLLHAUS",    name: "Zollhaus",    category: "score", form: "domino",  base: { kind: "flat", score: 35 } },
  A_KONTOR:      { id: "A_KONTOR",      name: "Kontor",      category: "score", form: "tetro_l", base: { kind: "flat", score: 65 } },
  A_REIHENHAUS:  { id: "A_REIHENHAUS",  name: "Reihenhaus",  category: "score", form: "line4",   base: { kind: "streak", score: 9 } },
  A_ZINNE:       { id: "A_ZINNE",       name: "Zinne",       category: "score", form: "tetro_t", base: { kind: "crit", score: 80 } }, // Pass3: 130→80 (Blitz-Crit-Synergie dämpfen)
  A_ZUNFTHAUS:   { id: "A_ZUNFTHAUS",   name: "Zunfthaus",   category: "score", form: "tetro_t", base: { kind: "color", score: 130 }, colorLocked: true },
  A_GIEBEL:      { id: "A_GIEBEL",      name: "Giebel",      category: "score", form: "line4",   base: { kind: "target", score: 160 }, target: "highest" },
  A_MEILENSTEIN: { id: "A_MEILENSTEIN", name: "Meilenstein", category: "score", form: "block2x2", base: { kind: "milestone", score: 200, every: 5 } },

  /* ---- formation · Sakralbau (I–IV) ---- */
  A_KLAMMER:    { id: "A_KLAMMER",    name: "Klammer",    category: "formation", form: "domino",    base: { kind: "joker", types: ["farbblock"] } },
  A_ARKADE:     { id: "A_ARKADE",     name: "Arkade",     category: "formation", form: "domino",    base: { kind: "transparentFarb" } },
  A_KREUZGANG:  { id: "A_KREUZGANG",  name: "Kreuzgang",  category: "formation", form: "tromino_l", base: { kind: "bind" } },
  A_FRIES:      { id: "A_FRIES",      name: "Fries",      category: "formation", form: "block2x2",  base: { kind: "joker", types: ["wiederholung"] } },
  A_PFEILER:    { id: "A_PFEILER",    name: "Pfeiler",    category: "formation", form: "line4",     base: { kind: "crossSeg" } },
  A_GRUNDSTEIN: { id: "A_GRUNDSTEIN", name: "Grundstein", category: "formation", form: "block2x2",  base: { kind: "anker", factor: 1.10 } },
  A_GEWOELBE:   { id: "A_GEWOELBE",   name: "Gewölbe",    category: "formation", form: "tetro_t",   base: { kind: "joker", types: ["wiederholung", "treppe"] } },

  /* ---- legendär (keine Stufen, kommen fertig; 2 je Kategorie) ---- */
  A_FUNDAMENT:  { id: "A_FUNDAMENT",  name: "Fundamentplatte", category: "value",     form: "zeile",    base: { kind: "flat", value: 2 },   legendary: true },
  A_BOLLWERK:   { id: "A_BOLLWERK",   name: "Bollwerk",        category: "value",     form: "block2x3", base: { kind: "flat", value: 2 },   legendary: true },
  A_SCHATZ:     { id: "A_SCHATZ",     name: "Schatzkammer",    category: "score",     form: "block2x2", base: { kind: "mult", factor: 1.3 }, legendary: true },
  A_PRUNKSAAL:  { id: "A_PRUNKSAAL",  name: "Prunksaal",       category: "score",     form: "zeile",    base: { kind: "flat", score: 100 },  legendary: true },
  A_KATHEDRALE: { id: "A_KATHEDRALE", name: "Kathedrale",      category: "formation", form: "zeile",    base: { kind: "formMult", factor: 1.4 }, legendary: true },
  A_BASILIKA:   { id: "A_BASILIKA",   name: "Basilika",        category: "formation", form: "zeile",    base: { kind: "joker", types: ["wiederholung", "farbblock", "treppe", "wechsel"] }, legendary: true },
  // Prisma (Joker alle 4) war als normales Formations-Gebäude zu stark (schon nach dem 1. Lauf dominant) → in die
  // Legendären gezogen: nur noch über den seltenen Legendär-Slot, Effekt unverändert (Tetro-T, 4 Zellen).
  A_PRISMA:     { id: "A_PRISMA",     name: "Prisma",          category: "formation", form: "tetro_t",  base: { kind: "joker", types: ["wiederholung", "farbblock", "treppe", "wechsel"] }, legendary: true },
};
export const familyDef = (id) => ARCHITECT_FAMILIES[id] || null;
export const CATEGORIES = ["value", "score", "formation"];

/* ============================================================
   STATE
   ============================================================ */
export function initialArchitect() {
  return {
    buildings: [],       // Building[] = { id, familyId, tier, footprint:number[], colorChoice }
    offers: null,        // aktuelles Angebot (Array {familyId, tier, legendary?, used}) oder null außerhalb der Phase
    nextId: 1,           // fortlaufende Gebäude-id
    winCounters: {},     // je Gebäude-id: Siege auf der Abdeckung (Meilenstein-Schwelle)
    actedMain: false,    // Hauptaktion (errichten/ausbauen) in DIESER Phase verbraucht?
    moved: false,        // 1× versetzen in DIESER Phase verbraucht?
    hzCompletions: 0,    // Telemetrie: Summe erreichter Häuserzeilen über den Run (bei Phasen-Ende gezählt)
  };
}

/* ============================================================
   ANGEBOT (deterministisch über rng) — 3 Baupläne (Familie + Stufe). Stufe tier-gewichtet; max 1 legendär je
   Angebot; keine doppelte Familie. Legendäre nur, wenn nicht schon errichtet.
   ============================================================ */
// Diagnose-Haken (nur Sim): ARCH_ONLY_CAT=value|score|formation → das Angebot enthält nur diese Kategorie.
// So lässt sich der Eigenbeitrag JE KATEGORIE messen (welche Kategorie treibt den Score/die Spät-Lastigkeit?).
const ONLY_CAT = (typeof process !== "undefined" && process.env && process.env.ARCH_ONLY_CAT) || null;

function weightedTier(rng, rareShift = _archRareShift) {
  const entries = Object.entries(tierWeightsForShift(rareShift));
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [t, w] of entries) { if (r < w) return Number(t); r -= w; }
  return Number(entries[entries.length - 1][0]);
}
// #217: rareShift default = Env-Hook (Sim). Der Grad-Reward reicht zur Laufzeit masteryRareShift(grade) durch (Grad 0 = 0 = Basis).
export function buildArchitectOffer(architect, rng, rareShift = _archRareShift) {
  const builtLeg = new Set((architect.buildings || []).filter((b) => familyDef(b.familyId)?.legendary).map((b) => b.familyId));
  const offers = [], usedFam = new Set();
  // Legendär-Slot (höchstens einer): expliziter Wurf, dann eine noch nicht errichtete legendäre Familie ziehen.
  const catOk = (f) => !ONLY_CAT || f.category === ONLY_CAT;
  const legPool = Object.values(ARCHITECT_FAMILIES).filter((f) => f.legendary && !builtLeg.has(f.id) && catOk(f));
  if (rng() < ARCHITECT_LEGENDARY_CHANCE && legPool.length) {
    const f = legPool[Math.floor(rng() * legPool.length)];
    offers.push({ familyId: f.id, tier: "legendary", legendary: true, used: false });
    usedFam.add(f.id);
  }
  const normalPool = Object.values(ARCHITECT_FAMILIES).filter((f) => !f.legendary && catOk(f));
  let guard = 0;
  while (offers.length < ARCHITECT_OFFER && guard++ < 100) {
    const pool = normalPool.filter((f) => !usedFam.has(f.id));
    if (!pool.length) break;
    // Kategorie-gewichtete Ziehung (Pass2): formation seltener (ARCHITECT_CAT_WEIGHT). Ein rng()-Zug je Familie.
    const total = pool.reduce((a, fam) => a + (ARCHITECT_CAT_WEIGHT[fam.category] ?? 1), 0);
    let r = rng() * total, f = pool[pool.length - 1];
    for (const fam of pool) { const w = ARCHITECT_CAT_WEIGHT[fam.category] ?? 1; if (r < w) { f = fam; break; } r -= w; }
    usedFam.add(f.id);
    offers.push({ familyId: f.id, tier: weightedTier(rng, rareShift), used: false });
  }
  return offers;
}

/* ============================================================
   STRUKTUR-BONI — vollständig abgedeckte Zeilen/Spalten/2×2-Viertel → ×Faktor auf die beteiligten Positionen.
   Faktoren stapeln multiplikativ (eine Position kann in Zeile UND Spalte UND Viertel liegen). Kompoundiert, weil
   der Faktor pro Durchlauf gilt: früh geschlossen → über mehr Durchläufe wirksam.
   ============================================================ */
export function structureFactorMap(coverSet) {
  const sf = new Array(N_POS).fill(1);
  for (let r = 0; r < ROWS; r++) {                     // volle Segment-Zeile (5) — braucht Ausrichtung über die Spalten
    let full = true;
    for (let c = 0; c < COLS; c++) if (!coverSet.has(posOf(r, c))) { full = false; break; }
    if (full) for (let c = 0; c < COLS; c++) sf[posOf(r, c)] *= HAEUSERZEILE_FACTOR;
  }
  for (let c = 0; c < COLS; c++) {                     // volle Spalte über alle 8 Segmente (8) — braucht vertikale Ausrichtung
    let full = true;
    for (let r = 0; r < ROWS; r++) if (!coverSet.has(posOf(r, c))) { full = false; break; }
    if (full) for (let r = 0; r < ROWS; r++) sf[posOf(r, c)] *= SPALTE_FACTOR;
  }
  for (let r0 = 0; r0 <= ROWS - COLS; r0++) {           // Diagonalen (5 Zellen, je 1 pro Segment UND Spalte) — Haupt & Gegen
    const main = [], anti = [];
    for (let i = 0; i < COLS; i++) { main.push(posOf(r0 + i, i)); anti.push(posOf(r0 + i, COLS - 1 - i)); }
    if (main.every((p) => coverSet.has(p))) for (const p of main) sf[p] *= DIAGONALE_FACTOR;
    if (anti.every((p) => coverSet.has(p))) for (const p of anti) sf[p] *= DIAGONALE_FACTOR;
  }
  // Kein 2×2-Viertel-Bonus: den holt jeder dichte Klumpen (auch naiv) → hebt den Boden statt Können auszudrücken.
  // Zeile/Spalte/Diagonale verlangen bewusste Ausrichtung, die ein Zufallsspieler kaum trifft → dort lebt der Skill-Gap.
  return sf;
}

/* ============================================================
   PRECOMPUTE (zu Durchlauf-Beginn, stabil pro Durchlauf) — je Position die aufgelösten value-/score-Effekte
   (target highest/lowest hier EINMAL bestimmt) + Häuserzeile-Faktor je Position. Gebäude überlappen nie →
   je Position höchstens EIN value- und EIN score-Gebäude.
   ============================================================ */
export function precomputeArchitect(architect, order, deck) {
  const value = Array.from({ length: N_POS }, () => null);
  const score = Array.from({ length: N_POS }, () => null);
  const segFactor = new Array(N_POS).fill(1);
  const cover = new Array(N_POS).fill(false);
  const cardVal = (p) => (deck[order[p]] ? deck[order[p]].value : 0);

  for (const b of architect.buildings || []) {
    const fam = familyDef(b.familyId);
    if (!fam) continue;
    for (const p of b.footprint) cover[p] = true;
    if (fam.category === "value") {
      const eff = resolveNumEffect(fam, b, "value", order, deck, cardVal);
      for (const [p, e] of eff) value[p] = e;
    } else if (fam.category === "score") {
      const eff = resolveNumEffect(fam, b, "score", order, deck, cardVal);
      for (const [p, e] of eff) score[p] = e;
    }
    // formation-Gebäude wirken über architectFormSpec (computeFormations), nicht hier.
  }
  // Struktur-Boni (Zeile/Spalte/Diagonale) — multiplikativ auf jede beteiligte Position.
  const coverSet = new Set(); for (let p = 0; p < N_POS; p++) if (cover[p]) coverSet.add(p);
  const sf = structureFactorMap(coverSet);
  for (let p = 0; p < N_POS; p++) segFactor[p] = sf[p];
  return { value, score, segFactor };
}

// Löst die (positionsgebundenen) value-/score-Effekte eines Gebäudes auf → [ [pos, effect], … ].
// target-Familien (highest/lowest) legen ihren Effekt NUR auf die Zielposition (einmal bestimmt).
function resolveNumEffect(fam, b, cat, order, deck, cardVal) {
  const base = fam.base;
  const out = [];
  if (base.kind === "target") {
    const cmp = fam.target === "highest"
      ? (a, c) => cardVal(c) > cardVal(a) || (cardVal(c) === cardVal(a) && c < a)
      : (a, c) => cardVal(c) < cardVal(a) || (cardVal(c) === cardVal(a) && c < a);
    let tgt = b.footprint[0];
    for (const p of b.footprint) if (cmp(tgt, p)) tgt = p;
    const amount = tierNum(cat === "value" ? base.value : base.score, b.tier);
    out.push([tgt, { kind: "target", amount, familyId: fam.id, buildingId: b.id }]);
    return out;
  }
  for (const p of b.footprint) {
    let e = null;
    if (base.kind === "flat") e = { kind: "flat", amount: tierNum(cat === "value" ? base.value : base.score, b.tier) };
    else if (base.kind === "lowValue") e = { kind: "lowValue", amount: tierNum(base.value, b.tier), threshold: rampThresholdFor(b.tier) };
    else if (base.kind === "color") e = { kind: "color", amount: tierNum(cat === "value" ? base.value : base.score, b.tier), colorChoice: b.colorChoice };
    else if (base.kind === "streak") e = { kind: "streak", amount: tierNum(base.score, b.tier) };
    else if (base.kind === "crit") e = { kind: "crit", amount: tierNum(base.score, b.tier) };
    else if (base.kind === "milestone") e = { kind: "milestone", amount: tierNum(base.score, b.tier), every: base.every, buildingId: b.id };
    else if (base.kind === "mult") e = { kind: "mult", factor: base.factor }; // Schatzkammer (legendär, keine Stufe)
    if (e) { e.familyId = fam.id; e.buildingId = b.id; out.push([p, e]); }
  }
  return out;
}

/* ---- Effekt-Anwendung (Engine, resolveTrick) ---- */
// value: +temp Wert VOR dem Vergleich (an actualPos). pCard liefert Wert/Farbe für die Bedingungen.
export function architectValueBonus(pre, actualPos, pCard) {
  const e = pre && pre.value[actualPos];
  if (!e) return 0;
  if (e.kind === "flat") return e.amount;
  if (e.kind === "lowValue") return pCard.value <= e.threshold ? e.amount : 0;
  if (e.kind === "color") return pCard.suit === e.colorChoice ? e.amount : 0;
  if (e.kind === "target") return e.amount; // Effekt liegt nur auf der Zielposition
  return 0;
}
// score: bei Sieg an actualPos → { flat (in scoreBase), mult (eigener Faktor), bump (Gebäude-id für Meilenstein-Zähler) }.
// Häuserzeile fließt IMMER als Mult (segFactor). `ctx` = { isCrit, serieStreak, suit }; `counters` = winCounters (Lesen).
export function architectScore(pre, actualPos, ctx, counters) {
  let flat = 0, mult = pre ? (pre.segFactor[actualPos] || 1) : 1, bump = null;
  const e = pre && pre.score[actualPos];
  if (e) {
    switch (e.kind) {
      case "flat":     flat += e.amount; break;
      case "streak":   flat += e.amount * (ctx.serieStreak || 0); break;
      case "crit":     if (ctx.isCrit) flat += e.amount; break;
      case "color":    if (ctx.suit === e.colorChoice) flat += e.amount; break;
      case "target":   flat += e.amount; break;
      case "mult":     mult *= e.factor; break;
      case "milestone": {
        const next = (counters[e.buildingId] || 0) + 1;
        bump = e.buildingId;
        if (next % (e.every || 5) === 0) flat += e.amount;
        break;
      }
      default: break;
    }
  }
  return { flat, mult, bump };
}

/* ============================================================
   FORMATIONS-DIREKTIVEN (von computeFormations gelesen) — je Position, was die formation-Gebäude an der Erkennung
   biegen. Rein aus den Gebäuden + der aktuellen Reihenfolge/Deck abgeleitet (deck reserviert für spätere,
   wert-abhängige Direktiven).
   ============================================================ */
export function architectFormSpec(architect, order, deck) {
  const jokerW = new Set(), jokerF = new Set(), jokerT = new Set(), jokerX = new Set();
  const transparentFarb = new Set();
  const crossSeg = new Set();
  const bind = {};      // pos → Bindeglied-Span (Kreuzgang)
  const anker = {};     // pos → Anker-Faktor (Grundstein)
  const formMult = {};  // pos → zusätzlicher Formations-Mult (Kathedrale)
  const jokerSetFor = { wiederholung: jokerW, farbblock: jokerF, treppe: jokerT, wechsel: jokerX };
  let any = false;
  for (const b of architect.buildings || []) {
    const fam = familyDef(b.familyId);
    if (!fam || fam.category !== "formation") continue;
    any = true;
    const k = fam.base.kind;
    for (const p of b.footprint) {
      if (k === "joker") { for (const t of fam.base.types) jokerSetFor[t].add(p); }
      else if (k === "transparentFarb") transparentFarb.add(p);
      else if (k === "crossSeg") crossSeg.add(rowOf(p)); // Pfeiler: öffnet die 1D-Segmentgrenze der berührten Zeilen
      else if (k === "bind") bind[p] = Math.max(bind[p] || 0, bindSpanFor(b.tier));
      else if (k === "anker") anker[p] = Math.max(anker[p] || 0, tierFactor(fam.base.factor, b.tier));
      else if (k === "formMult") formMult[p] = (formMult[p] || 1) * fam.base.factor;
    }
  }
  return any ? { jokerW, jokerF, jokerT, jokerX, transparentFarb, crossSeg, bind, anker, formMult } : null;
}

/* ============================================================
   TELEMETRIE (Sim-Metriken)
   ============================================================ */
export function summarizeArchitect(architect) {
  const buildings = architect.buildings || [];
  const occ = occupiedCells(buildings);
  const byCat = { value: 0, score: 0, formation: 0 };
  const tierDist = { 1: 0, 2: 0, 3: 0, 4: 0, legendary: 0 };
  for (const b of buildings) {
    const fam = familyDef(b.familyId);
    if (fam) byCat[fam.category] += 1;
    tierDist[b.tier] = (tierDist[b.tier] || 0) + 1;
  }
  // Strukturen am Run-Ende: voll abgedeckte Zeilen/Spalten/2×2-Viertel.
  let hzRows = 0, hzCols = 0, districts = 0;
  for (let r = 0; r < ROWS; r++) {
    let full = true;
    for (let c = 0; c < COLS; c++) if (!occ.has(posOf(r, c))) { full = false; break; }
    if (full) hzRows += 1;
  }
  for (let c = 0; c < COLS; c++) {
    let full = true;
    for (let r = 0; r < ROWS; r++) if (!occ.has(posOf(r, c))) { full = false; break; }
    if (full) hzCols += 1;
  }
  for (let r = 0; r < ROWS - 1; r++) for (let c = 0; c < COLS - 1; c++)
    if ([posOf(r, c), posOf(r, c + 1), posOf(r + 1, c), posOf(r + 1, c + 1)].every((p) => occ.has(p))) districts += 1;
  let diagonals = 0;
  for (let r0 = 0; r0 <= ROWS - COLS; r0++) {
    const main = [], anti = [];
    for (let i = 0; i < COLS; i++) { main.push(posOf(r0 + i, i)); anti.push(posOf(r0 + i, COLS - 1 - i)); }
    if (main.every((p) => occ.has(p))) diagonals += 1;
    if (anti.every((p) => occ.has(p))) diagonals += 1;
  }
  return {
    buildings: buildings.length,
    coverage: occ.size / N_POS,
    byCategory: byCat,
    tierDist,
    houseRows: hzRows,
    houseCols: hzCols,
    districts,
    diagonals,
  };
}
