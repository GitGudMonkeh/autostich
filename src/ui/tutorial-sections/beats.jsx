import { useMemo, useState } from "react";
import { useLocale } from "../../i18n/useLocale.js"; // #sprache: Neuberechnung bei Sprachwechsel
import { formationName } from "../../i18n/labels.js";
import { fmtNum } from "../../i18n/index.js"; // Dezimaltrennzeichen je Sprache — nie toFixed+replace
import { buildDeck } from "../../game/deck.js";
import { computeFormations, summarizeFormations, SEGMENT_SIZE } from "../../game/formations.js";
import * as C from "../../game/constants.js";
import { ARCHETYPE_META } from "../../game/skills.js";
import { COLS, posOf, boardFactorMap, completedStructures } from "../../game/architect.js";

/* DIE VIER TAKT-ARTEN. Mehr gibt es nicht (planning-report.md §1.2); ein fünfter braucht erst einen
   Eintrag in docs/design-sprache.md §11.

   Die Maße unten sind gemessen, nicht geraten — im Produktionsbuild bei 390 × 844, nachvollziehbar
   mit docs/workstreams/tutorial-sections/tutorial-plan/evidence/measure.mjs. Wer hier eine Zahl
   ändert, ändert das Budget in catalog.js mit. */

// design-sprache.md §1 — die ZEILE: neutraler Grund IN einem getönten Panel. Kein zweites Panel.
const ZEILE = {
  background: "rgba(15,15,21,.72)",
  border: "1px solid rgba(150,150,170,.12)",
  borderRadius: 8,
};
const HAIR = "1px solid rgba(150,150,170,.14)";
const LABEL = {
  textTransform: "uppercase", letterSpacing: ".14em", color: "#5c5c68", fontWeight: 600,
};

export function Satz({ text }) {
  return <p className="tut-beat tut-satz text-body-lg-5" style={{ color: "#c8c8d0", lineHeight: 1.5, margin: "0 0 14px" }}>{text}</p>;
}

/* Der Tipp hängt an einer LINIE, nie in einem eigenen Kasten — design-sprache.md §1,
   „Kein Panel im Panel": eine Abschluss-Sektion trennt eine Linie nach oben ab. */
export function Tip({ label, text }) {
  return (
    <div className="tut-beat tut-tip" style={{ borderTop: HAIR, marginTop: 16, paddingTop: 12 }}>
      <div className="text-meta-1" style={{ ...LABEL, letterSpacing: ".18em", color: "var(--deck-a1, #8a7de0)", marginBottom: 5 }}>{label}</div>
      <p className="text-body-lg-5" style={{ color: "#e8e8ea", margin: 0, lineHeight: 1.45, fontWeight: 600 }}>{text}</p>
    </div>
  );
}

/* ---- Karten-Streifen: fünf Positionen = EIN Segment ----
   Gemessen: fünf Zellen über die 364-px-Inhaltsbreite ergeben 54,8 × 78,3 px — lesbar und tippbar.
   Zehn wären 27 px breit. Dass die lesbare Breite genau SEGMENT_SIZE ist, ist der Grund, warum die
   Formations-Lektionen Segment und Formation in EINEM Bild zeigen statt in zweien. */
const SUIT_COLOR = { H: "#c0433f", D: "#c0433f", S: "#3f6cc0", C: "#3f6cc0" };
const suitColor = (c) => SUIT_COLOR[c?.suit] || "#33333e";

function CardCell({ card, on, onClick, dim }) {
  const border = dim ? "#33333e" : suitColor(card);
  const cls = "tut-cell text-body-lg-6 flex items-center justify-center font-bold";
  const style = {
    flex: "1 1 0", minWidth: 0, aspectRatio: "0.7", borderRadius: 6, color: "#e8e8ea",
    background: "linear-gradient(180deg,#242433,#1a1a26)",
    border: `1px solid ${border}`,
    outline: on ? `2px solid var(--deck-a1,#8a7de0)` : undefined,
    outlineOffset: on ? -2 : undefined,
  };
  if (!onClick) return <div className={cls} style={style}>{card.value}</div>;
  return <button type="button" className={cls} style={style} onClick={onClick} aria-pressed={on ? "true" : "false"}>{card.value}</button>;
}

export function Bild({ cards, caption }) {
  return (
    <div className="tut-beat tut-bild" style={{ margin: "0 0 14px" }}>
      <div style={{ display: "flex", gap: 6 }}>
        {cards.map((c) => <CardCell key={c.id} card={c} dim />)}
      </div>
      {caption && <div className="text-meta-1" style={{ color: "#71717c", marginTop: 6 }}>{caption}</div>}
    </div>
  );
}

