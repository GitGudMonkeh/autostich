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

export function takeReward(campaign, offer) {
  if (!campaign || !offer) return campaign;
  const held = { ...(campaign.held || {}), [offer.id]: offer.tier };
  const axes = offer.axis ? { ...(campaign.axes || {}), [offer.id]: offer.axis } : campaign.axes;
  return { ...campaign, held, axes, offer: null, pending: null, run: campaign.run + 1 };
}
