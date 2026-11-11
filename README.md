# SVWS-MA2LBV

Web-Client und Desktop-App zur Erstellung der *Änderungsmitteilung Mehrarbeitsvergütung* an das LBV NRW. Löst das Delphi-Programm MA2 (vormals MA2LBV) ab.

Architektur, Oberfläche und Analyse des Delphi-Codes stehen in den ADRs unter [docs/adr/](docs/adr/):

- [ADR 001 – Architektur](docs/adr/adr001-architektur.md)
- [ADR 002 – Oberfläche](docs/adr/adr002-oberflaeche.md)
- [ADR 003 – Analyse des Delphi-Codes](docs/adr/adr003-delphi-analyse.md)
- [ADR 004 – Speicherung auf dem SVWS-Server](docs/adr/adr004-serverspeicherung.md)

## Projektstatus

Umgesetzt: Verbindung, Dashboard, Mehrarbeitstabelle, Regeln (`src/rules/`), CSV-Import, Lehrkräfte aus SVWS, Einstellungen und PDF-Export (Speichern als PDF/ZIP, Sammel-PDF zum Drucken). Außerdem: verschlüsselte Arbeitsdatei (`.ma2lbv`) sichern und öffnen. Mit SVWS-Verbindung werden Einstellungen und Abrechnungsdaten automatisch auf dem Server gespeichert und beim Anmelden geladen.

## Tech-Stack

Vue 3, TypeScript, Vite, Pinia, Vue Router (Hash), PrimeVue 4 (Aura), AG Grid Community, Axios, pdf-lib, Vitest, Electron.

## Voraussetzungen

- Node.js 22+
- Für die Anmeldung: SVWS-Server mit gültigen Zugangsdaten (nicht nötig für CSV-Import und manuelle Erfassung)

## Schnellstart

```bash
cp .env.example .env   # optional: Standardwerte für die Entwicklung
npm install
npm run dev
```

## NPM-Skripte

- `npm run dev` Entwicklungsserver (Standard: http://localhost:5173)
- `npm run build` Typecheck (`vue-tsc`) und Produktions-Build nach `dist/`
- `npm test` Unit-Tests (Vitest)
- `npm run electron:dev` baut und startet die Desktop-App
- `npm run release [patch|minor|major]` Version erhöhen, bauen, Tag pushen, GitHub-Release-Entwurf anlegen

## Hinweise

- Der Quellcode der alten Delphi-Anwendung ist nicht Teil dieses Repositorys.
- Zugangsdaten werden nur im Arbeitsspeicher gehalten.

## Lizenz

BSD-3-Clause, siehe [LICENSE](LICENSE).
