/* ============================================================
   SKILL CATALOG — SPANISH. Mirrors src/game/skills.js entry for entry.

   IMPORTANT — the numbers are NOT typed out. Every figure is the SAME expression the German
   source uses (`${C.STATIC_CHARGE}`, `${pct(C.STORM_CRIT_CAP)}` …), pulled from the same
   constants. A balance change therefore moves all three languages at once; there is no second
   place where a tuning number could go stale. This file carries 77 of them, more than any other.

   `num()` and `grp()` below are the Spanish siblings of `de()`/`grp()` in skills.js, and they are
   the German ones, not the English: Spanish uses the decimal COMMA and the point as the thousands
   separator (package §5.4). Copying enSkills.js verbatim would have shipped ×1.6 and 6,300 into a
   Spanish catalog, which the number-format guard rejects and which reads as the wrong figure.

   Terminology per docs/localization/uebersetzerpaket_es_2026-08-26.md §3:
   ciclo · baza · valor de baza · valor de carta · margen/ventaja · racha · carga · ionización ·
   acumulación · calor · marca · ceniza · forja · calor blanco · brasa de ceniza · glaciar · masa ·
   estallido · umbral · nieve · crecimiento · verde/maduro · raíces · floración · colonizar ·
   estolón · poda.
   ============================================================ */
import * as C from "../game/constants.js";
import { ANFRIEREN_WIN as G_ANFRIEREN_WIN, ANFRIEREN_FORM as G_ANFRIEREN_FORM, SCHNEETREIBEN_SEED as G_SCHNEETREIBEN_SEED,
  DAUERFROST_NEAR as G_DAUERFROST_NEAR, DAUERFROST_FAR as G_DAUERFROST_FAR, VERDICHTUNG_RATE as G_VERDICHTUNG_RATE,
  PACKEIS_PER_NEIGHBOR as G_PACKEIS_PER, VERZAHNUNG_PER as G_VERZAHNUNG_PER, GEO_LINIE as G_GEO_LINIE, EISWALL_LINIE as G_EISWALL_LINIE,
  TIER_MULT as G_TIER_MULT, ABBRUCHKANTE_TIER_MULT as G_ABBRUCH_TIER, ZERMALMEN_KOLLISION as G_ZERMALMEN_KOLL, KOLLISION_MULT as G_KOLLISION,
  RISSBILDUNG_BURST as G_RISSBILDUNG_BURST, THRESHOLDS as G_THRESHOLDS, GLETSCHERSTURZ_PER as G_GLETSCHERSTURZ_PER,
  FROSTBUND_BUFF as G_FROSTBUND_BUFF, EISPANZER_MASS as G_EISPANZER_MASS, EISZEIT_FLOOD as G_EISZEIT_FLOOD,
  EISZEIT_MAX_GLACIERS as G_EISZEIT_MAX, SCHILD_BONUS as G_SCHILD_BONUS, ERSTARRUNG_FRAC as G_ERSTARRUNG_FRAC } from "../game/glacier.js";

const num = (x) => String(x).replace(".", ",");                          // Spanish keeps the decimal comma
const pct = (x) => Math.round(x * 100);                                  // share → percent (0.25 → 25)
const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");      // thousands separator (2000 → "2.000")

/* Amplifier skills do nothing without their base skill. The German texts label them
   "Verstärker:" — Spanish keeps the same one-word marker so the pattern stays scannable. */
const AMP = "Amplificador:";
// The pruning clause repeats verbatim across six plant skills; keep it in ONE place here too.
const PRUNE = `Poda: al sustituir la habilidad, +${pct(C.TRIM_STEP)} % permanente de puntuación de raíz y floración (hasta +${pct(C.TRIM_CAP)} %).`;

