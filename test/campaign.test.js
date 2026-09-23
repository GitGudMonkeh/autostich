import { describe, it, expect } from "vitest";
import * as CP from "../src/game/campaign.js";

/* Deterministic rng: walks a fixed sequence, so a draw is reproducible without stubbing Math. */
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

describe("Freischaltungen", () => {
  it("öffnet eine je gewonnenem Lauf, in fester Reihenfolge", () => {
    expect(CP.unlocksFor(0)).toEqual([]);
    expect(CP.unlocksFor(1)).toEqual(["plantDeck"]);
    expect(CP.unlocksFor(3)).toEqual(["plantDeck", "coins", "contracts"]);
    expect(CP.unlocksFor(5)).toEqual(CP.UNLOCK_IDS);
  });

  it("läuft über das Ende der Liste hinaus nicht weiter", () => {
    expect(CP.unlocksFor(99)).toEqual(CP.UNLOCK_IDS);
    expect(CP.nextUnlock(99)).toBe(null);
    expect(CP.nextUnlock(0)).toBe("plantDeck");
  });

  it("gibt am Start zwei Decks und mit den Freischaltungen vier", () => {
    expect(CP.decksFor([])).toEqual(["lightning", "fire"]);
    expect(CP.decksFor(CP.unlocksFor(1))).toContain("plant");
    expect(CP.decksFor(CP.unlocksFor(1))).not.toContain("ice");
    expect(CP.decksFor(CP.UNLOCK_IDS)).toHaveLength(4);
  });

  it("deckelt die Rarität auf Selten, bis die vierte Freischaltung fällt", () => {
    expect(CP.maxTierFor([])).toBe(CP.START_MAX_TIER);
    expect(CP.maxTierFor(CP.unlocksFor(3))).toBe(CP.START_MAX_TIER);
    expect(CP.maxTierFor(CP.unlocksFor(4))).toBe(CP.MAX_TIER_L1);
  });
});

describe("Bosse", () => {
  it("hält vor der Münz-Freischaltung genau so viele bereit, wie eine Kampagne braucht", () => {
    // Die Rechnung aus docs/kampagne.md §11: drei gebraucht (Läufe 1–3), drei ohne Münzen aktiv.
    expect(CP.availableBosses([])).toHaveLength(CP.RUNS_PER_LEVEL - 1);
    expect(CP.availableBosses(CP.unlocksFor(2))).toHaveLength(CP.MID_BOSSES.length);
  });

  it("zieht nie denselben Zwischenboss zweimal in einer Kampagne", () => {
    for (let s = 0; s < 40; s++) {
      const rng = seq((s % 7) / 7, (s % 5) / 5, (s % 3) / 3, 0.5, 0.1);
      const drawn = CP.drawBosses(rng, CP.UNLOCK_IDS);
      expect(new Set(drawn).size).toBe(drawn.length);
    }
  });

  it("zieht ohne Münzen keinen Boss, der Münzen braucht", () => {
    const drawn = CP.drawBosses(seq(0.9, 0.5, 0.1), []);
    expect(drawn).toHaveLength(3);
    for (const id of drawn) expect(CP.BOSS_BY_ID[id].requires).toBeUndefined();
  });

  it("gibt Lauf 4 den Endboss statt eines Zwischenbosses", () => {
    const c = { bosses: ["bremser", "schliesser", "denkmalpfleger"] };
    expect(CP.bossFor(c, 1)).toBe("bremser");
    expect(CP.bossFor(c, 3)).toBe("denkmalpfleger");
    expect(CP.bossFor(c, 4)).toBe(CP.END_BOSS.id);
  });
});

describe("Raritätsformel", () => {
  it("zählt je Auftrag eine Stufe, gedeckelt bei zwei", () => {
    expect(CP.stepsFor({ contracts: 0, score: 0, threshold: 10 })).toBe(0);
    expect(CP.stepsFor({ contracts: 1, score: 0, threshold: 10 })).toBe(1);
    expect(CP.stepsFor({ contracts: 2, score: 0, threshold: 10 })).toBe(2);
    expect(CP.stepsFor({ contracts: 9, score: 0, threshold: 10 })).toBe(2);
  });

  it("gibt ab 2× eine Stufe und ab 3× zwei — nicht drei", () => {
    expect(CP.stepsFor({ contracts: 0, score: 19, threshold: 10 })).toBe(0);
    expect(CP.stepsFor({ contracts: 0, score: 20, threshold: 10 })).toBe(1);
    expect(CP.stepsFor({ contracts: 0, score: 29, threshold: 10 })).toBe(1);
    expect(CP.stepsFor({ contracts: 0, score: 30, threshold: 10 })).toBe(2);
    expect(CP.stepsFor({ contracts: 0, score: 300, threshold: 10 })).toBe(2);
  });

  it("trifft die Probe des Owners — und die zurückgenommene nicht mehr", () => {
    // „1 Auftrag + doppelter Score ist Sehr selten" gilt weiter.
    expect(CP.rarityFor(CP.stepsFor({ contracts: 1, score: 20, threshold: 10 }), 2)).toBe(3);
    // Die zweite Probe („kein Auftrag + dreifacher Score ist Episch") stammt aus dem Entwurf, in
    // dem 3× noch +3 gab. Der Owner hat das auf +2 gesenkt, WEIL ein starker Lauf sonst allein die
    // Spitze erreichte und der Auftrags-Eingang sich abschaltete. Seitdem ist es Sehr selten.
    expect(CP.rarityFor(CP.stepsFor({ contracts: 0, score: 30, threshold: 10 }), 2)).toBe(3);
    // Episch braucht jetzt beide Eingänge.
    expect(CP.rarityFor(CP.stepsFor({ contracts: 1, score: 30, threshold: 10 }), 2)).toBe(4);
  });

  it("staucht die Leiter in Ebene 1, statt sie oben abzuschneiden", () => {
    // Der Sinn der Stauchung: „Sehr selten" braucht BEIDE Eingänge. Zwei Aufträge allein reichen
    // nicht — genau das wäre passiert, hätte man die Leiter oben gekappt.
    expect(CP.rarityFor(2, 1)).toBe(2);                      // 2 Aufträge → nur Selten
    expect(CP.rarityFor(3, 1)).toBe(CP.MAX_TIER_L1);         // 2 Aufträge + 2× → Sehr selten
    expect(CP.rarityFor(4, 1)).toBe(CP.MAX_TIER_L1);         // die Ecke rechts unten ist redundant
  });

  it("geht in Ebene 1 nie über Sehr selten hinaus", () => {
    for (let s = 0; s <= 6; s++) expect(CP.rarityFor(s, 1)).toBeLessThanOrEqual(CP.MAX_TIER_L1);
  });

  it("bildet die Diagonale beider Ebenen vollständig ab", () => {
    const grid = (level) => [0, 1, 2].map((tasks) =>
      [1, 2, 3].map((mult) => CP.rarityFor(CP.stepsFor({ contracts: tasks, score: 10 * mult, threshold: 10 }), level)));
    expect(grid(2)).toEqual([[1, 2, 3], [2, 3, 4], [3, 4, 5]]);
    expect(grid(1)).toEqual([[1, 1, 2], [1, 2, 3], [2, 3, 3]]);
  });
});

describe("Reward-Katalog", () => {
  it("trägt in Ebene 1 genau drei Stufen je Reward", () => {
    for (const r of CP.REWARDS) expect(r.values).toHaveLength(CP.MAX_TIER_L1);
  });

  it("steigt mit jeder Stufe, nie abwärts", () => {
    for (const r of CP.REWARDS) {
      for (let t = 1; t < r.values.length; t++) expect(r.values[t]).toBeGreaterThanOrEqual(r.values[t - 1]);
    }
  });

  it("hat eindeutige Ids und keine verwaisten Achsen", () => {
    expect(new Set(CP.REWARDS.map((r) => r.id)).size).toBe(CP.REWARDS.length);
    const axes = new Set(["score", "power", "economy", "structure", "rules", "campaign"]);
    for (const r of CP.REWARDS) expect(axes.has(r.axis)).toBe(true);
  });

  it("gibt je Achse mindestens zwei Stücke", () => {
    const byAxis = {};
    for (const r of CP.REWARDS) byAxis[r.axis] = (byAxis[r.axis] || 0) + 1;
    for (const n of Object.values(byAxis)) expect(n).toBeGreaterThanOrEqual(2);
  });

  it("liest den Wert je Stufe und klemmt außerhalb", () => {
    expect(CP.rewardValue("sold", 1)).toBe(100);
    expect(CP.rewardValue("sold", 3)).toBe(350);
    expect(CP.rewardValue("sold", 9)).toBe(350);
    expect(CP.rewardValue("gibtsnicht", 1)).toBe(null);
  });
});

describe("Angebot", () => {
  it("bietet nichts an, was ohne Freischaltung nicht wirken kann", () => {
    // Owner-Entscheid: aus dem Angebot nehmen, nicht wirkungslos drin lassen.
    expect(CP.rewardAvailable("pfruende", [])).toBe(false);
    expect(CP.rewardAvailable("doppelwahl", [])).toBe(false);
    expect(CP.rewardAvailable("pfruende", CP.unlocksFor(2))).toBe(true);
    expect(CP.rewardAvailable("sold", [])).toBe(true);
  });

  it("hält zurück, was im Katalog steht, aber noch nicht wirkt", () => {
    /* Ein gewähltes Stück, das nichts tut, ist schlimmer als eines, das es noch nicht gibt. Die
       Prüfung läuft über die Flagge am Eintrag, nicht über eine Namensliste im Test: wird sie beim
       Verdrahten gesetzt gelassen, fällt das hier auf, und wird sie entfernt, verschwindet auch
       diese Erwartung von selbst mit dem leeren PENDING_REWARDS. */
    for (const id of CP.PENDING_REWARDS) {
      expect(CP.REWARD_BY_ID[id], `${id} steht in PENDING_REWARDS, aber nicht im Katalog`).toBeTruthy();
      expect(CP.REWARD_BY_ID[id].pending, `${id}: Flagge fehlt am Eintrag`).toBe(true);
    }
    const offen = CP.REWARDS.filter((r) => r.pending).map((r) => r.id);
    expect(offen, "eine Flagge ohne Eintrag in PENDING_REWARDS").toEqual(CP.PENDING_REWARDS);
    for (const id of offen) {
      expect(CP.rewardAvailable(id, CP.UNLOCK_IDS), `${id} ist noch im Angebot`).toBe(false);
      expect(CP.canOffer({}, id, 3, CP.UNLOCK_IDS)).toBe(false);
    }
    // Der Gegen-Check zum Filter: ein fertiger Reward derselben Achse kommt weiterhin durch.
    expect(CP.rewardAvailable("losentscheid", [])).toBe(true);
  });

  it("legt ohne jede Freischaltung noch genug für eine volle Auslage aus", () => {
    const frei = CP.REWARDS.filter((r) => CP.rewardAvailable(r.id, []));
    expect(frei.length).toBeGreaterThanOrEqual(CP.OFFERS_PER_PICK);
  });

  it("bietet ein gehaltenes Stück nur als Upgrade wieder an", () => {
    const held = { sold: 2 };
    expect(CP.canOffer(held, "sold", 1, [])).toBe(false);
    expect(CP.canOffer(held, "sold", 2, [])).toBe(false);
    expect(CP.canOffer(held, "sold", 3, [])).toBe(true);
    expect(CP.canOffer(held, "wetzstein", 1, [])).toBe(true);
  });

  it("legt drei verschiedene Stücke aus und markiert Upgrades", () => {
    const offers = CP.rollOffers(seq(0.1, 0.5, 0.9, 0.3), { held: { sold: 1 }, tier: 2, unlocked: CP.UNLOCK_IDS });
    expect(offers).toHaveLength(CP.OFFERS_PER_PICK);
    expect(new Set(offers.map((o) => o.id)).size).toBe(offers.length);
    for (const o of offers) {
      expect(o.tier).toBe(2);
      expect(o.upgrade).toBe(o.id === "sold");
    }
  });

  it("würfelt die Feldzeichen-Achse aus, statt sie wählen zu lassen", () => {
    const offers = CP.rollOffers(() => 0, { tier: 1, unlocked: [] });
    const fz = offers.find((o) => o.id === "feldzeichen");
    if (fz) expect(CP.MULT_AXES).toContain(fz.axis);
    for (const o of offers) if (o.id !== "feldzeichen") expect(o.axis).toBeUndefined();
  });
});

