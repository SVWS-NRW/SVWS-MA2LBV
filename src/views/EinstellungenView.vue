<template>
  <div class="seite">
    <header class="kopf">
      <div class="kopf-links">
        <Button icon="pi pi-arrow-left" severity="secondary" text rounded aria-label="Zurück zum Dashboard" @click="router.push({ name: 'dashboard' })" />
        <h1>Einstellungen</h1>
      </div>
      <ThemeToggle />
    </header>

    <p class="auto">
      <i class="pi pi-check-circle" />
      <template v-if="sync.aktiv">Änderungen werden automatisch auf dem SVWS-Server gespeichert und stehen dir bei der nächsten Anmeldung wieder zur Verfügung.</template>
      <template v-else>Änderungen werden automatisch in diesem Browser gespeichert.</template>
      Die Angaben erscheinen im Kopf der Änderungsmitteilung.
    </p>
    <ServerStatus />

    <section class="karte">
      <h2>Formulardaten</h2>
      <div class="raster">
        <div class="feld breit">
          <label for="dienststelle">Dienststelle</label>
          <Textarea id="dienststelle" v-model="p.dienststelle" rows="3" autoResize placeholder="Name und Anschrift der Schule, eine Zeile pro Angabe" />
        </div>
        <div class="feld">
          <label for="aktenzeichen">Aktenzeichen</label>
          <InputText id="aktenzeichen" v-model="p.aktenzeichen" maxlength="35" />
        </div>
        <div class="feld">
          <label for="plzort">PLZ, Ort <small>(nur Lehramtsanwärter-Formular)</small></label>
          <InputText id="plzort" v-model="p.plzOrt" />
        </div>
        <div class="feld">
          <label for="bearbeiter">Bearbeiter/in</label>
          <InputText id="bearbeiter" v-model="p.bearbeiter" />
        </div>
        <div class="feld">
          <label for="telefon">Telefon</label>
          <InputText id="telefon" v-model="p.telefon" inputmode="tel" />
        </div>
        <div class="feld">
          <label for="nebenstelle">Nebenstelle</label>
          <InputText id="nebenstelle" v-model="p.nebenstelle" inputmode="numeric" />
        </div>
        <div class="feld">
          <label for="email">E-Mail <small>(freiwillig)</small></label>
          <InputText id="email" v-model="p.eMail" type="email" />
        </div>
        <div class="feld">
          <label for="schulnummer">Schulnummer</label>
          <InputText id="schulnummer" v-model="p.schulnummer" inputmode="numeric" maxlength="6" :readonly="einstellungen.schulnummerAusSvws" :invalid="schulnummerFehler !== ''" />
          <small v-if="einstellungen.schulnummerAusSvws" class="hilfe">Aus dem SVWS-Server übernommen.</small>
          <small v-if="schulnummerFehler" class="fehler">{{ schulnummerFehler }}</small>
        </div>
        <div class="feld">
          <label for="minuten">Minuten je Unterrichtsstunde</label>
          <InputText id="minuten" v-model="p.anzahlMinuten" inputmode="numeric" maxlength="5" placeholder="leer = 45,00" :invalid="minutenFehler !== ''" />
          <small class="hilfe">Fünf Stellen mit zwei Nachkommastellen, z. B. 04500 = 45,00. Leer lassen für den Standard.</small>
          <small v-if="minutenFehler" class="fehler">{{ minutenFehler }}</small>
        </div>
        <div class="feld">
          <label for="schulform">Schulform <small>(nur Lehramtsanwärter)</small></label>
          <Select id="schulform" v-model="p.schulform" :options="schulformen" optionValue="schluessel" showClear placeholder="Schulform wählen"
                  :optionLabel="(o: { schluessel: string; text: string }) => `${o.schluessel} – ${o.text}`" />
        </div>
        <div class="feld">
          <label for="sachlich">„Sachlich richtig“</label>
          <InputText id="sachlich" v-model="p.sachlichRichtig" />
        </div>
        <div class="feld">
          <label for="unterschrift">Unterschrift</label>
          <InputText id="unterschrift" v-model="p.unterschrift" />
        </div>
        <div class="feld breit">
          <div class="zeile">
            <Checkbox v-model="p.keineMehrarbeitWeitereSchule" inputId="weitere" binary />
            <label for="weitere">Keine Mehrarbeit an einer weiteren Schule derselben Schulform geleistet</label>
          </div>
        </div>
      </div>
      <Message severity="secondary" :closable="false" class="hinweis">
        Beachte die Vorgaben des LBV in der Ausfüllanleitung, wer die Änderungsmitteilung unterschreiben und die sachliche Richtigkeit bestätigen darf.
      </Message>
    </section>

    <section class="karte">
      <h2>Verhalten</h2>
      <div class="zeile">
        <Checkbox v-model="v.merkmalAutomatisch" inputId="merkmal" binary />
        <label for="merkmal">Merkmale <strong>V</strong> und <strong>A</strong> beim Prüfen automatisch setzen</label>
      </div>
    </section>

    <section v-if="sync.aktiv" class="karte">
      <h2>Schulstandard</h2>
      <p class="hilfe">
        Als Administrator kannst du diese Formulardaten für alle Benutzer der Schule hinterlegen. Wer noch keine eigenen Einstellungen
        gespeichert hat, startet mit diesem Stand. Eigene Einstellungen haben immer Vorrang.
      </p>
      <div class="zeile">
        <Button label="Als Schulstandard speichern" icon="pi pi-building" severity="secondary" size="small" :loading="standardLaeuft" @click="schulstandard" />
      </div>
    </section>

    <section class="karte">
      <h2>Daten sichern</h2>
      <p class="hilfe">Exportiere die Formulardaten als Datei, um sie auf einem anderen Rechner zu verwenden. Die Datei enthält keine Zugangsdaten.</p>
      <div class="zeile">
        <Button label="Formulardaten exportieren" icon="pi pi-download" severity="secondary" size="small" @click="exportieren" />
        <Button label="Formulardaten importieren" icon="pi pi-upload" severity="secondary" size="small" @click="importInput?.click()" />
        <input ref="importInput" type="file" accept="application/json,.json" class="versteckt" @change="importieren" />
      </div>
    </section>

    <LegalFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useUngespeichert } from '@/composables/useUngespeichert'
