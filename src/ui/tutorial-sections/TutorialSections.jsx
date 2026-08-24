import { useState } from "react";
import { overlayPortal } from "../overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { useT } from "../../i18n/useLocale.js";
import { useEscape } from "../useEscape.js";
import { MODAL_CARD, STICKY_HEAD_BG, ActionButton } from "../modalStyle.jsx";
import { SECTIONS, sectionTitleKey, sectionSubKey, lessonTitleKey, beatKey } from "./catalog.js";
import { Satz, Merksatz, PROBES } from "./beats.jsx";

/* TUTORIAL-SEKTIONEN — die dritte Lehr-Ebene (Glossar = nachschlagen · Leitfaden = Strategie ·
   Tutorial = einmal machen, docs/tutorial-guided-run-plan.md §1).

   Drei Ebenen: Themenliste → Lektionsliste → Lektion. Die Navigation ist Zustand IN diesem Overlay,
   keine Route — das Overlay ist ein Fenster über dem Hub und kein Bildschirm mit eigener Adresse.

   DIE SCHALE IST GELIEHEN, NICHT ERFUNDEN: overlayPortal + MODAL_CARD + ActionButton + 92dvh-Karte im
   p-3-Rahmen sind exakt die Bauteile von Glossar und Leitfaden (src/ui/Glossary.jsx:141–152). Der
   Desktop-Pass kommt bewusst NACH dem Menü-Umbau (Owner-Entscheidung 5) — er erbt dann, was aus dieser
   Schale geworden ist, statt dass hier zweimal gestaltet wird.

   ZENTRIERT, NICHT OBEN ANGESCHLAGEN. Gemessen bei 390 × 844: eine Drei-Takt-Lektion ist 524 px hoch,
   also 62 % des Schirms. Oben angeschlagen lägen 308 px Schwarz darunter und der Bildschirm läse sich
   wie eine Seite, der der Inhalt ausging. `items-center` löst BEIDE Fälle mit einer Regel: eine Karte,
   die bis an den 92dvh-Deckel wächst, steht damit ohnehin wieder oben (12 px Rahmen je Seite), eine
   kurze schwebt mittig. Das Glossar schlägt oben an, weil es IMMER bis zum Deckel füllt. */

const FRAME = "absolute inset-0 overlay-safe flex items-center justify-center p-3 pointer-events-none";
const CARD = "tut-card pointer-events-auto w-full max-w-2xl flex flex-col rounded-2xl overflow-hidden "
  + "overlay-card as-panel as-panel-deck relative";
const HEAD = "tut-head px-4 pt-3.5 pb-2.5 flex-none";
const FOOT = "tut-foot flex-none flex items-center gap-2 px-4 py-2.5";
const EYEBROW = "text-meta-1 uppercase font-bold tracking-[0.18em]";

/* Die Haarlinie an der Kartenkante. Wie TopHairline in modalStyle.jsx, aber ohne dessen
   `absolute` — hier ist sie das erste FLUSS-Kind der Karte und schiebt den Kopf nicht unter sich. */
function Hairline() {
  return <div className="h-[3px] w-full shrink-0" aria-hidden="true"
    style={{ background: "linear-gradient(90deg, var(--deck-a1,#26c6e6), var(--deck-a2,#9b82f0), var(--deck-a1,#26c6e6))", opacity: 0.85 }} />;
}

/* design-sprache.md §1 — die ZEILE. Neutral, damit die Tönung der Karte als Fläche liest. */
function Row({ onClick, children, accent = false }) {
  return (
    <button type="button" onClick={onClick} className="tut-row block w-full text-left"
      style={{
        padding: "12px 13px 11px", borderRadius: 8, marginBottom: 8,
        background: "rgba(15,15,21,.72)",
        border: accent ? "1px solid color-mix(in srgb, var(--deck-a1,#8a7de0) 34%, #2b2a36)"
                       : "1px solid rgba(150,150,170,.12)",
      }}>
      {children}
    </button>
  );
}

function Head({ eyebrow, title, onClose, closeLabel }) {
  return (
    <div className={HEAD} style={{ borderBottom: "1px solid #2c2a3a", background: STICKY_HEAD_BG }}>
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <div className={EYEBROW} style={{ color: "var(--deck-a1, #8a7de0)", marginBottom: 3 }}>{eyebrow}</div>
          <h2 className="text-title-2 font-bold" style={{ color: "#e8e8ea", margin: 0, lineHeight: 1.2 }}>{title}</h2>
        </div>
        <ActionButton kind="secondary" className="tut-close flex-none" onClick={onClose}>{closeLabel}</ActionButton>
      </div>
    </div>
  );
}

