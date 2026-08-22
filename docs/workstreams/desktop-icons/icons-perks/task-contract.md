# Task Contract — icons-perks

**Tier C — large UI / architecture workstream** (`docs/engineering/task-lifecycle.md` — *Tier C —
large UI / architecture workstream*), running as a task under the `feature/desktop-icons` feature
integration branch.

This contract is the binding scope statement. Where it and any planning report disagree, **this
contract wins**.

---

## Identity

| Field | Value |
| --- | --- |
| **Task** | icons-perks |
| **Feature** | feature/desktop-icons |
| **Branch** | `task/icons-perks` |
| **Base** | `origin/feature/desktop-icons` @ `3013881f723080753b8829feea4b051356f0cae0` |
| **Owner** | **Claude Code worker** — implementation, per `AGENTS.md` — *Roles and source of truth* |
| **Integrator** | **Claude Code** feature integrator, same source |
| **Reviewer** | **Codex**, independent review only — it does not implement, same source |
| **Concurrency** | One writer. Sequential sessions may continue this task in the same worktree. Never two simultaneous writers. |

---

## Local workspace

| Field | Value |
| --- | --- |
| **Worktree** | `C:/Code/Autostich-worktrees/icons-perks` |
| **Branch checked out there** | `task/icons-perks` |
| **Upstream** | None. The branch deliberately does not track its base. |
| **Preview port** | `5184` |
| **Preview URL** | `http://localhost:5184` |

Server invocation:

```bash
npm run dev -- --port 5184 --strictPort
```

---

## Scope

Bring icons to the perk-selection screen. Unlike `icons-skills` this is **not** an asset drop-in:
`src/ui/PerkSelect.jsx` currently holds no icon code at all, so this task builds the seam as well as
filling it.

Two icon populations share one screen, and the distinction is settled — regular perks (the 73
`FAMILY_LIST` entries) get **the icon of their category, not a unique one**; the 21 legendary perks
in `PERK_DEFS` each get their own.

Five parts, in order:

1. **Decide and record the render zone.** The bloom radius converts through the zone width
   (`BLOOM_CSS * SIZE / STRIP_W`), and `scripts/skill-art-build.py` deliberately marks the
   `perkcats` and `legendaries` lots uncalibrated so `bake` **refuses** until a real number exists.
   This part removes that refusal honestly; it does not work around it.
2. **Ingest the legendary-perk lot.** 21 sources, none yet in the repository. Masters to
   `docs/art/legendaries/`, delivery copies to `src/assets/legendaries/` — both directories are
   already registered in the lot table and neither exists yet.
3. **Bake the perk-category lot.** The 7 masters are already committed under `docs/art/perkcats/` at
   1024×1024; only the delivery step is missing.
4. **Build the wiring in `PerkSelect.jsx`** — a loader analogous to `skillArt.js` and the CSS
   analogous to `.sk-strip` / `.sk-offer-art`, gated on the same desktop breakpoint so mobile never
   fetches the images.
5. **Add guards**, following the shape of `test/skill-art.test.js`: lot completeness in both
   directions, and the wiring literals.

## Non-goals and tripwire

| Non-goal | Why |
| --- | --- |
| Unique icons for the 73 regular perk families | Settled by the owner: category icon only. `docs/art/perkcats/README.md` names the cost of the alternative — ~130 images |
| Corner ornaments on the perk panel | `icons-corners` owns them, and it runs **after** this task because it needs the final card geometry |
| Skill assets of any archetype | `icons-skills` owns them |
| Re-baking lightning or ice | Shipped and owner-approved |
| Any new icon design or artwork edit | Artwork is final |
| Any change to the mobile UI | Established workstream non-goal |
| Reusing the skill-card `STRIP_W` for these lots without measuring | This is the tripwire — below |

### Tripwire

> **If a `strip_w` value appears for `perkcats` or `legendaries` that was copied from the skill lot
> rather than measured on the actual perk tile, stop.**

The script's refusal exists because a plausible-looking constant produces a bloom radius that is
authoritative and wrong. Silencing the refusal with a borrowed number is the failure it was built to
prevent.

### Secondary tripwire

> **If the diff starts editing `src/ui/SkillSelect.jsx` or `LegendarySelect.jsx`, stop.** Shared
> extraction is a design decision that belongs to `icons-corners`, which is the task that genuinely
> touches both screens.

## Approved architecture

1. **Master/delivery split**, as established for skills: master under `docs/art/…`, bloom-baked
   delivery copy under `src/assets/…`.
