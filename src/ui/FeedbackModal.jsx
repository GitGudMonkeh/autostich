import { useEffect, useRef, useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, ModalHairline, ActionBar, ActionButton } from "./modalStyle.jsx";
import { loadUsername, loadFeedbackDraft, saveFeedbackDraft, clearFeedbackDraft,
  feedbackRateCheck, noteFeedbackSent, FEEDBACK_MIN_GAP_MS } from "../game/storage.js";
import { submitReport, reportsConfigured } from "../game/reports.js";
import { lastRunContext, buildContext } from "./feedbackContext.js";
import { t } from "../i18n/index.js";
import { ModalIcon } from "./modalIcons.jsx";   // #menu-rework M9: gezeichnet statt getippt (M9-F06)
import { Toggle } from "./optionsBits.jsx";     // #menu-rework M9: der Schalter des Optionen-Kanons

/* FEEDBACK-MELDER (#396) — Bug/Idee aus dem Spiel heraus melden.

   NUR im Hauptmenü erreichbar. Das ist der Hauptgewinn dieser Variante: weil kein Lauf läuft,
   braucht das Modal KEINERLEI Einfrier-Logik (kein Eintrag in die Auto-Play-/Timer-/Watchdog-/
   Audio-Bedingungen wie bei Glossar und Optionen).

   Preis der Menü-Entscheidung: es gibt keinen laufenden Lauf, dessen Kontext man greifen könnte.
   Der Bezug kommt deshalb aus dem ZULETZT gespielten Lauf und wird sichtbar ausgewiesen — mit der
   Möglichkeit, ihn abzuwählen. Der Fehler-Ring-Puffer (errorBuffer.js) überbrückt dieselbe Lücke
   für Abstürze: der Crash passiert im Lauf, gemeldet wird danach im Menü. */

const KINDS = ["bug", "idea", "balance", "other"];
const MIN_LEN = 10;
const MAX_LEN = 1000;

/* #menu-rework M9 (feedback-redesign §Die vier Meldungen). Danke, Entwurf-nachgesendet, Sendefehler und
   „nicht konfiguriert" trugen vier verschiedene Polsterungen, Schnitte und Schriftgroessen, obwohl sie
   dasselbe sind: EINE Zeile Rueckmeldung. Jetzt gleiche Maße, gleicher Schnitt, gleiche Polsterung —
   nur die Farbrolle unterscheidet sie, und die drei Rollen sind die des Kanons.

   Die Werte bleiben Literale und werden von der Ink-Ratsche gezaehlt: eine Farb-ROLLE (gruen/rot/amber
   als Zustandspaar) ist genau die Luecke, die §2c als MENU-48 offen fuehrt und die erst auf der dritten
   unabhaengigen Sichtung ein Token wird. Hier ist sie zusammengefasst, nicht gepraegt — vier Fundstellen
   sind eine geworden, was die Ratsche senkt statt sie zu heben. */
/* Der Zeilengrund aus design-sprache.md §1 — M8-G2. M9 hat ihn gemeldet und gezaehlt; der Planner hat
   daraufhin `--sf-row` gepraegt (conventions.md §2c) und MR1 zeigt die acht Fundstellen darauf.
   Wertgleich, gemessen bei null Delta. */
const ROW_BG = "var(--sf-row)";
const ROW_EDGE = "rgba(150, 150, 170, .12)";

const MSG_ROLE = {
  ok:    { bg: "#123a25", edge: "#2f7a4f", ink: "#9fe0b8" },
  error: { bg: "#3a1518", edge: "#d1462f66", ink: "#f0a898" },
  warn:  { bg: "#3a2a15", edge: "#d0902f", ink: "#f0d9a8" },
};

