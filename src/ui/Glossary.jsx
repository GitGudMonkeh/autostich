import { useMemo, useRef, useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { glossaryCategories, glossaryGroups, glossaryEntries, tokenizeGlossary } from "../i18n/glossaryText.js";
import { useLocale } from "../i18n/useLocale.js"; // #sprache: Neuaufbau bei Sprachwechsel
import { t } from "../i18n/index.js";
import { useEscape } from "./useEscape.js";
import { useTabSwipe } from "./useSwipeTabs.js"; // Kategorie-Wechsel per Swipe
import { FactionIcon, FACTION_ICON_SRC } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, ActionButton } from "./modalStyle.jsx"; // gemeinsame Hub-Modal-Bildsprache

/* ============================================================
   GLOSSAR-UI (Glossar-Rework) — drei Bausteine:
   - GlossaryText:  markiert Glossar-Begriffe in einem Beschreibungstext FETT (Signal „steht im Glossar").
                    Bewusst NICHT klickbar — die Auswahlkarten sind ganzflächig klickbar, ein klickbarer Begriff
                    darin würde versehentlich den Skill/Perk wählen. Zugang zum Glossar nur über das ⓘ.
   - GlossaryButton: der ⓘ-Kreis (oben rechts an Panels / Haupt- & Spielseite).
   - GlossaryPanel: Button + selbstverwaltetes Overlay als Drop-in (eine Zeile je Panel).
   Datenquelle ist ausschließlich game/glossary.js (kein doppelter Text).
   ============================================================ */

// Beschreibungstext mit fett markierten Glossar-Begriffen (nicht klickbar).
// whitespace-pre-line: Zeilenumbrüche (\n) im Beschreibungstext werden als echte Umbrüche gerendert — so lassen sich
// lange Beschreibungen (z. B. Ionisierung) in kurze, strukturierte Zeilen gliedern statt als Textwand zu erscheinen.
// Normale einzeilige Beschreibungen bleiben unberührt (pre-line bewahrt nur Umbrüche, kollabiert Mehrfach-Leerraum).
export function GlossaryText({ text, className }) {
  const [locale] = useLocale();   // #sprache: bei Wechsel neu tokenisieren (andere Wortformen)
  const parts = useMemo(() => tokenizeGlossary(text, locale), [text, locale]);
  const cls = `whitespace-pre-line${className ? ` ${className}` : ""}`;
  if (!parts.length) return text ? <span className={cls}>{text}</span> : null;
  return (
    <span className={cls}>
      {parts.map((p, i) => (p.bold ? <strong key={i} className="gloss-term">{p.text}</strong> : <span key={i}>{p.text}</span>))}
    </span>
  );
}

// Der ⓘ-Kreis. `onClick` öffnet das Overlay. Position/Größe kommen von className/style des Aufrufers.
export function GlossaryButton({ onClick, className = "", style, title = null }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? t("glossary.title")}
      aria-label={t("glossary.open")}
      className={"gloss-i-btn " + className}
      style={style}
    >
      i
    </button>
  );
}

// Reihenfolge der Archetyp-Gruppen — sprachunabhängig, deshalb aus den Schlüsseln selbst.
const GROUP_ORDER = ["gen", "fire", "lightning", "ice", "plant"];