describe("Kampagnen-Verlauf", () => {
  it("startet auf Lauf 1 mit gezogenen Bossen und ohne Rewards", () => {
    const c = CP.startCampaign(seq(0.2, 0.6, 0.4), []);
    expect(c.run).toBe(1);
    expect(c.held).toEqual({});
    expect(c.bosses).toHaveLength(CP.RUNS_PER_LEVEL - 1);
  });

  it("liest die Schwelle je Lauf aus der Leiter", () => {
    const c = CP.emptyCampaign();
    expect(CP.thresholdFor(c, 1)).toBe(THRESH[0]);
    expect(CP.thresholdFor(c, 4)).toBe(THRESH[3]);
  });

  it("senkt die Schwelle mit Fürsprache — und der Lauf ohne das Reward zahlt nichts", () => {
    const ohne = CP.emptyCampaign();
    const mit = { ...ohne, held: { fuersprache: 2 } };
    expect(CP.thresholdWith(ohne, 2)).toBe(THRESH[1]);
    expect(CP.thresholdWith(mit, 2)).toBe(Math.round(THRESH[1] * 0.8));
  });

  it("verliert die Kampagne, wenn die Schwelle nicht fällt", () => {
    const after = CP.settleRun(CP.emptyCampaign(), { score: THRESH[0] - 1 });
    expect(after.lost).toBe(true);
    expect(after.pending).toBeUndefined();
  });

  it("stellt nach einem bestandenen Lauf eine Auslage in der verdienten Rarität", () => {
    const after = CP.settleRun(CP.emptyCampaign(), { score: THRESH[0] * 2, contracts: 2 });
    expect(after.lost).toBeFalsy();
    expect(after.pending.steps).toBe(3);
    expect(after.pending.tier).toBe(CP.MAX_TIER_L1);   // Ebene 1: Stufe 3 ist die Decke
  });

  it("zählt die Schwelle MIT Fürsprache, nicht die nackte", () => {
    // Sonst wäre das Reward wirkungslos: der Lauf gälte als verloren, obwohl die gesenkte
    // Schwelle gerissen ist.
    const c = { ...CP.emptyCampaign(), run: 2, held: { fuersprache: 3 } };
    const knapp = Math.round(THRESH[1] * 0.75);
    expect(knapp).toBeLessThan(THRESH[1]);
    expect(CP.settleRun(c, { score: knapp }).lost).toBeFalsy();
  });

  it("ist nach dem vierten Lauf fertig und stellt keine Auslage mehr", () => {
    const c = { ...CP.emptyCampaign(), run: CP.RUNS_PER_LEVEL };
    const after = CP.settleRun(c, { score: THRESH[3], contracts: 2 });
    expect(after.done).toBe(true);
    expect(after.pending).toBe(null);
  });

  it("nimmt ein Reward, rückt vor und merkt sich die gewürfelte Achse", () => {
    const c = CP.settleRun(CP.emptyCampaign(), { score: THRESH[0] * 3, contracts: 2 });
    const after = CP.takeReward(c, { id: "feldzeichen", tier: 2, axis: "crit" });
    expect(after.held.feldzeichen).toBe(2);
    expect(after.axes.feldzeichen).toBe("crit");
    expect(after.run).toBe(2);
    expect(after.pending).toBe(null);
  });

  it("ersetzt beim Upgrade die niedrigere Stufe, statt zu stapeln", () => {
    const c = { ...CP.emptyCampaign(), held: { sold: 1 } };
    const after = CP.takeReward(c, { id: "sold", tier: 3 });
    expect(after.held.sold).toBe(3);
    expect(Object.keys(after.held)).toHaveLength(1);
  });
});

const THRESH = CP.THRESHOLDS_L1;

describe("Wächter: was die Spec festnagelt", () => {
  it("hält die Leiter bei 5/10/15/25 Mio", () => {
    expect(THRESH).toEqual([5e6, 10e6, 15e6, 25e6]);
  });

  it("hält vier Läufe je Ebene und drei Rewards je Auslage", () => {
    expect(CP.RUNS_PER_LEVEL).toBe(4);
    expect(CP.OFFERS_PER_PICK).toBe(3);
  });

  it("hält fünf Freischaltungen in der vom Owner gesetzten Reihenfolge", () => {
    expect(CP.UNLOCK_IDS).toEqual(["plantDeck", "coins", "contracts", "rarityRare", "iceDeck"]);
  });

  it("kennt in Ebene 1 weder Episch noch Legendär", () => {
    const alle = new Set();
    for (let s = 0; s <= 4; s++) alle.add(CP.rarityFor(s, 1));
    expect([...alle].sort()).toEqual([1, 2, 3]);
  });
});

describe("Lauf-Konfiguration aus der Kampagne", () => {
  const base = { energy: 4, cover: 24, coins: 3, positions: 40, rng: seq(0.1, 0.3, 0.5, 0.7, 0.9, 0.2) };
  const setup = (campaign, unlocked = [], over = {}) => CP.runSetup(campaign, unlocked, { ...base, ...over });

  it("startet mit zwei Decks und hebt sie mit den Freischaltungen", () => {
    expect(setup(CP.emptyCampaign(), []).archetypes).toEqual(["lightning", "fire"]);
    expect(setup(CP.emptyCampaign(), CP.UNLOCK_IDS).archetypes).toHaveLength(4);
  });

  it("schaltet Münzen und Aufträge erst mit ihrer Freischaltung an", () => {
    const aus = setup(CP.emptyCampaign(), []);
    expect(aus.coinsEnabled).toBe(false);
    expect(aus.contracts).toBe(false);
    expect(aus.coins).toBe(0);            // kein Startkapital ohne Ökonomie
    const an = setup(CP.emptyCampaign(), CP.unlocksFor(3));
    expect(an.coinsEnabled).toBe(true);
    expect(an.contracts).toBe(true);
    expect(an.coins).toBe(3);
  });

  it("legt Mitgift auf das Startkapital, aber nur wenn Münzen laufen", () => {
    const c = { ...CP.emptyCampaign(), held: { mitgift: 2 } };
    expect(setup(c, []).coins).toBe(0);
    expect(setup(c, CP.unlocksFor(2)).coins).toBe(3 + CP.rewardValue("mitgift", 2));
  });

  it("nimmt dem Bremser zwei Energie und gibt sie Fahnenrecht zurück", () => {
    const bremser = { ...CP.emptyCampaign(), bosses: ["bremser", "x", "y"] };
    expect(setup(bremser, []).energy).toBe(2);
    expect(setup({ ...bremser, held: { fahnenrecht: 3 } }, []).energy).toBe(2 + CP.rewardValue("fahnenrecht", 3));
  });

  it("lässt die Energie nicht unter null fallen", () => {
    const bremser = { ...CP.emptyCampaign(), bosses: ["bremser"] };
    expect(setup(bremser, [], { energy: 1 }).energy).toBe(0);
  });

  it("sperrt für den Denkmalpfleger sechs verschiedene Zellen", () => {
    const c = { ...CP.emptyCampaign(), bosses: ["denkmalpfleger", "x", "y"] };
    const { blockCells } = setup(c, []);
    expect(blockCells).toHaveLength(6);
    expect(new Set(blockCells).size).toBe(6);
    for (const i of blockCells) expect(i).toBeGreaterThanOrEqual(0), expect(i).toBeLessThan(40);
  });

  it("sperrt ohne Denkmalpfleger gar nichts", () => {
    const c = { ...CP.emptyCampaign(), bosses: ["bremser", "x", "y"] };
    expect(setup(c, []).blockCells).toEqual([]);
  });

  it("hebt das Baufeld mit Lehen, aber nie über das Brett hinaus", () => {
    expect(setup(CP.emptyCampaign(), []).cover).toBe(24);
    expect(setup({ ...CP.emptyCampaign(), held: { lehen: 3 } }, []).cover).toBe(24 + CP.rewardValue("lehen", 3));
    expect(setup({ ...CP.emptyCampaign(), held: { lehen: 3 } }, [], { cover: 38 }).cover).toBe(40);
  });

  it("reicht die Schwelle des aktuellen Laufs durch, samt Fürsprache", () => {
    expect(setup(CP.emptyCampaign(), []).threshold).toBe(CP.THRESHOLDS_L1[0]);
    const c = { ...CP.emptyCampaign(), run: 3, held: { fuersprache: 1 } };
    expect(setup(c, []).threshold).toBe(Math.round(CP.THRESHOLDS_L1[2] * 0.9));
  });

  it("deckelt die Rarität, bis die vierte Freischaltung fällt", () => {
    expect(setup(CP.emptyCampaign(), []).rareCap).toBe(CP.START_MAX_TIER);
    expect(setup(CP.emptyCampaign(), CP.unlocksFor(4)).rareCap).toBe(CP.MAX_TIER_L1);
  });

  it("gibt Lauf 4 den Endboss und damit keine Zellsperre des Denkmalpflegers", () => {
    const c = { ...CP.emptyCampaign(), run: 4, bosses: ["denkmalpfleger", "x", "y"] };
    expect(setup(c, []).blockCells).toEqual([]);
    expect(setup(c, []).energy).toBe(4);
  });
});

