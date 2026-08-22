# Task Contract — icons-skills

**Tier C — large UI / architecture workstream** (`docs/engineering/task-lifecycle.md` — *Tier C —
large UI / architecture workstream*), running as a task under the `feature/desktop-icons` feature
integration branch.

This contract is the binding scope statement. Where it and any planning report disagree, **this
contract wins**.

---

## Identity

| Field | Value |
| --- | --- |
| **Task** | icons-skills |
| **Feature** | feature/desktop-icons |
| **Branch** | `task/icons-skills` |
| **Base** | `origin/feature/desktop-icons` @ `3013881f723080753b8829feea4b051356f0cae0` |
| **Owner** | TODO — staffing decision; see `AGENTS.md` — *Roles and source of truth* |
| **Integrator** | TODO — staffing decision; see `AGENTS.md` — *Roles and source of truth* |
| **Reviewer** | TODO — staffing decision; see `AGENTS.md` — *Roles and source of truth* |
| **Concurrency** | One writer. Sequential sessions may continue this task in the same worktree. Never two simultaneous writers. |

---

## Local workspace

| Field | Value |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/icons-skills` |
| **Branch checked out there** | `task/icons-skills` |
| **Upstream** | None. The branch deliberately does not track its base. |
| **Preview port** | `5183` |
| **Preview URL** | `http://localhost:5183` |

Server invocation:

```bash
npm run dev -- --port 5183 --strictPort
```

---

## Scope

Complete the two remaining skill archetypes so all four factions ship art. This is the lowest-risk
task of the workstream: `icons-asset-audit` already delivered the mapping, the lot table and a proven
bake path, and **no wiring is required** — `src/ui/skillArt.js` globs `../assets/skills/*/*.webp` and
binds by filename, so correctly named delivery files are picked up with no code change.

Three parts, in order:

1. **Ingest the fire lot.** 6 of 21 masters exist (`SK_FIRE_01..06`); the remaining 15 come from the
   local PNG source via the mapping table. Produce all 21 masters under `docs/art/skills/fire/` and
   all 21 delivery copies under `src/assets/skills/fire/`.
2. **Ingest the plant lot.** No masters exist at all. Produce 21 masters under
   `docs/art/skills/plant/` and 21 delivery copies under `src/assets/skills/plant/`.
3. **Verify per-lot light consistency** for each of the two lots against its own median, following
   the method already applied to ice — not a forced match to a Blitz number.

**The lot-completeness gate is the mechanism, not an obstacle.** `bake` skips a lot that does not
hold `expect=21` sources and says so; a faction tab showing art on 6 of 21 offer cards reads as
breakage, not as progress. Fire only starts rendering when all 21 are in place, which is also the
resolution of `ICONS-VIS-03`.

## Non-goals and tripwire

| Non-goal | Why |
| --- | --- |
| Any change to `src/ui/SkillSelect.jsx`, `LegendarySelect.jsx` or `skillArt.js` | No wiring is needed. Art binds by filename through the existing glob. A code change here means the naming went wrong, not that the code is missing something |
| Perk-category, legendary-perk or corner-ornament assets | Owned by `icons-perks` and `icons-corners` |
| Re-baking the lightning or ice lots | Shipped and owner-approved. `ICONS-VIS-01` would require exactly this and is deliberately deferred |
| Any new icon design or artwork edit | Artwork is final |
| Any change to the mobile UI | Established workstream non-goal |
| Reopening `ICONS-VIS-04` (Donnergott gold in two places) | Recorded as **input** to this task, not as work. Artwork is final and owner-approved; the deviation is documented, not corrected |

### Tripwire

> **If the diff needs to touch `src/ui/**` or the `STRIP_W`/bloom constants, stop.**

Both mean the task has left asset ingestion. A filename that does not bind is a naming defect to fix
in the filename; a lot that looks wrong is a per-lot value, not a global constant.

## Approved architecture

1. **Master/delivery split**, as established: full-resolution WebP master under `docs/art/skills/…`,
   bloom-baked delivery copy under `src/assets/skills/…`. Never the same file at two sizes.
2. **Filenames come from the audit's mapping table**, not from a fresh reading of the source folder.
   The table is the reviewed artefact; re-deriving names invites exactly the errors it closed.
3. **Light alignment is per lot.** Fire is measured against fire, plant against plant. The lightning
   lot ships two tiles at ~2.2× its own median deliberately, and the owner accepted the same for ice
   at V3 — so a wide spread is not by itself a defect.
4. **If a lot needs pulling down, use the documented cap** (pull down above a threshold, leave
   everything below untouched, factor found numerically) — never a re-generation of artwork.
5. **No history rewrite, no force flags, no push to a permanent branch, no promotion.**

## Task-specific inputs

