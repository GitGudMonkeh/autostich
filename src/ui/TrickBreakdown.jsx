/* Stich-Aufschlüsselung (§17) — die Faktorenkette des AKTUELLEN Stichs, direkt unter dem Feld.
   Sie war schon einmal da und wurde entfernt („im Spielfluss nicht lesbar", s. Patch Notes pixi-2026-08).
   Zurück kommt sie in der KOMPAKTEN Fassung: Basis × Serie × Perks × Form × Crit (+ Direkt) = Summe,
   ausblendbar über `options.hideBreakdown` (Muster der Floating-Text-Schalter, #389).

   KEINE eigene Rechenlogik: alle Zahlen kommen aus `lastTrick.breakdown`, das die Engine beim Sieg füllt
   (engine.js, „Score-Stapelung §15/§22.7") — eine Quelle für Score UND Anzeige, kein Drift.

   Die Engine-Formel lautet ausgeschrieben:
     (max(0,Basis) × Serie + Serien-Flat) × Perks × Sonnenzorn × Architekt
       × Form × Nachhall × Kern × Crit  +  Direkt-Anteile  =  total
   Damit die Zeile fünf Glieder behält, werden verwandte Faktoren zusammengefasst
   (Perks ← Perk × Sonnenzorn × Architekt · Form ← Form × Nachhall × Kern). Alles, was dadurch nicht
   in der Kette steht — der Serien-Flat samt seiner Multiplikatoren und die post-stack Direkt-Dividenden
   (Glut, Blitz, Pflanze, Gletscher, Vabanque) — landet als EIN „Direkt"-Glied im Rest. Der Rest wird als
   Differenz zur echten Summe gebildet, nicht nachgerechnet: die angezeigte Gleichung geht dadurch IMMER
   auf, auch wenn die Engine später einen Faktor dazubekommt, den diese Datei nicht kennt. */
import { t, fmtNum } from "../i18n/index.js"; // #sprache
import { fmtScoreShort } from "./format.js";

const fmtMult = (x) => fmtNum(Math.round(x * 100) / 100);

// Schwellen: ein Faktor gilt als „wirkt" ab 1,005 (unter 0,5 % wäre die gerundete Anzeige „×1,00" — reines Rauschen),
// ein Rest ab einem ganzen Punkt. Faktoren UNTER 1 (Ballast, Architekt-Risiko) zeigen wir ebenfalls — sie kosten Score.
const actsMult = (x) => Math.abs(x - 1) > 0.005;

const CHAIN_COLOR = {
  base:   "#c8c8d2", // additive Basis (Grundwert + Flats) — neutral, sie trägt keinen Multiplikator
  streak: "#d4a63a", // Serie: dasselbe Gold wie der Score
  perks:  "#8a7de0", // Perk-/Familien-Multiplikatoren (+ Sonnenzorn, Architekt-Score-Bauten)
  form:   "#5ab87a", // Formationen (+ Nachhall, Kern) — Formations-Grün des Feldes
  crit:   "#e879f9", // Crit — identisch zu CRIT_COLOR im Battlefield
  direct: "#59b9c6", // Direkt-Score, der am Stack vorbeiläuft
};

/* Ein Glied der Kette: winziges Label + Wert. `title` trägt die Langfassung für den Hover. */
function Link({ label, value, color, title }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap" title={title}>
      <span className="opacity-45 uppercase tracking-wide" style={{ fontSize: 9 }}>{label}</span>
      <span className="font-bold ty-num" style={{ color }}>{value}</span>
    </span>
  );
}

const Op = ({ children }) => <span className="opacity-30" style={{ fontSize: 10 }}>{children}</span>;

/* `trick` = state.lastTrick. Ohne Sieg (Niederlage/Gleichstand/vor dem ersten Stich) gibt es keinen
   Breakdown → die Zeile bleibt leer. Die feste Höhe hält der Aufrufer, damit nichts springt. */
export function TrickBreakdown({ trick = null }) {
  const b = trick && trick.breakdown;
  if (!b) return null;

  const base = (b.base || 0) + (b.flats || 0);
  const streakMult = b.streakMult || 1;
  // Perks/Sonnenzorn/Architekt-Score-Bauten sind alle „Build-Multiplikatoren" — ein Glied.
  const perkMult = (b.perkMult || 1) * (b.sunwrathMult || 1) * (b.architectMult || 1);
  // Formation + ihre beiden Meta-Faktoren Nachhall (F6) und Formationskern (F-L1).
  const formMult = (b.formMult || 1) * (b.afterglowMult || 1) * (b.coreMult || 1);
  const critMult = b.critMult || 1;
  const total = b.total || 0;
  // Rest = alles, was die fünf Glieder nicht tragen (Serien-Flat mit seinen Multiplikatoren + Direkt-Dividenden).
  // Als Differenz gebildet → die angezeigte Gleichung stimmt per Konstruktion.
  const chain = Math.max(0, base) * streakMult * perkMult * formMult * critMult;
  const rest = total - chain;

  const links = [
    { key: "base", label: t("bf.bd.base"), value: fmtScoreShort(base), color: CHAIN_COLOR.base, title: t("bf.bd.base.title") },
  ];
  const push = (key, label, mult, title) => {
    if (!actsMult(mult)) return;
    links.push({ key, label, value: `×${fmtMult(mult)}`, color: CHAIN_COLOR[key], title, op: "×" });
  };
  push("streak", t("bf.bd.streak"), streakMult, t("bf.bd.streak.title"));
  push("perks",  t("bf.bd.perks"),  perkMult,   t("bf.bd.perks.title"));
  push("form",   t("bf.bd.form"),   formMult,   t("bf.bd.form.title"));
  push("crit",   t("bf.bd.crit"),   critMult,   t("bf.bd.crit.title"));
  // Schwelle relativ zur Summe: bei sehr großen Stichen frisst die Fließkomma-Auflösung sonst irgendwann
  // einen ganzen Punkt und die Zeile zeigte ein „+1", das es gar nicht gibt.
  if (Math.abs(rest) >= Math.max(1, Math.abs(total) * 1e-9))
    links.push({ key: "direct", label: t("bf.bd.direct"), value: `${rest < 0 ? "−" : "+"}${fmtScoreShort(Math.abs(rest))}`,
                 color: CHAIN_COLOR.direct, title: t("bf.bd.direct.title"), op: "+" });

  return (
    // Auf schmalen Geräten eine Stufe kleiner — die Kette soll auch mit sechs Gliedern in EINE Zeile passen.
    <div className="flex items-baseline justify-center gap-1.5 leading-none text-[10px] sm:text-[11px]"
      aria-label={t("bf.bd.aria")}>
      {links.map((l, i) => (
        <span key={l.key} className="inline-flex items-baseline gap-1.5">
          {i > 0 && <Op>{l.op}</Op>}
          <Link label={l.label} value={l.value} color={l.color} title={l.title} />
        </span>
      ))}
      <Op>=</Op>
      <Link label={t("bf.bd.total")} value={fmtScoreShort(total)} color={CHAIN_COLOR.streak} title={t("bf.bd.total.title")} />
    </div>
  );
}
