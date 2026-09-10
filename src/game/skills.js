import * as C from "./constants.js";
import { shuffle } from "./deck.js";
// Eis: die Zahlen der SKILLS stehen in der Stufentabelle EIS unten. Aus glacier.js kommt nur, was ohne Skill gilt —
// die Schwellen, die Wucht je Stufe, der Linien-Faktor der Geometrie und die Werte der drei Legendären.
import { EISWALL_MIN as G_EISWALL_MIN, BURST_AT as G_BURST_AT,
  EISZEIT_FLOOD as G_EISZEIT_FLOOD, EISZEIT_BURST_PER as G_EISZEIT_BURST,
  GROSSE_LAWINE_EVERY as G_LAWINE_EVERY,
  SCHILD_PER_PICK as G_SCHILD_PER_PICK, GROSSE_LAWINE_MULT as G_LAWINE_MULT } from "./glacier.js";

// Deutsche Zahlformatierung (1.08 → „1,08") — driftgefährdete Beschreibungszahlen aus den Konstanten interpolieren.
const de = (x) => String(x).replace(".", ",");
const pct = (x) => Math.round(x * 100);                                 // Anteil → Prozent (0,25 → 25)
// Kleine Anzahl als Wort (Register: „zwei fremde Karten", „fünffach"). Exportiert, weil auch die Passiv-Texte in der
// UI sie brauchen — eine Quelle für die Zahlwörter, sonst driften Skilltext und Passiv auseinander.
export const numWord = (n) => ({ 1: "eine", 2: "zwei", 3: "drei", 4: "vier", 5: "fünf", 6: "sechs", 7: "sieben", 8: "acht" })[n] || String(n);
const de1 = numWord;

// (§6.1: „Trimmen" ist mit dem Türen-Angebot gestorben — Skills werden nicht mehr ersetzt, die Klausel an sechs
//  Pflanze-Skills hatte keinen Auslöser mehr. Die Konstanten TRIM_STEP/TRIM_CAP sind mit ihr gegangen.)

/* ============================================================
   SKILL-REGISTRY — seltene, regelverändernde Build-Motoren NEBEN den Perks. Reine Logik — kein Math.random/Date.

   exp skill rework (docs/skill-rework.md): jeder normale Skill hat vier Stufen (Normal · Selten · Sehr selten ·
   Episch); die Kennwerte je Stufe stehen als `tiers[0..3]` am Skill, die Fraktionsmodule (src/game/factions/*.js)
   lesen sie über die gehaltene Stufe (state.skillTiers). Blitz und Feuer sind umgestellt; Eis/Pflanze tragen bis zu
   ihrer Runde noch die alten Flag-Hooks, die engine.js/skills.js-Helfer aggregieren.
   Der erste Skill eines Archetyps aktiviert dessen System (lightning.active / heat.active, Reducer).
   ============================================================ */
// Stufentabellen der 15 Blitz-Skills (§3.5) — Zeile 0 Normal · 1 Selten · 2 Sehr selten · 3 Episch. Die Texte darunter
// interpolieren dieselben Zahlen (kein Drift zwischen Regel und Beschreibung). Startwerte für die Sim.
const BLITZ = {
  ableiter:      [{ critEvery: 2, back: 0 }, { critEvery: 2, back: 1 }, { critEvery: 1, back: 1 }, { critEvery: 1, back: 2, noCritCharge: 1 }], // §7.18: nimmt Statische Aufladung und Dauerstrom auf (beide gestrichen)
  ionenfeld:     [{ tricks: 5, value: 2 }, { tricks: 7, value: 3 }, { tricks: 10, value: 4 }, { tricks: 15, value: 5 }], // §7.18 neu (SK_LIGHTNING_02): jede volle Leiste lädt das Feld; §7.20: 2/3/4/5 (2/2/2/3 war neutral, 3/3/4/5 kippte die Parität — Normal entscheidet den Median)
  reststrom:     [{ floor: 2 }, { floor: 3 }, { floor: 4 }, { floor: 6, bar: 9 }], // §7.22 Episch-Extra: die Leiste ist bei 9 voll
  gewitter:      [{ critPerBar: 0.005 }, { critPerBar: 0.0075 }, { critPerBar: 0.01 }, { critPerBar: 0.015, multPerBar: 0.02 }], // §7.22 Episch-Extra: dazu +0,02× Crit-Multiplikator je Leiste
  /* §7.42 (Owner): Entladung verlässt die Crit-Multiplikator-Achse. Dort sagten vier Skills dasselbe, und §7.41 hat
     gemessen, dass sie am Deckel verfallen (−19 % bei 99 % Haltequote). Die volle Leiste zahlt schon in Rate, Wert,
     Crit-Chance, Stapel und Multiplikator — frei war allein der BASIS-SCORE. Startwerte, NICHT gemessen. */
  entladung:     [{ scorePerBar: 2 }, { scorePerBar: 3 }, { scorePerBar: 4 }, { scorePerBar: 6, critDouble: true }],
  serie:         [{ chargeFromStreak: 16 }, { chargeFromStreak: 12 }, { chargeFromStreak: 8 }, { chargeFromStreak: 5 }], // §7.30 (Owner: „Skillnutzlichkeit erhöhen"): von Crit-Chance auf LADUNG umgestellt — als Chance-Skill maß er 0,79× und stand mit −17 % unten (§7.29 D), weil die Chance seit dem Sockel spät ohnehin gegen die 100-%-Klemme läuft. Ladung ist der Engpass, und der Name sagt es. Gepaarter Sweep der Schwelle 30/22/16/12/8/5/3: besser in 51/55/57/68/69/80/81 % (Blitzableiter Normal zum Vergleich 68 %)
  vorentladung:  [{ minStreak: 5, multPerStreak: 0.1 }, { minStreak: 4, multPerStreak: 0.1 }, { minStreak: 3, multPerStreak: 0.1 }, { minStreak: 2, multPerStreak: 0.15 }], // §7.18 neu (SK_LIGHTNING_12): Serie zu Crit-Multiplikator; §7.22 Episch 0,15
  kette:         [{ barEvery: 1, extra: 1 }, { barEvery: 1, extra: 2 }, { barEvery: 1, extra: 3 }, { barEvery: 1, extra: 4, second: 1 }], // §7.18: Tiefe — die Karte mit den meisten Stapeln; §7.19: jede Leiste, 1/2/3/4; §7.22 Episch-Extra: die zweittiefste +1
  faenger:       [{ minStacks: 1, value: 1 }, { minStacks: 1, value: 2 }, { minStacks: 1, value: 3 }, { minStacks: 1, value: 4, perStack: 1 }], // §7.18: ohne Schwelle, der Wert steigt; §7.22 Episch-Extra: +1 je Stapel
  kurzschluss:   [{ minStacks: 6, factor: 2 }, { minStacks: 5, factor: 2 }, { minStacks: 4, factor: 2 }, { minStacks: 3, factor: 2, onLoss: true }], // §7.22 Episch-Extra: der doppelte Stapel-Score zählt auch bei Niederlage (zahlt beim nächsten Sieg)
  stau:          [{ step: 0.05, critKeep: 0 }, { step: 0.075, critKeep: 0 }, { step: 0.1, critKeep: 0 }, { step: 0.15, critKeep: 0.5 }], // §7.18: Crit-Multiplikator statt Crit-Chance
  lichtbogen:    [{ critPerStack: 0.005 }, { critPerStack: 0.01 }, { critPerStack: 0.015 }, { critPerStack: 0.02 }], // §7.28 (Owner): ersetzt Überspannung auf SK_LIGHTNING_04 — jeder wirksame Stapel der gespielten Karte gibt Crit-CHANCE auf den Stich, die Richtung, die bis dahin keine Regel und kein Skill bediente. Startwerte, noch nicht gemessen (Owner: erst Design, dann Startwert, dann messen)
  blitzschlag:   [{ critEvery: 4, stacks: 1 }, { critEvery: 3, stacks: 1 }, { critEvery: 2, stacks: 1 }, { critEvery: 2, stacks: 2 }], // §7.18: einen Schritt schneller, Episch zwei Stapel
  serienschutz:  [{ cost: 1, perRound: 2 }, { cost: 1, perRound: 3 }, { cost: 1, perRound: 5 }, { cost: 1, perRound: 8 }], // §7.30: fester Preis + Deckel je Durchlauf statt eines Anteils der Leiste bei JEDER Niederlage (Effekt +23 %, so wie er war −17 %). Sweep: bei Preis 2 bleibt er neutral (51 % besser als ohne), bei Preis 1 trägt er (59–69 %) — eine Ladung ist teuer, die Leiste ist der Engpass. Die Leiter ist damit die KADENZ, die Häufigkeitsleiter, die Blitz fehlte (§7.26 D)
};
export const BLITZ_TIERS = BLITZ;
const pctS = (x) => de(Math.round(x * 10000) / 100); // Anteil → Prozent mit bis zu zwei Nachkommastellen (0,0075 → „0,75"; eine Stelle rundete 0,75 auf „0,8")
/* Ein Text je Stufe (docs/skill-rework.md §1): `f(row)` schreibt den Satz für EINE Stufenzeile — Angebot und Bestand
   zeigen nur den Text der gezeigten Stufe (labels.js skillDef(id, tier)), nie die ganze Leiter. `desc` bleibt der
   Normal-Text (Dev-Katalog, Datenbank, ältere Leser); `descTiers` trägt alle vier. Ein Episch-Extra hängt an seiner
   Tabellenzeile (z. B. `overflow`, `chargeFromStreak`) und erscheint nur dort. */
