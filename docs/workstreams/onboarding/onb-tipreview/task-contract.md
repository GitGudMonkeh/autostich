# Task contract — onb-tipreview (owner walkthrough, all 34 rows)

| | |
| --- | --- |
| Task | `onb-tipreview`, Tier B |
| Feature branch | `feature/onboarding` |
| Task branch | `task/tip-review` |
| Base | `origin/dev` |
| Binding spec | `docs/workstreams/onboarding/tip-review-2026-08-28.md` (34 collected rows, three approved mockups) |
| Session | Claude Code remote session, owner-authorized ("setzen wir alle Änderungen mal um") |

## Scope — what landed

**Hint copy (all four catalogs), rows 1-3, 9, 11-13, 15, 17-19, 21, 23-25, 27-28, 30-31, 33:**
H1/H2/H3/H5/E1/E3/E8/S-F1..3/S-A1..4/U2 reworded as collected; the bar is the **Ladungsleiste**
everywhere; the em-dash sweep cleared every `hint.*` key in DE/EN/ES/ZH. "Mehr dazu" links removed
from E3, E6, E8, E9, H5, U1, U2, U3, U4, S-A1, S-F3 (link renders only when a target exists now);
S-F2 retargets `aufstellung/stapeln`, S-A3 retargets the new `architekt/strukturen`.

**New hints:** C5 (no offered plan placeable — checks placements via `noOfferPlaceable`, not free
cells; glows the Baufeld panel) and H4 (third perk visit; glows the glossary i button). Banner
anchors got their own glow hook (no scrim on decision screens).

**E6 retimed (row 8):** fires only after the first formation phase, preferably on a Farbblock
(vars prefer it), any formation from the second phase on.

**Probierfeld rebuilds (rows 4-7, 10, 16, 18-20):** formationen = four tabs with engine-verified
example segments; stapeln ("Mehrere Formationen") = two multi-formation examples; wohin =
"Distrikte" (three real-building layouts, factors from `districtFactorMap`); new
`architekt/strukturen` lesson (row/column/diagonal); blitz/karte = charge-bar loop feeding the
existing in-game ion rendering (bolts only at 5/5, per owner constraint); kategorien/raritaet/
legendaer lost their tip beats and trailing blocks; `grundlagen/anzeigen` deleted (LaufmockSzene
removed). Architect board cells are taller (24px, rounded) so shapes read like the game.

**UI/bug rows 22, 26, 29, 32, 34:** stich bonus on cards renders white; "Nichts bauen →" in all
catalogs; SERIE cell has a fixed min-width; alliance wash shows ALL partner colours as bands at
20 % opacity (`linkedPartnersOf`); a trickless abort no longer displays the previous run's earn
chips and welcome bonus (storage was already correct — display-only bug).

## Deviations / notes

- Row 6 default check: `hideBreakdown` has always defaulted to visible; nothing changed.
- The tip-beat guard now allows lessons without a tip (owner decision, rows 4-6).
- `tut.sz.e.*` keys of the deleted Lauf-Bildschirm scene remain in the catalogs (EndscreenSzene
  shares `msWort`; the rest are inert). Cleanup candidate for a later pass.
- Formation example hands were searched against `computeFormations` so each tab shows exactly its
  formation; the Farbblock tab deliberately carries a non-counting same-colour card.

## Acceptance gate

`npm test` (2461) · `npm run lint -- --max-warnings=0` · `npm run build` · `npm run gen:db` ·
`npm run loc:export` — all green. CDP screenshots of every rebuilt lesson on the built preview
(formationen tabs, stapeln, Distrikte board, Strukturen board, blitz charge loop, raritaet/
legendaer cuts) verified visually.
