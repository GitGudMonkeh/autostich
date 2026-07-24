// ❄️ Frost (Eis-Archetyp, #93 F3) — Kristall-Statusleiste zwischen Battlefield und Build-Panel.
// Rein informativ (keine verbrauchbare Ressource): je eigener eingefrorener Karte 1 blauer Kristall,
// je frostgebissener Gegnerkarte (Frostbiss) 1 blauer Kristall. Alle blau; zwei Gruppen (eigene | Gegner),
// damit die Gegner-ANZAHL ablesbar bleibt — WELCHE Gegnerkarten betroffen sind, wird nie gezeigt.
const ICE = "#5ec8f0";

function Crystals({ n }) {
  if (n <= 0) return <span className="text-xs opacity-40">—</span>;
  return (
    <span className="inline-flex flex-wrap gap-0.5 align-middle">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ color: ICE, textShadow: `0 0 4px ${ICE}88`, fontSize: 12, lineHeight: 1 }}>◆</span>
      ))}
    </span>
  );
}

export function CrystalBar({ active, ownCount = 0, enemyCount = 0 }) {
  if (!active) return null;
  return (
    <div className="rounded-xl p-3 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="opacity-60">❄️ Frost</span>
        <span className="font-bold" style={{ color: ICE }}>{ownCount + enemyCount} Kristalle</span>
      </div>
      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="opacity-55 w-14 shrink-0">Eigene</span>
          <Crystals n={ownCount} />
        </div>
        <div className="flex items-center gap-2">
          <span className="opacity-55 w-14 shrink-0">Gegner</span>
          <Crystals n={enemyCount} />
        </div>
      </div>
    </div>
  );
}
