import { useMemo, useState } from "react";
import { useLocale } from "../../i18n/useLocale.js"; // #sprache: Neuberechnung bei Sprachwechsel
import { formationName, formationAbbr } from "../../i18n/labels.js";
import { fmtNum, t } from "../../i18n/index.js"; // Dezimaltrennzeichen je Sprache — nie toFixed+replace
import { buildDeck } from "../../game/deck.js";
import { computeFormations, summarizeFormations, SEGMENT_SIZE } from "../../game/formations.js";
import { effectivePlayerValue } from "../../game/engine.js";
import * as C from "../../game/constants.js";
// ENERGY_FLOOR, nicht C.FORMATION_ENERGY: siehe die Begründung in vars.js.
import { ENERGY_FLOOR } from "../../game/progression.js";
import { ARCHETYPE_META } from "../../game/skills.js";
import { COLS, ROWS, posOf, rowOf, colOf, boardFactorMap, familyDef, tierNum } from "../../game/architect.js";
// Die Kategoriefarben liegen in der UI-Schicht, nicht im Spielmodul — dieselbe Quelle, die der
// Architekt-Bildschirm nutzt (ArchPanels.jsx, ArchitectScreen.jsx).
import { ARCH_CAT } from "../indicators/vocab.js";

/* DIE TAKT-ARTEN. Vier trugen den ersten Bau, fünf kamen mit den vollen Lektionen dazu; die
   maßgebliche Liste ist BEAT_KINDS in catalog.js, und eine weitere braucht erst einen Eintrag in
   docs/design-sprache.md §11.

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

/* Der beschriftete Kasten — der häufigste Block des freigegebenen Entwurfs.

   Warum ein Kasten und nicht noch ein `Satz`: der Entwurf gliedert eine Lektion in benannte
   Abschnitte („Dein Deck", „Ein Lauf"), und die Beschriftung ist die Gliederung. Als Fließtext
   ohne Rahmen liefen sie ineinander.

   KEIN PANEL IM PANEL (design-sprache.md §1): der Kasten sitzt IM Scroller der Lektion, nicht in
   einem zweiten Rahmen. Er ist eine Zeile mit Kontur, kein Fenster.

   Die Beschriftung ist optional. Ohne sie ist der Kasten der Einleitungsblock, den der Entwurf
   `zeile kern` nennt: derselbe Rahmen, nur ohne Überschrift.

   Die Polsterung steht hier ZAHLENGENAU, weil das Höhenmodell in catalog.js sie nachrechnet:
   12 + 12 Polsterung, 2 Rahmen, 14 Abstand nach unten = 40 px Chrome, die Beschriftung 15 + 6.
   Wer hier eine Zahl ändert, ändert BLOCK_CHROME und BLOCK_LABEL mit. */
