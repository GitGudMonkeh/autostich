# Independent Codex Review — `#viewport-1280`

**Verdict: changes requested.** The product-source scope and automated gates are clean, but the review found two high-impact defects in live measurement tooling and several evidence/documentation gaps that should return to the owning Claude worker before integration.

| Field | Value |
| --- | --- |
| Role | Independent reviewer; no implementation |
| Branch | `feature/viewport-1280` |
| Reviewed range | `d3f65b43..05123e64` (six commits) |
| Reviewed HEAD | `05123e645297ecc0c7fa5c52ff13f2abf0d6fc59` |
| Contract | `docs/workstreams/viewport-1280/task-contract-T1b.md` |
| Worktree at start | clean, tracking `origin/feature/viewport-1280`, upstream at the same SHA |

## Findings

### F1 — High — Defect: the live viewport proof still validates the obsolete breakpoint queries

**Locations:** `scripts/viewport-proof.mjs:68-78`, `scripts/viewport-proof.mjs:132-137`, `src/index.css:1461`, `src/index.css:1536`, `src/index.css:5210-5587`.

**Measured:** a repository scan found seven live `1400`/`1399.98` media-query strings in `MEDIA_QUERIES`, while the current stylesheet contains the corresponding `1280`/`1279.98` queries. The diagnostic prose also still says that the zoom scope begins at 1400. The reviewed range changed `viewport-proof.mjs` to import the extracted pixel comparator, but the proof itself was not run.

**Inference:** the harness proof can pass while comparing the harness and real viewport against the same obsolete query list. Agreement on obsolete queries does not validate the actual 1280 seam, so the test is vacuous at the point this branch changes.

**Disposition:** return to the worker. Update the live query inventory from the current stylesheet (preferably derive it), update the stale diagnostic prose, and run the proof without overwriting historical evidence unintentionally.

### F2 — High — Defect: the survey delta algorithm discards worsening on an existing offender path

**Locations:** `scripts/survey-report.mjs:73-91`, `docs/workstreams/viewport-1280/survey-findings.md:27-36`, `docs/workstreams/viewport-1280/survey-findings.md:42-52`, and the raw cells beginning at `docs/workstreams/viewport-1280/evidence/survey/matrix.json:2357`, `docs/workstreams/viewport-1280/evidence/survey/matrix.json:8517`, `docs/workstreams/viewport-1280/evidence/survey/matrix.json:31805`, `docs/workstreams/viewport-1280/evidence/survey/matrix.json:106272`, `docs/workstreams/viewport-1280/evidence/survey/matrix.json:220781`, and `docs/workstreams/viewport-1280/evidence/survey/matrix.json:246042`.

**Measured:** `survey-report.mjs` subtracts counts for overflow/outside/truncation, then defines a single overflow as “added” only when its structural path is absent at 1920. It never computes the severity increase for a path that exists at both widths. Direct recomputation from the committed matrix found 1,264 same-path overflow records that worsened by more than 1 px. Concrete examples:

- `shop-packs`, DE: path `1/1/0/1/0/1/2/12:BUTTON` changes from 117.38 px at 1920 (`matrix.json:2396-2400`) to 212.5 px at 1536 (`matrix.json:106311-106315`), an unreported increase of 95.12 px. The prose table reports only 2.8 px as the shop's worst added overflow.
- `guide`, EN: path `1/0/1/1/3/0/3:DIV` changes from 5.41 px (`matrix.json:31844-31848`) to 1315.09 px at 1280 (`matrix.json:246276-246280`), an unreported increase of 1309.68 px.
- `glossary`, DE: path `1/1/0/3/0/1/2/7/1/3:DIV` changes from 4099.73 px (`matrix.json:10428-10432`) to 6697.11 px (`matrix.json:222926-222930`), an unreported increase of 2597.38 px; the prose table reports 746.5 px.

No equal-count replacement was present in the current matrix for truncated/outside nodes, but the count-subtraction implementation would also hide that case.

