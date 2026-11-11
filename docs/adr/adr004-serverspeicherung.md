# ADR 004: Speicherung von Einstellungen und Abrechnungsdaten auf dem SVWS-Server

- **Status:** Vorgeschlagen
- **Datum:** 2026-11-11
- **Autor:** Frank Pfotenhauer
- **Projekt:** SVWS-MA2LBV
- **Ergänzt:** [ADR 001 – Architektur](adr001-architektur.md), E5 (Persistenz und Datenschutz)

## Kontext

Bisher liegen die Einstellungen im `localStorage` des Browsers und die Abrechnungsdaten nur im Arbeitsspeicher oder in einer verschlüsselten Datei (`.ma2lbv`). Wer sich mit dem SVWS-Server verbindet, soll seine Daten bei der nächsten Anmeldung wieder vorfinden, ohne eine Datei einlesen zu müssen. SVWS-GradeHub legt seine Konfiguration bereits über die Client-Konfiguration des SVWS-Servers ab.

## Entscheidung

### D1 – Ablage in der Client-Konfiguration des SVWS-Servers

Verwendet wird die API `/db/{schema}/client/config/{app}/…` mit dem Anwendungsnamen `ma2lbv`. Geprüft am SVWS-Server-Quelltext (`APIClientConfig`) und an einer laufenden Instanz:

| Aufruf | Zweck | Erforderliche Berechtigung |
|---|---|---|
| `GET /config/{app}` | alle Werte der Anwendung: Liste `user` (eigene) und `global` (für alle) | angemeldeter SVWS-Benutzer, **keine** besondere Kompetenz |
| `PUT /config/{app}/user/{key}` | eigenen Wert schreiben | angemeldeter SVWS-Benutzer, **keine** besondere Kompetenz |
| `PUT /config/{app}/global/{key}` | Wert für alle Benutzer schreiben | **Administrator** (`BenutzerKompetenz.ADMIN`) |
| `GET /config/{app}/user/{key}` | einzelnen Wert lesen, Rückfall auf global | angemeldeter SVWS-Benutzer |

Es gibt keinen Lesezugriff auf einen einzelnen globalen Schlüssel; globale Werte kommen über `GET /config/{app}`. Der Wert ist ein Text (Spalte `TEXT`, praktisch unbegrenzt; getestet mit 311 000 Zeichen) und wird als **JSON-String** gesendet. Leere Werte kommen als leere Antwort zurück. Eigene Werte sind je SVWS-Benutzer getrennt (`Benutzer_ID`), andere Benutzer sehen sie über die API nicht.

### D2 – Schlüssel und Geltungsbereich

| Schlüssel | Inhalt | Bereich |
|---|---|---|
| `abrechnung` | Tabelle, Abrechnungszeitraum, Monatsauswahl | nur `user` (enthält personenbezogene Daten) |
| `einstellungen` | Formulardaten der Schule, Verhalten | `user`; zusätzlich `global` als **Schulstandard**, den nur Administratoren schreiben |

Beim Laden gilt für die Einstellungen: eigener Wert, sonst Schulstandard. Der Schulstandard wird **nicht** automatisch als eigene Kopie gespeichert, damit spätere Änderungen daran bei allen ankommen, die selbst nichts geändert haben. Eine aus SVWS stammende Schulnummer zählt nicht als Änderung.

### D3 – Keine zusätzliche Verschlüsselung

Die Daten liegen im Klartext (JSON) in der SVWS-Datenbank. Begründung: Die SVWS-Datenbank enthält Namen, Geburtsdaten und LBV-Nummern der Lehrkräfte bereits; die Absicherung übernimmt die Benutzerverwaltung des Servers. Eine eigene Passphrase würde das Ziel verfehlen, ohne Eingabe weiterzuarbeiten. Wer das nicht möchte, arbeitet ohne Verbindung und sichert in die verschlüsselte Datei (ADR 001, E5). **Offene Frage 1:** Reicht das den Datenschutzbeauftragten, oder soll es eine Option „Abrechnungsdaten nicht auf dem Server speichern“ geben?

### D4 – Ablauf

