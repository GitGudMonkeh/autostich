/* ERSTLAUF-ONBOARDING (docs/tutorial-onboarding-design.md §6, Task onb-firstrun) — die Wächter
   für Skip und Gatung:

   1. Ein frisches Profil (hadCompletedRun false) startet OHNE Start-Skill-Entscheidung direkt im
      Stichspiel und Blitz-only — beide Verhalten hängen an derselben Flagge wie das laute
      Hub-Angebot und heben sich nach dem ersten abgeschlossenen Lauf auf.
   2. Der Sim-/Standard-Pfad (kein Profil) und Ranked bleiben unberührt — sonst wären die
      Determinismus-Baselines und die faire Ranked-Grundlinie verschoben.
   3. Das „Guter Start"-Badge findet seinen Skill regelbasiert: der Konsument ist im Erst-Angebot
      garantiert (#191/#223) — kippt die Garantie, wird dieser Test rot, nicht das Badge leise leer. */
import { describe, it, expect } from "vitest";
import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { loadProfile } from "../src/game/storage.js";
import { SKILL_DEFS, buildSkillOffer } from "../src/game/skills.js";
import { recommendedStarter } from "../src/ui/hints/hintScript.js";

const fresh = () => ({ ...loadProfile(), hadCompletedRun: false });
const veteran = () => ({ ...loadProfile(), hadCompletedRun: true });
const start = (over = {}) =>
  reducer(null, { type: "START_RUN", rng: makeRng(7), architect: true, seed: 12345, profile: fresh(), ...over });

describe("Erstlauf · Skip der Start-Entscheidung (§6.1)", () => {
  it("frisches Profil: direkt ins Stichspiel, kein Start-Angebot", () => {
    const s = start();
    expect(s.firstRun).toBe(true);
    expect(s.phase).toBe("play");
    expect(s.skillOffer).toBeFalsy();
    expect(s.offer).toBeFalsy();
  });

  it("abgeschlossener Lauf hebt den Skip auf: Start = Skill-Angebot wie immer", () => {
    const s = start({ profile: veteran() });
    expect(s.firstRun).toBe(false);
    expect(s.phase).toBe("levelup");
    expect(Array.isArray(s.skillOffer) && s.skillOffer.length > 0).toBe(true);
  });

  it("ohne Profil (Sim/Standard) ändert sich nichts", () => {
    const s = reducer(null, { type: "START_RUN", rng: makeRng(1), architect: true });
    expect(s.firstRun).toBeFalsy();
    expect(s.unlockedArchetypes ?? null).toBe(null);
    expect(s.phase).toBe("levelup");
    expect(Array.isArray(s.skillOffer) && s.skillOffer.length > 0).toBe(true);
  });

  it("Ranked bleibt ungegated (faire Baseline)", () => {
    const s = start({ ranked: true });
    expect(s.firstRun).toBe(false);
    expect(s.phase).toBe("levelup");
  });
});

describe("Erstlauf · Blitz-Gatung (§6.2)", () => {
  it("frisches Profil: die Allowlist trägt nur Blitz", () => {
    expect(start().unlockedArchetypes).toEqual(["lightning"]);
  });

  it("nach dem ersten abgeschlossenen Lauf greift die normale Baum-Gatung (Blitz + Feuer frei)", () => {
    const u = start({ profile: veteran() }).unlockedArchetypes;
    expect(u).toContain("lightning");
    expect(u).toContain("fire");
  });

  it("jede spätere Skill-Wahl des Erstlaufs bleibt Blitz-only (die Allowlist gilt je Lauf)", () => {
    const offer = buildSkillOffer([], [], makeRng(3), 12, 0, false, start().unlockedArchetypes);
    expect(offer.length).toBeGreaterThan(0);
    for (const id of offer) expect(SKILL_DEFS[id].archetype).toBe("lightning");
  });
});

describe("Erstlauf · „Guter Start“-Badge (§6.2)", () => {
  it("der Konsument ist im Blitz-only-Angebot garantiert und wird empfohlen", () => {
    for (const seed of [1, 2, 3, 17, 99]) {
      const offer = buildSkillOffer([], [], makeRng(seed), 12, 0, false, ["lightning"]);
      const rec = recommendedStarter(offer);
      expect(rec, `Seed ${seed}: kein Konsument im Erst-Angebot`).toBeTruthy();
      expect(!!SKILL_DEFS[rec].onFullCharge).toBe(true);
    }
  });

  it("ohne Konsument im Angebot: kein Badge statt falsches Badge", () => {
    expect(recommendedStarter(["SK_LIGHTNING_01"])).toBe(null);
    expect(recommendedStarter([])).toBe(null);
    expect(recommendedStarter(null)).toBe(null);
  });
});
