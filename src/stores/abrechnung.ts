import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Mehrarbeitszeile } from '@/models/Mehrarbeit'
import type { Lehrkraft } from '@/models/Lehrkraft'
import type { LbvParameter } from '@/models/LbvParameter'
import type { ImportErgebnis } from '@/services/csvImport'
import { datenHinweise, istBereitsAufgenommen } from '@/services/lehrkraftMapper'
import { pruefeUndBereitVor, setzeMerkmaleAutomatisch, type ExportZeile } from '@/rules/pruefung'
import { realVal, sechsMonateAb } from '@/rules/zahlen'

let zaehler = 0
const neueId = () => `z${++zaehler}`
const leereMonate = () => Array.from({ length: 6 }, () => ({ stunden: '', merkmal: '' }))

export function leereZeile(): Mehrarbeitszeile {
  return {
    id: neueId(), markiert: true, nachname: '', vorname: '', geburtsdatum: '', lbvNummer: '',
    verguetungsschluessel: '', status: '', monate: leereMonate(), hinweis: '',
  }
}

/** Zeilen der Mehrarbeitstabelle samt Abrechnungszeitraum (ADR 002, O7; Delphi `asgMA`). */
export const useAbrechnungStore = defineStore('abrechnung', () => {
  const zeilen = ref<Mehrarbeitszeile[]>([])
  /** sechs Monate "JJ/MM"; leere Einträge = Zeitraum noch nicht festgelegt */
  const monate = ref<string[]>(Array(6).fill(''))
  const monatAktiv = ref<boolean[]>(Array(6).fill(true))
  const abrechnungsdatei = ref('')
  /** Wird bei jeder Zelländerung erhöht, damit die Tabelle neu zeichnet */
  const revision = ref(0)

  const hatZeitraum = computed(() => monate.value.every(m => m !== ''))
  const markierteZeilen = computed(() => zeilen.value.filter(z => z.markiert))
  const fehlerAnzahl = computed(() => zeilen.value.filter(z => z.hinweis.startsWith('Fehler')).length)

  function aenderung(): void { revision.value++ }

  function summe(z: Mehrarbeitszeile): number {
    return z.monate.reduce((s, m, i) => (monatAktiv.value[i] ? s + realVal(m.stunden) : s), 0)
  }

  /** Setzt den Abrechnungszeitraum; Stunden, Merkmale und Hinweise werden gelöscht (MA2: "Abrechnungszeitraum zuordnen"). */
  function setzeStartmonat(start: string): void {
    monate.value = sechsMonateAb(start)
    monatAktiv.value = Array(6).fill(true)
    for (const z of zeilen.value) { z.monate = leereMonate(); z.hinweis = '' }
    zeilen.value = [...zeilen.value]
    aenderung()
  }

  /** Ersetzt die Tabelle durch den Inhalt einer Abrechnungsdatei. */
  function uebernehmeImport(e: ImportErgebnis, dateiname: string, start?: string): void {
    monate.value = start ? sechsMonateAb(start) : [...e.monate]
    monatAktiv.value = Array(6).fill(true)
    abrechnungsdatei.value = dateiname
    zeilen.value = e.zeilen.map(z => ({
      ...leereZeile(),
      nachname: z.nachname, vorname: z.vorname, geburtsdatum: z.geburtsdatum, lbvNummer: z.lbvNummer,
      verguetungsschluessel: z.verguetungsschluessel, status: z.status,
      // Merkmale werden wie in MA2 in Großbuchstaben geführt
      monate: z.monate.map(m => ({ stunden: m.stunden, merkmal: m.merkmal.trim().toUpperCase() })),
    }))
    aenderung()
  }

  /** Übernimmt Lehrkräfte aus SVWS; bereits vorhandene (Name + Geburtsdatum) werden übersprungen. */
  function uebernehmeLehrkraefte(lehrkraefte: Lehrkraft[]): { neu: number; vorhanden: number } {
    let neu = 0
    let vorhanden = 0
    const ergebnis = [...zeilen.value]
    for (const lk of lehrkraefte) {
      if (istBereitsAufgenommen(lk, ergebnis)) { vorhanden++; continue }
      ergebnis.push({
        ...leereZeile(),
        nachname: lk.nachname, vorname: lk.vorname, geburtsdatum: lk.geburtsdatum, lbvNummer: lk.lbvNummer,
        verguetungsschluessel: lk.verguetungsschluessel, status: lk.status,
        hinweis: datenHinweise(lk).join('\n'),
      })
      neu++
    }
    ergebnis.sort((a, b) => a.nachname.localeCompare(b.nachname, 'de') || a.vorname.localeCompare(b.vorname, 'de'))
    zeilen.value = ergebnis
    aenderung()
    return { neu, vorhanden }
  }

  function fuegeZeileEin(nach?: string): string {
    const z = leereZeile()
    const i = nach ? zeilen.value.findIndex(x => x.id === nach) : -1
    const kopie = [...zeilen.value]
    kopie.splice(i >= 0 ? i + 1 : kopie.length, 0, z)
    zeilen.value = kopie
    aenderung()
    return z.id
  }

  function loescheZeilen(ids: string[]): void {
    const weg = new Set(ids)
    zeilen.value = zeilen.value.filter(z => !weg.has(z.id))
    aenderung()
  }

  function leeren(): void {
    zeilen.value = []
    abrechnungsdatei.value = ''
    monatAktiv.value = Array(6).fill(true)
    aenderung()
  }

  function loescheHinweise(ids?: string[]): void {
    const nur = ids ? new Set(ids) : null
    for (const z of zeilen.value) if (!nur || nur.has(z.id)) z.hinweis = ''
    aenderung()
  }

  /** Markierung: alle, keine oder umkehren (Strg+A / Strg+K / Strg+U in MA2). */
  function markiere(modus: 'alle' | 'keine' | 'umkehren'): void {
    for (const z of zeilen.value) z.markiert = modus === 'alle' ? true : modus === 'keine' ? false : !z.markiert
    aenderung()
  }

  function setzeMonatAktiv(index: number, aktiv: boolean): void {
    monatAktiv.value = monatAktiv.value.map((a, i) => (i === index ? aktiv : a))
    aenderung()
  }

  function alsExportZeile(z: Mehrarbeitszeile): ExportZeile {
    return {
      nachname: z.nachname, vorname: z.vorname, geburtsdatum: z.geburtsdatum, lbvNummer: z.lbvNummer,
      verguetungsschluessel: z.verguetungsschluessel, status: z.status,
      monate: z.monate.map((m, i) => ({ monat: monate.value[i], stunden: m.stunden, merkmal: m.merkmal, aktiv: monatAktiv.value[i] })),
    }
  }

  /**
   * Prüft die markierten Zeilen (MA2: LBV-Export im Modus "nur prüfen").
   * Setzt zuvor die Merkmale automatisch, wenn die Einstellung aktiv ist.
   */
  function pruefe(parameter: LbvParameter, merkmalAutomatisch: boolean, heute = new Date()): { ok: number; fehler: number } {
    let ok = 0
    let fehler = 0
    for (const z of zeilen.value) {
      if (!z.markiert) continue
      let ez = alsExportZeile(z)
      if (merkmalAutomatisch) {
        ez = setzeMerkmaleAutomatisch(ez)
        z.monate = z.monate.map((m, i) => (monatAktiv.value[i] ? { ...m, merkmal: ez.monate[i].merkmal } : m))
      }
      const r = pruefeUndBereitVor(ez, parameter, heute)
      if (r.fehler.length > 0) { z.hinweis = r.fehler.join('\n'); fehler++ } else { z.hinweis = 'kein Fehler gefunden'; ok++ }
    }
    aenderung()
    return { ok, fehler }
  }

  return {
    zeilen, monate, monatAktiv, abrechnungsdatei, revision,
    hatZeitraum, markierteZeilen, fehlerAnzahl,
    aenderung, summe, setzeStartmonat, uebernehmeImport, uebernehmeLehrkraefte, fuegeZeileEin, loescheZeilen,
    leeren, loescheHinweise, markiere, setzeMonatAktiv, pruefe,
  }
})
