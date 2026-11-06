<template>
  <ag-grid-vue
    :class="[isDark ? 'ag-theme-quartz-dark' : 'ag-theme-quartz', 'ma-tabelle']"
    :rowData="store.zeilen"
    :columnDefs="columnDefs"
    :defaultColDef="defaultColDef"
    :rowClassRules="rowClassRules"
    :getRowId="getRowId"
    :stopEditingWhenCellsLoseFocus="true"
    :suppressMovableColumns="true"
    :enableCellTextSelection="true"
    :suppressColumnVirtualisation="true"
    @grid-ready="onGridReady"
  />
</template>

<script setup lang="ts">
import { watch, shallowRef } from 'vue'
import { AgGridVue } from '@ag-grid-community/vue3'
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model'
import {
  ModuleRegistry, type ColDef, type GetRowIdParams, type GridApi, type GridReadyEvent,
  type ValueGetterParams, type ValueSetterParams, type CellClassParams,
} from '@ag-grid-community/core'
import { useToast } from 'primevue/usetoast'
import type { Mehrarbeitszeile } from '@/models/Mehrarbeit'
import { useAbrechnungStore } from '@/stores/abrechnung'
import { useTheme } from '@/composables/useTheme'
import { ordneZu } from '@/rules/zuordnung'
import { pruefeMerkmalEingabe } from '@/rules/merkmal'
import { istGueltigesDatum } from '@/rules/zahlen'
import { normalisiereNummer } from '@/rules/personalnummer'
import MarkierCheck from './MarkierCheck.vue'
import MonatsKopf from './MonatsKopf.vue'

ModuleRegistry.registerModules([ClientSideRowModelModule])

const store = useAbrechnungStore()
const toast = useToast()
const { isDark } = useTheme()
const gridApi = shallowRef<GridApi | null>(null)

function onGridReady(e: GridReadyEvent): void {
  gridApi.value = e.api
}

// Zelländerungen geschehen direkt an den Zeilenobjekten; die Tabelle zeichnet bei `revision` neu.
// `redrawRows` ist nötig, damit auch die Zeilenklassen (Fehler/ok/ausgeschlossen) neu ausgewertet werden.
watch(() => store.revision, () => gridApi.value?.redrawRows())

/** Zeile, in der der Fokus steht (MA2: "Zeile löschen" / "Zeile einfügen" wirken auf die aktuelle Zeile). */
function fokussierteZeileId(): string | null {
  const zelle = gridApi.value?.getFocusedCell()
  if (!zelle) return null
  return (gridApi.value?.getDisplayedRowAtIndex(zelle.rowIndex)?.data as Mehrarbeitszeile | undefined)?.id ?? null
}

/** Setzt den Fokus auf eine (neue) Zeile und startet die Eingabe; wartet, bis die Tabelle die Zeile kennt. */
function fokusAufZeile(id: string, versuche = 20): void {
  const knoten = gridApi.value?.getRowNode(id)
  if (!knoten || knoten.rowIndex == null) {
    if (versuche > 0) requestAnimationFrame(() => fokusAufZeile(id, versuche - 1))
    return
  }
  gridApi.value?.ensureIndexVisible(knoten.rowIndex)
  gridApi.value?.setFocusedCell(knoten.rowIndex, 'nachname')
  gridApi.value?.startEditingCell({ rowIndex: knoten.rowIndex, colKey: 'nachname' })
}

defineExpose({ fokussierteZeileId, fokusAufZeile })

function melde(detail: string): void {
  toast.add({ severity: 'warn', summary: 'Eingabe', detail, life: 6000 })
}

function getRowId(p: GetRowIdParams<Mehrarbeitszeile>): string {
  return p.data.id
}

const rowClassRules = {
  'ma-zeile-fehler': (p: { data?: Mehrarbeitszeile }) => !!p.data?.hinweis.startsWith('Fehler'),
  'ma-zeile-ok': (p: { data?: Mehrarbeitszeile }) => p.data?.hinweis === 'kein Fehler gefunden' || !!p.data?.hinweis.startsWith('Export'),
  'ma-zeile-aus': (p: { data?: Mehrarbeitszeile }) => !p.data?.markiert,
}

const defaultColDef: ColDef = { editable: true, sortable: false, resizable: true, suppressHeaderMenuButton: true }

type Z = Mehrarbeitszeile
type Textfeld = 'nachname' | 'vorname' | 'geburtsdatum' | 'lbvNummer' | 'verguetungsschluessel' | 'status'

function textSpalte(field: Textfeld, headerName: string, width: number, extra: Partial<ColDef<Z>> = {}): ColDef<Z> {
  return {
    colId: field, field, headerName, width,
    valueSetter: (p: ValueSetterParams<Z>) => {
      const neu = String(p.newValue ?? '').trim()
      if (neu === p.data[field]) return false
      p.data[field] = neu
      return true
    },
    ...extra,
  }
}

