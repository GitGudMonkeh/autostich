/* ============================================================
   GLOSSARY — SPANISH. 109 entries + 8 categories + 5 groups. Mirrors enGlossary.js.

   Two things are special here:

   1. NUMBERS. Where the German interpolates a constant, so does the Spanish — same expression,
      same source (see esSkills.js). 35 of the 109 texts carry tuning numbers. `num` and `grp`
      are the Spanish pair again: decimal comma, point as the thousands separator.

   2. `match` LISTS ARE NOT TRANSLATED, THEY ARE REWRITTEN. They drive the auto-bolding in every
      description (tokenizeGlossary), so they must contain the WORD FORMS that actually occur in
      the SPANISH texts — plurals, verb forms, feminine and masculine. A literal translation of
      the German inflection list ("Durchlaufs", "Durchläufen") would be nonsense, and so would a
      copy of the English one. Spanish needs its own set: "estallido / estallidos / estalla /
      estallan / estallar / umbral de estallido".
      Every form must also be spelled exactly as it appears in the Spanish catalog — a form that
      never occurs simply never bolds. Written LAST, out of the finished Spanish corpus, and
      measured rather than guessed (package §7).

   ORDINALS: the German writes "Ab der 3." and "2. Karte". Spanish would want 2.ª / 3.ª, and the
   ordinal indicator is missing from the font (§5.3). "Carta 2" / "Desde la carta 3" keeps the
   DIGIT, which also keeps the number guard comparing like with like — spelling the ordinal out as
   "la tercera" would have dropped a number the German names.

   ONE TERMINOLOGY POINT worth naming here, because this file is where it would have shown:
   `ventaja` is the frozen word for a Perk (§3.5), so the combat-value gap is `margen` (§3.1)
   and never `ventaja`. One Spanish word may not carry two German terms.
   ============================================================ */
import * as C from "../game/constants.js";
import { WIN_MASS as G_WIN_MASS, EWIGER_FROST as G_EWIGER_FROST, THRESHOLDS as G_THRESHOLDS,
  KASKADE_PER_NEIGHBOR as G_KASKADE, GEO_BLOCK as G_BLOCK, GEO_KREUZ as G_KREUZ, GEO_LINIE as G_LINIE,
  GEO_FLAECHE as G_FLAECHE } from "../game/glacier.js";
import { SKILL_LIST } from "../game/skills.js";
import esSkills from "./esSkills.js";
// Only the joined ladder is needed here; esMeta.js imports RARE/EPIC straight from esTerms.
import { RARITY_ES } from "./esTerms.js";

const num = (x) => String(x).replace(".", ",");
const pct = (x) => Math.round(x * 100);
const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// Prunable skills with their SPANISH names — filtered from the registry, named from the ES catalog.
const TRIMMABLE_ES = SKILL_LIST.filter((s) => s.trimGrowth).map((s) => esSkills[`ability.${s.id}.name`]).join(", ");
const RARITY_NAMES_ES = RARITY_ES.join(" · ");
const BURST_AT = G_THRESHOLDS[G_THRESHOLDS.length - 1];

/* Shorthand: [id, label, text, [match…]] — more compact than four keys per entry and therefore
   easier to read against the German source. Unfolded below. */
