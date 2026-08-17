import { useState } from "react";
import { useEscape } from "./useEscape.js";
import { useTabSwipe } from "./useSwipeTabs.js"; // Reiterwechsel per Swipe (nur Funktion, keine Optik)
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, ActionButton } from "./modalStyle.jsx";
import { FactionIcon, FACTION_GLOW } from "./FactionIcon.jsx";
import { ARCHETYPE_ORDER } from "../game/skills.js";
import { tierColor } from "../game/rarity.js";
import { DeckDetail } from "./DeckDetail.jsx";
import {
  // #sprache: NODES ist durch nodeList() (labels.js) ersetzt — die Knotentexte werden zur Anzeigezeit aufgelöst.
  TOTAL_NODES,
  emptyProfile, nodeState, buyNode, respec, ownedCount, treeComplete,
} from "../game/progression.js";
import { nodeDef, nodeList, archMeta } from "../i18n/labels.js"; // #sprache: Knoten-/Archetyp-Texte zur Anzeigezeit
import { t } from "../i18n/index.js";

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
  { nameKey: "upgrades.lane.cover", accent: CY, ids: ["cover1", "cover2", "cover3"] },
  { nameKey: "upgrades.lane.energy", accent: CY, ids: ["energy1", "energy2"] },
  // Reroll-Basis 1 → 3: je Knoten +1 Reroll auf ALLE DREI Angebots-Pools (Perk · Gebäude · Skill).
  { nameKey: "upgrades.lane.rerolls", accent: CY, ids: ["reroll1", "reroll2"] },
  { nameKey: "upgrades.lane.rarity", accent: VI, ids: ["tier3", "tier4", "legLayer"] },
  { nameKey: "upgrades.lane.drops", accent: VI, ids: ["drop1", "drop2", "drop3", "drop4"], noteKey: "upgrades.lane.note.afterLeg" },
  { nameKey: "upgrades.lane.perk2", accent: VI, ids: ["perk2Leg", "perk2Reroll"], noteKey: "upgrades.lane.note.afterLeg" },
];

// Akzentfarbe eines Knotens: Rarität-Knoten in Rarität-Farbe, Legendär gold, Deck-Knoten in Fraktions-Farbe.
const nodeAccent = (n, laneAccent) =>
  n.maxTier ? tierColor(n.maxTier) : n.legLayer ? GOLD : (n.arch ? FACTION_GLOW[n.arch] : laneAccent);

/* Gruppen-Panel: die Fraktionsfarbe steht an der linken Kante statt als umlaufender Rahmen (#kante).
   Der flache dunkle Grund bleibt — kein Glow, kein Farb-Tint über die ganze Fläche (wirkte „billig ad-game");
   die Zuordnung zur Gruppe macht allein die Kante, so wie überall sonst im Spiel. Als Inline-Objekt statt
   Klasse, weil die Farbe je Gruppe aus den Spieldaten kommt und der Aufrufer sie schon zur Hand hat. */
const panelStyle = (c) => ({
  background: `linear-gradient(90deg, color-mix(in srgb, ${c} 10%, #111119) 0%, #111119 38%)`,
  border: "1px solid rgba(150, 150, 170, .12)",
  borderLeft: `4px solid color-mix(in srgb, ${c} 75%, transparent)`,
});

// Innerer Inhalt einer Pille (Titel + Marke) — zentriert, damit gleich breite Pillen sauber in Spalten sitzen.
function PillBody({ label, mark, titleColor, markColor }) {
  return (
    <>
      {/* #desktop: eine Stufe größer ab 1400 px — 11 px stammen aus dem Handy-Entwurf und sind auf 1080p
          zu klein. Größer geht nicht: 27 Knoten müssen gleichzeitig ins Bild passen. */}
      <span className="text-[11px] min-[1400px]:text-[14px] font-semibold leading-tight" style={{ color: titleColor }}>{label}</span>
      <span className="text-[9.5px] min-[1400px]:text-[12px] font-bold tabular-nums leading-tight mt-1" style={{ color: markColor }}>{mark}</span>
    </>
  );
}