import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { randomPolicy } from "../sim/policies/random.js";
import { rerollPrice, energyPrice, coverPrice, energyBuy, coverBuy, upgradeBuy, focusPrice, FOCUS_PRICE } from "../src/game/coins.js";
import { rerollOfferWith, liftDoorTiers, liftSkillTiers } from "../src/game/contracts.js";
import { FORMATION_ENERGY as C_FORMATION_ENERGY } from "../src/game/constants.js";
import { archetypeOf } from "../src/game/skills.js";
import { familyDef, enumeratePlacements } from "../src/game/architect.js";
import { readFileSync } from "node:fs";

/* Verdrahtung: nicht der geschriebene Schlüssel zählt, sondern die Zahl im Lauf-State. Die Lehre
   aus dem Beute-Audit (Veredelung schrieb ihren Schlüssel und wirkte trotzdem nie). */
describe("Kampagne im Reducer", () => {
  const start = (campaign, unlocked = [], seed = 7) =>
    reducer(null, { type: "START_RUN", rng: makeRng(seed), seed, architect: true, campaign, unlocked });

  it("lässt einen Lauf OHNE Kampagne unverändert", () => {
    const s = reducer(null, { type: "START_RUN", rng: makeRng(7), seed: 7, architect: true });
    expect(s.campaign).toBeUndefined();
    expect(s.coinsEnabled).toBeUndefined();
    expect(s.rareCap).toBe(4);
  });

  it("nimmt dem Ebene-1-Start Münzen, Aufträge und zwei Decks", () => {
    const s = start(CP.emptyCampaign(), []);
    expect(s.campaign).toBeTruthy();
    expect(s.coins).toBe(0);
    expect(s.coinsEnabled).toBe(false);
    expect(s.contractsEnabled).toBeFalsy();
    expect(s.unlockedArchetypes).toEqual(["lightning", "fire"]);
    expect(s.rareCap).toBe(CP.START_MAX_TIER);
  });

  it("öffnet mit den Freischaltungen Münzen, Aufträge und den Raritäts-Deckel", () => {
    const s = start(CP.emptyCampaign(), CP.unlocksFor(4));
    expect(s.coinsEnabled).toBe(true);
    expect(s.coins).toBeGreaterThan(0);
    expect(s.contractsEnabled).toBe(true);
    expect(s.rareCap).toBe(CP.MAX_TIER_L1);
    expect(s.unlockedArchetypes).toContain("plant");
  });

  it("sperrt dem Denkmalpfleger sechs Bauzellen auf der bestehenden Naht", () => {
    const c = { ...CP.emptyCampaign(), bosses: ["denkmalpfleger", "x", "y"] };
    expect(start(c, []).challengeBlockArch).toHaveLength(6);
    expect(start({ ...c, bosses: ["bremser", "x", "y"] }, []).challengeBlockArch).toHaveLength(0);
  });

  it("nimmt dem Bremser zwei Aufstell-Energie im echten State", () => {
    const ohne = start({ ...CP.emptyCampaign(), bosses: ["schliesser", "x", "y"] }, []);
    const mit = start({ ...CP.emptyCampaign(), bosses: ["bremser", "x", "y"] }, []);
    expect(mit.formationEnergyBase).toBe(ohne.formationEnergyBase - 2);
  });

  it("hebt das Baufeld mit Lehen im echten State", () => {
    const ohne = start(CP.emptyCampaign(), []);
    const mit = start({ ...CP.emptyCampaign(), held: { lehen: 2 } }, []);
    expect(mit.architect.maxCover).toBe(ohne.architect.maxCover + CP.rewardValue("lehen", 2));
  });

  it("lässt über einen ganzen Lauf keine einzige Münze zulaufen, solange die Ökonomie zu ist", () => {
    // Der eigentliche Beweis: nicht die Flagge, sondern der Kontostand nach 50 Durchläufen.
    const rng = makeRng(3);
    let s = start(CP.emptyCampaign(), [], 3);
    const pol = randomPolicy({ architectGreedy: true });
    let guard = 0;
    while (s.phase !== "gameover") {
      if (++guard > 200000) throw new Error("stuck");
      s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
    }
    expect(s.coins).toBe(0);
    expect(s.score).toBeGreaterThan(0);   // der Lauf hat wirklich gespielt
  });

  it("zahlt Pfründe je Durchlauf obendrauf, sobald Münzen laufen", () => {
    const basis = { campaign: { ...CP.emptyCampaign(), held: {} }, coinsEnabled: true };
    const mit = { campaign: { ...CP.emptyCampaign(), held: { pfruende: 2 } }, coinsEnabled: true };
    expect(CP.campaignCoinsWith(basis, 5)).toBe(5);
    expect(CP.campaignCoinsWith(mit, 5)).toBe(5 + CP.rewardValue("pfruende", 2));
    expect(CP.campaignCoinsWith({}, 5)).toBe(5);                                  // Lauf ohne Kampagne
    expect(CP.campaignCoinsWith({ campaign: CP.emptyCampaign(), coinsEnabled: false }, 5)).toBe(0);
  });
});

/* Die Laufzeit-Türen. Jede prüft eine ZAHL, und jede prüft zusätzlich, dass ein Lauf ohne
   Kampagne seinen Eingabewert unverändert zurückbekommt — das ist der Vertrag der Bauform. */
describe("Türen im Stich", () => {
  const camp = (held = {}, over = {}) => ({ campaign: { ...CP.emptyCampaign(), held, ...over } });

  it("Sold hebt die Basispunkte, sonst nichts", () => {
    expect(CP.soldWith({}, 400)).toBe(400);
    expect(CP.soldWith(camp({}), 400)).toBe(400);
    expect(CP.soldWith(camp({ sold: 3 }), 400)).toBe(400 + CP.rewardValue("sold", 3));
  });

  it("Feldzeichen hebt den BONUS einer Achse, nicht ihren Wert", () => {
    // Der Kern: eine inaktive Achse steht auf 1 und muss auf 1 bleiben — sonst bekäme ein
    // Nicht-Crit-Stich plötzlich den Crit-Bonus geschenkt.
    const s = camp({ feldzeichen: 3 }, { axes: { feldzeichen: "crit" } });
    expect(CP.axisMultWith(s, "crit", 1)).toBe(1);
    expect(CP.axisMultWith(s, "crit", 3)).toBeCloseTo(1 + 2 * 1.35, 6);
    expect(CP.axisMultWith(s, "perk", 3)).toBe(3);      // die andere Achse bleibt unberührt
    expect(CP.axisMultWith({}, "crit", 3)).toBe(3);     // Lauf ohne Kampagne
  });

  it("Steigbrief wächst je zehn Durchläufe und steht am Laufende beim Fünffachen", () => {
    const s = camp({ steigbrief: 2 });
    const pro = CP.rewardValue("steigbrief", 2) / 100;
    expect(CP.steigbriefWith(s, 0, 1)).toBe(1);
    expect(CP.steigbriefWith(s, 9, 1)).toBe(1);
    expect(CP.steigbriefWith(s, 10, 1)).toBeCloseTo(1 + pro, 6);
    expect(CP.steigbriefWith(s, 50, 1)).toBeCloseTo(1 + 5 * pro, 6);
    expect(CP.steigbriefWith({}, 50, 1)).toBe(1);
  });

  it("Waffenrecht hebt den eigenen Kampfwert", () => {
    expect(CP.cardValueWith({}, 7)).toBe(7);
    expect(CP.cardValueWith(camp({ waffenrecht: 2 }), 7)).toBe(7 + CP.rewardValue("waffenrecht", 2));
  });

  it("Zehnt senkt den Gegnerwert, nie unter null", () => {
    expect(CP.enemyValueWith({}, 7)).toBe(7);
    expect(CP.enemyValueWith(camp({ zehnt: 3 }), 7)).toBe(7 - CP.rewardValue("zehnt", 3));
    expect(CP.enemyValueWith(camp({ zehnt: 3 }), 1)).toBe(0);
  });

  it("Der Konter legt je gewonnenem Stich auf die nächste Gegnerkarte nach", () => {
    const konter = camp({}, { run: 4 });
    expect(CP.enemyValueWith(konter, 6, 0)).toBe(6);
    expect(CP.enemyValueWith(konter, 6, 5)).toBe(11);
    // In den Läufen 1–3 steht der Endboss nicht auf dem Feld.
    expect(CP.enemyValueWith(camp({}, { run: 1, bosses: ["bremser", "x", "y"] }), 6, 5)).toBe(6);
  });

  it("Losentscheid liest dieselbe Marge wie Patt, die weitere gilt", () => {
    expect(CP.pattMarginWith({}, 2)).toBe(2);
    expect(CP.pattMarginWith(camp({ losentscheid: 1 }), 2)).toBe(2);   // Patt ist weiter
    expect(CP.pattMarginWith(camp({ losentscheid: 3 }), 2)).toBe(3);
    expect(CP.pattMarginWith(camp({ losentscheid: 3 }), 0)).toBe(3);   // ohne Patt zählt es allein
  });

  it("Standhaftigkeit lässt die Serie so viele Niederlagen überleben, wie die Stufe sagt", () => {
    expect(CP.streakSurvivesWith({}, 1)).toBe(false);
    const s = camp({ standhaftigkeit: 2 });
    expect(CP.streakSurvivesWith(s, 1)).toBe(true);
    expect(CP.streakSurvivesWith(s, 2)).toBe(true);
    expect(CP.streakSurvivesWith(s, 3)).toBe(false);
  });

  it("Lückenschluss hebt denselben Regler, den E_PACE schon dreht", () => {
    expect(CP.formationGapWith({}, 0)).toBe(0);
    expect(CP.formationGapWith(camp({ lueckenschluss: 3 }), 0)).toBe(CP.rewardValue("lueckenschluss", 3));
    expect(CP.formationGapWith(camp({ lueckenschluss: 1 }), 1)).toBe(1 + CP.rewardValue("lueckenschluss", 1));
  });

  it("Wucherer verdreifacht die Preistreppe — an der Treppe, nicht am fertigen Preis", () => {
    // Die Leiter liegt als schlichte Zahl auf dem State; coins.js kennt die Kampagne nicht.
    expect(rerollPrice(0, false)).toBe(3);
    expect(rerollPrice(1, false)).toBe(6);
    expect(rerollPrice(2, false)).toBe(12);
    expect(rerollPrice(0, false, 3)).toBe(3);
    expect(rerollPrice(1, false, 3)).toBe(9);
    expect(rerollPrice(2, false, 3)).toBe(27);   // genau die Leiter des Owners
    // Der legendäre Neuwurf hat eine EIGENE Basis — daran wäre eine Nachrechnung am fertigen
    // Preis gescheitert (aus 15 ließe sich die Stufenzahl nicht zurückrechnen).
    expect(rerollPrice(0, true, 3)).toBe(15);
    expect(rerollPrice(1, true, 3)).toBe(45);
  });

  it("gibt Wucherer als Leiter aus der Lauf-Konfiguration weiter", () => {
    const w = { ...CP.emptyCampaign(), bosses: ["wucherer", "x", "y"] };
    const opts = { energy: 4, cover: 24, coins: 3, positions: 40, rng: () => 0.5 };
    expect(CP.runSetup(w, CP.unlocksFor(2), opts).priceLadder).toBe(3);
    expect(CP.runSetup(CP.emptyCampaign(), [], opts).priceLadder).toBe(null);
  });

  it("Handelsbrief nimmt Prozente vom fertigen Preis", () => {
    expect(CP.discountWith({}, 100)).toBe(100);
    expect(CP.discountWith(camp({ handelsbrief: 3 }), 100)).toBe(100 - CP.rewardValue("handelsbrief", 3));
    expect(CP.discountWith(camp({ handelsbrief: 3 }), 1)).toBe(1);   // nie unter einer Münze
  });

  it("Schmarotzer rundet zugunsten des Spielers und nimmt nie mehr, als da ist", () => {
    const s = { ...camp({}, { bosses: ["schmarotzer", "x", "y"] }), coinsEnabled: true, coins: 99 };
    expect(CP.upkeepWith(s, 0)).toBe(0);
    expect(CP.upkeepWith(s, 2)).toBe(1);
    expect(CP.upkeepWith(s, 3)).toBe(1);   // drei Perks kosten EINE Münze, nicht zwei
    expect(CP.upkeepWith(s, 4)).toBe(2);
    expect(CP.upkeepWith({ ...s, coins: 1 }, 6)).toBe(1);
    expect(CP.upkeepWith({ ...s, coinsEnabled: false }, 6)).toBe(0);
    expect(CP.upkeepWith({ campaign: CP.emptyCampaign() }, 6)).toBe(0);       // ohne den Boss
  });
});

