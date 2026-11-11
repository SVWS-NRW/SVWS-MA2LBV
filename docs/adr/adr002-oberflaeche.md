# ADR 002: Grundsätzliche Entscheidungen für die Oberfläche

- **Status:** Vorgeschlagen
- **Datum:** 2026-11-06
- **Autor:** Frank Pfotenhauer
- **Projekt:** SVWS-MA2LBV
- **Baut auf:** [ADR 001 – Architektur](adr001-architektur.md)
- **Verwandt:** [ADR 003 – Analyse des Delphi-Codes](adr003-delphi-analyse.md)

## Kontext

Die Oberfläche von SVWS-MA2LBV muss **exakt** zum Erscheinungsbild der anderen SVWS-Tools passen. Maßgeblich ist das Design-System aus SVWS-Prognos ADR 0017 (Emerald-Palette, eigene CSS-Variablen, PrimeVue 4 / Aura). Dieses ADR hält fest, was übernommen wird, wie die Bildschirme des alten MA2 (Ribbon + Tabelle + Statusleiste, Dialoge) darauf abgebildet werden und welche Delphi-Oberflächenteile entfallen.

Grundlage waren `style.css`, `main.ts`, `App.vue`, `ThemeToggle.vue`, `LegalFooter.vue`, `ConnectView.vue`, `DashboardView.vue` und der Router von SVWS-Prognos sowie der Vergleich mit Import, Conference und GradeHub. Die Delphi-Oberfläche stammt aus `mMA2Main.pas/.dfm`, `mParameterIO.pas`, `mLogin.pas`, `mSchILDZugriff.pas` und der Bedienungsanleitung.

## Entscheidungen

### O1 – Design-System unverändert übernehmen

`src/style.css` wird aus Prognos kopiert und nur um MA2LBV-eigene Tokens (Präfix `--ma-`) ergänzt. Kein eigenes Farbschema, keine PrimeVue-Interna.

**Kritische Regeln aus Prognos ADR 0017, die hier ebenfalls gelten:**
- Primärfarbe ist **Emerald** (Aura-Standard), nicht Blau.
- `--p-surface-ground` und `--p-surface-card` existieren in PrimeVue 4 nicht. Hintergründe immer über die eigenen Variablen setzen.
- Native Spinbuttons von `input[type=number]` werden ausgeblendet.

| Token | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `--accent` / `--app-accent` | `#059669` | `#34d399` | Akzent, Links, Primärbuttons |
| `--accent-hover` | `#047857` | `#6ee7b7` | Hover |
| `--bg-a` / `--bg-b` | `#edfbf4` / `#f0fdf9` | `#091c19` / `#0c1a14` | Hintergrundverlauf |
| `--surface` | `#ffffff` | `#142b25` | Karten, Dialoge |
| `--app-bg` | `#f8fafc` | `#0d201c` | App-Hintergrund |
| `--app-ink` | `#1e293b` | `#f1f5f9` | Text |
| `--app-border` | `#cbd5e1` | `#2a4040` | Rahmen |
| `--p-primary-color` / `--p-primary-hover-color` | wie `--accent` | wie `--accent` | PrimeVue-Buttons |

Der Body-Hintergrund (zwei Radial-Gradients plus `linear-gradient(140deg, var(--bg-a), var(--bg-b))`), `font-family: system-ui, -apple-system, sans-serif` und das Box-Modell bleiben identisch.

**Eigene Tokens für MA2LBV** (fachliche Bedeutung, analog zu den Notenfarben in Prognos):

| Token | Bedeutung |
|---|---|
| `--ma-merkmal-v` | Merkmal **V** (weniger als vier vergütungsfähige Stunden) |
| `--ma-merkmal-a` | Merkmal **A** (anteilige Besoldung bei Teilzeit) |
| `--ma-merkmal-k` | Merkmal **K** (Klassenfahrt, Lohnart 5006, nur Tarif-Teilzeit) |
| `--ma-fehler` | Zeile/Zelle mit Prüffehler |
| `--ma-ok` | Zeile erfolgreich exportiert |
| `--ma-gesperrt` | Nicht ausgewählte Monatsspalte oder Zeile |

