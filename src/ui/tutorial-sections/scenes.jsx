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
import { computeFormations, summarizeFormations, FARBBLOCK_BASE } from "../../game/formations.js";
import { marginHeatPoints } from "../../game/skills.js";
import * as GLACIER from "../../game/glacier.js";
import * as AR from "../../game/architect.js";
import * as PROG from "../../game/progression.js";
import { RUN_COMPLETE_DP } from "../../game/storage.js";
import { buildingEffect } from "../../i18n/buildingText.js";
import { FACTION_ICON_SRC, GLOSSARY_IMG_SRC } from "../FactionIcon.jsx";
import { familyDef, perkDef, perkCat, formationName, formationAbbr, rarityLabel, skillDef, glacierFormName, archFamily, archCatDef } from "../../i18n/labels.js";
import { TIER_META, ROMAN } from "../../game/rarity.js";
import { ENERGY_FLOOR } from "../../game/progression.js";
import { perkCatArt, legendaryPerkArt } from "../perkArt.js";
import { VARS } from "./vars.js";
import "./scenes.css";

/* Der Serien-Faktor mit zwei Nachkommastellen im Zahlformat der Sprache (×1,10 / ×1.10).
   fmtNum statt toFixed+replace — dieselbe Begründung wie buildingText.js:36. */
const f2 = (x) => fmtNum(x.toFixed(2));
/* Glatte Kurzform: 1 bleibt 1, 1.5 wird 1,5 — für Wucht-Stufen und Geometrie-Faktoren. */
const f1 = (x) => fmtNum(String(x));

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
/* Beispiel-Segmente je Formation — GESUCHT gegen die echte Engine: jede Hand traegt genau die
   eine Formation ihres Tabs, sonst nichts (Suchlauf 2026-08-28, computeFormations). Das
   Farbblock-Beispiel traegt bewusst eine vierte rote Karte, die NICHT mitzaehlt: nebeneinander
   ist die Regel, und das Beispiel zeigt sie. */
const MF_BEISPIELE = {
  wiederholung: [[6, "G"], [6, "R"], [5, "B"], [2, "G"], [3, "R"]],
  farbblock:    [[7, "R"], [10, "R"], [6, "R"], [3, "B"], [6, "R"]],
  treppe:       [[2, "G"], [5, "B"], [8, "R"], [4, "Y"], [1, "G"]],
  wechsel:      [[2, "B"], [9, "R"], [4, "G"], [6, "Y"], [5, "R"]],
};
const mfLook = (hand) => computeFormations([0, 1, 2, 3, 4],
  hand.map(([v, su], i) => ({ id: `mf${i}`, value: v, suit: su })));

export function FormationenSzene({ hint }) {
  useLocale();
  const [typ, setTyp] = useState("wiederholung");
  const hand = MF_BEISPIELE[typ];
  const per = mfLook(hand);
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="werkzeuge formen">
        {Object.keys(MF_BEISPIELE).map((k) => (
          <button key={k} type="button" className="tbtn" aria-pressed={typ === k} onClick={() => setTyp(k)}>
            {formationName(k)}
          </button>
        ))}
      </div>
      <div className="reihe">
        {hand.map(([v, su], i) => (
          <KartePro key={`${typ}${i}`} v={v} s={su} abbr={per[i].formations.map((f) => formationAbbr(f.type)).join("")}
            mult={per[i].mult} sel={per[i].formations.length > 0} mode="suit" />
        ))}
      </div>
      <div className="merk3">{rich(t(`tut.sz.mf.${typ}`, VARS))}</div>
    </div>
  );
}

/* ── Szene J · Übereinander (Entwurf Schirm 10) ─────────────────
   Dieselbe Hand; Ziel ist eine Karte in zwei Formationen, die Faktoren multiplizieren sich. */
/* Zwei Beispiel-Segmente mit MEHREREN Formationen zugleich — engine-verifiziert wie oben:
   `bunt` = ein komplett gruenes Segment mit Farbblock + Treppe + Wiederholung (die Geschichte
   aus S-F1 → S-F2), `zick` = Wiederholung + Wechsel ohne Farbgleichheit, Karte 2 in beiden. */
const UE_BEISPIELE = {
  bunt: [[2, "G"], [5, "G"], [8, "G"], [3, "G"], [3, "G"]],
  zick: [[1, "B"], [1, "R"], [10, "R"], [4, "G"], [8, "G"]],
};

export function UeberSzene({ hint }) {
  useLocale();
  const [bsp, setBsp] = useState("bunt");
  const hand = UE_BEISPIELE[bsp];
  const per = mfLook(hand);
  const types = [];
  for (const q of per) for (const f of q.formations) if (!types.includes(f.type)) types.push(f.type);
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="werkzeuge formen">
        {Object.keys(UE_BEISPIELE).map((k) => (
          <button key={k} type="button" className="tbtn" aria-pressed={bsp === k} onClick={() => setBsp(k)}>
            {t(`tut.sz.ue.${k}Btn`)}
          </button>
        ))}
      </div>
      <div className="reihe">
        {hand.map(([v, su], i) => (
          <KartePro key={`${bsp}${i}`} v={v} s={su} abbr={per[i].formations.map((f) => formationAbbr(f.type)).join("")}
            mult={per[i].mult} sel={per[i].formations.length >= 2} mode="suit" />
        ))}
      </div>
      <div className="res w">
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>{types.map((typ) => formationName(typ)).join(" + ")}</div>
          <div className="rechnung">{t(`tut.sz.ue.${bsp}`)}</div>
        </div>
        <div className="pkt">×{f2(Math.max(...per.map((q) => q.mult)))}</div>
      </div>
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
      {/* Runde 2, R9: scoreFlat verlangt den Formations-Fall im Kontext — ein leeres Objekt
          ergab 0/0 („+0 anstatt +0"). hasFormation:true liefert die echten Stufenwerte. */}
      <div className="merk3">{rich(t("tut.sz.n.merk1", {
        a: fmtNum(FAMILY_DEFS.D_FORMATION_BONUS?.tiers?.[1]?.scoreFlat?.({ hasFormation: true }) ?? 0),
        b: fmtNum(FAMILY_DEFS.D_FORMATION_BONUS?.tiers?.[2]?.scoreFlat?.({ hasFormation: true }) ?? 0),
      }))}</div>
    </div>
  );
}

/* ── Szene N2 · Legendär (Entwurf Schirm 13, unterer Teil) ──────
   Der Legendär-Teil des Raritäten-Schirms als eigene Lektion: der ganze Schirm maß
   1285 px und riss das Budget — Owner-Entscheid: aufteilen statt kürzen. */
export function LegendaerSzene({ hint }) {
  useLocale();
  const gold = "#d4a63a";
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
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
    </div>
  );
}

/* ── Der Ionensturm (Entwurf, aus src/ui/fx/CardIonStorm.jsx destilliert) ──
   Perimeter abtasten, Zacken senkrecht zur Kante, alle 50 ms neu würfeln, dazu ab und
   an ein Bogen quer über die Karte. */
const ION = "#5ec8f0";
function ionSturm(canvas) {
  /* PAD ist der ÜBERSTAND der Canvas über die Karte (scenes.css .grosskarte canvas: -12px):
     die Kontur liegt damit genau auf der Kartenkante, unabhängig von der Kartengröße (R7). */
  const T = { N: 84, CORNER: 12, JIT: 3.4, TAN: 1.6, PAD: 12, RESEED: 50,
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
export function BlitzkarteSzene({ hint }) {
  useLocale();
  const [n, setN] = useState(0);
  const [q, setQ] = useState(0);
  const canvasRef = useRef(null);
  const fxRef = useRef(null);
  const voll = n >= C.ION_MAX_STACKS;
  useEffect(() => {
    fxRef.current = ionSturm(canvasRef.current);
    return () => fxRef.current?.stop();
  }, []);
  useEffect(() => { fxRef.current?.setzeAktiv(voll); }, [voll]);
  /* Ladungs-Loop (Review-Runde Zeile 16, Mockup freigegeben): die Ladungsleiste füllt sich von
     selbst, voll heißt +1 Stapel auf der Karte, bei 5/5 kurze Ruhe, dann von vorn. Die Karte
     selbst rendert wie im Spiel: Rahmen ab Stapel 1, Blitze erst bei voll (ionSturm oben).
     Reduzierte Bewegung: stehendes Endbild statt Loop. */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(C.ION_MAX_STACKS); setQ(C.LIGHTNING_MAX_CHARGE);
      return undefined;
    }
    let alive = true, id = null, qq = 0, nn = 0;
    const tick = (wait) => { id = setTimeout(() => {
      if (!alive) return;
      if (qq < C.LIGHTNING_MAX_CHARGE) { qq++; setQ(qq); tick(qq === C.LIGHTNING_MAX_CHARGE ? 600 : 170); }
      else if (nn < C.ION_MAX_STACKS) { nn++; qq = 0; setN(nn); setQ(0); tick(nn === C.ION_MAX_STACKS ? 2600 : 700); }
      else { nn = 0; qq = 0; setN(0); setQ(0); tick(900); }
    }, wait); };
    tick(600);
    return () => { alive = false; clearTimeout(id); };
  }, []);
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="zeile">
        <span className="label">{t("bar.lightning.state.charge", { charge: q, max: C.LIGHTNING_MAX_CHARGE })}</span>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${C.LIGHTNING_MAX_CHARGE}, 1fr)`, gap: 4, marginTop: 6 }}>
          {Array.from({ length: C.LIGHTNING_MAX_CHARGE }, (_, i) => (
            <i key={i} style={{ height: 10, borderRadius: 3,
              background: i < q ? "#8a7de0" : "#1d1d28",
              border: `1px solid ${i < q ? "#8a7de0" : "#2a2a36"}`,
              boxShadow: i < q ? "0 0 7px rgba(138,125,224,.55)" : "none" }} />
          ))}
        </div>
        <p className="hint" style={{ textAlign: "center", marginTop: 6 }}>{t("tut.sz.cx.vollzu")}</p>
      </div>
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

/* ════════════════════ Welle 3 · Feuer, Pflanze, Eis ════════════════════ */

/* ── Szene Ka · Die Feuer-Karten (Entwurf Schirm 18) ────────────
   Vier echte Zustände statt eines freien Reglers: Schmieden gibt FORGE_VALUE je Schmiedung
   (höchstens drei), Brandmale stapeln nicht (engine nimmt Math.max; mit Schmelzofen −2). */
const F_ZUST = [
  { f: 0, b: 0, wie: "tut.sz.fb.wie0" },
  { f: C.FORGE_VALUE, b: C.BRAND_VALUE, wie: "tut.sz.fb.wie1" },
  { f: 2 * C.FORGE_VALUE, b: C.BRAND_VALUE, wie: "tut.sz.fb.wie2" },
  { f: C.FORGE_MAX_PER_CARD, b: C.BRAND_VALUE + C.SCHMELZOFEN_BRAND_BONUS, wie: "tut.sz.fb.wie3" },
];
const FB_DEIN = 4, FB_SEIN = 9;
export const fireScoreAt = (m) => Math.round((m - C.FIRE_MARGIN_OFFSET) * C.FIRE_SCORE_BASE
  + C.FIRE_SCORE_BASE * C.FIRE_SCORE_SQRT_K * Math.sqrt(Math.max(0, m - C.FIRE_MARGIN_OFFSET)));
const fireHeatAt = (m) => Math.round(marginHeatPoints(m) * C.HEAT_PER_POINT);

export function FeuerkartenSzene({ hint }) {
  useLocale();
  const [i, setI] = useState(0);
  const z = F_ZUST[i];
  const dein = FB_DEIN + z.f, seiner = FB_SEIN - z.b, vor = dein - seiner;
  const ofen = skillDef("SK_FIRE_17")?.name ?? "";
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="paar">
        <div><span className="label">{t("tut.sz.fb.mein")}</span>
          <div className="buehne klein"><div className={`grosskarte fk ${z.f === 0 ? "aus" : ""}`}>
            <span className="amboss">⚒+{z.f}</span>
            <span className="cwert">{dein}</span>
          </div></div>
        </div>
        <div><span className="label">{t("tut.sz.fb.gegner")}</span>
          <div className="buehne klein"><div className={`grosskarte bk ${z.b === 0 ? "aus" : ""}`}>
            <span className="brandm">−{z.b}</span>
            <span className="cwert">{seiner}</span>
            <img className="fzeichen" src={FACTION_ICON_SRC.fire} alt="" aria-hidden="true" />
          </div></div>
        </div>
      </div>
      <div className="werkzeuge">
        <button type="button" className="tbtn" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>{t("tut.back")}</button>
        <button type="button" className="tbtn" onClick={() => setI(Math.min(F_ZUST.length - 1, i + 1))}
          disabled={i >= F_ZUST.length - 1}>{t("tut.next")}</button>
      </div>
      <p className="hint">{t(z.wie, { ofen })}</p>
      <div className={`res ${vor < 0 ? "l" : vor < C.HEAT_MIN_MARGIN ? "" : "kern2"}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>
            {vor < 0 ? t("tut.sz.niederlage") : vor < C.HEAT_MIN_MARGIN ? t("tut.sz.fb.nmKnapp") : t("tut.sz.fb.nmVor", { v: vor })}
          </div>
          <div className="rechnung">
            {vor < 0 ? t("tut.sz.fb.txtVerlust", { a: dein, b: seiner })
              : vor < C.HEAT_MIN_MARGIN ? t("tut.sz.fb.txtKnapp", { v: vor, min: C.HEAT_MIN_MARGIN })
              : t("tut.sz.fb.txtVor", { v: vor, score: fmtNum(fireScoreAt(vor)), heiz: fireHeatAt(vor) })}
          </div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>{dein} : {seiner}</div>
      </div>
    </div>
  );
}


