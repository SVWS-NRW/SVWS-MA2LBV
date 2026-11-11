import type { LbvParameter } from '@/models/LbvParameter'
import { pruefePersonalnummer, normalisiereNummer } from './personalnummer'
import { ordneZu } from './zuordnung'
import { automatischesMerkmal } from './merkmal'
import { dateiname, lohnart, stundenAbschnittA, stundenAbschnittC, stundenLaa, textAbschnittA, textAbschnittC, textLaa } from './formular'
import { istGueltigesDatum, pruefeMonat, realVal, rundeHalbGerade } from './zahlen'
import type { Formular } from './types'

/** Eingabe für Prüfung und Export einer Lehrkraft; `monate` hat genau 6 Einträge. */
export interface ExportZeile {
  nachname: string
  vorname: string
  geburtsdatum: string
  lbvNummer: string
  verguetungsschluessel: string
  status: string
  monate: { monat: string; stunden: string; merkmal: string; aktiv: boolean }[]
}

export interface FormularDaten {
  formular: Formular
  nachname: string
  vorname: string
  geburtsdatum: string
  personalnummer: string
  /** Feldname → Wert, ohne Kopfdaten der Schule */
  felder: Record<string, string>
  dateiname: string
}

export interface PruefErgebnis {
  /** Alle gefundenen Fehler in der Reihenfolge der Prüfungen (ADR 003, Entscheidung 2) */
  fehler: string[]
  /** Nur gesetzt, wenn `fehler` leer ist */
  daten?: FormularDaten
}

const STUNDEN_MAX_A = 288
const STUNDEN_MAX_C = 180
const STUNDEN_MAX_LAA = 24

export function pruefeSchulnummer(nr: string): string {
  const n = /^\d{6}$/.test(nr.trim()) ? Number(nr) : 0
  return n > 100000 && n < 200000 ? '' : 'Fehler: Schulnummer ungültig'
}

export function pruefeStundentaktung(wert: string): string {
  if (wert.trim() === '') return ''
  const n = /^\d{5}$/.test(wert.trim()) ? Number(wert) : 0
  return n > 4500 && n < 12001 ? '' : 'Fehler: Anzahl der Minuten je Unterrichtsstunde'
}

/**
 * Prüft eine Zeile und bereitet die Formularwerte vor (`GibErrCode` + `Kollegendaten2MADaten`).
 * Bei Konflikten zwischen MA2 und den Skripten der PDF-Vorlage gilt die strengere Regel (ADR 003, 9).
 */
