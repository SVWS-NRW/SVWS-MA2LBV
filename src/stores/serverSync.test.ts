// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// Einfacher Server im Speicher, ersetzt die REST-Aufrufe
const server = { user: new Map<string, string>(), global: new Map<string, string>(), ausfall: false, verbotenGlobal: false, schreibzugriffe: 0 }
vi.mock('@/services/serverSpeicher', async () => {
  const echt = await vi.importActual<typeof import('@/services/serverSpeicher')>('@/services/serverSpeicher')
  const fehler = (status?: number) => Object.assign(new Error('x'), { isAxiosError: true, response: status ? { status } : undefined })
  return {
    ...echt,
    ladeKonfiguration: async () => {
      if (server.ausfall) throw fehler()
      return { user: new Map(server.user), global: new Map(server.global) }
    },
    schreibeBenutzerwert: async (k: string, t: string) => { if (server.ausfall) throw fehler(); server.schreibzugriffe++; server.user.set(k, t) },
    schreibeGlobalwert: async (k: string, t: string) => { if (server.verbotenGlobal) throw fehler(403); server.global.set(k, t) },
  }
})

import { useAbrechnungStore } from './abrechnung'
import { useEinstellungenStore } from './einstellungen'
import { SPEICHER_VERZOEGERUNG_MS, useServerSyncStore } from './serverSync'
import { leseAbrechnung } from '@/services/csvImport'

const csv = [
  'Nachname,Vorname,Geburtsdatum,Personalnummer,Status,Schlüssel,Monat,Stunden,Merkmal',
  ...['816', '916', '1016', '1116', '1216', '117'].map(m => `Byran,Augusta,10.09.1981,B 0312222,V,1,${m},3,`),
].join('\n')
const warte = (ms = SPEICHER_VERZOEGERUNG_MS + 100) => vi.advanceTimersByTimeAsync(ms)
const abrechnungOnServer = () => JSON.parse(server.user.get('abrechnung')!)

function stores() {
  return { sync: useServerSyncStore(), abr: useAbrechnungStore(), ein: useEinstellungenStore() }
}

