import { coinsPerCycle, canAfford, SHOP_ITEM_DEFS } from "../game/shop.js";
import { SHOP_CATEGORIES, SHOP_CATEGORY_LABELS } from "../game/constants.js";
import { useEscape } from "./useEscape.js";

const GOLD = "#d4a63a"; // Shop-/Münz-Akzent (wie der Score-Gold-Ton)

// Preisstufen-Metadaten (Spec §5.5) — Label + Farbe (grau/blau/violett/gold nach Stärke).
const TIER = {
  cheap:     { label: "Günstig",  color: "#8a8a95" },
  strong:    { label: "Stark",    color: "#5a8ade" },
  premium:   { label: "Premium",  color: "#8a7de0" },
  legendary: { label: "Legendär", color: GOLD },
};

/* Shop-Screen (Shop-Spec §12.1). S1: Angebote (2 je Kategorie) werden deterministisch gezogen und hier
   gruppiert dargestellt — Münzstand prominent, Preis/Stufe/Beschreibung je Item, Kauf-Button (deaktiviert,
   wenn zu teuer, schon gekauft oder Ziel-Auswahl nötig — Target-Flow folgt in S2). Solange SHOP_ITEM_DEFS
   leer ist (vor S2), sind die Angebote leer → Kategorie-Platzhalter. „Shop verlassen" startet den Durchlauf. */
export function ShopScreen({ state = {}, onLeave, onBuy }) {
  useEscape(onLeave);
  const shop = state.shop || {};
  const coins = shop.coins ?? 0;
  const income = coinsPerCycle(state.economyStatLevel);
  const round = (state.cycle || 0) + 1;
  const offers = shop.offers || [];
  const purchased = new Set(shop.purchasedOfferIds || []);
  const byCat = Object.fromEntries(SHOP_CATEGORIES.map((c) => [c, offers.filter((o) => o.category === c)]));

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-4xl rounded-2xl p-6 max-h-[92vh] overflow-y-auto" style={{ background: "#181820", border: `1px solid ${GOLD}55` }}>
        {/* Kopf: Runde + Münzstand prominent */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest" style={{ color: GOLD }}>Runde {round}</div>
            <h2 className="text-xl font-bold mt-1">Shop</h2>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide opacity-50">Münzen</div>
            <div className="text-2xl font-bold font-pixel-dense" style={{ color: GOLD }}>🪙 {coins}</div>
            <div className="text-[11px] opacity-50">Einkommen: +{income} / Durchlauf</div>
          </div>
        </div>

        {/* Kategorien mit je zwei Angeboten */}
        <div className="grid sm:grid-cols-2 gap-4">
          {SHOP_CATEGORIES.map((cat) => (
            <div key={cat}>
              <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">{SHOP_CATEGORY_LABELS[cat]}</div>
              <div className="grid gap-2">
                {byCat[cat].length === 0 && (
                  <div className="rounded-xl p-3 text-xs opacity-40 italic" style={{ background: "#20202a", border: "1px solid #33333e" }}>
                    Angebot folgt (Phase S2)
                  </div>
                )}
                {byCat[cat].map((offer) => {
                  const def = SHOP_ITEM_DEFS[offer.itemId] || {};
                  const tier = TIER[offer.tier] || TIER.cheap;
                  const sold = purchased.has(offer.offerId);
                  const affordable = canAfford(shop, offer);
                  const needsTarget = !!def.targetMode; // Target-Flow ab S2
                  const disabled = sold || !affordable || needsTarget;
                  return (
                    <div key={offer.offerId} className="rounded-xl p-3"
                      style={{ background: "#20202a", border: `1px solid ${offer.legendary ? GOLD + "88" : "#33333e"}`,
                               boxShadow: offer.legendary ? `0 0 10px ${GOLD}33` : undefined, opacity: sold ? 0.5 : 1 }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm">{def.name || offer.itemId}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap"
                          style={{ background: `${tier.color}22`, color: tier.color }}>{tier.label}</span>
                      </div>
                      {def.description && <p className="text-[11px] opacity-65 leading-snug mt-1">{def.description}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold" style={{ color: affordable || sold ? GOLD : "#e0605a" }}>🪙 {offer.price}</span>
                        <button
                          onClick={() => !disabled && onBuy?.(offer.offerId)}
                          disabled={disabled}
                          className="rounded-lg px-3 py-1 text-xs font-bold transition-all"
                          style={disabled
                            ? { background: "#2a2a33", color: "#6a6a75", cursor: "not-allowed" }
                            : { background: GOLD, color: "#141419" }}
                        >
                          {sold ? "Gekauft" : needsTarget ? "Ziel (S2)" : "Kaufen"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onLeave}
            className="rounded-xl px-5 py-2.5 font-bold transition-all hover:brightness-110"
            style={{ background: GOLD, color: "#141419" }}
          >
            Shop verlassen
          </button>
        </div>
      </div>
    </div>
  );
}
