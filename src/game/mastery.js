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

export const MASTERY_MAX_GRADE = 5;

// Schwellen [Grad I..V] — Best-Single-Run-Score (2026-07-31: 7,5/10/15/25/50 M). [TUNING]
// I–III im erreichbaren Band, IV≈p99, V=Fernziel (bewusst aspirational, nicht sim-kalibriert).
export const MASTERY_THRESHOLDS = [7_500_000, 10_000_000, 15_000_000, 25_000_000, 50_000_000];

// Grad → römisch (Index 0 = „kein Grad"). Minimalistische Rangnamen (keine Bildkarten, 1–10-Deck).
export const MASTERY_ROMAN = ["", "I", "II", "III", "IV", "V"];

const clampGrade = (g) => Math.max(0, Math.min(MASTERY_MAX_GRADE, Math.floor(Number(g) || 0)));

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
export function advanceGrade(current, score) {
  const cur = clampGrade(current);
  if (cur >= MASTERY_MAX_GRADE) return cur;
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

// Architekt-Baufeld-Deckel: +2 Zellen je Grad AB II (Grad I bleibt 24). base 24 → 24/24/26/28/30/32.
export const masteryCoverBonus = (g) => Math.max(0, clampGrade(g) - 1) * 2;

// Rarität-Shift (Selten/Rar häufiger): Grad III → 1, Grad IV+ → 2, sonst 0. Spiegelt TIER_WEIGHTS-Tabellen.
export const masteryRareShift = (g) => { const x = clampGrade(g); return x >= 4 ? 2 : x === 3 ? 1 : 0; };

// Legendär-Chancen-Multiplikator: Grad IV+ → ×3, sonst ×1 (unverändert).
export const masteryLegendMult = (g) => (clampGrade(g) >= 4 ? 3 : 1);

// Garantierter Legendär (1×/Lauf): erst ab Grad V.
export const masteryLegendGuaranteed = (g) => clampGrade(g) >= MASTERY_MAX_GRADE;

/* ---- Anzeige-Helfer (grob, keine Prozente/Zahlen — Balatro-Decks-Geist) ------------------ */

export const masteryGradeLabel = (g) => (clampGrade(g) >= 1 ? `Grad ${MASTERY_ROMAN[clampGrade(g)]}` : "Kein Grad");

/* #217 Challenger-Gating (#205): ein fremder Lauf ist nur herausforderbar, wenn er auf einem Grad ≤ dem eigenen
   Max-Grad gespielt wurde (sonst hätte der Herausforderer nicht dieselben Rewards). Reine, board-unabhängige Regel.
   NB: greift real erst am GLOBALEN Master-Board (Schicht B, /test/ mit #197) — lokale Seeds sind immer eigene
   (Grad ≤ aktuell), eingefügte Roh-Seeds tragen KEINEN Grad → nicht gatebar ohne Board. Hier als Fundament. */
export const canChallenge = (entryGrade, playerGrade) => clampGrade(entryGrade) <= clampGrade(playerGrade);

// Spieler-sichtbare Reward-Kurzlabels je Grad (kumulativ NEU dazukommend), nur grob.
export const MASTERY_REWARD_LABELS = {
  1: ["Mehr Neuwürfe"],
  2: ["Noch mehr Neuwürfe"],
  3: ["Mehr Neuwürfe", "Seltene häufiger"],
  4: ["Seltene viel häufiger", "Legendäre häufiger"],
  5: ["Garantierter Legendär"],
};
