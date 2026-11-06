# ADR 001: Grundsätzliche Architekturentscheidungen für SVWS-MA2LBV

- **Status:** Vorgeschlagen
- **Datum:** 2026-11-06
- **Autor:** Frank Pfotenhauer
- **Projekt:** SVWS-MA2LBV
- **Folge-ADRs:** [ADR 002 – Oberfläche](adr002-oberflaeche.md), [ADR 003 – Analyse des Delphi-Codes](adr003-delphi-analyse.md)

## Kontext

Das Delphi-Programm **MA2** (früher MA2LBV) erzeugt für Lehrkräfte die *Änderungsmitteilung Mehrarbeitsvergütung* an das Landesamt für Besoldung und Versorgung NRW (LBV). Es liest Mehrarbeitsdaten aus einer CSV-Abrechnungsdatei (z. B. GP-Untis) oder erfasst sie manuell, übernimmt Lehrkraft-Stammdaten aus SchILD-NRW bzw. SchILDzentral, prüft die Daten und füllt eine PDF-Vorlage des LBV aus (siehe [ADR 003](adr003-delphi-analyse.md)).

Die SVWS-Tools-Familie (SVWS-Import, SVWS-Prognos, SVWS-Conference, SVWS-GradeHub) ersetzt schrittweise die alten Delphi-Module. MA2 soll als **SVWS-MA2LBV** ebenfalls abgelöst und später im Paket `svws-tools-<version>.zip` (Repository SVWS-Tools, `docs/adr/adr001-svws-tools-deployment.md`) ausgeliefert werden. Das neue Tool muss deshalb Aufbau, Build, Auslieferung und Erscheinungsbild der Schwesterprojekte übernehmen.

Dieses ADR wurde aus der Analyse von SVWS-Import, SVWS-Prognos, SVWS-Conference, SVWS-GradeHub und SVWS-Tools abgeleitet. SVWS-Prognos ist die engste Vorlage: Es nutzt dieselbe Kombination aus SVWS-Login, Browser-only-Berechnung und Electron-Hülle. Wo die Schwesterprojekte voneinander abweichen, benennt dieses ADR die gewählte Variante.

## Ziele

1. MA2 vollständig ablösen: Alle Funktionen, die ohne SchILD-Datenbankzugriff sinnvoll sind, werden abgebildet.
2. Die LBV-Logik (Prüfregeln, Merkmale, Formularbefüllung) **exakt** übernehmen und durch automatische Tests absichern.
3. Aufbau, Tooling und Auslieferung wie die anderen SVWS-Tools, damit Pflege und Paketierung ohne Sonderwege funktionieren.
4. Keine zusätzliche Infrastruktur an der Schule: kein Server-Prozess, keine Datenbank.
5. Personenbezogene Daten (Name, Geburtsdatum, LBV-Personalnummer, Stunden) bleiben im Browser bzw. in der Electron-App.

## Entscheidungen

### E1 – Name, Bezeichner, Ablage

| Element | Wert |
|---|---|
| Projektname / Repository | `SVWS-MA2LBV` (Ziel-Repository: `SVWS-NRW/SVWS-MA2LBV`, siehe Offene Fragen) |
| `package.json` → `name` | `svws-ma2lbv` |
| Anzeigename (`productName`, Titel, Kopfzeile) | `SVWS MA2LBV` |
| Electron `appId` | `de.skinwalker.svws-ma2lbv` (wie `de.skinwalker.svws-import` / `-prognos`) |
| Startmenü | Gruppe `SVWS`, Verknüpfung `SVWS-MA2LBV` |
| Zielordner im Tools-Paket | `ma2lbv` (a–z, 0–9, `-`) |
| Startversion | `0.1.0`, SemVer, Tag `v<version>` |
| Lizenz | BSD-3-Clause (liegt bereits im Repository) |

Der Name „MA2LBV“ bleibt bewusst erhalten, weil Schulen das Programm unter diesem Namen kennen („vormals MA2LBV“).

### E2 – Technologiestack (identisch zu SVWS-Prognos)

