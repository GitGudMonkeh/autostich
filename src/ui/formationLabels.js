// #147: EINE Quelle für die UI-Anzeigenamen der Formationstypen. Vorher dreimal von Hand gepflegt
// (Battlefield/CardDetail/CardGrid) → `nachhall` und `formationskern` fehlten in zweien und leckten als
// rohe Keys ins ansonsten deutsche UI. `nachhall` (Feuer-Nachglut) und `formationskern` (F-L1 „Kern") sind
// echte Typen, die die Engine pusht (formations.js), also müssen alle Anzeigen sie kennen.
//   label = ausgeschriebener Name (Battlefield nutzt ihn in Großbuchstaben, CardDetail direkt)
//   abbr  = Einzelbuchstabe für die Karten-Badges (CardGrid); Buchstaben paarweise verschieden.
export const FORMATION_TYPES = {
  wiederholung:   { label: "Wiederholung", abbr: "W" },
  farbblock:      { label: "Farbblock",    abbr: "F" },
  treppe:         { label: "Treppe",       abbr: "T" },
  wechsel:        { label: "Wechsel",      abbr: "Z" },
  anker:          { label: "Anker",        abbr: "A" },
  nachhall:       { label: "Nachhall",     abbr: "N" },
  formationskern: { label: "Kern",         abbr: "K" },
};

// Ausgeschriebener Name (Fallback: der rohe Typ, falls je ein neuer Typ ohne Eintrag auftaucht).
export const formationLabel = (type) => FORMATION_TYPES[type]?.label ?? type;
// Badge-Kürzel (Fallback: leer statt „undefined" im UI).
export const formationAbbr = (type) => FORMATION_TYPES[type]?.abbr ?? "";
