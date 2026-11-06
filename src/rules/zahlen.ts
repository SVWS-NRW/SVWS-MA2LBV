/** Hilfsfunktionen für Zahlen- und Datumsformate (ADR 003, 4.1 und 4.6). */

/** Wie Delphi `RealVal`: Dezimalkomma oder -punkt, ungültig/leer = 0. */
export function realVal(text: string): number {
  const n = parseFloat(String(text ?? '').trim().replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/**
 * Rundet wie Delphi `Round` (Bankers Rounding, .5 auf die nächste gerade Zahl).
 * `Math.round` würde 2,5 zu 3 runden, Delphi zu 2 (ADR 003, Offene Frage 3).
 */
export function rundeHalbGerade(wert: number): number {
  const floor = Math.floor(wert)
  const diff = wert - floor
  if (diff < 0.5) return floor
  if (diff > 0.5) return floor + 1
  return floor % 2 === 0 ? floor : floor + 1
}

export function fuelleLinks(text: string, laenge: number, zeichen = '0'): string {
  return text.length >= laenge ? text : zeichen.repeat(laenge - text.length) + text
}

/** Gültiges Datum im Format TT.MM.JJJJ. */
export function istGueltigesDatum(text: string): boolean {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text.trim())
  if (!m) return false
  const t = Number(m[1]), mo = Number(m[2]), j = Number(m[3])
  const d = new Date(j, mo - 1, t)
  return d.getFullYear() === j && d.getMonth() === mo - 1 && d.getDate() === t
}

/** Interner Monat "JJ/MM" → PDF-Format "MMJJ". */
export function monatFuerPdf(monat: string): string {
  const m = /^(\d{2})\/(\d{2})$/.exec(monat)
  return m ? m[2] + m[1] : monat
}

/** Interner Monat "JJ/MM" → Dateinamen-Format "JJMM". */
export function monatFuerDateiname(monat: string): string {
  const m = /^(\d{2})\/(\d{2})$/.exec(monat)
  return m ? m[1] + m[2] : monat
}

/** Abrechnungsdatei "MMJJ" bzw. "MJJ" (führende Null fehlt) → "JJ/MM"; sonst leer. */
export function monatAusDatei(text: string): string {
  let t = text.trim()
  if (t.length === 3) t = '0' + t
  return /^\d{4}$/.test(t) ? `${t.slice(2)}/${t.slice(0, 2)}` : ''
}

/** Ist der Monat "JJ/MM" gültig? Zukunft = erster Tag des Monats liegt nach `heute`. */
export function pruefeMonat(monat: string, heute: Date): 'ok' | 'ungueltig' | 'zukunft' {
  const m = /^(\d{2})\/(\d{2})$/.exec(monat)
  if (!m) return 'ungueltig'
  const mo = Number(m[2])
  if (mo < 1 || mo > 12) return 'ungueltig'
  const erster = new Date(2000 + Number(m[1]), mo - 1, 1)
  return erster.getTime() > heute.getTime() ? 'zukunft' : 'ok'
}

/** Die sechs Abrechnungsmonate ab einem Startmonat "JJ/MM" (`WaehleAbrechnungszeitraum`). */
export function sechsMonateAb(start: string): string[] {
  const m = /^(\d{2})\/(\d{2})$/.exec(start)
  if (!m) return Array(6).fill('')
  let j = Number(m[1])
  let mo = Number(m[2])
  const out: string[] = []
  for (let i = 0; i < 6; i++) {
    out.push(`${String(j).padStart(2, '0')}/${String(mo).padStart(2, '0')}`)
    mo++
    if (mo > 12) { mo = 1; j++ }
  }
  return out
}

/** Auswahl für den Startmonat: zwei Kalenderjahre zurück bis zum aktuellen Monat, wie in MA2. */
export function startmonatOptionen(heute: Date): { monat: string; text: string }[] {
  const lang = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
  const jahr = heute.getFullYear()
  const out: { monat: string; text: string }[] = []
  for (let j = jahr - 2; j <= jahr; j++) {
    const bis = j === jahr ? heute.getMonth() + 1 : 12
    for (let mo = 1; mo <= bis; mo++) {
      out.push({ monat: `${String(j - 2000).padStart(2, '0')}/${String(mo).padStart(2, '0')}`, text: `${lang[mo - 1]} ${j}` })
    }
  }
  return out
}
