# ADR 003: Analyse des Delphi-Codes von MA2 / MA2LBV

- **Status:** Vorgeschlagen (Analyse abgeschlossen, Fachabnahme steht aus)
- **Datum:** 2026-11-06
- **Autor:** Frank Pfotenhauer
- **Projekt:** SVWS-MA2LBV
- **Baut auf:** [ADR 001 – Architektur](adr001-architektur.md), [ADR 002 – Oberfläche](adr002-oberflaeche.md)

## Kontext

SVWS-MA2LBV soll das Delphi-Programm **MA2** ablösen. Dessen Fachlogik und vor allem die in den **PDF-Vorlagen des LBV** enthaltene Logik müssen genau übernommen werden. Dieses ADR dokumentiert, was MA2 tut, welche Regeln gelten, welche davon im Delphi-Code und welche in den PDF-Vorlagen stehen, wo beide voneinander abweichen und was nicht übernommen wird.

**Untersucht wurden**

| Quelle | Inhalt |
|---|---|
| `…/Delphi-Module/SP_FP/MA2/*.pas, *.dfm, MA2.dpr` | Programmcode (Hauptfenster, Parameter, Login, PDF-Befüllung, Datentypen) |
| `Inst/ForInstall/vorlagen/LBV-Vorlage.pdf` | Formular LBV(A/Bes)23_2019_02 für Lehrkräfte |
| `Inst/ForInstall/vorlagen/LBV-LAA-Vorlage.pdf` | Formular LBV(A/Bes)24 (Stand 24.10.2015) für Lehramtsanwärter (VNU/VZU) |
| `Inst/ForInstall/vorlagen/LBV-Vorlage_alt.pdf` | frühere Fassung desselben Formulars (nicht verwendet) |
| `Inst/ForInstall/abrechnung/Test_Abrechnung_*.txt`, `hilfe/mavs.dat` | Beispiel-Abrechnungsdateien (beide Formate), Vergütungsschlüssel |
| `divi/Calc_Pruefziffer_Javascript.txt` | Prüfziffer-Skript des LBV |
| Bedienungsanleitung (online, Stand 18.03.2024) und `Bedienungsanleitung/Topics/*.xml` | Anwenderbeschreibung |

Aus den PDF-Vorlagen wurden Formularfelder (Name, Position, Maximallänge) und sämtliche eingebetteten JavaScript-Aktionen mit `pdf-lib` ausgelesen. Die Prüfziffer-Berechnung wurde an den vier gültigen Beispiel-Personalnummern nachgerechnet.

**Grenzen der Analyse**
- Die gemeinsam genutzten Units (`..\Shared\BaseUtils2`, `CTVBase2`, `SchILDDBUtils`, `mSchILDZugriffIntBen`, `mauswahl`, …) liegen **nicht** vor. Ihr Verhalten (z. B. `GetDelimiter`, `Mixed`, `RealVal`, `NBetween`, `FuellAufAlignmC`, `GetSchILDDicLehrer`) wurde aus dem Aufruf abgeleitet. Solche Stellen sind unten mit *(angenommen)* gekennzeichnet.
- Die SQL-Abfragen, mit denen `GetSchILDDicLehrer` die Lehrkraftdaten aus SchILD liest, sind nicht einsehbar. Das ist für das neue Tool unerheblich, weil die Daten aus der SVWS-API kommen (ADR 001 E4), die benötigten Felder sind aber festgehalten.
- `MA2.dfm`-Layouts wurden nicht Pixel für Pixel ausgewertet. Die Oberfläche richtet sich nach ADR 002.
- Das Dokument `divi/Ausfüllhilfe_zur_LBV(A)14_Änderungsmitteilung.pdf` enthält inhaltlich die Ausfüllhilfe zur *Arbeitsbescheinigung* (Bundesagentur für Arbeit) und **nicht** zur Änderungsmitteilung. Sie ist als Quelle für die LBV-Regeln unbrauchbar; die aktuelle Ausfüllanleitung des LBV muss separat beschafft werden (siehe Offene Fragen).

## 1. Zweck und Ablauf des Programms

MA2 erzeugt je Lehrkraft eine **Änderungsmitteilung zur Mehrarbeitsvergütung** an das LBV NRW (Papierformular mit Barcode).

Typischer Ablauf (Bedienungsanleitung, Kapitel 4):

1. Programmstart, Anmeldung an SchILD, einmalig Abrechnungszeitraum von **sechs Monaten** festlegen.
2. Mehrarbeitsdaten bereitstellen auf einem von drei Wegen:
   1. Abrechnungsdatei aus Untis o. Ä. einlesen (zwei CSV-Formate),
   2. Lehrkräfte aus SchILD übernehmen und Stunden von Hand eintragen,
   3. alles von Hand erfassen.
3. Zeilen (Lehrkräfte) und Monatsspalten markieren, ggf. Merkmale setzen.
4. „LBV-Export“: Prüfung, PDF aus der Vorlage erzeugen, optional drucken. Ergebnis je Zeile in der Spalte „Hinweis(e)“.
5. Arbeitsdaten als verschlüsselte `.maa`-Datei sichern.

## 2. Programmstruktur

| Datei | Aufgabe | Übernahme |
|---|---|---|
| `MA2.dpr` | Start, Splash-Screen, DataModule, Hauptfenster | entfällt |
| `mMA2Main.pas/.dfm` (≈ 2 200 Zeilen) | Hauptfenster, **gesamte Fachlogik** (Import, Merkmale, Prüfung, Export) | → `rules/`, `services/`, `AbrechnungView` |
| `ctv.pas` | Datentypen `tKolMALBVDaten`, `tLBVParameter`, `tMA2Dat` | → `models/` |
| `mPDFUtils.pas` | Befüllen der PDF-Vorlage (Debenu PDF Library) | → `services/pdfExport.ts` (pdf-lib) |
| `MA2Utils.pas` | Pfade, INI-Dateien, Rechte, Fehlertexte | teilweise → `stores/einstellungen` |
| `mParameterIO.pas/.dfm` | Einstellungen (Formulardaten, Darstellung) | → `EinstellungenView` |
| `mSchILDZugriff.pas`, `mDMMA2.pas`, `mLogin*.pas` | SchILD-Datenbankzugriff, Anmeldung, Benutzer | entfällt (SVWS-API) |
| `mZeigePDF.pas` | PDF-Vorschau | → Vorschau im Browser |
| `mAbout.pas`, `mSplashScreen.pas` | Info, Splash | entfällt |
| `MAParameter.pas/.dfm` | Alter Stammdatendialog (Untis-GPU004, `.SD`-Dateien) | **nicht in `MA2.dpr` eingebunden**, Altlast, entfällt |

