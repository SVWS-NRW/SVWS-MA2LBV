<template>
  <label class="monat-kopf" :title="`Monat ${anzeige} in die Abrechnung einbeziehen`">
    <input
      type="checkbox"
      class="ma-check"
      :checked="store.monatAktiv[params.index]"
      :aria-label="`Monat ${anzeige} berücksichtigen`"
      @change="store.setzeMonatAktiv(params.index, ($event.target as HTMLInputElement).checked)"
    />
    <span>{{ anzeige }}</span>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAbrechnungStore } from '@/stores/abrechnung'

const props = defineProps<{ params: { index: number } }>()
const store = useAbrechnungStore()

/** "JJ/MM" → "MM/20JJ" für die Anzeige */
const anzeige = computed(() => {
  const m = /^(\d{2})\/(\d{2})$/.exec(store.monate[props.params.index])
  return m ? `${m[2]}/20${m[1]}` : '–'
})
</script>

<style scoped>
.monat-kopf {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
