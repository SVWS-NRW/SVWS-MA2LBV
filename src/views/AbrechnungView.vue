<template>
  <div class="abrechnung">
    <header class="kopf">
      <div class="kopf-links">
        <Button icon="pi pi-arrow-left" severity="secondary" text rounded aria-label="Zurück zum Dashboard" @click="router.push({ name: 'dashboard' })" />
        <h1>Mehrarbeit abrechnen</h1>
      </div>
      <div class="kopf-stats" aria-live="polite">
        <span><strong>{{ store.zeilen.length }}</strong> Lehrkräfte</span>
        <span><strong>{{ store.markierteZeilen.length }}</strong> markiert</span>
        <span v-if="store.fehlerAnzahl > 0" class="stat-fehler"><strong>{{ store.fehlerAnzahl }}</strong> mit Fehlern</span>
      </div>
      <div class="kopf-rechts">
        <ThemeToggle />
      </div>
    </header>

    <div class="leiste" role="toolbar" aria-label="Aktionen">
      <div class="gruppe">
        <Button label="Importieren" icon="pi pi-angle-down" iconPos="right" size="small" severity="secondary" aria-haspopup="true" @click="importMenu?.toggle($event)" />
        <Menu ref="importMenu" :model="importItems" popup />
        <Button label="Zeitraum" icon="pi pi-calendar" size="small" severity="secondary" @click="zeitraumOeffnen" />
      </div>
      <div class="gruppe">
        <Button label="Zeile" icon="pi pi-plus" size="small" severity="secondary" aria-label="Zeile einfügen" @click="zeileEinfuegen" />
        <Button label="Zeile" icon="pi pi-minus" size="small" severity="secondary" aria-label="Zeile löschen" :disabled="store.zeilen.length === 0" @click="zeileLoeschen" />
        <Button label="Hinweise löschen" icon="pi pi-eraser" size="small" severity="secondary" text :disabled="store.zeilen.length === 0" @click="store.loescheHinweise()" />
        <Button label="Leeren" icon="pi pi-trash" size="small" severity="danger" text :disabled="store.zeilen.length === 0" @click="bestaetigeLeeren" />
      </div>
      <div class="gruppe">
        <!-- Ohne SVWS-Verbindung ist die Datei die einzige Speicherung und bleibt sichtbar; sonst genügt ein Menü -->
        <Button v-if="!auth.isConnected" label="Sichern" icon="pi pi-save" size="small" severity="secondary" aria-label="Arbeitsdatei sichern (Strg+S)" :disabled="store.zeilen.length === 0" @click="sichernOeffnen" />
        <template v-else>
          <Button label="Sicherung" icon="pi pi-angle-down" iconPos="right" size="small" severity="secondary" aria-haspopup="true" @click="sicherungMenu?.toggle($event)" />
          <Menu ref="sicherungMenu" :model="sicherungItems" popup />
        </template>
      </div>
      <div class="gruppe gruppe--rechts">
        <Button label="Prüfen" icon="pi pi-verified" size="small" severity="secondary" :disabled="store.markierteZeilen.length === 0 || exportiert" @click="pruefen" />
        <Button
          label="PDF exportieren"
          icon="pi pi-file-pdf"
          iconPos="left"
          size="small"
          :loading="exportiert"
          :disabled="store.markierteZeilen.length === 0 || exportiert"
          aria-haspopup="true"
          @click="exportMenu?.toggle($event)"
        />
        <Menu ref="exportMenu" :model="exportItems" popup />
      </div>
    </div>

    <Message v-if="!store.hatZeitraum" severity="info" :closable="false" class="meldung">
      Der Abrechnungszeitraum ist noch nicht festgelegt.
      <Button label="Zeitraum festlegen" size="small" text @click="zeitraumOeffnen" />
    </Message>

    <div
      class="tabelle-bereich"
      :class="{ 'tabelle-bereich--drag': dragAktiv }"
      @dragenter.prevent="dragEin"
      @dragover.prevent
      @dragleave="dragAus"
      @drop.prevent="abgelegt"
    >
      <MehrarbeitTabelle v-if="store.zeilen.length > 0" ref="tabelle" />

      <div v-else class="leer">
        <h2>Womit möchtest du beginnen?</h2>
        <div class="kacheln">
          <button type="button" class="kachel" :disabled="!auth.isConnected" @click="lehrkraefteOeffnen">
            <i class="pi pi-users" />
            <strong>Lehrkräfte aus SVWS</strong>
            <span>{{ auth.isConnected ? 'Lehrkräfte auswählen, Stunden trägst du danach ein' : 'Nur mit SVWS-Verbindung möglich' }}</span>
          </button>
          <button type="button" class="kachel" @click="dateiWaehlen">
            <i class="pi pi-file-import" />
            <strong>Abrechnungsdatei importieren</strong>
            <span>Untis- oder CSV-Datei mit Mehrarbeitsstunden einlesen</span>
          </button>
          <button type="button" class="kachel" @click="arbeitsdateiWaehlen">
            <i class="pi pi-folder-open" />
            <strong>Gesicherte Datei öffnen</strong>
            <span>Verschlüsselte Arbeitsdatei (.ma2lbv) laden</span>
          </button>
        </div>
        <p class="leer-hinweis">
          Du kannst eine Datei auch auf diese Fläche ziehen oder mit „Zeile +“ von Hand beginnen.
          <template v-if="auth.isConnected">Deine Daten werden automatisch auf dem SVWS-Server gespeichert.</template>
        </p>
      </div>

      <div v-if="dragAktiv" class="drop-hinweis" aria-hidden="true"><i class="pi pi-upload" /> Datei hier ablegen</div>
    </div>

    <footer class="fuss">
      <ServerStatus />
      <span v-if="!sync.aktiv || store.arbeitsdatei"><i class="pi pi-save" /> Arbeitsdatei: {{ store.arbeitsdatei || 'nicht gesichert' }}<template v-if="store.geaendert && store.zeilen.length > 0"> *</template></span>
      <span><i class="pi pi-file" /> Abrechnung: {{ store.abrechnungsdatei || '–' }}</span>
      <span><i class="pi pi-calendar" /> Zeitraum: {{ zeitraumText }}</span>
    </footer>

    <input ref="dateiInput" type="file" accept=".txt,.csv,text/plain,text/csv" class="versteckt" @change="dateiGewaehlt" />
    <input ref="arbeitsInput" type="file" :accept="dateiEndung" class="versteckt" @change="arbeitsdateiGewaehlt" />

    <PassphraseDialog
      :visible="passphrase.offen"
      :modus="passphrase.modus"
      :dateiname="passphrase.dateiname"
      :fehler="passphrase.fehler"
      :laeuft="passphrase.laeuft"
      @bestaetigt="passphraseBestaetigt"
      @abbrechen="passphrase.offen = false; passphrase.inhalt = ''"
    />
    <StartmonatDialog
      :visible="startmonat.offen"
      :warnung="startmonat.warnung"
      :vorgabe="store.monate[0] || undefined"
      @bestaetigt="startmonatBestaetigt"
      @abbrechen="startmonat.offen = false; startmonat.danach = null"
    />
    <LehrkraefteDialog
      :visible="lehrkraefte.offen"
      :idAbschnitt="auth.idSchuljahresabschnitt"
      :vorhanden="store.zeilen"
      @bestaetigt="lehrkraefteUebernehmen"
      @abbrechen="lehrkraefte.offen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useUngespeichert } from '@/composables/useUngespeichert'