const tiered = (rows, f) => { const descTiers = rows.map((r) => f(r)); return { desc: descTiers[0], descTiers }; };
const jeder = (n, w = "Jeder") => (n === 1 ? w : `${w} ${n}.`); // „Jeder 2. Crit" / „Jeder Crit"
// „Einmal" / „Zweimal je Durchlauf" — aus numWord abgeleitet, damit die Zahlwörter EINE Quelle behalten (§7.30).
const malWort = (n) => { const w = n === 1 ? "einmal" : `${numWord(n)}mal`; return w[0].toUpperCase() + w.slice(1); };
// Stufentabellen der 15 Feuer-Skills (§4.5) — dieselbe Form; die Schwellen sinken, die Sätze steigen mit der Stufe.
// Das Modul factions/fire.js liest sie über `fireParam`; Legendäre haben keine Zeile.
const FEUER = {
  // §7.34: +75 % auf den Satz, Kosten 3 → 2. Beide Eingänge des Skills hat §7.32 verkleinert — er liest den KAMPFWERT
  // der Siegkarte, und der kam zum guten Teil aus der Klinge. Die Kosten sind bei voller Leiste kein Nullposten: was
  // verbrennt, fehlt dem Schmelzpunkt als Überlauf.
  feuerlinie:    [{ perPoint: 0.035, cost: 2 }, { perPoint: 0.05, cost: 2 }, { perPoint: 0.065, cost: 2 }, { perPoint: 0.08, cost: 2, perFormation: true }], // §7.23 (Owner): ersetzt Glut (Kaltstart, tot) auf SK_FIRE_01 — Formations-Sieg +Satz je Punkt Kampfwert, verbrennt `cost` Hitze; Episch je Formation an der Siegposition
  // §7.34: verdoppelt. Bei voller Leiste ist Zunder kein Hitze-Skill mehr, sondern ein Score-Skill — jeder Punkt, der
  // nicht mehr auf die Leiste passt, geht über den Schmelzpunkt (100 % gehalten) in den Basis-Score.
  zunder:        [{ heat: 4 }, { heat: 6 }, { heat: 8 }, { heat: 10, lossHeat: 2 }], // §7.16: 1–4 → 2–5; §7.22 Episch-Extra: auch Niederlagen geben +2
  feuersturm:    [{ multPerStreak: 0.001 }, { multPerStreak: 0.0015 }, { multPerStreak: 0.002 }, { multPerStreak: 0.003, minHeat: 90 }], // §7.17: Serie zu Score bei voller Leiste (Episch ab 90 %, §7.18: war 80); vorher Serie zu Hitze. Satz nach Sweep (0,5 % je Punkt war ×3 Blitz)
  glutbett:      [{ floor: 40, rise: 1 }, { floor: 60, rise: 2 }, { floor: 80, rise: 3 }, { noCool: true }], // §6.24: der Boden steigt, wenn er einen Sturz abfängt
  rueckzuendung: [{ every: 5, mult: 1.8 }, { every: 4, mult: 1.8 }, { every: 3, mult: 1.8 }, { every: 2, mult: 1.8, value: 2 }], // §7.24 (Owner): Takt — jeder N. Sieg in Folge zündet und zählt ×mult, Episch kämpft die zündende Karte mit +2 (vorher Konter nach einer Niederlage, §7.22 — ab der Laufmitte gibt es keine Niederlagen mehr); §7.34: Faktor 1,5 → 1,8 (die Leiter ist der Takt, der Faktor steht auf allen Stufen gleich)
  klinge:        [{ perHeat: 40, value: 1 }, { perHeat: 30, value: 1 }, { perHeat: 25, value: 1 }, { perHeat: 20, value: 1 }],
  weissglut:     [{ multPer10: 0.03 }, { multPer10: 0.04 }, { multPer10: 0.05 }, { multPer10: 0.06 }],
  // §7.34: Breite 3–6 → 4–10, Faktor 2,5 → 3. Die Schneise deckte 8–15 % der Stiche und zahlte im Schnitt ×1,2 —
  // zu wenig für einen Skill, der einen ganzen Durchlauf Vorlauf braucht. Jetzt 10–25 % der Stiche.
  schneise:      [{ width: 4, mult: 3 }, { width: 6, mult: 3 }, { width: 8, mult: 3 }, { width: 10, mult: 3, hold: 2 }], // Satz nach Sweep (×1,5 / 2 / 2,5 / 3 im Duell → Floor 0,91 / 0,96 / 1,00 / 1,03×); §7.27 (Owner, Bauform a): ersetzt Feuerwalze auf SK_FIRE_08 — die `width` Siege mit dem größten Vorsprung eines Durchlaufs schlagen die Schneise, im nächsten zählt ein Sieg dort ×mult; Episch hält sie zwei Durchläufe. Die Knappheit ist strukturell (N von 40 Positionen), nicht historisch
  verbrennung:   [{ minMargin: 8, mult: 1.5 }, { minMargin: 7, mult: 1.5 }, { minMargin: 6, mult: 1.5 }, { minMargin: 5, mult: 1.5, heatToo: true }], // §7.22 Episch-Extra: der Faktor zählt auch auf den Hitzegewinn
  schmelzpunkt:  [{ perPoint: 15 }, { perPoint: 20 }, { perPoint: 25 }, { perPoint: 30, lossPays: true }], // §7.16: Überlauf-Wandler — verbrennt nichts mehr; Flächenbrand (SK_FIRE_11) ist gestrichen
  brandmal:      [{ minHeat: 80, value: 2 }, { minHeat: 60, value: 2 }, { minHeat: 40, value: 2 }, { minHeat: 20, value: 2, onLoss: true }],
  lauffeuer:     [{ minHeat: 80, value: 1, reach: 1 }, { minHeat: 60, value: 1, reach: 1 }, { minHeat: 40, value: 1, reach: 1 }, { minHeat: 20, value: 1, reach: 2 }],
  schmiede:      [{ minHeat: 80, cards: 1 }, { minHeat: 60, cards: 2 }, { minHeat: 40, cards: 2 }, { minHeat: 20, cards: 3 }], // §7.14: ohne Preis, nur Schwelle; §7.34: mehr Karten je Runde (die Schwelle lag schon tief genug, sie war nie das Problem)
  /* §7.34 hob den Satz um 75 %, §7.35 hat ihn zurückgemessen: −4 → −7 %, also SCHLECHTER. Er zahlt je Punkt Kampfwert
     über dem Grundwert, und diese Bemessungsgrundlage war zum guten Teil die Klinge — ein höherer Satz auf fast null
     bleibt fast null. §7.36 (Owner): zurück auf den alten Stand. „es gibt noch genügend andere quellen werte zu
     erhöhen über perks wenn man darauf spielt" — Glutstahl ist damit ein Bau-Skill, kein Grundstock. */
  glutstahl:     [{ perPoint: 8 }, { perPoint: 12 }, { perPoint: 16 }, { perPoint: 20, forgedDouble: true }],
};
export const FEUER_TIERS = FEUER;
/* Stufentabellen der 15 Pflanze-Skills (§6.8) — dieselbe Form. Bezugsgrößen: Wachstum +1 je Sieg und +1 je Formation
   an der Siegposition, grün ab PLANT_GREEN_THRESHOLD, blühend ab PLANT_BLOOM_THRESHOLD; eine Position gewinnt über
   einen Lauf grob 30-mal. Die Sätze der Score-Skills sind nach der LÄNGE ihres Formationstyps gestaffelt: ein grüner
   Farbblock kann im Zielbild das ganze Segment füllen, Treppe und Wiederholung bleiben kurz, der Wechsel ist am
   seltensten. Startwerte, NICHT gemessen (Owner: erst Design, dann Startwert, dann messen — auf Ansage).
   Das Modul factions/plant.js liest sie über `plantParam`; die vier Hebel liest zusätzlich formations.js. */
const PFLANZE = {
  // Wachstum
  aussaat:       [{ growth: 2 }, { growth: 3 }, { growth: 4 }, { growth: 5, second: 1 }], // §6.26: eine Stufe hoch — der einzige Wachstums-Skill, der schon zahlte, bekommt den kleinsten Schub
  // §6.26: Ranken greift ins Gegnerdeck (Vorlage: der gestrichene Ausläufer). Die Ernte geht an die SIEGKARTE — der
  // Grund, aus dem der Skill vorher tot war: Wachstum auf Karten, die nicht gewinnen, zahlt nicht.
  ranken:        [{ growth: 2 }, { growth: 3 }, { growth: 4 }, { growth: 6, neighbors: true }],
  setzlingsbeet: [{ growth: 3 }, { growth: 4 }, { growth: 6 }, { growth: 6, allSegments: true }], // §6.26: aus dem einmaligen Kaltstart wird ein Ort, der jeden Durchlauf wächst; §6.29: +50 %

  lichtung:      [{ extra: 3 }, { extra: 5 }, { extra: 7 }, { extra: 7, perFormation: true }], // §6.29: +50 % — in allen sieben Welten schwach, mechanisch richtig gebaut
  halm:          [{ growth: 2 }, { growth: 3 }, { growth: 4 }, { growth: 6, perFormation: true }], // §6.26: ohne Grau-Schranke — jede Karte wächst; §6.29: +50 %
  // Hebel — sie ändern, was als Formation erkannt wird (formations.js), und addieren keinen Score
  spalier:       [{ borders: 1 }, { borders: 2 }, { borders: 3 }, { borders: 7 }],
  wildwuchs:     [{ jokers: 1 }, { jokers: 2 }, { jokers: 3 }, { jokers: Infinity }],
  // §6.26: Dickicht ersetzt Lücke auf SK_PLANT_15. Der grüne Farbblock ist der einzige Formationstyp, den die Pflanze
  // selbst erzeugt (grün IST eine Farbe) — und ausgerechnet sein Faktor ist für Grün bei PLANT_GREEN_FARBBLOCK_CAP
  // eingefroren. `mult` ist der Faktor, den `cap` ergibt; ein Guard hält beide gegen escalatingFactor (kein Drift).
  dickicht:      [{ cap: 4, mult: 1.55 }, { cap: 5, mult: 1.75 }, { cap: 6, mult: 1.95 }, { cap: 8, mult: 2.35 }],
  // §6.26: Verwachsung ersetzt Überwucherung auf SK_PLANT_14 — deren Tor („ab 80 % grünem Feld") lag hinter dem Ziel.
  // Der Zuschlag ist ABSOLUT: der Zwei-Formations-Sieg gewinnt am meisten, und dort liegen 38 % der Siege (§6.21 C).
  verwachsung:   [{ bonus: 0.4 }, { bonus: 0.7 }, { bonus: 1 }, { bonus: 1.4 }], // §6.29: +40 %
  // Score aus grünen Formationen — je Formationstyp einer, dazu die Tiefe der einzelnen Karte
  // §6.29: +50 %. Der Farbblock-Satz stand auf einem Viertel der Hecke, weil ein grüner Block das ganze Segment füllen
  // kann — der gierige Spieler hielt ihn mono trotzdem nur in 6 % der Läufe. Er bleibt der niedrigste der vier.
  blaetterdach:  [{ score: 15 }, { score: 22 }, { score: 30 }, { score: 40 }],
  // §6.29: nur +10 %. Mehr lässt die Staffel nicht zu — die Treppe muss unter dem Wechsel bleiben (kürzerer Lauf zahlt
  // je Karte mehr) und unter der Hecke (eine grüne Wiederholung entsteht seltener). Rankgerüsts Problem ist ohnehin die
  // HÄUFIGKEIT einer grünen Treppe, nicht der Satz; der Satz allein holt es nicht.
  rankgeruest:   [{ score: 33 }, { score: 49 }, { score: 66 }, { score: 88 }],
  // §6.26: +33 % gegen Rankgerüst — beide Leitern waren nach Formationslänge gleich, aber eine grüne Wiederholung
  // entsteht seltener als eine grüne Treppe, und der Unterschied ging voll auf die Hecke (§6.17 B).
  hecke:         [{ score: 40 }, { score: 60 }, { score: 80 }, { score: 105 }],
  windung:       [{ score: 35 }, { score: 50 }, { score: 70 }, { score: 90 }],
  // §6.26 hob den Teiler 10 → 15 (−33 %), weil Wachstum reichlicher wurde. Gemessen war das zu viel: Haltequote 47 %,
  // Wirkung −0 %, im Tripel −11 %. §6.29 nimmt die Hälfte zurück (Teiler 12) und hebt die Sätze um ein Viertel.
  jahresringe:   [{ per: 12, score: 25 }, { per: 12, score: 35 }, { per: 12, score: 45 }, { per: 12, score: 60, overDouble: true }],
  // Kombination
  bluetenlese:   [{ score: 40, growth: 1 }, { score: 60, growth: 1 }, { score: 80, growth: 1 }, { score: 100, growth: 2 }],
};
export const PFLANZE_TIERS = PFLANZE;
/* Stufentabellen der 15 Eis-Skills (§5.3) — dieselbe Form. Eis ist die letzte Fraktion, die Stufen bekommt; bis dahin
   las die Mechanik globale Konstanten über die Rolle `G_…`, und eine gewürfelte Stufe änderte nichts. Diese Tabelle ist
   ab jetzt die EINZIGE Quelle der Zahlen: glacier.js hält nur noch, was ohne Skill gilt (Schwellen, Kaskade, Passiv).
   Das Modul factions/ice.js liest sie über `iceTuning(roles, roleTiers)`; die drei Legendären haben keine Stufe.
   Startwerte, NICHT gemessen (Owner: erst Design, dann Startwert, dann messen — auf Ansage). */
