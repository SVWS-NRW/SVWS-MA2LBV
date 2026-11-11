import { describe, expect, it } from 'vitest'
import { dateiname, lohnart, stundenAbschnittA, stundenAbschnittC, stundenLaa, textAbschnittA, textAbschnittC, textLaa } from './formular'

describe('Stundenformate', () => {
  it('Abschnitt A: ganze Stunden, dreistellig, gerundet wie Delphi', () => {
    expect(stundenAbschnittA('3')).toBe('003')
    expect(stundenAbschnittA('2,5')).toBe('002')
    expect(stundenAbschnittA('3,5')).toBe('004')
    expect(stundenAbschnittA('12')).toBe('012')
  })
  it('LAA: zweistellig', () => {
    expect(stundenLaa('3')).toBe('03')
    expect(stundenLaa('12')).toBe('12')
  })
  it('Abschnitt C: fünf Ziffern, Lohnart 5004 verliert Nachkommastellen', () => {
    expect(stundenAbschnittC('2,5', '5006')).toBe('00250')
    expect(stundenAbschnittC('2,5', '5004')).toBe('00200')
    expect(stundenAbschnittC('2', '5006')).toBe('00200')
    expect(stundenAbschnittC('12,345', '5006')).toBe('01234') // abgeschnitten, nicht gerundet
    expect(stundenAbschnittC('3,5', '5006')).toBe('00350')
  })
  it('Lohnart nach Merkmal', () => {
    expect(lohnart('K')).toBe('5006')
    expect(lohnart('')).toBe('5004')
  })
})

describe('Feldtexte', () => {
  it('Abschnitt A (Maske 9999 999 9)', () => {
    expect(textAbschnittA('16/10', '3', '2')).toBe('1016 003 2')
  })
  it('Abschnitt C (Maske 9999 9999 99999)', () => {
    expect(textAbschnittC('16/10', '3', 'K')).toBe('5006 1016 00300')
    expect(textAbschnittC('16/10', '3', '')).toBe('5004 1016 00300')
  })
  it('LAA (Maske 99 9999 99 9)', () => {
    expect(textLaa('07', '16/10', '3', '2')).toBe('07 1016 03 2')
  })
})

describe('Dateiname', () => {
  it('Beispiel der Anleitung', () => {
    expect(dateiname('Feynman', 'B2009012', '16/10', '16/11')).toBe('LBV_Feynman_B2009012_1610-1611.pdf')
  })
  it('bereinigt Sonderzeichen im Namen', () => {
    expect(dateiname('van der / Müller', 'B2009012', '16/10', '16/10')).toBe('LBV_van_der_Müller_B2009012_1610-1610.pdf')
  })
})
