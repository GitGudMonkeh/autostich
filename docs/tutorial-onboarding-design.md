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
4. **Push the minimum, pull the rest.** Every hint links one Handbuch lesson ("Mehr dazu"). The
   Handbuch (the `dev` sections) is the depth layer — reached by curiosity, never by obligation.
5. **Never explain what the tree has not unlocked.** The upgrade tree already ramps content
   (archetypes, rarity, legendary layer — measured in `nodeEffects()`). First-occurrence triggers
   honour this by construction: what cannot appear cannot fire.

## 3. Division of labour (extends the existing three layers)

| Layer | Answers | Form |
| --- | --- | --- |
| **Hints** (new, this paper) | "what just happened / what do I decide now" | 1–2 sentences in the run, first occurrence only, each with a "Mehr dazu" link |
| **Handbuch** (the `dev` sections) | "how does this system work" | lessons with Proberunden, pull-only |
| **Glossar** | "what does this word mean" | 109 entries, on demand |
| **Leitfaden** | "how do I play Feuer" | 4 archetype guides |

The `dev` build stays. This paper does not shrink or rewrite the sections — it stops them from
being the front door.

---

## 4. The first-contact arc

What a brand-new profile experiences, cycle by cycle (schedule: skill → perk → formation →
architect, measured):

- **Run start:** one welcome card (H1) — the only blocking full card in the whole system.
- **Cycle 1, skill choice:** the offer opens immediately and shows **Blitz only** (§6 — the
  owner-directed first-run gate); hint H2 sits as a quiet banner *above* the real offer, and one
  "Guter Start" badge marks the Blitz consumer. Three options, one marked. No pop-up in front of it.
- **Cycle 1, play:** the deck plays. Event hints fire as their events first occur — first win
  (E1), the new resource bar (E5), possibly first tie (E2) — under the pacing rules of §5.3.
- **Cycle 2, perk:** banner H3. **Cycle 3, formation:** banner H4. **Cycle 4, architect:** banner H5.
- **Later, whenever they first happen:** streak (E3), crit (E4), a formation scoring in play (E6),
  first milestone (E7), the conditional phases (C1–C3), the legendary phase in cycle 29 (C4),
  first run end (E8).

After cycle 4 every screen type has been met exactly once, with one banner each — the same arc the
guided run had, at roughly a quarter of its text volume, and with the play-phase teaching moved to
the moments that demonstrate it.

---

## 5. The hint list

Copy drafts follow `docs/text-style-guide.md` (second person, present tense, condition → effect,
numbers interpolated — never typed). German is the budget language. All texts are **drafts for
owner approval**; keys live in both catalogs under a new `hint.*` namespace (not `tut.*`, not
`tutorial.*` — both are taken).

### 5.1 Phase hints — banner on the decision screen, first occurrence only

Rendered as a one-line strip above the decision UI (the screen already waits for input — nothing
needs to block). Dismiss with ✕ or by deciding; "Mehr dazu →" opens the linked Handbuch lesson.

| id | Trigger | DE draft | EN draft | Mehr dazu |
| --- | --- | --- | --- | --- |
| **H1** | first-ever run start (blocking card, the one exception) | Autostich spielt sich selbst: Dein Deck schlägt sich durch {cards} Stiche, du entscheidest dazwischen. Verlieren kannst du nicht. | Autostich plays itself: your deck fights through {cards} tricks — you decide in between. You cannot lose. | grundlagen / wasist |
| **H2** | first skill offer (run 1 — Blitz only, §6) | Blitz ist dein erster Archetyp: Seine Skills laden die Blitz-Leiste und entladen sie als Crits. Eine falsche Wahl gibt es nicht. | Lightning is your first archetype: its skills charge the Lightning bar and discharge it as crits. There is no wrong choice. | blitz / wasist |
| **H2b** | first skill offer with more than one archetype (run 2+) | Ab jetzt stehen mehrere Archetypen zur Wahl. Dein erster Skill eines Archetyps schaltet ihn frei — mischen ist erlaubt. | From now on, more than one archetype is on offer. Your first skill of an archetype activates it — mixing is allowed. | wahl / perks |
| **H3** | first perk offer | Ein Perk wirkt sofort und bleibt bis zum Ende des Laufs. Passt keiner, lehn ab — das kostet nichts. | A perk takes effect immediately and lasts the whole run. If none fits, decline — it costs nothing. | wahl / perks |
| **H4** | first formation phase | Tausche Karten, bis ein Muster entsteht — Formationen vervielfachen den Score ihrer Karten. Jeder Tausch kostet eine deiner {energy} Energien. | Swap cards until a pattern forms — formations multiply their cards' score. Each swap costs one of your {energy} energy. | aufstellung / formationen |
| **H5** | first architect phase | Lege ein Gebäude aufs Brett. Es wirkt auf die Karte unter ihm — zahlt aber nur, wenn die ihren Stich gewinnt. | Place a building on the board. It affects the card beneath it — but it only pays if that card wins its trick. | architekt / wasist |

