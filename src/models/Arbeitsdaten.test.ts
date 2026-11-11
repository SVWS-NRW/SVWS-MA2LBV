import { describe, expect, it } from 'vitest'
import { ArbeitsdatenFehler, pruefeArbeitsdaten } from './Arbeitsdaten'

const monat = { stunden: '3', merkmal: 'V' }
const zeile = {
  markiert: true, nachname: 'A', vorname: 'B', geburtsdatum: '01.01.1980', lbvNummer: 'B 0312222', verguetungsschluessel: '1', status: 'V',
  hinweis: '', monate: Array(6).fill(monat),
}
const gueltig = { version: 1, zeilen: [zeile], monate: ['16/10', '16/11', '16/12', '17/01', '17/02', '17/03'], monatAktiv: Array(6).fill(true), abrechnungsdatei: 'x.txt' }

describe('Arbeitsdaten prüfen', () => {
  it('akzeptiert gültige Daten', () => {
    expect(pruefeArbeitsdaten(gueltig).zeilen).toHaveLength(1)
  })
  it.each([
    ['kein Objekt', 42],
    ['falsche Monatszahl', { ...gueltig, monate: ['16/10'] }],
    ['falscher Typ bei monatAktiv', { ...gueltig, monatAktiv: Array(6).fill('ja') }],
    ['Zeile ohne markiert', { ...gueltig, zeilen: [{ ...zeile, markiert: 'ja' }] }],
    ['Zeile mit zu wenigen Monaten', { ...gueltig, zeilen: [{ ...zeile, monate: [monat] }] }],
    ['Monat ohne Stunden', { ...gueltig, zeilen: [{ ...zeile, monate: Array(6).fill({ merkmal: '' }) }] }],
  ])('lehnt ab: %s', (_n, x) => {
    expect(() => pruefeArbeitsdaten(x)).toThrow(ArbeitsdatenFehler)
  })
  it('lehnt eine neuere Version ab', () => {
    expect(() => pruefeArbeitsdaten({ ...gueltig, version: 2 })).toThrow(/nicht unterstützten/)
  })
})
