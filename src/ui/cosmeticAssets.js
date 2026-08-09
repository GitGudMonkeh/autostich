/* KOSMETIK-ASSETS (#190) — UI-seitige Bild-Auflösung für die Deck-/Battlefield-Skins.

   Getrennt von der PUREN Registry `src/game/cosmetics.js` (die node-getestet wird und keine PNGs laden
   darf): hier liegen die echten, von Vite gebündelten Bild-URLs, gekeyed über die Skin-id. Ein neues
   Deck = ein Import-Paar + ein Map-Eintrag hier (zusätzlich zum Metadaten-Eintrag in cosmetics.js).

   Deck-Skin = Paar { front, back }:
     front = Rahmen (leere Mitte; Zahl/Effekte rendern darüber) — entspricht card-front.png
     back  = Cover/Rückseite (voll illustriert)                  — entspricht card-back.png */
import cardFrontImg from "../assets/cards/card-front.png"; // Default-Front (Rahmen)
import cardBackImg  from "../assets/cards/card-back.png";  // Default-Back (Cover)
// #299: alte Progressions-Decks (deck_p1–4) entfernt.
// v0.4 Kauf-Packs — Deck-Paare (front = Rahmen, back = Motiv):
// #IP: deck_aura (Super Aura) / deck_mecha (Mecha Ronin) entfernt.
import beachFront    from "../assets/cards/decks_player/deck_beach/front.png";      // Malibu Wave
import beachBack     from "../assets/cards/decks_player/deck_beach/back.png";
import catFront      from "../assets/cards/decks_player/deck_cat/front.png";        // Aurora Whiskers
import catBack       from "../assets/cards/decks_player/deck_cat/back.png";
import ramenFront    from "../assets/cards/decks_player/deck_ramen/front.png";      // Slurp City
import ramenBack     from "../assets/cards/decks_player/deck_ramen/back.png";
import spacedogFront from "../assets/cards/decks_player/deck_spacedog/front.png";   // Star Pup
import spacedogBack  from "../assets/cards/decks_player/deck_spacedog/back.png";
import waleFront     from "../assets/cards/decks_player/deck_wale/front.png";       // Moonwhale
import waleBack      from "../assets/cards/decks_player/deck_wale/back.png";
import genesisFront  from "../assets/cards/decks_player/deck_onboarding/front.png"; // Genesis
import genesisBack   from "../assets/cards/decks_player/deck_onboarding/back.png";
// #299: alte Progressions-Battlefields (bf_1–4) entfernt.
// Deck-Werkstatt Starter-Themes (kaufbar, je Element 1 SP): jedes Theme = Deck-Paar + Battlefield.
import sunsetFront from "../assets/cards/decks_player/deck_sunset/front.png"; // Sunset Rider
import sunsetBack  from "../assets/cards/decks_player/deck_sunset/back.png";
import lofiFront   from "../assets/cards/decks_player/deck_lofi/front.png";   // Lofi Nights
import lofiBack    from "../assets/cards/decks_player/deck_lofi/back.png";
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
};

export const deckAssets = (id) => DECK_ASSETS[id] || DECK_ASSETS.default;
export const battlefieldAssets = (id) => BATTLEFIELD_ASSETS[id] || BATTLEFIELD_ASSETS.default;