export default {
  /* ---- ⚡ Rayo ---- */
  "ability.SK_LIGHTNING_01.name": "Pararrayos",
  "ability.SK_LIGHTNING_01.desc": `Cada crítico genera +1 carga adicional. Cada consumo de carga completa devuelve +${C.BLITZABLEITER_CONSUME_CHARGE} carga.`,
  "ability.SK_LIGHTNING_08.name": "Acumulación Estática",
  "ability.SK_LIGHTNING_08.desc": `Cada victoria sin crítico genera +${C.STATIC_CHARGE} carga. Cada consumo de carga completa da +${C.CONSUME_SCORE} de puntuación directa.`,
  "ability.SK_LIGHTNING_05.name": "Corriente Residual",
  "ability.SK_LIGHTNING_05.desc": `Tras cada consumo de carga completa quedan ${C.REST_CHARGE_FLOOR} cargas en vez de 0.`,
  "ability.SK_LIGHTNING_06.name": "Frente de Tormenta",
  "ability.SK_LIGHTNING_06.desc": `Cada consumo de carga completa otorga de forma permanente +${pct(C.STORM_CRIT_STEP)} % de probabilidad de crítico (hasta +${pct(C.STORM_CRIT_CAP)} %).`,
  "ability.SK_LIGHTNING_10.name": "Descarga",
  "ability.SK_LIGHTNING_10.desc": `Cada consumo de carga completa otorga de forma permanente +${num(C.ENTLADUNG_MULT_STEP)}× de multiplicador de crítico (hasta +${num(C.ENTLADUNG_MULT_CAP)}×).`,
  "ability.SK_LIGHTNING_02.name": "Ionización",
  "ability.SK_LIGHTNING_02.desc": `Con la carga llena: ${C.ION_BASE_COUNT} cartas sin jugar se ionizan.\n\n▸ Victoria con una carta ionizada: +${C.ION_SCORE_PER_STACK} de puntuación por acumulación.\n▸ Cada acumulación del mazo: +${pct(C.ION_CRIT_PP_PER_STACK)} % de probabilidad de crítico en todo el campo (máx. +${pct(C.ION_CRIT_STACK_CAP * C.ION_CRIT_PP_PER_STACK)} %).\n▸ Cuando ~${pct(C.ION_SAT_BREADTH_FRAC)} % de las cartas están ionizadas: todas las cartas +${C.ION_SATURATION_VALUE} de valor.`,
  "ability.SK_LIGHTNING_07.name": "Racha de Carga",
  "ability.SK_LIGHTNING_07.desc": `Cada punto de racha otorga +${pct(C.SERIESCRIT_STEP)} % de probabilidad de crítico (hasta +${pct(C.SERIESCRIT_CAP)} %). No consume carga.`,
  "ability.SK_LIGHTNING_03.name": "Rayo en Cadena",
  "ability.SK_LIGHTNING_03.desc": `${AMP} Cada ionización alcanza +${C.KETTENBLITZ_COUNT} cartas más.`,
  "ability.SK_LIGHTNING_12.name": "Acelerador de Amplitud",
  "ability.SK_LIGHTNING_12.desc": `Cuando gana una carta ionizada, una acumulación de ionización salta a una carta que aún no esté ionizada; si no hay ninguna, a la siguiente carta que aún no esté llena.`,
  "ability.SK_LIGHTNING_11.name": "Cazarrayos",
  "ability.SK_LIGHTNING_11.desc": `Cuando una ionización alcanza una carta llena: +${C.BLITZFAENGER_VALUE} de valor de baza la próxima vez que salga esa carta, y +1 carga.`,
  "ability.SK_LIGHTNING_09.name": "Cortocircuito",
  "ability.SK_LIGHTNING_09.desc": `Cuando ganas con una carta totalmente ionizada: +${C.KURZSCHLUSS_SCORE} de puntuación y +${C.KURZSCHLUSS_CHARGE} de carga.`,
  "ability.SK_LIGHTNING_13.name": "Acumulación de Tensión",
  "ability.SK_LIGHTNING_13.desc": `Cada victoria sin crítico otorga +${pct(C.SPANNUNGSSTAU_STEP)} % de probabilidad de crítico para la próxima victoria (hasta +${pct(C.SPANNUNGSSTAU_CAP)} %). Un crítico lo reinicia.`,
  "ability.SK_LIGHTNING_14.name": "Arco",
  "ability.SK_LIGHTNING_14.desc": `La probabilidad de crítico por encima del 100 % se convierte en carga en cada victoria: cada ${C.UEBERSCHLAG_PP_PER_CHARGE} puntos porcentuales dan +1 carga. Cuando ~${pct(C.ION_SAT_DEPTH_FRAC)} % de las cartas están totalmente ionizadas, bastan ${C.UEBERSCHLAG_DEPTH_PP_PER_CHARGE} puntos porcentuales.`,
  "ability.SK_LIGHTNING_04.name": "Sobretensión",
  "ability.SK_LIGHTNING_04.desc": `Un crítico sobre una carta ionizada o justo al lado de ella genera +${C.UEBERSPANNUNG_CHARGE} de carga.`,
  "ability.SK_LIGHTNING_15.name": "Impacto de Rayo",
  "ability.SK_LIGHTNING_15.desc": `Cada crítico ioniza la carta con la que ganó (+${C.BLITZSCHLAG_STACKS} acumulación).`,
  "ability.SK_LIGHTNING_16.name": "Corriente Continua",
  "ability.SK_LIGHTNING_16.desc": `Cada victoria seguida otorga +1 carga por cada ${C.DAUERSTROM_PER_STREAK} puntos de racha (como máximo +${C.DAUERSTROM_MAX} por victoria). Cada consumo de carga completa otorga de forma permanente +${pct(C.DAUERSTROM_CONSUME_CRIT)} % de probabilidad de crítico (hasta +${pct(C.DAUERSTROM_CRIT_CAP)} %).`,
  "ability.SK_LIGHTNING_17.name": "Protección de Racha",
  "ability.SK_LIGHTNING_17.desc": `Si pierdes una baza con al menos un ${pct(C.SERIENSCHUTZ_COST_FRAC)} % de carga, tu racha no se rompe. Esa carga se consume a cambio.`,
  "ability.SK_LIGHTNING_L01.name": "Dios del Trueno",
  "ability.SK_LIGHTNING_L01.desc": `Los consumidores se activan ya con un ${pct(C.DONNERGOTT_THRESHOLD_FRAC)} % de carga y otorgan de forma permanente +${num(C.THUNDER_CRIT_MULT)}× de multiplicador de crítico.`,
  "ability.SK_LIGHTNING_L02.name": "Descarga Doble",
  "ability.SK_LIGHTNING_L02.desc": `Con un consumo de carga completa, el consumidor ioniza ${C.DOPPELENTLADUNG_FACTOR}× más cartas. Cada victoria con una carta ionizada da +${C.DOPPELENT_DIRECT} de puntuación por cada acumulación de ionización en el campo (hasta ${C.DOPPELENT_FIELD_CAP}), en proporción a las habilidades de Rayo que tengas.`,
  "ability.SK_LIGHTNING_L03.name": "Ionización de Área",
  "ability.SK_LIGHTNING_L03.desc": `Cuando ganas con una carta ionizada, las dos cartas vecinas sin jugar reciben +1 acumulación de ionización cada una, más +${C.FLAECHENION_DIRECT} de puntuación por cada carta ionizada en el campo (hasta ${C.FLAECHENION_FIELD_CAP}), en proporción a las habilidades de Rayo que tengas.`,
  "ability.SK_LIGHTNING_L04.name": "Perforación",
  "ability.SK_LIGHTNING_L04.desc": `Cuando una carta totalmente ionizada gana con crítico, otorga de forma permanente +${num(C.DURCHSCHLAG_CRIT_MULT)}× de multiplicador de crítico (hasta +${num(C.DURCHSCHLAG_MULT_CAP)}×).`,

  /* ---- 🔥 Fuego ---- */
  "ability.SK_FIRE_01.name": "Brasa",
  "ability.SK_FIRE_01.desc": `Las victorias con ventaja de valor de combate dan +${pct(C.EMBER_MULT - 1)} % más de calor.`,
  "ability.SK_FIRE_02.name": "Yesca",
  "ability.SK_FIRE_02.desc": `Cada victoria da +${C.ZUNDER_HEAT} % de calor, incluso con una ventaja escasa.`,
  "ability.SK_FIRE_03.name": "Tormenta de Fuego",
  "ability.SK_FIRE_03.desc": `Cada victoria seguida da +${C.FEUERSTURM_STEP} % más de calor (hasta +${C.FEUERSTURM_CAP} %). Una derrota lo reinicia.`,
  "ability.SK_FIRE_04.name": "Lecho de Brasas",
  "ability.SK_FIRE_04.desc": `Las derrotas cuestan solo el ${pct(C.GLUTBETT_MULT)} % del calor; por debajo del ${C.GLUTBETT_FREE_BELOW} % de calor, nada en absoluto.`,
  "ability.SK_FIRE_05.name": "Reencendido",
  "ability.SK_FIRE_05.desc": `Tras una derrota, la siguiente victoria da +${C.RUECKZUENDUNG_HEAT_PER_DEFICIT} % de calor por cada punto de desventaja de valor y da a la carta ganadora +${C.RUECKZUENDUNG_VALUE} de valor de baza.`,
  "ability.SK_FIRE_06.name": "Hoja Incandescente",
  "ability.SK_FIRE_06.desc": `Todas tus cartas ganan valor de baza según el calor: +${C.GLOWING_T1_VALUE} desde el ${C.GLOWING_T1_HEAT} %, +${C.GLOWING_T2_VALUE} desde el ${C.GLOWING_T2_HEAT} %, +${C.GLOWING_T3_VALUE} con el ${C.GLOWING_T3_HEAT} %. Los dos niveles superiores exigen además, dentro del segmento en curso, una victoria con ${C.GLOWING_T2_MARGIN} o ${C.GLOWING_T3_MARGIN} de ventaja respectivamente.`,
  "ability.SK_FIRE_07.name": "Calor Blanco",
  "ability.SK_FIRE_07.desc": `El calor por encima del ${C.HEAT_MAX} % se acumula como sobrecalentamiento, hasta el ${C.HEAT_MAX + C.OVERHEAT_MAX} %; cuanto más alto está, menos llega. Cada punto da +${pct(C.OVERHEAT_SCORE_STEP)} % de puntuación de fuego. Se disipa ${C.OVERHEAT_DECAY} puntos por baza, ${C.OVERHEAT_DECAY_LOSS} con una derrota.`,
  "ability.SK_FIRE_08.name": "Oleada de Fuego",
  "ability.SK_FIRE_08.desc": `A partir del ${C.FIREROLL_MIN_HEAT} % de calor, cada victoria seguida da a la carta siguiente +1 de valor de baza (hasta +${C.FIREROLL_MAX}). Una derrota lo reinicia.`,
  "ability.SK_FIRE_09.name": "Combustión",
  "ability.SK_FIRE_09.desc": `Una ventaja grande de valor de combate da más puntuación de fuego: ×${num(C.VERBRENNUNG_T1_MULT)} desde ${C.VERBRENNUNG_T1_MARGIN}, ×${num(C.VERBRENNUNG_T2_MULT)} desde ${C.VERBRENNUNG_T2_MARGIN}.`,
  "ability.SK_FIRE_10.name": "Lluvia de Chispas",
  "ability.SK_FIRE_10.desc": `Cada victoria con menos de ${C.SPARKFLIGHT_MIN_MARGIN} de ventaja ingresa ${num(C.SPARKFLIGHT_BANK_MULT)}× su puntuación de fuego más ${C.SPARKFLIGHT_FLOOR_BASE} en un depósito, +${C.SPARKFLIGHT_FLOOR_PER_SKILL} por cada habilidad de Fuego adicional. Una victoria desde ${C.SPARKFLIGHT_MIN_MARGIN} de ventaja lo reparte como puntuación; una derrota lo reduce a la mitad.`,
  "ability.SK_FIRE_11.name": "Incendio",
  "ability.SK_FIRE_11.desc": `A partir del ${C.CONFLAG_MIN_HEAT} % de calor, la siguiente victoria quema hasta el ${C.CONFLAG_KEEP} %: +${C.CONFLAG_PER_HEAT} de puntuación por punto de calor quemado, +${C.CONFLAG_PER_SKILL} por cada habilidad de Fuego adicional (con ${C.SKILL_SLOTS} habilidades de Fuego ≈ +${grp((C.HEAT_MAX - C.CONFLAG_KEEP) * (C.CONFLAG_PER_HEAT + C.CONFLAG_PER_SKILL * (C.SKILL_SLOTS - 1)))}).`,
  "ability.SK_FIRE_12.name": "Punto de Fusión",
  "ability.SK_FIRE_12.desc": `Cada victoria quema un ${C.MELT_COST} % de calor: ${C.MELT_SCORE_BASE} de puntuación por punto quemado, +${num(C.MELT_SCORE_PER_HEAT)} por cada punto porcentual de calor acumulado (${grp(Math.round(C.MELT_COST * (C.MELT_SCORE_BASE + C.MELT_SCORE_PER_HEAT * C.HEAT_MAX)))} por victoria con la barra llena). Las derrotas no cuestan calor.`,
  "ability.SK_FIRE_13.name": "Marca",
  "ability.SK_FIRE_13.desc": `Cada victoria marca una carta rival (−${C.BRAND_VALUE} de valor) y da +${C.BRAND_ASH} de ceniza.`,
  "ability.SK_FIRE_14.name": "Reguero de Fuego",
  "ability.SK_FIRE_14.desc": `${AMP} Las marcas se extienden a una carta vecina (−${C.BRAND_VALUE} de valor) y dan +${C.BRAND_ASH} de ceniza.`,
  "ability.SK_FIRE_15.name": "Forja de Ceniza",
  "ability.SK_FIRE_15.desc": `Al final de cada ciclo, tu carta más baja gana de forma permanente +${C.FORGE_VALUE} de valor de carta, siempre que tengas ${C.FORGE_COST} de ceniza o más. Cuando la forja está llena, la ceniza sobrante arde como brasa de ceniza: +${grp(C.FORGE_OVERFLOW_SCORE)} de puntuación por cada ${C.FORGE_COST} de ceniza.`,
  "ability.SK_FIRE_16.name": "Acero al Rojo",
  "ability.SK_FIRE_16.desc": `${AMP} Las cartas forjadas dan +${C.GLUTSTAHL_PER_VALUE} de puntuación por cada punto de valor forjado al ganar.`,
  "ability.SK_FIRE_17.name": "Horno de Fundición",
  "ability.SK_FIRE_17.desc": `A partir del ${C.SCHMELZOFEN_MIN_HEAT} % de calor, las marcas dan además −${C.SCHMELZOFEN_BRAND_BONUS} de valor y +${C.SCHMELZOFEN_BRAND_BONUS} de ceniza. Forjar cuesta un ${pct(C.SCHMELZOFEN_FORGE_DISCOUNT)} % menos de ceniza.`,
  "ability.SK_FIRE_L01.name": "Núcleo Solar",
  "ability.SK_FIRE_L01.desc": `Cada victoria contra una carta rival marcada da +${grp(C.SONNENKERN_BRAND_SCORE)} de puntuación por cada marca que tenga. Si un ciclo termina con un ${C.SONNENKERN_MIN_HEAT} % de calor o más, tus marcas se acumulan en vez de renovarse (hasta ${C.SONNENKERN_BRAND_CAP} por carta), y tus cartas por debajo del valor ${C.SONNENKERN_CARD_CAP} ganan de forma permanente +${C.SONNENKERN_VALUE} de valor de carta.`,
  "ability.SK_FIRE_L02.name": "Fuego de Fénix",
  // "1×/ciclo" keeps the German numeral rather than spelling it out. English had to write "once
  // per cycle" — "1× per cycle" is stiff there — and buy itself an entry in the number guard's
  // exception list for it. Spanish reads the digit perfectly well, so it needs no exception.
  "ability.SK_FIRE_L02.desc": `Las derrotas no cuestan calor: dan +${C.PHOENIX_LOSS_HEAT} % de calor por cada punto de desventaja. Si el consumo deja tu calor a 0, se reenciende 1×/ciclo al ${Math.round(C.PHOENIX_REIGNITE * 100)} %.`,
  "ability.SK_FIRE_L03.name": "Ira Solar",
  "ability.SK_FIRE_L03.desc": `Toda tu puntuación de victoria se multiplica por el nivel de calor más alto que hayas alcanzado: +${num(Math.round(C.SUNWRATH_PEAK_STEP * 1000) / 10)} % por cada punto porcentual hasta el ${C.HEAT_MAX} %, es decir hasta ×${num(Math.round((1 + C.HEAT_MAX * C.SUNWRATH_PEAK_STEP) * 100) / 100)}, y +${num(Math.round(C.SUNWRATH_OVER_STEP * 1000) / 10)} % por cada punto de sobrecalentamiento por encima, con Calor Blanco hasta ×${num(Math.round((1 + C.HEAT_MAX * C.SUNWRATH_PEAK_STEP + C.OVERHEAT_MAX * C.SUNWRATH_OVER_STEP) * 100) / 100)}.`,
  "ability.SK_FIRE_L04.name": "Acero de Damasco",
  "ability.SK_FIRE_L04.desc": `Forja tu carta más baja en cada ciclo sin ceniza (+${C.FORGE_VALUE} de valor, hasta ${C.DAMASCUS_MAX_FORGED} cartas). Las cartas forjadas combaten con +${C.DAMASCUS_COMBAT} de valor. Cada victoria da +${C.DAMASCUS_PER_VALUE} de puntuación por cada punto de valor forjado en tu mazo. Una forja son ${C.FORGE_VALUE} puntos.`,

  /* ---- ❄️ Hielo ---- */
  "ability.SK_ICE_01.name": "Congelación",
  "ability.SK_ICE_01.desc": `Una victoria de glaciar da +${num(G_ANFRIEREN_WIN)} de masa extra, y +${num(G_ANFRIEREN_FORM)} más dentro de una formación.`,
  "ability.SK_ICE_02.name": "Ventisca",
  "ability.SK_ICE_02.desc": `Cuando un glaciar gana, siembra +${num(G_SCHNEETREIBEN_SEED)} de nieve en la reserva del suelo de una de las 4 celdas abiertas contiguas, sin ceder masa propia. Solo un glaciar con 0 de masa cede en su lugar la masa de la victoria. El puente de hielo no amplía esto.`,
  "ability.SK_ICE_03.name": "Permafrost",
  "ability.SK_ICE_03.desc": `En cada ciclo, las celdas sin congelar acumulan nieve en su reserva del suelo: +${num(G_DAUERFROST_NEAR)} a 2 celdas de distancia del glaciar más cercano, +${num(G_DAUERFROST_FAR)} a partir de 3. Las 8 celdas que rodean directamente un glaciar quedan vacías. Si más tarde se congela aquí un glaciar, la reserva lo rellena al inicio del ciclo.`,
  "ability.SK_ICE_04.name": "Compactación",
  "ability.SK_ICE_04.desc": `Si un edificio sube el valor de combate de una carta de glaciar, esa bonificación no se juega, sino que se convierte en masa: +${num(G_VERDICHTUNG_RATE)} de masa por punto. Los edificios de puntuación no se ven afectados.`,
  "ability.SK_ICE_05.name": "Fusión",
  "ability.SK_ICE_05.desc": `Al inicio de un ciclo, los glaciares contiguos se elevan mutuamente hasta la masa media de su agrupación, sin bajar nunca.`,
  "ability.SK_ICE_06.name": "Banquisa",
  "ability.SK_ICE_06.desc": `En cada ciclo, un glaciar gana +${num(G_PACKEIS_PER)} de masa por cada glaciar vecino.`,
  "ability.SK_ICE_07.name": "Puente de Hielo",
  "ability.SK_ICE_07.desc": `Cuenta también las cuatro diagonales como contiguas: las celdas dispersas se convierten en una sola agrupación, para estallidos, colisiones y tamaño de agrupación.`,
  "ability.SK_ICE_08.name": "Muro de Hielo",
  "ability.SK_ICE_08.desc": `Una fila o columna totalmente congelada refuerza el estallido de todos sus glaciares: ×${num(G_EISWALL_LINIE)} en vez de ×${num(G_GEO_LINIE)}.`,
  "ability.SK_ICE_09.name": "Engranaje",
  "ability.SK_ICE_09.desc": `En cada ciclo, cada glaciar gana +${num(G_VERZAHNUNG_PER)} de masa por cada glaciar de la agrupación conectada.`,
  "ability.SK_ICE_10.name": "Frente de Desprendimiento",
  "ability.SK_ICE_10.desc": `Los umbrales de masa más altos estallan con más fuerza: potencia ×${num(G_ABBRUCH_TIER[2])} en vez de ×${num(G_TIER_MULT[2])} en el umbral 2, ×${num(G_ABBRUCH_TIER[3])} en vez de ×${num(G_TIER_MULT[3])} en el 3.`,
  "ability.SK_ICE_11.name": "Estallido en Cadena",
  "ability.SK_ICE_11.desc": `Cuando un glaciar estalla, los glaciares contiguos estallan con él de inmediato, aunque no hayan alcanzado su umbral.`,
  "ability.SK_ICE_12.name": "Trituración",
  "ability.SK_ICE_12.desc": `Cuando un estallido alcanza a un glaciar vecino, la colisión cuenta más: factor ×${num(G_ZERMALMEN_KOLL)} en vez de ×${num(G_KOLLISION)}.`,
  "ability.SK_ICE_13.name": "Agrietamiento",
  "ability.SK_ICE_13.desc": `Un glaciar estalla ya con ${num(G_RISSBILDUNG_BURST)} de masa, en vez de ${num(G_THRESHOLDS[G_THRESHOLDS.length - 1])}.`,
  "ability.SK_ICE_14.name": "Derrumbe de Glaciar",
  "ability.SK_ICE_14.desc": `Cada estallido es un +${pct(G_GLETSCHERSTURZ_PER)} % más fuerte por cada glaciar que estalle en el mismo ciclo.`,
  "ability.SK_ICE_15.name": "Congelar",
  "ability.SK_ICE_15.desc": "Cuando un glaciar estalla sobre una carta rival, esa carta pierde su baza en el ciclo siguiente.",
  "ability.SK_ICE_16.name": "Pacto de Escarcha",
  "ability.SK_ICE_16.desc": `Cuando un glaciar estalla, sus vecinas que no son glaciares reciben +${num(G_FROSTBUND_BUFF)} de valor de baza en el ciclo siguiente. Con el puente de hielo, esto vale para la vecindad de 8.`,
  "ability.SK_ICE_17.name": "Coraza de Hielo",
  "ability.SK_ICE_17.desc": `Una derrota junto a un glaciar no rompe tu racha y da +${num(G_EISPANZER_MASS)} de masa por cada glaciar contiguo.`,
  "ability.SK_ICE_L01.name": "Edad de Hielo",
  "ability.SK_ICE_L01.desc": `En cada ciclo, +${num(G_EISZEIT_FLOOD)} de nieve en la reserva del suelo de cada celda sin congelar. La de mayor reserva se congela entonces en glaciar y se rellena desde su reserva. Hasta ${G_EISZEIT_MAX} glaciares.`,
  "ability.SK_ICE_L02.name": "Escudo Eterno",
  "ability.SK_ICE_L02.desc": `En cada ciclo, todos tus glaciares suben hasta la masa del más fuerte, sin bajar nunca, y ganan +${G_SCHILD_BONUS} de masa encima. Al estallar, cada glaciar cuenta como vecino de todos los demás: cascada y colisión completas, estén donde estén.`,
  "ability.SK_ICE_L03.name": "Gran Avalancha",
  "ability.SK_ICE_L03.desc": `En el último ciclo estallan TODOS tus glaciares de golpe, incluidos los que aún no están llenos, cada uno con la fuerza del umbral más alto y enormemente amplificado.`,
  "ability.SK_ICE_L04.name": "Rigidez",
  "ability.SK_ICE_L04.desc": `Cada carta rival alcanzada por el estallido pierde su baza, y el estallido llega más allá de las cuatro vecinas, hasta el campo rival. Cada estallido cuenta ×${num(1 + G_ERSTARRUNG_FRAC)} de puntuación.`,

  /* ---- 🌿 Planta ---- */
  "ability.SK_PLANT_02.name": "Profundidad de Raíz",
  "ability.SK_PLANT_02.desc": `Cada victoria de una carta verde da +${C.WURZELTIEFE_SCORE} de puntuación de raíz, más una bonificación que sube con el crecimiento total del campo (máx. +${C.WURZELTIEFE_FIELD_CAP} con ~${grp(Math.round((C.WURZELTIEFE_FIELD_CAP / C.WURZELTIEFE_FIELD_K) ** 2 / 1000) * 1000)} de crecimiento).`,
  "ability.SK_PLANT_03.name": "Raíz Pivotante",
  "ability.SK_PLANT_03.desc": `${AMP} La base de raíz (${C.WURZELTIEFE_SCORE}) ×${C.PFAHLWURZEL_MULT} cuando la carta verde gana dentro de una formación.`,
  "ability.SK_PLANT_04.name": "Anillos de Crecimiento",
  "ability.SK_PLANT_04.desc": `${AMP} Por cada ${C.JAHRESRINGE_PER_GROWTH} de crecimiento propio completo, una carta verde da +${C.JAHRESRINGE_SCORE} de puntuación de raíz adicional al ganar.`,
  "ability.SK_PLANT_05.name": "Siembra",
  "ability.SK_PLANT_05.desc": `Cuando una carta verde gana, siembra a sus dos vecinas: +${C.AUSSAAT_GROWTH} de crecimiento por lado.\n${PRUNE}`,
  "ability.SK_PLANT_06.name": "Semillas al Viento",
  "ability.SK_PLANT_06.desc": `${AMP} La siembra se salta las cartas que ya están verdes y siembra la siguiente carta gris que haya detrás.\n${PRUNE}`,
  "ability.SK_PLANT_07.name": "Semillero",
  "ability.SK_PLANT_07.desc": `La carta más baja de cada segmento empieza la partida con +${C.SETZLINGSBEET_GROWTH} de crecimiento de ventaja.\n${PRUNE}`,
  "ability.SK_PLANT_08.name": "Tallo Resistente",
  "ability.SK_PLANT_08.desc": `Las cartas sin madurar (grises) crecen +1 también con una derrota, hasta que están verdes.\n${PRUNE}`,
  "ability.SK_PLANT_09.name": "Zarcillos",
  "ability.SK_PLANT_09.desc": "Cuando una carta verde gana, vuelve verde de inmediato a una vecina que aún esté gris.",
  "ability.SK_PLANT_10.name": "Floración",
  "ability.SK_PLANT_10.desc": `Cuando gana una carta verde cuyas vecinas ya están verdes, florece: +${C.BLUETE_SCORE} de puntuación de floración por cada carta verde del segmento.`,
  "ability.SK_PLANT_11.name": "Época de Floración",
  "ability.SK_PLANT_11.desc": `${AMP} Puntuación de floración ×${C.BLUETEZEIT_MULT} cuando la carta gana dentro de una formación.`,
  "ability.SK_PLANT_12.name": "Fotosíntesis",
  "ability.SK_PLANT_12.desc": `Las cartas verdes dentro de una formación dan además ×${num(C.PHOTOSYNTHESE_MULT)} de puntuación.`,
  "ability.SK_PLANT_13.name": "Dosel",
  "ability.SK_PLANT_13.desc": `En un bloque de palo verde de ${C.BLAETTERDACH_MIN} cartas o más, cada carta verde da al ganar +${C.BLAETTERDACH_SCORE} de puntuación por cada carta del bloque (hasta ${C.BLAETTERDACH_CARD_CAP}).`,
  "ability.SK_PLANT_14.name": "Invasión",
  "ability.SK_PLANT_14.desc": `Cuando el campo está verde en un ${pct(C.UEBERWUCHERUNG_FIELD)} % o más, todos los bloques de palo dan +${num(C.UEBERWUCHERUNG_FACTOR)} de factor y la floración cuenta el doble.`,
  "ability.SK_PLANT_18.name": "Duramen",
  "ability.SK_PLANT_18.desc": `Cada victoria de una carta verde da +${C.KERNHOLZ_SCORE_PER_VALUE} de puntuación por cada punto de valor de carta por encima de su valor inicial (máx. +${(C.PLANT_VALUE_CAP - 1) * C.KERNHOLZ_SCORE_PER_VALUE} del valor 1 al ${C.PLANT_VALUE_CAP}). Las cartas solo ganan valor mientras no tengas más que habilidades de Planta.`,
  "ability.SK_PLANT_15.name": "Estolones",
  "ability.SK_PLANT_15.desc": `Cuando una carta verde gana, coloniza la carta rival más baja. Si vences a una carta colonizada, cosechas +${C.AUSLAEUFER_HARVEST} de crecimiento.\n${PRUNE}`,
  "ability.SK_PLANT_16.name": "Rizoma",
  "ability.SK_PLANT_16.desc": `${AMP} Al cosechar, también se cosecha una carta rival vecina igualmente colonizada: +${C.AUSLAEUFER_HARVEST} de crecimiento extra.\n${PRUNE}`,
  "ability.SK_PLANT_17.name": "Acción de Gracias",
  "ability.SK_PLANT_17.desc": `${AMP} Si cosechas con una carta madura, recibes además +${C.ERNTEDANK_SCORE} de puntuación.`,
  "ability.SK_PLANT_L01.name": "Árbol del Mundo",
  "ability.SK_PLANT_L01.desc": `Al final de cada ciclo crece todo el bosque: +1 de crecimiento por cada ${C.WELTENBAUM_PER_GREEN} cartas verdes del campo. Cada victoria verde da +${num(C.WELTENBAUM_DIRECT)} de puntuación por cada punto de crecimiento por encima del tope de valor, sumado sobre todas las cartas verdes (hasta ${C.WELTENBAUM_OVERFLOW_CAP}).`,
  "ability.SK_PLANT_L02.name": "Árbol Madre",
  "ability.SK_PLANT_L02.desc": `Con Profundidad de Raíz: cuando le toca a tu carta más crecida, duplica su puntuación de raíz. Cada victoria verde da +${C.MUTTERBAUM_DIRECT} de puntuación por cada punto de crecimiento de tu árbol más profundo por encima del tope de valor (hasta ${C.MUTTERBAUM_OVERFLOW_CAP}), incluso sin Profundidad de Raíz.`,
  "ability.SK_PLANT_L03.name": "Hilera de Árboles",
  "ability.SK_PLANT_L03.desc": `Las cartas verdes totalmente desarrolladas (valor ${C.PLANT_VALUE_CAP}) forman una repetición sin posición, estén donde estén: a partir de 2 cartas así, ×${num(C.BAUMREIHE_BASE)} en sus bazas, +${num(C.BAUMREIHE_STEP)} por cada carta más, hasta ×${num(C.BAUMREIHE_CAP)}. Cada una puede contar a la vez en otra formación.`,
  "ability.SK_PLANT_L04.name": "Primavera Eterna",
  "ability.SK_PLANT_L04.desc": `Cada victoria verde da +${C.EWIGER_FRUEHLING_DIRECT} de puntuación por cada carta verde del campo (hasta ${C.EWIGER_FRUEHLING_FIELD_CAP}). Con el campo totalmente verde, cada carta verde cuenta ${num(C.EWIGER_FRUEHLING_FULLGREEN_MULT)}× (efectivamente hasta ${C.EWIGER_FRUEHLING_FIELD_CAP * C.EWIGER_FRUEHLING_FULLGREEN_MULT}).`,

  /* ---- Archetype labels ----
     These four are load-bearing: the cosmetic guard holds the element decks to exactly these
     words, so a synonym here would split a deck from its archetype. */
  "archetype.lightning.label": "Rayo",
  "archetype.fire.label": "Fuego",
  "archetype.ice.label": "Hielo",
  "archetype.plant.label": "Planta",
};
