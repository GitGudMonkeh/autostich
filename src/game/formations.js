/* ============================================================
   FORMATIONS-ENGINE (V2 §22.7) — reine Funktion, kein rng/Date.
   Aus der (persistenten) Spieler-Reihenfolge + den DAUERWERTEN der Karten wird pro Position
   ein Formations-Multiplikator berechnet. Basis-Formationen sind SEGMENTGEBUNDEN (Arena, §22.7/Q3):
   ein Lauf endet an jeder Segmentgrenze. Rollen (Kat. C) und Werkzeuge (Kat. E) biegen die Erkennung.

   Basis-Formationen (Faktoren §22.7, Balancing-Rework #95):
   - Wiederholung: ≥2 gleiche Werte.        2.→×1,30, 3.→×1,60, 4.→×2,00, danach je +0,50 (KEIN Cap).
   - Farbblock:    ≥3 gleiche Farbe.         ab 3. ×1,30, je weitere +0,20.
   - Treppe:       ≥3 streng steigend.       ab 3. ×1,25, je weitere +0,20.
   - Wechsel:      ≥3 Zick-Zack (Diff ≥4).   ab 3. ×1,25, je weitere +0,20.
   - Anker (E7/E8): einzelne Position ×1,25 (zählt als Formation).
   - Überlappung: steckt eine Karte in mehreren Formationen, wird ihr Faktor-Produkt zusätzlich
     mit dem Überlappungsbonus multipliziert: 2 Formationen ×1,5 · 3 ×2 · 4 ×3.

   Rollen (§22.6 C): C8 Joker (Farbe = Vorgänger), C10 Bindeglied (Treppe ±1).
   Werkzeuge (§22.6 E): E1 Wiederholung +1 fremde Karte · E2 Farbblock +1 andersfarbig ·
   E3 Treppe darf 1× gleich · E4 Treppe darf 1× Rückschritt · E5 Wechsel schon ab 2 Karten ·
   E6 Karte in zwei Treppen · E7/E8 Anker · E9 Formationen über Segmentgrenzen.
   ============================================================ */
export const SEGMENT_SIZE = 5;
const WECHSEL_MIN_DIFF = 4;

function wiederholungFactor(ordinal) {
  if (ordinal <= 1) return 1;
  if (ordinal === 2) return 1.30;
  if (ordinal === 3) return 1.60;
  return 2.00 + (ordinal - 4) * 0.50; // ab der 4.: 2,00 / 2,50 / 3,00 … kein Cap (#95)
}
function escalatingFactor(ordinal, base) {
  return ordinal <= 2 ? 1 : base + (ordinal - 3) * 0.20; // je weitere Karte +0,20 (#95)
}
// Überlappungsbonus je Anzahl Formationen auf einer Karte (#95): 2→×1,5, 3→×2, 4→×3.
const OVERLAP_BONUS = { 2: 1.5, 3: 2, 4: 3 };
const FARBBLOCK_BASE = 1.30, TREPPE_BASE = 1.25, WECHSEL_BASE = 1.25, ANKER_FACTOR = 1.25;

// Maximale Läufe über eine Paar-Bedingung, mit optional EINER erlaubten fremden Karte dazwischen (E1/E2).
// `matches(refPos, k)` prüft, ob Position k zur Formation von refPos gehört. Fremde Karten sind keine Mitglieder.
function markRuns(n, minMembers, matches, allowGap, canExtendSeg, assign) {
  let i = 0;
  while (i < n) {
    const members = [i];
    let j = i, gapUsed = false;
    while (j + 1 < n && canExtendSeg(j)) {
      if (matches(i, j + 1)) { j++; members.push(j); }
      else if (allowGap && !gapUsed && j + 2 < n && canExtendSeg(j + 1) && matches(i, j + 2)) {
        gapUsed = true; j += 2; members.push(j); // fremde Karte an j+1 überspringen
      } else break;
    }
    if (members.length >= minMembers) members.forEach((pos, idx) => assign(pos, idx + 1));
    i = j + 1;
  }
}

// Treppe: streng steigend (mit Bindeglied-Flex ±1), kein Min-/Max-Schritt.
// E3 erlaubt 1× gleich, E4 erlaubt 1× Rückschritt, E6 lässt die letzte Karte einen neuen Lauf beginnen.
function markTreppe(n, val, bind, e3, e4, e6, canExtendSeg, assign) {
  let i = 0;
  while (i < n) {
    const members = [i];
    let j = i, softUsed = false;
    while (j + 1 < n && canExtendSeg(j)) {
      const hi = val[j + 1] + bind[j + 1], lo = val[j] - bind[j];
      if (hi > lo) { j++; members.push(j); } // streng steigend (Bindeglied flext ±1)
      else if (!softUsed && ((e3 && val[j + 1] === val[j]) || (e4 && val[j + 1] < val[j]))) {
        softUsed = true; j++; members.push(j);
      } else break;
    }
    if (members.length >= 3) members.forEach((pos, idx) => assign(pos, idx + 1));
    i = (e6 && j > i) ? j : j + 1;
  }
}

