<template>
  <Dialog
    :visible="visible"
    modal
    :header="modus === 'sichern' ? 'Arbeitsdatei sichern' : 'Arbeitsdatei öffnen'"
    :style="{ width: '30rem' }"
    @update:visible="v => !v && !laeuft && emit('abbrechen')"
  >
    <p class="hinweis">
      <template v-if="modus === 'sichern'">
        Die Arbeitsdatei enthält personenbezogene Daten und wird mit deiner Passphrase verschlüsselt.
        <strong>Die Passphrase kann nicht wiederhergestellt werden.</strong>
      </template>
      <template v-else>Gib die Passphrase ein, mit der die Datei <strong>{{ dateiname }}</strong> gesichert wurde.</template>
    </p>

    <form @submit.prevent="absenden">
      <div class="feld">
        <label for="passphrase">Passphrase</label>
        <Password inputId="passphrase" v-model="passphrase" :feedback="false" toggleMask autofocus :disabled="laeuft" :invalid="!!fehler" />
      </div>
      <div v-if="modus === 'sichern'" class="feld">
        <label for="wiederholung">Passphrase wiederholen</label>
        <Password inputId="wiederholung" v-model="wiederholung" :feedback="false" toggleMask :disabled="laeuft" />
        <small class="klein">Mindestens {{ mindestlaenge }} Zeichen. Ein Satz ist besser als ein einzelnes Wort.</small>
      </div>
      <Message v-if="meldung" severity="error" :closable="false">{{ meldung }}</Message>
      <button type="submit" class="versteckt" tabindex="-1" aria-hidden="true" />
    </form>

    <template #footer>
      <Button label="Abbrechen" severity="secondary" text :disabled="laeuft" @click="emit('abbrechen')" />
      <Button :label="modus === 'sichern' ? 'Sichern' : 'Öffnen'" :icon="modus === 'sichern' ? 'pi pi-save' : 'pi pi-lock-open'" :loading="laeuft" @click="absenden" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { PASSPHRASE_MINDESTLAENGE } from '@/services/dateiVerschluesselung'

const props = defineProps<{
  visible: boolean
  modus: 'sichern' | 'oeffnen'
  dateiname?: string
  /** Fehler der aufrufenden Seite, z. B. "Passphrase falsch" */
  fehler?: string
  laeuft?: boolean
}>()
const emit = defineEmits<{ bestaetigt: [passphrase: string]; abbrechen: [] }>()

const mindestlaenge = PASSPHRASE_MINDESTLAENGE
const passphrase = ref('')
const wiederholung = ref('')
const eigenerFehler = ref('')
const meldung = computed(() => eigenerFehler.value || props.fehler || '')

watch(() => props.visible, (v) => {
  if (!v) return
  passphrase.value = ''
  wiederholung.value = ''
  eigenerFehler.value = ''
})

function absenden(): void {
  eigenerFehler.value = ''
  if (props.laeuft) return
  if (props.modus === 'sichern') {
    if (passphrase.value.length < mindestlaenge) { eigenerFehler.value = `Die Passphrase muss mindestens ${mindestlaenge} Zeichen lang sein.`; return }
    if (passphrase.value !== wiederholung.value) { eigenerFehler.value = 'Die beiden Eingaben stimmen nicht überein.'; return }
  } else if (passphrase.value === '') {
    eigenerFehler.value = 'Bitte die Passphrase eingeben.'
    return
  }
  emit('bestaetigt', passphrase.value)
}
</script>

<style scoped>
.hinweis { margin: 0 0 1rem; color: var(--p-text-muted-color); }
.feld { display: flex; flex-direction: column; gap: 0.375rem; margin-bottom: 1rem; }
.feld label { font-size: 0.875rem; font-weight: 500; }
.feld :deep(input), .feld :deep(.p-password) { width: 100%; }
.klein { color: var(--p-text-muted-color); font-size: 0.8rem; }
.versteckt { position: absolute; width: 0; height: 0; opacity: 0; }
</style>
