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
    ext: { crit: 0, slid: 0 },     // Verlängerungen auf der AKTUELL aktiven Haltung, je Quelle (Schwungrad/Kehrtwende)
    critRamp: 0,                   // Übertrag: Crits dieser blauen Haltung (je Schritt +Crit-Multiplikator)
    carried: [C.STANCE_START],     // Runde: Farben, die in dieser Runde schon getragen wurden
    echo: 0,                       // Anklang: Reststiche des Fensters NACH einem Haltungswechsel
    bar: 0,                        // Einklang-Leiste: füllt sich mit jedem echten Wechsel
    level: 0,                      // Stufe: dauerhaft, der einzige Sammler der Fraktion (Score-Multiplikator)
    einklang: 0,                   // Telemetrie: wie oft die Leiste diesen Lauf voll war
    peakBest: 0,                   // Stauung: größter Sieg der klingenden gelben Haltung
    peakTicks: 0,                  // Stauung: Stiche, die die gelbe Haltung schon klingt (Hebel des Spitzen-Zuschlags)
    slid: false,                   // Rückhalt: hat der VORIGE Stich gerutscht?
    turns: 0,                      // Genugtuung: gedrehte Stiche dieser roten Haltung (zahlt im Nachklang)
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

/* Anklang (§5.3): die Stiche NACH einem Haltungswechsel zahlen Basis-Score. Das Fenster ist genau so lang wie
   der Nachklang, den der Skill ohnehin verlängert — die Stufe ist also EINE Zahl, die beides steuert.
   Eigener Zähler statt `ring`, aus zwei Gründen: der Einklang lässt alle vier klingen, ohne dass ein Wechsel
   stattgefunden hätte (dort zahlt Anklang nicht), und zwei dichte Wechsel sollen nicht doppelt zahlen — das
   Fenster wird aufgefrischt, nicht gestapelt. Basis-Score gibt es nur auf einem Sieg; „bis zu 800" ist deshalb
   die Decke, nicht der Erwartungswert. */
export const anklangScore = (st, skills, skillTiers) =>
  (st && st.active && (st.echo || 0) > 0 ? (stanceParam(skills, skillTiers, S.ANKLANG, "score") || 0) : 0);

/* ---- Die Leiste und die Stufe (§3.1) ----
   „Runde" verkürzt die Leiste: derselbe Lauf füllt sie öfter, also steigt die Stufe schneller. Der Skill hieß
   vorher „alle vier getragen → Basis-Score im nächsten Durchlauf" und sagte damit fast dasselbe wie die Leiste
   selbst — er hat mit ihr eine eigene Aufgabe bekommen (Owner).
   Die Stufe ist ein glatter Multiplikator auf den Sieg-Score. EINE Zahl, EINE Lesart: die Alternative (jedes der
   vier Passive liest sie auf seine Weise) skalierte bei Rot und Grün holprig, und Rots Lesart wäre wortgleich mit
   dem Skill Genugtuung gewesen. */
export const barLength = (skills, skillTiers) =>
  stanceParam(skills, skillTiers, S.RUNDE, "bar") ?? C.STANCE_BAR;
/* 0 schaltet den Einklang GANZ ab — samt dem Episch-Extra von Runde, denn „+2 Stiche" auf einen Moment der
   Länge null ist keine Wirkung, sondern ein Rechenfehler. Der Haken trennt die zwei Hälften der vollen Leiste
   (Moment gegen dauerhafte Stufe) und erlaubt damit die Ablation in §6.13. */
export const einklangDuration = (skills, skillTiers) =>
  (C.STANCE_EINKLANG > 0 ? C.STANCE_EINKLANG + (stanceParam(skills, skillTiers, S.RUNDE, "einklangPlus") || 0) : 0);
// Der Sammler: 1 ohne Stufe, danach linear. Kein Deckel — der Regler ist der Satz je Stufe (skill-rework.md §1).
export const stanceLevelMult = (st) => (st && st.active ? 1 + (st.level || 0) * C.STANCE_STEP : 1);

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
  // Die Stufe wirkt auf JEDEN Stich, nicht nur auf den gelben — sie ist der Sammler der Fraktion, nicht ein Teil
  // der gelben Haltung. Deshalb steht sie außerhalb der Gelb-Prüfung.
  const level = stanceLevelMult(st);
  if (!ringsNow(st, "Y")) return level;
  let m = C.STANCE_SCORE_MULT;
  const per = stanceParam(skills, skillTiers, S.BEHARRLICHKEIT, "perTrick");
  if (per) m += per * (st.ranFor?.Y || 0);
  const mit = stanceParam(skills, skillTiers, S.MITKLANG, "perStance");
  if (mit) m += mit * Math.max(0, ringCount(st) - 1);
  return m * level;
}