Deliberately absent from H4: the segment rule. It lands in E6, where a live formation is on screen
as its referent, and in the Probierfeld lesson. Deliberately absent from H5: categories, rotation,
structures, districts — all Handbuch.

### 5.2 Event hints — during play, first occurrence only

The run pauses (existing overlay-pause pattern), a small card appears near the status bar naming
what just happened, "Weiter" resumes. Spotlighting is not needed — the event itself is the
spotlight. Respects the three FX levels (`useFxLevel`), per the guided-run playtest learnings.

| id | Trigger | DE draft | EN draft | Mehr dazu |
| --- | --- | --- | --- | --- |
| **E1** | first won trick | Dein erster Sieg: {win} Basispunkte. Alles Weitere — Serie, Crit, Formation, Gebäude — multipliziert darauf. | Your first win: {win} base points. Everything else — streak, crit, formation, buildings — multiplies on top. | grundlagen / score |
| **E2** | first tie | Gleichstand: Niemand punktet. Nur Siege zahlen. | A tie pays nobody. Only wins score. | grundlagen / stich |
| **E3** | streak reaches 3 | Serie {n}: Dein Serien-Faktor steht auf ×{mult}. Eine Niederlage setzt ihn zurück. | Streak {n}: your streak factor stands at ×{mult}. One loss resets it. | grundlagen / serie |
| **E4** | first crit | Crit: Dieser Stich zählt ×{critMult}. Crit-Chance kommt aus Präzisions-Perks — und aus Blitz. | Crit: this trick counts ×{critMult}. Crit chance comes from precision perks — and from Lightning. | blitz / wasist |
| **E5** | first resource bar appears | Das ist deine {arch}-Leiste. Sie füllt sich in den Stichen und treibt deine Skills an. | This is your {arch} bar. It fills during tricks and powers your skills. | *\<arch\>* / wasist |
| **E6** | first formation scores in play | Formation {name}: Diese Karte zählt ×{mult}. Muster zählen nur innerhalb eines Segments. | Formation {name}: this card counts ×{mult}. Patterns only count inside one segment. | aufstellung / formationen |
| **E7** | first milestone reached | Meilenstein erreicht — das bringt dir Stichpunkte für den Upgrade-Baum nach dem Lauf. | Milestone reached — that earns you trick points for the upgrade tree after the run. | danach / punkte |
| **E8** | first-ever run end | Dein Lauf zählt: Stichpunkte für den Upgrade-Baum, Deckpunkte für die Werkstatt. Alles Weitere steht im Handbuch — jederzeit, Kapitel für Kapitel. | Your run counts: trick points for the upgrade tree, deck points for the workshop. Everything else is in the handbook — any time, chapter by chapter. | danach / endscreen |

E3, E4 and E6 interpolate the **actual current values** from run state — the guided run's rejected
"example math" ({exStreak}/{exStreakMult}) becomes real math with a live referent. The currency
words in E7/E8 render via `t("common.cur.*")`-backed phrasing, never a literal "SP"/"TP"
(the tut-proberunden planning report documents why).

