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
import { familyDef } from "../../i18n/labels.js";
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
