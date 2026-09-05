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
   SKILL-REGISTRY — seltene, regelverändernde Build-Motoren NEBEN den Perks
   (Spezifikation: docs/blitz-archetyp.md). Gleiche Hook-Shape wie Perks
   (alle optional), aggregiert in engine.js. Reine Logik — kein Math.random/Date.

   Blitz-Hooks (Stufe A — vertikaler Slice):
     critChance()      -> Crit-Basis je Blitz-Skill (Abschnitt 2a)
     chargeOnCrit(ctx) -> ZUSÄTZLICHE Ladung je Crit (Basis +1 läuft über den lightning-State)
     scoreFlatOnCrit() -> additiver Score NUR bei Crit (fließt in die multiplizierte Basis)
   Ein Skill mit archetype:"lightning" aktiviert beim ersten Pick den Blitz-Archetyp
   (lightning.active) — davor sind Ladung/Crit-Basis unsichtbar & inaktiv (Abschnitt 1).
   ============================================================ */
export const SKILL_DEFS = {
  // ---- Blitz-Rework (v0) — „Der Sturm, der sich selbst nährt." 4 Währungen (Crit/Ladung/Ionis/Serie) + Kaskade.
  //      Jeder Blitz-Skill trägt zur Crit-Chance bei (Sockel + je Skill). Flags in engine.js/skills.js gelesen.
  // Linie 1 — Ladung (Aufbau · Reaktor · Entlade-Payoffs)
  SK_LIGHTNING_01: { id: "SK_LIGHTNING_01", name: "Blitzableiter", archetype: "lightning", keywords: ["charge", "crit"],
    desc: `Jeder Crit erzeugt +1 Ladung zusätzlich. Jeder volle Ladungsverbrauch gibt +${C.BLITZABLEITER_CONSUME_CHARGE} Ladung zurück.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, chargeOnCrit: () => 1 },
  SK_LIGHTNING_08: { id: "SK_LIGHTNING_08", name: "Statische Aufladung", archetype: "lightning", keywords: ["charge", "score"],
    desc: `Jeder Sieg ohne Crit erzeugt +${C.STATIC_CHARGE} Ladung. Jeder volle Ladungsverbrauch gibt +${C.CONSUME_SCORE} Direkt-Score.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, staticCharge: true },
  SK_LIGHTNING_05: { id: "SK_LIGHTNING_05", name: "Reststrom", archetype: "lightning", keywords: ["charge"],
    desc: `Nach jedem vollen Ladungsverbrauch bleiben ${C.REST_CHARGE_FLOOR} Ladungen statt 0.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, chargeFloor: () => C.REST_CHARGE_FLOOR },
  SK_LIGHTNING_06: { id: "SK_LIGHTNING_06", name: "Gewitterfront", archetype: "lightning", keywords: ["charge", "crit"],
    desc: `Jeder volle Ladungsverbrauch gibt dauerhaft +${pct(C.STORM_CRIT_STEP)} % Crit-Chance (bis +${pct(C.STORM_CRIT_CAP)} %).`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, storm: true },
  SK_LIGHTNING_10: { id: "SK_LIGHTNING_10", name: "Entladung", archetype: "lightning", keywords: ["charge", "crit"],
    desc: `Jeder volle Ladungsverbrauch gibt dauerhaft +${de(C.ENTLADUNG_MULT_STEP)}× Crit-Multiplikator (bis +${de(C.ENTLADUNG_MULT_CAP)}×).`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, discharge: true },
  // Linie 2 — Konsumenten (volle Ladung → Payoff; max 1 im Build)
  SK_LIGHTNING_02: { id: "SK_LIGHTNING_02", name: "Ionisierung", archetype: "lightning", keywords: ["charge", "ionize"],
    /* #skilltext-ion: gekürzt. Drei Sachen sind bewusst RAUS, keine davon geht verloren:
       · „+1 je Blitz-Skill über 2" — das skaliert mit dem ganzen ARCHETYP, nicht mit diesem Skill, und steht
         jetzt im Glossar-Eintrag „Ionisierung" (den der Passiv-Aufklapper direkt darunter zeigt).
       · „dann Ladung leeren" — implizit, und mit Reststrom sogar falsch: verbraucht wird auf den Boden, nicht auf 0.
       · Der Voll-Tiefe-Satz — er beschreibt den Umrechnungskurs von ÜBERSCHLAG (10 → 5 Prozentpunkte je Ladung),
         wirkt ohne diesen Skill also gar nicht, und Überschlag sagt ihn in seinem eigenen Text bereits wörtlich.
       Score- und Crit-Zeile bleiben ausdrücklich stehen: sie entscheiden mit, ob man den Skill nimmt. */
    desc: `Bei voller Ladung: ${C.ION_BASE_COUNT} ungespielte Karten ionisieren.

▸ Sieg mit ionisierter Karte: +${C.ION_SCORE_PER_STACK} Score je Stapel.
▸ Jeder Stapel im Deck: +${pct(C.ION_CRIT_PP_PER_STACK)} % Crit-Chance feldweit (max +${pct(C.ION_CRIT_STACK_CAP * C.ION_CRIT_PP_PER_STACK)} %).
▸ Sind ~${pct(C.ION_SAT_BREADTH_FRAC)} % der Karten ionisiert: alle Karten +${C.ION_SATURATION_VALUE} Wert.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, onFullCharge: "ionize", ionizeCount: () => C.ION_BASE_COUNT },
  SK_LIGHTNING_07: { id: "SK_LIGHTNING_07", name: "Ladungsserie", archetype: "lightning", keywords: ["crit", "streak"],
    desc: `Jeder Serienpunkt gibt +${pct(C.SERIESCRIT_STEP)} % Crit-Chance (bis +${pct(C.SERIESCRIT_CAP)} %). Verbraucht keine Ladung.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, seriesCrit: true },
  // Linie 3 — Ionisierung (Breite · Tiefe · Überlauf · Konsum)
  SK_LIGHTNING_03: { id: "SK_LIGHTNING_03", name: "Kettenblitz", archetype: "lightning", keywords: ["ionize"],
    desc: `Verstärker: Jede Ionisierung erfasst +${C.KETTENBLITZ_COUNT} weitere Karten.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, enabler: "SK_LIGHTNING_02", ionizeCount: () => C.KETTENBLITZ_COUNT },
  SK_LIGHTNING_12: { id: "SK_LIGHTNING_12", name: "Breitenbeschleuniger", archetype: "lightning", keywords: ["ionize"],
    desc: `Gewinnt eine ionisierte Karte, springt ein Ionisierungsstapel auf eine noch nicht ionisierte Karte. Gibt es keine, auf den nächsten nicht-vollen Nachfolger.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, voltageArc: true },
  SK_LIGHTNING_11: { id: "SK_LIGHTNING_11", name: "Blitzfänger", archetype: "lightning", keywords: ["ionize", "charge"],
    desc: `Trifft eine Ionisierung eine volle Karte: +${C.BLITZFAENGER_VALUE} Stichwert beim nächsten Auftauchen dieser Karte und +1 Ladung.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, blitzcatcher: true },
  SK_LIGHTNING_09: { id: "SK_LIGHTNING_09", name: "Kurzschluss", archetype: "lightning", keywords: ["ionize", "charge"],
    desc: `Gewinnst du mit einer voll ionisierten Karte: +${C.KURZSCHLUSS_SCORE} Score und +${C.KURZSCHLUSS_CHARGE} Ladung.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, kurzschluss: true },
  // Linie 4 — Crit-Maschine (Chance & Mult erzeugen — Blitz-exklusiv)
  SK_LIGHTNING_13: { id: "SK_LIGHTNING_13", name: "Spannungsstau", archetype: "lightning", keywords: ["crit"],
    desc: `Jeder Sieg ohne Crit gibt +${pct(C.SPANNUNGSSTAU_STEP)} % Crit-Chance für den nächsten Sieg (bis +${pct(C.SPANNUNGSSTAU_CAP)} %). Ein Crit setzt sie zurück.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, spannungsstau: true },
  SK_LIGHTNING_14: { id: "SK_LIGHTNING_14", name: "Überschlag", archetype: "lightning", keywords: ["crit", "charge"],
    desc: `Crit-Chance über 100 % wird bei jedem Sieg in Ladung umgewandelt: je ${C.UEBERSCHLAG_PP_PER_CHARGE} Prozentpunkte +1 Ladung. Sind ~${pct(C.ION_SAT_DEPTH_FRAC)} % der Karten voll ionisiert, reichen ${C.UEBERSCHLAG_DEPTH_PP_PER_CHARGE} Prozentpunkte.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, ueberschlag: true },
  // Linie 5 — Kaskade (Verkabelung — Ereignis zündet Ereignis)
  SK_LIGHTNING_04: { id: "SK_LIGHTNING_04", name: "Überspannung", archetype: "lightning", keywords: ["charge", "ionize", "crit"],
    desc: `Ein Crit auf oder direkt neben einer ionisierten Karte erzeugt +${C.UEBERSPANNUNG_CHARGE} Ladung.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, ueberspannung: true },
  SK_LIGHTNING_15: { id: "SK_LIGHTNING_15", name: "Blitzschlag", archetype: "lightning", keywords: ["crit", "ionize"],
    desc: `Jeder Crit ionisiert die gewonnene Karte (+${C.BLITZSCHLAG_STACKS} Stapel).`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, blitzschlag: true },
  // Linie 6 — Serie-Schnittstelle (Serie → Blitz-Währung)
  SK_LIGHTNING_16: { id: "SK_LIGHTNING_16", name: "Dauerstrom", archetype: "lightning", keywords: ["charge", "streak"],
    desc: `Jeder Sieg in Folge gibt +1 Ladung je ${C.DAUERSTROM_PER_STREAK} Serienpunkte (höchstens +${C.DAUERSTROM_MAX}/Sieg). Jeder volle Ladungsverbrauch gibt dauerhaft +${pct(C.DAUERSTROM_CONSUME_CRIT)} % Crit-Chance (bis +${pct(C.DAUERSTROM_CRIT_CAP)} %).`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, dauerstrom: true },
  SK_LIGHTNING_17: { id: "SK_LIGHTNING_17", name: "Serienschutz", archetype: "lightning", keywords: ["charge", "streak"],
    desc: `Verlierst du einen Stich mit mindestens ${pct(C.SERIENSCHUTZ_COST_FRAC)} % Ladung, bricht deine Serie nicht. Diese Ladung wird dafür verbraucht.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, serienschutz: true },
  // Legendäre (Verstärker, kein Motor)
  SK_LIGHTNING_L01: { id: "SK_LIGHTNING_L01", name: "Donnergott", archetype: "lightning", legendary: true, keywords: ["charge", "crit"],
    desc: `Konsumenten lösen schon bei ${pct(C.DONNERGOTT_THRESHOLD_FRAC)} % Ladung aus und geben dauerhaft +${de(C.THUNDER_CRIT_MULT)}× Crit-Multiplikator.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, thunderGod: true },
  SK_LIGHTNING_L02: { id: "SK_LIGHTNING_L02", name: "Doppelentladung", archetype: "lightning", legendary: true, keywords: ["charge", "ionize"],
    desc: `Bei vollem Ladungsverbrauch ionisiert der Konsument ${C.DOPPELENTLADUNG_FACTOR}× so viele Karten. Jeder Sieg mit einer ionisierten Karte gibt +${C.DOPPELENT_DIRECT} Score je Ionisierungsstapel im Feld (bis ${C.DOPPELENT_FIELD_CAP}), anteilig zu deinen gehaltenen Blitz-Skills.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, doubleDischarge: true },
  SK_LIGHTNING_L03: { id: "SK_LIGHTNING_L03", name: "Flächenionisation", archetype: "lightning", legendary: true, keywords: ["ionize"],
    desc: `Gewinnst du mit einer ionisierten Karte, bekommen beide ungespielten Nachbarkarten je +1 Ionisierungsstapel, dazu +${C.FLAECHENION_DIRECT} Score je ionisierter Karte im Feld (bis ${C.FLAECHENION_FIELD_CAP}), anteilig zu deinen gehaltenen Blitz-Skills.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, areaIonize: true },
  SK_LIGHTNING_L04: { id: "SK_LIGHTNING_L04", name: "Durchschlag", archetype: "lightning", legendary: true, keywords: ["ionize", "crit"],
    desc: `Gewinnt eine voll ionisierte Karte mit Crit, gibt sie dauerhaft +${de(C.DURCHSCHLAG_CRIT_MULT)}× Crit-Multiplikator (bis +${de(C.DURCHSCHLAG_MULT_CAP)}×).`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, durchschlag: true },

  // ---- Feuer-Rework (v0) — „Hitze belohnt totale Überlegenheit." 21 Skills auf 7 Linien.
  //      Flags werden in skills.js-Helfern (heatGainFor/heatLossFor/fireScoreFor) + engine.js gelesen. ----
  // Linie 1 — Generation (Marge · Konstanz · Serie)
  SK_FIRE_01: { id: "SK_FIRE_01", name: "Glut", archetype: "fire", keywords: ["heat"],
    desc: `Siege mit Kampfwert-Vorsprung geben +${pct(C.EMBER_MULT - 1)} % mehr Hitze.`, emberBoost: true },
  SK_FIRE_02: { id: "SK_FIRE_02", name: "Zunder", archetype: "fire", keywords: ["heat"],
    desc: `Jeder Sieg gibt +${C.ZUNDER_HEAT} % Hitze, auch bei knappem Vorsprung.`, zunder: true },
  SK_FIRE_03: { id: "SK_FIRE_03", name: "Feuersturm", archetype: "fire", keywords: ["heat", "streak"],
    desc: `Jeder Sieg in Folge gibt +${C.FEUERSTURM_STEP} % mehr Hitze (bis +${C.FEUERSTURM_CAP} %). Eine Niederlage setzt zurück.`, feuersturm: true },
  // Linie 2 — Verteidigung (abschirmen · kontern)
  SK_FIRE_04: { id: "SK_FIRE_04", name: "Glutbett", archetype: "fire", keywords: ["heat"],
    desc: `Niederlagen kosten nur ${pct(C.GLUTBETT_MULT)} % der Hitze; unter ${C.GLUTBETT_FREE_BELOW} % Hitze gar keine.`, glutbett: true },
  SK_FIRE_05: { id: "SK_FIRE_05", name: "Rückzündung", archetype: "fire", keywords: ["heat"],
    desc: `Nach einer Niederlage gibt der nächste Sieg +${C.RUECKZUENDUNG_HEAT_PER_DEFICIT} % Hitze je Punkt Wert-Rückstand und der Siegkarte +${C.RUECKZUENDUNG_VALUE} Stichwert.`, rueckzuendung: true },
  // Linie 3 — Schwellen-Payoffs (hohe Hitze → Belohnung)
  SK_FIRE_06: { id: "SK_FIRE_06", name: "Glühende Klinge", archetype: "fire", keywords: ["heat"],
    desc: `Alle deine Karten bekommen Stichwert nach Hitze: +${C.GLOWING_T1_VALUE} ab ${C.GLOWING_T1_HEAT} %, +${C.GLOWING_T2_VALUE} ab ${C.GLOWING_T2_HEAT} %, +${C.GLOWING_T3_VALUE} bei ${C.GLOWING_T3_HEAT} %. Die oberen beiden verlangen im laufenden Segment zusätzlich einen Sieg mit ${C.GLOWING_T2_MARGIN} bzw. ${C.GLOWING_T3_MARGIN} Kampfwert-Vorsprung.`, glowingBlade: true },
  SK_FIRE_07: { id: "SK_FIRE_07", name: "Weißglut", archetype: "fire", keywords: ["heat"],
    desc: `Hitze über ${C.HEAT_MAX} % staut sich als Überhitzung auf, bis ${C.HEAT_MAX + C.OVERHEAT_MAX} %; je höher sie steht, desto weniger kommt an. Jeder Punkt gibt +${pct(C.OVERHEAT_SCORE_STEP)} % Feuer-Score. Sie baut ${C.OVERHEAT_DECAY} Punkte je Stich ab, ${C.OVERHEAT_DECAY_LOSS} bei einer Niederlage.`, whiteHeat: true },
  // Linie 4 — Wert-/Score-Motoren
  SK_FIRE_08: { id: "SK_FIRE_08", name: "Feuerwalze", archetype: "fire", keywords: ["heat"],
    desc: `Ab ${C.FIREROLL_MIN_HEAT} % Hitze gibt jeder Sieg in Folge der nächsten Karte +1 Stichwert (bis +${C.FIREROLL_MAX}). Eine Niederlage setzt zurück.`, fireRoll: true },
  SK_FIRE_09: { id: "SK_FIRE_09", name: "Verbrennung", archetype: "fire", keywords: ["heat"],
    desc: `Großer Kampfwert-Vorsprung gibt mehr Feuer-Score: ×${de(C.VERBRENNUNG_T1_MULT)} ab ${C.VERBRENNUNG_T1_MARGIN}, ×${de(C.VERBRENNUNG_T2_MULT)} ab ${C.VERBRENNUNG_T2_MARGIN}.`, verbrennung: true },
  SK_FIRE_10: { id: "SK_FIRE_10", name: "Funkenflug", archetype: "fire", keywords: ["heat"],
    desc: `Jeder Sieg unter ${C.SPARKFLIGHT_MIN_MARGIN} Kampfwert-Vorsprung legt das ${de(C.SPARKFLIGHT_BANK_MULT)}-fache seines Feuer-Scores plus ${C.SPARKFLIGHT_FLOOR_BASE} in einen Speicher, +${C.SPARKFLIGHT_FLOOR_PER_SKILL} je weiterem Feuer-Skill. Ein Sieg ab ${C.SPARKFLIGHT_MIN_MARGIN} Vorsprung zahlt ihn als Score aus, eine Niederlage halbiert ihn.`, sparkflight: true },
  // Linie 5 — Konsumenten (max 1 im Build — Burst vs. Drip)
  SK_FIRE_11: { id: "SK_FIRE_11", name: "Flächenbrand", archetype: "fire", keywords: ["heat", "consume"],
    desc: `Ab ${C.CONFLAG_MIN_HEAT} % Hitze brennt der nächste Sieg bis auf ${C.CONFLAG_KEEP} % herunter: +${C.CONFLAG_PER_HEAT} Score je verbranntem Hitzepunkt, +${C.CONFLAG_PER_SKILL} je weiterem Feuer-Skill (mit ${C.SKILL_SLOTS} Feuer-Skills ≈ +${grp((C.HEAT_MAX - C.CONFLAG_KEEP) * (C.CONFLAG_PER_HEAT + C.CONFLAG_PER_SKILL * (C.SKILL_SLOTS - 1)))}).`, heatConsumer: "conflagration" },
  SK_FIRE_12: { id: "SK_FIRE_12", name: "Schmelzpunkt", archetype: "fire", keywords: ["heat", "consume"],
    desc: `Jeder Sieg verbrennt ${C.MELT_COST} % Hitze: ${C.MELT_SCORE_BASE} Score je verbranntem Punkt, +${de(C.MELT_SCORE_PER_HEAT)} je gehaltenem Prozent Hitze (bei voller Leiste ${grp(Math.round(C.MELT_COST * (C.MELT_SCORE_BASE + C.MELT_SCORE_PER_HEAT * C.HEAT_MAX)))} je Sieg). Niederlagen kosten keine Hitze.`, heatConsumer: "melt" },
  // Linie 6 — Verbrennen → Schmieden (Brand · Asche · Schmiede)
  SK_FIRE_13: { id: "SK_FIRE_13", name: "Brandmal", archetype: "fire", keywords: ["heat", "brand", "ash"],
    desc: `Jeder Sieg brandmarkt eine Gegnerkarte (−${C.BRAND_VALUE} Wert) und gibt +${C.BRAND_ASH} Asche.`, brandmal: true },
  SK_FIRE_14: { id: "SK_FIRE_14", name: "Lauffeuer", archetype: "fire", keywords: ["heat", "brand", "ash"],
    desc: `Verstärker: Brände greifen auf eine Nachbarkarte über (−${C.BRAND_VALUE} Wert) und geben +${C.BRAND_ASH} Asche.`, enabler: "SK_FIRE_13", lauffeuer: true },
  SK_FIRE_15: { id: "SK_FIRE_15", name: "Ascheschmiede", archetype: "fire", keywords: ["heat", "forge", "ash"],
    desc: `Am Ende jedes Durchlaufs erhält jeweils deine niedrigste Karte dauerhaft +${C.FORGE_VALUE} Kartenwert, solange du ≥${C.FORGE_COST} Asche hast. Ist die Schmiede voll, verglüht weitere Asche als Ascheglut: +${grp(C.FORGE_OVERFLOW_SCORE)} Score je ${C.FORGE_COST} Asche.`, ascheschmiede: true },
  SK_FIRE_16: { id: "SK_FIRE_16", name: "Glutstahl", archetype: "fire", keywords: ["heat", "forge"],
    desc: `Verstärker: Geschmiedete Karten geben bei Sieg +${C.GLUTSTAHL_PER_VALUE} Score je geschmiedetem Wert.`, enabler: "SK_FIRE_15", glutstahl: true },
  SK_FIRE_17: { id: "SK_FIRE_17", name: "Schmelzofen", archetype: "fire", keywords: ["heat", "brand", "forge", "ash"],
    desc: `Ab ${C.SCHMELZOFEN_MIN_HEAT} % Hitze geben Brände zusätzlich −${C.SCHMELZOFEN_BRAND_BONUS} Wert und +${C.SCHMELZOFEN_BRAND_BONUS} Asche. Schmieden kostet ${pct(C.SCHMELZOFEN_FORGE_DISCOUNT)} % weniger Asche.`, schmelzofen: true },
  // Legendäre (umgeformt: dauerhaft/compoundend/direkt — je eine eigene Achse & Feuer-Playstyle)
  SK_FIRE_L01: { id: "SK_FIRE_L01", name: "Sonnenkern", archetype: "fire", legendary: true, keywords: ["heat"],
    desc: `Jeder Sieg gegen eine gebrandmarkte Gegnerkarte gibt +${grp(C.SONNENKERN_BRAND_SCORE)} Score je Brand darauf. Endet ein Durchlauf mit ≥${C.SONNENKERN_MIN_HEAT} % Hitze, stapeln sich deine Brände statt sich zu erneuern (bis ${C.SONNENKERN_BRAND_CAP} je Karte), und deine Karten unter Wert ${C.SONNENKERN_CARD_CAP} bekommen dauerhaft +${C.SONNENKERN_VALUE} Kartenwert.`, suncore: true },
  SK_FIRE_L02: { id: "SK_FIRE_L02", name: "Phönixfeuer", archetype: "fire", legendary: true, keywords: ["heat"],
    desc: `Niederlagen kosten keine Hitze, sondern geben +${C.PHOENIX_LOSS_HEAT} % Hitze je Rückstandspunkt. Sinkt deine Hitze durch Verbrauch auf 0, entzündet sie sich 1×/Durchlauf auf ${Math.round(C.PHOENIX_REIGNITE * 100)} % neu.`, phoenix: true },
  SK_FIRE_L03: { id: "SK_FIRE_L03", name: "Sonnenzorn", archetype: "fire", legendary: true, keywords: ["heat"],
    desc: `Dein gesamter Sieg-Score wird mit deinem höchsten je erreichten Hitzestand multipliziert: +${de(Math.round(C.SUNWRATH_PEAK_STEP * 1000) / 10)} % je Prozent bis ${C.HEAT_MAX} %, also bis ×${de(Math.round((1 + C.HEAT_MAX * C.SUNWRATH_PEAK_STEP) * 100) / 100)}, und +${de(Math.round(C.SUNWRATH_OVER_STEP * 1000) / 10)} % je Punkt Überhitzung darüber, mit Weißglut bis ×${de(Math.round((1 + C.HEAT_MAX * C.SUNWRATH_PEAK_STEP + C.OVERHEAT_MAX * C.SUNWRATH_OVER_STEP) * 100) / 100)}.`, sunwrath: true },
  SK_FIRE_L04: { id: "SK_FIRE_L04", name: "Damaststahl", archetype: "fire", legendary: true, keywords: ["heat", "forge", "ash"],
    desc: `Schmiedet jeden Durchlauf deine niedrigste Karte ohne Asche (+${C.FORGE_VALUE} Wert, bis ${C.DAMASCUS_MAX_FORGED} Karten). Geschmiedete Karten kämpfen mit +${C.DAMASCUS_COMBAT} Wert. Jeder Sieg gibt +${C.DAMASCUS_PER_VALUE} Score je Punkt geschmiedetem Wert im Deck. Eine Schmiedung sind ${C.FORGE_VALUE} Punkte.`, damascus: true },

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

// Frischer Blitz-Substate — inaktiv. Wird beim ersten Blitz-Skill aktiviert (Reducer).
// storm* = Gewitterfront (Crit-Chance-Momentum, v0.5 uncapped); entladungMult = Entladung (Crit-Mult-Momentum, v0.5);
// stauBonus = Spannungsstau-Rampe (Crit-Chance); durchschlagMult = Durchschlag-Dauer-Crit-Mult; dauerstromCritBonus = Dauerstrom-Verbrauchsrampe.
export function initLightning() {
  return { active: false, charge: 0, maxCharge: C.LIGHTNING_MAX_CHARGE, stormCritBonus: 0,
    entladungMult: 0, stauBonus: 0, durchschlagMult: 0, dauerstromCritBonus: 0,
    consumeCount: 0, serienschutzCount: 0 }; // v0.5-UI: Entladungen/Runde + abgefangene Serienbrüche (Anzeige)
}

/* ---- Feuer-Archetyp (#93 F1) — Hitze-Substate + reine Helfer (testbar; Engine-Nutzung in resolveTrick) ---- */

// Frischer Hitze-Substate — inaktiv. Wird beim ersten Feuer-Skill aktiviert (Reducer).
// fireRoll = Feuerwalze-Stapel · sparkStore = Funkenflug-Speicher · phoenixUsed = Phönixfeuer (1×/Durchlauf).
// over = Überhitzung (Weißglut, #fire-balance) · glowSegBest = größter Wertvorsprung im LAUFENDEN Segment, gelesen
// von der Glühenden Klinge (s. glowMarginFor). Beide sind über `|| 0` abgesichert — Altstände laufen weiter.
// sparkPaid/sparkPayouts (#384) = Bilanz des Funkenflugs für die Skill-Detailansicht: was seine Ausschüttungen
// diesem Lauf WIRKLICH eingebracht haben (inkl. der Multiplikatoren des auslösenden Stichs, s. engine.js) und wie
// oft er ausgeschüttet hat. Reine Anzeige — kein Leser im Regelwerk.
export function initHeat() {
  return { active: false, value: 0, max: C.HEAT_MAX, fireRoll: 0, sparkStore: 0, phoenixUsed: false, peak: 0,
           over: 0, glowSegBest: 0, sparkPaid: 0, sparkPayouts: 0 };
}

// Anzahl gehaltener Feuer-Skills (Grundmechanik zählt nicht) & ob ein Feuer-Flag gehalten wird.
export const activeFireCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.archetype === "fire").length;
// Anzahl gehaltener Blitz-Skills — Bekenntnis-Skalierung der Blitz-Legendär-Dividende (cross-health, wie activeFireCount/iceSkillCount).
export const activeLightningCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.archetype === "lightning").length;
export const fireFlag = (skills, flag) => (skills || []).some((id) => SKILL_DEFS[id]?.[flag]);
// Hitze-Maximum (fix 100).
export const heatMaxFor = () => C.HEAT_MAX;
// Anzahl gehaltener Hitze-Konsumenten (#234: informativ — nicht mehr im Reducer geblockt, seit Feuer mehrere halten darf).
export const heatConsumerCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.heatConsumer).length;
// Hält der Spieler den Hitze-Konsumenten `kind` ("conflagration"/"melt")? #234: mehrere gleichzeitig erlaubt (heben sich
// nicht auf) → die Engine prüft jeden Konsumenten EINZELN hiermit, statt nur den ersten.
export const hasHeatConsumer = (skills, kind) => (skills || []).some((id) => SKILL_DEFS[id]?.heatConsumer === kind);

