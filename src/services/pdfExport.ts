import {
  PDFArray, PDFDict, PDFDocument, PDFName, PDFTextField, StandardFonts, rgb, type PDFFont,
} from 'pdf-lib'
import { zipSync } from 'fflate'
import type { LbvParameter } from '@/models/LbvParameter'
import type { FormularDaten } from '@/rules/pruefung'
import { code39Balken, code39Module } from '@/rules/code39'

/**
 * Befüllt die LBV-Vorlagen (ADR 003, 5.1, 5.2, 5.6). Reine Funktionen ohne DOM-Zugriff.
 *
 * Es entsteht die "Druckfassung" (ADR 003, Entscheidung 5): Barcode eingetragen, nicht zu druckende
 * Rahmen ausgeblendet, Kommentarsymbole entfernt. Das JavaScript der Vorlage wird entfernt, weil es
 * dieselben Schritte beim Drucken erneut ausführen und den Barcode doppelt erzeugen würde.
 */

/** Formularkennung im Barcode der Vorlage LBV(A/Bes)23_2019_02. */
export const BARCODE_FORMULARKENNUNG = 'ABes23/201902'

/** Felder, deren Rahmen im Ausdruck entfallen (`InitDruckausgabe` in MA2). */
function felderOhneRahmen(): string[] {
  const n = [1, 2, 3, 4, 5, 6]
  return [
    'LBV_Personalnummer', 'LBV_Schulnummer', 'LBV_Stundentaktung',
    ...n.flatMap(i => [`FeldA_Input${i}.1`, `FeldA_Input${i}.2`, `LBV_Füller_FeldA_${i}.1`, `LBV_Füller_FeldA_${i}.2`]),
    'FeldB_Input1.1', 'LBV_Füller_FeldB_1.1',
    ...n.flatMap(i => [`FeldB_Input${i}_1`, `LBV_Füller_FeldB_${i}.1`]),
    ...n.flatMap(i => [`FeldC_Input${i}.1`, `FeldC_Input${i}.2`, `LBV_Füller_FeldC_${i}.1`]),
  ]
}

/** Wie MA2 `Mixed`: nur durchgehend GROSS geschriebene Namen werden in gemischte Schreibweise gewandelt. */
export function gemischteSchreibweise(text: string): string {
  const t = text.trim()
  if (t === '' || t !== t.toLocaleUpperCase('de') || t === t.toLocaleLowerCase('de')) return t
  return t.toLocaleLowerCase('de').replace(/(^|[\s-])(\p{L})/gu, (_m, vor: string, z: string) => vor + z.toLocaleUpperCase('de'))
}

