import * as C from "../constants.js";
import { SKILL_DEFS, isLegendarySkill, boostedTier } from "../skills.js";

/* ============================================================
   HALTUNGEN — Fraktionsmodul (Arbeitstitel „Prisma", docs/haltungen-fraktion.md). Reine Logik: kein React,
   kein Math.random, alle Übergänge immutabel.

   Vier Haltungen, eine je Farbe. Ein Zähler je GRUNDFARBE zählt die gewonnenen Stiche dieser Farbe; bei
   STANCE_THRESHOLD wechselt die Haltung dorthin und NUR dieser Zähler fällt auf 0. Eine Haltung klingt ab dem
   Auslösen STANCE_MIN_DURATION Stiche (Anklang hebt das) und darüber hinaus, solange sie aktiv ist — eine
   abgelöste Haltung wirkt in ihrem Nachklang auf VOLLER Stärke weiter. Überlappung entsteht deshalb genau dann,
   wenn zwei Wechsel innerhalb der Mindestdauer fallen: „bunt bauen" bündelt die Zähler, „Farbblöcke" zieht sie
   auseinander (§2.1) — die Build-Achse fällt aus dem Mechanismus, ohne dass eine Regel sie ansagen muss.

   Die GRUNDFARBE ist erzwungen, nicht gewählt (§2.2): über die effektive Farbe gezählt, könnte die Rotation
   neben der Pflanze ab D15 nie wieder auslösen — dort hat im Median mindestens eine Farbe keine ungefärbte
   Karte mehr. `card.suit`, nie `effColor(card)`.

   Die vier Passive (§3) beugen je EINE bestehende Regel, statt eine Zahl zu addieren:
     Rot  Ergebnis     — Niederlage → Gleichstand, Gleichstand → Sieg (engine.js, vor der Verzweigung)
     Blau Crit         — STANCE_CRIT Crit-Chance, additiv auf das, was das Deck schon hat
     Grün Überlappung  — die Nachbarkarte INNERHALB des Segments erbt eine Überlappungs-Stufe (formations.js)
     Gelb Score        — glatter Multiplikator auf den Sieg-Score
   Sie stehen und skalieren NICHT mit der Zahl gehaltener Skills (Owner) — anders als Blitz.

   Die 15 Skills lesen ihre Kennwerte aus den Stufentabellen in SKILL_DEFS (`tiers[0..3]`) über `stanceParam`.
   Legendäre gibt es noch keine: sie werden nach der ersten Messung entworfen (Owner-Plan).
   ============================================================ */

// Skill-IDs der Fraktion — eine Linie je Haltung, dazu die Rotation, die über alle wirkt (§4, Schnitt A).
export const S = Object.freeze({
  // Score-Linie (gelb)
  STAUUNG: "SK_STANCE_01", BEHARRLICHKEIT: "SK_STANCE_02", MITKLANG: "SK_STANCE_03",
  // Crit-Linie (blau)
  GRUNDRAUSCHEN: "SK_STANCE_04", UEBERTRAG: "SK_STANCE_05", SCHWUNGRAD: "SK_STANCE_06",
  // Überlappungs-Linie (grün)
  DOPPELBINDUNG: "SK_STANCE_07", UEBERGRIFF: "SK_STANCE_08", VERANKERUNG: "SK_STANCE_09",
  // Ergebnis-Linie (rot)
  GENUGTUUNG: "SK_STANCE_10", RUECKHALT: "SK_STANCE_11", KEHRTWENDE: "SK_STANCE_12",
  // Rotations-Linie (wirkt über alle Haltungen)
  ANKLANG: "SK_STANCE_13", RUNDE: "SK_STANCE_14", BESCHLEUNIGUNG: "SK_STANCE_15",
});

// Die vier Grundfarben in fester Reihenfolge — Zähler, Anzeige und Tests lesen dieselbe Quelle.
export const STANCE_SUITS = Object.freeze(["R", "B", "G", "Y"]);

const zero = () => ({ R: 0, B: 0, G: 0, Y: 0 });

