import * as C from "./constants.js";
import { shuffle } from "./deck.js";
// Eis-Neudesign: Gletscher-Tuning-Zahlen (Single Source glacier.js, Sim-tunebar) für driftfreie Eis-Skill-Descs.
import { ANFRIEREN_WIN as G_ANFRIEREN_WIN, ANFRIEREN_FORM as G_ANFRIEREN_FORM, SCHNEETREIBEN_SEED as G_SCHNEETREIBEN_SEED,
  DAUERFROST_NEAR as G_DAUERFROST_NEAR, DAUERFROST_FAR as G_DAUERFROST_FAR, VERDICHTUNG_RATE as G_VERDICHTUNG_RATE,
  PACKEIS_PER_NEIGHBOR as G_PACKEIS_PER, VERZAHNUNG_PER as G_VERZAHNUNG_PER, GEO_LINIE as G_GEO_LINIE, EISWALL_LINIE as G_EISWALL_LINIE,
  TIER_MULT as G_TIER_MULT, ABBRUCHKANTE_TIER_MULT as G_ABBRUCH_TIER, ZERMALMEN_KOLLISION as G_ZERMALMEN_KOLL, KOLLISION_MULT as G_KOLLISION,
  RISSBILDUNG_BURST as G_RISSBILDUNG_BURST, THRESHOLDS as G_THRESHOLDS, GLETSCHERSTURZ_PER as G_GLETSCHERSTURZ_PER,
  FROSTBUND_BUFF as G_FROSTBUND_BUFF, EISPANZER_MASS as G_EISPANZER_MASS, EISZEIT_FLOOD as G_EISZEIT_FLOOD,
  EISZEIT_MAX_GLACIERS as G_EISZEIT_MAX, SCHILD_BONUS as G_SCHILD_BONUS, ERSTARRUNG_FRAC as G_ERSTARRUNG_FRAC } from "./glacier.js";

// Deutsche Zahlformatierung (1.08 → „1,08") — driftgefährdete Beschreibungszahlen aus den Konstanten interpolieren.
const de = (x) => String(x).replace(".", ",");
const pct = (x) => Math.round(x * 100);                                 // Anteil → Prozent (0,25 → 25)
const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");     // Tausendertrenner (2000 → „2.000")

// Die Trimm-Klausel steht wortgleich an SECHS Pflanze-Skills — hier EINMAL gebaut (§4 „Einen Text an EINER
// Stelle bauen"). `enSkills.js` hält seit jeher dasselbe als `PRUNE`; die deutsche Seite zog nach.
// Sie hängt an einem eigenen `\n`: „Trimmen" ist ein Glossarbegriff und wird von <GlossaryText> ohnehin
// fett gesetzt — auf eigener Zeile sieht man das auch.
const TRIMMEN = `Trimmen: beim Ersetzen des Skills dauerhaft +${pct(C.TRIM_STEP)} % Wurzel-/Blüten-Score (bis +${pct(C.TRIM_CAP)} %).`;

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
  ableiter:      [{ critEvery: 2, back: 0 }, { critEvery: 1, back: 0 }, { critEvery: 1, back: 1 }, { critEvery: 1, back: 2, overflow: true }],
  statik:        [{ winEvery: 2, charge: 1, lossEvery: 0 }, { winEvery: 1, charge: 1, lossEvery: 0 }, { winEvery: 1, charge: 1, lossEvery: 2 }, { winEvery: 1, charge: 2, lossEvery: 2, targetValue: 1 }],
  reststrom:     [{ floor: 2 }, { floor: 3 }, { floor: 4 }, { floor: 6 }],
  gewitter:      [{ critPerBar: 0.005 }, { critPerBar: 0.0075 }, { critPerBar: 0.01 }, { critPerBar: 0.015 }],
  entladung:     [{ multPerBar: 0.02 }, { multPerBar: 0.03 }, { multPerBar: 0.04 }, { multPerBar: 0.06, fillDouble: true }],
  serie:         [{ critPerStreak: 0.01 }, { critPerStreak: 0.015 }, { critPerStreak: 0.02 }, { critPerStreak: 0.025, chargeFromStreak: 8 }],
  kette:         [{ barEvery: 2, cards: 1 }, { barEvery: 1, cards: 1 }, { barEvery: 1, cards: 2 }, { barEvery: 1, cards: 3, targetExtra: 1 }],
  faenger:       [{ minStacks: 6, value: 2 }, { minStacks: 5, value: 2 }, { minStacks: 4, value: 2 }, { minStacks: 3, value: 2 }],
  kurzschluss:   [{ minStacks: 6, factor: 2 }, { minStacks: 5, factor: 2 }, { minStacks: 4, factor: 2 }, { minStacks: 3, factor: 2 }],
  stau:          [{ step: 0.03, critKeep: 0 }, { step: 0.04, critKeep: 0 }, { step: 0.05, critKeep: 0 }, { step: 0.06, critKeep: 0.5 }],
  ueberschlag:   [{ multPer10: 0.02 }, { multPer10: 0.03 }, { multPer10: 0.04 }, { multPer10: 0.06 }],
  ueberspannung: [{ minStacks: 6, charge: 2 }, { minStacks: 5, charge: 2 }, { minStacks: 4, charge: 2 }, { minStacks: 3, charge: 2 }],
  blitzschlag:   [{ critEvery: 5 }, { critEvery: 4 }, { critEvery: 3 }, { critEvery: 2 }],
  dauerstrom:    [{ minStreak: 5 }, { minStreak: 4 }, { minStreak: 3 }, { minStreak: 2 }],
  serienschutz:  [{ frac: 0.7 }, { frac: 0.5 }, { frac: 0.4 }, { frac: 0.3, freePerRound: 1 }],
};
export const BLITZ_TIERS = BLITZ;
const pctS = (x) => de(Math.round(x * 1000) / 10); // Anteil → Prozent mit einer Nachkommastelle (0,0075 → „0,75")
/* Ein Text je Stufe (docs/skill-rework.md §1): `f(row)` schreibt den Satz für EINE Stufenzeile — Angebot und Bestand
   zeigen nur den Text der gezeigten Stufe (labels.js skillDef(id, tier)), nie die ganze Leiter. `desc` bleibt der
   Normal-Text (Dev-Katalog, Datenbank, ältere Leser); `descTiers` trägt alle vier. Ein Episch-Extra hängt an seiner
   Tabellenzeile (z. B. `overflow`, `chargeFromStreak`) und erscheint nur dort. */