/* ---- Ergebnis-Linie (rot) ---- */

/* Genugtuung (§5.3, Owner-Neudesign): zwei Phasen statt einer. Solange Rot AKTIV ist, wird nur gezählt, wie viele
   Stiche es gedreht hat (`turns`). Im NACHKLANG zahlt dann jeder Stich Basis-Score je gedrehtem Stich — die Haltung
   sammelt ihre Genugtuung an und holt sie sich, wenn sie schon abgelöst ist.
   Vorher zahlte sie sofort, je Punkt Rückstand; der Rückstand ist als Kennzahl weg.
   `turns` fällt, sobald Rot gar nicht mehr klingt (stanceTick), nicht schon bei der Ablösung — sonst stünde der
   Zähler im Nachklang, der ihn auszahlen soll, bereits auf 0. */
export const redEchoes = (st) => !!(st && st.active && st.stance !== "R" && (st.ring?.R || 0) > 0);
export function genugtuungScore(st, skills, skillTiers) {
  const rate = stanceParam(skills, skillTiers, S.GENUGTUUNG, "score");
  return rate && redEchoes(st) ? rate * (st.turns || 0) : 0;
}
// Ein gedrehter Stich, gemerkt für den Nachklang. Rot klingt hier immer (sonst hätte nichts gedreht).
export const noteTurn = (st) => ({ ...st, turns: (st.turns || 0) + 1 });

// Rückhalt: nach einem gerutschten Stich kämpft die nächste Karte mit mehr Wert.
export const rueckhaltValue = (skills, skillTiers) =>
  stanceParam(skills, skillTiers, S.RUECKHALT, "value") || 0;

/* Kehrtwende, zweite Hälfte (§5.5, Owner): ein gerutschter Stich gibt zusätzliche Serienpunkte. Sie liest JEDEN
   gerutschten Stich, wie Genugtuung — auch die zum Gleichstand gehobene Niederlage, die für die Serie sonst gar
   nichts täte. Die Verlängerung (`max`) bleibt daneben bestehen, beide Zahlen sind gestaffelt. */
export const kehrtwendeStreak = (skills, skillTiers) =>
  stanceParam(skills, skillTiers, S.KEHRTWENDE, "streak") || 0;

/* Kehrtwende Episch, dritte Zahl (Owner): der SATZ des Serien-Multiplikators steigt ein wenig. Sie hängt — anders
   als die beiden anderen Hälften — an keinem einzelnen Stich, sondern an der klingenden roten Haltung, wie jedes
   Passiv der Fraktion. Damit bleibt Grundrauschen der einzige Skill, der außerhalb seiner Haltung zahlt (§4.1). */
export const kehrtwendeStreakStep = (st, skills, skillTiers) =>
  (ringsNow(st, "R") ? stanceParam(skills, skillTiers, S.KEHRTWENDE, "streakStep") || 0 : 0);

/* ---- Verlängerer ---- */

/* Schwungrad (Crit) und Kehrtwende (Ergebnis) verlängern die AKTUELL aktive Haltung um einen Stich (§2), je mit
   einem eigenen Budget pro Haltung. Der Deckel IST der Stufenwert (§5.2/§5.5) — damit ist die Weglauf-Rechnung
   aus §6.4/§6.5 in der Tabelle erledigt statt als Sonderregel.

   Die Verlängerung wird GESAMMELT und erst bei der Ablösung eingelöst, nicht sofort auf den Nachklang gelegt.
   Das ist die einzige Lesart, die etwas tut: die aktive Haltung läuft ohnehin bis zur Ablösung, und ein Stich,
   der währenddessen auf `ring` gelegt wird, zählt im nächsten Takt wieder herunter — er ist verpufft, bevor er
   je gebraucht wird. Gemessen war genau das der Grund, aus dem beide Verlängerer schädlich maßen (Schwungrad
   −5 %, Kehrtwende −12 %): sie kosteten einen Platz und taten nichts. „Verlängert die Haltung" kann nur heißen,
   dass sie LÄNGER NACHKLINGT — und das entscheidet sich beim Wechsel. `ext` fällt dort auf 0. */
