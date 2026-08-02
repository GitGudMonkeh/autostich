import * as C from "./constants.js";
import { shuffle } from "./deck.js";

// Deutsche Zahlformatierung (1.08 → „1,08") — driftgefährdete Beschreibungszahlen aus den Konstanten interpolieren.
const de = (x) => String(x).replace(".", ",");

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
    desc: "Jeder Crit erzeugt +1 Ladung. Der zuverlässige Crit-Generator.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, chargeOnCrit: () => 1 },
  SK_LIGHTNING_08: { id: "SK_LIGHTNING_08", name: "Statische Aufladung", archetype: "lightning", keywords: ["charge"],
    desc: "Jeder Sieg ohne Crit erzeugt +1 Ladung — hält den Sturm am Bauen, auch wenn die Crits kalt bleiben.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, staticCharge: true },
  SK_LIGHTNING_05: { id: "SK_LIGHTNING_05", name: "Reststrom", archetype: "lightning", keywords: ["charge"],
    desc: `Nach jedem vollen Verbrauch bleiben ${C.REST_CHARGE_FLOOR} Ladung als Boden erhalten (statt 0).`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, chargeFloor: () => C.REST_CHARGE_FLOOR },
  SK_LIGHTNING_06: { id: "SK_LIGHTNING_06", name: "Gewitterfront", archetype: "lightning", keywords: ["charge", "crit"],
    desc: `Jeder Ladungsverbrauch gibt dauerhaft +Crit-Chance (bis Cap) und +${C.STORM_SCORE} Score auf die nächsten ${C.STORM_SCORE_WINS} Siege.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, storm: true },
  SK_LIGHTNING_10: { id: "SK_LIGHTNING_10", name: "Entladung", archetype: "lightning", keywords: ["charge", "crit"],
    desc: "Nach vollem Verbrauch bekommt der nächste Crit +1,0× Crit-Multiplikator.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, discharge: true },
  // Linie 2 — Konsumenten (volle Ladung → Payoff; max 1 im Build)
  SK_LIGHTNING_02: { id: "SK_LIGHTNING_02", name: "Ionisierung", archetype: "lightning", keywords: ["charge", "ionize"],
    desc: "Bei voller Ladung 2 ungespielte Karten ionisieren, dann Ladung verbrauchen. Die Ionis.-Saat.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, onFullCharge: "ionize", ionizeCount: () => C.ION_BASE_COUNT },
  SK_LIGHTNING_07: { id: "SK_LIGHTNING_07", name: "Geladene Serie", archetype: "lightning", keywords: ["charge", "streak"],
    desc: "Bei voller Ladung wird deine Serie geschützt — die nächste Niederlage setzt sie nicht zurück. Die Ladung wird sofort verbraucht.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, onFullCharge: "protectStreak" },
  // Linie 3 — Ionisierung (Breite · Tiefe · Überlauf · Konsum)
  SK_LIGHTNING_03: { id: "SK_LIGHTNING_03", name: "Kettenblitz", archetype: "lightning", keywords: ["ionize"],
    desc: `Wenn Karten ionisiert werden, werden +${C.KETTENBLITZ_COUNT} weitere Karten ionisiert (Breite).`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, enabler: "SK_LIGHTNING_02", ionizeCount: () => C.KETTENBLITZ_COUNT },
  SK_LIGHTNING_12: { id: "SK_LIGHTNING_12", name: "Spannungsbogen", archetype: "lightning", keywords: ["ionize"],
    desc: "Gewinnt eine ionisierte Karte, springt ein Stapel auf ihren Nachfolger (Tiefe). Volle (5) Karten werden übersprungen.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, voltageArc: true },
  SK_LIGHTNING_11: { id: "SK_LIGHTNING_11", name: "Blitzfänger", archetype: "lightning", keywords: ["ionize", "charge"],
    desc: `Eine volle Karte (5) wird statt weiter ionisiert zu +${C.BLITZFAENGER_VALUE} Stichwert und +1 Ladung. Die volle Karte als Dauer-Score-Motor.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, blitzcatcher: true },
  SK_LIGHTNING_09: { id: "SK_LIGHTNING_09", name: "Kurzschluss", archetype: "lightning", keywords: ["ionize", "charge"],
    desc: "Eine volle Karte (5) entlädt beim Sieg alle Stapel → +Ladung-Burst, Karte auf 0 zurück. Zyklus statt Sättigung.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, kurzschluss: true },
  // Linie 4 — Crit-Maschine (Chance & Mult erzeugen — Blitz-exklusiv)
  SK_LIGHTNING_13: { id: "SK_LIGHTNING_13", name: "Spannungsstau", archetype: "lightning", keywords: ["crit"],
    desc: `Jeder Sieg ohne Crit gibt +${Math.round(C.SPANNUNGSSTAU_STEP * 100)} pp Crit-Chance für den nächsten Sieg (bis +${Math.round(C.SPANNUNGSSTAU_CAP * 100)} pp); ein Crit entlädt & resettet. Dürre spart sich auf.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, spannungsstau: true },
  SK_LIGHTNING_14: { id: "SK_LIGHTNING_14", name: "Überschlag", archetype: "lightning", keywords: ["crit", "charge"],
    desc: "Crit-Chance-Überschuss über 100 % wird in Ladung umgewandelt. Belohnt All-in auf Crit-Chance.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, ueberschlag: true },
  // Linie 5 — Kaskade (Verkabelung — Ereignis zündet Ereignis)
  SK_LIGHTNING_04: { id: "SK_LIGHTNING_04", name: "Überspannung", archetype: "lightning", keywords: ["charge", "ionize", "crit"],
    desc: "Ein Crit auf oder direkt neben einer ionisierten Karte erzeugt zusätzliche Ladung. Crit×Ionis.-Brücke.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, ueberspannung: true },
  SK_LIGHTNING_15: { id: "SK_LIGHTNING_15", name: "Blitzschlag", archetype: "lightning", keywords: ["crit", "ionize"],
    desc: "Ein Crit ionisiert die gewonnene Karte — schließt die Selbstspeisung (Crit → Ionis. → ionis. Sieg → …).",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, blitzschlag: true },
  // Linie 6 — Serie-Schnittstelle (Serie → Blitz-Währung)
  SK_LIGHTNING_16: { id: "SK_LIGHTNING_16", name: "Dauerstrom", archetype: "lightning", keywords: ["charge", "streak"],
    desc: `Jeder Sieg in Folge gibt +1 Ladung je ${C.DAUERSTROM_PER_STREAK} Serienpunkte (höchstens +${C.DAUERSTROM_MAX}/Sieg) — die Serie speist den Akku.`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, dauerstrom: true },
  SK_LIGHTNING_17: { id: "SK_LIGHTNING_17", name: "Wetterleuchten", archetype: "lightning", keywords: ["ionize", "streak"],
    desc: `Bei jeder ${C.WETTERLEUCHTEN_THRESHOLD}. Serienstufe werden ${C.WETTERLEUCHTEN_COUNT} Karten ionisiert — die Serie zündet Ionisierung (Schwellen-Burst).`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, wetterleuchten: true },
  // Legendäre (Verstärker, kein Motor)
  SK_LIGHTNING_L01: { id: "SK_LIGHTNING_L01", name: "Donnergott", archetype: "lightning", legendary: true, keywords: ["charge", "crit"],
    desc: "Maximale Ladung 10 → 15, dafür dauerhaft +1,0× Crit-Multiplikator. Konsumenten lösen erst bei 15 aus.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, thunderGod: true },
  SK_LIGHTNING_L02: { id: "SK_LIGHTNING_L02", name: "Doppelentladung", archetype: "lightning", legendary: true, keywords: ["charge", "ionize"],
    desc: `Bei vollem Ladungsverbrauch feuert der Konsument ${C.DOPPELENTLADUNG_FACTOR}-fach (${C.DOPPELENTLADUNG_FACTOR}× Ionisierungs-Anzahl). Und je mehr Ladung im Feld steht (Σ Ionisierungsstapel), desto mehr zahlt jeder Sieg mit ionisierter Karte direkt: +${C.DOPPELENT_DIRECT} je Stapel im Feld (gedeckelt ${C.DOPPELENT_FIELD_CAP}, skaliert mit deinem Bekenntnis).`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, doubleDischarge: true },
  SK_LIGHTNING_L03: { id: "SK_LIGHTNING_L03", name: "Flächenionisation", archetype: "lightning", legendary: true, keywords: ["ionize"],
    desc: `Gewinnt eine ionisierte Karte, springen ihre Stapel auf alle ungespielten Nachbarn (statt nur einen). Und je breiter das ionisierte Feld (mehr ionisierte Karten), desto mehr zahlt jeder Sieg mit ionisierter Karte direkt: +${C.FLAECHENION_DIRECT} je ionisierte Karte (gedeckelt ${C.FLAECHENION_FIELD_CAP}, skaliert mit deinem Bekenntnis).`,
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, areaIonize: true },
  SK_LIGHTNING_L04: { id: "SK_LIGHTNING_L04", name: "Durchschlag", archetype: "lightning", legendary: true, keywords: ["ionize", "crit"],
    desc: "Gewinnt eine Karte mit voller Ionisierung (5) und Crit, gibt sie dauerhaft +0,25× Crit-Multiplikator. Harte Doppelbedingung.",
    critChance: () => C.LIGHTNING_CRIT_PER_SKILL, durchschlag: true },

  // ---- Feuer-Rework (v0) — „Hitze belohnt totale Überlegenheit." 21 Skills auf 7 Linien.
  //      Flags werden in skills.js-Helfern (heatGainFor/heatLossFor/fireScoreFor) + engine.js gelesen. ----
  // Linie 1 — Generation (Marge · Konstanz · Serie)
  SK_FIRE_01: { id: "SK_FIRE_01", name: "Glut", archetype: "fire", keywords: ["heat"],
    desc: "Siege erzeugen +50 % Hitze (Hitzegewinn ×1,5).", emberBoost: true },
  SK_FIRE_02: { id: "SK_FIRE_02", name: "Zunder", archetype: "fire", keywords: ["heat"],
    desc: "Jeder Sieg gibt +2 % Hitze — auch knappe Siege zünden.", zunder: true },
  SK_FIRE_03: { id: "SK_FIRE_03", name: "Feuersturm", archetype: "fire", keywords: ["heat", "streak"],
    desc: "Jeder Sieg in Folge gibt +1 % mehr Hitze (bis +5 %); eine Niederlage setzt zurück.", feuersturm: true },
  // Linie 2 — Verteidigung (abschirmen · kontern)
  SK_FIRE_04: { id: "SK_FIRE_04", name: "Glutbett", archetype: "fire", keywords: ["heat"],
    desc: "Niederlagen kosten nur die halbe Hitze; unter 30 % Hitze gar keine.", glutbett: true },
  SK_FIRE_05: { id: "SK_FIRE_05", name: "Rückzündung", archetype: "fire", keywords: ["heat"],
    desc: "Nach einer Niederlage gibt der nächste Sieg +1 % Hitze je Wert-Rückstand und die Karte +2 Stichwert.", rueckzuendung: true },
  // Linie 3 — Schwellen-Payoffs (hohe Hitze → Belohnung)
  SK_FIRE_06: { id: "SK_FIRE_06", name: "Glühende Klinge", archetype: "fire", keywords: ["heat"],
    desc: "Alle deine Karten +Stichwert je nach Hitze: +1 ab 40 %, +2 ab 70 %, +3 bei 100 %.", glowingBlade: true },
  SK_FIRE_07: { id: "SK_FIRE_07", name: "Weißglut", archetype: "fire", keywords: ["heat"],
    desc: `Bei voller Hitze wird jeder Überschuss zu Score: +${C.WHITEHEAT_PER_POINT} pro überlaufendem Hitzepunkt.`, whiteHeat: true },
  // Linie 4 — Wert-/Score-Motoren
  SK_FIRE_08: { id: "SK_FIRE_08", name: "Feuerwalze", archetype: "fire", keywords: ["heat"],
    desc: "Ab 40 % Hitze gibt jeder Sieg der nächsten Karte +1 Stichwert, steigend bis +3; eine Niederlage setzt zurück.", fireRoll: true },
  SK_FIRE_09: { id: "SK_FIRE_09", name: "Verbrennung", archetype: "fire", keywords: ["heat"],
    desc: "Große Vorsprünge geben mehr Feuer-Score: ×1,5 ab 8, ×2 ab 12 Wertvorsprung.", verbrennung: true },
  SK_FIRE_10: { id: "SK_FIRE_10", name: "Funkenflug", archetype: "fire", keywords: ["heat"],
    desc: "Siege in Folge speichern Feuer-Score. Ein Sieg mit ≥8 Vorsprung entlädt ihn voll, eine Niederlage zur Hälfte.", sparkflight: true },
  // Linie 5 — Konsumenten (max 1 im Build — Burst vs. Drip)
  SK_FIRE_11: { id: "SK_FIRE_11", name: "Flächenbrand", archetype: "fire", keywords: ["heat", "consume"],
    desc: `Ab ${C.CONFLAG_MIN_HEAT} % Hitze verbrennt der nächste Sieg deine ganze Hitze für +${C.CONFLAG_PER_HEAT} Score je Hitzepunkt (voll ≈ +${C.CONFLAG_PER_HEAT * C.HEAT_MAX}).`, heatConsumer: "conflagration" },
  SK_FIRE_12: { id: "SK_FIRE_12", name: "Schmelzpunkt", archetype: "fire", keywords: ["heat", "consume"],
    desc: `Vor jedem Stich −${C.MELT_COST} % Hitze für +${C.MELT_PER_HEAT} Score je verbrauchtem Hitzepunkt (≈ +${C.MELT_COST * C.MELT_PER_HEAT}).`, heatConsumer: "melt" },
  // Linie 6 — Verbrennen → Schmieden (Brand · Asche · Schmiede)
  SK_FIRE_13: { id: "SK_FIRE_13", name: "Brandmal", archetype: "fire", keywords: ["heat", "brand", "ash"],
    desc: `Jeder Sieg brandmarkt eine Gegnerkarte (−${C.BRAND_VALUE} Wert) und gibt +${C.BRAND_ASH} Asche.`, brandmal: true },
  SK_FIRE_14: { id: "SK_FIRE_14", name: "Lauffeuer", archetype: "fire", keywords: ["heat", "brand", "ash"],
    desc: "Brandmarken greifen auf eine Nachbarkarte über (−1 Wert) und geben +1 Asche.", enabler: "SK_FIRE_13", lauffeuer: true },
  SK_FIRE_15: { id: "SK_FIRE_15", name: "Ascheschmiede", archetype: "fire", keywords: ["heat", "forge", "ash"],
    desc: `Am Ende jedes Durchlaufs: solange du ≥${C.FORGE_COST} Asche hast, erhält jeweils deine niedrigste Karte dauerhaft +${C.FORGE_VALUE} Kartenwert (mehrfach hintereinander, wandert über die tiefen Karten).`, ascheschmiede: true },
  SK_FIRE_16: { id: "SK_FIRE_16", name: "Glutstahl", archetype: "fire", keywords: ["heat", "forge"],
    desc: `Geschmiedete Karten geben bei Sieg +${C.GLUTSTAHL_PER_VALUE} Score je geschmiedetem Wert.`, enabler: "SK_FIRE_15", glutstahl: true },
  SK_FIRE_17: { id: "SK_FIRE_17", name: "Schmelzofen", archetype: "fire", keywords: ["heat", "brand", "forge", "ash"],
    desc: "Ab 50 % Hitze brennen Brände stärker (−1 Wert, +1 Asche) und Schmieden kostet 1 Asche weniger.", schmelzofen: true },
  // Legendäre (umgeformt: dauerhaft/compoundend/direkt — je eine eigene Achse & Feuer-Playstyle)
  SK_FIRE_L01: { id: "SK_FIRE_L01", name: "Sonnenkern", archetype: "fire", legendary: true, keywords: ["heat"],
    desc: "Beendest du einen Durchlauf mit hoher Hitze, brennt sie sich dauerhaft in deine tiefen Karten (+Kartenwert bis zum Deckel) — dein Deck wird über den Run heiß & stark. Halte-Motor.", suncore: true },
  SK_FIRE_L02: { id: "SK_FIRE_L02", name: "Phönixfeuer", archetype: "fire", legendary: true, keywords: ["heat"],
    desc: "Niederlagen nehmen dir keine Hitze — sie geben welche (je Rückstandspunkt). Aus jeder Niederlage steigst du heißer auf; zusätzlich entzündet verbrauchte Hitze 1×/Durchlauf neu.", phoenix: true },
  SK_FIRE_L03: { id: "SK_FIRE_L03", name: "Sonnenzorn", archetype: "fire", legendary: true, keywords: ["heat"],
    desc: "Dein gesamter Sieg-Score wächst dauerhaft mit der höchsten Hitze, die du je gehalten hast (Peak 100 → bis ×2). Treib die Hitze hoch, dann bleibt der Zorn.", sunwrath: true },
  SK_FIRE_L04: { id: "SK_FIRE_L04", name: "Damaststahl", archetype: "fire", legendary: true, keywords: ["heat", "forge", "ash"],
    desc: `Schmiedet selbst (ohne Asche) deine tiefsten Karten und gibt geschmiedeten Karten einen Kampf-Bonus — sie schlagen über ihrem Gewicht. Jeder Sieg zahlt +${C.DAMASCUS_DIRECT} Score je Punkt Gesamt-Schmiedewert. Asche verfällt nie.`, damascus: true },

  // ---- Eis-Rework (v0) — „Gletscher: Architektur × Permanenz." Spine = SCHICHTEN je Frostkarte (permanent,
  //      unverlierbar). Kein Konsument. Flags in engine.js/reducer.js/formations.js gelesen. 21 Skills auf 7 Linien.
  // Linie 1 — Zugang (mehr Anker · Meißel · Bank)
  SK_ICE_01: { id: "SK_ICE_01", name: "Frostgriff", archetype: "ice", keywords: ["freeze"],
    desc: "Friert beim Aktivieren +2 weitere eigene Karten ein — mehr Anker, mehr Meißel, mehr Bank.", frostGrip: true },
  SK_ICE_02: { id: "SK_ICE_02", name: "Frostwahl", archetype: "ice", keywords: ["freeze"],
    desc: "Du wählst selbst, welche eigenen Karten einfrieren, statt sie dem Zufall zu überlassen — Architektur schon beim Einfrieren.", frostwahl: true },
  SK_ICE_03: { id: "SK_ICE_03", name: "Gleitfrost", archetype: "ice", keywords: ["freeze"],
    desc: `Jede Frostkarte bekommt einen zweiten kostenlosen Frosttausch; jeder ungenutzte Tausch lagert +${C.ICE_UNUSED_SWAP_LAYER} Schicht ab.`, gleitfrost: true },
  // Linie 2 — Architektur (Frosttausch meißelt Formationen → Permanenz)
  SK_ICE_04: { id: "SK_ICE_04", name: "Gletscherschub", archetype: "ice", keywords: ["freeze", "formation"],
    desc: "Schafft ein Frosttausch am neuen Platz eine neue Formation, lagert die versetzte Karte sofort eine Schicht ab — meißeln zahlt permanent.", glacierPush: true },
  SK_ICE_05: { id: "SK_ICE_05", name: "Verzahnung", archetype: "ice", keywords: ["freeze", "formation"],
    desc: "Bringt ein Frosttausch eine Frostkarte in eine zweite Formation (Überlappung), gibt es eine Bonus-Schicht.", verzahnung: true },
  SK_ICE_06: { id: "SK_ICE_06", name: "Kaltfront", archetype: "ice", keywords: ["freeze"],
    desc: "Nach einem Frosttausch erhalten die versetzte Karte und ihr neuer Nachbar diesen Durchlauf +3 Stichwert, damit die frische Platzierung greift.", kaltfront: true },
  // Linie 3 — Permanenz (Schichten ablagern — der Spine, verliert nie)
  SK_ICE_07: { id: "SK_ICE_07", name: "Kältereserve", archetype: "ice", keywords: ["freeze"],
    desc: `Verliert eine Frostkarte, lagert sie trotzdem +${C.KAELTERESERVE_LAYER} Schicht ab — der Gletscher wächst auch in der Niederlage.`, frostReserve: true },
  SK_ICE_08: { id: "SK_ICE_08", name: "Beständigkeit", archetype: "ice", keywords: ["freeze", "formation"],
    desc: "Siegt eine Frostkarte in einer Formation wie im Vordurchlauf, lagert sie eine zusätzliche Schicht ab. Belohnt stehende Formationen.", bestaendigkeit: true },
  SK_ICE_09: { id: "SK_ICE_09", name: "Verdichtung", archetype: "ice", keywords: ["freeze"],
    desc: `Nicht eingelöste Frosttausche lagern die ${C.VERDICHTUNG_FACTOR}-fache Schicht ab (+${C.ICE_UNUSED_SWAP_LAYER * C.VERDICHTUNG_FACTOR} statt +${C.ICE_UNUSED_SWAP_LAYER}) — Geduld verdichtet Schnee zu Gletschereis.`, verdichtung: true },
  // Linie 4 — Schicht-Schwellen (tiefe Schichten → großer Payout, kein Konsum)
  SK_ICE_10: { id: "SK_ICE_10", name: "Eisdruck", archetype: "ice", keywords: ["freeze", "formation"],
    desc: `Je Schicht einer Frostkarte +${Math.round(C.EISDRUCK_STEP * 100)} % Formationsfaktor (wirksam bis ${C.ICE_LAYER_MAX} Schichten) — tiefe Pfeiler scoren groß.`, eisdruck: true },
  SK_ICE_11: { id: "SK_ICE_11", name: "Kristalline Masse", archetype: "ice", keywords: ["freeze"],
    desc: `Ab ${C.KRISTALLINE_THRESHOLD} Schichten insgesamt (über alle Frostkarten) erhalten alle Frostkarten +${C.KRISTALLINE_VALUE} Stichwert. Belohnt breiten Aufbau.`, kristallineMasse: true },
  // Linie 5 — Formations-Interface (Joker & Segment-Brücke)
  SK_ICE_12: { id: "SK_ICE_12", name: "Kristallform", archetype: "ice", keywords: ["freeze", "formation"],
    desc: `Eine Frostkarte wirkt als Joker für Formationen (±${C.CRYSTAL_OFFSET} Wert-Flex) — verdient, nicht gratis wie ein Perk.`, kristallform: true },
  SK_ICE_13: { id: "SK_ICE_13", name: "Frostbrücke", archetype: "ice", keywords: ["freeze", "formation"],
    desc: "Eine Frostkarte am Segmentrand verbindet die Formation ins nächste Segment.", frostbridge: true },
  // Linie 6 — Überlappung / Anker (stehende Formationen zahlen)
  SK_ICE_14: { id: "SK_ICE_14", name: "Eisanker", archetype: "ice", keywords: ["freeze", "formation"],
    desc: "Eine Frostkarte kann als Anker stehen (×1,25) und lagert dabei garantiert eine Schicht ab — auch ohne volle Formation.", iceAnchor: true },
  SK_ICE_15: { id: "SK_ICE_15", name: "Stillstand", archetype: "ice", keywords: ["freeze", "formation"],
    desc: `Siegt eine Frostkarte in ≥1 Formation, gibt es +${C.STILLSTAND_SCORE} Direkt-Score — bewusst flach, stützt das schwache frühe Spiel.`, standstill: true },
  SK_ICE_16: { id: "SK_ICE_16", name: "Eisblüte", archetype: "ice", keywords: ["freeze", "formation"],
    desc: `Siegt eine Frostkarte in ≥2 Formationen, lagern ihre direkten (gefrorenen) Nachbarn je +${C.EISBLUETE_LAYER} Schicht ab.`, iceBloom: true },
  SK_ICE_17: { id: "SK_ICE_17", name: "Verschränkung", archetype: "ice", keywords: ["freeze", "formation"],
    desc: `Steht eine Frostkarte an der Kreuzung von ≥3 Formationen, lagert sie +${C.VERSCHRAENKUNG_LAYERS} Schichten auf einmal ab — das Meisterstück.`, verschraenkung: true },
  // Legendäre (vier Seiten des Spine — verwandeln die tiefen Schichten in DIREKTEN Score)
  SK_ICE_L01: { id: "SK_ICE_L01", name: "Permafrost", archetype: "ice", legendary: true, keywords: ["freeze"],
    desc: `Jede Ablage lagert +${C.PERMAFROST_LAYER_BONUS} zusätzliche Schichten ab (der Motor der Permanenz). Je mehr Schichten du über alle Frostkarten anhäufst, desto mehr zahlt jeder Frost-Sieg direkt: +${C.PERMAFROST_DIRECT} je Überlauf-Schicht (Σ über alle Frostkarten, gedeckelt ${C.PERMAFROST_OVERFLOW_CAP}, skaliert mit deinem Bekenntnis).`, permafrost: true },
  SK_ICE_L02: { id: "SK_ICE_L02", name: "Gletscher", archetype: "ice", legendary: true, keywords: ["freeze"],
    desc: `Je tiefer der Stapel, desto mehr gibt jede Schicht (superlinear). Dein tiefster Pfeiler zahlt bei jedem Frost-Sieg direkt: +${C.GLETSCHER_DIRECT} je Tiefenstufe, superlinear aufsummiert (Tiefe gedeckelt ${C.GLETSCHER_OVERFLOW_CAP}, skaliert mit deinem Bekenntnis) — je tiefer, desto überproportional mehr.`, gletscher: true },
  SK_ICE_L03: { id: "SK_ICE_L03", name: "Vergletscherung", archetype: "ice", legendary: true, keywords: ["freeze"],
    desc: `Frostkarten frieren Gegnerkarten proportional zu ihren Schichten ein (−Wert). Je mehr Gegner-Eis aktiv ist, desto mehr zahlt jeder Frost-Sieg direkt: +${C.VERGLETSCHERUNG_DIRECT} je Punkt aktiver Gegner-Vergletscherung (gedeckelt ${C.VERGLETSCHERUNG_DEBUFF_CAP}, skaliert mit deinem Bekenntnis).`, vergletscherung: true },
  SK_ICE_L04: { id: "SK_ICE_L04", name: "Architekt", archetype: "ice", legendary: true, keywords: ["freeze", "formation"],
    desc: `Schaltet vertikale Formationen frei: Frostkarten in derselben Spalte (pos%5) bilden Formationen quer über Segmente — je zusätzliche Frostkarte in der Spalte +${Math.round(C.ARCHITEKT_STEP * 100)} % Formationsfaktor.`, architekt: true },

  // ---- Pflanze-Fraktion (v0) — „Der Garten, der sich selbst überwuchert." NEU (4. Fraktion). Wachstum (nur steigend)
  //      → Reife (grün) → Farbblock → Score. Grün = Farbe, nicht Kraft; Wert nur über Wurzeln (Deckel 11).
  //      Grundmechanik: Alter Anker (Aktivierung startet 1 reife Karte). Flags in engine/formations/reducer gelesen. ----
  // Linie 1 — Wurzeln (Tiefe: Wert & Wurzeln-Score)
  SK_PLANT_01: { id: "SK_PLANT_01", name: "Wurzelschlag", archetype: "plant", keywords: ["growth", "value"],
    desc: `Grüne Karten wachsen bei Sieg permanenten Kartenwert an (+1 je ${C.WURZELSCHLAG_PER_GROWTH} Wachstum, bis Kartenwert ${C.PLANT_VALUE_CAP}). Der Wert-Motor.`, wurzelschlag: true },
  SK_PLANT_02: { id: "SK_PLANT_02", name: "Wurzeltiefe", archetype: "plant", keywords: ["growth", "score"],
    desc: `Jeder Sieg einer grünen Karte gibt zusätzlich +${C.WURZELTIEFE_SCORE} Direkt-Score (Wurzeln-Score). Schaltet den Score-Ertrag reifer Pflanzen frei.`, wurzeltiefe: true },
  SK_PLANT_03: { id: "SK_PLANT_03", name: "Pfahlwurzel", archetype: "plant", keywords: ["growth", "score", "formation"],
    desc: "Verstärker: Wurzeln-Score ×2, wenn die grüne Karte in einer Formation gewinnt.", enabler: "SK_PLANT_02", pfahlwurzel: true },
  SK_PLANT_04: { id: "SK_PLANT_04", name: "Jahresringe", archetype: "plant", keywords: ["growth", "score"],
    desc: `Verstärker: Je ${C.JAHRESRINGE_PER_GROWTH} Wachstum einer Karte dauerhaft +${C.JAHRESRINGE_SCORE} Wurzeln-Score — nur für diese Karte. Alte Pflanzen zahlen am meisten.`, enabler: "SK_PLANT_02", jahresringe: true },
  // Linie 2 — Aussaat (Breite: Wachstum verbreiten)
  SK_PLANT_05: { id: "SK_PLANT_05", name: "Aussaat", archetype: "plant", keywords: ["growth"],
    desc: "Gewinnt eine grüne Karte, sät sie beide Nachbarn: +1 Wachstum je Seite. Der Breiten-Motor.", aussaat: true },
  SK_PLANT_06: { id: "SK_PLANT_06", name: "Flugsamen", archetype: "plant", keywords: ["growth"],
    desc: "Verstärker: Aussaat überspringt schon grüne Karten und sät die nächste noch-graue dahinter.", enabler: "SK_PLANT_05", flugsamen: true },
  SK_PLANT_07: { id: "SK_PLANT_07", name: "Setzlingsbeet", archetype: "plant", keywords: ["growth"],
    desc: "Die niedrigste Karte je Segment startet den Lauf mit +3 Wachstum Vorsprung. Anschub für schwache Setzlinge.", setzlingsbeet: true },
  SK_PLANT_08: { id: "SK_PLANT_08", name: "Zäher Halm", archetype: "plant", keywords: ["growth"],
    desc: "Unreife (graue) Karten wachsen auch bei Niederlage +1 — bis sie grün sind. Der Garten wächst durch Widrigkeit.", zaeherHalm: true },
  // Linie 3 — Ranken/Blüte (Grün verbreiten)
  SK_PLANT_09: { id: "SK_PLANT_09", name: "Ranken", archetype: "plant", keywords: ["green"],
    desc: "Gewinnt eine grüne Karte, färbt sie einen noch-grauen Nachbarn sofort grün. Baut den Farbblock aktiv auf.", ranken: true },
  SK_PLANT_10: { id: "SK_PLANT_10", name: "Blüte", archetype: "plant", keywords: ["green", "score"],
    desc: `Gewinnt eine grüne Karte, deren Nachbarn schon grün sind, blüht sie: +${C.BLUETE_SCORE} Score je grüner Karte im Segment.`, bluete: true },
  SK_PLANT_11: { id: "SK_PLANT_11", name: "Blütezeit", archetype: "plant", keywords: ["green", "score", "formation"],
    desc: "Verstärker: Blüte-Score ×2, wenn die Karte in einer Formation gewinnt.", enabler: "SK_PLANT_10", bluetezeit: true },
  // Linie 4 — Überwucherung (Mono-Grün-Payoff)
  SK_PLANT_12: { id: "SK_PLANT_12", name: "Photosynthese", archetype: "plant", keywords: ["green", "formation"],
    desc: `Grüne Karten in einer Formation geben zusätzlich ×${de(C.PHOTOSYNTHESE_MULT)} Score. Der Grün-Formations-Multiplikator.`, photosynthese: true },
  SK_PLANT_13: { id: "SK_PLANT_13", name: "Blätterdach", archetype: "plant", keywords: ["green", "formation", "score"],
    desc: `In einem grünen Farbblock ab ${C.BLAETTERDACH_MIN} Karten gibt jede grüne Karte bei Sieg zusätzlich +${C.BLAETTERDACH_SCORE} Score je Karte im Block.`, blaetterdach: true },
  SK_PLANT_14: { id: "SK_PLANT_14", name: "Überwucherung", archetype: "plant", keywords: ["green", "formation", "overgrowth"],
    desc: "Ist das Feld ≥66 % grün, werden alle Farbblöcke stärker (+0,20 Faktor) und Blüte zählt doppelt.", ueberwucherung: true },
  // Linie 5 — Ausläufer (Gegnerdeck: kolonisieren & ernten)
  SK_PLANT_15: { id: "SK_PLANT_15", name: "Ausläufer", archetype: "plant", keywords: ["green", "colonize"],
    desc: `Gewinnt eine grüne Karte, kolonisiert sie die niedrigste Gegnerkarte. Besiegst du eine kolonisierte Karte, erntest du +${C.AUSLAEUFER_HARVEST} Wachstum.`, auslaeufer: true },
  SK_PLANT_16: { id: "SK_PLANT_16", name: "Rhizom", archetype: "plant", keywords: ["colonize"],
    desc: `Verstärker: Beim Ernten wird ein ebenfalls kolonisierter Gegner-Nachbar mitgeerntet — +${C.AUSLAEUFER_HARVEST} Wachstum extra.`, enabler: "SK_PLANT_15", rhizom: true },
  SK_PLANT_17: { id: "SK_PLANT_17", name: "Erntedank", archetype: "plant", keywords: ["colonize", "score"],
    desc: `Verstärker: Erntest du mit einer reifen Karte, gibt es zusätzlich +${C.ERNTEDANK_SCORE} Direkt-Score.`, enabler: "SK_PLANT_15", erntedank: true },
  // Legendäre (Reshape 2026-07-30: lesen die verschwendeten Fluten — Überlauf-Wachstum/Grün-Feld/Kolonie — und zahlen je grünem Sieg DIREKT)
  SK_PLANT_L01: { id: "SK_PLANT_L01", name: "Weltenbaum", archetype: "plant", legendary: true, keywords: ["growth"],
    desc: `Am Ende jedes Durchlaufs wächst der ganze Wald (+1 Wachstum je ${C.WELTENBAUM_PER_GREEN} grüne im Feld). Und je mehr Überschuss-Wachstum dein alter Wald über den Wert-Deckel angehäuft hat, desto mehr zahlt jeder grüne Sieg direkt: +${de(C.WELTENBAUM_DIRECT)} je Überlauf-Wachstum (gedeckelt ${C.WELTENBAUM_OVERFLOW_CAP}, skaliert mit deinem Bekenntnis).`, weltenbaum: true },
  SK_PLANT_L02: { id: "SK_PLANT_L02", name: "Mutterbaum", archetype: "plant", legendary: true, keywords: ["growth", "score"],
    desc: `Ist deine höchstgewachsene Karte am Zug, verdoppelt sie ihren Wurzeln-Score. Und je tiefer dein ältester Baum über den Wert-Deckel gewachsen ist, desto mehr zahlt jeder grüne Sieg direkt: +${C.MUTTERBAUM_DIRECT} je Überlauf-Wachstum des tiefsten Baums (gedeckelt ${C.MUTTERBAUM_OVERFLOW_CAP}, skaliert mit deinem Bekenntnis).`, mutterbaum: true },
  SK_PLANT_L03: { id: "SK_PLANT_L03", name: "Dornenkönig", archetype: "plant", legendary: true, keywords: ["colonize"],
    desc: `Das ganze Gegnerdeck startet kolonisiert; jede Ernte verbraucht ihren Marker. Und je mehr Gegnerkarten unter deiner Kolonie stehen, desto mehr zahlt jeder grüne Sieg direkt: +${C.DORNENKOENIG_DIRECT} je kolonisierte Gegnerkarte (gedeckelt ${C.DORNENKOENIG_COLON_CAP}, skaliert mit deinem Bekenntnis).`, dornenkoenig: true },
  SK_PLANT_L04: { id: "SK_PLANT_L04", name: "Ewiger Frühling", archetype: "plant", legendary: true, keywords: ["green", "formation", "overgrowth", "eternalSpring"],
    desc: `Farbblock zählt Grün schon ab 2 Karten, Überwucherung ab 25 % Feld. Und je größer dein ewig-grünes Feld (mehr grüne Karten), desto mehr zahlt jeder grüne Sieg direkt: +${C.EWIGER_FRUEHLING_DIRECT} je grüner Karte (gedeckelt ${C.EWIGER_FRUEHLING_FIELD_CAP}, skaliert mit deinem Bekenntnis).`, ewigerFruehling: true },
};

export const SKILL_LIST = Object.values(SKILL_DEFS);
export const archetypeOf = (id) => SKILL_DEFS[id]?.archetype || null;

/* Skill-Archetypen (#93). Metadaten (Theming/Label) — geteilte Quelle für SkillSelect & HUD.
   Alle drei Archetypen (Blitz/Feuer/Eis) sind vollständig ausgespielt (F0/F1/F3 abgeschlossen). */
export const ARCHETYPE_META = {
  lightning: { key: "lightning", label: "Blitz",  icon: "⚡", color: "#8a7de0" }, // violett/elektrisch
  fire:      { key: "fire",      label: "Feuer",  icon: "🔥", color: "#e0714a" }, // warm/orange-rot
  ice:       { key: "ice",       label: "Eis",    icon: "❄️", color: "#5ec8f0" }, // eis-blau
  plant:     { key: "plant",     label: "Pflanze", icon: "🌿", color: "#5ab87a" }, // grün/wachsend (v0)
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
   - 4 aktiv → nur die vier aktiven. */
export function offerArchetypes(activeArchetypes = [], available = [], rng = Math.random) {
  const active = (activeArchetypes || []).filter((a) => available.includes(a));
  if (active.length >= C.MAX_ARCHETYPES) return active.slice(0, C.MAX_ARCHETYPES);
  const picks = [...active];
  const pool = shuffle(available.filter((a) => !active.includes(a)), rng);
  while (picks.length < C.MAX_ARCHETYPES && pool.length) picks.push(pool.shift());
  return picks;
}

// Summe eines Skill-Hooks über die gehaltenen Skills (gleiche Shape wie Perk-Hooks).
export function skillSum(skills, name, ctx) {
  let t = 0;
  for (const id of skills || []) { const f = SKILL_DEFS[id]?.[name]; if (f) t += f(ctx); }
  return t;
}

// Frischer Blitz-Substate — inaktiv. Wird beim ersten Blitz-Skill aktiviert (Reducer).
// armed = Serien-Rahmen (Geladene Serie); storm* = Gewitterfront; dischargeArmed = Entladung (crit-mult);
// stauBonus = Spannungsstau-Rampe (Crit-Chance); durchschlagMult = Durchschlag-Dauer-Crit-Mult (Rework v0).
export function initLightning() {
  return { active: false, charge: 0, maxCharge: C.LIGHTNING_MAX_CHARGE, armed: false, stormCritBonus: 0, stormScoreWinsRemaining: 0,
    dischargeArmed: false, stauBonus: 0, durchschlagMult: 0 };
}

/* ---- Feuer-Archetyp (#93 F1) — Hitze-Substate + reine Helfer (testbar; Engine-Nutzung in resolveTrick) ---- */

// Frischer Hitze-Substate — inaktiv. Wird beim ersten Feuer-Skill aktiviert (Reducer).
// fireRoll = Feuerwalze-Stapel · sparkStore = Funkenflug-Speicher · phoenixUsed = Phönixfeuer (1×/Durchlauf).
export function initHeat() {
  return { active: false, value: 0, max: C.HEAT_MAX, fireRoll: 0, sparkStore: 0, phoenixUsed: false, peak: 0 };
}

// Anzahl gehaltener Feuer-Skills (Grundmechanik zählt nicht) & ob ein Feuer-Flag gehalten wird.
export const activeFireCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.archetype === "fire").length;
// Anzahl gehaltener Blitz-Skills — Bekenntnis-Skalierung der Blitz-Legendär-Dividende (cross-health, wie activeFireCount/iceSkillCount).
export const activeLightningCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.archetype === "lightning").length;
export const fireFlag = (skills, flag) => (skills || []).some((id) => SKILL_DEFS[id]?.[flag]);
// Hitze-Maximum (fix 100).
export const heatMaxFor = () => C.HEAT_MAX;
// Erster gehaltener Hitze-Konsument („conflagration"/„melt") oder null. #234: Feuer darf mehrere gleichzeitig halten →
// die Engine nutzt NICHT mehr diesen (First-only), sondern hasHeatConsumer je Typ. Hier nur noch für Kompatibilität.
export function heatConsumerOf(skills) {
  for (const id of skills || []) { const c = SKILL_DEFS[id]?.heatConsumer; if (c) return c; }
  return null;
}
// Anzahl gehaltener Hitze-Konsumenten (#234: informativ — nicht mehr im Reducer geblockt, seit Feuer mehrere halten darf).
export const heatConsumerCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.heatConsumer).length;
// Hält der Spieler den Hitze-Konsumenten `kind` ("conflagration"/"melt")? #234: mehrere gleichzeitig erlaubt (heben sich
// nicht auf) → die Engine prüft jeden Konsumenten EINZELN hiermit, statt nur den ersten (heatConsumerOf).
export const hasHeatConsumer = (skills, kind) => (skills || []).some((id) => SKILL_DEFS[id]?.heatConsumer === kind);

// Hitzegewinn bei Sieg (%). ctx = { winStreak, lostLast, deficit } für Serie/Rückzündung.
//  · Marge (ab HEAT_MIN_MARGIN): (min(Vorsprung, CAP)−2)×PER_POINT, Glut ×1,5 (kaufm. gerundet)
//  · Zunder: +2 % flach, AUCH bei knappen Siegen unter der Marge-Schwelle
//  · Feuersturm: +1 % je Serienstufe (bis +5 %)
//  · Rückzündung: nach einer Niederlage +1 % je Wert-Rückstand des Vorstichs
export function heatGainFor(margin, skills, ctx = {}) {
  let g = 0;
  if (margin >= C.HEAT_MIN_MARGIN) {
    let base = (Math.min(margin, C.HEAT_MARGIN_CAP) - 2) * C.HEAT_PER_POINT;
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
// Feuer-Flat-Score bei Sieg: (Vorsprung−FIRE_MARGIN_OFFSET) × (25 + 5×(FeuerSkills−1)), dann Verbrennung (×1,5/×2).
// 0 ohne Feuer-Skill. (Sonnenzorn wirkt jetzt als peak-hitze-Multiplikator in der Engine, nicht mehr hier.)
export function fireScoreFor(margin, skills, heatValue = 0) {
  const n = activeFireCount(skills);
  if (n === 0 || margin < C.HEAT_MIN_MARGIN) return 0;
  let s = (margin - C.FIRE_MARGIN_OFFSET) * (C.FIRE_SCORE_BASE + C.FIRE_SCORE_PER_SKILL * (n - 1));
  if (fireFlag(skills, "verbrennung")) s *= verbrennungMult(margin);
  return Math.round(s);
}
// Glühende-Klinge-Wertbonus nach Hitze (Stufen +1/+2/+3). Reiner Nicht-Legendär-Skill.
export function glowingValueFor(heatValue, skills) {
  if (!fireFlag(skills, "glowingBlade")) return 0;
  let v = 0;
  if (heatValue >= C.GLOWING_T1_HEAT) v = C.GLOWING_T1_VALUE;
  if (heatValue >= C.GLOWING_T2_HEAT) v = C.GLOWING_T2_VALUE;
  if (heatValue >= C.GLOWING_T3_HEAT) v = C.GLOWING_T3_VALUE;
  return v;
}
// Weißglut-Score aus Hitze-Überlauf: überlaufende Punkte × 10. Reiner Nicht-Legendär-Skill.
export function whiteHeatScore(overflow, skills, heatValue = 0) {
  if (overflow <= 0 || !fireFlag(skills, "whiteHeat")) return 0;
  return overflow * C.WHITEHEAT_PER_POINT;
}
// Schmieden: Asche-Kosten je Schmiedung (Schmelzofen-Rabatt ab 50 % Hitze, min 1).
export function forgeCostFor(skills, heatValue = 0) {
  let c = C.FORGE_COST;
  if (fireFlag(skills, "schmelzofen") && heatValue >= C.SCHMELZOFEN_MIN_HEAT) c -= C.SCHMELZOFEN_FORGE_DISCOUNT;
  return Math.max(1, c);
}

/* ---- Eis-Archetyp (#93 F3) — eingefrorene Karten (blau, an card.id) + reine Helfer ---- */

export const frozenCount = (deck) => (deck || []).filter((c) => c.frozen).length;
// Ein Eis-Flag/Prädikat + Anzahl gehaltener Eis-Skills (Grundmechanik zählt nicht).
export const iceFlag = (skills, flag) => (skills || []).some((id) => SKILL_DEFS[id]?.[flag]);
export const iceSkillCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.archetype === "ice").length;
// ---- Eis-Rework (v0): Flag-Prädikate (Engine/Reducer; Kristallform/Frostbrücke werden in formations.js gelesen). ----
export const hasFrostGrip        = (skills) => iceFlag(skills, "frostGrip");
export const hasFrostwahl        = (skills) => iceFlag(skills, "frostwahl");        // Einfrieren gezielt (niedrigste)
export const hasGleitfrost       = (skills) => iceFlag(skills, "gleitfrost");       // 2. Frosttausch + mehr Bank
export const hasGlacierPush      = (skills) => iceFlag(skills, "glacierPush");      // Tausch schafft Formation → Schicht
export const hasVerzahnung       = (skills) => iceFlag(skills, "verzahnung");       // Tausch → Überlappung → Schicht
export const hasKaltfront        = (skills) => iceFlag(skills, "kaltfront");        // Platzierhilfe +temp Wert
export const hasFrostReserve     = (skills) => iceFlag(skills, "frostReserve");     // Verlust → Schicht (Kältereserve)
export const hasBestaendigkeit   = (skills) => iceFlag(skills, "bestaendigkeit");   // gleiche Formation wie Vordurchlauf → Schicht
export const hasVerdichtung      = (skills) => iceFlag(skills, "verdichtung");      // Ablage-B ×2
export const hasEisdruck         = (skills) => iceFlag(skills, "eisdruck");         // Schichttiefe → Formationsfaktor
export const hasKristallineMasse = (skills) => iceFlag(skills, "kristallineMasse"); // Summe Schichten → Wert
export const hasIceAnchor        = (skills) => iceFlag(skills, "iceAnchor");        // Anker + garantierte Schicht
export const hasStandstill       = (skills) => iceFlag(skills, "standstill");       // Formations-Sieg → Flat
export const hasIceBloom         = (skills) => iceFlag(skills, "iceBloom");         // ≥2 Formationen → Nachbarn banken
export const hasVerschraenkung   = (skills) => iceFlag(skills, "verschraenkung");   // ≥3 Formationen → Multi-Schicht
export const hasPermafrost       = (skills) => iceFlag(skills, "permafrost");       // +1 Schicht je Ablage
export const hasGletscher        = (skills) => iceFlag(skills, "gletscher");        // Schicht-Dauerwert superlinear
export const hasVergletscherung  = (skills) => iceFlag(skills, "vergletscherung");  // Gegner-Debuff ∝ Schichten
export const hasArchitekt        = (skills) => iceFlag(skills, "architekt");        // vertikale Formationen (Spalte pos%5)
// Dauerwert einer Frostkarte aus ihren Schichten. Gletscher (L): superlinear (dreieckig), sonst linear.
export function layerValue(layers, gletscher = false) {
  const n = Math.min(layers || 0, C.ICE_LAYER_MAX); // Anti-Runaway v0.1: wirksame Schichten gedeckelt
  if (n <= 0) return 0;
  return gletscher ? (n * (n + 1) / 2) * C.ICE_LAYER_VALUE : n * C.ICE_LAYER_VALUE;
}
// Summe aller Schichten (für Kristalline Masse).
export const totalLayers = (layers) => Object.values(layers || {}).reduce((t, v) => t + (v || 0), 0);
// Zielanzahl eingefrorener Karten: erster Eis-Skill = ICE_BASE_FREEZE, je weiterer +1, Frostgriff +2. 0 ohne Eis-Skill.
export function frozenTargetFor(skills) {
  const n = iceSkillCount(skills);
  if (n === 0) return 0;
  return C.ICE_BASE_FREEZE + (n - 1) + (hasFrostGrip(skills) ? C.FROST_GRIP_BONUS : 0);
}
// `count` noch nicht eingefrorene eigene Karten einfrieren (immutabel, deterministisch).
// preferLowest (Frostwahl): die niedrigsten Karten wählen (statt zufällig) — der Meißel beginnt beim Einfrieren.
export function freezeCards(deck, count, rng, preferLowest = false) {
  const pool = (deck || []).map((_, i) => i).filter((i) => !deck[i].frozen);
  const chosen = new Set();
  let remaining = count;
  if (preferLowest) {
    pool.sort((a, b) => deck[a].value - deck[b].value || a - b);
    while (remaining > 0 && pool.length > 0) { chosen.add(pool.shift()); remaining -= 1; }
  } else {
    while (remaining > 0 && pool.length > 0) {
      const j = Math.floor(rng() * pool.length);
      chosen.add(pool.splice(j, 1)[0]);
      remaining -= 1;
    }
  }
  return (deck || []).map((c, i) => (chosen.has(i) ? { ...c, frozen: true } : c));
}
// Alle eigenen Karten auftauen (immutabel) — Gegenstück zu freezeCards. Genutzt, wenn der Eis-Archetyp
// deaktiviert wird (letzter Eis-Skill ersetzt, #140): das frozen-Flag verschwindet von allen Karten.
export function unfreezeAll(deck) {
  return (deck || []).map((c) => (c.frozen ? { ...c, frozen: false } : c));
}

/* ---- Pflanze-Fraktion (v0) — Wachstum (nur steigend) → Reife (grün) → Farbblock → Score. Reine Helfer. ---- */
export const plantFlag = (skills, flag) => (skills || []).some((id) => SKILL_DEFS[id]?.[flag]);
export const plantSkillCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.archetype === "plant").length;
// Reife: grün ist ein KARTEN-Flag (card.green, wie card.frozen) — gebacken bei Erreichen der Wachstums-Schwelle
// ODER per Recolor (Alter Anker/Ranken). So liest die Formations-Erkennung Grün direkt von der Karte (Farbblock).
export const isGreen = (card) => !!card?.green;
export const greenCount = (deck) => (deck || []).filter((c) => c.green).length;
// Soll diese Karte (nach Wachstums-Update) reif/grün sein? (Schwelle erreicht.)
export const growthRipe = (growth) => (growth || 0) >= C.PLANT_GREEN_THRESHOLD;
// Wurzeln-Score je Sieg einer grünen Karte (Anzeige-Helfer für CardDetail #211): BASIS-Flat aus Wurzeltiefe +
// Jahresringe (je 10 Wachstum). Spiegelt engine.js (Wurzeltiefe/Jahresringe); der Pfahlwurzel-Faktor (×2 in Formation)
// wird in der UI separat vermerkt, damit die Basiszahl stabil bleibt.
export const plantRootScore = (skills, growth) => {
  if (!hasWurzeltiefe(skills)) return 0;
  let r = C.WURZELTIEFE_SCORE;
  if (hasJahresringe(skills)) r += Math.floor((growth || 0) / C.JAHRESRINGE_PER_GROWTH) * C.JAHRESRINGE_SCORE;
  return r;
};
// Flag-Prädikate (in engine/formations/reducer gelesen).
export const hasWurzelschlag  = (skills) => plantFlag(skills, "wurzelschlag");
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
export const hasDornenkoenig  = (skills) => plantFlag(skills, "dornenkoenig");
export const hasEwigerFruehling = (skills) => plantFlag(skills, "ewigerFruehling");

// Roh-Crit-Beitrag des Blitz-Archetyps (Abschnitt 2a): Aktivierungs-Sockel + Σ Skill-critChance
// + Gewitterfront-Bonus (dauerhaft, Stufe C). Fließt additiv in die Gesamt-Crit-Chance. 0, solange inaktiv.
export function lightningCritRaw(lightning, skills) {
  if (!lightning || !lightning.active) return 0;
  return C.LIGHTNING_CRIT_BASE + skillSum(skills, "critChance", {}) + (lightning.stormCritBonus || 0) + (lightning.stauBonus || 0);
}

// Ladung erhöhen (immutabel), gedeckelt auf maxCharge. No-op, solange der Archetyp inaktiv ist.
export function addCharge(lightning, gained) {
  if (!lightning || !lightning.active) return lightning;
  return { ...lightning, charge: Math.min(lightning.maxCharge, lightning.charge + gained) };
}

// Ein Skill ist ein „Konsument", wenn er eine verbrauchbare Ressource auslöst: Feuer-Hitze-Konsument
// (heatConsumer: Flächenbrand/Schmelzpunkt) oder Blitz-Ladungs-Konsument (onFullCharge: Ionisierung/Geladene Serie).
export const isConsumerSkill = (id) => { const d = SKILL_DEFS[id]; return !!(d && (d.heatConsumer || d.onFullCharge)); };
// Hält der Build für diesen Archetyp bereits einen Konsumenten? Eis kennt keine → gilt als „hat einen" (nie erzwingen).
// (heatConsumerCount/chargeConsumerCount stehen weiter unten im Modul — zur Laufzeit längst initialisiert.)
export function ownsConsumerFor(arch, skills) {
  if (arch === "fire") return heatConsumerCount(skills) > 0;
  if (arch === "lightning") return chargeConsumerCount(skills) > 0;
  return true;
}

// Angebot (#93 F0): bis zu `count` noch nicht gehaltene Skills, nach Archetyp gruppiert (3+3+3+3),
// aus max C.MAX_ARCHETYPES Archetypen (offerArchetypes). Deterministisch über den injizierten rng.
// Leerer Pool → [] (Reducer/Engine fällt auf Perk-Angebot zurück). F0: nur Blitz → 4 Blitz-Skills.
// #217 Meistergrade: ob eine Skill-id ein Legendär ist (Garantie-Erkennung bei Grad V). Rein & node-testbar.
export const isLegendarySkill = (id) => !!SKILL_DEFS[id]?.legendary;

export function buildSkillOffer(owned, activeArchetypes, rng, count, legendaryChance = 0, guaranteeOne = false) {
  const available = archetypesWithSkills(owned);
  const chosen = offerArchetypes(activeArchetypes || [], available, rng);
  if (!chosen.length) return [];
  // #247: Legendäre laufen über einen eigenen Wurf JE ARCHETYP (nicht mehr EIN globaler Roll). Bei gateLeg werden sie
  // aus dem normalen Zug ausgeschlossen und kommen ausschließlich über diese Würfe — je getroffenem Archetyp EINER
  // (mehrere je Angebot möglich, nie zwei im selben Archetyp). Ohne Chance UND ohne Garantie (Grad < V) bleibt das
  // alte Verhalten exakt erhalten (kein rng-Drift, Legendäre gewichtet im Pool) → Bestandstests/Sim mit Chance 0 unberührt.
  const gateLeg = legendaryChance > 0 || guaranteeOne;
  const isLeg = (id) => !!SKILL_DEFS[id]?.legendary;
  // Konsument-Garantie: ein AKTIVER Feuer-/Blitz-Build ohne gehaltenen Konsumenten bekommt garantiert (mind.) einen
  // seines Typs angeboten, solange einer verfügbar ist — sonst kann der Build nie „zünden" (frustrierend). Greift nur
  // für in activeArchetypes stehende Archetypen.
  const needsConsumer = (arch) => (activeArchetypes || []).includes(arch) && !ownsConsumerFor(arch, owned);
  // #191/#223: SCHON beim ERSTEN Skill-Angebot (noch kein Archetyp aktiv) bekommt JEDER angebotene Konsumenten-
  // Archetyp (Feuer & Blitz; Eis/Pflanze haben keinen) garantiert seinen Konsumenten ins Angebot — nicht nur EINER
  // insgesamt. Sonst zeigt das Erst-Angebot z. B. Blitz-Ladungsaufbau OHNE Blitz-Konsument (die Ladung „verpufft"),
  // wenn die chosen-Reihenfolge Feuer zuerst nimmt. Jede angebotene Engine ist so von Anfang an komplett sichtbar.
  const guaranteeAny = (activeArchetypes || []).length === 0;
  const perArch = Math.max(1, Math.floor(count / chosen.length)); // 3 bei 4 Archetypen (count 12), count bei 1 Archetyp
  const offer = [];
  const rest = [];
  const guaranteed = new Set();  // garantierte Konsumenten-Slots — vor dem Legendär-Ersatz geschützt
  const archLegs = {};           // #247: getroffener Legendär je Archetyp (aus dessen eigenem Wurf)
  const legPoolByArch = {};      // #247: verfügbare Legendäre je Archetyp (auch für die Grad-V-Garantie)
  for (const arch of chosen) {
    // Enabler-Gating (Anti-Pech): ein Verstärker-Skill (s.enabler) wird NUR angeboten, wenn seine Basis gehalten wird —
    // sonst ist er ein toter Pick (Variety-Befund: der schwache Tail sind fast durchweg ungegatete Verstärker).
    let pool = shuffle(SKILL_LIST.filter((s) => s.archetype === arch && !(owned || []).includes(s.id)
      && (!s.enabler || (owned || []).includes(s.enabler))).map((s) => s.id), rng);
    if (gateLeg) { legPoolByArch[arch] = pool.filter(isLeg); pool = pool.filter((id) => !isLeg(id)); } // Legendäre nur über die Würfe
    // Garantierten Konsumenten dieses Archetyps nach vorne ziehen (deterministisch, kein zusätzlicher rng-Zug: die
    // Pool-Reihenfolge stammt schon aus dem Shuffle; perArch ≥ 1 → Slot 0 wird gewählt). Zwei Auslöser:
    //  · needsConsumer(arch): aktiver Archetyp ohne gehaltenen Konsumenten (Pro-Archetyp-Garantie, Runden 2+).
    //  · guaranteeAny (#191/#223): erstes Angebot → JEDER angebotene Feuer-/Blitz-Archetyp zeigt seinen Konsumenten.
    if (needsConsumer(arch) || guaranteeAny) {
      const ci = pool.findIndex(isConsumerSkill);
      if (ci > 0) pool.unshift(pool.splice(ci, 1)[0]);
      if (ci >= 0) guaranteed.add(pool[0]);
    }
    for (let i = 0; i < perArch && pool.length; i++) offer.push(pool.shift());
    rest.push(...pool); // Reste des Archetyps für die Auffüllung
    // #247: eigener Legendär-Wurf für DIESEN Archetyp — genau EIN rng()-Zug je Archetyp (nur wenn er Legendäre hat),
    // stabile Reihenfolge (chosen). Der Meisterrang-Mult (IV+ ×3) steckt bereits im übergebenen legendaryChance;
    // die Grad-V-Garantie („mindestens einer") kommt separat über guaranteeOne — NICHT als chance=1 (das wäre „in jedem").
    if (legendaryChance > 0 && legPoolByArch[arch].length && rng() < legendaryChance) {
      archLegs[arch] = shuffle(legPoolByArch[arch], rng)[0];
    }
  }
  const fill = shuffle(rest, rng); // auffüllen bis count, falls ein Archetyp zu wenige Skills hatte
  while (offer.length < count && fill.length) offer.push(fill.shift());
  // #247: je getroffenem Archetyp den Legendär einsetzen — ersetzt einen normalen Skill DESSELBEN Archetyps (Balance je
  // Archetyp wahren: 3→2 normal + 1 legendär), garantierte Konsumenten überspringen. Kein ersetzbarer Slot dieses
  // Archetyps (alles garantiert/schon legendär) → auslassen; so bleiben Angebotslänge UND Konsument-Garantie erhalten.
  const placeLeg = (arch, leg) => {
    if (!leg || offer.includes(leg)) return false;
    for (let i = offer.length - 1; i >= 0; i--) {
      if (archetypeOf(offer[i]) === arch && !guaranteed.has(offer[i]) && !isLeg(offer[i])) { offer[i] = leg; return true; }
    }
    return false;
  };
  for (const arch of chosen) placeLeg(arch, archLegs[arch]);
  // #247 Grad-V-Garantie: kam über die Würfe KEIN Legendär, forciere (mind.) EINEN — erster Archetyp mit verfügbarem
  // Legendär und ersetzbarem Slot. Bewusst „mindestens einer", nicht „in jedem Archetyp".
  if (guaranteeOne && !offer.some(isLeg)) {
    for (const arch of chosen) {
      const pool = legPoolByArch[arch];
      if (pool && pool.length && placeLeg(arch, shuffle(pool, rng)[0])) break;
    }
  }
  return offer;
}

/* ---- Ionisierung (Stufe B, docs/blitz-archetyp.md Abschnitt 5/6) ---- */

// Score-Bonus einer gespielten Karte: +ION_SCORE_PER_STACK je Stapel (Stand VOR dem Zuwachs).
export function ionScoreFor(card) {
  return (card?.ionStacks || 0) * C.ION_SCORE_PER_STACK;
}

// Voll-Ladungs-Verbraucher (Abschnitt 6): Ionisierung (ionize) und Geladene Serie (protectStreak).
export function hasIonize(skills)  { return (skills || []).some((id) => SKILL_DEFS[id]?.onFullCharge === "ionize"); }
export function hasProtect(skills) { return (skills || []).some((id) => SKILL_DEFS[id]?.onFullCharge === "protectStreak"); }
// Prädikat „hat der Build einen Verbraucher?" — Test-/Anzeige-API; die Engine prüft hasIonize/hasProtect direkt.
export function consumesCharge(skills) { return hasIonize(skills) || hasProtect(skills); }

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
export const hasKurzschluss    = (skills) => lightFlag(skills, "kurzschluss");    // volle (5) Siegkarte → Ladung-Burst, Reset
export const hasSpannungsstau  = (skills) => lightFlag(skills, "spannungsstau");  // Nicht-Crit-Siege rampen Crit-Chance
export const hasUeberschlag    = (skills) => lightFlag(skills, "ueberschlag");    // Crit-Chance >100 % → Ladung
export const hasBlitzschlag    = (skills) => lightFlag(skills, "blitzschlag");    // Crit ionisiert die Siegkarte
export const hasDauerstrom     = (skills) => lightFlag(skills, "dauerstrom");     // Serie → Ladung
export const hasWetterleuchten = (skills) => lightFlag(skills, "wetterleuchten"); // Serienschwellen → ionisieren
export const hasDoubleDischarge = (skills) => lightFlag(skills, "doubleDischarge"); // L: Konsumenten ×2
export const hasAreaIonize     = (skills) => lightFlag(skills, "areaIonize");     // L: ionis. Sieg → alle Nachbarn
export const hasDurchschlag    = (skills) => lightFlag(skills, "durchschlag");    // L: volle Ionis.+Crit → dauerhaft Crit-Mult
// Ladungsmaximum je Build (Donnergott → 15) & dessen dauerhafter Crit-Multiplikator-Bonus.
export const maxChargeFor      = (skills) => (hasThunderGod(skills) ? C.LIGHTNING_MAX_CHARGE_THUNDER : C.LIGHTNING_MAX_CHARGE);
export const lightningCritMult = (skills) => (hasThunderGod(skills) ? C.THUNDER_CRIT_MULT : 0);
// Anzahl gehaltener Ladungs-Konsumenten (Ionisierung/Geladene Serie); der Reducer blockt > 1.
export const chargeConsumerCount = (skills) => (skills || []).filter((id) => SKILL_DEFS[id]?.onFullCharge).length;
// Aktiver Ladungs-Konsument (für HUD/Badge): "ionize" | "protectStreak" | null.
export const chargeConsumerOf = (skills) => {
  for (const id of skills || []) { const c = SKILL_DEFS[id]?.onFullCharge; if (c) return c; }
  return null;
};

// Anzahl je Auslösung ionisierter Karten: Ionisierung (2) + Kettenblitz (+2), sofern gehalten.
export function ionizeCountFor(skills) {
  return skillSum(skills, "ionizeCount", {});
}

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
