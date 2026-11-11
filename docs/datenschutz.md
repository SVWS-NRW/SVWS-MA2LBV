# Datenschutzhinweise

## 1. Verarbeitung nur auf Ihrem Gerät

SVWS-MA2LBV läuft vollständig in Ihrem Browser bzw. in der Desktop-App. Es gibt keinen eigenen Server und keine Übermittlung an Dritte.

- Daten werden nur dann an einen Server gesendet, wenn Sie sich ausdrücklich mit dem SVWS-Server Ihrer Schule verbinden. Dabei werden ausschließlich Lehrkraftdaten **gelesen**.
- CSV-Import und manuelle Erfassung funktionieren auch ohne Verbindung.

## 2. Keine Speicherung von Zugangsdaten

Benutzername und Passwort werden ausschließlich im Arbeitsspeicher gehalten.

- Es werden **keine** Zugangsdaten in `localStorage`, `sessionStorage`, Cookies oder Dateien gespeichert.
- Nach dem Beenden der App oder einem Seiten-Reload sind alle Zugangsdaten gelöscht.

## 3. Mehrarbeitsdaten von Lehrkräften

Name, Geburtsdatum, LBV-Personalnummer und Stunden sind personenbezogene Daten.

- Sie liegen nur im Arbeitsspeicher, bis Sie die Arbeitsdatei sichern.
- Die Arbeitsdatei wird mit einer von Ihnen gewählten Passphrase verschlüsselt. Die Passphrase kann nicht wiederhergestellt werden.
- Die erzeugten PDF-Dateien speichern Sie selbst. Gehen Sie mit ihnen wie mit anderen Personalunterlagen um.

## 4. Speicherung auf dem SVWS-Server

Wenn du dich mit dem SVWS-Server deiner Schule verbindest, werden deine Einstellungen und die Abrechnungsdaten automatisch dort gespeichert und bei der nächsten Anmeldung wieder geladen.

- Die Daten liegen in der Datenbank deines SVWS-Servers und sind deinem SVWS-Benutzer zugeordnet. Andere Benutzer sehen sie über die Programmschnittstelle nicht.
- Sie sind dort **nicht** zusätzlich verschlüsselt. Den Schutz übernimmt die Benutzerverwaltung des SVWS-Servers.
- Ein Administrator kann die Formulardaten als Standard für alle Benutzer der Schule hinterlegen. Das sind keine Daten von Lehrkräften.
- Ohne Verbindung zum SVWS-Server wird nichts an einen Server übertragen.

## 5. Einstellungen im Browser

- Formulardaten der Schule (Dienststelle, Aktenzeichen, Bearbeiter, Schulnummer …) und die Theme-Einstellung (Hell/Dunkel) werden im `localStorage` deines Browsers gespeichert.
- Kein Tracking, keine Cookies, keine Drittserver.
