/* ============================================================
   CHALLENGE-MODUS (#301) — stapelbare Modifikatoren mit DP-Einsatz.

   PUR & node-testbar (wie progression.js/rarity.js): NUR die Modifikator-Defs (data-driven) und die
   Einsatz-/Abrechnungs-Logik. KEINE UI-/Asset-Importe, KEIN localStorage, KEIN RNG/Date. Die Auswahl lebt
   im Auswahl-Fenster (UI), die Anwendung im Reducer/Engine, die Persistenz/Gutschrift in storage.js.

   Regeln (Issue #301):
   • 3 Modifikatoren, feste Reihenfolge, KUMULATIV: erst C1, dann C1+C2, dann C1+C2+C3 (ein späterer setzt
     die früheren voraus). „active" ist also immer ein Präfix [c1..cN].
   • Ziele sind strikt `>` (echt über der Schwelle).
   • Erfüllt → +gain DP, verfehlt → −loss DP. Alle aktiven summieren sich (roher Challenge-Netto, kann negativ sein).
   • Die native DP-Formel (floor(score/10M), #299) läuft im Challenge-Run ZUSÄTZLICH weiter; die Challenge-DP
     kommen obendrauf. Das LAUF-NETTO (native + challenge) wird bei 0 gedeckelt — Abzüge können die Sieges-DP
     des Laufs auffressen, aber nie das DP-Guthaben ins Minus ziehen.
   • Nur abgeschlossene Läufe werten; Abbruch/Niederlage = neutral (die Aufrufer-Naht entscheidet das).
   ============================================================ */

// Modifikatoren in fester Reihenfolge (order = Präfix-Position). effect = Schlüssel für die Reducer-/Engine-Naht.
export const CHALLENGES = [
  { id: "c1", order: 1, effect: "noRerolls", name: "Keine Rerolls",
    desc: "Alle Reroll-Pools (Skill/Perk/Architekt) = 0 — keine Rerolls verfügbar.",
    target: 50_000_000, gain: 3, loss: 2 },
  { id: "c2", order: 2, effect: "archLock", lockCells: 10, name: "Architekt: 10 Felder gesperrt",
    desc: "10 zufällige Zellen des Bau-Bretts blockiert (ausgegraut + rot), nicht bebaubar.",
    target: 75_000_000, gain: 4, loss: 4 },
  { id: "c3", order: 3, effect: "formLock", lockCells: 10, name: "Aufstellbrett: 10 Felder gesperrt",
    desc: "10 zufällige Zellen fixiert: Karte weder weg- noch hin-tauschbar, zählt aber normal für Formationen, kann aber nicht als Gletscher eingefroren werden.",
    target: 100_000_000, gain: 10, loss: 5 },
];
export const CHALLENGE_IDS = CHALLENGES.map((c) => c.id);
export const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));

/* Normalisiert eine Auswahl auf die geordnete, gültige Präfix-Liste [c1..cN].
   Akzeptiert: eine Zahl N (0..3 = „C1..CN aktiv"), ein Array von ids/Objekten, ein Set. Ungültige/lückenhafte
   Auswahl wird auf das längste gültige führende Präfix beschnitten (C2 ohne C1 → leer, da C1 fehlt). */
export function normalizeActive(active) {
  if (active == null) return [];
  if (typeof active === "number") {
    const n = Math.max(0, Math.min(CHALLENGES.length, Math.floor(active)));
    return CHALLENGES.slice(0, n);
  }
  const ids = new Set(
    (Array.from(active) || []).map((x) => (x && typeof x === "object" ? x.id : x))
  );
  // Längstes führendes Präfix, das lückenlos gesetzt ist.
  const out = [];
  for (const c of CHALLENGES) {
    if (ids.has(c.id)) out.push(c);
    else break;
  }
  return out;
}

/* Anzeige im Auswahl-Fenster: laufende Summe des maximal möglichen Gewinns (alle Ziele erfüllt) und des
   maximal möglichen Verlusts (alle verfehlt) der aktiven Modifikatoren. */
export function challengeStakes(active) {
  const list = normalizeActive(active);
  return {
    maxGain: list.reduce((s, c) => s + c.gain, 0),
    maxLoss: list.reduce((s, c) => s + c.loss, 0),
  };
}

// Pro aktivem Modifikator: Ziel gegen Endscore prüfen (strikt >) → delta (+gain | −loss).
export function challengeResults(active, finalScore) {
  const score = Number(finalScore) || 0;
  return normalizeActive(active).map((c) => {
    const met = score > c.target;
    return { id: c.id, name: c.name, target: c.target, gain: c.gain, loss: c.loss, met, delta: met ? c.gain : -c.loss };
  });
}

// Roher Challenge-Netto (Σ delta) — kann negativ sein.
export function challengeRaw(active, finalScore) {
  return challengeResults(active, finalScore).reduce((s, r) => s + r.delta, 0);
}

/* Voll-Abrechnung eines abgeschlossenen Challenge-Laufs.
   nativeDp = die normale floor(score/10M)-DP des Laufs (#299).
   Rückgabe:
     raw    = Σ delta (Challenge-Netto, kann negativ sein)
     native = nativeDp (unverändert durchgereicht)
     runDp  = max(0, nativeDp + raw)  → tatsächlich gutzuschreibende Lauf-DP (bei 0 gedeckelt)
     results= Detailliste je Modifikator (für den Victory-Screen)
   Deckelung wird auf das LAUF-NETTO (native+challenge) angewandt, nicht auf das Guthaben → nie < 0. */
export function settleChallenges(active, finalScore, nativeDp = 0) {
  const results = challengeResults(active, finalScore);
  const raw = results.reduce((s, r) => s + r.delta, 0);
  const native = Math.max(0, Math.floor(Number(nativeDp) || 0));
  const runDp = Math.max(0, native + raw);
  return { raw, native, runDp, results };
}
