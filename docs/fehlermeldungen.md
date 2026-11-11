[← Übersicht](index.md)

# Fehlermeldungen

Alle Meldungen des Programms mit Ursache und Abhilfe. Die Meldungen der Prüfung stehen in der Spalte **Hinweis(e)**, die übrigen erscheinen als Mitteilung oder im Dialog.

---

## Prüfung und Export (Spalte „Hinweis(e)“)

Die Texte in Klammern, z. B. `(526)`, nennen den Wert, der beanstandet wurde.

### Schule (Einstellungen)

| Meldung | Ursache | Abhilfe |
|---|---|---|
| Fehler: Schulnummer ungültig | Die Schulnummer ist leer oder keine sechsstellige Zahl zwischen 100001 und 199999 | [Einstellungen](einstellungen.md) ausfüllen |
| Fehler: Anzahl der Minuten je Unterrichtsstunde | Der Wert ist nicht fünfstellig oder liegt nicht zwischen 45,01 und 120,00 (`04501` bis `12000`) | Wert korrigieren oder das Feld leer lassen (Standard 45,00) |
| Fehler: Schulform hat keinen gültigen Wert | Beim Formular für Lehramtsanwärter fehlt die Schulform | In den Einstellungen eine Schulform wählen |

### Lehrkraft