const tiered = (rows, f) => { const descTiers = rows.map((r) => f(r)); return { desc: descTiers[0], descTiers }; };
const jeder = (n, w = "Jeder") => (n === 1 ? w : `${w} ${n}.`); // „Jeder 2. Crit" / „Jeder Crit"
// Stufentabellen der 15 Feuer-Skills (§4.5) — dieselbe Form; die Schwellen sinken, die Sätze steigen mit der Stufe.
// Das Modul factions/fire.js liest sie über `fireParam`; Legendäre haben keine Zeile.
const FEUER = {
  glut:          [{ below: 40, mult: 2 }, { below: 50, mult: 2 }, { below: 60, mult: 2 }, { below: 80, mult: 2 }], // §7.12: Kaltstart — unter der Schwelle zählt Hitze aus Siegen doppelt
  zunder:        [{ heat: 1 }, { heat: 2 }, { heat: 3 }, { heat: 4 }],
  feuersturm:    [{ perStreak: 0.5 }, { perStreak: 1 }, { perStreak: 1.5 }, { perStreak: 2 }],
  glutbett:      [{ floor: 40 }, { floor: 60 }, { floor: 80 }, { noCool: true }],
  rueckzuendung: [{ perDeficit: 0.5 }, { perDeficit: 1 }, { perDeficit: 1.5 }, { perDeficit: 2, value: 2 }],
  klinge:        [{ perHeat: 40, value: 1 }, { perHeat: 30, value: 1 }, { perHeat: 25, value: 1 }, { perHeat: 20, value: 1 }],
  weissglut:     [{ multPer10: 0.03 }, { multPer10: 0.04 }, { multPer10: 0.05 }, { multPer10: 0.06 }],
  feuerwalze:    [{ minHeat: 80, value: 2 }, { minHeat: 60, value: 2 }, { minHeat: 40, value: 2 }, { minHeat: 20, value: 2, afterLoss: true }],
  verbrennung:   [{ minMargin: 8, mult: 1.5 }, { minMargin: 7, mult: 1.5 }, { minMargin: 6, mult: 1.5 }, { minMargin: 5, mult: 1.5 }],
  flaechenbrand: [{ minHeat: 80, keep: 40, perPoint: 15 }, { minHeat: 80, keep: 40, perPoint: 20 }, { minHeat: 80, keep: 40, perPoint: 25 }, { minHeat: 80, keep: 0, perPoint: 30 }],
  schmelzpunkt:  [{ burn: 4, perPoint: 15 }, { burn: 4, perPoint: 20 }, { burn: 4, perPoint: 25 }, { burn: 4, perPoint: 30, refund: 0.5 }],
  brandmal:      [{ minHeat: 80, value: 2 }, { minHeat: 60, value: 2 }, { minHeat: 40, value: 2 }, { minHeat: 20, value: 2, onLoss: true }],
  lauffeuer:     [{ minHeat: 80, value: 1, reach: 1 }, { minHeat: 60, value: 1, reach: 1 }, { minHeat: 40, value: 1, reach: 1 }, { minHeat: 20, value: 1, reach: 2 }],
  schmiede:      [{ cost: 50, cards: 1 }, { cost: 40, cards: 1 }, { cost: 30, cards: 1 }, { cost: 20, cards: 2 }],
  glutstahl:     [{ perPoint: 8 }, { perPoint: 12 }, { perPoint: 16 }, { perPoint: 20, forgedDouble: true }],
};
export const FEUER_TIERS = FEUER;