import { useBestaetigung } from '@/composables/useBestaetigung'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import ThemeToggle from '@/components/ThemeToggle.vue'
import MehrarbeitTabelle from '@/components/abrechnung/MehrarbeitTabelle.vue'
import StartmonatDialog from '@/components/abrechnung/StartmonatDialog.vue'
import LehrkraefteDialog from '@/components/abrechnung/LehrkraefteDialog.vue'
import PassphraseDialog from '@/components/abrechnung/PassphraseDialog.vue'
import ServerStatus from '@/components/ServerStatus.vue'
import { useAbrechnungStore } from '@/stores/abrechnung'
import { useAuthStore } from '@/stores/auth'
import { useEinstellungenStore } from '@/stores/einstellungen'
import { useServerSyncStore } from '@/stores/serverSync'
import { dekodiereDatei, ImportFehler, leseAbrechnung, type ImportErgebnis } from '@/services/csvImport'
import { alsDatei, erzeugeAllePdfs, sammelPdf } from '@/services/exportAblauf'
import { VorlagenFehler } from '@/services/pdfExport'
import { DATEI_ENDUNG, DateiFehler, entschluessele, FalschePassphrase, verschluessele } from '@/services/dateiVerschluesselung'
import { ArbeitsdatenFehler } from '@/models/Arbeitsdaten'
import { oeffneFensterVorab, speichereDatei, zeigePdf } from '@/utils/datei'
import type { Lehrkraft } from '@/models/Lehrkraft'

