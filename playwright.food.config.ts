import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Isolated port + DB file so e2e runs never touch the live `food` service
// (port 3003) or its database — see projects/food/backend/db.ts's
// FOOD_DB_PATH override.
const PORT = 3103;
const DB_PATH = path.join(__dirname, 'projects/food/data/food.e2e.db');

export default defineConfig({
  testDir: './projects/food/test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${PORT}/food/`,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `rm -f ${DB_PATH} ${DB_PATH}-shm ${DB_PATH}-wal && npm run food:build && FOOD_DB_PATH=${DB_PATH} SEED_EXAMPLE=1 npm run food:db:import && FOOD_DB_PATH=${DB_PATH} PORT=${PORT} npm run food:dev`,
    url: `http://localhost:${PORT}/food`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