export const SKILL_DEFS = {
  // ---- Blitz (exp skill rework, §3): Passiv +5 % Crit je Skill, Leiste 10 Crits → nächste Karte ionisieren.
  //      Die Mechanik liest die Stufentabellen oben (factions/lightning.js). Texte: ein Satz je Stufe (`tiered`).
  // Rate — die Leiste schneller füllen
  SK_LIGHTNING_01: { id: "SK_LIGHTNING_01", name: "Blitzableiter", archetype: "lightning", keywords: ["charge", "crit"], tiers: BLITZ.ableiter,
    ...tiered(BLITZ.ableiter, (r) => `${jeder(r.critEvery)} Crit gibt +1 Ladung zusätzlich.${r.back ? ` Nach jeder vollen Leiste kommt +${r.back} Ladung zurück.` : ""}${r.overflow ? " Ladung über der Leiste bleibt erhalten." : ""}`) },
  SK_LIGHTNING_08: { id: "SK_LIGHTNING_08", name: "Statische Aufladung", archetype: "lightning", keywords: ["charge"], tiers: BLITZ.statik,
    ...tiered(BLITZ.statik, (r) => `${jeder(r.winEvery)} Sieg ohne Crit gibt +${r.charge} Ladung.${r.lossEvery ? ` Jede ${r.lossEvery}. Niederlage gibt +1 Ladung.` : ""}${r.targetValue ? ` Die volle Leiste gibt der ionisierten Karte dauerhaft +${r.targetValue} Kartenwert.` : ""}`) },
  SK_LIGHTNING_05: { id: "SK_LIGHTNING_05", name: "Reststrom", archetype: "lightning", keywords: ["charge"], tiers: BLITZ.reststrom,
    ...tiered(BLITZ.reststrom, (r) => `Nach jeder vollen Leiste startet die Ladung bei ${r.floor} statt 0.`) },
  SK_LIGHTNING_16: { id: "SK_LIGHTNING_16", name: "Dauerstrom", archetype: "lightning", keywords: ["charge", "streak"], tiers: BLITZ.dauerstrom,
    ...tiered(BLITZ.dauerstrom, (r) => `Ab Serie ${r.minStreak} gibt jeder Sieg +1 Ladung.`) },
  // Rampen — jede volle Leiste zählt dauerhaft
  SK_LIGHTNING_06: { id: "SK_LIGHTNING_06", name: "Gewitterfront", archetype: "lightning", keywords: ["charge", "crit"], tiers: BLITZ.gewitter,
    ...tiered(BLITZ.gewitter, (r) => `Jede volle Leiste gibt dauerhaft +${pctS(r.critPerBar)} % Crit-Chance.`) },
  SK_LIGHTNING_10: { id: "SK_LIGHTNING_10", name: "Entladung", archetype: "lightning", keywords: ["charge", "crit"], tiers: BLITZ.entladung,
    ...tiered(BLITZ.entladung, (r) => `Jede volle Leiste gibt dauerhaft +${de(r.multPerBar)}× Crit-Multiplikator.${r.fillDouble ? " Der Crit, der die Leiste füllt, zählt mit doppeltem Crit-Multiplikator." : ""}`) },
  // Serie und Crit
  SK_LIGHTNING_07: { id: "SK_LIGHTNING_07", name: "Ladungsserie", archetype: "lightning", keywords: ["crit", "streak"], tiers: BLITZ.serie,
    ...tiered(BLITZ.serie, (r) => `Jeder Serienpunkt gibt +${pctS(r.critPerStreak)} % Crit-Chance.${r.chargeFromStreak ? ` Ab Serie ${r.chargeFromStreak} gibt jeder Sieg +1 Ladung.` : ""}`) },
  SK_LIGHTNING_13: { id: "SK_LIGHTNING_13", name: "Spannungsstau", archetype: "lightning", keywords: ["crit"], tiers: BLITZ.stau,
    ...tiered(BLITZ.stau, (r) => `Jeder Sieg ohne Crit gibt +${pctS(r.step)} % Crit-Chance für den nächsten Sieg; ein Crit ${r.critKeep ? `behält ${pct(r.critKeep)} % des Staus` : "leert den Stau"}.`) },
  SK_LIGHTNING_14: { id: "SK_LIGHTNING_14", name: "Überschlag", archetype: "lightning", keywords: ["crit"], tiers: BLITZ.ueberschlag,
    ...tiered(BLITZ.ueberschlag, (r) => `Je 10 Punkte Crit-Chance über 100 %: +${de(r.multPer10)}× Crit-Multiplikator, solange der Überschuss besteht.`) },
  // Breite und Tiefe — Stapel erzeugen und nutzen
  SK_LIGHTNING_03: { id: "SK_LIGHTNING_03", name: "Kettenblitz", archetype: "lightning", keywords: ["ionize"], tiers: BLITZ.kette,
    ...tiered(BLITZ.kette, (r) => `${jeder(r.barEvery, "Jede")} volle Leiste ionisiert ${r.cards === 1 ? "eine weitere Karte" : `${r.cards} weitere Karten`} in der Reihenfolge.${r.targetExtra ? ` Die Zielkarte erhält ${r.targetExtra === 1 ? "einen Stapel" : `${r.targetExtra} Stapel`} zusätzlich.` : ""}`) },
  SK_LIGHTNING_15: { id: "SK_LIGHTNING_15", name: "Blitzschlag", archetype: "lightning", keywords: ["crit", "ionize"], tiers: BLITZ.blitzschlag,
    ...tiered(BLITZ.blitzschlag, (r) => `${jeder(r.critEvery)} Crit ionisiert die Siegkarte (+1 Stapel).`) },
  SK_LIGHTNING_11: { id: "SK_LIGHTNING_11", name: "Blitzfänger", archetype: "lightning", keywords: ["ionize"], tiers: BLITZ.faenger,
    ...tiered(BLITZ.faenger, (r) => `Karten ab ${r.minStacks} Stapeln kämpfen mit +${r.value} Wert.`) },
  SK_LIGHTNING_09: { id: "SK_LIGHTNING_09", name: "Kurzschluss", archetype: "lightning", keywords: ["ionize"], tiers: BLITZ.kurzschluss,
    ...tiered(BLITZ.kurzschluss, (r) => `Sieg mit einer Karte ab ${r.minStacks} Stapeln: ihre Stapel zählen ${r.factor === 2 ? "doppelt" : `×${r.factor}`}.`) },
  SK_LIGHTNING_04: { id: "SK_LIGHTNING_04", name: "Überspannung", archetype: "lightning", keywords: ["charge", "ionize", "crit"], tiers: BLITZ.ueberspannung,
    ...tiered(BLITZ.ueberspannung, (r) => `Crit mit einer Karte ab ${r.minStacks} Stapeln: +${r.charge} Ladung.`) },
  // Schutz
  SK_LIGHTNING_17: { id: "SK_LIGHTNING_17", name: "Serienschutz", archetype: "lightning", keywords: ["charge", "streak"], tiers: BLITZ.serienschutz,
    ...tiered(BLITZ.serienschutz, (r) => `Verlierst du einen Stich mit mindestens ${pct(r.frac)} % Ladung, hält die Serie; diese ${pct(r.frac)} % werden verbraucht.${r.freePerRound ? " Einmal je Runde ist der Schutz kostenlos." : ""}`) },
  // Legendäre (§3.7): keine Stufe, zwei Effekte erlaubt.
  SK_LIGHTNING_L01: { id: "SK_LIGHTNING_L01", name: "Donnergott", archetype: "lightning", legendary: true, keywords: ["charge", "crit"],
    desc: `Die Ladungsleiste ist bei ${C.DONNERGOTT_MAX_CHARGE} voll. Dauerhaft +${de(C.THUNDER_CRIT_MULT)}× Crit-Multiplikator.` },
  SK_LIGHTNING_L02: { id: "SK_LIGHTNING_L02", name: "Doppelentladung", archetype: "lightning", legendary: true, keywords: ["ionize", "crit"],
    desc: `Jede Ionisierung gibt ${C.DOPPELENTLADUNG_STACKS} Stapel statt 1. Crit mit einer ionisierten Karte: der Blitz schlägt zweimal ein, der Stich zählt doppelt.` },
  SK_LIGHTNING_L03: { id: "SK_LIGHTNING_L03", name: "Hochspannung", archetype: "lightning", legendary: true, keywords: ["crit"],
    desc: `Alle gehaltenen Blitz-Skills wirken eine Stufe höher: Normal wie Selten, Selten wie Sehr selten, Sehr selten wie Episch. Episch bleibt Episch.` },
  SK_LIGHTNING_L04: { id: "SK_LIGHTNING_L04", name: "Durchschlag", archetype: "lightning", legendary: true, keywords: ["crit"],
    desc: `Auch Niederlagen können critten: ein Crit bei einer Niederlage gewinnt den Stich.` },

  // ---- Feuer (exp skill rework, §4): Passiv = Siege mit Abstand geben Hitze, Niederlagen kühlen, je 10 % Hitze +2 % Score.
  //      Die Mechanik liest die Stufentabellen oben (factions/fire.js). Texte: ein Satz je Stufe (`tiered`).
  // Rate — Hitze erzeugen
  SK_FIRE_01: { id: "SK_FIRE_01", name: "Glut", archetype: "fire", keywords: ["heat"], tiers: FEUER.glut,
    ...tiered(FEUER.glut, (r) => `Solange die Hitze unter ${r.below} % steht, zählt Hitze aus Siegen ×${de(r.mult)}.`) },
  SK_FIRE_02: { id: "SK_FIRE_02", name: "Zunder", archetype: "fire", keywords: ["heat"], tiers: FEUER.zunder,
    ...tiered(FEUER.zunder, (r) => `Jeder Sieg gibt +${r.heat} % Hitze, auch ein knapper.`) },
  SK_FIRE_03: { id: "SK_FIRE_03", name: "Feuersturm", archetype: "fire", keywords: ["heat", "streak"], tiers: FEUER.feuersturm,
    ...tiered(FEUER.feuersturm, (r) => `Jeder Sieg gibt +${de(r.perStreak)} % Hitze je Serienpunkt.`) },
  SK_FIRE_05: { id: "SK_FIRE_05", name: "Rückzündung", archetype: "fire", keywords: ["heat"], tiers: FEUER.rueckzuendung,
    ...tiered(FEUER.rueckzuendung, (r) => `Ein Sieg nach einer Niederlage gibt +${de(r.perDeficit)} % Hitze je Punkt Rückstand.${r.value ? ` Die Karte nach einer Niederlage hat +${r.value} Wert.` : ""}`) },
  // Schutz
  SK_FIRE_04: { id: "SK_FIRE_04", name: "Glutbett", archetype: "fire", keywords: ["heat"], tiers: FEUER.glutbett,
    ...tiered(FEUER.glutbett, (r) => (r.noCool ? "Niederlagen kühlen die Hitze nicht." : `Niederlagen kühlen die Hitze nicht unter ${r.floor} %.`)) },
  // Zustand — Hitze zu Wert und Multiplikator
  SK_FIRE_06: { id: "SK_FIRE_06", name: "Glühende Klinge", archetype: "fire", keywords: ["heat"], tiers: FEUER.klinge,
    ...tiered(FEUER.klinge, (r) => `Alle deine Karten haben +${r.value} Wert je ${r.perHeat} % Hitze.`) },
  SK_FIRE_07: { id: "SK_FIRE_07", name: "Weißglut", archetype: "fire", keywords: ["heat"], tiers: FEUER.weissglut,
    ...tiered(FEUER.weissglut, (r) => `Die Hitzeleiste reicht bis ${C.WEISSGLUT_HEAT_MAX} %. Über ${C.HEAT_MAX} % geben je 10 % Hitze +${pct(r.multPer10)} % Score.`) },
  SK_FIRE_08: { id: "SK_FIRE_08", name: "Feuerwalze", archetype: "fire", keywords: ["heat", "streak"], tiers: FEUER.feuerwalze,
    ...tiered(FEUER.feuerwalze, (r) => `Ab ${r.minHeat} % Hitze hat die nächste Karte nach einem Sieg${r.afterLoss ? " oder einer Niederlage" : ""} +${r.value} Wert.`) },
  SK_FIRE_09: { id: "SK_FIRE_09", name: "Verbrennung", archetype: "fire", keywords: ["heat"], tiers: FEUER.verbrennung,
    ...tiered(FEUER.verbrennung, (r) => `Ein Sieg mit Kampfwert-Vorsprung ab ${r.minMargin} zählt ×${de(r.mult)}.`) },
  // Konsumenten — Hitze zu Score
  SK_FIRE_11: { id: "SK_FIRE_11", name: "Flächenbrand", archetype: "fire", keywords: ["heat", "consume"], tiers: FEUER.flaechenbrand,
    ...tiered(FEUER.flaechenbrand, (r) => `Ab ${r.minHeat} % Hitze brennt der nächste Sieg die Hitze bis ${r.keep} herunter: +${r.perPoint} Basis-Score je verbranntem Punkt.`) },
  SK_FIRE_12: { id: "SK_FIRE_12", name: "Schmelzpunkt", archetype: "fire", keywords: ["heat", "consume"], tiers: FEUER.schmelzpunkt,
    ...tiered(FEUER.schmelzpunkt, (r) => `Jeder Sieg verbrennt ${r.burn} % Hitze: +${r.perPoint} Basis-Score je Punkt.${r.refund ? ` ${pct(r.refund)} % der verbrannten Hitze kommen zurück.` : ""}`) },
  // Gegner — Brände
  SK_FIRE_13: { id: "SK_FIRE_13", name: "Brandmal", archetype: "fire", keywords: ["heat", "brand"], tiers: FEUER.brandmal,
    ...tiered(FEUER.brandmal, (r) => `Ab ${r.minHeat} % Hitze brandmarkt jeder Sieg die geschlagene Gegnerkarte: −${r.value} Wert in der nächsten Runde.${r.onLoss ? " Auch eine Niederlage brandmarkt die Gegnerkarte, die gewonnen hat." : ""}`) },
  SK_FIRE_14: { id: "SK_FIRE_14", name: "Lauffeuer", archetype: "fire", keywords: ["heat", "brand"], tiers: FEUER.lauffeuer,
    ...tiered(FEUER.lauffeuer, (r) => `Ab ${r.minHeat} % Hitze brandmarkt jeder Sieg ${r.reach === 1 ? "beide Nachbarn" : `die ${2 * r.reach} Nachbarn`} der geschlagenen Gegnerkarte: −${r.value} Wert in der nächsten Runde.`) },
  // Schmiede — Hitze zu Dauerwert, Wert zu Score
  SK_FIRE_15: { id: "SK_FIRE_15", name: "Schmiede", archetype: "fire", keywords: ["heat", "forge", "consume"], tiers: FEUER.schmiede,
    ...tiered(FEUER.schmiede, (r) => `Rundenende: liegen mindestens ${r.cost} Hitze an, kostet die Schmiedung ${r.cost} und ${r.cards === 1 ? "deine niedrigste Karte erhält" : `deine ${r.cards} niedrigsten Karten erhalten`} dauerhaft +${C.FORGE_VALUE} Wert.`) },
  SK_FIRE_16: { id: "SK_FIRE_16", name: "Glutstahl", archetype: "fire", keywords: ["heat", "forge"], tiers: FEUER.glutstahl,
    ...tiered(FEUER.glutstahl, (r) => `Sieg: +${r.perPoint} Basis-Score je Punkt Wert über dem Grundwert der Karte, egal woher der Punkt kommt.${r.forgedDouble ? " Schmiedewert zählt doppelt." : ""}`) },
  // Legendäre (§4.7): keine Stufe, zwei Effekte, jedes läuft allein.
  SK_FIRE_L01: { id: "SK_FIRE_L01", name: "Sonnenkern", archetype: "fire", legendary: true, keywords: ["heat", "brand"],
    desc: `Jeder Sieg brandmarkt die geschlagene Gegnerkarte (−${C.SONNENKERN_BRAND} Wert), und Brände erneuern sich nicht mehr: sie stapeln sich über die Runden. Sieg gegen eine gebrandmarkte Karte: +${C.SONNENKERN_SCORE_PER_BRAND} Basis-Score je Brandpunkt auf ihr.` },
  SK_FIRE_L02: { id: "SK_FIRE_L02", name: "Phönixfeuer", archetype: "fire", legendary: true, keywords: ["heat"],
    desc: `Niederlagen kühlen nicht, sie heizen: +${C.PHOENIX_LOSS_HEAT} % Hitze je Punkt Rückstand. Fällt die Hitze auf 0, entzündet sie sich neu auf ${C.PHOENIX_REIGNITE} %.` },
  SK_FIRE_L03: { id: "SK_FIRE_L03", name: "Sonnenzorn", archetype: "fire", legendary: true, keywords: ["heat"],
    desc: `Der Hitze-Multiplikator rechnet mit der höchsten je erreichten Hitze, nicht mit der aktuellen. Er zählt doppelt: je 10 % Hitze +${pct(C.SONNENZORN_MULT_PER_10)} % Score statt +${pct(C.HEAT_MULT_PER_10)} %.` },
  SK_FIRE_L04: { id: "SK_FIRE_L04", name: "Damaststahl", archetype: "fire", legendary: true, keywords: ["heat", "forge"],
    desc: `Jede Runde wird deine niedrigste Karte geschmiedet, +${C.FORGE_VALUE} Wert dauerhaft, ohne Preis. Geschmiedete Karten kämpfen mit doppeltem Schmiedewert.` },

  // ---- Eis-Neudesign — „Gletscher, Brechen & Kaskade." (docs/eis-rework.md) Spine = MASSE auf dem Brettfeld (Firn-Boden),
  //      Gletscher halten & brechen gewaltig. Jeder Skill trägt ein `role: G_…` (Mechanik in glacier.js). Gate = archetype
  //      "ice" → activeArchetypes "ice" aktiviert den Gletscher-Block; PICK_SKILL seedet state.glacierRoles aus den `role`s.
  // Linie 1 — Firn (Masse-Motor)
  SK_ICE_01: { id: "SK_ICE_01", name: "Anfrieren", archetype: "ice", keywords: ["glacier"], role: "G_ANFRIEREN",
    desc: `Ein Gletscher-Sieg gibt +${de(G_ANFRIEREN_WIN)} Masse extra, in einer Formation zusätzlich +${de(G_ANFRIEREN_FORM)}.` },
  SK_ICE_02: { id: "SK_ICE_02", name: "Schneetreiben", archetype: "ice", keywords: ["glacier", "freeze"], role: "G_SCHNEETREIBEN",
    desc: `Gewinnt ein Gletscher, sät er +${de(G_SCHNEETREIBEN_SEED)} Schnee in die Boden-Reserve eines der 4 angrenzenden offenen Felder, ohne eigene Masse abzugeben. Nur bei 0 eigener Masse gibt er stattdessen seine Sieg-Masse ab. Eisbrücke erweitert das nicht.` },
  SK_ICE_03: { id: "SK_ICE_03", name: "Dauerfrost", archetype: "ice", keywords: ["glacier", "freeze"], role: "G_DAUERFROST",
    desc: `Jeden Durchlauf sammeln ungefrorene Felder Schnee in ihrer Boden-Reserve: +${de(G_DAUERFROST_NEAR)} bei 2 Feldern Abstand zum nächsten Gletscher, +${de(G_DAUERFROST_FAR)} ab 3. Die 8 Felder direkt um einen Gletscher bleiben leer. Friert hier später ein Gletscher ein, füllt die Reserve ihn zum Durchlauf-Beginn auf.` },
  SK_ICE_04: { id: "SK_ICE_04", name: "Verdichtung", archetype: "ice", keywords: ["glacier", "bauphase"], role: "G_VERDICHTUNG",
    desc: `Erhöht ein Gebäude den Kampfwert einer Gletscher-Karte, wird dieser Bonus nicht ausgespielt, sondern in Masse umgewandelt: +${de(G_VERDICHTUNG_RATE)} Masse je Punkt. Score-Gebäude bleiben unberührt.` },
  // Linie 2 — Eisschild (Cluster/Dichte)
  SK_ICE_05: { id: "SK_ICE_05", name: "Verschmelzen", archetype: "ice", keywords: ["glacier"], role: "G_VERSCHMELZEN",
    desc: `Zu Durchlauf-Beginn heben angrenzende Gletscher einander auf den Masse-Durchschnitt ihres Clusters, nie fallend.` },
  SK_ICE_06: { id: "SK_ICE_06", name: "Packeis", archetype: "ice", keywords: ["glacier"], role: "G_PACKEIS",
    desc: `Jeden Durchlauf gewinnt ein Gletscher +${de(G_PACKEIS_PER)} Masse je Gletscher-Nachbar.` },
  SK_ICE_07: { id: "SK_ICE_07", name: "Eisbrücke", archetype: "ice", keywords: ["glacier"], role: "G_EISBRUECKE",
    desc: `Zählt auch die vier Diagonalen als angrenzend: zersplitterte Felder werden zu einem Cluster, für Bruch, Kollision und Cluster-Größe.` },
  SK_ICE_08: { id: "SK_ICE_08", name: "Eiswall", archetype: "ice", keywords: ["glacier", "formation"], role: "G_EISWALL",
    desc: `Eine komplett gefrorene Reihe oder Spalte verstärkt das Bersten aller ihrer Gletscher: ×${de(G_EISWALL_LINIE)} statt ×${de(G_GEO_LINIE)}.` },
  SK_ICE_09: { id: "SK_ICE_09", name: "Verzahnung", archetype: "ice", keywords: ["glacier"], role: "G_VERZAHNUNG",
    desc: `Jeden Durchlauf gewinnt jeder Gletscher +${de(G_VERZAHNUNG_PER)} Masse je Gletscher im verbundenen Cluster.` },
  // Linie 3 — Lawine (Brechen/Kaskade)
  SK_ICE_10: { id: "SK_ICE_10", name: "Abbruchkante", archetype: "ice", keywords: ["glacier"], role: "G_ABBRUCHKANTE",
    desc: `Höhere Masse-Schwellen bersten steiler: Wucht ×${de(G_ABBRUCH_TIER[2])} statt ×${de(G_TIER_MULT[2])} an der 2. Schwelle, ×${de(G_ABBRUCH_TIER[3])} statt ×${de(G_TIER_MULT[3])} an der 3.` },
  SK_ICE_11: { id: "SK_ICE_11", name: "Kettenbruch", archetype: "ice", keywords: ["glacier"], role: "G_KETTENBRUCH",
    desc: `Bricht ein Gletscher, brechen angrenzende Gletscher sofort mit, auch ohne ihre Schwelle erreicht zu haben.` },
  SK_ICE_12: { id: "SK_ICE_12", name: "Zermalmen", archetype: "ice", keywords: ["glacier"], role: "G_ZERMALMEN",
    desc: `Trifft ein Bruch einen Gletscher-Nachbarn, zählt die Kollision stärker: Faktor ×${de(G_ZERMALMEN_KOLL)} statt ×${de(G_KOLLISION)}.` },
  SK_ICE_13: { id: "SK_ICE_13", name: "Rissbildung", archetype: "ice", keywords: ["glacier"], role: "G_RISSBILDUNG",
    desc: `Ein Gletscher bricht schon ab ${de(G_RISSBILDUNG_BURST)} Masse statt ${de(G_THRESHOLDS[G_THRESHOLDS.length - 1])}.` },
  SK_ICE_14: { id: "SK_ICE_14", name: "Gletschersturz", archetype: "ice", keywords: ["glacier"], role: "G_GLETSCHERSTURZ",
    desc: `Jeder Bruch wird +${pct(G_GLETSCHERSTURZ_PER)} % stärker je Gletscher, der im selben Durchlauf bricht.` },
  // Linie 4 — Frostgriff (Kontrolle/Duo)
  SK_ICE_15: { id: "SK_ICE_15", name: "Einfrieren", archetype: "ice", keywords: ["glacier"], role: "G_EINFRIEREN",
    desc: "Bricht ein Gletscher auf eine Gegnerkarte, verliert diese ihren Stich im nächsten Durchlauf." },
  SK_ICE_16: { id: "SK_ICE_16", name: "Frostbund", archetype: "ice", keywords: ["glacier"], role: "G_FROSTBUND",
    desc: `Bricht ein Gletscher, bekommen seine Nicht-Gletscher-Nachbarn +${de(G_FROSTBUND_BUFF)} Stichwert im nächsten Durchlauf. Mit Eisbrücke gilt das für die 8er-Nachbarschaft.` },
  SK_ICE_17: { id: "SK_ICE_17", name: "Eispanzer", archetype: "ice", keywords: ["glacier"], role: "G_EISPANZER",
    desc: `Eine Niederlage neben einem Gletscher bricht deine Serie nicht und gibt +${de(G_EISPANZER_MASS)} Masse je angrenzendem Gletscher.` },
  // Legendäre (je Linie eine Capstone)
  SK_ICE_L01: { id: "SK_ICE_L01", name: "Eiszeit", archetype: "ice", legendary: true, keywords: ["glacier", "freeze"], role: "G_L_EISZEIT",
    desc: `Jeden Durchlauf +${de(G_EISZEIT_FLOOD)} Schnee in die Boden-Reserve jedes ungefrorenen Felds. Das reservestärkste friert dann zum Gletscher ein und füllt sich aus seiner Reserve. Bis zu ${G_EISZEIT_MAX} Gletscher.` },
  SK_ICE_L02: { id: "SK_ICE_L02", name: "Ewiges Schild", archetype: "ice", legendary: true, keywords: ["glacier"], role: "G_L_SCHILD",
    desc: `Jeden Durchlauf ziehen alle deine Gletscher auf die Masse des stärksten hoch, nie fallend, und bekommen +${G_SCHILD_BONUS} Masse obendrauf. Beim Bruch gilt jeder Gletscher als Nachbar aller anderen: volle Kaskade und Kollision, egal wo sie liegen.` },
  SK_ICE_L03: { id: "SK_ICE_L03", name: "Große Lawine", archetype: "ice", legendary: true, keywords: ["glacier"], role: "G_L_LAWINE",
    desc: `Im letzten Durchlauf brechen ALLE deine Gletscher auf einen Schlag, auch die noch nicht vollen, jeder mit der Wucht der höchsten Schwelle und massiv verstärkt.` },
  SK_ICE_L04: { id: "SK_ICE_L04", name: "Erstarrung", archetype: "ice", legendary: true, keywords: ["glacier"], role: "G_L_ERSTARRUNG",
    desc: `Jede vom Bruch getroffene Gegnerkarte verliert ihren Stich, und der Bruch greift über die vier Nachbarn hinaus ins Gegnerfeld. Jeder Bruch zählt ×${de(1 + G_ERSTARRUNG_FRAC)} Score.` },

  // ---- Pflanze-Fraktion (v0) — „Der Garten, der sich selbst überwuchert." NEU (4. Fraktion). Wachstum (nur steigend)
  //      → Reife (grün) → Farbblock → Score. Grün = Farbe, nicht Kraft; Wert nur über Wurzeln (Deckel 11).
  //      Grundmechanik: Alter Anker (Aktivierung startet 1 reife Karte). Flags in engine/formations/reducer gelesen. ----
  // Linie 1 — Wurzeln (Tiefe: Wert & Wurzeln-Score) — die Wert-aus-Wachstum-Mechanik ist jetzt die MONO-Fraktions-Passive (s. u.), kein Skill mehr.
  SK_PLANT_02: { id: "SK_PLANT_02", name: "Wurzeltiefe", archetype: "plant", keywords: ["growth", "score"],
    desc: `Jeder Sieg einer grünen Karte gibt +${C.WURZELTIEFE_SCORE} Wurzel-Score, dazu einen Bonus, der mit dem Gesamtwachstum des Feldes steigt (max. +${C.WURZELTIEFE_FIELD_CAP} bei ~${grp(Math.round((C.WURZELTIEFE_FIELD_CAP / C.WURZELTIEFE_FIELD_K) ** 2 / 1000) * 1000)} Wachstum).`, wurzeltiefe: true },
  SK_PLANT_03: { id: "SK_PLANT_03", name: "Pfahlwurzel", archetype: "plant", keywords: ["growth", "score", "formation"],
    desc: `Verstärker: Die Wurzel-Basis (${C.WURZELTIEFE_SCORE}) ×${C.PFAHLWURZEL_MULT}, wenn die grüne Karte in einer Formation gewinnt.`, enabler: "SK_PLANT_02", pfahlwurzel: true },
  SK_PLANT_04: { id: "SK_PLANT_04", name: "Jahresringe", archetype: "plant", keywords: ["growth", "score"],
    desc: `Verstärker: Je volle ${C.JAHRESRINGE_PER_GROWTH} eigenes Wachstum gibt eine grüne Karte bei ihrem Sieg +${C.JAHRESRINGE_SCORE} Wurzel-Score extra.`, enabler: "SK_PLANT_02", jahresringe: true },
  // Linie 2 — Aussaat (Breite: Wachstum verbreiten)
  SK_PLANT_05: { id: "SK_PLANT_05", name: "Aussaat", archetype: "plant", keywords: ["growth"],
    desc: `Gewinnt eine grüne Karte, sät sie beide Nachbarn: +${C.AUSSAAT_GROWTH} Wachstum je Seite.\n${TRIMMEN}`, aussaat: true, trimGrowth: true },
  SK_PLANT_06: { id: "SK_PLANT_06", name: "Flugsamen", archetype: "plant", keywords: ["growth"],
    desc: `Verstärker: Aussaat überspringt schon grüne Karten und sät die nächste noch-graue dahinter.\n${TRIMMEN}`, enabler: "SK_PLANT_05", flugsamen: true, trimGrowth: true },
  SK_PLANT_07: { id: "SK_PLANT_07", name: "Setzlingsbeet", archetype: "plant", keywords: ["growth"],
    desc: `Die niedrigste Karte je Segment startet den Lauf mit +${C.SETZLINGSBEET_GROWTH} Wachstum Vorsprung.\n${TRIMMEN}`, setzlingsbeet: true, trimGrowth: true },
  SK_PLANT_08: { id: "SK_PLANT_08", name: "Zäher Halm", archetype: "plant", keywords: ["growth"],
    desc: `Unreife (graue) Karten wachsen auch bei Niederlage +1, bis sie grün sind.\n${TRIMMEN}`, zaeherHalm: true, trimGrowth: true },
  // Linie 3 — Ranken/Blüte (Grün verbreiten)
  SK_PLANT_09: { id: "SK_PLANT_09", name: "Ranken", archetype: "plant", keywords: ["green"],
    desc: "Gewinnt eine grüne Karte, färbt sie einen noch-grauen Nachbarn sofort grün.", ranken: true },
  SK_PLANT_10: { id: "SK_PLANT_10", name: "Blüte", archetype: "plant", keywords: ["green", "score"],
    desc: `Gewinnt eine grüne Karte, deren Nachbarn schon grün sind, blüht sie: +${C.BLUETE_SCORE} Blüte-Score je grüner Karte im Segment.`, bluete: true },
  SK_PLANT_11: { id: "SK_PLANT_11", name: "Blütezeit", archetype: "plant", keywords: ["green", "score", "formation"],
    desc: `Verstärker: Blüte-Score ×${C.BLUETEZEIT_MULT}, wenn die Karte in einer Formation gewinnt.`, enabler: "SK_PLANT_10", bluetezeit: true },
  // Linie 4 — Überwucherung (Mono-Grün-Payoff)
  SK_PLANT_12: { id: "SK_PLANT_12", name: "Photosynthese", archetype: "plant", keywords: ["green", "formation"],
    desc: `Grüne Karten in einer Formation geben zusätzlich ×${de(C.PHOTOSYNTHESE_MULT)} Score.`, photosynthese: true },
  SK_PLANT_13: { id: "SK_PLANT_13", name: "Blätterdach", archetype: "plant", keywords: ["green", "formation", "score"],
    desc: `In einem grünen Farbblock ab ${C.BLAETTERDACH_MIN} Karten gibt jede grüne Karte bei Sieg +${C.BLAETTERDACH_SCORE} Score je Karte im Block (bis ${C.BLAETTERDACH_CARD_CAP}).`, blaetterdach: true },
  SK_PLANT_14: { id: "SK_PLANT_14", name: "Überwucherung", archetype: "plant", keywords: ["green", "formation", "overgrowth"],
    desc: `Ist das Feld ≥${pct(C.UEBERWUCHERUNG_FIELD)} % grün, geben alle Farbblöcke +${de(C.UEBERWUCHERUNG_FACTOR)} Faktor und Blüte zählt doppelt.`, ueberwucherung: true },
  SK_PLANT_18: { id: "SK_PLANT_18", name: "Kernholz", archetype: "plant", keywords: ["value", "score"],
    desc: `Jeder Sieg einer grünen Karte gibt +${C.KERNHOLZ_SCORE_PER_VALUE} Score je Kartenwert-Punkt über ihrem Startwert (max. +${(C.PLANT_VALUE_CAP - 1) * C.KERNHOLZ_SCORE_PER_VALUE} von Wert 1 auf ${C.PLANT_VALUE_CAP}). Karten gewinnen Wert nur, solange du nur Pflanzen-Skills hältst.`, kernholz: true },
  // Linie 5 — Ausläufer (Gegnerdeck: kolonisieren & ernten)
  SK_PLANT_15: { id: "SK_PLANT_15", name: "Ausläufer", archetype: "plant", keywords: ["green", "colonize"],
    desc: `Gewinnt eine grüne Karte, kolonisiert sie die niedrigste Gegnerkarte. Besiegst du eine kolonisierte Karte, erntest du +${C.AUSLAEUFER_HARVEST} Wachstum.\n${TRIMMEN}`, auslaeufer: true, trimGrowth: true },
  SK_PLANT_16: { id: "SK_PLANT_16", name: "Rhizom", archetype: "plant", keywords: ["colonize"],
    desc: `Verstärker: Beim Ernten wird ein ebenfalls kolonisierter Gegner-Nachbar mitgeerntet: +${C.AUSLAEUFER_HARVEST} Wachstum extra.\n${TRIMMEN}`, enabler: "SK_PLANT_15", rhizom: true, trimGrowth: true },
  SK_PLANT_17: { id: "SK_PLANT_17", name: "Erntedank", archetype: "plant", keywords: ["colonize", "score"],
    desc: `Verstärker: Erntest du mit einer reifen Karte, gibt es zusätzlich +${C.ERNTEDANK_SCORE} Score.`, enabler: "SK_PLANT_15", erntedank: true },
  // Legendäre (Reshape 2026-07-30: lesen die verschwendeten Fluten — Überlauf-Wachstum/Grün-Feld/Kolonie — und zahlen je grünem Sieg DIREKT)
  SK_PLANT_L01: { id: "SK_PLANT_L01", name: "Weltenbaum", archetype: "plant", legendary: true, keywords: ["growth"],
    desc: `Am Ende jedes Durchlaufs wächst der ganze Wald: +1 Wachstum je ${C.WELTENBAUM_PER_GREEN} grüne Karten im Feld. Jeder grüne Sieg gibt +${de(C.WELTENBAUM_DIRECT)} Score je Wachstum über dem Wert-Deckel, summiert über alle grünen Karten (bis ${C.WELTENBAUM_OVERFLOW_CAP}).`, weltenbaum: true },
  SK_PLANT_L02: { id: "SK_PLANT_L02", name: "Mutterbaum", archetype: "plant", legendary: true, keywords: ["growth", "score"],
    desc: `Mit Wurzeltiefe: Ist deine höchstgewachsene Karte am Zug, verdoppelt sie ihren Wurzel-Score. Jeder grüne Sieg gibt +${C.MUTTERBAUM_DIRECT} Score je Wachstum deines tiefsten Baums über dem Wert-Deckel (bis ${C.MUTTERBAUM_OVERFLOW_CAP}), auch ohne Wurzeltiefe.`, mutterbaum: true },
  SK_PLANT_L03: { id: "SK_PLANT_L03", name: "Baumreihe", archetype: "plant", legendary: true, keywords: ["growth", "formation"],
    desc: `Voll ausgewachsene grüne Karten (Wert ${C.PLANT_VALUE_CAP}) bilden eine positionsfreie Wiederholung, egal wo sie liegen: ab 2 solchen Karten ×${de(C.BAUMREIHE_BASE)} auf ihre Stiche, je weitere +${de(C.BAUMREIHE_STEP)}, bis ×${de(C.BAUMREIHE_CAP)}. Jede darf zugleich in einer anderen Formation zählen.`, baumreihe: true },
  SK_PLANT_L04: { id: "SK_PLANT_L04", name: "Ewiger Frühling", archetype: "plant", legendary: true, keywords: ["green", "overgrowth", "eternalSpring"],
    desc: `Jeder grüne Sieg gibt +${C.EWIGER_FRUEHLING_DIRECT} Score je grüner Karte im Feld (bis ${C.EWIGER_FRUEHLING_FIELD_CAP}). Bei voll grünem Feld zählt jede grüne Karte ${de(C.EWIGER_FRUEHLING_FULLGREEN_MULT)}× (effektiv bis ${C.EWIGER_FRUEHLING_FIELD_CAP * C.EWIGER_FRUEHLING_FULLGREEN_MULT}).`, ewigerFruehling: true },
};

