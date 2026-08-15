/* ============================================================
   META CATALOG — ENGLISH. Upgrade tree (26 nodes + 2 branches) and weekly modifiers (19).

   Weekly modifier descriptions carry the magnitude as {v} — the German source is a function of
   the rolled strength, so both sides use the same placeholder rather than a fixed number.

   Terminology (§3.5): upgrade tree · Trick Points (TP) · legendary · rarity ladder ending in
   Epic · order phase / order energy · build space · reroll · archetype.
   ============================================================ */
import { MAX_COVER } from "../game/architect.js";
import { TIGHT_BUILD_COVER, BOOST_FACTOR } from "../game/weekMods.js";

/* Die Raritätsnamen können hier nicht aus en.js kommen (en.js importiert diese Datei → Zyklus).
   Ein eigener Guard prüft dafür, dass die englische Leiter Common · Uncommon · Rare · Epic bleibt. */
const RARE = "Rare", EPIC = "Epic";

export default {
  /* ---- Upgrade tree · branches ---- */
  "branch.deck.name": "Decks",   // in beiden Sprachen dasselbe Wort
  "branch.deck.desc": "Archetypes & legendaries",
  "branch.gen.name": "General",
  "branch.gen.desc": "Build space · energy · rarity · drops",

  /* ---- Upgrade tree · nodes ----
     Four archetypes share the same two node labels ("Legendär I/II"); the detail line is what
     tells them apart, so the labels are deliberately identical in English too. */
  "node.fireLeg1.label": "Legendary I",
  "node.fireLeg1.detail": "1 fire candidate in the legendary phase",
  "node.fireLeg2.label": "Legendary II",
  "node.fireLeg2.detail": "2 fire candidates",
  "node.boltLeg1.label": "Legendary I",
  "node.boltLeg1.detail": "1 lightning candidate in the legendary phase",
  "node.boltLeg2.label": "Legendary II",
  "node.boltLeg2.detail": "2 lightning candidates",
  "node.iceDeck.label": "Ice deck",
  "node.iceDeck.detail": "Ice archetype playable",
  "node.iceLeg1.label": "Legendary I",
  "node.iceLeg1.detail": "1 ice candidate in the legendary phase",
  "node.iceLeg2.label": "Legendary II",
  "node.iceLeg2.detail": "2 ice candidates",
  "node.plantDeck.label": "Plant deck",
  "node.plantDeck.detail": "Plant archetype playable",
  "node.plantLeg1.label": "Legendary I",
  "node.plantLeg1.detail": "1 plant candidate in the legendary phase",
  "node.plantLeg2.label": "Legendary II",
  "node.plantLeg2.detail": "2 plant candidates",
  "node.deckReroll.label": "Reroll · legendary phase",
  "node.deckReroll.detail": "+1 reroll in the archetype legendary phase",
  "node.synLeg.label": "Synergy legendaries",
  "node.synLeg.detail": "Coming soon",

  "node.cover1.label": "Build space I",
  "node.cover1.detail": "Build space 20 → 21 cells",
  "node.cover2.label": "Build space II",
  "node.cover2.detail": "Build space 21 → 22 cells",
  "node.cover3.label": "Build space III",
  "node.cover3.detail": `Build space 22 → ${MAX_COVER} cells`,
  "node.energy1.label": "Energy I",
  "node.energy1.detail": "Order energy 3 → 4",
  "node.energy2.label": "Energy II",
  "node.energy2.detail": "Order energy 4 → 5",
  "node.tier3.label": RARE,
  "node.tier3.detail": `Unlock ${RARE} rarity (blue)`,
  "node.tier4.label": EPIC,
  "node.tier4.detail": `Unlock ${EPIC} rarity (purple)`,
  "node.legLayer.label": "Legendary",
  "node.legLayer.detail": "Legendary perk layer (gold) on",
  "node.drop1.label": "Drop rate I",
  "node.drop1.detail": "Higher-quality perks & buildings",
  "node.drop2.label": "Drop rate II",
  "node.drop2.detail": "Higher-quality perks & buildings",
  "node.drop3.label": "Drop rate III",
  "node.drop3.detail": "Higher-quality perks & buildings",
  "node.drop4.label": "Drop rate IV",
  "node.drop4.detail": "Higher-quality perks & buildings",
  "node.perk2Leg.label": "2nd perk → legendary",
  "node.perk2Leg.detail": "The 2nd perk phase becomes a general legendary phase",
  "node.perk2Reroll.label": "Reroll · 2nd perk phase",
  "node.perk2Reroll.detail": "+1 reroll in the general legendary phase",

  /* ---- Weekly modifiers ---- */
  "weekmod.blockForm.name": "Blocked order slots",
  "weekmod.blockForm.desc": "{v} positions of the draw order are blocked",
  "weekmod.blockArch.name": "Blocked build cells",
  "weekmod.blockArch.desc": "{v} build-space cells are blocked",
  "weekmod.strongEnemies.name": "Stronger opponents",
  "weekmod.strongEnemies.desc": "Opponent cards +{v} value",
  "weekmod.deckShuffle.name": "Deck shuffle",
  "weekmod.deckShuffle.desc": "The deck is reshuffled before every order phase",
  "weekmod.energyEbb.name": "Energy ebb",
  "weekmod.energyEbb.desc": "Start with 0 order energy",
  "weekmod.tightBuild.name": "Tight build",
  "weekmod.tightBuild.desc": `Only ${TIGHT_BUILD_COVER} build-space cells`,
  "weekmod.scarceSkills.name": "Skill scarcity",
  "weekmod.scarceSkills.desc": "Only 1 skill per archetype",
  "weekmod.scarcePerks.name": "Perk scarcity",
  "weekmod.scarcePerks.desc": "Only 1 perk per offer",
  "weekmod.noReroll.name": "No reroll",
  "weekmod.noReroll.desc": "0 rerolls (all pools)",
  "weekmod.perkCap.name": "Perk cap",
  "weekmod.perkCap.desc": `No ${RARE} or ${EPIC} perks`,
  "weekmod.strongCards.name": "Strong cards",
  "weekmod.strongCards.desc": "Your cards +{v} value",
  "weekmod.legTakt.name": "Legendary cadence",
  "weekmod.legTakt.desc": "Every {v} perk phases: 3 legendary perks",   // ordinal-sicher: die Stärke wird 3–5 gerollt
  "weekmod.skillFull.name": "Skill abundance",
  "weekmod.skillFull.desc": "+{v} skill slots",
  "weekmod.doubleLeg.name": "Double legendary",
  "weekmod.doubleLeg.desc": "2 legendary slots — pick 2 in the legendary phase",
  "weekmod.noBuildLimit.name": "No build limit",
  "weekmod.noBuildLimit.desc": "Build without a limit",
  "weekmod.perkBlessing.name": "Perk blessing",
  "weekmod.perkBlessing.desc": `Perks only drop as ${RARE}/${EPIC}`,
  "weekmod.energyFlood.name": "Energy flood",
  "weekmod.energyFlood.desc": "Double order energy",
  "weekmod.buildBoost.name": "Build boost",
  "weekmod.buildBoost.desc": `Building bonuses ×${BOOST_FACTOR}`,
  "weekmod.formBoost.name": "Formation boost",
  "weekmod.formBoost.desc": `Formation bonuses ×${BOOST_FACTOR}`,
};
