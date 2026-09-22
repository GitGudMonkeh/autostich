import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as CP from "../src/game/campaign.js";
import { mio } from "../src/ui/campaignText.js";
import { CampaignTally, CampaignPick, CampaignWon, CampaignLost, CampaignTile, CampaignOverview } from "../src/ui/CampaignScreens.jsx";
import { RestartConfirm } from "../src/ui/RunConfirm.jsx"; // die Warnung vor dem Kampagnen-Neustart

/* ============================================================================
   Kampagnen-UI — was der Spieler LIEST, nicht welcher Schlüssel gesetzt wurde.

   Die Lehre aus dem Beute-Audit (docs/engineering/testing.md) gilt hier genauso: ein Panel, das
   eine Zahl anzeigt, wird an der ZAHL geprüft. `toContain("campaign.pick.title")` wäre grün, wenn
   der Katalog den Schlüssel gar nicht kennt — `t()` gibt bei einem Fehlschlag den Schlüssel selbst
   zurück, und genau das sähe der Spieler dann auch auf dem Schirm.

   Ohne DOM gibt overlayPortal den Knoten unverändert zurück (overlayPortal.jsx), der statische
   Render sieht die Panels also vollständig.
   ============================================================================ */

const html = (C, props) => renderToStaticMarkup(createElement(C, props));
const txt = (h) => h.replace(/<[^>]*>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&amp;/g, "&").replace(/&middot;|&#xB7;/g, "·").replace(/\s+/g, " ");

const camp = (over = {}) => ({ ...CP.emptyCampaign(), bosses: ["denkmalpfleger", "bremser", "schliesser"], ...over });

describe("Kampagne · Auswertung am Laufende", () => {
  const c = camp({ run: 2, pending: { steps: 3, tier: 3, contracts: 2, score: 21_000_000, threshold: 10_000_000 } });
  const h = txt(html(CampaignTally, { campaign: c, score: 21_000_000, onPick: () => {} }));

  it("zeigt Endscore, Schwelle und die beiden Vielfachen-Marken als ZAHLEN", () => {
    expect(h).toContain("21 Mio");   // der erreichte Score
    expect(h).toContain("10 Mio");   // die Schwelle
    expect(h).toContain("2× 20 Mio");
    expect(h).toContain("3× 30 Mio");
  });

  it("nennt die Rarität, die stepsFor/rarityFor ausrechnen — nicht eine zweite Rechnung im Panel", () => {
    const steps = CP.stepsFor({ contracts: 2, score: 21_000_000, threshold: 10_000_000 });
    expect(steps).toBe(3);                                  // 2 Aufträge + 2× = +1
    expect(h).toContain(CP.rarityLabel(CP.rarityFor(steps, 1)));
  });

  it("sagt am Deckel, dass Episch erst ab Ebene 2 kommt", () => {
    expect(h).toContain("Episch ab Ebene 2");
    const unter = txt(html(CampaignTally, { campaign: camp({ pending: { steps: 0, tier: 1, contracts: 0, score: 6e6, threshold: 5e6 } }), score: 6e6, onPick: () => {} }));
    expect(unter, "der Deckel-Hinweis darf nur an der Kappe stehen").not.toContain("Episch ab Ebene 2");
  });
});

describe("Kampagne · Auslage", () => {
  const c = camp({ run: 1, held: { sold: 1 } });
  const offers = [
    { id: "sold", tier: 3, upgrade: true },
    { id: "feldzeichen", tier: 3, upgrade: false, axis: "crit" },
    { id: "lehen", tier: 3, upgrade: false },
  ];
  const h = txt(html(CampaignPick, { campaign: c, offers, onTake: () => {} }));

  it("trägt in jedem Wirkungstext die Zahl DIESER Stufe", () => {
    expect(h).toContain(`${CP.rewardValue("sold", 3)} Grundpunkte`);       // 350
    expect(h).toContain(`${CP.rewardValue("lehen", 3)} Zellen`);           // 6
    expect(h).toContain(`${CP.rewardValue("feldzeichen", 3)} %`);          // 35
  });

  it("zeigt die ausgewürfelte Achse des Feldzeichens", () => {
    expect(h).toContain("Crit");
  });

  it("unterscheidet Upgrade von Neuzugang und nennt die gehaltene Stufe", () => {
    expect(h).toContain("Upgrade");
    expect(h).toContain(`${CP.rarityLabel(1)}, ${CP.rewardValue("sold", 1)}`); // „Du hältst Normal, 100"
    expect(h).toContain("Neu in deiner Sammlung");
  });
});

describe("Kampagne · Siegschirm kündigt keine Ebene an, die es nicht gibt", () => {
  /* Der Gegen-Check läuft über DIESELBE Bedingung wie das Panel: CP.hasLevel. Eine Kampagne auf
     Ebene 0 hat mit Ebene 1 eine gebaute Nachfolgerin, eine auf Ebene 1 nicht — steigt LEVELS
     später auf 2, dreht sich der erste Fall von selbst mit. */
  const won = (level) => txt(html(CampaignWon, { campaign: camp({ level, run: 5, scores: [6e6, 12e6, 17e6, 30e6] }), unlocked: CP.unlocksFor(3), onNext: () => {} }));

  it("blendet den Block aus, solange die nächste Ebene nicht gebaut ist", () => {
    expect(CP.hasLevel(2)).toBe(false);
    expect(won(1)).not.toContain("FREIGESCHALTET");
    expect(won(1)).toContain("Ins Menü");
  });

  it("zeigt ihn, sobald es sie gibt", () => {
    expect(CP.hasLevel(1)).toBe(true);
    expect(won(0)).toContain("EBENE 1 FREIGESCHALTET");
    expect(won(0)).toContain("Ebene 1 beginnen");
  });

  it("listet die vier Endscores des Durchgangs", () => {
    const h = won(1);
    for (const s of ["6 Mio", "12 Mio", "17 Mio", "30 Mio"]) expect(h).toContain(s);
  });
});

describe("Kampagne · Niederlage trennt Bleibendes von Verlorenem", () => {
  const h = txt(html(CampaignLost, { campaign: camp({ run: 3, held: { sold: 2, lehen: 1 } }), score: 4_000_000, unlocked: CP.unlocksFor(2), onAgain: () => {}, onMenu: () => {} }));

  it("stellt die permanenten Freischaltungen zu „das bleibt“", () => {
    expect(h).toContain("DAS BEHÄLTST DU");
    expect(h).toContain("Pflanzen-Deck");
    expect(h).toContain("Münzen");
    expect(h).toContain(`Noch ${CP.UNLOCK_IDS.length - 2} von ${CP.UNLOCK_IDS.length} offen.`);
  });

  it("stellt die gehaltenen Rewards zu „das ist weg“", () => {
    expect(h).toContain("Sold");
    expect(h).toContain("Lehen");
  });

  it("nennt Score und verfehlte Schwelle", () => {
    expect(h).toContain("4 Mio");
    expect(h).toContain(`von ${mio(CP.thresholdWith(camp({ run: 3 }), 3))} Mio nötig`);
  });
});

describe("Kampagne · Übersicht", () => {
  it("führt die vier Schwellen und die Bosse der gezogenen Reihe", () => {
    const c = camp({ run: 2, scores: [7_500_000] });
    const h = txt(html(CampaignOverview, { campaign: c, unlocked: CP.unlocksFor(1), onStart: () => {}, onGiveUp: () => {} }));
    for (let n = 1; n <= CP.RUNS_PER_LEVEL; n++) expect(h).toContain(`${mio(CP.thresholdWith(c, n))} Mio`);
    expect(h).toContain("Der Denkmalpfleger");
    expect(h).toContain("Der Konter");                 // der Endboss steht immer an Lauf 4
    expect(h).toContain("7,5 Mio erreicht");           // der Score des bestandenen Laufs
    expect(h).toContain("Lauf 2 starten");
  });

  it("lässt keinen der beiden Zerstör-Knöpfe auf einen Klick durch", () => {
    /* Gerendert wird statisch, der zweite Klick ist hier also nicht prüfbar — prüfbar ist das, was
       zählt: im Ruhezustand steht KEINE Bestätigung auf dem Schirm, und beide Knöpfe sind da. */
    const h = txt(html(CampaignOverview, { campaign: camp(), unlocked: [], onStart: () => {}, onGiveUp: () => {}, onReset: () => {} }));
    expect(h).toContain("Kampagne aufgeben");
    expect(h).toContain("Kampagne zurücksetzen");
    expect(h).not.toContain("Wirklich aufgeben?");
    expect(h).not.toContain("Alles zurück auf null?");
  });

  it("zeigt den Reset nur, wo ein Reset angeboten wird", () => {
    const ohne = txt(html(CampaignOverview, { campaign: camp(), unlocked: [], onStart: () => {}, onGiveUp: () => {} }));
    expect(ohne).toContain("Kampagne aufgeben");
    expect(ohne).not.toContain("Kampagne zurücksetzen");
  });

  it("nennt die Fürsprache-gesenkte Schwelle, nicht die Grundschwelle", () => {
    const c = camp({ run: 1, held: { fuersprache: 3 } });
    const h = txt(html(CampaignOverview, { campaign: c, unlocked: [], onStart: () => {}, onGiveUp: () => {} }));
    const gesenkt = CP.thresholdWith(c, 1);
    expect(gesenkt).toBeLessThan(CP.thresholdFor(c, 1));
    expect(h).toContain(`${mio(gesenkt)} Mio`);
  });
});

describe("Kampagne · die Kachel im Lauf", () => {
  it("rendert nichts, wenn der Lauf keine Kampagne trägt", () => {
    expect(html(CampaignTile, { state: { score: 5e6 } })).toBe("");
  });

  it("zeigt Boss, Stand und Schwelle des laufenden Laufs", () => {
    const h = txt(html(CampaignTile, { state: { score: 8_200_000, campaign: camp({ run: 2, held: { zehnt: 2 } }) } }));
    expect(h).toContain("Der Bremser");            // bosses[1] = Lauf 2
    expect(h).toContain("8,2 Mio");
    expect(h).toContain("von 10 Mio nötig");
  });

  it("zeigt den Konter-Aufschlag mit der Zahl, die auch auf dem Brett wirkt", () => {
    const state = { score: 1e6, counterStack: 4, campaign: camp({ run: 4 }) };
    const zu = CP.enemyValueWith(state, 5, state.counterStack) - 5;   // dieselbe Rechnung wie die Engine
    expect(zu).toBe(4);
    expect(txt(html(CampaignTile, { state }))).toContain(`Nächster Gegner +${zu}`);
  });

  it("schweigt über den Aufschlag, solange der Konter nicht dran ist", () => {
    const h = txt(html(CampaignTile, { state: { score: 1e6, counterStack: 4, campaign: camp({ run: 1 }) } }));
    expect(CP.counterBonus({ counterStack: 4, campaign: camp({ run: 1 }) })).toBe(0);
    expect(h).not.toContain("Nächster Gegner");
  });
});

describe("Kampagne · Schließer sperrt sichtbar, nicht nur wirksam", () => {
  /* Die Sperre ist an zwei Stellen dieselbe: der Reducer lehnt den Tausch ab, die Aufstellung malt
     die Zelle grau. Geprüft wird die POSITIONSLISTE, die beide lesen — und dass die Aufstellung sie
     mit dem vorhandenen Sperr-Mittel (#301 C3) zusammenlegt statt ein zweites zu erfinden. */
  it("liefert genau die fünf Positionen des gezogenen Segments", () => {
    expect(CP.lockedPositions({ lockedSegment: 3 })).toEqual([15, 16, 17, 18, 19]);
    expect(CP.lockedPositions({ lockedSegment: null })).toEqual([]);
    for (const i of CP.lockedPositions({ lockedSegment: 3 })) {
      expect(CP.segmentLocked({ lockedSegment: 3 }, i)).toBe(true);
    }
    expect(CP.segmentLocked({ lockedSegment: 3 }, 14)).toBe(false);
  });

  it("legt sie in der Aufstellung mit den gesperrten Zellen zusammen", () => {
    const fp = src("ui/FormationPhase.jsx");
    const zeile = fp.split("\n").find((l) => l.includes("const chLockForm ="));
    expect(zeile, "chLockForm nicht gefunden").toBeTruthy();
    expect(zeile).toContain("challengeBlockForm");
    expect(zeile).toContain("CP.lockedPositions");
  });
});

/* ---- Die Verdrahtung in App.jsx. Textprüfung, weil die Naht dort keine Zahl ist, sondern ein
   Feld, das mitgereicht wird oder eben fehlt — und beides ist vorgekommen: der Auftragslauf fiel
   beim „Neustart" schon einmal still auf einen normalen zurück. ---- */
const src = (p) => readFileSync(fileURLToPath(new URL(`../src/${p}`, import.meta.url)), "utf8");

describe("Kampagne · Verdrahtung", () => {
  const app = src("App.jsx");

  it("reicht Stand UND Freischaltungs-Stand in denselben START_RUN", () => {
    const zeile = app.split("\n").find((l) => l.includes('type: "START_RUN"'));
    expect(zeile, "START_RUN nicht gefunden").toBeTruthy();
    expect(zeile).toContain("campaign:");
    expect(zeile).toContain("unlocked");
  });

  it("wirft beim Neustart die ganze Ebene zurück, statt denselben Lauf zu wiederholen", () => {
    /* Owner 2026-09-22. Würde der Neustart dieselbe Kette weiterreichen, ließe sich ein Lauf beliebig
       oft neu beginnen, bis die Schwelle fällt — die Kette hätte keinen Einsatz mehr. */
    const i = app.indexOf("function restartRun()");
    expect(i, "restartRun nicht gefunden").toBeGreaterThan(-1);
    const rumpf = app.slice(i, app.indexOf("\n  }", i));
    expect(rumpf).toContain("CP.startCampaign");
    expect(rumpf, "die alte Kette darf nicht weitergereicht werden").not.toContain("campaign: state.campaign");
    expect(rumpf).toContain("campaign: camp");
  });

  it("warnt vorher, dass die Ebene von vorne beginnt", () => {
    expect(app).toContain("campaign={!!state.campaign}");
    const ohne = txt(html(RestartConfirm, { onKeepPlaying: () => {}, onRestart: () => {} }));
    const mit = txt(html(RestartConfirm, { onKeepPlaying: () => {}, onRestart: () => {}, campaign: true }));
    expect(mit).toContain("wieder bei Lauf 1");
    expect(mit).toContain("Freischaltungen bleiben");
    expect(ohne, "der normale Lauf darf die Kampagnen-Warnung nicht bekommen").not.toContain("wieder bei Lauf 1");
    expect(ohne).toContain("Der aktuelle Lauf wird verworfen");
  });

  it("hängt die Panels an campScreen und nicht an state.phase", () => {
    for (const s of ["overview", "boss", "tally", "pick", "unlock", "lost", "won"]) {
      expect(app, `Panel „${s}" nicht verdrahtet`).toContain(`campScreen === "${s}"`);
    }
  });

  it("nimmt beim Reset auch die Freischaltungen mit — sonst wäre er nur ein zweites Aufgeben", () => {
    const i = app.indexOf("function resetCampaign()");
    expect(i, "resetCampaign nicht gefunden").toBeGreaterThan(-1);
    const rumpf = app.slice(i, app.indexOf("\n  }", i));
    expect(rumpf).toContain("clearCampaign()");
    expect(rumpf).toMatch(/campaignRunsWon:\s*0/);
    // Der Gegen-Check: „Aufgeben" darf sie gerade NICHT anfassen, das ist die Spielregel.
    const j = app.indexOf("function giveUpCampaign()");
    expect(app.slice(j, app.indexOf("\n", j))).not.toContain("campaignRunsWon");
  });

  it("stellt die Lauf-Kachel in die Leiste", () => {
    expect(src("ui/StatusRail.jsx")).toContain("<CampaignTile state={state} />");
  });
});
