/* ============================================================
   PERK FAMILY CATALOG — ENGLISH. 73 families × (name + up to 4 tier descriptions).

   Structure mirrors src/game/families.js, including its two labour-savers — that is the point:
   the same 22 families that share ONE German sentence share ONE English sentence here
   (MUSTER_EN), and the five Precision families are generated from the same constants. Translating
   the 292 rendered strings one by one would have created 292 places to keep in sync instead of
   the ~120 the German source actually has.

   Numbers are never typed out where the German interpolates them (Precision families,
   D_OVERCRIT) — same expressions, same constants. See enSkills.js for the reasoning.

   Terminology (§3): trick value · card value · score · streak · suit · segment · position ·
   formation · repeat · suit block · stair · zigzag · anchor · echo · core · crossover bonus ·
   structure · building · covered cell · crit chance / crit multiplier.
   ============================================================ */
import * as C from "../game/constants.js";

const ppE = (x) => Math.round(x * 100);            // percentage points as a whole number
const numE = (x) => String(x);                     // English decimal point

/* ---- Family names ---- */
const NAMES = {
  // D · Score
  D_FORMATION_BONUS: "Score Bonus",
  D_STREAK: "Win Streak",
  D_HIGH: "High Cards, High Reward",
  D_UNDERDOG: "Underdog Win",
  D_TENTH_WIN: "Raid",
  D_CRIT_SCORE: "Crit Score",
  D_SHARP_EYE: "Sharp Eye",
  D_RHYTHM: "Rhythm",
  D_OVERPOWER: "Overpower",
  D_CRIT_HARVEST: "Crit Harvest",
  D_CRIT_MOMENTUM: "Critical Momentum",
  D_PRECISION: "Unison",
  D_INTERPLAY: "Interplay",
  D_CRIT_FOLLOW: "Crit Follow-Up",
  D_MISFIRE: "Misfire",
  D_WEAKNESS: "Weakness Analysis",
  D_SUIT_STREAK: "Suit Rush",
  D_FULL_HOUSE: "Full House",
  D_OVERCRIT: "Surplus Crit",
  D_BEBAUUNG: "Dense Development",
  // B · Trick
  B_COUNTER: "Counter",
  B_MOMENTUM: "Momentum",
  B_OPENING: "Opening",
  B_FINALE: "Finale",
  B_BREAKTHROUGH: "Breakthrough",
  B_TENTH_STRIKE: "Milestone",
  B_INITIATIVE: "Initiative",
  B_TIGHT: "Close Call",
  B_REVENGE: "Revenge",
  B_PERFECT: "Perfect Run",
  B_SUPERIOR: "Superiority",
  // A · Deck
  A_WEAK_STRONG: "Weak Made Strong",
  A_HIGH_STRONG: "Strong Made Stronger",
  A_TOP: "Top Cards",
  A_BOTTOM: "Bottom Cards",
  A_EVEN: "Even Strength",
  A_ODD: "Odd Strength",
  A_SUIT_BOOST: "Suit Boost",
  A_SMALL_BIG: "Small but Mighty",
  A_MIDRANGE: "Midrange",
  A_SUIT_DUEL: "Suit Duel",
  A_CONDENSE: "Condensation",
  // C · Role
  C_VANGUARD: "Vanguard",
  C_TRIUMPH: "Triumph",
  C_GUARD: "Bodyguard",
  C_RELAY: "Relay Runner",
  C_LEADER: "Leader",
  C_FINISHER: "Finisher",
  C_ECKPFEILER: "Cornerstone",
  C_ECKSTEIN: "Keystone",
  C_SURVIVOR: "Survivor's Edge",
  C_JOKER: "Wild",
  C_SACRIFICE: "Sacrifice",
  C_BRIDGE: "Link",
  // E · Form
  E_TUNING: "Tuning",
  E_PACE: "Pacemaker",
  E_COLORBRIDGE: "Suit Bridge",
  E_GENTLE: "Gentle Slope",
  E_BIGSTEP: "Big Step",
  E_PENDULUM: "Pendulum",
  E_RPM: "Revolutions",
  E_LOSS: "Loss of Control",
  E_QUICKSHOT: "Quick Shot",
  E_SEGMENT: "Segment Work",
  E_STRONG_REP: "Reinforced Repeat",
  E_AFTERGLOW: "Afterglow",
  E_COLOR_ALLIANCE: "Suit Alliance",
  E_CORE: "Formation Core",
  // P · Precision
  P_SHARPNESS: "Sharpness",
  P_FORCE: "Force",
  P_AIM: "Accuracy",
  P_LENS: "Burning Glass",
  P_COLORFOCUS: "Suit Focus",
};

