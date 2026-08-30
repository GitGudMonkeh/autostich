// ❄ Eis (Gletscher-Archetyp) — Feld-Panel. „Gletscher, Brechen & Kaskade": Karten werden als Gletscher festgefroren,
// sammeln MASSE und brechen ab Stufe 3 (12) gewaltig — einzelne massive Hits. Gezeigt wird (kompakter Durchlauf-Fokus,
// NICHT das ganze Feld — das ist die Chronik):
//   • je Gletscher ein Icon, dessen Größe/Leuchten die Stufe kodiert (klein/matt → groß/hell = kritisch), Masse-Zahl
//     und drei diskrete Stufen-Segmente (Schwellen 4/8/12).
//   • Durchlauf-Kern: Gletscher-Ertrag · Kaskade (Brüche diesen Durchlauf) · größtes Cluster (Dichte treibt die Kaskade).
//   • Kontext (nur wenn relevant): Firn-Boden lädt · Gegner eingefroren · Duo-Buff · Große Lawine bereit/verbraucht.
// Rein informativ, keine Engine-Kopplung (spiegelt state.glacier*).
import { useRef, useEffect, useState } from "react";
import { FactionShell, PanelSkills } from "./indicators/panelKit.jsx";
import { glacierClusters, glacierNeighborFn, glacierFormations, THRESHOLDS, ROLES } from "../game/glacier.js";
import { fmtScore, fmtScoreShort } from "./format.js"; // #253: kompakte Abkürzung (Mio./Mrd.) für enge Kacheln + voller Wert im Tooltip
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon (Header/Marker = Eis-Icon)
import glacierIcon from "./assets/glacier.webp"; // #308b: das detaillierte Gletscher-Bild NUR für das wachsende Panel-Hero-Visual behalten
import { t } from "../i18n/index.js"; // #sprache
import { archetypeLabel, glacierFormName } from "../i18n/labels.js"; // Fraktions-/Formationsname aus den Registern

const FROST = "#5ec8f0", FROST_BRIGHT = "#8be6ff";
const dfmt = (x) => String(x).replace(".", ","); // Dezimal-Komma (1.5 → 1,5)
const KRIT_FROM = 9; // ab dieser Masse gilt ein Gletscher als „kritisch" (kurz vor Stufe 3 / Bruch bei 12)

