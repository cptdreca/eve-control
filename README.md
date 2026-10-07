# EVE-Control

Dashboard für EVE Online mit Charakterübersicht, ISK-Zielen und Ratting-Tracker.

## Funktionen

- Anmeldung über EVE SSO und Datenabruf über ESI.
- Kopfgelder und ESS-Auszahlungen gemeinsam im ISK-Ziel und monatlichen Ratting-Tracker; Player Donations werden nicht als Ratting-Einnahmen gezählt.
- Automatische Aktualisierung alle fünf Minuten bei geöffneter Ansicht.
- PLEX-Preisticker und mobile PWA-Oberfläche.

## Entwicklung

Node.js ab 22.13.0 verwenden. Abhängigkeiten mit `npm ci` installieren und die Entwicklung mit `npm run dev` starten. `npm run build` erstellt den Build; `npm run lint` prüft den Code.

Die Anwendung nutzt React, Vinext, Cloudflare Workers und D1. Die vorhandene Hosting-Konfiguration gehört zur bestehenden Sites-Bereitstellung. Für eine eigene Bereitstellung sind ein eigenes Hosting-Projekt, eine D1-Datenbank mit den Migrationen aus `drizzle/` und eine EVE-SSO-Anwendung mit passender Callback-URL erforderlich. GitHub Pages allein unterstützt dieses Backend nicht.

`EVE_CLIENT_ID` und ein zufälliges, dauerhaftes `SESSION_SECRET` müssen in der Laufzeitumgebung eingerichtet werden. Geheimnisse gehören nicht ins Repository. Datenbankinhalte, Sitzungstokens und lokale Umgebungsdateien sind nicht Bestandteil dieser Veröffentlichung.

Weitere Hinweise: [ESI-EINNAHMEN.md](ESI-EINNAHMEN.md) und [ISK-ZIELE.md](ISK-ZIELE.md).
