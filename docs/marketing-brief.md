# Marketing Brief — Autostich / Autotrick

**Status: live — 2026-09-09.** Project overview for outward-facing work: what the game is, how it
plays, what it is designed to feel like, where it sits in its genre, and who it competes with. It
exists so that a later marketing agent can be given **one** file instead of a reading list.

**This is not player-visible text.** Nothing here is rendered by the game and nothing here belongs in
the i18n catalogs (`AGENTS.md` — *Language policy*; the same rule `docs/pitch.md` states for itself).
It is also **not an agent prompt** — it is the knowledge base such a prompt would point at.

**Derived from the code at `be9d429a` (`dev`, 2026-08-30)** plus the documents named per section.
Where this file and the code disagree, **the code wins** — §9 maps every area to the file that owns
it.

---

## Contents

| § | Section |
| --- | --- |
| 0 | [How to use this file](#0-how-to-use-this-file) |
| 1 | [Fact sheet](#1-fact-sheet) |
| 2 | [The pitch — owner-approved, do not rewrite](#2-the-pitch--owner-approved-do-not-rewrite) |
| 3 | [Game logic](#3-game-logic) |
| 4 | [Design fundamentals](#4-design-fundamentals) |
| 5 | [Genre](#5-genre) |
| 6 | [Competitors](#6-competitors) |
| 7 | [Positioning](#7-positioning) |
| 8 | [Open decisions — owner](#8-open-decisions--owner) |
| 9 | [Source-of-truth map](#9-source-of-truth-map) |

---

## 0. How to use this file

Five rules for anyone — human or agent — writing outward-facing copy from it.

1. **The pitch wording is owner-approved.** Quote `docs/pitch.md`, do not improve it. Changing it is
   an owner decision, not an editing pass.
2. **Terminology is fixed, in every language.** Player-facing words come from
   `docs/text-style-guide.md` and `src/game/glossary.js`; the English/Spanish/Chinese equivalents come
   from the localization catalogs. Inventing a synonym for a defined term is the single most common
   way to produce copy that contradicts the game. §5.3 carries the short list.
3. **Never invent a number.** Every figure below names where it comes from. Figures that move —
   test counts, track counts, review counts, download counts — are deliberately absent or marked;
   `AGENTS.md` — *House rules* forbids restating them in durable documentation.
4. **Claims are labelled.** *measured* (a real run of a command), *observed* (read out of code or a
   document), *derived* (calculated from observed values), *market research* (external, dated), *open*
   (nobody has decided yet). Carry the label forward when a claim moves into copy that has to hold up.
5. **Product claims that are not in this file do not exist yet.** Price, release date, platform
   commitments and store presence are §8, and they are the owner's.

---

## 1. Fact sheet

| Field | Value | Source |
| --- | --- | --- |
| **Title (German)** | **Autostich** | `src/i18n/de.js` — `meta.title` |
| **Title (English)** | **Autotrick** | `src/i18n/en.js`; decided 2026-08-18, `docs/localization/genre-terminologie.md` §2 |
| **Title (Spanish)** | **Autobaza** | `src/i18n/es.js` |
| **Title (Chinese, simplified)** | **自动墩** | `src/i18n/zhHans.js` |
| **Genre line** | Roguelite autobattler card game (long form: roguelite autobattler **trick-taking** game) | `docs/pitch.md` — *Genre line* |
| **Mode** | Single player, score attack. No PvP, no real-time opponent | observed |
| **Fail state** | **None.** A run is a fixed length; you cannot lose it, only out-build it | `MAX_CYCLES`, `src/game/constants.js` |
| **Platform today** | Browser (desktop and phone), GitHub Pages, no install, no account | `vite.config.js`, `src/i18n/*` privacy strings |
| **Platform interest** | itch.io embed is a designed-for case (1280 × 720 binding); Steam Deck named on the roadmap | `docs/workstreams/typography-system/planning-report.md` §7.4b; `docs/feature-backlog.md` FB-13 |
| **Tech** | Vite + React 18 + Pixi.js, Tailwind v4. No game engine, no backend of its own | `package.json` |
| **Backend touched** | Supabase — global leaderboard, anonymous telemetry, feedback reports. Public key, insert/read only | `src/game/leaderboard.js`, `reports.js`, `telemetry.js` |
| **UI languages** | German · English · Spanish · Chinese (simplified) | `src/i18n/` |
| **Version / stage** | `0.3.0` — **prototype in open playtest**, private hobby project | `package.json`; `privacy.sec.contact.body` |
| **Channels** | Community Discord (also the privacy contact); soundtrack published on Spotify as a project album | `src/ui/links.js` |
| **Monetization** | **open** — nothing is decided | §8 |

---

## 2. The pitch — owner-approved, do not rewrite

`docs/pitch.md` is canonical and carries all four languages, the short cuts for character-limited
fields, and the genre line. The English canonical sentence:

> A card game about who stands next to whom: put the right cards side by side for fifty rounds, and
> your skills turn a polite little line-up into an engine that scores high enough to unlock tracks
> most players never hear.

The German:

> Ein Kartenspiel darüber, wer neben wem steht: Stell 50 Durchläufe lang die richtigen Karten
> nebeneinander, und deine Skills machen aus einer braven kleinen Reihe eine Engine, die hoch genug
> punktet, um Tracks freizuschalten, die kaum jemand hört.

**Why it holds up:** every clause is a real mechanic, and `docs/pitch.md` maps each one to the code
that implements it. The one clause that can go stale is the last — it promises a score threshold, so
re-check it against `TIER_MIN` in `src/ui/music.js` before using the sentence somewhere durable.

---

## 3. Game logic

### 3.1 The core loop

A trick-taking game **without a player decision in the fight**. Each *trick*, both sides reveal their
next card and the **higher number wins**. You never choose which card to play. What you build is the
thing that plays them.

```
40 tricks resolve automatically  →  end of cycle  →  exactly ONE decision
   (skill · perk · order · Architect)             →  the build gets stronger
→  next cycle …  ×50  →  end of run
```

The decision *type* is not random: `DECISION_SCHEDULE` is a fixed 50-entry plan — 10 skill, 13 perk,
13 order, 13 Architect, 1 legendary. The first decision of every run is deliberately a blind skill
commit; the legendary phase always lands in cycle 29.

### 3.2 Deck and tricks

- **40 cards** = 4 suits × values 1–10. Both sides have their own 40-card deck.
- A card is `{ suit, baseRank, value }`. `value` is the current fighting value and can be raised
  **permanently** during a run; `baseRank` is what it started as.
- **Your draw order is persistent for the whole run.** Only the *opponent's* deck is reshuffled each
  cycle. That persistence is what makes "who stands next to whom" a build decision rather than a
  shuffle.
- **Card values are uncapped** (`VALUE_CAP = null`). The opponent's maximum is 10 — so a card at 11
  beats everything, forever. Suit is cosmetic in the raw comparison and mechanically relevant
  everywhere else (colour blocks, colour perks, archetypes).

### 3.3 The run

Fixed length: `MAX_CYCLES = 50` full passes through the deck, 40 tricks each — then the run ends and
is scored. There is no health, no damage, no death. **Score is the only target metric**, and it only
goes up.

### 3.4 The score formula — the engine

On a win (*observed*, `src/game/engine.js`):

```
base   = SCORE_PER_WIN (400)
       × streak multiplier            (+2 % per consecutive win, capped at +150 %)
       × Π perk multipliers
       × formation multiplier          ← the position's own factor, overlaps included
       × Architect factors             ← row/column/diagonal structures + district
       + Σ flat additions              ← anchors, fire score, ionisation, buildings …
score  = base × (crit ? crit multiplier : 1)  +  direct score
```

**Crit starts at zero.** Crit chance is something you build — out of the five Precision perk families
or out of the Lightning archetype — and the base crit multiplier is 2.25. Excess chance above 100 %
does not evaporate; it feeds its own rules.

The whole `src/game/` layer is **pure and deterministic**: no `Math.random`, no `Date`. Randomness
arrives as an injected seed. That is why a seed can be shared, why the weekly ranked mode can put
every player on the same run, and why the balance simulator in `sim/` can play thousands of runs.

### 3.5 Formations — the signature mechanic

The one mechanic no competitor in §6 has in this shape. From your persistent card order, every
position earns a multiplier based on **its neighbours**:

| Formation | Condition |
| --- | --- |
| **Repetition** | ≥ 2 equal values in a row |
| **Colour block** | ≥ 3 of the same suit in a row |
| **Staircase** | ≥ 3 strictly rising, step ≤ 4 |
| **Alternation** | ≥ 3 zig-zag, neighbour difference ≥ 4 |
| **Anchor** | a single position counts as a formation on its own |

Formations are bounded by **segments of 5 positions** — a run of neighbours ends at the segment
border unless something opens it. And they **stack**: a card sitting inside several formations
multiplies the product on top — 2 formations ×1.5, 3 ×2, 4 ×3.

The **order phase** (German: *Aufstellungsphase*) is where you rearrange. It pauses the run and gives
you a small energy budget; one swap of two cards costs 1. Formations recompute live after every swap.
This is the closest thing the game has to a puzzle screen, and it is the most photogenic loop for a
trailer: small move, whole board relights.

### 3.6 Perks, skills, archetypes

- **Perks** come as a choice of 3 after a perk cycle, organised into **families with four tiers**
  (Normal · Selten · Sehr selten · Episch — `src/game/rarity.js`; English ladder Common · Uncommon ·
  Rare · Epic). Categories: deck values, trick effects, card roles, score & crit, formation tools.
- **Legendaries** are a **separate axis**, not the top rarity: they have their own phase in cycle 29
  and their own fixed slot.
- **Skills** come from four elemental **archetypes**, 12 offered per skill round (3 per archetype),
  up to 6 held at once, all four mixable:

| Archetype | Fantasy | Mechanic |
| --- | --- | --- |
| ⚡ **Lightning** (Blitz) | the reliable crit engine | charge, ionised cards, crit chance and multiplier |
| 🔥 **Fire** (Feuer) | rewards total superiority | a heat bar that pays flat score, spent by consumers |
| ❄ **Ice** (Eis) | build a glacier, then break it | frozen cards gain mass each cycle and burst over their neighbours; ice formations on the board amplify it |
| 🌿 **Plant** (Pflanze) | grow, then harvest | wins grow cards; grown cards turn permanently green and form one big colour block |

Lightning and Fire are available from the start; **Ice and Plant are unlocked** through the upgrade
tree (`ARCHETYPES_BASE`, `progression.js`).

### 3.7 The Architect

The build phase, and the replacement for the old coin shop (removed deliberately). You place
**polyomino buildings** on an 8 × 5 grid. There is no currency and no price — **the constraint is
space**. Buildings come in families of four tiers, in three categories (value, score, formation), and
full rows, columns and diagonals stack multiplicatively. Choosing a blueprint is binding; then you may
move and rotate everything freely before one confirmation starts the next cycle.

The grid is also the brand mark: 5 wide = the segment width, 8 tall = the eight segments of a cycle,
40 cells = one full deck (`docs/mainscreen-marke.md`).

### 3.8 Between runs — meta progression

Two currencies, deliberately separated:

- **SP → the upgrade tree.** Real power: unlock the Ice and Plant archetypes, raise which rarities can
  drop at all, add rerolls, widen the build field, add order energy, add legendary candidates.
- **DP → the Deck-Werkstatt (workshop).** **Purely cosmetic**: card decks, battlefields, effects.
  Nothing bought with DP changes a number.

Cosmetics also unlock through **challenges** rather than purchase — a challenge deck is earned by
doing a specific thing in a run.

### 3.9 Weekly ranked

A weekly mode where **everyone plays the same seed**, plus rolled **week modifiers** — positive and
negative, drawn against each other (blocked cells, stronger opponents, no rerolls; or extra skill
slots, doubled order energy, double legendary). Challenger seeds and a chronicle sit alongside it. It
unlocks only once all decks are unlocked and each of the four archetypes has appeared in a completed
run — it is explicitly the late-game surface, not the front door.

### 3.10 Session length (*derived*)

2 000 tricks per run × 1 750 ms base pace ≈ **58 minutes at 1× speed**, ≈ 15 minutes at 4×, ≈ 12 at
MAX (5×), plus the time you spend on the 50 decisions. The speed control is display only and
**score-neutral** — there is no "play faster for more points" pressure. Treat the range, not a single
number, as the honest claim: *a run is a long session at base speed and a coffee break at MAX.*

---

## 4. Design fundamentals

### 4.1 What the design commits to

1. **You never play a card.** Every decision is made between fights. The fight is the payoff, not the
   input.
2. **You cannot lose.** The tension is not survival, it is *how high*. This is the single biggest
   design departure from the roguelite mainstream (§7.3 handles the objection it invites).
3. **Adjacency is the game.** Not the cards you own — the order they stand in.
4. **The engine compounds visibly.** Formation × streak × perks × buildings × crit, with the factor
   chain shown under the field. The player is meant to *see* where a number came from.
5. **Determinism.** Same seed, same run. It is what makes the weekly mode fair and the simulator
   possible.
6. **One decision per cycle.** The plan is fixed, so pacing is authored, not rolled.

### 4.2 Visual identity

- **Neon on near-black.** Dark ground (`rgba(12,12,16,.94)` overlay), panels that pull the *active
  deck colour* into their border at 26 % and their surface at 5 % — you notice the deck changed
  without the surface ever having a colour (`docs/design-sprache.md`).
- **The mark is a letter made of the board**: a 5 × 8 grid of cells, three states (quiet, mid,
  glowing), derived from the actual game geometry rather than drawn to look technical.
- **Deliberately cheap in the right places** — no `backdrop-filter`, measured as the most expensive
  item of the desktop pass and invisible under a 94 % overlay. The look is designed to run at full
  frame rate in a browser tab on a laptop.
- The binding design viewport is **1280 × 720** (the itch.io embed), verified upward — not 1920.
- A live design language document governs every overlay; per-screen redesigns defer to it.

### 4.3 Audio

An original synthwave/outrun soundtrack that **escalates with your score**: tracks carry an intensity
tier (calm → mid → hot → overdrive → overdrive+) and the score picks the tier. The top tier only
starts far up the scale — which is what the pitch's last clause is about. The album is published on
Spotify. Track inventory and links live in `docs/soundtrack-downloads.md` (generated — never quote a
hand-counted number; regenerate it).

Genre for a form that demands one: **synthwave and outrun, escalating into darksynth and phonk**;
where only a fixed list exists, **Electronic / Dance-Electronic**.

### 4.4 Text and tone

Player-facing text is governed by a binding style guide, and the rules are unusually strict for a
hobby project — one term, one word; one word, one meaning; anything that hangs off a skill is said to
hang off that skill. A **glossary** is the single source of the short explanations, and the terms in it
are bolded automatically wherever they appear in the UI.

For marketing this matters twice over:

- The game's invented words (*Weißglut*, *Firn*, *Glutdividende*) are **an asset, not a translation
  problem** — the genre norm is to coin short nouns and explain them once, exactly as Balatro did with
  *Ante* and *Blind*. Keep them.
- The escalating call-outs are frozen and guarded: **NICE · BRUTAL · INSANE · GODLIKE** (DE: Stark ·
  Brutal · Irre · Gottgleich), a deliberate quote of the arena-shooter tradition.

### 4.5 Reach and accessibility

Runs in a browser with **no install, no account, no sign-in**. Motion respects
`prefers-reduced-motion` throughout; dismissible overlays share one Escape behaviour; a phone layout
exists alongside the desktop one. A guided first run teaches the game, and skipping the tutorial lifts
the first-run restrictions rather than punishing the skip.

### 4.6 Privacy — a marketing asset, not a footnote

No account, no advertising cookies, no third-party scripts, no cross-site tracking. Profile, history
and options stay in the browser. Two things leave the device and **both are listed in full in the
game**: anonymous gameplay telemetry (switchable off, and off deletes what is queued) and a leaderboard
entry (only when you publish one, under a nickname you choose). This is worth saying out loud in a
market where the assumption runs the other way.

---

## 5. Genre

### 5.1 The classification

**Roguelite autobattler trick-taking card game** — a score-attack engine builder.

Broken into the axes a store page or a press mail actually cares about:

| Axis | Where Autostich sits |
| --- | --- |
| Card game family | **Trick-taking** (the Whist/Skat/Bridge family), not deckbuilding-by-drafting |
| Combat input | **Autobattler** — resolves without you |
| Run structure | **Roguelite** — fixed-length runs, offers between rounds, persistent meta progression |
| Goal | **Score attack** — high score, no fail state |
| Depth mechanic | **Engine building through adjacency** |

### 5.2 The naming problem — a real marketing constraint

*Autostich* is a **speaking name in German** ("Stich" = trick). In English it reads like a sewing
term. The project therefore ships a per-language title — **Autostich · Autotrick · Autobaza · 自动墩** —
and the reasoning is on record: a speaking name that only one language half can read is not a coined
word in the other, it is a wrong word. English-language material should keep the genre visible next to
the title, because the title alone does not carry it.

### 5.3 Terminology — the mappings copy must respect

| German | English | Note |
| --- | --- | --- |
| Stich | **trick** | the technical term of the family; not "round" |
| Durchlauf | **cycle** | already deckbuilder English for "play the whole deck once"; "round" is banned by a test guard |
| Lauf | **run** | |
| Aufstellungsphase | **order phase** | it reorders the draw order, not a spatial layout |
| Formations-Energie | **order energy** | |
| Bauphase / Der Architekt | **build phase** / **the Architect** | nothing is bought, so not "shop phase" |
| Perk | **perk** | chosen, permanent, from an offer — deliberately not "relic" or "boon" |
| Skill-Slot | **skill slot** | |
| Normal · Selten · Sehr selten · Episch | **Common · Uncommon · Rare · Epic** | "Legendary" is a separate axis and cannot be the top rarity |

---

## 6. Competitors

*Market research, 2026-09-09.* Store pages were not reachable from the session that wrote this
(egress-blocked), so the entries below come from web search results and general genre knowledge.
**Verify current figures before putting any of them in outward-facing copy** — and per §0.3, do not
carry a competitor's review or sales count into a durable document at all.

### 6.1 Ring 1 — direct: roguelite trick-taking

The niche exists, is very young, and is **small**. This is the closest genre neighbourhood and the
one where Autostich would be compared directly.

| Game | What it is | Distance from Autostich |
| --- | --- | --- |
| **Overtrick** (celloloops / 2 Left Thumbs, Steam, Aug 2026) | Trick-taking roguelite deckbuilder built on Bridge/Hearts/Spades, 1920s setting, buy abilities between hands | **Closest single competitor.** Same family, same "classic trick-taking + roguelite upgrades". Differs on everything Autostich does after that: you still *play* the cards, there is a fail condition, and there is no adjacency engine |
| **Trick-Taking Rogue** (Steam, 2026) | Nine classic trick-takers (Whist, Sueca, Briscola, Oh Hell) with roguelite skills and shops | Same fusion, opposite direction: it keeps the classic games intact and layers roguelite on top. Autostich keeps almost nothing of classic trick-taking except the word |

**Reading:** "trick-taking × roguelike" is being described in the market as a rare, fresh combination.
That is favourable — the space is not crowded — but it also means **no one is searching for the
genre**. Copy should lead with the feeling (build an engine, watch the number go up), not the family.

### 6.2 Ring 2 — the real competitive set: score-attack engine builders

This is where Autostich's *players* actually come from, and where the comparison flatters it most.

| Game | Core | Why it is the reference | Where Autostich differs |
| --- | --- | --- | --- |
| **Balatro** (LocalThunk / Playstack, 2024) | Poker hands, jokers, multipliers stacked until the numbers stop making sense | The genre-defining score-attack deckbuilder; revitalized the subgenre and set the expectation for "number go up" | Autostich has **no hand selection** and **no fail state**; the multiplier comes from *neighbourhood*, not from hand type |
| **Luck Be a Landlord** (TrampolineTales) | Slot symbols whose **adjacency** builds payout chains; pay rent each round | The closest mechanical cousin to Autostich's actual maths — adjacency-driven chain scoring — and a cited Balatro inspiration | Autostich's adjacency is a **persistent order you rearrange deliberately**, not a spin; and there is no rent to fail |
| **Ballionaire** | Pachinko boards; scoring emerges from where things bounce | Same "kinetic auto-resolving money engine" pleasure | Autostich trades physics chaos for clean, inspectable cause and effect — the factor chain is shown |
| **Slay the Spire** (Mega Crit) | The roguelite deckbuilder grandparent | The reference for run structure, offers and meta unlock language | Combat there is the decision; here there is no combat decision at all |

### 6.3 Ring 3 — autobattler and spatial neighbours

| Game | Shared axis | Difference |
| --- | --- | --- |
| **Super Auto Pets** | Auto-resolving battles, positional adjacency, free and browser-friendly, weekly rotating content | Asynchronous PvP with a loss condition; Autostich is pure score attack against a neutral deck |
| **Backpack Battles** | Spatial placement, adjacency bonuses, auto-resolved fights | PvP-driven; Autostich's grid (the Architect) is one of *two* spatial systems, the other being the card order itself |
| **Teamfight Tactics / Dota Underlords** | Made "autobattler" a household word; positioning + synergies | Real-time, multiplayer, live-service. Autostich borrows the vocabulary (*skill slot*, *build phase*), not the model |

### 6.4 What competitors have that Autostich does not

Honest gaps, because positioning that ignores them produces copy that gets contradicted in a comment
thread:

- **No stakes escalation.** Balatro's antes and Landlord's rent create failure pressure; a fixed
  50-cycle run does not.
- **No PvP or asynchronous opponents** (the weekly shared seed is the nearest thing).
- **No store presence.** It is a browser prototype in open playtest; the competitors are shipped,
  reviewed products.
- **No mascot, no character, no fiction.** The game is systems and typography. That is a deliberate
  design position, but it costs the easy visual hook a store thumbnail wants.

---

## 7. Positioning

### 7.1 The five differentiators, in the order they are worth leading with

1. **Adjacency as the whole game.** "Who stands next to whom" is a sentence nobody else in the space
   can say. It is also the most demonstrable in five seconds of video: one swap, the board relights.
2. **A trick-taking game that plays itself.** The oldest card-game family, automated — a combination
   the market currently calls rare.
3. **Two spatial puzzles in one run**: the card order, and the Architect's polyomino grid.
4. **You cannot lose.** No death spiral, no run ended at minute three. Reframed as a feature: *the
   only question is how high*.
5. **The soundtrack is a reward.** Score tiers unlock music; the top tier is genuinely rare. Very few
   games in the space make audio a progression surface.

### 7.2 Audience hypotheses (*proposed* — none of this is validated)

- **Primary:** Balatro / Luck Be a Landlord players between runs of those games — people who play for
  the engine, not the fight. Browser-first, will try something in a tab.
- **Secondary:** German-speaking card-game players, where *Stich* needs no explanation at all and the
  trick-taking family carries cultural weight (Skat, Doppelkopf) that it does not in English.
- **Tertiary:** idle/incremental players — auto-resolving, number-goes-up, no failure. The loop is
  closer to that genre than the roguelite framing suggests.
- **Not the audience:** players who want tactical combat decisions, narrative, or PvP.

### 7.3 The objections, and the answers

| Objection | Answer |
| --- | --- |
| "No fail state, so no tension." | The tension moved: it is the gap between the score you got and the score the build could have reached. The leaderboard, the weekly shared seed and the ghost of your own record run supply the pressure. |
| "An autobattler is a game that plays itself — what am I doing?" | Fifty decisions per run, on a fixed schedule, each of which permanently changes the deck, the order or the board. |
| "It's a browser prototype." | True, and stated plainly everywhere — open playtest, private hobby project, feedback button in the menu. Say it first, before someone else does. |
| "The name doesn't mean anything." | In German it means exactly what the game is. In English it ships as *Autotrick* with the genre next to it. |

### 7.4 Risks

- **Discoverability**: the genre words that describe it best are the ones nobody searches for.
- **Screenshot problem**: an engine-builder's appeal is in a chain of numbers; a static image of a
  card row undersells it. Motion is the medium — the order phase and the big call-outs.
- **Explaining "you can't lose"** costs a sentence every single time, and a sentence is expensive on a
  store page.

---

## 8. Open decisions — owner

Nothing in this section has been decided. An agent must not fill these in from inference.

- **Monetization** — free, paid, or free with a paid version. Nothing in the repository states one.
- **Release target and store presence** — itch.io is designed for (the 1280 × 720 binding viewport)
  and Steam appears in the backlog's reasoning, but neither is a commitment.
- **Whether the marketing surface is German-first or English-first.** The game ships four languages;
  the audience hypothesis in §7.2 splits differently per language.
- **Release timing, trailer, press outreach, and whether the project wants coverage at all** while it
  is a private hobby project in open playtest.
- **Whether the pitch gets a shorter tagline** for places a full sentence does not fit beyond the
  existing short cuts in `docs/pitch.md`.

---

## 9. Source-of-truth map

Read the one file the claim needs. Where this brief and a source disagree, the source wins.

| Area | Owner |
| --- | --- |
| The pitch, in four languages, plus the genre line | `docs/pitch.md` — **owner-approved wording** |
| Core numbers, decision plan, tuning constants | `src/game/constants.js` |
| Trick resolution and the score formula | `src/game/engine.js` |
| Formations, segments, overlap | `src/game/formations.js` |
| Perk families / legendaries / skills / archetypes | `families.js` · `perks.js` · `skills.js` · `glacier.js` |
| The Architect | `src/game/architect.js` |
| Meta progression, unlocks, ranked gate | `src/game/progression.js`, `weekMods.js` |
| Rarity ladder and its labels | `src/game/rarity.js` (`TIER_META`) |
| Soundtrack, tiers, track links | `src/ui/music.js`, `docs/soundtrack-downloads.md` (generated) |
| Player-facing wording and terminology | `docs/text-style-guide.md`, `src/game/glossary.js` |
| Localized titles and all player text | `src/i18n/` |
| Visual identity, overlays, the brand mark | `docs/design-sprache.md`, `docs/mainscreen-marke.md` |
| Genre terminology and why each word was chosen | `docs/localization/genre-terminologie.md` |
| Privacy claims | the `privacy.*` keys in `src/i18n/en.js` (and their siblings) |
| Roadmap candidates | `docs/feature-backlog.md` |
| A repository-wide code overview | `README.md` (German; derived from code, and older than this file in places) |

---

*Written 2026-09-09 against `dev` at `be9d429a`. Competitor section is dated market research, not a
standing claim. Nothing here changes the game; nothing here is player-visible.*
