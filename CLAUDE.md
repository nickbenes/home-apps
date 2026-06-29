# Home Apps — Claude Code Project Guide

_Last updated 2026-06-22 — see "Recent history" at the bottom for what changed and why._

## What this project is

A suite of personal home apps: finance, todos, food, dashboard (new), calendar (backend
exists, not yet running as a service).
Repo: `nickbenes/home-apps` · Stack: React 19 / TypeScript / Express / esbuild / SQLite
(only where a module has real state — see Dashboard below for a no-DB example).

Each app lives under `projects/<name>/` and runs on its own port. Each module's Express
server serves both its own static frontend (`public/<name>/`) and its own API
(`/<name>/api/...`), independently — no shared gateway/nginx layer currently wired up despite
older docs mentioning one; double-check before assuming nginx is proxying anything live.

## Projects

| Project    | Port | URL prefix    | Status  | State           |
|------------|------|---------------|---------|-----------------|
| `finance`  | 3001 | `/finance`    | Active  | SQLite          |
| `todos`    | 3000 | `/todos`      | Active  | SQLite (rewritten 2026-06-22, was in-memory) |
| `calendar` | 3002 | `/calendar`   | Backend exists, not a running service | — |
| `food`     | 3003 | `/food`       | Active  | SQLite          |
| `dashboard`| 3004 | `/dashboard`  | Active (new 2026-06-22) | None — reads other modules' state live, no DB of its own |

Active projects have a systemd user service (`~/.config/systemd/user/<name>.service`), enabled
and running via `systemctl --user`. Service unit files are **not** version-controlled in this
repo — they're created directly in `~/.config/systemd/user/` (one per module, modeled on
`todos.service`/`dashboard.service`). The wrapper scripts they call (`npm run build` +
`npm run <name>:dev`) **are** in `scripts/start-<name>-server.sh`, tracked in the repo.

## Routing convention (all projects)

Each project uses a path prefix so all apps can share port 80 via nginx:

- Express serves static files at `/<name>/` and API at `/<name>/api/`
- `index.html` has `<base href="/<name>/">` so relative asset paths always resolve
- React Router uses `<BrowserRouter basename="/<name>">`
- Frontend `api.ts` sets `const BASE = '/<name>/api'`
- nginx proxies `/<name>/` → `localhost:<port>` (no prefix stripping)

## Finance project (`projects/finance/`)

### Data layout (critical — read before touching files)

```
projects/finance/data/             ← gitignored entirely
  PRIVATE-financial-csv/           ← raw CSV exports; NEVER commit
    YTD-*-transactions.csv         ← RocketMoney transaction exports
    accounts-*.csv                 ← account list snapshots
    cashflow-*-merged.csv          ← recurring transactions / budget items
  data-model-session-logs/         ← design session notes (markdown)
```

Never move financial CSVs out of `data/`. Derived artifacts (schema SQL, migration files,
ETL scripts, TypeScript types) are version-controlled.

### Data model (summary)

SQLite database via `better-sqlite3`. Eight tables:

| Table | Purpose |
|---|---|
| `accounts` | One row per creditor/account |
| `budget_categories` | Top-level groupings (Food, Auto, Debts, etc.) |
| `budget_items` | Named line items; classification targets for transactions |
| `recurring_items` | Recurring templates (income + bills); have temporal bounds |
| `scheduled_payments` | Projected future instances of recurring items |
| `transactions` | **Immutable** ground truth from bank/card feeds |
| `transaction_budget_item_mappings` | Mutable many-to-many classification layer; supports splits |
| `classification_audit_log` | Append-only history of classification changes |

Key invariant: transactions are immutable once ingested. Classifications are mutable with full audit trail.

### Finance folder structure

```
projects/finance/
  db/
    migrations/       ← SQL migration files (001_initial.sql, etc.)
  backend/            ← Express server, TypeScript types, DB access layer
  frontend/           ← React components
  test/               ← Jest unit tests + Playwright e2e
```

No nested `src/` — code lives directly in `backend/` or `frontend/`.

## Dashboard project (`projects/dashboard/`)