const E = [
  /* ---- Basics ---- */
  ["stich", "Baza", "Un único duelo de cartas: tu carta contra la del rival; gana el valor de combate más alto.", ["baza", "bazas"]],
  ["durchlauf", "Ciclo", `Las ${C.TRICKS_PER_CYCLE} cartas del mazo jugadas una vez (${C.TRICKS_PER_CYCLE} bazas). Después el rival vuelve a barajar y toca una decisión.`, ["ciclo", "ciclos"]],
  ["aufstellung", "Fase de orden", "Entre dos ciclos reordenas tu orden de robo. Cada intercambio cuesta energía de orden.", ["fase de orden", "orden de robo"]],
  ["streak", "Racha de victorias (racha)", "Victorias seguidas. El multiplicador de racha y muchas habilidades crecen con ella; una derrota la reinicia.", ["racha de victorias", "racha", "rachas"]],
  ["wertvorsprung", "Margen de valor de combate", "La diferencia entre tu valor de combate y el de la carta rival, es decir, valor de carta más las bonificaciones de valor de baza, no solo el valor de carta. Para Fuego no cuenta si ganas, sino con cuánta claridad: el calor y la puntuación de fuego crecen con el margen.", ["margen de valor de combate", "margen", "márgenes"]],
  ["kampfwert", "Valor de combate", "El valor efectivo de una carta en la baza: valor de carta más todas las bonificaciones de valor de baza. Gana el más alto.", ["valor de combate"]],
  ["crit", "Crítico", `Golpe crítico: la victoria cuenta con el multiplicador de crítico (base ×${num(C.CRIT_BASE_MULT)}). El crítico base es 0. La probabilidad de crítico viene de las familias de Precisión y de las habilidades de Rayo (+${pct(C.LIGHTNING_CRIT_PER_SKILL)} % por cada habilidad de Rayo que tengas). Una probabilidad de crítico por encima del 100 % sube ligeramente el multiplicador de crítico.`, ["crítico", "críticos", "golpe crítico", "golpes críticos"]],
  ["gleichstand", "Empate", "Valores de combate iguales en la baza, normalmente sin victoria (sin puntuación).", ["empate", "empates"]],
  ["geist", "Fantasma / récord", "Tu mejor partida guardada, como referencia. Su puntuación aparece cada pocas bazas a modo de vara de medir.", ["fantasma", "récord"]],
  ["reroll", "Relanzamiento", `Vuelve a tirar una oferta entera. Tres reservas separadas por partida: ventajas · edificios · habilidades, no se comparten entre sí y no hay recambio. El árbol de mejoras las sube; en una partida clasificatoria son exactamente ${C.BASE_REROLLS} por reserva.`, ["relanzamiento", "relanzamientos", "relanzar"]],
  ["serienpunkt", "Punto de racha", "La unidad de cuenta de la racha de victorias: cada victoria seguida es un punto de racha. Los efectos que pagan “por punto de racha” escalan, por tanto, con la longitud de tu racha actual.", ["punto de racha", "puntos de racha"]],
  ["farbserie", "Racha de palo", "Victorias consecutivas del mismo palo de carta. Un cambio de palo o una derrota la reinicia. Las cartas verdes de Planta cuentan aquí como Verde. Alimenta, entre otras cosas, la ventaja Monocromo y la familia Fiebre de Palo.", ["racha de palo", "rachas de palo"]],
  ["direktscore", "Puntuación directa", "Puntuación que cuenta directamente, sin pasar por los multiplicadores de racha, crítico o formación. Actúa de forma plana e inmediata, y suele ser fuerte al principio.", ["puntuación directa"]],

  /* ---- Deck & cards ---- */
  ["deck", "Mazo", `${C.TRICKS_PER_CYCLE} cartas = 4 palos × valores 1–10. Tu mazo se puede cambiar con ventajas y con el Arquitecto; el rival baraja de nuevo en cada ciclo.`, ["mazo", "mazos"]],
  ["farbe", "Palo", "Rojo, Azul, Verde, Amarillo. Relevante sobre todo para las formaciones de bloque de palo.", ["palo", "palos"]],
  ["kartenwert", "Valor de carta", "El valor base duradero de una carta, modificable de forma permanente con ventajas, forja, capas o el Arquitecto.", ["valor de carta", "valores de carta"]],
  ["stichwert", "Valor de baza", "Una bonificación de valor solo para la baza en curso (después decae). Junto con el valor de carta forma el valor de combate.", ["valor de baza"]],
  ["ziehreihenfolge", "Orden de robo", "El orden fijo en el que se juegan tus cartas; se mantiene estable de un ciclo a otro (solo baraja el rival).", ["orden de robo"]],
  ["position", "Posición", `El sitio fijo de una carta en el orden de robo (1–${C.TRICKS_PER_CYCLE}). Muchas ventajas, anclas y edificios dependen de la posición, no de la carta: quien esté allí recibe el efecto. No confundir con el contador de bazas, que solo dice hasta dónde ha llegado el ciclo.`, ["posición", "posiciones"]],
  ["segment", "Segmento", "Un bloque de 5 posiciones. Las formaciones base están ligadas al segmento: una serie termina en cada límite de segmento.", ["segmento", "segmentos", "límite de segmento", "límites de segmento"]],

  /* ---- Formations ---- */
  ["formation", "Formación", "Un patrón reconocido de cartas vecinas en tu orden de robo (repetición, escalera, bloque de palo, zigzag). Una victoria dentro de una formación cuenta con un factor de formación. No confundir con las formaciones de glaciar, que se forman con glaciares sobre el tablero.", ["formación", "formaciones"]],
  ["wiederholung", "Repetición", "≥2 valores iguales seguidos. Carta 2 ×1,25, carta 3 ×1,50, carta 4 ×1,80, después +0,40 cada una.", ["repetición", "repeticiones"]],
  ["farbblock", "Bloque de palo", "≥3 cartas del mismo palo. Desde la carta 3, ×1,35; +0,20 por cada una más.", ["bloque de palo", "bloques de palo"]],
  ["treppe", "Escalera", "≥3 valores estrictamente crecientes (paso ≤4). Desde la carta 3, ×1,35; +0,20 por cada una más.", ["escalera", "escaleras"]],
  ["wechsel", "Zigzag", "≥3 en zigzag (diferencia entre vecinas ≥4). Desde la carta 3, ×1,40; +0,20 por cada una más.", ["zigzag"]],
  ["anker", "Ancla", "Una sola posición cuenta como formación activa (el factor depende de la fuente). Viene de las familias de ancla o del edificio del Arquitecto Piedra Angular. Como máximo un ancla por posición. Desde el nivel III, Piedra Angular pone además valor de baza en cada celda de ancla.", ["ancla", "anclas", "celda de ancla", "celdas de ancla"]],
  ["ueberlappung", "Solapamiento", "Si una carta está en varias formaciones, su factor se multiplica además: 2 → ×1,5 · 3 → ×2 · 4 → ×3.", ["solapamiento", "solapamientos"]],
  ["nachhall", "Eco", "Cuando una formación termina, su factor de formación se transmite una vez más a la carta inmediatamente siguiente. La bonificación se prolonga.", ["eco"]],
  ["formationskern", "Núcleo de formación", "Un tipo de formación que elijas recibe un factor adicional en todas sus formaciones activas.", ["núcleo de formación", "núcleo"]],
  ["grenzbonus", "Bonificación de cruce", "Si una formación cruza un límite de segmento, sus cartas dan ×1,25 de puntuación adicional. Viene de la ventaja Trabajo de Segmento (nivel IV).", ["bonificación de cruce"]],
  ["farballianz", "Alianza de palos", "Los palos que hayas enlazado cuentan como el mismo palo para los bloques de palo.", ["alianza de palos", "alianza"]],
  ["farbtransparenz", "Transparencia de bloque de palo", "Una carta marcada así no interrumpe un bloque de palo: el bloque pasa por encima de ella como si no estuviera (aunque ella misma no cuenta). Viene del edificio del Arquitecto Arcada.", ["transparencia de bloque de palo"]],
  ["joker", "Comodín", "Una carta puede adoptar en el reconocimiento el valor o el palo que haga falta. Por sí sola no forma ninguna formación.", ["comodín", "comodines"]],
  ["bindeglied", "Enlace", "Una carta puede diferir en valor para una escalera. Familia de ventajas Enlace: I/II ±1 · III en 1 o 2 · IV cualquier valor entre sus vecinas. Edificio del Arquitecto Claustro: ±1, desde el nivel III ±2.", ["enlace", "enlaces", "enlace de escalera"]],
  ["formenergie", "Energía de orden", `El presupuesto de intercambios de la fase de orden (${C.FORMATION_ENERGY} por fase). Cada intercambio de dos cartas cuesta 1.`, ["energía de orden"]],

  /* ---- Archetypes ---- */
  ["archetyp", "Arquetipo", `Una familia de habilidades con identidad propia (Fuego · Rayo · Hielo · Planta). La primera habilidad la desbloquea; se pueden mezclar hasta ${C.MAX_ARCHETYPES}.`, ["arquetipo", "arquetipos"]],
  ["skillslot", "Ranura de habilidad", `Tienes como máximo ${C.SKILL_SLOTS} habilidades a la vez. Cuando la reserva está llena, una habilidad nueva sustituye a una vieja. La habilidad legendaria de la fase legendaria ocupa una ranura adicional y fija.`, ["ranura de habilidad", "ranuras de habilidad", "ranuras"]],
  ["skillrunde", "Ciclo de habilidad", `En momentos fijos de la partida (la primera vez en el ciclo ${C.FIRST_SKILL_CYCLE}) eliges habilidades en lugar de una ventaja: ${C.SKILLS_OFFERED} habilidades en oferta, con los 4 arquetipos entre ellas.`, ["ciclo de habilidad", "ciclos de habilidad"]],
  ["consume", "Consumidor", "Una habilidad que gasta un recurso acumulado para lograr un efecto fuerte: Fuego quema calor, Rayo gasta carga. Varios consumidores de fuego actúan a la vez; de los consumidores de rayo, siempre solo uno, y uno nuevo sustituye al anterior.", ["consumidor", "consumidores"]],
  // exp skill rework: legendaries are the fifth rarity of the skill offer (no gate, no phase of their own).
  ["legskill", "Habilidad legendaria", "Un nivel de habilidad raro y especialmente poderoso (marcado con ★). Las habilidades legendarias aparecen como quinta rareza en la oferta normal de habilidades – sin requisito, siempre de la facción de la casilla que sustituyen. Con suerte tienes dos.", ["habilidad legendaria", "habilidades legendarias"]],
  ["ueberlauf", "Desbordamiento", `Lo que una carta acumula por encima de lo que su uso normal puede aprovechar (crecimiento por encima del tope de valor de ${C.PLANT_VALUE_CAP}, calor por encima del 100 %), y que si no se desperdiciaría. Fuego (calor blanco) lo acumula como sobrecalentamiento; las legendarias (Árbol del Mundo / Árbol Madre) convierten el gran resto.`, ["desbordamiento", "crecimiento de desbordamiento"]],
  ["bekenntnis", "Compromiso", "Hasta qué punto te has comprometido con un arquetipo: la proporción de tus ranuras de habilidad que ocupan sus habilidades. Muchos efectos, sobre todo los legendarios, pagan en proporción a él, y del todo solo con un mazo puro.", ["compromiso"]],
  ["heat", "Calor", `Las victorias con un margen de valor de combate claro calientan la barra de calor (0–100 %) y dan puntuación de fuego = (margen − ${C.FIRE_MARGIN_OFFSET}) × ${C.FIRE_SCORE_BASE} (+${C.FIRE_SCORE_PER_SKILL} por cada habilidad de Fuego adicional). Un margen grande sigue pagando sin tope, con un aumento decreciente; las derrotas claras enfrían.`, ["calor", "barra de calor"]],
  ["glutdividende", "Dividendo de brasas", "Puntuación adicional en cada victoria de fuego, que cuenta directamente (sin pasar por racha, crítico ni formación). Cuanto más calor mantengas, más, hasta un tope. Fuerte al principio de la partida.", ["dividendo de brasas"]],
  ["brand", "Marca", `Una carta rival marcada pierde valor; cada marca da +${C.BRAND_ASH} de ceniza, la materia prima de la forja de fuego.`, ["marca", "marcas", "marcada"]],
  ["ash", "Ceniza", `Materia prima de la forja de fuego: las marcas dan +${C.BRAND_ASH} de ceniza. La Forja de Ceniza consume ${C.FORGE_COST} de ceniza por forja (+${C.FORGE_VALUE} de valor de carta); cuando la forja está llena, la ceniza restante arde como brasa de ceniza y se convierte en puntuación.`, ["ceniza"]],
  ["whiteheat", "Calor blanco", `El desbordamiento del calor: cuando la barra de calor está llena, cada nueva ganancia de calor se acumula como sobrecalentamiento (hasta el ${C.HEAT_MAX + C.OVERHEAT_MAX} %); cuanto más caliente estés, menos llega. Cada punto de sobrecalentamiento da +${Math.round(C.OVERHEAT_SCORE_STEP * 100)} % sobre tu puntuación de fuego y se disipa de nuevo en cada baza. Requiere la habilidad Calor Blanco.`, ["calor blanco", "sobrecalentamiento"]],
  ["ashglow", "Brasa de ceniza", `El desbordamiento de la ceniza: cuando la capacidad de la forja está llena, la ceniza restante se quema al final del ciclo y se convierte en puntuación (+${grp(C.FORGE_OVERFLOW_SCORE)} de puntuación por cada ${C.FORGE_COST} de ceniza). Así la ceniza se gasta por completo en cada ciclo y no queda ningún montón muerto.`, ["brasa de ceniza"]],
  ["forge", "Forjar", `La ceniza se convierte en valor de carta permanente (Forja de Ceniza: ${C.FORGE_COST} de ceniza → +${C.FORGE_VALUE} de valor en la carta más baja).`, ["forjar", "forjada", "forjado", "forja"]],
  // exp skill rework (catálogo inactivo): la barra de carga ioniza la siguiente carta; las acumulaciones no tienen tope y solo dan puntuación.
  ["charge", "Carga", `Cada crítico da +1 carga (barra de ${C.LIGHTNING_MAX_CHARGE}). Con la barra llena, ioniza la siguiente carta del orden y se vacía.`, ["carga", "cargas"]],
  ["ionize", "Ionización", `Una marca permanente en la carta: una carta ionizada da +${C.ION_SCORE_PER_STACK} de puntuación por acumulación en la base al ganar, antes de los multiplicadores. Las acumulaciones solo vienen de la barra de carga llena y de habilidades de Rayo, y no tienen tope.`, ["ionización", "ionizada", "ionizar", "ionizan"]],
  ["stapel", "Acumulación (ionización)", `Una ionización sobre una sola carta, sin tope. Cada acumulación da +${C.ION_SCORE_PER_STACK} de puntuación cuando esa carta gana; las cartas con muchas acumulaciones desbloquean las habilidades de umbral (Cazarrayos, Cortocircuito, Sobretensión).`, ["acumulación de ionización", "acumulaciones de ionización", "acumulación", "acumulaciones"]],
  ["kaskade", "Cascada", "Un suceso enciende el siguiente. Con Rayo: un crítico con una carta muy ionizada genera carga adicional (Sobretensión). Con Hielo: un glaciar que estalla arrastra a sus vecinos, de modo que una ola de estallidos recorre la agrupación.", ["cascada", "cascadas"]],
  ["glacier", "Glaciar", "Hielo es el arquetipo del glaciar: congelas una carta sobre su celda del tablero. A partir de ahí queda rígida (ya no se puede mover en ninguna fase de orden futura), pero a cambio acumula masa. Con suficiente masa, el glaciar estalla sobre sus vecinos.", ["glaciar", "glaciares"]],
  ["masse", "Masa", `El recurso de Hielo: la masa está sobre la celda del tablero. Cada glaciar gana +${num(G_EWIGER_FROST)} de masa en cada ciclo, sin condiciones, tanto en victoria como en derrota; una victoria trae +${num(G_WIN_MASS)} de masa más.`, ["masa"]],
  ["bersten", "Estallido", `Cuando un glaciar alcanza ${BURST_AT} de masa, estalla: puntuación de estallido a partir de masa × la fuerza del umbral alcanzado (umbrales ${G_THRESHOLDS.join(" / ")}), amplificada un +${pct(G_KASKADE)} % por cada glaciar contiguo, más una colisión cuando el estallido alcanza a un glaciar vecino. Después cae a 0 y se rellena desde su reserva del suelo al inicio del ciclo.`, ["estallido", "estallidos", "estalla", "estallan", "estallar", "umbral de estallido"]],
  ["cluster", "Agrupación", "Un grupo de glaciares directamente contiguos. Muchas habilidades de Hielo miden el tamaño de la agrupación (por ejemplo Fusión y Engranaje); el Puente de Hielo cuenta también las diagonales.", ["agrupación", "agrupaciones"]],
  ["eisformation", "Formaciones de glaciar", `Hielo es el único mazo con formaciones de glaciar: las formas geométricas de glaciares congelados refuerzan su estallido: bloque = 2×2 (4 glaciares, ×${num(G_BLOCK)}), cruz = centro + 4 vecinas (5, ×${num(G_KREUZ)}), línea = fila completa (5) o columna (8) (×${num(G_LINIE)}), gran área = 3×3 (9, ×${num(G_FLAECHE)}). Las formas solapadas se acumulan.`, ["formaciones de glaciar", "formación de glaciar"]],
  ["freeze", "Nieve", `La nieve está como reserva sobre la celda del tablero, separada de la masa del glaciar. Si congelas un glaciar sobre una celda cargada, la nieve acumulada se convierte en su reserva del suelo; el glaciar empieza vacío y tira de ella en cada ciclo hasta volver a las ${BURST_AT} de masa completas (solo la diferencia, nunca más allá), hasta que la reserva se vacía. El suelo abierto lo cargan Permafrost, Ventisca y Edad de Hielo, nunca bajo un glaciar.`, ["nieve"]],
  ["growth", "Crecimiento", `Tus propias cartas crecen con las victorias (solo hacia arriba), y tanto más rápido cuantas más habilidades de Planta tengas (a pleno ritmo desde ${C.PLANT_GROWTH_SKILL_REF} habilidades, por debajo en proporción). Desde ${C.PLANT_GREEN_THRESHOLD} de crecimiento una carta se vuelve verde (madura) de forma permanente; por debajo es una plántula.`, ["crecimiento"]],
  ["setzling", "Plántula", `Una carta que ya crece pero aún no está madura (crecimiento por debajo de ${C.PLANT_GREEN_THRESHOLD}). Una plántula todavía NO cuenta para el bloque de palo verde; solo desde ${C.PLANT_GREEN_THRESHOLD} de crecimiento se vuelve verde (madura). Semillero da a la carta más baja de cada segmento +${C.SETZLINGSBEET_GROWTH} de crecimiento de adelanto.`, ["plántula", "plántulas"]],
  ["green", "Verde (madura)", "Las cartas verdes son permanentes y forman un bloque de palo común: cuanto más grande sea el bloque, más puntuación. El multiplicador de bloque de palo para cartas verdes está topado en ×1,35.", ["verde", "verdes", "madura", "maduras"]],
  ["wurzeln", "Raíces", `Mientras solo tengas habilidades de Planta, las victorias verdes hacen la carta más valiosa: +1 de valor de carta por cada ${C.WURZELSCHLAG_PER_GROWTH} de crecimiento (hasta ${C.PLANT_VALUE_CAP}), y desde ${C.WURZELSCHLAG_LOSS_MIN_SKILLS} habilidades también con cada ${C.WURZELSCHLAG_LOSS_EVERY} derrotas. El crecimiento se conserva y sigue contando para la puntuación de raíz y para las legendarias.`, ["raíces", "puntuación de raíz", "raíz"]],
  ["bluete", "Floración", `Un beneficio verde: cuando gana una carta verde con vecinas verdes, da +${C.BLUETE_SCORE} de puntuación de floración por cada carta verde del segmento (Época de Floración ×${C.BLUETEZEIT_MULT} dentro de una formación, Invasión otra vez ×2).`, ["floración", "puntuación de floración"]],
  ["trimmen", "Poda", `El punto de giro de crecer a cosechar: si sustituyes una habilidad de crecimiento (${TRIMMABLE_ES}), cuenta como una poda → +${pct(C.TRIM_STEP)} % permanente de puntuación de raíz y floración, más alto cuantas más podas (hasta +${pct(C.TRIM_CAP)} %). Las habilidades de crecimiento no mueren así, refinan la cosecha.`, ["poda", "podas", "podada", "podar"]],
  ["colonize", "Colonizar / estolón", "Marca cartas rivales de verde (Estolones/Rizoma). Si vences a una carta colonizada, cosechas crecimiento.", ["colonizar", "coloniza", "colonizada", "estolón", "estolones"]],
  ["overgrowth", "Invasión", `Cuando el campo está verde en un ${Math.round(C.UEBERWUCHERUNG_FIELD * 100)} % o más, todos los bloques de palo se vuelven más fuertes (+${num(C.UEBERWUCHERUNG_FACTOR)} de factor) y la floración cuenta el doble.`, ["invasión"]],
  ["eternalSpring", "Primavera Eterna", `El bloque de palo cuenta como verde ya desde ${C.EWIGER_FRUEHLING_FARBBLOCK} cartas, y la invasión ya desde el ${Math.round(C.EWIGER_FRUEHLING_FIELD * 100)} % del campo. Cuanto más grande sea tu campo siempre verde, más puntuación paga directamente cada victoria verde.`, ["Primavera Eterna"]],

  /* ---- Precision ---- */
  ["praez_intro", "Precisión", "El crítico como categoría de ventajas. El crítico base es 0; para los builds que no son de Rayo, la probabilidad y el daño de crítico vienen de las cinco familias de Precisión sujetas al azar (sin legendaria). Rayo sigue siendo el arquetipo de crítico fiable y autogenerado; Precisión se suma por encima.", ["Precisión"]],
  ["praez_sharp", "Agudeza", `+probabilidad de crítico plana en todas las cartas (${pct(C.PRECISION_SHARP_PP[0])}/${pct(C.PRECISION_SHARP_PP[1])}/${pct(C.PRECISION_SHARP_PP[2])}/${pct(C.PRECISION_SHARP_PP[3])} % por nivel). El motor básico del crítico.`, ["Agudeza", "probabilidad de crítico"]],
  ["praez_force", "Potencia", `+multiplicador de crítico sobre una base de ${num(C.CRIT_BASE_MULT)}× (+${num(C.PRECISION_FORCE_MULT[0])}/${num(C.PRECISION_FORCE_MULT[1])}/${num(C.PRECISION_FORCE_MULT[2])}/${num(C.PRECISION_FORCE_MULT[3])}× por nivel).`, ["Potencia", "multiplicador de crítico"]],
  ["praez_aim", "Puntería", `+${pct(C.PRECISION_AIM_PP)} % de probabilidad de crítico en las cartas altas; el umbral se ensancha con cada nivel (valor ≥ ${C.PRECISION_AIM_THRESH[0]}/${C.PRECISION_AIM_THRESH[1]}/${C.PRECISION_AIM_THRESH[2]}/${C.PRECISION_AIM_THRESH[3]}).`, ["Puntería"]],
  ["praez_lens", "Lupa ardiente", `+probabilidad de crítico por cada formación simultánea a partir de la segunda en la posición ganadora (${pct(C.PRECISION_LENS_PP[0])}/${pct(C.PRECISION_LENS_PP[1])}/${pct(C.PRECISION_LENS_PP[2])}/${pct(C.PRECISION_LENS_PP[3])} % por formación, máx. ${C.PRECISION_LENS_CAP} extra). Premia la profundidad de formación.`, ["Lupa ardiente"]],
  ["praez_color", "Enfoque de palo", `Elige un palo → +probabilidad de crítico en ese palo (${pct(C.PRECISION_COLOR_PP[0])}/${pct(C.PRECISION_COLOR_PP[1])}/${pct(C.PRECISION_COLOR_PP[2])} %); el nivel IV da en su lugar un SEGUNDO palo a tu elección (los dos +${pct(C.PRECISION_COLOR_PP[3])} %).`, ["Enfoque de palo"]],

  /* ---- Perks & rarity ---- */
  ["perk", "Ventaja", "Un efecto permanente que se elige. Cada ventaja solo se puede elegir una vez por partida.", ["ventaja", "ventajas"]],
  ["familie", "Familia", "Una ventaja o un edificio como unidad mejorable con hasta cuatro niveles (I–IV). La mejoras nivel a nivel.", ["familia", "familias"]],
  ["stufe", "Nivel I–IV", "El rango de una familia. Los niveles altos son más fuertes y se ofrecen con menos frecuencia; el nivel IV cierra la familia.", ["nivel", "niveles"]],
  ["raritaet", "Rareza", `${RARITY_NAMES_ES}: los cuatro niveles de familia, marcados por color.`, ["rareza", "rarezas"]],
  ["legendaer", "Legendaria", "Un efecto poderoso con un inconveniente, fuera del sistema de niveles: tirada propia, marco dorado, como mucho una por oferta.", ["legendaria", "legendarias", "legendario", "legendarios"]],
  ["upgradetyp", "Tipos de mejora", "Cómo se comporta una familia al mejorarla: sustitución (solo cuenta el nivel más alto) · acumulativa (cada nivel actúa una vez) · rol (el objetivo conserva su rol y los números suben).", ["sustitución", "acumulativa"]],
  ["kategorien", "Categorías A–E", "Las cinco clases de ventaja: A Mazo · B Baza · C Rol · D Puntuación · E Form. (herramientas de formación).", ["categorías"]],
  ["opfergabe", "Ofrenda", "Una carta elegida pierde valor de forma permanente y la carta siguiente lo gana.", ["Ofrenda"]],

  /* ---- The Architect ---- */
  ["bauphase", "Fase de construcción / el Arquitecto", "El Arquitecto sustituye a la tienda: en vez de comprar, colocas edificios geométricos como una capa sobre el tablero de cartas. Sin dinero, sin monedas.", ["fase de construcción", "Arquitecto"]],
  ["brett", "Tablero (8×5)", `Tus ${C.TRICKS_PER_CYCLE} posiciones de mazo como 8 filas × 5 columnas. Las formaciones siguen corriendo sobre el orden en 1D.`, ["tablero"]],
  ["polyomino", "Poliominó / forma", "La forma en celdas de un edificio (al estilo Tetris), colocable en varias rotaciones.", ["poliominó", "poliominós"]],
  ["bauplan", "Plano", "Una entrada de la oferta a partir de la cual levantas un edificio. 3 planos por fase de construcción.", ["plano", "planos"]],
  ["gebaeude", "Edificio", "Un edificio ya colocado. Potencia la carta que esté en su posición en la baza. Nunca se solapa con otros.", ["edificio", "edificios"]],
  ["baufeld", "Espacio de construcción (tope)", "El número limitado de celdas del tablero que puedes ocupar. La escasez convierte la colocación en una decisión (el árbol de mejoras y la ventaja Logia de Canteros suben el tope).", ["espacio de construcción"]],
  ["baukat", "Categorías de construcción", "Tres clases de efecto: valor (estructura portante, +valor de baza) · puntuación (edificio comercial, +puntuación) · formación (edificio sacro, dobla el reconocimiento).", ["categorías de construcción"]],
  ["struktur", "Estructura", "Una fila, columna o diagonal completamente construida (una estructura completada) da un multiplicador; se acumulan de forma multiplicativa. Algunos edificios (Barrio de Almacenes, Observatorio) pagan además por cada estructura completada. Junto con los factores de distrito, eso forma el impulso de edificios que la fase de construcción muestra arriba.", ["bonificaciones de estructura", "estructura completada", "estructuras completadas", "estructura", "estructuras"]],
  ["distrikt", "Edificio adyacente / distrito", "Un edificio que linda ortogonalmente con otro. Los planos de distrito (por ejemplo Barrio Gremial, Mercado) pagan por cada edificio adyacente, hasta un tope. Premian construir denso.", ["edificio adyacente", "edificios adyacentes", "distrito", "distritos"]],
  ["staffel", "Relevo", "Un edificio pasa su puntuación a la celda vecina: el efecto cae desplazado, no en su propia celda (por ejemplo Galería, Faro).", ["relevo", "relevos"]],
  ["lage", "Colocación", "Algunos edificios solo funcionan en los segmentos tempranos o solo en los tardíos del tablero; la colocación decide (por ejemplo Adarve, Revellín).", ["colocación"]],
  ["critwette", "Apuesta de crítico", "Una apuesta sobre el crítico: una victoria con crítico paga el bote, una victoria sin crítico cuesta una deducción (nunca por debajo de 0). Mejorar sube solo el bote, no la deducción (por ejemplo Caseta de Rifas, Casino).", ["apuesta de crítico", "apuesta", "apuestas", "bote"]],
  ["kicker", "Extra de nivel", "Algunos edificios desbloquean al mejorarlos, a partir de cierto nivel, un efecto adicional, no solo un número mayor.", ["extra de nivel"]],
  ["abgedecktezelle", "Celda cubierta", "Una celda del tablero que queda bajo un edificio colocado. Construcción Densa paga puntuación por cada celda cubierta; Clave da valor de baza a su carta de rol mientras esté bajo un edificio.", ["celda cubierta", "celdas cubiertas", "bajo un edificio"]],
  ["aufruesten", "Mejorar", "Subir un edificio existente +1 nivel en vez de construir uno nuevo (los legendarios no tienen niveles).", ["mejorar", "mejora"]],
  ["versetzen", "Mover", "Desplazar o girar un edificio existente sobre el tablero (fase propia después de construir).", ["mover"]],

  /* ---- Progress & meta ---- */
  ["stichpunkte", "Puntos de baza (PB)", "La moneda del árbol de mejoras. La ganas de una partida a otra y la gastas en nodos que refuerzan de forma permanente tus partidas futuras.", ["Punto de baza", "Puntos de baza", "PB"]],
  ["deckpunkte", "Puntos de mazo (PM)", "La moneda del taller de mazos, puramente cosmética. Con ella compras packs de cartas y de campos de batalla, y efectos; no afecta al juego.", ["Punto de mazo", "Puntos de mazo", "PM"]],
  ["upgradebaum", "Árbol de mejoras", "El progreso que atraviesa las partidas: con Puntos de baza compras nodos que desbloquean arquetipos nuevos, rarezas más altas, más espacio de construcción, más energía de orden, mejores tasas de aparición y las fases legendarias. En una partida clasificatoria no tiene efecto.", ["árbol de mejoras"]],
  ["rankedrun", "Partida clasificatoria", "El modo competitivo semanal: todo el mundo juega la misma semilla con la misma base independiente del árbol. Solo cuentan las partidas terminadas; al final de la semana el puesto 1 pasa al archivo Challenger.", ["partida clasificatoria", "partidas clasificatorias", "clasificación semanal"]],
  ["weekmod", "Modificador semanal", "De tres a cinco cambios de reglas, tirados de nuevo cada semana e iguales para todos (al menos dos positivos, al menos uno negativo). Dependen de la semilla semanal, no de tu perfil.", ["modificador semanal", "modificadores semanales", "modificador", "modificadores"]],
  ["chronik", "Crónica", `Una vista de solo lectura de las ${C.TRICKS_PER_CYCLE} cartas de la partida en su orden actual, con marcadores de formación, rol y ancla.`, ["crónica"]],
  ["bestenliste", "Clasificación", "Tus partidas locales más la clasificación global.", ["clasificación"]],
  ["challenger", "Challenger / semilla", "Comparte una partida por su semilla (un código corto); otros repiten exactamente las mismas cartas y comparan la puntuación.", ["challenger", "semilla", "semillas"]],
  ["statshub", "Centro de estadísticas", "Estadísticas agregadas de tus partidas: mejor puntuación, puntuación media, mejor racha, uso de arquetipos y más.", ["centro de estadísticas", "estadísticas"]],
  ["scoreherkunft", "Origen de la puntuación", "Cómo se reparte tu puntuación entre formaciones / críticos / el resto; muestra de dónde saca su puntuación tu build.", ["origen de la puntuación"]],
  ["kosmetik", "Cosmética / mazo", "Desbloqueos puramente cosméticos (dorsos de carta, aspectos de campo de batalla) sin efecto en el juego, por ejemplo los mazos de rango.", ["cosmética"]],
];

