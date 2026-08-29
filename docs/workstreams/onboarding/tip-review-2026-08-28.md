# Tip review, 2026-08-28 — collected changes (owner walkthrough)

Working document for the tip-by-tip review round. The owner dictates changes per tip; nothing is
implemented until the walkthrough is done, then everything lands in one task. German copy below is
the binding wording (EN/ES/ZH follow at implementation). Style rule enforced here: **no em-dash in
player text** (text-style-guide.md, "Kein Gedankenstrich").

## Status: IMPLEMENTED (task/tip-review → dev, 2026-08-28) — next: owner playtest round 2.
Implementation record: docs/workstreams/onboarding/onb-tipreview/task-contract.md on dev.

## Hints

| # | Hint | Change |
| --- | --- | --- |
| 1 | **H1** (welcome card) | New body: "Autostich spielt sich selbst: Dein Deck kämpft die {cards} Stiche allein, du triffst die Entscheidungen dazwischen." + "Bei jedem Stich decken beide Decks ihre oberste Karte auf. Die höhere gewinnt, die Farbe spielt keine Rolle." ({cards} stays a constant placeholder.) |
| 2 | **E1** (first win) | "Dein erster Sieg: {win} Basispunkte. Serie, Crits, Formationen und Gebäude werden mit dem Basisscore multipliziert." (replaces "legen sich als Faktoren darauf") |
| 3 | **H3** (first perk) | Neutral wording (owner decision): "Ein Perk wirkt sofort und bleibt bis zum Ende des Laufs. Passt keiner, kannst du ablehnen." (The "das kostet nichts" claim goes; declining forfeits the perk.) |

| 7 | **U1** (tempo bar) | "Mehr dazu" link goes. The Probierfeld page `grundlagen/anzeigen` ("Der Lauf-Bildschirm") is deleted entirely; U3 links there too and loses its link with it (pending owner confirmation on U3). |
| 8 | **E6** (first formation scores) | Fires too early today (a dealt formation before the first Aufstellung). New timing: only AFTER the player's first formation phase, and preferably on a **Farbblock** multiplier, closing the loop with S-F1 ("bau einen Farbblock"). Proposed fallback: if no Farbblock has scored by the second Aufstellung, the next scoring formation of any type triggers it, so the hint cannot starve. Also: the "Mehr dazu" link goes (not needed here; the lesson itself stays, S-F1/S-F2 still link it). |

| 9 | **S-F1** (first Aufstellung) | New copy, dash-free: "Tippe zwei Karten an, um ihre Position zu tauschen. Versuch, in einem Segment gleiche Farben zu sammeln." Plus: while S-F1 is visible, mark one segment (the first) with the tutorial accent frame ("eventuell", owner). Note: the word "Farbblock" drops out of S-F1; the E6 loop then leans on the in-game FARBBLOCK label. |

| 11 | **E3** (streak 3) | Copy stays as shipped (owner: passt). "Mehr dazu" link goes, not needed here. |

| 12 | **S-A1** (first architect) | Mechanic made precise, dash-free: "Setz dein erstes Gebäude irgendwo aufs Brett. Es wirkt auf die Karte unter ihm: Der Score-Bonus zahlt nur bei Sieg, Boni auf den Stichwert zahlen immer." |

| 13 | **S-A1** addendum | The "Mehr dazu" link goes here as well. |
| 14 | **NEW hint (C5, architect board full)** | Once per profile, in the first architect phase where **none of the offered building plans has a valid placement** (owner refinement: 19/20 can already be unbuildable when the offered shapes do not fit; check placements, not free-cell count): a banner pointing out the limited build space and that demolishing or upgrading is the way on. Draft, dash-free: "Dein Baufeld ist voll. Der Platz ist begrenzt, aber nichts steht fest: Reiß ein Gebäude ab oder werte eins auf." While it shows, the Baufeld panel (occupancy readout) carries the tutorial glow (banner-anchored highlight, like the event-card spotlight but without the scrim). |

| 15 | **H2** (first skill, Blitz) | "jeder Crit lädt die Leiste" says nothing to a player; "Eine falsche Wahl gibt es nicht" is fluff, both go. The bar is called **Ladungsleiste** from now on, everywhere it is named (H2, E5 Blitz body, badge reason). Draft, dash-free: "Blitz ist dein erster Archetyp. Ein Crit vervielfacht den Score eines Stichs. Blitz-Skills machen Crits wahrscheinlicher, und jeder Crit füllt deine Ladungsleiste." |

| 17 | **U2** (panels) | Compact, dash-free: "Hier siehst du deine Multiplikatoren und deine Score-Herkunft." (Spotlight already points at the panel, so "hier" carries the reference.) The "Mehr dazu" link goes. |

| 18 | **S-F2** (second Aufstellung) | New copy, dash-free: "Versuch nun, innerhalb eines gleichfarbigen Segments weitere Formationen zu bilden, zum Beispiel eine Treppe." Its Mehr-dazu page gets the same rebuild style as formationen: example segments carrying SEVERAL formations at once (overlap), browsable via buttons. Home for that content: `aufstellung/stapeln` (overlap is its topic); S-F2 retargets there, S-F3 already points there. Mockup approved: https://claude.ai/code/artifact/ca889e2c-9a74-4abf-87dc-ee80f4415bb0. |

