import { useEffect, useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, ModalHairline, ActionButton, STICKY_HEAD_BG } from "./modalStyle.jsx";
import { DISCORD_URL } from "./links.js";
import { installId, telemetryConfigured, UA_MAX } from "../game/telemetry.js";
import { useT } from "../i18n/useLocale.js";

/* DATENSCHUTZ-HINWEIS (#datenschutz) — was das Spiel sendet, an wen, und wie man es abstellt.

   WARUM ES IHN GIBT: Autostich schickt zwei Dinge an einen Server — die anonyme Lauf-Telemetrie
   (Default AN) und, beim Veröffentlichen eines Laufs, den selbst gewählten Nickname samt Lauf-Daten.
   Der Options-Schalter beschrieb bis hierher nur das erste, und auch das unvollständig: der
   Gerätekontext (Browserkennung, Kerne, Speicher, Fenstergröße) stand nirgends. Ein Hinweis, der
   weniger aufzählt als der Code sendet, ist der eigentliche Fehler — nicht die Datenmenge.

   WO ER ERREICHBAR IST — bewusst DREI Einstiege, ein Text:
     1. Optionen → direkt in der Telemetrie-Zeile. Der Punkt, an dem entschieden wird.
     2. Startbildschirm → Chip neben Feedback/Discord. Der Punkt, an dem man ihn SUCHT.
     3. Namens-Dialog beim Erststart → dort wird der Nickname gesetzt, und genau der geht später
        ins globale Board. Wer den Namen wählt, soll wissen, dass er öffentlich wird.

   INSTALL-KENNUNG: unten steht die eigene ID im Klartext und lässt sich kopieren. Das ist kein
   Beiwerk — sie ist die EINZIGE Handhabe, mit der sich die eigenen Telemetrie-Zeilen später finden
   und löschen lassen. Ohne sie wäre „Bitte lösch meine Daten" eine Bitte, die niemand erfüllen kann.

   Der Text selbst liegt vollständig in de.js/en.js (Abschnitte über SECTIONS). Zahlen, die der Code
   bestimmt, werden interpoliert (UA_MAX) statt abgetippt. */

// Reihenfolge der Abschnitte: erst WAS rausgeht (die beiden Sender), dann was bleibt, dann WER und WIE.
const SECTIONS = ["telemetry", "board", "local", "host", "contact"];

/* #datenschutz-kante: Die Kante der Abschnitte trägt eine AUSSAGE, keine Dekoration — die beiden SENDER
   (Telemetrie, Bestenliste) stehen in der Deckfarbe, alles andere ist Kontext (was bleibt, wo es landet, wer
   dahintersteht) und bleibt neutral. Wer hier einen Abschnitt ergänzt, entscheidet also zuerst: verlässt das
   Beschriebene das Gerät oder nicht? */
const SENDERS = new Set(["telemetry", "board"]);

/* #deckui: Der Hinweis war als einziges Overlay auf ein festes Violett verdrahtet, während Kopf, Rahmen und
   Knöpfe überall sonst die aktive DECKFARBE ziehen. `--deck-a1` spiegelt App.jsx zusätzlich auf `:root` — der
   Wert greift also auch hier im Body-Portal. Fallback = Genesis-Cyan, wie in den `as-cta-*`-Klassen. */
const ACC = "var(--deck-a1, #26c6e6)";
const NEUTRAL = "#6d6b7a";   // Kontext-Abschnitte: dieselbe gedämpfte Kante wie `as-edge-neutral`
// Überschrift eines Abschnitts: aufgehellte Kantenfarbe, damit sie zur Kante gehört, ohne sie zu überschreien.
const secTitleColor = (c) => `color-mix(in srgb, ${c} 45%, #ffffff)`;

