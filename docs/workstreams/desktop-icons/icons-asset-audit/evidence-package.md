# Evidence package — icons-asset-audit

Tier C foundation task of the `desktop-icons` workstream. Branch `task/icons-asset-audit`, worktree
`C:/Code/Autostich-worktrees/icons-asset-audit`, base `origin/feature/desktop-icons` @ `863febe5`.

Measured 2026-08-22 unless stated otherwise. Claims below are marked **measured**, **observed**,
**inferred** or **proposed**; nothing is reported as done that was not run.

---

## 1. What this task produced

| Deliverable | State |
| --- | --- |
| 98-item mapping, name-verified | `asset-mapping.md` + `asset-mapping.tsv` |
| Perkcat/corner reconciliation | Recorded below and in `asset-mapping.md` |
| `scripts/skill-art-build.py` generalized | Three modes (`bake` / `ingest` / `measure`), lot table |
| Non-lightning archetype proven end to end | **Ice**, 21 masters + 21 delivery copies, reproducible |
| Two owner-confirmed Blitz replacements | Applied (`SK_LIGHTNING_01`, `SK_LIGHTNING_L01`) |
| Per-lot light alignment | Measured for ice; decision recorded in §6 |
| Q1 / Q2 / Q3 | Answered in §7 |

No wiring was written. The diff touches nothing under `src/ui/**` or `test/**` — the contract
tripwire held.

---

## 2. Environment finding — Python was not installed (blocking, not anticipated by the contract)

**Measured.** `scripts/skill-art-build.py` requires Python + Pillow. On this machine `python`,
`python3` and `py` all resolved to the Microsoft Store placeholder stubs under
`%LOCALAPPDATA%\Microsoft\WindowsApps`; no real interpreter existed. Contract scope item 3 could not
be *proven* without one.

Owner decision (2026-08-22): keep the documented toolchain, install Python. Installed
**Python 3.12.10** (winget, user scope) with **Pillow 12.3.0** and **numpy 2.5.2**.

Two follow-ups this exposes, neither of them in this task's file surface:

- `docs/engineering/NEW_MACHINE_SETUP.md` does not mention Python or Pillow anywhere, although two
  repository scripts need them. That document is on this task's "must not be touched" list, so it is
  **flagged, not edited**.
- `scripts/bf-helligkeit.mjs` shells out to `python3` with Pillow *and* numpy for the same reason.
  It was equally unrunnable here and is now equally fixed — incidentally, not as task scope.

**Caveat, observed:** the installer's PATH entry is not picked up by already-running shells. Sessions
started before the install need the explicit path
(`%LOCALAPPDATA%\Programs\Python\Python312\python.exe`) or a new terminal.

---

## 3. Validation gates

Run bare, never piped, per `AGENTS.md`.

| Gate | Result |
| --- | --- |
| `npm test` | **1 failed / 2047 passed** — see below |
| `npm run lint -- --max-warnings=0` | clean |
| `npm run build` | built in 6.40 s |
| `VITE_PREVIEW=1 npm run build` | built in 6.16 s |
| `npm run gen:db` | 219 entries |

**The one failure is pre-existing and environmental, not a regression.** `test/i18n-guards.test.js >
"jeder Katalog-Schlüssel wird auch irgendwo benutzt"` times out at the 5000 ms default.

Proof it is not this task's doing, all **measured**:

- It fails identically on a **clean tree at the base commit**, before any file in this task was
  touched (`git status` empty at the time of the run).
- Run on its own, the same file passes 27/27 in **2.08 s**. It only exceeds 5000 ms under full-suite
  parallel load.
- Totals are **identical** before and after this task's changes: 1 failed / 2047 passed, 135 files.

`npm run loc:export` was **not** run and is **not applicable**: no player-visible text changed. This
task adds image assets, a build script and workstream documentation only.

`test/skill-art.test.js` specifically: **14/14 pass.** That matters because it contains a source-text
ratchet on the build script this task rewrote — see §5.

---

## 4. Reconciliation of the already-in-repo masters (contract scope item 1)

**Measured.** Method: decode both files to raw RGB at a common resolution, compare per-pixel, report
mean absolute difference (MAD, 0–255).

The threshold was **counter-checked before use**: deliberately mismatched pairs drawn from the same
lots score 11.1–19.3, while every genuine pair scores under 1.3. The verdicts are an order of
magnitude apart, so the cut is not a judgement call.

