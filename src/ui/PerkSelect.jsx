import { PERK_DEFS, CATEGORIES } from "../game/perks.js";

/* Level-Up-Auswahl (§7.8): pausiert das Spiel, bietet PERKS_OFFERED Optionen. */
export function PerkSelect({ offer, level, onPick }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-3xl rounded-2xl p-6" style={{ background: "#181820", border: "1px solid #33333e" }}>
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>Level {level} erreicht</div>
          <h2 className="text-xl font-bold mt-1">Wähle einen Perk</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mt-5">
          {offer.map((id) => {
            const p = PERK_DEFS[id];
            const cat = CATEGORIES[p.cat];
            return (
              <button
                key={id}
                onClick={() => onPick(id)}
                className="text-left rounded-xl p-4 h-full flex flex-col gap-2 transition-all hover:-translate-y-0.5"
                style={{ background: "#20202a", border: `1px solid ${cat.color}55` }}
              >
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold self-start"
                  style={{ background: `${cat.color}22`, color: cat.color }}>
                  {cat.name}
                </span>
                <div className="font-bold" style={{ color: cat.color }}>{p.label}</div>
                <div className="text-sm opacity-75 leading-snug">{p.desc}</div>
              </button>
            );
          })}
        </div>

        <div className="text-center text-xs opacity-40 mt-5">
          Jeder Perk ist pro Lauf nur einmal wählbar.
        </div>
      </div>
    </div>
  );
}