| Bereich | Entscheidung |
|---|---|
| Framework | Vue 3 (`<script setup>`, Composition API) |
| Sprache | TypeScript ~5.7, `strict: true` |
| Build | Vite 6, `vue-tsc` vor jedem Build |
| State | Pinia |
| Routing | Vue Router 4 mit **Hash-History** (wegen `file://` und Electron) |
| UI-Komponenten | PrimeVue 4 mit Aura-Preset, PrimeIcons |
| Tabelle | AG Grid Community 32 (wie Import und Prognos, siehe Import ADR 0007) |
| HTTP | Axios, gekapselt im Service-Layer |
| Tests | Vitest 3 |
| Desktop | Electron 42, electron-builder 26 |
| Markdown (Datenschutz, Impressum) | `marked` + `DOMPurify` |
| Node | ≥ 22 (für den Electron-Build) |

**Zusätzlich gegenüber Prognos:**

| Paket | Zweck | Begründung |
|---|---|---|
| `pdf-lib` (MIT) | AcroForm-Felder der LBV-Vorlagen im Browser ausfüllen | Kann bestehende PDFs laden und Formularfelder setzen. `jspdf` (in GradeHub/Conference) kann nur neue PDFs erzeugen und scheidet aus. |
| `fflate` | ZIP für Sammelexport mehrerer PDFs | Bereits in Conference und GradeHub im Einsatz |
| `papaparse` | Einlesen der Abrechnungs-CSV | Bereits in Import im Einsatz; die Delphi-Dateien haben wechselnde Trennzeichen (siehe ADR 003) |

Nicht übernommen werden `read-excel-file` (kein XLSX-Import in MA2) und `jspdf`.

Abweichung der Schwesterprojekte, die hier entschieden wird: Pinia `^3` und Vitest `^3` wie in Prognos (Import nutzt Pinia 4, GradeHub/Conference Pinia 2). Vite 6 wie Import/Prognos (Conference nutzt Vite 8).

### E3 – Browser-first, kein eigener Server

Die Anwendung läuft vollständig im Browser bzw. in Electron. Es gibt keinen Anwendungsserver und keine Middleware (wie Import ADR 0001/0002/0004, GradeHub E2).

- Build-Ausgabe ist ein statisches Bundle in `dist/` mit `base: './'`.
- Das Bundle wird als **IIFE ohne `type="module"`** gebaut (Vite-Plugin `removeModuleType`, `rollupOptions.output.format: 'iife'`, wie in Import und Prognos). Nur so läuft es per `file://`, in Electron und unter `/app/ma2lbv/` des SVWS-Servers.
- Der Dev-Server enthält den Plugin-Proxy `/svws-proxy` (Header `X-Proxy-Target`) gegen CORS-Probleme, wie in Prognos.

### E4 – Datenquelle: SVWS-REST-API statt SchILD-Datenbank

Das alte MA2 las Lehrkraftdaten direkt aus der SchILD-Datenbank (MDB, UDL oder SchILDzentral) und hatte dafür eigene Benutzerverwaltung (`MA2Admin`, bis zu drei Benutzer, Admin-Passwort). Das entfällt vollständig.

- Anmeldung wie in Prognos (ADR 0011): Server-URL, Schema, Benutzername, Passwort, **Basic Auth**, Zugangsdaten nur im Arbeitsspeicher (Pinia `authStore`), weder in `localStorage` noch in `sessionStorage`, nie in Logs.
- Die SVWS-Rechteprüfung ersetzt die SchILD-Rechte („Admin oder lesend auf Lehrkraftdaten“). Die App kennt keine eigene Rollenverwaltung. Wer sich anmelden kann und Lehrkraftdaten lesen darf, kann Lehrkräfte übernehmen.
- `.env` liefert nur im Dev-Modus Standardwerte (`VITE_SVWS_URL`, `VITE_SVWS_SCHEMA`, `VITE_SVWS_USERNAME`, `VITE_SVWS_PASSWORD`), `.env.example` liegt im Repository.
- Der Zugriff liegt ausschließlich in `services/` (`apiClient.ts`, `svwsService.ts`). Komponenten rufen Axios nie direkt auf (Prognos ADR 0010).

**Benötigte Daten je Lehrkraft** (Entsprechung zu `tLehrer` im Delphi-Code): Kürzel, Nachname, Vorname, Geburtsdatum, LBV-Personalnummer, Vergütungsschlüssel (1–4), Rechtsverhältnis (Lehramtsanwärter = `W`), Beschäftigungsart (`V` Vollzeit / `T` Teilzeit). Zusätzlich die Schulnummer der eigenen Schule zur Vorbelegung der Einstellungen.

