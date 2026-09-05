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
   ciclo · baza · valor de baza · valor de carta · margen · racha · carga · ionización ·
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
  /* exp skill rework (catálogo inactivo): las 15 habilidades de Rayo tienen ahora cuatro niveles (Normal · Poco común ·
     Rara · Épica); el texto nombra primero la fila Normal y luego la escalera, como la fuente alemana. */
  "ability.SK_LIGHTNING_01.name": "Pararrayos",
  "ability.SK_LIGHTNING_01.desc": "Cada 2.º crítico da +1 carga adicional. Poco común: cada crítico. Rara: además +1 carga tras cada barra llena. Épica: +2 de vuelta, y la carga por encima de la barra se conserva.",
  "ability.SK_LIGHTNING_08.name": "Acumulación Estática",
  "ability.SK_LIGHTNING_08.desc": "Cada 2.ª victoria sin crítico da +1 carga. Poco común: cada victoria sin crítico. Rara: además cada 2.ª derrota +1 carga. Épica: victoria sin crítico +2 cargas, y la barra llena da a la carta ionizada +1 de valor de carta permanente.",
  "ability.SK_LIGHTNING_05.name": "Corriente Residual",
  "ability.SK_LIGHTNING_05.desc": "Tras cada barra llena la carga empieza en 2 en vez de 0. Poco común 3, Rara 4, Épica 6.",
  "ability.SK_LIGHTNING_16.name": "Corriente Continua",
  "ability.SK_LIGHTNING_16.desc": "A partir de racha 5 cada victoria da +1 carga. Poco común desde racha 4, Rara desde 3, Épica desde 2.",
  "ability.SK_LIGHTNING_06.name": "Frente de Tormenta",
  "ability.SK_LIGHTNING_06.desc": "Cada barra llena otorga de forma permanente +0,5 % de probabilidad de crítico. Poco común +0,75 %, Rara +1 %, Épica +1,5 %.",
  "ability.SK_LIGHTNING_10.name": "Descarga",
  "ability.SK_LIGHTNING_10.desc": "Cada barra llena otorga de forma permanente +0,02× de multiplicador de crítico. Poco común +0,03×, Rara +0,04×, Épica +0,06× — y el crítico que llena la barra cuenta con el multiplicador de crítico doblado.",
  "ability.SK_LIGHTNING_07.name": "Racha de Carga",
  "ability.SK_LIGHTNING_07.desc": "Cada punto de racha otorga +1 % de probabilidad de crítico. Poco común +1,5 %, Rara +2 %, Épica +2,5 % — y a partir de racha 8 cada victoria da +1 carga.",
  "ability.SK_LIGHTNING_13.name": "Acumulación de Tensión",
  "ability.SK_LIGHTNING_13.desc": "Cada victoria sin crítico otorga +3 % de probabilidad de crítico para la próxima victoria; un crítico vacía la acumulación. Poco común +4 %, Rara +5 %, Épica +6 % — y un crítico la reduce a la mitad en vez de vaciarla.",
  "ability.SK_LIGHTNING_14.name": "Arco",
  "ability.SK_LIGHTNING_14.desc": "Por cada 10 puntos de probabilidad de crítico por encima del 100 %: +0,02× de multiplicador de crítico mientras dure el exceso. Poco común +0,03×, Rara +0,04×, Épica +0,06×.",
  "ability.SK_LIGHTNING_03.name": "Rayo en Cadena",
  "ability.SK_LIGHTNING_03.desc": "Cada 2.ª barra llena ioniza una carta más en el orden. Poco común: cada barra +1 carta. Rara: +2 cartas. Épica: +3 cartas, y la carta objetivo recibe una acumulación extra.",
  "ability.SK_LIGHTNING_15.name": "Impacto de Rayo",
  "ability.SK_LIGHTNING_15.desc": "Cada 5.º crítico ioniza la carta ganadora (+1 acumulación). Poco común cada 4.º, Rara cada 3.º, Épica cada 2.º crítico.",
  "ability.SK_LIGHTNING_11.name": "Cazarrayos",
  "ability.SK_LIGHTNING_11.desc": "Las cartas con 6 o más acumulaciones combaten con +2 de valor. Poco común desde 5, Rara desde 4, Épica desde 3 acumulaciones.",
  "ability.SK_LIGHTNING_09.name": "Cortocircuito",
  "ability.SK_LIGHTNING_09.desc": "Victoria con una carta de 6 o más acumulaciones: sus acumulaciones cuentan doble. Poco común desde 5, Rara desde 4, Épica desde 3 acumulaciones.",
  "ability.SK_LIGHTNING_04.name": "Sobretensión",
  "ability.SK_LIGHTNING_04.desc": "Crítico con una carta de 6 o más acumulaciones: +2 cargas. Poco común desde 5, Rara desde 4, Épica desde 3 acumulaciones.",
  "ability.SK_LIGHTNING_17.name": "Protección de Racha",
  "ability.SK_LIGHTNING_17.desc": "Si pierdes una baza con al menos un 70 % de carga, la racha se mantiene; ese 70 % se consume. Poco común 50 %, Rara 40 %, Épica 30 % — y una vez por ciclo la protección es gratis.",
  "ability.SK_LIGHTNING_L01.name": "Dios del Trueno",
  "ability.SK_LIGHTNING_L01.desc": "La barra de carga se llena con 7. De forma permanente +0,4× de multiplicador de crítico.",
  "ability.SK_LIGHTNING_L02.name": "Descarga Doble",
  "ability.SK_LIGHTNING_L02.desc": "Cada ionización da 2 acumulaciones en vez de 1. Crítico con una carta ionizada: el rayo cae dos veces, la baza cuenta doble.",
  "ability.SK_LIGHTNING_L03.name": "Alta Tensión",
  "ability.SK_LIGHTNING_L03.desc": "Todas las habilidades de Rayo que tengas actúan un nivel más alto: Normal como Poco común, Poco común como Rara, Rara como Épica. Épica sigue siendo Épica.",
  "ability.SK_LIGHTNING_L04.name": "Perforación",
  "ability.SK_LIGHTNING_L04.desc": "Las derrotas también pueden ser críticas: un crítico en una baza perdida la gana.",

  /* ---- 🔥 Fuego ---- */
  /* exp skill rework (catálogo inactivo): las 15 habilidades de Fuego tienen cuatro niveles (Normal · Poco común · Rara ·
     Épica); el texto nombra primero la fila Normal y luego la escalera, como la fuente alemana. Ceniza, Lluvia de Chispas y
     Horno de Fundición han desaparecido. */
  "ability.SK_FIRE_01.name": "Brasa",
  "ability.SK_FIRE_01.desc": "Las victorias con margen dan ×1,25 de calor. Poco común ×1,5, Rara ×1,75, Épica ×2.",
  "ability.SK_FIRE_02.name": "Yesca",
  "ability.SK_FIRE_02.desc": "Cada victoria da +1 % de calor, incluso una ajustada. Poco común +2 %, Rara +3 %, Épica +4 %.",
  "ability.SK_FIRE_03.name": "Tormenta de Fuego",
  "ability.SK_FIRE_03.desc": "Cada victoria da +0,5 % de calor por punto de racha. Poco común +1 %, Rara +1,5 %, Épica +2 %.",
  "ability.SK_FIRE_05.name": "Reencendido",
  "ability.SK_FIRE_05.desc": "Una victoria tras una derrota da +0,5 % de calor por punto de desventaja. Poco común +1 %, Rara +1,5 %, Épica +2 %; además, la carta tras una derrota tiene +2 de valor.",
  "ability.SK_FIRE_04.name": "Lecho de Brasas",
  "ability.SK_FIRE_04.desc": "Las derrotas no enfrían el calor por debajo del 40 %. Poco común no por debajo del 60 %, Rara no por debajo del 80 %, Épica: las derrotas no enfrían.",
  "ability.SK_FIRE_06.name": "Hoja Incandescente",
  "ability.SK_FIRE_06.desc": "Todas tus cartas tienen +1 de valor por cada 40 % de calor. Poco común por cada 30 %, Rara por cada 25 %, Épica por cada 20 %.",
  "ability.SK_FIRE_07.name": "Calor Blanco",
  "ability.SK_FIRE_07.desc": "La barra de calor llega al 200 %. Por encima del 100 %, cada 10 % de calor da +3 % de puntuación. Poco común +4 %, Rara +5 %, Épica +6 %.",
  "ability.SK_FIRE_08.name": "Oleada de Fuego",
  "ability.SK_FIRE_08.desc": "A partir del 80 % de calor, la siguiente carta tras una victoria tiene +2 de valor. Poco común desde el 60 %, Rara desde el 40 %, Épica desde el 20 %; además, también tras una derrota.",
  "ability.SK_FIRE_09.name": "Combustión",
  "ability.SK_FIRE_09.desc": "Una victoria con margen de 8 o más cuenta ×1,5. Poco común desde 7, Rara desde 6, Épica desde 5.",
  "ability.SK_FIRE_11.name": "Incendio",
  "ability.SK_FIRE_11.desc": "A partir del 80 % de calor, la siguiente victoria quema el calor hasta el 40: +15 de puntuación base por punto quemado. Poco común +20, Rara +25, Épica +30; además, el incendio quema hasta el 0.",
  "ability.SK_FIRE_12.name": "Punto de Fusión",
  "ability.SK_FIRE_12.desc": "Cada victoria quema un 4 % de calor: +15 de puntuación base por punto. Poco común +20, Rara +25, Épica +30; además, la mitad del calor quemado vuelve.",
  "ability.SK_FIRE_13.name": "Marca",
  "ability.SK_FIRE_13.desc": "A partir del 80 % de calor, cada victoria marca la carta rival vencida: −2 de valor en el siguiente ciclo. Poco común desde el 60 %, Rara desde el 40 %, Épica desde el 20 %; además, una derrota también marca la carta rival que ganó.",
  "ability.SK_FIRE_14.name": "Reguero de Fuego",
  "ability.SK_FIRE_14.desc": "A partir del 80 % de calor, cada victoria marca a las dos vecinas de la carta rival vencida: −1 de valor en el siguiente ciclo. Poco común desde el 60 %, Rara desde el 40 %, Épica desde el 20 %; con alcance 2, es decir, 4 vecinas.",
  "ability.SK_FIRE_15.name": "Forja",
  "ability.SK_FIRE_15.desc": "Fin de ciclo: con al menos 50 de calor, forjar cuesta 50 y tu carta más baja gana +3 de valor permanente. Poco común cuesta 40, Rara cuesta 30, Épica cuesta 20; además, forja las 2 cartas más bajas.",
  "ability.SK_FIRE_16.name": "Acero al Rojo",
  "ability.SK_FIRE_16.desc": "Victoria: +8 de puntuación base por cada punto de valor por encima del valor base de la carta, venga de donde venga. Poco común +12, Rara +16, Épica +20; además, el valor forjado cuenta doble.",
  "ability.SK_FIRE_L01.name": "Núcleo Solar",
  "ability.SK_FIRE_L01.desc": "Cada victoria marca la carta rival vencida (−1 de valor), y las marcas ya no se renuevan: se acumulan a lo largo de los ciclos. Victoria contra una carta marcada: +20 de puntuación base por punto de marca que tenga.",
  "ability.SK_FIRE_L02.name": "Fuego de Fénix",
  "ability.SK_FIRE_L02.desc": "Las derrotas no enfrían, calientan: +2 % de calor por punto de desventaja. Si el calor cae a 0, se reenciende al 50 %.",
  "ability.SK_FIRE_L03.name": "Ira Solar",
  "ability.SK_FIRE_L03.desc": "El multiplicador de calor usa el calor más alto alcanzado, no el actual. Cuenta doble: por cada 10 % de calor +4 % de puntuación en vez de +2 %.",
  "ability.SK_FIRE_L04.name": "Acero de Damasco",
  "ability.SK_FIRE_L04.desc": "Cada ciclo se forja tu carta más baja, +3 de valor permanente, sin coste. Las cartas forjadas combaten con el doble de valor forjado.",

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
  "ability.SK_PLANT_07.desc": `La carta más baja de cada segmento empieza la partida con +${C.SETZLINGSBEET_GROWTH} de crecimiento de adelanto.\n${PRUNE}`,
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
