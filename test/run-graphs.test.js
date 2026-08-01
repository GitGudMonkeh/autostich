import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RunGraphs, sourceShares } from "../src/ui/RunGraphs.jsx";

// #251: Score-Quellen-Zerlegung (Näherung, sequentiell geklemmt, Rest = „Sonstige").
describe("RunGraphs sourceShares", () => {
  it("teilt den Score auf die Quellen auf; Summe = Score, Rest fängt den Überhang", () => {
    const sh = sourceShares({ score: 1000, formationScore: 300, critBonusScore: 200, buildingScore: 100, streakScore: 150 });
    expect(sh.score).toBe(1000);
    expect(sh.formation).toBe(300);
    expect(sh.crit).toBe(200);
    expect(sh.building).toBe(100);
    expect(sh.serie).toBe(150);
    expect(sh.rest).toBe(250); // 1000 − (300+200+100+150)
    // Invariante: die fünf Anteile summieren sich exakt auf den Score.
    expect(sh.formation + sh.crit + sh.building + sh.serie + sh.rest).toBe(1000);
  });

  it("klemmt Anteile, die zusammen den Score übersteigen (multiplikative Überlappung) — nie negativ, Summe = Score", () => {
    const sh = sourceShares({ score: 500, formationScore: 400, critBonusScore: 400, buildingScore: 400, streakScore: 400 });
    expect(sh.formation).toBe(400);   // erst Formation
    expect(sh.crit).toBe(100);        // geklemmt auf den Rest
    expect(sh.building).toBe(0);
    expect(sh.serie).toBe(0);
    expect(sh.rest).toBe(0);
    expect(sh.formation + sh.crit + sh.building + sh.serie + sh.rest).toBe(500);
  });

  it("ohne Anteils-Felder landet alles in Sonstige (Rest)", () => {
    const sh = sourceShares({ score: 750 });
    expect(sh.rest).toBe(750);
    expect(sh.formation).toBe(0);
  });

  it("rendert Balken + Durchlauf-Graph ohne Fehler mit echten trickLog-Daten", () => {
    const state = {
      score: 1000, formationScore: 300, critBonusScore: 200, buildingScore: 100, streakScore: 150,
      trickLog: [[{ gained: 50, won: true }, { gained: 0, won: false }], [{ gained: 120, won: true }]],
    };
    const html = renderToStaticMarkup(createElement(RunGraphs, { state }));
    expect(html).toContain("Woraus kommt der Score");
    expect(html).toContain("Stich-Score je Durchlauf");
    expect(html).toContain("D1"); // Durchlauf-Label
  });

  it("rendert nichts bei leerem Lauf (kein Score, kein trickLog)", () => {
    const html = renderToStaticMarkup(createElement(RunGraphs, { state: { score: 0, trickLog: [] } }));
    expect(html).toBe("");
  });
});
