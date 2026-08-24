/* KOSMETIK-ASSETS (#190) — UI-seitige Bild-Auflösung für die Deck-/Battlefield-Skins.

   Getrennt von der PUREN Registry `src/game/cosmetics.js` (die node-getestet wird und keine PNGs laden
   darf): hier liegen die echten, von Vite gebündelten Bild-URLs, gekeyed über die Skin-id. Ein neues
   Deck = ein Import-Paar + ein Map-Eintrag hier (zusätzlich zum Metadaten-Eintrag in cosmetics.js).

   Deck-Skin = Paar { front, back }:
     front = Rahmen (leere Mitte; Zahl/Effekte rendern darüber) — entspricht card-front.png
     back  = Cover/Rückseite (voll illustriert)                  — entspricht card-back.png */
import cardFrontImg from "../assets/cards/card-front.webp"; // Default-Front (Rahmen)
import cardBackImg  from "../assets/cards/card-back.webp";  // Default-Back (Cover)
// #299: alte Progressions-Decks (deck_p1–4) entfernt.
// v0.4 Kauf-Packs — Deck-Paare (front = Rahmen, back = Motiv):
// #IP: deck_aura (Super Aura) / deck_mecha (Mecha Ronin) entfernt.
import beachFront    from "../assets/cards/decks_player/deck_beach/front.webp";      // Malibu Wave
import beachBack     from "../assets/cards/decks_player/deck_beach/back.webp";
import catFront      from "../assets/cards/decks_player/deck_cat/front.webp";        // Biolumen (ehem. Aurora Whiskers)
import catBack       from "../assets/cards/decks_player/deck_cat/back.webp";
import spacedogFront from "../assets/cards/decks_player/deck_spacedog/front.webp";   // Kosmospanther (ehem. Star Pup)
import spacedogBack  from "../assets/cards/decks_player/deck_spacedog/back.webp";
import waleFront     from "../assets/cards/decks_player/deck_wale/front.webp";       // Moonwhale
import waleBack      from "../assets/cards/decks_player/deck_wale/back.webp";
import genesisFront  from "../assets/cards/decks_player/deck_onboarding/front.webp"; // Genesis
import genesisBack   from "../assets/cards/decks_player/deck_onboarding/back.webp";
// #303 Challenge-Decks (über eine Challenge freigeschaltet) — Deck-Paare:
import gottgleichFront from "../assets/cards/decks_player/deck_gottgleich/front.webp"; // Gottgleich
import gottgleichBack  from "../assets/cards/decks_player/deck_gottgleich/back.webp";
import serie300Front   from "../assets/cards/decks_player/deck_serie300/front.webp";   // Flamingo (Serie 300)
import serie300Back    from "../assets/cards/decks_player/deck_serie300/back.webp";
import serie600Front   from "../assets/cards/decks_player/deck_serie600/front.webp";   // Peacock (Serie 600)
import serie600Back    from "../assets/cards/decks_player/deck_serie600/back.webp";
import serie1500Front  from "../assets/cards/decks_player/deck_serie1500/front.webp"; // Königspfau (Serie 1500)
import serie1500Back   from "../assets/cards/decks_player/deck_serie1500/back.webp";
import sparfuchsFront  from "../assets/cards/decks_player/deck_sparfuchs/front.webp";  // Sparfuchs
import sparfuchsBack   from "../assets/cards/decks_player/deck_sparfuchs/back.webp";
// #299: alte Progressions-Battlefields (bf_1–4) entfernt.
// Deck-Werkstatt Starter-Themes (kaufbar, je Element 1 SP): jedes Theme = Deck-Paar + Battlefield.
import sunsetFront from "../assets/cards/decks_player/deck_sunset/front.webp"; // Sunset Rider
import sunsetBack  from "../assets/cards/decks_player/deck_sunset/back.webp";
import lofiFront   from "../assets/cards/decks_player/deck_lofi/front.webp";   // Kitsune (ehem. Lofi Nights)
import lofiBack    from "../assets/cards/decks_player/deck_lofi/back.webp";
// #IP: deck_kaiju (Neon Kaiju) entfernt.
import bfSunsetDesktop from "../assets/battlefields/bf_sunset/desktop.jpg";
import bfSunsetMobile  from "../assets/battlefields/bf_sunset/mobile.jpg";
import bfLofiDesktop   from "../assets/battlefields/bf_lofi/desktop.jpg";
import bfLofiMobile    from "../assets/battlefields/bf_lofi/mobile.jpg";
// #IP: bf_kaiju / bf_aura / bf_mecha entfernt.
// v0.4 Kauf-Packs — Battlefields (desktop 1600×640 / mobile 1080×810):
import bfBeachDesktop    from "../assets/battlefields/bf_beach/desktop.jpg";
import bfBeachMobile     from "../assets/battlefields/bf_beach/mobile.jpg";
import bfCatDesktop      from "../assets/battlefields/bf_cat/desktop.jpg";
import bfCatMobile       from "../assets/battlefields/bf_cat/mobile.jpg";
import bfSpacedogDesktop from "../assets/battlefields/bf_spacedog/desktop.jpg";
import bfSpacedogMobile  from "../assets/battlefields/bf_spacedog/mobile.jpg";
import bfWaleDesktop     from "../assets/battlefields/bf_wale/desktop.jpg";
import bfWaleMobile      from "../assets/battlefields/bf_wale/mobile.jpg";
import bfGenesisDesktop  from "../assets/battlefields/bf_onboarding/desktop.jpg";
import bfGenesisMobile   from "../assets/battlefields/bf_onboarding/mobile.jpg";
// #303 Challenge-Battlefields:
import bfGottgleichDesktop from "../assets/battlefields/bf_gottgleich/desktop.jpg";
import bfGottgleichMobile  from "../assets/battlefields/bf_gottgleich/mobile.jpg";
import bfSerie300Desktop   from "../assets/battlefields/bf_serie300/desktop.jpg";
import bfSerie300Mobile    from "../assets/battlefields/bf_serie300/mobile.jpg";
import bfSerie600Desktop   from "../assets/battlefields/bf_serie600/desktop.jpg";
import bfSerie600Mobile    from "../assets/battlefields/bf_serie600/mobile.jpg";
import bfSerie1500Desktop  from "../assets/battlefields/bf_serie1500/desktop.jpg";
import bfSerie1500Mobile   from "../assets/battlefields/bf_serie1500/mobile.jpg";
import bfSparfuchsDesktop  from "../assets/battlefields/bf_sparfuchs/desktop.jpg";
import bfSparfuchsMobile   from "../assets/battlefields/bf_sparfuchs/mobile.jpg";
// #310 Element-Challenge-Decks (Feuer/Eis/Blitz/Pflanze · Mono-Läufe) + Prisma (Element-Bund) + 4 DP-Kauf-Packs.
import feuerFront     from "../assets/cards/decks_player/deck_feuer/front.webp";        // Feuer (Challenge · fire)
import feuerBack      from "../assets/cards/decks_player/deck_feuer/back.webp";
import eisFront       from "../assets/cards/decks_player/deck_eis/front.webp";          // Eis (Challenge · ice)
import eisBack        from "../assets/cards/decks_player/deck_eis/back.webp";
import blitzFront     from "../assets/cards/decks_player/deck_blitz/front.webp";        // Blitz (Challenge · lightning)
import blitzBack      from "../assets/cards/decks_player/deck_blitz/back.webp";
import pflanzeFront   from "../assets/cards/decks_player/deck_pflanze/front.webp";      // Pflanze (Challenge · plant)
import pflanzeBack    from "../assets/cards/decks_player/deck_pflanze/back.webp";
import elementarFront from "../assets/cards/decks_player/deck_elementar/front.webp";    // Prisma (Multi · Element-Bund)
import elementarBack  from "../assets/cards/decks_player/deck_elementar/back.webp";
import roninFront     from "../assets/cards/decks_player/deck_ronin/front.webp";         // Ronin (Kauf · 15 DP)
import roninBack      from "../assets/cards/decks_player/deck_ronin/back.webp";
import kosmosFront    from "../assets/cards/decks_player/deck_kosmos/front.webp";       // Schwarzes Loch (Kauf · 10 DP)
import kosmosBack     from "../assets/cards/decks_player/deck_kosmos/back.webp";
import oniFront       from "../assets/cards/decks_player/deck_oni/front.webp";          // Roter Oni (Kauf · 20 DP)
import oniBack        from "../assets/cards/decks_player/deck_oni/back.webp";
import geoFront       from "../assets/cards/decks_player/deck_geometrie/front.webp";    // Seraph (ehem. Metatron · 5 DP)
import geoBack        from "../assets/cards/decks_player/deck_geometrie/back.webp";
import bfFeuerDesktop     from "../assets/battlefields/bf_feuer/desktop.jpg";
import bfFeuerMobile      from "../assets/battlefields/bf_feuer/mobile.jpg";
import bfEisDesktop       from "../assets/battlefields/bf_eis/desktop.jpg";
import bfEisMobile        from "../assets/battlefields/bf_eis/mobile.jpg";
import bfBlitzDesktop     from "../assets/battlefields/bf_blitz/desktop.jpg";
import bfBlitzMobile      from "../assets/battlefields/bf_blitz/mobile.jpg";
import bfPflanzeDesktop   from "../assets/battlefields/bf_pflanze/desktop.jpg";
import bfPflanzeMobile    from "../assets/battlefields/bf_pflanze/mobile.jpg";
import bfElementarDesktop from "../assets/battlefields/bf_elementar/desktop.jpg";
import bfElementarMobile  from "../assets/battlefields/bf_elementar/mobile.jpg";
import bfRoninDesktop     from "../assets/battlefields/bf_ronin/desktop.jpg";
import bfRoninMobile      from "../assets/battlefields/bf_ronin/mobile.jpg";
import bfKosmosDesktop    from "../assets/battlefields/bf_kosmos/desktop.jpg";
import bfKosmosMobile     from "../assets/battlefields/bf_kosmos/mobile.jpg";
import bfOniDesktop       from "../assets/battlefields/bf_oni/desktop.jpg";
import bfOniMobile        from "../assets/battlefields/bf_oni/mobile.jpg";
import bfGeoDesktop       from "../assets/battlefields/bf_geometrie/desktop.jpg";
import bfGeoMobile        from "../assets/battlefields/bf_geometrie/mobile.jpg";
// #311 zwei DP-Kauf-Packs (je 10 DP): Kolossus (ehem. Sonnenfinsternis) + Laternenfest (ehem. Goldener Drache).
import sonneFront    from "../assets/cards/decks_player/deck_sonne/front.webp";     // Kolossus (ehem. Sonnenfinsternis)
import sonneBack     from "../assets/cards/decks_player/deck_sonne/back.webp";
import dracheFront   from "../assets/cards/decks_player/deck_drache/front.webp";    // Goldener Drache
import dracheBack    from "../assets/cards/decks_player/deck_drache/back.webp";
import bfSonneDesktop   from "../assets/battlefields/bf_sonne/desktop.jpg";
import bfSonneMobile    from "../assets/battlefields/bf_sonne/mobile.jpg";
import bfDracheDesktop  from "../assets/battlefields/bf_drache/desktop.jpg";
import bfDracheMobile   from "../assets/battlefields/bf_drache/mobile.jpg";
// #312 drei DP-Kauf-Packs (je 10 DP): Arcade + Polarlicht + Seedrache.
import arcadeFront     from "../assets/cards/decks_player/deck_arcade/front.webp";     // Beryll (ehem. Arcade)
import arcadeBack      from "../assets/cards/decks_player/deck_arcade/back.webp";
import polarlichtFront from "../assets/cards/decks_player/deck_polarlicht/front.webp"; // Scarab (ehem. Polarlicht)
import polarlichtBack  from "../assets/cards/decks_player/deck_polarlicht/back.webp";
import seedracheFront  from "../assets/cards/decks_player/deck_seedrache/front.webp";  // Eldritch (ehem. Seedrache)
import seedracheBack   from "../assets/cards/decks_player/deck_seedrache/back.webp";
import obsidianFront   from "../assets/cards/decks_player/deck_obsidian/front.webp";   // Obsidian
import obsidianBack    from "../assets/cards/decks_player/deck_obsidian/back.webp";
// #tiered Titan (I/II/III) + Hirsch (I/II/III) — Stufen-Decks
import titan1Front from "../assets/cards/decks_player/deck_titan1/front.webp";
import titan1Back  from "../assets/cards/decks_player/deck_titan1/back.webp";
import titan2Front from "../assets/cards/decks_player/deck_titan2/front.webp";
import titan2Back  from "../assets/cards/decks_player/deck_titan2/back.webp";
import titan3Front from "../assets/cards/decks_player/deck_titan3/front.webp";
import titan3Back  from "../assets/cards/decks_player/deck_titan3/back.webp";
import hirsch1Front from "../assets/cards/decks_player/deck_hirsch1/front.webp";
import hirsch1Back  from "../assets/cards/decks_player/deck_hirsch1/back.webp";
import hirsch2Front from "../assets/cards/decks_player/deck_hirsch2/front.webp";
import hirsch2Back  from "../assets/cards/decks_player/deck_hirsch2/back.webp";
import hirsch3Front from "../assets/cards/decks_player/deck_hirsch3/front.webp";
import hirsch3Back  from "../assets/cards/decks_player/deck_hirsch3/back.webp";
import thron1Front from "../assets/cards/decks_player/deck_thron1/front.webp"; // #tiered Thron (Ranglisten-Serie)
import thron1Back  from "../assets/cards/decks_player/deck_thron1/back.webp";
import thron2Front from "../assets/cards/decks_player/deck_thron2/front.webp";
import thron2Back  from "../assets/cards/decks_player/deck_thron2/back.webp";
// #tiered Kataklysmus (Score 150/250/400 Mio)
import kata1Front from "../assets/cards/decks_player/deck_kataklysmus1/front.webp";
import kata1Back  from "../assets/cards/decks_player/deck_kataklysmus1/back.webp";
import kata2Front from "../assets/cards/decks_player/deck_kataklysmus2/front.webp";
import kata2Back  from "../assets/cards/decks_player/deck_kataklysmus2/back.webp";
import kata3Front from "../assets/cards/decks_player/deck_kataklysmus3/front.webp";
import kata3Back  from "../assets/cards/decks_player/deck_kataklysmus3/back.webp";
import thron3Front from "../assets/cards/decks_player/deck_thron3/front.webp";
import thron3Back  from "../assets/cards/decks_player/deck_thron3/back.webp";
// #deck40 Gaia · Glazius · Voltaris · Pyrros (je 40 DP)
import gaiaFront     from "../assets/cards/decks_player/deck_gaia/front.webp";
import gaiaBack      from "../assets/cards/decks_player/deck_gaia/back.webp";
import glaziusFront  from "../assets/cards/decks_player/deck_glazius/front.webp";
import glaziusBack   from "../assets/cards/decks_player/deck_glazius/back.webp";
import voltarisFront from "../assets/cards/decks_player/deck_voltaris/front.webp";
import voltarisBack  from "../assets/cards/decks_player/deck_voltaris/back.webp";
import pyrrosFront   from "../assets/cards/decks_player/deck_pyrros/front.webp";
import pyrrosBack    from "../assets/cards/decks_player/deck_pyrros/back.webp";
// #deck-material Quecksilber (30 DP) · Kintsugi (40 DP) · Salar (20 DP)
import quecksilberFront from "../assets/cards/decks_player/deck_quecksilber/front.webp";
import quecksilberBack  from "../assets/cards/decks_player/deck_quecksilber/back.webp";
import kintsugiFront    from "../assets/cards/decks_player/deck_kintsugi/front.webp";
import kintsugiBack     from "../assets/cards/decks_player/deck_kintsugi/back.webp";
import salarFront       from "../assets/cards/decks_player/deck_salar/front.webp";
import salarBack        from "../assets/cards/decks_player/deck_salar/back.webp";
// #deck-neon Nachtklinge (20 DP) · Paradox (10 DP)
import nachtklingeFront from "../assets/cards/decks_player/deck_nachtklinge/front.webp";
import nachtklingeBack  from "../assets/cards/decks_player/deck_nachtklinge/back.webp";
import paradoxFront     from "../assets/cards/decks_player/deck_paradox/front.webp";
import paradoxBack      from "../assets/cards/decks_player/deck_paradox/back.webp";
// #deck-nacht Hanami (30 DP) · Nimbus (10 DP)
import hanamiFront      from "../assets/cards/decks_player/deck_hanami/front.webp";
import hanamiBack       from "../assets/cards/decks_player/deck_hanami/back.webp";
import nimbusFront      from "../assets/cards/decks_player/deck_nimbus/front.webp";
import nimbusBack       from "../assets/cards/decks_player/deck_nimbus/back.webp";
import solfataraFront   from "../assets/cards/decks_player/deck_solfatara/front.webp";
import solfataraBack    from "../assets/cards/decks_player/deck_solfatara/back.webp";
import origamiFront     from "../assets/cards/decks_player/deck_origami/front.webp";
import origamiBack      from "../assets/cards/decks_player/deck_origami/back.webp";
import bfArcadeDesktop     from "../assets/battlefields/bf_arcade/desktop.jpg";
import bfArcadeMobile      from "../assets/battlefields/bf_arcade/mobile.jpg";
import bfPolarlichtDesktop from "../assets/battlefields/bf_polarlicht/desktop.jpg";
import bfPolarlichtMobile  from "../assets/battlefields/bf_polarlicht/mobile.jpg";
import bfSeedracheDesktop  from "../assets/battlefields/bf_seedrache/desktop.jpg";
import bfSeedracheMobile   from "../assets/battlefields/bf_seedrache/mobile.jpg";
import bfObsidianDesktop   from "../assets/battlefields/bf_obsidian/desktop.jpg";
import bfObsidianMobile    from "../assets/battlefields/bf_obsidian/mobile.jpg";
import bfTitan1Desktop from "../assets/battlefields/bf_titan1/desktop.jpg";
import bfTitan1Mobile  from "../assets/battlefields/bf_titan1/mobile.jpg";
import bfTitan2Desktop from "../assets/battlefields/bf_titan2/desktop.jpg";
import bfTitan2Mobile  from "../assets/battlefields/bf_titan2/mobile.jpg";
import bfTitan3Desktop from "../assets/battlefields/bf_titan3/desktop.jpg";
import bfTitan3Mobile  from "../assets/battlefields/bf_titan3/mobile.jpg";
import bfHirsch1Desktop from "../assets/battlefields/bf_hirsch1/desktop.jpg";
import bfHirsch1Mobile  from "../assets/battlefields/bf_hirsch1/mobile.jpg";
import bfHirsch2Desktop from "../assets/battlefields/bf_hirsch2/desktop.jpg";
import bfHirsch2Mobile  from "../assets/battlefields/bf_hirsch2/mobile.jpg";
import bfHirsch3Desktop from "../assets/battlefields/bf_hirsch3/desktop.jpg";
import bfHirsch3Mobile  from "../assets/battlefields/bf_hirsch3/mobile.jpg";
import bfThron1Desktop from "../assets/battlefields/bf_thron1/desktop.jpg"; // #tiered Thron
import bfThron1Mobile  from "../assets/battlefields/bf_thron1/mobile.jpg";
import bfThron2Desktop from "../assets/battlefields/bf_thron2/desktop.jpg";
import bfThron2Mobile  from "../assets/battlefields/bf_thron2/mobile.jpg";
import bfKata1Desktop  from "../assets/battlefields/bf_kataklysmus1/desktop.jpg";
import bfKata1Mobile   from "../assets/battlefields/bf_kataklysmus1/mobile.jpg";
import bfKata2Desktop  from "../assets/battlefields/bf_kataklysmus2/desktop.jpg";
import bfKata2Mobile   from "../assets/battlefields/bf_kataklysmus2/mobile.jpg";
import bfKata3Desktop  from "../assets/battlefields/bf_kataklysmus3/desktop.jpg";
import bfKata3Mobile   from "../assets/battlefields/bf_kataklysmus3/mobile.jpg";
import bfThron3Desktop from "../assets/battlefields/bf_thron3/desktop.jpg";
import bfThron3Mobile  from "../assets/battlefields/bf_thron3/mobile.jpg";
import bfGaiaDesktop     from "../assets/battlefields/bf_gaia/desktop.jpg";
import bfGaiaMobile      from "../assets/battlefields/bf_gaia/mobile.jpg";
import bfGlaziusDesktop  from "../assets/battlefields/bf_glazius/desktop.jpg";
import bfGlaziusMobile   from "../assets/battlefields/bf_glazius/mobile.jpg";
import bfVoltarisDesktop from "../assets/battlefields/bf_voltaris/desktop.jpg";
import bfVoltarisMobile  from "../assets/battlefields/bf_voltaris/mobile.jpg";
import bfPyrrosDesktop   from "../assets/battlefields/bf_pyrros/desktop.jpg";
import bfPyrrosMobile    from "../assets/battlefields/bf_pyrros/mobile.jpg";
import bfQuecksilberDesktop from "../assets/battlefields/bf_quecksilber/desktop.jpg";
import bfQuecksilberMobile  from "../assets/battlefields/bf_quecksilber/mobile.jpg";
import bfKintsugiDesktop    from "../assets/battlefields/bf_kintsugi/desktop.jpg";
import bfKintsugiMobile     from "../assets/battlefields/bf_kintsugi/mobile.jpg";
import bfSalarDesktop       from "../assets/battlefields/bf_salar/desktop.jpg";
import bfSalarMobile        from "../assets/battlefields/bf_salar/mobile.jpg";
import bfNachtklingeDesktop from "../assets/battlefields/bf_nachtklinge/desktop.jpg";
import bfNachtklingeMobile  from "../assets/battlefields/bf_nachtklinge/mobile.jpg";
import bfParadoxDesktop     from "../assets/battlefields/bf_paradox/desktop.jpg";
import bfParadoxMobile      from "../assets/battlefields/bf_paradox/mobile.jpg";
import bfHanamiDesktop      from "../assets/battlefields/bf_hanami/desktop.jpg";
import bfHanamiMobile       from "../assets/battlefields/bf_hanami/mobile.jpg";
import bfNimbusDesktop      from "../assets/battlefields/bf_nimbus/desktop.jpg";
import bfNimbusMobile       from "../assets/battlefields/bf_nimbus/mobile.jpg";
import bfSolfataraDesktop   from "../assets/battlefields/bf_solfatara/desktop.jpg";
import bfSolfataraMobile    from "../assets/battlefields/bf_solfatara/mobile.jpg";
import bfOrigamiDesktop     from "../assets/battlefields/bf_origami/desktop.jpg";
import bfOrigamiMobile      from "../assets/battlefields/bf_origami/mobile.jpg";

