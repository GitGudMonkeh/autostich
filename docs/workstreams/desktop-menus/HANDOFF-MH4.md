# HANDOFF — MH4 · the exemption reach

`task/menu-mh4-exemption-reach` @ `493db920`, base `dev` @ `fe1d36b3`. Measurements: `measurements/MH4.md`.

**Reproduced first, then broken.** The C4 sabotage (`#141419`/`#2a2a33` at the `.as-hub-field` desktop
call site) stayed **green — 102 passed, exit 0**. With the exemption scoped to the phone half it now
**fails on both axes, exit 1**. The base rule of the narrow version stays covered.

**Built.** `rules()` returns `[sel, body, media]` — appended, so the three call sites and the selector
derivation are untouched. `nurHandy()`/`nurDesktop()` qualify an entry; a bare regex keeps today's
reach exactly. `exempt-reach.mjs` promoted to `scripts/`, imported by the guard rather than copied.

**The sixteen resolve as 5 + 11.** Five entries reach across the threshold and are named in the guard;
eleven cover two rules that both sit *above* it — the C4 probe counted `… and (max-height: 950px)`
height variants as phone rules. **None judged.** Blind-spot line names SVG paint, three seams together.

**Gates bare:** 149 files / 2394 tests · lint · build · gen:db, all exit 0. **CI green on Linux.**
Noise floor: zero deltas. `src/**` and `typo-tokens.test.js` untouched. Tree clean, worktree in place.

**Open for the owner:** whether any of the five is a real defect — that needs someone who knows the screen.
