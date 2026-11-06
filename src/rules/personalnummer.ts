import type { Formular } from './types'

/**
 * LBV-Personalnummer: Format und Prüfziffer (ADR 003, 4.8).
 * Prüfziffer nach `Calc_Pruefziffer_Javascript.txt` des LBV und `CheckLBVNr` in MA2.
 */

/** Buchstabenwerte für die 8-stellige Prüfziffer (Skript des LBV; I ist nicht belegt). */
const BUCHSTABENWERT: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1,
}

/**
 * Zulässige Anfangsbuchstaben je Vorlage (ADR 003, 4.8): die Vorlage für Lehrkräfte
 * erlaubt B–E / P, die LAA-Vorlage A–H, J / K, L, M, N, P, Q, U.
 */
const ERLAUBT: Record<Formular, { acht: string; zehn: string }> = {
  LEHRKRAFT: { acht: 'BCDE', zehn: 'P' },
  LAA: { acht: 'ABCDEFGHJ', zehn: 'KLMNPQU' },
}

/** Entfernt Leerzeichen und wandelt in Großbuchstaben ("B 0312222" → "B0312222"). */
export function normalisiereNummer(nummer: string): string {
  return nummer.replace(/\s+/g, '').toUpperCase()
}

/** Berechnet die Prüfziffer aus Buchstabe und Ziffern ohne Prüfziffer; `null` bei unbekanntem Aufbau. */
export function berechnePruefziffer(nummer: string): number | null {
  const n = normalisiereNummer(nummer)
  if (/^[A-Z]\d{7}$/.test(n)) {
    const wert = BUCHSTABENWERT[n[0]]
    if (wert === undefined) return null
    let summe = wert * 8
    for (let i = 0; i < 6; i++) summe += Number(n[1 + i]) * (7 - i)
    const rest = summe % 11
    return rest === 10 ? 0 : rest
  }
  if (/^[A-Z]\d{9}$/.test(n)) {
    let summe = 0
    for (let i = 0; i < 8; i++) summe += Number(n[1 + i]) * (9 - i)
    const rest = summe % 11
    return rest === 10 ? 0 : rest
  }
  return null
}

/** Prüft eine Personalnummer und liefert die Fehlermeldung oder `''`. */
export function pruefePersonalnummer(nummer: string, formular: Formular = 'LEHRKRAFT'): string {
  const n = normalisiereNummer(nummer)
  if (n === '') return 'Fehler: LBV-Personalnummer fehlt'
  const erlaubt = ERLAUBT[formular]
  const achtstellig = /^[A-Z]\d{7}$/.test(n)
  const zehnstellig = /^[A-Z]\d{9}$/.test(n)
  if (!achtstellig && !zehnstellig) {
    return 'Fehler: Personalnummer: Aufbau falsch (Buchstabe + 7 bzw. 9 Ziffern)'
  }
  if (achtstellig && !erlaubt.acht.includes(n[0])) {
    return `Fehler: Personalnummer beginnt nicht mit "${[...erlaubt.acht].join('", "')}"`
  }
  if (zehnstellig && !erlaubt.zehn.includes(n[0])) {
    return `Fehler: Personalnummer (10-stellig) beginnt nicht mit "${[...erlaubt.zehn].join('", "')}"`
  }
  const soll = berechnePruefziffer(n)
  if (soll === null || soll !== Number(n[n.length - 1])) {
    return 'Fehler: Personalnummer: Prüfziffer falsch'
  }
  return ''
}