// Hitzegewinn bei Sieg (%). ctx = { winStreak, lostLast, deficit } für Serie/Rückzündung.
//  · Marge (ab HEAT_MIN_MARGIN): marginHeatPoints(Vorsprung)×PER_POINT (linear bis Knie, √-Schwanz darüber), Glut ×1,5 (kaufm. gerundet)
//  · Zunder: +2 % flach, AUCH bei knappen Siegen unter der Marge-Schwelle
//  · Feuersturm: +1 % je Serienstufe (bis +5 %)
//  · Rückzündung: nach einer Niederlage +1 % je Wert-Rückstand des Vorstichs
// Margen-Hitzepunkte: linear bis zum weichen Knie (HEAT_MARGIN_CAP), darüber √-Schwanz (uncapped, abnehmender
// Ertrag — wie Wurzeltiefe). Ersetzt den früheren HARTEN Deckel: großer Vorsprung generiert weiter Hitze.
export function marginHeatPoints(margin) {
  const knee = C.HEAT_MARGIN_CAP;
  const lin = Math.min(margin, knee) - C.FIRE_MARGIN_OFFSET; // linear bis zum Knie (wie bisher)
  if (margin <= knee) return lin;
  return lin + C.HEAT_MARGIN_TAIL_K * Math.sqrt(margin - knee); // √-Schwanz über dem Knie
}
export function heatGainFor(margin, skills, ctx = {}) {
  let g = 0;
  if (margin >= C.HEAT_MIN_MARGIN) {
    let base = Math.round(marginHeatPoints(margin) * C.HEAT_PER_POINT); // ganzzahlige Hitze (√-Schwanz gerundet)
    if (fireFlag(skills, "emberBoost")) base = Math.round(base * C.EMBER_MULT);
    g += base;
  }
  if (fireFlag(skills, "zunder")) g += C.ZUNDER_HEAT;
  if (fireFlag(skills, "feuersturm")) g += Math.min((ctx.winStreak || 0) * C.FEUERSTURM_STEP, C.FEUERSTURM_CAP);
  if (fireFlag(skills, "rueckzuendung") && ctx.lostLast) g += (ctx.deficit || 0) * C.RUECKZUENDUNG_HEAT_PER_DEFICIT;
  return g;
}
// Hitzeverlust bei Niederlage (%): Basis min(Rückstand,10). Glutbett: ×0,5, unter 30 % Hitze gar keiner.
// `heatValue` = Hitze VOR dem Verlust.
export function heatLossFor(deficit, skills, heatValue = 0) {
  let l = Math.min(deficit, C.HEAT_LOSS_MAX) + heatValue * C.HEAT_LOSS_PCT; // Basis-Verlust + prozentuale Abkühlung (hält hohe Hitze nicht-trivial: mehr Verlust wenn heiß)
  if (fireFlag(skills, "glutbett")) {
    if (heatValue < C.GLUTBETT_FREE_BELOW) return 0;
    l *= C.GLUTBETT_MULT;
  }
  return Math.floor(l);
}
// Verbrennung-Multiplikator auf den Feuer-Score nach Wertvorsprung (Linie 4).
export function verbrennungMult(margin) {
  if (margin >= C.VERBRENNUNG_T2_MARGIN) return C.VERBRENNUNG_T2_MULT;
  if (margin >= C.VERBRENNUNG_T1_MARGIN) return C.VERBRENNUNG_T1_MULT;
  return 1;
}
// Feuer-Flat-Score bei Sieg: (Vorsprung−FIRE_MARGIN_OFFSET) × (25 + 5×(FeuerSkills−1)) + additiver √-Bonus (Basis·K·√Vorsprung, uncapped), dann Verbrennung (×1,5/×2).
// 0 ohne Feuer-Skill. (Sonnenzorn wirkt jetzt als peak-hitze-Multiplikator in der Engine, nicht mehr hier.)
export function fireScoreFor(margin, skills, _heatValue = 0) {
  const n = activeFireCount(skills);
  if (n === 0 || margin < C.HEAT_MIN_MARGIN) return 0;
  const base = C.FIRE_SCORE_BASE + C.FIRE_SCORE_PER_SKILL * (n - 1);
  const over = Math.max(0, margin - C.FIRE_MARGIN_OFFSET);
  // lineare Linie (wie bisher) + additiver √-Bonus (Wurzeltiefe-Muster): großer Vorsprung zahlt weiter mehr, uncapped.
  let s = over * base + base * C.FIRE_SCORE_SQRT_K * Math.sqrt(over);
  if (fireFlag(skills, "verbrennung")) s *= verbrennungMult(margin);
  return Math.round(s);
}
// Maßgeblicher Wertvorsprung für die Glühende Klinge: der größte Sieg des LAUFENDEN Segments — kein Übertrag aus
// dem vorigen. Jedes Segment beginnt damit auf der reinen Hitze-Stufe und hebt sich, sobald darin ein Sieg mit
// genug Vorsprung fällt; bleiben alle fünf Karten darunter, steht die Klinge dieses Segment auf der Stufe, die der
// beste Sieg darin hergibt. Ein einzelner knapper Sieg stuft NICHT zurück — der Beste des Segments zählt.
export const glowMarginFor = (heat) => Math.max(0, heat?.glowSegBest || 0);

