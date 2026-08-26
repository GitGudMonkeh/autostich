/* ============================================================
   TUTORIAL-SZENEN — die Proberunden des freigegebenen Entwurfs, 1:1 portiert.

   Quelle ist das Artefakt „Autostich Proberunden" (Mockup proberunden.html im Workstream
   tutorial-sections/tutorial-plan). Jede Szene hier entspricht einer Szenenfunktion des
   Entwurfs (A, B, C, …) — mit denselben Kartenwerten, denselben Timings und derselben
   Optik (scenes.css trägt die Klassen des Entwurfs unter dem Präfix .tsz).

   Was der Entwurf vorgerechnet hatte (FORMTAB), rechnet hier die ECHTE Engine:
   computeFormations, STREAK_BASE_STEP, CRIT_BASE_MULT und die Register kommen aus
   src/game/** — Zahlen im Text sind interpoliert, nie abgetippt.

   Texte: alles Sichtbare läuft über t() mit Schlüsseln unter `tut.sz.*` in allen vier
   Katalogen. Wörter, die die Schale ohnehin liefert (Sieg/Niederlage, Gegner/Du, …),
   kommen aus `tut.d.*` — dieselbe Quelle wie in beats.jsx, kein Zweittext.
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { useLocale } from "../../i18n/useLocale.js"; // #sprache: Neuberechnung bei Sprachwechsel
import { fmtNum, fmtPct, t } from "../../i18n/index.js";
import * as C from "../../game/constants.js";
import { FAMILY_DEFS } from "../../game/families.js";
import { PERK_DEFS } from "../../game/perks.js";
import { computeFormations, summarizeFormations } from "../../game/formations.js";
import { familyDef, perkDef, perkCat, formationName, formationAbbr, rarityLabel, nodeDef } from "../../i18n/labels.js";
import { TIER_META, ROMAN } from "../../game/rarity.js";
import { ENERGY_FLOOR } from "../../game/progression.js";
import { perkCatArt, legendaryPerkArt } from "../perkArt.js";
import { VARS } from "./vars.js";
import "./scenes.css";

/* Der Serien-Faktor mit zwei Nachkommastellen im Zahlformat der Sprache (×1,10 / ×1.10).
   fmtNum statt toFixed+replace — dieselbe Begründung wie buildingText.js:36. */
const f2 = (x) => fmtNum(x.toFixed(2));

/* **fett** im Katalogtext → <b>. Die Szenentexte tragen Halbfett an den Zahlen, wie der
   Entwurf sein <b> in .eq und .hint setzt; ein eigener Mini-Parser statt dangerouslySetInnerHTML. */
export function rich(s) {
  const parts = String(s ?? "").split(/\*\*([^*]+)\*\*/g);
  return parts.map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p));
}

/* Eine Karte des Entwurfs: .karte k-<Farbe> mit Wert, optional dim/w/l/t/sel. */
function Karte({ v, s, cls = "", onClick, badge, kuerzel }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} className={`karte k-${s} ${cls}`} onClick={onClick}>
      {v}
      {badge != null && <span className="badge">{badge}</span>}
      {kuerzel != null && <span className="kuerzel">{kuerzel}</span>}
    </Tag>
  );
}

/* Timer-Kette wie die setTimeout-Folgen des Entwurfs; räumt beim Unmount auf. */
function useTimer() {
  const ref = useRef(null);
  useEffect(() => () => clearTimeout(ref.current), []);
  return {
    set(fn, ms) { clearTimeout(ref.current); ref.current = setTimeout(fn, ms); },
    clear() { clearTimeout(ref.current); },
  };
}

const WIN = C.SCORE_PER_WIN;
const STEP = C.STREAK_BASE_STEP;
const CRIT = C.CRIT_BASE_MULT;

/* ── Szene A · Der Stich (Entwurf Schirm 1) ─────────────────────
   Vier Stiche laufen von selbst, alle 1350 ms einer. Nur der aktuelle Stich ist hell,
   das Ergebnis steht in der res-Zeile, der Score summiert. */
const A_O = [[3, "B"], [2, "R"], [6, "R"], [4, "G"]];
const A_Y = [[8, "R"], [5, "B"], [6, "G"], [9, "Y"]];

export function StichSzene({ hint, labels: L }) {
  useLocale();
  const timer = useTimer();
  const [st, setSt] = useState({ i: -1, marks: [], tot: 0, done: false, running: false });

  const start = () => {
    timer.clear();
    const marks = [];
    let tot = 0;
    const step = (i) => {
      const a = A_Y[i][0], b = A_O[i][0];
      const k = a > b ? "w" : a === b ? "t" : "l";
      marks[i] = k;
      tot += k === "w" ? WIN : 0;
      setSt({ i, marks: [...marks], tot, done: i === 3, running: i < 3 });
      if (i < 3) timer.set(() => step(i + 1), 1350);
    };
    setSt({ i: -1, marks: [], tot: 0, done: false, running: true });
    timer.set(() => step(0), 300);
  };

  const gegen = (k) => (k === "w" ? "l" : k === "l" ? "w" : "t");
  const kl = (j, mark) => `${st.running || st.done ? (j === st.i ? "" : "dim") : "dim"} ${mark ?? ""}`;
  const k = st.i >= 0 ? st.marks[st.i] : null;
  const verdikt = k === "w" ? L.win : k === "t" ? L.tie : k === "l" ? L.loss : "";
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div><span className="label">{L.gegner}</span>
        <div className="reihe" style={{ marginTop: 5 }}>
          {A_O.map(([v, s], j) => <Karte key={j} v={v} s={s} cls={kl(j, st.marks[j] ? gegen(st.marks[j]) : "")} />)}
        </div></div>
      <div><span className="label">{L.du}</span>
        <div className="reihe" style={{ marginTop: 5 }}>
          {A_Y.map(([v, s], j) => <Karte key={j} v={v} s={s} cls={kl(j, st.marks[j])} />)}
        </div></div>
      <div className={`res ${k ?? ""}`}>
        <div>
          <div className="verdikt">{verdikt}</div>
          <div className="rechnung">{st.i < 0 ? t("tut.sz.a.hoeher") : t("tut.sz.gegenAB", { a: A_Y[st.i][0], b: A_O[st.i][0] })}</div>
        </div>
        <div className="pkt">+{fmtNum(st.i >= 0 && st.marks[st.i] === "w" ? WIN : 0)}</div>
      </div>
      <div className="zeile"><div className="ziel"><span className="label">{L.scoreUnit}</span>
        <span className="num" style={{ marginLeft: "auto" }}>{fmtNum(st.tot)}</span></div></div>
      <button type="button" className={`tbtn ${st.done ? "" : "primary"}`} disabled={st.running} onClick={start}>
        {st.done ? t("tut.sz.nochmal") : t("tut.sz.los")}
      </button>
    </div>
  );
}

/* ── Szene B · Kartenwert und Stichwert (Entwurf Schirm 2) ──────
   Eine 5 gegen eine 7. Zwei Stichwert-Chips; die Karte zeigt den Kampfwert,
   die Marke unten die Klinge, die Rechnung läuft live mit. */
