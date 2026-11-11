import type { Mehrarbeitszeile } from './Mehrarbeit'

/** Inhalt der verschlüsselten Arbeitsdatei (`*.ma2lbv`, ADR 001, E5). Enthält keine Zugangsdaten und keine Einstellungen. */
export interface Arbeitsdaten {
  version: 1
  /** Zeilen ohne interne ID */
  zeilen: Omit<Mehrarbeitszeile, 'id'>[]
  /** sechs Monate "JJ/MM" */
  monate: string[]
  monatAktiv: boolean[]
  abrechnungsdatei: string
}

export class ArbeitsdatenFehler extends Error {}

const istText = (x: unknown): x is string => typeof x === 'string'

/** Prüft entschlüsselte Daten auf den erwarteten Aufbau, bevor sie in die Tabelle übernommen werden. */
export function pruefeArbeitsdaten(x: unknown): Arbeitsdaten {
  const fehler = () => new ArbeitsdatenFehler('Die Datei enthält keine gültigen Arbeitsdaten.')
  if (!x || typeof x !== 'object') throw fehler()
  const d = x as Record<string, unknown>
  if (d.version !== 1) throw new ArbeitsdatenFehler('Die Arbeitsdatei stammt aus einer nicht unterstützten Programmversion.')
  if (!Array.isArray(d.zeilen) || !Array.isArray(d.monate) || d.monate.length !== 6 || !d.monate.every(istText)) throw fehler()
  if (!Array.isArray(d.monatAktiv) || d.monatAktiv.length !== 6 || !d.monatAktiv.every(b => typeof b === 'boolean')) throw fehler()
  if (!istText(d.abrechnungsdatei)) throw fehler()
  const zeilen = d.zeilen.map((z): Omit<Mehrarbeitszeile, 'id'> => {
    if (!z || typeof z !== 'object') throw fehler()
    const r = z as Record<string, unknown>
    const felder = ['nachname', 'vorname', 'geburtsdatum', 'lbvNummer', 'verguetungsschluessel', 'status', 'hinweis'] as const
    if (!felder.every(f => istText(r[f])) || typeof r.markiert !== 'boolean') throw fehler()
    if (!Array.isArray(r.monate) || r.monate.length !== 6) throw fehler()
    const monate = r.monate.map(m => {
      const e = m as Record<string, unknown> | null
      if (!e || !istText(e.stunden) || !istText(e.merkmal)) throw fehler()
      return { stunden: e.stunden, merkmal: e.merkmal }
    })
    return {
      markiert: r.markiert, nachname: r.nachname as string, vorname: r.vorname as string, geburtsdatum: r.geburtsdatum as string,
      lbvNummer: r.lbvNummer as string, verguetungsschluessel: r.verguetungsschluessel as string, status: r.status as string,
      hinweis: r.hinweis as string, monate,
    }
  })
  return { version: 1, zeilen, monate: d.monate as string[], monatAktiv: d.monatAktiv as boolean[], abrechnungsdatei: d.abrechnungsdatei }
}