// Ein Gletscher-Chip: Positionsnummer (#Spielreihenfolge) + Kartenwert · Icon (Größe = Stufe) + Masse + Stufen-Segmente.
function Glacier({ mass, order = null, value = null }) {
  const [T1, T2, T3] = THRESHOLDS;
  const scale = 0.5 + 0.5 * Math.min(1, mass / T3);
  const bricht = mass >= T3;                  // Bruch-bereit: höchste Stufe (12) erreicht → bricht
  const krit = mass >= KRIT_FROM && !bricht;  // kurz davor
  const alert = bricht || krit;
  const seg = (thr, i) => {
    const on = mass >= thr;
    const next = !on && (i === 0 || mass >= THRESHOLDS[i - 1]);
    return (
      <span key={thr} style={{
        flex: 1, height: 7, background: on ? FROST : "#0d1218",
        border: `1px solid ${on ? FROST_BRIGHT : next ? "#3f7f97" : "#1b2530"}`,
        clipPath: "polygon(14% 0, 100% 0, 86% 100%, 0 100%)",
        boxShadow: on ? "inset 0 0 4px #eafaffaa" : undefined,
      }} />
    );
  };
  return (
    <div style={{
      position: "relative", background: "#20202a", border: `1px solid ${alert ? FROST : "#2a2a34"}`,
      borderRadius: 8, padding: "5px 4px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: 46,
      boxShadow: bricht ? `0 0 16px ${FROST}77, inset 0 0 16px ${FROST}18` : krit ? `0 0 12px ${FROST}44, inset 0 0 14px ${FROST}10` : undefined,
    }} className={alert ? "as-glacier-shiver" : undefined} title={t(bricht ? "bar.ice.chip.title.burst" : "bar.ice.chip.title",
      { mass, tier: mass >= T3 ? 3 : mass >= T2 ? 2 : mass >= T1 ? 1 : 0 })}>
      {alert && <span style={{
        /* #typo: KEIN `--font-mono` — „kritisch"/„bricht" sind Wörter, keine Werte. Die drei Zahlen
           an diesem Chip (Reihenfolge, Kartenwert, Masse) tragen es dagegen sehr wohl. */
        position: "absolute", top: -7, left: "50%", transform: "translateX(-50%)",
        fontSize: 7.5, letterSpacing: ".04em", textTransform: "uppercase", color: "#071016", background: bricht ? "#eafaff" : FROST_BRIGHT, borderRadius: 4, padding: "0 3px", whiteSpace: "nowrap",
        fontWeight: bricht ? 700 : 400, boxShadow: bricht ? `0 0 8px ${FROST}` : undefined,
      }}>{t(bricht ? "bar.ice.bursting" : "bar.ice.critical")}</span>}
      {/* #384 Positionsnummer (Spielreihenfolge, 1-basiert) links · Kartenwert rechts — „welche Karte kommt wann". */}
      {(order != null || value != null) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", width: "100%", padding: "0 1px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          <span title={t("bar.ice.playOrder")} style={{ fontSize: 8.5, color: "#7f95a5", fontFamily: "var(--font-mono)" }}>#{order}</span>
          {value != null && <span title={t("bar.ice.cardValue")} style={{ fontSize: 11, fontWeight: 600, color: "#cfe4ef", fontFamily: "var(--font-mono)" }}>{value}</span>}
        </div>
      )}
      <div style={{ height: 34, display: "grid", placeItems: "end center", width: "100%" }}>
        <div style={{
          height: "100%", aspectRatio: "1", backgroundImage: `url(${glacierIcon})`, backgroundSize: "contain",
          backgroundPosition: "center bottom", backgroundRepeat: "no-repeat", transformOrigin: "bottom center", transform: `scale(${scale})`,
          filter: alert ? `saturate(1.15) brightness(1.18) drop-shadow(0 0 ${bricht ? 12 : 9}px ${FROST})` : "saturate(.85) brightness(.85) drop-shadow(0 2px 4px #0007)",
        }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13, color: FROST_BRIGHT, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{mass}</span>
      <div style={{ display: "flex", gap: 3, width: "88%", justifyContent: "center" }}>{THRESHOLDS.map(seg)}</div>
    </div>
  );
}