Das alte MA2 ließ die Farben für die Merkmale V, A und „4“ frei per Farbdialog wählen (`gbFarben` in den Parametern). Das entfällt: feste, kontrastgeprüfte Farben in Hell und Dunkel (WCAG AA, Text ≥ 4,5:1, Bedienelemente ≥ 3:1). Die Bedeutung wird zusätzlich durch Text oder Icon vermittelt, nicht nur durch Farbe.

### O2 – Komponenten und Bootstrapping

`main.ts` entspricht Prognos: Pinia, Router, PrimeVue mit `Aura` und `darkModeSelector: '.dark'`, `ToastService`, `ConfirmationService`, Direktive `tooltip`, `primeicons`, `initTheme()` **vor** dem Mount.

`App.vue` enthält nur `<Toast />` und `<RouterView />`.

| Zweck | Komponente |
|---|---|
| Buttons, Textfelder, Passwort, Meldungen | `Button`, `InputText`, `Password`, `Message` (PrimeVue) |
| Dialoge | `Dialog` (PrimeVue), Bestätigungen `ConfirmDialog` |
| Auswahllisten | `Select`, `MultiSelect`, `Checkbox` |
| Tabelle Mehrarbeit | AG Grid Community 32 mit dem Stil der Tabellen aus Import/Prognos |
| Rückmeldungen | `Toast` |
| Symbole | PrimeIcons (`pi pi-…`) |

Weitere PrimeVue-Komponenten sind erlaubt, wenn sie sich über die Aura-Tokens einfärben lassen. Es werden keine zusätzlichen UI-Bibliotheken eingeführt.

### O3 – Dunkelmodus und ThemeToggle

- Dark Mode über die Klasse `dark` auf `<html>`.
- `composables/useTheme.ts` und `components/ThemeToggle.vue` werden unverändert aus Prognos übernommen: Reihenfolge `system → light → dark`, Symbole `pi-desktop`, `pi-sun`, `pi-moon`, runder Button 2 rem.
- `localStorage`-Schlüssel **`dark-mode`**, identisch in allen SVWS-Apps, damit die Auswahl app-übergreifend gilt (alle Tools unter demselben Origin des SVWS-Servers).
- Der ThemeToggle erscheint in jedem Seitenkopf und auf der Verbindungsseite oben rechts.

### O4 – Seitenaufbau und Navigation

**Routing:** Hash-History. Wie in Prognos hängt das Anmelden an einem `meta.requiresAuth`-Guard im Router.

| Route | Name | Inhalt | Delphi-Entsprechung |
|---|---|---|---|
| `/connect` | `connect` | Verbindung zum SVWS-Server | `mLogin` (SchILD-Anmeldung) |
| `/` | `dashboard` | Kachelübersicht | Splash/Startzustand des Hauptfensters |
| `/abrechnung` | `abrechnung` | Mehrarbeitstabelle, Prüfen, PDF-Export | Hauptfenster `mMA2Main` |
| `/einstellungen` | `einstellungen` | Formulardaten, Darstellung | `mParameterIO` (Einstellungen) |
| `/:pathMatch(.*)*` | – | Weiterleitung auf `/connect` | – |

Die Route `/abrechnung` und `/einstellungen` sind **auch ohne SVWS-Verbindung** erreichbar (ADR 001 E4). Nur die Lehrkraft-Übernahme aus SVWS benötigt die Verbindung. Der Dashboard-Guard leitet deshalb nicht hart auf `/connect` um, sondern bietet dort „Ohne Verbindung fortfahren“ an.

**Navigation:** Wie in Prognos keine globale Seitenleiste. Navigation läuft über die Kacheln des Dashboards und einen Zurück-Link im Seitenkopf der Unterseiten.

### O5 – Verbindungsseite (`ConnectView`)

