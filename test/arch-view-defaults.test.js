import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { liftArchFormsDefault, loadOptions, saveOptions } from "../src/game/storage.js";

/* #arch-default — der Architekt startet mit Combos AN und Formationen AUS, und eine spätere Wahl gewinnt.

   Zwei Dinge, die leicht auseinanderfallen und beide einzeln geprüft gehören:

   1. Der VORGABEWERT. Er steht in DEFAULT_OPTIONS und ist eine Produktentscheidung, kein Zufall —
      deshalb hier namentlich festgehalten statt „irgendein Boolean".

   2. Die EINMALIGKEIT. Ein geänderter Vorgabewert allein erreicht bestehende Profile nie: `loadOptions`
      merged `{...DEFAULT_OPTIONS, ...gespeichert}`, und `saveOptions` schreibt das ganze Objekt — der
      gespeicherte Wert gewinnt also immer. Die Absenkung muss deshalb GENAU EINMAL laufen. Liefe sie
      bei jedem Start, wäre der Schalter kaputt: er ließe sich einschalten und stünde beim nächsten
      Öffnen wieder aus. Genau das ist die Zusage „die Auswahl wird weiterhin gemerkt". */

const storage = readFileSync(new URL("../src/game/storage.js", import.meta.url), "utf8");

class MemStore {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

describe("#arch-default — Vorgabewerte des Architekt-Bretts", () => {
  it("Combos an, Formationen aus", () => {
    // Aus der Quelle gelesen: die zwei Zeilen SIND die Entscheidung.
    expect(storage).toMatch(/archShowCombos:\s*true/);
    expect(storage).toMatch(/archShowForms:\s*false/);
  });

  it("der Marker startet auf false — sonst liefe die Absenkung nie", () => {
    // Stünde hier `true`, käme der Marker für Alt-Profile aus den Defaults und `liftArchFormsDefault`
    // wäre von Geburt an wirkungslos. Dieselbe Falle wie beim Marker der Farbmodus-Anhebung.
    expect(storage).toMatch(/archFormsDefaultLift:\s*false/);
  });
});

describe("#arch-default — genau einmal, dann gewinnt die Wahl", () => {
  it("erster Aufruf senkt ab und setzt den Marker, der zweite tut nichts", () => {
    const alt = { archShowForms: true };
    expect(liftArchFormsDefault(alt), "erster Aufruf senkt ab").toBe(true);
    expect(alt.archShowForms).toBe(false);
    expect(alt.archFormsDefaultLift).toBe(true);

    // Der Spieler schaltet Formationen bewusst wieder AN.
    alt.archShowForms = true;
    expect(liftArchFormsDefault(alt), "zweiter Aufruf tut nichts").toBe(false);
    expect(alt.archShowForms, "die bewusste Wahl überlebt").toBe(true);
  });

  it("Combos bleibt unangetastet — die Absenkung gilt nur den Formationen", () => {
    const o = { archShowCombos: false, archShowForms: true };
    liftArchFormsDefault(o);
    expect(o.archShowCombos, "ein abgeschaltetes Combos bleibt abgeschaltet").toBe(false);
  });
});

describe("#arch-default — über loadOptions gesehen", () => {
  beforeEach(() => { globalThis.localStorage = new MemStore(); });

  it("ein Altstand kommt mit Formationen AUS zurück und behält es beim zweiten Laden", () => {
    // Altstand: Formationen an (kam bis hierher aus dem Default), Absenkung noch nicht gelaufen.
    saveOptions({ archShowCombos: true, archShowForms: true, fxDeckDefaultLift: true });
    const erst = loadOptions();
    expect(erst.archShowForms, "Altstand wird einmalig abgesenkt").toBe(false);
    expect(erst.archShowCombos, "Combos bleibt an").toBe(true);
    expect(erst.archFormsDefaultLift, "der Marker ist gesetzt").toBe(true);

    // Jetzt schaltet der Spieler ein — und das muss ein Neustart überleben.
    saveOptions({ ...erst, archShowForms: true });
    expect(loadOptions().archShowForms, "die spätere Wahl gewinnt").toBe(true);
  });
});
