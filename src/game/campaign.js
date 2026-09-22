/* ============================================================
   KAMPAGNE — Ebene 1 (Spec: docs/kampagne.md)

   A campaign is a chain of four whole runs. Each run has a score threshold; clearing it advances
   the chain, missing it ends the campaign and the next attempt starts over. Between runs the
   player picks one reward, and rewards last until the end boss or until a run is lost.

   Three lifetimes meet here and must not be confused:
   - unlocks      permanent, survive a lost campaign   → profile (storage.js)
   - campaign     one chain of four runs               → its own slot, ends with the campaign
   - rewards      held for the campaign                → inside the campaign state

   This module is pure: no React, no storage, no randomness except through an injected rng.
   The reducer owns the state; everything here takes it and hands a value back.
   ============================================================ */

import { TIER_META } from "./rarity.js";


// ---- Level 1 -----------------------------------------------------------------------------

export const RUNS_PER_LEVEL = 4;

/* Wie viele Ebenen es GIBT, nicht wie viele geplant sind. Ebene 2 und 3 stehen in
   docs/kampagne.md §1, gebaut ist Ebene 1 — und der Siegschirm darf nichts ankuendigen, was der
   Spieler danach nicht vorfindet. Eine Zahl hier statt einer Bedingung im Panel: wenn Ebene 2
   kommt, ist das eine 2. */
export const LEVELS = 1;
export const hasLevel = (level) => level >= 1 && level <= LEVELS;

/* Owner 2026-09-22, explicitly START values: they are pulled in playtest, not derived from the
   measurement. docs/kampagne.md §6 measures a FULL game (architect, all four factions, coins,
   every rarity) — level 1 plays a stripped-down version and will score well below that. */
export const THRESHOLDS_L1 = [5_000_000, 10_000_000, 15_000_000, 25_000_000];

/* Level 1 caps skills, perks AND rewards at "Sehr selten" (tier 3). Epic and legendary are
   level-2 content, so the reward catalogue below only carries three columns. */
export const MAX_TIER_L1 = 3;

// ---- Unlocks -----------------------------------------------------------------------------

/* Permanent, in this fixed order, one per won run. They are the meta progression: a lost
   campaign keeps them, so every attempt starts stronger than the last. */
export const UNLOCKS = [
  { id: "plantDeck", grants: { deck: "plant" } },
  { id: "coins", grants: { coins: true } },
  { id: "contracts", grants: { contracts: true } },
  { id: "rarityRare", grants: { maxTier: 3 } },
  { id: "iceDeck", grants: { deck: "ice" } },
];

export const UNLOCK_IDS = UNLOCKS.map((u) => u.id);

/* One unlock per won run, counted across attempts. `wins` is the profile's lifetime count of
   won campaign runs, so a failed attempt still moved the ladder. */
export const unlocksFor = (wins = 0) => UNLOCK_IDS.slice(0, Math.max(0, Math.min(UNLOCKS.length, wins)));
export const nextUnlock = (wins = 0) => UNLOCK_IDS[Math.max(0, wins)] || null;
export const hasUnlock = (unlocked, id) => (unlocked || []).includes(id);

/* Level 1 starts with Blitz and Feuer; the other two arrive as unlocks. */
export const START_DECKS = ["lightning", "fire"];
export function decksFor(unlocked = []) {
  const decks = [...START_DECKS];
  for (const u of UNLOCKS) {
    if (u.grants.deck && hasUnlock(unlocked, u.id)) decks.push(u.grants.deck);
  }
  return decks;
}

/* Before the rarity unlock the offers stop at "Selten" (tier 2). Skills, perks and rewards all
   read this one ceiling — the owner tied them together deliberately. */
export const START_MAX_TIER = 2;
export const maxTierFor = (unlocked = []) => (hasUnlock(unlocked, "rarityRare") ? MAX_TIER_L1 : START_MAX_TIER);

export const coinsEnabled = (unlocked = []) => hasUnlock(unlocked, "coins");
export const contractsEnabled = (unlocked = []) => hasUnlock(unlocked, "contracts");

