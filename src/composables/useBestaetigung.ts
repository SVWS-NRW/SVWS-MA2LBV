import { useConfirm } from 'primevue/useconfirm'

/** Rückfrage als Promise: `true` bei Bestätigung, `false` bei Abbruch oder Schließen. */
export function useBestaetigung() {
  const confirm = useConfirm()
  return function frage(optionen: { titel: string; text: string; ja: string; nein: string; gefaehrlich?: boolean }): Promise<boolean> {
    return new Promise<boolean>(aufloesen => {
      confirm.require({
        header: optionen.titel,
        message: optionen.text,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: optionen.ja,
        rejectLabel: optionen.nein,
        acceptProps: optionen.gefaehrlich ? { severity: 'danger' } : undefined,
        accept: () => aufloesen(true),
        reject: () => aufloesen(false),
        onHide: () => aufloesen(false),
      })
    })
  }
}
