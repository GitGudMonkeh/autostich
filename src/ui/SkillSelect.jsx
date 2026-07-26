import { useState } from "react";
import { SKILL_DEFS, ARCHETYPE_META, ARCHETYPE_ORDER, archetypeOf } from "../game/skills.js";
import { SKILL_SLOTS, LIGHTNING_CRIT_BASE, LIGHTNING_CRIT_PER_SKILL,
         FIRE_SCORE_BASE, FIRE_SCORE_PER_SKILL, BURN_BONUS, ICE_BASE_FREEZE, FROST_GRIP_BONUS } from "../game/constants.js";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { FormationPanel } from "./FormationPanel.jsx";
import { PanelMascot } from "./PanelMascot.jsx";
import skillMascot from "../assets/mascots/skill.gif";

// Archetyp-Meta eines Skills (Theming) — Fallback neutral (#93 F0).
const ac = (id) => ARCHETYPE_META[archetypeOf(id)] || { label: "Skill", icon: "•", color: "#8a8a95" };

const SOCKET_PCT = Math.round(LIGHTNING_CRIT_BASE * 100);         // einmaliger Aktivierungs-Sockel (5 %)
const PER_SKILL_PCT = Math.round(LIGHTNING_CRIT_PER_SKILL * 100); // je Blitz-Skill (5 %)

// Blitz-Akzent: violett/elektrisch (dieselbe Deck-/Archetyp-Farbe wie im HUD).
const LIGHT = "#8a7de0";

// Schlüsselbegriffe der Skills — unten im Overlay erklärt (nur die im Angebot vorkommenden). Icon/Farbe je Archetyp.
const KEYWORD_INFO = {
  charge: { label: "Ladung", icon: "⚡", color: "#8a7de0", text: "Crits erzeugen Ladung (max 10). Bei voller Ladung lösen Blitz-Skills Effekte aus oder verbrauchen sie." },
  ionize: { label: "Ionisierung", icon: "⚡", color: "#8a7de0", text: "Dauerhafte Kartenmarkierung: eine ionisierte Karte gibt bei Sieg +25 Score pro Stapel und erhält danach +1 Stapel (max 4)." },
  streak: { label: "Serie", icon: "⚡", color: "#8a7de0", text: "Geladene Serie schützt deine Siegesserie — die nächste Niederlage setzt sie nicht zurück." },
  // #116: Feuer-Flat-Score-Grundmechanik quantifiziert (Zahlen aus constants.js → kein Text↔Code-Drift).
  heat: { label: "Hitze", icon: "🔥", color: "#e0714a", text: `Siege mit klarem Wertvorsprung heizen die Hitzeleiste (0–100 %) auf und geben Feuer-Flat-Score = (Vorsprung − 2) × ${FIRE_SCORE_BASE} (+${FIRE_SCORE_PER_SKILL} je weiterem Feuer-Skill; Verbrennung +${BURN_BONUS}/Punkt); klare Niederlagen kühlen sie ab.` },
  consume: { label: "Hitze-Konsument", icon: "🔥", color: "#e0714a", text: "Verbraucht angesammelte Hitze für einen starken Effekt. Höchstens ein Konsument gleichzeitig — ein zweiter ersetzt den bestehenden." },
  // #122: Einfrier-Grundzahl genannt (aus constants.js) — sonst ist „wie viele Karten?" nirgends ersichtlich.
  freeze: { label: "Eingefroren", icon: "❄️", color: "#5ec8f0", text: `Eis friert eigene Karten dauerhaft ein (blau): ${ICE_BASE_FREEZE} beim ersten Eis-Skill, +1 je weiterem (Frostgriff: +${FROST_GRIP_BONUS}). Eingefrorene Karten biegen Formationen und dürfen 1× je Aufstellungsphase kostenlos getauscht werden.` },
};

/* Skill-Auswahl (docs/blitz-archetyp.md, Abschnitt 7): erscheint jede 3. Runde STATT eines Perks.
   Seltene, regelverändernde Motoren. Ablehnen → stattdessen ein Perk (Runde nie verschwendet).
   Bei vollen Slots: neuen Skill wählen → dann den zu ersetzenden Skill antippen (übergibt replaceId). */
