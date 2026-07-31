/* ============================================================
   FORMATIONS-ENGINE (V2 §22.7) — reine Funktion, kein rng/Date.
   Aus der (persistenten) Spieler-Reihenfolge + den DAUERWERTEN der Karten wird pro Position
   ein Formations-Multiplikator berechnet. Basis-Formationen sind SEGMENTGEBUNDEN (Arena, §22.7/Q3):
   ein Lauf endet an jeder Segmentgrenze. Rollen (Kat. C) und Werkzeuge (Kat. E) biegen die Erkennung.

   Basis-Formationen (Faktoren §22.7, Balancing-Rework #95 / #Pass4 / #161 FB-5):
   - Wiederholung: ≥2 gleiche Werte.        2.→×1,25, 3.→×1,50, 4.→×1,80, danach je +0,40 (KEIN Cap).
   - Farbblock:    ≥3 gleiche Farbe.         ab 3. ×1,35, je weitere +0,20.
   - Treppe:       ≥3 streng steigend, Schritt ≤4. ab 3. ×1,35, je weitere +0,20.
   - Wechsel:      ≥3 Zick-Zack (Diff ≥4).   ab 3. ×1,40, je weitere +0,20.
   - Anker: einzelne Position ×1,25 (zählt als Formation).
   - Überlappung: steckt eine Karte in mehreren Formationen, wird ihr Faktor-Produkt zusätzlich
     mit dem Überlappungsbonus multipliziert: 2 Formationen ×1,5 · 3 ×2 · 4 ×3.

   Rollen-Familien (Rarität #167 Kat. C): C_JOKER (Farbblock-Joker je Stufe), C_BRIDGE (Treppen-Flex je Stufe).
   Werkzeuge (§22.6 E): E1 Wiederholung +1 fremde Karte · E2 Farbblock +1 andersfarbig ·
   E3 Treppe darf 1× gleich · E4 Treppe darf 1× Rückschritt · E5 Wechsel schon ab 2 Karten ·
   E6 Karte in zwei Treppen · E7/E8 Anker · E9 Formationen über Segmentgrenzen.
   ============================================================ */
import { EISANKER_FACTOR, CRYSTAL_OFFSET, ANCHOR_FORM_FACTOR, FORMATION_CORE_FACTOR,
  UEBERWUCHERUNG_FIELD, UEBERWUCHERUNG_FACTOR, EWIGER_FRUEHLING_FARBBLOCK, EWIGER_FRUEHLING_FIELD, PLANT_GREEN_FARBBLOCK_CAP } from "./constants.js";
import { iceFlag, hasIceAnchor, hasEwigerFruehling, hasUeberwucherung, greenCount } from "./skills.js";
import { activeFamilyEntries, familyTierParam, allianceGroups } from "./families.js";

export const SEGMENT_SIZE = 5;

// #FB Segmentarbeit-Sichtbarkeit: welche Segmentgrenzen öffnet E_SEGMENT? EINE Quelle für Engine (computeFormations)
// UND UI (Formationsphase/Chronik) — kein Drift zwischen „was der Motor tut" und „was angezeigt wird".
// „Grenze g" liegt zwischen Segment g und g+1 (0-basiert). Deterministisch werden die ersten `count` Grenzen von
// vorne geöffnet (Stufe I/II = 1/2), Stufe III/IV = alle. Rückgabe:
//   active = Werkzeug gehalten · all = alle Grenzen offen (Stufe III/IV) · count = Anzahl (Infinity bei all) ·
//   isOpen(g) = ob die Grenze NACH Segment g offen ist.
export function openSegmentInfo(familyTiers) {
  const v = familyTierParam(familyTiers, "E_SEGMENT", "openBoundaries");
  const count = v === undefined ? 0 : v;
  const all = count === Infinity;
  return { active: count > 0, all, count, isOpen: (g) => all || (g >= 0 && g < count) };
}
export const WECHSEL_MIN_DIFF = 4;   // [Balance: 5→4 — Wechsel eine Stufe leichter, kleinerer Nachbarabstand reicht] — natürlicher Default (Shop „Enger Wechsel" senkt ihn)
const MAX_TREPPE_STEP  = 4;   // [Balance: 3→4 — Treppe eine Stufe leichter, größerer Schritt je Nachbarpaar erlaubt]
// Die vier Basis-Formationstypen (ohne Anker) — Zielauswahl F-L1 Formationskern + Anzeige-Labels.
export const FORMATION_TYPES = ["wiederholung", "farbblock", "treppe", "wechsel"];
export const FORMATION_TYPE_LABELS = { wiederholung: "Wiederholung", farbblock: "Farbblock", treppe: "Treppe", wechsel: "Wechsel" };