const EIS = {
  // Firn — die Masse-Motoren
  // §5.31: ANTEIL statt flacher Zahl. Der gefrorene Boden liefert seit §5.29 rund 20 Masse je Durchlauf — daneben war
  // „+1 bis +4 je Sieg" nicht mehr zu spüren (gemessen −7 % mono / −10 % Paar). Episch: der Formations-Sieg zählt doppelt.
  anfrieren:      [{ pct: 0.1 }, { pct: 0.15 }, { pct: 0.2 }, { pct: 0.28, form: true }],
  schneetreiben:  [{ seed: 2, fields: 1 }, { seed: 3, fields: 1 }, { seed: 4, fields: 1 }, { seed: 5, fields: 2 }],
  dauerfrost:     [{ near: 1, far: 2 }, { near: 2, far: 3 }, { near: 2, far: 4 }, { near: 3, far: 6 }],
  // §5.31 nachgezogen (Mechanik unverändert): 0,25–1 war neben dem Boden-Einkommen kaum zu spüren — 97 % Haltequote
  // bei −10 % Wirkung, der klassische „immer genommen, nie gespürt"-Fall.
  verdichtung:    [{ per: 0.6 }, { per: 0.9 }, { per: 1.3 }, { per: 2 }], // §5.18: Masse je Punkt Kampfwert-Überschuss
  // Eisschild — Cluster und Dichte
  /* §5.31 (Owner: „bau aber vllt noch einen für duo oder Triplett um"): Packeis zählt jetzt die OFFENEN Nachbarn
     statt der gefrorenen — der einzige der vier Dichte-Skills, der die Seite wechselt. Gemessen war er der reinste
     Mono-Skill der Fraktion (+24 % mono, −8 %/−8 % im Mix). Als Kante zwischen Eis und offenem Wasser trägt er den
     Namen weiterhin, und ein dünn gebauter Eis-Anteil bekommt damit neben Dauerfrost eine zweite Masse-Quelle. */
  packeis:        [{ per: 0.5 }, { per: 0.75 }, { per: 1 }, { per: 1.5 }],
  eisbruecke:     [{ weight: 0.5 }, { weight: 0.75 }, { weight: 1 }, { weight: 1.25 }], // §5.2: die Diagonale bekommt ein Gewicht statt eines Schalters
  // §5.24 (Owner-Route A): der Eiswall liest die KETTENLÄNGE statt „volle Reihe oder nichts". Der alte Hebel hob den
  // Linien-Faktor (1,45 … 2,1) und maß −8 % bei 38 % Haltequote: er zahlte erst ab 5 Gletschern in einer Reihe und
  // verlangte dafür die dünnste Form, während die halbe Fraktion Dichte bezahlt. Jetzt zahlt schon eine Kette aus 3.
  eiswall:        [{ per: 0.15 }, { per: 0.2 }, { per: 0.25 }, { per: 0.3 }],
  verzahnung:     [{ per: 0.15 }, { per: 0.25 }, { per: 0.4 }, { per: 0.6 }], // niedrig angesetzt: der Ertrag wächst quadratisch mit der Clustergröße
  // Lawine — der Payoff
  /* §5.31: die Abbruchkante ist der SAMMEL-Skill geworden. Sie hebt die Berst-Schwelle, statt die Stufenwucht ein
     wenig anzuheben — das alte +7/+18/+19 % war gegen eine Leiter, die bis ×9,7 reicht, ein Nebengeräusch (gemessen
     +9 % mono / +15 % Paar / −3 % Tripel). Wer hält, trifft die Sprosse, die sein Einkommen hergibt. */
  /* §5.32: die Schwellen liegen jetzt AUF den Sprossen der Leiter. Der erste Wurf (18/24/30/38) lag zwischen ihnen —
     24 zählt noch zur vierten Sprosse wie 18, 38 noch zur fünften wie 30. Auszahlung je Durchlauf und Punkt Einkommen
     (Masse × Wucht ÷ Kletterzeit): 12 → 4,40 · 18 → 4,80 · 24 → 4,27 · 30 → 5,75 · 38 → 5,46. Stufe 2 war damit
     SCHLECHTER als gar kein Skill und Episch schlechter als Stufe 3 — der gierige Spieler hat ihn folgerichtig fallen
     lassen (Haltequote 68 % → 20 %). Auf den Sprossen: 18 → +9 %, 27 → +34 %, 40 → +79 %, 60 → +145 %. */
  abbruchkante:   [{ at: 18 }, { at: 27 }, { at: 40 }, { at: 60 }],
  // §5.23 (Owner): Eisbeben ersetzt den Kettenbruch auf SK_ICE_11. Der Kettenbruch fasste fremde Gletscher an und
  // war damit nicht zu retten (§5.22, zwei gemessene Fehlversuche); das Eisbeben liegt ganz auf dem eigenen Bruch.
  // Die Leiter steht doppelt so hoch wie entworfen (3/4/6/9): mit 3 % gemessen tot (Lift 0,97, +1 %), weil der Überschuss
  // über der Schwelle klein ist — KEEP_MAX deckelt, was liegen bleibt. Mit 6 % greift er (+14 %); 9 % war zu stark (§5.23).
  eisbeben:       [{ per: 0.06 }, { per: 0.08 }, { per: 0.12 }, { per: 0.18, sturz: true }],
  // §5.18 (Owner): Gletscherzunge ersetzt Rissbildung auf SK_ICE_13. Rissbildung widersprach als einzige der eigenen
  // Schleife (halten & wachsen, dann gewaltig brechen), stand bei −7 % (§5.7) — und wer bei 6 bricht, sieht die vierte
  // Schwelle nie. An ihrer Stelle der Hebel, der Eis fehlte: Masse zu Kampfwert, damit der Gletscher seinen Stich gewinnt.
  gletscherzunge: [{ per: 6 }, { per: 4 }, { per: 3 }, { per: 2, neighbors: true }],
  gletschersturz: [{ per: 0.03 }, { per: 0.05 }, { per: 0.07 }, { per: 0.1 }],
  // Frostgriff — Kontrolle und Duo
  einfrieren:     [{ cards: 1 }, { cards: 2 }, { cards: 3 }, { cards: 5 }], // §5.2: erbt die Reichweite des gestrichenen Legendären Erstarrung
  frostbund:      [{ buff: 2 }, { buff: 3 }, { buff: 4 }, { buff: 6 }],
  // §5.18 (Owner): Sprödbruch ersetzt Eispanzer auf SK_ICE_17. Crit ist der größte Hebel auf den Bruch (glacierWinMult
  // nimmt den Crit-Multiplikator mit, Basis ×2,25) — und kein Eis-Skill bediente ihn, Eis hat 0 % Grund-Crit. Startwert
  // bewusst niedrig: multiplikativ auf den Bruch tariert man von unten hoch.
  // §5.20 (Owner): verdoppelt — der Startwert war bewusst niedrig gewählt (multiplikativ auf den Bruch), und §5.19 hat
  // ihn bei −9 % gemessen. Bei Masse 12 sind das jetzt 12 / 18 / 24 / 36 % Crit-Chance.
  sproedbruch:    [{ crit: 0.01 }, { crit: 0.015 }, { crit: 0.02 }, { crit: 0.03, critMass: 3 }],
};
export const EIS_TIERS = EIS;
// Einfrieren: der Nachsatz je Reichweite — ausgeschrieben, weil Singular und Plural sonst am Zahlwort auseinanderfallen.
// §5.25: der Griff zählt Karten, nicht Nachbarn — „die höchste" / „die N höchsten".
const EINFRIEREN_ZIEL = (n) => (n === 1 ? "die höchste Karte des Gegnerdecks" : `die ${de1(n)} höchsten Karten des Gegnerdecks`);

