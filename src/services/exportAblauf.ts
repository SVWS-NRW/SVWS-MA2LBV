import type { LbvParameter } from '@/models/LbvParameter'
import type { FormularDaten } from '@/rules/pruefung'
import type { Formular } from '@/rules/types'
import { erzeugePdf, fuegePdfsZusammen, zipMitPdfs } from './pdfExport'
import { ladeVorlage } from './vorlagen'

export interface ErzeugtePdf {
  id: string
  name: string
  bytes: Uint8Array
}

/**
 * Erzeugt für jede Lehrkraft ein PDF. Die Vorlagen werden je Formular nur einmal geladen.
 * `einbrennen`: flache Formulare, geeignet zum Zusammenfügen und Drucken.
 */
export async function erzeugeAllePdfs(
  eintraege: { id: string; daten: FormularDaten }[], parameter: LbvParameter, optionen: { einbrennen?: boolean; heute?: Date } = {},
  lade: (f: Formular) => Promise<Uint8Array> = ladeVorlage,
): Promise<ErzeugtePdf[]> {
  const vorlagen = new Map<Formular, Uint8Array>()
  const out: ErzeugtePdf[] = []
  for (const e of eintraege) {
    if (!vorlagen.has(e.daten.formular)) vorlagen.set(e.daten.formular, await lade(e.daten.formular))
    out.push({ id: e.id, name: e.daten.dateiname, bytes: await erzeugePdf(e.daten, parameter, vorlagen.get(e.daten.formular)!, optionen) })
  }
  return out
}

/** Eine PDF-Datei bleibt eine Datei, mehrere werden zu einem ZIP. */
export function alsDatei(pdfs: ErzeugtePdf[], zipName: string): { name: string; bytes: Uint8Array; mime: string } {
  if (pdfs.length === 1) return { name: pdfs[0].name, bytes: pdfs[0].bytes, mime: 'application/pdf' }
  return { name: zipName, bytes: zipMitPdfs(pdfs), mime: 'application/zip' }
}

/** Fügt flache PDFs zu einem Dokument zusammen (gemeinsames Drucken). */
export async function sammelPdf(pdfs: ErzeugtePdf[]): Promise<Uint8Array> {
  return pdfs.length === 1 ? pdfs[0].bytes : fuegePdfsZusammen(pdfs.map(p => p.bytes))
}