export function KampfwertSzene({ hint, labels: L }) {
  useLocale();
  const [bonus, setBonus] = useState(0);
  const kampf = 5 + bonus;
  const k = kampf > 7 ? "w" : kampf === 7 ? "t" : "l";
  const verdikt = k === "w" ? L.win : k === "t" ? L.tie : L.loss;
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div><span className="label">{L.gegner}</span>
        <div className="reihe" style={{ marginTop: 5, width: "34%" }}><Karte v={7} s="B" /></div></div>
      <div className="chips">
        {[2, 3].map((v) => (
          <button key={v} type="button" className="chip" aria-pressed={bonus === v}
            onClick={() => setBonus(bonus === v ? 0 : v)}>
            {L.trickValue} +{v}
          </button>
        ))}
      </div>
      <div><span className="label">{L.du}</span>
        <div className="reihe" style={{ marginTop: 5, width: "34%" }}>
          <div className={`karte k-R ${k}`}>{kampf}
            {bonus > 0 && <span className="stichm">{t("tut.sz.b.badge", { n: bonus })}</span>}
          </div>
        </div>
        <p className={`kbez ${bonus ? "kampf" : ""}`}>
          {bonus ? t("tut.sz.kampfwert") : L.cardValue} <b>{kampf}</b>
        </p></div>
      <div className="zeile"><div className="eq">
        <span className="step">{rich(t("tut.sz.b.eq1", { v: 5 }))}</span>
        <span className="step">{rich(t("tut.sz.b.eq2", { v: (bonus ? "+" : "") + bonus }))}</span>
        <span className="step">{rich(t("tut.sz.b.eq3", { v: kampf }))}</span>
      </div></div>
      <div className={`res ${k}`}>
        <div>
          <div className="verdikt">{verdikt}</div>
          <div className="rechnung">{t("tut.sz.gegenAB", { a: kampf, b: 7 })}</div>
        </div>
        <div className="pkt">+{fmtNum(k === "w" ? WIN : 0)}</div>
      </div>
    </div>
  );
}

/* ── Szene C · Die Serie (Entwurf Schirm 3) ─────────────────────
   Fünf gegen fünf, die eigenen Karten tauschbar (zwei antippen). Losspielen schreibt
   je Stich eine Log-Zeile mit Serienstand und Multiplikator; der Zielbalken misst
   gegen die perfekte Runde. */
const C_O = [[7, "B"], [2, "R"], [9, "G"], [4, "Y"], [3, "R"]];
const C_START = [[3, "B"], [8, "R"], [5, "Y"], [10, "G"], [6, "R"]];
const C_MAX = (() => { let x = 0; for (let i = 0; i < 5; i++) x += WIN * (1 + STEP * (i + 1)); return x; })();
const SERIE_CAP = 1 + C.STREAK_BASE_CAP;

export function SerieSzene({ hint, labels: L }) {
  useLocale();
  const timer = useTimer();
  const [you, setYou] = useState(C_START);
  const [sel, setSel] = useState(null);
  const [st, setSt] = useState({ i: -1, log: [], tot: 0, done: false, running: false });

  const tap = (i) => {
    if (st.running) return;
    if (sel === null) setSel(i);
    else if (sel === i) setSel(null);
    else { const n = [...you]; const x = n[sel]; n[sel] = n[i]; n[i] = x; setYou(n); setSel(null); }
  };
  const start = () => {
    timer.clear(); setSel(null);
    const log = [];
    let run = 0, tot = 0;
    const step = (i) => {
      const a = you[i][0], b = C_O[i][0], won = a > b;
      run = won ? run + 1 : 0;
      const mult = 1 + STEP * run, p = won ? WIN * mult : 0;
      tot += p;
      log.push({ a, b, won, run, mult, p });
      setSt({ i, log: [...log], tot, done: i === 4, running: i < 4 });
      if (i < 4) timer.set(() => step(i + 1), 1000);
    };
    setSt({ i: -1, log: [], tot: 0, done: false, running: true });
    timer.set(() => step(0), 300);
  };

  const perfekt = st.done && st.tot >= C_MAX - 1;
  const say = !st.done
    ? t("tut.sz.c.say0", { p: Math.round(STEP * 100) })
    : perfekt
      ? t("tut.sz.c.perfekt", { tot: fmtNum(Math.round(st.tot)), basis: fmtNum(5 * WIN), cap: f2(SERIE_CAP) })
      : t("tut.sz.c.fast", { tot: fmtNum(Math.round(st.tot)), max: fmtNum(Math.round(C_MAX)) });
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div><span className="label">{t("tut.sz.c.opp")}</span>
        <div className="reihe" style={{ marginTop: 5 }}>
          {C_O.map(([v, s], j) => <Karte key={j} v={v} s={s}
            cls={`${st.i >= j ? "" : "dim"} ${st.log[j] ? (st.log[j].won ? "l" : "w") : ""}`} />)}
        </div></div>
      <div><span className="label">{t("tut.sz.c.you")}</span>
        <div className="reihe" style={{ marginTop: 5 }}>
          {you.map(([v, s], j) => <Karte key={j} v={v} s={s} onClick={() => tap(j)}
            cls={`${sel === j ? "sel" : ""} ${st.log[j] ? (st.log[j].won ? "w" : "l") : ""}`} />)}
        </div></div>
      {st.log.length > 0 && (
        <div className="log">
          {st.log.map((r, j) => (
            <div key={j} className={`row ${r.won ? "w" : "l"}`}>
              <span className="duell">{r.a} : {r.b}</span>
              <span className="v">{r.won ? t("tut.sz.sieg") : t("tut.sz.niederlage")}</span>
              <span className="v" style={{ color: "var(--ink3)" }}>
                {r.won ? t("tut.sz.c.serieM", { n: r.run, m: f2(r.mult) }) : t("tut.sz.c.serieN", { n: 0 })}
              </span>
              <span className="p">+{fmtNum(Math.round(r.p))}</span>
            </div>
          ))}
        </div>
      )}
      <div className="zeile"><div className="ziel">
        <span className="label">{L.scoreUnit}</span>
        <span className="bar"><span className="fill" style={{ width: `${Math.min(100, st.tot / C_MAX * 100)}%` }} /></span>
        <span className="num">{fmtNum(Math.round(st.tot))}</span></div></div>
      <p className="say">{say}</p>
      <button type="button" className={`tbtn ${st.done ? "" : "primary"}`} disabled={st.running} onClick={start}>
        {st.done ? t("tut.sz.nochmal") : t("tut.sz.los")}
      </button>
    </div>
  );
}

/* ── Szene D · Der Score (Entwurf Schirm 4) ─────────────────────
   Sechs Fälle desselben Stichs, Reihenfolge wie engine.js:813, der Crit zuletzt.
   Der Direkt-Score kommt aus einem ECHTEN Perk: D_HIGH Stufe I, live ausgewertet. */
