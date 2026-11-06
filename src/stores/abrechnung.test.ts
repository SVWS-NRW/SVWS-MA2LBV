import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { LEERE_PARAMETER } from '@/models/LbvParameter'
import type { Lehrkraft } from '@/models/Lehrkraft'
import { useAbrechnungStore } from './abrechnung'
import { leseAbrechnung } from '@/services/csvImport'

const csv = [
  'Nachname,Vorname,Geburtsdatum,Personalnummer,Status,Schlüssel,Monat,Stunden,Merkmal',
  ...['816', '916', '1016', '1116', '1216', '117'].map((m, i) => `Byran,Augusta,10.09.1981,B 0312222,V,1,${m},${[3, 0, 5, 4, 2, 1][i]},`),
].join('\n')

const parameter = { ...LEERE_PARAMETER, schulnummer: '123456' }
const lk = (over: Partial<Lehrkraft> = {}): Lehrkraft => ({
  id: 1, kuerzel: 'FEY', nachname: 'Feynman', vorname: 'Richard', geburtsdatum: '26.04.1975',
  lbvNummer: '', verguetungsschluessel: '', rechtsverhaeltnis: '', beschaeftigungsart: '', status: '', ...over,
})

describe('Abrechnung-Store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('übernimmt den Import samt Zeitraum', () => {
    const s = useAbrechnungStore()
    expect(s.hatZeitraum).toBe(false)
    s.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    expect(s.hatZeitraum).toBe(true)
    expect(s.monate).toEqual(['16/08', '16/09', '16/10', '16/11', '16/12', '17/01'])
    expect(s.zeilen).toHaveLength(1)
    expect(s.zeilen[0].markiert).toBe(true)
    expect(s.summe(s.zeilen[0])).toBe(15)
  })

  it('summiert nur aktive Monate', () => {
    const s = useAbrechnungStore()
    s.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    s.setzeMonatAktiv(0, false)
    expect(s.summe(s.zeilen[0])).toBe(12)
  })

  it('Startmonat löscht Stunden, Merkmale und Hinweise', () => {
    const s = useAbrechnungStore()
    s.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    s.zeilen[0].hinweis = 'x'
    s.setzeStartmonat('25/10')
    expect(s.monate[0]).toBe('25/10')
    expect(s.zeilen[0].monate.every(m => m.stunden === '' && m.merkmal === '')).toBe(true)
    expect(s.zeilen[0].hinweis).toBe('')
  })

  it('übernimmt Lehrkräfte sortiert, ohne Duplikate, mit Datenhinweisen', () => {
    const s = useAbrechnungStore()
    s.setzeStartmonat('25/10')
    const r1 = s.uebernehmeLehrkraefte([lk({ id: 2, nachname: 'Zeta', vorname: 'Zoe', geburtsdatum: '01.01.1990' }), lk()])
    expect(r1).toEqual({ neu: 2, vorhanden: 0 })
    expect(s.zeilen.map(z => z.nachname)).toEqual(['Feynman', 'Zeta'])
    expect(s.zeilen[0].hinweis).toContain('LBV-Personalnummer nicht gepflegt')
    expect(s.uebernehmeLehrkraefte([lk()])).toEqual({ neu: 0, vorhanden: 1 })
    expect(s.zeilen).toHaveLength(2)
  })

  it('Zeilen einfügen, löschen, markieren', () => {
    const s = useAbrechnungStore()
    const a = s.fuegeZeileEin()
    const b = s.fuegeZeileEin(a)
    expect(s.zeilen.map(z => z.id)).toEqual([a, b])
    s.markiere('umkehren')
    expect(s.markierteZeilen).toHaveLength(0)
    s.markiere('alle')
    s.loescheZeilen([a])
    expect(s.zeilen.map(z => z.id)).toEqual([b])
  })

  it('prüft markierte Zeilen und setzt Merkmale automatisch', () => {
    const s = useAbrechnungStore()
    s.uebernehmeImport(leseAbrechnung(csv), 'test.txt', '17/01')
    // Zeitraum 17/01 … 17/06 liegt für das Testdatum zulässig in der Vergangenheit
    s.zeilen[0].monate = [{ stunden: '3', merkmal: '' }, { stunden: '5', merkmal: '' }, ...Array(4).fill({ stunden: '', merkmal: '' })]
    const r = s.pruefe(parameter, true, new Date(2017, 5, 30))
    expect(r).toEqual({ ok: 1, fehler: 0 })
    expect(s.zeilen[0].monate[0].merkmal).toBe('V')
    expect(s.zeilen[0].monate[1].merkmal).toBe('')
    expect(s.zeilen[0].hinweis).toBe('kein Fehler gefunden')
  })

  it('meldet Fehler in der Hinweisspalte und überspringt nicht markierte Zeilen', () => {
    const s = useAbrechnungStore()
    s.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    s.fuegeZeileEin()
    s.zeilen[1].markiert = false
    const r = s.pruefe({ ...parameter, schulnummer: '' }, true, new Date(2017, 5, 30))
    expect(r.fehler).toBe(1)
    expect(s.zeilen[0].hinweis).toContain('Schulnummer ungültig')
    expect(s.zeilen[1].hinweis).toBe('')
    expect(s.fehlerAnzahl).toBe(1)
  })
})