export function GlacierBar({ active, glacierLocked = [], glacierMass = [], firnStack = [], glacierYield = 0, glacierRoles = [], glacierPre = null,
                            deck = [], playerOrder = [],
                            frozenOppPending = {}, frozenOppActive = {}, glacierBuffPending = {}, glacierBuffActive = {}, grosseLawineFired = false,
                            options = {}, onOption, manyActive = false, skills = [], showSkills = false }) {
  // Hinweis: KEIN early-return vor den Hooks (React rules-of-hooks) — der `!active`-Ausstieg steht unten vor dem JSX.
  // #384: je Gletscher Position (i, = Spielreihenfolge i+1) + Kartenwert (deck[playerOrder[i]].value); nach POSITION sortiert
  //   (Deck-/Spielreihenfolge) statt nach Masse. Die „kritisch/Bricht"-Optik bleibt masse-basiert (im Chip).
  const glaciers = [];
  for (let i = 0; i < glacierLocked.length; i++) if (glacierLocked[i]) {
    const card = deck[playerOrder[i]];
    glaciers.push({ pos: i, order: i + 1, value: card ? card.value : null, mass: Math.round(glacierMass[i] || 0) });
  }
  glaciers.sort((a, b) => a.pos - b.pos); // Deck-/Spielreihenfolge statt Masse

  const cascade = glacierPre?.breaks?.length || 0;                        // Brüche in diesem Durchlauf
  const clusters = glacierClusters(glacierLocked, glacierNeighborFn(glacierRoles));
  const biggest = clusters.reduce((m, c) => Math.max(m, c.length), 0);    // größtes zusammenhängendes Cluster
  // #386 Firn-Boden-Reserve: offener Boden mit Reserve (firnStack) = „lädt"; gefrorene Gletscher halten ihre Restreserve
  // (füllt sie zum Rundenstart wieder auf 12 nach). Getrennt von glacierMass (Gletscher-Eigenmasse).
  let firn = 0; for (let i = 0; i < firnStack.length; i++) if (!glacierLocked[i] && (firnStack[i] || 0) > 0) firn++;
  let reserve = 0; for (let i = 0; i < firnStack.length; i++) if (glacierLocked[i]) reserve += (firnStack[i] || 0);
  reserve = Math.round(reserve);
  const frozenOpp = new Set([...Object.keys(frozenOppActive || {}), ...Object.keys(frozenOppPending || {})]).size;
  const duo = new Set([...Object.keys(glacierBuffActive || {}), ...Object.keys(glacierBuffPending || {})]).size;
  const hasLawine = (glacierRoles || []).includes(ROLES.L_LAWINE);
  // Aktive 2D-Gletscher-Formationen (Block/Kreuz/Linie/Fläche) + ihr Burst-Multiplikator — je Typ der höchste Faktor.
  const eiswall = (glacierRoles || []).includes(ROLES.EISWALL);
  const formByType = {};
  for (const gf of glacierFormations(glacierLocked, { eiswall }).forms) formByType[gf.type] = Math.max(formByType[gf.type] || 0, gf.factor);
  const activeForms = Object.entries(formByType).sort((a, b) => b[1] - a[1]);

  // Brech-Moment: fällt eine hohe Gletschermasse stark ab (Bruch) ODER springt der Ertrag, blitzt ein transienter
  // „Bruch"-Burst auf (aufsteigende Ertrags-Zahl + Frost-Puls). Erkennung per Vergleich zum vorigen Render.
  const prev = useRef(null);
  const keyRef = useRef(0);
  const [burst, setBurst] = useState(null); // { gain, key }
  useEffect(() => {
    if (prev.current) {
      const pm = prev.current.mass;
      let dropped = false;
      for (let i = 0; i < glacierMass.length; i++) {
        const before = pm[i] || 0, now = glacierMass[i] || 0;
        if (before >= 10 && now <= before - 4) { dropped = true; break; } // hohe Masse → Bruch
      }
      const gain = Math.round((glacierYield || 0) - prev.current.yield);
      if (dropped || gain > 0) { keyRef.current += 1; setBurst({ gain: Math.max(0, gain), key: keyRef.current }); }
    }
    prev.current = { mass: (glacierMass || []).slice(), yield: glacierYield || 0 };
  }, [glacierMass, glacierYield]);
  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(null), 950);
    return () => clearTimeout(t);
  }, [burst]);

  const stat = (k, v, sub, title) => (
    <div title={title} style={{ background: "#191922", border: "1px solid #2a2a34", borderRadius: 8, padding: "6px 9px", flex: sub ? "1.3 1 90px" : "1 1 64px", minWidth: 0 }}>
      {/* #skillheim: In der Instrumentenbank ist eine Spur bei vier Archetypen nur ~237 px breit — die
          Beschriftung bricht dort um, statt am Rand abgeschnitten zu werden. */}
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".07em", color: "#6a7a86", lineHeight: 1.15 }}>{k}</div>
      {/* #253: nowrap + overflow-hidden hält große Werte in der Kachel (Gletscher-Ertrag wird kompakt abgekürzt, s. u.) */}
      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1.05, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...(sub ? { fontSize: 22, color: FROST_BRIGHT, textShadow: `0 0 12px ${FROST}55` } : { fontSize: 17, color: "#e4eef4" }) }}>{v}</div>
    </div>
  );
  const chip = (label, val, color, dim) => (
    <span style={{ fontSize: 10.5, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 999,
      border: `1px solid ${color}${dim ? "44" : "99"}`, background: "#191922", color: dim ? "#6a7a86" : "#93a9ba", opacity: dim ? 0.7 : 1 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: dim ? undefined : `0 0 5px ${color}` }} />
      {label} {val != null && <b style={{ fontFamily: "var(--font-mono)", color: dim ? "#93a9ba" : "#e4eef4", fontVariantNumeric: "tabular-nums" }}>{val}</b>}
    </span>
  );

  if (!active) return null; // Ausstieg NACH den Hooks (rules-of-hooks): sonst wechselt die Hook-Zahl je Render.

  // Phase-3-Headline: „gleich knallt's"-Zustand (ein Gletscher an der Bruch-Schwelle) für die einklappbare Fraktions-Zeile.
  const readyBreak = glaciers.some((g) => g.mass >= THRESHOLDS[2]);
  const collapsed = options.collapseFacIce ?? manyActive;
  const onToggle = () => onOption && onOption({ collapseFacIce: !collapsed });
  const stateText = readyBreak ? t("bar.ice.state.ready") : t("bar.ice.state.count", { n: glaciers.length });

  return (
    <FactionShell className="relative" anchor="faction-ice" icon={<FactionIcon type="ice" size={15} />} name={archetypeLabel("ice")} color={FROST_BRIGHT}
      stateText={stateText} stateOn={readyBreak} collapsed={collapsed} onToggle={onToggle}
      footer={showSkills ? <PanelSkills skills={skills} arch="ice" color={FROST_BRIGHT} /> : null}>
      {burst && <div key={burst.key} className="as-frost-pulse" style={{ position: "absolute", inset: 0, borderRadius: 12, pointerEvents: "none" }} />}
      {burst && burst.gain > 0 && (
        <div key={"g" + burst.key} className="as-glacier-gain" style={{ position: "absolute", left: "50%", top: 26, pointerEvents: "none", zIndex: 3,
          fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 20, color: FROST_BRIGHT, textShadow: `0 0 14px ${FROST}`, whiteSpace: "nowrap",
          padding: "3px 12px", borderRadius: 999, background: "rgba(7,16,22,.82)", border: `1px solid ${FROST}88`, boxShadow: `0 0 18px ${FROST}55`, display: "flex", alignItems: "center", gap: 4 }}>
          <FactionIcon type="ice" size={16} /> +{fmtScoreShort(burst.gain)}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {stat(t("bar.ice.yield"), fmtScoreShort(glacierYield), true, fmtScore(glacierYield))}
        {stat(t("bar.ice.cascade"), <span>{cascade} <span style={{ fontSize: 10, color: "#6a7a86" }}>{t("bar.ice.cascade.unit")}</span></span>)}
        {stat(t("bar.ice.biggest"), biggest)}
      </div>

      {glaciers.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
          {glaciers.map((g) => <Glacier key={g.pos} mass={g.mass} order={g.order} value={g.value} />)}
        </div>
      ) : (
        <div style={{ fontSize: 11.5, color: "#6a7a86", textAlign: "center", padding: "6px 0" }}>
          {t("bar.ice.empty")}
        </div>
      )}

      {activeForms.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, justifyContent: "center" }}>
          {activeForms.map(([k, f]) => chip(glacierFormName(k), "×" + dfmt(f), FROST))}
        </div>
      )}

      {(firn > 0 || reserve > 0 || frozenOpp > 0 || duo > 0 || hasLawine) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {firn > 0 && chip(t("bar.ice.firnGround"), firn, FROST)}
          {reserve > 0 && chip(t("bar.ice.firnReserve"), reserve, FROST)}
          {frozenOpp > 0 && chip(t("bar.ice.frozenOpp"), frozenOpp, "#7ea6ff")}
          {duo > 0 && chip(t("bar.ice.duoBuff"), duo, "#d4a63a")}
          {hasLawine && chip(t(grosseLawineFired ? "bar.ice.avalanche.used" : "bar.ice.avalanche.ready"), null, "#d4a63a", grosseLawineFired)}
        </div>
      )}
    </FactionShell>
  );
}
