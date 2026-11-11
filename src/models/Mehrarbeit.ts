/** Ein Abrechnungsmonat im internen Format "JJ/MM" (ADR 003, 4.1). */
export type Monat = string

export type Merkmal = '' | 'V' | 'A' | 'K'

export interface MonatsEintrag {
  /** Stundenangabe als Text, Dezimalkomma möglich */
  stunden: string
  merkmal: string
}

/** Eine Zeile der Mehrarbeitstabelle. */
export interface Mehrarbeitszeile {
  id: string
  markiert: boolean
  nachname: string
  vorname: string
  /** TT.MM.JJJJ */
  geburtsdatum: string
  lbvNummer: string
  verguetungsschluessel: string
  /** Kürzel V / T / W (Voll-/Teilzeit, Lehramtsanwärter) */
  status: string
  /** genau 6 Einträge */
  monate: MonatsEintrag[]
  hinweis: string
}
