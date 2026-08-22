# Planning report — icons-asset-audit

> **RECONSTRUCTED AFTER THE FACT, 2026-08-22.** Written during review round 1, after the reviewer
> recorded the missing planning report as a blocker. It is **not** the pre-implementation artifact
> `task-lifecycle.md` — *Tier B* asks for, and it must not be read as one: that report exists so the
> owner settles open questions *before* anything is implemented, and this one cannot serve that
> purpose because the implementation already happened.
>
> Every decision below is one that is independently evidenced — in `task-contract.md`, in
> `evidence-package.md`, or in an owner decision recorded in this task's session. Nothing here is a
> reconstruction of reasoning nobody wrote down. Where the ordering matters — decided before or
> during implementation — it is stated.
>
> A **downgrade record** for the missing report is carried in the contract's Definition of done.

A planning session did take place: the contract cites it repeatedly ("owner decision, this planning
session"), and two filename mappings were pre-resolved there. What was never written was the report.

---

## The one decision that cannot be corrected cheaply later

**The filename convention**, for two reasons that pull in the same direction: it is the *only* join
between an image and a game entity (`skillArt.js` derives the ID from the filename — there is no
lookup table), and once files are committed under a name, renaming them rewrites history for every
downstream task and every consumer.

Settled as: skills keep `SK_<ARCH>_<NN>_<slug>.webp`; legendary perks take
`<PERK_DEFS key>_<slug>.webp`. See *Rejected* below for what that was chosen against.

Second-order but also expensive to undo: **which artwork is a master and which is a delivery copy**.
Conflating the two produces "two truths" for the same image, which the skills README already warns
about.

---

## Decisions, and what each was chosen against

### 1. Legendary-perk filename convention

**Chosen:** `L_BALL_ballast.webp` — the parsed token is exactly the `PERK_DEFS` key.
**Rejected:** `PERK_L_BALL_ballast.webp`, which the contract had proposed.

Rejected because the live parse rule reads the leading uppercase run as the ID. With the prefix, that
run is `PERK_L_BALL` while the registry key is `L_BALL`, so a future `perkArt.js` would need a second
rule that strips a prefix — two rules in the codebase where one would do. The prefix's only benefit
was self-description in a file listing, which the directory already provides.

*Decided by the owner during implementation, after the parse rule was read.* Recorded in
`asset-mapping.md` — *Naming conventions*.

### 2. Where legendary-perk art lives

**Chosen:** `docs/art/legendaries/` + `src/assets/legendaries/` — a flat lot directory.
**Rejected:** `docs/art/perks/legendary/`, mirroring the nesting of `docs/art/skills/<archetype>/`.

Rejected because it would put a `perks/` tree directly beside the existing `perkcats/`, giving one
domain two directories. The existing siblings (`perkcats/`, `corners/`) are flat lot directories, so
the flat form is the established pattern here, not the nested one.

*Owner decision during implementation.*

### 3. The build toolchain

**Chosen:** install Python 3.12 + Pillow and generalize the existing `skill-art-build.py`.
**Rejected:** porting it to a `.mjs` script using `ffmpeg-static`, which is already a devDependency
and which would have matched the other nine scripts in `scripts/`.

Rejected in favour of continuity: the bake constants, their recorded rationale and a source-text
ratchet test all point at that Python file, and replacing it would strand that history even if the
pixels came out identical. The cost accepted in exchange is a machine prerequisite that
`NEW_MACHINE_SETUP.md` does not document — recorded as a follow-up, not silently absorbed.

*Owner decision during implementation, after the missing interpreter was discovered.* This is exactly
the kind of house-rule gate a real planning report would have settled beforehand.

### 4. Light alignment for the ice lot

**Chosen:** ship as generated, with the baked bloom, no brightness alignment.
**Rejected:** applying the documented cap to `SK_ICE_L03`, the one measured outlier.

Rejected because the sibling lightning lot ships two tiles at the same ratio un-capped; treating one
ice image differently would introduce the inconsistency the alignment was meant to remove. The
measurement stays as the yardstick. Recorded in `evidence-package.md` §6, and carried into V3 as
`ICONS-VIS-02` rather than closed.

**Also rejected, earlier and by the lightning lot's own record:** normalizing every image to the
median. It was tried there and failed, because brightening cannot replace missing *area*.

### 5. Where the mapping table lives

**Chosen:** a committed TSV that `ingest` reads.
**Rejected:** deriving names from the registry at runtime, with no table at all.

Rejected because three of the 98 source filenames are not derivable by normalization
(`gletscherzturz`, `Lawine`, `zinsezins`). A rule that works for 95 of 98 cases and needs three
hardcoded exceptions in code is worse than a table: the exceptions are data.

This choice has a cost, recorded as an open question in the handoff: a build script now depends on a
document under `docs/workstreams/`.

### 6. Scope of the bake

**Chosen:** ingest and bake **ice** fully, and leave fire and plant to `icons-skills`.
**Rejected:** baking all three remaining archetypes here.

Rejected as scope: the acceptance gate asks for *at least one* non-lightning archetype proven end to
end, and doing three would have tripled the binary diff for no additional proof.

**Consequence discovered during implementation:** a default bake emitted 6 partial fire delivery
copies, which would have lit art on 6 of 21 fire cards. That produced the lot-completeness gate —
a decision that a planning report would not have anticipated, because the behaviour was not visible
until the script ran.

---

## Open questions — and when they were actually settled

A real planning report settles these before implementation. These were settled **during** it, which
is the substantive cost of the missing report rather than a bookkeeping one:

| Question | Settled | When |
| --- | --- | --- |
| Are perkcats/corners master-only or delivery-ready? | Master-only (Q1) | During implementation, from evidence |
| Where do legendary-perk deliverables live? | `legendaries/` (Q2) | During implementation, owner |
| One build script or several? | One, with a lot table (Q3) | During implementation |
| Which toolchain? | Python, kept | During implementation, owner — a house-rule gate |
| Is `zinsezins.png` → `L_ZINS` acceptable on elimination alone? | **Still open** | Raised in the handoff for the reviewer |

---

## What this report cannot do

It cannot make the ordering right. `task-lifecycle.md` — *Tier B* says *"nothing is implemented until
the owner has settled the report's open questions"*, and four of the five above were settled after
implementation had begun. The decisions themselves were made deliberately and by the owner; the
sequence was wrong. For the next task in this workstream — `icons-skills`, `icons-perks`,
`icons-corners` — the report comes first, and the V1 baseline is taken right after the worktree
exists.
