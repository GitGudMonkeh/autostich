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
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocale } from "../../i18n/useLocale.js"; // #sprache: Neuberechnung bei Sprachwechsel
import { fmtNum, fmtPct, t } from "../../i18n/index.js";
import * as C from "../../game/constants.js";
import { FAMILY_DEFS } from "../../game/families.js";
import { computeFormations, ESKALATION_STEP, FARBBLOCK_BASE } from "../../game/formations.js";
import { marginHeatPoints } from "../../game/skills.js";
import * as GLACIER from "../../game/glacier.js";
import * as AR from "../../game/architect.js";
import * as PROG from "../../game/progression.js";
import { RUN_COMPLETE_DP } from "../../game/storage.js";
import { GLOSSARY_IMG_SRC } from "../FactionIcon.jsx";
import { familyDef, perkDef, perkCat, formationName, formationAbbr, rarityLabel, skillDef, glacierFormName, archFamily, archCatDef } from "../../i18n/labels.js";
import { TIER_META, ROMAN } from "../../game/rarity.js";
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

const WIN = C.SCORE_PER_WIN;

/* ════════════════════ Welle 2 · Aufstellung, Wahl, Blitz ════════════════════ */

/* Karte mit Kürzel und Positions-Multiplikator, wie kartePro im Entwurf. mode "suit" färbt den
   Rahmen nach Kartenfarbe (dort ist Farbe Information), "neutral" lässt ihn grau. */
