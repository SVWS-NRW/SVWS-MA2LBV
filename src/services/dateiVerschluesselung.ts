/**
 * Verschlüsselte Arbeitsdatei (ADR 001, E5): AES-256-GCM, Schlüssel per PBKDF2-SHA-256 aus einer Passphrase.
 * Anders als das alte MA2 (fester Schlüssel im Programm) bestimmt allein die Passphrase der Anwenderin
 * oder des Anwenders den Schlüssel.
 *
 * Dateiaufbau (JSON): `{ format, version, kdf: { name, hash, iterations, salt }, iv, daten }`, Binärdaten als Base64.
 * Format, Version und KDF-Parameter gehen als zusätzliche authentifizierte Daten in die Verschlüsselung ein.
 */

export const DATEI_FORMAT = 'svws-ma2lbv'
export const DATEI_ENDUNG = '.ma2lbv'
export const KDF_ITERATIONEN = 600_000
export const PASSPHRASE_MINDESTLAENGE = 8

export class DateiFehler extends Error {}
export class FalschePassphrase extends DateiFehler {
  constructor() {
    super('Die Passphrase ist falsch oder die Datei wurde verändert.')
  }
}

interface Huelle {
  format: string
  version: 1
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string }
  iv: string
  daten: string
}

export function zuBase64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export function vonBase64(text: string): Uint8Array {
  const s = atob(text)
  const b = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i)
  return b
}

async function schluessel(passphrase: string, salt: Uint8Array, iterationen: number): Promise<CryptoKey> {
  const roh = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: iterationen },
    roh, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  )
}

const zusatz = (iterationen: number, salt: string): BufferSource =>
  new TextEncoder().encode(`${DATEI_FORMAT}|1|PBKDF2-SHA-256|${iterationen}|${salt}`) as BufferSource

/** Verschlüsselt beliebige JSON-Daten und liefert den Dateiinhalt als Text. */
export async function verschluessele(daten: unknown, passphrase: string, iterationen = KDF_ITERATIONEN): Promise<string> {
  if (passphrase.length < PASSPHRASE_MINDESTLAENGE) {
    throw new DateiFehler(`Die Passphrase muss mindestens ${PASSPHRASE_MINDESTLAENGE} Zeichen lang sein.`)
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const saltText = zuBase64(salt)
  const key = await schluessel(passphrase, salt, iterationen)
  const klar = new TextEncoder().encode(JSON.stringify(daten))
  const chiffre = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, additionalData: zusatz(iterationen, saltText) }, key, klar as BufferSource,
  ))
  const huelle: Huelle = {
    format: DATEI_FORMAT, version: 1,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: iterationen, salt: saltText },
    iv: zuBase64(iv), daten: zuBase64(chiffre),
  }
  return JSON.stringify(huelle)
}

function liesHuelle(text: string): Huelle {
  let h: Partial<Huelle>
  try {
    h = JSON.parse(text)
  } catch {
    throw new DateiFehler('Die Datei ist keine Arbeitsdatei von SVWS-MA2LBV.')
  }
  if (!h || h.format !== DATEI_FORMAT) throw new DateiFehler('Die Datei ist keine Arbeitsdatei von SVWS-MA2LBV.')
  if (h.version !== 1 || h.kdf?.name !== 'PBKDF2' || h.kdf.hash !== 'SHA-256') {
    throw new DateiFehler('Die Arbeitsdatei stammt aus einer nicht unterstützten Programmversion.')
  }
  const n = h.kdf.iterations
  // Obergrenze verhindert, dass eine manipulierte Datei den Browser mit absurd vielen Runden blockiert
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1000 || n > 5_000_000 || typeof h.kdf.salt !== 'string' || typeof h.iv !== 'string' || typeof h.daten !== 'string') {
    throw new DateiFehler('Die Arbeitsdatei ist beschädigt.')
  }
  return h as Huelle
}

/** Entschlüsselt den Dateiinhalt. Wirft `FalschePassphrase`, wenn Passphrase oder Inhalt nicht stimmen. */
export async function entschluessele(dateiInhalt: string, passphrase: string): Promise<unknown> {
  const h = liesHuelle(dateiInhalt)
  let klar: ArrayBuffer
  try {
    const key = await schluessel(passphrase, vonBase64(h.kdf.salt), h.kdf.iterations)
    klar = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: vonBase64(h.iv) as BufferSource, additionalData: zusatz(h.kdf.iterations, h.kdf.salt) },
      key, vonBase64(h.daten) as BufferSource,
    )
  } catch {
    throw new FalschePassphrase()
  }
  try {
    return JSON.parse(new TextDecoder().decode(klar))
  } catch {
    throw new DateiFehler('Die Arbeitsdatei ist beschädigt.')
  }
}
