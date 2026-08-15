import { SKILL_DEFS, ARCHETYPE_META, archetypeOf } from "../game/skills.js";
import { ArchIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { phaseCard, PhaseHairline, PHASE_ACCENTS, ActionBar, ActionButton } from "./modalStyle.jsx";
import { GlossaryPanel, GlossaryText } from "./Glossary.jsx";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";

// #272 Legendär-Phase (Runde 29, build-defining): Legendäre NUR aus aktiven Fraktionen → fixer 7. Slot (kein Tausch).
// Angebotsgröße skaliert mit der Build-Breite (Mono 3 · Duo 2/Fraktion=4 · Trio 2/Fraktion=6).
// Ablehnen → stattdessen normale Skill-Wahl (nie „verschwendet"). Gold-Theming wie die Legendär-Rarität sonst.
const GOLD = "#d4a63a";
const ac = (id) => ARCHETYPE_META[archetypeOf(id)] || { label: "Legendär", icon: "★", color: GOLD };

export function LegendarySelect({ offer = [], onPick, onDecline, onReroll = null, state = {} }) {
  const legs = offer.map((id) => SKILL_DEFS[id]).filter(Boolean);
  const rerollsLeg = state.rerollsLeg || 0; // M1: dedizierter R29-Reroll-Token
  return (
    <div className="fixed inset-0 overlay-root z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-2xl">
        <div className="relative w-full rounded-2xl p-6 max-h-[92dvh] overflow-y-auto overlay-card" style={phaseCard(PHASE_ACCENTS.gold)}>
          <PhaseHairline />
          <GlossaryPanel className="absolute top-3 right-3 z-10" />
          {state.lastCycleScore != null && <div className="mb-3"><RoundScoreBadge state={state} /></div>}
          <div className="text-[10px] uppercase tracking-[0.2em] font-mono mb-1" style={{ color: GOLD }}>Legendär · einmalige Wahl</div>
          <h2 className="text-2xl font-bold mb-1" style={{ color: GOLD }}>★ Legendärer Skill</h2>
          <p className="text-sm opacity-70 mb-4 leading-snug">
            Ein mächtiger Skill für deinen <b>7. Slot</b> — nur aus Fraktionen, in denen du schon aktive Skills hast.
            Die Wahl steht danach <b>fest</b> (kein Tausch). Oder wähle stattdessen einen normalen Skill.
          </p>
          <ActionBar pad={6}>
            {onReroll && rerollsLeg > 0 && <ActionButton kind="reroll" flex onClick={onReroll}>↻ Neu würfeln <span className="opacity-70">({rerollsLeg})</span></ActionButton>}
            <ActionButton kind="decline" flex onClick={onDecline}>Keinen Legendär — stattdessen einen Skill wählen</ActionButton>
          </ActionBar>
          <div className="grid gap-3 sm:grid-cols-2">
            {legs.map((s) => {
              const meta = ac(s.id);
              return (
                <button key={s.id} onClick={() => onPick(s.id)}
                  className="text-left rounded-xl p-4 transition-all hover:brightness-110 flex flex-col gap-2"
                  style={{ background: "#20202a", border: `1px solid ${GOLD}`, boxShadow: `0 0 12px ${GOLD}22` }}>
                  <div className="flex items-center gap-2">
                    <ArchIcon meta={meta} size={18} />
                    <span className="font-bold text-lg leading-tight" style={{ color: GOLD }}>{s.name}</span>
                    <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap"
                      style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}66` }}>{meta.label}</span>
                  </div>
                  <div className="text-sm leading-snug opacity-90 whitespace-pre-line"><GlossaryText text={s.desc} /></div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
