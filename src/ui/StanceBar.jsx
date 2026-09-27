/* Prisma (Haltungen) — Feld-Panel. „Wie weit bis zum Wechsel, wer klingt, was wirkt dadurch?"
   (docs/haltungen-fraktion.md §3, Entwurf vom Owner abgenommen). Drei Dinge, eine Zeile je Farbe:

     • der Zähler als Felder — so viele, wie die SCHWELLE verlangt (Beschleunigung senkt sie, die Spur
       wird dann kürzer), gefüllt = gewonnene Stiche dieser GRUNDFARBE,
     • rechts daneben die Zahl, wie viele Stiche noch fehlen,
     • der Zustand: „Aktiv" oder „Nachklang n" — die Zeile leuchtet in beiden Fällen gleich stark,
       weil eine abgelöste Haltung auf voller Stärke weiterwirkt (§2).

   Die AKTIVE Zeile trägt bewusst KEINE Zahl: ihr Zähler läuft weiter und fällt bei der Schwelle
   zurück, aber ein Selbst-Auslösen ist kein Wechsel (stance.js, stanceTick) — eine Zahl dort würde
   einen Wechsel versprechen, den es nicht gibt.

   „Wirkt gerade" zeigt nur, was läuft (wie Pflanze/Feuer): je klingende Haltung ihr Passiv, dazu die
   laufenden Skill-Fenster. Die Zahlen darin sind LIVE — Verankerung hebt den Satz, Beharrlichkeit den
   Multiplikator. Eine feste Zahl im Panel wäre dieselbe Falle wie bei Spalier/Verwachsung in der
   Formations-Legende (§6.23/§6.26): das Panel zeigt sonst etwas anderes, als der Motor verrechnet.

   Rein informativ, keine Engine-Kopplung (spiegelt state.stance). */
import { FactionShell, PanelSkills } from "./indicators/panelKit.jsx";
import { PRISM } from "./indicators/vocab.js";
import { STANCE_SUITS, ringsNow, ringCount, rundeLift, stanceParam, anklangScore, stanceLevel,
  stanceCritStep, stanceGreenStep, stanceScoreStep,
  uebertragMult, genugtuungScore, lichtbandCap, S } from "../game/factions/stance.js";
import { suitColor, STANCE_THRESHOLD, STANCE_SCALE_MAX } from "../game/constants.js";
import { t, fmtNum } from "../i18n/index.js"; // #sprache
import { archetypeLabel } from "../i18n/labels.js";

const SUNK = "#26262e";  // leeres Zählfeld — dieselbe versenkte Fläche wie in den anderen Leisten
const MUTE = "#8a8a92";  // stumme Farbe (klingt nicht)
const num = (x) => fmtNum(Math.round(x * 100) / 100);
// Die Staffel dritteln lässt keine glatten Zahlen übrig: der Crit-Satz steht auf eine, der Formations-Satz auf
// drei Stellen, damit 16,7 % und 0,033 nicht beide zu „0,03" bzw. „17" gerundet werden.
const pct1 = (x) => fmtNum(Math.round(x * 1000) / 10);
const rate3 = (x) => fmtNum(Math.round(x * 1000) / 1000);
const suitLabel = (s) => t(`suit.${s}.name`);

/* Das Fraktions-Icon ist ein Platzhalter (Owner: offen) — vier Viertel in den vier Grundfarben, aus
   den Farbverläufen gebaut statt als Asset. Kein neues Glyph: die Farben sind die des Decks. */
function PrismIcon({ size = 15 }) {
  const q = (deg, s) => `linear-gradient(${deg}deg, ${suitColor(s)} 0 50%, transparent 50% 100%)`;
  return (
    <span aria-hidden="true" style={{ display: "inline-block", width: size, height: size, borderRadius: 3, opacity: 0.92,
      background: [q(135, "R"), q(225, "B"), q(45, "G"), q(315, "Y")].join(", ") }} />
  );
}