| Pair set | Files | MAD | Verdict |
| --- | --- | --- | --- |
| `perks/*.png` ↔ `docs/art/perkcats/perkcat_*.webp` | 7 | 0.70 – 1.21 | Identical artwork |
| `rahmen/*.png` ↔ `docs/art/corners/corner_*.webp` | 5 | 0.52 – 0.90 | Identical artwork |
| `Fire/*.png` ↔ `docs/art/skills/fire/*.webp` | 6 | 0.60 – 1.65 | Identical artwork |
| `Blitz/*.png` ↔ the two lightning masters | 2 | 36.50 / 46.55 | **Updated — local supersedes** |

All 12 files named in the contract are therefore **already correct in the repository**; they need
format conversion for nothing and re-import for nothing. `icons-perks` and `icons-corners` inherit
finished masters.

**A rule was confirmed as a side effect.** `Fire/feuersturm.png` is 1122×1402. Squashed to square it
scores 4.98; **black-padded** to square first — the rule in `docs/art/skills/README.md` — it scores
**0.60**. Only padding reproduces the committed master, so the padding rule is now backed by
measurement rather than by assertion. The generalized script implements it (`square_pad`).

---

## 5. Script generalization (contract scope item 3)

`scripts/skill-art-build.py` now has three modes and a lot table:

```
python3 scripts/skill-art-build.py                        # bake every complete, calibrated lot
python3 scripts/skill-art-build.py bake    --lot ice
python3 scripts/skill-art-build.py ingest  --lot ice --from "C:/Users/Monkeh/Pictures/Icons"
python3 scripts/skill-art-build.py measure --lot ice
```

**The ratchet was respected, not worked around.** `test/skill-art.test.js` asserts the literal
strings `BLOOM_CSS = 16`, `BLOOM_STRENGTH = 0.70`, `BLOOM_SAT = 2.00` and the expression
`BLOOM_CSS * SIZE / STRIP_W` inside this file. All four survive verbatim; the bake computation is
untouched. This is exactly the source-text ratchet hazard `AGENTS.md` warns about, and it sat
directly on the file this task had to rewrite.

**Regression proof, measured.** Running the default mode over the *unchanged* lightning masters
rewrote all 21 delivery copies and `git status` came back **empty** — byte-for-byte identical to what
was committed. The generalization provably did not alter the existing result. The script also still
prints the figure the README documents: `21 Embleme, 405 kB`.

**Reproducibility proof, measured.** A full `ingest` + `bake` cycle for ice was run twice and all 42
artefacts hashed both times (`sha256`): **identical**. The pipeline is deterministic, which is what
"reproducibly" in the acceptance gate requires.

**Two design decisions worth review:**

1. **`ingest` is deliberately local and one-off.** The 98 source PNGs are 122 MB and are not in the
   repository. `ingest` reads the audited mapping from `asset-mapping.tsv` rather than deriving names
   at runtime, because three of the 98 filenames are not derivable by normalization
   (`gletscherzturz`, `Lawine`, `zinsezins`). Those are data, so they live in a table, not in an `if`.
2. **A lot ships whole or not at all.** `bake` skips a lot whose master count does not match its
   expected size, and says so. Without this the default invocation silently emitted 6 delivery copies
   for the 6 fire masters that exist — lighting up art on 6 of 21 fire offer cards, which reads as
   breakage rather than progress. This also keeps the default invocation from dirtying the tree.

Lots with no settled render zone (`legendaries`, `perkcats`, `corners`) are marked uncalibrated:
`ingest` and `measure` work, `bake` **refuses with a message** instead of silently reusing the
skill-card bloom numbers. That is H3 handled in code rather than in prose.

---

## 6. Per-lot light alignment (contract scope item 4)

**The measurement tool was validated before its output was trusted.** `measure` was run against
`docs/art/perkcats/`, whose figures are already documented in `docs/art/perkcats/README.md`. All
seven reproduce within about one point on every band, and the median lands at 23.6 % against the
documented 23.5 %. The metric is therefore faithful to the one the earlier lots were judged with.

**One column is not faithful, and is labelled as such.** The READMEs' "Streuung" could not be
reproduced — the formula is recorded nowhere in the repository, and the obvious candidate disagrees
on the *ordering*, not merely the scale. That column is named `cv` in the script, documented as a
coefficient of variation, and explicitly marked as **not comparable** to any "Streuung" quoted in
`docs/art/*/README.md`. It is comparable within a run only.