export function Block({ label, text }) {
  return (
    <div className="tut-beat tut-block" style={{ ...ZEILE, padding: "12px 14px", margin: "0 0 14px" }}>
      {label ? <div className="text-meta-1" style={{ ...LABEL, marginBottom: 6 }}>{label}</div> : null}
      <p className="text-body-lg-5" style={{ color: "#c8c8d0", margin: 0, lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

/* Der Merksatz: EIN Satz, hervorgehoben, mitten in der Lektion.

   Nicht zu verwechseln mit dem Tipp. Der Tipp schließt ab und steht genau einmal am Ende; ein
   Merksatz steht dort, wo er gebraucht wird, und darf mehrfach vorkommen (design-sprache.md §11). */
export function Merk({ text }) {
  return (
    <p className="tut-beat tut-merk text-body-lg-5" style={{
      color: "#e8e8ea", fontWeight: 600, lineHeight: 1.45, margin: "0 0 14px",
      padding: "10px 12px", borderRadius: 8, borderLeft: "2px solid var(--deck-a1,#8a7de0)",
      background: "rgba(15,15,21,.72)" }}>{text}</p>
  );
}

/* Aufzählung: mehrere Einträge unter EINEM Schlüssel, getrennt durch `·`.

   Warum ein Schlüssel und nicht einer je Eintrag: die Zahl der Einträge gehört zum Text, nicht zum
   Katalog. Eine Sprache, die fünf Phasen in vier Sätzen erklärt, müsste sonst einen Schlüssel leer
   lassen, und ein leerer Schlüssel ist genau das, was der i18n-Wächter als verwaist meldet.

   `nummer` unterscheidet die beiden Arten, die denselben Zeichner teilen: `regeln` zählt mit,
   `liste` setzt einen Punkt. Das Höhenmodell in catalog.js behandelt beide gleich. */
export function Regeln({ text, nummer = false }) {
  const teile = String(text || "").split("·").map((x) => x.trim()).filter(Boolean);
  return (
    <div className="tut-beat tut-regeln" style={{ display: "grid", gap: 6, margin: "0 0 14px" }}>
      {teile.map((zeile, i) => (
        <div key={i} style={{ ...ZEILE, padding: "9px 11px", display: "flex", gap: 9 }}>
          <span className="text-meta-1" style={{ ...LABEL, flex: "none", paddingTop: 2 }}>
            {nummer ? i + 1 : "·"}
          </span>
          <span className="text-body-5" style={{ color: "#c8c8d0", lineHeight: 1.45 }}>{zeile}</span>
        </div>
      ))}
    </div>
  );
}

/* Tabelle: Werte nebeneinander. Zeilen durch `·`, Zellen durch `|` — dieselbe Trennung wie oben,
   damit eine Übersetzung nicht mit zwei verschiedenen Konventionen hantieren muss.

   Die erste Zeile ist der Kopf. Sie SCROLLT waagerecht, wenn sie zu breit wird, statt die Seite
   mitzuziehen: eine Tabelle mit vier Spalten passt bei 390 px nicht immer, und eine Seite, die
   seitlich wackelt, ist schlimmer als eine Tabelle, die es tut.

   Die Zeilenzahl steht ZUSÄTZLICH am Takt (`rows`), weil das Höhenmodell in catalog.js den Text
   nicht kennt. Der Wächter hält beide gegeneinander. */
export function Tabelle({ text }) {
  const zeilen = String(text || "").split("·").map((z) => z.split("|").map((c) => c.trim()));
  if (!zeilen.length) return null;
  const [kopf, ...rest] = zeilen;
  return (
    <div className="tut-beat tut-tabelle" style={{ margin: "0 0 14px", overflowX: "auto", ...ZEILE }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>{kopf.map((c, i) => (
            <th key={i} className="text-meta-1" style={{ ...LABEL, textAlign: i ? "right" : "left", padding: "9px 11px" }}>{c}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rest.map((z, r) => (
            <tr key={r} style={{ borderTop: HAIR }}>
              {z.map((c, i) => (
                <td key={i} className="text-body-5 ty-num-sm"
                  style={{ color: i ? "#e8e8ea" : "#c8c8d0", textAlign: i ? "right" : "left", padding: "8px 11px", whiteSpace: "nowrap" }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
/* DIE FARBE KOMMT AUS DEM SPIEL, nicht aus einer zweiten Tabelle hier.

   Vorher stand hier `{ H, D, S, C }` — Herz, Karo, Pik, Kreuz. Autostich hat aber R, B, G, Y
   (constants.js SUIT_ORDER), also traf der Schlüssel nie, und JEDE Zelle fiel auf den grauen
   Rückfallwert. Aufgefallen ist das erst beim Bauen der Aufstellungs-Sektion: die Lektion über den
   FARBBLOCK lässt sich ohne Farbe nicht lesen.

   Ein zweiter Wahrheitsort für die Farben ist genau der Fehler, den planning-report.md §1.3 für
   die Rechnung beschreibt, eine Ebene tiefer. `suitColor` aus constants.js ist die eine Quelle. */
const cardColor = (c) => (c?.suit ? C.suitColor(c.suit) : "#33333e");

/* `marks` und `mult` zeichnen die ANATOMIE der Karte: unten die Kürzel der Formationen, oben rechts
   der Multiplikator dieser Position. Beides bleibt leer, wo eine Lektion es nicht braucht.

   Ohne sie versprach die Lektion „Was auf einer Karte steht" etwas, das die Karte nicht zeigte —
   sie trug nur ihren Wert, und die Erklärung stand daneben statt darauf. */
function CardCell({ card, on, onClick, dim, marks = null, mult = null }) {
  const border = dim ? "#33333e" : cardColor(card);
  const cls = "tut-cell text-body-lg-6 flex items-center justify-center font-bold";
  const style = {
    flex: "1 1 0", minWidth: 0, aspectRatio: "0.7", borderRadius: 6, color: "#e8e8ea",
    background: "linear-gradient(180deg,#242433,#1a1a26)",
    border: `1px solid ${border}`,
    outline: on ? `2px solid var(--deck-a1,#8a7de0)` : undefined,
    outlineOffset: on ? -2 : undefined,
  };
  const inhalt = marks === null && mult === null ? card.value : (
    <span style={{ position: "relative", display: "block", width: "100%", height: "100%" }}>
      {mult ? <span className="text-meta-1 ty-num-sm" style={{ position: "absolute", top: 2, right: 3, color: "#8a8a95", fontWeight: 600 }}>{mult}</span> : null}
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{card.value}</span>
      {marks ? <span className="text-meta-1" style={{ position: "absolute", bottom: 2, left: 0, right: 0, textAlign: "center", color: "#5c5c68", letterSpacing: ".1em", fontWeight: 600 }}>{marks}</span> : null}
    </span>
  );
  if (!onClick) return <div className={cls} style={style}>{inhalt}</div>;
  return <button type="button" className={cls} style={style} onClick={onClick} aria-pressed={on ? "true" : "false"}>{inhalt}</button>;
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

export function FormationProbe({ title, hint, readoutLabel, noneLabel, start = START_ORDER }) {
  /* formationName() liest die aktive Sprache intern (wie glossaryEntries im Glossar) → der Locale
     muss als Trigger in die Abhängigkeiten, sonst bliebe der Name beim Sprachwechsel stehen. */
  const [locale] = useLocale();
  const [order, setOrder] = useState(start);
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

/* ---- Das Duell: zwei Karten treffen aufeinander ----

   Die erste gespielte Runde des Tutorials. Der Leser tippt, ein Stich läuft ab, das Ergebnis steht
   groß da. Nach vier Stichen ist die Runde zu Ende.

   WAS HIER NICHT NACHGEBAUT IST: der Basiswert je Sieg kommt aus `SCORE_PER_WIN`, der Stichwert
   geht durch `effectivePlayerValue` — dieselbe Funktion, die der Lauf ruft. Nachgebaut ist einzig
   der Vergleich „höher gewinnt, gleich zählt nicht", und der IST die Regel, keine Kopie davon.

   `mitStichwert` schaltet die zweite Lektion: dieselbe Runde, aber der Leser legt vorher einen
   Stichwert auf seine Karte und sieht, dass nur der Kampfwert entscheidet. */
const DUELL = [
  { du: 5, geg: 7, boni: [2, 3] },
  { du: 9, geg: 4, boni: [1, 2] },
  { du: 6, geg: 6, boni: [3, 4] },
  { du: 8, geg: 10, boni: [2, 3] },
];
const AUSGANG = (du, geg) => (du > geg ? "win" : du === geg ? "tie" : "loss");
const AUSGANG_FARBE = { win: "#2f9d55", tie: "#8a8a95", loss: "#c0433f" };

export function DuellProbe({ title, hint, readoutLabel, labels, mitStichwert = false }) {
  const [locale] = useLocale();
  const [i, setI] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [gespielt, setGespielt] = useState(false);
  const [score, setScore] = useState(0);
  const r = DUELL[Math.min(i, DUELL.length - 1)];
  const fertig = i >= DUELL.length;
  const L = labels || {};

  // effectivePlayerValue OHNE Perks: der Stichwert dieser Lektion ist gesetzt, nicht erspielt.
  const kampf = effectivePlayerValue(r.du, [], {}) + bonus;
  const aus = AUSGANG(kampf, r.geg);

  const spielen = () => {
    if (gespielt) {   // zweiter Tipp: weiter zur nächsten Runde
      setI((n) => n + 1); setGespielt(false); setBonus(0); return;
    }
    setGespielt(true);
    if (aus === "win") setScore((s) => s + C.SCORE_PER_WIN);
  };

  return (
    <div className="tut-beat tut-probe" style={{ margin: "0 0 14px", padding: "12px 12px 11px", ...ZEILE }}>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <DuellKarte wert={r.geg} label={L.gegner} />
        <span className="text-meta-1" style={{ ...LABEL, letterSpacing: ".2em" }}>{L.gegen}</span>
        <DuellKarte wert={kampf} label={L.du} hervor={mitStichwert && bonus > 0} />
      </div>

      {mitStichwert && !gespielt && (
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {r.boni.map((b) => (
            <button key={b} type="button" onClick={() => setBonus(bonus === b ? 0 : b)}
              aria-pressed={bonus === b ? "true" : "false"}
              className="tut-chip text-body-5 font-bold"
              style={{ flex: "1 1 0", minHeight: 44, borderRadius: 8, padding: "6px 8px",
                color: bonus === b ? "#e8e8ea" : "#8a8a95",
                background: bonus === b ? "rgba(150,150,170,.14)" : "rgba(15,15,21,.72)",
                border: `1px solid ${bonus === b ? "var(--deck-a1,#8a7de0)" : "rgba(150,150,170,.12)"}` }}>
              {L.trickValue} +{fmtNum(b, locale)}
            </button>
          ))}
        </div>
      )}

      {!fertig && (
        <button type="button" onClick={spielen} className="tut-chip text-body-5 font-bold"
          style={{ width: "100%", minHeight: 44, borderRadius: 8, marginTop: 10, color: "#e8e8ea",
            background: "rgba(150,150,170,.14)", border: "1px solid var(--deck-a1,#8a7de0)" }}>
          {gespielt ? L.next : L.play}
        </button>
      )}

      <div className="tut-probe-out" style={{ marginTop: 10, paddingTop: 9, borderTop: HAIR, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="text-meta-1" style={LABEL}>{readoutLabel}</span>
        <span className="text-body-lg-5" style={{ color: "#e8e8ea", fontWeight: 700 }}>{fmtNum(score, locale)}</span>
        {gespielt && !fertig && (
          <span className="text-body-5 font-bold" style={{ marginLeft: "auto", color: AUSGANG_FARBE[aus] }}>
            {L[aus]}
          </span>
        )}
      </div>
      {hint && <div className="text-meta-1" style={{ color: "#71717c", marginTop: 7, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

function DuellKarte({ wert, label, hervor = false }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 5 }}>{label}</div>
      <div className="text-title-2 flex items-center justify-center font-bold"
        style={{ width: 62, height: 88, borderRadius: 8, color: "#e8e8ea",
          background: "linear-gradient(180deg,#242433,#1a1a26)",
          border: `1px solid ${hervor ? "var(--deck-a1,#8a7de0)" : "#33333e"}` }}>{wert}</div>
    </div>
  );
}

/* ---- Die Serie: vier Stiche, und die Reihenfolge entscheidet ----
   Der Faktor kommt aus STREAK_BASE_STEP, nicht aus einer Tabelle im Text. Anders als das
   Serien-Probierfeld mit dem Regler wird hier GESPIELT: der Leser tauscht zwei Karten und sieht,
   dass dieselben vier Karten je nach Reihenfolge eine Serie halten oder abreißen. */
const SERIE_GEGNER = [4, 8, 3, 9];
const SERIE_START = [7, 5, 6, 2];

export function SerieProbe({ title, hint, readoutLabel, labels }) {
  const [locale] = useLocale();
  const [hand, setHand] = useState(SERIE_START);
  const [sel, setSel] = useState(null);
  const L = labels || {};

  const tap = (i) => {
    if (sel === null) { setSel(i); return; }
    if (sel === i) { setSel(null); return; }
    setHand((h) => { const n = h.slice(); [n[sel], n[i]] = [n[i], n[sel]]; return n; });
    setSel(null);
  };

  /* Die längste Siegesserie der Hand, Stich für Stich. Ein Gleichstand zählt nicht als Sieg und
     bricht die Serie ebenso wie eine Niederlage — dieselbe Regel wie im Lauf. */
  const { best } = useMemo(() => {
    let lauf = 0, b = 0;
    for (let k = 0; k < hand.length; k++) {
      if (hand[k] > SERIE_GEGNER[k]) { lauf += 1; b = Math.max(b, lauf); } else lauf = 0;
    }
    return { best: b };
  }, [hand]);
  const mult = 1 + Math.min(C.STREAK_BASE_CAP, best * C.STREAK_BASE_STEP);

  return (
    <div className="tut-beat tut-probe" style={{ margin: "0 0 14px", padding: "12px 12px 11px", ...ZEILE }}>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 8 }}>{title}</div>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 5 }}>{L.gegner}</div>
      <div style={{ display: "flex", gap: 6 }}>
        {SERIE_GEGNER.map((v, k) => (
          <div key={k} className="tut-cell text-body-lg-6 flex items-center justify-center font-bold"
            style={{ flex: "1 1 0", aspectRatio: "0.7", borderRadius: 6, color: "#8a8a95",
              background: "rgba(15,15,21,.72)", border: "1px solid #33333e" }}>{v}</div>
        ))}
      </div>
      <div className="text-meta-1" style={{ ...LABEL, margin: "9px 0 5px" }}>{L.du}</div>
      <div className="tut-probe-row" style={{ display: "flex", gap: 6 }}>
        {hand.map((v, k) => (
          <button key={k} type="button" onClick={() => tap(k)} aria-pressed={sel === k ? "true" : "false"}
            className="tut-cell text-body-lg-6 flex items-center justify-center font-bold"
            style={{ flex: "1 1 0", aspectRatio: "0.7", borderRadius: 6, color: "#e8e8ea",
              background: "linear-gradient(180deg,#242433,#1a1a26)",
              border: `1px solid ${v > SERIE_GEGNER[k] ? "#2f9d55" : "#c0433f"}`,
              outline: sel === k ? "2px solid var(--deck-a1,#8a7de0)" : undefined, outlineOffset: sel === k ? -2 : undefined }}>
            {v}
          </button>
        ))}
      </div>
      <div className="tut-probe-out" style={{ marginTop: 10, paddingTop: 9, borderTop: HAIR, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="text-meta-1" style={LABEL}>{readoutLabel}</span>
        <span className="text-body-lg-5" style={{ color: "#e8e8ea", fontWeight: 700 }}>
          {best} · ×{fmtNum(mult.toFixed(2), locale)}
        </span>
      </div>
      {hint && <div className="text-meta-1" style={{ color: "#71717c", marginTop: 7, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

/* ---- Der Lauf-Bildschirm: tippen und benennen ----

   Die Lektion, die keinen Mechanismus lehrt, sondern eine LANDKARTE. Der Leser tippt auf einen
   Bereich und liest, was dort steht. Kein Auswendiglernen, kein Text, der neben dem Bildschirm
   herläuft und beim nächsten Layout-Pass falsch ist.

   Die Namen und Erklärungen holt der Baustein sich SELBST aus dem Register — dieselbe Bauweise wie
   `formationName` in i18n/labels.js. Sie gehören zum Bildschirm, nicht zur Lektion: derselbe Kopf
   heißt in jeder Lektion gleich. */
const MOCK_TEILE = ["kopf", "duell", "mult", "stat"];

export function LaufmockProbe({ title, hint, readoutLabel }) {
  const [locale] = useLocale();
  const [sel, setSel] = useState(null);
  const nm = (id) => t(`tut.m.${id}.name`, null, locale);

  return (
    <div className="tut-beat tut-probe" style={{ margin: "0 0 14px", padding: "12px 12px 11px", ...ZEILE }}>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {MOCK_TEILE.map((id) => (
          <button key={id} type="button" onClick={() => setSel(sel === id ? null : id)}
            aria-pressed={sel === id ? "true" : "false"}
            className="tut-mockteil text-body-5 text-left font-semibold"
            style={{ minHeight: 44, borderRadius: 8, padding: "10px 11px",
              color: sel === id ? "#e8e8ea" : "#8a8a95",
              background: sel === id ? "rgba(150,150,170,.14)" : "rgba(15,15,21,.72)",
              border: `1px solid ${sel === id ? "var(--deck-a1,#8a7de0)" : "rgba(150,150,170,.12)"}` }}>
            {nm(id)}
          </button>
        ))}
      </div>
      <div className="tut-probe-out" style={{ marginTop: 10, paddingTop: 9, borderTop: HAIR }}>
        <div className="text-meta-1" style={LABEL}>{readoutLabel}</div>
        <p className="text-body-5" style={{ color: "#c8c8d0", margin: "5px 0 0", lineHeight: 1.45 }}>
          {sel ? t(`tut.m.${sel}.text`, null, locale) : hint}
        </p>
      </div>
    </div>
  );
}

/* ---- Woher der Score kommt: die Kette rückwärts ----

   Die letzte Lektion der Grundlagen fasst zusammen, was die vorigen einzeln gezeigt haben: dass
   ein Score ein PRODUKT ist. Jede Zeile ist ein Faktor, und der Leser schaltet sie einzeln zu.

   Die Basis kommt aus SCORE_PER_WIN, der Crit aus CRIT_BASE_MULT. Serie und Formation stehen als
   Beispielwerte einer gespielten Hand — sie sind kein Balancing, sondern EIN Fall, und deshalb
   hier und nicht in den Konstanten. */
const HERKUNFT = [
  { id: "streak", f: 1.10 }, { id: "form", f: 1.50 }, { id: "crit", f: C.CRIT_BASE_MULT },
];
const HERKUNFT_SIEGE = 4;

export function HerkunftProbe({ title, hint, readoutLabel, labels }) {
  const [locale] = useLocale();
  const [on, setOn] = useState({ streak: false, form: false, crit: false });
  const basis = HERKUNFT_SIEGE * C.SCORE_PER_WIN;
  const total = HERKUNFT.reduce((p, c) => p * (on[c.id] ? c.f : 1), basis);
  const L = labels || {};

  return (
    <div className="tut-beat tut-probe" style={{ margin: "0 0 14px", padding: "12px 12px 11px", ...ZEILE }}>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 2px 8px" }}>
        <span className="text-meta-1" style={LABEL}>{L.wins}</span>
        <span className="text-body-5 font-bold" style={{ color: "#c8c8d0" }}>
          {HERKUNFT_SIEGE} × {fmtNum(C.SCORE_PER_WIN, locale)}
        </span>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {HERKUNFT.map((c) => (
          <button key={c.id} type="button" onClick={() => setOn((o) => ({ ...o, [c.id]: !o[c.id] }))}
            aria-pressed={on[c.id] ? "true" : "false"}
            className="tut-chip text-body-5 font-bold"
            style={{ minHeight: 44, borderRadius: 8, padding: "8px 11px", display: "flex", justifyContent: "space-between",
              color: on[c.id] ? "#e8e8ea" : "#8a8a95",
              background: on[c.id] ? "rgba(150,150,170,.14)" : "rgba(15,15,21,.72)",
              border: `1px solid ${on[c.id] ? "var(--deck-a1,#8a7de0)" : "rgba(150,150,170,.12)"}` }}>
            <span>{L[c.id] || c.id}</span>
            <span>×{fmtNum(c.f.toFixed(2), locale)}</span>
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

/* ---- Aufstellen: tauschen kostet Energie ----

   Das Formations-Feld lässt beliebig oft tauschen. Die echte Aufstellungsphase nicht: jeder Tausch
   kostet eine Energie, und `FORMATION_ENERGY` sagt, wie viele es je Phase sind. Diese Runde ist
   dieselbe Fläche mit der echten Schranke davor, plus Rückgängig und Zurücksetzen.

   Rückgängig gibt die Energie ZURÜCK. Das ist keine Bequemlichkeit, sondern das Verhalten des
   Spiels: ein zurückgenommener Tausch hat nicht stattgefunden. Wer das im Tutorial anders baut,
   lehrt eine Regel, die es nicht gibt. */
const AUF_START = [26, 18, 24, 15, 20];

export function AufstellenProbe({ title, hint, readoutLabel, noneLabel, labels }) {
  const [locale] = useLocale();
  const [verlauf, setVerlauf] = useState([AUF_START]);
  const order = verlauf[verlauf.length - 1];
  const genutzt = verlauf.length - 1;
  const uebrig = ENERGY_FLOOR - genutzt;
  const L = labels || {};

  const swap = (a, b) => {
    if (uebrig <= 0) return;                       // keine Energie, kein Tausch
    setVerlauf((v) => {
      const n = order.slice(); [n[a], n[b]] = [n[b], n[a]];
      return [...v, n];
    });
  };
  const zurueck = () => setVerlauf((v) => (v.length > 1 ? v.slice(0, -1) : v));
  const anfang = () => setVerlauf([AUF_START]);

  const readout = useMemo(() => {
    const { count, maxMult } = summarizeFormations(computeFormations(order, DECK));
    return count ? `×${fmtNum(maxMult.toFixed(2), locale)}` : noneLabel;
  }, [order, noneLabel, locale]);

  return (
    <div className="tut-beat tut-probe" style={{ margin: "0 0 14px", padding: "12px 12px 11px", ...ZEILE }}>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 8 }}>{title}</div>
      <Reihe cards={DECK} order={order} onSwap={swap} gesperrt={uebrig <= 0} />
      <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
        <KnopfKlein text={L.undo} onClick={zurueck} aktiv={genutzt > 0} />
        <KnopfKlein text={L.reset} onClick={anfang} aktiv={genutzt > 0} />
      </div>
      <div className="tut-probe-out" style={{ marginTop: 10, paddingTop: 9, borderTop: HAIR, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="text-meta-1" style={LABEL}>{L.energy}</span>
        <span className="text-body-lg-5" style={{ color: uebrig > 0 ? "#e8e8ea" : "#c0433f", fontWeight: 700 }}>{uebrig}</span>
        <span className="text-meta-1" style={{ ...LABEL, marginLeft: "auto" }}>{readoutLabel}</span>
        <span className="text-body-lg-5" style={{ color: "#e8e8ea", fontWeight: 700 }}>{readout}</span>
      </div>
      {hint && <div className="text-meta-1" style={{ color: "#71717c", marginTop: 7, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

/* Die tippbare Kartenreihe, geteilt von den Aufstellungs-Runden. Tippen-Tippen statt Ziehen, aus
   demselben Grund wie beim Probierfeld: eine 55-px-Zelle verliert jeden Ziehwettstreit gegen den
   Scroller darunter. */
function Reihe({ cards, order, onSwap, gesperrt = false, markiert = null, onTap = null, anatomie = null }) {
  const [sel, setSel] = useState(null);
  const tap = (i) => {
    if (onTap) { onTap(i); return; }
    if (gesperrt) return;
    if (sel === null) { setSel(i); return; }
    if (sel === i) { setSel(null); return; }
    onSwap(sel, i); setSel(null);
  };
  return (
    <div className="tut-probe-row" style={{ display: "flex", gap: 6 }}>
      {order.map((di, i) => (
        <CardCell key={`${di}-${i}`} card={cards[di]} on={onTap ? markiert === i : sel === i} onClick={() => tap(i)}
          marks={anatomie ? anatomie[i].marks : null} mult={anatomie ? anatomie[i].mult : null} />
      ))}
    </div>
  );
}

function KnopfKlein({ text, onClick, aktiv }) {
  return (
    <button type="button" onClick={onClick} disabled={!aktiv}
      className="tut-chip text-body-5 font-semibold"
      style={{ flex: "1 1 0", minHeight: 44, borderRadius: 8, padding: "6px 8px",
        color: aktiv ? "#c8c8d0" : "#5c5c68", background: "rgba(15,15,21,.72)",
        border: "1px solid rgba(150,150,170,.12)", cursor: aktiv ? "pointer" : "default" }}>
      {text}
    </button>
  );
}

/* ---- Was auf einer Karte steht ----

   Kein Umsortieren, nur Hinsehen: der Leser tippt eine Karte an und bekommt aufgeschlüsselt, was
   die Zeichen darauf bedeuten. Die Kürzel kommen aus dem Register (`formationAbbr`), der
   Multiplikator aus `computeFormations` — dieselbe Rechnung wie im Lauf.

   Die Lage ist fest und trägt bewusst MEHRERE Formationen auf einer Karte, sonst hätte die Lektion
   nichts aufzuschlüsseln. */
const KARTE_LAGE = [7, 0, 33, 3, 9];   // R8 R1 Y4 R4 R10

export function KartenteileProbe({ title, hint, readoutLabel, noneLabel, labels }) {
  const [locale] = useLocale();
  const [sel, setSel] = useState(null);
  const L = labels || {};
  const per = useMemo(() => computeFormations(KARTE_LAGE, DECK), []);
  /* Was auf der Karte STEHT: unten die Kürzel ihrer Formationen, oben rechts der Multiplikator
     dieser Position. „×1,00" bleibt weg — eine Karte, die nichts zahlt, soll auch nichts anzeigen,
     und genau das ist der Punkt der Lektion. */
  const anatomie = useMemo(() => per.map((p) => ({
    marks: p.formations.map((x) => formationAbbr(x.type)).join("") || null,
    mult: p.mult > 1 ? `×${fmtNum(p.mult.toFixed(2), locale)}` : null,
  })), [per, locale]);

  const zeile = () => {
    if (sel === null) return hint;
    const karte = DECK[KARTE_LAGE[sel]];
    const f = per[sel]?.formations ?? [];
    const teile = [`${L.cardValue}: ${karte.value}`, `${L.suit}: ${C.suitName(karte.suit)}`];
    if (!f.length) return `${teile.join(" · ")} · ${noneLabel}`;
    const namen = f.map((x) => `${formationAbbr(x.type)} ${formationName(x.type)}`).join(" + ");
    /* `mult` steht JE POSITION, nicht je Formation. Genau darum geht es in dieser Lektion: die
       ersten beiden Karten einer Formation tragen ihr Kürzel und stehen trotzdem bei ×1,00. */
    return `${teile.join(" · ")} · ${namen} · ×${fmtNum(per[sel].mult.toFixed(2), locale)}`;
  };

  return (
    <div className="tut-beat tut-probe" style={{ margin: "0 0 14px", padding: "12px 12px 11px", ...ZEILE }}>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 8 }}>{title}</div>
      <Reihe cards={DECK} order={KARTE_LAGE} markiert={sel} onTap={(i) => setSel(sel === i ? null : i)}
        anatomie={anatomie} />
      <div className="tut-probe-out" style={{ marginTop: 10, paddingTop: 9, borderTop: HAIR }}>
        <div className="text-meta-1" style={LABEL}>{readoutLabel}</div>
        <p className="text-body-5" style={{ color: "#c8c8d0", margin: "5px 0 0", lineHeight: 1.45 }}>{zeile()}</p>
      </div>
    </div>
  );
}

/* ---- Der Architekt: das Brett und die Strukturen ----

   KEIN FREIES ANKLICKEN, und das ist eine Owner-Entscheidung mit einem harten Grund dahinter: das
   alte Brett-Probierfeld setzte jede angetippte Zelle als EINZELLIGES Gebäude. Solche Gebäude gibt
   es im Spiel nicht — keine der 41 Familien hat die Form `single`, die kleinste ist `domino`. Das
   Feld zeigte damit eine Lage, die niemand bauen kann, und über zwei sichtbare Zeilen ließ sich
   ohnehin nie eine Spalte oder Diagonale schließen.

   Stattdessen vier feste Lagen aus ECHTEN Familien. Alle acht Gebäude sind nachgeschlagen, ihre
   Kategorien und Formen stimmen mit ARCHITECT_FAMILIES überein, und die Faktoren kommen aus
   `boardFactorMap` — nachgerechnet ×1,35 · ×1,75 · ×1,62 · ×1,08.

   Die Distrikt-Lage ist der Beleg für die Lektion: dort steht die Struktur bei ×1,00 und der
   Distrikt bei ×1,08. Zwei verschiedene Dinge, und genau das sagt der Tipp. */
const AP = (r, c) => posOf(r, c);
const GEB = (id, familyId, tier, footprint) => ({ id, familyId, tier, footprint });
const ARCH_LAGEN = {
  zeile:    [GEB("a", "A_ZOLLHAUS", 2, [AP(3, 0), AP(3, 1)]),
             GEB("b", "A_RIEGEL", 1, [AP(3, 2), AP(3, 3), AP(3, 4)])],
  spalte:   [GEB("a", "A_REIHENHAUS", 1, [AP(0, 2), AP(1, 2), AP(2, 2), AP(3, 2)]),
             GEB("b", "A_FIRST", 1, [AP(4, 2), AP(5, 2), AP(6, 2), AP(7, 2)])],
  diag:     [GEB("a", "A_LAUFGANG", 1, [AP(1, 0), AP(2, 1), AP(3, 2)]),
             GEB("b", "A_FRIES", 1, [AP(4, 3), AP(4, 4), AP(5, 3), AP(5, 4)])],
  distrikt: [GEB("a", "A_STUETZE", 1, [AP(3, 1), AP(3, 2)]),
             GEB("b", "A_QUADER", 1, [AP(4, 2), AP(4, 3), AP(5, 2), AP(5, 3)])],
};
const ARCH_LAGEN_IDS = ["zeile", "spalte", "diag", "distrikt"];
const ARCH_SEL = AP(3, 2);   // in allen vier Lagen belegt, damit nur die LAGE den Unterschied macht

export function StrukturProbe({ title, hint, readoutLabel, labels }) {
  const [locale] = useLocale();
  const [lage, setLage] = useState("zeile");
  const L = labels || {};
  const geb = ARCH_LAGEN[lage];

  const { faktor, farben } = useMemo(() => {
    const map = boardFactorMap(geb);
    const f = new Map();
    for (const b of geb) {
      const fam = familyDef(b.familyId);
      for (const p of b.footprint) f.set(p, fam ? ARCH_CAT[fam.category]?.color : "#5c5c68");
    }
    return { faktor: map[ARCH_SEL] ?? 1, farben: f };
  }, [geb]);

  return (
    <div className="tut-beat tut-probe" style={{ margin: "0 0 14px", padding: "12px 12px 11px", ...ZEILE }}>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", gap: 5, marginBottom: 9 }}>
        {ARCH_LAGEN_IDS.map((id) => (
          <button key={id} type="button" onClick={() => setLage(id)} aria-pressed={lage === id ? "true" : "false"}
            className="tut-chip text-body-5 font-semibold"
            style={{ flex: "1 1 0", minWidth: 0, minHeight: 44, borderRadius: 8, padding: "5px 4px",
              color: lage === id ? "#e8e8ea" : "#8a8a95",
              background: lage === id ? "rgba(150,150,170,.14)" : "rgba(15,15,21,.72)",
              border: `1px solid ${lage === id ? "var(--deck-a1,#8a7de0)" : "rgba(150,150,170,.12)"}` }}>
            {L[id] || id}
          </button>
        ))}
      </div>
      <Brett farben={farben} markiert={ARCH_SEL} />
      <div className="tut-probe-out" style={{ marginTop: 10, paddingTop: 9, borderTop: HAIR, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="text-meta-1" style={LABEL}>{readoutLabel}</span>
        <span className="text-body-lg-5" style={{ color: "#e8e8ea", fontWeight: 700 }}>×{fmtNum(faktor.toFixed(2), locale)}</span>
        <span className="text-body-5 font-bold" style={{ marginLeft: "auto", color: "#c8c8d0" }}>
          {fmtNum(Math.round(C.SCORE_PER_WIN * faktor), locale)}
        </span>
      </div>
      {hint && <div className="text-meta-1" style={{ color: "#71717c", marginTop: 7, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

/* Das ganze Brett, alle ROWS × COLS. Acht Zeilen sind Pflicht: ohne sie lässt sich eine Spalte
   nicht schließen und eine Diagonale nicht zeigen — der Grund, warum der Vorgänger mit zwei Zeilen
   scheiterte.

   DIE ZELLEN SIND BREITER ALS HOCH, und das ist eine Messung, keine Vorliebe. Quadratisch ergaben
   acht Zeilen 544 px allein fürs Gitter, und beide Architekt-Lektionen rissen mit 1.151 und
   1.159 px ihr Budget. Bei 1,9 sind es rund 300. Die Zellen tragen ohnehin keinen Text, nur Farbe,
   also kostet die flachere Form nichts an Lesbarkeit.

   `zeilen` schneidet das Brett ab, wo eine Lektion nicht das ganze braucht: die Bau-Runde lehrt
   Setzen, Schieben und Drehen und kommt mit vier Zeilen aus. Strukturen brauchen alle acht. */
function Brett({ farben, markiert, zeilen = ROWS }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS},1fr)`, gap: 3 }}>
      {Array.from({ length: zeilen * COLS }, (_, p) => {
        const farbe = farben.get(p);
        return (
          <div key={p} style={{ aspectRatio: "1.9", minWidth: 0, borderRadius: 4,
            background: farbe ? `${farbe}44` : "linear-gradient(180deg,#242433,#1a1a26)",
            border: `1px solid ${farbe || "#2a2a34"}`,
            outline: p === markiert ? "2px solid var(--deck-a1,#8a7de0)" : undefined, outlineOffset: -2 }} />
        );
      })}
    </div>
  );
}

/* ---- Die Hauptaktion: bauen oder aufwerten ----

   Der Tipp der Lektion sagt: gebaut wird sofort beim Antippen, der Platz kommt danach, und
   Verschieben und Drehen kosten nichts. Genau das muss die Runde zeigen, sonst behauptet der Text
   etwas, das der Schirm nicht tut.

   Das Angebot sind ARCHITECT_OFFER echte Baupläne; der Wert je Stufe kommt aus `tierNum`. */
const BAU_ANGEBOT = ["A_ZOLLHAUS", "A_RIEGEL", "A_QUADER"];
const BAU_START = AP(1, 1);
const BAU_ZEILEN = 4;

export function BauenProbe({ title, hint, readoutLabel, noneLabel, labels }) {
  const [locale] = useLocale();
  const [wahl, setWahl] = useState(null);
  const [anker, setAnker] = useState(BAU_START);
  const [gedreht, setGedreht] = useState(false);
  const L = labels || {};

  const fam = wahl ? familyDef(wahl) : null;
  const zellen = useMemo(() => (fam ? formZellen(fam.form, anker, gedreht) : []), [fam, anker, gedreht]);
  const farben = useMemo(() => {
    const m = new Map();
    if (fam) for (const p of zellen) m.set(p, ARCH_CAT[fam.category]?.color || "#5c5c68");
    return m;
  }, [fam, zellen]);

  const schieben = (dr, dc) => setAnker((a) => {
    const r = rowOf(a) + dr, c = colOf(a) + dc;
    if (r < 0 || r >= BAU_ZEILEN || c < 0 || c >= COLS) return a;
    const neu = posOf(r, c);
    const zellen2 = formZellen(fam.form, neu, gedreht);
    return zellen2.length && zellen2.every((p) => p < BAU_ZEILEN * COLS) ? neu : a;
  });

  return (
    <div className="tut-beat tut-probe" style={{ margin: "0 0 14px", padding: "12px 12px 11px", ...ZEILE }}>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", gap: 5, marginBottom: 9 }}>
        {BAU_ANGEBOT.map((id) => {
          const f = familyDef(id), on = wahl === id;
          return (
            <button key={id} type="button" onClick={() => { setWahl(id); setAnker(BAU_START); setGedreht(false); }}
              aria-pressed={on ? "true" : "false"} className="tut-chip text-body-5 font-semibold"
              style={{ flex: "1 1 0", minWidth: 0, minHeight: 44, borderRadius: 8, padding: "5px 4px",
                color: on ? "#e8e8ea" : "#8a8a95",
                background: on ? "rgba(150,150,170,.14)" : "rgba(15,15,21,.72)",
                border: `1px solid ${on ? ARCH_CAT[f.category]?.color || "#8a7de0" : "rgba(150,150,170,.12)"}` }}>
              {f ? f.name : id}
            </button>
          );
        })}
      </div>
      {/* Vier Zeilen reichen: diese Runde lehrt Setzen, Schieben und Drehen. Strukturen kommen
          erst in der nächsten Lektion, und DIE braucht dann das ganze Brett. */}
      <Brett farben={farben} markiert={-1} zeilen={BAU_ZEILEN} />
      {wahl ? (
        <div style={{ display: "flex", gap: 5, marginTop: 9 }}>
          <KnopfKlein text="↑" onClick={() => schieben(-1, 0)} aktiv />
          <KnopfKlein text="↓" onClick={() => schieben(1, 0)} aktiv />
          <KnopfKlein text="←" onClick={() => schieben(0, -1)} aktiv />
          <KnopfKlein text="→" onClick={() => schieben(0, 1)} aktiv />
          <KnopfKlein text={L.rotate} onClick={() => setGedreht((g) => !g)} aktiv />
        </div>
      ) : null}
      <div className="tut-probe-out" style={{ marginTop: 10, paddingTop: 9, borderTop: HAIR, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="text-meta-1" style={LABEL}>{readoutLabel}</span>
        <span className="text-body-lg-5" style={{ color: "#e8e8ea", fontWeight: 700 }}>
          {fam ? `+${fmtNum(tierNum(basisWert(fam), 1), locale)} ${einheit(fam, L)}` : noneLabel}
        </span>
      </div>
      {hint && <div className="text-meta-1" style={{ color: "#71717c", marginTop: 7, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

/* `base` ist ein OBJEKT, kein Zahlwert: `{ kind: "flat", score: 35 }` bei Score-Gebäuden,
   `{ kind: "flat", value: 1 }` bei Wert-Gebäuden. Erst dachte ich, es sei eine Zahl, und die
   Ablesung stand auf NaN. Die Einheit unterscheidet sich mit: Score-Gebäude zahlen Score,
   Wert-Gebäude heben den Kartenwert. */
const basisWert = (fam) => fam.base?.score ?? fam.base?.value ?? 0;
const einheit = (fam, L) => (fam.category === "score" ? L.scoreUnit : L.cardValue);

/* Die Zellen einer Form ab einem Anker. NUR die drei Formen des Angebots — eine vollständige
   Formentabelle gehört nach architect.js, nicht ins Tutorial, und dort steht sie bereits für den
   echten Bau. Hier reicht, was diese eine Runde zeigt. */
function formZellen(form, anker, gedreht) {
  const r = rowOf(anker), c = colOf(anker);
  const rel = {
    domino: gedreht ? [[0, 0], [1, 0]] : [[0, 0], [0, 1]],
    tromino_i: gedreht ? [[0, 0], [1, 0], [2, 0]] : [[0, 0], [0, 1], [0, 2]],
    block2x2: [[0, 0], [0, 1], [1, 0], [1, 1]],
  }[form] || [[0, 0]];
  const out = [];
  for (const [dr, dc] of rel) {
    const rr = r + dr, cc = c + dc;
    if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return [];
    out.push(posOf(rr, cc));
  }
  return out;
}

/* ---- Der Bauphasen-Bildschirm: tippen und benennen ----
   Dieselbe Bauweise wie der Lauf-Bildschirm; die Namen liegen unter `tut.a.*`. */
const ARCH_TEILE = ["kopf", "brett", "plaene", "boost"];

export function ArchmockProbe({ title, hint, readoutLabel }) {
  const [locale] = useLocale();
  const [sel, setSel] = useState(null);
  return (
    <div className="tut-beat tut-probe" style={{ margin: "0 0 14px", padding: "12px 12px 11px", ...ZEILE }}>
      <div className="text-meta-1" style={{ ...LABEL, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {ARCH_TEILE.map((id) => (
          <button key={id} type="button" onClick={() => setSel(sel === id ? null : id)}
            aria-pressed={sel === id ? "true" : "false"}
            className="tut-mockteil text-body-5 text-left font-semibold"
            style={{ minHeight: 44, borderRadius: 8, padding: "10px 11px",
              color: sel === id ? "#e8e8ea" : "#8a8a95",
              background: sel === id ? "rgba(150,150,170,.14)" : "rgba(15,15,21,.72)",
              border: `1px solid ${sel === id ? "var(--deck-a1,#8a7de0)" : "rgba(150,150,170,.12)"}` }}>
            {t(`tut.a.${id}.name`, null, locale)}
          </button>
        ))}
      </div>
      <div className="tut-probe-out" style={{ marginTop: 10, paddingTop: 9, borderTop: HAIR }}>
        <div className="text-meta-1" style={LABEL}>{readoutLabel}</div>
        <p className="text-body-5" style={{ color: "#c8c8d0", margin: "5px 0 0", lineHeight: 1.45 }}>
          {sel ? t(`tut.a.${sel}.text`, null, locale) : hint}
        </p>
      </div>
    </div>
  );
}

/* Katalog → Komponente. Der Katalog nennt nur einen NAMEN, damit er React-frei bleibt. */
export const PROBES = {
  formation: FormationProbe,
  streak: StreakProbe,
  score: ScoreProbe,
  struktur: StrukturProbe,
  bauen: BauenProbe,
  archmock: ArchmockProbe,
  deckstrip: ({ caption }) => <Bild cards={START_ORDER.map((i) => DECK[i])} caption={caption} />,
  // Bezeichner ohne Bindestrich: ein zitierter Schlüssel wäre im Wächter nicht als Name erkennbar.
  guideFire: (p) => <GuideLink {...p} arch="fire" />,
  guideLightning: (p) => <GuideLink {...p} arch="lightning" />,
  guideIce: (p) => <GuideLink {...p} arch="ice" />,
  guidePlant: (p) => <GuideLink {...p} arch="plant" />,
  // Dieselbe Runde, zwei Lektionen: einmal nur der Vergleich, einmal mit gesetztem Stichwert.
  duell: (p) => <DuellProbe {...p} />,
  kampfwert: (p) => <DuellProbe {...p} mitStichwert />,
  serie: SerieProbe,
  laufmock: LaufmockProbe,
  herkunft: HerkunftProbe,
  aufstellen: AufstellenProbe,
  kartenteile: KartenteileProbe,
  /* Dieselbe Flaeche wie `formation`, andere Ausgangslage. GESUCHT statt geraten: von 29.988
     brauchbaren Lagen ist diese eine, in der KEIN Tausch den Wert senkt und vier davon eine
     Ueberlappung schaffen. Start ×1,25 (eine Wiederholung), erreichbar ×4,96 mit einer Karte in
     drei Formationen. Ein Probierfeld, das den Leser fuer den offensichtlichen Zug bestraft,
     lehrt das Gegenteil. */
  overlap: (p) => <FormationProbe {...p} start={[7, 0, 33, 3, 9]} />,
};
export { SEGMENT_SIZE };
