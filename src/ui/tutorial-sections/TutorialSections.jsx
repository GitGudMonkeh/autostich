import { useState } from "react";
import { overlayPortal } from "../overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { useT, useLocale } from "../../i18n/useLocale.js";
import { fmtNum } from "../../i18n/index.js"; // Dezimaltrennzeichen je Sprache
import { useEscape } from "../useEscape.js";
import { MODAL_CARD, STICKY_HEAD_BG, ActionButton } from "../modalStyle.jsx";
import { SECTIONS, sectionTitleKey, sectionSubKey, lessonTitleKey, beatKey, beatLabelKey } from "./catalog.js";
import { Satz, Block, Merk, Regeln, Tabelle, Tip, PROBES } from "./beats.jsx";
import * as C from "../../game/constants.js";
import { VARS } from "./vars.js";
import * as GL from "../../game/glacier.js";
import * as AR from "../../game/architect.js";
import * as FM from "../../game/formations.js";

/* Die Platzhalter liegen in vars.js, weil der Wächter dieselbe Liste braucht — siehe dort. */
const localeVars = (locale) => ({
  base: fmtNum(C.SCORE_PER_WIN, locale),
  streakPct: fmtNum(Math.round(C.STREAK_BASE_STEP * 100), locale),
  critMult: fmtNum(C.CRIT_BASE_MULT.toFixed(2), locale),
  critMultPerSkill: fmtNum(C.LIGHTNING_CRIT_MULT_PER_SKILL.toFixed(1), locale),
  wucht1: fmtNum(GL.TIER_MULT[1].toFixed(1), locale),
  wucht2: fmtNum(GL.TIER_MULT[2].toFixed(1), locale),
  wucht3: fmtNum(GL.TIER_MULT[3].toFixed(1), locale),
  rowFactor: "×" + fmtNum(AR.HAEUSERZEILE_FACTOR.toFixed(2), locale),
  colFactor: "×" + fmtNum(AR.SPALTE_FACTOR.toFixed(2), locale),
  rowAmp: "×" + fmtNum((1 + (AR.HAEUSERZEILE_FACTOR - 1) * C.FIRE_STRUCT_DIVIDEND_AMP).toFixed(2), locale),
  colAmp: "×" + fmtNum((1 + (AR.SPALTE_FACTOR - 1) * C.FIRE_STRUCT_DIVIDEND_AMP).toFixed(2), locale),
  eskStep: fmtNum(FM.ESKALATION_STEP.toFixed(2), locale),
  wiedStep: fmtNum(FM.WIED_STEP.toFixed(2), locale),
});
// `offered` bedeutet je nach Lektion etwas anderes — Perk-Angebot oder Skill-Angebot.
/* `none` hat nur, wer einen Leerzustand kennt. Die Aufstellungs-Runden kennen ihn: eine Reihe ohne
   Formation ist ein gültiger Zustand und braucht ein Wort dafür. */
const NONE_LABEL = new Set(["formation", "aufstellen", "kartenteile", "overlap", "bauen"]);
const OFFERED = { "tut.wahl.perks.0": C.PERKS_OFFERED, "tut.wahl.skills.0": C.SKILLS_OFFERED };

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

/* `seen` (Menge gelesener „sektion/lektion") und `last` kommen von außen — die Sektion hält keinen
   eigenen Speicher, damit sie ohne localStorage rendert (Server-Render, Tests). */
export const lessonPath = (s, l) => `${s.id}/${l.id}`;