**Technologie:** Delphi (VCL), TMS-Komponenten (`TAdvStringGrid`, Toolbar/Ribbon), ADO für SchILD (MDB/UDL), Debenu PDF Library 1811 (kommerziell), Inno-Setup-Installer. Das Programm ist Windows-only.

## 3. Datenmodell

### 3.1 Tabelle im Hauptfenster (`asgMA`, 21 Spalten)

| Spalte | Index | Inhalt |
|---|---|---|
| `#` | 0 | laufende Nummer, Checkbox „Zeile exportieren“ |
| `Langname` | 1 | Nachname |
| `Vorname` | 2 | |
| `Geb.-Dat.` | 3 | `TT.MM.JJJJ` |
| `LBV.-Nr.` | 4 | LBV-Personalnummer (z. B. `B 0312222`) |
| `V.-Schl.` | 5 | Vergütungsschlüssel 1–4 |
| Monat 1 … 6 | 6, 8, 10, 12, 14, 16 | Stunden; Kopfzelle: Monat `JJ/MM` mit Checkbox „Monat berücksichtigen“ |
| `M.` | 7, 9, 11, 13, 15, 17 | Merkmal zum Monat links davon |
| `Su.` | 18 | Summe der Stunden der **markierten** Monate, 1 Nachkommastelle |
| `Status` | 19 | Kürzel (siehe 4.2) |
| `Hinweis(e)` | 20 | Prüf- bzw. Exportergebnis |

Die Spalten werden im Code über ihre Kopfzeile gefunden (`BestimmeSpalten`), nicht über feste Indizes. Das alte `.maa`-Format hing deshalb an diesen Überschriften.

### 3.2 `tKolMALBVDaten` (aufbereitete Daten einer Lehrkraft für den Export)

`FN` (Ziel-Dateiname), `Nachname`, `Vorname`, `LBVNr`, `Geb_Datum`, `BV` (0 unbekannt, 1 beamtet, 2 tarifbeschäftigt), `IstVZ`, `IstTZ`, `IstLAA`, `Bereich` (`A`/`C`/` `), und drei Reihen mit je sechs Einträgen:

| Reihe | Formularabschnitt | Felder |
|---|---|---|
| `Dat2982_83[1..6]` | A (Kennzahl 2982) | Valid, Vergütungsschlüssel, Monat, Stunden (3 Stellen), Merkmal |
| `Dat6145_46[1..6]` | C (Kennzahl 6145) | Valid, Monat, Stunden, Merkmal |
| `Dat2D[1..6]` | B im LAA-Formular (Kennzahl 2D) | Valid, Schulform, Monat, Stunden (2 Stellen), Vergütungsschlüssel |

### 3.3 `tLBVParameter` (schulweite Formulardaten)

Dienststelle (mehrzeilig, Zeilen durch `~` getrennt), Aktenzeichen, Bearbeiter, Telefon, Nebenstelle, PLZ/Ort, E-Mail, Schulnummer, Schulform (nur LAA), Anzahl Minuten je Unterrichtsstunde, Schalter „keine Mehrarbeit an weiterer Schule“ (Standard **wahr**), „Sachlich richtig“, „Unterschrift“.

### 3.4 Lehrkraftdaten aus SchILD (`tLehrer`, angenommen aus der Verwendung)

Kürzel, Nachname, Vorname, Geburtsdatum, `LBVNummer`, `VSchluessel`, `Rechtsverhaeltnis` (`W` = Lehramtsanwärter/Referendar), `Beschaeftigungsart` (`V`/`T`). Die Lehrkraftliste kommt aus einem Dictionary, das beim Öffnen der SchILD-Datenbank gefüllt wird (`GetSchILDDicLehrer`).

## 4. Fachlogik

### 4.1 Zeitdarstellungen

| Ort | Format | Beispiel (Oktober 2016) |
|---|---|---|
| Abrechnungsdatei | `MJJ` oder `MMJJ`, führende Null kann fehlen | `1016`, `816` (= August 2016) |
| Intern / Tabellenkopf | `JJ/MM` | `16/10` |
| PDF-Felder | `MMJJ` | `1016` |
| Dateiname des PDF | `JJMM` | `1610` |

`MonatConvert` ergänzt bei dreistelligen Werten eine führende Null und wandelt `MMJJ` in `JJ/MM`. Das Jahr wird durchgängig als `20JJ` gelesen.

### 4.2 Personengruppen: beamtet / tarifbeschäftigt, Vollzeit / Teilzeit, Lehramtsanwärter

Aus **LBV-Personalnummer** und **Status** wird abgeleitet (`GibLBVNrundBV`, `GibVZTZ`, `GibLAA`). Leerzeichen in der Personalnummer werden entfernt (`B 0312222` → `B0312222`).

| Merkmal | Regel |
|---|---|
| `BV` = 1 (beamtet) | erstes Zeichen der LBV-Nummer ∈ `A B C D E F G H J` |
| `BV` = 2 (tarifbeschäftigt) | erstes Zeichen ∈ `K L M N O P Q R S T U V W X Y Z` |
| Teilzeit `IstTZ` | Status enthält `T`; dann `IstVZ` = falsch |
| Vollzeit `IstVZ` | sonst (Vorgabe wahr) |
| Lehramtsanwärter `IstLAA` | Status enthält `W` |
| **Bereich `A`** | `BV` = 1 **oder** Vollzeit → Formularabschnitt A (Kennzahl 2982) |
| **Bereich `C`** | `BV` = 2 **und** Teilzeit → Formularabschnitt C (Kennzahl 6145) |

Daraus folgt: Beamte in Teilzeit und alle Vollzeitkräfte gehören in Abschnitt A, **tarifbeschäftigte Teilzeitkräfte** in Abschnitt C. Das deckt sich mit den Überschriften der Vorlage („für alle vollbeschäftigten Lehrkräfte u. zusätzlich für alle Beamte in Teilzeitbeschäftigung“ / „nur bei teilzeitbeschäftigten Lehrkräften im Tarifbereich“).

**Herkunft des Status:**
- Format 1 (Untis): Spalte 6 „Statistik“ (z. B. `LV`, `LT`); die Spalte 5 „Status“ (`v`/`a`) wird **nicht** ausgewertet.
- Format 2: Spalte 5 „Status“; der Wert `L` wird in `W` umgesetzt.
- SchILD-Import: `W` bei Rechtsverhältnis `W`, sonst die Beschäftigungsart (`V`/`T`).

Der Status wird per Teilstring-Suche (`Pos`) geprüft, nicht per Vergleich. `LT` und `T` gelten beide als Teilzeit.

