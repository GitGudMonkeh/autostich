/* ============================================================
   CATALOG SPANISH. Mirrors de.js key for key — the guard test fails the build if a key or a
   placeholder is missing on any side.

   TRANSLATED FROM THE GERMAN, not from the English. The English column in the delivery CSV
   (docs/localization/strings_es.csv, `en_ref`) is reference only: it shows how an ambiguity in the
   German was resolved once before. Where German and English disagree, German wins, and the
   disagreement is recorded in docs/localization/unsicherheiten_es.md rather than smoothed over.

   Terminology follows docs/localization/uebersetzerpaket_es_2026-08-26.md §3, frozen into
   TERMS.es in test/i18n-guards.test.js by this task. Do not invent synonyms: one German term maps
   to exactly one Spanish term, everywhere.

   NEUTRAL SPANISH — no regional colour, `tú` address as in the German original, `ustedes` rather
   than `vosotros`. The language id is `es`, not `es-ES` and not `es-419`; number and date format
   hang off that id (package §5.4).

   This file mirrors the SHAPE of en.js, not de.js. The difference matters: de.js is a GENERATED
   view of the game registries, whose German names live in src/game/*. en.js and es.js are
   hand-maintained and bundle their sub-catalogs.

   NUMBERS ARE TRANSCRIBED FROM THE GERMAN CHARACTER FOR CHARACTER. Spanish shares the German
   separators (thousands `.`, decimal `,`, percent with a space) — package §5.4 — so a German
   numeral is already a correct Spanish one. Where the English catalog interpolates a CONSTANT,
   this file interpolates the same constant at the same site; a typed-out number there would stop
   tracking the next balance pass without any guard noticing until it had already drifted.
   ============================================================ */
import { RARITY_ES } from "./esTerms.js";

