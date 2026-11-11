// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { dekodiereDatei, ImportFehler, leseAbrechnung, untisStunden } from './csvImport'
import { sechsMonateAb, startmonatOptionen } from '@/rules/zahlen'

const lade = (name: string) => dekodiereDatei(new Uint8Array(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url))))

describe('Dekodierung', () => {
  it('liest Windows-1252 (ü im Kopf) und UTF-8 mit BOM', () => {
    expect(lade('Test_Abrechnung_UntisFormat.txt')).toContain('Schlüssel')
    const utf8 = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('Schlüssel')])
    expect(dekodiereDatei(utf8)).toBe('Schlüssel')
  })
})

describe('Untis-Stunden', () => {
  it.each([['300000', '3,0'], ['250000', '2,5'], ['0', '0'], ['000', ''], ['2', '2'], ['', ''], ['2.5', '2,5']])('%s → "%s"', (a, b) => {
    expect(untisStunden(a)).toBe(b)
  })
})

describe('Format 1 (Untis-Format)', () => {
  const r = leseAbrechnung(lade('Test_Abrechnung_UntisFormat.txt'))

  it('erkennt das Format und die Monate der ersten Datenzeile', () => {
    expect(r.format).toBe(1)
    expect(r.monate).toEqual(['16/08', '16/09', '16/10', '16/11', '16/12', '17/01'])
    expect(r.zeilen).toHaveLength(8)
    expect(r.warnungen).toEqual([])
  })

  it('liest Feynman: Statistik als Status, Stunden umgerechnet, Merkmal roh', () => {
    const f = r.zeilen.find(z => z.nachname === 'Feynman')!
    expect(f).toMatchObject({ vorname: 'Richard', geburtsdatum: '26.04.1975', lbvNummer: 'B 2009012', status: 'LT', verguetungsschluessel: '2' })
    expect(f.monate.map(m => m.stunden)).toEqual(['0', '0', '3,0', '4,0', '1,0', '2,0'])
    expect(f.monate.map(m => m.merkmal)).toEqual(['', '', 'a', 'a', 'a', 'a'])
  })

  it('übernimmt Nummern mit 10 Stellen', () => {
    expect(r.zeilen.find(z => z.nachname === 'Newton')?.lbvNummer).toBe('P 651111171')
  })
})

describe('Format 2 (Alternativformat)', () => {
  const r = leseAbrechnung(lade('Test_Abrechnung_Alternativformat.txt'))

  it('fasst sechs Zeilen zu einer Lehrkraft zusammen', () => {
    expect(r.format).toBe(2)
    expect(r.zeilen).toHaveLength(1)
    expect(r.monate).toEqual(['16/08', '16/09', '16/10', '16/11', '16/12', '17/01'])
    const b = r.zeilen[0]
    expect(b).toMatchObject({ nachname: 'Byran', lbvNummer: 'B 0312221', status: 'V', verguetungsschluessel: '1' })
    expect(b.monate).toEqual([
      { stunden: '3', merkmal: 'v' }, { stunden: '3', merkmal: 'v' }, { stunden: '0', merkmal: '' },
      { stunden: '4', merkmal: '' }, { stunden: '2', merkmal: 'v' }, { stunden: '1', merkmal: 'v' },
    ])
  })

  it('setzt Status L auf W und erkennt Semikolon als Trennzeichen', () => {
    const kopf = 'Nachname;Vorname;Geburtsdatum;Personalnummer;Status;Schluessel;Monat;Stunden;Merkmal'
    const zeilen = ['10', '20', '30', '40', '50', '60'].map(m => `Neu;Nina;03.03.1995;B 0312222;L;2;${m.slice(0, 1)}16;3;`)
    const r2 = leseAbrechnung([kopf, ...zeilen].join('\r\n'))
    expect(r2.zeilen[0].status).toBe('W')
    expect(r2.zeilen[0].verguetungsschluessel).toBe('2')
  })

  it('lehnt eine falsche Zeilenzahl oder gemischte Personalnummern ab', () => {
    const text = lade('Test_Abrechnung_Alternativformat.txt').split(/\r?\n/).slice(0, 6).join('\n')
    expect(() => leseAbrechnung(text)).toThrow(ImportFehler)
    const gemischt = lade('Test_Abrechnung_Alternativformat.txt').replace('B 0312221,V,1,916', 'B 0312222,V,1,916')
    expect(() => leseAbrechnung(gemischt)).toThrow(/selben Lehrkraft/)
  })
})

describe('Dezimalpunkt in der Datei', () => {
  it('wird im Alternativformat als Komma übernommen', () => {
    const kopf = 'Nachname,Vorname,Geburtsdatum,Personalnummer,Status,Schlüssel,Monat,Stunden,Merkmal'
    const zeilen = ['816', '916', '1016', '1116', '1216', '117'].map((m, i) => `Neu,Nina,03.03.1995,B 0312222,V,1,${m},${i === 1 ? '2.5' : '3'},`)
    expect(leseAbrechnung([kopf, ...zeilen].join('\n')).zeilen[0].monate[1].stunden).toBe('2,5')
  })
})

describe('Fehlerfälle', () => {
  it('leere Datei und unbekannter Kopf', () => {
    expect(() => leseAbrechnung('')).toThrow('Datei enthält keine Daten')
    expect(() => leseAbrechnung('a,b,c\n1,2,3')).toThrow('Falsches Dateiformat')
  })
})

describe('Startmonat', () => {
  it('bildet sechs Monate über den Jahreswechsel', () => {
    expect(sechsMonateAb('16/10')).toEqual(['16/10', '16/11', '16/12', '17/01', '17/02', '17/03'])
    expect(sechsMonateAb('')).toEqual(['', '', '', '', '', ''])
  })
  it('bietet zwei Jahre zurück bis zum aktuellen Monat an', () => {
    const o = startmonatOptionen(new Date(2026, 10, 6))
    expect(o[0]).toEqual({ monat: '24/01', text: 'Januar 2024' })
    expect(o[o.length - 1]).toEqual({ monat: '26/11', text: 'November 2026' })
    expect(o).toHaveLength(12 + 12 + 11)
  })
})