export const SKILL_DEFS = {
  // ---- Blitz (exp skill rework, §3): Passiv +5 % Crit je Skill, Leiste 10 Crits → nächste Karte ionisieren.
  //      Die Mechanik liest die Stufentabellen oben (factions/lightning.js). Texte: ein Satz je Stufe (`tiered`).
  // Rate — die Leiste schneller füllen
  // (§7.18: Statische Aufladung SK_LIGHTNING_08 und Dauerstrom SK_LIGHTNING_16 sind in Blitzableiter aufgegangen.)
  SK_LIGHTNING_01: { id: "SK_LIGHTNING_01", name: "Blitzableiter", archetype: "lightning", keywords: ["charge", "crit"], tiers: BLITZ.ableiter,
    ...tiered(BLITZ.ableiter, (r) => `${jeder(r.critEvery)} Crit gibt +1 Ladung zusätzlich.${r.back ? ` Nach jeder vollen Leiste kommt +${r.back} Ladung zurück.` : ""}${r.noCritCharge ? ` Jeder Sieg ohne Crit gibt +${r.noCritCharge} Ladung.` : ""}`) },
  SK_LIGHTNING_05: { id: "SK_LIGHTNING_05", name: "Reststrom", archetype: "lightning", keywords: ["charge"], tiers: BLITZ.reststrom,
    ...tiered(BLITZ.reststrom, (r) => `Nach jeder vollen Leiste startet die Ladung bei ${r.floor} statt 0.${r.bar ? ` Die Leiste ist schon bei ${r.bar} voll.` : ""}`) },
  SK_LIGHTNING_02: { id: "SK_LIGHTNING_02", name: "Ionenfeld", archetype: "lightning", keywords: ["charge", "ionize"], tiers: BLITZ.ionenfeld,
    ...tiered(BLITZ.ionenfeld, (r) => `Jede volle Leiste lädt das Feld: für die nächsten ${r.tricks} Stiche haben alle deine Karten +${r.value} Wert.`) },
  // Rampen — jede volle Leiste zählt dauerhaft
  SK_LIGHTNING_06: { id: "SK_LIGHTNING_06", name: "Gewitterfront", archetype: "lightning", keywords: ["charge", "crit"], tiers: BLITZ.gewitter,
    ...tiered(BLITZ.gewitter, (r) => `Jede volle Leiste gibt dauerhaft +${pctS(r.critPerBar)} % Crit-Chance${r.multPerBar ? ` und +${de(r.multPerBar)}× Crit-Multiplikator` : ""}.`) },
  SK_LIGHTNING_10: { id: "SK_LIGHTNING_10", name: "Entladung", archetype: "lightning", keywords: ["charge", "crit"], tiers: BLITZ.entladung,
    ...tiered(BLITZ.entladung, (r) => `Jede volle Leiste gibt dauerhaft +${de(r.scorePerBar)} Basis-Score je Sieg.${r.critDouble ? " Bei einem Crit zählt die Rampe doppelt." : ""}`) },
  // Serie und Crit
  SK_LIGHTNING_07: { id: "SK_LIGHTNING_07", name: "Ladungsserie", archetype: "lightning", keywords: ["charge", "streak"], tiers: BLITZ.serie,
    ...tiered(BLITZ.serie, (r) => `Ab Serie ${r.chargeFromStreak} gibt jeder Sieg +1 Ladung.`) },
  SK_LIGHTNING_13: { id: "SK_LIGHTNING_13", name: "Spannungsstau", archetype: "lightning", keywords: ["crit"], tiers: BLITZ.stau,
    ...tiered(BLITZ.stau, (r) => `Jeder Sieg ohne Crit gibt +${de(r.step)}× Crit-Multiplikator für den nächsten Crit; ein Crit ${r.critKeep ? `behält ${pct(r.critKeep)} % des Staus` : "leert den Stau"}.`) },
  SK_LIGHTNING_12: { id: "SK_LIGHTNING_12", name: "Vorentladung", archetype: "lightning", keywords: ["crit", "streak"], tiers: BLITZ.vorentladung,
    ...tiered(BLITZ.vorentladung, (r) => `Ab Serie ${r.minStreak} gibt jeder Serienpunkt +${de(r.multPerStreak)}× Crit-Multiplikator auf diesen Stich.`) },
  // (§7.19: Überschlag SK_LIGHTNING_14 gestrichen — die Systemregel „Überschuss über 100 %" in groß, im gierigen Build −15 %.)
  // Breite und Tiefe — Stapel erzeugen und nutzen
  SK_LIGHTNING_03: { id: "SK_LIGHTNING_03", name: "Kettenblitz", archetype: "lightning", keywords: ["ionize"], tiers: BLITZ.kette,
    ...tiered(BLITZ.kette, (r) => `${jeder(r.barEvery, "Jede")} volle Leiste gibt deiner Karte mit den meisten Stapeln +${r.extra} Stapel.${r.second ? ` Die Karte mit den zweitmeisten Stapeln erhält +${r.second}.` : ""}`) },
  SK_LIGHTNING_15: { id: "SK_LIGHTNING_15", name: "Blitzschlag", archetype: "lightning", keywords: ["crit", "ionize"], tiers: BLITZ.blitzschlag,
    ...tiered(BLITZ.blitzschlag, (r) => `${jeder(r.critEvery)} Crit ionisiert die Siegkarte (+${r.stacks} Stapel).`) },
  SK_LIGHTNING_11: { id: "SK_LIGHTNING_11", name: "Blitzfänger", archetype: "lightning", keywords: ["ionize"], tiers: BLITZ.faenger,
    ...tiered(BLITZ.faenger, (r) => `Ionisierte Karten kämpfen mit +${r.value} Wert${r.perStack ? ` und +${r.perStack} je Stapel` : ""}.`) },
  SK_LIGHTNING_09: { id: "SK_LIGHTNING_09", name: "Kurzschluss", archetype: "lightning", keywords: ["ionize"], tiers: BLITZ.kurzschluss,
    ...tiered(BLITZ.kurzschluss, (r) => `Sieg mit einer Karte ab ${r.minStacks} Stapeln: ihre Stapel zählen ${r.factor === 2 ? "doppelt" : `×${r.factor}`}.${r.onLoss ? " Verlierst du mit so einer Karte, zahlt ihr doppelter Stapel-Score beim nächsten Sieg." : ""}`) },
  SK_LIGHTNING_04: { id: "SK_LIGHTNING_04", name: "Lichtbogen", archetype: "lightning", keywords: ["ionize", "crit"], tiers: BLITZ.lichtbogen, // §7.28: Ionisierung zu Crit-Chance
    ...tiered(BLITZ.lichtbogen, (r) => `Jeder Stapel auf der gespielten Karte gibt +${pctS(r.critPerStack)} % Crit-Chance auf diesen Stich.`) },
  // Schutz
  SK_LIGHTNING_17: { id: "SK_LIGHTNING_17", name: "Serienschutz", archetype: "lightning", keywords: ["charge", "streak"], tiers: BLITZ.serienschutz,
    ...tiered(BLITZ.serienschutz, (r) => `Verlierst du einen Stich, hält die Serie für ${r.cost} Ladung. ${malWort(r.perRound)} je Durchlauf.`) },
  // Legendäre (§3.7): keine Stufe, zwei Effekte erlaubt.
  // (§6.11, Owner: drei Legendäre je Fraktion, die stärksten — SK_LIGHTNING_L01 Donnergott ist gestrichen, gemessen
  //  als schwächstes der vier: +30 % gegen Resonanz +106 %, Doppelentladung +85 %, Hochspannung +40 %.)
  SK_LIGHTNING_L02: { id: "SK_LIGHTNING_L02", name: "Doppelentladung", archetype: "lightning", legendary: true, keywords: ["ionize", "crit"],
    desc: `Jede Ionisierung gibt ${C.DOPPELENTLADUNG_STACKS} Stapel statt 1. Crit mit einer ionisierten Karte: der Blitz schlägt zweimal ein, der Stich zählt doppelt.` },
  SK_LIGHTNING_L03: { id: "SK_LIGHTNING_L03", name: "Hochspannung", archetype: "lightning", legendary: true, keywords: ["crit"],
    desc: `Alle deine gehaltenen Skills wirken ${C.HOCHSPANNUNG_STEPS === 1 ? "eine Stufe" : `${de1(C.HOCHSPANNUNG_STEPS)} Stufen`} höher, in jeder Fraktion. Episch ist das Ende der Leiter.` },
  SK_LIGHTNING_L04: { id: "SK_LIGHTNING_L04", name: "Resonanz", archetype: "lightning", legendary: true, keywords: ["ionize", "formation"], // §7.25: ersetzt Durchschlag (Emblem bleibt)
    desc: `Ionisierte Karten in einer Formation teilen ihre Stapel: jede Karte kämpft mit ihren eigenen Stapeln plus ${de(C.RESONANZ_SHARE)}× den Stapeln der anderen Mitglieder ihrer Formation, abgerundet.` },

  // ---- Feuer (exp skill rework, §4): Passiv = Siege mit Abstand geben Hitze, Niederlagen kühlen, je 10 % Hitze +2 % Score.
  //      Die Mechanik liest die Stufentabellen oben (factions/fire.js). Texte: ein Satz je Stufe (`tiered`).
  // Formation und Wert — Hitze zu Score (§7.23: Feuerlinie ersetzt Glut auf demselben Platz, Emblem bleibt)
  SK_FIRE_01: { id: "SK_FIRE_01", name: "Feuerlinie", archetype: "fire", keywords: ["heat", "formation"], tiers: FEUER.feuerlinie,
    ...tiered(FEUER.feuerlinie, (r) => `Ein Sieg in einer Formation zählt +${pct(r.perPoint)} % Score je Punkt Kampfwert der Siegkarte und verbrennt ${r.cost} % Hitze.${r.perFormation ? " Der Bonus zählt je Formation an der Siegposition." : ""}`) },
  // Rate — Hitze erzeugen
  SK_FIRE_02: { id: "SK_FIRE_02", name: "Zunder", archetype: "fire", keywords: ["heat"], tiers: FEUER.zunder,
    ...tiered(FEUER.zunder, (r) => `Jeder Sieg gibt +${r.heat} % Hitze, auch ein knapper.${r.lossHeat ? ` Auch jede Niederlage gibt +${r.lossHeat} % Hitze.` : ""}`) },
  SK_FIRE_03: { id: "SK_FIRE_03", name: "Feuersturm", archetype: "fire", keywords: ["heat", "streak"], tiers: FEUER.feuersturm,
    ...tiered(FEUER.feuersturm, (r) => `${r.minHeat ? `Ab ${r.minHeat} % Hitze` : "Bei voller Hitzeleiste"} zählt jeder Serienpunkt +${de(Math.round(r.multPerStreak * 10000) / 100)} % Score.`) },
  SK_FIRE_05: { id: "SK_FIRE_05", name: "Rückzündung", archetype: "fire", keywords: ["streak"], tiers: FEUER.rueckzuendung, // §7.24: Takt statt Konter (§7.22)
    ...tiered(FEUER.rueckzuendung, (r) => `${jeder(r.every)} Sieg in Folge zündet: er zählt ×${de(r.mult)}.${r.value ? ` Die zündende Karte kämpft mit +${r.value} Wert.` : ""}`) },
  // Schutz
  SK_FIRE_04: { id: "SK_FIRE_04", name: "Glutbett", archetype: "fire", keywords: ["heat"], tiers: FEUER.glutbett,
    ...tiered(FEUER.glutbett, (r) => (r.noCool
      ? "Niederlagen kühlen die Hitze nicht."
      : `Niederlagen kühlen die Hitze nicht unter ${r.floor} %. Fängt der Boden eine Niederlage ab, steigt er um ${r.rise} %.`)) },
  // Zustand — Hitze zu Wert und Multiplikator
  SK_FIRE_06: { id: "SK_FIRE_06", name: "Glühende Klinge", archetype: "fire", keywords: ["heat"], tiers: FEUER.klinge,
    ...tiered(FEUER.klinge, (r) => `Alle deine Karten haben +${r.value} Wert je ${r.perHeat} % Hitze, bis ${C.HEAT_MAX} %.`) },
  SK_FIRE_07: { id: "SK_FIRE_07", name: "Weißglut", archetype: "fire", keywords: ["heat"], tiers: FEUER.weissglut,
    ...tiered(FEUER.weissglut, (r) => `Die Hitzeleiste reicht bis ${C.WEISSGLUT_HEAT_MAX} %. Über ${C.HEAT_MAX} % Hitze geben je 10 Prozentpunkte +${pct(r.multPer10)} % Score.`) },
  // Position — die Schneise durch das eigene Deck (§7.27: ersetzt Feuerwalze, deren Achse „Hitze zu Kampfwert" schon
  // der Klinge gehört; die Aufstellung entscheidet mit, welche Karte im nächsten Durchlauf auf der Schneise liegt)
  SK_FIRE_08: { id: "SK_FIRE_08", name: "Brandschneise", archetype: "fire", keywords: ["position", "wertvorsprung"], tiers: FEUER.schneise,
    ...tiered(FEUER.schneise, (r) => `Deine ${r.width} Siege mit dem größten Vorsprung eines Durchlaufs schlagen eine Schneise: im nächsten Durchlauf zählt ein Sieg auf diesen Positionen ×${de(r.mult)}.${r.hold ? ` Die Schneise hält ${r.hold} Durchläufe.` : ""}`) },
  SK_FIRE_09: { id: "SK_FIRE_09", name: "Verbrennung", archetype: "fire", keywords: ["heat"], tiers: FEUER.verbrennung,
    ...tiered(FEUER.verbrennung, (r) => `Ein Sieg mit Kampfwert-Vorsprung ab ${r.minMargin} zählt ×${de(r.mult)}.${r.heatToo ? ` Seine Hitze zählt ebenfalls ×${de(r.mult)}.` : ""}`) },
  // Konsument — Hitze zu Score (§7.16: der Überlauf-Wandler; Flächenbrand SK_FIRE_11 ist gestrichen, der Brand kostete
  // Klinge, Siegquote und Serie, keine Auszahlung glich das aus)
  SK_FIRE_12: { id: "SK_FIRE_12", name: "Schmelzpunkt", archetype: "fire", keywords: ["heat", "consume"], tiers: FEUER.schmelzpunkt,
    ...tiered(FEUER.schmelzpunkt, (r) => `Bei voller Hitzeleiste wird die Hitze, die ein Sieg nicht mehr auf die Leiste bringt, zu +${r.perPoint} Basis-Score je Punkt.${r.lossPays ? " Bei voller Leiste zahlt auch die Kühlung einer Niederlage, beim nächsten Sieg." : ""}`) },
  // Gegner — Brände
  SK_FIRE_13: { id: "SK_FIRE_13", name: "Brandmal", archetype: "fire", keywords: ["heat", "brand"], tiers: FEUER.brandmal,
    ...tiered(FEUER.brandmal, (r) => `Ab ${r.minHeat} % Hitze brandmarkt jeder Sieg die geschlagene Gegnerkarte: −${r.value} Wert im nächsten Durchlauf.${r.onLoss ? " Auch eine Niederlage brandmarkt die Gegnerkarte, die gewonnen hat." : ""}`) },
  SK_FIRE_14: { id: "SK_FIRE_14", name: "Lauffeuer", archetype: "fire", keywords: ["heat", "brand"], tiers: FEUER.lauffeuer,
    ...tiered(FEUER.lauffeuer, (r) => `Ab ${r.minHeat} % Hitze brandmarkt jeder Sieg ${r.reach === 1 ? "beide Nachbarn" : `die ${2 * r.reach} Nachbarn`} der geschlagenen Gegnerkarte: −${r.value} Wert im nächsten Durchlauf.`) },
  // Schmiede — Hitze zu Dauerwert (§7.14: ohne Preis, die Hitze ist nur die Schwelle), Wert zu Score
  SK_FIRE_15: { id: "SK_FIRE_15", name: "Schmiede", archetype: "fire", keywords: ["heat", "forge"], tiers: FEUER.schmiede,
    ...tiered(FEUER.schmiede, (r) => `Am Ende eines Durchlaufs ab ${r.minHeat} % Hitze: ${r.cards === 1 ? "deine niedrigste Karte erhält" : `deine ${r.cards} niedrigsten Karten erhalten`} dauerhaft +${C.FORGE_VALUE} Kartenwert.`) },
  SK_FIRE_16: { id: "SK_FIRE_16", name: "Glutstahl", archetype: "fire", keywords: ["heat", "forge"], tiers: FEUER.glutstahl,
    ...tiered(FEUER.glutstahl, (r) => `Ein Sieg zählt +${r.perPoint} Basis-Score je Punkt Kampfwert über dem Grundwert der Siegkarte.${r.forgedDouble ? " Schmiedewert zählt doppelt." : ""}`) },
  // Legendäre (§4.7): keine Stufe, zwei Effekte, jedes läuft allein.
  SK_FIRE_L01: { id: "SK_FIRE_L01", name: "Sonnenkern", archetype: "fire", legendary: true, keywords: ["heat", "brand"],
    desc: `Jeder Sieg brandmarkt die geschlagene Gegnerkarte (−${de(C.SONNENKERN_BRAND)} Wert), und Brände erneuern sich nicht mehr: sie stapeln sich über die Durchläufe. Sieg gegen eine gebrandmarkte Karte: +${C.SONNENKERN_SCORE_PER_BRAND} Basis-Score je Brandpunkt auf ihr.` },
  SK_FIRE_L02: { id: "SK_FIRE_L02", name: "Ewige Glut", archetype: "fire", legendary: true, keywords: ["heat"], // §7.21: ersetzt Phönixfeuer (Emblem bleibt)
    desc: `Jeder Durchlauf, der mit voller Hitzeleiste endet, hebt den Hitze-Multiplikator dauerhaft um +${pct(C.EWIGE_GLUT_MULT_PER_ROUND)} %. Die Hitze fällt nie unter ${pct(C.EWIGE_GLUT_FLOOR_FRAC)} % der höchsten je erreichten Hitze.` },
  SK_FIRE_L03: { id: "SK_FIRE_L03", name: "Sonnenzorn", archetype: "fire", legendary: true, keywords: ["heat"],
    desc: `Der Hitze-Multiplikator rechnet mit der höchsten je erreichten Hitze, nicht mit der aktuellen, und zwar bis ${C.WEISSGLUT_HEAT_MAX} %; je 10 Prozentpunkte Hitze +${pct(C.SONNENZORN_MULT_PER_10)} % Score statt +${pct(C.HEAT_MULT_PER_10)} %. Solange die Hitze unter der Spitze liegt, zählt die Hitze aus Siegen ×${de(C.SONNENZORN_HEAT_MULT)}.` },
  // (§6.11, Owner: drei Legendäre je Fraktion — SK_FIRE_L04 Damaststahl ist gestrichen; der Owner behält Sonnenzorn,
  //  die gemessene Reihung der vier war Sonnenkern +76 %, Damaststahl +8 %, Ewige Glut −8 %, Sonnenzorn −14 %.)

  // ---- Eis-Neudesign — „Gletscher, Brechen & Kaskade." (docs/eis-rework.md) Spine = MASSE auf dem Brettfeld (Firn-Boden),
  //      Gletscher halten & brechen gewaltig. Jeder Skill trägt ein `role: G_…` (Mechanik in glacier.js). Gate = archetype
  //      "ice" → activeArchetypes "ice" aktiviert den Gletscher-Block; PICK_SKILL seedet state.glacierRoles aus den `role`s.
  // Linie 1 — Firn (Masse-Motor)
  SK_ICE_01: { id: "SK_ICE_01", name: "Anfrieren", archetype: "ice", keywords: ["glacier"], role: "G_ANFRIEREN", tiers: EIS.anfrieren,
    ...tiered(EIS.anfrieren, (r) => `Ein Gletscher-Sieg gibt +${pct(r.pct)} % seiner Masse extra${r.form ? ", in einer Formation doppelt" : ""}.`) },
  SK_ICE_02: { id: "SK_ICE_02", name: "Schneetreiben", archetype: "ice", keywords: ["glacier", "freeze"], role: "G_SCHNEETREIBEN", tiers: EIS.schneetreiben,
    ...tiered(EIS.schneetreiben, (r) => `Gewinnt ein Gletscher, sät er +${de(r.seed)} Schnee in die Boden-Reserve ${r.fields === 1 ? "eines angrenzenden offenen Felds" : `von ${de1(r.fields)} angrenzenden offenen Feldern`}.`) },
  SK_ICE_03: { id: "SK_ICE_03", name: "Dauerfrost", archetype: "ice", keywords: ["glacier", "freeze"], role: "G_DAUERFROST", tiers: EIS.dauerfrost,
    ...tiered(EIS.dauerfrost, (r) => `Jeden Durchlauf sammeln ungefrorene Felder Schnee in ihrer Boden-Reserve: +${de(r.near)} bei bis zu 2 Feldern Abstand zum nächsten Gletscher, +${de(r.far)} ab 3.`) },
  SK_ICE_04: { id: "SK_ICE_04", name: "Verdichtung", archetype: "ice", keywords: ["glacier", "bauphase"], role: "G_VERDICHTUNG", tiers: EIS.verdichtung,
    ...tiered(EIS.verdichtung, (r) => `Ein Gletscher gewinnt +${de(r.per)} Masse je Punkt Kampfwert über seinem Grundwert. Der Wert wird ganz normal ausgespielt; Wert, der selbst aus Masse stammt, zählt nicht mit.`) },
  // Linie 2 — Eisschild (Cluster/Dichte). (§5.2: Verschmelzen SK_ICE_05 gestrichen — binär, im Spiel unsichtbar, und
  // dieselbe Achse wie Packeis/Verzahnung; in groß ist es das Legendäre Ewiges Schild.)
  SK_ICE_06: { id: "SK_ICE_06", name: "Packeis", archetype: "ice", keywords: ["glacier"], role: "G_PACKEIS", tiers: EIS.packeis,
    ...tiered(EIS.packeis, (r) => `Jeden Durchlauf gewinnt ein Gletscher +${de(r.per)} Masse je angrenzendem offenen Feld.`) },
  SK_ICE_07: { id: "SK_ICE_07", name: "Eisbrücke", archetype: "ice", keywords: ["glacier"], role: "G_EISBRUECKE", tiers: EIS.eisbruecke,
    ...tiered(EIS.eisbruecke, (r) => `Zählt auch die vier Diagonalen als angrenzend: zersplitterte Felder werden zu einem Cluster. Für Kaskade und Kollision zählt ein diagonaler Gletscher zu ${pct(r.weight)} %.`) },
  SK_ICE_08: { id: "SK_ICE_08", name: "Eiswall", archetype: "ice", keywords: ["glacier", "formation"], role: "G_EISWALL", tiers: EIS.eiswall,
    ...tiered(EIS.eiswall, (r) => `Steht ein Gletscher in einer geraden Kette aus mindestens ${G_EISWALL_MIN} Gletschern (Reihe oder Spalte), berstet er um +${pct(r.per)} % stärker je Gletscher der Kette über zwei. Eine volle Reihe gibt also +${pct(r.per * 3)} %.`) },
  SK_ICE_09: { id: "SK_ICE_09", name: "Verzahnung", archetype: "ice", keywords: ["glacier"], role: "G_VERZAHNUNG", tiers: EIS.verzahnung,
    ...tiered(EIS.verzahnung, (r) => `Jeden Durchlauf gewinnt jeder Gletscher +${de(r.per)} Masse je Gletscher im verbundenen Cluster.`) },
  // Linie 3 — Lawine (Brechen/Kaskade)
  SK_ICE_10: { id: "SK_ICE_10", name: "Abbruchkante", archetype: "ice", keywords: ["glacier"], role: "G_ABBRUCHKANTE", tiers: EIS.abbruchkante,
    ...tiered(EIS.abbruchkante, (r) => `Deine Gletscher bersten erst ab ${de(r.at)} Masse statt ab ${de(G_BURST_AT)}. Sie sammeln länger und treffen dafür eine höhere Schwelle.`) },
  SK_ICE_11: { id: "SK_ICE_11", name: "Eisbeben", archetype: "ice", keywords: ["glacier"], role: "G_EISBEBEN", tiers: EIS.eisbeben,
    ...tiered(EIS.eisbeben, (r) => `Bricht ein Gletscher über der Berst-Schwelle, bebt das Eis nach: je Punkt Masse darüber zählt der Bruch +${pct(r.per)} % zusätzlich.${r.sturz ? " Das Nachbeben zählt für den Gletschersturz als eigener Bruch." : ""}`) },
  // (§5.2: Zermalmen SK_ICE_12 gestrichen — dieselbe Achse wie die Kaskade, beide zahlen für Gletscher-Nachbarn.)
  SK_ICE_13: { id: "SK_ICE_13", name: "Gletscherzunge", archetype: "ice", keywords: ["glacier"], role: "G_GLETSCHERZUNGE", tiers: EIS.gletscherzunge,
    ...tiered(EIS.gletscherzunge, (r) => `Ein Gletscher kämpft mit +1 Wert je ${de(r.per)} Masse.${r.neighbors ? " Auch seine Nachbarkarten kämpfen mit der Hälfte dieses Bonus." : ""}`) },
  SK_ICE_14: { id: "SK_ICE_14", name: "Gletschersturz", archetype: "ice", keywords: ["glacier"], role: "G_GLETSCHERSTURZ", tiers: EIS.gletschersturz,
    ...tiered(EIS.gletschersturz, (r) => `Jeder Bruch wird +${pct(r.per)} % stärker je Gletscher, der im selben Durchlauf bricht.`) },
  // Linie 4 — Frostgriff (Kontrolle/Duo)
  SK_ICE_15: { id: "SK_ICE_15", name: "Einfrieren", archetype: "ice", keywords: ["glacier"], role: "G_EINFRIEREN", tiers: EIS.einfrieren,
    ...tiered(EIS.einfrieren, (r) => `Bricht ein Gletscher, verliert ${EINFRIEREN_ZIEL(r.cards)} den Stich im nächsten Durchlauf.`) },
  SK_ICE_16: { id: "SK_ICE_16", name: "Frostbund", archetype: "ice", keywords: ["glacier"], role: "G_FROSTBUND", tiers: EIS.frostbund,
    ...tiered(EIS.frostbund, (r) => `Bricht ein Gletscher, bekommen alle seine Nachbarn +${de(r.buff)} Stichwert im nächsten Durchlauf. Mit Eisbrücke gilt das für die acht Nachbarn.`) },
  SK_ICE_17: { id: "SK_ICE_17", name: "Sprödbruch", archetype: "ice", keywords: ["glacier", "crit"], role: "G_SPROEDBRUCH", tiers: EIS.sproedbruch,
    ...tiered(EIS.sproedbruch, (r) => `Ein Gletscher kämpft mit +${pctS(r.crit)} % Crit-Chance je Punkt Masse.${r.critMass ? ` Ein Crit mit einer Gletscherkarte gibt ihrem Gletscher +${de(r.critMass)} Masse.` : ""}`) },
  // Legendäre (je Linie eine Capstone)
  SK_ICE_L01: { id: "SK_ICE_L01", name: "Eiszeit", archetype: "ice", legendary: true, keywords: ["glacier", "freeze"], role: "G_L_EISZEIT",
    desc: `Jeden Durchlauf +${de(G_EISZEIT_FLOOD)} Schnee in die Boden-Reserve jedes ungefrorenen Felds. Jeder Gletscher birst mit +${de(G_EISZEIT_BURST * 100)} % Wucht je angrenzendem offenen Feld.` },
  SK_ICE_L02: { id: "SK_ICE_L02", name: "Ewiges Schild", archetype: "ice", legendary: true, keywords: ["glacier"], role: "G_L_SCHILD",
    desc: `Jeder Eis-Skill friert ${de(G_SCHILD_PER_PICK)} Felder ein statt einem, ohne Höchstzahl. Dein Feld zählt als ein Gletscher: jeden Durchlauf teilen sich alle dieselbe Masse. Beim Bersten zählt jeder wie ein voll umschlossener Gletscher und bekommt die stärkste Gletscher-Formation des Bretts.` },
  SK_ICE_L03: { id: "SK_ICE_L03", name: "Große Lawine", archetype: "ice", legendary: true, keywords: ["glacier"], role: "G_L_LAWINE",
    desc: `${jeder(G_LAWINE_EVERY, "Jeden")} Durchlauf brechen alle deine Gletscher, auch die nicht vollen. Jeder Bruch zählt mit der Wucht der höchsten Schwelle und ×${de(G_LAWINE_MULT)}.` },
  // (§5.2: Erstarrung SK_ICE_L04 gestrichen — die Kontrolle ist Einfrieren in groß, und der Score-Teil war ein nackter
  //  Faktor auf den Bruch. Drei Legendäre je Fraktion, §6.11.)

  // ---- Pflanze (exp skill rework, §6): Passiv = Wachstum je Karte (+1 je Sieg, +1 je Formation an der Siegposition),
  //      grün ab der Grün-Schwelle, blühend ab der Blüh-Schwelle; eine blühende Siegkarte zahlt Basis-Score je grüner
  //      Karte in ihren Formationen. Die Mechanik liest die Stufentabellen oben (factions/plant.js); die vier Hebel
  //      (Spalier, Wildwuchs, Lücke, Überwucherung) ändern die Erkennung in formations.js. Texte: ein Satz je Stufe.
  // Wachstum — schneller und breiter grün werden
  SK_PLANT_05: { id: "SK_PLANT_05", name: "Aussaat", archetype: "plant", keywords: ["growth", "green"], tiers: PFLANZE.aussaat,
    ...tiered(PFLANZE.aussaat, (r) => `Gewinnt eine grüne Karte, wachsen beide Nachbarn +${r.growth}.${r.second ? ` Auch die zweiten Nachbarn wachsen +${r.second}.` : ""}`) },
  SK_PLANT_09: { id: "SK_PLANT_09", name: "Ranken", archetype: "plant", keywords: ["growth", "green"], tiers: PFLANZE.ranken,
    ...tiered(PFLANZE.ranken, (r) => `Gewinnt eine grüne Karte, rankt sie in die geschlagene Gegnerkarte. Besiegst du eine berankte Gegnerkarte, erntest du sie: +${r.growth} Wachstum für deine Siegkarte.${r.neighbors ? " Beim Ernten ranken ihre Nachbarn mit." : ""}`) },
  SK_PLANT_07: { id: "SK_PLANT_07", name: "Setzlingsbeet", archetype: "plant", keywords: ["growth"], tiers: PFLANZE.setzlingsbeet,
    ...tiered(PFLANZE.setzlingsbeet, (r) => `Die Karten ${r.allSegments ? "jedes Segments" : "deines grünsten Segments"} wachsen am Ende eines Durchlaufs +${r.growth}.`) },
  SK_PLANT_12: { id: "SK_PLANT_12", name: "Lichtung", archetype: "plant", keywords: ["growth", "formation"], tiers: PFLANZE.lichtung,
    ...tiered(PFLANZE.lichtung, (r) => `Ein Sieg in einer Formation gibt +${r.extra} Wachstum zusätzlich${r.perFormation ? ", je Formation an der Siegposition" : ""}.`) },
  SK_PLANT_08: { id: "SK_PLANT_08", name: "Zäher Halm", archetype: "plant", keywords: ["growth"], tiers: PFLANZE.halm,
    ...tiered(PFLANZE.halm, (r) => `Verliert eine Karte, wächst sie +${r.growth}.${r.perFormation ? ` Zusätzlich +${C.PLANT_GROWTH_PER_FORMATION} je Formation an ihrer Position.` : ""}`) },
  // Hebel — sie ändern, was als Formation erkannt wird, und addieren keinen Score
  SK_PLANT_03: { id: "SK_PLANT_03", name: "Spalier", archetype: "plant", keywords: ["green", "formation"], tiers: PFLANZE.spalier,
    ...tiered(PFLANZE.spalier, (r) => `${r.borders === 1 ? "Die Segmentgrenze mit den meisten grünen Karten daneben ist offen" : r.borders >= 7 ? "Alle Segmentgrenzen mit grünen Karten daneben sind offen" : `Die ${r.borders} Segmentgrenzen mit den meisten grünen Karten daneben sind offen`}: Formationen laufen dort über das Segment hinaus.`) },
  SK_PLANT_06: { id: "SK_PLANT_06", name: "Wildwuchs", archetype: "plant", keywords: ["bloom", "formation"], tiers: PFLANZE.wildwuchs,
    ...tiered(PFLANZE.wildwuchs, (r) => `${r.jokers === 1 ? "Deine am weitesten gewachsene blühende Karte zählt" : Number.isFinite(r.jokers) ? `Deine ${r.jokers} am weitesten gewachsenen blühenden Karten zählen` : "Alle blühenden Karten zählen"} bei der Formationserkennung als Joker.`) },
  SK_PLANT_15: { id: "SK_PLANT_15", name: "Dickicht", archetype: "plant", keywords: ["green", "formation"], tiers: PFLANZE.dickicht,
    ...tiered(PFLANZE.dickicht, (r) => `Grüne Farbblöcke zählen bis ×${de(r.mult)}.`) },
  SK_PLANT_14: { id: "SK_PLANT_14", name: "Verwachsung", archetype: "plant", keywords: ["formation"], tiers: PFLANZE.verwachsung,
    ...tiered(PFLANZE.verwachsung, (r) => `Mehrere Formationen an deiner Siegposition: ihr Überlappungsbonus ist um ${de(r.bonus)} höher.`) },
  // Score aus grünen Formationen — je Formationstyp einer, dazu die Tiefe der einzelnen Karte
  SK_PLANT_13: { id: "SK_PLANT_13", name: "Blätterdach", archetype: "plant", keywords: ["green", "formation", "score"], tiers: PFLANZE.blaetterdach,
    ...tiered(PFLANZE.blaetterdach, (r) => `Ein Sieg in einem grünen Farbblock gibt +${r.score} Basis-Score je grüner Karte darin.`) },
  SK_PLANT_16: { id: "SK_PLANT_16", name: "Rankgerüst", archetype: "plant", keywords: ["green", "formation", "score"], tiers: PFLANZE.rankgeruest,
    ...tiered(PFLANZE.rankgeruest, (r) => `Ein Sieg in einer grünen Treppe gibt +${r.score} Basis-Score je grüner Karte darin.`) },
  SK_PLANT_10: { id: "SK_PLANT_10", name: "Hecke", archetype: "plant", keywords: ["green", "formation", "score"], tiers: PFLANZE.hecke,
    ...tiered(PFLANZE.hecke, (r) => `Ein Sieg in einer grünen Wiederholung gibt +${r.score} Basis-Score je grüner Karte darin.`) },
  SK_PLANT_11: { id: "SK_PLANT_11", name: "Windung", archetype: "plant", keywords: ["green", "formation", "score"], tiers: PFLANZE.windung,
    ...tiered(PFLANZE.windung, (r) => `Ein Sieg in einem grünen Wechsel gibt +${r.score} Basis-Score je grüner Karte darin.`) },
  SK_PLANT_04: { id: "SK_PLANT_04", name: "Jahresringe", archetype: "plant", keywords: ["growth", "score"], tiers: PFLANZE.jahresringe,
    ...tiered(PFLANZE.jahresringe, (r) => `Ein Sieg gibt +${r.score} Basis-Score je ${r.per} Wachstum der Siegkarte.${r.overDouble ? ` Wachstum über ${C.PLANT_BLOOM_THRESHOLD} zählt doppelt.` : ""}`) },
  // Kombination — Score und Wachstum in einem
  SK_PLANT_17: { id: "SK_PLANT_17", name: "Blütenlese", archetype: "plant", keywords: ["green", "formation", "growth"], tiers: PFLANZE.bluetenlese,
    ...tiered(PFLANZE.bluetenlese, (r) => `Ein Sieg in einer rein grünen Formation gibt +${r.score} Basis-Score und lässt alle Karten darin +${r.growth} wachsen.`) },
  // Legendäre (§6.11, Owner: drei je Fraktion, die stärksten): keine Stufe, kein Direkt-Score. Drei Achsen —
  // Wurzelgeflecht die Dichte, Baumreihe der Multiplikator, Ewiger Frühling das Zielbild.
  SK_PLANT_L02: { id: "SK_PLANT_L02", name: "Wurzelgeflecht", archetype: "plant", legendary: true, keywords: ["bloom", "formation"],
    desc: `Jede blühende Karte zählt in jeder Formation ihres Segments mit.${C.WURZELGEFLECHT_FACTOR_SCALE < 1 ? ` Sie selbst bekommt ${pct(C.WURZELGEFLECHT_FACTOR_SCALE)} % des Formations-Bonus.` : ""}` },
  SK_PLANT_L03: { id: "SK_PLANT_L03", name: "Baumreihe", archetype: "plant", legendary: true, keywords: ["bloom", "formation"],
    desc: `Blühende Karten bilden eine positionsfreie Wiederholung, egal wo sie liegen; sie zahlt ${pct(C.BAUMREIHE_FACTOR_SCALE)} % des Wiederholungs-Bonus und zählt als Formation. Basis-Score je Karte gibt sie nicht. Jede darf zugleich in einer anderen Formation zählen.` },
  SK_PLANT_L04: { id: "SK_PLANT_L04", name: "Ewiger Frühling", archetype: "plant", legendary: true, keywords: ["green", "bloom"],
    desc: `Blühende Karten kämpfen mit +${C.EWIGER_FRUEHLING_BLOOM_VALUE} Wert, und ein Sieg mit einer blühenden Karte zählt +${pct(C.EWIGER_FRUEHLING_FORM_MULT)} % je Formation an ihrer Position. Ist das Feld vollständig grün, sind alle deine Karten blühend.` },

};