// Glühende-Klinge-Wertbonus (Stufen +1/+2/+3). Reiner Nicht-Legendär-Skill.
// #fire-balance: Stufe 1 hängt allein an der Hitze (verlässlicher Sockel), die OBEREN zusätzlich am Wertvorsprung —
// sonst lag mit Feuerwalze dauerhaft +6 Wert auf jeder Karte und blies genau die Margen auf, aus denen die Hitze
// kommt. `bestMargin` kommt aus glowMarginFor (Segment-Fenster). Voreinstellung Infinity = „kein Margen-Gate"
// (Anzeige-/Testaufrufer ohne Kontext).
export function glowingValueFor(heatValue, skills, bestMargin = Infinity) {
  if (!fireFlag(skills, "glowingBlade")) return 0;
  let v = 0;
  if (heatValue >= C.GLOWING_T1_HEAT) v = C.GLOWING_T1_VALUE;
  if (heatValue >= C.GLOWING_T2_HEAT && bestMargin >= C.GLOWING_T2_MARGIN) v = C.GLOWING_T2_VALUE;
  if (heatValue >= C.GLOWING_T3_HEAT && bestMargin >= C.GLOWING_T3_MARGIN) v = C.GLOWING_T3_VALUE;
  return v;
}

/* Weißglut → ÜBERHITZUNG (#fire-balance). Drei reine Helfer; die Zone liegt in `heat.over` und ist damit von
   allem isoliert, was `heat.value` liest (Sonnenzorn-Peak, Glutdividende, Glühende Klinge, Flächenbrand). */
