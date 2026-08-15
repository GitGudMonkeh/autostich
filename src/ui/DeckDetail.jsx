import { useState } from "react";
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, ActionButton } from "./modalStyle.jsx";
import { FactionIcon, FACTION_GLOW } from "./FactionIcon.jsx";
import { ARCHETYPE_META, SKILL_LIST } from "../game/skills.js";
import { GUIDES } from "./guides.js";
import { GuideBody } from "./GuideOverlay.jsx";
import { PACKS, packCond, packState, packUnlock } from "../game/themes.js";
import { deckAssets } from "./cosmeticAssets.js";
import { NODES, owns } from "../game/progression.js";

/* ============================================================
   DECK-DETAILANSICHT (#369, Ebene 2) — VOLLSTÄNDIG DATENGETRIEBEN.
   Öffnet beim Tippen auf ein Deck im Decks-Reiter des Upgrade-Baums. Drei Reiter, die dynamisch aus den
   Single-Source-Modulen rendern (kein hartkodierter Inhalt, keine Handpflege):
     1. Passives  — SKILL_DEFS/SKILL_LIST gefiltert nach Archetyp (inkl. legendär), name + desc live.
     2. Leitfaden — GUIDES[archetype] über die geteilte GuideBody (nicht abgeschrieben).
     3. Challenges— die archetyp-gebundenen cond-Packs (themes.js) + echte Deck-Skin-Grafik + Fortschritt.
   Neue Skills / geänderte desc / neue Challenge-Decks erscheinen automatisch.
   ============================================================ */

const GOLD = "#d4a63a";