### 4.3 Eingabeformate (Abrechnungsdatei)

Kodierung: Windows-1252 (Beispieldateien enthalten das Byte `0xFC` für „ü“). Das Trennzeichen wird je Zeile erkannt (`GetDelimiter`, *angenommen*: erkennt Komma, Semikolon, Tabulator) und auf Komma normalisiert (`AnalysiereZeile`). Die Erkennung des Formats erfolgt über die **Kopfzeile** (Textvergleich am Zeilenanfang, `Schluessel` wird zu `Schlüssel` korrigiert).

**Format 1 („Untis-Format“)** – eine Zeile je Lehrkraft, immer sechs Monate:

```
Langname,Vorname,Geburtsdatum,Personalnummer,Status,Statistik,Schlüssel,
Monat_1,Stunden_1,Merkmal_1, … , Monat_6,Stunden_6,Merkmal_6
Feynman,Richard,26.04.1975,B 2009012,a,LT,2,816,0,,916,0,,1016,300000,a,1116,400000,a,1216,100000,a,117,200000,a
```

- Die sechs Monate werden **nur aus der ersten Datenzeile** gelesen und gelten für alle Lehrkräfte.
- Ist eine Stundenangabe länger als vier Zeichen, wird sie als Festkommazahl mit fünf Nachkommastellen gelesen: `Wert / 100000`, gerundet auf eine Nachkommastelle (`300000` → `3,0`). Kürzere Werte bleiben unverändert. Der Wert `000` wird zur leeren Zelle, `0` bleibt `0`.

**Format 2 („Alternativformat“)** – sechs Zeilen je Lehrkraft:

```
Nachname,Vorname,Geburtsdatum,Personalnummer,Status,Schlüssel,Monat,Stunden,Merkmal
Byran,Augusta,10.09.1981,B 0312221,V,1,816,3,v
```

- Die Zeilenzahl nach der Kopfzeile muss durch 6 teilbar sein, sonst „Falsches Dateiformat“.
- Es wird nur geprüft, dass die ersten sechs Zeilen dieselbe Personalnummer haben. Die Monate stammen aus diesen sechs Zeilen und gelten für alle.
- Stunden werden unverändert übernommen (keine Umrechnung).

**Fehlen die Monate** (leere Monatsangaben), fragt das Programm nach einem Startmonat und bildet die folgenden fünf Monate (`WaehleAbrechnungszeitraum`, Auswahl aus den zwei vorangegangenen Kalenderjahren und dem laufenden Jahr bis zum aktuellen Monat).

**Import-Verhalten:** Existiert bereits eine Arbeitsdatei, wird vor dem Überschreiben nachgefragt. Nach dem Import sind alle Zeilen markiert, die Monatsmarkierungen stammen aus der zuletzt gespeicherten Auswahl (`MAuswahl`).

### 4.4 Merkmale

Das **Merkmal** steht je Monat in der Spalte rechts neben den Stunden.

| Merkmal | Bedeutung (laut Delphi-Meldungen) | Gilt in |
|---|---|---|
| `V` | weniger als vier vergütungsfähige Stunden anweisen | Abschnitt A |
| `A` | anteilige Besoldung bei Teilzeitbeschäftigten | Abschnitt A |
| `K` | Lohnart 5006: Beteiligung an Klassenfahrten (nur Teilzeit im Tarifbereich) | Abschnitt C |

**Eingabeprüfung** (`asgMACellValidate`, beim Verlassen der Zelle): Bereich `C` erlaubt nur `K`, Bereich `A` nur `V` oder `A`. Anderes wird mit Meldung gelöscht. Die Prüfung gilt je Zeile nach deren Bereich (4.2).

**Automatik** (`MAKorrigieren`, Einstellung „Merkmal setzen“, Standard **an**, läuft vor jedem Export). Nur Bereich `A`, nur markierte Monate, `S` = Stunden des Monats. Die Regeln werden **in dieser Reihenfolge** ausgeführt, spätere überschreiben frühere:

| # | Bedingung | Ergebnis |
|---|---|---|
| 1 | `0 < S < 4` und Vollzeit | `V` |
| 2 | `S > 0` und Teilzeit | `A` |
| 3 | `S > 3` und Vollzeit | leer |
| 4 | `S = 0` | leer |

### 4.5 Summen

`Su.` = Summe der Zellen der **markierten** Monatsspalten (`RealVal`, Dezimalkomma), 1 Nachkommastelle. Ist die Checkbox einer Spalte nicht lesbar, zählt der Monat als markiert.

### 4.6 Aufbereitung für den Export (`Kollegendaten2MADaten`)

Je Monat gilt: der Monat zählt nur, wenn seine Spaltenmarkierung gesetzt und die Stundenzelle nicht leer ist.

| Fall | Bedingung | Wert |
|---|---|---|
| **Abschnitt A** | nicht LAA **und** Bereich `A` | Stunden = `Round(Wert)` auf **ganze Stunden**, dreistellig mit führenden Nullen; Merkmal = `Upper(Trim(Zelle))`; Vergütungsschlüssel aus Spalte `V.-Schl.` |
| **Abschnitt C** | nicht LAA **und** Bereich `C` | Stunden = Zellentext, links auf mindestens drei Zeichen mit `0` aufgefüllt (Nachkommastellen bleiben); Merkmal wie oben |
| **LAA** | LAA | Stunden = `Round(Wert)`, **zweistellig**; Schulform aus den Einstellungen; Vergütungsschlüssel |

Der Dateiname lautet `LBV_<Nachname>_<LBVNr>_<JJMM erster Monat>-<JJMM letzter Monat>.pdf` im Ordner `\pdf` (Beispiel der Anleitung: `LBV_Feynman_1610-1611.pdf`). Erster/letzter Monat sind der erste und der letzte gültige Monat. Der Nachname wird nicht bereinigt. Sonderzeichen im Namen führen zu ungültigen Dateinamen (`ValidFilename` wird nur an anderer Stelle geprüft).

> **Rundung:** `Round` in Delphi rundet auf die **nächste gerade Zahl** („Bankers Rounding“): `2,5 → 2`, `3,5 → 4`, `0,5 → 0`. JavaScript `Math.round` liefert `3` bzw. `1`. Das Tool muss das Delphi-Verhalten bewusst nachbilden oder bewusst davon abweichen (Offene Frage 3).

### 4.7 Prüfungen vor dem Export (`GibErrCode`)

Es wird die **erste** gefundene Verletzung gemeldet; der Export dieser Zeile wird abgebrochen und der Text steht in der Hinweisspalte. Die Reihenfolge ist fachlich relevant (nur der erste Fehler wird sichtbar).

