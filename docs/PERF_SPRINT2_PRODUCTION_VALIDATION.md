# Sprint 2 — Produktivsetzung & Validierung

**Datum:** 2026-08-05  
**Status:** **ABGEBROCHEN bei Schritt 2** — Credentials fehlen  
**Audit-Ziel:** `https://be-hui.vercel.app/app/Home`

---

## Schritt 1 — Produktionsstatus (IST-Zustand)

Messung: Production-Audit `scripts/audit-prod-ist-20260805.json` (Puppeteer, 30 s Idle)

### Bundles (Production vs. Ziel)

| Asset | Production (IST) | GitHub `be-HUI-Website` main (Soll) | Ziel Sprint 2 |
|-------|------------------|-------------------------------------|---------------|
| Entry `web.html` | `web-CIqMBm-c.js` | `web-cZ1mjW3L.js` | `web-cZ1mjW3L.js` |
| UnifiedFeed Chunk | `UnifiedFeed-wzgwKj8_.js` | `UnifiedFeed-DdI6OmIo.js` | `UnifiedFeed-DdI6OmIo.js` |

**Sprint 2 Client ist auf GitHub main, aber nicht auf Vercel Production.**

### Supabase RPCs (Live-Test mit Auth-Session)

| RPC | Status |
|-----|--------|
| `rpc_home_feed` | **Nicht vorhanden** — `PGRST202` (Function not in schema cache) |
| `rpc_feed_card_meta` | **Nicht vorhanden** — `PGRST202` |

### Legacy-REST (Production-Audit)

| Query-Typ | Anzahl | Blockiert Feed? |
|-----------|--------|-----------------|
| `works` REST | **3** | Ja (Feed + Hero) |
| `beitraege` REST | 1 | Ja |
| `experiences` REST | 3 | Ja |
| `rpc_home_feed` | **0** | — |
| `rpc_feed_card_meta` | **0** | — |
| `post_reactions` | 2 | Nach Feed-Priorität |
| `rpc/reaction_counts` | 1 | Legacy-Batch |
| `rpc/count_comments` | 1 | Legacy |
| `momente_reports` | **5** | N+1 (pro Moment) |
| `auth/v1/user` | **5** | Im Feed-Pfad |

### Kennzahlen IST

| Metrik | Baseline (Aug 5) | IST (jetzt) |
|--------|------------------|-------------|
| Feed sichtbar | 2595 ms | 2850 ms |
| REST+RPC bis Feed | 36 | 36 |
| FCP | 240 ms | 204 ms |
| CLS | 0 | 0 |
| Long Tasks | 0 | 0 |
| Parallele Requests &lt; 500 ms | 23 | ~23 |

### Request-Waterfall (kritisch, bis Feed-DOM)

```
profiles → experiences + works + talent_bookings → impact_pool RPCs →
works (Hero limit=6) + beitraege + invitations + … →
reaction_counts + momente_reports (5×) + auth/v1/user (5×)
```

**Fazit Schritt 1:** Production entspricht dem **pre-Sprint-2** Stand. Keine RPC-Konsolidierung aktiv.

---

## Schritt 2 — Supabase Migration

**Status: BLOCKIERT**

| Prüfung | Ergebnis |
|---------|----------|
| `SUPABASE_ACCESS_TOKEN` in Agent-Umgebung | **Nicht gesetzt** |
| GitHub Actions Workflow (`be-HUI-Website` Run 31049162588) | **Fehlgeschlagen** — Token leer |
| `gh workflow run` auf `be-hui` | **403** — keine Berechtigung |
| `git push` auf `be-hui` | **403** — `cursor[bot]` |

**Erforderliche Aktion (nicht ausgeführt):**

1. Migration `20260805_083_rpc_home_feed.sql` / `scripts/rpc_home_feed_083.sql` auf Projekt `gxztrhvhcxhmunhhkfjd`
2. `NOTIFY pgrst, 'reload schema';`
3. Verifikation: `rpc_home_feed` + `rpc_feed_card_meta` in `pg_proc`

**Keine Workarounds, keine Codeänderungen.**

---

## Schritt 3 — Vercel Production

**Status: BLOCKIERT** (abhängig von Schritt 2 für sinnvolle Validierung; Deploy selbst blockiert)