// Zufluss aus dem Hitze-Überlauf, mit STEIGENDEN Kosten: ankommend = Überlauf / (1 + over/K). Bei 0 kommt alles an,
// bei 30 noch ein Viertel — tiefe Überhitzung verlangt echten Wertvorsprung, nicht viele kleine Siege.
export function overheatGain(over, overflow, skills) {
  const o = Math.max(0, over || 0);
  if (overflow <= 0 || !fireFlag(skills, "whiteHeat")) return o;
  return Math.min(C.OVERHEAT_MAX, o + overflow / (1 + o / C.OVERHEAT_COST_K));
}
// Kontinuierlicher Abbau je Stich (nicht nur bei Niederlage) — `amount` = OVERHEAT_DECAY bzw. OVERHEAT_DECAY_LOSS.
export const overheatDecay = (over, amount) => Math.max(0, (over || 0) - amount);
// Der Hebel: Multiplikator auf den GESAMTEN Feuer-Score eines Stichs (+2 % je Punkt, bei OVERHEAT_MAX also ×2).
export function overheatMult(over, skills) {
  if (!fireFlag(skills, "whiteHeat")) return 1;
  return 1 + Math.min(Math.max(0, over || 0), C.OVERHEAT_MAX) * C.OVERHEAT_SCORE_STEP;
}
// Sonnenzorn: Score-Multiplikator aus dem Hitze-HÖCHSTSTAND. Zwei Sätze — bis HEAT_MAX der leichte Teil, darüber
// die teuer erkaufte Überhitzung (#fire-leg, s. Konstanten-Block).
export function sunwrathMultFor(peak, skills) {
  if (!fireFlag(skills, "sunwrath")) return 1;
  const p = Math.max(0, peak || 0);
  return 1 + Math.min(p, C.HEAT_MAX) * C.SUNWRATH_PEAK_STEP
           + Math.max(0, p - C.HEAT_MAX) * C.SUNWRATH_OVER_STEP;
}
// Flächenbrand: Score je verbranntem Hitzepunkt — bekenntnis-skaliert wie fireScoreFor (ein 2-Skill-Splash bekommt wenig).
export const conflagRateFor = (skills) =>
  C.CONFLAG_PER_HEAT + C.CONFLAG_PER_SKILL * Math.max(0, activeFireCount(skills) - 1);
