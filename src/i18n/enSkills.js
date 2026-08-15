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
   firn · growth · green/ripe · roots · bloom · colonize · runner · pruning.
   ============================================================ */
import * as C from "../game/constants.js";
import { ANFRIEREN_WIN as G_ANFRIEREN_WIN, ANFRIEREN_FORM as G_ANFRIEREN_FORM, SCHNEETREIBEN_SEED as G_SCHNEETREIBEN_SEED,
  DAUERFROST_NEAR as G_DAUERFROST_NEAR, DAUERFROST_FAR as G_DAUERFROST_FAR, VERDICHTUNG_RATE as G_VERDICHTUNG_RATE,
  PACKEIS_PER_NEIGHBOR as G_PACKEIS_PER, VERZAHNUNG_PER as G_VERZAHNUNG_PER, GEO_LINIE as G_GEO_LINIE, EISWALL_LINIE as G_EISWALL_LINIE,
  TIER_MULT as G_TIER_MULT, ABBRUCHKANTE_TIER_MULT as G_ABBRUCH_TIER, ZERMALMEN_KOLLISION as G_ZERMALMEN_KOLL, KOLLISION_MULT as G_KOLLISION,
  RISSBILDUNG_BURST as G_RISSBILDUNG_BURST, THRESHOLDS as G_THRESHOLDS, GLETSCHERSTURZ_PER as G_GLETSCHERSTURZ_PER,
  FROSTBUND_BUFF as G_FROSTBUND_BUFF, EISPANZER_MASS as G_EISPANZER_MASS, EISZEIT_FLOOD as G_EISZEIT_FLOOD,
  EISZEIT_MAX_GLACIERS as G_EISZEIT_MAX, SCHILD_BONUS as G_SCHILD_BONUS, ERSTARRUNG_FRAC as G_ERSTARRUNG_FRAC } from "../game/glacier.js";

const num = (x) => String(x);                                            // English keeps the decimal point
const pct = (x) => Math.round(x * 100);                                  // share → percent (0.25 → 25)
const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");      // thousands separator (2000 → "2,000")

/* Amplifier skills do nothing without their base skill. The German texts label them
   "Verstärker:" — English keeps the same one-word marker so the pattern stays scannable. */
const AMP = "Amplifier:";
// The pruning clause repeats verbatim across six plant skills; keep it in ONE place here too.
const PRUNE = `Pruning: replacing one permanently grants +${pct(C.TRIM_STEP)}% root/bloom score (up to +${pct(C.TRIM_CAP)}%).`;