| 19 | **S-A2** (district) | Dash-free rewrite: "Bau einen Distrikt: Setz ein Gebäude derselben Kategorie, also gleicher Farbe, neben dein erstes. Solche Nachbarn verstärken sich." Its Mehr-dazu page (`architekt/wohin`) is rebuilt to show **district examples only**, rendered like the real game board (no abstract slim-bar grid as today). Mockup (revised per owner: real multi-cell building SHAPES drawn as ONE contiguous frame per building, board is the true 5x8 grid): https://claude.ai/code/artifact/6e2daff6-99ba-465b-aa2f-6fda9e7562c8 — awaiting final approval. |

| 20 | **NEW lesson `architekt/strukturen`** (owner decision) | The Zeile/Spalte/Diagonale examples move to their own page in the same board style (real building shapes, true 5x8 grid, categories mixed to show they do not matter). S-A3 retargets there; the page is what the next architect phase's suggestion links to. Mockup: https://claude.ai/code/artifact/42fbe019-db98-43f8-8da6-65955463ac2d — awaiting approval. |

| 21 | **E9** (Kampfwert) | Copy stays (dash goes with the sweep). "Mehr dazu" link goes. |

| 22 | **Card visual (outside the hints)** | The Stichwert bonus shown on a card in the trick (e.g. "+1 Stich" at the card foot) renders in WHITE from now on; the current red is hard to read. |

| 23 | **U3** (Chronik) | "Mehr dazu" link goes (copy stays). Together with row 7 this settles U3: the deleted anzeigen page needs no replacement target. |

