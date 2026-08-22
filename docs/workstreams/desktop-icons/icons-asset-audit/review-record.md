# Review Record — icons-asset-audit

**This document records the review outcome.** It is the counterpart to `review-handoff.md`, which is
review *input* and deliberately records no approval.

| Field | Value |
| --- | --- |
| Branch | `task/icons-asset-audit` |
| Base | `863febe54fce513c4171314eb8cfc0d86f997408` |
| Head reviewed, round 1 | `cc1d2a632642c10531b52a27894bd49b592587c3` |
| Reviewer | Codex, independent assessment only |
| Date | 2026-08-22 |

## Round history

| Round | Head assessed | Outcome |
| --- | --- | --- |
| 1 | `cc1d2a63` | **Changes requested** — three blockers, B1–B3. Addressed; see below |
| 2 | pending | Not yet assessed |

---

## Round 1 — 2026-08-22

### Verdict

**Changes requested / not approved.**

### Blockers

| # | Finding (as recorded by the reviewer) | Status |
| --- | --- | --- |
| B1 | `skill-art-build.py` cannot configure a per-lot delivery size or render-zone width, contrary to the handoff. Corners would be distorted to 384×384 on activation. | **Addressed** |
| B2 | The mandatory Tier C visual gate is missing: no application check, no committed contact sheets, no V1–V4 record. `SK_ICE_L03` in particular remains visually unresolved at 150.6 against a median of 60.7. | **Addressed, with three downgrade records** |
| B3 | The Tier C process is incomplete: no planning report; Owner, Integrator and Reviewer are still `TODO` in the contract. | **Addressed, with one downgrade record** |

### Confirmed by the reviewer

Recorded because these were open questions the handoff had explicitly routed to the reviewer, and
they are now settled:

- The two lightning replacements **are** covered by the contract's carve-out.
- The change to `docs/art/skills/README.md` **is** covered by the prior surfacing and owner approval;
  the *Expected file surface* table did not have to be amended.
- All eight mapping/bake claims are **mechanically confirmed**. The divergent `cv` column is **not**
  a blocker, because it does not feed the light metric.
- The `i18n` timeout is **pre-existing** — identical on head and on a clean base commit, both
  isolation runs pass.
- Lint, ordinary build, preview build and `gen:db` all pass.
- **Linux CI on the pushed branch is green.**
- No repository rule files were modified.

---

## What changed in response — round 1 → round 2

Full detail in `evidence-package.md` §11. In summary:

**B1.** Confirmed as a real defect, not a documentation error. `Lot` now carries `size`, `strip_w`
and the bloom values per lot; `Lot.size` names the long edge and `Lot.delivery_px` derives the short
one from the master's aspect, so corners compute to **384×256** (aspect 1.500, matching the master).
`strip_w=None` now makes `Lot.sigma` raise rather than silently returning a skill-card number, so the
refusal is structural instead of a flag. Counter-checked in both directions. **The refactor changed
no output** — a full default bake left `git status` empty, all 42 delivery files byte-identical, and
the four ratchet literals in `test/skill-art.test.js` survive verbatim.

**B2.** `visual-review.md` added. The application was launched and driven to the skill-selection
screen; the offer-card header geometry was measured live (**270.66 × 210**, `cover`, `50% 0%`,
`screen`, 62 % mask) rather than assumed. All 21 ice delivery files are committed as a capture in
that measured geometry, plus a base-vs-head capture of the two lightning replacements. Four findings
classified `ICONS-VIS-01..04`; **none is a defect in this task**. Three gaps are recorded as downgrade
records rather than papered over: **DR-1** V1 was never taken and §8 forbids reconstructing it,
**DR-3** no ice card was rendered by the application itself, and **V3 remains open** because only a
person can close it.

**B3.** Staffing filled in the contract's *Identity*. `planning-report.md` added, **explicitly
labelled as reconstructed after the fact** — a report written now cannot do what a planning report is
for. Its substantive cost is **DR-2**: four of five open questions were settled during implementation
rather than before it, including the toolchain, which is a house-rule gate.

### V3 closed after the fixes

The owner passed the visual gate on **2026-08-22** ("sieht super aus. passt so"), reviewing both
captures at the measured geometry. Decision: **the ice lot ships as generated**, the documented cap
is not applied to `SK_ICE_L03`, and `ICONS-VIS-02` is closed as *no action*. Taken in knowledge of
DR-1 (no V1 baseline) and DR-3 (no ice card rendered by the app itself) — accepting the gate on that
evidence is part of what was decided.

With that, **all 12 Definition-of-done boxes are ticked** and three downgrade records stand.

### One finding that came out of doing B2

`ICONS-VIS-01`: the bake converts the bloom radius through `STRIP_W = 277`, while the rendered strip
measures **270.66 px**. Classified **pre-existing, out of scope** — the 277 predates this task and the
lightning set already shipped with it; correcting it would re-bake every delivery file in every lot.
Filed rather than fixed.
