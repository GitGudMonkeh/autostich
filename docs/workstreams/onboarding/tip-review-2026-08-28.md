# Tip review, 2026-08-28 — collected changes (owner walkthrough)

Working document for the tip-by-tip review round. The owner dictates changes per tip; nothing is
implemented until the walkthrough is done, then everything lands in one task. German copy below is
the binding wording (EN/ES/ZH follow at implementation). Style rule enforced here: **no em-dash in
player text** (text-style-guide.md, "Kein Gedankenstrich").

## Status: COLLECTING — not yet implemented

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
