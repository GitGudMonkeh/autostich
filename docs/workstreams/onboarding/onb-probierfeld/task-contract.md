# Task contract — onb-probierfeld (T-O4)

| | |
| --- | --- |
| Task | `onb-probierfeld`, Tier B |
| Feature branch | `feature/onboarding` |
| Task branch | `task/onb-probierfeld` |
| Base | `origin/dev` (carries T-O1/T-O3, the onb-fixes hotfix, and T-O2) |
| Binding spec | `docs/tutorial-onboarding-design.md` §8, §5.1 (Mehr dazu), §9 — owner-approved 2026-08-28 |
| Session | Claude Code remote session, owner-authorized (2026-08-28) |

## Scope

- **The sections become the Probierfeld** — a pull-only reference, renamed in all four catalogs
  (Probierfeld · Playground · Campo de pruebas · 练习场). One flat list (section headers coloured
  from `ARCHETYPE_META`, lesson rows, a per-row "gelesen" bookmark) replaces the three-level
  navigation; the resume block and the global progress counters go, because an index has no
  curriculum to resume.
- **Text-only lessons whose teaching now lives in the hints are deleted** (10 lessons; every
  remaining lesson keeps at least one interactive probe or is genuinely post-run material).
- **"Mehr dazu" deep links**: every hint form — phase banner, H1 card, event card — renders the
  link when App provides a handler; it opens the hint's `target` ("section/lesson") directly as
  a Probierfeld round over the frozen run (`tutOpen` now carries `true` or `{section, lesson}`),
  and closing returns to the hint. Opening counts as read.
- **Start screen**: the loud first-contact offer starts the first run itself (the guided run is
  gone — the run *is* the tutorial); the quiet chip opens the Probierfeld under its new name.

## Deviations from the spec, recorded

- **`architekt/aufwerten` stays** (spec §8 listed it for deletion): S-A4 deep-links to it, and the
  script-integrity guard rightly refuses a hint whose target is gone. 10 deletions, not 11.
- **The salvaged `blitz/karte` sentence is merged into its probe hint** instead of standing as its
  own beat: as a beat the lesson broke the 960 px height budget (measured 998/977 px). Same words,
  same lesson, one fewer block.
- **`hint.e8.body` now names the Probierfeld** — the spec's copy predates the rename and pointed
  at "the tutorial", a name no surface carries any more.

## Non-goals

Hint script/selection changes (T-O1/T-O2 own them) · `src/game/**` · desktop layout pass for the
overlay shell (inherits the menu rework, owner decision 5).

## Acceptance gate

`npm test` · `npm run lint -- --max-warnings=0` · `npm run build` · `npm run gen:db` ·
`npm run loc:export` — all green; CDP probe against the built preview: H1 shows the link, the
link opens `grundlagen/stich` over the run, closing returns with H1 still standing.