// Eine Knoten-Pille (Zustand aus nodeState). JEDE Pille ist antippbar → wählt den Knoten (Tipp-zum-Erklären, #):
// die Detailzeile unter der Lane erklärt dann, was er bewirkt. Kauf passiert NICHT mehr per Direkt-Tipp, sondern
// über den Kaufen-Button in der Detailzeile (bewusster 2. Schritt, keine Fehlkäufe). Angetippt = Akzent-Ring.
// flex-1 → alle Pillen einer Lane sind gleich breit (saubere Spalten-Ausrichtung, kein Umbruch).
/* #kante: Die Pille ist eine Kanten-Karte (index.css .as-edge-card + .as-edge-thin, 3 px — 4 px wirken an
   einem so kleinen Element wie ein Balken). Die Kante trägt den ZUSTAND, nicht die Fraktion: innerhalb einer
   Lane gehören alle Knoten zur selben Fraktion, die Farbe würde dort nichts unterscheiden (dieselbe
   Überlegung wie bei den Skill-Karten). Also
     Gold             = hier kannst du TP ausgeben
     Fraktionsakzent  = gehört dir schon
     grau + gedimmt   = gesperrt
     gestrichelt      = Platzhalter
   Damit sieht man beim Öffnen sofort, wo es etwas zu holen gibt; vorher waren kaufbar, besessen und gesperrt
   drei gleich laute Rahmen, die man vergleichen musste. Angetippt = `is-sel` (Schein + volle Deckkraft). */
function NodePill({ node, st, accent, selected, onSelect }) {
  const isOwned = st === "owned", isBuy = st === "buy", isPlaceholder = st === "placeholder";
  const tooPoor = st === "lock-sp";        // freigeschaltet, aber die TP fehlen gerade
  const hasPrice = isBuy || tooPoor;
  const mark = isOwned ? "✓" : isPlaceholder ? t("upgrades.state.soon") : hasPrice ? `${node.cost} ${t("common.cur.sp")}` : "🔒";
  // Kante = Zustand. Gold trägt alles mit Preisschild; ob man ihn ZAHLEN kann, sagt die Deckkraft:
  // voll = jetzt kaufbar, gedimmt = kostet TP, die du nicht hast (dieselbe Sprache wie zu teure Packs).
  const edgeColor = isOwned ? accent : hasPrice ? GOLD : "#8a8a95";
  const stateCls = selected ? " is-sel" : isPlaceholder ? " is-soon" : (isOwned || isBuy) ? "" : " is-locked";
  const markColor = edgeColor;
  return (
    <span title={`${node.detail}`} onClick={() => onSelect(node.id)} role="button" aria-pressed={selected}
      className={`as-edge-card as-edge-thin${stateCls} flex-1 min-w-0 flex flex-col items-center justify-center text-center rounded-lg px-1.5 py-2 cursor-pointer transition-transform hover:-translate-y-px`}
      style={{ "--c": edgeColor }}>
      <PillBody label={node.label} mark={mark} titleColor={isOwned ? "#e8e8ea" : isBuy ? "#f0e8d0" : "#c8c8d0"} markColor={markColor} />
    </span>
  );
}

// Status-Klartext eines Knotens für die Detailzeile — erklärt bei gesperrten Knoten AUCH warum (Vorgänger/Gate/SP).
function nodeStatusText(node, st) {
  if (st === "owned") return t("upgrades.state.owned");
  if (st === "placeholder") return t("upgrades.state.soonFull");
  if (st === "lock-sp") return t("upgrades.state.lockSp", { cost: node.cost });
  if (st === "lock-prev") { const pr = nodeDef(node.prereq); return pr ? t("upgrades.state.after", { name: pr.label }) : t("upgrades.state.needPrereq"); }
  if (st === "lock-gate") return node.gate?.type === "anyLeg" ? t("upgrades.state.lockGate") : t("upgrades.state.locked");
  return t("upgrades.state.buyable");
}

/* Detailzeile (Tipp-zum-Erklären): erscheint unter der Lane des angetippten Knotens. Name + Wirkung
   (node.detail) + Status; kaufbare Knoten bekommen hier den Kaufen-Button.
   #kante: Die Zeile trägt die Farbe des ZUSTANDS — kaufbar also Gold wie der Knopf daneben, besessen den
   Fraktionsakzent. So gehören Kante, Statuszeile und Knopf sichtbar zusammen, statt drei Farben zu mischen.
   Der Kaufen-Knopf verliert seine gefüllte Goldfläche; als einziges Element der Zeile mit Glow bleibt er
   trotzdem das lauteste. */
