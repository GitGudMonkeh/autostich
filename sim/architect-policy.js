// Architekt-Bau-Policy (Sim). Treibt die Architekt-Phase (Shop-Ersatz). Der Treiber (run.js) ruft wiederholt, bis
// die Phase über ARCHITECT_DONE verlässt — jede zurückgegebene Aktion MUSS den State verändern. Zwei Modi:
//  - random (naiv): zufällige, cap-gültige Bau-/Ausbau-Aktion, dann fertig. Kein Versetzen/Abreißen.
//  - greedy (optimiert): plant unter dem Baufeld-Deckel. Eine Phase = optional DEMOLISH (Swap) → BUILD/UPGRADE
//    (Hauptaktion) → optional MOVE (Struktur schließen) → DONE. Primärtreiber ist der STRUKTUR-Fortschritt
//    (Zeile/Spalte/Viertel früh schließen → kompoundiert über die Restlaufzeit); value/target/Kategorie feinjustieren.
//
// Rein deterministisch über den injizierten rng (nur der random-Modus nutzt ihn). Gleicher Seed + Policy → gleicher Run.
import {
  familyDef, enumeratePlacements, rowOf, ROWS, COLS, posOf, MAX_TIER, occupiedCells, MAX_COVER, structureFactorMap,
} from "../src/game/architect.js";
import { SUIT_ORDER } from "../src/game/constants.js";

/* ---- Struktur-Heuristik (nur Policy): treibt den Greedy zu VOLLEN Zeilen/Spalten (nur die zahlen einen Faktor).
   Diskreter Sprung bei Komplettierung (der eigentliche Payout) + sanfter quadratischer Gradient (×0,3) als Wegweiser
   zur volleren Struktur. Keine Viertel — die holt auch der Zufall. Spalte (8) > Zeile (5): teurer, höherer Payout. ---- */
const W_ROW = 100, W_COL = 200, W_DIAG = 150;
const PARTIAL = 0.3;    // Gewicht des Teil-Fortschritts relativ zur Komplettierung (Gradient, kein Selbstzweck)
const STRUCT_W = 5;     // Gewicht des Struktur-Fortschritts im Bau-Score (Pass3b: 10→5, gegen Tunnelblick auf Zeilen)
const VAL_W = 1.5;      // Gewicht der Effekt-Positionierung (value auf schwache, score/formation auf starke Felder)
const CAT_W = 10;       // Gewicht des Kategorie-Ausgleichs
const TIER_W = 5;       // Gewicht der Bauplan-Stufe
const SWAP_GAIN = 12;   // Mindest-Struktur-Gewinn, damit ein Swap (Abriss + Neubau) sich lohnt
const MOVE_GAIN = 10;   // Mindest-Struktur-Gewinn für den 1×-Move
const SWAP_MAX_VICTIM_TIER = 2; // nur billig-investierte Gebäude wegwerfen (Stufen-Verlust nicht in der Heuristik)

const cardValAt = (s, p) => (s.deck[s.playerOrder[p]] ? s.deck[s.playerOrder[p]].value : 0);
const sumVals = (s, fp) => fp.reduce((t, p) => t + cardValAt(s, p), 0);
const coverSetOf = (buildings) => occupiedCells(buildings);

function structScore(coverSet) {
  let s = 0;
  for (let r = 0; r < ROWS; r++) { let n = 0; for (let c = 0; c < COLS; c++) if (coverSet.has(posOf(r, c))) n++; const f = n / COLS; s += n === COLS ? W_ROW : W_ROW * PARTIAL * f * f; }
  for (let c = 0; c < COLS; c++) { let n = 0; for (let r = 0; r < ROWS; r++) if (coverSet.has(posOf(r, c))) n++; const f = n / ROWS; s += n === ROWS ? W_COL : W_COL * PARTIAL * f * f; }
  for (let r0 = 0; r0 <= ROWS - COLS; r0++) {   // Diagonalen (Haupt & Gegen), je 5 Zellen
    let nm = 0, na = 0;
    for (let i = 0; i < COLS; i++) { if (coverSet.has(posOf(r0 + i, i))) nm++; if (coverSet.has(posOf(r0 + i, COLS - 1 - i))) na++; }
    const fm = nm / COLS, fa = na / COLS;
    s += nm === COLS ? W_DIAG : W_DIAG * PARTIAL * fm * fm;
    s += na === COLS ? W_DIAG : W_DIAG * PARTIAL * fa * fa;
  }
  return s;
}
// Ist eine Struktur höchstens `k` Zellen von der Vollständigkeit entfernt? (billiger Move-Vor-Check)
function anyStructureNearComplete(coverSet, k = 2) {
  for (let r = 0; r < ROWS; r++) { let miss = 0; for (let c = 0; c < COLS; c++) if (!coverSet.has(posOf(r, c))) miss++; if (miss > 0 && miss <= k) return true; }
  for (let c = 0; c < COLS; c++) { let miss = 0; for (let r = 0; r < ROWS; r++) if (!coverSet.has(posOf(r, c))) miss++; if (miss > 0 && miss <= k) return true; }
  for (let r0 = 0; r0 <= ROWS - COLS; r0++) {
    let mm = 0, ma = 0;
    for (let i = 0; i < COLS; i++) { if (!coverSet.has(posOf(r0 + i, i))) mm++; if (!coverSet.has(posOf(r0 + i, COLS - 1 - i))) ma++; }
    if ((mm > 0 && mm <= k) || (ma > 0 && ma <= k)) return true;
  }
  return false;
}