/* ---- Das Probierfeld ----
   Der Kern der Sektion: der Leser ordnet um, und die Ablesung darunter kommt aus DERSELBEN reinen
   Funktion, die im Lauf rechnet. Keine Nachbildung, kein zweiter Wahrheitsort — planning-report.md
   §1.3. Ändert sich das Balancing, ändert sich die Lektion mit, ohne dass jemand daran denkt.

   `compute(order)` reicht der Aufrufer herein; dieser Baustein weiß nichts über Formationen. */
export function Probierfeld({ title, hint, cards, order, onSwap, readoutLabel, readout }) {
  const [sel, setSel] = useState(null);
  const tap = (i) => {
    if (sel === null) { setSel(i); return; }
    if (sel === i) { setSel(null); return; }
    onSwap(sel, i);
    setSel(null);
  };
  return (
    <div className="tut-beat tut-probe" style={{ margin: "0 0 14px", padding: "12px 12px 11px", ...ZEILE }}>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 8 }}>{title}</div>
      {/* Tippen-Tippen statt Ziehen: eine 55-px-Zelle in einem scrollenden Overlay verliert jeden
          Drag-Wettstreit gegen den Scroller (der Karten-Scroller setzt overscroll-behavior: contain). */}
      <div className="tut-probe-row" style={{ display: "flex", gap: 6 }}>
        {order.map((di, i) => (
          <CardCell key={`${di}-${i}`} card={cards[di]} on={sel === i} onClick={() => tap(i)} />
        ))}
      </div>
      <div className="tut-probe-out" style={{ marginTop: 10, paddingTop: 9, borderTop: HAIR, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="text-meta-1" style={LABEL}>{readoutLabel}</span>
        <span className="text-body-lg-5" style={{ color: "#e8e8ea", fontWeight: 700 }}>{readout}</span>
      </div>
      {hint && <div className="text-meta-1" style={{ color: "#71717c", marginTop: 7, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

/* ---- der Formations-Probierbaustein ----
   EIN Aufrufort für computeFormations, geteilt von jeder Lektion, die ihn braucht. Drei Aufrufstellen,
   die auseinanderlaufen, sind der Defekt, den docs/text-style-guide.md §4 unter „Einen Text an EINER
   Stelle bauen" beschreibt — hier dieselbe Regel, eine Ebene tiefer.

   Neutraler Aufruf: keine Rollen, keine Perks, keine Skills, keine Anker, kein Architekt. Eine Lektion
   lehrt die Grundregel; was ein Perk daran biegt, steht auf der Perk-Karte. */
const DECK = buildDeck();
/* Die Ausgangslage lehrt mit, und das ist keine Kleinigkeit.

   Erster Versuch war 9,9,4,9,4 — dort stand schon ×1,88, und der naheliegende Zug (drei Neunen
   nebeneinander) SENKTE den Wert auf ×1,50: zwei sich überlappende Formationen schlagen eine längere.
   Ein Probierfeld, das den Leser für den offensichtlichen Zug bestraft, lehrt das Gegenteil von dem,
   was es soll.

   Diese Lage steht bei ×1,00 — „keine Formation". Von den zehn möglichen Tauschen erzeugen SECHS
   eine, und keiner kann es schlechter machen, weil es nichts zu verlieren gibt. Gemessen, nicht
   geschätzt: die Kandidaten wurden über computeFormations durchgerechnet. */
const START_ORDER = [26, 18, 24, 15, 20];   // Werte 7 · 9 · 5 · 6 · 1

export function FormationProbe({ title, hint, readoutLabel, noneLabel }) {
  /* formationName() liest die aktive Sprache intern (wie glossaryEntries im Glossar) → der Locale
     muss als Trigger in die Abhängigkeiten, sonst bliebe der Name beim Sprachwechsel stehen. */
  const [locale] = useLocale();
  const [order, setOrder] = useState(START_ORDER);
  const swap = (a, b) => setOrder((o) => { const n = o.slice(); [n[a], n[b]] = [n[b], n[a]]; return n; });

  const readout = useMemo(() => {
    const per = computeFormations(order, DECK);
    const { count, maxMult } = summarizeFormations(per);
    if (!count) return noneLabel;
    // Der Name kommt aus dem Register (i18n/labels.js), nie als Literal — text-style-guide.md §4.
    const first = per.find((p) => p.formations.length)?.formations[0];
    const name = first ? formationName(first.type) : "";
    /* fmtNum, NICHT toFixed(2).replace(".", ",") — das hätte das deutsche Dezimalkomma fest
       verdrahtet und im englischen Build „×1,50" statt „×1.50" gezeigt (i18n.md §4). */
    return `${name} · ×${fmtNum(maxMult.toFixed(2), locale)}`;
  }, [order, noneLabel, locale]);

  return (
    <Probierfeld title={title} hint={hint} cards={DECK} order={order}
      onSwap={swap} readoutLabel={readoutLabel} readout={readout} />
  );
}

/* ---- Serien-Probierfeld ----
   Kein Brett, ein Regler: die Serie hat keine Geometrie. Der Faktor kommt aus den Konstanten, nicht
   aus einer Tabelle im Text — bewegt das Balancing STREAK_BASE_STEP, bewegt sich die Lektion mit. */
export function StreakProbe({ title, hint, readoutLabel }) {
  const [locale] = useLocale();
  const [n, setN] = useState(6);
  const mult = Math.min(C.STREAK_BASE_CAP, n * C.STREAK_BASE_STEP);
  return (
    <div className="tut-beat tut-probe" style={{ margin: "0 0 14px", padding: "12px 12px 11px", ...ZEILE }}>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 10 }}>{title}</div>
      <input type="range" min="0" max="80" value={n} onChange={(e) => setN(Number(e.target.value))}
        className="tut-slider" style={{ width: "100%" }} aria-label={title} />
      <div className="tut-probe-out" style={{ marginTop: 10, paddingTop: 9, borderTop: HAIR, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="text-meta-1" style={LABEL}>{readoutLabel}</span>
        <span className="text-body-lg-5" style={{ color: "#e8e8ea", fontWeight: 700 }}>
          {n} · ×{fmtNum((1 + mult).toFixed(2), locale)}
        </span>
      </div>
      {hint && <div className="text-meta-1" style={{ color: "#71717c", marginTop: 7, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

/* ---- Score-Ketten-Probierfeld ----
   Die vier Faktoren als Schalter, das Produkt live. Die Lektion, in der sichtbar wird, WARUM ein
   Formations-Multiplikator auf einem verlorenen Stich nichts wert ist. */
const CHAIN = [
  { id: "streak", f: 1.3 }, { id: "crit", f: C.CRIT_BASE_MULT },
  { id: "form", f: 1.5 }, { id: "build", f: 1.35 },
];
export function ScoreProbe({ title, hint, readoutLabel, labels }) {
  const [locale] = useLocale();
  const [on, setOn] = useState({ streak: true, crit: false, form: false, build: false });
  const total = CHAIN.reduce((p, c) => p * (on[c.id] ? c.f : 1), C.SCORE_PER_WIN);
  return (
    <div className="tut-beat tut-probe" style={{ margin: "0 0 14px", padding: "12px 12px 11px", ...ZEILE }}>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {CHAIN.map((c) => (
          <button key={c.id} type="button" onClick={() => setOn((o) => ({ ...o, [c.id]: !o[c.id] }))}
            aria-pressed={on[c.id] ? "true" : "false"}
            className="tut-chip text-body-5 font-bold"
            style={{ flex: "1 1 0", minWidth: 0, minHeight: 44, borderRadius: 8, padding: "6px 8px",
              color: on[c.id] ? "#e8e8ea" : "#8a8a95",
              background: on[c.id] ? "rgba(150,150,170,.14)" : "rgba(15,15,21,.72)",
              border: `1px solid ${on[c.id] ? "var(--deck-a1,#8a7de0)" : "rgba(150,150,170,.12)"}` }}>
            {(labels || {})[c.id] || c.id}
          </button>
        ))}
      </div>
      <div className="tut-probe-out" style={{ marginTop: 10, paddingTop: 9, borderTop: HAIR, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="text-meta-1" style={LABEL}>{readoutLabel}</span>
        <span className="text-body-lg-5" style={{ color: "#e8e8ea", fontWeight: 700 }}>{fmtNum(Math.round(total), locale)}</span>
      </div>
      {hint && <div className="text-meta-1" style={{ color: "#71717c", marginTop: 7, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

/* ---- Architekt-Probierfeld ----
   Ein AUSSCHNITT des Bretts. Das volle Brett wäre allein rund 500 px hoch und risse das 400-px-Budget
   einer Lektion. ZWEI Zeilen reichen: eine volle Zeile ist eine Struktur, die zweite zeigt den
   Nachbarn für den Distrikt. Der Satz sagt, wie groß das Brett wirklich ist.
   Drei Zeilen waren der erste Versuch — GEMESSEN 486 px für die Lektion, also 86 px über Budget.

   Die Faktoren kommen aus boardFactorMap/completedStructures in src/game/architect.js — dieselbe
   Rechnung wie im Lauf. Nachgebaut wird nichts. */
const PROBE_ROWS = 2;
export function BoardProbe({ title, hint, readoutLabel, noneLabel }) {
  const [locale] = useLocale();
  const [cells, setCells] = useState([]);
  const toggle = (p) => setCells((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]));

  const { factor, structures } = useMemo(() => {
    // Jede belegte Zelle als eigenes einzelliges Gebäude derselben Sorte — die kleinste ehrliche
    // Eingabe, die structure/district wirklich rechnen lässt.
    const buildings = cells.map((p) => ({ footprint: [p], cat: "value" }));
    const map = boardFactorMap(buildings);
    const f = cells.length ? Math.max(...cells.map((p) => map[p] || 1)) : 1;
    return { factor: f, structures: completedStructures(new Set(cells)).length };
  }, [cells]);

  return (
    <div className="tut-beat tut-probe" style={{ margin: "0 0 14px", padding: "12px 12px 11px", ...ZEILE }}>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS},1fr)`, gap: 4 }}>
        {Array.from({ length: PROBE_ROWS * COLS }, (_, i) => {
          const p = posOf(Math.floor(i / COLS), i % COLS);
          const on = cells.includes(p);
          return (
            <button key={p} type="button" onClick={() => toggle(p)} aria-pressed={on ? "true" : "false"}
              style={{ aspectRatio: "1", minWidth: 0, borderRadius: 6,
                background: on ? "rgba(59,125,190,.34)" : "linear-gradient(180deg,#242433,#1a1a26)",
                border: `1px solid ${on ? "#3b7dbe" : "#33333e"}` }} />
          );
        })}
      </div>
      <div className="tut-probe-out" style={{ marginTop: 10, paddingTop: 9, borderTop: HAIR, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="text-meta-1" style={LABEL}>{readoutLabel}</span>
        <span className="text-body-lg-5" style={{ color: "#e8e8ea", fontWeight: 700 }}>
          {structures || factor > 1 ? `×${fmtNum(factor.toFixed(2), locale)}` : noneLabel}
        </span>
      </div>
      {hint && <div className="text-meta-1" style={{ color: "#71717c", marginTop: 7, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

/* ---- Leitfaden-Verweis ----
   KEINE fünfte Takt-Art: er belegt den Bild-Platz. Die Archetyp-Lektionen VERLINKEN den Leitfaden,
   statt ihn abzuschreiben — die Arbeitsteilung aus tutorial-guided-run-plan.md §1, und der Grund,
   warum es hier nur einen Verweis und keinen zweiten Strategietext gibt. */
export function GuideLink({ caption, arch, onOpenGuide }) {
  const meta = ARCHETYPE_META[arch];
  return (
    <button type="button" className="tut-beat tut-bild tut-guidelink block w-full text-left"
      onClick={() => onOpenGuide?.(arch)}
      style={{ margin: "0 0 14px", padding: "12px 13px", minHeight: 44, ...ZEILE,
        border: `1px solid ${meta ? meta.color + "55" : "rgba(150,150,170,.12)"}` }}>
      <span className="text-body-4 font-semibold" style={{ color: meta ? meta.color : "#e8e8ea" }}>{caption}</span>
    </button>
  );
}

/* Katalog → Komponente. Der Katalog nennt nur einen NAMEN, damit er React-frei bleibt. */
export const PROBES = {
  formation: FormationProbe,
  streak: StreakProbe,
  score: ScoreProbe,
  board: BoardProbe,
  deckstrip: ({ caption }) => <Bild cards={START_ORDER.map((i) => DECK[i])} caption={caption} />,
  // Bezeichner ohne Bindestrich: ein zitierter Schlüssel wäre im Wächter nicht als Name erkennbar.
  guideFire: (p) => <GuideLink {...p} arch="fire" />,
  guideLightning: (p) => <GuideLink {...p} arch="lightning" />,
  guideIce: (p) => <GuideLink {...p} arch="ice" />,
  guidePlant: (p) => <GuideLink {...p} arch="plant" />,
};
export { SEGMENT_SIZE };
