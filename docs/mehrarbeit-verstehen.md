[← Übersicht](index.md)

# Mehrarbeit verstehen

Dieses Kapitel erklärt die fachlichen Regeln, nach denen das Programm Zeilen einordnet, prüft und in das Formular einträgt. Sie entsprechen dem bisherigen Programm MA2 und den Prüfungen in den Formularen des LBV.

> Maßgeblich bleibt immer die **Ausfüllanleitung des LBV** für Änderungsmitteilungen.

---

## Welche Lehrkraft gehört in welchen Abschnitt?

Das Formular für Lehrkräfte hat mehrere Abschnitte. Das Programm ordnet jede Lehrkraft aus **LBV-Personalnummer** und **Status** zu:

| Lehrkraft | Abschnitt | Kennzahl |
|---|---|---|
| **Vollzeit** (Beamte und Tarifbeschäftigte) | **A** Abrechnung | 2982 |
| **Beamte in Teilzeit** | **A** Abrechnung | 2982, mit Merkmal **A** |
| **Tarifbeschäftigte in Teilzeit** | **C** Abrechnung | 6145 |
| **Lehramtsanwärter** (Status W) | anderes Formular, Abschnitt **B** | 2D |

Ob jemand **beamtet** oder **tarifbeschäftigt** ist, ergibt sich aus dem ersten Buchstaben der LBV-Personalnummer (Beamte z. B. `B`, `C`, `D`, `E`; Tarifbeschäftigte z. B. `P`). Der Abschnitt **B** (Abschlag, Kennzahl 2989) des Lehrkräfte-Formulars wird nicht ausgefüllt.

---

## Die LBV-Personalnummer

Die LBV-Personalnummer besteht aus einem **Buchstaben** und Ziffern. Die **letzte Ziffer ist eine Prüfziffer**. Das Programm rechnet sie nach und meldet Tippfehler.

| Art | Aufbau | Länge | Beispiel (erfunden) |
|---|---|---|---|
| Beamte | Buchstabe + 7 Ziffern | 8 Zeichen | `B1234565` |
| Tarifbeschäftigte | Buchstabe + 9 Ziffern | 10 Zeichen | `P123456782` |

Leerzeichen sind erlaubt (`B 1234565`) und werden entfernt.

**Zulässige Anfangsbuchstaben** hängen vom Formular ab:

| Formular | 8 Zeichen | 10 Zeichen |
|---|---|---|
| Lehrkräfte | B, C, D, E | P |
| Lehramtsanwärter | A, B, C, D, E, F, G, H, J | K, L, M, N, P, Q, U |

Typische Fehler: eine `P`-Nummer hat 10 Zeichen, nicht 8 („Länge <> 10“), eine Ziffer ist falsch eingetippt („Prüfziffer falsch“) oder die Nummer stammt nicht vom LBV.

---

## Vergütungsschlüssel

Der **Vergütungsschlüssel** bestimmt den Mehrarbeitsstundensatz. Er ist eine Zahl von 1 bis 4:

| Schlüssel | Lehrämter |
|---|---|
| **1** | gehobener Dienst aller Schulformen, soweit nicht Schlüssel 2 oder 3 |
| **2** | gehobener Dienst aller Schulformen, Eingangsämter mindestens BesGr A 12, und höherer Dienst an Grund- und Hauptschulen |
| **3** | gehobener Dienst aller Schulformen, Eingangsämter BesGr A 13, und höherer Dienst an Förder- und Realschulen |
| **4** | höherer Dienst an Gesamtschulen, Gymnasien, berufsbildenden Schulen, Kollegschulen und Sekundarschulen sowie höherer Dienst an Fachhochschulen |

Im Formular für Lehramtsanwärter sind die Schlüssel **1 bis 8** zulässig (5 bis 8 für weitere Stundensätze, siehe Formular).

Den Schlüssel pflegst du im SVWS bei der Lehrkraft. Das Programm übernimmt ihn von dort.

---

## Merkmale

Das Merkmal gehört zu einem Monat in **Abschnitt A** bzw. **C**:

| Merkmal | Bedeutung | Wann |
|---|---|---|
| **V** | weniger als vier vergütungsfähige Stunden | **Vollzeit** und weniger als 4 Stunden im Monat (Pflicht) |
| **A** | anteilige Besoldung bei Teilzeitbeschäftigten | **Beamte in Teilzeit**, bei jeder Stundenzahl über 0 |
| **K** | Beteiligung an Klassenfahrten (Lohnart 5006) | **Tarifbeschäftigte in Teilzeit**, Abschnitt C |

**Die Automatik** (Einstellung „Merkmale V und A automatisch setzen“) arbeitet so, für jeden berücksichtigten Monat in Abschnitt A:

| Stunden | Vollzeit | Teilzeit |
|---|---|---|
| 0 | kein Merkmal | kein Merkmal |
| mehr als 0 und weniger als 4 | **V** | **A** |
| 4 und mehr | kein Merkmal | **A** |

Die Entscheidung beruht auf den **gerundeten** Stunden (siehe unten), also auf den Stunden, die tatsächlich im Formular stehen. **K** setzt das Programm nicht selbst, das trägst du ein.

**Prüfungen**

- Bei **weniger als 4 Stunden** ist ein Merkmal (V oder A) Pflicht.
- **V** ist nur bei **weniger als 4 Stunden** zulässig.
- In Abschnitt **C** ist nur **K** zulässig.

---

## Stunden

| Formular, Abschnitt | Format | Grenze je Monat |
|---|---|---|
| Lehrkräfte, **A** | **ganze Stunden**, dreistellig (`003`) | höchstens 288 |
| Lehrkräfte, **C** | fünfstellig mit zwei Nachkommastellen (`00250` = 2,50) | höchstens 180,00 |
| Lehramtsanwärter, **B** | **ganze Stunden**, zweistellig (`03`) | 1 bis 24 |

**Rundung in Abschnitt A:** Stunden mit Nachkommastellen werden auf ganze Stunden gerundet, und zwar wie im bisherigen Programm: bei genau `,5` auf die **nächste gerade Zahl** (`2,5` → 2, `3,5` → 4, `0,5` → 0). Trage in Abschnitt A am besten **ganze Stunden** ein.

**Abschnitt C:** Nachkommastellen sind nur bei **Lohnart 5006** (Merkmal **K**) zulässig. Bei Lohnart **5004** (ohne K) entfallen sie. Aus `2,5` wird dort `2,00`. Mehr als zwei Nachkommastellen werden abgeschnitten.

Monate **ohne Stunden** (oder mit 0) erscheinen nicht im Formular.

---

## Monate

- Ein Antrag deckt **sechs Monate** ab. Es erscheint je Monat mit Stunden eine Zeile im Formular.
- Monate dürfen **nicht in der Zukunft** liegen. Der **laufende Monat** ist erlaubt.
- Im Formular steht der Monat als `MMJJ`, zum Beispiel `0626` für Juni 2026.

---

## Das Formular für Lehramtsanwärter

Lehramtsanwärter (Status **W**) erhalten das Formular „Änderungsmitteilung – Vergütung für nebenamtlichen Unterricht (VNU) / zusätzlichen Unterricht (VZU)“. Es braucht zusätzlich die **Schulform** (Einstellungen), zum Beispiel `07` für Gesamtschulen. Je Monat steht eine Zeile mit Schulform, Monat, Stunden und Vergütungsschlüssel.

---

Weiter mit: [Importformate](importformate.md)
