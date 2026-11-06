import { describe, expect, it } from 'vitest'
import { automatischesMerkmal, pruefeMerkmalEingabe } from './merkmal'

describe('Merkmalsautomatik (Abschnitt A)', () => {
  it('Vollzeit: 0 < h < 4 → V, ab 4 leer, 0 leer', () => {
    expect(automatischesMerkmal('3', false)).toBe('V')
    expect(automatischesMerkmal('1', false)).toBe('V')
    expect(automatischesMerkmal('4', false)).toBe('')
    expect(automatischesMerkmal('0', false)).toBe('')
    expect(automatischesMerkmal('', false)).toBe('')
  })
  it('Teilzeit: jede Stunde > 0 → A', () => {
    expect(automatischesMerkmal('3', true)).toBe('A')
    expect(automatischesMerkmal('10', true)).toBe('A')
    expect(automatischesMerkmal('0', true)).toBe('')
  })
  it('entscheidet anhand der gerundeten Stunden (MA2-Fehler bei 3 < h < 4)', () => {
    expect(automatischesMerkmal('3,4', false)).toBe('V') // exportiert wird 3
    expect(automatischesMerkmal('3,6', false)).toBe('')  // exportiert wird 4
  })
})

describe('Merkmal-Eingabe', () => {
  it('Abschnitt A: nur V oder A', () => {
    expect(pruefeMerkmalEingabe('A', 'v')).toBe('')
    expect(pruefeMerkmalEingabe('A', 'K')).toContain('V')
  })
  it('Abschnitt C: nur K', () => {
    expect(pruefeMerkmalEingabe('C', 'k')).toBe('')
    expect(pruefeMerkmalEingabe('C', 'A')).toContain('K')
  })
  it('leer oder ohne Bereich immer zulässig', () => {
    expect(pruefeMerkmalEingabe('A', '')).toBe('')
    expect(pruefeMerkmalEingabe('', 'X')).toBe('')
  })
})