function NodeDetail({ node, st, accent, onBuy }) {
  // Dieselbe Zuordnung wie an der Pille (NodePill): Gold für alles mit Preisschild — auch wenn die TP gerade
  // nicht reichen. Sonst trüge die Zeile Grau, während der angetippte Knoten darüber Gold zeigt.
  const stateColor = st === "owned" ? accent : (st === "buy" || st === "lock-sp") ? GOLD : "#8a8a95";
  return (
    <div className="as-edge-card is-sel mt-2 rounded-lg px-3 py-2.5 flex items-center gap-3" style={{ "--c": stateColor }}>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-extrabold" style={{ color: accent }}>{node.label}</div>
        <div className="text-[11.5px] leading-snug opacity-75 mt-0.5">{node.detail}</div>
        <div className="text-[10.5px] font-semibold mt-1" style={{ color: stateColor }}>{nodeStatusText(node, st)}</div>
      </div>
      {st === "buy" && (
        <button onClick={() => onBuy(node.id)}
          className="as-edge-strong shrink-0 px-3 py-2 rounded-lg text-[12px] font-extrabold transition-transform hover:-translate-y-0.5"
          style={{ "--c": GOLD }}>{t("upgrades.buy", { cost: node.cost })}</button>
      )}
    </div>
  );
}

// Ein Lane-Fluss: gleich breite Pillen (flex-1) mit „›"-Verbindung, EINE Reihe (kein Umbruch → ausgerichtet).
// Ist ein Knoten dieser Lane angetippt (selected), klappt darunter seine Detailzeile auf.
function Lane({ nodes, p, laneAccent, onBuy, lead = null, selected, onSelect }) {
  const items = [];
  // #kante: Das Startglied einer Lane ist immer freigeschaltet → dieselbe Optik wie eine besessene Pille.
  if (lead) items.push(<span key="lead" className="as-edge-card as-edge-thin flex-1 min-w-0 flex flex-col items-center justify-center text-center rounded-lg px-1.5 py-2" style={{ "--c": lead.color }}>
    <PillBody label={lead.label} mark={`✓ ${t("upgrades.free")}`} titleColor="#e8e8ea" markColor={lead.color} />
  </span>);
  nodes.forEach((n) => {
    if (items.length) items.push(<span key={`sep${n.id}`} className="flex-none self-center text-[12px]" style={{ color: "#4a4a55" }}>›</span>);
    items.push(<NodePill key={n.id} node={n} st={nodeState(p, n.id)} accent={nodeAccent(n, laneAccent)} selected={selected === n.id} onSelect={onSelect} />);
  });
  const selNode = nodes.find((n) => n.id === selected);
  return (
    <div>
      <div className="flex items-stretch gap-1">{items}</div>
      {selNode && <NodeDetail node={selNode} st={nodeState(p, selNode.id)} accent={nodeAccent(selNode, laneAccent)} onBuy={onBuy} />}
    </div>
  );
}

