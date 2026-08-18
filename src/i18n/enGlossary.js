/* ============================================================
   GLOSSARY — ENGLISH. 109 entries + 8 categories + 5 groups.

   Two things are special here:

   1. NUMBERS. Where the German interpolates a constant, so does the English — same expression,
      same source (see enSkills.js). 35 of the 109 texts carry tuning numbers.

   2. `match` LISTS ARE NOT TRANSLATED, THEY ARE REWRITTEN. They drive the auto-bolding in every
      description (tokenizeGlossary), so they must contain the WORD FORMS that actually occur in
      English texts — plurals, verb forms, hyphenated variants. A literal translation of the
      German inflection list ("Durchlaufs", "Durchläufen") would be nonsense. English needs fewer
      forms but different ones, e.g. "burst / bursts / bursting".
      Every form must also be spelled exactly as it appears in the English catalog — a form that
      never occurs simply never bolds.

   Terminology is frozen (Übersetzerpaket §3).
   ============================================================ */
import * as C from "../game/constants.js";
import { WIN_MASS as G_WIN_MASS, EWIGER_FROST as G_EWIGER_FROST, THRESHOLDS as G_THRESHOLDS,
  KASKADE_PER_NEIGHBOR as G_KASKADE, GEO_BLOCK as G_BLOCK, GEO_KREUZ as G_KREUZ, GEO_LINIE as G_LINIE,
  GEO_FLAECHE as G_FLAECHE } from "../game/glacier.js";
import { SKILL_LIST } from "../game/skills.js";
import enSkills from "./enSkills.js";
import { RARITY_EN, RARE, EPIC } from "./enTerms.js";

const num = (x) => String(x);
const pct = (x) => Math.round(x * 100);
const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// Trimmbare Skills mit ihren ENGLISCHEN Namen — aus dem Register gefiltert, aus dem EN-Katalog benannt.
const TRIMMABLE_EN = SKILL_LIST.filter((s) => s.trimGrowth).map((s) => enSkills[`ability.${s.id}.name`]).join(", ");
const RARITY_NAMES_EN = RARITY_EN.join(" · ");
const BURST_AT = G_THRESHOLDS[G_THRESHOLDS.length - 1];

/* Kurzschreibweise: [id, label, text, [match…]] — kompakter als vier Schlüssel je Eintrag und
   damit leichter gegen die deutsche Quelle gegenzulesen. Wird unten aufgefaltet. */
