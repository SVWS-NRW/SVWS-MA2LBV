/** Lehrkraftdaten aus SVWS (ADR 003, 4.10). Entspricht `tLehrer` aus MA2 (Auszug). */
export interface Lehrkraft {
  id: number
  kuerzel: string
  nachname: string
  vorname: string
  /** TT.MM.JJJJ (SVWS liefert ISO, siehe `isoZuDatum`) */
  geburtsdatum: string
  /** LBV-Personalnummer, leer wenn nicht gepflegt */
  lbvNummer: string
  /** Vergütungsschlüssel, leer wenn nicht gepflegt */
  verguetungsschluessel: string
  /** Schlüssel des Rechtsverhältnisses im Abschnitt, z. B. "W" = Beamte auf Widerruf (LAA) */
  rechtsverhaeltnis: string
  /** Schlüssel der Beschäftigungsart im Abschnitt, z. B. "V", "T" */
  beschaeftigungsart: string
  /** Status für die Mehrarbeitstabelle: "W" bei Lehramtsanwärtern, sonst die Beschäftigungsart */
  status: string
}