const router = useRouter()
const store = useAbrechnungStore()
const auth = useAuthStore()
const einstellungen = useEinstellungenStore()
const sync = useServerSyncStore()
const { offeneAenderungen } = useUngespeichert()
const frage = useBestaetigung()

// Warnung beim Verlassen der Abrechnung. Mit Serververbindung wird zuerst gespeichert; gefragt wird nur bei Problemen.
onBeforeRouteLeave(async () => {
  const offen = await offeneAenderungen()
  if (!offen) return true
  return frage({
    titel: 'Abrechnung verlassen?',
    text: auth.isConnected
      ? `${offen}. Sie bleiben im Programm erhalten, solange du es nicht schließt oder dich abmeldest.`
      : `${offen}. Sie bleiben im Programm erhalten, gehen aber verloren, wenn du dich abmeldest oder das Programm schließt.`,
    ja: 'Trotzdem verlassen',
    nein: 'Hier bleiben',
  })
})
const confirm = useConfirm()
const toast = useToast()

const tabelle = ref<InstanceType<typeof MehrarbeitTabelle> | null>(null)
const dateiInput = ref<HTMLInputElement | null>(null)
const exportMenu = ref<InstanceType<typeof Menu> | null>(null)
const importMenu = ref<InstanceType<typeof Menu> | null>(null)
const sicherungMenu = ref<InstanceType<typeof Menu> | null>(null)
const dragZaehler = ref(0)
const dragAktiv = computed(() => dragZaehler.value > 0)
const exportiert = ref(false)
const arbeitsInput = ref<HTMLInputElement | null>(null)
const dateiEndung = DATEI_ENDUNG
const passphrase = reactive({ offen: false, modus: 'sichern' as 'sichern' | 'oeffnen', dateiname: '', inhalt: '', fehler: '', laeuft: false })

const startmonat = reactive<{ offen: boolean; warnung: string; danach: ((start: string) => void) | null }>({ offen: false, warnung: '', danach: null })
const lehrkraefte = reactive({ offen: false })

const exportItems = [
  { label: 'PDF-Dateien speichern', icon: 'pi pi-download', command: () => exportieren('speichern') },
  { label: 'Zum Drucken öffnen', icon: 'pi pi-print', command: () => exportieren('drucken') },
]

const importItems = computed(() => [
  { label: 'Lehrkräfte aus SVWS', icon: 'pi pi-users', disabled: !auth.isConnected, command: () => lehrkraefteOeffnen() },
  { label: 'Abrechnungsdatei (Untis/CSV) …', icon: 'pi pi-file-import', command: () => dateiWaehlen() },
  { separator: true },
  { label: 'Gesicherte Arbeitsdatei (.ma2lbv) …', icon: 'pi pi-folder-open', command: () => arbeitsdateiWaehlen() },
])

const sicherungItems = computed(() => [
  { label: 'Jetzt auf dem SVWS-Server speichern', icon: 'pi pi-cloud-upload', shortcut: 'Strg+S', command: () => { void jetztSpeichern() } },
  { label: 'Sicherung in Datei speichern (verschlüsselt) …', icon: 'pi pi-save', disabled: store.zeilen.length === 0, command: () => sichernOeffnen() },
])

const zeitraumText = computed(() => {
  if (!store.hatZeitraum) return 'nicht festgelegt'
  const f = (m: string) => `${m.slice(3)}/20${m.slice(0, 2)}`
  return `${f(store.monate[0])} – ${f(store.monate[5])}`
})

/** Zeitraum für Dateinamen: JJMM-JJMM */
const zeitraumDatei = computed(() => (store.hatZeitraum ? `${store.monate[0].replace('/', '')}-${store.monate[5].replace('/', '')}` : 'Mehrarbeit'))

