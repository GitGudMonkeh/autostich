/* KOSMETIK-ASSETS (#190) — UI-seitige Bild-Auflösung für die Deck-/Battlefield-Skins.

   Getrennt von der PUREN Registry `src/game/cosmetics.js` (die node-getestet wird und keine PNGs laden
   darf): hier liegen die echten, von Vite gebündelten Bild-URLs, gekeyed über die Skin-id. Ein neues
   Deck = ein Import-Paar + ein Map-Eintrag hier (zusätzlich zum Metadaten-Eintrag in cosmetics.js).

   Deck-Skin = Paar { front, back }:
     front = Rahmen (leere Mitte; Zahl/Effekte rendern darüber) — entspricht card-front.png
     back  = Cover/Rückseite (voll illustriert)                  — entspricht card-back.png */
import cardFrontImg from "../assets/cards/card-front.png"; // Default-Front (Rahmen)
import cardBackImg  from "../assets/cards/card-back.png";  // Default-Back (Cover)
import p1Front from "../assets/cards/decks_player/deck_p1/front.png"; // #190 deck_p1 „Neonstadt"
import p1Back  from "../assets/cards/decks_player/deck_p1/back.png";
import p2Front from "../assets/cards/decks_player/deck_p2/front.png"; // #190 deck_p2 „Tankstopp"
import p2Back  from "../assets/cards/decks_player/deck_p2/back.png";
import p3Front from "../assets/cards/decks_player/deck_p3/front.png"; // #190 deck_p3 „Megacity"
import p3Back  from "../assets/cards/decks_player/deck_p3/back.png";
import p4Front from "../assets/cards/decks_player/deck_p4/front.png"; // #190 deck_p4 „Mondpagode"
import p4Back  from "../assets/cards/decks_player/deck_p4/back.png";
// v0.4 Kauf-Packs — Deck-Paare (front = Rahmen, back = Motiv):
import auraFront     from "../assets/cards/decks_player/deck_aura/front.png";       // Super Aura
import auraBack      from "../assets/cards/decks_player/deck_aura/back.png";
import beachFront    from "../assets/cards/decks_player/deck_beach/front.png";      // Malibu Wave
import beachBack     from "../assets/cards/decks_player/deck_beach/back.png";
import catFront      from "../assets/cards/decks_player/deck_cat/front.png";        // Aurora Whiskers
import catBack       from "../assets/cards/decks_player/deck_cat/back.png";
import mechaFront    from "../assets/cards/decks_player/deck_mecha/front.png";      // Mecha Ronin
import mechaBack     from "../assets/cards/decks_player/deck_mecha/back.png";
import ramenFront    from "../assets/cards/decks_player/deck_ramen/front.png";      // Slurp City
import ramenBack     from "../assets/cards/decks_player/deck_ramen/back.png";
import spacedogFront from "../assets/cards/decks_player/deck_spacedog/front.png";   // Star Pup
import spacedogBack  from "../assets/cards/decks_player/deck_spacedog/back.png";
import waleFront     from "../assets/cards/decks_player/deck_wale/front.png";       // Moonwhale
import waleBack      from "../assets/cards/decks_player/deck_wale/back.png";
import genesisFront  from "../assets/cards/decks_player/deck_onboarding/front.png"; // Genesis
import genesisBack   from "../assets/cards/decks_player/deck_onboarding/back.png";
import bf1Desktop from "../assets/battlefields/bf_1/desktop.jpg"; // #190 bf_1 „Neon-Boulevard" (ultrawide)
import bf1Mobile  from "../assets/battlefields/bf_1/mobile.jpg";  // (4:3, schmalerer Viewport)
import bf2Desktop from "../assets/battlefields/bf_2/desktop.jpg"; // #190 bf_2 „Nachttankstelle" (ultrawide)
import bf2Mobile  from "../assets/battlefields/bf_2/mobile.jpg";  // (4:3)
import bf3Desktop from "../assets/battlefields/bf_3/desktop.jpg"; // #190 bf_3 „Neon City" (ultrawide)
import bf3Mobile  from "../assets/battlefields/bf_3/mobile.jpg";  // (4:3)
import bf4Desktop from "../assets/battlefields/bf_4/desktop.jpg"; // #190 bf_4 „Mondsee" (ultrawide)
import bf4Mobile  from "../assets/battlefields/bf_4/mobile.jpg";  // (4:3)
// Deck-Werkstatt Starter-Themes (kaufbar, je Element 1 SP): jedes Theme = Deck-Paar + Battlefield.
import sunsetFront from "../assets/cards/decks_player/deck_sunset/front.png"; // Sunset Rider
import sunsetBack  from "../assets/cards/decks_player/deck_sunset/back.png";
import lofiFront   from "../assets/cards/decks_player/deck_lofi/front.png";   // Lofi Nights
import lofiBack    from "../assets/cards/decks_player/deck_lofi/back.png";
import kaijuFront  from "../assets/cards/decks_player/deck_kaiju/front.png";  // Neon Kaiju
import kaijuBack   from "../assets/cards/decks_player/deck_kaiju/back.png";
import bfSunsetDesktop from "../assets/battlefields/bf_sunset/desktop.jpg";
import bfSunsetMobile  from "../assets/battlefields/bf_sunset/mobile.jpg";
import bfLofiDesktop   from "../assets/battlefields/bf_lofi/desktop.jpg";
import bfLofiMobile    from "../assets/battlefields/bf_lofi/mobile.jpg";
import bfKaijuDesktop  from "../assets/battlefields/bf_kaiju/desktop.jpg";
import bfKaijuMobile   from "../assets/battlefields/bf_kaiju/mobile.jpg";
// v0.4 Kauf-Packs — Battlefields (desktop 1600×640 / mobile 1080×810):
import bfAuraDesktop     from "../assets/battlefields/bf_aura/desktop.jpg";
import bfAuraMobile      from "../assets/battlefields/bf_aura/mobile.jpg";
import bfBeachDesktop    from "../assets/battlefields/bf_beach/desktop.jpg";
import bfBeachMobile     from "../assets/battlefields/bf_beach/mobile.jpg";
import bfCatDesktop      from "../assets/battlefields/bf_cat/desktop.jpg";
import bfCatMobile       from "../assets/battlefields/bf_cat/mobile.jpg";
import bfMechaDesktop    from "../assets/battlefields/bf_mecha/desktop.jpg";
import bfMechaMobile     from "../assets/battlefields/bf_mecha/mobile.jpg";
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
  deck_p1: { front: p1Front,     back: p1Back },
  deck_p2: { front: p2Front,     back: p2Back },
  deck_p3: { front: p3Front,     back: p3Back },
  deck_p4: { front: p4Front,     back: p4Back },
  // Deck-Werkstatt Starter-Themes (kaufbar):
  deck_sunset: { front: sunsetFront, back: sunsetBack },
  deck_lofi:   { front: lofiFront,   back: lofiBack },
  deck_kaiju:  { front: kaijuFront,  back: kaijuBack },
  // v0.4 Kauf-Packs:
  deck_aura:       { front: auraFront,     back: auraBack },
  deck_beach:      { front: beachFront,    back: beachBack },
  deck_cat:        { front: catFront,      back: catBack },
  deck_mecha:      { front: mechaFront,    back: mechaBack },
  deck_ramen:      { front: ramenFront,    back: ramenBack },
  deck_spacedog:   { front: spacedogFront, back: spacedogBack },
  deck_wale:       { front: waleFront,     back: waleBack },
  deck_onboarding: { front: genesisFront,  back: genesisBack },
};