const D_FALL = [
  { key: "f0", f: [] },
  { key: "f1", f: ["serie"] },
  { key: "f2", f: ["form"] },
  { key: "f3", f: ["crit"] },
  { key: "f4", f: ["serie", "form"] },
  { key: "f5", f: ["serie", "form", "crit"] },
];
const D_FORM = 1.5; // Wiederholung über ein Segment: ×1,50 — wie Entwurf und guide
const D_F = { serie: 1 + STEP * 5, form: D_FORM, crit: CRIT };
/* Der Perk-Wert und seine Schwelle, LIVE aus der Familie gerechnet statt abgetippt:
   die kleinste Siegkarte, bei der Stufe I zahlt, und was sie zahlt. */
const dhigh = (() => {
  const fn = FAMILY_DEFS.D_HIGH?.tiers?.[1]?.scoreFlat;
  if (!fn) return { flat: 0, ab: 0 };
  for (let w = 1; w <= 10; w++) { const v = fn({ winValue: w }); if (v > 0) return { flat: v, ab: w }; }
  return { flat: 0, ab: 0 };
})();

export function ScoreSzene({ hint }) {
  useLocale();
  const [flat, setFlat] = useState(0);
  const [selIdx, setSel] = useState(5);
  const basis = WIN + flat;
  const wert = (f) => Math.round(f.reduce((v, k) => v * D_F[k], basis));
  const nm = (k) => (k === "serie" ? t("tut.sz.c.serieN", { n: 5 }) : k === "form" ? t("tut.f.form") : t("tut.f.crit"));
  const x = D_FALL[selIdx];
  let v = basis;
  const steps = [];
  if (flat) steps.push(rich(t("tut.sz.d.eqBasisFlat", { w: fmtNum(WIN), f: fmtNum(flat), v: fmtNum(basis) })));
  else steps.push(rich(t("tut.sz.d.eqBasis", { v: fmtNum(WIN) })));
  for (const k of ["serie", "form", "crit"]) {
    if (!x.f.includes(k)) continue;
    v = Math.round(v * D_F[k]);
    steps.push(rich(t("tut.sz.d.eqStep", { f: f2(D_F[k]), nm: nm(k), v: fmtNum(v) })));
  }
  const ohne = Math.round(x.f.reduce((a, k) => a * D_F[k], WIN));
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div><span className="label">{t("tut.sz.d.basisLabel")}</span>
        <div className="chips" style={{ marginTop: 7 }}>
          <button type="button" className="chip" aria-pressed={flat === 0} onClick={() => setFlat(0)}>
            {t("tut.sz.d.chipOhne")}<span className="f">{fmtNum(WIN)}</span>
          </button>
          <button type="button" className="chip" aria-pressed={flat > 0} onClick={() => setFlat(dhigh.flat)}>
            {t("tut.sz.d.chipMit")}<span className="f">{fmtNum(WIN)} + {fmtNum(dhigh.flat)}</span>
          </button>
        </div>
        <p className="hint">{rich(t("tut.sz.d.hintFlat", {
          perk: `${familyDef("D_HIGH")?.name ?? ""} I`, n: fmtNum(dhigh.flat), w: dhigh.ab,
        }))}</p>
      </div>
      <div><span className="label">{t("tut.sz.d.vglLabel")}</span>
        <div className="vgl" style={{ marginTop: 6 }}>
          {D_FALL.map((fall, i) => (
            <button key={fall.key} type="button" className={`vz ${i === selIdx ? "on" : ""}`} onClick={() => setSel(i)}>
              <span className="vnm">{t(`tut.sz.d.${fall.key}`)}</span>
              <span className="vmk">{fall.f.length
                ? fall.f.map((k) => <i key={k}>{nm(k)}</i>)
                : <i className="leer">{t("tut.sz.d.ohneFaktor")}</i>}</span>
              <span className="vv">{fmtNum(wert(fall.f))}</span>
            </button>
          ))}
        </div></div>
      <div className="zeile"><span className="label">{t("tut.sz.d.eqLabel")}</span>
        <div className="eq" style={{ marginTop: 7 }}>
          {steps.map((s, i) => <span key={i} className="step">{s}</span>)}
          {x.f.length === 0
            ? <span className="step off">{t("tut.sz.d.eqKein")}</span>
            : <span className="step trenn">{rich(t("tut.sz.d.eqFach", { x: f2(v / basis) }))}</span>}
        </div></div>
      {flat > 0 && (
        <div className="merk2">{rich(t("tut.sz.d.merk", {
          f: fmtNum(flat), g: fmtNum(v - ohne), x: f2(v / basis),
        }))}</div>
      )}
      <p className="say">{t("tut.sz.d.say")}</p>
    </div>
  );
}

/* ── Szene E · Der Lauf-Bildschirm (Entwurf Schirm 5) ───────────
   Sechs anfassbare Bereiche als Nachbildung des echten Lauf-Bildschirms; die res-Zeile
   erklärt den angetippten, zwei Bereiche tragen einen eigenen Tipp. Die Beispielwerte
   sind die des Entwurfs — Kulisse, keine Spielrechnung. */
const E_ELS = ["bar", "tempo", "ms", "board", "bars", "rail"];

export function LaufmockSzene({ hint }) {
  useLocale();
  const [sel, setSel] = useState(null);
  const tip = sel ? t(`tut.sz.e.${sel}.tip`) : "";
  const hatTip = sel === "ms" || sel === "bars";
  const hot = (el, inner) => (
    <button key={el} type="button" className="hot" aria-pressed={sel === el}
      onClick={() => setSel(sel === el ? null : el)}>
      <span className="pin">{E_ELS.indexOf(el) + 1}</span>
      {inner}
    </button>
  );
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="mock">
        {hot("bar",
          <div className="mockbar">
            <span>{t("tut.d.scoreUnit")} <b>{fmtNum(7020)}</b></span>
            <span>{t("tut.f.streak")} <b>5</b></span>
            <span>{t("tut.sz.e.durchl")} <b>3/50</b></span>
          </div>)}
        {hot("tempo",
          <div className="tempo">
            <span className="pill">⏸</span><span className="pill">×2</span>
            <span className="pill on">×4</span><span className="pill">MAX</span>
            <span className="pill" style={{ marginLeft: 6 }}>🂠</span>
          </div>)}
        {hot("ms",
          <>
            <div className="nm">💠 {t("tut.sz.e.msWort")} 2/5</div>
            <span className="minibar"><i style={{ width: "38%", background: "var(--gold)" }} /></span>
          </>)}
        {hot("board",
          <div className="mockboard">
            <Karte v={7} s="B" />
            <span className="label" style={{ margin: "0 4px" }}>{t("tut.d.gegen")}</span>
            <Karte v={9} s="R" cls="w" />
          </div>)}
        {hot("bars",
          <>
            <div className="nm">{t("bar.fire.heat")}</div>
            <span className="minibar"><i style={{ width: "62%", background: "var(--rot)" }} /></span>
          </>)}
        {hot("rail",
          <>
            <div className="label" style={{ marginBottom: 5 }}>{t("tut.sz.e.mult")}</div>
            <div className="mcells">
              <div><span>{t("tut.f.form")}</span><b style={{ color: "var(--gruen)" }}>2 · +{fmtPct(0.5)}</b></div>
              <div><span>{t("tut.f.build")}</span><b style={{ color: "var(--gold)" }}>+{fmtPct(0.35)}</b></div>
              <div><span>{t("tut.sz.e.critChance")}</span><b style={{ color: "#e879f9" }}>{fmtPct(0.18)}</b></div>
              <div><span>{t("tut.sz.e.critMult")}</span><b style={{ color: "#e879f9" }}>×{f2(C.CRIT_BASE_MULT)}</b></div>
            </div>
            <div className="mstats">
              <span>{t("tut.f.wins")} <b style={{ color: "var(--gruen)" }}>31</b></span>
              <span>{t("tut.sz.e.verl")} <b style={{ color: "var(--lose)" }}>9</b></span>
              <span>{t("tut.sz.e.quote")} <b style={{ color: "var(--gruen)" }}>{fmtPct(0.78)}</b></span>
              <span>{t("tut.sz.e.herk")} ▸</span>
            </div>
          </>)}
      </div>
      <div className="res">
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>{sel ? t(`tut.sz.e.${sel}.nm`) : ""}</div>
          <div className="rechnung">{sel ? t(`tut.sz.e.${sel}.txt`) : t("tut.sz.e.tap")}</div>
        </div>
      </div>
      {hatTip && (
        <div className="tipp2"><b>!</b><span>{tip}</span></div>
      )}
    </div>
  );
}