**Inference:** using 1920 as a reference can be a defensible reporting choice, but this implementation is not an identity-aware delta. It can materially understate damage and makes the generated findings table and the conclusions built on it unreliable.

**Disposition:** return to the worker. Compare offender identity and severity per path, keep absolute context visible, regenerate the table, and revisit the narrative conclusions and prediction verdicts that depend on the current aggregation.

### F3 — Medium — Contract breach: one named `1400` exception is actually stale threshold prose

**Locations:** `src/index.css:4589-4590`, `src/index.css:2591-2593`, `test/viewport-1280.test.js:101-102`; contract `task-contract-T1b.md:89-94` and `task-contract-T1b.md:99-112`.

**Measured:** the exception says, “Auf 1400+ px stehen sechs Kacheln je Zeile.” The six-column rule is in the desktop block and now applies from 1280. The plus sign makes this a range/threshold statement, not merely a measurement made at a named 1400 px viewport. The exception's justification calls it a named-width measurement and therefore misclassifies the surviving text.

**Inference:** the prose-carry-forward obligation is not complete, and the completeness guard blesses the stale statement instead of detecting it.

**Disposition:** return to the worker. Carry the live range forward or rewrite it as an explicit historical measurement, then update/remove the exception accordingly.

### F4 — Medium — Defect: capture tools can silently reuse a server from another build or worktree

**Locations:** `scripts/phone-proof.mjs:149-156`, `scripts/viewport-survey.mjs:91-103`.

**Measured:** both tools treat any HTTP-successful response at the expected origin as proof that their server is already running, then skip launching the local worktree's Vite preview. Neither verifies an asset hash, version, process ownership, worktree path, or expected `dist/index.html` identity.

**Inference:** on a machine with another process already bound to port 5181, a capture can measure a different worktree/build and still produce a normal PASS. `--strictPort` protects only the launch path; it does not protect the early-return path.

**Disposition:** return to the worker. Make server identity part of the precondition, or fail rather than reuse an unverified server.

### F5 — Medium — Contract breach: the machine-readable matrix does not contain the promised shrinkage result

**Locations:** `scripts/viewport-survey.mjs:245-257`, `scripts/viewport-survey.mjs:303-304`, `scripts/viewport-survey.mjs:323-337`, `scripts/survey-report.mjs:38-58`, `evidence/survey/matrix.json:2`, and representative null fields beginning at `evidence/survey/matrix.json:52017`.

**Measured:** the runner computes shrinkage only against reference cells in the current in-memory chunk. For chunked non-reference runs that reference is absent, so `shrunk` becomes `null`; the later merge does not recompute it. In the committed 130-cell matrix, all 104 reached non-reference cells have `shrunk: null`, and no cell has a non-empty `shrunk` array, even though the generated report derives guide shrinkage from the `type` inventories. The matrix also retains `generated: null`.

**Inference:** the raw observations are sufficient to derive shrinkage, but contract §5.3 item 5 says to record the shrinkage per cell, and §5.4 names the raw matrix as the machine-readable evidence. A consumer of that artifact sees null rather than the reported criterion.

**Disposition:** return to the worker. Either materialize the derived result into the merged matrix or define and validate a schema that clearly separates raw observations from derived findings; record generation provenance.

### F6 — Medium — Defect: a current backlog entry still states the old product behavior as fact

**Locations:** `docs/feature-backlog.md:157-162`; contract `task-contract-T1b.md:89-94`.

**Measured:** FB-13 says 1280–1399 receives the phone layout, the desktop pass starts at 1400, and a third tier is needed. All three statements are false at reviewed HEAD. The commit-3 handoff acknowledges the obsolete entry but leaves it unchanged as a product decision.

**Inference:** preserving historical decisions is required for `docs/decisions/**`, but `docs/feature-backlog.md` is a current planning surface. Marking an obsolete entry as superseded does not require silently choosing its replacement design.

**Disposition:** owner/worker decision required before integration: supersede or rewrite FB-13 and link the current workstream.

### F7 — Medium — Defect: failed paint-settling controls do not fail the phone proof or enter its durable evidence

