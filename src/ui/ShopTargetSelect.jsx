import { suitColor, suitName, SUIT_ORDER, SHOP_CATEGORIES, SHOP_CATEGORY_LABELS } from "../game/constants.js";
import { SEGMENT_SIZE } from "../game/formations.js";
import { SHOP_ITEM_DEFS } from "../game/shop.js";
import { SHOP_FAMILY_DEFS } from "../game/shopFamilies.js";
import { allianceGroups } from "../game/families.js";
import { romanOf } from "../game/rarity.js";
import { CardGrid } from "./CardGrid.jsx";
import { formationBorder } from "./formationStyle.js";
import { useEscape } from "./useEscape.js";

const GOLD = "#d4a63a";

/* Shop-Ziel-Auswahl (Shop-Spec §12.2) — öffnet nach dem Kauf eines Ziel-Items (Kartenitems S2).
   Karten wählen (Limit aus dem Item), optional je Karte eine neue Farbe, oder ein Segment (K-L1).
   Abbrechen lässt Angebot & Münzen unverändert; Bestätigen zieht erst dann den Preis ab (Reducer). */
export function ShopTargetSelect({ state, onCard, onColor, onSegment, onPosition, onCategory, onOffer, onConfirm, onCancel }) {
  useEscape(onCancel);
  const st = state.shopTarget || {};
  // Shop-Familie (#164): Name/Beschreibung/Ziel-Bedarf aus der Zielstufe; sonst flaches Item.
  const fam = st.familyId ? SHOP_FAMILY_DEFS[st.familyId] : null;
  const tierDef = fam ? (fam.tiers[st.famTier] || {}) : null;
  const def = fam ? { name: `${fam.name} ${romanOf(st.famTier)}`, description: tierDef.desc } : (SHOP_ITEM_DEFS[st.itemId] || {});
  const spec = fam ? (tierDef.pickTarget || {}) : (def.target || {});
  const offerName = (o) => o.family ? `${SHOP_FAMILY_DEFS[o.familyId]?.name || o.familyId} ${romanOf(o.famTier)}` : (SHOP_ITEM_DEFS[o.itemId]?.name || o.itemId);
  const deck = state.deck || [];
  const order = state.playerOrder || [];
  const cards = order.map((di) => deck[di]);
  const nSeg = Math.ceil(cards.length / SEGMENT_SIZE);
  const sel = st.cards || [];
  const colors = st.colors || {};
  const cardById = (id) => deck.find((c) => c.id === id);

  // Belegte Anker-Positionen; beim Anker-Upgrade ist die EIGENE (zu ersetzende) Position wählbar (#164).
  const occupied = new Set((state.shop?.anchors || []).filter((a) => a.type !== fam?.anchorType).map((a) => a.position));
  const cardsDone = !spec.cards || sel.length === spec.cards;
  const colorsDone = !spec.color || sel.every((id) => colors[id]);
  const segDone = !spec.segment || st.segment != null;
  const posDone = !spec.position || st.position != null;
  const catDone = !spec.category || st.category != null;
  const offerDone = !spec.offer || st.targetOfferId != null;
  const ready = spec.category ? catDone : spec.offer ? offerDone : spec.position ? posDone : spec.segment ? segDone : cardsDone && colorsDone;
  // Reservierung (P4): reservierbare Angebote = alle außer dem gerade gekauften P4 und bereits gekauften.
  const purchased = new Set(state.shop?.purchasedOfferIds || []);
  const reservable = (state.shop?.offers || []).filter((o) => o.offerId !== st.offerId && !purchased.has(o.offerId));

  return (
    <div className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      <div className="w-full max-w-4xl rounded-2xl p-5 max-h-[95dvh] overflow-y-auto overlay-card" style={{ background: "#15151b", border: `1px solid ${GOLD}55` }}>
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: GOLD }}>Shop · {def.name}</div>
          <h2 className="text-xl font-bold mt-1">
            {spec.category ? "Wähle eine Kategorie" : spec.offer ? "Wähle ein Item zum Reservieren" : spec.position ? "Wähle eine Position" : spec.segment ? "Wähle ein Segment" : `Wähle ${spec.cards} ${spec.cards === 1 ? "Karte" : "Karten"}${spec.color ? " + Farbe" : ""}`}
          </h2>
          <p className="text-xs opacity-60 mt-1 max-w-xl mx-auto leading-snug">{def.description}</p>
        </div>

        {spec.category ? (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Kategorie neu würfeln (nicht gekaufte Angebote werden ersetzt)</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {SHOP_CATEGORIES.map((c) => {
                const active = st.category === c;
                return (
                  <button key={c} onClick={() => onCategory(c)}
                    className="rounded-xl p-3 text-left transition-all font-bold"
                    style={{ background: active ? `${GOLD}22` : "#20202a", border: `2px solid ${active ? GOLD : "#33333e"}` }}>
                    {SHOP_CATEGORY_LABELS[c]}
                    {active && <span className="text-[11px] ml-2" style={{ color: GOLD }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : spec.offer ? (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Item fürs nächste Shop-Angebot vormerken</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {reservable.map((o) => {
                const active = st.targetOfferId === o.offerId;
                return (
                  <button key={o.offerId} onClick={() => onOffer(o.offerId)}
                    className="rounded-xl p-3 text-left transition-all"
                    style={{ background: active ? `${GOLD}22` : "#20202a", border: `2px solid ${active ? GOLD : o.legendary ? GOLD + "88" : "#33333e"}` }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm">{offerName(o)}</span>
                      <span className="text-sm font-bold" style={{ color: GOLD }}>🪙 {o.price}</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-wide opacity-50 mt-0.5">{SHOP_CATEGORY_LABELS[o.category]}{o.legendary ? " · ★" : ""}</div>
                  </button>
                );
              })}
              {reservable.length === 0 && <div className="text-xs opacity-40 italic">Kein reservierbares Item.</div>}
            </div>
          </div>
        ) : spec.position ? (
          // #112: Positions-Anker im geteilten CardGrid — mit Formations-/Rollen-Kontext; belegte Positionen ausgegraut (Silberring).
          <div className="mt-4">
            <CardGrid cards={cards} formations={state.formations} roles={state.roles}
              anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
              pickedPos={st.position} disabledPos={[...occupied]} onTilePick={(pos) => onPosition(pos)} />
          </div>
        ) : spec.segment ? (
          // #124: Segment im VOLLEN Board wählen — markierbarer 5er-Block im durchgehenden Deck statt isolierter Kachel.
          <div className="grid gap-1 mt-4">
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-1">Segment im Board wählen</div>
            {Array.from({ length: nSeg }, (_, seg) => {
              const start = seg * SEGMENT_SIZE;
              const segCards = cards.slice(start, start + SEGMENT_SIZE);
              const active = st.segment === seg;
              return (
                <button key={seg} onClick={() => onSegment(seg)}
                  className="flex items-center gap-2 rounded-lg p-1 text-left transition-all"
                  style={{ background: active ? `${GOLD}18` : "transparent", border: `2px solid ${active ? GOLD : "transparent"}` }}>
                  <div className="text-[10px] opacity-50 w-9 shrink-0 text-right tabular-nums">{start + 1}–{start + segCards.length}</div>
                  <div className="grid grid-cols-5 gap-1.5 flex-1">
                    {segCards.map((c, k) => {
                      const pos = start + k; const col = suitColor(c.suit);
                      const fb = formationBorder((state.formations || [])[pos]); // #161 FB-1: Formationsrand sichtbar machen
                      const bcol = active ? GOLD : fb.color || col + "55";
                      return (
                        <div key={pos} className="as-tile relative rounded-lg flex items-center justify-center" style={{ background: "#20202a", border: `2px ${!active && fb.dashed ? "dashed" : "solid"} ${bcol}` }}>
                          <span className="absolute top-0.5 left-1 text-[8px] opacity-40 tabular-nums">{pos + 1}</span>
                          <span className="text-lg sm:text-2xl font-bold font-pixel-dense" style={{ color: col }}>{c.value}</span>
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-[10px] font-bold shrink-0 pr-1 w-12 text-right" style={{ color: active ? GOLD : "#8a8a95" }}>{active ? "✓ " : ""}Seg {seg + 1}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* #112: Karten im geteilten CardGrid — Formations-/Rollen-Kontext sichtbar (formationsbewusst wählen). */}
            <div className="mt-4">
              <CardGrid cards={cards} formations={state.formations} roles={state.roles}
                anchors={state.shop?.anchors || []} pe={{ linkedGroups: allianceGroups(state.familyTiers, state.roles) }}
                pickedIds={sel} arrows={colors} onTilePick={(pos, c) => onCard(c.id)} />
            </div>

            {spec.color && sel.length > 0 && (
              <div className="mt-4 grid gap-2">
                <div className="text-[11px] uppercase tracking-wide opacity-50">Neue Farbe je Karte</div>
                {sel.map((id) => {
                  const c = cardById(id);
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <span className="text-sm font-bold w-10 shrink-0" style={{ color: suitColor(c.suit) }}>{c.value}{c.suit}</span>
                      <div className="flex gap-2 flex-wrap">
                        {SUIT_ORDER.filter((su) => su !== c.suit).map((su) => {
                          const on = colors[id] === su;
                          return (
                            <button key={su} onClick={() => onColor(id, su)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                              style={{ background: on ? suitColor(su) : `${suitColor(su)}22`, color: on ? "#141419" : suitColor(su), border: `1px solid ${suitColor(su)}` }}>
                              {suitName(su)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between mt-5">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "#2a2a33", color: "#c4c4cc" }}>Abbrechen</button>
          <button onClick={() => ready && onConfirm()} disabled={!ready} data-sfx="none"
            className="px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
            style={{ background: ready ? GOLD : "#2a2a33", color: ready ? "#141419" : "#8a8a92", cursor: ready ? "pointer" : "default" }}>
            Bestätigen
          </button>
        </div>
      </div>
    </div>
  );
}