/* ── Szene F · Woher dein Score kommt (Entwurf Schirm 6) ────────
   Die Bilanz eines Beispiel-Laufs: vier Faktorzeilen, jede erklärt sich beim Antippen,
   darunter die Kette in echter Reihenfolge. Werte aus den Konstanten gerechnet. */
export function BilanzSzene({ hint, labels: L }) {
  useLocale();
  const [sel, setSel] = useState(null);
  const serie = 1 + STEP * 5, form = D_FORM, crit = CRIT;
  const s1 = 4 * WIN, s2 = Math.round(s1 * serie), s3 = Math.round(s2 * form), s4 = Math.round(s3 * crit);
  const rows = [
    { id: "siege", nm: t("tut.f.wins"), n: `4 × ${fmtNum(WIN)}` },
    { id: "serie", nm: t("tut.f.streak"), n: `×${f2(serie)}` },
    { id: "form", nm: t("tut.f.form"), n: `×${f2(form)}` },
    { id: "crit", nm: t("tut.f.crit"), n: `×${f2(crit)}` },
  ];
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="zeile" style={{ textAlign: "center", padding: "14px 12px" }}>
        <span className="label">{t("tut.sz.f.nachLabel", { n: C.MAX_CYCLES })}</span>
        <div className="big" style={{ marginTop: 3, color: "var(--gold)" }}>{fmtNum(s4)}</div>
      </div>
      <div className="bd">
        {rows.map((r) => (
          <button key={r.id} type="button" aria-pressed={sel === r.id}
            onClick={() => setSel(sel === r.id ? null : r.id)}>
            {r.nm} <span className="n">{r.n}</span>
          </button>
        ))}
      </div>
      <div className="res"><div>
        <div className="rechnung">{sel ? t(`tut.sz.f.why.${sel}`, { p: Math.round(STEP * 100), m: f2(CRIT) }) : t("tut.sz.f.zeile")}</div>
      </div></div>
      <div className="zeile"><span className="label">{t("tut.sz.f.ketteLabel")}</span>
        <div className="eq" style={{ marginTop: 6 }}>
          <span className="step">{rich(t("tut.sz.f.eq1", { n: 4, win: fmtNum(WIN), v: fmtNum(s1) }))}</span>
          <span className="step">{rich(t("tut.sz.f.eqStep", { nm: L.streak, f: f2(serie), v: fmtNum(s2) }))}</span>
          <span className="step">{rich(t("tut.sz.f.eqStep", { nm: L.form, f: f2(form), v: fmtNum(s3) }))}</span>
          <span className="step">{rich(t("tut.sz.f.eqStep", { nm: L.crit, f: f2(crit), v: fmtNum(s4) }))}</span>
        </div>
        <p className="hint">{rich(t("tut.sz.f.hint", { win: fmtNum(WIN) }))}</p>
      </div>
    </div>
  );
}

/* ════════════════════ Welle 2 · Aufstellung, Wahl, Blitz ════════════════════ */

/* Die Hand der Aufstellungs-Sektion — dieselben fünf Karten wie im Entwurf. Was der Entwurf
   als FORMTAB vorberechnet hatte, rechnet hier die echte computeFormations je Anordnung. */
const HAND = [[4, "B"], [10, "R"], [3, "R"], [10, "B"], [5, "B"]];
const HAND_CARDS = HAND.map(([v, su], i) => ({ id: `tut-h${i}`, value: v, suit: su }));
const START = [1, 0, 2, 4, 3];   // 10R 4B 3R 5B 10B — keine Formation, 3 Siege

function look(ord) {
  const per = computeFormations(ord, HAND_CARDS);
  const { maxMult } = summarizeFormations(per);
  const types = [];
  for (const p of per) for (const f of p.formations) if (!types.includes(f.type)) types.push(f.type);
  return {
    m: maxMult, types,
    p: per.map((x) => ({ abbr: x.formations.map((f) => formationAbbr(f.type)).join(""), mult: x.mult })),
  };
}

/* Karte mit Kürzel und Positions-Multiplikator, wie kartePro im Entwurf. mode "suit" färbt den
   Rahmen nach Kartenfarbe (dort ist Farbe Information), "neutral" lässt ihn grau. */
function KartePro({ v, s, abbr, mult, sel, mode, erg, onClick }) {
  const cls = [mode === "suit" ? `k-${s}` : "", sel ? "sel" : "", erg ?? ""].join(" ");
  return (
    <Karte v={v} s={mode === "suit" ? s : "N"} cls={cls} onClick={onClick}
      badge={mult > 1 ? `×${f2(mult)}` : undefined} kuerzel={abbr || undefined} />
  );
}

/* ── Szene G · Das Brett (Entwurf Schirm 7) ─────────────────────
   Gegner offen, drei Energie, Rückgängig und Zurücksetzen, dann Losspielen mit Log.
   Die Lösung gewinnt alle fünf UND bildet einen Wechsel. */
const G_OPP = [3, 9, 2, 9, 4];