/* Der Lauf-Substate. `active` wird vom Reducer mit dem ersten Fraktions-Skill gesetzt; bis dahin ist alles inert
   und jeder Leser unten gibt seinen Neutralwert zurück (0 / 1 / false), damit Nicht-Prisma-Läufe byte-identisch
   bleiben. Der Lauf startet in Rot mit Zähler 0 (Owner): die nachsichtigste Haltung trifft genau die Phase, in
   der das Deck am schwächsten ist (45 % Siegquote roh). */
export function initStance() {
  return {
    active: false,
    stance: C.STANCE_START,        // aktive Haltung
    counts: zero(),                // gewonnene Stiche je Grundfarbe, bei `threshold` zurückgesetzt
    ring: zero(),                  // Reststiche der Mindestdauer je Farbe (Nachklang)
    ranFor: zero(),                // Stiche, die die Farbe ununterbrochen klingt (Beharrlichkeit)
    threshold: C.STANCE_THRESHOLD, // Schwelle für den nächsten Wechsel (Beschleunigung senkt sie)
    ext: 0,                        // Verlängerungen auf der AKTUELL aktiven Haltung (Schwungrad/Kehrtwende)
    carry: 0,                      // Übertrag: Reststiche, in denen ein Sieg zwangsweise crittet
    carried: [C.STANCE_START],     // Runde: Farben, die in dieser Runde schon getragen wurden
    roundsPending: 0,              // vollendete Runden DIESES Durchlaufs (zahlen im nächsten)
    roundBonus: 0,                 // Basis-Score je Sieg in DIESEM Durchlauf (aus dem vorigen)
    bank: 0,                       // Stauung: angesammelter Score der klingenden gelben Haltung
    anchorSeg: null,               // Verankerung: Segment, in dem Grün zuletzt ausgelöst hat (null = nicht verankert)
    slid: false,                   // Rückhalt: hat der VORIGE Stich gerutscht?
    switches: 0,                   // echte Haltungswechsel (Telemetrie/Sim)
    rounds: 0,                     // vollendete Runden im ganzen Lauf (Telemetrie/Sim)
  };
}

const held = (skills, id) => (skills || []).includes(id);

// Wirksame Stufe eines gehaltenen Skills (gewürfelte Stufe, Normal ohne Eintrag); null, wenn nicht gehalten.
export function stanceTier(skills, skillTiers, id) {
  if (!held(skills, id) || isLegendarySkill(id)) return null;
  const base = Number.isInteger(skillTiers?.[id]) ? skillTiers[id] : 0;
  return boostedTier(skills, base); // Hochspannung hebt jede Fraktion
}

// Kennwert eines gehaltenen Skills auf seiner Stufe; undefined, wenn nicht gehalten oder der Schlüssel fehlt.
export function stanceParam(skills, skillTiers, id, key) {
  const tier = stanceTier(skills, skillTiers, id);
  if (tier == null) return undefined;
  const row = SKILL_DEFS[id]?.tiers?.[tier];
  return row ? row[key] : undefined;
}

/* ---- Klingen: die eine Frage, die jeder Passiv-Leser stellt ----
   Die AKTIVE Haltung klingt immer (sie läuft bis zur Ablösung); jede andere genau so lange, wie ihre
   Mindestdauer noch Reststiche hat. Volle Stärke in beiden Fällen — es gibt keine Abschwächung (§2). */
export const ringsNow = (st, suit) =>
  !!(st && st.active && (st.stance === suit || (st.ring?.[suit] || 0) > 0));
export const ringCount = (st) => (st && st.active ? STANCE_SUITS.filter((s) => ringsNow(st, s)).length : 0);

// Mindestdauer einer auslösenden Haltung — Anklang hebt sie, sonst der Grundwert.
export const minDuration = (skills, skillTiers) =>
  stanceParam(skills, skillTiers, S.ANKLANG, "duration") ?? C.STANCE_MIN_DURATION;

/* ---- Die vier Passive ---- */

// Rot (Ergebnis): um wie viele Stufen der Ausgang steigt. Eine Stufe, solange Rot klingt — sonst keine.
export const stanceLift = (st) => (ringsNow(st, "R") ? 1 : 0);

/* Blau (Crit): STANCE_CRIT, solange Blau klingt — additiv auf das, was das Deck schon hat (§2). Klingt Blau
   NICHT, zahlt Grundrauschen: der einzige Skill des Entwurfs, der außerhalb seiner eigenen Haltung wirkt
   (§4.1). Beide schließen sich aus, sonst zahlte der Anti-Leerlauf-Skill ausgerechnet im Leerlauf doppelt. */
