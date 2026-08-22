# Evidence package — icons-skills

## Status and durable range

| Field | Value |
| --- | --- |
| Contract base | `3013881f723080753b8829feea4b051356f0cae0` |
| Contract commit already on the task branch | `83a9d818c4e98b2051e8487f74c0aa954b5de8c2` |
| Implementation review HEAD | `40d186014a4ccd30815c5c974d58db80b40d0860` |
| Immutable implementation range | `3013881f723080753b8829feea4b051356f0cae0..40d186014a4ccd30815c5c974d58db80b40d0860` |
| Branch | `task/icons-skills`, no upstream |

The user created the implementation commit directly in the explicitly assigned task worktree after
the editor's atomic commit dialog could not target the sibling worktree. The worktree was clean and
the branch HEAD matched the implementation review HEAD immediately afterwards. Independent review
must use the immutable range above rather than a branch-name or working-tree diff.

No push, merge, promotion, or pull request was performed.

## What was proven

### Asset ingestion and naming

- The authoritative mapping table was consumed by `scripts/skill-art-build.py`; names were not
  re-derived from the artist folder.
- Fire and Plant master filename sets equal their mapping-table master sets exactly.
- Fire and Plant delivery filename sets equal their mapping-table delivery sets exactly.
- Every new master is 1024×1024 RGB WebP; every delivery is 384×384 RGB WebP.
- No master is byte-identical to its delivery counterpart; the master/delivery split is real.
- The expanded `test/skill-art.test.js` compares every archetype's delivery IDs to the live
  `SKILL_DEFS` registry through the live `artIdFromFile` parser.

The ingestion and bake commands were:

```powershell
py -3 scripts/skill-art-build.py ingest --lot fire --from "C:/Users/Monkeh/Pictures/Icons"
py -3 scripts/skill-art-build.py bake --lot fire
py -3 scripts/skill-art-build.py ingest --lot plant --from "C:/Users/Monkeh/Pictures/Icons"
py -3 scripts/skill-art-build.py bake --lot plant
```

Both bake commands explicitly printed their complete-lot line rather than a `skip` line. Exact-set
and dimension reproduction:

```powershell
$rows = Import-Csv `
  docs/workstreams/desktop-icons/icons-asset-audit/asset-mapping.tsv `
  -Delimiter "`t"