// id → { front, back }. Fällt für unbekannte ids auf DECK_ASSETS.default zurück (siehe deckAssets()).
export const DECK_ASSETS = {
  default: { front: cardFrontImg, back: cardBackImg },
  // Deck-Werkstatt Starter-Themes (kaufbar):
  deck_sunset: { front: sunsetFront, back: sunsetBack },
  deck_lofi:   { front: lofiFront,   back: lofiBack },
  // v0.4 Kauf-Packs:
  deck_beach:      { front: beachFront,    back: beachBack },
  deck_cat:        { front: catFront,      back: catBack },
  deck_spacedog:   { front: spacedogFront, back: spacedogBack },
  deck_wale:       { front: waleFront,     back: waleBack },
  deck_onboarding: { front: genesisFront,  back: genesisBack },
  // #303 Challenge-Decks:
  deck_gottgleich: { front: gottgleichFront, back: gottgleichBack },
  deck_serie300:   { front: serie300Front,   back: serie300Back },
  deck_serie600:   { front: serie600Front,   back: serie600Back },
  deck_serie1500:  { front: serie1500Front,  back: serie1500Back },
  deck_sparfuchs:  { front: sparfuchsFront,   back: sparfuchsBack },
  // #310 Element-Challenge-Decks + Prisma (Multi) + DP-Kauf-Packs:
  deck_feuer:     { front: feuerFront,     back: feuerBack },
  deck_eis:       { front: eisFront,       back: eisBack },
  deck_blitz:     { front: blitzFront,     back: blitzBack },
  deck_pflanze:   { front: pflanzeFront,   back: pflanzeBack },
  deck_elementar: { front: elementarFront, back: elementarBack },
  deck_ronin:     { front: roninFront,     back: roninBack },
  deck_kosmos:    { front: kosmosFront,    back: kosmosBack },
  deck_oni:       { front: oniFront,       back: oniBack },
  deck_geometrie: { front: geoFront,       back: geoBack },
  // #311 DP-Kauf-Packs:
  deck_sonne:  { front: sonneFront,  back: sonneBack },
  deck_drache: { front: dracheFront, back: dracheBack },
  // #312 DP-Kauf-Packs:
  deck_arcade:     { front: arcadeFront,     back: arcadeBack },
  deck_polarlicht: { front: polarlichtFront, back: polarlichtBack },
  deck_seedrache:  { front: seedracheFront,  back: seedracheBack },
  deck_obsidian:   { front: obsidianFront,   back: obsidianBack },
  deck_titan1:  { front: titan1Front,  back: titan1Back },
  deck_titan2:  { front: titan2Front,  back: titan2Back },
  deck_titan3:  { front: titan3Front,  back: titan3Back },
  deck_hirsch1: { front: hirsch1Front, back: hirsch1Back },
  deck_hirsch2: { front: hirsch2Front, back: hirsch2Back },
  deck_hirsch3: { front: hirsch3Front, back: hirsch3Back },
  deck_thron1: { front: thron1Front, back: thron1Back },
  deck_thron2: { front: thron2Front, back: thron2Back },
  deck_thron3: { front: thron3Front, back: thron3Back },
  deck_kataklysmus1: { front: kata1Front, back: kata1Back },
  deck_kataklysmus2: { front: kata2Front, back: kata2Back },
  deck_kataklysmus3: { front: kata3Front, back: kata3Back },
  deck_gaia:     { front: gaiaFront,     back: gaiaBack },
  deck_glazius:  { front: glaziusFront,  back: glaziusBack },
  deck_voltaris: { front: voltarisFront, back: voltarisBack },
  deck_pyrros:   { front: pyrrosFront,   back: pyrrosBack },
  deck_quecksilber: { front: quecksilberFront, back: quecksilberBack },
  deck_kintsugi:    { front: kintsugiFront,    back: kintsugiBack },
  deck_salar:       { front: salarFront,       back: salarBack },
  deck_nachtklinge: { front: nachtklingeFront, back: nachtklingeBack },
  deck_paradox:     { front: paradoxFront,     back: paradoxBack },
  deck_hanami:      { front: hanamiFront,      back: hanamiBack },
  deck_nimbus:      { front: nimbusFront,      back: nimbusBack },
  deck_solfatara:   { front: solfataraFront,   back: solfataraBack },
  deck_origami:     { front: origamiFront,     back: origamiBack },
};