// Das durchsuchbare, kategorisierte Overlay.
export function GlossaryOverlay({ onClose }) {
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const bodyRef = useRef(null);
  const secRefs = useRef({});
  useEscape(onClose);

  const [locale] = useLocale();
  // glossaryEntries() liest die aktive Sprache intern → bei Sprachwechsel neu berechnen (locale als Trigger).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entries = useMemo(() => glossaryEntries(), [locale]);
  const query = q.trim().toLowerCase();
  const match = (e) =>
    !query ||
    e.label.toLowerCase().includes(query) ||
    e.text.toLowerCase().includes(query) ||
    (e.match || []).some((m) => m.toLowerCase().includes(query));

  // Nach Kategorie (und innerhalb „frak" nach Gruppe) gebündelt, leere Sektionen fallen beim Suchen raus.
  const sections = useMemo(() => {
    return glossaryCategories().map((cat) => {
      const items = entries.filter((e) => e.category === cat.id && match(e));
      if (!items.length) return null;
      let groups = null;
      if (cat.id === "frak") {
        groups = GROUP_ORDER
          .map((g) => ({ g, meta: glossaryGroups()[g], items: items.filter((e) => e.group === g) }))
          .filter((x) => x.items.length);
      }
      return { cat, items, groups };
    }).filter(Boolean);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  }, [entries, query, locale]);

  const jump = (catId) => {
    setActiveCat(catId);
    if (q) setQ("");
    const el = catId === "all" ? null : secRefs.current[catId];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "start", behavior: "smooth" });
    else if (bodyRef.current) bodyRef.current.scrollTop = 0;
  };
  // Kategorie-Reihenfolge (mit „Alle" vorn) für den horizontalen Swipe → nächste/vorige Kategorie (springt + scrollt).
  const catOrder = ["all", ...glossaryCategories().map((c) => c.id)];
  const catSwipe = useTabSwipe(catOrder, activeCat, jump);

  return overlayPortal((
    <div className="fixed inset-0 overlay-root z-[60]" role="dialog" aria-modal="true" aria-label={t("glossary.title")}>
      <div className="absolute inset-0" style={{ background: "rgba(6,6,10,.66)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div className="absolute inset-0 overlay-safe flex items-start sm:items-center justify-center p-3 sm:p-6 pointer-events-none">
        {/* #deckui: neutrale Modal-Schale zieht den Rahmen-Verlauf aus der aktiven Deckfarbe (Fallback Violett). */}
        <div className="pointer-events-auto w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden overlay-card as-panel as-panel-deck relative"
          style={{ maxHeight: "92dvh", ...MODAL_CARD, boxShadow: "0 30px 80px -30px #000" }} {...catSwipe}>
          <TopHairline />

          {/* Kopf: Titel + Schließen + Suche */}
          <div className="px-4 pt-3.5 pb-2.5 flex-none" style={{ borderBottom: "1px solid #2c2a3a", background: STICKY_HEAD_BG }}>
            <div className="flex items-center gap-2.5">
              <span className="gloss-i-mark">i</span>
              {/* #deckui: Titel-Akzent in Deckfarbe (Fallback = bisheriges Pastellviolett). */}
              <h2 className="text-xs font-bold tracking-[0.28em] uppercase" style={{ color: "var(--deck-a1, #d8d2f2)" }}>{t("glossary.title")}</h2>
              <ActionButton kind="secondary" className="ml-auto" onClick={onClose}>{t("common.close")}</ActionButton>
            </div>
            <div className="text-[10px] mt-0.5 ml-8 tracking-wide" style={{ color: "#71717c" }}>{t("glossary.subtitle")}</div>
            <div className="relative mt-2.5">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#5c5c68" }}>⌕</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false}
                placeholder={t("glossary.search")}
                className="w-full py-2 pl-8 pr-8 rounded-lg text-sm gloss-search"
                style={{ background: "#0f0f14", border: "1px solid #33333e", color: "#e8e8ea" }} />
              {q && (
                <button type="button" onClick={() => setQ("")} aria-label={t("glossary.clear")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm px-1" style={{ color: "#71717c" }}>✕</button>
              )}
            </div>
          </div>

          {/* Kategorie-Chips (Sprungnavigation) */}
          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 px-4 py-2.5 flex-none overflow-x-auto sm:overflow-x-visible as-chiprow" style={{ borderBottom: "1px solid #2c2a3a" }}>
            <Chip label={t("glossary.all")} active={activeCat === "all"} onClick={() => jump("all")} />
            {glossaryCategories().map((c) => (
              <Chip key={c.id} label={c.label} dot={c.color} active={activeCat === c.id} onClick={() => jump(c.id)} />
            ))}
          </div>

          {/* Körper: Sektionen */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto overlay-card pb-8" style={{ overscrollBehavior: "contain" }}>
            {sections.length === 0 && (
              <div className="px-5 py-9 text-center text-sm" style={{ color: "#71717c" }}>
                {/* #deckui: hervorgehobener Suchbegriff als reiner Chrome-Akzent → Deckfarbe (Fallback bisher). */}
                {t("glossary.noHit.pre")} <b style={{ color: "var(--deck-a1, #c9c2ea)" }}>„{q.trim()}“</b>.<br />{t("glossary.noHit.post")}
              </div>
            )}
            {sections.map(({ cat, items, groups }) => (
              <section key={cat.id} ref={(el) => (secRefs.current[cat.id] = el)} className="px-4 pt-3.5" style={{ scrollMarginTop: "6px" }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: cat.color }} />
                  {/* #deckui: Sektions-Titel-Akzent → Deckfarbe. Die Bedeutung trägt der Kategorie-Punkt (cat.color) daneben, der bleibt. */}
                  <h3 className="text-[10px] tracking-[0.24em] uppercase font-bold" style={{ color: "var(--deck-a1, #b9b3cf)" }}>{cat.label}</h3>
                  <span className="flex-1 h-px max-w-[54px]" style={{ background: "linear-gradient(90deg,#33333e,transparent)" }} />
                  <span className="text-[10px] tabular-nums" style={{ color: "#71717c" }}>{items.length}</span>
                </div>
                {groups
                  ? groups.map(({ g, meta, items: gi }) => (
                      <div key={g}>
                        <div className="mt-2 mb-0.5 text-[10px] tracking-[0.14em] uppercase flex items-center gap-1.5" style={{ color: "#7d7790" }}>
                          {FACTION_ICON_SRC[g] ? <FactionIcon type={g} size={13} /> : <span className="text-xs">{meta.icon}</span>}{meta.label}
                        </div>
                        {gi.map((e) => <TermRow key={e.id} e={e} />)}
                      </div>
                    ))
                  : items.map((e) => <TermRow key={e.id} e={e} />)}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  ));
}

function Chip({ label, dot, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      /* #kante: eckig statt Pille — an einer runden Form würde die linke Kante zur Sichel. */
      className={"as-chip flex-none whitespace-nowrap text-[11px] tracking-wide px-2.5 py-1 rounded-md" + (active ? " as-chip-on" : "")}>
      {dot && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: dot }} />}
      {label}
    </button>
  );
}

/* #kante: Jeder Begriff trägt die Farbe seiner Kategorie/Fraktion ohnehin schon an Icon und Überschrift —
   als Kante wird daraus eine lesbare Spalte, ohne dass eine einzige Farbe dazukommt. Beim Scrollen durch die
   ~70 Einträge sieht man so, wo eine Gruppe anfängt und aufhört. */
function TermRow({ e }) {
  return (
    <div className="as-edge-card as-edge-thin flex gap-2.5 px-2 py-2 rounded-lg gloss-term-row mb-1"
      style={{ "--c": e.color }}>
      <span className="flex-none text-center w-4 leading-6 inline-flex items-center justify-center" style={{ color: e.color }}>{FACTION_ICON_SRC[e.group] ? <FactionIcon type={e.group} size={14} /> : <span className="text-[15px]">{e.icon}</span>}</span>
      <div className="min-w-0">
        <div className="font-bold text-[13px] leading-tight" style={{ color: e.color }}>{e.label}</div>
        <div className="text-[11.5px] leading-relaxed mt-0.5" style={{ color: "#a9a9b6" }}>{e.text}</div>
      </div>
    </div>
  );
}

// Drop-in: das ⓘ + das selbstverwaltete Overlay. In Panel-/HUD-Köpfe setzen.
// `onOpenChange` meldet den Öffnungszustand nach oben (App pausiert damit den Auto-Battler im Spiel-HUD).
export function GlossaryPanel({ className = "", style, onOpenChange }) {
  const [open, setOpen] = useState(false);
  const set = (v) => { setOpen(v); onOpenChange?.(v); };
  return (
    <>
      <GlossaryButton onClick={() => set(true)} className={className} style={style} />
      {open && <GlossaryOverlay onClose={() => set(false)} />}
    </>
  );
}