export const SKILL_LIST = Object.values(SKILL_DEFS);
export const archetypeOf = (id) => SKILL_DEFS[id]?.archetype || null;
// Eis-Neudesign: aktive Gletscher-Rollen (glacier.js ROLES) aus den gehaltenen Skill-`role`-Feldern.
export const glacierRolesOf = (skills = []) => (skills || []).map((id) => SKILL_DEFS[id]?.role).filter(Boolean);
// #288 „Trimmen": ist der Skill wachstums-stützend? (Aussaat/Flugsamen/Setzlingsbeet/Zäher Halm + Ausläufer/Rhizom) — Ersetzen zählt als Trimmung.
export const isTrimmableSkill = (id) => !!SKILL_DEFS[id]?.trimGrowth;
// Die Namen der trimmbaren Skills als Aufzählung — EINE Quelle für alle Spielertexte, die sie auflisten
// (Glossar „Trimmen", PlantBar-Tooltip). Vorher zweimal von Hand gepflegt und beide Male unvollständig.
export const trimmableSkillNames = (sep = ", ") => SKILL_LIST.filter((s) => s.trimGrowth).map((s) => s.name).join(sep);

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

/* ---- Pflanze-Fraktion (v0) — Wachstum (nur steigend) → Reife (grün) → Farbblock → Score. Reine Helfer. ---- */
const plantFlag = (skills, flag) => (skills || []).some((id) => SKILL_DEFS[id]?.[flag]);
export const plantSkillCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.archetype === "plant").length;
// Reife: grün ist ein KARTEN-Flag (card.green) — gebacken bei Erreichen der Wachstums-Schwelle
// ODER per Recolor (Alter Anker/Ranken). So liest die Formations-Erkennung Grün direkt von der Karte (Farbblock).
export const isGreen = (card) => !!card?.green;
export const greenCount = (deck) => (deck || []).filter((c) => c.green).length;
// Soll diese Karte (nach Wachstums-Update) reif/grün sein? (Schwelle erreicht.)
export const growthRipe = (growth) => (growth || 0) >= C.PLANT_GREEN_THRESHOLD;
// Wurzeln-Score je Sieg einer grünen Karte (Anzeige-Helfer für CardDetail #211): BASIS-Flat aus Wurzeltiefe +
// Jahresringe (je 10 Wachstum). Spiegelt engine.js (Wurzeltiefe/Jahresringe); der Pfahlwurzel-Faktor (×2 in Formation)
// wird in der UI separat vermerkt, damit die Basiszahl stabil bleibt. Der feldweite Feldtiefe-Bonus (√Gesamtwachstum)
// hängt NICHT an einer Einzelkarte und ist hier bewusst nicht enthalten (er fließt nur in den echten Score der Engine).
export const plantRootScore = (skills, growth) => {
  if (!hasWurzeltiefe(skills)) return 0;
  let r = C.WURZELTIEFE_SCORE;
  if (hasJahresringe(skills)) r += Math.floor((growth || 0) / C.JAHRESRINGE_PER_GROWTH) * C.JAHRESRINGE_SCORE;
  return r;
};
// Flag-Prädikate (in engine/formations/reducer gelesen).
// Pflanze-Fraktions-Passive „Wurzelschlag" (v0.5): MONO-Gate — nur aktiv, solange AUSSCHLIESSLICH Pflanzen-Skills
// gehalten werden (mind. 1). Steuert die Wert-aus-Wachstum-Ableitung (Sieg) + die Niederlage-Klausel.
export const isMonoPlant      = (skills) => (skills || []).length > 0 && plantSkillCount(skills) === (skills || []).length;
// ERKUNDUNG Hebel 3c: Gate der Wert-Passive. Default (PLANT_PASSIVE_MIN_SKILLS=0) = hartes Mono-Gate (isMonoPlant, neutral).
// >0 = Schwellen-Knick: aktiv ab N Pflanzen-Skills, egal ob Fremd-Skills dabei (Commitment-Tiefe statt Reinheit).
export const plantPassiveActive = (skills) =>
  isMonoPlant(skills) || (C.PLANT_PASSIVE_MIN_SKILLS > 0 && plantSkillCount(skills) >= C.PLANT_PASSIVE_MIN_SKILLS);
