import { useEffect, useRef, useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, ModalHairline, ActionBar, ActionButton } from "./modalStyle.jsx";
import { loadUsername, loadFeedbackDraft, saveFeedbackDraft, clearFeedbackDraft,
  feedbackRateCheck, noteFeedbackSent, FEEDBACK_MIN_GAP_MS } from "../game/storage.js";
import { submitReport, reportsConfigured } from "../game/reports.js";
import { lastRunContext, buildContext } from "./feedbackContext.js";
import { t } from "../i18n/index.js";

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
        if (alive) { setMessage(""); setSentDraft(true); }
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

  const chipCls = "px-3 py-1.5 rounded-full text-xs font-bold transition-all";
  const runLabel = run && run.seed != null
    ? t("feedback.run.with", { seed: run.seed, cycle: run.cycle ?? "?" })
    : t("feedback.run.none");

  return overlayPortal((
    <div onClick={onClose} className="fb-root fixed inset-0 overlay-root z-40 flex items-center justify-center p-4"
      style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      {/* #deckui: äußere Karte zieht den deck-getönten Rahmen-Verlauf (as-panel-deck). */}
      <div onClick={(e) => e.stopPropagation()} className="fb-card w-full max-w-lg rounded-2xl max-h-[90dvh] overflow-y-auto overlay-card as-panel as-panel-deck" style={MODAL_CARD}>
        <ModalHairline />
        <div className="fb-body p-6">
          <ActionBar pad={6} className="fb-bar">
            <span className="flex-1" />
            <ActionButton kind="secondary" onClick={onClose}><span className="as-deskonly fb-closeicon" aria-hidden="true">✕</span>{t("common.close")}</ActionButton>
          </ActionBar>

          {/* #desktop: Auskunftszeile neben dem Titel (Spalte 2 des Kopf-Rasters, wie im Upgrade-Baum).
              Sie sagt, wohin die Meldung geht und was automatisch mitgeht — auf dem Handy fehlt dafür
              schlicht die Zeile, dort steht es am Lauf-Bezug weiter unten. */}
          <div className="fb-readout hidden dt:block">{t("feedback.desk.readout")}</div>

          <div className="fb-head text-center mb-4">
            {/* #deckui: Eyebrow deck-getönt. */}
            <div className="text-xs uppercase tracking-widest" style={{ color: "var(--deck-a1, #8a7de0)" }}>{t("feedback.eyebrow")}</div>
            <h2 className="text-xl font-bold mt-1">{t("feedback.title")}</h2>
          </div>

          {state === "done" ? (
            /* Dieselbe Hinweisbox wie „Entwurf nachgesendet"/Fehler/Offline weiter unten — gleiche
               Maße, gleiches Grün. Vorher stand hier ein Kasten mit doppelter Polsterung und
               Riesen-Haken; auf dem Handy füllte er fast das ganze Fenster, obwohl er nur vier
               Wörter trägt. Ein Erfolg braucht keinen mehr Platz als ein Fehler. role="status",
               damit Screenreader die Bestätigung ansagen — der Dialog schließt gleich von selbst. */
            <div role="status"
              className="rounded-lg px-3 py-2 text-[12px] leading-snug font-semibold flex items-center justify-center gap-2"
              style={{ background: "#123a25", border: "1px solid #2f7a4f", color: "#9fe0b8" }}>
              <span aria-hidden="true" style={{ color: "#54e08a" }}>✓</span>
              {t("feedback.thanks")}
            </div>
          ) : (
            <div className="fb-form grid gap-3">
              {/* #desktop — zwei Klammern für die beiden Spalten (links Art + Text, rechts Name, Lauf-Bezug
                  und Absenden). Unter 1280 px sind beide `display: contents`; das Handy-Raster ordnet dann
                  weiterhin alle Bausteine direkt, Reihenfolge und Abstände unverändert. */}
              <div className="fb-left">
              {/* Art — vorausgewählt „Bug", aber die Idee steht gleichberechtigt daneben. */}
              <div>
                <div className="fb-slabel text-[11px] uppercase tracking-wide opacity-55 mb-1.5">{t("feedback.kind")}</div>
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
                  <span className="fb-slabel text-[11px] uppercase tracking-wide opacity-55">{t("feedback.message")}</span>
                  <span className="fb-count text-[10px] tabular-nums" style={{ color: text.length > MAX_LEN - 100 ? "#e0a05a" : "#6d6a80" }}>
                    {text.length}/{MAX_LEN}
                  </span>
                </div>
                <textarea value={message} maxLength={MAX_LEN} rows={5}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("feedback.message.placeholder")}
                  className="fb-msg w-full rounded-lg px-3 py-2 text-sm leading-snug"
                  style={{ background: "#0f0f14", border: "1px solid #33333e", color: "#e8e8ea", resize: "vertical" }} />
                {/* #feedback-ton: Der Melder lebt von Details — auf der breiten Fassung ist Platz, das einmal zu sagen. */}
                <div className="as-deskonly fb-hint"><span aria-hidden="true">ⓘ</span> {t("feedback.detailHint")}</div>
              </div>
              </div>

              <div className="fb-right">
              {/* Name — vorbefüllt, änderbar, optional. */}
              <div>
                <div className="fb-slabel text-[11px] uppercase tracking-wide opacity-55 mb-1.5">{t("feedback.name")}</div>
                <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)}
                  placeholder={t("feedback.name.placeholder")}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: "#0f0f14", border: "1px solid #33333e", color: "#e8e8ea" }} />
              </div>

              {/* Honeypot: für Menschen unsichtbar, für simple Bots verlockend. */}
              <input value={honey} onChange={(e) => setHoney(e.target.value)} tabIndex={-1} autoComplete="off"
                aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }} />

              {/* Lauf-Bezug — sichtbar ausgewiesen und abwählbar. */}
              <label className="fb-run flex items-start gap-2.5 rounded-lg px-3 py-2.5 cursor-pointer" style={{ background: "#20202a" }}>
                <input type="checkbox" checked={useRun && !!run} disabled={!run}
                  onChange={(e) => setUseRun(e.target.checked)}
                  /* #deckui: generischer Akzent der Checkbox → Deckfarbe. */
                  style={{ marginTop: 2, accentColor: "var(--deck-a1, #8a7de0)" }} />
                <span className="as-deskonly fb-runicon" aria-hidden="true">☁</span>
                <span className="min-w-0">
                  <span className="fb-runtitle text-[12px] font-bold block">{runLabel}</span>
                  <span className="fb-runhint text-[11px] opacity-60 leading-snug block">{t("feedback.run.hint")}</span>
                </span>
              </label>

              {sentDraft && (
                <div className="rounded-lg px-3 py-2 text-[12px] leading-snug" style={{ background: "#123a25", border: "1px solid #2f7a4f", color: "#9fe0b8" }}>
                  {t("feedback.draftSent")}
                </div>
              )}
              {state === "error" && (
                <div className="rounded-lg px-3 py-2 text-[12px] leading-snug" style={{ background: "#3a1518", border: "1px solid #d1462f66", color: "#f0a898" }}>
                  {err}
                </div>
              )}
              {!reportsConfigured && (
                <div className="rounded-lg px-3 py-2 text-[12px] leading-snug" style={{ background: "#3a2a15", border: "1px solid #d0902f", color: "#f0d9a8" }}>
                  {t("feedback.err.offline")}
                </div>
              )}

              <button type="button" onClick={send} disabled={!canSend}
                className="fb-send w-full rounded-lg py-2.5 text-sm font-bold transition-all"
                /* #deckui: Primär-Senden-Button zieht im aktiven Zustand die Deckfarbe (deaktiviert bleibt neutral). */
                style={{ background: canSend ? "var(--deck-a1, #8a7de0)" : "#2a2733", color: canSend ? "#141419" : "#6d6a80",
                         cursor: canSend ? "pointer" : "not-allowed" }}>
                {t(state === "sending" ? "feedback.sending" : "feedback.send")}<span className="as-deskonly fb-sendicon" aria-hidden="true">➤</span>
              </button>
              {tooShort && (
                <div className="fb-short text-[11px] text-center opacity-55"><span className="as-deskonly fb-shorticon" aria-hidden="true">⊘</span>{t("feedback.tooShort", { n: MIN_LEN })}</div>
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