function KartePro({ v, s, abbr, mult, sel, mode, erg, onClick }) {
  const cls = [mode === "suit" ? `k-${s}` : "", sel ? "sel" : "", erg ?? ""].join(" ");
  return (
    <Karte v={v} s={mode === "suit" ? s : "N"} cls={cls} onClick={onClick}
      badge={mult > 1 ? `×${f2(mult)}` : undefined} kuerzel={abbr || undefined} />
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

/* Runde 3 (Q13/Q16, Mockups freigegeben): drei schlanke Seiten je Archetyp statt der
   textlastigen Erstfassung. Die Karten tragen die ECHTEN Karteneffekte des Spiels
   (MossGrow/FrostIce als Kartenkind, wie CustomizeScreen.jsx SpezialScene) — lazy, weil
   die Effekte sonst im Tutorial-Chunk vorgeladen würden. Alle Zahlen kommen live aus
   den Konstanten; die Mockup-Werte waren die heutigen Stände. */
const MossGrow = lazy(() => import("../fx/MossGrow.jsx"));
const FrostIce = lazy(() => import("../fx/FrostIce.jsx"));

/* Skill/Passiv-Marke der Archetyp-Seiten: jede Zeile nennt, WOHER ein Effekt kommt —
   ein Passiv läuft immer, ein Skill erst, wenn er gewählt ist (Owner-Korrektur am
   Feuer-Mockup: „nicht jeder Sieg gibt automatisch Asche"). */
function ChipBadge({ skill = null }) {
  return skill
    ? <span className="cbadge skill">{t("tut.sz.chipSkill", { nm: skill })}</span>
    : <span className="cbadge passiv">{t("tut.sz.chipPassiv")}</span>;
}

/* ── Szene Fv · Der Vorsprung (Feuer Seite 1) ───────────────────
   Drei Fälle als Tabs: Niederlage kostet Hitze, ein knapper Sieg zahlt nichts
   (unter HEAT_MIN_MARGIN), ein klarer Sieg zahlt EXTRA-Score plus Hitze — obendrauf
   auf den normalen Stich-Score (Owner-Korrektur am Mockup). Score/Hitze aus der
   echten Kurve. */
export const fireScoreAt = (m) => Math.round((m - C.FIRE_MARGIN_OFFSET) * C.FIRE_SCORE_BASE
  + C.FIRE_SCORE_BASE * C.FIRE_SCORE_SQRT_K * Math.sqrt(Math.max(0, m - C.FIRE_MARGIN_OFFSET)));
const fireHeatAt = (m) => Math.round(marginHeatPoints(m) * C.HEAT_PER_POINT);

/* Die Fälle sind aus den Konstanten ABGELEITET, nicht abgetippt: „knapp" liegt genau
   einen Punkt unter der Schwelle, „klar" genau auf der Stufe-II-Marge der Klinge. */
const FV_FAELLE = [
  { id: "verlust", du: 4, geg: 9 },
  { id: "knapp", du: 6 + C.HEAT_MIN_MARGIN - 1, geg: 6 },
  { id: "klar", du: 4 + C.GLOWING_T2_MARGIN, geg: 4 },
];
const FV_WIN_ST = { boxShadow: "0 0 0 2px #5ab87a, 0 0 12px -2px #5ab87a" };
const FV_LOSE_ST = { opacity: 0.55, boxShadow: "0 0 0 1px #e0605a" };

export function FeuerkartenSzene({ hint, labels: L }) {
  useLocale();
  const [fall, setFall] = useState("knapp");
  const f = FV_FAELLE.find((x) => x.id === fall);
  const vor = f.du - f.geg, sieg = vor > 0, zahlt = vor >= C.HEAT_MIN_MARGIN;
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="werkzeuge formen" style={{ marginTop: 0 }}>
        {FV_FAELLE.map((x) => (
          <button key={x.id} type="button" className="tbtn" aria-pressed={fall === x.id}
            onClick={() => setFall(x.id)}>{t(`tut.sz.fv.tab.${x.id}`)}</button>
        ))}
      </div>
      <div className="paar">
        <div><span className="label">{L.du}</span>
          <div className="buehne klein"><div className={`grosskarte ${zahlt ? "fk" : "aus"}`}
            style={sieg ? FV_WIN_ST : FV_LOSE_ST}>
            <span className="cwert">{f.du}</span>
          </div></div></div>
        <div><span className="label">{L.gegner}</span>
          <div className="buehne klein"><div className="grosskarte aus" style={sieg ? FV_LOSE_ST : FV_WIN_ST}>
            <span className="cwert">{f.geg}</span>
          </div></div></div>
      </div>
      <div className={`res ${!sieg ? "l" : zahlt ? "kern2" : ""}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>
            {sieg ? t("tut.sz.fv.nmSieg", { v: vor }) : t("tut.sz.niederlage")}
          </div>
          <div className="rechnung">
            {!sieg ? t("tut.sz.fv.txtVerlust", { a: f.du, b: f.geg })
              : !zahlt ? t("tut.sz.fv.txtKnapp", { min: C.HEAT_MIN_MARGIN })
              : t("tut.sz.fv.txtKlar", { score: fmtNum(fireScoreAt(vor)), heiz: fireHeatAt(vor) })}
          </div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>
          {!sieg ? t("tut.sz.fv.pktVerlust") : !zahlt ? `+${fmtNum(0)}` : t("tut.sz.fv.pktKlar", { score: fmtNum(fireScoreAt(vor)) })}
        </div>
      </div>
      <div className="merk3 warm">{rich(t(`tut.sz.fv.merk.${fall}`, { min: C.HEAT_MIN_MARGIN }))}</div>
    </div>
  );
}

/* ── Szene Fh · Die Hitzeleiste (Feuer Seite 2) ─────────────────
   Auto-Loop wie die Ladungsleiste bei Blitz (BlitzkarteSzene): die Leiste heizt von
   selbst, die Stufen schalten sich nacheinander ein. Schwellen und Werte sind die
   echten Konstanten; reduzierte Bewegung = stehendes Endbild. */
export function HitzeSzene({ hint }) {
  useLocale();
  const [h, setH] = useState(0);
  const MAX = C.HEAT_MAX;
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setH(MAX); return undefined; }
    let alive = true, id = null, hh = 0;
    const tick = (wait) => { id = setTimeout(() => {
      if (!alive) return;
      if (hh < MAX) { hh = Math.min(MAX, hh + 2); setH(hh); tick(hh >= MAX ? 2600 : 120); }
      else { hh = 0; setH(0); tick(700); }
    }, wait); };
    tick(600);
    return () => { alive = false; clearTimeout(id); };
  }, [MAX]);
  const gk = skillDef("SK_FIRE_06")?.name ?? "";
  const stufen = [
    { ab: 1, chip: null, key: "tut.sz.fh.s0", vars: { cap: C.FIRE_DIVIDEND_HEAT_CAP } },
    { ab: C.GLOWING_T1_HEAT, chip: gk, key: "tut.sz.fh.s40", vars: { v: C.GLOWING_T1_VALUE } },
    { ab: C.GLOWING_T2_HEAT, chip: gk, key: "tut.sz.fh.s70", vars: { v: C.GLOWING_T2_VALUE, m: C.GLOWING_T2_MARGIN } },
    { ab: C.CONFLAG_MIN_HEAT, chip: skillDef("SK_FIRE_11")?.name ?? "", key: "tut.sz.fh.s80", vars: { keep: C.CONFLAG_KEEP } },
    { ab: C.GLOWING_T3_HEAT, chip: gk, key: "tut.sz.fh.s100", vars: { v: C.GLOWING_T3_VALUE,
      wg: skillDef("SK_FIRE_07")?.name ?? "", max: C.HEAT_MAX + C.OVERHEAT_MAX, p: Math.round(C.OVERHEAT_SCORE_STEP * 100) } },
  ];
  const ticks = [C.GLOWING_T1_HEAT, C.GLOWING_T2_HEAT, C.CONFLAG_MIN_HEAT];
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="zeile">
        <div className="ziel"><span className="label">{t("bar.fire.heat")}</span>
          <span className="num" style={{ marginLeft: "auto" }}>{fmtPct(h / 100)}</span></div>
        <div className="hleiste" style={{ marginTop: 7 }}>
          <div className={`hfill ${h >= MAX ? "gluehend" : ""}`} style={{ width: `${h}%` }} />
          {ticks.map((ab) => <i key={ab} className="htick" style={{ left: `${ab}%` }} />)}
        </div>
      </div>
      <div className="stufen" style={{ marginTop: 4 }}>
        {stufen.map((s) => (
          <div key={s.key} className={`stufe ${h >= s.ab ? "an" : ""}`}>
            <b>{fmtPct(s.ab / 100)}</b>
            <span><ChipBadge skill={s.chip} />{rich(t(s.key, s.vars))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Szene Fs · Die Schmiede (Feuer Seite 3) ────────────────────
   Drei Glieder mit Skill-Marken (Owner-Korrektur: Asche braucht Brandmal, Schmieden
   braucht Ascheschmiede) plus die zwei Kartenzustände aus dem Spiel. */
export function SchmiedeSzene({ hint }) {
  useLocale();
  const brand = skillDef("SK_FIRE_13")?.name ?? "", schmiede = skillDef("SK_FIRE_15")?.name ?? "";
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="kette">
        <div><b>{t("tut.sz.fs.n1")}</b><span><ChipBadge skill={brand} />
          {rich(t("tut.sz.fs.k1", { b: C.BRAND_VALUE, a: C.BRAND_ASH }))}</span></div>
        <div><b>{t("tut.sz.fs.n2")}</b><span>{t("tut.sz.fs.k2")}</span></div>
        <div><b>{t("tut.sz.fs.n3")}</b><span><ChipBadge skill={schmiede} />
          {rich(t("tut.sz.fs.k3", { c: C.FORGE_COST, v: C.FORGE_VALUE }))}</span></div>
      </div>
      <div className="paar" style={{ marginTop: 4 }}>
        <div className="buehne klein"><div className="grosskarte fk">
          <span className="amboss">⚒+{C.FORGE_VALUE}</span>
          <span className="cwert">2</span>
          <span className="fuss">{t("tut.sz.fs.fussForge")}</span>
        </div></div>
        <div className="buehne klein"><div className="grosskarte bk">
          <span className="brandm">−{C.BRAND_VALUE}</span>
          <span className="cwert">7</span>
          <span className="fuss">{t("tut.sz.fs.fussBrand")}</span>
        </div></div>
      </div>
      <div className="merk3 warm">{rich(t("tut.sz.fs.merk"))}</div>
    </div>
  );
}

/* ── Szene Pw · Das Wachstum (Pflanze Seite 1) ──────────────────
   Auto-Loop: eine ROTE Karte wächst zu (das echte Neon-Moos aus dem Spiel), die Zahl
   färbt sich mit dem Wachstum ins Grün, der Ring läuft mit. Der Tab vergleicht den
   reinen Bau (Wert steigt je WURZELSCHLAG_PER_GROWTH) mit dem Mix (nur grün). */
const PLANT = "#5ab87a", PLANT_RIPE = "#86e0a0", PLANT_FULL = "#c8ffdc";
const mischHex = (a, b, tt) => {
  const hx = (x) => [1, 3, 5].map((k) => parseInt(x.slice(k, k + 2), 16));
  const [ar, ag, abl] = hx(a), [br, bg, bb] = hx(b);
  const cc = (x, y) => Math.round(x + (y - x) * tt).toString(16).padStart(2, "0");
  return "#" + cc(ar, br) + cc(ag, bg) + cc(abl, bb);
};
const PW_START = 4;

export function PflanzkarteSzene({ hint }) {
  useLocale();
  const [g, setG] = useState(0);
  const [rein, setRein] = useState(true);
  const GRUEN = C.PLANT_GREEN_THRESHOLD, CAP = C.PLANT_VALUE_CAP, PRO = C.WURZELSCHLAG_PER_GROWTH;
  const G_MAX = (CAP - PW_START) * PRO; // hier steht der Wert am Deckel
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setG(GRUEN); return undefined; }
    let alive = true, id = null, gg = 0;
    const tick = (wait) => { id = setTimeout(() => {
      if (!alive) return;
      if (gg < G_MAX) { gg++; setG(gg); tick(gg === GRUEN ? 900 : gg === G_MAX ? 2400 : 330); }
      else { gg = 0; setG(0); tick(700); }
    }, wait); };
    tick(600);
    return () => { alive = false; clearTimeout(id); };
  }, [GRUEN, G_MAX]);
  const gruen = g >= GRUEN;
  const wert = rein ? Math.min(CAP, PW_START + Math.floor(g / PRO)) : PW_START;
  const voll = rein && wert >= CAP;
  const p = Math.min(1, g / GRUEN);
  const nm = voll ? "tut.sz.pw.nmVoll" : gruen ? "tut.sz.pw.nmReif" : g > 0 ? "tut.sz.pw.nmSetzling" : "tut.sz.pw.nmFrisch";
  const sub = voll ? t("tut.sz.pw.subVoll", { cap: CAP })
    : gruen ? (rein ? t("tut.sz.pw.subReif", { pro: PRO, plus: 1 }) : t("tut.sz.pw.subReifMix"))
    : g > 0 ? t("tut.sz.pw.subSetzling")
    : t("tut.sz.pw.subFrisch");
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="werkzeuge formen" style={{ marginTop: 0 }}>
        <button type="button" className="tbtn" aria-pressed={rein} onClick={() => setRein(true)}>{t("tut.sz.pw.tabRein")}</button>
        <button type="button" className="tbtn" aria-pressed={!rein} onClick={() => setRein(false)}>{t("tut.sz.pw.tabMix")}</button>
      </div>
      <div className="buehne">
        <div className="grosskarte" style={{
          borderColor: gruen ? PLANT : undefined,
          boxShadow: gruen ? "0 0 0 1px #5ab87a, 0 0 14px -4px #5ab87a" : "none" }}>
          <Suspense fallback={null}><MossGrow growth={Math.min(GRUEN, g)} /></Suspense>
          <span className="cwert" style={{
            color: gruen ? (voll ? PLANT_FULL : PLANT_RIPE) : mischHex(C.suitColor("R"), PLANT, p * 0.85),
            textShadow: gruen ? "0 0 10px #86e0a088" : "none" }}>{wert}</span>
          {!gruen && g > 0 && (
            <span className="wring" style={{ display: "block",
              background: `conic-gradient(${PLANT} ${Math.round(p * 100)}%, #ffffff1f ${Math.round(p * 100)}%)` }} />
          )}
        </div>
      </div>
      <div className={`res ${voll ? "kern2" : gruen ? "w" : ""}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>{t(nm)}</div>
          <div className="rechnung">{sub}</div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>
          {gruen ? (rein ? t("tut.sz.pw.pktWert", { v: wert }) : t("tut.sz.pw.pktReif")) : `${g} / ${GRUEN}`}
        </div>
      </div>
      <div className="regeln" style={{ marginTop: 4 }}>
        <div><b>→</b><span>{rich(t("tut.sz.pw.a1"))}</span></div>
        <div><b>→</b><span>{rich(t("tut.sz.pw.a2", { g: GRUEN }))}</span></div>
      </div>
      <div className="merk3 gruen">{rich(t("tut.sz.pw.merk", { pro: PRO, plus: 1, cap: CAP }))}</div>
    </div>
  );
}

/* ── Szene Pg · Grüne Karten zahlen (Pflanze Seite 2) ───────────
   Ein Segment mit drei grünen Karten, darunter die drei Zahlkanäle mit Skill/Passiv-
   Marken. Der Farbblock-Deckel ist aus der Engine gerechnet (escalatingFactor am
   Grün-Cap), NICHT aus dem Mockup übernommen — dort stand ×3, die Engine zahlt
   ×{greenCap} (dieselbe Zahl wie tut.pflanze.tipps.0). */
const PG_KARTEN = [[9, true], [7, true], [11, true], [4, false], [6, false]];

export function GruenfeldSzene({ hint }) {
  useLocale();
  const capF = FARBBLOCK_BASE + Math.max(0, C.PLANT_GREEN_FARBBLOCK_CAP - 3) * ESKALATION_STEP;
  const wt = skillDef("SK_PLANT_02")?.name ?? "", bl = skillDef("SK_PLANT_10")?.name ?? "";
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="zeile">
        <span className="label">{t("tut.sz.pg.segLabel")}</span>
        <div className="reihe" style={{ marginTop: 6 }}>
          {PG_KARTEN.map(([v, gr], i) => (
            <Karte key={i} v={v} s={gr ? "G" : "N"} cls={gr ? "" : "dim"}
              kuerzel={gr ? t("tut.sz.pg.fussGruen") : undefined} />
          ))}
        </div>
      </div>
      <div className="stufen">
        <div className="stufe gruen an"><span><ChipBadge />{rich(t("tut.sz.pg.s1", { cap: f2(capF) }))}</span></div>
        <div className="stufe gruen an"><span><ChipBadge skill={wt} />{rich(t("tut.sz.pg.s2", { v: fmtNum(C.WURZELTIEFE_SCORE) }))}</span></div>
        <div className="stufe gruen an"><span><ChipBadge skill={bl} />{rich(t("tut.sz.pg.s3", { v: fmtNum(C.BLUETE_SCORE) }))}</span></div>
      </div>
      <div className="merk3 gruen">{rich(t("tut.sz.pg.merk"))}</div>
    </div>
  );
}

/* ── Szene Pt · Tempo und Trimmen (Pflanze Seite 3, neu) ────────
   Fasst Tempo, Reinheit und Trimmen — inhaltsgleich mit den Tipps formuliert, aber
   als eigene kurze Seite mit dem Überwucherungs-Merksatz aus der Engine. */
export function PflanztempoSzene({ hint }) {
  useLocale();
  const ueb = skillDef("SK_PLANT_14")?.name ?? "";
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="stufen">
        <div className="stufe gruen an"><span><ChipBadge />{rich(t("tut.sz.pt.s1", { ref: C.PLANT_GROWTH_SKILL_REF }))}</span></div>
        <div className="stufe gruen an"><span><ChipBadge />{rich(t("tut.sz.pt.s2"))}</span></div>
        <div className="stufe gruen an"><span><ChipBadge />{rich(t("tut.sz.pt.s3", {
          step: Math.round(C.TRIM_STEP * 100), cap: Math.round(C.TRIM_CAP * 100) }))}</span></div>
      </div>
      <div className="merk3 gruen">{rich(t("tut.sz.pt.merk", {
        ueb, pct: Math.round(C.UEBERWUCHERUNG_FIELD * 100), f: f2(C.UEBERWUCHERUNG_FACTOR) }))}</div>
    </div>
  );
}

/* ── Szene Eg · Der Gletscher (Eis Seite 1) ─────────────────────
   Auto-Loop: die Masse tickt hoch, der ECHTE Frost aus dem Spiel (FrostIce) springt
   an den Schwellen, bei BURST_AT bricht der Gletscher sichtbar und beginnt von vorn.
   Der Nachbar-Bonus steht seit dem Mockup-Review auf dieser Seite. */
export function GletscherSzene({ hint }) {
  useLocale();
  const SCHWELLEN = GLACIER.THRESHOLDS, WUCHT = GLACIER.TIER_MULT, BURST = GLACIER.BURST_AT;
  const [m, setM] = useState(0);
  const [bruch, setBruch] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setM(BURST); return undefined; }
    let alive = true, id = null, mm = 0;
    const tick = (wait) => { id = setTimeout(() => {
      if (!alive) return;
      if (mm < BURST) {
        mm++; setM(mm);
        if (mm === BURST) { setBruch(true); tick(2400); } else tick(420);
      } else { mm = 0; setM(0); setBruch(false); tick(700); }
    }, wait); };
    tick(600);
    return () => { alive = false; clearTimeout(id); };
  }, [BURST]);
  const stufe = SCHWELLEN.reduce((acc, sw) => acc + (m >= sw ? 1 : 0), 0);
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="buehne">
        <div className="grosskarte ek" style={bruch
          ? { boxShadow: "0 0 0 3px #d8f4ff, 0 0 30px 2px #8fdcf7" } : undefined}>
          <Suspense fallback={null}><FrostIce mass={m} /></Suspense>
          <span className="cwert" style={{ color: ["#e8e8ea", "#bfe4f5", "#9fdcf7", "#d8f4ff"][stufe] }}>7</span>
          <span className="gmarke"><img src={GLOSSARY_IMG_SRC.glacier} alt="" width="11" height="11" /><b>{m}</b></span>
        </div>
      </div>
      <div className="zeile" style={{ marginTop: 10 }}>
        <div className="ziel"><span className="label">{t("tut.sz.eg.masseLabel")}</span>
          <span className="num" style={{ marginLeft: "auto" }}>{m} / {BURST}</span></div>
        <div className="massb" style={{ marginTop: 7, gridTemplateColumns: `repeat(${BURST}, 1fr)` }}>
          {Array.from({ length: BURST }, (_, i) => (
            <i key={i} className={`${i < m ? "an" : ""} ${SCHWELLEN.slice(0, -1).includes(i + 1) ? "schw" : ""}`} />
          ))}
        </div>
      </div>
      <div className={`res ${bruch ? "eis" : stufe > 0 ? "kern2" : ""}`}>
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>
            {bruch ? t("tut.sz.eg.nmBruch") : t("tut.sz.eg.nmStufe", { n: stufe })}
          </div>
          <div className="rechnung">
            {bruch ? t("tut.sz.eg.subBruch")
              : stufe === 0 ? t("tut.sz.eg.sub0", { t1: SCHWELLEN[0] })
              : stufe === 1 ? t("tut.sz.eg.sub1", { t1: SCHWELLEN[0] })
              : stufe === 2 ? t("tut.sz.eg.sub2", { t2: SCHWELLEN[1] })
              : t("tut.sz.eg.sub3")}
          </div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>×{f1(WUCHT[stufe])}</div>
      </div>
      <div className="regeln" style={{ marginTop: 4 }}>
        <div><b>→</b><span>{rich(t("tut.sz.eg.a1", { a: GLACIER.EWIGER_FROST, b: GLACIER.WIN_MASS }))}</span></div>
        <div><b>→</b><span>{rich(t("tut.sz.eg.a2", { t1: SCHWELLEN[0], t2: SCHWELLEN[1], t3: SCHWELLEN[2] }))}</span></div>
      </div>
      <div className="stufen">
        <div className="stufe eis an"><span><ChipBadge />{rich(t("tut.sz.eg.nachbarn", {
          k: Math.round(GLACIER.KASKADE_PER_NEIGHBOR * 100), x: f2(GLACIER.KOLLISION_MULT) }))}</span></div>
      </div>
      <div className="merk3 eis">{rich(t("tut.sz.eg.merk", { max: BURST }))}</div>
    </div>
  );
}

/* ── Szene Ef · Gletscherformationen (Eis Seite 2, neu) ─────────
   Die vier Geometrie-Formen aus glacier.js als Tabs auf einem Brett-Ausschnitt.
   Owner-Wunsch: die Fläche zeigt das STAPELN — in ihr stecken vier Blöcke und ein
   Kreuz, die Mitte trägt das Produkt aller Faktoren (aus den Konstanten gerechnet). */
const EF_SP = 5;
const EF_FORMEN = {
  block: { faktor: () => GLACIER.GEO_BLOCK, zellen: [[1, 1], [1, 2], [2, 1], [2, 2]] },
  kreuz: { faktor: () => GLACIER.GEO_KREUZ, zellen: [[2, 2], [1, 2], [3, 2], [2, 1], [2, 3]] },
  linie: { faktor: () => GLACIER.GEO_LINIE, zellen: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]] },
  flaeche: { faktor: () => GLACIER.GEO_FLAECHE, mitte: [2, 2],
    zellen: [[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2], [3, 3]] },
};

export function GletscherformenSzene({ hint }) {
  useLocale();
  const [form, setForm] = useState("block");
  const g = EF_FORMEN[form];
  const set = new Set(g.zellen.map(([r, c2]) => r * EF_SP + c2));
  const mitte = g.mitte ? g.mitte[0] * EF_SP + g.mitte[1] : -1;
  /* Die Mitte der Fläche liegt zugleich in vier Blöcken und einem Kreuz — das Produkt
     rechnet die Konstanten nach, statt die Mockup-Zahl abzuschreiben. */
  const mitteF = Math.pow(GLACIER.GEO_BLOCK, 4) * GLACIER.GEO_KREUZ * GLACIER.GEO_FLAECHE;
  const subVars = {
    block: {}, kreuz: {},
    linie: { sp: VARS.segment, ze: VARS.segments, ew: skillDef("SK_ICE_08")?.name ?? "", fe: f2(GLACIER.EISWALL_LINIE) },
    flaeche: { m: f2(mitteF) },
  };
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="werkzeuge formen" style={{ marginTop: 0 }}>
        {Object.keys(EF_FORMEN).map((k) => (
          <button key={k} type="button" className="tbtn" aria-pressed={form === k} onClick={() => setForm(k)}>
            {glacierFormName(k)}
          </button>
        ))}
      </div>
      <div className="zeile">
        <span className="label">{t("tut.sz.ef.brettLabel")}</span>
        <div className="brett eis formen" style={{ marginTop: 6 }}>
          {Array.from({ length: EF_SP }, (_, r) => (
            <div key={r} className="zr">
              {Array.from({ length: EF_SP }, (_, c2) => {
                const p = r * EF_SP + c2;
                return (
                  <div key={c2} className={`z ${set.has(p) ? "gl" : ""} ${p === mitte ? "gx" : ""}`}>
                    {p === mitte ? <span className="zf">×{f2(mitteF)}</span> : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="res eis">
        <div>
          <div className="verdikt" style={{ fontSize: 13 }}>{glacierFormName(form)}</div>
          <div className="rechnung">{t(`tut.sz.ef.sub.${form}`, subVars[form])}</div>
        </div>
        <div className="pkt" style={{ whiteSpace: "nowrap" }}>×{f2(g.faktor())}</div>
      </div>
      <div className="merk3 eis">{rich(t("tut.sz.ef.merk"))}</div>
    </div>
  );
}

/* ── Szene Sn · Der Schnee (Eis Seite 3 — Runde 4, V2) ──────────
   Ersetzt die Einfrieren-Seite (deren Regeln stehen in den Tipps, Punkt 1 und 6). Erklärt
   das Schnee-System: die Boden-Reserve (firnStack) liegt auf dem FELD, nicht auf der Karte,
   und füllt spätere Gletscher zum Durchlauf-Beginn nach. Ohne die legendäre Eiszeit
   (Owner-Entscheid). Wortwahl wie im Lauf: „Schnee" und „Boden-Reserve" (bar.ice.*). */
export function SchneeSzene({ hint }) {
  useLocale();
  const treiben = skillDef("SK_ICE_02")?.name ?? "", frost = skillDef("SK_ICE_03")?.name ?? "";
  return (
    <div className="tsz">
      <p className="auftrag">{hint}</p>
      <div className="stufen">
        <div className="stufe eis an"><span><ChipBadge />{rich(t("tut.sz.sn.s1"))}</span></div>
        <div className="stufe eis an"><span><ChipBadge />{rich(t("tut.sz.sn.s2", { max: GLACIER.FIRN_REFILL_TARGET }))}</span></div>
        <div className="stufe eis an"><span><ChipBadge skill={treiben} />{rich(t("tut.sz.sn.s3", { n: GLACIER.SCHNEETREIBEN_SEED }))}</span></div>
        <div className="stufe eis an"><span><ChipBadge skill={frost} />{rich(t("tut.sz.sn.s4", { near: GLACIER.DAUERFROST_NEAR, far: GLACIER.DAUERFROST_FAR }))}</span></div>
      </div>
      <div className="merk3 eis">{rich(t("tut.sz.sn.merk", {
        ground: t("bar.ice.firnGround"), reserve: t("bar.ice.firnReserve") }))}</div>
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

