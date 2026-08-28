# First-contact onboarding — design paper

> **Status:** PROPOSAL — owner review pending. Nothing in this paper is built.
> **Branch:** `claude/tutorial-design-review-ic49dg` (design review session, 2026-08-27).
> **Basis:** the guided run on `main` (`docs/tutorial-guided-run-plan.md`, removed on `dev`) and the
> tutorial sections with Proberunden on `dev` (`docs/workstreams/tutorial-sections/`). This paper
> proposes the layer both attempts were missing: the **first contact**.
> **Provenance markers** as in the tutorial-sections planning report: **measured** (read out of the
> running code/repo), **observed** (seen in source, not executed), **proposed** (design judgement).

---

## 1. The problem, stated once

Two tutorial variants exist and both produce the same owner verdict — "too much information at
once" — through opposite mechanisms:

- **Guided run (`main`):** right place (the real run), wrong timing. About a dozen text blocks fire
  before the player has seen a single trick, several of them explaining UI that is not on screen
  yet (resource bars, milestones, Chronik).
- **Sections (`dev`):** right method (experience beats reading — the Probierfeld is genuinely
  strong), wrong frame. A new player faces a curriculum: 10 sections, ~42 lessons, before touching
  the game. The overload moved from the individual text into the shape of the offer itself.

The shared root is **coverage-driven design**: both variants try to teach *completely* (the 109-term
gap report; "all nine gaps go in"). Completeness is the natural enemy of "not too much at once".
Good tutorials — Balatro, Slay the Spire, Hades — are deliberately *incomplete*: they teach the
minimum needed to start and make depth **findable** instead of **mandatory**.

**One structural finding sharpens the owner's stated fear.** The decision schedule opens with
`skill` (measured — `BASE_SCHEDULE[0]`, `src/game/constants.js`), and the code calls it a deliberate
blind commit. For a veteran that is information-lossless. For a new player it means: **the very
first screen of the game is its hardest choice, with zero context.** Six skills for a fresh profile
(measured — `ARCHETYPES_BASE` = fire + lightning; ice and plant sit behind tree nodes at 4 SP each),
each with archetype, resource and consumer/booster semantics, before the first trick has been seen.

---

## 2. Design principles

1. **Teach at the moment of first relevance, not at the moment of first visibility.** A hint fires
   when the thing it explains has just happened or is the current decision — never earlier.
2. **One concept per hint. One to two sentences. No chains.** No coach-mark tours, no multi-beat
   pop-ups in the run.
3. **Show before tell.** Where the UI already demonstrates something (the score chain, the live
   formation markers), the hint names what was just seen instead of predicting it.
4. **Push the minimum, pull the rest.** Every hint links one Probierfeld screen ("Mehr dazu").
   The Probierfeld (the `dev` sections, rebuilt — §8) is the depth layer — reached by curiosity,
   never by obligation.
5. **Never explain what the tree has not unlocked.** The upgrade tree already ramps content
   (archetypes, rarity, legendary layer — measured in `nodeEffects()`). First-occurrence triggers
   honour this by construction: what cannot appear cannot fire.

## 3. Division of labour (extends the existing three layers)

| Layer | Answers | Form |
| --- | --- | --- |
| **Hints** (new, this paper) | "what just happened / what do I decide now" | 1–2 sentences in the run, first occurrence only, each with a "Mehr dazu" link |
| **Probierfeld** (the `dev` sections, rebuilt — §8) | "how does this system work" | flat collection of probe screens, pull-only |
| **Glossar** | "what does this word mean" | 109 entries, on demand |
| **Leitfaden** | "how do I play Feuer" | 4 archetype guides |

The `dev` build's probes all survive; its text lessons and its curriculum shell do not — §8 has
the cut. Either way it stops being the front door.

---

## 4. The first-contact arc

What a brand-new profile experiences, cycle by cycle (schedule: skill → perk → formation →
architect, measured):

- **Run start:** one welcome card (H1) — the only blocking full card in the whole system. **The
  opening skill choice is skipped in the first run** (§6 — owner direction): the deck goes
  straight into cycle 1.
- **Cycle 1, play:** the player *watches*. With no skills and no perks, the play phase is the
  game at its barest — card against card, win, tie, streak. E1 (first win) and possibly E2/E3
  fire here, under the pacing rules of §5.4.
- **Cycle 2, perk:** the first decision of the game, and the gentlest one — three options,
  declining allowed. Banner H3.
- **Cycle 3, formation:** suggestion S-F1 ("one segment, same colours"). **Cycle 4, architect:**
  suggestion S-A1 ("place your first building").
