# Task Contract — icons-asset-audit

**Tier C — large UI / architecture workstream** (`docs/engineering/task-lifecycle.md` — *Tier C —
large UI / architecture workstream*), running as a task under the `feature/desktop-icons` feature
integration branch.

This contract is the binding scope statement. Where it and any planning report disagree, **this
contract wins**.

---

## Identity

| Field | Value |
| --- | --- |
| **Task** | icons-asset-audit |
| **Feature** | feature/desktop-icons |
| **Branch** | `task/icons-asset-audit` |
| **Base** | `origin/feature/desktop-icons` @ `863febe54fce513c4171314eb8cfc0d86f997408` |
| **Owner** | TODO — staffing decision; see `AGENTS.md` — *Roles and source of truth* |
| **Integrator** | TODO — staffing decision; see `AGENTS.md` — *Roles and source of truth* |
| **Reviewer** | TODO — staffing decision; see `AGENTS.md` — *Roles and source of truth* |
| **Concurrency** | One writer. Sequential sessions may continue this task in the same worktree. Never two simultaneous writers. |

---

## Local workspace

| Field | Value |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/icons-asset-audit` |
| **Branch checked out there** | `task/icons-asset-audit` |
| **Upstream** | None. The branch deliberately does not track its base. |
| **Preview port** | `5182` |
| **Preview URL** | `http://localhost:5182` |

Server invocation:

```bash
npm run dev -- --port 5182 --strictPort
```

---

## Scope

This is the Tier C workstream's foundation task. It produces no UI change; it produces the mapping,
convention and tooling that `icons-skills`, `icons-perks` and `icons-corners` consume. Five parts, in
order:

1. **Reconcile already-in-repo masters against the local source.** Diff
   `C:\Users\Monkeh\Pictures\Icons\perks\*.png` (7 files) against `docs/art/perkcats/perkcat_*.webp`
   (7 files) and `C:\Users\Monkeh\Pictures\Icons\rahmen\*.png` (5 files) against
   `docs/art/corners/corner_*.webp` (5 files). For each pair, determine **identical artwork** (just a
   different export format) or **updated artwork** (the local PNG supersedes the repo WebP). Record
   the method used (visual diff, hash-of-decoded-pixels, or equivalent) and the verdict per file.
2. **Build the full 98-item filename mapping table**, local/source filename → final repo path and
   filename, cross-checked against game-data `name`/`label` fields — never against a visual guess:
   - `Blitz/` (2) → `SK_LIGHTNING_01_blitzableiter.webp`, `SK_LIGHTNING_L01_donnergott.webp` (replacing
     the current files at those IDs)
   - `Eis/`, `Fire/`, `Pflanze/` (21 each, 63 total) → `SK_<ARCH>_<NN>_<slug>.webp` per
     `src/game/skills.js`, following the existing convention visible in
     `docs/art/skills/lightning/*.webp` and `docs/art/skills/fire/SK_FIRE_01..06*.webp`
   - `legendäre/` (21) → proposed new convention `PERK_<id>_<slug>.webp` (see *Approved architecture*),
     one entry per `PERK_DEFS` key in `src/game/perks.js`
   - `perks/` (7) → confirm against the existing `perkcat_<KEY>_<slug>.webp` files already in
     `docs/art/perkcats/`
   - `rahmen/` (5) → confirm against the existing `corner_<archetype-en>.webp` files already in
     `docs/art/corners/`
   Two mappings are **pre-resolved by the owner in planning** and must be carried through unchanged:
   `gletscherzturz.png` → `SK_ICE_14` ("Gletschersturz", typo in the source filename) and
   `Lawine.png` → `SK_ICE_L03` ("Große Lawine", shortened source filename) — both confirmed
   typos/short forms of the named legendary/regular ice skills, not different artwork.
3. **Generalize `scripts/skill-art-build.py`** so it accepts a PNG source (current script assumes a
   WebP master) and can run for `fire`, `ice`, `plant` in addition to `lightning`, producing correctly
   named WebP masters under `docs/art/skills/<archetype>/` and baked-bloom delivery copies under
   `src/assets/skills/<archetype>/`. Prove the generalization against **at least one** non-lightning
   archetype end to end.
4. **Apply the per-lot light-alignment principle** (see *Approved architecture*) to whichever group
   this task actually bakes — verify internal consistency within that lot, not a forced match to
   Blitz's exact measured value.
