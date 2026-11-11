import { describe, expect, it } from 'vitest'
import { istGueltigesDatum, monatAusDatei, monatFuerDateiname, monatFuerPdf, pruefeMonat, realVal, rundeHalbGerade } from './zahlen'

describe('Rundung wie Delphi (Bankers Rounding)', () => {
  it.each([[0.5, 0], [1.5, 2], [2.5, 2], [3.5, 4], [3.4, 3], [3.6, 4], [0.4, 0]])('%s → %s', (a, b) => {
    expect(rundeHalbGerade(a)).toBe(b)
  })
})

describe('realVal', () => {
  it('liest Dezimalkomma, leer und Müll als 0', () => {
    expect(realVal('2,5')).toBe(2.5)
    expect(realVal('')).toBe(0)
    expect(realVal('abc')).toBe(0)
  })
})

describe('Monatsformate', () => {
  it('Datei "816" / "1016" → JJ/MM', () => {
    expect(monatAusDatei('816')).toBe('16/08')
    expect(monatAusDatei('1016')).toBe('16/10')
    expect(monatAusDatei('117')).toBe('17/01')
    expect(monatAusDatei('')).toBe('')
  })
  it('JJ/MM → MMJJ (PDF) und JJMM (Dateiname)', () => {
    expect(monatFuerPdf('16/10')).toBe('1016')
    expect(monatFuerDateiname('16/10')).toBe('1610')
  })
})

describe('Monatsprüfung', () => {
  const heute = new Date(2026, 10, 6) // 06.11.2026
  it('aktueller Monat ist zulässig, Zukunft nicht', () => {
    expect(pruefeMonat('26/11', heute)).toBe('ok')
    expect(pruefeMonat('26/12', heute)).toBe('zukunft')
    expect(pruefeMonat('26/13', heute)).toBe('ungueltig')
    expect(pruefeMonat('2611', heute)).toBe('ungueltig')
  })
})

describe('Datum', () => {
  it('prüft TT.MM.JJJJ', () => {
    expect(istGueltigesDatum('26.04.1975')).toBe(true)
    expect(istGueltigesDatum('31.02.1975')).toBe(false)
    expect(istGueltigesDatum('1975-04-26')).toBe(false)
  })
})