export default {
  /* ---- ⚡ Lightning ---- */
  "ability.SK_LIGHTNING_01.name": "Lightning Rod",
  "ability.SK_LIGHTNING_01.desc": `Every crit generates +1 extra charge (on top of the archetype's base charge); on top of that, every full charge consumption returns +${C.BLITZABLEITER_CONSUME_CHARGE} charge.`,
  "ability.SK_LIGHTNING_08.name": "Static Buildup",
  "ability.SK_LIGHTNING_08.desc": `Every win without a crit generates +${C.STATIC_CHARGE} charge; on top of that, every full charge consumption gives +${C.CONSUME_SCORE} direct score.`,
  "ability.SK_LIGHTNING_05.name": "Residual Current",
  "ability.SK_LIGHTNING_05.desc": `After every full charge consumption, ${C.REST_CHARGE_FLOOR} charge is kept (instead of 0).`,
  "ability.SK_LIGHTNING_06.name": "Storm Front",
  "ability.SK_LIGHTNING_06.desc": `Every full charge consumption permanently grants +${pct(C.STORM_CRIT_STEP)}% crit chance (up to +${pct(C.STORM_CRIT_CAP)}%). Anything above 100% flows back into charge via arc-over.`,
  "ability.SK_LIGHTNING_10.name": "Discharge",
  "ability.SK_LIGHTNING_10.desc": `Every full charge consumption permanently grants +${num(C.ENTLADUNG_MULT_STEP)}× crit multiplier (up to +${num(C.ENTLADUNG_MULT_CAP)}×).`,
  "ability.SK_LIGHTNING_02.name": "Ionization",
  "ability.SK_LIGHTNING_02.desc": `At full charge: ${C.ION_BASE_COUNT} unplayed cards become ionized (+${C.ION_SPEED_PER_SKILL} per lightning skill beyond ${C.ION_SPEED_MIN_SKILLS}), then charge empties.

▸ Win with an ionized card: +${C.ION_SCORE_PER_STACK} score per stack.
▸ Every stack in the deck: +${pct(C.ION_CRIT_PP_PER_STACK)}% crit chance for all cards (max +${pct(C.ION_CRIT_STACK_CAP * C.ION_CRIT_PP_PER_STACK)}%).
▸ Once ~${pct(C.ION_SAT_BREADTH_FRAC)}% of the cards are ionized: all cards +${C.ION_SATURATION_VALUE} value.
▸ Once ~${pct(C.ION_SAT_DEPTH_FRAC)}% are fully ionized: arc-over pulls twice as much charge out of surplus crit chance.`,
  "ability.SK_LIGHTNING_07.name": "Charge Streak",
  "ability.SK_LIGHTNING_07.desc": `Every streak point grants +${pct(C.SERIESCRIT_STEP)}% crit chance (up to +${pct(C.SERIESCRIT_CAP)}%). Consumes no charge.`,
  "ability.SK_LIGHTNING_03.name": "Chain Lightning",
  "ability.SK_LIGHTNING_03.desc": `${AMP} Every ionization catches +${C.KETTENBLITZ_COUNT} more cards.`,
  "ability.SK_LIGHTNING_12.name": "Breadth Accelerator",
  "ability.SK_LIGHTNING_12.desc": "When an ionized card wins, an ionization stack preferentially jumps to a card that is not ionized yet (0 stacks) — pushing breadth towards full ionization. If there is none, it goes to the next card that is not yet full.",
  "ability.SK_LIGHTNING_11.name": "Lightning Catcher",
  "ability.SK_LIGHTNING_11.desc": `When an ionization hits a card that is already full (${C.ION_MAX_STACKS} stacks), it normally fizzles. Instead it now gives +${C.BLITZFAENGER_VALUE} trick value (only the next time that card comes up) and +1 charge.`,
  "ability.SK_LIGHTNING_09.name": "Short Circuit",
  "ability.SK_LIGHTNING_09.desc": `When you win with a fully ionized card (${C.ION_MAX_STACKS} stacks), it short-circuits: +${C.KURZSCHLUSS_SCORE} score and +${C.KURZSCHLUSS_CHARGE} charge — on every win, without losing the stacks.`,
  "ability.SK_LIGHTNING_13.name": "Voltage Buildup",
  "ability.SK_LIGHTNING_13.desc": `Every win without a crit grants +${pct(C.SPANNUNGSSTAU_STEP)}% crit chance for the next win (up to +${pct(C.SPANNUNGSSTAU_CAP)}%); a crit releases the buildup and resets it.`,
  "ability.SK_LIGHTNING_14.name": "Arc-Over",
  "ability.SK_LIGHTNING_14.desc": `Crit chance above 100% is not wasted — it converts into charge on every win: every ${C.UEBERSCHLAG_PP_PER_CHARGE} percentage points above 100% give +1 charge. Once ~${pct(C.ION_SAT_DEPTH_FRAC)}% of the cards are fully ionized (full depth), ${C.UEBERSCHLAG_DEPTH_PP_PER_CHARGE} percentage points per charge are enough.`,
  "ability.SK_LIGHTNING_04.name": "Overvoltage",
  "ability.SK_LIGHTNING_04.desc": `A crit on or directly next to an ionized card generates +${C.UEBERSPANNUNG_CHARGE} charge.`,
  "ability.SK_LIGHTNING_15.name": "Lightning Strike",
  "ability.SK_LIGHTNING_15.desc": `Every crit ionizes the card it won with (+${C.BLITZSCHLAG_STACKS} stacks).`,
  "ability.SK_LIGHTNING_16.name": "Continuous Current",
  "ability.SK_LIGHTNING_16.desc": `Every win in a row grants +1 charge per ${C.DAUERSTROM_PER_STREAK} streak points (at most +${C.DAUERSTROM_MAX} per win). Every full consumption also permanently grants +${pct(C.DAUERSTROM_CONSUME_CRIT)}% crit chance (up to +${pct(C.DAUERSTROM_CRIT_CAP)}%).`,
  "ability.SK_LIGHTNING_17.name": "Streak Guard",
  "ability.SK_LIGHTNING_17.desc": `If you lose a trick while holding at least half your charge (${pct(C.SERIENSCHUTZ_COST_FRAC)}%), your streak does not break — that charge is consumed instead.`,
  "ability.SK_LIGHTNING_L01.name": "Thunder God",
  "ability.SK_LIGHTNING_L01.desc": `Consumers already trigger at ${pct(C.DONNERGOTT_THRESHOLD_FRAC)}% charge (discharging more often) and permanently grant +${num(C.THUNDER_CRIT_MULT)}× crit multiplier.`,
  "ability.SK_LIGHTNING_L02.name": "Double Discharge",
  "ability.SK_LIGHTNING_L02.desc": `On a full charge consumption, the consumer ionizes ${C.DOPPELENTLADUNG_FACTOR}× as many cards. On top of that, every win with an ionized card gives +${C.DOPPELENT_DIRECT} score per ionization stack on the field (up to ${C.DOPPELENT_FIELD_CAP} stacks) — the score share scales with your lightning commitment (full on pure lightning).`,
  "ability.SK_LIGHTNING_L03.name": "Area Ionization",
  "ability.SK_LIGHTNING_L03.desc": `When you win with an ionized card, both unplayed neighbour cards each get +1 ionization stack. On top of that, every win with an ionized card gives +${C.FLAECHENION_DIRECT} score per ionized card on the field (up to ${C.FLAECHENION_FIELD_CAP} cards) — the score share scales with your lightning commitment (full on pure lightning).`,
  "ability.SK_LIGHTNING_L04.name": "Breakdown",
  "ability.SK_LIGHTNING_L04.desc": `When a fully ionized card (${C.ION_MAX_STACKS} stacks) wins with a crit, it permanently grants +${num(C.DURCHSCHLAG_CRIT_MULT)}× crit multiplier (up to +${num(C.DURCHSCHLAG_MULT_CAP)}×).`,

  /* ---- 🔥 Fire ---- */
  "ability.SK_FIRE_01.name": "Ember",
  "ability.SK_FIRE_01.desc": `Wins with a margin give +${pct(C.EMBER_MULT - 1)}% more heat (heat gain ×${num(C.EMBER_MULT)}).`,
  "ability.SK_FIRE_02.name": "Tinder",
  "ability.SK_FIRE_02.desc": `Every win gives +${C.ZUNDER_HEAT}% heat — even on a narrow margin.`,
  "ability.SK_FIRE_03.name": "Firestorm",
  "ability.SK_FIRE_03.desc": `Every win in a row gives +${C.FEUERSTURM_STEP}% more heat (up to +${C.FEUERSTURM_CAP}%); a loss resets it.`,
  "ability.SK_FIRE_04.name": "Ember Bed",
  "ability.SK_FIRE_04.desc": `Losses cost only ${pct(C.GLUTBETT_MULT)}% of the heat; below ${C.GLUTBETT_FREE_BELOW}% heat, nothing at all.`,
  "ability.SK_FIRE_05.name": "Reignition",
  "ability.SK_FIRE_05.desc": `After a loss, the next win gives +${C.RUECKZUENDUNG_HEAT_PER_DEFICIT}% heat per point of value deficit and gives the winning card +${C.RUECKZUENDUNG_VALUE} trick value.`,
  "ability.SK_FIRE_06.name": "Glowing Blade",
  "ability.SK_FIRE_06.desc": `All your cards gain trick value from heat: +${C.GLOWING_T1_VALUE} from ${C.GLOWING_T1_HEAT}%, +${C.GLOWING_T2_VALUE} from ${C.GLOWING_T2_HEAT}%, +${C.GLOWING_T3_VALUE} at ${C.GLOWING_T3_HEAT}%.`,
  "ability.SK_FIRE_07.name": "White Heat",
  "ability.SK_FIRE_07.desc": `At full heat, every further heat gain turns into score: +${C.WHITEHEAT_PER_POINT} score per overflowing heat point.`,
  "ability.SK_FIRE_08.name": "Fire Roll",
  "ability.SK_FIRE_08.desc": `From ${C.FIREROLL_MIN_HEAT}% heat, every win in a row gives the next card +1 trick value (rising to +${C.FIREROLL_MAX}); a loss resets it.`,
  "ability.SK_FIRE_09.name": "Combustion",
  "ability.SK_FIRE_09.desc": `A large margin gives more fire score: ×${num(C.VERBRENNUNG_T1_MULT)} from ${C.VERBRENNUNG_T1_MARGIN}, ×${num(C.VERBRENNUNG_T2_MULT)} from ${C.VERBRENNUNG_T2_MARGIN} margin.`,
  "ability.SK_FIRE_10.name": "Spark Flight",
  "ability.SK_FIRE_10.desc": `Every win below ${C.SPARKFLIGHT_MIN_MARGIN} margin puts its fire score into a store. A win with a margin of ${C.SPARKFLIGHT_MIN_MARGIN} or more pays the store out and empties it; a loss halves it.`,
  "ability.SK_FIRE_11.name": "Wildfire",
  "ability.SK_FIRE_11.desc": `From ${C.CONFLAG_MIN_HEAT}% heat, the next win burns all your heat for +${C.CONFLAG_PER_HEAT} score per heat point (full ≈ +${grp(C.CONFLAG_PER_HEAT * C.HEAT_MAX)}).`,
  "ability.SK_FIRE_12.name": "Melting Point",
  "ability.SK_FIRE_12.desc": `Before every trick −${C.MELT_COST}% heat; on a win +${C.MELT_COST * C.MELT_PER_HEAT} score.`,
  "ability.SK_FIRE_13.name": "Brand",
  "ability.SK_FIRE_13.desc": `Every win brands an opponent card (−${C.BRAND_VALUE} value) and gives +${C.BRAND_ASH} ash.`,
  "ability.SK_FIRE_14.name": "Running Fire",
  "ability.SK_FIRE_14.desc": `${AMP} Brands spread to a neighbour card (−${C.BRAND_VALUE} value) and give +${C.BRAND_ASH} ash.`,
  "ability.SK_FIRE_15.name": "Ash Forge",
  "ability.SK_FIRE_15.desc": `At the end of every cycle: as long as you have ${C.FORGE_COST} ash or more, your lowest card each time permanently gains +${C.FORGE_VALUE} card value. Once the forge is full, further ash burns off as ash glow for +${grp(C.FORGE_OVERFLOW_SCORE)} score per ${C.FORGE_COST} ash. (Smelter lowers the ash cost from ${C.SCHMELZOFEN_MIN_HEAT}% heat.)`,
  "ability.SK_FIRE_16.name": "Ember Steel",
  "ability.SK_FIRE_16.desc": `${AMP} Forged cards give +${C.GLUTSTAHL_PER_VALUE} score per forged value on a win.`,
  "ability.SK_FIRE_17.name": "Smelter",
  "ability.SK_FIRE_17.desc": `From ${C.SCHMELZOFEN_MIN_HEAT}% heat, brands additionally burn −${C.SCHMELZOFEN_BRAND_BONUS} value and give +${C.SCHMELZOFEN_BRAND_BONUS} extra ash; forging costs ${pct(C.SCHMELZOFEN_FORGE_DISCOUNT)}% less ash.`,
  "ability.SK_FIRE_L01.name": "Sun Core",
  "ability.SK_FIRE_L01.desc": `If a cycle ends at ${C.SONNENKERN_MIN_HEAT}% heat or more, every card below value ${C.SONNENKERN_CARD_CAP} permanently gains +${C.SONNENKERN_VALUE} card value.`,
  "ability.SK_FIRE_L02.name": "Phoenix Fire",
  "ability.SK_FIRE_L02.desc": `Losses cost no heat — they give +${C.PHOENIX_LOSS_HEAT}% heat per point of deficit instead. If consumption drops your heat to 0, it reignites once per cycle at ${Math.round(C.PHOENIX_REIGNITE * 100)}%.`,
  "ability.SK_FIRE_L03.name": "Sun Wrath",
  "ability.SK_FIRE_L03.desc": `Your entire win score is multiplied by the highest heat you have ever held: +${num(Math.round(C.SUNWRATH_PEAK_STEP * 1000) / 10)}% per peak percent (peak 100 → ×${num(Math.round((1 + 100 * C.SUNWRATH_PEAK_STEP) * 100) / 100)}).`,
  "ability.SK_FIRE_L04.name": "Damascus Steel",
  "ability.SK_FIRE_L04.desc": `Forges your lowest card every cycle without ash (+${C.FORGE_VALUE} value, up to ${C.DAMASCUS_MAX_FORGED} cards). Forged cards fight with +${C.DAMASCUS_COMBAT} value. Every win gives +${C.DAMASCUS_DIRECT} score per point of total forged value. No ash is consumed.`,

  /* ---- ❄️ Ice ---- */
  "ability.SK_ICE_01.name": "Freeze-On",
  "ability.SK_ICE_01.desc": `A glacier win gives +${num(G_ANFRIEREN_WIN)} extra mass; if the glacier wins inside a formation, +${num(G_ANFRIEREN_FORM)} on top.`,
  "ability.SK_ICE_02.name": "Snowdrift",
  "ability.SK_ICE_02.desc": `When a glacier wins, it seeds +${num(G_SCHNEETREIBEN_SEED)} firn into the ground reserve of an adjacent open cell — as an addition, without giving up mass of its own; only at 0 mass of its own does it give up its win mass instead. Open ground only (never under a glacier), only the 4 direct neighbours; ice bridge does not count here.`,
  "ability.SK_ICE_03.name": "Permafrost",
  "ability.SK_ICE_03.desc": `Every cycle, open ground frosts over: unfrozen cells collect firn in their ground reserve by distance to the nearest glacier — +${num(G_DAUERFROST_NEAR)} at 2 cells' distance, +${num(G_DAUERFROST_FAR)} from 3. The 8 cells directly around a glacier stay empty. The reserve refills a glacier later frozen here at the start of the cycle.`,
  "ability.SK_ICE_04.name": "Compaction",
  "ability.SK_ICE_04.desc": `If a building raises the card strength of a glacier card, that value bonus is not played out (the card fights without it) but stored as mass instead: +${num(G_VERDICHTUNG_RATE)} mass per point. Score buildings are untouched.`,
  "ability.SK_ICE_05.name": "Fusion",
  "ability.SK_ICE_05.desc": "At the start of a cycle, adjacent glaciers lift each other to the average mass of their cluster — lifting only, never dropping.",
  "ability.SK_ICE_06.name": "Pack Ice",
  "ability.SK_ICE_06.desc": `Every cycle, a glacier gains +${num(G_PACKEIS_PER)} mass per glacier neighbour.`,
  "ability.SK_ICE_07.name": "Ice Bridge",
  "ability.SK_ICE_07.desc": "Counts the four diagonals as adjacent too (8-neighbourhood) — connecting scattered cells into one cluster (affects bursts, collisions and cluster size).",
  "ability.SK_ICE_08.name": "Ice Wall",
  "ability.SK_ICE_08.desc": `A fully frozen row or column (the line formation) strengthens the burst of all its glaciers: ×${num(G_EISWALL_LINIE)} instead of ×${num(G_GEO_LINIE)}.`,
  "ability.SK_ICE_09.name": "Interlock",
  "ability.SK_ICE_09.desc": `Every cycle, each glacier gains +${num(G_VERZAHNUNG_PER)} mass per glacier in the connected cluster.`,
  "ability.SK_ICE_10.name": "Calving Edge",
  "ability.SK_ICE_10.desc": `Higher mass thresholds burst more steeply: force ×${num(G_ABBRUCH_TIER[2])} / ×${num(G_ABBRUCH_TIER[3])} at the 2nd / 3rd threshold (instead of ×${num(G_TIER_MULT[2])} / ×${num(G_TIER_MULT[3])}).`,
  "ability.SK_ICE_11.name": "Chain Burst",
  "ability.SK_ICE_11.desc": "When a glacier bursts, it forces adjacent glaciers to burst with it immediately — even if they would not have reached the threshold.",
  "ability.SK_ICE_12.name": "Crush",
  "ability.SK_ICE_12.desc": `When a burst hits a glacier neighbour, the collision counts for more: factor ×${num(G_ZERMALMEN_KOLL)} instead of ×${num(G_KOLLISION)}.`,
  "ability.SK_ICE_13.name": "Fracturing",
  "ability.SK_ICE_13.desc": `Unstable ice: a glacier bursts at ${num(G_RISSBILDUNG_BURST)} mass already (instead of ${num(G_THRESHOLDS[G_THRESHOLDS.length - 1])}).`,
  "ability.SK_ICE_14.name": "Glacier Collapse",
  "ability.SK_ICE_14.desc": `The more glaciers burst in the same cycle, the stronger each burst: +${pct(G_GLETSCHERSTURZ_PER)}% per bursting glacier.`,
  "ability.SK_ICE_15.name": "Freeze",
  "ability.SK_ICE_15.desc": "When a glacier bursts onto an opponent card, that card loses its trick in the next cycle.",
  "ability.SK_ICE_16.name": "Frost Bond",
  "ability.SK_ICE_16.desc": `When a glacier bursts, its non-ice neighbours are strengthened: +${num(G_FROSTBUND_BUFF)} trick value in the next cycle. With ice bridge, the buff reaches the 8-neighbourhood (diagonals included).`,
  "ability.SK_ICE_17.name": "Ice Armour",
  "ability.SK_ICE_17.desc": `A loss next to a glacier does not break your streak — it feeds +${num(G_EISPANZER_MASS)} mass per adjacent glacier instead.`,
  "ability.SK_ICE_L01.name": "Ice Age",
  "ability.SK_ICE_L01.desc": `Every cycle: +${num(G_EISZEIT_FLOOD)} firn into the ground reserve of every unfrozen cell, then the one with the largest reserve freezes into a glacier (starts empty, refills from its reserve) — up to ${G_EISZEIT_MAX} glaciers.`,
  "ability.SK_ICE_L02.name": "Eternal Shield",
  "ability.SK_ICE_L02.desc": `The whole field becomes ONE super-glacier. Every cycle, all your glaciers rise to the mass of the strongest and gain +${G_SCHILD_BONUS} mass on top (never dropping). On a burst, every glacier counts as a neighbour of every other — full cascade and collision, wherever they sit. Placement becomes irrelevant; only the largest mass matters.`,
  "ability.SK_ICE_L03.name": "Great Avalanche",
  "ability.SK_ICE_L03.desc": "In the final cycle, ALL your glaciers burst at once — including those not yet full — each with the force of the highest threshold and massively amplified. Until then, hoarding pays off: more glaciers, more mass, a far bigger blow.",
  "ability.SK_ICE_L04.name": "Rigor",
  "ability.SK_ICE_L04.desc": `The opponent freezes solid: every opponent card hit by the burst loses its trick, and the burst reaches beyond the four neighbours further into the opponent's field. On top of that, every burst counts ×${num(1 + G_ERSTARRUNG_FRAC)} score.`,

  /* ---- 🌿 Plant ---- */
  "ability.SK_PLANT_02.name": "Root Depth",
  "ability.SK_PLANT_02.desc": `Every win by a green card gives +${C.WURZELTIEFE_SCORE} root score, plus a bonus that rises with the total growth on the field (max +${C.WURZELTIEFE_FIELD_CAP} at ~${grp(Math.round((C.WURZELTIEFE_FIELD_CAP / C.WURZELTIEFE_FIELD_K) ** 2 / 1000) * 1000)} growth).`,
  "ability.SK_PLANT_03.name": "Taproot",
  "ability.SK_PLANT_03.desc": `${AMP} The root base (${C.WURZELTIEFE_SCORE}) ×${C.PFAHLWURZEL_MULT} when the green card wins inside a formation (growth rings and the field bonus are untouched).`,
  "ability.SK_PLANT_04.name": "Growth Rings",
  "ability.SK_PLANT_04.desc": `${AMP} For every full ${C.JAHRESRINGE_PER_GROWTH} growth of its own, a green card gives +${C.JAHRESRINGE_SCORE} extra root score when it wins.`,
  "ability.SK_PLANT_05.name": "Sowing",
  "ability.SK_PLANT_05.desc": `When a green card wins, it sows both neighbours: +${C.AUSSAAT_GROWTH} growth per side. ${PRUNE}`,
  "ability.SK_PLANT_06.name": "Wind Seeds",
  "ability.SK_PLANT_06.desc": `${AMP} Sowing skips cards that are already green and sows the next still-grey card behind them. ${PRUNE}`,
  "ability.SK_PLANT_07.name": "Seedbed",
  "ability.SK_PLANT_07.desc": `The lowest card in each segment starts the run with +${C.SETZLINGSBEET_GROWTH} growth of a head start. ${PRUNE}`,
  "ability.SK_PLANT_08.name": "Tough Stalk",
  "ability.SK_PLANT_08.desc": `Unripe (grey) cards grow +1 even on a loss — until they are green. ${PRUNE}`,
  "ability.SK_PLANT_09.name": "Tendrils",
  "ability.SK_PLANT_09.desc": "When a green card wins, it immediately turns a still-grey neighbour green.",
  "ability.SK_PLANT_10.name": "Bloom",
  "ability.SK_PLANT_10.desc": `When a green card whose neighbours are already green wins, it blooms: +${C.BLUETE_SCORE} bloom score per green card in the segment.`,
  "ability.SK_PLANT_11.name": "Blooming Season",
  "ability.SK_PLANT_11.desc": `${AMP} Bloom score ×${C.BLUETEZEIT_MULT} when the card wins inside a formation.`,
  "ability.SK_PLANT_12.name": "Photosynthesis",
  "ability.SK_PLANT_12.desc": `Green cards inside a formation give ×${num(C.PHOTOSYNTHESE_MULT)} score on top.`,
  "ability.SK_PLANT_13.name": "Canopy",
  "ability.SK_PLANT_13.desc": `In a green suit block of ${C.BLAETTERDACH_MIN} cards or more, every green card gives +${C.BLAETTERDACH_SCORE} extra score per card in the block on a win (up to ${C.BLAETTERDACH_CARD_CAP}).`,
  "ability.SK_PLANT_14.name": "Overgrowth",
  "ability.SK_PLANT_14.desc": `Once the field is ${pct(C.UEBERWUCHERUNG_FIELD)}% green or more, all suit blocks get stronger (+${num(C.UEBERWUCHERUNG_FACTOR)} factor) and bloom counts double.`,
  "ability.SK_PLANT_18.name": "Heartwood",
  "ability.SK_PLANT_18.desc": `Every win by a green card gives +${C.KERNHOLZ_SCORE_PER_VALUE} score per point of card value above its starting value (max +${(C.PLANT_VALUE_CAP - 1) * C.KERNHOLZ_SCORE_PER_VALUE} on a card grown from value 1 to ${C.PLANT_VALUE_CAP}). Cards only gain value on pure plant.`,
  "ability.SK_PLANT_15.name": "Runners",
  "ability.SK_PLANT_15.desc": `When a green card wins, it colonizes the lowest opponent card. Beat a colonized card and you harvest +${C.AUSLAEUFER_HARVEST} growth. ${PRUNE}`,
  "ability.SK_PLANT_16.name": "Rhizome",
  "ability.SK_PLANT_16.desc": `${AMP} When harvesting, an equally colonized opponent neighbour is harvested along with it — +${C.AUSLAEUFER_HARVEST} extra growth. ${PRUNE}`,
  "ability.SK_PLANT_17.name": "Harvest Feast",
  "ability.SK_PLANT_17.desc": `${AMP} If you harvest with a ripe card, you also get +${C.ERNTEDANK_SCORE} score.`,
  "ability.SK_PLANT_L01.name": "World Tree",
  "ability.SK_PLANT_L01.desc": `At the end of every cycle the whole forest grows (+1 growth per ${C.WELTENBAUM_PER_GREEN} green cards on the field). On top of that, every green win gives +${num(C.WELTENBAUM_DIRECT)} score per overflow growth (growth above the value cap), summed over all green cards (up to ${C.WELTENBAUM_OVERFLOW_CAP}).`,
  "ability.SK_PLANT_L02.name": "Mother Tree",
  "ability.SK_PLANT_L02.desc": `With Root Depth: when your most grown card is up, it doubles its root score. On top of that (even without Root Depth), every green win gives +${C.MUTTERBAUM_DIRECT} score per overflow growth of your deepest tree (up to ${C.MUTTERBAUM_OVERFLOW_CAP}).`,
  "ability.SK_PLANT_L03.name": "Tree Line",
  "ability.SK_PLANT_L03.desc": `Fully grown green cards (value ${C.PLANT_VALUE_CAP}) form a position-free repeat: for each such card on the board, the factor on their tricks rises (from 2 ×${num(C.BAUMREIHE_BASE)}, +${num(C.BAUMREIHE_STEP)} per further card, up to ×${num(C.BAUMREIHE_CAP)}) — wherever they sit, and each may feed a different local formation at the same time.`,
  "ability.SK_PLANT_L04.name": "Eternal Spring",
  "ability.SK_PLANT_L04.desc": `Every green win gives +${C.EWIGER_FRUEHLING_DIRECT} score per green card on the field (up to ${C.EWIGER_FRUEHLING_FIELD_CAP}). On a fully green field, every green card counts ${num(C.EWIGER_FRUEHLING_FULLGREEN_MULT)}× (effectively up to ${C.EWIGER_FRUEHLING_FIELD_CAP * C.EWIGER_FRUEHLING_FULLGREEN_MULT}).`,

  /* ---- Archetype names ---- */
  "archetype.lightning.label": "Lightning",
  "archetype.fire.label": "Fire",
  "archetype.ice.label": "Ice",
  "archetype.plant.label": "Plant",
};