export function pruefeUndBereitVor(zeile: ExportZeile, parameter: LbvParameter, heute: Date): PruefErgebnis {
  const fehler: string[] = []
  const z = ordneZu(zeile.lbvNummer, zeile.status)
  const formular: Formular = z.istLAA ? 'LAA' : 'LEHRKRAFT'

  const sn = pruefeSchulnummer(parameter.schulnummer)
  if (sn) fehler.push(sn)
  const st = pruefeStundentaktung(parameter.anzahlMinuten)
  if (st) fehler.push(st)

  if (zeile.nachname.trim() === '') fehler.push('Fehler: Nachname fehlt')
  if (zeile.vorname.trim() === '') fehler.push('Fehler: Vorname fehlt')
  if (!istGueltigesDatum(zeile.geburtsdatum)) fehler.push('Fehler: Geburtsdatum fehlt bzw. falsch')
  const pn = pruefePersonalnummer(zeile.lbvNummer, formular)
  if (pn) fehler.push(pn)
  if (z.bv === 0) fehler.push(`Fehler: Zuordnung beamtet / tarifbeschäftigt nicht möglich (${normalisiereNummer(zeile.lbvNummer)})`)
  if (formular === 'LAA' && !/^(0[1-9]|1[0-4]|16)$/.test(parameter.schulform)) {
    fehler.push('Fehler: Schulform hat keinen gültigen Wert')
  }

  const felder: Record<string, string> = {}
  const gueltigeMonate: string[] = []
  let summe = 0
  let n = 0

  for (const m of zeile.monate) {
    if (!m.aktiv || m.stunden.trim() === '') continue
    const roh = realVal(m.stunden)
    const merkmal = m.merkmal.trim().toUpperCase()
    const ganz = rundeHalbGerade(roh)
    const vs = Number(zeile.verguetungsschluessel)
    const monatFehler = (() => {
      const r = pruefeMonat(m.monat, heute)
      if (r === 'ungueltig') return `Fehler: Monat/Jahr: Falscher Wert (${m.monat})`
      if (r === 'zukunft') return `Fehler: Jahr/Monat: Termin liegt in der Zukunft (${m.monat})`
      return ''
    })()

    if (formular === 'LEHRKRAFT' && z.bereich === 'A') {
      if (ganz === 0) continue
      if (!(vs >= 1 && vs <= 4)) fehler.push(`Fehler: Vergütungsschlüssel (${zeile.verguetungsschluessel})`)
      if (merkmal !== '' && merkmal !== 'V' && merkmal !== 'A') fehler.push(`Fehler: Merkmal (${merkmal})`)
      if (ganz > STUNDEN_MAX_A) fehler.push(`Fehler: Anzahl Stunden (${stundenAbschnittA(m.stunden)})`)
      if (ganz < 4 && merkmal === '') fehler.push(`Fehler: Stunden < 4 und Merkmal <> 'V', 'A' (${stundenAbschnittA(m.stunden)})`)
      if (ganz >= 4 && merkmal === 'V') fehler.push(`Fehler: Merkmal 'V' nur bei Stunden < 4 (${stundenAbschnittA(m.stunden)})`)
      if (monatFehler) fehler.push(monatFehler)
      n++
      felder[`FeldA_Input${n}.1`] = textAbschnittA(m.monat, m.stunden, zeile.verguetungsschluessel)
      felder[`FeldA_Input${n}.2`] = merkmal
      summe += ganz
      gueltigeMonate.push(m.monat)
    } else if (formular === 'LEHRKRAFT' && z.bereich === 'C') {
      if (roh === 0) continue
      if (merkmal !== '' && merkmal !== 'K') fehler.push(`Fehler: Merkmal (${merkmal})`)
      if (roh > STUNDEN_MAX_C) fehler.push(`Fehler: Anzahl Stunden (${stundenAbschnittC(m.stunden, lohnart(merkmal))})`)
      if (monatFehler) fehler.push(monatFehler)
      n++
      felder[`FeldC_Input${n}.1`] = textAbschnittC(m.monat, m.stunden, merkmal)
      summe += roh
      gueltigeMonate.push(m.monat)
    } else if (formular === 'LAA') {
      if (ganz === 0) continue
      if (ganz > STUNDEN_MAX_LAA) fehler.push(`Fehler: Anzahl Stunden (${stundenLaa(m.stunden)})`)
      if (!(vs >= 1 && vs <= 8)) fehler.push(`Fehler: Vergütungsschlüssel (${zeile.verguetungsschluessel})`)
      if (monatFehler) fehler.push(monatFehler)
      n++
      felder[`FeldB_Input${n}_1`] = textLaa(parameter.schulform, m.monat, m.stunden, zeile.verguetungsschluessel)
      summe += ganz
      gueltigeMonate.push(m.monat)
    }
  }

  if (summe === 0) fehler.push('Fehler: keine Mehrarbeit')

  if (fehler.length > 0) return { fehler }
  return {
    fehler,
    daten: {
      formular,
      nachname: zeile.nachname.trim(),
      vorname: zeile.vorname.trim(),
      geburtsdatum: zeile.geburtsdatum.trim(),
      personalnummer: normalisiereNummer(zeile.lbvNummer),
      felder,
      dateiname: dateiname(zeile.nachname, normalisiereNummer(zeile.lbvNummer), gueltigeMonate[0], gueltigeMonate[gueltigeMonate.length - 1]),
    },
  }
}

/** Setzt die Merkmale einer Zeile automatisch (nur Abschnitt A, nur aktive Monate). */
export function setzeMerkmaleAutomatisch(zeile: ExportZeile): ExportZeile {
  const z = ordneZu(zeile.lbvNummer, zeile.status)
  if (zeile.lbvNummer.trim() === '' || z.bereich !== 'A') return zeile
  return {
    ...zeile,
    monate: zeile.monate.map(m => (m.aktiv ? { ...m, merkmal: automatischesMerkmal(m.stunden, z.istTZ) } : m)),
  }
}
