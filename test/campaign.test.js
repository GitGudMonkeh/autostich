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
import { rerollPrice, energyPrice, coverPrice, energyBuy, coverBuy } from "../src/game/coins.js";

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
