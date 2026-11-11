import { computed, ref, watch, type WatchStopHandle } from 'vue'
import { defineStore } from 'pinia'
import { isAxiosError } from 'axios'
import { useAbrechnungStore } from './abrechnung'
import { useEinstellungenStore } from './einstellungen'
import {
  parseAbrechnung, parseEinstellungen, STANDARD_VERHALTEN,
  type AbrechnungSnapshot, type EinstellungenSnapshot,
} from '@/models/Serverdaten'
import { LEERE_PARAMETER } from '@/models/LbvParameter'
import {
  ladeKonfiguration, schreibeBenutzerwert, schreibeGlobalwert, SCHLUESSEL_ABRECHNUNG, SCHLUESSEL_EINSTELLUNGEN,
  type Konfiguration,
} from '@/services/serverSpeicher'

/**
 * Speichert Einstellungen und Abrechnungsdaten auf dem SVWS-Server, solange eine Verbindung besteht (ADR 004).
 *
 * Ablauf: `start()` lädt beim Anmelden die Daten; danach speichern Änderungen verzögert (Entprellung).
 * Vor jedem Schreiben wird der Zeitstempel auf dem Server mit dem zuletzt bekannten verglichen, damit
 * parallele Änderungen (zweites Fenster, zweiter Rechner) nicht stillschweigend überschrieben werden.
 */

export type SyncStatus = 'aus' | 'laedt' | 'bereit' | 'wartet' | 'speichert' | 'gespeichert' | 'fehler' | 'konflikt'
export type Schluessel = 'einstellungen' | 'abrechnung'

export interface Konflikt {
  schluessel: Schluessel
  /** `start`: beim Anmelden liegen lokale und Server-Daten vor; `speichern`: der Server wurde zwischenzeitlich geändert */
  anlass: 'start' | 'speichern'
  serverAktualisiert: string
  serverZeilen: number
  lokalZeilen: number
}

export const SPEICHER_VERZOEGERUNG_MS = 1500

const KEY: Record<Schluessel, string> = { einstellungen: SCHLUESSEL_EINSTELLUNGEN, abrechnung: SCHLUESSEL_ABRECHNUNG }

