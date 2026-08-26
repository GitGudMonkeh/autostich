/* ============================================================
   META CATALOG — SPANISH. Upgrade tree (26 nodes + 2 branches) and weekly modifiers (19).
   Mirrors enMeta.js key for key, and interpolates the same constants at the same sites.

   Weekly modifier descriptions carry the magnitude as {v} — the German source is a function of
   the rolled strength, so every language uses the placeholder rather than a fixed number.

   Terminology (§3.5): árbol de mejoras · Puntos de baza (PB) · legendaria · rarity ladder ending
   in Épica · fase de orden / energía de orden · espacio de construcción · relanzamiento ·
   arquetipo.

   ORDINALS ARE AVOIDED THROUGHOUT. The German writes "2. Perk-Phase"; Spanish would want "2.ª",
   and the ordinal indicator is missing from the card font (package §5.3). "fase de ventajas 2"
   keeps the digit, which also keeps the number guard comparing like with like.
   ============================================================ */
import { MAX_COVER } from "../game/architect.js";
import { TIGHT_BUILD_COVER, BOOST_FACTOR } from "../game/weekMods.js";

// Rarity names from the shared source (es.js imports this file → no access to es.js itself).
import { RARE, EPIC } from "./esTerms.js";

export default {
  /* ---- Branches ---- */
  "branch.deck.name": "Mazos",
  "branch.deck.desc": "Arquetipos y legendarias",
  "branch.gen.name": "General",
  "branch.gen.desc": "Espacio de construcción · energía · rareza · aparición",

  /* ---- Deck branch: archetype unlocks and legendary tiers ----
     "Legendär" is feminine here because what it names is a `habilidad` — unlike the Architect
     screen, where the same German word describes an `edificio` and reads `legendario`. */
  "node.fireLeg1.label": "Legendaria I",
  "node.fireLeg1.detail": "1 candidato de Fuego en la fase legendaria",
  "node.fireLeg2.label": "Legendaria II",
  "node.fireLeg2.detail": "2 candidatos de Fuego",
  "node.boltLeg1.label": "Legendaria I",
  "node.boltLeg1.detail": "1 candidato de Rayo en la fase legendaria",
  "node.boltLeg2.label": "Legendaria II",
  "node.boltLeg2.detail": "2 candidatos de Rayo",
  "node.iceDeck.label": "Mazo de Hielo",
  "node.iceDeck.detail": "Arquetipo Hielo jugable",
  "node.iceLeg1.label": "Legendaria I",
  "node.iceLeg1.detail": "1 candidato de Hielo en la fase legendaria",
  "node.iceLeg2.label": "Legendaria II",
  "node.iceLeg2.detail": "2 candidatos de Hielo",
  "node.plantDeck.label": "Mazo de Planta",
  "node.plantDeck.detail": "Arquetipo Planta jugable",
  "node.plantLeg1.label": "Legendaria I",
  "node.plantLeg1.detail": "1 candidato de Planta en la fase legendaria",
  "node.plantLeg2.label": "Legendaria II",
  "node.plantLeg2.detail": "2 candidatos de Planta",
  "node.deckReroll.label": "Relanzamiento · fase legendaria",
  "node.deckReroll.detail": "+1 relanzamiento en la fase legendaria de arquetipo",
  "node.synLeg.label": "Legendarias de sinergia",
  "node.synLeg.detail": "Disponible pronto",

  /* ---- General branch ---- */
  "node.cover1.label": "Espacio de construcción I",
  "node.cover1.detail": "Espacio de construcción 20 → 21 celdas",
  "node.cover2.label": "Espacio de construcción II",
  "node.cover2.detail": "Espacio de construcción 21 → 22 celdas",
  "node.cover3.label": "Espacio de construcción III",
  "node.cover3.detail": `Espacio de construcción 22 → ${MAX_COVER} celdas`,
  "node.energy1.label": "Energía I",
  "node.energy1.detail": "Energía de orden 3 → 4",
  "node.energy2.label": "Energía II",
  "node.energy2.detail": "Energía de orden 4 → 5",
  "node.tier3.label": RARE,
  "node.tier3.detail": `Desbloquear la rareza ${RARE} (azul)`,
  "node.tier4.label": EPIC,
  "node.tier4.detail": `Desbloquear la rareza ${EPIC} (morado)`,
  "node.legLayer.label": "Legendaria",
  "node.legLayer.detail": "Capa de ventajas legendarias (dorado) activada",
  "node.drop1.label": "Tasa de aparición I",
  "node.drop1.detail": "Ventajas y edificios de mayor calidad",
  "node.drop2.label": "Tasa de aparición II",
  "node.drop2.detail": "Ventajas y edificios de mayor calidad",
  "node.drop3.label": "Tasa de aparición III",
  "node.drop3.detail": "Ventajas y edificios de mayor calidad",
  "node.drop4.label": "Tasa de aparición IV",
  "node.drop4.detail": "Ventajas y edificios de mayor calidad",
  "node.perk2Leg.label": "Ventaja 2 → legendaria",
  "node.perk2Leg.detail": "La fase de ventajas 2 se convierte en fase legendaria general",
  "node.perk2Reroll.label": "Relanzamiento · fase de ventajas 2",
  "node.perk2Reroll.detail": "+1 relanzamiento en la fase legendaria general",
  "node.reroll1.label": "Relanzamiento I",
  "node.reroll1.detail": "+1 relanzamiento por oferta (ventaja · edificio · habilidad)",
  "node.reroll2.label": "Relanzamiento II",
  "node.reroll2.detail": "+1 relanzamiento por oferta (ventaja · edificio · habilidad)",

  /* ---- Weekly modifiers ---- */
  "weekmod.blockForm.name": "Posiciones de orden bloqueadas",
  "weekmod.blockForm.desc": "{v} posiciones del orden de robo bloqueadas",
  "weekmod.blockArch.name": "Celdas de construcción bloqueadas",
  "weekmod.blockArch.desc": "{v} celdas del espacio de construcción bloqueadas",
  "weekmod.strongEnemies.name": "Rivales más fuertes",
  "weekmod.strongEnemies.desc": "Cartas rivales +{v} de valor",
  "weekmod.deckShuffle.name": "Barajado del mazo",
  "weekmod.deckShuffle.desc": "El mazo se baraja de nuevo antes de cada fase de orden",
  "weekmod.energyEbb.name": "Marea baja de energía",
  "weekmod.energyEbb.desc": "Empiezas con 0 de energía de orden",
  "weekmod.tightBuild.name": "Construcción apretada",
  "weekmod.tightBuild.desc": `Solo ${TIGHT_BUILD_COVER} celdas de construcción`,
  "weekmod.scarceSkills.name": "Escasez de habilidades",
  "weekmod.scarceSkills.desc": "Solo 1 habilidad por arquetipo",
  "weekmod.scarcePerks.name": "Escasez de ventajas",
  "weekmod.scarcePerks.desc": "Solo 1 ventaja por oferta",
  "weekmod.noReroll.name": "Sin relanzamiento",
  "weekmod.noReroll.desc": "0 relanzamientos (todas las reservas)",
  "weekmod.perkCap.name": "Tope de ventajas",
  "weekmod.perkCap.desc": `Sin ventajas de rareza ${RARE} ni ${EPIC}`,
  "weekmod.strongCards.name": "Cartas fuertes",
  "weekmod.strongCards.desc": "Tus cartas +{v} de valor",
  "weekmod.legTakt.name": "Cadencia legendaria",
  "weekmod.legTakt.desc": "Cada {v} fases de ventajas: 3 ventajas legendarias",
  "weekmod.skillFull.name": "Abundancia de habilidades",
  "weekmod.skillFull.desc": "+{v} ranuras de habilidad",
  "weekmod.doubleLeg.name": "Legendaria doble",
  "weekmod.doubleLeg.desc": "2 ranuras legendarias: en la fase legendaria puedes elegir 2",
  "weekmod.noBuildLimit.name": "Sin límite de edificios",
  "weekmod.noBuildLimit.desc": "Construir sin límite",
  "weekmod.perkBlessing.name": "Bendición de ventajas",
  "weekmod.perkBlessing.desc": `Las ventajas solo aparecen como ${RARE} o ${EPIC}`,
  "weekmod.energyFlood.name": "Marea alta de energía",
  "weekmod.energyFlood.desc": "El doble de energía de orden",
  "weekmod.buildBoost.name": "Impulso de construcción",
  "weekmod.buildBoost.desc": `Bonificaciones de edificio ×${BOOST_FACTOR}`,
  "weekmod.formBoost.name": "Impulso de formación",
  "weekmod.formBoost.desc": `Bonificaciones de formación ×${BOOST_FACTOR}`,
};