2. **`docs/art/legendaries/` and `src/assets/legendaries/`** — flat lot directories, matching
   `perkcats/` and `corners/`, deliberately **not** a second `perks/` tree. Owner decision, already
   registered in the lot table.
3. **One script, one lot table.** The groups differ in three values — master size, delivery size,
   render-zone width — which is a table, not a second program.
4. **Bloom is baked into the file, never a runtime CSS filter.** A filter on this surface measured
   271–417 ms at `phase:levelup` mount; `test/skill-art.test.js` ratchets that `.sk-strip` carries no
   `filter:`/`blur(`. Any new rule this task adds inherits that constraint.
5. **The desktop gate lives in JSX, not CSS**, as in `skillArt.js` — so mobile never fetches the
   images rather than fetching and hiding them.
6. **Light alignment is per lot**: the 7 category icons against each other, the 21 legendaries
   against each other. `docs/art/perkcats/README.md` already did this work — median **23.5 %**
   luminous area, with per-icon factors — and states plainly that the perk set must match *itself*,
   not the skills, because perk and skill tiles never share a screen. Reuse that result; do not
   re-derive it against a Blitz number.
7. **No history rewrite, no force flags, no push to a permanent branch, no promotion.**

## Task-specific inputs

| Input | Value |
| --- | --- |
| Mapping table | `docs/workstreams/desktop-icons/icons-asset-audit/asset-mapping.md` + `.tsv` — authoritative |
| Data sources | `src/game/perks.js` — `CATEGORIES` (7 keys A/B/C/D/E/P/S), `PERK_DEFS` (21 entries with `rarity:"legendary"`, plus disabled `E10`); `src/game/families.js` — `FAMILY_LIST` (73) |
| Perk-category lot, current state | **7 masters** at `docs/art/perkcats/` (1024×1024), **0 delivery** — measured at base `3013881f` |
| Legendary lot, current state | **0 masters, 0 delivery**; both directories not yet created — measured at base `3013881f` |
| Lot-table state | `perkcats` (`expect=7`) and `legendaries` (`expect=21`) registered with `strip_w=None` → `bake` refuses until part 1 lands |
| Existing light measurement | `docs/art/perkcats/README.md` — per-icon luminous area and correction factors, median 23.5 % |
| Reference wiring | `src/ui/skillArt.js`, `.sk-strip` / `.sk-offer-art` in `src/index.css`, `test/skill-art.test.js` |
| Skill-card reference geometry | `270.66 × 210`, `cover`, `center top`, `screen`, 62 % mask — measured live; a **reference**, not a value to copy |
| Composition constraint | The perk masters place the motif in the upper two thirds with the lower third near-black, composed for a header strip showing the top ~76 % of a square |

## Acceptance gate

> **Every offer tile on the perk-selection screen renders an icon in the running application — the
> category icon for a regular perk, its own icon for a legendary one — and the render zone that the
> bloom radius was computed from is the zone that was measured live in that same screen.**
>
> A lot baked against an assumed zone width fails this gate even if it looks correct, because the
> number that made it look correct cannot be reproduced.

## Expected file surface

**Written by this task**

| Path | Change |
| --- | --- |
| `docs/art/legendaries/*.webp` | 21 new masters |
| `src/assets/legendaries/*.webp` | 21 new delivery copies |
| `src/assets/perkcats/*.webp` | 7 new delivery copies |
| `docs/art/perkcats/README.md` | Render zone and delivery state recorded |
| `scripts/skill-art-build.py` | `strip_w` set for both lots, with the measurement behind it |
| `src/ui/PerkSelect.jsx` | Icon wiring — new |
| `src/ui/<new loader>.js` | Filename→ID glob loader, analogous to `skillArt.js` |
| `src/index.css` | Perk-tile header-strip rules |
| `test/*.test.js` | New guards — additions, never a weakening |
| `docs/workstreams/desktop-icons/icons-perks/*` | Contract, visual review, evidence package |

**Must not be touched**

- `src/ui/SkillSelect.jsx`, `src/ui/LegendarySelect.jsx`, `src/ui/skillArt.js` — secondary tripwire
- `docs/art/skills/**`, `src/assets/skills/**` — `icons-skills` owns them
- `docs/art/corners/**` — `icons-corners` owns them
- `AGENTS.md`, `CLAUDE.md`, `docs/engineering/**`, `docs/decisions/**`

## Known hazards

