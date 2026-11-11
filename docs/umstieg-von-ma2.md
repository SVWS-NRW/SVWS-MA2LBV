[← Übersicht](index.md)

# Umstieg von MA2

SVWS-MA2LBV löst das Programm **MA2** (vormals MA2LBV) ab, das mit **SchILD-NRW 2** und auf Windows arbeitete. Dieses Kapitel zeigt, wo du die gewohnten Funktionen findest und was sich ändert.

---

## Auf einen Blick

| Bisher (MA2) | Jetzt (SVWS-MA2LBV) |
|---|---|
| Windows-Programm mit Installation | Windows, Linux oder im Browser (Web-Version auf dem SVWS-Server) |
| Daten aus der **SchILD-Datenbank** (MDB, UDL, SchILDzentral) | Daten aus dem **SVWS-Server** |
| eigene Benutzer (`MA2Admin`, `BN1` bis `BN3`) und Kennwörter | Anmeldung mit dem **SVWS-Benutzer**, keine eigene Benutzerverwaltung |
| Arbeitsdaten in verschlüsselten **`.maa`**-Dateien | automatisch im **SVWS-Server**, zusätzlich als `.ma2lbv`-Sicherungsdatei |
| Einstellungen in `MA2.INI` | auf dem SVWS-Server bzw. im Browser |
| Menüband (Datei, Bearbeiten, LBV-Export, Hilfe) | Werkzeugleiste mit Menüs |

---

## Wo finde ich was?

| MA2 | SVWS-MA2LBV |
|---|---|
| Datei ► **SchILD-Import** | **Importieren ► Lehrkräfte aus SVWS** |
| **Abrechnungsdatei festlegen** und **Abrechnung** (Datei einlesen) | **Importieren ► Abrechnungsdatei (Untis/CSV)**. Einen festen Dateipfad gibt es nicht mehr |
| Datei ► **Abrechnungszeitraum zuordnen** | **Zeitraum** |
| Mehrarbeitsdatei **öffnen** | **Importieren ► Gesicherte Arbeitsdatei (.ma2lbv)** |
| Mehrarbeitsdatei **speichern** / **speichern unter** | automatisch auf dem Server. Ohne Verbindung **Sichern**, mit Verbindung **Sicherung ▾** |
| Bearbeiten ► **Zeile hinzufügen / löschen** | **Zeile +** / **Zeile –** |
| Bearbeiten ► **Hinweis löschen** / **alle Hinweise löschen** | **Hinweise löschen** (löscht alle) |
| Alle Zeilen oder Monate markieren | Kästchen in der Tabellenkopfzeile, **Strg + A / K / U** |
| **LBV-Export** (PDF, PDF + Druck, nur prüfen) | **Prüfen** und **PDF exportieren ▾** (*PDF-Dateien speichern* oder *Zum Drucken öffnen*) |
| **LBV-Export (alle markierten Zeilen)** | **PDF exportieren** erzeugt immer für alle **markierten**, fehlerfreien Zeilen |
| PDF-Datei anzeigen (Rechtsklick auf den Hinweis) | Die PDF wird heruntergeladen oder in der Druckansicht geöffnet |
| **Einstellungen** (Formulardaten) | **Einstellungen** auf dem Dashboard |
| Bedienungsanleitung, LBV-Ausfüllanleitung | Hilfe-Link unten auf der Anmeldeseite, Ausfüllanleitung beim LBV |

---

## Was ist neu?

- **Automatisches Speichern** auf dem SVWS-Server und Wiederaufnehmen der Arbeit nach der Anmeldung, an jedem Rechner.
- **Konflikterkennung**, wenn Daten parallel geändert werden.
- **Schulstandard** für Formulardaten, den Administratoren für alle Benutzer hinterlegen.
- **Alle Fehler einer Zeile** auf einmal statt nur des ersten.
- **Sammel-PDF zum Drucken** für mehrere Lehrkräfte.
- **Dateien auf die Tabelle ziehen** (Abrechnungsdatei oder Sicherungsdatei).
- **Hell- und Dunkel-Darstellung**.
- Der Dateiname der PDF enthält keine Sonderzeichen mehr, die in Dateinamen Probleme machen.
- Die **Formularvorlagen** des LBV sind im Programm enthalten. Das Kopieren in einen Vorlagenordner entfällt.

---

## Was entfällt oder ist anders?

| Bisher | Jetzt |
|---|---|
| SchILD-Datenbankzugriff, `MA2Admin`, eigene Benutzer | entfällt, der SVWS-Server übernimmt Anmeldung und Rechte |
| Einlesen **alter `.maa`-Dateien** | **noch nicht möglich.** Daten lassen sich über den Import einer Abrechnungsdatei oder über Lehrkräfte aus dem SVWS neu aufbauen |
| Drucker auswählen, Druckmodus „Acrobat“ oder „Direkt“ | entfällt. Gedruckt wird über den Druckdialog des Systems oder Browsers |
| Tabelle als Excel- oder PDF-Datei exportieren, Tabelle drucken | **nicht vorhanden** |
| Farben für Merkmale selbst wählen, Office-Designs, Symbolsätze | entfällt. Die Darstellung ist einheitlich wie bei den anderen SVWS-Tools, wählbar ist nur Hell/Dunkel/System |
| Filter in den Spaltenköpfen | noch nicht vorhanden |
| Update über das Programm (FTP) | neue Versionen über die Veröffentlichungen des Projekts bzw. das Paket SVWS-Tools |
| Fernwartungsprogramm `FW.exe` | entfällt |
| Hilfe als CHM-Datei | Online-Dokumentation, Link auf der Anmeldeseite |
| Abschlagszeilen (Kennzahl 2989 / 2E) | wie bisher **nicht** unterstützt |

---

## Was bleibt gleich?

- Der **Ablauf**: Daten bereitstellen, Merkmale setzen, prüfen, Formular erzeugen.
- Die **beiden Importformate** und ihr Aufbau. → [Importformate](importformate.md)
- Die **fachlichen Regeln**: Zuordnung zu den Abschnitten, Vergütungsschlüssel, Merkmale V, A, K, Prüfziffer der LBV-Personalnummer, Rundung der Stunden. → [Mehrarbeit verstehen](mehrarbeit-verstehen.md)
- Das Formular des LBV mit **Barcode**.

### Prüfungen, die strenger sind als in MA2

Wo MA2 und die Prüfungen in den Formularen des LBV voneinander abweichen, gilt in SVWS-MA2LBV die **strengere** Regel. Dadurch können Zeilen beanstandet werden, die MA2 durchgelassen hat:

- **Merkmal V** nur bei weniger als 4 Stunden (MA2 ließ es auch bei mehr Stunden zu),
- **Stundengrenzen**: Abschnitt C höchstens 180 Stunden, Lehramtsanwärter 1 bis 24 Stunden und Vergütungsschlüssel 1 bis 8,
- **Anfangsbuchstaben der LBV-Personalnummer** abhängig vom Formular.

Dazu kommt, dass die Merkmalsautomatik die **gerundeten** Stunden verwendet. Das verhindert eine Lücke, die MA2 bei Stunden zwischen 3 und 4 hatte.

> Der **Datenschutz** ändert sich: Die Abrechnungsdaten liegen bei bestehender Verbindung auf dem SVWS-Server. Stimme das mit dem Datenschutzbeauftragten ab. Das bisherige Verfahrensverzeichnis ist entsprechend zu überprüfen. → [Datenschutzhinweise](datenschutz.md)

---

Weiter mit: [Hilfe und Fragen](hilfe.md)