// Schmelzpunkt: Score je verbranntem Punkt — steigt mit der GEHALTENEN Hitze (Halte-Mechanik, s. Konstanten-Block).
export const meltRateFor = (heatValue) =>
  C.MELT_SCORE_BASE + C.MELT_SCORE_PER_HEAT * Math.max(0, heatValue || 0);
// Funkenflug: Einlage je kleinem Sieg — Vielfaches des Feuer-Scores + bekenntnis-skalierter Sockel (damit auch ein
// Sieg mit 1–2 Vorsprung einzahlt; dessen Feuer-Score ist unter HEAT_MIN_MARGIN exakt 0).
export const sparkBankFor = (fireScore, skills) =>
  Math.round((fireScore || 0) * C.SPARKFLIGHT_BANK_MULT
    + C.SPARKFLIGHT_FLOOR_BASE + C.SPARKFLIGHT_FLOOR_PER_SKILL * Math.max(0, activeFireCount(skills) - 1));
// Schmieden: Asche-Kosten je Schmiedung. #268: Schmelzofen-Rabatt ab 50 % Hitze als FAKTOR (−25 %, skaliert mit den
// Kosten: 20 → 15), nicht mehr flat −1 (bei Kosten 20 trivial). Ganzzahlig gerundet, min 1.
export function forgeCostFor(skills, heatValue = 0) {
  let c = C.FORGE_COST;
  if (fireFlag(skills, "schmelzofen") && heatValue >= C.SCHMELZOFEN_MIN_HEAT) c *= (1 - C.SCHMELZOFEN_FORGE_DISCOUNT);
  return Math.max(1, Math.round(c));
}


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