| 24 | **S-F3** (third Aufstellung) | Replaced (overlap now lives in S-F2's rebuilt page). New copy, dash-free: "Formationen gehen nie über Segmentgrenzen hinaus. Versuch deshalb, in jedem Segment eigene Formationen zu bauen." "Mehr dazu" link goes. |

| 25 | **S-A3** (structures) | "Fernziel" reads oddly; compact rewrite, dash-free: "Versuch, neben Distrikten auch volle Zeilen zu bauen: Sie schließen eine Struktur und verstärken jede Position darin." The "Mehr dazu" link STAYS and opens the new `architekt/strukturen` page (row 20). |

| 26 | **UI copy (outside the hints)** | The architect button "Nichts bauen · Fortfahren →" gets cut off on the phone; shorten to "Nichts bauen →" (all four catalogs). |

| 27 | **U4** (breakdown line) | "Mehr dazu" link goes (copy stays). |

| 28 | **S-A4** (buildings movable) | Reworded ("festgenagelt" sounded odd), owner picked variant A: "Du kannst jedes Gebäude jederzeit aufwerten, versetzen oder abreißen." Link and its page (`architekt/aufwerten`) stay as they are. |

| 29 | **StatusBar bug (outside the hints)** | The border around the SERIE cell shifts whenever the streak number changes width (content-driven cell). Give the cell a stable width so the frame stays fixed. |

| 30 | **NEW hint (H4, glossary)** | Later in the run, at a perk choice (proposed: third perk visit, after H3/H3b are done): a banner that the i button opens the Glossar for looking things up. Draft, dash-free: "Das i oben öffnet das Glossar: Dort schlägst du fast alles nach." While it shows, the i button carries the tutorial glow (same banner-anchored highlight as C5). |

| 31 | **H5** (slots full) | Copy stays (dash goes with the sweep). "Mehr dazu" link goes. |

| 32 | **Card visual, Farballianz (outside the hints)** | With a 3- or 4-color alliance the card still shows only ONE partner color: `linkedPartnerOf` (shop.js) returns a single partner and Card.jsx renders one diagonal ally-color wash. Build variants: all partner colors of the group render as two/three diagonal bands in the lower half (same spot, same opacity, purely cosmetic). Mockup approved with one revision: opacity raised a touch (hex alpha 33 = 20 percent instead of today's 24 = 14 percent, applies to the existing 2-color wash too): https://claude.ai/code/artifact/84425a62-eb63-4060-9d46-32c89ccaad7b |

| 33 | **E8** (end screen) | Compact rewrite covering Stichpunkte, Deck-Punkte AND Meilensteine; the Probierfeld sentence and the "Mehr dazu" link go. Final (owner picked A, "Dein Lauf zählt" dropped): "Stichpunkte fließen in den Upgrade-Baum, Deck-Punkte in die Werkstatt. Score-Meilensteine bringen dir zusätzliche Stichpunkte." ("Deck-Punkte" spelled as the end screen spells it.) |

| 34 | **BUG: aborted runs earn rewards** | An aborted run (screenshot: 1 cycle, score 0) still granted +5 Stichpunkte AND the Willkommensbonus ("first completed run"). Aborted runs must grant no SP; verify the welcome bonus and `hadCompletedRun` are also gated on genuinely completed runs. |

## Probierfeld lessons (Mehr-dazu targets)

| # | Lesson | Change |
| --- | --- | --- |
| 10 | **aufstellung/formationen** ("Die vier Formationen") | Rebuilt: the interactive "find all four by sorting" probe goes. Instead: four buttons (Wiederholung, Farbblock, Treppe, Wechsel); tapping one shows an example segment below with the matching cards marked and a short explanation of how that formation arises. Mockup approved by the owner (with revision: formation members carry a blue ring, so membership reads at a glance): https://claude.ai/code/artifact/c4dcf6cd-e427-42f1-9bb1-ad0d0daf667a. **Finding while mocking:** the current lesson text claims a Treppe can "steigen oder fallen"; since #195 the code only marks ascending runs. The rebuilt copy says ascending only. |
| 4 | **wahl/kategorien** | Remove the TIPP beat ("Rechts steht, wie viele Familien jede Kategorie hat, zusammen 73.") entirely. |
| 5 | **wahl/raritaet** | Opening sentence replaced: "Perks kommen in unterschiedlicher Rarität, sichtbar am Rahmen." Example cards stay. "Ersetzen, nicht stapeln" merk stays. Everything after it goes: the "Höhere Stufen sind stärker ... Stufe IV schließt eine Familie ab ..." paragraph and the TIPP ("Eine Familie zweimal auf derselben Stufe ..."). |
| 6 | **wahl/legendaer** | Intro shortened to: "Legendäre sind besonders starke Perks und müssen erst freigeschaltet werden." Example cards stay. The "Erst freischalten." block goes. The TIPP goes. |

| 16 | **blitz/karte** ("Die Karte", both pages good in principle) | Better intro: "Nach 10 Crits ist deine Ladungsleiste voll: Der Skill Ionisierung ionisiert dann 2 ungespielte Karten." (10 stays a constant placeholder.) The page gets a looping demo: a Ladungsleiste fills to 10, on full a card below gains an ion stack (1 to 5), then the loop restarts. **The Blitzrahmen must sit right: today's ion frame is too small; it hugs the card edge like in-game.** Mockup approved: https://claude.ai/code/artifact/8bc4bfe3-77c4-4c55-82d7-1018decc235d. Implementation constraint (owner): the card visuals must match the game exactly, stacks 1 to 4 show the glowing frame, lightning bolts only from stack 5 (full ionization). Use the in-game ion rendering, not a rebuild. |

## Decided sweep

- **All existing hint texts get swept dash-free in the same pass** (owner decision): every `hint.*`
  key in all four catalogs loses its em-dashes, reworded where a plain comma or period reads
  better. No meaning changes beyond what the rows above name.

## Ground rules for this round (owner, 2026-08-28)

- Collect first, implement everything in one task at the end.
- No em-dashes in any new or reworded player text.
- The Mehr-dazu lessons are reviewed alongside the hints; expect heavy cuts.

## Round 2 (owner playtest after implementation) — IMPLEMENTED (task/tip-review-2 → dev, 2026-08-28)

Implementation record: docs/workstreams/onboarding/onb-tipreview2/task-contract.md on dev.
Next: owner playtest round 3.

| # | Item | Change |
| --- | --- | --- |
| R1 | **E3 mult formatting (bug)** | Shows ×1,1400000000000001: `streakBaseMult(n)` is raw floating point and E3's vars call `fmtNum` without rounding. Format to two decimals (`.toFixed(2)`, the f2 pattern) — audit the other hint vars (E4 critMult etc.) for the same hole. |
| R2 | **Formationen tabs wrap** | On the rebuilt "Die vier Formationen" page the tab label "Wiederholung" breaks onto two lines. Smaller font on the formation tab buttons (`.werkzeuge.formen .tbtn`, FormationenSzene) so every label fits one line. |
| R3 | **Rename Probierfeld back to Tutorial** | The screen name goes back to "Tutorial" everywhere the player sees it: `tut.title` and `start.tutorial` in all four catalogs (DE/EN/ES: "Tutorial", ZH: 教程). The probe captions `tut.probe.*.title` ("Probierfeld · ein Segment" etc.) follow along as "Tutorial · …" unless the owner prefers a different caption. |
| R4 | **Formationen page uses full width** | Same page as R2 (mobile screenshot): the example card row and tab row leave unused space at the right edge. Layout should stretch across the full content width (cards and tabs share the available width instead of fixed widths left-aligned). Fix together with R2 in FormationenSzene / scenes.css. Note: the tab-wrap from R2 also shows on "Mehrere Formationen" ("Wiederholung + Wechsel" breaks); the R2 font fix covers ALL scene tab rows, not just the Formationen page. |
| R5 | **Last lesson page: Weiter returns to the game** | On the final page of a lesson (e.g. 4/4) the "Weiter" button currently leads to the lesson overview. It should close the tutorial entirely and return to the game instead. |
| R6 | **Terminology: "Formation", not "Muster"** | Uniform wording across player text. DE occurrences to sweep: `hint.e6.body` ("Muster zählen nur innerhalb eines Segments" → "Formationen zählen …"), `tut.sz.ue.bunt` ("drei Muster zugleich" → "drei Formationen"), `tut.sz.ue.zick` ("in beiden Mustern" → "in beiden Formationen"), `tut.aufstellung.stapeln.0` ("in mehreren Mustern" → "in mehreren Formationen"). EN/ES/ZH follow with their established formation term ("pattern"/"patrón" swept the same way where it stands for formations). `stats.noPatterns` (statistics, "Muster" = behavioural patterns, not formations) stays. |
| R7 | **Blitzkarte lesson: ion frame misaligned (bug)** | On the "Die Karte" Blitz lesson the lightning frame sits well inside the card instead of on its border (owner phone screenshot: jagged glow floats around the number, clear gap to the card edge). The ionSturm overlay must trace the actual rendered card edge on every screen size: size/position the canvas from the card's live layout box (measure, not fixed px), re-measure on resize, so the glowing frame and bolts hug the card border on any phone. |
| R8 | **E4 (first crit): Mehr dazu goes** | The crit event card ("Crit: Dieser Stich zählt ×{mult}.") loses its "Mehr dazu" link (drop `target` from the E4 def). |
| R9 | **Raritäten lesson shows "+0 anstatt +0" (bug)** | `tut.sz.n.merk1` renders +0/+0; it should read +100 instead of +50. Cause: scenes.jsx calls `FAMILY_DEFS.D_FORMATION_BONUS.tiers[n].scoreFlat({})` with an empty ctx, and the def returns `c.hasFormation ? 50/100 : 0`, so the empty ctx yields 0. Fix: pass `{ hasFormation: true }` (engine-truth values 50 and 100 then flow in). Check the MEASURE_VARS twin for the same hole. |
| R10 | **Strukturen lesson: cut lead and tip** | On the "Strukturen" page both text blocks go: the probe lead "Markiert ist immer dieselbe Zelle, damit nur die Lage der Gebäude den Unterschied macht." (`tut.architekt.strukturen.1`) and the bottom tip "Die Spalte ist am schwersten zu füllen und zahlt am stärksten." (`tut.architekt.strukturen.2`, tip beat removed from the catalog entry). The page carries everything needed without them (owner). Keys deleted in all four catalogs; PROBE_PX/budget adjusted if needed. |
| R11 | **H4 (glossary hint): reword + blinking icon** | Owner wants the wording to lead with the icon location, like "Im Glossar-Icon oben rechts…". Proposed DE (pending owner ok): "Im Glossar oben rechts schlägst du fast alles nach." And the glossary icon must BLINK while H4 shows, a steady glow is overlooked: the banner-glow on the `glossar` anchor becomes a pulsing animation (CSS keyframes on the box-shadow, static fallback under prefers-reduced-motion). |
| R12 | **Highlight frames lag while scrolling** | Minor (owner: "kein großes Thema"): every highlight frame (spotlight hole and glow frames) drifts during scroll and only snaps back onto its element when scrolling settles. Cause: the overlay is fixed-position and re-measured per scroll event, one step behind the page. Fix: anchor the frame so it moves natively with the content, position it in document coordinates inside a scrolling container (or apply the glow to the element itself), keeping the fixed overlay only for the darkening scrim; rAF-tracking as fallback where that is not possible. |
| R13 | **Lesson order = first-run order** | Within every section (not just architekt) the lessons are reordered to match the order in which their subject appears in the first run; the section order in the overview follows the same principle. Example that triggered this: "Aufwerten" sits at 3/6 in the architect section ahead of pages whose subject comes earlier. The concrete target order is fixed at implementation against the actual first-run flow (perk/skill → play → formation → architect → gameover). |
| R14 | **Aufwerten tile looks disabled** | In the architect offer grid ("Was baust du diese Phase?") the "Aufwerten" tile reads as greyed out (dashed border, dimmed text) even when upgrading is possible. It gets the normal active tile styling; the greyed look is shown only when there is genuinely no upgradable building on the board (no building below max tier, or only legendaries). |
| R15 | **C3 (family target): Mehr dazu goes** | The family-target hint ("Diese Perk-Familie braucht ein Ziel: Wähle, worauf sie wirken soll.") loses its "Mehr dazu" link (drop `target` from the C3 def). |
| R16 | **No Farballianz colors on the enemy card** | The alliance color band (allyColors, from the Farballianz perk) currently also renders on the OPPONENT's battlefield card. The perk belongs to the player's deck; the enemy card never shows alliance colors (restrict the allyColors lookup in Battlefield to the player side). |
| R17 | **E9 (Kampfwert) must pause on the referent trick** | At higher speeds the E9 event card ("Deine Karte kämpft mit {kampfwert} statt {kartenwert}…") shows while the board has already moved on (owner screenshot: cards face-down again), so the player cannot see the card with its extra Stichwert and the text makes no sense. Regardless of the speed setting, the pause for E9 must land while the referent trick is still face-up with the boosted card and its bonus visible. Check the other trick-referent event hints (E1-E4, E6) for the same race. |
| R18 | **C5 (board full) did not fire (bug)** | Repro (owner screenshot, Durchlauf 28): Baufeld 18/20 belegt, all three offers say "kein Platz → ersetzen", yet the C5 banner never appeared. Diagnose at implementation: `noOfferPlaceable` must judge "kein Platz" exactly like the offer tiles do (same predicate/cap semantics, replacement placements must NOT count as placeable), and verify the once-per-profile seen flag was not consumed earlier without the banner actually showing. Also check that the banner slot re-evaluates when the stuck state arises mid-phase (after placing/rerolling), not only on entering the screen. |
| R19 | **NEW hint (C6): Kombis/Formationen toggles** | In the architect phase AFTER the one where C5 showed, an additional banner points out that the "Kombis" and "Formationen" toggles above the board switch the overlay frames on and off for a clearer view while building. Proposed DE (pending owner ok): "Mit Kombis und Formationen blendest du die Rahmen auf dem Baufeld ein und aus. So behältst du beim Bauen den Überblick." While it shows, the toggle group carries the tutorial glow frame (new `data-hint-anchor` on the toggle row). Once per profile, like C5. |
| R20 | **Blitz panel: drop duplicated info** | The expanded Blitz panel repeats what already lives elsewhere: the "Blitzfrequenz" row with its Crit ×N value (also in the Multiplikatoren panel as Crit-Mult) and the "Serienkette · hält ×N" row with the "N× Serie gehalten" badge (Serie already sits in the status bar). Remove these from the Blitz panel. |
| R21 | **Milestone bar: one bar per milestone** | Same visual as today, but the fill is per milestone, not total: it runs 0 → 100 % toward the current milestone's threshold (e.g. 10 Mio). On reaching it the counter ticks (1/5), the bar drops back to 0 and refills toward the next threshold in a DIFFERENT color (distinct color per milestone stage). ScoreMilestoneBar. |
| R22 | **New profile starts with 0 DP** | A fresh profile currently starts with 50 DP (`START_DECK_POINTS = 50` in storage.js, decision #316). Owner decision: a new profile starts with 0 DP → constant goes to 0. The one-time welcome bonus of 50 DP after the first COMPLETED run (WELCOME_DP, progression.js) STAYS — owner confirmed. |
| R23 | **H1 (welcome card): Mehr dazu goes** | The welcome card loses its "Mehr dazu" link (drop `target` from the H1 def). |

### R13 appendix — lessons not reached during the first run (state: dev, 2026-08-28)

"Reached" = deep-linked from a hint's "Mehr dazu" that can actually fire on a first run (Blitz/Feuer only, no Eis/Pflanze, no legendaries, no glacier). Every lesson stays browsable through the tutorial overview; this list is about the guided path only.

**Never linked from any hint (22):**
- grundlagen/werte, grundlagen/serie, grundlagen/herkunft
- aufstellung/brett, aufstellung/karte
- blitz/tipps
- feuer/schmiede, feuer/feld, feuer/tipps
- pflanze/erkennen, pflanze/feld, pflanze/tipps
- eis/tipps
- architekt/wasist, architekt/hauptaktion, architekt/tipps
- danach/endscreen, danach/baum
- fortgeschritten/laenge, fortgeschritten/segmente, fortgeschritten/glut, fortgeschritten/klinge

**Linked, but the linking hint cannot fire on a first run (4):**
- eis/karte and pflanze/karte (E5 links the active archetype's karte lesson; first run offers only Blitz/Feuer)
- eis/feld (C1 fires on the glacier phase, which needs an ice skill)
- wahl/legendaer (C4 fires on the legendary pick, which is locked on a first run)

**Reached on a first run (12):** grundlagen/stich, grundlagen/score, aufstellung/formationen, aufstellung/stapeln, wahl/kategorien, wahl/raritaet, blitz/karte, feuer/karte (if fire is the first archetype), architekt/wohin, architekt/strukturen, architekt/aufwerten, danach/punkte.

## Round 3 (owner playtest after round 2 + entry rework) — IMPLEMENTED (task/tip-review-3 → dev, 2026-08-28)

Implementation record: `docs/workstreams/onboarding/onb-tipreview3/task-contract.md` (on `dev`).
One deviation against the approved plant mockup: the green colour block cap is interpolated from
the engine (×1,35, with Überwucherung ×1,55 from 66 % green) — the mockup's ×3/×4/60 % figures
were wrong; the engine and `tut.pflanze.tipps.0` agree.

| # | Item | Change |
| --- | --- | --- |
| Q1 | **E1 (first win): Mehr dazu goes** | The first-win event card ("Dein erster Sieg: {win} Basispunkte…") loses its "Mehr dazu" link (drop `target` from the E1 def). |
| Q2 | **E2 (first tie): Mehr dazu goes** | The tie event card ("Gleichstand: Niemand punktet. Nur Siege zahlen.") loses its "Mehr dazu" link (drop `target` from the E2 def). |
| Q3 | **S-F1: mention the energy** | The first formation hint also explains that the energy shows how many swaps remain this phase. Proposed DE body (pending owner ok, dash-free, no typed digits): "Tippe zwei Karten an, um ihre Position zu tauschen. Die Energie zeigt, wie oft du in dieser Phase noch tauschen kannst. Versuch, in einem Segment gleiche Farben zu sammeln." |
| Q4 | **NEW intro card: Aufstellung (first formation phase)** | Blocking card (H1 style), once per profile, on first entering the formation phase. APPROVED wording. Title: "Deine Aufstellung". Body: "Das ist die Ziehreihenfolge deines Decks, unterteilt in {segments} Segmente. Sie bleibt bis zum Ende des Laufs gleich.\n\nIn jeder Aufstellungsphase kannst du Karten tauschen, so oft deine Energie reicht. Das Gegnerdeck wird vor jedem Durchlauf neu gemischt." ({segments} from constants.) |
| Q5 | **NEW intro card: Architekt (first architect phase)** | Blocking card (H1 style), once per profile, on first entering the architect phase. APPROVED wording. Title: "Der Architekt". Body: "Das Baufeld liegt über deiner Ziehreihenfolge: Jede Zelle gehört zu einer Position, ein Gebäude wirkt auf die Karte darunter. Score-Effekte zahlen nur, wenn die Karte ihren Stich gewinnt. Effekte auf den Kartenwert und Formations-Boni wirken immer.\n\nJe Bauphase hast du eine Hauptaktion: ein Gebäude bauen oder eins aufwerten. Gebäude bleiben bis zum Ende des Laufs liegen, du kannst sie aber jederzeit versetzen oder abreißen." |
| Q6 | **Delete lessons architekt/wasist + architekt/hauptaktion** | Both pages ("Was der Architekt ist", "Deine Hauptaktion") leave the tutorial catalog entirely (their intro work is now done by the Q5 architect intro card and the in-run hints). No hint links to either (R13 appendix). Their keys, probes (archmock, bauen) and scenes go with them; PROBE_PX entries cleaned up. |
| Q7 | **NEW hint: first ionized card explains the storm bars** | Once per profile, when the FIRST card gets ionized (first ion stack in the deck): an event card explaining Sturmgröße and Sturmintensität, anchored on the Blitz panel (`faction-lightning` glow/spotlight). APPROVED wording (owner, verbatim): "Deine erste Karte ist ionisiert. Sturmgröße zählt die ionisierten Karten deines Decks: Ist die Leiste voll, bekommt jede Karte +{v} Wert. Sturmintensität zählt die voll ionisierten: Ist sie voll, wandelt der Überschlag Skill deine Crit-Chance doppelt so schnell in Ladung um." ({v} = ION_SATURATION_VALUE; "Überschlag" checked against the real skill name at implementation.) |
| Q8 | **NEW hint: first Anker perk in the offer** | Once per profile, on the perk screen when the offer first contains an Anker perk (e.g. Schnellschuss): a banner explaining the mechanic. Proposed DE (pending owner ok, dash-free): "Anker zählen als Formation. Je mehr Formationen eine Karte trägt, desto höher ihr Multiplikator." |
| Q9 | **Battlefield panel jitters when the breakdown wraps (bug, diagnosed)** | Confirmed in code: `bf-kette` reserves ONE line (`min-h-5`), but with many factors the chain flex-wraps to a second line (deliberately, to avoid clipping) — the panel grows, and at high tempo it flips between one and two lines every trick. Fix: the panel keeps a FIXED size. Implementation choice: reserve the two-line height permanently on narrow widths, or keep the chain single-line via tighter/smaller type; decided at implementation, panel height must not change per trick. |
| Q10 | **C5 shows once, not in every stuck phase** | Round-2 R18 made C5 sticky (re-shown every stuck phase until ✕) so it could not be consumed invisibly. Owner: once is enough. New rule: C5 is dismissed like every other banner (leaving the phase marks it seen) — it fires in the first stuck phase, shows there, and never again. The C6 follow-up trigger (c5Done) keeps working off the seen marker. |
| Q11 | **GameOver milestone bar uses the new per-milestone display** | The end screen's Meilensteine row (GameOver.jsx, own rendering off `milestoneBarState`) still shows the old total fill. It switches to the R21 behavior: fill = current milestone segment only (`segFill`), stage color per reached milestone, no quarter marks. |
| Q12 | **H2b mentions swiping to other archetypes** | The multi-archetype skill hint also tells the player to swipe right for the other archetypes. Proposed DE (pending owner ok): "Ab jetzt stehen mehrere Archetypen zur Wahl. Wische nach rechts, um die anderen zu sehen. Dein erster Skill eines Archetyps schaltet ihn frei, mischen ist erlaubt." (Desktop shows pager arrows instead of swipe; check at implementation whether the wording needs a width variant or a neutral "blättere".) |
| Q13 | **H2b links the fire lessons; fire lessons redesigned** | H2b's "Mehr dazu" targets the feuer section (first lesson). The fire lessons get the compact rebuild, co-designed as an artifact: THREE slim pages replacing the four text-heavy ones — (1) "Der Vorsprung" (three-case duel, fire pays only on margin wins, min margin from HEAT_MIN_MARGIN), (2) "Die Hitzeleiste" (auto-loop bar like the Ladungsleiste; Dividende to 70 %, Klinge 40/70/100, Flächenbrand ab 80 %, Weißglut above), (3) "Die Schmiede" (Brand → Asche → Schmieden chain + the two card states). Tipps page stays as page 4. Mockup APPROVED (owner: "perfekt, das nehmen wir so"): https://claude.ai/code/artifact/961deda9-018a-4932-bdd1-1caad4bb1eb3 — final revision: "extra, obendrauf" wording + heat loss on the Niederlage case (page 1), Passiv/Skill chips naming Glühende Klinge, Flächenbrand, Weißglut (page 2), ash gated on Skill Brandmal and forging gated on Skill Ascheschmiede (page 3). All numbers from constants at implementation. |
| Q14 | **H2b rewritten (first-run Feuer appears)** | Owner direction: "Ab jetzt steht neben Blitz noch Feuer zur Auswahl. Skills können frei untereinander gemischt werden. Weitere können im Upgrade Tree zusätzlich freigeschalten werden." Merged with Q12 (swipe), proposed final DE (pending owner ok): "Ab jetzt steht neben Blitz auch Feuer zur Auswahl, wische nach rechts. Skills kannst du frei mischen. Weitere Archetypen schaltest du im Upgrade-Baum frei." Mehr dazu → feuer lessons (Q13). |
| Q15 | **NEW unlock hints: Eis / Pflanze available** | Once per profile and archetype, on the skill screen when a newly unlocked archetype (Eis, Pflanze) is available for the first time: a short general banner, e.g. "Eis steht jetzt zur Auswahl bereit." / "Pflanze steht jetzt zur Auswahl bereit." Both unlocked at once → both lines stacked in one banner. "Mehr dazu" opens that archetype's lessons (after their Q16 redesign). |
| Q16 | **Eis + Pflanze lessons follow the fire redesign** | The eis and pflanze sections get the same compact rebuild as feuer (Q13 pattern: few slim pages, one visual per page, Skill/Passiv chips, engine numbers). To be co-designed as artifacts. Pflanze mockup published (three pages: "Das Wachstum" with auto-loop growing card absorbing the erkennen signs + rein/mix tabs; "Grüne Karten zahlen" with Farbblock-Passiv, Skill Wurzeltiefe, Skill Blüte; "Tempo und Trimmen"): https://claude.ai/code/artifact/7789c2dd-c238-497c-ad62-dc0bb8b857b3 — APPROVED (owner) with final revisions: red card turning green with the real Neon-Moos card effect, tab "Mit anderen Skills", merk "Nur Pflanzen-Skills:", Wurzeltiefe row ends "dazu ein Bonus, der mit dem Gesamtwachstum deines Decks steigt.", page 3 adds "Später Skills zu wechseln lohnt sich trotzdem" tip. Eis mockup published (three pages: "Der Gletscher" auto-loop with mass ticking to 12, frost jumping at thresholds 4/8/12, visible burst + reset, real frost card effect at implementation; "Der Bruch" with the Wucht ladder ×1,0/×1,5/×2,2, neighbor +25 % and Kollision, pays even on a loss; "Einfrieren" with the freeze rules incl. decline-freeze from 4 skills): https://claude.ai/code/artifact/01da376a-b78b-4c66-898a-9570a7a7a6f8 — APPROVED (owner) with revisions: page 1 carries the neighbor passive and uses the real frost card effect at implementation; page 2 is the Gletscherformationen page (Block/Kreuz/Linie/Fläche tabs, Fläche tab demonstrates stacking with the ×3,28 center cell); page 3 keeps only the freeze rules. NOTE for implementation: C1 currently targets eis/feld, which the redesign replaces — C1 retargets to the new eis page 1. |
| Q17 | **Mass lesson deletion (owner decision)** | All lessons without a deep link are CUT in the next rebuild, only the reworked, tuned content stays. Deleted: the ENTIRE grundlagen section (Der Stich, Der Score, Die Serie, Kartenwert und Stichwert, Woher dein Score kommt), aufstellung/brett (Das Brett) and aufstellung/karte (Was auf einer Karte steht), architekt/wasist + architekt/hauptaktion (= Q6), danach/endscreen (Der Endscreen) and danach/baum (Der Upgrade-Baum), and the ENTIRE fortgeschritten section (Lange Formationen zahlen mehr, Segmentgrenzen öffnen, Glut auf Geometrie, Glühende Klinge und Blitz). Remaining catalog: aufstellung (formationen, stapeln), wahl (kategorien, raritaet, legendaer), blitz, feuer, pflanze, eis (each per redesign + tipps), architekt (wohin, strukturen, aufwerten, tipps), danach (punkte). Empty sections disappear; probes/scenes/keys of deleted lessons removed; guards/budgets updated. |

## Round 4 (owner playtest after round 3) — IMPLEMENTED (task/tip-review-4 → dev, 2026-08-29)

Implementation record: `docs/workstreams/onboarding/onb-tipreview4/task-contract.md` (on `dev`).

| # | Item | Change |
| --- | --- | --- |
| V1 | **C7/C8 unlock notices move into their archetype panels (screenshot)** | The combined C7b banner stacks both lines ("Eis steht jetzt zur Auswahl bereit. Pflanze steht jetzt zur Auswahl bereit.") with ONE "Mehr dazu" — over the FEUER panel, and the link can only open one of the two. Owner: separate notices for Eis and Pflanze, each shown in its OWN archetype panel on the skill screen — the Eis banner while the Eis panel is swiped active (Mehr dazu → eis/karte), the Pflanze banner on the Pflanze panel (→ pflanze/karte). Feuer stays as it is (H2b unchanged). Implementation notes: C7b def, its key and the markSeen aliasing go; hintForScreen needs the active panel's archetype in ctx (skill swiper index) so C7/C8 fire panel-scoped; each stays once-per-profile and is consumed only when its panel showed it. |
| V2 | **Eis page 3: "Der Schnee" instead of Einfrieren** | The eis section's third page ("Einfrieren", freeze rules) is replaced by a page explaining the snow system. Terminology (owner): **"Schnee" has fully replaced "Firn"** as the player-facing word — dev already says "Schnee sammelt sich" / "Boden-Reserve" (bar.ice.firnGround/firnReserve; only key names still say firn). Title: "Der Schnee". Engine facts to carry: the reserve lies on the BOARD FIELD, not the card (firnStack, separate from glacierMass); open ground is charged by Skill Schneetreiben (win drifts +SCHNEETREIBEN_SEED to an open neighbour field, never under a glacier) and Skill Dauerfrost (cycle end: open fields +NEAR/+FAR by distance to the nearest glacier); a card frozen onto a charged field starts at mass 0 and refills from its reserve at every cycle start up to full FIRN_REFILL_TARGET (=BURST_AT) mass — only the difference — until the reserve is empty; reserve is uncapped. Legendary Eiszeit stays OFF the page (owner). The freeze rules of the old page survive in the tipps page (bullets 1 and 6), so nothing is lost. Draft approved direction; final wording uses Schnee/Boden-Reserve. |
| V3 | **Glossary tip goes from all archetype tipps pages (screenshot)** | The four archetype tipps lessons (blitz, feuer, pflanze, eis) all close with the same tip beat "Was einzelne Skills tun, steht im Glossar." — it goes. The tipps lessons drop their `tip` beat (beats = probierfeld only), keys `tut.<arch>.tipps.1` deleted in all four catalogs. NOT touched: architekt/tipps keeps its different tip ("Was ein einzelnes Gebäude tut, steht auf seinem Bauplan.") — architekt is not an archetype; confirm at implementation only if the owner flags it too. |
| V4 | **BUG: GameOver shows +0 DP on a completed run (the +5 completion bonus is invisible)** | The credit is correct (`recordRun`: deckPoints += runDp + completionDp + spSweep + rankedDpBonus + welcomeDp), but the end screen's DP counter renders only `earn.dpGross`/`earn.dpNet` = the MILESTONE DP (`gainedDp`). `earn.dpComplete` (RUN_COMPLETE_DP = 5), `spSweep` (full tree) and the ranked week bonus are computed into `earn` but never rendered — a completed run without milestone DP shows "+0" although +5 land. Fix: the displayed DP number includes everything actually credited except welcomeDp (which has its own row): dpGross/dpNet fold in completionDp + rankedDpBonus + spSweep. |

## Round 5 (owner playtest after round 4) — IMPLEMENTED (task/tip-review-5 → dev, 2026-08-29)

Implementation record: `docs/workstreams/onboarding/onb-tipreview5/task-contract.md` (on `dev`).

| # | Item | Change |
| --- | --- | --- |
| W2 | **BUG: tutorial overview "Glossar öffnen" foot did nothing (screenshot)** | The foot's handler only set the pause-bookkeeping flag; the glossary UI lived solely in the run-HUD GlossaryPanel (own state, absent in the menu; in a run the click silently froze the run). Fixed in `task/tip-review-5b` → dev: App renders the exported GlossaryOverlay itself (glossaryStandalone), pause flag in sync, Escape closes it first. |

| # | Item | Change |
| --- | --- | --- |
| W1 | **"Tutorial überspringen" also lifts the Blitz-only gate** | Skipping the tutorial (the skip-all button on the H1 welcome card) currently only marks all hints seen — the first-run archetype gate stays: the reducer forces `unlockedArchetypes = ["lightning"]` while `profile.hadCompletedRun === false`, so the player is locked to Blitz until they COMPLETE a whole run. Owner: skipping must also open the archetypes — from the next skill round on, Feuer is available, plus Eis/Pflanze where the unlock tree has them (i.e. the normal tree allowlist `treeEff.unlockedArchetypes`, which already is base + purchased nodes). Plan: (a) new sticky profile flag `tutorialSkipped`, set by skip-all; every first-run gate checks `hadCompletedRun === false && !tutorialSkipped` (reducer Blitz-only + startPatch, useHints firstRun, StartScreen loud offer, App guided wiring) so future runs are ungated too; (b) skip-all additionally dispatches a gate-lift action into the RUNNING run (state.firstRun = false, state.unlockedArchetypes = tree allowlist) so the current run's next skill offer already carries the other archetypes. An already-built Blitz-only offer on screen is not rebuilt (next one is open). The deliberate "Tutorial-Lauf" (guided) stays hint-guided only — it never had the archetype gate on veteran profiles. |
