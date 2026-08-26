# Measurement records — `#mainscreen-branding`

One file per commit, `C<n>.md`, written by the worker that owns the task. Tier C requires the
measurement as a **named deliverable** (`task-lifecycle.md` §5), not as a bullet inside the
implementation work — if proving the work correct is a sub-bullet, it is what gets cut under time
pressure.

The four parts are the same four as `../../desktop-menus/measurements/README.md`, and deliberately
so: a reader who has read one round's records has read this one's.

| Part | What | Who |
| --- | --- | --- |
| 1. Baseline | What the commit measures against, named rather than re-derived | machine |
| 2. Zero-delta gate | Where the commit claims no pixel moved | machine |
| 3. Before/after comparison | Five viewports, both languages — **and every number this commit's decision block put to the owner is re-measured here** | machine |
| 4. Findings table | One row per observation, with an ID (`C1-F01`, …) and a disposition | human |

**The baseline is captured fresh by C1.** The `#menu-rework` round's sets are not a valid "before"
for a screen nobody has migrated — contract, *Task-specific inputs*.

Findings are numbered per commit: `C1-F01`, `C2-F01`, and so on. A finding that exists only in a chat
message is lost. Transcribe it here, verbatim, with a date.