// id → Battlefield-Skin (responsive { desktop, mobile }). default = null (aktueller Look ohne
// Zusatz-Hintergrund). Das Rendering (responsive Auswahl mobile/desktop) folgt in einer eigenen Phase.
export const BATTLEFIELD_ASSETS = {
  default: null,
  // Deck-Werkstatt Starter-Themes (kaufbar):
  bf_sunset: { desktop: bfSunsetDesktop, mobile: bfSunsetMobile },
  bf_lofi:   { desktop: bfLofiDesktop,   mobile: bfLofiMobile },
  // v0.4 Kauf-Packs:
  bf_beach:      { desktop: bfBeachDesktop,    mobile: bfBeachMobile },
  bf_cat:        { desktop: bfCatDesktop,      mobile: bfCatMobile },
  bf_spacedog:   { desktop: bfSpacedogDesktop, mobile: bfSpacedogMobile },
  bf_wale:       { desktop: bfWaleDesktop,     mobile: bfWaleMobile },
  bf_onboarding: { desktop: bfGenesisDesktop,  mobile: bfGenesisMobile },
  // #303 Challenge-Battlefields:
  bf_gottgleich: { desktop: bfGottgleichDesktop, mobile: bfGottgleichMobile },
  bf_serie300:   { desktop: bfSerie300Desktop,   mobile: bfSerie300Mobile },
  bf_serie600:   { desktop: bfSerie600Desktop,   mobile: bfSerie600Mobile },
  bf_serie1500:  { desktop: bfSerie1500Desktop,  mobile: bfSerie1500Mobile },
  bf_sparfuchs:  { desktop: bfSparfuchsDesktop,  mobile: bfSparfuchsMobile },
  // #310 Element-Challenge-Battlefields + Prisma + DP-Kauf-Packs:
  bf_feuer:     { desktop: bfFeuerDesktop,     mobile: bfFeuerMobile },
  bf_eis:       { desktop: bfEisDesktop,       mobile: bfEisMobile },
  bf_blitz:     { desktop: bfBlitzDesktop,     mobile: bfBlitzMobile },
  bf_pflanze:   { desktop: bfPflanzeDesktop,   mobile: bfPflanzeMobile },
  bf_elementar: { desktop: bfElementarDesktop, mobile: bfElementarMobile },
  bf_ronin:     { desktop: bfRoninDesktop,     mobile: bfRoninMobile },
  bf_kosmos:    { desktop: bfKosmosDesktop,    mobile: bfKosmosMobile },
  bf_oni:       { desktop: bfOniDesktop,       mobile: bfOniMobile },
  bf_geometrie: { desktop: bfGeoDesktop,       mobile: bfGeoMobile },
  // #311 DP-Kauf-Packs:
  bf_sonne:  { desktop: bfSonneDesktop,  mobile: bfSonneMobile },
  bf_drache: { desktop: bfDracheDesktop, mobile: bfDracheMobile },
  // #312 DP-Kauf-Packs:
  bf_arcade:     { desktop: bfArcadeDesktop,     mobile: bfArcadeMobile },
  bf_polarlicht: { desktop: bfPolarlichtDesktop, mobile: bfPolarlichtMobile },
  bf_seedrache:  { desktop: bfSeedracheDesktop,  mobile: bfSeedracheMobile },
  bf_obsidian:   { desktop: bfObsidianDesktop,   mobile: bfObsidianMobile },
  bf_titan1:  { desktop: bfTitan1Desktop,  mobile: bfTitan1Mobile },
  bf_titan2:  { desktop: bfTitan2Desktop,  mobile: bfTitan2Mobile },
  bf_titan3:  { desktop: bfTitan3Desktop,  mobile: bfTitan3Mobile },
  bf_hirsch1: { desktop: bfHirsch1Desktop, mobile: bfHirsch1Mobile },
  bf_hirsch2: { desktop: bfHirsch2Desktop, mobile: bfHirsch2Mobile },
  bf_hirsch3: { desktop: bfHirsch3Desktop, mobile: bfHirsch3Mobile },
  bf_thron1: { desktop: bfThron1Desktop, mobile: bfThron1Mobile },
  bf_thron2: { desktop: bfThron2Desktop, mobile: bfThron2Mobile },
  bf_thron3: { desktop: bfThron3Desktop, mobile: bfThron3Mobile },
  bf_kataklysmus1: { desktop: bfKata1Desktop, mobile: bfKata1Mobile },
  bf_kataklysmus2: { desktop: bfKata2Desktop, mobile: bfKata2Mobile },
  bf_kataklysmus3: { desktop: bfKata3Desktop, mobile: bfKata3Mobile },
  bf_gaia:     { desktop: bfGaiaDesktop,     mobile: bfGaiaMobile },
  bf_glazius:  { desktop: bfGlaziusDesktop,  mobile: bfGlaziusMobile },
  bf_voltaris: { desktop: bfVoltarisDesktop, mobile: bfVoltarisMobile },
  bf_pyrros:   { desktop: bfPyrrosDesktop,   mobile: bfPyrrosMobile },
  bf_quecksilber: { desktop: bfQuecksilberDesktop, mobile: bfQuecksilberMobile },
  bf_kintsugi:    { desktop: bfKintsugiDesktop,    mobile: bfKintsugiMobile },
  bf_salar:       { desktop: bfSalarDesktop,       mobile: bfSalarMobile },
  bf_nachtklinge: { desktop: bfNachtklingeDesktop, mobile: bfNachtklingeMobile },
  bf_paradox:     { desktop: bfParadoxDesktop,     mobile: bfParadoxMobile },
  bf_hanami:      { desktop: bfHanamiDesktop,      mobile: bfHanamiMobile },
  bf_nimbus:      { desktop: bfNimbusDesktop,      mobile: bfNimbusMobile },
  bf_solfatara:   { desktop: bfSolfataraDesktop,   mobile: bfSolfataraMobile },
  bf_origami:     { desktop: bfOrigamiDesktop,     mobile: bfOrigamiMobile },
};

