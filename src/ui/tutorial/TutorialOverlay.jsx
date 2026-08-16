/* TUTORIAL-OVERLAY — Erklär-Pop-up + Coach-Mark-Spotlight (Plan §7/§10).

   Zwei Erklär-Ebenen, zwei BEWUSST VERSCHIEDENE Platzierungen (Playtest-Feedback):

     1. Phasen-Pop-up — „was mache ich hier". Zentriertes Fenster wie der Namens-Dialog. Es erklärt
        den ganzen Bildschirm, hat also keinen Punkt, auf den es zeigen müsste; mittig gelesen wirkt
        es wie eine Ansage und nicht wie eine Randnotiz.
     2. Coach-Mark — ein Satz zu EINEM Panel. Die Karte hängt am Spotlight (bevorzugt darunter),
        nicht am Bildschirmrand: am Rand verdeckte sie regelmäßig genau das Element, das sie erklärt.

   Beides friert den Bildschirm ein: solange ein Schritt offen ist, lässt sich weder die Seite noch
   ein innerer Container scrollen. Vorher konnte man das erklärte Panel wegscrollen und stand vor
   einem Spotlight auf leerer Fläche.

   Der Text kommt ausschließlich aus dem Katalog (useT), die Zahlen als Platzhalter aus den
   Konstanten (tutorialScript.js `vars`) — abgetippte Zahlen driften beim nächsten Balancing.

   Der Spotlight richtet sich nach der Effekt-Stufe des Spielers (useFxLevel), nicht nur nach
   prefers-reduced-motion — sonst animiert das Tutorial munter weiter, während alles andere aus ist. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MODAL_CARD, TopHairline, ActionButton } from "../modalStyle.jsx";
import { useT } from "../../i18n/useLocale.js";
import { displayVars } from "./tutorialVars.js";
import { useFxLevel } from "../useReducedFx.js";

const SPOT_PAD = 8;      // Rand um das hervorgehobene Panel, damit der Spotlight nicht auf der Kante klebt
const CARD_GAP = 12;     // Abstand zwischen Spotlight und Karte
const CARD_MIN = 150;    // darunter lohnt sich die Seite nicht mehr — dann auf die andere wechseln

/* Sichtbare Viewport-Höhe. `visualViewport` ist auf Mobile das, was der Spieler wirklich sieht —
   `window.innerHeight` zählt den von der iOS-Adressleiste verdeckten Streifen mit. */
const viewportH = () => {
  if (typeof window === "undefined") return 800;
  return Math.round((window.visualViewport && window.visualViewport.height) || window.innerHeight);
};

/* Ankerrechteck suchen und das Element SICHTBAR machen. Das Panel trägt data-tut="<anchor>".
   Fehlt es (in dieser Phase nicht gerendert, Layout noch nicht fertig), gibt es kein Rechteck — die
   Karte zeigt dann nur den Satz, ohne Spotlight. Lieber ein Satz ohne Rahmen als ein Rahmen um nichts. */