- **Cycle 5, the first skill offer:** now with four play phases, a perk, a formation and a
  building behind the player — and it shows **Blitz only** (§6); banner H2 above it, one
  "Guter Start" badge on the Blitz consumer. Three options, one marked. E5 (the new resource bar)
  follows in the next play phase.
- **Later formation and architect visits** continue their sequences: another pattern (S-F2), a
  district (S-A2), the structure outlook (S-A3) — each visit one task, skipped if already achieved.
- **Later, whenever they first happen:** streak (E3), crit (E4), a formation scoring in play (E6),
  first milestone (E7), the conditional phases (C1–C3), the legendary phase in cycle 29 (C4),
  first run end (E8).

The first five cycles now introduce **exactly one decision type each, in rising weight: none →
perk → formation task → architect task → skill.** The identity choice comes last, with the most
context, instead of first with none — the exact inversion of the blind commit §1 names. From run 2
the schedule reads normally (skill first), which is fine: the player has been through everything
once.

## 4a. The first-run curriculum — every mechanic, when, and how

**Owner direction (2026-08-28): a run is 50 cycles — use them.** The teaching does not stop after
cycle 5; each later phase visit and each first event carries exactly one more mechanic. This table
is the consolidated answer to "what gets explained in the first game, when, and how" — one row per
mechanic, in the order a typical first run meets them. Cycle numbers are computed from
`BASE_SCHEDULE` (skill phases sit before cycles 1·5·9·13·17·21·25·33·39·43, perk before 2·6·10…,
formation before 3·7·11…, architect before 4·8·12…, legendary before 29); event rows fire whenever
their event first happens, under the §5.4 pacing rules.

| When (run 1) | Mechanic taught | How | Hint | Mehr dazu |
| --- | --- | --- | --- | --- |
| Run start | The game loop: deck plays itself, no losing, first cycle is for watching | blocking card (the only one) | H1 | grundlagen / stich |
| Cycle 1, play | A won trick pays {win} base points; everything else stacks as factors | pause card | E1 | grundlagen / score |
| First tie, whenever | A tie pays nobody | pause card | E2 | grundlagen / stich |
| First streak of 3, whenever | The streak factor, with the live numbers | pause card | E3 | grundlagen / serie |
| Cycle 2 | Perk basics: immediate, permanent, declining is free | banner | H3 | wahl / kategorien |
| Cycle 3 | Formation basics as a task: one segment, colour block | task banner | S-F1 | aufstellung / formationen |
| Cycle 4 | Architect basics as a task: place a building, the win condition | task banner | S-A1 | architekt / wasist |
| Cycle 5 | The first skill: Blitz as the one archetype, consumer badged | banner + badge | H2 | blitz / karte |
| Cycle 5, play | The resource bar that just appeared | pause card | E5 | blitz / karte |
| First crit, whenever | Crit ×{critMult}; where crit chance comes from | pause card | E4 | blitz / karte |
| Cycle 6 (perk visit 2) | Category chip and rarity border | banner | H3b | wahl / raritaet |
| Cycle 7 (formation visit 2) | A second pattern, via the legend | task banner | S-F2 | aufstellung / formationen |
| First formation scores, whenever | The formation's factor, and the segment rule | pause card | E6 | aufstellung / formationen |
| Cycle 8 (architect visit 2) | The district: a matching neighbour | task banner | S-A2 | architekt / wohin |
| Cycle 11 (formation visit 3) | Formations may overlap | task banner | S-F3 | aufstellung / stapeln |
| Cycle 12 (architect visit 3) | The structure, as a long game | task banner | S-A3 | architekt / wohin |
| Cycle 16 (architect visit 4) | Upgrade, move, demolish — a building is never final | task banner | S-A4 | architekt / aufwerten |
| First milestone, score-driven | Milestones pay Stichpunkte | pause card | E7 | danach / punkte |
| If a perk asks, whenever | Target select / family target | one-liner | C2 / C3 | wahl / kategorien |
| Cycle 29 | The legendary phase | one-liner | C4 | wahl / legendaer |
| Cycle 33 (first offer with full slots) | A new skill now replaces an old one; what it paid out stays | banner | H5 | wahl / perks |
| Run end | SP and DP; the Probierfeld invitation | pause card | E8 | danach / endscreen |
| Run 2, first skill offer | A second archetype; mixing is allowed | banner | H2b | wahl / kategorien |

Deliberately **not** in the first run, each with its home: Neuwurf (tree-gated — principle 5),
the glacier pick (needs ice, tree-gated — C1 fires when it first exists), every archetype's second
layer (Leitfaden), rarity ladder details and per-card rules (Glossar/Probierfeld), the meta
screens (E8 points at them once).