export function BrettSzene({ hint, labels: L }) {
  useLocale();
  const timer = useTimer();
  const [ord, setOrd] = useState(START);
  const [sel, setSel] = useState(null);
  const [en, setEn] = useState(ENERGY_FLOOR);
  const [hist, setHist] = useState([]);
  const [say, setSay] = useState({ k: "tut.sz.g.say0" });
  const [st, setSt] = useState({ i: -1, erg: [], log: [], done: false, running: false, won: false });

  const r = look(ord);
  const bilanz = ord.reduce((a, h, i) => {
    const v = HAND[h][0];
    if (v > G_OPP[i]) a.w++; else if (v === G_OPP[i]) a.t++;
    return a;
  }, { w: 0, t: 0 });
  const startM = look(START).m, d = r.m - startM;
  const richtung = d > 0.005 ? "auf" : d < -0.005 ? "ab" : "gl";

  const tap = (i) => {
    if (st.running) return;
    if (sel === null) { setSel(i); return; }
    if (sel === i) { setSel(null); return; }
    if (en <= 0) { setSay({ k: "tut.sz.g.sayNoEnergy" }); setSel(null); return; }
    setHist((h) => [...h, ord]);
    const n = [...ord]; [n[sel], n[i]] = [n[i], n[sel]];
    setOrd(n); setSel(null); setEn(en - 1);
    setSay(en - 1 > 0 ? { k: "tut.sz.g.sayLeft", vars: { n: en - 1 } } : { k: "tut.sz.g.sayEmpty" });
  };
  const undo = () => {
    if (!hist.length || st.running) return;
    setOrd(hist[hist.length - 1]); setHist(hist.slice(0, -1)); setEn(en + 1); setSel(null);
    setSay({ k: "tut.sz.g.sayUndo" });
  };
  /* Zurücksetzen stellt Anfang UND volle Energie wieder her (im Entwurf stand hier eine 4 —
     ein Tippfehler; die Phase hat ENERGY_FLOOR Energie, und genau die gibt es zurück). */
  const reset = () => {
    if (st.running) return;
    setOrd(START); setHist([]); setEn(ENERGY_FLOOR); setSel(null);
    setSay({ k: "tut.sz.g.sayReset" });
  };
  const start = () => {
    timer.clear(); setSel(null);
    const erg = [], log = [];
    let wins = 0;
    const step = (i) => {
      const a = HAND[ord[i]][0], b = G_OPP[i];
      const k = a > b ? "w" : a === b ? "t" : "l";
      erg[i] = k;
      if (k === "w") wins++;
      log.push({ a, b, k });
      const done = i === 4;
      setSt({ i, erg: [...erg], log: [...log], done, running: !done, won: done && wins === 5 });
      if (done) {
        setSay(wins === 5
          ? { k: "tut.sz.g.sayWin", vars: { form: formationName("wechsel") } }
          : { k: "tut.sz.g.sayLose", vars: { w: wins } });
      } else timer.set(() => step(i + 1), 850);
    };
    setSt({ i: -1, erg: [], log: [], done: false, running: true, won: false });
    timer.set(() => step(0), 300);
  };
  const gegenK = (k) => (k === "w" ? "l" : k === "l" ? "w" : "t");
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div><span className="label">{t("tut.sz.c.opp")}</span>
        <div className="reihe neutral" style={{ marginTop: 5 }}>
          {G_OPP.map((v, i) => <Karte key={i} v={v} s="N" cls={st.erg[i] ? gegenK(st.erg[i]) : ""} />)}
        </div></div>
      <div><span className="label">{t("tut.sz.c.you")}</span>
        <div className="reihe neutral" style={{ marginTop: 5 }}>
          {ord.map((h, i) => <KartePro key={i} v={HAND[h][0]} s={HAND[h][1]} abbr={r.p[i].abbr}
            mult={r.p[i].mult} sel={sel === i} mode="neutral" erg={st.erg[i]} onClick={() => tap(i)} />)}
        </div>
        <div className="werkzeuge">
          <button type="button" className="tbtn" onClick={undo} disabled={!hist.length || st.running}>{L.undo}</button>
          <button type="button" className="tbtn" onClick={reset} disabled={!hist.length || st.running}>{L.reset}</button>
        </div></div>
      <div className="zeile">
        <div className="ziel"><span className="label">{L.energy}</span>
          <span className="pips">{[0, 1, 2].map((i) => <i key={i} className={i < en ? "" : "off"} />)}</span>
          <span className="num" style={{ marginLeft: "auto" }}>
            {bilanz.t ? t("tut.sz.g.winsTie", { n: bilanz.w, t: bilanz.t }) : t("tut.sz.g.wins", { n: bilanz.w })}
          </span></div>
        <div className="delta">
          <span className="label">{t("tut.sz.g.formLabel")}</span> <b className="von">×{f2(startM)}</b>
          <span className="pf">→</span><b className={richtung}>×{f2(r.m)}</b>
          <span className={`pf ${richtung}`}>{t(d > 0.005 ? "tut.sz.g.besser" : d < -0.005 ? "tut.sz.g.schlechter" : "tut.sz.g.gleich")}</span>
        </div>
        <p className="hint">{t("tut.sz.g.hint")}</p>
      </div>
      {st.log.length > 0 && (
        <div className="log">
          {st.log.map((row, i) => (
            <div key={i} className={`row ${row.k}`}>
              <span className="duell">{row.a} : {row.b}</span>
              <span className="v">{row.k === "w" ? t("tut.sz.sieg") : row.k === "t" ? L.tie : t("tut.sz.niederlage")}</span>
              <span className="p">{row.k === "w" ? `+${fmtNum(WIN)}` : "0"}</span>
            </div>
          ))}
        </div>
      )}
      <p className="say">{t(say.k, say.vars)}</p>
      <button type="button" className={`tbtn ${st.done ? "" : "primary"}`} disabled={st.running} onClick={start}>
        {st.done ? t("tut.sz.nochmal") : t("tut.sz.los")}
      </button>
    </div>
  );
}

/* ── Szene H · Was auf einer Karte steht (Entwurf Schirm 8) ─────
   Echte Anordnung, echte Kürzel und Multiplikatoren je Position, darunter die
   40 Positionen des Decks mit leuchtendem Segment 2. */
const H_ORD = [2, 1, 0, 3, 4];   // 3R 10R 4B 10B 5B — Wechsel und Farbblock zugleich
const FORM_TYPEN = ["wiederholung", "farbblock", "treppe", "wechsel"];