export const SKILL_LIST = Object.values(SKILL_DEFS);
export const archetypeOf = (id) => SKILL_DEFS[id]?.archetype || null;
// Eis-Neudesign: aktive Gletscher-Rollen (glacier.js ROLES) aus den gehaltenen Skill-`role`-Feldern.
export const glacierRolesOf = (skills = []) => (skills || []).map((id) => SKILL_DEFS[id]?.role).filter(Boolean);

/* Skill-Archetypen (#93). Metadaten (Theming/Label) — geteilte Quelle für SkillSelect & HUD.
   Alle drei Archetypen (Blitz/Feuer/Eis) sind vollständig ausgespielt (F0/F1/F3 abgeschlossen). */
// #308: kein Emoji mehr hier — das Fraktions-Icon kommt zentral aus src/ui/FactionIcon.jsx (gekeyt über `key`).
export const ARCHETYPE_META = {
  lightning: { key: "lightning", label: "Blitz",  color: "#8a7de0" }, // violett/elektrisch
  fire:      { key: "fire",      label: "Feuer",  color: "#e0714a" }, // warm/orange-rot
  ice:       { key: "ice",       label: "Eis",    color: "#5ec8f0" }, // eis-blau
  plant:     { key: "plant",     label: "Pflanze", color: "#5ab87a" }, // grün/wachsend (v0)
};
export const ARCHETYPE_ORDER = ["lightning", "fire", "ice", "plant"];

