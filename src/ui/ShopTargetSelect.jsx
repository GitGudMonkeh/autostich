import { suitColor, suitName, SUIT_ORDER, SHOP_CATEGORIES, SHOP_CATEGORY_LABELS } from "../game/constants.js";
import { SEGMENT_SIZE, FORMATION_TYPES, FORMATION_TYPE_LABELS } from "../game/formations.js";
import { SHOP_ITEM_DEFS, SEGMENT_BOUNDARIES } from "../game/shop.js";
import { useEscape } from "./useEscape.js";

const GOLD = "#d4a63a";

/* Shop-Ziel-Auswahl (Shop-Spec §12.2) — öffnet nach dem Kauf eines Ziel-Items (Kartenitems S2).
   Karten wählen (Limit aus dem Item), optional je Karte eine neue Farbe, oder ein Segment (K-L1).
   Abbrechen lässt Angebot & Münzen unverändert; Bestätigen zieht erst dann den Preis ab (Reducer). */
export function ShopTargetSelect({ state, onCard, onColor, onSegment, onPosition, onColorPair, onBoundary, onFormationType, onCategory, onOffer, onConfirm, onCancel }) {
  useEscape(onCancel);
  const st = state.shopTarget || {};
  const def = SHOP_ITEM_DEFS[st.itemId] || {};
  const spec = def.target || {};
  const deck = state.deck || [];
  const order = state.playerOrder || [];
  const cards = order.map((di) => deck[di]);
  const nSeg = Math.ceil(cards.length / SEGMENT_SIZE);
  const sel = st.cards || [];
  const colors = st.colors || {};
  const cardById = (id) => deck.find((c) => c.id === id);

  const occupied = new Set((state.shop?.anchors || []).map((a) => a.position));
  const openBoundaries = new Set(state.shop?.permanentEffects?.openSegmentBoundaries || []);
  const pair = st.colorPair || [];
  const cardsDone = !spec.cards || sel.length === spec.cards;
  const colorsDone = !spec.color || sel.every((id) => colors[id]);
  const segDone = !spec.segment || st.segment != null;
  const posDone = !spec.position || st.position != null;
  const pairDone = !spec.colorPair || pair.length === 2;
  const boundaryDone = !spec.boundary || st.boundary != null;
  const ftDone = !spec.formationType || st.formationType != null;
  const catDone = !spec.category || st.category != null;
  const offerDone = !spec.offer || st.targetOfferId != null;
  const ready = spec.colorPair ? pairDone : spec.boundary ? boundaryDone : spec.formationType ? ftDone
    : spec.category ? catDone : spec.offer ? offerDone : spec.position ? posDone : spec.segment ? segDone : cardsDone && colorsDone;
  // Reservierung (P4): reservierbare Angebote = alle außer dem gerade gekauften P4 und bereits gekauften.
  const purchased = new Set(state.shop?.purchasedOfferIds || []);
  const reservable = (state.shop?.offers || []).filter((o) => o.offerId !== st.offerId && !purchased.has(o.offerId));

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3" style={{ background: "#0c0c10ee", backdropFilter: "blur(2px)" }}>
      <div className="w-full max-w-4xl rounded-2xl p-5 max-h-[95vh] overflow-y-auto" style={{ background: "#15151b", border: `1px solid ${GOLD}55` }}>
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: GOLD }}>Shop · {def.name}</div>
          <h2 className="text-xl font-bold mt-1">
            {spec.colorPair ? "Wähle zwei Farben" : spec.boundary ? "Wähle eine Segmentgrenze" : spec.formationType ? "Wähle einen Formationstyp" : spec.category ? "Wähle eine Kategorie" : spec.offer ? "Wähle ein Item zum Reservieren" : spec.position ? "Wähle eine Position" : spec.segment ? "Wähle ein Segment" : `Wähle ${spec.cards} ${spec.cards === 1 ? "Karte" : "Karten"}${spec.color ? " + Farbe" : ""}`}
          </h2>
          <p className="text-xs opacity-60 mt-1 max-w-xl mx-auto leading-snug">{def.description}</p>
        </div>

        {spec.colorPair ? (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Zwei Farben wählen (zählen als eine)</div>
            <div className="flex gap-2 flex-wrap">
              {SUIT_ORDER.map((su) => {
                const on = pair.includes(su);
                return (
                  <button key={su} onClick={() => onColorPair(su)}
                    className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                    style={{ background: on ? suitColor(su) : `${suitColor(su)}22`, color: on ? "#141419" : suitColor(su), border: `2px solid ${suitColor(su)}` }}>
                    {suitName(su)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : spec.boundary ? (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Segmentgrenze wählen</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {SEGMENT_BOUNDARIES.map((b) => {
                const open = openBoundaries.has(b);
                const active = st.boundary === b;
                return (
                  <button key={b} onClick={() => !open && onBoundary(b)} disabled={open}
                    className="rounded-xl p-3 text-left transition-all"
                    style={{ background: active ? `${GOLD}22` : "#20202a", border: `2px solid ${active ? GOLD : open ? "#5ab87a" : "#33333e"}`, opacity: open ? 0.5 : 1, cursor: open ? "not-allowed" : "pointer" }}>
                    <span className="font-bold">Grenze {b + 1}|{b + 2}</span>
                    {open && <span className="text-[11px] ml-2" style={{ color: "#5ab87a" }}>bereits offen</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : spec.formationType ? (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Formationstyp wählen (jede Formation dieses Typs ×1,50)</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {FORMATION_TYPES.map((ft) => {
                const active = st.formationType === ft;
                return (
                  <button key={ft} onClick={() => onFormationType(ft)}
                    className="rounded-xl p-3 text-left transition-all font-bold"
                    style={{ background: active ? `${GOLD}22` : "#20202a", border: `2px solid ${active ? GOLD : "#33333e"}` }}>
                    {FORMATION_TYPE_LABELS[ft]}
                    {active && <span className="text-[11px] ml-2" style={{ color: GOLD }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : spec.category ? (
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
                const d = SHOP_ITEM_DEFS[o.itemId] || {};
                const active = st.targetOfferId === o.offerId;
                return (
                  <button key={o.offerId} onClick={() => onOffer(o.offerId)}
                    className="rounded-xl p-3 text-left transition-all"
                    style={{ background: active ? `${GOLD}22` : "#20202a", border: `2px solid ${active ? GOLD : o.legendary ? GOLD + "88" : "#33333e"}` }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm">{d.name || o.itemId}</span>
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
          <div className="grid gap-2 mt-4">
            {Array.from({ length: nSeg }, (_, s) => (
              <div key={s} className="flex items-center gap-2">
                <div className="text-[10px] opacity-40 w-9 shrink-0 text-right tabular-nums">{s * SEGMENT_SIZE + 1}–{Math.min(s * SEGMENT_SIZE + SEGMENT_SIZE, cards.length)}</div>
                <div className="grid grid-cols-5 gap-1.5 flex-1">
                  {cards.slice(s * SEGMENT_SIZE, s * SEGMENT_SIZE + SEGMENT_SIZE).map((c, k) => {
                    const pos = s * SEGMENT_SIZE + k;
                    const occ = occupied.has(pos);
                    const active = st.position === pos;
                    const col = suitColor(c.suit);
                    return (
                      <button key={pos} onClick={() => !occ && onPosition(pos)} disabled={occ}
                        className="relative rounded-lg flex flex-col items-center justify-center transition-all"
                        style={{ aspectRatio: "3 / 4", background: active ? `${GOLD}22` : "#20202a",
                                 border: `2px solid ${active ? GOLD : occ ? "#5a8ade" : col + "55"}`, opacity: occ ? 0.55 : 1,
                                 cursor: occ ? "not-allowed" : "pointer", boxShadow: active ? `0 0 10px ${GOLD}66` : undefined }}>
                        <span className="absolute top-0.5 left-1 text-[8px] opacity-40 tabular-nums">{pos + 1}</span>
                        <span className="text-lg font-bold font-pixel-dense" style={{ color: col }}>{c.value}</span>
                        {occ && <span className="absolute bottom-0.5 right-1 text-[10px]" style={{ color: "#5a8ade" }} title="Bereits ein Anker">⚓</span>}
                        {active && <span className="text-[10px] font-bold leading-none" style={{ color: GOLD }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : spec.segment ? (
          <div className="grid sm:grid-cols-2 gap-2 mt-4">
            {Array.from({ length: nSeg }, (_, seg) => {
              const segCards = cards.slice(seg * SEGMENT_SIZE, seg * SEGMENT_SIZE + SEGMENT_SIZE);
              const active = st.segment === seg;
              return (
                <button key={seg} onClick={() => onSegment(seg)} className="rounded-xl p-3 text-left transition-all"
                  style={{ background: active ? `${GOLD}22` : "#20202a", border: `2px solid ${active ? GOLD : "#33333e"}` }}>
                  <div className="text-[11px] opacity-60 mb-1">Segment {seg + 1} · Pos {seg * SEGMENT_SIZE + 1}–{seg * SEGMENT_SIZE + segCards.length}</div>
                  <div className="flex gap-2">
                    {segCards.map((c) => (
                      <span key={c.id} className="text-lg font-bold font-pixel-dense" style={{ color: suitColor(c.suit) }}>{c.value}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="grid gap-2 mt-4">
              {Array.from({ length: nSeg }, (_, s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className="text-[10px] opacity-40 w-9 shrink-0 text-right tabular-nums">{s * SEGMENT_SIZE + 1}–{Math.min(s * SEGMENT_SIZE + SEGMENT_SIZE, cards.length)}</div>
                  <div className="grid grid-cols-5 gap-1.5 flex-1">
                    {cards.slice(s * SEGMENT_SIZE, s * SEGMENT_SIZE + SEGMENT_SIZE).map((c, k) => {
                      const pos = s * SEGMENT_SIZE + k;
                      const selected = sel.includes(c.id);
                      const col = suitColor(c.suit);
                      return (
                        <button key={pos} onClick={() => onCard(c.id)}
                          className="relative rounded-lg flex flex-col items-center justify-center transition-all"
                          style={{ aspectRatio: "3 / 4", background: selected ? `${GOLD}22` : "#20202a",
                                   border: `2px solid ${selected ? GOLD : col + "55"}`, boxShadow: selected ? `0 0 10px ${GOLD}66` : undefined }}>
                          <span className="absolute top-0.5 left-1 text-[8px] opacity-40 tabular-nums">{pos + 1}</span>
                          <span className="text-lg font-bold font-pixel-dense" style={{ color: col }}>{c.value}</span>
                          {selected && spec.color && colors[c.id] && (
                            <span className="text-[9px] font-bold leading-none" style={{ color: suitColor(colors[c.id]) }}>→{colors[c.id]}</span>
                          )}
                          {selected && !spec.color && <span className="text-[10px] font-bold leading-none" style={{ color: GOLD }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
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
          <button onClick={() => ready && onConfirm()} disabled={!ready}
            className="px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:brightness-110"
            style={{ background: ready ? GOLD : "#2a2a33", color: ready ? "#141419" : "#8a8a92", cursor: ready ? "pointer" : "default" }}>
            Bestätigen
          </button>
        </div>
      </div>
    </div>
  );
}