1:1 nach Prognos: zentrierte Karte (`max-width: 420px`, `padding: 2.5rem`, `border-radius: 12px`, Rahmen `--app-border`, Schatten `0 4px 24px rgba(0,0,0,.08)`), darüber `ThemeToggle` oben rechts, unter der Karte `LegalFooter`.

Aufbau der Karte von oben nach unten:
1. `<h1>SVWS MA2LBV</h1>`
2. Version (`v0.1.0`) aus `package.json`
3. Untertitel „Verbindung zum SVWS-Server“
4. Felder: Server-URL, Schema, Benutzername, Passwort (`Password` mit `toggleMask`, `:feedback="false"`)
5. Fehlermeldung als `Message severity="error"`
6. Button „Verbinden“ (volle Breite, `loading` während des Tests)
7. Zusätzlich gegenüber Prognos: Sekundär-Link „Ohne Verbindung arbeiten“ (Text-Button), siehe O4

Im Dev-Modus werden die Felder aus `.env` vorbelegt, im Produktivbuild bleiben sie leer.

### O6 – Dashboard (`DashboardView`)

Seitenkopf: links `<h1>SVWS MA2LBV</h1>`, rechts `ThemeToggle` und Button „Abmelden“ (`pi-sign-out`, `severity="secondary"`, `text`). Darunter ein `tile-grid` (`gap: 1.5rem`, responsiv: ≤ 900 px zwei Spalten, ≤ 560 px eine Spalte). Kacheln wie in Prognos (`padding: 2rem 1.5rem`, `border-radius: .75rem`, Icon-Feld 4 rem, Pfeil `pi-chevron-right`, Hover mit `--p-primary-color`-Rahmen und leichtem Schatten).

| Kachel | Typ | Inhalt |
|---|---|---|
| **Schuldaten** | Info (nicht klickbar) | Schulform, Schema, Server, Benutzer, Schulnummer, Abrechnungszeitraum; bei Offline-Arbeit der Hinweis „Keine SVWS-Verbindung“ |
| **Mehrarbeit abrechnen** | Navigation, Akzent | „Abrechnung erfassen, prüfen und als PDF an das LBV exportieren“ → `/abrechnung` |
| **Einstellungen** | Navigation | „Formulardaten der Schule und Darstellung“ → `/einstellungen` |

Weitere Kacheln (z. B. Auswertung, Protokoll) sind nicht vorgesehen. Das Dashboard bleibt so schlank wie das von Prognos.

### O7 – Hauptansicht Abrechnung (`AbrechnungView`)