export default {

  /* ---- Rarity ladder (package §3.5) ----
     Ends on "Épica", not "Legendaria": legendary is a separate axis in this game (legendary perks,
     skills and buildings, plus their own phase), so a ladder ending in Legendaria would collide. */
  "rarity.tier1.label": RARITY_ES[0],
  "rarity.tier2.label": RARITY_ES[1],
  "rarity.tier3.label": RARITY_ES[2],
  "rarity.tier4.label": RARITY_ES[3],

  /* ---- Architect categories (ARCH_CAT) ---- */
  "archcat.value.label": "Valor",
  "archcat.score.label": "Puntuación",
  "archcat.formation.label": "Formación",

  /* ---- Card suits ----
     `suit.Y.name` is the first entry to break its measured limit, and that is expected rather than
     a mistake: limit = 6 was measured against "Yellow", and yellow is `Amarillo`. Package §6 is
     explicit that the text wins and the tile gets re-measured — recorded in unsicherheiten_es.md
     for the es-layout successor. */
  "suit.R.name": "Rojo",
  "suit.B.name": "Azul",
  "suit.G.name": "Verde",
  "suit.Y.name": "Amarillo",

  /* ---- 2D glacier formations (glacier.js GLACIER_FORM_LABEL) ---- */
  "glacierform.block.name": "Bloque",
  "glacierform.kreuz.name": "Cruz",
  "glacierform.linie.name": "Línea",
  "glacierform.flaeche.name": "Gran área",

  /* ---- Formation types (§3.3) ----
     The abbreviations are card badges with a HARD one-character limit and must stay pairwise
     distinct. The Spanish set is R B E Z A O N X. Two of them need explaining, because the obvious
     letter is taken: eco takes O, not E, because escalera already holds E; and núcleo takes N,
     not C, to keep it away from cruce, which takes X the way English does. */
  "formation.wiederholung.label": "Repetición",          "formation.wiederholung.abbr": "R",
  "formation.farbblock.label": "Bloque de palo",         "formation.farbblock.abbr": "B",
  "formation.treppe.label": "Escalera",                  "formation.treppe.abbr": "E",
  "formation.wechsel.label": "Zigzag",                   "formation.wechsel.abbr": "Z",
  "formation.anker.label": "Ancla",                      "formation.anker.abbr": "A",
  "formation.nachhall.label": "Eco",                     "formation.nachhall.abbr": "O",
  "formation.formationskern.label": "Núcleo",            "formation.formationskern.abbr": "N",
  "formation.grenzbonus.label": "Bonificación de cruce", "formation.grenzbonus.abbr": "X",

  /* ---- Architect buildings (ARCHITECT_FAMILIES) ----
     Architectural vocabulary, and deliberately the precise word rather than the everyday one where
     Spanish has one: adarve, hastial, miliario, revellín, liza. Package §3 asks for exactly this —
     where the German word is idiosyncratic (Wehrgang, Zwinger), the Spanish stays idiosyncratic
     too, because that is the genre norm rather than a flourish. */
  "building.A_STUETZE.name": "Viga de apoyo",
  "building.A_RIEGEL.name": "Travesaño",
  "building.A_QUADER.name": "Sillar",
  "building.A_RAMPE.name": "Rampa",
  "building.A_BUNTGLAS.name": "Vidriera",
  "building.A_FIRST.name": "Viga cumbrera",
  "building.A_SOCKEL.name": "Zócalo",
  "building.A_ZUNFTV.name": "Barrio gremial",
  "building.A_WEHRGANG.name": "Adarve",
  "building.A_ZOLLHAUS.name": "Aduana",
  "building.A_KONTOR.name": "Factoría",
  "building.A_REIHENHAUS.name": "Casa adosada",
  "building.A_ZINNE.name": "Almena",
  "building.A_ZUNFTHAUS.name": "Casa gremial",
  "building.A_GIEBEL.name": "Hastial",
  "building.A_MEILENSTEIN.name": "Miliario",
  "building.A_MARKT.name": "Mercado",
  "building.A_SPEICHER.name": "Barrio de almacenes",
  "building.A_VORWERK.name": "Revellín",
  "building.A_LAUFGANG.name": "Galería",
  "building.A_LOSBUDE.name": "Caseta de rifas",
  "building.A_WETTHALLE.name": "Casa de apuestas",
  "building.A_KLAMMER.name": "Grapa",
  "building.A_ARKADE.name": "Arcada",
  "building.A_KREUZGANG.name": "Claustro",
  "building.A_FRIES.name": "Friso",
  "building.A_PFEILER.name": "Pilar",
  "building.A_GRUNDSTEIN.name": "Piedra angular",
  "building.A_GEWOELBE.name": "Bóveda",
  "building.A_FUNDAMENT.name": "Losa de cimentación",
  "building.A_BOLLWERK.name": "Baluarte",
  "building.A_SCHATZ.name": "Cámara del tesoro",
  "building.A_PRUNKSAAL.name": "Salón de gala",
  "building.A_KATHEDRALE.name": "Catedral",
  "building.A_BASILIKA.name": "Basílica",
  "building.A_PRISMA.name": "Prisma",
  "building.A_LEUCHTTURM.name": "Faro",
  "building.A_RATHAUS.name": "Ayuntamiento",
  "building.A_SPIELBANK.name": "Casino",
  "building.A_STERNWARTE.name": "Observatorio",
  "building.A_ZWINGER.name": "Liza",

  /* ---- Building effect sentence parts (buildingText.js) ----
     These are assembled into whole sentences at runtime, which is why the adjective slots carry
     their own keys. Spanish puts the adjective AFTER the noun, so `{which} Karte` becomes
     `carta {which}` and `{half} Segmente` becomes `segmentos {half}` — the placeholder order is
     free (package §4.1) and the gender is fixed on the noun in the template, so neither slot can
     produce a disagreement (§4.4).

     `building.eff.milestone` avoids an ordinal on purpose: `{every}.ª` would need the ordinal
     indicator that package §5.3 forbids, because the glyph is missing from the card font. Spanish
     says the same thing with a cardinal — `cada 3 victorias` IS every third win. */
  "building.eff.flat.value": "todas las cubiertas +{n} valor de baza",
  "building.eff.flat.score": "victoria +{n} puntuación",
  "building.eff.lowValue": "cartas bajas +{n} valor de baza",
  "building.eff.color.value": "palo coincidente +{n} valor de baza",
  "building.eff.color.score": "palo coincidente +{n} puntuación",
  "building.eff.target.highest": "más alta",
  "building.eff.target.lowest": "más baja",
  "building.eff.target.value": "carta {which} +{n} valor de baza",
  "building.eff.target.score": "carta {which} +{n} puntuación",
  "building.eff.streak": "victoria +{n} puntuación por punto de racha (máx. {cap})",
  "building.eff.crit": "victoria con crítico +{n} puntuación",
  "building.eff.milestone": "cada {every} victorias en este edificio +{n} puntuación",
  "building.eff.mult": "victorias aquí ×{f} puntuación",
  "building.eff.neighbor.value": "+{n} valor de baza por edificio adyacente (máx. {cap})",
  "building.eff.neighbor.score": "victoria +{n} puntuación por edificio adyacente (máx. {cap})",
  "building.eff.compound": "victoria +{n} puntuación por estructura completada",
  "building.eff.segment.early": "tempranos",
  "building.eff.segment.late": "tardíos",
  "building.eff.segment.value": "segmentos {half} +{n} valor de baza",
  "building.eff.segment.score": "segmentos {half} +{n} puntuación",
  "building.eff.relay.both": "irradia +{n} puntuación a ambas celdas contiguas",
  "building.eff.relay.right": "pasa +{n} puntuación a la celda de la derecha",
  "building.eff.gamble": "victoria con crítico +{n} puntuación · victoria sin crítico −{penalty} puntuación",
  "building.eff.joker": "comodín de formación ({types})",
  "building.eff.transparentFarb": "transparencia de bloque de palo",
  "building.eff.bind": "enlace de escalera: la carta puede diferir en valor en ±{span}",
  "building.eff.crossSeg": "abre el límite de segmento",
  "building.eff.anker": "cada celda cuenta como ancla (×{f})",
  "building.eff.formMult": "formaciones aquí ×{f}",

  "building.kick.mult": "además ×{f} puntuación",
  "building.kick.critFlatMult": "con crítico ×{n} puntuación directa",
  "building.kick.streakDoubleFrom": "doble a partir de racha {n}",
  "building.kick.addType": "segundo tipo de comodín: {type}",
  "building.kick.ankerValue": "+{n} valor de baza por celda de ancla",
  "building.kick.active": "{base} · {kick}",
  "building.kick.preview": "{base} (nivel {tier}: {kick})",

  /* ---- Order phase (FormationPhase.jsx) ----
     `form.hint.pre` + `form.hint.within` + `form.hint.post` are rendered as one sentence with the
     middle part emphasised. Spanish needs the preposition in the emphasised middle rather than at
     the end of the first part, so the seam moves: "… solo surgen" + "dentro de" + "los segmentos
     de {size}". The parts still concatenate in the same order, so no JSX change is needed. */
  "form.eyebrow": "Fase de orden · ciclo {cycle}",
  "form.title": "Ordena tu mazo",
  "form.bonus": "Bonificación de formación",
  "form.bonus.value": "+{pct} %",
  "form.count": "Formaciones",
  "form.undo": "↶ Deshacer",
  "form.reset": "Restablecer",
  "form.confirm": "Continuar",
  "form.confirm.title": "Diferencia de formación desde el inicio del ciclo · energía de orden restante",
  "form.delta": "{sign}{pct} %",
  "form.energyLeft": " · quedan {n} de energía",
  "form.hint.pre": "Toca dos cartas para intercambiarlas (1 de energía) · las formaciones solo surgen",
  "form.hint.within": "dentro de",
  "form.hint.post": "los segmentos de {size}",
  "form.seg.strength": "+{pct} %",
  "form.seg.strength.title": "Bonificación de formación de este segmento en porcentaje. Verde: más fuerte que al inicio del ciclo, rojo: más débil",
  "form.segwork": "Trabajo de segmento:",
  "form.segwork.all": "todos los límites abiertos, entre segmentos",
  "form.segwork.marked": "los límites marcados con ⇕ pueden cruzarse",
  "form.arch.on": "🏗 Edificios activados",
  "form.arch.off": "🏗 Edificios desactivados",
  "form.legend": "Formaciones y colores de marco",
  "form.legend.chip": "Leyenda",
  "form.details.arch": "🏗 Tus edificios ({n}) · ventajas",
  "form.details.plain": "Ventajas y efectos",
  "form.iceEffects": "Efectos de hielo en las formaciones",
  "form.collapse.open": "Desplegar {label}",
  "form.collapse.close": "Plegar {label}",
  "form.collapse.more": "más",
  "form.collapse.less": "menos",

  /* ---- Active-formation panel ---- */
  "formpanel.title": "Tus formaciones activas",
  "formpanel.count": "{n} · máx. ×{max}",
  "formpanel.archToggle": "🏗 Edificios",
  "formpanel.archToggle.title": "Mostrar los edificios del Arquitecto colocados como marcos sobre el tablero",

  /* ---- Formation legend ---- */
  "formlegend.wiederholung": "≥2 valores iguales seguidos (×{f2} / ×{f3} / ×{f4}, luego +{step} por cada uno más)",
  "formlegend.farbblock": "≥3 cartas del mismo palo (desde ×{base}, +{step} por cada una más)",
  "formlegend.treppe": "≥3 valores estrictamente crecientes, paso ≤{max} (desde ×{base}, +{step} por cada uno más)",
  "formlegend.wechsel": "≥3 en zigzag, diferencia entre vecinas ≥{diff} (desde ×{base}, +{step} por cada una más)",
  "formlegend.anker": "una sola posición cuenta como formación (el factor depende de la fuente)",
  "formlegend.nachhall": "el factor de una formación que termina se prolonga a la carta siguiente",
  "formlegend.formationskern": "el tipo de formación que elijas recibe un factor adicional",
  "formlegend.grenzbonus": "una formación cruza un límite de segmento y paga ×{f} adicional",
  "formlegend.overlap": "⧉ Solapamiento: más formaciones = más multiplicador: 2 ×{f2} · 3 ×{f3} · 4 ×{f4}",
  "formlegend.frame": "Color del marco = número de formaciones",
  "formlegend.frame.hint": "más marcos = más multi · discontinuo = sin multiplicador",

  /* ---- Shared small strings ----
     `common.chosen` is rewritten rather than translated. "{n} / {need} gewählt" has no gender in
     German, but every Spanish participle does, and this counter sits over cards (femenino) as well
     as over perks and skills. "Selección: {n} / {need}" carries the same information with no
     agreement to get wrong — package §4.4, the way around it rather than a compromise. */
  "common.close": "Cerrar",
  "common.cur.sp": "PB",
  "common.cur.dp": "PM",
  "common.confirm": "Confirmar",
  "common.chosen": "Selección: {n} / {need}",

  /* ---- Large-number abbreviations ----
     THE long-scale trap (package §5.4). Spanish counts on the long scale, so 10⁹ is `mil millones`
     and NOT `billón` — `billón` is 10¹². A literal translation of the German `Mrd.` would be wrong
     by a factor of 1000, and no guard can see it: the abbreviations carry no digits, so the number
     guard has nothing to compare. */
  "format.short.mega": "{n} M",
  "format.short.giga": "{n} mil M",
  "format.short.tera": "{n} B",

  /* ---- Level-up wings ---- */
  "lv.wing.deck": "Mazo",
  "lv.wing.stats": "Métricas",
  "lv.wing.expand": "Mostrar {what}",
  "lv.wing.collapse": "Ocultar {what}",

  /* ---- Card targeting ---- */
  "target.eyebrow": "Rol · {perk}",
  "target.pickCards_one": "Elige {count} carta",
  "target.pickCards_other": "Elige {count} cartas",

  /* ---- Run controls ---- */
  "controls.options": "⚙ Opciones",
  "controls.options.aria": "Opciones",
  "controls.restart": "Reiniciar",
  "controls.quit": "Salir",

  /* ---- Seed ---- */
  "seed.copy": "Copiar semilla",
  "seed.copied": "copiada",
  "seed.replay": "↻ Repetir",
  "seed.replay.title": "Repetir esta semilla",

  /* ---- Anchor sources ---- */
  "anchor.power.label": "Fuerza",
  "anchor.score.label": "Puntuación",
  "anchor.crit.label": "Crítico",
  "anchor.streak.label": "Racha",
  "anchor.formation.label": "Formación",
  "anchor.joker.label": "Comodín",

  /* ---- Glacier pick ---- */
  "glacierpick.eyebrow": "Glaciar",
  "glacierpick.title": "Elige una carta para convertirla en glaciar",
  "glacierpick.intro.a": "Se congela en su celda. A partir de entonces queda",
  "glacierpick.intro.rigid": "rígida",
  "glacierpick.intro.b": "(ya no se puede mover) y acumula masa hasta que estalla. Decide entre posición y valor.",
  "glacierpick.chosen": "Selección: {n} / 1",

  /* ---- Glacier formation legend (GlacierFormLegend.jsx) ----
     Two assembled lines, both of the shape <part> + <bold G> + <part>. German puts the colour
     adjective before the letter ("ein blaues G"), Spanish puts it after ("una G azul"), so the
     word moves ACROSS the seam into the following key. That works only because there is no
     placeholder at the join — the parts concatenate in a fixed order and the JSX is untouched.
     Letters are feminine in Spanish, hence `una` rather than `un`. */
  "glacierlegend.head": "Formaciones de glaciar (2D)",
  "glacierlegend.head.compact": "Formaciones de glaciar (2D):",
  "glacierlegend.block": "cuadrado 2×2 (4 glaciares)",
  "glacierlegend.kreuz": "centro + 4 vecinas (5 glaciares)",
  "glacierlegend.linie": "fila completa (5) o columna (8)",
  "glacierlegend.linie.wall": "fila completa (5) o columna (8) · Muro de hielo",
  "glacierlegend.flaeche": "3×3 lleno (9 glaciares)",
  "glacierlegend.mark.a": "una",
  "glacierlegend.mark.compact": "azul = carta en formación activa",
  "glacierlegend.mark.pre": "Las cartas en una formación activa llevan una",
  "glacierlegend.mark.post": "azul · cuenta el factor más alto por tipo.",
};