describe("Wucherer auf den anderen Kaufflächen", () => {
  it("verdreifacht auch Energie und Baufeld, jede mit eigenem Zähler", () => {
    const w = { coins: 999, priceLadder: 3 };
    expect(energyBuy({ coins: 999, coinEnergy: 0 }).price).toBe(3);
    expect(energyBuy({ coins: 999, coinEnergy: 1 }).price).toBe(6);
    expect(energyBuy({ ...w, coinEnergy: 1 }).price).toBe(9);
    expect(coverBuy({ coins: 999, coverBuys: 1 }).price).toBe(40);
    expect(coverBuy({ ...w, coverBuys: 1 }).price).toBe(60);
  });

  it("bleibt map-sicher: die Preisfunktionen nehmen weiter nur ein Argument", () => {
    // `[0,1].map(energyPrice)` schiebt den INDEX nach. Mit einem zweiten Parameter wäre daraus
    // still „Leiter 0" und „Leiter 1" geworden — der Grund, warum die Leiter über priceStep läuft.
    expect([0, 1].map(energyPrice)).toEqual([3, 6]);
    expect([0, 1].map(coverPrice)).toEqual([20, 40]);
  });
});

describe("Schließer und Lauf-Ende im Reducer", () => {
  const start = (campaign, unlocked = [], seed = 11) =>
    reducer(null, { type: "START_RUN", rng: makeRng(seed), seed, architect: true, campaign, unlocked });

  const play = (s, seed = 11, until = () => false) => {
    const rng = makeRng(seed);
    const pol = randomPolicy({ architectGreedy: true });
    let guard = 0;
    while (s.phase !== "gameover" && !until(s)) {
      if (++guard > 200000) throw new Error("stuck");
      s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
    }
    return s;
  };

  it("setzt mit dem Schließer in jeder Aufstellphase genau ein Segment fest", () => {
    const c = { ...CP.emptyCampaign(), bosses: ["schliesser", "x", "y"] };
    const s = play(start(c), 11, (x) => x.phase === "formation");
    expect(s.phase).toBe("formation");
    expect(s.lockedSegment).not.toBe(null);
    expect(s.lockedSegment).toBeGreaterThanOrEqual(0);
    expect(s.lockedSegment).toBeLessThan(8);
  });

  it("lässt ohne Schließer kein Segment festsetzen", () => {
    const c = { ...CP.emptyCampaign(), bosses: ["bremser", "x", "y"] };
    const s = play(start(c), 11, (x) => x.phase === "formation");
    expect(s.lockedSegment).toBe(null);
  });

  it("weist einen Tausch im festgesetzten Segment ab — an beiden Enden", () => {
    const c = { ...CP.emptyCampaign(), bosses: ["schliesser", "x", "y"] };
    const s = play(start(c), 11, (x) => x.phase === "formation" && (x.formationEnergy || 0) > 0);
    const seg = s.lockedSegment;
    const drin = seg * CP.SEGMENT_SIZE;                       // eine Karte IM Segment
    const raus = ((seg + 2) % 8) * CP.SEGMENT_SIZE;           // eine weit außerhalb
    expect(reducer(s, { type: "SWAP_CARDS", i: drin, j: raus })).toBe(s);   // weg: abgewiesen
    expect(reducer(s, { type: "SWAP_CARDS", i: raus, j: drin })).toBe(s);   // hin: auch
    const frei = ((seg + 1) % 8) * CP.SEGMENT_SIZE;
    expect(reducer(s, { type: "SWAP_CARDS", i: frei, j: raus })).not.toBe(s); // außerhalb geht
  });

  it("Lückenschluss wirkt im echten Lauf, nicht nur in computeFormations", () => {
    /* Gemessen, nicht behauptet: derselbe Seed zweimal bis zur ersten Aufstellphase, einmal mit
       und einmal ohne den Reward. Die Kontrolle steht daneben — beide Läufe müssen DIESELBE
       Auslage haben, sonst misst der Vergleich zwei verschiedene Bretter statt der Erkennung.
       Der Reward greift nur, wo ein Lauf wirklich von einer fremden Karte gebrochen wird; deshalb
       fordert der Test „nie schlechter" auf jedem Seed und „irgendwo besser" über die Reihe.

       GEGENGEPRÜFT, und die Grenze gehört dazu: dieser Test wird rot, wenn engine.js den Regler
       nicht mehr durchreicht — nicht, wenn reducer.js ihn verliert. Die Aufstellphasen eines
       laufenden Laufs kommen aus dem Motor; der Reducer-Pfad (erster Entscheidungspunkt) wird hier
       gar nicht erreicht. Für ALLE Aufrufstellen zählt der Wächter in test/formations-gap.test.js
       die Argumente. Zwei verschiedene Fragen, zwei Tests. */
    const bosses = ["bremser", "x", "y"];
    const gesamt = (s) => (s.formations || []).reduce((a, f) => a + (f.mult || 1), 0);
    const bis = (x) => x.phase === "formation";
    let besser = 0;
    for (const seed of [11, 23, 42, 77, 91, 108]) {
      const ohne = play(start({ ...CP.emptyCampaign(), bosses }, [], seed), seed, bis);
      const mit = play(start({ ...CP.emptyCampaign(), bosses, held: { lueckenschluss: 3 } }, [], seed), seed, bis);
      expect(mit.playerOrder, `Seed ${seed}: verschiedene Auslagen, der Vergleich misst nichts`).toEqual(ohne.playerOrder);
      expect(gesamt(mit), `Seed ${seed}`).toBeGreaterThanOrEqual(gesamt(ohne));
      if (gesamt(mit) > gesamt(ohne)) besser++;
    }
    expect(besser, "der Reward hat auf keinem Seed etwas geändert — dann ist er nicht verdrahtet").toBeGreaterThan(0);
  });

  it("rechnet das Laufende ab: Schwelle gerissen heißt Auslage, verfehlt heißt verloren", () => {
    const stark = play(start({ ...CP.emptyCampaign(), bosses: ["bremser", "x", "y"] }));
    expect(stark.phase).toBe("gameover");
    expect(stark.campaign.settled).toBe(true);
    // Lauf 1 hat Schwelle 5 Mio; ein voller Lauf reißt sie normalerweise.
    if (stark.score >= CP.THRESHOLDS_L1[0]) {
      expect(stark.campaign.lost).toBeFalsy();
      expect(stark.campaign.pending).toBeTruthy();
      expect(stark.campaign.pending.tier).toBeGreaterThanOrEqual(1);
    } else {
      expect(stark.campaign.lost).toBe(true);
    }
    expect(stark.campaign.scores).toHaveLength(1);
  });

  it("rechnet nicht zweimal ab", () => {
    /* `settled` macht die Abrechnung idempotent. Der Weg dorthin muss echt sein: END_RUN kehrt bei
       Gameover schon vorher um und erreicht die Abrechnung nie — ein Test darüber sähe wie ein
       Wächter aus, ohne einer zu sein. RESOLVE_TRICK hat keine Phasen-Sperre und läuft wieder
       durch, also ist das der Pfad, an dem die Doppelwertung tatsächlich droht. */
    const s = play(start(CP.emptyCampaign()));
    expect(s.campaign.scores).toHaveLength(1);
    const nochmal = reducer(s, { type: "RESOLVE_TRICK", rng: makeRng(11) });
    expect(nochmal.campaign.scores).toHaveLength(1);
    expect(reducer(s, { type: "END_RUN" }).campaign.scores).toHaveLength(1);
  });

  it("wertet auch das freiwillige Beenden", () => {
    const mitten = play(start(CP.emptyCampaign()), 11, (x) => (x.cycle || 0) >= 3);
    const beendet = reducer(mitten, { type: "END_RUN" });
    expect(beendet.phase).toBe("gameover");
    expect(beendet.campaign.settled).toBe(true);
    expect(beendet.campaign.lost).toBe(true);   // nach drei Durchläufen reißt die Schwelle nicht
  });
});

/* ============================================================================
   DOPPELWAHL — nach einem erfüllten Auftrag liegen zwei Stücke statt einem an.

   Drei Stufen mit drei verschiedenen Lebensdauern (docs/kampagne.md §9), und zwei davon überleben
   den Lauf nicht, in dem sie gelten. Geprüft wird deshalb an beiden Enden: das Budget, das der
   Kampagnen-Stand liefert, UND was der Reducer daraus macht, wenn die Auslage wirklich dasteht.
   ============================================================================ */
