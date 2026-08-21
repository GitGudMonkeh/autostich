# docs/decisions — historical engineering records

This directory holds **historical engineering records**: what was measured, decided, tried, and
rejected, together with the reasoning. It is a logbook, not a rulebook.

| You want… | Read |
| --- | --- |
| Current rules every agent must follow | `AGENTS.md` |
| Current engineering documentation | `docs/engineering/` |
| Why an existing system was built the way it is | this directory |

**These records are context, not standing instruction.** Branch names, test counts, file lists, and
"current state" claims inside them were accurate when written and may be obsolete now. Never act on
such a claim without verifying it against current code and current documentation.

## Contents

| File | What it is |
| --- | --- |
| `engineering-log-2026-08.md` | The project engineering log through August 2026. German, dated, `#tag`-indexed. It originated as the engineering log formerly kept at the repository root as `CLAUDE.md`; the historical records are preserved subject only to the documented migration annotations and deduplication below. |

**Language.** The historical engineering entries remain in **German** and are **not translated.**
Migration metadata may be English — the historical header at the top of the log, the status markers,
and this index. Historical content is not reformatted, not spell-corrected, and not rewritten; the
single confirmed duplicate block removed during migration is the documented exception.

## How to read the log

**Do not read it front to back, and do not preload it.** It is self-indexing by `#tag`. Search for
the tag or keyword your task needs:

```bash
grep -n "#perf-dpr" docs/decisions/engineering-log-2026-08.md
grep -n "backdrop-filter" docs/decisions/engineering-log-2026-08.md
grep -nE "^#{2,4} " docs/decisions/engineering-log-2026-08.md   # list every entry heading
```

Entries cross-reference each other by tag, so one hit usually leads to the rest of the thread.

## Status markers

Some entries are contradicted by later ones. Where the log already says so in its own words, a
one-line marker sits **above the heading**. The marker is an addition; the entry below it is
unchanged.

| Marker | Meaning | The log's own word |
| --- | --- | --- |
| `SUPERSEDED IN PART` | A state or decision recorded below no longer holds. | *überholt* |
| `REFUTED` | A factual premise recorded below was disproved by later measurement. | *widerlegt* |
| `CORRECTED` | The reasoning below is wrong in stated ways; the conclusion still stands. | *falsch* |

Markers are applied only where the log itself already proves the change, and they name the later
entry responsible. An entry without a marker is not thereby guaranteed current — it only means no
contradiction was recorded.

## Topic index

Entry points per area. Search the tag to reach the full thread.

| Area | Start at |
| --- | --- |
| Performance, DPR, render cost | `#perf-dpr`, `#perf-aa`, `#perf-scroll`, `#perf-spend`, `#perf-warm`, `#perf-blur`, `#perf-ring`, `#perf-overlay`, `#perf-nova`, `#perf-holo`, `#perf-holo2`, `#perf-meteor2`, `#perf-ansage`, `#perf-ansage2` |
| Compositor and Pixi architecture | `#kompositor`, `#fx-spike`, `#deckglow-raus`, "Rendering-Fakten", `#cleanup` |
| Effects, previews, workshop | `#fx-panel`, `#fx-flaeche`, `#fx-dichte`, `#fx-grace`, `#fx-deckdefault`, `#vorschau-brett`, `#vorschau-boden`, `#vorschau-deck`, `#shop-demo`, `#arch-eff` |
| Cube matrix (audio-driven field) | `#cube-takt`, `#cube-flimmern`, `#cube-deckfarbe` |
| Mobile and iOS | `#deck-mobil`, `#kachel-glyph`, `#boden-zeile`, `#ios-glow`, `#ios-word`, `#314` |
| Desktop pass (screen-by-screen) | `#desktop-leitfaden`, `#glossar-desktop`, `#buehne`, `#deckflug`, `#skillheim`, `#deckzug`, `#kartenreihe`, `#deckpaar`, `#turbo-takt`, `#cz-ruhe`, `#lv-ruhe`, `#up-ruhe`, `#st-ruhe`, `#rd-ruhe`, `#wing-ruhe`, `#hub-knopf`, `#ecke`, `#eckig`, `#ruhe`, `#typo` |
| Layout traps and overlays | `#overlay-portal`, `#flach`, `#lv-fest`, `#lv-anker`, `#lv-mitte`, `#kpi-passt`, `#brett-luft` |
| Localization and wording | `#sprache`, `#marke`, `#formlegend`, `#skilltext`, `#packsort`, `#up-untertitel`, `#bonus-benennen` |
| Deploy and media structure | `#F-01` |
| Privacy and telemetry | `#datenschutz` |
| Ranked and global leaderboard | `#370`, `#global` |
| Progression, skills, run flow | `#316`, `#meisterhand`, `#victory-perks`, `#sk-ablehnen`, `#lv-gebaeude`, `#held-merken`, `#run-dialoge`, "Tuning-Größen" |

Guard-test and ratchet lessons are scattered across many entries; search `Wächter`, `Ratsche`, or
`Gegenprobe` to find them.