Das alte Hauptfenster besteht aus einem Ribbon mit vier Reitern (Datei, Bearbeiten, LBV-Export, Hilfe), einer Tabelle mit Checkbox-Spalten und einer Statusleiste. Das wird auf die Muster der SVWS-Tools abgebildet: **Seitenkopf, Werkzeugleiste, AG-Grid-Tabelle, Fußleiste**.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Dashboard   Mehrarbeit abrechnen            [Theme] [Abmelden]          │  Seitenkopf
├──────────────────────────────────────────────────────────────────────────┤
│ [Importieren ▾] [Zeitraum] │ [Zeile +] [Zeile –] [Hinweise] │ [Sicherung ▾] │  Werkzeugleiste
│                                           [Prüfen] [PDF exportieren ▾]   │
├──────────────────────────────────────────────────────────────────────────┤
│ ☑ # Langname  Vorname  Geb.-Dat.  LBV-Nr.  VS ☑25/10 M ☑25/11 M … Su. Status Hinweis │  Tabelle
│ ☑ 1 …                                                                    │
├──────────────────────────────────────────────────────────────────────────┤
│ Abrechnung: Test_….txt │ Arbeitsdatei: mehrarbeit.ma2lbv * │ 12 von 14 gewählt │  Fußleiste
└──────────────────────────────────────────────────────────────────────────┘
```

**Aktionen (Mapping der Delphi-Aktionen):**

| Delphi-Aktion | Neue Bedienung |
|---|---|
| Abrechnungsdaten importieren / Abrechnungsdatei festlegen | Menü „Importieren“ → „Abrechnungsdatei (Untis/CSV)“ (beide Formate werden erkannt). Kein dauerhafter Dateipfad. Dateien lassen sich auch auf die Tabelle ziehen; der Typ wird an der Endung erkannt |
| Abrechnungszeitraum zuordnen | Button „Zeitraum…“ öffnet den Startmonat-Dialog (O8). Warnung, dass Stunden, Merkmale und Hinweise gelöscht werden |
| SchILD-Import | Menü „Importieren“ → „Lehrkräfte aus SVWS“ (Dialog O8), nur mit Verbindung |
| Zeile einfügen / löschen | „Zeile +“, „Zeile –“ (und Kontextmenü) |
| Hinweis löschen / alle Hinweise löschen | Kontextmenü und „Hinweise löschen“ |
| Mehrarbeitsdatei öffnen / speichern / speichern unter | „Importieren“ → „Gesicherte Arbeitsdatei“ zum Öffnen. Speichern: ohne SVWS-Verbindung Button „Sichern“, mit Verbindung Menü „Sicherung“ (sofort auf dem Server speichern, Sicherungsdatei). Strg+S wirkt je nach Verbindung. Ist die Tabelle leer, bietet sie drei Kacheln zum Beginnen |
| LBV-Export (eine Zeile / alle markierten) | „PDF exportieren“: aktuelle Zeile oder alle markierten; mehrere Lehrkräfte ergeben ein ZIP |
| Exportziel „nur prüfen“ | Button „Prüfen“ (Hinweisspalte wird gefüllt, kein PDF) |
| PDF-Datei anzeigen (Rechtsklick auf Hinweis) | Link in der Hinweisspalte öffnet die PDF-Vorschau in neuem Tab |
| Übersicht exportieren / drucken | Menü „Tabelle exportieren“ (CSV, PDF), „Drucken“ |
| Markieren: alle / keine / umkehren (Strg+A / K / U) | Checkbox im Kopf der Markierungsspalte (alle / keine, Zwischenzustand bei teilweiser Markierung); „umkehren“ und die Tastenkürzel Strg+A / K / U bleiben |
| Zoom (Strg++ / Strg+–) | Electron-Menü und Tastenkürzel wie in den Schwesterprojekten; im Browser Browser-Zoom |
| Hilfe (F1), Bedienungsanleitung, Ausfüllanleitung LBV | Footer-Link „Hilfe“ (O10) und Link auf die LBV-Ausfüllanleitung |

**Tabelle (Spaltenreihenfolge wie im alten MA2):**

| Spalte | Inhalt | Bearbeitung |
|---|---|---|
| Auswahl (Checkbox, Kopf: alle) | Zeile für Export markiert | ja |
| `#` | laufende Nummer | nein |
| Langname, Vorname | Namen | ja |
| Geb.-Dat. | `TT.MM.JJJJ` | ja, Prüfung auf gültiges Datum |
| LBV-Nr. | Personalnummer, Leerzeichen werden entfernt | ja, Prüfziffer wird beim Verlassen geprüft |
| V.-Schl. | Vergütungsschlüssel 1–4 | ja, Auswahl mit Hinweistexten (Schlüsselliste aus `mavs.dat`) |
| 6 × Monat (Kopf-Checkbox) + **M.** | Stunden und Merkmal je Abrechnungsmonat. Monatsspalte kann über die Kopf-Checkbox aus der Abrechnung ausgenommen werden | ja |
| Su. | Summe der Stunden der markierten Monate, 1 Nachkommastelle | nein |
| Status | Kürzel `V`/`T`/`W` | ja |
| Hinweis(e) | Prüfergebnis oder Exportdatei | nein |