export function TutorialSections({ onClose, onOpenGlossary = null }) {
  const t = useT();
  useEscape(onClose);
  // null = Themenliste · {section} = Lektionsliste · {section,lesson} = Lektion
  const [at, setAt] = useState(null);

  const section = at ? SECTIONS.find((s) => s.id === at.section) : null;
  const lesson = section && at.lesson ? section.lessons.find((l) => l.id === at.lesson) : null;
  const lessonIdx = lesson ? section.lessons.indexOf(lesson) : -1;

  const go = (delta) => {
    const next = section.lessons[lessonIdx + delta];
    if (next) setAt({ section: section.id, lesson: next.id });
    else setAt({ section: section.id });   // über das Ende hinaus → zurück in die Lektionsliste
  };

  /* `shell` portalt SELBST. Erste Fassung hatte drei `return overlayPortal(shell(...))` — verhalten
     identisch, aber test/overlay-nesting.js sucht `overlayPortal(` im Fenster VOR dem Klassen-Literal
     und sah keins. Der Wächter hatte recht, wenn auch aus dem falschen Grund: ein Portal-Aufrufort
     ist besser als drei. */
  const shell = (eyebrow, title, body, foot) => overlayPortal(
    <div className="fixed inset-0 overlay-root z-[60]" role="dialog" aria-modal="true" aria-label={t("tut.title")}>
      <div className="absolute inset-0" style={{ background: "rgba(6,6,10,.66)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div className={FRAME}>
        <div className={CARD} style={{ maxHeight: "92dvh", ...MODAL_CARD, boxShadow: "0 30px 80px -30px #000" }}>
          <Hairline />
          <Head eyebrow={eyebrow} title={title} onClose={onClose} closeLabel={t("common.close")} />
          <div className="tut-scroll flex-1 overflow-y-auto overlay-card px-4 py-3.5"
            style={{ overscrollBehavior: "contain" }}>
            {body}
          </div>
          <div className={FOOT} style={{ borderTop: "1px solid #2c2a3a", background: STICKY_HEAD_BG }}>{foot}</div>
        </div>
      </div>
    </div>
  );

  /* ---- Ebene 3: die Lektion ---- */
  if (lesson) {
    const body = lesson.beats.map((b, i) => {
      const key = beatKey(section, lesson, i);
      if (b.kind === "satz") return <Satz key={i} text={t(key)} />;
      if (b.kind === "merksatz") return <Merksatz key={i} label={t("tut.merksatz")} text={t(key)} />;
      const Probe = PROBES[b.probe];
      if (!Probe) return null;   // ein unbekannter Baustein rendert nichts — der Wächter fängt ihn vorher
      if (b.kind === "bild") return <Probe key={i} caption={t(key)} />;
      return <Probe key={i} title={t("tut.probe.title")} hint={t(key)}
        readoutLabel={t("tut.probe.readout")} noneLabel={t("tut.probe.none")} />;
    });
    const foot = (
      <>
        <ActionButton kind="secondary" onClick={() => go(-1)}>{t("tut.back")}</ActionButton>
        <div className="text-meta-1 ty-num-sm flex-1 text-center" style={{ color: "#71717c" }}>
          {t("tut.progress", { n: lessonIdx + 1, total: section.lessons.length })}
        </div>
        <ActionButton kind="primary" onClick={() => go(1)}>{t("tut.next")}</ActionButton>
      </>
    );
    return shell(t(sectionTitleKey(section)), t(lessonTitleKey(section, lesson)), body, foot);
  }

  /* ---- Ebene 2: die Lektionen einer Sektion ---- */
  if (section) {
    const body = section.lessons.map((l) => (
      <Row key={l.id} onClick={() => setAt({ section: section.id, lesson: l.id })}>
        <div className="text-body-4 font-semibold" style={{ color: "#e8e8ea" }}>{t(lessonTitleKey(section, l))}</div>
      </Row>
    ));
    const foot = <ActionButton kind="secondary" flex onClick={() => setAt(null)}>{t("tut.allTopics")}</ActionButton>;
    return shell(t("tut.title"), t(sectionTitleKey(section)), body, foot);
  }

  /* ---- Ebene 1: die Themenliste ---- */
  const body = SECTIONS.map((s) => (
    <Row key={s.id} onClick={() => setAt({ section: s.id })}>
      <div className="flex items-baseline gap-2.5">
        <div className="text-body-4 font-semibold flex-1 min-w-0" style={{ color: "#e8e8ea" }}>{t(sectionTitleKey(s))}</div>
        <div className="text-meta-1 ty-num-sm flex-none" style={{ color: "#71717c" }}>{s.lessons.length}</div>
      </div>
      <div className="text-body-1" style={{ color: "#8a8a95", marginTop: 3, lineHeight: 1.38 }}>{t(sectionSubKey(s))}</div>
    </Row>
  ));
  /* Der Verweis aufs Glossar ist Absicht, nicht Dekoration: die drei Lehr-Ebenen zeigen aufeinander,
     statt einander abzuschreiben (planning-report.md §6, H4). */
  const foot = onOpenGlossary
    ? <ActionButton kind="secondary" flex onClick={onOpenGlossary}>{t("tut.openGlossary")}</ActionButton>
    : <span className="text-meta-1" style={{ color: "#71717c" }}>{t("tut.sub")}</span>;
  return shell(t("tut.eyebrow"), t("tut.title"), body, foot);
}