// Häufigste Farbe unter den abgedeckten Positionen (colorLocked-Familien: Buntglas/Zunfthaus).
function dominantSuit(s, footprint) {
  const cnt = {};
  for (const p of footprint) { const c = s.deck[s.playerOrder[p]]; if (c) cnt[c.suit] = (cnt[c.suit] || 0) + 1; }
  let best = SUIT_ORDER[0], bestN = -1;
  for (const su of SUIT_ORDER) if ((cnt[su] || 0) > bestN) { bestN = cnt[su] || 0; best = su; }
  return best;
}
const buildActionFor = (s, fam, off, fp) => {
  const action = { type: "ARCHITECT_BUILD", familyId: off.familyId, tier: off.tier, footprint: fp };
  if (fam.colorLocked) action.colorChoice = dominantSuit(s, fp);
  return action;
};

// Cap-gültige Platzierungen einer Form gegen `buildings` (kein Overlap UND unter dem Baufeld-Deckel).
function cappedPlacements(form, buildings) {
  const occN = occupiedCells(buildings).size;
  return enumeratePlacements(form, buildings).filter((fp) => occN + fp.length <= MAX_COVER);
}

// Beste Platzierung EINES Angebots: Primär Struktur-Fortschritt, sekundär value/target-Feinlage.
function bestPlacementForOffer(s, fam, buildings, before, beforeScore) {
  const places = cappedPlacements(fam.form, buildings);
  if (!places.length) return null;
  const wantLow = fam.category === "value"; // value kippt schwache Felder; score/formation reitet starke
  let bestFp = null, bestKey = -Infinity;
  for (const fp of places) {
    const after = new Set(before); for (const p of fp) after.add(p);
    const dStruct = structScore(after) - beforeScore;
    const valTerm = sumVals(s, fp) * (wantLow ? -1 : 1) * VAL_W; // Effekt-Positionierung: value auf schwache, score/formation auf starke Felder
    const key = dStruct * STRUCT_W + valTerm;
    if (key > bestKey) { bestKey = key; bestFp = fp; }
  }
  return { fp: bestFp, key: bestKey };
}

// Hauptaktion (errichten / swappen / ausbauen). Gibt eine State-verändernde Aktion oder null zurück.
function decideMain(s) {
  const a = s.architect;
  const open = (a.offers || []).filter((o) => !o.used);
  const before = coverSetOf(a.buildings);
  const beforeScore = structScore(before);
  const byCat = { value: 0, score: 0, formation: 0 };
  for (const b of a.buildings) { const f = familyDef(b.familyId); if (f) byCat[f.category] += 1; }

  // 1) Bester Neubau, der unter den Deckel passt (fehlende Kategorie + höhere Stufe bevorzugt).
  let bestBuild = null;
  for (const off of open) {
    const fam = familyDef(off.familyId);
    const r = bestPlacementForOffer(s, fam, a.buildings, before, beforeScore);
    if (!r) continue;
    const catDeficit = -byCat[fam.category];
    const tierW = off.tier === "legendary" ? 5 : off.tier;
    const key = r.key + catDeficit * CAT_W + tierW * TIER_W;
    if (!bestBuild || key > bestBuild.key) bestBuild = { off, fam, fp: r.fp, key };
  }
  if (bestBuild) return buildActionFor(s, bestBuild.fam, bestBuild.off, bestBuild.fp);

  // 2) Kein Neubau passt (Deckel voll) → Swap: schwächstes billiges Gebäude raus, wenn ein Angebot dadurch Platz
  //    findet UND die Struktur netto klar gewinnt. (Nächster Aufruf baut in die freigemachte Fläche.)
  const victim = bestSwapVictim(s, open, beforeScore);
  if (victim != null) return { type: "ARCHITECT_DEMOLISH", buildingId: victim };

  // 3) Sonst ausbauen — das Gebäude mit dem höchsten Struktur-/Positions-Hebel.
  return bestUpgrade(s);
}

