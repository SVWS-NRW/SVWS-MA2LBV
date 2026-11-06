<template>
  <Dialog
    :visible="visible"
    modal
    header="Abrechnungszeitraum festlegen"
    :style="{ width: '30rem' }"
    :closable="true"
    @update:visible="v => !v && emit('abbrechen')"
  >
    <p class="hinweis">
      Wählen Sie den Startmonat. Der Abrechnungszeitraum umfasst sechs aufeinanderfolgende Monate.
    </p>
    <div class="feld">
      <label for="startmonat">Startmonat</label>
      <Select
        id="startmonat"
        v-model="auswahl"
        :options="optionen"
        optionLabel="text"
        optionValue="monat"
        class="w-full"
      />
    </div>
    <div class="vorschau" aria-label="Vorschau der sechs Monate">
      <span v-for="m in vorschau" :key="m" class="chip">{{ m }}</span>
    </div>
    <Message v-if="warnung" severity="warn" :closable="false">{{ warnung }}</Message>
    <template #footer>
      <Button label="Abbrechen" severity="secondary" text @click="emit('abbrechen')" />
      <Button label="Übernehmen" icon="pi pi-check" @click="emit('bestaetigt', auswahl)" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { sechsMonateAb, startmonatOptionen } from '@/rules/zahlen'

const props = defineProps<{ visible: boolean; warnung?: string; vorgabe?: string }>()
const emit = defineEmits<{ bestaetigt: [start: string]; abbrechen: [] }>()

const optionen = computed(() => startmonatOptionen(new Date()))
const auswahl = ref('')

// Vorgabe: fünf Monate vor dem aktuellen Monat, damit der Zeitraum mit dem laufenden Monat endet
watch(() => props.visible, (v) => {
  if (!v) return
  const o = optionen.value
  auswahl.value = props.vorgabe && o.some(x => x.monat === props.vorgabe) ? props.vorgabe : o[Math.max(0, o.length - 6)].monat
}, { immediate: true })

const vorschau = computed(() => sechsMonateAb(auswahl.value).map(m => {
  const x = /^(\d{2})\/(\d{2})$/.exec(m)
  return x ? `${x[2]}/20${x[1]}` : m
}))
</script>

<style scoped>
.hinweis { margin: 0 0 1rem; color: var(--p-text-muted-color); }
.feld { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 1rem; }
.feld label { font-size: 0.875rem; font-weight: 500; }
.vorschau { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem; }
.chip {
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  font-size: 0.85rem;
  background: var(--surface);
}
.w-full { width: 100%; }
</style>
