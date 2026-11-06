import { getApiClient, getRootClient } from './apiClient'
import type { Lehrkraft } from '@/models/Lehrkraft'
import {
  baueLehrkraefte, filtereLehrkraefte, katalogSchluessel,
  type SvwsKatalog, type SvwsLehrerListeEintrag, type SvwsLehrerPersonaldaten, type SvwsLehrerStammdaten,
} from './lehrkraftMapper'

export interface Schulstammdaten {
  schulnummer: string
  schulform: string
  /** Aktueller Schuljahresabschnitt der Schule */
  idSchuljahresabschnitt: number
}

/** Liest die Stammdaten der eigenen Schule (Schulnummer zur Vorbelegung der Einstellungen). */
export async function loadSchulstammdaten(): Promise<Schulstammdaten> {
  const { data } = await getApiClient().get('/schule/stammdaten')
  return {
    schulnummer: data.schulNr != null ? String(data.schulNr) : '',
    schulform: data.schulform ?? '',
    idSchuljahresabschnitt: data.idSchuljahresabschnitt,
  }
}

/** Führt `fn` für alle Einträge mit begrenzter Parallelität aus. */
async function parallel<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }))
  return out
}

/**
 * Lädt die sichtbaren Lehrkräfte mit den für die Änderungsmitteilung nötigen Daten
 * (Ersatz für `GetSchILDDicLehrer` aus MA2, ADR 003, 4.10).
 *
 * Endpunkte: `GET /lehrer`, `POST /lehrer/stammdaten`, `GET /lehrer/{id}/personaldaten`,
 * `GET /types/LehrerRechtsverhaeltnis.json`, `GET /types/LehrerBeschaeftigungsart.json`.
 */
export async function loadLehrkraefte(idAbschnitt: number): Promise<Lehrkraft[]> {
  const client = getApiClient()
  const { data: liste } = await client.get<SvwsLehrerListeEintrag[]>('/lehrer')
  const lehrer = filtereLehrkraefte(liste)
  if (lehrer.length === 0) return []
  const ids = lehrer.map(l => l.id)

  const [stammdaten, rv, ba, personaldaten] = await Promise.all([
    client.post<SvwsLehrerStammdaten[]>('/lehrer/stammdaten', ids).then(r => r.data),
    getRootClient().get<SvwsKatalog>('/types/LehrerRechtsverhaeltnis.json').then(r => katalogSchluessel(r.data)),
    getRootClient().get<SvwsKatalog>('/types/LehrerBeschaeftigungsart.json').then(r => katalogSchluessel(r.data)),
    parallel(ids, 8, id => client.get<SvwsLehrerPersonaldaten>(`/lehrer/${id}/personaldaten`).then(r => r.data)),
  ])
  return baueLehrkraefte(lehrer, stammdaten, personaldaten, rv, ba, idAbschnitt)
    .sort((a, b) => a.nachname.localeCompare(b.nachname, 'de') || a.vorname.localeCompare(b.vorname, 'de'))
}