Built 2026-06-22 to surface live state from every other module + an external vault
(`~/gdrive/ObsidianVault`, a separate Obsidian-based personal-OS project with its own
multi-agent setup — see that vault's own `CLAUDE.md`/`INDEX.md` if you need its context).
Unlike finance/food/todos, **this module has no database** — it has no state of its own to
persist, so it just reads:
- Vault markdown files directly off the filesystem (`projects/dashboard/backend/vault.ts` —
  hardcodes `~/gdrive/ObsidianVault` as `VAULT_ROOT`, overridable via env var). This is a
  deliberate same-machine coupling, not an accident — there's no API on the vault side to call
  instead, and adding one was judged not worth the indirection for a single local reader.
- The todos REST API over HTTP (`projects/dashboard/backend/todos-client.ts`).

If you add a new tile that needs a new data source, follow this same pattern (a small reader
function in `vault.ts` or a new client file) rather than introducing a database — only add
SQLite here if the dashboard ever needs to persist something itself (e.g. dismissed-tile
state), not just to aggregate.

### Briefing module (FR-003/FR-020/FR-024, added 2026-06-29)

Briefing functionality lives **inside `dashboard`**, not as a separate module — the vault
turnover doc originally proposed a standalone module on port 3004, but dashboard already owns
3004, so the briefing routes/UI were folded in instead of reassigning a live service's port.

- `backend/anthropic.ts` — minimal Claude Messages API client (plain `fetch`, no SDK
  dependency). Always `claude-sonnet-4-6`, `max_tokens: 1000`, requires `ANTHROPIC_API_KEY`.
- `backend/briefing.ts` — `runBriefing()` assembles a system prompt from `agents/xo/manifest.md`
  + `finances/INDEX.md` (there's no `agents/h8-finance` manifest yet — `finances/INDEX.md` is
  the closest existing equivalent; swap it in once that agent is built), calls Claude, and
  writes the result to `_meta/briefings/<timestamp>.md` in the vault. `getLatestBriefing()`
  reads the most recent file back.
- `backend/markdown-active-list.ts` — shared parser/serializer for the `## Active` / `##
  Archived` markdown-bullet format, used by both `standing-orders.ts` and `ccirs.ts` (FR-024).
  Deliberately simpler than `issues.ts` (no priority/reorder) since neither needs it yet.
- `backend/standing-orders.ts` / `backend/ccirs.ts` — CRUD against `_meta/standing-orders.md` /
  `_meta/ccirs.md` in the vault.
- Routes: `GET/POST /dashboard/api/briefing/latest|run`, `GET/POST /dashboard/api/ccirs`,
  `POST /dashboard/api/ccirs/:id/archive`, and the same pair for `/standing-orders`.
- Frontend: a third "Briefing" tab in `App.tsx` alongside Dashboard/Issues — shows the latest
  briefing text, a run button, and add/archive forms for CCIRs and standing orders.

## Deploy automation

`scripts/deploy-finance.sh` (misleadingly named — historical, covers more than finance now) is
symlinked as the git `post-merge` hook (installed via `scripts/setup-hooks.sh`) and runs on
every merge to `main`: rebuilds finance + the shared esbuild bundle (which covers dashboard
too) and restarts the `finance` and `dashboard` systemd services. **Food and todos are not
yet wired into this hook** — if you change those and need a live restart, run
`systemctl --user restart food` / `todos` manually, or extend the hook to match.

## Branching policy

Use project-scoped branch prefixes to allow parallel work across projects:

```
finance/feature-name
todos/feature-name
calendar/feature-name
food/feature-name
```

This lets separate Claude agents work on separate projects without colliding.
Main branch: `main`.

## Stack

- **Runtime:** Node.js + TypeScript
- **Database:** SQLite via `better-sqlite3` (sync driver) — finance only
- **Frontend:** React 19, esbuild
- **Tests:** Jest (unit), Playwright (e2e)
- **Build:** esbuild (`build.js`) — auto-discovers `projects/*/frontend/`
- **CSS:** Tailwind v4 (finance only currently)

## Scripts

```
npm run finance:dev        # start finance server (port 3001)
npm run finance:build      # esbuild + tailwind
npm run finance:test:e2e   # playwright e2e for finance
npm run db:migrate         # run finance SQLite migrations
npm run db:seed            # seed finance DB
npm run db:import          # import RocketMoney CSV transactions
npm run db:tag             # apply tag CSV to budget/recurring items
npm start                  # start todos server (port 3000)
npm run dashboard:dev      # start dashboard server (port 3004)
npm run test:unit          # jest unit tests (all projects)
```

Reusable utility scripts live in `scripts/`. Run with `python3 scripts/<name>.py` or `node scripts/<name>.js` as appropriate.

## Conventions

- Use ISO 8601 strings for all dates in SQLite (`TEXT` columns, not `INTEGER` epoch)
- Negative amounts = outflow, positive = income (consistent across all tables)
- Slug-style IDs as primary keys where possible (e.g. `'my_bank'`, `'lender_payment'`)
- Migration files: `db/migrations/001_initial.sql`, `002_...`, etc.
- Never skip `--no-verify` on commits
- Privacy: never include family member names in commits, PRs, or issues
- Build artifacts (`public/<name>/bundle.js`, `.map`, `.css`) are gitignored per-module —
  add new entries to `.gitignore` when scaffolding a new module's `public/<name>/` dir, don't
  commit the bundle.

## Recent history (most recent first — trim this section once it gets long)

- **2026-06-22:** Added `dashboard` module (PR #77) — see "Dashboard project" above.
- **2026-06-22:** Rewrote `todos` backend to SQLite (PR #76) — was in-memory-only with no
  running service before this; now matches finance/food's `db.ts`/`migrate.ts` pattern and
  runs as `todos.service`. Local repo folder also renamed `bills-tracker` → `home-apps` to
  match the GitHub repo name (already renamed) — if you find references to the old folder
  name anywhere, they're stale.
- This section exists so a fresh Claude Code session starting in this repo doesn't re-derive
  context that's only in old PR descriptions or a vault session log elsewhere. Add a line here
  for genuinely structural changes (new module, storage rewrite, deploy-process change) — not
  for routine feature PRs, which speak for themselves in `git log`.