// Archetyp-Kodierung EINES Eintrags pro gehaltenem Skill ("fire,fire,ice", Reihenfolge egal) →
// bekannte Keys MIT Wiederholung (ein Icon je Skill, #139) in fester Anzeige-Reihenfolge
// Blitz→Feuer→Eis. So ergeben 4 Feuer-Skills 4× 🔥, 2 Feuer + 2 Eis → 🔥🔥❄️❄️.
// Leerer/unbekannter Input → []. Rein & testbar; die UI mappt die Keys über ARCHETYPE_META auf Icons.
export function decodeArchetypes(value) {
  if (!value) return [];
  const counts = {};
  for (const tok of String(value).split(",")) {
    if (ARCHETYPE_ORDER.includes(tok)) counts[tok] = (counts[tok] || 0) + 1;
  }
  return ARCHETYPE_ORDER.flatMap((a) => Array(counts[a] || 0).fill(a));
}

// Archetypen, die aktuell noch anbietbare (nicht gehaltene) Skills haben.
export function archetypesWithSkills(owned = []) {
  const have = new Set();
  for (const s of SKILL_LIST) if (!(owned || []).includes(s.id)) have.add(s.archetype);
  return ARCHETYPE_ORDER.filter((a) => have.has(a));
}

/* Aus welchen Archetypen wird das nächste Skill-Angebot gezogen (max C.MAX_ARCHETYPES = 4)? Rein & testbar.
   - 0 aktiv → bis zu 4 zufällige verfügbare Archetypen (Erstangebot).
   - 1–3 aktiv → die aktiven + zufällige noch nicht aktive, bis max. C.MAX_ARCHETYPES.
   - 4 aktiv → nur die vier aktiven.
   exp: `max` overrides the constant for one run (rules.js); the default keeps every existing caller byte-identical. */