/* ── Szene Ka2 · Die Schmiede (Entwurf Schirm 18, unterer Teil) ──
   Der Karten-Schirm des Entwurfs maß 1037 px — über dem vollen Budget. Owner-Entscheid:
   aufteilen statt kürzen; Kette und Erkennungszeichen sind eine eigene Lektion. */
export function SchmiedeSzene({ hint }) {
  useLocale();
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="zeile"><span className="label">{t("tut.sz.fb.ketteLabel")}</span>
        <div className="kette" style={{ marginTop: 7 }}>
          <div><b>{t("tut.sz.fb.k1b")}</b><span>{rich(t("tut.sz.fb.k1", { n: C.BRAND_ASH }))}</span></div>
          <div><b>{t("tut.sz.fb.k2b")}</b><span>{rich(t("tut.sz.fb.k2", { c: C.FORGE_COST }))}</span></div>
          <div><b>{t("tut.sz.fb.k3b")}</b><span>{rich(t("tut.sz.fb.k3", {
            skill: skillDef("SK_FIRE_15")?.name ?? "", v: C.FORGE_VALUE }))}</span></div>
        </div></div>
      <div className="zeile"><span className="label">{t("tut.sz.cx.erkennLabel")}</span>
        <div className="regeln" style={{ marginTop: 7 }}>
          <div><b>1</b><span>{t("tut.sz.fb.e1")}</span></div>
          <div><b>2</b><span>{t("tut.sz.fb.e2")}</span></div>
        </div></div>
    </div>
  );
}

/* ── Szene Hi · Die Hitzeleiste (Entwurf Schirm 19) ─────────────
   Regler von 0 bis über die Leiste hinaus (Weißglut), Skill-Stufen aus den echten
   Konstanten, Dividende min(h, Cap) × FIRE_HEAT_DIVIDEND. */
