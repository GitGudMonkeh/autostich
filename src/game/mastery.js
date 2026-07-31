/* ============================================================
   MEISTERGRADE (#217) — laufübergreifende Progression als Score-Anreiz.

   PUR & node-testbar (Analogon zu rarity.js/cosmetics.js): hält NUR die Schwellen,
   die sequentielle Freischalt-Logik und die Reward-Ableitungen. KEINE UI-/Asset-Importe,
   KEINE localStorage-Zugriffe — die Persistenz lebt in storage.js (Profil), die Anwendung
   im reducer, die Anzeige in der UI. So bleibt das Modul in `environment: "node"` prüfbar.

   Fünf Grade (I–V) über Best-Single-Run-Score-Schwellen. Belohnungen KUMULATIV, aber die
   Freischaltung SEQUENTIELL: ein einzelner Lauf schaltet höchstens den NÄCHSTEN Grad frei
   (geprüft gegen die `Grad+1`-Schwelle), auch bei riesigem Score (kein Multi-Sprung).

   KERN-INVARIANTE: Grad 0 (frischer Spieler) = beweisbares No-op. Alle Reward-Ableitungen
   liefern bei Grad 0 exakt die Basiswerte → Seed-Determinismus + Bestandstests unberührt.
   ============================================================ */

export const MASTERY_MEISTER_MAX = 5;   // Meister I–V — bis hier steigen die REWARDS.
export const MASTERY_MAX_GRADE = 10;    // + Großmeister I–V (Grade 6–10): NUR die Schwierigkeit steigt, keine neuen Rewards (#226).

// Schwellen [Grad 1..10]. Meister I–V: 5/10/15/25/50 M. Großmeister I–V: alle 50 M — das ZIEL bleibt 50 M,
// härter wird nur der Gegner (mitwachsender Ramp, difficultyForGrade). [TUNING] Meister I–III im Band, IV≈p99, V+ Fernziel.
export const MASTERY_THRESHOLDS = [
  5_000_000, 10_000_000, 15_000_000, 25_000_000, 50_000_000,
  50_000_000, 50_000_000, 50_000_000, 50_000_000, 50_000_000,
];

const clampGrade = (g) => Math.max(0, Math.min(MASTERY_MAX_GRADE, Math.floor(Number(g) || 0)));

// Römische Rang-Ziffer je Tier (Meister I–V bzw. Großmeister I–V). MASTERY_ROMAN bleibt Meister-kompatibel.
const ROMAN5 = ["", "I", "II", "III", "IV", "V"];
export const MASTERY_ROMAN = ROMAN5;
export const isGrandmaster = (g) => clampGrade(g) > MASTERY_MEISTER_MAX;
export const rankRoman = (g) => { const c = clampGrade(g); return c === 0 ? "" : ROMAN5[isGrandmaster(c) ? c - MASTERY_MEISTER_MAX : c]; };

// Großmeister-Schwierigkeit — N=250-validierte Leiter (Kommentar an #217, issuecomment-5143757920). KOMBINIERT drei
// additive Hebel, kumulativ eskalierend, ohne dem Spieler etwas wegzunehmen (Gegner-Aufschlag VOR den Debuffs →
// Frost/Brand kontern ihn). Ziel bleibt 50 M an ALLEN Stufen (Clear 5,3 %→0,1 %).
//   oppValue     = flacher Gegner-Wert-Aufschlag (Median-Killer)
//   oppRampEvery = mitwachsender Gegner: +1 Wert alle N Durchläufe (Decken-Killer, trifft das späte Compounding)
//   maxCycles    = kürzerer Lauf (schärfster Decken-Killer; nur oben in der Leiter, sanfte −3er-Schritte)
const GM_LADDER = [
  { oppValue: 1 },                                   // GI   (Grad 6)  — Median 0,82×, Clear 3,1 %
  { oppValue: 1, oppRampEvery: 20 },                 // GII  (Grad 7)  — 0,59× / 1,6 %
  { oppValue: 2, oppRampEvery: 15 },                 // GIII (Grad 8)  — 0,44× / 1,1 %
  { oppValue: 2, oppRampEvery: 12, maxCycles: 57 },  // GIV  (Grad 9)  — 0,31× / 0,2 %
  { oppValue: 3, oppRampEvery: 12, maxCycles: 54 },  // GV   (Grad 10) — 0,21× / 0,1 %
];
// Schwierigkeits-Modifikatoren des Grades g (für state.difficulty in der Engine). Meister (≤V) → null (No-op).
export function difficultyForGrade(g) {
  const c = clampGrade(g);
  return c <= MASTERY_MEISTER_MAX ? null : GM_LADDER[c - MASTERY_MEISTER_MAX - 1];
}

// Schwelle des Grades g (1..5); außerhalb → Infinity (nie erreichbar).
export const thresholdForGrade = (g) => MASTERY_THRESHOLDS[clampGrade(g) - 1] ?? Infinity;

// Schwelle des NÄCHSTEN Grades für einen Spieler auf Grad `cur` (0..5). Höchstgrad → null (kein Ziel mehr).
export const nextThreshold = (cur) => {
  const c = clampGrade(cur);
  return c >= MASTERY_MAX_GRADE ? null : MASTERY_THRESHOLDS[c];
};