export function offerArchetypes(activeArchetypes = [], available = [], rng = Math.random, max = C.MAX_ARCHETYPES) {
  const active = (activeArchetypes || []).filter((a) => available.includes(a));
  if (active.length >= max) return active.slice(0, max);
  const picks = [...active];
  const pool = shuffle(available.filter((a) => !active.includes(a)), rng);
  while (picks.length < max && pool.length) picks.push(pool.shift());
  return picks;
}

// Summe eines Skill-Hooks über die gehaltenen Skills (gleiche Shape wie Perk-Hooks).
export function skillSum(skills, name, ctx) {
  let t = 0;
  for (const id of skills || []) { const f = SKILL_DEFS[id]?.[name]; if (f) t += f(ctx); }
  return t;
}

// (exp skill rework: der Blitz-Substate und die Blitz-Mechanik leben in src/game/factions/lightning.js.)

// Anzahl gehaltener Blitz-Skills — das Blitz-Passiv gibt je Skill Crit-Chance (factions/lightning.js).
export const activeLightningCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.archetype === "lightning").length;

// (exp skill rework: der Hitze-Substate und die Feuer-Mechanik leben in src/game/factions/fire.js — Passiv, 15 Skills
//  und 4 Legendäre lesen dort die Stufentabellen FEUER_TIERS.)

// (exp skill rework §6: der Pflanze-Zustand — Wachstum je Karte, die drei Zustände und die Mechanik der 15 Skills und
//  4 Legendären — lebt in src/game/factions/plant.js und liest dort die Stufentabellen PFLANZE_TIERS. Grün und blühend
//  sind in der Karte gebacken (card.green / card.bloom), damit Formations-Engine und Anzeige dieselbe Quelle lesen.)


// (exp skill rework: die Konsument-Garantie des Angebots ist mit der Verbraucher-Regel entfallen — Blitz und Feuer
//  tragen ihren Payoff im Passiv, ein Angebotsplatz wird nicht mehr erzwungen.)

// Angebot (#93 F0): bis zu `count` noch nicht gehaltene Skills, nach Archetyp gruppiert (3+3+3+3),
// aus max C.MAX_ARCHETYPES Archetypen (offerArchetypes). Deterministisch über den injizierten rng.
// Leerer Pool → [] (Reducer/Engine fällt auf Perk-Angebot zurück). F0: nur Blitz → 4 Blitz-Skills.
// #217 Meistergrade: ob eine Skill-id ein Legendär ist (Garantie-Erkennung bei Grad V). Rein & node-testbar.
export const isLegendarySkill = (id) => !!SKILL_DEFS[id]?.legendary;

// Immer HÖCHSTENS 3 Skills je Archetyp anbieten (das ganze Spiel, inkl. Onboarding). Bei wenigen freigeschalteten
// Archetypen (Onboarding) ergäbe count/chosen.length sonst 6 pro Archetyp — daher hart auf PER_ARCH_CAP gedeckelt.
// exp: exported as the default of buildSkillOffer's `perArchCap`; a Dev-Run passes its own (rules.js).
export const SKILL_OFFER_PER_ARCH_CAP = 3;

// unlockedArchetypes (Progression §4): Allowlist der im Lauf anbietbaren Archetypen (Onboarding-Gatung).
// null/undefined = keine Gatung (Sim/Standard/Meister → alle 4, byte-identisch).
// exp: maxArchetypes/perArchCap = per-run rules; the defaults are the constants → existing callers byte-identical.
// exp skill rework: the 5th/6th parameters (legendary chance / guarantee) are kept in the signature for the existing
// call sites and tests but are inert — legendaries never come out of this builder. They are the fifth rarity of
// rollSkillOfferTiers() below.
// Offerable skills of one faction: not held, not legendary (fifth rarity of the roll), and an enabler-gated
// booster only with its base held (Anti-Pech: an ungated booster is a dead pick). Shared by both builders.
const offerPool = (arch, owned) => SKILL_LIST.filter((s) => s.archetype === arch && !(owned || []).includes(s.id)
  && !s.legendary && (!s.enabler || (owned || []).includes(s.enabler))).map((s) => s.id);

