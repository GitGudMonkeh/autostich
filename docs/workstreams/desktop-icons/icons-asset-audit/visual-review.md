# Visual review — icons-asset-audit

The §8 lifecycle of `docs/engineering/task-lifecycle.md` for this task. Tier C runs the visual gate
**always**, so this document exists whether or not the change looked risky.

Added in review round 1 (2026-08-22) after the reviewer recorded its absence as a blocker.

**V3 is not recorded here as passed.** A person has to look at V2 and decide; an agent must not
report a visual result as approved (§8 — *V3*). Everything below is capture and classification.

---

## V1 — pre-change baseline: **NOT TAKEN**

This is a process failure of this task, and it is not repairable after the fact.

§8 is explicit: V1 is *"taken before implementation starts, not reconstructed afterwards"*, and it
warns that reconstructing a baseline is exactly when the wrong state gets captured. Tier C calls the
baseline *"least optional"*. No baseline was captured before the first file changed, so the honest
status is missing, not "substituted".

A **downgrade record** is carried in the contract's Definition of done.

**What exists instead, and what it is worth.** The base commit is committed and immutable, so the
*asset* state before the change can be rendered deterministically from
`863febe54fce513c4171314eb8cfc0d86f997408` — that is what `V2-lightning-replacements.webp` shows on
its left column. This is an **asset-level before/after, not a V1 screen capture**: it proves what the
two replaced files looked like, and proves nothing about the screen around them. For the ice lot even
that does not apply, because there was no ice art at the base commit at all — its "before" is the
offer card with no header art.

---

## V2 — post-change capture

### In-app verification (measured, 2026-08-22)

The application was launched (`npm run dev -- --port 5182 --strictPort`) and driven to the skill
selection screen in a headless browser at **1920 × 1080, DPR 1**. The offer-card header was read from
the live DOM rather than assumed:

| Property | Measured in the running app | Source of truth it must match |
| --- | --- | --- |
| Zone size | **270.66 × 210 px** | `.sk-strip` in `src/index.css` |
| `object-fit` | `cover` | same |
| `object-position` | `50% 0%` | same (`center top`) |
| `mix-blend-mode` | `screen` | same |
| Mask | `linear-gradient(180deg, #000 62%, transparent)` | same |
| Binding | `src` resolved to `SK_LIGHTNING_*.webp` by filename | `src/ui/skillArt.js` |

The wiring is therefore confirmed live, not only in source: art binds by filename, the black ground
disappears under `screen`, and the strip crops from the top.

**One discrepancy fell out of this and is filed below as `ICONS-VIS-01`:** the build script converts
the bloom radius through `STRIP_W = 277`, while the rendered zone measures **270.66**.

### What was NOT seen in the app, and why

**No ice card was rendered in the running application.** Ice is gated by `unlockedArchetypes` from the
progression tree (`iceDeck`, 4 TP), and although the profile was seeded to unlock it, the run could
not be advanced to a fresh ice offer: the headless renderer throttles the game loop, so the cycle
counter did not move. Only Lightning and Fire offers were reachable.

This is a real gap in coverage. What mitigates it — stated as reasoning, not as a substitute — is
that `SkillSelect` is archetype-agnostic: the header strip is one `<img>` bound by filename, with no
per-archetype branch, so an ice card takes the identical path that was confirmed live for lightning.

### Committed captures

Images are committed because here they **are** the evidence (`task-lifecycle.md` — *Committing
evidence*), not as decoration.

| File | What it shows |
| --- | --- |
| `visual/V2-ice-strip-geometry.webp` | All 21 ice delivery files, each rendered in the **measured** header geometry — 271 × 210, `cover`, `center top`, `screen` over the card background, with the 62 % mask fade applied |
| `visual/V2-lightning-replacements.webp` | The two replaced lightning icons, base vs head, in the same geometry |

Both were produced from the committed delivery files and the measured CSS values, so they can be
regenerated. They are **not** screenshots of the application.

---

## V3 — human visual review gate: **OPEN**

Not passed, not failed — not yet run. It needs a person to look at the two captures above and decide.

The specific question the reviewer raised, put plainly for whoever runs V3:
**`SK_ICE_L03` Große Lawine measures 150.6 light against a lot median of 60.7 (≈2.5×).** In
`V2-ice-strip-geometry.webp` it is the brightest tile of the 21, and the measurement and the picture
agree. Whether that is too bright *in the set* is the judgement V3 exists to make. For context, the
lightning lot ships two tiles at the same ratio (`L02` 127.2 and `L03` 132.9 against a median of
57.8) and shipped un-aligned deliberately.

---

## V4 — classification

Every finding gets exactly one row and an ID (§8). IDs are workstream-local and must be carried into
the workstream backlog at integration.

| ID | Finding (verbatim, 2026-08-22) | Classification | Disposition |
| --- | --- | --- | --- |
| `ICONS-VIS-01` | The bake converts the bloom radius through `STRIP_W = 277`, but the rendered `.sk-strip` measures **270.66 px** wide in the running app at 1920 × 1080. The baked radius is therefore ~2.3 % wider than the authored 16 CSS-px implies. | **Pre-existing, out of scope** — `277` predates this task; it is in the original script and in `docs/art/skills/README.md`, and the lightning set already shipped with it. | Backlog entry. Fixing it would re-bake every delivery file in every lot, so it is a deliberate decision, not a drive-by. |
| `ICONS-VIS-02` | `SK_ICE_L03` Große Lawine carries ≈2.5× the ice lot's median light (150.6 vs 60.7) and is visibly the brightest tile of the 21. | **New design question** | Input to V3 above and to `icons-skills`. Not a defect: the documented cap method exists and was deliberately not applied, for the reason recorded in `evidence-package.md` §6. |
| `ICONS-VIS-03` | Fire offer cards render with no header art, because `docs/art/skills/fire/` holds 6 of 21 masters and the lot-completeness gate skips the lot. | **Expected platform behaviour** | Documented, no fix. This is the gate working as designed; it resolves when `icons-skills` completes the fire lot. |
| `ICONS-VIS-04` | On the replacement `SK_LIGHTNING_L01` Donnergott, gold reads in two places (crown and base sparks). `docs/art/skills/README.md` states gold sits at exactly one place per legendary. | **New design question** | Backlog entry, input to `icons-skills`. Artwork is final and owner-approved; this records the deviation rather than reopening it. |

Only `Defect in this task` returns as work here. **No row carries that classification**, so the
classification produces no fix task for this worker.

---

## Reproduce

```bash
npm run dev -- --port 5182 --strictPort
# then, in the page, on the skill-selection screen:
#   [...document.querySelectorAll('.sk-strip')].map(e => {
#     const r = e.getBoundingClientRect(), s = getComputedStyle(e);
#     return { src: e.src.split('/').pop(), w: r.width, h: r.height,
#              blend: s.mixBlendMode, fit: s.objectFit, pos: s.objectPosition };
#   })
```

The two committed captures are regenerated from the delivery files and the measured geometry; the
generating script is recorded in this task's session, not committed, because it is a one-off
rendering of committed inputs.
