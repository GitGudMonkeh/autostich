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
import { PERMAFROST_VALUE, EISANKER_FACTOR, CRYSTAL_OFFSET, ANCHOR_FORM_FACTOR, FORMATION_CORE_FACTOR } from "./constants.js";
import { iceFlag, hasPermafrost, hasIceAnchor } from "./skills.js";

export const SEGMENT_SIZE = 5;
const WECHSEL_MIN_DIFF = 4;
// Die vier Basis-Formationstypen (ohne Anker) — Zielauswahl F-L1 Formationskern + Anzeige-Labels.
export const FORMATION_TYPES = ["wiederholung", "farbblock", "treppe", "wechsel"];
export const FORMATION_TYPE_LABELS = { wiederholung: "Wiederholung", farbblock: "Farbblock", treppe: "Treppe", wechsel: "Wechsel" };

function wiederholungFactor(ordinal, secondBonus = 0) {
  if (ordinal <= 1) return 1;
  if (ordinal === 2) return 1.25 + secondBonus; // [#Pass4: 1,30→1,25] Shop F3 „Verstärkte Wiederholung": +0,10
  if (ordinal === 3) return 1.50;               // [#Pass4: 1,60→1,50]
  return 1.80 + (ordinal - 4) * 0.40;           // [#Pass4: 2,00→1,80, Eskalation 0,50→0,40; kein Cap]
}
function escalatingFactor(ordinal, base) {
  return ordinal <= 2 ? 1 : base + (ordinal - 3) * 0.20; // je weitere Karte +0,20 (#95)
}
// Überlappungsbonus je Anzahl Formationen auf einer Karte (#95): 2→×1,5, 3→×2, 4→×3.
const OVERLAP_BONUS = { 2: 1.5, 3: 2, 4: 3 };
const FARBBLOCK_BASE = 1.35, TREPPE_BASE = 1.25, WECHSEL_BASE = 1.25, ANKER_FACTOR = 1.25; // [#Pass4: Farbblock 1,30→1,35 — war unterbelohnt; 1,45 lt. Sim zu heiß (Solver+Eis-Synergie)]

// Maximale Läufe über eine Paar-Bedingung, mit optional EINER erlaubten fremden Karte dazwischen (E1/E2).
// `matches(refPos, k)` prüft, ob Position k zur Formation von refPos gehört. Fremde Karten sind keine Mitglieder.
// `transparent(k)` (Eis-Frostbrücke): Position k unterbricht den Lauf nicht und zählt selbst NICHT als Mitglied.
// Shop A6 Jokeranker: `isJoker(k)` markiert Positionen, deren Karte bei der Erkennung JEDEN Wert/jede Farbe
// annehmen darf. Damit ein Joker nicht als Lauf-Referenz „alles absorbiert" (Über-Erzeugung), wird gegen die
// erste REALE Karte des Laufs verglichen (`anchor`), nie gegen den Joker; ein Lauf zählt nur mit ≥1 realer Karte.
function markRuns(n, minMembers, matches, allowGap, canExtendSeg, assign, transparent = () => false, onRunEnd = null, isJoker = () => false) {
  let i = 0;
  while (i < n) {
    if (transparent(i)) { i++; continue; }        // transparente Karte startet keinen eigenen Lauf
    const members = [i];
    let j = i, gapUsed = false;
    let anchor = isJoker(i) ? -1 : i;             // Vergleichsanker = erste reale Karte (-1 = bisher nur Joker)
    const memberMatch = (k) => isJoker(k) || anchor === -1 || matches(anchor, k); // Joker passt immer; ohne Anker passt alles
    const noteReal = (k) => { if (anchor === -1 && !isJoker(k)) anchor = k; };     // erste reale Karte fixiert den Anker
    while (j + 1 < n && canExtendSeg(j)) {
      if (transparent(j + 1)) { j++; continue; }  // Frostbrücke: überspringen (kein Mitglied, kein Gap-Verbrauch)
      if (memberMatch(j + 1)) { j++; members.push(j); noteReal(j); }
      else if (allowGap && !gapUsed && j + 2 < n && canExtendSeg(j + 1) && !transparent(j + 2) && memberMatch(j + 2)) {
        gapUsed = true; j += 2; members.push(j); noteReal(j); // fremde Karte an j+1 überspringen
      } else break;
    }
    if (members.length >= minMembers && anchor !== -1) { // Joker erzeugen allein keine Formation
      members.forEach((pos, idx) => assign(pos, idx + 1));
      if (onRunEnd) onRunEnd(members[members.length - 1], members.length); // F6 Nachhall: letztes Mitglied + Ordinal
    }
    i = j + 1;
  }
}