export const deckAssets = (id) => DECK_ASSETS[id] || DECK_ASSETS.default;
export const battlefieldAssets = (id) => BATTLEFIELD_ASSETS[id] || BATTLEFIELD_ASSETS.default;

/* #deck-mobil — Schleier-Deckel für zu helle Spielfelder (Handy-Hub).
   Gemessen wurde die mittlere Helligkeit ALLER 40 Bilder in genau dem Ausschnitt, den `cover` am Handy
   zeigt (`npm run bf:helligkeit`, Skript im Repo — bei einem neuen Deck einmal laufen lassen). Ergebnis:

     · Nach dem Schleier liegen die Bilder zwischen 15,1 und 35,1 (von 255), Median 19,9.
       Roh waren es 8,8 bis 57,2 — der Schleier drückt die Spanne also schon von Faktor 6,5 auf 2,3.
       Grund: die Schleierfarbe hat selbst eine Helligkeit von rund 19 und wirkt als Anziehungspunkt,
       sie zieht dunkle Bilder hoch und helle herunter.
     · LESBARKEIT ist nirgends das Thema: der schlechteste Kacheltext-Kontrast über alle 40 Decks und
       alle Pixel liegt bei 10,6:1 (WCAG AAA verlangt 7:1). Diese Liste ist eine OPTIK-Entscheidung.
     · 32 der 40 Decks liegen zwischen 15 und 24. Genau ZWEI fielen damals sichtbar heraus (die Liste
       unten ist seither auf VIER gewachsen — jeder Zuwachs mit eigener Begründung, s. dort).

   Deshalb ein Deckel und keine Normalisierung: hier steht nur, was NACH OBEN begrenzt wird. Dunkle Decks
   bleiben dunkel. Alle Decks auf dieselbe Helligkeit zu ziehen nähme ihnen ihren Charakter — Ascension
   IST ein Lichtdom, Kosmos IST das Weltall, und ein Hub, in dem der Deckwechsel die Grundstimmung nicht
   mehr ändert, verliert genau das, wofür der Hintergrund gebaut wurde.

   Der Faktor skaliert die Alpha-Stützstellen des Schleiers (`--vk` in `.as-hub-bg-veil`, index.css);
   die Werte hier bringen ihr Deck rechnerisch auf die Ziel-Helligkeit 24. Ein Eintrag ist eine AUSNAHME —
   wer hier etwas einträgt, sollte die Messung dazu haben. Nicht eingetragen = Faktor 1.

   NACHGEMESSEN am 18.08.2026 über 49 Spielfelder (Median 20,8; die Prozente in der Liste unten sind darauf
   bezogen und darum minimal anders als in den Erstmessungen). Drei Felder sind aus zwei parallelen Sätzen
   dazugekommen — alle drei nach dem Blick auf den echten Handy-Ausschnitt, nicht allein nach der Zahl:
     · Origami ist mit 33,0 das zweithellste Feld überhaupt und der einzige fast weiße Hintergrund im
       Register — ungedämpft blendet er wie Ascension, gedämpft steht er in einer Reihe mit dem Rest.
     · Solfatara (27,3) und Nimbus (27,1) liegen nur ~30 % über dem Median und wären nach der reinen Zahl
       Grenzfälle — die Liste hatte die sechs Felder bei 24,1–25,9 (0–8 % darüber) bewusst DRAUSSEN gelassen,
       weil man dort Rauschen korrigiert. Beide sind trotzdem drin, und zwar wegen der LAGE der Helligkeit,
       nicht wegen ihrer Höhe: bei Solfatara läuft das Schwefelband waagerecht durch die MITTE des Ausschnitts
       — also genau durch die Kachelzone — und es ist goldgelb, damit exakt der Fall, den #deck-mobil als
       offene Schwachstelle benannt hatte („goldener Guthaben-Stripe auf goldgetönter Kachel auf goldenem
       Bild"); bei Nimbus steht die Quallenglocke als große, gleichmäßig helle Fläche an derselben Stelle.
       Hanami braucht dagegen keinen Eintrag (22,5 — die Nacht darin ist wirklich dunkel, es leuchten nur
       Blüten und Lampions). Merksatz: nicht die Höhe der Zahl entscheidet, sondern ob das Helle dort liegt,
       wo die Kacheln stehen. */
