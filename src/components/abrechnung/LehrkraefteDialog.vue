<template>
  <Dialog
    :visible="visible"
    modal
    header="Lehrkräfte aus SVWS übernehmen"
    :style="{ width: 'min(70rem, 95vw)' }"
    @update:visible="v => !v && emit('abbrechen')"
  >
    <div class="kopf">
      <IconField class="suche">
        <InputIcon class="pi pi-search" />
        <InputText v-model="suche" placeholder="Suchen nach Name oder Kürzel" aria-label="Lehrkräfte suchen" />
      </IconField>
      <span class="zaehler">{{ auswahl.length }} von {{ gefiltert.length }} ausgewählt</span>
    </div>

    <Message v-if="fehler" severity="error" :closable="false">{{ fehler }}</Message>
    <Message v-else-if="!laedt && lehrkraefte.length === 0" severity="info" :closable="false">
      Es wurden keine sichtbaren Lehrkräfte gefunden.
    </Message>

    <DataTable
      v-model:selection="auswahl"
      :value="gefiltert"
      dataKey="id"
      :loading="laedt"
      scrollable
      scrollHeight="24rem"
      size="small"
      stripedRows
      :isRowSelectable="(e) => !bereitsVorhanden(e.data)"
      :rowClass="(d: Lehrkraft) => (bereitsVorhanden(d) ? 'bereits' : '')"
    >
      <Column selectionMode="multiple" headerStyle="width: 3rem" />
      <Column field="kuerzel" header="Kürzel" style="width: 6rem" />
      <Column field="nachname" header="Nachname" />
      <Column field="vorname" header="Vorname" />
      <Column field="rechtsverhaeltnis" header="Rechtsverh." style="width: 7rem" />
      <Column field="beschaeftigungsart" header="Beschäftigung" style="width: 8rem" />
      <Column field="lbvNummer" header="LBV-Nr." style="width: 8rem" />
      <Column field="verguetungsschluessel" header="VS" style="width: 4rem" />
      <Column header="Hinweis">
        <template #body="{ data }">
          <span v-if="bereitsVorhanden(data)" class="notiz">bereits in der Tabelle</span>
          <span v-else-if="hinweise(data).length" class="notiz notiz--warn" :title="hinweise(data).join('\n')">
            <i class="pi pi-exclamation-triangle" /> {{ hinweise(data).length }} fehlend
          </span>
        </template>
      </Column>
    </DataTable>
    <p class="fuss">
      Stunden und Merkmale trägst du anschließend in der Tabelle ein. Fehlende LBV-Daten kannst du dort ergänzen.
    </p>

    <template #footer>
      <Button label="Abbrechen" severity="secondary" text @click="emit('abbrechen')" />
      <Button :label="`${auswahl.length} übernehmen`" icon="pi pi-check" :disabled="auswahl.length === 0" @click="emit('bestaetigt', auswahl)" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Button from 'primevue/button'
import Message from 'primevue/message'
import type { Lehrkraft } from '@/models/Lehrkraft'
import type { Mehrarbeitszeile } from '@/models/Mehrarbeit'
import { loadLehrkraefte } from '@/services/svwsService'
import { datenHinweise, istBereitsAufgenommen } from '@/services/lehrkraftMapper'
import { toAppError } from '@/services/errorService'

const props = defineProps<{ visible: boolean; idAbschnitt: number; vorhanden: Mehrarbeitszeile[] }>()
const emit = defineEmits<{ bestaetigt: [lehrkraefte: Lehrkraft[]]; abbrechen: [] }>()

const lehrkraefte = ref<Lehrkraft[]>([])
const auswahl = ref<Lehrkraft[]>([])
const suche = ref('')
const laedt = ref(false)
const fehler = ref('')

const bereitsVorhanden = (l: Lehrkraft) => istBereitsAufgenommen(l, props.vorhanden)
const hinweise = (l: Lehrkraft) => datenHinweise(l)

const gefiltert = computed(() => {
  const s = suche.value.trim().toLowerCase()
  if (!s) return lehrkraefte.value
  return lehrkraefte.value.filter(l => `${l.nachname} ${l.vorname} ${l.kuerzel}`.toLowerCase().includes(s))
})

watch(() => props.visible, async (v) => {
  if (!v) return
  auswahl.value = []
  suche.value = ''
  fehler.value = ''
  laedt.value = true
  try {
    lehrkraefte.value = await loadLehrkraefte(props.idAbschnitt)
  } catch (e) {
    const err = toAppError(e, 'loadLehrkraefte')
    fehler.value = `Die Lehrkräfte konnten nicht geladen werden. ${err.messageUser}`
    lehrkraefte.value = []
  } finally {
    laedt.value = false
  }
})
</script>

<style scoped>
.kopf { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; }
.suche { flex: 1; max-width: 22rem; }
.suche :deep(input) { width: 100%; }
.zaehler { color: var(--p-text-muted-color); font-size: 0.9rem; }
.fuss { margin: 0.75rem 0 0; color: var(--p-text-muted-color); font-size: 0.875rem; }
.notiz { font-size: 0.85rem; color: var(--p-text-muted-color); }
.notiz--warn { color: var(--ma-merkmal-v); }
:deep(tr.bereits) { opacity: 0.5; }
</style>