export function StanceBar({ active, stance = null, skills = [], skillTiers = {}, showSkills = false,
                            options = {}, onOption, manyActive = false }) {
  const st = stance;
  if (!active || !st?.active) return null;

  const einklang = ringCount(st) === STANCE_SUITS.length;
  // Die Schale trägt die Farbe der AKTIVEN Haltung (Owner) — im Einklang sind es alle vier, also weiß.
  const fac = einklang ? PRISM : suitColor(st.stance);

  /* Kopf-Chip: die eingeklappte Antwort. Mit vier Fraktionen ist die Bank meistens zu, und dann sind
     genau zwei Dinge gefragt — welche Haltung trägt und welche Farbe als nächste zündet. Die aktive
     zählt dabei nicht mit: sie kann sich nicht selbst ablösen. */
  let next = null;
  for (const s of STANCE_SUITS) {
    if (s === st.stance) continue;
    const gap = st.threshold - (st.counts?.[s] || 0);
    if (!next || gap < next.gap) next = { s, gap };
  }
  const stateText = einklang ? t("bar.stance.einklang")
    : t("bar.stance.state", { stance: suitLabel(st.stance), next: suitLabel(next.s), n: next.gap });
  const stateOn = einklang || next.gap <= 1;

  const collapsed = options.collapseFacStance ?? manyActive;
  const onToggle = () => onOption && onOption({ collapseFacStance: !collapsed });

  /* Die vier Passive, jedes mit dem Wert, mit dem der Motor gerade rechnet (s. Dateikopf) — seit der Staffel
     (2026-09-27) heißt das auch: mit der Stufe, auf der die Fraktion gerade steht. */
  const blueCrit = stanceCritStep(skills);
  const greenRate = stanceGreenStep(skills) + (stanceParam(skills, skillTiers, S.VERANKERUNG, "plus") || 0);
  const yellowMult = stanceScoreStep(skills) + (stanceParam(skills, skillTiers, S.BEHARRLICHKEIT, "perTrick") || 0) * (st.ranFor?.Y || 0);
  const fx = [
    // Rot hebt eine Stufe — im Einklang hebt Runde so viele, wie der Ausgang braucht (§6.20).
    ringsNow(st, "R") && ["R", rundeLift(st, skills, skillTiers) ? t("bar.stance.fx.R.all") : t("bar.stance.fx.R")],
    ringsNow(st, "B") && ["B", t("bar.stance.fx.B", { pct: pct1(blueCrit) })],
    ringsNow(st, "G") && ["G", t("bar.stance.fx.G", { rate: rate3(greenRate) })],
    ringsNow(st, "Y") && ["Y", t("bar.stance.fx.Y", { mult: num(yellowMult) })],
  ].filter(Boolean);

  /* Die laufenden Skill-Fenster — dieselbe Zeile, aber neutral gefärbt: sie hängen am Skill, nicht an
     der Haltung. Jedes liest seinen Wert aus dem Fraktions-Modul, keine Regel wird hier zweitgeschrieben. */
  const uebertrag = uebertragMult(st, skills, skillTiers);
  const genugtuung = genugtuungScore(st, skills, skillTiers);
  const lichtband = lichtbandCap(st, skills);
  const sk = [
    anklangScore(st, skills, skillTiers) > 0 && t("bar.stance.sk.anklang", { n: st.echo }),
    (st.guard || 0) > 0 && t("bar.stance.sk.rueckhalt", { n: st.guard }),
    uebertrag > 0 && t("bar.stance.sk.uebertrag", { v: num(uebertrag) }),
    genugtuung > 0 && t("bar.stance.sk.genugtuung", { v: fmtNum(Math.round(genugtuung)) }),
    lichtband > 0 && t("bar.stance.sk.lichtband", { pct: fmtNum(Math.round(lichtband * 100)) }),
  ].filter(Boolean);

  return (
    <FactionShell anchor="faction-stance" icon={<PrismIcon />} name={archetypeLabel("stance")} color={fac}
      stateText={stateText} stateOn={stateOn} collapsed={collapsed} onToggle={onToggle}
      footer={showSkills ? <PanelSkills skills={skills} arch="stance" color={fac} /> : null}>
      {/* Hauptelement: eine Zeile je Grundfarbe, feste Reihenfolge R · B · G · Y. */}
      <div>
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-micro-3 uppercase tracking-wide opacity-55">{t("bar.stance.stances")}</span>
          {/* Die Schwelle steht nur da, wenn Beschleunigung sie gesenkt hat — sonst zählt man die Felder. */}
          <span className="text-meta-1 opacity-50">
            {st.threshold !== STANCE_THRESHOLD ? t("bar.stance.base.threshold", { n: st.threshold }) : t("bar.stance.base")}
          </span>
        </div>
        <div className="grid" style={{ gap: 3 }}>
          {STANCE_SUITS.map((s) => {
            const c = suitColor(s);
            const on = ringsNow(st, s);
            const act = st.stance === s;
            const won = st.counts?.[s] || 0;
            const left = st.threshold - won;
            const echo = st.ring?.[s] || 0;
            return (
              <div key={s} className="grid items-center rounded-lg px-1.5 py-1"
                title={t(act ? "bar.stance.row.active" : "bar.stance.row",
                  { suit: suitLabel(s), won, need: st.threshold, left })}
                style={{ gridTemplateColumns: "8px 32px 58px 14px 1fr auto", gap: 7,
                         background: on ? `${c}12` : "transparent",
                         border: `1px solid ${on ? `${c}2a` : "transparent"}` }}>
                <span className="rounded-full" style={{ width: 8, height: 8, border: `1.5px solid ${c}`,
                  background: on ? c : "transparent", boxShadow: on ? `0 0 5px ${c}` : undefined }} />
                <span className="text-meta-3" style={{ color: on ? c : MUTE, fontWeight: act ? 600 : 400 }}>{suitLabel(s)}</span>
                {/* Gefüllt = gewonnen; der nächste Schritt ist umrandet. Die aktive Haltung zählt gedämpft
                    weiter — ihr Zähler fällt bei der Schwelle zurück, ohne zu wechseln. */}
                <span className="flex" style={{ gap: 3 }}>
                  {Array.from({ length: st.threshold }, (_, i) => (
                    <span key={i} style={{ width: 9, height: 8, borderRadius: 2,
                      background: i < won ? (act ? `${c}88` : c) : SUNK,
                      border: `1px solid ${i === won && !act ? `${c}88` : "transparent"}` }} />
                  ))}
                </span>
                <span className="text-meta-3 font-bold tabular-nums text-right"
                  style={{ color: on ? c : MUTE }}>{act ? "" : left}</span>
                <span />
                {act ? (
                  <span className="text-micro-3 font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 text-center whitespace-nowrap"
                    style={{ background: c, color: "#141019", minWidth: 58 }}>{t("bar.stance.active")}</span>
                ) : echo > 0 ? (
                  <span className="text-micro-3 font-semibold rounded px-1.5 py-0.5 text-center whitespace-nowrap"
                    style={{ background: `${c}1e`, color: c, border: `1px solid ${c}3a`, minWidth: 58 }}>{t("bar.stance.echo", { n: echo })}</span>
                ) : <span style={{ minWidth: 58 }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Was daraus gerade wirkt — so viele farbige Chips, wie Haltungen klingen. */}
      <div className="pt-2 border-t" style={{ borderColor: SUNK }}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-micro-3 uppercase tracking-wide opacity-55">{t("bar.stance.now")}</span>
          {/* Auf welcher Stufe Blau, Grün und Gelb stehen — ein Drittel je gehaltenem Prisma-Skill. */}
          <span className="text-meta-1 opacity-50">{t("bar.stance.level", { n: stanceLevel(skills), max: STANCE_SCALE_MAX })}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {fx.map(([s, text]) => (
            <span key={s} className="text-meta-1 rounded px-1.5 py-0.5 whitespace-nowrap"
              style={{ background: `${suitColor(s)}14`, color: suitColor(s), border: `1px solid ${suitColor(s)}3a` }}>{text}</span>
          ))}
          {sk.map((text) => (
            <span key={text} className="text-meta-1 font-semibold rounded px-1.5 py-0.5 whitespace-nowrap"
              style={{ background: "#20202a", color: MUTE, border: `1px solid #33333e` }}>{text}</span>
          ))}
        </div>
        {/* Der eine laute Moment: vier Farben zugleich sind weiß. */}
        {einklang && (
          <div className="text-micro-3 font-semibold uppercase tracking-wide rounded text-center mt-1.5 py-0.5"
            style={{ color: "#141019", background: `linear-gradient(90deg, ${suitColor("R")}, ${suitColor("Y")}, ${suitColor("G")}, ${suitColor("B")})` }}>
            {t("bar.stance.einklang")}
          </div>
        )}
      </div>
    </FactionShell>
  );
}