> **Ungeprüft:** Welche Endpunkte und Felder des SVWS-Servers diese Werte liefern (`/lehrer`, `/lehrer/{id}`, Personaldaten, `/schule/stammdaten`), ist noch nicht gegen die OpenAPI-Beschreibung des Zielservers verifiziert. Die Felder für LBV-Nummer, Vergütungsschlüssel, Rechtsverhältnis und Beschäftigungsart sind der erste Prüfpunkt bei der Umsetzung (siehe Offene Fragen).

**Funktionen ohne SVWS-Anbindung bleiben nutzbar:** CSV-Import und manuelle Erfassung funktionieren auch ohne Verbindung. Der Verbindungsdialog darf deshalb übersprungen werden („Ohne SVWS-Verbindung arbeiten“). Das entspricht dem Delphi-Modus `OhneSchILDZugriff`. Die Route-Guards unterscheiden `requiresAuth` (nur SVWS-Import der Lehrkräfte) von frei zugänglichen Ansichten.

### E5 – Persistenz und Datenschutz

Das alte MA2 speicherte die Arbeitsdaten als AES-256-verschlüsselte `.maa`-Dateien mit einem **fest im Quelltext hinterlegten Schlüssel** und Einstellungen in verschlüsselten INI-Dateien. Beides wird nicht übernommen.

| Daten | Ablage | Begründung |
|---|---|---|
| SVWS-Zugangsdaten | nur RAM (Pinia) | wie Prognos ADR 0011 |
| Mehrarbeitstabelle (Namen, Geburtsdaten, LBV-Nummern, Stunden) | im Arbeitsspeicher; Sichern und Öffnen über eine **verschlüsselte Datei** (`*.ma2lbv`, AES-GCM über Web Crypto, Schlüssel aus Passphrase per PBKDF2) | Personenbezogene Daten dürfen nicht unverschlüsselt in `localStorage` liegen. Die Passphrase wählt die Anwenderin oder der Anwender, kein fester Schlüssel im Code. |
| Formulardaten der Schule (Dienststelle, Aktenzeichen, Ort, Bearbeiter, Telefon, Schulnummer …) | `localStorage` (`svws-ma2lbv-formulardaten`), zusätzlich Export/Import als JSON | Keine Schülerdaten, aber dienstliche Angaben; der Export erleichtert den Umzug auf einen anderen Rechner |
| Oberflächeneinstellungen (Theme) | `localStorage`, Schlüssel `dark-mode` | identisch in allen SVWS-Apps, siehe ADR 002 |
| Erzeugte PDFs | Download durch den Browser bzw. Speichern-Dialog in Electron | Kein Schreiben in feste Pfade (`\pdf`, `\ma`, `\abrechnung`) |

Alte `.maa`-Dateien werden **nicht** gelesen (Format und Schlüssel sind nicht Teil der Aufgabe, siehe Offene Fragen). Die Umstellung läuft über den CSV-Import und den Lehrkraft-Import aus SVWS.

### E6 – PDF-Erzeugung im Client

- Die LBV-Vorlagen (`LBV-Vorlage.pdf` für Lehrkräfte, `LBV-LAA-Vorlage.pdf` für Lehramtsanwärter) werden mit `pdf-lib` geladen, die benannten AcroForm-Felder werden gesetzt, das Ergebnis wird als Blob bereitgestellt.
- **Die Vorlagen werden in das Bundle eingebettet** (Vite `?inline`, Base64, lazy geladen) und nicht als eigene Dateien ausgeliefert. Gründe:
  1. Der SVWS-Server liefert unter `/app/<name>/` nur bestimmte Dateitypen aus. SVWS-Tools ADR 001 nennt `.html`, `.js`, `.css`, Bilder und Schriften, ausdrücklich nicht `.json`; `.pdf` steht nicht in dieser Liste. Eine lose PDF-Datei im Web-App-ZIP wäre dann im Betrieb vermutlich nicht abrufbar (gegen den SVWS-Server zu verifizieren, Einbetten ist in jedem Fall sicher).
  2. Unter `file://` (Electron, Offline-Betrieb) schlägt `fetch()` auf lokale Dateien wegen CORS fehl.
