# Task contract — onb-polish (owner playtest round 2)

| | |
| --- | --- |
| Task | `onb-polish`, Tier B |
| Feature branch | `feature/onboarding` |
| Task branch | `task/onb-polish` |
| Base | `origin/dev` (carries T-O1–T-O4) |
| Binding spec | `docs/tutorial-onboarding-design.md` §5.2/§5.3 as amended by the owner's playtest findings, 2026-08-28 (six numbered findings with screenshots) |
| Session | Claude Code remote session, owner-authorized (2026-08-28) |

## Scope — the six findings

1. **Referent marking**: event/UI cards whose referent is a standing screen element scroll it into
   view and frame it with the static tutorial glow while the card is open. `anchor` on the hint
   def → `data-hint-anchor` in the UI; applied to E1/E3 (score row), E5 (the active archetype's
   faction bar, via a `FactionShell` prop), E7 (milestone bar), U1 (tempo controls), U2 (multiplier
   panels), U3 (Chronik button), U4 (breakdown line). E2/E4/E9 stay unanchored — their referent is
   the trick itself.
2. **E3 copy**: names the loop — win after win grows the streak and with it the multiplier.
3. **Sequences run unconditionally**: the done-predicates are removed (defs, selection, helpers).
   A randomly dealt board that already met a goal silently swallowed the whole formation
   curriculum (S-F1 skipped for Farbblock, S-F2 for two types, S-F3 for overlap — all present in
   the owner's dealt deck). Every step now shows on its visit; the banner stands at the top of the
   phase from the first render.
4. **E5 copy fixed for Blitz** (same mechanic error as the badge reason once had): crits fill the
   charge; a full bar ionizes a card. Per-archetype `bodyKey` — Blitz gets the mechanic sentence,
   the other bars keep the generic line, so the hint never lies about heat/growth/mass.
5. **U3 anchors the Chronik button** (copy unchanged).
6. **Breakdown line**: a new late hint **U4** (first win from play visit 12, only while the line
   is enabled) explains the factor chain under the cards, anchored to it. The option default was
   checked and **not changed**: `hideBreakdown` has been `false` (visible) since the feature
   shipped — the owner's test profile carried a stored opt-out, new players see the line.

## Deviations, recorded

- The paper's §5.2 rule 2 (skip met goals) is struck through in place with the owner decision —
  the rule text would otherwise invite rebuilding the predicates.
- U4 sits in the paper's UI-hint table but is trigger-wise an after-win event, not a phase-start
  hint: the line only carries numbers after a win.

## Non-goals

Spotlight/anchor machinery beyond scroll + glow · changes to quotas or pacing · `src/game/**`.

## Acceptance gate

`npm test` · `npm run lint -- --max-warnings=0` · `npm run build` · `npm run gen:db` ·
`npm run loc:export` — all green; CDP probe against the built preview: E1 open ⇒ score row glows,
U1 open ⇒ tempo group glows, dismiss ⇒ glow cleared; anchor-integrity guard in
`test/hints.test.js` ties every def anchor to a `data-hint-anchor` in the source.
