/* #telemetrie — ENTSCHEIDUNGS-LOG (Angebot ↔ Wahl).

   Zweck: Balancing braucht nicht nur, WAS gewählt wurde (das steht am Laufende ohnehin in `perks`/`skills`),
   sondern WAS DANEBEN ANGEBOTEN WAR. Erst „40× angeboten, 3× genommen" macht einen Perk als tot erkennbar.

   Bauart — bewusst als HIGHER-ORDER-REDUCER statt als Eingriff in reducer.js:
     • reducer.js bleibt Byte-für-Byte unangetastet → die Determinismus-Invariante (#205) und alle bestehenden
       Reducer-Tests sind per Konstruktion nicht betroffen. Der Sim (der den nackten `reducer` importiert)
       läuft ohne Log weiter — keine Baseline-Verschiebung.
     • Der Wrapper ist selbst REIN: er liest Angebot aus dem VORHERIGEN State, die Wahl aus der Action, und
       hängt einen kompakten Eintrag an. Kein Date/Math.random → voll unit-testbar.
     • Ein No-Op wird nie geloggt: `next === prev` heißt, der Reducer hat die Action per Guard verworfen
       (ungültige Wahl, falsche Phase, kein Reroll-Token mehr). Wir loggen also nur WIRKSAME Entscheidungen.

   Eintrags-Format (kurze Schlüssel — der Log fährt in jedem Resume-Snapshot mit, Größe zählt):
     { c: cycle, s: score, k: kind, o: [angeboten], p: gewählt|null, r: rerollIndex, x: ersetzt }
   `o`/`p` sind IMMER flache Strings (Familien-Stufen als "fam:<id>:<tier>", Gebäude als "<familyId>:<tier>")
   → in Postgres direkt als jsonb-Array abfragbar, ohne Sonderfall je Angebotstyp.
   `p: null` = bewusst abgelehnt (Ablehnen ist eine Entscheidung und der wichtigste Negativ-Datenpunkt). */

// Deckel gegen unbegrenztes Wachstum (Dev-Runs, sehr lange Läufe). Ein normaler 60-Runden-Lauf liegt bei
// ~40–80 Einträgen; 500 ist rund 6× Kopffreiheit und deckelt den Resume-Snapshot hart.
export const DECISION_LOG_CAP = 500;

// Angebots-Eintrag → flacher String. Perk-Angebote mischen blanke Perk-IDs (String) und Familien-Stufen
// (Objekt {familyId, tier}); Architekt-Angebote sind immer {familyId, tier, used}.
const offerKey = (e) => {
  if (typeof e === "string") return e;
  if (!e || typeof e !== "object") return null;
  if (e.familyId == null) return null;
  return e.tier != null ? `fam:${e.familyId}:${e.tier}` : `fam:${e.familyId}`;
};
const archKey = (familyId, tier) => `${familyId}:${tier}`;
const keys = (arr) => (Array.isArray(arr) ? arr.map(offerKey).filter(Boolean) : []);

// Welcher Reroll-Pool wurde angefasst? (Für „wie oft rerollt wer was".)
const REROLL_KIND = {
  REROLL_PERK: "perk", REROLL_SKILL: "skill", REROLL_ARCHITECT: "arch",
};

/* Einen Log-Eintrag aus (vorher, action, nachher) ableiten. null = nicht protokollwürdig.
   REIN — keine Seiteneffekte, kein Zugriff auf Zeit/Zufall. */
export function decisionEntry(prev, action, next) {
  if (!prev || !next || next === prev) return null; // No-Op/verworfene Action → keine Entscheidung
  const t = action && action.type;
  if (!t) return null;
  // Gemeinsamer Rahmen: Runde + Score-Stand ZUM ZEITPUNKT der Wahl. Der Score macht die Wahl später
  // einordbar („mit welchem Punktestand im Rücken wurde das genommen") — ohne ihn ist ein Pick kontextlos.
  const base = { c: prev.cycle ?? 0, s: Math.round(prev.score || 0), r: prev.offerRerolls || 0 };
  switch (t) {
    case "PICK_PERK":
      return { ...base, k: "perk", o: keys(prev.offer), p: action.perkId };
    case "PICK_FAMILY":
      return { ...base, k: "perk", o: keys(prev.offer), p: `fam:${action.familyId}:${action.tier}` };
    case "DECLINE_PERK":
      return { ...base, k: "perk", o: keys(prev.offer), p: null };
    case "PICK_SKILL":
      return { ...base, k: "skill", o: keys(prev.skillOffer), p: action.skillId,
        ...(action.replaceId ? { x: action.replaceId } : {}) }; // x = ersetzter Skill (Slot war voll)
    case "DECLINE_SKILL":
      return { ...base, k: "skill", o: keys(prev.skillOffer), p: null };
    case "ARCHITECT_BUILD":
      return { ...base, k: "arch", o: keys((prev.architect || {}).offers), p: archKey(action.familyId, action.tier) };
    case "ARCHITECT_UPGRADE": {
      // Ausbauen bietet nichts an — geloggt wird, WAS ausgebaut wurde (Familie + erreichte Stufe).
      const b = ((prev.architect || {}).buildings || []).find((x) => x.id === action.buildingId);
      if (!b) return null;
      return { ...base, k: "archUp", o: [], p: archKey(b.familyId, b.tier + 1) };
    }
    case "GLACIER_LOCK":
      // Eis: welches Feld wurde festgefroren (Position 0..39) — die einzige Gletscher-Entscheidung des Spielers.
      return { ...base, k: "glacier", o: [], p: String(action.pos) };
    case "REROLL_PERK": case "REROLL_SKILL": case "REROLL_ARCHITECT":
      // Reroll = eigener Eintrag (statt nur eines Zählers): so ist später rekonstruierbar, WELCHES Angebot
      // weggeworfen wurde — `o` ist das VERWORFENE Angebot.
      return { ...base, k: "reroll", w: REROLL_KIND[t],
        o: keys(t === "REROLL_PERK" ? prev.offer
              : t === "REROLL_SKILL" ? prev.skillOffer
              : (prev.architect || {}).offers), p: null };
    default:
      return null;
  }
}

/* Reducer-Dekorator: identisches Verhalten plus `decisionLog` im State.
   - START_RUN/RESET → frischer, leerer Log (der neue Lauf erbt nichts vom alten).
   - RESTORE_RUN → der Log des wiederhergestellten Laufs gilt (Resume verliert die Historie nicht).
   - sonst → anhängen, wenn `decisionEntry` etwas liefert; sonst State unverändert DURCHREICHEN
     (identische Referenz → keine überflüssigen React-Re-Renders). */
export function withDecisionLog(baseReducer) {
  return function reducerWithLog(state, action) {
    const next = baseReducer(state, action);
    const t = action && action.type;
    if (t === "START_RUN" || t === "RESET") return { ...next, decisionLog: [] };
    if (t === "RESTORE_RUN") return next.decisionLog ? next : { ...next, decisionLog: [] };
    const entry = decisionEntry(state, action, next);
    if (!entry) return next;
    const log = [...(state.decisionLog || []), entry];
    return { ...next, decisionLog: log.length > DECISION_LOG_CAP ? log.slice(-DECISION_LOG_CAP) : log };
  };
}
