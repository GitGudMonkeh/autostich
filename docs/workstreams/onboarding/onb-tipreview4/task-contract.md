# Task contract — onb-tipreview4 (tip review round 4)

**Branch:** `task/tip-review-4` (from `dev`) → merged into `dev`.
**Source of scope:** `docs/workstreams/onboarding/tip-review-2026-08-28.md`, section
"Round 4 (owner playtest after round 3)" — rows V1–V4, collected and confirmed by the owner on
2026-08-29, implemented in one batch on the owner's go ("alle umsetzen").

## Scope delivered

| Row | Change | Where |
| --- | --- | --- |
| V1 | Unlock notices are panel-scoped: C7 (Eis) and C8 (Pflanze) show on the skill screen only while their own archetype's swiper page is active, so "Mehr dazu" always matches the shown panel. SkillSelect reports the active page's archetype through the HintContext (`setSkillArch`, cleared on unmount; only the stable setter in the effect deps). The combined C7b banner, its catalog keys and the markSeen aliasing are gone. Feuer (H2b) unchanged. | SkillSelect.jsx, useHints.js, hintScript.js, catalogs |
| V2 | Eis page 3 is now "Der Schnee" (replaces "Einfrieren", whose rules stay covered by the tipps page bullets 1 and 6): the reserve lies on the board field, not the card; a fresh glacier starts empty and refills to full FIRN_REFILL_TARGET mass at every cycle start until the reserve is drained; Skill rows Schneetreiben (+SCHNEETREIBEN_SEED drift to open neighbour) and Dauerfrost (+NEAR/+FAR by distance at cycle end). Wording matches the in-run bar — "Schnee"/"Boden-Reserve", interpolated live from `bar.ice.firnGround`/`bar.ice.firnReserve`. No legendary Eiszeit (owner). | scenes.jsx (SchneeSzene), catalog.js, beats.jsx, catalogs |
| V3 | The closing tip "Was einzelne Skills tun, steht im Glossar." is gone from all four archetype tipps lessons (blitz, feuer, pflanze, eis) — they end with the list. The architekt tipps page keeps its different tip (not an archetype). | catalog.js, catalogs |
| V4 | The GameOver DP counter shows everything actually credited except the welcome bonus (own row): milestone DP + completion bonus (RUN_COMPLETE_DP) + SP sweep + ranked week bonus. Before, a completed run without milestone DP showed "+0" although +5 landed. Regression test pins display == balance delta for a completed and an aborted run. | storage.js, test/storage.test.js |

## Guard updates (invariant genuinely changed, owner-decided)

- `test/hints.test.js`: the C7/C8 selection test now asserts panel-scoping (banner only on its own
  page, silence on foreign pages, no combined banner).
- `test/tutorial-sections.test.js`: budget counter-check re-anchored on `pflanztempo` (the
  smallest probe after `einfrieren` left).
- i18n: 9 dead keys removed, 7 Schnee keys added, in all four catalogs; loc exports regenerated.

## Evidence

- Gates on the final tree: `npm test -- --maxWorkers=1` (153 files, 2468 tests green),
  `npm run lint -- --max-warnings=0`, `npm run build`, `npm run gen:db`, `npm run loc:export`.
- CDP (headless Chromium, 390×844, DE locale, production build; veteran profile seeded with
  iceDeck/plantDeck nodes so ice and plant are offered):
  - Swiping the four skill panels: C7 appears only on the EIS page, C8 only on the PFLANZE page,
    no banner on Blitz/Feuer, no leak on a second ring pass, a mere swipe-past does not consume
    them (screenshots r4-c7-eis, r4-c8-pflanze).
  - C7's "Mehr dazu" opens the eis/karte lesson "Der Gletscher" (incidentally captured when the
    swipe script clicked the link).
  - "Der Schnee" page renders per the approved draft, 434 px (PROBE_PX 450), no freeze-rules text.
  - Archetype tipps pages no longer show the closing TIPP row.
- V4: unit test pins earn.dpGross === RUN_COMPLETE_DP on a milestone-less completed run and
  display == balance delta.

## Deviations / notes

- Dismissal-by-deciding marks the LAST banner shown in the phase (existing semantic). If the
  player glimpses C7, swipes on and decides elsewhere, C7 returns in a later skill phase —
  deliberate: a swipe-past must not consume an unread notice.
- The V4 gross/net split stays in the earn object (the challenge deduction is gone, so
  gross == net and the countdown branch of the rollup stays dormant).