export function KarteSzene({ hint }) {
  useLocale();
  const [sel, setSel] = useState(null);
  const r = look(H_ORD);
  const namen = sel != null && r.p[sel].abbr
    ? r.p[sel].abbr.split("").map((a) => {
        const typ = FORM_TYPEN.find((k) => formationAbbr(k) === a);
        return typ ? formationName(typ) : a;
      }).join(` ${t("tut.sz.und")} `)
    : "";
  const liste = FORM_TYPEN.map((k) => `**${formationAbbr(k)}** ${formationName(k)}`).join(", ");
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div><span className="label">{t("tut.sz.h.segLabel", { s: 2, a: 6, b: 10 })}</span>
        <div className="reihe" style={{ marginTop: 5 }}>
          {H_ORD.map((h, i) => <KartePro key={i} v={HAND[h][0]} s={HAND[h][1]} abbr={r.p[i].abbr}
            mult={r.p[i].mult} sel={sel === i} mode="suit" onClick={() => setSel(sel === i ? null : i)} />)}
        </div></div>
      <div className="res">
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>{sel != null ? t("tut.sz.h.pos", { n: 6 + sel }) : ""}</div>
          <div className="rechnung">{sel == null ? t("tut.sz.h.tap")
            : r.p[sel].abbr
              ? t("tut.sz.h.wert", { v: HAND[H_ORD[sel]][0], namen })
              : t("tut.sz.h.wertKeine", { v: HAND[H_ORD[sel]][0] })}</div>
        </div>
        {sel != null && <div className="pkt">×{f2(r.p[sel].mult)}</div>}
      </div>
      <div className="zeile"><div className="eq">
        <span className="step">{rich(t("tut.sz.h.eq1"))}</span>
        <span className="step">{rich(t("tut.sz.h.eq2", { liste }))}</span>
        <span className="step">{rich(t("tut.sz.h.eq3"))}</span>
      </div></div>
      <div className="zeile">
        <span className="label">{t("tut.sz.h.deckLabel", { n: C.TRICKS_PER_CYCLE })}</span>
        <div className="brett" style={{ marginTop: 8 }}>
          {Array.from({ length: VARS.segments }, (_, seg) => (
            <div key={seg} className={`seg ${seg === 1 ? "on" : ""}`}>
              <span className="segnr">{seg + 1}</span>
              {Array.from({ length: VARS.segment }, (_, z) => <span key={z} className="z" />)}
            </div>
          ))}
        </div>
        <p className="hint">{t("tut.sz.h.hint", VARS)}</p>
      </div>
    </div>
  );
}

/* ── Szene I · Die vier Formationen (Entwurf Schirm 9) ──────────
   Tauschen bis alle vier Typen einmal erkannt wurden; die Chips sammeln. */
export function FormationenSzene({ hint, noneLabel }) {
  useLocale();
  const [ord, setOrd] = useState(START);
  const [sel, setSel] = useState(null);
  const [found, setFound] = useState(() => new Set());
  const r = look(ord);
  if (r.types.some((typ) => !found.has(typ))) {
    setFound((f) => { const n = new Set(f); r.types.forEach((typ) => n.add(typ)); return n; });
  }
  const alle = FORM_TYPEN.every((k) => found.has(k));
  const tap = (i) => {
    if (sel === null) setSel(i);
    else if (sel === i) setSel(null);
    else { const n = [...ord]; [n[sel], n[i]] = [n[i], n[sel]]; setOrd(n); setSel(null); }
  };
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="reihe">
        {ord.map((h, i) => <KartePro key={i} v={HAND[h][0]} s={HAND[h][1]} abbr={r.p[i].abbr}
          mult={r.p[i].mult} sel={sel === i} mode="suit" onClick={() => tap(i)} />)}
      </div>
      <div className={`res ${r.types.length ? "w" : ""}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>
            {r.types.length ? r.types.map((typ) => formationName(typ)).join(" + ") : noneLabel}
          </div>
          <div className="rechnung">{r.types.length ? t("tut.sz.i.erkannt") : t("tut.sz.i.sortier")}</div>
        </div>
        <div className="pkt">×{f2(r.m)}</div>
      </div>
      <div className="zeile"><span className="label">{t("tut.sz.i.gefunden")}</span>
        <div className="chips" style={{ marginTop: 8 }}>
          {FORM_TYPEN.map((k) => (
            <button key={k} type="button" className="chip" aria-pressed={found.has(k)} disabled>
              {formationName(k)}
            </button>
          ))}
        </div></div>
      <div className="zeile"><span className="label">{t("tut.sz.i.wie")}</span>
        <div className="regeln" style={{ marginTop: 7 }}>
          {t("tut.sz.i.regeln", VARS).split("·").map((teil, i) => (
            <div key={i}><b>{formationAbbr(FORM_TYPEN[i])}</b><span>{teil.trim()}</span></div>
          ))}
        </div></div>
      <p className="say">{alle ? t("tut.sz.i.alle") : found.size
        ? t("tut.sz.i.count", { n: found.size, total: FORM_TYPEN.length })
        : t("tut.sz.i.say0")}</p>
      <button type="button" className="tbtn" onClick={() => { setOrd(START); setSel(null); }}>
        {t("tut.sz.neu")}
      </button>
    </div>
  );
}

/* ── Szene J · Übereinander (Entwurf Schirm 10) ─────────────────
   Dieselbe Hand; Ziel ist eine Karte in zwei Formationen, die Faktoren multiplizieren sich. */
export function UeberSzene({ hint, noneLabel }) {
  useLocale();
  const [ord, setOrd] = useState(START);
  const [sel, setSel] = useState(null);
  const r = look(ord);
  const zwei = r.types.length >= 2;
  const tap = (i) => {
    if (sel === null) setSel(i);
    else if (sel === i) setSel(null);
    else { const n = [...ord]; [n[sel], n[i]] = [n[i], n[sel]]; setOrd(n); setSel(null); }
  };
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="reihe">
        {ord.map((h, i) => <KartePro key={i} v={HAND[h][0]} s={HAND[h][1]} abbr={r.p[i].abbr}
          mult={r.p[i].mult} sel={sel === i} mode="suit" onClick={() => tap(i)} />)}
      </div>
      <div className={`res ${r.types.length ? "w" : ""}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>
            {r.types.length ? r.types.map((typ) => formationName(typ)).join(" + ") : noneLabel}
          </div>
          <div className="rechnung">{zwei ? t("tut.sz.j.txt2") : t("tut.sz.j.txt0")}</div>
        </div>
        <div className="pkt">×{f2(r.m)}</div>
      </div>
      <div className="zeile">
        <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
          <span className="label">{t("tut.sz.j.zahlt")}</span>
          <span className="big" style={{ fontSize: 20, marginLeft: "auto" }}>{fmtNum(Math.round(WIN * r.m))}</span>
        </div>
      </div>
      <p className="say">{zwei ? t("tut.sz.j.say2", { m: f2(r.m) }) : t("tut.sz.j.say0")}</p>
    </div>
  );
}

/* ── Szene M · Die Kategorien (Entwurf Schirm 12) ───────────────
   Sechs Kategorien mit Emblem, Farbe und Beschreibung aus den Registern; das Beispiel je
   Kategorie ist die Stufe-I-Zeile einer echten Familie. Zahlen gezählt, nicht gesetzt. */
const KAT_BSP = { A: "A_WEAK_STRONG", B: "B_COUNTER", C: "C_GUARD", D: "D_FORMATION_BONUS", E: "E_COLORBRIDGE", P: "P_SHARPNESS" };

