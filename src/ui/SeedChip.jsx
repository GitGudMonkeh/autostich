import { useState } from "react";
import { copyToClipboard } from "./seedShare.js";
import { t } from "../i18n/index.js"; // #sprache

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
      {/* #kante: Kopieren ist der Nebenweg (neutral), Nachspielen das Angebot (Goldkante). */}
      <button onClick={copy} title={t("seed.copy")}
        className="as-edge-neutral as-edge-thin inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono transition-all hover:brightness-125">
        <span aria-hidden>⧉</span>{code}
      </button>
      {copied && <span style={{ color: "#5ab87a" }}>{t("seed.copied")}</span>}
      {onReplay && (
        <button onClick={(e) => { e?.stopPropagation?.(); onReplay(); }} title={t("seed.replay.title")}
          className="as-edge as-edge-thin px-2 py-0.5 rounded font-semibold transition-all hover:brightness-125"
          style={{ "--c": "#d4a63a" }}>
          {t("seed.replay")}
        </button>
      )}
    </span>
  );
}