// Wähle ein Abriss-Opfer (id), dessen Entfernen einem Angebot Platz macht und die Struktur > SWAP_GAIN verbessert.
function bestSwapVictim(s, open, beforeScore) {
  const buildings = s.architect.buildings;
  let best = null;
  for (const victim of buildings) {
    const vfam = familyDef(victim.familyId);
    if (!vfam || vfam.legendary || victim.tier > SWAP_MAX_VICTIM_TIER) continue; // Legendäre/hoch-investierte behalten
    const others = buildings.filter((b) => b.id !== victim.id);
    const afterRemove = coverSetOf(others);
    const occN = afterRemove.size;
    for (const off of open) {
      const fam = familyDef(off.familyId);
      const places = enumeratePlacements(fam.form, others).filter((fp) => occN + fp.length <= MAX_COVER);
      let localBest = -Infinity;
      for (const fp of places) { const after = new Set(afterRemove); for (const p of fp) after.add(p); const sc = structScore(after); if (sc > localBest) localBest = sc; }
      if (localBest === -Infinity) continue;
      const gain = localBest - beforeScore; // vs. aktuelles Brett (inkl. Opfer)
      if (gain > SWAP_GAIN && (!best || gain > best.gain)) best = { victimId: victim.id, gain };
    }
  }
  return best ? best.victimId : null;
}

// Ausbauen: Gebäude mit dem größten Hebel — Zellen in (fast) vollen Strukturen × Kartenwert zahlen pro Stufe am meisten.
function bestUpgrade(s) {
  const a = s.architect;
  const sf = structureFactorMap(coverSetOf(a.buildings)); // Struktur-Faktor je Zelle (>1 in vollen Strukturen)
  const upgradable = a.buildings.filter((b) => { const f = familyDef(b.familyId); return f && !f.legendary && b.tier < MAX_TIER; });
  if (!upgradable.length) return null;
  let best = null, bestW = -Infinity;
  for (const b of upgradable) {
    let w = 0; for (const p of b.footprint) w += sf[p] * (1 + cardValAt(s, p));
    w = w / (b.tier + 1); // niedrige Stufen zuerst (größerer relativer Sprung)
    if (w > bestW) { bestW = w; best = b; }
  }
  return { type: "ARCHITECT_UPGRADE", buildingId: best.id };
}

// 1×-Move: ein Gebäude umsetzen, um eine Struktur zu schließen/voranzubringen (nur wenn Struktur netto > MOVE_GAIN gewinnt).
function bestMove(s) {
  const a = s.architect;
  const cur = coverSetOf(a.buildings);
  if (!anyStructureNearComplete(cur, 2)) return null; // kein lohnendes Ziel → sparen
  const curScore = structScore(cur);
  let best = null;
  for (const b of a.buildings) {
    const fam = familyDef(b.familyId);
    if (!fam) continue;
    const others = a.buildings.filter((x) => x.id !== b.id);
    const occN = occupiedCells(others).size;
    const curKey = b.footprint.slice().sort((x, y) => x - y).join(",");
    const base = coverSetOf(others);
    for (const fp of enumeratePlacements(fam.form, others)) {
      if (occN + fp.length > MAX_COVER) continue;
      if (fp.slice().sort((x, y) => x - y).join(",") === curKey) continue; // identische Lage → kein Fortschritt
      const after = new Set(base); for (const p of fp) after.add(p);
      const gain = structScore(after) - curScore;
      if (gain > MOVE_GAIN && (!best || gain > best.gain)) best = { buildingId: b.id, footprint: fp, gain };
    }
  }
  return best ? { type: "ARCHITECT_MOVE", buildingId: best.buildingId, footprint: best.footprint } : null;
}

// Greedy-Phase: Hauptaktion → (falls noch frei) Move → fertig. DEMOLISH setzt actedMain NICHT, daher baut der
// Folge-Aufruf in die durch den Swap freigemachte Fläche.
function greedyStep(s) {
  const a = s.architect;
  if (!a.actedMain) { const m = decideMain(s); if (m) return m; }
  if (!a.moved) { const mv = bestMove(s); if (mv) return mv; }
  return { type: "ARCHITECT_DONE" };
}

// Random-Hauptaktion (naiv): eine zufällige cap-gültige Platzierung, sonst zufälliges Ausbauen. Kein Move/Abriss.
function randomMain(s, rng) {
  const a = s.architect;
  const open = (a.offers || []).filter((o) => !o.used);
  const shuffled = open.slice();
  for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
  for (const off of shuffled) {
    const fam = familyDef(off.familyId);
    const places = cappedPlacements(fam.form, a.buildings);
    if (places.length) {
      const fp = places[Math.floor(rng() * places.length)];
      const action = { type: "ARCHITECT_BUILD", familyId: off.familyId, tier: off.tier, footprint: fp };
      if (fam.colorLocked) action.colorChoice = SUIT_ORDER[Math.floor(rng() * SUIT_ORDER.length)];
      return action;
    }
  }
  const upgradable = a.buildings.filter((b) => { const f = familyDef(b.familyId); return f && !f.legendary && b.tier < MAX_TIER; });
  if (upgradable.length) return { type: "ARCHITECT_UPGRADE", buildingId: upgradable[Math.floor(rng() * upgradable.length)].id };
  return null;
}

export function architectStep(s, rng, { greedy = false } = {}) {
  const a = s.architect;
  if (!a || !a.offers) return { type: "ARCHITECT_DONE" };
  if (greedy) return greedyStep(s);
  if (!a.actedMain) { const action = randomMain(s, rng); if (action) return action; }
  return { type: "ARCHITECT_DONE" };
}