| # | Hazard | Status at contract-writing |
| --- | --- | --- |
| H1 | Bloom constants calibrated for a 277 px skill strip do not transfer to the perk tile | **Not measured — deliberately.** The zone does not exist yet; the script refuses these lots until it does. Carried over from the audit's H3 |
| H2 | `legendaries/` is a new directory; Windows/Linux case sensitivity | **Open** — carried over from the audit's H5, explicitly left open for this task. All-lowercase ASCII is the mitigation; CI covers Linux |
| H3 | Two distinct populations share one component — a regular perk must never fall back to a legendary icon or vice versa | **Not measured** — needs a guard, not just correct code |
| H4 | Source-text ratchets read `src/**` as raw text; new JSX and CSS can turn existing guards red without a behaviour change | **Not measured** — read the failing assertion before changing anything (`AGENTS.md` — *Hazard*) |
| H5 | The mapping's one weak row (`zinsezins.png` → `L_ZINS`) is marked weak by the audit | **Known** — verify before shipping the legendary lot |
| H6 | Adding a runtime CSS filter would regress the measured 271–417 ms mount cost | **Known and constrained** by *Approved architecture* 4 |

## Definition of done

- [x] Render zone measured live on the perk tile and recorded, with the resulting `strip_w` — **265 × 201**, the drawn `<img>` box, not the 270 tile around it (that near-miss is `ICONS-PERK-VIS-07`)
- [x] `bake` no longer refuses `perkcats`/`legendaries`, and the reason is a measurement, not a flag flip. `corners` still refuses
- [x] Legendary lot complete: 21 masters, 21 delivery files; `L_ZINS` verified by motif and by elimination
- [x] Perk-category lot complete: 7 delivery files; the README's existing factors applied, not re-derived
- [x] Wiring in `PerkSelect.jsx` behind the desktop gate, in JSX rather than CSS
- [x] Guards added for both lots' completeness and for the regular-vs-legendary distinction, **16 seams counter-checked** by deliberately breaking each. Five were added in review round 1 — the three zone guards and the two duplicate-id guards
- [x] No runtime `filter:`/`blur(` on any new rule — guarded, counter-checked, and `filter: none` read from the live DOM
- [~] V1 baseline taken **before** the first pixel moved — it was, then overwritten by operator error and regenerated deterministically from the immutable base commit. **Downgrade `DR-1`**; see `visual-review.md`
- [x] V2 capture at the same sizes, DPR and state as V1 — same committed script, same seed
- [x] V3 human visual gate **passed by the owner, 2026-08-22**, and re-confirmed the same day after the round-1 re-bake moved two emblems. Both verdicts verbatim in `visual-review.md`. Closes `ICONS-PERK-VIS-02` (legendary anchor), `ICONS-PERK-VIS-03` (tile height) and `DR-3`
- [x] V4 classification written; 10 findings `ICONS-PERK-VIS-01..10` plus `DR-1`/`DR-2`/`DR-3`. Three came from review round 1
- [~] `npm run lint -- --max-warnings=0`, `npm run build`, `VITE_PREVIEW=1 npm run build`, `npm run gen:db` — green. `npm test`: **135 of 136 files green**; the one failure is a 5000 ms **timeout** in `test/i18n-guards.test.js`, **pre-existing** — measured at `HEAD` with this task's changes removed (fails 2 of 3 runs there) and 2050 ms when the test runs alone. Not fixed here: that guard belongs to another task. Evidence package §5
- [x] `npm run loc:export` run — no diff. No player-visible text changed (`alt=""`, `aria-hidden="true"`)
- [x] Evidence package written with a "what this does NOT cover" section; H1–H6 each marked
- [x] Handoff records the final card geometry `icons-corners` needs, plus five things that will bite it

## Open questions

| # | Question | Blocking? |
| --- | --- | --- |
| Q1 | ~~Do regular and legendary perk tiles share one header-strip zone?~~ **Answered from the code, 2026-08-22.** `src/ui/PerkSelect.jsx:112` renders both populations through the **same** `<button>` — identical `lv-offercard as-edge-card` classes in the same `sm:grid-cols-3` grid. A legendary differs only by the added `as-legendary` class (animated gold frame) and the name colour; the tile geometry is the same. **One `strip_w` covers both lots.** Giving legendary tiles a different zone would be new design, which is a non-goal | **No — closed** |
| Q2 | Category `S` has 0 families and 1 perk, `P` has 5 families and 0 perks. Does an S icon ever appear on a regular perk tile, or only via its single legendary? | No — affects test expectations, not the build |
| Q3 | Should the disabled `E10` (`offerable:false`) be covered by the completeness guard, or excluded as unreachable? | No — reportable either way |