The visit-based rows self-heal: a step whose goal is already met is skipped (§5.2 rule 2), and a
dismissed sequence stays dismissed. The cycle numbers name the *typical* first run — what actually
schedules a row is its phase-visit ordinal or its event, never a hardcoded cycle.

---

## 5. The hint list

Copy drafts follow `docs/text-style-guide.md` (second person, present tense, condition → effect,
numbers interpolated — never typed). German is the budget language. All texts are **drafts for
owner approval**; keys live in both catalogs under a new `hint.*` namespace (not `tut.*`, not
`tutorial.*` — both are taken).

### 5.1 Phase hints — banner on the decision screen, first occurrence only

Rendered as a one-line strip above the decision UI (the screen already waits for input — nothing
needs to block). Dismiss with ✕ or by deciding; "Mehr dazu →" opens the linked Probierfeld screen.

| id | Trigger | DE draft | EN draft | Mehr dazu |
| --- | --- | --- | --- | --- |
| **H1** | first-ever run start (blocking card, the one exception) | Autostich spielt sich selbst: Dein Deck schlägt sich durch {cards} Stiche, du entscheidest dazwischen. Verlieren kannst du nicht. Der erste Durchlauf gehört dem Zuschauen — deine erste Entscheidung kommt danach. | Autostich plays itself: your deck fights through {cards} tricks — you decide in between. You cannot lose. The first round is for watching — your first decision comes after it. | grundlagen / stich |
| **H2** | first skill offer (run 1 — Blitz only, §6) | Blitz ist dein erster Archetyp: Seine Skills laden die Blitz-Leiste und entladen sie als Crits. Eine falsche Wahl gibt es nicht. | Lightning is your first archetype: its skills charge the Lightning bar and discharge it as crits. There is no wrong choice. | blitz / karte |
| **H2b** | first skill offer with more than one archetype (run 2+) | Ab jetzt stehen mehrere Archetypen zur Wahl. Dein erster Skill eines Archetyps schaltet ihn frei — mischen ist erlaubt. | From now on, more than one archetype is on offer. Your first skill of an archetype activates it — mixing is allowed. | wahl / kategorien |
| **H3** | first perk offer | Ein Perk wirkt sofort und bleibt bis zum Ende des Laufs. Passt keiner, lehn ab — das kostet nichts. | A perk takes effect immediately and lasts the whole run. If none fits, decline — it costs nothing. | wahl / kategorien |
| **H3b** | perk offer, visit 2 | Der Farbchip nennt die Kategorie, der Rand die Rarität. | The colour chip names the category, the border the rarity. | wahl / raritaet |
| **H5** | first skill offer with all slots full | Deine {slots} Slots sind voll: Eine neue Wahl ersetzt ab jetzt einen alten Skill — was er schon ausgezahlt hat, bleibt. | Your {slots} slots are full: a new pick now replaces an old skill — what it already paid out stays. | wahl / perks |

The formation and architect phases carry no descriptive hint — they get **suggestion sequences**
instead (§5.2), which teach the same content as tasks.

### 5.2 Suggestion sequences — the working phases teach by task (owner direction, 2026-08-27)

The formation and architect phases are the two places the player *does* something rather than
picks something. There, a description ("formations multiply score") is the weakest form of
teaching and a **doable task** is the strongest — the player learns the rule by producing its
effect. So these phases get a short sequence of task-shaped suggestions, one per phase visit,
instead of a one-shot phase hint.