const BATTLEFIELD_VEIL = {
  bf_gottgleich: 1.54, // gemessen 35,1 — Median +69 %, mit Abstand der hellste (goldener Lichtdom)
  bf_origami:    1.57, // gemessen 33,0 — Median +59 %, zweithellster; einziger fast weißer Hintergrund
  bf_pflanze:    1.38, // gemessen 29,0 — Median +39 %
  bf_solfatara:  1.37, // gemessen 27,3 — Median +31 %, s. Begründung oben (Lage des hellen Bandes)
  bf_nimbus:     1.28, // gemessen 27,1 — Median +30 %, s. Begründung oben (Fläche der Quallenglocke)
};
export const battlefieldVeil = (id) => BATTLEFIELD_VEIL[id] || 1;

/* #bf-desktop — Dämpfung der zu hellen Spielfelder auf dem DESKTOP.
   ===================================================================================
   Warum das neben `BATTLEFIELD_VEIL` steht und nicht darin: der Schleier oben gilt nur für
   den HANDY-Hub (`.as-hub-bg*`, in StartScreen.jsx an `dt:hidden` gehängt). Ab 1280 px zeigt
   die Seite ein anderes Element mit einem anderen, FESTEN Schleier — und im LAUF ist es noch
   einmal ein drittes (Battlefield.jsx) mit einem dritten. Die per-Deck-Korrektur gab es dort
   bisher gar nicht.

   Anderer Mechanismus, aus einem gemessenen Grund. Auf dem Handy verstärkt `--vk` die
   Schleier-Deckkraft. Am Desktop geht das nicht: der Schleier endet dort schon bei 82 %, ein
   Faktor über ~1,2 klemmt ihn auf 100 %, und dann steht statt des Bildes nur noch Schleierfarbe
   — die untere Bildhälfte war in der Gegenprobe schlicht tot. Gedämpft wird deshalb das BILD
   (`filter: brightness()`), nicht der Schleier: Verlauf und Zeichnung bleiben, nur die
   Leuchtkraft sinkt.

   Gemessen mit `node scripts/bf-beitrag.mjs` bei 1280×720 — nicht die Helligkeit des Bildes,
   sondern wie viel Licht es der FERTIGEN Seite hinzufügt (Aufnahme mit brightness(1) minus
   Aufnahme mit brightness(0)). Das musste so sein, weil die Panels im Hub je nach Spielfeld
   19–73 % des Hintergrunds verdecken; eine Messung am nackten Band gewichtet Flächen, die
   niemand sieht, und liefert viel zu harte Faktoren.

   Zwei Tabellen, weil die Lage sich unterscheidet — dieselbe Einsicht wie oben, eine Ebene
   weiter: `bf_seedrache` fällt nur im Hub auf, `bf_geometrie` nur im Lauf. Und `bf_origami`,
   mobil mit 1,57 der STÄRKSTE Eintrag, steht auf dem Desktop in beiden Listen NICHT drin: auf
   dem Handy-Ausschnitt ist er fast weiß, im Desktop-Band liegt er dunkel. Er war Kandidat und
   ist nach dem Blick auf die Aufnahmen wieder rausgeflogen.

   Kandidat war, was >60 % über dem Median lag; eingetragen ist, was man in den Vorher/Nachher-
   Aufnahmen SIEHT (`test/evidence/bf-beitrag/`). Ziel der Dämpfung ist Median +25 %.
   Nicht eingetragen = Faktor 1.

   NICHT abgedeckt: der Lauf am Handy (<640 px). Dort greift die Dämpfung bewusst nicht, weil
   für diese Oberfläche keine Messung vorliegt — `scripts/bf-beitrag.mjs` misst bei 1280×720. */
