import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n/useLocale.js";

/* #optionen-redesign — die Bedienelemente des Optionen-Screens, aus OptionsModal.jsx herausgelöst.
   ============================================================================
   WARUM EINE EIGENE DATEI. Ein Drittel von OptionsModal.jsx war Innenleben von Schaltern. Der Umbau
   legt ein Dropdown, eine Wertanzeige am Regler und einen gezeichneten Zeichensatz dazu, und alle
   drei sind die Sorte Bauteil, nach der ein zweiter Screen später fragt. Neben dem Screen, der
   zufällig der erste war, würden sie kopiert statt benutzt.

   DIE SCHMALE FASSUNG BEWEGT SICH NICHT. Der Entwurf nimmt sie ausdrücklich aus, also stehen hier
   dieselben Utility-Klassen und dieselben Maße wie vorher; was inline stand, steht jetzt in
   index.css, WERTGLEICH. Die 44-px-Regel des Komponenten-Kanons greift im 1280er Block, nicht in der
   Basis — sie gilt laut Entwurf unten erst, „sobald sie angefasst wird", und das ist eine andere
   Aufgabe als diese.

   COMMIT 2a: die STRUKTUR, mit den heutigen Flächenwerten. Die Tokens kommen in 2b. */

/* ---------------------------------------------------------------- icons ----
   GEZEICHNET STATT GETIPPT, und das ist eine Reparatur, keine Verzierung. Die Zeilen-Zeichen waren
   Unicode-Glyphen und hingen damit am Schriftschnitt — das ☾ des Ruhigen Modus las sich je nach
   Fallback als „C". Ein Strich-Satz: 16-px-Raster, gleiche Strichstärke, `currentColor`, damit das
   Zeichen dem Zustand der Zeile genauso folgt wie die Glyphe vorher.

   Im Entwurf bis zur Strichstärke freigegeben; die Hausregel behält neue Zeichen dem Owner vor, und
   diese Freigabe steht als MENU-14 in der Befundtabelle. */
const PATHS = {
  language: "M8 1.7a6.3 6.3 0 100 12.6 6.3 6.3 0 000-12.6M1.7 8h12.6M8 1.7c1.6 1.7 2.5 4 2.5 6.3S9.6 12.6 8 14.3C6.4 12.6 5.5 10.3 5.5 8S6.4 3.4 8 1.7",
  haptics: "M4.4 5.2a4.4 4.4 0 000 5.6M2.2 3a7.5 7.5 0 000 10M11.6 5.2a4.4 4.4 0 010 5.6M13.8 3a7.5 7.5 0 010 10M8 6.6v2.8",
  calm: "M13 9.9A5.6 5.6 0 016.1 3a5.9 5.9 0 106.9 6.9",
  telemetry: "M8 10.6V2.4M8 2.4L5.2 5.2M8 2.4l2.8 2.8M2.6 9.6v2.6a1.4 1.4 0 001.4 1.4h8a1.4 1.4 0 001.4-1.4V9.6",
  rfx: "M8 1.8l1.6 4.6 4.6 1.6-4.6 1.6L8 14.2l-1.6-4.6L1.8 8l4.6-1.6zM13 2v2.4M11.8 3.2h2.4",
  sound: "M8.6 3.1L4.9 6H2.6a1 1 0 00-1 1v2a1 1 0 001 1h2.3l3.7 2.9zM11.4 6.2a2.6 2.6 0 010 3.6M13.4 4.2a5.4 5.4 0 010 7.6",
  soundOff: "M8.6 3.1L4.9 6H2.6a1 1 0 00-1 1v2a1 1 0 001 1h2.3l3.7 2.9zM11.4 6.6l3.2 2.8M14.6 6.6l-3.2 2.8",
  sfx: "M8.6 3.1L4.9 6H2.6a1 1 0 00-1 1v2a1 1 0 001 1h2.3l3.7 2.9zM11.4 6.2a2.6 2.6 0 010 3.6",
  music: "M6 12.2a1.8 1.8 0 11-3.6 0 1.8 1.8 0 013.6 0zM13.6 10.4a1.8 1.8 0 11-3.6 0 1.8 1.8 0 013.6 0zM6 12.2V4.4l7.6-1.8v7.8",
  float: "M8 13.4V3M8 3L4.6 6.4M8 3l3.4 3.4",
  score: "M8 2.2l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.9l-3.8 2.1.7-4.3-3.1-3 4.3-.6z",
  mult: "M4 4l8 8M12 4l-8 8",
  /* Sieg/Niederlage: ein Pfeil hinauf, einer hinab. Der erste Entwurf waren gekreuzte Klingen, und
     gezeichnet las er sich als „V mit Querbalken" — ein Zeichen, das man erklaeren muss, ist keins. */
  winlose: "M4.6 12.4V4M4.6 4L2.5 6.4M4.6 4l2.1 2.4M11.4 3.6V12M11.4 12l2.1-2.4M11.4 12L9.3 9.6",
  breakdown: "M2.4 4.4h11.2M2.4 8h11.2M2.4 11.6h6.8",
  numScale: "M3 6.2h10M3 9.8h10M6.4 2.8L5 13.2M11 2.8L9.6 13.2",
  dev: "M2.4 12.4V6.6M6.1 12.4V3.2M9.9 12.4V8.4M13.6 12.4V5",
};

