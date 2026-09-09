/* ============================================================
   SKILL CATALOG — ENGLISH. Mirrors src/game/skills.js entry for entry.

   IMPORTANT — the numbers are NOT typed out. Every figure is the SAME expression the German
   source uses (`${C.STATIC_CHARGE}`, `${pct(C.STORM_CRIT_CAP)}` …), pulled from the same
   constants. A balance change therefore moves both languages at once; there is no second place
   where a tuning number could go stale. `num()` and `grp()` below are the English siblings of
   `de()`/`grp()` in skills.js — decimal point instead of comma, comma instead of point as the
   thousands separator.

   Terminology is frozen (docs/localization/uebersetzerpaket_pixi_2026-08-15.md §3):
   cycle · trick · trick value · card value · margin · streak · charge · ionization · stack ·
   heat · brand · ash · forge · white heat · ash glow · glacier · mass · burst · threshold ·
   snow · growth · green/ripe · roots · bloom · colonize · runner · pruning.
   ============================================================ */
import * as C from "../game/constants.js";
import { EISZEIT_FLOOD as G_EISZEIT_FLOOD,
  EISZEIT_BURST_PER as G_EISZEIT_BURST,
  GROSSE_LAWINE_EVERY as G_LAWINE_EVERY, GROSSE_LAWINE_MULT as G_LAWINE_MULT,
  SCHILD_PER_PICK as G_SCHILD_PER_PICK } from "../game/glacier.js";

const num = (x) => String(x);                                            // English keeps the decimal point
const pct = (x) => Math.round(x * 100);                                  // share → percent (0.25 → 25)
const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");      // thousands separator (2000 → "2,000")

/* Amplifier skills do nothing without their base skill. The German texts label them
   "Verstärker:" — English keeps the same one-word marker so the pattern stays scannable. */
const AMP = "Amplifier:";
// The pruning clause repeats verbatim across six plant skills; keep it in ONE place here too.
const PRUNE = `Pruning: replacing the skill permanently grants +${pct(C.TRIM_STEP)}% root/bloom score (up to +${pct(C.TRIM_CAP)}%).`;

