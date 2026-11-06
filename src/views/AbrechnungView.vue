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
        <Button label="Abrechnungsdatei einlesen" icon="pi pi-folder-open" size="small" severity="secondary" @click="dateiWaehlen" />
        <span v-tooltip.bottom="auth.isConnected ? '' : 'Nur mit SVWS-Verbindung möglich'" class="tip">
          <Button label="Lehrkräfte aus SVWS" icon="pi pi-users" size="small" severity="secondary" :disabled="!auth.isConnected" @click="lehrkraefteOeffnen" />
        </span>
        <Button label="Zeitraum" icon="pi pi-calendar" size="small" severity="secondary" @click="zeitraumOeffnen" />
      </div>
      <div class="gruppe">
        <Button label="Zeile" icon="pi pi-plus" size="small" severity="secondary" aria-label="Zeile einfügen" @click="zeileEinfuegen" />
        <Button label="Zeile" icon="pi pi-minus" size="small" severity="secondary" aria-label="Zeile löschen" :disabled="store.zeilen.length === 0" @click="zeileLoeschen" />
        <Button label="Markierung" icon="pi pi-check-square" size="small" severity="secondary" aria-haspopup="true" @click="markierungMenu?.toggle($event)" />
        <Menu ref="markierungMenu" :model="markierungItems" popup />
        <Button label="Hinweise löschen" icon="pi pi-eraser" size="small" severity="secondary" text :disabled="store.zeilen.length === 0" @click="store.loescheHinweise()" />
        <Button label="Leeren" icon="pi pi-trash" size="small" severity="danger" text :disabled="store.zeilen.length === 0" @click="bestaetigeLeeren" />
      </div>
      <div class="gruppe gruppe--rechts">
        <Button label="Prüfen" icon="pi pi-verified" size="small" :disabled="store.markierteZeilen.length === 0" @click="pruefen" />
      </div>
    </div>

    <Message v-if="!store.hatZeitraum" severity="info" :closable="false" class="meldung">
      Der Abrechnungszeitraum ist noch nicht festgelegt.
      <Button label="Zeitraum festlegen" size="small" text @click="zeitraumOeffnen" />
    </Message>

    <MehrarbeitTabelle ref="tabelle" />

    <footer class="fuss">
      <span><i class="pi pi-file" /> Abrechnung: {{ store.abrechnungsdatei || '–' }}</span>
      <span><i class="pi pi-calendar" /> Zeitraum: {{ zeitraumText }}</span>
      <span v-if="!auth.isConnected"><i class="pi pi-info-circle" /> Ohne SVWS-Verbindung</span>
    </footer>

    <input ref="dateiInput" type="file" accept=".txt,.csv,text/plain,text/csv" class="versteckt" @change="dateiGewaehlt" />
    <ConfirmDialog />

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
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import Message from 'primevue/message'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import ThemeToggle from '@/components/ThemeToggle.vue'
import MehrarbeitTabelle from '@/components/abrechnung/MehrarbeitTabelle.vue'
import StartmonatDialog from '@/components/abrechnung/StartmonatDialog.vue'
import LehrkraefteDialog from '@/components/abrechnung/LehrkraefteDialog.vue'
import { useAbrechnungStore } from '@/stores/abrechnung'
import { useAuthStore } from '@/stores/auth'
import { useEinstellungenStore } from '@/stores/einstellungen'
import { dekodiereDatei, ImportFehler, leseAbrechnung, type ImportErgebnis } from '@/services/csvImport'
import type { Lehrkraft } from '@/models/Lehrkraft'

const router = useRouter()
const store = useAbrechnungStore()
const auth = useAuthStore()
const einstellungen = useEinstellungenStore()
const confirm = useConfirm()
const toast = useToast()

const tabelle = ref<InstanceType<typeof MehrarbeitTabelle> | null>(null)
const dateiInput = ref<HTMLInputElement | null>(null)
const markierungMenu = ref<InstanceType<typeof Menu> | null>(null)

const startmonat = reactive<{ offen: boolean; warnung: string; danach: ((start: string) => void) | null }>({ offen: false, warnung: '', danach: null })
const lehrkraefte = reactive({ offen: false })

const markierungItems = [
  { label: 'Alle markieren', icon: 'pi pi-check-square', shortcut: 'Strg+A', command: () => store.markiere('alle') },
  { label: 'Keine markieren', icon: 'pi pi-stop', shortcut: 'Strg+K', command: () => store.markiere('keine') },
  { label: 'Markierung umkehren', icon: 'pi pi-sort-alt', shortcut: 'Strg+U', command: () => store.markiere('umkehren') },
]

const zeitraumText = computed(() => {
  if (!store.hatZeitraum) return 'nicht festgelegt'
  const f = (m: string) => `${m.slice(3)}/20${m.slice(0, 2)}`
  return `${f(store.monate[0])} – ${f(store.monate[5])}`
})

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
  if (!datei) return
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

// ── Tastenkürzel und Schutz vor Datenverlust ─────────────────────────────────

function onKey(e: KeyboardEvent): void {
  if (!e.ctrlKey || e.altKey || e.shiftKey) return
  const ziel = e.target as HTMLElement | null
  if (ziel && (ziel.tagName === 'INPUT' || ziel.tagName === 'TEXTAREA' || ziel.isContentEditable)) return
  const modus = ({ a: 'alle', k: 'keine', u: 'umkehren' } as const)[e.key.toLowerCase() as 'a' | 'k' | 'u']
  if (!modus) return
  e.preventDefault()
  store.markiere(modus)
}

function onBeforeUnload(e: BeforeUnloadEvent): void {
  // Die Arbeitsdatei lässt sich noch nicht sichern, daher schützt dies vor versehentlichem Verlust
  if (store.zeilen.length > 0) e.preventDefault()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('beforeunload', onBeforeUnload)
  // Wie MA2 beim ersten Start: Abrechnungszeitraum erfragen
  if (!store.hatZeitraum && store.zeilen.length === 0) zeitraumOeffnen()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('beforeunload', onBeforeUnload)
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
