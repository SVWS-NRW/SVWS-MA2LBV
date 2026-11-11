import { fuelleLinks, monatFuerPdf, realVal, rundeHalbGerade } from './zahlen'

/** Formatierung der Formularwerte (ADR 003, 4.6, 4.9, 5.1, 5.2). */

/** Abschnitt A: ganze Stunden, dreistellig ("3" → "003"). */
export function stundenAbschnittA(stundenText: string): string {
  return fuelleLinks(String(rundeHalbGerade(realVal(stundenText))), 3)
}

/** LAA-Formular: ganze Stunden, zweistellig ("3" → "03"). */
export function stundenLaa(stundenText: string): string {
  return fuelleLinks(String(rundeHalbGerade(realVal(stundenText))), 2)
}

/** Lohnart in Abschnitt C: Merkmal K = Klassenfahrt (5006), sonst 5004. */
export function lohnart(merkmal: string): '5004' | '5006' {
  return merkmal.trim().toUpperCase().startsWith('K') ? '5006' : '5004'
}

/**
 * Abschnitt C: fünf Ziffern (drei vor, zwei nach dem Komma), wie `GetCStunden`.
 * Nachkommastellen werden abgeschnitten, nicht gerundet; bei Lohnart 5004 (und 5007) werden sie auf "00" gesetzt.
 */
export function stundenAbschnittC(stundenText: string, art: string): string {
  let s = stundenText.trim().replace('.', ',')
  if (!s.includes(',')) s += ',0'
  const [vor, nach0] = s.split(',')
  let nach = nach0 ?? ''
  if (art === '5004' || art === '5007') nach = '00'
  if (nach.length > 2) nach = nach.slice(0, 2)
  if (nach.length === 0) nach = '00'
  if (nach.length === 1) nach += '0'
  return fuelleLinks(vor, 3) + nach
}

/** Feldtext Abschnitt A, z. B. "1016 003 2". */
export function textAbschnittA(monat: string, stunden: string, schluessel: string): string {
  return `${monatFuerPdf(monat)} ${stundenAbschnittA(stunden)} ${schluessel}`
}

/** Feldtext Abschnitt C, z. B. "5004 0210 00300". */
export function textAbschnittC(monat: string, stunden: string, merkmal: string): string {
  const art = lohnart(merkmal)
  return `${art} ${monatFuerPdf(monat)} ${stundenAbschnittC(stunden, art)}`
}

/** Feldtext LAA-Formular, z. B. "07 1016 03 2". */
export function textLaa(schulform: string, monat: string, stunden: string, schluessel: string): string {
  return `${schulform} ${monatFuerPdf(monat)} ${stundenLaa(stunden)} ${schluessel}`
}

/** Dateiname `LBV_<Name>_<Nr>_<JJMM>-<JJMM>.pdf` mit bereinigtem Namen (ADR 003, Auffälligkeit 10). */
export function dateiname(nachname: string, lbvNummer: string, ersterMonat: string, letzterMonat: string): string {
  const sauber = (t: string) => t.normalize('NFC').replace(/[^\p{L}\p{N}-]+/gu, '_').replace(/^_+|_+$/g, '')
  const von = ersterMonat.replace('/', '')
  const bis = letzterMonat.replace('/', '')
  return `LBV_${sauber(nachname)}_${sauber(lbvNummer)}_${von}-${bis}.pdf`
}