Das Eingabeverhalten folgt dem alten Programm: Beim Verlassen einer Merkmalszelle wird geprüft, ob V/A (Bereich A) bzw. K (Bereich C) zulässig sind. Bei Verstoß wird die Zelle geleert und eine Meldung angezeigt. Die vollständigen Regeln stehen in [ADR 003](adr003-delphi-analyse.md).

Darstellung: Zeilen mit Prüffehler tragen `--ma-fehler`, exportierte Zeilen `--ma-ok`, ausgenommene Monatsspalten `--ma-gesperrt`. Die Tabellenhöhe füllt den verfügbaren Platz. Spaltenbreiten passen sich dem Inhalt an (entspricht `AutoSizeColumns`). Ein Filter in der Kopfzeile ersetzt die Delphi-Option „AutoFilter“.

### O8 – Dialoge

| Dialog | Delphi-Vorbild | Aufbau |
|---|---|---|
| **Startmonat wählen** | `WaehleAbrechnungszeitraum` | Liste der Monate (zwei Jahre zurück bis zum aktuellen Monat) als `Select`; die sechs Monate ab Auswahl werden als Vorschau angezeigt |
| **Lehrkräfte aus SVWS** | `AusWaehlen2` | `Dialog` mit Suchfeld und Mehrfachauswahl; Spalten Kürzel, Name, Vorname, Rechtsverhältnis, LBV-Nr., Beschäftigungsart, Vergütungsschlüssel; bereits übernommene Lehrkräfte (gleicher Name und Geburtsdatum) sind deaktiviert |
| **Vergütungsschlüssel wählen** | Auswahl aus `mavs.dat` | Liste der Schlüssel 1–4 mit Beschreibung (z. B. „gehobener Dienst aller Schulformen …“) |
| **Passphrase** | – (neu) | Eingabe und Wiederholung beim Sichern, Eingabe beim Öffnen; Hinweis, dass die Passphrase nicht wiederherstellbar ist |
| **Export** | `LBVExport`-Dialog | Auswahl: „PDF speichern“, „PDF speichern und drucken“, „nur prüfen“ |
| **Ungesicherte Änderungen** | `FormCloseQuery` | `ConfirmDialog` „Arbeitsdatei wurde geändert. Zuerst sichern?“ (Ja / Nein / Abbrechen). Zusätzlich `beforeunload` im Browser und Schließen-Abfrage in Electron |

Dialoge verwenden die Kartenoptik (`--surface`, `--app-border`, `border-radius: 14px`) wie das Impressum-Modal.

### O9 – Einstellungen (`EinstellungenView`)

Die Formularfelder des alten Parameterdialogs bleiben erhalten. Der Aufbau ist eine einzelne Karte mit Abschnitten, kein Reiter-Dialog:

**Abschnitt „Formulardaten“** (Felder der LBV-Vorlage):

| Feld | Hinweis |
|---|---|
| Dienststelle | mehrzeilig; im alten Programm trennte `~` die Zeilen. Hier ein Textbereich, Zeilen werden beim Export zu Zeilenumbrüchen |
| Aktenzeichen, PLZ/Ort, Bearbeiter, Telefon, Nebenstelle, E-Mail (freiwillig) | |
| Schulnummer | sechsstellig; wird aus SVWS vorbelegt, wenn verbunden (dann schreibgeschützt, wie im alten Programm mit SchILD) |
| Anzahl der Minuten je Unterrichtsstunde | fünfstellig mit zwei Nachkommastellen, leer = 45,00 (Standard) |
| Schulform (nur Lehramtsanwärter, Formular „VNU/VZU“) | zweistelliger Schlüssel 01–14, 16 |
| Mehrarbeit an weiterer Schule der gleichen Schulform | Schalter „Nein“ (Standard) |
| „Sachlich richtig“, „Unterschrift“ | Namen der zeichnenden Personen; Hinweis auf die Ausfüllanleitung des LBV |

**Abschnitt „Verhalten“:** „Merkmale automatisch setzen (A/V)“ (Delphi: `MerkmalSetzen`, Standard an), „Spaltenfilter anzeigen“ (Delphi: `AutoFilter`).