// Shop „Verstärkte Wiederholung" (#164): secondBonus = 2. Karte, thirdBonus = 3. Karte, allMult = Faktor auf ALLE
// Wiederholungsfaktoren (Stufe IV ×1,20; nur auf echte Faktoren > 1, nie auf die Einzelkarte).
function wiederholungFactor(ordinal, secondBonus = 0, thirdBonus = 0, allMult = 1) {
  let f;
  if (ordinal <= 1) f = 1;
  else if (ordinal === 2) f = 1.25 + secondBonus; // [#Pass4: 1,30→1,25]
  else if (ordinal === 3) f = 1.50 + thirdBonus;  // [#Pass4: 1,60→1,50]
  else f = 1.80 + (ordinal - 4) * 0.40;           // [#Pass4: 2,00→1,80, Eskalation 0,50→0,40; kein Cap]
  return f > 1 ? f * allMult : f;
}
function escalatingFactor(ordinal, base) {
  return ordinal <= 2 ? 1 : base + (ordinal - 3) * 0.20; // je weitere Karte +0,20 (#95)
}
// Überlappungsbonus je Anzahl Formationen auf einer Karte (#95): 2→×1,5, 3→×2, 4→×3.
const OVERLAP_BONUS = { 2: 1.5, 3: 2, 4: 3 };
const FARBBLOCK_BASE = 1.35, TREPPE_BASE = 1.35, WECHSEL_BASE = 1.40; // [#Pass4: Farbblock 1,30→1,35] [#161 FB-5: Treppe/Wechsel 1,25→1,35/1,40 — schwerer zu bauen, daher stärker belohnt (≥ Farbblock)]

