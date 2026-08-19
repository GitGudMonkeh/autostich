import { useEffect } from "react";
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { MODAL_CARD, ModalHairline, ActionBar, ActionButton, STICKY_HEAD_BG } from "./modalStyle.jsx";
import { useIsWide } from "./useIsWide.js";
import { t } from "../i18n/index.js"; // #sprache

/* ============================================================
   #run-dialoge — die zwei Rückfragen des laufenden Spiels (Beenden · Neustarten) als Desktop-Fassung.

   Beide waren auf jeder Breite `max-w-xs` (320 px) und stellten die Frage in der Reihenfolge
   „Titel → Knöpfe → Erklärung, was die Knöpfe tun". Am Handy ist genau das richtig: #362 hat die
   Aktionsleiste bewusst nach OBEN gezogen, damit man zum Bestätigen nicht erst scrollen muss. Auf dem
   Desktop gibt es kein Scrollen — dieselbe Reihenfolge kostet dort nur eins: man entscheidet, bevor man
   gelesen hat.

   Ab 1400 px deshalb zwei verschiedene Antworten, weil die zwei Dialoge verschiedene Probleme haben:

   · BEENDEN hat drei Wege, und zwei davon heißen fast gleich („Beenden" / „Beenden & speichern").
     Ein Fließtext darunter erklärt den Unterschied — man muss ihn nur lesen. Die Optionen tragen ihre
     Folge deshalb SELBST (eine Zeile je Weg, Kanten-Karte wie bei Perks/Skills/Packs). Der gemeinsame
     Hilfetext entfällt dort, er wäre eine vierte Erklärung derselben Sache.
   · NEUSTARTEN hat zwei Wege und nichts zu verwechseln. Dort reicht Breite, Reihenfolge und die
     Warnung, dass es endgültig ist.

   Unterhalb 1400 px bleibt beides Knoten für Knoten wie vorher — die Handy-Fassung ist gegen ein
   390-px-Gerät abgestimmt.

   Der Überzug behält seinen Blur, anders als die großen Screens (#perf-blur): diese Dialoge sind klein,
   stehen still und leben Sekunden. Was #perf-blur gemessen hat, war ein vollflächiger Filter unter einem
   Screen, über den dauernd neu gemalt wird — das ist hier nicht der Fall.
   ============================================================ */

// Kürzel im Knopf, sonst weiß sie niemand. Nur auf dem Desktop — am Handy gibt es keine Tastatur.
function Kbd({ children }) {
  return <span className="ml-auto text-[10px] leading-tight px-1.5 py-[1px] rounded border opacity-55"
    style={{ fontFamily: "var(--font-mono, ui-monospace)", borderColor: "currentColor" }}>{children}</span>;
}

/* Eine Wahl als Zeile: Name + Folge. `c` ist die Kantenfarbe (Gold = primär, Rot = gefährlich,
   Grau = Ausstieg) — dieselbe Leiter, die `.as-edge-card` überall im Spiel benutzt. */
function OptionRow({ c, name, sub, kbd, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="as-edge-card w-full text-left rounded-xl px-3.5 py-3 flex items-center gap-3 transition-all hover:brightness-110"
      style={{ "--c": c }}>
      <span className="min-w-0">
        <span className="block text-[14.5px] font-bold" style={{ color: c }}>{name}</span>
        <span className="block text-[12.5px] leading-snug opacity-65 mt-0.5">{sub}</span>
      </span>
      {kbd && <Kbd>{kbd}</Kbd>}
    </button>
  );
}

const GOLD = "#d4a63a", RED = "#e0605a", GREY = "#8a8a95";

/* Enter löst die primäre Wahl aus (Desktop). Escape schließt bereits über den Aufrufer/`useEscape`-Pfad;
   hier wird nur die Bestätigung ergänzt, damit die zwei Kürzel im Knopf nicht lügen. */
function useEnter(on, enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    const h = (e) => { if (e.key === "Enter") { e.preventDefault(); on(); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [on, enabled]);
}

export function AbortConfirm({ onKeepPlaying, onSave, onEnd }) {
  const wide = useIsWide();
  useEnter(onSave, wide);
  return overlayPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }} onClick={onKeepPlaying}>
      <div className={`w-full ${wide ? "rc-wide" : "max-w-xs"} rounded-2xl overflow-hidden as-panel as-panel-deck`}
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        <ModalHairline />
        <div className={wide ? "p-6" : "p-5"}>
          <div className={wide ? "text-lg font-bold" : "text-base font-bold"}>{t("app.abort.title")}</div>

          {wide ? (
            /* Jede Option sagt ihre Folge — die Verwechslung ist damit strukturell weg, nicht nur erklärt. */
            <div className="grid gap-2.5 mt-4">
              <OptionRow c={GOLD} name={t("app.abort.save")} sub={t("app.abort.save.sub")} kbd="↵" onClick={onSave} />
              <OptionRow c={RED} name={t("app.end")} sub={t("app.abort.end.sub")} onClick={onEnd} />
              <OptionRow c={GREY} name={t("app.keepPlaying")} sub={t("app.keepPlaying.sub")} kbd="Esc" onClick={onKeepPlaying} />
            </div>
          ) : (
            <>
              {/* #362 Aktionsleiste OBEN: primär (Beenden & speichern) obenauf, darunter Weiterspielen/Beenden. */}
              <ActionBar pad={5} bg={STICKY_HEAD_BG} className="mt-3">
                <div className="flex flex-col gap-2 w-full">
                  <ActionButton kind="primary" onClick={onSave}>{t("app.abort.save")}</ActionButton>
                  <div className="flex gap-2">
                    <ActionButton kind="secondary" flex onClick={onKeepPlaying}>{t("app.keepPlaying")}</ActionButton>
                    <ActionButton kind="danger" flex onClick={onEnd}>{t("app.end")}</ActionButton>
                  </div>
                </div>
              </ActionBar>
              <div className="text-sm opacity-70">{t("app.abort.help")}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function RestartConfirm({ onKeepPlaying, onRestart }) {
  const wide = useIsWide();
  return overlayPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }} onClick={onKeepPlaying}>
      <div className={`w-full ${wide ? "rc-narrow" : "max-w-xs"} rounded-2xl overflow-hidden as-panel as-panel-deck`}
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        <ModalHairline />
        <div className={wide ? "p-6" : "p-5"}>
          <div className={wide ? "text-lg font-bold" : "text-base font-bold"}>{t("app.restart.title")}</div>
          {/* Auf dem Desktop steht die Warnung VOR den Knöpfen — es gibt kein Scrollen, also keinen Grund,
              die Bestätigung nach oben zu ziehen. */}
          {wide && <div className="text-sm opacity-70 mt-2.5">{t("app.restart.help")}</div>}
          {/* #362 Aktionsleiste OBEN: Weiterspielen (sekundär) links, Neustarten (rot) rechts. */}
          <ActionBar pad={wide ? 6 : 5} bg={STICKY_HEAD_BG} className={wide ? "mt-5" : "mt-3"}>
            <ActionButton kind="secondary" flex onClick={onKeepPlaying}>{t("app.keepPlaying")}</ActionButton>
            <ActionButton kind="danger" flex onClick={onRestart}>{t("app.restart")}</ActionButton>
          </ActionBar>
          {!wide && <div className="text-sm opacity-70">{t("app.restart.help")}</div>}
        </div>
      </div>
    </div>
  );
}
