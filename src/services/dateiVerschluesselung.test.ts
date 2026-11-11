// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { DateiFehler, entschluessele, FalschePassphrase, verschluessele, vonBase64, zuBase64 } from './dateiVerschluesselung'

// Wenige Runden, damit die Tests schnell laufen; die Produktivvorgabe steht in KDF_ITERATIONEN
const RUNDEN = 2000
const daten = { version: 1, name: 'Müller, Ünal', stunden: [1, 2.5], nr: 'B 0312222' }

describe('Arbeitsdatei verschlüsseln', () => {
  it('ver- und entschlüsselt verlustfrei (auch Umlaute)', async () => {
    const datei = await verschluessele(daten, 'geheimes-passwort', RUNDEN)
    expect(await entschluessele(datei, 'geheimes-passwort')).toEqual(daten)
  })

  it('enthält keinen Klartext und verwendet bei jedem Speichern neuen Salt und IV', async () => {
    const a = await verschluessele(daten, 'geheimes-passwort', RUNDEN)
    const b = await verschluessele(daten, 'geheimes-passwort', RUNDEN)
    expect(a).not.toContain('Müller')
    expect(a).not.toContain('0312222')
    expect(JSON.parse(a).iv).not.toBe(JSON.parse(b).iv)
    expect(JSON.parse(a).kdf.salt).not.toBe(JSON.parse(b).kdf.salt)
    expect(JSON.parse(a)).toMatchObject({ format: 'svws-ma2lbv', version: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: RUNDEN } })
  })

  it('lehnt eine falsche Passphrase ab', async () => {
    const datei = await verschluessele(daten, 'geheimes-passwort', RUNDEN)
    await expect(entschluessele(datei, 'falsches-passwort')).rejects.toBeInstanceOf(FalschePassphrase)
    await expect(entschluessele(datei, '')).rejects.toBeInstanceOf(FalschePassphrase)
  })

  it('erkennt Manipulation am Inhalt und an den KDF-Parametern', async () => {
    const h = JSON.parse(await verschluessele(daten, 'geheimes-passwort', RUNDEN))
    const chiffre = vonBase64(h.daten)
    chiffre[0] ^= 1
    await expect(entschluessele(JSON.stringify({ ...h, daten: zuBase64(chiffre) }), 'geheimes-passwort')).rejects.toBeInstanceOf(FalschePassphrase)
    await expect(entschluessele(JSON.stringify({ ...h, kdf: { ...h.kdf, iterations: RUNDEN + 1 } }), 'geheimes-passwort')).rejects.toBeInstanceOf(FalschePassphrase)
  })

  it('verlangt eine Mindestlänge der Passphrase beim Speichern', async () => {
    await expect(verschluessele(daten, 'kurz', RUNDEN)).rejects.toThrow(/mindestens 8/)
  })

  it('weist fremde, beschädigte oder zu aufwendige Dateien ab', async () => {
    await expect(entschluessele('kein json', 'x')).rejects.toThrow(DateiFehler)
    await expect(entschluessele('{"format":"anders"}', 'x')).rejects.toThrow(/keine Arbeitsdatei/)
    const h = JSON.parse(await verschluessele(daten, 'geheimes-passwort', RUNDEN))
    await expect(entschluessele(JSON.stringify({ ...h, version: 2 }), 'x')).rejects.toThrow(/nicht unterstützten/)
    await expect(entschluessele(JSON.stringify({ ...h, kdf: { ...h.kdf, iterations: 900_000_000 } }), 'x')).rejects.toThrow(/beschädigt/)
  })

  it('wandelt große Binärdaten ohne Stapelüberlauf in Base64', () => {
    const gross = new Uint8Array(300_000).map((_, i) => i % 251)
    expect([...vonBase64(zuBase64(gross))]).toEqual([...gross])
  })
})
