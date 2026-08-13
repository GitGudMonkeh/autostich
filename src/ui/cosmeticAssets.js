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
import catFront      from "../assets/cards/decks_player/deck_cat/front.webp";        // Aurora Whiskers
import catBack       from "../assets/cards/decks_player/deck_cat/back.webp";
import ramenFront    from "../assets/cards/decks_player/deck_ramen/front.webp";      // Slurp City
import ramenBack     from "../assets/cards/decks_player/deck_ramen/back.webp";
import spacedogFront from "../assets/cards/decks_player/deck_spacedog/front.webp";   // Star Pup
import spacedogBack  from "../assets/cards/decks_player/deck_spacedog/back.webp";
import waleFront     from "../assets/cards/decks_player/deck_wale/front.webp";       // Moonwhale
import waleBack      from "../assets/cards/decks_player/deck_wale/back.webp";
import genesisFront  from "../assets/cards/decks_player/deck_onboarding/front.webp"; // Genesis
import genesisBack   from "../assets/cards/decks_player/deck_onboarding/back.webp";
// #303 Challenge-Decks (über eine Challenge freigeschaltet) — Deck-Paare:
import gottgleichFront from "../assets/cards/decks_player/deck_gottgleich/front.webp"; // Gottgleich
import gottgleichBack  from "../assets/cards/decks_player/deck_gottgleich/back.webp";
import serie300Front   from "../assets/cards/decks_player/deck_serie300/front.webp";   // Serie 300
import serie300Back    from "../assets/cards/decks_player/deck_serie300/back.webp";
import serie600Front   from "../assets/cards/decks_player/deck_serie600/front.webp";   // Serie 600
import serie600Back    from "../assets/cards/decks_player/deck_serie600/back.webp";
import sparfuchsFront  from "../assets/cards/decks_player/deck_sparfuchs/front.webp";  // Sparfuchs
import sparfuchsBack   from "../assets/cards/decks_player/deck_sparfuchs/back.webp";
import meisterFront    from "../assets/cards/decks_player/deck_meister/front.webp";    // Meister
import meisterBack     from "../assets/cards/decks_player/deck_meister/back.webp";
// #299: alte Progressions-Battlefields (bf_1–4) entfernt.
// Deck-Werkstatt Starter-Themes (kaufbar, je Element 1 SP): jedes Theme = Deck-Paar + Battlefield.
import sunsetFront from "../assets/cards/decks_player/deck_sunset/front.webp"; // Sunset Rider
import sunsetBack  from "../assets/cards/decks_player/deck_sunset/back.webp";
import lofiFront   from "../assets/cards/decks_player/deck_lofi/front.webp";   // Lofi Nights
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
import bfRamenDesktop    from "../assets/battlefields/bf_ramen/desktop.jpg";
import bfRamenMobile     from "../assets/battlefields/bf_ramen/mobile.jpg";
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
import bfSparfuchsDesktop  from "../assets/battlefields/bf_sparfuchs/desktop.jpg";
import bfSparfuchsMobile   from "../assets/battlefields/bf_sparfuchs/mobile.jpg";
import bfMeisterDesktop    from "../assets/battlefields/bf_meister/desktop.jpg";
import bfMeisterMobile     from "../assets/battlefields/bf_meister/mobile.jpg";
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
import geoFront       from "../assets/cards/decks_player/deck_geometrie/front.webp";    // Metatron (Kauf · 5 DP)
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
// #311 zwei DP-Kauf-Packs (je 10 DP): Sonnenfinsternis + Goldener Drache.
import sonneFront    from "../assets/cards/decks_player/deck_sonne/front.webp";     // Sonnenfinsternis
import sonneBack     from "../assets/cards/decks_player/deck_sonne/back.webp";
import dracheFront   from "../assets/cards/decks_player/deck_drache/front.webp";    // Goldener Drache
import dracheBack    from "../assets/cards/decks_player/deck_drache/back.webp";
import bfSonneDesktop   from "../assets/battlefields/bf_sonne/desktop.jpg";
import bfSonneMobile    from "../assets/battlefields/bf_sonne/mobile.jpg";
import bfDracheDesktop  from "../assets/battlefields/bf_drache/desktop.jpg";
import bfDracheMobile   from "../assets/battlefields/bf_drache/mobile.jpg";
// #312 drei DP-Kauf-Packs (je 10 DP): Arcade + Polarlicht + Seedrache.
import arcadeFront     from "../assets/cards/decks_player/deck_arcade/front.webp";     // Arcade
import arcadeBack      from "../assets/cards/decks_player/deck_arcade/back.webp";
import polarlichtFront from "../assets/cards/decks_player/deck_polarlicht/front.webp"; // Polarlicht
import polarlichtBack  from "../assets/cards/decks_player/deck_polarlicht/back.webp";
import seedracheFront  from "../assets/cards/decks_player/deck_seedrache/front.webp";  // Seedrache
import seedracheBack   from "../assets/cards/decks_player/deck_seedrache/back.webp";
import bfArcadeDesktop     from "../assets/battlefields/bf_arcade/desktop.jpg";
import bfArcadeMobile      from "../assets/battlefields/bf_arcade/mobile.jpg";
import bfPolarlichtDesktop from "../assets/battlefields/bf_polarlicht/desktop.jpg";
import bfPolarlichtMobile  from "../assets/battlefields/bf_polarlicht/mobile.jpg";
import bfSeedracheDesktop  from "../assets/battlefields/bf_seedrache/desktop.jpg";
import bfSeedracheMobile   from "../assets/battlefields/bf_seedrache/mobile.jpg";

