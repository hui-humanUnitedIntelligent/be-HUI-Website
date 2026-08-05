# Sprint 2 — Production Deploy & Audit Report

**Datum:** 2026-08-05  
**Status:** Teilweise abgeschlossen — Migration und Vercel-Deploy blockiert durch fehlende Credentials

---

## Durchgeführte Schritte

| Schritt | Status | Detail |
|---------|--------|--------|
| Sprint-2-Build auf `be-HUI-Website` main | ✅ | Commit `456a455` — `web-cZ1mjW3L.js`, `UnifiedFeed-DdI6OmIo.js` |
| Migration-Workflow angelegt | ✅ | `.github/workflows/run-migration-083.yml` |
| Migration SQL auf GitHub | ✅ | `scripts/rpc_home_feed_083.sql` |
| GitHub Actions Migration ausgeführt | ❌ | Run `31049162588` — `SUPABASE_ACCESS_TOKEN` leer |
| Vercel Production aktualisiert | ❌ | `be-hui.vercel.app` liefert noch `web-CIqMBm-c.js` |
| RPC auf Supabase aktiv | ❌ | `rpc_home_feed` / `rpc_feed_card_meta` → `PGRST202` |
| Production-Audit (aktueller Stand) | ✅ | `audit-prod-sprint2-before.json` |

---

## Blocker

### 1. Supabase Migration

Workflow-Log (`be-HUI-Website` Run 31049162588):

```
SUPABASE_ACCESS_TOKEN: (leer)
Access token not provided.
```

**Lösung A (empfohlen):** `SUPABASE_ACCESS_TOKEN` als Repository-Secret auf `be-HUI-Website` hinterlegen (gleicher Token wie auf `be-hui`), dann Workflow erneut starten:

```
GitHub → be-HUI-Website → Actions → Run Migration 083 — Feed RPC → Run workflow
```

**Lösung B:** SQL manuell im Supabase SQL Editor ausführen:

https://supabase.com/dashboard/project/gxztrhvhcxhmunhhkfjd/sql/new

Datei: `scripts/rpc_home_feed_083.sql` (auf `be-HUI-Website` main)

Danach: `NOTIFY pgrst, 'reload schema';`

### 2. Vercel Deploy

GitHub `main` enthält Sprint-2-Bundle (`web-cZ1mjW3L.js`), aber Production:

| Quelle | `web.html` Entry |
|--------|------------------|
| GitHub `be-HUI-Website` main | `web-cZ1mjW3L.js` ✅ |
| `https://be-hui.vercel.app/web.html` | `web-CIqMBm-c.js` ❌ |

Vercel-Projekt ist nicht mit dem aktuellen GitHub-Push synchron oder deployt aus anderem Repo.

**Lösung:** Vercel Dashboard → Projekt `be-hui` → Deployments → Redeploy von `be-HUI-Website` main, oder `VERCEL_TOKEN` bereitstellen für CLI-Deploy aus `/workspace`.

---

## Vorher / Nachher (Production — aktueller Stand)

| Metrik | Prod Baseline (Sprint 0) | Prod jetzt (pre-Migration) | Ziel nach Deploy+Migration |
|--------|--------------------------|----------------------------|----------------------------|
| Bundle Entry | `web-CIqMBm-c.js` | `web-CIqMBm-c.js` | `web-cZ1mjW3L.js` |
| UnifiedFeed Chunk | `UnifiedFeed-wzgwKj8_.js` | `UnifiedFeed-wzgwKj8_.js` | `UnifiedFeed-DdI6OmIo.js` |
| `rpc_home_feed` | — | nicht vorhanden | 2× (critical+secondary) |
| `rpc_feed_card_meta` | — | nicht vorhanden | 1× |
| Feed `works` REST | 3× | 3× | 0× (Hero aus Feed) |
| REST+RPC bis Feed sichtbar | 36 | ~36 | ~8–12 |

---

## Nachweis-Checkliste (nach Migration + Deploy)

- [ ] `rpc_home_feed` in Network-Tab (2 Calls: `critical`, `secondary`)
- [ ] `rpc_feed_card_meta` in Network-Tab (1 Call nach Feed-DOM)
- [ ] Keine `works`/`beitraege`/`experiences` Feed-REST im kritischen Pfad
- [ ] Kein Hero-`works limit=6` Query
- [ ] Keine Legacy `post_reactions` + `post_comments` + `momente_reports` Batches parallel

**Audit-Befehl nach Deploy:**

```bash
AUDIT_URL=https://be-hui.vercel.app \
AUDIT_OUT=scripts/audit-prod-sprint2-after.json \
node scripts/perf-audit-full.mjs
```

---

## Offene Aktionen (einmalig)

1. `SUPABASE_ACCESS_TOKEN` → Secret auf `be-HUI-Website` → Workflow re-run
2. Vercel Redeploy von `be-HUI-Website` main
3. Production-Audit erneut ausführen
4. Diesen Bericht mit After-Metriken ergänzen