export function stanceCrit(st, skills, skillTiers) {
  if (!st || !st.active) return 0;
  if (ringsNow(st, "B")) return C.STANCE_CRIT;
  return stanceParam(skills, skillTiers, S.GRUNDRAUSCHEN, "crit") || 0;
}

/* Gelb (Score): glatter Multiplikator, solange Gelb klingt, plus die beiden Skalierer der Linie. Beharrlichkeit
   und Mitklang sind ein Spiegelpaar (§5.1) — im Block-Build wächst die eine und die andere steht auf 0, im
   bunten Build umgekehrt. Dieselbe Linie bedient beide Spielstile. Ohne klingendes Gelb: 1. */
export function stanceScoreMult(st, skills, skillTiers) {
  if (!ringsNow(st, "Y")) return 1;
  let m = C.STANCE_SCORE_MULT;
  const per = stanceParam(skills, skillTiers, S.BEHARRLICHKEIT, "perTrick");
  if (per) m += per * (st.ranFor?.Y || 0);
  const mit = stanceParam(skills, skillTiers, S.MITKLANG, "perStance");
  if (mit) m += mit * Math.max(0, ringCount(st) - 1);
  return m;
}

/* ---- Ergebnis-Linie (rot) ---- */

/* Genugtuung: Basis-Score je Punkt Rückstand, den ein gerutschter Stich gedreht hat. Liest JEDEN gerutschten
   Stich, nicht nur den gerutschten Sieg — sonst zahlte sie nie: das Passiv schiebt eine Niederlage auf
   Gleichstand, ein gerutschter Sieg war also immer ein Gleichstand, und der hat per Definition Rückstand 0. */
export function genugtuungScore(skills, skillTiers, deficit) {
  const rate = stanceParam(skills, skillTiers, S.GENUGTUUNG, "score");
  return rate && deficit > 0 ? rate * deficit : 0;
}

// Rückhalt: nach einem gerutschten Stich kämpft die nächste Karte mit mehr Wert.
export const rueckhaltValue = (skills, skillTiers) =>
  stanceParam(skills, skillTiers, S.RUECKHALT, "value") || 0;

/* ---- Verlängerer ---- */

/* Schwungrad (Crit) und Kehrtwende (Ergebnis) verlängern die AKTUELL aktive Haltung um einen Stich (§2), je mit
   einem eigenen Budget pro Haltung. Der Deckel IST der Stufenwert (§5.2/§5.5) — damit ist die Weglauf-Rechnung
   aus §6.4/§6.5 in der Tabelle erledigt statt als Sonderregel. `ext` fällt bei jedem echten Wechsel auf 0. */
export function extendStance(st, skills, skillTiers, source) {
  if (!st || !st.active) return st;
  const id = source === "crit" ? S.SCHWUNGRAD : S.KEHRTWENDE;
  const budget = stanceParam(skills, skillTiers, id, "max");
  if (!budget || st.ext >= budget) return st;
  return { ...st, ext: st.ext + 1, ring: { ...st.ring, [st.stance]: (st.ring[st.stance] || 0) + 1 } };
}

/* ---- Übertrag (Crit-Linie) ----
   Ein Crit springt über: die nächsten `range` Stiche critten zwangsweise. Der übergesprungene Crit darf NICHT
   seinerseits überspringen (§5.2) — sonst crittete man ab dem ersten Crit bis zum Ende der Haltung durch. Das
   Armieren hängt an der klingenden blauen Haltung; die schon armierte Reichweite läuft aus, wo sie hinfällt. */
export const carryArmed = (st) => !!(st && st.active && (st.carry || 0) > 0);
export function armCarry(st, skills, skillTiers) {
  if (!st || !st.active || !ringsNow(st, "B")) return st;
  const range = stanceParam(skills, skillTiers, S.UEBERTRAG, "range");
  return range ? { ...st, carry: range } : st;
}
export const spendCarry = (st) => (carryArmed(st) ? { ...st, carry: st.carry - 1 } : st);

