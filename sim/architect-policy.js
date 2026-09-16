// Architekt-Bau-Policy (Sim). Treibt die Architekt-Phase (Shop-Ersatz). Der Treiber (run.js) ruft wiederholt, bis
// die Phase über ARCHITECT_DONE verlässt — jede zurückgegebene Aktion MUSS den State verändern. Zwei Modi:
//  - random (naiv): zufällige, cap-gültige Bau-/Ausbau-Aktion, dann fertig. Kein Versetzen/Abreißen.
//  - greedy (optimiert): plant unter dem Baufeld-Deckel. Eine Phase = optional DEMOLISH (Swap) → BUILD/UPGRADE
//    (Hauptaktion) → optional MOVE (Struktur schließen) → DONE. Primärtreiber ist der STRUKTUR-Fortschritt
//    (Zeile/Spalte/Viertel früh schließen → kompoundiert über die Restlaufzeit); value/target/Kategorie feinjustieren.
//
// Rein deterministisch über den injizierten rng (nur der random-Modus nutzt ihn). Gleicher Seed + Policy → gleicher Run.
import {
  familyDef, enumeratePlacements, ROWS, COLS, posOf, MAX_TIER, occupiedCells, MAX_COVER, structureFactorMap,
} from "../src/game/architect.js";
import { SUIT_ORDER } from "../src/game/constants.js";

/* ---- Struktur-Heuristik (nur Policy): treibt den Greedy zu VOLLEN Zeilen/Spalten (nur die zahlen einen Faktor).
   Diskreter Sprung bei Komplettierung (der eigentliche Payout) + sanfter quadratischer Gradient als Wegweiser zur
   volleren Struktur. Keine Viertel — die holt auch der Zufall.

   Als Objekt statt als Modul-Konstanten, damit `sim/tune.js` die elf Schrauben GEMEINSAM optimieren kann: einzeln
   betrachtet sagt keine von ihnen etwas, weil sie gegeneinander gewichten. Die Werte sind unverändert die von Hand
   gesetzten; ohne Übergabe bleibt das Verhalten Zug für Zug gleich (test/sim-architect-weights.test.js). ---- */
export const DEFAULT_WEIGHTS = Object.freeze({
  row: 100, col: 200, diag: 150, // Spalte (8 Zellen) > Zeile (5): teurer, höherer Payout
  partial: 0.3,        // Gewicht des Teil-Fortschritts relativ zur Komplettierung (Gradient, kein Selbstzweck)
  struct: 5,           // Gewicht des Struktur-Fortschritts im Bau-Score (Pass3b: 10→5, gegen Tunnelblick auf Zeilen)
  val: 1.5,            // Gewicht der Effekt-Positionierung (value auf schwache, score/formation auf starke Felder)
  cat: 10,             // Gewicht des Kategorie-Ausgleichs
  tier: 5,             // Gewicht der Bauplan-Stufe
  swapGain: 12,        // Mindest-Struktur-Gewinn, damit ein Swap (Abriss + Neubau) sich lohnt
  moveGain: 10,        // Mindest-Struktur-Gewinn für den 1×-Move
  maxVictimTier: 2,    // nur billig-investierte Gebäude wegwerfen (Stufen-Verlust nicht in der Heuristik)
});

const cardValAt = (s, p) => (s.deck[s.playerOrder[p]] ? s.deck[s.playerOrder[p]].value : 0);
const sumVals = (s, fp) => fp.reduce((t, p) => t + cardValAt(s, p), 0);
const coverSetOf = (buildings) => occupiedCells(buildings);