**Abschnitt „PDF-Vorlagen“:** Anzeige der eingebetteten Formularversion (z. B. `LBV(A/Bes)23_2019_02`) und Upload einer eigenen Vorlage (siehe ADR 001 E6).

**Abschnitt „Daten sichern“:** Formulardaten als JSON exportieren/importieren.

Speichern: Button „Speichern“ mit Toast „Einstellungen gespeichert“. Pflichtfeldfehler (Schulnummer, Taktung) werden unter dem Feld angezeigt.

**Nicht übernommen:** Design-/Stil-Auswahl (Office-Themes), Symbolsatz „Farbig/Office/Monochrom“, Hilfedarstellung „Windows/Browser“, Druckerauswahl und Druckmodus, SchILD-Zugriff (MDB/UDL/Zentral, DB-Benutzer), Benutzer- und Administratorpasswörter, Fensterpositionen (`FormularFenster`, `ParaFenster`, …), Splash-Screen, Update-Prüfung per FTP. Updates liefern die Releases bzw. das Tools-Paket.

### O10 – Fußbereich: Hilfe, Impressum, Datenschutz

`components/LegalFooter.vue` und die zugehörigen Stile aus `style.css` (`.impressum-*`) werden aus Prognos übernommen:

- **Hilfe:** Link auf die Dokumentation (`https://doku.svws-nrw.de/svws_module/svws_ma2lbv/`, Adresse noch zu bestätigen, siehe Offene Fragen)
- **Impressum:** Button öffnet ein Modal. Im Produktivbuild lädt es `impressum.js` (Fallback `impressum.example.js`), im Dev-Modus `impressum.md`. `scripts/copy-impressum.mjs` erzeugt die Datei aus `impressum.md` bzw. `impressum.example.md`.
- **Datenschutzhinweise:** Button öffnet ein Modal mit `docs/datenschutz.md` (`?raw`, `marked` + `DOMPurify`).

Der Datenschutztext muss MA2LBV-spezifisch geschrieben werden: Verarbeitung nur lokal, Verschlüsselung der Arbeitsdatei, keine Übermittlung an Dritte, Zugangsdaten nur im Arbeitsspeicher. Der alte MA2-Text („Verfahrensverzeichnis Schule“) kann als Ausgangspunkt dienen.

Auf der Verbindungsseite steht der Footer unter der Karte. Auf allen anderen Seiten steht er unten im Seitenfuß.

### O11 – Texte, Sprache, Barrierefreiheit

- Oberflächensprache **Deutsch**, **Du-Form** (Entscheidung 2026-11-11, gilt für Oberfläche, Datenschutzhinweise und Bedienungsanleitung), Begriffe wie im SVWS: „Lehrkraft“, „Abrechnungszeitraum“, „Vergütungsschlüssel“, „Änderungsmitteilung“. Fehlermeldungen übernehmen den Wortlaut des alten Programms, wo er fachlich erprobt ist (z. B. „Fehler: Vergütungsschlüssel (…)“), und zeigen die Ursache in einem Satz.
- Fehlermeldungen: Toast für Aktionen, `Message` im Formular, Hinweisspalte für zeilenbezogene Fehler. Keine `alert()`-Dialoge.
- Tastaturbedienung: alle Aktionen per Tab erreichbar, sichtbarer Fokus (`outline: 2px solid var(--accent)`), Tastenkürzel Strg+A/K/U für Markierungen.
- Kontraste nach WCAG AA, Farbe nie einziger Bedeutungsträger (Merkmale V/A/K zusätzlich als Buchstabe in der Zelle).
- Mindestbreite 1024 px für die Hauptansicht; Dashboard und Verbindungsseite bleiben bis 560 px nutzbar. Eine Ansicht für Mobilgeräte ist kein Ziel.

### O12 – Icon und Logo