export function HitzeSzene({ hint, readoutLabel }) {
  useLocale();
  const [h, setH] = useState(0);
  const MAX = C.HEAT_MAX, UEBER = C.OVERHEAT_MAX;
  const ueber = Math.max(0, h - MAX), leiste = Math.min(h, MAX);
  const div = Math.min(leiste, C.FIRE_DIVIDEND_HEAT_CAP) * C.FIRE_HEAT_DIVIDEND;
  const gk = skillDef("SK_FIRE_06")?.name ?? "";
  const stufen = [
    { ab: C.GLOWING_T1_HEAT, key: "tut.sz.fc.s1", vars: { gk, v: C.GLOWING_T1_VALUE } },
    { ab: C.SCHMELZOFEN_MIN_HEAT, key: "tut.sz.fc.s2", vars: {
      ofen: skillDef("SK_FIRE_17")?.name ?? "", schmiede: skillDef("SK_FIRE_15")?.name ?? "",
      r: Math.round(C.SCHMELZOFEN_FORGE_DISCOUNT * 100) } },
    { ab: C.GLOWING_T2_HEAT, key: "tut.sz.fc.s3", vars: { gk, v: C.GLOWING_T2_VALUE, m: C.GLOWING_T2_MARGIN } },
    { ab: C.CONFLAG_MIN_HEAT, key: "tut.sz.fc.s4", vars: {
      fb: skillDef("SK_FIRE_11")?.name ?? "", t: C.GLOWING_T1_HEAT } },
    { ab: C.GLOWING_T3_HEAT, key: "tut.sz.fc.s5", vars: { gk, v: C.GLOWING_T3_VALUE, m: C.GLOWING_T3_MARGIN } },
  ];
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="zeile">
        <div className="ziel"><span className="label">{t("bar.fire.heat")}</span>
          <span className="num" style={{ marginLeft: "auto" }}>{fmtPct(h / 100)}</span></div>
        <div className="hleiste" style={{ marginTop: 7 }}>
          <div className="hfill" style={{ width: `${(h / (MAX + UEBER) * 100).toFixed(1)}%` }}
            {...(ueber > 0 ? { className: "hfill gluehend" } : null)} />
          {stufen.map((s) => (
            <i key={s.ab} className="htick" style={{ left: `${(s.ab / (MAX + UEBER) * 100).toFixed(1)}%` }} />
          ))}
        </div>
        <input type="range" min="0" max={MAX + UEBER} step="1" value={h} className="warm"
          onChange={(e) => setH(Number(e.target.value))} aria-label={t("bar.fire.heat")} />
        <div className="werkzeuge">
          <button type="button" className="tbtn" onClick={() => setH(0)}>{t("tut.sz.fc.kalt")}</button>
          <button type="button" className="tbtn" onClick={() => setH(C.FIRE_DIVIDEND_HEAT_CAP)}>{fmtPct(C.FIRE_DIVIDEND_HEAT_CAP / 100)}</button>
          <button type="button" className="tbtn" onClick={() => setH(MAX)}>{t("tut.sz.fc.voll")}</button>
        </div>
      </div>
      <div className="zeile"><span className="label">{t("tut.sz.fc.skillsLabel")}</span>
        <div className="stufen" style={{ marginTop: 7 }}>
          {stufen.map((s) => (
            <div key={s.ab} className={`stufe ${h >= s.ab ? "an" : ""}`}>
              <b>{fmtPct(s.ab / 100)}</b>
              <span>{rich(t(s.key, s.vars))}</span>
            </div>
          ))}
        </div></div>
      <div className={`res ${div > 0 ? "kern2" : ""}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>{readoutLabel}</div>
          <div className="rechnung">{t("tut.sz.fc.txt")}</div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>+{fmtNum(div)}</div>
      </div>
      <div className="merk3 warm">{rich(
        ueber > 0
          ? t("tut.sz.fc.mUeber", { u: ueber, plus: fmtNum(Math.round(ueber * C.OVERHEAT_SCORE_STEP * 100)) })
          : h >= C.FIRE_DIVIDEND_HEAT_CAP
            ? t("tut.sz.fc.mDeckel", { cap: C.FIRE_DIVIDEND_HEAT_CAP, fb: skillDef("SK_FIRE_11")?.name ?? "" })
            : t("tut.sz.fc.mWachs", { d: C.FIRE_HEAT_DIVIDEND, cap: C.FIRE_DIVIDEND_HEAT_CAP }))}</div>
    </div>
  );
}

/* ── Szene Kp · Die Pflanzen-Karte (Entwurf Schirm 22) ──────────
   Zahlfarbe blendet von der Kartenfarbe ins Grün (vocab.js plantNumberColor), der Wuchs
   steigt von unten, der Ring läuft nur während des Wachsens. */
const SUIT_B = "#5a8ade";
const PLANT = "#5ab87a", PLANT_RIPE = "#86e0a0", PLANT_FULL = "#c8ffdc";
const mischHex = (a, b, tt) => {
  const hx = (x) => [1, 3, 5].map((k) => parseInt(x.slice(k, k + 2), 16));
  const [ar, ag, abl] = hx(a), [br, bg, bb] = hx(b);
  const cc = (x, y) => Math.round(x + (y - x) * tt).toString(16).padStart(2, "0");
  return "#" + cc(ar, br) + cc(ag, bg) + cc(abl, bb);
};

export function PflanzkarteSzene({ hint }) {
  useLocale();
  const [g, setG] = useState(0);
  const [rein, setRein] = useState(true);
  const GRUEN = C.PLANT_GREEN_THRESHOLD, CAP = C.PLANT_VALUE_CAP, PRO = C.WURZELSCHLAG_PER_GROWTH;
  const gruen = g >= GRUEN;
  const wert = rein ? Math.min(CAP, 4 + Math.floor(g / PRO)) : 4;
  const voll = rein && wert >= CAP;
  const p = Math.min(1, g / GRUEN);
  const bis = Math.min(GRUEN, g);
  const nm = voll ? "tut.sz.pb.nmVoll" : gruen ? "tut.sz.pb.nmReif" : g > 0 ? "tut.sz.pb.nmSetzling" : "tut.sz.pb.nmFrisch";
  const txt = !rein ? t("tut.sz.pb.txtMix", { w: 4 })
    : voll ? t("tut.sz.pb.txtVoll", { cap: CAP })
    : gruen ? t("tut.sz.pb.txtReif", { g: GRUEN, pro: PRO, plus: 1 })
    : g > 0 ? t("tut.sz.pb.txtSetzling")
    : t("tut.sz.pb.txtFrisch");
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="buehne">
        <div className="grosskarte" style={{ boxShadow: gruen ? "inset 0 0 0 1px #5ab87a88, inset 0 0 16px #5ab87a55" : "none" }}>
          <span className={`wuchs ${gruen ? "reif" : ""}`} style={{ height: `${(bis / GRUEN * 100).toFixed(0)}%` }} />
          <span className="cwert" style={{
            color: gruen ? (voll ? PLANT_FULL : PLANT_RIPE) : mischHex(SUIT_B, PLANT, p * 0.85),
            textShadow: gruen ? `0 0 10px ${voll ? PLANT_FULL : PLANT_RIPE}88` : "none",
          }}>{wert}</span>
          {!gruen && g > 0 && (
            <span className="wring" style={{ display: "block",
              background: `conic-gradient(${PLANT} ${Math.round(p * 100)}%, #ffffff1f ${Math.round(p * 100)}%)` }} />
          )}
        </div>
      </div>
      <div className="zeile">
        <div className="ziel"><span className="label">{t("tut.sz.pb.bisLabel")}</span>
          <span className="num" style={{ marginLeft: "auto" }}>
            {gruen ? t("tut.sz.pb.reif") : t("tut.sz.pb.bisN", { n: bis, max: GRUEN })}</span></div>
        <div className="wleiste" style={{ marginTop: 6 }}>
          <div className={`wfill ${gruen ? "reif" : ""}`} style={{ width: `${(bis / GRUEN * 100).toFixed(0)}%` }} />
        </div>
        <p className="hint">{gruen
          ? (rein ? t("tut.sz.pb.hReif", { pro: PRO, plus: 1, cap: CAP }) : t("tut.sz.pb.hReifMix"))
          : t("tut.sz.pb.hWachs", { plus: 1 })}</p>
      </div>
      <div className="zeile">
        <div className="ziel"><span className="label">{t("tut.sz.pb.wachsLabel")}</span>
          <span className="num" style={{ marginLeft: "auto" }}>{g}</span></div>
        <input type="range" min="0" max="28" step="1" value={g} className="gruen"
          onChange={(e) => setG(Number(e.target.value))} aria-label={t("tut.sz.pb.wachsLabel")} />
        <div className="werkzeuge">
          <button type="button" className="tbtn" onClick={() => setG(0)}>{t("tut.sz.pb.frisch")}</button>
          <button type="button" className="tbtn" onClick={() => setG(GRUEN)}>{t("tut.sz.pb.reifBtn")}</button>
          <button type="button" className="tbtn" onClick={() => setG(28)}>{t("tut.sz.pb.vollBtn")}</button>
        </div>
      </div>
      <div className="zeile"><span className="label">{t("tut.sz.pb.skillsLabel")}</span>
        <div className="chips" style={{ marginTop: 8 }}>
          <button type="button" className="chip" aria-pressed={rein} onClick={() => setRein(true)}>{t("tut.sz.pb.rein")}</button>
          <button type="button" className="chip" aria-pressed={!rein} onClick={() => setRein(false)}>{t("tut.sz.pb.mix")}</button>
        </div>
        <p className="hint">{rich(t("tut.sz.pb.skillsHint", { ref: C.PLANT_GROWTH_SKILL_REF }))}</p>
      </div>
      <div className={`res ${voll ? "kern2" : gruen ? "w" : ""}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>{t(nm)}</div>
          <div className="rechnung">{txt}</div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>{t("tut.sz.pb.wert", { v: wert })}</div>
      </div>
    </div>
  );
}


/* ── Szene Kp2 · Woran du es erkennst (Entwurf Schirm 22, unterer Teil) ──
   Der Pflanzen-Karten-Schirm maß 1083 px — Owner-Entscheid: aufteilen statt kürzen. */
export function PflanzzeichenSzene({ hint }) {
  useLocale();
  const GRUEN = C.PLANT_GREEN_THRESHOLD;
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="zeile"><span className="label">{t("tut.sz.cx.erkennLabel")}</span>
        <div className="regeln" style={{ marginTop: 7 }}>
          <div><b>1</b><span>{rich(t("tut.sz.pb.e1"))}</span></div>
          <div><b>2</b><span>{rich(t("tut.sz.pb.e2"))}</span></div>
          <div><b>3</b><span>{rich(t("tut.sz.pb.e3", { g: GRUEN }))}</span></div>
        </div></div>
    </div>
  );
}

/* ── Szene Fl · Das grüne Feld (Entwurf Schirm 23) ──────────────
   Fünfzehn tappbare Karten, drei Segmente; die Rechnung nutzt FARBBLOCK_BASE,
   UEBERWUCHERUNG_FACTOR/FIELD und BLUETE_SCORE — dieselben Konstanten wie der Lauf. */
const PC_N = 15;

export function GruenfeldSzene({ hint, labels: L }) {
  useLocale();
  const [feld, setFeld] = useState(() => new Array(PC_N).fill(false));
  const n = feld.filter(Boolean).length, anteil = n / PC_N;
  const ueber = anteil >= C.UEBERWUCHERUNG_FIELD;
  const seg = feld.slice(0, 5), imSeg = seg.filter(Boolean).length;
  let best = 0, lauf = 0;
  for (const x of seg) { lauf = x ? lauf + 1 : 0; if (lauf > best) best = lauf; }
  const kette = best;
  const block = kette >= 3 ? FARBBLOCK_BASE + (ueber ? C.UEBERWUCHERUNG_FACTOR : 0) : 1;
  const nachBlock = Math.round(WIN * block);
  const bluete = kette >= 3 ? C.BLUETE_SCORE * imSeg * (ueber ? 2 : 1) : 0;
  const gesamt = nachBlock + bluete;
  const skUeber = skillDef("SK_PLANT_14")?.name ?? "";
  const skBluete = skillDef("SK_PLANT_10")?.name ?? "";
  const fbWort = formationName("farbblock");
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div><span className="label">{t("tut.sz.pc.feldLabel")}</span>
        <div className="feld gross" style={{ marginTop: 6, gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
          {feld.map((gr, k) => (
            <button key={k} type="button" className={`kz pfl ${gr ? "reif" : ""}`}
              onClick={() => setFeld((f) => { const nf = [...f]; nf[k] = !nf[k]; return nf; })}>
              <span className="kzn">{k + 1}</span>
              <span className="pwert">{gr ? t("tut.sz.pb.reif") : t("tut.sz.pc.grau")}</span>
            </button>
          ))}
        </div>
        <div className="werkzeuge">
          <button type="button" className="tbtn" onClick={() => setFeld(new Array(PC_N).fill(false))}>{L.none}</button>
          <button type="button" className="tbtn" onClick={() => setFeld(feld.map((_, k) => k < 10))}>{L.twoThirds}</button>
          <button type="button" className="tbtn" onClick={() => setFeld(new Array(PC_N).fill(true))}>{L.all}</button>
        </div></div>
      <div className={`res ${ueber ? "w" : ""}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>{t("tut.sz.pc.nm", { n, max: PC_N })}</div>
          <div className="rechnung">{ueber ? t("tut.sz.pc.txtUeber", { skill: skUeber })
            : t("tut.sz.pc.txtNoch", { n: Math.ceil(PC_N * C.UEBERWUCHERUNG_FIELD) - n, skill: skUeber })}</div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>{fmtPct(anteil)}</div>
      </div>
      <div className="zeile"><span className="label">{t("tut.sz.pc.eqLabel")}</span>
        <div className="eq" style={{ marginTop: 7 }}>
          <span className="step">{rich(t("tut.sz.d.eqBasis", { v: fmtNum(WIN) }))}</span>
          <span className={`step ${block > 1 ? "" : "off"}`}>{rich(t("tut.sz.pc.eqBlock", {
            fb: fbWort, f: f2(block),
            zusatz: kette >= 3 ? "" : t("tut.sz.pc.eqBlockAb", { min: 3 }),
            v: fmtNum(nachBlock) }))}</span>
          <span className={`step ${bluete ? "" : "off"}`}>{rich(t("tut.sz.pc.eqBluete", {
            sk: skBluete,
            teil: kette >= 3
              ? `${fmtNum(C.BLUETE_SCORE)} × ${t("tut.sz.pc.gruene", { n: imSeg })}${ueber ? " × 2" : ""}`
              : t("tut.sz.pc.teilBraucht", { min: 3 }),
            v: fmtNum(bluete) }))}</span>
          <span className="step trenn">{rich(t("tut.sz.pc.eqGesamt", { v: fmtNum(gesamt) }))}</span>
        </div>
        <p className="hint">{rich(t("tut.sz.pc.eqHint", { b: skBluete, u: skUeber }))}</p>
      </div>
      <div className="merk3 gruen">{rich(ueber
        ? t("tut.sz.pc.merkUeber", { skill: skUeber, a: f2(FARBBLOCK_BASE), b: f2(FARBBLOCK_BASE + C.UEBERWUCHERUNG_FACTOR) })
        : t("tut.sz.pc.merkCap", { a: f2(FARBBLOCK_BASE) }))}</div>
    </div>
  );
}

/* ── Szene Ek · Die Eis-Karte (Entwurf Schirm 27) ───────────────
   Die Frostfront springt an den Schwellen (FrostIce.jsx frontOf): COVER 0,47 der Karte,
   unter Stufe 1 nur COVER × BASE_FREEZE. Werte 0,47/0,06 aus FrostIce.jsx TUNE —
   dort nicht exportiert, deshalb hier zitiert statt importiert. */
const E_COVER = 0.47, E_BASISFROST = 0.06;

