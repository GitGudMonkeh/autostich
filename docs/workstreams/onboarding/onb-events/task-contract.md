# Task contract — onb-events (T-O2)

| | |
| --- | --- |
| Task | `onb-events`, Tier B/C |
| Feature branch | `feature/onboarding` |
| Task branch | `task/onb-events` |
| Base | `origin/dev` (carries T-O1/T-O3 and the onb-fixes hotfix) |
| Binding spec | `docs/tutorial-onboarding-design.md` §5.3, §5.4, §4a — owner-approved 2026-08-28 |
| Session | Claude Code remote session, owner-authorized (2026-08-28) |

## Scope

- Event hints **E1–E9** as bottom-anchored pause cards during play (light scrim — the referent
  stays visible), reading their signals from `state.lastTrick` (result, winStreak, isCrit,
  critMultiplier, formationMult, pValue vs pCard.value) and `milestoneBarState(score)`; live
  interpolations via `fmtNum`/`streakBaseMult`/`archetypeLabel`/`formationName`.
- UI hints **U1–U3** at quiet play-phase starts (`state.pos === 0`), scheduled on the play-visit
  ordinal (≥2 / ≥6 / ≥9), never on visit 1.
- Pacing (§5.4): max one card per trick, max two per play phase, deferred not queued; E5 outranks
  and may also use the phase start. A card freezes the run through the existing overlay chain.
- Owner playtest feedback, folded in: badge renamed **„Empfohlen"** (all four catalogs; reason
  line loses its now-duplicate prefix); tutorial banners and event cards carry a static glow
  frame in the tutorial accent; S-A2 names the district condition precisely (same category —
  same colour).

## Deviations from the spec, recorded

- **E8 is a banner on the end screen**, not a pause card: the victory screen is itself the payoff
  and must not be covered; the banner sits above its header, once per profile.
- **U1's copy is digit-free** ("… stellst das Tempo hoch, bis auf Max"): the ×2/×4 literals would
  be typed numbers the guard forbids and balance could drift; the control itself is on screen.
- **U2 says "Panels unter dem Spielfeld"** instead of "Seitenpanels" — true on phone and desktop
  alike (the paper's own mobile-anchor caveat, resolved by wording instead of viewport logic).
- **E9 drops the {karte} name** ("Deine Karte kämpft mit …") — cards carry no display name; the
  two values are the referent.

## Non-goals

Probierfeld rebuild and "Mehr dazu" wiring (T-O4) · `src/game/**` beyond read-only imports of
exported pure functions (none of the signals needed surfacing — `lastTrick` carries them all).

## Acceptance gate

`npm test` · `npm run lint -- --max-warnings=0` · `npm run build` · `npm run gen:db` ·
`npm run loc:export` — all green; `test/hints.test.js` covers the event selection, quotas,
U-scheduling and E8.
