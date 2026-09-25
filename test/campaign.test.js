import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as CP from "../src/game/campaign.js";
import { reducer } from "../src/game/reducer.js";
import { makeRng } from "../src/game/deck.js";
import { randomPolicy } from "../sim/policies/random.js";
import { archetypeOf } from "../src/game/skills.js";
import { familyDef, enumeratePlacements } from "../src/game/architect.js";
import { coinsForFormations, unspentEnergyCoins, forfeitSkill, forfeitPerk, forfeitBuild } from "../src/game/coins.js";

/* ============================================================================
   KAMPAGNE — die Leiter (docs/kampagne.md)

   Die Lehre aus zwei Playtest-Runden steht über allem, was hier geprüft wird: eine Bedingung wird
   an einer ZAHL im echten Lauf gemessen, nie daran, dass ein Feld gesetzt wurde. Dreimal stand ein
   Feld richtig im State und niemand las es — der Raritäts-Deckel erreichte die Skills nicht, die
   Münz-Oberfläche blieb sichtbar, und ab Lauf 2 rechnete die Kampagne gar nicht mehr ab.
   ============================================================================ */

/* Ein ganzer Lauf durch den echten Reducer. Der ENDSCORE wird gesetzt statt erspielt, wo es um die
   Abrechnung geht — er ist dort die Vorbedingung, nicht das Messergebnis. */
const spielen = (campaign, score, seed = 3) => {
  const s0 = reducer(null, { type: "START_RUN", rng: makeRng(seed), seed, architect: true,
                             campaign, unlocked: CP.unlocksOf(campaign) });
  return reducer({ ...s0, score }, { type: "END_RUN" }).campaign;
};

const bisEnde = (unlocked, seed = 3, campaign = null) => {
  const pol = randomPolicy({ architectGreedy: true });
  const rng = makeRng(seed);
  let s = reducer(null, { type: "START_RUN", rng, seed, architect: true, unlocked,
                          campaign: campaign || CP.emptyCampaign() });
  let guard = 0;
  const sammeln = [];
  while (s.phase !== "gameover") {
    if (++guard > 200000) throw new Error("kein Fortschritt");
    sammeln.push(s);
    s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
  }
  return { ende: s, verlauf: sammeln };
};

describe("Die Leiter", () => {
  it("hat fünf Stufen mit steigenden Schwellen", () => {
    expect(CP.STEPS).toBe(5);
    expect(CP.LADDER.map((l) => l.threshold)).toEqual([5e6, 10e6, 25e6, 50e6, 100e6]);
    for (let i = 1; i < CP.STEPS; i++) {
      expect(CP.LADDER[i].threshold, `Stufe ${i + 1} muss über Stufe ${i} liegen`)
        .toBeGreaterThan(CP.LADDER[i - 1].threshold);
    }
  });

  it("trägt je Stufe genau einen Boss und eine Freischaltung", () => {
    expect(CP.LADDER.map((l) => l.boss)).toEqual(["denkmalpfleger", "schliesser", "bremser", "schmarotzer", "konter"]);
    expect(CP.LADDER.map((l) => l.unlock)).toEqual(["plantDeck", "coins", "contracts", "rarityRare", "iceDeck"]);
    expect(new Set(CP.UNLOCK_IDS).size, "keine Freischaltung doppelt").toBe(CP.STEPS);
    expect(new Set(CP.LADDER.map((l) => l.boss)).size, "kein Boss doppelt").toBe(CP.STEPS);
  });

  it("stellt keinen Boss auf eine Stufe, deren Voraussetzung noch fehlt", () => {
    /* Der Schmarotzer zieht Münzen ab und tut ohne die Ökonomie GAR NICHTS. Die Leiter ist von Hand
       gesetzt, also prüft das hier nach: auf jeder Stufe muss die Voraussetzung ihres Bosses schon
       freigeschaltet sein. Ein verschobener Eintrag fällt damit auf, statt einen stummen Boss zu
       ergeben. */
    for (const rung of CP.LADDER) {
      const braucht = (CP.BOSS_BY_ID[rung.boss] || {}).requires;
      if (!braucht) continue;
      const offen = CP.unlocksFor(rung.step - 1);
      expect(offen, `${rung.boss} auf Stufe ${rung.step} braucht ${braucht}`).toContain(braucht);
    }
  });

  it("hält den Wucherer im Katalog, aber auf keiner Stufe", () => {
    // Owner 2026-09-25: gebaut, wartet auf Stufe 6. Ein Boss, der still aus dem Katalog fällt,
    // soll hier auffallen.
    expect(CP.UNUSED_BOSSES).toEqual(["wucherer"]);
    expect(CP.BOSS_BY_ID.wucherer.effect.priceLadder).toBe(3);
  });

  it("nennt nur die letzte Stufe Endboss", () => {
    expect(CP.isEndBoss("konter")).toBe(true);
    for (const rung of CP.LADDER.slice(0, -1)) expect(CP.isEndBoss(rung.boss), rung.boss).toBe(false);
  });
});

