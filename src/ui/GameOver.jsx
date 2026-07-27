import { useState } from "react";
import { PERK_DEFS, CATEGORIES, rarityOf, RARITY_META } from "../game/perks.js";
import { SKILL_DEFS, ARCHETYPE_META } from "../game/skills.js";
import { Sparkline } from "./Sparkline.jsx";
import { fmtScore } from "./format.js";

// Highscore-Listen (lokal + global) bewusst NICHT hier — sie stehen auf dem Startbildschirm und
// machten dieses (nicht scrollbare) Overlay zu lang. Der GameOver-Screen zeigt nur den Lauf.
export function GameOver({ state, isRecord, timeStr, onRestart, onMenu, currentTraj = [], recordTraj = [] }) {
  const score = Math.floor(state.score); // Zahlenwert für Record-Vergleich; Anzeige über fmtScore
  const skills = state.skills || [];
  // #161 FB-2: Klick auf einen Perk/Skill zeigt dessen Beschreibung. sel = { kind, id } | null.
  const [sel, setSel] = useState(null);
  const toggle = (kind, id) => setSel((s) => (s && s.kind === kind && s.id === id ? null : { kind, id }));
  const selDetail = !sel ? null
    : sel.kind === "perk"
      ? { title: PERK_DEFS[sel.id].label, desc: PERK_DEFS[sel.id].desc, color: RARITY_META[rarityOf(sel.id)].color }
      : { title: SKILL_DEFS[sel.id]?.name, desc: SKILL_DEFS[sel.id]?.desc, color: (ARCHETYPE_META[SKILL_DEFS[sel.id]?.archetype] || {}).color || "#8a8a95" };
  return (
    <div className="fixed inset-0 overlay-root z-20 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90dvh] overflow-y-auto overlay-card" style={{ background: "#181820", border: "1px solid #33333e" }}>
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#e0605a" }}>Lauf beendet</div>
          <div className="text-5xl font-bold mt-2" style={{ color: "#d4a63a" }}>{fmtScore(score)}</div>
          <div className="text-sm opacity-60 mt-1">Score{timeStr ? ` · ${timeStr}` : ""}</div>
          {state.shop && <div className="mt-1 text-xs font-bold" style={{ color: "#d4a63a" }}>🪙 {state.shop.coins ?? 0} Münzen übrig</div>}
          {isRecord && <div className="mt-2 text-sm font-bold" style={{ color: "#8a7de0" }}>★ Neuer Rekord!</div>}
        </div>

        <div className="grid grid-cols-4 gap-2 text-center mt-5 text-sm">
          <div><div className="opacity-50 text-xs">Beste Serie</div><div className="font-bold">{state.bestStreak}×</div></div>
          <div><div className="opacity-50 text-xs">Perks</div><div className="font-bold">{state.perks.length}</div></div>
          <div title="Maximal gleichzeitig aktive Formationen im Run"><div className="opacity-50 text-xs">Formationen</div><div className="font-bold" style={{ color: "#5ab87a" }}>{state.maxFormations ?? 0}</div></div>
          <div title="Score-Anteil aus Formations-Multiplikatoren"><div className="opacity-50 text-xs">Form.-Score</div><div className="font-bold" style={{ color: "#5ab87a" }}>{fmtScore(state.formationScore)}</div></div>
        </div>

        {state.bestTrickScore > 0 && (
          <div className="grid grid-cols-4 gap-2 text-center mt-3 text-sm">
            <div><div className="opacity-50 text-xs">Crits</div><div className="font-bold" style={{ color: "#e879f9" }}>{state.crits}</div></div>
            <div><div className="opacity-50 text-xs">Crit-Quote</div><div className="font-bold" style={{ color: "#e879f9" }}>{state.wins > 0 ? Math.round((state.crits / state.wins) * 100) : 0}%</div></div>
            <div><div className="opacity-50 text-xs">Crit-Bonus</div><div className="font-bold" style={{ color: "#e879f9" }}>{fmtScore(state.critBonusScore)}</div></div>
            <div><div className="opacity-50 text-xs">Bester Stich</div><div className="font-bold" style={{ color: "#d4a63a" }}>{fmtScore(state.bestTrickScore)}</div></div>
          </div>
        )}

        {(state.perks.length > 0 || skills.length > 0) && (
          <div className="mt-4">
            {state.perks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {state.perks.map((id) => {
                  const cc = CATEGORIES[PERK_DEFS[id].cat].color;
                  const rar = rarityOf(id);
                  const rm = RARITY_META[rar];
                  const on = sel && sel.kind === "perk" && sel.id === id;
                  return (
                    <button key={id} onClick={() => toggle("perk", id)} title="Beschreibung anzeigen"
                      className="text-[11px] px-2 py-0.5 rounded transition-all hover:brightness-125"
                      style={{ background: `${cc}22`, color: cc,
                               border: `1px solid ${on ? cc : rar !== "common" ? rm.color : "transparent"}` }}>
                      {rm.mark ? `${rm.mark} ` : ""}{PERK_DEFS[id].label}
                    </button>
                  );
                })}
              </div>
            )}
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mt-1.5">
                {skills.map((id) => {
                  const d = SKILL_DEFS[id];
                  if (!d) return null;
                  const am = ARCHETYPE_META[d.archetype] || { color: "#8a8a95", icon: "" };
                  const on = sel && sel.kind === "skill" && sel.id === id;
                  return (
                    <button key={id} onClick={() => toggle("skill", id)} title="Beschreibung anzeigen"
                      className="text-[11px] px-2 py-0.5 rounded transition-all hover:brightness-125"
                      style={{ background: `${am.color}22`, color: am.color,
                               border: `1px solid ${on ? am.color : d.legendary ? "#d4a63a" : "transparent"}` }}>
                      {am.icon} {d.legendary ? "★ " : ""}{d.name}
                    </button>
                  );
                })}
              </div>
            )}
            {selDetail && (
              <div className="mt-2 rounded-lg px-3 py-2 text-xs leading-snug"
                   style={{ background: "#0e0e13", border: `1px solid ${selDetail.color}55` }}>
                <span className="font-bold" style={{ color: selDetail.color }}>{selDetail.title}</span>
                <span className="opacity-80"> — {selDetail.desc}</span>
              </div>
            )}
          </div>
        )}

        {/* Punkteverlauf: aktueller Lauf vs. (vorheriger) Rekord (#35). recordTraj ist der Snapshot
            VOR dem saveRun-Überschreiben → bei neuem Rekord liegt die Lauf-Linie sichtbar darüber. */}
        {currentTraj.length >= 2 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide opacity-50 mb-2">
              <span>Punkteverlauf</span>
              <span className="flex gap-2 normal-case tracking-normal">
                <span style={{ color: "#d4a63a" }}>Lauf</span>
                {recordTraj.length >= 2 ? <span style={{ color: "#8a7de0" }}>Rekord</span> : <span className="opacity-40">erster Lauf</span>}
              </span>
            </div>
            <Sparkline current={currentTraj} record={recordTraj} height={110} />
          </div>
        )}

        <div className="flex gap-2 mt-6">
          {onMenu && (
            <button
              onClick={onMenu}
              className="py-2.5 px-4 rounded-lg font-bold transition-all"
              style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}
            >
              Menü
            </button>
          )}
          <button
            onClick={onRestart}
            className="flex-1 py-2.5 rounded-lg font-bold transition-all"
            style={{ background: "#5ab87a", color: "#141419" }}
          >
            Neuer Lauf
          </button>
        </div>
      </div>
    </div>
  );
}
