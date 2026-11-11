import { describe, expect, it } from 'vitest'
import { ordneZu } from './zuordnung'

describe('Zuordnung zu Abschnitt A / C', () => {
  it('Beamte in Vollzeit → A', () => {
    expect(ordneZu('B 0312222', 'V')).toMatchObject({ bv: 1, istVZ: true, istTZ: false, bereich: 'A' })
  })
  it('Beamte in Teilzeit → A', () => {
    expect(ordneZu('B 2009012', 'LT')).toMatchObject({ bv: 1, istTZ: true, bereich: 'A' })
  })
  it('Tarifbeschäftigte in Vollzeit → A', () => {
    expect(ordneZu('P123456782', 'V')).toMatchObject({ bv: 2, bereich: 'A' })
  })
  it('Tarifbeschäftigte in Teilzeit → C', () => {
    expect(ordneZu('P123456782', 'T')).toMatchObject({ bv: 2, istTZ: true, bereich: 'C' })
  })
  it('erkennt Lehramtsanwärter am Status W', () => {
    expect(ordneZu('B 0312222', 'W').istLAA).toBe(true)
  })
  it('normalisiert den Status in Großbuchstaben (MA2 erkannte "v"/"t" nicht)', () => {
    expect(ordneZu('B 2009012', 'lt').istTZ).toBe(true)
  })
  it('unbekannter Anfangsbuchstabe → bv 0', () => {
    expect(ordneZu('I0000000', 'V').bv).toBe(0)
    expect(ordneZu('', 'V').bv).toBe(0)
  })
})