/* Sequentielle Freischaltung: ein Lauf schaltet AT MOST einen Grad frei, geprüft gegen die
   Schwelle des nächsten Grades (Grad+1). Score jenseits mehrerer Schwellen springt NICHT mehrere
   Grade. Höchstgrad erreicht → unverändert. Bei Grad 0 mit zu kleinem Score → 0 (No-op). */
export function advanceGrade(current, score, playedGrade = current) {
  const cur = clampGrade(current);
  if (cur >= MASTERY_MAX_GRADE) return cur;
  // Großmeister-Aufstieg (ab Meister V, cur≥5): NUR wenn AUF dem aktuellen Max-Rang gespielt wurde — sonst
  // ließe sich die konstante 50-M-Schwelle auf einem leichteren Rang (schwächerer Ramp) farmen. Meister I–IV (cur<5)
  // bleibt ungegatet (Meister-Ränge haben denselben, ramp-freien Score → identisch zum bisherigen Verhalten).
  if (cur >= MASTERY_MEISTER_MAX && clampGrade(playedGrade) !== cur) return cur;
  const s = Number(score) || 0;
  return s >= MASTERY_THRESHOLDS[cur] ? cur + 1 : cur;
}

/* Fortschritt zum nächsten Grad als 0..1 (für den groben Battlefield-Balken; keine harte Zahl).
   Höchstgrad → 1 (voll). Grad 0 bei Score 0 → 0. */
export function masteryProgress(current, score) {
  const target = nextThreshold(current);
  if (target == null) return 1;
  return Math.max(0, Math.min(1, (Number(score) || 0) / target));
}

/* ---- Reward-Ableitungen (Grad 0 = Basiswerte = No-op) ----------------------------------- */

// Neuwurf-Pool: Basis 2 → +1 je Grad I/II/III, gedeckelt bei Σ5 (Grad IV/V bringen keine Rerolls mehr).
export const masteryRerollBonus = (g) => Math.min(clampGrade(g), 3);

// Architekt-Baufeld-Deckel: +2 Zellen je Grad AB II (Grad I bleibt 24). base 24 → 24/24/26/28/30/32. Bei Grad V
// gedeckelt (Großmeister bringt KEINE weiteren Zellen → sonst Brett-Overflow; nur die Schwierigkeit steigt).
export const masteryCoverBonus = (g) => Math.max(0, Math.min(clampGrade(g), MASTERY_MEISTER_MAX) - 1) * 2;

// Rarität-Shift (Selten/Rar häufiger): Grad III → 1, Grad IV+ → 2, sonst 0. Spiegelt TIER_WEIGHTS-Tabellen.
export const masteryRareShift = (g) => { const x = clampGrade(g); return x >= 4 ? 2 : x === 3 ? 1 : 0; };

// Legendär-Chancen-Multiplikator: Grad IV+ → ×3, sonst ×1 (unverändert).
export const masteryLegendMult = (g) => (clampGrade(g) >= 4 ? 3 : 1);

// Garantierter Legendär (1×/Lauf): ab Meister V (und damit auch für alle Großmeister-Ränge).
export const masteryLegendGuaranteed = (g) => clampGrade(g) >= MASTERY_MEISTER_MAX;

/* ---- Anzeige-Helfer (grob, keine Prozente/Zahlen — Balatro-Decks-Geist) ------------------ */

// Anzeige (User-Begriff: „Rang", nicht „Grad"; intern bleibt der Bezeichner masteryGrade). 0 = „Kein Rang".
export const masteryGradeLabel = (g) => {
  const c = clampGrade(g);
  if (c === 0) return "Kein Rang";
  return isGrandmaster(c) ? `Großmeister ${rankRoman(c)}` : `Rang ${rankRoman(c)}`;
};

/* #217 Challenger-Gating (#205): ein fremder Lauf ist nur herausforderbar, wenn er auf einem Grad ≤ dem eigenen
   Max-Grad gespielt wurde (sonst hätte der Herausforderer nicht dieselben Rewards). Reine, board-unabhängige Regel.
   NB: greift real erst am GLOBALEN Master-Board (Schicht B, /test/ mit #197) — lokale Seeds sind immer eigene
   (Grad ≤ aktuell), eingefügte Roh-Seeds tragen KEINEN Grad → nicht gatebar ohne Board. Hier als Fundament. */
export const canChallenge = (entryGrade, playerGrade) => clampGrade(entryGrade) <= clampGrade(playerGrade);

// Spieler-sichtbare Reward-Labels je Rang — KUMULATIVER Vollbestand (nicht Deltas): jeder Rang listet seinen
// kompletten Stand. Spiegelt die Reward-Ableitungen (masteryRerollBonus 1/2/3, masteryRareShift III→„häufiger"/
// IV→„noch häufiger", masteryLegendMult IV, masteryLegendGuaranteed V). Die UI hebt je Rang das NEU/Hochgestufte
// hervor (Diff zum Vorrang) → kein doppeltes „Neuwürfe" mehr.
export const MASTERY_REWARD_LABELS = {
  1: ["1 Neuwurf"],
  2: ["2 Neuwürfe"],
  3: ["3 Neuwürfe", "Seltene häufiger"],
  4: ["3 Neuwürfe", "Seltene noch häufiger", "Legendäre häufiger"],
  5: ["3 Neuwürfe", "Seltene noch häufiger", "Legendäre häufiger", "1 garantierter Legendär"],
};
