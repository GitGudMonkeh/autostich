/* ============================================================
   PERK FAMILY CATALOG — SPANISH. 73 families × (name + up to 4 tier descriptions).

   Structure mirrors src/game/families.js, including its two labour-savers — that is the point:
   the same 22 families that share ONE German sentence share ONE Spanish sentence here
   (MUSTER_ES), and the five Precision families are generated from the same constants.
   Translating the 292 rendered strings one by one would have created 292 places to keep in sync
   instead of the ~120 the German source actually has.

   Numbers are never typed out where the German interpolates them (Precision families,
   D_OVERCRIT) — same expressions, same constants. See esSkills.js for the reasoning. `numES`
   carries the Spanish decimal comma, so ×2,25 does not ship as ×2.25.

   ORDINALS ARE REPHRASED, NOT SPELLED OUT. "Jeder 12. Sieg" cannot become "12.ª" (the ordinal
   indicator is missing from the font, §5.3) and must not become "la duodécima victoria" either —
   that would drop a digit the German names and the number guard compares. "Cada 12 victorias"
   says the same thing and keeps the numeral.

   Terminology (§3): valor de baza · valor de carta · puntuación · racha · palo · segmento ·
   posición · formación · repetición · bloque de palo · escalera · zigzag · ancla · eco · núcleo ·
   bonificación de cruce · estructura · edificio · celda cubierta · probabilidad / multiplicador
   de crítico. `margen` for the combat-value gap; `ventaja` belongs to Perk alone.
   ============================================================ */
import * as C from "../game/constants.js";

const ppES = (x) => Math.round(x * 100);                  // percentage points as a whole number
const numES = (x) => String(x).replace(".", ",");         // Spanish decimal comma

/* ---- Family names ---- */
const NAMES = {
  // D · Puntuación
  D_FORMATION_BONUS: "Bonificación de Puntuación",
  D_STREAK: "Racha de Victorias",
  D_HIGH: "Cartas Altas, Gran Recompensa",
  D_UNDERDOG: "Victoria del Desvalido",
  D_TENTH_WIN: "Botín",
  // The German name says "Kritische Chance" where the English says "Crit Score"; German wins
  // (owner decision 2) and the divergence is reported in unsicherheiten_es.md. `Ocasión` rather
  // than `Probabilidad` so the name cannot be read as the crit-chance stat.
  D_CRIT_SCORE: "Ocasión Crítica",
  D_SHARP_EYE: "Vista Aguda",
  D_RHYTHM: "Ritmo Perfecto",
  D_OVERPOWER: "Supremacía",
  D_CRIT_HARVEST: "Cosecha Crítica",
  D_CRIT_MOMENTUM: "Impulso Crítico",
  D_PRECISION: "Unísono",
  D_INTERPLAY: "Juego Alterno",
  D_CRIT_FOLLOW: "Secuencia de Críticos",
  D_MISFIRE: "Fallo de Encendido",
  D_WEAKNESS: "Análisis de Debilidades",
  D_SUIT_STREAK: "Fiebre de Palo",
  D_FULL_HOUSE: "Casa Llena",
  D_OVERCRIT: "Crítico Excedente",
  D_BEBAUUNG: "Construcción Densa",
  // B · Baza
  B_COUNTER: "Contraataque",
  B_MOMENTUM: "Impulso",
  B_OPENING: "Arranque Fuerte",
  B_FINALE: "Final Fuerte",
  B_BREAKTHROUGH: "Ruptura",
  B_TENTH_STRIKE: "Mojón",
  B_INITIATIVE: "Iniciativa",
  B_TIGHT: "Por los Pelos",
  B_REVENGE: "Revancha",
  B_PERFECT: "Serie Perfecta",
  B_SUPERIOR: "Superioridad",
  // A · Mazo
  A_WEAK_STRONG: "Las Débiles se Hacen Fuertes",
  A_HIGH_STRONG: "Las Fuertes se Hacen Más Fuertes",
  A_TOP: "Fomento de la Élite",
  A_BOTTOM: "Rezagadas",
  A_EVEN: "Fuerza Par",
  A_ODD: "Fuerza Impar",
  A_SUIT_BOOST: "Refuerzo de Palo",
  A_SMALL_BIG: "Pequeñas a lo Grande",
  A_MIDRANGE: "Gama Media",
  A_SUIT_DUEL: "Duelo de Palos",
  A_CONDENSE: "Condensación",
  // C · Rol
  C_VANGUARD: "Vanguardia",
  C_TRIUMPH: "Triunfo",
  C_GUARD: "Guardaespaldas",
  C_RELAY: "Relevista",
  C_LEADER: "Líder",
  C_FINISHER: "Rematador",
  C_ECKPFEILER: "Pilar Angular",
  C_ECKSTEIN: "Clave",
  C_SURVIVOR: "Ventaja de Supervivencia",
  C_JOKER: "Comodín",
  C_SACRIFICE: "Ofrenda",
  C_BRIDGE: "Enlace",
  // E · Form.
  E_TUNING: "Ajuste Fino",
  E_PACE: "Marcapasos",
  E_COLORBRIDGE: "Puente de Palos",
  E_GENTLE: "Pendiente Suave",
  E_BIGSTEP: "Gran Paso",
  E_PENDULUM: "Péndulo",
  E_RPM: "Revoluciones",
  E_LOSS: "Pérdida de Control",
  E_QUICKSHOT: "Disparo Rápido",
  E_SEGMENT: "Trabajo de Segmento",
  E_STRONG_REP: "Repetición Reforzada",
  E_AFTERGLOW: "Eco",
  E_COLOR_ALLIANCE: "Alianza de Palos",
  E_CORE: "Núcleo de Formación",
  // P · Precisión
  P_SHARPNESS: "Agudeza",
  P_FORCE: "Potencia",
  P_AIM: "Puntería",
  P_LENS: "Lupa ardiente",
  P_COLORFOCUS: "Enfoque de Palo",
};