This supersedes the guided-run decision "nur erklären, nie empfehlen" (plan §13.2) the same way §6
does: the drift objection was aimed at *content-specific* picks ("build building X"). These
suggestions are **mechanic-shaped** — they name only mechanics as old as the game (Farbblock,
Distrikt, Struktur), pull every display name from the registries at render time
(`formationName()`, measured — the guided run's `tutorialVars.js` pattern), and so cannot go stale.

| id | Trigger | DE draft | EN draft | Mehr dazu |
| --- | --- | --- | --- | --- |
| **S-F1** | formation phase, visit 1 | Fang mit einem Segment an: Schieb gleiche Farben zusammen — das ergibt einen {farbblock}, und Formationen vervielfachen den Score ihrer Karten. | Start with one segment: push same colours together — that makes a {farbblock}, and formations multiply their cards' score. | aufstellung / formationen |
| **S-F2** | formation phase, visit 2+ | Dein nächstes Muster: Die Legende zeigt, welche Formationen es gibt — jede weitere multipliziert dazu. | Your next pattern: the legend shows which formations exist — each additional one multiplies on top. | aufstellung / formationen |
| **S-F3** | formation phase, visit 3+ | Formationen dürfen sich überlappen — eine Karte kann in mehreren Mustern stecken. | Formations may overlap — one card can sit in several patterns. | aufstellung / stapeln |
| **S-A1** | architect phase, visit 1 | Setz dein erstes Gebäude irgendwo aufs Brett. Es wirkt auf die Karte unter ihm — seinen Bonus zahlt es nur, wenn die ihren Stich gewinnt. | Place your first building anywhere on the board. It affects the card beneath it — and pays its bonus only if that card wins its trick. | architekt / wasist |
| **S-A2** | architect phase, visit 2+ | Bau einen Distrikt: Setz ein gleichartiges Gebäude neben dein erstes — Nachbarn derselben Art verstärken sich. | Build a district: place a matching building next to your first — neighbours of the same kind reinforce each other. | architekt / wohin |
| **S-A3** | architect phase, visit 3+ | Dein Fernziel: Eine volle Zeile, Spalte oder Diagonale schließt eine Struktur und legt einen Faktor auf alle Positionen darin. | Your long game: a full row, column or diagonal closes a structure and puts a factor on every position inside it. | architekt / wohin |
| **S-A4** | architect phase, visit 4+ | Ein Gebäude ist nie festgenagelt: Aufwerten, versetzen und abreißen darfst du jederzeit. | A building is never nailed down: upgrade, move and demolish any time. | architekt / aufwerten |

Sequence rules:

1. **One suggestion per phase visit, at most** — it occupies the phase's banner slot, so the
   pacing picture of a visit never changes: one line.
2. **A step whose goal is already met is skipped**, checked with the same pure functions the
   Probierfelder call (`computeFormations` for the Farbblock, `neighborCounts` /
   `structureFactorMap` for district and structure — measured, all exported). A player who builds
   a district on visit 1 never sees S-A2; the sequence advances to what they have not done.
3. **The sequence ends when its steps are exhausted or dismissed.** No tracking UI, no quest log,
   no completion reward — the game's own factor chips and legend markers are the confirmation
   (and E6 narrates the first formation that scores). Each step fires once. S-A3 is deliberately
   phrased as an outlook ("Fernziel"), not a this-visit task: a full row on the 8-wide board takes
   several phases of persistent buildings, and detecting "genuinely reachable" is not worth the
   machinery.
4. Terminology is the game's: **Struktur** and **Distrikt** for building geometry, never
   "Formation" (the tut-proberunden tripwire).

S-F1 is deliberately concrete (one segment, one colour): the first formation phase has {energy}
swaps, and the old plan measured that patterns are reachable in the first formation phase across
2000/2000 seeds (recorded in `tutorial-guided-run-plan.md` §13.9c — not re-measured here). The
segment rule still gets its explicit sentence in E6, with a live referent.

### 5.3 Event hints — during play, first occurrence only

The run pauses (existing overlay-pause pattern), a small card appears near the status bar naming
what just happened, "Weiter" resumes. Spotlighting is not needed — the event itself is the
spotlight. Respects the three FX levels (`useFxLevel`), per the guided-run playtest learnings.

| id | Trigger | DE draft | EN draft | Mehr dazu |
| --- | --- | --- | --- | --- |
| **E1** | first won trick | Dein erster Sieg: {win} Basispunkte. Serie, Crits, Formationen und Gebäude legen sich als Faktoren darauf. | Your first win: {win} base points. Streak, crits, formations and buildings stack on top as factors. | grundlagen / score |
| **E2** | first tie | Gleichstand: Niemand punktet. Nur Siege zahlen. | A tie pays nobody. Only wins score. | grundlagen / stich |
| **E3** | streak reaches 3 | Serie {n}: Dein Serien-Faktor steht auf ×{mult}. Eine Niederlage setzt ihn zurück. | Streak {n}: your streak factor stands at ×{mult}. One loss resets it. | grundlagen / serie |
| **E4** | first crit | Crit: Dieser Stich zählt ×{critMult}. Crit-Chance kommt aus Präzisions-Perks — und aus Blitz. | Crit: this trick counts ×{critMult}. Crit chance comes from precision perks — and from Lightning. | blitz / karte |
| **E5** | first resource bar appears | Das ist deine {arch}-Leiste. Sie füllt sich in den Stichen und treibt deine Skills an. | This is your {arch} bar. It fills during tricks and powers your skills. | *\<arch\>* / karte |
| **E6** | first formation scores in play | Formation {name}: Diese Karte zählt ×{mult}. Muster zählen nur innerhalb eines Segments. | Formation {name}: this card counts ×{mult}. Patterns only count inside one segment. | aufstellung / formationen |
| **E7** | first milestone reached | Meilenstein erreicht — das bringt dir Stichpunkte für den Upgrade-Baum nach dem Lauf. | Milestone reached — that earns you trick points for the upgrade tree after the run. | danach / punkte |
| **E8** | first-ever run end | Dein Lauf zählt: Stichpunkte für den Upgrade-Baum, Deckpunkte für die Werkstatt. Alles Weitere probierst du im Probierfeld aus — jederzeit. | Your run counts: trick points for the upgrade tree, deck points for the workshop. Everything else you can try in the playground — any time. | danach / endscreen |

E3, E4 and E6 interpolate the **actual current values** from run state — the guided run's rejected
"example math" ({exStreak}/{exStreakMult}) becomes real math with a live referent. The currency
words in E7/E8 render via `t("common.cur.*")`-backed phrasing, never a literal "SP"/"TP"
(the tut-proberunden planning report documents why).

### 5.4 Pacing rules

Without these, cycle 1 can stack E1+E2+E3+E5 and rebuild the wall this paper removes:

1. **At most one event hint per trick, at most two per play phase.** A hint whose event fires while
   the quota is spent is *not* queued — it waits for the event's next occurrence. Every listed
   event recurs naturally, so nothing is lost, only deferred.
2. E5 outranks the others in its play phase (it explains a UI element that just appeared and stays).
3. Phase hints (H*) and suggestions (S-*) are exempt — they never stack, one per decision screen
   by construction (§5.2 rule 1).
4. Everything is per-profile persisted (`as_hints_seen`, added to `RESET_KEYS`) — first occurrence
   means first in the profile's life, not per run. **No hint ever repeats.**

### 5.5 Conditional phases and legendary

Carried over from the guided run unchanged in spirit — the phase already blocks, one sentence, now
with a link:

| id | Trigger | DE draft (main's texts, trimmed) | Mehr dazu |
| --- | --- | --- | --- |
| **C1** | first glacier pick | Nach jedem Eis-Skill wählst du genau eine Karte für den Gletscher — dieser Schritt ist Pflicht. | eis / feld |
| **C2** | first target select | Dieser Perk braucht Karten: Tippe so viele an, wie er verlangt. | wahl / kategorien |
| **C3** | first family target | Diese Perk-Familie braucht ein Ziel — wähle, worauf sie wirken soll. | wahl / kategorien |
| **C4** | legendary phase (cycle {cycle}) | Ein legendärer Skill aus deinen aktiven Archetypen: eigener Slot, kein Tausch. | wahl / legendaer |

**Total: 6 phase hints + 7 suggestions + 8 event hints + 4 conditionals = 25 across a profile's
whole life** — the §4a curriculum lays them on the first run's timeline. The guided run carried 42
keys of body text plus coach-mark chains; the sections carry 730. This layer is deliberately the
smallest of the three, and it spends its budget across 50 cycles instead of the first five
minutes.

---

## 6. The first skill choice — skip it first, then gate it

Facts first (all measured): fresh profile → fire + lightning only → offer of 6 skills, 3 per
archetype; each offered consumer archetype has its consumer guaranteed in the offer (#191/#223);
`SKILL_SLOTS` = 6; the offer is the first screen of the game (§1).

### 6.1 Skip the opening skill phase in the first run (owner direction, 2026-08-28)

**In the profile's first run, the start decision is skipped entirely: the run opens straight into
cycle 1's play phase.** The player's first decision becomes cycle 2's perk (the gentlest choice in
the game), and the first *skill* offer arrives on schedule at cycle 5 — after four play phases, a
perk, a formation and a building. Nobody chooses anything before they have seen what choosing is
for. From run 2 the schedule reads normally.

**Why this is cheap where the earlier "watch-first" idea was expensive.** This paper's first cut
rejected a watch-first cycle because the mechanism assessed then was a schedule fork
(`devSchedule`). The owner's version needs no schedule change at all: the schedule stays byte-
identical, and only the *start decision handler* is touched — the same `START_RUN` site the §6.2
gate lives at, which already contains this exact fallback shape (observed, `reducer.js`: empty
skill pool → perk offer → `{ phase: "play" }` as the last resort). A first-run branch takes the
existing `phase: "play"` exit. The offer's rng draw is an addressed sub-stream
(`rngAtOr("skill", 0)`, observed), not a shared sequence, so skipping the draw shifts nothing —
the implementing task verifies this before relying on it.

**What it costs (computed from the schedule):** run 1 has 9 skill picks instead of 10 (the
schedule holds skill phases before cycles 1·5·9·13·17·21·25·33·39·43 — the in-code comment saying
"9 Skill / full at 22" predates #293 and is stale), and the six slots fill by cycle 25 instead of
21. A mildly slower first build in a run that cannot be lost — acceptable, and invisible to a
player with no baseline. The rejection of the *schedule-fork*
mechanism stands; the idea it carried was right and is hereby adopted in its cheap form.

### 6.2 When the skill offer does come: Blitz only

**Owner direction (2026-08-27): the first run offers only Blitz.** This paper adopts it — the
supporting evidence is better than a taste call:

- **Blitz is measurably the leanest archetype to explain.** The `dev` sections needed **3 lessons
  for Blitz** against 5 for Feuer, 5 for Pflanze, 4 for Eis (measured — catalog on `origin/dev`).
  The game's own teaching material already ranked the archetypes by complexity; Blitz won.
- **Blitz teaches the game's core lesson with the loudest feedback.** Its loop — charge the bar,
  discharge as crits — manufactures the multiplier event the whole score system is built on
  ("Bei allen anderen Archetypen ist er Zufall. Blitz stellt ihn selbst her", `tut.blitz.wasist.0`).
  E4 (first crit) and E5 (first bar) land in run 1 with high probability instead of by luck.
- **The pool sustains it.** 21 skills per archetype (measured, `SKILL_DEFS`), 16 legendaries
  across all four — a Blitz-only run feeds all of its skill phases without exhausting; and the
  engine already degrades an empty skill pool to a perk offer (observed), so there is no cliff.

**The first skill screen (cycle 5, after §6.1) then reads:** three Blitz skills, one badge. The
badge sits on the guaranteed **Blitz consumer** — DE **„Guter Start"** / EN **"Good start"** —
because picking the consumer makes the charge loop visible in the very next play phase, which E5
then names. The badge rule stays
**rule-derived, not curated** (the guided-run plan §13.2 rejected hardcoded picks for drift
reasons, and that reasoning still holds): "the consumer of the offered archetype", shipped as one
pure function, moves with every balance pass. A guard test asserts the badge finds its skill in a
fresh profile's first offer.

**Mechanism — smaller than every alternative.** The allowlist already exists end to end:
`buildSkillOffer(..., unlockedArchetypes)` filters offers per run (measured, §4b Archetyp-Gatung),
and the reducer feeds it from the profile's tree at `START_RUN`. The gate is: **when
`hadCompletedRun` is false, the run starts with `unlockedArchetypes = ["lightning"]`** —
a run-level parameter like seed and week mods, not new engine logic. The sim/standard path passes
`null` and stays byte-identical; `hadCompletedRun` is the same existing flag the hub's loud
first-contact offer keys on (measured, `StartScreen.jsx`), so an aborted first run stays gated and
the gate lifts exactly when the loud offer disappears. From run 2 the profile's normal tree gating
applies: Blitz + Feuer, later Eis/Pflanze — see §7.

**Costs, stated honestly:**

- **A full run (50 cycles) without an archetype direction choice.** The bet is that perks,
  formations and the architect carry enough decision variety for one run, and that a no-lose game
  makes the constraint painless. This is the thing the first playtest must answer; the revisit
  trigger is a first-time player saying "why can't I pick fire".
- The first run still counts for stats and leaderboard as a constrained run — same precedent the
  guided run's fixed seed set, and shallower.
- It touches the `START_RUN` payload (reducer edge, not `src/game/` engine logic). The task
  carries the tripwire anyway.

**Rejected, recorded:**

- **Two badges on both archetypes' consumers** (this paper's earlier Stage 1+2). Superseded: the
  Blitz gate removes the six-way screen entirely instead of annotating it, for less mechanism than
  the two-card reduced offer would have needed.
- **In-run unlock (Blitz-only for the first skill phase, Feuer from cycle 5).** Softer, but
  `unlockedArchetypes` is per-run state; making it cycle-dependent is real engine logic with
  determinism surface. The per-run gate buys nearly the same ramp for a payload field.
- **Auto-pick / forced first skill.** Even within Blitz, the three-way pick is worth keeping — a
  no-lose game makes a free choice safe, and the badge already carries the undecided player.
- **A watch-first cycle via a schedule fork** (`devSchedule` override — observed). Rejected as a
  *mechanism* only; the idea is adopted in §6.1 through the start-decision handler, which needs no
  schedule change and no new mode.

---

## 7. The ramp — what exists, what changes, what stays dead

The owner is open to removing early content or introducing it over time. Finding: **the ramp
already exists — it is the upgrade tree**, and the job is to use it, not to rebuild it:

- Archetypes: fire + lightning free; ice and plant are tree purchases (measured, 4 SP each).
- Rarity ceiling and the legendary perk layer: tree-gated (measured, `nodeEffects`).
- The legendary phase: cycle 29, and only with the tree's legendary levels (measured).

With §6 in front of it, the ladder reads: **run 1 = watch first, then Blitz only → run 2 = Blitz +
Feuer → tree purchases = Eis, Pflanze, higher rarity, the legendary layer.** Each rung introduces exactly
one new thing, and each rung's first appearance is what H2b and the first-occurrence hints narrate.
Two consequences:

1. **Beyond §6, no new gating is proposed.** Principle 5 (never explain what the tree has not
   unlocked) plus first-occurrence triggers make the hint layer track the ramp automatically — a
   player who buys ice meets C1 exactly when it first matters.
2. **The SP-onboarding chain stays inert.** Owner-confirmed in the sections round (H1 there);
   nothing here rewires it.

Gating perks or the architect out of early runs is **not** proposed — the schedule's four-block is
the game's identity and each block already gets exactly one banner.

---

## 8. The Probierfeld — rebuilding the `dev` sections to complement the hints

**Owner verdict (2026-08-27): the `dev` tutorial as it stands is still too much text and too hard
to navigate — get rid of it or rebuild it as a complement to the hint layer.** This section is the
rebuild proposal; full deletion is assessed and rejected at the end.

**What the catalog actually holds (measured, `origin/dev`):** 48 lessons. **37 are already pure
probe screens** — Probierfeld plus one Tipp, zero reading beats; the Proberunden pass did that
conversion. **11 are text-only lessons** (the five archetype/section "wasist" screens, `formel`,
`phase`, `perks`, `regeln`, `aufwerten`, `rangliste`). So the overload is not the interactive
content — it is (a) the 11 explainer lessons, whose job the in-run hints now do, and (b) the
three-level curriculum shell (Themenliste → Lektionsliste → Lektion) over 48 entries.

**The rebuild — cut the text, flatten the shell, keep every probe:**

1. **Delete the 11 text-only lessons.** Each one's job has a better home now: the phase and
   archetype intros are H1–H3, H2b and the suggestion sequences (§5); word-level definitions are
   the Glossar's job (the sections' own planning rule — a lesson links the glossary, never
   restates it — applied retroactively); archetype strategy is the Leitfaden's. Sentences worth
   keeping (e.g. `tut.blitz.wasist.0`, "Blitz stellt ihn selbst her") move into the one intro
   Satz of the neighbouring probe screen, not into a screen of their own.
2. **Flatten the navigation.** One flat list of probe screens, grouped under the run's own phase
   names — no topic level, no lesson level, no resume row, no global progress. A pull-only
   reference reached mostly through "Mehr dazu" deep links needs an index, not a curriculum.
3. **Rename it.** Hub chip and title become DE **„Probierfeld"** / EN **"Playground"** — the name
   the players already meet inside the lessons, and a word that promises trying, not studying.
   "Tutorial" now names the in-run hint layer, which matches what players expect the word to mean.
   The loud first-contact offer above "Lauf beginnen" starts **the first run** (where H1/H2
   receive the player), never the list.
4. **Deep links.** The shell gains an optional `initial={sectionId, lessonId}` prop (observed: it
   resolves lessons internally today; no external entry). "Mehr dazu" opens the exact probe, run
   paused underneath, close returns to the run.
5. **The form is locked to probe + Tipp.** The 400 px "kurz" budget and the beat-kind guard exist
   (measured — `catalog.js`, `test/tutorial-sections.test.js`); after the cut the only allowed
   screen shape is the one 37 screens already have, and the guard enforces what the first build's
   budget could not.

**Retargeting the hints.** The "Mehr dazu" targets that pointed at deleted text lessons are
remapped in the tables above: H1 → `grundlagen/stich` (the "Vier Stiche. Sieh zu." probe — a
better first touch than any intro screen), H2/E4 → `blitz/karte`, E5 → the archetype's `karte`
probe, H2b/H3/C2 → `wahl/kategorien`, C1 → `eis/feld` (the Gletscherfeld probe). A guard test
asserts every hint target exists in the catalog, so the next catalog cut cannot silently orphan a
link.

**Full deletion, assessed and rejected.** Deleting the feature entirely would discard the 37 probe
screens — the only teaching asset in the project that is *structurally incapable of drifting*,
because it calls the live game functions (`computeFormations`, `boardFactorMap`, …). The hints
deliberately stay at one to two sentences; without the probes, "Mehr dazu" would dead-end in
glossary definitions, and the depth layer of §3 would be gone. The text and the shell are the
problem; both are removable without touching a single probe. If the owner still wants full
deletion after seeing the rebuilt flat Probierfeld, the teardown follows the same guard checklist
the sections round documented for the guided run (dead keys, `MIGRATED` ratchet, foreign tests).

---

## 9. Build sketch and task cut

All UI-layer except the optional Stage 2. New surface (proposed):

- `src/ui/hints/hintScript.js` — the hints as data: id, trigger, i18n key, vars, Probierfeld target.
  Same data-not-text discipline as both predecessors; numbers interpolated from `constants.js`.
- `src/ui/hints/useHints.js` — watches `state.phase`, offer fields and play events; per-profile
  seen-set; pacing rules from §5.3. Far smaller than the removed guided-run engine: no seed, no
  spotlight, no anchor system, no progress counter.
- `src/ui/hints/HintCard.jsx` — the banner (decision screens) and the pause card (play events).
  Pause coupling and FX-level compliance per the guided-run playtest learnings (plan §15).
- Storage: `as_hints_seen` in `storage.js` + `RESET_KEYS`.
- i18n: `hint.*` in `de.js`/`en.js` (and the other catalogs per current policy); `npm run
  loc:export` in every task that touches these texts.

**To verify in T-O2 before relying on it** (observed, not measured): which play events are readable
from UI-visible state — the Battlefield renders result banners and big calls today, and the trick
log feeds the score-source panel, so win/tie/crit/formation/streak signals exist somewhere between
engine output and those renderers. The task's first step is naming those fields; if one (likely the
milestone tick) is not surfaced, surfacing it read-only is in scope, `src/game/` changes are not.

