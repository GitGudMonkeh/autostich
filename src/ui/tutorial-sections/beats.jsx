// Die Proberunden des freigegebenen Entwurfs, 1:1 portiert (Mockup proberunden.html).
import {
  FormationenSzene, UeberSzene, KatsSzene, RaritaetSzene,
  BlitzkarteSzene, TippsSzene, LegendaerSzene,
  FeuerkartenSzene, SchmiedeSzene, HitzeSzene, PflanzkarteSzene, PflanztempoSzene,
  GruenfeldSzene, GletscherSzene, GletscherformenSzene, SchneeSzene,
  DistriktSzene, StrukturenSzene, PunkteSzene,
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

/* Katalog → Komponente. Der Katalog nennt nur einen NAMEN, damit er React-frei bleibt.
   Runde 3, Q17 (Owner): die Bausteine der gestrichenen Lektionen (Grundlagen, Fortgeschritten,
   Architekt-Mocks, Deck-Streifen, Leitfaden-Verweise) sind mit ihren Lektionen entfernt. */
export const PROBES = {
  formation: FormationenSzene,
  struktur: DistriktSzene,
  strukturen: StrukturenSzene,
  kategorien: KatsSzene,
  raritaet: RaritaetSzene,
  legendaer: LegendaerSzene,
  blitzkarte: BlitzkarteSzene,
  // Dieselbe Form, zwei Archetypen: eine Karte, eine wachsende Zahl, drei Schwellen.
  pflanzkarte: PflanzkarteSzene,
  pflanztempo: PflanztempoSzene,
  gletscher: GletscherSzene,
  hitze: HitzeSzene,
  feuerkarten: FeuerkartenSzene,
  schmiede: SchmiedeSzene,
  gruenfeld: GruenfeldSzene,
  gletscherformen: GletscherformenSzene,
  schnee: SchneeSzene,
  meilenstein: PunkteSzene,
  tipps: TippsSzene,
  /* Dieselbe Flaeche wie `formation`, andere Ausgangslage. GESUCHT statt geraten: von 29.988
     brauchbaren Lagen ist diese eine, in der KEIN Tausch den Wert senkt und vier davon eine
     Ueberlappung schaffen. Start ×1,25 (eine Wiederholung), erreichbar ×4,96 mit einer Karte in
     drei Formationen. Ein Probierfeld, das den Leser fuer den offensichtlichen Zug bestraft,
     lehrt das Gegenteil. */
  overlap: UeberSzene,
};
