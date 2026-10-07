# ESI-Einnahmen – Änderung vom 09.09.2026

Im bestehenden EVE-Control-Projekt umgesetzt:

- `app/IskGoals.tsx`: Button auch ohne vorheriges ESI-Ziel bedienbar; öffnet die Zielauswahl mit verbundenen Charakteren. Vorhandene ESI-Ziele importieren direkt. Tagesrest, Einnahmen je Charakter und konkrete Fehler mit Link zur erneuten EVE-Anmeldung ergänzt.
- `app/api/isk-goals/route.ts`: Import pro Zielcharakter, sichere Zusammenführung ohne Doppelzählung, Fehler je Charakter und vollständige Journalübernahme pro Charakter. Erfolgreiche Chars werden bei Teilfehlern gespeichert.
- `app/lib/wallet-journal.ts`: Journalabruf mit Seitennavigation, Zeitlimit sowie Meldungen für fehlende Anmeldung, Wallet-Berechtigung, Abfragelimit und ESI-Ausfälle.
- `app/lib/isk-goals.ts`: Tagesrest berechnen; bekannte Kapitalrückflüsse/Erstattungen ausschließen; Parteiinformationen speichern, damit später verbundene eigene Transferpartner erkannt werden.
- `public/service-worker.js`: Cache-Version aktualisiert. Bestehende responsive Gestaltung und PWA bleiben erhalten.
- `scripts/wallet-journal.test.mjs`: 11 zusätzliche Tests; zusammen mit den bestehenden Tests 19 erfolgreich.

Prüfung: Produktionsbuild, TypeScript und gezielte ESLint-Prüfung erfolgreich. Live-Import mit echten Charakteren noch nicht durchgeführt.

Grenzen: Es werden positive Einnahmen, keine Nettogewinne berechnet. Nicht verbundene eigene Charaktere sind nicht automatisch erkennbar. Historische Einträge ohne Parteiinformation werden beim erneuten Abruf neu bewertet, soweit sie noch im ESI-Journal verfügbar sind. ESI-Ziele berücksichtigen ihre ausgewählten Charaktere und UTC-Tage; manuelle Einträge bleiben gespeichert, zählen aber im ESI-Modus nicht mit.

Technische Referenz für Buchungsarten: https://github.com/ccpgames/eve-glue/blob/master/eve_glue/wallet_journal_ref.py

Öffentliche Bereitstellung steht noch aus.

## Korrektur Kopfgeld

Der Transferfilter setzt jetzt zwei unterschiedliche eigene Charaktere voraus. Eine Buchung mit derselben Charakter-ID auf beiden Seiten wird nicht mehr allein deshalb ausgeschlossen. Ein Regressionstest für heutiges Kopfgeld stellt den bisherigen Fehler nach und besteht nach der Korrektur; insgesamt 20 Tests erfolgreich. Die Importmeldung nennt zusätzlich den gespeicherten heutigen Betrag und die Buchungsanzahl, unabhängig von den Einschränkungen einzelner Ziele. Angepasst: app/lib/isk-goals.ts, app/api/isk-goals/route.ts, public/service-worker.js, scripts/wallet-journal.test.mjs. Die konkreten ESI-Buchungen des Nutzers wurden nicht eingesehen.

Nur Kopfgelder: ESI berücksichtigt ausschließlich positive bounty_prize/bounty_prizes. Donations, ESS und andere Arten sowie Altimporte ohne Buchungsart werden beim Laden und Speichern ausgeschlossen. Erneuter Import stellt verfügbare Kopfgelder wieder her. 21 Tests bestanden. Geändert: app/lib/isk-goals.ts, app/api/isk-goals/route.ts, app/IskGoals.tsx, public/service-worker.js, scripts/wallet-journal.test.mjs.

10.09.2026: ESS-Auszahlungen (ess_escrow_transfer) zählen zusätzlich zu Kopfgeldern. Donations bleiben ausgeschlossen. UI-Beschriftungen aktualisiert; 22 Tests einschließlich ESS-Tageswert, Fortschritt und Deduplizierung bestanden.
