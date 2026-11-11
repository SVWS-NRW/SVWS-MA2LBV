[← Übersicht](index.md)

# Installation

SVWS-MA2LBV gibt es in drei Formen. Sie unterscheiden sich nur in der Art des Starts, die Bedienung ist überall gleich.

| Form | Datei | Geeignet für |
|---|---|---|
| **Windows-Programm** | `SVWS-MA2LBV-Setup-<Version>.exe` | einzelne Arbeitsplätze unter Windows |
| **Linux-Programm** | `SVWS-MA2LBV-<Version>.AppImage` | einzelne Arbeitsplätze unter Linux |
| **Web-Version** | `SVWS-MA2LBV-<Version>-webapp.zip` | Betrieb auf dem SVWS-Server, Aufruf im Browser |

Die Dateien stehen auf der Seite der [Veröffentlichungen](https://github.com/SVWS-NRW/SVWS-MA2LBV/releases) (Releases) des Projekts.

---

## Windows

1. `SVWS-MA2LBV-Setup-<Version>.exe` herunterladen und starten.
2. Die Installation läuft ohne weitere Fragen durch. Im Startmenü entsteht die Gruppe **SVWS** mit dem Eintrag **SVWS-MA2LBV**, außerdem eine Verknüpfung auf dem Desktop.
3. Programm über das Startmenü oder die Desktop-Verknüpfung starten.

> Der Installer ist nicht digital signiert. Windows kann deshalb beim ersten Start eine Warnung anzeigen („Der Computer wurde durch Windows geschützt“). Wähle dann **Weitere Informationen** und **Trotzdem ausführen**. Kläre dies bei Bedarf mit deiner Schul-IT.

**Deinstallieren:** über die Windows-Einstellungen unter „Apps“.

---

## Linux

1. `SVWS-MA2LBV-<Version>.AppImage` herunterladen.
2. Datei ausführbar machen, entweder im Dateimanager (Eigenschaften → Ausführen erlauben) oder mit
   ```
   chmod +x SVWS-MA2LBV-<Version>.AppImage
   ```
3. Datei starten, eine Installation ist nicht nötig.

---

## Web-Version auf dem SVWS-Server

Die Web-Version läuft in jedem aktuellen Browser (Firefox, Chrome, Edge, Safari). Sie wird vom SVWS-Server ausgeliefert, wie die anderen SVWS-Tools.

**Für die Schul-IT:**

1. `SVWS-MA2LBV-<Version>-webapp.zip` in den Ordner `ma2lbv` des Apps-Verzeichnisses des SVWS-Servers entpacken. Die Datei `index.html` muss direkt in diesem Ordner liegen.
2. **Impressum anpassen:** `impressum.example.js` im selben Ordner kopieren, als `impressum.js` speichern und die Angaben der Schule eintragen (Markdown ist möglich). Das Impressum wird unten auf der Anmeldeseite angezeigt.
3. Das Programm ist danach unter der Adresse `https://<server>/app/ma2lbv/` erreichbar. Die genaue Adresse hängt von der Einrichtung des SVWS-Servers ab.

Die Web-Version ist auch Teil des Pakets **SVWS-Tools** und erscheint dort als Kachel auf der Startseite.

> Beim Update ersetzt du nur die mitgelieferten Dateien. Deine `impressum.js` bleibt erhalten.

---

## Voraussetzungen

- Zugang zum **SVWS-Server** der Schule (Server-Adresse, Schema, Benutzername, Passwort). Ohne Verbindung sind die Eingabe von Hand, das Einlesen von Abrechnungsdateien und die PDF-Erzeugung weiterhin möglich.
- Für die Übernahme von Lehrkräften aus dem SVWS braucht der Benutzer das Recht, Lehrerdaten anzusehen.
- Im SVWS sollten **LBV-Personalnummer** und **Vergütungsschlüssel** der Lehrkräfte gepflegt sein. → [Hilfe und Fragen](hilfe.md)

Die Desktop-Programme akzeptieren auch selbstsignierte Zertifikate des SVWS-Servers.

---

Weiter mit: [Verbindung zum SVWS-Server](verbindung.md)