export function SkillSelect({ offer, onPick, onDecline, onReroll, skills = [], state = {} }) {
  const held = skills.map((id) => SKILL_DEFS[id]).filter(Boolean);
  // Neuwurf (Shop-Spec §10 P2/P-L1): gratis Reroll (Schicksalskontrolle) zuerst, sonst gespeicherte Token.
  const freeReroll = !!state.freeSkillReroll;
  const rerollTokens = (state.shop && state.shop.skillRerolls) || 0;
  const canReroll = !!onReroll && (freeReroll || rerollTokens > 0);
  const full = skills.length >= SKILL_SLOTS;
  const [pending, setPending] = useState(null); // bei vollen Slots gewählter neuer Skill — wartet auf Ersetzungsziel
  const [openSkill, setOpenSkill] = useState(null); // gehaltener Skill, dessen Beschreibung aufgeklappt ist
  const [pendingConsumer, setPendingConsumer] = useState(null); // #93: Konsumenten-Ersatzdialog { id, replace, type }
  // Schlüsselbegriffe, die in den angebotenen Skills vorkommen (charge/ionize/streak).
  const kws = [...new Set(offer.flatMap((id) => SKILL_DEFS[id]?.keywords || []))].filter((k) => KEYWORD_INFO[k]);
  // Ist der Blitz-Archetyp noch nicht aktiv, schaltet DIESER Skill ihn frei (Ladung + Crit-Sockel).
  const firstPick = !(state.lightning && state.lightning.active);
  // Angebot nach Archetyp gruppieren (feste Reihenfolge) — #93 F0: 2+2, aktuell nur Blitz.
  // #118: defensiver Guard — ein bereits gehaltener Skill erscheint NIE als Angebots-Karte (selbst bei inkonsistentem State).
  const groups = ARCHETYPE_ORDER
    .map((arch) => ({ arch, meta: ARCHETYPE_META[arch], ids: offer.filter((id) => archetypeOf(id) === arch && !skills.includes(id)) }))
    .filter((g) => g.ids.length);
  const hasBlitzOffer = offer.some((id) => archetypeOf(id) === "lightning");
  const hasFireOffer = offer.some((id) => archetypeOf(id) === "fire");
  const fireFirstPick = !(state.heat && state.heat.active); // erster Feuer-Skill schaltet die Hitzeleiste frei
  const hasIceOffer = offer.some((id) => archetypeOf(id) === "ice");
  const iceFirstPick = !(state.activeArchetypes || []).includes("ice"); // erster Eis-Skill schaltet das Einfrieren frei
  const showFormations = hasIceOffer || (skills || []).some((id) => archetypeOf(id) === "ice"); // #161 FB-1: Formations-Panel bei Eis-Relevanz

  // Konsumenten-Typ eines Skills (#93): Hitze („heat") / Ladung („charge") / kein Konsument (null).
  const consumerTypeOf = (id) => (SKILL_DEFS[id]?.heatConsumer ? "heat" : SKILL_DEFS[id]?.onFullCharge ? "charge" : null);
  const CONSUMER_LABEL = { heat: "Hitze", charge: "Ladungs" };

  // Freier Slot → direkt wählen. Volle Slots → neuen Skill vormerken, dann Ersetzungsziel antippen.
  // Zweiter Konsument desselben Typs → Bestätigungsdialog (ersetzt den bestehenden, max 1 je Typ).
  const clickSkill = (id) => {
    const ctype = consumerTypeOf(id);
    if (ctype && !skills.includes(id)) {
      const existing = skills.find((s) => consumerTypeOf(s) === ctype);
      if (existing && existing !== id) {
        setPendingConsumer((cur) => (cur && cur.id === id ? null : { id, replace: existing, type: ctype }));
        return;
      }
    }
    if (!full) { onPick(id); return; }
    setPending((cur) => (cur === id ? null : id));
  };

  return (
    <div className="fixed inset-0 overlay-root z-20 flex items-center sm:items-start justify-center p-4 sm:pt-28" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      {/* #130: nicht scrollender Wrapper → Magier-Maskottchen schaut oben hervor (etwas höher = kleiner overlap,
          damit die Feuer-/Eis-/Blitz-Karten frei liegen). Panel oben angedockt (sm:items-start + sm:pt-28) +
          sm:max-h, damit der Peek nie vom Viewport geklippt wird. */}
      <div className="relative w-full max-w-3xl">
        <PanelMascot src={skillMascot} accent={LIGHT} peekMaxH={124} overlap={16} />
        <div className="relative z-10 w-full rounded-2xl p-6 max-h-[92dvh] sm:max-h-[calc(100dvh-8rem)] overflow-y-auto overlay-card" style={{ background: "#181820", border: `1px solid ${LIGHT}66`, boxShadow: `0 0 26px ${LIGHT}22` }}>
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: LIGHT }}>⚡ Skill · Runde {(state.cycle || 0) + 1}</div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <PanelMascot src={skillMascot} accent={LIGHT} variant="avatar" avatarObjectPosition="center top" />
            <h2 className="text-xl font-bold">Wähle einen Skill</h2>
          </div>
          <p className="text-xs opacity-55 mt-1">
            Skills sind seltene, regelverändernde Motoren — {skills.length}/{SKILL_SLOTS} Slots belegt.
          </p>
          {state.lastCycleScore != null && <div className="mt-3"><RoundScoreBadge state={state} /></div>}
        </div>

        {/* Was ein Blitz-Skill freischaltet: Ladungs-System + Crit-Basis — nur wenn Blitz im Angebot ist (#93 F0). */}
        {hasBlitzOffer && (
        <div className="mt-3 rounded-lg px-3 py-2 text-xs leading-snug"
          style={{ background: `${LIGHT}14`, border: `1px solid ${LIGHT}44` }}>
          {firstPick ? (
            <>Dein erster Blitz-Skill schaltet den <b style={{ color: LIGHT }}>Blitz-Archetyp</b> frei:{" "}
              <b style={{ color: "#5ec8f0" }}>Ladung</b> (Crits erzeugen Ladung, max 10) und eine{" "}
              <b style={{ color: "#e879f9" }}>Crit-Basis von +{SOCKET_PCT + PER_SKILL_PCT} %</b>{" "}
              (einmaliger Sockel +{SOCKET_PCT} % plus +{PER_SKILL_PCT} % je gehaltenem Blitz-Skill).</>
          ) : (
            <>Jeder weitere Blitz-Skill gibt <b style={{ color: "#e879f9" }}>+{PER_SKILL_PCT} % Crit-Chance</b>{" "}
              (zusätzlich zum einmaligen Aktivierungs-Sockel von +{SOCKET_PCT} %). Ladung/Crit-Basis sind bereits aktiv.</>
          )}
        </div>
        )}

        {/* Was ein Feuer-Skill freischaltet: Hitzeleiste — nur wenn Feuer im Angebot ist (#93 F1). */}
        {hasFireOffer && (
        <div className="mt-3 rounded-lg px-3 py-2 text-xs leading-snug"
          style={{ background: "#e0714a14", border: "1px solid #e0714a44" }}>
          {fireFirstPick ? (
            <>Dein erster Feuer-Skill schaltet die <b style={{ color: "#e0714a" }}>Hitzeleiste</b> frei (0–100 %):{" "}
              Siege mit klarem <b style={{ color: "#f0a83a" }}>Wertvorsprung</b> heizen auf und geben Feuer-Flat-Score,
              klare Niederlagen kühlen ab. Belohnt totale Überlegenheit statt knapper Siege.</>
          ) : (
            <>Jeder weitere Feuer-Skill erhöht den <b style={{ color: "#f0a83a" }}>Feuer-Flat-Score</b> pro Vorsprungspunkt.
              Die Hitzeleiste ist bereits aktiv.</>
          )}
        </div>
        )}

        {/* Was ein Eis-Skill freischaltet: Einfrieren + Aufstellungskontrolle — nur wenn Eis im Angebot ist (#93 F3). */}
        {hasIceOffer && (
        <div className="mt-3 rounded-lg px-3 py-2 text-xs leading-snug"
          style={{ background: "#5ec8f014", border: "1px solid #5ec8f044" }}>
          {iceFirstPick ? (
            <>Dein erster Eis-Skill friert <b style={{ color: "#5ec8f0" }}>eigene Karten</b> ein (blau): sie biegen
              Formationen und dürfen <b style={{ color: "#bfe9f7" }}>1× je Aufstellungsphase kostenlos getauscht</b> werden.
              Jeder weitere Eis-Skill friert eine weitere Karte ein. Kontrolle & Aufstellung statt Crit.</>
          ) : (
            <>Jeder weitere Eis-Skill friert eine <b style={{ color: "#5ec8f0" }}>weitere eigene Karte</b> ein und
              erweitert deine Formations- und Aufstellungs-Optionen.</>
          )}
        </div>
        )}

        {/* Konsumenten-Ersatzdialog (#93): zweiter Konsument desselben Typs ersetzt den bestehenden. */}
        {pendingConsumer && (
          <div className="mt-3 rounded-lg px-3 py-3 text-xs leading-snug" style={{ background: "#d4a63a1a", border: "1px solid #d4a63a66", color: "#e8dcb8" }}>
            <div className="mb-2">
              Du hältst bereits den {CONSUMER_LABEL[pendingConsumer.type]}-Konsumenten{" "}
              <b style={{ color: ac(pendingConsumer.replace).color }}>{SKILL_DEFS[pendingConsumer.replace]?.name}</b>.{" "}
              <b style={{ color: ac(pendingConsumer.id).color }}>{SKILL_DEFS[pendingConsumer.id]?.name}</b> ersetzt ihn
              (höchstens 1 {CONSUMER_LABEL[pendingConsumer.type]}-Konsument). Deine aktuelle Ressource bleibt erhalten.
            </div>
            <div className="flex gap-2">
              <button onClick={() => { onPick(pendingConsumer.id, pendingConsumer.replace); setPendingConsumer(null); }}
                className="px-3 py-1.5 rounded font-bold transition-all hover:brightness-110" style={{ background: "#d4a63a", color: "#0c0c10" }}>Ersetzen</button>
              <button onClick={() => setPendingConsumer(null)}
                className="px-3 py-1.5 rounded transition-all hover:opacity-80" style={{ background: "#20202a", border: "1px solid #3a3a46", color: "#e8e8ea" }}>Abbrechen</button>
            </div>
          </div>
        )}

        {/* Bei vollen Slots: Hinweis zum Ersetzen. */}
        {full && (
          <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: "#d4a63a14", border: "1px solid #d4a63a55", color: "#e8dcb8" }}>
            {pending
              ? <>Neuer Skill <b style={{ color: LIGHT }}>{SKILL_DEFS[pending]?.name}</b> gewählt — tippe unten den Skill an, der ihn ersetzen soll.</>
              : <>Alle {SKILL_SLOTS} Slots belegt. Wähle einen neuen Skill, dann tippe unten den zu ersetzenden Skill an.</>}
          </div>
        )}

        {/* Angebot nach Archetyp gruppiert (#93 F0). Bei mehreren Archetypen je eine Überschrift + Trennlinie. */}
        <div className="mt-5 grid gap-4">
          {groups.map((g) => (
            <div key={g.arch}>
              {groups.length > 1 && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: g.meta.color }}>{g.meta.icon} {g.meta.label}</span>
                  <div className="flex-1 h-px" style={{ background: `${g.meta.color}33` }} />
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                {g.ids.map((id) => {
                  const s = SKILL_DEFS[id];
                  const sel = pending === id;
                  const col = g.meta.color;
                  return (
                    <button key={id} onClick={() => clickSkill(id)}
                      className="text-left rounded-xl p-4 h-full flex flex-col gap-2 transition-all hover:-translate-y-0.5"
                      style={{ background: sel ? "#2a2740" : "#20202a",
                               border: `1px solid ${sel ? col : col + "88"}`,
                               boxShadow: sel ? `0 0 16px ${col}88` : `0 0 14px ${col}33` }}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                          style={{ background: `${col}22`, color: col, border: `1px solid ${col}88` }}>
                          {g.meta.icon} {g.meta.label.toUpperCase()}
                        </span>
                        {(s.heatConsumer || s.onFullCharge) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                            style={{ background: "#d4a63a22", color: "#d4a63a", border: "1px solid #d4a63a88" }}>
                            KONSUMENT
                          </span>
                        )}
                        {s.legendary && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                            style={{ background: "#e0b84522", color: "#e0b845", border: "1px solid #e0b84588" }}>
                            ★ LEGENDÄR
                          </span>
                        )}
                        {sel && <span className="text-[10px] font-bold" style={{ color: col }}>✓ ausgewählt</span>}
                      </div>
                      <div className="font-bold" style={{ color: col }}>{s.name}</div>
                      <div className="text-sm opacity-75 leading-snug">{s.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-5 flex flex-wrap items-center justify-center gap-2">
          {canReroll && (
            <button onClick={onReroll}
              className="text-xs px-4 py-2 rounded-lg font-bold transition-all hover:brightness-110"
              style={{ background: "#20202a", color: "#d4a63a", border: "1px solid #d4a63a66" }}>
              🎲 Angebot neu würfeln {freeReroll ? "· gratis" : `· ${rerollTokens} übrig`}
            </button>
          )}
          <button
            onClick={onDecline}
            className="text-xs px-4 py-2 rounded-lg transition-all hover:opacity-80"
            style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}
          >
            Ablehnen → stattdessen ein Perk
          </button>
        </div>

        {held.length > 0 && (
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "#2a2a33" }}>
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
              {pending ? "Welchen Skill ersetzen?" : `Deine Skills — ${held.length}/${SKILL_SLOTS} · bereits gehalten · antippen für Beschreibung`}
            </div>
            <div className="flex flex-wrap gap-2">
              {/* #118: gehaltene Skills NEUTRAL (grau) statt in Archetyp-Akzentfarbe — sonst wirken sie wie ein wählbares
                  Angebot. Akzent-/Aktionsfarbe nur im „ersetzen"-Modus (pending). */}
              {held.map((s) => (
                pending ? (
                  <button key={s.id} onClick={() => onPick(pending, s.id)} title={s.desc}
                    className="text-xs px-2 py-1 rounded transition-all hover:brightness-125"
                    style={{ background: "#e0605a1f", color: "#e0605a", border: "1px solid #e0605a88" }}>
                    {ac(s.id).icon} {s.name} <span className="opacity-70">↔ ersetzen</span>
                  </button>
                ) : (
                  <button key={s.id} onClick={() => setOpenSkill(openSkill === s.id ? null : s.id)} title={s.desc}
                    className="text-xs px-2 py-1 rounded transition-all"
                    style={{ background: openSkill === s.id ? "#2a2a33" : "#1c1c22", color: "#9a9aa4",
                             border: `1px solid ${openSkill === s.id ? "#4a4a55" : "#33333e"}` }}>
                    {ac(s.id).icon} {s.name} <span className="opacity-55">✓ gehalten</span> <span className="opacity-40">{openSkill === s.id ? "▾" : "▸"}</span>
                  </button>
                )
              ))}
            </div>
            {!pending && openSkill && SKILL_DEFS[openSkill] && (
              <div className="text-[11px] mt-2 px-2 py-1 rounded leading-snug" style={{ background: `${ac(openSkill).color}14`, color: "#d8d0f0" }}>
                {SKILL_DEFS[openSkill].desc}
              </div>
            )}
            {pending && (
              <button onClick={() => setPending(null)} className="text-[11px] mt-2 opacity-60 hover:opacity-90 underline">
                Abbrechen
              </button>
            )}
          </div>
        )}

        {/* #161 FB-1: bei Eis-Relevanz die aktiven Formationen zeigen — Einfrieren biegt die Formationserkennung. */}
        {showFormations && (
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "#2a2a33" }}>
            <FormationPanel state={state} title="Deine aktiven Formationen (Eis biegt die Erkennung)" />
          </div>
        )}

        {/* Schlüsselbegriffe (Ladung/Ionisierung/…) unten erklärt — nur die im Angebot vorkommenden. */}
        {kws.length > 0 && (
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "#2a2a33" }}>
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Schlüsselbegriffe</div>
            <div className="grid gap-1.5">
              {kws.map((k) => (
                <div key={k} className="text-xs leading-snug">
                  <span className="font-bold" style={{ color: KEYWORD_INFO[k].color }}>{KEYWORD_INFO[k].icon} {KEYWORD_INFO[k].label}</span>
                  <span className="opacity-70"> — {KEYWORD_INFO[k].text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