function useAnchorRect(anchor) {
  const [rect, setRect] = useState(null);
  useLayoutEffect(() => {
    if (!anchor) { setRect(null); return undefined; }
    let raf1 = 0, raf2 = 0;
    const measure = () => {
      const el = document.querySelector(`[data-tut="${anchor}"]`);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) { setRect(null); return; }
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    /* IMMER hinscrollen, nicht nur wenn das Element ganz außerhalb liegt: die Auswahl-Overlays
       scrollen intern, und auf dem Handy stand das erklärte Panel regelmäßig halb unter dem
       Bildschirmrand. scrollIntoView löst auch verschachtelte Scroll-Container mit auf.

       Kleine Panels mittig (Platz auf beiden Seiten für die Karte). GROSSE Panels: oben Platz für die
       Coach-Mark-Karte RESERVIEREN und das Panel darUNTER scrollen — `scroll-margin-top` wird von
       scrollIntoView respektiert, block:"start" richtet dann die Panel-Oberkante an (viewport-Top +
       Reserve) aus. Vorher ans untere Ende (block:"end") gescrollt → die Panel-Oberkante saß HINTER der
       Karte und war oben abgeschnitten. Die Reserve fasst die übliche Kartenhöhe; cardBox setzt die Karte
       dann sauber in die Lücke oberhalb des Panels (kein Überlappen mehr). */
    const el0 = document.querySelector(`[data-tut="${anchor}"]`);
    if (el0 && el0.scrollIntoView) {
      // Schwelle bewusst NIEDRIG (0,3): schon mittelgroße Panels (Brett ~0,38 · Bauplan-Grid ~0,35) lassen
      // beim Zentrieren zu wenig Platz für die ~300px-Karte → sie landete im fill-Modus GANZ OBEN und das
      // Panel dazwischen (Meilensteine/„Was baust du") wurde angeschnitten. Ab 0,3 → reservierter Platz.
      const tall = el0.getBoundingClientRect().height > window.innerHeight * 0.3;
      if (tall) {
        const reserve = Math.round(Math.max(330, window.innerHeight * 0.46));
        const prevSMT = el0.style.scrollMarginTop;
        el0.style.scrollMarginTop = reserve + "px";                                   // nur für diesen einen Scroll
        el0.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
        el0.style.scrollMarginTop = prevSMT;
      } else {
        el0.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      }
    }
    measure();
    // Zweimal nachmessen: das Scrollen und ein etwaiger Layout-Nachlauf brauchen je einen Frame.
    raf1 = requestAnimationFrame(() => { measure(); raf2 = requestAnimationFrame(measure); });
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf1); cancelAnimationFrame(raf2);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchor]);
  return rect;
}

/* Scroll-Sperre, solange ein Tutorial-Schritt offen ist. Bewusst über die Events statt über
   `body { overflow: hidden }`: das Spiel scrollt in INNEREN Containern (Auswahl-Overlays,
   Architekt-Panel), die eine Body-Sperre gar nicht erreicht. Die Tutorial-Karte selbst bleibt
   scrollbar — sonst käme man bei langem Text nicht mehr an die Knöpfe. */