### 5.3 Pacing rules

Without these, cycle 1 can stack E1+E2+E3+E5 and rebuild the wall this paper removes:

1. **At most one event hint per trick, at most two per play phase.** A hint whose event fires while
   the quota is spent is *not* queued — it waits for the event's next occurrence. Every listed
   event recurs naturally, so nothing is lost, only deferred.
2. E5 outranks the others in its play phase (it explains a UI element that just appeared and stays).
3. Phase hints (H*) are exempt — they never stack, one per decision screen by construction.
4. Everything is per-profile persisted (`as_hints_seen`, added to `RESET_KEYS`) — first occurrence
   means first in the profile's life, not per run. **No hint ever repeats.**

### 5.4 Conditional phases and legendary

Carried over from the guided run unchanged in spirit — the phase already blocks, one sentence, now
with a link:

| id | Trigger | DE draft (main's texts, trimmed) | Mehr dazu |
| --- | --- | --- | --- |
| **C1** | first glacier pick | Nach jedem Eis-Skill wählst du genau eine Karte für den Gletscher — dieser Schritt ist Pflicht. | eis / wasist |
| **C2** | first target select | Dieser Perk braucht Karten: Tippe so viele an, wie er verlangt. | wahl / perks |
| **C3** | first family target | Diese Perk-Familie braucht ein Ziel — wähle, worauf sie wirken soll. | wahl / kategorien |
| **C4** | legendary phase (cycle {cycle}) | Ein legendärer Skill aus deinen aktiven Archetypen: eigener Slot, kein Tausch. | wahl / legendaer |

**Total: 6 + 8 + 4 = 18 hints across a profile's whole life**, of which a typical first run meets
eight to ten. The guided run carried 42 keys of body text plus coach-mark chains; the sections carry
730. This layer is deliberately the smallest of the three.

---

## 6. The first skill choice — the Blitz-only first run

Facts first (all measured): fresh profile → fire + lightning only → offer of 6 skills, 3 per
archetype; each offered consumer archetype has its consumer guaranteed in the offer (#191/#223);
`SKILL_SLOTS` = 6; the offer is the first screen of the game (§1).

**Owner direction (2026-08-27): the first run offers only Blitz.** This paper adopts it — the
supporting evidence is better than a taste call:

- **Blitz is measurably the leanest archetype to explain.** The `dev` Handbuch needed **3 lessons
  for Blitz** against 5 for Feuer, 5 for Pflanze, 4 for Eis (measured — catalog on `origin/dev`).
  The game's own teaching material already ranked the archetypes by complexity; Blitz won.
- **Blitz teaches the game's core lesson with the loudest feedback.** Its loop — charge the bar,
  discharge as crits — manufactures the multiplier event the whole score system is built on
  ("Bei allen anderen Archetypen ist er Zufall. Blitz stellt ihn selbst her", `tut.blitz.wasist.0`).
  E4 (first crit) and E5 (first bar) land in run 1 with high probability instead of by luck.
- **The pool sustains it.** 21 skills per archetype (measured, `SKILL_DEFS`), 16 legendaries
  across all four — a Blitz-only run feeds all of its skill phases without exhausting; and the
  engine already degrades an empty skill pool to a perk offer (observed), so there is no cliff.

**Screen one then reads:** three Blitz skills, one badge. The badge sits on the guaranteed **Blitz
consumer** — DE **„Guter Start"** / EN **"Good start"** — because picking the consumer makes the
charge loop visible in the very next play phase, which E5 then names. The badge rule stays
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
- **A watch-first cycle** (run 1 plays before any decision; reachable via the `devSchedule`
  override — observed). Forks the schedule of a counting run; H1 plus a three-option badged screen
  defuses the blind commit more cheaply. Revisit only if playtests still show screen-one stalls.

---

## 7. The ramp — what exists, what changes, what stays dead

The owner is open to removing early content or introducing it over time. Finding: **the ramp
already exists — it is the upgrade tree**, and the job is to use it, not to rebuild it:

- Archetypes: fire + lightning free; ice and plant are tree purchases (measured, 4 SP each).
- Rarity ceiling and the legendary perk layer: tree-gated (measured, `nodeEffects`).
- The legendary phase: cycle 29, and only with the tree's legendary levels (measured).

With the §6 gate in front of it, the ladder reads: **run 1 = Blitz only → run 2 = Blitz + Feuer →
tree purchases = Eis, Pflanze, higher rarity, the legendary layer.** Each rung introduces exactly
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

## 8. The Handbuch — reframing the `dev` sections

Three changes, all small, none touching lesson content:

1. **Deep links.** `TutorialSections` gains an optional `initial={sectionId, lessonId}` prop
   (observed: the shell resolves lessons internally today; no external entry). "Mehr dazu" opens
   the exact lesson, run paused underneath, close returns to the run.
2. **Name and posture.** Hub chip and title become DE **„Handbuch"** / EN **"Handbook"** (owner
   naming decision — alternatives: „Schule", "Guide"). The word "Tutorial" implies an obligation to
   complete; a handbook implies a place to look things up. The loud first-contact offer above
   "Lauf beginnen" now starts **the first run** (where H1/H2 receive the player), not the section
   list.
3. **Progress posture.** Per-section progress rails stay (they serve returning readers); the
   overall "n of 42" line on the topic list is dropped or demoted — completeness is the layer's
   property, not the player's task.

---

## 9. Build sketch and task cut

All UI-layer except the optional Stage 2. New surface (proposed):

- `src/ui/hints/hintScript.js` — the 17 hints as data: id, trigger, i18n key, vars, Handbuch target.
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
| **T-O1** | Hint engine + phase hints (H1–H5, H2b, C1–C4), banner + pause card, storage, i18n | — | 10 hints |
| **T-O2** | Event hints (E1–E8), signal plumbing, pacing rules | T-O1 | 8 hints |
| **T-O3** | Blitz-only first run (§6): `START_RUN` gate on `hadCompletedRun`, "Guter Start" badge on the Blitz consumer, guard tests (gate lifts after first completed run; badge finds its skill; sim path byte-identical) | — | 1 short text |
| **T-O4** | Handbuch: deep-link prop, rename, progress posture, hub first-contact offer → first run | T-O1 for the link wiring | — |

T-O3 and T-O4 are independent of T-O2. The work builds on `dev` (the sections live there; the
guided run is already removed there).

---

## 10. Open owner decisions

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | Copy approval for all DE/EN drafts in §5 and §6 | — (owner voice check) |
| 2 | Handbuch naming: „Handbuch"/"Handbook" vs. alternatives | Handbuch |
| 3 | Blitz-only first run (§6) — confirmed as directed 2026-08-27; the playtest question that can reopen it: does a full run without an archetype choice stay fun? | build it; watch the first playtests |
| 4 | Drop vs. demote the global lesson count on the topic list | demote to per-section only |
| 5 | Event-hint pause behaviour: pause on every E-hint (proposed) vs. non-blocking toast | pause — a missed referent is worse than a beat of stillness |

---

## 11. What this session verified, and how

Measured directly in this checkout / on `origin/dev`: `BASE_SCHEDULE` order and its opening
`skill`; `SKILLS_OFFERED` = 12 with archetype gating via `unlockedArchetypes`
(fire+lightning base, ice/plant tree nodes at 4 SP); the consumer guarantee in `buildSkillOffer`;
the `scarceSkills` reduced-offer path; the `devSchedule` override; 21 skills per archetype in
`SKILL_DEFS` (16 legendaries across all four); the empty-skill-pool → perk fallback in the engine;
the Handbuch lesson counts per archetype section (Blitz 3 · Eis 4 · Feuer 5 · Pflanze 5); the `dev`
catalog's 10 sections and lesson ids (all "Mehr dazu" targets in §5 exist on `dev`);
`TutorialSections`' current prop surface; 730 `tut.*` keys on `dev` vs. 42 `tutorial.*` on `main`.
Not run: any build, test, or measurement of the proposed UI — this is a design paper, and no gate
is claimed.