/* ---- Pattern descriptions ----
   Same 22 families as MUSTER_DESC in families.js, same $0/$1 placeholders, same tier order.
   Keeping the shape identical means a change over there is obvious over here. */
const MUSTER_EN = {
  A_WEAK_STRONG: { tpl: "All original $0: permanently +$1 card value.", vals: [["5s", "1"], ["4s", "2"], ["3s", "3"], ["1s and 2s", "4"]] },
  A_HIGH_STRONG: { tpl: "All original $0: permanently +$1 card value.", vals: [["6s", "1"], ["7s", "2"], ["8s", "3"], ["9s and 10s", "4"]] },
  A_TOP: { tpl: "The $0 currently highest cards: permanently +$1 card value each.", vals: [["two", "2"], ["three", "3"], ["four", "4"], ["five", "5"]] },
  A_BOTTOM: { tpl: "The $0 currently lowest cards: permanently +$1 card value each.", vals: [["two", "3"], ["three", "4"], ["four", "5"], ["five", "6"]] },
  B_COUNTER: { tpl: "After a loss: next card +$0 trick value.", vals: [["3"], ["5"], ["7"], ["10"]] },
  B_MOMENTUM: { tpl: "After exactly $0 wins in a row: next card +$1 trick value.", vals: [["4", "4"], ["3", "5"], ["3", "7"], ["3", "10"]] },
  B_OPENING: { tpl: "The first $0 cards of every cycle: +$1 trick value each.", vals: [["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]] },
  B_FINALE: { tpl: "The last $0 cards of every cycle: +$1 trick value each.", vals: [["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]] },
  B_BREAKTHROUGH: { tpl: "After $0 tricks without a win: next card +$1 trick value.", vals: [["6", "7"], ["5", "10"], ["4", "12"], ["3", "15"]] },
  C_VANGUARD: { tpl: "Choose $0: +$2 trick value on position $1.", vals: [["1 card", "1–5", "2"], ["2 cards", "1–5", "3"], ["3 cards", "1–5", "4"], ["4 cards", "1–10", "4"]] },
  C_TRIUMPH: { tpl: "Choose $0: after a win, +$1 trick value the next time it comes up.", vals: [["1 card", "2"], ["2 cards", "2"], ["3 cards", "3"], ["4 cards", "4"]] },
  D_FORMATION_BONUS: { tpl: "Win with 1 or more active formations: +$0 score.", vals: [["50"], ["100"], ["175"], ["300"]] },
  D_STREAK: { tpl: "Every win: +$0 score per streak point (max +$1).", vals: [["15", "150"], ["25", "250"], ["35", "420"], ["50", "750"]] },
  D_HIGH: { tpl: "Win with card value $0 or more: +$1 score.", vals: [["9", "100"], ["8", "150"], ["7", "225"], ["6", "350"]] },
  D_UNDERDOG: { tpl: "Win with card value $0 or less: +$1 score.", vals: [["2", "250"], ["3", "350"], ["4", "500"], ["5", "750"]] },
  D_TENTH_WIN: { tpl: "Every $0th win of the run: +$1 score.", vals: [["12", "600"], ["10", "800"], ["8", "900"], ["5", "1,000"]] },
  D_CRIT_SCORE: { tpl: "Every crit: +$0 score.", vals: [["100"], ["175"], ["275"], ["450"]] },
  D_SHARP_EYE: { tpl: "Crit with card value $0 or more: +$1 score.", vals: [["9", "225"], ["8", "350"], ["7", "500"], ["6", "750"]] },
  D_RHYTHM: { tpl: "In rhythm: every $0th win gives +$1 score.", vals: [["7", "250"], ["5", "350"], ["4", "450"], ["3", "600"]] },
  D_OVERPOWER: { tpl: "Win with a margin of $0 or more: +$1 score.", vals: [["10", "300"], ["8", "400"], ["6", "550"], ["4", "750"]] },
  D_CRIT_HARVEST: { tpl: "Crit in 1 or more active formations: +$0 score.", vals: [["175"], ["300"], ["475"], ["750"]] },
  E_TUNING: { tpl: "$0: +$1 energy.", vals: [["Every second order phase", "1"], ["Every order phase", "1"], ["Every order phase", "2"], ["Every order phase", "3"]] },
};

/* ---- Individually written tier descriptions ---- */
const DESCS = {
  D_CRIT_MOMENTUM: [
    "Every crit on a streak of 3 or more: +150 score.",
    "Every crit on a streak of 2 or more: +250 score.",
    "Every crit on a streak: +350 score.",
    "Every crit on a streak: +500 score; the streak also rises by 1.",
  ],
  D_PRECISION: [
    "Two wins in a row with the same card value: +250 score on the second.",
    "Two wins in a row with the same card value: +450 score on the second.",
    "Two wins in a row with the same value or 1 apart: +550 score on the second.",
    "Two wins in a row with the same value or 1 apart: +800 score; the chain keeps running (every matching follow-up win pays).",
  ],
  D_INTERPLAY: [
    "Win directly after a loss: +150 score.",
    "Win directly after a loss: +275 score.",
    "Win directly after a loss: +450 score.",
    "Win directly after a loss: +700 score; the next loss gives +200 stored score.",
  ],
  D_CRIT_FOLLOW: [
    "Win directly after a crit: +150 score.",
    "Win directly after a crit: +275 score.",
    "Win directly after a crit: +450 score.",
    "Win directly after a crit: +700 score; if that follow-up win is itself a crit, +300 more.",
  ],
  D_MISFIRE: [
    "Every win without a crit charges +20 score for the next crit (max +200).",
    "Every win without a crit charges +35 score for the next crit (max +350).",
    "Every win without a crit charges +50 score for the next crit (max +500).",
    "Every win without a crit charges +75 score (max +750); after a crit, 25% of the charge remains.",
  ],
  D_WEAKNESS: [
    "After a loss by 7 value or more: next win +250 score.",
    "After a loss by 5 value or more: next win +350 score.",
    "After a loss by 4 value or more: next win +500 score.",
    "After any loss: next win +600 score; by 5 value or more, +900.",
  ],
  D_SUIT_STREAK: [
    "Wins in a row in the same suit: +75 more score each (max +300).",
    "Wins in a row in the same suit: +100 more score each (max +500).",
    "Wins in a row in the same suit: +150 more score each (max +750).",
    "Wins in a row in the same suit: +200 more score each (max +1,200); a change of suit halves the suit streak instead of resetting it.",
  ],
  D_FULL_HOUSE: [
    "Five wins in one segment: +500 score on the fifth.",
    "Four wins in one segment: +650 score on the fourth.",
    "Four wins in one segment: +900 score on the fourth.",
    "Three wins in one segment: +1,000 score on the third; the fifth win gives +1,000 score on top.",
  ],
  D_OVERCRIT: [
    "Crit above 110% effective crit chance: +200 score.",
    "Crit above 100% effective crit chance: +300 score.",
    "Every surplus crit (above 100%): +500 score.",
    `Every surplus crit: +500 score plus 5 per percentage point above 100% (at most ${C.OVERCRIT_EXCESS_PP_CAP} percentage points counted).`,
  ],
  D_BEBAUUNG: [
    "Every win: +4 score per covered cell (max +100).",
    "Every win: +6 score per covered cell (max +160).",
    "Every win: +9 score per covered cell (max +240).",
    "Every win: +12 score per covered cell (max +360).",
  ],
  B_TENTH_STRIKE: [
    "Cards on positions 20 and 40: +6 trick value.",
    "Cards on positions 10, 20, 30 and 40: +6 trick value.",
    "Every fifth position (5, 10 … 40): +6 trick value.",
    "Every fifth position: +8 trick value.",
  ],
  B_INITIATIVE: [
    "After two losses you win the next tie.",
    "After a loss you win the next tie.",
    "After a loss: next card +1 trick value and wins the next tie.",
    "After a loss: next card +2 trick value and wins the next tie.",
  ],
  B_TIGHT: [
    "If the card sits in a repeat: +1 trick value.",
    "If the card sits in a repeat: +2 trick value.",
    "If the card sits in 1 or more formations: +2 trick value.",
    "If the card sits in 1 or more formations: +3 trick value.",
  ],
  B_REVENGE: [
    "After three losses in a row: next card +6 trick value.",
    "After two losses in a row: next card +7 trick value.",
    "After two losses in a row: the next two cards +6 trick value each.",
    "After any loss: next card +8 trick value.",
  ],
  B_PERFECT: [
    "Stair cards: +0/+0/+1, then +2 trick value.",
    "Stair cards: +1/+2/+3, then +4 trick value.",
    "Stair cards: +2/+3/+4, then +5 trick value.",
    "Stair cards: +3/+4/+5, then +6 trick value.",
  ],
  B_SUPERIOR: [
    "Card value 2 or more above the previous one: +2 trick value.",
    "Card value above the previous one: +3 trick value.",
    "Card value not below the previous one: +3 trick value.",
    "Card value above the previous one: +5 trick value; exactly equal: +2.",
  ],
  A_EVEN: [
    "Four random even cards: permanently +1 card value.",
    "All original 2s and 8s: permanently +1 card value.",
    "All original 4s and 6s: permanently +1 card value.",
    "All even cards: permanently +1 card value (on top of the tiers before).",
  ],
  A_ODD: [
    "Four random odd cards: permanently +1 card value.",
    "All original 3s and 7s: permanently +1 card value.",
    "All original 1s and 9s: permanently +1 card value.",
    "All odd cards: permanently +1 card value (on top of the tiers before).",
  ],
  A_SUIT_BOOST: [
    "One random suit: four random cards permanently +1 card value.",
    "One random suit: all its cards permanently +1 card value.",
    "Choose a suit: all its cards permanently +1 card value.",
    "Choose a suit: all its cards permanently +2 card value.",
  ],
  A_SMALL_BIG: [
    "Two random original 1s–3s: permanently +3 card value each.",
    "Three random original 1s–3s: permanently +4 card value each.",
    "Four random original 1s–3s: permanently +5 card value each.",
    "All original 1s–3s: permanently +3 card value each.",
  ],
  A_MIDRANGE: [
    "Three random cards currently at value 4–7: permanently +1 card value.",
    "Five random cards currently at value 4–7: permanently +1 card value.",
    "All cards currently at value 4–7: permanently +1 card value.",
    "All cards currently at value 3–8: permanently +1 card value.",
  ],
  A_SUIT_DUEL: [
    "One random suit permanently +1 card value, another one −1 card value.",
    "One random suit permanently +2 card value, another one −1 card value.",
    "Choose the winning suit (+3 card value); another random suit loses 1 card value.",
    "Choose the winning and the losing suit: +4 / −1 card value.",
  ],
  A_CONDENSE: [
    "Two random cards from value groups that occur more than once: permanently +1 card value.",
    "Four random cards from value groups that occur more than once: permanently +1 card value.",
    "All cards from value groups with 3 or more occurrences: permanently +1 card value.",
    "All cards from value groups that occur more than once: permanently +1 card value.",
  ],
  C_GUARD: [
    "Choose 1 card: if the card before it loses, +3 trick value.",
    "Choose 2 cards: if the card before them loses, +4 trick value.",
    "Choose 3 cards: if the card before them loses, +5 trick value.",
    "Choose 4 cards: if one of the two cards before them loses, +6 trick value.",
  ],
  C_RELAY: [
    "Choose 1 card: after it wins, the card right after it +2 trick value.",
    "Choose 2 cards: after they win, the card right after them +2 trick value.",
    "Choose 3 cards: after they win, the card right after them +3 trick value.",
    "Choose 4 cards: after they win, the next two cards +3 trick value each.",
  ],
  C_LEADER: [
    "Choose 1 card: after it wins, the next card +2 trick value.",
    "Choose 1 card: after it wins, the next two cards +2 trick value each.",
    "Choose 2 cards: after they win, the next two cards +3 trick value each.",
    "Choose 2 cards: after they win, the next three cards +4 trick value each.",
  ],
  C_FINISHER: [
    "Choose 1 card: +3 trick value on the last position of a segment.",
    "Choose 2 cards: +4 trick value on the last position of a segment.",
    "Choose 3 cards: +5 trick value on the last position of a segment.",
    "Choose 4 cards: +5 trick value on the last two positions of a segment.",
  ],
  C_ECKPFEILER: [
    "Choose 1 card: if it sits in 1 or more formations, +3 trick value.",
    "Choose 2 cards: in 1 or more formations, +4 trick value.",
    "Choose 3 cards: in 1 or more formations, +5 trick value.",
    "Choose 4 cards: in 1 or more formations +6; if the card sits in 2 or more formations, +9 trick value.",
  ],
  C_ECKSTEIN: [
    "Choose 1 card: if it sits in a building, +3 trick value.",
    "Choose 2 cards: in a building, +4 trick value.",
    "Choose 3 cards: in a building, +5 trick value.",
    "Choose 4 cards: in a building +6; in a completed structure +9 trick value.",
  ],
  C_SURVIVOR: [
    "The lowest card of the first four segments: +2 trick value.",
    "The lowest card of every segment: +2 trick value.",
    "The two lowest cards of every segment: +3 trick value.",
    "The two lowest cards of every segment: +5 trick value.",
  ],
  C_JOKER: [
    "Choose 1 card: counts for a suit block as the suit of the card before it.",
    "Choose 2 cards: count for a suit block as the suit of the card before them.",
    "Choose 3 cards: count for a suit block as the suit before or after them.",
    "Choose 4 cards: count for a suit block as any suit.",
  ],
  C_SACRIFICE: [
    "Choose 1 card: −2 card value permanently, the card right after it +3 card value.",
    "Choose 1 card: −2 card value permanently, the card right after it +4 card value.",
    "Choose 1 card: −3 card value permanently, the card right after it +6 card value.",
    "Choose 2 cards: −3 card value each permanently, the card right after each +7 card value.",
  ],
  C_BRIDGE: [
    "Choose 1 card: may count as ±1 value for a stair.",
    "Choose 2 cards: may count as ±1 value for a stair.",
    "Choose 3 cards: may differ by 1 or 2 for a stair.",
    "Choose 4 cards: may take any value between their neighbours for a stair.",
  ],
  E_PACE: [
    "Once per segment, a repeat may bridge one foreign card.",
    "Every repeat may bridge one foreign card.",
    "Every repeat may bridge up to two foreign cards.",
    "Foreign cards do not interrupt repeats (they do not count towards them).",
  ],
  E_COLORBRIDGE: [
    "Once per segment, a suit block may bridge one foreign suit.",
    "Every suit block may contain one foreign suit.",
    "Every suit block may contain two foreign suits.",
    "Foreign suits do not interrupt suit blocks (they do not count towards them).",
  ],
  E_GENTLE: [
    "Once per segment, a stair may contain one tie.",
    "Every stair may contain one tie.",
    "Every stair may contain two ties.",
    "Equal values count as one step in stairs when needed.",
  ],
  E_BIGSTEP: [
    "Once per segment, a stair may contain one step back.",
    "Every stair may contain one step back.",
    "Every stair may contain two steps back.",
    "Stairs may change direction.",
  ],
  E_PENDULUM: [
    "A zigzag needs a neighbour difference of only 3 (instead of 4); still from 3 cards.",
    "A zigzag needs only 2 cards (neighbour difference still 4 or more).",
    "A zigzag needs only 2 cards, and a neighbour difference of 3 is enough.",
    "A zigzag needs only 2 cards, and a neighbour difference of 2 is enough; two-card zigzags count from ×1.35.",
  ],
  E_RPM: [
    "Once per segment, a card may belong to two stairs.",
    "Up to two cards per segment may belong to two stairs.",
    "Up to three cards per segment may belong to two stairs.",
    "Every card may belong to two stairs at once.",
  ],
  E_LOSS: [
    "Positions 20 and 40 count as anchors (×1.25).",
    "Positions 10, 20, 30 and 40 count as anchors (×1.25).",
    "Every segment-end position counts as an anchor (×1.25).",
    "Every segment-end position counts as an anchor (×1.35).",
  ],
  E_QUICKSHOT: [
    "Positions 5 and 25 count as anchors (×1.25).",
    "Positions 5, 15, 25 and 35 count as anchors (×1.25).",
    "Every fifth position (5, 10 … 40) counts as an anchor (×1.25).",
    "Every fifth position counts as an anchor (×1.35) and gets +2 trick value.",
  ],
  E_SEGMENT: [
    "One segment boundary is open; formations may cross it.",
    "Two segment boundaries are open.",
    "All segment boundaries are open.",
    "All segment boundaries are open; cards of a formation crossing a boundary give ×1.25 score on top.",
  ],
  E_STRONG_REP: [
    "Second card of a repeat: ×1.30 (instead of ×1.25).",
    "Second card of a repeat: ×1.35.",
    "Second and third repeat card: +0.10 on their formation factor each.",
    "All repeat factors: ×1.20 on top.",
  ],
  E_AFTERGLOW: [
    "The formation factor of your repeat carries over to the next card (at most ×1.20), even if that card is not part of the formation itself.",
    "Works for all formations; factor at most ×1.25.",
    "Carries the strongest single factor over in full.",
    "Carries the strongest single factor over and holds it for the next two cards.",
  ],
  E_COLOR_ALLIANCE: [
    "Choose 2 suits: they count as the same suit in all suit scoring — except for Suit Boost and Suit Duel.",
    "Choose 3 suits: they count as the same suit in all suit scoring — except for Suit Boost and Suit Duel.",
    "Choose 4 suits: all four count as the same suit in all suit scoring — except for Suit Boost and Suit Duel.",
    "Choose 4 suits: all four count as the same suit, and suit blocks start at ×1.55 (instead of ×1.35) — except for Suit Boost and Suit Duel.",
  ],
  E_CORE: [
    "Choose 1 formation type: its active formations ×1.15 on top.",
    "Choose 1 formation type: its active formations ×1.25 on top.",
    "Choose 1 formation type: its active formations ×1.40 on top.",
    "Choose 1 formation type: its active formations ×1.50 on top (echo included).",
  ],
  /* Precision — the German source builds these from indexed constants; so does the English. */
  P_SHARPNESS: C.PRECISION_SHARP_PP.map((pp) => `All cards: +${ppE(pp)}% crit chance.`),
  P_FORCE: C.PRECISION_FORCE_MULT.map((m) => `+${numE(m)}× crit multiplier (on a base of ${numE(C.CRIT_BASE_MULT)}×).`),
  P_AIM: C.PRECISION_AIM_THRESH.map((th) => `Cards with value ${th} or more: +${ppE(C.PRECISION_AIM_PP)}% crit chance.`),
  P_LENS: C.PRECISION_LENS_PP.map((pp) => `+${ppE(pp)}% crit chance per simultaneous formation beyond the first at the winning position (max ${C.PRECISION_LENS_CAP} extra).`),
  P_COLORFOCUS: C.PRECISION_COLOR_PP.map((pp, i) => (i < 3
    ? `Choose a suit: cards of that suit +${ppE(pp)}% crit chance.`
    : `Choose TWO suits: cards of those suits +${ppE(pp)}% crit chance each.`)),
};

/* ---- Assemble ---- */
const out = {};
for (const [id, name] of Object.entries(NAMES)) out[`family.${id}.name`] = name;
for (const [id, m] of Object.entries(MUSTER_EN)) {
  for (let t = 1; t <= 4; t++) {
    out[`family.${id}.tier${t}.desc`] = m.tpl.replace(/\$(\d)/g, (_, i) => m.vals[t - 1][+i]);
  }
}
for (const [id, list] of Object.entries(DESCS)) {
  list.forEach((d, i) => { out[`family.${id}.tier${i + 1}.desc`] = d; });
}

export default out;
