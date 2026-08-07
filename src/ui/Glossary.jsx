import { useMemo, useRef, useState } from "react";
import {
  GLOSSARY_CATEGORIES, GLOSSARY_GROUPS, glossaryEntries, tokenizeGlossary,
} from "../game/glossary.js";
import { useEscape } from "./useEscape.js";

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
  const parts = useMemo(() => tokenizeGlossary(text), [text]);
  const cls = `whitespace-pre-line${className ? ` ${className}` : ""}`;
  if (!parts.length) return text ? <span className={cls}>{text}</span> : null;
  return (
    <span className={cls}>
      {parts.map((p, i) => (p.bold ? <strong key={i} className="gloss-term">{p.text}</strong> : <span key={i}>{p.text}</span>))}
    </span>
  );
}

// Der ⓘ-Kreis. `onClick` öffnet das Overlay. Position/Größe kommen von className/style des Aufrufers.
export function GlossaryButton({ onClick, className = "", style, title = "Glossar" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label="Glossar öffnen"
      className={"gloss-i-btn " + className}
      style={style}
    >
      i
    </button>
  );
}

const GROUP_ORDER = Object.keys(GLOSSARY_GROUPS);

// Das durchsuchbare, kategorisierte Overlay.
export function GlossaryOverlay({ onClose }) {
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const bodyRef = useRef(null);
  const secRefs = useRef({});
  useEscape(onClose);

  const entries = useMemo(() => glossaryEntries(), []);
  const query = q.trim().toLowerCase();
  const match = (e) =>
    !query ||
    e.label.toLowerCase().includes(query) ||
    e.text.toLowerCase().includes(query) ||
    (e.match || []).some((m) => m.toLowerCase().includes(query));

  // Nach Kategorie (und innerhalb „frak" nach Gruppe) gebündelt, leere Sektionen fallen beim Suchen raus.
  const sections = useMemo(() => {
    return GLOSSARY_CATEGORIES.map((cat) => {
      const items = entries.filter((e) => e.category === cat.id && match(e));
      if (!items.length) return null;
      let groups = null;
      if (cat.id === "frak") {
        groups = GROUP_ORDER
          .map((g) => ({ g, meta: GLOSSARY_GROUPS[g], items: items.filter((e) => e.group === g) }))
          .filter((x) => x.items.length);
      }
      return { cat, items, groups };
    }).filter(Boolean);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  }, [entries, query]);

  const jump = (catId) => {
    setActiveCat(catId);
    if (q) setQ("");
    const el = catId === "all" ? null : secRefs.current[catId];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "start", behavior: "smooth" });
    else if (bodyRef.current) bodyRef.current.scrollTop = 0;
  };

  return (
    <div className="fixed inset-0 overlay-root z-[60]" role="dialog" aria-modal="true" aria-label="Glossar">
      <div className="absolute inset-0" style={{ background: "rgba(6,6,10,.66)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div className="absolute inset-0 flex items-start sm:items-center justify-center p-3 sm:p-6 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden overlay-card"
          style={{ maxHeight: "92dvh", background: "linear-gradient(180deg,#16131f 0%,#131318 42%)", border: "1px solid #2a2a33", boxShadow: "0 30px 80px -30px #000" }}>

          {/* Kopf: Titel + Schließen + Suche */}
          <div className="px-4 pt-3.5 pb-2.5 flex-none" style={{ borderBottom: "1px solid #2a2a33", background: "#15121e" }}>
            <div className="flex items-center gap-2.5">
              <span className="gloss-i-mark">i</span>
              <h2 className="text-xs font-bold tracking-[0.28em] uppercase" style={{ color: "#d8d2f2" }}>Glossar</h2>
              <button type="button" onClick={onClose} aria-label="Schließen"
                className="ml-auto w-7 h-7 grid place-items-center rounded-lg text-base leading-none"
                style={{ border: "1px solid #33333e", background: "#1c1c22", color: "#9a9aa4" }}>✕</button>
            </div>
            <div className="text-[10px] mt-0.5 ml-8 tracking-wide" style={{ color: "#71717c" }}>Begriffe &amp; Sonderregeln — keine einzelnen Perks/Skills</div>
            <div className="relative mt-2.5">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#5c5c68" }}>⌕</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false}
                placeholder="Suchen … z. B. Nachhall, Schichten, Hitze"
                className="w-full py-2 pl-8 pr-8 rounded-lg text-sm gloss-search"
                style={{ background: "#0f0f14", border: "1px solid #33333e", color: "#e8e8ea" }} />
              {q && (
                <button type="button" onClick={() => setQ("")} aria-label="Suche löschen"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm px-1" style={{ color: "#71717c" }}>✕</button>
              )}
            </div>
          </div>

          {/* Kategorie-Chips (Sprungnavigation) */}
          <div className="flex flex-nowrap sm:flex-wrap gap-1.5 px-4 py-2.5 flex-none overflow-x-auto sm:overflow-x-visible gloss-chiprow" style={{ borderBottom: "1px solid #2a2a33" }}>
            <Chip label="Alle" active={activeCat === "all"} onClick={() => jump("all")} />
            {GLOSSARY_CATEGORIES.map((c) => (
              <Chip key={c.id} label={c.label} dot={c.color} active={activeCat === c.id} onClick={() => jump(c.id)} />
            ))}
          </div>

          {/* Körper: Sektionen */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto overlay-card pb-8" style={{ overscrollBehavior: "contain" }}>
            {sections.length === 0 && (
              <div className="px-5 py-9 text-center text-sm" style={{ color: "#71717c" }}>
                Kein Begriff zu <b style={{ color: "#c9c2ea" }}>„{q.trim()}“</b>.<br />Andere Schreibweise probieren?
              </div>
            )}
            {sections.map(({ cat, items, groups }) => (
              <section key={cat.id} ref={(el) => (secRefs.current[cat.id] = el)} className="px-4 pt-3.5" style={{ scrollMarginTop: "6px" }}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: cat.color }} />
                  <h3 className="text-[10px] tracking-[0.24em] uppercase font-bold" style={{ color: "#b9b3cf" }}>{cat.label}</h3>
                  <span className="flex-1 h-px max-w-[54px]" style={{ background: "linear-gradient(90deg,#33333e,transparent)" }} />
                  <span className="text-[10px] tabular-nums" style={{ color: "#71717c" }}>{items.length}</span>
                </div>
                {groups
                  ? groups.map(({ g, meta, items: gi }) => (
                      <div key={g}>
                        <div className="mt-2 mb-0.5 text-[10px] tracking-[0.14em] uppercase flex items-center gap-1.5" style={{ color: "#7d7790" }}>
                          <span className="text-xs">{meta.icon}</span>{meta.label}
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
  );
}

function Chip({ label, dot, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={"gloss-chip flex-none whitespace-nowrap text-[11px] tracking-wide px-2.5 py-1 rounded-full" + (active ? " gloss-chip-on" : "")}>
      {dot && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: dot }} />}
      {label}
    </button>
  );
}

function TermRow({ e }) {
  return (
    <div className="flex gap-2.5 px-2 py-2 rounded-lg gloss-term-row">
      <span className="flex-none text-center w-4 text-[15px] leading-6" style={{ color: e.color }}>{e.icon}</span>
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
