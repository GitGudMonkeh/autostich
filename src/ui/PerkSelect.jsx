import { useState } from "react";
import { PERK_DEFS, CATEGORIES, rarityOf, RARITY_META, totalCritChanceRaw, hasCritPerk, baseScoreMultFor } from "../game/perks.js";
import { familyDef, hasCritFamily } from "../game/families.js";
import { tierMeta, romanOf, familyTierOf } from "../game/rarity.js";
import { PerkList, DeckStrength } from "./BuildSummary.jsx";
import { DevPerkCatalog } from "./DevPerkCatalog.jsx"; // Dev-Run: Voll-Katalog statt Zufallsangebot
import { FormationPanel } from "./FormationPanel.jsx";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { GlossaryPanel, GlossaryText } from "./Glossary.jsx";

// Legendär-Akzent: durchgehend gold (Rahmen, Ring, Badge, Titel) — Teil des Grau/Grün/Gold-Schemas (#71).
const LEG_GOLD = "#d4a63a";
const fmtMult = (x) => x.toFixed(2).replace(".", ",");

// #UI: Einklappbares Build-Kontext-Panel (wie in Skill-Auswahl/Aufstellphase) — Kopf mit Titel + optionaler Meta-Anzeige
// rechts + Chevron, Body ein-/ausklappbar. Hält die sekundären Infos kompakt, ohne die Perk-Wahl zuzustellen.
function InfoPanel({ title, meta = null, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a33" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left" style={{ background: "#161620" }}>
        <span className="text-[11px] uppercase tracking-wide font-bold opacity-60">{title}</span>
        <span className="flex items-center gap-2 shrink-0">{meta}
          <span className="text-[10px] opacity-50 transition-transform" style={{ display: "inline-block", transform: open ? "none" : "rotate(-90deg)" }}>▾</span>
        </span>
      </button>
      {open && <div className="px-3 py-3" style={{ borderTop: "1px solid #2a2a33" }}>{children}</div>}
    </div>
  );
}

/* Ein Angebotseintrag → einheitliches Anzeige-Modell (Rarität #167 §8). Familie {familyId,tier} zeigt den
   Familiennamen mit römischer Stufe, die Stufenfarbe (grau/grün/blau/lila) und — bei bereits gehaltener
   niedrigerer Stufe — ein Upgrade-Badge mit „gehaltener Rang → Zielrang". Flacher Perk-String bleibt wie #71. */
function offerView(entry, familyTiers = {}) {
  if (entry && typeof entry === "object" && entry.familyId) {
    const fam = familyDef(entry.familyId);
    const t = entry.tier;
    const tm = tierMeta(t) || { color: "#8a8a95", label: "" };
    const held = familyTierOf(familyTiers, entry.familyId); // 0 = neu, sonst gehaltener Rang
    return {
      key: `${entry.familyId}:${t}`, entry, isFamily: true, cat: CATEGORIES[fam.cat],
      accent: tm.color, tierLabel: tm.label, tier: t, held, upgrade: held > 0,
      name: `${fam.name} ${romanOf(t)}`, desc: (fam.tiers[t] || {}).desc || "",
      glow: t >= 3, // Selten/Rar erhalten einen dezenten Farbschein
    };
  }
  const p = PERK_DEFS[entry];
  const rar = rarityOf(entry);
  const rm = RARITY_META[rar];
  return { key: entry, entry, isFamily: false, cat: CATEGORIES[p.cat], accent: rm.color, rar, rm,
           leg: rar === "legendary", name: p.label, desc: p.desc };
}

/* Level-Up-Auswahl (§7.8): pausiert das Spiel, bietet PERKS_OFFERED Optionen.
   Zeigt zusätzlich den Build-Kontext (aktive Perks + Deck-Histogramm, #22) und die Kern-Stats (#40). */