import { useBestaetigung } from '@/composables/useBestaetigung'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import ThemeToggle from '@/components/ThemeToggle.vue'
import LegalFooter from '@/components/LegalFooter.vue'
import ServerStatus from '@/components/ServerStatus.vue'
import { useServerSyncStore } from '@/stores/serverSync'
import { mischeBekannteFelder } from '@/models/LbvParameter'
import { useEinstellungenStore } from '@/stores/einstellungen'
import { LAA_SCHULFORMEN } from '@/rules/schulformen'
import { pruefeSchulnummer, pruefeStundentaktung } from '@/rules/pruefung'

const router = useRouter()
const toast = useToast()
const einstellungen = useEinstellungenStore()
const sync = useServerSyncStore()
const { offeneAenderungen } = useUngespeichert()
const frage = useBestaetigung()

// Mit Serververbindung werden die Einstellungen automatisch gespeichert; gefragt wird nur, wenn das nicht gelang.
// Ohne Verbindung liegen sie automatisch im Browser, dort gibt es nichts zu warnen.
onBeforeRouteLeave(async () => {
  if (!sync.aktiv) return true
  const offen = await offeneAenderungen()
  if (!offen) return true
  return frage({ titel: 'Einstellungen verlassen?', text: `${offen}.`, ja: 'Trotzdem verlassen', nein: 'Hier bleiben' })
})
const standardLaeuft = ref(false)
const { parameter: p, verhalten: v } = storeToRefs(einstellungen)
const schulformen = LAA_SCHULFORMEN
const importInput = ref<HTMLInputElement | null>(null)

const schulnummerFehler = computed(() => (p.value.schulnummer === '' ? '' : pruefeSchulnummer(p.value.schulnummer).replace('Fehler: ', '')))
const minutenFehler = computed(() => pruefeStundentaktung(p.value.anzahlMinuten).replace('Fehler: ', ''))

async function schulstandard(): Promise<void> {
  standardLaeuft.value = true
  try {
    await sync.speichereSchulstandard()
    toast.add({ severity: 'success', summary: 'Schulstandard', detail: 'Die Formulardaten sind jetzt der Standard für alle Benutzer.', life: 5000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Schulstandard', detail: e instanceof Error ? e.message : 'Speichern fehlgeschlagen.', life: 7000 })
  } finally {
    standardLaeuft.value = false
  }
}

function exportieren(): void {
  const blob = new Blob([JSON.stringify({ parameter: p.value, verhalten: v.value }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'svws-ma2lbv-formulardaten.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

async function importieren(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const datei = input.files?.[0]
  input.value = ''
  if (!datei) return
  try {
    const daten = JSON.parse(await datei.text()) as { parameter?: Record<string, unknown>; verhalten?: Record<string, unknown> }
    if (!daten.parameter || typeof daten.parameter !== 'object') throw new Error('keine Formulardaten')
    // Nur bekannte Felder mit passendem Typ übernehmen
    const neu = mischeBekannteFelder(p.value, daten.parameter)
    if (einstellungen.schulnummerAusSvws) neu.schulnummer = p.value.schulnummer
    p.value = neu
    v.value = mischeBekannteFelder(v.value, daten.verhalten)
    toast.add({ severity: 'success', summary: 'Einstellungen', detail: 'Formulardaten importiert.', life: 4000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Einstellungen', detail: 'Die Datei enthält keine gültigen Formulardaten.', life: 6000 })
  }
}
</script>

<style scoped>
.seite {
  min-height: 100vh;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 64rem;
  margin: 0 auto;
}
.kopf { display: flex; align-items: center; justify-content: space-between; }
.kopf-links { display: flex; align-items: center; gap: 0.5rem; }
.kopf h1 { margin: 0; font-size: 1.75rem; }
.auto { margin: 0; color: var(--p-text-muted-color); font-size: 0.9rem; }
.auto i { color: var(--accent); margin-right: 0.3rem; }
.karte {
  background: var(--surface);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 1.5rem;
}
.karte h2 { margin: 0 0 1rem; font-size: 1.15rem; }
.raster { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem 1.5rem; }
@media (max-width: 760px) { .raster { grid-template-columns: 1fr; } }
.feld { display: flex; flex-direction: column; gap: 0.375rem; }
.feld.breit { grid-column: 1 / -1; }
.feld label { font-size: 0.875rem; font-weight: 500; }
.feld label small { font-weight: 400; color: var(--p-text-muted-color); }
.feld :deep(input), .feld :deep(textarea), .feld :deep(.p-select) { width: 100%; }
.hilfe { color: var(--p-text-muted-color); font-size: 0.8rem; margin: 0; }
.fehler { color: var(--ma-fehler); font-size: 0.8rem; }
.zeile { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.hinweis { margin-top: 1rem; }
.versteckt { display: none; }
</style>