5. **Resolve the two open questions about perkcat/corner/legendary-perk delivery location** (see
   *Open questions*) and record the decision, since `icons-perks`/`icons-corners` need it as a
   precondition.

## Non-goals and tripwire

| Non-goal | Why |
| --- | --- |
| Any wiring into `SkillSelect.jsx`, `LegendarySelect.jsx`, `PerkSelect.jsx`, or a new corner-ornament component | Phase 2 work, owned by `icons-skills` / `icons-perks` / `icons-corners` |
| Any new icon design or artwork edit | Artwork is final — established non-goal from the original workstream request |
| Any change to the mobile UI | Established non-goal from the original workstream request |
| Touching any already-final lightning asset **except** the two named replacements | `Blitzableiter`/`Donnergott` are the only approved Blitz changes; everything else in `docs/art/skills/lightning/` and `src/assets/skills/lightning/` is out of scope |
| Deciding regular-perk (family) icon treatment beyond "category icon only" | Already settled by the owner in planning — not re-litigated here |

### Tripwire

> **If the diff needs to touch anything under `src/ui/**` or `test/**`, stop.**

This task prepares and names assets; it does not wire them and does not need a test change. Either
one means Phase 2 scope has crept into this task.

## Approved architecture

Binding statements, not suggestions.

1. **Master/delivery split, as already established for skills**, extends to every group this task
   touches: a full-resolution WebP master (`docs/art/...`) and a smaller, bloom-baked delivery copy
   (`src/assets/...`) are distinct artefacts, never the same file at two sizes.
2. **Light/color alignment is measured per lot, not against a single blanket Blitz value** (owner
   decision, this planning session): each Fraktion (Fire/Ice/Plant, each 21 icons) must be internally
   consistent with itself, and the 7 perk-category icons must be internally consistent as one set —
   matching the methodology `docs/art/perkcats/README.md` already used (median-based, own-lot
   normalization) and `docs/art/corners/README.md` already used (deckkraft table across its own 5-item
   lot, Blitz included as one data point, not an external target).
3. **All lokal source files are PNG; the repo convention is WebP.** Format conversion is mandatory,
   not optional, for every file this task touches.
4. **German descriptive filenames from the local source folder are never carried into the repo.**
   They existed only so the owner could hand off work by name instead of by visual match
   (owner statement, this planning session) — every file lands under the established
   `SK_*` / `perkcat_*` / `corner_*` convention, or the new `PERK_*` convention proposed here.
5. **No history rewrite, no force flags, no push, no promotion** — same standing rule as every task
   in this repository (`AGENTS.md` — *Branch model*, *House rules*).

## Task-specific inputs

