# Task contract — onb-hints (T-O1)

| | |
| --- | --- |
| Task | `onb-hints`, Tier C |
| Feature branch | `feature/onboarding` |
| Task branch | `task/onb-hints` |
| Base | `origin/dev` (via `feature/onboarding`) |
| Binding spec | `docs/tutorial-onboarding-design.md` §5.1, §5.2, §5.4, §9 (T-O1) — owner-approved 2026-08-28 |
| Session | Claude Code remote session, owner-authorized task creation (2026-08-28) |

## Scope

The hint engine and the first-contact hints that live on decision screens:

- `src/ui/hints/hintScript.js` — hints as data (i18n keys, targets, sequence rules), pure and
  node-testable; display names and numbers interpolated from registries/constants, never typed.
- `src/ui/hints/useHints.js` — per-profile seen-set and phase-visit counters (persisted via
  `storage.js`, key in `RESET_KEYS`), hint selection per screen, dismissal on decide or ✕.
- `src/ui/hints/HintCard.jsx` — the H1 welcome card (blocking, pause-coupled) and the banner
  (Zeile recipe, eyebrow, ✕); respects the FX levels.
- Banner slots in the eight decision screens; App wiring (provider, H1 card, play freeze).
- Hints: H1, H2, H2b, H3, H3b, H5, S-F1–3, S-A1–4, C1–C4 — copy per the paper's DE/EN drafts;
  es and zh-Hans lines follow the existing catalogs' terminology.
- "Mehr dazu" stays inert until T-O4 (no link is rendered while no handler exists).

## Non-goals

Event hints and UI hints (T-O2) · first-run gating, skip and badge (T-O3) · any change to the
tutorial sections (T-O4) · `src/game/**` beyond read-only imports of exported pure functions.

## Tripwire

A diff touching `src/game/**` other than to read — stop.

## Acceptance gate

`npm test` · `npm run lint -- --max-warnings=0` · `npm run build` · `npm run gen:db` ·
`npm run loc:export` — all green; new guard test `test/hints.test.js` (catalog integrity, target
existence, selection logic, done-predicates).

## Deviations from the spec, recorded

- **H5's "Mehr dazu" target is `wahl/kategorien`, not `wahl/perks`** as the paper's §5.1 row says:
  `wahl/perks` is one of the eleven text lessons T-O4 deletes (§8), and the paper's own retarget
  rule moved every other pointer off the deleted lessons — the H5 row was added later and missed
  the sweep. The paper is corrected alongside this task.