describe("Freischaltungen hängen an den GESCHAFFTEN Stufen", () => {
  it("gibt je bestandener Stufe genau eine", () => {
    expect(CP.unlocksFor(0)).toEqual([]);
    expect(CP.unlocksFor(1)).toEqual(["plantDeck"]);
    expect(CP.unlocksFor(3)).toEqual(["plantDeck", "coins", "contracts"]);
    expect(CP.unlocksFor(5)).toEqual(CP.UNLOCK_IDS);
    expect(CP.unlocksFor(99), "über das Ende hinaus wächst nichts nach").toEqual(CP.UNLOCK_IDS);
  });

  it("zählt geschaffte Stufen, nicht die aktuelle", () => {
    /* Über `step` abgeleitet fiele die LETZTE Freischaltung unter den Tisch: Stufe 5 rückt beim
       Bestehen nicht weiter, `step` sähe danach aus wie davor. */
    let c = CP.emptyCampaign();
    for (let n = 1; n <= CP.STEPS; n++) {
      expect(CP.unlocksOf(c), `vor Stufe ${n}`).toHaveLength(n - 1);
      c = CP.settleStep(c, { score: CP.thresholdFor(c) });
    }
    expect(c.done).toBe(true);
    expect(CP.unlocksOf(c), "die fünfte Freischaltung kommt mit der letzten Stufe").toEqual(CP.UNLOCK_IDS);
  });

  it("verliert nichts an einen verfehlten Lauf", () => {
    let c = CP.settleStep(CP.emptyCampaign(), { score: 6e6 });
    expect(CP.unlocksOf(c)).toEqual(["plantDeck"]);
    c = CP.settleStep(c, { score: 1 });
    expect(c.step, "die Stufe bleibt stehen").toBe(2);
    expect(CP.unlocksOf(c), "und die Freischaltung bleibt").toEqual(["plantDeck"]);
  });
});

