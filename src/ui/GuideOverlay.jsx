import { useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { ARCHETYPE_ORDER } from "../game/skills.js";
import { useTabSwipe } from "./useSwipeTabs.js"; // Archetyp-Wechsel per Swipe
import { FactionIcon, ArchIcon, FACTION_GLOW } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { guideDef } from "../i18n/guideText.js"; // #sprache: Leitfaden zur Anzeigezeit
import { useEscape } from "./useEscape.js";
import { useIsWide } from "./useIsWide.js"; // #desktop: Spalte statt Reiter
import { ActionButton, MODAL_CARD, TopHairline, STICKY_HEAD_BG } from "./modalStyle.jsx";
import { archMeta } from "../i18n/labels.js"; // #sprache: Skills/Archetypen zur Anzeigezeit
import { t } from "../i18n/index.js";

/* ============================================================
   LEITFADEN-UI — das „Wie spiele ich das"-Overlay je Archetyp (Datenquelle: guides.js).
   Aufbau wie das Glossar-Overlay (Drop-in-Panel + Overlay), aber mit vier Archetyp-Reitern
   zum Durchklicken. Trennung: Glossar = Begriffe · Leitfaden = Spielprinzip.
   - GuideButton:  der beschriftete „📖 Leitfaden"-Knopf.
   - GuideOverlay: das Overlay mit vier Reitern.
   - GuidePanel:   Button + selbstverwaltetes Overlay als Drop-in (eine Zeile je Panel).

   #desktop (18.08.2026) — ab 1280 px ist das kein Modal mehr, sondern ein gerahmter Screen wie
   Upgrade-Baum und Werkstatt: Navigationsspalte links, Seite rechts, Körper in drei Spalten.
   Die `gd-*`-Klassen hier sind reine HAKEN — sie tragen unterhalb von 1280 px keine Darstellung
   (`display: contents` in index.css), die Handy-Fassung bleibt damit DOM- und pixelgleich.
   ============================================================ */

// Text mit **fett**-Markup rendern (kein React-Markup in den Daten).
function RT({ t }) {
  const parts = String(t || "").split(/\*\*/);
  return (
    <>
      {parts.map((s, i) => (i % 2 ? <strong key={i} style={{ color: "#f2f0f8", fontWeight: 650 }}>{s}</strong> : <span key={i}>{s}</span>))}
    </>
  );
}

// Sektions-Überschrift (kleine Kapitälchen + Akzent-Strich in Archetyp-Farbe).
function SecLabel({ children, color }) {
  return (
    <div className="gd-seclabel flex items-center gap-2.5 mb-3 mt-6">
      <span className="w-3.5 h-0.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <h3 className="gd-sectext text-meta-1 tracking-[0.22em] uppercase font-bold" style={{ color: "#b9b3cf" }}>{children}</h3>
    </div>
  );
}

// Der Kreislauf-Ring (4 Knoten + wandernder Funke), datengesteuert je Archetyp.
function LoopRing({ color, nodes, center }) {
  return (
    <svg viewBox="-38 0 276 200" className="w-full h-auto block" role="img"
         aria-label={`Kreislauf: ${nodes.join(" → ")}`}>
      <circle cx="100" cy="100" r="72" fill="none" stroke="#2a2a33" strokeWidth="12" />
      <circle cx="100" cy="100" r="72" fill="none" stroke={color} strokeWidth="2.5" opacity="0.5" />
      <circle className="guide-ring-spark" cx="100" cy="100" r="72" fill="none" stroke={color} strokeWidth="4"
              strokeLinecap="round" strokeDasharray="6 296" pathLength="302"
              style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
      <g fill={color} opacity="0.85">
        <path d="M172 100 l-7 -5 v10 z" />
        <path d="M100 172 l5 -7 h-10 z" />
        <path d="M28 100 l7 5 v-10 z" />
        <path d="M100 28 l-5 7 h10 z" />
      </g>
      {/* Knoten-Labels bewusst AUSSERHALB des Kreises (r=72 → Rand bei 28/172): oben/unten mittig darüber/darunter,
          links rechtsbündig links vom Rand, rechts linksbündig rechts vom Rand — so überlappt kein Text die Linie. */}
      <g fill="#e8e8ea" fontSize="11" style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>
        <text x="100" y="18" textAnchor="middle">{nodes[0]}</text>
        <text x="180" y="104" textAnchor="start" fontSize="10">{nodes[1]}</text>
        <text x="100" y="193" textAnchor="middle">{nodes[2]}</text>
        <text x="20" y="104" textAnchor="end" fontSize="10">{nodes[3]}</text>
      </g>
      <text x="100" y="97" textAnchor="middle" fill={color} fontSize="11" letterSpacing="0.5" style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{center[0]}</text>
      <text x="100" y="112" textAnchor="middle" fill="#71717c" fontSize="8" letterSpacing="1" style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{center[1]}</text>
    </svg>
  );
}

// Eine Status-Leiste — zwei Stile: mit `scale` = Einzel-Gauge (Feuer/Eis, Ticks/Bruch/Überlauf),
// sonst zweizeilig (Blitz/Pflanze) mit Payoff-Text rechts.
function Bar({ b }) {
  const single = !!b.scale;
  return (
    <div className="gd-bar rounded-xl px-3.5 py-3" style={{ background: `linear-gradient(180deg, ${b.color}10, #141419)`, border: "1px solid #2a2a33", borderLeft: `3px solid ${b.color}66` }}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="gd-barname text-body-3 tracking-wide" style={{ color: "#e2e0ee" }}>
          <span className="mr-1.5" style={{ color: b.color }}>{b.faction ? <FactionIcon type={b.faction} size={12} /> : b.glyph}</span>{b.name}
        </span>
        {!single && b.payoff && <span className="gd-barpay text-meta-3 text-right" style={{ color: "#9a9aa6" }}><RT t={b.payoff} /></span>}
      </div>
      <div className="relative overflow-hidden rounded-md" style={{ height: single ? 18 : 12, background: "#0c0c11", border: "1px solid #2a2a33" }}>
        <span className="absolute inset-y-0 left-0" style={{
          width: `${b.fill}%`,
          background: `linear-gradient(90deg, ${b.color}99, ${b.color}, ${b.color})`,
          boxShadow: `0 0 14px -2px ${b.color}`,
        }} />
        {(b.ticks || []).map((t, i) => (
          <span key={i} className="absolute inset-y-0" style={{ left: `${t}%`, width: 2, background: "#07070b", opacity: 0.7 }} />
        ))}
        {b.breakMarker != null && (
          <span className="absolute" style={{ left: `${b.breakMarker}%`, top: -2, bottom: -2, width: 2, background: "#f4f2ff", boxShadow: "0 0 8px #cfefff" }} />
        )}
        {b.overflow && (
          <span className="absolute inset-y-0 right-0" style={{
            width: "12%",
            background: `repeating-linear-gradient(90deg, ${b.color}aa 0 3px, ${b.color}44 3px 6px)`,
            borderLeft: `1px dashed ${b.color}`,
          }} />
        )}
      </div>
      {single && (
        <div className="gd-barscale flex justify-between mt-1.5 text-meta-1" style={{ color: "#71717c" }}>
          {b.scale.map((s, i) => <span key={i} className={i === b.scale.length - 1 ? "" : "ty-num-sm"}>{s}</span>)}
        </div>
      )}
    </div>
  );
}

export function GuideButton({ onClick, className = "", style }) {
  return (
    <button type="button" onClick={onClick} aria-label={t("guide.open")} title={t("guide.title")}
      className={"inline-flex items-center gap-1.5 text-meta-3 font-semibold tracking-wide px-2.5 py-1 rounded-full " + className}
      style={{ background: "#20202a", border: "1px solid #3a3a4a", color: "#cfcad8", ...style }}>
      <span aria-hidden="true">📖</span> {t("guide.title")}
    </button>
  );
}

/* Reiner Leitfaden-INHALT je Archetyp (ohne Schale) — Single Source, damit sowohl das GuideOverlay als auch
   die Deck-Detailansicht (#369) exakt dasselbe rendern (kein Abschreiben). showTitle blendet den großen
   Archetyp-Titel + die Fußzeile aus, wenn der Aufrufer (Deck-Detail) bereits einen eigenen Kopf hat;
   showSubtitle zusätzlich den Untertitel (auf dem Desktop trägt ihn der Seitenkopf).

   Die drei `gd-col`-Klammern sind der Grund, warum der Desktop-Körper OHNE zweiten Renderpfad in drei
   Spalten steht: unterhalb von 1280 px sind sie `display: contents` und damit gar nicht da. Sie stehen
   in Lesereihenfolge — wer eine Sektion verschiebt, verschiebt sie auf beiden Fassungen. */
export function GuideBody({ archetype, showTitle = true, showSubtitle = true }) {
  const active = ARCHETYPE_ORDER.includes(archetype) ? archetype : "lightning";
  const g = guideDef(active);
  const meta = archMeta(active);
  const color = meta.color;
  return (
    <>
      {showTitle ? (
        <div className="pt-4">
          <h1 className="text-display-1 font-extrabold tracking-wide uppercase leading-none"
              style={{ color: "#f4f2ff", textShadow: `0 0 22px ${color}66` }}>
            <ArchIcon meta={meta} size={16} className="mr-2" />{meta.label}
          </h1>
          <p className="text-body-4 mt-2.5 leading-relaxed" style={{ color: "#a9a9b6", maxWidth: "56ch" }}>{g.subtitle}</p>
        </div>
      ) : showSubtitle && (
        <p className="text-body-4 pt-1 leading-relaxed" style={{ color: "#a9a9b6", maxWidth: "56ch" }}>{g.subtitle}</p>
      )}

      <div className="gd-cols">
        {/* Spalte 1 — worum es geht und woraus es besteht. */}
        <div className="gd-col">
          <SecLabel color={color}>{t("guide.core")}</SecLabel>
          <p className="gd-core text-body-lg-3 leading-relaxed" style={{ color: "#dcdce6" }}><RT t={g.kernidee} /></p>

          <SecLabel color={color}>{g.pillarsLabel}</SecLabel>
          <div className="grid gap-2.5">
            {g.pillars.map((p, i) => (
              <div key={i} className="gd-pillar grid gap-3 items-start rounded-xl px-3.5 py-3"
                   style={{ gridTemplateColumns: "38px 1fr", background: `linear-gradient(180deg, ${p.color}0d, #141419)`, border: "1px solid #2a2a33", borderLeft: `3px solid ${p.color}66` }}>
                <div className="gd-pglyph w-[38px] h-[38px] grid place-items-center rounded-lg text-title-5"
                     style={{ color: p.color, background: "#0e0e13", border: "1px solid #33333e", boxShadow: `0 0 14px -5px ${p.color}` }}>{p.faction ? <FactionIcon type={p.faction} size={18} /> : p.glyph}</div>
                <div>
                  <div className="gd-pname text-body-lg-2 font-semibold" style={{ color: p.color }}>
                    {p.name}{p.sub && <span className="ml-1 text-body-1 font-normal" style={{ color: "#71717c" }}>{p.sub}</span>}
                  </div>
                  <div className="gd-ptext text-body-3 leading-relaxed mt-0.5" style={{ color: "#a9a9b6" }}><RT t={p.text} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spalte 2 — wie es sich dreht. */}
        <div className="gd-col">
          <SecLabel color={color}>{t("guide.loop")}</SecLabel>
          <div className="gd-loopgrid grid gap-4 items-center sm:grid-cols-[190px_1fr]">
            <div className="gd-ringbox mx-auto w-full max-w-[190px]"><LoopRing color={color} nodes={g.loop.nodes} center={g.loop.center} /></div>
            <ol className="grid gap-2.5 list-none p-0 m-0" style={{ counterReset: "gstep" }}>
              {g.loop.steps.map((s, i) => (
                <li key={i} className="gd-step grid gap-3 items-baseline text-body-4" style={{ gridTemplateColumns: "24px 1fr", color: "#d3d3dd" }}>
                  <span className="gd-stepno grid place-items-center text-meta-3 ty-num-sm rounded-md"
                        style={{ width: 24, height: 24, color: color, background: "#0e0e13", border: "1px solid #33333e" }}>{i + 1}</span>
                  <span><RT t={s} /></span>
                </li>
              ))}
            </ol>
          </div>
          <div className="gd-valve mt-3.5 rounded-xl px-3.5 py-3 text-body-3 leading-relaxed"
               style={{ background: "linear-gradient(180deg,#1a1826,#16161c)", border: "1px solid #2a2a33", borderLeft: `3px solid ${color}`, color: "#cfcfda" }}>
            <RT t={g.loop.valve} />
          </div>
        </div>

        {/* Spalte 3 — woran man den Stand abliest und was man daraus macht. */}
        <div className="gd-col">
          <SecLabel color={color}>{g.status.label}</SecLabel>
          <div className="grid gap-2.5">
            {g.status.bars.map((b, i) => <Bar key={i} b={b} />)}
          </div>

          <SecLabel color={color}>{t("guide.principles")}</SecLabel>
          <ul className="grid gap-2.5 list-none p-0 m-0">
            {g.principle.map((p, i) => (
              <li key={i} className="gd-princ grid gap-3 rounded-xl px-3.5 py-3 text-body-4"
                  style={{ gridTemplateColumns: "auto 1fr", background: `linear-gradient(180deg, ${color}0d, #141419)`, border: "1px solid #2a2a33", borderLeft: `3px solid ${color}66`, color: "#d3d3dd" }}>
                <span className="gd-tag h-fit ty-badge text-meta-2 uppercase px-2 py-1 rounded-md whitespace-nowrap"
                      style={{ color: color, background: "#17151f", border: "1px solid #33333e" }}>{p.tag}</span>
                <span className="leading-relaxed"><RT t={p.text} /></span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {showTitle && (
        <div className="mt-6 pt-3.5 text-meta-3 flex items-center gap-2" style={{ borderTop: "1px solid #2a2a33", color: "#71717c" }}>
          <ArchIcon meta={meta} size={14} /> {meta.label} · {t("guide.archOf", { n: ARCHETYPE_ORDER.indexOf(active) + 1, total: ARCHETYPE_ORDER.length })}
        </div>
      )}
    </>
  );
}

export function GuideOverlay({ onClose, initial = "lightning" }) {
  const [active, setActive] = useState(ARCHETYPE_ORDER.includes(initial) ? initial : "lightning");
  const archSwipe = useTabSwipe(ARCHETYPE_ORDER, active, setActive); // Swipe ←/→ = voriger/nächster Archetyp
  const wide = useIsWide();
  useEscape(onClose);
  const activeMeta = archMeta(active);

  /* #overlay-portal: an document.body — wie RunDetail (dort steht die ausführliche Begründung). Aufrufer ist
     u. a. der Upgrade-Baum, dessen Wurzel `backdrop-filter` UND `overflow-y-auto` trägt; ohne Portal erschiene
     der Leitfaden um die Scroll-Position nach oben versetzt, sobald man vorher im Baum gescrollt hat. */
  return overlayPortal((
    <div className="fixed inset-0 overlay-root z-[60]" role="dialog" aria-modal="true" aria-label={t("guide.title")}>
      <div className="gd-dim absolute inset-0" style={{ background: "rgba(6,6,10,.66)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div className="gd-frame absolute inset-0 overlay-safe flex items-start sm:items-center justify-center p-3 sm:p-6 pointer-events-none">
        {/* #369: Werkstatt-Schale (MODAL_CARD + Tri-Color-Hairline). #deckui: deck-getönter Rahmen (as-panel-deck);
            die Reiter/Akzente bleiben Fraktionsfarbe (Deck-Identität, wie in DeckDetail). */}
        <div className="gd-card pointer-events-auto w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden overlay-card as-panel as-panel-deck relative"
          style={{ maxHeight: "92dvh", ...MODAL_CARD, boxShadow: "0 30px 80px -30px #000" }} {...archSwipe}>
          <TopHairline />

          {/* Kopf. Ab 1280 px wird aus den zwei gestapelten Zeilen EINE Rasterzeile
              (Titel · Auskunft · Schließen) — dasselbe Raster wie `.up-head`/`.cz-head`. */}
          <div className="gd-head px-4 pt-3.5 pb-2.5 flex-none" style={{ borderBottom: "1px solid #2a2a33", background: STICKY_HEAD_BG }}>
            <div className="gd-headrow flex items-center gap-2.5">
              {/* Kein Zeichen vor dem Titel: Die anderen Screens (Baum, Werkstatt) tragen dort auch keins,
                  und das Buch-Emoji war ein Fremdkörper im Zeichensatz des Spiels. */}
              <span className="gd-title flex items-center gap-2.5">
                <h2 className="text-body-5 font-bold tracking-[0.28em] uppercase" style={{ color: "#d8d2f2" }}>{t("guide.title")}</h2>
              </span>
              <ActionButton kind="secondary" className="gd-close ml-auto" onClick={onClose}>{t("common.close")}</ActionButton>
            </div>
            <div className="gd-hint text-meta-1 mt-0.5 ml-8 tracking-wide" style={{ color: "#71717c" }}>{t("guide.subtitle")}</div>
            {/* Die Haarlinie der Karte sitzt an deren Ecke; ohne Kartenfläche braucht der Kopf eine eigene. */}
            {wide && <div className="gd-hair" aria-hidden="true" />}
          </div>

          {/* Archetyp-Reiter — ab 1280 px übernimmt die Spalte links (s. `.gd-tabs` in index.css). */}
          <div className="gd-tabs flex gap-1.5 px-3 pt-2.5 pb-0 flex-none overflow-x-auto" style={{ borderBottom: "1px solid #2a2a33" }}>
            {ARCHETYPE_ORDER.map((k) => {
              const m = archMeta(k);
              const on = k === active;
              return (
                <button key={k} type="button" onClick={() => setActive(k)} role="tab" aria-selected={on}
                  className="flex-1 min-w-max flex items-center justify-center gap-1.5 text-body-1 font-semibold tracking-wide uppercase px-3 py-2 rounded-t-lg"
                  style={{
                    color: on ? m.color : "#71717c",
                    background: on ? "#131318" : "transparent",
                    border: on ? "1px solid #2a2a33" : "1px solid transparent",
                    borderBottom: "none",
                    boxShadow: on ? `0 -2px 14px -8px ${m.color}` : "none",
                  }}>
                  <ArchIcon meta={m} size={14} className="mr-1" style={{ opacity: on ? 1 : 0.55 }} />{m.label}
                </button>
              );
            })}
          </div>

          {/* Körper (Single-Source-Inhalt). `gd-desk`/`gd-page` sind unterhalb von 1280 px
              `display: contents` — dort landet GuideBody wie eh und je direkt im Scroller. */}
          <div className="gd-scroll flex-1 overflow-y-auto overlay-card px-4 pb-8" style={{ overscrollBehavior: "contain" }}>
            <div className="gd-desk">
              {wide && (
                /* Wie `.up-nav` im Baum: die Spalte endet an ihrem Inhalt, sie wird NICHT auf volle
                   Höhe gezogen. Die zweite Zeile ist kein neuer Text, sondern der Kern des Kreislaufs
                   aus den Leitfaden-Daten (`loop.center`) — vier Zeilen, die den Archetyp benennen. */
                <nav className="gd-nav as-ring as-ring-quiet" aria-label={t("guide.nav.archetypes")}>
                  <i className="as-ring-run" aria-hidden="true" />
                  <div className="gd-navhead">{t("guide.nav.archetypes")}</div>
                  {ARCHETYPE_ORDER.map((k) => {
                    const m = archMeta(k);
                    const c = m.color || FACTION_GLOW[k];
                    const centre = guideDef(k).loop.center;
                    return (
                      <button key={k} type="button" onClick={() => setActive(k)} role="tab" aria-selected={k === active}
                        className={`gd-navrow${k === active ? " is-on" : ""}`} style={{ "--c": c }}>
                        <ArchIcon meta={m} size={22} />
                        <span className="gd-navtext"><b>{m.label}</b><i>{centre[0]} · {centre[1]}</i></span>
                      </button>
                    );
                  })}
                  <div className="gd-navnote">{t("guide.nav.note")}</div>
                </nav>
              )}
              <section className="gd-page as-ring as-ring-quiet">
                <i className="as-ring-run" aria-hidden="true" />
                {wide && (
                  <div className="gd-page-h" style={{ "--c": activeMeta.color }}>
                    <span className="gd-page-eyebrow"><ArchIcon meta={activeMeta} size={17} />{activeMeta.label}</span>
                    <span className="gd-page-hint">{guideDef(active).subtitle}</span>
                  </div>
                )}
                <GuideBody archetype={active} showTitle={!wide} showSubtitle={!wide} />
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  ));
}

// Drop-in: der beschriftete Knopf + das selbstverwaltete Overlay. `onOpenChange` meldet den Zustand
// nach oben (falls ein Aufrufer den Lauf einfrieren will — in der Skill-Auswahl nicht nötig, dort ist der Lauf eh angehalten).
export function GuidePanel({ className = "", style, onOpenChange, initial }) {
  const [open, setOpen] = useState(false);
  const set = (v) => { setOpen(v); onOpenChange?.(v); };
  return (
    <>
      <GuideButton onClick={() => set(true)} className={className} style={style} />
      {open && <GuideOverlay onClose={() => set(false)} initial={initial} />}
    </>
  );
}
