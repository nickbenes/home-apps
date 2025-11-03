## Quick orientation for AI coding agents

This repository is a small Express + React sandbox with multiple example apps under `projects/` (notably `todos` and `bills`). Keep guidance concise and concrete so contributors can be productive quickly.

### Big picture
- server: `server.js` — Express app that serves static files from `public/` and mounts backend routers from `projects/*/backend` (e.g. `projects/todos/backend/routes`).
- frontends: React (TSX) under `projects/*/frontend` (e.g. `projects/todos/frontend/App.tsx`, `projects/bills/frontend/App.tsx`).
- build: `build.js` uses `esbuild` to bundle frontend code into `public/` (currently it only bundles `projects/todos/frontend/App.tsx` to `public/todos/bundle.js`).
- storage: backends use simple in-memory modules `projects/*/backend/storage.js` (state is ephemeral — restarting process or tests resets state).

### Where to look for examples
- API routes pattern: `projects/*/backend/routes.js` (CRUD, parse params with `parseInt`, return 4xx on validation/not-found).
- Storage pattern: `projects/*/backend/storage.js` (module exports getAll, getById, create, update, delete — mutate in-memory arrays, use `nextId`).
- Frontend pattern: `projects/*/frontend/*.tsx` — React function components, localStorage use (see `projects/bills/frontend/App.tsx`), CSV import/export helpers, drag & drop, template patterns.

### Build / run / test commands (canonical)
- Install deps: `npm install` (follow normal Node workflow).
- Build frontends: `npm run build` (runs `node build.js` which invokes esbuild).
- Start server: `npm start` (runs `node server.js`).
- Dev (build then run): `npm run dev`.
- Unit + coverage: `npm test` (Jest config is in `jest.config.js`).
- Unit-only: `npm run test:unit`.
- Playwright e2e: `npm run test:e2e` (Playwright config at `playwright.config.ts`).

Important note: `build.js` currently only bundles the `todos` frontend. If you add/modify another frontend (e.g. `bills`), update `build.js` entryPoints and the output path so `public/` contains the app bundle.

### Testing conventions
- Jest runs two projects: `node` (server/backend tests) and `jsdom` (frontend tests). Look at `jest.config.js` for `testMatch` patterns.
- API tests live under `projects/**/test` or as `*.test.js` in backend folders (see `projects/todos/test/api.test.js` and `server.test.js`).
- Frontend tests are expected under `projects/**/frontend` or `projects/**/test/unit` and use `@testing-library/react` with `jest.setup.js`.

### Coding patterns & conventions to follow in edits
- Backend files are CommonJS (require/module.exports). Frontend files are TypeScript/TSX (ESNext). Keep module style consistent in the same area.
- Validation: routes validate required fields and return 400 for bad input and 404 when resources are missing.
- ID usage: backends use numeric incremental IDs (be cautious when creating deterministic tests — seed or reset `storage.js` state between tests).
- Persistence: frontends use `localStorage` (see `STORAGE_KEY` and `TEMPLATES_KEY` in `projects/bills/frontend/App.tsx`). Don't assume a DB exists.

### Integration points and where to change things
- Serve a new frontend: bundle into `public/<app>/bundle.js` and make sure `server.js` serves the app path (e.g. `app.get('/bills/', ...)`).
- Add API routes: mount them in `server.js` or call `app.use('/api/<name>', require('./projects/<name>/backend/routes'))`.

### Example snippets to reference
- Mounting router: `server.js` — `app.use('/api/todos', todosRouter);`
- esbuild entry: `build.js` — `entryPoints: ['projects/todos/frontend/App.tsx'], outfile: 'public/todos/bundle.js'`
- Simple storage API: `projects/todos/backend/storage.js` exports `getAll/getById/create/update/delete`.

### When writing tests or changes for CI
- Use the same Jest transforms present in `jest.config.js` (babel-jest configured for TSX/TS + React automatic runtime).
- Reset or isolate in-memory storage between tests (or require the module anew) to avoid cross-test pollution.

If any of these sections are unclear or you'd like more examples (e.g. a suggested `build.js` patch to include `bills`), tell me which area to expand and I will iterate.  