export function KatsSzene({ hint }) {
  useLocale();
  const zaehl = Object.values(FAMILY_DEFS).reduce((a, f) => { a[f.cat] = (a[f.cat] || 0) + 1; return a; }, {});
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="kats">
        {Object.keys(KAT_BSP).map((k) => {
          const cat = perkCat(k);
          const fam = familyDef(KAT_BSP[k]);
          const art = perkCatArt(k);
          return (
            <div key={k} className="kat" style={{ "--c": cat.color }}>
              {art && <img className="emblem" src={art} alt="" aria-hidden="true" />}
              <div className="katmid">
                <span className="badge2" style={{ background: `${cat.color}22`, color: cat.color }}>{cat.name}</span>
                <span className="katwas">{cat.desc}</span>
                {fam && <span className="katbsp"><b>{fam.name} {ROMAN[1]}</b> {fam.tiers?.[1]?.desc}</span>}
              </div>
              <span className="katn">{zaehl[k] || 0}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Szene N · Raritäten (Entwurf Schirm 13) ────────────────────
   Vier Stufen derselben echten Familie als Kacheln in Stufenfarbe, dann das Legendäre:
   drei echte legendäre Perks mit ihren Emblemen. Alles aus den Registern. */
const LEG_IDS = ["L_MEIS", "L_OPFER", "L_HENK"];

export function RaritaetSzene({ hint }) {
  useLocale();
  const fam = familyDef("D_FORMATION_BONUS");
  const catD = perkCat("D");
  const gold = "#d4a63a";
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="pks">
        {[1, 2, 3, 4].map((tier) => {
          const m = TIER_META[tier];
          return (
            <div key={tier} className="pk kachel" style={{
              borderLeftColor: `${m.color}cc`,
              ...(tier >= 3 ? { boxShadow: `0 0 14px -6px ${m.color}` } : null),
            }}>
              <span className="pktop">
                <span className="badge2" style={{ background: `${gold}22`, color: gold }}>{catD.name}</span>
                <span className="badge2" style={{ background: `${m.color}1f`, color: m.color, border: `1px solid ${m.color}88` }}>
                  {rarityLabel(tier)}
                </span>
                {tier > 1 && (
                  <span className="badge2" style={{ background: `${m.color}14`, color: m.color, border: `1px dashed ${m.color}88` }}>
                    {ROMAN[tier - 1]} → {ROMAN[tier]}
                  </span>
                )}
              </span>
              <span className="kachelnm" style={{ color: m.color }}>{fam?.name} {ROMAN[tier]}</span>
              <span className="pksatz">{fam?.tiers?.[tier]?.desc}</span>
            </div>
          );
        })}
      </div>
      <div className="merk3">{rich(t("tut.sz.n.merk1", {
        a: fmtNum(FAMILY_DEFS.D_FORMATION_BONUS?.tiers?.[1]?.scoreFlat?.({}) ?? 0),
        b: fmtNum(FAMILY_DEFS.D_FORMATION_BONUS?.tiers?.[2]?.scoreFlat?.({}) ?? 0),
      }))}</div>
      <p className="text">{t("tut.sz.n.text1")}</p>
    </div>
  );
}

/* ── Szene N2 · Legendär (Entwurf Schirm 13, unterer Teil) ──────
   Der Legendär-Teil des Raritäten-Schirms als eigene Lektion: der ganze Schirm maß
   1285 px und riss das Budget — Owner-Entscheid: aufteilen statt kürzen. */
export function LegendaerSzene({ hint }) {
  useLocale();
  const nLeg = Object.values(PERK_DEFS).filter((x) => x.rarity === "legendary").length;
  const legNode = nodeDef("legLayer");
  const gold = "#d4a63a";
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="trenner"><span>{t("leg.fallbackLabel")}</span></div>
      <p className="text">{t("tut.sz.n.text2", { n: nLeg })}</p>
      <div className="pks">
        {LEG_IDS.map((id) => {
          const perk = perkDef(id);
          const cat = perkCat(perk.cat);
          const art = legendaryPerkArt(id);
          return (
            <div key={id} className="pk kachel leg" style={{ borderLeftColor: gold }}>
              <span className="pktop">
                <span className="badge2" style={{ background: `${cat.color}22`, color: cat.color }}>{cat.name}</span>
                <span className="badge2" style={{ background: `${gold}1f`, color: gold, border: `1px solid ${gold}88` }}>
                  {t("leg.fallbackLabel")}
                </span>
              </span>
              <span className="legrow">
                {art && <img className="emblem gross" src={art} alt="" aria-hidden="true" />}
                <span className="legmid">
                  <span className="kachelnm" style={{ color: gold }}>{perk.label}</span>
                  <span className="pksatz">{perk.desc}</span>
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="merk3" style={{ background: "rgba(212,166,58,.07)", borderLeftColor: gold }}>
        {rich(t("tut.sz.n.merk2", { node: legNode?.label ?? "", sp: legNode?.cost ?? 0, tier4: rarityLabel(4) }))}
      </div>
    </div>
  );
}

/* ── Der Ionensturm (Entwurf, aus src/ui/fx/CardIonStorm.jsx destilliert) ──
   Perimeter abtasten, Zacken senkrecht zur Kante, alle 50 ms neu würfeln, dazu ab und
   an ein Bogen quer über die Karte. */
const ION = "#5ec8f0";
function ionSturm(canvas) {
  const T = { N: 84, CORNER: 12, JIT: 3.4, TAN: 1.6, PAD: 18, RESEED: 50,
    ARC_MIN: 380, ARC_MAX: 1280, ARC_LIFE: 210, ARC_SEGS: 15, ARC_AMP: 13,
    W_GLOW: 5.5, W_MID: 0.5, W_CORE: 0.6 };
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0, aktiv = false, lauf = null, seed = 0, tSeed = 0, arc = null, tArc = 0;
  const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  const sjit = (a, b) => hash(a, b) * 2 - 1;
  function mass() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function punkte() {
    const o = T.PAD, w = W - 2 * o, h = H - 2 * o;
    const cr = Math.min(T.CORNER, w / 2, h / 2), P = [];
    const kante = (x0, y0, x1, y1, nx, ny, n) => {
      for (let i = 0; i < n; i++) { const u = i / n;
        P.push({ x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u, nx, ny, tx: -ny, ty: nx }); }
    };
    const bogen = (cx, cy, a0, a1, n) => {
      for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (i / n);
        P.push({ x: cx + Math.cos(a) * cr, y: cy + Math.sin(a) * cr,
          nx: Math.cos(a), ny: Math.sin(a), tx: -Math.sin(a), ty: Math.cos(a) }); }
    };
    const g = Math.max(1, Math.round((T.N - 16) * ((w - 2 * cr) / (2 * (w + h - 4 * cr)))));
    const v = Math.max(1, Math.round((T.N - 16) * ((h - 2 * cr) / (2 * (w + h - 4 * cr)))));
    kante(cr, 0, w - cr, 0, 0, -1, g);
    bogen(w - cr, cr, -Math.PI / 2, 0, 4);
    kante(w, cr, w, h - cr, 1, 0, v);
    bogen(w - cr, h - cr, 0, Math.PI / 2, 4);
    kante(w - cr, h, cr, h, 0, 1, g);
    bogen(cr, h - cr, Math.PI / 2, Math.PI, 4);
    kante(0, h - cr, 0, cr, -1, 0, v);
    bogen(cr, cr, Math.PI, Math.PI * 1.5, 4);
    for (const q of P) { q.x += o; q.y += o; }
    return P;
  }
  function strich(pfad, breite, alpha) {
    ctx.beginPath();
    pfad.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
    ctx.lineWidth = breite; ctx.strokeStyle = ION; ctx.globalAlpha = alpha;
    ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
  }
  function zeichne(zeit) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    if (zeit - tSeed > T.RESEED) { seed++; tSeed = zeit; }
    const P = punkte();
    const kontur = P.map((pt, i) => {
      const j = sjit(seed, i) * T.JIT, k = sjit(seed + 99, i) * T.TAN;
      return { x: pt.x + pt.nx * j + pt.tx * k, y: pt.y + pt.ny * j + pt.ty * k };
    });
    kontur.push(kontur[0]);
    strich(kontur, T.W_GLOW, 0.13);
    strich(kontur, T.W_MID, 0.55);
    strich(kontur, T.W_CORE, 0.9);
    if (!arc && zeit > tArc) {
      const pa = P[Math.floor(hash(seed, 9) * P.length)], pb = P[Math.floor(hash(seed, 10) * P.length)];
      arc = { pa, pb, bis: zeit + T.ARC_LIFE };
    }
    if (arc) {
      if (zeit > arc.bis) { arc = null; tArc = zeit + T.ARC_MIN + hash(seed, 11) * (T.ARC_MAX - T.ARC_MIN); }
      else {
        const fl = Math.floor(zeit / 42), pfad = [];
        for (let i = 0; i <= T.ARC_SEGS; i++) {
          const u = i / T.ARC_SEGS;
          const x = arc.pa.x + (arc.pb.x - arc.pa.x) * u, y = arc.pa.y + (arc.pb.y - arc.pa.y) * u;
          const nx = -(arc.pb.y - arc.pa.y), ny = arc.pb.x - arc.pa.x;
          const len = Math.hypot(nx, ny) || 1, wgl = Math.sin(u * Math.PI) * T.ARC_AMP * sjit(fl, i);
          pfad.push({ x: x + (nx / len) * wgl, y: y + (ny / len) * wgl });
        }
        strich(pfad, T.W_GLOW * 0.7, 0.10);
        strich(pfad, T.W_CORE, 0.85);
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  function tick(zeit) { if (!aktiv) return; zeichne(zeit); lauf = requestAnimationFrame(tick); }
  return {
    setzeAktiv(an) {
      canvas.style.opacity = an ? "1" : "0";
      if (an === aktiv) return;
      aktiv = an;
      if (an) { mass(); if (ruhig) { zeichne(0); return; } lauf = requestAnimationFrame(tick); }
      else { cancelAnimationFrame(lauf); ctx.clearRect(0, 0, W, H); }
    },
    stop() { aktiv = false; cancelAnimationFrame(lauf); },
  };
}

/* ── Szene C_ · Die Blitz-Karte (Entwurf Schirm 15) ─────────────
   Große Karte mit Punktleiste und Ionensturm-Canvas; Mehr/Weniger setzt Stapel,
   beide Anzeigen rechnen mit den echten ION_-Konstanten. */
export function BlitzkarteSzene({ hint, labels: L }) {
  useLocale();
  const [n, setN] = useState(0);
  const canvasRef = useRef(null);
  const fxRef = useRef(null);
  const voll = n >= C.ION_MAX_STACKS;
  useEffect(() => {
    fxRef.current = ionSturm(canvasRef.current);
    return () => fxRef.current?.stop();
  }, []);
  useEffect(() => { fxRef.current?.setzeAktiv(voll); }, [voll]);
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="buehne">
        <div className="grosskarte" style={{ boxShadow: n > 0
          ? `0 0 0 2px ${ION}, 0 0 ${voll ? 12 : 9}px ${ION}${voll ? "aa" : "77"}` : "none" }}>
          <span className="cpips">
            {Array.from({ length: C.ION_MAX_STACKS }, (_, i) => <i key={i} className={i < n ? "an" : ""} />)}
          </span>
          <span className="cwert">7</span>
          <canvas ref={canvasRef} width="280" height="368" style={{ opacity: 0 }} />
        </div>
      </div>
      <div className="werkzeuge">
        <button type="button" className="tbtn" onClick={() => setN(Math.max(0, n - 1))} disabled={n === 0}>{L.less}</button>
        <button type="button" className="tbtn" onClick={() => setN(Math.min(C.ION_MAX_STACKS, n + 1))} disabled={voll}>{L.more}</button>
      </div>
      <div className="res">
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>
            {voll ? t("tut.sz.cx.nmVoll") : n === 0 ? t("tut.sz.cx.nm0") : t("tut.sz.cx.nm1")}
          </div>
          <div className="rechnung">{voll ? t("tut.sz.cx.txtVoll") : n === 0 ? t("tut.sz.cx.txt0")
            : t("tut.sz.cx.txtN", { n, max: C.ION_MAX_STACKS })}</div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>{n} / {C.ION_MAX_STACKS}</div>
      </div>
      <div className="zeile"><span className="label">{t("tut.sz.cx.wasLabel")}</span>
        <div className="zwei" style={{ marginTop: 8 }}>
          <div><span className="zk">{t("tut.sz.cx.aufKarte")}</span>
            <b>+{fmtNum(C.ION_SCORE_PER_STACK * n)}</b>
            <span className="ze">{t("tut.sz.cx.zeA")}</span></div>
          <div><span className="zk">{t("tut.sz.cx.imDeck")}</span>
            <b>+{fmtNum((n * C.ION_CRIT_PP_PER_STACK * 100).toFixed(1))} %</b>
            <span className="ze">{t("tut.sz.cx.zeB")}</span></div>
        </div>
        <p className="hint">{rich(t("tut.sz.cx.hint", {
          cap: C.ION_CRIT_STACK_CAP,
          pct: fmtNum((C.ION_CRIT_STACK_CAP * C.ION_CRIT_PP_PER_STACK * 100).toFixed(0)),
        }))}</p>
      </div>
      <div className="zeile"><span className="label">{t("tut.sz.cx.erkennLabel")}</span>
        <div className="regeln" style={{ marginTop: 7 }}>
          <div><b>▬</b><span>{t("tut.sz.cx.erk1")}</span></div>
          <div><b>◻</b><span>{t("tut.sz.cx.erk2")}</span></div>
          <div><b>↯</b><span>{t("tut.sz.cx.erk3")}</span></div>
        </div></div>
    </div>
  );
}

/* ── Tipps-Liste (Entwurf Schirm 16/20/24/29/33) ────────────────
   Nummerierte Einträge mit fettem Auftakt; der Text kommt als EIN Katalogschlüssel mit
   „·"-Trennern (wie regeln/liste), die Farbe aus dem Sektions-Akzent. */
export function TippsSzene({ hint }) {
  useLocale();
  const teile = String(hint || "").split("·").map((x) => x.trim()).filter(Boolean);
  return (
    <div className="tsz">
      <div className="tipps">
        {teile.map((teil, i) => (
          <div key={i} className="tipp2"><b>{i + 1}</b><span>{rich(teil)}</span></div>
        ))}
      </div>
    </div>
  );
}