| # | Task | Depends on | Content |
| --- | --- | --- | --- |
| **T-O1** | Hint engine + phase hints (H1–H3, H3b, H5, H2b, C1–C4) + suggestion sequences (S-F1–3, S-A1–4 with visit counters and done-predicates over the exported pure functions), banner + pause card, storage, i18n | — | 17 hints |
| **T-O2** | Event hints (E1–E8), signal plumbing, pacing rules | T-O1 | 8 hints |
| **T-O3** | First-run start behaviour (§6): skip the opening skill decision (§6.1) and gate the run to Blitz (§6.2), both keyed on `hadCompletedRun` at the `START_RUN` site; "Guter Start" badge on the Blitz consumer; guard tests (skip and gate lift after first completed run; rng streams unshifted; badge finds its skill; sim path byte-identical) | — | 1 short text |
| **T-O4** | Probierfeld rebuild (§8): delete the 11 text lessons and their keys, flatten the shell to one grouped list, rename, deep-link prop, hint-target guard, hub first-contact offer → first run | T-O1 for the link wiring | −11 lessons |

T-O3 and T-O4 are independent of T-O2. The work builds on `dev` (the sections live there; the
guided run is already removed there).

---

## 10. Open owner decisions

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | Copy approval for all DE/EN drafts in §5 and §6 | — (owner voice check) |
| 2 | The `dev` sections: rebuild to the flat Probierfeld (§8) vs. delete entirely | rebuild — the 37 probes are the one drift-proof asset; only text and shell go |
| 3 | First-run start (§6): skip the opening skill phase (6.1) + Blitz-only offers (6.2) — both owner-directed; the playtest question that can reopen them: does a full run without an archetype choice stay fun? | build both; watch the first playtests |
| 4 | Naming for the rebuilt layer: „Probierfeld"/"Playground" vs. alternatives | Probierfeld |
| 5 | Event-hint pause behaviour: pause on every E-hint (proposed) vs. non-blocking toast | pause — a missed referent is worse than a beat of stillness |