/* Jede Quelle hat ihr EIGENES Budget (Owner): „höchstens 10× je Haltung" ist Kehrtwendes Deckel, nicht der
   gemeinsame. Vorher lag beides auf einem Zähler, den jeder Skill gegen seinen eigenen Deckel prüfte — beide
   episch kamen damit auf 10 statt auf die 18, die §6.5 ausrechnet. */
export function extendStance(st, skills, skillTiers, source) {
  if (!st || !st.active) return st;
  const id = source === "crit" ? S.SCHWUNGRAD : S.KEHRTWENDE;
  const budget = stanceParam(skills, skillTiers, id, "max");
  const used = st.ext?.[source] || 0;
  if (!budget || used >= budget) return st;
  return { ...st, ext: { ...st.ext, [source]: used + 1 } };
}
// Was bei der Ablösung auf den Nachklang kommt: die Summe beider Quellen.
export const extTotal = (st) => (st?.ext?.crit || 0) + (st?.ext?.slid || 0);

/* ---- Übertrag (Crit-Linie) ----
   §5.3, Neudesign (Owner): nicht mehr Crit-CHANCE, sondern der Crit-MULTIPLIKATOR. Solange Blau klingt, hebt jeder
   Crit ihn um einen Schritt weiter; die Rampe fällt, sobald Blau verklungen ist. Damit hat die blaue Linie ihren
   fehlenden Hebel — vorher hatte sie Chance (Grundrauschen), erzwungene Crits (Übertrag alt) und Dauer
   (Schwungrad), aber nichts auf dem Multiplikator: Prisma trug zu `critMultiplier` gar nichts bei.
   Der Schritt zählt NACH dem Stich, der ihn auslöst — wie Serienanker und Crit-Folge. Der auslösende Crit zahlt
   also noch mit dem alten Stand; sonst wäre der erste Crit einer Haltung schon der verstärkte. */
export const noteCrit = (st) => (ringsNow(st, "B") ? { ...st, critRamp: (st.critRamp || 0) + 1 } : st);
/* Die Prüfung auf klingendes Blau steht hier AUCH, obwohl stanceTick die Rampe ohnehin fallen lässt: beides sind
   verschiedene Regeln, nicht dieselbe doppelt. Der Reset sagt „eine neue blaue Haltung fängt bei null an", diese
   Zeile sagt „gezahlt wird nur, solange Blau klingt". Ohne sie hinge die Auszahlung an fremdem Aufräumen. */
export function uebertragMult(st, skills, skillTiers) {
  const step = stanceParam(skills, skillTiers, S.UEBERTRAG, "step");
  return step && ringsNow(st, "B") ? step * (st.critRamp || 0) : 0;
}

/* ---- Stauung (Score-Linie) ----
   §5.3, zweites Neudesign (Owner: „der Skill macht zuviel"): das Bunkern ist WEG. Siege zahlen wieder normal.
   Geblieben ist eine einzige Zahl — der größte Sieg der gelben Haltung zahlt am Ende noch einmal, und dieser
   Zuschlag wächst mit der Laufzeit. Damit fällt auch das Durchlauf-Ende-Extra weg: es hat nur die Falle geflickt,
   dass gebunkerter Score in einer nie endenden Haltung versickert — ohne Bunker gibt es nichts zu verlieren, der
   Zuschlag wartet nur.
   `peakTicks` statt `ranFor.Y`, weil stanceTick den Laufzeit-Zähler im selben Stich zurücksetzt, in dem Gelb
   endet und ausgezahlt wird. */
export const stauungOn = (st, skills, skillTiers) =>
  ringsNow(st, "Y") && stanceParam(skills, skillTiers, S.STAUUNG, "peak") != null;
// Ein Sieg, den die gelbe Haltung gesehen hat: nur die Spitze zählt, die Summe interessiert niemanden mehr.
export const notePeak = (st, gained) => ({ ...st, peakBest: Math.max(st.peakBest || 0, gained) });
// Ein Stich Laufzeit — auch eine Niederlage zählt, sie verlängert die Haltung genauso.
export const tickPeak = (st) => ({ ...st, peakTicks: (st.peakTicks || 0) + 1 });
// Gelb endet: der größte Sieg zahlt noch einmal, skaliert mit der Laufzeit. Beide Zähler fallen.
export function cashPeak(st, skills, skillTiers) {
  const rate = stanceParam(skills, skillTiers, S.STAUUNG, "peak");
  if (!st || !st.active || !rate) return { stance: st, payout: 0 };
  return { stance: { ...st, peakBest: 0, peakTicks: 0 }, payout: (st.peakBest || 0) * rate * (st.peakTicks || 0) };
}