export function UpgradeScreen({ onClose, profile, onProfileChange }) {
  const [tab, setTab] = useState("deck");
  const [detailArch, setDetailArch] = useState(null);
  const [selNode, setSelNode] = useState(null); // Tipp-zum-Erklären: aktuell aufgeklappter Knoten (id) oder null
  const toggleNode = (id) => setSelNode((cur) => (cur === id ? null : id)); // nochmal antippen = zuklappen
  // Reiter-Wechsel schließt die offene Detailzeile (sonst hinge sie im anderen Reiter nach).
  const selectTab = (key) => { setTab(key); setSelNode(null); };
  const tabSwipe = useTabSwipe(["deck", "gen"], tab, selectTab); // horizontaler Swipe → Reiterwechsel
  useEscape(selNode ? () => setSelNode(null) : detailArch ? () => setDetailArch(null) : onClose);
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
    <div className="fixed inset-0 overlay-root up-root z-40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-xl min-[1400px]:max-w-none rounded-2xl px-5 pb-6 sm:px-6 overlay-card as-panel up-card relative"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()} {...tabSwipe}>

        {/* Sticky-Kopf: Titel + SP-Guthaben + Respec + Schließen + Reiter. */}
        <div className="sticky top-0 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 relative up-head" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          {/* Zweizeilig: Titel voll ausgeschrieben oben, darunter SP-Guthaben links · Respec + Schließen rechts.
              (Einzeilig lief „Schließen" auf schmalen Screens aus dem Rahmen; Titel kürzen war keine Option.) */}
          <h2 className="text-lg min-[1400px]:text-2xl font-bold">{t("upgrades.title")}</h2>
          <div className="up-headrow flex items-center justify-between gap-2.5 mt-2.5">
            <span className="flex items-baseline gap-1 shrink-0">
              <span className="text-xl min-[1400px]:text-3xl font-extrabold tabular-nums" style={{ color: AM, textShadow: "0 0 12px rgba(242,168,58,.4)" }}>{sp}</span>
              <span className="text-[10px] min-[1400px]:text-[13px] font-bold tracking-wider" style={{ color: AM, opacity: .8 }}>{t("common.cur.sp")}</span>
            </span>
            <div className="up-actions flex items-center gap-2.5 shrink-0">
              {/* #kante: neutraler Kanten-Knopf mit schmaler Kante (kleines Element) — Respec ist ein Ausweg,
                  kein Angebot, und trägt darum kein Farbsignal. */}
              <button onClick={doRespec} disabled={owned === 0}
                className="as-edge-neutral as-edge-thin shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40">{t("upgrades.respec")}</button>
              <ActionButton kind="secondary" className="shrink-0" onClick={onClose}>{t("common.close")}</ActionButton>
            </div>
          </div>
          {/* Reiter Decks / Allgemein. Ab 1400 px stehen beide Zweige nebeneinander (s. .up-branches in
              index.css) — dann hat die Reiterzeile nichts mehr zu schalten und wird ausgeblendet. */}
          <div className="flex gap-1.5 mt-3 up-tabs">
            {[{ key: "deck", labelKey: "upgrades.tab.decks" }, { key: "gen", labelKey: "upgrades.tab.gen" }].map((tb) => {
              const on = tb.key === tab, col = tb.key === "deck" ? VI : CY;
              return (
                /* #kante: Signal an der Unterkante — wie in der Werkstatt. Bei einer waagerechten Reiterzeile
                   wären senkrechte Striche ein Kampf gegen die Leserichtung. */
                <button key={tb.key} onClick={() => selectTab(tb.key)} role="tab" aria-selected={on}
                  className="flex-1 text-[13px] font-semibold tracking-wide px-3 pt-2 pb-1.5 rounded-t-md transition-colors"
                  style={on
                    ? { color: "#fff", borderBottom: `2px solid ${col}`,
                        background: `linear-gradient(180deg, transparent 45%, color-mix(in srgb, ${col} 14%, transparent))` }
                    : { color: "#8a8a95", borderBottom: "2px solid transparent", background: "transparent" }}>
                  {t(tb.labelKey)}
                </button>
              );
            })}
          </div>
          <div className="up-hair h-[2px] w-full rounded-full mt-2.5" style={{ background: `linear-gradient(90deg, ${VI}, ${CY}, ${AM})`, opacity: .7 }} />
          {/* Knotenzähler + Tipp-Hinweis. Der Wrapper existiert für Desktop: dort rücken beide als EINE
              Einheit neben das Guthaben in die Kopfzeile (s. .up-readout in index.css), statt zwei volle
              Bänder unter der Haarlinie zu belegen. Unterhalb von 1400 px ist er eine reine Klammer ohne
              eigene Darstellung — die Abstände sitzen wie bisher an den beiden Zeilen selbst. */}
          <div className="up-readout">
            <div className="text-[11px] mt-1.5 tabular-nums" style={{ color: "#a6a6b0" }}>
              <b className="text-[#e8e8ea]">{owned}</b>{t("upgrades.nodes", { total: TOTAL_NODES })} {treeComplete(p) ? <b style={{ color: AM }}>{t("upgrades.ranked.free")}</b> : t("upgrades.ranked.at", { total: TOTAL_NODES })}
            </div>
            <div className="text-[10.5px] mt-0.5" style={{ color: "#71717c" }}>{t("upgrades.tapHint")}</div>
          </div>
        </div>

        {/* ===== Die beiden Zweige =====
            Beide sind IMMER im DOM; welcher zu sehen ist, entscheidet CSS (.up-branch.is-off → display:none).
            Bis 1399 px ist das exakt das alte Verhalten — genau ein Zweig sichtbar, umgeschaltet über die
            Reiter. Ab 1400 px stehen beide nebeneinander und `is-off` wird wirkungslos; nur so lassen sich
            die zwei Zweige ohne zweiten Renderpfad gleichzeitig zeigen. Die Umschaltung im JSX (`tab === …`)
            hätte das nicht gekonnt: ein nicht gerendeter Zweig ist auch auf Desktop nicht da. */}
        <div className="up-branches">
        <div className={`up-branch as-ring${tab === "deck" ? "" : " is-off"}`}>
          <h3 className="up-branch-h" style={{ color: VI }}>{t("upgrades.tab.decks")}</h3>
          <div className="mt-4 grid gap-2.5">
            {ARCHETYPE_ORDER.map((arch) => {
              const meta = archMeta(arch);
              const accent = FACTION_GLOW[arch] || VI;
              const chain = nodeList().filter((n) => n.arch === arch); // ice/plant: Deck-Knoten + Legs; fire/lightning: nur Legs
              const hasDeckNode = chain.some((n) => n.deckUnlock);
              const lead = hasDeckNode ? null : { label: "Deck", color: accent }; // Feuer/Blitz: Deck von Beginn an frei
              return (
                <div key={arch} className="rounded-2xl p-3" style={panelStyle(accent)}>
                  <button onClick={() => setDetailArch(arch)}
                    className="flex items-center gap-2 w-full text-left mb-2.5 group" title={`${meta?.label}: Details`}>
                    <FactionIcon type={arch} size={20} />
                    <span className="text-[14px] min-[1400px]:text-[17px] font-extrabold" style={{ color: accent }}>{meta?.label || arch}</span>
                    <span className="ml-auto text-[10.5px] min-[1400px]:text-[13px] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform" style={{ color: "#a6a6b0" }}>{t("upgrades.details")}</span>
                  </button>
                  <Lane nodes={chain} p={p} laneAccent={accent} onBuy={buy} lead={lead} selected={selNode} onSelect={toggleNode} />
                </div>
              );
            })}
            {/* Extras: Deck-Reroll + Platzhalter. */}
            <div className="rounded-2xl p-3" style={panelStyle(GOLD)}>
              <div className="text-[10px] tracking-[0.22em] uppercase font-bold mb-2.5" style={{ color: "#b9b3cf" }}>{t("upgrades.legPhase")}</div>
              <Lane nodes={[nodeDef("deckReroll"), nodeDef("synLeg")]} p={p} laneAccent={VI} onBuy={buy} selected={selNode} onSelect={toggleNode} />
            </div>
          </div>
        </div>

        <div className={`up-branch as-ring${tab === "gen" ? "" : " is-off"}`}>
          <h3 className="up-branch-h" style={{ color: CY }}>{t("upgrades.tab.gen")}</h3>
          <div className="mt-4 grid gap-2.5">
            {GEN_LANES.map((lane) => (
              <div key={lane.nameKey} className="rounded-2xl p-3" style={panelStyle(lane.accent)}>
                <div className="flex items-baseline gap-2 mb-2.5">
                  <span className="text-[13px] min-[1400px]:text-[16px] font-extrabold" style={{ color: lane.accent }}>{t(lane.nameKey)}</span>
                  {lane.noteKey && <span className="text-[9.5px] min-[1400px]:text-[12px] italic" style={{ color: "#71717c" }}>{t(lane.noteKey)}</span>}
                </div>
                <Lane nodes={lane.ids.map((id) => nodeDef(id))} p={p} laneAccent={lane.accent} onBuy={buy} selected={selNode} onSelect={toggleNode} />
              </div>
            ))}
          </div>
        </div>
        </div>

        {/* Legende. */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-5 text-[11px] up-legend" style={{ color: "#a6a6b0" }}>
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: VI }} /> {t("upgrades.owned")}</span>
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "transparent", border: `1px solid ${GOLD}`, boxShadow: `0 0 6px ${GOLD}88` }} /> {t("upgrades.buyable")}</span>
          <span>{t("upgrades.locked")} <span style={{ opacity: .7 }}>{t("upgrades.soon")}</span></span>
        </div>
      </div>
    </div>
  );
}
