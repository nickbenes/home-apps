PR #2 status update (feat/multi-entry-build-and-lint)
Date: 2025-11-05

Summary of changes pushed to branch `feat/multi-entry-build-and-lint` (updates PR #2):

- test(bills): Added backend API unit tests for the Bills app
  - File: `projects/bills/test/api.test.js` (supertest + jest)
  - Covers: GET /api/bills, POST validation & creation, GET by id, PUT update, DELETE

- Stability improvements & tests for Todos
  - `projects/todos/test/api.test.js` already existed and passes locally (12 tests).
  - Playwright E2E tests for Todos were stabilized (selectors scoped, server-side state reset in beforeEach).

- CI
  - `.github/workflows/ci.yml` added to run unit tests with Jest and Playwright e2e on push/PR.

What I ran locally to validate
- Jest: ran `npx jest projects/bills/test/api.test.js` and `npx jest projects/todos/test/api.test.js` (both passed).
- Playwright: ran `npx playwright test projects/todos/test/e2e/todos.spec.ts` — all tests passed locally after fixes.

Notes / Next steps
- If you want CI to skip e2e on every PR, I can mark the e2e job optional or gated by a label.
- I can also add a small GitHub Actions status comment on PR #2 summarizing the green local results.

If you'd like any edits to this summary before I leave it on the branch/PR, tell me what to change.
