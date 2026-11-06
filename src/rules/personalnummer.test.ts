import { describe, expect, it } from 'vitest'
import { berechnePruefziffer, normalisiereNummer, pruefePersonalnummer } from './personalnummer'

describe('Personalnummer', () => {
  it('entfernt Leerzeichen und normalisiert Großbuchstaben', () => {
    expect(normalisiereNummer('b 0312222')).toBe('B0312222')
  })

  it.each([
    ['B 0312222', 2],
    ['B 2009012', 2],
    ['C 0798541', 1],
    ['B 0613660', 0],
  ])('berechnet die Prüfziffer von %s', (nr, ziffer) => {
    expect(berechnePruefziffer(nr)).toBe(ziffer)
    expect(pruefePersonalnummer(nr)).toBe('')
  })

  it('lehnt eine falsche Prüfziffer ab (Alternativformat der Beispieldatei)', () => {
    expect(pruefePersonalnummer('B 0312221')).toContain('Prüfziffer')
  })

  it('meldet fehlende Nummer und falschen Aufbau', () => {
    expect(pruefePersonalnummer('')).toContain('fehlt')
    expect(pruefePersonalnummer('B03122')).toContain('Aufbau')
    expect(pruefePersonalnummer('0312222')).toContain('Aufbau')
  })

  it('prüft die Anfangsbuchstaben je Vorlage', () => {
    // F = 6, Summe 6*8 = 48, 48 mod 11 = 4 → "F0000004" ist nur in der LAA-Vorlage zulässig
    expect(berechnePruefziffer('F0000004')).toBe(4)
    expect(pruefePersonalnummer('F0000004', 'LAA')).toBe('')
    expect(pruefePersonalnummer('F0000004', 'LEHRKRAFT')).toContain('beginnt nicht mit')
  })

  it('berechnet die 10-stellige Prüfziffer (Gewichte 9..2)', () => {
    // P + 8 Ziffern + Prüfziffer: 1*9+2*8+3*7+4*6+5*5+6*4+7*3+8*2 = 9+16+21+24+25+24+21+16 = 156; 156 mod 11 = 2
    expect(berechnePruefziffer('P123456782')).toBe(2)
    expect(pruefePersonalnummer('P123456782')).toBe('')
    expect(pruefePersonalnummer('P123456783')).toContain('Prüfziffer')
  })
})
