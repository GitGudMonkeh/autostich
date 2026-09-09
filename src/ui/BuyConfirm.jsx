/* Die Rückfrage vor Aufwerten und Verkaufen (docs/muenz-oekonomie.md, Owner 2026-09-09).

   NACH BILDSCHIRM, nicht nach Preis. Aufwerten und Verkaufen fragen IMMER, unabhängig vom Betrag; alle
   übrigen Käufe nie. Zwei Gründe, und der zweite ist der wichtigere:

   · In einer LISTE dicht stehender Einträge vertippt man sich, an einem einzelnen Knopf nicht. Energie
     und Baufeld haben je einen Knopf mit Platz um sich herum — dort ist eine Rückfrage nur ein
     zweiter Tap. Die Aufwert- und Verkaufslisten stehen Zeile an Zeile, und ein Fehlgriff kostet dort
     nicht nur Münzen, sondern beim Verkauf einen Perk.
   · Eine PREISSCHWELLE wäre nicht erklärbar: bei 15 gefragt, bei 14 still — das liest sich wie ein
     Fehler. Eine Regel je Bildschirm lernt man einmal.

   Gebaut wie die Lauf-Dialoge (RunConfirm.jsx): dieselbe Karte, dieselbe Aktionsleiste, z-40 über den
   Aufwert-Panels (z-30). Der Überzug schließt bei Klick daneben — Abbrechen ist der billige Weg. */

import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { MODAL_CARD, ModalHairline, ActionBar, ActionButton, STICKY_HEAD_BG } from "./modalStyle.jsx";
import { CoinAmount } from "./CoinMark.jsx";
import { t } from "../i18n/index.js"; // #sprache

/* `tone` trennt die zwei Fälle: Aufwerten kostet (Gold, wie jeder Preis), Verkaufen bringt ein (Grün,
   wie jede Gutschrift). Der Betrag steht groß in der Mitte — er ist die eine Zahl, wegen der gefragt wird. */
export function BuyConfirm({ title, name, sub = null, amount = 0, have = null, tone = "buy", onConfirm, onCancel }) {
  const gain = tone === "sell";
  return overlayPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "var(--sf-scrim)", backdropFilter: "blur(3px)" }} onClick={onCancel}>
      <div className="w-full max-w-xs rounded-2xl overflow-hidden as-panel as-panel-deck"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        <ModalHairline />
        <div className="p-5">
          <div className="text-body-lg-6 font-bold">{title}</div>
          <div className="text-body-lg-5 mt-1.5 font-bold" style={{ color: "#e8e8ea" }}>{name}</div>
          {sub && <div className="text-body-5 opacity-65 mt-0.5">{sub}</div>}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-meta-1 uppercase tracking-wide opacity-55">{t(gain ? "sell.youGet" : "sell.youPay")}</span>
            <CoinAmount n={amount} size={15} have={gain ? null : have} style={{ fontSize: 17, color: gain ? "#5ab87a" : undefined }} />
          </div>
          <ActionBar pad={5} bg={STICKY_HEAD_BG} className="mt-4">
            <ActionButton kind="secondary" flex onClick={onCancel}>{t("common.cancel")}</ActionButton>
            <ActionButton kind={gain ? "danger" : "primary"} flex onClick={onConfirm}>{t("common.confirm")}</ActionButton>
          </ActionBar>
        </div>
      </div>
    </div>
  );
}