/* Kein `title`: das Zeichen wiederholt die Überschrift der Zeile. Ein Tooltip läse sie einem
   Screenreader zweimal vor und sagte der Maus nichts Neues — aria-hidden, wie die Glyphen vorher. */
export function OptIcon({ name }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg viewBox="0 0 16 16" className="op-icon-svg" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* ---------------------------------------------------------------- toggle ---
   Dieselbe Bauform und dieselben Maße wie vorher; Fläche, Rahmen und Griffposition hängen jetzt an
   `aria-checked` statt an einem Inline-Stil. `disabled` behält das Zustandsbild und nimmt keine
   Eingabe mehr an — AUCH NICHT über die Tastatur, weshalb es das Attribut des Knopfes ist und nicht
   `pointer-events: none`. Ein Element, das unbedienbar aussieht und trotzdem auf die Leertaste
   antwortet, ist schlimmer als eines, das bedienbar aussieht. */
export function Toggle({ on, onClick, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className="op-switch relative rounded-full transition-all shrink-0"
    >
      <span className="op-switch-knob absolute top-1/2 rounded-full transition-all" />
    </button>
  );
}

/* 3-Wege-Auswahl (z. B. Auto/An/Aus) im Stil der übrigen UI.
   `self-start`: In der gestapelten Zeile („Effekte reduziert") ist der Elternteil eine Spalte, und deren
   Kinder werden quer GESTRECKT — der Rahmen lief dann über die ganze Zeilenbreite, während die drei Knöpfe
   im linken Drittel standen. Die Auswahl bemisst sich an ihrem Inhalt, nicht am Kasten.
   #optionen-redesign: bleibt NUR für zwei bis drei feste Zustände, die nie mehr werden. Alles
   Wachsende geht ins Dropdown darunter. */
export function Segmented({ value, options, onChange, label }) {
  return (
    <div className="op-seg flex rounded-lg overflow-hidden shrink-0 self-start" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className="op-seg-btn px-3 py-1.5 text-body-5 font-bold transition-all">
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- dropdown --
   Für alles, was WACHSEN wird: heute die Sprachen, später die Auflösungen. Eine Segmented-Auswahl mit
   sechs Feldern ist eine Reiterzeile, die niemand mehr überblickt.

   FESTE KNOPFBREITE, damit der Kasten beim Wechseln der Auswahl nicht springt. Klick daneben und
   Escape schließen; die Liste ist eine echte Listbox, damit Screenreader und Pfeiltasten sie kennen. */
export function Dropdown({ value, options, onChange, label }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const cur = options.find((o) => o.v === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    /* Escape darf NICHT bis zum Escape-Handler des Modals durchlaufen, solange die Liste offen ist:
       die Liste zu schließen ist die nähere Bedeutung der Taste, und wer einmal drückt, erwartet
       dass EINE Sache zugeht. Capture-Phase, sonst war das Modal schon zu. */
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey, true); };
  }, [open]);

  return (
    <div className="op-dd shrink-0" ref={rootRef}>
      <button type="button" className="op-dd-btn flex items-center gap-2 rounded-lg transition-all"
        aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((v) => !v)}>
        <span className="op-dd-cur flex-1 text-left">{cur ? cur.label : ""}</span>
        <svg viewBox="0 0 16 16" className="op-dd-chev shrink-0" data-open={open ? "1" : "0"} aria-hidden="true"
          fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6.4L8 10.4l4-4" />
        </svg>
      </button>
      {open && (
        <ul className="op-dd-list" role="listbox" aria-label={label}>
          {options.map((o) => (
            <li key={o.v} role="option" aria-selected={o.v === value}>
              <button type="button" className="op-dd-item flex items-center gap-2 w-full text-left transition-all"
                data-sel={o.v === value ? "1" : "0"}
                onClick={() => { onChange(o.v); setOpen(false); }}>
                <span className="flex-1">{o.label}</span>
                {o.v === value && (
                  <svg viewBox="0 0 16 16" className="op-dd-tick shrink-0" aria-hidden="true" fill="none"
                    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.4 8.4l3 3 6.2-6.6" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- slider ----
   Der Wert ist aus der BESCHREIBUNG an den REGLER gewandert, also dorthin, wo die Sache steht, die
   er beschreibt. Er steht auf BEIDEN Breiten, nicht nur am Desktop: die Beschreibung hat ihren
   `{pct}` abgegeben, und eine schmale Fassung, die dafür nichts zurückbekommt, hätte Information
   verloren statt sie umgestellt.

   IST DER TON AUS, steht dort ein WORT statt einer Zahl. Ein Prozentwert, der nichts bewirkt, ist
   die schlechtere Antwort als das Wort, das sagt warum.

   Die Spur selbst bleibt in diesem Commit `accent-color` wie bisher. Der eigene Spur-/Griff-Skin des
   Komponenten-Kanons ist Aussehen, nicht Struktur — er gehört zum Vokabular in 2b. */
export function Slider({ value, min, max, step, onChange, disabled = false, label, format, mutedLabel }) {
  return (
    <div className={`op-slider flex items-center gap-2 shrink-0${disabled ? " is-off" : ""}`}>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        aria-label={label} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="op-slider-val ty-num">{disabled ? mutedLabel : format(value)}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- reset -----
   Eine Fußzeilen-Aktion, die jede Einstellung dieses Screens überschreibt — also fragt sie nach. Der
   Entwurf hat sie ohne Rückfrage gezeichnet; einen Klick von der ganzen Konfiguration entfernt ist
   nichts, was ein Agent nach eigenem Ermessen ausliefert, und der Owner hat zugestimmt (MENU-12).

   Zweistufig an Ort und Stelle statt als Dialog: die Reichweite ist ein Screen voller Vorlieben,
   nicht der Spielstand, und ein Modal über einem Modal läse sich schwerer als die Tat wiegt. */
export function ResetAction({ onReset }) {
  const t = useT();
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" className="op-reset flex items-center gap-2 transition-all" onClick={() => setArmed(true)}>
        <svg viewBox="0 0 16 16" className="op-reset-icon shrink-0" aria-hidden="true" fill="none"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.6 8a5.4 5.4 0 105.4-5.4c-1.9 0-3.5 1-4.5 2.4M3.1 2.6v2.6h2.6" />
        </svg>
        {t("options.reset")}
      </button>
    );
  }
  return (
    <div className="op-reset-armed flex items-center gap-2 flex-wrap">
      <span className="op-reset-ask">{t("options.reset.confirm")}</span>
      <button type="button" className="op-reset-yes transition-all" onClick={() => { onReset(); setArmed(false); }}>
        {t("options.reset.yes")}
      </button>
      <button type="button" className="op-reset-no transition-all" onClick={() => setArmed(false)}>
        {t("options.reset.no")}
      </button>
    </div>
  );
}
