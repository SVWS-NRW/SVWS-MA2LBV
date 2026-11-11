import { describe, expect, it } from 'vitest'
import { LEERE_PARAMETER, type LbvParameter } from '@/models/LbvParameter'
import { pruefeSchulnummer, pruefeStundentaktung, pruefeUndBereitVor, setzeMerkmaleAutomatisch, type ExportZeile } from './pruefung'

const heute = new Date(2017, 1, 15) // 15.02.2017
const parameter: LbvParameter = { ...LEERE_PARAMETER, schulnummer: '123456', schulform: '07' }

function monate(werte: [string, string, string][]): ExportZeile['monate'] {
  const leer = { monat: '', stunden: '', merkmal: '', aktiv: true }
  const m = werte.map(([monat, stunden, merkmal]) => ({ monat, stunden, merkmal, aktiv: true }))
  while (m.length < 6) m.push({ ...leer })
  return m
}

// Feynman aus Test_Abrechnung_UntisFormat.txt (Untis-Werte 300000 = 3 Stunden)
const feynman: ExportZeile = {
  nachname: 'Feynman', vorname: 'Richard', geburtsdatum: '26.04.1975', lbvNummer: 'B 2009012',
  verguetungsschluessel: '2', status: 'LT',
  monate: monate([['16/08', '0', ''], ['16/09', '0', ''], ['16/10', '3', 'a'], ['16/11', '4', 'a'], ['16/12', '1', 'a'], ['17/01', '2', 'a']]),
}

describe('Schul-Parameter', () => {
  it('Schulnummer: 6 Ziffern zwischen 100001 und 199999', () => {
    expect(pruefeSchulnummer('123456')).toBe('')
    expect(pruefeSchulnummer('12345')).not.toBe('')
    expect(pruefeSchulnummer('200000')).not.toBe('')
    expect(pruefeSchulnummer('')).not.toBe('')
  })
  it('Stundentaktung: leer oder 4501–12000', () => {
    expect(pruefeStundentaktung('')).toBe('')
    expect(pruefeStundentaktung('04500')).not.toBe('')
    expect(pruefeStundentaktung('04501')).toBe('')
    expect(pruefeStundentaktung('12000')).toBe('')
    expect(pruefeStundentaktung('12001')).not.toBe('')
  })
})

describe('Export Abschnitt A (Beamter in Teilzeit)', () => {
  it('erzeugt Feldwerte und Dateinamen, Nullmonate werden ausgelassen', () => {
    const r = pruefeUndBereitVor(feynman, parameter, heute)
    expect(r.fehler).toEqual([])
    expect(r.daten?.formular).toBe('LEHRKRAFT')
    expect(r.daten?.felder).toEqual({
      'FeldA_Input1.1': '1016 003 2', 'FeldA_Input1.2': 'A',
      'FeldA_Input2.1': '1116 004 2', 'FeldA_Input2.2': 'A',
      'FeldA_Input3.1': '1216 001 2', 'FeldA_Input3.2': 'A',
      'FeldA_Input4.1': '0117 002 2', 'FeldA_Input4.2': 'A',
    })
    expect(r.daten?.personalnummer).toBe('B2009012')
    expect(r.daten?.dateiname).toBe('LBV_Feynman_B2009012_1610-1701.pdf')
  })

  it('berücksichtigt nur markierte Monate', () => {
    const z = { ...feynman, monate: feynman.monate.map((m, i) => (i === 3 ? { ...m, aktiv: false } : m)) }
    const r = pruefeUndBereitVor(z, parameter, heute)
    expect(Object.keys(r.daten?.felder ?? {})).toHaveLength(6)
  })

  it('meldet mehrere Fehler gleichzeitig', () => {
    const z: ExportZeile = { ...feynman, nachname: '', lbvNummer: 'B 0312221', verguetungsschluessel: '9' }
    const r = pruefeUndBereitVor(z, { ...parameter, schulnummer: '' }, heute)
    expect(r.daten).toBeUndefined()
    expect(r.fehler).toEqual(expect.arrayContaining([
      'Fehler: Schulnummer ungültig',
      'Fehler: Nachname fehlt',
      'Fehler: LBV-Personalnummer: Prüfziffer falsch',
    ]))
    expect(r.fehler.some(f => f.startsWith('Fehler: Vergütungsschlüssel'))).toBe(true)
  })

  it('Stunden < 4 brauchen ein Merkmal', () => {
    const z = { ...feynman, monate: monate([['16/10', '3', '']]) }
    expect(pruefeUndBereitVor(z, parameter, heute).fehler[0]).toContain('Stunden < 4')
  })

  it('Merkmal V bei Stunden ≥ 4 ist unzulässig (strengere Regel der PDF-Vorlage)', () => {
    const z = { ...feynman, monate: monate([['16/10', '5', 'V']]) }
    expect(pruefeUndBereitVor(z, parameter, heute).fehler[0]).toContain("nur bei Stunden < 4")
  })

  it('Zukunftsmonat und keine Mehrarbeit', () => {
    const z = { ...feynman, monate: monate([['17/03', '2', 'A']]) }
    expect(pruefeUndBereitVor(z, parameter, heute).fehler.join('|')).toContain('Zukunft')
    const leer = { ...feynman, monate: monate([['16/10', '0', '']]) }
    expect(pruefeUndBereitVor(leer, parameter, heute).fehler).toEqual(['Fehler: keine Mehrarbeit'])
  })
})