| Meldung | Ursache | Abhilfe |
|---|---|---|
| Fehler: Nachname fehlt / Vorname fehlt | Das Feld ist leer | Eintragen |
| Fehler: Geburtsdatum fehlt bzw. falsch | Kein gültiges Datum im Format `TT.MM.JJJJ` | Datum korrigieren |
| Fehler: LBV-Personalnummer fehlt | Die Spalte ist leer | LBV-Personalnummer eintragen oder im SVWS pflegen |
| Fehler: LBV-Personalnummer beginnt nicht mit … | Der Anfangsbuchstabe ist für das Formular nicht zulässig | Nummer prüfen. → [Zulässige Buchstaben](mehrarbeit-verstehen.md#die-lbv-personalnummer) |
| Fehler: LBV-Personalnummer: Länge <> 8 | Beamtennummern haben einen Buchstaben und 7 Ziffern | Ziffern prüfen |
| Fehler: LBV-Personalnummer: Länge <> 10 | `P`-Nummern haben einen Buchstaben und 9 Ziffern | Ziffern prüfen |
| Fehler: LBV-Personalnummer: Zeichen falsch | Nach dem Buchstaben stehen Nicht-Ziffern | Eingabe korrigieren |
| Fehler: LBV-Personalnummer: Prüfziffer falsch | Die letzte Ziffer passt nicht zu den übrigen (meist ein Tippfehler) | Nummer mit dem LBV-Schreiben vergleichen |
| Fehler: Zuordnung beamtet / tarifbeschäftigt nicht möglich (…) | Der Anfangsbuchstabe der LBV-Personalnummer erlaubt keine Zuordnung | Nummer prüfen |

### Monate

| Meldung | Ursache | Abhilfe |
|---|---|---|
| Fehler: Vergütungsschlüssel (…) | Der Schlüssel liegt nicht im zulässigen Bereich (1 bis 4, bei Lehramtsanwärtern 1 bis 8) oder fehlt | Schlüssel eintragen. → [Vergütungsschlüssel](mehrarbeit-verstehen.md#vergütungsschlüssel) |
| Fehler: Merkmal (…) | Das Merkmal ist für den Abschnitt nicht zulässig | A: `V` oder `A`, C: `K` |
| Fehler: Stunden < 4 und Merkmal <> 'V', 'A' (…) | Bei weniger als 4 Stunden fehlt das Merkmal | `V` bzw. `A` eintragen oder die Automatik nutzen |
| Fehler: Merkmal 'V' nur bei Stunden < 4 (…) | `V` bei 4 oder mehr Stunden | Merkmal entfernen |
| Fehler: Anzahl Stunden (…) | Die Stunden sind höher als im Formular erlaubt (A: 288, C: 180, Lehramtsanwärter: 24) | Stunden prüfen |
| Fehler: Monat/Jahr: Falscher Wert (…) | Der Monat ist ungültig | Zeitraum prüfen, ggf. neu festlegen |
| Fehler: Jahr/Monat: Termin liegt in der Zukunft (…) | Der Monat liegt nach dem laufenden Monat | Zeitraum prüfen |
| Fehler: keine Mehrarbeit | In den berücksichtigten Monaten stehen keine Stunden | Stunden eintragen oder Monate einschließen |

---

## Eingabe in der Tabelle

| Meldung | Ursache | Abhilfe |
|---|---|---|
| Bitte Stunden als Zahl eingeben, z. B. 3 oder 2,5. | Die Stunden sind keine Zahl | Zahl mit höchstens zwei Nachkommastellen eingeben |
| Bitte das Geburtsdatum als TT.MM.JJJJ eingeben. | Kein gültiges Datum | Datum korrigieren |
| Der Vergütungsschlüssel muss zwischen 1 und 4 liegen. (bei Lehramtsanwärtern: 1 und 8) | Zahl außerhalb des Bereichs | Schlüssel korrigieren |
| Zulässige Merkmale: V …, A … | Merkmal in Abschnitt A nicht zulässig | `V` oder `A` eintragen |
| Zulässiges Merkmal: K … | Merkmal in Abschnitt C nicht zulässig | `K` eintragen oder leer lassen |
| Bitte zuerst eine Zelle der Zeile anklicken. | **Zeile –** ohne ausgewählte Zeile | Eine Zelle der Zeile anklicken |

---

## Dateien einlesen

| Meldung | Ursache | Abhilfe |
|---|---|---|
| Datei enthält keine Daten | Keine Datenzeilen | Datei prüfen |
| Falsches Dateiformat | Die Kopfzeile passt nicht, oder die Zeilenzahl ist im Alternativformat nicht durch 6 teilbar | [Importformate](importformate.md) |
| Falsches Dateiformat: Zeilen … gehören nicht zur selben Lehrkraft | Im Alternativformat wechseln die Personalnummern innerhalb eines Blocks | Datei korrigieren |
| Die Datei konnte nicht gelesen werden. | Die Datei ließ sich nicht lesen | Datei erneut exportieren |
| Bitte nur eine Datei auf einmal ablegen. | Mehrere Dateien auf die Tabelle gezogen | Eine Datei ablegen |
| „…“ wird nicht unterstützt. Möglich sind … | Falsche Dateiendung beim Ablegen | `.txt`, `.csv` oder `.ma2lbv` verwenden |

---

## PDF

| Meldung | Ursache | Abhilfe |
|---|---|---|
| Keine Zeile ohne Fehler. Details in der Spalte „Hinweis(e)“. | Alle markierten Zeilen haben Fehler | Fehler beheben |
| Das PDF konnte nicht erzeugt werden. | Ein unerwarteter Fehler | Erneut versuchen, bei Wiederholung melden. → [Hilfe](hilfe.md) |
| Formfeld nicht gefunden: … | Die Formularvorlage passt nicht | Melden. → [Hilfe](hilfe.md) |

---

## SVWS-Server

| Meldung | Ursache | Abhilfe |
|---|---|---|
| Verbindung fehlgeschlagen. Bitte URL, Schema und Zugangsdaten prüfen. | Eine Angabe auf der Anmeldeseite ist falsch, oder der Server ist nicht erreichbar | [Verbindung](verbindung.md) |
| Ungültige Zugangsdaten oder fehlende Berechtigung. | Benutzername oder Passwort falsch, oder das Recht fehlt | Zugangsdaten prüfen, ggf. Rechte beim Administrator erfragen |
| Server-Fehler (…). Bitte SVWS-Server prüfen. | Der Server meldet einen Fehler | Schul-IT informieren |
| Die Lehrkräfte konnten nicht geladen werden. … | Beim Laden der Lehrkräfte trat ein Fehler auf | Verbindung prüfen, Recht „Lehrerdaten ansehen“ klären |
| Der SVWS-Server ist nicht erreichbar. | Netzwerk oder Server nicht verfügbar | Verbindung prüfen, dann **Erneut versuchen** |
| Keine Berechtigung zum Speichern auf dem SVWS-Server. | Dem Benutzer fehlt die Berechtigung | Zugangsdaten und Rechte prüfen |
| Der SVWS-Server meldet einen Fehler (…). | Ein Fehlercode des Servers | Schul-IT informieren |
| Daten konnten nicht vom SVWS-Server geladen werden. … | Beim Anmelden ließen sich die gespeicherten Daten nicht lesen. Es wird nichts überschrieben | **Erneut versuchen** |
| Nur Administratoren dürfen den Schulstandard festlegen. | Das Recht fehlt | Administrator bitten |
| Die Daten auf dem SVWS-Server wurden geändert. Bitte entscheiden. | Konflikt. → [Speichern](funktionen/speichern.md#konflikt-daten-wurden-zwischenzeitlich-geändert) | Wählen, welche Daten gelten |

---

## Sicherungsdatei

| Meldung | Ursache | Abhilfe |
|---|---|---|
| Die Passphrase muss mindestens 8 Zeichen lang sein. | Zu kurze Passphrase beim Sichern | Längere Passphrase wählen |
| Die beiden Eingaben stimmen nicht überein. | Die Wiederholung weicht ab | Beide Eingaben angleichen |
| Bitte die Passphrase eingeben. | Beim Öffnen ohne Eingabe bestätigt | Passphrase eingeben |
| Die Passphrase ist falsch oder die Datei wurde verändert. | Falsche Passphrase, oder die Datei ist beschädigt bzw. verändert | Erneut eingeben. Bei richtiger Passphrase die Datei neu beschaffen |
| Die Datei ist keine Arbeitsdatei von SVWS-MA2LBV. | Falsche Datei gewählt | Eine `.ma2lbv`-Datei auswählen |
| Die Arbeitsdatei stammt aus einer nicht unterstützten Programmversion. | Datei von einer neueren Programmversion | Programm aktualisieren |
| Die Arbeitsdatei ist beschädigt. / Die Datei enthält keine gültigen Arbeitsdaten. | Datei unvollständig oder verändert | Eine frühere Sicherung verwenden |

---

Weiter mit: [Umstieg von MA2](umstieg-von-ma2.md)