- **Anmelden:** Nach erfolgreicher Verbindung lädt `serverSync.start()` mit **einer** Anfrage alle Werte. Schlägt das fehl, bleibt die Arbeit lokal möglich, die Statusanzeige zeigt den Fehler mit „Erneut versuchen“, und es wird nichts überschrieben.
- **Speichern:** Jede Änderung (auch Zellbearbeitung) löst nach 1,5 s Ruhe einen Schreibvorgang aus. Nur geänderte Datensätze werden geschrieben, mehrere Änderungen werden gebündelt, unveränderte Daten werden nicht erneut gesendet.
- **Abmelden:** Wartende Änderungen (Abrechnung **und** Einstellungen) werden vorher gespeichert. Danach werden **alle Daten aus dem Speicher entfernt**, damit eine andere Person im selben Browserfenster sie weder sieht noch ins eigene Konto hochlädt. Einstellungen werden nur nach einer Serveranmeldung geleert; ohne Verbindung sind sie die einzige Kopie im Browser und bleiben erhalten. Gelingt das Speichern nicht (Fehler, offener Konflikt) oder ist ohne Verbindung die Tabelle nicht in eine Datei gesichert, fragt das Programm vor dem Abmelden nach.
- **Statusanzeige:** Fußzeile der Abrechnung, Dashboard und Einstellungen zeigen „gespeichert (Uhrzeit)“, „wird gespeichert“, Fehler oder „nur lokal“.
- **Schutz vor Datenverlust:** Gemeint sind immer Abrechnung und Einstellungen zusammen. Mit Serververbindung zählt der Stand auf dem Server, ohne Verbindung die Sicherungsdatei der Abrechnungstabelle (die Einstellungen liegen dann automatisch im Browser).
  - Schließen oder Neuladen: Der Browser warnt (auf jeder Seite), Electron fragt nach.
  - Verlassen der Abrechnung oder der Einstellungen: Mit Verbindung wird zuerst gespeichert, gefragt wird nur bei Fehlern oder offenem Konflikt. Ohne Verbindung fragt die Abrechnung bei ungesicherten Änderungen nach.
- **Erster Start mit vorhandenen lokalen Einstellungen:** Hat der Server noch keine, werden sie hochgeladen.

### D5 – Parallele Änderungen (Konflikterkennung)

Jeder Datensatz trägt `aktualisiert` (ISO-Zeitstempel). Vor dem Schreiben wird der Zeitstempel auf dem Server mit dem zuletzt bekannten verglichen. Weicht er ab (zweites Fenster, zweiter Rechner mit demselben Benutzer), erscheint ein Dialog: **Serverdaten laden** oder **Meine Daten behalten** (überschreibt den Server). Bis zur Entscheidung wird nichts geschrieben. Dasselbe gilt beim Anmelden, wenn Server und Sitzung beide Abrechnungsdaten enthalten. Eine Zusammenführung einzelner Zeilen findet nicht statt.

### D6 – Dateien bleiben

Sichern und Öffnen der verschlüsselten Datei bleiben als Sicherung und für die Arbeit ohne Verbindung erhalten.

## Alternativen

| Alternative | Verworfen, weil |
|---|---|
| Alles im Schulstandard (`global`) | Schreiben nur für Administratoren; Abrechnungsdaten würden für alle sichtbar |
| Verschlüsselt wie GradeHub | Passphrase bei jedem Start; die Datenhaltung im SVWS ist ohnehin personenbezogen |
| Speichern nur auf Knopfdruck | Daten gingen bei vergessenem Speichern verloren; gewünscht ist Laden ohne Datei |
| Zeilenweises Zusammenführen bei Konflikten | Aufwand und Fehleranfälligkeit; ein Benutzer arbeitet in der Regel in einem Fenster |

## Konsequenzen

**Positiv:** Daten stehen nach der Anmeldung sofort wieder bereit, auch auf anderen Rechnern. Keine zusätzliche Infrastruktur.

**Negativ / Risiken**
- Der Stand der Abrechnung liegt im Klartext in der SVWS-Datenbank (Offene Frage 1).
- Es gibt keinen Löschen-Endpunkt; „Leeren“ speichert einen leeren Stand. Ein vollständiges Entfernen geht nur auf dem Server.
- Bei Verlust der Verbindung während der Arbeit speichern die Änderungen erst nach erneutem Versuch („Erneut versuchen“); bis dahin warnt der Browser beim Schließen.
- Die Datenmenge steigt mit der Lehrkräftezahl (rund 400 Byte je Zeile).

## Offene Fragen

| # | Frage |
|---|---|
| 1 | Ist die Speicherung der Abrechnungsdaten im Klartext in der SVWS-Datenbank datenschutzrechtlich akzeptiert? Option zum Abschalten? |
| 2 | Sollen mehrere Benutzer einer Schule gemeinsam an derselben Abrechnung arbeiten können (dann `global` oder eigener Schlüssel je Zeitraum)? Aktuell hat jeder Benutzer seinen eigenen Stand. |
| 3 | Soll der Stand je Abrechnungszeitraum getrennt abgelegt werden (Verlauf), statt nur der jeweils aktuelle? |