- Die Vorlagen können durch die Anwenderin oder den Anwender ersetzt werden (Upload in den Einstellungen), falls das LBV ein neues Formular veröffentlicht, bevor ein Tool-Update erscheint. Das entspricht der Delphi-Lösung mit austauschbarem `Vorlagen`-Ordner.
- Mehrere Lehrkräfte ergeben ein ZIP mit je einer PDF (`fflate`), analog zum Delphi-Gruppenprozess „LBV-Export (alle markierten Zeilen)“.
- Der Druck läuft über den Druckdialog des Browsers bzw. von Electron. Die Delphi-Druckerauswahl und die Wahl „Acrobat / Direktdruck“ entfallen.

Die Fachlogik für Formularbefüllung und Prüfregeln steht in [ADR 003](adr003-delphi-analyse.md).

### E7 – Projektstruktur

Gleiche Grundstruktur wie SVWS-Prognos (siehe Prognos ADR 0012):

```
SVWS-MA2LBV/
├── build/                       icon.svg (256×256), icon.png (256×256, RGBA)
├── docs/
│   ├── adr/                     adr001-architektur.md, adr002-oberflaeche.md, adr003-delphi-analyse.md, …
│   ├── assets/                  Screenshots, Logo (svg)
│   ├── index.md                 Anwenderhandbuch (Einstieg)
│   ├── installation.md, verbindung.md, hilfe.md, funktionen/…
│   ├── datenschutz.md           wird im Footer als Modal angezeigt
│   └── projektplan.md
├── electron/main.cjs            wie Prognos (Zoom-Kürzel, CORS-Fix, Menü „Datei/Ansicht“)
├── public/
├── scripts/
│   ├── release.mjs              Version erhöhen → bauen → Tag pushen → GitHub-Release-Entwurf
│   (Impressum: public/impressum.example.js, wie Prognos)
├── src/
│   ├── App.vue                  nur <Toast /> + <RouterView />
│   ├── main.ts                  PrimeVue/Aura, Pinia, Router, initTheme()
│   ├── style.css                Design-Tokens (siehe ADR 002)
│   ├── router/index.ts
│   ├── views/                   Seiten (ConnectView, DashboardView, AbrechnungView, EinstellungenView)
│   ├── components/
│   │   ├── ThemeToggle.vue, LegalFooter.vue
│   │   └── abrechnung/          Tabelle, Dialoge (Lehrkraftwahl, Startmonat, Export)
│   ├── stores/                  auth, einstellungen, abrechnung
│   ├── services/                apiClient, svwsService, errorService, csvImport, pdfExport, dateiVerschluesselung
│   ├── models/                  Lehrkraft, Mehrarbeitszeile, LbvParameter, AppError
│   ├── rules/                   LBV-Regeln, isoliert und ohne Vue-Abhängigkeit (siehe unten)
│   ├── composables/             useTheme.ts
│   ├── utils/                   Monats-/Zahlenformat, Dateinamen
│   └── assets/vorlagen/         LBV-Vorlage.pdf, LBV-LAA-Vorlage.pdf (eingebettet)
├── .env.example, .gitignore, eslint-/tsconfig-Dateien, vite.config.ts, index.html
├── impressum.example.md
├── LICENSE, README.md, package.json
```

**`rules/` als eigene Ebene:** Die LBV-Regeln (Personalnummer-Prüfziffer, Zuordnung Bereich A/C, Merkmalsautomatik, Stunden- und Monatsprüfung, Formatierung der Formularwerte) sind reine Funktionen ohne Vue, Pinia und DOM. Sie sind einzeln testbar und können bei einer neuen Formularversion ausgetauscht werden. Das folgt dem `rules/`-Muster aus Prognos.

```
rules/
├── index.ts            Registry nach Formularversion
├── personalnummer.ts   Format + Prüfziffer (8- und 10-stellig)
├── zuordnung.ts        Beamte/Tarif, Voll-/Teilzeit, LAA → Bereich A / C / LAA
├── merkmal.ts          Automatik V / A / K und Prüfung
├── pruefung.ts         Fehlerliste je Zeile (Schulnummer, Taktung, Stunden, Monat, Schlüssel)
├── formular.ts         Werte → Feldtexte (z. B. "0210 003 2")
└── types.ts
```

### E8 – Build und Auslieferung (wie Import/Prognos)

Drei Artefakte pro Release, erzeugt mit `npm run release:build`:

| Artefakt | Inhalt |
|---|---|
| `SVWS-MA2LBV-<version>.AppImage` | Linux, Electron |
| `SVWS-MA2LBV-Setup-<version>.exe` | Windows, NSIS (`oneClick`, Desktop- und Startmenü-Verknüpfung, Menügruppe `SVWS`) |
| `SVWS-MA2LBV-<version>-webapp.zip` | Inhalt von `dist/` mit `index.html` direkt im Root, für den SVWS-Server und `svws-tools.zip` |

`package.json` übernimmt die Skripte aus Prognos (`dev`, `build` = `vue-tsc && vite build`, `preview`, `test`, `electron:dev`, `electron:build`, `electron:build:win`, `release`, `release:build`, `release:github`). `electron-builder` verwendet `build/icon.png` für alle Plattformen, **kein** `.ico` (Prognos-ADR 0019: 16×16-Fehler bei selbst erzeugten `.ico`).

**Aufnahme in SVWS-Tools** (separate Änderung im Repository SVWS-Tools, nicht Teil dieses Repositorys):

```json
{
  "name": "ma2lbv",
  "title": "SVWS-MA2LBV",
  "repo": "SVWS-NRW/SVWS-MA2LBV",
  "asset": "SVWS-MA2LBV-{version}-webapp.zip",
  "version": null
}
```

Zusätzlich eine Kachel mit `href="../ma2lbv"` und `data-tool="ma2lbv"` in `src/start/index.html` von SVWS-Tools. Fehlt die Kachel, warnt der Build.

> **Abweichung in den Schwesterprojekten:** In `SVWS-Tools/tools.json` steht für Prognos und Conference das Asset-Muster `…-webserver.zip`, Import nennt `…-webapp.zip`, und die `package.json` von Prognos erzeugt `…-webapp.zip`. Für SVWS-MA2LBV gilt `-webapp.zip` wie in Import. Vor der Aufnahme in SVWS-Tools muss das Asset-Muster gegen das tatsächlich veröffentlichte Release geprüft werden.

### E9 – Qualitätssicherung

| Werkzeug | Zweck |
|---|---|
| `vue-tsc` | Typprüfung im Build |
| ESLint (`typescript-eslint`, `eslint-plugin-vue`) | Konsistenz, wie GradeHub/Conference |
| Vitest | Unit-Tests für `rules/`, CSV-Import, Formularwerte, Verschlüsselung |

**Pflichttests (aus der Delphi-Analyse):**
- Prüfziffer der LBV-Personalnummer (8-stellig B–E, 10-stellig P), jeweils gültig/ungültig.
- Zuordnung Bereich A / C / LAA und Merkmalsautomatik (Tabelle in ADR 003).
- Beide CSV-Formate und beide Monatsdarstellungen (`MMJJ` ↔ `JJ/MM`), Stundenumrechnung des Untis-Formats.
- Erwartete Feldwerte je Beispielzeile (Golden-File-Test: Beispieldateien → Feldwerte, Auslesen der Felder aus dem erzeugten PDF mit `pdf-lib`).
- Verschlüsseln und Entschlüsseln der Arbeitsdatei, falsche Passphrase.

### E10 – Umgang mit dem Delphi-Quellcode

Der Delphi-Code ist proprietär und liegt außerhalb dieses Repositorys (`/home/pfotenhauer/ownCloud2/Delphi-Module/SP_FP/MA2`).

- Er wird **nie** eingecheckt, `.gitignore` enthält `delphiSrc/` (wie Prognos) und `data/`.
- Die Anwendung wird anhand der dokumentierten Regeln neu geschrieben (ADR 003), nicht übersetzt.
- Im Delphi-Code fest hinterlegte Schlüssel (PDF-Bibliothek, AES-Passphrase) werden weder übernommen noch in Dokumentation, Tests oder Commits wiedergegeben.
- Die Beispiel-Abrechnungsdateien aus dem Installationspaket (`Test_Abrechnung_*.txt`) enthalten erfundene Personen. Sie dürfen als Testdaten in `src/**/__fixtures__/` verwendet werden. **Vorher** ist zu klären, ob die LBV-Vorlagen im Repository weitergegeben werden dürfen (siehe Offene Fragen).

## Alternativen

