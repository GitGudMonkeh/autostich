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
import c1Front from "../assets/cards/decks_player/deck_c1/front.png"; // #190 deck_c1 „Endloskette" (Challenge: Serie 100)
import c1Back  from "../assets/cards/decks_player/deck_c1/back.png";
import c2Front from "../assets/cards/decks_player/deck_c2/front.png"; // #190 deck_c2 „Rekordhalter" (Challenge: Score 10M)
import c2Back  from "../assets/cards/decks_player/deck_c2/back.png";
import c3Front from "../assets/cards/decks_player/deck_c3/front.png"; // #190 deck_c3 „Sparfuchs" (Challenge: kein Shop-Kauf)
import c3Back  from "../assets/cards/decks_player/deck_c3/back.png";
import bf1Desktop from "../assets/battlefields/bf_1/desktop.jpg"; // #190 bf_1 „Neon-Boulevard" (ultrawide)
import bf1Mobile  from "../assets/battlefields/bf_1/mobile.jpg";  // (4:3, schmalerer Viewport)
import bf2Desktop from "../assets/battlefields/bf_2/desktop.jpg"; // #190 bf_2 „Nachttankstelle" (ultrawide)
import bf2Mobile  from "../assets/battlefields/bf_2/mobile.jpg";  // (4:3)
import bf3Desktop from "../assets/battlefields/bf_3/desktop.jpg"; // #190 bf_3 „Neon City" (ultrawide)
import bf3Mobile  from "../assets/battlefields/bf_3/mobile.jpg";  // (4:3)
import bf4Desktop from "../assets/battlefields/bf_4/desktop.jpg"; // #190 bf_4 „Mondsee" (ultrawide)
import bf4Mobile  from "../assets/battlefields/bf_4/mobile.jpg";  // (4:3)

// id → { front, back }. Fällt für unbekannte ids auf DECK_ASSETS.default zurück (siehe deckAssets()).
export const DECK_ASSETS = {
  default: { front: cardFrontImg, back: cardBackImg },
  deck_p1: { front: p1Front,     back: p1Back },
  deck_p2: { front: p2Front,     back: p2Back },
  deck_p3: { front: p3Front,     back: p3Back },
  deck_p4: { front: p4Front,     back: p4Back },
  deck_c1: { front: c1Front,     back: c1Back },
  deck_c2: { front: c2Front,     back: c2Back },
  deck_c3: { front: c3Front,     back: c3Back },
};

// id → Battlefield-Skin (responsive { desktop, mobile }). default = null (aktueller Look ohne
// Zusatz-Hintergrund). Das Rendering (responsive Auswahl mobile/desktop) folgt in einer eigenen Phase.
export const BATTLEFIELD_ASSETS = {
  default: null,
  bf_1: { desktop: bf1Desktop, mobile: bf1Mobile },
  bf_2: { desktop: bf2Desktop, mobile: bf2Mobile },
  bf_3: { desktop: bf3Desktop, mobile: bf3Mobile },
  bf_4: { desktop: bf4Desktop, mobile: bf4Mobile },
};

export const deckAssets = (id) => DECK_ASSETS[id] || DECK_ASSETS.default;
export const battlefieldAssets = (id) => BATTLEFIELD_ASSETS[id] || BATTLEFIELD_ASSETS.default;