**Schulweite Prüfungen**

| # | Prüfung | Meldung (Delphi) |
|---|---|---|
| 1 | Schulnummer: `100000 < N < 200000` (numerisch, 6 Ziffern) | „Fehler: Schulnummer ungültig“ |
| 2 | Anzahl Minuten (falls angegeben): `4500 < N < 12001` (45,01–120,00) | „Fehler: Anzahl der Minuten je Unterrichtsstunde“ |

**Lehrkraft**

| # | Prüfung | Meldung |
|---|---|---|
| 3 | Zieldatei nicht durch ein anderes Programm gesperrt | „Fehler: Datei … ist gesperrt“ |
| 4 | Nachname, Vorname nicht leer | „Fehler: Nachname fehlt“ / „… Vorname fehlt“ |
| 5 | Geburtsdatum gültiges Datum | „Fehler: Geburtsdatum fehlt bzw. falsch“ |
| 6 | LBV-Personalnummer (siehe 4.8) | „Fehler: Personalnummer …“ |
| 7 | `BV` ≠ 0 | „Fehler: Zuordnung beamtet / tarifbeschäftigt nicht möglich“ |

**Je Monat, Abschnitt A**

| # | Prüfung | Meldung |
|---|---|---|
| 8 | Monate mit Stunden = 0 werden ausgelassen | – |
| 9 | Vergütungsschlüssel `1 ≤ VS ≤ 4` | „Fehler: Vergütungsschlüssel (…)“ |
| 10 | Merkmal leer oder erster Buchstabe `V`/`A` | „Fehler: Merkmal (…)“ |
| 11 | Stunden ≤ 288; bei `0 < Stunden < 4` muss ein Merkmal gesetzt sein | „Fehler: Anzahl Stunden (…)“ / „Stunden < 4 und Merkmal <> ‚V‘, ‚A‘ (…)“ |
| 12 | Monat gültig und **nicht in der Zukunft** (1. des Monats ≤ heute) | „Fehler: Monat/Jahr: Falscher Wert“ / „Termin liegt in der Zukunft“ |

**Je Monat, Abschnitt C:** Stunden ≤ 288 (Merkmalsprüfung entfällt), Monatsprüfung wie oben.

**Je Monat, LAA:** Stunden = 0 → ausgelassen; Schulform zweistellig und ∈ 1–14 oder 16; Stunden höchstens zweistellig (< 100); Monatsprüfung. **Keine** Prüfung des Vergütungsschlüssels.

**Abschluss:** Summe der exportierten Stunden = 0 → „Fehler: keine Mehrarbeit“.

**Modus „nur prüfen“** (`LBVKorrekturModus`): führt dieselben Prüfungen aus, erzeugt aber kein PDF; die Hinweisspalte zeigt „kein Fehler gefunden“.

### 4.8 LBV-Personalnummer und Prüfziffer

Die Nummer besteht aus einem **Buchstaben** und Ziffern, die letzte Ziffer ist eine **Prüfziffer** (Modulo 11).

| Variante | Aufbau | Prüfziffer |
|---|---|---|
| 8-stellig (Beamte) | Buchstabe + 7 Ziffern | Buchstabenwert `B=2, C=3, D=4, E=5` (im PDF-Skript zusätzlich `A=1, F=6, G=7, H=8, J=1`) × 8, plus die ersten 6 Ziffern mit den Gewichten **7, 6, 5, 4, 3, 2**; Summe modulo 11; Ergebnis `10` → `0`; Vergleich mit der 7. Ziffer |
| 10-stellig (Tarif) | Buchstabe + 9 Ziffern | die ersten 8 Ziffern mit den Gewichten **9, 8, 7, 6, 5, 4, 3, 2**; Summe modulo 11; `10` → `0`; Vergleich mit der 9. Ziffer |

Die Prüfung stimmt in Delphi (`CheckLBVNr`) und im Skript des LBV (`Calc_Pruefziffer_Javascript.txt`, PDF-Feld `LBV_Personalnummer`) überein. Die Beispielnummern lassen sich nachrechnen:

| Nummer | Summe | Prüfziffer berechnet | Ziffer in der Nummer | Ergebnis |
|---|---|---|---|---|
| `B0312222` | 57 | 2 | 2 | gültig |
| `B0312221` | 57 | 2 | 1 | **ungültig** (steht in `Test_Abrechnung_Alternativformat.txt`) |
| `B2009012` | 68 | 2 | 2 | gültig |
| `C0798541` | 166 | 1 | 1 | gültig |
| `B0613660` | 99 | 0 | 0 | gültig |

**Zulässige Anfangsbuchstaben unterscheiden sich je Quelle:**

| Quelle | 8-stellig | 10-stellig |
|---|---|---|
| Delphi `CheckLBVNr` (beide Formulare) | `B C D E` | `P` |
| Delphi `GibLBVNrundBV` (Zuordnung) | `A B C D E F G H J` | `K … Z` |
| PDF-Vorlage Lehrkräfte (`LBV_Personalnummer`) | `B C D E` | `P` |
| PDF-Vorlage LAA | `A B C D E F G H J` | `K L M N P Q U` |

Folge: Delphi lehnt vor dem Export Nummern wie `A…`, `F…`, `K…` ab, die das LAA-Formular akzeptieren würde, und die Zuordnung in beamtet/tarifbeschäftigt kennt mehr Buchstaben, als die Prüfung zulässt. Siehe Offene Frage 4.

### 4.9 Lohnart und Stundenformat in Abschnitt C

| Merkmal der Zeile | Lohnart |
|---|---|
| `K` | `5006` (Klassenfahrt) |
| sonst | `5004` |

`GetCStunden` formt die Stunden zu **fünf Ziffern** (drei vor, zwei nach dem Komma): Vorkommastellen links auf drei Stellen aufgefüllt, Nachkommastellen bei mehr als zwei Stellen **abgeschnitten (nicht gerundet)**, bei einer Stelle mit `0` ergänzt. Bei Lohnart `5004` (und `5007`) werden die Nachkommastellen auf `00` gesetzt, d. h. **Nachkommastellen gehen verloren**. Beispiel: `2,5` mit Lohnart `5004` → `00200`; mit `5006` → `00250`.

Das PDF prüft dieselbe Regel („Lohnart 5004 ist nur zulässig mit Nachkommastellen ‚00‘“), erlaubt nur `5004` und `5006` (`5005` ist ausdrücklich nicht mehr zulässig) und begrenzt die Stunden auf 000,00–180,00.

## 5. PDF-Vorlagen des LBV

Beide Vorlagen sind AcroForm-PDFs (Adobe InDesign CS6, PDF 1.7, eine A4-Seite, **mit eingebettetem JavaScript**).