// Treppe: streng monoton (mit Bindeglied-Flex ±1), kein Min-/Max-Schritt. `dir` = +1 steigend, −1 fallend
// (Shop F1 „Abstieg" läuft zusätzlich fallend). E3 erlaubt 1× gleich, E4 erlaubt 1× Gegenrichtung,
// E6 lässt die letzte Karte einen neuen Lauf beginnen.
// Joker (A6): nimmt den minimal-gültigen Zwischenwert (Vorgänger ± dir), sodass die strenge Monotonie hält —
// echte Wert-Suche statt „passt immer" (verhindert unmögliche Brücken wie 5,Joker,6). `prev` = effektiver Wert
// des letzten Mitglieds (null = bisher nur Joker; die erste reale Karte fixiert die Kette), `pb` = dessen Bind-Flex.
function markTreppe(n, val, bind, e3, e4, e6, canExtendSeg, assign, dir = 1, onRunEnd = null, isJoker = () => false) {
  let i = 0;
  while (i < n) {
    const members = [i];
    let j = i, softUsed = false;
    let prev = isJoker(i) ? null : val[i], pb = isJoker(i) ? 0 : bind[i], hasReal = !isJoker(i);
    while (j + 1 < n && canExtendSeg(j)) {
      const jj = j + 1;
      if (isJoker(jj)) { j = jj; members.push(j); if (prev != null) { prev += dir; pb = 0; } continue; } // Joker adaptiert
      const v = val[jj], b = bind[jj];
      const step = prev == null ? true                    // nur Joker bisher → diese reale Karte fixiert die Kette
        : dir === 1 ? (v + b > prev - pb) : (prev + pb > v - b);
      const revBack = prev != null && (dir === 1 ? v < prev : v > prev);
      if (step) { j = jj; members.push(j); prev = v; pb = b; hasReal = true; }
      else if (!softUsed && ((e3 && v === prev) || (e4 && revBack))) { softUsed = true; j = jj; members.push(j); prev = v; pb = b; hasReal = true; }
      else break;
    }
    if (members.length >= 3 && hasReal) {                  // Joker allein bilden keine Treppe
      members.forEach((pos, idx) => assign(pos, idx + 1));
      if (onRunEnd) onRunEnd(members[members.length - 1], members.length); // F6 Nachhall
    }
    i = (e6 && j > i) ? j : j + 1;
  }
}

// Wählt für die nächste Karte einen Kandidatenwert (Kristallform gibt eingefrorenen Karten [v−1,v,v+1]),
// der die Zick-Zack-Bedingung erfüllt (|diff| ≥ 4, Richtung passt) und die Amplitude maximiert (Peak so hoch,
// Valley so tief wie möglich → maximaler Spielraum für den nächsten Gegenzug). `need`: 0 frei, sonst ±1.
function pickWechselValue(cands, cur, need, minDiff = WECHSEL_MIN_DIFF) {
  let best = null;
  for (const c of cands) {
    const diff = c - cur, dir = Math.sign(diff);
    if (Math.abs(diff) < minDiff || dir === 0) continue;
    if (need !== 0 && dir !== need) continue;
    if (!best || Math.abs(diff) > Math.abs(best.val - cur)) best = { val: c, dir };
  }
  return best;
}

// Wechsel (Zick-Zack): jede Nachbardifferenz ≥4 UND Richtungswechsel. Mindestlänge minLen (E5: 2 statt 3).
// `valSets[k]` = Kandidatenwerte je Karte (Kristallform: ±1 auf eingefrorenen Karten; sonst Singleton).
function markWechsel(val, valSets, n, minLen, canExtendSeg, assign, minDiff = WECHSEL_MIN_DIFF, onRunEnd = null, isJoker = () => false) {
  const BIG = 1000; // Joker (A6): Extremwert in benötigter Richtung → maximale Amplitude, erfüllt die Zick-Zack-Bedingung stets.
  let i = 0;
  while (i < n) {
    let curVal = val[i], j = i, prevDir = 0, reals = isJoker(i) ? 0 : 1;
    while (j + 1 < n && canExtendSeg(j)) {
      const jj = j + 1, need = prevDir === 0 ? 0 : -prevDir;
      let pick;
      if (isJoker(jj)) { const d = need === 0 ? 1 : need; pick = { val: curVal + d * BIG, dir: d }; } // adaptiv, immer gültig
      else pick = pickWechselValue(valSets[jj], curVal, need, minDiff);
      if (!pick) break;
      curVal = pick.val; prevDir = pick.dir; j = jj;
      if (!isJoker(jj)) reals++;
    }
    if (j - i + 1 >= minLen && reals >= 1) { // Joker allein bilden keinen Wechsel
      for (let k = i; k <= j; k++) assign(k, k - i + 1);
      if (onRunEnd) onRunEnd(j, j - i + 1); // F6 Nachhall: letztes Mitglied j + Ordinal
    }
    // Gleichgerichteter großer Schritt (rohe Werte) → diese Karte kann neu beginnen.
    i = (j < n - 1 && j > i && Math.abs(val[j + 1] - val[j]) >= minDiff && canExtendSeg(j)) ? j : j + 1;
  }
}

