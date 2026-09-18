# sim/probes — measurement scripts of the skill rework

Small Node scripts that read the game modules directly. They complement `npm run sim -- --mode …`
(`duel`, `motor`, `skills`, `legendaries`) and were written during the Feuer/Blitz rework
(`docs/skill-rework.md` §7). Run them from the repository root:

```bash
ARCH=fire NOLEG=1 N=400 node sim/probes/lifts.mjs      # lift per skill in the pure faction build (with ÷ without)
node sim/probes/band.mjs                                 # balance band of the random policy (seeds 1..40)
node sim/probes/streak-probe.mjs                         # longest streak per run, per world
node sim/probes/overcrit-probe.mjs                       # crit chance above 100 % across the run
SIM_CRIT_MULT_CAP=1000 node sim/probes/capexcess-probe.mjs   # crit multiplier above the 8x cap
VARIANT=quarter node sim/probes/variant-duel.mjs         # duel with a tier table mutated in-process
N=150 node sim/probes/weissglut-gate.mjs                 # how often the Feuersturm/Schmelzpunkt gates stand open, with and without Weissglut
node sim/probes/print-skill-texts.mjs                    # every Feuer/Blitz skill with its four tier texts
GDOC_LOGDIR=/path/to/logs GDOC_TAG=725 node sim/probes/gdoc.mjs   # owner document (HTML for Google Docs)
N=100 node sim/probes/blitz-ramp.mjs                     # when the lightning engine comes online, per 10-round block
N=100 node sim/probes/blitz-critsource.mjs               # which source the lightning crit chance comes from, per block
SIM_CRIT_MULT_CAP=1000 N=60 node sim/probes/blitz-multsource.mjs   # same for the crit MULTIPLIER, and what the 8x cap cuts
N=60 node sim/probes/faction-pacing.mjs                  # score after rounds 10/20/30/40/50 per faction, legendary split
SIM_LIGHTNING_CRIT_SOCKET=0.08 SIM_LIGHTNING_CRIT_PER_SKILL=0.03 \
  node --import ./sim/probes/lightning-socket-hook.mjs sim/probes/blitz-ramp.mjs   # unbuilt passive shape (§7.29)
```

Reading rules (measured, see §7.22): the paired greedy ablation (`--mode skills`) is the arbiter for
"carries" and "hurts"; lifts are for legendaries and, with care, tier comparisons — for a skill held
in 90 % of runs the "without" group is tiny and values under 0.9 are noise; `NOLEG=1` keeps
legendary holders out of the "without" group. Explore tables vary by ±20 % between runs, rarely
held skills by ±30 points — a verdict needs two runs.
