/* ============================================================
   COSMETICS — ENGLISH. Skin set names (27) + global effects (13).

   ONE name per cosmetic set. In the game each set appears three times — as a card back, as a
   battlefield and as a purchasable pack — but all three now derive from the deck name (see
   cosmetics.js/themes.js), so there is exactly one name to translate and one to keep in sync.

   Most names are proper nouns that already read the same in both languages (Kitsune, Ronin,
   Seraph, Scarab, Eldritch). Only the German ones are translated, and only where the name
   describes something rather than naming it. The four archetype sets MUST match the archetype
   names — they are those decks.
   ============================================================ */

export default {
  // Suffix des Spielfeld-Namens. „Battlefield" ist auch im Deutschen schon das englische Wort.
  "cosmetic.bf.suffix": " · Battlefield",

  /* ---- Skin sets ---- */
  "cosmetic.default.name": "Standard",
  "cosmetic.deck_sunset.name": "Sunset Rider",
  "cosmetic.deck_lofi.name": "Kitsune",
  "cosmetic.deck_beach.name": "Malibu Wave",
  "cosmetic.deck_cat.name": "Biolumen",
  "cosmetic.deck_spacedog.name": "Cosmos Panther",
  "cosmetic.deck_wale.name": "Moonwhale",
  "cosmetic.deck_onboarding.name": "Genesis",
  "cosmetic.deck_gottgleich.name": "Ascension",
  "cosmetic.deck_serie300.name": "Flamingo",
  "cosmetic.deck_serie600.name": "Peacock",
  // „Königspfau" muss sich von „Peacock" unterscheiden — es ist die höhere Serien-Stufe.
  "cosmetic.deck_serie1500.name": "Royal Peacock",
  "cosmetic.deck_sparfuchs.name": "Penny Pincher",
  // Die vier Archetyp-Sets tragen die Archetyp-Namen (§3.4) — sie SIND diese Decks.
  "cosmetic.deck_feuer.name": "Fire",
  "cosmetic.deck_eis.name": "Ice",
  "cosmetic.deck_blitz.name": "Lightning",
  "cosmetic.deck_pflanze.name": "Plant",
  "cosmetic.deck_elementar.name": "Prism",
  "cosmetic.deck_ronin.name": "Ronin",
  "cosmetic.deck_kosmos.name": "Black Hole",
  "cosmetic.deck_oni.name": "Red Oni",
  "cosmetic.deck_geometrie.name": "Seraph",
  "cosmetic.deck_sonne.name": "Colossus",
  "cosmetic.deck_drache.name": "Lantern Festival",
  "cosmetic.deck_arcade.name": "Beryl",
  "cosmetic.deck_polarlicht.name": "Scarab",
  "cosmetic.deck_seedrache.name": "Eldritch",
  "cosmetic.deck_obsidian.name": "Obsidian", // gleiches Wort in beiden Sprachen — nichts zu übersetzen
  // #tiered Titan (Score) + Hirsch (Läufe) — Stufen-Decks
  "cosmetic.deck_titan1.name": "Titan · Awakening",
  "cosmetic.deck_titan2.name": "Titan · Ascent",
  "cosmetic.deck_titan3.name": "Titan · Unbound",
  "cosmetic.deck_hirsch1.name": "Stag · Constellation",
  "cosmetic.deck_hirsch2.name": "Stag · Awakened",
  "cosmetic.deck_hirsch3.name": "Stag · Starfall",

  /* ---- Global effects (deck workshop) ----
     These are sales copy: they describe what the player will see. Effect over literalness —
     but the mechanical hooks stay exact ("in the deck colour", "per trick", the tier names). */
  "fx.aurora.name": "Aurora",
  "fx.aurora.desc": "Soft aurora veils drift across the field; a gentle bloom pulse with every trick — in the deck colour.",
  "fx.cubematrix.name": "Cube Matrix",
  "fx.cubematrix.desc": "A perspective field of neon cubes on a synthwave floor — each cube rises to its own frequency band of the music playing. Plus spotlights from above that pulse to the bass. In the deck colour.",
  "fx.neonsurf.name": "Neon Surf",
  "fx.neonsurf.desc": "A plasma sea along the bottom edge — a neon river with a bright waterline; on big announcements a pulse presses the water down in the middle and sends it climbing up the sides. In the deck colour.",
  "fx.deckglow.name": "Deck Glow",
  "fx.deckglow.desc": "The bright lines of the battlefield light up in the deck colour, and a running light travels along the contours. Its own layer — the ONLY effect that can be active alongside all the others (background, trick, score) at once.",
  "fx.starfield.name": "Starfield",
  "fx.starfield.desc": "A dense starfield drifts across three depth layers behind a veil of nebula; every trick a meteor shoots through the field — larger the higher the score tier, and from FIERCE upwards with an impact flash and sparks that scatter with trails. White-blue by default, in the deck colour if you prefer.",
  "fx.edgeglow.name": "Edge Glow",
  "fx.edgeglow.desc": "A soft neon edge glows around the card in the deck colour — permanent, calmly breathing, additively stacked (no blur). Not tied to the trick.",
  "fx.holo.name": "Holo",
  "fx.holo.desc": "A prismatic band of light travels diagonally across the card — rainbow hues in the deck colour, reacting to tilt (pointer/gyro). Permanent, additive.",
  "fx.glitch.name": "Glitch",
  "fx.glitch.desc": "A cyberpunk digital glitch across the whole card including its number — chroma split, tear slices, scanlines and colour bars, with a calm baseline and occasional bursts.",
  "fx.sonnenPuls.name": "Sun Pulse",
  "fx.sonnenPuls.desc": "The outrun sun blooms behind the beaten card — a sunset gradient with scanline gaps, a hot core, a corona and rotating rays. Default sunset or deck colour. The free GODLIKE flourish.",
  "fx.laserFaecher.name": "Laser Fan",
  "fx.laserFaecher.desc": "Sharp neon lasers fan out from the centre of the card — long main and short secondary beams with a core line and a glowing hub, opening with a pop and rotating slowly. Default neon or deck colour.",
  "fx.prismaKaskade.name": "Prism Cascade",
  "fx.prismaKaskade.desc": "Several prismatic shockwave rings fire in sequence and run chromatically (rainbow split) across the field, each with a flash at birth. Default = full spectrum, deck colour = duotone.",
  "fx.holoCube.name": "Holo Cube",
  "fx.holoCube.desc": "A holo cube of wireframe blocks assembles itself out of the distance, rotates freely, flashes at its core and shatters tumbling outwards. Holo cyan→magenta or deck colour.",
  "fx.supernova.name": "Supernova",
  "fx.supernova.desc": "Collapse → detonation (flash, zoom punch) → boom shockwave with chromatic rings, a crown of rays, a rain of stars and a grid tunnel through the impact. The legendary showstopper. Gold→magenta or deck colour.",
};
