/** Lädt Bytes als Datei herunter (Browser und Electron). */
export function speichereDatei(name: string, bytes: Uint8Array, mime: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Zeigt ein PDF in einem neuen Fenster. Das Fenster muss synchron im Klick geöffnet werden,
 * sonst blockiert der Browser es; deshalb gibt es zuerst ein leeres Fenster zurück.
 */
export function oeffneFensterVorab(): Window | null {
  return window.open('', '_blank')
}

export function zeigePdf(fenster: Window | null, name: string, bytes: Uint8Array): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  if (fenster && !fenster.closed) {
    fenster.location.href = url
  } else {
    speichereDatei(name, bytes, 'application/pdf')
  }
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000)
}
