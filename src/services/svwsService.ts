import { getApiClient } from './apiClient'

export interface Schulstammdaten {
  schulnummer: string
  schulform: string
}

/** Liest die Stammdaten der eigenen Schule (Schulnummer zur Vorbelegung der Einstellungen). */
export async function loadSchulstammdaten(): Promise<Schulstammdaten> {
  const { data } = await getApiClient().get('/schule/stammdaten')
  return {
    // Feldname noch gegen die OpenAPI des Zielservers zu prüfen (ADR 001, Offene Frage 1)
    schulnummer: String(data.schulNr ?? data.schulnummer ?? ''),
    schulform: data.schulform ?? '',
  }
}
