import type { Bereich } from './types'
import { normalisiereNummer } from './personalnummer'

/** Beschäftigungsverhältnis (ADR 003, 4.2): 1 beamtet, 2 tarifbeschäftigt, 0 unbekannt. */
export type Beschaeftigung = 0 | 1 | 2

const BEAMTE = 'ABCDEFGHJ'
const ANGESTELLTE = 'KLMNOPQRSTUVWXYZ'

export interface Zuordnung {
  bv: Beschaeftigung
  istVZ: boolean
  istTZ: boolean
  istLAA: boolean
  bereich: Bereich
}

/**
 * Leitet aus LBV-Nummer und Status die Gruppe ab (`GibLBVNrundBV`, `GibVZTZ`, `GibLAA`).
 * Der Status wird, anders als in MA2, in Großbuchstaben normalisiert (ADR 003, Auffälligkeit 8).
 */
export function ordneZu(lbvNummer: string, status: string): Zuordnung {
  const nr = normalisiereNummer(lbvNummer)
  const st = status.toUpperCase()
  let bv: Beschaeftigung = 0
  if (nr !== '') {
    if (BEAMTE.includes(nr[0])) bv = 1
    else if (ANGESTELLTE.includes(nr[0])) bv = 2
  }
  const istTZ = st.includes('T')
  const istVZ = !istTZ
  const istLAA = st.includes('W')
  let bereich: Bereich = ''
  if (bv === 1 || istVZ) bereich = 'A'
  if (bv === 2 && istTZ) bereich = 'C'
  return { bv, istVZ, istTZ, istLAA, bereich }
}