/* ---- Der Takt: ein Stich weiter ----
   Am ENDE jedes Stichs gerufen, nachdem der Stich gewertet ist — der Stand VOR dem Stich hat ihn regiert, der
   Wechsel greift ab dem nächsten (§2: „Wechsel passieren mitten im Durchlauf"). Reihenfolge:
     1. Nachklang aller vier Farben um einen Stich abbauen,
     2. den Sieg zählen und ggf. auslösen,
     3. `ranFor` auf den Stand nachziehen, mit dem der NÄCHSTE Stich rechnet.
   Gibt { stance, switched, ended } zurück — `ended` nennt die Farben, die mit diesem Stich aufgehört haben zu
   klingen (die Stauung entlädt daran). */
export function stanceTick(st, skills, skillTiers, { wonSuit = null, slid = false } = {}) {
  if (!st || !st.active) return { stance: st, switched: false, ended: [] };
  const before = STANCE_SUITS.filter((s) => ringsNow(st, s));
  const ring = { ...st.ring };
  for (const s of STANCE_SUITS) ring[s] = Math.max(0, (ring[s] || 0) - 1);
  let next = { ...st, ring, echo: Math.max(0, (st.echo || 0) - 1) };
  let switched = false;
  if (wonSuit && STANCE_SUITS.includes(wonSuit)) {
    const counts = { ...next.counts, [wonSuit]: (next.counts[wonSuit] || 0) + 1 };
    if (counts[wonSuit] >= next.threshold) {
      counts[wonSuit] = 0; // nur die auslösende Farbe fällt zurück — die anderen drei zählen weiter
      // Ein Selbst-Auslösen zählt NICHT als Haltungswechsel (§2, Owner) und tut sonst nichts: die Haltung ist
      // ohnehin aktiv. Es hält nur den Zähler unten, und damit ist das Pendeln an der Wurzel ausgeschlossen.
      if (wonSuit !== next.stance) {
        switched = true;
        /* Der Nachklang wird HIER festgelegt, beim Wechsel (Owner): „die alte Haltung wirkt noch in die neue
           hinein." Sie bekommt die volle Mindestdauer, unabhängig davon, wie lange sie schon aktiv war — jeder
           Wechsel erzeugt also Überlappung, nicht nur ein Wechsel, der dicht auf den vorigen folgt. Die
           gesammelten Verlängerungen kommen obendrauf: das ist der einzige Moment, in dem „verlängert die
           Haltung" etwas bedeuten kann, weil die aktive Haltung ohnehin bis zur Ablösung läuft. */
        next = { ...next, ring: {
          ...next.ring,
          [next.stance]: minDuration(skills, skillTiers) + extTotal(next),
          [wonSuit]: 0, // die neue Haltung ist aktiv; ein Rest-Nachklang von früher wäre nur Ballast
        } };
        next = { ...next, echo: minDuration(skills, skillTiers) }; // Anklangs Fenster, aufgefrischt statt gestapelt
        const carried = next.carried.includes(wonSuit) ? next.carried : [...next.carried, wonSuit];
        // Beschleunigung: jeder echte Wechsel senkt die Schwelle, bis auf den Boden der Stufe. Der Boden geht
        // bewusst nicht auf 1 — dort löste jede Farbe mit ihrem ersten Sieg aus (§6.7).
        const step = stanceParam(skills, skillTiers, S.BESCHLEUNIGUNG, "step") || 0;
        const floor = stanceParam(skills, skillTiers, S.BESCHLEUNIGUNG, "floor") ?? next.threshold;
        next = {
          ...next, stance: wonSuit, switches: next.switches + 1, ext: { crit: 0, slid: 0 }, carried,
          threshold: step ? Math.max(floor, next.threshold - step) : next.threshold,
        };
        // Runde vollendet: alle vier Haltungen einmal getragen. Reine Telemetrie, seit die Leiste den Sammler trägt.
        if (next.carried.length >= STANCE_SUITS.length) next = { ...next, carried: [wonSuit], rounds: next.rounds + 1 };
        /* Die Leiste (§3.1): jeder ECHTE Wechsel füllt sie um eins — ein Selbst-Auslösen nicht, wie bei
           Beschleunigung auch. Ist sie voll, passiert beides auf einmal:
             EINKLANG — alle vier Haltungen klingen `einklangDuration` Stiche lang gleichzeitig. Das braucht keine
               eigene Mechanik, es schreibt in die vier Nachklang-Zähler. `Math.max` verkürzt dabei nie einen
               längeren Nachklang, den ein Verlängerer eben erst gelegt hat.
             STUFE — dauerhaft +1, für den Rest des Laufs. Der einzige Sammler der Fraktion. */
        next = { ...next, bar: next.bar + 1 };
        if (next.bar >= barLength(skills, skillTiers)) {
          const dur = einklangDuration(skills, skillTiers);
          const rung = { ...next.ring };
          if (dur > 0) for (const s of STANCE_SUITS) rung[s] = Math.max(rung[s] || 0, dur);
          next = { ...next, bar: 0, level: next.level + 1, einklang: next.einklang + 1, ring: rung };
        }
      }
    }
    next = { ...next, counts };
  }
  const ranFor = { ...next.ranFor };
  for (const s of STANCE_SUITS) ranFor[s] = ringsNow(next, s) ? (ranFor[s] || 0) + 1 : 0;
  next = { ...next, ranFor, slid };
  // Genugtuungs Zähler lebt so lange wie die rote Haltung — Ablösung reicht nicht, der Nachklang zahlt ihn ja erst aus.
  if (!ringsNow(next, "R")) next = { ...next, turns: 0 };
  // Übertrags Rampe lebt so lange wie die blaue Haltung und fällt mit ihr (§5.2). Der Nachklang trägt sie noch.
  if (!ringsNow(next, "B")) next = { ...next, critRamp: 0 };
  const ended = before.filter((s) => !ringsNow(next, s));
  return { stance: next, switched, ended };
}