const E = [
  /* ---- Basics ---- */
  ["stich", "Trick", "A single card duel — your card against the opponent's; the higher combat value wins.", ["trick", "tricks"]],
  ["durchlauf", "Cycle", `All ${C.TRICKS_PER_CYCLE} cards of the deck played through once (${C.TRICKS_PER_CYCLE} tricks). Then the opponent reshuffles and a decision is due.`, ["cycle", "cycles", "deck cycle"]],
  ["aufstellung", "Order phase", "Between two cycles you rearrange your draw order — every swap costs order energy.", ["order phase", "draw order"]],
  ["streak", "Win streak (streak)", "Wins in a row. The streak multiplier and many skills grow with it; a loss resets it.", ["win streak", "streak", "streaks"]],
  ["wertvorsprung", "Margin", "The gap between your combat value and the opponent card's. For fire it is not whether you win that counts, but by how much: heat and fire score grow with the margin.", ["margin", "value gap"]],
  ["kampfwert", "Combat value", "A card's effective value in a trick: card value plus all trick-value bonuses. The higher one wins.", ["combat value"]],
  ["crit", "Crit", `Critical hit: the win counts with the crit multiplier (base ×${num(C.CRIT_BASE_MULT)}). Base crit is 0 — crit chance comes from the Precision families and from lightning skills. Every lightning skill also raises the crit multiplier by +${num(C.LIGHTNING_CRIT_MULT_PER_SKILL)}×.`, ["crit", "crits", "critical hit", "critical hits"]],
  ["gleichstand", "Tie", "Equal combat values in a trick — normally no win (no score).", ["tie", "ties"]],
  ["geist", "Ghost / record", "Your saved best run as a benchmark — its score flashes up every few tricks as a yardstick.", ["ghost", "record"]],
  ["reroll", "Reroll", `Rolls an offer completely anew. Three separate pools per run — perks · buildings · skills, not shared between each other, no resupply. The upgrade tree raises them; in a ranked run there are exactly ${C.BASE_REROLLS} per pool.`, ["reroll", "rerolls"]],
  ["serienpunkt", "Streak point", "The counting unit of the win streak: every win in a row is one streak point. Effects that pay “per streak point” therefore scale with the length of your current streak.", ["streak point", "streak points"]],
  ["farbserie", "Suit streak", "Consecutive wins in the same card suit. A change of suit or a loss resets it. Plant-green cards count as Green here. Feeds the perk Monochrome and the family Suit Rush, among others.", ["suit streak", "suit streaks"]],
  ["direktscore", "Direct score", "Score that counts directly — without passing through streak, crit or formation multipliers. Flat and immediate, often strong early.", ["direct score"]],

  /* ---- Deck & cards ---- */
  ["deck", "Deck", `${C.TRICKS_PER_CYCLE} cards = 4 suits × values 1–10. Your deck can be changed by perks and the Architect; the opponent reshuffles every cycle.`, ["deck", "decks"]],
  ["farbe", "Suit", "Red, Blue, Green, Yellow. Mainly relevant for suit-block formations.", ["suit", "suits"]],
  ["kartenwert", "Card value", "A card's lasting base value — permanently changeable through perks, forging, layering or the Architect.", ["card value", "card values"]],
  ["stichwert", "Trick value", "A value bonus for the current trick only (it lapses afterwards). Together with the card value it makes the combat value.", ["trick value", "temporary value"]],
  ["ziehreihenfolge", "Draw order", "The fixed order in which your cards are played — stays stable across cycles (only the opponent shuffles).", ["draw order", "card order"]],
  ["position", "Position", `A card's fixed slot in the draw order (1–${C.TRICKS_PER_CYCLE}). Many perks, anchors and buildings hang on the position, not on the card — whoever sits there gets the effect. Not to be confused with the trick counter, which only says how far the cycle has come.`, ["position", "positions", "segment position", "segment positions"]],
  ["segment", "Segment", "A block of 5 positions. Base formations are segment-bound — a run ends at every segment boundary.", ["segment", "segments", "segment boundary", "segment boundaries"]],

  /* ---- Formations ---- */
  ["formation", "Formation", "A recognised pattern of neighbouring cards in your draw order (repeat, stair, suit block, zigzag). A win inside a formation counts with a formation factor. Not to be confused with ice formations, which are made of glaciers on the board.", ["formation", "formations"]],
  ["wiederholung", "Repeat", "2 or more equal values next to each other. 2nd card ×1.25, 3rd ×1.50, 4th ×1.80, then +0.40 each.", ["repeat", "repeats"]],
  ["farbblock", "Suit block", "3 or more cards of the same suit. From the 3rd ×1.35, +0.20 for each further one.", ["suit block", "suit blocks"]],
  ["treppe", "Stair", "3 or more strictly rising values (step of 4 or less). From the 3rd ×1.35, +0.20 for each further one.", ["stair", "stairs"]],
  ["wechsel", "Zigzag", "3 or more in a zigzag (neighbour difference of 4 or more). From the 3rd ×1.40, +0.20 for each further one.", ["zigzag", "zigzags"]],
  ["anker", "Anchor", "A single position counts as an active formation (factor depends on the source). Comes from the anchor families or from the Architect building Foundation Stone. At most one anchor per position. From tier III, Foundation Stone also puts trick value on every anchor cell.", ["anchor", "anchors", "anchor cell", "anchor cells"]],
  ["ueberlappung", "Overlap", "If a card sits in several formations, its factor is multiplied on top: 2 → ×1.5 · 3 → ×2 · 4 → ×3.", ["overlap", "overlaps"]],
  ["nachhall", "Echo", "When a formation ends, its formation factor carries over once more to the very next card — the bonus lingers.", ["echo"]],
  ["formationskern", "Formation core", "A formation type of your choosing gets an extra factor on all of its active formations.", ["formation core"]],
  ["grenzbonus", "Crossover bonus", "If a formation runs across a segment boundary, its cards give ×1.25 score on top. Comes from the perk Segment Work (tier IV).", ["crossover bonus"]],
  ["farballianz", "Suit alliance", "Suits you have linked count as the same suit for suit blocks.", ["suit alliance", "alliance"]],
  ["farbtransparenz", "Suit-block transparency", "A card marked this way does not interrupt a suit block: the block runs straight over it as if it were not there (it does not count towards the block itself). Comes from the Architect building Arcade.", ["suit-block transparency"]],
  ["joker", "Wild", "A card may take on the value or suit required by the recognition. On its own it forms no formation.", ["wild", "wilds"]],
  ["bindeglied", "Link", "A card may differ in value for a stair. Perk family Link: I/II ±1 · III by 1 or 2 · IV any value between its neighbours. Architect building Cloister: ±1, from tier III ±2.", ["link", "links"]],
  ["formenergie", "Order energy", `The swap budget of the order phase (${C.FORMATION_ENERGY} per phase). Every swap of two cards costs 1.`, ["order energy", "swap", "swaps"]],

  /* ---- Archetypes ---- */
  ["archetyp", "Archetype", `A skill family with its own identity (Fire · Lightning · Ice · Plant). The first skill unlocks it; up to ${C.MAX_ARCHETYPES} can be mixed.`, ["archetype", "archetypes"]],
  ["skillslot", "Skill slot", `You hold at most ${C.SKILL_SLOTS} skills at a time. Once the pool is full, a new skill replaces an old one. The legendary skill from the legendary phase takes an extra, fixed slot.`, ["skill slot", "skill slots", "slots"]],
  ["skillrunde", "Skill cycle", `At fixed points in the run (first in cycle ${C.FIRST_SKILL_CYCLE}) you pick skills instead of a perk — ${C.SKILLS_OFFERED} skills on offer, all 4 archetypes among them.`, ["skill cycle", "skill cycles"]],
  ["consume", "Consumer", "A skill that spends an accumulated resource for a strong effect — fire burns heat, lightning spends charge. Several fire consumers work at once; of the lightning consumers only ever one, and a new one replaces the old.", ["consumer", "consumers", "heat consumer"]],
  ["legskill", "Legendary skill", `A rare, especially powerful skill tier (marked with ★). Legendary skills come exclusively from the legendary phase (cycle ${C.LEG_PHASE_CYCLE}) — which archetypes appear there is decided by the upgrade tree.`, ["legendary skill", "legendary skills"]],
  ["ueberlauf", "Overflow", `What a card accumulates beyond what its normal use can absorb — growth above the value cap of ${C.PLANT_VALUE_CAP}, heat above 100% — which would otherwise be wasted. Fire (white heat) pays a small generic direct score from it; the legendaries (World Tree/Mother Tree) convert the large remainder.`, ["overflow", "overflow growth"]],
  ["bekenntnis", "Commitment", "How far you have committed to an archetype: the share of your skill slots its skills occupy. Many effects — legendaries above all — pay proportionally to it, in full only on a pure deck.", ["commitment", "lightning commitment", "fire commitment"]],
  ["heat", "Heat", `Wins with a clear margin heat up the heat bar (0–100%) and give fire score = (margin − ${C.FIRE_MARGIN_OFFSET}) × ${C.FIRE_SCORE_BASE} (+${C.FIRE_SCORE_PER_SKILL} per further fire skill). A large margin keeps paying without a cap — with diminishing gains; clear losses cool you down.`, ["heat", "heat bar"]],
  ["glutdividende", "Ember dividend", "Extra score on every fire win that counts directly (without passing through streak, crit or formation). The more heat you hold, the more — up to a cap. Strong early.", ["ember dividend"]],
  ["brand", "Brand", `A branded opponent card loses value; every brand gives +${C.BRAND_ASH} ash — the raw material of the fire forge.`, ["brand", "brands", "branded"]],
  ["ash", "Ash", `Raw material of the fire forge: brands give +${C.BRAND_ASH} ash. The Ash Forge consumes ${C.FORGE_COST} ash per forging (+${C.FORGE_VALUE} card value); once the forge is full, remaining ash burns off as ash glow into score.`, ["ash"]],
  ["whiteheat", "White heat", `The heat overflow: once the heat bar is full, every further heat gain turns into score immediately (+${C.WHITEHEAT_PER_POINT} score per overflowing heat point). Requires the skill White Heat.`, ["white heat"]],
  ["ashglow", "Ash glow", `The ash overflow: once the forge capacity is full, remaining ash is burnt into score at the end of the cycle (+${grp(C.FORGE_OVERFLOW_SCORE)} score per ${C.FORGE_COST} ash) — ash is thus fully spent every cycle, no dead pile left over.`, ["ash glow"]],
  ["forge", "Forging", `Ash becomes permanent card value (Ash Forge: ${C.FORGE_COST} ash → +${C.FORGE_VALUE} value on the lowest card).`, ["forging", "forged", "forge", "ash forge"]],
  ["charge", "Charge", `Crits generate charge (max ${C.LIGHTNING_MAX_CHARGE}). At full charge, lightning consumers trigger their effect and spend it.`, ["charge", "charges"]],
  ["ionize", "Ionization", `A permanent card marking: an ionized card gives +${C.ION_SCORE_PER_STACK} score per stack on a win and then gains +1 stack (max ${C.ION_MAX_STACKS}). On top of that the ionized field charges the air: every ionization stack in the deck raises the crit chance of EVERY winning card by +${pct(C.ION_CRIT_PP_PER_STACK)}% (field-wide, up to +${pct(C.ION_CRIT_STACK_CAP * C.ION_CRIT_PP_PER_STACK)}%). How many cards ionize per charge consumption grows with the archetype: +${C.ION_SPEED_PER_SKILL} per lightning skill beyond ${C.ION_SPEED_MIN_SKILLS}.`, ["ionization", "ionized", "ionize"]],
  ["stapel", "Stack (ionization)", `One ionization charge on a single card (at most ${C.ION_MAX_STACKS} per card). Every stack gives +${C.ION_SCORE_PER_STACK} score when that card wins and additionally raises the crit chance field-wide (see ionization). A card with ${C.ION_MAX_STACKS} stacks is fully ionized and unlocks special effects (Short Circuit and Breakdown among them).`, ["ionization stack", "ionization stacks", "stack", "stacks"]],
  ["kaskade", "Cascade", "One event sets off the next. With lightning: a crit on or next to an ionized card generates extra charge. With ice: a bursting glacier drags its neighbours along, so a wave of bursts runs through the cluster.", ["cascade", "cascades"]],
  ["glacier", "Glacier", "Ice is the glacier archetype: you freeze a card onto its board cell — from then on it is rigid (no longer movable in any future order phase), but in exchange it accumulates mass. Enough mass, and the glacier bursts over its neighbours.", ["glacier", "glaciers"]],
  ["masse", "Mass", `The ice resource: mass sits on the board cell. Every glacier gains +${num(G_EWIGER_FROST)} mass every cycle — unconditionally, win or loss; a win brings +${num(G_WIN_MASS)} mass on top.`, ["mass"]],
  ["bersten", "Burst", `When a glacier reaches ${BURST_AT} mass, it bursts: burst score from mass × the force of the threshold reached (thresholds ${G_THRESHOLDS.join(" / ")}), amplified by +${pct(G_KASKADE)}% per adjacent glacier, plus a collision when the burst hits a glacier neighbour. Afterwards it drops to 0 and refills from its firn reserve at the start of the cycle.`, ["burst", "bursts", "bursting", "burst score", "burst threshold"]],
  ["cluster", "Cluster", "A group of directly adjacent glaciers. Many ice skills measure the cluster size (Fusion and Interlock for instance); Ice Bridge counts the diagonals too.", ["cluster", "clusters"]],
  ["eisformation", "Ice formations", `Ice is the only deck with ice formations: geometric shapes of frozen glaciers strengthen their bursts — block = 2×2 (4 glaciers, ×${num(G_BLOCK)}), cross = centre + 4 neighbours (5, ×${num(G_KREUZ)}), line = full row (5) or column (8) (×${num(G_LINIE)}), great field = 3×3 (9, ×${num(G_FLAECHE)}). Overlapping shapes stack.`, ["ice formations", "ice formation"]],
  ["freeze", "Firn ground", `Firn sits as a reserve on the board cell (firn ground), separate from the glacier's mass. Freeze a glacier onto a charged cell and the accumulated firn becomes its reserve; the glacier starts empty and draws from it every cycle back up to a full ${BURST_AT} mass (only the difference, never beyond), until the reserve is empty. Open ground is charged by Permafrost, Snowdrift and Ice Age — never under a glacier.`, ["firn ground", "firn", "firn reserve"]],
  ["growth", "Growth", `Your own cards grow on wins (rising only) — the faster the more plant skills you hold (full pace from ${C.PLANT_GROWTH_SKILL_REF} skills, proportional below that). From ${C.PLANT_GREEN_THRESHOLD} growth a card turns permanently green (ripe); below that it is a seedling.`, ["growth"]],
  ["setzling", "Seedling", `A card that is already growing but not yet ripe (growth below ${C.PLANT_GREEN_THRESHOLD}). A seedling does NOT yet count towards the green suit block — only from ${C.PLANT_GREEN_THRESHOLD} growth does it turn green (ripe). Seedbed gives the lowest card of each segment a +${C.SETZLINGSBEET_GROWTH} growth head start.`, ["seedling", "seedlings"]],
  ["green", "Green (ripe)", "Green cards are permanent and form one shared suit block — the bigger the block, the more score. The suit-block multiplier for green cards is capped at ×1.35.", ["green", "ripe"]],
  ["wurzeln", "Roots", `As long as you hold only plant skills, green wins make the card more valuable: +1 card value per ${C.WURZELSCHLAG_PER_GROWTH} growth (up to ${C.PLANT_VALUE_CAP}), and from ${C.WURZELSCHLAG_LOSS_MIN_SKILLS} skills also on every ${C.WURZELSCHLAG_LOSS_EVERY}nd loss. The growth is kept and keeps counting for root score and the legendaries.`, ["roots", "root score"]],
  ["bluete", "Bloom", `A green payoff: when a green card with green neighbours wins, it gives +${C.BLUETE_SCORE} bloom score per green card in the segment (Blooming Season ×${C.BLUETEZEIT_MULT} inside a formation, Overgrowth ×2 again).`, ["bloom", "bloom score", "blooming season"]],
  ["trimmen", "Pruning", `The turning point from growing to harvesting: replace a growth skill (${TRIMMABLE_EN}) and it counts as a pruning → permanently +${pct(C.TRIM_STEP)}% root and bloom score, rising with every further pruning (up to +${pct(C.TRIM_CAP)}%). The growth skills do not die that way, they refine the harvest.`, ["pruning", "prunings", "pruned"]],
  ["colonize", "Colonize / runner", "Marks opponent cards green (Runners/Rhizome). Beat a colonized card and you harvest growth.", ["colonize", "colonized", "runner", "runners"]],
  ["overgrowth", "Overgrowth", `Once the field is ${Math.round(C.UEBERWUCHERUNG_FIELD * 100)}% green or more, all suit blocks get stronger (+${num(C.UEBERWUCHERUNG_FACTOR)} factor) and bloom counts double.`, ["overgrowth"]],
  ["eternalSpring", "Eternal Spring", `Suit block counts green from ${C.EWIGER_FRUEHLING_FARBBLOCK} cards already, and overgrowth from ${Math.round(C.EWIGER_FRUEHLING_FIELD * 100)}% of the field. The bigger your evergreen field, the more score every green win pays directly.`, ["Eternal Spring"]],

  /* ---- Precision ---- */
  ["praez_intro", "Precision", "Crit as a perk category. Base crit is 0 — for non-lightning builds, crit chance and crit damage come from the five RNG-gated Precision families (no legendary). Lightning remains the reliable, self-generating crit archetype; Precision is additive on top.", ["Precision"]],
  ["praez_sharp", "Sharpness", `Flat +crit chance on all cards (${pct(C.PRECISION_SHARP_PP[0])}/${pct(C.PRECISION_SHARP_PP[1])}/${pct(C.PRECISION_SHARP_PP[2])}/${pct(C.PRECISION_SHARP_PP[3])}% per tier). The basic crit engine.`, ["Sharpness", "crit chance"]],
  ["praez_force", "Force", `+crit multiplier on a base of ${num(C.CRIT_BASE_MULT)}× (+${num(C.PRECISION_FORCE_MULT[0])}/${num(C.PRECISION_FORCE_MULT[1])}/${num(C.PRECISION_FORCE_MULT[2])}/${num(C.PRECISION_FORCE_MULT[3])}× per tier).`, ["Force", "crit multiplier"]],
  ["praez_aim", "Accuracy", `+${pct(C.PRECISION_AIM_PP)}% crit chance on high cards; the threshold widens per tier (value ≥ ${C.PRECISION_AIM_THRESH[0]}/${C.PRECISION_AIM_THRESH[1]}/${C.PRECISION_AIM_THRESH[2]}/${C.PRECISION_AIM_THRESH[3]}).`, ["Accuracy"]],
  ["praez_lens", "Burning glass", `+crit chance per simultaneous formation beyond the first at the winning position (${pct(C.PRECISION_LENS_PP[0])}/${pct(C.PRECISION_LENS_PP[1])}/${pct(C.PRECISION_LENS_PP[2])}/${pct(C.PRECISION_LENS_PP[3])}% per formation, max ${C.PRECISION_LENS_CAP} extra). Rewards formation depth.`, ["Burning glass"]],
  ["praez_color", "Suit focus", `Choose a suit → +crit chance on that suit (${pct(C.PRECISION_COLOR_PP[0])}/${pct(C.PRECISION_COLOR_PP[1])}/${pct(C.PRECISION_COLOR_PP[2])}%); tier IV instead gives a SECOND suit of your choosing (both +${pct(C.PRECISION_COLOR_PP[3])}%).`, ["Suit focus"]],

  /* ---- Perks & rarity ---- */
  ["perk", "Perk", "A choosable, permanent effect. Every perk can be chosen only once per run.", ["perk", "perks"]],
  ["familie", "Family", "A perk or building as an upgradeable unit with up to four tiers (I–IV). You upgrade it tier by tier.", ["family", "families"]],
  ["stufe", "Tier I–IV", "The rank of a family. Higher tiers are stronger and offered more rarely; tier IV completes the family.", ["tier", "tiers"]],
  ["raritaet", "Rarity", `${RARITY_NAMES_EN} — the four family tiers, colour-coded.`, ["rarity", "rarities"]],
  ["legendaer", "Legendary", "A powerful effect with a drawback, outside the tier system — its own roll, golden frame, at most one per offer.", ["legendary", "legendaries"]],
  ["upgradetyp", "Upgrade types", "How a family behaves when upgraded: replacement (only the highest tier counts) · cumulative (every tier applies once) · role (the target keeps its role, the numbers rise).", ["replacement", "cumulative"]],
  ["kategorien", "Categories A–E", "The five perk kinds: A Deck · B Trick · C Role · D Score · E Form (formation tools).", ["categories"]],
  ["opfergabe", "Sacrifice", "A chosen card permanently loses value, the card right after it gains it.", ["Sacrifice"]],

  /* ---- The Architect ---- */
  ["bauphase", "Build phase / the Architect", "The Architect replaces the shop: instead of buying, you lay geometric buildings onto the card board as an overlay. No money, no coins.", ["build phase", "Architect"]],
  ["brett", "Board (8×5)", `Your ${C.TRICKS_PER_CYCLE} deck positions as 8 rows × 5 columns. Formations still run along the 1D order.`, ["board"]],
  ["polyomino", "Polyomino / shape", "The cell shape of a building (Tetris-like), placeable in several rotations.", ["polyomino", "polyominoes"]],
  ["bauplan", "Blueprint", "An offer entry from which you erect a building. 3 blueprints per build phase.", ["blueprint", "blueprints"]],
  ["gebaeude", "Building", "A placed building. It buffs the card sitting on its position in the trick — never overlaps with others.", ["building", "buildings"]],
  ["baufeld", "Build space (cap)", "The limited number of board cells you may occupy. The scarcity makes placement a decision (the upgrade tree and the perk Masons' Lodge raise the cap).", ["build space"]],
  ["baukat", "Build categories", "Three kinds of effect: value (structural, +trick value) · score (commercial, +score) · formation (sacral, bends the recognition).", ["build categories"]],
  ["struktur", "Structure", "A fully built row, column or diagonal (a completed structure) gives a multiplier; they stack multiplicatively. Some buildings (Warehouse District, Observatory) additionally pay per completed structure. Together with the district factors this makes the building boost the build phase shows at the top.", ["structure bonuses", "completed structure", "completed structures", "structure", "structures"]],
  ["distrikt", "Adjacent building / district", "A building that borders another orthogonally. District blueprints (Guild Quarter, Marketplace for instance) pay per adjacent building, up to a cap — they reward dense building.", ["adjacent building", "adjacent buildings", "district", "districts"]],
  ["staffel", "Relay", "A building passes its score on to the neighbouring cell — the effect lands offset, not on its own cell (Gallery Walk, Lighthouse for instance).", ["relay", "relays"]],
  ["lage", "Placement", "Some buildings only work in the early or only in the late segments of the board — placement decides (Rampart Walk, Outwork for instance).", ["placement"]],
  ["critwette", "Crit bet", "A bet on the crit: a win with a crit pays the jackpot, a win without one costs a deduction (never below 0). Upgrading raises only the jackpot, not the deduction (Raffle Booth, Casino for instance).", ["crit bet", "bet", "bets", "jackpot"]],
  ["kicker", "Tier kicker", "Some buildings unlock an additional effect when upgraded past a certain tier — not just a bigger number.", ["tier kicker", "kicker"]],
  ["abgedecktezelle", "Covered cell", "A board cell that lies under a placed building. Dense Development pays score per covered cell; Keystone gives its role card trick value as long as it lies under a building.", ["covered cell", "covered cells", "under a building"]],
  ["aufruesten", "Upgrade", "Raise an existing building by +1 tier instead of building anew (legendaries have no tiers).", ["upgrade", "upgrading"]],
  ["versetzen", "Move", "Shift or rotate an existing building on the board (its own phase after building).", ["move", "moving"]],

  /* ---- Progress & meta ---- */
  ["stichpunkte", "Trick Points (TP)", "The currency of the upgrade tree. You earn it across runs and spend it on nodes that permanently strengthen your future runs.", ["Trick Point", "Trick Points", "TP"]],
  ["deckpunkte", "Deck Points (DP)", "The currency of the deck workshop — purely cosmetic. You buy card and battlefield packs and effects with it; it does not affect gameplay.", ["Deck Point", "Deck Points", "DP"]],
  ["upgradebaum", "Upgrade tree", "The cross-run progression: for Trick Points you buy nodes that unlock new archetypes, higher rarities, more build space, more order energy, better drop rates and the legendary phases. In a ranked run it has no effect.", ["upgrade tree", "upgrades"]],
  ["rankedrun", "Ranked run", "The weekly competitive mode: everyone plays the same seed under the same tree-independent baseline. Only finished runs count; at the weekend first place moves into the challenger archive.", ["ranked run", "ranked runs", "weekly ranking"]],
  ["weekmod", "Weekly modifier", "Three to five rule changes, rolled anew every week and the same for everyone (at least two positive, at least one negative). They hang on the weekly seed, not on your profile.", ["weekly modifier", "weekly modifiers", "modifier", "modifiers"]],
  ["chronik", "Chronicle", `A read-only overview of all ${C.TRICKS_PER_CYCLE} cards of the run in their current order, with formation, role and anchor markers.`, ["chronicle"]],
  ["bestenliste", "Leaderboard", "Your local runs plus the global ranking.", ["leaderboard"]],
  ["challenger", "Challenger / seed", "Share a run through its seed (a short code); others replay exactly the same cards and compare scores.", ["challenger", "seed", "replay"]],
  ["statshub", "Statistics hub", "Aggregated statistics of your runs: best score, average score, best streak, archetype usage and more.", ["statistics hub", "statistics"]],
  ["scoreherkunft", "Score sources", "How your score splits across formations / crits / the rest — shows where your build draws its score from.", ["score sources"]],
  ["kosmetik", "Cosmetics / deck", "Purely cosmetic unlocks (card backs, battlefield skins) with no gameplay effect — rank decks for instance.", ["cosmetics"]],
];

