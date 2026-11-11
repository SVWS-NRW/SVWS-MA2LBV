[← Übersicht](index.md)

# Importformate

Das Programm liest Abrechnungsdateien in **zwei Formaten** ein und erkennt das Format an der **Kopfzeile** automatisch. Beide sind Textdateien (CSV, „Comma Separated Values“). Das Stundenplanprogramm **GP-Untis** unterstützt das erste Format.

Eine Beispieldatei mit erfundenen Lehrkräften zum Ausprobieren: [beispiel-abrechnung-untis.txt](assets/beispiel-abrechnung-untis.txt) (Zeitraum: die letzten sechs Monate zum Zeitpunkt der Erstellung dieser Anleitung, ggf. über **Zeitraum** anpassen).

**Allgemein**

- Zeichensatz: **UTF-8** oder **Windows-1252**.
- Das Trennzeichen (Komma, Semikolon oder Tabulator) wird aus der Kopfzeile erkannt.
- Die **Kopfzeile** dient dem Erkennen des Formats. Sie muss genau wie unten geschrieben sein.
- Bei leeren Feldern muss das Trennzeichen trotzdem stehen. Jede Zeile hat die vorgesehene Zahl von Feldern.
- **Monate** stehen als `MMJJ` oder `MJJ` (führende Null darf fehlen), zum Beispiel `816` für August 2016 oder `1016` für Oktober 2016.
- **Stunden** mit Dezimalpunkt oder -komma (`2.5`, `2,5`). Zahlen mit mehr als vier Ziffern, wie Untis sie ausgibt, werden durch 100000 geteilt: `300000` bedeutet 3 Stunden, `250000` 2,5 Stunden.

---

## Format 1: eine Zeile je Lehrkraft („Untis-Format“)

**Kopfzeile** (eine Zeile):

```
Langname,Vorname,Geburtsdatum,Personalnummer,Status,Statistik,Schlüssel,Monat_1,Stunden_1,Merkmal_1,Monat_2,Stunden_2,Merkmal_2,Monat_3,Stunden_3,Merkmal_3,Monat_4,Stunden_4,Merkmal_4,Monat_5,Stunden_5,Merkmal_5,Monat_6,Stunden_6,Merkmal_6
```

Jede Datenzeile enthält die Lehrkraftdaten und die Mehrarbeit für **genau sechs Monate**.

| Feld | Inhalt |
|---|---|
| 1 `Langname` | Nachname |
| 2 `Vorname` | Vorname |
| 3 `Geburtsdatum` | `TT.MM.JJJJ` |
| 4 `Personalnummer` | LBV-Personalnummer |
| 5 `Status` | wird **nicht ausgewertet** |
| 6 `Statistik` | bestimmt den Status: enthält es **`T`**, ist die Lehrkraft in **Teilzeit**, enthält es **`V`**, in **Vollzeit** (z. B. `LT`, `LV`, `UT`, `UV`). Ein `W` kennzeichnet Lehramtsanwärter |
| 7 `Schlüssel` | Vergütungsschlüssel 1 bis 4 |
| 8 `Monat_1` | erster Monat |
| 9 `Stunden_1` | Stunden für den ersten Monat |
| 10 `Merkmal_1` | Merkmal `V` oder `A` für den ersten Monat, sonst leer |
| 11 bis 25 | dasselbe für Monat 2 bis 6 |

Die **sechs Monate** gelten für alle Lehrkräfte und werden der **ersten Datenzeile** entnommen. Weichen Monate in späteren Zeilen ab, meldet das Programm das und ignoriert die abweichenden Angaben.

**Beispiel** (hier der Übersicht halber umgebrochen, in der Datei steht jede Zeile am Stück): Die Lehrkraft Marie Curie hat im Mai 2026 4 Stunden und im Juni 2,5 Stunden geleistet.

```
Langname,Vorname,Geburtsdatum,Personalnummer,Status,Statistik,Schlüssel,
Monat_1,Stunden_1,Merkmal_1,Monat_2,Stunden_2,Merkmal_2,...
Curie,Marie,07.11.1967,B 1234565,v,LV,4,526,4,,626,2.5,v,
726,0,,826,0,,926,0,,1026,0,
```

### Export aus Untis

1. In Untis **Datei → Import/Export → Deutschland → NRW Mehrarbeit** wählen.
2. Im Exportdialog ein **Verzeichnis** wählen. Es ist beliebig, ein Ordner im Installationsverzeichnis wie bei MA2 ist nicht mehr nötig.
3. Im Feld **Monat** den **ersten Monat** angeben, für den die Daten exportiert werden sollen.
4. **Exportieren** wählen und die erzeugte Datei im Programm einlesen.

---

## Format 2: sechs Zeilen je Lehrkraft („Alternativformat“)

**Kopfzeile** (eine Zeile):

```
Nachname,Vorname,Geburtsdatum,Personalnummer,Status,Schlüssel,Monat,Stunden,Merkmal
```

| Feld | Inhalt |
|---|---|
| 1 `Nachname`, 2 `Vorname` | Name |
| 3 `Geburtsdatum` | `TT.MM.JJJJ` |
| 4 `Personalnummer` | LBV-Personalnummer |
| 5 `Status` | `V` Vollzeit, `T` Teilzeit, `L` oder `W` Lehramtsanwärter |
| 6 `Schlüssel` | Vergütungsschlüssel |
| 7 `Monat` | `MMJJ` oder `MJJ` |
| 8 `Stunden` | Stunden, z. B. `3` oder `2.5` |
| 9 `Merkmal` | `V` oder `A`, sonst leer |

**Beispiel:**

```
Nachname,Vorname,Geburtsdatum,Personalnummer,Status,Schlüssel,Monat,Stunden,Merkmal
Curie,Marie,07.11.1967,B 1234565,V,4,526,3,v
Curie,Marie,07.11.1967,B 1234565,V,4,626,3,v
Curie,Marie,07.11.1967,B 1234565,V,4,726,0,
Curie,Marie,07.11.1967,B 1234565,V,4,826,4,
Curie,Marie,07.11.1967,B 1234565,V,4,926,2,v
Curie,Marie,07.11.1967,B 1234565,V,4,1026,1,v
```

**Regeln**

- **Pro Lehrkraft genau sechs aufeinanderfolgende Zeilen** mit derselben Personalnummer.
- Die **erste Lehrkraft** legt den sechsmonatigen Abrechnungszeitraum fest (im Beispiel Mai bis Oktober 2026). Weichen die Monate einer späteren Lehrkraft ab, meldet das Programm das.
- Die Zahl der Zeilen nach der Kopfzeile muss durch 6 teilbar sein.

---

## Wenn die Datei abgelehnt wird

| Meldung | Ursache |
|---|---|
| „Datei enthält keine Daten“ | Die Datei hat keine Datenzeilen |
| „Falsches Dateiformat“ | Die Kopfzeile passt zu keinem der beiden Formate, oder im Alternativformat ist die Zeilenzahl nicht durch 6 teilbar |
| „Falsches Dateiformat: Zeilen … gehören nicht zur selben Lehrkraft“ | Im Alternativformat stehen innerhalb eines Blocks von sechs Zeilen verschiedene Personalnummern |

Prüfe dann die Kopfzeile und die Anzahl der Zeilen mit einem Texteditor. → [Fehlermeldungen](fehlermeldungen.md)

---

Weiter mit: [Fehlermeldungen](fehlermeldungen.md)
