import { useMemo, useRef, useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { glossaryCategories, glossaryGroups, glossaryEntries, tokenizeGlossary } from "../i18n/glossaryText.js";
import { useLocale } from "../i18n/useLocale.js"; // #sprache: Neuaufbau bei Sprachwechsel
import { t } from "../i18n/index.js";
import { useEscape } from "./useEscape.js";
import { useIsWide } from "./useIsWide.js"; // #desktop: Spalte statt Chip-Leiste
import { useTabSwipe } from "./useSwipeTabs.js"; // Kategorie-Wechsel per Swipe
import { FactionIcon, FACTION_ICON_SRC, GlossaryIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
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
      data-hint-anchor="glossar"
      className={"gloss-i-btn " + className}
      style={style}
    >
      i
    </button>
  );
}

// Reihenfolge der Archetyp-Gruppen — sprachunabhängig, deshalb aus den Schlüsseln selbst.
const GROUP_ORDER = ["gen", "fire", "lightning", "ice", "plant"];

/* Das durchsuchbare, kategorisierte Overlay.

   #glossar-desktop (18.08.2026) — ab 1280 px ist das kein Modal mehr, sondern ein gerahmter Screen
   wie Upgrade-Baum, Werkstatt und Leitfaden: Kategorien als Navigationsspalte, Suche in der Kopfzeile,
   Begriffe im Spaltenfluss. Die `gl-*`-Klassen sind reine HAKEN — unterhalb von 1280 px tragen sie
   keine Darstellung (`display: contents` in index.css), die Handy-Fassung bleibt DOM- und pixelgleich.

   #gl-sprung (19.08.2026): Eine Kategorie ist jetzt auf BEIDEN Breiten dasselbe — eine SPRUNGMARKE.
   Zwischenzeitlich filterte die stehende Spalte (eine Zeile, eine Seite, wie im Leitfaden); das nahm
   dem Glossar aber genau das, was ein Nachschlagewerk ausmacht: an einer Stelle landen und weiterlesen,
   auch über die Kategoriegrenze hinaus. Unterschiedlich bleibt nur, WELCHER Scroller bewegt wird. */