function useScrollLock(activeEl) {
  useEffect(() => {
    if (!activeEl) return undefined;
    const inCard = (target) => {
      const card = document.querySelector("[data-tut-card]");
      return !!(card && target && card.contains(target));
    };
    const block = (e) => { if (!inCard(e.target)) e.preventDefault(); };
    const opts = { passive: false, capture: true };
    document.addEventListener("wheel", block, opts);
    document.addEventListener("touchmove", block, opts);
    return () => {
      document.removeEventListener("wheel", block, opts);
      document.removeEventListener("touchmove", block, opts);
    };
  }, [activeEl]);
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

/* Wohin die Coach-Mark-Karte?

   Reihenfolge: ÜBER den Spotlight · sonst darunter · sonst oben angeheftet.

   „Oben" ist bewusst die erste Wahl (Playtest): unten stand die Karte regelmäßig halb außerhalb des
   Bildschirms, und beim Lesen sucht man den erklärten Punkt UNTER dem Text, nicht darüber.

   Die dritte Stufe ist der eigentliche Fehler-Fix: passt die Karte auf keiner Seite ganz hin (großes
   Panel wie das Aufstellungsbrett oder das Baufeld), wird sie oben angeheftet und ÜBERLAGERT den
   Spotlight. Vorher erzwang ein `Math.max(CARD_MIN, …)` eine Mindesthöhe, die größer als der Platz
   sein konnte — die Karte lief dann unten aus dem Bild und die Knöpfe waren nicht erreichbar.
   Lieber ein teilweise verdecktes Panel als eine abgeschnittene Erklärung. */
export function cardBox(rect, viewH, contentH = 0) {
  if (!rect) return { center: true };
  /* Die Karte darf nur in die Lücke über/unter dem Spotlight, wenn sie dort GANZ hineinpasst
     (gemessene Inhaltshöhe + ein Abstand). Sonst wurde sie in eine zu kleine Lücke gequetscht,
     auf maxH gedeckelt und scrollbar — die Knöpfe fielen unten raus. Vor der ersten Messung
     (contentH 0) gilt weiter die alte Mindesthöhe CARD_MIN (Geometrie-Tests bleiben unberührt). */
  const need = contentH > 0 ? contentH + CARD_GAP : CARD_MIN;
  /* Gerechnet wird mit dem SICHTBAREN Ausschnitt des Spotlights, nicht mit dem rohen Rechteck: ein
     Panel kann teilweise über dem oberen Rand liegen (negatives `top`), während der Nachlauf-Frame
     noch misst. Ungeklemmt kam dabei eine Karte mit negativem `top` heraus. */
  const spotTop = Math.max(0, Math.min(viewH, rect.top - SPOT_PAD));
  const spotBot = Math.min(viewH, Math.max(0, rect.top + rect.height + SPOT_PAD));
  const above = spotTop - CARD_GAP;
  const below = viewH - spotBot - CARD_GAP;
  /* ALLE drei Fälle werden von OBEN verankert — nie über CSS `bottom`.
     Grund (Playtest „Panel sitzt zu hoch"): `rect.top` kommt aus getBoundingClientRect und zählt im
     VISUELLEN Viewport, ein `bottom` auf dem fixierten Overlay rechnet gegen den LAYOUT-Viewport. Auf
     iOS sind die beiden verschieden hoch (Adressleiste) und die Karte rutschte um genau diese
     Differenz nach oben. `alignEnd` spannt den Container stattdessen von oben bis knapp über den
     Spotlight und legt die Karte an dessen unteren Rand: gleiche Optik, nur EINE Größenquelle. */
  if (above >= need) return { top: 0, maxH: Math.round(above), alignEnd: true };
  if (below >= need) return { top: Math.round(spotBot + CARD_GAP), maxH: Math.round(below - CARD_GAP) };
  /* Bildschirmfüllendes Panel (Aufstellbrett, Baufeld): oben wie unten kein Platz. Die Karte wird oben
     angeheftet und `fill` erlaubt ihr die VOLLE Resthöhe (zwischen den Safe-Areas, im Render als calc) —
     so ist der Tutorial-Text samt Knöpfen IMMER ganz sichtbar statt gedeckelt-und-scrollbar; das Brett
     füllt nur den Platz darunter. `maxH` bleibt als Fallback-Zahl erhalten (Geometrie-Test). */
  return { top: CARD_GAP, maxH: Math.round(viewH * 0.5), fill: true };
}

export function TutorialOverlay({ tut, reducedFx = "aus" }) {
  const t = useT();
  const fx = useFxLevel(reducedFx);   // Effekt-Stufe des Spielers, nicht nur prefers-reduced-motion
  const animate = fx === "full";
  const { step, mark, isOutro, next, skipStep, end } = tut;
  const rect = useAnchorRect(mark ? mark.anchor : null);
  const [viewH, setViewH] = useState(viewportH);
  const cardRef = useRef(null);
  // Gemessene Inhaltshöhe der Karte (scrollHeight = volle Höhe TROTZ maxHeight-Deckel). Damit entscheidet
  // cardBox, ob die Karte in die Lücke über/unter dem Spotlight passt oder oben mit voller Höhe anheftet.
  const [contentH, setContentH] = useState(0);

  useScrollLock(step ? (mark ? mark.anchor : step.id) : null);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const h = el.scrollHeight;
    setContentH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
  }, [step, mark, viewH]);

  useEffect(() => {
    /* Blendet iOS nur die Adressleiste ein/aus, feuert KEIN `resize` auf `window` — nur auf
       `visualViewport`. Ohne diesen Listener rechnete cardBox mit einer veralteten Höhe weiter. */
    const onResize = () => setViewH(viewportH());
    window.addEventListener("resize", onResize);
    const vv = window.visualViewport;
    if (vv) { vv.addEventListener("resize", onResize); vv.addEventListener("scroll", onResize); }
    return () => {
      window.removeEventListener("resize", onResize);
      if (vv) { vv.removeEventListener("resize", onResize); vv.removeEventListener("scroll", onResize); }
    };
  }, []);

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
  const vars = { ...step.vars, ...displayVars() };
  const title = showMark ? null : t(step.titleKey, vars);
  const body = showMark ? t(mark.key, vars) : t(step.bodyKey, vars);
  const box = showMark ? cardBox(rect, viewH, contentH) : { center: true };

  /* Höhe der Karte: zentriert 80dvh; bildschirmfüllendes Panel (`fill`) = ganze Resthöhe zwischen den
     Safe-Areas minus dem Kopf-Abstand (dann passt der Text samt Knöpfen immer rein, ohne Scroll-Deckel);
     sonst der spotlight-relative Platz aus cardBox. */
  const cardMaxH = box.center
    ? "80dvh"
    : box.fill
      ? `calc(100dvh - max(1.5rem, env(safe-area-inset-top)) - ${box.top}px - max(1rem, env(safe-area-inset-bottom)))`
      : box.maxH;

  const card = (
    <div ref={cardRef} data-tut-card
      className="w-full max-w-md rounded-2xl px-4 pb-4 pt-4 sm:px-5 sm:pb-5 relative pointer-events-auto as-panel overlay-card overflow-y-auto"
      style={{ ...MODAL_CARD, maxHeight: cardMaxH }}>
      <TopHairline />

      {/* Kein „Schritt n/m" mehr — bewusst nur die Rubrik. Die Zahl verunsicherte mehr als sie half
          (bedingte Phasen ohne Nummer, Reihenfolge ≠ Skript). */}
      <div className="mb-1.5">
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: "#9b82f0" }}>
          {t("tutorial.eyebrow")}
        </span>
      </div>

      {title && <h2 className="text-[17px] font-extrabold mb-1.5 leading-tight">{title}</h2>}
      <p className="text-[13px] leading-snug whitespace-pre-line" style={{ color: "#c9c6dd" }}>{body}</p>

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
  );

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={t("tutorial.aria.dialog")}>
      {showMark
        ? <Spotlight rect={rect} animate={animate} />
        : <div className="absolute inset-0" style={{ background: "#0b0b10d0" }} aria-hidden="true" />}

      {box.center ? (
        /* Phasen-Pop-up: echtes zentriertes Fenster (wie der Namens-Dialog) — inset-0 + place-items,
           damit es in BEIDEN Achsen mittig sitzt und nicht nur waagerecht. */
        <div className="absolute inset-0 grid place-items-center p-3 sm:p-6 pointer-events-none">{card}</div>
      ) : (
        /* Safe-Area einrechnen: das Overlay hängt per Portal am <body>, NICHT unter `.app-root` (das die
           Notch-/Home-Indicator-Insets als Padding trägt). Ohne diesen Abstand klebte die oben
           angeheftete Coach-Mark-Karte auf großen Panels (Aufstellbrett, Baufeld) unter der Notch und
           war abgeschnitten. Denselben Floor `max(1.5rem, env(...))` wie `.app-root` benutzen — env()
           allein ist auf manchen Geräten 0, dann fehlte der Abstand ganz. Lieber verdeckt die Karte
           etwas mehr vom Brett, als dass ihr Kopf fehlt. */
        <div className="absolute inset-x-0 flex justify-center px-3 sm:px-6 pointer-events-none"
          style={box.alignEnd
            // Unten am Spotlight ausgerichtet: der Container endet knapp darüber, der Safe-Area-Floor
            // wird oben von der Höhe abgezogen — die Karte rutscht weder unter die Notch noch tiefer.
            ? { top: "max(1.5rem, env(safe-area-inset-top))",
                height: `calc(${box.maxH}px - max(1.5rem, env(safe-area-inset-top)))`,
                alignItems: "flex-end" }
            : { top: `calc(max(1.5rem, env(safe-area-inset-top)) + ${box.top}px)` }}>
          {card}
        </div>
      )}
    </div>,
    document.body,
  );
}

export default TutorialOverlay;