### Ice, measured over all 21 masters

| Figure | Ice | Lightning (same metric, for scale) |
| --- | --- | --- |
| Hue range | **200°–207°** | 251°–347° |
| Lit area, median | 31.3 % | 25.2 % |
| Lit area, span | 17.6 – 61.5 % (factor 3.5) | 7.8 – 58.9 % (factor 7.5) |
| Light quantity, median | 60.7 | 57.8 |
| Light quantity, span | 32.8 – 150.6 (**factor 4.6**) | 7.1 – 132.9 (**factor 18.8**) |

**Hue needs no work.** 200°–207° against the ice faction colour `#5ec8f0` at 196° is a 7° spread —
the same conclusion the lightning README reached for its own set: the hue is not the building site.

**Decision: ship ice as generated, with the baked bloom, no brightness alignment.** Reasoning, in
the order it was checked:

- The lightning lot shipped un-normalized at a light spread of **factor 18.8**. Ice is **4.6** —
  four times tighter than the accepted precedent. Judged against itself, as the approved
  architecture requires, the lot is internally consistent.
- Confirmed at the image, not only in the table: contact sheets of both baked lots were rendered and
  compared. Ice reads as one set.
- **One watch item.** `SK_ICE_L03` Große Lawine measures 150.6 against a lot median of 60.7 — 2.5×,
  and visibly the hottest tile on the sheet. It is *not* worse than what lightning already ships
  (`L02` 127.2 and `L03` 132.9 against a median of 57.8, i.e. two tiles at the same ratio). Applying
  a cap to one ice image that the sibling faction did not get would create the inconsistency it was
  meant to remove. If the set later reads as restless in situ, the documented method is the **cap**
  from the lightning README (pull down above a threshold, leave everything below untouched), with the
  factor found numerically as in the perkcats README — not a re-generation.

---

## 7. Open questions answered

**Q1 — are `docs/art/perkcats/` and `docs/art/corners/` master-only or delivery-ready?**
**Master-only.** Resolved from evidence, not preference: the perkcat files are 1024×1024, exactly the
master size of the skill lot, whose delivery copies are 384 px; the corners README labels its files
"(Master, 1536 × 1024)" in as many words; neither has any counterpart under `src/assets/`; and the
perkcats README already names `scripts/skill-art-build.py` as the place a future alignment would be
baked. `icons-perks` and `icons-corners` therefore each need their own delivery-bake step — but see
H3: the bloom constants may not transfer.

**Q2 — where do legendary-perk delivery WebPs live?**
Owner decision: **`docs/art/legendaries/`** (master) and **`src/assets/legendaries/`** (delivery), a
flat lot directory matching the existing `perkcats/` and `corners/` rather than nesting a second
`perks/` tree beside `perkcats/`. Both are registered in the script's lot table. Neither directory
was created by this task — no legendary artwork was ingested — so H5 stays open rather than being
marked measured.

**Q3 — one script or several?**
**One script, one lot table** — reportable either way, and this is the recommendation, not a
mandate. The four groups differ only in three values (master size, delivery size, render-zone width)
plus whether the source is square. That is a table, not a second program. The genuine difference —
that three lots have no settled render zone — is expressed as a `calibrated` flag that makes `bake`
refuse, which is safer than a separate script that could be run with copied constants by mistake.

---

## 8. Hazard status