/* ---- Pattern descriptions ----
   Same 22 families as MUSTER_DESC in families.js, same $0/$1 placeholders, same tier order.
   Keeping the shape identical means a change over there is obvious over here.
   D_TENTH_WIN carries the only grouped number in this table: 1.000 with the Spanish (and German)
   thousands point, not the English comma. */
const MUSTER_ES = {
  A_WEAK_STRONG: { tpl: "Todos los $0 originales: +$1 de valor de carta permanente.", vals: [["5", "1"], ["4", "2"], ["3", "3"], ["1 y los 2", "4"]] },
  A_HIGH_STRONG: { tpl: "Todos los $0 originales: +$1 de valor de carta permanente.", vals: [["6", "1"], ["7", "2"], ["8", "3"], ["9 y los 10", "4"]] },
  A_TOP: { tpl: "Las $0 cartas más altas en este momento: +$1 de valor de carta permanente cada una.", vals: [["dos", "2"], ["tres", "3"], ["cuatro", "4"], ["cinco", "5"]] },
  A_BOTTOM: { tpl: "Las $0 cartas más bajas en este momento: +$1 de valor de carta permanente cada una.", vals: [["dos", "3"], ["tres", "4"], ["cuatro", "5"], ["cinco", "6"]] },
  B_COUNTER: { tpl: "Tras una derrota: la carta siguiente +$0 de valor de baza.", vals: [["3"], ["5"], ["7"], ["10"]] },
  B_MOMENTUM: { tpl: "Tras exactamente $0 victorias seguidas: la carta siguiente +$1 de valor de baza.", vals: [["4", "4"], ["3", "5"], ["3", "7"], ["3", "10"]] },
  B_OPENING: { tpl: "Las primeras $0 cartas de cada ciclo: +$1 de valor de baza cada una.", vals: [["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]] },
  B_FINALE: { tpl: "Las últimas $0 cartas de cada ciclo: +$1 de valor de baza cada una.", vals: [["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]] },
  B_BREAKTHROUGH: { tpl: "Tras $0 bazas sin victoria: la carta siguiente +$1 de valor de baza.", vals: [["6", "7"], ["5", "10"], ["4", "12"], ["3", "15"]] },
  C_VANGUARD: { tpl: "Elige $0: +$2 de valor de baza en las posiciones $1.", vals: [["1 carta", "1–5", "2"], ["2 cartas", "1–5", "3"], ["3 cartas", "1–5", "4"], ["4 cartas", "1–10", "4"]] },
  C_TRIUMPH: { tpl: "Elige $0: tras una victoria, +$1 de valor de baza la próxima vez que salga.", vals: [["1 carta", "2"], ["2 cartas", "2"], ["3 cartas", "3"], ["4 cartas", "4"]] },
  D_FORMATION_BONUS: { tpl: "Victoria con 1 o más formaciones activas: +$0 de puntuación.", vals: [["50"], ["100"], ["175"], ["300"]] },
  D_STREAK: { tpl: "Cada victoria: +$0 de puntuación por punto de racha (máx. +$1).", vals: [["15", "150"], ["25", "250"], ["35", "420"], ["50", "750"]] },
  D_HIGH: { tpl: "Victoria con valor de carta $0 o más: +$1 de puntuación.", vals: [["9", "100"], ["8", "150"], ["7", "225"], ["6", "350"]] },
  D_UNDERDOG: { tpl: "Victoria con valor de carta $0 o menos: +$1 de puntuación.", vals: [["2", "250"], ["3", "350"], ["4", "500"], ["5", "750"]] },
  D_TENTH_WIN: { tpl: "Cada $0 victorias de la partida: +$1 de puntuación.", vals: [["12", "600"], ["10", "800"], ["8", "900"], ["5", "1.000"]] },
  D_CRIT_SCORE: { tpl: "Cada crítico: +$0 de puntuación.", vals: [["100"], ["175"], ["275"], ["450"]] },
  D_SHARP_EYE: { tpl: "Crítico con valor de carta $0 o más: +$1 de puntuación.", vals: [["9", "225"], ["8", "350"], ["7", "500"], ["6", "750"]] },
  D_RHYTHM: { tpl: "En ritmo: cada $0 victorias dan +$1 de puntuación.", vals: [["7", "250"], ["5", "350"], ["4", "450"], ["3", "600"]] },
  D_OVERPOWER: { tpl: "Victoria con un margen de $0 o más: +$1 de puntuación.", vals: [["10", "300"], ["8", "400"], ["6", "550"], ["4", "750"]] },
  D_CRIT_HARVEST: { tpl: "Crítico en 1 o más formaciones activas: +$0 de puntuación.", vals: [["175"], ["300"], ["475"], ["750"]] },
  E_TUNING: { tpl: "$0: +$1 de energía.", vals: [["Cada segunda fase de orden", "1"], ["Cada fase de orden", "1"], ["Cada fase de orden", "2"], ["Cada fase de orden", "3"]] },
};

/* ---- Individually written tier descriptions ---- */
const DESCS = {
  D_CRIT_MOMENTUM: [
    "Cada crítico en una racha de 3 o más: +150 de puntuación.",
    "Cada crítico en una racha de 2 o más: +250 de puntuación.",
    "Cada crítico en una racha: +350 de puntuación.",
    "Cada crítico en una racha: +500 de puntuación; la racha sube además en 1.",
  ],
  D_PRECISION: [
    "Dos victorias seguidas con el mismo valor de carta: +250 de puntuación en la segunda.",
    "Dos victorias seguidas con el mismo valor de carta: +450 de puntuación en la segunda.",
    "Dos victorias seguidas con el mismo valor o con 1 de diferencia: +550 de puntuación en la segunda.",
    "Dos victorias seguidas con el mismo valor o con 1 de diferencia: +800 de puntuación; la cadena sigue (cada victoria encadenada con el mismo valor paga).",
  ],
  D_INTERPLAY: [
    "Victoria justo después de una derrota: +150 de puntuación.",
    "Victoria justo después de una derrota: +275 de puntuación.",
    "Victoria justo después de una derrota: +450 de puntuación.",
    "Victoria justo después de una derrota: +700 de puntuación; la siguiente derrota da +200 de puntuación guardada.",
  ],
  D_CRIT_FOLLOW: [
    "Victoria justo después de un crítico: +150 de puntuación.",
    "Victoria justo después de un crítico: +275 de puntuación.",
    "Victoria justo después de un crítico: +450 de puntuación.",
    "Victoria justo después de un crítico: +700 de puntuación; si esa victoria encadenada es a su vez un crítico, +300 más.",
  ],
  D_MISFIRE: [
    "Cada victoria sin crítico carga +20 de puntuación para el próximo crítico (máx. +200).",
    "Cada victoria sin crítico carga +35 de puntuación para el próximo crítico (máx. +350).",
    "Cada victoria sin crítico carga +50 de puntuación para el próximo crítico (máx. +500).",
    "Cada victoria sin crítico carga +75 de puntuación (máx. +750); tras un crítico queda el 25 % de la carga.",
  ],
  D_WEAKNESS: [
    "Tras una derrota con 7 o más de diferencia de valor: la próxima victoria +250 de puntuación.",
    "Tras una derrota con 5 o más de diferencia de valor: la próxima victoria +350 de puntuación.",
    "Tras una derrota con 4 o más de diferencia de valor: la próxima victoria +500 de puntuación.",
    "Tras cualquier derrota: la próxima victoria +600 de puntuación; con 5 o más de diferencia de valor, +900.",
  ],
  D_SUIT_STREAK: [
    "Victorias seguidas del mismo palo: +75 de puntuación más cada una (máx. +300).",
    "Victorias seguidas del mismo palo: +100 de puntuación más cada una (máx. +500).",
    "Victorias seguidas del mismo palo: +150 de puntuación más cada una (máx. +750).",
    "Victorias seguidas del mismo palo: +200 de puntuación más cada una (máx. +1.200); un cambio de palo reduce la racha de palo a la mitad en vez de reiniciarla.",
  ],
  D_FULL_HOUSE: [
    "Cinco victorias en un segmento: +500 de puntuación en la quinta.",
    "Cuatro victorias en un segmento: +650 de puntuación en la cuarta.",
    "Cuatro victorias en un segmento: +900 de puntuación en la cuarta.",
    "Tres victorias en un segmento: +1.000 de puntuación en la tercera; la quinta victoria da +1.000 de puntuación más.",
  ],
  D_OVERCRIT: [
    "Crítico por encima del 110 % de probabilidad de crítico efectiva: +200 de puntuación.",
    "Crítico por encima del 100 % de probabilidad de crítico efectiva: +300 de puntuación.",
    "Cada crítico excedente (por encima del 100 %): +500 de puntuación.",
    `Cada crítico excedente: +500 de puntuación más 5 por cada punto porcentual por encima del 100 % (se cuentan como máximo ${C.OVERCRIT_EXCESS_PP_CAP} puntos porcentuales).`,
  ],
  D_BEBAUUNG: [
    "Cada victoria: +4 de puntuación por celda cubierta (máx. +100).",
    "Cada victoria: +6 de puntuación por celda cubierta (máx. +160).",
    "Cada victoria: +9 de puntuación por celda cubierta (máx. +240).",
    "Cada victoria: +12 de puntuación por celda cubierta (máx. +360).",
  ],
  B_TENTH_STRIKE: [
    "Cartas en las posiciones 20 y 40: +6 de valor de baza.",
    "Cartas en las posiciones 10, 20, 30 y 40: +6 de valor de baza.",
    "Cada quinta posición (5, 10 … 40): +6 de valor de baza.",
    "Cada quinta posición: +8 de valor de baza.",
  ],
  B_INITIATIVE: [
    "Tras dos derrotas ganas el siguiente empate.",
    "Tras una derrota ganas el siguiente empate.",
    "Tras una derrota: la carta siguiente +1 de valor de baza y gana el siguiente empate.",
    "Tras una derrota: la carta siguiente +2 de valor de baza y gana el siguiente empate.",
  ],
  B_TIGHT: [
    "Si la carta está en una repetición: +1 de valor de baza.",
    "Si la carta está en una repetición: +2 de valor de baza.",
    "Si la carta está en 1 o más formaciones: +2 de valor de baza.",
    "Si la carta está en 1 o más formaciones: +3 de valor de baza.",
  ],
  B_REVENGE: [
    "Tras tres derrotas seguidas: la carta siguiente +6 de valor de baza.",
    "Tras dos derrotas seguidas: la carta siguiente +7 de valor de baza.",
    "Tras dos derrotas seguidas: las dos cartas siguientes +6 de valor de baza cada una.",
    "Tras cualquier derrota: la carta siguiente +8 de valor de baza.",
  ],
  B_PERFECT: [
    "Cartas de escalera: +0/+0/+1, después +2 de valor de baza.",
    "Cartas de escalera: +1/+2/+3, después +4 de valor de baza.",
    "Cartas de escalera: +2/+3/+4, después +5 de valor de baza.",
    "Cartas de escalera: +3/+4/+5, después +6 de valor de baza.",
  ],
  B_SUPERIOR: [
    "Valor de carta 2 o más por encima de la anterior: +2 de valor de baza.",
    "Valor de carta por encima de la anterior: +3 de valor de baza.",
    "Valor de carta no inferior al de la anterior: +3 de valor de baza.",
    "Valor de carta por encima de la anterior: +5 de valor de baza; exactamente igual: +2.",
  ],
  A_EVEN: [
    "Cuatro cartas pares al azar: +1 de valor de carta permanente.",
    "Todos los 2 y los 8 originales: +1 de valor de carta permanente.",
    "Todos los 4 y los 6 originales: +1 de valor de carta permanente.",
    "Todas las cartas pares: +1 de valor de carta permanente (además de los niveles anteriores).",
  ],
  A_ODD: [
    "Cuatro cartas impares al azar: +1 de valor de carta permanente.",
    "Todos los 3 y los 7 originales: +1 de valor de carta permanente.",
    "Todos los 1 y los 9 originales: +1 de valor de carta permanente.",
    "Todas las cartas impares: +1 de valor de carta permanente (además de los niveles anteriores).",
  ],
  A_SUIT_BOOST: [
    "Un palo al azar: cuatro cartas al azar +1 de valor de carta permanente.",
    "Un palo al azar: todas sus cartas +1 de valor de carta permanente.",
    "Elige un palo: todas sus cartas +1 de valor de carta permanente.",
    "Elige un palo: todas sus cartas +2 de valor de carta permanente.",
  ],
  A_SMALL_BIG: [
    "Dos cartas originales de 1 a 3 al azar: +3 de valor de carta permanente cada una.",
    "Tres cartas originales de 1 a 3 al azar: +4 de valor de carta permanente cada una.",
    "Cuatro cartas originales de 1 a 3 al azar: +5 de valor de carta permanente cada una.",
    "Todas las cartas originales de 1 a 3: +3 de valor de carta permanente cada una.",
  ],
  A_MIDRANGE: [
    "Tres cartas al azar con valor actual de 4 a 7: +1 de valor de carta permanente.",
    "Cinco cartas al azar con valor actual de 4 a 7: +1 de valor de carta permanente.",
    "Todas las cartas con valor actual de 4 a 7: +1 de valor de carta permanente.",
    "Todas las cartas con valor actual de 3 a 8: +1 de valor de carta permanente.",
  ],
  A_SUIT_DUEL: [
    "Un palo al azar +1 de valor de carta permanente, otro −1 de valor de carta.",
    "Un palo al azar +2 de valor de carta permanente, otro −1 de valor de carta.",
    "Elige el palo ganador (+3 de valor de carta); otro palo al azar pierde 1 de valor de carta.",
    "Elige el palo ganador y el perdedor: +4 / −1 de valor de carta.",
  ],
  A_CONDENSE: [
    "Dos cartas al azar de grupos de valor que aparecen más de una vez: +1 de valor de carta permanente.",
    "Cuatro cartas al azar de grupos de valor que aparecen más de una vez: +1 de valor de carta permanente.",
    "Todas las cartas de grupos de valor con 3 o más apariciones: +1 de valor de carta permanente.",
    "Todas las cartas de grupos de valor que aparecen más de una vez: +1 de valor de carta permanente.",
  ],
  C_GUARD: [
    "Elige 1 carta: si la carta anterior pierde, +3 de valor de baza.",
    "Elige 2 cartas: si la carta anterior pierde, +4 de valor de baza.",
    "Elige 3 cartas: si la carta anterior pierde, +5 de valor de baza.",
    "Elige 4 cartas: si pierde una de las dos cartas anteriores, +6 de valor de baza.",
  ],
  C_RELAY: [
    "Elige 1 carta: tras su victoria, la carta inmediatamente siguiente +2 de valor de baza.",
    "Elige 2 cartas: tras su victoria, la carta inmediatamente siguiente +2 de valor de baza.",
    "Elige 3 cartas: tras su victoria, la carta inmediatamente siguiente +3 de valor de baza.",
    "Elige 4 cartas: tras su victoria, las dos cartas siguientes +3 de valor de baza cada una.",
  ],
  C_LEADER: [
    "Elige 1 carta: tras su victoria, la carta siguiente +2 de valor de baza.",
    "Elige 1 carta: tras su victoria, las dos cartas siguientes +2 de valor de baza cada una.",
    "Elige 2 cartas: tras su victoria, las dos cartas siguientes +3 de valor de baza cada una.",
    "Elige 2 cartas: tras su victoria, las tres cartas siguientes +4 de valor de baza cada una.",
  ],
  C_FINISHER: [
    "Elige 1 carta: +3 de valor de baza en la última posición de un segmento.",
    "Elige 2 cartas: +4 de valor de baza en la última posición de un segmento.",
    "Elige 3 cartas: +5 de valor de baza en la última posición de un segmento.",
    "Elige 4 cartas: +5 de valor de baza en las dos últimas posiciones de un segmento.",
  ],
  C_ECKPFEILER: [
    "Elige 1 carta: si está en 1 o más formaciones, +3 de valor de baza.",
    "Elige 2 cartas: en 1 o más formaciones, +4 de valor de baza.",
    "Elige 3 cartas: en 1 o más formaciones, +5 de valor de baza.",
    "Elige 4 cartas: en 1 o más formaciones +6; si la carta está en 2 o más formaciones, +9 de valor de baza.",
  ],
  C_ECKSTEIN: [
    "Elige 1 carta: si está en un edificio, +3 de valor de baza.",
    "Elige 2 cartas: en un edificio, +4 de valor de baza.",
    "Elige 3 cartas: en un edificio, +5 de valor de baza.",
    "Elige 4 cartas: en un edificio +6; en una estructura completada +9 de valor de baza.",
  ],
  C_SURVIVOR: [
    "La carta más baja de los cuatro primeros segmentos: +2 de valor de baza.",
    "La carta más baja de cada segmento: +2 de valor de baza.",
    "Las dos cartas más bajas de cada segmento: +3 de valor de baza.",
    "Las dos cartas más bajas de cada segmento: +5 de valor de baza.",
  ],
  C_JOKER: [
    "Elige 1 carta: cuenta para un bloque de palo con el palo de la carta anterior.",
    "Elige 2 cartas: cuentan para un bloque de palo con el palo de la carta anterior.",
    "Elige 3 cartas: cuentan para un bloque de palo con el palo anterior o el siguiente.",
    "Elige 4 cartas: cuentan para un bloque de palo con cualquier palo.",
  ],
  C_SACRIFICE: [
    "Elige 1 carta: −2 de valor de carta permanente, la carta inmediatamente siguiente +3 de valor de carta.",
    "Elige 1 carta: −2 de valor de carta permanente, la carta inmediatamente siguiente +4 de valor de carta.",
    "Elige 1 carta: −3 de valor de carta permanente, la carta inmediatamente siguiente +6 de valor de carta.",
    "Elige 2 cartas: −3 de valor de carta permanente cada una, la carta inmediatamente siguiente a cada una +7 de valor de carta.",
  ],
  C_BRIDGE: [
    "Elige 1 carta: puede contar como ±1 de valor para una escalera.",
    "Elige 2 cartas: pueden contar como ±1 de valor para una escalera.",
    "Elige 3 cartas: pueden diferir en 1 o 2 para una escalera.",
    "Elige 4 cartas: pueden tomar cualquier valor entre sus vecinas para una escalera.",
  ],
  E_PACE: [
    "Una vez por segmento, una repetición puede saltar una carta ajena.",
    "Cada repetición puede saltar una carta ajena.",
    "Cada repetición puede saltar hasta dos cartas ajenas.",
    "Las cartas ajenas no interrumpen las repeticiones (no cuentan para ellas).",
  ],
  E_COLORBRIDGE: [
    "Una vez por segmento, un bloque de palo puede saltar un palo ajeno.",
    "Cada bloque de palo puede contener un palo ajeno.",
    "Cada bloque de palo puede contener dos palos ajenos.",
    "Los palos ajenos no interrumpen los bloques de palo (no cuentan para ellos).",
  ],
  E_GENTLE: [
    "Una vez por segmento, una escalera puede contener un empate.",
    "Cada escalera puede contener un empate.",
    "Cada escalera puede contener dos empates.",
    "Los valores iguales cuentan como un paso en las escaleras cuando hace falta.",
  ],
  E_BIGSTEP: [
    "Una vez por segmento, una escalera puede contener un paso atrás.",
    "Cada escalera puede contener un paso atrás.",
    "Cada escalera puede contener dos pasos atrás.",
    "Las escaleras pueden cambiar de dirección.",
  ],
  E_PENDULUM: [
    "Para un zigzag basta una diferencia entre vecinas de 3 (en vez de 4); sigue siendo a partir de 3 cartas.",
    "Un zigzag solo necesita ya 2 cartas (la diferencia entre vecinas sigue siendo ≥4).",
    "Un zigzag solo necesita ya 2 cartas, y basta con una diferencia entre vecinas de 3.",
    "Un zigzag solo necesita ya 2 cartas, y basta con una diferencia entre vecinas de 2; los zigzags de dos cuentan desde ×1,35.",
  ],
  E_RPM: [
    "Una vez por segmento, una carta puede pertenecer a dos escaleras.",
    "Hasta dos cartas por segmento pueden pertenecer a dos escaleras.",
    "Hasta tres cartas por segmento pueden pertenecer a dos escaleras.",
    "Cada carta puede pertenecer a dos escaleras a la vez.",
  ],
  E_LOSS: [
    "Las posiciones 20 y 40 cuentan como anclas (×1,25).",
    "Las posiciones 10, 20, 30 y 40 cuentan como anclas (×1,25).",
    "Cada posición final de segmento cuenta como ancla (×1,25).",
    "Cada posición final de segmento cuenta como ancla (×1,35).",
  ],
  E_QUICKSHOT: [
    "Las posiciones 5 y 25 cuentan como anclas (×1,25).",
    "Las posiciones 5, 15, 25 y 35 cuentan como anclas (×1,25).",
    "Cada quinta posición (5, 10 … 40) cuenta como ancla (×1,25).",
    "Cada quinta posición cuenta como ancla (×1,35) y recibe +2 de valor de baza.",
  ],
  E_SEGMENT: [
    "Un límite de segmento está abierto; las formaciones pueden cruzarlo.",
    "Dos límites de segmento están abiertos.",
    "Todos los límites de segmento están abiertos.",
    "Todos los límites de segmento están abiertos; las cartas de una formación que cruza un límite dan ×1,25 de puntuación adicional.",
  ],
  E_STRONG_REP: [
    "Segunda carta de una repetición: ×1,30 (en vez de ×1,25).",
    "Segunda carta de una repetición: ×1,35.",
    "Segunda y tercera carta de repetición: +0,10 cada una en su factor de formación.",
    "Todos los factores de repetición: ×1,20 adicional.",
  ],
  E_AFTERGLOW: [
    "El factor de formación de tu repetición se transmite a la carta siguiente (como máximo ×1,20), aunque esa carta no forme parte de la formación.",
    "Funciona con todas las formaciones; factor como máximo ×1,25.",
    "Transmite por completo el factor individual más fuerte.",
    "Transmite el factor individual más fuerte y lo mantiene durante las dos cartas siguientes.",
  ],
  E_COLOR_ALLIANCE: [
    "Elige 2 palos: cuentan como el mismo palo en todas las puntuaciones de palo, salvo en Refuerzo de Palo y Duelo de Palos.",
    "Elige 3 palos: cuentan como el mismo palo en todas las puntuaciones de palo, salvo en Refuerzo de Palo y Duelo de Palos.",
    "Los cuatro cuentan como el mismo palo en todas las puntuaciones de palo, salvo en Refuerzo de Palo y Duelo de Palos.",
    "Los cuatro cuentan como el mismo palo y los bloques de palo empiezan en ×1,55 (en vez de ×1,35), salvo en Refuerzo de Palo y Duelo de Palos.",
  ],
  E_CORE: [
    "Elige 1 tipo de formación: sus formaciones activas ×1,15 adicional.",
    "Elige 1 tipo de formación: sus formaciones activas ×1,25 adicional.",
    "Elige 1 tipo de formación: sus formaciones activas ×1,40 adicional.",
    "Elige 1 tipo de formación: sus formaciones activas ×1,50 adicional (eco incluido).",
  ],
  /* Precision — the German source builds these from indexed constants; so does the Spanish. */
  P_SHARPNESS: C.PRECISION_SHARP_PP.map((pp) => `Todas las cartas: +${ppES(pp)} % de probabilidad de crítico.`),
  P_FORCE: C.PRECISION_FORCE_MULT.map((m) => `+${numES(m)}× de multiplicador de crítico (sobre una base de ${numES(C.CRIT_BASE_MULT)}×).`),
  P_AIM: C.PRECISION_AIM_THRESH.map((th) => `Cartas con valor ${th} o más: +${ppES(C.PRECISION_AIM_PP)} % de probabilidad de crítico.`),
  P_LENS: C.PRECISION_LENS_PP.map((pp) => `+${ppES(pp)} % de probabilidad de crítico por cada formación simultánea a partir de la segunda en la posición ganadora (máx. ${C.PRECISION_LENS_CAP} extra).`),
  P_COLORFOCUS: C.PRECISION_COLOR_PP.map((pp, i) => (i < 3
    ? `Elige un palo: las cartas de ese palo +${ppES(pp)} % de probabilidad de crítico.`
    : `Elige DOS palos: las cartas de esos palos +${ppES(pp)} % de probabilidad de crítico cada una.`)),
};

/* ---- Assemble ---- */
const out = {};
for (const [id, name] of Object.entries(NAMES)) out[`family.${id}.name`] = name;
for (const [id, m] of Object.entries(MUSTER_ES)) {
  for (let t = 1; t <= 4; t++) {
    out[`family.${id}.tier${t}.desc`] = m.tpl.replace(/\$(\d)/g, (_, i) => m.vals[t - 1][+i]);
  }
}
for (const [id, list] of Object.entries(DESCS)) {
  list.forEach((d, i) => { out[`family.${id}.tier${i + 1}.desc`] = d; });
}

export default out;
