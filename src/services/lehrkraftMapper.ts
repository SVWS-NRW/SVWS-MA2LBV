import type { Lehrkraft } from '@/models/Lehrkraft'

/**
 * Abbildung der SVWS-Lehrerdaten auf `Lehrkraft` (ADR 003, 4.10).
 * Reine Funktionen, gegen die OpenAPI des SVWS-Servers geprüft (LehrerListeEintrag, LehrerStammdaten,
 * LehrerPersonaldaten, LehrerPersonalabschnittsdaten, Kataloge LehrerRechtsverhaeltnis / LehrerBeschaeftigungsart).
 */

export interface SvwsLehrerListeEintrag {
  id: number
  kuerzel: string
  nachname: string
  vorname: string
  personTyp: string
  istSichtbar: boolean
}

export interface SvwsLehrerStammdaten {
  id: number
  nachname: string
  vorname: string
  /** ISO "JJJJ-MM-TT" */
  geburtsdatum: string | null
}

export interface SvwsPersonalabschnittsdaten {
  idSchuljahresabschnitt: number
  idRechtsverhaeltnis: number | null
  idBeschaeftigungsart: number | null
}

export interface SvwsLehrerPersonaldaten {
  id: number
  lbvPersonalnummer: string | null
  lbvVerguetungsschluessel: string | null
  abschnittsdaten: SvwsPersonalabschnittsdaten[]
}

/** Katalog-JSON (`/types/<Name>.json`): `daten[].historie[]` mit `id` und `schluessel`. */
export interface SvwsKatalog {
  daten: { bezeichner: string; historie: { id: number; schluessel: string }[] }[]
}

/** id → Schlüssel (z. B. 9 → "W"). */
export function katalogSchluessel(katalog: SvwsKatalog): Map<number, string> {
  const m = new Map<number, string>()
  for (const e of katalog.daten) for (const h of e.historie) m.set(h.id, h.schluessel)
  return m
}

/** SVWS-Datum "JJJJ-MM-TT" → "TT.MM.JJJJ"; ungültig oder leer → "". */
export function isoZuDatum(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return m ? `${m[3]}.${m[2]}.${m[1]}` : ''
}

/**
 * Status wie in MA2 (`Action_SchILDImport`): `W` bei Lehramtsanwärtern, sonst die Beschäftigungsart.
 * Zusätzlich zu MA2 gelten die SVWS-Beschäftigungsarten `WT`/`WV` (LAA in Teil-/Vollzeit) als LAA.
 */
export function bestimmeStatus(rechtsverhaeltnis: string, beschaeftigungsart: string): string {
  if (rechtsverhaeltnis === 'W' || beschaeftigungsart.startsWith('W')) return 'W'
  return beschaeftigungsart
}

/** Nur sichtbare Lehrkräfte (MA2: `NurSichtbare`), keine anderen Personentypen. */
export function filtereLehrkraefte(liste: SvwsLehrerListeEintrag[]): SvwsLehrerListeEintrag[] {
  return liste.filter(l => l.istSichtbar && l.personTyp === 'LEHRKRAFT')
}

export function baueLehrkraefte(
  liste: SvwsLehrerListeEintrag[],
  stammdaten: SvwsLehrerStammdaten[],
  personaldaten: SvwsLehrerPersonaldaten[],
  rechtsverhaeltnisse: Map<number, string>,
  beschaeftigungsarten: Map<number, string>,
  idAbschnitt: number,
): Lehrkraft[] {
  const sd = new Map(stammdaten.map(s => [s.id, s]))
  const pd = new Map(personaldaten.map(p => [p.id, p]))
  return liste.map(l => {
    const s = sd.get(l.id)
    const p = pd.get(l.id)
    const a = p?.abschnittsdaten.find(x => x.idSchuljahresabschnitt === idAbschnitt)
    const rv = a?.idRechtsverhaeltnis != null ? (rechtsverhaeltnisse.get(a.idRechtsverhaeltnis) ?? '') : ''
    const ba = a?.idBeschaeftigungsart != null ? (beschaeftigungsarten.get(a.idBeschaeftigungsart) ?? '') : ''
    return {
      id: l.id,
      kuerzel: l.kuerzel,
      nachname: (s?.nachname ?? l.nachname).trim(),
      vorname: (s?.vorname ?? l.vorname).trim(),
      geburtsdatum: isoZuDatum(s?.geburtsdatum),
      lbvNummer: (p?.lbvPersonalnummer ?? '').trim(),
      verguetungsschluessel: (p?.lbvVerguetungsschluessel ?? '').trim(),
      rechtsverhaeltnis: rv,
      beschaeftigungsart: ba,
      status: bestimmeStatus(rv, ba),
    }
  })
}

/** Wie `LKBereitsAufgenommen` in MA2: gleicher Nachname, Vorname und gleiches Geburtsdatum. */
export function istBereitsAufgenommen(
  lk: Pick<Lehrkraft, 'nachname' | 'vorname' | 'geburtsdatum'>,
  zeilen: Pick<Lehrkraft, 'nachname' | 'vorname' | 'geburtsdatum'>[],
): boolean {
  return zeilen.some(z => z.nachname === lk.nachname && z.vorname === lk.vorname && z.geburtsdatum === lk.geburtsdatum)
}

/** Hinweise zu unvollständig gepflegten Daten, die der Export später ablehnen würde. */
export function datenHinweise(lk: Lehrkraft): string[] {
  const h: string[] = []
  if (lk.lbvNummer === '') h.push('LBV-Personalnummer nicht gepflegt')
  if (lk.verguetungsschluessel === '') h.push('Vergütungsschlüssel nicht gepflegt')
  if (lk.geburtsdatum === '') h.push('Geburtsdatum fehlt')
  if (lk.beschaeftigungsart === '') h.push('Beschäftigungsart nicht gepflegt (Vollzeit angenommen)')
  return h
}
