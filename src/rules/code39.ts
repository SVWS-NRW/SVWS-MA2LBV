/**
 * Code 39 (Barcode des LBV auf der Änderungsmitteilung, ADR 003, 5.4).
 * Muster je Zeichen: 9 Elemente (Balken, Lücke, Balken, …), `w` = breit, `n` = schmal.
 */
const MUSTER: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw', '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn', F: 'nnwnwwnnn', G: 'nnnnnwwnw',
  H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn', K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww',
  O: 'wnnnwnnwn', P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn', U: 'wwnnnnnnw',
  V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn', Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn', $: 'nwnwnwnnn', '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn', '%': 'nnnwnwnwn',
}

export const BREIT_ZU_SCHMAL = 3

/** Wandelt Text in Code 39 um (Kleinbuchstaben werden groß geschrieben, Start/Stopp `*` werden ergänzt). */
export function code39Text(text: string): string {
  return `*${text.toUpperCase()}*`
}

/** Anzahl Module (schmale Einheiten) für `zeichen` Zeichen inklusive Lücken zwischen den Zeichen. */
export function code39Module(zeichen: number): number {
  return zeichen * (6 + 3 * BREIT_ZU_SCHMAL + 1) - 1
}

export interface Balken {
  /** Beginn in Modulen ab Anfang des Barcodes */
  start: number
  /** Breite in Modulen */
  breite: number
}

/** Liefert die schwarzen Balken in Modulen. Wirft einen Fehler bei nicht darstellbaren Zeichen. */
export function code39Balken(text: string): Balken[] {
  const balken: Balken[] = []
  let pos = 0
  for (const z of code39Text(text)) {
    const muster = MUSTER[z]
    if (!muster) throw new Error(`Zeichen "${z}" ist in Code 39 nicht darstellbar`)
    for (let i = 0; i < 9; i++) {
      const breite = muster[i] === 'w' ? BREIT_ZU_SCHMAL : 1
      if (i % 2 === 0) balken.push({ start: pos, breite })
      pos += breite
    }
    pos += 1 // Lücke zwischen den Zeichen
  }
  return balken
}

/** Gegenstück zum Prüfen: liest aus Balkenfolge (schwarz/weiß abwechselnd, Breiten in Modulen) den Text. */
export function code39Lesen(breiten: number[]): string {
  const umgekehrt = new Map(Object.entries(MUSTER).map(([k, v]) => [v, k]))
  const sym = breiten.map(b => (b > 2 ? 'w' : 'n')).join('')
  let out = ''
  for (let i = 0; i + 9 <= sym.length; i += 10) out += umgekehrt.get(sym.slice(i, i + 9)) ?? '?'
  return out
}