// Roh-Crit-Beitrag des Blitz-Archetyps (Abschnitt 2a): Aktivierungs-Sockel + Σ Skill-critChance
// + Gewitterfront-Bonus (dauerhaft, Stufe C). Fließt additiv in die Gesamt-Crit-Chance. 0, solange inaktiv.
export function lightningCritRaw(lightning, skills, streak = 0) {
  if (!lightning || !lightning.active) return 0;
  // Ladungsserie (v0): Serie speist die Crit-Maschine — je Serienpunkt +Crit-Chance (Cap). Dauerstrom-Verbrauchsrampe (dauerhaft).
  const series = hasSeriesCrit(skills) ? Math.min((streak || 0) * C.SERIESCRIT_STEP, C.SERIESCRIT_CAP) : 0;
  return C.LIGHTNING_CRIT_BASE + skillSum(skills, "critChance", {}) + (lightning.stormCritBonus || 0)
    + (lightning.stauBonus || 0) + (lightning.dauerstromCritBonus || 0) + series;
}

// Ladung erhöhen (immutabel), gedeckelt auf maxCharge. No-op, solange der Archetyp inaktiv ist.
export function addCharge(lightning, gained) {
  if (!lightning || !lightning.active) return lightning;
  return { ...lightning, charge: Math.min(lightning.maxCharge, lightning.charge + gained) };
}

