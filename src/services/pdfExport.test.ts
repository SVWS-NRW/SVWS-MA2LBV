// @vitest-environment node
import { readFileSync } from 'node:fs'
import { unzipSync } from 'fflate'
import { PDFArray, PDFDict, PDFDocument, PDFName } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { LEERE_PARAMETER, type LbvParameter } from '@/models/LbvParameter'
import { pruefeUndBereitVor, type ExportZeile } from '@/rules/pruefung'
import { dekodiereDataUrl } from './vorlagen'
import { erzeugePdf, fuegePdfsZusammen, gemischteSchreibweise, VorlagenFehler, zipMitPdfs } from './pdfExport'

const vorlage = (name: string) => new Uint8Array(readFileSync(new URL(`../assets/vorlagen/${name}`, import.meta.url)))
const heute = new Date(2024, 1, 28)

const parameter: LbvParameter = {
  ...LEERE_PARAMETER,
  dienststelle: 'Dogobert-Duck-Gymnasium\nder Stadt Entenhausen', aktenzeichen: 'AZ 4711', schulnummer: '123456',
  bearbeiter: 'Anna Beispiel', telefon: '02111234', nebenstelle: '55', eMail: 'sek@schule.example',
  sachlichRichtig: 'i. V. Mustermann', unterschrift: 'Schulleitung', schulform: '07', plzOrt: '54321 Entenhausen', anzahlMinuten: '04600',
}
function monate(w: [string, string, string][]): ExportZeile['monate'] {
  const m = w.map(([monat, stunden, merkmal]) => ({ monat, stunden, merkmal, aktiv: true }))
  while (m.length < 6) m.push({ monat: '', stunden: '', merkmal: '', aktiv: true })
  return m
}
// Beispiel aus dem Referenzausdruck "LBV_Buschmann_C1207893_1809-1901.pdf"
const buschmann: ExportZeile = {
  nachname: 'BUSCHMANN', vorname: 'Andrea', geburtsdatum: '19.12.1971', lbvNummer: 'C 1207893', verguetungsschluessel: '1', status: 'V',
  monate: monate([['18/09', '2', 'V'], ['18/10', '2', 'V'], ['18/11', '3', 'V'], ['18/12', '4', ''], ['19/01', '1', 'V']]),
}

async function lesen(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes)
  const form = doc.getForm()
  return { doc, form, text: (n: string) => form.getTextField(n).getText() ?? '' }
}
const daten = (z: ExportZeile, p = parameter) => {
  const r = pruefeUndBereitVor(z, p, heute)
  if (!r.daten) throw new Error(r.fehler.join(', '))
  return r.daten
}

describe('Formular für Lehrkräfte', () => {
  it('schreibt Kopf, Person, Abrechnungszeilen und Barcode-Text', async () => {
    const pdf = await lesen(await erzeugePdf(daten(buschmann), parameter, vorlage('LBV-Vorlage.pdf'), { heute }))
    expect(pdf.text('LBV_Nachname')).toBe('Buschmann')
    expect(pdf.text('LBV_Vorname')).toBe('Andrea')
    expect(pdf.text('LBV_Geburtsdatum')).toBe('19.12.1971')
    expect(pdf.text('LBV_Personalnummer')).toBe('C1207893')
    expect(pdf.text('LBV_Schulnummer')).toBe('123456')
    expect(pdf.text('LBV_Stundentaktung')).toBe('04600')
    expect(pdf.text('Datum')).toBe('28.02.2024')
    expect(pdf.text('Aktenzeichen')).toBe('AZ 4711')
    expect(pdf.text('Dienststelle')).toBe('Dogobert-Duck-Gymnasium\nder Stadt Entenhausen')
    expect(pdf.text('Telefon')).toBe('02111234 55')
    expect(pdf.text('E-Mail-Adresse')).toBe('sek@schule.example')
    expect(pdf.text('InVertretung')).toBe('i. V. Mustermann')
    // wie im Referenzausdruck
    expect([1, 2, 3, 4, 5].map(i => `${pdf.text(`FeldA_Input${i}.1`)}|${pdf.text(`FeldA_Input${i}.2`)}`)).toEqual([
      '0918 002 1|V', '1018 002 1|V', '1118 003 1|V', '1218 004 1|', '0119 001 1|V',
    ])
    expect(pdf.text('FeldA_Input6.1')).toBe('')
    expect(pdf.text('LBV_Barcode_Text')).toBe('ABes23/201902/C1207893')
    expect(pdf.form.getCheckBox('LBV_Checkbox_Nein').isChecked()).toBe(true)
    expect(pdf.form.getCheckBox('LBV_Checkbox_Ja').isChecked()).toBe(false)
  })

  it('lässt Stundentaktung bei Standardwert leer und übernimmt Vorlagenwerte bei leeren Einstellungen', async () => {
    const p = { ...parameter, anzahlMinuten: '', bearbeiter: '', keineMehrarbeitWeitereSchule: false }
    const pdf = await lesen(await erzeugePdf(daten(buschmann, p), p, vorlage('LBV-Vorlage.pdf'), { heute }))
    expect(pdf.text('LBV_Stundentaktung')).toBe('')
    expect(pdf.text('Bearbeiter')).toBe('')
    expect(pdf.form.getCheckBox('LBV_Checkbox_Nein').isChecked()).toBe(false)
  })

  it('erzeugt die Druckfassung: Barcode als Vektorgrafik, ohne Kommentare und ohne JavaScript, Rahmen ausgeblendet', async () => {
    const bytes = await erzeugePdf(daten(buschmann), parameter, vorlage('LBV-Vorlage.pdf'), { heute })
    const { doc, form } = await lesen(bytes)
    const annots = doc.getPage(0).node.lookup(PDFName.of('Annots'), PDFArray)
    for (let i = 0; i < annots.size(); i++) expect(annots.lookup(i, PDFDict).get(PDFName.of('Subtype'))).toBe(PDFName.of('Widget'))
    const names = doc.catalog.lookupMaybe(PDFName.of('Names'), PDFDict)
    expect(names?.get(PDFName.of('JavaScript'))).toBeUndefined()
    expect(doc.catalog.get(PDFName.of('AA'))).toBeUndefined()
    const pn = form.getTextField('LBV_Personalnummer').acroField.getWidgets()[0]
    expect(pn.getAppearanceCharacteristics()?.getBorderColor()).toEqual([])
    // Barcode-Text-Feld ist in der Druckfassung immer sichtbar (Druck-Flag, ohne NoView)
    expect(form.getTextField('LBV_Barcode_Text').acroField.getWidgets()[0].getFlags()).toBe(4)
    // der 9of3-Barcode wird gezeichnet, das Feld bleibt leer (sonst entstünde beim Drucken ein zweiter Barcode)
    expect(form.getTextField('LBV_Barcode_9of3').getText() ?? '').toBe('')
  })

  it('meldet ein unbekanntes Formularfeld wie MA2', async () => {
    const d = { ...daten(buschmann), felder: { 'GibtEsNicht': 'x' } }
    await expect(erzeugePdf(d, parameter, vorlage('LBV-Vorlage.pdf'), { heute })).rejects.toThrow(VorlagenFehler)
    await expect(erzeugePdf(d, parameter, vorlage('LBV-Vorlage.pdf'), { heute })).rejects.toThrow('Formfeld nicht gefunden: GibtEsNicht')
  })
})