**Locations:** `scripts/phone-proof.mjs:273-339`, `scripts/phone-proof.mjs:342-357`, `scripts/phone-proof.mjs:383-396`, `scripts/phone-proof.mjs:494-537`.

**Measured:** `settlePaint()` returns `fontsOk`, `timedOut`, and `stillPending`; `captureScreens()` prints those values but continues. `capture()` stores only the geometry probe, not the settle result. `compare()` therefore cannot reject a capture whose fonts or images failed to settle. The committed survey matrix had no font/image timeout, but the committed phone geometry files contain no durable settle status to audit.

**Inference:** two consistently incomplete captures can pass. The deadline prevents a hang, but it currently converts failure to settle into transient console prose rather than a failed measurement or durable named gap.

**Disposition:** return to the worker. Make unsettled captures fail or preserve them as explicit non-passing evidence.

### F8 — Low — Defect: the coverage-gap heading miscounts its own list

**Location:** `docs/workstreams/viewport-1280/survey-findings.md:146-160`.

**Measured:** the heading says “Four of the fifteen surfaces,” then lists five: formation, architect, victory, run details, and run dialogs.

**Inference:** this does not hide the names, but it weakens confidence in the coverage accounting and repeats the same count error in the reviewer brief.

**Disposition:** return to the worker with the broader coverage reconciliation.

## Judgments on the named review questions

### Paint settling and pinning animations — Question / Observation

`scripts/phone-proof.mjs:303-305` and `scripts/viewport-survey.mjs:125` pause every current animation at time zero. The committed survey contains cells with 0, 1, 2, 7, and 8 animations, so the control is active on materially different surfaces.

This is a reasonable determinism control for the reviewed threshold-only source change: the independent source comparison found no non-comment product behavior beyond the breakpoint token, counter-edge, media-query values, and `DESKTOP_MIN`, while proof 1 compares phone-applicable CSS. It is not a general visual proof. An animation-class change in JSX, a delayed animation created after the enumeration, or a defect visible only later in an animation can be hidden at time zero. The tool and evidence should state that boundary, and F7 should be fixed so failed settling cannot pass.

### `recanonicalise()` — Observation

`scripts/phone-proof.mjs:417-435` was applied twice, read-only, to both committed `before-pinned` and `after` rule artifacts. Each remained byte-stable at 67,136 bytes after the first pass, the second pass was identical to the first, and the two cross-flip results were equal. The full phone comparison also passed.

That measures idempotence for the actual artifacts. It is not a unit/property test for future media-query grammar, and re-canonicalisation cannot recover a block that an older capture incorrectly omitted. No current failing example was found.

### Delta against 1920 — Defect in implementation, not necessarily in principle

Absolute 1920 defects can reasonably be separated from width-induced changes, but the report must not equate count subtraction with an offender delta. F2 demonstrates that the current algorithm hides materially worsening same-path offenders. The correct decision is to keep the 1920 reference while comparing identities and magnitudes and retaining enough absolute context to show when the panel heuristic itself is suspect.

### Panel heuristic — Question

`scripts/surveyProbe.js:46-57` implements the contract literally: the nearest ancestor with an `as-panel*` class, hidden overflow, or its own background. The committed matrix reports, at 1920 alone, 153/145 glossary overflow records in DE/EN, 150/140 elements entirely outside, and maximum distances around 4,402/4,171 px. Across the matrix it records 2,255 overflow and 1,860 outside records.

Those absolute values are not plausible as a direct count of visible broken panels on a usable 1920 screen; they are evidence that nested painted ancestors and/or fragmented multi-column geometry are being treated as panels. Because the definition is contract-specified, this is an owner-level measurement question, not an accusation that the probe ignored its contract. F2 shows why the current delta layer does not safely neutralize the artifact.

### Completeness guard assertion 5 — Observation