export function PrivacyModal({ onClose }) {
  useEscape(onClose);
  const t = useT();
  const [id, setId] = useState("");
  const [copied, setCopied] = useState(false);

  // Die Kennung erst beim Öffnen holen — localStorage-Zugriff gehört nicht in den Render. Sie wird
  // dabei ggf. ERZEUGT (installId würfelt beim ersten Aufruf); das ist unkritisch, weil sie das Gerät
  // nur verlässt, wenn die Telemetrie auch tatsächlich sendet.
  useEffect(() => { if (telemetryConfigured) setId(installId()); }, []);

  // Bestätigung nach dem Kopieren wieder einfangen, damit „Kopiert" nicht dauerhaft stehen bleibt.
  useEffect(() => {
    if (!copied) return undefined;
    const h = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(h);
  }, [copied]);

  const copyId = () => {
    if (!id) return;
    try { navigator.clipboard?.writeText(id); setCopied(true); } catch (e) { /* Zwischenablage ist Kür */ }
  };

  // z-50: liegt bewusst ÜBER Optionen (z-30) und Namens-Dialog (z-40) — der Hinweis wird aus beiden
  // heraus geöffnet und muss darüber landen, nicht dahinter verschwinden.
  return overlayPortal((
    <div onClick={onClose} className="fixed inset-0 overlay-root z-50 flex items-center justify-center p-4"
      style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      {/* #datenschutz-desktop: ab 1280 px 860 px breit statt 512 — der Hinweis bleibt ein FENSTER (er wird
          geprüft und geschlossen, er ist keine Station wie Leitfaden/Glossar), aber die fünf Abschnitte stehen
          dort in zwei Spalten statt als Schlange, die auf 1080 px Höhe scrollt, während links und rechts alles
          leer ist. Darunter ändert sich nichts. #deckui: `as-panel-deck` = deck-getönter Rahmen wie in den
          übrigen Overlays (Optionen/Werkstatt), nicht mehr der neutrale. */}
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg dt:max-w-[860px] rounded-2xl max-h-[90dvh] overflow-hidden overlay-card as-panel as-panel-deck flex flex-col"
        style={MODAL_CARD}>
        <ModalHairline />

        {/* Fixer Kopf wie in den Optionen: bei einem langen Fließtext muss „Schließen" erreichbar
            bleiben, ohne erst ans Ende zu scrollen. `items-start` + `shrink-0` (NICHT ActionBar mit
            items-stretch), sonst dehnt sich der Knopf auf die Höhe des zweizeiligen Titelblocks. */}
        <div className="flex-none px-6 pt-5 pb-3" style={{ background: STICKY_HEAD_BG, borderBottom: "1px solid #2a2a34" }}>
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <div className="text-body-5 uppercase tracking-widest" style={{ color: ACC }}>{t("privacy.eyebrow")}</div>
              <h2 className="text-title-6 font-bold mt-1">{t("privacy.title")}</h2>
            </div>
            <ActionButton kind="secondary" className="ml-auto shrink-0" onClick={onClose}>{t("common.close")}</ActionButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6" style={{ overscrollBehavior: "contain" }}>
          <p className="text-body-lg-5 leading-relaxed opacity-80">{t("privacy.intro")}</p>

          {/* #kante: die Abschnitte waren gefüllte Kästen (#20202a) — die Fassung von vor „Kante statt Fläche"
              und ohne jede Rangordnung: „Was bleibt auf dem Gerät" sah aus wie „Was wird gesendet". Jetzt
              Kantenkarten, und die Kante sagt, worum es hier geht (s. SENDERS oben). */}
          {/* `grid-cols-1` ist PFLICHT, nicht Kosmetik: `grid` allein sizet die implizite Spalte auf MAX-CONTENT.
              Die breiteste Zelle ist der Install-ID-Kasten (UUID mit `white-space: nowrap` aus `truncate`, dazu der
              Kopier-Knopf) — gemessen 364,8 px Spur in einem 356 px breiten Scroller, alle sechs Abschnitte erben
              die Breite und der Hinweis scrollt seitwärts. `truncate` hilft dagegen NICHT, es kappt die DARSTELLUNG,
              nicht den max-content-Beitrag. Dieselbe Naht wie in der Bestenlisten-Zeile (#global). */}
          <div className="grid grid-cols-1 gap-2.5 mt-4 dt:grid-cols-2 dt:items-start">
            {SECTIONS.map((sec) => {
              const c = SENDERS.has(sec) ? ACC : NEUTRAL;
              return (
                <section key={sec} className="as-edge-card as-edge-thin rounded-lg p-3" style={{ "--c": c }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span aria-hidden="true" className="h-0.5 w-3.5 rounded-full shrink-0"
                      style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
                    <h3 className="font-bold text-body-lg-5" style={{ color: secTitleColor(c) }}>{t(`privacy.sec.${sec}.title`)}</h3>
                  </div>
                  <p className="text-body-lg-5 opacity-70 leading-snug">
                    {t(`privacy.sec.${sec}.body`, { ua: UA_MAX })}
                  </p>
                </section>
              );
            })}

            {/* Install-Kennung — nur zeigen, wenn überhaupt gesendet werden kann. Ohne Supabase-Config
                (lokaler Build ohne .env) gibt es keine Zeilen, die man löschen lassen könnte.
                Sie steht IN der Abschnitts-Spalte, aber über beide Spalten: sie ist Werkzeug, kein Abschnitt. */}
            {telemetryConfigured && id && (
              <div className="rounded-lg p-3 dt:col-span-2" style={{ background: "#0f0f14", border: "1px solid #33333e" }}>
                <div className="text-meta-1 uppercase tracking-widest opacity-45 mb-1.5">{t("privacy.installId.label")}</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 truncate text-body-1 font-mono select-text" style={{ color: "#a8ecf7" }}>{id}</code>
                  <ActionButton kind="secondary" onClick={copyId}>
                    {t(copied ? "privacy.installId.copied" : "privacy.installId.copy")}
                  </ActionButton>
                </div>
                <div className="text-meta-3 opacity-55 leading-snug mt-2">{t("privacy.installId.hint")}</div>
              </div>
            )}
          </div>

          {/* #kante: Der Kontaktweg ist hier das Angebot — Kante in der Deckfarbe. Ab 1280 px steht der Stand
              daneben statt darunter: zwei kurze Zeilen untereinander lassen den Fuß länger wirken als er ist. */}
          <div className="mt-3 flex flex-col dt:flex-row dt:items-center gap-2 dt:gap-3">
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
              className="as-edge as-edge-thin block flex-1 text-center text-body-lg-5 font-bold rounded-lg py-2.5 transition-all"
              style={{ "--c": ACC }}>
              {t("privacy.contact.discord")}
            </a>
            <div className="text-meta-3 opacity-40 leading-snug dt:whitespace-nowrap">{t("privacy.updated")}</div>
          </div>
        </div>
      </div>
    </div>
  ));
}