// Maximale Läufe über eine Paar-Bedingung, mit optional EINER erlaubten fremden Karte dazwischen (E1/E2).
// `matches(refPos, k)` prüft, ob Position k zur Formation von refPos gehört. Fremde Karten sind keine Mitglieder.
// `transparent(k)` (Eis-Frostbrücke): Position k unterbricht den Lauf nicht und zählt selbst NICHT als Mitglied.
// Shop A6 Jokeranker: `isJoker(k)` markiert Positionen, deren Karte bei der Erkennung JEDEN Wert/jede Farbe
// annehmen darf. Damit ein Joker nicht als Lauf-Referenz „alles absorbiert" (Über-Erzeugung), wird gegen die
// erste REALE Karte des Laufs verglichen (`anchor`), nie gegen den Joker; ein Lauf zählt nur mit ≥1 realer Karte.
// `gap` = { run, seg }: erlaubte fremde Karten je LAUF bzw. je SEGMENT (E_PACE Wiederholung / E_COLORBRIDGE Farbblock,
// Rarität #167). {0,0} = keine Überbrückung. Infinity = unbegrenzt (Stufe IV: fremde Karte zählt nicht, unterbricht nicht).
function markRuns(n, minMembers, matches, gap, canExtendSeg, assign, transparent = () => false, onRunEnd = null, isJoker = () => false, onRun = null) {
  const segGaps = {};
  let i = 0;
  while (i < n) {
    if (transparent(i)) { i++; continue; }        // transparente Karte startet keinen eigenen Lauf
    const members = [i];
    let j = i, gapsRun = 0;
    let anchor = isJoker(i) ? -1 : i;             // Vergleichsanker = erste reale Karte (-1 = bisher nur Joker)
    const memberMatch = (k) => isJoker(k) || anchor === -1 || matches(anchor, k); // Joker passt immer; ohne Anker passt alles
    const noteReal = (k) => { if (anchor === -1 && !isJoker(k)) anchor = k; };     // erste reale Karte fixiert den Anker
    while (j + 1 < n && canExtendSeg(j)) {
      if (transparent(j + 1)) { j++; continue; }  // Frostbrücke: überspringen (kein Mitglied, kein Gap-Verbrauch)
      if (memberMatch(j + 1)) { j++; members.push(j); noteReal(j); }
      else {
        const seg = Math.floor((j + 1) / SEGMENT_SIZE);
        if (gapsRun < gap.run && (segGaps[seg] || 0) < gap.seg && j + 2 < n && canExtendSeg(j + 1) && !transparent(j + 2) && memberMatch(j + 2)) {
          gapsRun++; segGaps[seg] = (segGaps[seg] || 0) + 1; j += 2; members.push(j); noteReal(j); // fremde Karte an j+1 überspringen
        } else break;
      }
    }
    if (members.length >= minMembers && anchor !== -1) { // Joker erzeugen allein keine Formation
      members.forEach((pos, idx) => assign(pos, idx + 1));
      if (onRunEnd) onRunEnd(members[members.length - 1], members.length); // F6 Nachhall: letztes Mitglied + Ordinal
      if (onRun) onRun(members); // #179 E_SEGMENT IV: Lauf-Mitglieder für den Grenz-Bonus melden
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
// `e` = { eqRun, eqSeg, revRun, revSeg, drehSeg }: Budgets für Gleichstände (E_GENTLE) und Rückschritte (E_BIGSTEP)
// je Lauf/Segment; drehSeg = Karten, die je Segment einen zweiten Treppen-Lauf beginnen dürfen (E_RPM). Rarität #167.
// Alles 0 = klassische strenge Treppe. Infinity = unbegrenzt (Stufe IV — §10-Näherung: „gleich = +1 Schritt" bzw.
// „Richtung einmal wechseln" als unbegrenzte Gleichstände/Rückschritte).
// #195: nur aufsteigende Treppen (dir war fest 1 — der Abstieg-Aufruf ist längst entfernt; der tote dir=-1-Zweig raus).
function markTreppe(n, val, bind, e, canExtendSeg, assign, onRunEnd = null, isJoker = () => false, onRun = null) {
  const segEq = {}, segRev = {}, segDreh = {};
  let i = 0;
  while (i < n) {
    const members = [i];
    let j = i, eqUsed = 0, revUsed = 0;
    let prev = isJoker(i) ? null : val[i], pb = isJoker(i) ? 0 : bind[i], hasReal = !isJoker(i);
    while (j + 1 < n && canExtendSeg(j)) {
      const jj = j + 1;
      if (isJoker(jj)) { j = jj; members.push(j); if (prev != null) { prev += 1; pb = 0; } continue; } // Joker adaptiert
      const v = val[jj], b = bind[jj];
      // #161 FB-5: streng monoton (Abstand ≥1) UND Schritt ≤ MAX_TREPPE_STEP. `span` = kombinierte ±Flex beider
      // Karten (C10 Bindeglied, Eisschritt/Kristallform je ±1, Permafrost-Joker ±99) → günstigste Interpretation.
      const span = b + pb, rawGap = v - prev;
      const step = prev == null ? true                    // nur Joker bisher → diese reale Karte fixiert die Kette
        : (rawGap + span >= 1 && rawGap - span <= MAX_TREPPE_STEP);
      const revBack = prev != null && v < prev;
      const seg = Math.floor(jj / SEGMENT_SIZE);
      if (step) { j = jj; members.push(j); prev = v; pb = b; hasReal = true; }
      else if (v === prev && eqUsed < e.eqRun && (segEq[seg] || 0) < e.eqSeg) {        // E_GENTLE: Gleichstand
        eqUsed++; segEq[seg] = (segEq[seg] || 0) + 1; j = jj; members.push(j); prev = v; pb = b; hasReal = true;
      } else if (revBack && revUsed < e.revRun && (segRev[seg] || 0) < e.revSeg) {     // E_BIGSTEP: Rückschritt
        revUsed++; segRev[seg] = (segRev[seg] || 0) + 1; j = jj; members.push(j); prev = v; pb = b; hasReal = true;
      } else break;
    }
    if (members.length >= 3 && hasReal) {                  // Joker allein bilden keine Treppe
      members.forEach((pos, idx) => assign(pos, idx + 1));
      if (onRunEnd) onRunEnd(members[members.length - 1], members.length); // F6 Nachhall
      if (onRun) onRun(members); // #179 E_SEGMENT IV: Grenz-Bonus
    }
    // E_RPM Drehzahl: die letzte Karte darf einen neuen Lauf beginnen (zwei Treppen), begrenzt je Segment über drehSeg.
    const segJ = Math.floor(j / SEGMENT_SIZE);
    if (j > i && (segDreh[segJ] || 0) < e.drehSeg) { segDreh[segJ] = (segDreh[segJ] || 0) + 1; i = j; } else i = j + 1;
  }
}

// Wählt für die nächste Karte einen Kandidatenwert (Kristallform gibt eingefrorenen Karten [v−1,v,v+1]),
// der die Zick-Zack-Bedingung erfüllt (|diff| ≥ minDiff, Default 4, Richtung passt) und die Amplitude maximiert (Peak so hoch,
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

// Wechsel (Zick-Zack): jede Nachbardifferenz ≥ WECHSEL_MIN_DIFF (Default 4) UND Richtungswechsel. Mindestlänge minLen (E5: 2 statt 3).
// `valSets[k]` = Kandidatenwerte je Karte (Kristallform: ±1 auf eingefrorenen Karten; sonst Singleton).
function markWechsel(val, valSets, n, minLen, canExtendSeg, assign, minDiff = WECHSEL_MIN_DIFF, onRunEnd = null, isJoker = () => false, onRun = null) {
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
      if (onRun) { const mem = []; for (let k = i; k <= j; k++) mem.push(k); onRun(mem); } // #179 E_SEGMENT IV: Grenz-Bonus
    }
    // Gleichgerichteter großer Schritt (rohe Werte) → diese Karte kann neu beginnen.
    i = (j < n - 1 && j > i && Math.abs(val[j + 1] - val[j]) >= minDiff && canExtendSeg(j)) ? j : j + 1;
  }
}

/* Berechnet für jede Position { mult, formations: [{ type, ordinal, factor }] }.
   `order` = Ziehreihenfolge, `deck` = Karten, `roles` = Kartenrollen (Familien C_JOKER/C_BRIDGE unter familyId,
   plus L-Rollen; #179 zusätzlich E_COLOR_ALLIANCE = gewählte Farben, E_CORE = [gewählter Formationstyp]),
   `familyTiers` = Familienrang je Familie (#167, u. a. E-Formationswerkzeuge). `perks` wird nicht mehr gelesen
   (E1–E9 sind zu Familien migriert) — Parameter bleibt für die Aufrufer-Signatur. Der frühere `pe`-Parameter
   (shop.permanentEffects) entfiel #179 vollständig: Formations-Regeln laufen jetzt ausschließlich über familyTiers/roles. */
export function computeFormations(order, deck, roles = {}, perks = [], skills = [], anchors = [], familyTiers = {}) {
  const n = order.length;
  const cards = order.map((di) => deck[di]);
  // ---- Formations-Familien (#179): früher Shop-Kategorie „Formationen", jetzt Perk-Kat.-E-Familien (familyTiers). Ihre
  //      Parameter liest der eP()-Block unten (E_STRONG_REP/E_AFTERGLOW/E_CORE) bzw. roles (E_COLOR_ALLIANCE/E_CORE).
  //      Die drei Duplikat-Familien (Enger Wechsel/Abstieg/Offene Grenze) entfielen ersatzlos → E_PENDULUM/E_BIGSTEP/
  //      E_SEGMENT decken sie ab. `pe` (ehem. shop.permanentEffects) wird nicht mehr gelesen (vestigial in der Signatur). ----
  // ---- Eis-Rework (v0): Formations-Wildcards nur auf eingefrorenen Karten. Kristallform = Joker (±2 Wert-Flex +
  //      Vorgängerwert für Wiederholung/Treppe/Wechsel — merge Kalte Präzision/Eisschritt/alt-Kristallform);
  //      Frostbrücke = Segment-Brücke. Schicht-DAUERWERT wirkt im KAMPF (engine.js), nicht in der Erkennung (v0). ----
  const frozen = cards.map((c) => !!c.frozen);
  const kristallform = iceFlag(skills, "kristallform"); // Joker: ±CRYSTAL_OFFSET (v0.3: 1) + Vorgängerwert (Wiederholung/Treppe/Wechsel)
  const frostbridge  = iceFlag(skills, "frostbridge");  // Segment-Brücke: Formation darf an einer Frostkarte die Segmentgrenze queren
  const val = cards.map((c) => c.value);
  // Familien-Rollen (Rarität #167 Kat. C): Joker (C_JOKER) + Bindeglied (C_BRIDGE) aus den gehaltenen Familien-Stufen.
  // §10-Näherung Joker: jokerMode "pred" (I/II) = Vorgängerfarbe wie flach C8; "predOrSucc"/"free" (III/IV) = Farbblock-
  // Wildcard (der paarweise Scanner kann die Vorgänger-oder-Nachfolger-Regel nicht abbilden, ohne verschiedenfarbige Blöcke
  // falsch zu verschmelzen; nach oben genähert). Bindeglied-Span: 1 (I/II) / 2 (III) / 99 (frei, IV).
  const famJokerPred = new Set(), famJokerFree = new Set(), famBridgeSpan = {};
  for (const { familyId, def } of activeFamilyEntries(familyTiers)) {
    const ids = roles[familyId] || [];
    if (def.jokerRole) for (const id of ids) (def.jokerMode === "pred" ? famJokerPred : famJokerFree).add(id);
    if (def.bridgeRole) for (const id of ids) famBridgeSpan[id] = Math.max(famBridgeSpan[id] || 0, def.bridgeSpan || 1);
  }
  const jokerIds = famJokerPred; // Vorgängerfarbe-Joker (Familie C_JOKER I/II; flache C8 ist zu #167 migriert)
  // Joker: effektive Farbe = die des direkten Vorgängers (verkettet).
  const effSuit = cards.map((c) => c.suit);
  for (let k = 1; k < n; k++) if (jokerIds.has(cards[k].id)) effSuit[k] = effSuit[k - 1];
  // Farballianz (#179, Perk-Familie E_COLOR_ALLIANCE): verlinkte Farbgruppen (roles + pairs-Flag, allianceGroups).
  // Jede Gruppe wird für Farbblöcke auf ihre erste Farbe gemappt → zählt als eine Farbe.
  const linkedGroups = allianceGroups(familyTiers, roles);
  for (const g of linkedGroups) { const ref = g[0]; for (const su of g) if (su !== ref) for (let k = 0; k < n; k++) if (effSuit[k] === su) effSuit[k] = ref; }
  // Pflanze (v0): grüne Karten (card.green) zählen als Farbe „G" für den Farbblock — grün → Farbblock → Score.
  for (let k = 0; k < n; k++) if (cards[k].green) effSuit[k] = "G";
  // Bindeglied (C10, ±1) + Eis: Eisschritt/Kristallform geben ±1, Permafrost-Joker passt überall (großer Flex).
  const bind = cards.map((c, k) => {
    let b = famBridgeSpan[c.id] || 0; // Familie C_BRIDGE: Span je Stufe (1/2/99); flache C10 ist zu #167 migriert
    if (frozen[k] && kristallform) b = Math.max(b, CRYSTAL_OFFSET); // Kristallform: ±2 Treppen-Flex (Joker)
    return b;
  });
  // ---- E-Formationsfamilien (Rarität #167 Kat. E, REGELERSETZUNG): Parameter der GEHALTENEN Stufe je Familie
  //      (familyTierParam; ungehalten → Default = klassische Erkennung ohne E-Werkzeug). Nur die höchste Stufe zählt. ----
  const eP = (id, key, dflt) => { const v = familyTierParam(familyTiers, id, key); return v === undefined ? dflt : v; };
  const wiedGap = { run: eP("E_PACE", "gapRun", 0), seg: eP("E_PACE", "gapSeg", 0) };                       // E_PACE: Wiederholung-Gaps
  const suitGap = { run: eP("E_COLORBRIDGE", "suitGapRun", 0), seg: eP("E_COLORBRIDGE", "suitGapSeg", 0) }; // E_COLORBRIDGE: Farbblock-Gaps
  const treppeE = { eqRun: eP("E_GENTLE", "eqRun", 0), eqSeg: eP("E_GENTLE", "eqSeg", 0),                   // E_GENTLE: Gleichstände
                    revRun: eP("E_BIGSTEP", "revRun", 0), revSeg: eP("E_BIGSTEP", "revSeg", 0),             // E_BIGSTEP: Rückschritte
                    drehSeg: eP("E_RPM", "drehSeg", 0) };                                                   // E_RPM: Doppel-Treppe
  const wMinLen = eP("E_PENDULUM", "wMinLen", 3);                                                           // E_PENDULUM: Wechsel-Mindestlänge
  const wMinDiff = eP("E_PENDULUM", "wMinDiff", WECHSEL_MIN_DIFF);                                          // E_PENDULUM: Wechsel-Mindestdifferenz
  const wFactorStart = eP("E_PENDULUM", "wFactorStart", 0);                                                // IV: Wechsel-Faktor bereits ab Länge 2
  // Verstärkte Wiederholung (#179, E_STRONG_REP): Boni auf die Wiederholungsfaktoren (2./3. Karte + Gesamt-Multiplikator).
  const repBonus = eP("E_STRONG_REP", "repSecond", 0);   // 2. Karte
  const repThird = eP("E_STRONG_REP", "repThird", 0);    // 3. Karte
  const repMult  = eP("E_STRONG_REP", "repAllMult", 1);  // alle Wiederholungsfaktoren
  // Interne Segmentgrenzen öffnen: E_SEGMENT (#179 alleinige Quelle; „Offene Grenze" entfiel). Stufe I/II öffnen die
  // ersten 1/2 Grenzen deterministisch von vorne, III/IV alle. EINE Quelle mit der UI: openSegmentInfo (s. o.).
  // Grenze NACH Position k existiert nur, wenn (k+1)%SEGMENT_SIZE===0; ihr 0-basierter Grenz-Index ist (k+1)/SIZE−1.
  const segInfo = openSegmentInfo(familyTiers);
  const crossSeg = segInfo.all;
  // Frostbrücke (v0, Eis): eine Frostkarte am Segmentrand öffnet die Grenze — die Formation darf ins nächste Segment laufen.
  const canExtendSeg = (k) => ((k + 1) % SEGMENT_SIZE !== 0) || segInfo.isOpen((k + 1) / SEGMENT_SIZE - 1)
    || (frostbridge && (frozen[k] || frozen[k + 1]));
  // #179 E_SEGMENT IV Grenz-Bonus: Karten in einer Formation, die eine (frühere) Segmentgrenze überschreitet,
  // geben zusätzlich ×crossBonus. noteCross sammelt die Mitglieds-Positionen kreuzender Läufe (nur aktiv bei Stufe IV).
  const segCrossBonus = eP("E_SEGMENT", "crossBonus", 1);
  const crossPositions = new Set();
  const noteCross = segCrossBonus > 1
    ? (members) => { if (members.length > 1 && Math.floor(members[0] / SEGMENT_SIZE) !== Math.floor(members[members.length - 1] / SEGMENT_SIZE)) for (const p of members) crossPositions.add(p); }
    : null;
  // Shop Jokeranker (§4.2, #164): je STUFE für bestimmte Basisformationen Wildcard (a.jokerTypes). Zählt NICHT als
  // eigener Anker (kein Faktor) und erzeugt allein keine Formation. Position → Menge erlaubter Formationstypen.
  const jokerFor = (type) => { const s = new Set(); for (const a of anchors || []) if (a.type === "joker" && a.position < n && (a.jokerTypes || []).includes(type)) s.add(a.position); return s; };
  const jokerWied = jokerFor("wiederholung"), jokerTreppe = jokerFor("treppe"), jokerFarbblock = jokerFor("farbblock"), jokerWechsel = jokerFor("wechsel");
  const isJW = (k) => jokerWied.has(k), isJT = (k) => jokerTreppe.has(k), isJF = (k) => jokerFarbblock.has(k), isJX = (k) => jokerWechsel.has(k);

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
    if (frozen[k] && kristallform) { s.add(val[k] - CRYSTAL_OFFSET); s.add(val[k] + CRYSTAL_OFFSET); if (k > 0) s.add(val[k - 1]); } // Kristallform: ±2 + Vorgängerwert
    return s;
  });
  const jokerAll = frozen.map(() => false); // (Permafrost-Farbblock-Joker im Rework entfernt — Kristallform ist kein Farbblock-Joker)
  const matchWied = (a, b) => jokerAll[a] || jokerAll[b] || [...valSetWied[a]].some((v) => valSetWied[b].has(v));
  const wiedFactor = (ord) => wiederholungFactor(ord, repBonus, repThird, repMult);
  markRuns(n, 2, matchWied, wiedGap, canExtendSeg,
    (pos, ord) => add(pos, "wiederholung", ord, wiedFactor(ord)), () => false,
    (last, ord) => recordEnd(last, "wiederholung", wiedFactor(ord)), isJW, noteCross);

  // Farbblock: Permafrost-Joker + freie Familien-Joker (C_JOKER III/IV) matchen jede Farbe; Frostbrücke macht
  // eingefrorene Karten transparent (kein Mitglied).
  const matchSuit = (a, b) => jokerAll[a] || jokerAll[b] || famJokerFree.has(cards[a].id) || famJokerFree.has(cards[b].id) || effSuit[a] === effSuit[b];
  const farbSkip = () => false; // (Frostbrücke ist im Rework Segment-Brücke, keine Farbblock-Transparenz mehr)
  // Pflanze (v0): Ewiger Frühling zählt Farbblock schon ab 2 Karten; Überwucherung (Feld genug grün) → alle Farbblöcke +0,20.
  const farbMin = hasEwigerFruehling(skills) ? EWIGER_FRUEHLING_FARBBLOCK : 3;
  const greenField = n > 0 ? greenCount(cards) / n : 0;
  const uebThresh = hasEwigerFruehling(skills) ? EWIGER_FRUEHLING_FIELD : UEBERWUCHERUNG_FIELD;
  const farbBase = FARBBLOCK_BASE + (hasUeberwucherung(skills) && greenField >= uebThresh ? UEBERWUCHERUNG_FACTOR : 0);
  // Grün-Farbblock-Cap (v0.3): grüne (card.green) Karten deckeln ihre Ordinalzahl → ein voll-grünes Feld gibt keinen ×8-Riesenblock mehr.
  const farbFactor = (pos, ord) => escalatingFactor(cards[pos].green ? Math.min(ord, PLANT_GREEN_FARBBLOCK_CAP) : ord, farbBase);
  markRuns(n, farbMin, matchSuit, suitGap, canExtendSeg,
    (pos, ord) => add(pos, "farbblock", ord, farbFactor(pos, ord)), farbSkip,
    (last, ord) => recordEnd(last, "farbblock", farbFactor(last, ord)), isJF, noteCross);

  const treppeAssign = (pos, ord) => add(pos, "treppe", ord, escalatingFactor(ord, TREPPE_BASE));
  const treppeEnd = (last, ord) => recordEnd(last, "treppe", escalatingFactor(ord, TREPPE_BASE));
  markTreppe(n, val, bind, treppeE, canExtendSeg, treppeAssign, treppeEnd, isJT, noteCross);
  // (Fallende Treppen „Abstieg" entfielen #179 — E_BIGSTEP deckt Rückschritte/Richtungswechsel innerhalb der Treppe ab.)
  // Wechsel: Kristallform gibt eingefrorenen Karten ±CRYSTAL_OFFSET-Wertoptionen (#165; Permafrost/Eisschritt gelten hier NICHT).
  // E_PENDULUM IV: wFactorStart hebt den Wechsel-Faktor bereits ab Länge 2 auf ×1,35 (sonst erst ab der 3. Karte).
  const valSetWechsel = cards.map((c, k) => (frozen[k] && kristallform ? [val[k] - CRYSTAL_OFFSET, val[k], val[k] + CRYSTAL_OFFSET] : [val[k]]));
  const wechselFactor = (ord) => Math.max(escalatingFactor(ord, WECHSEL_BASE), ord >= 2 && wFactorStart ? wFactorStart : 1);
  markWechsel(val, valSetWechsel, n, wMinLen, canExtendSeg,
    (pos, ord) => add(pos, "wechsel", ord, wechselFactor(ord)), wMinDiff,
    (last, ord) => recordEnd(last, "wechsel", wechselFactor(ord)), isJX, noteCross);

  // Anker (E_LOSS/E_QUICKSHOT, Rarität #167 Kat. E): Positionen + Faktor der gehaltenen Stufe — je siegreicher Anker,
  // zählt als Formation. E_QUICKSHOT IV „+2 Wert" (anchor.value) wird in der Engine auf die Anker-Positionen addiert.
  for (const { def } of activeFamilyEntries(familyTiers)) if (def.anchor)
    for (let pos = 0; pos < n; pos++)
      if (def.anchor.at(pos, n) && !out[pos].formations.some((f) => f.type === "anker")) add(pos, "anker", 1, def.anchor.factor);
  // Eisanker (#93 F3): jede eingefrorene Karte zählt auf ihrer Position als Anker ×1,25 (zählt als Formation).
  if (hasIceAnchor(skills)) for (let pos = 0; pos < n; pos++) if (frozen[pos] && !out[pos].formations.some((f) => f.type === "anker")) add(pos, "anker", 1, EISANKER_FACTOR);
  // Formationsanker (Shop §4.2, #164): jede Anker-Position zählt als Anker mit dem Stufen-Faktor (a.factor, 1,15…1,60),
  // falls dort noch kein Anker liegt (E7/E8/Eisanker). IV (×1,60) überlappt mit natürlichen Formationen (multipliziert dazu).
  for (const a of anchors) if (a.type === "formation" && a.position < n && !out[a.position].formations.some((f) => f.type === "anker")) add(a.position, "anker", 1, a.factor || ANCHOR_FORM_FACTOR);

  // Überlappungsbonus (#95): steckt eine Karte in mehreren Formationen, multipliziert der
  // Bonus das Faktor-Produkt zusätzlich (2 Formationen ×1,5 · 3 ×2 · 4 ×3). Gezählt werden ALLE
  // Mitgliedschaften (auch Faktor-1-Läufe) → deckt sich mit der Rahmen-Anzahl im UI.
  for (const p of out) {
    const c = Math.min(p.formations.length, 4);
    if (c >= 2) p.mult *= OVERLAP_BONUS[c];
  }

  // #179 E_SEGMENT IV Grenz-Bonus: Karten, die zu ≥1 segmentüberschreitenden Formation gehören, erhalten zusätzlich
  // ×crossBonus (je Karte EINMAL, unabhängig von der Zahl kreuzender Läufe). NACH der Überlappung → zählt NICHT in
  // deren Anzahl; als eigener Faktor in baseMult (fließt in den Formations-Score), analog Nachhall/Kern.
  if (segCrossBonus > 1) for (const pos of crossPositions) {
    out[pos].mult *= segCrossBonus;
    out[pos].formations.push({ type: "grenzbonus", ordinal: 1, factor: segCrossBonus });
  }

  // (Eis-Rework v0: der alte Kristallform-Zusatzbonus ×1,15 entfällt — Kristallform ist jetzt ein reiner ±2-Joker;
  //  der Schicht-Payoff läuft über die Schichten/Eisdruck in der Engine, nicht über einen Extra-Formationsfaktor.)

  // baseMult = Beitrag der „echten" Formationen (inkl. Überlappung), OHNE die Meta-Faktoren
  // Nachhall/Kern — die werden gleich als eigene Faktoren (§13) obendrauf gelegt und zählen NICHT
  // in die Überlappung (kein Doppel-Dip).
  for (const p of out) p.baseMult = p.mult;

  // F6 Nachhall (Shop §9): endet ein Basislauf auf Position p, bekommt die DIREKT folgende Karte (p+1)
  // dessen stärksten Einzel-Endfaktor als eigene Formation. Segmentgrenzen blocken NICHT (kein canExtendSeg-
  // Check); endet der Lauf auf der letzten Position (p+1 existiert nicht), passiert nichts. Kein Kaskadieren:
  // Nachhall entsteht nur aus Basisläufen (endBest), nie aus einem anderen Nachhall/Kern. Trägt den Ursprungstyp
  // mit (sourceType) — F-L1 kann daran andocken.
  // #164 Stufen: afterglowMaxFactor kappt den Faktor (I ×1,20 · II ×1,25 · III/IV kein Cap = null); afterglowRepsOnly
  // (I) nur bei Wiederholungen; afterglowHold (IV = 2) trägt den Nachhall auf die nächsten zwei Karten.
  if (eP("E_AFTERGLOW", "afterglow", false)) {
    const agCap = eP("E_AFTERGLOW", "afterglowMaxFactor", null);      // null = kein Cap
    const agRepsOnly = !!eP("E_AFTERGLOW", "afterglowRepsOnly", false);
    const agHold = eP("E_AFTERGLOW", "afterglowHold", 1);
    for (const key in endBest) {
      const p = Number(key);
      const { factor: rawF, type } = endBest[p];
      if (agRepsOnly && type !== "wiederholung") continue;        // I: nur Wiederholungen
      const factor = agCap != null ? Math.min(rawF, agCap) : rawF;
      if (factor <= 1) continue;
      for (let h = 1; h <= agHold; h++) {                         // IV: hält für agHold Karten
        const r = p + h;
        if (r >= n) break;
        out[r].afterglowFactor *= factor;
        out[r].mult *= factor;
        out[r].formations.push({ type: "nachhall", ordinal: 1, factor, sourceType: type });
      }
    }
  }

  // F-L1 Formationskern (Shop §9): jede Position, die Teil einer aktiven Formation des gewählten Typs ist
  // (eigener Basislauf des Typs ODER ein Nachhall dieses Ursprungstyps), bekommt zusätzlich ×FORMATION_CORE_FACTOR
  // als eigenen Faktor (§13). Als Meta-Faktor NACH der Überlappung, zählt nicht in deren Anzahl.
  const coreType = (roles["E_CORE"] || [])[0] || null;                 // #179 Formationskern: gewählter Typ (roles["E_CORE"])
  const coreFactor = eP("E_CORE", "coreFactor", FORMATION_CORE_FACTOR); // Faktor je Stufe (1,15…1,50)
  if (coreType) for (const p of out) {
    const partOfType = p.formations.some((f) => f.type === coreType || (f.type === "nachhall" && f.sourceType === coreType));
    if (partOfType) {
      p.coreFactor *= coreFactor;
      p.mult *= coreFactor;
      p.formations.push({ type: "formationskern", ordinal: 1, factor: coreFactor });
    }
  }

  return out;
}