export const useServerSyncStore = defineStore('serverSync', () => {
  const abrechnung = useAbrechnungStore()
  const einstellungen = useEinstellungenStore()

  const status = ref<SyncStatus>('aus')
  const fehler = ref('')
  const letzteSpeicherung = ref<Date | null>(null)
  const konflikt = ref<Konflikt | null>(null)

  const aktiv = computed(() => status.value !== 'aus')
  /** Es gibt Änderungen, die noch nicht auf dem Server liegen */
  const ungespeichert = computed(() => ['wartet', 'speichert', 'fehler', 'konflikt'].includes(status.value))

  // Nicht reaktiv: Zeitstempel des Servers, den wir zuletzt gesehen haben, und der zuletzt abgeglichene Inhalt
  const bekannt: Record<Schluessel, string> = { einstellungen: '', abrechnung: '' }
  const zuletzt: Record<Schluessel, string> = { einstellungen: '', abrechnung: '' }
  let bereit = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let laufend: Promise<void> | null = null
  let stoppen: WatchStopHandle[] = []

  // ── Inhalte und Serialisierung ─────────────────────────────────────────────

  const inhalt = (k: Schluessel): string =>
    k === 'abrechnung'
      ? JSON.stringify(abrechnung.alsArbeitsdaten())
      : JSON.stringify({ parameter: einstellungen.parameter, verhalten: einstellungen.verhalten })

  function snapshotText(k: Schluessel, aktualisiert: string): string {
    return k === 'abrechnung'
      ? JSON.stringify({ version: 1, aktualisiert, daten: abrechnung.alsArbeitsdaten() } satisfies AbrechnungSnapshot)
      : JSON.stringify({ version: 1, aktualisiert, parameter: einstellungen.parameter, verhalten: einstellungen.verhalten } satisfies EinstellungenSnapshot)
  }

  /**
   * Unveränderte Einstellungen: alle Standardwerte. Eine aus SVWS bekannte Schulnummer zählt nicht als Änderung,
   * sonst bekäme jeder Benutzer beim ersten Anmelden eine eigene Kopie und der Schulstandard käme nie an.
   */
  const standardEinstellungen = (): string => JSON.stringify({
    parameter: { ...LEERE_PARAMETER, schulnummer: einstellungen.schulnummerAusSvws ? einstellungen.parameter.schulnummer : '' },
    verhalten: STANDARD_VERHALTEN,
  })

  const hatAenderungen = (): boolean => (['einstellungen', 'abrechnung'] as Schluessel[]).some(k => inhalt(k) !== zuletzt[k])

  /** Gibt es lokal etwas, das sich zu speichern lohnt? */
  function hatLokalesZuSpeichern(k: Schluessel): boolean {
    return k === 'abrechnung' ? abrechnung.zeilen.length > 0 : inhalt('einstellungen') !== standardEinstellungen()
  }

  function wendeEinstellungenAn(s: EinstellungenSnapshot): void {
    einstellungen.uebernehme(s.parameter, s.verhalten)
    zuletzt.einstellungen = inhalt('einstellungen')
  }

  function wendeAbrechnungAn(s: AbrechnungSnapshot): void {
    abrechnung.ladeArbeitsdaten(s.daten, abrechnung.arbeitsdatei)
    zuletzt.abrechnung = inhalt('abrechnung')
  }

  function serverStempel(cfg: Konfiguration, k: Schluessel): string {
    const text = cfg.user.get(KEY[k])
    if (!text) return ''
    try {
      const x = JSON.parse(text) as { aktualisiert?: unknown }
      return typeof x.aktualisiert === 'string' ? x.aktualisiert : ''
    } catch {
      return ''
    }
  }

  function fehlerText(e: unknown): string {
    if (isAxiosError(e)) {
      if (!e.response) return 'Der SVWS-Server ist nicht erreichbar.'
      if (e.response.status === 401 || e.response.status === 403) return 'Keine Berechtigung zum Speichern auf dem SVWS-Server.'
      return `Der SVWS-Server meldet einen Fehler (${e.response.status}).`
    }
    return e instanceof Error ? e.message : 'Unbekannter Fehler beim Zugriff auf den SVWS-Server.'
  }

  // ── Start ──────────────────────────────────────────────────────────────────

  /** Lädt Einstellungen und Abrechnungsdaten vom Server. Schlägt das fehl, bleibt die Arbeit lokal möglich. */
  async function start(): Promise<void> {
    beendeIntern()
    status.value = 'laedt'
    fehler.value = ''
    konflikt.value = null
    bereit = false
    try {
      const cfg = await ladeKonfiguration()

      // Einstellungen: eigene Werte, sonst der Schulstandard (global)
      const eigene = parseEinstellungen(cfg.user.get(KEY.einstellungen))
      const standard = parseEinstellungen(cfg.global.get(KEY.einstellungen))
      if (eigene) {
        bekannt.einstellungen = eigene.aktualisiert
        wendeEinstellungenAn(eigene)
      } else if (standard) {
        bekannt.einstellungen = ''
        wendeEinstellungenAn(standard) // wird nicht als eigene Kopie gespeichert, bis der Benutzer etwas ändert
      } else {
        // Der Server kennt noch nichts: nur hochladen, wenn lokal etwas eingetragen wurde
        bekannt.einstellungen = ''
        zuletzt.einstellungen = hatLokalesZuSpeichern('einstellungen') ? '' : inhalt('einstellungen')
      }

      // Abrechnungsdaten
      const server = parseAbrechnung(cfg.user.get(KEY.abrechnung))
      bekannt.abrechnung = server?.aktualisiert ?? ''
      zuletzt.abrechnung = hatLokalesZuSpeichern('abrechnung') || server ? '' : inhalt('abrechnung')
      if (server) {
        if (abrechnung.zeilen.length === 0) {
          wendeAbrechnungAn(server)
        } else {
          konflikt.value = {
            schluessel: 'abrechnung', anlass: 'start', serverAktualisiert: server.aktualisiert,
            serverZeilen: server.daten.zeilen.length, lokalZeilen: abrechnung.zeilen.length,
          }
        }
      }
    } catch (e) {
      console.error('[server]', e)
      status.value = 'fehler'
      fehler.value = `Daten konnten nicht vom SVWS-Server geladen werden. ${fehlerText(e)}`
      return
    }

    bereit = true
    stoppen = [
      watch(() => abrechnung.stand, planeSpeichern),
      watch(() => einstellungen.parameter, planeSpeichern, { deep: true }),
      watch(() => einstellungen.verhalten, planeSpeichern, { deep: true }),
    ]
    if (konflikt.value) {
      status.value = 'konflikt'
      return
    }
    status.value = 'bereit'
    // Lokales, das der Server noch nicht kennt (z. B. zuvor ohne Verbindung erfasste Einstellungen), hochladen
    if ((['einstellungen', 'abrechnung'] as Schluessel[]).some(k => zuletzt[k] !== inhalt(k) && hatLokalesZuSpeichern(k))) planeSpeichern()
    else status.value = 'gespeichert'
  }

  // ── Speichern ──────────────────────────────────────────────────────────────

  function planeSpeichern(): void {
    if (!bereit || konflikt.value) return
    // Nichts zu tun (z. B. direkt nach dem Laden vom Server): Status nicht auf "wartet" ändern
    if (!hatAenderungen()) return
    status.value = 'wartet'
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { void speichereJetzt() }, SPEICHER_VERZOEGERUNG_MS)
  }

  /**
   * Schreibt alle geänderten Datensätze sofort und wartet, bis der Vorgang abgeschlossen ist.
   * Läuft bereits ein Speichervorgang, wird dessen Ende abgewartet und danach bei Bedarf erneut geschrieben.
   */
  async function speichereJetzt(): Promise<void> {
    if (!bereit || konflikt.value) return
    if (timer) { clearTimeout(timer); timer = null }
    if (laufend) {
      await laufend
      if (bereit && !konflikt.value && status.value !== 'fehler' && hatAenderungen()) await speichereJetzt()
      return
    }
    laufend = schreibeEinmal().finally(() => { laufend = null })
    await laufend
  }

  async function schreibeEinmal(): Promise<void> {
    status.value = 'speichert'
    fehler.value = ''
    try {
      const offene = (['einstellungen', 'abrechnung'] as Schluessel[]).filter(k => inhalt(k) !== zuletzt[k])
      if (offene.length > 0) {
        const cfg = await ladeKonfiguration()
        for (const k of offene) {
          const stempel = serverStempel(cfg, k)
          if (stempel !== bekannt[k]) {
            const server = k === 'abrechnung' ? parseAbrechnung(cfg.user.get(KEY.abrechnung)) : null
            konflikt.value = {
              schluessel: k, anlass: 'speichern', serverAktualisiert: stempel || '–',
              serverZeilen: server?.daten.zeilen.length ?? 0, lokalZeilen: abrechnung.zeilen.length,
            }
            status.value = 'konflikt'
            return
          }
        }
        for (const k of offene) {
          const jetzt = new Date().toISOString()
          const gesendet = inhalt(k)
          await schreibeBenutzerwert(KEY[k], snapshotText(k, jetzt))
          bekannt[k] = jetzt
          zuletzt[k] = gesendet
        }
      }
      letzteSpeicherung.value = new Date()
      // Während des Schreibens kann schon wieder etwas geändert worden sein
      if (hatAenderungen()) planeSpeichern()
      else status.value = 'gespeichert'
    } catch (e) {
      console.error('[server]', e)
      status.value = 'fehler'
      fehler.value = fehlerText(e)
    }
  }

  // ── Konflikt auflösen ──────────────────────────────────────────────────────

  /** Die Serverdaten gelten; die lokalen Daten dieses Datensatzes werden ersetzt. */
  async function konfliktMitServerLoesen(): Promise<void> {
    const k = konflikt.value
    if (!k) return
    try {
      const cfg = await ladeKonfiguration()
      if (k.schluessel === 'abrechnung') {
        const s = parseAbrechnung(cfg.user.get(KEY.abrechnung))
        if (s) { wendeAbrechnungAn(s); bekannt.abrechnung = s.aktualisiert }
      } else {
        const s = parseEinstellungen(cfg.user.get(KEY.einstellungen))
        if (s) { wendeEinstellungenAn(s); bekannt.einstellungen = s.aktualisiert }
      }
      konflikt.value = null
      status.value = 'gespeichert'
      planeSpeichern() // übrige Datensätze, die noch nicht auf dem Server liegen
    } catch (e) {
      status.value = 'fehler'
      fehler.value = fehlerText(e)
    }
  }

  /** Die lokalen Daten gelten; der Stand auf dem Server wird überschrieben. */
  async function konfliktMitLokalLoesen(): Promise<void> {
    const k = konflikt.value
    if (!k) return
    try {
      const cfg = await ladeKonfiguration()
      bekannt[k.schluessel] = serverStempel(cfg, k.schluessel)
      zuletzt[k.schluessel] = ''
      konflikt.value = null
      await speichereJetzt()
    } catch (e) {
      status.value = 'fehler'
      fehler.value = fehlerText(e)
    }
  }

  /** Erneuter Versuch nach einem Fehler: vollständiges Laden, falls es beim Start scheiterte, sonst Speichern. */
  async function neuVersuchen(): Promise<void> {
    if (!bereit) await start()
    else await speichereJetzt()
  }

  // ── Schulstandard (Administratoren) ────────────────────────────────────────

  /** Legt die Einstellungen als Standard für alle Benutzer der Schule ab. Erfordert Administratorrechte. */
  async function speichereSchulstandard(): Promise<void> {
    try {
      await schreibeGlobalwert(KEY.einstellungen, snapshotText('einstellungen', new Date().toISOString()))
    } catch (e) {
      if (isAxiosError(e) && (e.response?.status === 403 || e.response?.status === 401)) {
        throw new Error('Nur Administratoren dürfen den Schulstandard festlegen.')
      }
      throw new Error(fehlerText(e))
    }
  }

  // ── Ende ───────────────────────────────────────────────────────────────────

  function beendeIntern(): void {
    for (const s of stoppen) s()
    stoppen = []
    if (timer) { clearTimeout(timer); timer = null }
  }

  /** Speichert offene Änderungen und beendet die Synchronisierung (beim Abmelden). */
  async function beende(): Promise<void> {
    if (bereit && !konflikt.value) await speichereJetzt()
    beendeIntern()
    bereit = false
    konflikt.value = null
    status.value = 'aus'
    fehler.value = ''
    letzteSpeicherung.value = null
  }

  return {
    status, fehler, letzteSpeicherung, konflikt, aktiv, ungespeichert,
    start, speichereJetzt, neuVersuchen, konfliktMitServerLoesen, konfliktMitLokalLoesen, speichereSchulstandard, beende,
  }
})