export function PerkSelect({ offer, onPick, onReroll, onDecline, perks = [], deck = [], state = {} }) {
  // Neuwurf (#263): eigener Perk-Reroll-Pool (2 je Lauf), kein Free-Reroll mehr.
  const rerollTokens = state.rerollsPerk || 0;
  const canReroll = !!onReroll && rerollTokens > 0;
  // Kern-Stats — dieselben Helfer/Kontexte wie die StatusRail → kein Drift (#40).
  const { winStreak = 0, wins = 0, trickNo = 0, pos = 0, crits = 0, lightning } = state;
  // Crit inkl. Blitz-Basis (lightning) + Präzision-Familien — dieselbe geteilte Quelle wie Engine/StatusRail (kein Drift).
  // #181: ungeklemmt anzeigen (Gesamt-Crit kann > 100 % sein → speist L6 „Raserei" / Familie D „Überschusskrit").
  const critRaw = totalCritChanceRaw(state);
  const critPct = Math.round(Math.max(0, critRaw) * 100);
  const scoreMult = baseScoreMultFor(perks, { winStreak, wins, trickNo, pos });
  const showCrit = hasCritPerk(perks) || hasCritFamily(state.familyTiers) || crits > 0 || !!(lightning && lightning.active);
  return (
    <div className="fixed inset-0 overlay-root z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-3xl">
        <div className="relative w-full rounded-2xl p-6 max-h-[92dvh] overflow-y-auto overlay-card" style={{ background: "#181820", border: "1px solid #33333e" }}>
        <GlossaryPanel className="absolute top-3 right-3 z-10" />
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>
            {(state.perks || []).length === 0 ? "Start" : `Durchlauf ${(state.cycle || 0) + 1}`}
          </div>
          <h2 className="text-xl font-bold mt-1">Wähle einen Perk</h2>
          {state.lastCycleScore != null && <div className="mt-3"><RoundScoreBadge state={state} /></div>}
        </div>

        {/* Kern-Stats (#40): dezent, damit die Perk-Auswahl die primäre Aktion bleibt. */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs mt-3">
          {showCrit && <span><span className="opacity-50">Crit </span><span style={{ color: "#e879f9" }}>{critPct}%</span></span>}
          <span><span className="opacity-50">Score-Mult </span><span style={{ color: "#d4a63a" }}>×{fmtMult(scoreMult)}</span></span>
        </div>

        {state.devMode ? (
          <DevPerkCatalog offer={offer} onPick={onPick} onDecline={onDecline} />
        ) : (
        <div className="grid sm:grid-cols-3 gap-2.5 mt-4">
          {offer.map((entry) => {
            const v = offerView(entry, state.familyTiers);
            const cat = v.cat;
            return (
              <button
                key={v.key}
                onClick={() => onPick(v.entry)}
                className={`text-left rounded-xl p-3 h-full flex flex-col gap-1.5 transition-all hover:-translate-y-0.5${(!v.isFamily && v.leg) ? " as-legendary" : ""}`}
                style={{ background: "#20202a",
                         // Familie: Rahmen = Stufenfarbe (grau/grün/blau/lila). Flach: Seltenheit (grau/grün/gold).
                         border: `1px solid ${v.accent}${(v.isFamily ? v.tier === 1 : v.rar === "common") ? "55" : ""}`,
                         // Legendär (flach): einheitlicher animierter Gold-Rahmen über die .as-legendary-Klasse (#201.3) → hier KEINE Inline-box-shadow.
                         boxShadow: (!v.isFamily && v.leg) ? undefined
                                  : (v.isFamily ? v.glow : v.rar === "rare") ? `0 0 12px ${v.accent}22` : undefined }}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    style={{ background: `${cat.color}22`, color: cat.color }}>
                    {cat.name}
                  </span>
                  {v.isFamily ? (
                    <>
                      {/* Stufen-Badge (Seltenheit der Zielstufe) in der Stufenfarbe. */}
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                        style={{ background: `${v.accent}1f`, color: v.accent, border: `1px solid ${v.accent}88` }}>
                        {v.tierLabel}
                      </span>
                      {v.upgrade && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                          style={{ background: `${v.accent}14`, color: v.accent, border: `1px dashed ${v.accent}88` }}>
                          ⬆ AUFWERTEN · {romanOf(v.held)}→{romanOf(v.tier)}
                        </span>
                      )}
                    </>
                  ) : (
                    v.rm.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                        style={{ background: `${v.rm.color}1f`, color: v.rm.color, border: `1px solid ${v.rm.color}88` }}>
                        {v.rm.badge}
                      </span>
                    )
                  )}
                </div>
                <div className="font-bold" style={{ color: (!v.isFamily && v.leg) ? LEG_GOLD : v.isFamily ? v.accent : cat.color }}>{v.name}</div>
                <div className="text-[13px] opacity-75 leading-snug"><GlossaryText text={v.desc} /></div>
              </button>
            );
          })}
        </div>
        )}

        {!state.devMode && (
        <div className="text-center text-xs opacity-40 mt-3">
          Jeder Perk ist pro Lauf nur einmal wählbar.
        </div>
        )}

        {/* #138: Neu würfeln (links) + „Alle ablehnen" (rechts) nebeneinander über die Breite — eine Perk-Runde ist nie
            „verschwendet" (keine Münzen mehr, #225.1). Im Dev-Modus hat der Katalog sein eigenes „Überspringen". */}
        {!state.devMode && (onDecline || canReroll) && (
        <div className="flex items-stretch gap-2 mt-3">
          {canReroll && (
            <button onClick={onReroll}
              className="flex-1 text-xs px-4 py-2.5 rounded-lg font-bold transition-all hover:brightness-110"
              style={{ background: "#20202a", color: LEG_GOLD, border: `1px solid ${LEG_GOLD}66` }}>
              🎲 Neu würfeln · {rerollTokens}
            </button>
          )}
          {onDecline && (
            <button onClick={onDecline}
              className="flex-1 text-xs px-4 py-2.5 rounded-lg font-bold transition-all hover:brightness-110"
              style={{ background: "#20202a", color: "#9a9aa4", border: "1px solid #3a3a44" }}>
              Alle ablehnen
            </button>
          )}
        </div>
        )}

        {/* Build-Kontext (#22) — sekundär, hilft bei der gezielten Wahl (Synergien, Lücken). Einklappbare Panels wie in
            Skill-Auswahl/Aufstellphase, damit die Perk-Wahl die primäre Aktion bleibt. */}
        <div className="mt-4">
          <InfoPanel title={(() => { const n = perks.length + Object.values(state.familyTiers || {}).filter((t) => t > 0).length;
            return `Dein Build — ${n} Perk${n === 1 ? "" : "s"}`; })()}>
            <PerkList perks={perks} familyTiers={state.familyTiers} zinsBonus={state.zinsBonus} empty="Noch keine Perks gewählt." />
          </InfoPanel>
          <InfoPanel title="Deck-Stärke je Farbe">
            <DeckStrength deck={deck} />
          </InfoPanel>
          {/* #161 FB-1: aktive Formationen als Kontext (v. a. für Deck-/Formations-Perks) — mit 🏗 Gebäude-Toggle. */}
          <div className="mt-3 rounded-xl px-3 py-3" style={{ border: "1px solid #2a2a33" }}>
            <FormationPanel state={state} title="Formationen" collapsible defaultOpen={false} />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
