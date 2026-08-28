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

## Round 2 (owner playtest after implementation) — COLLECTING

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
