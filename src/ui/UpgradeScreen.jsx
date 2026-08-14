import { useState } from "react";
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, ActionButton } from "./modalStyle.jsx";
import { FactionIcon, FACTION_GLOW } from "./FactionIcon.jsx";
import { ARCHETYPE_META, ARCHETYPE_ORDER } from "../game/skills.js";
import { tierColor } from "../game/rarity.js";
import { DeckDetail } from "./DeckDetail.jsx";
import {
  NODES, NODE_BY_ID, TOTAL_NODES,
  emptyProfile, nodeState, buyNode, respec, ownedCount, treeComplete, owns,
} from "../game/progression.js";

/* Upgrade-Screen (#369 KOMPLETT-REWORK) — hängt am ECHTEN Profil (progression.js + storage). Zwei Reiter:
   „Decks" (je Archetyp die Kette Deck › Leg I › Leg II, tippbar → Deck-Detailansicht) und „Allgemein"
   (Baufeld/Energie/Rarität/Drop/2.-Perk als Lane-Fluss). Kauf/Respec liefern ein neues Profil an
   onProfileChange (App speichert via storage.saveProfile) → persistent. Werkstatt-Bildsprache. */

const GOLD = "#d4a63a";   // kaufbar / SP-Währung
const AM = "#f2a83a";
const CY = "#26c6e6";     // Allgemein-Akzent
const VI = "#9b82f0";     // Rarität-/Legendär-Akzent

// Allgemein-Zweig als Lanes (Reihenfolge = Kette).
const GEN_LANES = [
  { name: "Baufeld", accent: CY, ids: ["cover1", "cover2", "cover3"] },
  { name: "Energie", accent: CY, ids: ["energy1", "energy2"] },
  { name: "Rarität", accent: VI, ids: ["tier3", "tier4", "legLayer"] },
  { name: "Drop-Raten", accent: VI, ids: ["drop1", "drop2", "drop3", "drop4"], note: "öffnet sich nach dem Legendär-Unlock" },
  { name: "2. Perk-Phase", accent: VI, ids: ["perk2Leg", "perk2Reroll"], note: "öffnet sich nach dem Legendär-Unlock" },
];

// Akzentfarbe eines Knotens: Rarität-Knoten in Rarität-Farbe, Legendär gold, Deck-Knoten in Fraktions-Farbe.
const nodeAccent = (n, laneAccent) =>
  n.maxTier ? tierColor(n.maxTier) : n.legLayer ? GOLD : (n.arch ? FACTION_GLOW[n.arch] : laneAccent);

// Eine Knoten-Pille (Zustand aus nodeState). Kaufbar → klickbar (gold). Platzhalter/gesperrt → inert.
function NodePill({ node, st, accent, onBuy }) {
  const isOwned = st === "owned", isBuy = st === "buy", isPlaceholder = st === "placeholder";
  const mark = isOwned ? "✓" : isPlaceholder ? "Bald" : (isBuy || st === "lock-sp") ? `${node.cost} SP` : "🔒";
  const style = isOwned
    ? { border: `1px solid ${accent}`, background: `${accent}18` }
    : isBuy
      ? { border: `1px solid ${GOLD}`, boxShadow: `0 0 0 1px ${GOLD}22, 0 0 10px ${GOLD}22`, cursor: "pointer" }
      : isPlaceholder
        ? { border: "1px dashed #3a3a45", background: "transparent", opacity: 0.6 }
        : { border: "1px solid #26262e", opacity: 0.5 };
  const markColor = isOwned ? accent : (isBuy || st === "lock-sp") ? GOLD : "#8a8a95";
  return (
    <span title={`${node.detail}`} onClick={isBuy ? () => onBuy(node.id) : undefined}
      className="inline-flex flex-col items-start rounded-lg px-2.5 py-1.5 transition-transform hover:-translate-y-px"
      style={{ minWidth: 74, ...style }}>
      <span className="text-[11px] font-semibold leading-tight" style={{ color: isOwned ? "#e8e8ea" : isBuy ? "#f0e8d0" : "#c8c8d0" }}>{node.label}</span>
      <span className="text-[9.5px] font-bold tabular-nums leading-tight mt-0.5" style={{ color: markColor }}>{mark}</span>
    </span>
  );
}

