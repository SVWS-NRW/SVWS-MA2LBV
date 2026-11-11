<template>
  <Dialog :visible="!!sync.konflikt" modal :closable="false" :header="titel" :style="{ width: '34rem' }">
    <template v-if="sync.konflikt">
      <p class="text">{{ erklaerung }}</p>
      <dl class="daten">
        <dt>Auf dem Server</dt>
        <dd>{{ serverInfo }}</dd>
        <template v-if="sync.konflikt.schluessel === 'abrechnung'">
          <dt>In dieser Sitzung</dt>
          <dd>{{ sync.konflikt.lokalZeilen }} Zeilen</dd>
        </template>
      </dl>
      <Message severity="warn" :closable="false">
        Mit „Meine Daten behalten“ wird der Stand auf dem Server überschrieben. Mit „Serverdaten laden“ gehen die Änderungen in dieser Sitzung verloren.
      </Message>
    </template>
    <template #footer>
      <Button label="Meine Daten behalten" severity="secondary" icon="pi pi-cloud-upload" :loading="laeuft" @click="loese(false)" />
      <Button label="Serverdaten laden" icon="pi pi-cloud-download" :loading="laeuft" @click="loese(true)" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useServerSyncStore } from '@/stores/serverSync'

const sync = useServerSyncStore()
const laeuft = ref(false)

const wasText = computed(() => (sync.konflikt?.schluessel === 'abrechnung' ? 'Abrechnungsdaten' : 'Einstellungen'))
const titel = computed(() => `${wasText.value}: Konflikt mit dem SVWS-Server`)

const erklaerung = computed(() => sync.konflikt?.anlass === 'start'
  ? `Auf dem SVWS-Server sind bereits ${wasText.value} gespeichert, und in dieser Sitzung sind ebenfalls Daten vorhanden. Welche sollen gelten?`
  : `Die ${wasText.value} auf dem SVWS-Server wurden zwischenzeitlich geändert, z. B. in einem anderen Fenster oder auf einem anderen Rechner. Welche sollen gelten?`)

const serverInfo = computed(() => {
  const k = sync.konflikt
  if (!k) return ''
  const d = new Date(k.serverAktualisiert)
  const zeit = Number.isNaN(d.getTime()) ? k.serverAktualisiert : d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
  return k.schluessel === 'abrechnung' ? `${k.serverZeilen} Zeilen, gespeichert am ${zeit}` : `gespeichert am ${zeit}`
})

async function loese(server: boolean): Promise<void> {
  laeuft.value = true
  try {
    if (server) await sync.konfliktMitServerLoesen()
    else await sync.konfliktMitLokalLoesen()
  } finally {
    laeuft.value = false
  }
}
</script>

<style scoped>
.text { margin: 0 0 1rem; }
.daten { display: grid; grid-template-columns: auto 1fr; gap: 0.3rem 1rem; margin: 0 0 1rem; }
.daten dt { color: var(--p-text-muted-color); }
.daten dd { margin: 0; }
</style>