describe('Abschnitt C und LAA-Formular', () => {
  it('schreibt Abschnitt C (Tarif, Teilzeit)', async () => {
    const z: ExportZeile = { ...buschmann, nachname: 'Muster', lbvNummer: 'P123456782', status: 'T', monate: monate([['23/10', '2,5', 'K'], ['23/11', '3', '']]) }
    const pdf = await lesen(await erzeugePdf(daten(z), parameter, vorlage('LBV-Vorlage.pdf'), { heute }))
    expect(pdf.text('FeldC_Input1.1')).toBe('5006 1023 00250')
    expect(pdf.text('FeldC_Input2.1')).toBe('5004 1123 00300')
    expect(pdf.text('LBV_Barcode_Text')).toBe('ABes23/201902/P123456782')
  })

  it('verwendet beim LAA-Formular die eigenen Feldnamen und keinen Barcode', async () => {
    const z: ExportZeile = { ...buschmann, nachname: 'Neu', lbvNummer: 'B 0312222', verguetungsschluessel: '2', status: 'W', monate: monate([['23/10', '3', '']]) }
    const pdf = await lesen(await erzeugePdf(daten(z), parameter, vorlage('LBV-LAA-Vorlage.pdf'), { heute }))
    expect(pdf.text('FeldB_Input1_1')).toBe('07 1023 03 2')
    expect(pdf.text('LBV_Ort')).toBe('54321 Entenhausen, 28.02.2024')
    expect(pdf.text('LBV_Dienststelle')).toContain('Dogobert-Duck-Gymnasium')
    expect(pdf.text('LBV_Nebenstelle')).toBe('55')
    expect(pdf.text('LBV_Personalnummer')).toBe('B0312222')
  })
})

describe('Sammel-PDF und ZIP', () => {
  it('brennt Formulare ein und fügt sie zusammen; Bildschirm-Platzhalter werden nicht eingebrannt', async () => {
    const ein = await erzeugePdf(daten(buschmann), parameter, vorlage('LBV-Vorlage.pdf'), { heute, einbrennen: true })
    expect((await PDFDocument.load(ein)).getForm().getFields()).toHaveLength(0)
    const z2: ExportZeile = { ...buschmann, nachname: 'Zweit' }
    const ein2 = await erzeugePdf(daten(z2), parameter, vorlage('LBV-Vorlage.pdf'), { heute, einbrennen: true })
    const sammel = await PDFDocument.load(await fuegePdfsZusammen([ein, ein2]))
    expect(sammel.getPageCount()).toBe(2)
  })

  it('packt PDFs ins ZIP und vergibt Suffixe bei doppelten Namen', () => {
    const zip = unzipSync(zipMitPdfs([
      { name: 'LBV_A.pdf', bytes: new Uint8Array([1]) }, { name: 'LBV_A.pdf', bytes: new Uint8Array([2]) }, { name: 'LBV_B.pdf', bytes: new Uint8Array([3]) },
    ]))
    expect(Object.keys(zip).sort()).toEqual(['LBV_A.pdf', 'LBV_A_2.pdf', 'LBV_B.pdf'])
    expect([...zip['LBV_A_2.pdf']]).toEqual([2])
  })
})

describe('Namen und Vorlagen', () => {
  it('wandelt nur GROSS geschriebene Namen in gemischte Schreibweise', () => {
    expect(gemischteSchreibweise('MÜLLER-LÜDENSCHEID')).toBe('Müller-Lüdenscheid')
    expect(gemischteSchreibweise('VAN DER BERG')).toBe('Van Der Berg')
    expect(gemischteSchreibweise('McDonald')).toBe('McDonald')
    expect(gemischteSchreibweise('von Hagen')).toBe('von Hagen')
    expect(gemischteSchreibweise('')).toBe('')
  })

  it('dekodiert eingebettete Vorlagen aus der Data-URL', () => {
    const bytes = dekodiereDataUrl(`data:application/pdf;base64,${Buffer.from('%PDF-1.7').toString('base64')}`)
    expect(new TextDecoder().decode(bytes)).toBe('%PDF-1.7')
  })
})