// Trägt eine Position eine wirksame Formation (Score-Faktor > 1)? → speist den Formations-Stat (§22.3).
export const positionHasFormation = (posForm) => !!posForm && posForm.mult > 1;

// Anzahl der an einer Position AKTIVEN Formationen (Einzel-Faktor > 1) — speist die Count-Skalierung des
// Formations-Stats (#stat-rework: mehrere/überlappende Formationen je Sieg zahlen mehr). Deckungsgleich mit
// positionHasFormation: ≥1 ⟺ mult > 1. Formations-Einträge mit factor ≤ 1 (z. B. Farbblock-Ordinal 1) zählen nicht.
export const activeFormationCount = (posForm) =>
  (posForm?.formations || []).filter((f) => (f.factor || 1) > 1).length;

// #165: die vier Basis-Formationstypen (ohne Anker/Nachhall/Kern/Kristallform) als Set.
const BASE_FORMATION_SET = new Set(FORMATION_TYPES);
// Anzahl der Basis-Formationen (Nicht-Anker) an einer Position — Eisblüte verlangt ≥ 2 (§5.4).
export const baseFormationCount = (posForm) =>
  (posForm?.formations || []).filter((f) => BASE_FORMATION_SET.has(f.type)).length;
// Hat ein Segment (SEGMENT_SIZE Positionen ab segStart) durch die Umstellung eine NEUE Basis-Formation gewonnen?
// (§5.4-8: eine verlängerte Formation zählt, wenn eine zuvor nicht enthaltene Position beitritt.) Vergleicht je
// Position die Menge der Basis-Formationstypen: gewinnt eine Position einen Typ, der vorher dort nicht lag → true.
export function segmentGainedFormation(before, after, segStart, segSize = SEGMENT_SIZE) {
  for (let k = segStart; k < segStart + segSize; k++) {
    const b = new Set((before[k]?.formations || []).filter((f) => BASE_FORMATION_SET.has(f.type)).map((f) => f.type));
    const a = (after[k]?.formations || []).filter((f) => BASE_FORMATION_SET.has(f.type));
    if (a.some((f) => !b.has(f.type))) return true;
  }
  return false;
}

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
