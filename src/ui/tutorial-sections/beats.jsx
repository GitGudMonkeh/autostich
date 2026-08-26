import { useState } from "react";
import { useLocale } from "../../i18n/useLocale.js"; // #sprache: Neuberechnung bei Sprachwechsel
import { fmtNum } from "../../i18n/index.js"; // Dezimaltrennzeichen je Sprache — nie toFixed+replace
import { buildDeck } from "../../game/deck.js";
import { SEGMENT_SIZE } from "../../game/formations.js";
import * as C from "../../game/constants.js";
import { ARCHETYPE_META } from "../../game/skills.js";
// Die Proberunden des freigegebenen Entwurfs, 1:1 portiert (Mockup proberunden.html).
import {
  StichSzene, KampfwertSzene, SerieSzene, ScoreSzene, LaufmockSzene, BilanzSzene,
  BrettSzene, KarteSzene, FormationenSzene, UeberSzene, KatsSzene, RaritaetSzene,
  BlitzkarteSzene, TippsSzene, LegendaerSzene,
  FeuerkartenSzene, SchmiedeSzene, HitzeSzene, PflanzkarteSzene, PflanzzeichenSzene,
  GruenfeldSzene, GletscherSzene, GletscherfeldSzene,
  ArchmockSzene, HauptaktionSzene, WohinSzene, EndscreenSzene, PunkteSzene, BaumSzene,
  LaengeSzene, SegmenteSzene, BuildSzene,
} from "./scenes.jsx";

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
  formation: FormationenSzene,
  streak: StreakProbe,
  score: ScoreSzene,
  struktur: WohinSzene,
  bauen: HauptaktionSzene,
  archmock: ArchmockSzene,
  kategorien: KatsSzene,
  raritaet: RaritaetSzene,
  legendaer: LegendaerSzene,
  blitzkarte: BlitzkarteSzene,
  // Dieselbe Form, zwei Archetypen: eine Karte, eine wachsende Zahl, drei Schwellen.
  pflanzkarte: PflanzkarteSzene,
  pflanzzeichen: PflanzzeichenSzene,
  gletscher: GletscherSzene,
  hitze: HitzeSzene,
  feuerkarten: FeuerkartenSzene,
  schmiede: SchmiedeSzene,
  gruenfeld: GruenfeldSzene,
  gletscherfeld: GletscherfeldSzene,
  gomock: EndscreenSzene,
  meilenstein: PunkteSzene,
  baum: BaumSzene,
  laenge: LaengeSzene,
  segmente: SegmenteSzene,
  glutbuild: (p) => <BuildSzene {...p} kopfKey="tut.sz.b1" />,
  klingebuild: (p) => <BuildSzene {...p} warm kopfKey="tut.sz.b2" />,
  deckstrip: ({ caption }) => <Bild cards={START_ORDER.map((i) => DECK[i])} caption={caption} />,
  // Bezeichner ohne Bindestrich: ein zitierter Schlüssel wäre im Wächter nicht als Name erkennbar.
  guideFire: (p) => <GuideLink {...p} arch="fire" />,
  guideLightning: (p) => <GuideLink {...p} arch="lightning" />,
  guideIce: (p) => <GuideLink {...p} arch="ice" />,
  guidePlant: (p) => <GuideLink {...p} arch="plant" />,
  // Dieselbe Runde, zwei Lektionen: einmal nur der Vergleich, einmal mit gesetztem Stichwert.
  tipps: TippsSzene,
  duell: StichSzene,
  kampfwert: KampfwertSzene,
  serie: SerieSzene,
  laufmock: LaufmockSzene,
  herkunft: BilanzSzene,
  aufstellen: BrettSzene,
  kartenteile: KarteSzene,
  /* Dieselbe Flaeche wie `formation`, andere Ausgangslage. GESUCHT statt geraten: von 29.988
     brauchbaren Lagen ist diese eine, in der KEIN Tausch den Wert senkt und vier davon eine
     Ueberlappung schaffen. Start ×1,25 (eine Wiederholung), erreichbar ×4,96 mit einer Karte in
     drei Formationen. Ein Probierfeld, das den Leser fuer den offensichtlichen Zug bestraft,
     lehrt das Gegenteil. */
  overlap: UeberSzene,
};
export { SEGMENT_SIZE };
