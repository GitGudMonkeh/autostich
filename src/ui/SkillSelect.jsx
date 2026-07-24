import { useState } from "react";
import { SKILL_DEFS, ARCHETYPE_META, ARCHETYPE_ORDER, archetypeOf } from "../game/skills.js";
import { SKILL_SLOTS, LIGHTNING_CRIT_BASE, LIGHTNING_CRIT_PER_SKILL } from "../game/constants.js";

// Archetyp-Meta eines Skills (Theming) — Fallback neutral (#93 F0).
const ac = (id) => ARCHETYPE_META[archetypeOf(id)] || { label: "Skill", icon: "•", color: "#8a8a95" };

const SOCKET_PCT = Math.round(LIGHTNING_CRIT_BASE * 100);         // einmaliger Aktivierungs-Sockel (5 %)
const PER_SKILL_PCT = Math.round(LIGHTNING_CRIT_PER_SKILL * 100); // je Blitz-Skill (5 %)

// Blitz-Akzent: violett/elektrisch (dieselbe Deck-/Archetyp-Farbe wie im HUD).
const LIGHT = "#8a7de0";

// Schlüsselbegriffe der Blitz-Skills — unten im Overlay erklärt (nur die im Angebot vorkommenden).
const KEYWORD_INFO = {
  charge: { label: "Ladung", text: "Crits erzeugen Ladung (max 10). Bei voller Ladung lösen Blitz-Skills Effekte aus oder verbrauchen sie." },
  ionize: { label: "Ionisierung", text: "Dauerhafte Kartenmarkierung: eine ionisierte Karte gibt bei Sieg +25 Score pro Stapel und erhält danach +1 Stapel (max 4)." },
  streak: { label: "Serie", text: "Geladene Serie schützt deine Siegesserie — die nächste Niederlage setzt sie nicht zurück." },
};

/* Skill-Auswahl (docs/blitz-archetyp.md, Abschnitt 7): erscheint jede 3. Runde STATT eines Perks.
   Seltene, regelverändernde Motoren. Ablehnen → stattdessen ein Perk (Runde nie verschwendet).
   Bei vollen Slots: neuen Skill wählen → dann den zu ersetzenden Skill antippen (übergibt replaceId). */
export function SkillSelect({ offer, onPick, onDecline, skills = [], state = {} }) {
  const held = skills.map((id) => SKILL_DEFS[id]).filter(Boolean);
  const full = skills.length >= SKILL_SLOTS;
  const [pending, setPending] = useState(null); // bei vollen Slots gewählter neuer Skill — wartet auf Ersetzungsziel
  const [openSkill, setOpenSkill] = useState(null); // gehaltener Skill, dessen Beschreibung aufgeklappt ist
  // Schlüsselbegriffe, die in den angebotenen Skills vorkommen (charge/ionize/streak).
  const kws = [...new Set(offer.flatMap((id) => SKILL_DEFS[id]?.keywords || []))].filter((k) => KEYWORD_INFO[k]);
  // Ist der Blitz-Archetyp noch nicht aktiv, schaltet DIESER Skill ihn frei (Ladung + Crit-Sockel).
  const firstPick = !(state.lightning && state.lightning.active);
  // Angebot nach Archetyp gruppieren (feste Reihenfolge) — #93 F0: 2+2, aktuell nur Blitz.
  const groups = ARCHETYPE_ORDER
    .map((arch) => ({ arch, meta: ARCHETYPE_META[arch], ids: offer.filter((id) => archetypeOf(id) === arch) }))
    .filter((g) => g.ids.length);
  const hasBlitzOffer = offer.some((id) => archetypeOf(id) === "lightning");

  // Freier Slot → direkt wählen. Volle Slots → neuen Skill vormerken, dann Ersetzungsziel antippen.
  const clickSkill = (id) => {
    if (!full) { onPick(id); return; }
    setPending((cur) => (cur === id ? null : id));
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-3xl rounded-2xl p-6 max-h-[92vh] overflow-y-auto" style={{ background: "#181820", border: `1px solid ${LIGHT}66`, boxShadow: `0 0 26px ${LIGHT}22` }}>
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: LIGHT }}>⚡ Skill · Runde {(state.cycle || 0) + 1}</div>
          <h2 className="text-xl font-bold mt-1">Wähle einen Skill</h2>
          <p className="text-xs opacity-55 mt-1">
            Skills sind seltene, regelverändernde Motoren — {skills.length}/{SKILL_SLOTS} Slots belegt.
          </p>
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
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                          style={{ background: `${col}22`, color: col, border: `1px solid ${col}88` }}>
                          {g.meta.icon} {g.meta.label.toUpperCase()}
                        </span>
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

        <div className="text-center mt-5">
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
              {pending ? "Welchen Skill ersetzen?" : `Deine Skills — ${held.length}/${SKILL_SLOTS} · antippen für Beschreibung`}
            </div>
            <div className="flex flex-wrap gap-2">
              {held.map((s) => {
                const c = ac(s.id).color;
                return pending ? (
                  <button key={s.id} onClick={() => onPick(pending, s.id)} title={s.desc}
                    className="text-xs px-2 py-1 rounded transition-all hover:brightness-125"
                    style={{ background: "#e0605a1f", color: "#e0605a", border: "1px solid #e0605a88" }}>
                    {ac(s.id).icon} {s.name} <span className="opacity-70">↔ ersetzen</span>
                  </button>
                ) : (
                  <button key={s.id} onClick={() => setOpenSkill(openSkill === s.id ? null : s.id)} title={s.desc}
                    className="text-xs px-2 py-1 rounded transition-all"
                    style={{ background: openSkill === s.id ? `${c}33` : `${c}1a`, color: c,
                             border: `1px solid ${openSkill === s.id ? c : c + "55"}` }}>
                    {ac(s.id).icon} {s.name} <span className="opacity-60">{openSkill === s.id ? "▾" : "▸"}</span>
                  </button>
                );
              })}
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

        {/* Schlüsselbegriffe (Ladung/Ionisierung/…) unten erklärt — nur die im Angebot vorkommenden. */}
        {kws.length > 0 && (
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "#2a2a33" }}>
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">Schlüsselbegriffe</div>
            <div className="grid gap-1.5">
              {kws.map((k) => (
                <div key={k} className="text-xs leading-snug">
                  <span className="font-bold" style={{ color: LIGHT }}>⚡ {KEYWORD_INFO[k].label}</span>
                  <span className="opacity-70"> — {KEYWORD_INFO[k].text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
