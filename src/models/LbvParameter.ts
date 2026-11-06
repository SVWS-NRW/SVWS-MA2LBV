/** Schulweite Formulardaten der Änderungsmitteilung (ADR 003, 3.3). */
export interface LbvParameter {
  /** Mehrzeilig, Zeilenumbruch = neue Zeile im Formular */
  dienststelle: string
  aktenzeichen: string
  plzOrt: string
  eMail: string
  bearbeiter: string
  telefon: string
  nebenstelle: string
  schulnummer: string
  /** Schulform-Schlüssel (nur Lehramtsanwärter), z. B. "07" */
  schulform: string
  /** Minuten je Unterrichtsstunde, 5 Stellen mit 2 Nachkommastellen; leer = 45,00 */
  anzahlMinuten: string
  keineMehrarbeitWeitereSchule: boolean
  sachlichRichtig: string
  unterschrift: string
}

export interface Verhalten {
  merkmalAutomatisch: boolean
  spaltenfilter: boolean
}

export const LEERE_PARAMETER: LbvParameter = {
  dienststelle: '',
  aktenzeichen: '',
  plzOrt: '',
  eMail: '',
  bearbeiter: '',
  telefon: '',
  nebenstelle: '',
  schulnummer: '',
  schulform: '',
  anzahlMinuten: '',
  keineMehrarbeitWeitereSchule: true,
  sachlichRichtig: '',
  unterschrift: '',
}