---

## 11. What this session verified, and how

Measured directly in this checkout / on `origin/dev`: `BASE_SCHEDULE` order and its opening
`skill`; `SKILLS_OFFERED` = 12 with archetype gating via `unlockedArchetypes`
(fire+lightning base, ice/plant tree nodes at 4 SP); the consumer guarantee in `buildSkillOffer`;
the `scarceSkills` reduced-offer path; the `devSchedule` override; 21 skills per archetype in
`SKILL_DEFS` (16 legendaries across all four); the empty-skill-pool → perk fallback in the engine;
the section lesson counts per archetype (Blitz 3 · Eis 4 · Feuer 5 · Pflanze 5); the lesson census
behind §8 (48 lessons: 37 probe-plus-Tipp, 11 text-only, classified from the catalog's beat kinds);
the `dev`
catalog's 10 sections and lesson ids (all "Mehr dazu" targets in §5 exist on `dev`);
`formationName()` / `FORMATION_LABELS` as render-time name sources and `computeFormations`,
`neighborCounts`, `structureFactorMap`, `districtFactorMap` as exported pure functions for the
§5.2 done-predicates;
`TutorialSections`' current prop surface; 730 `tut.*` keys on `dev` vs. 42 `tutorial.*` on `main`.
Not run: any build, test, or measurement of the proposed UI — this is a design paper, and no gate
is claimed.
