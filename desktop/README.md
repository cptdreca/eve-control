# EVE-Control für Windows

Die Windows-App öffnet die bestehende EVE-Control-Onlineanwendung in einem eigenen Fenster. Internet wird benötigt. Website-Updates werden beim erneuten Laden sichtbar. Updates der Desktop-Hülle werden über neue Installer bereitgestellt.

## Installation

1. Unter [Releases](https://github.com/cptdreca/eve-control/releases) den aktuellen `EVE-Control-Setup-…-x64.exe` herunterladen.
2. Installer öffnen und Installationsordner auswählen. Installation erfolgt für den aktuellen Benutzer ohne Administratorrechte.
3. EVE-Control über Startmenü oder Desktop öffnen und die EVE-Charaktere verbinden.

Der Installer ist derzeit nicht digital signiert; Windows kann einen unbekannten Herausgeber anzeigen. SHA256SUMS.txt enthält die Prüfsumme der Veröffentlichung. Unterstützt wird Windows 10/11 x64. Keine EVE-Zugangsdaten oder Nutzerdaten werden mitgeliefert.

Die Anmeldung wird separat vom normalen Browser gespeichert. Bereits serverseitig gespeicherte ISK-Ziele sind nach Verbindung desselben Speicher-Charakters verfügbar. Über Windows „Installierte Apps“ lässt sich EVE-Control deinstallieren. Lokale Anmeldedaten bleiben dabei erhalten; zum Abmelden vorher die Charaktere in der App entfernen.

## Entwicklung

In diesem Ordner `npm ci`, `npm test` und `npm run dist` ausführen. `npm start` startet die Desktop-App. Ausgabe: `dist/`. Der Windows-Workflow baut den Installer und veröffentlicht ihn als GitHub Release.

Remote-Inhalte laufen ohne Node-Zugriff, mit einer einzelnen IPC-Funktion zum Öffnen des Intel-Fensters (nur vertrauenswürdiger Hauptframe), mit Sandbox und Kontextisolation. Navigation ist auf EVE-Control und EVE SSO begrenzt. Andere HTTPS-Links öffnen im Standardbrowser. Das separate, ausschließlich lokale Intel-Fenster verwendet eine begrenzte IPC-Schnittstelle mit Prüfung des sendenden Fensters und Hauptframes. Die Online-Seite erhält keinen Dateizugriff.

## Intel-Alarm ab Version 1.1.0

Öffnen ab Version 1.3.0: **INTEL-ALARM** auf der Hauptseite übernimmt den dort ausgewählten Charakter. Alternativ Menü **EVE-Control → Intel-Alarm** oder **Strg+I**. Im Browser zeigt der Button einen Hinweis mit Download-Link.

1. In EVE das Speichern von Chatlogs aktivieren und den Intel-Kanal öffnen.
2. Beim Öffnen über die Hauptseite sucht die App automatisch unter Dokumente/EVE/logs/Chatlogs, den bekannten OneDrive-Dokumentordnern und im zuvor gewählten Ordner. Nur in den letzten 24 Stunden geänderte Logs mit passendem Listener-Header werden angeboten. Ein eindeutig erkannter Intel-Kanal wird übernommen; bei mehreren Treffern den Kanal auswählen. Weitere Kanäle sind manuell möglich. Ein abweichender Speicherort lässt sich weiterhin über „Chatlog-Ordner wählen“ einstellen.
3. Den exakten Intel-Kanalnamen, deinen vollständigen Charakter-Namen eintragen. Diesen Charakter zuvor im Desktop-Dashboard mit EVE verbinden. **Standort automatisch über ESI** ist standardmäßig aktiv.
4. Optional vollständige Freundesnamen eintragen, ein Name pro Zeile. Diese lokale Liste wird nicht aus EVE-Kontakten importiert.
5. „Ton & Windows-Hinweis testen“ und „Speichern & Alarm starten“ wählen.

Unterstütztes Format: **`WMH-SO Erwin Thorax`** = System, Pilot, Schiff. Mehrteilige Pilotennamen und bekannte mehrteilige Schiffsnamen sind möglich. Explizite `Pilot: Name`-Angaben, Namen in Anführungszeichen und Charakterlinks werden ebenfalls erkannt. System- und Schiffsnamen werden mit einem lokalen öffentlichen ESI-Katalog abgeglichen (Stand 08.10.2026). Abkürzungen und mehrdeutige Meldungen können nicht zuverlässig ausgewertet werden. Nicht aufgelöste Piloten werden als unbestätigte Meldungen gewarnt; Meldungen ohne eindeutiges System erzeugen einen sichtbaren Hinweis statt einer erfundenen Entfernung.

Alarm bei **0 bis 5 Sternentorsprüngen**, kürzeste Route. Eigener Charakter, eigene Allianz und lokale Freundesliste sind ausgenommen. Keine Bewertung von Corp-/Allianz-Standings. Unbekannte Zugehörigkeit wird nicht als freundlich behandelt. Gleiches Pilot/System-Paar wird höchstens alle zwei Minuten gemeldet. Nur neue Meldungen, maximal fünf Minuten alt; kein Alarm auf vorhandene Historie beim Einschalten. Logrotation und UTF-16/UTF-8 werden unterstützt. Bei Lastspitzen oder API-Ausfällen wird eine Warnung angezeigt; der Alarm ist keine garantierte Live-Erkennung.

Ab Version 1.2.0 wird der Standort des eingetragenen Charakters alle 30 Sekunden über die bestehende Desktop-Anmeldung und den geschützten Website-Endpunkt `/api/intel-location` von ESI gelesen. Standortberechtigung: `esi-location.read_location.v1` (bereits in der Anmeldung enthalten). Bei fehlender Anmeldung/Berechtigung, Netzfehlern oder einem über 60 Sekunden alten Abruf werden Entfernungswarnungen pausiert; der nächste erfolgreiche Abruf setzt sie fort. Während der Pause eingegangene Meldungen werden nicht nachträglich alarmiert. ESI kann zwischengespeicherte Daten liefern, dies ist keine Echtzeiterkennung.

Optional lässt sich ESI abschalten und ein manuelles Startsystem eingeben. In diesem Modus werden Systemwechsel aus `Local`-/`Lokal`-Logs des eingetragenen Charakters übernommen, wenn dort eine EVE-Systemmeldung zum Kanalwechsel vorhanden ist. Beim Start gilt das manuell eingetragene System. Kontrolliere die Standortanzeige, besonders bei fehlenden Logs, Wurmlöchern oder Sprungbrücken. Bei geschlossenem Programm oder ausgeschaltetem Computer läuft kein Alarm. Windows-Fokusmodus kann Benachrichtigungen unterdrücken.

### Killboard

Bei einem erkannten Piloten „Killboard: häufige Schiffe prüfen“ wählen. Angezeigt werden die häufigsten Schiffe des Piloten als Angreifer oder Opfer in höchstens 200 jüngsten Killmails innerhalb von 90 Tagen, ohne Kapseln und ohne doppelte Killmails. Stichprobengröße und fehlende Daten bleiben sichtbar. zKillboard hält Meldungen mindestens fünf Minuten zurück; Ergebnisse werden eine Stunde zwischengespeichert. Das sind historische Beobachtungen, **kein Nachweis des derzeit geflogenen Schiffes**.

### Daten

Chattexte und Logdateien werden nicht hochgeladen. Erkannt werden Namen zuerst lokal; nur erkannte Pilotennamen/-IDs sowie eingegebene eigene und Freundesnamen werden über EVE ESI aufgelöst bzw. abgeglichen. System-IDs dienen der ESI-Routenabfrage. Der manuelle Killboard-Check sendet die Piloten-ID an zKillboard und ruft gegebenenfalls Killmail-/Schiffsdaten von ESI ab. Einstellungen liegen lokal im Benutzerprofil (`intel-settings.json`), die letzten 100 Meldungen nur im Arbeitsspeicher. Die öffentlichen Intel-Abfragen benötigen keine EVE-Tokens. Der automatische eigene Standort nutzt die bestehende Anmeldung im Desktop-Dashboard; Tokens bleiben serverseitig, das lokale Intel-Fenster erhält nur das System. Es wird kein neuer Token in Intel-Einstellungen gespeichert.

Die Erkennung prüft Kanalnamen und eine begrenzte lokale Stichprobe auf das unterstützte Intel-Format. Sie kann unbekannte Formate nicht sicher erkennen. Chattexte bleiben lokal; die Hauptseite erhält weder Dateipfade noch Chat-Inhalte. Auch beim laufenden Alarm werden Logs anderer Charaktere ausgeschlossen.

Tests: `npm test` prüft unter anderem Intel-Format, UTF-16-Teilzeilen, Logrotation, 5-/6-Sprung-Grenze, Freundesfilter, Duplikate und Killmail-Schiffsauswertung. Öffentliche Kataloge lassen sich mit `node update-catalog.cjs` aktualisieren.

Quellen: [EVE ESI](https://esi.evetech.net/meta/openapi.json), [zKillboard API](https://zkillboard.com/api/docs/).

### Charakter- und Kanal-Dropdowns ab 1.4.0

Das Intel-Fenster lädt die im Desktop-Dashboard verbundenen Charaktere. Bei einem Charakterwechsel sucht es dessen aktuelle lokale Chatlogs. Im Dropdown „Verfügbare Kanäle auswählen“ können mehrere Kanäle aus demselben Ordner markiert und gemeinsam übernommen werden. „Speichern & Alarm starten“ speichert die Auswahl. Kanalnamen werden aus den lokalen Logs ermittelt; ESI stellt keine Chatkanalliste bereit. Bei fehlender Anmeldung oder nicht erreichbarer Charakterliste erscheint ein Hinweis.

### Korrektur 1.4.1
Die Kanalsuche prüft alle Logdateien, auch bei großen Archiven. Aktive Logs werden alle zwei Sekunden gelesen; neu angelegte oder wieder aktive Dateien werden spätestens beim nächsten Verzeichnisscan nach 30 Sekunden aufgenommen. Die Dateisuche begrenzt nicht mehr vor dem Charakter-/Kanalabgleich auf alphabetisch erste Dateien.
