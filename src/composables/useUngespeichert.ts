import { useAbrechnungStore } from '@/stores/abrechnung'
import { useAuthStore } from '@/stores/auth'
import { useServerSyncStore } from '@/stores/serverSync'

/**
 * Erkennt ungesicherte Änderungen (Abrechnungsdaten **und** Einstellungen) und beschreibt sie für Rückfragen.
 *
 * - Mit SVWS-Verbindung zählt der Stand auf dem Server. Beide Datensätze werden dort gespeichert.
 * - Ohne Verbindung liegen die Einstellungen automatisch im Browser; ungesichert ist nur die Abrechnungstabelle,
 *   bis sie in eine Datei gesichert wurde.
 */
export function useUngespeichert() {
  const abrechnung = useAbrechnungStore()
  const auth = useAuthStore()
  const sync = useServerSyncStore()

  const mitServer = () => auth.isConnected && sync.aktiv

  /** Synchron, z. B. für `beforeunload`. */
  function hatUngesichertes(): boolean {
    if (mitServer()) return sync.ungespeichert
    return abrechnung.zeilen.length > 0 && abrechnung.geaendert
  }

  /**
   * Speichert wartende Änderungen zuerst auf dem Server und liefert danach eine Beschreibung dessen, was noch
   * ungesichert ist, oder `null`, wenn alles gesichert ist.
   */
  async function offeneAenderungen(): Promise<string | null> {
    if (mitServer()) {
      if (sync.status === 'wartet' || sync.status === 'speichert') await sync.speichereJetzt()
      if (sync.status === 'fehler') return `Die Änderungen an Abrechnung oder Einstellungen konnten nicht auf dem SVWS-Server gespeichert werden (${sync.fehler})`
      if (sync.status === 'konflikt') return 'Die Daten auf dem SVWS-Server wurden zwischenzeitlich geändert, und es ist noch nicht entschieden, welche gelten'
      return null
    }
    if (abrechnung.zeilen.length > 0 && abrechnung.geaendert) return 'Die Abrechnungstabelle wurde seit der letzten Sicherung geändert und noch nicht in eine Datei gesichert'
    return null
  }

  return { hatUngesichertes, offeneAenderungen }
}
