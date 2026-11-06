import { describe, expect, it } from 'vitest'
import {
  baueLehrkraefte, bestimmeStatus, datenHinweise, filtereLehrkraefte, isoZuDatum, istBereitsAufgenommen, katalogSchluessel,
  type SvwsKatalog,
} from './lehrkraftMapper'

// Struktur wie von GET /types/<Name>.json geliefert (Auszug)
const katRv: SvwsKatalog = { daten: [
  { bezeichner: 'L', historie: [{ id: 3, schluessel: 'L' }] },
  { bezeichner: 'W', historie: [{ id: 9, schluessel: 'W' }] },
  { bezeichner: 'B', historie: [{ id: 5, schluessel: 'B' }] },
] }
const katBa: SvwsKatalog = { daten: [
  { bezeichner: 'V', historie: [{ id: 1, schluessel: 'V' }] },
  { bezeichner: 'T', historie: [{ id: 2, schluessel: 'T' }] },
] }
const rv = katalogSchluessel(katRv)
const ba = katalogSchluessel(katBa)

const liste = [
  { id: 1, kuerzel: 'FEY', nachname: 'Feynman', vorname: 'Richard', personTyp: 'LEHRKRAFT', istSichtbar: true },
  { id: 2, kuerzel: 'NEU', nachname: 'Neu', vorname: 'Nina', personTyp: 'LEHRKRAFT', istSichtbar: true },
  { id: 3, kuerzel: 'SEK', nachname: 'Sekretär', vorname: 'Sam', personTyp: 'SEKRETARIAT', istSichtbar: true },
  { id: 4, kuerzel: 'UNS', nachname: 'Unsichtbar', vorname: 'Uwe', personTyp: 'LEHRKRAFT', istSichtbar: false },
]

describe('Katalog und Datum', () => {
  it('bildet id → Schlüssel', () => {
    expect(rv.get(9)).toBe('W')
    expect(ba.get(2)).toBe('T')
  })
  it('wandelt ISO-Datum in TT.MM.JJJJ', () => {
    expect(isoZuDatum('1975-04-26')).toBe('26.04.1975')
    expect(isoZuDatum(null)).toBe('')
    expect(isoZuDatum('')).toBe('')
  })
})

describe('Filter wie MA2 (NurSichtbare) plus Personentyp', () => {
  it('behält nur sichtbare Lehrkräfte', () => {
    expect(filtereLehrkraefte(liste).map(l => l.id)).toEqual([1, 2])
  })
})

describe('Status', () => {
  it.each([
    ['W', 'V', 'W'], ['L', 'WT', 'W'], ['L', 'WV', 'W'],
    ['L', 'V', 'V'], ['B', 'T', 'T'], ['L', '', ''],
  ])('Rechtsverhältnis %s, Beschäftigungsart %s → %s', (r, b, s) => {
    expect(bestimmeStatus(r, b)).toBe(s)
  })
})

describe('Lehrkräfte aufbauen', () => {
  const stamm = [
    { id: 1, nachname: ' Feynman ', vorname: 'Richard', geburtsdatum: '1975-04-26' },
    { id: 2, nachname: 'Neu', vorname: 'Nina', geburtsdatum: '1995-03-03' },
  ]
  const pers = [
    { id: 1, lbvPersonalnummer: 'B 2009012', lbvVerguetungsschluessel: '2', abschnittsdaten: [
      { idSchuljahresabschnitt: 7, idRechtsverhaeltnis: 5, idBeschaeftigungsart: 1 },
      { idSchuljahresabschnitt: 54, idRechtsverhaeltnis: 3, idBeschaeftigungsart: 2 },
    ] },
    { id: 2, lbvPersonalnummer: null, lbvVerguetungsschluessel: null, abschnittsdaten: [
      { idSchuljahresabschnitt: 54, idRechtsverhaeltnis: 9, idBeschaeftigungsart: null },
    ] },
  ]
  const r = baueLehrkraefte(filtereLehrkraefte(liste), stamm, pers, rv, ba, 54)

  it('übernimmt Stammdaten, LBV-Felder und den Abschnitt der Schule', () => {
    expect(r[0]).toEqual({
      id: 1, kuerzel: 'FEY', nachname: 'Feynman', vorname: 'Richard', geburtsdatum: '26.04.1975',
      lbvNummer: 'B 2009012', verguetungsschluessel: '2', rechtsverhaeltnis: 'L', beschaeftigungsart: 'T', status: 'T',
    })
  })
  it('ungepflegte Felder bleiben leer, LAA erhält Status W', () => {
    expect(r[1]).toMatchObject({ lbvNummer: '', verguetungsschluessel: '', rechtsverhaeltnis: 'W', beschaeftigungsart: '', status: 'W' })
  })
  it('liefert Hinweise zu fehlenden Daten', () => {
    expect(datenHinweise(r[0])).toEqual([])
    expect(datenHinweise(r[1])).toEqual([
      'LBV-Personalnummer nicht gepflegt', 'Vergütungsschlüssel nicht gepflegt', 'Beschäftigungsart nicht gepflegt (Vollzeit angenommen)',
    ])
  })
  it('ohne Abschnittsdaten im Abschnitt bleiben Status und Beschäftigung leer', () => {
    const x = baueLehrkraefte([liste[0]], stamm, pers, rv, ba, 99)
    expect(x[0]).toMatchObject({ rechtsverhaeltnis: '', beschaeftigungsart: '', status: '' })
  })
})

describe('Bereits aufgenommen', () => {
  const z = [{ nachname: 'Feynman', vorname: 'Richard', geburtsdatum: '26.04.1975' }]
  it('vergleicht Nachname, Vorname und Geburtsdatum', () => {
    expect(istBereitsAufgenommen(z[0], z)).toBe(true)
    expect(istBereitsAufgenommen({ ...z[0], geburtsdatum: '01.01.1990' }, z)).toBe(false)
  })
})