// ---- Bosses ------------------------------------------------------------------------------

/* Runs 1–3 draw one mid boss each, never the same twice in one campaign. Run 4 carries the end
   boss INSTEAD of a mid boss, not alongside it.

   Two of the five need coins to bite, so before that unlock exactly three are live — which is
   exactly how many a campaign draws. The pool grows to five afterwards. */
export const MID_BOSSES = [
  { id: "denkmalpfleger", effect: { blockCells: 6 } },
  { id: "schliesser", effect: { lockSegment: 1 } },
  { id: "bremser", effect: { energyMinus: 2 } },
  { id: "wucherer", effect: { priceLadder: 3 }, requires: "coins" },
  { id: "schmarotzer", effect: { perkUpkeep: 2 }, requires: "coins" },
];

export const END_BOSS = { id: "konter", effect: { counterPerWin: 1 } };

export const BOSS_BY_ID = Object.fromEntries([...MID_BOSSES, END_BOSS].map((b) => [b.id, b]));

export const availableBosses = (unlocked = []) =>
  MID_BOSSES.filter((b) => !b.requires || hasUnlock(unlocked, b.requires));

/* Draws the mid bosses for one campaign, in run order, without repeats. Returns fewer than
   RUNS_PER_LEVEL - 1 only if the pool is smaller than that, which the unlock order prevents. */