describe("Doppelwahl · das Budget je Lauf", () => {
  const camp = (over) => ({ ...CP.emptyCampaign(), ...over });

  it("gibt ohne den Reward nichts her", () => {
    expect(CP.doubleLootFor(null)).toBe(0);
    expect(CP.doubleLootFor(camp({}))).toBe(0);
    expect(CP.doubleLootFor(camp({ held: { sold: 3 } }))).toBe(0);
  });

  it("Stufe I ist ein Gutschein: einer, und nach dem Einlösen keiner", () => {
    const frisch = camp({ held: { doppelwahl: 1 }, double: { run: 2, used: false } });
    expect(CP.doubleLootFor(frisch)).toBe(1);
    expect(CP.doubleLootFor({ ...frisch, double: { run: 2, used: true } })).toBe(0);
    // Er hängt NICHT am Lauf — ein Gutschein, der erst zwei Läufe später eingelöst wird, gilt noch.
    expect(CP.doubleLootFor({ ...frisch, run: 4 })).toBe(1);
  });

  it("Stufe II gilt genau den Lauf, der auf die Wahl folgt", () => {
    const c = camp({ run: 2, held: { doppelwahl: 2 }, double: { run: 2, used: false } });
    expect(CP.doubleLootFor(c)).toBe(Infinity);
    expect(CP.doubleLootFor({ ...c, run: 3 })).toBe(0);
    expect(CP.doubleLootFor({ ...c, run: 1 })).toBe(0);
  });

  it("Stufe III gilt immer, auch ohne jede Marke", () => {
    for (const run of [1, 2, 3, 4]) {
      expect(CP.doubleLootFor(camp({ run, held: { doppelwahl: 3 } }))).toBe(Infinity);
    }
    expect(CP.doubleLootFor(camp({ run: 3, held: { doppelwahl: 3 }, double: { run: 1, used: true } }))).toBe(Infinity);
  });

  it("die Wahl setzt die Marke auf den Lauf, der jetzt beginnt — und ein Upgrade setzt sie neu", () => {
    const c = camp({ run: 1 });
    const nachI = CP.takeReward(c, { id: "doppelwahl", tier: 1 });
    expect(nachI.double).toEqual({ run: 2, used: false });
    expect(nachI.run).toBe(2);
    const gebraucht = { ...nachI, double: { run: 2, used: true }, run: 3 };
    const nachII = CP.takeReward(gebraucht, { id: "doppelwahl", tier: 2 });
    expect(nachII.double, "das Upgrade armiert neu, gekauft ist gekauft").toEqual({ run: 4, used: false });
    // Ein anderer Reward lässt die Marke in Ruhe.
    expect(CP.takeReward(nachII, { id: "sold", tier: 1 }).double).toEqual({ run: 4, used: false });
  });

  it("reicht das Budget durch die Lauf-Konfiguration", () => {
    const setup = (c) => CP.runSetup(c, CP.UNLOCK_IDS, { energy: 4, cover: 24, coins: 3, positions: 40, rng: () => 0 });
    expect(setup(camp({}))).toMatchObject({ doubleLoot: 0 });
    expect(setup(camp({ run: 2, held: { doppelwahl: 2 }, double: { run: 2 } }))).toMatchObject({ doubleLoot: Infinity });
    expect(setup(camp({ held: { doppelwahl: 1 } }))).toMatchObject({ doubleLoot: 1 });
  });
});

describe("Doppelwahl · die Auslage im Reducer", () => {
  const run = (over = {}) => {
    const s = reducer(null, { type: "START_RUN", rng: makeRng(5), seed: 5, architect: true, contracts: true });
    return { ...s, ...over };
  };
  const stueck = (id, tier) => ({ kind: "family", id, category: id, tier, effect: {} });
  const auslage = (take, pieces) => run({
    contracts: { ...run().contracts, pendingLoot: pieces, pendingLootTake: take },
  });

  it("nimmt ohne Doppelwahl genau eins und schließt die Auslage", () => {
    const s = auslage(1, [stueck("a", 1), stueck("b", 1), stueck("c", 1)]);
    const nach = reducer(s, { type: "PICK_LOOT", lootId: "a", tier: 1 });
    expect(nach.contracts.pendingLoot).toBe(null);
    expect(nach.contracts.taken.map((t) => t.id)).toEqual(["a"]);
  });

  it("verhält sich ohne das Feld wie vorher — ein Griff", () => {
    const ohneFeld = run();
    const s = { ...ohneFeld, contracts: { ...ohneFeld.contracts, pendingLoot: [stueck("a", 1), stueck("b", 1)] } };
    expect(s.contracts.pendingLootTake).toBeUndefined();
    expect(reducer(s, { type: "PICK_LOOT", lootId: "a", tier: 1 }).contracts.pendingLoot).toBe(null);
  });

  it("lässt bei zwei Griffen die Auslage offen und nimmt nur das gewählte Stück heraus", () => {
    const s = auslage(2, [stueck("a", 1), stueck("b", 1), stueck("c", 1)]);
    const erste = reducer(s, { type: "PICK_LOOT", lootId: "b", tier: 1 });
    expect(erste.contracts.pendingLoot.map((p) => p.id)).toEqual(["a", "c"]);
    expect(erste.contracts.pendingLootTake).toBe(1);
    expect(erste.contracts.taken.map((t) => t.id)).toEqual(["b"]);
    const zweite = reducer(erste, { type: "PICK_LOOT", lootId: "c", tier: 1 });
    expect(zweite.contracts.pendingLoot, "nach dem zweiten Griff ist Schluss").toBe(null);
    expect(zweite.contracts.pendingLootTake).toBe(0);
    expect(zweite.contracts.taken.map((t) => t.id)).toEqual(["b", "c"]);
  });

  it("schließt auch dann, wenn nach dem ersten Griff nichts mehr daliegt", () => {
    const s = auslage(2, [stueck("a", 1)]);
    expect(reducer(s, { type: "PICK_LOOT", lootId: "a", tier: 1 }).contracts.pendingLoot).toBe(null);
  });

  it("legt zwei Nachwahlen zusammen, statt die erste zu überschreiben", () => {
    /* Das war der Grund, warum die Doppelwahl nicht nebenbei ging: beide Stücke können eine
       Nachwahl mitbringen, und die zweite hätte die erste stumm gelöscht. */
    const voll = { kind: "legendary", id: "vollendung", tier: 5, effect: { skillToEpic: 1, skillUpRest: 1 } };
    const s = run({ skills: ["s1", "s2", "s3"], skillTiers: { s1: 0, s2: 1, s3: 0 } });
    const armed = { ...s, contracts: { ...s.contracts, pendingLoot: [voll, { ...voll, tier: 4 }], pendingLootTake: 2 } };
    const erste = reducer(armed, { type: "PICK_LOOT", lootId: "vollendung", tier: 5 });
    expect(erste.contracts.pendingSkillPick).toEqual({ rest: 1 });
    const zweite = reducer(erste, { type: "PICK_LOOT", lootId: "vollendung", tier: 4 });
    expect(zweite.contracts.pendingSkillPick, "beide Nachwahlen, als Summe").toEqual({ rest: 2 });
  });
});

describe("Doppelwahl · im echten Auftragslauf", () => {
  /* Die Naht, die ein gestellter Zustand NICHT prüft: aus `state.doubleLoot` müssen beim Auslegen
     wirklich zwei Griffe werden. Mit handgesetztem `pendingLootTake` bleibt sie still — genau das
     ist bei der Gegenprobe aufgefallen. Also ein echter Lauf bis zur ersten Auszahlung. */
  const bisZurBeute = (campaign, seed = 1) => {
    const pol = randomPolicy({ architectGreedy: true });
    const rng = makeRng(seed);
    let s = reducer(null, { type: "START_RUN", rng, seed, architect: true, campaign, unlocked: CP.UNLOCK_IDS });
    let guard = 0;
    while (s.phase !== "gameover") {
      if (++guard > 200000) throw new Error("kein Fortschritt");
      const c = s.contracts || {};
      if ((c.pendingLoot || []).length) return s;           // hier wollen wir hin
      if (c.pendingBorderPick) { s = reducer(s, { type: "PICK_CONTRACT_BORDER", borders: [] }); continue; }
      if (c.pendingSkillPick) { s = reducer(s, { type: "PICK_CONTRACT_SKILL", skillId: null }); continue; }
      if ((c.offers || []).length) {
        const o = c.offers.find((x) => x.step === "leicht") || c.offers[0];
        s = reducer(s, { type: "PICK_CONTRACT", taskId: o.taskId, step: o.step });
        continue;
      }
      s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
    }
    return null;
  };

  const kampagne = (held) => ({ ...CP.emptyCampaign(), bosses: ["bremser", "x", "y"], held });
  /* Nicht jeder Seed erfüllt einen Auftrag. Der erste, der es tut, wird für BEIDE Seiten benutzt —
     sonst verglichen die zwei Läufe verschiedene Bretter. */
  const SEED = [1, 2, 3, 4, 5, 6, 7, 8].find((n) => bisZurBeute(kampagne({}), n));

  it("legt mit dem Reward zwei Griffe aus, ohne ihn einen", () => {
    expect(SEED, "kein Seed erfüllt einen Auftrag — der Test misst nichts").toBeDefined();
    const ohne = bisZurBeute(kampagne({}), SEED);
    expect(ohne).not.toBeNull();
    expect(ohne.contracts.pendingLootTake).toBe(1);
    expect(ohne.doubleLoot).toBe(0);

    const mit = bisZurBeute(kampagne({ doppelwahl: 3 }), SEED);
    expect(mit).not.toBeNull();
    expect(mit.contracts.pendingLootTake).toBe(2);
    expect(mit.doubleLoot).toBe(Infinity);
    // Kontrolle: dieselbe Auslage, nur die Zahl der Griffe unterscheidet sich.
    expect(mit.contracts.pendingLoot.map((p) => p.id)).toEqual(ohne.contracts.pendingLoot.map((p) => p.id));
  }, 30_000);

  it("Stufe I löst den Gutschein ein und schreibt das in den Kampagnen-Stand", () => {
    const s = bisZurBeute(kampagne({ doppelwahl: 1 }), SEED);
    expect(s).not.toBeNull();
    expect(s.contracts.pendingLootTake, "der Gutschein zahlt einmal zwei").toBe(2);
    expect(s.doubleLoot, "und ist danach leer").toBe(0);
    expect(s.campaign.double.used, "das überlebt den Lauf, also steht es im Stand").toBe(true);
  }, 30_000);
});

