import { describe, expect, it } from 'vitest'
import { LEERE_PARAMETER } from '@/models/LbvParameter'
import { pruefeUndBereitVor, setzeMerkmaleAutomatisch, type ExportZeile } from './pruefung'

/**
 * Referenz: Änderungsmitteilungen, die MA2 (Delphi) erzeugt hat:
 *  - drei aus MA2 2.9.0.0 für Januar 2025 (Formular 2016_08, nur als Gegenprobe der Regeln),
 *  - fünf aus MA2 **3.2.3.2** für Januar und Februar 2024 (Formular 2019_02, gleiche Feldnamen wie unsere Vorlage).
 * Werte und Dateinamen wurden Feld für Feld mit der Ausgabe von SVWS-MA2LBV verglichen: 12 von 12 Feldern je
 * Datei und alle Dateinamen stimmen überein. Hier mit erfundenen Namen und denselben Mustern, weil die echten
 * Dateien nicht ins Repository gehören.
 */
const parameter = { ...LEERE_PARAMETER, schulnummer: '192806' }
const heute = new Date(2026, 10, 11)
const eineStunde = [{ monat: '25/01', stunden: '1', merkmal: '', aktiv: true }, ...Array(5).fill({ monat: '', stunden: '', merkmal: '', aktiv: true })]
const zeile = (z: Partial<ExportZeile>): ExportZeile => ({
  nachname: 'Curie', vorname: 'Marie', geburtsdatum: '07.11.1967', lbvNummer: 'B1234565', verguetungsschluessel: '4', status: 'V', monate: eineStunde, ...z,
})
const erzeuge = (z: ExportZeile) => {
  const r = pruefeUndBereitVor(setzeMerkmaleAutomatisch(z), parameter, heute)
  expect(r.fehler).toEqual([])
  return r.daten!
}

describe('Vergleich mit Ausgaben von MA2 (Januar 2025, 1 Stunde)', () => {
  it('Beamter in Teilzeit: Abschnitt A, Merkmal A, Schlüssel 4 (MA2: "0125 001 4" / "A")', () => {
    const d = erzeuge(zeile({ status: 'T' }))
    expect(d.felder).toEqual({ 'FeldA_Input1.1': '0125 001 4', 'FeldA_Input1.2': 'A' })
    expect(d.dateiname).toBe('LBV_Curie_B1234565_2501-2501.pdf')
  })

  it('Beamter in Vollzeit: Abschnitt A, Merkmal V, Schlüssel 3 (MA2: "0125 001 3" / "V")', () => {
    const d = erzeuge(zeile({ nachname: 'Noether', vorname: 'Emmy', lbvNummer: 'C7654329', verguetungsschluessel: '3' }))
    expect(d.felder).toEqual({ 'FeldA_Input1.1': '0125 001 3', 'FeldA_Input1.2': 'V' })
    expect(d.dateiname).toBe('LBV_Noether_C7654329_2501-2501.pdf')
  })

  it('Tarifbeschäftigte in Teilzeit: Abschnitt C, Lohnart 5004 (MA2: "5004 0125 00100")', () => {
    const d = erzeuge(zeile({ nachname: 'Turing', vorname: 'Alan', lbvNummer: 'P123456782', status: 'T' }))
    expect(d.felder).toEqual({ 'FeldC_Input1.1': '5004 0125 00100' })
    expect(d.dateiname).toBe('LBV_Turing_P123456782_2501-2501.pdf')
  })
})

describe('Vergleich mit Ausgaben von MA2 3.2.3.2 (Januar und Februar 2024, je 1 Stunde)', () => {
  const zweiMonate = ['24/01', '24/02'].map(monat => ({ monat, stunden: '1', merkmal: '', aktiv: true })).concat(Array(4).fill({ monat: '', stunden: '', merkmal: '', aktiv: true }))
  const faelle: [string, string, string, string, string, string][] = [
    // Beschreibung, LBV-Nr., Schlüssel, Status, erwartetes Merkmal, erwartete Zeile 1
    ['Beamter in Teilzeit, Schlüssel 1', 'B4829158', '1', 'T', 'A', '0124 001 1'],
    ['Beamter in Teilzeit, Schlüssel 4', 'D3077640', '4', 'T', 'A', '0124 001 4'],
    ['Beamter in Vollzeit, Schlüssel 2', 'E9510237', '2', 'V', 'V', '0124 001 2'],
    ['Tarifbeschäftigte in Vollzeit (Abschnitt A!), Schlüssel 4', 'P604812371', '4', 'V', 'V', '0124 001 4'],
    ['Tarifbeschäftigte in Vollzeit (Abschnitt A!), Schlüssel 3', 'P257904165', '3', 'V', 'V', '0124 001 3'],
  ]
  it.each(faelle)('%s (%s)', (_beschreibung, nr, schluessel, status, merkmal, zeile1) => {
    const r = pruefeUndBereitVor(setzeMerkmaleAutomatisch(zeile({ lbvNummer: nr, verguetungsschluessel: schluessel, status, monate: zweiMonate })), parameter, heute)
    expect(r.fehler).toEqual([])
    expect(r.daten!.felder).toEqual({
      'FeldA_Input1.1': zeile1, 'FeldA_Input1.2': merkmal,
      'FeldA_Input2.1': zeile1.replace('0124', '0224'), 'FeldA_Input2.2': merkmal,
    })
    expect(r.daten!.dateiname).toBe(`LBV_Curie_${nr}_2401-2402.pdf`)
  })
})
