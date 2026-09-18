// Druckt jeden Feuer- und Blitz-Skill mit seinen vier Stufentexten (Normal · Selten · Sehr selten · Episch) und die
// Legendären mit ihrem Text — die Lesevorlage für einen Text- und Varianz-Pass über alle Skills. ARCH=fire|lightning
// begrenzt auf eine Fraktion; ohne Angabe beide.
import { SKILL_LIST } from "../../src/game/skills.js";
const ARCH = process.env.ARCH;
const TIERS = ["Normal", "Selten", "Sehr selten", "Episch"];
for (const arch of ["lightning", "fire"]) {
  if (ARCH && ARCH !== arch) continue;
  console.log(`\n=== ${arch === "fire" ? "FEUER" : "BLITZ"} ===`);
  for (const s of SKILL_LIST.filter((x) => x.archetype === arch)) {
    console.log(`\n${s.id}  ${s.name}${s.legendary ? "  (Legendär)" : ""}  [${(s.keywords || []).join(", ")}]`);
    if (s.legendary) { console.log(`  ${s.desc}`); continue; }
    (s.descTiers || [s.desc]).forEach((t, i) => console.log(`  ${TIERS[i].padEnd(11)} ${t}`));
  }
}
