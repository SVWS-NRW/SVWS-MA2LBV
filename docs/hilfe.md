[← Übersicht](index.md)

# Hilfe und Fragen

---

## Häufige Fragen

### Im Dialog „Lehrkräfte aus SVWS“ fehlt eine Lehrkraft.

Der Dialog zeigt nur **sichtbare Lehrkräfte**. Prüfe im SVWS, ob die Person als Lehrkraft geführt wird und sichtbar ist. Fehlen alle Lehrkräfte oder erscheint eine Fehlermeldung, hat dein SVWS-Benutzer vermutlich nicht das Recht, **Lehrerdaten anzusehen**. Frage den Administrator.

### Im Dialog steht „2 fehlend“. Was ist gemeint?

Im SVWS fehlen Angaben, die das Programm braucht, meistens die **LBV-Personalnummer** und der **Vergütungsschlüssel**. Das Programm nennt sie in der Spalte „Hinweis(e)“ der Tabelle. Du kannst die Werte in der Tabelle ergänzen. Für die Zukunft pflege sie im SVWS.

> Das Programm **liest** nur aus dem SVWS. Änderungen in der Tabelle werden **nicht** in den SVWS zurückgeschrieben.

### Die Lehrkraft hat einen falschen Status (Voll-/Teilzeit).

Der Status stammt aus der **Beschäftigungsart** im aktuellen Schuljahresabschnitt des SVWS. Ist sie dort leer, gilt die Lehrkraft als Vollzeit. Korrigiere den Status in der Tabelle (`V`, `T` oder `W`). → [Die Tabelle](funktionen/tabelle.md#status)

### Das Programm meldet „Prüfziffer falsch“.

Ein Zahlendreher oder eine falsche Ziffer in der LBV-Personalnummer. Vergleiche die Nummer mit dem Schreiben oder der Gehaltsmitteilung des LBV. → [Mehrarbeit verstehen](mehrarbeit-verstehen.md#die-lbv-personalnummer)

### Warum wird aus 2,5 Stunden eine 2?

In **Abschnitt A** des Formulars stehen ganze Stunden. Das Programm rundet wie das bisherige MA2: bei genau `,5` auf die nächste gerade Zahl (`2,5` → 2, `3,5` → 4). Trage in Abschnitt A am besten ganze Stunden ein. → [Stunden](mehrarbeit-verstehen.md#stunden)

### Warum kann ich einen Monat nicht auswählen oder abrechnen?

Monate **in der Zukunft** werden abgelehnt. Der laufende Monat ist erlaubt. Prüfe den Zeitraum mit **Zeitraum**.

### Warum zeigt die Statusanzeige „Nicht gespeichert“?

Der SVWS-Server war nicht erreichbar oder hat einen Fehler gemeldet. Deine Änderungen bleiben im Programm erhalten. Prüfe die Netzwerkverbindung und wähle **Erneut versuchen**. Solange die Anzeige so steht, solltest du das Programm nicht schließen. Als Absicherung kannst du über **Sicherung ▾ → Sicherung in Datei speichern** eine Sicherungsdatei anlegen. → [Speichern](funktionen/speichern.md)

### Wo liegen meine Daten, und wer kann sie sehen?

Mit Verbindung auf dem **SVWS-Server**, deinem Benutzer zugeordnet. Andere Benutzer sehen sie nicht über das Programm. Sie sind dort nicht zusätzlich verschlüsselt. Ohne Verbindung liegen die Einstellungen im Browser, die Tabelle nur im Arbeitsspeicher oder in deiner Sicherungsdatei. → [Datenschutzhinweise](datenschutz.md)

### Ich habe die Passphrase der Sicherungsdatei vergessen.

Sie lässt sich **nicht wiederherstellen**. Wenn du mit dem SVWS-Server verbunden warst, liegen deine Daten wahrscheinlich auch dort und stehen nach der Anmeldung zur Verfügung.

### Kann ich eine alte MA2-Datei (`.maa`) einlesen?

Noch nicht. Baue die Tabelle über **Lehrkräfte aus SVWS** oder eine **Abrechnungsdatei** neu auf. → [Umstieg von MA2](umstieg-von-ma2.md)

### Warum erscheint beim Öffnen des PDF ein „#“ in leeren Zeilen?

Das sind Platzhalter der Vorlage, die nur am Bildschirm erscheinen. Im **Ausdruck** fehlen sie, ebenso die Legende der Vergütungsschlüssel. → [Das Formular](funktionen/pruefen-und-exportieren.md#hinweise-zur-ansicht-am-bildschirm)

### Das Formular für die Lehramtsanwärter meldet „Schulform hat keinen gültigen Wert“.

Trage in den [Einstellungen](einstellungen.md) die **Schulform** für das Formular der Lehramtsanwärter ein.

### Wie drucke ich mehrere Anträge auf einmal?

**PDF exportieren ▾ → Zum Drucken öffnen**. Alle markierten, fehlerfreien Zeilen kommen in ein gemeinsames PDF.

---

## Bekannte Einschränkungen

- Der **Barcode** wird als Grafik eingefügt. Er entspricht in Inhalt und Lage dem Barcode, den MA2 erzeugte. Ob das LBV ihn zuverlässig maschinell liest, ist noch **nicht bestätigt**. Vergleiche die ersten Anträge mit dem bisherigen Verfahren.
- **Abschlagszeilen** (Kennzahl 2989 bzw. 2E) werden nicht ausgefüllt.
- Das Formular verwendet **Standardschriften** statt der in der Vorlage eingebetteten. Es sieht sehr ähnlich, aber nicht identisch aus.
- Auf dem Server liegt **ein Stand je Benutzer**, kein Verlauf.
- Die Tabelle lässt sich nicht als Excel- oder PDF-Übersicht ausgeben.
- Für einige Beschäftigungsarten des SVWS (z. B. nebenberuflich Beschäftigte, geringfügig Beschäftigte, Studierende) ist die Zuordnung zu Voll- oder Teilzeit nicht eindeutig. Kontrolliere dort den Status.

---

## Hilfe bekommen

- **Anwenderforum:** [schulverwaltungsinfos.nrw.de/svws/forum](https://schulverwaltungsinfos.nrw.de/svws/forum/viewforum.php?f=25), Unterforum für MA2.
- **Fachberatung:** Jeder Schule ist eine Fachberaterin oder ein Fachberater zugeordnet. Du findest deine Ansprechperson über die [Fachberatersuche](https://www.svws.nrw.de/service/fachberatersuche) mit deiner Schulnummer.
- **Fehler melden:** im [Projekt auf GitHub](https://github.com/SVWS-NRW/SVWS-MA2LBV/issues). Bitte nenne die **Version** (steht auf der Anmeldeseite unter dem Titel, z. B. `v0.1.1`), dein Betriebssystem bzw. den Browser und beschreibe, was du getan hast und was geschehen ist. Schreibe **keine Namen oder Personalnummern** von Lehrkräften in die Meldung.

---

## Tastenkürzel

Eine Übersicht steht unter [Die Seite „Mehrarbeit abrechnen“](funktionen/index.md#tastenkürzel).
