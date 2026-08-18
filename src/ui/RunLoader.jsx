import { useEffect, useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { MODAL_CARD, ModalHairline, HAIRLINE } from "./modalStyle.jsx"; // Hub-Bildsprache + Logo-Verlauf (Cyan→Violett→Amber) für den Ladebalken
import { t } from "../i18n/index.js"; // #sprache

/* #190 — schlanker Vorlade-Balken für die kosmetischen Skins beim Run-Start.
   Lädt die aktiven Deck-/Battlefield-Bilder vor und ruft onReady, sobald alle da sind (Cache → sofort).
   Zeigt den sichtbaren Balken erst nach `showDelay` ms → kein Flackern bei bereits gecachten Skins.
   Sicherheitsnetz: nach `maxWait` ms wird trotzdem gestartet (nie hängen bleiben).
   Optik (#): an die Hub-Bildsprache angeglichen — Modal-Karte + Tri-Color-Haarlinie, Gradient-Wortmarke und ein
   Ladebalken im LOGO-VERLAUF (Cyan→Violett→Amber, voll-breit verankert wie die Haarlinie, links→rechts aufgedeckt). */
export function RunLoader({ images = [], onReady, showDelay = 150, maxWait = 3000 }) {
  const [done, setDone] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const urls = [...new Set(images.filter(Boolean))];
    const total = urls.length;
    if (total === 0) { onReady(); return; }

    let count = 0;
    const bump = () => {
      if (cancelled) return;
      count += 1;
      setDone(count);
      if (count >= total) { cancelled = true; onReady(); }
    };
    for (const src of urls) {
      const im = new Image();
      let settled = false;
      const settle = () => { if (settled) return; settled = true; bump(); }; // jedes Bild zählt GENAU einmal
      im.onerror = settle; // Fehler nicht blockieren lassen
      im.src = src;
      // #perf: img.decode() garantiert, dass das Bild vollständig DEKODIERT & paint-bereit ist (nicht nur geladen wie bei
      //   onload) → wenn die erste Karte/Backdrop im Lauf paintet, entfällt der First-Paint-Decode-Hitch (u. a. die
      //   Karten-Front-Skins). Fällt für Alt-Browser ohne decode() auf onload/complete zurück.
      if (typeof im.decode === "function") { im.decode().then(settle, settle); }
      else { im.onload = settle; if (im.complete) settle(); }
    }
    const showTimer = setTimeout(() => { if (!cancelled) setVisible(true); }, showDelay);
    const safety = setTimeout(() => { if (!cancelled) { cancelled = true; onReady(); } }, maxWait);
    return () => { cancelled = true; clearTimeout(showTimer); clearTimeout(safety); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  }, []);

  if (!visible) return null;
  const total = Math.max(1, [...new Set(images.filter(Boolean))].length);
  const pct = Math.min(100, Math.round((done / total) * 100));
  return overlayPortal((
    <div className="fixed inset-0 z-50 overlay-root flex items-center justify-center p-4" style={{ background: "#0c0c10f2", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-xs rounded-2xl overflow-hidden overlay-card as-panel" style={MODAL_CARD}>
        <ModalHairline />
        <div className="px-6 py-7 text-center">
          {/* Gradient-Wortmarke im Logo-Verlauf (wie die Kopf-Wortmarke der übrigen Hub-Overlays). */}
          <div className="text-base font-bold ty-display tracking-wide mb-4"
            style={{ backgroundImage: HAIRLINE.background, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
                     filter: "drop-shadow(0 0 10px rgba(155,130,240,0.35))" }}>
            {t("runloader.loading")}
          </div>
          {/* Ladebalken im Logo-Verlauf: die volle Farbleiste (Cyan→Violett→Amber) liegt fest im Track, die noch nicht
              geladene Strecke wird rechts abgedeckt → sichtbare Farbe = Fortschritt (wie die Tri-Color-Haarlinie, die sich füllt). */}
          <div className="relative h-2.5 w-full rounded-full overflow-hidden" style={{ background: "#141320", border: "1px solid #2a2836", boxShadow: "0 0 16px -3px rgba(155,130,240,0.4)" }}>
            <div className="absolute inset-0" style={{ backgroundImage: HAIRLINE.background }} />
            <div className="absolute inset-y-0 transition-[left] duration-200" style={{ left: `${pct}%`, right: 0, background: "#141320" }} />
          </div>
          <div className="text-[11px] mt-2 opacity-50 ty-num-sm">{pct}%</div>
        </div>
      </div>
    </div>
  ));
}
