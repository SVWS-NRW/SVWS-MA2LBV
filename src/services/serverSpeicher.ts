import { getApiClient } from './apiClient'

/**
 * Ablage von Einstellungen und Abrechnungsdaten in der Client-Konfiguration des SVWS-Servers (ADR 004).
 * Endpunkte (geprüft am SVWS-Server): `GET /db/{schema}/client/config/{app}`,
 * `PUT .../{app}/user/{key}` (jeder angemeldete Benutzer), `PUT .../{app}/global/{key}` (nur Administratoren).
 * Der Wert ist ein Text; als Body wird er als JSON-String gesendet.
 */

export const APP_NAME = 'ma2lbv'
export const SCHLUESSEL_EINSTELLUNGEN = 'einstellungen'
export const SCHLUESSEL_ABRECHNUNG = 'abrechnung'

export interface Konfiguration {
  /** Eigene Werte des angemeldeten Benutzers */
  user: Map<string, string>
  /** Für alle Benutzer der Schule hinterlegte Werte */
  global: Map<string, string>
}

interface KonfigListe {
  user?: { key: string; value: string | null }[]
  global?: { key: string; value: string | null }[]
}

/** Wandelt die Antwort von `GET /client/config/{app}` in zwei Maps; leere Werte entfallen. */
export function liesKonfiguration(data: KonfigListe | null | undefined): Konfiguration {
  const map = (liste?: { key: string; value: string | null }[]) =>
    new Map((liste ?? []).filter(e => typeof e.value === 'string' && e.value !== '').map(e => [e.key, e.value as string]))
  return { user: map(data?.user), global: map(data?.global) }
}

export async function ladeKonfiguration(): Promise<Konfiguration> {
  const { data } = await getApiClient().get<KonfigListe>(`/client/config/${APP_NAME}`)
  return liesKonfiguration(data)
}

export async function schreibeBenutzerwert(schluessel: string, text: string): Promise<void> {
  await getApiClient().put(`/client/config/${APP_NAME}/user/${schluessel}`, JSON.stringify(text), { headers: { 'Content-Type': 'application/json' } })
}

/** Erfordert Administratorrechte; sonst antwortet der Server mit 403. */
export async function schreibeGlobalwert(schluessel: string, text: string): Promise<void> {
  await getApiClient().put(`/client/config/${APP_NAME}/global/${schluessel}`, JSON.stringify(text), { headers: { 'Content-Type': 'application/json' } })
}