| # | Hazard | Status |
| --- | --- | --- |
| H1 | Filename↔ID mapping errors across 98 files | **Measured — closed.** 63 by exact `name`, 20 by exact `label`, 2 owner-pre-resolved, 12 by pixel diff, 1 by elimination over a closed set. No ID claimed twice; all 98 sources have exactly one row; all 86 generated skill/legendary filenames round-trip through the live `artIdFromFile` rule. The single weak row (`zinsezins.png` → `L_ZINS`) is marked as such in the mapping. |
| H2 | Local PNG resolution may not meet what the masters assume | **Measured — closed, favourably.** All 98 sources are PNG, 8-bit truecolour, no alpha. 91 are 1254×1254, comfortably above the 1024 master size, so every skill/perk icon is **downscaled, never upscaled**. The 5 corner sources are 1536×1024 — exactly the committed corner master size. Two fire sources are non-square (`feuersturm` 1122×1402, `lauffeuer` 1536×1024) and are handled by the black-pad rule, now measurement-backed (§4). |
| H3 | Bloom parameters calibrated for a 277 px skill-card strip may not suit other render contexts | **Not measured — deliberately, and now enforced in code.** The perk-tile, corner-panel and legendary-tile render zones do not exist yet; their wiring is Phase 2. Measuring against an undecided zone would produce a number that looks authoritative and is not. The script marks those lots uncalibrated and `bake` refuses them. Whoever settles the zone width recomputes the radius — the conversion is `BLOOM_CSS * SIZE / STRIP_W`. |
| H4 | Whether perkcats/corners are master-only or delivery-ready was unresolved and blocking | **Measured — closed.** Master-only; see Q1. `icons-perks` and `icons-corners` are unblocked on this point. |
| H5 | Windows/Linux path and case-sensitivity risk from new asset directories | **Partially measured.** One new directory was created this task: `docs/art/skills/ice/` and `src/assets/skills/ice/` — all-lowercase, ASCII, matching the existing `lightning/` and `fire/` siblings, and reached through `import.meta.glob`/`pathlib` rather than a hard-coded separator. The Linux build was not run locally; CI covers it. `legendaries/` is **not yet created**, so the risk it carries is still open for `icons-perks`. Note that no German source filename reaches the repository — the umlaut directory `legendäre/` stays on the artist's disk, which is what removes the sharpest case of this hazard. |

---

## 9. Flagged for the owner — not acted on

Artwork edits are an explicit non-goal, and the two Blitz replacements were owner-confirmed in the
contract. Both items below are therefore **observed and reported, not changed**.

1. **The new `SK_LIGHTNING_01` Blitzableiter changes its silhouette class — but it does not collide.**
   The superseded image was a needle/spike; the replacement is a **ring around a card**.

   The first reading of this was that it made a third round form beside the documented collision
   "`08` (Kugel) und `13` (Stachelkugel) sind beide rund". **That reading was checked and does not
   hold.** It rested on the README's rule that "die Silhouette bei 64 px" decides — a rule written
   when the plan was a 64 px emblem. The *Einbau* section of the same README supersedes it: the
   artwork now ships as a **277 × 210 px Kopfstreifen**, `object-fit: cover`, `object-position:
   center top`.

   Rendered at that real geometry (measured, not assumed), the card inside the ring stays plainly
   visible and the top-crop turns the ring into an open arc. `01`, `08` and `13` are distinguishable.
   At a binarized 64 px `01` and `08` *do* collapse into the same blob — which is a fact about the
   obsolete rule, not about the shipped UI.

   **No artwork change is recommended.** What is stale is the documentation: `docs/art/skills/README.md`
   still lists "Nadel (01)" in its silhouette matrix. The practical consequence is the useful part —
   **"Nadel" is now a free form again** for fire/ice/plant, and "Ring/Karte im Bogen" is taken. That
   matrix is the checklist future art generation is held against, so it is worth correcting. Its
   motif line for `L01` ("Wolfskopf aus Sturm, goldene Krone") is likewise no longer what the file
   shows. Both sit outside this task's declared file surface and are therefore surfaced, not edited.
2. **Gold placement on the two replacements.** The README states gold sits at exactly one place per
   legendary ("Krone · Kern · vordere Reihe · Lochrand"). On the new `L01` Donnergott the gold reads
   as being in two places (crown and base). Minor, and a judgement call at display size.

Neither blocks this task. Both are cheap to revisit while the artwork pipeline is open.

---

## 10. Handoff

**`icons-skills`** — consumes `asset-mapping.md` / `.tsv`.
- Ice is **done**: 21 masters and 21 delivery copies committed, named, baked, reproducible.
- Fire needs the remaining **15** masters ingested (6 already exist and are confirmed identical to
  their local sources, so do not re-import them — `ingest` would rewrite them for no gain).
- Plant needs all **21**; note the registry numbers plant **02–18**, there is no `SK_PLANT_01`.
- Command: `python3 scripts/skill-art-build.py ingest --lot <fire|plant> --from "<source root>"`
  then `bake --lot <…>`. `bake` will refuse until the lot is complete — that is intentional.
- Do **not** hand-edit anything under `src/assets/skills/`; it is generated.

