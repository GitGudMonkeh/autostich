// ❄️ Frost (Eis-Archetyp, #93 F3) — Kristall-Statusleiste zwischen Battlefield und Build-Panel.
// Rein informativ (keine verbrauchbare Ressource): je eigener eingefrorener Karte 1 BLAUER Kristall;
// je AKTUELL frostgebissener Gegnerkarte (Frostbiss, −3 diesen Durchlauf) 1 ROTER Kristall (#126) —
// so ist „mein Frost" vom „feindlichen Debuff" trennbar. Zwei Gruppen (eigene | Gegner); die Gegner-Zahl
// zeigt NUR die aktuell wirkenden Marken (temporär → geht hoch UND runter), nicht die für den nächsten
// Durchlauf vorgemerkten. WELCHE Gegnerkarten betroffen sind, wird nie gezeigt.
const ICE = "#5ec8f0"; // eigener Frost (blau)
const FOE = "#e0605a"; // feindlicher Frostbiss-Debuff (App-Rotton)

function Crystals({ n, color = ICE }) {
  if (n <= 0) return <span className="text-xs opacity-40">—</span>;
  return (
    <span className="inline-flex flex-wrap gap-0.5 align-middle">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} style={{ color, textShadow: `0 0 4px ${color}88`, fontSize: 12, lineHeight: 1 }}>◆</span>
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
        <span className="font-bold opacity-70">{ownCount + enemyCount} Kristalle</span>
      </div>
      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="opacity-55 w-14 shrink-0">Eigene</span>
          {/* #122: explizite Zahl der aktuell eingefrorenen eigenen Karten (nicht nur Kristalle abzählen). */}
          <span className="tabular-nums font-bold w-4 shrink-0" style={{ color: ICE }}>{ownCount}</span>
          <Crystals n={ownCount} color={ICE} />
        </div>
        <div className="flex items-center gap-2">
          <span className="opacity-55 w-14 shrink-0">Gegner</span>
          <span className="tabular-nums font-bold w-4 shrink-0" style={{ color: FOE }}>{enemyCount}</span>
          <Crystals n={enemyCount} color={FOE} />
        </div>
      </div>
    </div>
  );
}
