/* ============================================================
   PERK CATALOG — SPANISH. Legendary perks + perk categories.
   Mirrors src/game/perks.js; the numbers are the SAME expressions, never typed out
   (see esSkills.js for the reasoning and the guard that enforces it).

   Terminology (§3.5): ventaja · categoría · valor de baza · valor de carta · margen · racha ·
   probabilidad de crítico / multiplicador de crítico · estructura · espacio de construcción ·
   segmento · racha de palo.

   ONE DIFFERENCE FROM enPerks.js THAT MATTERS. Its `num` helper is `String(x)`, which prints
   1.6 — correct in English, and a foreign decimal separator inside a Spanish catalog, which the
   number-format guard rejects outright. Spanish shares the GERMAN convention (package §5.4), so
   `num` here swaps the point for a comma. Without it every ×1,6 in this file would silently ship
   as ×1.6.
   ============================================================ */
import * as C from "../game/constants.js";
import { SEGMENT_SIZE } from "../game/formations.js"; // as in perks.js — the segment length is never typed out

const num = (x) => String(x).replace(".", ",");   // decimal comma, like the German source
const pct = (x) => Math.round(x * 100);

export default {
  /* ---- Perk categories (chips on the offer cards — keep the names SHORT) ----
     `perkcat.D.name` is the abbreviated `Punt.` rather than the full `Puntuación`: the chip is
     narrow and package §3.1 blesses exactly this device for a tight cell (it does the same for
     `crít.`). The description one line below carries the full word. */
  "perkcat.A.name": "Mazo",
  "perkcat.A.desc": "Valores de carta permanentes",
  "perkcat.B.name": "Baza",
  "perkcat.B.desc": "Efectos de baza",
  "perkcat.C.name": "Rol",
  "perkcat.C.desc": "Roles de carta",
  "perkcat.D.name": "Punt.",
  "perkcat.D.desc": "Puntuación",
  "perkcat.E.name": "Form.",
  "perkcat.E.desc": "Herramientas de formación",
  "perkcat.P.name": "Precisión",
  "perkcat.P.desc": "Probabilidad y multiplicador de crítico",
  "perkcat.S.name": "Equipo",
  "perkcat.S.desc": "Ranuras y economía",

  /* ---- Legendary perks ---- */
  "perk.L2.label": "Imparable",
  "perk.L2.desc": `Mientras sigas ganando, la carta siguiente recibe +${C.UNAUFHALTSAM_VALUE} de valor de baza (hasta que pierdas).`,

  "perk.L6.label": "Frenesí",
  "perk.L6.desc": `Cada victoria seguida da +${pct(C.RASEREI_CRIT_STEP)} % de probabilidad de crítico. Si tu probabilidad total de crítico supera el 100 %, el excedente sube además el multiplicador de crítico: +0,01× por cada punto porcentual de más, hasta un máximo de +1,00×.`,

  "perk.L4.label": "Masa Crítica",
  "perk.L4.desc": `Cada crítico da a esa carta +1 de valor de carta de forma permanente (como máximo +${C.KRITMASSE_VALUE}).`,

  "perk.L_UMV.label": "Redistribución",
  "perk.L_UMV.desc": "Al instante: todas las cartas adoptan de forma permanente el valor de carta medio del mazo (no se quita ninguna carta). Fuerte con un mazo desequilibrado.",

  "perk.L_ZINS.label": "Interés Compuesto",
  "perk.L_ZINS.desc": `El banco: cada baza que ganas ingresa el ${pct(C.ZINS_DEPOSIT)} % de su puntuación en el capital. Si un ciclo termina con al menos un ${pct(C.ZINS_HURDLE_RATE)} % de victorias, paga capital × tipo de interés y el tipo sube ${pct(C.ZINS_RATE_STEP)} puntos porcentuales (empieza en el ${pct(C.ZINS_RATE_START)} %, hasta un máximo del ${pct(C.ZINS_RATE_MAX)} %); el capital se queda. Si no llegas a la cuota, la cuenta quiebra: se pierde el ${pct(1 - C.ZINS_CRASH_KEEP)} % del capital y el tipo baja ${pct(C.ZINS_RATE_STEP * C.ZINS_CRASH_STEPS)} puntos porcentuales.`,

  "perk.L_VAB.label": "Todo o Nada",
  "perk.L_VAB.desc": `Apuesta de apertura: cada vez que ganas seguidas las primeras ${C.VABANQUE_TRICKS} bazas de un ciclo, pagan además ${num(C.VABANQUE_MULT)}× su propia puntuación.`,

  "perk.L_HENK.label": "Verdugo",
  "perk.L_HENK.desc": `En el último segmento (posiciones ${C.HENKER_ZONE_START + 1}–40), cada victoria cuenta ×${num(C.HENKER_MULT)} y es un crítico garantizado.`,

  "perk.L_ECHO.label": "Eco",
  "perk.L_ECHO.desc": `Al final de cada ciclo, tu baza de mayor puntuación de ese ciclo se abona una vez más ×${num(C.ECHO_FACTOR)}.`,

  "perk.L_SAMM.label": "Coleccionista",
  "perk.L_SAMM.desc": `Cada tipo de formación distinto que gane durante un ciclo (como máximo ${C.SAMMLER_MAX}) da +${num(C.SAMMLER_STEP)} de multiplicador de formación durante el resto del ciclo.`,

  "perk.L_BRENN.label": "Punto Focal",
  "perk.L_BRENN.desc": `Cuando una carta gana dentro de al menos ${C.BRENNPUNKT_MIN_FORMS} formaciones a la vez, la baza cuenta ×${num(C.BRENNPUNKT_MULT)}.`,

  "perk.L_PATT.label": "Tablas",
  "perk.L_PATT.desc": `Una derrota por ${C.PATT_MARGIN} de valor o menos cuenta como victoria.`,

  "perk.L_MONO.label": "Monocromo",
  "perk.L_MONO.desc": `Victorias consecutivas del mismo palo: +${pct(C.MONOCHROM_STEP)} % de puntuación por cada victoria encadenada, hasta +${pct(C.MONOCHROM_CAP)} %. Un cambio de palo o una derrota reinicia la racha de palo.`,

  // Coronación: the Spanish building trade calls topping out exactly that, which keeps the
  // German ceremony word a ceremony word rather than flattening it to "estructura terminada".
  "perk.L_RICHT.label": "Coronación",
  "perk.L_RICHT.desc": `Al final de cada ciclo: por cada estructura completada (fila, columna o diagonal completa), un ${pct(C.RICHTFEST_STEP)} % adicional de la puntuación conseguida en ese ciclo.`,

  "perk.L_BAUH.label": "Logia de Canteros",
  "perk.L_BAUH.desc": `Al instante: el espacio de construcción del Arquitecto crece de forma permanente en ${C.BAUHUETTE_COVER} celdas. Puedes colocar más edificios.`,

  "perk.L_MEIS.label": "Mano Maestra",
  "perk.L_MEIS.desc": `Al instante: tienes de forma permanente ${C.MEISTERHAND_SLOTS === 1 ? "una habilidad" : `${C.MEISTERHAND_SLOTS} habilidades`} más (${C.SKILL_SLOTS} → ${C.SKILL_SLOTS + C.MEISTERHAND_SLOTS}).`,

  "perk.L_SCHM.label": "Forja",
  "perk.L_SCHM.desc": `Al final de cada ciclo, la carta más débil de tu mazo gana de forma permanente +${C.SCHMIEDE_STEP} de valor de carta.`,

  "perk.L_HOCH.label": "Cuerda Floja",
  "perk.L_HOCH.desc": `Mientras no hayas encajado ni una derrota en este ciclo, cada victoria cuenta ×${num(C.HOCHSEIL_MULT)}. La primera derrota lo desactiva hasta el ciclo siguiente.`,

  "perk.L_OPFER.label": "Sacrificio",
  "perk.L_OPFER.desc": `Al instante: todas las cartas pierden de forma permanente ${C.OPFERGANG_VALUE} de valor de carta (hasta un mínimo de 1). A cambio, cada victoria cuenta ×${num(C.OPFERGANG_MULT)}.`,

  "perk.L_TAKT.label": "Golpe de Compás",
  "perk.L_TAKT.desc": `Gana las ${SEGMENT_SIZE} bazas de un segmento y la baza final cuenta ×${num(C.TAKTSCHLAG_MULT)}.`,

  "perk.L_BALL.label": "Lastre",
  "perk.L_BALL.desc": `Cada fase de orden tiene ${C.BALLAST_ENERGY} de energía de orden menos. A cambio, cada multiplicador de formación cuenta ×${num(C.BALLAST_FORM_MULT)}.`,

  "perk.L_FUND.label": "Cimiento",
  "perk.L_FUND.desc": `Cada estructura completada golpea más fuerte: la fila, la columna y la diagonal dan cada una +${num(C.FUNDAMENT_BONUS)} a su factor.`,
};
