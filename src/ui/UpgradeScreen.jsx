import { useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { useEscape } from "./useEscape.js";
import { useIsWide } from "./useIsWide.js"; // #desktop: Deck-Spalte statt Reiterzeile
import { useTabSwipe } from "./useSwipeTabs.js"; // Reiterwechsel per Swipe (nur Funktion, keine Optik)
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, ActionButton } from "./modalStyle.jsx";
import { FactionIcon, FACTION_GLOW } from "./FactionIcon.jsx";
import { ARCHETYPE_ORDER, SKILL_LIST } from "../game/skills.js";
import { tierColor, tierWeightsForShift } from "../game/rarity.js";
// #desktop: Skill-Liste + Challenge-Deck stehen jetzt direkt auf der Fraktionsseite (statt zwei Ebenen tief).
import { PACKS as PACKS_ALL, packCond, packState, packUnlock } from "../game/themes.js";
import { deckAssets } from "./cosmeticAssets.js";
import { unlockLabel } from "../i18n/unlockText.js";
import { guideDef } from "../i18n/guideText.js"; // Einzeiler der Fraktion über der Skill-Liste
import { rarityLabel, skillDef, themeDef } from "../i18n/labels.js"; // #sprache: Namen zur Anzeigezeit
import { DeckDetail } from "./DeckDetail.jsx";
import { GuideOverlay } from "./GuideOverlay.jsx"; // #desktop: der Leitfaden ist ab 1280 px ein eigener gerahmter Screen
import {
  // #sprache: NODES ist durch nodeList() (labels.js) ersetzt — die Knotentexte werden zur Anzeigezeit aufgelöst.
  TOTAL_NODES, COVER_FLOOR, ENERGY_FLOOR, REROLL_BASE, nodeEffects,
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
const GRUEN = "#54e08a";  // gekauft (Häkchen in der Desktop-Deckspalte) — derselbe Ton wie „aktiv" im Shop

/* #deckui (mobil): Die GENERISCHE UI-Chrome (Reiter, Zweig-Überschriften, Haarlinie, Allgemein-Lanes, „gekauft"-
   Punkt) zieht jetzt die aktive DECKFARBE statt des festen Violett/Cyan. `--deck-a1/--deck-a2` hängen an `.app-root`
   (App.jsx) und sind auch außerhalb eines Laufs gesetzt → die Vars kaskadieren in diesen Screen. Der Fallback ist
   exakt der alte Ton (VI/CY), falls kein Deck aktiv ist. BEWUSST NICHT deck-getönt: Fraktionsfarben (Deck-Identität),
   Raritäts-Töne (tierColor) und Gold (kaufbar/SP) — die tragen Spielbedeutung, kein reines Chrome. */
const UI1 = "var(--deck-a1, #9b82f0)"; // war VI — „Decks"-Reiter, Rarität-Lane-Chrome, gekauft-Punkt
const UI2 = "var(--deck-a2, #26c6e6)"; // war CY — „Allgemein"-Reiter/-Lanes
// Mobile-Lane-Akzent auf Deckfarbe mappen (Struktur, kein Spiel-Signal). Desktop-VLane bleibt bei lane.accent.
const genAccentMobile = (a) => (a === CY ? UI2 : UI1);

// Pack-Name zur Anzeigezeit. Gleiche Auflösung wie in der Werkstatt (dort ebenfalls lokal, kein Export).
const packLabel = (pk) => (pk ? (themeDef(pk.id)?.name ?? pk.name) : "");

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
      {/* #desktop: eine Stufe größer ab 1280 px — 11 px stammen aus dem Handy-Entwurf und sind auf 1080p
          zu klein. Größer geht nicht: 27 Knoten müssen gleichzeitig ins Bild passen. */}
      <span className="text-meta-3 dt:text-body-lg-1 font-semibold leading-tight" style={{ color: titleColor }}>{label}</span>
      <span className="text-micro-4 dt:text-body-1 ty-num leading-tight mt-1" style={{ color: markColor }}>{mark}</span>
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
        <div className="text-body-2 font-extrabold" style={{ color: accent }}>{node.label}</div>
        <div className="text-meta-4 leading-snug opacity-75 mt-0.5">{node.detail}</div>
        <div className="text-meta-2 font-semibold mt-1" style={{ color: stateColor }}>{nodeStatusText(node, st)}</div>
      </div>
      {st === "buy" && (
        <button onClick={() => onBuy(node.id)}
          className="as-edge-strong shrink-0 px-3 py-2 rounded-lg text-body-1 font-extrabold transition-transform hover:-translate-y-0.5"
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
    if (items.length) items.push(<span key={`sep${n.id}`} className="flex-none self-center text-body-1" style={{ color: "#4a4a55" }}>›</span>);
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

/* ============================================================================
   #desktop — die senkrechte Fassung (ab 1280 px)
   ----------------------------------------------------------------------------
   Statt sechs waagerechter Ketten untereinander stehen die Kategorien als Spalten nebeneinander,
   die Knoten laufen darin von oben nach unten. Zwei Unterschiede zur Handy-Fassung, die nicht nur
   Anordnung sind und deshalb eigene Komponenten bekommen:

     · Jeder Knoten trägt seine Wirkung direkt (`node.detail`). Auf dem Handy ist dafür kein Platz,
       dort klappt sie beim Antippen auf. Bei den Drop-Raten steht viermal derselbe Satz im Register —
       da zeigt die Desktop-Fassung stattdessen die echte Verteilung aus `tierWeightsForShift`.
     · Die Kette ist senkrecht, der Pfeil zeigt nach unten.

   Die Handy-Komponenten (Lane/NodePill) bleiben unangetastet.
   ============================================================================ */

// Bei Drop-Raten sagt `detail` bei allen vier Stufen dasselbe — die Verteilung ist die eigentliche
// Auskunft. Sonst der Registertext.
function wirkungOf(node) {
  if (!node.shift) return node.detail;
  const w = tierWeightsForShift(node.shift);
  return [1, 2, 3, 4].map((t) => w[t]).join(" · ");
}

function VNode({ node, st, accent, selected, onSelect }) {
  const isOwned = st === "owned", isBuy = st === "buy", isPlaceholder = st === "placeholder";
  const mark = isOwned ? t("upgrades.state.owned") : isPlaceholder ? t("upgrades.state.soon")
    : (isBuy || st === "lock-sp") ? t("upgrades.buy.short", { cost: node.cost }) : `🔒 ${node.cost}`;
  /* `is-buy` trennt „kann ich mir leisten" von „gehört mir schon": Gekaufte behalten den Farbanlauf
     der Kanten-Karte, Kaufbare bekommen nur die goldene Kante auf flachem Grund. Vorher trugen beide
     denselben Anlauf und waren im Raster kaum auseinanderzuhalten. */
  const cls = isPlaceholder ? " is-soon" : isOwned ? "" : isBuy ? " is-buy" : " is-locked";
  return (
    <button type="button" onClick={() => onSelect(node.id)} aria-pressed={selected} title={node.detail}
      className={`up-vnode as-edge-card as-edge-thin${cls}${selected ? " is-sel" : ""}`}
      style={{ "--c": isOwned ? accent : isBuy ? GOLD : "#8a8a95" }}>
      <span className="up-vnode-t">{node.label}</span>
      <span className="up-vnode-w">{wirkungOf(node)}</span>
      <span className="up-vnode-m" style={{ color: isOwned ? accent : isBuy ? GOLD : "#8a8a95" }}>{mark}</span>
    </button>
  );
}

// Eine Kategorie als Spalte: Überschrift, darunter die Knoten mit Pfeilen. Nur die Allgemein-Seite
// nutzt das — die Fraktionsketten laufen quer (s. `.up-chain-row`), drei Knoten sind keine Säule.
function VLane({ title, accent, nodes, p, selected, onSelect }) {
  return (
    <div className="up-vlane">
      <div className="up-vlane-h" style={{ color: accent, borderBottomColor: `${accent}55` }}>{title}</div>
      <div className="up-vchain">
        {nodes.map((n, i) => (
          <div key={n.id} className="contents">
            {i > 0 && <span className="up-varrow" aria-hidden="true">↓</span>}
            <VNode node={n} st={nodeState(p, n.id)} accent={nodeAccent(n, accent)}
              selected={selected === n.id} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* Die Skill-Liste einer Fraktion. Name, Schlagworte und Wirkung stehen alle in skills.js — bisher
   nur zwei Ebenen tief hinter „Details ›". Die Beschreibung wird auf drei Zeilen geklemmt: der Median
   liegt bei 177 Zeichen, die längste hat 628, und im Raster bestimmt die höchste Zelle die ganze
   Zeilenhöhe. Ungeklemmt reißt ein einziger Skill die Reihe auseinander. */
function SkillGrid({ arch }) {
  const alle = SKILL_LIST.filter((s) => s.archetype === arch);
  const normal = alle.filter((s) => !s.legendary);
  const leg = alle.filter((s) => s.legendary);
  const accent = FACTION_GLOW[arch] || VI;
  const karte = (s, gold) => {
    const d = skillDef(s.id);
    return (
      <div key={s.id} className={`up-skill${gold ? " is-leg" : ""}`} style={{ "--c": gold ? GOLD : accent }}>
        <span className="up-skill-n">{d?.name || s.name}</span>
        <span className="up-skill-d">{d?.desc || s.desc}</span>
      </div>
    );
  };
  return (
    <div className="up-skills">
      <div className="up-skills-h">{t("upgrades.skills.title")}<span>{alle.length}</span></div>
      <div className="up-skillgrid">{normal.map((s) => karte(s, false))}</div>
      <div className="up-skills-h is-leg">{t("upgrades.skills.legendary")}<span>{leg.length}</span></div>
      {/* #up-form: eigene Reihe statt Spaltenfluss — die Spaltenzahl kommt aus der ANZAHL, nicht aus der
          Breite (`auto-fill` legte leere Spuren an, `auto-fit` klappte auf eine zusammen; s. #rahmen-huelle). */}
      <div className="up-skillgrid is-leg" style={{ "--leg-cols": Math.max(1, leg.length) }}>{leg.map((s) => karte(s, true))}</div>
    </div>
  );
}

/* Das Challenge-Deck der Fraktion: die Element-Decks aus themes.js (freigeschaltet über N Mono-Läufe).
   Zeigt Kartenrücken, Bedingung und Fortschritt — dieselben Daten wie der Challenges-Reiter der
   Detailansicht, hier nur ohne den Umweg dorthin. */
function ChallengeBox({ arch, p }) {
  const pack = PACKS_ALL.find((pk) => packCond(pk)?.archetype === arch);
  if (!pack) return null;
  const st = packState(p, pack);
  const fort = packUnlock(p, pack);
  const accent = FACTION_GLOW[arch] || VI;
  const pct = fort && fort.target ? Math.min(100, Math.round((fort.cur / fort.target) * 100)) : (st === "own" ? 100 : 0);
  const bild = deckAssets(pack.deckId)?.back;
  return (
    <aside className="up-chall">
      <div className="up-chall-h">{t("deckdetail.tab.challenges")}</div>
      {bild && <div className="up-chall-img"><img src={bild} alt="" style={st === "own" ? undefined : { filter: "grayscale(.6) brightness(.6)" }} /></div>}
      <div className="up-chall-n" style={{ color: accent }}>{packLabel(pack)}</div>
      <div className="up-chall-b">{unlockLabel(fort)}</div>
      <div className="up-chall-bar"><i style={{ width: `${pct}%`, background: accent }} /></div>
      {fort && fort.target ? <div className="up-chall-f">{fort.cur} / {fort.target}</div> : null}
    </aside>
  );
}

/* Der Auswirkungs-Kasten: was der Baum GERADE bewirkt. Die Zahlen kommen aus `nodeEffects` und den
   Basiswerten — nichts davon ist im Baum selbst ablesbar, obwohl es die Frage ist, die man dort stellt. */
function ImpactBox({ p }) {
  /* #up-still: Der Wechsel Balken↔Wort gilt NUR ab 1280 px. Am Handy steht der Kasten unter einem
     gestapelten Baum und ist die einzige Zusammenfassung weit und breit — dort bleibt der Balken auch
     im Vollausbau stehen, weil er die Reihe der vier Kacheln optisch zusammenhält. Auf dem Desktop
     stehen sie nebeneinander und tragen sich selbst. */
  const wide = useIsWide();
  const fx = nodeEffects(p);
  const werte = [
    { k: t("upgrades.impact.cover"), v: COVER_FLOOR + fx.treeCoverBonus, max: COVER_FLOOR + 4, c: CY },
    { k: t("upgrades.impact.energy"), v: ENERGY_FLOOR + fx.treeEnergyBonus, max: ENERGY_FLOOR + 2, c: CY },
    { k: t("upgrades.impact.rerolls"), v: REROLL_BASE + fx.treeRerollBonus, max: REROLL_BASE + 2, c: CY },
    /* Die Legendär-Phasen haben ihre eigenen Rerolls und zählen NICHT zum Angebots-Reroll oben:
       einer in der Archetyp-Phase (`deckReroll`), einer in der generellen (`perk2Reroll`). Beide
       hängen an eigenen Knoten, deshalb hier als eigene Achse statt in die Zeile darüber gerechnet. */
    { k: t("upgrades.impact.legRerolls"), v: fx.rerollDeckLeg + fx.rerollPerk2, max: 2, c: VI },
  ];
  /* WICHTIG: `maxTier` mitgeben. Ohne das zeigte der Balken Rar und Episch an, bevor die
     Rarität-Knoten sie überhaupt freigeschaltet haben — Prozente für Stufen, die im Lauf gar nicht
     fallen können. `tierWeightsForShift` nullt gesperrte Stufen, und weil die Gewichte dann nicht
     mehr auf 100 summieren (bei maxTier 2 nur noch 85), wird hier normalisiert: gezeigt wird die
     tatsächliche Wahrscheinlichkeit, nicht das rohe Gewicht. */
  const alsProzent = (w) => {
    const summe = [1, 2, 3, 4].reduce((s, tier) => s + w[tier], 0) || 1;
    return [1, 2, 3, 4].map((tier) => ({ tier, pct: Math.round((w[tier] / summe) * 100) })).filter((x) => x.pct > 0);
  };
  const jetzt = alsProzent(tierWeightsForShift(fx.treeRareShift, fx.maxTier));
  /* Der zweite Balken „im Vollausbau" ist entfallen. Er zeigte einen FESTEN Zielzustand
     (tierWeightsForShift(4, 4)) und war damit bei vollem Baum eine wortgleiche Kopie des Balkens
     daneben — zweimal dasselbe Bild nebeneinander, genau dort, wo man den Fortschritt abliest.
     Was er beantworten sollte („wie weit ist noch hin?"), beantworten die vier Zähler darüber
     bereits als `x von max`. */
  const balken = (liste) => (
    <>
      <div className="up-dropbar">
        {liste.map(({ tier, pct }) => <i key={tier} style={{ width: `${pct}%`, background: tierColor(tier) }} />)}
      </div>
      <div className="up-droplegend">
        {liste.map(({ tier, pct }) => (
          <span key={tier}><i style={{ background: tierColor(tier) }} />{rarityLabel(tier)} <b>{pct} %</b></span>
        ))}
      </div>
    </>
  );
  return (
    <div className="up-impact">
      <div className="up-impact-h">{t("upgrades.impact.title")}</div>
      <div className="up-impact-grid">
        {/* #up-still: Balken ODER Wort, nie beides. Ist die Achse voll, sagt ein 100-%-Balken nichts mehr —
            das Wort sagt es kürzer und ruhiger. Ist sie es nicht, zeigt der Balken auf einen Blick, wie weit
            noch fehlt, was die Zahl allein nicht leistet. So trägt jede Kachel EIN Element unter der Zahl
            statt zweier, und der Kasten wird ruhiger, ohne dass Information verloren geht. */}
        {werte.map((x) => (
          <div key={x.k} className="up-stat">
            <span className="up-stat-k">{x.k}</span>
            <span className="up-stat-v" style={{ color: x.c }}>{x.v}<i>{t("upgrades.impact.of", { max: x.max })}</i></span>
            {wide && x.v >= x.max
              ? <span className="up-stat-max">{t("upgrades.impact.maxed")}</span>
              : <span className="up-stat-b"><i style={{ width: `${Math.round((x.v / x.max) * 100)}%`, background: x.c }} /></span>}
          </div>
        ))}
      </div>
      <div className="up-dropbox up-dropnow"><span className="up-drop-t">{t("upgrades.impact.dropNow")}</span>{balken(jetzt)}</div>
    </div>
  );
}

/* Die Zeichenerklärung. Sie steht ZWEIMAL im DOM und ist trotzdem EINE Quelle — sichtbar ist immer
   genau eine (dieselbe Technik wie beim Glossar-Knopf im Startbildschirm, Begründung dort).
   Grund: Auf dem Handy hängt sie unter dem Stapel, ab 1280 px gehört sie INS Panel (unter den
   Auswirkungs-Kasten, über die Panelkante) — und die beiden Plätze liegen in verschiedenen
   Containern. Verschieben ließe sich das nur im DOM, und das zöge die Handy-Fassung mit.
   `where` schaltet, welche Instanz die jeweilige Breite zeigt (Regeln in index.css). */
function Legend({ where }) {
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-2 justify-center mt-5 text-meta-3 up-legend up-legend-${where}`}
      style={{ color: "#a6a6b0" }}>
      <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: UI1 }} /> {t("upgrades.owned")}</span>
      <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "transparent", border: `1px solid ${GOLD}`, boxShadow: `0 0 6px ${GOLD}88` }} /> {t("upgrades.buyable")}</span>
      <span>{t("upgrades.locked")} <span style={{ opacity: .7 }}>{t("upgrades.soon")}</span></span>
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
  /* #desktop — ab 1280 px navigiert nicht mehr die Reiterzeile, sondern eine Spalte links: „Allgemein"
     plus die vier Fraktionen, jede mit eigener Seite. Das ist kein Umsortieren derselben Bausteine,
     sondern eine andere Navigation — deshalb JS-State statt Media Query. Unter 1280 px bleibt alles
     beim Alten (zwei Reiter, Fraktions-Ketten untereinander, Deck-Details als Ebene 2). */
  const wide = useIsWide();
  const [page, setPage] = useState("gen");   // "gen" | Fraktions-Key
  /* #desktop: Der Leitfaden-Knopf der Fraktionsseite öffnet den GERAHMTEN Leitfaden-Screen, nicht mehr
     die Deck-Detailansicht. Vorher landete man auf deren Reiter „Leitfaden" — derselbe Inhalt, aber im
     schmalen Modal, während der eigentliche Leitfaden-Screen nur aus der Skill-Auswahl im Lauf und vom
     Endscreen erreichbar war. Der Handy-Pfad behält seinen Details-Knopf in die Detailansicht. */
  const [guideArch, setGuideArch] = useState(null);
  /* Reihenfolge = Tiefe: Escape schließt immer nur die OBERSTE Ebene. Der Leitfaden bringt seinen
     eigenen Escape-Handler mit; ohne diesen Zweig würde derselbe Tastendruck zusätzlich den Baum
     schließen (beide Handler hängen am selben window-Listener). */
  useEscape(guideArch ? () => setGuideArch(null) : selNode ? () => setSelNode(null) : detailArch ? () => setDetailArch(null) : onClose);
  const p = profile || emptyProfile();
  const sp = Math.max(0, Math.floor(Number(p.stichPoints) || 0));
  const owned = ownedCount(p);

  const buy = (id) => onProfileChange && onProfileChange(buyNode(p, id));
  const doRespec = () => onProfileChange && onProfileChange(respec(p));
  // #desktop: Zähler für die „Allgemein"-Zeile der Deck-Spalte + der angetippte Knoten für die Detailzeile.
  const genOwned = GEN_LANES.reduce((s, l) => s + l.ids.filter((id) => nodeState(p, id) === "owned").length, 0);
  const selDeskNode = selNode ? nodeDef(selNode) : null;
  // Die Kette der gerade gewählten Fraktion (leer auf der Allgemein-Seite).
  const deckChain = page === "gen" ? [] : nodeList().filter((n) => n.arch === page);

  // Deck-Detailansicht (Ebene 2) — überlagert den Baum, Zurück kehrt in den Decks-Reiter zurück.
  if (detailArch) {
    /* Der Zustand trägt seit dem Desktop-Umbau ein Objekt: die Fraktionsseite hat zwei Einstiege
       („Leitfaden" und „Details"), die im selben Screen auf verschiedenen Reitern landen sollen.
       Der Handy-Pfad ruft weiter mit einem blanken Archetyp-String — deshalb beides annehmen. */
    const d = typeof detailArch === "string" ? { arch: detailArch } : detailArch;
    return <DeckDetail archetype={d.arch} initialTab={d.tab || "passives"} profile={p}
      onBack={() => setDetailArch(null)} onClose={onClose} />;
  }

  return overlayPortal((
   <>
    <div className="fixed inset-0 overlay-root up-root z-40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-xl dt:max-w-none rounded-2xl px-5 pb-6 sm:px-6 overlay-card as-panel as-panel-deck up-card relative"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()} {...tabSwipe}>

        {/* Sticky-Kopf: Titel + SP-Guthaben + Respec + Schließen + Reiter. */}
        <div className="sticky top-0 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 relative up-head" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          {/* Zweizeilig: Titel voll ausgeschrieben oben, darunter SP-Guthaben links · Respec + Schließen rechts.
              (Einzeilig lief „Schließen" auf schmalen Screens aus dem Rahmen; Titel kürzen war keine Option.) */}
          <h2 className="text-title-5 dt:text-head-3 font-bold">{t("upgrades.title")}</h2>
          <div className="up-headrow flex items-center justify-between gap-2.5 mt-2.5">
            <span className="flex items-baseline gap-1 shrink-0">
              <span className="text-title-6 dt:text-display-1 font-extrabold tabular-nums" style={{ color: AM, textShadow: "0 0 12px rgba(242,168,58,.4)" }}>{sp}</span>
              <span className="text-meta-1 dt:text-body-3 font-bold tracking-wider" style={{ color: AM, opacity: .8 }}>{t("common.cur.sp")}</span>
            </span>
            <div className="up-actions flex items-center gap-2.5 shrink-0">
              {/* #kante: neutraler Kanten-Knopf mit schmaler Kante (kleines Element) — Respec ist ein Ausweg,
                  kein Angebot, und trägt darum kein Farbsignal. */}
              <button onClick={doRespec} disabled={owned === 0}
                className="as-edge-neutral as-edge-thin shrink-0 px-2.5 py-1.5 rounded-lg text-body-5 font-semibold transition-opacity disabled:opacity-40">{t("upgrades.respec")}</button>
              <ActionButton kind="secondary" className="shrink-0" onClick={onClose}>{t("common.close")}</ActionButton>
            </div>
          </div>
          {/* Reiter Decks / Allgemein. Ab 1280 px stehen beide Zweige nebeneinander (s. .up-branches in
              index.css) — dann hat die Reiterzeile nichts mehr zu schalten und wird ausgeblendet. */}
          <div className="flex gap-1.5 mt-3 up-tabs">
            {[{ key: "deck", labelKey: "upgrades.tab.decks" }, { key: "gen", labelKey: "upgrades.tab.gen" }].map((tb) => {
              const on = tb.key === tab, col = tb.key === "deck" ? UI1 : UI2;
              return (
                /* #kante: Signal an der Unterkante — wie in der Werkstatt. Bei einer waagerechten Reiterzeile
                   wären senkrechte Striche ein Kampf gegen die Leserichtung. */
                <button key={tb.key} onClick={() => selectTab(tb.key)} role="tab" aria-selected={on}
                  className="flex-1 text-body-3 font-semibold tracking-wide px-3 pt-2 pb-1.5 rounded-t-md transition-colors"
                  style={on
                    ? { color: "#fff", borderBottom: `2px solid ${col}`,
                        background: `linear-gradient(180deg, transparent 45%, color-mix(in srgb, ${col} 14%, transparent))` }
                    : { color: "#8a8a95", borderBottom: "2px solid transparent", background: "transparent" }}>
                  {t(tb.labelKey)}
                </button>
              );
            })}
          </div>
          <div className="up-hair h-[2px] w-full rounded-full mt-2.5" style={{ background: `linear-gradient(90deg, ${UI1}, ${UI2}, ${UI1})`, opacity: .7 }} />
          {/* Knotenzähler + Tipp-Hinweis. Der Wrapper existiert für Desktop: dort rücken beide als EINE
              Einheit neben das Guthaben in die Kopfzeile (s. .up-readout in index.css), statt zwei volle
              Bänder unter der Haarlinie zu belegen. Unterhalb von 1280 px ist er eine reine Klammer ohne
              eigene Darstellung — die Abstände sitzen wie bisher an den beiden Zeilen selbst. */}
          <div className="up-readout">
            <div className="text-meta-3 mt-1.5 tabular-nums" style={{ color: "#a6a6b0" }}>
              <b className="text-[#e8e8ea]">{owned}</b>{t("upgrades.nodes", { total: TOTAL_NODES })} {treeComplete(p) ? <b style={{ color: AM }}>{t("upgrades.ranked.free")}</b> : t("upgrades.ranked.at", { total: TOTAL_NODES })}
            </div>
            <div className="text-meta-2 mt-0.5" style={{ color: "#71717c" }}>{t("upgrades.tapHint")}</div>
          </div>
        </div>

        {/* ===== Desktop: Deck-Spalte links, eine Seite rechts =====
            Bewusst ein EIGENER Renderpfad statt der `display: contents`-Klammer, die der Rest des
            Desktop-Passes benutzt: Hier wird nicht dasselbe anders angeordnet, sondern anders navigiert
            (Spalte statt Reiter, eine Seite statt zweier Zweige). Das in eine gemeinsame DOM-Struktur zu
            zwingen hätte beide Fassungen verbogen. Unter 1280 px läuft weiter der Zweig-Pfad darunter. */}
        {wide ? (
          <div className="up-desk">
            <nav className="up-nav as-ring as-ring-quiet" aria-label={t("upgrades.nav.decks")}>
              <i className="as-ring-run" aria-hidden="true" />
              <button type="button" onClick={() => { setPage("gen"); setSelNode(null); }}
                className={`up-navrow${page === "gen" ? " is-on" : ""}`} style={{ "--c": CY }}>
                <span className="up-navtext"><b>{t("upgrades.page.general")}</b><i>{genOwned} / {GEN_LANES.reduce((s, l) => s + l.ids.length, 0)}</i></span>
              </button>
              <div className="up-navhead">{t("upgrades.nav.decks")}</div>
              {ARCHETYPE_ORDER.map((arch) => {
                const meta = archMeta(arch);
                const chain = nodeList().filter((n) => n.arch === arch);
                const have = chain.filter((n) => nodeState(p, n.id) === "owned").length;
                return (
                  <button key={arch} type="button" onClick={() => { setPage(arch); setSelNode(null); }}
                    className={`up-navrow${page === arch ? " is-on" : ""}`} style={{ "--c": FACTION_GLOW[arch] || VI }}>
                    <FactionIcon type={arch} size={26} />
                    <span className="up-navtext"><b>{meta?.label || arch}</b><i>{have} / {chain.length}</i></span>
                  </button>
                );
              })}
              <div className="up-navhead">{t("upgrades.legPhase")}</div>
              {[nodeDef("deckReroll"), nodeDef("synLeg")].map((n) => {
                const st = nodeState(p, n.id);
                return (
                  <button key={n.id} type="button" onClick={() => toggleNode(n.id)}
                    className={`up-navpassive${st === "placeholder" ? " is-soon" : ""}${selNode === n.id ? " is-sel" : ""}`}>
                    <span>{n.label}</span>
                    <i style={{ color: st === "owned" ? GRUEN : st === "placeholder" ? "#8a8a95" : GOLD }}>
                      {st === "owned" ? "✓" : st === "placeholder" ? t("upgrades.state.soon") : t("upgrades.buy.short", { cost: n.cost })}
                    </i>
                  </button>
                );
              })}
            </nav>

            <section className="up-page as-ring as-ring-quiet">
              <i className="as-ring-run" aria-hidden="true" />
              {page === "gen" ? (
                <>
                  <div className="up-page-h">
                    <span className="up-page-eyebrow" style={{ color: CY }}>{t("upgrades.page.general")}</span>
                    <span className="up-page-hint">{t("upgrades.page.generalHint")}</span>
                  </div>
                  <div className="up-vgrid">
                    {GEN_LANES.map((lane) => (
                      <VLane key={lane.nameKey} title={t(lane.nameKey)} accent={lane.accent}
                        nodes={lane.ids.map((id) => nodeDef(id))} p={p} selected={selNode} onSelect={toggleNode} />
                    ))}
                  </div>
                  <ImpactBox p={p} />
                </>
              ) : (
                <>
                  <div className="up-page-h">
                    <FactionIcon type={page} size={28} />
                    <span className="up-page-eyebrow" style={{ color: FACTION_GLOW[page] || VI }}>{archMeta(page)?.label || page}</span>
                    <span className="up-page-hint">{guideDef(page)?.subtitle}</span>
                    {/* Kein „Details" mehr daneben: Was dort lag — Skills, Leitfaden, Challenges — steht
                        jetzt auf dieser Seite bzw. hinter diesem Knopf. Ein zweiter Einstieg in denselben
                        Screen wäre nur noch ein Umweg. Der Handy-Pfad behält seinen Details-Knopf. */}
                    <button type="button" onClick={() => setGuideArch(page)}
                      className="up-page-guide" style={{ "--c": FACTION_GLOW[page] || VI }}>{t("guide.title")} ›</button>
                  </div>
                  {/* Die Kette läuft hier QUER: drei Knoten sind keine Säule, und quer bleibt der Platz
                      darunter für Skills und Challenge. `lead` = Feuer und Blitz haben keinen Deck-Knoten
                      zu kaufen (von Beginn an spielbar); ohne die „✓ frei"-Kachel startete ihre Kette
                      mitten drin bei Legendär I. „Deck" als Literal wie in der Handy-Fassung. */}
                  <div className="up-chain-row">
                    {deckChain.some((n) => n.deckUnlock) ? null : (
                      <div className="up-vnode as-edge-card as-edge-thin is-lead" style={{ "--c": FACTION_GLOW[page] || VI }}>
                        <span className="up-vnode-t">{t("upgrades.deckLead")}</span>
                        <span className="up-vnode-m" style={{ color: FACTION_GLOW[page] || VI }}>✓ {t("upgrades.free")}</span>
                      </div>
                    )}
                    {deckChain.map((n, i) => (
                      <div key={n.id} className="contents">
                        {(i > 0 || !deckChain.some((x) => x.deckUnlock)) && <span className="up-charrow" aria-hidden="true">→</span>}
                        <VNode node={n} st={nodeState(p, n.id)} accent={nodeAccent(n, FACTION_GLOW[page] || VI)}
                          selected={selNode === n.id} onSelect={toggleNode} />
                      </div>
                    ))}
                  </div>
                  {/* Kein Auswirkungs-Kasten hier: Er zeigt allgemeine Werte (Baufeld, Energie, Rerolls)
                      und gehört dorthin, wo diese Knoten stehen. */}
                  <div className="up-facbody">
                    <SkillGrid arch={page} />
                    <ChallengeBox arch={page} p={p} />
                  </div>
                </>
              )}
              {/* Die Detailzeile des angetippten Knotens — dieselbe wie auf dem Handy, nur hier unten. */}
              {selDeskNode && (
                <NodeDetail node={selDeskNode} st={nodeState(p, selDeskNode.id)}
                  accent={nodeAccent(selDeskNode, VI)} onBuy={buy} />
              )}
              {/* Letztes Kind des Panels: die Erklärung erklärt, was IM Panel steht, und stand bis hier
                  außerhalb davon — unter der Kante, wo sie zu nichts mehr gehörte. */}
              <Legend where="page" />
            </section>
          </div>
        ) : (
        <div className="up-branches">
        <div className={`up-branch as-ring${tab === "deck" ? "" : " is-off"}`}>
        <i className="as-ring-run" aria-hidden="true" />
          <h3 className="up-branch-h" style={{ color: UI1 }}>{t("upgrades.tab.decks")}</h3>
          <div className="mt-4 grid gap-2.5">
            {ARCHETYPE_ORDER.map((arch) => {
              const meta = archMeta(arch);
              const accent = FACTION_GLOW[arch] || VI;
              const chain = nodeList().filter((n) => n.arch === arch); // ice/plant: Deck-Knoten + Legs; fire/lightning: nur Legs
              const hasDeckNode = chain.some((n) => n.deckUnlock);
              const lead = hasDeckNode ? null : { label: t("upgrades.deckLead"), color: accent }; // Feuer/Blitz: Deck von Beginn an frei
              return (
                <div key={arch} className="rounded-2xl p-3" style={panelStyle(accent)}>
                  <button onClick={() => setDetailArch(arch)}
                    className="flex items-center gap-2 w-full text-left mb-2.5 group" title={`${meta?.label}: Details`}>
                    <FactionIcon type={arch} size={20} />
                    <span className="text-body-lg-1 dt:text-title-1 font-extrabold" style={{ color: accent }}>{meta?.label || arch}</span>
                    <span className="ml-auto text-meta-2 dt:text-body-3 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform" style={{ color: "#a6a6b0" }}>{t("upgrades.details")}</span>
                  </button>
                  <Lane nodes={chain} p={p} laneAccent={accent} onBuy={buy} lead={lead} selected={selNode} onSelect={toggleNode} />
                </div>
              );
            })}
            {/* Extras: Deck-Reroll + Platzhalter. */}
            <div className="rounded-2xl p-3" style={panelStyle(GOLD)}>
              <div className="text-meta-1 tracking-[0.22em] uppercase font-bold mb-2.5" style={{ color: "#b9b3cf" }}>{t("upgrades.legPhase")}</div>
              <Lane nodes={[nodeDef("deckReroll"), nodeDef("synLeg")]} p={p} laneAccent={UI1} onBuy={buy} selected={selNode} onSelect={toggleNode} />
            </div>
          </div>
        </div>

        <div className={`up-branch as-ring${tab === "gen" ? "" : " is-off"}`}>
        <i className="as-ring-run" aria-hidden="true" />
          <h3 className="up-branch-h" style={{ color: UI2 }}>{t("upgrades.tab.gen")}</h3>
          <div className="mt-4 grid gap-2.5">
            {GEN_LANES.map((lane) => {
              const acc = genAccentMobile(lane.accent); // #deckui: Allgemein-Lanes ziehen die Deckfarbe (Struktur, kein Signal)
              return (
              <div key={lane.nameKey} className="rounded-2xl p-3" style={panelStyle(acc)}>
                <div className="flex items-baseline gap-2 mb-2.5">
                  <span className="text-body-3 dt:text-body-lg-4 font-extrabold" style={{ color: acc }}>{t(lane.nameKey)}</span>
                  {lane.noteKey && <span className="text-micro-4 dt:text-body-1 italic" style={{ color: "#71717c" }}>{t(lane.noteKey)}</span>}
                </div>
                <Lane nodes={lane.ids.map((id) => nodeDef(id))} p={p} laneAccent={acc} onBuy={buy} selected={selNode} onSelect={toggleNode} />
              </div>
              );
            })}
          </div>
        </div>
        </div>
        )}

        {/* Legende, Handy-Platz: unter dem Stapel. Ab 1280 px übernimmt die Instanz im Panel. */}
        <Legend where="outer" />
      </div>
    </div>
    {/* Geschwister des Wurzelknotens: der Baum-Root schließt bei onClick, ein Klick im Leitfaden
        würde von innen heraus bis dorthin blubbern und den Baum mit schließen. */}
    {guideArch && <GuideOverlay initial={guideArch} onClose={() => setGuideArch(null)} />}
   </>
  ));
}