export function GletscherSzene({ hint, readoutLabel }) {
  useLocale();
  const [m, setM] = useState(0);
  const SCHWELLEN = GLACIER.THRESHOLDS, WUCHT = GLACIER.TIER_MULT, BURST = GLACIER.BURST_AT;
  const stufe = SCHWELLEN.reduce((acc, sw) => acc + (m >= sw ? 1 : 0), 0);
  const bricht = m >= BURST;
  const front = m <= 0 ? 0 : stufe === 0 ? E_COVER * E_BASISFROST : E_COVER * (SCHWELLEN[stufe - 1] / BURST);
  const gg = front / E_COVER;
  const al = (x) => (x * gg).toFixed(3);
  const frostBg = gg <= 0 ? "none"
    : `linear-gradient(180deg,rgba(94,200,240,0) ${(100 - 66 * gg).toFixed(1)}%,`
      + `rgba(94,200,240,${al(0.55)}) ${(100 - 26 * gg).toFixed(1)}%,`
      + `rgba(207,238,255,${al(0.9)}) 100%),`
    + `linear-gradient(90deg,rgba(207,238,255,${al(0.55)}) 0%,rgba(94,200,240,0) ${(20 * gg).toFixed(1)}%,`
      + `rgba(94,200,240,0) ${(100 - 20 * gg).toFixed(1)}%,rgba(207,238,255,${al(0.55)}) 100%)`;
  const nm = bricht ? "tut.sz.eb.nmBricht" : m === 0 ? "tut.sz.eb.nmFrisch"
    : stufe === 0 ? "tut.sz.eb.nmWaechst" : null;
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="buehne">
        <div className="grosskarte ek">
          <span className={`frost ${bricht ? "voll" : ""}`} style={{ background: frostBg }} />
          <span className="cwert">6</span>
          <span className="gmarke"><img src={GLOSSARY_IMG_SRC.glacier} alt="" width="11" height="11" /><b>{m}</b></span>
        </div>
      </div>
      <div className="zeile">
        <div className="ziel"><span className="label">{readoutLabel}</span>
          <span className="num" style={{ marginLeft: "auto" }}>{m}</span></div>
        <div className="mleiste" style={{ marginTop: 7 }}>
          <div className={`mfill ${bricht ? "voll" : ""}`} style={{ width: `${(m / BURST * 100).toFixed(0)}%` }} />
          {SCHWELLEN.slice(0, 2).map((sw) => (
            <i key={sw} className="mtick" style={{ left: `${(sw / BURST * 100).toFixed(1)}%` }} />
          ))}
        </div>
        <input type="range" min="0" max={BURST} step="1" value={m} className="kalt"
          onChange={(e) => setM(Number(e.target.value))} aria-label={readoutLabel} />
        <div className="werkzeuge">
          <button type="button" className="tbtn" onClick={() => setM(0)}>0</button>
          <button type="button" className="tbtn" onClick={() => setM(SCHWELLEN[1])}>{SCHWELLEN[1]}</button>
          <button type="button" className="tbtn" onClick={() => setM(BURST)}>{BURST}</button>
        </div>
      </div>
      <div className={`res ${bricht ? "eis" : stufe === 0 ? "" : "kern2"}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>
            {nm ? t(nm) : t("tut.sz.eb.nmStufe", { n: stufe })}
          </div>
          <div className="rechnung">
            {bricht ? t("tut.sz.eb.txtBricht", { max: BURST })
              : m === 0 ? t("tut.sz.eb.txtFrisch", { a: GLACIER.EWIGER_FROST, b: GLACIER.WIN_MASS })
              : stufe === 0 ? t("tut.sz.eb.txtWaechst", { t1: SCHWELLEN[0] })
              : t("tut.sz.eb.txtNoch", { n: BURST - m })}
          </div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>
          {t("tut.sz.eb.wucht", { w: f1(WUCHT[stufe]) })}
        </div>
      </div>
      <div className="zeile"><span className="label">{t("tut.sz.eb.stufenLabel")}</span>
        <div className="stufen" style={{ marginTop: 7 }}>
          {SCHWELLEN.map((sw, i2) => (
            <div key={sw} className={`stufe eis ${m >= sw ? "an" : ""}`}>
              <b>{sw}</b>
              <span>{t("tut.sz.eb.sZeile", { m: f1(WUCHT[i2 + 1]) })}{i2 === 2 ? t("tut.sz.eb.sBricht") : ""}</span>
            </div>
          ))}
        </div></div>
    </div>
  );
}

/* ── Szene Ef · Das Gletscherfeld (Entwurf Schirm 28) ───────────
   Frei tappbares 5×8-Brett plus vier Formen-Presets. Die Formations-Erkennung ist die
   Logik aus glacier.js glacierFormations (jedes Vorkommen multipliziert, Überlappende
   stapeln); die Faktoren sind die exportierten GEO_-Konstanten. */
const EC_SP = 5, EC_ZE = 8, EC_N = EC_SP * EC_ZE;
const EC_SOFTCAP = 40000, EC_SLOPE = 0.06;   // glacier.js:23 — dort nicht exportiert, zitiert
const EC_SCALE = 340;                        // glacier.js:19 BURST_SCALE

function ecGeoAt(gSet, p) {
  const pos = (r, cc) => r * EC_SP + cc;
  const isG = (q) => gSet.has(q);
  const f = new Array(EC_N).fill(1); const namen = new Map();
  const add = (typ, faktor, felder) => {
    for (const q of felder) { f[q] *= faktor; if (q === p) namen.set(typ, (namen.get(typ) || 0) + 1); }
  };
  for (let r = 0; r < EC_ZE; r++) {
    let voll = true;
    for (let cc = 0; cc < EC_SP; cc++) if (!isG(pos(r, cc))) { voll = false; break; }
    if (voll) add("linie", GLACIER.GEO_LINIE, Array.from({ length: EC_SP }, (_, cc) => pos(r, cc)));
  }
  for (let cc = 0; cc < EC_SP; cc++) {
    let voll = true;
    for (let r = 0; r < EC_ZE; r++) if (!isG(pos(r, cc))) { voll = false; break; }
    if (voll) add("linie", GLACIER.GEO_LINIE, Array.from({ length: EC_ZE }, (_, r) => pos(r, cc)));
  }
  for (let r = 0; r < EC_ZE - 1; r++) for (let cc = 0; cc < EC_SP - 1; cc++)
    if (isG(pos(r, cc)) && isG(pos(r, cc + 1)) && isG(pos(r + 1, cc)) && isG(pos(r + 1, cc + 1)))
      add("block", GLACIER.GEO_BLOCK, [pos(r, cc), pos(r, cc + 1), pos(r + 1, cc), pos(r + 1, cc + 1)]);
  for (let r = 1; r < EC_ZE - 1; r++) for (let cc = 1; cc < EC_SP - 1; cc++) {
    const z = pos(r, cc);
    if (isG(z) && isG(pos(r - 1, cc)) && isG(pos(r + 1, cc)) && isG(pos(r, cc - 1)) && isG(pos(r, cc + 1)))
      add("kreuz", GLACIER.GEO_KREUZ, [z, pos(r - 1, cc), pos(r + 1, cc), pos(r, cc - 1), pos(r, cc + 1)]);
  }
  for (let r = 0; r < EC_ZE - 2; r++) for (let cc = 0; cc < EC_SP - 2; cc++) {
    let voll = true;
    for (let dr = 0; dr < 3 && voll; dr++) for (let dc = 0; dc < 3; dc++) if (!isG(pos(r + dr, cc + dc))) { voll = false; break; }
    if (voll) {
      const ps = [];
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) ps.push(pos(r + dr, cc + dc));
      add("flaeche", GLACIER.GEO_FLAECHE, ps);
    }
  }
  return { f: f[p], namen: [...namen].map(([typ, k]) => (k > 1 ? `${glacierFormName(typ)} ×${k}` : glacierFormName(typ))) };
}

export function GletscherfeldSzene({ hint }) {
  useLocale();
  const [gSet, setGSet] = useState(() => new Set());
  const [sel, setSel] = useState(null);
  const nbOf = (p) => {
    const x = p % EC_SP, y = (p / EC_SP) | 0, out = [];
    if (y > 0) out.push(p - EC_SP);
    if (y < EC_ZE - 1) out.push(p + EC_SP);
    if (x > 0) out.push(p - 1);
    if (x < EC_SP - 1) out.push(p + 1);
    return out;
  };
  const tap = (p) => {
    const n = new Set(gSet);
    if (n.has(p) && sel === p) n.delete(p); else n.add(p);
    setGSet(n); setSel(n.has(p) ? p : null);
  };
  const preset = (felder, s2) => { setGSet(new Set(felder)); setSel(s2); };
  const listeJoin = (a) => (a.length < 2 ? a[0] || "" : `${a.slice(0, -1).join(", ")} ${t("tut.sz.und")} ${a[a.length - 1]}`);
  const n = gSet.size;
  const aktiv = sel != null && gSet.has(sel);
  let body = null;
  if (aktiv) {
    const nb = nbOf(sel), gN = nb.filter((p) => gSet.has(p)).length;
    const kask = 1 + GLACIER.KASKADE_PER_NEIGHBOR * gN;
    const koll = 1 + (GLACIER.KOLLISION_MULT - 1) * (nb.length ? gN / nb.length : 0);
    const geo = ecGeoAt(gSet, sel), formen = listeJoin(geo.namen);
    const grund = GLACIER.BURST_AT * GLACIER.TIER_MULT[3] * EC_SCALE;
    const roh = grund * kask * koll * geo.f;
    const gedeckelt = roh > EC_SOFTCAP;
    const burst = Math.round(gedeckelt ? EC_SOFTCAP + (roh - EC_SOFTCAP) * EC_SLOPE : roh);
    const sieg = Math.round(burst * (1 + STEP * 5) * D_FORM * CRIT);
    body = { gN, kask, koll, geo, formen, grund, roh, gedeckelt, burst, sieg };
  }
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="zeile"><p style={{ margin: 0, fontSize: 13, color: "var(--ink)" }}>{rich(t("tut.sz.ec.kern"))}</p></div>
      <div>
        <div className="ziel"><span className="label">{t("tut.sz.ec.brettLabel", { a: EC_SP, b: EC_ZE })}</span>
          <button type="button" className="tbtn leer" style={{ marginLeft: "auto" }}
            onClick={() => { setGSet(new Set()); setSel(null); }}>{t("tut.sz.ec.leeren")}</button></div>
        <div className="brett eis" style={{ marginTop: 6 }}>
          {Array.from({ length: EC_ZE }, (_, y) => (
            <div key={y} className="zr">
              {Array.from({ length: EC_SP }, (_, x) => {
                const p = y * EC_SP + x;
                return <button key={x} type="button" onClick={() => tap(p)}
                  className={`z ${gSet.has(p) ? "gl" : ""} ${p === sel ? "sel" : ""}`} />;
              })}
            </div>
          ))}
        </div>
        <span className="label" style={{ display: "block", marginTop: 11 }}>{t("tut.sz.ec.formenLabel")}</span>
        <div className="werkzeuge formen">
          <button type="button" className="tbtn" onClick={() => preset([11, 12, 16, 17], 11)}>{glacierFormName("block")}</button>
          <button type="button" className="tbtn" onClick={() => preset([12, 16, 17, 18, 22], 17)}>{glacierFormName("kreuz")}</button>
          <button type="button" className="tbtn" onClick={() => preset([15, 16, 17, 18, 19], 17)}>{glacierFormName("linie")}</button>
          <button type="button" className="tbtn" onClick={() => {
            const f = []; for (let y = 2; y < 5; y++) for (let x = 1; x < 4; x++) f.push(y * EC_SP + x);
            preset(f, 3 * EC_SP + 2);
          }}>{glacierFormName("flaeche")}</button>
        </div>
      </div>
      <div className={`res ${body && body.geo.namen.length ? "eis" : body ? "kern2" : ""}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>
            {n === 0 ? t("tut.sz.ec.nmKein") : t("tut.sz.ec.nmN", { n })}
          </div>
          <div className="rechnung">
            {!aktiv ? (n ? t("tut.sz.ec.txtTapGl") : t("tut.sz.ec.txtTapFeld"))
              : `${body.gN === 1 ? t("tut.sz.ec.nb1", { n: 1 }) : t("tut.sz.ec.nbN", { n: body.gN })}, ${body.geo.namen.length ? body.formen : t("tut.sz.ec.keineForm")}`}
          </div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>{aktiv ? fmtNum(body.burst) : "0"}</div>
      </div>
      <div className="zeile"><span className="label">{t("tut.sz.ec.eqLabel")}</span>
        <div className="eq" style={{ marginTop: 7 }}>
          {!aktiv ? <span className="step off">{t("tut.sz.ec.eqKein")}</span> : (
            <>
              <span className="step">{rich(t("tut.sz.ec.eqGrund", {
                m: GLACIER.BURST_AT, w: f1(GLACIER.TIER_MULT[3]), scale: fmtNum(EC_SCALE), v: fmtNum(body.grund) }))}</span>
              <span className={`step ${body.gN ? "" : "off"}`}>{t("tut.sz.ec.eqKask", {
                f: f2(body.kask), nb: body.gN === 1 ? t("tut.sz.ec.nb1", { n: 1 }) : t("tut.sz.ec.nbN", { n: body.gN }) })}</span>
              <span className={`step ${body.gN ? "" : "off"}`}>{t("tut.sz.ec.eqKoll", { f: f2(body.koll) })}</span>
              <span className={`step ${body.geo.namen.length ? "" : "off"}`}>{t("tut.sz.ec.eqGeo", {
                f: f2(body.geo.f), formen: body.geo.namen.length ? ` (${body.formen})` : "" })}</span>
              {body.gedeckelt && <span className="step deckel">{t("tut.sz.ec.eqDeckel", {
                cap: fmtNum(EC_SOFTCAP), slope: Math.round(EC_SLOPE * 100), roh: fmtNum(Math.round(body.roh)), v: fmtNum(body.burst) })}</span>}
              <span className="step trenn">{rich(t("tut.sz.ec.eqZahlt", { v: fmtNum(body.burst) }))}</span>
              <span className="step sieg trenn">{t("tut.sz.ec.eqSieg")}</span>
              <span className="step sieg">{t("tut.sz.ec.eqSiegStep", { nm: t("tut.f.streak"), f: f2(1 + STEP * 5) })}</span>
              <span className="step sieg">{t("tut.sz.ec.eqSiegStep", { nm: t("tut.f.form"), f: f2(D_FORM) })}</span>
              <span className="step sieg">{t("tut.sz.ec.eqSiegStep", { nm: t("tut.f.crit"), f: f2(CRIT) })}</span>
              <span className="step sieg">{rich(t("tut.sz.ec.eqDann", { v: fmtNum(body.sieg) }))}</span>
            </>
          )}
        </div>
        <p className="hint">{rich(t("tut.sz.ec.hint2", { scale: fmtNum(EC_SCALE), win: fmtNum(WIN) }))}</p>
      </div>
      <div className="merk3 eis">{rich(!aktiv || !body.geo.namen.length
        ? (aktiv
          ? t("tut.sz.ec.merkKeine", { block: glacierFormName("block"), kreuz: glacierFormName("kreuz"), linie: glacierFormName("linie"), flaeche: glacierFormName("flaeche") })
          : t("tut.sz.ec.merkEin", { k: Math.round(GLACIER.KASKADE_PER_NEIGHBOR * 100) }))
        : t("tut.sz.ec.merkForm", { formen: body.formen,
          liste: ["block", "kreuz", "linie", "flaeche"].map((k) =>
            `${glacierFormName(k)} ×${fmtNum(String({ block: GLACIER.GEO_BLOCK, kreuz: GLACIER.GEO_KREUZ, linie: GLACIER.GEO_LINIE, flaeche: GLACIER.GEO_FLAECHE }[k]))}`).join(" · ") }))}</div>
    </div>
  );
}

