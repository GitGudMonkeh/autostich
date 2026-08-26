# Measurement records — `#menu-rework`

One file per task, `M<n>.md`, written by the worker that owns the task. Tier C requires the
measurement as a **named deliverable** (`task-lifecycle.md` §5), not as a bullet inside the
implementation work — if proving the work correct is a sub-bullet, it is what gets cut under time
pressure.

The four parts, and the shape they take, are `../planning-report.md` §5.2. In short:

| Part | What | Who |
| --- | --- | --- |
| 1. Baseline | What the task measures against, named rather than re-derived | machine |
| 2. Zero-delta gate | Where the task claims no pixel moved | machine |
| 3. Before/after comparison | Five viewports, both languages, both DPR — **re-run after every design round** | machine |
| 4. Findings table | One row per observation, with an ID (`MENU-01`, …) and a disposition | human |

**This directory replaces the V1–V4 protocol**, which was removed from the lifecycle in `4f72ba68`.
The reasoning, and what was deliberately kept anyway, is `../planning-report.md` §0.5.

A finding that exists only in a chat message is lost. Transcribe it here, verbatim, with a date.
