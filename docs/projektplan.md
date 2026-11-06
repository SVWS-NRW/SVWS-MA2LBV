Wir wollen ein neues SVWS-Tool erstellen.
Das Tool soll das alte Delphi-Progeramm MA2LBV ablösen.

Das Tool ist ein Hilfsprogramm mit dem Lehrkräfte, die einne Zugang zur SVWS-Datenbank haben die Mehrarbeitsabrechung für die Kollegen mit dem LBV machen können. In dem Programm ist auch eine PDF-Vorlage enthalten, die eine gewisse Logik vom LBV enthält. Das muss genau untersucht werden.

Eine Bedienunganleitung lieegt hier:
https://www.svws.nrw.de/system/files/media/document/file/ma2lbv_anleitung.pdf

Es soll exakt so aufgebaut sein, wie die anderen SVWS-Tools und soll später in der SVWS-Tools-Sammlung mit ausgeliefert werden.


Das svws-tools.zip wird hier erstellt:
/home/pfotenhauer/git/SVWS-Tools


Folgende Tools gibt es schon:
/home/pfotenhauer/git/SVWS-Import
/home/pfotenhauer/git/SVWS-Prognos
/home/pfotenhauer/git/SVWS-Conference
/home/pfotenhauer/git/SVWS-GradeHub


Analysiere alle Projekte und erstelle ein neues Projekt mit der gleichen Struktur.
Erstelle ein neues Projekt mit dem Namen SVWS-MA2LBV und erstelle alle benötigten Dateien und Ordner mit der gleichen Struktur wie bei den anderen Projekten. Wichtig ist auch, dass die Oberfläche exakt mit dem Design der anderen Tools überein stimmt.

Der alte Delphi-Code ist hier:
/home/pfotenhauer/ownCloud2/Delphi-Module/SP_FP/MA2

Erstelle zunächst einen adr001.md mit den grundsätzlichen Entscheidungen für die Archtektur.
Erstelle dann einen adr002.md mit den grundsätzlichen Entscheidungen für die Oberfläche.
Erstelle dann einen adr003.md mit der Analyse des Delphi Codes.