function structScore(coverSet, w) {
  let s = 0;
  for (let r = 0; r < ROWS; r++) { let n = 0; for (let c = 0; c < COLS; c++) if (coverSet.has(posOf(r, c))) n++; const f = n / COLS; s += n === COLS ? w.row : w.row * w.partial * f * f; }
  for (let c = 0; c < COLS; c++) { let n = 0; for (let r = 0; r < ROWS; r++) if (coverSet.has(posOf(r, c))) n++; const f = n / ROWS; s += n === ROWS ? w.col : w.col * w.partial * f * f; }
  for (let r0 = 0; r0 <= ROWS - COLS; r0++) {   // Diagonalen (Haupt & Gegen), je 5 Zellen
    let nm = 0, na = 0;
    for (let i = 0; i < COLS; i++) { if (coverSet.has(posOf(r0 + i, i))) nm++; if (coverSet.has(posOf(r0 + i, COLS - 1 - i))) na++; }
    const fm = nm / COLS, fa = na / COLS;
    s += nm === COLS ? w.diag : w.diag * w.partial * fm * fm;
    s += na === COLS ? w.diag : w.diag * w.partial * fa * fa;
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

// Baufeld-Deckel DIESES Laufs. MAX_COVER ist nur der Modul-Default — der wirksame Deckel steht am State und kann
// höher liegen: Bauhütte (L_BAUH) hebt ihn dauerhaft um BAUHUETTE_COVER, der Fortschrittsbaum um treeCover.
// Vorher las die Policy stur die Konstante und baute deshalb NIE über 24 Zellen hinaus — die Bauhütte war für die
// Sim unsichtbar (gemessene 1,00×), obwohl der Reducer (SWAP/BUILD-Gate) die Extra-Fläche längst erlaubt.
const coverCapOf = (s) => s.architect?.maxCover ?? MAX_COVER;

// Cap-gültige Platzierungen einer Form gegen `buildings` (kein Overlap UND unter dem Baufeld-Deckel).
function cappedPlacements(form, buildings, cap = MAX_COVER) {
  const occN = occupiedCells(buildings).size;
  return enumeratePlacements(form, buildings).filter((fp) => occN + fp.length <= cap);
}

// Beste Platzierung EINES Angebots: Primär Struktur-Fortschritt, sekundär value/target-Feinlage.
function bestPlacementForOffer(s, fam, buildings, before, beforeScore, w) {
  const places = cappedPlacements(fam.form, buildings, coverCapOf(s));
  if (!places.length) return null;
  const wantLow = fam.category === "value"; // value kippt schwache Felder; score/formation reitet starke
  let bestFp = null, bestKey = -Infinity;
  for (const fp of places) {
    const after = new Set(before); for (const p of fp) after.add(p);
    const dStruct = structScore(after, w) - beforeScore;
    const valTerm = sumVals(s, fp) * (wantLow ? -1 : 1) * w.val; // Effekt-Positionierung: value auf schwache, score/formation auf starke Felder
    const key = dStruct * w.struct + valTerm;
    if (key > bestKey) { bestKey = key; bestFp = fp; }
  }
  return { fp: bestFp, key: bestKey };
}

// Hauptaktion (errichten / swappen / ausbauen). Gibt eine State-verändernde Aktion oder null zurück.
function decideMain(s, w) {
  const a = s.architect;
  const open = (a.offers || []).filter((o) => !o.used);
  const before = coverSetOf(a.buildings);
  const beforeScore = structScore(before, w);
  const byCat = { value: 0, score: 0, formation: 0 };
  for (const b of a.buildings) { const f = familyDef(b.familyId); if (f) byCat[f.category] += 1; }

  // 1) Bester Neubau, der unter den Deckel passt (fehlende Kategorie + höhere Stufe bevorzugt).
  let bestBuild = null;
  for (const off of open) {
    const fam = familyDef(off.familyId);
    const r = bestPlacementForOffer(s, fam, a.buildings, before, beforeScore, w);
    if (!r) continue;
    const catDeficit = -byCat[fam.category];
    const tierW = off.tier === "legendary" ? 5 : off.tier;
    const key = r.key + catDeficit * w.cat + tierW * w.tier;
    if (!bestBuild || key > bestBuild.key) bestBuild = { off, fam, fp: r.fp, key };
  }
  if (bestBuild) return buildActionFor(s, bestBuild.fam, bestBuild.off, bestBuild.fp);

  // 2) Kein Neubau passt (Deckel voll) → Swap: schwächstes billiges Gebäude raus, wenn ein Angebot dadurch Platz
  //    findet UND die Struktur netto klar gewinnt. (Nächster Aufruf baut in die freigemachte Fläche.)
  const victim = bestSwapVictim(s, open, beforeScore, w);
  if (victim != null) return { type: "ARCHITECT_DEMOLISH", buildingId: victim };

  // 3) Sonst ausbauen — das Gebäude mit dem höchsten Struktur-/Positions-Hebel.
  return bestUpgrade(s);
}

// Wähle ein Abriss-Opfer (id), dessen Entfernen einem Angebot Platz macht und die Struktur um mehr als w.swapGain verbessert.
function bestSwapVictim(s, open, beforeScore, w) {
  const buildings = s.architect.buildings;
  let best = null;
  for (const victim of buildings) {
    const vfam = familyDef(victim.familyId);
    if (!vfam || vfam.legendary || victim.tier > w.maxVictimTier) continue; // Legendäre/hoch-investierte behalten
    const others = buildings.filter((b) => b.id !== victim.id);
    const afterRemove = coverSetOf(others);
    const occN = afterRemove.size;
    for (const off of open) {
      const fam = familyDef(off.familyId);
      const places = enumeratePlacements(fam.form, others).filter((fp) => occN + fp.length <= coverCapOf(s));
      let localBest = -Infinity;
      for (const fp of places) { const after = new Set(afterRemove); for (const p of fp) after.add(p); const sc = structScore(after, w); if (sc > localBest) localBest = sc; }
      if (localBest === -Infinity) continue;
      const gain = localBest - beforeScore; // vs. aktuelles Brett (inkl. Opfer)
      if (gain > w.swapGain && (!best || gain > best.gain)) best = { victimId: victim.id, gain };
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

// 1×-Move: ein Gebäude umsetzen, um eine Struktur zu schließen/voranzubringen (nur wenn Struktur netto mehr als w.moveGain gewinnt).
function bestMove(s, w) {
  const a = s.architect;
  const cur = coverSetOf(a.buildings);
  if (!anyStructureNearComplete(cur, 2)) return null; // kein lohnendes Ziel → sparen
  const curScore = structScore(cur, w);
  let best = null;
  for (const b of a.buildings) {
    const fam = familyDef(b.familyId);
    if (!fam) continue;
    const others = a.buildings.filter((x) => x.id !== b.id);
    const occN = occupiedCells(others).size;
    const curKey = b.footprint.slice().sort((x, y) => x - y).join(",");
    const base = coverSetOf(others);
    for (const fp of enumeratePlacements(fam.form, others)) {
      if (occN + fp.length > coverCapOf(s)) continue;
      if (fp.slice().sort((x, y) => x - y).join(",") === curKey) continue; // identische Lage → kein Fortschritt
      const after = new Set(base); for (const p of fp) after.add(p);
      const gain = structScore(after, w) - curScore;
      if (gain > w.moveGain && (!best || gain > best.gain)) best = { buildingId: b.id, footprint: fp, gain };
    }
  }
  return best ? { type: "ARCHITECT_MOVE", buildingId: best.buildingId, footprint: best.footprint } : null;
}

// Greedy-Phase: Hauptaktion → (falls noch frei) Move → fertig. DEMOLISH setzt actedMain NICHT, daher baut der
// Folge-Aufruf in die durch den Swap freigemachte Fläche.
function greedyStep(s, w) {
  const a = s.architect;
  if (!a.actedMain) { const m = decideMain(s, w); if (m) return m; }
  if (!a.moved) { const mv = bestMove(s, w); if (mv) return mv; }
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
    const places = cappedPlacements(fam.form, a.buildings, coverCapOf(s));
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

export function architectStep(s, rng, { greedy = false, weights = null } = {}) {
  const a = s.architect;
  if (!a || !a.offers) return { type: "ARCHITECT_DONE" };
  // Ohne `weights` exakt DEFAULT_WEIGHTS — kein Merge, damit ein Tippfehler im Schlüssel auffällt statt still
  // auf den Vorgabewert zurückzufallen.
  if (greedy) return greedyStep(s, weights || DEFAULT_WEIGHTS);
  if (!a.actedMain) { const action = randomMain(s, rng); if (action) return action; }
  return { type: "ARCHITECT_DONE" };
}
