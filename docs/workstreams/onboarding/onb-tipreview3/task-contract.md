# Task contract — onb-tipreview3 (tip review round 3)

**Branch:** `task/tip-review-3` (from `dev`) → merged into `dev`.
**Source of scope:** `docs/workstreams/onboarding/tip-review-2026-08-28.md`, section
"Round 3 (owner playtest after round 2 + tutorial entry rework)" — rows Q1–Q17, all collected and
confirmed by the owner on 2026-08-28, implemented in one batch on the owner's go
("dann setzen wir mal alles um was wir auf der liste haben"). The three archetype lesson
redesigns (Q13/Q16) were co-designed and approved as artifact mockups before implementation.

## Scope delivered

| Row | Change | Where |
| --- | --- | --- |
| Q1/Q2 | "Mehr dazu" dropped from E1 and E2 (targets removed; E1 keeps its scorerow anchor) | hintScript.js |
| Q3 | S-F1 explains energy ("Die Energie zeigt, wie oft du in dieser Phase noch tauschen kannst.") | four catalogs |
| Q4 | New HF intro card "Deine Aufstellung" on the first order phase (draw order, {segments} segments, order stays, swaps per energy, opponent reshuffles per cycle) — owner-approved draft verbatim | hintScript.js, useHints.js, catalogs |
| Q5 | New HA intro card "Der Architekt" on the first architect phase (board over draw order, score effects only on won tricks, value/formation effects always, one main action, buildings persist but move/demolish freely) — owner-approved draft incl. correction | hintScript.js, useHints.js, catalogs |
| Q6 | Lessons architekt/wasist and architekt/hauptaktion deleted | catalog.js, scenes.jsx, catalogs |
| Q7 | New E10 event on the first ionized deck card: Sturmgröße/Sturmintensität with {v} = ION_SATURATION_VALUE; owner-final wording incl. "der Skill Überschlag" (EN "Arc-Over", ES "Arco", ZH 跃弧) | hintScript.js, catalogs |
| Q8 | New H6 banner on the first anchor perk offer ("Anker zählen als Formation …"); `offerHasAnker` from real family defs | hintScript.js, useHints.js, catalogs |
| Q9 | Breakdown line no longer resizes on a second row: `.bf-kette` gets `min-height: 32px` below 1280 px (diagnosis: min-h-5 + flex-wrap) | index.css |
| Q10 | C5 back to once-only (revert of R18's ✕-only persistence; the display fix stays) | useHints.js |
| Q11 | GameOver milestone bar uses the R21 per-milestone display (segFill + stage palette from ScoreMilestoneBar's exported TIER/TIER_HI; quarter marks gone) | GameOver.jsx, ScoreMilestoneBar.jsx |
| Q12/Q14 | H2b reworded to the owner's draft ("Ab jetzt steht neben Blitz auch Feuer zur Auswahl, wische nach rechts …"), targets feuer/karte | hintScript.js, catalogs |
| Q15 | Unlock notices C7 (Eis), C8 (Pflanze), C7b (both, stacked) on the skill screen; "Mehr dazu" targets the new archetype pages; C7b's markSeen also clears C7/C8 | hintScript.js, useHints.js, catalogs |
| Q13 | Fire lessons rebuilt per approved mockup: karte "Der Vorsprung" (three tab cases; loss cools, below HEAT_MIN_MARGIN nothing, clear win pays EXTRA score + heat, live fireScoreAt/marginHeatPoints), feld "Die Hitzeleiste" (auto-loop; five stages with Skill/Passiv badges), schmiede "Die Schmiede" (three links gated on Brandmal/Ascheschmiede + two card states) | scenes.jsx, catalog.js, catalogs |
| Q16 | Plant lessons rebuilt: karte "Das Wachstum" (red card grows with the REAL MossGrow effect; number blends to green; pure/mixed tab; replaces "erkennen"), feld "Grüne Karten zahlen" (three pay channels with badges), NEW tempo "Tempo und Trimmen" (tempo, purity incl. "Später Skills zu wechseln lohnt sich trotzdem", trimming, Überwucherung). Ice lessons rebuilt: karte "Der Gletscher" (mass auto-loop with the REAL FrostIce effect jumping at thresholds, burst, neighbour passive on page 1), NEW formationen "Gletscher-Formationen" (four shapes as tabs; Fläche demonstrates stacking, centre = product of the GEO_ constants), NEW einfrieren "Einfrieren" (freezing rules); free-tap Gletscherfeld lesson removed | scenes.jsx, catalog.js, beats.jsx, catalogs |
| Q17 | Every lesson not reachable from the first guided run deleted: whole grundlagen + fortgeschritten sections, aufstellung/brett + karte, danach/endscreen + baum (plus Q6's two). 14 scene components, 16 probe mappings, StreakProbe/GuideLink/deckstrip and 437 dead keys (311 + 126) removed across all four catalogs | catalog.js, beats.jsx, scenes.jsx, catalogs |

## Guard updates (invariant genuinely changed, owner-decided)

- `test/tutorial-sections.test.js`: the budget counter-check example probe follows the surviving
  smallest probe (`streak` → `einfrieren`); no rule change.
- `test/i18n-guards.test.js`: beats.jsx carries no display text and no i18n import any more —
  stays in MIGRATED (no word literal may return) but is exempt from the import-hygiene check
  (`TEXTLESS`). SAME_OK refreshed: stale entries of deleted keys removed; new entries
  `tut.sz.chipSkill`, `tut.sz.fs.n1`, `tut.sz.fv.pktKlar` (EN), `tut.sz.fv.pktKlar` (ES).
- New tests in `test/hints.test.js`: C7/C8/C7b selection incl. the C7b aliasing fallback, H6
  ordering (after H3, before H3b), E10 (first ionized card, after E5, once).

## Evidence

- Gates on the final tree: `npm test -- --maxWorkers=1` (153 files, 2467 tests green),
  `npm run lint -- --max-warnings=0`, `npm run build`, `npm run gen:db`, `npm run loc:export`.
- CDP (headless Chromium, 390×844, DE locale, production build):
  - All nine rebuilt archetype pages open from the overview and render per the approved mockups
    (screenshots); the Fläche tab shows the stacked centre ×3,28.
  - The REAL card effects run inside the tutorial cards (MossGrow, FrostIce with threshold jumps).
  - Q4 HF card appears over the first order phase of a fresh run, with the Q3 S-F1 energy hint
    visible behind it (screenshot).
  - Measured page heights (DE): feuerkarten 461 · hitze 432 · schmiede 529 · pflanzkarte 538 ·
    gruenfeld 434 · pflanztempo 375 · gletscher 638 · gletscherformen 535 · einfrieren 219;
    PROBE_PX set just above each.

## Deviations / notes

- **Q16 correction against the approved mockup:** the plant mockup said the green colour block is
  "bei ×3 gedeckelt" and rises "auf ×4" with Überwucherung. The engine caps it at the escalating
  factor at `PLANT_GREEN_FARBBLOCK_CAP` — today ×1,35, ×1,55 with Überwucherung — exactly the
  numbers `tut.pflanze.tipps.0` already states. The implementation interpolates the engine values;
  the mockup numbers were wrong, not the engine.
- Überwucherung threshold is interpolated as {pct} from `UEBERWUCHERUNG_FIELD` (66 %, the mockup
  said 60 %).
- The rebuilt lessons carry their Merksätze inside the scenes (as in the mockups); their tip
  beats are gone. The guard allows tip-less lessons since round 2.
- HA (architect intro card) shares the exact code path with the CDP-verified HF card (cardId in
  useHints); reaching the architect phase in a scripted run was not worth the flake risk.
- scenes.css still carries some now-dead rule blocks of the deleted scenes (e.g. `.build*`);
  follow-up cleanup, deliberately not mixed into this diff.