// Flat offer: up to `perArchCap` skills per archetype, `count` in total. The game itself draws the door offer
// (buildSkillDoors below); this builder stays for the sim's flat measurements and the tests of the pool rules.
export function buildSkillOffer(owned, activeArchetypes, rng, count, _legendaryChance = 0, _guaranteeOne = false, unlockedArchetypes = null, maxArchetypes = C.MAX_ARCHETYPES, perArchCap = SKILL_OFFER_PER_ARCH_CAP) {
  let available = archetypesWithSkills(owned);
  if (unlockedArchetypes) available = available.filter((a) => unlockedArchetypes.includes(a));
  const chosen = offerArchetypes(activeArchetypes || [], available, rng, maxArchetypes);
  if (!chosen.length) return [];
  const PER_ARCH_CAP = perArchCap; // s. SKILL_OFFER_PER_ARCH_CAP oben — Deckel je Archetyp (Bestand 3, Dev-Run frei)
  const perArch = Math.max(1, Math.min(PER_ARCH_CAP, Math.floor(count / chosen.length)));
  const offer = [];
  const rest = [];
  for (const arch of chosen) {
    const pool = shuffle(offerPool(arch, owned), rng);
    // (v0.5: keine Pflanze-Kern-Garantie mehr — die Wert-aus-Wachstum-Mechanik ist jetzt die immer-aktive Mono-Passive.)
    for (let i = 0; i < perArch && pool.length; i++) offer.push(pool.shift());
    rest.push(...pool); // Reste des Archetyps für die Auffüllung
  }
  // Auffüllen bis count aus den Resten — aber NIE über PER_ARCH_CAP je Archetyp (bei wenigen Archetypen bleibt das
  // Angebot entsprechend kürzer: 3 je gezeigtem Archetyp). Sonst kämen im Onboarding wieder 6 desselben Archetyps.
  const fill = shuffle(rest, rng);
  const archCount = {};
  for (const id of offer) archCount[archetypeOf(id)] = (archCount[archetypeOf(id)] || 0) + 1;
  while (offer.length < count && fill.length) {
    const id = fill.shift();
    const a = archetypeOf(id);
    if ((archCount[a] || 0) >= PER_ARCH_CAP) continue;
    archCount[a] = (archCount[a] || 0) + 1;
    offer.push(id);
  }
  return offer;
}

/* exp skill rework (docs/skill-rework.md §1, §3.7): rarity tiers.
   Every held or offered non-legendary skill carries a tier 0..3 = Normal / Selten / Sehr selten / Episch; the
   tier picks the row of the skill's tier table (Phase 2/3). Legendaries have no tier. */
export const SKILL_TIER_COUNT = 4;
export const TIER_NORMAL = 0, TIER_RARE = 1, TIER_VERY_RARE = 2, TIER_EPIC = 3;
// Tier of a held skill: state.skillTiers[id], Normal when unknown (older snapshots), null for legendaries.
export const tierOf = (state, id) => (isLegendarySkill(id) ? null : ((state && state.skillTiers && state.skillTiers[id]) ?? TIER_NORMAL));

/* Hochspannung (§7.39, Owner): das Legendäre hebt die wirksame Stufe JEDES gehaltenen Skills, nicht mehr nur der
   Blitz-Skills — und nur noch um eine Stufe. Vorher lag der Hebel in lightning.js und war mit +3 Stufen für Blitz
   allein gebaut; §7.38 hat gemessen, dass ihn keine Zahl ins Band bringt (1 → +8 %, 2 → +428 %, 3 → +520 %), weil
   eine vierstufige Leiter bei +2 für fast jeden Wurf schon sättigt. Aus dem Mono-Verstärker wird damit ein
   Misch-Legendäres. Hier statt in einem Fraktionsmodul, weil alle vier ihn lesen — ein Import auf lightning.js
   aus den anderen drei wäre ein Zyklus. */
export const HOCHSPANNUNG_ID = "SK_LIGHTNING_L03";
export const boostedTier = (skills, base) =>
  Math.min(TIER_EPIC, Math.max(0, base) + ((skills || []).includes(HOCHSPANNUNG_ID) ? C.HOCHSPANNUNG_STEPS : 0));

// One weighted draw over SKILL_TIER_WEIGHTS → tier index. Exactly one rng() call.
export function rollTier(rng, weights = C.SKILL_TIER_WEIGHTS) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) { if (r < weights[i]) return i; r -= weights[i]; }
  return weights.length - 1;
}

/* Roll the tiers of an offer. Per slot, in offer order: first the legendary chance — a hit replaces the slot with an
   unowned legendary of the same faction that is not already in the offer (fifth rarity; no gate, no replacing of held
   skills, two in one run are possible) — then a weighted tier for every slot that stayed a normal skill. Deterministic
   for a given rng; exactly two draws per slot at most. Returns { offer, tiers } with tiers = { [id]: 0..3 } for the
   normal skills only. */
export function rollSkillOfferTiers(offer, owned = [], rng = Math.random, legendaryChance = C.SKILL_LEGENDARY_PER_SLOT, weights = C.SKILL_TIER_WEIGHTS,
                                    { forceLegendary = 0, excludeLegendary = [] } = {}) {
  const out = [...(offer || [])];
  const tiers = {};
  const taken = new Set([...(owned || []), ...out, ...(excludeLegendary || [])]);
  /* Legendär-Neuwurf (docs/muenz-oekonomie.md §3.1): so viele Plätze tragen GARANTIERT ein Legendäres, und
     `excludeLegendary` hält die gerade angezeigten heraus — man kauft einen anderen Wurf, nicht denselben.
     Der Platz wird gezogen statt von vorn genommen, sonst säße das Legendäre immer links. Hat die Fraktion
     eines Platzes keins mehr frei, geht es zum nächsten; bleibt gar keins übrig, kommt das Angebot ohne
     Legendäres zurück und der Aufrufer kassiert nicht (Reducer REROLL_SKILL).
     forceLegendary = 0 (Default) verbraucht KEINEN rng-Zug → alle Bestandspfade bleiben byte-identisch. */
  let need = Math.max(0, forceLegendary || 0);
  if (need > 0) {
    const order = out.map((_, i) => i).filter((i) => !isLegendarySkill(out[i]));
    for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
    for (const i of order) {
      if (!need) break;
      const pool = SKILL_LIST.filter((s) => s.legendary && s.archetype === archetypeOf(out[i]) && !taken.has(s.id)).map((s) => s.id);
      if (!pool.length) continue;
      const leg = pool[Math.floor(rng() * pool.length)];
      taken.add(leg); out[i] = leg; need -= 1;
    }
  }
  for (let i = 0; i < out.length; i++) {
    const id = out[i];
    if (isLegendarySkill(id)) continue; // already a legendary (dev catalog) — nothing to roll
    if (legendaryChance > 0 && rng() < legendaryChance) {
      const arch = archetypeOf(id);
      const pool = SKILL_LIST.filter((s) => s.legendary && s.archetype === arch && !taken.has(s.id)).map((s) => s.id);
      if (pool.length) {
        const leg = pool[Math.floor(rng() * pool.length)];
        taken.add(leg);
        out[i] = leg;
        continue;
      }
    }
    tiers[id] = rollTier(rng, weights);
  }
  return { offer: out, tiers };
}

/* The door offer (docs/skill-rework.md §1). A skill phase shows `doors` doors; every door hides `size` skills drawn
   from at most `factions` factions of the pool, repetition allowed — a door may read Feuer·Feuer·Blitz or
   Feuer·Feuer·Feuer. The door shows only the faction symbols (`door.skills.map(archetypeOf)` in slot order); the
   tiers are rolled with the door (rollSkillOfferTiers, legendary chance included) and revealed when it is opened
   (reducer CHOOSE_DOOR). Skills are distinct within a door and across the doors as long as the pool allows.
   Pool = the run's allowlist (unlockedArchetypes: the sim's `--arch`, START_RUN action.archetypes) or, without one,
   C.SKILL_OFFER_ARCHETYPES — the exp world of Feuer and Blitz while Eis and Pflanze wait for their rework; narrowed
   to factions that still have an offerable skill, and once `maxArchetypes` factions are active, to those. Two rng
   streams like the flat offer: `rng` draws factions and skills, `rngTiers` the tiers. Deterministic. Nothing left →
   [] (perk fallback). Returns [{ skills: [id…], tiers: { [id]: 0..3 } }, …] — doors without a skill are dropped. */
export function buildSkillDoors(owned, activeArchetypes, rng, rngTiers, { unlockedArchetypes = null, maxArchetypes = C.MAX_ARCHETYPES,
  doors = C.SKILL_DOORS, size = C.SKILL_DOOR_SIZE, factions = C.SKILL_DOOR_FACTIONS, pool = C.SKILL_OFFER_ARCHETYPES,
  legendaryChance = C.SKILL_LEGENDARY_PER_SLOT } = {}) {
  const have = owned || [];
  const active = activeArchetypes || [];
  const world = unlockedArchetypes || pool;
  let available = archetypesWithSkills(have).filter((a) => world.includes(a));
  if (active.length >= maxArchetypes) available = available.filter((a) => active.includes(a));
  const pools = {};
  for (const a of available) pools[a] = shuffle(offerPool(a, have), rng);
  const out = [];
  const taken = new Set(have);
  for (let d = 0; d < doors; d++) {
    const skills = [];
    for (let i = 0; i < size; i++) {
      // Factions with a skill left; once `factions` distinct ones stand on the door, only those.
      let cands = available.filter((a) => pools[a].length);
      const onDoor = [...new Set(skills.map(archetypeOf))];
      if (onDoor.length >= factions) cands = cands.filter((a) => onDoor.includes(a));
      if (!cands.length) break;
      const id = pools[cands[Math.floor(rng() * cands.length)]].shift();
      skills.push(id); taken.add(id);
    }
    if (!skills.length) continue;
    const rolled = rollSkillOfferTiers(skills, [...taken], rngTiers, legendaryChance); // taken keeps a legendary off both doors
    for (const id of rolled.offer) taken.add(id);
    out.push({ skills: rolled.offer, tiers: rolled.tiers });
  }
  return out;
}

/* Reroll of an opened door (owner, 2026-09-05): the three skills are drawn again for the SAME faction symbols — the door's
   promise stays, the skills behind it change. Per slot an unowned skill of that slot's faction, preferring skills not in
   the current offer (those come back only when the faction has nothing else left); tiers and the legendary chance are
   rolled again. A slot whose faction is exhausted is dropped; nothing left → { offer: [], tiers: {} } (reducer no-op). */
export function rerollDoorSkills(archs, owned, current, rng, rngTiers, { legendaryChance = C.SKILL_LEGENDARY_PER_SLOT, forceLegendary = 0 } = {}) {
  const have = owned || [];
  const cur = current || [];
  const pools = {};
  const skills = [];
  for (const a of archs || []) {
    if (!pools[a]) {
      const all = offerPool(a, have);
      pools[a] = [...shuffle(all.filter((id) => !cur.includes(id)), rng), ...shuffle(all.filter((id) => cur.includes(id)), rng)];
    }
    const id = pools[a].shift();
    if (id) skills.push(id);
  }
  if (!skills.length) return { offer: [], tiers: {} };
  // §3.1: der gekaufte Legendär-Neuwurf garantiert wieder ein Legendäres und schließt die des AKTUELLEN
  // Angebots aus. Nur gegen das aktuelle — die Kette hat kein Gedächtnis, beim zweiten Kauf darf das aus
  // dem ersten wiederkommen.
  return rollSkillOfferTiers(skills, have, rngTiers, legendaryChance, C.SKILL_TIER_WEIGHTS,
    { forceLegendary, excludeLegendary: forceLegendary ? cur.filter(isLegendarySkill) : [] });
}

/* (exp skill rework: Ionisierung, Ladung, Stapel-Score und alle Blitz-Prädikate liegen in
   src/game/factions/lightning.js — Passiv und 15 Skills lesen dort ihre Stufentabellen.) */
