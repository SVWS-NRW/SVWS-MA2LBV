import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { LEERE_PARAMETER, type LbvParameter, type Verhalten } from '@/models/LbvParameter'

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
  const start = laden()
  const parameter = ref<LbvParameter>(start.parameter)
  const verhalten = ref<Verhalten>(start.verhalten)
  /** Schulnummer stammt aus SVWS und ist dann nicht editierbar */
  const schulnummerAusSvws = ref(false)

  watch([parameter, verhalten], () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ parameter: parameter.value, verhalten: verhalten.value }))
  }, { deep: true })

  function setSchulnummerAusSvws(nr: string): void {
    parameter.value.schulnummer = nr
    schulnummerAusSvws.value = true
  }

  return { parameter, verhalten, schulnummerAusSvws, setSchulnummerAusSvws }
})