/* ════════════════════ Welle 4 · Architekt, Danach, Fortgeschritten ════════════════════ */

/* Die Architekt-Szenen bauen auf den ECHTEN Modulen: Bretter aus echten Gebäuden
   (ARCHITECT_FAMILIES), Faktoren aus structureFactorMap/districtFactorMap, Rotationen aus
   shapeRotations. Das Brett zeichnet verschmelzende Zellen wie ArchitectScreen.jsx:620. */
const A_KATFARBE = { value: "#3b7dbe", score: "#2f9d55", formation: "#d1652f" };
const A_KATKUERZEL = { value: "kv", score: "ks", formation: "kf" };

function bauGeb(familyId, tier, fp, neu = false) {
  const fam = archFamily(familyId);
  return { id: `${familyId}@${fp[0]}`, familyId, tier, footprint: fp,
    nm: fam?.name ?? familyId, kat: fam?.category ?? "value", neu };
}

/* Brett mit verschmelzenden Gebäudezellen: gemeinsame Kanten fallen weg, der Block wächst
   um die 3-px-Fuge, damit eine Form als EIN Gebäude zu sehen ist. */
function ArchBrett({ zeilen, geb, sel }) {
  const wem = new Map();
  geb.forEach((g, i) => g.footprint.forEach((p) => wem.set(p, i)));
  return (
    <div className="brett arch">
      {Array.from({ length: zeilen }, (_, r) => (
        <div key={r} className="zr">
          {Array.from({ length: AR.COLS }, (_, c2) => {
            const p = AR.posOf(r, c2), i = wem.get(p);
            if (i == null) return <div key={c2} className="z" />;
            const g = geb[i];
            const gl = (dr, dc) => {
              const rr = r + dr, cc = c2 + dc;
              return rr >= 0 && rr < zeilen && cc >= 0 && cc < AR.COLS && wem.get(AR.posOf(rr, cc)) === i;
            };
            const st = {};
            if (gl(-1, 0)) Object.assign(st, { top: -3, borderTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 });
            if (gl(1, 0)) Object.assign(st, { bottom: -3, borderBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 });
            if (gl(0, -1)) Object.assign(st, { left: -3, borderLeft: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 });
            if (gl(0, 1)) Object.assign(st, { right: -3, borderRight: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 });
            return (
              <div key={c2} className={`z hat ${p === sel ? "sel" : ""}`}>
                <i className={`${A_KATKUERZEL[g.kat]} ${g.neu ? "neu" : ""}`} style={st} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function GebListe({ geb }) {
  return (
    <div className="gebliste">
      {geb.map((g) => (
        <span key={g.id} className="geb">
          <span className="pkt2" style={{ background: A_KATFARBE[g.kat] }} />
          <b>{g.nm}</b>
          {g.tier ? <i>{ROMAN[g.tier]}</i> : null}
          <i>{archCatDef(g.kat)?.label ?? g.kat}</i>
        </span>
      ))}
    </div>
  );
}

/* ── Szene Ar · Was der Architekt ist (Entwurf Schirm 30) ───────
   Drei Bretter aus dem Lauf zum Durchschalten; der Gebäude-Boost ist aus den echten
   Faktor-Karten GERECHNET: Summe(Struktur × Distrikt − 1) über alle Positionen. */
const AA_SZENEN = [
  { runde: 4, geb: () => [
    bauGeb("A_STUETZE", 1, [AR.posOf(0, 0), AR.posOf(0, 1)]),
    bauGeb("A_ZOLLHAUS", 1, [AR.posOf(2, 3), AR.posOf(2, 4)])] },
  { runde: 16, geb: () => [
    bauGeb("A_KONTOR", 2, [AR.posOf(0, 0), AR.posOf(1, 0), AR.posOf(2, 0), AR.posOf(2, 1)]),
    bauGeb("A_STUETZE", 3, [AR.posOf(3, 1), AR.posOf(3, 2)]),
    bauGeb("A_QUADER", 1, [AR.posOf(4, 2), AR.posOf(4, 3), AR.posOf(5, 2), AR.posOf(5, 3)]),
    bauGeb("A_KLAMMER", 1, [AR.posOf(6, 0), AR.posOf(6, 1)])] },
  { runde: 32, geb: () => [
    bauGeb("A_FRIES", 1, [AR.posOf(0, 3), AR.posOf(0, 4), AR.posOf(1, 3), AR.posOf(1, 4)]),
    bauGeb("A_ZOLLHAUS", 4, [AR.posOf(3, 0), AR.posOf(3, 1)]),
    bauGeb("A_RIEGEL", 2, [AR.posOf(3, 2), AR.posOf(3, 3), AR.posOf(3, 4)]),
    bauGeb("A_QUADER", 3, [AR.posOf(5, 1), AR.posOf(5, 2), AR.posOf(6, 1), AR.posOf(6, 2)])] },
];

export function ArchmockSzene({ hint }) {
  useLocale();
  const [i, setI] = useState(0);
  const [sel, setSel] = useState(null);
  const z = AA_SZENEN[i];
  const geb = z.geb();
  const belegt = new Set(geb.flatMap((g) => g.footprint)).size;
  const karte = AR.boardFactorMap(geb);
  let summe = 0;
  for (let p = 0; p < AR.ROWS * AR.COLS; p++) summe += karte[p] - 1;
  const stelle = (el, inner, extraCls = "") => (
    <div key={el} role="button" tabIndex={0} className={`stelle ${extraCls}`} aria-pressed={sel === el}
      onClick={() => setSel(sel === el ? null : el)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(sel === el ? null : el); } }}>
      {inner}
    </div>
  );
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="ziel"><span className="label">{t("tut.sz.aa.ausLauf")}</span>
        <span className="num" style={{ marginLeft: "auto" }}>{i + 1} / {AA_SZENEN.length}</span>
        <button type="button" className="tbtn leer" onClick={() => { setI((i + 1) % AA_SZENEN.length); }}>
          {t("tut.sz.aa.neu")}
        </button></div>
      <div className="archmock">
        {stelle("kopf", (
          <>
            <div className="amauge">{t("tut.sz.aa.auge", { n: z.runde })}</div>
            <div className="amtitel">{t("tut.sz.aa.titel")}</div>
          </>
        ))}
        <div className="amhero">
          {stelle("boost", (
            <>
              <div className="amlab">{t("tut.sz.aa.boostLab")}</div>
              <div className="amgross gruen">+{fmtNum(Math.round(summe * 100))} %</div>
            </>
          ))}
          {stelle("feld", (
            <>
              <div className="amlab">{t("tut.sz.aa.feldLab")}</div>
              <div className="amgross gold">{PROG.COVER_FLOOR - belegt}<span> / {PROG.COVER_FLOOR}</span></div>
              <div className="amklein">{t("tut.sz.aa.belegt", { n: belegt, pct: Math.round(belegt / PROG.COVER_FLOOR * 100) })}</div>
            </>
          ), "rechts")}
        </div>
        {stelle("brett", (
          <>
            <div className="amschalter">
              <span className="ampill">{t("tut.sz.aa.pillBoost")}</span>
              <span className="ampill gold">◉ {t("tut.sz.aa.pillKombis")}</span>
              <span className="ampill blau">◉ {t("tut.sz.aa.pillForm")}</span>
            </div>
            <ArchBrett zeilen={AR.ROWS} geb={geb} sel={null} />
          </>
        ))}
      </div>
      <GebListe geb={geb} />
      <div className="res arch">
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>{sel ? t(`tut.sz.aa.${sel}.nm`) : ""}</div>
          <div className="rechnung">{sel ? t(`tut.sz.aa.${sel}.txt`, {
            first: VARS.firstShop, shops: VARS.nShop, cover: PROG.COVER_FLOOR, coverMax: VARS.coverMax,
            cards: C.TRICKS_PER_CYCLE,
          }) : t("tut.sz.aa.tap")}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Szene Ab · Deine Hauptaktion (Entwurf Schirm 31) ───────────
   Drei echte Baupläne plus Aufwerten auf einem Vier-Zeilen-Ausschnitt mit festem Zollhaus.
   Verschieben und Drehen sind frei; die Rotationen kommen aus shapeRotations. */
const AB_ZEILEN = 4;
const AB_PLAENE = [
  { id: "stuetz", familyId: "A_STUETZE", tier: 2, start: [AR.posOf(1, 0), AR.posOf(1, 1)] },
  { id: "kontor", familyId: "A_KONTOR", tier: 1, start: [AR.posOf(1, 3), AR.posOf(2, 3), AR.posOf(3, 3), AR.posOf(3, 4)] },
  { id: "fries", familyId: "A_FRIES", tier: 1, start: [AR.posOf(2, 1), AR.posOf(2, 2), AR.posOf(3, 1), AR.posOf(3, 2)] },
];
const AB_ZOLL_FP = [AR.posOf(0, 0), AR.posOf(0, 1)];

function PlanKarte({ plan, gedrueckt, gesperrt, onClick }) {
  const fam = archFamily(plan.familyId);
  const col = TIER_META[plan.tier].color;
  const katF = A_KATFARBE[fam.category];
  const cells = AR.shapeRotations(fam.form)[0] ?? [];
  const hr = Math.max(...cells.map((x) => x[0])) + 1, hc = Math.max(...cells.map((x) => x[1])) + 1;
  const an = new Set(cells.map(([r, c2]) => r * hc + c2));
  const drehbar = AR.shapeRotations(fam.form).length > 1;
  return (
    <button type="button" className="plan" style={{ borderColor: col }} aria-pressed={gedrueckt}
      disabled={gesperrt} onClick={onClick}>
      <span className="plantop">
        <span className="mini" style={{ gridTemplateColumns: `repeat(${hc},6px)` }}>
          {Array.from({ length: hr * hc }, (_, k) => (
            <i key={k} style={an.has(k) ? { background: katF } : undefined} />
          ))}
        </span>
        <span className="stufe2" style={{ color: col, borderColor: `${col}55`, background: `${col}18` }}>{ROMAN[plan.tier]}</span>
      </span>
      <span className="plannm"><span className="pkt2" style={{ background: katF }} />{fam.name}</span>
      <span className="planeff">{buildingEffect(fam, plan.tier)}</span>
      {!drehbar && <span className="norot">⟳ {t("tut.sz.ab.nichtDrehbar")}</span>}
    </button>
  );
}

export function HauptaktionSzene({ hint }) {
  useLocale();
  const [akt, setAkt] = useState(null);
  const [fp, setFp] = useState(null);
  const [zuege, setZuege] = useState(0);
  const [mvHinweis, setMvHinweis] = useState(null);
  const plan = AB_PLAENE.find((x) => x.id === akt) || null;
  const zollFam = archFamily("A_ZOLLHAUS");
  const geb = (() => {
    const zoll = { ...bauGeb("A_ZOLLHAUS", akt === "auf" ? 3 : 2, akt === "auf" ? fp : AB_ZOLL_FP), neu: akt === "auf" };
    return plan ? [zoll, { ...bauGeb(plan.familyId, plan.tier, fp), neu: true }] : [zoll];
  })();
  const form = akt === "auf" ? zollFam.form : plan ? archFamily(plan.familyId).form : null;
  const frei = (kand) => {
    const fest = akt === "auf" ? [] : AB_ZOLL_FP;
    return kand.every((p) => p >= 0 && p < AB_ZEILEN * AR.COLS && !fest.includes(p));
  };
  const waehle = (id) => {
    if (akt) return;
    setZuege(0); setMvHinweis(null);
    if (id === "auf") { setAkt("auf"); setFp(AB_ZOLL_FP.slice()); }
    else { const g = AB_PLAENE.find((x) => x.id === id); setAkt(id); setFp(g.start.slice()); }
  };
  const schiebe = (dr, dc) => {
    if (!fp) return;
    const randOk = fp.every((p) => AR.colOf(p) + dc >= 0 && AR.colOf(p) + dc < AR.COLS
      && AR.rowOf(p) + dr >= 0 && AR.rowOf(p) + dr < AB_ZEILEN);
    const neu = fp.map((p) => AR.posOf(AR.rowOf(p) + dr, AR.colOf(p) + dc));
    if (!randOk || !frei(neu)) return;
    setZuege(zuege + 1); setFp(neu); setMvHinweis(null);
  };
  const drehe = () => {
    if (!fp || !form) return;
    const lagen = AR.shapeRotations(form);
    if (lagen.length < 2) return;
    const r0 = Math.min(...fp.map(AR.rowOf)), c0 = Math.min(...fp.map(AR.colOf));
    const jetzt = new Set(fp);
    let idx = 0;
    for (let k = 0; k < lagen.length; k++) {
      const kand = lagen[k].map(([dr, dc]) => AR.posOf(r0 + dr, c0 + dc));
      if (kand.length === fp.length && kand.every((p) => jetzt.has(p))) { idx = k; break; }
    }
    for (let k = 1; k < lagen.length; k++) {
      const l = lagen[(idx + k) % lagen.length];
      const kand = l.map(([dr, dc]) => AR.posOf(r0 + dr, c0 + dc));
      const passt = l.every(([dr, dc]) => r0 + dr < AB_ZEILEN && c0 + dc < AR.COLS);
      if (passt && frei(kand)) { setZuege(zuege + 1); setFp(kand); setMvHinweis(null); return; }
    }
    setMvHinweis("tut.sz.ab.keinPlatz");
  };
  const drehbar = form && AR.shapeRotations(form).length > 1;
  const resKlasse = !akt ? "" : akt === "auf" ? " ks" : ` ${A_KATKUERZEL[archFamily(plan.familyId).category]}`;
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div>
        <div className="ziel"><span className="label">{t("tut.sz.ab.ausschnitt")}</span>
          <button type="button" className="tbtn leer" style={{ marginLeft: "auto" }}
            onClick={() => { setAkt(null); setFp(null); setZuege(0); setMvHinweis(null); }}>
            {t("tut.sz.ab.nochmal")}
          </button></div>
        <div style={{ marginTop: 6 }}><ArchBrett zeilen={AB_ZEILEN} geb={geb} sel={null} /></div>
        <GebListe geb={geb} />
      </div>
      <div><span className="label">{t("tut.sz.ab.wasBaust")}</span>
        <div className="angebot" style={{ marginTop: 6 }}>
          {AB_PLAENE.map((p) => (
            <PlanKarte key={p.id} plan={p} gedrueckt={akt === p.id} gesperrt={!!akt && akt !== p.id}
              onClick={() => waehle(p.id)} />
          ))}
          <button type="button" className="plan auf" style={{ borderColor: A_KATFARBE.value }}
            aria-pressed={akt === "auf"} disabled={!!akt && akt !== "auf"} onClick={() => waehle("auf")}>
            <span className="planpfeil">⬆</span>
            <span className="plannm">{t("tut.sz.ab.aufwerten")}</span>
            <span className="planeff">{t("tut.sz.ab.aufwertenEff")}</span>
          </button>
        </div></div>
      {akt && (
        <div>
          <span className="label">{t("tut.sz.ab.moveLabel")}</span>
          <div className="werkzeuge formen" style={{ marginTop: 6 }}>
            <button type="button" className="tbtn" onClick={() => schiebe(-1, 0)}>{t("tut.sz.ab.hoch")}</button>
            <button type="button" className="tbtn" onClick={() => schiebe(1, 0)}>{t("tut.sz.ab.runter")}</button>
            <button type="button" className="tbtn" onClick={() => schiebe(0, -1)}>{t("tut.sz.ab.links")}</button>
            <button type="button" className="tbtn" onClick={() => schiebe(0, 1)}>{t("tut.sz.ab.rechts")}</button>
          </div>
          <button type="button" className="tbtn" style={{ marginTop: 6, width: "100%" }} disabled={!drehbar} onClick={drehe}>
            ⟳ {drehbar ? t("tut.sz.ab.drehen") : t("tut.sz.ab.nichtDrehbar")}
          </button>
          <p className="hint">{mvHinweis ? t(mvHinweis)
            : zuege === 1 ? t("tut.sz.ab.zug1") : zuege ? t("tut.sz.ab.zuege", { n: zuege }) : t("tut.sz.ab.leuchtet")}</p>
        </div>
      )}
      <div className={`res arch${resKlasse}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>
            {!akt ? t("tut.sz.ab.nichtsNm")
              : akt === "auf" ? t("tut.sz.ab.aufNm", { nm: zollFam.name, stufe: ROMAN[3] })
              : t("tut.sz.ab.bauNm", { nm: archFamily(plan.familyId).name, stufe: ROMAN[plan.tier] })}
          </div>
          <div className="rechnung">
            {!akt ? t("tut.sz.ab.nichtsTxt")
              : akt === "auf" ? t("tut.sz.ab.aufTxt", {
                  neu: AR.tierNum(zollFam.base.score, 3), alt: AR.tierNum(zollFam.base.score, 2), felder: AB_ZOLL_FP.length })
              : t("tut.sz.ab.bauTxt", { eff: buildingEffect(archFamily(plan.familyId), plan.tier), felder: plan.start.length })}
          </div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>
          {!akt ? "0" : akt === "auf" ? `+${fmtNum(AR.tierNum(zollFam.base.score, 3))}` : ROMAN[plan.tier]}
        </div>
      </div>
    </div>
  );
}

/* ── Distrikte (Review-Runde Zeile 19, Mockup freigegeben) ──────
   Drei feste Lagen aus echten Gebäuden: der kleinste Distrikt, ein Block aus dreien, und das
   Gegenbeispiel verschiedener Kategorien. Faktoren aus districtFactorMap, nie abgetippt. */
const DX_LAGEN = {
  zwei: () => [bauGeb("A_STUETZE", 1, [AR.posOf(3, 1), AR.posOf(3, 2)]),
    bauGeb("A_QUADER", 1, [AR.posOf(4, 2), AR.posOf(4, 3), AR.posOf(5, 2), AR.posOf(5, 3)])],
  drei: () => [bauGeb("A_STUETZE", 1, [AR.posOf(2, 1), AR.posOf(2, 2)]),
    bauGeb("A_ZUNFTV", 1, [AR.posOf(3, 1), AR.posOf(4, 1), AR.posOf(4, 2)]),
    bauGeb("A_QUADER", 1, [AR.posOf(3, 3), AR.posOf(3, 4), AR.posOf(4, 3), AR.posOf(4, 4)])],
  kein: () => [bauGeb("A_STUETZE", 1, [AR.posOf(3, 1), AR.posOf(3, 2)]),
    bauGeb("A_ZOLLHAUS", 1, [AR.posOf(4, 2), AR.posOf(4, 3)])],
};

export function DistriktSzene({ hint }) {
  useLocale();
  const [lage, setLage] = useState("zwei");
  const geb = DX_LAGEN[lage]();
  const df = AR.districtFactorMap(geb);
  const je = geb.map((g) => df[g.footprint[0]]);
  const max = Math.max(...je);
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="werkzeuge formen">
        {Object.keys(DX_LAGEN).map((k) => (
          <button key={k} type="button" className="tbtn" aria-pressed={lage === k} onClick={() => setLage(k)}>
            {t(`tut.sz.dx.${k}Btn`)}
          </button>
        ))}
      </div>
      <ArchBrett zeilen={AR.ROWS} geb={geb} sel={null} />
      <GebListe geb={geb} />
      <div className={`res arch${max > 1 ? " kv" : ""}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>{max > 1 ? t("tut.sz.dx.ja") : t("tut.sz.dx.nein")}</div>
          <div className="rechnung">{geb.map((g, i) => `${g.nm} ×${f2(je[i])}`).join(" · ")}</div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>×{f2(max)}</div>
      </div>
      <div className="merk3">{rich(t(`tut.sz.dx.${lage}Merk`, { pct: VARS.districtPct }))}</div>
    </div>
  );
}

/* ── Strukturen (eigene Lektion seit der Review-Runde, Zeile 20; Ziel von S-A3) ──
   Drei feste Lagen aus echten Gebäuden; die Faktoren der markierten Zelle kommen aus
   structureFactorMap. Die Distrikt-Beispiele wohnen jetzt in DistriktSzene. */
const AX_SEL = AR.posOf(3, 2);
const AX_LAGEN = {
  zeile: () => [bauGeb("A_ZOLLHAUS", 2, [AR.posOf(3, 0), AR.posOf(3, 1)]),
    bauGeb("A_RIEGEL", 1, [AR.posOf(3, 2), AR.posOf(3, 3), AR.posOf(3, 4)])],
  spalte: () => [bauGeb("A_REIHENHAUS", 1, [AR.posOf(0, 2), AR.posOf(1, 2), AR.posOf(2, 2), AR.posOf(3, 2)]),
    bauGeb("A_FIRST", 1, [AR.posOf(4, 2), AR.posOf(5, 2), AR.posOf(6, 2), AR.posOf(7, 2)])],
  diag: () => [bauGeb("A_LAUFGANG", 1, [AR.posOf(1, 0), AR.posOf(2, 1), AR.posOf(3, 2)]),
    bauGeb("A_FRIES", 1, [AR.posOf(4, 3), AR.posOf(4, 4), AR.posOf(5, 3), AR.posOf(5, 4)])],
};

export function StrukturenSzene({ hint, labels: L }) {
  useLocale();
  const [lage, setLage] = useState("zeile");
  const geb = AX_LAGEN[lage]();
  const felder = new Set(geb.flatMap((g) => g.footprint));
  const sf = AR.structureFactorMap(felder);
  /* Die Namen der Strukturen an der markierten Zelle, aus der Geometrie abgelesen. */
  const namen = [];
  const r = AR.rowOf(AX_SEL);
  if (Array.from({ length: AR.COLS }, (_, c2) => AR.posOf(r, c2)).every((p) => felder.has(p))) namen.push(L.zeile);
  const c0 = AR.colOf(AX_SEL);
  if (Array.from({ length: AR.ROWS }, (_, rr) => AR.posOf(rr, c0)).every((p) => felder.has(p))) namen.push(L.spalte);
  for (let r0 = 0; r0 <= AR.ROWS - AR.COLS; r0++) {
    const haupt = [], gegen = [];
    for (let k = 0; k < AR.COLS; k++) { haupt.push(AR.posOf(r0 + k, k)); gegen.push(AR.posOf(r0 + k, AR.COLS - 1 - k)); }
    for (const d of [haupt, gegen]) if (d.includes(AX_SEL) && d.every((p) => felder.has(p))) namen.push(L.diag);
  }
  const sF = sf[AX_SEL];
  let v = WIN;
  const steps = [];
  steps.push(rich(t("tut.sz.ax.eqBasis", { v: fmtNum(WIN) })));
  for (const nm of namen) {
    const einzel = nm === L.zeile ? AR.HAEUSERZEILE_FACTOR : nm === L.spalte ? AR.SPALTE_FACTOR : AR.DIAGONALE_FACTOR;
    v = v * einzel;
    steps.push(rich(t("tut.sz.ax.eqStep", { nm, f: f2(einzel), v: fmtNum(Math.round(v)) })));
  }
  return (
    <div className="tsz">
      {hint ? <p className="auftrag">{hint}</p> : null}
      <div className="werkzeuge formen">
        {["zeile", "spalte", "diag"].map((k) => (
          <button key={k} type="button" className="tbtn" aria-pressed={lage === k} onClick={() => setLage(k)}>
            {t(`tut.sz.ax.${k}Btn`)}
          </button>
        ))}
      </div>
      <ArchBrett zeilen={AR.ROWS} geb={geb} sel={AX_SEL} />
      <GebListe geb={geb} />
      <div className={`res arch${sF > 1 ? " kv" : ""}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>{namen.length ? namen.join(" + ") : t("tut.sz.ax.keinBonus")}</div>
          <div className="rechnung">{namen.length ? t("tut.sz.ax.mitStruktur", { f: f2(sF) }) : t("tut.sz.ax.keineStruktur")}</div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>×{f2(sF)}</div>
      </div>
      <div className="zeile"><span className="label">{t("tut.sz.ax.eqLabel")}</span>
        <div className="eq" style={{ marginTop: 7 }}>
          {steps.map((x, k) => <span key={k} className="step">{x}</span>)}
          <span className="step trenn">{rich(t("tut.sz.ax.eqZahlt", { v: fmtNum(Math.round(v)), basis: fmtNum(WIN) }))}</span>
        </div></div>
      <div className="merk3">{rich(t(`tut.sz.ax.${lage}Merk`, { cover: PROG.COVER_FLOOR, pct: VARS.districtPct }))}</div>
    </div>
  );
}

/* ── Szene Na · Der Endscreen (Entwurf Schirm 34) ───────────────
   Nachbildung aus GameOver.jsx:300 mit vier anfassbaren Bereichen; die Beispielwerte
   sind die des Entwurfs, die Meilenstein-Zahlen kommen aus SP_MILESTONES. */

export function EndscreenSzene({ hint }) {
  useLocale();
  const [sel, setSel] = useState(null);
  const marken = PROG.SP_MILESTONES;
  const stelle = (el, inner, extra = null) => (
    <div key={el} role="button" tabIndex={0} className="stelle" aria-pressed={sel === el} style={extra}
      onClick={() => setSel(sel === el ? null : el)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(sel === el ? null : el); } }}>
      {inner}
    </div>
  );
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="archmock go">
        {stelle("score", (
          <>
            <div className="goauge">{t("tut.sz.na.auge")}</div>
            <div className="goscore">41,3 Mio.</div>
            <div className="gochip">−12 % {t("tut.sz.na.zumRekord")}</div>
            <div className="goklein">14:32 · Ø 20.642/{t("tut.sz.na.jeStich")} · 50 {t("tut.sz.na.durchlaeufe")}</div>
          </>
        ))}
        {stelle("marken", (
          <>
            <div className="gozeile"><span>💠 {t("tut.sz.e.msWort")} 2/{marken.length}</span>
              <span>{t("tut.sz.na.naechster", { n: Math.round(marken[2].at / 1e6) })}</span></div>
            <div className="msbar"><span className="msfill" style={{ width: "53%" }} />
              {[1, 2, 3, 4].map((k) => <i key={k} style={{ left: `${k * 20}%` }} />)}</div>
          </>
        ))}
        {stelle("waehrung", (
          <div className="gowaehrung">
            <div className="gow sp"><span>{t("gameover.sp")}</span><b>+7</b></div>
            <div className="gow dp"><span>{t("tut.sz.na.dp")}</span><b>+7</b></div>
          </div>
        ))}
        {stelle("best", (
          <>
            <div className="golab">{t("tut.sz.na.bestLab")}</div>
            <div className="gobest">
              <div><span>{t("tut.sz.na.besteSerie")}</span><b>31</b></div>
              <div><span>{t("tut.sz.na.besterStich")}</span><b>2,1 Mio.</b></div>
              <div><span>{t("tut.sz.na.meisteCrits")}</span><b>84</b></div>
            </div>
          </>
        ))}
      </div>
      <div className="res arch">
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>{sel ? t(`tut.sz.na.${sel}.nm`) : ""}</div>
          <div className="rechnung">{sel ? t(`tut.sz.na.${sel}.txt`, {
            m1: Math.round(marken[0].at / 1e6), m2: Math.round(marken[1].at / 1e6), m3: Math.round(marken[2].at / 1e6),
            m4: Math.round(marken[3].at / 1e6), m5: Math.round(marken[4].at / 1e6),
          }) : t("tut.sz.aa.tap")}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Szene Nb · Was ein Lauf einbringt (Entwurf Schirm 35) ──────
   Regler in 5-Mio-Schritten, damit alle Marken exakt getroffen werden; Balkenlogik wie
   milestoneBarState: jede Marke ein Fünftel, innerhalb proportional. */
const NB_SCHRITT = 5e6;

export function PunkteSzene({ hint }) {
  const [locale] = useLocale();
  const [reg, setReg] = useState(8);
  const marken = PROG.SP_MILESTONES;
  const s2 = reg * NB_SCHRITT;
  const erreicht = marken.reduce((k, m) => (s2 >= m.at ? k + 1 : k), 0);
  const mark = marken.reduce((a, m) => (s2 >= m.at ? a + m.sp : a), 0);
  let fill = 1, naechste = null;
  if (erreicht < marken.length) {
    const vor = erreicht === 0 ? 0 : marken[erreicht - 1].at, nach = marken[erreicht].at;
    fill = (erreicht + (s2 - vor) / (nach - vor)) / marken.length;
    naechste = nach;
  }
  const sp = PROG.SP_PER_RUN + mark, dp = RUN_COMPLETE_DP + mark;
  const mio = (x) => `${fmtNum(String(Math.round(x / 1e5) / 10), locale)} Mio.`;
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="zeile">
        <div className="ziel"><span className="label">{t("tut.sz.nb.scoreLab")}</span>
          <span className="num" style={{ marginLeft: "auto" }}>{s2 === 0 ? "0" : mio(s2)}</span></div>
        <input type="range" min="0" max="24" step="1" value={reg}
          onChange={(e) => setReg(Number(e.target.value))} aria-label={t("tut.sz.nb.scoreLab")} />
        <div className="gozeile" style={{ marginTop: 4 }}>
          <span>{t("tut.sz.nb.marken", { n: erreicht, total: marken.length })}</span>
          <span>{naechste ? t("tut.sz.na.naechster", { n: Math.round(naechste / 1e6) }) : t("tut.sz.nb.maximum")}</span></div>
        <div className="msbar"><span className="msfill" style={{ width: `${(fill * 100).toFixed(1)}%` }} />
          {[1, 2, 3, 4].map((k) => <i key={k} style={{ left: `${k * 20}%` }} />)}</div>
        <div className="gomarken">
          {marken.map((m, k) => <span key={k}>{Math.round(m.at / 1e6)}{k === marken.length - 1 ? " Mio" : ""}</span>)}
        </div>
      </div>
      <div className="gowaehrung">
        <div className="gow sp"><span>{t("gameover.sp")}</span><b>+{sp}</b></div>
        <div className="gow dp"><span>{t("tut.sz.na.dp")}</span><b>+{dp}</b></div>
      </div>
      <div className="zeile"><span className="label">{t("tut.sz.nb.eqLabel")}</span>
        <div className="eq" style={{ marginTop: 7 }}>
          <span className="step">{rich(t("tut.sz.nb.eqGrund", { n: PROG.SP_PER_RUN }))}</span>
          <span className={`step ${mark ? "" : "off"}`}>{rich(mark
            ? t("tut.sz.nb.eqMarken", { n: mark })
            : t("tut.sz.nb.eqKeine", { m1: Math.round(marken[0].at / 1e6) }))}</span>
          <span className="step trenn">{rich(t("tut.sz.nb.eqSumme", { sp, dp }))}</span>
        </div></div>
    </div>
  );
}

/* ── Szene Nc · Der Upgrade-Baum (Entwurf Schirm 36) ────────────
   Die Bahnen aus UpgradeScreen.jsx:89 (GEN_LANES, dort nicht exportiert — die id-Listen
   sind zitiert) plus der Deck-Zweig; die Kosten sind live aus NODES summiert. */
const NC_BAHNEN = [
  { nmKey: "upgrades.lane.cover", zweig: "gen", ids: ["cover1", "cover2", "cover3"], txt: "cover" },
  { nmKey: "upgrades.lane.energy", zweig: "gen", ids: ["energy1", "energy2"], txt: "energy" },
  { nmKey: "upgrades.lane.rerolls", zweig: "gen", ids: ["reroll1", "reroll2"], txt: "rerolls" },
  { nmKey: "upgrades.lane.rarity", zweig: "gen", ids: ["tier3", "tier4", "legLayer"], txt: "rarity" },
  { nmKey: "upgrades.lane.drops", zweig: "gen", ids: ["drop1", "drop2", "drop3", "drop4"], txt: "drops" },
  { nmKey: "upgrades.lane.perk2", zweig: "gen", ids: ["perk2Leg", "perk2Reroll"], txt: "perk2" },
];

export function BaumSzene({ hint }) {
  useLocale();
  const [sel, setSel] = useState(null);
  const kosten = (ids) => ids.reduce((a, id) => a + (PROG.NODES.find((n) => n.id === id)?.cost ?? 0), 0);
  const deckIds = PROG.NODES.filter((n) => n.branch === "deck" && !n.placeholder).map((n) => n.id);
  const bahnen = [
    ...NC_BAHNEN.map((b) => ({ ...b, nm: t(b.nmKey), zweigNm: t(`branch.${b.zweig}.name`), sp: kosten(b.ids) })),
    { txt: "decks", nm: t("tut.sz.nc.decks"), zweigNm: t("branch.deck.name"), sp: kosten(deckIds), ids: deckIds },
  ];
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="bahnen">
        {bahnen.map((b) => (
          <button key={b.txt} type="button" className="bahn" aria-pressed={sel === b.txt}
            onClick={() => setSel(sel === b.txt ? null : b.txt)}>
            <span className="bahnnm">{b.nm}</span>
            <span className="bahnzw">{b.zweigNm}</span>
            <span className="bahnsp">{b.sp} SP</span>
          </button>
        ))}
      </div>
      <div className="res">
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>{sel ? bahnen.find((b) => b.txt === sel)?.nm : ""}</div>
          <div className="rechnung">{sel ? t(`tut.sz.nc.${sel}`, {
            cover: PROG.COVER_FLOOR, coverMax: VARS.coverMax, energy: PROG.ENERGY_FLOOR, energyMax: VARS.energyMax,
            n: bahnen.find((b) => b.txt === sel)?.ids.length ?? 0,
          }) : t("tut.sz.nc.tap")}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Szene Fa · Lange Formationen zahlen mehr (Entwurf Schirm 38) ──
   Je Typ eine saubere Hand, die NUR diesen Typ erzeugt; die Faktoren misst die echte
   computeFormations je Länge — mit offener Segmentgrenze (E_SEGMENT III), damit der
   Regler wie im Entwurf bis acht laufen kann. */
const FA_HAENDE = {
  wiederholung: [[7, "R"], [7, "B"], [7, "G"], [7, "Y"], [7, "R"], [7, "B"], [7, "G"], [7, "Y"]],
  wechsel: [[2, "R"], [7, "B"], [3, "G"], [8, "Y"], [4, "R"], [9, "B"], [5, "G"], [10, "Y"]],
  farbblock: [[5, "B"], [2, "B"], [8, "B"], [4, "B"], [9, "B"], [6, "B"], [3, "B"], [10, "B"]],
  treppe: [[1, "R"], [2, "B"], [3, "G"], [5, "Y"], [6, "R"], [7, "B"], [9, "G"], [10, "Y"]],
};
const FA_TYPEN = ["wiederholung", "wechsel", "farbblock", "treppe"];

function faFaktor(typ, n) {
  const hand = FA_HAENDE[typ].slice(0, n);
  const cards = hand.map(([v, su], k) => ({ id: `fa-${typ}-${k}`, value: v, suit: su }));
  const per = computeFormations(cards.map((_, k) => k), cards, {}, [], [], [], { E_SEGMENT: 3 });
  return per[n - 1]?.mult ?? 1;
}

export function LaengeSzene({ hint }) {
  useLocale();
  const [n, setN] = useState(2);
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="zeile">
        <div className="ziel"><span className="label">{t("tut.sz.fa.lenLab")}</span>
          <span className="num" style={{ marginLeft: "auto" }}>{t("tut.sz.fa.lenN", { n })}</span></div>
        <input type="range" min="1" max="8" step="1" value={n}
          onChange={(e) => setN(Number(e.target.value))} aria-label={t("tut.sz.fa.lenLab")} />
      </div>
      <div className="flist">
        {FA_TYPEN.map((typ) => {
          const f = faFaktor(typ, n), an = f > 1;
          return (
            <div key={typ} className={`fz ${an ? "an" : ""}`}>
              <span>{formationName(typ)}</span>
              <i>{t(`tut.sz.fa.${typ}`)}</i>
              <b>×{f2(f)}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Szene Sg · Segmentgrenzen öffnen (Entwurf Schirm 39) ───────
   Fünfzehn Karten, drei Segmente, neun rote über beide Grenzen. Die drei Zustände sind
   die echten Stufen der Segmentarbeit: zu, offen (III), offen mit Grenzbonus (IV). */
const SG_KARTEN = [[9, "B"], [4, "G"], [7, "Y"],
  [5, "R"], [8, "R"], [6, "R"], [9, "R"], [7, "R"], [10, "R"], [4, "R"], [1, "R"], [3, "R"],
  [10, "B"], [8, "G"], [2, "Y"]];
const SG_CARDS = SG_KARTEN.map(([v, su], k) => ({ id: `sg-${k}`, value: v, suit: su }));

function sgMults(stufe) {
  const tiers = stufe === 0 ? {} : { E_SEGMENT: stufe };
  const per = computeFormations(SG_CARDS.map((_, k) => k), SG_CARDS, {}, [], [], [], tiers);
  return per.map((p) => p.mult);
}

export function SegmenteSzene({ hint, labels: L }) {
  useLocale();
  const [lage, setLage] = useState("zu");
  const stufe = lage === "zu" ? 0 : lage === "drei" ? 3 : 4;
  const m = sgMults(stufe);
  const summe = m.reduce((a, x) => a + (x - 1), 0);
  const offen = lage !== "zu";
  return (
    <div className="tsz seg1">
      <p className="auftrag">{hint}</p>
      <div className="werkzeuge formen">
        <button type="button" className="tbtn" aria-pressed={lage === "zu"} onClick={() => setLage("zu")}>{t("tut.sz.sg.zu")}</button>
        <button type="button" className="tbtn" aria-pressed={lage === "drei"} onClick={() => setLage("drei")}>{L.segIII}</button>
        <button type="button" className="tbtn" aria-pressed={lage === "vier"} onClick={() => setLage("vier")}>{L.segIV}</button>
      </div>
      {[0, 1, 2].map((seg) => (
        <div key={seg}>
          <div className="reihe">
            {SG_KARTEN.slice(seg * 5, seg * 5 + 5).map(([v, su], k) => (
              <Karte key={k} v={v} s={su} cls={m[seg * 5 + k] > 1 ? "" : "dim"} />
            ))}
          </div>
          <div className="fakt">
            {SG_KARTEN.slice(seg * 5, seg * 5 + 5).map((_, k) => {
              const f = m[seg * 5 + k];
              return <span key={k} className={f > 1 ? "an" : ""}>{f > 1 ? `×${f2(f)}` : "–"}</span>;
            })}
          </div>
          {seg < 2 && (
            <div className={`grenze ${offen ? "offen" : ""}`}>
              <span>{t("tut.sz.sg.grenze", { n: seg + 1 })}</span>
              <b>{offen ? (stufe === 4 ? t("tut.sz.sg.offenBonus") : t("tut.sz.sg.offen")) : t("tut.sz.sg.geschlossen")}</b>
            </div>
          )}
        </div>
      ))}
      <div className={`res arch${offen ? " kv" : ""}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>
            {lage === "zu" ? t("tut.sz.sg.zuNm") : lage === "drei" ? L.segIII : L.segIV}
          </div>
          <div className="rechnung">{t("tut.sz.sg.summeTxt")}</div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>{f2(summe)}</div>
      </div>
      <div className="merk3">{rich(t(`tut.sz.sg.${lage}Merk`, { segIII: L.segIII, segIV: L.segIV }))}</div>
    </div>
  );
}

/* ── Szenen Fc/Fd · Zwei Builds (Entwurf Schirme 40/41) ─────────
   Die Build-Kästen des Entwurfs: Kopf, Satz, Teile, Schlusszeile. Statisch, aber in der
   Optik des Entwurfs; Zahlen als Platzhalter aus den Konstanten. */
export function BuildSzene({ hint, warm = false, kopfKey }) {
  useLocale();
  const V = {
    rowFactor: f2(AR.HAEUSERZEILE_FACTOR), colFactor: f2(AR.SPALTE_FACTOR),
    rowAmp: f2(1 + (AR.HAEUSERZEILE_FACTOR - 1) * C.FIRE_STRUCT_DIVIDEND_AMP),
    colAmp: f2(1 + (AR.SPALTE_FACTOR - 1) * C.FIRE_STRUCT_DIVIDEND_AMP),
    forgeValue: C.FORGE_VALUE, glowV1: C.GLOWING_T1_VALUE, glowV2: C.GLOWING_T2_VALUE, glowV3: C.GLOWING_T3_VALUE,
    glowT1: C.GLOWING_T1_HEAT, glowT2: C.GLOWING_T2_HEAT, glowT3: C.GLOWING_T3_HEAT,
    streakPct: Math.round(STEP * 100), critPerSkill: Math.round(C.LIGHTNING_CRIT_PER_SKILL * 100),
    critMult: f2(CRIT), glowM2: C.GLOWING_T2_MARGIN, glowM3: C.GLOWING_T3_MARGIN,
    schmiede: skillDef("SK_FIRE_15")?.name ?? "", gk: skillDef("SK_FIRE_06")?.name ?? "",
    walze: skillDef("SK_FIRE_07")?.name ?? "",
  };
  const teile = [1, 2, 3].filter((k) => t(`${kopfKey}.t${k}`) !== `${kopfKey}.t${k}`);
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className={`build ${warm ? "warm" : ""}`}>
        <div className="buildkopf"><b>{t(`${kopfKey}.kopf`)}</b><i>{t(`${kopfKey}.unter`)}</i></div>
        <p className="buildsatz">{rich(t(`${kopfKey}.satz`, V))}</p>
        <div className="teile">
          {teile.map((k) => (
            <div key={k}>
              <span>{t(`${kopfKey}.t${k}`)}</span>
              <em>{rich(t(`${kopfKey}.e${k}`, V))}</em>
            </div>
          ))}
        </div>
        <p className="buildende">{rich(t(`${kopfKey}.ende`, V))}</p>
      </div>
    </div>
  );
}