function monatSpalten(i: number): ColDef<Z>[] {
  return [
    {
      colId: `std${i}`, headerName: '', headerComponent: MonatsKopf, headerComponentParams: { index: i }, width: 112,
      type: 'rightAligned',
      valueGetter: (p: ValueGetterParams<Z>) => p.data?.monate[i].stunden ?? '',
      valueSetter: (p: ValueSetterParams<Z>) => {
        const neu = String(p.newValue ?? '').trim()
        if (neu !== '' && !/^\d{1,3}([.,]\d{0,2})?$/.test(neu)) {
          melde('Bitte Stunden als Zahl eingeben, z. B. 3 oder 2,5.')
          return false
        }
        p.data.monate[i].stunden = neu.replace('.', ',')
        return true
      },
      cellClass: () => (store.monatAktiv[i] ? '' : 'ma-spalte-aus'),
    },
    {
      colId: `merk${i}`, headerName: 'M.', headerTooltip: 'Merkmal: V (weniger als 4 Stunden), A (Teilzeit/anteilig), K (Klassenfahrt, nur Tarif-Teilzeit)',
      width: 62,
      valueGetter: (p: ValueGetterParams<Z>) => p.data?.monate[i].merkmal ?? '',
      valueSetter: (p: ValueSetterParams<Z>) => {
        const neu = String(p.newValue ?? '').trim().toUpperCase()
        const meldung = pruefeMerkmalEingabe(ordneZu(p.data.lbvNummer, p.data.status).bereich, neu)
        if (meldung) {
          melde(meldung)
          p.data.monate[i].merkmal = ''
          return true
        }
        p.data.monate[i].merkmal = neu
        return true
      },
      cellClass: (p: CellClassParams<Z>) => {
        const v = String(p.value ?? '').toUpperCase()
        return ['ma-merkmal', v ? `ma-merkmal-${v.toLowerCase()}` : '', store.monatAktiv[i] ? '' : 'ma-spalte-aus']
      },
    },
  ]
}

const columnDefs: ColDef<Z>[] = [
  {
    colId: 'markiert', headerName: '', width: 52, editable: false, cellRenderer: MarkierCheck, pinned: 'left',
    headerTooltip: 'Zeile für Prüfung und Export markiert',
  },
  {
    colId: 'nr', headerName: '#', width: 56, editable: false, pinned: 'left', type: 'rightAligned',
    valueGetter: (p: ValueGetterParams<Z>) => (p.node?.rowIndex ?? 0) + 1,
  },
  textSpalte('nachname', 'Nachname', 150, { pinned: 'left' }),
  textSpalte('vorname', 'Vorname', 130, { pinned: 'left' }),
  textSpalte('geburtsdatum', 'Geburtsdatum', 132, {
    valueSetter: (p: ValueSetterParams<Z>) => {
      const neu = String(p.newValue ?? '').trim()
      if (neu !== '' && !istGueltigesDatum(neu)) { melde('Bitte das Geburtsdatum als TT.MM.JJJJ eingeben.'); return false }
      p.data.geburtsdatum = neu
      return true
    },
  }),
  textSpalte('lbvNummer', 'LBV-Nr.', 118, {
    headerTooltip: 'LBV-Personalnummer, z. B. B 0312222',
    valueSetter: (p: ValueSetterParams<Z>) => {
      p.data.lbvNummer = String(p.newValue ?? '').trim().toUpperCase()
      return true
    },
    valueFormatter: (p) => (p.value ? normalisiereNummer(String(p.value)).replace(/^([A-Z])/, '$1 ') : ''),
  }),
  textSpalte('verguetungsschluessel', 'V.-Schl.', 92, {
    headerTooltip: 'Vergütungsschlüssel 1–4 (Lehramtsanwärter 1–8)',
    valueSetter: (p: ValueSetterParams<Z>) => {
      const neu = String(p.newValue ?? '').trim()
      const max = ordneZu(p.data.lbvNummer, p.data.status).istLAA ? 8 : 4
      if (neu !== '' && !(/^\d$/.test(neu) && Number(neu) >= 1 && Number(neu) <= max)) {
        melde(`Der Vergütungsschlüssel muss zwischen 1 und ${max} liegen.`)
        return false
      }
      p.data.verguetungsschluessel = neu
      return true
    },
  }),
  ...[0, 1, 2, 3, 4, 5].flatMap(monatSpalten),
  {
    colId: 'summe', headerName: 'Su.', headerTooltip: 'Summe der Stunden in den berücksichtigten Monaten', width: 76, editable: false, type: 'rightAligned',
    valueGetter: (p: ValueGetterParams<Z>) => (p.data ? store.summe(p.data).toFixed(1).replace('.', ',') : ''),
  },
  textSpalte('status', 'Status', 76, {
    headerTooltip: 'V = Vollzeit, T = Teilzeit, W = Lehramtsanwärter',
    valueSetter: (p: ValueSetterParams<Z>) => {
      p.data.status = String(p.newValue ?? '').trim().toUpperCase()
      return true
    },
  }),
  {
    colId: 'hinweis', headerName: 'Hinweis(e)', flex: 1, minWidth: 260, editable: false,
    tooltipValueGetter: (p) => p.data?.hinweis ?? '',
    valueGetter: (p: ValueGetterParams<Z>) => {
      const zeilen = (p.data?.hinweis ?? '').split('\n').filter(Boolean)
      return zeilen.length > 1 ? `${zeilen[0]} (+${zeilen.length - 1})` : (zeilen[0] ?? '')
    },
  },
]
</script>

<style>
.ma-tabelle {
  flex: 1;
  min-height: 360px;
  --ag-font-size: 0.9rem;
}
.ma-tabelle .ma-zeile-fehler { background-color: color-mix(in srgb, var(--ma-fehler) 14%, transparent) !important; }
.ma-tabelle .ma-zeile-ok { background-color: color-mix(in srgb, var(--ma-ok) 14%, transparent) !important; }
.ma-tabelle .ma-zeile-aus { opacity: 0.55; }
.ma-tabelle .ma-spalte-aus { color: var(--ma-gesperrt); background-color: color-mix(in srgb, var(--ma-gesperrt) 12%, transparent); }
.ma-tabelle .ma-merkmal { font-weight: 700; text-align: center; }
.ma-tabelle .ma-merkmal-v { color: var(--ma-merkmal-v); }
.ma-tabelle .ma-merkmal-a { color: var(--ma-merkmal-a); }
.ma-tabelle .ma-merkmal-k { color: var(--ma-merkmal-k); }
</style>