describe('Speicherung auf dem SVWS-Server', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
    vi.useFakeTimers()
    server.user.clear(); server.global.clear()
    server.ausfall = false; server.verbotenGlobal = false; server.schreibzugriffe = 0
    setActivePinia(createPinia())
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('lädt Einstellungen und Abrechnungsdaten beim Start', async () => {
    const a = stores()
    a.abr.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    a.ein.parameter.aktenzeichen = 'AZ 4711'
    a.sync.start() // schreibt nichts, solange der Server keine Daten hat und nichts zu laden ist
    await warte()
    await a.sync.speichereJetzt()
    expect(abrechnungOnServer().daten.zeilen).toHaveLength(1)
    await a.sync.beende()

    // frische Sitzung (leere Stores) lädt den Stand vom Server
    setActivePinia(createPinia())
    const b = stores()
    await b.sync.start()
    expect(b.abr.zeilen).toHaveLength(1)
    expect(b.abr.zeilen[0].nachname).toBe('Byran')
    expect(b.abr.monate[0]).toBe('16/08')
    expect(b.ein.parameter.aktenzeichen).toBe('AZ 4711')
    expect(b.sync.status).toBe('gespeichert')
    expect(b.sync.konflikt).toBeNull()
  })

  it('speichert Änderungen verzögert und gebündelt', async () => {
    const { sync, abr } = stores()
    await sync.start()
    abr.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    await warte(0) // Vue-Watcher laufen asynchron
    expect(sync.status).toBe('wartet')
    abr.zeilen[0].nachname = 'Neu'
    abr.zelleGeaendert()
    await warte(SPEICHER_VERZOEGERUNG_MS - 200)
    expect(server.schreibzugriffe).toBe(0)
    await warte(500)
    expect(server.schreibzugriffe).toBe(1) // nur ein Schreibvorgang für beide Änderungen
    expect(abrechnungOnServer().daten.zeilen[0].nachname).toBe('Neu')
    expect(sync.status).toBe('gespeichert')
    expect(sync.ungespeichert).toBe(false)
    expect(sync.letzteSpeicherung).toBeInstanceOf(Date)
  })

  it('schreibt unveränderte Daten nicht erneut', async () => {
    const { sync, abr } = stores()
    await sync.start()
    abr.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    await warte()
    const n = server.schreibzugriffe
    abr.aenderung() // keine inhaltliche Änderung
    await warte()
    expect(server.schreibzugriffe).toBe(n)
  })

  it('übernimmt den Schulstandard, speichert ihn aber nicht als eigene Kopie', async () => {
    server.global.set('einstellungen', JSON.stringify({ version: 1, aktualisiert: '2026-01-01T00:00:00Z', parameter: { schulnummer: '123456', aktenzeichen: 'Standard' }, verhalten: {} }))
    const { sync, ein } = stores()
    await sync.start()
    await warte()
    expect(ein.parameter.aktenzeichen).toBe('Standard')
    expect(server.user.has('einstellungen')).toBe(false)
    ein.parameter.aktenzeichen = 'Eigenes'
    await warte()
    expect(JSON.parse(server.user.get('einstellungen')!).parameter.aktenzeichen).toBe('Eigenes')
  })

  it('legt keine eigene Kopie an, wenn nur die Schulnummer aus SVWS stammt (Schulstandard bleibt wirksam)', async () => {
    const { sync, ein } = stores()
    ein.setSchulnummerAusSvws('123456')
    await sync.start()
    await warte()
    expect(server.user.has('einstellungen')).toBe(false)
    expect(sync.status).toBe('gespeichert')
  })

  it('lädt lokal erfasste Einstellungen hoch, wenn der Server noch keine hat', async () => {
    const { sync, ein } = stores()
    ein.parameter.bearbeiter = 'Anna'
    await sync.start()
    await warte()
    expect(JSON.parse(server.user.get('einstellungen')!).parameter.bearbeiter).toBe('Anna')
  })

  it('meldet einen Konflikt beim Start, wenn lokale und Serverdaten vorliegen', async () => {
    const a = stores()
    a.abr.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    await a.sync.start(); await warte(); await a.sync.beende()

    setActivePinia(createPinia())
    const b = stores()
    b.abr.fuegeZeileEin(); b.abr.fuegeZeileEin()
    await b.sync.start()
    expect(b.sync.status).toBe('konflikt')
    expect(b.sync.konflikt).toMatchObject({ schluessel: 'abrechnung', anlass: 'start', serverZeilen: 1, lokalZeilen: 2 })
    b.abr.zeilen[0].nachname = 'x'; b.abr.zelleGeaendert()
    await warte()
    expect(abrechnungOnServer().daten.zeilen).toHaveLength(1) // solange der Konflikt offen ist, wird nichts überschrieben
    await b.sync.konfliktMitServerLoesen()
    expect(b.abr.zeilen).toHaveLength(1)
    expect(b.abr.zeilen[0].nachname).toBe('Byran')
    expect(b.sync.konflikt).toBeNull()
  })

  it('erkennt Änderungen auf dem Server und lässt die Wahl: Lokal behalten überschreibt', async () => {
    const { sync, abr } = stores()
    abr.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    await sync.start(); await warte()
    // jemand anderes speichert (z. B. zweites Fenster)
    const fremd = abrechnungOnServer(); fremd.aktualisiert = '2099-01-01T00:00:00.000Z'; fremd.daten.zeilen[0].nachname = 'Fremd'
    server.user.set('abrechnung', JSON.stringify(fremd))
    abr.zeilen[0].nachname = 'Lokal'; abr.zelleGeaendert()
    await warte()
    expect(sync.status).toBe('konflikt')
    expect(sync.konflikt).toMatchObject({ anlass: 'speichern', serverAktualisiert: '2099-01-01T00:00:00.000Z' })
    expect(abrechnungOnServer().daten.zeilen[0].nachname).toBe('Fremd')
    await sync.konfliktMitLokalLoesen()
    expect(abrechnungOnServer().daten.zeilen[0].nachname).toBe('Lokal')
    expect(sync.status).toBe('gespeichert')
  })

  it('Konflikt auflösen mit Serverdaten übernimmt den fremden Stand', async () => {
    const { sync, abr } = stores()
    abr.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    await sync.start(); await warte()
    const fremd = abrechnungOnServer(); fremd.aktualisiert = '2099-01-01T00:00:00.000Z'; fremd.daten.zeilen[0].nachname = 'Fremd'
    server.user.set('abrechnung', JSON.stringify(fremd))
    abr.zeilen[0].nachname = 'Lokal'; abr.zelleGeaendert(); await warte()
    await sync.konfliktMitServerLoesen()
    expect(abr.zeilen[0].nachname).toBe('Fremd')
    await warte()
    expect(sync.status).toBe('gespeichert')
    expect(abrechnungOnServer().daten.zeilen[0].nachname).toBe('Fremd')
  })

  it('meldet Netzwerkfehler und versucht es beim nächsten Speichern erneut', async () => {
    const { sync, abr } = stores()
    await sync.start()
    server.ausfall = true
    abr.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    await warte()
    expect(sync.status).toBe('fehler')
    expect(sync.fehler).toContain('nicht erreichbar')
    expect(sync.ungespeichert).toBe(true)
    server.ausfall = false
    await sync.speichereJetzt()
    expect(sync.status).toBe('gespeichert')
    expect(abrechnungOnServer().daten.zeilen).toHaveLength(1)
  })

  it('überschreibt bei einem Ladefehler beim Start nichts auf dem Server', async () => {
    server.user.set('abrechnung', JSON.stringify({ version: 1, aktualisiert: 'x', daten: {} })) // beschädigt
    const { sync, abr } = stores()
    abr.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    await sync.start()
    expect(sync.status).toBe('fehler')
    abr.zeilen[0].nachname = 'Z'; abr.zelleGeaendert()
    await warte()
    expect(server.schreibzugriffe).toBe(0)
  })

  it('speichert beim Abmelden offene Änderungen und beendet die Synchronisierung', async () => {
    const { sync, abr } = stores()
    await sync.start()
    abr.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    await sync.beende()
    expect(abrechnungOnServer().daten.zeilen).toHaveLength(1)
    expect(sync.status).toBe('aus')
    abr.zeilen[0].nachname = 'danach'; abr.zelleGeaendert()
    await warte()
    expect(abrechnungOnServer().daten.zeilen[0].nachname).toBe('Byran')
  })

  it('Schulstandard: nur Administratoren', async () => {
    const { sync, ein } = stores()
    await sync.start()
    ein.parameter.aktenzeichen = 'Schule'
    await sync.speichereSchulstandard()
    expect(JSON.parse(server.global.get('einstellungen')!).parameter.aktenzeichen).toBe('Schule')
    server.verbotenGlobal = true
    await expect(sync.speichereSchulstandard()).rejects.toThrow('Nur Administratoren')
  })
})