/* ---- Stauung (Score-Linie) ----
   Solange Gelb klingt, zahlen Siege nicht, sondern sammeln an; endet die Haltung, entlädt sich der Stau mit
   Zuschlag. Episch entlädt zusätzlich am Durchlauf-Ende — auf den unteren Stufen bleibt die Falle bestehen und
   ist Absicht (§5.1): Schwungrad und Kehrtwende sorgen dafür, dass die Haltung NICHT endet, und dann
   verschwindet der Score in einem Stau, der nie aufgeht. */
export const banksNow = (st, skills, skillTiers) =>
  ringsNow(st, "Y") && stanceParam(skills, skillTiers, S.STAUUNG, "factor") != null;
export function dischargeBank(st, skills, skillTiers) {
  const factor = stanceParam(skills, skillTiers, S.STAUUNG, "factor");
  if (!st || !st.active || !factor || !(st.bank > 0)) return { stance: st, payout: 0 };
  return { stance: { ...st, bank: 0 }, payout: st.bank * factor };
}

/* ---- Rotation ---- */

// Runde: Basis-Score je Sieg, den der VORIGE Durchlauf verdient hat. Zwischen den Durchläufen liegt die
// Aufstellungsphase — der Spieler weiß also, dass der Bonus kommt, und kann darauf aufstellen (§5.3).
export const roundScore = (st) => (st && st.active ? st.roundBonus || 0 : 0);

/* Durchlauf-Ende: die vollendeten Runden dieses Durchlaufs werden zum Bonus des nächsten. Stapeln erst auf
   Episch (§5.3) — darunter zählt höchstens eine Runde, egal wie viele vollendet wurden. */
export function stanceCycleEnd(st, skills, skillTiers) {
  if (!st || !st.active) return { stance: st, payout: 0 };
  const rate = stanceParam(skills, skillTiers, S.RUNDE, "score") || 0;
  const stacks = !!stanceParam(skills, skillTiers, S.RUNDE, "stack");
  const rounds = stacks ? st.roundsPending : Math.min(1, st.roundsPending);
  let next = { ...st, roundsPending: 0, roundBonus: rate * rounds };
  // Stauung Episch: der Stau entlädt sich auch am Durchlauf-Ende, statt in einer nie endenden Haltung zu versickern.
  let payout = 0;
  if (stanceParam(skills, skillTiers, S.STAUUNG, "cycleEnd")) {
    const d = dischargeBank(next, skills, skillTiers);
    next = d.stance; payout = d.payout;
  }
  return { stance: next, payout };
}

/* ---- Der Takt: ein Stich weiter ----
   Am ENDE jedes Stichs gerufen, nachdem der Stich gewertet ist — der Stand VOR dem Stich hat ihn regiert, der
   Wechsel greift ab dem nächsten (§2: „Wechsel passieren mitten im Durchlauf"). Reihenfolge:
     1. Nachklang aller vier Farben um einen Stich abbauen,
     2. den Sieg zählen und ggf. auslösen,
     3. `ranFor` auf den Stand nachziehen, mit dem der NÄCHSTE Stich rechnet.
   Gibt { stance, switched, ended } zurück — `ended` nennt die Farben, die mit diesem Stich aufgehört haben zu
   klingen (die Stauung entlädt daran). */
