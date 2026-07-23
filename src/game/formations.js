/* ============================================================
   FORMATIONS-ENGINE (V2 §22.7) — reine Funktion, kein rng/Date.
   Aus der (persistenten) Spieler-Reihenfolge + den DAUERWERTEN der Karten wird pro Position
   ein Formations-Multiplikator berechnet. Basis-Formationen sind SEGMENTGEBUNDEN (Arena):
   ein Lauf endet an jeder Segmentgrenze (Position % 5 == 0 beginnt ein neues Segment).
   Anker (E7/E8) und Formations-Werkzeuge (E1–E6/E9) kommen erst mit dem Perk-Rewrite (Phase 5).

   Vier Basis-Formationen:
   - Wiederholung: ≥2 benachbarte Karten mit gleichem Wert. Faktor: 2.→×1,30, 3.→×1,60, 4.+→×2,00.
   - Farbblock:    ≥3 benachbarte Karten gleicher Farbe.     Faktor: ab 3. ×1,30, je weitere +0,15.
   - Treppe:       ≥3 benachbarte, streng steigende Werte.    Faktor: ab 3. ×1,25, je weitere +0,15.
   - Wechsel:      ≥3 benachbarte Karten, Nachbardifferenz ≥6, Richtung ALTERNIEREND (Zick-Zack).
                                                              Faktor: ab 3. ×1,25, je weitere +0,15.

   Liegt eine Karte in mehreren Formationen, ist ihr Multiplikator das PRODUKT der Pro-Karte-Faktoren.
   ============================================================ */
export const SEGMENT_SIZE = 5;
const WECHSEL_MIN_DIFF = 6;

// Faktor je Ordinalstelle (1-basiert) innerhalb des Laufs.
function wiederholungFactor(ordinal) {
  if (ordinal <= 1) return 1;
  if (ordinal === 2) return 1.30;
  if (ordinal === 3) return 1.60;
  return 2.00; // 4. und jede weitere
}
// Farbblock/Treppe/Wechsel: 1. & 2. ohne Bonus, ab der 3. Karte `base`, je weitere +0,15.
function escalatingFactor(ordinal, base) {
  return ordinal <= 2 ? 1 : base + (ordinal - 3) * 0.15;
}
const FARBBLOCK_BASE = 1.30, TREPPE_BASE = 1.25, WECHSEL_BASE = 1.25;

// Maximale Läufe über eine Paar-Bedingung (Wiederholung/Farbblock/Treppe), segmentgebunden.
// canExtend(k) prüft, ob Position k und k+1 denselben Lauf fortsetzen.
function markPairRuns(n, minLen, canExtend, assign) {
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && (j + 1) % SEGMENT_SIZE !== 0 && canExtend(j)) j++;
    const len = j - i + 1;
    if (len >= minLen) for (let k = i; k <= j; k++) assign(k, k - i + 1); // ordinal = k - i + 1
    i = j + 1;
  }
}

// Wechsel (Zick-Zack): jede Nachbardifferenz ≥6 UND Richtungswechsel; segmentgebunden.
// Bricht ein Lauf an einem gültigen (großen), aber gleichgerichteten Schritt, kann DIESE Karte
// einen neuen Lauf beginnen (der Schritt ist ein gültiger Erst-Schritt) → Restart bei j statt j+1.
function markWechsel(val, n, assign) {
  for (let s = 0; s < n; s += SEGMENT_SIZE) {
    const segEnd = Math.min(s + SEGMENT_SIZE, n) - 1; // letzte Position im Segment
    let i = s;
    while (i < segEnd) {
      let j = i, prevDir = 0;
      while (j < segEnd) {
        const diff = val[j + 1] - val[j];
        const dir = Math.sign(diff);
        if (Math.abs(diff) >= WECHSEL_MIN_DIFF && dir !== 0 && (prevDir === 0 || dir === -prevDir)) {
          prevDir = dir; j++;
        } else break;
      }
      if (j - i + 1 >= 3) for (let k = i; k <= j; k++) assign(k, k - i + 1);
      // Restart: gleichgerichteter großer Schritt (j→j+1) → Karte j startet neu; sonst nach j+1.
      if (j < segEnd && j > i && Math.abs(val[j + 1] - val[j]) >= WECHSEL_MIN_DIFF) i = j;
      else i = j + 1;
    }
  }
}

/* Berechnet für jede Position { mult, formations: [{ type, ordinal, factor }] }.
   `order` = Spieler-Ziehreihenfolge (Deck-Indizes), `deck` = Karten (value/suit/…). */
export function computeFormations(order, deck) {
  const n = order.length;
  const cards = order.map((di) => deck[di]);
  const val = cards.map((c) => c.value);
  const out = Array.from({ length: n }, () => ({ mult: 1, formations: [] }));
  const add = (pos, type, ordinal, factor) => {
    if (factor > 1) out[pos].mult *= factor;
    out[pos].formations.push({ type, ordinal, factor });
  };

  markPairRuns(n, 2, (k) => val[k] === val[k + 1],
    (pos, ord) => add(pos, "wiederholung", ord, wiederholungFactor(ord)));
  markPairRuns(n, 3, (k) => cards[k].suit === cards[k + 1].suit,
    (pos, ord) => add(pos, "farbblock", ord, escalatingFactor(ord, FARBBLOCK_BASE)));
  markPairRuns(n, 3, (k) => val[k + 1] > val[k],
    (pos, ord) => add(pos, "treppe", ord, escalatingFactor(ord, TREPPE_BASE)));
  markWechsel(val, n, (pos, ord) => add(pos, "wechsel", ord, escalatingFactor(ord, WECHSEL_BASE)));

  return out;
}

// Trägt eine Position eine wirksame Formation (Score-Faktor > 1)? → speist den Formations-Stat (§22.3).
export const positionHasFormation = (posForm) => !!posForm && posForm.mult > 1;