### 5.1 Lehrkräfte – `LBV-Vorlage.pdf`, LBV(A/Bes)23_2019_02

Aufbau: Kopf (Dienststelle, Datum, Bearbeiter, Telefon, E-Mail), Personendaten, **A.** Abrechnung (Kennzahl 2982), **B.** Abschlag (Kennzahl 2989, steuerpflichtig), **C.** Abrechnung Tarif-Teilzeit (Kennzahl 6145), Abfrage „weitere Schule“, Bemerkungen, „Sachlich richtig“, Unterschrift, Barcode.

| Feld | Inhalt | Länge | Befüllt durch MA2 |
|---|---|---|---|
| `LBV_Nachname`, `LBV_Vorname` | Name (`Mixed(...)`, *angenommen*: Groß-/Kleinschreibung normalisiert) | 40 / 35 | ja |
| `LBV_Geburtsdatum` | `TT.MM.JJJJ` (Maske `99.99.9999`) | 10 | ja |
| `LBV_Personalnummer` | LBV-Nummer ohne Leerzeichen | 10 | ja |
| `LBV_Schulnummer` | Schulnummer (6 Ziffern) | 6 | ja |
| `LBV_Stundentaktung` | Minuten je Stunde, `45,00`≙`04500` (nur, wenn nicht Standard) | 5 | ja, falls ≠ `04500` |
| `FeldA_Input1.1` … `6.1` | `MMJJ SSS V` (Maske `9999 999 9`), z. B. `0210 003 2` | 10 | ja (Abschnitt A) |
| `FeldA_Input1.2` … `6.2` | Merkmal (1 Zeichen) | 1 | ja |
| `FeldB_Input1.1` | Abschlag (Maske `999 9 9999 9999`) | 15 | **nein** |
| `FeldC_Input1.1` … `6.1` | `LLLL MMJJ SSSSS` (Maske `9999 9999 99999`), z. B. `5004 0210 00300` | 15 | ja (Abschnitt C) |
| `LBV_Checkbox_Nein` / `_Ja`, `LBV_Anzahl_Schulen` | „weitere Schule?“ | – / 2 | Nein-Kästchen (Wert `Ja`), falls Einstellung gesetzt |
| `Dienststelle`, `Aktenzeichen`, `Datum`, `E-Mail-Adresse`, `Bearbeiter`, `Telefon` | Kopfangaben | 35 (Aktenzeichen) | ja |
| `InVertretung` | „Sachlich richtig“ | – | ja |
| `Unterschrift` | Name der zeichnenden Person | – | ja |
| `LBV_Barcode_Text`, `LBV_Barcode_9of3` | Barcode-Text bzw. Code-39-Darstellung (`*…*`) | – | nur beim Direktdruck (siehe 5.4) |
| `LBV_Bemerkungen` | Bemerkungen | – | nein |
| Füller- und Hilfsfelder (`LBV_Füller_Feld*`, `Col*`, `Info_1_Text`, `Note_*`, `Anzahl_Text`) | Layout | – | nein |

Die Abschnitte A und C zusammen bieten **sechs Zeilen** (`J` zählt über beide Abschnitte). Es gibt je Monat eine Zeile, Monate ohne Stunden rücken nach.

### 5.2 Lehramtsanwärter – `LBV-LAA-Vorlage.pdf`, LBV(A/Bes)24 (24.10.2015)

Titel: „Änderungsmitteilung – Vergütung für nebenamtlichen Unterricht (VNU) / Vergütung für zusätzlichen Unterricht (VZU) für Lehramtsanwärter und Studienreferendare“.

| Feld | Inhalt |
|---|---|
| `LBV_Dienststelle`, `LBV_Aktenzeichen`, `LBV_Ort` (**PLZ, Ort, Datum**), `LBV_Bearbeiter`, `LBV_Telefon`, `LBV_Nebenstelle` | Kopf. `LBV_Ort` erhält `PLZOrt + ', ' + Datum` |
| `LBV_Nachname`, `LBV_Vorname`, `LBV_Geburtsdatum`, `LBV_Personalnummer`, `LBV_Schulnummer`, `LBV_Stundentaktung` | wie oben |
| `FeldB_Input1_1` … `6_1` | `SS MMJJ HH V` (Maske `99 9999 99 9`): Schulform, Monat, Stunden (2 Stellen), Vergütungsschlüssel |
| `FeldC_Input1.1` | Abschlag (Kennzahl 2E), nicht befüllt |
| `LBV_Checkbox_Nein` / `_Ja`, `LBV_Anzahl_Schulen` | wie oben |
| `InVertretung`, `Unterschrift` | wie oben |

Schulformschlüssel des LAA-Formulars: `01` Grundschulen, `02` Hauptschulen, `03` Realschulen, `04` Gymnasien, `05` Kollegs, `06` Landesinstitut für Qualifizierung, `07` Gesamtschulen, `08` Förderschulen, `09` Berufskollegs, `10` Sekundarschule, `11` Abendrealschulen, `12` Abendeinrichtungen der Berufskollegs, `13` Abendgymnasien, `14` Fachgruppen für die Oberstufen, `16` Mentorentätigkeit für Musikpädagogik. Es gibt **kein** Feld `Datum` und kein Barcode-Feld.

### 5.3 Vergütungsschlüssel (`hilfe/mavs.dat`)

| Schlüssel | Lehrämter |
|---|---|
| 1 | gehobener Dienst aller Schulformen, soweit nicht Schlüssel 2 oder 3 |
| 2 | gehobener Dienst aller Schulformen, Eingangsämter mindestens BesGr A 12, und höherer Dienst an Grund- und Hauptschulen |
| 3 | gehobener Dienst aller Schulformen, Eingangsämter BesGr A 13, und höherer Dienst an Förder- und Realschulen |
| 4 | höherer Dienst an Gymnasien, berufsbildenden Schulen und Kollegschulen sowie höherer Dienst an Fachhochschulen |

(Das PDF nennt bei Schlüssel 4 zusätzlich Gesamtschulen und Sekundarschulen; die LAA-Vorlage kennt Schlüssel 1–8, siehe 5.5.)

### 5.4 Eingebettetes JavaScript der Vorlagen (Logik des LBV)

Die Vorlagen enthalten Skripte an den Feldern (Ereignisse *Keystroke*, *OnEnter*, *OnLeave*) und globale Skripte (*Vor/Nach dem Drucken*). Sie laufen **nur im Adobe Reader/Acrobat**, nicht im Browser und nicht in `pdf-lib`. Eine Befüllung aus MA2 löst die *OnLeave*-Prüfungen **nicht** aus. Folgende Logik liegt im PDF:

**Eingabemasken (Keystroke):** `99.99.9999` (Geburtsdatum), `99999` (Stundentaktung), `999999` (Schulnummer), `9999 999 9` (Abschnitt A), `9999 9999 99999` (Abschnitt C), `99 9999 99 9` (LAA, Abschnitt B).

**Prüfungen beim Verlassen eines Feldes**

| Feld | Regel des PDF |
|---|---|
| Personalnummer | Format (siehe 4.8), Prüfziffer; erst bei gültiger Nummer **und** ausgefüllter Schulnummer werden die Abschnitte freigeschaltet; Abschnitt C nur bei 10-stelliger Nummer |
| Schulnummer | genau 6 Ziffern |
| Stundentaktung | genau 5 Ziffern, `4500 < Wert < 12001` |
| Abschnitt A | Eintrag vollständig (10 Zeichen); Monat gültig (1–12) und **nicht in der Zukunft**; Schlüssel **1–4**; bei Stunden `< 4` ist ein Merkmal Pflicht |
| Merkmal (A) | bei Stunden `< 4`: nur `A` oder `V`; bei Stunden `≥ 4`: nur `A` |
| Abschnitt C | 15 Zeichen; Lohnart nur `5004` oder `5006`; bei `5004` Nachkommastellen `00`; Monat nicht in der Zukunft; Stunden `00000–18000` |
| Abschnitt B (LAA) | Schulform 01–16; Monat nicht in der Zukunft; Stunden 01–24; Schlüssel 1–8 |
| Abschlag (Abschnitt B der Lehrkräfte-Vorlage, Kennzahl 2989) | Stunden 0–48, Schlüssel 1–4, Beginn/Ende des Zeitraums (Beginn höchstens 3 Monate in der Zukunft, Ende in der Vergangenheit) – **von MA2 nicht unterstützt** |

Die Zukunftsprüfung vergleicht den **ersten Tag** des Monats mit dem aktuellen Zeitpunkt (aktueller Monat zulässig).

**Beim Drucken**
- Vor dem Druck („Ausdruck“) werden die Rahmenlinien der Eingabefelder transparent gesetzt und die Barcodefelder gefüllt. Barcode-Text: `ABes23/201902/<Personalnummer>`; `LBV_Barcode_9of3` enthält denselben Text in Sternchen (`*ABes23/201902/B0312222*`, Code-39-Schrift).
- Nach dem Druck werden die Rahmenlinien wieder schwarz gesetzt und die Barcodefelder geleert.

Der Barcode enthält die **Formularkennung** `ABes23/201902` und die Personalnummer. Er wird vom LBV maschinell gelesen.

**Direktdruck in MA2** (Einstellung „Druckmodus = direkt“) bildet das nach (`InitDruckausgabe`): die Barcodefelder werden mit `GetFormularName + '/' + LBVNr` gefüllt (Formularname `ABes23/201902`, für LAA leer), ausgewählte Rahmen werden ausgeblendet, alle Nicht-Formular-Annotationen (Kommentarsymbole mit Ausfüllhinweisen) gelöscht. Im Modus „Acrobat“ übernimmt das PDF-Skript diese Aufgabe beim Drucken.

### 5.5 Abweichungen zwischen Delphi und PDF-Vorlage

| Thema | Delphi (`GibErrCode`) | PDF-Skript | Konsequenz |
|---|---|---|---|
| Stunden je Monat (A) | Obergrenze 288 | keine Obergrenze (Kommentar im Skript nennt „000–024“, nicht durchgesetzt) | Offene Frage 5 |
| Stunden (C) | ≤ 288 | ≤ 180,00 | PDF strenger |
| Merkmal `V` bei Stunden ≥ 4 | zulässig | **nicht zulässig** (nur `A`) | Offene Frage 6 |
| Stunden (LAA) | höchstens zweistellig (< 100) | 01–24 | PDF strenger |
| Vergütungsschlüssel (LAA) | nicht geprüft | 1–8 | PDF strenger |
| Anfangsbuchstaben Personalnummer | `B C D E P` | siehe 4.8 | Offene Frage 4 |
| Zukunft | `1. des Monats > heute` → Fehler | gleiche Logik | gleich |
| Prüfziffer, Schulnummer, Taktung | gleiche Regeln | gleich | gleich |

### 5.6 Ablauf der PDF-Erzeugung (`SpeicherKolMALBVDatenInPDFDatei`)

1. Vorlage laden (`LBV-Vorlage.pdf` bzw. `LBV-LAA-Vorlage.pdf` je nach `IstLAA`), Formularfelder zurücksetzen.
2. Kopfdaten schreiben. Regel `UpdateSonstFormularFeld`: ist der Einstellungswert leer, bleibt der Vorlagenwert erhalten; ist beides leer, wird das Feld nicht verändert. Das Feld `LBV_Stundentaktung` wird nur bei einem Wert ≠ `04500` geschrieben.
   - Lehrkräfte-Vorlage: `Dienststelle` (Zeilen aus `~` werden zu Zeilenumbrüchen), `Aktenzeichen`, `Datum` (heute), `E-Mail-Adresse`, `Bearbeiter`, `Telefon` (Telefon und Nebenstelle durch Leerzeichen verbunden).
   - LAA-Vorlage: `LBV_Dienststelle`, `LBV_Aktenzeichen`, `LBV_Ort` (`PLZOrt, Datum`), `LBV_Bearbeiter`, `LBV_Telefon`, `LBV_Nebenstelle`.
   - beide: `LBV_Schulnummer`, `InVertretung`, `Unterschrift`.
3. Personendaten schreiben (`Nachname`, `Vorname` mit Groß-/Kleinschreibung nach `Mixed`, Geburtsdatum, LBV-Nummer).
4. Monatszeilen schreiben (4.6, 5.1, 5.2).
5. Wenn „keine Mehrarbeit an weiterer Schule“: `LBV_Checkbox_Nein` = `Ja`.
6. Speichern als `LBV_<Name>_<Nr>_<JJMM>-<JJMM>.pdf` (UTF-8-Pfad).
7. Optional drucken (Acrobat oder Direktdruck).

Schlägt ein Feld nicht an (`FindFormFieldbyTitle` = 0), meldet MA2 „Formfeld nicht gefunden: …“ und bricht ab.

## 6. Dateien, Konfiguration, Sicherheit