| Alternative | Verworfen, weil |
|---|---|
| Eigener Node/Java-Server für PDF-Erzeugung | Widerspricht dem Browser-first-Prinzip aller SVWS-Tools, erzeugt Betriebsaufwand und verlagert Personaldaten auf einen Server |
| Direktzugriff auf die SVWS-Datenbank (wie MA2 auf SchILD) | Für Schulen ohne Datenbankzugang nicht möglich; die REST-API ist der vorgesehene Weg |
| `jspdf` als PDF-Bibliothek | Kann bestehende AcroForm-PDFs nicht befüllen; die LBV-Vorlage müsste nachgebaut werden und würde bei jeder Formularänderung abweichen |
| Formular komplett nachbauen (HTML → PDF) | Der LBV verarbeitet das Formular maschinell (Barcode, Feldpositionen); Abweichungen sind nicht vertretbar |
| `.maa`-Format und festen AES-Schlüssel nachbauen | Schlüssel im Quelltext ist keine Verschlüsselung im Sinne des Datenschutzes; Format nicht sinnvoll lesbar |
| Mehrarbeitsdaten dauerhaft in `localStorage` | Personenbezogene Daten unverschlüsselt im Browserprofil; auf gemeinsam genutzten Rechnern nicht akzeptabel |
| Eigene Tabellenkomponente | Hoher Aufwand; AG Grid ist in Import und Prognos eingeführt |
| Neues Layout statt PrimeVue/Aura | Vorgabe: Oberfläche muss exakt zu den anderen Tools passen |

## Konsequenzen

**Positiv**
- Wartung und Paketierung wie bei den vorhandenen Tools; ein Entwickler findet sich sofort zurecht.
- Keine Infrastruktur an der Schule, Personaldaten verlassen den Rechner nicht.
- Die Regeln sind isoliert, getestet und für Formularänderungen austauschbar.

**Negativ / Risiken**
- Der PDF-Barcode und Teile der Vorlagen-Logik hängen an JavaScript im PDF, das Browser-Viewer und `pdf-lib` nicht ausführen. Die Logik wird deshalb im Tool nachgebildet (ADR 003). Ob das Ergebnis im Adobe Reader identisch druckt, muss mit echten Ausdrucken geprüft werden.
- Eingebettete PDFs vergrößern das Bundle um etwa 2,5 MB (Base64 der beiden Vorlagen). Sie werden lazy geladen, damit der Start nicht langsamer wird.
- Der SVWS-Server liefert die LBV-Felder möglicherweise nicht vollständig; die Lehrkraft-Übernahme ist dann nur teilweise automatisch.
- Eine neue LBV-Formularversion erfordert ein Tool-Update oder den Austausch der Vorlage durch die Schule.
- Keine Übernahme alter `.maa`-Dateien: Schulen müssen offene Abrechnungen vor der Umstellung abschließen oder neu importieren.
- `electron/main.cjs` akzeptiert wie in den Schwesterprojekten selbstsignierte Zertifikate und ersetzt CORS-Header. Das ist für Schul-Server üblich, aber eine bewusste Sicherheitsabwägung, die in der Dokumentation erwähnt wird.

## Offene Fragen

| # | Frage | Wirkt auf |
|---|---|---|
| 1 | Welche SVWS-Endpunkte/Felder liefern LBV-Nummer, Vergütungsschlüssel, Rechtsverhältnis (LAA), Beschäftigungsart (Voll-/Teilzeit)? Gibt es die Felder in allen SVWS-Versionen? | E4, ADR 003 |
| 2 | Darf die LBV-Vorlage im öffentlichen Repository und in den Releases weitergegeben werden? Wer pflegt neue Formularstände? | E6, E10 |
| 3 | Ziel-Repository: `SVWS-NRW/SVWS-MA2LBV` (wie in `tools.json`) oder zunächst privat? | E1, E8 |
| 4 | Soll es eine Migration alter `.maa`-Dateien geben? (Setzt Kenntnis von Format und Schlüssel voraus; vorerst Nein.) | E5 |
| 5 | Asset-Muster `-webapp.zip` oder `-webserver.zip` für SVWS-Tools? | E8 |
| 6 | Hilfe-Link: Gibt es eine Seite `doku.svws-nrw.de/svws_module/svws_ma2lbv/`? | ADR 002 |
| 7 | Soll die Druckfassung (Barcode, ausgeblendete Rahmen) immer erzeugt werden? Siehe ADR 003 | E6 |