| Prüfung | Ergebnis |
|---------|----------|
| `VERCEL_TOKEN` in Agent-Umgebung | **Nicht gesetzt** |
| `npx vercel deploy --prod` | **Wartet auf OAuth-Login** |
| Vercel Production Bundle | Noch `web-CIqMBm-c.js` (nicht `web-cZ1mjW3L.js`) |

**Erforderliche Aktion (nicht ausgeführt):**

Vercel Redeploy von `be-HUI-Website` `main` (Commit `456a455` / `f34f1bb`)  
oder `VERCEL_TOKEN` bereitstellen.

**Deployment nicht als erfolgreich markiert** — Ziel-Bundles fehlen auf Production.

---

## Schritt 4 — Production Audit (Nach Deploy)

**Status: NICHT DURCHGEFÜHRT** (Schritte 2+3 nicht abgeschlossen)

IST-Audit liegt vor (`audit-prod-ist-20260805.json`). After-Audit ausstehend.

---

## Schritt 5 — Nachweis (auf Basis IST — Sprint 2 nicht produktiv)

| Frage | IST (Production) | Ziel Sprint 2 |
|-------|------------------|---------------|
| ✓ `rpc_home_feed` verwendet? | **Nein** (0 Calls) | 2× (critical + secondary) |
| ✓ `rpc_feed_card_meta` verwendet? | **Nein** (0 Calls) | 1× nach Feed-DOM |
| ✓ Legacy-Feed-REST ersetzt? | **Nein** — `works` 3×, `beitraege` 1×, `experiences` 3× | RPC statt 6 REST |
| ✓ Hero-`works`-Query entfällt? | **Nein** — separate `works limit=6` | Aus Feed-Daten |
| ✓ `momente_reports` N+1 entfällt? | **Nein** — 5× | 1× Batch / RPC |
| ✓ `auth.getUser()` im Feed entfällt? | **Nein** — 5× `auth/v1/user` | 0× |
| ✓ LiveTicker nach Trigger? | **Nein** — `works` Liveticker ~gleiche Zeit wie Feed-Queries | Nach `feed-dom-visible` |
| Requests bis Feed sichtbar | **36** REST+RPC | Ziel ~8–12 |
| Critical-Path-Blocker | `works`×3, `profiles`×3, `experiences`×3, `momente_reports`×5, `auth`×5, Impact-Pool-RPCs, Chat/Notifications | RPC + deferierte Secondary |
| Weitere Optimierung sinnvoll? | **Erst nach Sprint-2-Deploy:** Migration + Vercel; dann P0 = RPC live, P1 = Secondary defer | — |

---

## Abbruch-Dokumentation

| Schritt | Status | Blocker |
|---------|--------|---------|
| 1. IST prüfen | ✅ Abgeschlossen | — |
| 2. Supabase Migration | ❌ Blockiert | `SUPABASE_ACCESS_TOKEN` fehlt |
| 3. Vercel Deploy | ❌ Blockiert | `VERCEL_TOKEN` fehlt / Vercel nicht mit GitHub sync |
| 4. Production Audit (After) | ❌ Nicht ausgeführt | Schritte 2+3 |
| 5. Nachweis Sprint 2 live | ❌ Nicht möglich | — |

### Credentials für Fortsetzung

| Secret | Zweck | Repo / Tool |
|--------|-------|-------------|
| `SUPABASE_ACCESS_TOKEN` | Migration 083 via `supabase db query --linked` | `be-HUI-Website` Actions oder lokal |
| `VERCEL_TOKEN` | Production Deploy | Vercel CLI |

Nach Bereitstellung: Schritte 2→3→4 erneut ausführen, After-Audit, Nachweis aktualisieren.

---

## Artefakte

| Datei | Inhalt |
|-------|--------|
| `be-HUI-Website/scripts/rpc_home_feed_083.sql` | Migration SQL (auf GitHub main) |
| `be-HUI-Website/.github/workflows/run-migration-083.yml` | Migration Workflow |
| `/tmp/be-hui/scripts/audit-prod-ist-20260805.json` | IST Production Audit |
| `/tmp/be-hui/scripts/audit-full-results.json` | Baseline Production Audit |