export function stanceTick(st, skills, skillTiers, { wonSuit = null, pos = 0, slid = false, segmentSize = 5 } = {}) {
  if (!st || !st.active) return { stance: st, switched: false, ended: [] };
  const before = STANCE_SUITS.filter((s) => ringsNow(st, s));
  const ring = { ...st.ring };
  for (const s of STANCE_SUITS) ring[s] = Math.max(0, (ring[s] || 0) - 1);
  let next = { ...st, ring };
  let switched = false;
  if (wonSuit && STANCE_SUITS.includes(wonSuit)) {
    const counts = { ...next.counts, [wonSuit]: (next.counts[wonSuit] || 0) + 1 };
    if (counts[wonSuit] >= next.threshold) {
      counts[wonSuit] = 0; // nur die auslösende Farbe fällt zurück — die anderen drei zählen weiter
      // Ein Selbst-Auslösen frischt die Mindestdauer auf, zählt aber NICHT als Haltungswechsel (§2, Owner):
      // damit steht die aktive Farbe nie auf einem hohen Zählerstand und das Pendeln ist an der Wurzel aus.
      next = { ...next, ring: { ...next.ring, [wonSuit]: minDuration(skills, skillTiers) } };
      if (wonSuit !== next.stance) {
        switched = true;
        const carried = next.carried.includes(wonSuit) ? next.carried : [...next.carried, wonSuit];
        // Beschleunigung: jeder echte Wechsel senkt die Schwelle, bis auf den Boden der Stufe. Der Boden geht
        // bewusst nicht auf 1 — dort löste jede Farbe mit ihrem ersten Sieg aus (§6.7).
        const step = stanceParam(skills, skillTiers, S.BESCHLEUNIGUNG, "step") || 0;
        const floor = stanceParam(skills, skillTiers, S.BESCHLEUNIGUNG, "floor") ?? next.threshold;
        next = {
          ...next, stance: wonSuit, switches: next.switches + 1, ext: 0, carried,
          threshold: step ? Math.max(floor, next.threshold - step) : next.threshold,
        };
        // Runde vollendet: alle vier Haltungen einmal getragen.
        if (next.carried.length >= STANCE_SUITS.length) {
          next = { ...next, carried: [wonSuit], roundsPending: next.roundsPending + 1, rounds: next.rounds + 1 };
        }
      }
    }
    next = { ...next, counts };
  }
  const ranFor = { ...next.ranFor };
  for (const s of STANCE_SUITS) ranFor[s] = ringsNow(next, s) ? (ranFor[s] || 0) + 1 : 0;
  next = { ...next, ranFor, slid };
  // Verankerung: das Segment merken, in dem Grün ausgelöst hat — sie zahlt, solange die Haltung klingt, und fällt
  // mit ihr. „Erbt einmal" heißt EINE Stufe, nicht einen Stich (Lesart; §8 hält sie als Annahme fest).
  if (wonSuit === "G" && next.ring.G === minDuration(skills, skillTiers)) next = { ...next, anchorSeg: Math.floor(pos / segmentSize) };
  if (!ringsNow(next, "G")) next = { ...next, anchorSeg: null };
  const ended = before.filter((s) => !ringsNow(next, s));
  return { stance: next, switched, ended };
}

/* ---- Überlappung (grün) — die Geometrie, die formations.js braucht ----
   Das Abfärben ist von sich aus positionsbezogen, und Positionen kennen keine Segmente; die Segmentbindung ist
   deshalb eine ausdrückliche Klausel, keine geerbte (§3). Ohne sie liefe das Abfärben über jede Grenze und der
   Skill Übergriff hätte nichts zu tun. Angenehmer Nebeneffekt: die LAGE im Segment zählt — eine Karte am Rand
   färbt nur nach innen, eine in der Mitte nach beiden Seiten.

   Übergriff hebt die Bindung für die `borders` Grenzen mit den meisten Formationen daneben. Er weicht schon
   offenen Grenzen NICHT aus (Owner): dort tut er nichts, und wer Spalier, Segmentarbeit oder Durchlass
   mitführt, wählt ihn nicht. Verankerung lässt beim Auslösen der Haltung jede Karte der Reichweite einmal
   erben — der Skill für den Tanz-Build, weil er auch in einer Haltung zündet, die nur einen Stich lebt. */
export function stanceOverlapOpts(st, skills, skillTiers) {
  if (!ringsNow(st, "G")) return null;
  const anchored = st.anchorSeg != null;
  return {
    bleed: C.STANCE_BLEED,
    borders: stanceParam(skills, skillTiers, S.UEBERGRIFF, "borders") || 0,
    doubleBind: stanceParam(skills, skillTiers, S.DOPPELBINDUNG, "types") || 0,
    anchor: anchored ? (stanceParam(skills, skillTiers, S.VERANKERUNG, "segments") || 0) : 0,
    anchorSeg: st.anchorSeg || 0,
  };
}
// Der Schlüssel, an dem die Engine erkennt, dass das Brett neu gelesen werden muss. Alles, was die Geometrie
// verändert, steckt darin — und nur das: ein Wechsel, der Grün nicht berührt, rechnet nichts neu.
export const stanceFormKeyOf = (opts) =>
  (opts ? `${opts.bleed}|${opts.borders}|${opts.doubleBind}|${opts.anchor}|${opts.anchorSeg}` : "");
