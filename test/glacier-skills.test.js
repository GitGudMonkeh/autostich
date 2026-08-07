import { describe, it, expect } from "vitest";
import { SKILL_DEFS, glacierRolesOf } from "../src/game/skills.js";
import { ROLES } from "../src/game/glacier.js";

// Eis-Neudesign — Skill-Registry: die 21 Eis-Skills (17 Rollen + 4 Legendäre) tragen archetype "ice" + ein `role`
// (glacier.js ROLES). PICK_SKILL seedet daraus state.glacierRoles. (Deckt zugleich das Registry-Coverage-Gate ab.)
const ICE_IDS = [
  "SK_ICE_01", "SK_ICE_02", "SK_ICE_03", "SK_ICE_04", "SK_ICE_05", "SK_ICE_06", "SK_ICE_07", "SK_ICE_08",
  "SK_ICE_09", "SK_ICE_10", "SK_ICE_11", "SK_ICE_12", "SK_ICE_13", "SK_ICE_14", "SK_ICE_15", "SK_ICE_16",
  "SK_ICE_17", "SK_ICE_L01", "SK_ICE_L02", "SK_ICE_L03", "SK_ICE_L04",
];
const ROLE_SET = new Set(Object.values(ROLES));

describe("Eis-Skill-Registry", () => {
  it("21 Eis-Skills: 17 normal + 4 legendär, alle archetype=ice mit gültiger role", () => {
    const ice = Object.values(SKILL_DEFS).filter((s) => s.archetype === "ice");
    expect(ice).toHaveLength(21);
    for (const id of ICE_IDS) {
      const d = SKILL_DEFS[id];
      expect(d, id).toBeDefined();
      expect(d.archetype).toBe("ice");
      expect(ROLE_SET.has(d.role), `${id} → ${d.role}`).toBe(true);
    }
    const legendary = ICE_IDS.filter((id) => SKILL_DEFS[id].legendary);
    expect(legendary).toEqual(["SK_ICE_L01", "SK_ICE_L02", "SK_ICE_L03", "SK_ICE_L04"]);
  });

  it("jede Rolle ist genau einmal an einen Skill gebunden (bijektiv)", () => {
    const roles = ICE_IDS.map((id) => SKILL_DEFS[id].role);
    expect(new Set(roles).size).toBe(roles.length);          // keine Doppelung
    expect(new Set(roles)).toEqual(ROLE_SET);                // alle 21 ROLES abgedeckt
  });

  it("glacierRolesOf mappt gehaltene Eis-Skills → ihre Rollen", () => {
    expect(glacierRolesOf(["SK_ICE_01"])).toEqual([ROLES.ANFRIEREN]);
    expect(glacierRolesOf(["SK_ICE_L03"])).toEqual([ROLES.L_LAWINE]);
    expect(glacierRolesOf(["SK_ICE_01", "SK_ICE_11"])).toEqual([ROLES.ANFRIEREN, ROLES.KETTENBRUCH]);
    expect(glacierRolesOf([])).toEqual([]);
  });
});