describe('Export Abschnitt C (Tarif, Teilzeit)', () => {
  const tz: ExportZeile = {
    nachname: 'Muster', vorname: 'Mia', geburtsdatum: '01.02.1980', lbvNummer: 'P123456782',
    verguetungsschluessel: '1', status: 'T',
    monate: monate([['16/10', '2,5', 'K'], ['16/11', '3', '']]),
  }
  it('schreibt Lohnart, Monat und fünfstellige Stunden', () => {
    const r = pruefeUndBereitVor(tz, parameter, heute)
    expect(r.fehler).toEqual([])
    expect(r.daten?.felder).toEqual({
      'FeldC_Input1.1': '5006 1016 00250',
      'FeldC_Input2.1': '5004 1116 00300',
    })
  })
  it('lehnt Merkmale außer K ab und begrenzt auf 180 Stunden', () => {
    expect(pruefeUndBereitVor({ ...tz, monate: monate([['16/10', '3', 'A']]) }, parameter, heute).fehler[0]).toContain('Merkmal')
    expect(pruefeUndBereitVor({ ...tz, monate: monate([['16/10', '181', '']]) }, parameter, heute).fehler[0]).toContain('Anzahl Stunden')
  })
})

describe('Export LAA-Formular', () => {
  const laa: ExportZeile = {
    nachname: 'Neu', vorname: 'Nina', geburtsdatum: '03.03.1995', lbvNummer: 'B 0312222',
    verguetungsschluessel: '2', status: 'W', monate: monate([['16/10', '3', ''], ['16/11', '25', '']]),
  }
  it('schreibt Schulform, Monat, zweistellige Stunden und Schlüssel', () => {
    const r = pruefeUndBereitVor({ ...laa, monate: monate([['16/10', '3', '']]) }, parameter, heute)
    expect(r.fehler).toEqual([])
    expect(r.daten?.formular).toBe('LAA')
    expect(r.daten?.felder).toEqual({ 'FeldB_Input1_1': '07 1016 03 2' })
  })
  it('begrenzt Stunden auf 24 und verlangt eine gültige Schulform', () => {
    expect(pruefeUndBereitVor(laa, parameter, heute).fehler.join('|')).toContain('Anzahl Stunden')
    expect(pruefeUndBereitVor(laa, { ...parameter, schulform: '15' }, heute).fehler.join('|')).toContain('Schulform')
  })
})

describe('Merkmale automatisch setzen', () => {
  it('setzt V/A nur im Abschnitt A und nur für markierte Monate', () => {
    const vz: ExportZeile = { ...feynman, status: 'V', monate: monate([['16/10', '3', ''], ['16/11', '5', 'V']]) }
    const r = setzeMerkmaleAutomatisch(vz)
    expect(r.monate[0].merkmal).toBe('V')
    expect(r.monate[1].merkmal).toBe('')
    const c: ExportZeile = { ...feynman, lbvNummer: 'P123456782', status: 'T', monate: monate([['16/10', '3', 'K']]) }
    expect(setzeMerkmaleAutomatisch(c).monate[0].merkmal).toBe('K')
  })
})