Nach Prognos ADR 0019: `build/icon.svg` (256×256, abgerundete Ecken `rx=38`, Verlauf im Hintergrund, goldener Akzent `#F7B32B → #F28F3B`) und `build/icon.png` (256×256, RGBA, aus dem SVG mit Inkscape und absolutem Ausgabepfad exportiert). **Kein `.ico`.**

Die Icons der Schwesterprojekte (Conference: Teal; GradeHub und Prognos: Blau) müssen unterscheidbar bleiben. **Vorschlag:** warmer Verlauf von Dunkelbraun nach Orange (`#4A2A14 → #B8651F`), Motiv: Uhr (Stunde) mit Blatt/Dokument und goldener Plakette. Die Farbwahl ist ein Vorschlag, die Freigabe steht aus.

Für die Dokumentation entsteht ein Logo-SVG im Stil des Prognos-Logos (52 px Kachel + Wortmarke „SVWS MA2LBV“ und Unterzeile „Änderungsmitteilung Mehrarbeit · LBV NRW“) unter `docs/assets/`.

## Alternativen

| Alternative | Verworfen, weil |
|---|---|
| Ribbon-Oberfläche des alten MA2 nachbauen | Passt nicht zu den SVWS-Tools; kein PrimeVue-Pendant; Anwenderinnen und Anwender kennen inzwischen das Kachel-/Werkzeugleisten-Muster |
| Eigene Farben für MA2LBV (z. B. Orange als Primärfarbe) | Vorgabe verlangt exakte Übereinstimmung; die Emerald-Palette ist app-übergreifend |
| Merkmalsfarben frei konfigurierbar wie in MA2 | Aufwand und Barrierefreiheitsrisiko; feste Farben sind kontrastgeprüft |
| Reiter-Dialog für Einstellungen (wie `mParameterIO`) | Die Schwesterprojekte nutzen Seiten statt Modal-Dialoge mit Reitern |
| Eigene Tabelle auf Basis `<table>` | Inline-Bearbeitung, Tastatursteuerung, Filter und Auswahl wären Eigenbau (siehe Import ADR 0007) |
| Globale Seitenleiste | Keines der Tools hat eine; Kacheln + Zurück-Link genügen bei drei Zielen |

## Konsequenzen

**Positiv**
- Wiedererkennbare Bedienung über alle SVWS-Tools hinweg; Dark Mode und Theme-Auswahl sind sofort app-übergreifend synchron.
- Wenig neues Design: Komponenten, Stile und Footer stammen aus Prognos, nur Hauptansicht und Dialoge sind neu.
- Die Fachbedeutung der Merkmale ist barrierefrei erkennbar.

**Negativ / Risiken**
- Die Token-Liste in `style.css` muss manuell zwischen den Apps konsistent gehalten werden (Prognos ADR 0017); Änderungen am Design-System müssen in allen Projekten nachgezogen werden.
- AG Grid braucht eigene Stilanpassungen für Dark Mode und Merkmalsfarben.
- Wer das alte Ribbon gewohnt ist, muss sich umstellen. Das Handbuch enthält deshalb eine Gegenüberstellung „Alt → Neu“ (Tabelle in O7).
- Die Hauptansicht ist breiter als die Seiten der anderen Tools (sechs Monatsspalten mit je zwei Spalten); auf kleinen Bildschirmen scrollt die Tabelle horizontal.

## Offene Fragen

| # | Frage |
|---|---|
| 1 | Hilfe-URL der Dokumentation für MA2LBV festlegen |
| 2 | Freigabe des Icon-Vorschlags (Farbe, Motiv) |
| 3 | Sollen die Spaltenüberschriften (`Langname`, `Geb.-Dat.`, `V.-Schl.`, `M.`, `Su.`) wie im alten Programm bleiben oder ausgeschrieben werden („Vergütungsschlüssel“)? Vorschlag: ausgeschrieben, mit Kürzel als Tooltip |
| 4 | Soll es zusätzlich eine Auswertungs-/Protokollansicht geben (Liste der erzeugten PDFs)? Im alten Programm nicht vorhanden, daher vorerst Nein |
