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
  "gameover.welcome.hint": "por tu primera partida completada. Inviértela en el taller de mazos y hazte con un sobre.",
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
};
