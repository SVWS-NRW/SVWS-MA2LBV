<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <h1>SVWS MA2LBV</h1>
      <div class="header-actions">
        <ThemeToggle />
        <Button
          :label="auth.isConnected ? 'Abmelden' : 'Zur Anmeldung'"
          icon="pi pi-sign-out"
          severity="secondary"
          text
          @click="handleLogout"
        />
      </div>
    </header>

    <div class="tile-grid">
      <!-- Schuldaten (Info-Kachel, nicht navigierbar) -->
      <div class="tile tile--info">
        <div class="tile-icon"><i class="pi pi-building" /></div>
        <div class="tile-body">
          <span class="tile-title">Schuldaten</span>
          <dl v-if="auth.isConnected" class="info-list">
            <dt>Schulform</dt>
            <dd>{{ auth.schulformKuerzel || '–' }}</dd>
            <dt>Schulnummer</dt>
            <dd>{{ auth.schulnummer || '–' }}</dd>
            <dt>Schema</dt>
            <dd>{{ auth.schema }}</dd>
            <dt>Server</dt>
            <dd class="url">{{ auth.baseUrl }}</dd>
            <dt>Benutzer</dt>
            <dd>{{ auth.username }}</dd>
          </dl>
          <ServerStatus v-if="auth.isConnected" class="sync-status" />
          <span v-else class="tile-sub">Keine SVWS-Verbindung. CSV-Import und manuelle Erfassung sind möglich.</span>
        </div>
      </div>

      <!-- Mehrarbeit abrechnen -->
      <div class="tile tile--nav tile--accent" @click="router.push({ name: 'abrechnung' })">
        <div class="tile-icon"><i class="pi pi-clock" /></div>
        <div class="tile-body">
          <span class="tile-title">Mehrarbeit abrechnen</span>
          <span class="tile-sub">Abrechnung erfassen, prüfen und als PDF an das LBV exportieren</span>
        </div>
        <i class="pi pi-chevron-right tile-arrow" />
      </div>

      <!-- Einstellungen -->
      <div class="tile tile--nav" @click="router.push({ name: 'einstellungen' })">
        <div class="tile-icon"><i class="pi pi-cog" /></div>
        <div class="tile-body">
          <span class="tile-title">Einstellungen</span>
          <span class="tile-sub">Formulardaten der Schule und Darstellung</span>
        </div>
        <i class="pi pi-chevron-right tile-arrow" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useAuthStore } from '@/stores/auth'
import { useServerSyncStore } from '@/stores/serverSync'
import { useAbmelden } from '@/composables/useAbmelden'
import ServerStatus from '@/components/ServerStatus.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()
const auth = useAuthStore()
const sync = useServerSyncStore()
const { abmelden } = useAbmelden()

async function handleLogout() {
  await abmelden()
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 1.75rem;
}

.schulform-warnung {
  max-width: 680px;
}

.tile-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .tile-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 560px) {
  .tile-grid { grid-template-columns: 1fr; }
}

.tile {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 2rem 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--p-content-border-color);
  background: var(--p-content-background);
}

.tile--nav {
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
}

.tile--nav:hover {
  background: var(--p-highlight-background);
  border-color: var(--p-primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tile--accent .tile-icon {
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
}

.tile--gesperrt {
  cursor: not-allowed;
  opacity: 0.45;
}

.tile--info {
  align-items: flex-start;
}

.tile-icon {
  flex-shrink: 0;
  width: 4rem;
  height: 4rem;
  border-radius: 0.6rem;
  background: var(--p-primary-50, #eff6ff);
  color: var(--p-primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
}

.tile-icon .pi {
  font-size: 1.6rem;
}

.tile-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.tile-title {
  font-weight: 600;
  font-size: 1.25rem;
}

.tile-sub {
  font-size: 0.95rem;
  color: var(--p-text-muted-color);
}

.tile-arrow {
  flex-shrink: 0;
  color: var(--p-text-muted-color);
  font-size: 1rem;
}

.info-list {
  margin: 0.35rem 0 0 0;
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 0.75rem;
  row-gap: 0.25rem;
  font-size: 0.95rem;
}

.info-list dt {
  color: var(--p-text-muted-color);
  font-weight: 500;
}

.info-list dd {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-list .url {
  font-size: 0.85rem;
}

.sync-status {
  margin-top: 0.75rem;
}
</style>