/** Fragt nach, bevor vorhandene Daten ersetzt werden. */
function bestaetige(nachricht: string, titel: string, aktion: () => void): void {
  confirm.require({
    header: titel, message: nachricht, icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Ja', rejectLabel: 'Abbrechen', accept: aktion,
  })
}

// ── Abrechnungsdatei ─────────────────────────────────────────────────────────

function dateiWaehlen(): void {
  dateiInput.value?.click()
}

async function dateiGewaehlt(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const datei = input.files?.[0]
  input.value = ''
  if (datei) await verarbeiteAbrechnungsdatei(datei)
}

async function verarbeiteAbrechnungsdatei(datei: File): Promise<void> {
  let ergebnis: ImportErgebnis
  try {
    ergebnis = leseAbrechnung(dekodiereDatei(new Uint8Array(await datei.arrayBuffer())))
  } catch (err) {
    const text = err instanceof ImportFehler ? err.message : 'Die Datei konnte nicht gelesen werden.'
    toast.add({ severity: 'error', summary: 'Import', detail: `${datei.name}: ${text}`, life: 7000 })
    return
  }
  const uebernehmen = () => {
    if (ergebnis.monate.some(m => m === '')) {
      // Die Datei enthält keine Monatsangaben: Startmonat erfragen (wie MA2)
      startmonat.warnung = 'Die Datei enthält keine Monatsangaben.'
      startmonat.danach = (start) => importieren(ergebnis, datei.name, start)
      startmonat.offen = true
    } else {
      importieren(ergebnis, datei.name)
    }
  }
  if (store.zeilen.length > 0) {
    bestaetige(`Die vorhandenen ${store.zeilen.length} Zeilen werden durch den Inhalt von „${datei.name}“ ersetzt.`, 'Abrechnungsdaten importieren?', uebernehmen)
  } else {
    uebernehmen()
  }
}

function importieren(ergebnis: ImportErgebnis, name: string, start?: string): void {
  store.uebernehmeImport(ergebnis, name, start)
  toast.add({ severity: 'success', summary: 'Import', detail: `${ergebnis.zeilen.length} Lehrkräfte aus „${name}“ übernommen.`, life: 4000 })
  if (ergebnis.warnungen.length > 0) {
    toast.add({ severity: 'warn', summary: 'Hinweise zum Import', detail: ergebnis.warnungen.join('\n'), life: 10000 })
  }
}

// ── Abrechnungszeitraum ──────────────────────────────────────────────────────

function zeitraumOeffnen(): void {
  const setzen = () => {
    startmonat.warnung = store.zeilen.length > 0 ? 'Alle Stunden, Merkmale und Hinweise werden gelöscht.' : ''
    startmonat.danach = (start) => store.setzeStartmonat(start)
    startmonat.offen = true
  }
  setzen()
}

function startmonatBestaetigt(start: string): void {
  const danach = startmonat.danach
  startmonat.offen = false
  startmonat.danach = null
  danach?.(start)
}

// ── Lehrkräfte aus SVWS ──────────────────────────────────────────────────────

function lehrkraefteOeffnen(): void {
  if (!store.hatZeitraum) {
    // Ohne Zeitraum gibt es keine Monatsspalten: zuerst festlegen
    startmonat.warnung = ''
    startmonat.danach = (start) => { store.setzeStartmonat(start); lehrkraefte.offen = true }
    startmonat.offen = true
    return
  }
  lehrkraefte.offen = true
}

function lehrkraefteUebernehmen(liste: Lehrkraft[]): void {
  lehrkraefte.offen = false
  const r = store.uebernehmeLehrkraefte(liste)
  toast.add({
    severity: 'success', summary: 'Lehrkräfte aus SVWS', life: 5000,
    detail: `${r.neu} übernommen${r.vorhanden > 0 ? `, ${r.vorhanden} bereits vorhanden` : ''}. Stunden und Merkmale bitte in der Tabelle eintragen.`,
  })
}

// ── Bearbeiten ───────────────────────────────────────────────────────────────