// Ein Lane-Fluss: Pillen mit „›"-Verbindung (umbruchfähig).
function Lane({ nodes, p, laneAccent, onBuy, lead = null }) {
  const items = [];
  if (lead) items.push(<span key="lead" className="inline-flex flex-col items-start rounded-lg px-2.5 py-1.5" style={{ minWidth: 74, border: `1px solid ${lead.color}`, background: `${lead.color}18` }}>
    <span className="text-[11px] font-semibold leading-tight" style={{ color: "#e8e8ea" }}>{lead.label}</span>
    <span className="text-[9.5px] font-bold leading-tight mt-0.5" style={{ color: lead.color }}>✓ frei</span>
  </span>);
  nodes.forEach((n, i) => {
    if (items.length) items.push(<span key={`sep${n.id}`} className="text-[13px] self-center" style={{ color: "#4a4a55" }}>›</span>);
    items.push(<NodePill key={n.id} node={n} st={nodeState(p, n.id)} accent={nodeAccent(n, laneAccent)} onBuy={onBuy} />);
  });
  return <div className="flex flex-wrap items-stretch gap-1.5">{items}</div>;
}

export function UpgradeScreen({ onClose, profile, onProfileChange }) {
  const [tab, setTab] = useState("deck");
  const [detailArch, setDetailArch] = useState(null);
  useEscape(detailArch ? () => setDetailArch(null) : onClose);
  const p = profile || emptyProfile();
  const sp = Math.max(0, Math.floor(Number(p.stichPoints) || 0));
  const owned = ownedCount(p);

  const buy = (id) => onProfileChange && onProfileChange(buyNode(p, id));
  const doRespec = () => onProfileChange && onProfileChange(respec(p));

  // Deck-Detailansicht (Ebene 2) — überlagert den Baum, Zurück kehrt in den Decks-Reiter zurück.
  if (detailArch) {
    return <DeckDetail archetype={detailArch} profile={p} onBack={() => setDetailArch(null)} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl px-5 pb-6 sm:px-6 overlay-card as-panel relative"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>

        {/* Sticky-Kopf: Titel + SP-Guthaben + Respec + Schließen + Reiter. */}
        <div className="sticky top-0 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Upgrades</h2>
            <div className="flex items-center gap-2.5">
              <span className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold tabular-nums" style={{ color: AM, textShadow: "0 0 12px rgba(242,168,58,.4)" }}>{sp}</span>
                <span className="text-[10px] font-bold tracking-wider" style={{ color: AM, opacity: .8 }}>SP</span>
              </span>
              <button onClick={doRespec} disabled={owned === 0}
                className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40"
                style={{ background: "#20202a", border: "1px solid #3a3a46", color: "#c8c8d0" }}>↺ Respec</button>
              <ActionButton kind="secondary" className="shrink-0" onClick={onClose}>Schließen</ActionButton>
            </div>
          </div>
          {/* Reiter Decks / Allgemein */}
          <div className="flex gap-1.5 mt-3">
            {[{ key: "deck", label: "Decks" }, { key: "gen", label: "Allgemein" }].map((t) => {
              const on = t.key === tab, col = t.key === "deck" ? VI : CY;
              return (
                <button key={t.key} onClick={() => setTab(t.key)} role="tab" aria-selected={on}
                  className="flex-1 text-[13px] font-semibold tracking-wide px-3 py-2 rounded-lg transition-colors"
                  style={on
                    ? { color: col, background: "#131318", border: `1px solid ${col}55`, boxShadow: `0 0 16px -9px ${col}` }
                    : { color: "#8a8a95", background: "transparent", border: "1px solid #2a2a33" }}>
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="h-[2px] w-full rounded-full mt-2.5" style={{ background: `linear-gradient(90deg, ${VI}, ${CY}, ${AM})`, opacity: .7 }} />
          <div className="text-[11px] mt-1.5 tabular-nums" style={{ color: "#a6a6b0" }}>
            <b className="text-[#e8e8ea]">{owned}</b> / {TOTAL_NODES} Knoten · Meister-Liga {treeComplete(p) ? <b style={{ color: AM }}>frei</b> : `bei ${TOTAL_NODES}/${TOTAL_NODES}`}
          </div>
        </div>

        {/* ===== Reiter „Decks" ===== */}
        {tab === "deck" && (
          <div className="mt-4 grid gap-2.5">
            {ARCHETYPE_ORDER.map((arch) => {
              const meta = ARCHETYPE_META[arch];
              const accent = FACTION_GLOW[arch] || VI;
              const chain = NODES.filter((n) => n.arch === arch); // ice/plant: Deck-Knoten + Legs; fire/lightning: nur Legs
              const hasDeckNode = chain.some((n) => n.deckUnlock);
              const lead = hasDeckNode ? null : { label: "Deck", color: accent }; // Feuer/Blitz: Deck von Beginn an frei
              return (
                <div key={arch} className="rounded-2xl p-3" style={{ background: "#141419", border: "1px solid #26262e" }}>
                  <button onClick={() => setDetailArch(arch)}
                    className="flex items-center gap-2 w-full text-left mb-2.5 group" title={`${meta?.label}: Details`}>
                    <FactionIcon type={arch} size={20} />
                    <span className="text-[14px] font-extrabold" style={{ color: accent }}>{meta?.label || arch}</span>
                    <span className="ml-auto text-[10.5px] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform" style={{ color: "#a6a6b0" }}>Details ›</span>
                  </button>
                  <Lane nodes={chain} p={p} laneAccent={accent} onBuy={buy} lead={lead} />
                </div>
              );
            })}
            {/* Extras: Deck-Reroll + Platzhalter. */}
            <div className="rounded-2xl p-3" style={{ background: "#141419", border: "1px solid #26262e" }}>
              <div className="text-[10px] tracking-[0.22em] uppercase font-bold mb-2.5" style={{ color: "#b9b3cf" }}>Legendär-Phase</div>
              <Lane nodes={[NODE_BY_ID.deckReroll, NODE_BY_ID.synLeg]} p={p} laneAccent={VI} onBuy={buy} />
            </div>
          </div>
        )}

        {/* ===== Reiter „Allgemein" ===== */}
        {tab === "gen" && (
          <div className="mt-4 grid gap-2.5">
            {GEN_LANES.map((lane) => (
              <div key={lane.name} className="rounded-2xl p-3" style={{ background: "#141419", border: "1px solid #26262e" }}>
                <div className="flex items-baseline gap-2 mb-2.5">
                  <span className="text-[13px] font-extrabold" style={{ color: lane.accent }}>{lane.name}</span>
                  {lane.note && <span className="text-[9.5px] italic" style={{ color: "#71717c" }}>{lane.note}</span>}
                </div>
                <Lane nodes={lane.ids.map((id) => NODE_BY_ID[id])} p={p} laneAccent={lane.accent} onBuy={buy} />
              </div>
            ))}
          </div>
        )}

        {/* Legende. */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-5 text-[11px]" style={{ color: "#a6a6b0" }}>
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: VI }} /> gekauft</span>
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "transparent", border: `1px solid ${GOLD}`, boxShadow: `0 0 6px ${GOLD}88` }} /> kaufbar</span>
          <span>🔒 gesperrt · <span style={{ opacity: .7 }}>Bald = Platzhalter</span></span>
        </div>
      </div>
    </div>
  );
}