const BATTLEFIELD_DIM_HUB = {
  bf_gottgleich: 0.56, // Beitrag 0.0332 — Median +123 %, mit Abstand der hellste (goldener Lichtdom)
  bf_nimbus:     0.64, // Beitrag 0.0292 — Median +96 %
  bf_seedrache:  0.66, // Beitrag 0.0283 — Median +90 %; im Lauf unauffällig, nur hier
  bf_eis:        0.66, // Beitrag 0.0283 — Median +90 %, Polarlicht steht hinter der Wortmarke
};

const BATTLEFIELD_DIM_RUN = {
  bf_gottgleich: 0.37, // Beitrag 0.0378 — Median +234 %; die Karten standen im Lichtdom
  bf_geometrie:  0.49, // Beitrag 0.0287 — Median +154 %; im Hub unauffällig, nur hier
  bf_eis:        0.53, // Beitrag 0.0266 — Median +135 %
  bf_nimbus:     0.66, // Beitrag 0.0214 — Median +90 %
};

/** Helligkeits-Faktor für das Spielfeld-Bild. `surface`: "hub" | "run". */
export const battlefieldDim = (id, surface) =>
  (surface === "run" ? BATTLEFIELD_DIM_RUN : BATTLEFIELD_DIM_HUB)[id] || 1;
