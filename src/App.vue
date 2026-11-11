<template>
  <Toast />
  <ConfirmDialog />
  <RouterView />
  <ServerKonfliktDialog />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { RouterView } from 'vue-router'
import ServerKonfliktDialog from '@/components/ServerKonfliktDialog.vue'
import { useUngespeichert } from '@/composables/useUngespeichert'

const { hatUngesichertes } = useUngespeichert()

// Schutz vor Datenverlust beim Schließen oder Neuladen (Abrechnung und Einstellungen, auf jeder Seite)
function onBeforeUnload(e: BeforeUnloadEvent): void {
  if (hatUngesichertes()) e.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
</script>
