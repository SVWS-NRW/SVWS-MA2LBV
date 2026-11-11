// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const server = { user: new Map<string, string>(), ausfall: false }
vi.mock('@/services/serverSpeicher', async () => {
  const echt = await vi.importActual<typeof import('@/services/serverSpeicher')>('@/services/serverSpeicher')
  const fehler = () => Object.assign(new Error('x'), { isAxiosError: true, response: undefined })
  return {
    ...echt,
    ladeKonfiguration: async () => { if (server.ausfall) throw fehler(); return { user: new Map(server.user), global: new Map() } },
    schreibeBenutzerwert: async (k: string, t: string) => { if (server.ausfall) throw fehler(); server.user.set(k, t) },
  }
})

vi.mock('@/services/apiClient', () => ({ createApiClient: () => {}, destroyApiClient: () => {}, getApiClient: () => { throw new Error('nicht verwendet') } }))
vi.mock('@/services/svwsService', () => ({ loadSchulstammdaten: async () => ({ schulnummer: '123456', schulform: 'GE', idSchuljahresabschnitt: 1 }) }))

import { useAbrechnungStore } from '@/stores/abrechnung'
import { useAuthStore } from '@/stores/auth'
import { useEinstellungenStore } from '@/stores/einstellungen'
import { SPEICHER_VERZOEGERUNG_MS, useServerSyncStore } from '@/stores/serverSync'
import { leseAbrechnung } from '@/services/csvImport'
import { useUngespeichert } from './useUngespeichert'

const csv = [
  'Nachname,Vorname,Geburtsdatum,Personalnummer,Status,Schlüssel,Monat,Stunden,Merkmal',
  ...['816', '916', '1016', '1116', '1216', '117'].map(m => `Byran,Augusta,10.09.1981,B 0312222,V,1,${m},3,`),
].join('\n')
const warte = (ms = SPEICHER_VERZOEGERUNG_MS + 100) => vi.advanceTimersByTimeAsync(ms)

/** Meldet wirklich an (Netzwerkaufrufe sind gemockt), damit `isConnected` gilt. */
async function verbinden(auth: ReturnType<typeof useAuthStore>) {
  await auth.connect({ baseUrl: 'https://svws.example', schema: 'test', username: 'u', password: 'p' })
}

describe('Ungesicherte Änderungen', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
    vi.useFakeTimers()
    server.user.clear(); server.ausfall = false
    setActivePinia(createPinia())
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('ohne Verbindung zählt nur die Abrechnungstabelle, Einstellungen nicht (liegen im Browser)', async () => {
    const abr = useAbrechnungStore()
    const ein = useEinstellungenStore()
    const u = useUngespeichert()
    expect(u.hatUngesichertes()).toBe(false)
    ein.parameter.aktenzeichen = 'AZ'
    await warte(0)
    expect(u.hatUngesichertes()).toBe(false)
    abr.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    expect(u.hatUngesichertes()).toBe(true)
    expect(await u.offeneAenderungen()).toContain('Abrechnungstabelle')
    abr.alsGesichert('stand.ma2lbv')
    expect(u.hatUngesichertes()).toBe(false)
    expect(await u.offeneAenderungen()).toBeNull()
  })

  it('mit Verbindung: wartende Änderungen werden vor der Auskunft gespeichert, auch Einstellungen', async () => {
    const auth = useAuthStore(); await verbinden(auth)
    const sync = useServerSyncStore()
    const ein = useEinstellungenStore()
    const u = useUngespeichert()
    await sync.start()
    ein.parameter.aktenzeichen = 'Neu'
    await warte(0)
    expect(sync.status).toBe('wartet')
    expect(u.hatUngesichertes()).toBe(true) // Einstellungen zählen mit
    const offen = u.offeneAenderungen()
    await warte(10)
    expect(await offen).toBeNull()
    expect(JSON.parse(server.user.get('einstellungen')!).parameter.aktenzeichen).toBe('Neu')
    expect(u.hatUngesichertes()).toBe(false)
  })

  it('mit Verbindung: Speicherfehler und Konflikt werden gemeldet', async () => {
    const auth = useAuthStore(); await verbinden(auth)
    const sync = useServerSyncStore()
    const abr = useAbrechnungStore()
    const u = useUngespeichert()
    await sync.start()
    server.ausfall = true
    abr.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    await warte(0)
    const frage = u.offeneAenderungen()
    await warte(10)
    expect(await frage).toContain('nicht auf dem SVWS-Server gespeichert werden')
    expect(u.hatUngesichertes()).toBe(true)
  })
})
