# ISK-Ziele

Der neue Bereich ist über „ISK-Ziele“ im Dashboard erreichbar. Das bestehende dunkle Design bleibt erhalten; Formulare und Kennzahlen wechseln auf kleinen Displays in eine Spalte.

## Funktionen

- Mehrere Ziele mit ISK-Betrag, Start-/Enddatum oder Tagesanzahl, Charakterauswahl oder manueller Anzahl.
- Tagesziel gesamt/pro Char, Fortschritt, Restbetrag, heutiges Soll/Ist, Tagesabweichung, kumulierte Abweichung und benötigte Einnahmen pro verbleibendem Tag.
- UTC-Kalendertage einschließlich Start- und Endtag. Sollabweichung bezieht sich auf das Ende des heutigen Tages; der heutige Tag zählt beim verbleibenden Zeitraum mit. Nach Ablauf wird bei Restbetrag „Zeitraum abgelaufen“ angezeigt.
- Manuelle Einnahmen mit Datum, Charakter und negativen Korrekturen; Einträge und Ziele lassen sich löschen, Ziele bearbeiten.
- Ziele liegen verschlüsselt in D1 beim ausgewählten Speicher-Charakter. Auf einem anderen Gerät diesen Charakter verbinden und auswählen. Eine andere Charakterauswahl öffnet dessen eigene Zielsammlung. Gleichzeitige Änderungen werden durch eine Versionsprüfung erkannt.
- Optionaler ESI-Import aller verfügbaren Journal-Seiten (maximal 100 je Char); dedupliziert pro Charakter/Journal-ID. Positive Zuflüsse zählen als Einnahmen, nicht als Nettogewinn. Transfers mit zwei verbundenen eigenen Chars als Parteien werden ausgeschlossen, auch wenn einer nicht am Ziel teilnimmt.
- Manuelle und ESI-Werte werden je Ziel alternativ verwendet, damit kein automatisches Doppelzählen entsteht. ESI-Fehler werden als Teilimport gemeldet. Ältere, bei ESI nicht mehr verfügbare Daten können fehlen; regelmäßig importieren. Nicht verbundene eigene Chars sind nicht als eigene Transferpartner erkennbar.

## Angepasste und ergänzte Dateien

- `app/page.tsx`: Dashboard-Navigation und Integration.
- `app/IskGoals.tsx`: Zielverwaltung, Tagesbuch, Import und Kennzahlen.
- `app/isk-goals.css`, `app/layout.tsx`: responsive Gestaltung und Einbindung.
- `app/lib/isk-goals.ts`: Datenmodell, Validierung, UTC-Berechnung und Transferfilter.
- `app/api/isk-goals/route.ts`: authentifiziertes Laden/Speichern, Konflikterkennung, ESI-Import.
- `app/lib/goal-store.ts`: D1-Zugriff.
- `db/schema.ts`, `drizzle/0001_huge_nightmare.sql`, `drizzle/meta/0001_snapshot.json`, `drizzle/meta/_journal.json`: neue Zieltabelle; bestehende Sessiontabelle unverändert.
- `public/service-worker.js`: neue Cache-Version; API-Daten bleiben vom Cache ausgeschlossen.
- `scripts/isk-goals.test.mjs`: Berechnungs-, Datums-, Validierungs- und Transferprüfungen.

## Prüfung

Produktionsbuild, TypeScript-Prüfung und gezielte ESLint-Prüfung erfolgreich. Acht automatisierte Tests prüfen Beispiel 70 Milliarden/30 Tage/7 Chars, Korrekturen, Ablauf, Übererfüllung, Quell-/Charaktertrennung, Transferfilter/Deduplizierung, Sommerzeit/Schaltjahr und ungültige Eingaben. Nicht angemeldeter API-Zugriff liefert 401. Die erzeugte Migration enthält ausschließlich die neue Tabelle und wurde geprüft.

Ein vollständiger Import mit echten angemeldeten EVE-Charakteren und die Speicherung in der Produktionsdatenbank wurden noch nicht ausgeführt. Die Erweiterung ist vor der öffentlichen Freigabe als neue Projektversion gespeichert; die Migration wird bei der Veröffentlichung angewendet.