async function zeileEinfuegen(): Promise<void> {
  const id = store.fuegeZeileEin(tabelle.value?.fokussierteZeileId() ?? undefined)
  await nextTick()
  tabelle.value?.fokusAufZeile(id)
}

function zeileLoeschen(): void {
  const id = tabelle.value?.fokussierteZeileId()
  if (!id) {
    toast.add({ severity: 'info', summary: 'Zeile löschen', detail: 'Bitte zuerst eine Zelle der Zeile anklicken.', life: 4000 })
    return
  }
  store.loescheZeilen([id])
}

function bestaetigeLeeren(): void {
  bestaetige('Alle Zeilen der Tabelle verwerfen? Der Abrechnungszeitraum bleibt erhalten.', 'Tabelle leeren', () => store.leeren())
}

// ── Prüfen ───────────────────────────────────────────────────────────────────

function pruefen(): void {
  const r = store.pruefe(einstellungen.parameter, einstellungen.verhalten.merkmalAutomatisch)
  if (r.fehler === 0) {
    toast.add({ severity: 'success', summary: 'Prüfung', detail: `${r.ok} Zeilen ohne Fehler.`, life: 4000 })
  } else {
    toast.add({ severity: 'warn', summary: 'Prüfung', detail: `${r.ok} ohne Fehler, ${r.fehler} mit Fehlern. Details in der Spalte „Hinweis(e)“.`, life: 7000 })
  }
}

// ── Arbeitsdatei sichern und öffnen ─────────────────────────────────────────

function sichernOeffnen(): void {
  if (store.zeilen.length === 0) return
  passphrase.modus = 'sichern'
  passphrase.fehler = ''
  passphrase.offen = true
}

function arbeitsdateiWaehlen(): void {
  arbeitsInput.value?.click()
}

async function arbeitsdateiGewaehlt(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const datei = input.files?.[0]
  input.value = ''
  if (datei) await verarbeiteArbeitsdatei(datei)
}

async function verarbeiteArbeitsdatei(datei: File): Promise<void> {
  const inhalt = await datei.text()
  const weiter = () => {
    passphrase.modus = 'oeffnen'
    passphrase.dateiname = datei.name
    passphrase.inhalt = inhalt
    passphrase.fehler = ''
    passphrase.offen = true
  }
  if (store.geaendert && store.zeilen.length > 0) {
    bestaetige('Die Tabelle enthält ungesicherte Änderungen. Sie gehen verloren, wenn du die Arbeitsdatei öffnest.', 'Arbeitsdatei öffnen?', weiter)
  } else {
    weiter()
  }
}

async function passphraseBestaetigt(pw: string): Promise<void> {
  passphrase.laeuft = true
  passphrase.fehler = ''
  try {
    if (passphrase.modus === 'sichern') {
      const inhalt = await verschluessele(store.alsArbeitsdaten(), pw)
      const name = `mehrarbeit_${zeitraumDatei.value}${DATEI_ENDUNG}`
      speichereDatei(name, new TextEncoder().encode(inhalt), 'application/octet-stream')
      store.alsGesichert(name)
      passphrase.offen = false
      toast.add({ severity: 'success', summary: 'Arbeitsdatei', detail: `Gesichert als „${name}“. Bitte die Passphrase gut aufbewahren.`, life: 6000 })
    } else {
      store.ladeArbeitsdaten(await entschluessele(passphrase.inhalt, pw), passphrase.dateiname)
      passphrase.offen = false
      passphrase.inhalt = ''
      toast.add({ severity: 'success', summary: 'Arbeitsdatei', detail: `„${passphrase.dateiname}“ geöffnet (${store.zeilen.length} Zeilen).`, life: 4000 })
    }
  } catch (err) {
    // Bei falscher Passphrase bleibt der Dialog offen, damit sie erneut eingegeben werden kann
    if (err instanceof FalschePassphrase) passphrase.fehler = err.message
    else if (err instanceof DateiFehler || err instanceof ArbeitsdatenFehler) { passphrase.offen = false; toast.add({ severity: 'error', summary: 'Arbeitsdatei', detail: err.message, life: 8000 }) }
    else { console.error('[arbeitsdatei]', err); passphrase.fehler = 'Die Arbeitsdatei konnte nicht verarbeitet werden.' }
  } finally {
    passphrase.laeuft = false
  }
}