export function datumText(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

export class VorlagenFehler extends Error {}

export interface ExportOptionen {
  /** Datum im Formularkopf; Standard: heute */
  heute?: Date
  /** Formularfelder einbrennen (für das Zusammenfügen mehrerer Formulare zum Drucken) */
  einbrennen?: boolean
}

function schriftFuerFeld(feld: PDFTextField, schriften: { helv: PDFFont; courierFett: PDFFont; times: PDFFont }): PDFFont {
  const da = feld.acroField.getDefaultAppearance() ?? ''
  if (da.includes('/CoBo') || da.includes('Courier')) return schriften.courierFett
  if (da.includes('Times')) return schriften.times
  return schriften.helv
}

export async function erzeugePdf(
  daten: FormularDaten, parameter: LbvParameter, vorlage: Uint8Array, optionen: ExportOptionen = {},
): Promise<Uint8Array> {
  const heute = optionen.heute ?? new Date()
  const doc = await PDFDocument.load(vorlage)
  const form = doc.getForm()
  const helv = await doc.embedFont(StandardFonts.Helvetica)
  const schriften = { helv, courierFett: await doc.embedFont(StandardFonts.CourierBold), times: await doc.embedFont(StandardFonts.TimesRoman) }
  const zeichen = new Set(helv.getCharacterSet())
  const sauber = (t: string) => [...t].map(c => (c === '\n' || zeichen.has(c.codePointAt(0)!) ? c : '?')).join('')

  const feld = (name: string): PDFTextField => {
    try {
      return form.getTextField(name)
    } catch {
      throw new VorlagenFehler(`Formfeld nicht gefunden: ${name}`)
    }
  }
  const setze = (name: string, wert: string): void => {
    const f = feld(name)
    const max = f.getMaxLength()
    const text = sauber(wert)
    f.setText(max !== undefined && text.length > max ? text.slice(0, max) : text)
  }
  /** Kopfangabe: ein leerer Einstellungswert lässt den Wert der Vorlage unverändert (`UpdateSonstFormularFeld`). */
  const setzeKopf = (name: string, wert: string): void => {
    const v = wert.trim()
    if (v !== '') setze(name, v)
  }

  const laa = daten.formular === 'LAA'
  const datum = datumText(heute)

  // Kopfdaten der Schule
  setzeKopf('LBV_Schulnummer', parameter.schulnummer)
  if (parameter.anzahlMinuten.trim() !== '' && parameter.anzahlMinuten !== '04500') setzeKopf('LBV_Stundentaktung', parameter.anzahlMinuten)
  setzeKopf('InVertretung', parameter.sachlichRichtig)
  setzeKopf('Unterschrift', parameter.unterschrift)
  if (laa) {
    setzeKopf('LBV_Dienststelle', parameter.dienststelle)
    setzeKopf('LBV_Aktenzeichen', parameter.aktenzeichen)
    setzeKopf('LBV_Ort', parameter.plzOrt.trim() === '' ? '' : `${parameter.plzOrt.trim()}, ${datum}`)
    setzeKopf('LBV_Bearbeiter', parameter.bearbeiter)
    setzeKopf('LBV_Telefon', parameter.telefon)
    setzeKopf('LBV_Nebenstelle', parameter.nebenstelle)
  } else {
    setzeKopf('Dienststelle', parameter.dienststelle.replace(/\r\n?/g, '\n'))
    setzeKopf('Aktenzeichen', parameter.aktenzeichen)
    setze('Datum', datum)
    setzeKopf('E-Mail-Adresse', parameter.eMail)
    setzeKopf('Bearbeiter', parameter.bearbeiter)
    setzeKopf('Telefon', [parameter.telefon.trim(), parameter.nebenstelle.trim()].filter(Boolean).join(' '))
  }

  // Lehrkraft und Abrechnungszeilen
  setze('LBV_Nachname', gemischteSchreibweise(daten.nachname))
  setze('LBV_Vorname', gemischteSchreibweise(daten.vorname))
  setze('LBV_Geburtsdatum', daten.geburtsdatum)
  setze('LBV_Personalnummer', daten.personalnummer)
  for (const [name, wert] of Object.entries(daten.felder)) setze(name, wert)
  if (parameter.keineMehrarbeitWeitereSchule) {
    try {
      form.getCheckBox('LBV_Checkbox_Nein').check()
    } catch {
      throw new VorlagenFehler('Formfeld nicht gefunden: LBV_Checkbox_Nein')
    }
  }

  // Druckfassung: Rahmen ausblenden, Barcode, Kommentarsymbole und JavaScript entfernen
  for (const name of felderOhneRahmen()) {
    const f = form.getFieldMaybe(name)
    if (f) for (const w of f.acroField.getWidgets()) w.getOrCreateAppearanceCharacteristics().setBorderColor([])
  }
  const barcodeText = `${BARCODE_FORMULARKENNUNG}/${daten.personalnummer}`
  const textFeld = form.getFieldMaybe('LBV_Barcode_Text')
  if (textFeld instanceof PDFTextField && !laa) {
    textFeld.setText(barcodeText)
    // Das Feld ist in der Vorlage nur im Druck sichtbar (NoView); die Druckfassung zeigt es immer
    for (const w of textFeld.acroField.getWidgets()) w.setFlags(4)
  }

  for (const f of form.getFields()) {
    if (f instanceof PDFTextField) f.updateAppearances(schriftFuerFeld(f, schriften))
    f.acroField.dict.delete(PDFName.of('AA'))
    for (const w of f.acroField.getWidgets()) w.dict.delete(PDFName.of('AA'))
  }

  const seite = doc.getPage(0)
  if (!laa) zeichneBarcode(seite, form.getFieldMaybe('LBV_Barcode_9of3'), barcodeText)

  entferneKommentare(seite)
  entferneJavaScript(doc)

  if (optionen.einbrennen) {
    // Felder ohne Druck-Flag (Platzhalter "#", Legende) erscheinen nur am Bildschirm und würden sonst eingebrannt mitgedruckt
    for (const f of form.getFields()) {
      if (((f.acroField.getWidgets()[0]?.getFlags() ?? 0) & 4) === 0) form.removeField(f)
    }
    form.flatten()
  }
  doc.setTitle(daten.dateiname)
  doc.setProducer('SVWS-MA2LBV')
  doc.setCreator('SVWS-MA2LBV')
  return doc.save()
}

/** Zeichnet den Code-39-Barcode als Vektorgrafik an die Stelle des Feldes `LBV_Barcode_9of3` (Maße nach MA2-Ausdruck). */
function zeichneBarcode(seite: ReturnType<PDFDocument['getPage']>, feld: ReturnType<ReturnType<PDFDocument['getForm']>['getFieldMaybe']>, text: string): void {
  if (!feld) throw new VorlagenFehler('Formfeld nicht gefunden: LBV_Barcode_9of3')
  const r = feld.acroField.getWidgets()[0].getRectangle()
  const zeichenAnzahl = text.length + 2
  const modul = Math.min(1.161, (r.height - 4) / code39Module(zeichenAnzahl))
  const hoehe = 24.2 * (modul / 1.161)
  const x = r.x + r.width - 35
  const oben = r.y + r.height - 2
  for (const b of code39Balken(text)) {
    seite.drawRectangle({ x, y: oben - (b.start + b.breite) * modul, width: hoehe, height: b.breite * modul, color: rgb(0, 0, 0), borderWidth: 0 })
  }
}

function entferneKommentare(seite: ReturnType<PDFDocument['getPage']>): void {
  const annots = seite.node.lookupMaybe(PDFName.of('Annots'), PDFArray)
  if (!annots) return
  const behalten = seite.doc.context.obj([])
  for (let i = 0; i < annots.size(); i++) {
    const ref = annots.get(i)
    const dict = annots.lookup(i, PDFDict)
    if (dict.get(PDFName.of('Subtype')) === PDFName.of('Widget')) behalten.push(ref)
  }
  seite.node.set(PDFName.of('Annots'), behalten)
}

function entferneJavaScript(doc: PDFDocument): void {
  doc.catalog.delete(PDFName.of('AA'))
  const names = doc.catalog.lookupMaybe(PDFName.of('Names'), PDFDict)
  names?.delete(PDFName.of('JavaScript'))
  const open = doc.catalog.lookupMaybe(PDFName.of('OpenAction'), PDFDict)
  if (open?.get(PDFName.of('S')) === PDFName.of('JavaScript')) doc.catalog.delete(PDFName.of('OpenAction'))
}

/** Fügt eingebrannte (flache) Formulare zu einem Dokument zusammen, z. B. zum gemeinsamen Drucken. */
export async function fuegePdfsZusammen(pdfs: Uint8Array[]): Promise<Uint8Array> {
  const ziel = await PDFDocument.create()
  for (const bytes of pdfs) {
    const quelle = await PDFDocument.load(bytes)
    for (const s of await ziel.copyPages(quelle, quelle.getPageIndices())) ziel.addPage(s)
  }
  ziel.setProducer('SVWS-MA2LBV')
  return ziel.save()
}

/** Packt PDF-Dateien in ein ZIP; doppelte Namen erhalten ein Suffix. */
export function zipMitPdfs(dateien: { name: string; bytes: Uint8Array }[]): Uint8Array {
  const out: Record<string, Uint8Array> = {}
  for (const d of dateien) {
    let name = d.name
    for (let i = 2; name in out; i++) name = d.name.replace(/\.pdf$/i, `_${i}.pdf`)
    out[name] = d.bytes
  }
  return zipSync(out, { level: 0 })
}

