import type { Formular } from '@/rules/types'

/**
 * Lädt die eingebetteten LBV-Vorlagen (ADR 001, E6). Sie sind als Base64 im Bundle enthalten, weil der
 * SVWS-Server unter /app/ nicht jeden Dateityp ausliefert und `fetch` unter file:// nicht funktioniert.
 * Das Laden erfolgt erst bei Bedarf, damit der Start der Anwendung nicht langsamer wird.
 */

/** Formularversion der eingebetteten Vorlagen (ADR 003, 5.1 und 5.2). */
export const VORLAGEN_VERSION: Record<Formular, string> = {
  LEHRKRAFT: 'LBV(A/Bes)23_2019_02',
  LAA: 'LBV(A/Bes)24.10.2015',
}

export function dekodiereDataUrl(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export async function ladeVorlage(formular: Formular): Promise<Uint8Array> {
  const modul = formular === 'LAA'
    ? await import('@/assets/vorlagen/LBV-LAA-Vorlage.pdf?inline')
    : await import('@/assets/vorlagen/LBV-Vorlage.pdf?inline')
  return dekodiereDataUrl(modul.default)
}
