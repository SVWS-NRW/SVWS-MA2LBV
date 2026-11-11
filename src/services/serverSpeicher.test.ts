import { describe, expect, it } from 'vitest'
import { liesKonfiguration } from './serverSpeicher'
import { parseAbrechnung, parseEinstellungen } from '@/models/Serverdaten'

describe('Konfiguration vom Server', () => {
  it('liest Benutzer- und globale Werte, leere Werte entfallen', () => {
    const k = liesKonfiguration({ user: [{ key: 'a', value: '1' }, { key: 'b', value: '' }, { key: 'c', value: null }], global: [{ key: 'g', value: '2' }] })
    expect([...k.user]).toEqual([['a', '1']])
    expect([...k.global]).toEqual([['g', '2']])
    expect(liesKonfiguration(undefined).user.size).toBe(0)
  })
})

describe('Datensätze lesen', () => {
  it('Einstellungen: unbekannte Felder und falsche Typen werden ignoriert, Lücken mit Standard gefüllt', () => {
    const s = parseEinstellungen(JSON.stringify({ version: 1, aktualisiert: 't', parameter: { aktenzeichen: 'AZ', schulnummer: 5, fremd: 'x' }, verhalten: { merkmalAutomatisch: false } }))
    expect(s?.parameter.aktenzeichen).toBe('AZ')
    expect(s?.parameter.schulnummer).toBe('')
    expect(s?.parameter).not.toHaveProperty('fremd')
    expect(s?.verhalten).toEqual({ merkmalAutomatisch: false, spaltenfilter: false })
  })
  it('leer oder ungültig ergibt null (Einstellungen) bzw. Fehler (Abrechnung)', () => {
    expect(parseEinstellungen('')).toBeNull()
    expect(parseEinstellungen('kein json')).toBeNull()
    expect(parseAbrechnung(undefined)).toBeNull()
    expect(() => parseAbrechnung('{"version":2}')).toThrow()
    expect(() => parseAbrechnung('kein json')).toThrow()
  })
})