// id → { front, back }. Fällt für unbekannte ids auf DECK_ASSETS.default zurück (siehe deckAssets()).
export const DECK_ASSETS = {
  default: { front: cardFrontImg, back: cardBackImg },
  // Deck-Werkstatt Starter-Themes (kaufbar):
  deck_sunset: { front: sunsetFront, back: sunsetBack },
  deck_lofi:   { front: lofiFront,   back: lofiBack },
  // v0.4 Kauf-Packs:
  deck_beach:      { front: beachFront,    back: beachBack },
  deck_cat:        { front: catFront,      back: catBack },
  deck_ramen:      { front: ramenFront,    back: ramenBack },
  deck_spacedog:   { front: spacedogFront, back: spacedogBack },
  deck_wale:       { front: waleFront,     back: waleBack },
  deck_onboarding: { front: genesisFront,  back: genesisBack },
  // #303 Challenge-Decks:
  deck_gottgleich: { front: gottgleichFront, back: gottgleichBack },
  deck_serie300:   { front: serie300Front,   back: serie300Back },
  deck_serie600:   { front: serie600Front,   back: serie600Back },
  deck_sparfuchs:  { front: sparfuchsFront,   back: sparfuchsBack },
  deck_meister:    { front: meisterFront,     back: meisterBack },
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
  bf_ramen:      { desktop: bfRamenDesktop,    mobile: bfRamenMobile },
  bf_spacedog:   { desktop: bfSpacedogDesktop, mobile: bfSpacedogMobile },
  bf_wale:       { desktop: bfWaleDesktop,     mobile: bfWaleMobile },
  bf_onboarding: { desktop: bfGenesisDesktop,  mobile: bfGenesisMobile },
  // #303 Challenge-Battlefields:
  bf_gottgleich: { desktop: bfGottgleichDesktop, mobile: bfGottgleichMobile },
  bf_serie300:   { desktop: bfSerie300Desktop,   mobile: bfSerie300Mobile },
  bf_serie600:   { desktop: bfSerie600Desktop,   mobile: bfSerie600Mobile },
  bf_sparfuchs:  { desktop: bfSparfuchsDesktop,  mobile: bfSparfuchsMobile },
  bf_meister:    { desktop: bfMeisterDesktop,    mobile: bfMeisterMobile },
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
};

export const deckAssets = (id) => DECK_ASSETS[id] || DECK_ASSETS.default;
export const battlefieldAssets = (id) => BATTLEFIELD_ASSETS[id] || BATTLEFIELD_ASSETS.default;