| Thema | Altes MA2 | Neues Tool |
|---|---|---|
| Arbeitsdaten | `.maa` (Gittertext, AES-256) im Ordner `\ma`, fester Schlüssel im Quelltext | verschlüsselte Datei, Passphrase der Nutzerin oder des Nutzers (ADR 001 E5) |
| Einstellungen | verschlüsselte INI `ini\<Benutzer>_MA.INI`, Admin-INI `MA2.INI` | `localStorage` + JSON-Export |
| Abrechnungsdatei | frei wählbarer Pfad, Standard `abrechnung\gppnrw.txt` | Dateiauswahl im Browser |
| PDF-Ausgabe | `\pdf` | Download bzw. ZIP |
| Vorlagen | `Vorlagen\LBV-Vorlage.pdf`, `LBV-LAA-Vorlage.pdf` im Installations- bzw. SchILDzentral-Ordner | eingebettet, austauschbar (ADR 001 E6) |
| Benutzer | SchILD-Benutzer; `MA2Admin` sieht nur Einstellungen; SchILD-Admin | SVWS-Anmeldung; keine eigene Rollenverwaltung |
| Hilfe | CHM / Browser | Footer-Link |

Im Quelltext fest hinterlegt sind ein **Lizenzschlüssel der PDF-Bibliothek** und die **Passphrase für die AES-Verschlüsselung** der Arbeitsdateien. Beides wird in diesem Projekt nicht übernommen und hier bewusst nicht wiedergegeben.

## 7. Auffälligkeiten und Fehler im Delphi-Code

Diese Stellen dürfen **nicht blind** übernommen werden; jede ist ein Testfall oder eine Entscheidung.

| # | Stelle | Beobachtung | Auswirkung / Vorschlag |
|---|---|---|---|
| 1 | `LoescheLBVFormularDaten` | Die Variable `F1` wird im Schleifendurchlauf zweimal zugewiesen (`FeldA_Input#.1`, dann `FeldB_Input#.1`). `FeldA_Input#.1` wird dadurch **nicht** gelöscht, `FeldB_Input#.1` stattdessen schon. Da die Vorlage jeweils frisch geladen wird (`OeffneLBVVorlage`), bleibt der Fehler unauffällig | im Neuen nicht relevant: jede Vorlage wird aus den Rohdaten frisch befüllt |
| 2 | `MAKorrigieren` (Regeln 1 und 3) | Stunden `3 < S < 4` erhalten erst `V`, dann wird das Merkmal wieder geleert. Beim Export wird aber `Round(S)` verwendet: `3,4 → 3` Stunden, also **< 4 ohne Merkmal** → Fehler „Stunden < 4 und Merkmal …“ | Automatik und Rundung aufeinander abstimmen (Merkmal anhand der **gerundeten** Stunden bestimmen) |
| 3 | `Round` | Bankers Rounding (4.6) | bewusst entscheiden |
| 4 | `CheckStunden` | Zugriff auf `S[1]` bei leerer Zeichenkette ist nicht gegen Leerstrings gesichert. Die Obergrenze 288 ist willkürlich (siehe 5.5) | Regeln neu ableiten |
| 5 | Abschnitt C | Nachkommastellen werden bei `5004` abgeschnitten, ohne Warnung (4.9) | zumindest Hinweis anzeigen |
| 6 | Format 2 | `PNR` stammt aus Zeile 2 (Index 1) statt aus Zeile 1; die Monate werden nur aus den ersten sechs Zeilen gelesen und für alle Lehrkräfte angewendet | Monate je Lehrkraft prüfen, Abweichung melden |
| 7 | Format 1 | Monate nur aus der ersten Datenzeile; Spalte „Status“ (5) wird ignoriert, „Statistik“ (6) dient als Status | als Verhalten dokumentieren, Spaltenzuordnung per Kopfzeile statt Position |
| 8 | Statusprüfung | Teilstring-Suche (`Pos('T', Status)`), Groß-/Kleinschreibung relevant; Status `v` (klein) wird nicht erkannt | Status normalisieren (Großbuchstaben) |
| 9 | Personalnummer | `CheckLBVNr` und `GibLBVNrundBV` verwenden unterschiedliche Buchstabenmengen (4.8) | einheitliche Quelle, abgestimmt auf LBV |
| 10 | Dateiname | `Nachname` ungeprüft im Dateinamen | Sonderzeichen und Leerzeichen ersetzen |
| 11 | `Mixed(Nachname)` | Wirkung nicht einsehbar (*angenommen*: „MÜLLER“ → „Müller“) | zu klären; Namen mit Zusätzen („van der“, „von“, Bindestriche) beachten |
| 12 | Einstellungen | Nur „sachlich richtig“/„Unterschrift“ werden vor dem Export nicht auf Pflicht geprüft; LBV-Ausfüllanleitung verlangt klare Unterschriftsbefugnis | als Hinweis in der Oberfläche |
| 13 | `MAParameter.pas` | nicht eingebunden (alte Untis-/SD-Datei-Logik) | ignorieren |

## 8. Abbildung auf das neue Projekt

| Delphi | Neu |
|---|---|
| `GibLBVNrundBV`, `GibVZTZ`, `GibLAA`, Bereich | `rules/zuordnung.ts` |
| Prüfziffer / `CheckLBVNr` / PDF-Skript | `rules/personalnummer.ts` |
| `MAKorrigieren`, Zellenvalidierung `M.` | `rules/merkmal.ts` |
| `GibErrCode` und Unterfunktionen | `rules/pruefung.ts` (liefert eine **Liste** aller Fehler je Zeile; die Oberfläche zeigt den ersten und im Tooltip alle) |
| `Kollegendaten2MADaten`, `GetCStunden`, `GetLAAStunden`, `MonatReConvert` | `rules/formular.ts` |
| `IstAbrechnungsDatei`, `LadeAbrechnungsDatei` | `services/csvImport.ts` (Formate, Kodierung, Trennzeichen) |
| `SpeicherKolMALBVDatenInPDFDatei`, `InitDruckausgabe` | `services/pdfExport.ts` |
| `Action_SchILDImport`, `GetSchILDDicLehrer` | `services/svwsService.ts` (Lehrkräfte aus SVWS) |
| `ReadUserInidaten`, `WriteUserInidaten` | `stores/einstellungen.ts` |
| `EncryptFileAES`, `LadeMehrarbeitsDatei`, Speichern | `services/dateiVerschluesselung.ts` |
| `WaehleAbrechnungszeitraum` | Dialog „Startmonat“ |
| `asgMA` | `components/abrechnung/MehrarbeitTabelle.vue` (AG Grid) |

## 9. Entscheidungen für die Umsetzung