const out = {
  /* ---- Categories (overlay headings) ---- */
  "glossary.cat.grund": "Fundamentos",
  "glossary.cat.deck": "Mazo y cartas",
  "glossary.cat.form": "Formaciones",
  "glossary.cat.frak": "Arquetipos",
  "glossary.cat.praez": "Precisión · crítico",
  "glossary.cat.perk": "Ventajas y rareza",
  "glossary.cat.arch": "El Arquitecto",
  "glossary.cat.meta": "Progreso y meta",

  /* ---- Category one-liners (desktop page head) ---- */
  "glossary.cathint.grund": "Baza, racha, valor de combate: el vocabulario de toda partida.",
  "glossary.cathint.deck": "De qué se compone tu mazo y cómo se lee.",
  "glossary.cathint.form": "Patrones en el orden de las cartas y lo que pagan.",
  "glossary.cathint.praez": "De dónde vienen la probabilidad y el multiplicador de crítico.",
  "glossary.cathint.frak": "Los cuatro recursos, agrupados por arquetipo.",
  "glossary.cathint.perk": "Familias, niveles, rarezas, legendarias.",
  "glossary.cathint.arch": "Fase de construcción, tablero, edificios, estructura.",
  "glossary.cathint.meta": "Lo que cuenta más allá de una sola partida.",

  /* ---- Groups (archetype sub-headings) ---- */
  "glossary.group.gen": "General",
  "glossary.group.fire": "Fuego",
  "glossary.group.lightning": "Rayo",
  "glossary.group.ice": "Hielo",
  "glossary.group.plant": "Planta",
};

for (const [id, label, text, match] of E) {
  out[`glossary.${id}.label`] = label;
  out[`glossary.${id}.text`] = text;
  out[`glossary.${id}.match`] = match.join("|");
}

export default out;