// ── Dateien ablegen ─────────────────────────────────────────────────────────

const hatDateien = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files')

function dragEin(e: DragEvent): void {
  if (hatDateien(e)) dragZaehler.value++
}

function dragAus(e: DragEvent): void {
  if (hatDateien(e) && dragZaehler.value > 0) dragZaehler.value--
}

/** Erkennt den Dateityp an der Endung (Abrechnungsdatei oder gesicherte Arbeitsdatei). */
async function abgelegt(e: DragEvent): Promise<void> {
  dragZaehler.value = 0
  const dateien = [...(e.dataTransfer?.files ?? [])]
  if (dateien.length === 0) return
  if (dateien.length > 1) {
    toast.add({ severity: 'warn', summary: 'Datei ablegen', detail: 'Bitte nur eine Datei auf einmal ablegen.', life: 5000 })
    return
  }
  const datei = dateien[0]
  const name = datei.name.toLowerCase()
  if (name.endsWith(DATEI_ENDUNG)) await verarbeiteArbeitsdatei(datei)
  else if (/\.(txt|csv)$/.test(name)) await verarbeiteAbrechnungsdatei(datei)
  else toast.add({ severity: 'warn', summary: 'Datei ablegen', detail: `„${datei.name}“ wird nicht unterstützt. Möglich sind Abrechnungsdateien (.txt, .csv) und Arbeitsdateien (${DATEI_ENDUNG}).`, life: 7000 })
}

// ── Speichern auf dem SVWS-Server ────────────────────────────────────────────

async function jetztSpeichern(): Promise<void> {
  await sync.speichereJetzt()
  if (sync.status === 'gespeichert') toast.add({ severity: 'success', summary: 'SVWS-Server', detail: 'Alle Daten sind auf dem SVWS-Server gespeichert.', life: 3000 })
  else if (sync.status === 'fehler') toast.add({ severity: 'error', summary: 'SVWS-Server', detail: sync.fehler, life: 7000 })
}

// ── PDF-Export ───────────────────────────────────────────────────────────────

/**
 * Prüft die markierten Zeilen und erzeugt für die fehlerfreien die Änderungsmitteilung.
 * "speichern": eine PDF-Datei je Lehrkraft (bei mehreren als ZIP). "drucken": ein Sammel-PDF zum Ausdrucken.
 */
async function exportieren(modus: 'speichern' | 'drucken'): Promise<void> {
  // Fenster muss im Klick geöffnet werden, sonst blockiert der Browser es
  const fenster = modus === 'drucken' ? oeffneFensterVorab() : null
  exportiert.value = true
  try {
    const bereit = store.bereiteExportVor(einstellungen.parameter, einstellungen.verhalten.merkmalAutomatisch)
    const fehler = store.markierteZeilen.length - bereit.length
    if (bereit.length === 0) {
      fenster?.close()
      toast.add({ severity: 'warn', summary: 'PDF-Export', detail: 'Keine Zeile ohne Fehler. Details in der Spalte „Hinweis(e)“.', life: 7000 })
      return
    }
    const pdfs = await erzeugeAllePdfs(bereit.map(b => ({ id: b.zeile.id, daten: b.daten })), einstellungen.parameter, { einbrennen: modus === 'drucken' })
    if (modus === 'speichern') {
      const d = alsDatei(pdfs, `LBV_Mehrarbeit_${zeitraumDatei.value}.zip`)
      speichereDatei(d.name, d.bytes, d.mime)
      for (const p of pdfs) store.markiereExportiert(p.id, p.name)
    } else {
      zeigePdf(fenster, 'LBV_Mehrarbeit.pdf', await sammelPdf(pdfs))
      for (const p of pdfs) store.markiereExportiert(p.id, 'Druckansicht')
    }
    toast.add({
      severity: fehler > 0 ? 'warn' : 'success', summary: 'PDF-Export', life: fehler > 0 ? 8000 : 4000,
      detail: `${pdfs.length} Änderungsmitteilung${pdfs.length === 1 ? '' : 'en'} erzeugt${fehler > 0 ? `, ${fehler} Zeile${fehler === 1 ? '' : 'n'} mit Fehlern (siehe Hinweise)` : ''}.`,
    })
  } catch (e) {
    fenster?.close()
    const text = e instanceof VorlagenFehler ? e.message : 'Das PDF konnte nicht erzeugt werden.'
    console.error('[pdf]', e)
    toast.add({ severity: 'error', summary: 'PDF-Export', detail: text, life: 8000 })
  } finally {
    exportiert.value = false
  }
}

