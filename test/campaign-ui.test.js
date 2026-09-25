import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as CP from "../src/game/campaign.js";
import { mio } from "../src/ui/campaignText.js";
import { t } from "../src/i18n/index.js";
import { CampaignOverview, CampaignBoss, CampaignUnlock, CampaignFailed, CampaignWon,
         CampaignProgress, CampaignTile } from "../src/ui/CampaignScreens.jsx";
import { RestartConfirm } from "../src/ui/RunConfirm.jsx";

/* ============================================================================
   Kampagnen-UI — was der Spieler LIEST, nicht welcher Schlüssel gesetzt wurde.

   Die Lehre aus dem Beute-Audit (docs/engineering/testing.md) gilt hier genauso: ein Panel, das
   eine Zahl anzeigt, wird an der ZAHL geprüft. `toContain("campaign.title")` wäre grün, wenn der
   Katalog den Schlüssel gar nicht kennt — `t()` gibt bei einem Fehlschlag den Schlüssel selbst
   zurück, und genau das sähe der Spieler dann auch auf dem Schirm.

   Ohne DOM gibt overlayPortal den Knoten unverändert zurück (overlayPortal.jsx), der statische
   Render sieht die Panels also vollständig.
   ============================================================================ */

const html = (C, props) => renderToStaticMarkup(createElement(C, props));
const txt = (h) => h.replace(/<[^>]*>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&amp;/g, "&").replace(/&middot;|&#xB7;/g, "·").replace(/\s+/g, " ");
const camp = (over = {}) => ({ ...CP.emptyCampaign(), ...over });

describe("Kampagne · Übersicht zeigt die ganze Leiter", () => {
  const h = txt(html(CampaignOverview, { campaign: camp({ step: 3, scores: [6e6, 12e6] }),
    unlocked: CP.unlocksFor(2), onStart: () => {}, onGiveUp: () => {} }));

  it("führt alle fünf Schwellen als Zahlen", () => {
    for (const rung of CP.LADDER) expect(h, `Stufe ${rung.step}`).toContain(`${mio(rung.threshold)} Mio`);
  });

  it("nennt je Stufe, was sie freischaltet", () => {
    for (const id of CP.UNLOCK_IDS) expect(h, id).toContain(t(`campaign.unlock.${id}`));
  });

  it("zeigt die Scores der geschafften Stufen", () => {
    expect(h).toContain("6 Mio erreicht");
    expect(h).toContain("12 Mio erreicht");
  });

  it("nennt nur den Boss einer GESCHAFFTEN Stufe", () => {
    /* Owner 2026-09-23: wer vorher weiß, was kommt, baut dagegen statt sich anzupassen. Verdeckt
       steht die Art da (Miniboss/Endboss), nicht der Name. */
    expect(h, "Stufe 1 ist durch").toContain(t("campaign.boss.denkmalpfleger"));
    expect(h, "Stufe 2 ist durch").toContain(t("campaign.boss.schliesser"));
    for (const id of ["bremser", "schmarotzer", "konter"]) {
      expect(h, `${id} steht noch aus`).not.toContain(t(`campaign.boss.${id}`));
    }
    expect((h.match(/Miniboss/g) || []).length, "Stufe 3 und 4 stehen verdeckt").toBe(2);
    expect(h, "und Stufe 5 als Endboss").toContain("Endboss");
  });

  it("bietet den Start der AKTUELLEN Stufe an", () => {
    expect(h).toContain("Stufe 3 starten");
    expect(h).toContain("2 / 5");     // der Freischaltungs-Zähler
  });

  it("bietet keinen Start mehr an, wenn die Leiter durch ist", () => {
    const fertig = txt(html(CampaignOverview, { campaign: camp({ step: CP.STEPS, done: true, scores: [1e6, 2e6, 3e6, 4e6, 5e6] }),
      unlocked: CP.UNLOCK_IDS, onStart: () => {}, onGiveUp: () => {} }));
    expect(fertig).not.toContain("starten");
  });
});

describe("Kampagne · Bossblock am Stufen-Start", () => {
  const h = txt(html(CampaignBoss, { campaign: camp({ step: 2 }), onStart: () => {} }));

  it("nennt Boss, Mechanik, Stufe und Schwelle", () => {
    expect(h).toContain(t("campaign.boss.schliesser"));
    expect(h).toContain(t("campaign.boss.schliesser.text"));
    expect(h).toContain("Stufe 2");
    expect(h).toContain("10 Mio");
  });

  it("sagt, wofür man spielt", () => {
    // Die Freischaltung dieser Stufe, direkt unter dem, wogegen man spielt.
    expect(h).toContain(t("campaign.unlock.coins"));
  });

  it("holt Boss und Schwelle aus derselben Zeile der Leiter wie der Motor", () => {
    for (const rung of CP.LADDER) {
      const b = txt(html(CampaignBoss, { campaign: camp({ step: rung.step }), onStart: () => {} }));
      expect(b, `Stufe ${rung.step}`).toContain(t(`campaign.boss.${rung.boss}`));
      expect(b, `Schwelle ${rung.step}`).toContain(`${mio(rung.threshold)} Mio`);
    }
  });
});

describe("Kampagne · verfehlte Stufe", () => {
  const h = txt(html(CampaignFailed, { campaign: camp({ step: 3 }), score: 9e6, onAgain: () => {}, onMenu: () => {} }));

  it("nennt Score und verfehlte Schwelle", () => {
    expect(h).toContain("9 Mio");
    expect(h).toContain("von 25 Mio nötig");
  });

  it("bietet dieselbe Stufe noch einmal an, nicht einen Neuanfang", () => {
    expect(h).toContain("Stufe 3 wiederholen");
    expect(h, "die Kampagne ist nicht vorbei").not.toContain("Neue Kampagne");
  });

  it("führt weder Freischaltungen noch Verlorenes auf", () => {
    // Owner 2026-09-23: die zwei Kästen sind weg, die Freischaltungen stehen auf dem Kampagnenschirm.
    for (const raus of ["DAS BEHÄLTST DU", "DAS IST WEG", "offen."]) expect(h, raus).not.toContain(raus);
  });
});

describe("Kampagne · Siegschirm", () => {
  it("listet alle fünf Stufen mit Boss und Endscore", () => {
    const scores = [6e6, 12e6, 26e6, 51e6, 210e6];
    const h = txt(html(CampaignWon, { campaign: camp({ step: CP.STEPS, done: true, scores }),
      unlocked: CP.UNLOCK_IDS, onNext: () => {} }));
    for (const s of scores) expect(h, `${mio(s)} Mio`).toContain(`${mio(s)} Mio`);
    for (const rung of CP.LADDER) expect(h, rung.boss).toContain(t(`campaign.boss.${rung.boss}`));
    expect(h).toContain("5 / 5");
  });

  it("kündigt nichts an, was es noch nicht gibt", () => {
    const h = txt(html(CampaignWon, { campaign: camp({ step: CP.STEPS, done: true, scores: [1, 2, 3, 4, 5] }),
      unlocked: CP.UNLOCK_IDS, onNext: () => {} }));
    expect(h, "Stufe 6 ist nicht gebaut").not.toContain("Stufe 6");
  });

  it("zeigt eine WIRKLICH durchgespielte Kette", () => {
    /* Der Test darüber füttert einen handgebauten Stand. In der Kettenfassung half das nichts: ab
       Lauf 2 rechnete die Kampagne gar nicht mehr ab, und ein echter Durchgang hätte hier leere
       Zeilen gezeigt. */
    let c = CP.emptyCampaign();
    const scores = [6e6, 12e6, 26e6, 51e6, 210e6];
    for (let n = 1; n <= CP.STEPS; n++) c = CP.settleStep(c, { score: scores[n - 1] });
    expect(c.done).toBe(true);
    const h = txt(html(CampaignWon, { campaign: c, unlocked: CP.unlocksOf(c), onNext: () => {} }));
    for (const s of scores) expect(h, `${mio(s)} Mio fehlt`).toContain(`${mio(s)} Mio`);
  });
});

describe("Kampagne · Freischaltungs-Schirm", () => {
  it("nennt die neue Freischaltung und die nächste Stufe", () => {
    const h = txt(html(CampaignUnlock, { id: "coins", unlocked: CP.unlocksFor(2), nextStep: 3, onNext: () => {} }));
    expect(h).toContain(t("campaign.unlock.coins"));
    expect(h).toContain(t("campaign.unlock.coins.text"));
    expect(h).toContain("Weiter zu Stufe 3");
  });

  it("sagt an der Münz-Stufe, dass die Ökonomie reduziert ist", () => {
    /* Der Spieler muss es LESEN können: eine Münze je Durchlauf, Formationen zahlen nicht. Sonst
       rechnet er mit der vollen Ökonomie, die er aus einem freien Lauf kennt. */
    const text = t("campaign.unlock.coins.text");
    expect(text.toLowerCase()).toContain("münze");
    expect(text.toLowerCase()).toContain("formationen");
  });
});

describe("Schwellen-Leiste · was gezeichnet wird", () => {
  const bar = (score, step = 1) => html(CampaignProgress, { state: { campaign: camp({ step }), score } });

  it("füllt sich einmal, gemessen an der Schwelle dieser Stufe", () => {
    expect(bar(0)).toContain("width:0%");
    expect(bar(2.5e6)).toContain("width:50%");
    expect(bar(5e6)).toContain("width:100%");
    expect(bar(12.5e6, 3), "Stufe 3 misst gegen 25 Mio").toContain("width:50%");
  });

  it("bleibt über der Schwelle voll und zeigt kein Ziel mehr, das hinter einem liegt", () => {
    const h = txt(bar(9e6));
    expect(h).toContain("Geschafft");
    expect(h, "ein Ziel hinter einem läse sich wie ein Fehler").not.toContain("/ 5 Mio");
  });

  it("zeigt unter der Schwelle den Stand gegen das Ziel", () => {
    expect(txt(bar(2e6))).toContain("2 / 5 Mio");
  });

  it("rendert ohne Kampagne gar nichts", () => {
    expect(html(CampaignProgress, { state: { score: 5e6 } })).toBe("");
  });
});

describe("Lauf-Kachel", () => {
  it("nennt Stufe und Boss", () => {
    const h = txt(html(CampaignTile, { state: { campaign: camp({ step: 4 }) } }));
    expect(h).toContain("Stufe 4/5");
    expect(h).toContain(t("campaign.boss.schmarotzer"));
  });

  it("rendert ohne Kampagne gar nichts", () => {
    expect(html(CampaignTile, { state: {} })).toBe("");
  });
});

describe("Neustart-Warnung sagt die Wahrheit über die Leiter", () => {
  it("droht nicht mehr mit einer zurückgeworfenen Ebene", () => {
    const h = txt(html(RestartConfirm, { onKeepPlaying: () => {}, onRestart: () => {}, campaign: true }));
    expect(h, "die Ebenen gibt es nicht mehr").not.toContain("Ebene");
    expect(h.toLowerCase(), "dieselbe Stufe kommt wieder").toContain("stufe");
    expect(h.toLowerCase()).toContain("freischaltungen bleiben");
  });
});
