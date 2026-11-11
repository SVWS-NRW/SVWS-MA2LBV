import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Mehrarbeitszeile } from '@/models/Mehrarbeit'
import { pruefeArbeitsdaten, type Arbeitsdaten } from '@/models/Arbeitsdaten'
import type { Lehrkraft } from '@/models/Lehrkraft'
import type { LbvParameter } from '@/models/LbvParameter'
import type { ImportErgebnis } from '@/services/csvImport'
import { datenHinweise, istBereitsAufgenommen } from '@/services/lehrkraftMapper'
import { pruefeUndBereitVor, setzeMerkmaleAutomatisch, type ExportZeile, type FormularDaten } from '@/rules/pruefung'
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
  /** Name der geöffneten bzw. zuletzt gesicherten Arbeitsdatei */
  const arbeitsdatei = ref('')
  /** Ungesicherte Änderungen seit dem Öffnen, Sichern oder Anlegen */
  const geaendert = ref(false)
  /** Zähler aller Änderungen (auch Zellbearbeitung); Auslöser für das Speichern auf dem Server */
  const stand = ref(0)

  const hatZeitraum = computed(() => monate.value.every(m => m !== ''))
  // AG Grid ändert die Zeilenobjekte direkt (ohne Vue-Reaktivität); `revision` löst die Neuberechnung aus
  const markierteZeilen = computed(() => { void revision.value; return zeilen.value.filter(z => z.markiert) })
  const fehlerAnzahl = computed(() => { void revision.value; return zeilen.value.filter(z => z.hinweis.startsWith('Fehler')).length })

  function aenderung(): void { revision.value++; stand.value++; geaendert.value = true }

  /** Zelländerung in der Tabelle: nur als ungesichert vermerken, ohne die Tabelle neu zu zeichnen. */
  function zelleGeaendert(): void { geaendert.value = true; stand.value++ }

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
   * Prüft die markierten Zeilen und liefert die Formulardaten der fehlerfreien Zeilen (MA2: LBV-Export).
   * Setzt zuvor die Merkmale automatisch, wenn die Einstellung aktiv ist. Das Ergebnis steht in der Hinweisspalte.
   */
  function bereiteExportVor(parameter: LbvParameter, merkmalAutomatisch: boolean, heute = new Date()): { zeile: Mehrarbeitszeile; daten: FormularDaten }[] {
    const bereit: { zeile: Mehrarbeitszeile; daten: FormularDaten }[] = []
    for (const z of zeilen.value) {
      if (!z.markiert) continue
      let ez = alsExportZeile(z)
      if (merkmalAutomatisch) {
        ez = setzeMerkmaleAutomatisch(ez)
        z.monate = z.monate.map((m, i) => (monatAktiv.value[i] ? { ...m, merkmal: ez.monate[i].merkmal } : m))
      }
      const r = pruefeUndBereitVor(ez, parameter, heute)
      if (r.daten) { z.hinweis = 'kein Fehler gefunden'; bereit.push({ zeile: z, daten: r.daten }) } else { z.hinweis = r.fehler.join('\n') }
    }
    aenderung()
    return bereit
  }

  /** Prüft die markierten Zeilen ohne PDF-Erzeugung (MA2: LBV-Export im Modus "nur prüfen"). */
  function pruefe(parameter: LbvParameter, merkmalAutomatisch: boolean, heute = new Date()): { ok: number; fehler: number } {
    const ok = bereiteExportVor(parameter, merkmalAutomatisch, heute).length
    return { ok, fehler: markierteZeilen.value.length - ok }
  }

  function markiereExportiert(id: string, dateiname: string): void {
    const z = zeilen.value.find(x => x.id === id)
    if (z) z.hinweis = `Export nach ${dateiname}`
    aenderung()
  }

  /** Zustand für die Arbeitsdatei (ohne Zeilen-IDs). */
  function alsArbeitsdaten(): Arbeitsdaten {
    return {
      version: 1,
      zeilen: zeilen.value.map(({ id: _id, ...rest }) => ({ ...rest, monate: rest.monate.map(m => ({ ...m })) })),
      monate: [...monate.value], monatAktiv: [...monatAktiv.value], abrechnungsdatei: abrechnungsdatei.value,
    }
  }

  /** Ersetzt die Tabelle durch den Inhalt einer Arbeitsdatei; wirft bei ungültigem Aufbau, ohne etwas zu ändern. */
  function ladeArbeitsdaten(daten: unknown, dateiname: string): void {
    const d = pruefeArbeitsdaten(daten)
    monate.value = d.monate
    monatAktiv.value = d.monatAktiv
    abrechnungsdatei.value = d.abrechnungsdatei
    zeilen.value = d.zeilen.map(z => ({ ...z, id: neueId() }))
    arbeitsdatei.value = dateiname
    aenderung()
    geaendert.value = false
  }

  /** Entfernt alle Daten aus dem Speicher (beim Abmelden). */
  function zuruecksetzen(): void {
    zeilen.value = []
    monate.value = Array(6).fill('')
    monatAktiv.value = Array(6).fill(true)
    abrechnungsdatei.value = ''
    arbeitsdatei.value = ''
    aenderung()
    geaendert.value = false
  }

  function alsGesichert(dateiname: string): void {
    arbeitsdatei.value = dateiname
    geaendert.value = false
  }

  return {
    arbeitsdatei, geaendert, stand, zelleGeaendert, zuruecksetzen, alsArbeitsdaten, ladeArbeitsdaten, alsGesichert,
    zeilen, monate, monatAktiv, abrechnungsdatei, revision,
    hatZeitraum, markierteZeilen, fehlerAnzahl,
    aenderung, summe, setzeStartmonat, uebernehmeImport, uebernehmeLehrkraefte, fuegeZeileEin, loescheZeilen,
    leeren, loescheHinweise, markiere, setzeMonatAktiv, bereiteExportVor, pruefe, markiereExportiert,
  }
})
