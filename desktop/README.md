# EVE-Control für Windows

Die Windows-App öffnet die bestehende EVE-Control-Onlineanwendung in einem eigenen Fenster. Internet wird benötigt. Website-Updates werden beim erneuten Laden sichtbar. Updates der Desktop-Hülle werden über neue Installer bereitgestellt.

## Installation

1. Unter [Releases](https://github.com/cptdreca/eve-control/releases) die Datei `EVE-Control-Setup-1.0.0-x64.exe` herunterladen.
2. Installer öffnen und Installationsordner auswählen. Installation erfolgt für den aktuellen Benutzer ohne Administratorrechte.
3. EVE-Control über Startmenü oder Desktop öffnen und die EVE-Charaktere verbinden.

Der Installer ist derzeit nicht digital signiert; Windows kann einen unbekannten Herausgeber anzeigen. SHA256SUMS.txt enthält die Prüfsumme der Veröffentlichung. Unterstützt wird Windows 10/11 x64. Keine EVE-Zugangsdaten oder Nutzerdaten werden mitgeliefert.

Die Anmeldung wird separat vom normalen Browser gespeichert. Bereits serverseitig gespeicherte ISK-Ziele sind nach Verbindung desselben Speicher-Charakters verfügbar. Über Windows „Installierte Apps“ lässt sich EVE-Control deinstallieren. Lokale Anmeldedaten bleiben dabei erhalten; zum Abmelden vorher die Charaktere in der App entfernen.

## Entwicklung

In diesem Ordner `npm ci`, `npm test` und `npm run dist` ausführen. `npm start` startet die Desktop-App. Ausgabe: `dist/`. Der Windows-Workflow baut den Installer und veröffentlicht ihn als GitHub Release.

Remote-Inhalte laufen ohne Node-Zugriff und ohne Preload/IPC-Brücke, mit Sandbox und Kontextisolation. Navigation ist auf EVE-Control und EVE SSO begrenzt. Andere HTTPS-Links öffnen im Standardbrowser. Betriebssystemberechtigungen und Downloads innerhalb der App sind gesperrt.