// Kleiner Fortschrittsbalken (cur/target) im Werkstatt-Look.
function ProgressBar({ cur, target, color, done }) {
  const frac = target > 0 ? Math.max(0, Math.min(1, cur / target)) : (done ? 1 : 0);
  return (
    <div className="relative overflow-hidden rounded-md" style={{ height: 8, background: "#0c0c11", border: "1px solid #2a2a33" }}>
      <span className="absolute inset-y-0 left-0" style={{ width: `${frac * 100}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, boxShadow: `0 0 12px -2px ${color}` }} />
    </div>
  );
}

// Status-Pille (Deck / Leg I / Leg II) im Kopf.
function StatusPill({ label, on, color }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
      style={on
        ? { background: `${color}22`, border: `1px solid ${color}`, color }
        : { background: "#17151f", border: "1px solid #2e2d38", color: "#5c5b66" }}>
      {on ? "✓" : "🔒"} {label}
    </span>
  );
}

export function DeckDetail({ archetype, profile, onBack, onClose }) {
  const [tab, setTab] = useState("passives");
  useEscape(onBack);
  const meta = ARCHETYPE_META[archetype];
  const color = meta?.color || FACTION_GLOW[archetype] || GOLD;
  const p = profile || {};

  // Datengetriebene Ableitungen — alles live aus den Single-Source-Modulen.
  const deckNode = NODES.find((n) => n.arch === archetype && n.deckUnlock); // ice/plant; fire/lightning = frei
  const legNodes = NODES.filter((n) => n.arch === archetype && n.legLevel).sort((a, b) => a.legLevel - b.legLevel);
  const deckOwned = deckNode ? owns(p, deckNode.id) : true;
  const skills = SKILL_LIST.filter((s) => s.archetype === archetype);
  const normalSkills = skills.filter((s) => !s.legendary);
  const legendarySkills = skills.filter((s) => s.legendary);
  const guide = GUIDES[archetype];
  // Archetyp-gebundene Kosmetik-Packs (themes.js) — die Element-Challenge-Decks (monoArchetypeRun).
  const packs = PACKS.filter((pk) => packCond(pk)?.archetype === archetype);

  const TABS = [
    { key: "passives", label: "Passives" },
    { key: "leitfaden", label: "Leitfaden" },
    { key: "challenges", label: "Challenges" },
  ];

  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl px-5 pb-6 sm:px-6 overlay-card as-panel relative"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>

        {/* Sticky-Kopf: Zurück + Fraktions-Icon + Name + Status-Pills + Schließen. */}
        <div className="sticky top-0 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          <div className="flex items-center gap-2.5">
            <button onClick={onBack} title="Zurück" aria-label="Zurück"
              className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: "#20202a", border: "1px solid #3a3a46", color: "#c8c8d0" }}>‹ Zurück</button>
            <FactionIcon type={archetype} size={26} />
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-none" style={{ color: "#e8e8ea" }}>{meta?.label || archetype}</h2>
              {guide?.subtitle && <div className="text-[10.5px] mt-0.5 leading-tight truncate" style={{ color: "#a6a6b0", maxWidth: "30ch" }}>{guide.subtitle}</div>}
            </div>
            <ActionButton kind="secondary" className="ml-auto shrink-0" onClick={onClose}>Schließen</ActionButton>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <StatusPill label="Deck" on={deckOwned} color={color} />
            {legNodes.map((n, i) => <StatusPill key={n.id} label={`Leg ${["I", "II"][i] || n.legLevel}`} on={owns(p, n.id)} color={color} />)}
          </div>
          {/* Reiter */}
          <div className="flex gap-1.5 mt-3">
            {TABS.map((t) => {
              const on = t.key === tab;
              return (
                <button key={t.key} onClick={() => setTab(t.key)} role="tab" aria-selected={on}
                  className="flex-1 text-[12px] font-semibold tracking-wide px-3 py-1.5 rounded-lg transition-colors"
                  style={on
                    ? { color, background: "#131318", border: `1px solid ${color}55`, boxShadow: `0 0 14px -8px ${color}` }
                    : { color: "#8a8a95", background: "transparent", border: "1px solid #2a2a33" }}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== Reiter 1: Passives ===== */}
        {tab === "passives" && (
          <div className="mt-4">
            {guide?.kernidee && (
              <div className="rounded-xl px-3.5 py-3 text-[13px] leading-relaxed mb-4"
                style={{ background: "linear-gradient(180deg,#1a1826,#16161c)", border: "1px solid #2a2a33", borderLeft: `3px solid ${color}`, color: "#cfcfda" }}>
                {String(guide.kernidee).replace(/\*\*/g, "")}
              </div>
            )}
            <SkillGroup title="Skills" skills={normalSkills} color={color} />
            {legendarySkills.length > 0 && <SkillGroup title="Legendäre" skills={legendarySkills} color={GOLD} legendary />}
          </div>
        )}

        {/* ===== Reiter 2: Leitfaden (geteilte GuideBody) ===== */}
        {tab === "leitfaden" && (
          <div className="mt-2">
            <GuideBody archetype={archetype} showTitle={false} />
          </div>
        )}

        {/* ===== Reiter 3: Challenges (Deck-Skin + cond-Packs + Fortschritt) ===== */}
        {tab === "challenges" && (
          <div className="mt-4 grid gap-3">
            {packs.length === 0 && (
              <div className="text-[12px] text-center py-6" style={{ color: "#a6a6b0" }}>Keine deck-gebundenen Freischaltungen.</div>
            )}
            {packs.map((pk) => {
              const prog = packUnlock(p, pk);          // { done, cur, target, label }
              const state = packState(p, pk);          // "own" | "buy" | "lock"
              const assets = deckAssets(pk.deckId);
              const unlocked = state === "own" || (prog && prog.done);
              return (
                <div key={pk.id} className="rounded-2xl p-3" style={{ background: "#141419", border: "1px solid #2a2a33" }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[15px]" aria-hidden="true">{pk.emblem}</span>
                    <span className="text-[13.5px] font-bold" style={{ color: pk.a1 || color }}>{pk.name}</span>
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={unlocked ? { background: `${color}22`, border: `1px solid ${color}`, color } : { background: "#17151f", border: "1px solid #2e2d38", color: "#8a8a95" }}>
                      {unlocked ? "✓ frei" : "🔒 gesperrt"}
                    </span>
                  </div>
                  {/* Echte Deck-Skin-Grafik (Vorschau) — GANZE Karte sichtbar (contain, nicht beschnitten); gesperrt: abgedunkelt. */}
                  {assets?.back && (
                    <div className="rounded-xl overflow-hidden mb-2.5 flex justify-center py-2" style={{ border: "1px solid #2a2a33", background: "#0c0c11" }}>
                      <img src={assets.back} alt={`${pk.name} Deck-Skin`} draggable={false}
                        className="block h-auto mx-auto" style={{ width: "auto", maxWidth: "100%", maxHeight: 420, objectFit: "contain", opacity: unlocked ? 1 : 0.45, filter: unlocked ? "none" : "grayscale(0.6)" }} />
                    </div>
                  )}
                  {prog && (
                    <>
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-[11px] leading-tight" style={{ color: "#a6a6b0" }}>{prog.label}</span>
                        <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: unlocked ? color : "#c8c8d0" }}>{Math.min(prog.cur, prog.target)} / {prog.target}</span>
                      </div>
                      <ProgressBar cur={prog.cur} target={prog.target} color={color} done={unlocked} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Eine Skill-Gruppe (normal / legendär) — name + live-desc aus SKILL_DEFS.
function SkillGroup({ title, skills, color, legendary = false }) {
  if (!skills.length) return null;
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="w-3.5 h-0.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <h3 className="text-[10px] tracking-[0.22em] uppercase font-bold" style={{ color: "#b9b3cf" }}>{title}</h3>
        <span className="text-[10px] tabular-nums" style={{ color: "#5c5b66" }}>{skills.length}</span>
      </div>
      <div className="grid gap-2">
        {skills.map((s) => (
          <div key={s.id} className="rounded-xl px-3 py-2.5"
            style={legendary
              ? { background: `linear-gradient(180deg, ${color}1a, #16140e)`, border: `1px solid ${color}55`, borderLeft: `3px solid ${color}` }
              : { background: `linear-gradient(180deg, ${color}10, #141419)`, border: "1px solid #2a2a33", borderLeft: `3px solid ${color}` }}>
            <div className="flex items-center gap-1.5">
              {legendary && <span className="text-[11px]" style={{ color }} aria-hidden="true">★</span>}
              <span className="text-[13px] font-bold" style={{ color }}>{s.name}</span>
            </div>
            <div className="text-[12px] leading-relaxed mt-0.5" style={{ color: "#b6b6c2" }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