const out = {
  /* ---- Categories (overlay headings) ---- */
  "glossary.cat.grund": "Basics",
  "glossary.cat.deck": "Deck & cards",
  "glossary.cat.form": "Formations",
  "glossary.cat.frak": "Archetypes",
  "glossary.cat.praez": "Precision · crit",
  "glossary.cat.perk": "Perks & rarity",
  "glossary.cat.arch": "The Architect",
  "glossary.cat.meta": "Progress & meta",

  /* ---- Category one-liners (desktop page head) ---- */
  "glossary.cathint.grund": "Trick, streak, battle value — the vocabulary of every run.",
  "glossary.cathint.deck": "What your deck is made of and how it is read.",
  "glossary.cathint.form": "Patterns in the card order and what they pay.",
  "glossary.cathint.frak": "The four resources — grouped by faction.",
  "glossary.cathint.praez": "Where crit chance and crit multiplier come from.",
  "glossary.cathint.perk": "Families, tiers, rarities, legendaries.",
  "glossary.cathint.arch": "Build phase, board, buildings, structure.",
  "glossary.cathint.meta": "What counts beyond the single run.",

  /* ---- Groups (archetype sub-headings) ---- */
  "glossary.group.gen": "General",
  "glossary.group.fire": "Fire",
  "glossary.group.lightning": "Lightning",
  "glossary.group.ice": "Ice",
  "glossary.group.plant": "Plant",
};

for (const [id, label, text, match] of E) {
  out[`glossary.${id}.label`] = label;
  out[`glossary.${id}.text`] = text;
  out[`glossary.${id}.match`] = match.join("|");
}

export default out;
export { RARE, EPIC };
