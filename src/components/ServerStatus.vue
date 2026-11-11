<template>
  <span class="status" :class="`status--${art}`" role="status" aria-live="polite">
    <i :class="icon" />
    <span>{{ text }}</span>
    <Button v-if="sync.status === 'fehler'" label="Erneut versuchen" size="small" text @click="sync.neuVersuchen()" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import { useServerSyncStore } from '@/stores/serverSync'

const sync = useServerSyncStore()

const uhrzeit = computed(() => sync.letzteSpeicherung?.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) ?? '')

const art = computed(() => {
  if (sync.status === 'fehler' || sync.status === 'konflikt') return 'fehler'
  if (sync.status === 'aus') return 'lokal'
  if (sync.status === 'gespeichert' || sync.status === 'bereit') return 'ok'
  return 'arbeit'
})

const icon = computed(() => ({
  aus: 'pi pi-desktop', laedt: 'pi pi-spin pi-spinner', bereit: 'pi pi-cloud', wartet: 'pi pi-clock',
  speichert: 'pi pi-spin pi-spinner', gespeichert: 'pi pi-cloud-upload', fehler: 'pi pi-exclamation-triangle', konflikt: 'pi pi-exclamation-triangle',
}[sync.status]))

const text = computed(() => {
  switch (sync.status) {
    case 'aus': return 'Nur lokal, keine Verbindung zum SVWS-Server'
    case 'laedt': return 'Lade Daten vom SVWS-Server …'
    case 'bereit': return 'Mit dem SVWS-Server verbunden'
    case 'wartet': return 'Änderungen werden gleich auf dem SVWS-Server gespeichert …'
    case 'speichert': return 'Speichere auf dem SVWS-Server …'
    case 'gespeichert': return uhrzeit.value ? `Auf dem SVWS-Server gespeichert (${uhrzeit.value} Uhr)` : 'Auf dem SVWS-Server gespeichert'
    case 'fehler': return `Nicht gespeichert: ${sync.fehler}`
    case 'konflikt': return 'Die Daten auf dem SVWS-Server wurden geändert. Bitte entscheiden.'
  }
  return ''
})
</script>

<style scoped>
.status { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--p-text-muted-color); }
.status--ok i { color: var(--ma-ok); }
.status--fehler { color: var(--ma-fehler); }
.status--arbeit i { color: var(--accent); }
</style>