/* ============================================================================
   DIE BEDINGUNGEN MÜSSEN AUCH ANKOMMEN (Playtest exp, 2026-09-23)

   Zweiter Fund derselben Art: `runSetup` schreibt `rareCap: 2` in den Lauf, der Reducer trägt es
   ein, ein Test bestätigt das Feld — und die Skill-Türen boten „Sehr selten" an, weil sie den
   Deckel als einziges System nie gelesen haben. (Der erste Fund war dieselbe Form: `coinsEnabled`
   stand richtig da, die Oberfläche zeigte trotzdem Preise.)

   Genau davor warnt AGENTS.md: prüfen, dass sich eine ZAHL ändert, nicht dass ein Schlüssel
   geschrieben wird. Die Tests darüber prüfen die Felder — das ist richtig und reicht NICHT. Hier
   steht deshalb für jede Kampagnen-Bedingung, was im echten Lauf herauskommt.
   ============================================================================ */
describe("Kampagnen-Bedingungen im echten Lauf", () => {
  const start = (unlocked, seed = 3) =>
    reducer(null, { type: "START_RUN", rng: makeRng(seed), seed, architect: true,
                    campaign: { ...CP.emptyCampaign(), bosses: ["bremser", "x", "y"] }, unlocked });

  /* Alle Stufen, die in einem ganzen Lauf tatsächlich angeboten werden — Türen wie geöffnete
     Angebote, samt der Legendären, die gar keine Stufe tragen. */
  const angeboteneStufen = (s0, seed = 3) => {
    const pol = randomPolicy({ architectGreedy: true });
    const rng = makeRng(seed);
    let s = s0, guard = 0;
    const stufen = new Set(), legendaer = [];
    const sammle = (st) => {
      for (const d of st.skillDoors || []) {
        for (const id of d.skills || []) {
          if (id.includes("_L0")) legendaer.push(id);
          else stufen.add((d.tiers || {})[id] ?? 0);
        }
      }
      for (const id of st.skillOffer || []) {
        if (id.includes("_L0")) legendaer.push(id);
        else stufen.add((st.skillOfferTiers || {})[id] ?? 0);
      }
    };
    while (s.phase !== "gameover") {
      if (++guard > 200000) throw new Error("kein Fortschritt");
      sammle(s);
      s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
    }
    return { stufen: [...stufen].sort(), legendaer };
  };

  it("deckelt die Stufe der SKILL-Angebote, nicht nur das Feld im State", () => {
    /* Der Fund vom 2026-09-23. Ohne die Freischaltung darf über einen ganzen Lauf keine Tür eine
       Stufe über „Selten" tragen — und kein Legendäres, die schalten mit „lila" frei. */
    const s = start([]);
    expect(s.rareCap, "Vorbedingung: der Deckel steht im State").toBe(CP.START_MAX_TIER);
    const { stufen, legendaer } = angeboteneStufen(s);
    expect(stufen.length, "der Lauf hat überhaupt Skills angeboten").toBeGreaterThan(0);
    // Stufen sind 0-basiert (rollSkillOfferTiers), der Deckel 1-basiert.
    expect(Math.max(...stufen), `angeboten: ${stufen}`).toBeLessThanOrEqual(CP.START_MAX_TIER - 1);
    expect(legendaer, "unter Stufe IV gibt es keine Legendären").toEqual([]);
  });

  it("hebt den Deckel mit der vierten Freischaltung auf Sehr selten", () => {
    const s = start(CP.unlocksFor(4));
    expect(s.rareCap).toBe(CP.MAX_TIER_L1);
    const { stufen, legendaer } = angeboteneStufen(s);
    expect(Math.max(...stufen)).toBeLessThanOrEqual(CP.MAX_TIER_L1 - 1);
    expect(legendaer, "auch Ebene 1 mit allen Freischaltungen bleibt unter Legendär").toEqual([]);
  });

  it("bietet ohne Deckel wieder alles an — sonst misst der Test nur den Deckel", () => {
    /* Gegenprobe zu den beiden oben: ein Lauf ohne Kampagne muss die hohen Stufen erreichen,
       sonst wären sie auch ohne Deckel nie erschienen und die Prüfung sagte nichts. */
    const offen = reducer(null, { type: "START_RUN", rng: makeRng(3), seed: 3, architect: true });
    expect(offen.rareCap).toBe(4);
    const { stufen } = angeboteneStufen(offen);
    expect(Math.max(...stufen), "ohne Deckel kommen hohe Stufen vor").toBeGreaterThan(CP.START_MAX_TIER - 1);
  });

  it("bietet keinen Skill einer Fraktion an, die noch nicht freigeschaltet ist", () => {
    const s = start([]);
    const pol = randomPolicy({ architectGreedy: true });
    const rng = makeRng(3);
    let cur = s, guard = 0;
    const fraktionen = new Set();
    while (cur.phase !== "gameover") {
      if (++guard > 200000) throw new Error("kein Fortschritt");
      for (const d of cur.skillDoors || []) for (const id of d.skills || []) fraktionen.add(archetypeOf(id));
      for (const id of cur.skillOffer || []) fraktionen.add(archetypeOf(id));
      cur = cur.phase === "play" ? reducer(cur, { type: "RESOLVE_TRICK", rng }) : reducer(cur, pol.act(cur, rng));
    }
    expect(fraktionen.size, "der Lauf hat überhaupt Skills angeboten").toBeGreaterThan(0);
    expect([...fraktionen].sort()).toEqual([...CP.START_DECKS].sort());
  });

  it("lässt auch Veredelung nicht über den Deckel heben", () => {
    /* Dritter Fund derselben Art (2026-09-23), und er hat ein FENSTER: Aufträge schalten mit dem
       dritten Sieg frei, die Rarität erst mit dem vierten. Dazwischen liegt ein ganzer Lauf, in dem
       eine Veredelung eine gedeckelte Stufe anheben konnte. Deshalb läuft der Test über die echte
       Freischaltungsleiter und nicht über ein handgesetztes `rareCap`. */
    const drei = CP.unlocksFor(3);
    expect(CP.contractsEnabled(drei), "Fenster: Aufträge laufen schon").toBe(true);
    const deckel = CP.maxTierFor(drei);
    expect(deckel, "Fenster: die Rarität noch nicht").toBe(CP.START_MAX_TIER);

    const doors = [{ skills: ["A", "B"], tiers: { A: 0, B: deckel - 1 } }];   // B steht genau auf dem Deckel
    const s = { contractsEnabled: true, contractBoons: { offerLift: { steps: 1, until: 12 } }, cycle: 4, rareCap: deckel };
    expect(liftDoorTiers(s, doors, 4)[0].tiers).toEqual({ A: 1, B: deckel - 1 });
    expect(liftSkillTiers(s, [0, deckel - 1], 4), "auch die flache Form").toEqual([1, deckel - 1]);

    // Gegenprobe: ohne Deckel hebt dieselbe Veredelung sehr wohl — sonst misst der Test nur sich selbst.
    const offen = { ...s, rareCap: 4 };
    expect(liftDoorTiers(offen, doors, 4)[0].tiers).toEqual({ A: 1, B: deckel });
  });

  it("legt ohne die Auftrags-Freischaltung über den ganzen Lauf kein Angebot aus", () => {
    const pol = randomPolicy({ architectGreedy: true });
    const rng = makeRng(3);
    let s = start([]), guard = 0, gesehen = 0;
    while (s.phase !== "gameover") {
      if (++guard > 200000) throw new Error("kein Fortschritt");
      if ((s.contracts?.offers || []).length || s.contracts?.active) gesehen++;
      s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
    }
    expect(gesehen, "Aufträge liefen, obwohl sie nicht freigeschaltet sind").toBe(0);
  });
});

/* Derselbe Riegel wie bei computeFormations: ein Deckel, der eine Aufrufstelle nicht erreicht,
   fällt still aus. Deshalb zählt der Wächter die Stellen, statt einer zu vertrauen. */
describe("Rarität-Deckel · jede Skill-Aufrufstelle reicht ihn durch", () => {
  const files = ["src/game/reducer.js", "src/game/engine.js"];
  const stellen = [];
  for (const f of files) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    for (const m of src.matchAll(/(?:buildSkillDoors|rerollDoorSkills)\(/g)) {
      let i = m.index + m[0].length, d = 1;
      while (i < src.length && d > 0) { const c = src[i]; if ("([{".includes(c)) d++; if (")]}".includes(c)) d--; i++; }
      stellen.push({ f, zeile: src.slice(0, m.index).split("\n").length, text: src.slice(m.index, i) });
    }
  }

  it("findet die Aufrufe überhaupt", () => {
    expect(stellen.length).toBeGreaterThan(4);
  });

  it("übergibt überall maxTier", () => {
    const ohne = stellen.filter((s) => !/maxTier:/.test(s.text)).map((s) => `${s.f}:${s.zeile}`);
    expect(ohne, `ohne Rarität-Deckel: ${ohne.join(", ")}`).toEqual([]);
  });
});

/* ============================================================================
   JEDER REWARD MUSS IM LAUF ANKOMMEN

   Die Tür-Tests oben prüfen `CP.soldWith({}, 400)` — die Rechnung. Sie sagen NICHT, dass der Motor
   sie ruft. Genau diese Lücke hat der Playtest zweimal gefunden (Münz-Oberfläche, Raritäts-Deckel):
   eine Bedingung war richtig gerechnet und erreichte ihr System nie.

   Hier läuft deshalb derselbe Seed zweimal durch einen GANZEN Lauf, einmal mit und einmal ohne das
   Stück, und verglichen wird der Fingerabdruck am Laufende. Was der Reward genau tut, steht in
   seinem Tür-Test; hier steht nur: er tut überhaupt etwas.

   Drei Seeds je Reward, und es muss auf MINDESTENS einem etwas anders herauskommen — ein Reward
   kann auf einem einzelnen Brett zufällig folgenlos bleiben.
   ============================================================================ */