`test/viewport-1280.test.js:175-189` cannot fail independently when `test/desktopBreakpoint.js:45-80` already throws during import. Contract §4.1 explicitly anticipated that and required the readable assertion anyway. It is redundant coverage, not independent sabotage evidence; acceptable as documentation, provided it is not described as a separately counter-checked seam.

### Post-hoc expected file surface and actual scope — Observation

Contract §12 cannot independently prove scope because it was written after commit 3 and partly derived from that diff. An independent check nevertheless found:

- no changes in category A paths across the reviewed range;
- category B changes are comment-only;
- after stripping comments and normalizing only the four permitted breakpoint forms, all changed `src/**` files are behaviorally identical to the base;
- `docs/engineering/conventions.md` and the two `docs/art/**/README.md` changes carry current threshold facts forward and are in scope;
- `docs/decisions/**` and the finished viewport-harness records are unchanged.

The independent scope result is therefore acceptable except for the stale live tool and current backlog findings F1 and F6.

### Hover and level-up rails — Question / Observation

The level-up rail deferral is explicitly authorized by contract §9: document the 1280 value and leave it for T3. However, `visual-findings-1280.md:19-24` routes the resulting V1280-01/V1280-04 defects to T2, while the root-cause section at `visual-findings-1280.md:36-60` ties them to the same fixed `.lv-rig`. This review does not reclassify the owner's findings; the T2/T3 ownership conflict needs an explicit owner/integrator decision.

The hover case at `src/index.css:2217-2234` is a threshold-induced interaction change, not merely stale prose. Contract §9 expressly defers layout repairs and the wings, but it does not name this touch/hover behavior. A source comment alone is not a durable disposition. The owner should explicitly accept it or route it to a tracked follow-up before integration.

### Survey coverage gaps — Observation

The matrix contains 130 reached cells for 13 surfaces across the required size/language axes. It does not cover formation/buildings, architect, victory, run details, run dialogs, either board state, shop challenges/effects, ranked leaderboard, the first-start username modal, or later run decisions. These omissions are stated in `survey-findings.md:142-180`, including the production-versus-`VITE_PREVIEW` schedule conflict.

The contract's acceptance wording combines “every listed surface” with a requirement to name what was not measured, so the named gaps are transparent but not equivalent to measurements. The unresolved route into preview-gated states should be treated as an explicit acceptance downgrade/owner decision, not as silently complete coverage.

## Validation performed in this review

All commands were run in the target worktree, unpiped:

- `npm ci` — passed; lockfile installation completed.
- `npm test` — passed.
- `npm run lint -- --max-warnings=0` — passed.
- `npm run build` — passed (ordinary production build).
- `npm run gen:db` — passed.
- PowerShell `VITE_PREVIEW=1` build — passed; the environment variable was removed afterward.
- a final ordinary `npm run build` — passed, restoring the production artifact after the preview build.
- `node scripts/phone-proof.mjs compare before-pinned after` — passed: rule set identical, all recorded geometry identical, and every recorded DE/EN pair at 0.0000% beyond the noise threshold.
- `git diff --check d3f65b43..05123e64` — passed.
- category A path diff — empty; category B — comment-only.

## Review limits

- The Fallow review skill was selected, but neither the `fallow` CLI nor a callable plugin interface was available. `fallow review --base d3f65b43 --show-deprioritized` failed because the command was not found. No graph-grounded walkthrough or post-validation claim is made.
- `scripts/viewport-proof.mjs` was not run because it writes/overwrites the finished viewport-harness evidence package; static inspection found F1 first.
- `scripts/viewport-survey.mjs --size 1280x720 --lang de` was not run because it merges into the committed matrix and would alter the evidence under review. The committed raw matrix was inspected and recomputed read-only instead.
- The phone proof compared committed captures; it did not recapture a new label, so the original capture-time settle status remains unauditable (F7).
- The owner's V1280-01..04 visual classifications were not re-litigated or changed.

## Handoff to the owning worker

Address F1 and F2 before relying on either proof/report for integration. Re-run the affected tools with identity-aware evidence, then reconcile F3-F8 and the explicit owner questions. Automated gates being green does not resolve these measurement defects.