export function TutorialSections({ onClose, onOpenGlossary = null, onOpenGuide = null, seen = [], last = null, onSeen = null }) {
  const t = useT();
  const [locale] = useLocale();
  const seenSet = new Set(seen);
  useEscape(onClose);
  // null = Themenliste · {section} = Lektionsliste · {section,lesson} = Lektion
  const [at, setAt] = useState(null);

  const section = at ? SECTIONS.find((s) => s.id === at.section) : null;
  const lesson = section && at.lesson ? section.lessons.find((l) => l.id === at.lesson) : null;
  const lessonIdx = lesson ? section.lessons.indexOf(lesson) : -1;

  const open = (sec, les) => {
    setAt({ section: sec.id, lesson: les.id });
    onSeen?.(lessonPath(sec, les));   // „gelesen" heißt geöffnet — es gibt keinen Abschluss zu erreichen
  };
  const go = (delta) => {
    const next = section.lessons[lessonIdx + delta];
    if (next) open(section, next);
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
      const vars = { ...VARS, ...localeVars(locale), offered: OFFERED[key] };
      if (b.kind === "satz") return <Satz key={i} text={t(key, vars)} />;
      if (b.kind === "block") return <Block key={i} text={t(key, vars)}
        label={b.label ? t(beatLabelKey(section, lesson, i), vars) : undefined} />;
      if (b.kind === "merk") return <Merk key={i} text={t(key, vars)} />;
      if (b.kind === "regeln") return <Regeln key={i} text={t(key, vars)} nummer />;
      if (b.kind === "liste") return <Regeln key={i} text={t(key, vars)} />;
      if (b.kind === "tabelle") return <Tabelle key={i} text={t(key, vars)} />;
      if (b.kind === "tip") return <Tip key={i} label={t("tut.tip")} text={t(key, vars)} />;
      const Probe = PROBES[b.probe];
      if (!Probe) return null;   // ein unbekannter Baustein rendert nichts — der Wächter fängt ihn vorher
      if (b.kind === "bild") return <Probe key={i} caption={t(key, vars)} onOpenGuide={onOpenGuide} />;
      /* Beschriftung JE BAUSTEIN. Vorher teilten sich alle Probierfelder die Wörter des
         Formations-Feldes — das Architekt-Brett trug damit „ein Segment" und „keine Formation",
         also Formations-Vokabular auf einem Gebäude-Brett. text-style-guide.md §1e reserviert
         „Formation" für Karten-Formationen; Tripwire 2 des Workstreams trifft genau das. */
      return <Probe key={i} title={t(`tut.probe.${b.probe}.title`)} hint={t(key, vars)}
        readoutLabel={t(`tut.probe.${b.probe}.readout`)}
        /* `none` hat nur, wer einen Leerzustand kennt: das Formations-Feld („keine Formation") und
           das Brett („kein Boost"). Serie und Faktoren haben keinen — eine Serie von 0 ist eine Zahl,
           und ein Sieg ohne Faktoren zahlt trotzdem. Ein Platzhalter-Strich für beide wäre ein toter
           Schlüssel gewesen, und genau danach sucht der i18n-Wächter. */
        noneLabel={NONE_LABEL.has(b.probe) ? t(`tut.probe.${b.probe}.none`) : undefined}
        /* Die Wörter der gespielten Runden. Sie liegen unter `tut.d.*` statt bei den Takten,
           weil sie zur RUNDE gehören und nicht zur Lektion: dasselbe „Sieg" steht in jeder. */
        labels={{ streak: t("tut.f.streak"), crit: t("tut.f.crit"), form: t("tut.f.form"), build: t("tut.f.build"),
          gegner: t("tut.d.gegner"), du: t("tut.d.du"), gegen: t("tut.d.gegen"),
          play: t("tut.d.play"), next: t("tut.d.next"), trickValue: t("tut.d.trickValue"),
          cardValue: t("tut.d.cardValue"), suit: t("tut.d.suit"), wins: t("tut.f.wins"),
          undo: t("tut.d.undo"), reset: t("tut.d.reset"), energy: t("tut.d.energy"),
          rotate: t("tut.d.rotate"), scoreUnit: t("tut.d.scoreUnit"),
          more: t("tut.d.more"), less: t("tut.d.less"), deck: t("tut.d.deck"), deckWide: t("tut.d.deckWide"),
          forge: t("tut.d.forge"), brand: t("tut.d.brand"), heats: t("tut.d.heats"),
          yes: t("tut.d.yes"), no: t("tut.d.no"), blade: t("tut.d.blade"), force: t("tut.d.force"),
          pureOnly: t("tut.d.pureOnly"), mixed: t("tut.d.mixed"),
          none: t("tut.d.none"), twoThirds: t("tut.d.twoThirds"), all: t("tut.d.all"),
          block: t("tut.d.block"), kreuz: t("tut.d.kreuz"), linie: t("tut.d.linie"), flaeche: t("tut.d.flaeche"),
          stitchPoints: t("tut.d.stitchPoints"), branchGen: t("tut.d.branchGen"), branchDeck: t("tut.d.branchDeck"),
          closed: t("tut.d.closed"), segIII: t("tut.d.segIII"), segIV: t("tut.d.segIV"), sum: t("tut.d.sum"),
          zeile: t("tut.d.zeile"), spalte: t("tut.d.spalte"), diag: t("tut.d.diag"), distrikt: t("tut.d.distrikt"),
          win: t("tut.d.win"), tie: t("tut.d.tie"), loss: t("tut.d.loss") }} />;
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
      <Row key={l.id} onClick={() => open(section, l)}>
        <div className="flex items-baseline gap-2.5">
          <div className="text-body-4 font-semibold flex-1 min-w-0" style={{ color: "#e8e8ea" }}>{t(lessonTitleKey(section, l))}</div>
          {seenSet.has(lessonPath(section, l)) && (
            <span className="text-meta-1 flex-none" style={{ color: "var(--deck-a1, #8a7de0)" }}>{t("tut.seen")}</span>
          )}
        </div>
      </Row>
    ));
    const foot = <ActionButton kind="secondary" flex onClick={() => setAt(null)}>{t("tut.allTopics")}</ActionButton>;
    return shell(t("tut.title"), t(sectionTitleKey(section)), body, foot);
  }

  /* ---- Ebene 1: die Themenliste ---- */
  const doneIn = (sec) => sec.lessons.filter((l) => seenSet.has(lessonPath(sec, l))).length;
  const total = SECTIONS.reduce((n, sec) => n + sec.lessons.length, 0);

  /* Die Weitermachen-Zeile ist Inhalt, nicht Polsterung: GEMESSEN ließ eine Liste aus nackten Zeilen
     228,5 px Schwarz unter der Karte (27 % des Schirms), mit ihr sind es 104,2
     (planning-report.md §1.4a). Sie ist zugleich der nützlichste Knopf für jeden, der wiederkommt. */
  const resume = (() => {
    if (!last) return null;
    const [sid, lid] = last.split("/");
    const sec = SECTIONS.find((x) => x.id === sid);
    const les = sec && sec.lessons.find((x) => x.id === lid);
    if (!sec || !les) return null;   // Lektion umbenannt/entfernt → keine tote Zeile zeigen
    return (
      <Row accent onClick={() => open(sec, les)}>
        <div className={EYEBROW} style={{ color: "var(--deck-a1, #8a7de0)", marginBottom: 4 }}>{t("tut.resume")}</div>
        <div className="text-body-4 font-semibold" style={{ color: "#e8e8ea" }}>
          {t(sectionTitleKey(sec))} · {t(lessonTitleKey(sec, les))}
        </div>
      </Row>
    );
  })();

  const body = (
    <>
      {resume}
      <div className={EYEBROW} style={{ color: "var(--deck-a1, #8a7de0)", paddingBottom: 10 }}>
        {t("tut.allProgress", { done: seenSet.size, total })}
      </div>
      {SECTIONS.map((s) => {
        const done = doneIn(s);
        return (
          <Row key={s.id} onClick={() => setAt({ section: s.id })}>
            <div className="flex items-baseline gap-2.5">
              <div className="text-body-4 font-semibold flex-1 min-w-0" style={{ color: "#e8e8ea" }}>{t(sectionTitleKey(s))}</div>
              <div className="text-meta-1 ty-num-sm flex-none" style={{ color: "#71717c" }}>{done} / {s.lessons.length}</div>
            </div>
            <div className="text-body-1" style={{ color: "#8a8a95", marginTop: 3, lineHeight: 1.38 }}>{t(sectionSubKey(s))}</div>
            <div style={{ height: 3, borderRadius: 2, background: "rgba(150,150,170,.14)", marginTop: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round(done / s.lessons.length * 100)}%`, background: "var(--deck-a1,#8a7de0)" }} />
            </div>
          </Row>
        );
      })}
    </>
  );
  /* Der Verweis aufs Glossar ist Absicht, nicht Dekoration: die drei Lehr-Ebenen zeigen aufeinander,
     statt einander abzuschreiben (planning-report.md §6, H4). */
  const foot = onOpenGlossary
    ? <ActionButton kind="secondary" flex onClick={onOpenGlossary}>{t("tut.openGlossary")}</ActionButton>
    : <span className="text-meta-1" style={{ color: "#71717c" }}>{t("tut.sub")}</span>;
  return shell(t("tut.eyebrow"), t("tut.title"), body, foot);
}