// ── Tastenkürzel und Schutz vor Datenverlust ─────────────────────────────────

function onKey(e: KeyboardEvent): void {
  if (!e.ctrlKey || e.altKey || e.shiftKey) return
  if (e.key.toLowerCase() === 's') {
    e.preventDefault()
    // Mit Serververbindung: sofort auf dem Server speichern; sonst die Sicherungsdatei anlegen
    if (auth.isConnected && sync.aktiv) void jetztSpeichern()
    else sichernOeffnen()
    return
  }
  const ziel = e.target as HTMLElement | null
  // In Textfeldern gehören Strg+A usw. dem Feld (Text markieren); Checkboxen sind davon ausgenommen
  const textfeld = ziel && ((ziel.tagName === 'INPUT' && (ziel as HTMLInputElement).type !== 'checkbox') || ziel.tagName === 'TEXTAREA' || ziel.isContentEditable)
  if (textfeld) return
  const modus = ({ a: 'alle', k: 'keine', u: 'umkehren' } as const)[e.key.toLowerCase() as 'a' | 'k' | 'u']
  if (!modus) return
  e.preventDefault()
  store.markiere(modus)
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  // Wie MA2 beim ersten Start: Abrechnungszeitraum erfragen
  if (!store.hatZeitraum && store.zeilen.length === 0) zeitraumOeffnen()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.abrechnung {
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
}
.kopf { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.kopf-links { display: flex; align-items: center; gap: 0.5rem; }
.kopf h1 { margin: 0; font-size: 1.75rem; }
.kopf-stats { display: flex; gap: 1rem; color: var(--p-text-muted-color); font-size: 0.95rem; }
.kopf-stats strong { color: var(--app-ink); }
.stat-fehler, .stat-fehler strong { color: var(--ma-fehler); }
.kopf-rechts { margin-left: auto; display: flex; align-items: center; gap: 0.5rem; }

.leiste {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  padding: 0.5rem 0.75rem;
  background: var(--surface);
  border: 1px solid var(--app-border);
  border-radius: 10px;
}
.gruppe { display: flex; align-items: center; flex-wrap: wrap; gap: 0.4rem; }
.gruppe--rechts { margin-left: auto; }
.tip { display: inline-flex; }
.meldung { margin: 0; }
.tabelle-bereich { flex: 1; display: flex; flex-direction: column; min-height: 360px; position: relative; }
.tabelle-bereich--drag { outline: 2px dashed var(--accent); outline-offset: 2px; border-radius: 8px; }
.drop-hinweis {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-radius: 8px;
  pointer-events: none;
}
.leer {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  padding: 2rem;
  background: var(--surface);
  border: 1px dashed var(--app-border);
  border-radius: 12px;
}
.leer h2 { margin: 0; font-size: 1.35rem; }
.kacheln { display: grid; grid-template-columns: repeat(3, minmax(0, 17rem)); gap: 1rem; }
@media (max-width: 960px) { .kacheln { grid-template-columns: 1fr; } }
.kachel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  padding: 1.25rem;
  text-align: left;
  font: inherit;
  color: inherit;
  background: var(--p-content-background, var(--surface));
  border: 1px solid var(--p-content-border-color, var(--app-border));
  border-radius: 0.75rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}
.kachel i { font-size: 1.6rem; color: var(--accent); }
.kachel span { font-size: 0.9rem; color: var(--p-text-muted-color); }
.kachel:hover:not(:disabled) { border-color: var(--p-primary-color); background: var(--p-highlight-background); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
.kachel:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.kachel:disabled { cursor: not-allowed; opacity: 0.45; }
.leer-hinweis { margin: 0; max-width: 40rem; text-align: center; font-size: 0.9rem; color: var(--p-text-muted-color); }
.fuss {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}
.fuss i { margin-right: 0.3rem; }
.versteckt { display: none; }
</style>
