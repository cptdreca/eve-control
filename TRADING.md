# Trading und Jita-Marktcheck

- Trading für den ausgewählten verbundenen Charakter: persönliche Marktverkäufe, Einkäufe und Netto-Handelsfluss für heute und den aktuellen UTC-Monat.
- Vollständiger Abruf der verfügbaren ESI-Transaktionsseiten mit from_id, Deduplizierung und Fehlern statt stillen Teilsummen. Keine dauerhafte Handelshistorie; ältere Monatsbuchungen können fehlen.
- Handelsfluss ist kein Gewinn: Gebühren, Steuern und Lagerbestandsbewertung sind nicht enthalten. Keine Gutschrift auf Ratting-Ziele.
- Marktcheck über vollständige englische Artikelnamen oder Type-ID, mit Kauf-/Verkaufspreis, Preisspanne und offenen Mengen an Jita 4-4 (Station 60003760). Andere Standorte werden ausgeschlossen. PLEX verweist auf den globalen Preisticker.
- Erneuter Abruf über die jeweiligen Aktualisieren-/Prüfen-Schaltflächen; ESI-Caches können neue Daten verzögern.

Dateien: app/TradingMarket.tsx, app/lib/trading.ts, app/api/trading/route.ts, app/api/market-check/route.ts, app/page.tsx, public/service-worker.js, scripts/trading.test.mjs.

Prüfung: sechs automatisierte Tests, TypeScript, Produktionsbuild; echter öffentlicher Jita-Abruf für Tritanium; nicht angemeldeter Trading-Abruf liefert 401. Persönliche Handelsbuchungen wurden nicht live eingesehen.

ESI-Paginierung: https://developers.eveonline.com/docs/services/esi/pagination/from-id/