// @vitest-environment node
import { readFileSync } from 'node:fs'
import { unzipSync } from 'fflate'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { LEERE_PARAMETER } from '@/models/LbvParameter'
import { pruefeUndBereitVor, type ExportZeile } from '@/rules/pruefung'
import type { Formular } from '@/rules/types'
import { alsDatei, erzeugeAllePdfs, sammelPdf } from './exportAblauf'

const parameter = { ...LEERE_PARAMETER, schulnummer: '123456' }
const lade = async (f: Formular) => new Uint8Array(readFileSync(new URL(`../assets/vorlagen/${f === 'LAA' ? 'LBV-LAA-Vorlage.pdf' : 'LBV-Vorlage.pdf'}`, import.meta.url)))
const zeile = (name: string): ExportZeile => ({
  nachname: name, vorname: 'X', geburtsdatum: '01.01.1980', lbvNummer: 'B 0312222', verguetungsschluessel: '1', status: 'V',
  monate: [{ monat: '23/10', stunden: '2', merkmal: 'V', aktiv: true }, ...Array(5).fill({ monat: '', stunden: '', merkmal: '', aktiv: true })],
})
const daten = (name: string) => pruefeUndBereitVor(zeile(name), parameter, new Date(2024, 0, 1)).daten!

describe('Export-Ablauf', () => {
  it('erzeugt ein PDF je Lehrkraft; eine Datei bleibt PDF, mehrere werden ZIP', async () => {
    const pdfs = await erzeugeAllePdfs([{ id: 'a', daten: daten('Alpha') }, { id: 'b', daten: daten('Beta') }], parameter, {}, lade)
    expect(pdfs.map(p => p.id)).toEqual(['a', 'b'])
    expect(alsDatei([pdfs[0]], 'x.zip')).toMatchObject({ name: 'LBV_Alpha_B0312222_2310-2310.pdf', mime: 'application/pdf' })
    const zip = alsDatei(pdfs, 'x.zip')
    expect(zip).toMatchObject({ name: 'x.zip', mime: 'application/zip' })
    expect(Object.keys(unzipSync(zip.bytes)).sort()).toEqual(['LBV_Alpha_B0312222_2310-2310.pdf', 'LBV_Beta_B0312222_2310-2310.pdf'])
  })

  it('lädt jede Vorlage nur einmal und fügt eingebrannte PDFs zusammen', async () => {
    let geladen = 0
    const pdfs = await erzeugeAllePdfs([{ id: 'a', daten: daten('Alpha') }, { id: 'b', daten: daten('Beta') }], parameter, { einbrennen: true }, async f => { geladen++; return lade(f) })
    expect(geladen).toBe(1)
    expect((await PDFDocument.load(await sammelPdf(pdfs))).getPageCount()).toBe(2)
    expect(await sammelPdf([pdfs[0]])).toBe(pdfs[0].bytes)
  })
})
