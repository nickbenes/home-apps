# Benes Finance — Claude Code Project Guide

## What this project is

A personal finance app for tracking cashflow, bills, and budget against real transaction data. Built on top of the existing `bills-tracker` repo (React 19 / TypeScript / Express / esbuild).

The new finance work lives under `projects/benes-finance/`. The old bills/todos apps under `projects/bills/` and `projects/todos/` are legacy — don't touch them unless asked.

## Data layout (critical — read before touching files)

```
projects/benes-finance/data/          ← gitignored entirely
  PRIVATE-financial-csv/              ← raw CSV exports; NEVER commit
    YTD-*-transactions.csv            ← RocketMoney transaction exports
    accounts-*.csv                    ← account list snapshots
    cashflow-*-merged.csv             ← recurring transactions / budget items
  data-model-session-logs/            ← design session notes (markdown)
    2026-05-19_data-model-schema.md   ← canonical SQL schema + TS interfaces
    2026-05-19_feature-backlog.md     ← P0–P3 feature backlog
    2026-05-19_wrap-up.md             ← session summary + handoff notes
    2026-05-19_data-model-voice-session.md
```

The `data/` folder is in `.gitignore`. Never move financial CSVs out of it. Derived artifacts (schema SQL, migration files, ETL scripts, TypeScript types) are version-controlled.

## Data model (summary)

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

Key invariant: transactions are immutable once ingested (date, amount, merchant text never change). Classifications are mutable with full audit trail.

Full schema and TypeScript interfaces: `projects/benes-finance/data/data-model-session-logs/2026-05-19_data-model-schema.md`

## Feature backlog

Prioritized as P0 (foundation) → P1 (core) → P2 (planning/analysis) → P3 (nice to have).

Full backlog: `projects/benes-finance/data/data-model-session-logs/2026-05-19_feature-backlog.md`

Current focus: **P0 — Foundation / Data Layer**
- Schema migration runner (`schema.sql` via `better-sqlite3`, versioned migrations)
- CSV seeder for accounts + recurring items
- Transaction CSV importer (RocketMoney export format)
- Budget categories + items seeder
- Basic REST API (Express endpoints for all entities)

## Folder structure

```
projects/benes-finance/
  db/
    migrations/       ← SQL migration files (001_initial.sql, etc.)
  backend/            ← Express server, TypeScript types, DB access layer
  frontend/           ← React components
  test/               ← Jest unit tests + Playwright e2e
```

No nested `src/` — code lives directly in `backend/` or `frontend/`.

## Stack

- **Runtime:** Node.js + TypeScript
- **Database:** SQLite via `better-sqlite3` (sync driver)
- **Frontend:** React 19, esbuild
- **Tests:** Jest (unit), Playwright (e2e)
- **Build:** esbuild (`build.js`)

## Scripts

Reusable utility scripts live in `scripts/`. Run with `python3 scripts/<name>.py` or `node scripts/<name>.js` as appropriate.

- `scripts/docx_to_md.py` — converts Google Drive .docx exports to markdown (for session logs)

## Conventions

- Use ISO 8601 strings for all dates in SQLite (`TEXT` columns, not `INTEGER` epoch)
- Negative amounts = outflow, positive = income (consistent across all tables)
- Slug-style IDs as primary keys where possible (e.g. `'my_bank'`, `'lender_payment'`)
- Migration files: `db/migrations/001_initial.sql`, `002_...`, etc.
- Never skip `--no-verify` on commits
