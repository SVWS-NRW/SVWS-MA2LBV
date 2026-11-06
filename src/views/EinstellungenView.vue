<template>
  <div class="page">
    <header class="page-header">
      <div class="page-title">
        <Button icon="pi pi-arrow-left" severity="secondary" text aria-label="Zurück zum Dashboard" @click="router.push({ name: 'dashboard' })" />
        <h1>Einstellungen</h1>
      </div>
      <ThemeToggle />
    </header>

    <Message severity="info" :closable="false">
      Formulardaten der Schule (Dienststelle, Aktenzeichen, Schulnummer …) werden in den nächsten Schritten umgesetzt (siehe ADR 002, O9).
    </Message>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.page-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.page-title h1 {
  margin: 0;
  font-size: 1.75rem;
}
</style>