// Wechsel (Zick-Zack): jede Nachbardifferenz ≥4 UND Richtungswechsel. Mindestlänge minLen (E5: 2 statt 3).
function markWechsel(val, n, minLen, canExtendSeg, assign) {
  let i = 0;
  while (i < n) {
    let j = i, prevDir = 0;
    while (j + 1 < n && canExtendSeg(j)) {
      const diff = val[j + 1] - val[j];
      const dir = Math.sign(diff);
      if (Math.abs(diff) >= WECHSEL_MIN_DIFF && dir !== 0 && (prevDir === 0 || dir === -prevDir)) { prevDir = dir; j++; }
      else break;
    }
    if (j - i + 1 >= minLen) for (let k = i; k <= j; k++) assign(k, k - i + 1);
    // Gleichgerichteter großer Schritt → diese Karte kann neu beginnen.
    i = (j < n - 1 && j > i && Math.abs(val[j + 1] - val[j]) >= WECHSEL_MIN_DIFF && canExtendSeg(j)) ? j : j + 1;
  }
}

/* Berechnet für jede Position { mult, formations: [{ type, ordinal, factor }] }.
   `order` = Ziehreihenfolge, `deck` = Karten, `roles` = Kartenrollen (C8/C10),
   `perks` = gehaltene Perks (für die E-Werkzeuge). */
export function computeFormations(order, deck, roles = {}, perks = []) {
  const n = order.length;
  const cards = order.map((di) => deck[di]);
  const val = cards.map((c) => c.value);
  const has = (id) => perks.includes(id);
  const jokerIds = new Set(roles.C8 || []);
  const bridgeIds = new Set(roles.C10 || []);
  // Joker (C8): effektive Farbe = die des direkten Vorgängers (verkettet).
  const effSuit = cards.map((c) => c.suit);
  for (let k = 1; k < n; k++) if (jokerIds.has(cards[k].id)) effSuit[k] = effSuit[k - 1];
  const bind = cards.map((c) => (bridgeIds.has(c.id) ? 1 : 0));
  const crossSeg = has("E9");
  const canExtendSeg = (k) => crossSeg || ((k + 1) % SEGMENT_SIZE !== 0);

  const out = Array.from({ length: n }, () => ({ mult: 1, formations: [] }));
  const add = (pos, type, ordinal, factor) => {
    if (factor > 1) out[pos].mult *= factor;
    out[pos].formations.push({ type, ordinal, factor });
  };

  markRuns(n, 2, (a, b) => val[a] === val[b], has("E1"), canExtendSeg,
    (pos, ord) => add(pos, "wiederholung", ord, wiederholungFactor(ord)));
  markRuns(n, 3, (a, b) => effSuit[a] === effSuit[b], has("E2"), canExtendSeg,
    (pos, ord) => add(pos, "farbblock", ord, escalatingFactor(ord, FARBBLOCK_BASE)));
  markTreppe(n, val, bind, has("E3"), has("E4"), has("E6"), canExtendSeg,
    (pos, ord) => add(pos, "treppe", ord, escalatingFactor(ord, TREPPE_BASE)));
  markWechsel(val, n, has("E5") ? 2 : 3, canExtendSeg,
    (pos, ord) => add(pos, "wechsel", ord, escalatingFactor(ord, WECHSEL_BASE)));

  // Anker (E7: Position 10/20/30/40 · E8: Position 5/15/25/35) — je siegreicher Anker ×1,25, zählt als Formation.
  if (has("E7") || has("E8")) for (let pos = 0; pos < n; pos++) {
    const p = (pos + 1) % 10;
    if ((has("E7") && p === 0) || (has("E8") && p === 5)) add(pos, "anker", 1, ANKER_FACTOR);
  }

  // Überlappungsbonus (#95): steckt eine Karte in mehreren Formationen, multipliziert der
  // Bonus das Faktor-Produkt zusätzlich (2 Formationen ×1,5 · 3 ×2 · 4 ×3). Gezählt werden ALLE
  // Mitgliedschaften (auch Faktor-1-Läufe) → deckt sich mit der Rahmen-Anzahl im UI.
  for (const p of out) {
    const c = Math.min(p.formations.length, 4);
    if (c >= 2) p.mult *= OVERLAP_BONUS[c];
  }

  return out;
}

// Trägt eine Position eine wirksame Formation (Score-Faktor > 1)? → speist den Formations-Stat (§22.3).
export const positionHasFormation = (posForm) => !!posForm && posForm.mult > 1;

// Zusammenfassung fürs Aufstellungs-UI (§16): Zahl aktiver Formationen (Läufe) + höchster Einzel-Mult.
export function summarizeFormations(perPosition) {
  let count = 0, maxMult = 1;
  for (const p of perPosition || []) {
    for (const f of p.formations) if (f.ordinal === 1) count += 1;
    if (p.mult > maxMult) maxMult = p.mult;
  }
  return { count, maxMult };
}