describe("Eine Stufe abrechnen", () => {
  it("steigt bei gerissener Schwelle und schreibt den Score", () => {
    const c = CP.settleStep(CP.emptyCampaign(), { score: 7e6 });
    expect([c.cleared, c.step, c.done]).toEqual([true, 2, false]);
    expect(c.scores).toEqual([7e6]);
  });

  it("wiederholt bei verfehlter Schwelle und schreibt NICHTS", () => {
    const c = CP.settleStep(CP.emptyCampaign(), { score: 4_999_999 });
    expect([c.cleared, c.step, c.done]).toEqual([false, 1, false]);
    expect(c.scores, "ein Score neben einer offenen Stufe wäre gelogen").toEqual([]);
    expect(c.lastScore, "für den Verfehlt-Schirm steht er trotzdem da").toBe(4_999_999);
  });

  it("nimmt die Schwelle GENAU, nicht knapp darüber", () => {
    expect(CP.settleStep(CP.emptyCampaign(), { score: 5e6 }).cleared, "genau die Schwelle zählt").toBe(true);
  });

  it("schliesst auf der letzten Stufe ab, statt weiterzurücken", () => {
    let c = CP.emptyCampaign();
    for (let n = 1; n < CP.STEPS; n++) c = CP.settleStep(c, { score: CP.thresholdFor(c) });
    expect(c.step).toBe(CP.STEPS);
    c = CP.settleStep(c, { score: 200e6 });
    expect([c.step, c.done]).toEqual([CP.STEPS, true]);
    expect(c.scores).toHaveLength(CP.STEPS);
  });

  it("überschreibt den Score einer wiederholten Stufe, statt anzuhängen", () => {
    // Nach einem verfehlten und dann bestandenen Versuch darf `scores` nicht auseinanderlaufen:
    // der Index ist die Stufe, nicht die Zahl der Versuche.
    let c = CP.settleStep(CP.emptyCampaign(), { score: 6e6 });
    c = CP.settleStep(c, { score: 1 });
    c = CP.settleStep(c, { score: 12e6 });
    expect(c.scores).toEqual([6e6, 12e6]);
    expect(c.step).toBe(3);
  });
});

describe("Die Schwellen-Leiste füllt sich einmal", () => {
  it("misst gegen die Schwelle DIESER Stufe", () => {
    const c = { ...CP.emptyCampaign(), step: 3 };     // Schwelle 25 Mio
    expect(CP.thresholdProgress(c, 0)).toMatchObject({ pct: 0, target: 25e6, full: false });
    expect(CP.thresholdProgress(c, 12.5e6).pct).toBeCloseTo(50, 5);
    expect(CP.thresholdProgress(c, 25e6)).toMatchObject({ pct: 100, full: true });
  });

  it("bleibt über der Schwelle stehen und läuft nicht weiter", () => {
    const c = CP.emptyCampaign();
    expect(CP.thresholdProgress(c, 500e6)).toMatchObject({ pct: 100, full: true });
  });
});

/* ============================================================================
   DIE KETTE DURCH DIE ECHTE TÜR

   Der Fehler, den der Owner im Playtest fand, sass im ÜBERGANG zwischen zwei Läufen, nicht in
   einem Lauf: `campaign.settled` blieb nach dem ersten stehen. Gemessen wird deshalb die ganze
   Leiter über START_RUN und END_RUN, mit einem eigenen Score je Stufe.
   ============================================================================ */
describe("Die Leiter im echten Reducer", () => {
  it("gibt JEDER Stufe ihre eigene Abrechnung", () => {
    const scores = [6e6, 432.5e6, 26e6, 51e6, 210e6];
    let c = CP.emptyCampaign();
    for (let n = 1; n <= CP.STEPS; n++) {
      c = spielen(c, scores[n - 1]);
      expect(c.cleared, `Stufe ${n} war über ihrer Schwelle`).toBe(true);
      expect(c.scores[n - 1], `Stufe ${n} wertet ihren eigenen Score`).toBe(scores[n - 1]);
    }
    expect(c.done).toBe(true);
    expect(c.scores).toEqual(scores);
  });

  it("wiederholt eine verfehlte Stufe in JEDER Position", () => {
    for (let miss = 1; miss <= CP.STEPS; miss++) {
      let c = CP.emptyCampaign();
      for (let n = 1; n < miss; n++) c = spielen(c, CP.thresholdFor(c));
      const vorher = c.step;
      c = spielen(c, 1);
      expect(c.cleared, `Stufe ${miss} verfehlt`).toBe(false);
      expect(c.step, `Stufe ${miss} bleibt stehen`).toBe(vorher);
      expect(c.done).toBeFalsy();
    }
  });

  it("löst den Abrechnungs-Riegel an der einen Tür, durch die jeder Lauf geht", () => {
    /* `settled` verhindert, dass EIN Gameover zweimal zählt — richtig. Falsch war in der
       Kettenfassung, dass ihn niemand löste. START_RUN ist die Stelle. */
    const alt = { ...CP.emptyCampaign(), settled: true };
    const s = reducer(null, { type: "START_RUN", rng: makeRng(3), seed: 3, architect: true, campaign: alt, unlocked: [] });
    expect(s.campaign.settled, "der Lauf startet ungewertet").toBeFalsy();
    expect(reducer({ ...s, score: 9e6 }, { type: "END_RUN" }).campaign.scores).toEqual([9e6]);
  });

  it("wertet dasselbe Laufende trotzdem nur EINMAL", () => {
    const s0 = reducer(null, { type: "START_RUN", rng: makeRng(3), seed: 3, architect: true, campaign: CP.emptyCampaign(), unlocked: [] });
    const eins = reducer({ ...s0, score: 9e6 }, { type: "END_RUN" });
    expect(eins.campaign.scores).toEqual([9e6]);
    expect(reducer(eins, { type: "END_RUN" }).campaign.scores, "kein zweiter Eintrag").toEqual([9e6]);
  });
});

