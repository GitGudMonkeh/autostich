/* TUTORIAL-OVERLAY — Erklär-Pop-up + Coach-Mark-Spotlight (Plan §7/§10).

   Zwei Erklär-Ebenen, dieselbe Karte:
     1. Phasen-Pop-up — „was mache ich hier", beim ersten Betreten jeder Phasenart.
     2. Coach-Mark    — ein Satz zu einem Panel, mit Spotlight auf dem echten Element.

   Der Text kommt ausschließlich aus dem Katalog (useT), die Zahlen als Platzhalter aus den
   Konstanten (tutorialScript.js `vars`) — abgetippte Zahlen driften beim nächsten Balancing.

   Mobil ist die Karte ein Bottom-Sheet, am Desktop ein zentriertes Fenster. Der Spotlight richtet
   sich nach der Effekt-Stufe des Spielers (useFxLevel), nicht nur nach prefers-reduced-motion —
   sonst animiert das Tutorial munter weiter, während alles andere abgeschaltet ist. */
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MODAL_CARD, TopHairline, ActionButton } from "../modalStyle.jsx";
import { useT } from "../../i18n/useLocale.js";
import { useFxLevel } from "../useReducedFx.js";

/* Rand um das hervorgehobene Panel, damit der Spotlight nicht auf der Kante klebt. */
const SPOT_PAD = 8;

/* Ankerrechteck suchen: das Panel trägt data-tut="<anchor>". Fehlt es (Panel in dieser Phase nicht
   gerendert, Layout noch nicht fertig), gibt es kein Rechteck — die Karte zeigt dann nur den Satz,
   ohne Spotlight. Lieber ein Satz ohne Rahmen als ein Rahmen um nichts. */
function useAnchorRect(anchor) {
  const [rect, setRect] = useState(null);
  useLayoutEffect(() => {
    if (!anchor) { setRect(null); return undefined; }
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(`[data-tut="${anchor}"]`);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) { setRect(null); return; }
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    // Das Panel kann in einem Scroll-Container liegen oder erst nach einem Frame stehen — deshalb
    // einmal nachmessen und auf Scroll/Resize hören (capture: auch innere Scroll-Container).
    raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchor]);
  return rect;
}

/* Spotlight: vier abdunkelnde Flächen um das Panel herum statt eines Lochs im Overlay. So bleibt das
   Panel voll sichtbar UND anfassbar, ohne dass ein clip-path/mask-Trick auf Mobile ausfällt. */
function Spotlight({ rect, animate }) {
  if (!rect) return null;
  const shade = { position: "fixed", background: "#0b0b10cc", pointerEvents: "none" };
  const t = Math.max(0, rect.top - SPOT_PAD);
  const l = Math.max(0, rect.left - SPOT_PAD);
  const w = rect.width + SPOT_PAD * 2;
  const h = rect.height + SPOT_PAD * 2;
  return (
    <div aria-hidden="true">
      <div style={{ ...shade, top: 0, left: 0, right: 0, height: t }} />
      <div style={{ ...shade, top: t + h, left: 0, right: 0, bottom: 0 }} />
      <div style={{ ...shade, top: t, left: 0, width: l, height: h }} />
      <div style={{ ...shade, top: t, left: l + w, right: 0, height: h }} />
      <div style={{
        position: "fixed", top: t, left: l, width: w, height: h, borderRadius: 14,
        border: "2px solid #9b82f0", boxShadow: "0 0 0 1px #9b82f055, 0 0 26px -6px #9b82f0",
        pointerEvents: "none", transition: animate ? "top .18s ease, left .18s ease, width .18s ease, height .18s ease" : "none",
      }} />
    </div>
  );
}

export function TutorialOverlay({ tut, reducedFx = "aus" }) {
  const t = useT();
  const fx = useFxLevel(reducedFx);   // Effekt-Stufe des Spielers, nicht nur prefers-reduced-motion
  const animate = fx === "full";
  const { step, mark, isOutro, stepNo, stepTotal, next, skipStep, end } = tut;
  const rect = useAnchorRect(mark ? mark.anchor : null);

  // Eingabe an der Tastatur: Enter/Leertaste = weiter. Escape beendet NICHT den Lauf, sondern nur
  // den laufenden Schritt — „Tutorial beenden" ist bewusst ein eigener, benannter Knopf.
  useEffect(() => {
    if (!step) return undefined;
    const onKey = (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "Escape") { e.preventDefault(); skipStep(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, next, skipStep]);

  if (!step) return null;

  const showMark = !!mark;
  const title = showMark ? null : t(step.titleKey, step.vars);
  const body = showMark ? t(mark.key, step.vars) : t(step.bodyKey, step.vars);

  /* Karte unten (Bottom-Sheet) — am Desktop mittig, mobil am unteren Rand. Beim Coach-Mark rückt sie
     an den GEGENÜBERLIEGENDEN Rand des Panels, damit sie das Erklärte nicht selbst verdeckt. */
  const anchorLow = rect ? rect.top + rect.height / 2 > window.innerHeight / 2 : false;
  const cardPos = showMark && anchorLow ? "top" : "bottom";

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t("tutorial.aria.dialog")}>
      {showMark
        ? <Spotlight rect={rect} animate={animate} />
        : <div className="absolute inset-0" style={{ background: "#0b0b10d0" }} aria-hidden="true" />}

      <div className={`absolute inset-x-0 flex justify-center p-3 sm:p-6 pointer-events-none ${cardPos === "top" ? "top-0" : "bottom-0"}`}>
        <div className="w-full max-w-md rounded-2xl px-4 pb-4 pt-4 sm:px-5 sm:pb-5 relative pointer-events-auto as-panel"
          style={MODAL_CARD}>
          <TopHairline />

          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: "#9b82f0" }}>
              {t("tutorial.eyebrow")}
            </span>
            {/* Nummer NUR im erklärten Bogen — die bedingten Phasen tragen keine (stepNo 0). */}
            {stepNo > 0 && !showMark && (
              <span className="text-[10px] tabular-nums ml-auto" style={{ color: "#8a8a95" }}>
                {t("tutorial.progress", { n: stepNo, total: stepTotal })}
              </span>
            )}
          </div>

          {title && <h2 className="text-[17px] font-extrabold mb-1.5 leading-tight">{title}</h2>}
          <p className="text-[13px] leading-snug" style={{ color: "#c9c6dd" }}>{body}</p>

          <div className="flex items-stretch gap-2 mt-4">
            <ActionButton kind="primary" flex onClick={next}>
              {isOutro ? t("tutorial.btn.finish") : t("tutorial.btn.next")}
            </ActionButton>
            {!isOutro && (
              <ActionButton kind="decline" onClick={skipStep}>{t("tutorial.btn.skipStep")}</ActionButton>
            )}
          </div>
          {!isOutro && (
            <button onClick={end} className="mt-2 w-full text-[11px] opacity-55 hover:opacity-90 transition-opacity">
              {t("tutorial.btn.end")}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default TutorialOverlay;