function FbMessage({ role, icon, children, status = false }) {
  const r = MSG_ROLE[role];
  return (
    <div role={status ? "status" : undefined}
      className="fb-note rounded-lg px-3 py-2 text-body-1 leading-snug flex items-center gap-2"
      style={{ background: r.bg, border: `1px solid ${r.edge}`, color: r.ink }}>
      {icon}
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function FeedbackModal({ onClose }) {
  useEscape(onClose);
  const draft = useRef(loadFeedbackDraft()).current;   // geparkter Entwurf eines Fehlversuchs
  const [kind, setKind] = useState(draft?.kind || "bug");
  const [message, setMessage] = useState(draft?.message || "");
  const [name, setName] = useState(draft?.name ?? loadUsername());
  const [honey, setHoney] = useState("");              // Honeypot — Menschen füllen ihn nie aus
  const [state, setState] = useState("form");          // form | sending | done | error
  const [err, setErr] = useState("");
  const [run, setRun] = useState(null);
  const [useRun, setUseRun] = useState(true);
  const [sentDraft, setSentDraft] = useState(false);   // geparkter Entwurf ging still raus

  // Den Lauf-Bezug erst beim Öffnen holen (localStorage-Zugriff gehört nicht in den Render).
  useEffect(() => { setRun(lastRunContext()); }, []);

  /* Geparkten Entwurf STILL nachsenden: Wer beim letzten Mal kein Netz hatte, soll den Report
     nicht noch einmal tippen müssen. Läuft im Hintergrund; klappt es, ist das Formular wieder leer.
     Schlägt es erneut fehl, bleibt der Entwurf einfach stehen — kein zweiter Fehlerhinweis, der
     Melder hat ja gerade gar nichts angestoßen. */
  useEffect(() => {
    if (!draft || !reportsConfigured) return;
    let alive = true;
    (async () => {
      try {
        await submitReport({ ...draft, ...buildContext(lastRunContext()) });
        noteFeedbackSent();
        clearFeedbackDraft();
        // Nur leeren, wenn der Text noch der geparkte Entwurf ist — wer inzwischen weitertippt,
        // verliert sonst seine Aenderungen an einen Hintergrund-Versand (#health-check G2).
        if (alive) { setMessage((cur) => (cur === draft.message ? "" : cur)); setSentDraft(true); }
      } catch (e) { /* bleibt geparkt, nächster Versuch beim nächsten Öffnen */ }
    })();
    return () => { alive = false; };
  }, [draft]);

  // Nach dem Danke-Zustand von selbst schließen — wer gerade abgeschickt hat, will nicht noch
  // einen Knopf drücken. Lang genug, dass die Bestätigung wirklich gelesen wird.
  useEffect(() => {
    if (state !== "done") return undefined;
    const id = setTimeout(onClose, 1600);
    return () => clearTimeout(id);
  }, [state, onClose]);

  const text = message.trim();
  const tooShort = text.length < MIN_LEN;
  const canSend = !tooShort && state !== "sending" && reportsConfigured;

  async function send() {
    if (!canSend) return;
    if (honey) { setState("done"); return; }  // Bot: stillschweigend „erfolgreich" beenden
    const gate = feedbackRateCheck();
    if (!gate.ok) {
      // Sichtbarer Hinweis statt stiller Verweigerung — sonst hält der Melder es für kaputt.
      setErr(gate.reason === "dailyCap"
        ? t("feedback.err.dailyCap")
        : t("feedback.err.tooSoon", { s: Math.ceil((gate.waitMs || FEEDBACK_MIN_GAP_MS) / 1000) }));
      setState("error");
      return;
    }
    const entry = { kind, message: text, name: name.trim(), ...buildContext(useRun ? run : null) };
    setState("sending");
    setErr("");
    try {
      await submitReport(entry);
      noteFeedbackSent();
      clearFeedbackDraft();
      setState("done");
    } catch (e) {
      // Kein Report geht verloren: Entwurf parken (geht beim nächsten Menü-Besuch still raus) UND
      // in die Zwischenablage legen, damit der Text auch bei einem localStorage-Ausfall nicht weg ist.
      saveFeedbackDraft({ kind, message: text, name: name.trim() });
      try { navigator.clipboard?.writeText(text); } catch (e2) { /* Zwischenablage ist Kür */ }
      setErr(t("feedback.err.send"));
      setState("error");
    }
  }

  const chipCls = "px-3 py-1.5 rounded-full text-body-5 font-bold transition-all";
  const runLabel = run && run.seed != null
    ? t("feedback.run.with", { seed: run.seed, cycle: run.cycle ?? "?" })
    : t("feedback.run.none");

  return overlayPortal((
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={t("feedback.title")} className="fb-root fixed inset-0 overlay-root z-40 flex items-center justify-center p-4"
      /* #menu-rework M9, Vokabular: `--sf-scrim` IST `rgba(12, 12, 16, .8)` — wertgleich zu
         `#0c0c10cc`, und der Ueberzug-Wert, aus dem der Schritt abgeleitet wurde. Ab 1280 px zeigt
         `.un-root, .fb-root` ihn auf `--sf-scrim-desk` um (94 %), was die sanktionierte Form ist:
         eine Stufe auf der eigenen Wurzel auf eine ANDERE benannte Stufe zeigen. */
      style={{ background: "var(--sf-scrim)", backdropFilter: "blur(3px)" }}>
      {/* #deckui: äußere Karte zieht den deck-getönten Rahmen-Verlauf (as-panel-deck). */}
      <div onClick={(e) => e.stopPropagation()} className="fb-card w-full max-w-lg rounded-2xl max-h-[90dvh] overflow-y-auto overlay-card as-panel as-panel-deck" style={MODAL_CARD}>
        <ModalHairline />
        <div className="fb-body p-6">
          <ActionBar pad={6} className="fb-bar">
            <span className="flex-1" />
            <ActionButton kind="secondary" onClick={onClose}><span className="as-deskonly fb-closeicon" aria-hidden="true"><ModalIcon name="close" /></span>{t("common.close")}</ActionButton>
          </ActionBar>

          {/* #desktop: Auskunftszeile neben dem Titel (Spalte 2 des Kopf-Rasters, wie im Upgrade-Baum).
              Sie sagt, wohin die Meldung geht und was automatisch mitgeht — auf dem Handy fehlt dafür
              schlicht die Zeile, dort steht es am Lauf-Bezug weiter unten. */}
          <div className="fb-readout hidden dt:block">{t("feedback.desk.readout")}</div>

          <div className="fb-head text-center mb-4">
            {/* #deckui: Eyebrow deck-getönt. */}
            <div className="text-body-5 uppercase tracking-widest" style={{ color: "var(--deck-a1, #8a7de0)" }}>{t("feedback.eyebrow")}</div>
            <h2 className="text-title-6 font-bold mt-1">{t("feedback.title")}</h2>
          </div>

          {state === "done" ? (
            /* Dieselbe Hinweisbox wie „Entwurf nachgesendet"/Fehler/Offline weiter unten — gleiche
               Maße, gleiches Grün. Vorher stand hier ein Kasten mit doppelter Polsterung und
               Riesen-Haken; auf dem Handy füllte er fast das ganze Fenster, obwohl er nur vier
               Wörter trägt. Ein Erfolg braucht keinen mehr Platz als ein Fehler. role="status",
               damit Screenreader die Bestätigung ansagen — der Dialog schließt gleich von selbst. */
            <FbMessage role="ok" status
              icon={<span aria-hidden="true" style={{ color: "#54e08a" }}>✓</span>}>
              {t("feedback.thanks")}
            </FbMessage>
          ) : (
            <div className="fb-form grid gap-3">
              {/* #desktop — zwei Klammern für die beiden Spalten (links Art + Text, rechts Name, Lauf-Bezug
                  und Absenden). Unter 1280 px sind beide `display: contents`; das Handy-Raster ordnet dann
                  weiterhin alle Bausteine direkt, Reihenfolge und Abstände unverändert. */}
              <div className="fb-left">
              {/* Art — vorausgewählt „Bug", aber die Idee steht gleichberechtigt daneben. */}
              <div>
                <div className="fb-slabel text-meta-3 uppercase tracking-wide opacity-55 mb-1.5">{t("feedback.kind")}</div>
                <div className="fb-kinds flex flex-wrap gap-1.5">
                  {KINDS.map((kk) => (
                    /* #kante: gewählte Kategorie mit violetter Kante statt gefüllter Fläche. */
                    <button key={kk} type="button" onClick={() => setKind(kk)}
                      className={`fb-kind ${kind === kk ? "as-edge" : "as-edge-neutral"} as-edge-thin ${chipCls}`}
                      /* #deckui: aktive Kategorie-Kante zieht die Deckfarbe. */
                      style={kind === kk ? { "--c": "var(--deck-a1, #8a7de0)" } : undefined}>
                      {t(`feedback.kind.${kk}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Was ist passiert — das einzige Pflichtfeld. Jedes weitere kostet Reports. */}
              <div className="fb-msgbox">
                <div className="fb-msghead flex items-baseline justify-between gap-2 mb-1.5">
                  <span className="fb-slabel text-meta-3 uppercase tracking-wide opacity-55">{t("feedback.message")}</span>
                  <span className="fb-count text-meta-1 tabular-nums" style={{ color: text.length > MAX_LEN - 100 ? "#e0a05a" : "#6d6a80" }}>
                    {text.length}/{MAX_LEN}
                  </span>
                </div>
                <textarea value={message} maxLength={MAX_LEN} rows={5}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("feedback.message.placeholder")}
                  className="fb-msg w-full rounded-lg px-3 py-2 text-body-lg-5 leading-snug"
                  /* #menu-rework M9: die Sonderwerte #0f0f14 / #33333e entfallen — alle Eingabefelder
                     nehmen die ZEILENflaeche der Optionen (M8-G2) und die neutrale durchscheinende
                     Kante (MENU-38). Zwei Fundstellen weniger fuer beide Ratschen. */
                  style={{ background: ROW_BG, border: `1px solid ${ROW_EDGE}`, color: "#e8e8ea", resize: "vertical" }} />
                {/* #feedback-ton: Der Melder lebt von Details — auf der breiten Fassung ist Platz, das einmal zu sagen. */}
                <div className="as-deskonly fb-hint"><span aria-hidden="true"><ModalIcon name="info" /></span> {t("feedback.detailHint")}</div>
              </div>
              </div>

              <div className="fb-right">
              {/* Name — vorbefüllt, änderbar, optional. */}
              <div>
                <div className="fb-slabel text-meta-3 uppercase tracking-wide opacity-55 mb-1.5">{t("feedback.name")}</div>
                <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)}
                  placeholder={t("feedback.name.placeholder")}
                  className="fb-nameinput w-full rounded-lg px-3 py-2 text-body-lg-5"
                  style={{ background: ROW_BG, border: `1px solid ${ROW_EDGE}`, color: "#e8e8ea" }} />
              </div>

              {/* Honeypot: für Menschen unsichtbar, für simple Bots verlockend. */}
              <input value={honey} onChange={(e) => setHoney(e.target.value)} tabIndex={-1} autoComplete="off"
                aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }} />

              {/* Lauf-Bezug — sichtbar ausgewiesen und abwählbar.

                  #menu-rework M9 (feedback-redesign §Panel rechts / §Zustaende): eine OPTIONS-ZEILE
                  statt einer nativen Checkbox — Zeichenkachel, Titel, Beschreibung, Schalter. Der
                  Schalter ist `Toggle` aus `optionsBits.jsx`, also DERSELBE, den die Optionen tragen,
                  nicht ein zweiter im selben Schnitt.

                  „KEIN LAUF" IST EIN ZUSTAND, KEIN SONDERFALL. Vorher war die Checkbox `disabled` und
                  die Zeile sah aus wie jede andere — man las erst am Text, dass hier nichts geht. Jetzt
                  ist es exakt der Sperr-Zustand des Optionen-Kanons: Zeile auf 42 %, Kachel stumm,
                  Schalter gesperrt. Und gesperrt heisst auch per TASTATUR gesperrt — `Toggle` setzt
                  dafuer `disabled` am Knopf statt `pointer-events: none`, was der Grund ist, diesen
                  Schalter zu nehmen statt einen eigenen zu bauen. */}
              <div className="fb-run flex items-start gap-2.5 rounded-lg px-3 py-2.5" data-off={run ? undefined : "1"}>
                <span className="as-deskonly fb-runicon" aria-hidden="true"><ModalIcon name="cloud" /></span>
                <span className="min-w-0 flex-1">
                  <span className="fb-runtitle text-body-1 font-bold block">{runLabel}</span>
                  <span className="fb-runhint text-meta-3 opacity-60 leading-snug block">{t("feedback.run.hint")}</span>
                </span>
                <Toggle on={useRun && !!run} disabled={!run} label={t("feedback.run.hint")}
                  onClick={() => setUseRun((v) => !v)} />
              </div>

              {sentDraft && (
                <FbMessage role="ok" icon={<span aria-hidden="true" style={{ color: "#54e08a" }}>✓</span>}>
                  {t("feedback.draftSent")}
                </FbMessage>
              )}
              {state === "error" && (
                <FbMessage role="error" icon={<ModalIcon name="block" className="fb-noteicon" />}>{err}</FbMessage>
              )}
              {!reportsConfigured && (
                <FbMessage role="warn" icon={<ModalIcon name="info" className="fb-noteicon" />}>
                  {t("feedback.err.offline")}
                </FbMessage>
              )}

              <button type="button" onClick={send} disabled={!canSend}
                className="fb-send w-full rounded-lg py-2.5 text-body-lg-5 font-bold transition-all"
                /* #deckui: Primär-Senden-Button zieht im aktiven Zustand die Deckfarbe (deaktiviert bleibt neutral). */
                /* #menu-rework M9: inaktiv ist eine flache ZEILENflaeche, kein eigener Grauton — dieselbe
                   Flaeche wie jede andere Zeile des Melders (M8-G2), mit der Aus-Schrift des Kanons. */
                style={{ background: canSend ? "var(--deck-a1, #8a7de0)" : ROW_BG, color: canSend ? "#141419" : "#6c6c7e",
                         cursor: canSend ? "pointer" : "not-allowed" }}>
                {t(state === "sending" ? "feedback.sending" : "feedback.send")}<span className="as-deskonly fb-sendicon" aria-hidden="true"><ModalIcon name="send" /></span>
              </button>
              {tooShort && (
                <div className="fb-short text-meta-3 text-center opacity-55"><span className="as-deskonly fb-shorticon" aria-hidden="true"><ModalIcon name="block" /></span>{t("feedback.tooShort", { n: MIN_LEN })}</div>
              )}
              </div>
              {/* Kein GitHub-Zweitweg mehr (#397): Meldungen laufen ausschließlich über diesen Melder.
                  EIN Weg heißt EIN Posteingang — sonst liegt die Hälfte der Rückmeldungen in den Issues
                  und die andere in der Tabelle, und der Discord-Ping zeigt nur noch die halbe Wahrheit. */}
            </div>
          )}
        </div>
      </div>
    </div>
  ));
}