export function drawBosses(rng = Math.random, unlocked = [], count = RUNS_PER_LEVEL - 1) {
  const pool = availableBosses(unlocked).map((b) => b.id);
  const out = [];
  while (out.length < count && pool.length) {
    const i = Math.floor(rng() * pool.length) % pool.length;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/* The boss of run n (1-indexed). Run 4 is the end boss and has no mid boss. */
export function bossFor(campaign, run = 1) {
  if (run >= RUNS_PER_LEVEL) return END_BOSS.id;
  return ((campaign || {}).bosses || [])[run - 1] || null;
}

// ---- Rarity: two inputs, one ladder ------------------------------------------------------

export const MAX_CONTRACTS_PER_RUN = 2;  // two windows (D1–16, D17–32), one task each

/* Every success is one step: each fulfilled contract +1, twice the threshold +1, three times +2
   (instead of, not on top of). */
export function stepsFor({ contracts = 0, score = 0, threshold = 0 } = {}) {
  const fromTasks = Math.max(0, Math.min(MAX_CONTRACTS_PER_RUN, contracts));
  let fromScore = 0;
  if (threshold > 0) {
    if (score >= threshold * 3) fromScore = 2;
    else if (score >= threshold * 2) fromScore = 1;
  }
  return fromTasks + fromScore;
}

/* The ladder has five rungs; level 1 has only three ranks. It is SQUEEZED rather than cut off at
   the top (owner 2026-09-22) — cutting it off would put the reward at its ceiling on two
   fulfilled contracts alone, and the score input would stop counting entirely. */
export const RARITY_LADDER = [1, 2, 3, 4, 5];       // level 2+: Normal · Selten · Sehr selten · Episch · Legendär
export const RARITY_LADDER_L1 = [1, 1, 2, 3, 3];    // level 1:  Normal · Normal · Selten · Sehr selten · Sehr selten

export function rarityFor(steps = 0, level = 1) {
  const ladder = level <= 1 ? RARITY_LADDER_L1 : RARITY_LADDER;
  return ladder[Math.max(0, Math.min(ladder.length - 1, steps))];
}

export const rarityLabel = (tier) => (TIER_META[tier] || {}).label || "";

// ---- The reward catalogue ----------------------------------------------------------------

/* Sixteen rewards on six axes. `values` holds one entry per rarity tier, index 0 = Normal.
   Level 1 stops at tier 3, so three entries each; epic and legendary are level-2 content.

   `requires` gates a reward on an unlock — a reward that cannot work yet is never offered
   (owner 2026-09-22: "aus dem Angebot nehmen"), the same rule the coin-dependent perks follow.

   ONLY the score axis is anchored to a measurement (docs/kampagne.md §8: +400 base points are
   worth x1.23 on the end score, and the end score is exactly linear in them). Everything else is
   judgement against the base values and the budget in §7. The playtest pulls them. */
export const REWARDS = [
  // 1 · Score-Formel
  { id: "sold", axis: "score", values: [100, 200, 350] },
  { id: "feldzeichen", axis: "score", rolls: "multAxis", values: [10, 20, 35] },
  { id: "steigbrief", axis: "score", values: [3, 5, 8] },
  // 2 · Kampfkraft
  { id: "waffenrecht", axis: "power", values: [1, 2, 3] },
  { id: "wetzstein", axis: "power", values: [1, 2, 3] },
  { id: "zehnt", axis: "power", values: [1, 2, 3] },
  // 3 · Ökonomie
  { id: "pfruende", axis: "economy", requires: "coins", values: [1, 2, 3] },
  { id: "handelsbrief", axis: "economy", requires: "coins", values: [10, 20, 30] },
  { id: "mitgift", axis: "economy", requires: "coins", values: [15, 30, 50] },
  // 5 · Struktur
  { id: "lehen", axis: "structure", values: [2, 4, 6] },
  { id: "fahnenrecht", axis: "structure", values: [1, 2, 3] },
  // 7 · Regel-Ausnahmen
  { id: "standhaftigkeit", axis: "rules", values: [1, 2, 3] },
  { id: "losentscheid", axis: "rules", values: [1, 2, 3] },
  { id: "lueckenschluss", axis: "rules", values: [1, 1, 2], scopes: ["one", "all", "all"] },
  // 8 · Kampagnen-Ebene
  { id: "fuersprache", axis: "campaign", values: [10, 20, 30] },
  { id: "doppelwahl", axis: "campaign", requires: "contracts", values: [1, 1, 1], scopes: ["next", "run", "always"] },
];

export const REWARD_BY_ID = Object.fromEntries(REWARDS.map((r) => [r.id, r]));

/* The multiplier axes Feldzeichen draws from. The axis is ROLLED and shown in the offer, not
   chosen by the player (owner 2026-09-22) — which makes the reward a bet. */
export const MULT_AXES = ["streak", "perk", "form", "core", "afterglow", "architect", "crit", "fire", "plant"];

export const rewardValue = (id, tier) => {
  const r = REWARD_BY_ID[id];
  return r ? r.values[Math.max(0, Math.min(r.values.length - 1, tier - 1))] : null;
};

export const rewardScope = (id, tier) => {
  const r = REWARD_BY_ID[id];
  return r && r.scopes ? r.scopes[Math.max(0, Math.min(r.scopes.length - 1, tier - 1))] : null;
};

export const rewardAvailable = (id, unlocked = []) => {
  const r = REWARD_BY_ID[id];
  return !!r && (!r.requires || hasUnlock(unlocked, r.requires));
};

// ---- The offer ---------------------------------------------------------------------------

export const OFFERS_PER_PICK = 3;

/* A reward is pickable only once, whatever its rarity. Held ones come back only as an UPGRADE to
   a higher tier, and that REPLACES the lower one instead of stacking (owner 2026-09-22) — so an
   upgrade is worth the difference, which the owner checked and wants. */
export function canOffer(held, id, tier, unlocked = []) {
  if (!rewardAvailable(id, unlocked)) return false;
  const have = (held || {})[id];
  return have == null ? true : tier > have;
}

export function rollOffers(rng = Math.random, { held = {}, tier = 1, unlocked = [], count = OFFERS_PER_PICK } = {}) {
  const pool = REWARDS.filter((r) => canOffer(held, r.id, tier, unlocked)).map((r) => r.id);
  const out = [];
  while (out.length < count && pool.length) {
    const i = Math.floor(rng() * pool.length) % pool.length;
    const id = pool.splice(i, 1)[0];
    const offer = { id, tier, upgrade: (held || {})[id] != null };
    if (REWARD_BY_ID[id].rolls === "multAxis") offer.axis = MULT_AXES[Math.floor(rng() * MULT_AXES.length) % MULT_AXES.length];
    out.push(offer);
  }
  return out;
}

// ---- Campaign state ----------------------------------------------------------------------

/* Held rewards live as { [id]: tier } plus a side table for the rolled Feldzeichen axis. Both
   end with the campaign; only the unlock count outlives it. */
export const emptyCampaign = () => ({
  level: 1, run: 1, bosses: [], held: {}, axes: {}, scores: [], offer: null, done: false, lost: false,
});

export function startCampaign(rng = Math.random, unlocked = []) {
  return { ...emptyCampaign(), bosses: drawBosses(rng, unlocked) };
}

export const thresholdFor = (campaign, run = null) =>
  THRESHOLDS_L1[Math.max(0, Math.min(THRESHOLDS_L1.length - 1, (run ?? (campaign || {}).run ?? 1) - 1))];

/* Fürsprache lowers the NEXT run's threshold by a percentage. Same shape as the contract boons:
   base in, adjusted value out, and a run without the reward pays one field lookup. */
export function thresholdWith(campaign, run = null) {
  const base = thresholdFor(campaign, run);
  const tier = ((campaign || {}).held || {}).fuersprache;
  if (!tier) return base;
  return Math.round(base * (1 - rewardValue("fuersprache", tier) / 100));
}

export const isCleared = (campaign, score = 0, run = null) => score >= thresholdWith(campaign, run);

/* One finished run. Clearing the threshold advances the chain and earns a reward pick; missing it
   ends the campaign. The won-run count that drives the unlocks is kept by the caller, because it
   outlives the campaign. */
export function settleRun(campaign, { score = 0, contracts = 0 } = {}) {
  const c = campaign || emptyCampaign();
  const threshold = thresholdWith(c);
  const scores = [...(c.scores || []), score];
  if (score < threshold) return { ...c, scores, lost: true };
  const last = c.run >= RUNS_PER_LEVEL;
  const steps = stepsFor({ contracts, score, threshold });
  return {
    ...c, scores, done: last,
    pending: last ? null : { steps, tier: rarityFor(steps, c.level), contracts, score, threshold },
  };
}

// ---- Doors: base value in, campaign value out --------------------------------------------

/* Same shape as the contract boons (`xWith(state, base)`): a run without a campaign pays one
   field lookup and gets its own number back. The lesson from the loot audit applies — these
   change a NUMBER, so a test must assert the number, never that a key was written.

   The coin income carries BOTH the shutdown and Pfründe, because they sit on the same seam: with
   the economy locked there is no income at all, and with it unlocked Pfründe adds per cycle. */
export function campaignCoinsWith(state, base = 0) {
  if (!state || !state.campaign) return base;
  if (state.coinsEnabled === false) return 0;
  const tier = (state.campaign.held || {}).pfruende;
  return tier ? base + rewardValue("pfruende", tier) : base;
}

const heldOf = (state) => (state && state.campaign && state.campaign.held) || null;

/* Sold: more base points on every won trick, before the multipliers. It lands in the breakdown's
   `flats`, which is where it belongs — it IS an addend in scoreBase (engine.js:587), the same
   place SCORE_PER_WIN sits. §8 measured that seam: the end score is exactly linear in it. */
export function soldWith(state, base = 0) {
  const held = heldOf(state);
  return held && held.sold ? base + rewardValue("sold", held.sold) : base;
}

/* Feldzeichen raises ONE rolled axis. It lifts the axis's BONUS, not its value:
   `1 + (factor - 1) * (1 + x)`. Multiplying the factor itself would hand a non-crit trick a +35 %
   crit bonus out of nowhere, because an inactive axis sits at exactly 1. */
export function axisMultWith(state, axis, factor = 1) {
  const held = heldOf(state);
  if (!held || !held.feldzeichen || factor <= 1) return factor;
  if (((state.campaign.axes || {}).feldzeichen) !== axis) return factor;
  return 1 + (factor - 1) * (1 + rewardValue("feldzeichen", held.feldzeichen) / 100);
}

/* Steigbrief grows with the run: one step per ten cycles, so a full run of 50 ends at five steps.
   It multiplies the finished trick, deliberately late — it is a bonus on everything, not an axis. */
export function steigbriefWith(state, cycle = 0, base = 1) {
  const held = heldOf(state);
  if (!held || !held.steigbrief) return base;
  return base * (1 + Math.floor(Math.max(0, cycle) / 10) * rewardValue("steigbrief", held.steigbrief) / 100);
}

const bossEffect = (state) => {
  const c = state && state.campaign;
  return c ? ((BOSS_BY_ID[bossFor(c, c.run)] || {}).effect || {}) : {};
};

/* Waffenrecht lifts every own card, Zehnt lowers every enemy card. Same difference on paper, but
   Zehnt still bites when the own values are already capped — which is why both exist. */
export function cardValueWith(state, base = 0) {
  const held = heldOf(state);
  return held && held.waffenrecht ? base + rewardValue("waffenrecht", held.waffenrecht) : base;
}

/* Wetzstein raises the weakest deck card at the end of every cycle — the same shape as the perk
   Schmiede, which is why it sits next to it in the engine. */
export function wetzsteinWith(state, base = 0) {
  const held = heldOf(state);
  return held && held.wetzstein ? base + rewardValue("wetzstein", held.wetzstein) : base;
}

/* Der Konter: every won trick makes the NEXT enemy card stronger, and it stacks over a winning
   streak; a loss puts the surcharge back to zero. It rides its own counter rather than the win
   streak, because Standhaftigkeit keeps the STREAK alive through a loss — the surcharge must not
   inherit that, or the player's own reward would arm the boss. */
export function enemyValueWith(state, base = 0, counterStack = 0) {
  const held = heldOf(state);
  const per = bossEffect(state).counterPerWin || 0;
  const out = base + per * Math.max(0, counterStack) - (held && held.zehnt ? rewardValue("zehnt", held.zehnt) : 0);
  return Math.max(0, out);
}

/* Losentscheid converts a near loss into a win, exactly like the perk Patt — so it reads as the
   same margin and the wider of the two wins. */
export function pattMarginWith(state, base = 0) {
  const held = heldOf(state);
  return held && held.losentscheid ? Math.max(base, rewardValue("losentscheid", held.losentscheid)) : base;
}

/* Standhaftigkeit: the streak survives this many losses per cycle before it breaks. */
export const streakSurvivesWith = (state, lossesThisCycle = 0) => {
  const held = heldOf(state);
  return !!(held && held.standhaftigkeit && lossesThisCycle <= rewardValue("standhaftigkeit", held.standhaftigkeit));
};

/* Lückenschluss: how many foreign cards a formation run may skip. It feeds `gap` in
   `markRuns` (formations.js) — the very regler E_PACE and E_COLORBRIDGE already turn, so this is
   an existing dial, not a new mechanic. `scope` decides whether it applies per run or per phase. */
export function formationGapWith(state, base = 0) {
  const held = heldOf(state);
  if (!held || !held.lueckenschluss) return base;
  return base + rewardValue("lueckenschluss", held.lueckenschluss);
}

/* Wucherer triples instead of doubling; Handelsbrief takes a percentage off. Both land on the one
   price helper, so every purchase reads the same number. */
export const priceLadderWith = (state, base = 2) => bossEffect(state).priceLadder || base;

/* Handelsbrief nimmt Prozente vom fertigen Preis. Der Wucherer sitzt NICHT hier, sondern an der
   Treppe selbst (coins.js `rerollPrice`) — aus einem fertigen Preis liesse sich die Stufenzahl nicht
   zurueckrechnen, und der legendaere Neuwurf hat eine eigene Basis. */
export function discountWith(state, base = 0) {
  const held = heldOf(state);
  if (!held || !held.handelsbrief || !(base > 0)) return base;
  return Math.max(1, Math.round(base * (1 - rewardValue("handelsbrief", held.handelsbrief) / 100)));
}

/* Schmarotzer: every two held perks cost a coin per cycle, ROUNDED IN THE PLAYER'S FAVOUR
   (owner 2026-09-22) — three perks cost one coin, not two. It never takes more than is on the
   account, and without coins nothing happens at all, which is why the boss only enters the pool
   after that unlock. */
export function upkeepWith(state, perkCount = 0) {
  const per = bossEffect(state).perkUpkeep || 0;
  if (!per || !state || state.coinsEnabled === false) return 0;
  return Math.min(state.coins || 0, Math.floor(Math.max(0, perkCount) / per));
}

/* Der Schließer setzt vor JEDER Aufstellphase eines der acht Segmente fest, jedes Mal zufällig
   gezogen (Owner 2026-09-22). Bewusst ein eigenes Feld statt `challengeBlockForm`: das gehört dem
   ganzen Lauf (Wochen-Modifikatoren), diese Sperre wechselt mit der Phase. */
export const SEGMENT_SIZE = 5;
export function drawLockedSegment(state, rng = Math.random, segments = 8) {
  if (!bossEffect(state).lockSegment) return null;
  return Math.floor(rng() * segments) % segments;
}
export const segmentLocked = (state, i) => {
  const seg = state && state.lockedSegment;
  return seg != null && seg >= 0 && Math.floor(i / SEGMENT_SIZE) === seg;
};

// ---- What a campaign run starts with -----------------------------------------------------

/* Everything the campaign decides BEFORE the first trick, in one place: which decks are in the
   pool, how high the offers may roll, whether coins and contracts exist at all, and the two
   board-level effects that a boss or a reward shifts (formation energy, build field).

   Deliberately pure and free of the reducer: it takes the base values the caller already has and
   hands back overrides. A run without a campaign never calls it. Effects that only bite DURING a
   run — Schließer's locked segment, Schmarotzer's upkeep, Der Konter's surcharge, and the
   score-formula rewards — are not here; they hook into the engine. */
export function runSetup(campaign, unlocked = [], { energy = 4, cover = 24, coins = 3, positions = 40, rng = Math.random } = {}) {
  const c = campaign || emptyCampaign();
  const held = c.held || {};
  const eff = (BOSS_BY_ID[bossFor(c, c.run)] || {}).effect || {};

  const withCoins = coinsEnabled(unlocked);
  const out = {
    archetypes: decksFor(unlocked),
    rareCap: maxTierFor(unlocked),
    contracts: contractsEnabled(unlocked),
    coinsEnabled: withCoins,
    /* Ohne Münzen gibt es auch kein Startkapital — sonst stünde eine Zahl da, die nichts kauft. */
    coins: withCoins ? coins + (held.mitgift ? rewardValue("mitgift", held.mitgift) : 0) : 0,
    energy: Math.max(0, energy - (eff.energyMinus || 0) + (held.fahnenrecht ? rewardValue("fahnenrecht", held.fahnenrecht) : 0)),
    cover: Math.min(positions, cover + (held.lehen ? rewardValue("lehen", held.lehen) : 0)),
    blockCells: [],
    priceLadder: eff.priceLadder || null,   // Wucherer; null = die normale Treppe
    threshold: thresholdWith(c),
  };

  /* Denkmalpfleger zieht seine sechs Zellen ZUFÄLLIG (Owner 2026-09-22) und legt sie auf dieselbe
     Naht, die die Wochen-Modifikatoren schon benutzen. */
  if (eff.blockCells) {
    const free = Array.from({ length: positions }, (_, i) => i);
    for (let n = 0; n < eff.blockCells && free.length; n++) {
      out.blockCells.push(free.splice(Math.floor(rng() * free.length) % free.length, 1)[0]);
    }
  }
  return out;
}

export function takeReward(campaign, offer) {
  if (!campaign || !offer) return campaign;
  const held = { ...(campaign.held || {}), [offer.id]: offer.tier };
  const axes = offer.axis ? { ...(campaign.axes || {}), [offer.id]: offer.axis } : campaign.axes;
  return { ...campaign, held, axes, offer: null, pending: null, run: campaign.run + 1 };
}