// Ein Skill ist ein „Konsument", wenn er eine verbrauchbare Ressource auslöst: Feuer-Hitze-Konsument
// (heatConsumer: Flächenbrand/Schmelzpunkt) oder Blitz-Ladungs-Konsument (onFullCharge: Ionisierung).
const isConsumerSkill = (id) => { const d = SKILL_DEFS[id]; return !!(d && (d.heatConsumer || d.onFullCharge)); };
// Hält der Build für diesen Archetyp bereits einen Konsumenten? Eis kennt keine → gilt als „hat einen" (nie erzwingen).
// (heatConsumerCount/chargeConsumerCount stehen weiter unten im Modul — zur Laufzeit längst initialisiert.)
function ownsConsumerFor(arch, skills) {
  if (arch === "fire") return heatConsumerCount(skills) > 0;
  if (arch === "lightning") return chargeConsumerCount(skills) > 0;
  return true;
}

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
export function buildSkillOffer(owned, activeArchetypes, rng, count, _legendaryChance = 0, _guaranteeOne = false, unlockedArchetypes = null, maxArchetypes = C.MAX_ARCHETYPES, perArchCap = SKILL_OFFER_PER_ARCH_CAP) {
  let available = archetypesWithSkills(owned);
  if (unlockedArchetypes) available = available.filter((a) => unlockedArchetypes.includes(a));
  const chosen = offerArchetypes(activeArchetypes || [], available, rng, maxArchetypes);
  if (!chosen.length) return [];
  // Konsument-Garantie: ein angebotener Feuer-/Blitz-Archetyp ohne gehaltenen Konsumenten bekommt garantiert (mind.)
  // einen seines Typs angeboten, solange einer verfügbar ist — sonst kann der Build nie „zünden" (frustrierend). Seit
  // Blitz-Rework v0 NICHT mehr an activeArchetypes gebunden: der Verbraucher wird angeboten, bis er gewählt ist, damit
  // ein späterer Einstieg (z. B. Blitz nachträglich ins Deck) nie ohne Ladungsverbraucher dasteht.
  const needsConsumer = (arch) => !ownsConsumerFor(arch, owned);
  // #191/#223: SCHON beim ERSTEN Skill-Angebot (noch kein Archetyp aktiv) bekommt JEDER angebotene Konsumenten-
  // Archetyp (Feuer & Blitz; Eis/Pflanze haben keinen) garantiert seinen Konsumenten ins Angebot — nicht nur EINER
  // insgesamt. Sonst zeigt das Erst-Angebot z. B. Blitz-Ladungsaufbau OHNE Blitz-Konsument (die Ladung „verpufft"),
  // wenn die chosen-Reihenfolge Feuer zuerst nimmt. Jede angebotene Engine ist so von Anfang an komplett sichtbar.
  const guaranteeAny = (activeArchetypes || []).length === 0;
  const PER_ARCH_CAP = perArchCap; // s. SKILL_OFFER_PER_ARCH_CAP oben — Deckel je Archetyp (Bestand 3, Dev-Run frei)
  const perArch = Math.max(1, Math.min(PER_ARCH_CAP, Math.floor(count / chosen.length)));
  const offer = [];
  const rest = [];
  const guaranteed = new Set();  // garantierte Konsumenten-Slots
  for (const arch of chosen) {
    // Enabler-Gating (Anti-Pech): ein Verstärker-Skill (s.enabler) wird NUR angeboten, wenn seine Basis gehalten wird —
    // sonst ist er ein toter Pick (Variety-Befund: der schwache Tail sind fast durchweg ungegatete Verstärker).
    // Legendäre sind nie Teil des normalen Zugs (fünfte Stufe des Wurfs, rollSkillOfferTiers).
    const pool = shuffle(SKILL_LIST.filter((s) => s.archetype === arch && !(owned || []).includes(s.id)
      && !s.legendary && (!s.enabler || (owned || []).includes(s.enabler))).map((s) => s.id), rng);
    // Garantierten Konsumenten dieses Archetyps nach vorne ziehen (deterministisch, kein zusätzlicher rng-Zug: die
    // Pool-Reihenfolge stammt schon aus dem Shuffle; perArch ≥ 1 → Slot 0 wird gewählt). Zwei Auslöser:
    //  · needsConsumer(arch): aktiver Archetyp ohne gehaltenen Konsumenten (Pro-Archetyp-Garantie, Runden 2+).
    //  · guaranteeAny (#191/#223): erstes Angebot → JEDER angebotene Feuer-/Blitz-Archetyp zeigt seinen Konsumenten.
    if (needsConsumer(arch) || guaranteeAny) {
      const ci = pool.findIndex(isConsumerSkill);
      if (ci > 0) pool.unshift(pool.splice(ci, 1)[0]);
      if (ci >= 0) guaranteed.add(pool[0]);
    }
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

/* ---- Ionisierung (Stufe B, docs/blitz-archetyp.md Abschnitt 5/6) ---- */

// Score-Bonus einer gespielten Karte: +ION_SCORE_PER_STACK je Stapel (Stand VOR dem Zuwachs).
export function ionScoreFor(card) {
  return (card?.ionStacks || 0) * C.ION_SCORE_PER_STACK;
}

// #271: feldweiter Crit-Chance-Beitrag der Ionisierung — Σ aller Ionisierungsstapel im Deck (gedeckelt) × pp/Stapel.
// „Ein ionisiertes Feld lädt die Luft auf": jeder Stapel hebt die Crit-Chance JEDER Siegkarte (Breite, verteilt).
// Rein aus dem Deck ableitbar (Stapel existieren nur durch Ionisierung → implizit Blitz); die Engine gatet zusätzlich
// auf lightning.active. Der Überschuss >100 % fließt via Überschlag als Ladung zurück (kein toter Wert).
export function ionCritChance(deck) {
  let sum = 0;
  for (const c of deck || []) sum += c.ionStacks || 0;
  return Math.min(sum, C.ION_CRIT_STACK_CAP) * C.ION_CRIT_PP_PER_STACK;
}

// Voll-Ladungs-Verbraucher (Abschnitt 6): seit Rework v0 nur noch Ionisierung (ionize). Ladungsserie
// verbraucht keine Ladung mehr, sondern speist die Crit-Maschine (seriesCrit) — s. lightningCritRaw.
export function hasIonize(skills)  { return (skills || []).some((id) => SKILL_DEFS[id]?.onFullCharge === "ionize"); }
// Prädikat „hat der Build einen Verbraucher?" — Test-/Anzeige-API; die Engine prüft hasIonize direkt.
export function consumesCharge(skills) { return hasIonize(skills); }

// Reaktoren (laufen bei JEDEM Verbrauch): Reststrom (Ladungsboden), Gewitterfront (Crit/Score).
export function chargeFloorFor(skills) {
  let floor = 0;
  for (const id of skills || []) { const f = SKILL_DEFS[id]?.chargeFloor; if (f) floor = Math.max(floor, f()); }
  return floor;
}
export function hasStorm(skills) { return (skills || []).some((id) => SKILL_DEFS[id]?.storm); }

// ---- Blitz-Rework (v0): Flag-Prädikate + abgeleitete Werte ----
const lightFlag = (skills, flag) => (skills || []).some((id) => SKILL_DEFS[id]?.[flag]);
export const hasThunderGod   = (skills) => lightFlag(skills, "thunderGod");
export const hasStaticCharge = (skills) => lightFlag(skills, "staticCharge");
export const hasDischarge    = (skills) => lightFlag(skills, "discharge");
export const hasBlitzcatcher = (skills) => lightFlag(skills, "blitzcatcher");
export const hasVoltageArc   = (skills) => lightFlag(skills, "voltageArc");
// Rework v0 — Kaskade/Crit-Maschine/Serie-Schnittstelle + Legendäre:
export const hasUeberspannung  = (skills) => lightFlag(skills, "ueberspannung");  // Kaskade: Crit auf/neben Ionis. → Ladung (merge 04+09)
export const hasKurzschluss    = (skills) => lightFlag(skills, "kurzschluss");    // volle (5) Siegkarte → Score+Ladung-Burst je Sieg, Stapel bleiben
export const hasSpannungsstau  = (skills) => lightFlag(skills, "spannungsstau");  // Nicht-Crit-Siege rampen Crit-Chance
export const hasUeberschlag    = (skills) => lightFlag(skills, "ueberschlag");    // Crit-Chance >100 % → Ladung
export const hasBlitzschlag    = (skills) => lightFlag(skills, "blitzschlag");    // Crit ionisiert die Siegkarte
export const hasDauerstrom     = (skills) => lightFlag(skills, "dauerstrom");     // Serie → Ladung (+ On-Consume-Crit-Rampe)
export const hasSeriesCrit     = (skills) => lightFlag(skills, "seriesCrit");     // Ladungsserie: Serie → Crit-Chance (kein Verbraucher)
export const hasBlitzableiter  = (skills) => lightFlag(skills, "chargeOnCrit");   // Blitzableiter: Crit → Ladung (+ Ladung zurück bei Verbrauch)
export const hasDoubleDischarge = (skills) => lightFlag(skills, "doubleDischarge"); // L: Konsumenten ×2
export const hasAreaIonize     = (skills) => lightFlag(skills, "areaIonize");     // L: ionis. Sieg → alle Nachbarn
export const hasDurchschlag    = (skills) => lightFlag(skills, "durchschlag");    // L: volle Ionis.+Crit → dauerhaft Crit-Mult
// Ladungsmaximum je Build (Donnergott → 15) & dessen dauerhafter Crit-Multiplikator-Bonus.
export const maxChargeFor      = (_skills) => C.LIGHTNING_MAX_CHARGE; // v0.5: Donnergott hebt das Dach NICHT mehr (Turbo statt Dach)
// Blitz-Crit-Multiplikator (dauerhaft, additiv): +LIGHTNING_CRIT_MULT_PER_SKILL je gehaltenem Blitz-Skill
// + Donnergott-Bonus (Legendär). Kein Deckel — fließt in engine.js (critMultiplier) und totalCritMult (Anzeige).
export const lightningCritMult = (skills) =>
  activeLightningCount(skills) * C.LIGHTNING_CRIT_MULT_PER_SKILL
  + (hasThunderGod(skills) ? C.THUNDER_CRIT_MULT : 0);
export const hasSerienschutz   = (skills) => lightFlag(skills, "serienschutz"); // v0.5 (ex-Wetterleuchten)
// Anzahl gehaltener Ladungs-Konsumenten (nur noch Ionisierung); der Reducer blockt > 1.
export const chargeConsumerCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.onFullCharge).length;
// Aktiver Ladungs-Konsument (für HUD/Badge): "ionize" | null (Rework v0: nur noch Ionisierung).
export const chargeConsumerOf = (skills) => {
  for (const id of skills || []) { const c = SKILL_DEFS[id]?.onFullCharge; if (c) return c; }
  return null;
};

// Anzahl je Auslösung ionisierter Karten: Ionisierung (2) + Kettenblitz (+2), sofern gehalten.
export function ionizeCountFor(skills) {
  return skillSum(skills, "ionizeCount", {});
}
// Sturm-Sättigung (Blitz-Rework v0.5): zwei Stufen über den Deck-Zustand.
//   Breite = Anteil Karten mit ≥1 Stapel ≥ FRAC · Tiefe = Anteil voller (ION_MAX_STACKS) Karten ≥ FRAC.
export const fieldBreadthSaturated = (deck, frac = C.ION_SAT_BREADTH_FRAC) => {
  const n = (deck || []).length; if (n === 0) return false;
  let ion = 0; for (const c of deck) if ((c.ionStacks || 0) > 0) ion++;
  return ion >= Math.ceil(n * frac);
};
export const fieldDepthSaturated = (deck, frac = C.ION_SAT_DEPTH_FRAC) => {
  const n = (deck || []).length; if (n === 0) return false;
  let full = 0; for (const c of deck) if ((c.ionStacks || 0) >= C.ION_MAX_STACKS) full++;
  return full >= Math.ceil(n * frac);
};
// Ionisierungs-Speed ∝ Blitz-Skills (Mono): +Breite je Verbrauch je Blitz-Skill über der Schwelle.
export const ionSpeedBonus = (skills) => Math.max(0, activeLightningCount(skills) - C.ION_SPEED_MIN_SKILLS) * C.ION_SPEED_PER_SKILL;

// Ladung verbrauchen → auf den Boden (Stufe C: Reststrom hebt ihn; Default 0).
export function consumeCharge(lightning, floor = 0) {
  if (!lightning || !lightning.active) return lightning;
  return { ...lightning, charge: Math.max(0, floor) };
}

// `count` Karten ionisieren (immutabel, deterministisch). Gültige Ziele = ungespielte Karten
// (Deck-Indizes in `undrawn`); je +1 Stapel (max ION_MAX_STACKS). Reichen die ungespielten Karten
// nicht (Kettenblitz-Fall), gehen die Rest-Stapel an bereits ionisierte Karten (Abschnitt 8.4).
// Blitzfänger (#165): trifft ein Versuch im HAUPTZUG eine bereits volle Karte (ION_MAX_STACKS),
// wird sie NICHT ionisiert; ihre card.id wird als „catch" zurückgegeben (Engine gibt +temp Wert & Ladung).
function ionizeCore(deck, undrawn, count, rng, blitzcatcher) {
  const bumps = {}; // Deck-Index -> zusätzliche Stapel
  const catchIds = []; // Blitzfänger-Treffer (volle Karten) im Hauptzug
  const pool = [...(undrawn || [])];
  let remaining = count;
  while (remaining > 0 && pool.length > 0) {
    const j = Math.floor(rng() * pool.length);
    const idx = pool.splice(j, 1)[0];
    if (blitzcatcher && (deck[idx].ionStacks || 0) >= C.ION_MAX_STACKS) catchIds.push(deck[idx].id); // volle Karte → Fang statt Ionisierung
    else bumps[idx] = (bumps[idx] || 0) + 1;
    remaining -= 1;
  }
  if (remaining > 0) {
    // Fallback: nicht genug ungespielte Karten → Rest auf bereits ionisierte Karten (deckweit).
    // (Blitzfänger greift bewusst NUR im Hauptzug — der Fallback trifft evtl. schon gespielte Karten.)
    let ionized = deck.map((_, i) => i).filter((i) => (deck[i].ionStacks || 0) > 0 || bumps[i]);
    while (remaining > 0 && ionized.length > 0) {
      const j = Math.floor(rng() * ionized.length);
      const idx = ionized.splice(j, 1)[0];
      bumps[idx] = (bumps[idx] || 0) + 1;
      remaining -= 1;
    }
  }
  const newDeck = deck.map((c, i) => (bumps[i] ? { ...c, ionStacks: Math.min(C.ION_MAX_STACKS, (c.ionStacks || 0) + bumps[i]) } : c));
  return { deck: newDeck, catchIds };
}
export function ionizeCards(deck, undrawn, count, rng) {
  return ionizeCore(deck, undrawn, count, rng, false).deck;
}
// Blitzfänger-Variante (#165): liefert { deck, catchIds } — catchIds = card.id je vollem Fang im Hauptzug.
export function ionizeCardsWithCatch(deck, undrawn, count, rng) {
  return ionizeCore(deck, undrawn, count, rng, true);
}