describe("Rewards wirken im Lauf, nicht nur in ihrer Tür", () => {
  const SEEDS = [3, 11, 29];

  const lauf = (held, unlocked, seed, over = {}) => {
    const pol = randomPolicy({ architectGreedy: true });
    const rng = makeRng(seed);
    let s = reducer(null, { type: "START_RUN", rng, seed, architect: true, unlocked,
      campaign: { ...CP.emptyCampaign(), bosses: ["bremser", "x", "y"], held, ...over } });
    let guard = 0;
    while (s.phase !== "gameover") {
      if (++guard > 200000) throw new Error("kein Fortschritt");
      const c = s.contracts || {};
      if ((c.pendingLoot || []).length) { const p = c.pendingLoot[0]; s = reducer(s, { type: "PICK_LOOT", lootId: p.id, tier: p.tier, rng }); continue; }
      if (c.pendingBorderPick) { s = reducer(s, { type: "PICK_CONTRACT_BORDER", borders: [] }); continue; }
      if (c.pendingSkillPick) { s = reducer(s, { type: "PICK_CONTRACT_SKILL", skillId: null }); continue; }
      if ((c.offers || []).length) { const o = c.offers[0]; s = reducer(s, { type: "PICK_CONTRACT", taskId: o.taskId, step: o.step }); continue; }
      s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
    }
    // Der Fingerabdruck deckt die vier Wege ab, auf denen ein Reward wirken kann.
    return JSON.stringify([Math.round(s.score || 0), s.wins || 0, s.losses || 0, s.coins || 0]);
  };

  /* Alle sechzehn. `unlocked` nur dort, wo das Stück ohne Freischaltung gar nicht angeboten würde —
     sonst misst der Test die Freischaltung statt den Reward.

     VIER haben eine eigene Messung, und zwar nicht aus Bequemlichkeit: der Fingerabdruck am
     Laufende sieht sie nicht. Die Test-Policy kauft nie und tauscht nie, also bleiben ein
     Preisnachlass und zusätzliche Aufstell-Energie darin unsichtbar — ein grüner Sweep wäre hier
     eine Lüge. Jedes der vier wird unten an der Zahl gemessen, die es wirklich bewegt. */
  const EIGENE_MESSUNG = new Set([
    "fuersprache",   // senkt die Schwelle des NÄCHSTEN Laufs (thresholdWith-Tests weiter oben)
    "doppelwahl",    // wirkt an der Beutewahl (eigener Lauf-Test weiter oben)
    "handelsbrief",  // wirkt auf PREISE, und die Policy kauft nichts → Preistest unten
    "fahnenrecht",   // wirkt auf die Aufstell-ENERGIE, und die Policy tauscht nicht → Energietest unten
  ]);

  for (const r of CP.REWARDS) {
    if (EIGENE_MESSUNG.has(r.id)) continue;
    it(`${r.id} ändert den Lauf`, () => {
      const unlocked = r.requires ? CP.UNLOCK_IDS : [];
      /* Das Feldzeichen hebt eine AUSGEWÜRFELTE Achse; ohne sie ist es folgenlos, und das ist
         richtig so. `takeReward` schreibt sie beim Nehmen, hier steht sie von Hand. */
      const over = r.rolls === "multAxis" ? { axes: { [r.id]: "crit" } } : {};
      const anders = SEEDS.filter((seed) => lauf({}, unlocked, seed, {}) !== lauf({ [r.id]: 3 }, unlocked, seed, over));
      expect(anders.length, `${r.id} auf ${SEEDS.length} Seeds ohne jede Wirkung — Tür vorhanden, Motor ruft sie nicht`)
        .toBeGreaterThan(0);
    });
  }

  it("prüft dabei wirklich alle sechzehn", () => {
    // Ein Reward, der still aus dem Katalog fällt, soll hier auffallen und nicht durchrutschen.
    expect(CP.REWARDS.length).toBe(16);
    for (const id of EIGENE_MESSUNG) expect(CP.REWARD_BY_ID[id], `${id} steht nicht mehr im Katalog`).toBeTruthy();
  });
});

/* Dieselbe Frage für die andere Hälfte der Kampagne: `runSetup` schreibt die Boss-Wirkung hin, und
   niemand garantiert, dass sie jemand liest.

   Der Fingerabdruck am Laufende, der bei den Rewards trägt, trägt hier NICHT — zweimal
   nachgewiesen, nicht vermutet:

   1. Die Test-Policy macht über einen ganzen Lauf 0 Tauschzüge, 0 Käufe und hält 0 Perks. Drei der
      sechs Bosse greifen genau dort an und wären damit unsichtbar.
   2. Schlimmer, und das hat erst die Gegenprobe gezeigt: beim Denkmalpfleger zieht `runSetup` seine
      sechs Zellen aus DEMSELBEN rng wie der Lauf. Der Fingerabdruck wird dadurch anders, auch wenn
      man die gesperrten Zellen hinterher wegwirft — er hätte „wirkt" gemeldet und nur gemessen,
      dass sechs Zufallszahlen verbraucht wurden.

   Jeder Boss hat deshalb eine eigene Messung an der Zahl, die er wirklich bewegt. Der Test unten
   hält fest, dass keiner dabei fehlt. */
describe("Boss-Effekte · jeder mit seiner eigenen Messung", () => {
  /* Wo die Messung steht. Der Katalogtest darunter verlangt für JEDEN Boss einen Eintrag — ein
     neuer Boss ohne Messung fällt damit auf, statt still mitzulaufen. */
  const MESSUNG = {
    denkmalpfleger: "Boss · Denkmalpfleger sperrt echte Bauzellen",
    schliesser: "Schließer sperrt im echten Tausch, nicht nur im Feld",
    bremser: "Fahnenrecht liegt in der echten Aufstellphase",   // prüft beide Richtungen an der Energie
    wucherer: "Wucherer auf den anderen Kaufflächen",           // die Preistreppe, Zahl für Zahl
    schmarotzer: "Schmarotzer zieht am Durchlauf-Ende echte Münzen ab",
    konter: "Boss · Der Konter legt auf die Gegnerkarte",
  };

  it("lässt keinen Boss ohne Messung", () => {
    const alle = [...CP.MID_BOSSES.map((b) => b.id), CP.END_BOSS.id];
    expect(alle.length).toBe(6);
    expect(alle.filter((id) => !MESSUNG[id]), "Boss ohne eigene Messung").toEqual([]);
    expect(Object.keys(MESSUNG).filter((id) => !CP.BOSS_BY_ID[id]), "Messung ohne Boss").toEqual([]);
  });

  /* Die Vorbedingung, auf die sich drei der Messungen berufen. Wenn die Policy irgendwann DOCH
     tauscht oder Perks nimmt, soll das hier auffallen und nicht in einer Begründung verstauben. */
  it("die Policy tauscht wirklich nicht und hält keine Perks", () => {
    const pol = randomPolicy({ architectGreedy: true });
    const rng = makeRng(3);
    let s = reducer(null, { type: "START_RUN", rng, seed: 3, architect: true, unlocked: CP.UNLOCK_IDS,
      campaign: { ...CP.emptyCampaign(), run: 1, bosses: ["__keiner__", "__keiner__", "__keiner__"] } });
    let guard = 0, swaps = 0;
    while (s.phase !== "gameover") {
      if (++guard > 200000) throw new Error("kein Fortschritt");
      const a = s.phase === "play" ? { type: "RESOLVE_TRICK", rng } : pol.act(s, rng);
      if (a && a.type === "SWAP_CARDS") swaps++;
      s = reducer(s, a);
    }
    expect(swaps, "die Policy tauscht jetzt — Aufstell-Effekte sind messbar geworden").toBe(0);
    expect((s.perks || []).length, "die Policy hält Perks — Unterhalt ist messbar geworden").toBe(0);
  });
});

describe("Boss · Denkmalpfleger sperrt echte Bauzellen", () => {
  /* Gemessen wird die Sperre selbst: sechs Zellen im Lauf, und der Reducer lehnt genau dort ein
     Gebäude ab. Nicht der Endscore — der verschiebt sich schon dadurch, dass die Ziehung der sechs
     Zellen aus demselben rng kommt. */
  const bisArchitekt = (bosses, seed = 3) => {
    const pol = randomPolicy({ architectGreedy: true });
    const rng = makeRng(seed);
    let s = reducer(null, { type: "START_RUN", rng, seed, architect: true, unlocked: [],
      campaign: { ...CP.emptyCampaign(), run: 1, bosses } });
    let guard = 0;
    while (s.phase !== "gameover" && !(s.phase === "architect" && (s.architect?.offers || []).some((o) => !o.used))) {
      if (++guard > 200000) throw new Error("kein Fortschritt");
      s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
    }
    return s;
  };

  it("legt sechs Zellen fest, und der Reducer baut nicht darauf", () => {
    const s = bisArchitekt(["denkmalpfleger", "x", "y"]);
    expect(s.phase, "die Architektenphase wurde erreicht").toBe("architect");
    const sperr = s.challengeBlockArch || [];
    expect(sperr.length, "sechs gesperrte Zellen").toBe(6);

    const off = (s.architect.offers || []).find((o) => !o.used);
    const fam = familyDef(off.familyId);
    const frei = enumeratePlacements(fam.form, s.architect.buildings)
      .filter((fp) => !fp.some((p) => sperr.includes(p)));
    const drauf = enumeratePlacements(fam.form, s.architect.buildings)
      .filter((fp) => fp.some((p) => sperr.includes(p)));
    expect(frei.length, "es gibt freie Plätze").toBeGreaterThan(0);
    expect(drauf.length, "und Plätze auf der Sperre").toBeGreaterThan(0);

    const bau = (fp) => reducer(s, { type: "ARCHITECT_BUILD", familyId: off.familyId, tier: off.tier, footprint: fp,
                                     colorChoice: fam.colorLocked ? "H" : undefined });
    expect(bau(drauf[0]), "auf der Sperre darf nichts entstehen").toBe(s);
    expect(bau(frei[0]), "daneben schon").not.toBe(s);
  });

  it("sperrt ohne den Boss gar nichts", () => {
    const s = bisArchitekt(["__keiner__", "x", "y"]);
    expect((s.challengeBlockArch || []).length).toBe(0);
  });
});

describe("Boss · Der Konter legt auf die Gegnerkarte", () => {
  /* Der Endboss hängt am vierten Durchlauf, nicht an `bosses` — abschalten lässt er sich nicht.
     Gemessen wird deshalb der Aufschlag selbst: dieselbe Gegnerkarte, derselbe Stand, einmal mit
     und einmal ohne Siegesserie. */
  const lauf4 = { ...CP.emptyCampaign(), run: CP.RUNS_PER_LEVEL, bosses: ["x", "y", "z"] };

  it("hebt die Gegnerkarte um die Siegesserie, und nur im vierten Lauf", () => {
    const s = { campaign: lauf4 };
    expect(CP.enemyValueWith(s, 7, 0), "ohne Serie liegt nichts oben drauf").toBe(7);
    expect(CP.enemyValueWith(s, 7, 3), "drei Siege, drei Punkte").toBe(10);
    expect(CP.counterBonus({ ...s, counterStack: 3 })).toBe(3);

    const mitte = { campaign: { ...lauf4, run: 1 } };
    expect(CP.enemyValueWith(mitte, 7, 3), "im ersten Lauf trägt kein Konter").toBe(7);
  });

  it("zählt die Serie im echten Lauf hoch und die Niederlage nullt sie", () => {
    const pol = randomPolicy({ architectGreedy: true });
    const rng = makeRng(3);
    let s = reducer(null, { type: "START_RUN", rng, seed: 3, architect: true, unlocked: [], campaign: lauf4 });
    let guard = 0, hoechste = 0, genullt = false, vorher = 0;
    while (s.phase !== "gameover") {
      if (++guard > 200000) throw new Error("kein Fortschritt");
      s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
      const st = s.counterStack || 0;
      if (vorher > 0 && st === 0) genullt = true;
      hoechste = Math.max(hoechste, st);
      vorher = st;
    }
    expect(hoechste, "die Serie ist im echten Lauf hochgelaufen").toBeGreaterThan(0);
    expect(genullt, "und eine Niederlage hat sie genullt").toBe(true);
  });
});