// id → Battlefield-Skin (responsive { desktop, mobile }). default = null (aktueller Look ohne
// Zusatz-Hintergrund). Das Rendering (responsive Auswahl mobile/desktop) folgt in einer eigenen Phase.
export const BATTLEFIELD_ASSETS = {
  default: null,
  bf_1: { desktop: bf1Desktop, mobile: bf1Mobile },
  bf_2: { desktop: bf2Desktop, mobile: bf2Mobile },
  bf_3: { desktop: bf3Desktop, mobile: bf3Mobile },
  bf_4: { desktop: bf4Desktop, mobile: bf4Mobile },
  // Deck-Werkstatt Starter-Themes (kaufbar):
  bf_sunset: { desktop: bfSunsetDesktop, mobile: bfSunsetMobile },
  bf_lofi:   { desktop: bfLofiDesktop,   mobile: bfLofiMobile },
  bf_kaiju:  { desktop: bfKaijuDesktop,  mobile: bfKaijuMobile },
  // v0.4 Kauf-Packs:
  bf_aura:       { desktop: bfAuraDesktop,     mobile: bfAuraMobile },
  bf_beach:      { desktop: bfBeachDesktop,    mobile: bfBeachMobile },
  bf_cat:        { desktop: bfCatDesktop,      mobile: bfCatMobile },
  bf_mecha:      { desktop: bfMechaDesktop,    mobile: bfMechaMobile },
  bf_ramen:      { desktop: bfRamenDesktop,    mobile: bfRamenMobile },
  bf_spacedog:   { desktop: bfSpacedogDesktop, mobile: bfSpacedogMobile },
  bf_wale:       { desktop: bfWaleDesktop,     mobile: bfWaleMobile },
  bf_onboarding: { desktop: bfGenesisDesktop,  mobile: bfGenesisMobile },
};

export const deckAssets = (id) => DECK_ASSETS[id] || DECK_ASSETS.default;
export const battlefieldAssets = (id) => BATTLEFIELD_ASSETS[id] || BATTLEFIELD_ASSETS.default;
