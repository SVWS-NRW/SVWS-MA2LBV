import Papa from 'papaparse'
import type { MonatsEintrag } from '@/models/Mehrarbeit'
import { monatAusDatei, rundeHalbGerade } from '@/rules/zahlen'

/**
 * Einlesen der Abrechnungsdatei (ADR 003, 4.3). Reine Funktionen, kein DOM-Zugriff.
 * Format 1 ("Untis-Format"): eine Zeile je Lehrkraft mit 6 Monaten.
 * Format 2 ("Alternativformat"): sechs Zeilen je Lehrkraft.
 */

export type ImportFormat = 1 | 2

export interface ImportZeile {
  nachname: string
  vorname: string
  geburtsdatum: string
  lbvNummer: string
  verguetungsschluessel: string
  /** Großbuchstaben; Format 1: Spalte "Statistik", Format 2: Spalte "Status" (L → W) */
  status: string
  /** genau 6 Einträge, passend zu `ImportErgebnis.monate` */
  monate: MonatsEintrag[]
}

export interface ImportErgebnis {
  format: ImportFormat
  /** "JJ/MM"; leere Einträge, wenn die Datei keine Monate enthält (Startmonat erfragen) */
  monate: string[]
  zeilen: ImportZeile[]
  warnungen: string[]
}

export class ImportFehler extends Error {}

const KOPF_1 = 'Langname,Vorname,Geburtsdatum,Personalnummer,Status,Statistik,Schlüssel,Monat_1,Stunden_1,Merkmal_1,Monat_2,Stunden_2,Merkmal_2,Monat_3,Stunden_3,Merkmal_3,Monat_4,Stunden_4,Merkmal_4,Monat_5,Stunden_5,Merkmal_5,Monat_6,Stunden_6,Merkmal_6'
const KOPF_2 = 'Nachname,Vorname,Geburtsdatum,Personalnummer,Status,Schlüssel,Monat,Stunden,Merkmal'

/** Dekodiert UTF-8 (mit oder ohne BOM), sonst Windows-1252 (Kodierung der MA2-Beispieldateien). */
export function dekodiereDatei(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

/** Trennzeichen der Kopfzeile: das häufigste von Komma, Semikolon, Tabulator. */
function erkenneTrennzeichen(kopf: string): string {
  const kandidaten = [',', ';', '\t']
  let best = ','
  let max = -1
  for (const k of kandidaten) {
    const n = kopf.split(k).length - 1
    if (n > max) { max = n; best = k }
  }
  return best
}

/** Stundenangabe des Untis-Formats: Werte mit mehr als vier Zeichen sind Festkomma mit 5 Nachkommastellen. */
export function untisStunden(text: string): string {
  let h = text.trim()
  if (h.length > 4 && /^\d+$/.test(h)) {
    const wert = rundeHalbGerade((Number(h) / 100000) * 100) / 100
    h = wert.toFixed(1).replace('.', ',')
  }
  return h === '000' ? '' : h
}

function normalisiereKopf(zeile: string[]): string {
  return zeile.map(s => s.trim()).join(',').replace(',Schluessel,', ',Schlüssel,')
}

export function leseAbrechnung(text: string): ImportErgebnis {
  const roh = text.replace(/^﻿/, '')
  const ersteZeile = roh.split(/\r?\n/, 1)[0] ?? ''
  const parsed = Papa.parse<string[]>(roh, { delimiter: erkenneTrennzeichen(ersteZeile), skipEmptyLines: 'greedy' })
  const zeilen = parsed.data
  if (zeilen.length < 2) throw new ImportFehler('Datei enthält keine Daten')

  const kopf = normalisiereKopf(zeilen[0])
  if (kopf.startsWith(KOPF_1)) return leseFormat1(zeilen.slice(1))
  if (kopf.startsWith(KOPF_2)) return leseFormat2(zeilen.slice(1))
  throw new ImportFehler('Falsches Dateiformat')
}

function feld(zeile: string[], i: number): string {
  return (zeile[i] ?? '').trim()
}

function leseFormat1(daten: string[][]): ImportErgebnis {
  const warnungen: string[] = []
  // Die Monate gelten für alle Lehrkräfte und stehen in der ersten Datenzeile
  const monate = Array.from({ length: 6 }, (_, i) => monatAusDatei(feld(daten[0], 7 + i * 3)))
  const zeilen: ImportZeile[] = daten.map((z, nr) => {
    const eintraege: MonatsEintrag[] = Array.from({ length: 6 }, (_, i) => ({
      stunden: untisStunden(feld(z, 8 + i * 3)),
      merkmal: feld(z, 9 + i * 3),
    }))
    const abweichend = Array.from({ length: 6 }, (_, i) => monatAusDatei(feld(z, 7 + i * 3))).some((m, i) => m !== monate[i])
    if (abweichend) warnungen.push(`Zeile ${nr + 2}: Monate weichen von der ersten Zeile ab und werden ignoriert`)
    return {
      nachname: feld(z, 0),
      vorname: feld(z, 1),
      geburtsdatum: feld(z, 2),
      lbvNummer: feld(z, 3),
      // MA2 wertet Spalte 6 ("Statistik", z. B. LV/LT) als Status aus, nicht Spalte 5
      status: feld(z, 5).toUpperCase(),
      verguetungsschluessel: feld(z, 6),
      monate: eintraege,
    }
  })
  return { format: 1, monate, zeilen, warnungen }
}

function leseFormat2(daten: string[][]): ImportErgebnis {
  if (daten.length % 6 !== 0) throw new ImportFehler('Falsches Dateiformat')
  const warnungen: string[] = []
  const gruppen = daten.length / 6
  const monateJeGruppe = (g: number) => Array.from({ length: 6 }, (_, i) => monatAusDatei(feld(daten[g * 6 + i], 6)))
  const monate = monateJeGruppe(0)

  const zeilen: ImportZeile[] = []
  for (let g = 0; g < gruppen; g++) {
    const block = daten.slice(g * 6, g * 6 + 6)
    const pnr = feld(block[0], 3)
    if (block.some(z => feld(z, 3) !== pnr)) {
      throw new ImportFehler(`Falsches Dateiformat: Zeilen ${g * 6 + 2}–${g * 6 + 7} gehören nicht zur selben Lehrkraft`)
    }
    if (g > 0 && monateJeGruppe(g).some((m, i) => m !== monate[i])) {
      warnungen.push(`${feld(block[0], 0)} ${feld(block[0], 1)}: Monate weichen von der ersten Lehrkraft ab und werden ignoriert`)
    }
    const status = feld(block[0], 4).toUpperCase()
    zeilen.push({
      nachname: feld(block[0], 0),
      vorname: feld(block[0], 1),
      geburtsdatum: feld(block[0], 2),
      lbvNummer: pnr,
      status: status === 'L' ? 'W' : status,
      verguetungsschluessel: feld(block[0], 5),
      monate: block.map(z => ({ stunden: feld(z, 7), merkmal: feld(z, 8) })),
    })
  }
  return { format: 2, monate, zeilen, warnungen }
}
