import { useEffect, useRef, useState } from "react";
import { audio } from "./audio.js";
import { haptics } from "./haptics.js";
import { music } from "./music.js";

// #333: Musik in den Auswahl-/Aufbau-Screens im Lauf ~40 % leiser (Duck-Faktor), im aktiven Stichspiel wieder voll.
const MUSIC_DUCK = 0.6;

/* Mirrors options and run state into the audio, music and haptics managers. Moved out of the 1,300-line
   AutostichGame body on 2026-09-28; every effect and its dependency list is the one App.jsx had, verbatim.
   Returns the music title for the bars and `musicHome` (menu or game over) for the callers that need it. */
export function useAudioSync({ options, state, inRun, paused, visible, overlays }) {
  const { showOptions, showChronik, glossaryOpen, confirmAbort, confirmRestart, showCustomize } = overlays;
  // Optionen → Audio-Manager spiegeln (Mute/Lautstärke). #207: Haptik-Toggle spiegeln (Default an; wirkt nur auf Mobile).
  useEffect(() => { audio.setMuted(!!options.muted); audio.setVolume(options.sfxVol ?? 0.4); }, [options.muted, options.sfxVol]);
  useEffect(() => { haptics.setEnabled(options.haptics !== false); }, [options.haptics]);
  // Kauf-Sound (#110): am Wachstum des Kauf-Logs (#127) → exakt 1× je ABGESCHLOSSENEM Kauf (immediate & Ziel-Items),
  // nie premature (Ziel-Flow öffnen) und nie bei no-op. Deshalb Cashout-Buttons via data-sfx="none" stummgeschaltet.
  const prevBuys = useRef(0);
  useEffect(() => {
    const n = state.shop?.purchaseLog?.length || 0;
    if (n > prevBuys.current) { audio.play("buy"); haptics.tick(); } // #207: Kauf-Bestätigung buzzt mit (Cashout-Button ist data-sfx="none")
    prevBuys.current = n;
  }, [state.shop?.purchaseLog?.length]);
  // Musik (#111): Titel-Abo für die Anzeige + phasengesteuerte Wiedergabe. musicHome = Menü ODER Gameover
  // → „Midnight Drive"; sonst (im Run) ein zufälliger Track aus dem harmonisierten Pool. Lautstärke/Mute spiegeln.
  const [musicTitle, setMusicTitle] = useState(null);
  useEffect(() => music.subscribe(setMusicTitle), []);
  const musicHome = state.phase === "menu" || state.phase === "gameover";
  // #339: aktuellen Score über einen Ref bereithalten (KEINE Effekt-Dep → die Musik startet nicht bei jedem Score-Tick neu),
  //   damit enterRun beim Run-/Resume-Start die zum gespeicherten Score passende Stufe wählt (statt immer calm).
  const scoreRef = useRef(state.score || 0);
  useEffect(() => { scoreRef.current = state.score || 0; }, [state.score]);
  useEffect(() => { if (musicHome) music.menu(); else music.enterRun(scoreRef.current); }, [musicHome]);
  // Aktueller Score an die Musik: steuert die Intensitäts-Stufe (<1 Mio ruhig → 60 Mio+ Overdrive+).
  useEffect(() => { if (!musicHome) music.setProgress(state.score || 0); }, [state.score, musicHome]);
  useEffect(() => { music.setMuted(!!options.muted); music.setVolume(options.musicVol ?? 0.2); }, [options.muted, options.musicVol]);
  // Ruhiger Modus (Option): kappt die score-abhängige Musik-Eskalation bei „mid" (nur calm/mid-Tracks). Default aus.
  useEffect(() => { music.setCalmMode(!!options.calmMusic); }, [options.calmMusic]);
  // #333: In den Auswahl-/Aufbau-Screens im Lauf (alles außer „play") die Musik ~40 % leiser ziehen (sanft), im
  // aktiven Stichspiel wieder voll. Deckt Perk/Skill/Gebäude/Aufstell und konsistent target/family-target/glacier-target/
  // legendary ab. Duck ist KEIN Mute (Nutzer-Lautstärke/Mute bleiben unberührt).
  useEffect(() => { music.setDuck(inRun && state.phase !== "play" ? MUSIC_DUCK : 1); }, [inRun, state.phase]);
  // Pause-Knopf hält die Musik an (nur im laufenden Stichspiel; in Menü/Gameover spielt sie normal weiter) UND der
  // Hintergrund/geschlossen-Zustand (!visible) hält sie IMMER an — sonst läuft die BGM auf dem Handy hinter dem
  // gesperrten Bildschirm/App-Wechsel weiter. Beim Zurückkehren (visible) wird der Zustand neu berechnet → Musik läuft weiter.
  useEffect(() => { music.setPaused((paused && state.phase === "play") || !visible); }, [paused, state.phase, visible]);
  // #: „Game komplett samt Musik pausieren", wenn die App in den Hintergrund geht/geschlossen wird (Handy sperren,
  // App-Wechsel): zusätzlich zur BGM den GANZEN Sound-Context suspendieren (alle SFX/Finisher-Betten einfrieren,
  // Akku sparen) — und beim Zurückkehren nahtlos fortsetzen. Der Lauf selbst friert bereits über `visible` ein.
  useEffect(() => { audio.setSuspended(!visible); }, [visible]);
  // #: Persistente Finisher-Ton-Betten (Brennstrahl/Schwarzes Loch) dürfen NUR in zwei Zuständen klingen: (1) im aktiv
  // laufenden Stichspiel und (2) in der Werkstatt-Vorschau (dort mounten die Preview-Betten). In JEDEM anderen Zustand
  // — Pause, Auswahl-/Perk-Fenster (Phase ≠ „play"), Overlays, Hintergrund-Tab UND besonders der Victory-/Gameover-Screen
  // (Lauf zu Ende, aber der letzte Sieg-Loop hängt noch) — werden sie verstummt. Positiv-Logik (statt inRun-gated), damit
  // auch der Gameover-Zustand (inRun=false) sicher greift.
  useEffect(() => {
    const inActivePlay = inRun && state.phase === "play" && !paused && !showOptions && !showChronik && !glossaryOpen && !confirmAbort && !confirmRestart && visible;
    const loopsAllowed = inActivePlay || showCustomize; // Werkstatt-Showcase = einziger Nicht-Spiel-Ort mit Loop-Betten
    audio.setLoopsSuspended(!loopsAllowed);
    audio.setFxSuspended(!loopsAllowed); // #329: Effekt-One-Shots (fx_*) exakt wie die Loop-Betten gaten → kein Sound-Schwanz im Victory/Overlay
  }, [inRun, state.phase, paused, showOptions, showChronik, glossaryOpen, confirmAbort, confirmRestart, visible, showCustomize]);
  return { musicTitle, musicHome };
}
