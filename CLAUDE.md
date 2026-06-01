# Home Apps — Claude Code Project Guide

## What this project is

A suite of personal home apps: finance, todos, calendar (planned), food (planned).
Repo: `nickbenes/home-apps` · Stack: React 19 / TypeScript / Express / esbuild / SQLite.

Each app lives under `projects/<name>/` and runs on its own port. nginx proxies all apps
at `pace-bene/<name>/` (see `nginx/home-apps.conf`).

## Projects

| Project   | Port | URL prefix    | Status  |
|-----------|------|---------------|---------|
| `finance` | 3001 | `/finance`    | Active  |
| `todos`   | 3000 | `/todos`      | Active  |
| `calendar`| 3002 | `/calendar`   | Planned |
| `food`    | 3003 | `/food`       | Planned |

Active projects have a systemd user service (`~/.config/systemd/user/<name>.service`).

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