export function GlossaryOverlay({ onClose }) {
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const bodyRef = useRef(null);      // der Scroller der Handy-Fassung
  const deskBodyRef = useRef(null);  // der Scroller der Desktop-Seite (auf dem Handy `display: contents`)
  const secRefs = useRef({});
  const wide = useIsWide();
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

  /* #gl-sprung (19.08.2026): Eine Kategorie ist auf BEIDEN Breiten ein Sprungziel, kein Filter mehr.
     Der Filter nahm dem Glossar genau das, was ein Nachschlagewerk ausmacht — man landet an einer
     Stelle und liest weiter, auch über die Kategorie hinaus. Wer nur eine Kategorie sehen will, hat
     dafür die Suche. Die Spalte markiert jetzt, wohin zuletzt gesprungen wurde. */
  const shown = sections;
  const hitCount = (catId) => entries.filter((e) => e.category === catId && match(e)).length;
  const shownCount = shown.reduce((n, s) => n + s.items.length, 0);
  const activeMeta = activeCat === "all" ? null : glossaryCategories().find((c) => c.id === activeCat) || null;
  // Der Zähler im Kopf zählt, was die Überschrift daneben verspricht: die Sprungmarke oder alles.
  const headCount = activeMeta ? hitCount(activeCat) : shownCount;

  const jump = (catId) => {
    setActiveCat(catId);
    if (q) setQ("");
    const el = catId === "all" ? null : secRefs.current[catId];
    const scroller = wide ? deskBodyRef.current : bodyRef.current;
    if (!el) { if (scroller) scroller.scrollTop = 0; return; }
    /* Auf dem Desktop scrollt der EIGENE Scroller (`.gl-body` im Panel), nicht der nächste beliebige
       Vorfahr: `scrollIntoView` würde zusätzlich das Panel und den Rahmen darunter verschieben. Auf dem
       Handy bleibt es bei `scrollIntoView` — dort ist der Scroller der Kartenrumpf, und die Fassung
       wird in diesem Umbau nicht angefasst. */
    if (wide && scroller) {
      const ziel = scroller.scrollTop + el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      scroller.scrollTo({ top: Math.max(0, ziel), behavior: "smooth" });
    } else if (el.scrollIntoView) {
      el.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  };
  /* Tippen schaltet auf „Alle": sonst liegt ein Treffer hinter einem Filter, den man selbst gesetzt
     und vergessen hat (im Mockup lag „Serie" als 1 von 6 Treffern vor mir). Die Zähler in der Spalte
     bleiben stehen und laden zum Nachschärfen ein. Nur auf dem Desktop nötig — auf dem Handy filtert
     die Kategorie ohnehin nicht. */
  const search = (v) => { setQ(v); if (wide && v.trim()) setActiveCat("all"); };
  // Kategorie-Reihenfolge (mit „Alle" vorn) für den horizontalen Swipe → nächste/vorige Kategorie (springt + scrollt).
  const catOrder = ["all", ...glossaryCategories().map((c) => c.id)];
  const catSwipe = useTabSwipe(catOrder, activeCat, jump);

  return overlayPortal((
    <div className="fixed inset-0 overlay-root z-[60]" role="dialog" aria-modal="true" aria-label={t("glossary.title")}>
      <div className="gl-dim absolute inset-0" style={{ background: "rgba(6,6,10,.66)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div className="gl-frame absolute inset-0 overlay-safe flex items-start sm:items-center justify-center p-3 sm:p-6 pointer-events-none">
        {/* #deckui: neutrale Modal-Schale zieht den Rahmen-Verlauf aus der aktiven Deckfarbe (Fallback Violett). */}
        <div className="gl-card pointer-events-auto w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden overlay-card as-panel as-panel-deck relative"
          style={{ maxHeight: "92dvh", ...MODAL_CARD, boxShadow: "0 30px 80px -30px #000" }} {...catSwipe}>
          <TopHairline />

          {/* Kopf: Titel + Schließen + Suche. Ab 1280 px wird aus den drei gestapelten Bändern EINE
              Rasterzeile (Titel · Suche · Schließen) — dasselbe Raster wie `.up-head`/`.gd-head`.
              Die Suche steht dort in der Spalte, in der der Leitfaden seine Auskunft zeigt: sie ist
              das wichtigste Werkzeug des Glossars und hing bisher im mitscrollenden Kopf. */}
          <div className="gl-head px-4 pt-3.5 pb-2.5 flex-none" style={{ borderBottom: "1px solid var(--ed-base)", background: STICKY_HEAD_BG }}>
            <div className="gl-headrow flex items-center gap-2.5">
              <span className="gl-title flex items-center gap-2.5">
                <span className="gloss-i-mark">i</span>
                {/* #deckui: Titel-Akzent in Deckfarbe (Fallback = bisheriges Pastellviolett). */}
                <h2 className="text-body-5 font-bold tracking-[0.28em] uppercase" style={{ color: "var(--deck-a1, #d8d2f2)" }}>{t("glossary.title")}</h2>
              </span>
              <ActionButton kind="secondary" className="gl-close ml-auto" onClick={onClose}>{t("common.close")}</ActionButton>
            </div>
            <div className="gl-hint text-meta-1 mt-0.5 ml-8 tracking-wide" style={{ color: "#71717c" }}>{t("glossary.subtitle")}</div>
            <div className="gl-search relative mt-2.5">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-body-lg-5" style={{ color: "#5c5c68" }}>⌕</span>
              <input value={q} onChange={(e) => search(e.target.value)} autoComplete="off" spellCheck={false}
                placeholder={t("glossary.search")}
                className="w-full py-2 pl-8 pr-8 rounded-lg text-body-lg-5 gloss-search"
                style={{ background: "#0f0f14", border: "1px solid #33333e", color: "#e8e8ea" }} />
              {q && (
                <button type="button" onClick={() => setQ("")} aria-label={t("glossary.clear")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-body-lg-5 px-1" style={{ color: "#71717c" }}>✕</button>
              )}
            </div>
            {/* Die Haarlinie der Karte sitzt an deren Ecke; ohne Kartenfläche braucht der Kopf eine eigene. */}
            {wide && <div className="gl-hair" aria-hidden="true" />}
          </div>

          {/* Kategorie-Chips (Sprungnavigation) — ab 1280 px übernimmt die Spalte links (`.gl-tabs`). */}
          <div className="gl-tabs flex flex-nowrap sm:flex-wrap gap-1.5 px-4 py-2.5 flex-none overflow-x-auto sm:overflow-x-visible as-chiprow" style={{ borderBottom: "1px solid var(--ed-base)" }}>
            <Chip label={t("glossary.all")} active={activeCat === "all"} onClick={() => jump("all")} />
            {glossaryCategories().map((c) => (
              <Chip key={c.id} label={c.label} dot={c.color} active={activeCat === c.id} onClick={() => jump(c.id)} />
            ))}
          </div>

          {/* Körper: Sektionen. `gl-desk`/`gl-page`/`gl-body`/`gl-cols` sind unterhalb von 1280 px
              `display: contents` — dort landen die Sektionen wie eh und je direkt im Scroller. */}
          <div ref={bodyRef} className="gl-scroll flex-1 overflow-y-auto overlay-card pb-8" style={{ overscrollBehavior: "contain" }}>
            <div className="gl-desk">
              {wide && (
                /* Wie `.up-nav`/`.gd-nav`: die Spalte endet an ihrem Inhalt, sie wird NICHT auf volle
                   Höhe gezogen. Der Zähler je Kategorie ist der Grund, warum die Suche über alles
                   greifen darf, ohne den Überblick zu kosten. */
                <nav className="gl-nav as-ring as-ring-quiet" aria-label={t("glossary.nav.categories")}>
                  <i className="as-ring-run" aria-hidden="true" />
                  <div className="gl-navhead">{t("glossary.nav.categories")}</div>
                  <NavRow label={t("glossary.all")} color="#8f8fa0" count={entries.filter(match).length}
                          on={activeCat === "all"} onClick={() => jump("all")} />
                  {glossaryCategories().map((c) => (
                    <NavRow key={c.id} label={c.label} color={c.color} count={hitCount(c.id)}
                            on={activeCat === c.id} onClick={() => jump(c.id)} />
                  ))}
                  <div className="gl-navnote">{t("glossary.nav.note")}</div>
                </nav>
              )}
              <section className="gl-page as-ring as-ring-quiet">
                <i className="as-ring-run" aria-hidden="true" />
                {wide && (
                  <div className="gl-page-h" style={{ "--c": activeMeta ? activeMeta.color : "var(--deck-a1, #8a7de0)" }}>
                    <span className="gl-page-eyebrow">
                      <span className="gl-sq" />{activeMeta ? activeMeta.label : t("glossary.allTitle")}
                    </span>
                    <span className="gl-page-hint">
                      {query ? t("glossary.hits", { q: q.trim() }) : (activeMeta ? activeMeta.hint : t("glossary.subtitle"))}
                    </span>
                    <span className="gl-page-count ty-num-sm">{t("glossary.count", { count: headCount })}</span>
                  </div>
                )}
                <div ref={deskBodyRef} className="gl-body">
                  {shown.length === 0 && (
                    <div className="px-5 py-9 text-center text-body-lg-5" style={{ color: "#71717c" }}>
                      {/* #deckui: hervorgehobener Suchbegriff als reiner Chrome-Akzent → Deckfarbe (Fallback bisher). */}
                      {t("glossary.noHit.pre")} <b style={{ color: "var(--deck-a1, #c9c2ea)" }}>„{q.trim()}“</b>.<br />{t("glossary.noHit.post")}
                    </div>
                  )}
                  {shown.map(({ cat, items, groups }) => (
                    <section key={cat.id} ref={(el) => (secRefs.current[cat.id] = el)} className="gl-sec px-4 pt-3.5" style={{ scrollMarginTop: "6px" }}>
                      {/* #gl-sprung: Die Überschrift steht IMMER. Sie war früher im gefilterten Zustand
                          Wiederholung des Seitenkopfs; seit die Kategorie nur noch ein Sprungziel ist,
                          stehen alle Sektionen untereinander und brauchen jede ihre eigene Marke —
                          sonst weiß man nach dem Scrollen nicht mehr, wo man gelandet ist. */}
                      <div className="gl-sechead flex items-center gap-2 mb-0.5">
                        <span className="gl-sq w-2.5 h-2.5 rounded-sm" style={{ background: cat.color }} />
                        {/* #deckui: Sektions-Titel-Akzent → Deckfarbe. Die Bedeutung trägt der Kategorie-Punkt (cat.color) daneben, der bleibt. */}
                        <h3 className="text-meta-1 tracking-[0.24em] uppercase font-bold" style={{ color: "var(--deck-a1, #b9b3cf)" }}>{cat.label}</h3>
                        <span className="gl-secrule flex-1 h-px max-w-[54px]" style={{ background: "linear-gradient(90deg,#33333e,transparent)" }} />
                        <span className="text-meta-1 tabular-nums" style={{ color: "#71717c" }}>{items.length}</span>
                      </div>
                      {groups
                        ? groups.map(({ g, meta, items: gi }) => (
                            <div key={g}>
                              <div className="gl-grouphead mt-2 mb-0.5 text-meta-1 tracking-[0.14em] uppercase flex items-center gap-1.5" style={{ color: "#7d7790" }}>
                                {FACTION_ICON_SRC[g] ? <FactionIcon type={g} size={13} /> : <span className="text-body-5">{meta.icon}</span>}{meta.label}
                              </div>
                              <div className="gl-cols">{gi.map((e) => <TermRow key={e.id} e={e} />)}</div>
                            </div>
                          ))
                        : <div className="gl-cols">{items.map((e) => <TermRow key={e.id} e={e} />)}</div>}
                    </section>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  ));
}

/* Eine Zeile der Desktop-Navigationsspalte. Bau wie `.gd-navrow` im Leitfaden; der Zähler rechts ist
   der Zusatz, den das Glossar braucht — er beantwortet beim Suchen die Frage „wo liegen die Treffer?",
   ohne dass man jede Kategorie durchklicken muss. Kategorien ohne Treffer bleiben stehen (`is-empty`,
   ausgegraut) statt zu verschwinden: eine Spalte, deren Zeilen beim Tippen wandern, kann man nicht lesen. */
function NavRow({ label, color, count, on, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`gl-navrow${on ? " is-on" : ""}${count ? "" : " is-empty"}`} style={{ "--c": color }}>
      <span className="gl-navdot" />
      <span className="gl-navlabel">{label}</span>
      <span className="gl-navcount ty-num-sm">{count}</span>
    </button>
  );
}

function Chip({ label, dot, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      /* #kante: eckig statt Pille — an einer runden Form würde die linke Kante zur Sichel. */
      className={"as-chip flex-none whitespace-nowrap text-meta-3 tracking-wide px-2.5 py-1 rounded-md" + (active ? " as-chip-on" : "")}>
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
      <span className="gl-ticon flex-none text-center w-4 leading-6 inline-flex items-center justify-center" style={{ color: e.color }}><GlossaryIcon e={e} size={14} textClass="text-body-lg-3" /></span>
      <div className="min-w-0">
        <div className="gl-tname font-bold text-body-3 leading-tight" style={{ color: e.color }}>{e.label}</div>
        <div className="gl-ttext text-meta-4 leading-relaxed mt-0.5" style={{ color: "#a9a9b6" }}>{e.text}</div>
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
