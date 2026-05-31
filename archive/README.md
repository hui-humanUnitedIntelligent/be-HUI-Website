# Archive

Dateien in diesem Ordner sind archiviert und werden nicht mehr aktiv genutzt.

## Inhalt

| Datei | Beschreibung | Archiviert am |
|-------|-------------|---------------|
| `es.js` | Spanische Übersetzungen (nicht mehr genutzt, DE/EN only) | 2026-05-31 |
| `fr.js` | Französische Übersetzungen (nicht mehr genutzt, DE/EN only) | 2026-05-31 |

## Sprachsystem (aktuell)

Das aktive Sprachsystem verwendet ausschließlich **Deutsch (DE)** und **Englisch (EN)**.

- **`lang/en.js`** — vollständige EN-Übersetzungen (268 Keys)
- **`lang/switcher.js`** — Sprachumschalter (DE/EN, instant, kein Reload)
- **`data-t-key`** Attribute in allen HTML-Seiten

## Reaktivierung archivierter Sprachen

Falls FR/ES wieder benötigt werden:
1. `archive/fr.js` oder `archive/es.js` in `lang/` kopieren
2. In `lang/switcher.js` die LANGS-Map um `fr`/`es` erweitern
3. In allen HTML-Seiten den lang-dropdown um die neuen Optionen ergänzen