1. **Regeln aus beiden Quellen vereinen:** Gilt eine Regel in Delphi und im PDF-Skript, wird sie übernommen. Weichen beide ab (Tabelle 5.5), gilt **die strengere** Regel, solange das LBV nicht etwas anderes bestätigt. Begründung: Das Formular ist das, was das LBV verarbeitet; die Skripte bilden dessen Eingangsprüfung ab.
2. **Alle Fehler je Zeile sammeln** statt nur den ersten (Verbesserung gegenüber Delphi). Die Reihenfolge der Prüfungen bleibt für die Anzeige des ersten Fehlers erhalten.
3. **Rundung, Merkmalsautomatik und Export** arbeiten auf denselben, bereits gerundeten Stunden (Auffälligkeit 2).
4. **Beide Formulare** (Lehrkräfte, LAA) werden unterstützt; die Abschlagszeilen (Kennzahl 2989/2E) **nicht**, wie im alten Programm.
5. **Druckfassung:** Das erzeugte PDF enthält wie beim Direktdruck von MA2 den Barcode (Formularkennung + Personalnummer) und ausgeblendete Rahmen. Der Browser führt das Skript des PDF nicht aus; ohne diese Befüllung wäre der Ausdruck für das LBV nicht maschinenlesbar. Prüfung mit einem echten Ausdruck steht aus (Offene Frage 7).
6. **Testdaten:** Die vier Beispiel-Lehrkräfte der Dateien `Test_Abrechnung_*.txt` dienen als Golden-File-Tests; erwartet werden u. a. für Feynman (`B 2009012`, Statistik `LT`, Schlüssel 2) im Oktober 2016 `FeldA_Input1.1 = "1016 003 2"` mit `FeldA_Input1.2 = "A"` (Untis-Wert `300000` → 3 Stunden) sowie die Prüfziffer-Fehlermeldung für die Nummer `B 0312221` aus dem Alternativformat. Die erwarteten Werte sind vor dem Einchecken gegen eine mit MA2 erzeugte Referenz-PDF zu bestätigen.

## 10. Was nicht übernommen wird

SchILD-Datenbankzugriff (MDB, UDL, SchILDzentral, `schildintern.mdb`), MA2-Benutzerverwaltung und Passwörter, Splash-Screen, Programm-Update per FTP, Fernwartungstool (`FW.exe`), Office-Design-Auswahl, Windows-Hilfe (CHM), Druckerauswahl, Fensterpositionen, Farbwahl für Merkmale, `.maa`-Dateiformat, das alte Förderprogramm „Nachholen und Ankommen nach Corona“ (laut Anleitung seit Version 3.2 entfernt), Untis-GPU004-/`.SD`-Import (`MAParameter`), Installer (Inno Setup).

## Konsequenzen

**Positiv**
- Die Fachlogik ist vollständig beschrieben und in testbare Einheiten zerlegt.
- Unterschiede zwischen Programm und Formular sind sichtbar und werden bewusst entschieden, statt unbemerkt übernommen zu werden.
- Beispieldaten und Prüfziffer-Rechnungen liefern sofort Testfälle.

**Negativ / Risiken**
- Die Regeln der Vorlagen sind aus eingebettetem JavaScript abgeleitet. Das LBV kann weitere, nicht sichtbare Prüfungen anwenden.
- Die Verhaltensannahmen zu den nicht vorliegenden Shared-Units (4.3, `Mixed`, `RealVal`) können in Randfällen abweichen.
- Die Vorlagen stammen von 2015/2019. Die aktuelle Formularversion, Kennzahlen und Vergütungsschlüssel (die LAA-Vorlage nennt 1–8) sind beim LBV zu bestätigen.
- Wird die Druckfassung als Standard erzeugt (Entscheidung 5), ist das PDF für die Bearbeitung am Bildschirm weniger komfortabel (ausgeblendete Rahmen).

## Offene Fragen

| # | Frage | Wer |
|---|---|---|
| 1 | Aktuelle Ausfüllanleitung der Änderungsmitteilung und aktuelle Formularversion (LBV(A/Bes)23_2019_02 noch gültig?) beschaffen. Die im Projekt liegende „Ausfüllhilfe“ ist eine andere Anleitung | Fachlich / LBV |
| 2 | Liefert der SVWS-Server LBV-Nummer, Vergütungsschlüssel, Rechtsverhältnis, Beschäftigungsart? Endpunkte prüfen (ADR 001, Offene Frage 1) | Entwicklung |
| 3 | Stunden in Abschnitt A: Bankers Rounding wie Delphi oder kaufmännisch runden? Erwartung: Das LBV erwartet ganze Stunden, die Rundung sollte dokumentiert sein | Fachlich |
| 4 | Welche Anfangsbuchstaben der Personalnummer sind gültig? Vorschlag: Die Menge des jeweiligen Formulars (4.8) und beide Prüfziffer-Verfahren zulassen | Fachlich / LBV |
| 5 | Gilt eine Obergrenze für Stunden je Monat in Abschnitt A (Delphi: 288, Kommentar im PDF: 24)? | Fachlich / LBV |
| 6 | Ist Merkmal `V` bei Stunden ≥ 4 zulässig (Delphi ja, PDF nein)? Vorschlag: nein | Fachlich / LBV |
| 7 | Soll das PDF standardmäßig als Druckfassung (Barcode, ausgeblendete Rahmen) erzeugt werden, und liest das LBV den Barcode im Format `ABes23/201902/<Nr>` weiterhin? | Fachlich / LBV |
| 8 | Darf die LBV-Vorlage im öffentlichen Repository verteilt werden (ADR 001, Offene Frage 2)? | Projektleitung |
| 9 | Unterstützt das neue Tool Abschlagszeilen (Kennzahl 2989 / 2E)? Im alten Programm nicht vorhanden, daher vorerst Nein | Fachlich |
| 10 | Sollen Namen wie im alten Programm in „gemischter Schreibweise“ ausgegeben werden? Regeln von `Mixed` klären | Fachlich |

## Nächste Schritte

1. Projektgerüst nach ADR 001 anlegen (Struktur, `package.json`, Vite-Konfiguration, Electron, Skripte, `style.css`, Footer).
2. `rules/` mit Tests umsetzen: Personalnummer, Zuordnung, Merkmal, Prüfung, Formularwerte (mit den Beispieldaten und den Prüfziffer-Fällen aus 4.8).
3. CSV-Import (beide Formate, Windows-1252, Trennzeichen) und PDF-Export (`pdf-lib`, Feldwerte über Golden-File-Test).
4. SVWS-Anbindung für Lehrkräfte nach Klärung von Offene Frage 2.
5. Oberfläche nach ADR 002, danach Handbuch (`docs/`) und Aufnahme in SVWS-Tools.
6. Fachabnahme der Abweichungen aus 5.5 und 7 mit einer Ansprechperson (SVWS-Projekt / LBV) vor dem ersten Release.
