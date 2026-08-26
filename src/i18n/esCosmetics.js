/* ============================================================
   COSMETICS — SPANISH. Skin set names (27) + global effects (13). Mirrors enCosmetics.js.

   ONE name per cosmetic set. In the game each set appears three times — as a card back, as a
   battlefield and as a purchasable pack — but all three derive from the deck name
   (cosmetics.js/themes.js), so there is exactly one name to translate and one to keep in sync.

   THE RULE APPLIED HERE, and it is the German source that decides it: a name the German catalog
   itself keeps foreign stays foreign (Kitsune, Ronin, Seraph, Scarab, Eldritch, Insert Coin); a
   name the German catalog says in German gets said in Spanish (Kosmospanther, Königspfau,
   Sparfuchs, Schwarzes Loch, Roter Oni, Kolossus, Laternenfest, Nachtklinge, Quecksilber, and the
   four numbered series). Package §8 asks for exactly that split, and it is why `Beryll` becomes
   `Berilo` while `Scarab` stays `Scarab` even though both are minerals-and-beetles: the German
   said one of them in German.

   The four archetype sets MUST match the archetype names — they ARE those decks, and a guard
   holds the English pair to it. Fuego · Hielo · Rayo · Planta.
   ============================================================ */

export default {
  // Suffix of the battlefield name. The German keeps the English word here; Spanish does not,
  // for the same reason `shop.noBattlefield` does not — English treats it as a common noun too.
  "cosmetic.bf.suffix": " · Campo de batalla",

  /* ---- Skin sets ---- */
  "cosmetic.default.name": "Predeterminado",
  "cosmetic.deck_sunset.name": "Sunset Rider",
  "cosmetic.deck_lofi.name": "Kitsune",
  "cosmetic.deck_beach.name": "Malibu Wave",
  "cosmetic.deck_cat.name": "Biolumen",
  "cosmetic.deck_spacedog.name": "Pantera Cósmica",
  "cosmetic.deck_wale.name": "Moonwhale",
  "cosmetic.deck_onboarding.name": "Genesis",
  "cosmetic.deck_gottgleich.name": "Ascension",
  "cosmetic.deck_serie300.name": "Flamingo",
  "cosmetic.deck_serie600.name": "Peacock",
  "cosmetic.deck_serie1500.name": "Pavo Real",
  "cosmetic.deck_sparfuchs.name": "Tacaño",

  /* The four archetype decks — same words as the archetypes, never a synonym. */
  "cosmetic.deck_feuer.name": "Fuego",
  "cosmetic.deck_eis.name": "Hielo",
  "cosmetic.deck_blitz.name": "Rayo",
  "cosmetic.deck_pflanze.name": "Planta",

  "cosmetic.deck_elementar.name": "Prisma",
  "cosmetic.deck_ronin.name": "Ronin",
  "cosmetic.deck_kosmos.name": "Agujero Negro",
  "cosmetic.deck_oni.name": "Oni Rojo",
  "cosmetic.deck_geometrie.name": "Seraph",
  "cosmetic.deck_sonne.name": "Coloso",
  "cosmetic.deck_drache.name": "Fiesta de los Faroles",
  "cosmetic.deck_arcade.name": "Berilo",
  "cosmetic.deck_polarlicht.name": "Scarab",
  "cosmetic.deck_seedrache.name": "Eldritch",
  "cosmetic.deck_obsidian.name": "Obsidiana",

  /* Numbered series — the tier word is translated, the set word carries across. */
  "cosmetic.deck_titan1.name": "Titán · Despertar",
  "cosmetic.deck_titan2.name": "Titán · Ascenso",
  "cosmetic.deck_titan3.name": "Titán · Desatado",
  "cosmetic.deck_hirsch1.name": "Ciervo · Constelación",
  "cosmetic.deck_hirsch2.name": "Ciervo · Despierto",
  "cosmetic.deck_hirsch3.name": "Ciervo · Lluvia de Estrellas",
  "cosmetic.deck_thron1.name": "Trono · Aspirante",
  "cosmetic.deck_thron2.name": "Trono · Soberano",
  "cosmetic.deck_thron3.name": "Trono · Inmortal",
  "cosmetic.deck_kataklysmus1.name": "Cataclismo · Impacto",
  "cosmetic.deck_kataklysmus2.name": "Cataclismo · Fractura",
  "cosmetic.deck_kataklysmus3.name": "Cataclismo · Singularidad",

  "cosmetic.deck_gaia.name": "Gaia",
  "cosmetic.deck_glazius.name": "Glazius",
  "cosmetic.deck_voltaris.name": "Voltaris",
  "cosmetic.deck_pyrros.name": "Pyrros",
  // Azogue, not Mercurio: the German word is the plain one and the English the slightly poetic
  // one, and `Mercurio` would collide with the planet and the god. Recorded in unsicherheiten_es.md.
  "cosmetic.deck_quecksilber.name": "Azogue",
  "cosmetic.deck_kintsugi.name": "Kintsugi",
  "cosmetic.deck_salar.name": "Salar",
  "cosmetic.deck_nachtklinge.name": "Hoja Nocturna",
  "cosmetic.deck_paradox.name": "Paradoja",
  "cosmetic.deck_hanami.name": "Hanami",
  "cosmetic.deck_nimbus.name": "Nimbus",
  "cosmetic.deck_solfatara.name": "Solfatara",
  "cosmetic.deck_origami.name": "Origami",
  "cosmetic.deck_insertcoin.name": "Insert Coin",

  /* ---- Global effects ----
     `fx.starfield.desc` names a step of the score-announcement ladder, which makes it one of the
     two prose strings that have to move whenever the ladder moves. It carries the PROPOSED
     Spanish chain until the owner settles it. */
  "fx.aurora.name": "Aurora",
  "fx.aurora.desc": "Suaves velos de aurora boreal recorren el campo; en cada baza, un pulso de bloom suave en el color del mazo.",
  "fx.cubematrix.name": "Matriz de Cubos",
  "fx.cubematrix.desc": "Un campo en perspectiva de cubos de neón sobre un suelo synthwave. Cada cubo sube al ritmo de su propia banda de frecuencia de la música que suena. Además, focos desde arriba que laten con el bajo. En el color del mazo.",
  "fx.neonsurf.name": "Rompiente de Neón",
  "fx.neonsurf.desc": "Un mar de plasma en el borde inferior: un río de neón con una línea de agua luminosa; en los anuncios grandes, un pulso hunde el agua por el centro y la hace subir por los lados. En el color del mazo.",
  "fx.starfield.name": "Meteoro",
  "fx.starfield.desc": "Un campo de estrellas denso se desplaza en tres planos de profundidad tras un velo de nebulosa; en cada baza un meteoro atraviesa el campo. Crece con cada nivel de puntuación y, a partir del nivel BIEN, con destello de impacto y chispas que se dispersan dejando estela. Blanco y azul de serie, o en el color del mazo si lo prefieres.",
  "fx.edgeglow.name": "Marco de Neón",
  "fx.edgeglow.desc": "Un borde de neón suave rodea la carta con brillo en el color del mazo: permanente, respirando con calma, apilado de forma aditiva (sin desenfoque). Sin relación con la baza.",
  "fx.holo.name": "Barrido Holo",
  "fx.holo.desc": "Una banda de luz prismática recorre la carta en diagonal: tonos de arcoíris en el color del mazo, reacciona a la inclinación (puntero o giroscopio). Permanente, aditiva.",
  "fx.glitch.name": "Glitch",
  "fx.glitch.desc": "Glitch digital cyberpunk sobre toda la carta, número incluido: separación de croma, cortes de desgarro, líneas de barrido y barras de color, con una base tranquila y ráfagas ocasionales.",
  "fx.sonnenPuls.name": "Sol",
  "fx.sonnenPuls.desc": "El sol outrun florece detrás de la carta vencida: degradado de atardecer con huecos de línea de barrido, núcleo caliente, corona y rayos giratorios. Atardecer estándar o color del mazo. La gala DIVINO gratuita.",
  "fx.laserFaecher.name": "Abanico de Láseres",
  "fx.laserFaecher.desc": "Láseres de neón afilados se abren en abanico desde el centro de la carta: haces principales largos y secundarios cortos, con línea de núcleo y un eje luminoso, se abren con un chasquido y giran despacio. Neón estándar o color del mazo.",
  "fx.prismaKaskade.name": "Prisma",
  "fx.prismaKaskade.desc": "Varios anillos prismáticos de onda de choque se encienden de forma escalonada y recorren el campo cromáticamente (separación de arcoíris), cada uno con un destello al nacer. Estándar = espectro completo, color del mazo = duotono.",
  "fx.holoCube.name": "Holocubo",
  "fx.holoCube.desc": "Un holocubo de bloques de estructura alámbrica se ensambla desde la lejanía, gira libremente, destella en su núcleo y estalla dando tumbos hacia fuera. Cian holo→magenta o color del mazo.",
  "fx.supernova.name": "Supernova",
  "fx.supernova.desc": "Colapso → detonación (destello, golpe de zoom) → onda expansiva con anillos cromáticos, corona de rayos, lluvia de estrellas y un túnel de rejilla a través del impacto. El número final legendario. Oro→magenta o color del mazo.",
};
