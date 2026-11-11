# Datenschutzhinweise

## 1. Verarbeitung auf deinem Gerät und auf deinem SVWS-Server

SVWS-MA2LBV läuft vollständig in deinem Browser bzw. in der Desktop-App. Es gibt keinen eigenen Server und keine Übermittlung an Dritte.

- Daten werden nur dann an einen Server gesendet, wenn du dich ausdrücklich mit dem SVWS-Server deiner Schule verbindest. Dabei werden Lehrkraftdaten **gelesen**. Deine Einstellungen und die Abrechnungsdaten werden dort **gespeichert** (siehe Abschnitt 4).
- CSV-Import und manuelle Erfassung funktionieren auch ohne Verbindung.

## 2. Keine Speicherung von Zugangsdaten

Benutzername und Passwort werden ausschließlich im Arbeitsspeicher gehalten.

- Es werden **keine** Zugangsdaten in `localStorage`, `sessionStorage`, Cookies oder Dateien gespeichert.
- Nach dem Beenden der App oder einem Seiten-Reload sind alle Zugangsdaten gelöscht.

## 3. Mehrarbeitsdaten von Lehrkräften

Name, Geburtsdatum, LBV-Personalnummer und Stunden sind personenbezogene Daten.

- Ohne Verbindung liegen sie nur im Arbeitsspeicher, bis du die Arbeitsdatei sicherst. Mit Verbindung werden sie auf dem SVWS-Server gespeichert (Abschnitt 4).
- Beim Abmelden werden sie aus dem Arbeitsspeicher entfernt.
- Die Arbeitsdatei wird mit einer von dir gewählten Passphrase verschlüsselt. Die Passphrase kann nicht wiederhergestellt werden.
- Die erzeugten PDF-Dateien speicherst du selbst. Gehe mit ihnen wie mit anderen Personalunterlagen um.

## 4. Speicherung auf dem SVWS-Server

Wenn du dich mit dem SVWS-Server deiner Schule verbindest, werden deine Einstellungen und die Abrechnungsdaten automatisch dort gespeichert und bei der nächsten Anmeldung wieder geladen.

- Die Daten liegen in der Datenbank deines SVWS-Servers und sind deinem SVWS-Benutzer zugeordnet. Andere Benutzer sehen sie über die Programmschnittstelle nicht.
- Sie sind dort **nicht** zusätzlich verschlüsselt. Den Schutz übernimmt die Benutzerverwaltung des SVWS-Servers.
- Ein Administrator kann die Formulardaten als Standard für alle Benutzer der Schule hinterlegen. Das sind keine Daten von Lehrkräften.
- Ohne Verbindung zum SVWS-Server wird nichts an einen Server übertragen.

## 5. Einstellungen im Browser

- Die Theme-Einstellung (Hell/Dunkel) wird im `localStorage` deines Browsers gespeichert.
- Die Formulardaten der Schule (Dienststelle, Aktenzeichen, Bearbeiter, Schulnummer …) werden **nur ohne Verbindung zum SVWS-Server** im `localStorage` abgelegt. Mit Verbindung liegen sie ausschließlich auf dem Server. Beim Anmelden am Server wird eine lokale Kopie gelöscht.
- Kein Tracking, keine Cookies, keine Drittserver.
