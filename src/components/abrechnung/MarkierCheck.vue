<template>
  <input
    type="checkbox"
    class="ma-check"
    :checked="params.data.markiert"
    :aria-label="`Zeile ${params.node.rowIndex + 1} für Export markieren`"
    @change="onChange"
  />
</template>

<script setup lang="ts">
import { useAbrechnungStore } from '@/stores/abrechnung'

const props = defineProps<{ params: { data: { markiert: boolean }; node: { rowIndex: number | null } } }>()
const store = useAbrechnungStore()

function onChange(e: Event): void {
  props.params.data.markiert = (e.target as HTMLInputElement).checked
  store.aenderung()
}
</script>

<style>
.ma-check {
  accent-color: var(--accent);
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}
</style>