/* Berechnet für jede Position { mult, formations: [{ type, ordinal, factor }] }.
   `order` = Ziehreihenfolge, `deck` = Karten, `roles` = Kartenrollen (C8/C10),
   `perks` = gehaltene Perks (für die E-Werkzeuge). */
export function computeFormations(order, deck, roles = {}, perks = [], skills = [], anchors = [], pe = {}) {
  const n = order.length;
  const cards = order.map((di) => deck[di]);
  const has = (id) => perks.includes(id);
  // ---- Shop-Formationsitems (§9, permanente Regeländerungen) ----
  const wechselMinDiff = pe.switchMinDifference || WECHSEL_MIN_DIFF; // F2 Enger Wechsel: 4 → 3
  const repBonus = pe.repetitionSecondFactorBonus || 0;              // F3 Verstärkte Wiederholung: 2. Karte +0,10
  const descending = !!pe.descendingStraights;                       // F1 Abstieg: Treppen auch fallend
  // ---- Eis-Wildcards (#93 F3): nur auf eingefrorenen Karten, wenn der jeweilige Eis-Skill gehalten wird. ----
  const frozen = cards.map((c) => !!c.frozen);
  const permafrost = hasPermafrost(skills);
  const wildCrystal = iceFlag(skills, "wildCrystal");       // Kristallform: ±1 für Wiederholung/Treppe
  const wildPred = iceFlag(skills, "wildWiederholungPred"); // Kalte Präzision: Wiederholung = Wert des Vorgängers
  const wildStep = iceFlag(skills, "wildTreppeStep");       // Eisschritt: Treppe ±1
  const wildSkip = iceFlag(skills, "wildFarbblockSkip");    // Frostbrücke: transparent im Farbblock
  // Permafrost: +2 Dauerwert auf eingefrorenen Karten (echter Wert; im Kampf gespiegelt in engine.js).
  const val = cards.map((c, k) => c.value + (permafrost && frozen[k] ? PERMAFROST_VALUE : 0));
  const jokerIds = new Set(roles.C8 || []);
  const bridgeIds = new Set(roles.C10 || []);
  // Joker (C8): effektive Farbe = die des direkten Vorgängers (verkettet).
  const effSuit = cards.map((c) => c.suit);
  for (let k = 1; k < n; k++) if (jokerIds.has(cards[k].id)) effSuit[k] = effSuit[k - 1];
  // Farballianz (Shop F4): zwei Farben zählen für Farbblöcke als eine (die zweite wird auf die erste gemappt).
  if ((pe.linkedColors || []).length === 2) { const [la, lb] = pe.linkedColors; for (let k = 0; k < n; k++) if (effSuit[k] === lb) effSuit[k] = la; }
  // Bindeglied (C10, ±1) + Eis: Eisschritt/Kristallform geben ±1, Permafrost-Joker passt überall (großer Flex).
  const bind = cards.map((c, k) => {
    let b = bridgeIds.has(c.id) ? 1 : 0;
    if (frozen[k] && (wildStep || wildCrystal)) b = Math.max(b, CRYSTAL_OFFSET);
    if (frozen[k] && permafrost) b = Math.max(b, 99); // Joker: fügt sich in jede Treppe
    return b;
  });
  const crossSeg = has("E9");
  const openBoundaries = new Set(pe.openSegmentBoundaries || []); // Shop F5: einzeln geöffnete Segmentgrenzen (Position k mit (k+1)%5==0)
  const canExtendSeg = (k) => crossSeg || ((k + 1) % SEGMENT_SIZE !== 0) || openBoundaries.has(k);
  // Shop A6 Jokeranker (§8): Positionen, deren Karte bei jeder Basisformation den benötigten Wert/die Farbe annehmen darf.
  // Zählt NICHT als eigener Anker (kein ×1,25) und erzeugt allein keine Formation.
  const jokerPos = new Set((anchors || []).filter((a) => a.type === "joker" && a.position < n).map((a) => a.position));
  const isJoker = (k) => jokerPos.has(k);

  const out = Array.from({ length: n }, () => ({ mult: 1, baseMult: 1, afterglowFactor: 1, coreFactor: 1, formations: [] }));
  const add = (pos, type, ordinal, factor) => {
    if (factor > 1) out[pos].mult *= factor;
    out[pos].formations.push({ type, ordinal, factor });
  };
  // F6 Nachhall: bester (höchster) Endfaktor je Endposition eines Basislaufs (Wiederholung/Farbblock/Treppe/Wechsel).
  // Der Empfänger ist die direkt folgende Karte; Anker zählen NICHT als Ursprung.
  const endBest = {}; // pos(letztes Mitglied) → { factor, type }
  const recordEnd = (pos, type, factor) => {
    if (factor > 1 && (!endBest[pos] || factor > endBest[pos].factor)) endBest[pos] = { factor, type };
  };

  // Wiederholung: Wert-Mengen je Karte (Kristallform ±1, Kalte Präzision = Vorgängerwert); Permafrost-Joker matcht alles.
  const valSetWied = cards.map((c, k) => {
    const s = new Set([val[k]]);
    if (frozen[k] && wildCrystal) { s.add(val[k] - 1); s.add(val[k] + 1); }
    if (frozen[k] && wildPred && k > 0) s.add(val[k - 1]);
    return s;
  });
  const jokerAll = frozen.map((f) => f && permafrost); // Permafrost: Joker für Wiederholung UND Farbblock
  const matchWied = (a, b) => jokerAll[a] || jokerAll[b] || [...valSetWied[a]].some((v) => valSetWied[b].has(v));
  markRuns(n, 2, matchWied, has("E1"), canExtendSeg,
    (pos, ord) => add(pos, "wiederholung", ord, wiederholungFactor(ord, repBonus)), () => false,
    (last, ord) => recordEnd(last, "wiederholung", wiederholungFactor(ord, repBonus)), isJoker);

  // Farbblock: Permafrost-Joker matcht jede Farbe; Frostbrücke macht eingefrorene Karten transparent (kein Mitglied).
  const matchSuit = (a, b) => jokerAll[a] || jokerAll[b] || effSuit[a] === effSuit[b];
  const farbSkip = (k) => frozen[k] && wildSkip && !jokerAll[k];
  markRuns(n, 3, matchSuit, has("E2"), canExtendSeg,
    (pos, ord) => add(pos, "farbblock", ord, escalatingFactor(ord, FARBBLOCK_BASE)), farbSkip,
    (last, ord) => recordEnd(last, "farbblock", escalatingFactor(ord, FARBBLOCK_BASE)), isJoker);

  const treppeAssign = (pos, ord) => add(pos, "treppe", ord, escalatingFactor(ord, TREPPE_BASE));
  const treppeEnd = (last, ord) => recordEnd(last, "treppe", escalatingFactor(ord, TREPPE_BASE));
  markTreppe(n, val, bind, has("E3"), has("E4"), has("E6"), canExtendSeg, treppeAssign, 1, treppeEnd, isJoker);
  if (descending) markTreppe(n, val, bind, has("E3"), has("E4"), has("E6"), canExtendSeg, treppeAssign, -1, treppeEnd, isJoker); // F1 Abstieg
  // Wechsel: Kristallform gibt eingefrorenen Karten ±1-Wertoptionen (Permafrost/Eisschritt gelten hier NICHT).
  const valSetWechsel = cards.map((c, k) => (frozen[k] && wildCrystal ? [val[k] - 1, val[k], val[k] + 1] : [val[k]]));
  markWechsel(val, valSetWechsel, n, has("E5") ? 2 : 3, canExtendSeg,
    (pos, ord) => add(pos, "wechsel", ord, escalatingFactor(ord, WECHSEL_BASE)), wechselMinDiff,
    (last, ord) => recordEnd(last, "wechsel", escalatingFactor(ord, WECHSEL_BASE)), isJoker);

  // Anker (E7: Position 10/20/30/40 · E8: Position 5/15/25/35) — je siegreicher Anker ×1,25, zählt als Formation.
  if (has("E7") || has("E8")) for (let pos = 0; pos < n; pos++) {
    const p = (pos + 1) % 10;
    if ((has("E7") && p === 0) || (has("E8") && p === 5)) add(pos, "anker", 1, ANKER_FACTOR);
  }
  // Eisanker (#93 F3): jede eingefrorene Karte zählt auf ihrer Position als Anker ×1,25 (zählt als Formation).
  if (hasIceAnchor(skills)) for (let pos = 0; pos < n; pos++) if (frozen[pos] && !out[pos].formations.some((f) => f.type === "anker")) add(pos, "anker", 1, EISANKER_FACTOR);
  // Formationsanker (Shop §8 A5): jede Anker-Position zählt als Anker ×1,25, falls dort noch kein Anker liegt (E7/E8/Eisanker).
  for (const a of anchors) if (a.type === "formation" && a.position < n && !out[a.position].formations.some((f) => f.type === "anker")) add(a.position, "anker", 1, ANCHOR_FORM_FACTOR);

  // Überlappungsbonus (#95): steckt eine Karte in mehreren Formationen, multipliziert der
  // Bonus das Faktor-Produkt zusätzlich (2 Formationen ×1,5 · 3 ×2 · 4 ×3). Gezählt werden ALLE
  // Mitgliedschaften (auch Faktor-1-Läufe) → deckt sich mit der Rahmen-Anzahl im UI.
  for (const p of out) {
    const c = Math.min(p.formations.length, 4);
    if (c >= 2) p.mult *= OVERLAP_BONUS[c];
  }

  // baseMult = Beitrag der „echten" Formationen (inkl. Überlappung), OHNE die Meta-Faktoren
  // Nachhall/Kern — die werden gleich als eigene Faktoren (§13) obendrauf gelegt und zählen NICHT
  // in die Überlappung (kein Doppel-Dip).
  for (const p of out) p.baseMult = p.mult;

  // F6 Nachhall (Shop §9): endet ein Basislauf auf Position p, bekommt die DIREKT folgende Karte (p+1)
  // dessen stärksten Einzel-Endfaktor als eigene Formation. Segmentgrenzen blocken NICHT (kein canExtendSeg-
  // Check); endet der Lauf auf der letzten Position (p+1 existiert nicht), passiert nichts. Kein Kaskadieren:
  // Nachhall entsteht nur aus Basisläufen (endBest), nie aus einem anderen Nachhall/Kern. Trägt den Ursprungstyp
  // mit (sourceType) — F-L1 kann daran andocken.
  if (pe.formationAfterglow) {
    for (const key in endBest) {
      const p = Number(key), r = p + 1;
      if (r >= n) continue;                 // Formation endet auf der letzten Position → kein Empfänger
      const { factor, type } = endBest[p];
      out[r].afterglowFactor *= factor;
      out[r].mult *= factor;
      out[r].formations.push({ type: "nachhall", ordinal: 1, factor, sourceType: type });
    }
  }

  // F-L1 Formationskern (Shop §9): jede Position, die Teil einer aktiven Formation des gewählten Typs ist
  // (eigener Basislauf des Typs ODER ein Nachhall dieses Ursprungstyps), bekommt zusätzlich ×FORMATION_CORE_FACTOR
  // als eigenen Faktor (§13). Als Meta-Faktor NACH der Überlappung, zählt nicht in deren Anzahl.
  const coreType = pe.formationCoreType || null;
  if (coreType) for (const p of out) {
    const partOfType = p.formations.some((f) => f.type === coreType || (f.type === "nachhall" && f.sourceType === coreType));
    if (partOfType) {
      p.coreFactor *= FORMATION_CORE_FACTOR;
      p.mult *= FORMATION_CORE_FACTOR;
      p.formations.push({ type: "formationskern", ordinal: 1, factor: FORMATION_CORE_FACTOR });
    }
  }

  return out;
}

// Trägt eine Position eine wirksame Formation (Score-Faktor > 1)? → speist den Formations-Stat (§22.3).
export const positionHasFormation = (posForm) => !!posForm && posForm.mult > 1;

// Formations-Potential einer Anordnung (#Pass6): Σ(mult−1) über alle Positionen der unmodifizierten
// Formationen (keine Rollen/Perks/Skills/Anker). Maß fürs freie Start-Potential → speist das Startdeck-Band.
export function formationPotential(order, deck) {
  let sum = 0;
  for (const p of computeFormations(order, deck)) sum += (p.mult || 1) - 1;
  return sum;
}

// Zusammenfassung fürs Aufstellungs-UI (§16): Zahl aktiver Formationen (Läufe) + höchster Einzel-Mult.
export function summarizeFormations(perPosition) {
  let count = 0, maxMult = 1;
  for (const p of perPosition || []) {
    for (const f of p.formations) if (f.ordinal === 1) count += 1;
    if (p.mult > maxMult) maxMult = p.mult;
  }
  return { count, maxMult };
}