**`icons-perks`** — Q1 and Q2 are answered, so it is unblocked on both.
- The 7 perk-category masters are **already final in the repo**; they need a delivery bake only, not
  a re-import.
- The 21 legendary-perk masters still need ingesting into `docs/art/legendaries/`; the mapping table
  has all 21 rows with final filenames.
- It must first settle the perk-tile render zone width, then set `calibrated=True` and the zone width
  on those lots. Until then `bake` refuses by design (H3).
- A `perkArt.js` can reuse `artIdFromFile` from `skillArt.js` **verbatim** — the chosen filename
  convention makes the parsed token exactly the `PERK_DEFS` key.

**`icons-corners`** — the 5 corner masters are **already final in the repo**, confirmed identical to
the local sources. Needs the corner-panel render zone settled before any bake, same as above. Note
its masters are 1536×1024, not square, so `square=False` is already set in the lot table.

**Not done here, by design:** no wiring, no promotion, no PR. The branch **is** pushed, so a reviewer
can fetch the range.

---

## 11. Review round 1 — findings and what changed (2026-08-22)

Codex reviewed head `cc1d2a63` and requested changes. Three blockers; all three are addressed below.
The reviewer also confirmed the two items this package had flagged as the reviewer's call — the
lightning carve-out and the README change — and confirmed all eight mapping/bake claims mechanically.

### B1 — the lot table was a promise the code did not keep

**Confirmed as a real defect.** `Lot.__init__` never stored `strip_w`, `size` or the bloom values,
and `cmd_bake` read the module-level `SIZE`/`STRIP_W` unconditionally. The class docstring described
a `strip_w` attribute that did not exist. For the four skill lots the result was correct and is what
shipped, but `corners` masters are 3:2 — activating that lot would have resized 1536×1024 to
**384×384**, distorting every corner ornament.

Fixed by making the values per-lot and the refusal structural rather than a flag:

- `Lot.size` names the **long** edge; `Lot.delivery_px` derives the short edge from the master's
  aspect. Corners now compute to **384×256** — aspect 1.500 against the master's 1.500 (*measured*).
- `strip_w=None` means no render zone, so `Lot.sigma` **raises** instead of returning a
  skill-card number. `calibrated` is now derived from that rather than passed independently, so an
  uncalibrated lot is one whose radius is uncomputable, not one somebody forgot to flag.
- Counter-checked both ways (*measured*): with `strip_w=None` all three Phase-2 lots refuse; setting
  `strip_w=300` on `corners` makes sigma computable at 20.5 px.

**The refactor changed no output.** A full default bake after the change left `git status` empty —
all 42 committed delivery files byte-identical. The four ratchet literals in
`test/skill-art.test.js` survive verbatim.

### B2 — the Tier C visual gate was missing

**Confirmed.** Tier C runs the visual gate always, and none had been run. Now recorded in
`visual-review.md`, with V2 captures committed under `visual/`.

What this closes: the application **was** launched and driven to the skill-selection screen, and the
offer-card header geometry was read from the live DOM — 270.66 × 210, `cover`, `50% 0%`, `screen`,
62 % mask. All 21 ice delivery files are captured in that measured geometry, `SK_ICE_L03` among them
and visibly the brightest, which agrees with its measured 150.6 against a lot median of 60.7.

What it does not close, and is recorded as **DR-1** and **DR-3** in the contract: V1 was never taken
and cannot honestly be reconstructed, and no ice card was rendered by the application itself (ice is
gated behind `unlockedArchetypes`, and the headless renderer would not advance the run to a fresh ice
offer). **V3 remains open** — a person decides, and this package does not.

Four findings are classified in `visual-review.md` §V4 with IDs `ICONS-VIS-01..04`. None is a defect
in this task. `ICONS-VIS-01` is worth naming here: the bake converts the bloom radius through
`STRIP_W = 277`, while the rendered zone measures **270.66** — a ~2.3 % discrepancy that predates
this task and would re-bake every lot to fix.

### B3 — the Tier C process was incomplete

**Confirmed.** Staffing now filled in the contract's Identity section from `AGENTS.md`'s role table
and this task's recorded decisions. `planning-report.md` added — **explicitly labelled as
reconstructed after the fact**, because a report written now cannot do what a planning report is for.
Its substantive cost is recorded as **DR-2**: four of five open questions were settled during
implementation rather than before it, including the toolchain, which is a house-rule gate.
