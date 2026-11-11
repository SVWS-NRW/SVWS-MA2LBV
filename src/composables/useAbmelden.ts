import { useRouter } from 'vue-router'
import { useAbrechnungStore } from '@/stores/abrechnung'
import { useAuthStore } from '@/stores/auth'
import { useEinstellungenStore } from '@/stores/einstellungen'
import { useServerSyncStore } from '@/stores/serverSync'
import { useBestaetigung } from './useBestaetigung'
import { useUngespeichert } from './useUngespeichert'

/**
 * Abmelden bzw. Verlassen des Programms ohne Verbindung (ADR 004):
 * wartende Änderungen speichern, bei ungesicherten Änderungen nachfragen und danach **alle Daten aus dem
 * Speicher entfernen**, damit die nächste Person im selben Fenster sie weder sieht noch auf ihr Konto überträgt.
 */
export function useAbmelden() {
  const router = useRouter()
  const auth = useAuthStore()
  const sync = useServerSyncStore()
  const abrechnung = useAbrechnungStore()
  const einstellungen = useEinstellungenStore()
  const { offeneAenderungen } = useUngespeichert()
  const frage = useBestaetigung()

  /** Liefert `false`, wenn die Person die Rückfrage abbricht. */
  async function abmelden(): Promise<boolean> {
    const mitServer = auth.isConnected
    const offen = await offeneAenderungen()
    if (offen) {
      const ja = await frage({
        titel: 'Abmelden?',
        text: `${offen}. Beim Abmelden werden alle Daten aus dem Programm entfernt, diese Änderungen gehen verloren.`,
        ja: 'Trotzdem abmelden',
        nein: 'Abbrechen',
        gefaehrlich: true,
      })
      if (!ja) return false
    }
    await sync.beende()
    abrechnung.zuruecksetzen()
    // Einstellungen: mit Server liegen sie dort; ohne Verbindung sind sie die einzige Kopie im Browser und bleiben
    if (mitServer) einstellungen.zuruecksetzen()
    auth.disconnect()
    await router.push({ name: 'connect' })
    return true
  }

  return { abmelden }
}
