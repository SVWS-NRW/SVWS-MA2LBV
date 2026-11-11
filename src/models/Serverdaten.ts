import { LEERE_PARAMETER, mischeBekannteFelder, type LbvParameter, type Verhalten } from './LbvParameter'
import { pruefeArbeitsdaten, type Arbeitsdaten } from './Arbeitsdaten'

/**
 * Datensätze, die auf dem SVWS-Server unter `/client/config/ma2lbv/...` abgelegt werden (ADR 004).
 * `aktualisiert` dient der Erkennung paralleler Änderungen (zwei Fenster, zwei Rechner mit demselben Benutzer).
 */
export interface EinstellungenSnapshot {
  version: 1
  aktualisiert: string
  parameter: LbvParameter
  verhalten: Verhalten
}

export interface AbrechnungSnapshot {
  version: 1
  aktualisiert: string
  daten: Arbeitsdaten
}

export const STANDARD_VERHALTEN: Verhalten = { merkmalAutomatisch: true, spaltenfilter: false }

/** Liest einen Einstellungs-Datensatz; leer oder ungültig ergibt `null`. */
export function parseEinstellungen(text: string | undefined | null): EinstellungenSnapshot | null {
  if (!text) return null
  try {
    const x = JSON.parse(text) as Record<string, unknown>
    if (!x || x.version !== 1 || typeof x.aktualisiert !== 'string') return null
    return {
      version: 1,
      aktualisiert: x.aktualisiert,
      parameter: mischeBekannteFelder({ ...LEERE_PARAMETER }, x.parameter),
      verhalten: mischeBekannteFelder({ ...STANDARD_VERHALTEN }, x.verhalten),
    }
  } catch {
    return null
  }
}

/** Liest einen Abrechnungs-Datensatz. Leer ergibt `null`; ein beschädigter Datensatz wirft einen Fehler. */
export function parseAbrechnung(text: string | undefined | null): AbrechnungSnapshot | null {
  if (!text) return null
  const x = JSON.parse(text) as Record<string, unknown>
  if (!x || x.version !== 1 || typeof x.aktualisiert !== 'string') throw new Error('Der Datensatz auf dem Server ist ungültig.')
  return { version: 1, aktualisiert: x.aktualisiert, daten: pruefeArbeitsdaten(x.daten) }
}
