import { GEO_BLOCK, GEO_KREUZ, GEO_LINIE, GEO_FLAECHE, EISWALL_LINIE, ROLES } from "../game/glacier.js";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon

// Eis-Neudesign: erklärt die 2D-Gletscher-Formationen (Block/Kreuz/Linie/Große Fläche) in BLAU — analog zur
// grünen Formations-Legende (W/F/T/Z/A). Gezeigt in der Aufstellung (FormationPhase) und der Chronik, sobald der
// Eis-Archetyp aktiv ist. Die Faktoren kommen aus glacier.js (SSOT); Eiswall hebt die Linie an (×1,60 statt ×1,30).
const dfmt = (x) => String(x).replace(".", ","); // Dezimal-Komma (1.5 → 1,5)
const FROST = "#7fd4f0", FROST_TXT = "#93bcd0";

export function GlacierFormLegend({ state = {}, compact = false }) {
  const ice = (state.activeArchetypes || []).includes("ice");
  if (!ice) return null;
  const eiswall = (state.glacierRoles || []).includes(ROLES.EISWALL);
  const linie = eiswall ? EISWALL_LINIE : GEO_LINIE;
  const rows = [
    ["Block", GEO_BLOCK, "2×2-Quadrat (4 Gletscher)"],
    ["Kreuz", GEO_KREUZ, "Zentrum + 4 Nachbarn (5 Gletscher)"],
    ["Linie", linie, `volle Reihe (5) oder Spalte (8)${eiswall ? " · Eiswall" : ""}`],
    ["Große Fläche", GEO_FLAECHE, "gefülltes 3×3 (9 Gletscher)"],
  ];
  if (compact) {
    // Chronik-Stil: eine kompakte Zeile mit Chips.
    return (
      <div className="text-[11px] flex flex-wrap gap-x-3 gap-y-0.5 font-medium pt-1.5 mt-1 border-t" style={{ borderColor: "#5ec8f022" }}>
        <span className="font-bold inline-flex items-center gap-1" style={{ color: FROST }}><FactionIcon type="ice" size={13} /> Gletscher-Formationen (2D):</span>
        {rows.map(([name, f]) => (
          <span key={name} style={{ color: FROST_TXT }}><b style={{ color: FROST }}>{name}</b> ×{dfmt(f)}</span>
        ))}
        <span style={{ color: "#9a9aa4" }}>blaues <b style={{ color: FROST }}>G</b> = Karte in aktiver Formation</span>
      </div>
    );
  }
  // Aufstellungs-Stil: eine Zeile je Formation mit Beschreibung (wie die grüne W/F/T/Z/A-Liste).
  return (
    <div className="grid gap-0.5 text-xs sm:text-[13px] leading-snug font-medium pt-2 mt-1 border-t" style={{ borderColor: "#5ec8f022" }}>
      <div className="font-bold inline-flex items-center gap-1" style={{ color: FROST }}><FactionIcon type="ice" size={13} /> Gletscher-Formationen (2D)</div>
      {rows.map(([name, f, desc]) => (
        <div key={name}><b style={{ color: FROST }}>{name}</b> <span style={{ color: FROST_TXT }}>×{dfmt(f)}</span> — {desc}</div>
      ))}
      <div style={{ color: "#9a9aa4" }}>Karten in einer aktiven Formation tragen ein blaues <b style={{ color: FROST }}>G</b> · höchster Faktor je Typ zählt.</div>
    </div>
  );
}
