import { describe, expect, it } from 'vitest'
import { code39Balken, code39Lesen, code39Module, code39Text } from './code39'

/** Wandelt Balken zurück in die Breitenfolge schwarz/weiß abwechselnd (wie beim Auslesen eines Scans). */
function breiten(text: string): number[] {
  const b = code39Balken(text)
  const out: number[] = []
  let pos = 0
  for (const x of b) {
    if (x.start > pos) out.push(x.start - pos)
    out.push(x.breite)
    pos = x.start + x.breite
  }
  return out
}

describe('Code 39', () => {
  it('ergänzt Start/Stopp und schreibt groß (die Barcode-Schrift des LBV bildet Kleinbuchstaben auf Großbuchstaben ab)', () => {
    expect(code39Text('ABes23/201902/C1207893')).toBe('*ABES23/201902/C1207893*')
  })

  it('lässt sich vollständig zurücklesen', () => {
    for (const t of ['ABes23/201902/C1207893', 'ABes23/201902/P123456782', 'AZ-1 .$%+']) {
      expect(code39Lesen(breiten(t))).toBe(code39Text(t))
    }
  })

  it('hat die erwartete Länge: 24 Zeichen = 383 Module (Referenzausdruck: rund 445 pt bei 1,16 pt je Modul)', () => {
    const b = code39Balken('ABes23/201902/C1207893')
    const letzter = b[b.length - 1]
    expect(code39Module(24)).toBe(383)
    expect(letzter.start + letzter.breite).toBe(383)
    expect(b).toHaveLength(24 * 5)
  })

  it('lehnt nicht darstellbare Zeichen ab', () => {
    expect(() => code39Balken('Ä')).toThrow(/nicht darstellbar/)
  })
})
