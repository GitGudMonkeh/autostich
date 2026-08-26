# The planner's answers to the mainscreen handover

**Written 2026-08-26**, against `PLANNER-HANDOVER.md`. Three asks answered, four instrument findings
dispositioned, and one correction that is mine.

---

## 1.1 The exemption reach — a task, not a review

**Ruling: `MH4` is opened. Build the real fix.**

The handover offers three options and is right that the middle one does not exist. Between *"go
through sixteen entries on five screens"* and *"teach `rules()` the media context"*, the second is
correct and it is not close:

- **This is a guard-mechanism defect, not a screen defect.** It belongs with MH1–MH3, and every one of
  those earned its own task for the same reason: the instrument is repaired separately from the
  subject.
- **Leaving it reproduces the round's most-repeated failure exactly.** *A migration that scopes its
  desktop rules is watched; one that does not is silently exempt, and nothing tells you which you are
  looking at.* That is the eighth instance of *a check that asks whether something is present* — this
  time inside the exemption list rather than inside an assertion.
- **The counter-check found it, not the reading.** Two counter-checks stayed green with the raw values
  put back. That is the same evidence MH3 and M5 produced, and it has been decisive every time.

**Sixteen entries do not need sixteen judgements today.** The fix makes them *visible*; whoever owns
each screen then judges its own, cheaply, against a list that says which half an exemption meant.
**Not judging them now is the point of fixing the mechanism first.**

**Outcome, 2026-08-26.** MH4 is built, and it corrected the number this ruling was written around:
**five entries cross the threshold, not sixteen.** The other eleven cover a width block and its
height variant, both above it; the C4 probe classified them as phone rules because it knew only the
first `1280` block. The ruling stands unchanged — fix the mechanism, do not judge the entries — and
the judgement now waiting on a screen owner is five entries wide, not sixteen.

**Declining to review five other workers' migrations was right.** Each needs a judgement about whether
the two halves share a reason, and that judgement belongs to whoever knows the screen.

## 1.2 The gate's wording — adopted, with the admissibility rule

**Ruling: adopted as standing contract language.**

> **"Every node outside the screen's root at zero"**, with the filter named as a required instrument.

The old wording — *"every surface but hub at zero"* — was written for screens that sit beside each
other. The hub sits **behind** them, so a single added node moved eleven surfaces' structural paths:
2750 deltas, none of them a change to those screens.

**What earns the adoption is not the wording but what was done with it.** The handover did not report
that as green and did not explain it away either. It located the subtree, built a filter, and **turned
the explanation into a gate** — producing a *stronger* claim than the contract asked for. Every later
commit used the tool unchanged.

**And the case that does not fit even that is adopted with it**, because it is the harder half:

> **Deltas outside the screen are admissible only where the document's own geometry changed, and only
> as box properties.**

C3 removed a 14 px overflow at 1400×700, the scrollbar went, and eleven surfaces gained 8 px of width
— 2624 deltas, every one a box coordinate, none paint. **That is the fix, not a regression. A gate
cannot tell those apart; a rule can.** Stating it in advance is what stops the next worker arguing it
in the moment.

## 1.3 `2px 6px` — not minted, and the reasoning is the ruling

**Ruling: do not mint. The handover's own reading is adopted verbatim.**

> *A counter that reaches three because one worker added two is not the independent spread the rule is
> about.*

That is exactly right, and it is the second time this round a worker has protected the threshold from
a case it would have technically satisfied. **The threshold counts independent sightings, and
independence is the load-bearing word** — the count is a proxy for spread, and a proxy is wrong
precisely when one author supplies most of it.

It is also **control padding**, which §2c places outside the ladder deliberately.

**Recorded as one sighting of a real gap:** the closed `--btn-pad-*` pair does not cover a small chip.
When two *other* screens meet it, the case is ready and the measurement is here.

---

## 4.1 The zoom band — the acceptance axis has a hole, and it is the owner's

**All five canonical viewports sit exactly on the `zoom` clamp's floor.** The zoom rises above 0.85
only from **1632 px**, and no named size is in the band.

**Measured, and this is what makes it not theoretical:** two versions of a deck-art formula were
**zero at all five** and overflowed by **28 / 66 / 89 px** at 1700×760, 1800×820 and 1920×850. Only the
third was zero at all eight.

> **A formula can be wrong across the whole upper band and right at every size anyone was asked to
> check.**

**This is owner decision 6** — *"exactly the set the existing survey measures"* — and changing it is
not mine. The cost, stated so the decision can be made against it:

| | |
| --- | --- |
| **Adding one row** | one width above 1632 with a short height — 1760×860 fits the shape |
| **What it costs** | +32 cells per full run, and **every existing baseline stops comparing**: the matrix shape changes |
| **What it buys** | an error class that is currently invisible by construction, on every screen inside `.hub-pair` |
| **The cheap middle** | leave the matrix alone, and require the *contract* of any `.hub-pair` screen to name one band viewport as a **hand check** |

**Recommended: the cheap middle.** It costs nothing structurally, keeps every baseline comparable, and
puts the check where the risk is. A sixth matrix row is worth revisiting when a baseline is being
retaken anyway.

## 4.2 A deck-tinted hub — the owner's, with the same cost

*Measured:* `resolveSkinId` returns `"default"` for any deck the profile has not unlocked, so App sets
**no `--deck-a1` at all**, and the survey seeds a fresh profile. **No hub cell in any matrix this round
carries a deck colour** — on a screen that is deck-tinted at seven places.

**Not changing the survey was right.** Adding an owned deck to the seed would have moved 160 cells of
an agreed baseline mid-workstream, which is the one thing a worker must not do to a shared instrument.
Covering the mark directly instead — and making that probe **fail** on an empty `--deck-a1` rather
than print a blank — is the correct substitute, and is itself an instance of *ask whether it is the
right thing*.

**Same shape of decision as 4.1, same cost:** every existing baseline stops comparing. **Recommended:
bundle it with 4.1** — if the matrix is ever reshaped, reshape it once.

## 4.3 The mark is invisible to the gate — labelled, not built around

An SVG's `fill` and `stroke` are on none of the four surface axes. **The brand mark cannot be seen by
the zero-delta gate, by construction.**

**Ruling: label it, as MENU-56 was labelled.** The survey already prints *"Surfaces only. Control
states are not captured and are verified by hand."* — that line gains SVG paint. Building a fifth axis
for one mark is not proportionate; a gate that names its blind spot is honest, and `lockup.mjs`
already covers this one directly.

**Carried to `MH4`**, which is touching the harness anyway.

## 4.4 Two of my numbers named something else — mine, and the method is the fix

The contract said `.hub-*` **19 rules** and `.as-hub-*` **31**. Those are **line counts with comments
in them** — the real figures are 14 and 26. It said **22 colour values**; the real figure is **26
distinct across 28 occurrences**, nine of them outside any style object.

**A worker that trusts these builds against them.** This is the eighth time this round a number of
mine described something other than what it claimed, and the pattern has never varied: I ran a grep
that was *close enough to look right* and wrote the result down as a measurement.

**The fix is not "be more careful". It is the method:**

> **A number in a contract says how it was taken.** `grep -c` counts *lines*, not rules. Distinct is
> not the same as total. **State the command or state the definition — one clause, and the reader can
> tell what the number is.**

Adopted into every contract from here.

---

## The open question that is not mine

Whether the mark under the tagline keeps its colour is **visible design and the owner's**. It is
recorded here only so it is not mistaken for something the planner is sitting on.