export default {
  /* ---- ⚡ Lightning ---- */
  /* exp skill rework (inactive catalogue): the 15 lightning skills carry four tiers now (Normal · Uncommon · Rare · Epic);
     the texts name the Normal row first and then the ladder, mirroring the German source. */
  "ability.SK_LIGHTNING_01.name": "Lightning Rod",
  "ability.SK_LIGHTNING_01.desc": "Every 2nd crit gives +1 extra charge. Uncommon: every crit. Rare: plus +1 charge after every full bar. Epic: +2 back, and charge above the bar is kept.",
  "ability.SK_LIGHTNING_08.name": "Static Buildup",
  "ability.SK_LIGHTNING_08.desc": "Every 2nd win without a crit gives +1 charge. Uncommon: every win without a crit. Rare: plus every 2nd loss +1 charge. Epic: win without a crit +2 charge, and the full bar gives the ionized card +1 card value permanently.",
  "ability.SK_LIGHTNING_05.name": "Residual Current",
  "ability.SK_LIGHTNING_05.desc": "After every full bar the charge starts at 2 instead of 0. Uncommon 3, Rare 4, Epic 6.",
  "ability.SK_LIGHTNING_16.name": "Continuous Current",
  "ability.SK_LIGHTNING_16.desc": "From streak 5 every win gives +1 charge. Uncommon from streak 4, Rare from 3, Epic from 2.",
  "ability.SK_LIGHTNING_06.name": "Storm Front",
  "ability.SK_LIGHTNING_06.desc": "Every full bar permanently grants +0.5% crit chance. Uncommon +0.75%, Rare +1%, Epic +1.5%.",
  "ability.SK_LIGHTNING_10.name": "Discharge",
  "ability.SK_LIGHTNING_10.desc": "Every full bar permanently grants +0.02× crit multiplier. Uncommon +0.03×, Rare +0.04×, Epic +0.06× — and the crit that fills the bar counts with double crit multiplier.",
  "ability.SK_LIGHTNING_07.name": "Charge Streak",
  "ability.SK_LIGHTNING_07.desc": "Every streak point grants +1% crit chance. Uncommon +1.5%, Rare +2%, Epic +2.5% — and from streak 8 every win gives +1 charge.",
  "ability.SK_LIGHTNING_13.name": "Voltage Buildup",
  "ability.SK_LIGHTNING_13.desc": "Every win without a crit grants +3% crit chance for the next win; a crit empties the buildup. Uncommon +4%, Rare +5%, Epic +6% — and a crit halves the buildup instead of emptying it.",
  "ability.SK_LIGHTNING_14.name": "Arc-Over",
  "ability.SK_LIGHTNING_14.desc": "Per 10 points of crit chance above 100%: +0.02× crit multiplier while the excess lasts. Uncommon +0.03×, Rare +0.04×, Epic +0.06×.",
  "ability.SK_LIGHTNING_03.name": "Chain Lightning",
  "ability.SK_LIGHTNING_03.desc": "Every 2nd full bar ionizes one more card in order. Uncommon: every bar +1 card. Rare: +2 cards. Epic: +3 cards, and the target card gets one extra stack.",
  "ability.SK_LIGHTNING_15.name": "Lightning Strike",
  "ability.SK_LIGHTNING_15.desc": "Every 5th crit ionizes the winning card (+1 stack). Uncommon every 4th, Rare every 3rd, Epic every 2nd crit.",
  "ability.SK_LIGHTNING_11.name": "Lightning Catcher",
  "ability.SK_LIGHTNING_11.desc": "Cards with 6 or more stacks fight with +2 value. Uncommon from 5, Rare from 4, Epic from 3 stacks.",
  "ability.SK_LIGHTNING_09.name": "Short Circuit",
  "ability.SK_LIGHTNING_09.desc": "Win with a card of 6 or more stacks: its stacks count double. Uncommon from 5, Rare from 4, Epic from 3 stacks.",
  "ability.SK_LIGHTNING_04.name": "Overvoltage",
  "ability.SK_LIGHTNING_04.desc": "Crit with a card of 6 or more stacks: +2 charge. Uncommon from 5, Rare from 4, Epic from 3 stacks.",
  "ability.SK_LIGHTNING_17.name": "Streak Guard",
  "ability.SK_LIGHTNING_17.desc": "If you lose a trick while holding at least 70% charge, the streak holds; those 70% are consumed. Uncommon 50%, Rare 40%, Epic 30% — and once per cycle the guard is free.",
  "ability.SK_LIGHTNING_L01.name": "Thunder God",
  "ability.SK_LIGHTNING_L01.desc": "The charge bar is full at 7. Permanently +0.4× crit multiplier.",
  "ability.SK_LIGHTNING_L02.name": "Double Discharge",
  "ability.SK_LIGHTNING_L02.desc": "Every ionization gives 2 stacks instead of 1. Crit with an ionized card: the lightning strikes twice, the trick counts double.",
  "ability.SK_LIGHTNING_L03.name": "High Voltage",
  "ability.SK_LIGHTNING_L03.desc": "All lightning skills you hold act one tier higher: Normal as Uncommon, Uncommon as Rare, Rare as Epic. Epic stays Epic.",
  "ability.SK_LIGHTNING_L04.name": "Breakdown",
  "ability.SK_LIGHTNING_L04.desc": "Losses can crit too: a crit on a lost trick wins it.",

  /* ---- 🔥 Fire ---- */
  /* exp skill rework (inactive catalogue): the 15 fire skills carry four tiers (Normal · Uncommon · Rare · Epic); the texts
     name the Normal row first and then the ladder, mirroring the German source. Ash, Spark Flight and Smelter are gone. */
  "ability.SK_FIRE_01.name": "Ember",
  "ability.SK_FIRE_01.desc": "Wins with a margin give ×1.25 heat. Uncommon ×1.5, Rare ×1.75, Epic ×2.",
  "ability.SK_FIRE_02.name": "Tinder",
  "ability.SK_FIRE_02.desc": "Every win gives +1% heat, even a narrow one. Uncommon +2%, Rare +3%, Epic +4%.",
  "ability.SK_FIRE_03.name": "Firestorm",
  "ability.SK_FIRE_03.desc": "Every win gives +0.5% heat per streak point. Uncommon +1%, Rare +1.5%, Epic +2%.",
  "ability.SK_FIRE_05.name": "Reignition",
  "ability.SK_FIRE_05.desc": "A win after a loss gives +0.5% heat per point of deficit. Uncommon +1%, Rare +1.5%, Epic +2% — and the card after a loss has +2 value.",
  "ability.SK_FIRE_04.name": "Ember Bed",
  "ability.SK_FIRE_04.desc": "Losses do not cool the heat below 40%. Uncommon not below 60%, Rare not below 80%, Epic: losses do not cool.",
  "ability.SK_FIRE_06.name": "Glowing Blade",
  "ability.SK_FIRE_06.desc": "All your cards have +1 value per 40% heat. Uncommon per 30%, Rare per 25%, Epic per 20%.",
  "ability.SK_FIRE_07.name": "White Heat",
  "ability.SK_FIRE_07.desc": "The heat bar reaches 200%. Above 100%, every 10% heat gives +3% score. Uncommon +4%, Rare +5%, Epic +6%.",
  "ability.SK_FIRE_08.name": "Fire Roll",
  "ability.SK_FIRE_08.desc": "From 80% heat the next card after a win has +2 value. Uncommon from 60%, Rare from 40%, Epic from 20% — and after a loss too.",
  "ability.SK_FIRE_09.name": "Combustion",
  "ability.SK_FIRE_09.desc": "A win with a margin of 8 or more counts ×1.5. Uncommon from 7, Rare from 6, Epic from 5.",
  "ability.SK_FIRE_11.name": "Wildfire",
  "ability.SK_FIRE_11.desc": "From 80% heat the next win burns the heat down to 40: +15 base score per burnt point. Uncommon +20, Rare +25, Epic +30 — and the fire burns down to 0.",
  "ability.SK_FIRE_12.name": "Melting Point",
  "ability.SK_FIRE_12.desc": "Every win burns 4% heat: +15 base score per point. Uncommon +20, Rare +25, Epic +30 — and half of the burnt heat comes back.",
  "ability.SK_FIRE_13.name": "Brand",
  "ability.SK_FIRE_13.desc": "From 80% heat every win brands the beaten opponent card: −2 value next cycle. Uncommon from 60%, Rare from 40%, Epic from 20% — and a loss brands the opponent card that won, too.",
  "ability.SK_FIRE_14.name": "Running Fire",
  "ability.SK_FIRE_14.desc": "From 80% heat every win brands both neighbours of the beaten opponent card: −1 value next cycle. Uncommon from 60%, Rare from 40%, Epic from 20% — with reach 2, so 4 neighbours.",
  "ability.SK_FIRE_15.name": "Forge",
  "ability.SK_FIRE_15.desc": "End of cycle: with at least 50 heat, forging costs 50 and your lowest card permanently gains +3 value. Uncommon costs 40, Rare costs 30, Epic costs 20 — and forges the 2 lowest cards.",
  "ability.SK_FIRE_16.name": "Ember Steel",
  "ability.SK_FIRE_16.desc": "Win: +8 base score per point of value above the card's base value, wherever the point comes from. Uncommon +12, Rare +16, Epic +20 — and forged value counts double.",
  "ability.SK_FIRE_L01.name": "Sun Core",
  "ability.SK_FIRE_L01.desc": "Every win brands the beaten opponent card (−1 value), and brands no longer renew: they stack across cycles. Win against a branded card: +20 base score per brand point on it.",
  "ability.SK_FIRE_L02.name": "Phoenix Fire",
  "ability.SK_FIRE_L02.desc": "Losses do not cool, they heat: +2% heat per point of deficit. If the heat falls to 0, it reignites at 50%.",
  "ability.SK_FIRE_L03.name": "Sun Wrath",
  "ability.SK_FIRE_L03.desc": "The heat multiplier uses the highest heat ever reached, not the current one. It counts double: per 10% heat +4% score instead of +2%.",
  "ability.SK_FIRE_L04.name": "Damascus Steel",
  "ability.SK_FIRE_L04.desc": "Every cycle your lowest card is forged, +3 value permanently, at no cost. Forged cards fight with double forged value.",

  /* ---- ❄️ Ice ---- */
  "ability.SK_ICE_01.name": "Freeze-On",
  "ability.SK_ICE_01.desc": `A glacier win gives +1 extra mass, +4 more inside a formation.`,
  "ability.SK_ICE_02.name": "Snowdrift",
  "ability.SK_ICE_02.desc": `When a glacier wins, it seeds +2 snow into the ground reserve of one of the 4 adjacent open cells, keeping its own mass.`,
  "ability.SK_ICE_03.name": "Permafrost",
  "ability.SK_ICE_03.desc": `Every cycle, unfrozen cells collect snow in their ground reserve: +1 at up to 2 cells' distance from the nearest glacier, +2 from 3.`,
  "ability.SK_ICE_04.name": "Compaction",
  "ability.SK_ICE_04.desc": `A glacier gains +0.25 mass per point of combat value above its base value. The value is played out as normal; value that itself comes from mass does not count.`,
  "ability.SK_ICE_06.name": "Pack Ice",
  "ability.SK_ICE_06.desc": `Every cycle, a glacier gains +0.5 mass per glacier neighbour.`,
  "ability.SK_ICE_07.name": "Ice Bridge",
  "ability.SK_ICE_07.desc": `Counts the four diagonals as adjacent too: scattered cells become one cluster, for bursts, collisions and cluster size.`,
  "ability.SK_ICE_08.name": "Ice Wall",
  "ability.SK_ICE_08.desc": `A glacier standing in a straight chain of at least 3 glaciers (row or column) bursts +15% harder per glacier of the chain beyond two — a full row is +45%.`,
  "ability.SK_ICE_09.name": "Interlock",
  "ability.SK_ICE_09.desc": `Every cycle, each glacier gains +0.15 mass per glacier in the connected cluster.`,
  "ability.SK_ICE_10.name": "Calving Edge",
  "ability.SK_ICE_10.desc": `Higher mass thresholds burst more steeply: force ×1.6 instead of ×1.5 at the 2nd threshold, ×2.6 instead of ×2.2 at the 3rd, ×3.8 instead of ×3.2 at the 4th.`,
  "ability.SK_ICE_11.name": "Icequake",
  "ability.SK_ICE_11.desc": `When a glacier bursts above the burst threshold, the ice quakes on: every point of mass above it makes the burst count +6% more.`,
  "ability.SK_ICE_13.name": "Glacier Tongue",
  "ability.SK_ICE_13.desc": `A glacier fights with +1 value per 6 mass.`,
  "ability.SK_ICE_14.name": "Glacier Collapse",
  "ability.SK_ICE_14.desc": `Every burst is +3% stronger per glacier that bursts in the same cycle.`,
  "ability.SK_ICE_15.name": "Freeze",
  "ability.SK_ICE_15.desc": "When a glacier bursts, the highest card of the opponent deck loses its trick in the next cycle.",
  "ability.SK_ICE_16.name": "Frost Bond",
  "ability.SK_ICE_16.desc": `When a glacier bursts, all its neighbours get +2 trick value in the next cycle. With ice bridge, this applies to the 8-neighbourhood.`,
  "ability.SK_ICE_17.name": "Brittle Fracture",
  "ability.SK_ICE_17.desc": `A glacier fights with +0.5 % crit chance per point of mass.`,
  "ability.SK_ICE_L01.name": "Ice Age",
  "ability.SK_ICE_L01.desc": `Every cycle, +${num(G_EISZEIT_FLOOD)} snow into the ground reserve of every unfrozen cell. Every glacier bursts with +${num(G_EISZEIT_BURST * 100)} % force per adjacent open cell.`,
  "ability.SK_ICE_L02.name": "Eternal Shield",
  "ability.SK_ICE_L02.desc": `Every ice skill freezes ${num(G_SCHILD_PER_PICK)} cells instead of one, with no upper limit. Your field counts as one glacier: every cycle, all of them share the same mass. On a burst, each counts as a fully surrounded glacier and takes the strongest glacier formation on the board.`,
  "ability.SK_ICE_L03.name": "Great Avalanche",
  "ability.SK_ICE_L03.desc": `Every ${G_LAWINE_EVERY}th cycle, all your glaciers burst, including those not full. Each burst counts with the force of the highest threshold and ×${num(G_LAWINE_MULT)}.`,

  /* ---- 🌿 Plant ---- */
  "ability.SK_PLANT_02.name": "Root Depth",
  "ability.SK_PLANT_02.desc": `Every win by a green card gives +${C.WURZELTIEFE_SCORE} root score, plus a bonus that rises with the total growth on the field (max +${C.WURZELTIEFE_FIELD_CAP} at ~${grp(Math.round((C.WURZELTIEFE_FIELD_CAP / C.WURZELTIEFE_FIELD_K) ** 2 / 1000) * 1000)} growth).`,
  "ability.SK_PLANT_03.name": "Taproot",
  "ability.SK_PLANT_03.desc": `${AMP} The root base (${C.WURZELTIEFE_SCORE}) ×${C.PFAHLWURZEL_MULT} when the green card wins inside a formation.`,
  "ability.SK_PLANT_04.name": "Growth Rings",
  "ability.SK_PLANT_04.desc": `${AMP} For every full ${C.JAHRESRINGE_PER_GROWTH} growth of its own, a green card gives +${C.JAHRESRINGE_SCORE} extra root score when it wins.`,
  "ability.SK_PLANT_05.name": "Sowing",
  "ability.SK_PLANT_05.desc": `When a green card wins, it sows both neighbours: +${C.AUSSAAT_GROWTH} growth per side.\n${PRUNE}`,
  "ability.SK_PLANT_06.name": "Wind Seeds",
  "ability.SK_PLANT_06.desc": `${AMP} Sowing skips cards that are already green and sows the next still-grey card behind them.\n${PRUNE}`,
  "ability.SK_PLANT_07.name": "Seedbed",
  "ability.SK_PLANT_07.desc": `The lowest card in each segment starts the run with +${C.SETZLINGSBEET_GROWTH} growth of a head start.\n${PRUNE}`,
  "ability.SK_PLANT_08.name": "Tough Stalk",
  "ability.SK_PLANT_08.desc": `Unripe (grey) cards grow +1 even on a loss, until they are green.\n${PRUNE}`,
  "ability.SK_PLANT_09.name": "Tendrils",
  "ability.SK_PLANT_09.desc": "When a green card wins, it immediately turns a still-grey neighbour green.",
  "ability.SK_PLANT_10.name": "Bloom",
  "ability.SK_PLANT_10.desc": `When a green card whose neighbours are already green wins, it blooms: +${C.BLUETE_SCORE} bloom score per green card in the segment.`,
  "ability.SK_PLANT_11.name": "Blooming Season",
  "ability.SK_PLANT_11.desc": `${AMP} Bloom score ×${C.BLUETEZEIT_MULT} when the card wins inside a formation.`,
  "ability.SK_PLANT_12.name": "Photosynthesis",
  "ability.SK_PLANT_12.desc": `Green cards inside a formation give ×${num(C.PHOTOSYNTHESE_MULT)} score on top.`,
  "ability.SK_PLANT_13.name": "Canopy",
  "ability.SK_PLANT_13.desc": `In a green suit block of ${C.BLAETTERDACH_MIN} cards or more, every green card gives +${C.BLAETTERDACH_SCORE} score per card in the block on a win (up to ${C.BLAETTERDACH_CARD_CAP}).`,
  "ability.SK_PLANT_14.name": "Overgrowth",
  "ability.SK_PLANT_14.desc": `Once the field is ${pct(C.UEBERWUCHERUNG_FIELD)}% green or more, all suit blocks give +${num(C.UEBERWUCHERUNG_FACTOR)} factor and bloom counts double.`,
  "ability.SK_PLANT_18.name": "Heartwood",
  "ability.SK_PLANT_18.desc": `Every win by a green card gives +${C.KERNHOLZ_SCORE_PER_VALUE} score per point of card value above its starting value (max +${(C.PLANT_VALUE_CAP - 1) * C.KERNHOLZ_SCORE_PER_VALUE} from value 1 to ${C.PLANT_VALUE_CAP}). Cards only gain value while you hold nothing but plant skills.`,
  "ability.SK_PLANT_15.name": "Runners",
  "ability.SK_PLANT_15.desc": `When a green card wins, it colonizes the lowest opponent card. Beat a colonized card and you harvest +${C.AUSLAEUFER_HARVEST} growth.\n${PRUNE}`,
  "ability.SK_PLANT_16.name": "Rhizome",
  "ability.SK_PLANT_16.desc": `${AMP} When harvesting, an equally colonized opponent neighbour is harvested along with it: +${C.AUSLAEUFER_HARVEST} extra growth.\n${PRUNE}`,
  "ability.SK_PLANT_17.name": "Harvest Feast",
  "ability.SK_PLANT_17.desc": `${AMP} If you harvest with a ripe card, you also get +${C.ERNTEDANK_SCORE} score.`,
  "ability.SK_PLANT_L01.name": "World Tree",
  "ability.SK_PLANT_L01.desc": `At the end of every cycle the whole forest grows: +1 growth per ${C.WELTENBAUM_PER_GREEN} green cards on the field. Every green win gives +${num(C.WELTENBAUM_DIRECT)} score per growth above the value cap, summed over all green cards (up to ${C.WELTENBAUM_OVERFLOW_CAP}).`,
  "ability.SK_PLANT_L02.name": "Mother Tree",
  "ability.SK_PLANT_L02.desc": `With Root Depth: when your most grown card is up, it doubles its root score. Every green win gives +${C.MUTTERBAUM_DIRECT} score per growth of your deepest tree above the value cap (up to ${C.MUTTERBAUM_OVERFLOW_CAP}), even without Root Depth.`,
  "ability.SK_PLANT_L03.name": "Tree Line",
  "ability.SK_PLANT_L03.desc": `Fully grown green cards (value ${C.PLANT_VALUE_CAP}) form a position-free repeat, wherever they sit: from 2 such cards ×${num(C.BAUMREIHE_BASE)} on their tricks, +${num(C.BAUMREIHE_STEP)} per further card, up to ×${num(C.BAUMREIHE_CAP)}. Each may count in a different formation at the same time.`,
  "ability.SK_PLANT_L04.name": "Eternal Spring",
  "ability.SK_PLANT_L04.desc": `Every green win gives +${C.EWIGER_FRUEHLING_DIRECT} score per green card on the field (up to ${C.EWIGER_FRUEHLING_FIELD_CAP}). On a fully green field, every green card counts ${num(C.EWIGER_FRUEHLING_FULLGREEN_MULT)}× (effectively up to ${C.EWIGER_FRUEHLING_FIELD_CAP * C.EWIGER_FRUEHLING_FULLGREEN_MULT}).`,

  /* ---- Archetype names ---- */
  "archetype.lightning.label": "Lightning",
  "archetype.fire.label": "Fire",
  "archetype.ice.label": "Ice",
  "archetype.plant.label": "Plant",
};
