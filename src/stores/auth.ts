import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createApiClient, destroyApiClient } from '@/services/apiClient'
import { loadSchulstammdaten } from '@/services/svwsService'
import { useEinstellungenStore } from './einstellungen'

export interface AuthConfig {
  baseUrl: string
  schema: string
  username: string
  password: string
}

/** Zugangsdaten bleiben ausschließlich im Arbeitsspeicher (ADR 001, E4). */
export const useAuthStore = defineStore('auth', () => {
  const baseUrl = ref('')
  const schema = ref('')
  const username = ref('')
  const schulnummer = ref('')
  const schulformKuerzel = ref('')
  const _connected = ref(false)
  const _offline = ref(false)

  const isConnected = computed(() => _connected.value)
  /** Arbeiten ohne SVWS-Verbindung (CSV-Import und manuelle Erfassung) */
  const isOffline = computed(() => _offline.value)
  const isReady = computed(() => _connected.value || _offline.value)

  async function connect(config: AuthConfig): Promise<void> {
    createApiClient(config.baseUrl, config.schema, config.username, config.password)
    try {
      const stammdaten = await loadSchulstammdaten()
      schulnummer.value = stammdaten.schulnummer
      schulformKuerzel.value = stammdaten.schulform
    } catch (e) {
      destroyApiClient()
      throw e
    }
    baseUrl.value = config.baseUrl
    schema.value = config.schema
    username.value = config.username
    _connected.value = true
    _offline.value = false
    if (schulnummer.value) useEinstellungenStore().setSchulnummerAusSvws(schulnummer.value)
  }

  function arbeitenOhneVerbindung(): void {
    _offline.value = true
  }

  function disconnect(): void {
    destroyApiClient()
    baseUrl.value = ''
    schema.value = ''
    username.value = ''
    schulnummer.value = ''
    schulformKuerzel.value = ''
    _connected.value = false
    _offline.value = false
  }

  return {
    baseUrl, schema, username, schulnummer, schulformKuerzel,
    isConnected, isOffline, isReady,
    connect, arbeitenOhneVerbindung, disconnect,
  }
})