export const hasKernholz      = (skills) => plantFlag(skills, "kernholz");
export const hasWurzeltiefe   = (skills) => plantFlag(skills, "wurzeltiefe");
export const hasPfahlwurzel   = (skills) => plantFlag(skills, "pfahlwurzel");
export const hasJahresringe   = (skills) => plantFlag(skills, "jahresringe");
export const hasAussaat       = (skills) => plantFlag(skills, "aussaat");
export const hasFlugsamen     = (skills) => plantFlag(skills, "flugsamen");
export const hasSetzlingsbeet = (skills) => plantFlag(skills, "setzlingsbeet");
export const hasZaeherHalm    = (skills) => plantFlag(skills, "zaeherHalm");
export const hasRanken        = (skills) => plantFlag(skills, "ranken");
export const hasBluete        = (skills) => plantFlag(skills, "bluete");
export const hasBluetezeit    = (skills) => plantFlag(skills, "bluetezeit");
export const hasPhotosynthese = (skills) => plantFlag(skills, "photosynthese");
export const hasBlaetterdach  = (skills) => plantFlag(skills, "blaetterdach");
export const hasUeberwucherung = (skills) => plantFlag(skills, "ueberwucherung");
export const hasAuslaeufer    = (skills) => plantFlag(skills, "auslaeufer");
export const hasRhizom        = (skills) => plantFlag(skills, "rhizom");
export const hasErntedank     = (skills) => plantFlag(skills, "erntedank");
export const hasWeltenbaum    = (skills) => plantFlag(skills, "weltenbaum");
export const hasMutterbaum    = (skills) => plantFlag(skills, "mutterbaum");
export const hasBaumreihe     = (skills) => plantFlag(skills, "baumreihe");
export const hasEwigerFruehling = (skills) => plantFlag(skills, "ewigerFruehling");

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
export function rollSkillOfferTiers(offer, owned = [], rng = Math.random, legendaryChance = C.SKILL_LEGENDARY_PER_SLOT, weights = C.SKILL_TIER_WEIGHTS) {
  const out = [...(offer || [])];
  const tiers = {};
  const taken = new Set([...(owned || []), ...out]);
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
export function rerollDoorSkills(archs, owned, current, rng, rngTiers, { legendaryChance = C.SKILL_LEGENDARY_PER_SLOT } = {}) {
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
  return rollSkillOfferTiers(skills, have, rngTiers, legendaryChance);
}

/* (exp skill rework: Ionisierung, Ladung, Stapel-Score und alle Blitz-Prädikate liegen in
   src/game/factions/lightning.js — Passiv und 15 Skills lesen dort ihre Stufentabellen.) */