/* ============================================================================
   DIE BEDINGUNGEN MÜSSEN IM LAUF ANKOMMEN

   `runSetup` schreibt sie in den State, und das beweist nichts: zweimal stand das Feld richtig da
   und das nachgelagerte System las es nicht. Gemessen wird, was über einen ganzen Lauf herauskommt.
   ============================================================================ */
describe("Stufen-Bedingungen im echten Lauf", () => {
  /* Alle Stufen, die in einem ganzen Lauf tatsächlich angeboten werden — Türen wie geöffnete
     Angebote, samt der Legendären, die gar keine Stufe tragen. */
  const angeboteneStufen = (unlocked, seed = 3) => {
    const { verlauf } = bisEnde(unlocked, seed);
    const stufen = new Set(), legendaer = [];
    for (const st of verlauf) {
      for (const d of st.skillDoors || []) for (const id of d.skills || []) {
        if (id.includes("_L0")) legendaer.push(id); else stufen.add((d.tiers || {})[id] ?? 0);
      }
      for (const id of st.skillOffer || []) {
        if (id.includes("_L0")) legendaer.push(id); else stufen.add((st.skillOfferTiers || {})[id] ?? 0);
      }
    }
    return { stufen: [...stufen].sort(), legendaer };
  };

  it("deckelt die Stufe der SKILL-Angebote, nicht nur das Feld im State", () => {
    const { ende } = bisEnde([]);
    expect(ende.rareCap, "Vorbedingung: der Deckel steht im State").toBe(CP.START_MAX_TIER);
    const { stufen, legendaer } = angeboteneStufen([]);
    expect(stufen.length, "der Lauf hat überhaupt Skills angeboten").toBeGreaterThan(0);
    // Stufen sind 0-basiert (rollSkillOfferTiers), der Deckel 1-basiert.
    expect(Math.max(...stufen), `angeboten: ${stufen}`).toBeLessThanOrEqual(CP.START_MAX_TIER - 1);
    expect(legendaer, "unter Stufe IV gibt es keine Legendären").toEqual([]);
  });

  it("hebt den Deckel mit der vierten Stufe auf Sehr selten", () => {
    const { ende } = bisEnde(CP.unlocksFor(4));
    expect(ende.rareCap).toBe(CP.RARE_MAX_TIER);
    const { stufen, legendaer } = angeboteneStufen(CP.unlocksFor(4));
    expect(Math.max(...stufen)).toBeLessThanOrEqual(CP.RARE_MAX_TIER - 1);
    expect(legendaer, "auch mit allen Freischaltungen bleibt die Leiter unter Legendär").toEqual([]);
  });

  it("bietet ohne Deckel wieder alles an — sonst misst der Test nur den Deckel", () => {
    const pol = randomPolicy({ architectGreedy: true });
    const rng = makeRng(3);
    let s = reducer(null, { type: "START_RUN", rng, seed: 3, architect: true });
    expect(s.rareCap).toBe(4);
    let guard = 0, hoechste = 0;
    while (s.phase !== "gameover") {
      if (++guard > 200000) throw new Error("kein Fortschritt");
      for (const d of s.skillDoors || []) for (const id of d.skills || []) if (!id.includes("_L0")) hoechste = Math.max(hoechste, (d.tiers || {})[id] ?? 0);
      s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
    }
    expect(hoechste, "ohne Deckel kommen hohe Stufen vor").toBeGreaterThan(CP.START_MAX_TIER - 1);
  });

  it("bietet keinen Skill einer Fraktion an, die noch nicht freigeschaltet ist", () => {
    const { verlauf } = bisEnde([]);
    const fraktionen = new Set();
    for (const s of verlauf) {
      for (const d of s.skillDoors || []) for (const id of d.skills || []) fraktionen.add(archetypeOf(id));
      for (const id of s.skillOffer || []) fraktionen.add(archetypeOf(id));
    }
    expect(fraktionen.size, "der Lauf hat überhaupt Skills angeboten").toBeGreaterThan(0);
    expect([...fraktionen].sort()).toEqual([...CP.START_DECKS].sort());
  });

  it("legt ohne die Auftrags-Stufe über den ganzen Lauf kein Angebot aus", () => {
    const { verlauf } = bisEnde([]);
    const gesehen = verlauf.filter((s) => (s.contracts?.offers || []).length || s.contracts?.active).length;
    expect(gesehen, "Aufträge liefen, obwohl sie nicht freigeschaltet sind").toBe(0);
  });
});