| Input | Value |
| --- | --- |
| Local source root | `C:\Users\Monkeh\Pictures\Icons\` — measured 2026-08-22 |
| Local source inventory | `Blitz/` 2, `Eis/` 21, `Fire/` 21, `Pflanze/` 21, `legendäre/` 21, `perks/` 7, `rahmen/` 5 — **98 files total, all PNG** |
| Already-in-repo masters to reconcile against | `docs/art/perkcats/perkcat_{A_deck,B_stich,C_rolle,D_score,E_form,P_praezision,S_ausbau}.webp` (7); `docs/art/corners/corner_{lightning,fire,ice,plant,perk}.webp` (5) |
| Game-data cross-references | `src/game/skills.js` (`SKILL_DEFS`, 84 entries), `src/game/perks.js` (`PERK_DEFS`, 22 entries incl. 21 legendary; `CATEGORIES`, 7 keys) |
| Existing build tooling | `scripts/skill-art-build.py` — currently WebP-in, hardcoded to `docs/art/skills/<archetype>`, bloom constants calibrated for a 277px card strip (`BLOOM_CSS=16`, `BLOOM_STRENGTH=0.70`, `BLOOM_SAT=2.00`) |
| Pre-resolved filename cases (owner, this session) | `gletscherzturz.png` → `SK_ICE_14`; `Lawine.png` → `SK_ICE_L03` |
| Confirmed Blitz replacement targets (owner, this session) | `Blitzableiter_.png` → `SK_LIGHTNING_01`; `donnergott_.png` → `SK_LIGHTNING_L01` |

## Acceptance gate

> **Every one of the 98 source files has a recorded, name-verified (not visually guessed) mapping to
> a final repo path in the established or newly-proposed convention, and the generalized
> `skill-art-build.py` produces a correctly named, correctly baked delivery WebP for at least one
> full non-lightning archetype, reproducibly.**
>
> A mapping asserted from visual similarity alone — without checking the corresponding `name`/`label`
> field in `skills.js` or `perks.js` — fails this gate even if it happens to be correct. The standard
> is the cross-check, not the outcome.

## Expected file surface

Indicative, not a licence. Anything outside this is surfaced before it is changed.

**Written by this task**

| Path | Change |
| --- | --- |
| `docs/workstreams/desktop-icons/icons-asset-audit/task-contract.md` | This file — updated in place as work proceeds |
| `docs/workstreams/desktop-icons/icons-asset-audit/asset-mapping.md` | New — the 98-item mapping table, the actual deliverable consumed by the other three tasks |
| `docs/workstreams/desktop-icons/icons-asset-audit/evidence-package.md` | New — at handoff |
| `scripts/skill-art-build.py` | Generalized in place, or replaced by a documented equivalent |
| `docs/art/skills/{fire,ice,plant}/*.webp`, `src/assets/skills/{fire,ice,plant}/*.webp` | New masters/delivery copies, to the extent this task bakes them (vs. leaving the bake itself to `icons-skills`) |

**Must not be touched**

- `src/ui/**` — no wiring (tripwire)
- `test/**` — tripwire
- `docs/art/skills/lightning/**`, `src/assets/skills/lightning/**` — except the two named replacements
- `AGENTS.md`, `CLAUDE.md`, `docs/engineering/**`, `docs/decisions/**`

## Known hazards

| # | Hazard | Status at contract-writing |
| --- | --- | --- |
| H1 | Filename↔ID mapping errors across 98 files with no cross-file precedent except skills | **Not measured** — mitigation is the name-cross-check required by the acceptance gate |
| H2 | Local PNG resolution/format may not meet the resolution the existing masters assume (skills: 1024px) | **Not measured** |
| H3 | Bloom-bake parameters calibrated for a 277px skill-card strip may not suit perk-category/corner render contexts | **Not measured** — must be checked per lot before reuse, not assumed |
| H4 | Whether `docs/art/perkcats/` and `docs/art/corners/` are master-only or already delivery-ready is unresolved | **Not measured** — blocking for `icons-perks`/`icons-corners` scope, see *Open questions* |
| H5 | Windows/Linux path and case-sensitivity risk when introducing new asset directories | **Not applicable yet** — no new directories created at contract-writing time |

## Definition of done

- [ ] Perkcat/corner diff recorded (identical vs. updated), method stated, for all 12 files
- [ ] Full 98-item mapping table written and cross-checked against `skills.js`/`perks.js` names
- [ ] Both pre-resolved filename cases carried through into the mapping table unchanged
- [ ] Legendary-perk naming convention finalized and applied consistently across all 21 entries
- [ ] `scripts/skill-art-build.py` generalized and proven against at least one non-lightning archetype
- [ ] Per-lot light-alignment principle applied/verified for whatever this task bakes
- [ ] `npm run lint -- --max-warnings=0`, `npm run build`, `npm run gen:db` all green
- [ ] Evidence package written; every hazard H1–H5 marked measured / not measured and why / not applicable
- [ ] Handoff prepared, naming what `icons-skills` / `icons-perks` / `icons-corners` need from this task's output

## Open questions

| # | Question | Blocking? |
| --- | --- | --- |
| Q1 | Are `docs/art/perkcats/*.webp` and `docs/art/corners/*.webp` master-only (needing their own `src/assets/...` delivery-bake step, like skills) or already delivery-ready (just need copying into `src/assets/`)? | Yes — for `icons-perks`/`icons-corners` scope |
| Q2 | Should legendary-perk delivery WebPs live under a new `src/assets/perks/legendary/` directory, mirroring the skills master/delivery split? | Yes — for the mapping table and for `icons-perks` |
| Q3 | Should the generalized `skill-art-build.py` be extended in place for all four groups, or should perk-categories/legendary-perks/corners get a separate script given their different render context (square perk-category tile vs. corner panel chrome vs. skill card strip)? | No — reportable either way, but shapes `icons-perks`/`icons-corners` tooling |