/* ---- Überlappung (grün) — die Geometrie, die formations.js braucht ----
   Das Abfärben ist von sich aus positionsbezogen, und Positionen kennen keine Segmente; die Segmentbindung ist
   deshalb eine ausdrückliche Klausel, keine geerbte (§3). Ohne sie liefe das Abfärben über jede Grenze und der
   Skill Übergriff hätte nichts zu tun. Angenehmer Nebeneffekt: die LAGE im Segment zählt — eine Karte am Rand
   färbt nur nach innen, eine in der Mitte nach beiden Seiten.

   Übergriff hebt die Bindung ganz auf, solange Grün klingt (§5.4). Verankerung steht seit §5.3 nicht mehr hier:
   sie ändert keine Geometrie mehr, sondern zahlt im Nachklang einen Multiplikator (s. u.). */
export function stanceOverlapOpts(st, skills, skillTiers) {
  if (!ringsNow(st, "G")) return null;
  return {
    bleed: C.STANCE_BLEED,
    // Übergriff (§5.4, Owner): solange Grün klingt, zählt das Brett, als wären ALLE Segmentgrenzen offen —
    // ohne Stufe und ohne Auswahl. Die Stufe sitzt stattdessen auf dem Überlappungsbonus selbst.
    allBorders: held(skills, S.UEBERGRIFF),
    overlapPlus: stanceParam(skills, skillTiers, S.UEBERGRIFF, "bonus") || 0,
    doubleBind: stanceParam(skills, skillTiers, S.DOPPELBINDUNG, "types") || 0,
  };
}
// Der Schlüssel, an dem die Engine erkennt, dass das Brett neu gelesen werden muss. Alles, was die Geometrie
// verändert, steckt darin — und nur das: ein Wechsel, der Grün nicht berührt, rechnet nichts neu.
export const stanceFormKeyOf = (opts) =>
  (opts ? `${opts.bleed}|${opts.allBorders ? 1 : 0}|${opts.overlapPlus}|${opts.doubleBind}` : "");

/* Verankerung (§5.3, Owner-Neudesign): im NACHKLANG der grünen Haltung bekommt jeder Stich einen Zuschlag auf
   seinen Multiplikator, je Formation an seiner Siegposition. Die Leiter ist der Satz je Formation.
   Sie ändert damit keine Geometrie mehr (vorher: Überlappungs-Stufen beim Auslösen) und ist der Gegenpol zu
   Genugtuung: dieselbe Zwei-Phasen-Form, nur auf Grün und multiplikativ statt flach.
   Gezählt wird `activeFormationCount` — dieselbe Zahl, die der Stich anzeigt und die Brennpunkt/Feuerlinie lesen. */
export const greenEchoes = (st) => !!(st && st.active && st.stance !== "G" && (st.ring?.G || 0) > 0);
export function verankerungMult(st, skills, skillTiers, formCount) {
  const rate = stanceParam(skills, skillTiers, S.VERANKERUNG, "perForm");
  return rate && formCount > 0 && greenEchoes(st) ? 1 + rate * formCount : 1;
}