/* ============================================================================
   DIE REDUZIERTE ÖKONOMIE (Owner 2026-09-25)

   Eine Münze je Durchlauf, die Aufstellung zahlt nicht mit, und der Verzicht skaliert mit. Ohne
   das wäre ein abgelehntes Skill-Angebot zwölf Durchläufe wert und die Reduktion verpuffte genau
   dort, wo der Spieler sie am leichtesten umgeht.
   ============================================================================ */
describe("Die reduzierte Münz-Ökonomie", () => {
  it("zahlt je Durchlauf genau eine Münze, egal wie voll das Brett ist", () => {
    const c = { campaign: CP.emptyCampaign(), coinsEnabled: true };
    for (const forms of [0, 18, 32, 80]) {
      expect(CP.cycleCoinsWith(c, coinsForFormations(forms)), `${forms} Formationen`).toBe(1);
    }
    // Gegenprobe: ohne Kampagne trägt die Aufstellung wie immer bei.
    expect(CP.cycleCoinsWith({}, coinsForFormations(32))).toBe(coinsForFormations(32));
    expect(coinsForFormations(32), "und das ist mehr als eine").toBeGreaterThan(1);
  });

  it("zahlt ohne die Münz-Stufe gar nichts", () => {
    expect(CP.cycleCoinsWith({ campaign: CP.emptyCampaign(), coinsEnabled: false }, 3)).toBe(0);
  });

  it("misst die Einnahme im echten Lauf, nicht an der Funktion", () => {
    /* Der Grund für die Tür, an der Zahl: über einen ganzen Lauf darf keine Durchlauf-Einnahme
       über eins liegen. Ein freier Lauf liegt gemessen bei drei. */
    const { verlauf } = bisEnde(CP.unlocksFor(2), 3);
    const einnahmen = new Set();
    for (const s of verlauf) if (typeof s.lastCycleCoins === "number") einnahmen.add(s.lastCycleCoins);
    expect(einnahmen.size, "der Lauf hat überhaupt ausgezahlt").toBeGreaterThan(0);
    expect(Math.max(...einnahmen), `gezahlt wurde: ${[...einnahmen].sort()}`).toBe(1);
  });

  it("skaliert den Verzicht mit", () => {
    const k = { campaign: CP.emptyCampaign(), coinsEnabled: true };
    expect(forfeitSkill(k)).toBe(CP.CAMPAIGN_FORFEIT.skill);
    expect(forfeitPerk(k)).toBe(CP.CAMPAIGN_FORFEIT.perk);
    expect(forfeitBuild(k)).toBe(CP.CAMPAIGN_FORFEIT.build);
    expect(unspentEnergyCoins(4, 0, k), "übrige Energie zahlt in der Kampagne nichts").toBe(0);
    // Gegenprobe: ohne Kampagne die vollen Sätze, sonst misst der Test nur sich selbst.
    expect(forfeitSkill({})).toBeGreaterThan(CP.CAMPAIGN_FORFEIT.skill);
    expect(unspentEnergyCoins(4, 0, {})).toBeGreaterThan(0);
  });

  it("hält den Verzicht unter dem, was ein Skill-Angebot an Durchläufen wert wäre", () => {
    /* Die Begründung des Owners als Zahl: bei einer Münze je Durchlauf darf ein Ablehnen nicht ein
       Dutzend Durchläufe wert sein. Drei ist die Entscheidung, die Grenze ist „deutlich unter dem
       vollen Satz". */
    expect(CP.CAMPAIGN_FORFEIT.skill).toBeLessThan(forfeitSkill({}) / 2);
    expect(CP.CAMPAIGN_FORFEIT.energy).toBe(0);
  });
});

