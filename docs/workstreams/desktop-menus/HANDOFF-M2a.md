# M2a handoff — the workshop's shell, and the stress test

1. **Done.** Four commits on `task/menu-m2a-workshop-shell` (base `308ab5ae`): value-preserving
   conversion `44303eea` · the four owner-approved adoptions `6bbdbd97` · guards and the ink ratchet
   `91a2d5db` · the survey opens the effects tab `35e66fe5` · record and evidence `1ef515dc`. Both
   owner stops are closed: the decision block before implementation, the comparison approved at the
   End stop ("bilder schauen gut aus", 2026-08-24). Nothing pushed, nothing merged, no PR.
2. **Did the vocabulary hold? YES.** 2128 lines, a sticky head and 60 inline backgrounds, and every
   box in the shell had a step for its **role**. Four values sat 2–9/255 from their step and took it;
   nothing was short.
3. **The extension window: NOT USED — nothing was missing.** Two extensions were available and both
   were rejected as near-duplicates: `--sf-scrim-alt` (`#0c0c10ee` is `--sf-scrim-desk` written twice,
   **1.7/255** apart) and an edge token for `#23222e` (**8/255** from `--ed-quiet`, whose definition is
   that exact role). A third near-duplicate in a capped ladder is how 43 shadows happen. **The window
   is spent or not by your ruling, not mine** — if you read it differently, the request to file is
   named in `measurements/M2a.md` § *The extension window*, which carries the full role-by-role table.
4. **Tripwire 1 — not fired.** No new background, border, radius or shadow value at a call site.
5. **Tripwire 2 — not fired.** No panel built. Two gaps **named rather than taken**: MENU-38, the
   neutral translucent edge (`rgba(150,150,170,α)`, seven alphas, 15+ rules, on the `.as-edge-*` roles
   this round does not migrate) — the edge equivalent of MENU-26, and yours. MENU-39, the deck hairline
   written twice with mirrored fallbacks.
6. **Guards — measured, not inferred, and the planning report's instinct was wrong again.** `cz-ruhe`,
   the obvious candidate, does **not** break. `fx-panel`, `up-ruhe` and `overlay-nesting` do, and none
   was named for this task. All three rewritten to the invariant (a radius that *resolves* to 14 px and
   matches the panel it was measured against; one that resolves to 6 px; a comment moved rather than a
   window widened). **15 deliberate breaks, 15 failures** — every rewritten and every new assertion.
7. **M2b inherits.** Tree clean, four gates green (2200 tests), worktree in place on
   `C:/Code/Autostich-worktrees/menu-rework`, preview port 5189, survey port 5181. The allowlist entry
   is **region-scoped**: `panel-tokens.test.js` guards the shell's class hooks only, because 66 of the
   file's 68 axis literals are yours — append your hooks and the restriction lifts. The ink ratchet
   caps `CustomizeScreen.jsx` at **27** literals; it counts, it does not convert. And the survey now
   opens the effects tab (`shop-fx`), which had never been captured — your whole screen is finally
   visible to the gate. Read MENU-33/34/35 before you write a guard or a comment in that file.
