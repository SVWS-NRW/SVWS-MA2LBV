import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { LEERE_PARAMETER, type LbvParameter, type Verhalten } from '@/models/LbvParameter'
import { STANDARD_VERHALTEN } from '@/models/Serverdaten'

const STORAGE_KEY = 'svws-ma2lbv-formulardaten'

interface Gespeichert {
  parameter: LbvParameter
  verhalten: Verhalten
}

function laden(): Gespeichert {
  const standard: Gespeichert = {
    parameter: { ...LEERE_PARAMETER },
    verhalten: { merkmalAutomatisch: true, spaltenfilter: false },
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return standard
    const data = JSON.parse(raw) as Partial<Gespeichert>
    return {
      parameter: { ...standard.parameter, ...data.parameter },
      verhalten: { ...standard.verhalten, ...data.verhalten },
    }
  } catch {
    return standard
  }
}

/**
 * Formulardaten der Schule und Verhalten der Oberfläche (ADR 001, E5).
 * Enthält keine Zugangsdaten und keine Mehrarbeitsdaten von Lehrkräften.
 */
export const useEinstellungenStore = defineStore('einstellungen', () => {
  // Beim Start stehen immer die Standardwerte im Speicher. Eine lokale Kopie im Browser gibt es nur im Betrieb
  // ohne SVWS-Verbindung (`ladeLokal`); mit Verbindung gelten ausschließlich die Daten vom Server (ADR 004).
  const parameter = ref<LbvParameter>({ ...LEERE_PARAMETER })
  const verhalten = ref<Verhalten>({ ...STANDARD_VERHALTEN })
  /** Schulnummer stammt aus SVWS und ist dann nicht editierbar */
  const schulnummerAusSvws = ref(false)
  /** Nur ohne Serververbindung: Änderungen werden im Browser (localStorage) abgelegt */
  const lokalAktiv = ref(false)

  watch([parameter, verhalten], () => {
    if (lokalAktiv.value) localStorage.setItem(STORAGE_KEY, JSON.stringify({ parameter: parameter.value, verhalten: verhalten.value }))
  }, { deep: true })

  /** Betrieb ohne Verbindung: gespeicherte lokale Einstellungen laden und künftig dort ablegen. */
  function ladeLokal(): void {
    const l = laden()
    parameter.value = l.parameter
    verhalten.value = l.verhalten
    schulnummerAusSvws.value = false
    lokalAktiv.value = true
  }

  /**
   * Anmeldung am Server: Standardwerte setzen und die lokale Kopie im Browser löschen, damit keine Daten
   * einer anderen Schule, eines anderen Schemas oder Benutzers hineingelangen oder auf den Server geschrieben werden.
   */
  function fuerServerVorbereiten(): void {
    lokalAktiv.value = false
    parameter.value = { ...LEERE_PARAMETER }
    verhalten.value = { ...STANDARD_VERHALTEN }
    schulnummerAusSvws.value = false
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* nicht verfügbar */ }
  }

  function setSchulnummerAusSvws(nr: string): void {
    parameter.value.schulnummer = nr
    schulnummerAusSvws.value = true
  }

  /** Übernimmt Einstellungen vom Server. Eine aus SVWS bekannte Schulnummer bleibt erhalten. */
  function uebernehme(neu: LbvParameter, neuesVerhalten: Verhalten): void {
    const schulnummer = parameter.value.schulnummer
    parameter.value = { ...neu, schulnummer: schulnummerAusSvws.value ? schulnummer : neu.schulnummer }
    verhalten.value = { ...neuesVerhalten }
  }

  /** Setzt alle Einstellungen im Speicher auf die Standardwerte (beim Abmelden einer Serververbindung). */
  function zuruecksetzen(): void {
    lokalAktiv.value = false
    parameter.value = { ...LEERE_PARAMETER }
    verhalten.value = { ...STANDARD_VERHALTEN }
    schulnummerAusSvws.value = false
  }

  return { parameter, verhalten, schulnummerAusSvws, setSchulnummerAusSvws, uebernehme, zuruecksetzen, ladeLokal, fuerServerVorbereiten }
})
