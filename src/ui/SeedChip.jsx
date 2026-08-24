import { useState } from "react";
import { copyToClipboard } from "./seedShare.js";
import { t } from "../i18n/index.js"; // #sprache

/* #menu-rework M7 — GEZEICHNETE ZEICHEN statt Textglyphen (design-sprache.md §4). Dieselbe Bauform
   wie `Mark` im Upgrade-Baum: 16er-Raster, eine Strichstärke, `currentColor`. Ersetzt werden genau
   zwei, und beide nennt der Zielentwurf: das `⧉` am Seed und das `↻` an „Nachspielen". Eine
   Textglyphe hängt am Schriftschnitt und sieht je nach Rückfall anders aus.
   `copy` sind zwei versetzte Rechtecke, `replay` ein offener Kreis mit Pfeilspitze — dieselben zwei
   Bilder, die die Glyphen meinten. */
const RD_MARK_PATHS = {
  copy: "M5.6 5.6V3.4a.8.8 0 01.8-.8h6.2a.8.8 0 01.8.8v6.2a.8.8 0 01-.8.8h-2.2M3.4 5.6h6.2a.8.8 0 01.8.8v6.2a.8.8 0 01-.8.8H3.4a.8.8 0 01-.8-.8V6.4a.8.8 0 01.8-.8z",
  replay: "M13.2 8a5.2 5.2 0 11-1.7-3.85M13.4 2.6v3.2h-3.2",
};
function RdMark({ name, className = "" }) {
  const d = RD_MARK_PATHS[name];
  if (!d) return null;
  return (
    <svg viewBox="0 0 16 16" className={`rd-mark ${className}`} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* #205 Challenger Mode — kopierbarer Seed-Chip (Kopier-Zeichen + kurzer „kopiert!"-Hinweis) mit
   optionalem „Nachspielen"-Knopf.

   #menu-rework M7 — DIE ZWEI TEXTGLYPHEN SIND WEG (design-sprache.md §4, vom Zielentwurf des
   Lauf-Fensters namentlich beauftragt): `⧉` am Seed und `↻` an „Nachspielen" sind jetzt gezeichnete
   SVG im 16er-Raster mit `currentColor`. Eine Textglyphe hängt am Schriftschnitt und sieht je nach
   Rückfall anders aus — dasselbe Argument, das das ☾ des Ruhigen Modus und das 🔒 im Baum abgelöst
   hat. Das `↻` stand im STRING (`seed.replay`), also fiel es dort mit: §7 verbietet Layout im String,
   und ein vorangestelltes Zeichen ist genau das. `code` = teilbarer Base32-Seed (formatSeed). Ohne code rendert nichts
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
    <span className="inline-flex items-center gap-1.5 text-meta-3">
      {/* #kante: Kopieren ist der Nebenweg (neutral), Nachspielen das Angebot (Goldkante). */}
      <button onClick={copy} title={t("seed.copy")}
        className="as-edge-neutral as-edge-thin inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono transition-all hover:brightness-125">
        <RdMark name="copy" />{code}
      </button>
      {copied && <span style={{ color: "#5ab87a" }}>{t("seed.copied")}</span>}
      {onReplay && (
        <button onClick={(e) => { e?.stopPropagation?.(); onReplay(); }} title={t("seed.replay.title")}
          className="as-edge as-edge-thin inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold transition-all hover:brightness-125"
          style={{ "--c": "#d4a63a" }}>
          <RdMark name="replay" />{t("seed.replay")}
        </button>
      )}
    </span>
  );
}
