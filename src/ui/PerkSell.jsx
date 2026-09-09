/* Perk verkaufen (docs/muenz-oekonomie.md §3.6) — TESTFEATURE. Der Zwilling von PerkUpgrade.jsx, eine
   Ebene darunter erreichbar: derselbe Bildschirm-Aufbau, dieselbe Zeilenform, nur die Richtung ist die
   andere. Aufwerten kostet Gold, Verkaufen bringt Grün ein.

   ZWEI Dinge, die dieser Bildschirm anders macht als der Aufwert-Zwilling, beide aus der Sache heraus:

   1. Er zeigt auch FLACHE Perks. Aufwerten geht nur mit Familien (nur die tragen Stufen); verkaufen kann
      man alles, was man hält — Legendäre zum Festpreis, weil sie keine Stufe haben und nach der Formel
      wertlos wären.
   2. Er zeigt GESPERRTE Zeilen mit ihrem Grund, statt sie wegzulassen. Bauhütte und Meisterhand haben
      eine Grenze gehoben; steht darunter mehr, als ohne sie hineinpasst, müsste der Verkauf etwas
      mitreißen, das nicht zum Verkauf stand. Ein Perk, der ohne Erklärung fehlt, liest sich als Fehler —
      also steht er da und sagt, was im Weg ist.

   Die Rückfrage (BuyConfirm) ist Pflicht und hängt nicht am Betrag: in einer Liste dicht stehender
   Zeilen kostet ein Fehlgriff hier nicht nur Münzen, sondern einen Perk. */

import { useState } from "react";
import { overlayPortal } from "./overlayPortal.jsx";
import { phaseCard, PhaseHairline, PHASE_ACCENTS } from "./modalStyle.jsx";
import { CoinAmount, COIN_GAIN } from "./CoinMark.jsx";
import { BuyConfirm } from "./BuyConfirm.jsx";
import { GlossaryText } from "./Glossary.jsx";
import { tierMeta, romanOf } from "../game/rarity.js";
import { sellables, BLOCK_COVER } from "../game/perkSale.js";
import { familyDef, perkDef, perkCat, rarityLabel } from "../i18n/labels.js";
import { t } from "../i18n/index.js";

const LEG_GOLD = "#d4a63a";   // dasselbe Gold wie überall für „legendär" — keine neue Farbe

/* Name, Beschreibung und Marke einer Zeile — die eine Stelle, an der Familie und flacher Perk
   auseinandergehen. Danach sind beide dieselbe Zeile. */
function entryInfo(entry) {
  if (entry.kind === "family") {
    const fam = familyDef(entry.id);
    if (!fam) return null;
    const tm = tierMeta(entry.tier) || { color: "#8a8a95" };
    return { name: fam.name, desc: (fam.tiers[entry.tier] || {}).desc || "",
             cat: perkCat(fam.cat), mark: `${romanOf(entry.tier)} · ${rarityLabel(entry.tier)}`, color: tm.color };
  }
  const def = perkDef(entry.id);
  if (!def) return null;
  return { name: def.label, desc: def.desc || "", cat: perkCat(def.cat),
           mark: t("sell.legendary"), color: LEG_GOLD };
}

function SellRow({ entry, onSell }) {
  const info = entryInfo(entry);
  if (!info) return null;
  const blocked = !!entry.blocked;
  return (
    <button type="button" disabled={blocked} onClick={blocked ? undefined : () => onSell(entry)}
      className="ps-row as-edge-card text-left rounded-xl p-3 flex flex-col gap-2 transition-all disabled:cursor-not-allowed"
      /* Zwei Zustände statt der drei drüben: verkäuflich (voll) und gesperrt (blass). Ein „zu teuer" gibt
         es hier nicht — man bekommt Münzen, man gibt keine aus. */
      style={{ "--c": blocked ? "#3a3850" : info.color, opacity: blocked ? 0.45 : 1 }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-body-lg-5">{info.name}</span>
        {info.cat && <span className="text-meta-1 px-1.5 py-0.5 rounded"
          style={{ background: `${info.cat.color}22`, color: info.cat.color }}>{info.cat.name}</span>}
        <span className="ml-auto">
          {/* Grüner RAHMEN, goldene Münze (Owner 2026-09-09): die Richtung trägt die Umrandung, der
              Betrag bleibt die Währungsfarbe. */}
          <span className="inline-flex items-center rounded-lg px-2.5 py-1"
            style={{ background: "linear-gradient(180deg,#16241a,#121a14)", border: `1px solid ${COIN_GAIN}66` }}>
            <CoinAmount n={entry.price} size={11} dim={blocked} />
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-meta-1 px-1.5 py-0.5 rounded font-bold tracking-wide"
          style={{ color: info.color, background: `${info.color}1f`, border: `1px solid ${info.color}55` }}>{info.mark}</span>
      </div>
      {/* Gesperrt: der Grund steht an der Zeile. Sonst die Wirkung, die man abgibt — man soll wissen,
          was mit dem Perk geht, und nicht nur, was er einbringt. */}
      {blocked
        ? <div className="text-body-5 leading-snug" style={{ color: "#e0a05a" }}>
            {t(entry.blocked === BLOCK_COVER ? "sell.blocked.cover" : "sell.blocked.slots")}
          </div>
        : info.desc && <div className="text-body-5 leading-snug" style={{ color: "#a6a6b0" }}><GlossaryText text={info.desc} /></div>}
    </button>
  );
}

export function PerkSell({ state = {}, onSell, onClose }) {
  const [ask, setAsk] = useState(null);   // die Zeile, für die gerade gefragt wird
  const list = sellables(state);
  const askInfo = ask ? entryInfo(ask) : null;
  const commit = () => { onSell?.(ask.kind, ask.id); setAsk(null); };
  return overlayPortal((
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-4"
      style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div className="relative w-full max-w-md rounded-2xl p-5 max-h-[92dvh] overflow-y-auto overlay-card"
        style={phaseCard(PHASE_ACCENTS.violet)}>
        <PhaseHairline />
        <div className="text-center mb-3">
          <div className="text-body-5 uppercase tracking-widest" style={{ color: "#8a7de0" }}>{t("sell.eyebrow")}</div>
          <h2 className="text-title-6 font-bold mt-1">{t("sell.title")}</h2>
          <p className="text-body-5 opacity-60 mt-1">{t("sell.hint")}</p>
        </div>
        {list.length === 0
          ? <div className="text-body-5 opacity-60 text-center py-6">{t("sell.empty")}</div>
          : <div className="grid gap-2">
              {list.map((e) => <SellRow key={`${e.kind}:${e.id}`} entry={e} onSell={setAsk} />)}
            </div>}
        <button onClick={onClose} className="as-edge-neutral w-full mt-4 rounded-lg py-2 text-body-lg-5 font-bold">
          {t("sell.back")}
        </button>
      </div>
      {ask && askInfo && (
        <BuyConfirm title={t("sell.confirm.title")} name={askInfo.name} sub={t("sell.confirm.sub")}
          amount={ask.price} tone="sell" onConfirm={commit} onCancel={() => setAsk(null)} />
      )}
    </div>
  ));
}