/* ============================================================================
   BOSS-EFFEKTE

   Der Fingerabdruck am Laufende trägt hier nicht, und das ist nachgewiesen: die Test-Policy macht
   über einen ganzen Lauf 0 Tauschzüge, 0 Käufe und hält 0 Perks — und beim Denkmalpfleger zieht
   `runSetup` seine Zellen aus DEMSELBEN rng wie der Lauf, der Endscore wird also anders, auch wenn
   man die Sperre hinterher wegwirft. Jeder Boss hat deshalb eine eigene Messung.
   ============================================================================ */
describe("Boss-Effekte · jeder mit seiner eigenen Messung", () => {
  const MESSUNG = {
    denkmalpfleger: "Boss · Denkmalpfleger sperrt echte Bauzellen",
    schliesser: "Boss · Schließer sperrt im echten Tausch",
    bremser: "Boss · Bremser nimmt der Aufstellphase Energie",
    schmarotzer: "Boss · Schmarotzer zieht am Durchlauf-Ende echte Münzen ab",
    konter: "Boss · Der Konter legt auf die Gegnerkarte",
    wucherer: "Wucherer auf den anderen Kaufflächen",   // in test/coins.test.js, Zahl für Zahl
  };

  it("lässt keinen Boss ohne Messung", () => {
    const alle = CP.BOSSES.map((b) => b.id);
    expect(alle.filter((id) => !MESSUNG[id]), "Boss ohne eigene Messung").toEqual([]);
    expect(Object.keys(MESSUNG).filter((id) => !CP.BOSS_BY_ID[id]), "Messung ohne Boss").toEqual([]);
  });

  it("die Policy tauscht wirklich nicht und hält keine Perks", () => {
    // Die Vorbedingung, auf die sich drei der Messungen berufen.
    const pol = randomPolicy({ architectGreedy: true });
    const rng = makeRng(3);
    let s = reducer(null, { type: "START_RUN", rng, seed: 3, architect: true, unlocked: CP.UNLOCK_IDS,
                            campaign: CP.emptyCampaign() });
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

/* Ein Lauf bis zu einer bestimmten Phase, für die gezielten Boss-Messungen. */
const bisPhase = (step, phase, pruefen = () => true, seed = 3) => {
  const pol = randomPolicy({ architectGreedy: true });
  const rng = makeRng(seed);
  const camp = { ...CP.emptyCampaign(), step };
  let s = reducer(null, { type: "START_RUN", rng, seed, architect: true, campaign: camp,
                          unlocked: CP.unlocksFor(step - 1) });
  let guard = 0;
  while (s.phase !== "gameover" && !(s.phase === phase && pruefen(s))) {
    if (++guard > 200000) throw new Error("kein Fortschritt");
    s = s.phase === "play" ? reducer(s, { type: "RESOLVE_TRICK", rng }) : reducer(s, pol.act(s, rng));
  }
  return s;
};
const stufeVon = (boss) => CP.LADDER.find((l) => l.boss === boss).step;

describe("Boss · Denkmalpfleger sperrt echte Bauzellen", () => {
  it("legt sechs Zellen fest, und der Reducer baut nicht darauf", () => {
    const s = bisPhase(stufeVon("denkmalpfleger"), "architect", (x) => (x.architect?.offers || []).some((o) => !o.used));
    expect(s.phase, "die Architektenphase wurde erreicht").toBe("architect");
    const sperr = s.challengeBlockArch || [];
    expect(sperr.length, "sechs gesperrte Zellen").toBe(6);

    const off = (s.architect.offers || []).find((o) => !o.used);
    const fam = familyDef(off.familyId);
    const alle = enumeratePlacements(fam.form, s.architect.buildings);
    const frei = alle.filter((fp) => !fp.some((p) => sperr.includes(p)));
    const drauf = alle.filter((fp) => fp.some((p) => sperr.includes(p)));
    expect(frei.length, "es gibt freie Plätze").toBeGreaterThan(0);
    expect(drauf.length, "und Plätze auf der Sperre").toBeGreaterThan(0);

    const bau = (fp) => reducer(s, { type: "ARCHITECT_BUILD", familyId: off.familyId, tier: off.tier, footprint: fp,
                                     colorChoice: fam.colorLocked ? "H" : undefined });
    expect(bau(drauf[0]), "auf der Sperre darf nichts entstehen").toBe(s);
    expect(bau(frei[0]), "daneben schon").not.toBe(s);
  });

  it("sperrt auf einer anderen Stufe gar nichts", () => {
    const s = bisPhase(stufeVon("bremser"), "architect", (x) => (x.architect?.offers || []).some((o) => !o.used));
    expect((s.challengeBlockArch || []).length).toBe(0);
  });
});

describe("Boss · Schließer sperrt im echten Tausch", () => {
  it("lehnt den Tausch im festgesetzten Segment ab und lässt ihn daneben zu", () => {
    const s = bisPhase(stufeVon("schliesser"), "formation");
    expect(s.phase, "die Aufstellphase wurde erreicht").toBe("formation");
    expect(s.lockedSegment, "ein Segment ist festgesetzt").not.toBe(null);
    expect(s.formationEnergy, "Energie zum Tauschen ist da").toBeGreaterThan(0);

    const drin = s.lockedSegment * CP.SEGMENT_SIZE;
    const frei = [...Array(s.playerOrder.length).keys()].filter((i) => !CP.segmentLocked(s, i));
    expect(frei.length, "es gibt freie Positionen").toBeGreaterThan(1);

    expect(reducer(s, { type: "SWAP_CARDS", i: drin, j: frei[0] }), "hin gesperrt").toBe(s);
    expect(reducer(s, { type: "SWAP_CARDS", i: frei[0], j: drin }), "weg gesperrt").toBe(s);
    const raus = reducer(s, { type: "SWAP_CARDS", i: frei[0], j: frei[1] });
    expect(raus, "daneben geht es").not.toBe(s);
    expect(raus.formationEnergy).toBe(s.formationEnergy - 1);
  });

  it("sperrt auf einer anderen Stufe gar nichts", () => {
    const s = bisPhase(stufeVon("denkmalpfleger"), "formation");
    expect(s.lockedSegment ?? null).toBe(null);
    expect(reducer(s, { type: "SWAP_CARDS", i: 0, j: 1 })).not.toBe(s);
  });
});

describe("Boss · Bremser nimmt der Aufstellphase Energie", () => {
  it("gibt zwei Tauschzüge weniger als eine Stufe ohne ihn", () => {
    const mit = bisPhase(stufeVon("bremser"), "formation");
    const ohne = bisPhase(stufeVon("denkmalpfleger"), "formation");
    expect(mit.phase).toBe("formation");
    expect(ohne.formationEnergy - mit.formationEnergy).toBe(CP.BOSS_BY_ID.bremser.effect.energyMinus);
  });
});

describe("Boss · Schmarotzer zieht am Durchlauf-Ende echte Münzen ab", () => {
  /* Die Policy hält keine Perks, also kann kein gespielter Lauf den Unterhalt zeigen. Gesetzt wird
     deshalb NUR die Vorbedingung (vier Perks in der Hand); abgezogen wird durch den echten Motor am
     echten Durchlauf-Ende, und gemessen werden die Münzen davor und danach. */
  const ueberRunde = (step) => {
    const s0 = bisPhase(step, "play", (x) => (x.cycle || 0) > 0);
    expect(s0.phase, "die Spielphase wurde erreicht").toBe("play");
    const rng = makeRng(99);
    // Echte Perk-ids: der Motor schlägt die Definitionen nach. Welche, ist gleich — beide Läufe
    // tragen dieselben vier, ihre Wirkung hebt sich im Vergleich auf.
    let s = { ...s0, perks: ["E10", "L2", "L6", "L4"], coins: 50 };
    const start = s.cycle || 0;
    let guard = 0;
    while (s.phase === "play" && (s.cycle || 0) === start) {
      if (++guard > 5000) throw new Error("kein Durchlauf-Ende");
      s = reducer(s, { type: "RESOLVE_TRICK", rng });
    }
    return s.coins || 0;
  };

  it("nimmt je zwei Perks eine Münze, zugunsten des Spielers gerundet", () => {
    expect(ueberRunde(stufeVon("bremser")) - ueberRunde(stufeVon("schmarotzer"))).toBe(2);
  });

  it("nimmt nie mehr, als auf dem Konto liegt", () => {
    const s = { campaign: { ...CP.emptyCampaign(), step: stufeVon("schmarotzer") }, coins: 1 };
    expect(CP.upkeepWith(s, 8)).toBe(1);
    expect(CP.upkeepWith({ ...s, coins: 0 }, 8)).toBe(0);
    expect(CP.upkeepWith({ ...s, coins: 50 }, 3), "drei Perks kosten eine, nicht zwei").toBe(1);
  });
});

describe("Boss · Der Konter legt auf die Gegnerkarte", () => {
  const letzte = { ...CP.emptyCampaign(), step: CP.STEPS };

  it("hebt die Gegnerkarte um die Siegesserie, und nur auf seiner Stufe", () => {
    const s = { campaign: letzte };
    expect(CP.enemyValueWith(s, 7, 0), "ohne Serie liegt nichts oben drauf").toBe(7);
    expect(CP.enemyValueWith(s, 7, 3), "drei Siege, drei Punkte").toBe(10);
    expect(CP.counterBonus({ ...s, counterStack: 3 })).toBe(3);
    expect(CP.enemyValueWith({ campaign: { ...letzte, step: 1 } }, 7, 3), "auf Stufe 1 trägt kein Konter").toBe(7);
  });

  it("zählt die Serie im echten Lauf hoch und die Niederlage nullt sie", () => {
    const { verlauf } = bisEnde(CP.unlocksFor(CP.STEPS - 1), 3, letzte);
    let hoechste = 0, genullt = false, vorher = 0;
    for (const s of verlauf) {
      const st = s.counterStack || 0;
      if (vorher > 0 && st === 0) genullt = true;
      hoechste = Math.max(hoechste, st);
      vorher = st;
    }
    expect(hoechste, "die Serie ist hochgelaufen").toBeGreaterThan(0);
    expect(genullt, "und eine Niederlage hat sie genullt").toBe(true);
  });
});

/* Derselbe Riegel wie beim Wurf: ein Deckel, der eine Aufrufstelle nicht erreicht, fällt still aus. */
describe("Rarität-Deckel · jede Skill-Aufrufstelle reicht ihn durch", () => {
  const stellen = [];
  for (const f of ["src/game/reducer.js", "src/game/engine.js"]) {
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
