import { GEO_BLOCK, GEO_KREUZ, GEO_LINIE, GEO_FLAECHE, EISWALL_LINIE, ROLES } from "../game/glacier.js";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { t, fmtNum } from "../i18n/index.js"; // #sprache
import { glacierFormName } from "../i18n/labels.js";

// Eis-Neudesign: erklärt die 2D-Gletscher-Formationen (Block/Kreuz/Linie/Große Fläche) in BLAU — analog zur
// grünen Formations-Legende (W/F/T/Z/A). Gezeigt in der Aufstellung (FormationPhase) und der Chronik, sobald der
// Eis-Archetyp aktiv ist. Die Faktoren kommen aus glacier.js (SSOT); Eiswall hebt die Linie an (×1,60 statt ×1,30).
const dfmt = (x) => fmtNum(x);
const FROST = "#7fd4f0", FROST_TXT = "#93bcd0";

export function GlacierFormLegend({ state = {}, compact = false }) {
  const ice = (state.activeArchetypes || []).includes("ice");
  if (!ice) return null;
  const eiswall = (state.glacierRoles || []).includes(ROLES.EISWALL);
  const linie = eiswall ? EISWALL_LINIE : GEO_LINIE;
  // Namen aus dem Gletscher-Register (übersetzt), Beschreibungen aus dem Katalog.
  const rows = [
    ["block", GEO_BLOCK, t("glacierlegend.block")],
    ["kreuz", GEO_KREUZ, t("glacierlegend.kreuz")],
    ["linie", linie, t(eiswall ? "glacierlegend.linie.wall" : "glacierlegend.linie")],
    ["flaeche", GEO_FLAECHE, t("glacierlegend.flaeche")],
  ];
  if (compact) {
    // Chronik-Stil: eine kompakte Zeile mit Chips.
    return (
      <div className="text-meta-3 flex flex-wrap gap-x-3 gap-y-0.5 font-medium pt-1.5 mt-1 border-t" style={{ borderColor: "#5ec8f022" }}>
        <span className="font-bold inline-flex items-center gap-1" style={{ color: FROST }}><FactionIcon type="ice" size={13} /> {t("glacierlegend.head.compact")}</span>
        {rows.map(([k, f]) => (
          <span key={k} style={{ color: FROST_TXT }}><b style={{ color: FROST }}>{glacierFormName(k)}</b> ×{dfmt(f)}</span>
        ))}
        <span style={{ color: "#9a9aa4" }}>{t("glacierlegend.mark.a")} <b style={{ color: FROST }}>G</b> {t("glacierlegend.mark.compact")}</span>
      </div>
    );
  }
  // Aufstellungs-Stil: eine Zeile je Formation mit Beschreibung (wie die grüne W/F/T/Z/A-Liste).
  return (
    <div className="grid gap-0.5 text-body-5 sm:text-body-3 leading-snug font-medium pt-2 mt-1 border-t" style={{ borderColor: "#5ec8f022" }}>
      <div className="font-bold inline-flex items-center gap-1" style={{ color: FROST }}><FactionIcon type="ice" size={13} /> {t("glacierlegend.head")}</div>
      {rows.map(([k, f, desc]) => (
        <div key={k}><b style={{ color: FROST }}>{glacierFormName(k)}</b> <span style={{ color: FROST_TXT }}>×{dfmt(f)}</span> — {desc}</div>
      ))}
      <div style={{ color: "#9a9aa4" }}>{t("glacierlegend.mark.pre")} <b style={{ color: FROST }}>G</b> {t("glacierlegend.mark.post")}</div>
    </div>
  );
}
