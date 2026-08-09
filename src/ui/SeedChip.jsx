import { useState } from "react";
import { copyToClipboard } from "./seedShare.js";

/* #205 Challenger Mode — kopierbarer Seed-Chip (⧉ + kurzer „kopiert!"-Hinweis) mit optionalem
   „↻ Nachspielen"-Knopf. `code` = teilbarer Base32-Seed (formatSeed). Ohne code rendert nichts
   (Alt-Läufe / fremde Board-Einträge ohne Seed → kein Challenge-Knopf). */
export function SeedChip({ code, onReplay = null }) {
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  const copy = async (e) => {
    e?.stopPropagation?.();
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]">
      <button onClick={copy} title="Seed kopieren"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono transition-all hover:brightness-125"
        style={{ background: "#20202a", border: "1px solid #33333e", color: "#c8c8d0" }}>
        <span aria-hidden>⧉</span>{code}
      </button>
      {copied && <span style={{ color: "#5ab87a" }}>kopiert</span>}
      {onReplay && (
        <button onClick={(e) => { e?.stopPropagation?.(); onReplay(); }} title="Diesen Seed nachspielen"
          className="px-2 py-0.5 rounded font-semibold transition-all hover:brightness-125"
          style={{ background: "#d4a63a", color: "#141419" }}>
          ↻ Nachspielen
        </button>
      )}
    </span>
  );
}
