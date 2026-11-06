/** Lehrkraftdaten aus SVWS (ADR 001, E4). Felder noch gegen die OpenAPI zu verifizieren. */
export interface Lehrkraft {
  id: number
  kuerzel: string
  nachname: string
  vorname: string
  /** TT.MM.JJJJ */
  geburtsdatum: string
  lbvNummer: string
  verguetungsschluessel: string
  /** "W" = Lehramtsanwärter */
  rechtsverhaeltnis: string
  /** "V" Vollzeit / "T" Teilzeit */
  beschaeftigungsart: string
}
