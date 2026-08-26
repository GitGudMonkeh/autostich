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
import { LEG_PHASE_CYCLE } from "../game/constants.js";
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

  /* ---- End of run (GameOverScreen.jsx) ----
     `gameover.unlocked.inline` uses the colon form the package recommends for exactly this shape
     (§4.4): "Desbloqueado: {label}" carries no agreement, while "{label} desbloqueado" would break
     the moment the label is feminine — and the labels include `carta`, `mejora` and `formación`. */
  "gameover.menu": "Menú",
  "gameover.newRun": "Nueva partida",
  "gameover.eyebrow": "Partida terminada",
  "gameover.record.new": "Nuevo récord",
  "gameover.record.from": "hasta el récord",
  "gameover.perTrick.title": "Puntuación media por baza",
  "gameover.perTrick": "Ø {score}/baza",
  "gameover.cycles_one": "{count} ciclo",
  "gameover.cycles_other": "{count} ciclos",
  "gameover.milestones": "💠 Hitos {done}/{total}",
  "gameover.milestones.max": "Máximo",
  "gameover.milestones.next": "siguiente en {n} M",
  "gameover.welcome": "✦ Bonificación de bienvenida",
  "gameover.welcome.hint": "por tu primera partida completada. Inviértela en el taller de mazos y hazte con un pack.",
  "gameover.welcome.value": "+{n} PM",
  "gameover.sp": "Puntos de baza",
  "gameover.dp": "Puntos de mazo",
  "gameover.unlocked.inline": "✦ Desbloqueado: {label}",
  "gameover.progress.saved": "Progreso guardado",
  "gameover.progress.done": "Partida completada",
  "gameover.skins.title": "★ Recién desbloqueado",
  "gameover.skins.hint": "Se puede elegir en el menú, en “Mazo”.",
  "gameover.unlocked.title": "✦ Desbloqueado",
  "gameover.nav.workshop": "Al taller",
  "gameover.nav.upgrades": "A las mejoras",
  "gameover.nav.leaderboard": "A la clasificación",
  "gameover.kpi.duration": "Duración",
  "gameover.kpi.tricks": "Bazas",
  "gameover.kpi.cycles": "Ciclos",
  "gameover.kpi.perTrick": "Por baza",
  "gameover.best": "Mejores marcas",
  "gameover.best.new": "Nuevo",
  "gameover.best.streak": "Mejor racha",
  "gameover.best.trick": "Mejor baza",
  "gameover.best.crits": "Más golpes críticos",
  "gameover.best.score": "Máximo anterior",
  "gameover.build": "Build",
  "gameover.engine": "Métricas del motor",
  "gameover.stats": "Estadísticas e historial",
  "gameover.chart.title": "Historial de puntuación",
  "gameover.chart.run": "Partida",
  "gameover.chart.record": "Récord",
  "gameover.chart.first": "primera partida",
  "gameover.layout.open": "Ver el orden de robo final",
  "gameover.layout.hint": "Toca para ver dónde está en el tablero.",
  "gameover.metric.growth": "Crecido",
  "gameover.metric.ionizations": "Ionizaciones",
  "gameover.metric.ashBurned": "Ceniza quemada",
  "gameover.metric.brands": "Marcas",

  /* ---- Battle HUD ----
     `hud.score` stays the canonical `Puntuación` rather than a shortened form. The cell is narrow
     and Spanish is more than twice the length of the German `Score`, but package §3.1 asks for one
     word everywhere and §6 is explicit that the text wins and the layout gets re-measured.
     Recorded in unsicherheiten_es.md for the es-layout successor. */
  "hud.pause": "Pausa",
  "hud.resume": "Continuar",
  "hud.speed.x2": "Velocidad ×2",
  "hud.speed.x4": "Velocidad ×4",
  "hud.speed.max": "Velocidad máxima",
  "hud.speed.max.label": "MÁX",
  "hud.cards": "Cartas",
  "hud.cards.title": "Abrir la vista de cartas",
  "hud.cycle": "Ciclo",
  "hud.time": "Tiempo",
  "hud.score": "Puntuación",
  "hud.record": "⚑ Récord",
  "hud.streak": "Racha",
  "hud.streak.best": "mejor {n}",
  "hud.mult": "Mult",

  /* ---- Status rail ----
     Abbreviated the way the German rail already abbreviates ("Verl." for Verluste). */
  "rail.mults": "Multiplicadores",
  "rail.formation": "Formación",
  "rail.formation.value": "{n} · +{pct} %",
  "rail.buildings": "Edificios",
  "rail.pct": "+{pct} %",
  "rail.pct.plain": "{pct} %",
  "rail.critChance": "Prob. crítico",
  "rail.critChance.ion": "+{pct} ion.",
  "rail.critMult": "Mult. crítico",
  "rail.jackpot": "Bote",
  "rail.wins": "Victorias",
  "rail.losses": "Derr.",
  "rail.rate": "Tasa",
  "rail.tricks": "Bazas",
  "rail.crits": "Críticos",
  "rail.analysis": "Análisis",
  "rail.best": "Mejor",
  "rail.scoreSource": "Origen de la puntuación",
  "rail.scoreTrend": "Historial de puntuación",
  "rail.trend.run": "Partida",
  "rail.trend.record": "Récord",
  "rail.trend.first": "primera partida",

  /* ---- Archetype bars (StatusBar.jsx) ----
     Vocabulary per package §3.4, with one deliberate departure: the ice resource is `nieve`, not
     the `neviza` the package proposes for "Firn". The German text was renamed Firn -> Schnee
     before this task started (the key names still say `firn`, the strings say Schnee/snow), so
     `neviza` would translate a word the game no longer says. Recorded in unsicherheiten_es.md. */

  /* Fire */
  "bar.fire.heat": "Calor",
  "bar.fire.conflagReady": " · INCENDIO LISTO",
  "bar.fire.whiteGlow": " · CALOR BLANCO",
  "bar.fire.state.conflag": "Incendio listo",
  "bar.fire.state.white": "Calor blanco",
  "bar.fire.state.over": "Sobrecalentamiento +{n} % de puntuación de fuego",
  "bar.fire.state.heat": "Calor {value}/{max}",
  "bar.fire.badge.fireRoll": "Oleada de fuego",
  "bar.fire.badge.fireRoll.n": "Oleada de fuego +{n}",
  "bar.fire.badge.glow": "Hoja incandescente",
  "bar.fire.badge.glow.n": "Hoja incandescente +{n}",
  "bar.fire.badge.glow.title": "Hoja incandescente: +{v1} desde {h1} % de calor · +{v2} desde {h2} % · +{v3} con {h3} % de calor. Los niveles superiores exigen por segmento una victoria con más de {m2} o {m3} de ventaja en valor de combate; si un segmento se queda sin ella, retrocedes.",
  "bar.fire.badge.spark": "Lluvia de chispas",
  "bar.fire.badge.spark.n": "Lluvia de chispas {n}",
  "bar.fire.badge.spark.title": "Depósito de lluvia de chispas: las victorias por debajo de {m} de ventaja en valor de combate ingresan, y una victoria desde {m} lo reparte. Una derrota lo reduce a la mitad.",
  "bar.fire.tick.glow": "Hoja incandescente: +valor desde {n} % de calor",
  "bar.fire.tick.full": "100 % de calor; por encima empieza el sobrecalentamiento",
  "bar.fire.tick.white": "Calor blanco: el calor por encima del 100 % se acumula como sobrecalentamiento (hasta {max} %); cuanto más caliente, menos llega. Cada punto da +{n} % sobre toda la puntuación de fuego y se disipa de nuevo en cada baza.",
  "bar.fire.ash": "Ceniza",
  "bar.fire.ash.title": "Ceniza: {text}",
  "bar.fire.forges": "Forjas",
  "bar.fire.forges.title": "Valor de carta forjado: suma de las mejoras ⚒ en todas las cartas.",
  "bar.fire.yield": "Rendimiento de fuego",
  "bar.fire.yield.base": "Puntuación de fuego",
  "bar.fire.yield.over": "Desbordamiento",
  "bar.fire.yield.over.hint": "Calor blanco (sobrecalentamiento por encima del 100 % de calor) + brasa de ceniza (ceniza por encima de la capacidad de la forja)",
  "bar.fire.overRun": "en toda la partida",
  "bar.fire.ashBurned": "Ceniza quemada",
  "bar.fire.brand": "Marca · rival",

  /* Lightning */
  "bar.lightning.chain": "🔗 Cadena de racha",
  "bar.lightning.chain.holds": " · aguanta",
  "bar.lightning.saturation": "🌐 Saturación de tormenta",
  "bar.lightning.breadth": "Amplitud de tormenta",
  "bar.lightning.breadth.payoff": "+{n} de valor / carta",
  "bar.lightning.depth": "Intensidad de tormenta",
  "bar.lightning.depth.payoff": "Arco: {n} puntos porcentuales → 1 carga",
  "bar.lightning.state.full": "Carga completa",
  "bar.lightning.state.crit": "Crítico ×{mult}",
  "bar.lightning.state.charge": "Carga {charge}/{max}",
  "bar.lightning.fullBadge": " · CARGA COMPLETA",
  "bar.lightning.noConsumer": "Llena: sin consumidor la carga se pierde. Elige {skill} para gastarla.",
  "bar.lightning.consumes": "Descargas",
  "bar.lightning.consumes.title": "Consumos de carga completa en esta partida: el ritmo central de la tormenta.",
  "bar.lightning.storm": "Frente de tormenta",
  "bar.lightning.storm.title": "Frente de tormenta: impulso de probabilidad de crítico por descarga (hasta +{cap} %).",
  "bar.lightning.discharge": "Descarga",
  "bar.lightning.discharge.title": "Descarga: impulso permanente del multiplicador de crítico por descarga.",
  "bar.lightning.frequency": "Frecuencia de rayo",
  "bar.lightning.frequency.over": "Crítico al máximo: la barra muestra ahora el multiplicador de crítico.",
  "bar.lightning.frequency.title": "Probabilidad de crítico de la próxima victoria.",
  "bar.lightning.streakGuard": "Protección de racha: una derrota con carga suficiente mantuvo la racha (½ carga gastada).",
  "bar.lightning.streak.broken": "rota",

  /* Ice */
  "bar.ice.chip.title": "Glaciar · masa {mass} · nivel {tier}",
  "bar.ice.chip.title.burst": "Glaciar · masa {mass} · nivel {tier} · ESTALLA",
  "bar.ice.bursting": "Estalla",
  "bar.ice.critical": "crítica",
  "bar.ice.playOrder": "Orden de juego (posición)",
  "bar.ice.cardValue": "Valor de carta",
  "bar.ice.state.ready": "Estallido listo",
  "bar.ice.state.count": "{n} glaciares",
  "bar.ice.yield": "Rendimiento de glaciar",
  "bar.ice.cascade": "Cascada",
  "bar.ice.cascade.unit": "estallan",
  "bar.ice.biggest": "Mayor agrupación",
  "bar.ice.empty": "Aún no hay glaciares. Congela cartas en la fase de orden.",
  "bar.ice.firnGround": "La nieve se acumula",
  "bar.ice.firnReserve": "Reserva del suelo",
  "bar.ice.frozenOpp": "Rivales congelados",
  "bar.ice.duoBuff": "Bonificación de dúo",
  "bar.ice.avalanche.ready": "Gran avalancha · lista",
  "bar.ice.avalanche.used": "Gran avalancha · gastada",

  /* Plant */
  "bar.plant.yield": "Rendimiento del jardín",
  "bar.plant.root": "Raíz",
  "bar.plant.bloom": "Floración",
  "bar.plant.harvest": "Cosecha",
  "bar.plant.grown": "Crecido",
  "bar.plant.grown.unit": "crecimiento total",
  "bar.plant.trimmed": "✂ Podado",
  "bar.plant.trimmed.unit": "· raíz/floración",
  "bar.plant.trimmed.title": "Poda: cada habilidad de crecimiento sustituida ({skills}) eleva de forma permanente la puntuación de raíz y floración.",
  "bar.plant.tallest": "🌳 Árbol más alto",
  "bar.plant.tallest.value": "Valor {value}",
  "bar.plant.overflow": "· desbordamiento",
  "bar.plant.perWin": "puntuación/victoria",
  "bar.plant.tallest.title": "Árbol madre: el árbol más profundo (crecimiento de desbordamiento por encima del tope de valor) paga en cada victoria verde y duplica su puntuación de raíz.",
  "bar.plant.forest": "🌲 Bosque",
  "bar.plant.forest.unit": "crecimiento de desbordamiento",
  "bar.plant.forest.title": "Árbol del mundo: la suma del crecimiento de desbordamiento de todas las cartas verdes paga en cada victoria verde (todo el bosque viejo).",
  "bar.plant.state.overgrown": "Invadido",
  "bar.plant.state.green": "Verde {pct} %",
  "bar.plant.share": "Proporción verde del campo",
  "bar.plant.share.badge": " · INVADIDO",
  "bar.plant.share.value": "{green} / {total} · {pct} %",
  "bar.plant.share.title": "Proporción de cartas verdes (maduras y desarrolladas) en el campo.",
  "bar.plant.mark.spring": "Prim. eterna",
  "bar.plant.mark.spring.title": "Primavera eterna: la invasión empieza ya con {pct} % del campo verde",
  "bar.plant.mark.overgrowth": "Invasión",
  "bar.plant.mark.overgrowth.title": "Invasión: desde {pct} %, todos los bloques de palo +factor",
  "bar.plant.nextRipe": "Próxima maduración",
  "bar.plant.nextRipe.title": "Estimación aproximada: la próxima plántula se pone verde (a partir de la tasa de crecimiento × distancia restante).",
  "bar.plant.nextRipe.wins_one": "~{count} victoria",
  "bar.plant.nextRipe.wins_other": "~{count} victorias",
  "bar.plant.stage.seed": "Plántula",
  "bar.plant.stage.seed.title": "Cartas en crecimiento que aún no están maduras (barra = Ø progreso hasta la madurez).",
  "bar.plant.stage.green": "Verde",
  "bar.plant.stage.green.title": "Cartas verdes maduras con valor por debajo del tope (barra = Ø progreso hasta el tope de valor).",
  "bar.plant.stage.full": "Desarrollada",
  "bar.plant.stage.full.title": "Completamente desarrollada (valor {cap}).",
  "bar.plant.strip.seed": "Plántula {growth}/{need}",
  "bar.plant.strip.green": "Verde · V{value}",
  "bar.plant.maturing": "Cartas madurando · {n}",
  "bar.plant.maturing.more": "+{n} más",
  "bar.plant.runners": "Estolones · colonizado",

  /* ---- Battlefield (Battlefield.jsx) ----
     The result banners take the canonical trio from package §3.1 — victoria / derrota / empate —
     rather than a participle. "Gewonnen" has no gender in German; "ganada" would agree with
     `baza`, and the same banner also sits over rows that are not a baza. The noun form is right in
     every position (§4.4).

     `bf.big.*` are the score announcements (§3.6), rendered in capitals by CSS. Stored in capitals
     here the way the released English side stores them. The Spanish escalation chain is a SOUND
     decision and goes to the owner in the decision block rather than being frozen here: the
     English chain carries a release date (15.08.2026), the Spanish one does not yet. */
  "bf.ready": "Listo: inicia el autobattler",
  "bf.trickCount": "Baza {n} / {total}",
  "bf.side.you": "Tú",
  "bf.side.opponent": "Rival",
  "bf.banner.win": "Victoria",
  "bf.banner.winCrit": "Victoria · crítica",
  "bf.banner.winTie": "Empate → victoria",
  "bf.banner.loss": "Derrota",
  "bf.banner.tie": "Empate",
  "bf.big.fierce": "BIEN",
  "bf.big.brutal": "BRUTAL",
  "bf.big.insane": "DEMENCIAL",
  "bf.big.godlike": "DIVINO",
  "bf.big.avalanche": "AVALANCHA",
  "bf.big.letsgo": "¡VAMOS!",
  "bf.crit": "¡Crítico!",
  "bf.crit.mult": "Crítico ×{n}",
  "bf.bd.base": "Base",
  "bf.bd.base.title": "Valor base de la victoria más todas las bonificaciones planas (ventajas, fijos de crítico, puntuación de arquetipo).",
  "bf.bd.streak": "Racha",
  "bf.bd.streak.title": "Multiplicador de la racha de victorias en curso.",
  "bf.bd.perks": "Ventajas",
  "bf.bd.perks.title": "Multiplicador de ventajas y familias, además de Ira Solar y los edificios de puntuación del Arquitecto.",
  "bf.bd.form": "Form.",
  "bf.bd.form.title": "Multiplicador de las formaciones en esta posición, incluidos Eco y Núcleo.",
  "bf.bd.crit": "Crít.",
  "bf.bd.crit.title": "Multiplicador de crítico de esta baza.",
  "bf.bd.direct": "Directo",
  "bf.bd.direct.title": "Puntuación directa que se salta la cadena: dividendo de brasas, rayo, planta, glaciar, Todo o Nada.",
  "bf.bd.total": "Total",
  "bf.bd.total.title": "Puntuación total de esta baza.",
  "bf.bd.aria": "Desglose de la puntuación de la baza",

  /* ---- Document title ----
     The brand changes with the language and a guard fails the moment one catalog carries another
     language's title (§3.1): Autostich · Autotrick · Autobaza. */
  "meta.title": "Autobaza · Prototipo",

  /* ---- Service-worker update prompt ---- */
  "update.available": "Nueva versión disponible",
  "update.reload": "Recargar",
  "update.dismiss": "Ocultar",

  /* ---- Skill selection (SkillSelect.jsx) ----
     `habilidad` is feminine, so every badge and participle around a skill agrees feminine:
     LEGENDARIA, seleccionada, Nueva. That is a fixed noun in the template rather than an inserted
     one, so it is safe — unlike the `{name}` cases §4.4 warns about. */
  "skill.eyebrow": "Habilidad · ciclo {cycle} · {held}/{slots} ranuras",
  "skill.title": "Elige una habilidad",
  "skill.arch.none": "Habilidad",
  "skill.reroll": "🎲 Relanzar · {n}",
  "skill.decline": "Rechazar → ventaja",
  "skill.skipCycle": "Saltar la ronda",
  "skill.bonus.hint": "Ranura extra de tu última ventaja. Elige otra habilidad ahora mismo.",
  "skill.declinePlain": "Rechazar",
  "skill.nav.prev": "tipo anterior",
  "skill.nav.next": "tipo siguiente",
  "skill.guide.title": "Guía: {arch}",
  "skill.guide.aria": "Abrir la guía de {arch}",
  "skill.more": "más",
  "skill.less": "menos",
  "skill.consumer.heat": "calor",
  "skill.consumer.charge": "carga",
  "skill.consumer.pre": "Ya tienes el consumidor de {kind}",
  "skill.consumer.post": "lo sustituye (como máximo 1 consumidor de {kind}). Tu recurso actual se conserva.",
  "skill.replace": "Sustituir",
  "skill.cancel": "Cancelar",
  "skill.slotsFull": "Ranuras llenas",
  "skill.slotsFull.hint": "Las {slots} ranuras están ocupadas. Elige una habilidad nueva; una ventana te preguntará a cuál sustituye.",
  "skill.replace.which": "¿Qué habilidad sustituyes?",
  "skill.replace.new": "Nueva:",
  "skill.replace.tap": "Toca la habilidad que debe salir.",
  "skill.replace.this": "↔ sustituir esta",
  "skill.badge.consumer": "CONSUMIDOR",
  "skill.badge.legendary": "★ LEGENDARIA",
  "skill.selected": "✓ seleccionada",
  "skill.held": "Tus habilidades: {held}/{slots} · ya en tu poder",
  "skill.heldBadge": "✓ en tu poder",
  "skill.lastOfArch": "⚠ Última habilidad de {arch}: {loss}.",
  "skill.lastOfArch.baked": " El valor de carta ya ganado se conserva.",
  "skill.loss.plant": "se pierden todas las cartas verdes, el crecimiento y las colonizaciones",
  "skill.loss.ice": "todos los glaciares se derriten; se pierden la masa y la reserva del suelo",
  "skill.loss.fire": "se pierden el calor, la ceniza y el contador de forja",
  "skill.loss.lightning": "se pierde la carga",
  "skill.passive.head": "{arch} · pasiva",
  "skill.passive.expand": "{arch}: desplegar la pasiva",
  "skill.passive.collapse": "{arch}: plegar la pasiva",
  "skill.passive.lightning": "La primera habilidad de Rayo da +{first} % de probabilidad de crítico, y cada una siguiente +{each} %. Además +{mult}× de multiplicador de crítico por cada habilidad de Rayo.",
  "skill.passive.fire": "Las victorias desde {margin} de ventaja en valor de combate dan +{heat} % de calor y +{score} de puntuación de fuego. Cuanto mayor sea la ventaja, más de ambos. Las derrotas cuestan {cool} % de calor, más tu desventaja de valor, como máximo {coolMax}. Cada habilidad de Fuego adicional da +{perSkill} de puntuación de fuego por punto de ventaja.",
  "skill.passive.ice": "Cada habilidad de Hielo congela una de tus cartas como glaciar, también cuando la cambias con las ranuras llenas. Deja de poder moverse en cualquier fase de orden, pero acumula masa en cada ciclo y acaba estallando sobre sus vecinas. A partir de {declineFrom} habilidades de Hielo en tu poder, incluso rechazar una oferta congela un glaciar, así que puedes tener más glaciares que ranuras de habilidad.",
  "skill.passive.plant": "Cada victoria da a la carta hasta +1 de crecimiento, a pleno ritmo desde {ref} habilidades de Planta. Desde {green} de crecimiento se pone verde. Si solo tienes habilidades de Planta, cada {perValue} de crecimiento da +1 de valor de carta, hasta {cap}; entonces está completamente desarrollada. Desde {minSkills} habilidades de Planta crece además con cada {everyLoss} derrotas.",
  "skill.forms.head": "Tus formaciones activas",
  "skill.forms.expand": "Desplegar el tablero de orden",
  "skill.forms.collapse": "Plegar el tablero de orden",
  "skill.forms.iceTitle": "El hielo dobla la detección",

  /* ---- Perk selection (PerkSelect.jsx) ----
     `build` is kept as the borrowed word, exactly as the German keeps it: it is the established
     roguelite term in Spanish too, and translating it to `configuración` would trade a word every
     player of the genre knows for one nobody uses. */
  "perk.start": "Inicio",
  "perk.cycle": "Ciclo {cycle}",
  "perk.title": "Elige una ventaja",
  "perk.reroll": "🎲 Relanzar · {n}",
  "perk.declineAll": "Rechazar todas",
  "perk.stat.crit": "Crít.",
  "perk.stat.scoreMult": "Mult. punt.",
  "perk.upgrade": "⬆ MEJORAR · {from}→{to}",
  "perk.onceHint": "Cada ventaja solo se puede elegir una vez por partida.",
  "perk.deckStrength": "Fuerza del mazo por palo",
  "perk.formations": "Formaciones",
  "perk.build_one": "Tu build: {count} ventaja",
  "perk.build_other": "Tu build: {count} ventajas",
  "perk.build.empty": "Aún no has elegido ninguna ventaja.",

  /* ---- Build summary ---- */
  "build.perks.head": "Ventajas: {count}",
  "build.skills.head": "Habilidades: {count}",
  "build.perks.empty": "Aún no hay ventajas.",
  "build.skills.empty": "Aún no hay habilidades.",
  "build.perks.emptyRun": "Aún no hay ventajas. En algunos ciclos eliges una.",
  "build.skills.emptyRun": "Aún no hay habilidades; se pueden elegir a partir del ciclo {cycle}.",
  "build.skill.yield.term": "Rendimiento",
  "build.skill.spark.yield": "hasta ahora **{score}** de puntuación en **{n}** repartos; **{store}** en el depósito.",
  "build.skill.spark.empty": "aún sin reparto; **{store}** en el depósito.",
  "build.deck.legend": "Barra = valor Ø · ◆ violeta = imbatible (>{over}, supera cualquier carta rival).",

  /* ---- Legendary skill phase ---- */
  "leg.fallbackLabel": "Legendaria",
  "leg.eyebrow": "Legendaria · elección única",
  "leg.title": "★ Habilidad legendaria",
  "leg.reroll": "↻ Relanzar",
  "leg.decline": "Sin legendaria, elegir una habilidad",

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

  /* ---- Family targeting ----
     `famtarget.alreadyBound` avoids a participle after `{n}`: "ya con rol asignado" carries no
     agreement, while "ya asignadas" would have to guess the gender of whatever is counted (§4.4). */
  "famtarget.alreadyBound": " ({n} ya con rol asignado)",
  "famtarget.pickType": "Elige un tipo de formación",
  "famtarget.deck": "Tu mazo · formaciones actuales",
  "famtarget.deck.arch": "Tu mazo · formaciones y edificios actuales",
  "famtarget.ordered": "El orden cuenta: primer palo = ganador (+), segundo = perdedor (−)",
  "famtarget.pickSuits_one": "Elige un palo",
  "famtarget.pickSuits_other": "Elige {count} palos",
  "famtarget.deckValues": "Valores del mazo por palo",
  "famtarget.strength": "Fuerza de formación:",

  /* ---- Cycle score ---- */
  "roundscore.label": "Puntuación del ciclo",
  "roundscore.diff": "{sign}{pct} %",
  "roundscore.diff.title": "Diferencia con el ciclo anterior",
  "roundscore.noPrev.title": "no hay ciclo anterior con el que comparar",
  "roundscore.firstCycle": "primer ciclo",

  /* ---- Interest / investment perk ---- */
  "zins.capital": "Capital:",
  "zins.rate": "· tipo de interés",
  "zins.payout": "Pago si tiene éxito:",
  "zins.wins": "Victorias en este ciclo:",
  "zins.cleared": "· obstáculo superado",
  "zins.crash": "· si no, quiebra",
  "zins.paid": "Pagado hasta ahora:",

  /* ---- Card detail panel ---- */
  "carddetail.empty": "Toca una carta para ver rol y modificadores …",
  "carddetail.origin": "Origen {base} (+{boost} de valor de carta)",
  "carddetail.roles": "Roles:",
  "carddetail.none": "ninguno",
  "carddetail.formations": "Formaciones:",
  "carddetail.member": " (miembro)",
  "carddetail.ion": "Ionización:",
  "carddetail.fieldCrit": "+{pct} % de crítico de campo",
  "carddetail.plant": "Planta:",
  "carddetail.plant.full": "Desarrollada",
  "carddetail.plant.ripe": "Verde (madura)",
  "carddetail.plant.seed": "Plántula",
  "carddetail.growth": "Crecimiento {n}",
  "carddetail.cardValue": "Valor de carta {value} / {cap}",
  "carddetail.rootScore": "+{n} de puntuación de raíz/victoria",
  "carddetail.rootScore.tap": " (×2 form.)",
  "carddetail.overflow": "Desbordamiento {n}",
  "carddetail.fire": "Fuego:",
  "carddetail.forged": "⚒ Forjada +{n} de valor de carta",
  "carddetail.building": "🏗 Edificio:",
  "carddetail.building.tier": " · nivel {tier}",
  "carddetail.building.none": "sin efecto directo sobre esta carta",

  /* ---- Card grid badges ---- */
  "cardgrid.openBoundary": "⇕ límite abierto",
  "cardgrid.arch.title": "🏗 {name} · +{boost} de valor",
  "cardgrid.glacier.title": "Parte de una formación de glaciar activa (2D)",
  "cardgrid.ripe.title": "Verde (madura): cuenta para el bloque de palo",
  "cardgrid.anchor.title": "⚓ Ancla · {type}",

  /* ---- Architect side panels ---- */
  "archpanels.tapHint": "Al tocar se ve dónde está en el tablero, y a la inversa.",
  "archpanels.roleLegend": "● Rol: objetivo de una ventaja o familia en esta carta",

  /* ---- Sparkline ---- */
  "sparkline.empty": "El historial aparece tras las primeras bazas…",
  "sparkline.axis.x": "Bazas",
  "sparkline.axis.y": "Puntuación",

  /* ---- Chronicle ---- */
  "chronik.eyebrow": "Crónica",
  "chronik.title": "Vista de cartas",
  "chronik.anchors": "Anclas",
  "chronik.anchor.row": "⚓ Pos {pos} · {type}",
  "chronik.formations": "Formaciones actuales",
  "chronik.noFormations": "No hay formaciones activas con multiplicador.",
  "chronik.archPhase": "🏗 Fase del Arquitecto",
  "chronik.archCount": "{n} edificios · {used}/{max} celdas",

  /* ---- Weekly modifiers ---- */
  "weekmods.title": "Modificadores semanales",
  "weekmods.range": " ({from}–{to})",

  /* ---- App-level dialogs ---- */
  "app.abort.title": "¿Pausar o terminar la partida?",
  "app.abort.help": "Terminar y guardar recuerda la partida; puedes continuarla más tarde desde el menú. Terminar la puntúa y muestra la pantalla final.",
  "app.abort.save": "Terminar y guardar",
  "app.keepPlaying": "Seguir jugando",
  "app.end": "Terminar",
  "app.abort.save.sub": "La partida se recuerda y la continúas más tarde desde el menú.",
  "app.abort.end.sub": "La partida se puntúa y aparece la pantalla final.",
  "app.keepPlaying.sub": "De vuelta al juego, no pasa nada.",
  "app.restart.title": "¿Seguro que quieres reiniciar?",
  "app.restart": "Reiniciar",
  "app.restart.help": "La partida actual se descarta y empieza una nueva de inmediato. Esto no se puede deshacer.",

  /* ---- Music ---- */
  "music.title": "Música",
  "music.next": "Pista siguiente",
  "music.playing": "Sonando: {title} · pista siguiente",

  /* ---- PWA install prompt ---- */
  "pwa.install": "Instalar",
  "pwa.title": "Añadir como aplicación a la pantalla de inicio",
  "pwa.ios": "Con el icono de compartir → “Añadir a pantalla de inicio”.",

  /* ---- Performance overlay (dev) ---- */
  "perf.report": "Informe → consola y portapapeles",
  "perf.reset": "Restablecer la medición",

  /* ---- Run loader ---- */
  "runloader.loading": "Cargando el mazo …",

  /* ---- Dev run configurator ---- */
  "dev.legendary": "★ Legendaria",
  "dev.run.title": "DEV RUN",
  "dev.run.sub": "Partida de prueba configurable libremente, solo para desarrolladores.",
  "dev.run.cycles": "Ciclos",
  "dev.run.offerTypes": "Tipos de oferta en el plan",
  "dev.run.distribute": "⇄ Repartir de forma uniforme",
  "dev.run.plan": "Plan por ciclo",
  "dev.run.energy": "Energía de orden",

  /* ---- The Architect (ArchitectScreen.jsx) ----
     "Stufe" is `nivel` throughout, never `umbral` — package §3.4 reserves `umbral` for the ice mass
     threshold precisely so the two cannot blur.

     "Legendär" lands on two Spanish forms here and that is correct rather than sloppy: a building
     is `legendario`, a skill is `legendaria`, and Spanish adjectives agree with the noun. The
     terminology table therefore freezes the two nouns, not the adjective.

     `arch.plot.used` says "{n} en uso" rather than "{n} ocupadas": the count is rendered next to
     cells here but the same phrasing reads wrong the moment it is not, and the neutral form costs
     nothing (§4.4).

     Percent spacing is transcribed from the German rather than normalised — the German source is
     itself inconsistent (`{pct}%` here, `+{pct} %` in `arch.pct`), and Spanish shares the German
     convention, so copying it keeps the two catalogs comparable cell by cell. */
  "arch.buildings": "Edificios",
  "arch.buildingsN": "Edificios ({n})",
  "arch.eyebrow": "Arquitecto · fase de construcción · ciclo {cycle}",
  "arch.title": "El Arquitecto",
  "arch.boost": "Impulso de edificios",
  "arch.boost.title": "Impulso de puntuación de tus edificios: combos de estructura (fila, columna o diagonal completa) + distrito (misma categoría contigua) + formaciones recién fundadas. Se actualiza en directo al construir o mover.",
  "arch.plot": "Espacio de construcción",
  "arch.plot.used": "{n} en uso · {pct}%",
  "arch.cycleScore": "Puntuación del ciclo",
  "arch.scoreDiff": "{sign}{pct} %",
  "arch.pct": "+{pct} %",
  "arch.buffSuit": "🎨 Potencia el palo",
  "arch.buffsSuit": "potencia el palo {suit}",
  "arch.boostDelta": "Impulso {arrow}{pct} %",
  "arch.boostDelta.title": "Cambio del impulso de edificios en esta posición de vista previa",
  "arch.boostDelta.phaseTitle": "Cambio del impulso de edificios desde el inicio de esta fase de construcción",
  "arch.combos": "Combos",
  "arch.combos.title": "Los edificios con bonificación de estructura o distrito brillan en el color de su tipo",
  "arch.forms": "Formaciones",
  "arch.forms.title": "Mostrar u ocultar los marcos de formación (anillo + etiqueta) en el tablero",
  "arch.legendary": "legendario",
  "arch.legendaryCap": "Legendario",
  "arch.tier": "Nivel {tier}",
  "arch.tierWord": "Nivel",
  "arch.tierArrow": "Nivel {from} → {to}",
  "arch.legend.frame": "Marco = tipo:",
  "arch.legend.tier": "Nivel (esquina):",
  "arch.legend.ring": "Anillo = formación activa (×mult)",
  "arch.cell.building": "{name} ({tier})",
  "arch.cell.preview": " · vista previa",
  "arch.cell.upgrade": " → nivel {tier}: {eff}",
  "arch.cell.formation": " · formación ×{f}",
  "arch.cell.formationOnly": " — formación ×{f}",
  "arch.cell.struct": " · estructura ×{f}",
  "arch.cell.pos": "Pos {pos}",
  "arch.eff.value": "+{n} de valor de baza",
  "arch.eff.score": "+{n} de puntuación",
  "arch.eff.scoreMult": "×{f} de puntuación",
  "arch.eff.streak": "+{n} de puntuación por punto de racha",
  "arch.eff.crit": "+{n} de puntuación con crítico",
  "arch.eff.color": "+{n} de puntuación con {suit}",
  "arch.eff.milestone": "+{n} de puntuación cada {every} victorias",
  "arch.eff.gamble": "+{crit} de puntuación con crítico; si no, −{penalty} de puntuación",
  "arch.eff.relay": "+{n} de puntuación (relevo)",
  "arch.eff.struct": "Estructura ×{f}",
  "arch.firn.title": "Nieve · reserva {n} (rellena aquí un glaciar al inicio del ciclo)",
  "arch.struct.head": "Estructura y distrito · ×puntuación por ciclo",
  "arch.struct.row": "fila completa ×{f}",
  "arch.struct.col": "columna completa ×{f}",
  "arch.struct.diag": "diagonal ×{f}",
  "arch.struct.district": "distrito +{pct} %/vecino",
  "arch.struct.note": "Cada carta en una fila, columna o diagonal completa produce proporcionalmente más puntuación al ganar. Los factores se acumulan de forma multiplicativa.",
  "arch.struct.districtNote": "Distrito: los edificios del mismo color (categoría) directamente contiguos dan +{pct} % de puntuación en sus celdas por cada vecino (hasta {cap} vecinos). Construir cosas parecidas juntas compensa.",
  "arch.noRoom": "No hay sitio para “{name}”.",
  "arch.noRoom.mark": "Marca un edificio para demoler (en el tablero o abajo); con un plano grande, quizá varios. No se demuele nada hasta que confirmes.",
  "arch.noRoom.enough_one": "Demoler {count} edificio deja sitio. Confirma para construir.",
  "arch.noRoom.enough_other": "Demoler {count} edificios deja sitio. Confirma para construir.",
  "arch.noRoom.more": "Aún no es suficiente. Marca otro edificio.",
  "arch.noRoom.replace": "sin sitio → sustituir",
  "arch.marked": "· marcado ✓",
  "arch.soloEnough": "· basta por sí solo",
  "arch.demolish": "Demoler ✓",
  "arch.demolish.n": "Demoler ({n}) ✓",
  "arch.demolish.warn": "Los edificios marcados se pierden al demolerlos.",
  "arch.back": "← Atrás",
  "arch.choose.head": "¿Qué construyes en esta fase?",
  "arch.noRotate": "⟳ no se puede girar",
  "arch.noRotate.big": "⟳ No se puede girar",
  "arch.noRotate.title": "Esta forma no se puede girar (ocupa una fila de segmento entera o es simétrica).",
  "arch.upgrade": "Mejorar",
  "arch.upgrade.big": "⬆ Mejorar",
  "arch.upgrade.sub": "un edificio +1 nivel",
  "arch.upgrade.none": " · nada que mejorar",
  "arch.upgrade.confirm": "⬆ Confirmar la mejora",
  "arch.upgrade.confirmHint": "Confirma abajo y se mejora.",
  "arch.upgrade.help": "elige abajo un edificio (o tócalo en el tablero): queda marcado en dorado, ves el efecto actual y el siguiente, y confirmas abajo. Los que no se pueden mejorar (legendarios, efecto sin niveles, nivel máximo) aparecen atenuados.",
  "arch.upgrade.reason.inert": "sin mejora: este efecto no tiene niveles",
  "arch.upgrade.reason.legendary": "los legendarios no se pueden mejorar",
  "arch.upgrade.reason.max": "ya está en el nivel máximo",
  "arch.upgrade.reason.acted": "en esta fase de construcción la acción principal (construir O mejorar) ya está gastada",
  "arch.upgrade.reason.generic": "no se puede mejorar",
  "arch.upgraded": "mejorado:",
  "arch.reroll": "🎲 Relanzar los planos · quedan {n}",
  "arch.now": "Ahora:",
  "arch.after": "Después:",
  "arch.place.head": "Colocar y mover",
  "arch.place.help": "arrastra los edificios a su sitio en el tablero (puedes agarrarlos por cualquier punto, ⟳ Girar arriba), tantas veces como quieras. Confirmar abajo inicia el ciclo.",
  "arch.rotate": "⟳ Girar",
  "arch.rotate.noRoom": "No hay sitio para girar. Lleva antes el edificio a un punto más despejado.",
  "arch.undo": "↶ Deshacer",
  "arch.reset": "Restablecer",
  "arch.otherPlan": "← Otro plano",
  "arch.rearrange": "↔ Reordenar los edificios",
  "arch.buildNothing": "No construir nada · continuar →",
  "arch.cancel": "Cancelar",
  "arch.confirmStart": "✓ Confirmar · iniciar el ciclo",
  "arch.yourBuildings": "Tus edificios ({n})",
  "arch.preview.head": "Vista previa y estado del tablero",
  "arch.preview.ok": "Vista previa",
  "arch.preview.bad": "aquí no cabe",
  "arch.sumValue": "Σ valor",
  "arch.stat.struct": "Bonificación de estructura",
  "arch.stat.sumValue": "Σ valor de carta",
  "arch.stat.plotUsed": "Espacio ocupado",
  "arch.stat.rows": "Hileras de casas",
  "arch.buildingCount": "{n} edificios",
  "arch.collapse.more": "▸ más",
  "arch.collapse.less": "▾ menos",
  "arch.planFallback": "Plano",
  "arch.buildingFallback": "Edificio",
  "arch.dev.catalog": "Catálogo completo (dev): categoría → familia → nivel. Una construcción por fase (después mover o confirmar).",

  /* ---- Statistics screen ---- */
  "stats.title": "Estadísticas",
  "stats.desk.readout": "Todos los números están guardados localmente en este dispositivo. Al hacer clic en una fila se abre la partida completa.",
  "stats.empty": "Aún no hay partidas. Juega una y aquí aparecerán tus estadísticas.",
  "stats.overview": "Resumen",
  "stats.bestScore": "Mejor puntuación",
  "stats.avgScore": "Puntuación Ø",
  "stats.playtime": "Tiempo jugado",
  "stats.games": "Partidas",
  "stats.bestStreak": "Mejor racha",
  "stats.trend": "Historial de puntuación · últimas {n} partidas",
  "stats.bestBuild": "Mejor build",
  "stats.bestBuild.hint": "Partida de récord · ver detalles ›",
  "stats.showDetails": "Mostrar detalles",
  "stats.seed": "Semilla {code}",
  "stats.coarseOrigin": "Partida antigua: modelo de origen aproximado (formación / crítico / edificios / otros). Las partidas nuevas muestran el desglose fino por arquetipo.",
  "stats.yourRuns": "Tus partidas",
  "stats.yourRuns.hint": "últimas {n}",
  "stats.record": "Récord",
  "stats.mostPicked": "Lo más elegido",
  "stats.mostPicked.hint": "en todo tu historial",
  "stats.topSkills": "Habilidades más elegidas",
  "stats.noSkills": "Aún no has jugado ninguna habilidad.",
  "stats.topPerks": "Ventajas más elegidas",
  "stats.archUse": "Uso de arquetipos",
  "stats.archUse.right": "{n}× · Ø {avg}",
  "stats.whatWorks": "Lo que mejor funciona",
  "stats.whatWorks.hint": "a partir de {n} partidas",
  "stats.tooFew": "Muy pocas partidas para sacar conclusiones fiables ({have}/{need}). Juega unas cuantas más.",
  "stats.bestArch": "Mejor arquetipo",
  "stats.bestArch.detail": " · Ø {avg} en {n} partidas",
  "stats.skillLift": "Mayor impulso de habilidad",
  "stats.perkLift": "Mayor impulso de ventaja",
  "stats.lift.value": "+{v} Ø",
  "stats.played": " · jugada {n}×",
  "stats.noPatterns": "Aún no hay patrones claros: tus elecciones varían todavía demasiado para medir impulsos con fiabilidad.",

  /* ---- Per-run statistics ----
     The three narrow KPI labels are abbreviated the way the German ones are (`Form.-Score`,
     `Geb.-Score`), with the noun first as Spanish requires: `Punt. form.`, `Punt. edif.`. */
  "runstats.winrate": "Tasa de victorias",
  "runstats.winrate.title": "Proporción de bazas ganadas",
  "runstats.bestStreak": "Mejor racha",
  "runstats.bestStreak.title": "Racha de victorias más larga",
  "runstats.bestTrick": "Mejor baza",
  "runstats.bestTrick.title": "Puntuación más alta de una sola baza",
  "runstats.critRate": "Tasa de críticos",
  "runstats.critRate.title": "Proporción de bazas con golpe crítico",
  "runstats.bestGlacier": "Mejor baza de glaciar",
  "runstats.formations": "Formaciones",
  "runstats.formations.title": "Máximo de formaciones activas a la vez",
  "runstats.formScore": "Punt. form.",
  "runstats.formScore.title": "Parte de la puntuación que viene de los multiplicadores de formación",
  "runstats.buildScore": "Punt. edif.",
  "runstats.buildScore.title": "Parte de la puntuación que viene de los edificios del Arquitecto",
  "runstats.critBonus": "Bonificación de crítico",
  "runstats.critBonus.title": "Parte de la puntuación que viene de los golpes críticos",
  "runstats.showDesc": "Mostrar la descripción",
  "runstats.cycles": "Ciclos",
  "runstats.wins": "Victorias",
  "runstats.duration": "Duración",
  "runstats.avgTricks": "Ø bazas",
  "runstats.avgTricks.title": "Bazas medias por ciclo",
  "runstats.perks": "Ventajas: {n}",
  "runstats.skills": "Habilidades",
  "runstats.tree": "Árbol de mejoras",
  "runstats.tree.nodes": "{done} / {total} nodos",
  "runstats.tree.note": "El árbol sigue actuando en todas las partidas fuera de la clasificación; dos puntuaciones solo se pueden comparar cuando se sabe cuánto progreso meta había detrás.",
  "runstats.hidden": "Las ventajas y el orden final quedan ocultos en las partidas de otros jugadores: las seis habilidades muestran el estilo de una partida, pero reproducirla exigiría las ventajas.",

  /* ---- Score-source graphs ---- */
  "graphs.src.formation": "Formación",
  "graphs.src.crit": "Crítico",
  "graphs.src.building": "Edificios",
  "graphs.src.serie": "Racha",
  "graphs.src.rest": "Otros",
  "graphs.src.glacier": "Rendimiento de glaciar",
  "graphs.src.plant": "Raíz + floración",
  "graphs.src.light": "Rendimiento de rayo",
  "graphs.src.fire": "Puntuación de fuego",
  "graphs.perTrick.open": "Ver la puntuación por baza en cada ciclo",
  "graphs.win": "victoria",
  "graphs.noWin": "sin victoria",
  "graphs.trick.title": "Baza {n}: {score} · {result}",
  "graphs.scaleHint": "Altura = puntuación por baza (cada ciclo tiene su propia escala)",
  "graphs.cycleAbbr": "C{n}",
  "graphs.cycle.title": "Ciclo {n}: {score}",

  /* ---- Leaderboard ----
     "Mach den Anfang" becomes "Empieza tú" rather than "Sé el primero": the German is genderless
     and the player is not, so the imperative keeps it that way (§4.4).

     "Platz 1" stays a numeral — `puesto 1` — where the English catalog had to write "first place"
     and buy itself an entry in the number guard's exception list. Spanish needs no exception. */
  "board.title": "Clasificación",
  "board.tab.global": "Global",
  "board.tab.week": "Esta semana",
  "board.tab.weekShort": "Semana",
  "board.tab.challenger": "Challenger",
  "board.tab.rules": "Reglas",
  "board.nav.global.sub": "Histórico · todas las partidas",
  "board.nav.champions.sub": "Puesto 1 de cada semana finalizada",
  "board.nav.rules.sub": "Base y todos los modificadores",
  "board.rules.intro": "Todo el mundo juega cada semana la misma semilla con una base justa: el árbol de mejoras no tiene efecto ({rerolls} relanzamientos por fase, todas las rarezas, fase legendaria en el ciclo {legCycle}). Cada semana, de 3 a 5 modificadores aleatorios (≥2 positivos, ≥1 negativo) cambian la partida, idénticos para todos. Solo cuentan las partidas completadas; al final de la semana el puesto 1 pasa al archivo Challenger y la clasificación empieza de nuevo.",
  "board.rules.pos": "Modificadores positivos",
  "board.rules.neg": "Modificadores negativos",
  "board.rules.pairs": "Pares excluyentes (nunca juntos)",
  "board.countdown": "{d}d {h}h {m}m {s}s",
  "board.resetIn": "Reinicio en {time}",
  "board.col.rank": "Puesto",
  "board.col.pilot": "Piloto",
  "board.col.score": "Puntos",
  "board.ctx.seed.t": "Misma semilla",
  "board.ctx.seed.s": "Todo el mundo juega la misma secuencia de cartas.",
  "board.ctx.base.t": "Base justa",
  "board.ctx.base.s": "El árbol de mejoras no tiene efecto.",
  "board.ctx.arch.t": "El puesto 1 pasa al archivo",
  "board.ctx.arch.s": "Al final de la semana, al archivo Challenger.",
  "board.weekSeed": "Semilla de la semana",
  "board.weekLabel": "Semana {week} · {year}",
  "board.play": "▶ Jugar",
  "board.locked": "🔒 Se desbloquea cuando todos los mazos estén desbloqueados y cada uno de los cuatro arquetipos haya estado presente en una partida jugada hasta el final; basta con una habilidad suya, y varios arquetipos cuentan en la misma partida. Las partidas abandonadas no cuentan.",
  "board.weekMods": "Modificadores de esta semana",
  "board.unavailable": "La clasificación no está disponible.",
  "board.loading": "Cargando la clasificación …",
  "board.empty": "Aún no hay entradas. Empieza tú.",
  "board.champions.unavailable": "Los campeones no están disponibles.",
  "board.champions.intro": "El puesto 1 de cada clasificación semanal finalizada llega aquí, una persona por semana.",
  "board.champions.loading": "Cargando los campeones …",
  "board.champions.empty": "Aún no hay ganadores semanales. Primero tiene que terminar la primera clasificación semanal.",
  "board.global.head": "Histórico · Top {n}",
  "board.global.sub": "todas las partidas",
  "board.global.empty": "Aún no hay ninguna partida en la clasificación global. Empieza tú.",
  "board.row.cycle": "Ciclo {n}",
  "board.tree.title": "{done} de {total} nodos del árbol de mejoras desbloqueados",
  "board.tree.none.title": "No se guardó el estado del árbol para esta partida",
  "board.week.viewOnly": "La clasificación de esta semana. Se juega con el botón de clasificatoria del menú.",

  /* ---- Glossary shell (entries themselves live in esGlossary.js) ---- */
  "glossary.title": "Glosario",
  "glossary.subtitle": "Términos y reglas especiales, no ventajas ni habilidades concretas",
  "glossary.open": "Abrir el glosario",
  "glossary.search": "Buscar … p. ej. eco, capas, calor",
  "glossary.clear": "Borrar la búsqueda",
  "glossary.all": "Todos",
  "glossary.noHit.pre": "Ningún término para",
  "glossary.noHit.post": "¿Probar con otra grafía?",
  "glossary.nav.categories": "Categorías",
  "glossary.nav.note": "La búsqueda abarca todas las categorías; los contadores indican dónde están los resultados.",
  "glossary.allTitle": "Todos los términos",
  "glossary.hits": "Resultados de “{q}”",
  "glossary.count_one": "{count} término",
  "glossary.count_other": "{count} términos",

  /* ---- Guide shell (the four archetype guides live in esGuides.js) ----
     "Der Kreislauf" is `El bucle`, NOT `el ciclo`: package §3.1 reserves `ciclo` for Durchlauf and
     calls it the only word for it. Using it here for a different concept would quietly break the
     one-term-one-word rule the terminology guard exists to hold. */
  "guide.title": "Guía",
  "guide.open": "Abrir la guía",
  "guide.subtitle": "Cómo se juega cada arquetipo, ve pasando",
  "guide.archOf": "Arquetipo {n} de {total}",
  "guide.core": "Idea central",
  "guide.loop": "El bucle",
  "guide.principles": "Cómo se juega",
  "guide.nav.archetypes": "Arquetipos",
  "guide.nav.note": "La guía explica cómo se juega. Los términos y las reglas especiales están en el glosario.",

  /* ---- Deck detail ---- */
  "deckdetail.back": "‹ Atrás",
  "deckdetail.back.title": "Atrás",
  "deckdetail.deck": "Mazo",
  "deckdetail.tab.skills": "Habilidades",
  "deckdetail.tab.challenges": "Desafíos",
  "deckdetail.legendaries": "Legendarias",
  "deckdetail.noUnlocks": "No hay desbloqueos ligados al mazo.",
  "deckdetail.consumer": "Consumidor",
  "deckdetail.trimmable": "podable",
  "deckdetail.needs": "necesita {name}",

  /* ---- Score milestones ---- */
  "milestone.mio": "{n} M",
  "milestone.label": "💠 Hitos {n}/{total}",
  "milestone.label.sp": "💠 Hitos {n}/{total} · +{sp} PB",
  "milestone.max": "Máximo · +{sp} PB",
  "milestone.next": "→ {at} +{sp}",
  "milestone.title.max": "Todos los hitos de puntuación alcanzados",
  "milestone.title.next": "Próximo hito: {at} (+{sp} PB)",

  /* ---- Unlock conditions ----
     "Platz 1" stays the numeral `puesto 1`. The English catalog needed two entries in the number
     guard's exception list here because "place 1" reads wrong in English; Spanish does not. */
  "unlock.none": "Siempre disponible",
  "unlock.games": "Juega {n} partidas",
  "unlock.games.one": "Juega una partida",
  "unlock.streak": "Consigue una racha de {n}",
  "unlock.score": "Alcanza {n} de puntuación",
  "unlock.noRerollRun": "Termina una partida sin usar ni un solo relanzamiento",
  "unlock.monoArchetypeRun": "Termina {n} partidas solo con habilidades de {archetype}",
  "unlock.allMonoArchetypes": "Desbloquea los cuatro mazos elementales ({n} partidas mono cada uno)",
  "unlock.allArchetypesRun": "Termina una partida con los cuatro elementos",
  "unlock.gottgleichRun": "Provoca por primera vez una baza “DIVINO”",
  "unlock.meisterNoReroll": "Termina una partida clasificatoria semanal sin un solo relanzamiento",
  "unlock.championWeek": "Termina una clasificación semanal en el puesto 1 (archivo Challenger)",
  "unlock.championWeekN": "Termina {n} clasificaciones semanales en el puesto 1 (archivo Challenger)",
  "unlock.buy": "Cómpralo en el taller de mazos con Puntos de mazo (PM)",
  "unlock.onboardingDone": "Termina la introducción",

  /* ---- Upgrade tree ----
     The German writes "frei" for two different things — `upgrades.ranked.free` means unlocked,
     `upgrades.free` means costs nothing. German is ambiguous here and English already resolved it
     ("unlocked" vs "free"); Spanish follows that reading, which is exactly what the reference
     column is for (package §2). Reported in unsicherheiten_es.md so the German side can decide
     whether it wants to disambiguate too.

     `upgrades.lane.perk2` says "Fase de ventajas 2" rather than "2.ª fase": the ordinal indicator
     is missing from the card font and package §5.3 forbids it. The numeral is kept so the number
     guard still sees the same digit on both sides. */
  "upgrades.title": "Mejoras",
  "upgrades.respec": "↺ Restablecer",
  "upgrades.nodes": " / {total} nodos · partida clasificatoria",
  "upgrades.ranked.free": "desbloqueada",
  "upgrades.ranked.at": "con {total}/{total} nodos",
  "upgrades.tapHint": "Toca un nodo para ver lo que hace.",
  "upgrades.details": "Detalles ›",
  "upgrades.legPhase": "Fase legendaria",
  "upgrades.tab.decks": "Mazos",
  "upgrades.tab.gen": "General",
  "upgrades.lane.cover": "Espacio de construcción",
  "upgrades.lane.energy": "Energía",
  "upgrades.lane.rerolls": "Relanzamientos",
  "upgrades.lane.rarity": "Rareza",
  "upgrades.lane.drops": "Tasas de aparición",
  "upgrades.lane.perk2": "Fase de ventajas 2",
  "upgrades.lane.note.afterLeg": "se abre tras el desbloqueo legendario",
  "upgrades.free": "gratis",
  "upgrades.state.soon": "Pronto",
  "upgrades.state.owned": "✓ Comprado",
  "upgrades.state.soonFull": "Disponible pronto",
  "upgrades.state.buyable": "Se puede comprar",
  "upgrades.state.lockSp": "PB insuficientes: cuesta {cost} PB",
  "upgrades.state.after": "Solo después de: {name}",
  "upgrades.state.needPrereq": "Requiere el nodo anterior",
  "upgrades.state.lockGate": "Necesita un nivel legendario desbloqueado",
  "upgrades.state.locked": "Aún bloqueado",
  "upgrades.buy": "Comprar · {cost} PB",
  "upgrades.buy.short": "{cost} PB",
  "upgrades.impact.title": "Lo que el árbol hace ahora mismo",
  "upgrades.impact.cover": "Espacio de construcción",
  "upgrades.impact.energy": "Energía de orden",
  "upgrades.impact.rerolls": "Relanzamientos por oferta",
  "upgrades.impact.legRerolls": "Relanzamientos legendarios",
  "upgrades.impact.of": "de {max}",
  "upgrades.impact.maxed": "Al máximo",
  "upgrades.impact.dropNow": "Calidad de ventajas ahora",
  "upgrades.page.general": "General",
  "upgrades.page.generalHint": "Se aplica a todas las partidas, sea cual sea el mazo.",
  "upgrades.nav.decks": "Mazos",
  "upgrades.deckLead": "Mazo",
  "upgrades.skills.title": "Habilidades de este arquetipo",
  "upgrades.skills.legendary": "Habilidades legendarias",
  "upgrades.owned": "compradas",
  "upgrades.buyable": "se pueden comprar",
  "upgrades.locked": "🔒 bloqueadas ·",
  "upgrades.soon": "Pronto = marcador de posición",

  /* ---- Deck workshop (CustomizeScreen.jsx) ----
     `pack` stays the borrowed word, and so it is identical to the German — an honest SAME_OK entry
     rather than a missed translation. The register already tolerates it: the German catalog itself
     writes "Battlefield" untranslated one line further down, and the English one writes "packs" as
     an ordinary noun. `Battlefield` however DOES get translated here (`campo de batalla`), because
     English treats it as a common noun too and only German left it standing.

     "Prunk" is the pomp effect on a godlike trick. English flattened it to "score effect"; Spanish
     keeps the flourish the German has — `efecto de gala` — because package §3 asks for the
     idiosyncratic word where the German is idiosyncratic.

     Two German verbs that both mean "activate" are kept apart: `aktivieren` -> `activar` for a
     pack or tier, `einschalten` -> `encender` for a toggle, which then pairs with `apagar`. */
  "shop.unlock": "🔒 Desbloquear: {cond}",
  "shop.title": "Taller de mazos",
  "shop.tier.active": "Nivel {roman} activo ✓",
  "shop.tier.activate": "Activar el nivel {roman}",
  "shop.head.packs": "{n} packs · {own} desbloqueados",
  "shop.head.challenges": "{n} desafíos · {own} desbloqueados",
  "shop.head.hint": "Toca una carta para ver el dorso, el anverso y el campo de batalla.",
  "shop.tile.dblEquip": "Doble clic para equipar al instante",
  "shop.tile.sub.active": "activo",
  "shop.tile.sub.details": "tocar → detalles",
  "shop.tile.sub.detailsTier": "Nivel {roman} · tocar → detalles",
  "shop.tile.sub.owned": "desbloqueado",
  "shop.tile.sub.ownedTier": "Nivel {roman} · desbloqueado",
  "shop.tile.sub.buyable": "disponible",
  "shop.randomDeck.title": "Mazo aleatorio por partida",
  "shop.randomDeck.desc": "Cada partida empieza con uno de tus mazos al azar; todos los efectos activos en el color del mazo.",
  "shop.randomDeck.aria": "Mazo aleatorio por partida",
  "shop.noBattlefield": "Sin campo de batalla",
  "shop.emptyView": "No hay nada en esta vista.",
  "shop.hint.challenge": "Un mazo de desafío no se compra: se desbloquea superando un desafío. Tócalo → vista previa y condición de desbloqueo; en cuanto la cumplas, lo activas directamente.",
  "shop.hint.pack": "Un pack reúne la carta (anverso y dorso) y un campo de batalla. Toca un pack → vista de detalle con vista previa; al comprarlo se activa directamente.",
  "shop.activeCheck": "Activo ✓",
  "shop.activate": "Activar",
  "shop.activeChip": "ACTIVO",
  "shop.tab.packs": "Packs",
  "shop.tab.challenges": "Desafíos",
  "shop.tab.fx": "Efectos",
  "shop.filter.all": "Todos",
  "shop.filter.owned": "En posesión",
  "shop.filter.buyable": "Comprables",
  "shop.filter.free": "Gratis",
  "shop.filter.locked": "Bloqueados",
  "shop.sort.color": "Color",
  "shop.sort.price": "Precio",
  "shop.sort.default": "Predeterminado",
  "shop.sort.hint": "Cambiar el orden de las casillas",
  "shop.fx.hint": "Los efectos son globales: se compran una vez y valen para todos los packs. Elige una categoría arriba y toca un efecto → se reproduce en el escenario; ahí lo compras, lo eliges o lo enciendes y apagas. Un doble toque en la lista lo cambia al instante.",
  "shop.standardFree": "Predeterminado: siempre activo, no hace falta comprarlo",
  "shop.buy": "Comprar · {price} PM",
  "shop.tooFewDp": " (PM insuficientes)",
  "shop.selected": "✓ Seleccionado",
  "shop.chooseFinisher": "Elegir como remate",
  "shop.chooseBg": "Elegir como fondo",
  "shop.chooseGott": "Elegir como efecto de gala",
  "shop.chooseGottStandard": "Elegir como predeterminado (sin efecto de gala)",
  "shop.chooseAnim": "Elegir como animación",
  "shop.on.tapOff": "✓ Encendido: toca para apagarlo",
  "shop.turnOn": "Encender",
  "shop.bg.noneActive": "✓ Activo: sin fondo",
  "shop.bg.none": "Sin fondo",
  "shop.packSel.back": "Dorso de la carta",
  "shop.packSel.front": "Anverso de la carta",
  "shop.packSel.bg": "Fondo",
  "shop.anim.noneActive": "✓ Activo: sin animación",
  "shop.anim.none": "Todas las animaciones apagadas",
  "shop.color.standard": "Predeterminado",
  "shop.color.deck": "Color del mazo",
  "shop.cube.filled": "Relleno",
  "shop.cube.wire": "◇ Solo el contorno",
  "shop.status.active": "activo",
  "shop.status.owned": "en posesión",
  "shop.dblTap.on": "Doble toque: seleccionar",
  "shop.dblTap.off": "Doble toque: quitar la selección",

  /* ---- Tutorial sections ----
     Plain register, short sentences, `tú` throughout — the German is deliberately unadorned here
     and the Spanish stays that way.

     One near-collision worth naming: `tut.danach.baum.0` talks about the general advantages the
     upgrade tree buys. That is `beneficios`, NOT `ventajas` — `ventaja` is the frozen word for a
     Perk (§3.5), and using it for a plain noun here would blur exactly the term the terminology
     guard exists to keep sharp. */
  "tut.eyebrow": "Tutorial",
  "tut.title": "Aprende Autobaza",
  "tut.sub": "Temas sueltos, cada uno en un minuto.",
  "tut.seen": "leído",
  "tut.resume": "Seguir",
  "tut.allProgress": "Todos los temas · {done} de {total}",
  "tut.tip": "Consejo",
  "tut.back": "Atrás",
  "tut.next": "Siguiente",
  "tut.progress": "{n} / {total}",
  "tut.allTopics": "Todos los temas",
  "tut.openGlossary": "Abrir el glosario",

  "tut.probe.formation.title": "Pruébalo · un segmento",
  "tut.probe.formation.readout": "Detectado",
  "tut.probe.formation.none": "ninguna formación",
  "tut.probe.streak.title": "Pruébalo · la racha",
  "tut.probe.streak.readout": "Racha",
  "tut.probe.score.title": "Pruébalo · los factores",
  "tut.probe.score.readout": "Una victoria paga",
  "tut.probe.board.title": "Pruébalo · un trozo del tablero",
  "tut.probe.board.readout": "Impulso de edificios",
  "tut.probe.board.none": "sin impulso",

  "tut.f.streak": "Racha",
  "tut.f.crit": "Crítico",
  "tut.f.form": "Formación",
  "tut.f.build": "Edificio",

  "tut.grundlagen.title": "Fundamentos",
  "tut.grundlagen.sub": "Qué es Autobaza, cómo se juega una baza, de dónde sale tu puntuación.",
  "tut.grundlagen.wasist.title": "Qué es Autobaza",
  "tut.grundlagen.wasist.0": "Tu mazo juega solo contra un segundo mazo. Tú lo construyes antes. Durante la baza ya no intervienes.",
  "tut.grundlagen.wasist.1": "Tus cartas, en el orden en el que salen.",
  "tut.grundlagen.wasist.2": "No puedes perder. Solo puedes hacer más o menos puntuación.",
  "tut.grundlagen.stich.title": "La baza",
  "tut.grundlagen.stich.0": "Se enfrentan dos cartas. Gana la que tiene mayor valor de combate.",
  "tut.grundlagen.stich.1": "Si las dos son iguales, no gana nadie. Entonces la baza no cuenta.",
  "tut.grundlagen.werte.title": "Valor de carta y valor de baza",
  "tut.grundlagen.werte.0": "El valor de carta está impreso en la carta y se queda. Un valor de baza se suma solo para esa baza.",
  "tut.grundlagen.werte.1": "Los dos juntos son el valor de combate. Solo eso decide.",
  "tut.grundlagen.durchlauf.title": "Ciclo y partida",
  "tut.grundlagen.durchlauf.0": "{cards} bazas son un ciclo. {cycles} ciclos son una partida.",
  "tut.grundlagen.durchlauf.1": "Entre dos ciclos puedes cambiar algo. Dentro del ciclo, no.",
  "tut.grundlagen.serie.title": "La racha",
  "tut.grundlagen.serie.0": "Cada victoria seguida es un punto de racha. Cuanto más larga sea la racha, más cuenta cada baza.",
  "tut.grundlagen.serie.1": "Mueve el control y mira lo que hace la racha.",
  "tut.grundlagen.serie.2": "Una derrota deja la racha a cero.",
  "tut.grundlagen.crit.title": "El crítico",
  "tut.grundlagen.crit.0": "Un crítico es una victoria que cuenta el doble o más. Ocurre al azar.",
  "tut.grundlagen.crit.1": "Al principio no tienes probabilidad de crítico. Viene de las ventajas y las habilidades.",
  "tut.grundlagen.score.title": "De qué se compone tu puntuación",
  "tut.grundlagen.score.0": "Una victoria paga puntos base. La racha, el crítico, las formaciones y los edificios los multiplican.",
  "tut.grundlagen.score.1": "Enciende y apaga los factores.",
  "tut.grundlagen.score.2": "Todo se multiplica. Dos factores pequeños suelen ganar a uno grande.",
  "tut.grundlagen.anzeigen.title": "Los indicadores durante la partida",
  "tut.grundlagen.anzeigen.0": "Arriba están la puntuación, la racha y el ciclo. Al lado se ve de dónde viene tu puntuación.",
  "tut.grundlagen.anzeigen.1": "Las barras de color solo aparecen cuando juegas un arquetipo.",

  "tut.aufstellung.title": "Fase de orden",
  "tut.aufstellung.sub": "Orden de las cartas, energía, formaciones, segmentos.",
  "tut.aufstellung.phase.title": "La fase de orden",
  "tut.aufstellung.phase.0": "Entre dos ciclos reordenas las cartas. Para eso tienes {energy} de energía.",
  "tut.aufstellung.phase.1": "Cada intercambio cuesta una energía. Cuando se acaba, el orden se queda como está.",
  "tut.aufstellung.tauschen.title": "Intercambiar cartas",
  "tut.aufstellung.tauschen.0": "Toca una carta y luego otra. Cambian de sitio.",
  "tut.aufstellung.tauschen.1": "Pruébalo. Abajo se ve lo que sale.",
  "tut.aufstellung.tauschen.2": "El orden nuevo vale para todo el ciclo siguiente.",
  "tut.aufstellung.position.title": "Posición y segmento",
  "tut.aufstellung.position.0": "Cada carta tiene un sitio fijo. Cada {segment} sitios forman un segmento.",
  "tut.aufstellung.position.1": "Algunas bonificaciones solo cuentan dentro de un segmento.",
  "tut.aufstellung.karte.title": "Qué muestra una carta",
  "tut.aufstellung.karte.0": "El valor va en grande. En pequeño van las abreviaturas de las formaciones en las que está la carta.",
  "tut.aufstellung.karte.1": "El multiplicador de al lado vale solo para ese sitio.",
  "tut.aufstellung.formationen.title": "Qué son las formaciones",
  "tut.aufstellung.formationen.0": "Si tus cartas forman un patrón, la baza cuenta más. Ese patrón se llama formación.",
  "tut.aufstellung.formationen.1": "Intercambia dos cartas y mira qué se detecta.",
  "tut.aufstellung.formationen.2": "Hay cuatro patrones. Cada uno paga su propio factor.",
  "tut.aufstellung.stapeln.title": "Formaciones superpuestas",
  "tut.aufstellung.stapeln.0": "Una carta puede estar en varias formaciones. Entonces los factores se multiplican.",
  "tut.aufstellung.stapeln.1": "Busca un orden en el que encajen dos patrones a la vez.",
  "tut.aufstellung.stapeln.2": "El multiplicador solo cuenta si ganas la baza.",

  "tut.wahl.title": "Ventajas y habilidades",
  "tut.wahl.sub": "Ofertas, ranuras, arquetipos, legendarias.",
  "tut.wahl.perks.title": "Ventajas",
  "tut.wahl.perks.0": "Cada cierto tiempo eliges una ventaja de entre {offered}. Se puede rechazar.",
  "tut.wahl.perks.1": "Algunas ventajas te piden después cartas o un palo. Forma parte de ellas.",
  "tut.wahl.raritaet.title": "Rareza",
  "tut.wahl.raritaet.0": "Las ventajas vienen por niveles. Las más raras son más fuertes y salen menos.",
  "tut.wahl.raritaet.1": "Una ventaja legendaria es rara y fuerte. Cógela si encaja con lo que estás montando.",
  "tut.wahl.neuwurf.title": "Relanzamiento",
  "tut.wahl.neuwurf.0": "Si no te gusta ninguna oferta, la relanzas.",
  "tut.wahl.neuwurf.1": "Las ventajas, los edificios y las habilidades tienen reservas separadas. No hay recambio.",
  "tut.wahl.skills.title": "Habilidades",
  "tut.wahl.skills.0": "En las rondas de habilidad eliges entre {offered} habilidades. Como mucho puedes tener {slots}.",
  "tut.wahl.skills.1": "La primera habilidad de un color desbloquea su arquetipo.",
  "tut.wahl.motor.title": "Consumidor y amplificador",
  "tut.wahl.motor.0": "Un consumidor gasta tu recurso para lograr un efecto fuerte. Un amplificador no hace nada sin su habilidad base.",
  "tut.wahl.motor.1": "Cuantas más habilidades de un arquetipo tengas, más pagan sus efectos.",
  "tut.wahl.legendaer.title": "Habilidades legendarias",
  "tut.wahl.legendaer.0": "En el ciclo {cycle} llega una habilidad legendaria. Recibe un sitio propio.",
  "tut.wahl.legendaer.1": "No se cambia. La elección vale hasta el final de la partida.",

  "tut.archetypen.title": "Los cuatro arquetipos",
  "tut.archetypen.sub": "Fuego, Rayo, Hielo y Planta: un recurso cada uno, un camino cada uno.",
  "tut.archetypen.feuer.title": "Fuego",
  "tut.archetypen.feuer.0": "Fuego acumula calor. El calor sube cuando ganas con claridad, no cuando ganas por poco.",
  "tut.archetypen.feuer.1": "Cómo se juega Fuego está en la guía.",
  "tut.archetypen.feuer.2": "El calor acumulado paga por sí solo. Para quemarlo hace falta antes la habilidad adecuada.",
  "tut.archetypen.blitz.title": "Rayo",
  "tut.archetypen.blitz.0": "Rayo acumula carga y la convierte en críticos. Construye las dos cosas él mismo.",
  "tut.archetypen.blitz.1": "Cómo se juega Rayo está en la guía.",
  "tut.archetypen.blitz.2": "Rayo empieza despacio. Paga tarde, pero paga fuerte.",
  "tut.archetypen.eis.title": "Hielo",
  "tut.archetypen.eis.0": "Hielo congela cartas en el tablero y acumula masa sobre ellas. Cuando el hielo estalla, lo paga todo de golpe.",
  "tut.archetypen.eis.1": "Cómo se juega Hielo está en la guía.",
  "tut.archetypen.eis.2": "Después de cada habilidad de Hielo eliges una carta para el glaciar. Es obligatorio.",
  "tut.archetypen.pflanze.title": "Planta",
  "tut.archetypen.pflanze.0": "Planta hace crecer las cartas. Una carta madura vale más para siempre.",
  "tut.archetypen.pflanze.1": "Cómo se juega Planta está en la guía.",
  "tut.archetypen.pflanze.2": "Planta necesita tiempo. Lo que crece pronto es lo que más rinde al final.",

  "tut.architekt.title": "El Arquitecto",
  "tut.architekt.sub": "Fase de construcción, edificios, bonificaciones de estructura y de distrito.",
  "tut.architekt.bauphase.title": "La fase de construcción",
  "tut.architekt.bauphase.0": "En la fase de construcción colocas edificios sobre tu tablero de cartas. No hay dinero.",
  "tut.architekt.bauphase.1": "Un edificio afecta a la carta que está en su celda.",
  "tut.architekt.brett.title": "Tablero y espacio de construcción",
  "tut.architekt.brett.0": "Tus sitios están delante de ti como un tablero. Solo puedes ocupar un número limitado de celdas.",
  "tut.architekt.brett.1": "La escasez es la gracia. Dónde construyes es la decisión.",
  "tut.architekt.bauen.title": "Colocar y girar",
  "tut.architekt.bauen.0": "Cada edificio tiene una forma. Puedes girarla hasta que encaje.",
  "tut.architekt.bauen.1": "Coloca el edificio y gíralo.",
  "tut.architekt.bauen.2": "Los edificios nunca se solapan.",
  "tut.architekt.sorten.title": "Los tres tipos",
  "tut.architekt.sorten.0": "Las estructuras portantes dan valor, los edificios comerciales dan puntuación y los sacros ayudan a tus formaciones.",
  "tut.architekt.sorten.1": "El tipo está en el plano. Los tipos iguales uno al lado del otro pagan más.",
  "tut.architekt.boni.title": "Estructura y distrito",
  "tut.architekt.boni.0": "Una fila completa es una estructura. Los tipos iguales contiguos son un distrito.",
  "tut.architekt.boni.1": "Completa una fila y mira lo que pasa.",
  "tut.architekt.boni.2": "Las dos cosas solo pagan si ganas la baza.",
  "tut.architekt.aufwerten.title": "Mejorar y mover",
  "tut.architekt.aufwerten.0": "En vez de construir algo nuevo, mejoras un edificio. Entonces se vuelve más fuerte.",
  "tut.architekt.aufwerten.1": "Mover es un paso propio después de construir. Úsalo cuando a una estructura le falte una celda.",

  "tut.danach.title": "Después de la partida",
  "tut.danach.sub": "Pantalla final, puntos, árbol de mejoras, partida clasificatoria.",
  "tut.danach.endscreen.title": "La pantalla final",
  "tut.danach.endscreen.0": "Al final ves tu puntuación y de dónde salió.",
  "tut.danach.endscreen.1": "Tu mejor partida te acompaña como fantasma. En la siguiente te enseña dónde estás.",
  "tut.danach.punkte.title": "Hitos y puntos",
  "tut.danach.punkte.0": "Una partida terminada paga puntos. Las puntuaciones altas pagan además hitos.",
  "tut.danach.punkte.1": "Hay dos clases: una para el árbol de mejoras y otra para el aspecto de tu mazo.",
  "tut.danach.baum.title": "Árbol de mejoras y taller",
  "tut.danach.baum.0": "En el árbol de mejoras compras beneficios que valen para todas las partidas futuras.",
  "tut.danach.baum.1": "El taller solo cambia el aspecto. No afecta a tu puntuación.",
  "tut.danach.rangliste.title": "Partida clasificatoria",
  "tut.danach.rangliste.0": "Una vez por semana hay una partida para todos con las mismas cartas.",
  "tut.danach.rangliste.1": "Allí rigen reglas especiales que cambian cada semana. Léelas antes de empezar.",

  /* ---- Start screen (StartScreen.jsx) ----
     `start.logo.alt` is the word mark and the guard names it explicitly: it must equal the brand
     for this language in capitals, so AUTOBAZA — never AUTOSTICH or AUTOTRICK.

     `start.onb.legendary` is the one interpolation in this file, and it is the F1 case in
     miniature: the cycle number is `${LEG_PHASE_CYCLE}`, at the same site the English uses it. A
     typed-out 29 would read correctly today and go silently wrong at the next balance pass.

     "Bonus" becomes `bonificación` throughout rather than the borrowed "bonus". The English
     catalog could leave it standing because it is the same word there — which is why it sits in
     the English SAME_OK list — but Spanish has its own word and the exception would hide a real
     missing translation. */
  "start.tutorial": "Tutorial",
  "start.tutorial.offer": "Iniciar el tutorial",
  "start.tutorial.offer.sub": "Una partida guiada te lo explica todo paso a paso",
  "start.feedback": "Comentarios",
  "start.discord": "Abrir Discord",
  "start.logo.alt": "AUTOBAZA",
  "start.progress.onboarding": "Introducción",
  "start.progress.bonus": "Bonificación {cur} · siguiente +5",
  "start.progress.runs": "{done} / {total} partidas",
  "start.progress.links": "{done} / {total}",
  "start.progress.next": "Próximo desbloqueo:",
  "start.onb.reroll": "Relanzamiento +1",
  "start.onb.plant": "Planta desbloqueada",
  "start.onb.ice": "Hielo desbloqueado",
  "start.onb.rarity": "Rareza: {tier}",
  "start.onb.legendary": `Legendaria ⭐ (ciclo ${LEG_PHASE_CYCLE})`,

  "start.resume": "▶ Continuar la partida",
  "start.resume.sub": "Ciclo {cycle}/{total} · Puntuación {score}",
  "start.normal": "Empezar una partida",

  "start.seed.placeholder": "Pegar una semilla",
  "start.seed.aria": "Pegar una semilla y jugar",
  "start.seed.play": "↻ Jugar",
  "start.seed.error": "La semilla no es válida. Revisa el código e inténtalo de nuevo.",
  "start.secret.unlock": "🔓 Todo desbloqueado.",
  "start.secret.onboarding": "⏭️ Introducción omitida · +10 PB · +50 PM",
  "start.secret.reset": "🔄 Restableciendo el perfil …",

  "start.ranked": "Clasificatoria",
  "start.ranked.badge": "Semana {n}",
  "start.ranked.badge.aria": "Desafío semanal, semana {n}",
  "start.ranked.bonus": "Bonificación {have}/{max}",
  "start.ranked.open": "Abrir la clasificación semanal",
  "start.ranked.locked": "Ver la clasificación semanal. Jugar se desbloquea cuando todos los mazos estén desbloqueados y cada uno de los cuatro arquetipos haya estado presente en una partida jugada hasta el final (basta con una habilidad suya)",

  "start.tile.workshop": "Taller de mazos",
  "start.tile.workshop.locked": "El taller de mazos se desbloquea al terminar la introducción",
  "start.tile.upgrades": "Mejoras",
  "start.tile.upgrades.title": "Árbol de mejoras",
  "start.tile.upgrades.locked": "Se desbloquea al terminar la introducción",
  "start.tile.upgrades.buyable": "{n} disponibles",
  "start.tile.upgrades.complete": "✓ completo",
  "start.tile.leaderboard": "Clasificación",
  "start.tile.leaderboard.sub": "Mejores puntuaciones globales",
  "start.tile.stats": "Estadísticas",
  "start.tile.stats.sub": "Partidas y récords",
  "start.tile.lock_one": "🔒 falta {count} partida",
  "start.tile.lock_other": "🔒 faltan {count} partidas",

  /* #desktop — status board on the start screen (shown from 1280 px). Terminology per the frozen
     table: Durchlauf = ciclo, Stichpunkte = Puntos de baza, Spielfeld = campo de batalla. */
  "start.board.title": "Tu situación",
  "start.board.field": "Campo de batalla · {name}",
  "start.board.fx": "Efectos · {list}",
  "start.board.sp": "Puntos de baza",
  "start.board.sp.sub": "{done} / {total} nodos",
  "start.board.dp": "Puntos de mazo",
  "start.board.dp.sub": "Saldo del taller",
  "start.board.week": "Semana {n}",
  "start.board.week.val": "{have}/{max}",
  "start.board.week.bonus": "+{sp} PB · +{dp} PM",
  "start.board.week.bonus.full": "+{dp} PM",
  "start.board.week.open": "Bonificación pendiente",
  "start.board.week.done": "Bonificación conseguida",
  "start.board.last": "Última partida",
  "start.board.last.sub": "Ciclo {cycle}",
  "start.board.last.none": "—",
  "start.board.last.none.sub": "aún sin partidas",
  "start.tile.upgrades.sub": "Mejoras permanentes",
  "start.tile.workshop.sub": "Mazos, campos de batalla, efectos",

  "start.options": "Opciones",
  "start.name.set": "Elegir un nombre para la clasificación global",
  "start.name.change": "cambiar el nombre",
  "start.name.signedIn": "Sesión iniciada como",
  "start.version.title": "Versión · entorno · commit",

  /* ---- Cosmetic effect groups ---- */
  "fxgroup.karten.title": "Cartas",
  "fxgroup.karten.hint": "habilidad siempre activa · una animación",
  "fxgroup.stich.title": "Baza",
  "fxgroup.stich.hint": "solo uno activo",
  "fxgroup.hintergrund.title": "Fondo",
  "fxgroup.hintergrund.hint": "uno activo · el brillo es gratis",
  "fxgroup.score.title": "Puntuación",
  "fxgroup.score.hint": "solo uno activo",

  /* ---- Cosmetic effect descriptions ----
     The decimal multipliers in `fxsyn.klinge.desc` are transcribed straight from the German —
     ×1,25 · ×1,5 · ×2,0 — because Spanish uses the comma too. The English catalog had to convert
     them; Spanish does not, which is also why the number guard sees the same set on both sides.

     `Hologrid` is coined in German and gets a coined Spanish counterpart (`holomalla`) rather than
     being left standing: package §8 asks for cosmetic effect names to be translated but kept
     consistent as a set, and the word appears again inside the description. */
  "fxsyn.standard.name": "Predeterminado",
  "fxsyn.standard.desc": "El remate básico y sencillo (siempre disponible, opción predeterminada): la carta rival vencida sale volando hacia un lado después de la baza, igual que tu propia carta cuando pierdes. Al ganar, el sonido de revelado suena un poco más agudo. Sin corte, sin gala.",
  "fxsyn.klinge.name": "Hoja",
  "fxsyn.klinge.desc": "Una hoja coreografiada parte la carta rival. El movimiento base es un tajo desde la izquierda; cuanto mayor sea tu multiplicador de racha, más direcciones entran una tras otra (desde ×1,25 alternando izquierda y derecha, desde ×1,5 además desde arriba, desde ×2,0 las cuatro, incluido el corte en Z). La hoja también corta con más fuerza. Una derrota reinicia la racha. En blanco acero frío o en el color del mazo.",
  "fxsyn.scorch.name": "Láser",
  "fxsyn.scorch.desc": "Un láser dispara una vez desde una dirección aleatoria contra la carta rival. Después esta se consume de forma orgánica: un borde de quemadura irregular avanza por la carta con el filo al rojo, mientras se elevan brasas suaves, cae ceniza y saltan chispas. En fuego estándar o en el color del mazo.",
  "fxsyn.hologridSlice.name": "Láser de holomalla",
  "fxsyn.hologridSlice.desc": "Una línea láser recorre la carta rival vencida en paralelo a los ejes y descubre una retícula de juntas. Después la carta se descompone en una cuadrícula de teselas: los trozos salen girando y rebotan en el suelo mientras la ilustración se desvanece pronto, de modo que solo queda el marco luminoso de holomalla. En cian y magenta estándar o en el color del mazo.",
  "fxsyn.blackhole.name": "Agujero negro",
  "fxsyn.blackhole.desc": "Un agujero negro persistente en mitad del campo que crece con tu racha de victorias: cada victoria arrastra la carta rival vencida en espiral hacia el horizonte de sucesos y alimenta el disco de acreción giratorio; una derrota lo encoge. Cuando ha crecido lo suficiente y colapsa, una supernova desgarra el campo. En azul y rosa estándar o en el color del mazo.",
  "fxsyn.gottStandard.name": "Predeterminado",
  "fxsyn.gottStandard.desc": "Victoria divina SIN efecto de gala: la base para comparar (opción predeterminada, sin compra).",
  "fxsyn.spezial.name": "Efecto de habilidad",
  "fxsyn.spezial.desc": "Los cuatro efectos de arquetipo (Fuego · Rayo · Hielo · Planta) están siempre activos. Elige el color: el neón estándar fijo o el color de tu mazo activo.",
  "fxsyn.fieldNone.name": "Sin efecto",
  "fxsyn.fieldNone.desc": "Sin efecto de fondo: solo la imagen del campo de batalla (siempre disponible). El brillo puede seguir activo además.",
  "fxsyn.animNone.name": "Sin animación",
  "fxsyn.animNone.desc": "Sin animación de cartas: las cartas se quedan sencillas. Seleccionarlo apaga todas las animaciones de cartas (siempre disponible).",

  /* ---- Cosmetic effect one-liners ---- */
  "fx.short.noAnim": "Todas las animaciones de cartas apagadas.",
  "fx.short.noBg": "Sin efecto de fondo (el brillo sigue siendo posible).",
  "fx.short.spezial": "Fuego · Rayo · Hielo · Planta: siempre activos, solo se elige el color (estándar o color del mazo).",
  "fx.short.standard": "La carta perdedora sale volando hacia un lado.",
  "fx.short.gottStandard": "Victoria divina sin efecto de gala.",
  "fx.edgeglow.short": "Borde de neón permanente en el color del mazo.",
  "fx.holo.short": "Banda de luz prismática, reactiva a la inclinación.",
  "fx.glitch.short": "Glitch cyberpunk con ráfagas ocasionales.",
  "fx.aurora.short": "Velos suaves; un pulso de bloom por baza.",
  "fx.neonsurf.short": "Mar de plasma en el borde inferior. Los anuncios fuertes hunden el agua por el centro y esta sube por los lados.",
  "fx.cubematrix.short": "Campo de cubos de neón que reacciona a la música.",
  "fx.starfield.short": "Una estrella fugaz por baza, más grande cuanta más puntuación.",
  "fx.klinge.short": "Tajo de hoja que escala con la racha.",
  "fx.scorch.short": "Láser y quemadura orgánica; la velocidad sigue al turbo.",
  "fx.blackhole.short": "Un agujero negro se traga la carta rival.",
  "fx.sonnenPuls.short": "El sol outrun dispara en una victoria divina.",
  "fx.laserFaecher.short": "Los láseres se abren en abanico en una victoria divina.",
  "fx.prismaKaskade.short": "Ondas de choque prismáticas en una victoria divina.",
  "fx.holoCube.short": "El holocubo estalla en una victoria divina.",
  "fx.supernova.short": "En una victoria divina: colapso, luego detonación, luego túnel.",

  /* ---- Name dialog ----
     `name.eyebrow.first` is the NOUN `Bienvenida`, not the adjective `Bienvenido`. The German
     "Willkommen" says nothing about the player and neither should the Spanish; the adjective would
     have to pick a gender for someone the game has never met (§4.4). Listed in
     unsicherheiten_es.md as a sound question, because the noun reading depends on it standing
     alone as a heading. */
  "name.eyebrow.first": "Bienvenida",
  "name.eyebrow.change": "Cambiar el nombre",
  "name.title.first": "Elige tu nombre",
  "name.title.change": "Tu nombre",
  "name.placeholder": "Tu nombre",
  "name.hint": "De 1 a {max} caracteres · aparece en la clasificación global. Se puede cambiar en el menú en cualquier momento.",
  "name.cancel": "Cancelar",
  "name.save": "Guardar",
  "name.lang.label": "Idioma",
  "name.preview.label": "Vista previa · clasificación",
  "name.preview.you": "tú",
  "name.err.profanity": "Este nombre contiene una palabra bloqueada. Elige otro, por favor.",
  "name.err.length": "{max} caracteres como máximo.",

  /* ---- Feedback form ----
     `Bug`, `Balance` and `Playtest` stay as they are: all three are the established words in
     Spanish game development too, and the German catalog borrowed them from English for the same
     reason. Honest SAME_OK entries rather than missed translations. */
  "feedback.eyebrow": "Playtest",
  "feedback.title": "Enviar comentarios",
  "feedback.desk.readout": "Va directamente a los desarrolladores. La semilla y el ciclo de tu última partida se adjuntan automáticamente.",
  "feedback.kind": "Tipo",
  "feedback.kind.bug": "Bug",
  "feedback.kind.idea": "Idea",
  "feedback.kind.balance": "Balance",
  "feedback.kind.other": "Otros",
  "feedback.message": "¿Qué ha pasado?",
  "feedback.message.placeholder": "Cuanto más preciso, mejor: ¿qué hiciste, qué pasó y qué esperabas que pasara?",
  "feedback.name": "Nombre",
  "feedback.name.placeholder": "opcional",
  "feedback.run.with": "Se refiere a: partida con semilla {seed}, ciclo {cycle}",
  "feedback.run.none": "No se encontró ninguna partida que adjuntar",
  "feedback.run.hint": "La semilla y el ciclo se envían con el mensaje; sin ellos, un bug casi nunca se puede reproducir.",
  "feedback.send": "Enviar",
  "feedback.sending": "Enviando …",
  "feedback.thanks": "Gracias, ha llegado.",
  "feedback.detailHint": "Cuantos más detalles, más rápido podremos ayudarte.",
  "feedback.tooShort": "Faltan al menos {n} caracteres.",
  "feedback.draftSent": "Tu último informe atascado ya se ha enviado.",
  "feedback.err.send": "No se ha podido enviar. Tu texto está guardado (y en el portapapeles) y saldrá automáticamente la próxima vez que abras esto.",
  "feedback.err.tooSoon": "Espera un momento: quedan {s} segundos hasta el próximo informe.",
  "feedback.err.dailyCap": "Por hoy ya es suficiente. Mañana se puede seguir.",
  "feedback.err.offline": "El notificador no está configurado en este build; ahora mismo tu texto no va a ninguna parte.",

  /* ---- Options ----
     The three-way `options.rfx.*` control grows a lot: Aus/An are 3 and 2 characters, Apagado and
     Encendido are 7 and 9. No shorter pair says the same thing without turning the control into a
     yes/no question, so the text stands and the chip gets re-measured — recorded for es-layout.

     `options.float.desc` names the score-announcement ladder, which makes it the Spanish
     counterpart of the string the English guard watches: if the chain changes, this sentence has
     to change with it. It currently carries the PROPOSED Spanish chain, pending the owner. */
  "options.sec.general": "General",
  "options.sec.graphics": "Gráficos y rendimiento",
  "options.sec.sound": "Sonido",
  "options.sec.display": "Pantalla",
  "options.chip.general": "General",
  "options.chip.graphics": "Gráficos",
  "options.chip.sound": "Sonido",
  "options.chip.display": "Pantalla",
  "options.eyebrow": "Opciones",
  "options.title": "Ajustes",
  "options.desk.readout": "Todo tiene efecto y se guarda al instante.",

  "options.language.title": "Idioma",
  "options.language.desc": "Idioma de los textos del juego.",

  "options.mute.title": "Silenciar",
  "options.mute.desc": "Desactiva todos los sonidos de clic y de juego.",
  "options.sfx.title": "Volumen de efectos",
  "options.sfx.desc": "Volumen de los sonidos de clic y de juego (SFX).",
  "options.sfx.aria": "Volumen de SFX",
  "options.music.title": "Volumen de la música",
  "options.music.desc": "Volumen de la música de fondo.",
  "options.music.aria": "Volumen de la música",

  // #394 Number size: {pct} arrives pre-formatted (fmtPct) — Spanish sets the percent sign with a
  // space like German, so the sign never lives in the template.
  "options.numScale.title": "Tamaño de los números",
  "options.numScale.desc": "Tamaño de los números de puntuación que suben. {pct}",
  "options.numScale.aria": "Tamaño de los números",

  "options.rfx.title": "Efectos reducidos",
  "options.rfx.aus": "Apagado",
  "options.rfx.mobile": "Móvil",
  "options.rfx.an": "Encendido",
  "options.rfx.desc.aus": "Efectos completos.",
  "options.rfx.desc.mobile": "Equilibrado: se mantienen el volteo de cartas, el fondo, el brillo y los remates; se apagan la sacudida de pantalla, las fuentes de chispas, el desenfoque y los barridos. Alivia los dispositivos más débiles.",
  "options.rfx.desc.an": "Todos los efectos al mínimo: lo más tranquilo posible; alivia mucho los dispositivos débiles.",

  "options.haptics.title": "Háptica (vibración)",
  "options.haptics.desc": "Una vibración corta al confirmar. Solo se nota en dispositivos táctiles (móviles); se respeta el ajuste del sistema “reducir movimiento”.",
  "options.calm.title": "Modo tranquilo",
  "options.calm.desc": "La música ya no sube con tu puntuación; solo suenan las pistas tranquilas y las de ritmo medio, nunca las rápidas ni las máximas.",
  "options.telemetry.title": "Enviar datos de juego anónimos",
  "options.telemetry.desc": "Después de cada partida envía la puntuación, las ventajas y habilidades elegidas, tu progreso y un contexto aproximado del dispositivo (identificación del navegador, núcleos, tamaño de la ventana), sin nombre y sin cuenta. Nos ayuda a equilibrar el juego. Apagado = no se envía nada.",
  "options.telemetry.more": "Qué se envía exactamente",

  "options.perfHud.title": "Contador de FPS e informe",
  "options.perfHud.desc": "Muestra arriba a la derecha FPS · p95 · jank y registra datos de rendimiento (⧉ informe → consola y portapapeles). Solo en la rama de pruebas. Apagado = ni se muestra ni se mide.",

  "options.testvp.title": "Viewport de pruebas",
  "options.testvp.desc": "Muestra el juego dentro de un marco de tamaño fijo, para capturas reproducibles y comprobaciones de diseño. Solo en la rama de pruebas. Cambiarlo recarga la página. La densidad de píxeles del monitor no se simula.",
  "options.testvp.off": "Apagado",
  "options.testvp.hint": "Para salir, vuelve a poner esto en Apagado aquí mismo, en las opciones.",

  "options.float.title": "Mostrar el texto flotante",
  "options.float.desc": "Números y textos que suben sobre el campo. Interruptor principal de los tres de abajo. Los anuncios grandes (BIEN/BRUTAL/DEMENCIAL/DIVINO) siempre se ven.",
  "options.float.score.title": "↳ Puntuación",
  "options.float.score.desc": "Números de puntuación que suben en las bazas que ganas.",
  "options.float.mult.title": "↳ Multiplicador",
  "options.float.mult.desc": "Texto de “¡Crítico!” y de formaciones (bonificaciones de multiplicador).",
  "options.float.winlose.title": "↳ Victoria / derrota",
  "options.float.winlose.desc": "Texto de victoria o derrota al resolverse la baza.",
  "options.breakdown.title": "Mostrar el desglose de la baza",
  "options.breakdown.desc": "Cadena de factores bajo el campo: base × racha × ventajas × formación × crítico = total de la baza en curso. El espacio queda reservado; las cartas están en el mismo sitio de todos modos.",

  /* ---- Privacy notice (#datenschutz) ----
     {ua} comes from UA_MAX in game/telemetry.js — the same expression as the German side, never a
     typed-in number (guard: "every language names the same numbers").

     The brand appears three times here and is `Autobaza` in all three. A guard fails the moment a
     catalog carries another language's title, and this notice is the most likely place to leak one
     by copying a paragraph across. */
  "privacy.eyebrow": "Playtest",
  "privacy.title": "Qué envía Autobaza",
  "privacy.intro": "Autobaza funciona en el navegador, sin cuenta y sin registro. Dos cosas salen de tu dispositivo, y aquí están las dos al completo.",

  "privacy.sec.telemetry.title": "Datos de juego anónimos (se pueden desactivar)",
  "privacy.sec.telemetry.body": "Después de cada partida: puntuación, ciclos, bazas, las ventajas, habilidades y edificios elegidos, tu progreso en el árbol de mejoras, la cosmética comprada y la semilla. Además, un contexto aproximado del dispositivo: identificación del navegador (recortada a {ua} caracteres), núcleos del procesador, memoria del dispositivo, idioma, tamaño de la ventana, densidad de píxeles y si el dispositivo tiene pantalla táctil. Y un identificador de instalación generado al azar, para que varias partidas del mismo dispositivo vayan juntas. Sin nombre, sin correo electrónico, sin registro. Para desactivarlo: Opciones → “Enviar datos de juego anónimos”. Apagado significa apagado de verdad: también se borra lo que aún esté en la cola.",
  "privacy.sec.board.title": "Clasificación (solo al publicar)",
  "privacy.sec.board.body": "Cuando publicas una partida en la clasificación: el apodo que hayas elegido, la puntuación, los ciclos, las bazas, los arquetipos, las ventajas, las habilidades, la semilla, hasta dónde habías construido tu árbol de mejoras (cuántos nodos estaban desbloqueados) y las métricas de la partida (mejor racha, formaciones, críticos, victorias, mejor baza, partes de la puntuación). El apodo es visible para todos los jugadores; así que no elijas nada por lo que se te pueda encontrar. Sin apodo no se publica nada.",
  "privacy.sec.local.title": "Qué se queda en tu dispositivo",
  "privacy.sec.local.body": "El perfil, el historial de partidas, las opciones y cualquier partida empezada están en el almacenamiento de tu navegador y no salen del dispositivo. No hay cookies publicitarias, ni scripts de terceros, ni seguimiento a través de otras páginas.",
  "privacy.sec.host.title": "Adónde va",
  "privacy.sec.host.body": "Ambas cosas acaban en una base de datos de Supabase, separadas en dos tablas; así, una telemetría que se llene no puede dañar la clasificación. El acceso se hace con una clave pública que solo permite leer y añadir.",
  "privacy.sec.contact.title": "Quién está detrás",
  "privacy.sec.contact.body": "Autobaza es un proyecto personal de aficionado en playtest abierto. Las preguntas, las objeciones o la petición de borrar tus datos se gestionan por el Discord del proyecto.",

  "privacy.installId.label": "Tu identificador de instalación",
  "privacy.installId.copy": "Copiar",
  "privacy.installId.copied": "Copiado",
  "privacy.installId.hint": "Indícalo si quieres que se borren los datos que has enviado; sin él no se pueden encontrar tus filas. Solo existe en este dispositivo y no dice nada sobre quién eres.",
  "privacy.contact.discord": "Abrir Discord",
  "privacy.updated": "Actualizado: 2026-08-16 · playtest beta",
  "privacy.link": "Privacidad",
};