| Input | Value |
| --- | --- |
| Mapping table | `docs/workstreams/desktop-icons/icons-asset-audit/asset-mapping.md` + `.tsv` — authoritative, 98 rows |
| Build script | `scripts/skill-art-build.py` — `fire` and `plant` lots already registered, calibrated (`strip_w` = the skill-card default), `expect=21` gate active |
| Fire, current state | **6 of 21** masters (`SK_FIRE_01..06`), **0** delivery — measured at base `3013881f` |
| Plant, current state | **0** masters, **0** delivery — measured at base `3013881f` |
| Reference lots | lightning 21/21, ice 21/21 — both shipped |
| Source resolution | All skill sources 1254×1254 PNG, 8-bit truecolour, no alpha → downscaled to the 1024 master, never upscaled. Two fire sources are non-square (`feuersturm` 1122×1402, `lauffeuer` 1536×1024) and take the black-pad rule |
| Rendered header geometry | `270.66 × 210`, `cover`, `center top`, `screen`, 62 % mask fade — measured live by the audit at 1920×1080 DPR 1 |
| Carried-in finding | `ICONS-VIS-04` — on `SK_LIGHTNING_L01` Donnergott gold reads in two places while `docs/art/skills/README.md` states one place per legendary. Input, not work |

## Acceptance gate

> **All four archetypes hold 21 masters and 21 delivery files with names that round-trip through the
> live `artIdFromFile` rule, and every offer card in the fire and plant tabs renders its header art
> in the running application.**
>
> A lot that bakes cleanly but leaves one card without art fails this gate — the completeness gate
> exists precisely because a partial lot reads as breakage.

## Expected file surface

**Written by this task**

| Path | Change |
| --- | --- |
| `docs/art/skills/fire/*.webp` | 15 new masters (6 exist) |
| `docs/art/skills/plant/*.webp` | 21 new masters |
| `src/assets/skills/fire/*.webp` | 21 new delivery copies |
| `src/assets/skills/plant/*.webp` | 21 new delivery copies |
| `docs/art/skills/README.md` | Collection-state table updated |
| `docs/workstreams/desktop-icons/icons-skills/*` | Contract, visual review, evidence package |
| `test/skill-art.test.js` | **Only** if the completeness ratchet needs the two new lots added — an addition, never a weakening |

**Must not be touched**

- `src/ui/**` — the tripwire
- `docs/art/skills/{lightning,ice}/**`, `src/assets/skills/{lightning,ice}/**`
- `docs/art/{perkcats,corners,legendaries}/**` — other tasks' lots
- `AGENTS.md`, `CLAUDE.md`, `docs/engineering/**`, `docs/decisions/**`

## Known hazards

| # | Hazard | Status at contract-writing |
| --- | --- | --- |
| H1 | The 6 existing fire masters predate the audit's pipeline and may not match the 15 new ones in size or treatment | **Not measured** — check before baking; re-derive all 21 from source if they diverge |
| H2 | Two fire sources are non-square and take the black-pad rule | **Measured by the audit**, favourably — but verify the padded result reads correctly in the 270.66×210 crop |
| H3 | The completeness gate silently skips a lot that is one file short | **Known behaviour** — read the script's own output rather than assuming a bake ran |
| H4 | Windows/Linux case sensitivity on the new `plant/` directory | **Not measured** — all-lowercase ASCII, matching siblings; CI covers Linux |
| H5 | V1 baseline | **Taken by the owner before this task started** — captured 2026-08-22 |

## Definition of done

- [ ] Fire lot complete: 21 masters, 21 delivery files, names round-trip through `artIdFromFile`
- [ ] Plant lot complete: 21 masters, 21 delivery files, names round-trip through `artIdFromFile`
- [ ] Per-lot light consistency measured and recorded for fire and for plant, each against its own median
- [ ] Any cap applied is recorded with its numeric factor and its reason
- [ ] `docs/art/skills/README.md` collection state updated
- [ ] V2 capture taken at the same sizes, DPR and state as the owner's V1
- [ ] V3 human visual gate passed — **only a person can close this**
- [ ] V4 classification written; every finding carries an ID
- [ ] `npm test`, `npm run lint -- --max-warnings=0`, `npm run build`, `VITE_PREVIEW=1 npm run build`, `npm run gen:db` — all green
- [ ] Evidence package written, stating its own limits; hazards H1–H5 each marked
- [ ] `ICONS-VIS-03` confirmed resolved (fire cards now render art)

## Open questions

| # | Question | Blocking? |
| --- | --- | --- |
| Q1 | Do the 6 pre-existing fire masters match the audit's pipeline output, or should all 21 be re-derived from the PNG source for consistency? | Yes — decides the ingest path |
| Q2 | `ICONS-VIS-04` documents a two-place gold deviation on Donnergott. Should the same check run across the fire and plant legendaries before shipping, or is the artwork accepted as final without it? | No — reportable either way |