describe('Speichern wartet auf laufende Vorgänge', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
    vi.useFakeTimers()
    server.user.clear(); server.global.clear(); server.ausfall = false
    setActivePinia(createPinia())
  })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  it('zwei gleichzeitige Aufrufe schreiben den letzten Stand und melden erst danach "gespeichert"', async () => {
    const { sync, abr } = stores()
    await sync.start()
    abr.uebernehmeImport(leseAbrechnung(csv), 'test.txt')
    await warte(0)
    const a = sync.speichereJetzt()
    abr.zeilen[0].nachname = 'Spaet'; abr.zelleGeaendert()
    const b = sync.speichereJetzt()
    await Promise.all([a, b])
    await warte()
    expect(abrechnungOnServer().daten.zeilen[0].nachname).toBe('Spaet')
    expect(sync.status).toBe('gespeichert')
    expect(sync.ungespeichert).toBe(false)
  })

  it('Abmelden (beende) speichert auch Einstellungen und löscht danach nichts am Server', async () => {
    const { sync, ein } = stores()
    await sync.start()
    ein.parameter.bearbeiter = 'Anna'
    await sync.beende()
    expect(JSON.parse(server.user.get('einstellungen')!).parameter.bearbeiter).toBe('Anna')
    expect(sync.status).toBe('aus')
  })
})