foreach ($lot in @("fire", "plant")) {
  $mapped = $rows | Where-Object lot -eq $lot
  $expectedMasters = $mapped.master | ForEach-Object { Split-Path -Leaf $_ }
  $expectedDeliveries = $mapped.delivery | ForEach-Object { Split-Path -Leaf $_ }
  $actualMasters = Get-ChildItem "docs/art/skills/$lot" -Filter *.webp | Select-Object -Expand Name
  $actualDeliveries = Get-ChildItem "src/assets/skills/$lot" -Filter *.webp | Select-Object -Expand Name
  Compare-Object $expectedMasters $actualMasters
  Compare-Object $expectedDeliveries $actualDeliveries
}
```

Expected result: no `Compare-Object` output.

### H1 — pre-existing Fire masters

The complete Fire ingest was run over the six tracked masters as well as the new sources. Git
reported no modification for any tracked Fire master; only the missing mapping rows appeared as new
files. This is stronger than a visual similarity claim: on this host and Pillow version, current
pipeline output is byte-identical to the committed files.

### Per-lot light review

`light-measurement.md` records the method, every measured row, each lot's own median and span, and
the V3 decision. No cap was applied. The owner saw both V2 contact sheets with the outliers named
and passed V3 with the verdict **“Bestanden, kein Cap.”**

### Completeness guard and counter-checks

Targeted green run:

```powershell
npx vitest run test/skill-art.test.js
```

The new generalized guard was then counter-checked by temporarily renaming one delivery file per
newly protected seam and restoring it in a `finally` block:

| Sabotage | Required failure observed |
| --- | --- |
| Remove `SK_FIRE_01_glut.webp` from the scan | Missing `SK_FIRE_01` reported under Fire |
| Remove `SK_PLANT_02_wurzeltiefe.webp` from the scan | Missing `SK_PLANT_02` reported under Plant |
| Remove `SK_ICE_01_anfrieren.webp` from the scan | Missing `SK_ICE_01` reported under Ice |
| Copy `SK_ICE_01_anfrieren.webp` into the Fire directory | Misplaced Ice filename reported under Fire |
| Copy `SK_FIRE_01_glut.webp` to a second filename with the same ID | Duplicate `SK_FIRE_01` reported under Fire |

The targeted Skill-Art run was green after every file was restored. The guard now classifies each
lot against only that archetype's registry IDs and reports missing, misplaced, invalid, and duplicate
entries separately.

## Scope compliance

Measured against the contract base and the live working-tree status:

- no file under `src/ui/**` changed;
- neither Lightning nor Ice master/delivery tree changed;
- no perk-category, corner, or legendary-perk asset changed;
- `AGENTS.md`, `CLAUDE.md`, `docs/engineering/**`, and `docs/decisions/**` are unchanged;
- `scripts/skill-art-build.py` is unchanged, so `STRIP_W` and all bloom constants are unchanged.

Reproduce the must-not-touch check:

```powershell
git diff --name-only 3013881f723080753b8829feea4b051356f0cae0 -- `
  src/ui docs/art/skills/lightning docs/art/skills/ice `
  src/assets/skills/lightning src/assets/skills/ice `
  docs/art/perkcats docs/art/corners docs/art/legendaries `
  AGENTS.md CLAUDE.md docs/engineering docs/decisions `
  scripts/skill-art-build.py
git status --short -- `
  src/ui docs/art/skills/lightning docs/art/skills/ice `
  src/assets/skills/lightning src/assets/skills/ice `
  docs/art/perkcats docs/art/corners docs/art/legendaries `
  AGENTS.md CLAUDE.md docs/engineering docs/decisions `
  scripts/skill-art-build.py
```

Expected result: no output from either command.

## Gate results

Run in the contract-required order on 2026-08-22. The host-wide Node 24 installation repeatedly put
the i18n coverage guard just beyond its per-test timeout under full-suite load, while the affected
file passed in isolation. Because CI pins Node 22, the unchanged package test script was also run
through a temporary Node 22 npm CLI without Vitest flags, config changes, or timeout changes. It
completed successfully once, but later exact repeats hit the same isolated i18n timeout, including
after the task preview server was stopped. The canonical gate is therefore not durably green.

| Gate | Result |
| --- | --- |
| Node 22: unchanged `npm test` package script | Mixed, load-sensitive result: one successful run followed by repeats timing out only in `test/i18n-guards.test.js`; not durably green |
| Host Node 24: post-commit `npm test` on the implementation review HEAD | Failed only because `test/i18n-guards.test.js` exceeded its per-test timeout under full-suite load; no assertion failed |
| `npx vitest run test/i18n-guards.test.js test/faction-panels.test.js` | Passed together in isolation; this classifies the observed Node 24 failure as load-sensitive, not as a replacement for the Node 22 package-script gate |
| `npm run lint -- --max-warnings=0` | Passed on the final ratchet state |
| `npm run build` | Passed; Vite emitted its existing chunk-size advisory |
| PowerShell: `$env:VITE_PREVIEW = "1"; npm run build`, then unset | Passed; same advisory |
| `npm run gen:db` | Passed |

No player-visible text changed, so `npm run loc:export` was not applicable.

## Independent review finding disposition

| Finding | Disposition at this package revision |
| --- | --- |
| `ICONS-REV-001` | Resolved: implementation commit and immutable base-to-head range recorded above |
| `ICONS-REV-002` | Still blocked by the absence of a supported browser instance after a remediation retry; no substitute evidence claimed |
| `ICONS-REV-003` | Still open: post-commit `npm test` on the stable implementation HEAD timed out only in the i18n coverage guard; no timeout or test source was changed |
| `ICONS-REV-004` | Fixed with per-lot membership and duplicate checks; both failure modes counter-checked |
| `ICONS-REV-005` | Fixed; durable task documents no longer record volatile test totals |

## Contract hazards

| Hazard | Status at handoff |
| --- | --- |
| H1 — six older Fire masters may diverge | **Measured, closed:** byte-identical current pipeline output |
| H2 — padded `feuersturm` and `lauffeuer` | **Observed at asset level:** both read correctly in the measured header crop; running-app observation open |
| H3 — completeness gate can skip silently if output is ignored | **Measured, closed:** both commands printed complete-lot bake output and exact mapped sets exist |
| H4 — Windows/Linux case sensitivity | **Partially measured:** lowercase ASCII and mapping-exact on Windows; Linux awaits CI after push |
| H5 — owner V1 baseline | **Bounded:** contract says it exists; worker never received it and could not produce a matching full-screen V2 without a browser |

## Evidence limits

Measured host: Windows NT 10.0.26200.0, Node v24.18.0, npm 11.16.0, Python 3.12.10, Pillow
12.3.0. Nothing was run locally on Linux.

The Vite server returned HTTP 200 on the contract port and was running again during review
remediation. However, the supported browser runtime still reported no available browser. Therefore:

- the two prepared V2 sheets are deterministic renders of the generated delivery inputs at measured
  header geometry, not application screenshots;
- the worker did not observe every Fire and Plant offer card in the running application;
- the exact V1/V2 full-screen match is not proven;
- `ICONS-VIS-03` and the binding acceptance gate remain open despite the asset pipeline, registry
  seam, bundle inclusion, and human asset-level V3 passing; the final full test gate is separately
  red as recorded above.

Independent review, commit-SHA range review, CI, integration, and deployment were not performed.
