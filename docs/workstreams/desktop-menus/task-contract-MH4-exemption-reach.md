# Task contract — MH4 · The exemption reach · `#menu-rework`

**One mechanism defect in the guard, and a label. You touch no screen.**

An exemption in `panel-tokens.test.js` names a **selector**, and a selector spans **both halves of the
stylesheet**. An exemption written for a phone rule therefore silences the desktop rule too —
silently, and with the counter-check still green.

---

## Identity

| | |
| --- | --- |
| **Task** | `MH4` — make an exemption say which half it means |
| **Branch** | `task/menu-mh4-exemption-reach` — create it yourself |
| **Feature branch** | `feature/desktop-menus` |
| **Base SHA** | tip at start. Record it here |
| **Tier** | A — a known file surface, carrying out a decision already taken |
| **Owner stops** | One, before integration |
| **Worktree** | `C:/Code/Autostich-worktrees/menu-rework` — shared, **leave it in place** |
| **Ports** | preview **5189** · survey **5181** |

**Green at handover:** 145 files / 2355 tests · lint · build · gen:db, all exit 0, **CI green**.

---

## 1. The defect, and how it was found

The mainscreen's `.as-hub-field` needed an exemption for its **phone** rule — that value is the narrow
version's carrier and must not move. The **same entry** silently covered its **desktop** rule, where
the value should have been a token.

**Measured:** counter-checks C4/CC1 and CC2 stayed **green** with `#141419` and `#2a2a33` put back at
the call site. *The guard reported success on a file it was no longer watching.*

That worker fixed its own by scoping the desktop rules, then measured how far the shape goes
(`evidence/C4/exempt-reach.mjs`, on the mainscreen branch):

```
exemption entries that match at least one rule:            187
entries that reach BOTH the phone and the desktop half:     16
   M5_INSET_EXEMPT  .gd-frame .gd-nav .gd-page
   M6_INSET_EXEMPT  .gl-frame .gl-nav .gl-page
   INSET_EXEMPT     .op-dd-btn .op-root .op-foot .op-cols .op-col2 .op-head .cz-root
                    .up-root  .st-root/.lb-root/.go-root
   C_INSET_EXEMPT   .hub-root
```

**Sixteen is not sixteen defects.** Where both halves share the reason — a screen margin is layout at
any width — the reach is harmless, and most of these are exactly that. It is a defect only where the
two halves have **different** reasons: untouchable below the threshold, tokenisable above it.

## 2. What to build

**Teach `rules()` the media context, and let an exemption say which half it means.** One function, one
optional field.

**The shape is yours.** What the result must do:

- an entry that names no half keeps today's behaviour, so nothing already written changes meaning;
- an entry **can** say *phone only* or *desktop only*, and then reaches only there;
- **the sixteen become visible** — a listing, a printed count, or a test that names them. Whatever
  form, a reader must be able to see which entries reach both halves **without running a probe of
  their own.**

**Do not judge the sixteen.** Each needs a judgement about whether its two halves share a reason, and
that belongs to whoever knows the screen. **Making them visible is the deliverable; deciding them is
not.**

Promote `exempt-reach.mjs` out of `evidence/C4/` if it is the right tool for the listing — it was
written as task-local evidence, the way M8's stub and MR1's probes were before they were promoted.

## 3. The label

The surface probe records background, border, shadow and outline. **An SVG's `fill` and `stroke` are
on none of the four axes**, so a brand mark is invisible to the zero-delta gate by construction.

The survey already prints its blind spot on every run. **That line gains SVG paint.** No fifth axis —
a gate that names what it cannot see is honest, and `lockup.mjs` covers the mark directly.

---

## Tripwire

> **If this diff touches a screen's markup or its `.xx-*` rules — stop.** The instrument and the
> subject do not move in the same commit.

Out: the vocabulary and `@theme` · anything below 1280 px · a new dependency · **judging any of the
sixteen entries** · changing what any existing exemption means.

---

## Acceptance gate

> **The counter-check that stayed green now goes red.** Put `#141419` and `#2a2a33` back at the
> `.as-hub-field` desktop call site with its exemption scoped to the phone half, and the guard must
> fail.
>
> **And the noise floor is still zero** — same tree twice, 0 deltas.

The first clause is the whole task: the defect was that a counter-check passed. **Reproduce that,
then break it.**

---

## Known hazards

| # | Hazard | Resolution required |
| --- | --- | --- |
| **H-a** | **Changing what an existing entry means.** An unqualified entry must keep today's reach, or five workers' guards silently change | Default behaviour unchanged; qualification is opt-in |
| **H-b** | **A guard going red because the work succeeded** | Three this round. Rewrite to the **invariant**, not a lower number, and add a **negative probe** — a too-wide expression calms a ratchet as reliably as a too-narrow one |
| **H-c** | **A check that asks whether something is *present*** | Ninth instance would be this task's own. *"Contains no X other than Y."* |
| **H-d** | **`rules()` has other callers** | Measure them before changing the signature; an optional field is cheaper than a new one |

---

## Expected file surface

`test/panel-tokens.test.js` · `scripts/` if `exempt-reach.mjs` is promoted ·
`scripts/viewport-survey.mjs` (the blind-spot line only) · `test/harness-honesty.test.js` ·
`docs/workstreams/desktop-menus/measurements/MH4.md`

**Must not change:** any `src/**` · the `@theme` block · `test/typo-tokens.test.js` · the *meaning* of
any existing exemption entry.

---

## Definition of done

- [ ] Branch confirmed, `git status --short` empty, before the first edit
- [ ] **The failing counter-check reproduced first**, then made to fail — stated in that order
- [ ] An exemption can name its half; an entry that does not keeps today's behaviour
- [ ] **The sixteen are visible without running a private probe.** None of them judged
- [ ] The survey's blind-spot line gains SVG paint
- [ ] Guards counter-checked by deliberately breaking each seam
- [ ] **Noise floor re-measured: same tree twice, 0 deltas**
- [ ] Four gates green, run bare without pipes; `typo-tokens.test.js` unmodified
- [ ] Short measurement record — this task moves no pixels
- [ ] Handoff, fifteen lines or fewer. Tree clean; worktree left in place
- [ ] **Not done here:** no merge, no push of a permanent branch, no PR
