<template>
  <input
    type="checkbox"
    class="ma-check"
    :checked="alle"
    :indeterminate="teilweise"
    :disabled="store.zeilen.length === 0"
    aria-label="Alle Zeilen markieren oder Markierung aufheben"
    title="Alle markieren / keine markieren"
    @change="store.markiere(alle ? 'keine' : 'alle')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAbrechnungStore } from '@/stores/abrechnung'

const store = useAbrechnungStore()
const anzahl = computed(() => store.markierteZeilen.length)
const alle = computed(() => store.zeilen.length > 0 && anzahl.value === store.zeilen.length)
/** Nur ein Teil der Zeilen ist markiert: Kästchen im Zwischenzustand */
const teilweise = computed(() => anzahl.value > 0 && anzahl.value < store.zeilen.length)
</script>
