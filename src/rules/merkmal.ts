import type { Bereich } from './types'
import { realVal, rundeHalbGerade } from './zahlen'

/** Zulässige Merkmale je Abschnitt (ADR 003, 4.4). */
export function erlaubteMerkmale(bereich: Bereich): string[] {
  if (bereich === 'A') return ['V', 'A']
  if (bereich === 'C') return ['K']
  return []
}

/** Meldung wie in MA2, wenn ein Merkmal im Abschnitt nicht zulässig ist; sonst `''`. */
export function pruefeMerkmalEingabe(bereich: Bereich, wert: string): string {
  const w = wert.trim().toUpperCase()
  if (w === '' || bereich === '') return ''
  if (bereich === 'C' && w[0] !== 'K') {
    return 'Zulässiges Merkmal: K (Lohnart 5006: Beteiligung an Klassenfahrten, nur Teilzeit im Tarifbereich)'
  }
  if (bereich === 'A' && w[0] !== 'V' && w[0] !== 'A') {
    return 'Zulässige Merkmale: V (weniger als vier vergütungsfähige Stunden anweisen), A (anteilige Besoldung bei Teilzeitbeschäftigten)'
  }
  return ''
}

/**
 * Automatik für Abschnitt A. Anders als in MA2 wird anhand der **gerundeten** Stunden entschieden,
 * weil genau diese ins Formular geschrieben werden (ADR 003, Auffälligkeit 2).
 *
 *  - Stunden = 0                → leer
 *  - Teilzeit, Stunden > 0      → A
 *  - Vollzeit, 0 < Stunden < 4  → V
 *  - Vollzeit, Stunden ≥ 4      → leer
 */
export function automatischesMerkmal(stundenText: string, istTZ: boolean): string {
  const h = rundeHalbGerade(realVal(stundenText))
  if (h <= 0) return ''
  if (istTZ) return 'A'
  return h < 4 ? 'V' : ''
}