describe("Schließer sperrt im echten Tausch, nicht nur im Feld", () => {
  /* Der Fingerabdruck sieht ihn nicht (die Policy tauscht nicht), also wird hier der Tausch selbst
     durch den echten Reducer geschickt: einer IM festgesetzten Segment und einer daneben. */
  const bisAufstellung = (bosses, seed = 3) => {
    const pol = randomPolicy({ architectGreedy: true });
    const rng = makeRng(seed);
    let s = reducer(null, { type: "START_RUN", rng, seed, architect: true, unlocked: [],
      campaign: { ...CP.emptyCampaign(), run: 1, bosses } });
    let guard = 0;
    while (s.phase !== "gameover" && s.phase !== "formation") {
      if (++guard > 200000) throw new Error("kein Fortschritt");
      s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
    }
    return s;
  };

  it("lehnt den Tausch im festgesetzten Segment ab und lässt ihn daneben zu", () => {
    const s = bisAufstellung(["schliesser", "x", "y"]);
    expect(s.phase, "die Aufstellphase wurde erreicht").toBe("formation");
    expect(s.lockedSegment, "ein Segment ist festgesetzt").not.toBe(null);
    expect(s.formationEnergy, "Energie zum Tauschen ist da").toBeGreaterThan(0);

    const drin = s.lockedSegment * CP.SEGMENT_SIZE;                 // erste Karte des gesperrten Segments
    const frei = [...Array(s.playerOrder.length).keys()]
      .filter((i) => !CP.segmentLocked(s, i));
    expect(frei.length, "es gibt freie Positionen").toBeGreaterThan(1);

    // hin: gesperrt → der Reducer gibt denselben State zurück
    expect(reducer(s, { type: "SWAP_CARDS", i: drin, j: frei[0] })).toBe(s);
    // weg: auch gesperrt, egal an welchem Ende die Sperre sitzt
    expect(reducer(s, { type: "SWAP_CARDS", i: frei[0], j: drin })).toBe(s);
    // daneben: geht, sonst misst der Test nur eine kaputte Aufstellphase
    const frei2 = reducer(s, { type: "SWAP_CARDS", i: frei[0], j: frei[1] });
    expect(frei2, "ein Tausch außerhalb der Sperre muss durchgehen").not.toBe(s);
    expect(frei2.formationEnergy).toBe(s.formationEnergy - 1);
  });

  it("sperrt ohne den Boss gar nichts", () => {
    const s = bisAufstellung(["__keiner__", "x", "y"]);
    expect(s.lockedSegment ?? null, "kein Boss, kein Segment").toBe(null);
    expect(reducer(s, { type: "SWAP_CARDS", i: 0, j: 1 })).not.toBe(s);
  });
});

describe("Schmarotzer zieht am Durchlauf-Ende echte Münzen ab", () => {
  /* Die Policy hält keine Perks, also kann kein gespielter Lauf den Unterhalt zeigen. Gesetzt wird
     deshalb NUR die Vorbedingung (vier Perks in der Hand); abgezogen wird durch den echten Motor
     am echten Durchlauf-Ende, und gemessen werden die Münzen davor und danach. */
  const bisRunde = (bosses, seed = 3) => {
    const pol = randomPolicy({ architectGreedy: true });
    const rng = makeRng(seed);
    let s = reducer(null, { type: "START_RUN", rng, seed, architect: true, unlocked: CP.UNLOCK_IDS,
      campaign: { ...CP.emptyCampaign(), run: 1, bosses } });
    let guard = 0;
    while (s.phase !== "gameover" && !(s.phase === "play" && (s.cycle || 0) > 0)) {
      if (++guard > 200000) throw new Error("kein Fortschritt");
      const c = s.contracts || {};
      if ((c.offers || []).length) { const o = c.offers[0]; s = reducer(s, { type: "PICK_CONTRACT", taskId: o.taskId, step: o.step }); continue; }
      s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
    }
    return s;
  };

  /* Ein Durchlauf-Ende durchspielen und die Münzen am Übergang festhalten. */
  const muenzenUeberRunde = (bosses) => {
    const s0 = bisRunde(bosses);
    expect(s0.phase, "die Spielphase wurde erreicht").toBe("play");
    const rng = makeRng(99);
    // Echte Perk-ids — der Motor schlägt die Definitionen nach. Welche, ist gleich: beide Läufe
    // tragen dieselben vier, ihre Wirkung hebt sich im Vergleich auf.
    let s = { ...s0, perks: ["E10", "L2", "L6", "L4"], coins: 50 };
    let guard = 0;
    const startZyklus = s.cycle || 0;
    while (s.phase === "play" && (s.cycle || 0) === startZyklus) {
      if (++guard > 5000) throw new Error("kein Durchlauf-Ende");
      s = reducer(s, { type: "RESOLVE_TRICK", rng });
    }
    return { vor: 50, nach: s.coins || 0 };
  };

  it("nimmt je zwei Perks eine Münze, zugunsten des Spielers gerundet", () => {
    const ohne = muenzenUeberRunde(["__keiner__", "x", "y"]);
    const mit = muenzenUeberRunde(["schmarotzer", "x", "y"]);
    expect(ohne.nach - mit.nach, "vier Perks kosten zwei Münzen").toBe(2);
  });

  it("nimmt nie mehr, als auf dem Konto liegt", () => {
    // Die Grenze selbst, direkt an der Naht — ein Konto mit einer Münze verliert höchstens diese.
    const s = { campaign: { ...CP.emptyCampaign(), run: 1, bosses: ["schmarotzer", "x", "y"] }, coins: 1 };
    expect(CP.upkeepWith(s, 8)).toBe(1);
    expect(CP.upkeepWith({ ...s, coins: 0 }, 8)).toBe(0);
    expect(CP.upkeepWith({ ...s, coins: 50 }, 3), "drei Perks kosten eine, nicht zwei").toBe(1);
  });
});

describe("Handelsbrief gilt für JEDEN Preis, nicht nur den Neuwurf", () => {
  /* Der Fund vom 2026-09-23, und er war zweiteilig. Erstens kannte nur der Neuwurf den Nachlass —
     Energie, Baufeld, Fokus und Aufwerten rechneten ohne ihn, obwohl der Reward „alles, was du
     kaufst" verspricht. Zweitens erreichte er nicht einmal den Neuwurf: `rerollOfferWith` stieg
     ohne Auftrags-Segen vorher aus und rief die Tür nie, in der er sitzt.

     Gemessen wird an den PREIS-Funktionen, weil Knopf und Reducer beide durch sie gehen. */
  const mit = (over = {}) => ({ coins: 999, campaign: { ...CP.emptyCampaign(), held: { handelsbrief: 3 } }, ...over });
  const ohne = (over = {}) => ({ coins: 999, ...over });
  const pct = CP.rewardValue("handelsbrief", 3) / 100;
  const erwartet = (voll) => Math.max(1, Math.round(voll * (1 - pct)));

  it("senkt den Neuwurf, auch ohne einen einzigen Auftrags-Segen", () => {
    const voll = rerollOfferWith(ohne(), 0).price;
    expect(voll, "Vorbedingung: ein Kauf-Neuwurf liegt an").toBeGreaterThan(0);
    expect(rerollOfferWith(mit(), 0).price).toBe(erwartet(voll));
  });

  it("senkt Energie, Baufeld und Aufwerten", () => {
    expect(energyBuy(mit()).price).toBe(erwartet(energyBuy(ohne()).price));
    expect(coverBuy(mit()).price).toBe(erwartet(coverBuy(ohne()).price));
    expect(upgradeBuy(mit(), 0).price).toBe(erwartet(upgradeBuy(ohne(), 0).price));
  });

  it("senkt den Fokus-Ruf", () => {
    expect(focusPrice(mit())).toBe(erwartet(focusPrice(ohne())));
    expect(focusPrice(ohne()), "ohne den Reward bleibt der Grundpreis").toBe(FOCUS_PRICE);
  });

  it("senkt auch den vom Wucherer erhöhten Preis, nicht den Grundpreis", () => {
    // Reihenfolge: erst die Treppe (Wucherer), dann die Prozente — sonst wäre der Rabatt zu klein.
    const w = { priceLadder: 3, coinEnergy: 1 };
    const voll = energyBuy(ohne(w)).price;
    expect(voll).toBe(9);                                  // 3 → ×3
    expect(energyBuy(mit(w)).price).toBe(erwartet(voll));
  });

  it("lässt einen Lauf ohne den Reward unverändert", () => {
    for (const f of [() => rerollOfferWith(ohne(), 0).price, () => energyBuy(ohne()).price,
                     () => coverBuy(ohne()).price, () => upgradeBuy(ohne(), 0).price, () => focusPrice(ohne())]) {
      expect(f()).toBe(f());
    }
    expect(focusPrice({})).toBe(FOCUS_PRICE);
    expect(energyBuy({ coins: 0 }).price).toBe(energyBuy({ coins: 999 }).price);
  });
});

describe("Fahnenrecht liegt in der echten Aufstellphase", () => {
  /* Die Policy tauscht nicht, also bewegt zusätzliche Energie den Endscore nicht — gemessen wird
     deshalb die Energie, die in der Phase tatsächlich dasteht. */
  const bisAufstellung = (held, seed = 3) => {
    const pol = randomPolicy({ architectGreedy: true });
    const rng = makeRng(seed);
    let s = reducer(null, { type: "START_RUN", rng, seed, architect: true, unlocked: [],
      campaign: { ...CP.emptyCampaign(), bosses: ["bremser", "x", "y"], held } });
    let guard = 0;
    while (s.phase !== "gameover" && s.phase !== "formation") {
      if (++guard > 200000) throw new Error("kein Fortschritt");
      s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
    }
    return s;
  };

  it("gibt der Phase so viel Energie mehr, wie die Stufe sagt", () => {
    const a = bisAufstellung({});
    const b = bisAufstellung({ fahnenrecht: 3 });
    expect(a.phase, "die Aufstellphase wurde erreicht").toBe("formation");
    expect(b.formationEnergy - a.formationEnergy).toBe(CP.rewardValue("fahnenrecht", 3));
    // Und der Bremser zieht sie trotzdem ab: die beiden rechnen gegeneinander, nicht nacheinander.
    expect(a.formationEnergy).toBe(Math.max(0, C_FORMATION_ENERGY - 2));
  });
});
