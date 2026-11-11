// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useEinstellungenStore } from './einstellungen'

const KEY = 'svws-ma2lbv-formulardaten'

describe('Einstellungen: lokale Kopie nur ohne Serververbindung', () => {
  let speicher: Map<string, string>
  beforeEach(() => {
    speicher = new Map([[KEY, JSON.stringify({ parameter: { dienststelle: 'Alte Schule (gesa)', schulnummer: '111111' }, verhalten: { merkmalAutomatisch: false } })]])
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => speicher.get(k) ?? null,
      setItem: (k: string, v: string) => { speicher.set(k, v) },
      removeItem: (k: string) => { speicher.delete(k) },
    })
    setActivePinia(createPinia())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('beim Start stehen Standardwerte im Speicher, die lokale Kopie wird nicht gelesen', () => {
    const e = useEinstellungenStore()
    expect(e.parameter.dienststelle).toBe('')
    expect(e.verhalten.merkmalAutomatisch).toBe(true)
  })

  it('ohne Verbindung wird die lokale Kopie geladen und weiter gespeichert', async () => {
    const e = useEinstellungenStore()
    e.ladeLokal()
    expect(e.parameter.dienststelle).toBe('Alte Schule (gesa)')
    e.parameter.dienststelle = 'Neu'
    await nextTick()
    expect(JSON.parse(speicher.get(KEY)!).parameter.dienststelle).toBe('Neu')
  })

  it('bei der Anmeldung am Server werden lokale Kopie und Speicher verworfen und nichts mehr lokal geschrieben', async () => {
    const e = useEinstellungenStore()
    e.ladeLokal()
    e.fuerServerVorbereiten()
    expect(e.parameter.dienststelle).toBe('')
    expect(speicher.has(KEY)).toBe(false)
    e.parameter.dienststelle = 'Server-Daten'
    await nextTick()
    expect(speicher.has(KEY)).toBe(false)
  })
})
