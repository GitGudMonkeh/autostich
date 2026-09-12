// Dev-Run (Test-Layout, nur Preview): Voll-Katalog-Angebote. Im Dev-Modus bekommen die Auswahl-Screens statt des
// zufälligen 3er-Angebots den KOMPLETTEN Katalog — jede Familie an jeder Stufe, jeden flachen Legendär-Perk, jeden
// Skill, jeden Bauplan. Die bestehenden Pick-Guards (offer-Mitgliedschaft) bleiben gültig, weil hier ALLES im Angebot
// steht → kein Bypass nötig. Nur der Dev-Run nutzt das (state.devMode); der Normal-Lauf ist unberührt.
import { FAMILY_DEFS } from "./families.js";
import { PERK_DEFS } from "./perks.js";
import { SKILL_DEFS } from "./skills.js";
import { ARCHITECT_FAMILIES, MAX_TIER as ARCH_MAX_TIER } from "./architect.js";

// Voller Perk-Katalog im Angebots-Format (wie buildPerkOffer): Familien als { familyId, tier }, flache Legendäre als id.
export function fullPerkOffer(architectEnabled = true) {
  const out = [];
  for (const fam of Object.values(FAMILY_DEFS)) {
    if (fam.enabled === false) continue;                       // deaktivierte Familie
    if (fam.needsArchitect && !architectEnabled) continue;     // Gebäude-abhängige Familie nur mit Architekt
    for (const t of Object.keys(fam.tiers || {}).map(Number).filter(Boolean).sort((a, b) => a - b)) {
      out.push({ familyId: fam.id, tier: t });
    }
  }
  for (const p of Object.values(PERK_DEFS)) {
    if (p.offerable === false) continue;                       // z. B. E10 (inertes Tuning-Perk)
    if (p.rarity !== "legendary") continue;                    // nur flache Legendäre laufen als PICK_PERK-String
    if (p.needsArchitect && !architectEnabled) continue;
    out.push(p.id);
  }
  return out;
}

// Voller Skill-Katalog: alle Skill-ids. SkillSelect gruppiert selbst nach Archetyp → alle Skills je Fraktion sichtbar.
export function fullSkillOffer() {
  return Object.keys(SKILL_DEFS);
}
// exp skill rework: the full catalog in the rolled-offer shape — every skill at tier 1 (Selten, today's values).
export function devSkillOffer() {
  const offer = fullSkillOffer();
  return { offer, tiers: Object.fromEntries(offer.filter((id) => !SKILL_DEFS[id].legendary).map((id) => [id, 1])) };
}

// Voller Bauplan-Katalog im Architekt-Angebots-Format: jede Familie an Stufe 1..MAX_TIER; Legendäre als eine „legendary"-Stufe.
export function fullArchitectOffer() {
  const out = [];
  for (const fam of Object.values(ARCHITECT_FAMILIES)) {
    if (fam.legendary) { out.push({ familyId: fam.id, tier: "legendary", legendary: true, used: false }); continue; }
    for (let t = 1; t <= ARCH_MAX_TIER; t++) out.push({ familyId: fam.id, tier: t, used: false });
  }
  return out;
}
